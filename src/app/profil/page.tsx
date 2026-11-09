"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Droplets, MapPin, Palette, ShieldAlert, Trash2, UserRound, Wallet } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { AccountCard } from "@/components/AccountCard";
import { deleteAccountCopy } from "@/components/SyncManager";
import { LegalLinks } from "@/components/LegalLinks";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { ConfirmDialog, type NavItem, SaveBar, SectionNav, useActiveSection } from "@/components/profile/ProfileParts";
import { SelfieAnalysis } from "@/components/profile/SelfieAnalysis";
import { DEFAULT_PROFILE, clearLocalData, useProfile, useSelfieConsent } from "@/lib/useLocal";
import type { Profile, ShadeAnalysis } from "@/lib/types";
import { AVOIDS, AllergyEditor, CONCERNS, ChoiceGroup, Chip, OptionCard, PREFS, SKIN_TYPES, Section, SensitiveToggle, ToneGrid, UNDERTONES, toggle } from "@/components/ProfileFields";
import { PROFILE_LIMITS } from "@/lib/types";
import { resizeImage } from "@/lib/image";
import { errorMessage, postJson } from "@/lib/utils";

const GROUPS: NavItem[] = [
  { id: "teint", label: "Mon teint", Icon: Palette },
  { id: "peau", label: "Ma peau", Icon: Droplets },
  { id: "evite", label: "Ce que j'évite", Icon: ShieldAlert },
  { id: "achats", label: "Mes achats", Icon: Wallet },
  { id: "compte", label: "Compte et données", Icon: UserRound },
];
const GROUP_IDS = GROUPS.map((g) => g.id);

const DELETE_TEXT = "Effacer votre profil, vos favoris, la conversation et vos consentements, et vous déconnecter ? La copie enregistrée dans votre compte sera aussi supprimée.";

/** Order-independent snapshot of a profile (object keys sorted at every level, undefined dropped). */
function canon(v: unknown): string {
  return JSON.stringify(v, (_k, x) =>
    x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b))) : x,
  );
}

export default function ProfilPage() {
  const [saved, save, ready] = useProfile();
  const [p, setP] = useState<Profile>(DEFAULT_PROFILE);
  const [shadeState, setShadeState] = useState<"idle" | "loading" | "error">("idle");
  const [shadeError, setShadeError] = useState("");
  const { data: session } = useSession();
  const [consent, setConsent] = useSelfieConsent();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [announce, setAnnounce] = useState("");
  const active = useActiveSection(GROUP_IDS);

  async function deleteAllData() {
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

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => {
    setJustSaved(false);
    setP((prev) => ({ ...prev, [k]: v }));
  };

  async function analyzeSelfie(file: File) {
    setShadeState("loading");
    setShadeError("");
    setAnnounce("Analyse de votre photo en cours.");
    try {
      const { data, mediaType } = await resizeImage(file);
      const a = await postJson<ShadeAnalysis>("/api/shade", { image: data, mediaType, consent: Boolean(consent) });
      setJustSaved(false);
      setP((prev) => ({ ...prev, skinTone: a.skinTone, undertone: a.undertone, shadeAdvice: a }));
      setShadeState("idle");
      setAnnounce("Analyse terminée. Votre carnation et votre sous-ton ont été mis à jour. Pensez à enregistrer.");
    } catch (e) {
      const msg = errorMessage(e);
      setShadeError(msg);
      setShadeState("error");
      setAnnounce(`L'analyse a échoué. ${msg}`);
    }
  }

  // Unsaved changes: the save bar shows, and leaving the page asks first.
  const isNew = ready && !saved;
  const dirty = useMemo(() => ready && (!saved || canon(p) !== canon({ ...DEFAULT_PROFILE, ...saved })), [ready, saved, p]);
  useEffect(() => {
    if (!dirty || isNew) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, isNew]);

  function onSave() {
    save(p);
    setJustSaved(true);
    setAnnounce("Profil enregistré. Vos scores en tiennent compte.");
  }
  useEffect(() => {
    if (!justSaved) return;
    const t = window.setTimeout(() => setJustSaved(false), 3000);
    return () => window.clearTimeout(t);
  }, [justSaved]);

  const consentSentence = (
    <p className="text-sm leading-relaxed text-ink/75">
      En enregistrant, vous acceptez que ces informations, dont vos allergies et l&apos;état de votre peau, servent à personnaliser les scores et les conseils. Elles restent sur votre
      téléphone et ne sont jamais conservées sur nos serveurs.{" "}
      <Link href="/confidentialite" className="font-semibold text-brand underline underline-offset-2">
        Politique de confidentialité
      </Link>
    </p>
  );

  return (
    <div data-layout="wide" className="lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start lg:gap-12 xl:grid-cols-[18rem_minmax(0,48rem)] xl:justify-center xl:gap-16">
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>

      {/* Left (desktop): title, then one compact sticky card with the sections and the save action. */}
      <aside className="flex flex-col gap-6 lg:sticky lg:top-6">
        <header>
          <p className="eyebrow">Profil beauté</p>
          <h1 className="mt-2 font-display text-headline font-normal text-ink lg:text-[1.9rem] lg:leading-[1.1]">
            Parlez-nous <span className="whitespace-nowrap italic text-brand">de vous</span>
          </h1>
          <p className="mt-2 leading-relaxed text-ink/75 lg:text-[0.95rem]">Vos réponses restent sur votre téléphone. Chaque score de Belle en dépend.</p>
        </header>
        <div className="hidden lg:block">
          <SectionNav
            items={GROUPS}
            active={active}
            variant="side"
            footer={<SaveBar dirty={dirty} justSaved={justSaved} onSave={onSave} isNew={isNew} variant="inline" />}
          />
        </div>
      </aside>

      {/* Right: the beauty ID card, then the groups. */}
      <div className="mt-6 flex min-w-0 flex-col gap-section lg:mt-0">
        <div className="flex flex-col gap-6">
          <ProfileHero saved={saved} ready={ready} />
          <div className="lg:hidden">
            <SectionNav items={GROUPS} active={active} variant="chips" />
          </div>
        </div>

        <Group id="teint" title="Mon teint" intro="Pour les fonds de teint, correcteurs et poudres.">
          <SelfieAnalysis consent={consent} onConsent={() => setConsent(new Date().toISOString())} state={shadeState} error={shadeError} onFile={analyzeSelfie} advice={p.shadeAdvice} />
          <Section variant="plain" level={3} icon={UserRound} id="tone-title" title="Votre carnation" hint="La couleur de votre peau, sur la joue, à la lumière du jour.">
            <ToneGrid value={p.skinTone} onChange={(v) => set("skinTone", v)} labelledBy="tone-title" />
          </Section>
          <Section variant="plain" level={3} icon={UserRound} id="under-title" title="Votre sous-ton" hint="Regardez les veines de votre poignet à la lumière du jour.">
            <ChoiceGroup labelledBy="under-title" className="grid gap-2.5 sm:grid-cols-2">
              {UNDERTONES.map(([v, label, hint, swatch]) => (
                <OptionCard key={v} selected={p.undertone === v} onClick={() => set("undertone", v)} title={label} hint={hint} swatch={swatch} />
              ))}
            </ChoiceGroup>
          </Section>
        </Group>

        <Group id="peau" title="Ma peau">
          <Section variant="plain" level={3} icon={UserRound} id="type-title" title="Votre type de peau">
            <ChoiceGroup labelledBy="type-title" className="grid gap-2.5 sm:grid-cols-2">
              {SKIN_TYPES.map(([v, label, hint]) => (
                <OptionCard key={v} selected={p.skinType === v} onClick={() => set("skinType", v)} title={label} hint={hint} />
              ))}
            </ChoiceGroup>
            <SensitiveToggle checked={p.sensitive} onChange={(v) => set("sensitive", v)} hint="Rougeurs, picotements ou réactions fréquentes." />
          </Section>
          <Section variant="plain" level={3} icon={UserRound} id="concerns-title" title="Vos préoccupations" hint="Plusieurs choix possibles.">
            <div role="group" aria-labelledby="concerns-title" className="flex flex-wrap gap-2">
              {CONCERNS.map(([v, label]) => (
                <Chip key={v} on={p.concerns.includes(v)} onClick={() => set("concerns", toggle(p.concerns, v))}>
                  {label}
                </Chip>
              ))}
            </div>
          </Section>
        </Group>

        <Group id="evite" title="Ce que j'évite">
          {/* Safety first: allergies get the danger treatment. */}
          <section aria-labelledby="allergies-title" className="rounded-card bg-danger-soft/50 p-5 ring-1 ring-danger/20 sm:p-6">
            <h3 id="allergies-title" className="flex items-center gap-2.5 font-display text-[1.2rem] leading-tight text-ink">
              <ShieldAlert size={21} aria-hidden="true" className="shrink-0 text-danger" /> Allergies connues
            </h3>
            <p className="mt-2 text-[0.95rem] leading-relaxed text-ink/80">
              Le nom de l&apos;ingrédient tel qu&apos;il est écrit sur l&apos;emballage, par exemple linalool ou lanolin. Les produits qui en contiennent sont signalés{" "}
              <strong className="font-semibold text-danger">« À éviter »</strong>, avec une alerte.
            </p>
            <div className="mt-4">
              <AllergyEditor allergies={p.allergies} onChange={(v) => set("allergies", v)} />
            </div>
          </section>
          <Section variant="plain" level={3} icon={UserRound} id="avoid-title" title="Ingrédients à éviter" hint="Les produits qui en contiennent perdront des points.">
            <div role="group" aria-labelledby="avoid-title" className="flex flex-wrap gap-2">
              {AVOIDS.map(([v, label]) => (
                <Chip key={v} on={p.avoid.includes(v)} onClick={() => set("avoid", toggle(p.avoid, v))}>
                  {label}
                </Chip>
              ))}
            </div>
          </Section>
          <Section variant="plain" level={3} icon={UserRound} id="prefs-title" title="Mes préférences">
            <div role="group" aria-labelledby="prefs-title" className="flex flex-wrap gap-2">
              {PREFS.map(([v, label]) => (
                <Chip key={v} on={p.prefs.includes(v)} onClick={() => set("prefs", toggle(p.prefs, v))}>
                  {label}
                </Chip>
              ))}
            </div>
          </Section>
        </Group>

        <Group id="achats" title="Mes achats">
          <BudgetField value={p.budget} onChange={(v) => set("budget", v)} />
          <div>
            <label htmlFor="city" className="font-display text-[1.15rem] leading-snug text-ink">
              Votre ville
            </label>
            <p className="mt-1 text-[0.95rem] text-ink/70">Pour les prix relevés près de chez vous.</p>
            <div className="relative mt-3">
              <MapPin size={18} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/60" />
              <input id="city" maxLength={PROFILE_LIMITS.cityChars} className="input pl-11" value={p.city ?? ""} onChange={(e) => set("city", e.target.value)} placeholder="Ex. Lyon" autoComplete="address-level2" />
            </div>
          </div>
          {consentSentence}
        </Group>

        <Group id="compte" title="Compte et données">
          <div>
            <label htmlFor="name" className="font-display text-[1.15rem] leading-snug text-ink">
              Votre prénom <span className="font-sans text-sm text-ink/70">(facultatif)</span>
            </label>
            <p className="mt-1 text-[0.95rem] text-ink/70">Pour que Belle vous salue par votre prénom.</p>
            <input id="name" className="input mt-3" value={p.name ?? ""} onChange={(e) => set("name", e.target.value)} placeholder="Ex. Marie" autoComplete="given-name" />
          </div>

          <AccountCard />

          {/* Danger zone: separated and calm, clearly destructive. */}
          <section aria-labelledby="data-title" className="rounded-card border border-dashed border-danger/35 p-5 sm:p-6">
            <h3 id="data-title" className="font-display text-[1.2rem] leading-tight text-ink">
              Vos données
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ink/75">
              Efface votre profil, vos favoris, la conversation et vos consentements (sur ce téléphone et dans votre compte), et vous déconnecte.
            </p>
            <button type="button" onClick={() => setConfirmOpen(true)} className="btn mt-4 w-full bg-danger-soft text-danger ring-1 ring-danger/25 hover:bg-danger hover:text-white sm:w-auto">
              <Trash2 size={18} aria-hidden="true" /> Supprimer mes données
            </button>
          </section>

          <LegalLinks />
        </Group>

        {/* Room for the floating save bar (phones, tablets, small laptops). */}
        <div aria-hidden="true" className={`lg:hidden ${dirty || justSaved ? "h-16" : "h-0"}`} />
      </div>

      <SaveBar dirty={dirty} justSaved={justSaved} onSave={onSave} isNew={isNew} variant="floating" />

      <ConfirmDialog
        open={confirmOpen}
        title="Supprimer vos données ?"
        text={DELETE_TEXT}
        confirmLabel="Supprimer"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          deleteAllData();
        }}
      />
    </div>
  );
}

/* ---------- Pieces ---------- */

function Group({ id, title, intro, children }: { id: string; title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-20 lg:scroll-mt-8">
      <h2 id={`${id}-title`} tabIndex={-1} className="font-display text-headline font-normal text-ink outline-none focus-visible:outline-2">
        {title}
      </h2>
      {intro && <p className="mt-1 text-ink/70">{intro}</p>}
      <div className="mt-6 flex flex-col gap-8">{children}</div>
    </section>
  );
}

/** Slider with the value in display type and its value in words, plus a typed alternative. */
function BudgetField({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [typed, setTyped] = useState(String(value));
  useEffect(() => setTyped(String(value)), [value]);
  const commit = () => {
    const n = Math.round(Number(typed.replace(",", ".")) / 5) * 5;
    const v = Number.isFinite(n) && n > 0 ? Math.min(100, Math.max(5, n)) : value;
    onChange(v);
    setTyped(String(v));
  };
  return (
    <div className="card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <label htmlFor="budget" className="flex items-center gap-2 font-display text-[1.15rem] leading-snug text-ink">
            <Wallet size={19} aria-hidden="true" className="text-brand" /> Budget maximum par produit
          </label>
          <p className="mt-1 text-sm text-ink/70">Les produits plus chers perdent des points.</p>
        </div>
        <p className="shrink-0 font-display text-[2.2rem] leading-none tabular-nums text-brand" aria-hidden="true">
          {value} €
        </p>
      </div>
      <input
        id="budget"
        type="range"
        min={5}
        max={100}
        step={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={`${value} euros`}
        className="mt-5 h-11 w-full cursor-pointer accent-brand"
      />
      <div className="flex justify-between text-sm text-ink/70" aria-hidden="true">
        <span>5 €</span>
        <span>100 €</span>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <label htmlFor="budget-typed" className="text-sm text-ink/75">
          Ou saisissez un montant
        </label>
        <div className="relative w-28">
          <input
            id="budget-typed"
            inputMode="numeric"
            className="input pr-9 text-right tabular-nums"
            value={typed}
            onChange={(e) => setTyped(e.target.value.replace(/[^\d,.]/g, ""))}
            onBlur={commit}
            onKeyDown={(e) => e.key === "Enter" && commit()}
          />
          <span aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink/70">
            €
          </span>
        </div>
      </div>
    </div>
  );
}
