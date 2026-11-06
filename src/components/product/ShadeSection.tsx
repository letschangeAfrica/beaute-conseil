import { TONES, UNDERTONES } from "@/components/ProfileFields";
import { ShadeFinder } from "@/components/ShadeFinder";
import type { Product, Profile } from "@/lib/types";

/** Complexion products only: her tone and undertone as swatches, the advice, then the AI shade finder. */
export function ShadeSection({ p, profile, advice }: { p: Product; profile: Profile; advice: string }) {
  const tone = TONES.find(([v]) => v === profile.skinTone);
  const under = UNDERTONES.find(([v]) => v === profile.undertone);
  return (
    <section aria-labelledby="shade-title" className="overflow-hidden rounded-card bg-white shadow-soft ring-1 ring-line">
      <div className="bg-gold/35 p-5 sm:p-6">
        <p className="eyebrow">Votre teinte</p>
        <h2 id="shade-title" className="mt-1.5 font-display text-[1.35rem] leading-tight text-ink">
          Trouver <span className="italic text-brand">la bonne nuance</span>
        </h2>
        <dl className="mt-4 flex flex-wrap gap-3">
          {tone && <Swatch label="Carnation" name={tone[1]} color={tone[2]} />}
          {under && <Swatch label="Sous-ton" name={under[1]} color={under[3]} />}
        </dl>
        <p className="mt-4 text-[0.95rem] leading-relaxed text-ink/80">{advice}</p>
      </div>
      <div className="p-5 sm:p-6">
        <ShadeFinder name={p.name} brand={p.brand} code={p.code} profile={profile} />
      </div>
    </section>
  );
}

function Swatch({ label, name, color }: { label: string; name: string; color: string }) {
  return (
    <div className="flex items-center gap-3 rounded-full bg-white/80 py-1.5 pl-1.5 pr-4 ring-1 ring-line">
      <span aria-hidden="true" className="swatch h-9 w-9" style={{ background: color }} />
      <div>
        <dt className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-ink/70">{label}</dt>
        <dd className="text-sm font-semibold text-ink">{name}</dd>
      </div>
    </div>
  );
}
