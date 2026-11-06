import Link from "next/link";
import { ChevronRight, Eye } from "lucide-react";
import { CleanserIcon, CompactIcon, ConcealerIcon, CreamJarIcon, FoundationIcon, LipstickIcon, MascaraIcon, SunscreenIcon } from "./icons";
import { searchHref } from "@/lib/utils";

/** The nine browse categories, shared by Home and the search screen. Each runs a search with its exact query. */
export const CATEGORIES = [
  { q: "fond de teint", label: "Teint", Icon: FoundationIcon },
  { q: "mascara", label: "Mascara", Icon: MascaraIcon },
  { q: "rouge à lèvres", label: "Lèvres", Icon: LipstickIcon },
  { q: "correcteur anticernes", label: "Anticernes", Icon: ConcealerIcon },
  { q: "fard à paupières", label: "Yeux", Icon: Eye },
  { q: "poudre", label: "Poudre", Icon: CompactIcon },
  { q: "crème hydratante visage", label: "Soin visage", Icon: CreamJarIcon },
  { q: "crème solaire visage", label: "Solaire", Icon: SunscreenIcon },
  { q: "démaquillant", label: "Démaquillant", Icon: CleanserIcon },
];

/**
 * 3-column grid of category tiles: stacked (icon over label) on phones, a row from sm up.
 * `stackAtLg` stacks them again on lg, for narrow columns such as Home's 8/12 split.
 */
export function CategoryGrid({ className = "", stackAtLg = false }: { className?: string; stackAtLg?: boolean }) {
  const lg = stackAtLg ? "lg:flex-col lg:justify-center lg:gap-2.5 lg:px-2 lg:text-center xl:flex-row xl:justify-start xl:gap-3.5 xl:px-4 xl:text-left" : "";
  return (
    <ul className={`grid min-w-0 grid-cols-3 gap-2.5 sm:gap-3 ${className}`}>
      {CATEGORIES.map(({ q, label, Icon }) => (
        <li key={q}>
          <Link
            href={searchHref(q)}
            className={`group flex h-full min-h-[6.5rem] flex-col items-center justify-center gap-2.5 rounded-tile bg-paper/70 px-2 py-4 text-center ring-1 ring-line transition duration-200 hover:bg-white hover:shadow-soft hover:ring-caramel/50 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 sm:flex-row sm:justify-start sm:gap-3.5 sm:px-4 sm:text-left ${lg}`}
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-soft text-brand transition-colors group-hover:bg-gold/70">
              <Icon size={23} aria-hidden="true" />
            </span>
            <span
              className={`min-w-0 hyphens-auto break-words text-[0.9rem] font-semibold leading-tight text-ink sm:flex-1 sm:hyphens-manual sm:text-base ${stackAtLg ? "lg:flex-none xl:flex-1" : ""}`}
            >
              {label}
            </span>
            <ChevronRight
              size={18}
              aria-hidden="true"
              className={`hidden shrink-0 text-ink/40 transition-transform group-hover:translate-x-0.5 group-hover:text-brand sm:block ${stackAtLg ? "lg:hidden xl:block" : ""}`}
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
