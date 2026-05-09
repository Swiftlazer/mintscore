"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useFavorites } from "@/lib/favorites";
import { useLeagueFilter, useTierFilter } from "@/lib/filters";
import FavoriteStar from "./FavoriteStar";
import FilterPills from "./FilterPills";
import AccumulatorCard from "./AccumulatorCard";
import type { Accumulator } from "@/lib/types";

/** Plain payload from the server — keep this in sync with app/page.tsx. */
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

interface PerLeagueEntry {
  competitionCode: string;
  competitionName: string;
  acc: Accumulator;
}

interface HistoryEntry {
  hitRate: number;
  sampleSize: number;
}

interface Props {
  matches: DayMatchPayload[];
  mainAccas: Array<{ target: number; acc: Accumulator | null }>;
  perLeague: PerLeagueEntry[];
  accaHistory: Array<HistoryEntry | null>;
}

const COMP_BADGE: Record<string, string> = {
  PL: "EPL", PD: "La Liga", BL1: "Bundesliga", SA: "Serie A",
  FL1: "Ligue 1", CL: "UCL", EC: "Euros", WC: "World Cup",
  DED: "Eredivisie", PPL: "Primeira", ELC: "Champ.", BSA: "Brasileirão",
};

const TIER_LABELS: Record<number, string> = {
  10: "10 odds",
  100: "100 odds",
  1000: "1k odds",
  10000: "10k odds",
};

export default function HomePageClient({ matches, mainAccas, perLeague, accaHistory }: Props) {
  const { isFavorite, toggle, hydrated: favHydrated } = useFavorites();
  const { active: activeLeagues, setActive: setLeagues, hydrated: lFilterHydrated } = useLeagueFilter();
  const { active: activeTiers,   setActive: setTiers,   hydrated: tFilterHydrated } = useTierFilter();

  // Compute available leagues from the data so we don't show pills for empty leagues.
  const leagueOptions = useMemo(() => {
    const present = new Map<string, string>();
    for (const m of matches) present.set(m.competitionCode, COMP_BADGE[m.competitionCode] ?? m.competition);
    for (const p of perLeague) if (!present.has(p.competitionCode)) present.set(p.competitionCode, COMP_BADGE[p.competitionCode] ?? p.competitionName);
    return Array.from(present.entries())
      .sort(([, a], [, b]) => a.localeCompare(b))
      .map(([value, label]) => ({ value, label }));
  }, [matches, perLeague]);

  const tierOptions = useMemo(
    () => mainAccas.map(({ target }) => ({ value: target, label: TIER_LABELS[target] ?? `${target} odds` })),
    [mainAccas],
  );

  // Apply filters (note: when active is null/empty, pass everything through unchanged).
  const filteredMainAccas = useMemo(() => {
    if (!activeTiers || activeTiers.size === 0) return mainAccas;
    return mainAccas.filter(({ target }) => activeTiers.has(target));
  }, [mainAccas, activeTiers]);

  const filteredPerLeague = useMemo(() => {
    if (!activeLeagues || activeLeagues.size === 0) return perLeague;
    return perLeague.filter(p => activeLeagues.has(p.competitionCode));
  }, [perLeague, activeLeagues]);

  const filteredMatches = useMemo(() => {
    if (!activeLeagues || activeLeagues.size === 0) return matches;
    return matches.filter(m => activeLeagues.has(m.competitionCode));
  }, [matches, activeLeagues]);

  // Split favourited matches off the top.
  const { favourited, groupedRest, days } = useMemo(() => {
    const fav: DayMatchPayload[] = [];
    const oth: DayMatchPayload[] = [];
    for (const m of filteredMatches) {
      // Before localStorage hydrates we treat nothing as favourited (avoids SSR/CSR mismatch).
      if (favHydrated && (isFavorite(m.homeId) || isFavorite(m.awayId))) fav.push(m);
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
    const groupedR = groupByDay(oth);
    const allDays = new Set<string>();
    Object.keys(groupedR).forEach(d => allDays.add(d));
    return { favourited: fav, groupedRest: groupedR, days: [...allDays].sort() };
  }, [filteredMatches, isFavorite, favHydrated]);

  const anyMainAcca = filteredMainAccas.some(a => a.acc !== null);
  const filtersHydrated = lFilterHydrated && tFilterHydrated;
  const noResultsAfterFilter =
    filtersHydrated &&
    filteredMatches.length === 0 &&
    filteredPerLeague.length === 0 &&
    !anyMainAcca &&
    matches.length > 0; // there IS data, the filter just hid it all

  return (
    <>
      {/* ---------- Filter bar ---------- */}
      {(leagueOptions.length > 0 || tierOptions.length > 0) && (
        <section className="mt-12 rounded-lg border border-hairline bg-mist/30 p-4">
          <div className="flex flex-col gap-4">
            {tierOptions.length > 0 && (
              <FilterPills<number>
                label="Acca odds"
                options={tierOptions}
                active={activeTiers}
                onChange={setTiers}
              />
            )}
            {leagueOptions.length > 0 && (
              <FilterPills<string>
                label="Leagues"
                options={leagueOptions}
                active={activeLeagues}
                onChange={setLeagues}
              />
            )}
          </div>
          <p className="mt-3 text-[10px] text-bone/40">
            Filters save to your device — they'll still be set next time you visit.
            League filter applies to per-league accas and the match list. Odds filter applies to the main acca tiers.
          </p>
        </section>
      )}

      {/* ---------- Main acca tiers ---------- */}
      {anyMainAcca && (
        <section className="mt-8">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-widest text-flag">
                Daily aggregator accas
              </p>
              <h2 className="mt-1 font-display text-2xl font-bold tracking-tight md:text-3xl">
                Built from the model's most-confident picks today
              </h2>
            </div>
            <Link href="/learn#accumulators" className="hidden text-xs text-bone/50 hover:text-bone md:block">
              Why accas eat your bankroll →
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {filteredMainAccas.map(({ target, acc }) => {
              // Find the original index for history lookup
              const originalIdx = mainAccas.findIndex(a => a.target === target);
              const history = originalIdx >= 0 ? accaHistory[originalIdx] : null;
              return (
                <div key={target}>
                  {acc ? (
                    <AccumulatorCard
                      acc={acc}
                      historicalHitRate={history?.hitRate}
                      historicalSampleSize={history?.sampleSize}
                    />
                  ) : (
                    <div className="flex h-full min-h-48 flex-col items-center justify-center rounded-lg border border-hairline bg-mist/20 p-5 text-center">
                      <p className="font-mono text-[10px] uppercase tracking-widest text-bone/40">
                        {target.toLocaleString()} odds
                      </p>
                      <p className="mt-3 text-sm text-bone/60">
                        Not enough high-confidence picks today to build this tier.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-4 max-w-3xl text-xs text-bone/50">
            Joint probability assumes leg outcomes are independent — they're not, perfectly. Real
            variance is higher than the model shows. Accumulators amplify both upside and model error;
            keep stakes small and treat the 1000-odd and 10,000-odd slots as entertainment, not investment.
          </p>
        </section>
      )}

      {/* ---------- Per-league accas ---------- */}
      {filteredPerLeague.length > 0 && (
        <section className="mt-12">
          <div className="mb-5">
            <p className="font-mono text-[11px] uppercase tracking-widest text-flag">
              Best per league
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold tracking-tight md:text-3xl">
              Safest 10-odds acca for each league
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-bone/60">
              Same algorithm but built only from a single competition's fixtures —
              useful if you prefer to bet within one league.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredPerLeague.map(({ competitionCode, competitionName, acc }) => (
              <div key={competitionCode}>
                <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-bone/50">
                  {competitionName}
                </p>
                <AccumulatorCard acc={acc} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---------- Match list (favourites, then by date) ---------- */}
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

      {noResultsAfterFilter && (
        <section className="mt-12 rounded-lg border border-hairline bg-mist/40 p-6 text-center">
          <p className="font-display text-xl font-bold tracking-tight">No matches at these filters.</p>
          <p className="mt-2 text-sm text-bone/60">
            Try clearing one of the filters above to see more.
          </p>
        </section>
      )}

      {favHydrated && favourited.length === 0 && filteredMatches.length > 0 && (
        <p className="mt-12 max-w-3xl text-xs text-bone/50">
          Tip: tap the ☆ next to a team's name to follow them. Their matches will pin to the top
          of this page across visits — saved locally on your device, no account needed.
        </p>
      )}
    </>
  );
}

/* ---------- internal: a single match row ---------- */
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
