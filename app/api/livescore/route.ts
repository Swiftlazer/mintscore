/**
 * GET /api/livescore — returns today's matches grouped into live/upcoming/finished.
 *
 * The sidebar polls this client-side every 60 seconds. Data cache TTL is
 * also 60s, so simultaneous visitors share one upstream hit per minute,
 * keeping us well under Football-Data.org's 10/min free-tier limit.
 */

import { NextResponse } from "next/server";
import { getLiveScores } from "@/lib/livescore";

export const dynamic = "force-dynamic";   // never statically optimise; we WANT freshness
export const revalidate = 0;              // route response not cached; lib handles upstream cache

export async function GET() {
  const feed = await getLiveScores(60);
  return NextResponse.json(feed, {
    headers: {
      // 60s edge cache + 30s stale-while-revalidate for snappy UX during polls
      "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=30",
    },
  });
}
