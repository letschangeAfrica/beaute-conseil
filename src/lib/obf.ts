import "server-only";
import type { Product } from "./types";

/**
 * Open Beauty Facts: free, open database of cosmetics (ingredients, labels, photos).
 * https://world.openbeautyfacts.org — we must send a descriptive User-Agent.
 */
const BASE = "https://world.openbeautyfacts.org";
const UA = "BeauteConseil/0.1 (personal non-commercial project)";
const FIELDS = [
  "code",
  "product_name",
  "product_name_fr",
  "brands",
  "image_front_small_url",
  "image_front_url",
  "ingredients_text",
  "ingredients_text_fr",
  "ingredients_text_en",
  "categories_tags",
  "labels_tags",
  "quantity",
  "unique_scans_n",
].join(",");

interface RawProduct {
  code?: string;
  product_name?: string;
  product_name_fr?: string;
  brands?: string;
  image_front_small_url?: string;
  image_front_url?: string;
  ingredients_text?: string;
  ingredients_text_fr?: string;
  ingredients_text_en?: string;
  categories_tags?: string[];
  labels_tags?: string[];
  quantity?: string;
  unique_scans_n?: number;
}

function normalize(raw: RawProduct): Product | null {
  const name = (raw.product_name_fr || raw.product_name || "").trim();
  if (!raw.code || !name) return null;
  return {
    code: raw.code,
    name,
    brand: (raw.brands || "").split(",")[0].trim(),
    image: raw.image_front_url || raw.image_front_small_url,
    ingredientsText: raw.ingredients_text_en || raw.ingredients_text || raw.ingredients_text_fr || "",
    categories: raw.categories_tags ?? [],
    labels: raw.labels_tags ?? [],
    quantity: raw.quantity,
    scans: raw.unique_scans_n ?? 0,
  };
}

async function obfFetch(url: string, revalidate: number) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA },
    next: { revalidate },
  });
  if (!res.ok) throw new Error(`Open Beauty Facts ${res.status}`);
  return res.json();
}

/** Full-text search, products sold in France first, most popular first. */
export async function searchProducts(query: string, pageSize = 40): Promise<Product[]> {
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: "1",
    action: "process",
    json: "1",
    page_size: String(pageSize),
    sort_by: "unique_scans_n",
    tagtype_0: "countries",
    tag_contains_0: "contains",
    tag_0: "france",
    fields: FIELDS,
  });
  const data = await obfFetch(`${BASE}/cgi/search.pl?${params}`, 3600);
  let products = (data.products as RawProduct[]).map(normalize).filter((p): p is Product => p !== null);

  // Fallback: retry worldwide if nothing is tagged as sold in France.
  if (products.length === 0) {
    params.delete("tagtype_0");
    params.delete("tag_contains_0");
    params.delete("tag_0");
    const world = await obfFetch(`${BASE}/cgi/search.pl?${params}`, 3600);
    products = (world.products as RawProduct[]).map(normalize).filter((p): p is Product => p !== null);
  }
  return products;
}

export async function getProduct(code: string): Promise<Product | null> {
  if (!/^\d{6,14}$/.test(code)) return null;
  const data = await obfFetch(`${BASE}/api/v2/product/${code}.json?fields=${FIELDS}`, 3600);
  if (data.status !== 1 || !data.product) return null;
  return normalize({ ...data.product, code });
}

/** Products in the same (most specific) category, for the "alternatives" section. */
export async function productsInCategory(categoryTag: string, pageSize = 40): Promise<Product[]> {
  const params = new URLSearchParams({
    action: "process",
    json: "1",
    page_size: String(pageSize),
    sort_by: "unique_scans_n",
    tagtype_0: "categories",
    tag_contains_0: "contains",
    tag_0: categoryTag,
    tagtype_1: "countries",
    tag_contains_1: "contains",
    tag_1: "france",
    fields: FIELDS,
  });
  const data = await obfFetch(`${BASE}/cgi/search.pl?${params}`, 6 * 3600);
  return (data.products as RawProduct[]).map(normalize).filter((p): p is Product => p !== null);
}

/** Category tags from most specific to most general (OBF lists them general → specific). */
export function categoriesBySpecificity(p: Product): string[] {
  return p.categories.filter((t) => t.startsWith("en:")).reverse();
}
