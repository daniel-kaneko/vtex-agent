import fs from "fs";
import path from "path";
import crypto from "crypto";
import { upsertDocs, getCollectionStats } from "../lib/chroma";
import {
  loadCache,
  saveCache,
  hashContent,
  shouldUseCache,
  updateCacheEntry,
  CACHE_PATHS,
  DEFAULT_CACHE_TTL_DAYS,
} from "../lib/cache";

// ============================================================================
// Types
// ============================================================================

interface OpenAPIConfig {
  githubRepo: string;
  branch: string;
  filePrefix: string;
  docsBaseUrl: string;
}

interface OpenAPISpec {
  info: {
    title: string;
    description?: string;
  };
  servers?: Array<{ url: string; description?: string }>;
  paths: Record<string, PathItem>;
  components?: {
    schemas?: Record<string, SchemaObject>;
  };
}

interface PathItem {
  summary?: string;
  description?: string;
  get?: Operation;
  post?: Operation;
  put?: Operation;
  patch?: Operation;
  delete?: Operation;
}

interface Operation {
  summary?: string;
  description?: string;
  operationId?: string;
  tags?: string[];
  parameters?: Parameter[];
  requestBody?: {
    description?: string;
    content?: Record<string, { schema?: SchemaObject }>;
  };
  responses?: Record<string, { description?: string }>;
}

interface Parameter {
  name: string;
  in: string;
  description?: string;
  required?: boolean;
  schema?: SchemaObject;
}

interface SchemaObject {
  type?: string;
  description?: string;
  properties?: Record<string, SchemaObject>;
  items?: SchemaObject;
}

interface ChunkDoc {
  id: string;
  text: string;
  source: string;
  url: string;
}

// ============================================================================
// Configuration
// ============================================================================

const CONFIG_PATH = path.join(process.cwd(), "data", "openapi-config.json");
const CACHE_PATH = path.join(process.cwd(), CACHE_PATHS.openapi);

function loadConfig(): OpenAPIConfig {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error("❌ Missing data/openapi-config.json");
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
}

function getGithubRawBase(config: OpenAPIConfig): string {
  return `https://raw.githubusercontent.com/${config.githubRepo}/${config.branch}`;
}

function getGithubApiBase(config: OpenAPIConfig): string {
  return `https://api.github.com/repos/${config.githubRepo}/contents`;
}

// ============================================================================
// GitHub API
// ============================================================================

/**
 * Fetches list of OpenAPI JSON files from the repo
 */
async function fetchOpenAPIFiles(config: OpenAPIConfig): Promise<string[]> {
  console.log("📡 Fetching OpenAPI schema list from GitHub...\n");

  const response = await fetch(getGithubApiBase(config), {
    headers: {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "VTEX-Agent-Bot/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const files = (await response.json()) as Array<{
    name: string;
    type: string;
  }>;

  return files
    .filter((f) => f.type === "file" && f.name.endsWith(".json"))
    .filter((f) => f.name.startsWith(config.filePrefix))
    .map((f) => f.name);
}

/**
 * Fetches and parses a single OpenAPI spec file
 * Returns both the parsed spec and raw content for hashing
 */
async function fetchSpec(
  filename: string,
  config: OpenAPIConfig
): Promise<{ spec: OpenAPISpec; raw: string } | null> {
  const url = `${getGithubRawBase(config)}/${encodeURIComponent(filename)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const raw = await response.text();
    return { spec: JSON.parse(raw) as OpenAPISpec, raw };
  } catch {
    return null;
  }
}

// ============================================================================
// OpenAPI Processing
// ============================================================================

/**
 * Extracts documentation chunks from an OpenAPI spec
 */
function extractChunks(
  spec: OpenAPISpec,
  filename: string,
  config: OpenAPIConfig
): ChunkDoc[] {
  const chunks: ChunkDoc[] = [];
  const apiTitle = spec.info.title;
  const apiSlug = filename
    .replace(config.filePrefix, "")
    .replace(".json", "")
    .trim()
    .toLowerCase()
    .replace(/\s*-\s*/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  const apiUrl = `${config.docsBaseUrl}/${apiSlug}`;

  const hash = (str: string) =>
    crypto.createHash("md5").update(str).digest("hex").slice(0, 8);
  const fileHash = hash(filename);

  if (spec.info.description) {
    chunks.push({
      id: `openapi_${fileHash}_overview`,
      text: `# ${apiTitle}\n\n${spec.info.description}`,
      source: apiTitle,
      url: apiUrl,
    });
  }

  for (const [path, pathItem] of Object.entries(spec.paths)) {
    const methods = ["get", "post", "put", "patch", "delete"] as const;

    for (const method of methods) {
      const operation = pathItem[method];
      if (!operation) continue;

      const endpointText = buildEndpointText(
        method.toUpperCase(),
        path,
        operation,
        apiTitle
      );

      if (endpointText.length > 100) {
        const tags = operation.tags?.join("/") || "";
        const summary = operation.summary || path;
        const sourceName = tags
          ? `${apiTitle} - ${tags} - ${summary}`
          : `${apiTitle} - ${summary}`;

        chunks.push({
          id: `openapi_${fileHash}_${hash(path + method)}`,
          text: endpointText,
          source: sourceName,
          url: `${apiUrl}#${operation.operationId || ""}`,
        });
      }
    }
  }

  return chunks;
}

/**
 * Builds a text description of an endpoint
 * Optimized for semantic search by front-loading important keywords
 */
function buildEndpointText(
  method: string,
  path: string,
  operation: Operation,
  apiTitle: string
): string {
  const lines: string[] = [];

  lines.push(`# ${apiTitle}`);
  if (operation.summary) {
    lines.push(`## ${operation.summary}`);
  }

  if (operation.tags && operation.tags.length > 0) {
    lines.push(`Category: ${operation.tags.join(", ")}`);
  }

  lines.push("");
  lines.push(`**Endpoint:** \`${method} ${path}\``);
  lines.push("");

  if (operation.description) {
    const cleanDesc = operation.description
      .replace(/\\r\\n/g, "\n")
      .replace(/\r\n/g, "\n");
    lines.push(cleanDesc);
    lines.push("");
  }

  if (operation.parameters && operation.parameters.length > 0) {
    lines.push("### Parameters");
    for (const param of operation.parameters) {
      const required = param.required ? "(required)" : "(optional)";
      const desc = param.description || "No description";
      lines.push(`- **${param.name}** [${param.in}] ${required}: ${desc}`);
    }
    lines.push("");
  }

  if (operation.requestBody?.description) {
    lines.push("### Request Body");
    lines.push(operation.requestBody.description);
    lines.push("");
  }

  if (operation.responses) {
    lines.push("### Responses");
    for (const [code, response] of Object.entries(operation.responses)) {
      lines.push(`- **${code}**: ${response.description || "No description"}`);
    }
  }

  return lines.join("\n");
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const force = args.includes("--force");
  const filterArg = args.find((a) => a.startsWith("--filter="));
  const filter = filterArg?.split("=")[1]?.toLowerCase();

  const config = loadConfig();
  const cache = loadCache(CACHE_PATH);

  console.log("📚 OpenAPI Schema Ingestion\n");
  console.log("─".repeat(50));
  console.log(`   Repo: ${config.githubRepo}`);
  console.log(`   Branch: ${config.branch}`);
  console.log(`   Docs URL: ${config.docsBaseUrl}`);
  if (filter) console.log(`   Filter: *${filter}*`);
  if (dryRun) console.log(`   Mode: DRY RUN`);
  if (force) console.log(`   Mode: FORCE (ignoring cache)`);
  console.log("─".repeat(50));

  let files = await fetchOpenAPIFiles(config);
  console.log(`\n📋 Found ${files.length} OpenAPI schemas`);

  if (filter) {
    files = files.filter((f) => f.toLowerCase().includes(filter));
    console.log(`   After filter: ${files.length} schemas`);
  }

  if (dryRun) {
    console.log("\n📝 Schemas that would be processed:\n");
    for (const file of files) {
      const cached = cache[file];
      const status = cached ? "📦 cached" : "🆕 new";
      console.log(`   - ${file} (${status})`);
    }
    console.log("\n✅ Dry run complete.\n");
    return;
  }

  const allChunks: ChunkDoc[] = [];
  let processed = 0;
  let skipped = 0;
  let cached = 0;

  console.log("\n📥 Processing schemas...\n");

  for (const file of files) {
    process.stdout.write(`   ${file}... `);

    const result = await fetchSpec(file, config);
    if (!result) {
      console.log("❌ failed to fetch");
      skipped++;
      continue;
    }

    const { spec, raw } = result;
    const contentHash = hashContent(raw);

    if (
      shouldUseCache(cache, file, contentHash, DEFAULT_CACHE_TTL_DAYS, force)
    ) {
      console.log("📦 unchanged (cached)");
      cached++;
      continue;
    }

    const isNew = !cache[file];
    const chunks = extractChunks(spec, file, config);
    allChunks.push(...chunks);

    updateCacheEntry(cache, file, contentHash);

    const status = isNew ? "🆕" : "🔄";
    console.log(`${status} ${chunks.length} chunks`);
    processed++;

    await new Promise((r) => setTimeout(r, 100));
  }

  saveCache(CACHE_PATH, cache);

  if (allChunks.length > 0) {
    const BATCH_SIZE = 100;
    const batches = Math.ceil(allChunks.length / BATCH_SIZE);
    console.log(
      `\n🔢 Upserting ${allChunks.length} chunks to Chroma (${batches} batches)...`
    );

    for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
      const batch = allChunks.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      process.stdout.write(`   Batch ${batchNum}/${batches}...`);
      await upsertDocs(batch);
      console.log(" ✅");
    }
  }

  try {
    const stats = await getCollectionStats();
    console.log("\n" + "─".repeat(50));
    console.log("✅ OpenAPI ingestion complete!");
    console.log(`   Schemas processed: ${processed}`);
    console.log(`   Schemas cached: ${cached}`);
    console.log(`   Schemas skipped: ${skipped}`);
    console.log(`   Chunks added: ${allChunks.length}`);
    console.log(`   Total in Chroma: ${stats.count} docs`);
    console.log("─".repeat(50) + "\n");
  } catch {
    console.log("\n✅ OpenAPI ingestion complete!\n");
  }
}

main().catch((err) => {
  console.error("\n❌ Error:", err.message);
  process.exit(1);
});
