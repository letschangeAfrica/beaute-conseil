import Link from "next/link";

/** "Confidentialité · Mentions légales" footer links (Home, profile, legal pages). */
export function LegalLinks({ className = "" }: { className?: string }) {
  return (
    <nav aria-label="Informations légales" className={`flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm text-ink/70 print:hidden ${className}`}>
      <Link href="/confidentialite" className="inline-flex min-h-11 items-center rounded-sm underline-offset-4 hover:text-brand hover:underline">
        Confidentialité
      </Link>
      <Link href="/mentions-legales" className="inline-flex min-h-11 items-center rounded-sm underline-offset-4 hover:text-brand hover:underline">
        Mentions légales
      </Link>
    </nav>
  );
}

/**
 * Former long-form shell, kept for compatibility. The legal pages now use LegalDocument
 * (src/components/legal/LegalDocument.tsx); this applies the same prose style.
 */
export function LegalArticle({ children }: { children: React.ReactNode }) {
  return (
    <article className="prose-legal flex flex-col gap-10">
      {children}
      <LegalLinks className="pt-4" />
    </article>
  );
}
