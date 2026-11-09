"use client";
import { createContext, useContext, useRef, useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { PROFILE_LIMITS } from "@/lib/types";
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

type IconT = React.ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean | "true" }>;

/* ---------- Section ------------------------------------------------------ */

/**
 * A titled group of fields. `variant="card"` (default) is a white card with an icon, for dense
 * screens like the profile. `variant="plain"` drops the card and the icon, for the welcome flow
 * where each step is already one question.
 */
export function Section({
  icon: Icon,
  title,
  hint,
  children,
  variant = "card",
  id,
  level = 2,
}: {
  icon: IconT;
  title: string;
  hint?: string;
  children: React.ReactNode;
  variant?: "card" | "plain";
  id?: string;
  /** Heading level: 2 by default, 3 when the section sits inside a larger group (profile page). */
  level?: 2 | 3;
}) {
  const H = level === 3 ? "h3" : "h2";
  if (variant === "plain") {
    return (
      <section aria-labelledby={id}>
        <H id={id} className={`font-display font-normal leading-snug tracking-tight text-ink ${level === 3 ? "text-[1.15rem]" : "text-[1.3rem]"}`}>
          {title}
        </H>
        {hint && <p className="mt-1 text-[0.95rem] leading-relaxed text-ink/70">{hint}</p>}
        <div className="mt-4">{children}</div>
      </section>
    );
  }
  return (
    <section className="card p-5 sm:p-6" aria-labelledby={id}>
      <div className="mb-4 flex gap-3.5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
          <Icon size={20} aria-hidden="true" />
        </span>
        <div className="min-w-0 pt-0.5">
          <h2 id={id} className="font-display text-[1.18rem] font-medium leading-tight tracking-tight text-ink">
            {title}
          </h2>
          {hint && <p className="mt-1 text-sm leading-relaxed text-ink/70">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

/* ---------- Single choice: ChoiceGroup + OptionCard ---------------------- */

const InGroup = createContext(false);

/** Arrow keys move and select within a radio group (WAI-ARIA radio pattern). */
function onRadioKeys(e: React.KeyboardEvent<HTMLElement>) {
  const keys = ["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft", "Home", "End"];
  if (!keys.includes(e.key)) return;
  const radios = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]'));
  const i = radios.indexOf(document.activeElement as HTMLElement);
  if (i < 0) return;
  e.preventDefault();
  const n = radios.length;
  const next = e.key === "Home" ? 0 : e.key === "End" ? n - 1 : e.key === "ArrowDown" || e.key === "ArrowRight" ? (i + 1) % n : (i - 1 + n) % n;
  radios[next].focus();
  radios[next].click();
}

/**
 * Wraps OptionCards that form one single choice: gives them radio semantics, a roving tab stop
 * and arrow-key navigation. Without it, OptionCard stays a toggle button (aria-pressed).
 */
export function ChoiceGroup({ label, labelledBy, className = "grid gap-2.5", children }: { label?: string; labelledBy?: string; className?: string; children: React.ReactNode }) {
  return (
    <InGroup.Provider value={true}>
      <div role="radiogroup" aria-label={labelledBy ? undefined : label} aria-labelledby={labelledBy} className={className} onKeyDown={onRadioKeys}>
        {children}
      </div>
    </InGroup.Provider>
  );
}

export function OptionCard({ selected, onClick, title, hint, swatch }: { selected: boolean; onClick: () => void; title: string; hint: string; swatch?: string }) {
  const radio = useContext(InGroup);
  const semantics = radio ? { role: "radio" as const, "aria-checked": selected, tabIndex: selected ? 0 : -1 } : { "aria-pressed": selected };
  return (
    <button
      type="button"
      onClick={onClick}
      {...semantics}
      className={`option group flex min-h-[4.25rem] items-center gap-3.5 ${
        selected ? "border-brand bg-brand-soft/45 shadow-soft" : "border-line hover:border-caramel hover:bg-paper"
      }`}
    >
      {swatch && <span aria-hidden="true" className="swatch h-9 w-9" style={{ background: swatch }} />}
      <span className="min-w-0 flex-1">
        <span className="block font-semibold leading-snug text-ink">{title}</span>
        <span className="mt-0.5 block text-sm leading-snug text-ink/70">{hint}</span>
      </span>
      <span
        aria-hidden="true"
        className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-colors ${selected ? "border-brand bg-brand text-white" : "border-ink/30 group-hover:border-caramel-ink"}`}
      >
        {selected && <Check size={14} strokeWidth={3} />}
      </span>
    </button>
  );
}

/* ---------- Multiple choice ---------------------------------------------- */

export function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className={on ? "chip-on" : "chip-off"}>
      {on ? <Check size={15} strokeWidth={2.5} aria-hidden="true" /> : <Plus size={15} strokeWidth={2} aria-hidden="true" className="text-ink/60" />}
      {children}
    </button>
  );
}

/* ---------- Skin tone ---------------------------------------------------- */

/** Six skin-tone swatches as one radio group, each with its visible label. */
export function ToneGrid({
  value,
  onChange,
  label = "Carnation",
  labelledBy,
  className = "grid grid-cols-3 gap-2 sm:grid-cols-6",
}: {
  value: SkinTone;
  onChange: (v: SkinTone) => void;
  label?: string;
  labelledBy?: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={labelledBy ? undefined : label} aria-labelledby={labelledBy} className={className} onKeyDown={onRadioKeys}>
      {TONES.map(([v, name, color]) => {
        const on = value === v;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(v)}
            className={`group flex min-h-[6.75rem] flex-col items-center justify-center gap-2.5 rounded-tile border-2 px-1.5 py-3 text-sm font-semibold transition-colors duration-150 ${
              on ? "border-brand bg-white text-ink shadow-soft" : "border-transparent text-ink/80 hover:bg-white/70"
            }`}
          >
            <span
              aria-hidden="true"
              className={`swatch relative grid h-14 w-14 place-items-center transition-transform duration-(--duration-base) ease-(--ease-spring) motion-reduce:transition-none ${on ? "scale-110 ring-2 ring-brand ring-offset-2 ring-offset-white" : "motion-safe:group-hover:scale-105"}`}
              style={{ background: color }}
            >
              {on && (
                <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-brand shadow-soft motion-safe:animate-pop">
                  <Check size={14} strokeWidth={3} />
                </span>
              )}
            </span>
            <span className="text-center leading-tight">{name}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Switch ------------------------------------------------------- */

export function SensitiveToggle({ checked, onChange, hint }: { checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="mt-4 flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-tile bg-paper px-4 py-3 ring-1 ring-line transition-colors hover:bg-white">
      <span className="min-w-0">
        <span className="block font-semibold text-ink">Ma peau est sensible ou réactive</span>
        {hint && <span className="mt-0.5 block text-sm leading-snug text-ink/70">{hint}</span>}
      </span>
      <span className="relative inline-flex shrink-0">
        <input type="checkbox" role="switch" aria-checked={checked} className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span
          aria-hidden="true"
          className="h-7 w-12 rounded-full bg-ink/25 transition-colors peer-checked:bg-brand peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand"
        />
        <span
          aria-hidden="true"
          className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5 motion-reduce:transition-none"
        />
      </span>
    </label>
  );
}

/* ---------- Free-text allergies ----------------------------------------- */

/** Enter or "Ajouter" adds a tag and keeps the keyboard open; each tag removes itself on tap. */
export function AllergyEditor({ allergies, onChange, inputId }: { allergies: string[]; onChange: (v: string[]) => void; inputId?: string }) {
  const [input, setInput] = useState("");
  const [announce, setAnnounce] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const add = () => {
    const v = input.trim().toLowerCase();
    if (v && allergies.length >= PROFILE_LIMITS.allergies) {
      setAnnounce(`Maximum ${PROFILE_LIMITS.allergies} allergies : retirez-en une pour en ajouter`);
    } else if (v && !allergies.includes(v)) {
      onChange([...allergies, v]);
      setAnnounce(`${v} ajouté`);
    } else if (v) {
      setAnnounce(`${v} est déjà dans la liste`);
    }
    setInput("");
    ref.current?.focus();
  };
  const remove = (a: string) => {
    onChange(allergies.filter((x) => x !== a));
    setAnnounce(`${a} retiré`);
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
        <input
          ref={ref}
          id={inputId}
          className="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={PROFILE_LIMITS.allergyChars}
          placeholder="Ex. linalool"
          aria-label="Ingrédient auquel vous êtes allergique"
          enterKeyHint="done"
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
        />
        <button type="submit" className="btn-secondary min-h-12 shrink-0 px-4 sm:px-5" disabled={!input.trim()}>
          <Plus size={18} aria-hidden="true" />
          Ajouter
        </button>
      </form>
      {allergies.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Vos allergies">
          {allergies.map((a) => (
            <li key={a} className="min-w-0 max-w-full">
              <button
                type="button"
                className="chip max-w-full border-danger/30 bg-danger-soft text-danger hover:border-danger"
                onClick={() => remove(a)}
                aria-label={`Retirer ${a}`}
              >
                <span className="truncate">{a}</span> <X size={15} aria-hidden="true" className="shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </>
  );
}
