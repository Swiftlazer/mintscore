/**
 * GET /api/livescore — returns matches grouped into live/upcoming/finished.
 *
 * The sidebar polls this client-side every 60 seconds. Data cache TTL in
 * the lib is 30s, so a freshly-finished match propagates to viewers
 * within about a minute end-to-end. Still well under Football-Data.org's
 * 10/min free-tier rate limit.
 */

import { NextResponse } from "next/server";
import { getLiveScores } from "@/lib/livescore";

export const dynamic = "force-dynamic";   // never statically optimise; we WANT freshness
export const revalidate = 0;              // route response not cached; lib handles upstream cache

export async function GET() {
  const feed = await getLiveScores();   // 30s default
  return NextResponse.json(feed, {
    headers: {
      // 30s edge cache + 15s stale-while-revalidate so a finished match
      // can't stay falsely "live" for more than ~45s due to caching.
      "Cache-Control": "public, max-age=30, s-maxage=30, stale-while-revalidate=15",
    },
  });
}
