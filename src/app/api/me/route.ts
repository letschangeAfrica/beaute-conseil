import { z } from "zod";
import { auth } from "@/auth";
import { jsonError, parseBody } from "@/lib/api-utils";
import { kv } from "@/lib/kv";
import { ProfileSchema } from "@/lib/schemas";

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
  profile: ProfileSchema,
  favorites: z.array(FavoriteSchema).max(300),
  updatedAt: z.number().int().positive(),
});
export type SyncedData = z.infer<typeof Body>;

async function userKey(): Promise<string | null> {
  try {
    const email = (await auth())?.user?.email;
    return email ? `user:v1:${email.toLowerCase()}` : null;
  } catch {
    return null;
  }
}

const unauthorized = () => jsonError("Connectez-vous pour synchroniser vos données.", 401);
const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  const key = await userKey();
  if (!key) return unauthorized();
  const data = await kv.getJSON<SyncedData>(key);
  return Response.json({ data }, { headers: noStore });
}

export async function PUT(req: Request) {
  const key = await userKey();
  if (!key) return unauthorized();
  const parsed = await parseBody(req, Body);
  if (!parsed.ok) return parsed.response;
  // Last write wins, but never let an older device overwrite newer data.
  const current = await kv.getJSON<SyncedData>(key);
  if (current && current.updatedAt > parsed.data.updatedAt) return Response.json({ data: current, stale: true }, { headers: noStore });
  await kv.setJSON(key, parsed.data, TTL);
  return Response.json({ data: parsed.data }, { headers: noStore });
}

export async function DELETE() {
  const key = await userKey();
  if (!key) return unauthorized();
  await kv.del(key);
  return new Response(null, { status: 204 });
}
