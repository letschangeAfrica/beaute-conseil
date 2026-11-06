import Link from "next/link";

export function LegalLinks({ className = "" }: { className?: string }) {
  return (
    <nav aria-label="Informations légales" className={`flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm text-ink/70 ${className}`}>
      <Link href="/confidentialite" className="inline-flex min-h-11 items-center rounded-sm underline-offset-4 hover:text-brand hover:underline">
        Confidentialité
      </Link>
      <Link href="/mentions-legales" className="inline-flex min-h-11 items-center rounded-sm underline-offset-4 hover:text-brand hover:underline">
        Mentions légales
      </Link>
    </nav>
  );
}

/** Long-form page shell for the legal pages. */
export function LegalArticle({ children }: { children: React.ReactNode }) {
  return (
    <article className="space-y-6 leading-relaxed text-ink/85 [&_a]:font-semibold [&_a]:text-brand [&_a]:underline [&_h2]:mb-2 [&_h2]:font-display [&_h2]:text-xl [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_section]:space-y-2 [&_td]:border-t [&_td]:border-caramel/20 [&_td]:p-2 [&_td]:align-top [&_th]:p-2 [&_th]:text-left">
      {children}
      <LegalLinks className="pt-4" />
    </article>
  );
}
