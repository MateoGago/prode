import { redirect } from "next/navigation";

import { confirmResultAction } from "@/features/results";
import { ConfirmResultForm } from "@/features/results";
import { selectCorrectableMatches } from "@/features/results/actions/select-correctable-matches";
import { createClient } from "@/shared/supabase/server";
import { EmptyState } from "@/shared/ui/empty-state";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") redirect("/");

  const matches = await selectCorrectableMatches();

  return (
    <section className="grid gap-6">
      <header className="grid gap-1.5">
        <p className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Administración
        </p>
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Panel de resultados
        </h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          Cargá o corregí el resultado final de un partido. Al confirmar se
          recalculan los puntos de todas las predicciones de ese partido.
        </p>
      </header>

      {matches.length === 0 ? (
        <EmptyState title="No hay partidos para corregir todavía." />
      ) : (
        <div className="grid gap-4">
          {matches.map((match) => (
            <ConfirmResultForm
              key={match.matchId}
              matchId={match.matchId}
              round={match.round}
              homeTeam={match.homeTeam}
              awayTeam={match.awayTeam}
              defaultHomeScore={match.homeScore ?? undefined}
              defaultAwayScore={match.awayScore ?? undefined}
              onSubmit={confirmResultAction}
            />
          ))}
        </div>
      )}
    </section>
  );
}
