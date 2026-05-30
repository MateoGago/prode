import { createClient } from "@/shared/supabase/server";
import {
  mapLeaderboardRows,
  type GetLeaderboardRpcRow,
} from "../entities/leaderboard";
import type { LeaderboardRow } from "../components/leaderboard-table";

export async function getLeaderboard(): Promise<LeaderboardRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_leaderboard");

  if (error) {
    throw new Error(error.message);
  }

  return mapLeaderboardRows(data as GetLeaderboardRpcRow[]);
}
