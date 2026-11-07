"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Pause, Play, Search } from "lucide-react";
import { Marquee } from "@/components/motion/Marquee";
import { Tilt } from "@/components/motion/Tilt";
import { useActiveWhenVisible, useReducedMotion, useSeenOnce } from "@/components/motion/useMotion";
import { ProductImage } from "@/components/ProductCard";
import { ScoreRing, SectionTitle, Skeleton, VerdictPill } from "@/components/ui";
import type { Profile, ScoredProduct } from "@/lib/types";
import type { Favorite } from "@/lib/useLocal";
import { errorMessage, postJson, productHref, searchHref, topReason } from "@/lib/utils";

/** One real category, searched once when the section is about to scroll into view. */
const QUERY = "rouge à lèvres";

interface Tile {
  code: string;
  name: string;
  brand: string;
  image: string;
  /** Only when it was actually computed (search results, or saved with a favourite). */
  score?: number;
}

/**
 * Home showcase: real products from Open Beauty Facts moving in a marquee, and a looping
 * "Belle in action" card replaying a real product's real score. Nothing is invented: no data,
 * no section content beyond what the search API and her favourites return.
 * Fixed heights in every state (loading, loaded, empty), so the page never shifts.
 */
export function Showcase({ profile, ready, favs }: { profile: Profile | null; ready: boolean; favs: Favorite[] }) {
  const ref = useRef<HTMLElement>(null);
  const near = useSeenOnce(ref, "400px");
  const [results, setResults] = useState<ScoredProduct[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!near || !ready || results) return;
    let cancelled = false;
    postJson<{ results: ScoredProduct[] }>("/api/search", { q: QUERY, profile })
      .then((j) => !cancelled && setResults(j.results))
      .catch((e) => {
        if (!cancelled) {
          console.warn(errorMessage(e));
          setFailed(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [near, ready, profile, results]);

  const scored = (results ?? []).filter((r) => r.image);
  const demo = scored.find((r) => r.verdict !== "inconnu");
  const seen = new Set<string>();
  const tiles: Tile[] = [
    ...favs.filter((f) => f.image).map((f) => ({ code: f.code, name: f.name, brand: f.brand, image: f.image!, score: f.score })),
    ...scored.map((r) => ({ code: r.code, name: r.name, brand: r.brand, image: r.image!, score: r.verdict === "inconnu" ? undefined : r.score })),
  ].filter((t) => (seen.has(t.code) ? false : (seen.add(t.code), true)));

  const loading = !results && !failed;

  return (
    <section ref={ref} aria-labelledby="showcase-title" className="grid gap-8 lg:grid-cols-12 lg:items-start lg:gap-12">
      <div className="min-w-0 lg:col-span-5">
        <SectionTitle id="showcase-title" eyebrow="En direct d’Open Beauty Facts" display>
          Des produits réels, <span className="italic text-brand">{profile ? "notés pour vous" : "notés en un instant"}</span>
        </SectionTitle>
        {/* Same height in every state (card + its pause button), so nothing below moves. */}
        <div className="min-h-[17.5rem] sm:min-h-[19.5rem]">
          {loading ? (
            <Skeleton className="h-[14rem] w-full rounded-panel sm:h-[16rem]" />
          ) : demo ? (
            <DemoCard p={demo} />
          ) : (
            <div className="flex h-[14rem] flex-col items-start justify-center gap-4 rounded-panel bg-paper p-6 ring-1 ring-line sm:h-[16rem]">
              <p className="leading-relaxed text-ink/80">Cherchez un produit pour voir Belle le noter, en direct.</p>
              <Link href={searchHref(QUERY)} className="btn-secondary">
                <Search size={17} aria-hidden="true" /> Voir des rouges à lèvres
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="min-h-[20rem] min-w-0 lg:col-span-7 lg:pt-[5.5rem]">
        {loading ? (
          <div aria-hidden="true" className="flex h-[17.5rem] gap-4 overflow-hidden">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[15.5rem] w-40 shrink-0 rounded-card" />
            ))}
          </div>
        ) : tiles.length >= 4 ? (
          <Marquee label="Produits notés par Belle" seconds={Math.max(28, tiles.length * 4)}>
            {tiles.map((t, i) => (
              <li key={t.code} className="w-40 shrink-0 py-2">
                <div className="pausable motion-safe:animate-float" style={{ animationDuration: `${5 + (i % 4) * 1.3}s`, animationDelay: `${-(i % 5)}s` }}>
                  <ShowcaseTile t={t} />
                </div>
              </li>
            ))}
          </Marquee>
        ) : (
          <ul aria-label="Produits notés par Belle" className="flex h-[17.5rem] gap-4 overflow-x-auto py-2">
            {tiles.map((t) => (
              <li key={t.code} className="w-40 shrink-0">
                <ShowcaseTile t={t} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function ShowcaseTile({ t }: { t: Tile }) {
  return (
    <Link
      href={productHref(t.code)}
      className="card-interactive flex h-[15.5rem] flex-col p-2.5"
      aria-label={`${t.brand ? `${t.brand}, ` : ""}${t.name}${t.score !== undefined ? `, score ${t.score} sur 100` : ""}`}
    >
      <div className="relative">
        <ProductImage src={t.image} alt="" fluid />
        {t.score !== undefined && (
          <span
            aria-hidden="true"
            className="absolute right-1.5 top-1.5 rounded-full bg-white px-2 py-0.5 text-xs font-bold tabular-nums text-ink shadow-soft ring-1 ring-line"
          >
            {t.score}
          </span>
        )}
      </div>
      <span aria-hidden="true" className="mt-2.5 block truncate px-0.5 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-caramel-ink">
        {t.brand || " "}
      </span>
      <span aria-hidden="true" className="mt-0.5 line-clamp-2 px-0.5 text-sm font-semibold leading-snug text-ink">
        {t.name}
      </span>
    </Link>
  );
}

/**
 * "Belle in action": a real product replays its real verdict (image, score drawing and counting
 * up, verdict popping in, the reason typing in), every 9 s while on screen. Pausable (WCAG 2.2.2);
 * static and complete under reduced motion.
 */
function DemoCard({ p }: { p: ScoredProduct }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const active = useActiveWhenVisible(ref);
  const [paused, setPaused] = useState(false);
  const [hover, setHover] = useState(false);
  const [cycle, setCycle] = useState(0);
  const [typed, setTyped] = useState(0);
  const reason = topReason(p) ?? "";
  const running = active && !paused && !hover && !reduced;

  // Replay loop.
  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => setCycle((c) => c + 1), 9000);
    return () => window.clearInterval(t);
  }, [running]);

  // Typing, restarted each cycle; complete at once when not running.
  useEffect(() => {
    if (!running) return setTyped(reason.length);
    setTyped(0);
    let i = 0;
    let timer = 0;
    const start = window.setTimeout(() => {
      timer = window.setInterval(() => {
        i += 1;
        setTyped(i);
        if (i >= reason.length) window.clearInterval(timer);
      }, 26);
    }, 1100);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(timer);
    };
  }, [cycle, running, reason]);

  return (
    <div
      ref={ref}
      className="relative"
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
    >
      <Tilt>
        <Link href={productHref(p.code)} className="card-interactive flex h-[14rem] flex-col justify-between gap-4 rounded-panel p-5 sm:h-[16rem] sm:p-6">
          <div key={cycle} className="flex items-start gap-4">
            <div className="w-24 shrink-0 motion-safe:animate-scale-in">
              <ProductImage src={p.image} alt="" fluid />
            </div>
            <div className="min-w-0 flex-1">
              {p.brand && <p className="truncate text-[0.7rem] font-bold uppercase tracking-[0.12em] text-caramel-ink">{p.brand}</p>}
              <p className="line-clamp-2 font-semibold leading-snug text-ink">{p.name}</p>
              <div className="mt-2 [animation-delay:700ms] motion-safe:animate-pop">
                <VerdictPill verdict={p.verdict} />
              </div>
            </div>
            <ScoreRing score={p.score} verdict={p.verdict} size={64} animate={!reduced} />
          </div>
          <p className="min-h-[2.8em] text-sm leading-snug text-ink/80">
            <span aria-hidden="true">
              {reason.slice(0, typed)}
              {typed < reason.length && <span className="ml-px inline-block h-[1em] w-px translate-y-[0.15em] bg-brand" />}
            </span>
            <span className="sr-only">{reason}</span>
          </p>
        </Link>
      </Tilt>
      {!reduced && (
        <button
          type="button"
          onClick={() => setPaused((x) => !x)}
          aria-pressed={paused}
          className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-ink/80 shadow-soft ring-1 ring-line hover:text-brand"
        >
          {paused ? <Play size={15} aria-hidden="true" /> : <Pause size={15} aria-hidden="true" />}
          {paused ? "Relancer la démo" : "Mettre la démo en pause"}
        </button>
      )}
    </div>
  );
}
