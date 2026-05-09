import Link from "next/link";
import type { MatchPrediction } from "@/lib/types";
import ProbabilityBar from "./ProbabilityBar";

const COMP_BADGE: Record<string, string> = {
  PL: "EPL", PD: "La Liga", BL1: "Bundesliga", SA: "Serie A",
  FL1: "Ligue 1", CL: "UCL", EC: "Euros", WC: "World Cup",
  DED: "Eredivisie", PPL: "Primeira", ELC: "Champ.", BSA: "Brasileirão",
};

export default function MatchCard({ p }: { p: MatchPrediction }) {
  const date = new Date(p.match.utcDate);
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const day = date.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });

  const highlight = p.value?.outcome ?? null;
  const isValue = p.value?.recommendation === "VALUE";

  return (
    <Link
      href={`/matches/${p.match.id}`}
      className="group relative block rounded-lg border border-hairline bg-mist/40 p-5 transition hover:border-flag/40 hover:bg-mist/70"
    >
      {isValue && (
        <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-edge/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-edge">
          <span className="h-1 w-1 rounded-full bg-edge" /> Value
        </span>
      )}

      <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-bone/40">
        <span className="font-mono">{COMP_BADGE[p.match.competitionCode] ?? p.match.competition}</span>
        <span>·</span>
        <span>{day} · {time}</span>
      </div>

      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <p className="text-right font-display text-lg font-semibold leading-tight md:text-xl">
          {p.match.home.shortName}
        </p>
        <span className="font-mono text-sm text-bone/40">vs</span>
        <p className="font-display text-lg font-semibold leading-tight md:text-xl">
          {p.match.away.shortName}
        </p>
      </div>

      <div className="mt-4">
        <ProbabilityBar
          probs={p.probabilities}
          highlight={highlight}
          homeLabel={p.match.home.shortName}
          awayLabel={p.match.away.shortName}
        />
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-bone/50">
        <span className="tabular">
          xG <span className="text-bone/80">{p.expectedGoals.home.toFixed(2)}-{p.expectedGoals.away.toFixed(2)}</span>
        </span>
        {p.value?.edgePct != null && p.value.outcome && (
          <span className={`font-mono tabular ${isValue ? "text-edge" : "text-bone/50"}`}>
            edge {p.value.edgePct >= 0 ? "+" : ""}{p.value.edgePct.toFixed(1)}%
          </span>
        )}
        <span className="tabular">BTTS {Math.round(p.bttsProb * 100)}%</span>
      </div>
    </Link>
  );
}
