/**
 * sync-team-stats.ts
 *
 * Rebuilds data/team-stats.json with attack/defence ratings computed from
 * the most recent league results.
 *
 * Sources, in priority order per league:
 *   1. Football-Data.co.uk free CSVs — best historical coverage, no auth.
 *      Tries current season first; falls back to previous season if the
 *      current one hasn't accumulated enough matches yet.
 *   2. Football-Data.org API — used for leagues without a co.uk CSV
 *      (Brasileirão, Champions League). Requires FOOTBALL_DATA_TOKEN.
 *
 * Behaviour:
 *   - Merge-preserving: an existing team-stats.json is read first, and
 *     leagues we can't refresh are kept rather than wiped.
 *   - Per-league error isolation: one league failing does not abort the run.
 *   - Minimum sample size: a league must have >= MIN_LEAGUE_MATCHES to be
 *     refreshed. If the current season is too thin, the script tries the
 *     previous season for that league. If that also fails, the existing
 *     entry is preserved.
 *
 * Run:
 *   npm run sync:stats
 */

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { LeagueStats, TeamStrength } from "../lib/types";

const MIN_LEAGUE_MATCHES = 50;

/* ──────────────────────────────────────────────────────────────────────
   Season utilities
   ────────────────────────────────────────────────────────────────────── */

function seasonCode(date: Date): string {
  const y = date.getFullYear();
  const m = date.getMonth();
  const startYear = m >= 6 ? y : y - 1;
  const endYear = startYear + 1;
  return `${String(startYear).slice(2)}${String(endYear).slice(2)}`;
}

const NOW = new Date();
const CURRENT = seasonCode(NOW);
const PREVIOUS = seasonCode(new Date(NOW.getFullYear() - 1, NOW.getMonth(), 1));

/* ──────────────────────────────────────────────────────────────────────
   Source 1: football-data.co.uk free CSVs
   ────────────────────────────────────────────────────────────────────── */

interface CoUkSource {
  competitionCode: string;
  csvCode: string;
  name: string;
}

const CO_UK_SOURCES: CoUkSource[] = [
  { competitionCode: "PL",  csvCode: "E0",  name: "Premier League" },
  { competitionCode: "ELC", csvCode: "E1",  name: "Championship" },
  { competitionCode: "PD",  csvCode: "SP1", name: "La Liga" },
  { competitionCode: "BL1", csvCode: "D1",  name: "Bundesliga" },
  { competitionCode: "SA",  csvCode: "I1",  name: "Serie A" },
  { competitionCode: "FL1", csvCode: "F1",  name: "Ligue 1" },
  { competitionCode: "DED", csvCode: "N1",  name: "Eredivisie" },
  { competitionCode: "PPL", csvCode: "P1",  name: "Primeira Liga" },
];

const NAME_MAP: Record<string, string> = {
  // Premier League
  "Man City": "Manchester City FC", "Man United": "Manchester United FC",
  "Newcastle": "Newcastle United FC", "Tottenham": "Tottenham Hotspur FC",
  "Wolves": "Wolverhampton Wanderers FC", "Brighton": "Brighton & Hove Albion FC",
  "Nott'm Forest": "Nottingham Forest FC", "Bournemouth": "AFC Bournemouth",
  "Leicester": "Leicester City FC", "Ipswich": "Ipswich Town FC",
  "West Ham": "West Ham United FC", "Crystal Palace": "Crystal Palace FC",
  "Brentford": "Brentford FC", "Fulham": "Fulham FC", "Aston Villa": "Aston Villa FC",
  "Arsenal": "Arsenal FC", "Liverpool": "Liverpool FC", "Chelsea": "Chelsea FC",
  "Everton": "Everton FC", "Southampton": "Southampton FC", "Leeds": "Leeds United FC",
  "Sunderland": "Sunderland AFC", "Burnley": "Burnley FC",
  // Championship
  "Sheffield United": "Sheffield United FC", "Sheffield Weds": "Sheffield Wednesday FC",
  "QPR": "Queens Park Rangers FC", "Coventry": "Coventry City FC", "Norwich": "Norwich City FC",
  "Hull": "Hull City AFC", "Cardiff": "Cardiff City FC", "Middlesbrough": "Middlesbrough FC",
  "Stoke": "Stoke City FC", "Bristol City": "Bristol City FC", "Swansea": "Swansea City AFC",
  "Watford": "Watford FC", "Preston": "Preston North End FC", "Plymouth": "Plymouth Argyle FC",
  "Derby": "Derby County FC", "Birmingham": "Birmingham City FC",
  "West Brom": "West Bromwich Albion FC", "Millwall": "Millwall FC", "Wrexham": "Wrexham AFC",
  "Blackburn": "Blackburn Rovers FC", "Portsmouth": "Portsmouth FC",
  "Charlton": "Charlton Athletic FC", "Oxford": "Oxford United FC",
  // La Liga
  "Real Madrid": "Real Madrid CF", "Barcelona": "FC Barcelona",
  "Ath Madrid": "Club Atlético de Madrid", "Ath Bilbao": "Athletic Club",
  "Sociedad": "Real Sociedad de Fútbol", "Villarreal": "Villarreal CF",
  "Betis": "Real Betis Balompié", "Sevilla": "Sevilla FC", "Valencia": "Valencia CF",
  "Getafe": "Getafe CF", "Mallorca": "RCD Mallorca", "Celta": "RC Celta de Vigo",
  "Girona": "Girona FC", "Espanol": "RCD Espanyol de Barcelona", "Osasuna": "CA Osasuna",
  "Vallecano": "Rayo Vallecano de Madrid", "Alaves": "Deportivo Alavés", "Elche": "Elche CF",
  "Levante": "Levante UD", "Oviedo": "Real Oviedo", "Las Palmas": "UD Las Palmas",
  "Leganes": "CD Leganés", "Valladolid": "Real Valladolid CF",
  // Bundesliga
  "Bayern Munich": "FC Bayern München", "Leverkusen": "Bayer 04 Leverkusen",
  "Dortmund": "Borussia Dortmund", "RB Leipzig": "RB Leipzig",
  "Ein Frankfurt": "Eintracht Frankfurt", "Stuttgart": "VfB Stuttgart",
  "Hoffenheim": "TSG 1899 Hoffenheim", "M'gladbach": "Borussia Mönchengladbach",
  "Wolfsburg": "VfL Wolfsburg", "Werder Bremen": "SV Werder Bremen",
  "Mainz": "1. FSV Mainz 05", "Freiburg": "Sport-Club Freiburg",
  "Union Berlin": "1. FC Union Berlin", "FC Koln": "1. FC Köln", "Augsburg": "FC Augsburg",
  "St Pauli": "FC St. Pauli 1910", "Hamburg": "Hamburger SV",
  "Heidenheim": "1. FC Heidenheim 1846", "Bochum": "VfL Bochum 1848",
  "Holstein Kiel": "Holstein Kiel",
  // Serie A
  "Inter": "FC Internazionale Milano", "Milan": "AC Milan", "Juventus": "Juventus FC",
  "Napoli": "SSC Napoli", "Atalanta": "Atalanta BC", "Roma": "AS Roma", "Lazio": "SS Lazio",
  "Fiorentina": "ACF Fiorentina", "Bologna": "Bologna FC 1909", "Torino": "Torino FC",
  "Genoa": "Genoa CFC", "Lecce": "US Lecce", "Cagliari": "Cagliari Calcio",
  "Empoli": "Empoli FC", "Sassuolo": "US Sassuolo Calcio", "Udinese": "Udinese Calcio",
  "Verona": "Hellas Verona FC", "Parma": "Parma Calcio 1913", "Como": "Como 1907",
  "Monza": "AC Monza", "Venezia": "Venezia FC", "Pisa": "AC Pisa 1909",
  "Cremonese": "US Cremonese",
  // Ligue 1
  "Paris SG": "Paris Saint-Germain FC", "Monaco": "AS Monaco FC",
  "Marseille": "Olympique de Marseille", "Lille": "Lille OSC",
  "Lyon": "Olympique Lyonnais", "Nice": "OGC Nice",
  "Rennes": "Stade Rennais FC 1901", "Strasbourg": "RC Strasbourg Alsace",
  "Lens": "RC Lens", "Nantes": "FC Nantes", "Brest": "Stade Brestois 29",
  "Toulouse": "Toulouse FC", "Reims": "Stade de Reims", "Auxerre": "AJ Auxerre",
  "Montpellier": "Montpellier HSC", "Le Havre": "Le Havre AC", "Angers": "Angers SCO",
  "St Etienne": "AS Saint-Étienne",
  // Eredivisie
  "Ajax": "AFC Ajax", "PSV Eindhoven": "PSV", "Feyenoord": "Feyenoord Rotterdam",
  "AZ Alkmaar": "AZ", "Twente": "FC Twente '65", "Utrecht": "FC Utrecht",
  "NEC Nijmegen": "NEC", "Sparta Rotterdam": "Sparta Rotterdam",
  "Heerenveen": "sc Heerenveen", "Go Ahead Eagles": "Go Ahead Eagles",
  // Primeira Liga
  "Benfica": "SL Benfica", "Porto": "FC Porto", "Sp Lisbon": "Sporting CP",
  "Braga": "SC Braga", "Vitoria": "Vitória SC", "Famalicao": "FC Famalicão",
};

function canonical(name: string): string {
  return NAME_MAP[name] ?? name;
}

interface CsvRow {
  HomeTeam: string;
  AwayTeam: string;
  FTHG: number;
  FTAG: number;
}

function parseCsv(text: string): CsvRow[] {
  const cleaned = text.replace(/^\uFEFF/, "");
  const lines = cleaned.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map(h => h.trim());
  const iH = headers.indexOf("HomeTeam");
  const iA = headers.indexOf("AwayTeam");
  const iHG = headers.indexOf("FTHG");
  const iAG = headers.indexOf("FTAG");
  if (iH < 0 || iA < 0 || iHG < 0 || iAG < 0) {
    throw new Error(`CSV missing required columns. Headers: ${headers.slice(0, 10).join(",")}…`);
  }

  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    if (!cols[iH] || cols[iHG] === undefined || cols[iHG] === "") continue;
    const fthg = Number(cols[iHG]);
    const ftag = Number(cols[iAG]);
    if (!Number.isFinite(fthg) || !Number.isFinite(ftag)) continue;
    rows.push({ HomeTeam: cols[iH], AwayTeam: cols[iA], FTHG: fthg, FTAG: ftag });
  }
  return rows;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQuotes = !inQuotes; continue; }
    if (c === "," && !inQuotes) { out.push(cur); cur = ""; continue; }
    cur += c;
  }
  out.push(cur);
  return out;
}

function buildLeagueStats(rows: CsvRow[], competitionCode: string): LeagueStats | null {
  if (rows.length === 0) return null;
  const homeGoalAvg = rows.reduce((s, r) => s + r.FTHG, 0) / rows.length;
  const awayGoalAvg = rows.reduce((s, r) => s + r.FTAG, 0) / rows.length;
  if (homeGoalAvg <= 0 || awayGoalAvg <= 0) return null;

  const tally: Record<string, {
    homeGoalsFor: number; homeGoalsAg: number; homePlayed: number;
    awayGoalsFor: number; awayGoalsAg: number; awayPlayed: number;
  }> = {};

  for (const r of rows) {
    const home = canonical(r.HomeTeam);
    const away = canonical(r.AwayTeam);
    tally[home] ??= { homeGoalsFor: 0, homeGoalsAg: 0, homePlayed: 0, awayGoalsFor: 0, awayGoalsAg: 0, awayPlayed: 0 };
    tally[away] ??= { homeGoalsFor: 0, homeGoalsAg: 0, homePlayed: 0, awayGoalsFor: 0, awayGoalsAg: 0, awayPlayed: 0 };
    tally[home].homeGoalsFor += r.FTHG;
    tally[home].homeGoalsAg  += r.FTAG;
    tally[home].homePlayed   += 1;
    tally[away].awayGoalsFor += r.FTAG;
    tally[away].awayGoalsAg  += r.FTHG;
    tally[away].awayPlayed   += 1;
  }

  const teams: Record<string, TeamStrength> = {};
  for (const [name, t] of Object.entries(tally)) {
    if (t.homePlayed === 0 || t.awayPlayed === 0) continue;
    teams[name] = {
      teamName: name,
      homeAttack:  (t.homeGoalsFor / t.homePlayed) / homeGoalAvg,
      homeDefence: (t.homeGoalsAg  / t.homePlayed) / awayGoalAvg,
      awayAttack:  (t.awayGoalsFor / t.awayPlayed) / awayGoalAvg,
      awayDefence: (t.awayGoalsAg  / t.awayPlayed) / homeGoalAvg,
      matchesPlayed: t.homePlayed + t.awayPlayed,
    };
  }

  if (Object.keys(teams).length === 0) return null;

  return {
    competitionCode,
    homeGoalAvg,
    awayGoalAvg,
    teams,
    updated: new Date().toISOString().slice(0, 10),
  };
}

async function fetchCoUkCsv(csvCode: string, season: string): Promise<string | null> {
  const url = `https://www.football-data.co.uk/mmz4281/${season}/${csvCode}.csv`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function syncCoUkLeague(src: CoUkSource): Promise<LeagueStats | null> {
  for (const season of [CURRENT, PREVIOUS]) {
    const csv = await fetchCoUkCsv(src.csvCode, season);
    if (!csv) continue;

    let rows: CsvRow[];
    try {
      rows = parseCsv(csv);
    } catch (err) {
      console.error(`  parse error (${season}): ${(err as Error).message}`);
      continue;
    }

    if (rows.length < MIN_LEAGUE_MATCHES) {
      console.log(`  ${season} → ${rows.length} matches (below threshold), trying previous season`);
      continue;
    }

    const stats = buildLeagueStats(rows, src.competitionCode);
    if (!stats) continue;
    console.log(`  ${season} → ${rows.length} matches, ${Object.keys(stats.teams).length} teams ✓`);
    return stats;
  }
  return null;
}

/* ──────────────────────────────────────────────────────────────────────
   Source 2: football-data.org API fallback
   ────────────────────────────────────────────────────────────────────── */

interface FdOrgMatch {
  status: string;
  homeTeam: { name: string };
  awayTeam: { name: string };
  score?: { fullTime?: { home: number | null; away: number | null } };
}

interface FdOrgSource {
  competitionCode: string;
  name: string;
}

const FD_ORG_SOURCES: FdOrgSource[] = [
  { competitionCode: "BSA", name: "Brasileirão" },
  { competitionCode: "CL",  name: "Champions League" },
];

async function syncFdOrgLeague(src: FdOrgSource, token: string): Promise<LeagueStats | null> {
  const since = new Date(NOW.getTime() - 365 * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10);
  const until = NOW.toISOString().slice(0, 10);

  const url = `https://api.football-data.org/v4/competitions/${src.competitionCode}/matches?status=FINISHED&dateFrom=${since}&dateTo=${until}`;

  try {
    const res = await fetch(url, { headers: { "X-Auth-Token": token } });
    if (!res.ok) {
      console.error(`  HTTP ${res.status} from football-data.org`);
      return null;
    }
    const json = await res.json() as { matches?: FdOrgMatch[] };
    const matches = json.matches ?? [];
    const rows: CsvRow[] = [];
    for (const m of matches) {
      const h = m.score?.fullTime?.home;
      const a = m.score?.fullTime?.away;
      if (h == null || a == null) continue;
      rows.push({
        HomeTeam: m.homeTeam.name,
        AwayTeam: m.awayTeam.name,
        FTHG: h,
        FTAG: a,
      });
    }

    if (rows.length < MIN_LEAGUE_MATCHES) {
      console.log(`  ${rows.length} matches in last 12 months (below threshold) — skipping`);
      return null;
    }

    const stats = buildLeagueStats(rows, src.competitionCode);
    if (!stats) return null;
    console.log(`  ${rows.length} matches, ${Object.keys(stats.teams).length} teams ✓`);
    return stats;
  } catch (err) {
    console.error(`  fetch error: ${(err as Error).message}`);
    return null;
  }
}

/* ──────────────────────────────────────────────────────────────────────
   Main
   ────────────────────────────────────────────────────────────────────── */

async function main() {
  const target = join(process.cwd(), "data", "team-stats.json");

  let existing: Record<string, LeagueStats> = {};
  try {
    const raw = await readFile(target, "utf-8");
    existing = JSON.parse(raw);
    console.log(`Loaded existing team-stats.json with ${Object.keys(existing).length} leagues.\n`);
  } catch {
    console.log(`No existing team-stats.json — starting fresh.\n`);
  }

  console.log(`Current season: ${CURRENT}, previous: ${PREVIOUS}\n`);
  console.log(`── football-data.co.uk sources (${CO_UK_SOURCES.length} leagues) ──`);
  for (const src of CO_UK_SOURCES) {
    console.log(`${src.name} (${src.competitionCode}):`);
    const stats = await syncCoUkLeague(src);
    if (stats) {
      existing[src.competitionCode] = stats;
    } else {
      const had = existing[src.competitionCode];
      console.log(`  ✗ refresh failed — ${had ? "keeping existing entry" : "no existing entry, league will be missing"}`);
    }
  }

  console.log(`\n── football-data.org sources (${FD_ORG_SOURCES.length} leagues) ──`);
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) {
    console.log(`(skipped — FOOTBALL_DATA_TOKEN not set)`);
    for (const src of FD_ORG_SOURCES) {
      if (!existing[src.competitionCode]) {
        console.log(`  ⚠ ${src.competitionCode} (${src.name}) — no token & no existing entry; matches will use neutral defaults at runtime`);
      }
    }
  } else {
    for (const src of FD_ORG_SOURCES) {
      console.log(`${src.name} (${src.competitionCode}):`);
      const stats = await syncFdOrgLeague(src, token);
      if (stats) {
        existing[src.competitionCode] = stats;
      } else {
        const had = existing[src.competitionCode];
        console.log(`  ✗ refresh failed — ${had ? "keeping existing entry" : "no existing entry"}`);
      }
    }
  }

  await writeFile(target, JSON.stringify(existing, null, 2));
  const sizes = Object.entries(existing)
    .map(([code, s]) => `${code}:${Object.keys(s.teams).length}`)
    .join(" ");
  console.log(`\nWrote ${target}`);
  console.log(`Leagues now in file: ${sizes}`);
}

main().catch(err => {
  console.error("sync failed:", err);
  process.exit(1);
});
