"use client";
import { useEffect } from "react";
import Link from "next/link";
import { House, RotateCcw } from "lucide-react";
import { Logo } from "@/components/ui";

/** Shown when a page crashes. The bottom navigation stays usable. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[70dvh] flex-col justify-center gap-6" role="alert">
      <Logo />
      <div>
        <h1 className="font-display text-[1.85rem] leading-tight text-ink">Oups, quelque chose s&apos;est mal passé</h1>
        <p className="mt-2 text-ink/70">Ce n&apos;est pas de votre faute. Réessayez : si le problème continue, revenez dans quelques minutes.</p>
        {error.digest && <p className="mt-2 text-xs text-ink/45">Référence : {error.digest}</p>}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button onClick={reset} className="btn-primary">
          <RotateCcw size={19} /> Réessayer
        </button>
        <Link href="/" className="btn-secondary">
          <House size={19} /> Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
