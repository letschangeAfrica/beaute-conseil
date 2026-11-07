"use client";
import Link from "next/link";
import { CalendarClock, Heart, RotateCcw, WifiOff } from "lucide-react";
import { ProductImage } from "@/components/ProductCard";
import { Logo } from "@/components/ui";
import { daysLeft, leftLabel, todayLocal } from "@/lib/expiry";
import { useFavorites, useOpened } from "@/lib/useLocal";

/**
 * Shown by the service worker when there is no network and the page was never visited.
 * Everything here comes from the phone: favourites and opened products open from the offline copies.
 */
export default function HorsLignePage() {
  const { favs } = useFavorites();
  const { items: opened } = useOpened();
  const today = todayLocal();

  return (
    <div className="flex flex-col gap-8">
      <Logo />
      <div>
        <span aria-hidden="true" className="grid h-14 w-14 place-items-center rounded-full bg-brand-soft text-brand">
          <WifiOff size={26} />
        </span>
        <h1 className="mt-4 font-display text-headline font-normal text-ink">
          Vous êtes <span className="italic text-brand">hors ligne</span>
        </h1>
        <p className="mt-2 max-w-md leading-relaxed text-ink/75">
          Les produits déjà consultés sur ce téléphone restent disponibles. La recherche, les prix en ligne et la conseillère reviennent avec le réseau.
        </p>
        <button type="button" onClick={() => window.location.reload()} className="btn-primary mt-5">
          <RotateCcw size={18} aria-hidden="true" /> Réessayer
        </button>
      </div>

      {favs.length > 0 && (
        <section aria-labelledby="off-fav">
          <h2 id="off-fav" className="flex items-center gap-2 font-display text-[1.3rem] text-ink">
            <Heart size={18} aria-hidden="true" className="text-brand" /> Mes favoris
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {favs.map((f) => (
              <li key={f.code}>
                <Link href={`/produit/${f.code}`} className="card-interactive flex items-center gap-3 p-3">
                  <ProductImage src={f.image} alt={f.name} size={52} />
                  <span className="min-w-0 flex-1 truncate font-semibold">{f.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {opened.length > 0 && (
        <section aria-labelledby="off-opened">
          <h2 id="off-opened" className="flex items-center gap-2 font-display text-[1.3rem] text-ink">
            <CalendarClock size={18} aria-hidden="true" className="text-brand" /> Produits ouverts
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {opened.map((o) => (
              <li key={o.code} className="card flex items-center justify-between gap-3 p-3">
                <span className="min-w-0 truncate font-semibold">{o.name}</span>
                <span className="shrink-0 text-sm text-ink/75">{leftLabel(daysLeft(o, today))}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
