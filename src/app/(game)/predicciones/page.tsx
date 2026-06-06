import { redirect } from "next/navigation";

import { getCachedMatchesWithTeams } from "@/features/fixtures/actions/get-global-matches";
import { PredictionsPageClient } from "@/features/predictions/components/predictions-page-client";
import {
  buildPredictionsByMatchId,
  groupMatches,
  groupMatchesByDay,
  groupMatchesByRound,
  mapMatchRow,
  type PredictionReadRow,
} from "@/features/predictions/entities/predictions-page";
import { getCurrentUser } from "@/features/auth/actions/get-current-user";
import { createClient } from "@/shared/supabase/server";

export default async function PrediccionesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();

  // Matches are GLOBAL (cross-request cached); predictions are per-user (RLS,
  // never cached). Independent reads — run them together.
  const [matchesData, predictionsResult] = await Promise.all([
    getCachedMatchesWithTeams(),
    supabase
      .from("predictions")
      .select("match_id, home_score, away_score, advancer_team_id")
      .eq("user_id", user.id),
  ]);

  if (predictionsResult.error) {
    throw new Error(
      `load predictions failed: ${predictionsResult.error.message}`,
    );
  }

  const matches = matchesData.map(mapMatchRow);
  const initialPredictionsByMatchId = buildPredictionsByMatchId(
    (predictionsResult.data ?? []) as PredictionReadRow[],
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
