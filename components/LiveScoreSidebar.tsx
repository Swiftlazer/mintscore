"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import type { LiveScoreFeed, LiveScoreMatch, RecentResultsFeed } from "@/lib/livescore";

/* Lookup label for known competition codes. Anything not in the map
 * displays the upstream competition name as-is — covers leagues we
 * haven't manually mapped, including ones from future API plan upgrades. */
const COMP_BADGE: Record<string, string> = {
  PL: "EPL", PD: "La Liga", BL1: "Bundesliga", SA: "Serie A",
  FL1: "Ligue 1", CL: "UCL", EC: "Euros", WC: "World Cup",
  DED: "Eredivisie", PPL: "Primeira", ELC: "Champ.", BSA: "Brasileirão",
  FRIENDLY: "Friendly",
};

const POLL_MS = 60_000;
const RESULTS_DAYS = 7;
type Tab = "today" | "results";

export default function LiveScoreSidebar() {
  const [tab, setTab] = useState<Tab>("today");

  // ── Today (live + upcoming + finished today) ──
  const [feed, setFeed] = useState<LiveScoreFeed | null>(null);
  const [todayError, setTodayError] = useState<string | null>(null);

  // ── Results (last N days, finished only) ──
  const [results, setResults] = useState<RecentResultsFeed | null>(null);
  const [resultsError, setResultsError] = useState<string | null>(null);
  const [resultsLoading, setResultsLoading] = useState(false);

  const [openMobile, setOpenMobile] = useState(false);

  /* ── Today fetcher: poll every 60s + refetch on focus ───────────── */
  const loadToday = useCallback(async () => {
    try {
      const res = await fetch("/api/livescore", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as LiveScoreFeed;
      setFeed(data);
      setTodayError(data.error ?? null);
    } catch (err) {
      setTodayError(err instanceof Error ? err.message : "fetch failed");
    }
  }, []);

  useEffect(() => {
    loadToday();
    const id = setInterval(loadToday, POLL_MS);
    const onFocus = () => loadToday();
    window.addEventListener("focus", onFocus);
    return () => { clearInterval(id); window.removeEventListener("focus", onFocus); };
  }, [loadToday]);

  /* ── Results fetcher: lazy (only when tab opened) + cached upstream ── */
  const loadResults = useCallback(async () => {
    setResultsLoading(true);
    try {
      const res = await fetch(`/api/results?days=${RESULTS_DAYS}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as RecentResultsFeed;
      setResults(data);
      setResultsError(data.error ?? null);
    } catch (err) {
      setResultsError(err instanceof Error ? err.message : "fetch failed");
    } finally {
      setResultsLoading(false);
    }
  }, []);

  // First time the Results tab is opened, fetch.
  useEffect(() => { if (tab === "results" && !results) loadResults(); }, [tab, results, loadResults]);

  const liveCount = feed?.live.length ?? 0;
  const todayGrouped = useMemo(() => groupByLeague(feed), [feed]);
  const resultsGrouped = useMemo(() => groupByDay(results), [results]);

  const sharedProps = {
    tab, setTab,
    feed, todayError, todayGrouped, onRefreshToday: loadToday,
    results, resultsError, resultsLoading, resultsGrouped, onRefreshResults: loadResults,
  };

  return (
    <>
      {/* ─── Desktop: persistent left rail on xl+ screens ─── */}
      <aside
        className="fixed left-0 top-16 bottom-0 hidden w-[280px] overflow-y-auto border-r border-hairline bg-ink/95 backdrop-blur-md xl:block"
        aria-label="Live scores and recent results"
      >
        <SidebarContent {...sharedProps} />
      </aside>

      {/* ─── Mobile / tablet: floating action button (bottom-left) + drawer ─── */}
      <button
        type="button"
        onClick={() => setOpenMobile(true)}
        className="fixed bottom-5 left-5 z-40 inline-flex items-center gap-2 rounded-full bg-flag px-4 py-2.5 text-sm font-bold text-ink shadow-lg shadow-flag/20 transition hover:scale-[1.02] xl:hidden"
        aria-label={`Open live scores${liveCount > 0 ? ` (${liveCount} live)` : ""}`}
      >
        <span className={`inline-block h-2 w-2 rounded-full ${liveCount > 0 ? "animate-pulse bg-warn" : "bg-ink/40"}`} />
        Scores{liveCount > 0 ? ` · ${liveCount}` : ""}
      </button>

      {openMobile && (
        <>
          <div
            className="fixed inset-0 z-40 bg-ink/70 backdrop-blur-sm xl:hidden"
            onClick={() => setOpenMobile(false)}
            aria-hidden="true"
          />
          <aside
            className="fixed bottom-0 left-0 top-0 z-50 w-[88%] max-w-sm overflow-y-auto border-r border-hairline bg-ink shadow-2xl xl:hidden"
            aria-label="Live scores and recent results"
          >
            <button
              type="button"
              onClick={() => setOpenMobile(false)}
              className="absolute right-3 top-3 rounded-full p-1.5 text-bone/60 hover:bg-mist hover:text-bone"
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" />
              </svg>
            </button>
            <SidebarContent {...sharedProps} />
          </aside>
        </>
      )}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */

interface SidebarContentProps {
  tab: Tab;
  setTab: (t: Tab) => void;

  feed: LiveScoreFeed | null;
  todayError: string | null;
  todayGrouped: Array<{ code: string; label: string; matches: LiveScoreMatch[] }>;
  onRefreshToday: () => void;

  results: RecentResultsFeed | null;
  resultsError: string | null;
  resultsLoading: boolean;
  resultsGrouped: Array<{ key: string; label: string; matches: LiveScoreMatch[] }>;
  onRefreshResults: () => void;
}

function SidebarContent(p: SidebarContentProps) {
  const liveCount = p.feed?.live.length ?? 0;
  const updated =
    p.tab === "today"
      ? (p.feed?.fetchedAt ? formatTime(p.feed.fetchedAt) : null)
      : (p.results?.fetchedAt ? formatTime(p.results.fetchedAt) : null);

  // Surface the unique competitions currently in either feed so the user
  // can see at a glance what's being scanned.
  const leagueChips = useMemo(() => collectLeagueChips(p.feed, p.results), [p.feed, p.results]);

  const onRefresh = p.tab === "today" ? p.onRefreshToday : p.onRefreshResults;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-hairline bg-ink/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[11px] uppercase tracking-widest text-flag">
            Scores
          </p>
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-full p-1 text-bone/50 transition hover:bg-mist hover:text-bone"
            aria-label="Refresh"
            title="Refresh"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
        </div>

        {/* Tab strip */}
        <div className="mt-2 flex gap-1 rounded-md bg-mist/60 p-0.5">
          <TabButton active={p.tab === "today"} onClick={() => p.setTab("today")}>
            Today
            {liveCount > 0 && (
              <span className="ml-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-warn px-1 text-[9px] font-bold text-paper">
                {liveCount}
              </span>
            )}
          </TabButton>
          <TabButton active={p.tab === "results"} onClick={() => p.setTab("results")}>
            Recent Results
          </TabButton>
        </div>

        <p className="mt-1.5 text-[10px] text-bone/40">
          {p.tab === "today" ? (
            liveCount > 0 ? (
              <>
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-warn align-middle" />
                {" "}{liveCount} live
              </>
            ) : (
              <>No live matches</>
            )
          ) : (
            <>Last {RESULTS_DAYS} days · most recent first · cached 30 min</>
          )}
          {updated && <span className="text-bone/30"> · {updated}</span>}
        </p>
      </div>

      {/* Body */}
      <div className="flex-1 px-3 py-3">
        {p.tab === "today" ? (
          <TodayBody
            feed={p.feed} error={p.todayError} grouped={p.todayGrouped}
          />
        ) : (
          <ResultsBody
            results={p.results} error={p.resultsError} loading={p.resultsLoading}
            grouped={p.resultsGrouped}
          />
        )}
      </div>

      {/* Footer: which leagues are being scanned */}
      {leagueChips.length > 0 && (
        <div className="border-t border-hairline px-3 py-2.5">
          <p className="mb-1 font-mono text-[9px] uppercase tracking-widest text-bone/40">
            Covering
          </p>
          <div className="flex flex-wrap gap-1">
            {leagueChips.map(c => (
              <span key={c.code} className="rounded bg-mist/60 px-1.5 py-0.5 text-[9px] text-bone/70" title={c.name}>
                {COMP_BADGE[c.code] ?? c.code}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded px-2 py-1 text-xs font-medium transition ${
        active ? "bg-ink text-paper shadow-sm" : "text-bone/60 hover:text-bone"
      }`}
    >
      {children}
    </button>
  );
}

/* ─── Today view ─────────────────────────────────────────────────────── */

function TodayBody({
  feed, error, grouped,
}: {
  feed: LiveScoreFeed | null;
  error: string | null;
  grouped: Array<{ code: string; label: string; matches: LiveScoreMatch[] }>;
}) {
  if (error && !feed) {
    return <p className="px-2 py-4 text-xs text-warn/80">Couldn&apos;t reach the live feed ({error}). Will retry.</p>;
  }
  if (feed && grouped.length === 0) {
    return <p className="px-2 py-8 text-center text-xs text-bone/50">No matches in any supported league today.</p>;
  }
  return (
    <>
      {grouped.map(group => (
        <section key={group.code} className="mb-5 last:mb-0">
          <h3 className="mb-1.5 px-2 font-mono text-[10px] uppercase tracking-widest text-bone/40">
            {group.label}
          </h3>
          <ul className="space-y-px">
            {group.matches.map(m => <MatchRow key={m.id} match={m} />)}
          </ul>
        </section>
      ))}
    </>
  );
}

/* ─── Results view ───────────────────────────────────────────────────── */

function ResultsBody({
  results, error, loading, grouped,
}: {
  results: RecentResultsFeed | null;
  error: string | null;
  loading: boolean;
  grouped: Array<{ key: string; label: string; matches: LiveScoreMatch[] }>;
}) {
  if (loading && !results) {
    return <p className="px-2 py-8 text-center text-xs text-bone/50">Loading recent results…</p>;
  }
  if (error && !results?.matches.length) {
    return <p className="px-2 py-4 text-xs text-warn/80">Couldn&apos;t load results ({error}).</p>;
  }
  if (results && grouped.length === 0) {
    return <p className="px-2 py-8 text-center text-xs text-bone/50">No finished matches in the last few days.</p>;
  }
  return (
    <>
      {grouped.map(group => (
        <section key={group.key} className="mb-5 last:mb-0">
          <h3 className="mb-1.5 px-2 font-mono text-[10px] uppercase tracking-widest text-bone/40">
            {group.label}
          </h3>
          <ul className="space-y-px">
            {group.matches.map(m => <MatchRow key={m.id} match={m} showLeagueBadge />)}
          </ul>
        </section>
      ))}
    </>
  );
}

/* ─── Match row (shared) ─────────────────────────────────────────────── */

function MatchRow({ match, showLeagueBadge = false }: { match: LiveScoreMatch; showLeagueBadge?: boolean }) {
  const isLive = match.status === "IN_PLAY" || match.status === "PAUSED";
  const isFinished = match.status === "FINISHED";
  const isScheduled = !isLive && !isFinished;
  const timeOrStatus = isScheduled
    ? new Date(match.utcDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : isFinished
      ? "FT"
      : (match.minute ?? "LIVE");

  const showScore = isLive || isFinished;
  const leagueBadge = showLeagueBadge ? (COMP_BADGE[match.competitionCode] ?? match.competitionCode) : null;

  // Friendlies come from API-Football, not Football-Data.org. Their IDs
  // don't resolve on /matches/[id] (which queries FD) so we route them
  // to a parallel detail page that hits API-Football's /fixtures/{id}.
  const isFriendly = match.competitionCode === "FRIENDLY";
  const href = isFriendly ? `/matches/af/${match.id}` : `/matches/${match.id}`;

  const rowClass = `flex items-center gap-2 rounded px-2 py-1.5 text-xs transition ${
    isLive ? "bg-warn/10 hover:bg-warn/15" : "hover:bg-mist/60"
  }`;

  return (
    <li>
      <Link href={href} className={rowClass}>
        <span
          className={`w-8 shrink-0 text-center font-mono text-[10px] tabular ${
            isLive ? "text-warn" : isFinished ? "text-bone/40" : "text-flag/70"
          }`}
        >
          {timeOrStatus}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          {leagueBadge && (
            <span className="mb-0.5 font-mono text-[9px] uppercase tracking-wider text-bone/40">
              {leagueBadge}
            </span>
          )}
          <span className="flex items-center justify-between gap-2">
            <span className="truncate text-bone/90">{match.home.shortName}</span>
            {showScore && (
              <span className={`shrink-0 font-mono tabular ${isLive ? "font-bold text-paper" : "text-bone/80"}`}>
                {match.home.score ?? 0}
              </span>
            )}
          </span>
          <span className="flex items-center justify-between gap-2">
            <span className="truncate text-bone/90">{match.away.shortName}</span>
            {showScore && (
              <span className={`shrink-0 font-mono tabular ${isLive ? "font-bold text-paper" : "text-bone/80"}`}>
                {match.away.score ?? 0}
              </span>
            )}
          </span>
        </span>
      </Link>
    </li>
  );
}

/* ─── Grouping helpers ───────────────────────────────────────────────── */

function groupByLeague(feed: LiveScoreFeed | null): Array<{ code: string; label: string; matches: LiveScoreMatch[] }> {
  if (!feed) return [];
  const weighted: Array<LiveScoreMatch & { __w: number }> = [
    ...feed.live.map(m => ({ ...m, __w: 0 })),
    ...feed.upcoming.map(m => ({ ...m, __w: 1 })),
    ...feed.finished.map(m => ({ ...m, __w: 2 })),
  ];
  const byLeague = new Map<string, { label: string; matches: Array<LiveScoreMatch & { __w: number }>; minWeight: number }>();
  for (const m of weighted) {
    const entry = byLeague.get(m.competitionCode) ?? {
      label: COMP_BADGE[m.competitionCode] ?? m.competitionName,
      matches: [], minWeight: 99,
    };
    entry.matches.push(m);
    if (m.__w < entry.minWeight) entry.minWeight = m.__w;
    byLeague.set(m.competitionCode, entry);
  }
  return Array.from(byLeague.entries())
    .map(([code, v]) => ({
      code, label: v.label,
      matches: v.matches.sort((a, b) => a.__w - b.__w || a.utcDate.localeCompare(b.utcDate)),
      _weight: v.minWeight,
    }))
    .sort((a, b) => a._weight - b._weight || a.label.localeCompare(b.label))
    .map(({ code, label, matches }) => ({ code, label, matches }));
}

function groupByDay(feed: RecentResultsFeed | null): Array<{ key: string; label: string; matches: LiveScoreMatch[] }> {
  if (!feed) return [];
  const byDay = new Map<string, LiveScoreMatch[]>();
  for (const m of feed.matches) {
    const dayKey = m.utcDate.slice(0, 10); // YYYY-MM-DD
    if (!byDay.has(dayKey)) byDay.set(dayKey, []);
    byDay.get(dayKey)!.push(m);
  }
  return Array.from(byDay.entries())
    .sort((a, b) => b[0].localeCompare(a[0])) // newest day first
    .map(([dayKey, matches]) => ({
      key: dayKey,
      label: humanDayLabel(dayKey),
      matches: matches.sort((a, b) => b.utcDate.localeCompare(a.utcDate)),
    }));
}

function humanDayLabel(isoDay: string): string {
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  const day = new Date(`${isoDay}T00:00:00Z`);
  const diffDays = Math.round((today.getTime() - day.getTime()) / 86_400_000);
  if (diffDays === 1) return "Yesterday";
  if (diffDays === 0) return "Today";
  if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`;
  return day.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Collect the union of competition codes present in either feed. Used
 *  to render the "Covering" footer that shows the user which leagues are
 *  being scanned right now. */
function collectLeagueChips(
  todayFeed: LiveScoreFeed | null,
  resultsFeed: RecentResultsFeed | null,
): Array<{ code: string; name: string }> {
  const seen = new Map<string, string>();
  const consume = (m: LiveScoreMatch) => { if (!seen.has(m.competitionCode)) seen.set(m.competitionCode, m.competitionName); };
  if (todayFeed) {
    todayFeed.live.forEach(consume);
    todayFeed.upcoming.forEach(consume);
    todayFeed.finished.forEach(consume);
  }
  if (resultsFeed) resultsFeed.matches.forEach(consume);
  return Array.from(seen.entries())
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.code.localeCompare(b.code));
}
