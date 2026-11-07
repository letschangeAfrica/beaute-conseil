"use client";
import { useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { useActiveWhenVisible } from "./useMotion";

/**
 * Seamless, infinite horizontal loop. The children are rendered twice: the second copy is
 * aria-hidden and inert, so screen readers and the Tab key meet each item once.
 * Pauses on hover, on focus, with its button (WCAG 2.2.2), off-screen and in hidden tabs.
 * Reduced motion: no movement, the first copy becomes a normal horizontal scroll row.
 */
export function Marquee({ children, label, seconds = 40, className = "" }: { children: React.ReactNode; label: string; seconds?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const active = useActiveWhenVisible(ref);
  const [paused, setPaused] = useState(false);

  return (
    <div ref={ref} className={`marquee relative ${className}`} data-paused={paused || !active ? "true" : "false"}>
      <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_6%,#000_94%,transparent)] motion-reduce:overflow-x-auto motion-reduce:[mask-image:none]">
        <div className="marquee-track flex w-max will-change-transform" style={{ ["--marquee-duration" as string]: `${seconds}s` }}>
          <ul aria-label={label} className="flex shrink-0 gap-4 pr-4">
            {children}
          </ul>
          <ul aria-hidden="true" inert className="flex shrink-0 gap-4 pr-4 motion-reduce:hidden">
            {children}
          </ul>
        </div>
      </div>
      <div className="mt-3 flex justify-end motion-reduce:hidden">
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-pressed={paused}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-ink/80 shadow-soft ring-1 ring-line hover:text-brand"
        >
          {paused ? <Play size={15} aria-hidden="true" /> : <Pause size={15} aria-hidden="true" />}
          {paused ? "Relancer le défilement" : "Mettre en pause"}
        </button>
      </div>
    </div>
  );
}
