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
  score?: { fullTime?: { home: number | null; away: number | null } };
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
  // Fallback: bundled demo data, time-shifted so it always looks current.
  return (demoFixtures as Match[]).map(rebaseToToday);
}

export async function getMatchById(id: number): Promise<Match | null> {
  const data = await fdFetch<{ match?: FdMatch } | FdMatch>(`/matches/${id}`);
  if (!data) {
    const demo = (demoFixtures as Match[]).find(m => m.id === id);
    return demo ? rebaseToToday(demo) : null;
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
