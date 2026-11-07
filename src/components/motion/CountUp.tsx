"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "./useMotion";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Counts from 0 to `value` the first time it is seen (≈700 ms). Pure CSS: an animated integer
 * custom property (@property --n) printed by a counter, so no DOM text changes and no layout work.
 * The visible digits are aria-hidden; assistive tech always gets the final value. Under reduced
 * motion, if `animate` is false, or where @property is unsupported, the final value shows at once.
 */
export function CountUp({ value, duration = 700, animate = true, className = "" }: { value: number; duration?: number; animate?: boolean; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [state, setState] = useState<"idle" | "pending" | "run">("idle");

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!animate || !el || prefersReducedMotion()) return setState("idle");
    setState("pending");
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      setState("run");
    });
    io.observe(el);
    return () => io.disconnect();
  }, [value, animate]);

  return (
    <span className={`inline-block text-center tabular-nums ${className}`} style={{ minWidth: `${String(value).length}ch` }}>
      <span
        ref={ref}
        aria-hidden="true"
        className="count-up"
        data-state={state}
        style={{ ["--n" as string]: value, ["--count-duration" as string]: `${duration}ms` }}
      />
      <span className="sr-only">{value}</span>
    </span>
  );
}
