import Link from "next/link";
import type { Match } from "@/lib/types";

interface Props {
  matches: Match[];
  /** ID of the team we're framing the H2H from. Wins/losses/draws are
   *  expressed from this side's perspective. */
  framingTeamId: number;
}

/**
 * Last N meetings between two clubs. Built from the FD /head2head endpoint
 * which returns up to ~10 results across competitions. Each row links to
 * its match detail page.
 */
export default function HeadToHeadSection({ matches, framingTeamId }: Props) {
  if (matches.length === 0) return null;

  const tally = { W: 0, D: 0, L: 0, GF: 0, GA: 0 };
  for (const m of matches) {
    if (!m.score || m.score.home == null || m.score.away == null) continue;
    const isHome = m.home.id === framingTeamId;
    const own = isHome ? m.score.home : m.score.away;
    const opp = isHome ? m.score.away : m.score.home;
    tally.GF += own;
    tally.GA += opp;
    if (own > opp) tally.W++;
    else if (own < opp) tally.L++;
    else tally.D++;
  }

  return (
    <section className="mt-10">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-bone/40">
        Head to head · last {matches.length}
      </h2>

      <div className="mt-4 grid grid-cols-5 gap-3 text-center">
        <Stat label="Wins"  value={tally.W} accent="edge" />
        <Stat label="Draws" value={tally.D} accent="bone" />
        <Stat label="Losses" value={tally.L} accent="warn" />
        <Stat label="Goals for" value={tally.GF} accent="bone" />
        <Stat label="Goals against" value={tally.GA} accent="bone" />
      </div>

      <ul className="mt-4 divide-y divide-hairline rounded-md border border-hairline bg-mist/40">
        {matches.map(m => {
          const date = new Date(m.utcDate).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
          const score = m.score && m.score.home != null && m.score.away != null
            ? `${m.score.home} - ${m.score.away}` : "—";
          const isHome = m.home.id === framingTeamId;
          const own = isHome ? (m.score?.home ?? 0) : (m.score?.away ?? 0);
          const opp = isHome ? (m.score?.away ?? 0) : (m.score?.home ?? 0);
          const tag = own > opp ? "W" : own < opp ? "L" : "D";
          const tagColor = tag === "W" ? "bg-edge/20 text-edge"
                         : tag === "L" ? "bg-warn/20 text-warn"
                         : "bg-mist text-bone/70";
          return (
            <li key={m.id}>
              <Link
                href={`/matches/${m.id}`}
                className="flex items-center gap-3 px-4 py-3 text-sm transition hover:bg-mist/60"
              >
                <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded font-mono text-[10px] font-bold ${tagColor}`}>
                  {tag}
                </span>
                <span className="w-24 shrink-0 font-mono text-[10px] uppercase tracking-wider text-bone/40">
                  {date}
                </span>
                <span className="flex-1 truncate text-bone/80">
                  {m.home.shortName} <span className="font-mono tabular text-paper">{score}</span> {m.away.shortName}
                </span>
                <span className="hidden font-mono text-[10px] uppercase tracking-wider text-bone/40 sm:inline">
                  {m.competition}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent: "edge" | "warn" | "bone" }) {
  const color = accent === "edge" ? "text-edge" : accent === "warn" ? "text-warn" : "text-paper";
  return (
    <div className="rounded-md border border-hairline bg-mist/40 p-3">
      <p className={`font-display text-2xl font-extrabold tabular ${color}`}>{value}</p>
      <p className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-bone/40">{label}</p>
    </div>
  );
}
