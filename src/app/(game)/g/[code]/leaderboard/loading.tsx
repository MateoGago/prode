import { Skeleton } from "@/shared/ui/skeleton";

const ROW_KEYS = ["p1", "p2", "p3", "p4", "p5", "p6"];

/**
 * Instant fallback for /g/[code]/leaderboard. The group-shell layout has already
 * resolved (membership gate + switcher) by the time this shows, so it only
 * covers the getLeaderboard RPC: header + invite button, podium, and rows.
 */
export default function LeaderboardLoading() {
  return (
    <section className="grid gap-6">
      <header className="flex items-start justify-between gap-3">
        <div className="grid gap-1.5">
          <Skeleton className="h-9 w-44" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-24 rounded-pill" />
      </header>

      {/* Podium */}
      <div className="grid grid-cols-3 items-end gap-3">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>

      <div className="grid gap-2">
        {ROW_KEYS.map((k) => (
          <Skeleton key={k} className="h-14 rounded-xl" />
        ))}
      </div>
    </section>
  );
}
