"use server";

/**
 * listMyGroups — returns a summary of all groups the current user belongs to.
 *
 * Per-group position and points are derived by calling getLeaderboard(groupId)
 * for each membership and finding the caller's row.
 *
 * TODO(scale): N+1 — one get_leaderboard RPC call per group. Acceptable at
 * current scale (11 users, expected few groups). Replace with a dedicated
 * summary SQL view or a batch RPC when group/member count grows.
 */

import { getCurrentUser } from "@/features/auth/actions/get-current-user";
import { getLeaderboard } from "@/features/leaderboard/actions/get-leaderboard";
import { createClient } from "@/shared/supabase/server";

export interface GroupSummary {
  groupId: string;
  name: string;
  inviteCode: string;
  /** Caller's dense-rank position in this group; null if no points yet. */
  position: number | null;
  /** Caller's total points in this group. */
  points: number;
}

type GroupMemberRow = {
  group_id: string;
  groups: {
    id: string;
    name: string;
    invite_code: string;
  };
};

export async function listMyGroups(): Promise<GroupSummary[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const supabase = await createClient();

  const { data: memberships, error } = await supabase
    .from("group_members")
    .select("group_id, groups ( id, name, invite_code )")
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  if (!memberships || memberships.length === 0) return [];

  const rows = memberships as unknown as GroupMemberRow[];

  const summaries = await Promise.all(
    rows.map(async (m) => {
      const g = m.groups;
      const leaderboard = await getLeaderboard(g.id);

      // Derive position (dense rank, DESC points) and the caller's points.
      const sorted = [...leaderboard].sort(
        (a, b) => b.totalPoints - a.totalPoints,
      );

      let rank = 0;
      let lastPoints: number | null = null;
      let callerPosition: number | null = null;
      let callerPoints = 0;

      for (let i = 0; i < sorted.length; i++) {
        const row = sorted[i];
        if (lastPoints === null || row.totalPoints !== lastPoints) {
          rank = i + 1;
          lastPoints = row.totalPoints;
        }
        if (row.playerId === user.id) {
          callerPosition = rank;
          callerPoints = row.totalPoints;
        }
      }

      return {
        groupId: g.id,
        name: g.name,
        inviteCode: g.invite_code,
        position: callerPosition,
        points: callerPoints,
      } satisfies GroupSummary;
    }),
  );

  return summaries;
}
