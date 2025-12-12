#!/usr/bin/env tsx
/**
 * Child process script that processes a single batch file.
 * Spawned by ingest-sitemap.ts to ensure memory isolation.
 * Uses direct REST API to avoid chromadb-js V8 crashes.
 *
 * Usage: tsx scripts/process-batch.ts <batchFile> <configName>
 */

import fs from "fs";
import path from "path";
import { upsertDocsBatch, DocToUpsert } from "../lib/chroma-rest";
import {
  updateCacheEntry,
  loadCache,
  saveCache,
  CACHE_PATHS,
} from "../lib/cache";
import { createChunkDocs } from "../lib/chunking";

const CACHE_PATH = path.join(process.cwd(), CACHE_PATHS.sitemap);
const UPSERT_BATCH_SIZE = 20;

interface ExtractedEntry {
  url: string;
  hash: string;
  text: string;
}

async function processBatchFile(
  batchFile: string,
  configName: string
): Promise<{ processed: number; chunksAdded: number }> {
  const cache = loadCache(CACHE_PATH);

  const content = fs.readFileSync(batchFile, "utf-8");
  const lines = content.trim().split("\n").filter(Boolean);

  let processed = 0;
  let chunksAdded = 0;
  let pendingDocs: DocToUpsert[] = [];

  for (const line of lines) {
    try {
      const entry: ExtractedEntry = JSON.parse(line);
      const urlPath = new URL(entry.url).pathname;

      const chunks = createChunkDocs(entry.text, {
        idPrefix: "sitemap",
        url: entry.url,
        source: `${configName} - ${urlPath}`,
      });

      for (const chunk of chunks) {
        pendingDocs.push({
          id: chunk.id,
          text: chunk.text,
          source: chunk.source,
          url: chunk.url,
        });

        if (pendingDocs.length >= UPSERT_BATCH_SIZE) {
          await upsertDocsBatch(pendingDocs);
          chunksAdded += pendingDocs.length;
          pendingDocs = [];
        }
      }

      updateCacheEntry(cache, entry.url, entry.hash);
      processed++;
    } catch (err) {
      console.error(`Error: ${err instanceof Error ? err.message : err}`);
    }
  }

  if (pendingDocs.length > 0) {
    await upsertDocsBatch(pendingDocs);
    chunksAdded += pendingDocs.length;
  }

  saveCache(CACHE_PATH, cache);
  fs.unlinkSync(batchFile);

  return { processed, chunksAdded };
}

async function main(): Promise<void> {
  const [batchFile, configName] = process.argv.slice(2);

  if (!batchFile || !configName) {
    console.error(
      "Usage: tsx scripts/process-batch.ts <batchFile> <configName>"
    );
    process.exit(1);
  }

  if (!fs.existsSync(batchFile)) {
    console.error(`Batch file not found: ${batchFile}`);
    process.exit(1);
  }

  try {
    const { processed, chunksAdded } = await processBatchFile(
      batchFile,
      configName
    );
    console.log(JSON.stringify({ processed, chunksAdded }));
    process.exit(0);
  } catch (error) {
    console.error(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      })
    );
    process.exit(1);
  }
}

main();
