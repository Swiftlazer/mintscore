/**
 * Livescore feed.
 *
 * Fetches today's matches across every league this site covers, normalised
 * for the sidebar. Uses Football-Data.org's /matches endpoint with a
 * dateFrom=dateTo=today filter, which returns one payload covering every
 * league we care about — cheaper than one call per league.
 *
 * Returns a single LiveScoreFeed with three buckets:
 *   - live:     matches currently in play
 *   - upcoming: scheduled matches kicking off later today
 *   - finished: matches that finished today
 *
 * Without FOOTBALL_DATA_TOKEN set the function returns an empty feed —
 * the sidebar gracefully renders an offline state.
 */

const BASE = "https://api.football-data.org/v4";

/** Leagues the rest of the site already supports — keep in lockstep. */
const SUPPORTED_FREE = [
  "PL", "BL1", "SA", "PD", "FL1",
  "CL", "EC", "WC", "DED", "PPL",
  "ELC", "BSA",
];

export type LiveScoreStatus =
  | "SCHEDULED"
  | "TIMED"
  | "IN_PLAY"
  | "PAUSED"
  | "FINISHED"
  | "POSTPONED"
  | "SUSPENDED"
  | "CANCELLED";

export interface LiveScoreMatch {
  id: number;
  competitionCode: string;
  competitionName: string;
  utcDate: string;
  status: LiveScoreStatus;
  /** Live minute string from the API, e.g. "67'", "HT", "FT". Optional. */
  minute?: string | null;
  home: { name: string; shortName: string; score: number | null };
  away: { name: string; shortName: string; score: number | null };
}

export interface LiveScoreFeed {
  fetchedAt: string;       // ISO timestamp
  live: LiveScoreMatch[];
  upcoming: LiveScoreMatch[];
  finished: LiveScoreMatch[];
  error?: string;          // populated when the upstream call failed
}

interface FdApiMatch {
  id: number;
  utcDate: string;
  status: LiveScoreStatus;
  minute?: string | null;
  competition: { code: string; name: string };
  homeTeam: { name: string; shortName?: string; tla?: string };
  awayTeam: { name: string; shortName?: string; tla?: string };
  score: {
    fullTime?: { home: number | null; away: number | null };
    halfTime?: { home: number | null; away: number | null };
  };
}

function mapMatch(m: FdApiMatch): LiveScoreMatch {
  const homeScore = m.score?.fullTime?.home ?? m.score?.halfTime?.home ?? null;
  const awayScore = m.score?.fullTime?.away ?? m.score?.halfTime?.away ?? null;
  return {
    id: m.id,
    competitionCode: m.competition.code,
    competitionName: m.competition.name,
    utcDate: m.utcDate,
    status: m.status,
    minute: m.minute ?? null,
    home: {
      name: m.homeTeam.name,
      shortName: m.homeTeam.shortName ?? m.homeTeam.tla ?? m.homeTeam.name,
      score: homeScore,
    },
    away: {
      name: m.awayTeam.name,
      shortName: m.awayTeam.shortName ?? m.awayTeam.tla ?? m.awayTeam.name,
      score: awayScore,
    },
  };
}

const LIVE_STATUSES: LiveScoreStatus[] = ["IN_PLAY", "PAUSED"];
const FINISHED_STATUSES: LiveScoreStatus[] = ["FINISHED"];
const UPCOMING_STATUSES: LiveScoreStatus[] = ["SCHEDULED", "TIMED"];

function emptyFeed(error?: string): LiveScoreFeed {
  return { fetchedAt: new Date().toISOString(), live: [], upcoming: [], finished: [], error };
}

/**
 * Fetch and bucket today's matches.
 *
 * @param revalidateSeconds Cache hint for Next data cache. Defaults to 60s
 * which is the right grain for "live" but easy on the rate limit (10/min).
 */
export async function getLiveScores(revalidateSeconds: number = 60): Promise<LiveScoreFeed> {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) return emptyFeed("FOOTBALL_DATA_TOKEN not configured");

  const today = new Date().toISOString().slice(0, 10);
  const url = `${BASE}/matches?dateFrom=${today}&dateTo=${today}`;

  try {
    const res = await fetch(url, {
      headers: { "X-Auth-Token": token },
      next: { revalidate: revalidateSeconds, tags: ["livescore"] },
    });
    if (!res.ok) {
      console.error(`[livescore] ${url} -> ${res.status}`);
      return emptyFeed(`upstream HTTP ${res.status}`);
    }
    const data = (await res.json()) as { matches: FdApiMatch[] };
    const all = (data.matches ?? [])
      .filter(m => SUPPORTED_FREE.includes(m.competition.code))
      .map(mapMatch);

    return {
      fetchedAt: new Date().toISOString(),
      live: all.filter(m => LIVE_STATUSES.includes(m.status))
              .sort((a, b) => a.utcDate.localeCompare(b.utcDate)),
      upcoming: all.filter(m => UPCOMING_STATUSES.includes(m.status))
              .sort((a, b) => a.utcDate.localeCompare(b.utcDate)),
      finished: all.filter(m => FINISHED_STATUSES.includes(m.status))
              .sort((a, b) => b.utcDate.localeCompare(a.utcDate)), // most recent first
    };
  } catch (err) {
    console.error("[livescore] fetch error", err);
    return emptyFeed(err instanceof Error ? err.message : "fetch error");
  }
}
