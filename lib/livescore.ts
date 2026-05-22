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

/**
 * Football-Data.org's free tier returns all 12 of these competitions
 * by default; paid tiers add more. We deliberately do NOT filter by
 * competition code here — the livescore sidebar shows every league the
 * API surfaces, so upgrading the API plan to add more leagues just
 * works without a code change.
 */

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

export interface RecentResultsFeed {
  fetchedAt: string;
  dateFrom: string;        // YYYY-MM-DD inclusive
  dateTo: string;          // YYYY-MM-DD inclusive
  matches: LiveScoreMatch[]; // all FINISHED, most-recent first
  error?: string;
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
 * Fetch and bucket matches around "now". We query a 3-day UTC window
 * (yesterday → tomorrow) so late kickoffs spanning midnight UTC don't
 * fall off, then bucket into live/upcoming/finished.
 *
 * The upstream status feed is unreliable: it sometimes stays at IN_PLAY
 * for 5–15 minutes after the actual full-time whistle. We defend against
 * that with two checks. First, if the upstream `minute` marker has
 * flipped to a finished token (FT/AET/PEN) AND the match has run past
 * regulation, we know it's done. Second, if a match is supposedly live
 * but kicked off more than HARD_FINISHED_MS ago, no real match could
 * still be running, so we override regardless of upstream signals.
 *
 * Critically, we mutate the match's `status` field in place when we
 * make this correction so the client UI also stops painting the row
 * as live (the row styling reads `match.status`, not the bucket).
 *
 * @param revalidateSeconds Cache hint for Next data cache. Defaults to 30s.
 */
export async function getLiveScores(revalidateSeconds: number = 30): Promise<LiveScoreFeed> {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) return emptyFeed("FOOTBALL_DATA_TOKEN not configured");

  const now = new Date();
  const yesterday = new Date(now); yesterday.setUTCDate(now.getUTCDate() - 1);
  const tomorrow  = new Date(now); tomorrow.setUTCDate(now.getUTCDate() + 1);
  const dateFrom = yesterday.toISOString().slice(0, 10);
  const dateTo   = tomorrow.toISOString().slice(0, 10);
  const url = `${BASE}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`;

  const nowMs = now.getTime();
  const HARD_FINISHED_MS    = 155 * 60 * 1000;   // 2h35m — past any plausible match length
  const REGULATION_DONE_MS  = 100 * 60 * 1000;   // ~regulation done; check minute marker
  const FT_MINUTE_TOKENS = new Set(["FT", "AET", "PEN", "FT_PEN", "AWARDED"]);
  const recentlyFinishedAfter = nowMs - 18 * 60 * 60 * 1000;

  const kickoffMs = (m: LiveScoreMatch) => new Date(m.utcDate).getTime();
  const minuteSaysDone = (m: LiveScoreMatch) =>
    !!m.minute && FT_MINUTE_TOKENS.has(m.minute.trim().toUpperCase());

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
    const all = (data.matches ?? []).map(mapMatch);

    // Correction pass: any match that LOOKS live to the API but failed
    // either of our two reality checks gets its status overwritten to
    // FINISHED. This ensures both the bucketing below AND the client UI
    // treat it as done.
    for (const m of all) {
      if (!LIVE_STATUSES.includes(m.status)) continue;
      const ageMs = nowMs - kickoffMs(m);
      const definitelyDone = ageMs > HARD_FINISHED_MS;
      const likelyDone = ageMs > REGULATION_DONE_MS && minuteSaysDone(m);
      if (definitelyDone || likelyDone) {
        m.status = "FINISHED";
        // Clear the stale minute marker too so the row doesn't show a
        // running clock on what we now consider a finished game.
        m.minute = null;
      }
    }

    return {
      fetchedAt: new Date().toISOString(),
      live: all
        .filter(m => LIVE_STATUSES.includes(m.status))
        .sort((a, b) => a.utcDate.localeCompare(b.utcDate)),
      upcoming: all
        .filter(m => UPCOMING_STATUSES.includes(m.status) && kickoffMs(m) >= nowMs)
        .sort((a, b) => a.utcDate.localeCompare(b.utcDate)),
      finished: all
        .filter(m => FINISHED_STATUSES.includes(m.status) && kickoffMs(m) >= recentlyFinishedAfter)
        .sort((a, b) => b.utcDate.localeCompare(a.utcDate)),
    };
  } catch (err) {
    console.error("[livescore] fetch error", err);
    return emptyFeed(err instanceof Error ? err.message : "fetch error");
  }
}

/* ─── Recent results (last N days, finished only) ────────────────────── */

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function emptyResultsFeed(dateFrom: string, dateTo: string, error?: string): RecentResultsFeed {
  return { fetchedAt: new Date().toISOString(), dateFrom, dateTo, matches: [], error };
}

/**
 * Fetch finished matches from the last N days (yesterday inclusive,
 * today excluded — today's results live in the live-score feed).
 *
 * @param days  Look-back window in days. Defaults to 7 (full week),
 *              capped at 10 to stay inside the free tier's max date range.
 * @param revalidateSeconds Cache TTL. Defaults to 30 min — finished
 *              results don't change retroactively, so a long cache is fine.
 */
export async function getRecentResults(
  days: number = 7,
  revalidateSeconds: number = 1800,
): Promise<RecentResultsFeed> {
  const lookback = Math.min(Math.max(Math.trunc(days), 1), 10);
  const now = new Date();
  const yesterday = new Date(now); yesterday.setUTCDate(now.getUTCDate() - 1);
  const start = new Date(now);     start.setUTCDate(now.getUTCDate() - lookback);
  const dateFrom = isoDate(start);
  const dateTo = isoDate(yesterday);

  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) return emptyResultsFeed(dateFrom, dateTo, "FOOTBALL_DATA_TOKEN not configured");

  const url = `${BASE}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}&status=FINISHED`;
  try {
    const res = await fetch(url, {
      headers: { "X-Auth-Token": token },
      next: { revalidate: revalidateSeconds, tags: ["recent-results"] },
    });
    if (!res.ok) {
      console.error(`[results] ${url} -> ${res.status}`);
      return emptyResultsFeed(dateFrom, dateTo, `upstream HTTP ${res.status}`);
    }
    const data = (await res.json()) as { matches: FdApiMatch[] };
    const matches = (data.matches ?? [])
      .map(mapMatch)
      // Belt-and-braces: some upstream rows occasionally come back without
      // FINISHED status even when the filter asks for it. Drop them.
      .filter(m => m.status === "FINISHED")
      .sort((a, b) => b.utcDate.localeCompare(a.utcDate));

    return { fetchedAt: new Date().toISOString(), dateFrom, dateTo, matches };
  } catch (err) {
    console.error("[results] fetch error", err);
    return emptyResultsFeed(dateFrom, dateTo, err instanceof Error ? err.message : "fetch error");
  }
}
