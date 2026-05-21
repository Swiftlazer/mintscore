#!/usr/bin/env tsx
import { getLiveScores } from "../lib/live-scores";

// Try to load .env if `dotenv` is available (optional)
(async () => {
  try {
    const mod = await import('dotenv').catch(() => null);
    if (mod?.config) mod.config();
  } catch {}
})();

async function main() {
  try {
    const matches = await getLiveScores();
    console.log(`Matches: ${matches.length}`);
    console.log(JSON.stringify(matches.slice(0, 10), null, 2));
    if (matches.length === 0) {
      console.log("Note: no matches returned — ensure FOOTBALL_DATA_TOKEN is set in your environment.");
    }
  } catch (err) {
    console.error("Error fetching live scores:", err);
    process.exit(1);
  }
}

main();
