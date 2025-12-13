import fs from "fs";
import crypto from "crypto";
import type { Cache, CacheEntry } from "@/types";

export type { Cache, CacheEntry };

export const DEFAULT_CACHE_TTL_DAYS = 7;

export const CACHE_PATHS = {
  urls: "data/.urls-cache.json",
  openapi: "data/.openapi-cache.json",
  sitemap: "data/.sitemap-cache.json",
} as const;

export function loadCache(cachePath: string): Cache {
  if (!fs.existsSync(cachePath)) return {};
  return JSON.parse(fs.readFileSync(cachePath, "utf-8"));
}

export function saveCache(cachePath: string, cache: Cache): void {
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
}

export function hashContent(content: string): string {
  return crypto.createHash("md5").update(content).digest("hex");
}

export function isCacheExpired(
  entry: CacheEntry,
  ttlDays = DEFAULT_CACHE_TTL_DAYS
): boolean {
  const diffMs = Date.now() - new Date(entry.lastUpdated).getTime();
  return diffMs / (1000 * 60 * 60 * 24) > ttlDays;
}

export function shouldUseCache(
  cache: Cache,
  key: string,
  contentHash: string,
  ttlDays = DEFAULT_CACHE_TTL_DAYS,
  force = false
): boolean {
  if (force) return false;

  const entry = cache[key];
  if (!entry) return false;
  if (entry.hash !== contentHash) return false;
  if (isCacheExpired(entry, ttlDays)) return false;

  return true;
}

/**
 * Check if cache is valid based on remote hash (e.g., GitHub SHA).
 * This allows skipping download entirely if the remote file hasn't changed.
 * @param cache The cache object
 * @param key The cache key (e.g., filename)
 * @param remoteHash The remote file hash (e.g., GitHub SHA)
 * @param force If true, always returns false (skip cache)
 * @returns true if cache is valid and download can be skipped
 */
export function shouldUseCacheByRemoteHash(
  cache: Cache,
  key: string,
  remoteHash: string,
  force = false
): boolean {
  if (force) return false;

  const entry = cache[key];
  if (!entry) return false;
  if (!entry.remoteHash) return false;

  return entry.remoteHash === remoteHash;
}

/**
 * Check if cache is valid based on lastmod date from source (e.g., sitemap).
 * This allows skipping download if the source content hasn't been modified.
 * @param cache The cache object
 * @param key The cache key (e.g., URL)
 * @param newLastmod The new lastmod date from source
 * @param force If true, always returns false (skip cache)
 * @returns true if cache is valid and download can be skipped
 */
export function shouldUseCacheByLastmod(
  cache: Cache,
  key: string,
  newLastmod: string | undefined,
  force = false
): boolean {
  if (force) return false;

  const entry = cache[key];
  if (!entry) return false;

  if (!newLastmod) return !!entry;
  if (!entry.lastmod) return false;

  const cachedDate = new Date(entry.lastmod).getTime();
  const newDate = new Date(newLastmod).getTime();

  return newDate <= cachedDate;
}

export function updateCacheEntry(
  cache: Cache,
  key: string,
  contentHash: string,
  options?: { remoteHash?: string; lastmod?: string }
): void {
  cache[key] = {
    hash: contentHash,
    lastUpdated: new Date().toISOString(),
    ...(options?.remoteHash && { remoteHash: options.remoteHash }),
    ...(options?.lastmod && { lastmod: options.lastmod }),
  };
}

export function deleteCache(cachePath: string): boolean {
  if (!fs.existsSync(cachePath)) return false;
  fs.unlinkSync(cachePath);
  return true;
}
