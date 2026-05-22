/**
 * GET /api/results?days=7
 *
 * Returns finished matches from the last N days (default 7, max 10) across
 * every league the API key has access to. Cached upstream for 30 minutes
 * — results don't change once final, so a long cache is safe and easy on
 * the Football-Data.org rate limit.
 */

import { NextResponse } from "next/server";
import { getRecentResults } from "@/lib/livescore";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const days = Number(url.searchParams.get("days") ?? "7");
  const feed = await getRecentResults(days);
  return NextResponse.json(feed, {
    headers: {
      // Edge cache: 30min fresh + 5min stale-while-revalidate.
      "Cache-Control": "public, max-age=1800, s-maxage=1800, stale-while-revalidate=300",
    },
  });
}
