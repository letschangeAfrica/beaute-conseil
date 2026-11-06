/** French beauty retailers, with a search link for each. */
export interface Store {
  name: string;
  domain: string;
  kind: "parfumerie" | "pharmacie" | "marketplace" | "grande-surface" | "marque";
  search: (q: string) => string;
}

const enc = encodeURIComponent;
const google = (domain: string) => (q: string) => `https://www.google.fr/search?q=${enc(`site:${domain} ${q}`)}`;

export const STORES: Store[] = [
  { name: "Sephora", domain: "sephora.fr", kind: "parfumerie", search: (q) => `https://www.sephora.fr/recherche/?q=${enc(q)}` },
  { name: "Nocibé", domain: "nocibe.fr", kind: "parfumerie", search: google("nocibe.fr") },
  { name: "Marionnaud", domain: "marionnaud.fr", kind: "parfumerie", search: (q) => `https://www.marionnaud.fr/search?text=${enc(q)}` },
  { name: "Notino", domain: "notino.fr", kind: "parfumerie", search: (q) => `https://www.notino.fr/search.asp?exps=${enc(q)}` },
  { name: "Amazon.fr", domain: "amazon.fr", kind: "marketplace", search: (q) => `https://www.amazon.fr/s?k=${enc(q)}` },
  { name: "Cocooncenter", domain: "cocooncenter.com", kind: "pharmacie", search: google("cocooncenter.com") },
  { name: "Pharma GDD", domain: "pharma-gdd.com", kind: "pharmacie", search: google("pharma-gdd.com") },
  { name: "Monoprix", domain: "monoprix.fr", kind: "grande-surface", search: google("monoprix.fr") },
];

/** Domains Claude may search for live prices. */
export const PRICE_DOMAINS = [
  "sephora.fr",
  "nocibe.fr",
  "marionnaud.fr",
  "notino.fr",
  "amazon.fr",
  "cocooncenter.com",
  "pharma-gdd.com",
  "1001pharmacies.com",
  "monoprix.fr",
  "carrefour.fr",
  "auchan.fr",
  "galerieslafayette.com",
  "lookfantastic.fr",
  "yves-rocher.fr",
];

export function googleShoppingUrl(q: string) {
  return `https://www.google.fr/search?tbm=shop&gl=fr&hl=fr&q=${enc(q)}`;
}
