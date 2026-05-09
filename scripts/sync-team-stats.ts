/**
 * sync-team-stats.ts
 *
 * Fetches Football-Data.co.uk free historical CSVs for the most recent
 * complete season(s) and rebuilds data/team-stats.json with computed
 * attack/defence ratings.
 *
 * Run weekly during the season:
 *   npx tsx scripts/sync-team-stats.ts
 *
 * Or set up a Vercel cron / GitHub Action to commit updates back.
 *
 * Football-Data.co.uk hosts free CSVs at /mmz4281/{season}/{league}.csv
 * Example: https://www.football-data.co.uk/mmz4281/2425/E0.csv
 *
 *   E0  = English Premier League
 *   SP1 = La Liga
 *   D1  = Bundesliga
 *   I1  = Serie A
 *   F1  = Ligue 1
 */

import { writeFile } from "node:fs/promises";
import { join } from "node:path";

interface Row {
  HomeTeam: string;
  AwayTeam: string;
  FTHG: number;   // full-time home goals
  FTAG: number;
}

const SOURCES: Array<{ code: string; csv: string; competitionCode: string; name: string }> = [
  { code: "E0",  csv: "https://www.football-data.co.uk/mmz4281/2425/E0.csv",  competitionCode: "PL",  name: "Premier League" },
  { code: "SP1", csv: "https://www.football-data.co.uk/mmz4281/2425/SP1.csv", competitionCode: "PD",  name: "La Liga" },
  { code: "D1",  csv: "https://www.football-data.co.uk/mmz4281/2425/D1.csv",  competitionCode: "BL1", name: "Bundesliga" },
  { code: "I1",  csv: "https://www.football-data.co.uk/mmz4281/2425/I1.csv",  competitionCode: "SA",  name: "Serie A" },
  { code: "F1",  csv: "https://www.football-data.co.uk/mmz4281/2425/F1.csv",  competitionCode: "FL1", name: "Ligue 1" },
];

/**
 * Football-Data.co.uk team names sometimes differ from Football-Data.org's
 * canonical names. This map bridges the two so predictions resolve cleanly
 * at runtime. Extend as needed.
 */
const NAME_MAP: Record<string, string> = {
  "Man City": "Manchester City FC",
  "Man United": "Manchester United FC",
  "Newcastle": "Newcastle United FC",
  "Tottenham": "Tottenham Hotspur FC",
  "Wolves": "Wolverhampton Wanderers FC",
  "Brighton": "Brighton & Hove Albion FC",
  "Nott'm Forest": "Nottingham Forest FC",
  "Bournemouth": "AFC Bournemouth",
  "Leicester": "Leicester City FC",
  "Ipswich": "Ipswich Town FC",
  "West Ham": "West Ham United FC",
  "Crystal Palace": "Crystal Palace FC",
  "Brentford": "Brentford FC",
  "Fulham": "Fulham FC",
  "Aston Villa": "Aston Villa FC",
  "Arsenal": "Arsenal FC",
  "Liverpool": "Liverpool FC",
  "Chelsea": "Chelsea FC",
  "Everton": "Everton FC",
  "Southampton": "Southampton FC",
  // La Liga
  "Real Madrid": "Real Madrid CF",
  "Barcelona": "FC Barcelona",
  "Ath Madrid": "Club Atlético de Madrid",
  "Ath Bilbao": "Athletic Club",
  "Sociedad": "Real Sociedad de Fútbol",
  "Villarreal": "Villarreal CF",
  "Betis": "Real Betis Balompié",
  "Sevilla": "Sevilla FC",
  "Valencia": "Valencia CF",
  "Getafe": "Getafe CF",
  // Bundesliga
  "Bayern Munich": "FC Bayern München",
  "Leverkusen": "Bayer 04 Leverkusen",
  "Dortmund": "Borussia Dortmund",
  "RB Leipzig": "RB Leipzig",
  "Ein Frankfurt": "Eintracht Frankfurt",
  "Stuttgart": "VfB Stuttgart",
  // Serie A
  "Inter": "FC Internazionale Milano",
  "Milan": "AC Milan",
  "Juventus": "Juventus FC",
  "Napoli": "SSC Napoli",
  "Atalanta": "Atalanta BC",
  "Roma": "AS Roma",
  "Lazio": "SS Lazio",
  // Ligue 1
  "Paris SG": "Paris Saint-Germain FC",
  "Monaco": "AS Monaco FC",
  "Marseille": "Olympique de Marseille",
  "Lille": "Lille OSC",
  "Lyon": "Olympique Lyonnais",
};

function canonical(name: string): string {
  return NAME_MAP[name] ?? name;
}

function parseCsv(text: string): Row[] {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(",");
  const idx = (h: string) => headers.indexOf(h);
  const iH = idx("HomeTeam"), iA = idx("AwayTeam"), iHG = idx("FTHG"), iAG = idx("FTAG");
  const rows: Row[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (!cols[iH] || cols[iHG] === undefined) continue;
    const fthg = Number(cols[iHG]);
    const ftag = Number(cols[iAG]);
    if (Number.isNaN(fthg) || Number.isNaN(ftag)) continue;
    rows.push({ HomeTeam: cols[iH], AwayTeam: cols[iA], FTHG: fthg, FTAG: ftag });
  }
  return rows;
}

function buildLeagueStats(rows: Row[], competitionCode: string) {
  if (rows.length === 0) return null;

  const homeGoalAvg = rows.reduce((s, r) => s + r.FTHG, 0) / rows.length;
  const awayGoalAvg = rows.reduce((s, r) => s + r.FTAG, 0) / rows.length;

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
    tally[home].homeGoalsAg += r.FTAG;
    tally[home].homePlayed += 1;
    tally[away].awayGoalsFor += r.FTAG;
    tally[away].awayGoalsAg += r.FTHG;
    tally[away].awayPlayed += 1;
  }

  const teams: Record<string, any> = {};
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

  return {
    competitionCode,
    homeGoalAvg,
    awayGoalAvg,
    updated: new Date().toISOString().slice(0, 10),
    teams,
  };
}

async function main() {
  const out: Record<string, unknown> = {};
  for (const src of SOURCES) {
    process.stdout.write(`Fetching ${src.name}... `);
    try {
      const res = await fetch(src.csv);
      if (!res.ok) {
        console.error(`HTTP ${res.status} — skipping`);
        continue;
      }
      const text = await res.text();
      const rows = parseCsv(text);
      const stats = buildLeagueStats(rows, src.competitionCode);
      if (!stats) { console.error("no rows — skipping"); continue; }
      out[src.competitionCode] = stats;
      console.log(`${rows.length} matches, ${Object.keys(stats.teams).length} teams`);
    } catch (err) {
      console.error("error", err);
    }
  }

  const target = join(process.cwd(), "data", "team-stats.json");
  await writeFile(target, JSON.stringify(out, null, 2));
  console.log(`\nWrote ${target}`);
}

main();
