import { getUpcomingMatches } from "@/lib/football-data";
import { getMarketOdds } from "@/lib/odds-api";
import { predictMatch } from "@/lib/predict-match";
import { compileAllTargets, compilePerLeague } from "@/lib/accumulator";
import { getAccaHistoryForTier } from "@/lib/backtest";
import HomePageClient from "@/components/HomePageClient";
import Link from "next/link";

export const revalidate = 1800; // 30-minute ISR

export default async function HomePage() {
  const matches = await getUpcomingMatches(3);

  // Hydrate market odds in parallel (best-effort).
  const predictions = await Promise.all(
    matches.map(async m => {
      const odds = await getMarketOdds(m.competitionCode, m.home.name, m.away.name).catch(() => null);
      return predictMatch(m, odds ?? undefined);
    }),
  );

  // Plain-object payload for the client component.
  const dayMatches = predictions.map(p => ({
    matchId: p.match.id,
    homeId: p.match.home.id,
    awayId: p.match.away.id,
    homeName: p.match.home.name,
    awayName: p.match.away.name,
    homeShort: p.match.home.shortName,
    awayShort: p.match.away.shortName,
    competitionCode: p.match.competitionCode,
    competition: p.match.competition,
    utcDate: p.match.utcDate,
    probabilities: p.probabilities,
    expectedGoals: p.expectedGoals,
    bttsProb: p.bttsProb,
    over25Prob: p.over25Prob,
    valueOutcome: p.value?.outcome ?? null,
    valueRecommendation: p.value?.recommendation ?? null,
    valueEdgePct: p.value?.edgePct ?? null,
  }));

  const valueCount = predictions.filter(p => p.value?.recommendation === "VALUE").length;

  // Compile accas across the day's most-confident model picks.
  const horizonMs = 48 * 60 * 60 * 1000;
  const now = Date.now();
  const accaPool = predictions.filter(
    p => new Date(p.match.utcDate).getTime() - now < horizonMs,
  );
  const accas = compileAllTargets(accaPool);

  // Pull historical hit rate per tier from the backtesting database.
  const accaHistory = await Promise.all(
    accas.map(({ target }) => getAccaHistoryForTier(target).catch(() => null)),
  );

  // Compile per-league accumulators.
  const perLeague = compilePerLeague(accaPool, 10);

  return (
    <div className="mx-auto max-w-6xl px-5 pt-12 pb-8">
      <section className="border-b border-hairline pb-12">
        <p className="font-mono text-[11px] uppercase tracking-widest text-flag">
          {predictions.length} matches modelled · {valueCount} value spots
        </p>
        <h1 className="mt-3 font-display text-4xl font-extrabold leading-[0.95] tracking-tighter md:text-6xl">
          Football probabilities,<br />
          <span className="italic text-bone/70">not predictions in disguise.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-base text-bone/70 md:text-lg">
          Every match below comes with the model's outcome distribution, expected goals,
          and — where market odds exist — a flag if there's measurable value. We don't
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
          matches={dayMatches}
          mainAccas={accas}
          perLeague={perLeague}
          accaHistory={accaHistory}
        />
      )}
    </div>
  );
}
