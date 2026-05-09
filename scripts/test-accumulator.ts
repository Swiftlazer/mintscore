import { predictMatch } from "../lib/predict-match";
import { compileAllTargets } from "../lib/accumulator";
import demoFixtures from "../data/demo-fixtures.json";
import type { Match } from "../lib/types";

const matches = demoFixtures as Match[];
const predictions = matches.map(m => predictMatch(m));

console.log(`\nUsing ${matches.length} demo fixtures across the bundled leagues.\n`);

const accas = compileAllTargets(predictions);
for (const { target, acc } of accas) {
  console.log(`────── target ${target} odds ──────`);
  if (!acc) {
    console.log("  (couldn't build — not enough confident picks)\n");
    continue;
  }
  console.log(`  combined odds: ${acc.combinedFairOdds.toFixed(2)}`);
  console.log(`  joint hit prob: ${(acc.jointProbability * 100).toFixed(2)}%`);
  console.log(`  ~1 in ${acc.oneInX}`);
  console.log(`  legs (${acc.legs.length}):`);
  for (const leg of acc.legs) {
    console.log(`    - ${leg.homeShort} vs ${leg.awayShort}: ${leg.market.padEnd(34)} p=${(leg.probability*100).toFixed(0)}% odds=${leg.fairOdds.toFixed(2)}`);
  }
  console.log("");
}
