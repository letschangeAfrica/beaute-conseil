"use client";
import { useId, useState } from "react";
import { ArrowRight, Keyboard, RotateCcw } from "lucide-react";
import { parseBarcode } from "@/lib/utils";

/* ---------- Camera errors ---------------------------------------------- */

export type CameraError = "denied" | "notfound" | "busy" | "insecure" | "generic";

/** Maps a getUserMedia / scanner failure to one of the causes we can explain. */
export function cameraErrorKind(e: unknown): CameraError {
  if (typeof window !== "undefined" && !window.isSecureContext) return "insecure";
  const name = (e as { name?: string } | null)?.name ?? "";
  if (name === "NotAllowedError" || name === "SecurityError" || name === "PermissionDeniedError") return "denied";
  if (name === "NotFoundError" || name === "OverconstrainedError" || name === "DevicesNotFoundError") return "notfound";
  if (name === "NotReadableError" || name === "TrackStartError" || name === "AbortError") return "busy";
  return "generic";
}

const ERRORS: Record<CameraError, { title: string; text: string; retry: boolean }> = {
  denied: {
    title: "L'accès à la caméra est bloqué",
    text: "Autorisez la caméra pour ce site : touchez l'icône à gauche de l'adresse (ou « aA » sur iPhone), puis Caméra › Autoriser. Ou saisissez le code à la main.",
    retry: true,
  },
  notfound: {
    title: "Aucune caméra trouvée",
    text: "Cet appareil ne semble pas avoir de caméra disponible. Saisissez les chiffres du code-barres à la main.",
    retry: false,
  },
  busy: {
    title: "La caméra est déjà utilisée",
    text: "Une autre application ou un autre onglet s'en sert. Fermez-le, puis réessayez.",
    retry: true,
  },
  insecure: {
    title: "Caméra indisponible sur cette adresse",
    text: "Le navigateur n'autorise la caméra que sur une connexion sécurisée (https). Saisissez le code à la main.",
    retry: false,
  },
  generic: {
    title: "Impossible d'ouvrir la caméra",
    text: "Réessayez dans un instant, ou saisissez les chiffres du code-barres à la main.",
    retry: true,
  },
};

export function CameraErrorPanel({ kind, onRetry, onManual }: { kind: CameraError; onRetry: () => void; onManual: () => void }) {
  const e = ERRORS[kind];
  return (
    <div className="flex max-w-sm flex-col items-center gap-4 text-center">
      <div>
        <h2 className="font-display text-[1.35rem] leading-tight text-cream">{e.title}</h2>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-cream/85">{e.text}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2.5">
        {e.retry && (
          <button type="button" onClick={onRetry} className="btn bg-gold text-ink hover:bg-cream focus-visible:outline-gold">
            <RotateCcw size={18} aria-hidden="true" /> Réessayer
          </button>
        )}
        <button type="button" onClick={onManual} className="btn bg-cream/12 text-cream ring-1 ring-cream/35 hover:bg-cream/20 focus-visible:outline-gold">
          <Keyboard size={18} aria-hidden="true" /> Saisir le code
        </button>
      </div>
    </div>
  );
}

/* ---------- Manual entry ------------------------------------------------- */

/** Digits only, grouped for reading: EAN-13 as 1 · 6 · 6, EAN-8 as 4 · 4, otherwise by 4. */
export function formatBarcode(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (d.length === 13) return `${d[0]} ${d.slice(1, 7)} ${d.slice(7)}`;
  return d.replace(/(\d{4})(?=\d)/g, "$1 ");
}

/** Small drawing of where the code is: the digits printed under the bars. */
function BarcodeHint() {
  const bars = [2, 1, 1, 3, 1, 2, 1, 1, 2, 3, 1, 1, 2, 1, 3, 1, 2, 1, 1, 2, 1, 3, 1, 1, 2];
  let x = 4;
  return (
    <svg viewBox="0 0 96 52" className="h-12 w-[5.5rem] shrink-0" aria-hidden="true">
      <rect x="0" y="0" width="96" height="52" rx="8" className="fill-white" />
      {bars.map((w, i) => {
        const r = <rect key={i} x={x} y="6" width={w} height="28" className={i % 2 ? "fill-transparent" : "fill-ink"} />;
        x += w + 1;
        return r;
      })}
      <rect x="4" y="38" width="88" height="9" rx="2" className="fill-gold" />
      <text x="48" y="45.5" textAnchor="middle" className="fill-ink font-sans text-[7px] font-bold tracking-[0.12em]">
        3 600530 171910
      </text>
    </svg>
  );
}

/**
 * Typed barcode: grouped digits as you type, inline validation (8 to 14 digits),
 * and a submit gated by parseBarcode() so pasted spaces or dashes are fine.
 */
export function ManualEntry({ onSubmit, className = "", ref }: { onSubmit: (code: string) => void; className?: string; ref?: React.Ref<HTMLInputElement> }) {
  const [value, setValue] = useState("");
  const [touched, setTouched] = useState(false);
  const id = useId();
  const digits = value.replace(/\D/g, "").length;
  const code = parseBarcode(value);
  const invalid = touched && digits > 0 && !code;

  return (
    <form
      className={`card p-5 sm:p-6 ${className}`}
      onSubmit={(e) => {
        e.preventDefault();
        setTouched(true);
        if (code) onSubmit(code);
      }}
    >
      <label htmlFor={`${id}-ean`} className="flex items-center gap-2.5 font-display text-[1.25rem] leading-tight text-ink">
        <Keyboard size={20} aria-hidden="true" className="shrink-0 text-brand" /> Saisir le code à la main
      </label>
      <div className="mt-3 flex items-center gap-3.5 rounded-tile bg-paper p-3 ring-1 ring-line">
        <BarcodeHint />
        <p className="text-sm leading-snug text-ink/75">Les chiffres imprimés sous le code-barres, au dos ou sous le produit.</p>
      </div>
      <div className="mt-4 flex gap-2">
        <input
          ref={ref}
          id={`${id}-ean`}
          className={`input font-semibold tracking-[0.08em] tabular-nums ${invalid ? "border-danger focus:border-danger" : ""}`}
          inputMode="numeric"
          autoComplete="off"
          enterKeyHint="go"
          value={value}
          onChange={(e) => setValue(formatBarcode(e.target.value))}
          onBlur={() => setTouched(true)}
          placeholder="3 600530 171910"
          aria-invalid={invalid || undefined}
          aria-describedby={`${id}-help`}
        />
        <button type="submit" className="btn-primary min-h-12 shrink-0 px-4 sm:px-6" aria-label="Voir le produit" disabled={!code}>
          <ArrowRight size={20} aria-hidden="true" className="sm:hidden" />
          <span className="hidden sm:inline" aria-hidden="true">
            Voir
          </span>
        </button>
      </div>
      <p id={`${id}-help`} className={`mt-2 min-h-5 text-sm ${invalid ? "font-semibold text-danger" : "text-ink/70"}`} aria-live="polite">
        {invalid
          ? `Il faut 8 à 14 chiffres (vous en avez ${digits}).`
          : code
            ? `${digits} chiffres, c'est bon.`
            : digits > 0
              ? `${digits} chiffre${digits > 1 ? "s" : ""}`
              : "8 à 14 chiffres"}
      </p>
    </form>
  );
}
