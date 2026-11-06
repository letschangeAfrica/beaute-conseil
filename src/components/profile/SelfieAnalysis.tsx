"use client";
import { useState } from "react";
import Link from "next/link";
import { Camera, Check, ShieldCheck, Sun } from "lucide-react";
import { Notice, Spinner } from "@/components/ui";
import type { ShadeAnalysis } from "@/lib/types";

const CONFIDENCE: Record<ShadeAnalysis["confidence"], { label: string; text: string }> = {
  faible: { label: "Fiabilité faible", text: "La photo était difficile à lire : vérifiez votre carnation et votre sous-ton ci-dessous." },
  moyenne: { label: "Fiabilité moyenne", text: "Un bon point de départ : ajustez ci-dessous si besoin." },
  elevee: { label: "Fiabilité élevée", text: "La photo était claire. Vous pouvez toujours ajuster ci-dessous." },
};

const TIPS = ["À la lumière du jour, près d'une fenêtre", "Sans maquillage", "Sans filtre ni retouche"];

/**
 * Selfie shade analysis. Consent comes first, as its own panel; the upload control does not exist
 * until consent is given (the server refuses requests without it anyway).
 */
export function SelfieAnalysis({
  consent,
  onConsent,
  state,
  error,
  onFile,
  advice,
}: {
  consent: string | null | undefined;
  onConsent: () => void;
  state: "idle" | "loading" | "error";
  error: string;
  onFile: (f: File) => void;
  advice?: ShadeAnalysis;
}) {
  const [box, setBox] = useState(false);

  return (
    <div className="overflow-hidden rounded-card bg-white shadow-soft ring-1 ring-line">
      {/* Gold, not burgundy: the beauty card above is already the page's one burgundy block. */}
      <div className="bg-gold/35 p-5 sm:p-6">
        <p className="eyebrow">Analyse par photo</p>
        <h3 className="mt-1.5 font-display text-[1.35rem] leading-tight text-ink">
          Votre teint, <span className="italic text-brand">lu sur un selfie</span>
        </h3>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-ink/80">
          Belle estime votre carnation et votre sous-ton, et vous conseille des couleurs. La photo sert uniquement à l&apos;analyse et n&apos;est pas conservée.
        </p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {TIPS.map((t) => (
            <li key={t} className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-sm text-ink ring-1 ring-line">
              <Sun size={14} aria-hidden="true" className="text-caramel-ink" /> {t}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-4 p-5 sm:p-6">
        {!consent ? (
          <div className="rounded-tile bg-paper p-4 ring-1 ring-line">
            <p className="flex items-center gap-2 font-semibold text-ink">
              <ShieldCheck size={18} aria-hidden="true" className="text-brand" /> Avant votre selfie
            </p>
            <label className="mt-3 flex cursor-pointer gap-3 rounded-tile p-1 text-sm leading-relaxed text-ink/85">
              <input type="checkbox" checked={box} onChange={(e) => setBox(e.target.checked)} className="peer sr-only" />
              <span
                aria-hidden="true"
                className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 border-ink/35 bg-white text-white transition-colors peer-checked:border-brand peer-checked:bg-brand peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand"
              >
                {box && <Check size={15} strokeWidth={3} />}
              </span>
              <span>
                J&apos;accepte que ma photo soit envoyée à Anthropic (États-Unis), le service d&apos;intelligence artificielle utilisé par Belle, uniquement pour analyser ma carnation.
                Belle ne conserve pas la photo. Je peux retirer mon accord à tout moment en supprimant mes données.{" "}
                <Link href="/confidentialite" className="font-semibold text-brand underline underline-offset-2">
                  En savoir plus
                </Link>
              </span>
            </label>
            <button type="button" className="btn-primary mt-3 w-full" disabled={!box} onClick={onConsent}>
              Continuer
            </button>
          </div>
        ) : (
          <label
            className={`btn-primary w-full cursor-pointer px-4 text-[0.95rem] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand ${
              state === "loading" ? "pointer-events-none opacity-70" : ""
            }`}
          >
            {state === "loading" ? (
              <Spinner label="Analyse en cours…" />
            ) : (
              <>
                <Camera size={19} aria-hidden="true" /> {advice ? "Refaire l'analyse" : "Prendre ou choisir une photo"}
              </>
            )}
            <input
              type="file"
              accept="image/*"
              capture="user"
              className="sr-only"
              disabled={state === "loading"}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) onFile(f);
              }}
            />
          </label>
        )}

        {state === "error" && <Notice kind="error">{error}</Notice>}

        {advice && (
          <div className="space-y-4 rounded-tile bg-paper p-4 ring-1 ring-line sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-display text-[1.15rem] leading-tight text-ink">Le résultat</p>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-ink ring-1 ring-line">{CONFIDENCE[advice.confidence].label}</span>
            </div>
            <p className="leading-relaxed text-ink/85">{advice.explanation}</p>
            <p className="leading-relaxed text-ink/85">
              <strong className="font-semibold text-ink">Fond de teint.</strong> {advice.foundationTips}
            </p>
            <ColorNames title="Couleurs qui vous subliment" names={advice.colorsToTry} tone="good" />
            <ColorNames title="Moins flatteuses" names={advice.colorsToAvoid} tone="muted" />
            {advice.photoQualityNote && <p className="text-sm italic text-ink/75">{advice.photoQualityNote}</p>}
            <p className="text-sm text-ink/75">
              {CONFIDENCE[advice.confidence].text} N&apos;oubliez pas d&apos;enregistrer.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/** Colour names as the AI returned them: words only, no invented colour values. */
function ColorNames({ title, names, tone }: { title: string; names: string[]; tone: "good" | "muted" }) {
  if (!names.length) return null;
  return (
    <div>
      <p className={`mb-2 text-sm font-bold ${tone === "good" ? "text-good" : "text-ink/75"}`}>{title}</p>
      <ul className="flex flex-wrap gap-1.5">
        {names.map((c) => (
          <li key={c} className={`rounded-full px-3 py-1 text-sm font-semibold ${tone === "good" ? "bg-good-soft text-good" : "bg-muted-soft text-ink/80"}`}>
            {c}
          </li>
        ))}
      </ul>
    </div>
  );
}
