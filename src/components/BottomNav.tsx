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
 */
export default function BottomNav() {
  const path = usePathname();
  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] print:hidden"
      aria-label="Navigation principale"
    >
      <ul className="pointer-events-auto mx-auto flex max-w-md items-stretch justify-between gap-0.5 rounded-full bg-white/92 p-1.5 shadow-float ring-1 ring-line backdrop-blur-md supports-[not(backdrop-filter:blur(1px))]:bg-white">
        {ITEMS.map(({ href, label, Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-full px-1 py-1.5 text-[0.7rem] font-semibold leading-none transition-colors duration-150 ${
                  active ? "bg-brand-soft text-brand" : "text-ink/70 hover:bg-paper hover:text-ink"
                }`}
              >
                <Icon size={21} strokeWidth={active ? 2.1 : 1.75} aria-hidden="true" />
                <span className="mt-0.5">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
