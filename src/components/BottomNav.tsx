"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, MessageCircleHeart, ScanBarcode, Search, UserRound } from "lucide-react";

const ITEMS = [
  { href: "/", label: "Accueil", Icon: House },
  { href: "/recherche", label: "Chercher", Icon: Search },
  { href: "/scanner", label: "Scanner", Icon: ScanBarcode },
  { href: "/conseillere", label: "Conseils", Icon: MessageCircleHeart },
  { href: "/profil", label: "Profil", Icon: UserRound },
];

/**
 * Floating dock, on every screen size. It sits above the iPhone home indicator
 * (safe-area-inset-bottom); <main> keeps pb-32 so it never covers content.
 * Hidden on /bienvenue (it pins its own action bar) and /connexion (focus screen), and while the scanner's camera runs
 * (<html data-camera="on">, see globals.css), so "Arrêter" owns the bottom of the screen.
 */
export default function BottomNav() {
  const path = usePathname();
  // Focus screens: the welcome flow (its own pinned action bar) and sign-in ("Continuer sans compte" is the way out).
  if (path.startsWith("/bienvenue") || path.startsWith("/connexion")) return null;
  const activeIndex = ITEMS.findIndex(({ href }) => (href === "/" ? path === "/" : path.startsWith(href)));
  return (
    <nav
      className="bottom-nav pointer-events-none fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] print:hidden"
      aria-label="Navigation principale"
    >
      <ul className="pointer-events-auto relative mx-auto grid max-w-md grid-cols-5 rounded-full bg-white/92 p-1.5 shadow-float ring-1 ring-line backdrop-blur-md supports-[not(backdrop-filter:blur(1px))]:bg-white">
        {/* One pill that slides to the active item (transform only); hidden on pages outside the five. */}
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute inset-y-1.5 left-1.5 w-[calc((100%-0.75rem)/5)] rounded-full bg-brand-soft transition-[transform,opacity] duration-(--duration-slow) ease-(--ease-spring) motion-reduce:transition-none ${
            activeIndex < 0 ? "opacity-0" : "opacity-100"
          }`}
          style={{ transform: `translateX(${Math.max(activeIndex, 0) * 100}%)` }}
        />
        {ITEMS.map(({ href, label, Icon }, i) => {
          const active = i === activeIndex;
          return (
            <li key={href} className="relative">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`group flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-full px-1 py-1.5 text-[0.7rem] font-semibold leading-none transition-colors duration-150 ${
                  active ? "text-brand" : "text-ink/70 hover:text-ink"
                }`}
              >
                <Icon
                  size={21}
                  strokeWidth={active ? 2.1 : 1.75}
                  aria-hidden="true"
                  className="transition-transform duration-(--duration-base) ease-(--ease-spring) group-active:scale-90 motion-reduce:transition-none"
                />
                <span className="mt-0.5">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
