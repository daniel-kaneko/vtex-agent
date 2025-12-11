import { ChromaClient, OllamaEmbeddingFunction } from "chromadb";

const CHROMA_HOST = process.env.CHROMA_HOST || "http://localhost:8000";
const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";
const COLLECTION_NAME = "docs";
const EMBEDDING_MODEL = "mxbai-embed-large";

let clientInstance: ChromaClient | null = null;

/**
 * Gets the Chroma client instance (singleton)
 */
export function getChromaClient(): ChromaClient {
  if (!clientInstance) {
    clientInstance = new ChromaClient({ path: CHROMA_HOST });
  }
  return clientInstance;
}

/**
 * Gets the Ollama embedding function for Chroma
 */
export function getEmbeddingFunction(): OllamaEmbeddingFunction {
  return new OllamaEmbeddingFunction({
    url: `${OLLAMA_HOST}/api/embeddings`,
    model: EMBEDDING_MODEL,
  });
}

/**
 * Gets or creates the docs collection
 */
export async function getDocsCollection() {
  const client = getChromaClient();
  const embeddingFunction = getEmbeddingFunction();

  return client.getOrCreateCollection({
    name: COLLECTION_NAME,
    embeddingFunction,
    metadata: { description: "Documentation embeddings for RAG" },
  });
}

/**
 * Queries the docs collection for similar documents
 * @param query The search query
 * @param topK Number of results to return
 */
export async function queryDocs(query: string, topK = 8) {
  const collection = await getDocsCollection();

  const results = await collection.query({
    queryTexts: [query],
    nResults: topK,
  });

  if (!results.documents?.[0]) {
    return [];
  }

  return results.documents[0].map((text, i) => ({
    text: text || "",
    source: results.metadatas?.[0]?.[i]?.source as string | undefined,
    url: results.metadatas?.[0]?.[i]?.url as string | undefined,
    score: results.distances?.[0]?.[i]
      ? 1 - (results.distances[0][i] as number)
      : 0,
  }));
}

/**
 * Upserts documents to the collection (adds or updates if ID exists)
 * This prevents duplicates when re-ingesting the same content.
 */
export async function upsertDocs(
  docs: Array<{
    id: string;
    text: string;
    source?: string;
    url?: string;
  }>
) {
  const collection = await getDocsCollection();

  await collection.upsert({
    ids: docs.map((d) => d.id),
    documents: docs.map((d) => d.text),
    metadatas: docs.map((d) => ({
      source: d.source || "",
      url: d.url || "",
    })),
  });

  return docs.length;
}

/**
 * Gets collection stats
 */
export async function getCollectionStats() {
  const collection = await getDocsCollection();
  const count = await collection.count();
  return { count, name: COLLECTION_NAME };
}
