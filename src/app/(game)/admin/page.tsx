import { redirect } from "next/navigation";

import { confirmResultAction } from "@/features/results";
import { ConfirmResultForm } from "@/features/results";
import { selectCorrectableMatches } from "@/features/results/actions/select-correctable-matches";
import { createClient } from "@/shared/supabase/server";

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
      <header className="grid gap-3">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight">
          Panel de administración
        </h1>
        <p className="max-w-prose text-muted-foreground">
          Cargá o corregí el resultado final de un partido. Al confirmar se
          recalculan los puntos de todas las predicciones de ese partido.
        </p>
      </header>

      {matches.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          No hay partidos para corregir todavía.
        </div>
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
