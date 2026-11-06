import Link from "next/link";
import { ArrowRight, FlaskConical, Search, Sparkles, Tag } from "lucide-react";
import { CreamJarIcon, FoundationIcon, LipstickIcon, MascaraIcon, SunscreenIcon } from "@/components/icons";
import { SKIN_TYPES, TONES } from "@/components/ProfileFields";
import type { Profile } from "@/lib/types";

/** Starters: the four originals, plus two that use the price search and plain explanations. */
export const SUGGESTIONS = [
  {
    text: "Quel fond de teint pour moi à moins de 25 € ?",
    Icon: FoundationIcon,
  },
  {
    text: "Un mascara qui ne coule pas, pour yeux sensibles",
    Icon: MascaraIcon,
  },
  {
    text: "Quelle couleur de rouge à lèvres pour un mariage ?",
    Icon: LipstickIcon,
  },
  { text: "Une routine simple pour peau mixte", Icon: CreamJarIcon },
  {
    text: "Une crème solaire visage légère, au meilleur prix",
    Icon: SunscreenIcon,
  },
  { text: "Que veut dire « non comédogène » ?", Icon: FlaskConical },
];

/** "peau mixte, sensible, carnation medium, allergie au linalool": built only from her saved profile. */
export function profileFacts(p: Profile): string[] {
  const facts: string[] = [];
  const type = SKIN_TYPES.find(([v]) => v === p.skinType)?.[1];
  if (type) facts.push(`peau ${type.toLowerCase()}`);
  if (p.sensitive) facts.push("sensible");
  const tone = TONES.find(([v]) => v === p.skinTone)?.[1];
  if (tone) facts.push(`carnation ${tone.toLowerCase()}`);
  if (p.allergies.length === 1) facts.push(`allergie au ${p.allergies[0]}`);
  else if (p.allergies.length > 1) facts.push(`allergies : ${p.allergies.join(", ")}`);
  if (p.budget) facts.push(`jusqu'à ${p.budget} € par produit`);
  return facts;
}

/** The reminder that Belle answers for *her*, with a link to edit; or an invitation to create a profile. */
export function ProfileSummary({ profile, ready, compact = false }: { profile: Profile | null; ready: boolean; compact?: boolean }) {
  if (!ready) return <div aria-hidden="true" className={compact ? "h-6" : "h-[4.5rem]"} />;
  if (!profile)
    return (
      <Link
        href="/bienvenue"
        className={`group flex items-center gap-3 rounded-card bg-gold/45 ring-1 ring-caramel/40 transition hover:bg-gold/65 ${compact ? "px-3.5 py-2.5 text-sm" : "px-4 py-3.5"}`}
      >
        <Sparkles size={18} aria-hidden="true" className="shrink-0 text-brand" />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-ink">Pour des conseils vraiment personnalisés</span>
          {!compact && <span className="block text-sm text-ink/75">Répondez à 3 questions sur votre peau, en moins d&apos;une minute.</span>}
        </span>
        <ArrowRight size={18} aria-hidden="true" className="shrink-0 text-brand transition-transform group-hover:translate-x-0.5" />
      </Link>
    );
  const facts = profileFacts(profile).join(", ");
  if (compact)
    return (
      <p className="flex min-w-0 items-center gap-2 text-sm text-ink/75">
        <Sparkles size={15} aria-hidden="true" className="shrink-0 text-brand" />
        <span className="min-w-0 truncate">Je connais votre peau : {facts}</span>
        <Link href="/profil" className="inline-flex min-h-11 shrink-0 items-center px-1 font-semibold text-brand underline underline-offset-2">
          Modifier
        </Link>
      </p>
    );
  return (
    <div className="rounded-card bg-white p-4 ring-1 ring-line">
      <p className="eyebrow">Votre profil</p>
      <p className="mt-1.5 leading-relaxed text-ink">
        Je connais votre peau : <span className="font-semibold">{facts}</span>.
      </p>
      <Link href="/profil" className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-brand underline underline-offset-2">
        Modifier mon profil
      </Link>
    </div>
  );
}

const CAN_DO = [
  { Icon: Search, text: "Trouver des produits notés pour votre peau" },
  { Icon: Tag, text: "Comparer les prix en ligne, en euros" },
  { Icon: FlaskConical, text: "Expliquer un ingrédient ou une étiquette" },
];

/** The empty conversation: a warm welcome, what Belle can do, and the starters. */
export function ChatEmpty({ name, onPick, showSuggestions = true }: { name?: string; onPick: (text: string) => void; showSuggestions?: boolean }) {
  return (
    <div className="flex flex-col gap-6 motion-safe:animate-rise">
      <div className="rounded-panel bg-white p-5 shadow-soft ring-1 ring-line sm:p-6">
        <p className="font-display text-[1.5rem] leading-tight text-ink">
          Bonjour{name ? ` ${name}` : ""}, <span className="italic text-brand">que puis-je faire pour vous ?</span>
        </p>
        <p className="mt-2 leading-relaxed text-ink/75">Je vous aide à choisir des produits adaptés à votre peau et à trouver le meilleur prix.</p>
        <ul className="mt-4 grid gap-2.5 sm:grid-cols-3">
          {CAN_DO.map(({ Icon, text }) => (
            <li key={text} className="flex items-start gap-2.5 text-sm leading-snug text-ink/80 sm:flex-col sm:gap-2">
              <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
                <Icon size={16} />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </div>

      {showSuggestions && (
        <section aria-labelledby="suggest-title">
          <h2 id="suggest-title" className="eyebrow">
            Pour commencer
          </h2>
          <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {SUGGESTIONS.map(({ text, Icon }) => (
              <li key={text}>
                <SuggestionButton text={text} Icon={Icon} onPick={onPick} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export function SuggestionButton({ text, Icon, onPick }: { text: string; Icon: (typeof SUGGESTIONS)[number]["Icon"]; onPick: (t: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onPick(text)}
      className="card-interactive group flex h-full w-full items-center gap-3 p-3 text-left text-[0.95rem] font-semibold text-ink"
    >
      <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand transition-colors group-hover:bg-gold/70">
        <Icon size={20} />
      </span>
      <span className="min-w-0 flex-1">{text}</span>
    </button>
  );
}
