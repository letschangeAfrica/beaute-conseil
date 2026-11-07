"use client";
import { useRef } from "react";

/**
 * Subtle 3D tilt that follows the pointer. Desktop only (hover + fine pointer), never under
 * reduced motion; touch devices get the normal card. Transform only, one frame per pointer move.
 */
export function Tilt({ children, max = 5, className = "" }: { children: React.ReactNode; max?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  const enabled = () =>
    typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <div
      ref={ref}
      className={`[transform-style:preserve-3d] transition-transform duration-(--duration-base) ease-(--ease-out-soft) ${className}`}
      onPointerMove={(e) => {
        if (!enabled() || frame.current) return;
        const el = ref.current;
        if (!el) return;
        const { left, top, width, height } = el.getBoundingClientRect();
        const x = (e.clientX - left) / width - 0.5;
        const y = (e.clientY - top) / height - 0.5;
        frame.current = requestAnimationFrame(() => {
          frame.current = 0;
          el.style.transform = `perspective(900px) rotateX(${(-y * max).toFixed(2)}deg) rotateY(${(x * max).toFixed(2)}deg)`;
        });
      }}
      onPointerLeave={() => {
        cancelAnimationFrame(frame.current);
        frame.current = 0;
        if (ref.current) ref.current.style.transform = "";
      }}
    >
      {children}
    </div>
  );
}
