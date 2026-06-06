import { getCachedMatchesWithTeams } from "@/features/fixtures/actions/get-global-matches";
import { getMatchBreakdown } from "@/features/leaderboard/actions/get-match-breakdown";
import { getPredictionsProgress } from "@/features/predictions/actions/get-predictions-progress";
import type { PredictionProgress } from "@/features/predictions/entities/predictions-board";
import { mapMatchRow } from "@/features/predictions/entities/predictions-page";
import { createClient } from "@/shared/supabase/server";

import {
  countPendingPredictions,
  mapLastResults,
  selectNextMatch,
  type LastResultRow,
} from "../entities/inicio";
import type { Match } from "@/features/fixtures/entities/match";

export interface DashboardData {
  totalMatches: number;
  /** Confirmed predictions the player has scored — "jugados" numerator. */
  played: number;
  /**
   * Group-stage load progress ("X/72 cargadas") — the SAME number the app-nav
   * badge shows, from the shared getPredictionsProgress helper. Distinct from
   * `played` (scored) and `totalMatches` (all fixtures incl. knockout).
   */
  predictionsProgress: PredictionProgress;
  nextMatch: Match | null;
  pendingPredictions: number;
  lastResults: LastResultRow[];
}

/**
 * Composes the "Inicio" dashboard from existing feature reads — no new domain
 * logic, just orchestration. Pure derivation lives in entities/inicio.ts.
 */
export async function getDashboard(
  userId: string,
  now: Date = new Date(),
): Promise<DashboardData> {
  const supabase = await createClient();

  // Independent reads — run in parallel to avoid a request waterfall. Matches
  // are GLOBAL (cross-request cached); the rest are per-user RLS reads.
  const [matchesRows, predictionsResult, breakdown, predictionsProgress] =
    await Promise.all([
      getCachedMatchesWithTeams(),
      supabase.from("predictions").select("match_id").eq("user_id", userId),
      getMatchBreakdown(userId),
      getPredictionsProgress(userId),
    ]);

  if (predictionsResult.error) {
    throw new Error(
      `load predictions failed: ${predictionsResult.error.message}`,
    );
  }

  const matches = matchesRows.map(mapMatchRow);
  const predictedMatchIds = new Set(
    ((predictionsResult.data ?? []) as { match_id: string }[]).map(
      (r) => r.match_id,
    ),
  );

  return {
    totalMatches: matches.length,
    played: breakdown.length,
    predictionsProgress,
    nextMatch: selectNextMatch(matches, now),
    pendingPredictions: countPendingPredictions(
      matches,
      predictedMatchIds,
      now,
    ),
    lastResults: mapLastResults(breakdown),
  };
}
