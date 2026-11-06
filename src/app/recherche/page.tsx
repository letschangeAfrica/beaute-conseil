"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Check, Search, SearchX } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { CardSkeleton, Notice, PageHeader } from "@/components/ui";
import { useProfile } from "@/lib/useLocal";
import type { ScoredProduct } from "@/lib/types";
import { errorMessage, postJson } from "@/lib/utils";

const QUICK = ["fond de teint", "mascara waterproof", "rouge à lèvres mat", "BB crème", "anticernes", "crème solaire SPF 50"];

function SearchInner() {
  const params = useSearchParams();
  const router = useRouter();
  const initial = params.get("q") ?? "";
  const [q, setQ] = useState(initial);
  const [profile, , ready] = useProfile();
  const [results, setResults] = useState<ScoredProduct[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hideUnknown, setHideUnknown] = useState(true);

  useEffect(() => setQ(initial), [initial]);

  useEffect(() => {
    if (!ready || initial.length < 2) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    postJson<{ results: ScoredProduct[] }>("/api/search", { q: initial, profile })
      .then((json) => !cancelled && setResults(json.results))
      .catch((e) => !cancelled && setError(errorMessage(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [initial, ready, profile]);

  const go = (query: string) => router.push(`/recherche?q=${encodeURIComponent(query)}`);
  const shown = (results ?? []).filter((r) => !hideUnknown || r.verdict !== "inconnu");

  return (
    <div className="space-y-5">
      <PageHeader title="Rechercher" subtitle="Classés du plus adapté au moins adapté pour vous." />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim().length >= 2) go(q.trim());
        }}
        className="flex items-center gap-2 rounded-full bg-white p-1.5 pl-5 shadow-soft ring-1 ring-caramel/40 focus-within:ring-2 focus-within:ring-brand"
        role="search"
      >
        <Search size={20} className="shrink-0 text-ink/40" />
        <input
          className="min-w-0 flex-1 bg-transparent py-2 outline-none placeholder:text-ink/40"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Produit, marque, besoin…"
          aria-label="Rechercher un produit"
          autoFocus={!initial}
        />
        <button className="btn-icon" aria-label="Rechercher">
          <ArrowRight size={20} />
        </button>
      </form>

      {!initial && (
        <div className="flex flex-wrap gap-2">
          {QUICK.map((s) => (
            <button key={s} className="chip-off" onClick={() => go(s)}>
              {s}
            </button>
          ))}
        </div>
      )}

      {ready && !profile && initial && (
        <Notice>
          Scores généraux.{" "}
          <Link href="/profil" className="font-bold text-brand underline underline-offset-2">
            Créez votre profil
          </Link>{" "}
          pour un classement personnalisé.
        </Notice>
      )}

      {error && <Notice kind="error">{error}</Notice>}

      {loading && (
        <div className="space-y-2.5" aria-busy="true" aria-label="Chargement des résultats">
          {Array.from({ length: 5 }, (_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      )}

      {results && !loading && (
        <>
          <div className="flex items-center justify-between gap-3 text-sm">
            <p className="min-w-0 truncate font-semibold text-ink/70">
              {shown.length} résultat{shown.length > 1 ? "s" : ""} · {initial}
            </p>
            <button
              onClick={() => setHideUnknown(!hideUnknown)}
              aria-pressed={hideUnknown}
              className={`shrink-0 ${hideUnknown ? "chip-on" : "chip-off"} min-h-8 px-3 text-xs`}
            >
              {hideUnknown && <Check size={14} strokeWidth={2.5} />}
              Ingrédients connus
            </button>
          </div>
          <div className="space-y-2.5">
            {shown.map((p) => (
              <ProductCard
                key={p.code}
                p={{ ...p, topReason: (p.reasons.find((r) => r.kind === "minus" && p.score < 50) ?? p.reasons.find((r) => r.kind === "plus") ?? p.reasons[0])?.text }}
              />
            ))}
          </div>
          {shown.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-12 text-center text-ink/60">
              <SearchX size={40} strokeWidth={1.5} className="text-caramel" />
              <p>Aucun résultat. Essayez un autre mot, ou le nom d&apos;une marque.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function RecherchePage() {
  return (
    <Suspense>
      <SearchInner />
    </Suspense>
  );
}
