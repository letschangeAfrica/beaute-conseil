import Link from "next/link";
import { ChevronRight, TriangleAlert } from "lucide-react";
import { LipstickIcon } from "./icons";
import { ScoreRing, VERDICT, VerdictPill } from "./ui";
import type { Verdict } from "@/lib/types";
import { productHref } from "@/lib/utils";

/**
 * Product photo on a paper tile. Fixed `size` in px by default; `fluid` fills its container
 * as a square instead (grids and carousels).
 */
export function ProductImage({ src, alt, size = 72, fluid = false }: { src?: string; alt: string; size?: number; fluid?: boolean }) {
  return (
    <div
      className={`grid shrink-0 place-items-center overflow-hidden bg-paper ring-1 ring-line ${fluid ? "aspect-square w-full rounded-tile" : "rounded-xl"}`}
      style={fluid ? undefined : { width: size, height: size }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className={`h-full w-full object-contain mix-blend-multiply ${fluid ? "p-3" : "p-1"}`} loading="lazy" />
      ) : (
        <LipstickIcon size={fluid ? 40 : size * 0.42} className="text-caramel" aria-hidden="true" />
      )}
    </div>
  );
}

export interface CardData {
  code: string;
  name: string;
  brand: string;
  image?: string;
  score: number;
  verdict: Verdict;
  topReason?: string;
  /** The user's allergens found in the product. Shown as an unmissable alert. */
  allergyHit?: string[];
}

/** Accessible name for the whole card link: brand, name, score, verdict and any allergy alert. */
export function cardLabel(p: CardData): string {
  const score = p.verdict === "inconnu" ? "score indisponible" : `score ${p.score} sur 100`;
  const allergy = p.allergyHit?.length ? `. Attention, contient ${p.allergyHit.join(", ")}, auquel vous êtes allergique` : "";
  return `${p.brand ? `${p.brand}, ` : ""}${p.name}, ${score}, ${VERDICT[p.verdict].label}${allergy}`;
}

/** Full-width red band on top of a card when the product contains one of the user's allergens. */
function AllergyBand({ hits }: { hits: string[] }) {
  return (
    <p className="flex items-start gap-2 bg-danger px-3.5 py-2 text-sm font-semibold leading-snug text-white">
      <TriangleAlert size={17} aria-hidden="true" className="mt-px shrink-0" />
      <span className="min-w-0 break-words">Allergène pour vous : {hits.join(", ")}</span>
    </p>
  );
}

/**
 * Product summary linking to its page.
 * - `row` (default): horizontal card, for lists (advisor answers, alternatives).
 * - `tile`: a row on phones that becomes a vertical tile from md up, for result grids.
 */
export default function ProductCard({ p, variant = "row" }: { p: CardData; variant?: "row" | "tile" }) {
  const hit = p.allergyHit?.length ? p.allergyHit : null;
  const tile = variant === "tile";
  const ring = hit ? "ring-2 ring-danger" : p.verdict === "excellent" ? "ring-good/40" : "";

  return (
    <Link
      href={productHref(p.code)}
      aria-label={cardLabel(p)}
      className={`card-interactive group flex flex-col overflow-hidden ${tile ? "h-full" : ""} ${ring} ${hit ? "hover:ring-danger" : ""}`}
    >
      {hit && <AllergyBand hits={hit} />}
      <div className={`relative flex flex-1 items-center gap-3.5 p-3 ${tile ? "md:flex-col md:items-stretch md:gap-3 md:p-3.5" : ""}`}>
        <div className={tile ? "w-[4.5rem] shrink-0 md:w-full md:[&>div]:aspect-[4/3]" : ""}>
          {tile ? <ProductImage src={p.image} alt="" fluid /> : <ProductImage src={p.image} alt="" />}
        </div>

        <div className="min-w-0 flex-1">
          {p.brand && <p className="truncate text-[0.72rem] font-bold uppercase tracking-[0.12em] text-caramel-ink">{p.brand}</p>}
          <p className={`line-clamp-2 break-words font-semibold leading-snug text-ink ${tile ? "md:min-h-[2.75em]" : ""}`}>{p.name}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <VerdictPill verdict={p.verdict} />
          </div>
          {p.topReason && <p className={`mt-1.5 text-sm leading-snug text-ink/70 ${tile ? "line-clamp-2" : "line-clamp-1"}`}>{p.topReason}</p>}
        </div>

        <div className={tile ? "md:absolute md:right-5 md:top-5 md:rounded-full md:bg-white md:p-1 md:shadow-soft" : ""}>
          <ScoreRing score={p.score} verdict={p.verdict} size={54} />
        </div>
        {!tile && <ChevronRight size={18} aria-hidden="true" className="-ml-1 shrink-0 text-ink/40 transition group-hover:text-brand" />}
      </div>
    </Link>
  );
}
