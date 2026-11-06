"use client";
import { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import type { Avoid, Concern, Pref, SkinTone, SkinType, Undertone } from "@/lib/types";

/* Options and form controls shared by the profile page and the welcome flow. */

export const SKIN_TYPES: [SkinType, string, string][] = [
  ["grasse", "Grasse", "Brille vite, pores visibles"],
  ["mixte", "Mixte", "Grasse sur le front et le nez"],
  ["seche", "Sèche", "Tiraille, peut peler"],
  ["normale", "Normale", "Ni grasse, ni sèche"],
];
export const TONES: [SkinTone, string, string][] = [
  ["tres-clair", "Très claire", "#f6e1d3"],
  ["clair", "Claire", "#ecc9ae"],
  ["moyen", "Medium", "#d6a77f"],
  ["mat", "Mate", "#b98057"],
  ["fonce", "Foncée", "#8a5a3b"],
  ["tres-fonce", "Très foncée", "#5a3622"],
];
export const UNDERTONES: [Undertone, string, string, string][] = [
  ["chaud", "Chaud", "Veines vertes, l'or vous va bien", "#d9a25a"],
  ["froid", "Froid", "Veines bleues ou violettes, l'argent vous va bien", "#c9a3b4"],
  ["neutre", "Neutre", "L'or et l'argent vous vont", "#c8a993"],
  ["olive", "Olive", "Reflet vert-doré", "#a69a62"],
  ["inconnu", "Je ne sais pas", "L'analyse photo du profil peut vous aider", "#e5dccb"],
];
export const CONCERNS: [Concern, string][] = [
  ["acne", "Imperfections"],
  ["taches", "Taches"],
  ["rides", "Rides"],
  ["rougeurs", "Rougeurs"],
  ["pores", "Pores dilatés"],
  ["teint-terne", "Teint terne"],
];
export const AVOIDS: [Avoid, string][] = [
  ["parfum", "Parfum"],
  ["parabenes", "Parabènes"],
  ["silicones", "Silicones"],
  ["sulfates", "Sulfates"],
  ["alcool", "Alcool"],
  ["huiles-essentielles", "Huiles essentielles"],
  ["nano", "Nanoparticules"],
];
export const PREFS: [Pref, string][] = [
  ["vegan", "Vegan"],
  ["bio", "Bio"],
];

export function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

type IconT = React.ComponentType<{ size?: number; className?: string }>;

export function Section({ icon: Icon, title, hint, children }: { icon: IconT; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <div className="mb-4 flex gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold/60 text-brand">
          <Icon size={20} />
        </span>
        <div>
          <h2 className="font-bold leading-tight">{title}</h2>
          {hint && <p className="mt-0.5 text-sm text-ink/60">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export function OptionCard({ selected, onClick, title, hint, swatch }: { selected: boolean; onClick: () => void; title: string; hint: string; swatch?: string }) {
  return (
    <button onClick={onClick} aria-pressed={selected} className={`option flex items-center gap-3 ${selected ? "border-brand bg-paper" : "border-caramel/25 hover:border-caramel"}`}>
      {swatch && <span className="h-7 w-7 shrink-0 rounded-full ring-1 ring-black/10" style={{ background: swatch }} />}
      <span className="flex-1">
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-ink/60">{hint}</span>
      </span>
      <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${selected ? "border-brand bg-brand text-white" : "border-caramel/50"}`}>
        {selected && <Check size={14} strokeWidth={3} />}
      </span>
    </button>
  );
}

export function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-pressed={on} className={on ? "chip-on" : "chip-off"}>
      {on && <Check size={15} strokeWidth={2.5} />}
      {children}
    </button>
  );
}

export function ToneGrid({ value, onChange }: { value: SkinTone; onChange: (v: SkinTone) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {TONES.map(([v, label, color]) => {
        const on = value === v;
        return (
          <button
            key={v}
            onClick={() => onChange(v)}
            aria-pressed={on}
            className={`flex flex-col items-center gap-2 rounded-2xl border-2 px-2 py-3 text-sm font-semibold transition ${on ? "border-brand bg-paper" : "border-transparent hover:bg-paper"}`}
          >
            <span className="relative grid h-12 w-12 place-items-center rounded-full ring-1 ring-black/10" style={{ background: color }}>
              {on && (
                <span className="grid h-6 w-6 place-items-center rounded-full bg-white/90 text-brand">
                  <Check size={15} strokeWidth={3} />
                </span>
              )}
            </span>
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function SensitiveToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="mt-4 flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-paper px-4 py-3">
      <span className="font-semibold">Ma peau est sensible ou réactive</span>
      <span className="relative inline-flex">
        <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-7 w-12 rounded-full bg-caramel/40 transition peer-checked:bg-brand" />
        <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

export function AllergyEditor({ allergies, onChange }: { allergies: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState("");
  const add = () => {
    const v = input.trim().toLowerCase();
    if (v && !allergies.includes(v)) onChange([...allergies, v]);
    setInput("");
  };
  return (
    <>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <input className="input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ajouter un ingrédient" aria-label="Ingrédient auquel vous êtes allergique" />
        <button className="btn-icon" aria-label="Ajouter l'allergie" disabled={!input.trim()}>
          <Plus size={20} />
        </button>
      </form>
      {allergies.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {allergies.map((a) => (
            <button key={a} className="chip border-danger/30 bg-danger-soft text-danger hover:border-danger" onClick={() => onChange(allergies.filter((x) => x !== a))} aria-label={`Retirer ${a}`}>
              {a} <X size={15} />
            </button>
          ))}
        </div>
      )}
    </>
  );
}
