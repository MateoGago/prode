import { createClient } from "@/shared/supabase/server";
import {
  mapMatchBreakdown,
  type BreakdownPredictionRow,
} from "../entities/match-breakdown";
import type { MatchBreakdownItem } from "../components/match-breakdown-list";

/**
 * A player's confirmed-match breakdown, read through the get_match_breakdown
 * RPC (SECURITY DEFINER) rather than a direct predictions SELECT.
 *
 * Why the RPC: the pred_select_own RLS policy only exposes the CALLER's own
 * predictions, so a direct select for another player silently returns zero
 * rows. The RPC mirrors get_leaderboard's pattern — it bypasses RLS to read
 * the data, then self-gates: you can always read your OWN breakdown (omit
 * groupId, as the "Inicio" dashboard does), and another player's only when
 * both of you belong to groupId. It returns only confirmed matches, so picks
 * for non-co-members or unfinished matches are never exposed.
 */
export async function getMatchBreakdown(
  userId: string,
  groupId: string | null = null,
): Promise<MatchBreakdownItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_match_breakdown", {
    p_user_id: userId,
    p_group_id: groupId,
  });

  if (error) {
    throw new Error(error.message);
  }

  // The RPC returns SETOF jsonb shaped exactly like BreakdownPredictionRow
  // (already filtered to confirmed matches and ordered by kickoff).
  const rows = data as unknown as BreakdownPredictionRow[] | null;

  return mapMatchBreakdown(rows);
}
