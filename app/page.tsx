import { getUpcomingMatches } from "@/lib/football-data";
import { getMarketOdds } from "@/lib/odds-api";
import { predictMatch } from "@/lib/predict-match";
import { getAccaHistoryForTier } from "@/lib/backtest";
import HomePageClient from "@/components/HomePageClient";
import Link from "next/link";

export const revalidate = 1800; // 30-minute ISR

const TIERS = [10, 100, 1000, 10000];

export default async function HomePage() {
  // 14-day lookahead surfaces tournament matches (World Cup, Euros, UCL
  // knockouts) ~2 weeks ahead instead of just 3 days. Same one upstream
  // call, no extra API quota. The 96h horizon inside the acca builder is
  // unchanged — accas still only consider near-future matches.
  const matches = await getUpcomingMatches(14);

  // Hydrate market odds in parallel (best-effort).
  const predictions = await Promise.all(
    matches.map(async m => {
      const odds = await getMarketOdds(m.competitionCode, m.home.name, m.away.name).catch(() => null);
      return predictMatch(m, odds ?? undefined);
    }),
  );

  const valueCount = predictions.filter(p => p.value?.recommendation === "VALUE").length;
  // Only mention "value spots" when odds data actually flowed in; otherwise
  // the "0 value spots" line is misleading (it means we couldn't reach the
  // odds provider, not that the model found no value). Set ODDS_API_KEY in
  // Vercel env vars to re-enable.
  const oddsDataAvailable = predictions.some(p => p.marketOdds != null);

  // Pull historical hit rate per tier from the backtesting database, indexed
  // by target so the client can look up whichever tier it ends up rendering.
  const historyEntries = await Promise.all(
    TIERS.map(async target => {
      const history = await getAccaHistoryForTier(target).catch(() => null);
      return [target, history] as const;
    }),
  );
  const accaHistoryByTier = Object.fromEntries(historyEntries) as Record<number, { hitRate: number; sampleSize: number } | null>;

  return (
    <div className="mx-auto max-w-6xl px-5 pt-12 pb-8">
      <section className="border-b border-hairline pb-12">
        <p className="font-mono text-[11px] uppercase tracking-widest text-flag">
          {predictions.length} matches modelled{oddsDataAvailable ? ` · ${valueCount} value spots` : ""}
        </p>
        <h1 className="mt-3 font-display text-4xl font-extrabold leading-[0.95] tracking-tighter md:text-6xl">
          Football probabilities,<br />
          <span className="italic text-bone/70">not predictions in disguise.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-base text-bone/70 md:text-lg">
          Every match below shows the model's outcome distribution and expected goals.
          Where market odds are available, we flag matches with measurable value. We don't
          tell you what to bet. We show you the maths and let you decide.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/learn"
            className="rounded-full border border-flag/40 bg-flag/5 px-5 py-2 text-sm font-semibold text-flag hover:bg-flag/15"
          >
            How the model works →
          </Link>
          <Link
            href="/bonuses"
            className="rounded-full border border-hairline px-5 py-2 text-sm font-semibold text-bone hover:border-bone/40"
          >
            Free sign-up bonuses
          </Link>
          <Link
            href="/track-record"
            className="rounded-full border border-hairline px-5 py-2 text-sm font-semibold text-bone hover:border-bone/40"
          >
            Track record →
          </Link>
        </div>
      </section>

      {predictions.length === 0 && (
        <p className="py-20 text-center text-bone/50">
          No matches in the supported leagues right now. Check back soon.
        </p>
      )}

      {predictions.length > 0 && (
        <HomePageClient
          predictions={predictions}
          accaHistoryByTier={accaHistoryByTier}
        />
      )}
    </div>
  );
}
