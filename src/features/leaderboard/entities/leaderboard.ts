import type { LeaderboardRow } from "../components/leaderboard-table";

export type GetLeaderboardRpcRow = {
  user_id: string;
  display_name: string;
  total_points: number | string;
  hits: number | string;
};

export function mapLeaderboardRows(
  raw: GetLeaderboardRpcRow[] | null | undefined,
): LeaderboardRow[] {
  if (!raw) return [];

  return raw.map((row) => ({
    playerId: row.user_id,
    playerName: row.display_name,
    totalPoints: Number(row.total_points),
  }));
}
