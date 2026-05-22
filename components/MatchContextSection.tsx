import Link from "next/link";
import type { Match, Scorer } from "@/lib/types";

interface Props {
  homeMatches: Match[];     // last N finished matches for home team
  awayMatches: Match[];     // last N finished matches for away team
  homeId: number;
  awayId: number;
  homeName: string;
  awayName: string;
  topScorers: Scorer[];      // top scorers of the competition
  competitionName: string;
}

/**
 * Context panel rendered on the match detail page. Surfaces:
 *
 *   - Each team's last 5 results (Win/Draw/Loss + scoreline)
 *   - The competition's current top scorers, with anyone playing in
 *     this match highlighted in their own panel
 */
export default function MatchContextSection({
  homeMatches, awayMatches, homeId, awayId, homeName, awayName, topScorers, competitionName,
}: Props) {
  if (homeMatches.length === 0 && awayMatches.length === 0 && topScorers.length === 0) {
    return null;
  }

  // Pick out top scorers whose team is in this match — surface them at top.
  const scorersInThisMatch = topScorers.filter(
    s => s.team.id === homeId || s.team.id === awayId,
  );
  const otherTopScorers = topScorers.filter(
    s => s.team.id !== homeId && s.team.id !== awayId,
  ).slice(0, 8);

  return (
    <section className="mt-10">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-bone/40">
        Form & scorers
      </h2>

      {/* Two-column form panel */}
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <FormPanel teamName={homeName} teamId={homeId} matches={homeMatches} />
        <FormPanel teamName={awayName} teamId={awayId} matches={awayMatches} />
      </div>

      {/* Top scorers in this match (highlighted) */}
      {scorersInThisMatch.length > 0 && (
        <div className="mt-6">
          <h3 className="font-mono text-[10px] uppercase tracking-widest text-flag">
            Top scorers playing today
          </h3>
          <ul className="mt-2 divide-y divide-hairline rounded-md border border-flag/30 bg-flag/[0.04]">
            {scorersInThisMatch.map(s => (
              <li key={s.player.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="flex-1 truncate">
                  <span className="text-bone/90">{s.player.name}</span>
                  <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-bone/40">
                    {s.team.shortName ?? s.team.name}
                  </span>
                </span>
                <span className="font-display text-lg font-extrabold tabular text-paper">{s.goals}</span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-bone/40">goals</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Competition context: other top scorers */}
      {otherTopScorers.length > 0 && (
        <div className="mt-6">
          <h3 className="font-mono text-[10px] uppercase tracking-widest text-bone/40">
            {competitionName} top scorers
          </h3>
          <ul className="mt-2 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
            {otherTopScorers.map((s, i) => (
              <li key={s.player.id} className="flex items-center gap-2 py-1">
                <span className="w-5 shrink-0 font-mono text-[10px] text-bone/40">{i + 1}</span>
                <span className="flex-1 truncate text-bone/80">{s.player.name}</span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-bone/40">
                  {s.team.shortName ?? s.team.name}
                </span>
                <span className="font-mono tabular text-bone/90">{s.goals}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function FormPanel({ teamName, teamId, matches }: { teamName: string; teamId: number; matches: Match[] }) {
  if (matches.length === 0) {
    return (
      <div className="rounded-md border border-hairline bg-mist/40 p-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-bone/40">{teamName}</p>
        <p className="mt-2 text-sm text-bone/50">Recent form unavailable.</p>
      </div>
    );
  }

  let wins = 0, draws = 0, losses = 0;
  const tiles = matches.map(m => {
    if (!m.score || m.score.home == null || m.score.away == null) {
      return { tag: "—", color: "text-bone/40 bg-mist/60" };
    }
    const isHome = m.home.id === teamId;
    const own = isHome ? m.score.home : m.score.away;
    const opp = isHome ? m.score.away : m.score.home;
    if (own > opp) { wins++; return { tag: "W", color: "text-edge bg-edge/15" }; }
    if (own < opp) { losses++; return { tag: "L", color: "text-warn bg-warn/15" }; }
    draws++;
    return { tag: "D", color: "text-bone bg-mist" };
  });

  return (
    <div className="rounded-md border border-hairline bg-mist/40 p-4">
      <p className="font-mono text-[10px] uppercase tracking-widest text-bone/40">{teamName} · last {matches.length}</p>
      <div className="mt-2 flex items-center gap-1.5">
        {tiles.map((t, i) => (
          <span
            key={i}
            className={`inline-flex h-6 w-6 items-center justify-center rounded font-mono text-[10px] font-bold ${t.color}`}
          >
            {t.tag}
          </span>
        ))}
      </div>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-bone/50">
        {wins}W · {draws}D · {losses}L
      </p>
      <ul className="mt-3 space-y-1">
        {matches.slice(0, 3).map(m => {
          const date = new Date(m.utcDate).toLocaleDateString([], { month: "short", day: "numeric" });
          return (
            <li key={m.id}>
              <Link href={`/matches/${m.id}`} className="flex items-center gap-2 text-xs text-bone/70 hover:text-bone">
                <span className="w-12 shrink-0 font-mono text-[10px] text-bone/40">{date}</span>
                <span className="flex-1 truncate">
                  {m.home.shortName} <span className="font-mono tabular text-bone/90">{m.score?.home ?? "—"}-{m.score?.away ?? "—"}</span> {m.away.shortName}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
