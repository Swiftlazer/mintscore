import { getUpcomingMatches } from "@/lib/football-data";
import { getMarketOdds } from "@/lib/odds-api";
import { predictMatch } from "@/lib/predict-match";
import { compileAllTargets } from "@/lib/accumulator";
import MatchCard from "@/components/MatchCard";
import AccumulatorCard from "@/components/AccumulatorCard";
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

  // Group by date for cleaner scanning.
  const grouped = predictions.reduce<Record<string, typeof predictions>>((acc, p) => {
    const day = new Date(p.match.utcDate).toISOString().slice(0, 10);
    (acc[day] ??= []).push(p);
    return acc;
  }, {});

  const days = Object.keys(grouped).sort();
  const valueCount = predictions.filter(p => p.value?.recommendation === "VALUE").length;

  // Compile aggregator accumulators across the day's most-confident model picks.
  // We use only matches in the next 48 hours to keep the slate fresh.
  const horizonMs = 48 * 60 * 60 * 1000;
  const now = Date.now();
  const accaPool = predictions.filter(
    p => new Date(p.match.utcDate).getTime() - now < horizonMs,
  );
  const accas = compileAllTargets(accaPool);
  const anyAcca = accas.some(a => a.acc !== null);

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
        </div>
      </section>

      {days.length === 0 && (
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
                Three accas built from the model's<br className="hidden md:block" /> most-confident picks today
              </h2>
            </div>
            <Link href="/learn#accumulators" className="hidden text-xs text-bone/50 hover:text-bone md:block">
              Why accas eat your bankroll →
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {accas.map(({ target, acc }) => (
              <div key={target}>
                {acc ? (
                  <AccumulatorCard acc={acc} />
                ) : (
                  <div className="flex h-full min-h-48 flex-col items-center justify-center rounded-lg border border-hairline bg-mist/20 p-5 text-center">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-bone/40">
                      {target} odds
                    </p>
                    <p className="mt-3 text-sm text-bone/60">
                      Not enough high-confidence picks today to build this tier.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="mt-4 max-w-3xl text-xs text-bone/50">
            Joint probability assumes leg outcomes are independent — they're not, perfectly. Real
            variance is higher than the model shows. Accumulators amplify both upside and model error;
            keep stakes small and treat the 1000-odds slot as entertainment, not investment.
          </p>
        </section>
      )}

      {days.map(day => (
        <section key={day} className="mt-12">
          <h2 className="mb-4 font-display text-xl font-bold tracking-tight text-bone">
            {new Date(day).toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" })}
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {grouped[day].map(p => (
              <MatchCard key={p.match.id} p={p} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
