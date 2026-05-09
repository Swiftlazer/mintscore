/**
 * The-Odds-API client (free tier: 500 requests/month).
 *
 * Get a free key at https://the-odds-api.com — set ODDS_API_KEY in
 * .env.local. We pull H2H (1X2) odds, take the median across multiple
 * bookmakers as our market estimate, and let the prediction engine
 * compute edge.
 *
 * If no key is set we return null and the app still works — the
 * prediction stays visible, only the value-bet flag is suppressed.
 */

import type { MarketOdds } from "./types";

const BASE = "https://api.the-odds-api.com/v4";

interface OaOutcome { name: string; price: number; }
interface OaBookmaker {
  key: string;
  title: string;
  markets: Array<{ key: string; outcomes: OaOutcome[] }>;
}
interface OaEvent {
  id: string;
  sport_key: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  bookmakers: OaBookmaker[];
}

const SPORT_BY_COMP: Record<string, string> = {
  PL: "soccer_epl",
  PD: "soccer_spain_la_liga",
  BL1: "soccer_germany_bundesliga",
  SA: "soccer_italy_serie_a",
  FL1: "soccer_france_ligue_one",
  CL: "soccer_uefa_champs_league",
  EC: "soccer_uefa_european_championship",
  WC: "soccer_fifa_world_cup",
  DED: "soccer_netherlands_eredivisie",
  PPL: "soccer_portugal_primeira_liga",
  ELC: "soccer_efl_champ",
  BSA: "soccer_brazil_campeonato",
};

function median(values: number[]): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/** Fuzzy-match home/away to event names since APIs don't share IDs. */
function matchesEvent(event: OaEvent, home: string, away: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/\b(fc|cf|afc|sc|ac|club)\b/g, "").replace(/[^a-z]/g, "");
  return (
    norm(event.home_team).includes(norm(home).slice(0, 6)) &&
    norm(event.away_team).includes(norm(away).slice(0, 6))
  );
}

export async function getMarketOdds(
  competitionCode: string,
  homeTeamName: string,
  awayTeamName: string,
): Promise<MarketOdds | null> {
  const key = process.env.ODDS_API_KEY;
  const sport = SPORT_BY_COMP[competitionCode];
  if (!key || !sport) return null;

  try {
    const url = `${BASE}/sports/${sport}/odds?regions=uk,eu&markets=h2h&oddsFormat=decimal&apiKey=${key}`;
    const res = await fetch(url, { next: { revalidate: 600 } });
    if (!res.ok) return null;
    const events = (await res.json()) as OaEvent[];
    const event = events.find(e => matchesEvent(e, homeTeamName, awayTeamName));
    if (!event) return null;

    const homeOdds: number[] = [];
    const drawOdds: number[] = [];
    const awayOdds: number[] = [];
    for (const bm of event.bookmakers) {
      const h2h = bm.markets.find(m => m.key === "h2h");
      if (!h2h) continue;
      for (const o of h2h.outcomes) {
        if (o.name === event.home_team) homeOdds.push(o.price);
        else if (o.name === event.away_team) awayOdds.push(o.price);
        else if (o.name === "Draw") drawOdds.push(o.price);
      }
    }
    if (homeOdds.length === 0) return null;
    return {
      home: median(homeOdds),
      draw: median(drawOdds),
      away: median(awayOdds),
      bookmaker: `${event.bookmakers.length} books (median)`,
    };
  } catch (err) {
    console.error("[odds-api] error", err);
    return null;
  }
}
