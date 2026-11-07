import Link from "next/link";
import { ArrowRight, Info } from "lucide-react";
import { LegalLinks } from "@/components/LegalLinks";
import { PageHeader } from "@/components/ui";
import { type TocItem, TableOfContents } from "./TableOfContents";

/**
 * Shared shell for long-form legal documents: header with last update, a table of contents
 * (collapsible on phones, sticky beside the text on desktop), the sections, and a footer that
 * links to the other document. Server component.
 */
export function LegalDocument({
  eyebrow,
  title,
  updated,
  lead,
  toc,
  other,
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  updated: string;
  lead?: React.ReactNode;
  toc: TocItem[];
  other: { href: string; label: string; text: string };
  children: React.ReactNode;
}) {
  return (
    <div data-layout="wide" className="lg:grid lg:grid-cols-[15rem_minmax(0,44rem)] lg:justify-center lg:gap-16 print:block">
      <aside className="hidden lg:block print:hidden">
        <div className="sticky top-6 pt-16">
          <TableOfContents items={toc} variant="side" />
        </div>
      </aside>

      <article className="min-w-0">
        <div className="print:hidden">
          <PageHeader title="" back />
        </div>
        <header className="-mt-2">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-2 font-display text-headline font-normal text-ink sm:text-[2.6rem] sm:leading-[1.08]">{title}</h1>
          <p className="mt-3 text-sm text-ink/75">Dernière mise à jour&nbsp;: {updated}</p>
          {lead && <div className="mt-5 max-w-[38rem] text-[1.05rem] leading-relaxed text-ink/85">{lead}</div>}
        </header>

        <div className="mt-6 lg:hidden">
          <TableOfContents items={toc} variant="collapsible" />
        </div>

        <div className="prose-legal mt-10 flex flex-col gap-12 sm:gap-14">{children}</div>

        <footer className="mt-14 border-t border-line pt-8 print:hidden">
          <Link href={other.href} className="card-interactive group flex items-center gap-4 p-5 no-underline">
            <span className="min-w-0 flex-1">
              <span className="eyebrow block">À lire aussi</span>
              <span className="mt-1 block font-display text-[1.25rem] leading-tight text-ink">{other.label}</span>
              <span className="mt-0.5 block text-sm text-ink/75">{other.text}</span>
            </span>
            <ArrowRight size={20} aria-hidden="true" className="shrink-0 text-brand transition-transform group-hover:translate-x-0.5" />
          </Link>
          <LegalLinks className="mt-6" />
        </footer>
      </article>
    </div>
  );
}

/** A linkable section: id for deep links, focusable heading for the table of contents. */
export function LegalSection({ id, title, children }: { id: string; title: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-6">
      <h2 id={`${id}-title`} tabIndex={-1} className="font-display text-[1.55rem] font-normal leading-tight text-ink outline-none focus-visible:outline-2 sm:text-[1.8rem]">
        {title}
      </h2>
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </section>
  );
}

/** Informational callout: calm, not alarming. */
export function Callout({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3.5 rounded-card bg-gold/30 p-5 ring-1 ring-caramel/35">
      <Info size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-caramel-ink" />
      <div className="min-w-0 space-y-2">
        {title && <p className="font-semibold text-ink">{title}</p>}
        {children}
      </div>
    </div>
  );
}

/**
 * A value from LEGAL. While it is still a "[placeholder]", development builds highlight it so it
 * cannot be missed; production renders it as plain text.
 */
export function Fill({ value }: { value: string }) {
  if (process.env.NODE_ENV !== "production" && value.startsWith("["))
    return (
      <mark title="À compléter dans src/lib/legal.ts avant publication" className="rounded bg-warn-soft px-1 font-semibold text-warn ring-1 ring-warn/40">
        {value} <span className="text-xs uppercase tracking-wide">à compléter</span>
      </mark>
    );
  return <>{value}</>;
}

/** French typography for plain strings: no-break spaces before : ; ? ! and inside « », typographic apostrophes. */
export function fr(text: string): string {
  return text
    .replace(/'/g, "’")
    .replace(/\s+([:;?!»])/g, " $1")
    .replace(/«\s+/g, "« ");
}
