"use client";
import { useEffect } from "react";
import "./globals.css";

/**
 * Last resort when the root layout itself fails: it replaces the whole document, so it renders
 * <html> and relies on nothing from the layout (no next/font, Providers or BottomNav): plain HTML
 * and the globals.css tokens only. Headings fall back to Georgia.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="fr">
      {/* No next/font here: define the font variables so headings fall back to Georgia, text to the system font. */}
      <body
        className="bg-cream font-sans text-ink antialiased"
        style={{ "--font-heading": "Georgia, serif", "--font-body": "ui-sans-serif, system-ui, sans-serif" } as React.CSSProperties}
      >
        <main className="relative mx-auto flex min-h-dvh max-w-md flex-col justify-center overflow-hidden px-6 py-10">
          <span aria-hidden="true" className="pointer-events-none absolute -right-10 top-1/2 -translate-y-1/2 select-none font-display text-[18rem] italic leading-none text-brand/[0.06]">
            B
          </span>
          <div className="relative" role="alert">
            <p className="flex items-center gap-2">
              <span aria-hidden="true" className="grid h-9 w-9 place-items-center rounded-full bg-brand font-display text-xl italic text-cream">
                B
              </span>
              <span className="font-display text-2xl text-brand">Belle</span>
            </p>
            <p className="eyebrow mt-10">Un souci technique</p>
            <h1 className="mt-2 font-display text-[2rem] leading-tight">
              L&apos;application a rencontré <span className="italic text-brand">un problème</span>
            </h1>
            <p className="mt-3 leading-relaxed text-ink/75">Ce n&apos;est pas de votre faute. Rechargez la page&nbsp;; si cela continue, revenez dans quelques minutes.</p>
            {error.digest && <p className="mt-3 text-sm text-ink/70">Référence&nbsp;: {error.digest}</p>}
            <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
              <button type="button" onClick={reset} className="btn-primary">
                Réessayer
              </button>
              {/* Plain <a>: a full reload is the point here. */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/" className="btn-secondary">
                Retour à l&apos;accueil
              </a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
