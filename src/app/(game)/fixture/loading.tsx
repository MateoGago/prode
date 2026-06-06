import { Skeleton } from "@/shared/ui/skeleton";

const GROUP_KEYS = ["A", "B", "C", "D"];

/**
 * Instant fallback for /fixture. Mirrors the page header + the view tabs + the
 * group-standings tables grid, so the matches+teams join and the standings/
 * bracket CPU derivations stream in behind a stable shell.
 */
export default function FixtureLoading() {
  return (
    <section className="grid gap-6">
      <header className="grid gap-1.5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-4 w-full max-w-prose" />
      </header>

      <Skeleton className="h-10 w-56 rounded-pill" />

      <div className="grid gap-4 sm:grid-cols-2">
        {GROUP_KEYS.map((k) => (
          <Skeleton key={k} className="h-48 rounded-xl" />
        ))}
      </div>
    </section>
  );
}
