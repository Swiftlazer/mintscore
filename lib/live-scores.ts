import type { Match } from "./types";

const BASE = "https://api.football-data.org/v4";
const SUPPORTED_LEAGUES = ["PL", "BL1", "SA", "PD", "FL1", "DED", "PPL", "ELC", "BSA", "CL", "EC"];

interface FdMatch {
  id: number;
  utcDate: string;
  status: string;
  competition: { code: string; name: string };
  homeTeam: { id: number; name: string; shortName?: string; tla?: string };
  awayTeam: { id: number; name: string; shortName?: string; tla?: string };
  score?: { fullTime?: { home: number | null; away: number | null } };
}

function mapMatch(m: FdMatch): Match {
  return {
    id: m.id,
    competition: m.competition.name,
    competitionCode: m.competition.code,
    utcDate: m.utcDate,
    status: (m.status as Match["status"]) ?? "SCHEDULED",
    home: {
      id: m.homeTeam.id,
      name: m.homeTeam.name,
      shortName: m.homeTeam.shortName ?? m.homeTeam.tla ?? m.homeTeam.name,
    },
    away: {
      id: m.awayTeam.id,
      name: m.awayTeam.name,
      shortName: m.awayTeam.shortName ?? m.awayTeam.tla ?? m.awayTeam.name,
    },
    score: m.score?.fullTime,
  };
}

async function fdFetch<T>(path: string): Promise<T | null> {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { "X-Auth-Token": token },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Get live and recent matches (last 3 days through today). */
export async function getLiveScores(): Promise<Match[]> {
  const today = new Date();
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(today.getDate() - 3);

  const dateFrom = threeDaysAgo.toISOString().slice(0, 10);
  const dateTo = today.toISOString().slice(0, 10);

  const data = await fdFetch<{ matches: FdMatch[] }>(
    `/matches?dateFrom=${dateFrom}&dateTo=${dateTo}&status=IN_PLAY,FINISHED,SCHEDULED`,
  );

  if (!data?.matches) return [];

  return data.matches
    .map(mapMatch)
    .filter(m => SUPPORTED_LEAGUES.includes(m.competitionCode))
    .sort((a, b) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime());
}
