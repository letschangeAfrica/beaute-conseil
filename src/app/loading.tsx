import { Skeleton } from "@/components/ui";

/**
 * Shown while a page loads during navigation. Generic on purpose (it appears on every route):
 * an eyebrow, a title, a subtitle, then three content blocks.
 */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Chargement" className="flex flex-col gap-3">
      <span className="sr-only" role="status">
        Chargement…
      </span>
      <Skeleton className="h-3 w-24 rounded-full" />
      <Skeleton className="h-9 w-3/4 rounded-lg" />
      <Skeleton className="h-4 w-2/3 rounded-full" />
      <div className="mt-6 flex flex-col gap-4">
        <Skeleton className="h-36 w-full rounded-card" />
        <Skeleton className="h-24 w-full rounded-card" />
        <Skeleton className="h-24 w-5/6 rounded-card" />
      </div>
    </div>
  );
}
