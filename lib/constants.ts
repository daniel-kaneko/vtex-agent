/** Number of recent messages to include in context */
export const CONTEXT_WINDOW = 2;

/** Minimum similarity score to include a document as source (L2 distance based) */
export const MIN_RELEVANCE_SCORE = 0.001;

/** Default number of documents to retrieve for RAG */
export const DEFAULT_TOP_K = 3;

/** API endpoints */
export const API_ENDPOINTS = {
  ask: "/api/ask",
  health: "/api/health",
} as const;

