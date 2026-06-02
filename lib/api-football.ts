/**
 * API-Football (api-sports.io) client — used as a secondary data source
 * for international friendlies, which aren't returned by Football-Data.org's
 * free tier.
 *
 * Free plan: 100 requests/day. We cache aggressively to stay well within
 * that envelope:
 *   - Live + today's fixtures: 15min  → up to ~96 calls/day at constant traffic
 *   - Recent results:          6h     → up to 4 calls/day
 *   - Upcoming:                6h     → up to 4 calls/day
 *
 * Set API_FOOTBALL_KEY in your Vercel env vars to activate. Without it,
 * every function in this module returns an empty array — the rest of the
 * site keeps working with FD data only.
 */

import type { LiveScoreMatch, LiveScoreStatus } from "./livescore";

const BASE = "https://v3.football.api-sports.io";

/** API-Football league IDs we treat as "friendlies". Default is just
 *  international friendlies (league 10). FIFA Series matches typically
 *  appear under this league with `round: "FIFA Series"` set. */
const FRIENDLY_LEAGUE_IDS = [10] as const;

/** Single competition code we expose to the rest of the site for any
 *  API-Football friendly. The sidebar's COMP_BADGE map shows this as
 *  "Friendly". */
export const FRIENDLY_COMPETITION_CODE = "FRIENDLY";

interface AFFixture {
  fixture: {
    id: number;
    date: string;
    status: { long: string; short: string; elapsed: number | null };
  };
  league: { id: number; name: string; country: string; season: number; round: string };
  teams: {
    home: { id: number; name: string };
    away: { id: number; name: string };
  };
  goals: { home: number | null; away: number | null };
  score?: {
    halftime?: { home: number | null; away: number | null };
    fulltime?: { home: number | null; away: number | null };
  };
}

interface AFResponse {
  errors: unknown;
  results: number;
  response: AFFixture[];
}

/* ─── Status / minute mapping ────────────────────────────────────────── */

/**
 * Map API-Football's short status codes onto our internal LiveScoreStatus.
 * API-Football codes documented at
 * https://www.api-football.com/documentation-v3#section/Authentication/Fixtures
 */
function mapStatus(short: string): LiveScoreStatus {
  switch (short) {
    case "NS":            // Not Started
    case "TBD":           // To Be Determined
      return "SCHEDULED";
    case "1H":            // First Half
    case "2H":            // Second Half
    case "ET":            // Extra Time
    case "BT":            // Break Time (between regulation and ET)
    case "P":             // Penalty in progress
    case "LIVE":          // Generic live
      return "IN_PLAY";
    case "HT":            // Half Time
      return "PAUSED";
    case "FT":            // Full Time
    case "AET":           // After Extra Time
    case "PEN":           // After Penalties
    case "AWD":           // Awarded
    case "WO":            // Walkover
      return "FINISHED";
    case "PST":           // Postponed
      return "POSTPONED";
    case "CANC":          // Cancelled
      return "CANCELLED";
    case "ABD":           // Abandoned
    case "SUSP":          // Suspended
      return "SUSPENDED";
    default:
      return "SCHEDULED";
  }
}

/** Convert API-Football's minute representation to our string format. */
function mapMinute(short: string, elapsed: number | null): string | null {
  if (short === "HT") return "HT";
  if (short === "FT") return "FT";
  if (short === "AET") return "AET";
  if (short === "PEN") return "PEN";
  if (elapsed == null) return null;
  return String(elapsed);
}

/** Short-name heuristic for national teams. Most names are short enough
 *  already; just trim "FC"/"AFC" prefixes etc. that don't apply here. */
function shortenTeamName(name: string): string {
  return name.replace(/\s+\(.*?\)\s*$/, "").trim();
}

function toLiveScoreMatch(f: AFFixture): LiveScoreMatch {
  return {
    id: f.fixture.id,
    competitionCode: FRIENDLY_COMPETITION_CODE,
    competitionName: f.league.round
      ? `${f.league.name} · ${f.league.round}`
      : f.league.name,
    utcDate: f.fixture.date,
    status: mapStatus(f.fixture.status.short),
    minute: mapMinute(f.fixture.status.short, f.fixture.status.elapsed),
    home: {
      name: f.teams.home.name,
      shortName: shortenTeamName(f.teams.home.name),
      score: f.score?.fulltime?.home ?? f.goals.home ?? null,
    },
    away: {
      name: f.teams.away.name,
      shortName: shortenTeamName(f.teams.away.name),
      score: f.score?.fulltime?.away ?? f.goals.away ?? null,
    },
  };
}

/* ─── Fetch core ─────────────────────────────────────────────────────── */

async function afFetch(path: string, revalidateSeconds: number): Promise<AFFixture[]> {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) return [];

  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { "x-apisports-key": key },
      next: { revalidate: revalidateSeconds, tags: ["api-football"] },
    });
    if (!res.ok) {
      console.error(`[api-football] ${path} -> ${res.status}`);
      return [];
    }
    const data = (await res.json()) as AFResponse;
    // API-Football returns 200 with `errors` populated when the request was
    // technically valid but failed (rate limit, auth, season window). Treat
    // as soft-failure so the rest of the site keeps rendering.
    if (Array.isArray(data.errors) ? data.errors.length > 0 : Object.keys(data.errors ?? {}).length > 0) {
      console.error("[api-football] errors in payload:", data.errors);
      return [];
    }
    return data.response ?? [];
  } catch (err) {
    console.error("[api-football] fetch error", err);
    return [];
  }
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Fetch international friendlies for a date range across the current and
 * adjacent seasons. API-Football's `season` parameter expects a year; we
 * query the current calendar year and let date filtering do the rest.
 */
async function fetchFriendliesByDateRange(
  dateFrom: string,
  dateTo: string,
  revalidateSeconds: number,
): Promise<LiveScoreMatch[]> {
  const season = new Date().getUTCFullYear();
  const calls = FRIENDLY_LEAGUE_IDS.map(leagueId =>
    afFetch(
      `/fixtures?league=${leagueId}&season=${season}&from=${dateFrom}&to=${dateTo}`,
      revalidateSeconds,
    ),
  );
  const results = await Promise.all(calls);
  const flat = results.flat();
  return flat.map(toLiveScoreMatch);
}

/* ─── Public surface — match the shape of lib/livescore helpers ──────── */

/** Live + today's friendlies, bucketable into live/upcoming/finished by
 *  the caller. Uses a 15-minute cache so we stay inside the 100/day cap. */
export async function getFriendliesAroundNow(): Promise<LiveScoreMatch[]> {
  const now = new Date();
  const yesterday = new Date(now); yesterday.setUTCDate(now.getUTCDate() - 1);
  const tomorrow  = new Date(now); tomorrow.setUTCDate(now.getUTCDate() + 1);
  return fetchFriendliesByDateRange(isoDate(yesterday), isoDate(tomorrow), 900);
}

/** Finished friendlies in the last N days (caller filters by date later). */
export async function getRecentFriendlies(days: number = 7): Promise<LiveScoreMatch[]> {
  const lookback = Math.min(Math.max(Math.trunc(days), 1), 10);
  const now = new Date();
  const yesterday = new Date(now); yesterday.setUTCDate(now.getUTCDate() - 1);
  const start = new Date(now);     start.setUTCDate(now.getUTCDate() - lookback);
  const matches = await fetchFriendliesByDateRange(isoDate(start), isoDate(yesterday), 6 * 3600);
  return matches.filter(m => m.status === "FINISHED");
}
