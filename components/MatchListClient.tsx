"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useFavorites } from "@/lib/favorites";
import FavoriteStar from "./FavoriteStar";

export interface DayMatchPayload {
  matchId: number;
  homeId: number;
  awayId: number;
  homeName: string;
  awayName: string;
  homeShort: string;
  awayShort: string;
  competitionCode: string;
  competition: string;
  utcDate: string;
  probabilities: { home: number; draw: number; away: number };
  expectedGoals: { home: number; away: number };
  bttsProb: number;
  over25Prob: number;
  valueOutcome: "home" | "draw" | "away" | null;
  valueRecommendation: "VALUE" | "FAIR" | "AVOID" | "NO_DATA" | null;
  valueEdgePct: number | null;
}

const COMP_BADGE: Record<string, string> = {
  PL: "EPL", PD: "La Liga", BL1: "Bundesliga", SA: "Serie A",
  FL1: "Ligue 1", CL: "UCL", EC: "Euros", WC: "World Cup",
  DED: "Eredivisie", PPL: "Primeira", ELC: "Champ.", BSA: "Brasileirão",
};

export default function MatchListClient({ matches }: { matches: DayMatchPayload[] }) {
  const { isFavorite, toggle, hydrated } = useFavorites();

  // Split into "favourited matches" (any team in match is a favourite) and rest, then group by date.
  const { favourited, rest, days, groupedFav, groupedRest } = useMemo(() => {
    const fav: DayMatchPayload[] = [];
    const oth: DayMatchPayload[] = [];
    for (const m of matches) {
      // We treat a match as "favourited" if either its home or away team is starred.
      // Before hydration we treat nothing as favourited (avoids SSR/CSR mismatch).
      if (hydrated && (isFavorite(m.homeId) || isFavorite(m.awayId))) fav.push(m);
      else oth.push(m);
    }

    const groupByDay = (arr: DayMatchPayload[]) => {
      const g: Record<string, DayMatchPayload[]> = {};
      for (const m of arr) {
        const day = new Date(m.utcDate).toISOString().slice(0, 10);
        (g[day] ??= []).push(m);
      }
      return g;
    };

    const groupedF = groupByDay(fav);
    const groupedR = groupByDay(oth);

    const allDays = new Set<string>();
    Object.keys(groupedF).forEach(d => allDays.add(d));
    Object.keys(groupedR).forEach(d => allDays.add(d));

    return {
      favourited: fav,
      rest: oth,
      days: [...allDays].sort(),
      groupedFav: groupedF,
      groupedRest: groupedR,
    };
  }, [matches, isFavorite, hydrated]);

  return (
    <>
      {favourited.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-bold tracking-tight text-flag">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
            Your teams ({favourited.length})
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {favourited.map(m => (
              <MatchRow key={m.matchId} m={m} isFavorite={isFavorite} toggle={toggle} highlight />
            ))}
          </div>
        </section>
      )}

      {days.map(day => {
        const dayItems = groupedRest[day] ?? [];
        if (dayItems.length === 0) return null;
        return (
          <section key={day} className="mt-12">
            <h2 className="mb-4 font-display text-xl font-bold tracking-tight text-bone">
              {new Date(day).toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" })}
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              {dayItems.map(m => (
                <MatchRow key={m.matchId} m={m} isFavorite={isFavorite} toggle={toggle} />
              ))}
            </div>
          </section>
        );
      })}

      {hydrated && favourited.length === 0 && (
        <p className="mt-12 max-w-3xl text-xs text-bone/50">
          Tip: tap the ☆ next to a team's name to follow them. Their matches will pin to the top
          of this page across visits — saved locally on your device, no account needed.
        </p>
      )}
    </>
  );
}

function MatchRow({
  m,
  isFavorite,
  toggle,
  highlight,
}: {
  m: DayMatchPayload;
  isFavorite: (id: number) => boolean;
  toggle: (id: number) => void;
  highlight?: boolean;
}) {
  const date = new Date(m.utcDate);
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const day = date.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });

  const isValue = m.valueRecommendation === "VALUE";
  const highlightOutcome = m.valueOutcome;

  const homeFav = isFavorite(m.homeId);
  const awayFav = isFavorite(m.awayId);

  const h = Math.round(m.probabilities.home * 100);
  const d = Math.round(m.probabilities.draw * 100);
  const a = Math.max(0, 100 - h - d);

  return (
    <div
      className={`relative rounded-lg border p-5 transition ${
        highlight ? "border-flag/40 bg-flag/5" : "border-hairline bg-mist/40 hover:border-flag/40 hover:bg-mist/70"
      }`}
    >
      {isValue && (
        <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-edge/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-edge">
          <span className="h-1 w-1 rounded-full bg-edge" /> Value
        </span>
      )}

      <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-bone/40">
        <span className="font-mono">{COMP_BADGE[m.competitionCode] ?? m.competition}</span>
        <span>·</span>
        <span>{day} · {time}</span>
      </div>

      <Link href={`/matches/${m.matchId}`} className="mt-3 block">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="flex items-center justify-end gap-2">
            <p className="font-display text-lg font-semibold leading-tight md:text-xl">{m.homeShort}</p>
            <FavoriteStar
              active={homeFav}
              onToggle={() => toggle(m.homeId)}
              ariaLabel={`${homeFav ? "Unfollow" : "Follow"} ${m.homeShort}`}
            />
          </div>
          <span className="font-mono text-sm text-bone/40">vs</span>
          <div className="flex items-center gap-2">
            <FavoriteStar
              active={awayFav}
              onToggle={() => toggle(m.awayId)}
              ariaLabel={`${awayFav ? "Unfollow" : "Follow"} ${m.awayShort}`}
            />
            <p className="font-display text-lg font-semibold leading-tight md:text-xl">{m.awayShort}</p>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex w-full overflow-hidden rounded">
            <div
              className={`flex h-9 items-center justify-center text-xs font-semibold tabular rounded-l ${highlightOutcome === "home" ? "bg-flag text-ink" : "bg-mist text-bone/80"}`}
              style={{ width: `${h}%`, minWidth: h > 0 ? "2rem" : "0" }}
            >
              {h >= 8 ? `${h}%` : ""}
            </div>
            <div
              className={`flex h-9 items-center justify-center text-xs font-semibold tabular ${highlightOutcome === "draw" ? "bg-flag text-ink" : "bg-mist text-bone/80"}`}
              style={{ width: `${d}%`, minWidth: d > 0 ? "2rem" : "0" }}
            >
              {d >= 8 ? `${d}%` : ""}
            </div>
            <div
              className={`flex h-9 items-center justify-center text-xs font-semibold tabular rounded-r ${highlightOutcome === "away" ? "bg-flag text-ink" : "bg-mist text-bone/80"}`}
              style={{ width: `${a}%`, minWidth: a > 0 ? "2rem" : "0" }}
            >
              {a >= 8 ? `${a}%` : ""}
            </div>
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] uppercase tracking-widest text-bone/40">
            <span>{m.homeShort} win</span>
            <span>Draw</span>
            <span>{m.awayShort} win</span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-bone/50">
          <span className="tabular">
            xG <span className="text-bone/80">{m.expectedGoals.home.toFixed(2)}–{m.expectedGoals.away.toFixed(2)}</span>
          </span>
          {m.valueEdgePct != null && m.valueOutcome && (
            <span className={`font-mono tabular ${isValue ? "text-edge" : "text-bone/50"}`}>
              edge {m.valueEdgePct >= 0 ? "+" : ""}{m.valueEdgePct.toFixed(1)}%
            </span>
          )}
          <span className="tabular">BTTS {Math.round(m.bttsProb * 100)}%</span>
        </div>
      </Link>
    </div>
  );
}
