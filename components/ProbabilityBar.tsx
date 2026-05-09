import type { OutcomeProbabilities } from "@/lib/types";

export default function ProbabilityBar({
  probs,
  highlight,
  homeLabel = "1",
  awayLabel = "2",
}: {
  probs: OutcomeProbabilities;
  highlight?: "home" | "draw" | "away" | null;
  homeLabel?: string;
  awayLabel?: string;
}) {
  const h = Math.round(probs.home * 100);
  const d = Math.round(probs.draw * 100);
  const a = Math.max(0, 100 - h - d); // ensures the three add to 100

  const cell = (
    pct: number,
    label: string,
    isHighlight: boolean,
    rounded: "left" | "middle" | "right",
  ) => {
    const radius =
      rounded === "left" ? "rounded-l" :
      rounded === "right" ? "rounded-r" : "";
    return (
      <div
        className={`flex h-9 items-center justify-center text-xs font-semibold tabular ${radius} ${
          isHighlight
            ? "bg-flag text-ink"
            : "bg-mist text-bone/80"
        }`}
        style={{ width: `${pct}%`, minWidth: pct > 0 ? "2rem" : "0" }}
        title={`${label}: ${pct}%`}
      >
        {pct >= 8 ? `${pct}%` : ""}
      </div>
    );
  };

  return (
    <div>
      <div className="flex w-full overflow-hidden rounded">
        {cell(h, homeLabel, highlight === "home", "left")}
        {cell(d, "Draw", highlight === "draw", "middle")}
        {cell(a, awayLabel, highlight === "away", "right")}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] uppercase tracking-widest text-bone/40">
        <span>{homeLabel} win</span>
        <span>Draw</span>
        <span>{awayLabel} win</span>
      </div>
    </div>
  );
}
