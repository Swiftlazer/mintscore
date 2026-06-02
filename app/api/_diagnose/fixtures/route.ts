/**
 * GET /api/_diagnose/fixtures
 *
 * Mirrors the Football-Data.org query the home page makes for the upcoming
 * 14 days and reports back what came in — useful for figuring out why the
 * home page might be empty without exposing the token.
 *
 * Returns:
 *  - request: the URL hit (token redacted)
 *  - response: status + (if ok) match count + competition breakdown
 *  - supportedFilter: which of those matches survive the SUPPORTED_FREE filter
 *
 * No auth required; never exposes the token; safe to leave in production.
 */

import { NextResponse } from "next/server";

const BASE = "https://api.football-data.org/v4";
const SUPPORTED_FREE = ["PL", "BL1", "SA", "PD", "FL1", "CL", "EC", "WC", "DED", "PPL", "ELC", "BSA"];

export const dynamic = "force-dynamic";

interface FdMatch {
  id: number;
  utcDate: string;
  status: string;
  competition: { code: string; name: string };
  homeTeam: { name: string };
  awayTeam: { name: string };
}

export async function GET(req: Request) {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  const tokenStatus = token ? `set (length ${token.length})` : "MISSING";

  const url = new URL(req.url);
  const daysAhead = Math.min(Math.max(Number(url.searchParams.get("days") ?? "14"), 1), 30);

  const today = new Date();
  const end = new Date(today);
  end.setDate(today.getDate() + daysAhead);
  const dateFrom = today.toISOString().slice(0, 10);
  const dateTo = end.toISOString().slice(0, 10);

  const fdUrl = `${BASE}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`;
  const out: Record<string, unknown> = {
    server: { now: today.toISOString(), nodeEnv: process.env.NODE_ENV ?? "unknown" },
    token: tokenStatus,
    request: { url: fdUrl, dateFrom, dateTo, daysAhead },
    supportedFreeFilter: SUPPORTED_FREE,
  };

  if (!token) {
    return NextResponse.json({ ...out, error: "FOOTBALL_DATA_TOKEN not configured" }, { status: 200 });
  }

  try {
    const res = await fetch(fdUrl, {
      headers: { "X-Auth-Token": token },
      cache: "no-store",   // diagnostic should bypass cache and show live truth
    });
    out.response = {
      status: res.status,
      statusText: res.statusText,
      headers: {
        "x-requestcounter-reset": res.headers.get("x-requestcounter-reset"),
        "x-requests-available-minute": res.headers.get("x-requests-available-minute"),
        "content-type": res.headers.get("content-type"),
      },
    };
    if (!res.ok) {
      const body = await res.text();
      return NextResponse.json({ ...out, body: body.slice(0, 500) }, { status: 200 });
    }
    const data = (await res.json()) as { matches?: FdMatch[]; resultSet?: unknown };

    const matches = data.matches ?? [];
    // Breakdown by competition code.
    const byCompetition: Record<string, number> = {};
    for (const m of matches) {
      const code = m.competition?.code ?? "(unknown)";
      byCompetition[code] = (byCompetition[code] ?? 0) + 1;
    }
    // What survives our filter.
    const afterFilter = matches.filter(m => SUPPORTED_FREE.includes(m.competition?.code));
    // Sample preview so you can sanity-check the data.
    const sample = matches.slice(0, 5).map(m => ({
      id: m.id,
      utcDate: m.utcDate,
      status: m.status,
      competition: m.competition?.code,
      teams: `${m.homeTeam?.name} v ${m.awayTeam?.name}`,
    }));

    return NextResponse.json({
      ...out,
      totals: {
        rawMatchCount: matches.length,
        afterSupportedFreeFilter: afterFilter.length,
        suppressedByFilter: matches.length - afterFilter.length,
        uniqueCompetitionsInResponse: Object.keys(byCompetition).length,
      },
      byCompetition,
      sample,
      resultSet: data.resultSet,
    });
  } catch (err) {
    return NextResponse.json(
      { ...out, error: err instanceof Error ? err.message : "fetch failed" },
      { status: 200 },
    );
  }
}
