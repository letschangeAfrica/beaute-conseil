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
  ShieldAlert,
  Sparkles,
  Target,
  Trash2,
  UserRound,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { AccountCard } from "@/components/AccountCard";
import { deleteAccountCopy } from "@/components/SyncManager";
import { LegalLinks } from "@/components/LegalLinks";
import { Notice, PageHeader, Spinner } from "@/components/ui";
import { DEFAULT_PROFILE, clearLocalData, useProfile, useSelfieConsent } from "@/lib/useLocal";
import type { Profile, ShadeAnalysis } from "@/lib/types";
import { AVOIDS, AllergyEditor, CONCERNS, ChoiceGroup, Chip, OptionCard, PREFS, SKIN_TYPES, Section, SensitiveToggle, ToneGrid, UNDERTONES, toggle } from "@/components/ProfileFields";
import { resizeImage } from "@/lib/image";
import { errorMessage, postJson } from "@/lib/utils";

export default function ProfilPage() {
  const [saved, save, ready] = useProfile();
  const [p, setP] = useState<Profile>(DEFAULT_PROFILE);
  const [shadeState, setShadeState] = useState<"idle" | "loading" | "error">("idle");
  const [shadeError, setShadeError] = useState("");
  const router = useRouter();
  const { data: session } = useSession();
  const [consent, setConsent] = useSelfieConsent();
  const [consentBox, setConsentBox] = useState(false);

  async function deleteAllData() {
    if (!window.confirm("Effacer votre profil, vos favoris, la conversation et vos consentements, et vous déconnecter ? La copie enregistrée dans votre compte sera aussi supprimée.")) return;
    if (session) await deleteAccountCopy();
    clearLocalData();
    try {
      if (session) await signOut({ redirect: false });
    } finally {
      window.location.href = "/"; // local data is already gone: always leave the page, even if sign-out failed
    }
  }

  useEffect(() => {
    if (ready && saved) setP({ ...DEFAULT_PROFILE, ...saved });
  }, [ready, saved]);

  // Pre-fill the first name from the Google account, without overwriting one she typed.
  const googleName = session?.user?.name?.split(" ")[0];
  useEffect(() => {
    if (ready && googleName && !saved?.name) setP((prev) => (prev.name ? prev : { ...prev, name: googleName }));
  }, [ready, saved?.name, googleName]);

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((prev) => ({ ...prev, [k]: v }));

  async function analyzeSelfie(file: File) {
    setShadeState("loading");
    setShadeError("");
    try {
      const { data, mediaType } = await resizeImage(file);
      const a = await postJson<ShadeAnalysis>("/api/shade", { image: data, mediaType, consent: Boolean(consent) });
      setP((prev) => ({ ...prev, skinTone: a.skinTone, undertone: a.undertone, shadeAdvice: a }));
      setShadeState("idle");
    } catch (e) {
      setShadeError(errorMessage(e));
      setShadeState("error");
    }
  }

  function onSave() {
    save(p);
    router.push("/");
  }

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Profil beauté" title="Parlez-nous de vous" subtitle="Deux minutes pour des conseils faits pour vous. Vos réponses restent sur votre téléphone." />

      <AccountCard />

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
          {!consent ? (
            <div className="mt-4 rounded-2xl bg-cream/10 p-4 ring-1 ring-cream/25">
              <label className="flex cursor-pointer gap-3 text-sm leading-relaxed">
                <input type="checkbox" checked={consentBox} onChange={(e) => setConsentBox(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-gold" />
                <span>
                  J&apos;accepte que ma photo soit envoyée à Anthropic (États-Unis), le service d&apos;intelligence artificielle utilisé par Belle, uniquement pour analyser ma carnation. Belle
                  ne conserve pas la photo. Je peux retirer mon accord à tout moment en supprimant mes données.{" "}
                  <Link href="/confidentialite" className="font-semibold text-gold underline">
                    En savoir plus
                  </Link>
                </span>
              </label>
              <button className="btn mt-3 w-full bg-cream text-brand hover:bg-gold disabled:opacity-50" disabled={!consentBox} onClick={() => setConsent(new Date().toISOString())}>
                Continuer
              </button>
            </div>
          ) : (
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
          )}
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
        <ToneGrid value={p.skinTone} onChange={(v) => set("skinTone", v)} />
      </Section>

      <Section icon={Palette} title="Votre sous-ton" hint="Regardez les veines de votre poignet à la lumière du jour.">
        <ChoiceGroup label="Votre sous-ton">
          {UNDERTONES.map(([v, label, hint, swatch]) => (
            <OptionCard key={v} selected={p.undertone === v} onClick={() => set("undertone", v)} title={label} hint={hint} swatch={swatch} />
          ))}
        </ChoiceGroup>
      </Section>

      <Section icon={Droplets} title="Votre type de peau">
        <ChoiceGroup label="Votre type de peau">
          {SKIN_TYPES.map(([v, label, hint]) => (
            <OptionCard key={v} selected={p.skinType === v} onClick={() => set("skinType", v)} title={label} hint={hint} />
          ))}
        </ChoiceGroup>
        <SensitiveToggle checked={p.sensitive} onChange={(v) => set("sensitive", v)} />
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
        <AllergyEditor allergies={p.allergies} onChange={(v) => set("allergies", v)} />
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

      <p className="px-1 text-sm leading-relaxed text-ink/65">
        En enregistrant, vous acceptez que ces informations, dont vos allergies et l&apos;état de votre peau, servent à personnaliser les scores et les conseils. Elles restent sur votre
        téléphone et ne sont jamais conservées sur nos serveurs.{" "}
        <Link href="/confidentialite" className="font-semibold text-brand underline">
          Politique de confidentialité
        </Link>
      </p>

      <div className="sticky bottom-24 z-10 pt-2">
        <button className="btn-primary w-full text-lg shadow-lift" onClick={onSave}>
          <Check size={20} /> Enregistrer mon profil
        </button>
      </div>

      <section className="card mt-6 p-5">
        <h2 className="font-bold">Vos données</h2>
        <p className="mt-1 text-sm text-ink/60">Efface votre profil, vos favoris, la conversation et vos consentements (sur ce téléphone et dans votre compte), et vous déconnecte.</p>
        <button onClick={deleteAllData} className="btn mt-3 w-full bg-danger-soft text-danger ring-1 ring-danger/25 hover:bg-danger hover:text-white">
          <Trash2 size={18} /> Supprimer mes données
        </button>
      </section>

      <LegalLinks className="pt-2" />
    </div>
  );
}
