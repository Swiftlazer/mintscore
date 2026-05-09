"use client";

import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "mintscore.favorites.v1";

/**
 * Stored shape: a Set of team IDs (numbers from Football-Data.org).
 * We use IDs not names so we don't break when display names get tweaked.
 */
function readFavorites(): Set<number> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is number => typeof x === "number"));
  } catch {
    return new Set();
  }
}

function writeFavorites(set: Set<number>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // localStorage may be disabled (private browsing on iOS, etc.) — silent fail
  }
}

/**
 * React hook returning the current favorites Set + a toggler.
 * Synchronises across tabs via the storage event so multiple Mintscore tabs stay consistent.
 */
export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<number>>(() => new Set());
  const [hydrated, setHydrated] = useState(false);

  // Read from localStorage once on mount (avoiding SSR/hydration mismatch).
  useEffect(() => {
    setFavorites(readFavorites());
    setHydrated(true);

    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setFavorites(readFavorites());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggle = useCallback((teamId: number) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      writeFavorites(next);
      return next;
    });
  }, []);

  const isFavorite = useCallback((teamId: number) => favorites.has(teamId), [favorites]);

  return { favorites, isFavorite, toggle, hydrated };
}
