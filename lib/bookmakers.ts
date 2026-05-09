import type { Bookmaker } from "./types";

/**
 * Affiliate configuration.
 *
 * Replace AFFILIATE_ID values with the codes you receive after signing
 * up to each bookmaker's affiliate programme. If a slot is left as
 * "REPLACE_ME", the link will degrade to the homepage of the bookmaker
 * (still functional, just no commission tracking).
 *
 * Sign-up programmes (as of 2026):
 *  - SportyBet: partners.sportybet.com
 *  - BetKing:   affiliates.betking.com
 *  - 1xBet:     1xbet-partners.com (largest payouts, biggest brand presence in NG)
 *  - BetWinner: betwinner-affiliates.com
 *  - MSport:    msport-partners.com
 */

const AFFILIATE_IDS = {
  sportybet: process.env.NEXT_PUBLIC_AFF_SPORTYBET ?? "REPLACE_ME",
  betking: process.env.NEXT_PUBLIC_AFF_BETKING ?? "REPLACE_ME",
  onexbet: process.env.NEXT_PUBLIC_AFF_1XBET ?? "REPLACE_ME",
  betwinner: process.env.NEXT_PUBLIC_AFF_BETWINNER ?? "REPLACE_ME",
  msport: process.env.NEXT_PUBLIC_AFF_MSPORT ?? "REPLACE_ME",
};

export const BOOKMAKERS: Bookmaker[] = [
  {
    id: "sportybet",
    name: "SportyBet",
    logo: "/icons/bookmakers/sportybet.svg",
    affiliateUrl: AFFILIATE_IDS.sportybet === "REPLACE_ME"
      ? "https://www.sportybet.com/ng/"
      : `https://www.sportybet.com/ng/m/promotions?affCode=${AFFILIATE_IDS.sportybet}`,
    signupBonus: "100% first deposit bonus up to ₦100,000",
    bonusValueNGN: "₦100,000",
    freeBetTerms: "Min deposit ₦100. 8x rollover at min odds 3.00. 30-day expiry.",
    rating: 4.5,
    tags: ["nigeria", "popular", "large-bonus"],
  },
  {
    id: "betking",
    name: "BetKing",
    logo: "/icons/bookmakers/betking.svg",
    affiliateUrl: AFFILIATE_IDS.betking === "REPLACE_ME"
      ? "https://www.betking.com/"
      : `https://www.betking.com/?ref=${AFFILIATE_IDS.betking}`,
    signupBonus: "₦15,000 free bet on first deposit",
    bonusValueNGN: "₦15,000",
    freeBetTerms: "Min deposit ₦200. 4x rollover at min odds 1.80. 14-day expiry.",
    rating: 4.4,
    tags: ["nigeria", "established", "good-coverage"],
  },
  {
    id: "1xbet",
    name: "1xBet",
    logo: "/icons/bookmakers/1xbet.svg",
    affiliateUrl: AFFILIATE_IDS.onexbet === "REPLACE_ME"
      ? "https://1xbet.ng/"
      : `https://refpa.top/L?tag=d_${AFFILIATE_IDS.onexbet}_lc&site=${AFFILIATE_IDS.onexbet}`,
    signupBonus: "200% first deposit bonus up to ₦189,500",
    bonusValueNGN: "₦189,500",
    freeBetTerms: "5x rollover at min odds 1.40 (3 selections min). 30-day expiry.",
    rating: 4.3,
    tags: ["large-bonus", "global", "wide-markets"],
  },
  {
    id: "betwinner",
    name: "BetWinner",
    logo: "/icons/bookmakers/betwinner.svg",
    affiliateUrl: AFFILIATE_IDS.betwinner === "REPLACE_ME"
      ? "https://betwinner.com/"
      : `https://refpa.top/L?tag=d_${AFFILIATE_IDS.betwinner}_lc&site=${AFFILIATE_IDS.betwinner}`,
    signupBonus: "100% first deposit bonus up to ₦150,000",
    bonusValueNGN: "₦150,000",
    freeBetTerms: "5x rollover at min odds 1.40. 30-day expiry.",
    rating: 4.2,
    tags: ["large-bonus", "wide-markets"],
  },
  {
    id: "msport",
    name: "MSport",
    logo: "/icons/bookmakers/msport.svg",
    affiliateUrl: AFFILIATE_IDS.msport === "REPLACE_ME"
      ? "https://www.msport.com/ng/"
      : `https://www.msport.com/ng/?ref=${AFFILIATE_IDS.msport}`,
    signupBonus: "Up to ₦100,000 first deposit bonus",
    bonusValueNGN: "₦100,000",
    freeBetTerms: "5x rollover at min odds 2.00. 14-day expiry.",
    rating: 4.0,
    tags: ["nigeria", "growing"],
  },
];

/** Tracking helper — appends UTM params so you can see which clicks convert. */
export function affiliateLinkWithTracking(
  bm: Bookmaker,
  source: "match" | "bonus" | "header" | "footer",
  matchId?: number,
): string {
  const u = new URL(bm.affiliateUrl);
  u.searchParams.set("utm_source", "mintscore");
  u.searchParams.set("utm_medium", source);
  if (matchId) u.searchParams.set("utm_content", `match_${matchId}`);
  return u.toString();
}
