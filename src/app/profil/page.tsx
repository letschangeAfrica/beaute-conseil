"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Ban,
  Camera,
  Check,
  Droplets,
  Leaf,
  MapPin,
  Palette,
  Plus,
  ShieldAlert,
  Sparkles,
  Target,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import { Notice, PageHeader, Spinner } from "@/components/ui";
import { DEFAULT_PROFILE, useProfile } from "@/lib/useLocal";
import type { Avoid, Concern, Pref, Profile, ShadeAnalysis, SkinTone, SkinType, Undertone } from "@/lib/types";

const SKIN_TYPES: [SkinType, string, string][] = [
  ["grasse", "Grasse", "Brille vite, pores visibles"],
  ["mixte", "Mixte", "Grasse sur le front et le nez"],
  ["seche", "Sèche", "Tiraille, peut peler"],
  ["normale", "Normale", "Ni grasse, ni sèche"],
];
const TONES: [SkinTone, string, string][] = [
  ["tres-clair", "Très claire", "#f6e1d3"],
  ["clair", "Claire", "#ecc9ae"],
  ["moyen", "Medium", "#d6a77f"],
  ["mat", "Mate", "#b98057"],
  ["fonce", "Foncée", "#8a5a3b"],
  ["tres-fonce", "Très foncée", "#5a3622"],
];
const UNDERTONES: [Undertone, string, string, string][] = [
  ["chaud", "Chaud", "Veines vertes, l'or vous va bien", "#d9a25a"],
  ["froid", "Froid", "Veines bleues ou violettes, l'argent vous va bien", "#c9a3b4"],
  ["neutre", "Neutre", "L'or et l'argent vous vont", "#c8a993"],
  ["olive", "Olive", "Reflet vert-doré", "#a69a62"],
  ["inconnu", "Je ne sais pas", "Utilisez l'analyse photo ci-dessus", "#e5dccb"],
];
const CONCERNS: [Concern, string][] = [
  ["acne", "Imperfections"],
  ["taches", "Taches"],
  ["rides", "Rides"],
  ["rougeurs", "Rougeurs"],
  ["pores", "Pores dilatés"],
  ["teint-terne", "Teint terne"],
];
const AVOIDS: [Avoid, string][] = [
  ["parfum", "Parfum"],
  ["parabenes", "Parabènes"],
  ["silicones", "Silicones"],
  ["sulfates", "Sulfates"],
  ["alcool", "Alcool"],
  ["huiles-essentielles", "Huiles essentielles"],
  ["nano", "Nanoparticules"],
];
const PREFS: [Pref, string][] = [
  ["vegan", "Vegan"],
  ["bio", "Bio"],
];

function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

/** Downscale the photo in the browser before sending it (faster, lighter). */
async function resizeImage(file: File, max = 1024): Promise<{ data: string; mediaType: "image/jpeg" }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const url = canvas.toDataURL("image/jpeg", 0.85);
  return { data: url.split(",")[1], mediaType: "image/jpeg" };
}

type IconT = React.ComponentType<{ size?: number; className?: string }>;

function Section({ icon: Icon, title, hint, children }: { icon: IconT; title: string; hint?: string; children: React.ReactNode }) {
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

function OptionCard({ selected, onClick, title, hint, swatch }: { selected: boolean; onClick: () => void; title: string; hint: string; swatch?: string }) {
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

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-pressed={on} className={on ? "chip-on" : "chip-off"}>
      {on && <Check size={15} strokeWidth={2.5} />}
      {children}
    </button>
  );
}

export default function ProfilPage() {
  const [saved, save, ready] = useProfile();
  const [p, setP] = useState<Profile>(DEFAULT_PROFILE);
  const [allergyInput, setAllergyInput] = useState("");
  const [shadeState, setShadeState] = useState<"idle" | "loading" | "error">("idle");
  const [shadeError, setShadeError] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (ready && saved) setP({ ...DEFAULT_PROFILE, ...saved });
  }, [ready, saved]);

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((prev) => ({ ...prev, [k]: v }));

  async function analyzeSelfie(file: File) {
    setShadeState("loading");
    setShadeError("");
    try {
      const { data, mediaType } = await resizeImage(file);
      const res = await fetch("/api/shade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: data, mediaType }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Une erreur est survenue.");
      const a = json as ShadeAnalysis;
      setP((prev) => ({ ...prev, skinTone: a.skinTone, undertone: a.undertone, shadeAdvice: a }));
      setShadeState("idle");
    } catch (e) {
      setShadeError(e instanceof Error ? e.message : "Une erreur est survenue.");
      setShadeState("error");
    }
  }

  function addAllergy() {
    const v = allergyInput.trim().toLowerCase();
    if (v && !p.allergies.includes(v)) set("allergies", [...p.allergies, v]);
    setAllergyInput("");
  }

  function onSave() {
    save(p);
    router.push("/");
  }

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Profil beauté" title="Parlez-nous de vous" subtitle="Deux minutes pour des conseils faits pour vous. Vos réponses restent sur votre téléphone." />

      <Section icon={UserRound} title="Votre prénom" hint="Facultatif">
        <input className="input" value={p.name ?? ""} onChange={(e) => set("name", e.target.value)} placeholder="Ex. Marie" autoComplete="given-name" />
      </Section>

      <section className="card overflow-hidden">
        <div className="bg-brand p-5 text-cream">
          <div className="flex gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cream/15 text-gold">
              <Sparkles size={20} />
            </span>
            <div>
              <h2 className="font-bold">Analyse de teint par photo</h2>
              <p className="mt-0.5 text-sm text-cream/80">Selfie à la lumière du jour, sans maquillage ni filtre. La photo sert uniquement à l&apos;analyse et n&apos;est pas conservée.</p>
            </div>
          </div>
          <label className={`btn mt-4 w-full cursor-pointer bg-cream text-brand hover:bg-gold ${shadeState === "loading" ? "pointer-events-none opacity-70" : ""}`}>
            {shadeState === "loading" ? (
              <Spinner label="Analyse en cours…" />
            ) : (
              <>
                <Camera size={19} /> {p.shadeAdvice ? "Refaire l'analyse" : "Prendre ou choisir une photo"}
              </>
            )}
            <input
              type="file"
              accept="image/*"
              capture="user"
              className="sr-only"
              disabled={shadeState === "loading"}
              onChange={(e) => e.target.files?.[0] && analyzeSelfie(e.target.files[0])}
            />
          </label>
        </div>
        {shadeState === "error" && (
          <div className="p-4">
            <Notice kind="error">{shadeError}</Notice>
          </div>
        )}
        {p.shadeAdvice && (
          <div className="space-y-3 p-5 text-[0.95rem] leading-relaxed">
            <p>{p.shadeAdvice.explanation}</p>
            <p>
              <b>Fond de teint.</b> {p.shadeAdvice.foundationTips}
            </p>
            <div>
              <p className="mb-1.5 text-sm font-bold text-good">Couleurs qui vous subliment</p>
              <div className="flex flex-wrap gap-1.5">
                {p.shadeAdvice.colorsToTry.map((c) => (
                  <span key={c} className="rounded-full bg-good-soft px-3 py-1 text-sm font-semibold text-good">
                    {c}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-sm font-bold text-ink/60">Moins flatteuses</p>
              <div className="flex flex-wrap gap-1.5">
                {p.shadeAdvice.colorsToAvoid.map((c) => (
                  <span key={c} className="rounded-full bg-muted-soft px-3 py-1 text-sm font-semibold text-ink/70">
                    {c}
                  </span>
                ))}
              </div>
            </div>
            {p.shadeAdvice.photoQualityNote && <p className="text-sm italic text-ink/60">{p.shadeAdvice.photoQualityNote}</p>}
            <p className="text-xs text-ink/50">Fiabilité : {p.shadeAdvice.confidence}. Vous pouvez ajuster ci-dessous.</p>
          </div>
        )}
      </section>

      <Section icon={Palette} title="Votre carnation">
        <div className="grid grid-cols-3 gap-2">
          {TONES.map(([v, label, color]) => {
            const on = p.skinTone === v;
            return (
              <button
                key={v}
                onClick={() => set("skinTone", v)}
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
      </Section>

      <Section icon={Palette} title="Votre sous-ton" hint="Regardez les veines de votre poignet à la lumière du jour.">
        <div className="space-y-2">
          {UNDERTONES.map(([v, label, hint, swatch]) => (
            <OptionCard key={v} selected={p.undertone === v} onClick={() => set("undertone", v)} title={label} hint={hint} swatch={swatch} />
          ))}
        </div>
      </Section>

      <Section icon={Droplets} title="Votre type de peau">
        <div className="space-y-2">
          {SKIN_TYPES.map(([v, label, hint]) => (
            <OptionCard key={v} selected={p.skinType === v} onClick={() => set("skinType", v)} title={label} hint={hint} />
          ))}
        </div>
        <label className="mt-4 flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-paper px-4 py-3">
          <span className="font-semibold">Ma peau est sensible ou réactive</span>
          <span className="relative inline-flex">
            <input type="checkbox" className="peer sr-only" checked={p.sensitive} onChange={(e) => set("sensitive", e.target.checked)} />
            <span className="h-7 w-12 rounded-full bg-caramel/40 transition peer-checked:bg-brand" />
            <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
          </span>
        </label>
      </Section>

      <Section icon={Target} title="Vos préoccupations" hint="Plusieurs choix possibles">
        <div className="flex flex-wrap gap-2">
          {CONCERNS.map(([v, label]) => (
            <Chip key={v} on={p.concerns.includes(v)} onClick={() => set("concerns", toggle(p.concerns, v))}>
              {label}
            </Chip>
          ))}
        </div>
      </Section>

      <Section icon={Ban} title="Ingrédients à éviter" hint="Les produits qui en contiennent perdront des points.">
        <div className="flex flex-wrap gap-2">
          {AVOIDS.map(([v, label]) => (
            <Chip key={v} on={p.avoid.includes(v)} onClick={() => set("avoid", toggle(p.avoid, v))}>
              {label}
            </Chip>
          ))}
        </div>
        <p className="mb-2 mt-5 flex items-center gap-2 text-sm font-bold">
          <Leaf size={16} className="text-good" /> Mes préférences
        </p>
        <div className="flex flex-wrap gap-2">
          {PREFS.map(([v, label]) => (
            <Chip key={v} on={p.prefs.includes(v)} onClick={() => set("prefs", toggle(p.prefs, v))}>
              {label}
            </Chip>
          ))}
        </div>
      </Section>

      <Section icon={ShieldAlert} title="Allergies connues" hint="Nom de l'ingrédient tel qu'écrit sur l'emballage, par exemple linalool ou lanolin. Ces produits seront signalés « À éviter ».">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            addAllergy();
          }}
        >
          <input className="input" value={allergyInput} onChange={(e) => setAllergyInput(e.target.value)} placeholder="Ajouter un ingrédient" />
          <button className="btn-icon" aria-label="Ajouter l'allergie" disabled={!allergyInput.trim()}>
            <Plus size={20} />
          </button>
        </form>
        {p.allergies.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {p.allergies.map((a) => (
              <button
                key={a}
                className="chip border-danger/30 bg-danger-soft text-danger hover:border-danger"
                onClick={() => set("allergies", p.allergies.filter((x) => x !== a))}
                aria-label={`Retirer ${a}`}
              >
                {a} <X size={15} />
              </button>
            ))}
          </div>
        )}
      </Section>

      <Section icon={Wallet} title="Budget par produit">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-ink/60">Jusqu&apos;à</span>
          <span className="font-display text-3xl text-brand tabular-nums">{p.budget} €</span>
        </div>
        <input
          type="range"
          min={5}
          max={100}
          step={5}
          value={p.budget}
          onChange={(e) => set("budget", Number(e.target.value))}
          className="mt-2 w-full accent-brand"
          aria-label="Budget maximum par produit"
        />
        <div className="mt-1 flex justify-between text-xs text-ink/45">
          <span>5 €</span>
          <span>100 €</span>
        </div>
        <div className="relative mt-5">
          <MapPin size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/40" />
          <input className="input pl-11" value={p.city ?? ""} onChange={(e) => set("city", e.target.value)} placeholder="Votre ville (pour les prix près de chez vous)" autoComplete="address-level2" />
        </div>
      </Section>

      <div className="sticky bottom-24 z-10 pt-2">
        <button className="btn-primary w-full text-lg shadow-lift" onClick={onSave}>
          <Check size={20} /> Enregistrer mon profil
        </button>
      </div>
    </div>
  );
}
