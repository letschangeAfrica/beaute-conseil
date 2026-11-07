"use client";
import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CircleAlert, ExternalLink, Keyboard, RotateCcw, ScanText } from "lucide-react";
import { IngredientPhoto, type LabelReading } from "@/components/IngredientPhoto";
import ProductCard from "@/components/ProductCard";
import { IngredientList } from "@/components/product/IngredientList";
import { PriceSection } from "@/components/product/PriceSection";
import { ProductActions } from "@/components/product/ProductActions";
import { AllergyAlert, ProductHero, StickySummary } from "@/components/product/ProductHero";
import { ReasonList } from "@/components/product/ReasonList";
import { ShadeSection } from "@/components/product/ShadeSection";
import { formatBarcode } from "@/components/ScannerParts";
import { Notice, Skeleton } from "@/components/ui";
import { isComplexionProduct, scoreProduct, shadeAdvice } from "@/lib/scoring";
import { type LocalIngredients, readIngredients, saveIngredients, useFavorites, useProfile } from "@/lib/useLocal";
import type { PricePoint, Product, Profile, ScoredProduct } from "@/lib/types";
import { asBarcode, errorMessage, jsonPost, responseError, topReason } from "@/lib/utils";

interface Detail {
  product: ScoredProduct;
  prices: PricePoint[];
  alternatives: ScoredProduct[];
}

/** Re-scores a product with the ingredient list read from her label photo, when the database has none. */
function withPhotoIngredients(d: Detail, local: LocalIngredients | null, profile: Profile | null, force = false): Detail {
  if (!local || (d.product.ingredientsText && !force)) return d;
  return { ...d, product: scoreProduct({ ...d.product, ingredientsText: local.text }, profile, d.prices[0]) };
}

/** A product unknown to the database, built from her label photo alone. */
function fromPhoto(code: string, local: LocalIngredients, profile: Profile | null): Detail {
  const product: Product = {
    code,
    name: local.name || "Produit scanné",
    brand: local.brand || "",
    ingredientsText: local.text,
    categories: [],
    labels: [],
    scans: 0,
  };
  return { product: scoreProduct(product, profile), prices: [], alternatives: [] };
}

export default function ProduitPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [profile, , ready] = useProfile();
  const { isFav, toggle } = useFavorites();
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  const [photo, setPhoto] = useState<LocalIngredients | null>(null);
  const [unknown, setUnknown] = useState(false);
  const [announce, setAnnounce] = useState("");

  // Sticky summary (phones): shown once the hero has scrolled out of view.
  const heroRef = useRef<HTMLDivElement>(null);
  const [heroGone, setHeroGone] = useState(false);

  useEffect(() => {
    if (!ready) return;
    const local = readIngredients(code);
    setPhoto(local);
    setError("");
    fetch(`/api/product/${code}`, jsonPost({ profile }))
      .then(async (r) => {
        if (r.status === 404 && asBarcode(code)) {
          // Not in Open Beauty Facts: use the label photo she took earlier, if any.
          if (local) setData(fromPhoto(code, local, profile));
          else setUnknown(true);
          return;
        }
        // Status first, body second: an error page that isn't JSON must not surface as a parser message.
        if (!r.ok) throw new Error(await responseError(r));
        setData(withPhotoIngredients(await r.json(), local, profile));
      })
      .catch((e) => setError(errorMessage(e)));
  }, [code, ready, profile, attempt]);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setHeroGone(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [data]);

  function onLabelRead(r: LabelReading) {
    const local: LocalIngredients = { text: r.ingredientsText, name: r.productName || undefined, brand: r.brand || undefined, at: new Date().toISOString() };
    saveIngredients(code, local);
    setPhoto(local);
    setUnknown(false);
    setData((prev) => (prev ? withPhotoIngredients(prev, local, profile, true) : fromPhoto(code, local, profile)));
    setAnnounce("Liste d'ingrédients lue. Votre score a été mis à jour.");
  }

  const status = (
    <p className="sr-only" aria-live="polite">
      {announce}
    </p>
  );

  /* ---------- Unknown product ---------- */

  if (unknown && !data)
    return (
      <div data-layout="wide" className="mx-auto w-full max-w-3xl">
        {status}
        <TopBar />
        <header className="mt-6">
          <p className="eyebrow">Code-barres {asBarcode(code) ? formatBarcode(code) : code}</p>
          <h1 className="mt-2 font-display text-headline font-normal text-ink">
            Produit pas encore <span className="italic text-brand">référencé</span>
          </h1>
          <p className="mt-3 max-w-xl leading-relaxed text-ink/75">
            Ce produit n&apos;est pas dans la base Open Beauty Facts. Photographiez sa liste d&apos;ingrédients : Belle la lit et vous donne votre score.
          </p>
        </header>

        <section aria-labelledby="howto-title" className="card mt-8 p-5 sm:p-6">
          <h2 id="howto-title" className="flex items-center gap-2.5 font-display text-[1.3rem] leading-tight text-ink">
            <ScanText size={21} aria-hidden="true" className="text-brand" /> Comment faire
          </h2>
          <ol className="mt-4 space-y-3">
            {["Retournez le produit et trouvez « Ingredients ».", "Cadrez toute la liste, bien à plat, sans reflet."].map((t, i) => (
              <li key={t} className="flex gap-3.5">
                <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-soft font-display text-lg italic text-brand">
                  {i + 1}
                </span>
                <span className="pt-1 leading-snug text-ink/80">{t}</span>
              </li>
            ))}
          </ol>
          <div className="mt-5">
            <IngredientPhoto onRead={onLabelRead} />
          </div>
        </section>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
          <Link href="/scanner" className="btn-secondary">
            <Keyboard size={18} aria-hidden="true" /> Saisir un autre code
          </Link>
          <a href="https://world.openbeautyfacts.org/contribute" target="_blank" rel="noopener noreferrer" className="btn text-brand hover:bg-paper">
            Ajouter le produit à Open Beauty Facts <ExternalLink size={15} aria-hidden="true" />
          </a>
        </div>
      </div>
    );

  /* ---------- Error ---------- */

  if (error)
    return (
      <div data-layout="wide" className="mx-auto w-full max-w-3xl">
        <TopBar />
        <div className="mt-8 flex flex-col items-center gap-4 rounded-panel bg-paper px-6 py-12 text-center ring-1 ring-line">
          <span aria-hidden="true" className="grid h-14 w-14 place-items-center rounded-full bg-danger-soft text-danger">
            <CircleAlert size={26} />
          </span>
          <h1 className="font-display text-[1.6rem] leading-tight text-ink">Impossible d&apos;afficher ce produit</h1>
          <div className="w-full max-w-md text-left">
            <Notice kind="error">{error}</Notice>
          </div>
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <button type="button" className="btn-primary" onClick={() => setAttempt((n) => n + 1)}>
              <RotateCcw size={18} aria-hidden="true" /> Réessayer
            </button>
            <Link href="/scanner" className="btn-secondary">
              <Keyboard size={18} aria-hidden="true" /> Saisir un autre code
            </Link>
          </div>
        </div>
      </div>
    );

  if (!data) return <DetailSkeleton />;

  /* ---------- Product ---------- */

  const { product: p, prices, alternatives } = data;
  const advice = isComplexionProduct(p) ? shadeAdvice(profile) : null;
  const fav = isFav(p.code);
  const toggleFav = () => toggle({ code: p.code, name: p.name, brand: p.brand, image: p.image, score: p.score });
  const hits = p.allergyHit?.length ? p.allergyHit : null;

  return (
    <div data-layout="wide" className="flex flex-col gap-6">
      {status}
      <StickySummary p={p} visible={heroGone} fav={fav} onToggleFav={toggleFav} />
      <TopBar />

      <div className="grid gap-6 lg:grid-cols-12 lg:items-start lg:gap-10">
        {/* Left: safety and verdict. Sticky on desktop. */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-6 lg:col-span-5">
          {hits && <AllergyAlert hits={hits} />}
          <div ref={heroRef}>
            <ProductHero p={p} personal={!!profile} fav={fav} onToggleFav={toggleFav} />
          </div>
          <ProductActions p={p} />
        </div>

        {/* Right: why, shade, prices, alternatives, ingredients. */}
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-7">
          <ReasonList reasons={p.reasons} />

          {p.verdict === "inconnu" && !photo && (
            <section aria-labelledby="missing-title" className="rounded-card bg-paper p-5 ring-1 ring-line sm:p-6">
              <h2 id="missing-title" className="font-display text-[1.3rem] leading-tight text-ink">
                Il manque la liste d&apos;ingrédients
              </h2>
              <p className="mt-2 leading-relaxed text-ink/75">
                Pour vous donner un vrai score, photographiez-la au dos du produit : Belle la lit pour vous.
              </p>
              <div className="mt-4">
                <IngredientPhoto onRead={onLabelRead} />
              </div>
            </section>
          )}

          {photo && (
            <div className="flex gap-3 rounded-tile bg-paper p-4 text-sm leading-relaxed ring-1 ring-line">
              <ScanText size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-brand" />
              <div>
                <p className="text-ink/80">
                  Ingrédients lus sur votre photo du {new Date(photo.at).toLocaleDateString("fr-FR")}. Vérifiez l&apos;étiquette en cas d&apos;allergie.
                </p>
                <a
                  href={`https://world.openbeautyfacts.org/product/${p.code}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex min-h-11 items-center gap-1 font-semibold text-brand underline underline-offset-2"
                >
                  Aider les autres : compléter la fiche sur Open Beauty Facts <ExternalLink size={13} aria-hidden="true" />
                </a>
              </div>
            </div>
          )}

          {advice && profile && <ShadeSection p={p} profile={profile} advice={advice} />}

          <PriceSection name={p.name} brand={p.brand} code={code} quantity={p.quantity} city={profile?.city} prices={prices} />

          {alternatives.length > 0 && (
            <section aria-labelledby="alt-title">
              <h2 id="alt-title" className="font-display text-[1.35rem] leading-tight text-ink">
                Alternatives à comparer
              </h2>
              <p className="mt-1 text-sm text-ink/70">Même catégorie, bien notées pour vous, souvent d&apos;autres marques.</p>
              <ul className="-mx-4 mt-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-3 [scrollbar-width:thin] sm:-mx-6 sm:scroll-px-6 sm:px-6 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 md:pb-0">
                {alternatives.map((a) => (
                  <li key={a.code} className="w-[85%] max-w-[22rem] shrink-0 snap-start md:w-auto md:max-w-none">
                    <ProductCard variant="tile" p={{ ...a, topReason: topReason(a) }} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {p.ingredientsText && <IngredientList text={p.ingredientsText} allergyHit={p.allergyHit} profile={profile} />}

          <p className="text-center text-xs leading-relaxed text-ink/70">
            Données produits : Open Beauty Facts · Prix en magasin : Open Prices
            <br />
            Code-barres {p.code}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---------- Pieces ---------- */

function TopBar() {
  const router = useRouter();
  return (
    <div className="flex h-12 items-center">
      <button type="button" onClick={() => router.back()} className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-sm font-semibold text-ink/75 hover:text-brand">
        <ArrowLeft size={18} aria-hidden="true" /> Retour
      </button>
    </div>
  );
}

/** Same footprint as the loaded page: hero (left on desktop), then sections. */
function DetailSkeleton() {
  return (
    <div data-layout="wide" className="flex flex-col gap-6" aria-busy="true" aria-label="Chargement du produit">
      <div className="h-12" />
      <div className="grid gap-6 lg:grid-cols-12 lg:gap-10">
        <div className="card overflow-hidden lg:col-span-5">
          <div className="flex gap-4 p-4 sm:p-5 lg:flex-col lg:p-6">
            <Skeleton className="aspect-square w-[6.5rem] shrink-0 rounded-tile sm:w-32 lg:mx-auto lg:w-full lg:max-w-[18rem]" />
            <div className="flex-1 space-y-2 pt-2">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-6 w-4/5" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
          <div className="flex items-center gap-4 border-t border-line p-5">
            <Skeleton className="h-[88px] w-[88px] rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-40" />
            </div>
          </div>
          <div className="border-t border-line p-4">
            <Skeleton className="h-12 w-full rounded-full" />
          </div>
        </div>
        <div className="flex flex-col gap-6 lg:col-span-7">
          <Skeleton className="h-56 w-full rounded-card" />
          <Skeleton className="h-64 w-full rounded-card" />
        </div>
      </div>
    </div>
  );
}
