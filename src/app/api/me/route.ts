import { z } from "zod";
import { auth } from "@/auth";
import { jsonError, BODY_LIMITS, parseBody } from "@/lib/api-utils";
import { kv } from "@/lib/kv";
import { StoredProfileSchema } from "@/lib/schemas";

/**
 * Account copy of the profile and favourites, so they follow her across devices.
 * Opt-in (explicit consent, set on the profile page). Only reachable when signed in with Google.
 * Deleted automatically after 13 months without any change.
 */
const TTL = 395 * 86_400;

const FavoriteSchema = z.object({
  code: z.string().max(20),
  name: z.string().max(200),
  brand: z.string().max(100),
  image: z.string().max(500).optional(),
  score: z.number().optional(),
});

const Body = z.object({
  profile: StoredProfileSchema,
  favorites: z.array(FavoriteSchema).max(300),
  updatedAt: z.number().int().positive(),
});
export type SyncedData = z.infer<typeof Body>;

/**
 * Storage key for the signed-in account: its stable Google id (audit M-8), never the email address.
 * `legacyKey` is where the email-keyed version stored copies before; they are NOT migrated (they were
 * written under the weakness being fixed), only erased on deletion. Each device re-uploads its own copy
 * when the account has none, so no profile is lost.
 */
async function account(): Promise<{ key: string; legacyKey?: string } | null> {
  try {
    const user = (await auth())?.user;
    if (!user?.id?.startsWith("google:")) return null;
    return { key: `user:v2:${user.id}`, legacyKey: user.email ? `user:v1:${user.email.toLowerCase()}` : undefined };
  } catch {
    return null;
  }
}

const unauthorized = () => jsonError("Connectez-vous pour synchroniser vos données.", 401);
const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  const key = (await account())?.key;
  if (!key) return unauthorized();
  const data = await kv.getJSON<SyncedData>(key);
  return Response.json({ data }, { headers: noStore });
}

export async function PUT(req: Request) {
  const key = (await account())?.key;
  if (!key) return unauthorized();
  const parsed = await parseBody(req, Body, undefined, { maxBytes: BODY_LIMITS.sync });
  if (!parsed.ok) return parsed.response;
  // Last write wins, but never let an older device overwrite newer data.
  const current = await kv.getJSON<SyncedData>(key);
  if (current && current.updatedAt > parsed.data.updatedAt) return Response.json({ data: current, stale: true }, { headers: noStore });
  await kv.setJSON(key, parsed.data, TTL);
  return Response.json({ data: parsed.data }, { headers: noStore });
}

export async function DELETE() {
  const a = await account();
  if (!a) return unauthorized();
  // Erasure covers the copy saved under the old email key too (GDPR art. 17).
  await Promise.all([kv.del(a.key), a.legacyKey ? kv.del(a.legacyKey) : null]);
  return new Response(null, { status: 204 });
}
