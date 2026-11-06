import { CardSkeleton, Skeleton } from "@/components/ui";

/** Shown while a page loads during navigation. */
export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Chargement">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-9 w-3/4" />
      <Skeleton className="h-4 w-2/3" />
      <div className="space-y-3 pt-2">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}
