import type { LeaderboardRow } from "../components/leaderboard-table";

export type Ranked<T> = T & { rank: number };

/**
 * The single source of truth for leaderboard ranking: total points DESC with
 * standard competition ranking (tied rows share a rank, the next rank skips —
 * e.g. 50,50,10 → 1,1,3). Returns a new array; the input is not mutated.
 *
 * Consumed by the leaderboard table, the dashboard player stats, and the group
 * switcher summary so the rule lives in exactly one place.
 */
export function rankByPoints<T extends { totalPoints: number }>(
  rows: T[],
): Ranked<T>[] {
  const sorted = [...rows].sort((a, b) => b.totalPoints - a.totalPoints);

  let lastPoints: number | null = null;
  let lastRank = 0;

  return sorted.map((row, index) => {
    const rank = lastPoints === row.totalPoints ? lastRank : index + 1;
    lastPoints = row.totalPoints;
    lastRank = rank;
    return { ...row, rank };
  });
}

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
