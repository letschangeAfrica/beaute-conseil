import { ChevronDown, FlaskConical } from "lucide-react";

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Splits the text around her allergens (case-insensitive) so they can be marked. Nothing else is analysed. */
function highlight(text: string, terms: string[]) {
  const clean = terms.map((t) => t.trim()).filter(Boolean);
  if (!clean.length) return text;
  const re = new RegExp(`(${clean.map(escape).join("|")})`, "gi");
  return text.split(re).map((part, i) =>
    i % 2 ? (
      <mark key={i} className="rounded bg-danger-soft px-1 font-semibold text-danger ring-1 ring-danger/25">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

/** Full ingredient list, collapsible; opens by itself when it contains one of her allergens. */
export function IngredientList({ text, allergyHit }: { text: string; allergyHit?: string[] }) {
  const hits = allergyHit ?? [];
  return (
    <details className="card group" open={hits.length > 0}>
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 rounded-card px-5 py-4 sm:px-6 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2.5">
          <FlaskConical size={20} aria-hidden="true" className="text-brand" />
          <h2 className="font-display text-[1.25rem] leading-tight text-ink">Liste des ingrédients</h2>
        </span>
        <ChevronDown size={20} aria-hidden="true" className="shrink-0 text-ink/60 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
      </summary>
      <div className="border-t border-line px-5 pb-5 pt-4 sm:px-6">
        {hits.length > 0 && <p className="mb-3 text-sm font-semibold text-danger">Vos allergènes sont surlignés.</p>}
        <p className="break-words text-[0.95rem] leading-relaxed text-ink/80">{highlight(text, hits)}</p>
      </div>
    </details>
  );
}
