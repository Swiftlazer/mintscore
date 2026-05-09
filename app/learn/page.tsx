import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Learn — expected value, bankroll, and how the model works",
  description: "Understand expected value, bankroll management, and responsible gambling. The maths matter — most punters lose because they don't know it.",
};

export default function LearnPage() {
  return (
    <article className="mx-auto max-w-3xl px-5 pt-10 pb-16">
      <header className="border-b border-hairline pb-8">
        <p className="font-mono text-[11px] uppercase tracking-widest text-flag">Plain-English explainers</p>
        <h1 className="mt-3 font-display text-4xl font-extrabold leading-[0.95] tracking-tighter md:text-6xl">
          The maths most punters<br />
          <span className="italic text-bone/70">never get told.</span>
        </h1>
        <p className="mt-5 text-base text-bone/70">
          Three things separate disciplined bettors from the 95% who lose: understanding expected
          value, sizing stakes correctly, and knowing when to stop. None of these are hard. They're
          just rarely explained without an upsell attached.
        </p>
      </header>

      <section id="ev" className="mt-12">
        <h2 className="font-display text-3xl font-bold tracking-tight">1 · Expected Value (EV)</h2>
        <p className="mt-4 text-bone/80">
          Every bet has an expected value — what it pays on average over many repetitions.
          A simple formula:
        </p>
        <pre className="mt-4 overflow-x-auto rounded-md border border-hairline bg-mist/40 p-5 font-mono text-sm text-flag tabular">
EV = (probability of winning × profit if you win) − (probability of losing × stake)
        </pre>
        <p className="mt-4 text-bone/80">
          Example: you bet ₦1,000 at decimal odds 2.50 on a team you think has a 45% chance of winning.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-md border border-hairline bg-mist/40 p-5 font-mono text-sm tabular">
{`profit if win  = ₦1,000 × (2.50 − 1) = ₦1,500
EV  = (0.45 × ₦1,500) − (0.55 × ₦1,000)
    = ₦675 − ₦550
    = +₦125 per bet (positive — value bet)`}
        </pre>
        <p className="mt-4 text-bone/80">
          Flip it. Same odds, but you only think there's a 35% chance:
        </p>
        <pre className="mt-4 overflow-x-auto rounded-md border border-hairline bg-mist/40 p-5 font-mono text-sm tabular">
{`EV = (0.35 × ₦1,500) − (0.65 × ₦1,000)
   = ₦525 − ₦650
   = −₦125 per bet (negative — sucker bet)`}
        </pre>
        <p className="mt-4 text-bone/80">
          Bookmakers' edge is built into the odds. To win long-term you need bets where your
          estimate of probability is more accurate than the bookmaker's — that's the only edge that exists.
          When you see the green <span className="font-mono text-edge">VALUE</span> tag on Mintscore,
          it means our model thinks the bookmaker has mispriced the line.
        </p>
      </section>

      <section id="bankroll" className="mt-16">
        <h2 className="font-display text-3xl font-bold tracking-tight">2 · Bankroll & stake sizing</h2>
        <p className="mt-4 text-bone/80">
          Your bankroll is the total money you've decided to risk on betting. It must be money you
          can afford to lose entirely without affecting rent, food, school fees, or savings. If you
          can't afford ₦20,000 to disappear, your bankroll is not ₦20,000.
        </p>
        <p className="mt-4 text-bone/80">
          The Kelly Criterion is the mathematically optimal stake size given your edge:
        </p>
        <pre className="mt-4 overflow-x-auto rounded-md border border-hairline bg-mist/40 p-5 font-mono text-sm text-flag tabular">
stake fraction = (edge as decimal) ÷ (decimal odds − 1)
        </pre>
        <p className="mt-4 text-bone/80">
          Full Kelly is theoretically optimal but emotionally brutal — losing streaks chew through
          your bankroll fast and your model is never as accurate as you think. <span className="font-semibold text-paper">Use quarter-Kelly</span> (the
          stake we recommend on each match): same expected growth direction, far less variance.
          Even quarter-Kelly will rarely tell you to stake more than 2-3% of bankroll on a single bet.
        </p>
        <p className="mt-4 rounded-md border border-flag/30 bg-flag/5 p-4 text-sm text-bone/90">
          <span className="font-semibold text-flag">Rule of thumb:</span> if you find yourself wanting
          to stake 10%+ of your bankroll on a single bet, it's not edge talking — it's tilt.
        </p>
      </section>

      <section id="accumulators" className="mt-16">
        <h2 className="font-display text-3xl font-bold tracking-tight">3 · Why accumulators are the trap</h2>
        <p className="mt-4 text-bone/80">
          The bookmaker's margin compounds. If a single match has 7% margin against you,
          a 5-leg accumulator stacks that 5 times: roughly <span className="font-mono">1 − 0.93⁵ ≈ 30%</span> margin
          against you. A 10-leg acca? Roughly 50%. The huge potential payouts disguise that the
          house edge has gone from "you'll bleed slowly" to "you're funding the building."
        </p>
        <p className="mt-4 text-bone/80">
          Singles or short doubles on value bets beat 10-leg accumulators long-term — every time, by
          a lot. If you must build accumulators, keep them to 2-3 legs and only on selections
          flagged as value.
        </p>
      </section>

      <section id="model" className="mt-16">
        <h2 className="font-display text-3xl font-bold tracking-tight">4 · How the Mintscore model works</h2>
        <p className="mt-4 text-bone/80">
          For each match we estimate two numbers: the home team's expected goals and the away team's
          expected goals. These come from each side's recent attack and defence ratings combined with
          the league's baseline scoring rate.
        </p>
        <p className="mt-4 text-bone/80">
          From those two numbers we build a full distribution of possible scorelines using the
          <span className="font-semibold"> Poisson distribution</span> — the standard statistical model
          for goal counts. We then apply the <span className="font-semibold">Dixon-Coles correction</span> (Dixon &
          Coles, 1997, JRSS) to fix a known weakness in plain Poisson: real football has more 0-0,
          1-0 and 0-1 results than independent Poisson predicts.
        </p>
        <p className="mt-4 text-bone/80">
          Sum the joint probabilities of all home-win scorelines, all draws, and all away-win
          scorelines, and you get the 1X2 probabilities you see on every match page. That's the entire
          method. No insider tips, no AI black box, no "guaranteed wins" — published openly so you
          can challenge it if you spot a flaw.
        </p>
        <p className="mt-4 text-bone/80">
          The model has known limits: it doesn't yet incorporate injuries, suspensions,
          motivation/form swings, or specific head-to-head context. That's the next iteration.
        </p>
      </section>

      <section id="responsible" className="mt-16 rounded-lg border border-warn/30 bg-warn/5 p-6">
        <h2 className="font-display text-3xl font-bold tracking-tight text-warn">5 · When to stop</h2>
        <p className="mt-4 text-bone/90">
          Most people who develop a gambling problem don't notice it until they're deep in. The
          warning signs are simple and worth checking yourself against, honestly:
        </p>
        <ul className="mt-4 list-disc space-y-2 pl-6 text-bone/85">
          <li>You bet to escape stress, low mood, or boredom rather than for entertainment.</li>
          <li>You chase losses with bigger stakes after a losing day.</li>
          <li>You hide your betting from your partner or family.</li>
          <li>You bet money you'd intended for rent, food, school fees, or savings.</li>
          <li>You think about betting when you should be working, studying, or with family.</li>
          <li>You can't stick to a budget you set yourself.</li>
        </ul>
        <p className="mt-4 text-bone/90">
          If two or more of these sound familiar, it's time to step back. There's no shame in it —
          gambling products are engineered to be sticky.
        </p>
        <p className="mt-4 text-bone/90 font-semibold">If you need help:</p>
        <ul className="mt-2 list-disc space-y-1 pl-6 text-bone/85">
          <li><a href="https://www.begambleaware.org/" target="_blank" rel="noopener noreferrer" className="text-flag underline">GambleAware</a> — free, anonymous, 24/7 chat.</li>
          <li>National Lottery Regulatory Commission (Nigeria): +234 9 461 0046.</li>
          <li>Gamblers Anonymous Nigeria: search "GA Nigeria meetings" — meetings in Lagos, Abuja, PH.</li>
          <li>Most bookmakers offer self-exclusion in account settings — use it without hesitation.</li>
        </ul>
      </section>
    </article>
  );
}
