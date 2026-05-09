export type MatchStatus = "SCHEDULED" | "IN_PLAY" | "FINISHED" | "POSTPONED";

export interface Team {
  id: number;
  name: string;
  shortName: string;
  crest?: string;
}

export interface Match {
  id: number;
  competition: string;
  competitionCode: string;
  utcDate: string;
  status: MatchStatus;
  matchday?: number;
  home: Team;
  away: Team;
  score?: { home: number | null; away: number | null };
}

export interface OutcomeProbabilities {
  home: number;   // 0..1
  draw: number;
  away: number;
}

export interface FairOdds {
  home: number;   // 1/p
  draw: number;
  away: number;
}

export interface MarketOdds {
  home: number | null;
  draw: number | null;
  away: number | null;
  bookmaker?: string;
}

export interface ValueAssessment {
  outcome: "home" | "draw" | "away" | null;
  edgePct: number | null;          // (modelProb * marketOdds) - 1
  recommendation: "VALUE" | "FAIR" | "AVOID" | "NO_DATA";
  kellyFractionPct: number | null; // recommended stake as % of bankroll
}

export interface MatchPrediction {
  match: Match;
  expectedGoals: { home: number; away: number };
  probabilities: OutcomeProbabilities;
  fairOdds: FairOdds;
  marketOdds?: MarketOdds;
  value?: ValueAssessment;
  topScorelines: Array<{ home: number; away: number; prob: number }>;
  bttsProb: number;     // both teams to score
  over25Prob: number;   // over 2.5 goals
}

export interface TeamStrength {
  teamId?: number;
  teamName: string;
  homeAttack: number;   // goals scored at home / league avg
  homeDefence: number;  // goals conceded at home / league avg (lower = better)
  awayAttack: number;
  awayDefence: number;
  matchesPlayed: number;
}

export interface LeagueStats {
  competitionCode: string;
  homeGoalAvg: number;
  awayGoalAvg: number;
  teams: Record<string, TeamStrength>;
  updated: string;
}

export interface Bookmaker {
  id: string;
  name: string;
  logo: string;
  affiliateUrl: string;
  signupBonus: string;
  bonusValueNGN?: string;
  freeBetTerms: string;
  rating: number;
  tags: string[];
}

export interface AccumulatorLeg {
  matchId: number;
  homeShort: string;
  awayShort: string;
  competition: string;
  kickoffISO: string;
  market: string;       // human label e.g. "Man City to win"
  marketKey: "1" | "X" | "2" | "BTTS_YES" | "BTTS_NO" | "OVER_2_5" | "UNDER_2_5";
  probability: number;  // 0..1, model probability of this leg hitting
  fairOdds: number;     // 1 / probability
}

export interface Accumulator {
  targetOdds: number;            // 10, 100, or 1000
  legs: AccumulatorLeg[];
  combinedFairOdds: number;      // product of fairOdds
  jointProbability: number;      // = 1 / combinedFairOdds, assuming independence
  oneInX: number;                // = round(1 / jointProbability)
  riskLabel: "moderate" | "high" | "lottery";
}
