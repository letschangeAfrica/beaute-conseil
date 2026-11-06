"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Ban, Check, Droplets, Palette, ShieldAlert, Sparkles } from "lucide-react";
import { AVOIDS, AllergyEditor, Chip, OptionCard, SKIN_TYPES, Section, SensitiveToggle, ToneGrid, UNDERTONES, toggle } from "@/components/ProfileFields";
import { Logo } from "@/components/ui";
import type { Profile } from "@/lib/types";
import { DEFAULT_PROFILE, useOnboarded, useProfile } from "@/lib/useLocal";

const STEPS = ["Votre peau", "Votre carnation", "À éviter"] as const;

/** First-visit flow: three short steps so scores are personal from the very first search. */
export default function BienvenuePage() {
  const router = useRouter();
  const [, saveProfile] = useProfile();
  const [, setOnboarded] = useOnboarded();
  const [step, setStep] = useState(-1); // -1 = intro
  const [p, setP] = useState<Profile>(DEFAULT_PROFILE);
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((prev) => ({ ...prev, [k]: v }));

  function skip() {
    setOnboarded(true);
    router.replace("/");
  }

  function finish() {
    saveProfile(p);
    setOnboarded(true);
    router.replace("/");
  }

  if (step < 0) {
    return (
      <div className="flex min-h-[75dvh] flex-col justify-center gap-6">
        <Logo />
        <div>
          <h1 className="font-display text-[2.2rem] leading-[1.1]">
            Le bon produit,
            <br />
            <span className="italic text-brand">pour votre peau.</span>
          </h1>
          <p className="mt-3 text-ink/70">
            Belle note chaque produit selon <b>votre</b> peau, vos allergies et votre budget, puis trouve le meilleur prix en France. Trois questions rapides pour commencer.
          </p>
        </div>
        <ul className="space-y-2 text-[0.95rem]">
          {["Un score de 0 à 100 expliqué simplement", "Alerte immédiate si un ingrédient vous est interdit", "Les prix comparés en magasin et en ligne"].map((t) => (
            <li key={t} className="flex items-center gap-2.5">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-good-soft text-good">
                <Check size={14} strokeWidth={3} />
              </span>
              {t}
            </li>
          ))}
        </ul>
        <div className="space-y-2">
          <button className="btn-primary w-full text-lg" onClick={() => setStep(0)}>
            Commencer <ArrowRight size={20} />
          </button>
          <button className="btn w-full text-ink/60 hover:text-brand" onClick={skip}>
            Plus tard
          </button>
        </div>
      </div>
    );
  }

  const last = step === STEPS.length - 1;

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <button onClick={() => setStep(step - 1)} className="btn-icon bg-white text-ink ring-1 ring-caramel/30 hover:bg-paper" aria-label="Étape précédente">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-caramel-ink">
            Étape {step + 1} sur {STEPS.length}
          </p>
          <div className="mt-1.5 flex gap-1.5" aria-hidden>
            {STEPS.map((_, i) => (
              <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-brand" : "bg-caramel/25"}`} />
            ))}
          </div>
        </div>
        <button onClick={skip} className="text-sm font-semibold text-ink/55 hover:text-brand">
          Passer
        </button>
      </header>

      <h1 className="font-display text-[1.85rem] leading-tight">{STEPS[step]}</h1>

      {step === 0 && (
        <Section icon={Droplets} title="Quel est votre type de peau ?">
          <div className="space-y-2">
            {SKIN_TYPES.map(([v, label, hint]) => (
              <OptionCard key={v} selected={p.skinType === v} onClick={() => set("skinType", v)} title={label} hint={hint} />
            ))}
          </div>
          <SensitiveToggle checked={p.sensitive} onChange={(v) => set("sensitive", v)} />
        </Section>
      )}

      {step === 1 && (
        <>
          <Section icon={Palette} title="Votre carnation" hint="La couleur de votre peau, sur la joue.">
            <ToneGrid value={p.skinTone} onChange={(v) => set("skinTone", v)} />
          </Section>
          <Section icon={Sparkles} title="Votre sous-ton" hint="Regardez les veines de votre poignet à la lumière du jour.">
            <div className="space-y-2">
              {UNDERTONES.map(([v, label, hint, swatch]) => (
                <OptionCard key={v} selected={p.undertone === v} onClick={() => set("undertone", v)} title={label} hint={hint} swatch={swatch} />
              ))}
            </div>
          </Section>
        </>
      )}

      {step === 2 && (
        <>
          <Section icon={ShieldAlert} title="Allergies connues" hint="Nom de l'ingrédient tel qu'écrit sur l'emballage, par exemple linalool ou lanoline. Facultatif.">
            <AllergyEditor allergies={p.allergies} onChange={(v) => set("allergies", v)} />
          </Section>
          <Section icon={Ban} title="Ingrédients que vous préférez éviter" hint="Facultatif">
            <div className="flex flex-wrap gap-2">
              {AVOIDS.map(([v, label]) => (
                <Chip key={v} on={p.avoid.includes(v)} onClick={() => set("avoid", toggle(p.avoid, v))}>
                  {label}
                </Chip>
              ))}
            </div>
          </Section>
          <p className="px-1 text-sm leading-relaxed text-ink/65">
            En continuant, vous acceptez que ces informations, dont vos allergies et l&apos;état de votre peau, servent à personnaliser les scores. Elles restent sur votre téléphone.{" "}
            <Link href="/confidentialite" className="font-semibold text-brand underline">
              Politique de confidentialité
            </Link>
          </p>
        </>
      )}

      <div className="sticky bottom-24 z-10 pt-2">
        <button className="btn-primary w-full text-lg shadow-lift" onClick={last ? finish : () => setStep(step + 1)}>
          {last ? (
            <>
              <Check size={20} /> C&apos;est parti
            </>
          ) : (
            <>
              Continuer <ArrowRight size={20} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
