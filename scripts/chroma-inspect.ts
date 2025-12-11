import { ChromaClient, IncludeEnum } from "chromadb";
import { getEmbeddingFunction } from "../lib/chroma";

const CHROMA_HOST = process.env.CHROMA_HOST || "http://localhost:8000";
const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";
const COLLECTION_NAME = "docs";

async function main() {
  const args = process.argv.slice(2);
  const searchQuery = args.find((arg) => !arg.startsWith("--"));
  const showEmbeddings = args.includes("--embeddings");
  const limit = parseInt(
    args.find((arg) => arg.startsWith("--limit="))?.split("=")[1] || "10"
  );

  console.log("🔍 Chroma Inspector\n");
  console.log(`   Chroma: ${CHROMA_HOST}`);
  console.log(`   Ollama: ${OLLAMA_HOST}\n`);

  const client = new ChromaClient({ path: CHROMA_HOST });

  try {
    const heartbeat = await client.heartbeat();
    console.log(`✅ Chroma is running (heartbeat: ${heartbeat})\n`);
  } catch (error) {
    console.error("❌ Cannot connect to Chroma. Is it running?");
    console.error("   Start it with: docker-compose up chroma -d\n");
    process.exit(1);
  }

  console.log("📚 Collections:");
  const collections = await client.listCollections();

  if (collections.length === 0) {
    console.log("   (no collections found)\n");
    console.log("💡 Run 'pnpm ingest' to add documents.\n");
    return;
  }

  for (const col of collections) {
    console.log(`   - ${col}`);
  }
  console.log();

  const embeddingFunction = getEmbeddingFunction();

  let collection;
  try {
    collection = await client.getCollection({
      name: COLLECTION_NAME,
      embeddingFunction,
    });
  } catch {
    console.log(`❌ Collection "${COLLECTION_NAME}" not found.\n`);
    console.log("💡 Run 'pnpm ingest' to create it.\n");
    return;
  }

  const count = await collection.count();
  console.log(`📊 Collection "${COLLECTION_NAME}":`);
  console.log(`   Total documents: ${count}\n`);

  if (count === 0) {
    console.log("💡 Run 'pnpm ingest' to add documents.\n");
    return;
  }

  if (searchQuery) {
    console.log(`🔎 Searching for: "${searchQuery}"\n`);

    const results = await collection.query({
      queryTexts: [searchQuery],
      nResults: limit,
    });

    if (!results.documents?.[0]?.length) {
      console.log("   No results found.\n");
      return;
    }

    console.log(`📄 Top ${results.documents[0].length} results:\n`);

    results.documents[0].forEach((doc, i) => {
      const metadata = results.metadatas?.[0]?.[i];
      const distance = results.distances?.[0]?.[i];
      const similarity = distance ? (1 - distance).toFixed(4) : "N/A";

      console.log(`   [${i + 1}] Score: ${similarity}`);
      if (metadata?.source) console.log(`       Source: ${metadata.source}`);
      if (metadata?.url) console.log(`       URL: ${metadata.url}`);
      console.log(
        `       Text: ${doc?.slice(0, 200)}${
          (doc?.length || 0) > 200 ? "..." : ""
        }`
      );
      console.log();
    });

    return;
  }

  console.log(`📄 Documents (showing first ${Math.min(limit, count)}):\n`);

  const allDocs = await collection.get({
    limit,
    include: showEmbeddings
      ? [IncludeEnum.Documents, IncludeEnum.Metadatas, IncludeEnum.Embeddings]
      : [IncludeEnum.Documents, IncludeEnum.Metadatas],
  });

  if (allDocs.ids.length === 0) {
    console.log("   (no documents)\n");
    return;
  }

  const bySource: Record<
    string,
    Array<{ id: string; text: string; url?: string }>
  > = {};

  allDocs.ids.forEach((id, i) => {
    const metadata = allDocs.metadatas?.[i];
    const source = (metadata?.source as string) || "Unknown";
    const text = allDocs.documents?.[i] || "";
    const url = metadata?.url as string | undefined;

    if (!bySource[source]) bySource[source] = [];
    bySource[source].push({ id, text, url });
  });

  for (const [source, docs] of Object.entries(bySource)) {
    console.log(`   📁 ${source} (${docs.length} chunks)`);
    if (docs[0]?.url) console.log(`      ${docs[0].url}`);

    docs.slice(0, 3).forEach((doc, i) => {
      const preview = doc.text.slice(0, 100).replace(/\n/g, " ");
      console.log(
        `      [${i + 1}] ${preview}${doc.text.length > 100 ? "..." : ""}`
      );
    });

    if (docs.length > 3) {
      console.log(`      ... and ${docs.length - 3} more chunks`);
    }
    console.log();
  }

  if (showEmbeddings && allDocs.embeddings?.[0]) {
    console.log(`🔢 Sample embedding (first doc, first 10 dims):`);
    console.log(
      `   [${allDocs.embeddings[0]
        .slice(0, 10)
        .map((n) => n.toFixed(4))
        .join(", ")}...]`
    );
    console.log(`   Total dimensions: ${allDocs.embeddings[0].length}\n`);
  }

  console.log("─".repeat(50));
  console.log("\n💡 Usage:");
  console.log("   pnpm chroma:inspect                    # List all docs");
  console.log('   pnpm chroma:inspect "search query"     # Search docs');
  console.log("   pnpm chroma:inspect --limit=20         # Show more docs");
  console.log(
    "   pnpm chroma:inspect --embeddings       # Show embedding vectors\n"
  );
}

main().catch((err) => {
  console.error("\n❌ Error:", err.message);
  process.exit(1);
});
