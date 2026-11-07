"use client";
import { useId, useMemo, useState } from "react";
import { ChevronDown, CircleAlert, CircleCheck, FlaskConical, Info, ShieldAlert, X } from "lucide-react";
import { type FactKind, type IngredientExplanation, explainIngredient, headlineKind } from "@/lib/ingredientInfo";
import { parseIngredients } from "@/lib/ingredients";
import type { Profile } from "@/lib/types";

/** Chip and fact styles per kind. Never colour alone: each kind has an icon and words. */
const KIND: Record<FactKind, { chip: string; Icon: typeof Info; label: string; text: string }> = {
  allergy: { chip: "bg-danger text-white ring-danger", Icon: ShieldAlert, label: "Allergie", text: "text-danger" },
  avoid: { chip: "bg-warn-soft text-warn ring-warn/40", Icon: CircleAlert, label: "À éviter pour vous", text: "text-warn" },
  warn: { chip: "bg-warn-soft text-warn ring-warn/40", Icon: CircleAlert, label: "Attention", text: "text-warn" },
  good: { chip: "bg-good-soft text-good ring-good/30", Icon: CircleCheck, label: "Bon pour vous", text: "text-good" },
  info: { chip: "bg-white text-ink ring-line", Icon: Info, label: "", text: "text-ink/80" },
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Full ingredient list as tappable chips. Tapping one explains it in plain French for her
 * (role, family, and why it matters for her profile). Opens by itself when it contains one of her allergens.
 */
export function IngredientList({ text, allergyHit, profile }: { text: string; allergyHit?: string[]; profile: Profile | null }) {
  const items = useMemo(() => parseIngredients(text).map((name) => explainIngredient(name, profile)), [text, profile]);
  const [open, setOpen] = useState<number | null>(null);
  const panelId = useId();
  const flagged = items.filter((e) => headlineKind(e) && headlineKind(e) !== "info").length;
  const current = open === null ? null : items[open];

  return (
    <details className="card group" open={(allergyHit?.length ?? 0) > 0}>
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 rounded-card px-5 py-4 sm:px-6 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2.5">
          <FlaskConical size={20} aria-hidden="true" className="text-brand" />
          <h2 className="font-display text-[1.25rem] leading-tight text-ink">Liste des ingrédients</h2>
        </span>
        <span className="flex items-center gap-2">
          {flagged > 0 && <span className="rounded-full bg-paper px-2.5 py-0.5 text-xs font-semibold text-ink/75 ring-1 ring-line">{flagged} à noter</span>}
          <ChevronDown size={20} aria-hidden="true" className="shrink-0 text-ink/60 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
        </span>
      </summary>

      <div className="border-t border-line px-5 pb-5 pt-4 sm:px-6">
        <p className="mb-3 text-sm text-ink/75">Touchez un ingrédient pour savoir à quoi il sert et s&apos;il compte pour vous.</p>
        <ul className="flex flex-wrap gap-1.5">
          {items.map((e, i) => {
            const kind = headlineKind(e) ?? "info";
            const k = KIND[kind];
            const selected = open === i;
            return (
              <li key={`${e.name}-${i}`}>
                <button
                  type="button"
                  onClick={() => setOpen(selected ? null : i)}
                  aria-expanded={selected}
                  aria-controls={panelId}
                  className={`inline-flex min-h-9 max-w-full items-center gap-1 rounded-full px-3 py-1 text-left text-sm ring-1 transition ${k.chip} ${selected ? "ring-2 ring-brand" : "hover:ring-brand/50"}`}
                >
                  {kind !== "info" && <k.Icon size={14} aria-hidden="true" className="shrink-0" />}
                  <span className="break-words">{cap(e.name)}</span>
                  {kind !== "info" && <span className="sr-only">, {k.label}</span>}
                </button>
              </li>
            );
          })}
        </ul>

        <div id={panelId} aria-live="polite">
          {current && <Explanation e={current} onClose={() => setOpen(null)} />}
        </div>

        <p className="mt-4 text-xs leading-relaxed text-ink/70">
          Explications générales, pas un avis médical. En cas de doute ou de réaction, demandez à un pharmacien ou un dermatologue.
        </p>
      </div>
    </details>
  );
}

function Explanation({ e, onClose }: { e: IngredientExplanation; onClose: () => void }) {
  return (
    <div className="mt-4 rounded-tile bg-paper p-4 ring-1 ring-line motion-safe:animate-rise">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-[1.1rem] leading-snug text-ink">{cap(e.name)}</h3>
        <button type="button" onClick={onClose} aria-label="Fermer l'explication" className="-m-2 grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink/70 hover:text-brand">
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      {e.role ? <p className="mt-1 text-[0.95rem] text-ink/85">{e.role}</p> : !e.facts.length && <p className="mt-1 text-[0.95rem] text-ink/75">Pas d&apos;information détaillée sur cet ingrédient.</p>}
      {e.facts.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {e.facts.map((f) => {
            const k = KIND[f.kind];
            return (
              <li key={f.text} className={`flex gap-2 text-sm leading-snug ${k.text}`}>
                <k.Icon size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
                <span>
                  {k.label && <span className="font-semibold">{k.label} : </span>}
                  {f.text}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
