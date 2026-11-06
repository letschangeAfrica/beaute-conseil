"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  CircleCheck,
  CircleX,
  ExternalLink,
  FlaskConical,
  Globe,
  Heart,
  Info,
  Palette,
  Repeat,
  ScanText,
  ShieldAlert,
  Store,
  Tag,
} from "lucide-react";
import { IngredientPhoto, type LabelReading } from "@/components/IngredientPhoto";
import ProductCard, { ProductImage } from "@/components/ProductCard";
import { ShadeFinder } from "@/components/ShadeFinder";
import { Notice, PageHeader, ScoreRing, SectionTitle, Skeleton, Spinner, VERDICT } from "@/components/ui";
import { googleShoppingUrl, STORES } from "@/lib/stores";
import { isComplexionProduct, scoreProduct, shadeAdvice } from "@/lib/scoring";
import { type LocalIngredients, readIngredients, saveIngredients, useFavorites, useProfile } from "@/lib/useLocal";
import type { PricePoint, Product, Profile, ScoredProduct } from "@/lib/types";
import { asBarcode, errorMessage, jsonPost, postJson, responseError } from "@/lib/utils";

interface Detail {
  product: ScoredProduct;
  prices: PricePoint[];
  alternatives: ScoredProduct[];
}

/** Re-scores a product with the ingredient list read from her label photo, when the database has none. */
function withPhotoIngredients(d: Detail, local: LocalIngredients | null, profile: Profile | null, force = false): Detail {
  if (!local || (d.product.ingredientsText && !force)) return d;
  return { ...d, product: scoreProduct({ ...d.product, ingredientsText: local.text }, profile, d.prices[0]) };
}

/** A product unknown to the database, built from her label photo alone. */
function fromPhoto(code: string, local: LocalIngredients, profile: Profile | null): Detail {
  const product: Product = {
    code,
    name: local.name || "Produit scanné",
    brand: local.brand || "",
    ingredientsText: local.text,
    categories: [],
    labels: [],
    scans: 0,
  };
  return { product: scoreProduct(product, profile), prices: [], alternatives: [] };
}

const fmt = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

/** "Prix vérifiés à l'instant" / "il y a 2 h" (results can come from a cache up to 6 h old). */
function checkedLabel(iso: string): string {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (!(min >= 1)) return "Prix vérifiés à l'instant";
  return min < 60 ? `Prix vérifiés il y a ${min} min` : `Prix vérifiés il y a ${Math.round(min / 60)} h`;
}

function PriceRow({ p, best }: { p: PricePoint; best?: boolean }) {
  const inner = (
    <>
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${p.source === "web" ? "bg-gold/60 text-brand" : "bg-paper text-caramel ring-1 ring-caramel/30"}`}>
        {p.source === "web" ? <Globe size={18} /> : <Store size={18} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{p.store}</p>
        <p className="text-xs text-ink/55">
          {p.source === "web" ? "En ligne · vérifié à l'instant" : `En magasin${p.city ? ` · ${p.city}` : ""} · ${new Date(p.date).toLocaleDateString("fr-FR")}`}
        </p>
      </div>
      <div className="text-right">
        <p className="text-lg font-bold tabular-nums">{fmt(p.price)}</p>
        {best && <p className="text-[0.7rem] font-bold uppercase tracking-wider text-good">Meilleur prix</p>}
      </div>
      {p.url && <ExternalLink size={16} className="shrink-0 text-ink/35" />}
    </>
  );
  const cls = "flex items-center gap-3 py-3";
  return p.url ? (
    <a href={p.url} target="_blank" rel="noopener noreferrer" className={`${cls} rounded-xl transition hover:bg-paper`}>
      {inner}
    </a>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="card flex gap-4 p-4">
        <Skeleton className="h-28 w-28" />
        <div className="flex-1 space-y-2 pt-2">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-6 w-4/5" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
      <Skeleton className="h-48 w-full rounded-2xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  );
}

export default function ProduitPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [profile, , ready] = useProfile();
  const { isFav, toggle } = useFavorites();
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [live, setLive] = useState<{ state: "idle" | "loading" | "done" | "error"; offers: PricePoint[]; summary?: string; checkedAt?: string; error?: string }>({
    state: "idle",
    offers: [],
  });

  const [photo, setPhoto] = useState<LocalIngredients | null>(null);
  const [unknown, setUnknown] = useState(false);

  useEffect(() => {
    if (!ready) return;
    const local = readIngredients(code);
    setPhoto(local);
    fetch(`/api/product/${code}`, jsonPost({ profile }))
      .then(async (r) => {
        if (r.status === 404 && asBarcode(code)) {
          // Not in Open Beauty Facts: use the label photo she took earlier, if any.
          if (local) setData(fromPhoto(code, local, profile));
          else setUnknown(true);
          return;
        }
        // Status first, body second: an error page that isn't JSON must not surface as a parser message.
        if (!r.ok) throw new Error(await responseError(r));
        setData(withPhotoIngredients(await r.json(), local, profile));
      })
      .catch((e) => setError(errorMessage(e)));
  }, [code, ready, profile]);

  function onLabelRead(r: LabelReading) {
    const local: LocalIngredients = { text: r.ingredientsText, name: r.productName || undefined, brand: r.brand || undefined, at: new Date().toISOString() };
    saveIngredients(code, local);
    setPhoto(local);
    setUnknown(false);
    setData((prev) => (prev ? withPhotoIngredients(prev, local, profile, true) : fromPhoto(code, local, profile)));
  }

  async function checkLivePrices() {
    if (!data) return;
    setLive({ state: "loading", offers: [] });
    try {
      const json = await postJson<{ offers: PricePoint[]; summary: string; checkedAt: string }>("/api/live-prices", {
        name: data.product.name,
        brand: data.product.brand,
        code,
        quantity: data.product.quantity,
        city: profile?.city,
      });
      setLive({ state: "done", offers: json.offers, summary: json.summary, checkedAt: json.checkedAt });
    } catch (e) {
      setLive({ state: "error", offers: [], error: errorMessage(e) });
    }
  }

  if (unknown && !data)
    return (
      <div className="space-y-4">
        <PageHeader back eyebrow={`Code-barres ${code}`} title="Produit pas encore référencé" subtitle="Ce produit n'est pas dans la base Open Beauty Facts. Photographiez sa liste d'ingrédients : Belle la lit et vous donne votre score." />
        <section className="card space-y-3 p-5">
          <p className="flex items-center gap-2 font-bold">
            <ScanText size={20} className="text-brand" /> Comment faire
          </p>
          <ol className="list-decimal space-y-1 pl-5 text-[0.95rem] text-ink/75">
            <li>Retournez le produit et trouvez « Ingredients ».</li>
            <li>Cadrez toute la liste, bien à plat, sans reflet.</li>
          </ol>
          <IngredientPhoto onRead={onLabelRead} />
        </section>
        <p className="text-center text-sm text-ink/60">
          <Link href="/scanner" className="font-semibold text-brand underline">
            Saisir un autre code
          </Link>
          {" · "}
          <a href="https://world.openbeautyfacts.org/contribute" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand underline">
            Ajouter le produit à Open Beauty Facts
          </a>
        </p>
      </div>
    );

  if (error)
    return (
      <div>
        <PageHeader title="Produit" back />
        <Notice kind="error">
          {error}{" "}
          <Link href="/scanner" className="font-bold underline">
            Saisir un autre code
          </Link>
        </Notice>
      </div>
    );
  if (!data) return <DetailSkeleton />;

  const { product: p, prices, alternatives } = data;
  const searchQ = `${p.brand} ${p.name}`.trim();
  const advice = isComplexionProduct(p) ? shadeAdvice(profile) : null;
  const fav = isFav(p.code);
  const v = VERDICT[p.verdict];
  const allPrices = [...live.offers, ...prices].sort((a, b) => a.price - b.price);
  const pros = p.reasons.filter((r) => r.kind === "plus");
  const cons = p.reasons.filter((r) => r.kind === "minus");
  const infos = p.reasons.filter((r) => r.kind === "info");

  return (
    <div className="space-y-4">
      <PageHeader title="" back />

      {/* Identity */}
      <section className="card -mt-4 overflow-hidden">
        <div className="flex gap-4 p-4">
          <ProductImage src={p.image} alt={p.name} size={116} />
          <div className="min-w-0 flex-1 py-1">
            {p.brand && <p className="text-xs font-bold uppercase tracking-[0.14em] text-caramel-ink">{p.brand}</p>}
            <h1 className="mt-0.5 font-display text-2xl leading-tight">{p.name}</h1>
            {p.quantity && <p className="mt-1 text-sm text-ink/55">{p.quantity}</p>}
          </div>
        </div>
        <button
          onClick={() => toggle({ code: p.code, name: p.name, brand: p.brand, image: p.image, score: p.score })}
          className={`flex w-full items-center justify-center gap-2 border-t border-caramel/20 py-3 text-sm font-semibold transition ${fav ? "bg-gold/40 text-brand" : "text-ink/70 hover:bg-paper hover:text-brand"}`}
          aria-pressed={fav}
        >
          <Heart size={18} fill={fav ? "currentColor" : "none"} />
          {fav ? "Dans mes favoris" : "Ajouter à mes favoris"}
        </button>
      </section>

      {/* Verdict */}
      <section className="card p-5">
        <div className="flex items-center gap-4">
          <ScoreRing score={p.score} verdict={p.verdict} size={92} />
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink/50">{profile ? "Pour vous" : "Évaluation générale"}</p>
            <p className="font-display text-2xl" style={{ color: v.color }}>
              {v.label}
            </p>
            {!profile && (
              <Link href="/profil" className="text-sm font-semibold text-brand underline underline-offset-2">
                Personnaliser avec mon profil
              </Link>
            )}
          </div>
        </div>

        {p.allergyHit && (
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-danger-soft p-3 font-semibold text-danger">
            <ShieldAlert size={22} className="shrink-0" />
            Contient un ingrédient auquel vous êtes allergique : {p.allergyHit.join(", ")}.
          </div>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {pros.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-bold text-good">Points forts</p>
              <ul className="space-y-2">
                {pros.map((r, i) => (
                  <li key={i} className="flex gap-2.5 text-[0.95rem] leading-snug">
                    <CircleCheck size={18} className="mt-0.5 shrink-0 text-good" />
                    {r.text}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {cons.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-bold text-danger">Points d&apos;attention</p>
              <ul className="space-y-2">
                {cons.map((r, i) => (
                  <li key={i} className="flex gap-2.5 text-[0.95rem] leading-snug">
                    <CircleX size={18} className="mt-0.5 shrink-0 text-danger" />
                    {r.text}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        {infos.length > 0 && (
          <ul className="mt-4 space-y-1.5 border-t border-caramel/20 pt-3">
            {infos.map((r, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-ink/65">
                <Info size={16} className="mt-0.5 shrink-0" />
                {r.text}
              </li>
            ))}
          </ul>
        )}

        {p.verdict === "inconnu" && !photo && (
          <div className="mt-4 space-y-3 rounded-2xl bg-paper p-4 ring-1 ring-caramel/30">
            <p className="text-[0.95rem]">
              <b>Il manque la liste d&apos;ingrédients</b> pour vous donner un vrai score. Photographiez-la au dos du produit : Belle la lit pour vous.
            </p>
            <IngredientPhoto onRead={onLabelRead} />
          </div>
        )}

        {photo && (
          <div className="mt-4 flex gap-3 rounded-2xl bg-paper p-3.5 text-sm leading-relaxed ring-1 ring-caramel/30">
            <ScanText size={20} className="mt-0.5 shrink-0 text-brand" />
            <div>
              <p>
                Ingrédients lus sur votre photo du {new Date(photo.at).toLocaleDateString("fr-FR")}. Vérifiez l&apos;étiquette en cas d&apos;allergie.
              </p>
              <a
                href={`https://world.openbeautyfacts.org/product/${p.code}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 font-semibold text-brand underline"
              >
                Aider les autres : compléter la fiche sur Open Beauty Facts <ExternalLink size={13} />
              </a>
            </div>
          </div>
        )}

        {advice && profile && (
          <div className="mt-4 space-y-3 rounded-2xl bg-gold/45 p-3.5 text-sm leading-relaxed">
            <div className="flex gap-3">
              <Palette size={20} className="mt-0.5 shrink-0 text-brand" />
              <p>
                <b>Votre teinte.</b> {advice}
              </p>
            </div>
            <ShadeFinder name={p.name} brand={p.brand} code={p.code} profile={profile} />
          </div>
        )}
      </section>

      {/* Prices */}
      <section className="card p-5">
        <SectionTitle icon={Tag}>Où l&apos;acheter au meilleur prix</SectionTitle>

        {live.state === "done" && live.summary && (
          <div className="mb-2 rounded-2xl bg-good-soft p-3 text-sm font-semibold text-good">
            {live.summary}
            {live.checkedAt && <span className="mt-1 block text-xs font-normal opacity-80">{checkedLabel(live.checkedAt)}</span>}
          </div>
        )}

        {allPrices.length > 0 ? (
          <div className="divide-y divide-caramel/20">
            {allPrices.slice(0, 8).map((pp, i) => (
              <PriceRow key={`${pp.store}-${i}`} p={pp} best={i === 0 && allPrices.length > 1} />
            ))}
          </div>
        ) : (
          live.state !== "loading" && (
            <p className="text-sm text-ink/60">{live.state === "done" ? "Aucune offre trouvée en ligne pour ce produit précis." : "Aucun prix relevé en magasin pour l'instant."}</p>
          )
        )}

        {live.state === "error" && (
          <div className="mt-3">
            <Notice kind="error">{live.error}</Notice>
          </div>
        )}

        {live.state !== "done" && (
          <button className="btn-primary mt-4 w-full" onClick={checkLivePrices} disabled={live.state === "loading"}>
            {live.state === "loading" ? <Spinner label="Comparaison des sites en cours…" /> : (
              <>
                <Globe size={18} /> Comparer les prix en ligne
              </>
            )}
          </button>
        )}
        {live.state === "loading" && <p className="mt-2 text-center text-xs text-ink/50">Environ 30 secondes : nous consultons plusieurs enseignes.</p>}
        {live.state === "done" && <p className="mt-2 text-xs text-ink/50">Prix indicatifs relevés automatiquement. Vérifiez sur le site avant d&apos;acheter.</p>}

        <div className="mt-5 border-t border-caramel/20 pt-4">
          <p className="mb-2.5 text-sm font-semibold text-ink/70">Rechercher directement chez</p>
          <div className="flex flex-wrap gap-2">
            <a className="chip-off" href={googleShoppingUrl(searchQ)} target="_blank" rel="noopener noreferrer">
              Google Shopping <ExternalLink size={14} />
            </a>
            {STORES.map((s) => (
              <a key={s.domain} className="chip-off" href={s.search(searchQ)} target="_blank" rel="noopener noreferrer">
                {s.name} <ExternalLink size={14} />
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Alternatives */}
      {alternatives.length > 0 && (
        <section className="pt-2">
          <SectionTitle icon={Repeat}>Alternatives à comparer</SectionTitle>
          <p className="-mt-1 mb-3 text-sm text-ink/60">Même catégorie, bien notées pour vous, souvent d&apos;autres marques.</p>
          <div className="space-y-2.5">
            {alternatives.map((a) => (
              <ProductCard key={a.code} p={{ ...a, topReason: a.reasons.find((r) => r.kind === "plus")?.text }} />
            ))}
          </div>
        </section>
      )}

      {/* Ingredients */}
      {p.ingredientsText && (
        <details className="card group p-5">
          <summary className="flex cursor-pointer list-none items-center justify-between font-bold">
            <span className="flex items-center gap-2">
              <FlaskConical size={20} className="text-brand" /> Liste des ingrédients
            </span>
            <ChevronDown size={20} className="text-ink/50 transition group-open:rotate-180" />
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-ink/75">{p.ingredientsText}</p>
        </details>
      )}

      <p className="pt-2 text-center text-xs leading-relaxed text-ink/45">
        Données produits : Open Beauty Facts · Prix en magasin : Open Prices
        <br />
        Code-barres {p.code}
      </p>
    </div>
  );
}
