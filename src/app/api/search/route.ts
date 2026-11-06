import { z } from "zod";
import { parseBody, withCatalog } from "@/lib/api-utils";
import { ProfileSchema, searchAndScore } from "@/lib/catalog";

const Body = z.object({ q: z.string().trim().min(2).max(120), profile: ProfileSchema });

export async function POST(req: Request) {
  const parsed = await parseBody(req, Body, "Recherche invalide");
  if (!parsed.ok) return parsed.response;
  return withCatalog("search", async () => Response.json({ results: await searchAndScore(parsed.data.q, parsed.data.profile) }));
}
