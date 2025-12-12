#!/usr/bin/env tsx
/**
 * Shows a friendly message and countdown before long-running tasks.
 */

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log("\n☕ Grab a coffee, this will take a while...\n");

  for (let i = 3; i > 0; i--) {
    process.stdout.write(`   Starting in ${i}...\r`);
    await delay(1000);
  }

  console.log("   🚀 Let's go!        \n");
}

main();

