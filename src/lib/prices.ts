import "server-only";
import type { PricePoint } from "./types";

/**
 * Open Prices (by Open Food Facts): crowd-sourced shelf prices, with receipts as proof.
 * https://prices.openfoodfacts.org/api/docs
 */
const BASE = "https://prices.openfoodfacts.org/api/v1";

interface RawPrice {
  price: number;
  currency: string;
  date: string;
  location?: {
    osm_name?: string;
    osm_brand?: string;
    osm_address_city?: string;
    osm_address_country_code?: string;
    website_url?: string;
  };
}

export async function getReportedPrices(code: string): Promise<PricePoint[]> {
  const params = new URLSearchParams({ product_code: code, order_by: "-date", size: "30" });
  try {
    const res = await fetch(`${BASE}/prices?${params}`, { next: { revalidate: 1800 } });
    if (!res.ok) return [];
    const data = (await res.json()) as { items: RawPrice[] };
    return data.items
      .filter((p) => p.currency === "EUR" && p.price > 0)
      .map((p) => ({
        price: p.price,
        currency: p.currency,
        date: p.date,
        store: p.location?.osm_brand || p.location?.osm_name || "Magasin",
        city: p.location?.osm_address_city,
        source: "open-prices" as const,
      }))
      .sort((a, b) => a.price - b.price);
  } catch {
    return [];
  }
}
