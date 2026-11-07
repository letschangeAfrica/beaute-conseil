import Link from "next/link";
import { House, ScanBarcode, Search } from "lucide-react";
import { Logo } from "@/components/ui";

/** 404: friendly, and points to what she was probably looking for. */
export default function NotFound() {
  return (
    <div className="relative flex min-h-[calc(100dvh-10rem)] flex-col justify-center overflow-hidden p-1">
      <span aria-hidden="true" className="pointer-events-none absolute -right-6 top-1/2 -translate-y-1/2 select-none font-display text-[16rem] italic leading-none text-brand/[0.06] sm:text-[22rem]">
        B
      </span>
      <div className="relative motion-safe:animate-rise">
        <Logo />
        <p className="eyebrow mt-10">Erreur 404</p>
        <h1 className="mt-2 font-display text-headline font-normal text-ink sm:text-[2.6rem] sm:leading-[1.08]">
          Cette page est <span className="italic text-brand">introuvable</span>
        </h1>
        <p className="mt-3 max-w-md leading-relaxed text-ink/75">Le lien est peut-être incomplet, ou la page a été déplacée. Reprenons depuis un endroit connu.</p>
        <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
          <Link href="/" className="btn-primary">
            <House size={19} aria-hidden="true" /> Retour à l&apos;accueil
          </Link>
          <Link href="/recherche" className="btn-secondary">
            <Search size={19} aria-hidden="true" /> Chercher un produit
          </Link>
        </div>
        <Link href="/scanner" className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full text-sm font-semibold text-ink/75 hover:text-brand">
          <ScanBarcode size={17} aria-hidden="true" /> Ou scanner un code-barres
        </Link>
      </div>
    </div>
  );
}
