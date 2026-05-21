"use client";

import { useEffect, useState } from "react";
import type { Match } from "@/lib/types";

interface LiveScoresData {
  matches: Match[];
}

const LEAGUE_COLORS: Record<string, string> = {
  PL: "from-blue-600 to-blue-700",
  BL1: "from-red-600 to-red-700",
  SA: "from-blue-400 to-blue-500",
  PD: "from-yellow-600 to-yellow-700",
  FL1: "from-indigo-600 to-indigo-700",
  DED: "from-orange-600 to-orange-700",
  PPL: "from-green-600 to-green-700",
  ELC: "from-purple-600 to-purple-700",
  CL: "from-blue-900 to-blue-950",
  EC: "from-purple-900 to-purple-950",
};

const LEAGUE_NAMES: Record<string, string> = {
  PL: "Premier League",
  BL1: "Bundesliga",
  SA: "Serie A",
  PD: "La Liga",
  FL1: "Ligue 1",
  DED: "Eredivisie",
  PPL: "Primeira Liga",
  ELC: "Championship",
  BSA: "Brazil Série A",
  CL: "Champions League",
  EC: "Europa League",
};

function getStatusBadge(status: string): { text: string; color: string } {
  switch (status) {
    case "IN_PLAY":
      return { text: "LIVE", color: "bg-red-500 animate-pulse" };
    case "FINISHED":
      return { text: "FT", color: "bg-gray-500" };
    case "SCHEDULED":
      return { text: "SCH", color: "bg-gray-600" };
    default:
      return { text: status, color: "bg-gray-500" };
  }
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function groupByLeague(matches: Match[]): Record<string, Match[]> {
  return matches.reduce(
    (acc, match) => {
      const code = match.competitionCode;
      if (!acc[code]) acc[code] = [];
      acc[code].push(match);
      return acc;
    },
    {} as Record<string, Match[]>,
  );
}

export default function LiveScoresSidebar() {
  const [data, setData] = useState<LiveScoresData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  async function fetchLiveScores() {
    try {
      const res = await fetch("/api/live-scores");
      if (res.ok) {
        const json = (await res.json()) as LiveScoresData;
        setData(json);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error("Failed to fetch live scores:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLiveScores();
    const interval = setInterval(fetchLiveScores, 60000); // Poll every 60 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="h-96 w-80 animate-pulse rounded-lg border border-hairline bg-midnight/50" />
    );
  }

  if (!data?.matches || data.matches.length === 0) {
    return (
      <div className="rounded-lg border border-hairline bg-midnight/30 p-4">
        <p className="text-center text-sm text-bone/50">No live matches</p>
      </div>
    );
  }

  const grouped = groupByLeague(data.matches);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-xs font-semibold uppercase tracking-widest text-flag">
          Live Scores
        </h3>
        {lastUpdate && (
          <span className="font-mono text-[10px] text-bone/40">
            {lastUpdate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>

      <div className="max-h-96 space-y-3 overflow-y-auto rounded-lg border border-hairline bg-midnight/30 p-3">
        {Object.entries(grouped).map(([leagueCode, matches]) => (
          <div key={leagueCode}>
            <p className="mb-2 font-mono text-[10px] font-bold uppercase text-bone/60">
              {LEAGUE_NAMES[leagueCode] || leagueCode}
            </p>
            <div className="space-y-1">
              {matches.slice(0, 5).map(match => {
                const { text: statusText, color: statusColor } = getStatusBadge(match.status);
                return (
                  <div
                    key={match.id}
                    className="flex items-center justify-between rounded border border-hairline/40 bg-midnight/50 px-2 py-1.5 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span className="truncate font-semibold text-bone">
                          {match.home.shortName}
                        </span>
                        <span className="text-bone/50">vs</span>
                        <span className="truncate font-semibold text-bone">
                          {match.away.shortName}
                        </span>
                      </div>
                      <div className="mt-0.5 text-bone/40">{formatTime(match.utcDate)}</div>
                    </div>
                    <div className="ml-2 flex items-center gap-2">
                      {match.score ? (
                        <div className="font-mono font-bold text-flag">
                          {match.score.home}-{match.score.away}
                        </div>
                      ) : (
                        <div className="text-bone/40">—</div>
                      )}
                      <span className={`${statusColor} rounded px-1.5 py-0.5 font-mono text-[9px] font-bold text-white`}>
                        {statusText}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
