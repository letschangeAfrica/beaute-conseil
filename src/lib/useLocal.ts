"use client";
import { useCallback, useEffect, useState } from "react";
import type { Profile } from "./types";

/** localStorage-backed state that survives page reloads (per device). */
function useLocalState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setValue(JSON.parse(raw));
    } catch {
      /* storage unavailable: keep defaults */
    }
    setReady(true);
  }, [key]);

  const save = useCallback(
    (next: T) => {
      setValue(next);
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    [key],
  );

  return [value, save, ready] as const;
}

export function useProfile() {
  return useLocalState<Profile | null>("bc.profile", null);
}

export interface Favorite {
  code: string;
  name: string;
  brand: string;
  image?: string;
  score?: number;
}

export function useFavorites() {
  const [favs, setFavs, ready] = useLocalState<Favorite[]>("bc.favorites", []);
  const isFav = (code: string) => favs.some((f) => f.code === code);
  const toggle = (f: Favorite) => setFavs(isFav(f.code) ? favs.filter((x) => x.code !== f.code) : [f, ...favs]);
  return { favs, isFav, toggle, ready };
}

export const DEFAULT_PROFILE: Profile = {
  skinType: "normale",
  sensitive: false,
  skinTone: "moyen",
  undertone: "inconnu",
  concerns: [],
  avoid: [],
  prefs: [],
  allergies: [],
  budget: 25,
};
