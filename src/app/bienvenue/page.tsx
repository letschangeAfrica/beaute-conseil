"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Info, Sun } from "lucide-react";
import { AVOIDS, AllergyEditor, Chip, ChoiceGroup, OptionCard, SKIN_TYPES, Section, SensitiveToggle, TONES, ToneGrid, UNDERTONES, toggle } from "@/components/ProfileFields";
import { Logo } from "@/components/ui";
import type { Profile } from "@/lib/types";
import { DEFAULT_PROFILE, useOnboarded, useProfile } from "@/lib/useLocal";

const STEPS = ["Votre peau", "Votre carnation", "À éviter"] as const;

const BENEFITS = [
  { title: "Un score de 0 à 100", text: "expliqué simplement, pour votre peau." },
  { title: "Une alerte immédiate", text: "si un ingrédient vous est interdit." },
  { title: "Les prix comparés", text: "en magasin et en ligne." },
];

const STEP_PREVIEW = [
  { title: "Votre peau", text: "Type de peau, sensibilité." },
  { title: "Votre carnation", text: "Teinte et sous-ton." },
  { title: "À éviter", text: "Allergies et ingrédients, si besoin." },
];

/** First-visit flow: three short steps so scores are personal from the very first search. */
export default function BienvenuePage() {
  const router = useRouter();
  const [, saveProfile] = useProfile();
  const [, setOnboarded] = useOnboarded();
  const [step, setStep] = useState(-1); // -1 = intro
  const [p, setP] = useState<Profile>(DEFAULT_PROFILE);
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((prev) => ({ ...prev, [k]: v }));

  // After each step change: back to the top, and focus on the new heading (not on first load).
  const heading = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo({ top: 0 });
    heading.current?.focus({ preventScroll: true });
  }, [step]);

  function skip() {
    setOnboarded(true);
    router.replace("/");
  }

  function finish() {
    saveProfile(p);
    setOnboarded(true);
    router.replace("/");
  }

  /* ---------- Intro ---------- */

  if (step < 0) {
    return (
      <div data-layout="wide" className="flex min-h-[calc(100dvh-10rem)] flex-col">
        <header className="flex h-12 items-center">
          <Logo />
        </header>

        <div className="grid flex-1 items-center gap-10 py-10 sm:py-14 lg:grid-cols-12 lg:gap-16">
          <div className="min-w-0 lg:col-span-7">
            <p className="eyebrow motion-safe:animate-rise">Bienvenue</p>
            <h1 ref={heading} tabIndex={-1} className="mt-3 font-display text-hero font-normal text-ink outline-none motion-safe:animate-rise">
              Le bon produit,
              <br />
              <span className="italic text-brand">pour votre peau.</span>
            </h1>
            <p className="mt-5 max-w-[34rem] text-[1.05rem] leading-relaxed text-ink/75 [animation-delay:60ms] motion-safe:animate-rise sm:text-lg">
              Belle note chaque produit selon <em className="font-display not-italic text-ink">votre</em> peau, vos allergies et votre budget, puis trouve le
              meilleur prix en France.
            </p>

            <ul className="mt-8 grid gap-4 [animation-delay:120ms] motion-safe:animate-rise sm:grid-cols-3 sm:gap-6">
              {BENEFITS.map((b) => (
                <li key={b.title} className="flex gap-3 sm:flex-col sm:gap-2.5 sm:border-t sm:border-line sm:pt-4">
                  <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-good-soft text-good">
                    <Check size={15} strokeWidth={2.75} />
                  </span>
                  <span className="leading-snug">
                    <span className="font-semibold text-ink">{b.title}</span> <span className="text-ink/70">{b.text}</span>
                  </span>
                </li>
              ))}
            </ul>

            <p className="mt-9 inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-full bg-paper px-4 py-2 text-sm text-ink/75 ring-1 ring-line [animation-delay:180ms] motion-safe:animate-rise">
              <span className="font-semibold text-ink">3 questions</span>
              <span aria-hidden="true">·</span>
              <span>moins d&apos;une minute</span>
              <span aria-hidden="true">·</span>
              <span>vous pouvez passer à tout moment</span>
            </p>

            <div className="action-bar mt-10 [animation-delay:240ms] motion-safe:md:animate-rise">
              <div className="mx-auto flex max-w-md gap-3 md:mx-0 md:max-w-none">
                <button type="button" className="btn-secondary shrink-0 px-5" onClick={skip}>
                  Plus tard
                </button>
                <button type="button" className="btn-primary flex-1 text-lg md:flex-none md:px-8" onClick={() => setStep(0)}>
                  Commencer <ArrowRight size={20} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          {/* Visual panel (desktop): what the three questions cover. */}
          <aside aria-label="Les trois questions" className="hidden rounded-panel bg-brand p-10 text-cream shadow-lift [animation-delay:160ms] motion-safe:animate-rise lg:col-span-5 lg:block xl:p-12">
            <p className="eyebrow text-gold">Trois questions</p>
            <ol className="mt-6 space-y-6">
              {STEP_PREVIEW.map((s, i) => (
                <li key={s.title} className="flex gap-5 border-t border-cream/20 pt-5">
                  <span aria-hidden="true" className="font-display text-[2.2rem] leading-none italic text-gold">
                    {i + 1}
                  </span>
                  <span>
                    <span className="block font-display text-[1.35rem] leading-tight">{s.title}</span>
                    <span className="mt-1 block text-[0.95rem] text-cream/85">{s.text}</span>
                  </span>
                </li>
              ))}
            </ol>
            <div aria-hidden="true" className="mt-10 flex gap-2">
              {TONES.map(([v, , color]) => (
                <span key={v} className="swatch h-9 w-9 ring-2 ring-brand" style={{ background: color }} />
              ))}
            </div>
          </aside>
        </div>
      </div>
    );
  }

  /* ---------- Steps ---------- */

  const last = step === STEPS.length - 1;
  const progress = `Étape ${step + 1} sur ${STEPS.length} · ${STEPS[step]}`;

  return (
    <div data-layout="wide" className="mx-auto w-full max-w-4xl">
      {/* Top bar: back, named progress, skip. Same height on every step. */}
      <header className="grid grid-cols-[auto_1fr_auto] items-center gap-3 sm:gap-5">
        <button type="button" onClick={() => setStep(step - 1)} className="btn-secondary h-11 min-h-11 w-11 px-0 ring-line" aria-label={step === 0 ? "Retour à l'accueil de bienvenue" : "Étape précédente"}>
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <div className="min-w-0">
          <p className="truncate text-sm text-ink/75">
            <span className="font-semibold text-ink">
              Étape {step + 1} sur {STEPS.length}
            </span>
            <span aria-hidden="true"> · </span>
            {STEPS[step]}
          </p>
          <div
            role="progressbar"
            aria-label="Progression"
            aria-valuemin={1}
            aria-valuemax={STEPS.length}
            aria-valuenow={step + 1}
            aria-valuetext={progress}
            className="mt-2 flex gap-1.5"
          >
            {STEPS.map((s, i) => (
              <span key={s} className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/12">
                <span className={`block h-full rounded-full bg-brand transition-[width] duration-500 ease-out-soft motion-reduce:transition-none ${i <= step ? "w-full" : "w-0"}`} />
              </span>
            ))}
          </div>
        </div>
        <button type="button" onClick={skip} className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-ink/75 hover:text-brand">
          Passer
        </button>
      </header>

      {/* Keyed by step: each step fades in on its own (CSS only, off under reduced motion). */}
      <div key={step} className="pt-10 motion-safe:animate-rise sm:pt-14">
        {step === 0 && (
          <div className="mx-auto max-w-2xl">
            <StepHeading ref={heading} title="Quel est votre type de peau ?" hint="Choisissez ce qui vous ressemble le plus au quotidien, sans maquillage." />
            <ChoiceGroup labelledBy="step-title" className="mt-7 grid gap-2.5 sm:grid-cols-2 sm:gap-3">
              {SKIN_TYPES.map(([v, label, hint]) => (
                <OptionCard key={v} selected={p.skinType === v} onClick={() => set("skinType", v)} title={label} hint={hint} />
              ))}
            </ChoiceGroup>
            <SensitiveToggle checked={p.sensitive} onChange={(v) => set("sensitive", v)} hint="Rougeurs, picotements ou réactions fréquentes." />
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-14">
            <div className="min-w-0 lg:sticky lg:top-8 lg:self-start">
              <StepHeading ref={heading} title="Quelle est votre carnation ?" hint="La couleur de votre peau sur la joue, à la lumière du jour." />
              <ToneGrid value={p.skinTone} onChange={(v) => set("skinTone", v)} labelledBy="step-title" className="mt-7 grid grid-cols-3 gap-2 sm:gap-3 md:grid-cols-6 lg:grid-cols-3" />
            </div>

            <div className="min-w-0 border-t border-line pt-10 lg:border-0 lg:pt-0">
              <h2 id="undertone-title" className="font-display text-headline font-normal text-ink">
                Et votre <span className="italic text-brand">sous-ton</span> ?
              </h2>
              <div className="mt-4 flex gap-3.5 rounded-tile bg-paper p-4 ring-1 ring-line">
                <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold/60 text-ink">
                  <Sun size={19} />
                </span>
                <p className="text-[0.95rem] leading-relaxed text-ink/80">
                  Regardez les veines à l&apos;intérieur de votre poignet, à la lumière du jour. <strong className="font-semibold text-ink">Vertes</strong> : plutôt chaud.{" "}
                  <strong className="font-semibold text-ink">Bleues ou violettes</strong> : plutôt froid. <strong className="font-semibold text-ink">Les deux</strong> : neutre.
                </p>
              </div>
              <ChoiceGroup labelledBy="undertone-title" className="mt-5 grid gap-2.5">
                {UNDERTONES.map(([v, label, hint, swatch]) => (
                  <OptionCard key={v} selected={p.undertone === v} onClick={() => set("undertone", v)} title={label} hint={hint} swatch={swatch} />
                ))}
              </ChoiceGroup>
              <div aria-live="polite">
                {p.undertone === "inconnu" && (
                  <p className="mt-4 flex gap-3 rounded-tile bg-brand-soft/60 p-4 text-[0.95rem] leading-relaxed text-ink motion-safe:animate-rise">
                    <Info size={19} aria-hidden="true" className="mt-0.5 shrink-0 text-brand" />
                    Aucun souci. Plus tard, l&apos;analyse par selfie de votre profil pourra vous aider à le trouver.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <StepHeading ref={heading} title="Y a-t-il des ingrédients à éviter ?" hint="Les deux questions sont facultatives. Vous pourrez tout modifier dans votre profil." />
            <div className="mt-9 grid gap-10 md:grid-cols-2 md:gap-12">
              <Section
                variant="plain"
                icon={Info}
                id="allergies-title"
                title="Allergies connues"
                hint="Le nom tel qu'il est écrit sur l'emballage, par exemple linalool ou lanoline."
              >
                <OptionalTag />
                <AllergyEditor allergies={p.allergies} onChange={(v) => set("allergies", v)} inputId="allergy-input" />
              </Section>
              <Section variant="plain" icon={Info} id="avoid-title" title="Ingrédients que vous préférez éviter" hint="Touchez pour sélectionner, plusieurs choix possibles.">
                <OptionalTag />
                <div role="group" aria-labelledby="avoid-title" className="flex flex-wrap gap-2">
                  {AVOIDS.map(([v, label]) => (
                    <Chip key={v} on={p.avoid.includes(v)} onClick={() => set("avoid", toggle(p.avoid, v))}>
                      {label}
                    </Chip>
                  ))}
                </div>
              </Section>
            </div>
            {/* On phones the consent text sits in the pinned bar; leave room for it. */}
            <div aria-hidden="true" className="h-16 md:hidden" />
          </div>
        )}
      </div>

      {/* Outside the animated block: a transformed ancestor would break position: fixed. */}
      <div className={`action-bar ${last ? "md:mt-12" : "md:mt-10"} ${step === 0 ? "md:mx-auto md:max-w-2xl" : ""}`}>
          <div className={`mx-auto max-w-md md:max-w-none ${last ? "md:flex md:items-end md:gap-10" : "md:flex md:justify-end"}`}>
            {last && (
              <p className="mb-3 text-[0.82rem] leading-snug text-ink/75 md:mb-0 md:max-w-xl md:flex-1 md:text-sm md:leading-relaxed">
                En continuant, vous acceptez que ces informations, dont vos allergies et l&apos;état de votre peau, servent à personnaliser vos scores. Elles restent sur votre
                téléphone.{" "}
                <Link href="/confidentialite" className="font-semibold text-brand underline underline-offset-2">
                  Confidentialité
                </Link>
              </p>
            )}
            <button type="button" className="btn-primary w-full text-lg shadow-lift md:w-auto md:shrink-0 md:px-10" onClick={last ? finish : () => setStep(step + 1)}>
              {last ? (
                <>
                  <Check size={20} aria-hidden="true" /> C&apos;est parti
                </>
              ) : (
                <>
                  Continuer <ArrowRight size={20} aria-hidden="true" />
                </>
              )}
            </button>
        </div>
      </div>
    </div>
  );
}

/** The step's question: the page's single <h1>, focusable so focus can land on it after a step change. */
function StepHeading({ ref, title, hint }: { ref: React.Ref<HTMLHeadingElement>; title: string; hint: string }) {
  return (
    <>
      <h1 ref={ref} id="step-title" tabIndex={-1} className="font-display text-headline font-normal text-balance text-ink outline-none sm:text-[2.35rem] sm:leading-[1.1]">
        {title}
      </h1>
      <p className="mt-3 max-w-xl text-[1.02rem] leading-relaxed text-ink/75">{hint}</p>
    </>
  );
}

function OptionalTag() {
  return <p className="eyebrow -mt-1 mb-3 text-ink/70">Facultatif</p>;
}
