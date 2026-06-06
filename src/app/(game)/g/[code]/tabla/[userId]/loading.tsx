import { Skeleton } from "@/shared/ui/skeleton";

const ROW_KEYS = ["b1", "b2", "b3", "b4", "b5", "b6"];

/**
 * Instant fallback for /g/[code]/tabla/[userId]. The co-member gates resolve in
 * the page before the breakdown read; this mirrors the back-link, title block,
 * and the confirmed-match breakdown rows.
 */
export default function BreakdownLoading() {
  return (
    <section className="grid gap-6">
      <div className="grid gap-1.5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-44" />
      </div>

      <div className="grid gap-2">
        {ROW_KEYS.map((k) => (
          <Skeleton key={k} className="h-16 rounded-xl" />
        ))}
      </div>
    </section>
  );
}
