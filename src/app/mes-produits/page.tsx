"use client";
import Link from "next/link";
import { ArrowRight, CalendarClock, Trash2 } from "lucide-react";
import { ProductImage } from "@/components/ProductCard";
import { PageHeader } from "@/components/ui";
import { type ExpiryStatus, daysLeft, expiryStatus, formatDay, leftLabel, todayLocal, useBy } from "@/lib/expiry";
import { useOpened } from "@/lib/useLocal";

const STATUS: Record<ExpiryStatus, { label: string; cls: string }> = {
  expired: { label: "Expiré", cls: "bg-danger-soft text-danger ring-danger/25" },
  soon: { label: "À finir bientôt", cls: "bg-warn-soft text-warn ring-warn/30" },
  ok: { label: "En cours", cls: "bg-good-soft text-good ring-good/25" },
};

/** Opened products, soonest to expire first. Stored on this phone only. */
export default function MesProduitsPage() {
  const { items, remove, ready } = useOpened();
  const today = todayLocal();
  const sorted = [...items].sort((a, b) => daysLeft(a, today) - daysLeft(b, today));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader back eyebrow="Mes produits" title="Produits ouverts" subtitle="Un produit ouvert se conserve un temps limité (le petit pot « 12M » sur l'emballage)." />

      {ready && sorted.length === 0 && (
        <div className="card flex flex-col items-center gap-3 p-8 text-center">
          <CalendarClock size={36} strokeWidth={1.5} aria-hidden="true" className="text-caramel-ink" />
          <p className="max-w-sm text-ink/80">Sur la fiche d&apos;un produit, touchez « J&apos;ai ouvert ce produit » : Belle vous dira jusqu&apos;à quand l&apos;utiliser.</p>
          <Link href="/recherche" className="btn-primary">
            Chercher un produit <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      )}

      {sorted.length > 0 && (
        <ul className="flex flex-col gap-3">
          {sorted.map((item) => {
            const status = expiryStatus(item, today);
            const s = STATUS[status];
            return (
              <li key={item.code} className="card flex items-center gap-3.5 p-3 sm:p-4">
                <ProductImage src={item.image} alt={item.name} size={64} />
                <div className="min-w-0 flex-1">
                  <Link href={`/produit/${item.code}`} className="line-clamp-2 font-semibold leading-snug text-ink hover:text-brand hover:underline">
                    {item.brand ? `${item.brand} · ` : ""}
                    {item.name}
                  </Link>
                  <p className="mt-0.5 text-sm text-ink/75">
                    Ouvert le {formatDay(item.openedAt)} · avant le {formatDay(useBy(item))}
                  </p>
                  <p className="mt-1.5 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${s.cls}`}>{s.label}</span>
                    <span className="text-sm font-semibold text-ink/85">{leftLabel(daysLeft(item, today))}</span>
                  </p>
                </div>
                <button type="button" onClick={() => remove(item.code)} aria-label={`Retirer ${item.name}`} className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink/70 hover:bg-danger-soft hover:text-danger">
                  <Trash2 size={18} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-xs leading-relaxed text-ink/70">Cette liste reste sur votre téléphone. Les dates sont indicatives : un produit qui change d&apos;odeur ou d&apos;aspect se jette.</p>
    </div>
  );
}
