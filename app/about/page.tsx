import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: "What Mintscore is, how the prediction model works, and who builds it.",
};

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-3xl px-5 pt-10 pb-16">
      <header className="border-b border-hairline pb-8">
        <p className="font-mono text-[11px] uppercase tracking-widest text-flag">About</p>
        <h1 className="mt-3 font-display text-4xl font-extrabold leading-[0.95] tracking-tighter md:text-5xl">
          A football prediction site that<br />
          <span className="italic text-bone/70">shows its working.</span>
        </h1>
      </header>

      <section className="mt-10 space-y-5 text-bone/85">
        <p>
          Mintscore is a Nigerian-built, Nigerian-focused platform that publishes statistical
          probabilities for upcoming football matches across the world's major leagues , 
          Premier League, La Liga, Bundesliga, Serie A, Ligue 1, the Champions League, and
          international competitions.
        </p>

        <p>
          We don't sell tips. We don't claim to know the future. We publish a transparent
          probability distribution for each match's outcome, derived from a Poisson goal-expectancy
          model with the Dixon-Coles low-score correction (a method first published in the Journal
          of the Royal Statistical Society in 1997 and still used by sharp bettors today). When the
          market price disagrees with our model by enough to flag value, we say so, and we publish
          the maths so you can challenge it.
        </p>

        <p>
          The site is designed to do three things equally well:
        </p>

        <ul className="list-disc space-y-2 pl-6">
          <li><strong className="text-paper">Inform</strong>, give you a calibrated read on every match before you bet.</li>
          <li><strong className="text-paper">Educate</strong>, explain expected value, bankroll management, and why most accumulators are mathematically losing propositions.</li>
          <li><strong className="text-paper">Connect</strong>, surface trustworthy bookmakers and their welcome offers so you can place your bet without us ever asking for your money directly.</li>
        </ul>

        <p>
          Mintscore earns commission when readers sign up to bookmakers via our affiliate links.
          That's our entire revenue model, we never ask you for a subscription, never sell tips,
          and never resell your data. If you want to see how we earn money,{" "}
          <a href="/bonuses" className="text-flag underline hover:text-paper">it's all listed openly here</a>.
        </p>
      </section>

      <section className="mt-12 border-t border-hairline pt-10">
        <h2 className="font-display text-2xl font-bold tracking-tight">Built by</h2>
        <p className="mt-3 text-bone/85">
          Mintscore is a small independent project built and maintained by a single person in Lagos,
          Nigeria. If you have feedback, found a bug, want to suggest a feature, or want to discuss
          partnerships, the{" "}
          <a href="/contact" className="text-flag underline hover:text-paper">contact page</a> has
          the right channel.
        </p>
      </section>

      <section className="mt-12 border-t border-hairline pt-10">
        <h2 className="font-display text-2xl font-bold tracking-tight">A note on responsibility</h2>
        <p className="mt-3 text-bone/85">
          Football betting carries real financial risk and can develop into a genuine compulsion
          for a meaningful minority of users. Mintscore publishes responsible-gambling resources
          on the{" "}
          <a href="/learn#responsible" className="text-flag underline hover:text-paper">Learn</a>{" "}
          page, including warning signs, helplines, and self-exclusion guidance. If you or someone
          you know needs help, those resources are 24/7 and free.
        </p>
      </section>
    </article>
  );
}
