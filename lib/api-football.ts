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

/* ─── Rich-detail types (for /matches/af/[id]) ───────────────────────── */

export interface FriendlyMatchDetail {
  id: number;
  utcDate: string;
  status: LiveScoreStatus;
  statusShort: string;
  minute: string | null;
  competitionName: string;
  round: string | null;
  venue: { name: string | null; city: string | null };
  referee: string | null;
  home: { id: number; name: string; logo: string | null; score: number | null };
  away: { id: number; name: string; logo: string | null; score: number | null };
  halftime: { home: number | null; away: number | null } | null;
  events: FriendlyEvent[];
  lineups: FriendlyLineupSide[];
  statistics: FriendlyTeamStatistics[];
}

export interface FriendlyEvent {
  teamId: number;
  teamName: string;
  minute: number;
  extraMinute: number | null;
  type: string;          // Goal, Card, subst, Var
  detail: string;        // Normal Goal, Yellow Card, Substitution 1, etc.
  player: string | null;
  assist: string | null;
  comments: string | null;
}

export interface FriendlyLineupSide {
  teamId: number;
  teamName: string;
  formation: string | null;
  coach: { id: number | null; name: string | null };
  startingXI: Array<{ id: number; name: string; number: number | null; position: string | null; grid: string | null }>;
  substitutes: Array<{ id: number; name: string; number: number | null; position: string | null }>;
}

export interface FriendlyTeamStatistics {
  teamId: number;
  teamName: string;
  stats: Array<{ type: string; value: string | number | null }>;
}

export interface FriendlyPrediction {
  homePct: number;        // 0–1
  drawPct: number;
  awayPct: number;
  advice: string | null;  // Free-text recommendation from API-Football
  winnerName: string | null;
  winnerComment: string | null;
}

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

/* ─── Match detail (single match with everything we get) ─────────────── */

interface AFFixtureDetail extends AFFixture {
  fixture: AFFixture["fixture"] & {
    venue: { id: number | null; name: string | null; city: string | null };
    referee: string | null;
  };
  teams: {
    home: { id: number; name: string; logo: string | null };
    away: { id: number; name: string; logo: string | null };
  };
  events?: Array<{
    time: { elapsed: number; extra: number | null };
    team: { id: number; name: string };
    player: { id: number | null; name: string | null };
    assist: { id: number | null; name: string | null };
    type: string;
    detail: string;
    comments: string | null;
  }>;
  lineups?: Array<{
    team: { id: number; name: string };
    formation: string | null;
    coach: { id: number | null; name: string | null };
    startXI: Array<{ player: { id: number; name: string; number: number | null; pos: string | null; grid: string | null } }>;
    substitutes: Array<{ player: { id: number; name: string; number: number | null; pos: string | null } }>;
  }>;
  statistics?: Array<{
    team: { id: number; name: string };
    statistics: Array<{ type: string; value: string | number | null }>;
  }>;
}

/**
 * Fetch full detail for a single API-Football fixture, including events,
 * lineups, and statistics if available. Cached aggressively (1 hour)
 * because detail data rarely changes after a match finishes and we want
 * to protect our 100/day budget against repeated visits to popular matches.
 */
export async function getFriendlyMatchDetail(id: number): Promise<FriendlyMatchDetail | null> {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) return null;

  try {
    const res = await fetch(`${BASE}/fixtures?id=${id}`, {
      headers: { "x-apisports-key": key },
      next: { revalidate: 3600, tags: [`af-fixture-${id}`] },
    });
    if (!res.ok) {
      console.error(`[api-football detail] ${id} -> ${res.status}`);
      return null;
    }
    const data = (await res.json()) as { response: AFFixtureDetail[]; errors: unknown };
    const fixture = data.response?.[0];
    if (!fixture) return null;

    return {
      id: fixture.fixture.id,
      utcDate: fixture.fixture.date,
      status: mapStatus(fixture.fixture.status.short),
      statusShort: fixture.fixture.status.short,
      minute: mapMinute(fixture.fixture.status.short, fixture.fixture.status.elapsed),
      competitionName: fixture.league.name,
      round: fixture.league.round || null,
      venue: {
        name: fixture.fixture.venue?.name ?? null,
        city: fixture.fixture.venue?.city ?? null,
      },
      referee: fixture.fixture.referee ?? null,
      home: {
        id: fixture.teams.home.id,
        name: fixture.teams.home.name,
        logo: fixture.teams.home.logo ?? null,
        score: fixture.score?.fulltime?.home ?? fixture.goals.home ?? null,
      },
      away: {
        id: fixture.teams.away.id,
        name: fixture.teams.away.name,
        logo: fixture.teams.away.logo ?? null,
        score: fixture.score?.fulltime?.away ?? fixture.goals.away ?? null,
      },
      halftime: fixture.score?.halftime
        ? { home: fixture.score.halftime.home, away: fixture.score.halftime.away }
        : null,
      events: (fixture.events ?? []).map(e => ({
        teamId: e.team.id,
        teamName: e.team.name,
        minute: e.time.elapsed,
        extraMinute: e.time.extra ?? null,
        type: e.type,
        detail: e.detail,
        player: e.player?.name ?? null,
        assist: e.assist?.name ?? null,
        comments: e.comments ?? null,
      })),
      lineups: (fixture.lineups ?? []).map(l => ({
        teamId: l.team.id,
        teamName: l.team.name,
        formation: l.formation ?? null,
        coach: { id: l.coach?.id ?? null, name: l.coach?.name ?? null },
        startingXI: l.startXI.map(s => ({
          id: s.player.id,
          name: s.player.name,
          number: s.player.number ?? null,
          position: s.player.pos ?? null,
          grid: s.player.grid ?? null,
        })),
        substitutes: l.substitutes.map(s => ({
          id: s.player.id,
          name: s.player.name,
          number: s.player.number ?? null,
          position: s.player.pos ?? null,
        })),
      })),
      statistics: (fixture.statistics ?? []).map(s => ({
        teamId: s.team.id,
        teamName: s.team.name,
        stats: s.statistics.map(st => ({ type: st.type, value: st.value })),
      })),
    };
  } catch (err) {
    console.error("[api-football detail] fetch error", err);
    return null;
  }
}

/* ─── Predictions for friendly matches ───────────────────────────────── */

interface AFPredictionResponse {
  response: Array<{
    predictions: {
      winner: { id: number | null; name: string | null; comment: string | null };
      win_or_draw: boolean;
      under_over: string | null;
      goals: { home: string | null; away: string | null };
      advice: string | null;
      percent: { home: string; draw: string; away: string };
    };
    teams: { home: { id: number }; away: { id: number } };
  }>;
  errors: unknown;
}

function parsePct(s: string | undefined): number {
  if (!s) return 0;
  const n = parseFloat(s.replace("%", ""));
  return Number.isFinite(n) ? n / 100 : 0;
}

/**
 * Fetch API-Football's own AI prediction for a fixture. Used for friendly
 * matches since our Poisson model isn't tuned for national-team friendlies.
 * Cached 6 hours per fixture.
 */
export async function getFriendlyPrediction(fixtureId: number): Promise<FriendlyPrediction | null> {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) return null;

  try {
    const res = await fetch(`${BASE}/predictions?fixture=${fixtureId}`, {
      headers: { "x-apisports-key": key },
      next: { revalidate: 6 * 3600, tags: [`af-pred-${fixtureId}`] },
    });
    if (!res.ok) {
      console.error(`[api-football prediction] ${fixtureId} -> ${res.status}`);
      return null;
    }
    const data = (await res.json()) as AFPredictionResponse;
    const pred = data.response?.[0]?.predictions;
    if (!pred) return null;

    return {
      homePct: parsePct(pred.percent.home),
      drawPct: parsePct(pred.percent.draw),
      awayPct: parsePct(pred.percent.away),
      advice: pred.advice ?? null,
      winnerName: pred.winner?.name ?? null,
      winnerComment: pred.winner?.comment ?? null,
    };
  } catch (err) {
    console.error("[api-football prediction] fetch error", err);
    return null;
  }
}
