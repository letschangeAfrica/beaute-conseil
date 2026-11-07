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
    <div className="relative flex min-h-[calc(100dvh-10rem)] flex-col justify-center overflow-hidden p-1">
      <span aria-hidden="true" className="pointer-events-none absolute -right-6 top-1/2 -translate-y-1/2 select-none font-display text-[16rem] italic leading-none text-brand/[0.06] sm:text-[22rem]">
        B
      </span>
      <div className="relative motion-safe:animate-rise" role="alert">
        <Logo />
        <p className="eyebrow mt-10">Un souci technique</p>
        <h1 className="mt-2 font-display text-headline font-normal text-ink sm:text-[2.6rem] sm:leading-[1.08]">
          Quelque chose s&apos;est <span className="italic text-brand">mal passé</span>
        </h1>
        <p className="mt-3 max-w-md leading-relaxed text-ink/75">
          Ce n&apos;est pas de votre faute. Réessayez&nbsp;: si le problème continue, revenez dans quelques minutes.
        </p>
        {error.digest && <p className="mt-3 text-sm text-ink/70">Référence&nbsp;: {error.digest}</p>}
        <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
          <button type="button" onClick={reset} className="btn-primary">
            <RotateCcw size={19} aria-hidden="true" /> Réessayer
          </button>
          <Link href="/" className="btn-secondary">
            <House size={19} aria-hidden="true" /> Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
