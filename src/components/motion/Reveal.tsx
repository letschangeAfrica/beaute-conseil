"use client";
import { Children, cloneElement, isValidElement, useEffect, useRef, useState } from "react";

/**
 * Fades and rises its content into view on scroll.
 * - Browsers with scroll-driven animations: pure CSS (`.reveal` / `.reveal-stagger` in globals.css).
 * - Others: IntersectionObserver. Content already on screen at load is never hidden (no flash, no LCP cost).
 * - Reduced motion: nothing moves (the CSS only applies under prefers-reduced-motion: no-preference).
 * `stagger`: each direct child enters in turn (children receive --i).
 */
export function Reveal({
  children,
  stagger = false,
  as: Tag = "div",
  className = "",
  ...rest
}: { children: React.ReactNode; stagger?: boolean; as?: "div" | "section" | "ul" | "ol"; className?: string } & React.HTMLAttributes<HTMLElement>) {
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState<"pending" | "shown" | undefined>(undefined);

  useEffect(() => {
    const el = ref.current;
    if (!el || CSS.supports("animation-timeline: view()")) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Already visible at load: leave it alone.
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;
    setState("pending");
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setState("shown");
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const kids = stagger
    ? Children.map(children, (child, i) =>
        isValidElement<{ style?: React.CSSProperties }>(child) ? cloneElement(child, { style: { ...child.props.style, ["--i" as string]: Math.min(i, 8) } }) : child,
      )
    : children;

  return (
    <Tag ref={ref as never} data-reveal={state} className={`${stagger ? "reveal-stagger" : "reveal"} ${className}`} {...rest}>
      {kids}
    </Tag>
  );
}
