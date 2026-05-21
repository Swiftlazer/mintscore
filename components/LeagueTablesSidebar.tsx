"use client";

import { useEffect, useState, useCallback } from "react";
import { STANDINGS_LEAGUES, type StandingsTable } from "@/lib/standings";

const STORAGE_KEY = "mintscore:standings:league";
const DEFAULT_CODE = "PL";

export default function LeagueTablesSidebar() {
  const [code, setCode] = useState<string>(DEFAULT_CODE);
  const [hydratedCode, setHydratedCode] = useState(false);
  const [table, setTable] = useState<StandingsTable | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [openMobile, setOpenMobile] = useState(false);

  // Hydrate league choice from localStorage on mount so the user's
  // preferred league sticks across visits.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved && STANDINGS_LEAGUES.some(l => l.code === saved)) setCode(saved);
    } catch { /* ignore */ }
    setHydratedCode(true);
  }, []);

  // Persist the selection.
  useEffect(() => {
    if (!hydratedCode) return;
    try { window.localStorage.setItem(STORAGE_KEY, code); } catch { /* ignore */ }
  }, [code, hydratedCode]);

  const load = useCallback(async (forCode: string) => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/standings?code=${encodeURIComponent(forCode)}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as StandingsTable;
      setTable(data);
      setLoadError(data.error ?? null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "fetch failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (hydratedCode) load(code); }, [code, hydratedCode, load]);

  return (
    <>
      {/* ─── Desktop: persistent right rail on xl+ screens ─── */}
      <aside
        className="fixed right-0 top-16 bottom-0 hidden w-[280px] overflow-y-auto border-l border-hairline bg-ink/95 backdrop-blur-md xl:block"
        aria-label="League tables"
      >
        <SidebarContent
          code={code} setCode={setCode}
          table={table} loading={loading} loadError={loadError}
          onRefresh={() => load(code)}
        />
      </aside>

      {/* ─── Mobile / tablet: floating action button (bottom-right) + slide-in drawer ─── */}
      <button
        type="button"
        onClick={() => setOpenMobile(true)}
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-edge px-4 py-2.5 text-sm font-bold text-ink shadow-lg shadow-edge/20 transition hover:scale-[1.02] xl:hidden"
        aria-label="Open league tables"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
        Tables
      </button>

      {openMobile && (
        <>
          <div
            className="fixed inset-0 z-40 bg-ink/70 backdrop-blur-sm xl:hidden"
            onClick={() => setOpenMobile(false)}
            aria-hidden="true"
          />
          <aside
            className="fixed bottom-0 right-0 top-0 z-50 w-[88%] max-w-sm overflow-y-auto border-l border-hairline bg-ink shadow-2xl xl:hidden"
            aria-label="League tables"
          >
            <button
              type="button"
              onClick={() => setOpenMobile(false)}
              className="absolute left-3 top-3 rounded-full p-1.5 text-bone/60 hover:bg-mist hover:text-bone"
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" />
              </svg>
            </button>
            <SidebarContent
              code={code} setCode={setCode}
              table={table} loading={loading} loadError={loadError}
              onRefresh={() => load(code)}
            />
          </aside>
        </>
      )}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */

interface SidebarContentProps {
  code: string;
  setCode: (c: string) => void;
  table: StandingsTable | null;
  loading: boolean;
  loadError: string | null;
  onRefresh: () => void;
}

function SidebarContent({ code, setCode, table, loading, loadError, onRefresh }: SidebarContentProps) {
  const updated = table?.fetchedAt
    ? new Date(table.fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-hairline bg-ink/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[11px] uppercase tracking-widest text-edge">
            League tables
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

        <select
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="mt-2 w-full cursor-pointer rounded-md border border-hairline bg-mist px-2.5 py-1.5 text-xs text-bone outline-none transition hover:border-edge/40 focus:border-edge"
          aria-label="Select competition"
        >
          {STANDINGS_LEAGUES.map(l => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </select>

        <p className="mt-1.5 text-[10px] text-bone/40">
          {table?.season && <>Season {table.season} · </>}
          {updated && <>updated {updated}</>}
          {loading && <span className="text-flag/70"> · loading…</span>}
        </p>

        <a
          href={`/competitions/${code}`}
          className="mt-2 inline-block font-mono text-[10px] text-edge/80 underline-offset-2 hover:underline"
        >
          Open full competition hub →
        </a>
      </div>

      {/* Body */}
      <div className="flex-1 px-2 py-2">
        {loadError && !table?.rows.length && (
          <p className="px-2 py-4 text-xs text-warn/80">
            Couldn't load standings ({loadError}). Try another league or refresh.
          </p>
        )}
        {table && table.rows.length === 0 && !loadError && !loading && (
          <p className="px-2 py-8 text-center text-xs text-bone/50">
            No table available for this competition right now.
          </p>
        )}
        {table && table.rows.length > 0 && (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-bone/40">
                <th className="px-1.5 py-1.5 text-left font-mono font-normal">#</th>
                <th className="px-1.5 py-1.5 text-left font-mono font-normal">Team</th>
                <th className="px-1.5 py-1.5 text-right font-mono font-normal">P</th>
                <th className="px-1.5 py-1.5 text-right font-mono font-normal">GD</th>
                <th className="px-1.5 py-1.5 text-right font-mono font-normal">Pts</th>
              </tr>
            </thead>
            <tbody>
              {table.rows.map(r => (
                <tr key={`${r.position}-${r.teamId}`} className="border-t border-hairline/60 transition hover:bg-mist/40">
                  <td className={`px-1.5 py-1.5 text-left font-mono tabular ${positionAccent(r.position, table.rows.length, table.competitionCode)}`}>
                    {r.position}
                  </td>
                  <td className="max-w-0 truncate px-1.5 py-1.5 text-bone/90" title={r.teamName}>
                    {r.shortName}
                  </td>
                  <td className="px-1.5 py-1.5 text-right font-mono tabular text-bone/70">{r.playedGames}</td>
                  <td className={`px-1.5 py-1.5 text-right font-mono tabular ${r.goalDifference > 0 ? "text-edge/80" : r.goalDifference < 0 ? "text-warn/70" : "text-bone/60"}`}>
                    {r.goalDifference > 0 ? `+${r.goalDifference}` : r.goalDifference}
                  </td>
                  <td className="px-1.5 py-1.5 text-right font-mono font-bold tabular text-paper">{r.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/**
 * Subtle colour cue on rank: top of table (UCL spots) in flag, mid in
 * default, bottom (relegation) in warn. Sizes vary by league so we use
 * a relative-to-total heuristic that's good enough for a sidebar glance.
 */
function positionAccent(pos: number, total: number, code: string): string {
  // Cup competitions: no relegation, top 16 advance from groups.
  if (code === "CL" || code === "EC" || code === "WC") {
    return pos <= 2 ? "text-flag" : "text-bone/50";
  }
  const ucl = Math.max(3, Math.round(total * 0.2));    // ~top 20%
  const relegation = Math.max(2, Math.round(total * 0.15)); // bottom ~15%
  if (pos <= ucl) return "text-flag";
  if (pos > total - relegation) return "text-warn/70";
  return "text-bone/50";
}
