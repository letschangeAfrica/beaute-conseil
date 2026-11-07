"use client";
import { ChevronDown } from "lucide-react";
import { jumpTo, useActiveSection } from "@/components/profile/ProfileParts";

export interface TocItem {
  id: string;
  label: string;
}

/**
 * Document table of contents. `side`: sticky list beside the text (desktop), current section marked.
 * `collapsible`: a "Sommaire" disclosure at the top (phones). Links jump to the section and move focus
 * to its heading (headings use the id `${id}-title` and tabIndex -1).
 */
export function TableOfContents({ items, variant }: { items: TocItem[]; variant: "side" | "collapsible" }) {
  const ids = items.map((i) => i.id);
  const active = useActiveSection(ids);

  const list = (
    <ol className={variant === "side" ? "flex flex-col gap-0.5" : "mt-2 flex flex-col gap-0.5 border-t border-line pt-2"}>
      {items.map((it, n) => {
        const on = active === it.id;
        return (
          <li key={it.id}>
            <a
              href={`#${it.id}`}
              onClick={(e) => {
                e.preventDefault();
                history.replaceState(null, "", `#${it.id}`);
                jumpTo(it.id);
              }}
              aria-current={on ? "location" : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-[0.9rem] px-3 py-1.5 text-[0.95rem] leading-snug transition-colors ${
                on ? "bg-brand-soft/70 font-semibold text-brand" : "text-ink/80 hover:bg-paper hover:text-ink"
              }`}
            >
              <span aria-hidden="true" className={`w-5 shrink-0 font-display italic ${on ? "text-brand" : "text-caramel-ink"}`}>
                {n + 1}
              </span>
              {it.label}
            </a>
          </li>
        );
      })}
    </ol>
  );

  if (variant === "side")
    return (
      <nav aria-label="Sommaire" className="print:hidden">
        <p className="eyebrow mb-3 px-3">Sommaire</p>
        {list}
      </nav>
    );

  return (
    <details className="group rounded-card bg-white p-2 shadow-soft ring-1 ring-line print:hidden">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between rounded-[0.9rem] px-3 font-semibold text-ink [&::-webkit-details-marker]:hidden">
        Sommaire
        <ChevronDown size={19} aria-hidden="true" className="text-ink/60 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
      </summary>
      <nav aria-label="Sommaire">{list}</nav>
    </details>
  );
}
