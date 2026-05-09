import type { LeagueStats, Match, MatchPrediction, MarketOdds } from "./types";
import {
  expectedGoals,
  jointScorelineMatrix,
  outcomeProbabilities,
  bttsProbability,
  overGoalsProbability,
  topScorelines,
  fairOddsFromProbs,
  assessValue,
} from "./prediction";
import teamStats from "@/data/team-stats.json";

const STATS = teamStats as Record<string, LeagueStats>;

/** Default neutral team — used when we don't have history yet for a fixture. */
function neutralTeam(name: string) {
  return {
    teamName: name,
    homeAttack: 1.0,
    homeDefence: 1.0,
    awayAttack: 1.0,
    awayDefence: 1.0,
    matchesPlayed: 0,
  };
}

/** Default neutral league — for competitions outside the bundled set. */
const NEUTRAL_LEAGUE: LeagueStats = {
  competitionCode: "??",
  homeGoalAvg: 1.50,
  awayGoalAvg: 1.20,
  teams: {},
  updated: new Date().toISOString().slice(0, 10),
};

export function predictMatch(match: Match, marketOdds?: MarketOdds): MatchPrediction {
  const league = STATS[match.competitionCode] ?? NEUTRAL_LEAGUE;
  const home = league.teams[match.home.name] ?? neutralTeam(match.home.name);
  const away = league.teams[match.away.name] ?? neutralTeam(match.away.name);

  const lambdas = expectedGoals(home, away, league);
  const matrix = jointScorelineMatrix(lambdas.home, lambdas.away);
  const probs = outcomeProbabilities(matrix);

  return {
    match,
    expectedGoals: lambdas,
    probabilities: probs,
    fairOdds: fairOddsFromProbs(probs),
    marketOdds,
    value: assessValue(probs, marketOdds),
    topScorelines: topScorelines(matrix, 5),
    bttsProb: bttsProbability(matrix),
    over25Prob: overGoalsProbability(matrix, 2.5),
  };
}
