import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  getCompetition,
  getTopScorers,
  getCompetitionTimeline,
} from "@/lib/football-data";
import { getStandings, STANDINGS_LEAGUES } from "@/lib/standings";

export const revalidate = 1800;

const COMP_LABELS: Record<string, string> = Object.fromEntries(
  STANDINGS_LEAGUES.map(l => [l.code, l.label]),
);

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const upper = code.toUpperCase();
  const label = COMP_LABELS[upper] ?? upper;
  return {
    title: `${label}, standings, fixtures, top scorers`,
    description: `Live ${label} table, top scorers, recent results and upcoming fixtures, with statistical match probabilities.`,
  };
}

export default async function CompetitionHub({ params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params;
  const code = raw.toUpperCase();
  if (!STANDINGS_LEAGUES.some(l => l.code === code)) notFound();

  const [comp, standings, scorers, timeline] = await Promise.all([
    getCompetition(code),
    getStandings(code, 1800),
    getTopScorers(code, 15),
    getCompetitionTimeline(code, 6, 6),
  ]);

  const label = COMP_LABELS[code] ?? comp?.name ?? code;
  const country = comp?.area?.name;
  const season = comp?.currentSeason;
  const seasonStr = season?.startDate
    ? `${season.startDate.slice(0, 4)}${season.endDate ? `/${season.endDate.slice(2, 4)}` : ""}`
    : null;

  return (
    <article className="mx-auto max-w-5xl px-5 pt-10 pb-16">
      <Link href="/" className="inline-flex items-center gap-1 text-xs text-bone/50 hover:text-bone">
        ← All predictions
      </Link>

      <header className="mt-6 border-b border-hairline pb-8">
        <p className="font-mono text-[11px] uppercase tracking-widest text-flag">
          {country ? `${country} · ` : ""}{seasonStr ?? "Current season"}
          {season?.currentMatchday != null && <> · Matchday {season.currentMatchday}</>}
        </p>
        <h1 className="mt-3 font-display text-4xl font-extrabold leading-[0.95] tracking-tighter md:text-6xl">
          {label}
        </h1>
      </header>

      {/* ── Standings ── */}
      <section className="mt-10">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-bone/40">Standings</h2>
        {standings.rows.length === 0 ? (
          <p className="mt-4 text-sm text-bone/60">
            Standings unavailable right now ({standings.error ?? "no data"}).
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-md border border-hairline bg-mist/40">
            <table className="w-full text-sm">
              <thead className="border-b border-hairline">
                <tr className="text-[10px] uppercase tracking-wider text-bone/40">
                  <th className="px-3 py-2 text-left font-mono font-normal">#</th>
                  <th className="px-3 py-2 text-left font-mono font-normal">Team</th>
                  <th className="px-2 py-2 text-right font-mono font-normal">P</th>
                  <th className="px-2 py-2 text-right font-mono font-normal">W</th>
                  <th className="px-2 py-2 text-right font-mono font-normal">D</th>
                  <th className="px-2 py-2 text-right font-mono font-normal">L</th>
                  <th className="px-2 py-2 text-right font-mono font-normal">GF</th>
                  <th className="px-2 py-2 text-right font-mono font-normal">GA</th>
                  <th className="px-2 py-2 text-right font-mono font-normal">GD</th>
                  <th className="px-3 py-2 text-right font-mono font-normal">Pts</th>
                  <th className="hidden px-2 py-2 text-right font-mono font-normal sm:table-cell">Form</th>
                </tr>
              </thead>
              <tbody>
                {standings.rows.map(r => (
                  <tr key={`${r.position}-${r.teamId}`} className="border-t border-hairline/60">
                    <td className="px-3 py-2 text-left font-mono tabular text-bone/60">{r.position}</td>
                    <td className="px-3 py-2 text-bone/90" title={r.teamName}>{r.shortName}</td>
                    <td className="px-2 py-2 text-right font-mono tabular text-bone/70">{r.playedGames}</td>
                    <td className="px-2 py-2 text-right font-mono tabular text-bone/70">{r.won}</td>
                    <td className="px-2 py-2 text-right font-mono tabular text-bone/70">{r.draw}</td>
                    <td className="px-2 py-2 text-right font-mono tabular text-bone/70">{r.lost}</td>
                    <td className="px-2 py-2 text-right font-mono tabular text-bone/70">{r.goalsFor}</td>
                    <td className="px-2 py-2 text-right font-mono tabular text-bone/70">{r.goalsAgainst}</td>
                    <td className={`px-2 py-2 text-right font-mono tabular ${r.goalDifference > 0 ? "text-edge/80" : r.goalDifference < 0 ? "text-warn/70" : "text-bone/60"}`}>
                      {r.goalDifference > 0 ? `+${r.goalDifference}` : r.goalDifference}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-bold tabular text-paper">{r.points}</td>
                    <td className="hidden px-2 py-2 text-right font-mono text-[11px] tabular text-bone/50 sm:table-cell">
                      {r.form ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Two-column: Top Scorers + Recent Results ── */}
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {/* Top Scorers */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-bone/40">Top scorers</h2>
          {scorers.length === 0 ? (
            <p className="mt-4 text-sm text-bone/60">
              Scorer data isn&apos;t available for this competition on the free API tier yet.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-hairline rounded-md border border-hairline bg-mist/40">
              {scorers.map((s, i) => (
                <li key={s.player.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <span className="w-6 shrink-0 text-center font-mono text-[11px] text-bone/40">{i + 1}</span>
                  <span className="flex-1 truncate">
                    <span className="text-bone/90">{s.player.name}</span>
                    <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-bone/40">
                      {s.team.shortName ?? s.team.name}
                    </span>
                  </span>
                  <span className="font-display text-lg font-extrabold tabular text-paper">{s.goals}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent Results */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-bone/40">Recent results</h2>
          {timeline.recent.length === 0 ? (
            <p className="mt-4 text-sm text-bone/60">No recent results yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-hairline rounded-md border border-hairline bg-mist/40">
              {timeline.recent.map(m => (
                <li key={m.id}>
                  <Link href={`/matches/${m.id}`} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-mist/60">
                    <span className="w-16 shrink-0 font-mono text-[10px] uppercase tracking-wider text-bone/40">
                      {new Date(m.utcDate).toLocaleDateString([], { month: "short", day: "numeric" })}
                    </span>
                    <span className="flex-1 truncate text-bone/80">{m.home.shortName}</span>
                    <span className="font-mono tabular text-paper">
                      {m.score?.home ?? "—"} - {m.score?.away ?? "—"}
                    </span>
                    <span className="flex-1 truncate text-bone/80">{m.away.shortName}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* ── Upcoming Fixtures ── */}
      <section className="mt-10">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-bone/40">
          Upcoming fixtures
          {season?.currentMatchday != null && <span className="ml-2 text-bone/40">· Round {season.currentMatchday}</span>}
        </h2>
        {timeline.upcoming.length === 0 ? (
          <p className="mt-4 text-sm text-bone/60">No upcoming fixtures scheduled.</p>
        ) : (
          <ul className="mt-4 divide-y divide-hairline rounded-md border border-hairline bg-mist/40">
            {timeline.upcoming.map(m => {
              const d = new Date(m.utcDate);
              return (
                <li key={m.id}>
                  <Link href={`/matches/${m.id}`} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-mist/60">
                    <span className="w-20 shrink-0 font-mono text-[10px] uppercase tracking-wider text-flag/70">
                      {d.toLocaleDateString([], { weekday: "short" })} · {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="flex-1 truncate text-right text-bone/90">{m.home.shortName}</span>
                    <span className="font-mono text-[11px] uppercase tracking-wider text-bone/40">v</span>
                    <span className="flex-1 truncate text-bone/90">{m.away.shortName}</span>
                    {m.matchday != null && (
                      <span className="hidden w-12 shrink-0 text-right font-mono text-[10px] text-bone/40 sm:inline">
                        MD {m.matchday}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ── Teams in competition (derived from standings) ── */}
      {standings.rows.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-bone/40">Teams</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {standings.rows.map(r => (
              <li
                key={r.teamId}
                className="rounded-md border border-hairline bg-mist/40 px-3 py-1.5 text-xs text-bone/80"
                title={r.teamName}
              >
                {r.shortName}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-bone/40">
            {standings.rows.length} teams · {timeline.rounds.length} matchdays scheduled this season
          </p>
        </section>
      )}

      {/* ── Other competitions ── */}
      <section className="mt-12 border-t border-hairline pt-8">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-bone/40">Other competitions</h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {STANDINGS_LEAGUES.filter(l => l.code !== code).map(l => (
            <li key={l.code}>
              <Link
                href={`/competitions/${l.code}`}
                className="inline-flex rounded-full border border-hairline bg-mist/40 px-3 py-1.5 text-xs text-bone/80 transition hover:border-flag/40 hover:text-paper"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
