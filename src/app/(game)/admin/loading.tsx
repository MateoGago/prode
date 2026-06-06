import { Skeleton } from "@/shared/ui/skeleton";

const CARD_KEYS = ["c1", "c2", "c3", "c4"];

/**
 * Fallback for /admin. Without it, the (game)/loading.tsx home skeleton would
 * cascade here (wrong content). Mirrors the admin header + the confirm-result
 * card list. The role gate (redirect('/')) runs in the page; once any ancestor
 * loading.tsx exists it resolves client-side — acceptable, since the RLS policy
 * and the server-action role checks remain the real boundary.
 */
export default function AdminLoading() {
  return (
    <section className="grid gap-6">
      <header className="grid gap-1.5">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-full max-w-prose" />
      </header>
      <div className="grid gap-4">
        {CARD_KEYS.map((k) => (
          <Skeleton key={k} className="h-28 rounded-xl" />
        ))}
      </div>
    </section>
  );
}
