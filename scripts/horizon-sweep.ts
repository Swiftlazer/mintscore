import { predictMatch } from "../lib/predict-match";
import { compileAllTargets, compilePerLeague } from "../lib/accumulator";
import type { Match } from "../lib/types";
import fixtures from "./fixtures.json";

const liveFixtures = fixtures as Match[];
const predictions = liveFixtures.map(m => predictMatch(m));
const now = Date.now();

console.log(`now = ${new Date(now).toISOString()}\n`);
console.log(`Horizon sweep — matches in pool & accas built\n`);

for (const hours of [48, 60, 72, 84, 96, 120]) {
  const horizon = hours * 60 * 60 * 1000;
  const pool = predictions.filter(p => new Date(p.match.utcDate).getTime() - now < horizon);
  const accas = compileAllTargets(pool);
  const perLeague = compilePerLeague(pool, 10);
  const built = accas.filter(a => a.acc !== null).length;
  console.log(`  ${String(hours).padStart(3)}h → ${String(pool.length).padStart(2)}/18 matches → ${built}/4 main accas, ${perLeague.length} per-league`);
}
