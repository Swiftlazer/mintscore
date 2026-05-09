import type { Metadata } from "next";
import { BOOKMAKERS, affiliateLinkWithTracking } from "@/lib/bookmakers";

export const metadata: Metadata = {
  title: "Bookmaker sign-up bonuses (Nigeria)",
  description: "Compare welcome bonuses from SportyBet, BetKing, 1xBet and more. Honest terms, real values, no fluff.",
};

export default function BonusesPage() {
  const sorted = [...BOOKMAKERS].sort((a, b) => b.rating - a.rating);

  return (
    <div className="mx-auto max-w-4xl px-5 pt-10 pb-16">
      <header className="border-b border-hairline pb-8">
        <p className="font-mono text-[11px] uppercase tracking-widest text-flag">
          {BOOKMAKERS.length} bookmakers · Nigeria-focused
        </p>
        <h1 className="mt-3 font-display text-4xl font-extrabold leading-[0.95] tracking-tighter md:text-5xl">
          Sign-up bonuses,<br />
          <span className="italic text-bone/70">terms read in plain English.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-base text-bone/70">
          Welcome bonuses can be genuinely positive expected value if you read the rollover
          terms and use them correctly. Skip a bookmaker if the rollover is heavy or the min-odds
          is steep — the bonus often won't survive the wagering.
        </p>
      </header>

      <ul className="mt-10 space-y-4">
        {sorted.map(bm => (
          <li key={bm.id} className="rounded-lg border border-hairline bg-mist/40 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h2 className="font-display text-2xl font-bold tracking-tight">{bm.name}</h2>
                  <div className="flex items-center gap-1 text-xs text-bone/60">
                    <span className="font-mono tabular">{bm.rating.toFixed(1)}</span>
                    <span>★</span>
                  </div>
                </div>
                <p className="mt-1 text-bone/80">{bm.signupBonus}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {bm.tags.map(t => (
                    <span key={t} className="rounded-full bg-ink px-2 py-0.5 text-[10px] uppercase tracking-widest text-bone/60">
                      {t}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-sm text-bone/60">
                  <span className="font-semibold text-bone/80">Terms:</span> {bm.freeBetTerms}
                </p>
              </div>
              <a
                href={affiliateLinkWithTracking(bm, "bonus")}
                target="_blank"
                rel="noopener sponsored"
                className="inline-flex items-center justify-center self-start rounded-full bg-flag px-5 py-2.5 text-sm font-bold text-ink transition hover:bg-flag/85"
              >
                Claim bonus →
              </a>
            </div>
          </li>
        ))}
      </ul>

      <section className="mt-12 rounded-lg border border-warn/30 bg-warn/5 p-6">
        <h2 className="font-display text-xl font-bold text-warn">A word of caution</h2>
        <p className="mt-2 text-sm text-bone/80">
          Welcome bonuses are designed to extract a deposit from you, not give you free money. A 100%
          bonus with 8x rollover at min-odds 3.00 means you have to wager 8× the bonus amount on selections
          where the model gives you ~33% chance per leg. Most users don't clear the rollover. Use a
          bonus only if you'd be making the same bets without it.
        </p>
      </section>
    </div>
  );
}
