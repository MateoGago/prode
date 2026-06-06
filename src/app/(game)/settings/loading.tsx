import { Skeleton } from "@/shared/ui/skeleton";

/**
 * Instant fallback for /settings — mirrors the title block and the single
 * name-edit card so the swap to real content causes no layout shift.
 */
export default function SettingsLoading() {
  return (
    <section className="grid max-w-md gap-6">
      <div className="grid gap-1.5">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="grid gap-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-11 w-full rounded-md" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-11 w-full rounded-md sm:w-32 sm:justify-self-end" />
        </div>
      </div>
    </section>
  );
}
