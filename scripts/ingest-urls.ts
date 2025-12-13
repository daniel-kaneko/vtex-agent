import fs from "fs";
import path from "path";
import { upsertDocs, getCollectionStats } from "../lib/chroma-rest";
import {
  loadCache,
  saveCache,
  hashContent,
  shouldUseCache,
  updateCacheEntry,
  CACHE_PATHS,
  DEFAULT_CACHE_TTL_DAYS,
  Cache,
} from "../lib/cache";
import { fetchUrl, processConcurrent } from "../lib/fetcher";
import { extractContent } from "../lib/content";
import { createChunkDocs, ChunkDoc } from "../lib/chunking";

const CACHE_PATH = path.join(process.cwd(), CACHE_PATHS.urls);
const DEFAULT_CONCURRENCY = 5;
const DEFAULT_RATE_LIMIT_MS = 500;

interface UrlEntry {
  url: string;
  name: string;
  selector?: string | string[];
}

interface ProcessResult {
  url: string;
  name: string;
  chunks: ChunkDoc[];
  cached: boolean;
  error?: string;
}

async function processUrl(
  entry: UrlEntry,
  cache: Cache,
  force: boolean
): Promise<ProcessResult> {
  try {
    const html = await fetchUrl(entry.url);
    const contentHash = hashContent(html);

    if (
      shouldUseCache(
        cache,
        entry.url,
        contentHash,
        DEFAULT_CACHE_TTL_DAYS,
        force
      )
    ) {
      return { url: entry.url, name: entry.name, chunks: [], cached: true };
    }

    const content = extractContent(html, entry.selector, true);
    if (content.length < 100) {
      return {
        url: entry.url,
        name: entry.name,
        chunks: [],
        cached: false,
        error: "content too short",
      };
    }

    const chunks = createChunkDocs(content, {
      idPrefix: "url",
      url: entry.url,
      source: entry.name,
    });
    updateCacheEntry(cache, entry.url, contentHash);

    return { url: entry.url, name: entry.name, chunks, cached: false };
  } catch (error) {
    return {
      url: entry.url,
      name: entry.name,
      chunks: [],
      cached: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const concurrencyArg = args.find((arg) => arg.startsWith("--concurrency="));
  const concurrency = concurrencyArg
    ? parseInt(concurrencyArg.split("=")[1], 10)
    : DEFAULT_CONCURRENCY;

  const urlsPath = path.join(process.cwd(), "data", "urls.json");

  console.log("📋 URL Ingestion\n");
  console.log("─".repeat(50));
  console.log(`   Config: ${urlsPath}`);
  console.log(`   Concurrency: ${concurrency}`);
  if (force) console.log(`   Mode: FORCE (ignoring cache)`);
  console.log("─".repeat(50));

  const urls: UrlEntry[] = JSON.parse(fs.readFileSync(urlsPath, "utf-8"));
  console.log(`\n📋 Found ${urls.length} URL(s) to process\n`);

  const cache = loadCache(CACHE_PATH);

  try {
    const stats = await getCollectionStats();
    console.log(
      `📊 Chroma collection "${stats.name}" has ${stats.count} doc(s)\n`
    );
  } catch {
    console.log("📊 Chroma collection is empty or new\n");
  }

  console.log(
    `🚀 Processing ${urls.length} URLs (${concurrency} concurrent)...\n`
  );

  const results = await processConcurrent(
    urls,
    async (entry) => processUrl(entry, cache, force),
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

  let totalAdded = 0;
  let cached = 0;
  let errors = 0;
  const allChunks: ChunkDoc[] = [];

  for (const result of results) {
    if (result.cached) {
      console.log(`   📦 ${result.name} - cached`);
      cached++;
    } else if (result.error) {
      console.log(`   ❌ ${result.name} - ${result.error}`);
      errors++;
    } else if (result.chunks.length > 0) {
      console.log(`   ✅ ${result.name} - ${result.chunks.length} chunks`);
      allChunks.push(...result.chunks);
    }
  }

  if (allChunks.length > 0) {
    const BATCH_SIZE = 100;
    const batches = Math.ceil(allChunks.length / BATCH_SIZE);
    console.log(
      `\n🔢 Upserting ${allChunks.length} chunks (${batches} batches)...`
    );

    for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
      const batch = allChunks.slice(i, i + BATCH_SIZE);
      process.stdout.write(
        `   Batch ${Math.floor(i / BATCH_SIZE) + 1}/${batches}...`
      );
      await upsertDocs(batch);
      console.log(" ✅");
    }

    totalAdded = allChunks.length;
  }

  saveCache(CACHE_PATH, cache);

  try {
    const stats = await getCollectionStats();
    console.log("\n" + "─".repeat(50));
    console.log("✅ URL ingestion complete!");
    console.log(`   Processed: ${urls.length - cached - errors}`);
    console.log(`   Cached: ${cached}`);
    console.log(`   Errors: ${errors}`);
    console.log(`   Chunks added: ${totalAdded}`);
    console.log(`   Total in Chroma: ${stats.count} docs`);
    console.log("─".repeat(50) + "\n");
  } catch {
    console.log(`\n✅ Added ${totalAdded} doc(s)`);
  }
}

main().catch((err) => {
  console.error("\n❌ Fatal error:", err.message);
  console.error("\nMake sure:");
  console.error("  1. Chroma is running (docker-compose up chroma)");
  console.error("  2. Ollama is running with mxbai-embed-large model");
  process.exit(1);
});
