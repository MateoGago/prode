import { redirect } from "next/navigation";

import { PredictionsPageClient } from "@/features/predictions";
import {
  buildPredictionsByMatchId,
  groupMatches,
  groupMatchesByDay,
  mapMatchRow,
  type MatchWithTeamsRow,
  type PredictionReadRow,
} from "@/features/predictions/entities/predictions-page";
import { createClient } from "@/shared/supabase/server";

export default async function PrediccionesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: matchesData, error: matchesError } = await supabase
    .from("matches")
    .select(
      `
      id,
      external_ref,
      round,
      multiplier,
      matchday,
      home_placeholder,
      away_placeholder,
      kickoff_at,
      status,
      home_score,
      away_score,
      result_confirmed_at,
      home_team:teams!matches_home_team_id_fkey (
        id, external_ref, name, group_label, flag_url
      ),
      away_team:teams!matches_away_team_id_fkey (
        id, external_ref, name, group_label, flag_url
      )
    `,
    )
    .eq("round", "group")
    .order("kickoff_at", { ascending: true });

  if (matchesError) {
    throw new Error(`load matches failed: ${matchesError.message}`);
  }

  const { data: predictionsData, error: predictionsError } = await supabase
    .from("predictions")
    .select("match_id, home_score, away_score, advancer_team_id")
    .eq("user_id", user.id);

  if (predictionsError) {
    throw new Error(`load predictions failed: ${predictionsError.message}`);
  }

  const matches = ((matchesData ?? []) as MatchWithTeamsRow[]).map(mapMatchRow);
  const initialPredictionsByMatchId = buildPredictionsByMatchId(
    (predictionsData ?? []) as PredictionReadRow[],
  );
  const groups = groupMatches(matches);
  const days = groupMatchesByDay(matches);

  return (
    <section className="grid gap-6">
      <header className="grid gap-1.5">
        <p className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Fase de grupos
        </p>
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Partidos
        </h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          Cargá y guardá tus resultados partido por partido. Podés avanzar de
          forma progresiva por grupo y jornada.
        </p>
      </header>

      <PredictionsPageClient
        groups={groups}
        days={days}
        initialPredictionsByMatchId={initialPredictionsByMatchId}
      />
    </section>
  );
}
