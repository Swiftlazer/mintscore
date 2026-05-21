/**
 * Standings (league tables) feed.
 *
 * Football-Data.org exposes /competitions/{code}/standings, returning the
 * league table for a single competition. The free tier allows 10 calls
 * per minute, so we fetch lazily — one call per league per visit, served
 * from a 1-hour cache. Standings refresh at most a couple of times a day
 * so 1h is fresh enough without burning quota.
 *
 * Cup competitions (UCL, Euros, World Cup) return a different shape with
 * groups + knockouts; this helper exposes only "TOTAL" standings, which
 * works for league competitions and league-phase cup competitions. Pure
 * knockout-stage queries return an empty table — the UI handles that.
 */

const BASE = "https://api.football-data.org/v4";

/** Leagues for which a league-table view makes sense. Order matches the
 *  picker dropdown in the sidebar. */
export const STANDINGS_LEAGUES: Array<{ code: string; label: string }> = [
  { code: "PL",  label: "Premier League" },
  { code: "ELC", label: "Championship" },
  { code: "PD",  label: "La Liga" },
  { code: "BL1", label: "Bundesliga" },
  { code: "SA",  label: "Serie A" },
  { code: "FL1", label: "Ligue 1" },
  { code: "DED", label: "Eredivisie" },
  { code: "PPL", label: "Primeira Liga" },
  { code: "BSA", label: "Brasileirão" },
  { code: "CL",  label: "Champions League" },
];

export interface StandingRow {
  position: number;
  teamId: number;
  teamName: string;
  shortName: string;
  crest?: string | null;
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form?: string | null;  // e.g. "WWDLW" — last 5 games
}

export interface StandingsTable {
  competitionCode: string;
  competitionName: string;
  season?: string;
  fetchedAt: string;
  rows: StandingRow[];
  error?: string;
}

interface FdStandingsResponse {
  competition: { code: string; name: string };
  season?: { startDate?: string; endDate?: string };
  standings: Array<{
    stage: string;
    type: string;   // "TOTAL" | "HOME" | "AWAY"
    group?: string | null;
    table: Array<{
      position: number;
      team: { id: number; name: string; shortName?: string; tla?: string; crest?: string | null };
      playedGames: number;
      won: number;
      draw: number;
      lost: number;
      goalsFor: number;
      goalsAgainst: number;
      goalDifference: number;
      points: number;
      form?: string | null;
    }>;
  }>;
}

function emptyTable(code: string, error: string): StandingsTable {
  return {
    competitionCode: code,
    competitionName: STANDINGS_LEAGUES.find(l => l.code === code)?.label ?? code,
    fetchedAt: new Date().toISOString(),
    rows: [],
    error,
  };
}

function seasonLabel(d?: { startDate?: string; endDate?: string }): string | undefined {
  if (!d?.startDate) return undefined;
  const start = d.startDate.slice(0, 4);
  const end = d.endDate?.slice(0, 4);
  if (!end || start === end) return start;
  return `${start}/${end.slice(-2)}`;
}

/**
 * Fetch the table for one competition. Cached server-side for 1 hour
 * so simultaneous visitors share a single upstream call.
 */
export async function getStandings(code: string, revalidateSeconds: number = 3600): Promise<StandingsTable> {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) return emptyTable(code, "FOOTBALL_DATA_TOKEN not configured");
  if (!STANDINGS_LEAGUES.some(l => l.code === code)) {
    return emptyTable(code, `Unsupported competition: ${code}`);
  }

  const url = `${BASE}/competitions/${code}/standings`;
  try {
    const res = await fetch(url, {
      headers: { "X-Auth-Token": token },
      next: { revalidate: revalidateSeconds, tags: [`standings:${code}`] },
    });
    if (!res.ok) {
      console.error(`[standings] ${url} -> ${res.status}`);
      return emptyTable(code, `upstream HTTP ${res.status}`);
    }
    const data = (await res.json()) as FdStandingsResponse;

    // Most leagues only have one TOTAL table. Cup competitions in the
    // group stage have one TOTAL per group; we concatenate them so the
    // sidebar shows the full picture without needing per-group state.
    const totals = (data.standings ?? []).filter(s => s.type === "TOTAL");
    const rows: StandingRow[] = totals.flatMap(s =>
      s.table.map(r => ({
        position: r.position,
        teamId: r.team.id,
        teamName: r.team.name,
        shortName: r.team.shortName ?? r.team.tla ?? r.team.name,
        crest: r.team.crest ?? null,
        playedGames: r.playedGames,
        won: r.won,
        draw: r.draw,
        lost: r.lost,
        goalsFor: r.goalsFor,
        goalsAgainst: r.goalsAgainst,
        goalDifference: r.goalDifference,
        points: r.points,
        form: r.form ?? null,
      })),
    );

    return {
      competitionCode: data.competition.code,
      competitionName: data.competition.name,
      season: seasonLabel(data.season),
      fetchedAt: new Date().toISOString(),
      rows,
    };
  } catch (err) {
    console.error("[standings] fetch error", err);
    return emptyTable(code, err instanceof Error ? err.message : "fetch error");
  }
}
