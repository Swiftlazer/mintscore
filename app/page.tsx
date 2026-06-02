import { getUpcomingMatches } from "@/lib/football-data";
import { getUpcomingFriendlies } from "@/lib/api-football";
import { getMarketOdds } from "@/lib/odds-api";
import { predictMatch } from "@/lib/predict-match";
import { getAccaHistoryForTier } from "@/lib/backtest";
import HomePageClient from "@/components/HomePageClient";
import Link from "next/link";

export const revalidate = 1800; // 30-minute ISR

const TIERS = [10, 100, 1000, 10000];

export default async function HomePage() {
  const [leagueMatches, friendlyMatches] = await Promise.all([
    getUpcomingMatches(14),
    getUpcomingFriendlies(14),
  ]);
  const matches = [...leagueMatches, ...friendlyMatches]
    .sort((a, b) => a.utcDate.localeCompare(b.utcDate));

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
        <section className="py-16">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-mono text-[11px] uppercase tracking-widest text-bone/40">
              No fixtures in window
            </p>
            <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-bone md:text-3xl">
              Football&apos;s quiet right now.
            </h2>
            <p className="mt-4 text-bone/70">
              No matches from the supported competitions are scheduled in the next 14 days.
              Top European leagues are between seasons until August. In the meantime:
            </p>

            <ul className="mt-6 grid gap-3 text-left sm:grid-cols-2">
              <li>
                <Link
                  href="/competitions/BSA"
                  className="block rounded-md border border-hairline bg-mist/40 p-4 transition hover:border-flag/40"
                >
                  <p className="font-mono text-[10px] uppercase tracking-widest text-flag">In season now</p>
                  <p className="mt-1 font-semibold text-bone">Brasileirão Série A →</p>
                  <p className="mt-1 text-xs text-bone/60">Year-round Brazilian top flight</p>
                </Link>
              </li>
              <li>
                <Link
                  href="/competitions/WC"
                  className="block rounded-md border border-hairline bg-mist/40 p-4 transition hover:border-edge/40"
                >
                  <p className="font-mono text-[10px] uppercase tracking-widest text-edge">Starts soon</p>
                  <p className="mt-1 font-semibold text-bone">FIFA World Cup 2026 →</p>
                  <p className="mt-1 text-xs text-bone/60">Group stage from June 11</p>
                </Link>
              </li>
            </ul>

            <p className="mt-6 text-xs text-bone/50">
              The left sidebar still tracks live scores and recent results across every competition we cover.
            </p>
          </div>
        </section>
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
