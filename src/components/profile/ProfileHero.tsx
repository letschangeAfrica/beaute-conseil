import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { profileFacts } from "@/components/chat/ChatEmpty";
import { TONES, UNDERTONES } from "@/components/ProfileFields";
import type { Profile } from "@/lib/types";

/**
 * The beauty ID card: who Belle thinks she is, built only from the SAVED profile.
 * Without one, a warm invitation to the 3-question flow.
 */
export function ProfileHero({ saved, ready }: { saved: Profile | null; ready: boolean }) {
  if (!ready) return <div aria-hidden="true" className="h-56 animate-pulse rounded-panel bg-caramel/20" />;

  if (!saved)
    return (
      <div className="rounded-panel bg-gold/45 p-6 ring-1 ring-caramel/40 sm:p-7">
        <p className="eyebrow">Profil beauté</p>
        <p className="mt-2 font-display text-[1.5rem] leading-tight text-ink">
          Faisons <span className="italic text-brand">connaissance.</span>
        </p>
        <p className="mt-2 leading-relaxed text-ink/80">
          Chaque score de Belle dépend de votre profil. Remplissez cette page, ou répondez d&apos;abord à 3 questions en moins d&apos;une minute.
        </p>
        <Link href="/bienvenue" className="btn-primary mt-4">
          <Sparkles size={18} aria-hidden="true" /> Les 3 questions
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </div>
    );

  const tone = TONES.find(([v]) => v === saved.skinTone);
  const under = UNDERTONES.find(([v]) => v === saved.undertone);
  // The card shows how many allergies, not the list (the full list lives in « Ce que j'évite »).
  const n = saved.allergies.length;
  const facts = profileFacts(saved)
    .filter((f) => !f.startsWith("allergie"))
    .concat(n ? [`${n} allergie${n > 1 ? "s" : ""}`] : []);

  return (
    <div className="relative overflow-hidden rounded-panel bg-brand p-6 text-cream shadow-lift sm:p-7 lg:p-8">
      <span aria-hidden="true" className="pointer-events-none absolute -right-6 -top-10 font-display text-[9rem] italic leading-none text-cream/[0.07] md:text-[12rem]">
        B
      </span>
      {/* Wide screens: identity on the left, what Belle knows on the right. */}
      <div className="relative grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:gap-10">
        <div className="min-w-0">
          <p className="eyebrow text-gold">Votre carte beauté</p>
          <p className="mt-2 break-words font-display text-[1.8rem] leading-tight lg:text-[2.1rem]">{saved.name || "Votre peau, selon Belle"}</p>
          <dl className="mt-5 flex flex-wrap gap-2.5">
            {tone && <Swatch label="Carnation" name={tone[1]} color={tone[2]} />}
            {under && <Swatch label="Sous-ton" name={under[1]} color={under[3]} />}
          </dl>
        </div>
        <div className="min-w-0 md:border-l md:border-cream/20 md:pl-10">
          <p className="text-sm font-semibold text-cream/85">Ce que Belle sait de vous</p>
          <ul aria-label="Ce que Belle sait de vous" className="mt-3 flex flex-wrap gap-2">
            {facts.map((f) => (
              <li key={f} className="max-w-full break-words rounded-full bg-cream/12 px-3 py-1.5 text-sm font-semibold ring-1 ring-cream/25">
                {f}
              </li>
            ))}
            {saved.avoid.length > 0 && (
              <li className="rounded-full bg-cream/12 px-3 py-1.5 text-sm font-semibold ring-1 ring-cream/25">
                {saved.avoid.length} ingrédient{saved.avoid.length > 1 ? "s" : ""} évité{saved.avoid.length > 1 ? "s" : ""}
              </li>
            )}
          </ul>
          <p className="mt-4 text-sm text-cream/85">Tous vos scores sont calculés à partir de ce profil.</p>
        </div>
      </div>
    </div>
  );
}

function Swatch({ label, name, color }: { label: string; name: string; color: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-full bg-cream py-1.5 pl-1.5 pr-4 text-ink">
      <span aria-hidden="true" className="swatch h-8 w-8" style={{ background: color }} />
      <div>
        <dt className="text-[0.66rem] font-bold uppercase tracking-[0.12em] text-ink/70">{label}</dt>
        <dd className="text-sm font-semibold leading-tight">{name}</dd>
      </div>
    </div>
  );
}
