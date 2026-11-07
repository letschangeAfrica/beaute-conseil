import { Skeleton } from "@/components/ui";

/**
 * Shown while a page loads during navigation. Generic on purpose (it appears on every route):
 * an eyebrow, a title, a subtitle, then three content blocks.
 */
export default function Loading() {
  return (
    // Wide-capable shell with a narrow, centred column: <main> keeps the same width whether the page
    // that streams in is wide (Home, Search…) or narrow, so the swap never shifts the layout.
    <div data-layout="wide">
      <div aria-busy="true" aria-label="Chargement" className="flex flex-col gap-3 lg:mx-auto lg:max-w-[39rem]">
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
    </div>
  );
}
