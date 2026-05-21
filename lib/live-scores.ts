import type { Match } from "./types";

const SUPPORTED_LEAGUES = ["PL", "BL1", "SA", "PD", "FL1", "DED", "PPL", "ELC", "BSA", "CL", "EC"];

function mapRapidItem(item: any): Match {
  const utc = item?.status?.utcTime ?? new Date(item.timeTS ?? Date.now()).toISOString();
  const home = item.home ?? item.team1 ?? {};
  const away = item.away ?? item.team2 ?? {};
  const scoreHome = typeof home.score === 'number' ? home.score : (item?.status?.scoreStr ? parseInt((item.status.scoreStr.split('-')[0]||'0').trim()) : null);
  const scoreAway = typeof away.score === 'number' ? away.score : (item?.status?.scoreStr ? parseInt((item.status.scoreStr.split('-')[1]||'0').trim()) : null);

  const status = item?.status?.finished ? "FINISHED" : (item?.status?.ongoing || item?.status?.started ? "IN_PLAY" : "SCHEDULED");

  return {
    id: item.id,
    competition: `League ${item.leagueId ?? item.competition ?? 'live'}`,
    competitionCode: String(item.leagueId ?? item.competitionCode ?? 'LIVE'),
    utcDate: utc,
    status: status as Match["status"],
    home: {
      id: home.id ?? 0,
      name: home.name ?? home.longName ?? 'Home',
      shortName: home.name ?? home.longName ?? 'Home',
    },
    away: {
      id: away.id ?? 0,
      name: away.name ?? away.longName ?? 'Away',
      shortName: away.name ?? away.longName ?? 'Away',
    },
    score: { home: scoreHome ?? null, away: scoreAway ?? null },
  };
}

async function fetchRapidLive(): Promise<Match[] | null> {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) return null;
  try {
    const res = await fetch('https://free-api-live-football-data.p.rapidapi.com/football-current-live', {
      method: 'GET',
      headers: {
        'x-rapidapi-key': key,
        'x-rapidapi-host': 'free-api-live-football-data.p.rapidapi.com',
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json();
    const list = json?.response?.live ?? json?.live ?? [];
    if (!Array.isArray(list)) return null;
    const mapped = list.map(mapRapidItem).filter(Boolean);
    return mapped.sort((a, b) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime());
  } catch (err) {
    console.error('[live-scores] rapid fetch error', err);
    return null;
  }
}

// Fallback to football-data.org if RapidAPI not configured
const FD_BASE = "https://api.football-data.org/v4";

async function fdFetch<T>(path: string): Promise<T | null> {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(`${FD_BASE}${path}`, {
      headers: { "X-Auth-Token": token },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (e) {
    console.error('[live-scores] fd fetch error', e);
    return null;
  }
}

function mapFdMatch(m: any): Match {
  return {
    id: m.id,
    competition: m.competition?.name ?? 'Football',
    competitionCode: m.competition?.code ?? 'FD',
    utcDate: m.utcDate,
    status: (m.status as Match["status"]) ?? "SCHEDULED",
    home: {
      id: m.homeTeam?.id ?? 0,
      name: m.homeTeam?.name ?? 'Home',
      shortName: m.homeTeam?.shortName ?? m.homeTeam?.tla ?? m.homeTeam?.name ?? 'Home',
    },
    away: {
      id: m.awayTeam?.id ?? 0,
      name: m.awayTeam?.name ?? 'Away',
      shortName: m.awayTeam?.shortName ?? m.awayTeam?.tla ?? m.awayTeam?.name ?? 'Away',
    },
    score: m.score?.fullTime ?? null,
  };
}

export async function getLiveScores(): Promise<Match[]> {
  // Try RapidAPI first
  const rapid = await fetchRapidLive();
  if (rapid && rapid.length > 0) {
    return rapid;
  }

  // Fallback to football-data.org (last 3 days)
  const today = new Date();
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(today.getDate() - 3);
  const dateFrom = threeDaysAgo.toISOString().slice(0, 10);
  const dateTo = today.toISOString().slice(0, 10);

  const data = await fdFetch<{ matches: any[] }>(
    `/matches?dateFrom=${dateFrom}&dateTo=${dateTo}&status=IN_PLAY,FINISHED,SCHEDULED`,
  );
  if (!data?.matches) return [];
  return data.matches.map(mapFdMatch)
    .filter(m => SUPPORTED_LEAGUES.includes(m.competitionCode) || true)
    .sort((a, b) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime());
}
