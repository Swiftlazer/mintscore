/**
 * POST /api/convert — betcode conversion with provider fallback chain.
 *
 * Provider chain: Betloy -> Betpaddi -> ConvertBetCodes
 * Caches results for 6 hours (codes don't change once issued).
 * Rate-limited to 10 conversions/minute per client via headers.
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/* ─── In-memory cache ─────────────────────────────────────────────── */
const cache = new Map<string, { value: ConvertResult; ts: number }>();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

function cacheKey(from: string, to: string, code: string) {
  return `${from}:${to}:${code.toUpperCase()}`;
}

function getCached(key: string): ConvertResult | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

/* ─── Rate limiter (simple sliding window per IP) ─────────────────── */
const ipHits = new Map<string, number[]>();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 10;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (ipHits.get(ip) ?? []).filter(t => now - t < RATE_WINDOW_MS);
  if (hits.length >= RATE_MAX) return true;
  hits.push(now);
  ipHits.set(ip, hits);
  return false;
}

/* ─── Types ───────────────────────────────────────────────────────── */
interface ConvertResult {
  code: string;
  bookmaker: string;
  odds?: number;
  events?: number;
  provider: string;
}

/* ─── Provider 1: Betloy ─────────────────────────────────────────── */
async function convertViaBetloy(from: string, to: string, code: string): Promise<ConvertResult> {
  const key = process.env.BETLOY_API_KEY;
  if (!key) throw new Error("not configured");

  const res = await fetch("https://api.betloy.com/v1/convert", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ code, from, to }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.message || "conversion failed");
  return { code: data.code, bookmaker: data.bookmaker, odds: data.odds, events: data.events, provider: "betloy" };
}

/* ─── Provider 2: Betpaddi ───────────────────────────────────────── */
async function convertViaBetpaddi(from: string, to: string, code: string): Promise<ConvertResult> {
  const key = process.env.BETPADDI_API_KEY;
  if (!key) throw new Error("not configured");

  const res = await fetch("https://betpaddi.com/api/v1/conversion/convert-code", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ bookie1: from, bookie2: to, code }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data.code) throw new Error(data.message || "conversion failed");
  return { code: data.code, bookmaker: to, provider: "betpaddi" };
}

/* ─── Provider 3: ConvertBetCodes ─────────────────────────────────── */
async function convertViaConvertBetCodes(from: string, to: string, code: string): Promise<ConvertResult> {
  const key = process.env.CONVERTBETCODES_API_KEY;
  if (!key) throw new Error("not configured");

  const country = process.env.BCC_COUNTRY || "ng";
  const url = new URL("https://convertbetcodes.com/api/conversion");
  url.searchParams.set("from", `${from}:${country}`);
  url.searchParams.set("to", `${to}:${country}`);
  url.searchParams.set("booking_code", code);
  url.searchParams.set("api_key", key);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const newCode = data.code || data.booking_code || data.converted_code || data.result;
  if (!newCode) throw new Error(data.message || data.error || "no code returned");
  return { code: newCode, bookmaker: to, provider: "convertbetcodes" };
}

/* ─── Route handler ───────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many conversions. Wait a minute and try again." },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => null);
  const { from, to, code } = body ?? {};

  if (!from || !to || !code) {
    return NextResponse.json({ error: "from, to, and code are required" }, { status: 400 });
  }
  if (from === to) {
    return NextResponse.json({ error: "from and to must be different" }, { status: 400 });
  }

  const f = String(from).toLowerCase().trim();
  const t = String(to).toLowerCase().trim();
  const c = String(code).toUpperCase().trim();

  const key = cacheKey(f, t, c);
  const cached = getCached(key);
  if (cached) return NextResponse.json({ ...cached, cached: true });

  const providers = [convertViaBetloy, convertViaBetpaddi, convertViaConvertBetCodes];
  const errors: Array<{ provider: string; error: string }> = [];

  for (const fn of providers) {
    try {
      const result = await fn(f, t, c);
      cache.set(key, { value: result, ts: Date.now() });
      return NextResponse.json(result);
    } catch (err) {
      errors.push({ provider: fn.name, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return NextResponse.json(
    { error: "Could not convert this code right now. Make sure the code is valid and try again.", details: errors },
    { status: 502 },
  );
}
