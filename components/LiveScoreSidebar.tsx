"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import type { LiveScoreFeed, LiveScoreMatch } from "@/lib/livescore";

const COMP_BADGE: Record<string, string> = {
  PL: "EPL", PD: "La Liga", BL1: "Bundesliga", SA: "Serie A",
  FL1: "Ligue 1", CL: "UCL", EC: "Euros", WC: "World Cup",
  DED: "Eredivisie", PPL: "Primeira", ELC: "Champ.", BSA: "Brasileirão",
};

const POLL_MS = 60_000;

export default function LiveScoreSidebar() {
  const [feed, setFeed] = useState<LiveScoreFeed | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [openMobile, setOpenMobile] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/livescore", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as LiveScoreFeed;
      setFeed(data);
      setLoadError(data.error ?? null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "fetch failed");
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    // Refresh again whenever the tab regains focus so stale state catches up quickly.
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => { clearInterval(id); window.removeEventListener("focus", onFocus); };
  }, [load]);

  // Show "Live" badge with count on the mobile FAB whenever something is in play.
  const liveCount = feed?.live.length ?? 0;

  // Order leagues by activity (live first, then upcoming, then finished).
  const grouped = useMemo(() => groupByLeague(feed), [feed]);

  return (
    <>
      {/* ─── Desktop: persistent left rail on xl+ screens ─── */}
      <aside
        className="fixed left-0 top-16 bottom-0 hidden w-[280px] overflow-y-auto border-r border-hairline bg-ink/95 backdrop-blur-md xl:block"
        aria-label="Live scores"
      >
        <SidebarContent feed={feed} grouped={grouped} loadError={loadError} onRefresh={load} />
      </aside>

      {/* ─── Mobile / tablet: floating action button (bottom-left) + slide-in drawer ─── */}
      <button
        type="button"
        onClick={() => setOpenMobile(true)}
        className="fixed bottom-5 left-5 z-40 inline-flex items-center gap-2 rounded-full bg-flag px-4 py-2.5 text-sm font-bold text-ink shadow-lg shadow-flag/20 transition hover:scale-[1.02] xl:hidden"
        aria-label={`Open live scores${liveCount > 0 ? ` (${liveCount} live)` : ""}`}
      >
        <span className={`inline-block h-2 w-2 rounded-full ${liveCount > 0 ? "animate-pulse bg-warn" : "bg-ink/40"}`} />
        Live{liveCount > 0 ? ` · ${liveCount}` : ""}
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
            aria-label="Live scores"
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
            <SidebarContent feed={feed} grouped={grouped} loadError={loadError} onRefresh={load} />
          </aside>
        </>
      )}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */

function groupByLeague(feed: LiveScoreFeed | null): Array<{ code: string; label: string; matches: LiveScoreMatch[] }> {
  if (!feed) return [];
  // Combine all matches but tag with a sort weight: live=0, upcoming=1, finished=2.
  // Within a league we preserve that ordering so live games appear at the top.
  const weighted: Array<LiveScoreMatch & { __w: number }> = [
    ...feed.live.map(m => ({ ...m, __w: 0 })),
    ...feed.upcoming.map(m => ({ ...m, __w: 1 })),
    ...feed.finished.map(m => ({ ...m, __w: 2 })),
  ];
  const byLeague = new Map<string, { label: string; matches: Array<LiveScoreMatch & { __w: number }>; minWeight: number }>();
  for (const m of weighted) {
    const entry = byLeague.get(m.competitionCode) ?? {
      label: COMP_BADGE[m.competitionCode] ?? m.competitionName,
      matches: [],
      minWeight: 99,
    };
    entry.matches.push(m);
    if (m.__w < entry.minWeight) entry.minWeight = m.__w;
    byLeague.set(m.competitionCode, entry);
  }
  return Array.from(byLeague.entries())
    .map(([code, v]) => ({
      code,
      label: v.label,
      matches: v.matches.sort((a, b) => a.__w - b.__w || a.utcDate.localeCompare(b.utcDate)),
      _weight: v.minWeight,
    }))
    .sort((a, b) => a._weight - b._weight || a.label.localeCompare(b.label))
    .map(({ code, label, matches }) => ({ code, label, matches }));
}

interface SidebarContentProps {
  feed: LiveScoreFeed | null;
  grouped: Array<{ code: string; label: string; matches: LiveScoreMatch[] }>;
  loadError: string | null;
  onRefresh: () => void;
}

function SidebarContent({ feed, grouped, loadError, onRefresh }: SidebarContentProps) {
  const updated = feed?.fetchedAt
    ? new Date(feed.fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;
  const liveCount = feed?.live.length ?? 0;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-hairline bg-ink/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[11px] uppercase tracking-widest text-flag">
            Live scores
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
        <p className="mt-1 text-[10px] text-bone/40">
          {liveCount > 0 ? (
            <>
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-warn align-middle" />
              {" "}
              {liveCount} live now · refreshes every 60s
            </>
          ) : (
            <>No live matches · updates every 60s</>
          )}
          {updated && <span className="text-bone/30"> · {updated}</span>}
        </p>
      </div>

      {/* Body */}
      <div className="flex-1 px-3 py-3">
        {loadError && !feed && (
          <p className="px-2 py-4 text-xs text-warn/80">
            Couldn't reach the live feed ({loadError}). Will retry automatically.
          </p>
        )}
        {feed && grouped.length === 0 && (
          <p className="px-2 py-8 text-center text-xs text-bone/50">
            No matches scheduled in supported leagues today.
          </p>
        )}
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
      </div>
    </div>
  );
}

function MatchRow({ match }: { match: LiveScoreMatch }) {
  const isLive = match.status === "IN_PLAY" || match.status === "PAUSED";
  const isFinished = match.status === "FINISHED";
  const isScheduled = !isLive && !isFinished;
  const timeOrStatus = isScheduled
    ? new Date(match.utcDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : isFinished
      ? "FT"
      : (match.minute ?? "LIVE");

  const showScore = isLive || isFinished;

  return (
    <li>
      <Link
        href={`/matches/${match.id}`}
        className={`flex items-center gap-2 rounded px-2 py-1.5 text-xs transition ${
          isLive ? "bg-warn/10 hover:bg-warn/15" : "hover:bg-mist/60"
        }`}
      >
        <span
          className={`w-8 shrink-0 text-center font-mono text-[10px] tabular ${
            isLive ? "text-warn" : isFinished ? "text-bone/40" : "text-flag/70"
          }`}
        >
          {timeOrStatus}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
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
