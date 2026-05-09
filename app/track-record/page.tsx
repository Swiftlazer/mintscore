import type { Metadata } from "next";
import Link from "next/link";
import {
  getOverallAccuracy,
  getAccuracyByMarket,
  getAccuracyByCompetition,
  getRecentResults,
} from "@/lib/backtest";

export const metadata: Metadata = {
  title: "Track record",
  description: "Historical accuracy of Mintscore's predictions, broken down by market and competition. Honest reporting — wins and losses both.",
};

export const revalidate = 1800; // refresh every 30 minutes

export default async function TrackRecordPage() {
  const [overall, byMarket, byComp, recent] = await Promise.all([
    getOverallAccuracy(),
    getAccuracyByMarket(),
    getAccuracyByCompetition(),
    getRecentResults(20),
  ]);

  const noData = !overall || overall.totalResulted === 0;

  return (
    <article className="mx-auto max-w-4xl px-5 pt-10 pb-16">
      <header className="border-b border-hairline pb-8">
        <p className="font-mono text-[11px] uppercase tracking-widest text-flag">Track record</p>
        <h1 className="mt-3 font-display text-4xl font-extrabold leading-[0.95] tracking-tighter md:text-6xl">
          The receipts.<br />
          <span className="italic text-bone/70">Wins and losses, openly.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-base text-bone/70 md:text-lg">
          Every prediction we publish is logged before kickoff and matched against the actual
          result after final whistle. This page reports those outcomes — not curated highlights, the
          full tape. If the model is wrong on something, it's recorded here.
        </p>
      </header>

      {noData && (
        <section className="mt-12 rounded-lg border border-flag/30 bg-flag/5 p-6 text-bone/85">
          <p className="font-display text-xl font-bold tracking-tight text-flag">
            No data yet
          </p>
          <p className="mt-2 text-sm">
            Predictions started being logged on this site recently and we wait for matches to
            finish before reporting results. This page will start filling out within 24-48 hours of
            the next round of fixtures completing. Check back in a few days.
          </p>
        </section>
      )}

      {!noData && overall && (
        <section className="mt-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-bone/40">Overall</p>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <div className="rounded-md border border-hairline bg-mist/40 p-5">
              <p className="text-xs text-bone/50">Predictions resulted</p>
              <p className="mt-1 font-display text-3xl font-extrabold tabular text-paper">
                {overall.totalResulted.toLocaleString()}
              </p>
            </div>
            <div className="rounded-md border border-hairline bg-mist/40 p-5">
              <p className="text-xs text-bone/50">Hits</p>
              <p className="mt-1 font-display text-3xl font-extrabold tabular text-edge">
                {overall.hits.toLocaleString()}
              </p>
            </div>
            <div className="rounded-md border border-hairline bg-mist/40 p-5">
              <p className="text-xs text-bone/50">Hit rate</p>
              <p className="mt-1 font-display text-3xl font-extrabold tabular text-flag">
                {(overall.hitRate * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </section>
      )}

      {byMarket.length > 0 && (
        <section className="mt-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-bone/40">By market</p>
          <p className="mt-2 text-sm text-bone/60">
            Different market types have different baseline accuracy. A 75% favourite winning at
            home isn't the same achievement as a 55% over-2.5 call landing.
          </p>
          <ul className="mt-4 divide-y divide-hairline rounded-md border border-hairline bg-mist/40">
            {byMarket.map(row => {
              const beats = row.hitRate >= row.expectedHitRate ? "edge" : "warn";
              return (
                <li key={row.market} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-paper">{row.marketLabel}</p>
                    <p className="mt-0.5 text-xs text-bone/50">
                      n = {row.totalResulted.toLocaleString()} · model expected {Math.round(row.expectedHitRate * 100)}%
                    </p>
                  </div>
                  <p className={`font-mono tabular text-${beats === "edge" ? "edge" : "warn"} text-lg font-bold`}>
                    {(row.hitRate * 100).toFixed(1)}%
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {byComp.length > 0 && (
        <section className="mt-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-bone/40">By competition</p>
          <ul className="mt-4 divide-y divide-hairline rounded-md border border-hairline bg-mist/40">
            {byComp.map(row => (
              <li key={row.competitionCode} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-paper">{row.competitionName}</p>
                  <p className="mt-0.5 text-xs text-bone/50">n = {row.totalResulted.toLocaleString()}</p>
                </div>
                <p className="font-mono tabular text-lg font-bold">
                  {(row.hitRate * 100).toFixed(1)}%
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {recent.length > 0 && (
        <section className="mt-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-bone/40">Recent results</p>
          <ul className="mt-4 space-y-3">
            {recent.map(r => (
              <li key={r.matchId} className="rounded-md border border-hairline bg-mist/40 p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <Link href={`/matches/${r.matchId}`} className="font-display text-lg font-bold tracking-tight hover:text-flag">
                    {r.homeName} <span className="text-bone/40 mx-1">{r.homeGoals}–{r.awayGoals}</span> {r.awayName}
                  </Link>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-bone/40 shrink-0">
                    {r.competitionName}
                  </span>
                </div>
                <ul className="mt-3 grid gap-2 sm:grid-cols-3">
                  {r.predictions.map((pp, i) => (
                    <li
                      key={i}
                      className={`rounded border px-3 py-2 text-xs ${
                        pp.result === "HIT"
                          ? "border-edge/30 bg-edge/[0.05] text-edge"
                          : "border-warn/30 bg-warn/[0.05] text-warn"
                      }`}
                    >
                      <p className="font-semibold">{pp.marketLabel}</p>
                      <p className="mt-0.5 font-mono text-[10px] tabular opacity-80">
                        Model {(pp.predictedProbability * 100).toFixed(0)}% · {pp.result}
                      </p>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-12 text-xs text-bone/50">
        Methodology: predictions are snapshotted at 03:00 UTC daily for matches in the next 48
        hours. Results are pulled from Football-Data.org as soon as matches finish. We log all
        predictions before kickoff — there's no cherry-picking.
      </p>
    </article>
  );
}
