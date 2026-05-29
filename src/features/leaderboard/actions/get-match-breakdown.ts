import { createClient } from "@/shared/supabase/server";
import {
  mapMatchBreakdown,
  type BreakdownPredictionRow,
} from "../entities/match-breakdown";
import type { MatchBreakdownItem } from "../components/match-breakdown-list";

export async function getMatchBreakdown(
  userId: string,
): Promise<MatchBreakdownItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("predictions")
    .select(
      `match_id,
       home_score,
       away_score,
       points_awarded,
       match:matches!predictions_match_id_fkey(
         home_score,
         away_score,
         status,
         kickoff_at,
         home_team:teams!matches_home_team_id_fkey(name),
         away_team:teams!matches_away_team_id_fkey(name)
       )`,
    )
    .eq("user_id", userId)
    .order("kickoff_at", { referencedTable: "match", ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  // Filter to confirmed matches only — the embedded match filter via PostgREST
  // would require a separate inner join syntax; filtering in the mapper is simpler
  // and keeps the action testable.
  //
  // Supabase infers embedded objects as arrays when it cannot determine FK
  // cardinality from the generated types. We cast through unknown to our
  // domain type which correctly models the one-to-one relation.
  const rows = data as unknown as BreakdownPredictionRow[] | null;
  const confirmed = rows?.filter((row) => row.match?.status === "confirmed");

  return mapMatchBreakdown(confirmed);
}
