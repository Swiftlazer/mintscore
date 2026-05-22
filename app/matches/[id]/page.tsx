import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getMatchById, getHeadToHead, getRecentTeamMatches, getTopScorers } from "@/lib/football-data";
import { getMarketOdds } from "@/lib/odds-api";
import { predictMatch } from "@/lib/predict-match";
import ProbabilityBar from "@/components/ProbabilityBar";
import BookmakerLinks from "@/components/BookmakerLinks";
import ShareButtons from "@/components/ShareButtons";
import MatchTimeline from "@/components/MatchTimeline";
import HeadToHeadSection from "@/components/HeadToHeadSection";
import MatchContextSection from "@/components/MatchContextSection";

export const revalidate = 1800;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const match = await getMatchById(Number(id));
  if (!match) return { title: "Match not found" };
  const title = `${match.home.name} vs ${match.away.name}, prediction & probabilities`;
  return {
    title,
    description: `Statistical probabilities, expected goals, and value-bet analysis for ${match.home.name} vs ${match.away.name} in the ${match.competition}.`,
    openGraph: { title, type: "article" },
  };
}

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const match = await getMatchById(Number(id));
  if (!match) notFound();

  const [market, h2h, homeForm, awayForm, topScorers] = await Promise.all([
    getMarketOdds(match.competitionCode, match.home.name, match.away.name).catch(() => null),
    getHeadToHead(match.id, 6).catch(() => [] as Awaited<ReturnType<typeof getHeadToHead>>),
    getRecentTeamMatches(match.home.id, 5).catch(() => []),
    getRecentTeamMatches(match.away.id, 5).catch(() => []),
    getTopScorers(match.competitionCode, 12).catch(() => []),
  ]);
  const p = predictMatch(match, market ?? undefined);

  const date = new Date(match.utcDate);
  const dateStr = date.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  // JSON-LD for Google rich results
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `${match.home.name} vs ${match.away.name}`,
    startDate: match.utcDate,
    sport: "Soccer",
    homeTeam: { "@type": "SportsTeam", name: match.home.name },
    awayTeam: { "@type": "SportsTeam", name: match.away.name },
    location: { "@type": "Place", name: match.home.name },
  };

  return (
    <article className="mx-auto max-w-4xl px-5 pt-10 pb-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Link href="/" className="inline-flex items-center gap-1 text-xs text-bone/50 hover:text-bone">
        ← All predictions
      </Link>

      <header className="mt-6 border-b border-hairline pb-8">
        <p className="font-mono text-[11px] uppercase tracking-widest text-flag">
          {match.competition} · {dateStr} · {time}
        </p>
        <h1 className="mt-3 font-display text-4xl font-extrabold leading-[0.95] tracking-tighter md:text-6xl">
          {match.home.name}
          <span className="block text-bone/40 italic">vs</span>
          {match.away.name}
        </h1>
      </header>

      <MatchTimeline match={match} />

      <section className="mt-10">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-bone/40">Outcome probabilities</h2>
        <div className="mt-4">
          <ProbabilityBar
            probs={p.probabilities}
            highlight={p.value?.outcome ?? null}
            homeLabel={match.home.shortName}
            awayLabel={match.away.shortName}
          />
        </div>
        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          {(["home", "draw", "away"] as const).map(k => {
            const labels = { home: match.home.shortName, draw: "Draw", away: match.away.shortName } as const;
            const pct = Math.round(p.probabilities[k] * 100);
            const fair = p.fairOdds[k];
            return (
              <div key={k} className="rounded-md border border-hairline bg-mist/40 p-4">
                <p className="text-xs text-bone/50">{labels[k]}</p>
                <p className="mt-1 font-display text-3xl font-extrabold tabular text-paper">{pct}%</p>
                <p className="mt-1 font-mono text-[11px] text-bone/40">fair odds {fair.toFixed(2)}</p>
              </div>
            );
          })}
        </div>
      </section>

      {p.marketOdds && p.value && (
        <section className="mt-10">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-bone/40">Market vs model</h2>
          <div className="mt-4 rounded-md border border-hairline bg-mist/40 p-5">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-bone/50">Market median</p>
                <p className="mt-1 font-mono tabular text-bone">
                  {p.marketOdds.home?.toFixed(2)} / {p.marketOdds.draw?.toFixed(2)} / {p.marketOdds.away?.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-bone/50">Model edge</p>
                <p className={`mt-1 font-mono tabular ${(p.value.edgePct ?? 0) > 0 ? "text-edge" : "text-bone"}`}>
                  {p.value.edgePct != null ? `${p.value.edgePct >= 0 ? "+" : ""}${p.value.edgePct.toFixed(1)}%` : ", "}
                </p>
              </div>
              <div>
                <p className="text-bone/50">Recommended stake</p>
                <p className="mt-1 font-mono tabular text-bone">
                  {p.value.kellyFractionPct != null && p.value.kellyFractionPct > 0
                    ? `${p.value.kellyFractionPct.toFixed(2)}% of bankroll`
                    : "no stake"}
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm text-bone/70">
              {p.value.recommendation === "VALUE" && (
                <>
                  Model rates the <span className="font-semibold text-edge">{p.value.outcome}</span> outcome higher
                  than the market. Stake is at quarter-Kelly, conservative because models are imperfect and full Kelly is brutal on losing streaks.
                </>
              )}
              {p.value.recommendation === "FAIR" && "Market is roughly aligned with the model. No edge worth chasing here."}
              {p.value.recommendation === "AVOID" && "Market disagrees strongly with the model. Best to skip, sit this one out."}
            </p>
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-bone/40">Goal expectations</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-md border border-hairline bg-mist/40 p-5">
            <p className="text-xs text-bone/50">Expected goals (xG)</p>
            <p className="mt-1 font-display text-2xl font-extrabold tabular">
              {p.expectedGoals.home.toFixed(2)} - {p.expectedGoals.away.toFixed(2)}
            </p>
          </div>
          <div className="rounded-md border border-hairline bg-mist/40 p-5">
            <p className="text-xs text-bone/50">Both teams to score</p>
            <p className="mt-1 font-display text-2xl font-extrabold tabular">{Math.round(p.bttsProb * 100)}%</p>
          </div>
          <div className="rounded-md border border-hairline bg-mist/40 p-5">
            <p className="text-xs text-bone/50">Over 2.5 goals</p>
            <p className="mt-1 font-display text-2xl font-extrabold tabular">{Math.round(p.over25Prob * 100)}%</p>
          </div>
          <div className="rounded-md border border-hairline bg-mist/40 p-5">
            <p className="text-xs text-bone/50">Under 2.5 goals</p>
            <p className="mt-1 font-display text-2xl font-extrabold tabular">{Math.round((1 - p.over25Prob) * 100)}%</p>
          </div>
        </div>
      </section>

      <HeadToHeadSection matches={h2h} framingTeamId={match.home.id} />

      <MatchContextSection
        homeMatches={homeForm}
        awayMatches={awayForm}
        homeId={match.home.id}
        awayId={match.away.id}
        homeName={match.home.shortName}
        awayName={match.away.shortName}
        topScorers={topScorers}
        competitionName={match.competition}
      />

      <section className="mt-10">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-bone/40">Most likely scorelines</h2>
        <ul className="mt-4 divide-y divide-hairline rounded-md border border-hairline bg-mist/40">
          {p.topScorelines.map((s, i) => (
            <li key={`${s.home}-${s.away}`} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-4">
                <span className="font-mono text-xs text-bone/40">#{i + 1}</span>
                <span className="font-display text-lg font-bold tabular">{s.home} - {s.away}</span>
              </div>
              <span className="font-mono text-sm tabular text-bone/70">{(s.prob * 100).toFixed(1)}%</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12 border-t border-hairline pt-8">
        <BookmakerLinks matchId={match.id} source="match" />
      </section>

      <section className="mt-10 border-t border-hairline pt-8">
        <ShareButtons
          title={`${match.home.name} vs ${match.away.name} prediction`}
          description={`Model gives ${match.home.shortName} ${Math.round(p.probabilities.home*100)}% / Draw ${Math.round(p.probabilities.draw*100)}% / ${match.away.shortName} ${Math.round(p.probabilities.away*100)}%`}
          url={`${process.env.NEXT_PUBLIC_SITE_URL ?? "https://mintscore.com.ng"}/matches/${match.id}`}
        />
      </section>

      <p className="mt-8 text-xs text-bone/40">
        Probabilities derived from a Poisson goal-expectancy model with Dixon-Coles low-score correction.{" "}
        <Link href="/learn" className="underline hover:text-bone">Read about the method →</Link>
      </p>
    </article>
  );
}
