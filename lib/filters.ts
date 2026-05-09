"use client";

import { useEffect, useState, useCallback } from "react";

const LEAGUE_KEY = "mintscore.filter.leagues.v1";
const TIER_KEY = "mintscore.filter.tiers.v1";

function readSet<T extends string | number>(key: string, parser: (raw: unknown) => T | null): Set<T> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return null;
    const cleaned = arr.map(parser).filter((x): x is T => x !== null);
    return cleaned.length > 0 ? new Set(cleaned) : null;
  } catch {
    return null;
  }
}

function writeSet<T extends string | number>(key: string, set: Set<T> | null) {
  if (typeof window === "undefined") return;
  try {
    if (!set || set.size === 0) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, JSON.stringify(Array.from(set)));
    }
  } catch {
    // localStorage may be disabled — silent fail
  }
}

/** League filter — persists user's league selection across visits. */
export function useLeagueFilter() {
  const [active, setActiveState] = useState<Set<string> | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setActiveState(readSet<string>(LEAGUE_KEY, x => typeof x === "string" ? x : null));
    setHydrated(true);
  }, []);

  const setActive = useCallback((next: Set<string> | null) => {
    setActiveState(next);
    writeSet(LEAGUE_KEY, next);
  }, []);

  return { active, setActive, hydrated };
}

/** Tier filter — persists user's odds-tier selection across visits. */
export function useTierFilter() {
  const [active, setActiveState] = useState<Set<number> | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setActiveState(readSet<number>(TIER_KEY, x => typeof x === "number" ? x : null));
    setHydrated(true);
  }, []);

  const setActive = useCallback((next: Set<number> | null) => {
    setActiveState(next);
    writeSet(TIER_KEY, next);
  }, []);

  return { active, setActive, hydrated };
}
