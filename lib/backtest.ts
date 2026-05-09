/**
 * Backtesting queries.
 *
 * Returns null/empty values gracefully when the database isn't configured,
 * so the homepage and other pages keep rendering without errors during
 * the period before Charles connects Neon.
 */

import { db, ensureSchema } from "./db";

export interface AccuracyRow {
  market: string;
  marketLabel: string;
  totalResulted: number;
  hits: number;
  hitRate: number;        // 0..1
  expectedHitRate: number; // average of the model's predicted_probability for this market
}

export interface CompetitionAccuracy {
  competitionCode: string;
  competitionName: string;
  totalResulted: number;
  hits: number;
  hitRate: number;
}

export interface RecentResult {
  matchId: number;
  competitionName: string;
  utcDate: string;
  homeName: string;
  awayName: string;
  homeGoals: number | null;
  awayGoals: number | null;
  predictions: Array<{
    marketLabel: string;
    predictedOutcome: string;
    predictedProbability: number;
    result: "HIT" | "MISS";
  }>;
}

export interface AccaHistory {
  hitRate: number;       // 0..1
  sampleSize: number;
}

/** Try/catch wrapper that returns null on any DB error. */
async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    if (!db()) return null;
    await ensureSchema();
    return await fn();
  } catch (err) {
    console.error("[backtest]", err);
    return null;
  }
}

/** Overall summary for the track-record page. */
export async function getOverallAccuracy(): Promise<{
  totalResulted: number;
  hits: number;
  hitRate: number;
} | null> {
  return safe(async () => {
    const sql = db()!;
    const rows = await sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE result = 'HIT')::int AS hits
      FROM predictions
      WHERE result IS NOT NULL
    ` as Array<{ total: number; hits: number }>;
    const r = rows[0];
    if (!r || r.total === 0) return { totalResulted: 0, hits: 0, hitRate: 0 };
    return {
      totalResulted: r.total,
      hits: r.hits,
      hitRate: r.hits / r.total,
    };
  });
}

/** Per-market accuracy: how often does the model's pick on each market type hit? */
export async function getAccuracyByMarket(): Promise<AccuracyRow[]> {
  const result = await safe(async () => {
    const sql = db()!;
    const rows = await sql`
      SELECT
        market,
        market_label,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE result = 'HIT')::int AS hits,
        AVG(predicted_probability)::float AS avg_prob
      FROM predictions
      WHERE result IS NOT NULL
      GROUP BY market, market_label
      ORDER BY total DESC
    ` as Array<{ market: string; market_label: string; total: number; hits: number; avg_prob: number }>;
    return rows.map(r => ({
      market: r.market,
      marketLabel: r.market_label,
      totalResulted: r.total,
      hits: r.hits,
      hitRate: r.total > 0 ? r.hits / r.total : 0,
      expectedHitRate: r.avg_prob,
    }));
  });
  return result ?? [];
}

/** Per-competition accuracy. */
export async function getAccuracyByCompetition(): Promise<CompetitionAccuracy[]> {
  const result = await safe(async () => {
    const sql = db()!;
    const rows = await sql`
      SELECT
        competition_code,
        competition_name,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE result = 'HIT')::int AS hits
      FROM predictions
      WHERE result IS NOT NULL
      GROUP BY competition_code, competition_name
      ORDER BY total DESC
    ` as Array<{ competition_code: string; competition_name: string; total: number; hits: number }>;
    return rows.map(r => ({
      competitionCode: r.competition_code,
      competitionName: r.competition_name,
      totalResulted: r.total,
      hits: r.hits,
      hitRate: r.total > 0 ? r.hits / r.total : 0,
    }));
  });
  return result ?? [];
}

/** Recent resulted matches with their predictions and outcomes. */
export async function getRecentResults(limit: number = 30): Promise<RecentResult[]> {
  const result = await safe(async () => {
    const sql = db()!;
    const rows = await sql`
      SELECT
        match_id, competition_name, utc_date,
        home_name, away_name, home_goals, away_goals,
        market_label, predicted_outcome, predicted_probability, result
      FROM predictions
      WHERE result IS NOT NULL
      ORDER BY resulted_at DESC NULLS LAST, utc_date DESC
      LIMIT ${limit * 5}
    ` as Array<{
      match_id: number; competition_name: string; utc_date: string;
      home_name: string; away_name: string;
      home_goals: number | null; away_goals: number | null;
      market_label: string; predicted_outcome: string;
      predicted_probability: string | number; result: string;
    }>;

    // Group by match (a match may have multiple predictions across markets).
    const byMatch = new Map<number, RecentResult>();
    for (const r of rows) {
      let entry = byMatch.get(r.match_id);
      if (!entry) {
        entry = {
          matchId: r.match_id,
          competitionName: r.competition_name,
          utcDate: r.utc_date,
          homeName: r.home_name,
          awayName: r.away_name,
          homeGoals: r.home_goals,
          awayGoals: r.away_goals,
          predictions: [],
        };
        byMatch.set(r.match_id, entry);
      }
      entry.predictions.push({
        marketLabel: r.market_label,
        predictedOutcome: r.predicted_outcome,
        predictedProbability: Number(r.predicted_probability),
        result: r.result as "HIT" | "MISS",
      });
    }

    return Array.from(byMatch.values()).slice(0, limit);
  });
  return result ?? [];
}

/** Historical hit-rate for accumulators built at a given target tier. */
export async function getAccaHistoryForTier(targetOdds: number): Promise<AccaHistory> {
  const result = await safe(async () => {
    const sql = db()!;
    const rows = await sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE result = 'HIT')::int AS hits
      FROM accumulators
      WHERE target_odds = ${targetOdds} AND result IS NOT NULL
    ` as Array<{ total: number; hits: number }>;
    const r = rows[0];
    if (!r || r.total === 0) return { hitRate: 0, sampleSize: 0 };
    return { hitRate: r.hits / r.total, sampleSize: r.total };
  });
  return result ?? { hitRate: 0, sampleSize: 0 };
}
