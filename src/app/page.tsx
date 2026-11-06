"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { ArrowRight, Heart, MessageCircleHeart, ScanBarcode, Search, Sparkles, Eye } from "lucide-react";
import { Avatar } from "@/components/AccountCard";
import { LegalLinks } from "@/components/LegalLinks";
import { ProductImage } from "@/components/ProductCard";
import { CleanserIcon, CompactIcon, ConcealerIcon, CreamJarIcon, FoundationIcon, LipstickIcon, MascaraIcon, SunscreenIcon } from "@/components/icons";
import { Logo, SectionTitle } from "@/components/ui";
import { useFavorites, useOnboarded, useProfile } from "@/lib/useLocal";

const CATEGORIES = [
  { q: "fond de teint", label: "Teint", Icon: FoundationIcon },
  { q: "mascara", label: "Mascara", Icon: MascaraIcon },
  { q: "rouge à lèvres", label: "Lèvres", Icon: LipstickIcon },
  { q: "correcteur anticernes", label: "Anticernes", Icon: ConcealerIcon },
  { q: "fard à paupières", label: "Yeux", Icon: Eye },
  { q: "poudre", label: "Poudre", Icon: CompactIcon },
  { q: "crème hydratante visage", label: "Soin visage", Icon: CreamJarIcon },
  { q: "crème solaire visage", label: "Solaire", Icon: SunscreenIcon },
  { q: "démaquillant", label: "Démaquillant", Icon: CleanserIcon },
];

export default function Home() {
  const [profile, , ready] = useProfile();
  const { favs } = useFavorites();
  const { data: session, status } = useSession();
  const [onboarded, , onboardedReady] = useOnboarded();
  const [q, setQ] = useState("");
  const router = useRouter();

  // First visit: start with the three-question welcome flow.
  useEffect(() => {
    if (ready && onboardedReady && !profile && !onboarded) router.replace("/bienvenue");
  }, [ready, onboardedReady, profile, onboarded, router]);

  const go = (query: string) => router.push(`/recherche?q=${encodeURIComponent(query)}`);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="relative -mx-4 -mt-6 overflow-hidden rounded-b-[2rem] bg-brand px-5 pb-7 pt-6 text-cream sm:-mx-6 sm:px-7">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-caramel/25" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 h-48 w-48 rounded-full bg-gold/10" />
        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <Logo light />
            {status === "authenticated" ? (
              <Link href="/profil" aria-label="Mon compte">
                <Avatar src={session.user?.image} name={session.user?.name} size={38} />
              </Link>
            ) : status === "unauthenticated" ? (
              <Link href="/connexion?callbackUrl=%2F" className="rounded-full bg-cream/15 px-4 py-2 text-sm font-semibold text-cream ring-1 ring-cream/30 transition hover:bg-cream hover:text-brand">
                Se connecter
              </Link>
            ) : null}
          </div>
          <h1 className="mt-6 font-display text-[2.1rem] leading-[1.1]">
            {profile?.name ? `Bonjour ${profile.name},` : "Bonjour,"}
            <br />
            <span className="italic text-gold">que cherchez-vous ?</span>
          </h1>
          <p className="mt-2 max-w-sm text-cream/80">Le bon produit pour votre peau, au meilleur prix en France.</p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (q.trim().length >= 2) go(q.trim());
            }}
            className="mt-5 flex items-center gap-2 rounded-full bg-white p-1.5 pl-5 shadow-lift"
            role="search"
          >
            <Search size={20} className="shrink-0 text-ink/40" />
            <input
              className="min-w-0 flex-1 bg-transparent py-2 text-ink outline-none placeholder:text-ink/40"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Produit, marque, besoin…"
              aria-label="Rechercher un produit"
            />
            <button className="btn-icon" aria-label="Rechercher">
              <ArrowRight size={20} />
            </button>
          </form>
        </div>
      </section>

      {ready && !profile && (
        <Link href="/bienvenue" className="card-interactive flex items-center gap-4 p-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gold text-brand">
            <Sparkles size={22} />
          </span>
          <span className="flex-1">
            <span className="block font-bold">Créez votre profil beauté</span>
            <span className="block text-sm text-ink/65">2 minutes pour des recommandations faites pour vous.</span>
          </span>
          <ArrowRight size={20} className="text-brand" />
        </Link>
      )}

      <section>
        <SectionTitle>Parcourir</SectionTitle>
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
          {CATEGORIES.map(({ q: query, label, Icon }) => (
            <button key={query} onClick={() => go(query)} className="card-interactive group flex flex-col items-center gap-2 px-2 py-4">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-paper text-brand ring-1 ring-caramel/30 transition group-hover:bg-gold">
                <Icon size={24} />
              </span>
              <span className="text-sm font-semibold">{label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Link href="/scanner" className="card-interactive flex items-start gap-4 p-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand text-cream">
            <ScanBarcode size={24} />
          </span>
          <span>
            <span className="block font-bold">En magasin</span>
            <span className="block text-sm text-ink/65">Scannez un code-barres : adapté à vous ou non, et moins cher ailleurs ?</span>
          </span>
        </Link>
        <Link href="/conseillere" className="card-interactive flex items-start gap-4 p-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-caramel text-white">
            <MessageCircleHeart size={24} />
          </span>
          <span>
            <span className="block font-bold">Demandez à Belle</span>
            <span className="block text-sm text-ink/65">Votre conseillère répond avec vos mots, selon votre profil.</span>
          </span>
        </Link>
      </section>

      {favs.length > 0 && (
        <section>
          <SectionTitle icon={Heart}>Mes favoris</SectionTitle>
          <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6">
            {favs.map((f) => (
              <Link key={f.code} href={`/produit/${f.code}`} className="card-interactive w-36 shrink-0 snap-start p-3">
                <ProductImage src={f.image} alt={f.name} size={110} />
                <p className="mt-2 truncate text-[0.7rem] font-bold uppercase tracking-[0.12em] text-caramel">{f.brand}</p>
                <p className="line-clamp-2 text-sm font-semibold leading-snug">{f.name}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <LegalLinks />
    </div>
  );
}
