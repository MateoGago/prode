"use server";

/**
 * leaveGroup — removes the current user's own membership from a group.
 *
 * A non-owner member can leave freely. The group owner CANNOT leave (that would
 * orphan the group) — they must delete the group instead. This is guarded both
 * here (clear domain error) and at the DB via RLS (the leave policy excludes the
 * owner). Returns a discriminated union — never throws on domain failures.
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/shared/supabase/server";

export type LeaveGroupResult =
  | { ok: true }
  | {
      ok: false;
      reason: "unauthenticated" | "invalid_code" | "owner_cannot_leave";
    };

export async function leaveGroup(code: string): Promise<LeaveGroupResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, reason: "unauthenticated" };
  }

  const { data: group, error: lookupErr } = await supabase
    .from("groups")
    .select("id, owner_id")
    .eq("invite_code", code)
    .maybeSingle();

  if (lookupErr) {
    throw new Error(lookupErr.message);
  }

  if (!group) {
    return { ok: false, reason: "invalid_code" };
  }

  if (group.owner_id === user.id) {
    return { ok: false, reason: "owner_cannot_leave" };
  }

  const { error: deleteErr } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", group.id)
    .eq("user_id", user.id);

  if (deleteErr) {
    throw new Error(deleteErr.message);
  }

  revalidatePath("/");
  return { ok: true };
}
