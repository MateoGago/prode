import { describe, expect, it } from "vitest";

import {
  mapLeaderboardRows,
  type GetLeaderboardRpcRow,
} from "@/features/leaderboard/entities/leaderboard";

describe("mapLeaderboardRows", () => {
  it("maps RPC fields to LeaderboardRow shape", () => {
    const raw: GetLeaderboardRpcRow[] = [
      {
        user_id: "uuid-1",
        display_name: "Alice",
        total_points: 42,
        hits: 5,
      },
    ];

    const result = mapLeaderboardRows(raw);

    expect(result).toEqual([
      { playerId: "uuid-1", playerName: "Alice", totalPoints: 42 },
    ]);
  });

  it("coerces string bigint total_points to number (LB-5, Postgres bigint)", () => {
    const raw: GetLeaderboardRpcRow[] = [
      {
        user_id: "uuid-2",
        display_name: "Bob",
        total_points: "12",
        hits: "3",
      },
    ];

    const result = mapLeaderboardRows(raw);

    expect(result[0].totalPoints).toBe(12);
    expect(typeof result[0].totalPoints).toBe("number");
  });

  it("returns [] for null/undefined input", () => {
    // biome-ignore lint/suspicious/noExplicitAny: testing null guard
    expect(mapLeaderboardRows(null as any)).toEqual([]);
    // biome-ignore lint/suspicious/noExplicitAny: testing undefined guard
    expect(mapLeaderboardRows(undefined as any)).toEqual([]);
  });

  it("returns [] for empty array", () => {
    expect(mapLeaderboardRows([])).toEqual([]);
  });

  it("preserves players with 0 points (LB-5)", () => {
    const raw: GetLeaderboardRpcRow[] = [
      {
        user_id: "uuid-3",
        display_name: "Charlie",
        total_points: 0,
        hits: 0,
      },
    ];

    const result = mapLeaderboardRows(raw);

    expect(result).toEqual([
      { playerId: "uuid-3", playerName: "Charlie", totalPoints: 0 },
    ]);
  });

  it("maps multiple rows correctly", () => {
    const raw: GetLeaderboardRpcRow[] = [
      { user_id: "u1", display_name: "Alice", total_points: 10, hits: 2 },
      { user_id: "u2", display_name: "Bob", total_points: "5", hits: "1" },
      { user_id: "u3", display_name: "Charlie", total_points: 0, hits: 0 },
    ];

    const result = mapLeaderboardRows(raw);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      playerId: "u1",
      playerName: "Alice",
      totalPoints: 10,
    });
    expect(result[1]).toEqual({
      playerId: "u2",
      playerName: "Bob",
      totalPoints: 5,
    });
    expect(result[2]).toEqual({
      playerId: "u3",
      playerName: "Charlie",
      totalPoints: 0,
    });
  });
});
