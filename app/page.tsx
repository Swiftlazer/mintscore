import { getUpcomingMatches } from "@/lib/football-data";
import { getMarketOdds } from "@/lib/odds-api";
import { predictMatch } from "@/lib/predict-match";
import { compileAllTargets, compilePerLeague } from "@/lib/accumulator";
import { getAccaHistoryForTier } from "@/lib/backtest";
import AccumulatorCard from "@/components/AccumulatorCard";
import MatchListClient from "@/components/MatchListClient";
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

  // Plain-object payload for the client component (predictions contain
  // typed fields that pass cleanly through the server-component boundary).
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
  const anyAcca = accas.some(a => a.acc !== null);

  // Pull historical hit rate per tier from the backtesting database.
  // Returns empty values gracefully if the database isn't configured.
  const accaHistory = await Promise.all(
    accas.map(({ target }) => getAccaHistoryForTier(target).catch(() => null)),
  );

  // Compile per-league accumulators for the leagues that have enough fixtures.
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

      {anyAcca && (
        <section className="mt-12">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-widest text-flag">
                Daily aggregator accas
              </p>
              <h2 className="mt-1 font-display text-2xl font-bold tracking-tight md:text-3xl">
                Four accas from the model's<br className="hidden md:block" /> most-confident picks today
              </h2>
            </div>
            <Link href="/learn#accumulators" className="hidden text-xs text-bone/50 hover:text-bone md:block">
              Why accas eat your bankroll →
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {accas.map(({ target, acc }, i) => {
              const history = accaHistory[i];
              return (
                <div key={target}>
                  {acc ? (
                    <AccumulatorCard
                      acc={acc}
                      historicalHitRate={history?.hitRate}
                      historicalSampleSize={history?.sampleSize}
                    />
                  ) : (
                    <div className="flex h-full min-h-48 flex-col items-center justify-center rounded-lg border border-hairline bg-mist/20 p-5 text-center">
                      <p className="font-mono text-[10px] uppercase tracking-widest text-bone/40">
                        {target.toLocaleString()} odds
                      </p>
                      <p className="mt-3 text-sm text-bone/60">
                        Not enough high-confidence picks today to build this tier.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-4 max-w-3xl text-xs text-bone/50">
            Joint probability assumes leg outcomes are independent — they're not, perfectly. Real
            variance is higher than the model shows. Accumulators amplify both upside and model error;
            keep stakes small and treat the 1000-odd and 10,000-odd slots as entertainment, not investment.
          </p>
        </section>
      )}

      {perLeague.length > 0 && (
        <section className="mt-12">
          <div className="mb-5">
            <p className="font-mono text-[11px] uppercase tracking-widest text-flag">
              Best per league
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold tracking-tight md:text-3xl">
              Safest 10-odds acca for each league
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-bone/60">
              The same algorithm as above, but built only from a single competition's fixtures —
              useful if you prefer to bet within one league.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {perLeague.map(({ competitionCode, competitionName, acc }) => (
              <div key={competitionCode}>
                <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-bone/50">
                  {competitionName}
                </p>
                <AccumulatorCard acc={acc} />
              </div>
            ))}
          </div>
        </section>
      )}

      {predictions.length > 0 && (
        <MatchListClient matches={dayMatches} />
      )}
    </div>
  );
}
