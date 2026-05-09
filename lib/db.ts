/**
 * Database client for Mintscore's backtesting layer.
 *
 * Uses Neon's serverless driver because:
 *  - Works in Vercel's serverless / edge runtime (no TCP socket persistence problems)
 *  - HTTP-based, friendly with Vercel's free hobby tier
 *  - Free Neon Postgres tier gives us 0.5GB / 190 compute hours which is plenty
 *
 * Setup (Charles, in Vercel dashboard):
 *  1. Project → Storage → Create database → Neon Postgres → free tier
 *  2. Vercel auto-injects DATABASE_URL into env vars
 *  3. Deploy. First request to a backtesting endpoint creates the schema.
 *
 * Without DATABASE_URL set, every backtest function returns null/empty
 * gracefully — the rest of the site works fine.
 */

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let cached: NeonQueryFunction<false, false> | null = null;
let schemaInitialised = false;

export function db(): NeonQueryFunction<false, false> | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (!cached) cached = neon(url);
  return cached;
}

/** Idempotent schema bootstrap — safe to call on every cold-start. */
export async function ensureSchema(): Promise<boolean> {
  const sql = db();
  if (!sql) return false;
  if (schemaInitialised) return true;

  await sql`
    CREATE TABLE IF NOT EXISTS predictions (
      id BIGSERIAL PRIMARY KEY,
      match_id BIGINT NOT NULL,
      competition_code TEXT NOT NULL,
      competition_name TEXT NOT NULL,
      utc_date TIMESTAMPTZ NOT NULL,
      home_id BIGINT NOT NULL,
      away_id BIGINT NOT NULL,
      home_name TEXT NOT NULL,
      away_name TEXT NOT NULL,
      home_short TEXT NOT NULL,
      away_short TEXT NOT NULL,
      market TEXT NOT NULL,
      market_label TEXT NOT NULL,
      predicted_outcome TEXT NOT NULL,
      predicted_probability NUMERIC NOT NULL,
      fair_odds NUMERIC NOT NULL,
      result TEXT,
      home_goals INT,
      away_goals INT,
      resulted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(match_id, market)
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_predictions_utc_date ON predictions(utc_date)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_predictions_result ON predictions(result)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_predictions_competition ON predictions(competition_code)`;

  await sql`
    CREATE TABLE IF NOT EXISTS accumulators (
      id BIGSERIAL PRIMARY KEY,
      target_odds INT NOT NULL,
      combined_fair_odds NUMERIC NOT NULL,
      joint_probability NUMERIC NOT NULL,
      legs_count INT NOT NULL,
      leg_match_ids BIGINT[] NOT NULL,
      leg_markets TEXT[] NOT NULL,
      result TEXT,                         -- 'HIT' (all legs won) or 'MISS' (any leg lost)
      legs_hit INT,                        -- how many legs hit
      kickoff_window_start TIMESTAMPTZ NOT NULL,
      kickoff_window_end TIMESTAMPTZ NOT NULL,
      resulted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_accas_target ON accumulators(target_odds)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_accas_result ON accumulators(result)`;

  schemaInitialised = true;
  return true;
}
