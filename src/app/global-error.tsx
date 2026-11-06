"use client";
import { useEffect } from "react";
import "./globals.css";

/** Last resort when the root layout itself fails: it replaces the whole page, so it renders <html>. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="fr">
      <body className="bg-cream font-sans text-ink antialiased">
        <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-5 px-6" role="alert">
          <p className="font-display text-3xl italic text-brand">Belle</p>
          <h1 className="font-display text-3xl leading-tight">L&apos;application a rencontré un problème</h1>
          <p className="text-ink/70">Rechargez la page. Si cela continue, revenez dans quelques minutes.</p>
          <div className="flex gap-2">
            <button onClick={reset} className="btn-primary">
              Réessayer
            </button>
            {/* Plain <a>: a full reload is the point here. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" className="btn-secondary">
              Accueil
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
