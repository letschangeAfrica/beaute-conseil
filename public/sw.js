/*
 * Belle service worker: offline mode.
 * - App files (/_next/static, icons): cache first (they are content-hashed).
 * - Pages: network first, then the copy from the last visit, then /hors-ligne.
 * - Product sheets (POST /api/product/<code>): network first; the last good answer is kept per barcode
 *   so a product seen before still opens in a shop without network.
 * Everything else (other APIs, sign-in, AI features) always goes to the network.
 * Caches are named "belle-*": "Supprimer mes données" deletes them.
 */
const VERSION = "v1";
const STATIC = `belle-static-${VERSION}`;
const PAGES = `belle-pages-${VERSION}`;
const PRODUCTS = `belle-products-${VERSION}`;
const OFFLINE_URL = "/hors-ligne";
/** Pages never kept offline: they depend on the session or must stay private. */
const NO_CACHE_PAGES = ["/connexion", "/admin"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES)
      .then((c) => c.addAll([OFFLINE_URL, "/"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("belle-") && ![STATIC, PAGES, PRODUCTS].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const productKey = (code) => new Request(`/__offline/product/${code}`);

async function product(request, code) {
  try {
    const res = await fetch(request);
    if (res.ok) (await caches.open(PRODUCTS)).put(productKey(code), res.clone());
    return res;
  } catch {
    const cached = await caches.match(productKey(code));
    if (cached) return cached;
    return new Response(JSON.stringify({ error: "Vous êtes hors ligne et ce produit n'a pas encore été consulté sur ce téléphone." }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function page(request) {
  try {
    const res = await fetch(request);
    const path = new URL(request.url).pathname;
    if (res.ok && res.type === "basic" && !NO_CACHE_PAGES.some((p) => path.startsWith(p))) {
      (await caches.open(PAGES)).put(request, res.clone());
    }
    return res;
  } catch {
    return (await caches.match(request, { ignoreSearch: true })) || (await caches.match(OFFLINE_URL)) || Response.error();
  }
}

async function staticAsset(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res.ok) (await caches.open(STATIC)).put(request, res.clone());
  return res;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const productMatch = request.method === "POST" && /^\/api\/product\/(\d{8,14})$/.exec(url.pathname);
  if (productMatch) return event.respondWith(product(request, productMatch[1]));

  if (request.method !== "GET" || url.pathname.startsWith("/api/")) return;
  if (request.mode === "navigate") return event.respondWith(page(request));
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname === "/icon.svg" || url.pathname === "/apple-icon.png") {
    return event.respondWith(staticAsset(request));
  }
});
