# Mintscore

> Football match probabilities derived from a Poisson goal-expectancy model
> with Dixon-Coles correction. Affiliate-monetised. No tipster scraping.

## What this is

A Next.js 14 PWA that:

1. Pulls upcoming fixtures from **Football-Data.org** (free tier).
2. Pulls bookmaker odds from **The-Odds-API** (free tier, 500 req/month).
3. Runs every match through an own **Poisson + Dixon-Coles** model trained
   on **Football-Data.co.uk** historical CSVs (also free).
4. Flags **value bets** where the model's probability beats the market's implied probability by ≥ 5%.
5. Recommends a stake at **quarter-Kelly** to manage variance.
6. Surfaces **affiliate links** to bookmakers (SportyBet, BetKing, 1xBet, BetWinner, MSport) so user clicks earn commission.
7. Ships an **education hub** explaining EV, bankroll sizing, why accumulators are a trap, and signs of problem gambling.

It is a single codebase that runs as a website **and** installs as a mobile app via PWA.

## Stack & cost

| Layer | Choice | Cost |
|---|---|---|
| Framework | Next.js 14 (App Router) | Free |
| Hosting | Vercel hobby tier | Free |
| Fixtures API | Football-Data.org free tier | Free (10 req/min) |
| Odds API | The-Odds-API free tier | Free (500 req/month) |
| Historical CSVs | Football-Data.co.uk | Free |
| Ads | Google AdSense (after launch) | 30-day approval, then revenue share |
| Affiliates | SportyBet, BetKing, 1xBet, BetWinner, MSport | Sign up direct |

**Ongoing cost: $0** until you choose to upgrade APIs or switch off the free tier.

## Running locally

```bash
git clone <your-repo> mintscore
cd mintscore
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

The app runs **end-to-end without any API keys** — it falls back to bundled demo
fixtures and skips the value-bet flag. Once you add `FOOTBALL_DATA_TOKEN` and
`ODDS_API_KEY` to `.env.local`, real data flows in.

## Deploying to Vercel (free)

1. Push the project to a GitHub repo.
2. Go to [vercel.com](https://vercel.com), sign up with GitHub, click "New Project", select the repo.
3. In project settings → Environment Variables, paste the contents of your `.env.local`.
4. Deploy. You get a free `*.vercel.app` URL immediately.
5. (Later) Buy a custom domain from Namecheap (~$10/year), point it at Vercel.

## Refreshing the team-strength model

The bundled `data/team-stats.json` is a starter set. To rebuild from real
historical results (recommended weekly during the season):

```bash
npx tsx scripts/sync-team-stats.ts
```

This downloads Football-Data.co.uk CSVs for the top 5 European leagues and
recomputes attack/defence ratings. Commit the updated JSON.

You can automate this with a GitHub Action on a weekly cron — see the
"Automation" section below.

## Adding affiliate IDs

After you're approved by each bookmaker's affiliate programme, add your IDs to
`.env.local` (or the Vercel env vars dashboard):

```
NEXT_PUBLIC_AFF_SPORTYBET=YOUR_ID
NEXT_PUBLIC_AFF_BETKING=YOUR_ID
NEXT_PUBLIC_AFF_1XBET=YOUR_ID
# ...
```

If left blank, links degrade to the bookmaker homepage (no commission tracking but still functional).

### Where to apply

- **SportyBet**: partners.sportybet.com
- **BetKing**: affiliates.betking.com
- **1xBet**: 1xbet-partners.com (highest payouts of the five, biggest brand presence in Nigeria)
- **BetWinner**: betwinner-affiliates.com
- **MSport**: msport-partners.com

Approval typically takes 1–7 days. Most pay 30–40% revenue share for the first 6 months, then ~25% for life of the account.

## Adding Google AdSense

1. Apply at adsense.google.com once your site has been live for 14+ days with content (homepage + match pages auto-generate plenty of indexable content thanks to the sitemap).
2. After approval, add the AdSense script to `app/layout.tsx` in `<head>`.
3. Place `<ins class="adsbygoogle" .../>` blocks where you want ads. Suggested spots: between match cards on the home page, mid-content on `/learn`, between bonus rows on `/bonuses`.

Don't expect meaningful ad revenue until you're at 10k+ pageviews/month. Affiliate commissions will out-earn ads roughly 5–10× at any traffic level.

## Traffic strategy

The site is built for organic search from day one:

- Every match has its own indexable URL with descriptive metadata and JSON-LD schema (`SportsEvent` type) — these win long-tail queries like *"Arsenal vs Chelsea prediction"*.
- The auto-generated sitemap hits 50–200 indexed pages within a week of launch.
- Education content is genuinely useful and link-worthy — submit it to /r/SoccerBetting, betting communities on X, Nairaland Sport section.
- PWA install prompts capture returning users without paid acquisition.

For paid pushes when revenue starts coming in: **Twitter/X ads targeting Nigerian football fans** outperforms Google for this niche.

## Project structure

```
mintscore/
├── app/                      # Next.js routes
│   ├── page.tsx              # / — today's predictions
│   ├── matches/[id]/page.tsx # match detail
│   ├── bonuses/page.tsx      # affiliate bonus comparison
│   ├── learn/page.tsx        # education hub
│   ├── sitemap.ts            # auto-generated sitemap
│   └── robots.ts
├── components/               # React components
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── MatchCard.tsx
│   ├── ProbabilityBar.tsx
│   └── BookmakerLinks.tsx
├── lib/                      # Domain logic
│   ├── prediction.ts         # Poisson + Dixon-Coles core
│   ├── predict-match.ts      # ties model to fixtures
│   ├── football-data.ts      # fixtures API client
│   ├── odds-api.ts           # market odds API client
│   ├── bookmakers.ts         # affiliate config
│   └── types.ts
├── data/
│   ├── team-stats.json       # pre-computed team ratings
│   └── demo-fixtures.json    # fallback when no API key
├── scripts/
│   └── sync-team-stats.ts    # refresh model from CSVs
└── public/
    ├── manifest.json
    └── icons/
```

## What's intentionally not here yet

- **No automated bookmaker betting.** That violates every Nigerian bookmaker's ToS and gets users' accounts permanently banned. The affiliate-link approach is the legal, sustainable substitute.
- **No tipster scraping.** Sports Mole, OLBG, etc. ToS prohibit it; their predictions are anyway already incorporated into bookmaker odds, so aggregating them gives no edge.
- **No betcode converter.** Booking codes are internal to each bookmaker, not interchangeable, and the markets don't even align across sites. Affiliate deep-links are the working alternative.

## Roadmap (in priority order)

1. **Injuries/suspensions feed** to adjust expected goals when key players miss out (bumps model accuracy 2–4%).
2. **Push notifications** for value bets via PWA — converts returning visits into bet clicks.
3. **Backtesting page** — show last 30 days of model picks vs results, with closing-line value calculation. Builds trust.
4. **More leagues** — expand to NPFL, AFCON, lower-division European leagues using the same sync script with additional CSV codes.
5. **Newsletter signup** — daily picks email, primary retention tool.
6. **Capacitor wrapper** — turn the PWA into a true native Android APK distributable on Play Store (separate from the PWA install).

## Disclaimer

Mintscore publishes statistical estimates of football match outcomes. These are
not guarantees. Sports betting carries real financial risk. The site is for
users 18+. If gambling is causing harm to you or someone you know, contact
[GambleAware](https://www.begambleaware.org/) or the National Lottery
Regulatory Commission (Nigeria).
