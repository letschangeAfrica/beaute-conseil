import type { SVGProps } from "react";

/**
 * Beauty-specific line icons drawn on the same 24px grid and stroke
 * as lucide-react, so they sit naturally next to it.
 */
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Base({ size = 24, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export function LipstickIcon(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M8 21h8v-8H8z" />
      <path d="M9.5 13v-3h5v3" />
      <path d="M10.5 10V5.2L13.5 3v7" />
    </Base>
  );
}

export function MascaraIcon(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M14.5 3.5l6 6-2.5 2.5-6-6z" />
      <path d="M12 9L4.5 16.5" />
      <path d="M4 14.6l1.9 1.9M5.4 13.2l1.9 1.9M6.8 11.8l1.9 1.9" />
    </Base>
  );
}

export function FoundationIcon(p: IconProps) {
  return (
    <Base {...p}>
      <rect x="6" y="9" width="12" height="12" rx="2.5" />
      <path d="M9 9V6.5h6V9" />
      <path d="M10.5 6.5V3h3v3.5" />
      <path d="M9.5 14.5h5" />
    </Base>
  );
}

export function ConcealerIcon(p: IconProps) {
  return (
    <Base {...p}>
      <rect x="8.5" y="10" width="7" height="11" rx="1.5" />
      <path d="M9.5 10V7c0-1.7 1.1-3.3 2.5-4 1.4.7 2.5 2.3 2.5 4v3" />
    </Base>
  );
}

export function CompactIcon(p: IconProps) {
  return (
    <Base {...p}>
      <circle cx="12" cy="13" r="8" />
      <circle cx="12" cy="13" r="4.5" />
      <path d="M10 5.2V3.5h4v1.7" />
    </Base>
  );
}

export function CreamJarIcon(p: IconProps) {
  return (
    <Base {...p}>
      <rect x="4" y="11" width="16" height="9" rx="2" />
      <path d="M5.5 11V8.5A1.5 1.5 0 0 1 7 7h10a1.5 1.5 0 0 1 1.5 1.5V11" />
      <path d="M8 15.5h8" />
    </Base>
  );
}

export function CleanserIcon(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M8 21h8a1 1 0 0 0 1-1v-8.5a3 3 0 0 0-3-3h-4a3 3 0 0 0-3 3V20a1 1 0 0 0 1 1z" />
      <path d="M10 8.5V6h4v2.5" />
      <path d="M12 6V3.5h3.5" />
    </Base>
  );
}

export function SunscreenIcon(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M9 21h6l1-11H8z" />
      <path d="M10 10V7h4v3" />
      <circle cx="12" cy="15.5" r="2" />
    </Base>
  );
}
