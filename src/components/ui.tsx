"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Ban, CircleAlert, Info, LoaderCircle, Sparkles, TriangleAlert } from "lucide-react";
import type { Verdict } from "@/lib/types";

/* ---------- Brand ---------------------------------------------------- */

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="-m-1 inline-flex items-center gap-2 rounded-full p-1" aria-label="Belle, accueil">
      <span
        aria-hidden="true"
        className={`grid h-9 w-9 place-items-center rounded-full font-display text-[1.3rem] italic leading-none ${light ? "bg-cream text-brand" : "bg-brand text-cream"}`}
      >
        B
      </span>
      <span aria-hidden="true" className={`font-display text-[1.55rem] font-medium tracking-tight ${light ? "text-cream" : "text-brand"}`}>
        Belle
      </span>
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
          className="-ml-2 mb-1 inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-sm font-semibold text-ink/75 hover:text-brand"
        >
          <ArrowLeft size={18} aria-hidden="true" /> Retour
        </button>
      )}
      {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
      {title && <h1 className="font-display text-[1.85rem] leading-tight text-ink">{title}</h1>}
      {subtitle && <p className="mt-1.5 text-ink/70">{subtitle}</p>}
    </header>
  );
}

/**
 * Section heading. `display` switches to the Fraunces headline used on editorial pages (home);
 * the default stays compact for dense screens. `id` lets the section use aria-labelledby.
 */
export function SectionTitle({
  icon: Icon,
  children,
  action,
  eyebrow,
  id,
  display = false,
}: {
  icon?: React.ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean | "true" }>;
  children: React.ReactNode;
  action?: React.ReactNode;
  eyebrow?: string;
  id?: string;
  display?: boolean;
}) {
  return (
    <div className={`flex items-end justify-between gap-3 ${display ? "mb-6" : "mb-3"}`}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h2
          id={id}
          className={
            display
              ? "font-display text-headline font-normal text-ink text-balance"
              : "flex items-center gap-2 font-display text-[1.22rem] font-medium leading-snug tracking-tight text-ink"
          }
        >
          {Icon && <Icon size={20} className="shrink-0 text-brand" aria-hidden="true" />}
          {children}
        </h2>
      </div>
      {action && <div className="shrink-0">{action}</div>}
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
    <span className="inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold leading-tight" style={{ color: v.color, background: v.soft }}>
      {verdict === "eviter" && <Ban size={12} strokeWidth={2.75} aria-hidden="true" />}
      {verdict === "excellent" && <Sparkles size={12} strokeWidth={2.5} aria-hidden="true" />}
      {v.label}
    </span>
  );
}
