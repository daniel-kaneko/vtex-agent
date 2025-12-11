import { ChromaClient } from "chromadb";
import path from "path";
import { deleteCache, CACHE_PATHS } from "../lib/cache";

const CHROMA_HOST = process.env.CHROMA_HOST || "http://localhost:8000";
const COLLECTION_NAME = "docs";

async function main() {
  console.log("🗑️  Chroma Reset\n");
  console.log(`   Chroma: ${CHROMA_HOST}`);
  console.log(`   Collection: ${COLLECTION_NAME}\n`);

  const client = new ChromaClient({ path: CHROMA_HOST });

  try {
    await client.heartbeat();
    console.log("✅ Connected to Chroma\n");
  } catch {
    console.error("❌ Cannot connect to Chroma. Is it running?");
    console.error("   Start it with: docker-compose up chroma -d\n");
    process.exit(1);
  }

  console.log(`   Deleting collection "${COLLECTION_NAME}"...`);
  try {
    await client.deleteCollection({ name: COLLECTION_NAME });
    console.log("   ✅ Collection deleted\n");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("does not exist") || message.includes("not be found") || message.includes("not found")) {
      console.log("   ℹ️  Collection didn't exist (already clean)\n");
    } else {
      throw error;
    }
  }

  console.log("   Clearing cache files...");
  for (const [name, relativePath] of Object.entries(CACHE_PATHS)) {
    const fullPath = path.join(process.cwd(), relativePath);
    if (deleteCache(fullPath)) {
      console.log(`   ✅ Deleted ${name} cache`);
    }
  }
  console.log("");

  console.log("🎉 Reset complete! Run 'pnpm chroma:sync' to re-ingest docs.\n");
}

main().catch((err) => {
  console.error("\n❌ Error:", err.message);
  process.exit(1);
});
