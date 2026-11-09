import { z } from "zod";
import { parseBody, withCatalog } from "@/lib/api-utils";
import { ProfileSchema, searchAndScore } from "@/lib/catalog";
import { rateLimit } from "@/lib/guard";

const Body = z.object({ q: z.string().trim().min(2).max(120), profile: ProfileSchema });

export async function POST(req: Request) {
  const parsed = await parseBody(req, Body, "Recherche invalide");
  if (!parsed.ok) return parsed.response;
  const limited = await rateLimit(req, "catalog"); // audit M-7: protects the shared Open Beauty Facts quota
  if (limited) return limited;
  return withCatalog("search", async () => Response.json({ results: await searchAndScore(parsed.data.q, parsed.data.profile) }));
}
