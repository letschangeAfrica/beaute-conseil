import { z } from "zod";
import { parseBody } from "@/lib/api-utils";
import { ProfileSchema, productDetail } from "@/lib/catalog";

const Body = z.object({ profile: ProfileSchema });

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  // Lenient on purpose: a missing or malformed body just means "no profile".
  const parsed = await parseBody(req, Body);
  const profile = parsed.ok ? parsed.data.profile : null;
  try {
    const detail = await productDetail(code, profile);
    if (!detail) return Response.json({ error: "Produit introuvable dans la base." }, { status: 404 });
    return Response.json(detail);
  } catch (err) {
    console.error("product", err);
    return Response.json({ error: "La base produits ne répond pas, réessayez dans un instant." }, { status: 502 });
  }
}
