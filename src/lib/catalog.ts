import "server-only";
import { categoriesBySpecificity, getProduct, productsInCategory, searchProducts } from "./obf";
import { getReportedPrices } from "./prices";
import { scoreProduct } from "./scoring";
import type { Product, Profile, ScoredProduct } from "./types";

/** Re-exported so existing `import { ProfileSchema } from "@/lib/catalog"` call sites keep working. */
export { ProfileSchema } from "./schemas";

export async function searchAndScore(query: string, profile: Profile | null, limit = 30): Promise<ScoredProduct[]> {
  const products = await searchProducts(query, 40);
  return products
    .map((p) => scoreProduct(p, profile))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export async function productDetail(code: string, profile: Profile | null) {
  const product = await getProduct(code);
  if (!product) return null;

  const [prices, alternatives] = await Promise.all([getReportedPrices(code), findAlternatives(code, product, profile)]);
  const scored = scoreProduct(product, profile, prices[0]);
  return { product: scored, prices, alternatives };
}

async function findAlternatives(
  code: string,
  product: NonNullable<Awaited<ReturnType<typeof getProduct>>>,
  profile: Profile | null,
): Promise<ScoredProduct[]> {
  // Start with the most specific category; widen (e.g. powder-foundations → foundations)
  // until there are enough products to compare. Skip very generic tags like "makeup".
  const cats = categoriesBySpecificity(product).filter((c) => !["en:makeup", "en:cosmetics", "en:face-makeup"].includes(c)).slice(0, 3);
  if (!cats.length) return [];
  try {
    let others: Product[] = [];
    for (const cat of cats) {
      others = await productsInCategory(cat, 40);
      if (others.length >= 5) break;
    }
    const scored = others
      .filter((p) => p.code !== code)
      .map((p) => scoreProduct(p, profile))
      .filter((p) => p.verdict !== "inconnu" && p.verdict !== "eviter")
      .sort((a, b) => b.score - a.score);
    // Prefer other brands, so the list works as a "dupe finder".
    const otherBrands = scored.filter((p) => p.brand.toLowerCase() !== product.brand.toLowerCase());
    return (otherBrands.length >= 3 ? otherBrands : scored).slice(0, 6);
  } catch {
    return [];
  }
}
