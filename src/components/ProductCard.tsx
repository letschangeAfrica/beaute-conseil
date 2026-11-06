import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { LipstickIcon } from "./icons";
import { ScoreRing, VerdictPill } from "./ui";
import type { Verdict } from "@/lib/types";

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
}

export default function ProductCard({ p }: { p: CardData }) {
  return (
    <Link href={`/produit/${p.code}`} className="card-interactive group flex items-center gap-3.5 p-3">
      <ProductImage src={p.image} alt={p.name} />
      <div className="min-w-0 flex-1">
        {p.brand && <p className="truncate text-[0.72rem] font-bold uppercase tracking-[0.12em] text-caramel-ink">{p.brand}</p>}
        <p className="line-clamp-2 font-semibold leading-snug text-ink">{p.name}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <VerdictPill verdict={p.verdict} />
        </div>
        {p.topReason && <p className="mt-1 line-clamp-1 text-sm text-ink/60">{p.topReason}</p>}
      </div>
      <ScoreRing score={p.score} verdict={p.verdict} size={54} />
      <ChevronRight size={18} className="-ml-1 shrink-0 text-ink/30 transition group-hover:text-brand" />
    </Link>
  );
}
