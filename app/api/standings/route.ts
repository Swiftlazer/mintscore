/**
 * GET /api/standings?code=PL
 *
 * Returns the league table for the requested competition. Each league is
 * cached upstream for 1 hour (see lib/standings.ts), so most requests
 * resolve from the data cache without hitting Football-Data.org.
 */

import { NextResponse } from "next/server";
import { getStandings, STANDINGS_LEAGUES } from "@/lib/standings";

export const dynamic = "force-dynamic";

const DEFAULT_CODE = "PL";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = (url.searchParams.get("code") ?? DEFAULT_CODE).toUpperCase();
  if (!STANDINGS_LEAGUES.some(l => l.code === code)) {
    return NextResponse.json(
      { error: `Unsupported competition: ${code}`, supported: STANDINGS_LEAGUES.map(l => l.code) },
      { status: 400 },
    );
  }
  const table = await getStandings(code);
  return NextResponse.json(table, {
    headers: {
      // Edge cache: 1h fresh + 10min stale-while-revalidate
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=600",
    },
  });
}
