import { redirect } from "next/navigation";

import { PredictionsPageClient } from "@/features/predictions";
import {
  buildPredictionsByMatchId,
  groupMatches,
  groupMatchesByDay,
  groupMatchesByRound,
  mapMatchRow,
  type MatchWithTeamsRow,
  type PredictionReadRow,
} from "@/features/predictions/entities/predictions-page";
import { getCurrentUser } from "@/features/auth/actions/get-current-user";
import { createClient } from "@/shared/supabase/server";

export default async function PrediccionesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();

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

  // The "Etapa" view + group progress stay group-only (groupMatches filters by
  // round internally). The "Día" view additionally shows knockout matches whose
  // teams are already resolved (e.g. the Round of 32 once the groups finish);
  // unresolved knockout slots (still W74/3A-B-C…) are hidden until they fill.
  const displayMatches = matches.filter(
    (m) => m.round === "group" || (m.homeTeam !== null && m.awayTeam !== null),
  );
  const groups = groupMatches(matches);
  const days = groupMatchesByDay(displayMatches);
  const rounds = groupMatchesByRound(matches);

  return (
    <section className="grid gap-6">
      <header className="grid gap-1.5">
        <p className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Mundial 2026
        </p>
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Partidos
        </h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          Cargá y guardá tus resultados partido por partido. Las rondas de
          eliminación aparecen en la vista por día a medida que se definen.
        </p>
      </header>

      <PredictionsPageClient
        groups={groups}
        days={days}
        rounds={rounds}
        initialPredictionsByMatchId={initialPredictionsByMatchId}
      />
    </section>
  );
}
