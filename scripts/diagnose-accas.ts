/**
 * Diagnostic: reproduces the exact fixture list visible on mintscore.com.ng
 * right now, runs it through predictMatch + compileAllTargets, and reports
 * whether the accumulator section would render.
 */
import { predictMatch } from "../lib/predict-match";
import { compileAllTargets, compilePerLeague } from "../lib/accumulator";
import type { Match } from "../lib/types";

// Reconstructed from the live HTML returned by the home page.
const liveFixtures: Match[] = [
  // Fri May 22
  { id: 537185, competition: "Serie A", competitionCode: "SA", utcDate: "2026-05-22T17:45:00Z", status: "SCHEDULED",
    home: { id: 99, name: "ACF Fiorentina", shortName: "Fiorentina" },
    away: { id: 102, name: "Atalanta BC", shortName: "Atalanta" } },
  // Sat May 23
  { id: 557983, competition: "Championship", competitionCode: "ELC", utcDate: "2026-05-23T00:00:00Z", status: "SCHEDULED",
    home: { id: 322, name: "Hull City AFC", shortName: "Hull City" },
    away: { id: 340, name: "Southampton FC", shortName: "Southampton" } },
  { id: 537187, competition: "Serie A", competitionCode: "SA", utcDate: "2026-05-23T15:00:00Z", status: "SCHEDULED",
    home: { id: 103, name: "Bologna FC 1909", shortName: "Bologna" },
    away: { id: 108, name: "FC Internazionale Milano", shortName: "Inter" } },
  { id: 537190, competition: "Serie A", competitionCode: "SA", utcDate: "2026-05-23T17:45:00Z", status: "SCHEDULED",
    home: { id: 110, name: "SS Lazio", shortName: "Lazio" },
    away: { id: 555, name: "AC Pisa 1909", shortName: "AC Pisa" } },
  { id: 544586, competition: "La Liga", competitionCode: "PD", utcDate: "2026-05-23T18:00:00Z", status: "SCHEDULED",
    home: { id: 84, name: "RCD Mallorca", shortName: "Mallorca" },
    away: { id: 1048, name: "Real Oviedo", shortName: "Real Oviedo" } },
  { id: 544582, competition: "La Liga", competitionCode: "PD", utcDate: "2026-05-23T18:00:00Z", status: "SCHEDULED",
    home: { id: 90, name: "Real Betis Balompié", shortName: "Real Betis" },
    away: { id: 88, name: "Levante UD", shortName: "Levante" } },
  { id: 544589, competition: "La Liga", competitionCode: "PD", utcDate: "2026-05-23T18:00:00Z", status: "SCHEDULED",
    home: { id: 95, name: "Valencia CF", shortName: "Valencia" },
    away: { id: 81, name: "FC Barcelona", shortName: "Barça" } },
  { id: 544584, competition: "La Liga", competitionCode: "PD", utcDate: "2026-05-23T18:00:00Z", status: "SCHEDULED",
    home: { id: 80, name: "RCD Espanyol de Barcelona", shortName: "Espanyol" },
    away: { id: 92, name: "Real Sociedad de Fútbol", shortName: "Real Sociedad" } },
  { id: 544581, competition: "La Liga", competitionCode: "PD", utcDate: "2026-05-23T18:00:00Z", status: "SCHEDULED",
    home: { id: 263, name: "Deportivo Alavés", shortName: "Alavés" },
    away: { id: 87, name: "Rayo Vallecano de Madrid", shortName: "Rayo Vallecano" } },
  { id: 544587, competition: "La Liga", competitionCode: "PD", utcDate: "2026-05-23T18:00:00Z", status: "SCHEDULED",
    home: { id: 86, name: "Real Madrid CF", shortName: "Real Madrid" },
    away: { id: 77, name: "Athletic Club", shortName: "Athletic" } },
  { id: 544583, competition: "La Liga", competitionCode: "PD", utcDate: "2026-05-23T18:00:00Z", status: "SCHEDULED",
    home: { id: 558, name: "RC Celta de Vigo", shortName: "Celta" },
    away: { id: 559, name: "Sevilla FC", shortName: "Sevilla FC" } },
  { id: 544590, competition: "La Liga", competitionCode: "PD", utcDate: "2026-05-23T18:00:00Z", status: "SCHEDULED",
    home: { id: 298, name: "Girona FC", shortName: "Girona" },
    away: { id: 285, name: "Elche CF", shortName: "Elche" } },
  { id: 544585, competition: "La Liga", competitionCode: "PD", utcDate: "2026-05-23T18:00:00Z", status: "SCHEDULED",
    home: { id: 82, name: "Getafe CF", shortName: "Getafe" },
    away: { id: 79, name: "CA Osasuna", shortName: "Osasuna" } },
  { id: 554909, competition: "Brasileirão", competitionCode: "BSA", utcDate: "2026-05-23T19:00:00Z", status: "SCHEDULED",
    home: { id: 1789, name: "Esporte Clube Vitória", shortName: "Vitória" },
    away: { id: 1796, name: "Sport Club Internacional", shortName: "Internacional" } },
  { id: 554907, competition: "Brasileirão", competitionCode: "BSA", utcDate: "2026-05-23T19:00:00Z", status: "SCHEDULED",
    home: { id: 1769, name: "São Paulo FC", shortName: "São Paulo" },
    away: { id: 1770, name: "Botafogo FR", shortName: "Botafogo" } },
  { id: 554905, competition: "Brasileirão", competitionCode: "BSA", utcDate: "2026-05-23T21:00:00Z", status: "SCHEDULED",
    home: { id: 1900, name: "Mirassol", shortName: "Mirassol" },
    away: { id: 1765, name: "Fluminense FC", shortName: "Fluminense" } },
  { id: 554904, competition: "Brasileirão", competitionCode: "BSA", utcDate: "2026-05-23T21:00:00Z", status: "SCHEDULED",
    home: { id: 1767, name: "Grêmio FBPA", shortName: "Grêmio" },
    away: { id: 1776, name: "Santos FC", shortName: "Santos" } },
  // Sun May 24
  { id: 554903, competition: "Brasileirão", competitionCode: "BSA", utcDate: "2026-05-23T23:00:00Z", status: "SCHEDULED",
    home: { id: 1783, name: "Clube de Regatas do Flamengo", shortName: "Flamengo" },
    away: { id: 1769, name: "Sociedade Esportiva Palmeiras", shortName: "Palmeiras" } },
];

console.log(`Fixtures: ${liveFixtures.length}\n`);

const predictions = liveFixtures.map(m => predictMatch(m));

// Top 10 most confident calls across all matches, all markets, to confirm
// the model has enough material to build accas from.
const allLegs: Array<{ match: string; market: string; prob: number; odds: number }> = [];
for (const p of predictions) {
  const tag = `${p.match.home.shortName} v ${p.match.away.shortName}`;
  allLegs.push({ match: tag, market: "1", prob: p.probabilities.home, odds: p.fairOdds.home });
  allLegs.push({ match: tag, market: "X", prob: p.probabilities.draw, odds: p.fairOdds.draw });
  allLegs.push({ match: tag, market: "2", prob: p.probabilities.away, odds: p.fairOdds.away });
  allLegs.push({ match: tag, market: "O2.5", prob: p.over25Prob, odds: 1 / p.over25Prob });
  allLegs.push({ match: tag, market: "U2.5", prob: 1 - p.over25Prob, odds: 1 / (1 - p.over25Prob) });
  allLegs.push({ match: tag, market: "BTTS Y", prob: p.bttsProb, odds: 1 / p.bttsProb });
  allLegs.push({ match: tag, market: "BTTS N", prob: 1 - p.bttsProb, odds: 1 / (1 - p.bttsProb) });
}
allLegs.sort((a, b) => b.prob - a.prob);
console.log("Top 15 most confident leg candidates across all 18 matches:");
for (const l of allLegs.slice(0, 15)) {
  console.log(`  ${l.prob.toFixed(3).padStart(5)}  odds=${l.odds.toFixed(2).padStart(5)}  ${l.match.padEnd(30)} ${l.market}`);
}
console.log();

// HORIZON_MS — now matches the value in HomePageClient.tsx after the fix
const HORIZON_MS = 96 * 60 * 60 * 1000;
const now = Date.now();
const accaPool = predictions.filter(
  p => new Date(p.match.utcDate).getTime() - now < HORIZON_MS,
);
console.log(`accaPool size (48h horizon from ${new Date(now).toISOString()}): ${accaPool.length} / ${predictions.length}`);
console.log();

console.log("── compileAllTargets(accaPool) ──");
const allAccas = compileAllTargets(accaPool);
for (const { target, acc } of allAccas) {
  if (!acc) {
    console.log(`  ${target}: NULL (no acca built)`);
  } else {
    console.log(`  ${target}: ${acc.legs.length} legs, combined ${acc.combinedFairOdds.toFixed(2)}`);
  }
}
console.log();

console.log("── compilePerLeague(accaPool, 10) ──");
const perLeague = compilePerLeague(accaPool, 10);
if (perLeague.length === 0) {
  console.log("  (empty)");
} else {
  for (const { competitionCode, acc } of perLeague) {
    console.log(`  ${competitionCode}: ${acc.legs.length} legs, combined ${acc.combinedFairOdds.toFixed(2)}`);
  }
}
console.log();

const anyMainAcca = allAccas.some(a => a.acc !== null);
console.log(`anyMainAcca = ${anyMainAcca}  →  Main acca section ${anyMainAcca ? "VISIBLE" : "HIDDEN"}`);
console.log(`visiblePerLeague.length = ${perLeague.length}  →  Per-league section ${perLeague.length > 0 ? "VISIBLE" : "HIDDEN"}`);
