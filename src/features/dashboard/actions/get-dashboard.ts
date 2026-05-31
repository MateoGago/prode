import { getMatchBreakdown } from "@/features/leaderboard";
import { getPredictionsProgress } from "@/features/predictions";
import type { PredictionProgress } from "@/features/predictions";
import {
  mapMatchRow,
  type MatchWithTeamsRow,
} from "@/features/predictions/entities/predictions-page";
import { createClient } from "@/shared/supabase/server";

import {
  countPendingPredictions,
  mapLastResults,
  selectNextMatch,
  type LastResultRow,
} from "../entities/inicio";
import type { Match } from "@/features/fixtures/entities/match";

export interface DashboardData {
  // TODO(prode-groups PR4): home hub — replace with per-group stats from
  // listMyGroups(). Global position/points removed (no global leaderboard).
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

  // Independent reads — run in parallel to avoid a request waterfall.
  const [matchesResult, predictionsResult, breakdown, predictionsProgress] =
    await Promise.all([
      supabase
        .from("matches")
        .select(
          `
          id, external_ref, round, multiplier, matchday,
          home_placeholder, away_placeholder, kickoff_at, status,
          home_score, away_score, result_confirmed_at,
          home_team:teams!matches_home_team_id_fkey (
            id, external_ref, name, group_label, flag_url
          ),
          away_team:teams!matches_away_team_id_fkey (
            id, external_ref, name, group_label, flag_url
          )
        `,
        )
        .order("kickoff_at", { ascending: true }),
      supabase.from("predictions").select("match_id").eq("user_id", userId),
      getMatchBreakdown(userId),
      getPredictionsProgress(userId),
    ]);

  if (matchesResult.error) {
    throw new Error(`load matches failed: ${matchesResult.error.message}`);
  }
  if (predictionsResult.error) {
    throw new Error(
      `load predictions failed: ${predictionsResult.error.message}`,
    );
  }

  const matches = ((matchesResult.data ?? []) as MatchWithTeamsRow[]).map(
    mapMatchRow,
  );
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
