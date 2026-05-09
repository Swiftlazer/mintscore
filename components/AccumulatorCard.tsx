import Link from "next/link";
import type { Accumulator } from "@/lib/types";

const TIER_COPY: Record<number, { headline: string; tagline: string; tone: "balanced" | "stretch" | "lottery" }> = {
  10:   { headline: "10 odds",   tagline: "Safest of the day's big-confidence picks",   tone: "balanced" },
  100:  { headline: "100 odds",  tagline: "Stretch acca — bigger payout, real variance", tone: "stretch" },
  1000: { headline: "1000 odds", tagline: "Lottery ticket — fun to dream, brutal maths", tone: "lottery" },
};

const TONE_CLASSES: Record<"balanced" | "stretch" | "lottery", string> = {
  balanced: "border-edge/30 bg-edge/[0.04]",
  stretch:  "border-flag/30 bg-flag/[0.03]",
  lottery:  "border-warn/30 bg-warn/[0.04]",
};

const TONE_ACCENT: Record<"balanced" | "stretch" | "lottery", string> = {
  balanced: "text-edge",
  stretch:  "text-flag",
  lottery:  "text-warn",
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function AccumulatorCard({ acc }: { acc: Accumulator }) {
  const meta = TIER_COPY[acc.targetOdds] ?? TIER_COPY[10];
  const tone = meta.tone;
  const hitPct = acc.jointProbability * 100;

  return (
    <div className={`flex flex-col rounded-lg border p-5 ${TONE_CLASSES[tone]}`}>
      <div className="flex items-baseline justify-between">
        <p className={`font-mono text-[10px] uppercase tracking-widest ${TONE_ACCENT[tone]}`}>
          {meta.headline}
        </p>
        <p className="font-mono text-[10px] uppercase tracking-widest text-bone/40">
          {acc.legs.length} legs
        </p>
      </div>

      <p className="mt-3 font-display text-5xl font-extrabold tabular leading-none">
        {acc.combinedFairOdds < 100
          ? acc.combinedFairOdds.toFixed(2)
          : Math.round(acc.combinedFairOdds).toLocaleString()}
        <span className="ml-1 text-base font-normal text-bone/40">odds</span>
      </p>

      <p className="mt-2 text-xs text-bone/60">{meta.tagline}</p>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <span className="text-bone/50">
          Hits ~<span className="font-mono tabular text-bone/80">{hitPct.toFixed(hitPct < 1 ? 2 : 1)}%</span>
        </span>
        <span className="text-bone/50">
          1 in <span className="font-mono tabular text-bone/80">{acc.oneInX.toLocaleString()}</span>
        </span>
      </div>

      <ul className="mt-4 flex-1 space-y-2 border-t border-hairline pt-4">
        {acc.legs.map(leg => (
          <li key={`${leg.matchId}-${leg.marketKey}`}>
            <Link
              href={`/matches/${leg.matchId}`}
              className="group flex items-start justify-between gap-3 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-bone/90 group-hover:text-paper">
                  {leg.homeShort} <span className="text-bone/40">vs</span> {leg.awayShort}
                </p>
                <p className="mt-0.5 truncate text-xs text-bone/50">
                  <span className={TONE_ACCENT[tone]}>{leg.market}</span>
                  <span className="ml-2 text-bone/30">·</span>
                  <span className="ml-2">{formatTime(leg.kickoffISO)}</span>
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-mono tabular text-bone/80">{leg.fairOdds.toFixed(2)}</p>
                <p className="text-[10px] text-bone/40">{Math.round(leg.probability * 100)}%</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
