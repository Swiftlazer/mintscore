"use client";

import { useState, useCallback, useRef, useEffect } from "react";

/* ─── Supported bookmakers (Nigerian big 5) ───────────────────────── */
const BOOKMAKERS = [
  { value: "sportybet", label: "SportyBet" },
  { value: "bet9ja",    label: "Bet9ja" },
  { value: "1xbet",     label: "1xBet" },
  { value: "betking",   label: "BetKing" },
  { value: "msport",    label: "MSport" },
] as const;

type BookmakerKey = (typeof BOOKMAKERS)[number]["value"];

interface ConvertResult {
  code: string;
  bookmaker: string;
  odds?: number;
  events?: number;
  provider: string;
  cached?: boolean;
}

export default function BetcodeConverter() {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState<BookmakerKey>("sportybet");
  const [to, setTo] = useState<BookmakerKey>("bet9ja");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ConvertResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when panel opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const swap = useCallback(() => {
    setFrom(to);
    setTo(from);
    setResult(null);
    setError(null);
  }, [from, to]);

  const convert = useCallback(async () => {
    const trimmed = code.trim();
    if (!trimmed) { setError("Paste a booking code first."); return; }
    if (from === to) { setError("Pick two different bookmakers."); return; }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, to, code: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Conversion failed. Try again.");
      } else {
        setResult(data);
      }
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [from, to, code]);

  const copyCode = useCallback(() => {
    if (!result?.code) return;
    navigator.clipboard.writeText(result.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [result]);

  const bookmakerLabel = (key: string) =>
    BOOKMAKERS.find(b => b.value === key)?.label ?? key;

  return (
    <>
      {/* ─── Floating action button ─── */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 left-1/2 z-40 -translate-x-1/2 inline-flex items-center gap-2 rounded-full bg-edge px-4 py-2.5 text-sm font-bold text-ink shadow-lg shadow-edge/20 transition hover:scale-[1.02] hover:bg-edge/90"
        aria-label="Open bet code converter"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
        </svg>
        Convert Code
      </button>

      {/* ─── Modal overlay + panel ─── */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-ink/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-md rounded-t-2xl border border-hairline bg-ink shadow-2xl sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl"
            role="dialog"
            aria-label="Bet code converter"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
              <div>
                <h2 className="font-display text-lg font-bold tracking-tight text-bone">
                  Bet Code Converter
                </h2>
                <p className="mt-0.5 text-xs text-bone/50">
                  Convert booking codes between bookmakers
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-1.5 text-bone/60 hover:bg-mist hover:text-bone"
                aria-label="Close"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-5">
              {/* From / Swap / To */}
              <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                <div>
                  <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-bone/40">
                    From
                  </label>
                  <select
                    value={from}
                    onChange={e => { setFrom(e.target.value as BookmakerKey); setResult(null); setError(null); }}
                    className="w-full rounded-lg border border-hairline bg-mist/40 px-3 py-2.5 text-sm font-semibold text-bone focus:border-edge focus:outline-none"
                  >
                    {BOOKMAKERS.map(b => (
                      <option key={b.value} value={b.value}>{b.label}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={swap}
                  className="mb-0.5 rounded-full p-2 text-bone/50 transition hover:bg-mist hover:text-edge"
                  aria-label="Swap bookmakers"
                  title="Swap"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 3L4 7l4 4" /><path d="M4 7h16" />
                    <path d="M16 21l4-4-4-4" /><path d="M20 17H4" />
                  </svg>
                </button>

                <div>
                  <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-bone/40">
                    To
                  </label>
                  <select
                    value={to}
                    onChange={e => { setTo(e.target.value as BookmakerKey); setResult(null); setError(null); }}
                    className="w-full rounded-lg border border-hairline bg-mist/40 px-3 py-2.5 text-sm font-semibold text-bone focus:border-edge focus:outline-none"
                  >
                    {BOOKMAKERS.map(b => (
                      <option key={b.value} value={b.value}>{b.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Code input */}
              <div className="mt-4">
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-bone/40">
                  Booking Code
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={code}
                  onChange={e => { setCode(e.target.value.toUpperCase()); setResult(null); setError(null); }}
                  onKeyDown={e => { if (e.key === "Enter") convert(); }}
                  placeholder="e.g. B3US96U"
                  autoComplete="off"
                  className="w-full rounded-lg border border-hairline bg-mist/40 px-3 py-2.5 font-mono text-base font-semibold tracking-wider text-bone placeholder:text-bone/30 focus:border-edge focus:outline-none"
                />
              </div>

              {/* Convert button */}
              <button
                type="button"
                onClick={convert}
                disabled={loading || !code.trim()}
                className="mt-4 w-full rounded-lg bg-edge py-3 text-sm font-bold text-ink transition hover:bg-edge/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    Converting...
                  </span>
                ) : (
                  "Convert"
                )}
              </button>

              {/* Error */}
              {error && (
                <div className="mt-4 rounded-lg border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn">
                  {error}
                </div>
              )}

              {/* Result */}
              {result && (
                <div className="mt-4 rounded-lg border border-edge/30 bg-edge/10 px-4 py-4">
                  <p className="text-xs text-bone/50">
                    New code on <span className="font-semibold text-bone">{bookmakerLabel(result.bookmaker)}</span>
                  </p>
                  <p className="mt-1 font-mono text-2xl font-bold tracking-wider text-edge">
                    {result.code}
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={copyCode}
                      className="inline-flex items-center gap-1.5 rounded-md border border-edge/40 px-3 py-1.5 text-xs font-semibold text-edge transition hover:bg-edge/20"
                    >
                      {copied ? (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Copied!
                        </>
                      ) : (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                          Copy
                        </>
                      )}
                    </button>
                    <span className="text-[10px] text-bone/30">
                      {[
                        result.events ? `${result.events} events` : null,
                        result.odds ? `odds ${result.odds}` : null,
                        result.cached ? "cached" : null,
                      ].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-hairline px-5 py-3">
              <p className="text-center text-[10px] text-bone/30">
                Codes are converted via third-party APIs. Verify selections before placing any bet.
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
}
