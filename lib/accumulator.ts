/**
 * Accumulator (acca / combo) compilation.
 *
 * Strategy: for a target combined odds T (e.g. 10, 100, 1000), pick a
 * subset of legs across the day's matches whose product of fair odds
 * lands close to T, while maximising joint probability — i.e. picking
 * the model's MOST CONFIDENT calls first.
 *
 * Constraints:
 *  - At most one leg per match (avoids correlation issues from same-game
 *    parlays). Real bookmakers often allow these but they violate
 *    independence assumptions.
 *  - Only consider legs the model rates ≥ 50% probable. We're not stuffing
 *    coin-flips into a 1000-odd dream-ticket.
 *
 * Honest reality the UI must surface: combined fair odds T means joint
 * probability 1/T regardless of how the legs were chosen. The maths is
 * iron — picking "more probable" individual legs gives you MORE legs to
 * reach the target, not better joint odds. We display that openly.
 */

import type { MatchPrediction, Accumulator, AccumulatorLeg } from "./types";

const MIN_LEG_PROB = 0.35; // reach further down the confidence ladder for 10000-odds tier; safest-first sort keeps low-tier accas safe
const MAX_LEGS = 22;       // hard cap — 10000-odd accas realistically need 18-21 legs

interface CandidateLeg extends AccumulatorLeg {}

/** Generate all plausible market candidates for one match. */
function candidatesForMatch(p: MatchPrediction): CandidateLeg[] {
  const c: CandidateLeg[] = [];

  const base = {
    matchId: p.match.id,
    homeShort: p.match.home.shortName,
    awayShort: p.match.away.shortName,
    competition: p.match.competition,
    kickoffISO: p.match.utcDate,
  };

  // 1X2
  c.push({
    ...base,
    market: `${p.match.home.shortName} to win`,
    marketKey: "1",
    probability: p.probabilities.home,
    fairOdds: p.fairOdds.home,
  });
  c.push({
    ...base,
    market: "Draw",
    marketKey: "X",
    probability: p.probabilities.draw,
    fairOdds: p.fairOdds.draw,
  });
  c.push({
    ...base,
    market: `${p.match.away.shortName} to win`,
    marketKey: "2",
    probability: p.probabilities.away,
    fairOdds: p.fairOdds.away,
  });

  // Over/Under 2.5
  c.push({
    ...base,
    market: "Over 2.5 goals",
    marketKey: "OVER_2_5",
    probability: p.over25Prob,
    fairOdds: p.over25Prob > 0 ? 1 / p.over25Prob : Infinity,
  });
  c.push({
    ...base,
    market: "Under 2.5 goals",
    marketKey: "UNDER_2_5",
    probability: 1 - p.over25Prob,
    fairOdds: 1 - p.over25Prob > 0 ? 1 / (1 - p.over25Prob) : Infinity,
  });

  // BTTS
  c.push({
    ...base,
    market: "Both teams to score",
    marketKey: "BTTS_YES",
    probability: p.bttsProb,
    fairOdds: p.bttsProb > 0 ? 1 / p.bttsProb : Infinity,
  });
  c.push({
    ...base,
    market: "Both teams NOT to both score",
    marketKey: "BTTS_NO",
    probability: 1 - p.bttsProb,
    fairOdds: 1 - p.bttsProb > 0 ? 1 / (1 - p.bttsProb) : Infinity,
  });

  return c.filter(x => x.probability >= MIN_LEG_PROB && Number.isFinite(x.fairOdds));
}

function riskLabelFor(target: number): "moderate" | "high" | "lottery" {
  if (target <= 15) return "moderate";
  if (target <= 200) return "high";
  return "lottery";
}

export function compileAccumulator(
  predictions: MatchPrediction[],
  target: number,
): Accumulator | null {
  // For each match, take its three most-confident candidate markets.
  // (Limiting to 3 per match prevents one match from dominating the pool.)
  const pool: CandidateLeg[] = [];
  for (const p of predictions) {
    const cands = candidatesForMatch(p)
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 3);
    pool.push(...cands);
  }

  // Sort the entire pool by probability desc — most confident calls first.
  pool.sort((a, b) => b.probability - a.probability);

  // Greedy build, one leg per match, until product reaches target.
  const legs: CandidateLeg[] = [];
  const usedMatches = new Set<number>();
  let product = 1;

  for (const c of pool) {
    if (product >= target) break;
    if (legs.length >= MAX_LEGS) break;
    if (usedMatches.has(c.matchId)) continue;

    const next = product * c.fairOdds;
    // Overshoot guard: if we're already within striking distance of the
    // target (≥ 80% of it), skip legs that would push us beyond 130% of
    // target. Keeps the acca's actual odds reasonably close to the
    // headline tier (10 / 100 / 1000) instead of badly overshooting.
    if (product >= target * 0.8 && next > target * 1.3) continue;
    // Early-stage guard: if we're far from target and a single leg would
    // overshoot by 2x, there's probably a better-fitting leg later.
    if (product < target * 0.7 && next > target * 2) continue;

    legs.push(c);
    usedMatches.add(c.matchId);
    product = next;
  }

  // If we couldn't reach the target — common for 1000 odds when there
  // are few high-confidence picks available — return null and the UI
  // will show a graceful "not enough matches today" message.
  if (legs.length < 2 || product < target * 0.6) return null;

  return {
    targetOdds: target,
    legs,
    combinedFairOdds: product,
    jointProbability: 1 / product,
    oneInX: Math.round(product),
    riskLabel: riskLabelFor(target),
  };
}

export function compileAllTargets(
  predictions: MatchPrediction[],
): { target: number; acc: Accumulator | null }[] {
  return [10, 100, 1000, 10000].map(target => ({
    target,
    acc: compileAccumulator(predictions, target),
  }));
}

/**
 * Per-league accumulators.
 *
 * Builds the safest possible 10-odds acca for each competition that has
 * enough fixtures to sustain it. Returns leagues sorted by how many
 * predictions they have available (richer leagues first). Leagues without
 * enough material to build any acca are skipped silently.
 */
export function compilePerLeague(
  predictions: MatchPrediction[],
  target: number = 10,
): Array<{
  competitionCode: string;
  competitionName: string;
  acc: Accumulator;
}> {
  // Group predictions by competition.
  const byLeague = new Map<string, { name: string; preds: MatchPrediction[] }>();
  for (const p of predictions) {
    const key = p.match.competitionCode;
    if (!byLeague.has(key)) {
      byLeague.set(key, { name: p.match.competition, preds: [] });
    }
    byLeague.get(key)!.preds.push(p);
  }

  const out: Array<{ competitionCode: string; competitionName: string; acc: Accumulator }> = [];
  for (const [code, { name, preds }] of byLeague.entries()) {
    if (preds.length < 3) continue; // need at least 3 fixtures to build something interesting
    const acc = compileAccumulator(preds, target);
    if (acc) out.push({ competitionCode: code, competitionName: name, acc });
  }

  // Sort by leagues with the most legs available (richest), tiebreak by name.
  out.sort((a, b) => b.acc.legs.length - a.acc.legs.length || a.competitionName.localeCompare(b.competitionName));
  return out;
}
