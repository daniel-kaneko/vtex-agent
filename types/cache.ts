/**
 * Cache types for content ingestion
 * @module types/cache
 */

/**
 * Single cache entry for a document/URL
 */
export interface CacheEntry {
  /** Content hash for change detection */
  hash: string;
  /** ISO timestamp of last update */
  lastUpdated: string;
  /** Remote file hash (e.g., GitHub SHA) */
  remoteHash?: string;
  /** Last modified date from source */
  lastmod?: string;
}

/**
 * Cache storage mapping keys to entries
 */
export interface Cache {
  [key: string]: CacheEntry;
}

