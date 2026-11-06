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

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]" aria-label="Navigation principale">
      <ul className="mx-auto flex max-w-md items-center justify-between rounded-full bg-white/95 px-2 py-1.5 shadow-lift ring-1 ring-caramel/30 backdrop-blur">
        {ITEMS.map(({ href, label, Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 rounded-full py-1.5 text-[0.7rem] font-semibold transition ${
                  active ? "text-brand" : "text-ink/55 hover:text-ink"
                }`}
              >
                <span className={`grid h-8 w-12 place-items-center rounded-full transition ${active ? "bg-gold/70" : ""}`}>
                  <Icon size={21} strokeWidth={active ? 2.2 : 1.8} />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
