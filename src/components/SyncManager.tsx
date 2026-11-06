"use client";
import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import type { Profile } from "@/lib/types";
import { type Favorite, KEYS, STORAGE_EVENT, SYNCED_KEYS, type StorageEventDetail, readLocal, useSyncEnabled, writeLocal } from "@/lib/useLocal";

interface Synced {
  profile: Profile | null;
  favorites: Favorite[];
  updatedAt: number;
}

const snapshot = (): Synced => ({
  profile: readLocal<Profile | null>(KEYS.profile, null),
  favorites: readLocal<Favorite[]>(KEYS.favorites, []),
  updatedAt: readLocal<number>(KEYS.syncUpdatedAt, 0),
});

function apply(data: Synced) {
  writeLocal(KEYS.profile, data.profile, { local: false });
  writeLocal(KEYS.favorites, data.favorites, { local: false });
  writeLocal(KEYS.syncUpdatedAt, data.updatedAt, { local: false });
}

async function upload(): Promise<void> {
  const s = snapshot();
  if (!s.updatedAt) return;
  const res = await fetch("/api/me", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) });
  if (!res.ok) return;
  const json = (await res.json()) as { data: Synced; stale?: boolean };
  if (json.stale) apply(json.data); // another device saved something newer in the meantime
}

/**
 * Keeps profile and favourites in step with her account, when she is signed in and has turned sync on.
 * Renders nothing. Strategy: on load, the newer of (device, account) wins; afterwards every local
 * change is uploaded after a short pause.
 */
export function SyncManager() {
  const { status } = useSession();
  const [enabled, , ready] = useSyncEnabled();
  const active = status === "authenticated" && ready && enabled;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initial reconciliation.
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const { data } = (await res.json()) as { data: Synced | null };
        const local = snapshot();
        if (data && data.updatedAt > local.updatedAt) apply(data);
        else if (local.profile || local.favorites.length) {
          if (!local.updatedAt) writeLocal(KEYS.syncUpdatedAt, Date.now(), { local: false });
          if (!data || local.updatedAt > data.updatedAt || !local.updatedAt) await upload();
        }
      } catch {
        /* offline: try again on next load */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active]);

  // Upload local edits.
  useEffect(() => {
    if (!active) return;
    const onChange = (e: Event) => {
      const d = (e as CustomEvent<StorageEventDetail>).detail;
      if (!d?.local || !SYNCED_KEYS.includes(d.key)) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => upload().catch(() => {}), 1000);
    };
    window.addEventListener(STORAGE_EVENT, onChange);
    return () => {
      window.removeEventListener(STORAGE_EVENT, onChange);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [active]);

  return null;
}

/** Deletes the account copy (used when turning sync off or erasing all data). */
export async function deleteAccountCopy(): Promise<boolean> {
  try {
    const res = await fetch("/api/me", { method: "DELETE" });
    return res.ok || res.status === 401;
  } catch {
    return false;
  }
}
