"use client";
import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { useActiveWhenVisible, useReducedMotion } from "./useMotion";

/** Set NEXT_PUBLIC_HERO_VIDEO=1 once public/media/hero.mp4 and hero-poster.jpg exist (see docs/motion.md). */
const VIDEO_ENABLED = process.env.NEXT_PUBLIC_HERO_VIDEO === "1";

const BLOBS = [
  { cls: "left-[-10%] top-[-20%] h-[22rem] w-[22rem] bg-brand-soft", ax: "10%", ay: "8%", delay: "0s" },
  { cls: "right-[-12%] top-[-10%] h-[20rem] w-[20rem] bg-gold/55", ax: "-12%", ay: "10%", delay: "-8s" },
  { cls: "bottom-[-25%] left-[25%] h-[18rem] w-[26rem] bg-caramel/30", ax: "8%", ay: "-10%", delay: "-15s" },
  { cls: "right-[10%] bottom-[-30%] h-[16rem] w-[16rem] bg-brand/10", ax: "-8%", ay: "-6%", delay: "-4s", desktopOnly: true },
];

/**
 * The living backdrop of the home hero: slow aurora blobs in brand colours plus film grain, and an
 * optional self-hosted video. Decorative (aria-hidden, no pointer events) and painted after the
 * headline, so it never delays the Largest Contentful Paint. Paused off-screen, in hidden tabs, by
 * its own button, and absent under reduced motion (static gradient only).
 */
export function HeroBackdrop() {
  const ref = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const reduced = useReducedMotion();
  const active = useActiveWhenVisible(ref);
  const [paused, setPaused] = useState(false);
  const [videoOk, setVideoOk] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const saveData = mounted && (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
  const useVideo = VIDEO_ENABLED && mounted && !reduced && !saveData;
  const running = active && !paused && !reduced;

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (running) v.play().catch(() => {});
    else v.pause();
  }, [running, videoOk]);

  return (
    <>
      {/* Full viewport width (the hero container is capped by <main>); body clips the overflow. */}
      <div
        ref={ref}
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-1/2 -z-10 w-screen -translate-x-1/2 overflow-hidden"
        data-paused={running ? "false" : "true"}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-paper/70 via-cream to-cream" />
        {BLOBS.map((b, i) => (
          <span
            key={i}
            className={`pausable absolute rounded-full opacity-70 blur-3xl motion-safe:animate-aurora ${b.cls} ${b.desktopOnly ? "hidden lg:block" : ""}`}
            style={{ ["--ax" as string]: b.ax, ["--ay" as string]: b.ay, animationDelay: b.delay }}
          />
        ))}
        {useVideo && (
          <video
            ref={video}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-(--duration-slow) ${videoOk ? "opacity-25" : "opacity-0"}`}
            src="/media/hero.mp4"
            poster="/media/hero-poster.jpg"
            muted
            loop
            playsInline
            autoPlay
            preload="metadata"
            onCanPlay={() => setVideoOk(true)}
            onError={() => setVideoOk(false)}
          />
        )}
        <div className="grain absolute inset-0 opacity-[0.07] mix-blend-multiply" />
        {/* Soft fade into the page so the backdrop has no hard edge. */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-cream" />
      </div>
      {!reduced && mounted && (
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-pressed={paused}
          className="absolute bottom-3 right-4 z-10 grid h-11 w-11 sm:right-6 lg:right-10 place-items-center rounded-full bg-white/80 text-ink/75 shadow-soft ring-1 ring-line backdrop-blur hover:text-brand"
        >
          {paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
          <span className="sr-only">{paused ? "Relancer l’animation de fond" : "Mettre l’animation de fond en pause"}</span>
        </button>
      )}
    </>
  );
}
