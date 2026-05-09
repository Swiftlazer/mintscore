import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The legal terms governing use of Mintscore.",
};

const LAST_UPDATED = "May 2026";

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-5 pt-10 pb-16">
      <header className="border-b border-hairline pb-8">
        <p className="font-mono text-[11px] uppercase tracking-widest text-flag">Legal · last updated {LAST_UPDATED}</p>
        <h1 className="mt-3 font-display text-4xl font-extrabold leading-[0.95] tracking-tighter md:text-5xl">
          Terms of Service
        </h1>
      </header>

      <section className="mt-10 rounded-lg border border-warn/30 bg-warn/5 p-6">
        <h2 className="font-display text-xl font-bold tracking-tight text-warn">Plain-English summary</h2>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-bone/85">
          <li>Mintscore publishes statistical estimates, not guarantees. Acting on them is at your own financial risk.</li>
          <li>The Service is for adults 18+. Don't use it if you're under 18 or in a jurisdiction where gambling is prohibited.</li>
          <li>We're not your financial adviser, your bookmaker, or your insurance policy.</li>
          <li>Bookmaker affiliate links earn us commission. They don't change the odds you receive.</li>
          <li>Don't try to scrape, abuse, or break the site — it's small, free, and run by one person.</li>
        </ul>
      </section>

      <section className="mt-10 space-y-6 text-bone/85">
        <h2 className="font-display text-2xl font-bold tracking-tight">1. Acceptance of terms</h2>
        <p>
          By accessing or using Mintscore (the "Service"), you agree to be bound by these Terms of
          Service. If you do not agree, do not use the Service.
        </p>

        <h2 className="font-display text-2xl font-bold tracking-tight">2. Eligibility</h2>
        <p>
          You must be at least 18 years old (or the legal age of majority and gambling in your
          jurisdiction, whichever is older) to use the Service. By using the Service you represent
          and warrant that you meet this requirement.
        </p>
        <p>
          Use of the Service is prohibited in any jurisdiction where the activities described
          (sports prediction, online gambling promotion) are illegal. It is your responsibility to
          ensure your use complies with the laws applicable to you.
        </p>

        <h2 className="font-display text-2xl font-bold tracking-tight">3. No warranty on predictions</h2>
        <p>
          Mintscore publishes statistical estimates of football match outcomes derived from a Poisson
          + Dixon-Coles model trained on historical data. <strong className="text-paper">These are
          probabilities, not predictions. Outcomes are inherently uncertain and the model can — and
          will — be wrong on any given match.</strong>
        </p>
        <p>
          The Service is provided "as-is" and "as available" with no warranty, express or implied,
          including but not limited to warranties of accuracy, fitness for a particular purpose,
          completeness, or non-infringement. Mintscore does not warrant that any prediction will be
          correct, that any value-bet flag will be profitable, or that any accumulator will hit.
        </p>

        <h2 className="font-display text-2xl font-bold tracking-tight">4. No financial or gambling advice</h2>
        <p>
          Nothing on the Service constitutes financial, investment, betting, or legal advice.
          Mintscore is not a registered financial adviser, broker, or licensed gambling operator.
          Decisions to wager money are yours alone and at your own risk. We strongly encourage you
          to read our{" "}
          <a href="/learn" className="text-flag underline">Learn</a> page on bankroll management and
          responsible gambling before placing any bets.
        </p>

        <h2 className="font-display text-2xl font-bold tracking-tight">5. Affiliate disclosure</h2>
        <p>
          Mintscore is a participant in affiliate programmes operated by various licensed
          bookmakers. When you click a bookmaker logo, link, or button on the Service and
          subsequently sign up or deposit at that bookmaker, we may receive a commission. This is
          how the Service is funded. Affiliate participation does not affect:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>The odds, bonuses, or terms you receive from the bookmaker.</li>
          <li>Which matches we model or how we model them.</li>
          <li>Whether a particular outcome is flagged as value.</li>
        </ul>

        <h2 className="font-display text-2xl font-bold tracking-tight">6. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>Scrape, crawl, or systematically copy content from the Service without prior written permission.</li>
          <li>Reverse-engineer, decompile, or attempt to extract source code beyond what we publish openly.</li>
          <li>Use the Service to harass, defame, or harm any party, including bookmakers, sports teams, or individuals named on the site.</li>
          <li>Attempt to disrupt, overload, or break the Service via denial-of-service attacks or excessive automated requests.</li>
          <li>Misrepresent or commercialise predictions as your own without attribution.</li>
        </ul>

        <h2 className="font-display text-2xl font-bold tracking-tight">7. Intellectual property</h2>
        <p>
          The Mintscore name, design, written content, prediction model, and code are owned by us
          (or licensed to us). Match data is sourced from third parties under their respective
          licences (notably Football-Data.org). You may quote short excerpts of our written content
          for journalism, education, or commentary with proper attribution. You may not reproduce
          the whole or substantial portions of the Service without prior written permission.
        </p>

        <h2 className="font-display text-2xl font-bold tracking-tight">8. Limitation of liability</h2>
        <p>
          To the maximum extent permitted by applicable law, Mintscore and its operator shall not be
          liable for any direct, indirect, incidental, special, consequential, or exemplary damages
          arising from or relating to your use of the Service — including but not limited to losses
          incurred from acting on a prediction, value flag, accumulator selection, or affiliate
          referral.
        </p>

        <h2 className="font-display text-2xl font-bold tracking-tight">9. Termination</h2>
        <p>
          We reserve the right to modify, suspend, or discontinue the Service (or any part of it) at
          any time, with or without notice. We may also block users who violate these Terms.
        </p>

        <h2 className="font-display text-2xl font-bold tracking-tight">10. Governing law</h2>
        <p>
          These Terms are governed by the laws of the Federal Republic of Nigeria. Any disputes
          shall be resolved in the courts of Lagos State, Nigeria.
        </p>

        <h2 className="font-display text-2xl font-bold tracking-tight">11. Changes to these Terms</h2>
        <p>
          We may revise these Terms at any time. The "last updated" date reflects the most recent
          revision. Continued use after changes constitutes acceptance.
        </p>

        <h2 className="font-display text-2xl font-bold tracking-tight">12. Contact</h2>
        <p>
          For any questions about these Terms, email{" "}
          <a href="mailto:hello@mintscore.com.ng" className="text-flag underline">hello@mintscore.com.ng</a>.
        </p>
      </section>
    </article>
  );
}
