"use client";
import Link from "next/link";
import { ArrowRight, CalendarClock } from "lucide-react";
import { daysLeft, expiryStatus, todayLocal } from "@/lib/expiry";
import { useOpened } from "@/lib/useLocal";

/** Home: a quiet reminder when an opened product is close to (or past) its use-by date. Renders nothing otherwise. */
export function OpenedReminder() {
  const { items, ready } = useOpened();
  if (!ready) return null;
  const today = todayLocal();
  const due = items.filter((i) => expiryStatus(i, today) !== "ok").sort((a, b) => daysLeft(a, today) - daysLeft(b, today));
  if (!due.length) return null;
  const expired = due.filter((i) => expiryStatus(i, today) === "expired").length;
  const first = due[0];

  return (
    <Link href="/mes-produits" className="card-interactive flex items-center gap-4 p-4 sm:p-5">
      <span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-warn-soft text-warn">
        <CalendarClock size={22} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-ink">
          {due.length === 1 ? "1 produit ouvert" : `${due.length} produits ouverts`} {expired ? "à vérifier" : "à finir bientôt"}
        </span>
        <span className="block truncate text-sm text-ink/75">
          {first.brand ? `${first.brand} · ` : ""}
          {first.name}
          {due.length > 1 ? ` et ${due.length - 1} autre${due.length > 2 ? "s" : ""}` : ""}
        </span>
      </span>
      <ArrowRight size={20} aria-hidden="true" className="shrink-0 text-brand" />
    </Link>
  );
}
