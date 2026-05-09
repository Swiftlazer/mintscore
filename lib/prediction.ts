/**
 * Football match prediction engine.
 *
 * Approach:
 *  1. Each team has home/away attack & defence ratings (multiplicative
 *     factors vs the league average, computed from historical results).
 *  2. Expected goals (lambda) for each side in a match are derived by
 *     combining the home team's home-attack with the away team's
 *     away-defence-weakness (and vice versa), scaled by the league's
 *     base scoring rates.
 *  3. We model goal counts as independent Poisson random variables and
 *     compute the joint distribution of scorelines.
 *  4. We apply the Dixon-Coles correction (Dixon & Coles, 1997) to the
 *     four lowest joint cells (0-0, 1-0, 0-1, 1-1) because real football
 *     data shows these scores are correlated and Poisson under/over-
 *     estimates them.
 *
 * Reference: Dixon, M.J. and Coles, S.G. (1997). "Modelling Association
 * Football Scores and Inefficiencies in the Football Betting Market."
 * Journal of the Royal Statistical Society, 46(2), 265-280.
 */

import type {
  LeagueStats,
  TeamStrength,
  OutcomeProbabilities,
  FairOdds,
  MarketOdds,
  ValueAssessment,
} from "./types";

const MAX_GOALS = 10;

// Default Dixon-Coles low-score correlation parameter.
// Mildly negative rho compresses 1-1 and inflates 0-0/1-0/0-1 vs raw Poisson.
const DEFAULT_RHO = -0.18;

/** Poisson PMF: P(X = k) where X ~ Poisson(lambda). */
function poissonPmf(k: number, lambda: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  // Use log-space for numerical stability on small lambdas / large k.
  let logP = -lambda + k * Math.log(lambda);
  for (let i = 2; i <= k; i++) logP -= Math.log(i);
  return Math.exp(logP);
}

/** Dixon-Coles tau correction for low scorelines. */
function dixonColesTau(
  homeGoals: number,
  awayGoals: number,
  lambdaHome: number,
  lambdaAway: number,
  rho: number,
): number {
  if (homeGoals === 0 && awayGoals === 0) return 1 - lambdaHome * lambdaAway * rho;
  if (homeGoals === 0 && awayGoals === 1) return 1 + lambdaHome * rho;
  if (homeGoals === 1 && awayGoals === 0) return 1 + lambdaAway * rho;
  if (homeGoals === 1 && awayGoals === 1) return 1 - rho;
  return 1;
}

/** Compute lambdas from team strengths and league averages. */
export function expectedGoals(
  home: TeamStrength,
  away: TeamStrength,
  league: LeagueStats,
): { home: number; away: number } {
  // Home team's expected goals: their home attack × opponent's away defence
  // weakness × league's average home goals.
  const lambdaHome = home.homeAttack * away.awayDefence * league.homeGoalAvg;
  const lambdaAway = away.awayAttack * home.homeDefence * league.awayGoalAvg;
  return {
    home: Math.max(0.05, lambdaHome),
    away: Math.max(0.05, lambdaAway),
  };
}

/** Build full joint scoreline distribution with Dixon-Coles correction. */
export function jointScorelineMatrix(
  lambdaHome: number,
  lambdaAway: number,
  rho: number = DEFAULT_RHO,
): number[][] {
  const matrix: number[][] = [];
  let total = 0;
  for (let i = 0; i <= MAX_GOALS; i++) {
    const row: number[] = [];
    for (let j = 0; j <= MAX_GOALS; j++) {
      const raw = poissonPmf(i, lambdaHome) * poissonPmf(j, lambdaAway);
      const tau = dixonColesTau(i, j, lambdaHome, lambdaAway, rho);
      const p = raw * tau;
      row.push(p);
      total += p;
    }
    matrix.push(row);
  }
  // Re-normalise (Dixon-Coles correction shifts mass slightly).
  if (total > 0) {
    for (let i = 0; i <= MAX_GOALS; i++) {
      for (let j = 0; j <= MAX_GOALS; j++) {
        matrix[i][j] /= total;
      }
    }
  }
  return matrix;
}

/** Aggregate the joint matrix into 1X2 outcome probabilities. */
export function outcomeProbabilities(matrix: number[][]): OutcomeProbabilities {
  let pHome = 0, pDraw = 0, pAway = 0;
  for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < matrix[i].length; j++) {
      const p = matrix[i][j];
      if (i > j) pHome += p;
      else if (i === j) pDraw += p;
      else pAway += p;
    }
  }
  return { home: pHome, draw: pDraw, away: pAway };
}

/** Both teams to score probability from joint matrix. */
export function bttsProbability(matrix: number[][]): number {
  let p = 0;
  for (let i = 1; i < matrix.length; i++) {
    for (let j = 1; j < matrix[i].length; j++) {
      p += matrix[i][j];
    }
  }
  return p;
}

/** Over 2.5 goals probability. */
export function overGoalsProbability(matrix: number[][], threshold: number): number {
  let p = 0;
  for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < matrix[i].length; j++) {
      if (i + j > threshold) p += matrix[i][j];
    }
  }
  return p;
}

/** Top-N most likely exact scorelines. */
export function topScorelines(
  matrix: number[][],
  n: number = 5,
): Array<{ home: number; away: number; prob: number }> {
  const all: Array<{ home: number; away: number; prob: number }> = [];
  for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < matrix[i].length; j++) {
      all.push({ home: i, away: j, prob: matrix[i][j] });
    }
  }
  return all.sort((a, b) => b.prob - a.prob).slice(0, n);
}

export function fairOddsFromProbs(probs: OutcomeProbabilities): FairOdds {
  return {
    home: probs.home > 0 ? 1 / probs.home : Infinity,
    draw: probs.draw > 0 ? 1 / probs.draw : Infinity,
    away: probs.away > 0 ? 1 / probs.away : Infinity,
  };
}

/**
 * Find the best value bet by comparing model probabilities to market odds.
 * Edge = (modelProb * marketDecimalOdds) - 1
 *
 * We require a meaningful edge (>= 5%) to flag as VALUE, otherwise FAIR
 * if odds reasonable, AVOID if model strongly disagrees with market.
 *
 * Kelly fraction is computed at quarter-Kelly to be conservative — full
 * Kelly is theoretically optimal but emotionally brutal on losing runs
 * and very sensitive to model error.
 */
export function assessValue(
  probs: OutcomeProbabilities,
  market: MarketOdds | undefined,
): ValueAssessment {
  if (!market || market.home == null || market.draw == null || market.away == null) {
    return {
      outcome: null,
      edgePct: null,
      recommendation: "NO_DATA",
      kellyFractionPct: null,
    };
  }

  const edges: Record<"home" | "draw" | "away", number> = {
    home: probs.home * market.home - 1,
    draw: probs.draw * market.draw - 1,
    away: probs.away * market.away - 1,
  };

  let bestOutcome: "home" | "draw" | "away" = "home";
  let bestEdge = edges.home;
  if (edges.draw > bestEdge) { bestEdge = edges.draw; bestOutcome = "draw"; }
  if (edges.away > bestEdge) { bestEdge = edges.away; bestOutcome = "away"; }

  // Quarter-Kelly: f* / 4, where f* = (b·p − q) / b for decimal odds = b+1
  const p = probs[bestOutcome];
  const o = market[bestOutcome] as number;
  const b = o - 1;
  const q = 1 - p;
  const fullKelly = b > 0 ? (b * p - q) / b : 0;
  // Quarter-Kelly, hard-capped at 2.5% of bankroll. The cap is a defence against
  // model overconfidence and against the user betting big on a single "lock".
  const KELLY_CAP = 0.025;
  const quarterKelly = Math.min(KELLY_CAP, Math.max(0, fullKelly / 4));

  let recommendation: ValueAssessment["recommendation"];
  if (bestEdge >= 0.05 && fullKelly > 0) recommendation = "VALUE";
  else if (bestEdge >= -0.05) recommendation = "FAIR";
  else recommendation = "AVOID";

  return {
    outcome: bestOutcome,
    edgePct: bestEdge * 100,
    recommendation,
    kellyFractionPct: quarterKelly * 100,
  };
}
