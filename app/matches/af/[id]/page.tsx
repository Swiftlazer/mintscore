import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  getFriendlyMatchDetail,
  getFriendlyPrediction,
  type FriendlyEvent,
  type FriendlyLineupSide,
  type FriendlyTeamStatistics,
} from "@/lib/api-football";

export const revalidate = 3600;

interface PageProps { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const match = await getFriendlyMatchDetail(Number(id));
  if (!match) return { title: "Match not found" };
  return {
    title: `${match.home.name} vs ${match.away.name} — ${match.competitionName}`,
    description: `${match.competitionName}${match.round ? ` (${match.round})` : ""}. Lineups, events, and statistics.`,
  };
}

export default async function FriendlyMatchPage({ params }: PageProps) {
  const { id } = await params;
  const fixtureId = Number(id);
  if (Number.isNaN(fixtureId)) notFound();

  const [match, prediction] = await Promise.all([
    getFriendlyMatchDetail(fixtureId),
    getFriendlyPrediction(fixtureId),
  ]);
  if (!match) notFound();

  const isLive = match.status === "IN_PLAY" || match.status === "PAUSED";
  const isFinished = match.status === "FINISHED";
  const isScheduled = !isLive && !isFinished;

  const kickoff = new Date(match.utcDate);
  const kickoffLabel = kickoff.toLocaleString([], {
    weekday: "short", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <article className="mx-auto max-w-4xl px-5 pt-10 pb-16">
      <Link href="/" className="inline-flex items-center gap-1 text-xs text-bone/50 hover:text-bone">
        ← Home
      </Link>

      <header className="mt-6 border-b border-hairline pb-8">
        <p className="font-mono text-[11px] uppercase tracking-widest text-flag">
          {match.competitionName}
          {match.round && <> · {match.round}</>}
        </p>

        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <p className="truncate text-right font-display text-2xl font-extrabold text-bone md:text-3xl">
            {match.home.name}
          </p>
          <div className="text-center">
            {(isLive || isFinished) && (
              <p className="font-display text-4xl font-extrabold tabular text-paper md:text-5xl">
                {match.home.score ?? 0} <span className="text-bone/30">-</span> {match.away.score ?? 0}
              </p>
            )}
            {isScheduled && (
              <p className="font-display text-lg font-bold text-bone/70">
                {kickoff.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
            <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-bone/40">
              {isLive ? (match.minute ?? "Live") : isFinished ? "Full time" : kickoff.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
              {isFinished && match.halftime && match.halftime.home != null && match.halftime.away != null && (
                <> · HT {match.halftime.home}–{match.halftime.away}</>
              )}
            </p>
          </div>
          <p className="truncate text-left font-display text-2xl font-extrabold text-bone md:text-3xl">
            {match.away.name}
          </p>
        </div>

        {(match.venue.name || match.referee) && (
          <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-wider text-bone/40">
            {match.venue.name}{match.venue.city ? `, ${match.venue.city}` : ""}
            {match.referee && <> · ref. {match.referee}</>}
          </p>
        )}
        {isScheduled && (
          <p className="mt-2 text-center text-sm text-bone/60">{kickoffLabel}</p>
        )}
      </header>

      {prediction && (prediction.homePct + prediction.drawPct + prediction.awayPct) > 0 && (
        <PredictionBlock prediction={prediction} homeName={match.home.name} awayName={match.away.name} />
      )}

      {match.events.length > 0 && (
        <EventsTimeline events={match.events} homeTeamId={match.home.id} awayTeamId={match.away.id} />
      )}

      {match.lineups.length > 0 && (
        <LineupsSection lineups={match.lineups} homeTeamId={match.home.id} />
      )}

      {match.statistics.length > 0 && (
        <StatisticsTable statistics={match.statistics} homeTeamId={match.home.id} />
      )}

      {match.events.length === 0 && match.lineups.length === 0 && match.statistics.length === 0 && (
        <section className="mt-10 rounded-md border border-hairline bg-mist/40 p-6 text-center">
          <p className="text-sm text-bone/60">
            Detailed match data hasn&apos;t been published yet — usually appears closer to kickoff.
          </p>
        </section>
      )}
    </article>
  );
}

/* ─── Prediction widget ──────────────────────────────────────────────── */

function PredictionBlock({
  prediction, homeName, awayName,
}: { prediction: NonNullable<Awaited<ReturnType<typeof getFriendlyPrediction>>>; homeName: string; awayName: string }) {
  const { homePct, drawPct, awayPct, advice } = prediction;
  return (
    <section className="mt-10">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-bone/40">Match prediction</h2>
      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <ProbCard label={homeName} pct={homePct} accent="flag" />
        <ProbCard label="Draw" pct={drawPct} accent="bone" />
        <ProbCard label={awayName} pct={awayPct} accent="edge" />
      </div>
      {advice && (
        <p className="mt-3 text-center text-xs text-bone/60">
          <span className="font-mono uppercase tracking-wider text-bone/40">Tip:</span> {advice}
        </p>
      )}
    </section>
  );
}

function ProbCard({ label, pct, accent }: { label: string; pct: number; accent: "flag" | "edge" | "bone" }) {
  const color = accent === "flag" ? "text-flag" : accent === "edge" ? "text-edge" : "text-paper";
  return (
    <div className="rounded-md border border-hairline bg-mist/40 p-4">
      <p className={`font-display text-3xl font-extrabold tabular ${color}`}>{Math.round(pct * 100)}%</p>
      <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-wider text-bone/40" title={label}>
        {label}
      </p>
    </div>
  );
}

/* ─── Events timeline widget ─────────────────────────────────────────── */

function EventsTimeline({
  events, homeTeamId,
}: { events: FriendlyEvent[]; homeTeamId: number; awayTeamId: number }) {
  const ordered = [...events].sort((a, b) => {
    if (a.minute !== b.minute) return a.minute - b.minute;
    return (a.extraMinute ?? 0) - (b.extraMinute ?? 0);
  });

  return (
    <section className="mt-10">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-bone/40">Events</h2>
      <ul className="mt-4 divide-y divide-hairline rounded-md border border-hairline bg-mist/40">
        {ordered.map((e, i) => {
          const isHome = e.teamId === homeTeamId;
          const minuteLabel = e.extraMinute != null ? `${e.minute}+${e.extraMinute}'` : `${e.minute}'`;
          return (
            <li key={i} className="grid grid-cols-[3rem_1fr_auto_1fr] items-center gap-3 px-4 py-2.5 text-sm">
              <span className="font-mono text-[11px] tabular text-bone/50">{minuteLabel}</span>
              <span className={`truncate ${isHome ? "text-right text-bone/90" : "text-bone/30"}`}>
                {isHome ? <EventLabel e={e} /> : null}
              </span>
              <span className="shrink-0">{eventIcon(e)}</span>
              <span className={`truncate ${!isHome ? "text-bone/90" : "text-bone/30"}`}>
                {!isHome ? <EventLabel e={e} /> : null}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function EventLabel({ e }: { e: FriendlyEvent }) {
  if (e.type === "subst") {
    return (
      <>
        <span className="text-bone/90">{e.player ?? "—"}</span>
        {e.assist && <span className="text-bone/40"> ← {e.assist}</span>}
      </>
    );
  }
  return (
    <>
      <span className="text-bone/90">{e.player ?? "—"}</span>
      {e.assist && <span className="text-bone/40"> ({e.assist})</span>}
    </>
  );
}

function eventIcon(e: FriendlyEvent): React.ReactElement {
  if (e.type === "Goal") return <span className="text-lg" title={e.detail}>⚽</span>;
  if (e.type === "Card") {
    const isRed = /red/i.test(e.detail);
    return (
      <span
        className={`inline-block h-3.5 w-2.5 rounded-sm ${isRed ? "bg-warn" : "bg-flag"}`}
        title={e.detail}
      />
    );
  }
  if (e.type === "subst") return <span className="font-mono text-[10px] text-edge" title="Substitution">⇅</span>;
  if (e.type === "Var") return <span className="font-mono text-[10px] text-bone/50" title="VAR">VAR</span>;
  return <span className="text-bone/40">·</span>;
}

/* ─── Lineups widget ─────────────────────────────────────────────────── */

function LineupsSection({
  lineups, homeTeamId,
}: { lineups: FriendlyLineupSide[]; homeTeamId: number }) {
  const home = lineups.find(l => l.teamId === homeTeamId);
  const away = lineups.find(l => l.teamId !== homeTeamId);
  if (!home && !away) return null;

  return (
    <section className="mt-10">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-bone/40">Lineups</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {home && <LineupCard side={home} />}
        {away && <LineupCard side={away} />}
      </div>
    </section>
  );
}

function LineupCard({ side }: { side: FriendlyLineupSide }) {
  return (
    <div className="rounded-md border border-hairline bg-mist/40 p-4">
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-[10px] uppercase tracking-widest text-bone/40">{side.teamName}</p>
        {side.formation && (
          <p className="font-mono text-[10px] tabular text-flag/80">{side.formation}</p>
        )}
      </div>
      {side.coach.name && (
        <p className="mt-1 text-[11px] text-bone/50">Coach: {side.coach.name}</p>
      )}

      <p className="mt-4 font-mono text-[9px] uppercase tracking-wider text-bone/40">Starting XI</p>
      <ul className="mt-2 space-y-1">
        {side.startingXI.map(p => (
          <li key={p.id} className="flex items-center gap-2 text-xs">
            <span className="w-6 shrink-0 text-center font-mono tabular text-bone/40">{p.number ?? "-"}</span>
            <span className="flex-1 truncate text-bone/90">{p.name}</span>
            {p.position && <span className="shrink-0 font-mono text-[9px] uppercase tracking-wider text-bone/40">{p.position}</span>}
          </li>
        ))}
      </ul>

      {side.substitutes.length > 0 && (
        <>
          <p className="mt-4 font-mono text-[9px] uppercase tracking-wider text-bone/40">Bench</p>
          <ul className="mt-2 space-y-1">
            {side.substitutes.map(p => (
              <li key={p.id} className="flex items-center gap-2 text-xs">
                <span className="w-6 shrink-0 text-center font-mono tabular text-bone/40">{p.number ?? "-"}</span>
                <span className="flex-1 truncate text-bone/70">{p.name}</span>
                {p.position && <span className="shrink-0 font-mono text-[9px] uppercase tracking-wider text-bone/40">{p.position}</span>}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/* ─── Statistics widget ──────────────────────────────────────────────── */

function StatisticsTable({
  statistics, homeTeamId,
}: { statistics: FriendlyTeamStatistics[]; homeTeamId: number }) {
  const home = statistics.find(s => s.teamId === homeTeamId);
  const away = statistics.find(s => s.teamId !== homeTeamId);
  if (!home && !away) return null;

  // Build a unified key list so home/away rows align.
  const keys = new Set<string>();
  home?.stats.forEach(s => keys.add(s.type));
  away?.stats.forEach(s => keys.add(s.type));

  return (
    <section className="mt-10">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-bone/40">Statistics</h2>
      <ul className="mt-4 divide-y divide-hairline rounded-md border border-hairline bg-mist/40">
        {Array.from(keys).map(key => {
          const h = home?.stats.find(s => s.type === key)?.value;
          const a = away?.stats.find(s => s.type === key)?.value;
          return (
            <li key={key} className="grid grid-cols-3 items-center gap-3 px-4 py-2 text-sm">
              <span className="text-right font-mono tabular text-bone/80">{h ?? "—"}</span>
              <span className="text-center font-mono text-[10px] uppercase tracking-wider text-bone/40">{key}</span>
              <span className="text-left font-mono tabular text-bone/80">{a ?? "—"}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
