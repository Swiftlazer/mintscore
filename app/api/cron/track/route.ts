/**
 * Daily cron job that:
 *   1. Snapshots predictions for matches kicking off in the next 48 hours
 *      (idempotent: skips matches we've already snapshotted via UNIQUE constraint).
 *   2. Fetches results for matches that finished in the last 7 days but
 *      haven't been resulted yet, and marks our prediction rows hit/miss.
 *   3. Snapshots and resolves the daily aggregator accumulators.
 *
 * Wire-up: triggered by Vercel Cron at 03:00 UTC daily (see vercel.json).
 *
 * Auth: Vercel Cron sends an "Authorization: Bearer ${CRON_SECRET}" header
 * that must match the env var. Without CRON_SECRET set, requests are
 * accepted (useful for first-time manual debugging).
 */

import { NextRequest, NextResponse } from "next/server";
import { db, ensureSchema } from "@/lib/db";
import { getUpcomingMatches } from "@/lib/football-data";
import { predictMatch } from "@/lib/predict-match";
import { compileAllTargets } from "@/lib/accumulator";
import type { Match, MatchPrediction } from "@/lib/types";

export const runtime = "nodejs";       // we want full Node, not edge, for the slightly heavier work
export const maxDuration = 60;          // give ourselves up to 60s

const FOOTBALL_DATA_API = "https://api.football-data.org/v4";

interface FdMatchScore {
  id: number;
  status: string;
  utcDate: string;
  homeTeam: { id: number; name: string };
  awayTeam: { id: number; name: string };
  score?: { fullTime?: { home: number | null; away: number | null } };
}

function authorised(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return true; // no secret configured = open (allow first-run setup)
  const header = req.headers.get("authorization");
  return header === `Bearer ${expected}`;
}

/** Build the list of (market, label, outcome, prob, fairOdds) we want to snapshot per match. */
function snapshotsForPrediction(p: MatchPrediction) {
  const probs = p.probabilities;

  // 1X2: pick the strongest of the three.
  let oneX2: { outcome: string; prob: number } = { outcome: "HOME", prob: probs.home };
  if (probs.draw > oneX2.prob) oneX2 = { outcome: "DRAW", prob: probs.draw };
  if (probs.away > oneX2.prob) oneX2 = { outcome: "AWAY", prob: probs.away };

  return [
    {
      market: "1X2",
      marketLabel: oneX2.outcome === "HOME"
        ? `${p.match.home.shortName} to win`
        : oneX2.outcome === "AWAY"
        ? `${p.match.away.shortName} to win`
        : "Draw",
      outcome: oneX2.outcome,
      prob: oneX2.prob,
    },
    {
      market: "OVER_2_5",
      marketLabel: p.over25Prob >= 0.5 ? "Over 2.5 goals" : "Under 2.5 goals",
      outcome: p.over25Prob >= 0.5 ? "OVER" : "UNDER",
      prob: p.over25Prob >= 0.5 ? p.over25Prob : 1 - p.over25Prob,
    },
    {
      market: "BTTS",
      marketLabel: p.bttsProb >= 0.5 ? "Both teams to score" : "Both teams NOT to both score",
      outcome: p.bttsProb >= 0.5 ? "YES" : "NO",
      prob: p.bttsProb >= 0.5 ? p.bttsProb : 1 - p.bttsProb,
    },
  ];
}

async function snapshotPredictions(
  matches: Match[],
  predictions: MatchPrediction[],
): Promise<number> {
  const sql = db()!;
  let inserted = 0;
  for (const p of predictions) {
    const m = p.match;
    const snaps = snapshotsForPrediction(p).filter(s => s.prob >= 0.40); // only meaningful picks
    for (const s of snaps) {
      const fairOdds = s.prob > 0 ? 1 / s.prob : 99;
      try {
        await sql`
          INSERT INTO predictions
            (match_id, competition_code, competition_name, utc_date,
             home_id, away_id, home_name, away_name, home_short, away_short,
             market, market_label, predicted_outcome, predicted_probability, fair_odds)
          VALUES
            (${m.id}, ${m.competitionCode}, ${m.competition}, ${m.utcDate},
             ${m.home.id}, ${m.away.id}, ${m.home.name}, ${m.away.name}, ${m.home.shortName}, ${m.away.shortName},
             ${s.market}, ${s.marketLabel}, ${s.outcome}, ${s.prob}, ${fairOdds})
          ON CONFLICT (match_id, market) DO NOTHING
        `;
        inserted++;
      } catch (err) {
        console.error("[snapshot] insert error", err);
      }
    }
  }
  return inserted;
}

async function snapshotAccumulators(predictions: MatchPrediction[]): Promise<number> {
  const sql = db()!;
  // Use the same horizon as the homepage so the snapshot matches what users saw.
  const horizonMs = 48 * 60 * 60 * 1000;
  const now = Date.now();
  const pool = predictions.filter(p => new Date(p.match.utcDate).getTime() - now < horizonMs);
  const accas = compileAllTargets(pool);

  if (pool.length === 0) return 0;

  // Window covers the full pool's kickoff range.
  const sortedPool = [...pool].sort((a, b) => new Date(a.match.utcDate).getTime() - new Date(b.match.utcDate).getTime());
  const windowStart = sortedPool[0].match.utcDate;
  const windowEnd = sortedPool[sortedPool.length - 1].match.utcDate;

  let inserted = 0;
  for (const { target, acc } of accas) {
    if (!acc) continue;
    const matchIds = acc.legs.map(l => l.matchId);
    const markets = acc.legs.map(l => l.marketKey);
    try {
      await sql`
        INSERT INTO accumulators
          (target_odds, combined_fair_odds, joint_probability, legs_count,
           leg_match_ids, leg_markets,
           kickoff_window_start, kickoff_window_end)
        VALUES
          (${target}, ${acc.combinedFairOdds}, ${acc.jointProbability}, ${acc.legs.length},
           ${matchIds}, ${markets},
           ${windowStart}, ${windowEnd})
      `;
      inserted++;
    } catch (err) {
      console.error("[snapshot acca] insert error", err);
    }
  }
  return inserted;
}

async function fetchFinishedMatches(daysBack: number = 7): Promise<FdMatchScore[]> {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) return [];

  const today = new Date();
  const past = new Date();
  past.setDate(today.getDate() - daysBack);
  const dateFrom = past.toISOString().slice(0, 10);
  const dateTo = today.toISOString().slice(0, 10);

  try {
    const res = await fetch(
      `${FOOTBALL_DATA_API}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}&status=FINISHED`,
      { headers: { "X-Auth-Token": token }, cache: "no-store" },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.matches as FdMatchScore[]) ?? [];
  } catch (err) {
    console.error("[results] fetch error", err);
    return [];
  }
}

/** Determine if a single prediction hit, given the actual scoreline. */
function evaluatePrediction(
  market: string,
  predictedOutcome: string,
  homeGoals: number,
  awayGoals: number,
): "HIT" | "MISS" {
  const total = homeGoals + awayGoals;
  switch (market) {
    case "1X2":
      if (predictedOutcome === "HOME" && homeGoals > awayGoals) return "HIT";
      if (predictedOutcome === "AWAY" && awayGoals > homeGoals) return "HIT";
      if (predictedOutcome === "DRAW" && homeGoals === awayGoals) return "HIT";
      return "MISS";
    case "OVER_2_5":
      if (predictedOutcome === "OVER" && total >= 3) return "HIT";
      if (predictedOutcome === "UNDER" && total <= 2) return "HIT";
      return "MISS";
    case "BTTS":
      if (predictedOutcome === "YES" && homeGoals >= 1 && awayGoals >= 1) return "HIT";
      if (predictedOutcome === "NO" && (homeGoals === 0 || awayGoals === 0)) return "HIT";
      return "MISS";
    default:
      return "MISS";
  }
}

async function resolveResults(): Promise<{ resolved: number; accasResolved: number }> {
  const sql = db()!;
  const finished = await fetchFinishedMatches(7);

  let resolved = 0;
  for (const fm of finished) {
    const home = fm.score?.fullTime?.home;
    const away = fm.score?.fullTime?.away;
    if (home == null || away == null) continue;

    const pending = await sql`
      SELECT id, market, predicted_outcome
      FROM predictions
      WHERE match_id = ${fm.id} AND result IS NULL
    ` as Array<{ id: number; market: string; predicted_outcome: string }>;

    for (const row of pending) {
      const result = evaluatePrediction(row.market, row.predicted_outcome, home, away);
      await sql`
        UPDATE predictions
        SET result = ${result},
            home_goals = ${home},
            away_goals = ${away},
            resulted_at = NOW()
        WHERE id = ${row.id}
      `;
      resolved++;
    }
  }

  // Now resolve any accas whose entire kickoff window has now passed and
  // whose constituent prediction rows are all resulted.
  const accasPending = await sql`
    SELECT id, leg_match_ids, leg_markets
    FROM accumulators
    WHERE result IS NULL AND kickoff_window_end < NOW() - INTERVAL '2 hours'
  ` as Array<{ id: number; leg_match_ids: number[]; leg_markets: string[] }>;

  let accasResolved = 0;
  for (const acca of accasPending) {
    // Look up each leg's stored result. If any leg is unresulted, skip this acca for now.
    let allResulted = true;
    let hits = 0;
    for (let i = 0; i < acca.leg_match_ids.length; i++) {
      const matchId = acca.leg_match_ids[i];
      const marketKey = acca.leg_markets[i];
      // Map our acca marketKey ('1', 'X', '2', 'BTTS_YES', etc.) onto the
      // (market, predicted_outcome) the predictions table stores.
      const lookup = mapMarketKeyToStored(marketKey);
      if (!lookup) { allResulted = false; break; }
      const r = await sql`
        SELECT result FROM predictions
        WHERE match_id = ${matchId} AND market = ${lookup.market} AND predicted_outcome = ${lookup.outcome}
        LIMIT 1
      ` as Array<{ result: string | null }>;
      if (r.length === 0 || r[0].result == null) { allResulted = false; break; }
      if (r[0].result === "HIT") hits++;
    }
    if (!allResulted) continue;
    const result = hits === acca.leg_match_ids.length ? "HIT" : "MISS";
    await sql`
      UPDATE accumulators
      SET result = ${result}, legs_hit = ${hits}, resulted_at = NOW()
      WHERE id = ${acca.id}
    `;
    accasResolved++;
  }

  return { resolved, accasResolved };
}

/** Acca leg marketKey -> predictions table (market, outcome) tuple. */
function mapMarketKeyToStored(marketKey: string): { market: string; outcome: string } | null {
  switch (marketKey) {
    case "1": return { market: "1X2", outcome: "HOME" };
    case "X": return { market: "1X2", outcome: "DRAW" };
    case "2": return { market: "1X2", outcome: "AWAY" };
    case "OVER_2_5":  return { market: "OVER_2_5", outcome: "OVER" };
    case "UNDER_2_5": return { market: "OVER_2_5", outcome: "UNDER" };
    case "BTTS_YES":  return { market: "BTTS", outcome: "YES" };
    case "BTTS_NO":   return { market: "BTTS", outcome: "NO" };
    default: return null;
  }
}

export async function GET(req: NextRequest) {
  if (!authorised(req)) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }

  const sql = db();
  if (!sql) {
    return NextResponse.json({
      ok: false,
      error: "DATABASE_URL not set, backtesting disabled",
    }, { status: 503 });
  }

  await ensureSchema();

  const matches = await getUpcomingMatches(2);
  const predictions = await Promise.all(
    matches.map(async m => predictMatch(m)),
  );

  const inserted = await snapshotPredictions(matches, predictions);
  const accasInserted = await snapshotAccumulators(predictions);
  const { resolved, accasResolved } = await resolveResults();

  return NextResponse.json({
    ok: true,
    snapshotted: inserted,
    accasSnapshotted: accasInserted,
    resultsResolved: resolved,
    accasResolved,
    timestamp: new Date().toISOString(),
  });
}
