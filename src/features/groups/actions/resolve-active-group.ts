/**
 * resolveActiveGroup — server-side helper (NOT a 'use server' action).
 *
 * Called by the /g/[code] layout to:
 *  1. Resolve the invite code to a group row (notFound() on miss — REQ-06).
 *  2. Verify the current user is a member (redirect to /onboarding if not
 *     — REQ-06, REQ-07).
 *
 * Returns { groupId, group } on success. Internal errors bubble up as
 * infrastructure exceptions; domain failures redirect/404.
 *
 * Import restriction: do NOT add 'use server' — this is a server module
 * called by layouts, not a client-callable action endpoint.
 *
 * Wrapped with React.cache() so multiple RSC segments in the same request
 * (layout + leaderboard page + tabla page) share a single DB round-trip.
 */

import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/shared/supabase/server";
import type { Group } from "../entities/membership";

export interface ActiveGroupContext {
  groupId: string;
  group: Group;
}

export const resolveActiveGroup = cache(async function resolveActiveGroup(
  code: string,
): Promise<ActiveGroupContext> {
  const supabase = await createClient();

  const { data: row, error } = await supabase
    .from("groups")
    .select("id, owner_id, name, invite_code, created_at")
    .eq("invite_code", code)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!row) {
    notFound();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Use RPC helper to check membership without RLS recursion.
  const { data: isMember, error: memberErr } = await supabase.rpc(
    "is_group_member",
    { p_group_id: row.id, p_user_id: user.id },
  );

  if (memberErr) {
    throw new Error(memberErr.message);
  }

  if (!isMember) {
    redirect("/onboarding");
  }

  const group: Group = {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    inviteCode: row.invite_code,
    createdAt: new Date(row.created_at),
  };

  return { groupId: row.id, group };
});
