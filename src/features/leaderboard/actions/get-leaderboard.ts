import { cache } from "react";

import { createClient } from "@/shared/supabase/server";
import {
  mapLeaderboardRows,
  type GetLeaderboardRpcRow,
} from "../entities/leaderboard";
import type { LeaderboardRow } from "../components/leaderboard-table";

/**
 * Per-request memoized so the group layout's switcher and the leaderboard page
 * (both reading the active group) share a single get_leaderboard RPC round-trip.
 */
export const getLeaderboard = cache(async function getLeaderboard(
  groupId: string,
): Promise<LeaderboardRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_leaderboard", {
    p_group_id: groupId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return mapLeaderboardRows(data as GetLeaderboardRpcRow[]);
});
