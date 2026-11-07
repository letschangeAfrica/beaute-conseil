"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { ArrowRight, ChevronLeft, ChevronRight, MessageCircleHeart, ScanBarcode, Sparkles, UserRoundCheck } from "lucide-react";
import { Avatar } from "@/components/AccountCard";
import { LegalLinks } from "@/components/LegalLinks";
import { ProductImage } from "@/components/ProductCard";
import { CategoryGrid } from "@/components/CategoryGrid";
import { OpenedReminder } from "@/components/home/OpenedReminder";
import { Showcase } from "@/components/home/Showcase";
import { HeroBackdrop } from "@/components/motion/HeroBackdrop";
import { Reveal } from "@/components/motion/Reveal";
import { Tilt } from "@/components/motion/Tilt";
import { SearchBar } from "@/components/SearchBar";
import { Logo, SectionTitle } from "@/components/ui";
import { type Favorite, useFavorites, useOnboarded, useProfile } from "@/lib/useLocal";
import { searchHref } from "@/lib/utils";

const STEPS = [
  { title: "Décrivez votre peau", text: "Type de peau, teint, préoccupations, allergies et budget : deux minutes, une seule fois." },
  { title: "Cherchez ou scannez", text: "Tapez un produit ou une marque, ou scannez le code-barres en magasin." },
  { title: "Lisez votre score", text: "Une note sur 100 expliquée simplement, une alerte en cas d'allergène et les prix comparés." },
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

  return (
    <div data-layout="wide" className="flex flex-col gap-section">
      {/* ---------- Top bar + hero, over the living backdrop (full bleed, decorative) ---------- */}
      <div className="relative isolate -mx-4 -mt-6 flex flex-col gap-10 px-4 pb-10 pt-6 sm:-mx-6 sm:gap-12 sm:px-6 lg:-mx-10 lg:gap-14 lg:px-10 lg:pb-14">
        <HeroBackdrop />
        <header className="flex h-12 items-center justify-between gap-3">
          <Logo />
          {/* Fixed height in every session state: nothing shifts when it resolves. */}
          <div className="flex h-12 w-[9rem] shrink-0 items-center justify-end">
            {status === "authenticated" ? (
              <Link href="/profil" aria-label="Mon compte" className="rounded-full p-1">
                <Avatar src={session.user?.image} name={session.user?.name} size={40} />
              </Link>
            ) : status === "unauthenticated" ? (
              <Link href="/connexion?callbackUrl=%2F" className="btn-secondary min-h-11 px-5 text-sm">
                Se connecter
              </Link>
            ) : (
              <span aria-hidden="true" className="block h-10 w-10 rounded-full bg-line/70" />
            )}
          </div>
        </header>

        {/* ---------- Hero ---------- */}
        <section aria-labelledby="hero-title" className="grid gap-8 lg:grid-cols-12 lg:items-center lg:gap-12">
          <div className="min-w-0 lg:col-span-7">
            <p className="eyebrow motion-safe:animate-rise">Conseillère beauté indépendante</p>
            <h1 id="hero-title" className="mt-3 font-display text-hero font-normal break-words text-ink motion-safe:animate-rise">
              {profile?.name ? `Bonjour ${profile.name},` : "Bonjour,"}
              <br />
              <span className="italic text-brand">que cherchez-vous ?</span>
            </h1>
            <p className="mt-4 max-w-[34rem] text-[1.05rem] leading-relaxed text-ink/75 [animation-delay:60ms] motion-safe:animate-rise sm:text-lg">
              Belle vous dit si un produit convient à <em className="font-display not-italic text-ink">votre</em> peau, vous alerte sur vos allergies et trouve le
              meilleur prix.
            </p>

            <SearchBar value={q} onChange={setQ} onSearch={(query) => router.push(searchHref(query))} className="mt-7 [animation-delay:120ms] motion-safe:animate-rise" />

            <ProfileSlot ready={ready} hasProfile={!!profile} />
          </div>

          {/* Shortcuts: two tiles under the search on phones, a stacked column beside it on desktop. */}
          <div className="grid min-w-0 grid-cols-2 gap-3 [animation-delay:180ms] motion-safe:animate-rise sm:gap-4 lg:col-span-5 lg:grid-cols-1">
            <Tilt className="h-full">
              <Link
                href="/scanner"
                className="group relative flex h-full min-h-[9.5rem] flex-col justify-between gap-4 overflow-hidden rounded-card bg-brand p-4 text-cream shadow-lift transition duration-200 hover:bg-brand-deep focus-visible:outline-gold motion-safe:hover:-translate-y-0.5 sm:p-5 lg:min-h-[11rem] lg:rounded-panel lg:p-7"
              >
                <span className="grid h-11 w-11 place-items-center rounded-full bg-cream/12 ring-1 ring-cream/25 lg:h-12 lg:w-12">
                  <ScanBarcode size={22} aria-hidden="true" />
                </span>
                <span>
                  <span className="eyebrow block text-gold">En magasin</span>
                  <span className="mt-1.5 flex items-center justify-between gap-2 font-display text-[1.2rem] leading-tight lg:text-[1.6rem]">
                    Scanner un produit
                    <ArrowRight size={20} aria-hidden="true" className="hidden shrink-0 transition-transform group-hover:translate-x-0.5 sm:block" />
                  </span>
                  <span className="mt-1 hidden text-sm leading-relaxed text-cream/85 sm:block">
                    Le code-barres suffit : votre score, vos alertes allergies et les prix ailleurs.
                  </span>
                </span>
              </Link>
            </Tilt>
            <Tilt className="h-full">
              <Link
                href="/conseillere"
                className="card-interactive group flex h-full min-h-[9.5rem] flex-col justify-between gap-4 p-4 sm:p-5 lg:min-h-[11rem] lg:rounded-panel lg:p-7"
              >
                <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-soft text-brand lg:h-12 lg:w-12">
                  <MessageCircleHeart size={22} aria-hidden="true" />
                </span>
                <span>
                  <span className="eyebrow block">Conseils</span>
                  <span className="mt-1.5 flex items-center justify-between gap-2 font-display text-[1.2rem] leading-tight text-ink lg:text-[1.6rem]">
                    Demander à Belle
                    <ArrowRight size={20} aria-hidden="true" className="hidden shrink-0 text-brand transition-transform group-hover:translate-x-0.5 sm:block" />
                  </span>
                  <span className="mt-1 hidden text-sm leading-relaxed text-ink/70 sm:block">Posez vos questions avec vos mots : Belle répond selon votre profil.</span>
                </span>
              </Link>
            </Tilt>
          </div>
        </section>
      </div>

      {/* ---------- Categories ---------- */}
      <Reveal as="section" aria-labelledby="cat-title" className="grid gap-6 lg:grid-cols-12 lg:gap-12">
        <div className="min-w-0 lg:col-span-4">
          <SectionTitle id="cat-title" eyebrow="Parcourir" display>
            Par catégorie
          </SectionTitle>
          <p className="-mt-3 hidden max-w-xs leading-relaxed text-ink/70 lg:block">Chaque résultat est noté pour votre peau, du meilleur au moins adapté.</p>
        </div>
        <CategoryGrid className="lg:col-span-8" stackAtLg />
      </Reveal>

      {/* ---------- Showcase: real products, moving ---------- */}
      <Showcase profile={profile} ready={ready} favs={favs} />

      <OpenedReminder />

      {/* ---------- Favourites ---------- */}
      {favs.length > 0 && <Favorites favs={favs} />}

      {/* ---------- How it works ---------- */}
      <Reveal as="section" aria-labelledby="how-title" className="border-t border-line pt-section lg:pt-[calc(var(--spacing-section)*0.8)]">
        <SectionTitle id="how-title" eyebrow="Comment ça marche" display>
          Trois étapes, <span className="italic text-brand">et vous savez.</span>
        </SectionTitle>
        <ol className="grid gap-x-10 gap-y-7 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-4 md:flex-col md:gap-3">
              <span aria-hidden="true" className="font-display text-[2.4rem] leading-none text-caramel-ink italic md:text-[2.8rem]">
                {i + 1}
              </span>
              <div className="min-w-0 border-l border-line pl-4 md:border-l-0 md:border-t md:pl-0 md:pt-4">
                <h3 className="text-title font-semibold text-ink">{s.title}</h3>
                <p className="mt-1 leading-relaxed text-ink/70">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </Reveal>

      {/* ---------- Independence ---------- */}
      <Reveal as="section" aria-labelledby="indep-title" className="rounded-panel bg-brand px-6 py-10 text-cream sm:px-10 sm:py-12 lg:px-14 lg:py-16">
        <div className="grid gap-8 lg:gap-12">
          <div className="max-w-xl">
            <p className="eyebrow text-gold">Notre engagement</p>
            <h2 id="indep-title" className="mt-3 font-display text-headline font-normal text-balance">
              Indépendante, <span className="italic text-gold">par principe.</span>
            </h2>
          </div>
          <dl className="grid gap-6 sm:grid-cols-3 sm:gap-8 lg:gap-12">
            <div className="border-t border-cream/25 pt-4">
              <dt className="font-semibold">Aucune marque ne nous paie</dt>
              <dd className="mt-1.5 text-[0.95rem] leading-relaxed text-cream/85">
                Belle n&apos;est payée par aucune marque. Personne ne peut acheter une meilleure note.
              </dd>
            </div>
            <div className="border-t border-cream/25 pt-4">
              <dt className="font-semibold">Des données ouvertes</dt>
              <dd className="mt-1.5 text-[0.95rem] leading-relaxed text-cream/85">
                Les fiches produits viennent d&apos;Open Beauty Facts, les prix en magasin d&apos;Open Prices.
              </dd>
            </div>
            <div className="border-t border-cream/25 pt-4">
              <dt className="font-semibold">Votre profil reste chez vous</dt>
              <dd className="mt-1.5 text-[0.95rem] leading-relaxed text-cream/85">
                Il est gardé sur votre téléphone, sauf si vous activez la synchronisation.{" "}
                <Link href="/confidentialite" className="rounded-sm font-semibold text-cream underline underline-offset-4 hover:text-gold focus-visible:outline-gold">
                  En savoir plus
                </Link>
              </dd>
            </div>
          </dl>
        </div>
      </Reveal>

      <LegalLinks className="-mt-[calc(var(--spacing-section)*0.5)]" />
    </div>
  );
}

/**
 * Profile call-to-action, or a quiet confirmation once a profile exists.
 * The slot keeps the same height while the profile loads, so the page never jumps.
 */
function ProfileSlot({ ready, hasProfile }: { ready: boolean; hasProfile: boolean }) {
  const base = "mt-4 flex min-h-[6.5rem] items-center sm:min-h-[4.5rem] gap-3.5 rounded-card px-4 py-3";
  if (!ready) return <div aria-hidden="true" className={`${base} bg-line/40`} />;
  if (!hasProfile) {
    return (
      <Link href="/bienvenue" className={`${base} group bg-gold/45 ring-1 ring-caramel/40 transition hover:bg-gold/65`}>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-brand">
          <Sparkles size={19} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-ink">Créez votre profil beauté</span>
          <span className="block text-sm text-ink/75">2 minutes pour des scores faits pour votre peau.</span>
        </span>
        <ArrowRight size={20} aria-hidden="true" className="shrink-0 text-brand transition-transform group-hover:translate-x-0.5" />
      </Link>
    );
  }
  return (
    <div className={`${base} text-sm`}>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-good-soft text-good">
        <UserRoundCheck size={19} aria-hidden="true" />
      </span>
      <p className="min-w-0 flex-1 text-ink/75">Vos scores tiennent compte de votre profil beauté.</p>
      <Link href="/profil" className="inline-flex min-h-11 shrink-0 items-center rounded-full px-3 font-semibold text-brand underline-offset-4 hover:underline">
        Modifier
      </Link>
    </div>
  );
}

/** Horizontal scroll-snap row: peeking last card + edge fade on phones, arrow buttons from tablet up. */
function Favorites({ favs }: { favs: Favorite[] }) {
  const ref = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure, favs.length]);

  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: smooth ? "smooth" : "auto" });
  };

  const fade = edges.end ? "" : "[mask-image:linear-gradient(to_right,#000_calc(100%-3rem),transparent)]";

  return (
    <section aria-labelledby="fav-title">
      <SectionTitle
        id="fav-title"
        eyebrow={`${favs.length} produit${favs.length > 1 ? "s" : ""}`}
        display
        action={
          <div className="hidden gap-2 md:flex">
            <button type="button" onClick={() => scroll(-1)} disabled={edges.start} aria-label="Favoris précédents" className="btn-secondary h-11 min-h-11 w-11 px-0">
              <ChevronLeft size={20} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => scroll(1)} disabled={edges.end} aria-label="Favoris suivants" className="btn-secondary h-11 min-h-11 w-11 px-0">
              <ChevronRight size={20} aria-hidden="true" />
            </button>
          </div>
        }
      >
        Mes favoris
      </SectionTitle>
      <ul
        ref={ref}
        onScroll={measure}
        className={`-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto overscroll-x-contain px-4 pb-3 [scrollbar-width:thin] sm:-mx-6 sm:scroll-px-6 sm:gap-4 sm:px-6 lg:-mx-10 lg:scroll-px-10 lg:px-10 ${fade}`}
      >
        {favs.map((f) => (
          <li key={f.code} className="w-[9.25rem] shrink-0 snap-start sm:w-44 lg:w-48">
            <Link href={`/produit/${f.code}`} className="card-interactive flex h-full flex-col p-2.5 sm:p-3">
              <ProductImage src={f.image} alt="" fluid />
              <span className="mt-2.5 block truncate px-0.5 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-caramel-ink">{f.brand || " "}</span>
              <span className="mt-0.5 line-clamp-2 px-0.5 text-sm font-semibold leading-snug break-words text-ink">{f.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
