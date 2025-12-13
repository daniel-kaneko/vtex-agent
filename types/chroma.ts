/**
 * ChromaDB and vector store types
 * @module types/chroma
 */

/**
 * Ollama embedding API response
 */
export interface OllamaEmbeddingResponse {
  embedding: number[];
}

/**
 * ChromaDB collection metadata
 */
export interface ChromaCollection {
  id: string;
  name: string;
}

/**
 * Document to upsert into ChromaDB
 */
export interface DocToUpsert {
  id: string;
  text: string;
  source?: string;
  url?: string;
}

/**
 * Query result from ChromaDB
 */
export interface QueryResult {
  text: string;
  source?: string;
  url?: string;
  score: number;
}

/**
 * Collection statistics
 */
export interface CollectionStats {
  count: number;
  name: string;
}

