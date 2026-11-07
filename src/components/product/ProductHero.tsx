"use client";
import { type ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Share2, ShieldAlert } from "lucide-react";
import { ProductImage } from "@/components/ProductCard";
import { ScoreRing, VERDICT } from "@/components/ui";
import type { ScoredProduct } from "@/lib/types";
import { topReason } from "@/lib/utils";

/**
 * Safety first: a solid red banner with icon and words. Rendered before anything else on the page,
 * so it is above the fold on a 360 px phone.
 */
export function AllergyAlert({ hits }: { hits: string[] }) {
  return (
    <div
      role="alert"
      className="relative flex gap-3.5 rounded-card bg-danger p-4 text-white shadow-lift sm:p-5"
    >
      {/* One attention pulse when it appears (opacity of a pre-drawn glow, never looping). */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -inset-1 rounded-[calc(var(--radius-card)+4px)] opacity-0 shadow-[0_0_0_4px_rgb(180_35_24/0.25),0_0_28px_6px_rgb(180_35_24/0.35)] motion-safe:animate-glow-pulse"
      />
      <ShieldAlert size={26} aria-hidden="true" className="mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="font-display text-[1.25rem] leading-tight">
          Attention : vous y êtes allergique
        </p>
        <p className="mt-1 break-words leading-snug">
          Contient un ingrédient auquel vous êtes allergique :{" "}
          <strong className="font-bold">{hits.join(", ")}</strong>.
        </p>
      </div>
    </div>
  );
}

/** Six particles around the heart, each flying along its own vector (CSS only). */
const BURST = [
  [0, -22],
  [19, -11],
  [19, 11],
  [0, 22],
  [-19, 11],
  [-19, -11],
];

/** The heart: pops and bursts when it becomes a favourite (plus a 10 ms tap on phones that vibrate). */
export function HeartMark({
  fav,
  size,
  pulse,
}: {
  fav: boolean;
  size: number;
  pulse: number;
}) {
  return (
    <span
      className="relative inline-grid place-items-center"
      aria-hidden="true"
    >
      <Heart
        key={pulse}
        size={size}
        fill={fav ? "currentColor" : "none"}
        className={pulse ? "motion-safe:animate-heart-pop" : ""}
      />
      {pulse > 0 &&
        fav &&
        BURST.map(([x, y], i) => (
          <span
            key={`${pulse}-${i}`}
            className="pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-brand opacity-0 motion-safe:animate-burst"
            style={{
              ["--bx" as string]: `${x}px`,
              ["--by" as string]: `${y}px`,
              animationDelay: `${i * 15}ms`,
            }}
          />
        ))}
    </span>
  );
}

/** Favourite toggle: same payload and aria-pressed as before; `compact` is the icon-only version. */
export function FavButton({
  fav,
  onToggle,
  compact = false,
}: {
  fav: boolean;
  onToggle: () => void;
  compact?: boolean;
}) {
  const [pulse, setPulse] = useState(0);
  const click = () => {
    if (!fav) {
      setPulse((n) => n + 1);
      navigator.vibrate?.(10);
    }
    onToggle();
  };
  if (compact)
    return (
      <button
        type="button"
        onClick={click}
        aria-pressed={fav}
        aria-label="Favori"
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ring-1 transition-colors ${fav ? "bg-brand-soft text-brand ring-brand/30" : "bg-white text-ink/75 ring-line hover:text-brand"}`}
      >
        <HeartMark fav={fav} size={19} pulse={pulse} />
      </button>
    );
  return (
    <button
      type="button"
      onClick={click}
      aria-pressed={fav}
      className={`btn flex-1 ${fav ? "bg-brand-soft text-brand ring-1 ring-brand/30" : "btn-secondary"}`}
    >
      <HeartMark fav={fav} size={18} pulse={pulse} />
      {fav ? "Dans mes favoris" : "Ajouter à mes favoris"}
    </button>
  );
}

/** Web Share API, shown only where the browser has it. */
export function ShareButton({ title, text }: { title: string; text: string }) {
  const [can, setCan] = useState(false);
  useEffect(
    () =>
      setCan(
        typeof navigator !== "undefined" &&
          typeof navigator.share === "function",
      ),
    [],
  );
  if (!can) return null;
  return (
    <button
      type="button"
      onClick={() =>
        navigator
          .share({ title, text, url: window.location.href })
          .catch(() => {})
      }
      className="-mr-1.5 grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-ink/75 ring-1 ring-line transition-colors hover:bg-paper hover:text-brand"
      aria-label="Partager ce produit"
    >
      <Share2 size={19} aria-hidden="true" />
    </button>
  );
}

/**
 * The verdict hero: photo, identity, a large score with the verdict in words and the one sentence
 * that explains it. One <h1>: the product name.
 */
export function ProductHero({
  p,
  personal,
  actions,
}: {
  p: ScoredProduct;
  personal: boolean;
  actions: ReactNode;
}) {
  const v = VERDICT[p.verdict];
  const why = topReason(p);
  return (
    <section aria-labelledby="product-title" className="card overflow-hidden">
      <div className="flex gap-4 p-4 sm:p-5 lg:p-6">
        <div className="w-[6.5rem] shrink-0 sm:w-32 lg:w-36">
          <div className="motion-safe:animate-scale-in">
            <ProductImage src={p.image} alt={p.name} fluid />
          </div>
        </div>
        <div className="min-w-0 flex-1 self-center">
          {p.brand && <p className="eyebrow break-words">{p.brand}</p>}
          <h1
            id="product-title"
            className="mt-1 break-words font-display text-[1.3rem] leading-[1.15] text-ink sm:text-[1.6rem] lg:text-[1.75rem]"
          >
            {p.name}
          </h1>
          <div className="mt-1 flex min-h-11 items-center justify-between gap-2">
            <p className="text-sm text-ink/70">{p.quantity}</p>
            <ShareButton
              title={p.name}
              text={`${p.brand ? `${p.brand} ` : ""}${p.name} : ${v.label} (${p.score}/100) sur Belle`}
            />
          </div>
        </div>
      </div>

      <div
        className="border-t border-line px-4 py-4 sm:px-5 lg:px-6"
        style={{ background: `color-mix(in srgb, ${v.soft} 45%, white)` }}
      >
        <div className="flex items-center gap-4">
          <ScoreRing score={p.score} verdict={p.verdict} size={80} />
          <div className="min-w-0">
            <p className="eyebrow text-ink/75">
              {personal ? "Pour vous" : "Évaluation générale"}
            </p>
            <p
              className="mt-1 font-display text-[1.55rem] leading-tight"
              style={{ color: v.color }}
            >
              {v.label}
            </p>
          </div>
        </div>
        {why && <p className="mt-3 leading-relaxed text-ink/80">{why}</p>}
        {!personal && (
          <Link
            href="/bienvenue"
            className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-brand underline underline-offset-4"
          >
            Personnaliser avec mon profil (3 questions)
          </Link>
        )}
      </div>

      {actions}
    </section>
  );
}

/**
 * Compact bar fixed to the top on phones once the hero has scrolled away: thumbnail, name, score
 * and favourite. Inert while hidden; the page gets scroll padding so it never hides a focused field.
 */
export function StickySummary({
  p,
  visible,
  fav,
  onToggleFav,
}: {
  p: ScoredProduct;
  visible: boolean;
  fav: boolean;
  onToggleFav: () => void;
}) {
  const v = VERDICT[p.verdict];
  return (
    <div
      data-sticky-summary={visible ? "on" : "off"}
      inert={!visible}
      aria-hidden={!visible}
      className={`fixed inset-x-0 top-0 z-30 border-b border-line bg-white/95 px-4 pt-[env(safe-area-inset-top)] shadow-soft backdrop-blur-md transition-transform duration-200 motion-reduce:transition-none lg:hidden ${
        visible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-2xl items-center gap-3">
        <div className="w-10 shrink-0">
          <ProductImage src={p.image} alt="" fluid />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{p.name}</p>
          <p className="truncate text-xs font-bold" style={{ color: v.color }}>
            {v.label}
          </p>
        </div>
        <ScoreRing score={p.score} verdict={p.verdict} size={42} />
        <FavButton fav={fav} onToggle={onToggleFav} compact />
      </div>
    </div>
  );
}
