import fs from "fs";
import crypto from "crypto";

export interface CacheEntry {
  hash: string;
  lastUpdated: string;
}

export interface Cache {
  [key: string]: CacheEntry;
}

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

export function updateCacheEntry(
  cache: Cache,
  key: string,
  contentHash: string
): void {
  cache[key] = { hash: contentHash, lastUpdated: new Date().toISOString() };
}

export function deleteCache(cachePath: string): boolean {
  if (!fs.existsSync(cachePath)) return false;
  fs.unlinkSync(cachePath);
  return true;
}
