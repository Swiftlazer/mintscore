import { predictMatch } from "../lib/predict-match";

// Man City (home) vs Liverpool (away) — should favour City but be close
const m1 = {
  id: 9999, competition: "Premier League", competitionCode: "PL",
  utcDate: new Date().toISOString(), status: "SCHEDULED" as const,
  home: { id: 65, name: "Manchester City FC", shortName: "Man City" },
  away: { id: 64, name: "Liverpool FC", shortName: "Liverpool" },
};
const p1 = predictMatch(m1);
console.log("\nMan City (H) vs Liverpool (A)");
console.log(`  xG: ${p1.expectedGoals.home.toFixed(2)} - ${p1.expectedGoals.away.toFixed(2)}`);
console.log(`  Probs: H ${(p1.probabilities.home*100).toFixed(1)}% / D ${(p1.probabilities.draw*100).toFixed(1)}% / A ${(p1.probabilities.away*100).toFixed(1)}%`);
console.log(`  Sum: ${(p1.probabilities.home + p1.probabilities.draw + p1.probabilities.away).toFixed(4)}`);
console.log(`  Top scoreline: ${p1.topScorelines[0].home}-${p1.topScorelines[0].away} (${(p1.topScorelines[0].prob*100).toFixed(1)}%)`);
console.log(`  BTTS: ${(p1.bttsProb*100).toFixed(1)}%, Over 2.5: ${(p1.over25Prob*100).toFixed(1)}%`);

// Southampton (home) vs Man City (away) — should heavily favour City
const m2 = {
  id: 9998, competition: "Premier League", competitionCode: "PL",
  utcDate: new Date().toISOString(), status: "SCHEDULED" as const,
  home: { id: 340, name: "Southampton FC", shortName: "Southampton" },
  away: { id: 65, name: "Manchester City FC", shortName: "Man City" },
};
const p2 = predictMatch(m2);
console.log("\nSouthampton (H) vs Man City (A)");
console.log(`  xG: ${p2.expectedGoals.home.toFixed(2)} - ${p2.expectedGoals.away.toFixed(2)}`);
console.log(`  Probs: H ${(p2.probabilities.home*100).toFixed(1)}% / D ${(p2.probabilities.draw*100).toFixed(1)}% / A ${(p2.probabilities.away*100).toFixed(1)}%`);

// Test value-bet detection with mock market odds
const m3 = {
  id: 9997, competition: "Premier League", competitionCode: "PL",
  utcDate: new Date().toISOString(), status: "SCHEDULED" as const,
  home: { id: 57, name: "Arsenal FC", shortName: "Arsenal" },
  away: { id: 73, name: "Tottenham Hotspur FC", shortName: "Spurs" },
};
// Suppose the market badly underprices Arsenal at 3.50 (should be ~1.80 fair)
const p3 = predictMatch(m3, { home: 3.50, draw: 3.40, away: 2.20 });
console.log("\nArsenal vs Spurs (with mispriced market odds)");
console.log(`  Probs: H ${(p3.probabilities.home*100).toFixed(1)}% / D ${(p3.probabilities.draw*100).toFixed(1)}% / A ${(p3.probabilities.away*100).toFixed(1)}%`);
console.log(`  Fair odds: ${p3.fairOdds.home.toFixed(2)} / ${p3.fairOdds.draw.toFixed(2)} / ${p3.fairOdds.away.toFixed(2)}`);
console.log(`  Value: ${p3.value?.recommendation} on ${p3.value?.outcome} (edge ${p3.value?.edgePct?.toFixed(1)}%, stake ${p3.value?.kellyFractionPct?.toFixed(2)}%)`);
