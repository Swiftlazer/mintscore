import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What data Mintscore collects, what we do with it, and your rights.",
};

const LAST_UPDATED = "May 2026";

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-5 pt-10 pb-16">
      <header className="border-b border-hairline pb-8">
        <p className="font-mono text-[11px] uppercase tracking-widest text-flag">Legal · last updated {LAST_UPDATED}</p>
        <h1 className="mt-3 font-display text-4xl font-extrabold leading-[0.95] tracking-tighter md:text-5xl">
          Privacy Policy
        </h1>
        <p className="mt-4 text-bone/70">
          Plain-English summary first; legal-grade detail below.
        </p>
      </header>

      <section className="mt-10 rounded-lg border border-flag/30 bg-flag/5 p-6">
        <h2 className="font-display text-xl font-bold tracking-tight text-flag">The short version</h2>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-bone/85">
          <li>Mintscore does not require accounts, logins, or personal information to use.</li>
          <li>We don't sell or rent your data.</li>
          <li>We use Vercel for hosting and Google Search Console for analytics, neither of which we share data with beyond what's necessary to keep the site running and indexed.</li>
          <li>If you click a bookmaker affiliate link, that bookmaker collects whatever data their own site collects, we have no control over that and you should read their privacy policy before signing up.</li>
          <li>Cookies on Mintscore itself are limited to functional ones (e.g. remembering your favourite teams locally on your device).</li>
        </ul>
      </section>

      <section className="mt-10 space-y-6 text-bone/85">
        <h2 className="font-display text-2xl font-bold tracking-tight">1. Who we are</h2>
        <p>
          Mintscore (the "Service") is operated by an independent publisher based in Lagos, Nigeria.
          For data-protection enquiries, email{" "}
          <a href="mailto:hello@mintscore.com.ng" className="text-flag underline">hello@mintscore.com.ng</a>.
        </p>

        <h2 className="font-display text-2xl font-bold tracking-tight">2. Data we collect</h2>
        <p>
          Mintscore is built to operate without any account or login. We collect only what's
          technically necessary:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong className="text-paper">Server logs (Vercel).</strong> When you visit, our hosting
            provider Vercel logs the URL you requested, your IP address, your browser's user agent,
            and a timestamp. Vercel retains these logs for a limited period for security and
            performance monitoring. See{" "}
            <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-flag underline">Vercel's Privacy Policy</a>.
          </li>
          <li>
            <strong className="text-paper">Search analytics (Google).</strong> If you arrived via Google
            Search, Search Console reports aggregated information about which queries surface our pages.
            This data is not personally identifiable to us.
          </li>
          <li>
            <strong className="text-paper">Local storage on your device.</strong> If you use the
            "favourite teams" feature, the list of team IDs is stored in your browser's localStorage.
            This data never leaves your device and we cannot read it.
          </li>
        </ul>
        <p>
          We do not knowingly collect data from anyone under 18. The Service is not intended for
          minors; gambling content is restricted to legal-age adults in your jurisdiction (18+ in Nigeria).
        </p>

        <h2 className="font-display text-2xl font-bold tracking-tight">3. Data we do NOT collect</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>We do not require an account, so we have no name, email, phone, address, or payment information from you.</li>
          <li>We do not run third-party tracking pixels (Facebook Pixel, TikTok Pixel, etc.).</li>
          <li>We do not run AdSense or any other behavioural advertising network.</li>
          <li>We do not fingerprint your device beyond standard browser headers.</li>
        </ul>

        <h2 className="font-display text-2xl font-bold tracking-tight">4. Affiliate links</h2>
        <p>
          When you click a bookmaker logo on Mintscore, you leave our site for the bookmaker's own
          domain. The bookmaker may set their own cookies (often including a referral cookie that
          credits your sign-up to us for commission purposes). The bookmaker's privacy practices are
          governed by their own privacy policy and Mintscore has no control over what they collect or
          how they use it. <strong className="text-paper">You should read the privacy policy of any
          bookmaker before depositing money or providing personal information.</strong>
        </p>

        <h2 className="font-display text-2xl font-bold tracking-tight">5. Cookies</h2>
        <p>
          Mintscore itself uses one category of browser storage: localStorage entries for site
          functionality (e.g. remembering favourites). We do not use third-party advertising cookies.
          Vercel may set a small number of operational cookies for performance. Bookmakers you click
          through to set their own cookies on their own domain.
        </p>

        <h2 className="font-display text-2xl font-bold tracking-tight">6. Your rights</h2>
        <p>
          Under Nigeria's NDPA (Nigeria Data Protection Act, 2023) and equivalent foreign laws (UK
          GDPR, EU GDPR) you may:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>Ask what data we hold about you (in practice this is virtually nothing because we operate without accounts).</li>
          <li>Ask us to delete server log entries that may contain your IP, note that Vercel cycles these automatically anyway.</li>
          <li>Clear your local data at any time by clearing your browser's site data for mintscore.com.ng.</li>
        </ul>
        <p>
          To exercise these rights, email{" "}
          <a href="mailto:hello@mintscore.com.ng" className="text-flag underline">hello@mintscore.com.ng</a>{" "}
          and allow up to 30 days for response.
        </p>

        <h2 className="font-display text-2xl font-bold tracking-tight">7. Changes to this policy</h2>
        <p>
          We may update this policy occasionally. The "last updated" date at the top reflects the
          most recent revision. Material changes will be flagged on the homepage for at least 14 days
          before taking effect.
        </p>
      </section>
    </article>
  );
}
