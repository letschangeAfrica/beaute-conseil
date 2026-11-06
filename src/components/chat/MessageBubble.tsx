"use client";
import { useState } from "react";
import { Check, CircleAlert, Copy, RotateCcw } from "lucide-react";
import ProductCard, { type CardData } from "@/components/ProductCard";
import { Formatted } from "./Formatted";

export interface Msg {
  role: "user" | "assistant";
  content: string;
  products?: CardData[];
  status?: string;
  /** Server or network error for this answer, shown as a notice, kept out of Belle's text and of the AI context. */
  error?: string;
  /** She pressed "Arrêter": the partial answer is kept. */
  stopped?: boolean;
}

/** Belle's monogram. */
export function BelleAvatar({ size = "sm" }: { size?: "sm" | "lg" }) {
  const s = size === "lg" ? "h-14 w-14 text-[1.9rem]" : "h-8 w-8 text-[1.05rem]";
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full bg-brand font-display italic leading-none text-cream ring-2 ring-gold/70 ring-offset-2 ring-offset-cream ${s}`}
    >
      B
    </span>
  );
}

export function UserBubble({ m }: { m: Msg }) {
  return (
    <div className="flex justify-end pl-10">
      <div className="max-w-full whitespace-pre-wrap break-words rounded-card rounded-br-md bg-brand px-4 py-3 leading-relaxed text-cream shadow-soft [overflow-wrap:anywhere]">
        <span className="sr-only">Vous : </span>
        {m.content}
      </div>
    </div>
  );
}

/** Three dots before the first words arrive (static under reduced motion). */
function Typing() {
  return (
    <span aria-hidden="true" className="inline-flex items-center gap-1">
      {[0, 150, 300].map((d) => (
        <span key={d} className="h-1.5 w-1.5 rounded-full bg-brand motion-safe:animate-bounce" style={{ animationDelay: `${d}ms` }} />
      ))}
    </span>
  );
}

/** Live activity: what Belle is doing right now ("Je cherche « fond de teint »…"). */
function Activity({ text, typing }: { text: string; typing: boolean }) {
  return (
    <p className="inline-flex max-w-full items-center gap-2.5 rounded-full bg-brand-soft/70 px-3.5 py-2 text-sm font-semibold text-brand">
      {typing ? <Typing /> : <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-brand motion-safe:animate-pulse" />}
      <span className="min-w-0 truncate">{text}</span>
    </p>
  );
}

export function BelleMessage({ m, streaming, onRetry }: { m: Msg; streaming: boolean; onRetry?: () => void }) {
  const [copied, setCopied] = useState(false);
  const products = m.products ?? [];

  async function copy() {
    try {
      await navigator.clipboard.writeText(m.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable: nothing to do */
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex gap-3">
        <div className="pt-1">
          <BelleAvatar />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <span className="sr-only">Belle : </span>

          {m.content && (
            <div className="rounded-card rounded-tl-md bg-white px-4 py-3.5 leading-relaxed text-ink shadow-soft ring-1 ring-line sm:px-5">
              <Formatted text={m.content} />
            </div>
          )}
          {m.stopped && <p className="text-sm italic text-ink/70">Réponse interrompue.</p>}

          {m.status && <Activity text={m.status} typing={!m.content} />}

          {m.error && (
            <div role="note" className="flex gap-3 rounded-tile bg-warn-soft px-4 py-3 text-sm leading-relaxed text-ink ring-1 ring-warn/25">
              <CircleAlert size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-warn" />
              <div className="min-w-0 flex-1">
                <p>{m.error}</p>
                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="mt-1 inline-flex min-h-11 items-center gap-1.5 font-semibold text-brand underline underline-offset-2"
                  >
                    <RotateCcw size={15} aria-hidden="true" /> Réessayer
                  </button>
                )}
              </div>
            </div>
          )}

          {!streaming && m.content && (
            <div className="-mt-1 flex">
              <button
                type="button"
                onClick={copy}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-sm font-semibold text-ink/70 hover:text-brand"
                aria-label={copied ? "Réponse copiée" : "Copier la réponse"}
              >
                {copied ? <Check size={15} aria-hidden="true" className="text-good" /> : <Copy size={15} aria-hidden="true" />}
                <span aria-hidden="true">{copied ? "Copié" : "Copier"}</span>
              </button>
            </div>
          )}
        </div>
      </div>
      {products.length > 0 && (
        <ul
          aria-label="Produits proposés"
          className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-2.5 overflow-x-auto px-4 pb-2 [scrollbar-width:thin] sm:mx-0 sm:scroll-px-0 sm:pl-11 sm:pr-0"
        >
          {products.map((p) => (
            <li key={p.code} className={`shrink-0 snap-start ${products.length === 1 ? "w-full" : "w-[82%] max-w-[21rem] md:w-56"}`}>
              <ProductCard p={p} variant={products.length === 1 ? "row" : "tile"} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
