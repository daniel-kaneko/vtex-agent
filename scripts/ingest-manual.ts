import fs from "fs";
import path from "path";
import { upsertDocs, getCollectionStats } from "../lib/chroma-rest";

interface ManualDoc {
  topic: string;
  text: string;
  url?: string;
}

async function main() {
  const manualPath = path.join(process.cwd(), "data", "manual-docs.json");

  console.log("📝 Ingesting manual-docs.json into Chroma\n");

  if (!fs.existsSync(manualPath)) {
    console.log("   No manual-docs.json found, skipping.\n");
    return;
  }

  const manualDocs: ManualDoc[] = JSON.parse(
    fs.readFileSync(manualPath, "utf-8")
  );

  if (manualDocs.length === 0) {
    console.log("   (no documents found)\n");
    return;
  }

  console.log(`   Found ${manualDocs.length} manual document(s)\n`);

  const chromaDocs = manualDocs.map((doc, index) => ({
    id: `manual_${doc.topic.toLowerCase().replace(/\s+/g, "_")}_${index}`,
    text: `${doc.topic}: ${doc.text}`,
    source: `Manual doc: ${doc.topic}`,
    url: doc.url,
  }));

  process.stdout.write("   🔢 Adding to Chroma... ");
  try {
    await upsertDocs(chromaDocs);
    console.log(`✅ Added ${chromaDocs.length} doc(s)`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.log(`❌ Failed: ${message}`);
    process.exit(1);
  }

  try {
    const stats = await getCollectionStats();
    console.log(`\n✅ Manual docs ingestion complete!`);
    console.log(`   Total in collection: ${stats.count} doc(s)\n`);
  } catch {
    console.log("\n✅ Manual docs ingestion complete!\n");
  }
}

main().catch((err) => {
  console.error("\n❌ Error:", err.message);
  process.exit(1);
});
