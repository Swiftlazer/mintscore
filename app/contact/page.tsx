import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description: "How to reach Mintscore — for support, partnerships, feedback, and press.",
};

export default function ContactPage() {
  return (
    <article className="mx-auto max-w-2xl px-5 pt-10 pb-16">
      <header className="border-b border-hairline pb-8">
        <p className="font-mono text-[11px] uppercase tracking-widest text-flag">Contact</p>
        <h1 className="mt-3 font-display text-4xl font-extrabold leading-[0.95] tracking-tighter md:text-5xl">
          Get in touch.
        </h1>
        <p className="mt-4 text-bone/70">
          Pick the channel that matches your reason for reaching out — replies are usually within 48 hours.
        </p>
      </header>

      <section className="mt-10 space-y-6">
        <div className="rounded-lg border border-hairline bg-mist/40 p-6">
          <p className="font-mono text-[11px] uppercase tracking-widest text-flag">General &amp; support</p>
          <p className="mt-2 font-display text-2xl font-bold tracking-tight">
            <a href="mailto:hello@mintscore.com.ng" className="hover:text-flag">hello@mintscore.com.ng</a>
          </p>
          <p className="mt-2 text-sm text-bone/70">
            Bug reports, prediction questions, feedback on the site. Please include the URL of the
            page you're asking about if relevant.
          </p>
        </div>

        <div className="rounded-lg border border-hairline bg-mist/40 p-6">
          <p className="font-mono text-[11px] uppercase tracking-widest text-flag">Partnerships &amp; affiliates</p>
          <p className="mt-2 font-display text-2xl font-bold tracking-tight">
            <a href="mailto:partnerships@mintscore.com.ng" className="hover:text-flag">partnerships@mintscore.com.ng</a>
          </p>
          <p className="mt-2 text-sm text-bone/70">
            Bookmakers and gambling operators looking to discuss commercial arrangements,
            sponsored content, or affiliate programmes.
          </p>
        </div>

        <div className="rounded-lg border border-hairline bg-mist/40 p-6">
          <p className="font-mono text-[11px] uppercase tracking-widest text-flag">Press &amp; media</p>
          <p className="mt-2 font-display text-2xl font-bold tracking-tight">
            <a href="mailto:press@mintscore.com.ng" className="hover:text-flag">press@mintscore.com.ng</a>
          </p>
          <p className="mt-2 text-sm text-bone/70">
            Journalists and researchers writing about Nigerian betting markets, prediction modelling,
            or responsible gambling.
          </p>
        </div>

        <div className="rounded-lg border border-warn/30 bg-warn/5 p-6">
          <p className="font-mono text-[11px] uppercase tracking-widest text-warn">Need urgent help?</p>
          <p className="mt-2 text-sm text-bone/85">
            If you're struggling with gambling and need to talk to someone now, please don't email us —
            contact{" "}
            <a href="https://www.begambleaware.org/" target="_blank" rel="noopener noreferrer" className="underline">
              GambleAware
            </a>{" "}
            for free 24/7 support, or call the National Lottery Regulatory Commission of Nigeria
            on <span className="font-mono">+234 9 461 0046</span>.
          </p>
        </div>
      </section>

      <p className="mt-10 text-xs text-bone/50">
        We don't operate a phone line or live chat. Email is the only supported channel. Please
        don't send sensitive personal or financial information by email.
      </p>
    </article>
  );
}
