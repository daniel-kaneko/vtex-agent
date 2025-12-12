import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { XMLParser } from "fast-xml-parser";
import { minimatch } from "minimatch";
import { getCollectionStats } from "../lib/chroma-rest";
import {
  loadCache,
  saveCache,
  isCacheExpired,
  CACHE_PATHS,
  DEFAULT_CACHE_TTL_DAYS,
  Cache,
} from "../lib/cache";
import { fetchUrl, processConcurrent } from "../lib/fetcher";
import { extractContent } from "../lib/content";
import { hashContent } from "../lib/cache";

const CONFIG_PATH = path.join(process.cwd(), "data", "sitemap-config.json");
const CACHE_PATH = path.join(process.cwd(), CACHE_PATHS.sitemap);
const TEMP_DIR = path.join(process.cwd(), "data", ".sitemap-temp");
const DEFAULT_CONCURRENCY = 5;
const DEFAULT_RATE_LIMIT_MS = 300;
const BATCH_SIZE = 50;

interface SitemapConfig {
  url: string;
  name: string;
  include?: string[];
  exclude?: string[];
  selector?: string | string[];
  concurrency?: number;
  rateLimitMs?: number;
}

interface SitemapUrl {
  loc: string;
  lastmod?: string;
}

async function fetchSitemap(sitemapUrl: string): Promise<SitemapUrl[]> {
  const xml = await fetchUrl(sitemapUrl, {
    accept: "application/xml,text/xml",
  });
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });
  const parsed = parser.parse(xml);

  if (parsed.sitemapindex?.sitemap) {
    const sitemaps = Array.isArray(parsed.sitemapindex.sitemap)
      ? parsed.sitemapindex.sitemap
      : [parsed.sitemapindex.sitemap];
    console.log(`   📑 Sitemap index found with ${sitemaps.length} sitemaps`);
    const allUrls: SitemapUrl[] = [];
    for (const sitemap of sitemaps) {
      allUrls.push(...(await fetchSitemap(sitemap.loc)));
    }
    return allUrls;
  }

  if (!parsed.urlset?.url) return [];
  const urls = Array.isArray(parsed.urlset.url)
    ? parsed.urlset.url
    : [parsed.urlset.url];
  return urls.map((u: Record<string, string>) => ({
    loc: u.loc,
    lastmod: u.lastmod,
  }));
}

function normalizePattern(pattern: string): string {
  if (pattern.endsWith("/*") && !pattern.endsWith("/**"))
    return pattern.slice(0, -1) + "**";
  if (!pattern.includes("*"))
    return pattern.endsWith("/") ? pattern + "**" : pattern + "/**";
  return pattern;
}

function filterUrls(
  urls: SitemapUrl[],
  include?: string[],
  exclude?: string[]
): SitemapUrl[] {
  const normalizedInclude = include?.map(normalizePattern);
  const normalizedExclude = exclude?.map(normalizePattern);

  return urls.filter((item) => {
    try {
      const urlPath = new URL(item.loc).pathname;
      if (
        normalizedInclude?.length &&
        !normalizedInclude.some((p) =>
          minimatch(urlPath, p, { matchBase: true })
        )
      )
        return false;
      if (
        normalizedExclude?.length &&
        normalizedExclude.some((p) =>
          minimatch(urlPath, p, { matchBase: true })
        )
      )
        return false;
      return true;
    } catch {
      return false;
    }
  });
}

function filterUncached(
  urls: SitemapUrl[],
  cache: Cache,
  force: boolean
): { toDownload: SitemapUrl[]; cached: number } {
  if (force) return { toDownload: urls, cached: 0 };
  const toDownload: SitemapUrl[] = [];
  let cached = 0;
  for (const item of urls) {
    const entry = cache[item.loc];
    if (entry && !isCacheExpired(entry, DEFAULT_CACHE_TTL_DAYS)) {
      cached++;
    } else {
      toDownload.push(item);
    }
  }
  return { toDownload, cached };
}

function loadConfig(): SitemapConfig[] {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error("❌ Missing data/sitemap-config.json");
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
}

function ensureTempDir(): void {
  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
}

function cleanupTempDir(): void {
  if (fs.existsSync(TEMP_DIR))
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
}

function getBatchFiles(): string[] {
  if (!fs.existsSync(TEMP_DIR)) return [];
  return fs
    .readdirSync(TEMP_DIR)
    .filter((f) => f.endsWith(".jsonl"))
    .sort((a, b) => {
      const numA = parseInt(a.split("-")[1], 10);
      const numB = parseInt(b.split("-")[1], 10);
      return numA - numB;
    })
    .map((f) => path.join(TEMP_DIR, f));
}

async function downloadBatch(
  urls: SitemapUrl[],
  batchNum: number,
  config: SitemapConfig,
  concurrency: number,
  rateLimitMs: number,
  globalIndex: number,
  totalUrls: number
): Promise<{ file: string; downloaded: number; errors: number }> {
  const batchFile = path.join(
    TEMP_DIR,
    `batch-${String(batchNum).padStart(4, "0")}.jsonl`
  );

  const results = await processConcurrent(
    urls,
    async (item, index) => {
      try {
        const html = await fetchUrl(item.loc);
        const hash = hashContent(html);
        const text = extractContent(html, config.selector, true);
        return { url: item.loc, hash, text, error: null };
      } catch (error) {
        return {
          url: item.loc,
          hash: null,
          text: null,
          error: error instanceof Error ? error.message : String(error),
        };
      } finally {
        const current = globalIndex + index + 1;
        process.stdout.write(
          `\r   📥 Downloading: ${current}/${totalUrls} (${Math.round(
            (current / totalUrls) * 100
          )}%)`
        );
      }
    },
    { concurrency, rateLimitMs }
  );

  let downloaded = 0;
  let errors = 0;
  const lines: string[] = [];

  for (const result of results) {
    if (result.text && result.text.length >= 100) {
      lines.push(
        JSON.stringify({
          url: result.url,
          hash: result.hash,
          text: result.text,
        })
      );
      downloaded++;
    } else {
      errors++;
    }
  }

  if (lines.length > 0) {
    fs.writeFileSync(batchFile, lines.join("\n") + "\n");
  }

  return { file: lines.length > 0 ? batchFile : "", downloaded, errors };
}

function processBatchInChildProcess(
  batchFile: string,
  configName: string
): Promise<{ processed: number; chunksAdded: number }> {
  return new Promise((resolve) => {
    const child = spawn(
      "npx",
      ["tsx", "scripts/process-batch.ts", batchFile, configName],
      {
        cwd: process.cwd(),
        env: { ...process.env, NODE_OPTIONS: "--max-old-space-size=8192" },
        stdio: ["pipe", "pipe", "pipe"],
      }
    );

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      if (code !== 0 && stderr) {
        console.error(`\n   ⚠️ Batch error: ${stderr.slice(0, 200)}`);
      }
      try {
        const result = JSON.parse(stdout.trim());
        resolve(result);
      } catch {
        resolve({ processed: 0, chunksAdded: 0 });
      }
    });
  });
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const dryRun = args.includes("--dry-run");
  const processOnly = args.includes("--process-only");
  const filterArg = args.find((a) => a.startsWith("--filter="));
  const filter = filterArg?.split("=")[1]?.toLowerCase();

  console.log("🗺️  Sitemap Ingestion\n");
  console.log("─".repeat(50));

  let configs = loadConfig();
  if (filter) {
    configs = configs.filter((c) => c.name.toLowerCase().includes(filter));
    console.log(`   Filter: *${filter}*`);
  }

  console.log(`   Sitemaps: ${configs.length}`);
  if (dryRun) console.log(`   Mode: DRY RUN`);
  if (force) console.log(`   Mode: FORCE (ignoring cache)`);
  if (processOnly) console.log(`   Mode: PROCESS ONLY (skip download)`);
  console.log("─".repeat(50));

  const cache = loadCache(CACHE_PATH);

  try {
    const stats = await getCollectionStats();
    console.log(
      `\n📊 Chroma collection "${stats.name}" has ${stats.count} doc(s)\n`
    );
  } catch {
    console.log("\n📊 Chroma collection is empty or new\n");
  }

  let totalAdded = 0;
  let totalCached = 0;
  let totalProcessed = 0;
  let totalErrors = 0;

  for (const config of configs) {
    const concurrency = config.concurrency ?? DEFAULT_CONCURRENCY;
    const rateLimitMs = config.rateLimitMs ?? DEFAULT_RATE_LIMIT_MS;

    console.log(`\n🌐 Processing: ${config.name}`);
    console.log(`   Sitemap: ${config.url}`);
    console.log(
      `   Concurrency: ${concurrency} | Rate limit: ${rateLimitMs}ms`
    );
    if (config.include?.length)
      console.log(`   Include: ${config.include.join(", ")}`);
    if (config.exclude?.length)
      console.log(`   Exclude: ${config.exclude.join(", ")}`);
    if (config.selector) {
      console.log(
        `   Selector: ${
          Array.isArray(config.selector)
            ? config.selector.join(", ")
            : config.selector
        }`
      );
    }

    try {
      let batchFiles = getBatchFiles();

      if (!processOnly && batchFiles.length === 0) {
        process.stdout.write(`   📥 Fetching sitemap...`);
        const allUrls = await fetchSitemap(config.url);
        console.log(` found ${allUrls.length} URLs`);

        const filteredUrls = filterUrls(
          allUrls,
          config.include,
          config.exclude
        );
        console.log(`   🔍 After filtering: ${filteredUrls.length} URLs`);

        const { toDownload, cached: skippedCached } = filterUncached(
          filteredUrls,
          cache,
          force
        );
        console.log(`   📦 Already cached: ${skippedCached} URLs (skipping)`);
        console.log(`   🆕 To download: ${toDownload.length} URLs`);
        totalCached += skippedCached;

        if (dryRun) {
          console.log(`\n   📝 URLs that would be downloaded:`);
          for (const item of toDownload.slice(0, 20)) {
            console.log(`      - ${item.loc}`);
          }
          if (toDownload.length > 20)
            console.log(`      ... and ${toDownload.length - 20} more`);
          continue;
        }

        if (toDownload.length === 0) {
          console.log(`   ✅ All URLs cached, nothing to download`);
          continue;
        }

        ensureTempDir();

        console.log(
          `\n   📥 Phase 1: Downloading ${
            toDownload.length
          } URLs in ${Math.ceil(toDownload.length / BATCH_SIZE)} batches...`
        );
        let downloadedTotal = 0;
        let downloadErrors = 0;

        for (let i = 0; i < toDownload.length; i += BATCH_SIZE) {
          const batch = toDownload.slice(i, i + BATCH_SIZE);
          const batchNum = Math.floor(i / BATCH_SIZE);
          const { downloaded, errors } = await downloadBatch(
            batch,
            batchNum,
            config,
            concurrency,
            rateLimitMs,
            i,
            toDownload.length
          );
          downloadedTotal += downloaded;
          downloadErrors += errors;
        }

        console.log(
          `\n   ✅ Downloaded: ${downloadedTotal} in ${Math.ceil(
            toDownload.length / BATCH_SIZE
          )} files, Errors: ${downloadErrors}`
        );
        totalErrors += downloadErrors;

        saveCache(CACHE_PATH, cache);

        batchFiles = getBatchFiles();
      }

      if (batchFiles.length > 0) {
        const PARALLEL_BATCHES = 3;
        console.log(
          `\n   🔄 Phase 2: Processing ${batchFiles.length} batch files (${PARALLEL_BATCHES} parallel)...`
        );

        let completed = 0;
        const updateProgress = () => {
          process.stdout.write(
            `\r   🔄 Processing: ${completed}/${batchFiles.length} batches completed...`
          );
        };

        const limit = (await import("p-limit")).default;
        const limiter = limit(PARALLEL_BATCHES);

        const results = await Promise.all(
          batchFiles.map((batchFile) =>
            limiter(async () => {
              const result = await processBatchInChildProcess(
                batchFile,
                config.name
              );
              completed++;
              updateProgress();
              return result;
            })
          )
        );

        for (const { processed, chunksAdded } of results) {
          totalProcessed += processed;
          totalAdded += chunksAdded;
        }

        console.log(
          `\n   ✅ Processed: ${totalProcessed}, Chunks added: ${totalAdded}`
        );
      }

      console.log(`   ✨ Done`);
    } catch (error) {
      console.log(
        `   ❌ Failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  cleanupTempDir();

  if (dryRun) {
    console.log("\n✅ Dry run complete.\n");
    return;
  }

  try {
    const stats = await getCollectionStats();
    console.log("\n" + "─".repeat(50));
    console.log("✅ Sitemap ingestion complete!");
    console.log(`   Processed: ${totalProcessed}`);
    console.log(`   Cached (skipped): ${totalCached}`);
    console.log(`   Errors: ${totalErrors}`);
    console.log(`   Chunks added: ${totalAdded}`);
    console.log(`   Total in Chroma: ${stats.count} docs`);
    console.log("─".repeat(50) + "\n");
  } catch {
    console.log(`\n✅ Added ${totalAdded} chunks\n`);
  }
}

main().catch((err) => {
  console.error("\n❌ Fatal error:", err.message);
  console.error(
    "\nBatch files preserved for resume. Run with --process-only to continue."
  );
  console.error("\nMake sure:");
  console.error("  1. Chroma is running (docker-compose up chroma)");
  console.error("  2. Ollama is running with mxbai-embed-large model");
  process.exit(1);
});
