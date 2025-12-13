import fs from "fs";
import path from "path";
import { upsertDocs, getCollectionStats } from "../lib/chroma-rest";
import {
  loadCache,
  saveCache,
  hashContent,
  shouldUseCacheByRemoteHash,
  updateCacheEntry,
  CACHE_PATHS,
  Cache,
} from "../lib/cache";
import { fetchUrl, processConcurrent } from "../lib/fetcher";
import { hashString } from "../lib/chunking";

interface OpenAPIConfig {
  githubRepo: string;
  branch: string;
  filePrefix: string;
  docsBaseUrl: string;
}

interface OpenAPISpec {
  info: { title: string; description?: string };
  servers?: Array<{ url: string; description?: string }>;
  paths: Record<string, PathItem>;
  components?: { schemas?: Record<string, SchemaObject> };
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

interface GitHubFile {
  name: string;
  sha: string;
}

interface ProcessResult {
  filename: string;
  chunks: ChunkDoc[];
  cached: boolean;
  isNew: boolean;
  error?: string;
}

const CONFIG_PATH = path.join(process.cwd(), "data", "openapi-config.json");
const CACHE_PATH = path.join(process.cwd(), CACHE_PATHS.openapi);
const DEFAULT_CONCURRENCY = 10;
const DEFAULT_RATE_LIMIT_MS = 100;

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

async function fetchOpenAPIFiles(config: OpenAPIConfig): Promise<GitHubFile[]> {
  console.log("📡 Fetching OpenAPI schema list from GitHub...\n");

  const response = await fetch(getGithubApiBase(config), {
    headers: {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "VTEX-Agent-Bot/1.0",
    },
  });

  if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);

  const files = (await response.json()) as Array<{
    name: string;
    type: string;
    sha: string;
  }>;
  return files
    .filter(
      (file) =>
        file.type === "file" &&
        file.name.endsWith(".json") &&
        file.name.startsWith(config.filePrefix)
    )
    .map((file) => ({ name: file.name, sha: file.sha }));
}

async function fetchSpec(
  filename: string,
  config: OpenAPIConfig
): Promise<{ spec: OpenAPISpec; raw: string } | null> {
  try {
    const raw = await fetchUrl(
      `${getGithubRawBase(config)}/${encodeURIComponent(filename)}`,
      { accept: "application/json" }
    );
    return { spec: JSON.parse(raw) as OpenAPISpec, raw };
  } catch {
    return null;
  }
}

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
  const fileHash = hashString(filename, 8);

  if (spec.info.description) {
    chunks.push({
      id: `openapi_${fileHash}_overview`,
      text: `# ${apiTitle}\n\n${spec.info.description}`,
      source: apiTitle,
      url: apiUrl,
    });
  }

  for (const [apiPath, pathItem] of Object.entries(spec.paths)) {
    for (const method of ["get", "post", "put", "patch", "delete"] as const) {
      const operation = pathItem[method];
      if (!operation) continue;

      const endpointText = buildEndpointText(
        method.toUpperCase(),
        apiPath,
        operation,
        apiTitle
      );
      if (endpointText.length <= 100) continue;

      const tags = operation.tags?.join("/") || "";
      const summary = operation.summary || apiPath;
      const sourceName = tags
        ? `${apiTitle} - ${tags} - ${summary}`
        : `${apiTitle} - ${summary}`;

      chunks.push({
        id: `openapi_${fileHash}_${hashString(apiPath + method, 8)}`,
        text: endpointText,
        source: sourceName,
        url: `${apiUrl}#${operation.operationId || ""}`,
      });
    }
  }

  return chunks;
}

function buildEndpointText(
  method: string,
  apiPath: string,
  operation: Operation,
  apiTitle: string
): string {
  const lines: string[] = [`# ${apiTitle}`];

  if (operation.summary) lines.push(`## ${operation.summary}`);
  if (operation.tags?.length)
    lines.push(`Category: ${operation.tags.join(", ")}`);

  lines.push("", `**Endpoint:** \`${method} ${apiPath}\``, "");

  if (operation.description) {
    lines.push(
      operation.description.replace(/\\r\\n/g, "\n").replace(/\r\n/g, "\n"),
      ""
    );
  }

  if (operation.parameters?.length) {
    lines.push("### Parameters");
    for (const param of operation.parameters) {
      const required = param.required ? "(required)" : "(optional)";
      lines.push(
        `- **${param.name}** [${param.in}] ${required}: ${
          param.description || "No description"
        }`
      );
    }
    lines.push("");
  }

  if (operation.requestBody?.description) {
    lines.push("### Request Body", operation.requestBody.description, "");
  }

  if (operation.responses) {
    lines.push("### Responses");
    for (const [code, response] of Object.entries(operation.responses)) {
      lines.push(`- **${code}**: ${response.description || "No description"}`);
    }
  }

  return lines.join("\n");
}

async function processSpec(
  file: GitHubFile,
  config: OpenAPIConfig,
  cache: Cache,
  force: boolean
): Promise<ProcessResult> {
  const { name: filename, sha } = file;

  try {
    if (shouldUseCacheByRemoteHash(cache, filename, sha, force)) {
      return { filename, chunks: [], cached: true, isNew: false };
    }

    const result = await fetchSpec(filename, config);
    if (!result)
      return {
        filename,
        chunks: [],
        cached: false,
        isNew: false,
        error: "failed to fetch",
      };

    const { spec, raw } = result;
    const contentHash = hashContent(raw);
    const isNew = !cache[filename];
    const chunks = extractChunks(spec, filename, config);

    updateCacheEntry(cache, filename, contentHash, { remoteHash: sha });

    return { filename, chunks, cached: false, isNew };
  } catch (error) {
    return {
      filename,
      chunks: [],
      cached: false,
      isNew: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const force = args.includes("--force");
  const filterArg = args.find((arg) => arg.startsWith("--filter="));
  const filter = filterArg?.split("=")[1]?.toLowerCase();
  const concurrencyArg = args.find((arg) => arg.startsWith("--concurrency="));
  const concurrency = concurrencyArg
    ? parseInt(concurrencyArg.split("=")[1], 10)
    : DEFAULT_CONCURRENCY;

  const config = loadConfig();
  const cache = loadCache(CACHE_PATH);

  console.log("📚 OpenAPI Schema Ingestion\n");
  console.log("─".repeat(50));
  console.log(`   Repo: ${config.githubRepo}`);
  console.log(`   Branch: ${config.branch}`);
  console.log(`   Docs URL: ${config.docsBaseUrl}`);
  console.log(`   Concurrency: ${concurrency}`);
  if (filter) console.log(`   Filter: *${filter}*`);
  if (dryRun) console.log(`   Mode: DRY RUN`);
  if (force) console.log(`   Mode: FORCE (ignoring cache)`);
  console.log("─".repeat(50));

  let files = await fetchOpenAPIFiles(config);
  console.log(`\n📋 Found ${files.length} OpenAPI schemas`);

  if (filter) {
    files = files.filter((file) => file.name.toLowerCase().includes(filter));
    console.log(`   After filter: ${files.length} schemas`);
  }

  const unchangedFiles = files.filter((file) =>
    shouldUseCacheByRemoteHash(cache, file.name, file.sha, force)
  );
  const changedFiles = files.filter(
    (file) => !shouldUseCacheByRemoteHash(cache, file.name, file.sha, force)
  );

  console.log(`   📦 Unchanged (cached by SHA): ${unchangedFiles.length}`);
  console.log(`   🔄 Changed/new (need processing): ${changedFiles.length}`);

  if (dryRun) {
    console.log("\n📝 Schemas that would be processed:\n");
    for (const file of files) {
      const isCached = shouldUseCacheByRemoteHash(
        cache,
        file.name,
        file.sha,
        force
      );
      console.log(
        `   - ${file.name} (${isCached ? "📦 cached" : "🆕 new/changed"})`
      );
    }
    console.log("\n✅ Dry run complete.\n");
    return;
  }

  if (changedFiles.length === 0) {
    console.log(`\n✅ All schemas unchanged, nothing to process.`);
    try {
      const stats = await getCollectionStats();
      console.log(`   Total in Chroma: ${stats.count} docs\n`);
    } catch {}
    return;
  }

  console.log(
    `\n🚀 Processing ${changedFiles.length} changed schemas (${concurrency} concurrent)...\n`
  );

  const results = await processConcurrent(
    changedFiles,
    async (file) => processSpec(file, config, cache, force),
    {
      concurrency,
      rateLimitMs: DEFAULT_RATE_LIMIT_MS,
      onProgress: (completed, total) => {
        process.stdout.write(
          `\r   Progress: ${completed}/${total} (${Math.round(
            (completed / total) * 100
          )}%)`
        );
      },
    }
  );

  console.log("\n");

  const allChunks: ChunkDoc[] = [];
  let processed = 0;
  let skipped = 0;

  for (const result of results) {
    if (result.error) {
      console.log(`   ❌ ${result.filename} - ${result.error}`);
      skipped++;
    } else if (result.chunks.length > 0) {
      console.log(
        `   ${result.isNew ? "🆕" : "🔄"} ${result.filename} - ${
          result.chunks.length
        } chunks`
      );
      allChunks.push(...result.chunks);
      processed++;
    }
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
      process.stdout.write(
        `   Batch ${Math.floor(i / BATCH_SIZE) + 1}/${batches}...`
      );
      await upsertDocs(batch);
      console.log(" ✅");
    }
  }

  try {
    const stats = await getCollectionStats();
    console.log("\n" + "─".repeat(50));
    console.log("✅ OpenAPI ingestion complete!");
    console.log(`   Schemas processed: ${processed}`);
    console.log(`   Schemas unchanged (SHA cache): ${unchangedFiles.length}`);
    console.log(`   Schemas skipped (errors): ${skipped}`);
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
