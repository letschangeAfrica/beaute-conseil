import { z } from "zod";
import { jsonError, parseBody, withCatalog } from "@/lib/api-utils";
import { ProfileSchema, productDetail } from "@/lib/catalog";

const Body = z.object({ profile: ProfileSchema });

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  // Lenient on purpose: a missing or malformed body just means "no profile".
  const parsed = await parseBody(req, Body);
  const profile = parsed.ok ? parsed.data.profile : null;
  return withCatalog("product", async () => {
    const detail = await productDetail(code, profile);
    return detail ? Response.json(detail) : jsonError("Produit introuvable dans la base.", 404);
  });
}
