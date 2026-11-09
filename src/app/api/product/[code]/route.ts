import { z } from "zod";
import { jsonError, parseBody, withCatalog } from "@/lib/api-utils";
import { ProfileSchema, productDetail } from "@/lib/catalog";
import { rateLimit } from "@/lib/guard";

const Body = z.object({ profile: ProfileSchema });

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  // Lenient on purpose: a malformed body (400) just means "no profile". A request refused for its type,
  // origin or size (415 / 403 / 413, audit M-3) is refused.
  const parsed = await parseBody(req, Body);
  if (!parsed.ok && parsed.response.status !== 400) return parsed.response;
  const limited = await rateLimit(req, "catalog"); // audit M-7: protects the shared Open Beauty Facts quota
  if (limited) return limited;
  const profile = parsed.ok ? parsed.data.profile : null;
  return withCatalog("product", async () => {
    const detail = await productDetail(code, profile);
    return detail ? Response.json(detail) : jsonError("Produit introuvable dans la base.", 404);
  });
}
