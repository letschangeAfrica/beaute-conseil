/**
 * Opened-product tracker: when a product was opened and until when to use it
 * (the "period after opening", the open-jar symbol such as 12M). Pure date maths, isomorphic.
 */

export interface OpenedItem {
  code: string;
  name: string;
  brand: string;
  image?: string;
  /** Day she opened it, "YYYY-MM-DD". */
  openedAt: string;
  /** Months it keeps once opened. */
  months: number;
}

export type ExpiryStatus = "ok" | "soon" | "expired";

/** Usual periods after opening, for the picker (months). */
export const PAO_CHOICES = [3, 6, 12, 18, 24, 36] as const;
export const DEFAULT_PAO = 12;
/** "À finir bientôt" from this many days before the end. */
export const SOON_DAYS = 30;

const DAY_MS = 86_400_000;
const parseDay = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

/** Last day of use, "YYYY-MM-DD". Month arithmetic clamps to the month's end (31 Jan + 1 month = 28/29 Feb). */
export function useBy(item: Pick<OpenedItem, "openedAt" | "months">): string {
  const [y, m, d] = item.openedAt.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + item.months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}

/** Whole days from `today` until the use-by day (negative once past). */
export function daysLeft(item: Pick<OpenedItem, "openedAt" | "months">, today: string): number {
  return Math.round((parseDay(useBy(item)) - parseDay(today)) / DAY_MS);
}

export function expiryStatus(item: Pick<OpenedItem, "openedAt" | "months">, today: string): ExpiryStatus {
  const left = daysLeft(item, today);
  return left < 0 ? "expired" : left <= SOON_DAYS ? "soon" : "ok";
}

/** Today in the user's time zone, "YYYY-MM-DD". */
export function todayLocal(now = new Date()): string {
  const off = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - off).toISOString().slice(0, 10);
}

/** Plain French: "Expiré depuis 3 jours", "Encore 12 jours", "Encore 4 mois". */
export function leftLabel(left: number): string {
  if (left < 0) return `Expiré depuis ${-left} jour${-left > 1 ? "s" : ""}`;
  if (left === 0) return "À finir aujourd'hui";
  if (left <= 60) return `Encore ${left} jour${left > 1 ? "s" : ""}`;
  return `Encore ${Math.round(left / 30.44)} mois`;
}

export const formatDay = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
