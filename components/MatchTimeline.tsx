import type { Match } from "@/lib/types";

interface Props {
  match: Match;
}

/**
 * Score timeline for a finished or in-progress match.
 *
 * Built from the two checkpoints we capture: half-time and full-time
 * scores. That's enough to convey when each side scored (first half,
 * second half, or both) without inventing data we don't own.
 */
export default function MatchTimeline({ match }: Props) {
  if (match.status === "SCHEDULED" || match.status === "TIMED") return null;

  const ft = match.score;
  const ht = match.halfTime;
  if (!ft || ft.home == null || ft.away == null) return null;

  const htHome = ht?.home ?? 0;
  const htAway = ht?.away ?? 0;
  const fhHome = htHome;
  const fhAway = htAway;
  const shHome = ft.home - htHome;
  const shAway = ft.away - htAway;

  const isLive = match.status === "IN_PLAY" || match.status === "PAUSED" || match.status === "LIVE";

  return (
    <section className="mt-10">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-bone/40">Score timeline</h2>

      {/* Big final-or-current score */}
      <div className="mt-4 rounded-md border border-hairline bg-mist/40 p-6">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <p className="truncate text-right font-display text-xl font-extrabold text-bone">
            {match.home.shortName}
          </p>
          <p className="font-display text-4xl font-extrabold tabular text-paper md:text-5xl">
            {ft.home} <span className="text-bone/30">-</span> {ft.away}
          </p>
          <p className="truncate text-left font-display text-xl font-extrabold text-bone">
            {match.away.shortName}
          </p>
        </div>
        <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-widest text-bone/40">
          {isLive ? "Live" : "Full time"}
          {ht && ht.home != null && ht.away != null && (
            <> · HT {htHome}–{htAway}</>
          )}
        </p>
      </div>

      {/* Half-by-half breakdown */}
      {ht && ht.home != null && ht.away != null && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <HalfBlock
            label="First half"
            homeShort={match.home.shortName}
            awayShort={match.away.shortName}
            home={fhHome}
            away={fhAway}
          />
          <HalfBlock
            label={isLive ? "Second half (live)" : "Second half"}
            homeShort={match.home.shortName}
            awayShort={match.away.shortName}
            home={shHome}
            away={shAway}
          />
        </div>
      )}

      {/* Tiny stacked bar showing goal distribution by half (each goal = a tick) */}
      {ht && ht.home != null && ht.away != null && (ft.home > 0 || ft.away > 0) && (
        <div className="mt-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-bone/40">
            Goals by half
          </p>
          <div className="mt-2 space-y-1.5">
            <GoalTicks label={match.home.shortName} first={fhHome} second={shHome} accent="flag" />
            <GoalTicks label={match.away.shortName} first={fhAway} second={shAway} accent="edge" />
          </div>
          <p className="mt-2 font-mono text-[10px] text-bone/30">
            Each tick is a goal.
          </p>
        </div>
      )}
    </section>
  );
}

function HalfBlock({
  label, homeShort, awayShort, home, away,
}: { label: string; homeShort: string; awayShort: string; home: number; away: number }) {
  return (
    <div className="rounded-md border border-hairline bg-mist/40 p-4">
      <p className="text-xs text-bone/50">{label}</p>
      <p className="mt-1 font-display text-2xl font-extrabold tabular">
        {home} - {away}
      </p>
      <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-bone/40">
        {homeShort} v {awayShort}
      </p>
    </div>
  );
}

function GoalTicks({
  label, first, second, accent,
}: { label: string; first: number; second: number; accent: "flag" | "edge" }) {
  const color = accent === "flag" ? "bg-flag" : "bg-edge";
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 truncate font-mono text-[10px] uppercase tracking-wider text-bone/60">
        {label}
      </span>
      <div className="flex flex-1 items-center gap-0.5">
        {Array.from({ length: first }).map((_, i) => (
          <span key={`f-${i}`} className={`h-3 w-2 rounded-sm ${color} opacity-90`} aria-hidden />
        ))}
        {(first > 0 || second > 0) && (
          <span className="mx-1.5 h-3 w-px bg-bone/30" aria-hidden />
        )}
        {Array.from({ length: second }).map((_, i) => (
          <span key={`s-${i}`} className={`h-3 w-2 rounded-sm ${color} opacity-60`} aria-hidden />
        ))}
      </div>
    </div>
  );
}
