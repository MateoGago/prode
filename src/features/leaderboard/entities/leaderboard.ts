import type { LeaderboardRow } from "../components/leaderboard-table";

export type Ranked<T> = T & { rank: number };

/**
 * The single source of truth for leaderboard ranking: SEQUENTIAL positions
 * 1..n, never shared on ties. Rows are ordered by total points DESC and, when
 * points are equal, alphabetically by player name (es locale). So three players
 * on 1 pt read 1,2,3 — not 1,1,1 or 1,1,3 — and the next group continues 4,5,…
 * Returns a new array; the input is not mutated.
 *
 * Consumed by the leaderboard table, the dashboard player stats, and the group
 * switcher summary so the rule lives in exactly one place — table position and
 * "tu puesto" can never disagree.
 */
export function rankByPoints<
  T extends { totalPoints: number; playerName: string },
>(rows: T[]): Ranked<T>[] {
  const sorted = [...rows].sort(
    (a, b) =>
      b.totalPoints - a.totalPoints ||
      a.playerName.localeCompare(b.playerName, "es"),
  );

  return sorted.map((row, index) => ({ ...row, rank: index + 1 }));
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
