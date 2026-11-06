import Link from "next/link";
import { House, Search } from "lucide-react";
import { Logo } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-[70dvh] flex-col justify-center gap-6">
      <Logo />
      <div>
        <p className="font-display text-6xl text-caramel-ink">404</p>
        <h1 className="mt-2 font-display text-[1.85rem] leading-tight text-ink">Cette page n&apos;existe pas</h1>
        <p className="mt-2 text-ink/70">Le lien est peut-être incomplet, ou la page a été déplacée.</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Link href="/" className="btn-primary">
          <House size={19} /> Retour à l&apos;accueil
        </Link>
        <Link href="/recherche" className="btn-secondary">
          <Search size={19} /> Chercher un produit
        </Link>
      </div>
    </div>
  );
}
