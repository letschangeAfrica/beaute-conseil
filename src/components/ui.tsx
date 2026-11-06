"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CircleAlert, Info, LoaderCircle, TriangleAlert } from "lucide-react";
import type { Verdict } from "@/lib/types";

/* ---------- Brand ---------------------------------------------------- */

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-2" aria-label="Belle, accueil">
      <span
        className={`grid h-9 w-9 place-items-center rounded-full font-display text-xl italic leading-none ${light ? "bg-cream text-brand" : "bg-brand text-cream"}`}
      >
        B
      </span>
      <span className={`font-display text-2xl tracking-tight ${light ? "text-cream" : "text-brand"}`}>Belle</span>
    </Link>
  );
}

/* ---------- Layout ----------------------------------------------------- */

export function PageHeader({ title, subtitle, back = false, eyebrow }: { title: string; subtitle?: string; back?: boolean; eyebrow?: string }) {
  const router = useRouter();
  return (
    <header className="mb-5">
      {back && (
        <button
          onClick={() => router.back()}
          className="-ml-2 mb-2 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm font-semibold text-ink/70 hover:text-brand"
        >
          <ArrowLeft size={18} /> Retour
        </button>
      )}
      {eyebrow && <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-caramel">{eyebrow}</p>}
      {title && <h1 className="font-display text-[1.85rem] leading-tight text-ink">{title}</h1>}
      {subtitle && <p className="mt-1.5 text-ink/70">{subtitle}</p>}
    </header>
  );
}

export function SectionTitle({ icon: Icon, children, action }: { icon?: React.ComponentType<{ size?: number; className?: string }>; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-[1.05rem] font-bold text-ink">
        {Icon && <Icon size={20} className="text-brand" />}
        {children}
      </h2>
      {action}
    </div>
  );
}

/* ---------- Feedback ------------------------------------------------- */

const NOTICE = {
  info: { Icon: Info, cls: "bg-gold/45 text-ink ring-caramel/40" },
  warn: { Icon: TriangleAlert, cls: "bg-gold/70 text-ink ring-caramel/60" },
  error: { Icon: CircleAlert, cls: "bg-danger-soft text-danger ring-danger/25" },
};

export function Notice({ kind = "info", children }: { kind?: keyof typeof NOTICE; children: React.ReactNode }) {
  const { Icon, cls } = NOTICE[kind];
  return (
    <div className={`flex gap-3 rounded-2xl p-3.5 text-sm leading-relaxed ring-1 ${cls}`} role={kind === "error" ? "alert" : undefined}>
      <Icon size={18} className="mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LoaderCircle size={18} className="animate-spin" />
      {label}
    </span>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-caramel/20 ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="card flex items-center gap-3 p-3">
      <Skeleton className="h-18 w-18" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      <Skeleton className="h-14 w-14 rounded-full" />
    </div>
  );
}

/* ---------- Score ---------------------------------------------------- */

export const VERDICT: Record<Verdict, { label: string; color: string; soft: string }> = {
  excellent: { label: "Excellent pour vous", color: "var(--color-good)", soft: "var(--color-good-soft)" },
  bon: { label: "Bon choix", color: "var(--color-fair)", soft: "var(--color-fair-soft)" },
  moyen: { label: "Moyen", color: "var(--color-warn)", soft: "var(--color-warn-soft)" },
  eviter: { label: "À éviter", color: "var(--color-danger)", soft: "var(--color-danger-soft)" },
  inconnu: { label: "Infos insuffisantes", color: "var(--color-muted)", soft: "var(--color-muted-soft)" },
};

export function ScoreRing({ score, verdict, size = 60 }: { score: number; verdict: Verdict; size?: number }) {
  const v = VERDICT[verdict];
  const stroke = size > 80 ? 7 : 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = verdict === "inconnu" ? 0 : score / 100;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} aria-label={`Score ${score} sur 100 : ${v.label}`} role="img">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill={v.soft} stroke={v.soft} strokeWidth={stroke} />
        {pct > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={v.color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${c * pct} ${c}`}
          />
        )}
      </svg>
      <span className="absolute inset-0 grid place-items-center font-bold tabular-nums" style={{ color: v.color, fontSize: size * 0.32 }}>
        {verdict === "inconnu" ? "–" : score}
      </span>
    </div>
  );
}

export function VerdictPill({ verdict }: { verdict: Verdict }) {
  const v = VERDICT[verdict];
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold" style={{ color: v.color, background: v.soft }}>
      {v.label}
    </span>
  );
}
