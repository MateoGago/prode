import { Skeleton } from "@/shared/ui/skeleton";

const GROUP_KEYS = ["g1", "g2", "g3"];
const RESULT_KEYS = ["r1", "r2", "r3"];

/**
 * Instant fallback for the home hub (/). Mirrors InicioContent: greeting,
 * "Tus grupos" grid, then the two-column hero + stats/últimos-resultados block,
 * reserving the same heights so the real content swaps in without layout shift.
 */
export default function HomeLoading() {
  return (
    <div className="grid gap-6">
      {/* Greeting */}
      <div className="grid gap-2">
        <Skeleton className="h-9 w-64 max-w-[80%]" />
        <Skeleton className="h-4 w-52" />
      </div>

      {/* Tus grupos */}
      <section className="grid gap-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-8 w-28 rounded-pill" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {GROUP_KEYS.map((k) => (
            <Skeleton key={k} className="h-[76px] rounded-xl" />
          ))}
        </div>
      </section>

      {/* Hero + stats/resultados */}
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-start">
        <div className="grid gap-3">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-[232px] rounded-2xl" />
        </div>
        <div className="grid gap-6">
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-[92px] rounded-xl" />
            <Skeleton className="h-[92px] rounded-xl" />
          </div>
          <div className="grid gap-3">
            <Skeleton className="h-6 w-40" />
            <div className="grid gap-2.5">
              {RESULT_KEYS.map((k) => (
                <Skeleton key={k} className="h-[58px] rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
