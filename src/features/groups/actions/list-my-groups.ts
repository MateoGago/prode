"use server";

/**
 * listMyGroups — summary of every group the current user belongs to, with the
 * caller's position + points per group.
 *
 * Two round-trips total, regardless of group count: one for the memberships
 * (group metadata) and one get_group_leaderboards RPC for every group's
 * standings at once. Ranking (shared rank on ties) is the shared rankByPoints.
 */

import { getCurrentUser } from "@/features/auth/actions/get-current-user";
import {
  type GetLeaderboardRpcRow,
  mapLeaderboardRows,
  rankByPoints,
} from "@/features/leaderboard/entities/leaderboard";
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

type GroupLeaderboardRpcRow = GetLeaderboardRpcRow & { group_id: string };

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
  const groupIds = rows.map((m) => m.group_id);

  const { data: lbData, error: lbError } = await supabase.rpc(
    "get_group_leaderboards",
    { p_group_ids: groupIds },
  );
  if (lbError) {
    throw new Error(lbError.message);
  }

  // Bucket the flat RPC rows by group so each group ranks independently.
  const rowsByGroup = new Map<string, GetLeaderboardRpcRow[]>();
  for (const row of (lbData ?? []) as GroupLeaderboardRpcRow[]) {
    const bucket = rowsByGroup.get(row.group_id) ?? [];
    bucket.push(row);
    rowsByGroup.set(row.group_id, bucket);
  }

  return rows.map((m) => {
    const g = m.groups;
    const leaderboard = mapLeaderboardRows(rowsByGroup.get(g.id) ?? []);
    const own = rankByPoints(leaderboard).find((r) => r.playerId === user.id);

    return {
      groupId: g.id,
      name: g.name,
      inviteCode: g.invite_code,
      position: own?.rank ?? null,
      points: own?.totalPoints ?? 0,
    } satisfies GroupSummary;
  });
}
