/**
 * Football-Data.org client (free tier).
 *
 * Free tier covers: PL, BL1, SA, PD, FL1, DED, PPL, ELC, BSA, CL, EC, WC.
 * Limit: 10 requests/minute.
 *
 * Get a free API key at https://www.football-data.org/client/register.
 * Set FOOTBALL_DATA_TOKEN in .env.local. Without a token, fixtures
 * fall back to bundled demo data so the app still runs end-to-end.
 */

import type { Match } from "./types";
import demoFixtures from "@/data/demo-fixtures.json";

const BASE = "https://api.football-data.org/v4";
const SUPPORTED_FREE = ["PL", "BL1", "SA", "PD", "FL1", "CL", "EC", "WC", "DED", "PPL", "ELC", "BSA"];

interface FdMatch {
  id: number;
  utcDate: string;
  status: string;
  matchday?: number;
  competition: { code: string; name: string };
  homeTeam: { id: number; name: string; shortName?: string; tla?: string; crest?: string };
  awayTeam: { id: number; name: string; shortName?: string; tla?: string; crest?: string };
  score?: {
    fullTime?: { home: number | null; away: number | null };
    halfTime?: { home: number | null; away: number | null };
  };
}

function mapMatch(m: FdMatch): Match {
  return {
    id: m.id,
    competition: m.competition.name,
    competitionCode: m.competition.code,
    utcDate: m.utcDate,
    status: (m.status as Match["status"]) ?? "SCHEDULED",
    matchday: m.matchday,
    home: {
      id: m.homeTeam.id,
      name: m.homeTeam.name,
      shortName: m.homeTeam.shortName ?? m.homeTeam.tla ?? m.homeTeam.name,
      crest: m.homeTeam.crest,
    },
    away: {
      id: m.awayTeam.id,
      name: m.awayTeam.name,
      shortName: m.awayTeam.shortName ?? m.awayTeam.tla ?? m.awayTeam.name,
      crest: m.awayTeam.crest,
    },
    score: m.score?.fullTime
      ? { home: m.score.fullTime.home, away: m.score.fullTime.away }
      : undefined,
    halfTime: m.score?.halfTime
      ? { home: m.score.halfTime.home, away: m.score.halfTime.away }
      : undefined,
  };
}

async function fdFetch<T>(path: string, revalidateSeconds: number = 1800): Promise<T | null> {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { "X-Auth-Token": token },
      next: { revalidate: revalidateSeconds },
    });
    if (!res.ok) {
      console.error(`[football-data] ${path} -> ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error("[football-data] fetch error", err);
    return null;
  }
}

/** Get matches in a date window (defaults: today + next 3 days). */
export async function getUpcomingMatches(daysAhead: number = 3): Promise<Match[]> {
  const today = new Date();
  const end = new Date();
  end.setDate(today.getDate() + daysAhead);
  const dateFrom = today.toISOString().slice(0, 10);
  const dateTo = end.toISOString().slice(0, 10);

  const data = await fdFetch<{ matches: FdMatch[] }>(
    `/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`,
  );
  if (data?.matches) {
    return data.matches.map(mapMatch).filter(m => SUPPORTED_FREE.includes(m.competitionCode));
  }
  // Demo fixture fallback — local development ONLY. In production we'd
  // rather show an honest empty state than rebased placeholder matches
  // that look like real upcoming fixtures to visitors.
  if (process.env.NODE_ENV !== "production") {
    return (demoFixtures as Match[]).map(rebaseToToday);
  }
  return [];
}

export async function getMatchById(id: number): Promise<Match | null> {
  const data = await fdFetch<{ match?: FdMatch } | FdMatch>(`/matches/${id}`);
  if (!data) {
    if (process.env.NODE_ENV !== "production") {
      const demo = (demoFixtures as Match[]).find(m => m.id === id);
      return demo ? rebaseToToday(demo) : null;
    }
    return null;
  }
  // The endpoint shape is { match: { ... } } in v4.
  // @ts-ignore -- defensive: handle either shape
  const m = (data as any).match ?? (data as any);
  return mapMatch(m as FdMatch);
}

/** Shift a demo match's date so it always falls in the current 7-day window. */
function rebaseToToday(m: Match): Match {
  const original = new Date(m.utcDate);
  const now = new Date();
  const offsetDays = ((original.getDay() - now.getDay() + 7) % 7) || 0;
  const newDate = new Date(now);
  newDate.setUTCDate(now.getUTCDate() + offsetDays);
  newDate.setUTCHours(original.getUTCHours(), original.getUTCMinutes(), 0, 0);
  return { ...m, utcDate: newDate.toISOString() };
}

/* ─── Competition hub helpers ────────────────────────────────────────── */

import type { CompetitionInfo, Scorer } from "./types";

interface FdCompetition {
  code: string;
  name: string;
  area?: { name: string; flag?: string | null };
  currentSeason?: { startDate?: string; endDate?: string; currentMatchday?: number | null };
  lastUpdated?: string;
}

interface FdScorerRow {
  player: { id: number; name: string; nationality?: string };
  team: { id: number; name: string; shortName?: string };
  goals?: number;
  assists?: number | null;
  penalties?: number | null;
  playedMatches?: number | null;
}

/** Competition metadata: current season window, current matchday, etc. */
export async function getCompetition(code: string): Promise<CompetitionInfo | null> {
  const data = await fdFetch<FdCompetition>(`/competitions/${code}`, 6 * 3600);
  if (!data) return null;
  return {
    code: data.code,
    name: data.name,
    area: data.area,
    currentSeason: data.currentSeason,
    lastUpdated: data.lastUpdated,
  };
}

/** Top scorers for a competition (free tier). */
export async function getTopScorers(code: string, limit: number = 15): Promise<Scorer[]> {
  const data = await fdFetch<{ scorers: FdScorerRow[] }>(
    `/competitions/${code}/scorers?limit=${limit}`,
    3 * 3600,
  );
  if (!data?.scorers) return [];
  return data.scorers
    .filter(s => typeof s.goals === "number")
    .map(s => ({
      player: { id: s.player.id, name: s.player.name, nationality: s.player.nationality },
      team: { id: s.team.id, name: s.team.name, shortName: s.team.shortName },
      goals: s.goals ?? 0,
      assists: s.assists ?? null,
      penalties: s.penalties ?? null,
      playedMatches: s.playedMatches ?? null,
    }));
}

/** All matches for a competition, optionally filtered to one matchday or status. */
export async function getCompetitionMatches(
  code: string,
  opts: { matchday?: number; status?: "FINISHED" | "SCHEDULED" | "LIVE"; limit?: number } = {},
): Promise<Match[]> {
  const params = new URLSearchParams();
  if (opts.matchday) params.set("matchday", String(opts.matchday));
  if (opts.status) params.set("status", opts.status);
  const qs = params.toString();
  const data = await fdFetch<{ matches: FdMatch[] }>(
    `/competitions/${code}/matches${qs ? `?${qs}` : ""}`,
    900,
  );
  if (!data?.matches) return [];
  let matches = data.matches.map(mapMatch);
  if (opts.limit) matches = matches.slice(0, opts.limit);
  return matches;
}

/** Recent finished + next scheduled matches for a competition, packaged
 *  for the hub view. One upstream call (the full season) sliced two ways. */
export async function getCompetitionTimeline(
  code: string,
  recentLimit: number = 6,
  upcomingLimit: number = 6,
): Promise<{ recent: Match[]; upcoming: Match[]; rounds: number[] }> {
  const all = await getCompetitionMatches(code);
  if (all.length === 0) return { recent: [], upcoming: [], rounds: [] };

  const now = Date.now();
  const recent = all
    .filter(m => m.status === "FINISHED")
    .sort((a, b) => b.utcDate.localeCompare(a.utcDate))
    .slice(0, recentLimit);
  const upcoming = all
    .filter(m => m.status !== "FINISHED" && new Date(m.utcDate).getTime() >= now - 6 * 3600 * 1000)
    .sort((a, b) => a.utcDate.localeCompare(b.utcDate))
    .slice(0, upcomingLimit);
  const rounds = Array.from(new Set(all.map(m => m.matchday).filter((n): n is number => typeof n === "number")))
    .sort((a, b) => a - b);
  return { recent, upcoming, rounds };
}

/** Last N finished matches for a team across all competitions. Useful
 *  for showing recent form on the match detail page. */
export async function getRecentTeamMatches(teamId: number, limit: number = 5): Promise<Match[]> {
  const data = await fdFetch<{ matches: FdMatch[] }>(
    `/teams/${teamId}/matches?status=FINISHED&limit=${limit}`,
    3 * 3600,
  );
  if (!data?.matches) return [];
  return data.matches.map(mapMatch)
    .sort((a, b) => b.utcDate.localeCompare(a.utcDate))
    .slice(0, limit);
}

/** Last N meetings between two teams, regardless of competition. */
export async function getHeadToHead(matchId: number, limit: number = 6): Promise<Match[]> {
  // Football-Data.org has a dedicated H2H endpoint keyed off a match id.
  const data = await fdFetch<{ matches: FdMatch[] }>(`/matches/${matchId}/head2head?limit=${limit}`, 6 * 3600);
  if (!data?.matches) return [];
  return data.matches.map(mapMatch).filter(m => m.status === "FINISHED");
}
