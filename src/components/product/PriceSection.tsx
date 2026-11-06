"use client";
import { useEffect, useState } from "react";
import { ExternalLink, Globe, RotateCcw, Store, Trophy } from "lucide-react";
import { Notice, Spinner } from "@/components/ui";
import { googleShoppingUrl, STORES } from "@/lib/stores";
import type { PricePoint } from "@/lib/types";
import { errorMessage, postJson } from "@/lib/utils";

const fmt = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

/** "Prix vérifiés à l'instant" / "il y a 2 h" (results can come from a cache up to 6 h old). */
export function checkedLabel(iso: string): string {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (!(min >= 1)) return "Prix vérifiés à l'instant";
  return min < 60 ? `Prix vérifiés il y a ${min} min` : `Prix vérifiés il y a ${Math.round(min / 60)} h`;
}

type Live = { state: "idle" | "loading" | "done" | "error"; offers: PricePoint[]; summary?: string; checkedAt?: string; error?: string };

/** Where the price comes from, in words: shop prices are reported and dated, web prices checked. */
function sourceLabel(p: PricePoint, checkedAt?: string) {
  if (p.source === "web") return `En ligne · ${checkedAt ? checkedLabel(checkedAt).replace("Prix vérifiés", "vérifié") : "vérifié à l'instant"}`;
  return `En magasin${p.city ? ` · ${p.city}` : ""} · ${new Date(p.date).toLocaleDateString("fr-FR")}`;
}

function SourceIcon({ p, className = "" }: { p: PricePoint; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${p.source === "web" ? "bg-gold/60 text-ink" : "bg-paper text-caramel-ink ring-1 ring-line"} ${className}`}
    >
      {p.source === "web" ? <Globe size={18} /> : <Store size={18} />}
    </span>
  );
}

/** Link out for web offers (new tab), plain row for shop prices. */
function Wrap({ p, className, children }: { p: PricePoint; className: string; children: React.ReactNode }) {
  return p.url ? (
    <a href={p.url} target="_blank" rel="noopener noreferrer" className={`${className} transition-colors hover:bg-paper`}>
      {children}
    </a>
  ) : (
    <div className={className}>{children}</div>
  );
}

/**
 * Prices: the best one highlighted, then a compact table; shop vs web always labelled.
 * The live search (about 30 s) shows its elapsed time; with no price at all, the store links lead.
 */
export function PriceSection({ name, brand, code, quantity, city, prices }: { name: string; brand: string; code: string; quantity?: string; city?: string; prices: PricePoint[] }) {
  const [live, setLive] = useState<Live>({ state: "idle", offers: [] });
  const [elapsed, setElapsed] = useState(0);
  const [announce, setAnnounce] = useState("");

  useEffect(() => {
    if (live.state !== "loading") return;
    setElapsed(0);
    const t = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [live.state]);

  async function checkLivePrices() {
    setLive({ state: "loading", offers: [] });
    setAnnounce("Comparaison des prix en ligne lancée. Environ 30 secondes.");
    try {
      const json = await postJson<{ offers: PricePoint[]; summary: string; checkedAt: string }>("/api/live-prices", { name, brand, code, quantity, city });
      setLive({ state: "done", offers: json.offers, summary: json.summary, checkedAt: json.checkedAt });
      setAnnounce(json.summary || (json.offers.length ? `${json.offers.length} offres trouvées en ligne.` : "Aucune offre trouvée en ligne."));
    } catch (e) {
      const msg = errorMessage(e);
      setLive({ state: "error", offers: [], error: msg });
      setAnnounce(`La comparaison a échoué. ${msg}`);
    }
  }

  const all = [...live.offers, ...prices].sort((a, b) => a.price - b.price).slice(0, 8);
  const [best, ...rest] = all;
  const searchQ = `${brand} ${name}`.trim();
  const noPrices = all.length === 0;

  const storeLinks = (
    <div className={noPrices ? "" : "border-t border-line pt-5"}>
      <h3 className={`font-semibold ${noPrices ? "text-ink" : "text-sm text-ink/75"}`}>Rechercher directement chez</h3>
      <ul className={`mt-3 ${noPrices ? "grid grid-cols-2 gap-2 sm:grid-cols-3" : "flex flex-wrap gap-2"}`}>
        {[{ name: "Google Shopping", href: googleShoppingUrl(searchQ) }, ...STORES.map((s) => ({ name: s.name, href: s.search(searchQ) }))].map((s) => (
          <li key={s.name} className="min-w-0">
            <a
              className={noPrices ? "flex min-h-12 items-center justify-between gap-2 rounded-tile bg-white px-4 font-semibold text-ink ring-1 ring-line transition hover:ring-caramel" : "chip-off"}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="truncate">{s.name}</span>
              <ExternalLink size={14} aria-hidden="true" className="shrink-0 text-ink/60" />
              <span className="sr-only"> (nouvel onglet)</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <section aria-labelledby="prices-title" className="card space-y-5 p-5 sm:p-6">
      <div>
        <h2 id="prices-title" className="font-display text-[1.35rem] leading-tight text-ink">
          Où l&apos;acheter au meilleur prix
        </h2>
        <p className="mt-1 text-sm text-ink/70">Prix relevés en magasin par la communauté Open Prices, et prix en ligne vérifiés à votre demande.</p>
      </div>

      <p className="sr-only" aria-live="polite">
        {announce}
      </p>

      {live.state === "done" && live.summary && (
        <div className="rounded-tile bg-good-soft p-4 text-sm font-semibold text-good">
          {live.summary}
          {live.checkedAt && <span className="mt-1 block font-normal text-ink/75">{checkedLabel(live.checkedAt)}</span>}
        </div>
      )}

      {/* Best price, then the others: never a price we don't have. */}
      {best && (
        <div>
          <Wrap p={best} className="block rounded-tile bg-paper p-4 ring-1 ring-line">
            {all.length > 1 && (
              <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-good-soft px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-good">
                <Trophy size={12} aria-hidden="true" /> Meilleur prix
              </p>
            )}
            <span className="flex items-center gap-3.5">
              <SourceIcon p={best} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-ink">{best.store}</span>
                <span className="block text-xs text-ink/70">{sourceLabel(best, live.checkedAt)}</span>
              </span>
              <span className="shrink-0 font-display text-[1.6rem] leading-none tabular-nums text-ink sm:text-[1.8rem]">{fmt(best.price)}</span>
              {best.url && <ExternalLink size={16} aria-hidden="true" className="shrink-0 text-ink/60" />}
            </span>
          </Wrap>
          {rest.length > 0 && (
            <ul className="mt-2 divide-y divide-line">
              {rest.map((pp, i) => (
                <li key={`${pp.store}-${i}`}>
                  <Wrap p={pp} className="flex min-h-14 items-center gap-3 rounded-tile px-2 py-2.5">
                    <SourceIcon p={pp} className="h-9 w-9" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink">{pp.store}</p>
                      <p className="text-xs text-ink/70">{sourceLabel(pp, live.checkedAt)}</p>
                    </div>
                    <p className="shrink-0 font-bold tabular-nums text-ink">{fmt(pp.price)}</p>
                    {pp.url && <ExternalLink size={15} aria-hidden="true" className="shrink-0 text-ink/60" />}
                  </Wrap>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {noPrices && live.state !== "loading" && (
        <p className="text-ink/75">{live.state === "done" ? "Aucune offre trouvée en ligne pour ce produit précis." : "Aucun prix relevé en magasin pour l'instant."}</p>
      )}

      {noPrices && storeLinks}

      {/* Live comparison */}
      {live.state === "loading" && (
        <div className="rounded-tile bg-paper p-4 ring-1 ring-line">
          <div className="flex items-center justify-between gap-3 text-sm font-semibold text-ink">
            <Spinner label="Comparaison des sites en cours…" />
            <span className="tabular-nums text-ink/70">{elapsed} s</span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink/10">
            <div className="h-full rounded-full bg-brand transition-[width] duration-1000 ease-linear motion-reduce:transition-none" style={{ width: `${Math.min(95, (elapsed / 30) * 100)}%` }} />
          </div>
          <p className="mt-2 text-xs text-ink/70">Environ 30 secondes : nous consultons plusieurs enseignes.</p>
        </div>
      )}

      {live.state === "error" && <Notice kind="error">{live.error}</Notice>}

      {(live.state === "idle" || live.state === "error") && (
        <div className={noPrices ? "" : "sm:rounded-tile sm:border sm:border-dashed sm:border-line sm:p-4"}>
          {!noPrices && <p className="mb-3 text-sm text-ink/75">Belle consulte plusieurs enseignes en ligne pour vous, en 30 secondes environ.</p>}
          <button type="button" className={`${noPrices ? "btn-secondary" : "btn-primary"} w-full`} onClick={checkLivePrices}>
            {live.state === "error" ? <RotateCcw size={18} aria-hidden="true" /> : <Globe size={18} aria-hidden="true" />}
            {live.state === "error" ? "Réessayer la comparaison" : "Comparer les prix en ligne"}
          </button>
        </div>
      )}

      {live.state === "done" && <p className="text-xs text-ink/70">Prix indicatifs relevés automatiquement. Vérifiez sur le site avant d&apos;acheter.</p>}

      {!noPrices && storeLinks}
    </section>
  );
}
