import fs from "fs";
import path from "path";
import crypto from "crypto";
import * as cheerio from "cheerio";
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
// Configuration
// ============================================================================

const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;
const RATE_LIMIT_MS = 1500;
const CACHE_PATH = path.join(process.cwd(), CACHE_PATHS.urls);

// ============================================================================
// Types
// ============================================================================

interface UrlEntry {
  url: string;
  name: string;
  selector?: string; // Optional CSS selector for content extraction
}

// ============================================================================
// Content Extraction
// ============================================================================

const REMOVE_SELECTORS = [
  "script",
  "style",
  "noscript",
  "iframe",
  "nav",
  "footer",
  "header",
  ".nav",
  ".navigation",
  ".menu",
  ".sidebar",
  ".footer",
  ".header",
  ".ads",
  ".advertisement",
  ".cookie-banner",
  ".popup",
  "[role='navigation']",
  "[role='banner']",
  "[role='contentinfo']",
];

const CONTENT_SELECTORS = [
  "article",
  "main",
  "[role='main']",
  ".content",
  "#content",
  ".post-content",
  ".article-content",
  ".documentation",
  ".docs-content",
  ".markdown-body",
  ".prose",
];

/**
 * Extracts content using a specific CSS selector
 */
function extractWithSelector(html: string, selector: string): string {
  const $ = cheerio.load(html);

  // Remove unwanted elements from the selected content
  const selected = $(selector).first();
  if (selected.length === 0) {
    return "";
  }

  // Remove noise from within the selected element
  REMOVE_SELECTORS.forEach((sel) => {
    selected.find(sel).remove();
  });

  return cleanText(selected.text());
}

/**
 * Auto-detects and extracts main content from HTML
 */
function extractContentAuto(html: string): string {
  const $ = cheerio.load(html);

  REMOVE_SELECTORS.forEach((selector) => {
    $(selector).remove();
  });

  for (const selector of CONTENT_SELECTORS) {
    const element = $(selector).first();
    if (element.length > 0) {
      return cleanText(element.text());
    }
  }

  return cleanText($("body").text());
}

/**
 * Extracts content - uses custom selector if provided, otherwise auto-detects
 */
function extractContent(html: string, selector?: string): string {
  if (selector) {
    const content = extractWithSelector(html, selector);
    if (content) return content;
    // Fallback to auto if selector returns nothing
    console.log(
      `      ⚠️ Selector "${selector}" returned empty, using auto-detect`
    );
  }
  return extractContentAuto(html);
}

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/\n\s*\n/g, "\n")
    .trim();
}

// ============================================================================
// Chunking
// ============================================================================

function chunkText(
  text: string,
  chunkSize = CHUNK_SIZE,
  overlap = CHUNK_OVERLAP
): string[] {
  const chunks: string[] = [];

  if (text.length <= chunkSize) {
    return [text];
  }

  let start = 0;
  while (start < text.length) {
    let end = start + chunkSize;

    if (end < text.length) {
      const searchStart = Math.max(end - 100, start);
      const searchText = text.slice(searchStart, end);
      const sentenceEnd = searchText.search(/[.!?]\s/);

      if (sentenceEnd !== -1) {
        end = searchStart + sentenceEnd + 2;
      } else {
        const lastSpace = text.lastIndexOf(" ", end);
        if (lastSpace > start) {
          end = lastSpace;
        }
      }
    }

    const chunk = text.slice(start, end).trim();
    if (chunk.length > 50) {
      chunks.push(chunk);
    }

    start = end - overlap;
    if (start >= text.length - overlap) break;
  }

  return chunks;
}

// ============================================================================
// Utilities
// ============================================================================

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchUrl(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; DocsBot/1.0)",
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.text();
}

function generateId(url: string, chunkIndex: number): string {
  // Use MD5 hash of full URL to ensure uniqueness
  const urlHash = crypto
    .createHash("md5")
    .update(url)
    .digest("hex")
    .slice(0, 16);
  return `url_${urlHash}_chunk_${chunkIndex}`;
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");

  const urlsPath = path.join(process.cwd(), "data", "urls.json");

  console.log("📋 Loading URLs from:", urlsPath);
  const urls: UrlEntry[] = JSON.parse(fs.readFileSync(urlsPath, "utf-8"));
  console.log(`   Found ${urls.length} URL(s) to process`);
  if (force) console.log(`   Mode: FORCE (ignoring cache)`);
  console.log("");

  const cache = loadCache(CACHE_PATH);

  try {
    const stats = await getCollectionStats();
    console.log(
      `📊 Chroma collection "${stats.name}" has ${stats.count} doc(s)\n`
    );
  } catch {
    console.log("📊 Chroma collection is empty or new\n");
  }

  let totalAdded = 0;
  let cached = 0;

  for (let i = 0; i < urls.length; i++) {
    const { url, name, selector } = urls[i];
    console.log(`🌐 [${i + 1}/${urls.length}] ${name}`);
    console.log(`   ${url}`);
    if (selector) {
      console.log(`   🎯 Using selector: ${selector}`);
    }

    try {
      const html = await fetchUrl(url);
      const contentHash = hashContent(html);

      if (
        shouldUseCache(cache, url, contentHash, DEFAULT_CACHE_TTL_DAYS, force)
      ) {
        console.log(`   📦 Unchanged (cached)\n`);
        cached++;
        continue;
      }

      console.log(`   ✅ Fetched (${(html.length / 1024).toFixed(1)} KB)`);

      const content = extractContent(html, selector);
      console.log(`   📝 Extracted ${content.length} chars`);

      if (content.length < 100) {
        console.log(`   ⚠️  Skipped (content too short)\n`);
        continue;
      }

      const chunks = chunkText(content);
      console.log(`   🔪 Split into ${chunks.length} chunk(s)`);

      const docs = chunks.map((text, idx) => ({
        id: generateId(url, idx),
        text,
        source: name,
        url,
      }));

      process.stdout.write(`   🔢 Adding to Chroma... `);
      const added = await upsertDocs(docs);
      console.log(`✅ Added ${added} doc(s)`);

      updateCacheEntry(cache, url, contentHash);

      totalAdded += added;
      console.log(`   ✨ Done\n`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.log(`   ❌ Failed: ${message}\n`);
    }

    if (i < urls.length - 1 && !cache[urls[i].url]) {
      process.stdout.write(`   ⏳ Rate limiting (${RATE_LIMIT_MS}ms)...`);
      await delay(RATE_LIMIT_MS);
      console.log(" done\n");
    }
  }

  saveCache(CACHE_PATH, cache);

  try {
    const stats = await getCollectionStats();
    console.log(`\n✅ Ingestion complete!`);
    console.log(`   Processed: ${urls.length - cached}`);
    console.log(`   Cached: ${cached}`);
    console.log(`   Added: ${totalAdded} doc(s)`);
    console.log(`   Total in collection: ${stats.count} doc(s)`);
  } catch {
    console.log(`\n✅ Added ${totalAdded} doc(s)`);
  }
}

main().catch((err) => {
  console.error("\n❌ Fatal error:", err.message);
  console.error("\nMake sure:");
  console.error("  1. Chroma is running (docker-compose up chroma)");
  console.error("  2. Ollama is running with nomic-embed-text model");
  process.exit(1);
});
