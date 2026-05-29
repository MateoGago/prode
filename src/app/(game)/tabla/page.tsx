import { getLeaderboard, LeaderboardTable } from "@/features/leaderboard";
import { createClient } from "@/shared/supabase/server";

export default async function TablaPage() {
  const supabase = await createClient();

  // Independent reads — fetch in parallel to avoid a request waterfall.
  const [
    {
      data: { user },
    },
    rows,
  ] = await Promise.all([supabase.auth.getUser(), getLeaderboard()]);

  return (
    <section className="grid gap-6">
      <div className="grid gap-1">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight">
          Tabla de posiciones
        </h1>
        <p className="text-sm text-muted-foreground">
          Ranking acumulado de todos los jugadores.
        </p>
      </div>

      <LeaderboardTable
        rows={rows}
        highlightPlayerId={user?.id}
        getPlayerHref={(row) => `/tabla/${row.playerId}`}
        emptyMessage="Todavía no hay puntos cargados."
      />
    </section>
  );
}
