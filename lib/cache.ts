import fs from "fs";
import crypto from "crypto";

// ============================================================================
// Types
// ============================================================================

export interface CacheEntry {
  hash: string;
  lastUpdated: string;
}

export interface Cache {
  [key: string]: CacheEntry;
}

// ============================================================================
// Constants
// ============================================================================

/** Default cache TTL in days */
export const DEFAULT_CACHE_TTL_DAYS = 7;

/** Known cache file paths for cleanup */
export const CACHE_PATHS = {
  urls: "data/.urls-cache.json",
  openapi: "data/.openapi-cache.json",
} as const;

// ============================================================================
// Functions
// ============================================================================

/**
 * Loads cache from a JSON file
 * @param cachePath Path to the cache file
 * @returns Cache object or empty object if file doesn't exist
 */
export function loadCache(cachePath: string): Cache {
  if (!fs.existsSync(cachePath)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(cachePath, "utf-8"));
}

/**
 * Saves cache to a JSON file
 * @param cachePath Path to the cache file
 * @param cache Cache object to save
 */
export function saveCache(cachePath: string, cache: Cache): void {
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
}

/**
 * Generates MD5 hash of content
 * @param content Content to hash
 * @returns MD5 hash as hex string
 */
export function hashContent(content: string): string {
  return crypto.createHash("md5").update(content).digest("hex");
}

/**
 * Checks if a cache entry has expired based on TTL
 * @param entry Cache entry to check
 * @param ttlDays TTL in days (default: 7)
 * @returns true if expired, false otherwise
 */
export function isCacheExpired(
  entry: CacheEntry,
  ttlDays: number = DEFAULT_CACHE_TTL_DAYS
): boolean {
  const lastUpdated = new Date(entry.lastUpdated);
  const now = new Date();
  const diffMs = now.getTime() - lastUpdated.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays > ttlDays;
}

/**
 * Checks if an item should be skipped (use cached version)
 * @param cache The cache object
 * @param key The cache key (e.g., URL or filename)
 * @param contentHash Hash of the current content
 * @param ttlDays TTL in days
 * @param force Force re-processing regardless of cache
 * @returns true if should skip (use cache), false if should process
 */
export function shouldUseCache(
  cache: Cache,
  key: string,
  contentHash: string,
  ttlDays: number = DEFAULT_CACHE_TTL_DAYS,
  force: boolean = false
): boolean {
  if (force) return false;

  const entry = cache[key];
  if (!entry) return false;

  if (entry.hash !== contentHash) return false;

  if (isCacheExpired(entry, ttlDays)) return false;

  return true;
}

/**
 * Updates a cache entry
 * @param cache The cache object to update (mutates in place)
 * @param key The cache key
 * @param contentHash Hash of the content
 */
export function updateCacheEntry(
  cache: Cache,
  key: string,
  contentHash: string
): void {
  cache[key] = {
    hash: contentHash,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Deletes a cache file if it exists
 * @param cachePath Path to the cache file
 * @returns true if deleted, false if didn't exist
 */
export function deleteCache(cachePath: string): boolean {
  if (!fs.existsSync(cachePath)) return false;

  fs.unlinkSync(cachePath);
  return true;
}

