// server.js — Free bet code converter backend
// Provider chain: Betloy → Betpaddi → ConvertBetCodes

import express from "express";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
// Required when behind a proxy (Vercel, Railway, nginx, Cloudflare, etc.)
// so rate-limit sees the real client IP and not your proxy's IP.
app.set("trust proxy", 1);
app.use(express.static("public"));

// ─── Cache ──────────────────────────────────────────────────────────────
// Codes don't change once issued, so caching is safe and saves credits.
const cache = new Map();
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours

const cacheKey = (from, to, code) => `${from}:${to}:${code.toUpperCase()}`;

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

const setCached = (key, value) => cache.set(key, { value, ts: Date.now() });

// ─── Rate limiter ──────────────────────────────────────────────────────
// 10 conversions per minute per IP. Generous for real users; tight enough
// that a bot can't drain your free credits in seconds.
const convertLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many conversions. Wait a minute and try again." },
});

// ─── Provider 1: Betloy ────────────────────────────────────────────────
async function convertViaBetloy(from, to, code) {
  if (!process.env.BETLOY_API_KEY) throw new Error("Betloy not configured");

  const res = await fetch("https://api.betloy.com/v1/convert", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.BETLOY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code, from, to }),
  });

  if (!res.ok) throw new Error(`Betloy HTTP ${res.status}`);

  const data = await res.json();
  if (!data.success) throw new Error(data.message || "Betloy: conversion failed");

  return {
    code: data.code,
    bookmaker: data.bookmaker,
    odds: data.odds,
    events: data.events,
    provider: "betloy",
  };
}

// ─── Provider 2: Betpaddi ──────────────────────────────────────────────
async function convertViaBetpaddi(from, to, code) {
  if (!process.env.BETPADDI_API_KEY) throw new Error("Betpaddi not configured");

  const res = await fetch("https://betpaddi.com/api/v1/conversion/convert-code", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.BETPADDI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ bookie1: from, bookie2: to, code }),
  });

  if (!res.ok) throw new Error(`Betpaddi HTTP ${res.status}`);

  const data = await res.json();
  if (!data.code) throw new Error(data.message || "Betpaddi: conversion failed");

  return {
    code: data.code,
    bookmaker: to,
    provider: "betpaddi",
  };
}

// ─── Provider 3: ConvertBetCodes ───────────────────────────────────────
// Uses the bookie:country_code format documented at convertbetcodes.com.
// Defaults to 'ng' (Nigeria). Override with BCC_COUNTRY env var (e.g. 'ke').
async function convertViaConvertBetCodes(from, to, code) {
  if (!process.env.CONVERTBETCODES_API_KEY) throw new Error("ConvertBetCodes not configured");

  const country = process.env.BCC_COUNTRY || "ng";
  const url = new URL("https://convertbetcodes.com/api/conversion");
  url.searchParams.set("from", `${from}:${country}`);
  url.searchParams.set("to", `${to}:${country}`);
  url.searchParams.set("booking_code", code);
  url.searchParams.set("api_key", process.env.CONVERTBETCODES_API_KEY);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`ConvertBetCodes HTTP ${res.status}`);

  const data = await res.json();
  // Response shape isn't strictly documented — be defensive about field names.
  const newCode = data.code || data.booking_code || data.converted_code || data.result;
  if (!newCode) throw new Error(data.message || data.error || "ConvertBetCodes: no code returned");

  return {
    code: newCode,
    bookmaker: to,
    provider: "convertbetcodes",
  };
}

// ─── Conversion endpoint (rate-limited) ────────────────────────────────
app.post("/api/convert", convertLimiter, async (req, res) => {
  const { from, to, code } = req.body || {};

  if (!from || !to || !code) {
    return res.status(400).json({ error: "from, to, and code are required" });
  }
  if (from === to) {
    return res.status(400).json({ error: "from and to must be different" });
  }

  const f = String(from).toLowerCase().trim();
  const t = String(to).toLowerCase().trim();
  const c = String(code).toUpperCase().trim();

  // Cache hit = zero API credits used
  const key = cacheKey(f, t, c);
  const cached = getCached(key);
  if (cached) return res.json({ ...cached, cached: true });

  const errors = [];

  // Try providers in order. First success wins.
  // Order = cheapest/most reliable first.
  const providers = [convertViaBetloy, convertViaBetpaddi, convertViaConvertBetCodes];

  for (const fn of providers) {
    try {
      const result = await fn(f, t, c);
      setCached(key, result);
      return res.json(result);
    } catch (err) {
      errors.push({ provider: fn.name, error: err.message });
    }
  }

  return res.status(502).json({
    error: "Could not convert this code right now",
    details: errors,
  });
});

// Health check — shows which providers are configured
app.get("/api/health", (_req, res) =>
  res.json({
    ok: true,
    cached: cache.size,
    providers: {
      betloy: !!process.env.BETLOY_API_KEY,
      betpaddi: !!process.env.BETPADDI_API_KEY,
      convertbetcodes: !!process.env.CONVERTBETCODES_API_KEY,
    },
  })
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Converter running on http://localhost:${PORT}`));
