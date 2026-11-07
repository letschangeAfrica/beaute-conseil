"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CircleCheck, CircleX, Columns3, ShieldAlert, Trophy, X } from "lucide-react";
import { ProductImage } from "@/components/ProductCard";
import { PageHeader, ScoreRing, Skeleton, VERDICT } from "@/components/ui";
import { formulaFlags } from "@/lib/ingredientInfo";
import { parseIngredients } from "@/lib/ingredients";
import type { PricePoint, ScoredProduct } from "@/lib/types";
import { type CompareItem, useCompare, useProfile } from "@/lib/useLocal";
import { jsonPost, responseError } from "@/lib/utils";

type Loaded = { state: "loading" } | { state: "error"; message: string } | { state: "done"; product: ScoredProduct; prices: PricePoint[] };

const euro = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

/** Side-by-side comparison of up to 3 products, scored for her. Data from the product API (no AI). */
export default function ComparerPage() {
  const { items, remove, clear, ready } = useCompare();
  const [profile, , profileReady] = useProfile();
  const [data, setData] = useState<Record<string, Loaded>>({});

  const codes = items.map((i) => i.code).join(",");
  useEffect(() => {
    if (!ready || !profileReady) return;
    const controller = new AbortController();
    for (const { code } of items) {
      setData((d) => ({ ...d, [code]: { state: "loading" } }));
      fetch(`/api/product/${code}`, jsonPost({ profile }, controller.signal))
        .then(async (r) => {
          if (!r.ok) throw new Error(r.status === 404 ? "Produit introuvable dans la base." : await responseError(r));
          const json = (await r.json()) as { product: ScoredProduct; prices: PricePoint[] };
          setData((d) => ({ ...d, [code]: { state: "done", product: json.product, prices: json.prices } }));
        })
        .catch((e: unknown) => {
          if (controller.signal.aborted) return;
          setData((d) => ({ ...d, [code]: { state: "error", message: e instanceof Error ? e.message : "Une erreur est survenue." } }));
        });
    }
    return () => controller.abort();
    // Refetch when the list or her profile changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codes, ready, profileReady, profile]);

  const scores = items.map((i) => data[i.code]).flatMap((d) => (d?.state === "done" && d.product.verdict !== "inconnu" ? [d.product.score] : []));
  const best = scores.length >= 2 ? Math.max(...scores) : null;

  return (
    <div data-layout="wide" className="flex flex-col gap-6">
      <PageHeader back eyebrow="Comparer" title="Côte à côte" subtitle={profile ? "Scores calculés pour votre peau." : "Scores généraux : créez votre profil pour un classement personnel."} />

      {ready && items.length === 0 && (
        <div className="card flex flex-col items-center gap-3 p-8 text-center">
          <Columns3 size={36} strokeWidth={1.5} aria-hidden="true" className="text-caramel-ink" />
          <p className="max-w-sm text-ink/80">Ajoutez jusqu&apos;à 3 produits avec le bouton « Comparer » de leur fiche, puis revenez ici.</p>
          <Link href="/recherche" className="btn-primary">
            Chercher un produit <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      )}

      {items.length > 0 && (
        <>
          <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
            {items.map((item) => (
              <li key={item.code} className="w-[80%] max-w-[20rem] shrink-0 snap-start md:w-auto md:max-w-none">
                <Column item={item} loaded={data[item.code]} best={best} onRemove={() => remove(item.code)} />
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink/70">{items.length < 3 ? `Vous pouvez ajouter encore ${3 - items.length} produit${items.length === 2 ? "" : "s"}.` : "Comparaison complète (3 produits)."}</p>
            <button type="button" onClick={clear} className="btn-secondary min-h-11 px-5 text-sm">
              Tout retirer
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Column({ item, loaded, best, onRemove }: { item: CompareItem; loaded?: Loaded; best: number | null; onRemove: () => void }) {
  const p = loaded?.state === "done" ? loaded.product : null;
  const isBest = p !== null && best !== null && p.verdict !== "inconnu" && p.score === best;
  const flags = p?.ingredientsText ? formulaFlags(parseIngredients(p.ingredientsText)) : null;
  const price = loaded?.state === "done" ? loaded.prices[0] : undefined;

  return (
    <article aria-label={`${item.brand} ${item.name}`} className={`card flex h-full flex-col overflow-hidden ${isBest ? "ring-2 ring-good" : ""}`}>
      <div className="relative p-4">
        <button type="button" onClick={onRemove} aria-label={`Retirer ${item.name} de la comparaison`} className="absolute right-2 top-2 grid h-11 w-11 place-items-center rounded-full text-ink/70 hover:bg-paper hover:text-brand">
          <X size={18} aria-hidden="true" />
        </button>
        <ProductImage fluid src={item.image} alt={item.name} />
        {item.brand && <p className="eyebrow mt-3 truncate">{item.brand}</p>}
        <Link href={`/produit/${item.code}`} className="mt-1 line-clamp-2 font-semibold leading-snug text-ink hover:text-brand hover:underline">
          {item.name}
        </Link>
      </div>

      {!loaded || loaded.state === "loading" ? (
        <div className="space-y-3 border-t border-line p-4" aria-busy="true">
          <Skeleton className="h-16 w-16 rounded-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ) : loaded.state === "error" ? (
        <p className="border-t border-line p-4 text-sm text-danger">{loaded.message}</p>
      ) : (
        p && (
          <div className="flex flex-1 flex-col divide-y divide-line">
            <Row label="Pour vous">
              <div className="flex items-center gap-3">
                <ScoreRing score={p.score} verdict={p.verdict} size={56} />
                <div>
                  <p className="font-semibold" style={{ color: VERDICT[p.verdict].color }}>
                    {VERDICT[p.verdict].label}
                  </p>
                  {isBest && (
                    <p className="flex items-center gap-1 text-sm font-semibold text-good">
                      <Trophy size={14} aria-hidden="true" /> Meilleur score
                    </p>
                  )}
                </div>
              </div>
            </Row>
            {p.allergyHit?.length ? (
              <div role="note" className="flex gap-2 bg-danger p-4 text-sm font-semibold text-white">
                <ShieldAlert size={18} aria-hidden="true" className="shrink-0" />
                Contient {p.allergyHit.join(", ")} : vous y êtes allergique.
              </div>
            ) : null}
            <Row label="Points forts">
              <Reasons items={p.reasons.filter((r) => r.kind === "plus").slice(0, 3).map((r) => r.text)} good />
            </Row>
            <Row label="Points d'attention">
              <Reasons items={p.reasons.filter((r) => r.kind === "minus").slice(0, 3).map((r) => r.text)} />
            </Row>
            <Row label="Dans la formule">
              {flags === null ? (
                <p className="text-sm text-ink/70">Ingrédients non renseignés.</p>
              ) : flags.length ? (
                <ul className="flex flex-wrap gap-1.5">
                  {flags.map((f) => (
                    <li key={f} className="rounded-full bg-paper px-2.5 py-0.5 text-xs font-semibold text-ink/80 ring-1 ring-line">
                      {f}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-good">Rien de particulier à signaler.</p>
              )}
            </Row>
            <Row label="Prix relevé">
              <p className="text-sm text-ink/85">{price ? `${euro(price.price)} · ${price.store}` : "Aucun prix relevé"}</p>
            </Row>
          </div>
        )
      )}
    </article>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink/70">{label}</p>
      {children}
    </div>
  );
}

function Reasons({ items, good = false }: { items: string[]; good?: boolean }) {
  if (!items.length) return <p className="text-sm text-ink/70">Aucun</p>;
  const Icon = good ? CircleCheck : CircleX;
  return (
    <ul className="space-y-1.5">
      {items.map((t) => (
        <li key={t} className="flex gap-2 text-sm leading-snug text-ink/85">
          <Icon size={16} aria-hidden="true" className={`mt-0.5 shrink-0 ${good ? "text-good" : "text-danger"}`} />
          {t}
        </li>
      ))}
    </ul>
  );
}
