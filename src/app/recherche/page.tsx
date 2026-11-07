"use client";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Clock,
  RotateCcw,
  SearchX,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";
import { CategoryGrid } from "@/components/CategoryGrid";
import ProductCard from "@/components/ProductCard";
import { SearchBar } from "@/components/SearchBar";
import { Notice, SectionTitle, Skeleton, VERDICT } from "@/components/ui";
import { readLocal, useProfile, writeLocal } from "@/lib/useLocal";
import type { ScoredProduct, Verdict } from "@/lib/types";
import {
  byScoreDesc,
  errorMessage,
  postJson,
  searchHref,
  topReason,
} from "@/lib/utils";

const QUICK = [
  "fond de teint",
  "mascara waterproof",
  "rouge à lèvres mat",
  "BB crème",
  "anticernes",
  "crème solaire SPF 50",
];

/** Kept on this device only; removed with every other "bc.*" key by "Supprimer mes données". */
const RECENT_KEY = "bc.recentSearches";
const RECENT_MAX = 6;

/** Verdict filters, in the order shown. `inconnu` is handled by the "Ingrédients connus" switch. */
const VERDICT_FILTERS: Verdict[] = ["excellent", "bon", "moyen", "eviter"];
const VERDICT_SHORT: Record<Verdict, string> = {
  excellent: "Excellent",
  bon: "Bon choix",
  moyen: "Moyen",
  eviter: "À éviter",
  inconnu: "Infos insuffisantes",
};

type Sort = "pertinence" | "score";

const plural = (n: number, one: string, many: string) =>
  `${n} ${n > 1 ? many : one}`;

function SearchInner() {
  const params = useSearchParams();
  const router = useRouter();
  const initial = params.get("q") ?? "";
  const [q, setQ] = useState(initial);
  const [profile, , ready] = useProfile();
  const [results, setResults] = useState<ScoredProduct[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  // Refinements: client-side only, on the data already returned.
  const [hideUnknown, setHideUnknown] = useState(true);
  const [hideAllergens, setHideAllergens] = useState(false);
  const [verdicts, setVerdicts] = useState<Verdict[]>([]);
  const [sort, setSort] = useState<Sort>("pertinence");

  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => setQ(initial), [initial]);
  useEffect(() => setRecent(readLocal<string[]>(RECENT_KEY, [])), []);

  // A new query starts from the default refinements.
  useEffect(() => {
    setVerdicts([]);
    setHideAllergens(false);
    setSort("pertinence");
  }, [initial]);

  useEffect(() => {
    if (!ready || initial.length < 2) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    postJson<{ results: ScoredProduct[] }>("/api/search", {
      q: initial,
      profile,
    })
      .then((json) => !cancelled && setResults(json.results))
      .catch((e) => !cancelled && setError(errorMessage(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [initial, ready, profile, attempt]);

  // Remember the query (most recent first, no duplicates, max 6).
  useEffect(() => {
    if (initial.trim().length < 2) return;
    const prev = readLocal<string[]>(RECENT_KEY, []);
    const next = [
      initial.trim(),
      ...prev.filter((s) => s.toLowerCase() !== initial.trim().toLowerCase()),
    ].slice(0, RECENT_MAX);
    writeLocal(RECENT_KEY, next);
    setRecent(next);
  }, [initial]);

  const go = (query: string) => router.push(searchHref(query));
  const clearRecent = () => {
    writeLocal(RECENT_KEY, null);
    setRecent([]);
  };

  const all = useMemo(() => results ?? [], [results]);
  const hasAllergyHits = all.some((r) => r.allergyHit?.length);
  const shown = useMemo(() => {
    const list = all.filter(
      (r) =>
        (!hideUnknown || r.verdict !== "inconnu") &&
        (!hideAllergens || !r.allergyHit?.length) &&
        (verdicts.length === 0 || verdicts.includes(r.verdict)),
    );
    return sort === "score" ? [...list].sort(byScoreDesc) : list;
  }, [all, hideUnknown, hideAllergens, verdicts, sort]);
  const counts = useMemo(() => {
    const c: Partial<Record<Verdict, number>> = {};
    for (const r of all)
      if (!hideUnknown || r.verdict !== "inconnu")
        c[r.verdict] = (c[r.verdict] ?? 0) + 1;
    return c;
  }, [all, hideUnknown]);

  const filtered = hideUnknown || hideAllergens || verdicts.length > 0;
  const resetFilters = () => {
    setHideUnknown(false);
    setHideAllergens(false);
    setVerdicts([]);
  };

  const personal = ready && !!profile;
  const showResults = !!results && !loading && !error;

  /* ---------- No query ---------- */

  if (!initial) {
    return (
      <div data-layout="wide" className="flex flex-col gap-section">
        <section
          aria-labelledby="search-title"
          className="mx-auto w-full max-w-3xl"
        >
          <p className="eyebrow">Rechercher</p>
          <h1
            id="search-title"
            className="mt-3 font-display text-headline font-normal text-ink sm:text-[2.6rem] sm:leading-[1.08]"
          >
            Que cherchez-vous{" "}
            <span className="italic text-brand">aujourd&apos;hui ?</span>
          </h1>
          <p className="mt-3 max-w-xl leading-relaxed text-ink/75">
            Un produit, une marque ou un besoin. Chaque résultat reçoit une note
            sur 100 pour votre peau.
          </p>
          <SearchBar
            value={q}
            onChange={setQ}
            onSearch={go}
            autoFocus
            className="mt-6"
          />

          {recent.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between gap-3">
                <h2
                  id="recent-title"
                  className="text-sm font-semibold text-ink"
                >
                  Recherches récentes
                </h2>
                <button
                  type="button"
                  onClick={clearRecent}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink/75 hover:text-brand"
                >
                  <X size={15} aria-hidden="true" /> Effacer
                </button>
              </div>
              <ul
                aria-labelledby="recent-title"
                className="mt-2 flex flex-wrap gap-2"
              >
                {recent.map((s) => (
                  <li key={s} className="min-w-0 max-w-full">
                    <Link href={searchHref(s)} className="chip-off max-w-full">
                      <Clock
                        size={15}
                        aria-hidden="true"
                        className="shrink-0 text-ink/60"
                      />
                      <span className="truncate">{s}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-8">
            <h2 id="ideas-title" className="text-sm font-semibold text-ink">
              Idées de recherche
            </h2>
            <ul
              aria-labelledby="ideas-title"
              className="mt-2 flex flex-wrap gap-2"
            >
              {QUICK.map((s) => (
                <li key={s}>
                  <Link href={searchHref(s)} className="chip-off">
                    {s}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          aria-labelledby="cat-title"
          className="mx-auto w-full max-w-3xl"
        >
          <SectionTitle id="cat-title" eyebrow="Parcourir" display>
            Par catégorie
          </SectionTitle>
          <CategoryGrid />
        </section>
      </div>
    );
  }

  /* ---------- Query ---------- */

  return (
    <div data-layout="wide" className="flex flex-col gap-6 sm:gap-8">
      {/* Search + header. Sticky on large screens so refining never needs a scroll back up. */}
      <div className="flex flex-col gap-6 lg:sticky lg:top-0 lg:z-20 lg:-mx-10 lg:bg-cream/95 lg:px-10 lg:pb-4 lg:pt-4 lg:backdrop-blur-md">
        <SearchBar
          value={q}
          onChange={setQ}
          onSearch={go}
          className="lg:mx-auto lg:w-full lg:max-w-3xl"
        />
      </div>

      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="eyebrow">Résultats pour</p>
          <h1 className="mt-2 line-clamp-2 break-words font-display text-headline font-normal text-ink sm:text-[2.4rem] sm:leading-[1.08]">
            <span className="text-caramel-ink" aria-hidden="true">
              «&nbsp;
            </span>
            {initial}
            <span className="text-caramel-ink" aria-hidden="true">
              &nbsp;»
            </span>
          </h1>
          {/* Fixed-height status line: skeleton while loading, so nothing moves when results arrive. */}
          <div className="mt-2 flex min-h-7 items-center">
            {showResults ? (
              <p
                className="flex flex-wrap items-center gap-x-2 text-[0.95rem] text-ink/75"
                aria-live="polite"
                aria-atomic="true"
              >
                <span className="font-semibold text-ink">
                  {plural(shown.length, "produit", "produits")}
                </span>
                {filtered && shown.length !== all.length && (
                  <span>sur {all.length}</span>
                )}
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1.5">
                  {personal ? (
                    <>
                      <Sparkles
                        size={15}
                        aria-hidden="true"
                        className="text-brand"
                      />{" "}
                      Classés pour votre peau
                    </>
                  ) : (
                    "Classement général"
                  )}
                </span>
              </p>
            ) : loading ? (
              <Skeleton className="h-4 w-56" />
            ) : null}
          </div>
        </div>
        {showResults && all.length > 1 && (
          <label className="flex shrink-0 items-center gap-2 text-sm text-ink/75">
            <span className="font-semibold">Trier</span>
            <span className="relative">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="min-h-11 appearance-none rounded-full bg-white py-2 pl-4 pr-9 font-semibold text-ink ring-1 ring-line hover:ring-caramel focus-visible:ring-2 focus-visible:ring-brand"
              >
                <option value="pertinence">Pertinence</option>
                <option value="score">Meilleur score</option>
              </select>
              <ArrowRight
                size={14}
                aria-hidden="true"
                className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 rotate-90 text-ink/60"
              />
            </span>
          </label>
        )}
      </header>

      {ready && !profile && <ProfileCta />}

      {/* Filters: one row that scrolls sideways on phones, wraps from md up. */}
      {showResults && all.length > 0 && (
        <FilterRow>
          <FilterChip
            on={hideUnknown}
            onClick={() => setHideUnknown(!hideUnknown)}
          >
            Ingrédients connus
          </FilterChip>
          {hasAllergyHits && (
            <FilterChip
              on={hideAllergens}
              onClick={() => setHideAllergens(!hideAllergens)}
              icon={<ShieldAlert size={15} aria-hidden="true" />}
            >
              Sans mes allergènes
            </FilterChip>
          )}
          {VERDICT_FILTERS.some((v) => counts[v]) && (
            <span
              aria-hidden="true"
              className="mx-1 h-6 w-px shrink-0 self-center bg-line"
            />
          )}
          {VERDICT_FILTERS.filter((v) => counts[v]).map((v) => (
            <FilterChip
              key={v}
              on={verdicts.includes(v)}
              onClick={() =>
                setVerdicts(
                  verdicts.includes(v)
                    ? verdicts.filter((x) => x !== v)
                    : [...verdicts, v],
                )
              }
            >
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: VERDICT[v].color }}
              />
              {VERDICT_SHORT[v]}
              <span className="font-normal opacity-80">{counts[v]}</span>
            </FilterChip>
          ))}
        </FilterRow>
      )}
      {loading && (
        <div aria-hidden="true" className="flex h-11 gap-2 overflow-hidden">
          {["w-40", "w-44", "w-28", "w-32", "w-28"].map((w, i) => (
            <Skeleton key={i} className={`h-11 shrink-0 rounded-full ${w}`} />
          ))}
        </div>
      )}

      {error && !loading && (
        <div className="space-y-3">
          <Notice kind="error">{error}</Notice>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setAttempt((n) => n + 1)}
          >
            <RotateCcw size={18} aria-hidden="true" /> Réessayer
          </button>
        </div>
      )}

      {loading && (
        <ul
          aria-busy="true"
          aria-label="Chargement des résultats"
          className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {Array.from({ length: 8 }, (_, i) => (
            <li key={i} className={i >= 5 ? "hidden md:block" : ""}>
              <ResultSkeleton />
            </li>
          ))}
        </ul>
      )}

      {showResults && shown.length > 0 && (
        // Keyed by the active refinements: a filter or sort change cross-fades the list in again.
        <ul
          key={`${hideUnknown}-${hideAllergens}-${verdicts.join(",")}-${sort}`}
          className="grid grid-cols-1 gap-3 motion-safe:animate-fade-in md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {shown.map((p, i) => (
            <li
              key={p.code}
              className="motion-safe:animate-rise"
              style={i < 12 ? { animationDelay: `${i * 30}ms` } : undefined}
            >
              <ProductCard
                variant="tile"
                p={{ ...p, topReason: topReason(p) }}
              />
            </li>
          ))}
        </ul>
      )}

      {/* Everything hidden by the filters: say so, and offer to show it. */}
      {showResults && all.length > 0 && shown.length === 0 && (
        <EmptyPanel
          title="Aucun produit ne correspond à ces filtres"
          text={`${plural(all.length, "produit est masqué", "produits sont masqués")} par vos filtres.`}
        >
          <button type="button" className="btn-primary" onClick={resetFilters}>
            Afficher{" "}
            {all.length > 1 ? `les ${all.length} produits` : "le produit"}
          </button>
        </EmptyPanel>
      )}

      {/* Nothing found at all. */}
      {showResults && all.length === 0 && (
        <EmptyPanel
          title={`Aucun résultat pour « ${initial} »`}
          text="Essayez un autre mot, le nom d'une marque, ou l'une de ces idées."
        >
          <ul className="flex flex-wrap justify-center gap-2">
            {QUICK.filter((s) => s !== initial)
              .slice(0, 5)
              .map((s) => (
                <li key={s}>
                  <Link href={searchHref(s)} className="chip-off">
                    {s}
                  </Link>
                </li>
              ))}
          </ul>
        </EmptyPanel>
      )}
    </div>
  );
}

/* ---------- Pieces ---------- */

function ProfileCta() {
  return (
    <Link
      href="/bienvenue"
      className="group flex items-center gap-3.5 rounded-card bg-gold/45 px-4 py-3.5 ring-1 ring-caramel/40 transition hover:bg-gold/65 sm:px-5"
    >
      <span
        aria-hidden="true"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-brand"
      >
        <Sparkles size={19} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-ink">
          Ces scores sont généraux
        </span>
        <span className="block text-sm text-ink/75">
          3 questions, moins d&apos;une minute, pour un classement fait pour
          votre peau.
        </span>
      </span>
      <ArrowRight
        size={20}
        aria-hidden="true"
        className="shrink-0 text-brand transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  );
}

function FilterChip({
  on,
  onClick,
  icon,
  children,
}: {
  on: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`shrink-0 snap-start whitespace-nowrap ${on ? "chip-on" : "chip-off"}`}
    >
      {on ? <Check size={15} strokeWidth={2.5} aria-hidden="true" /> : icon}
      {children}
    </button>
  );
}

/** Horizontal chip row with an edge fade while more chips are off-screen (phones); wraps from md up. */
function FilterRow({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);
  const measure = useCallback(() => {
    const el = ref.current;
    if (el) setMore(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);
  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure, children]);
  return (
    <div
      ref={ref}
      role="group"
      aria-label="Filtrer les résultats"
      onScroll={measure}
      className={`-mx-4 flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-6 sm:px-6 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden ${
        more
          ? "[mask-image:linear-gradient(to_right,#000_calc(100%-3rem),transparent)] md:[mask-image:none]"
          : ""
      }`}
    >
      {children}
    </div>
  );
}

function EmptyPanel({
  title,
  text,
  children,
}: {
  title: string;
  text: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-panel bg-paper px-6 py-12 text-center ring-1 ring-line sm:py-16">
      <span
        aria-hidden="true"
        className="grid h-14 w-14 place-items-center rounded-full bg-brand-soft text-brand"
      >
        <SearchX size={26} strokeWidth={1.75} />
      </span>
      <div>
        <h2 className="font-display text-[1.4rem] leading-tight text-ink text-balance">
          {title}
        </h2>
        <p className="mt-2 text-ink/75">{text}</p>
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

/** Same footprint as a result card: a row on phones, a tile from md up. */
function ResultSkeleton() {
  return (
    <div className="card flex items-center gap-3.5 p-3 md:flex-col md:items-stretch md:gap-3 md:p-3.5">
      <Skeleton className="h-[4.5rem] w-[4.5rem] shrink-0 rounded-xl md:aspect-[4/3] md:h-auto md:w-full md:rounded-tile" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      <Skeleton className="h-[54px] w-[54px] shrink-0 rounded-full md:hidden" />
    </div>
  );
}

export default function RecherchePage() {
  return (
    <Suspense fallback={<div data-layout="wide" />}>
      <SearchInner />
    </Suspense>
  );
}
