import { Skeleton } from "@/shared/ui/skeleton";

const ROW_KEYS = ["m1", "m2", "m3", "m4", "m5", "m6", "m7", "m8", "m9", "m10"];

/**
 * Instant fallback for /predicciones. Mirrors the page header + the segmented
 * view control + a list of match rows (same h-16 rounded-xl as a real match
 * card) so the heavy matches+predictions read streams in without a jump.
 */
export default function PrediccionesLoading() {
  return (
    <section className="grid gap-6">
      <header className="grid gap-1.5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-4 w-full max-w-prose" />
      </header>

      <Skeleton className="h-10 w-full max-w-xs rounded-pill" />

      <div className="grid gap-2.5">
        {ROW_KEYS.map((k) => (
          <Skeleton key={k} className="h-16 rounded-xl" />
        ))}
      </div>
    </section>
  );
}
