import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-hairline bg-mist/30">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <div className="grid gap-10 md:grid-cols-5">
          <div className="md:col-span-2">
            <p className="font-display text-xl font-extrabold tracking-tighter">
              Mint<span className="text-flag">score</span>
            </p>
            <p className="mt-3 max-w-md text-sm text-bone/60">
              Football match probabilities derived from a Poisson goal-expectancy
              model with Dixon-Coles low-score correction. We don't sell tips , 
              we publish maths, openly.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-bone/40">Sections</p>
            <ul className="mt-3 space-y-2 text-sm text-bone/80">
              <li><Link href="/" className="hover:text-flag">Predictions</Link></li>
              <li><Link href="/bonuses" className="hover:text-flag">Bonuses</Link></li>
              <li><Link href="/learn" className="hover:text-flag">Learn</Link></li>
              <li><Link href="/track-record" className="hover:text-flag">Track record</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-bone/40">Stay safe</p>
            <ul className="mt-3 space-y-2 text-sm text-bone/80">
              <li><Link href="/learn#bankroll" className="hover:text-flag">Bankroll basics</Link></li>
              <li><Link href="/learn#responsible" className="hover:text-flag">Problem gambling help</Link></li>
              <li>
                <a href="https://www.begambleaware.org/" target="_blank" rel="noopener noreferrer" className="hover:text-flag">
                  GambleAware ↗
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-bone/40">Mintscore</p>
            <ul className="mt-3 space-y-2 text-sm text-bone/80">
              <li><Link href="/about" className="hover:text-flag">About</Link></li>
              <li><Link href="/contact" className="hover:text-flag">Contact</Link></li>
              <li><Link href="/privacy" className="hover:text-flag">Privacy</Link></li>
              <li><Link href="/terms" className="hover:text-flag">Terms</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-hairline pt-6 text-xs text-bone/50">
          <p className="leading-relaxed">
            <span className="font-semibold text-bone/80">18+ only.</span>{" "}
            Gambling involves risk of financial loss. Predictions on this site are statistical
            estimates and do not guarantee outcomes. Bet only what you can afford to lose. If
            gambling is causing you harm, contact{" "}
            <a href="https://www.begambleaware.org/" className="underline" target="_blank" rel="noopener noreferrer">
              GambleAware
            </a>{" "}
            or call the National Lottery Regulatory Commission (NG) helpline.
          </p>
          <p className="mt-3">© {new Date().getFullYear()} Mintscore.</p>
        </div>
      </div>
    </footer>
  );
}
