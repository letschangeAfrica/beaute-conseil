import { z } from "zod";
import { parseBody } from "@/lib/api-utils";
import { ProfileSchema, searchAndScore } from "@/lib/catalog";

const Body = z.object({ q: z.string().trim().min(2).max(120), profile: ProfileSchema });

export async function POST(req: Request) {
  const parsed = await parseBody(req, Body, "Recherche invalide");
  if (!parsed.ok) return parsed.response;
  try {
    const results = await searchAndScore(parsed.data.q, parsed.data.profile);
    return Response.json({ results });
  } catch (err) {
    console.error("search", err);
    return Response.json({ error: "La base produits ne répond pas, réessayez dans un instant." }, { status: 502 });
  }
}
