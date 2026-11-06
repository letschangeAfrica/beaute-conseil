"use client";
import { useCallback, useEffect, useState } from "react";
import { SELFIE_CONSENT_VERSION } from "./legal";
import type { Profile } from "./types";

/*
 * Everything Belle keeps on the device lives in localStorage under "bc.*".
 * Writes go through writeLocal(), which broadcasts a "bc:storage" event so every
 * component using the same key re-reads it, and the account sync (SyncManager) can react.
 */

export const KEYS = {
  profile: "bc.profile",
  favorites: "bc.favorites",
  chat: "bc.chat",
  onboarded: "bc.onboarded",
  syncEnabled: "bc.sync.enabled",
  syncUpdatedAt: "bc.sync.updatedAt",
  ingredients: (code: string) => `bc.ingredients.${code}`,
} as const;

/** Keys saved to the account when sync is on. */
export const SYNCED_KEYS: readonly string[] = [KEYS.profile, KEYS.favorites];

export const STORAGE_EVENT = "bc:storage";
export interface StorageEventDetail {
  key: string;
  /** true when the change was made on this device (sync should upload it). */
  local: boolean;
}

export function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeLocal(key: string, value: unknown, { local = true } = {}) {
  try {
    if (value === null || value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
    if (local && SYNCED_KEYS.includes(key)) localStorage.setItem(KEYS.syncUpdatedAt, JSON.stringify(Date.now()));
  } catch {
    /* storage full or unavailable */
  }
  window.dispatchEvent(new CustomEvent<StorageEventDetail>(STORAGE_EVENT, { detail: { key, local } }));
}

/** localStorage-backed state that survives page reloads and stays in step across components. */
function useLocalState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setValue(readLocal(key, initial));
    setReady(true);
    const onChange = (e: Event) => {
      const k = (e as CustomEvent<StorageEventDetail>).detail?.key;
      if (k === key || k === "*") setValue(readLocal(key, initial));
    };
    window.addEventListener(STORAGE_EVENT, onChange);
    return () => window.removeEventListener(STORAGE_EVENT, onChange);
    // `initial` is a default for the first read only; callers pass fresh literals each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const save = useCallback(
    (next: T) => {
      setValue(next);
      writeLocal(key, next);
    },
    [key],
  );

  return [value, save, ready] as const;
}

export function useProfile() {
  return useLocalState<Profile | null>(KEYS.profile, null);
}

export interface Favorite {
  code: string;
  name: string;
  brand: string;
  image?: string;
  score?: number;
}

export function useFavorites() {
  const [favs, setFavs, ready] = useLocalState<Favorite[]>(KEYS.favorites, []);
  const isFav = (code: string) => favs.some((f) => f.code === code);
  const toggle = (f: Favorite) => setFavs(isFav(f.code) ? favs.filter((x) => x.code !== f.code) : [f, ...favs]);
  return { favs, isFav, toggle, ready };
}

/** When she agreed to send her selfie to the AI service (ISO date), for the current consent version. */
export function useSelfieConsent() {
  return useLocalState<string | null>(`bc.consent.selfie.v${SELFIE_CONSENT_VERSION}`, null);
}

/** Set once the welcome flow is finished or skipped, so it is shown only on the first visit. */
export function useOnboarded() {
  return useLocalState<boolean>(KEYS.onboarded, false);
}

/** Opt-in: keep profile and favourites in her account (explicit consent, health data). */
export function useSyncEnabled() {
  return useLocalState<boolean>(KEYS.syncEnabled, false);
}

/* ---------- Ingredients read from a label photo (per product, this device only) ---------- */

export interface LocalIngredients {
  text: string;
  name?: string;
  brand?: string;
  /** ISO date of the photo. */
  at: string;
}

export const readIngredients = (code: string) => readLocal<LocalIngredients | null>(KEYS.ingredients(code), null);
export const saveIngredients = (code: string, v: LocalIngredients) => writeLocal(KEYS.ingredients(code), v);

/** Erase everything Belle stores on this device (profile, favourites, chat, consents). */
export function clearLocalData() {
  try {
    for (const key of Object.keys(localStorage)) if (key.startsWith("bc.")) localStorage.removeItem(key);
  } catch {
    /* storage unavailable: nothing stored */
  }
  window.dispatchEvent(new CustomEvent<StorageEventDetail>(STORAGE_EVENT, { detail: { key: "*", local: false } }));
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
