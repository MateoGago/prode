"use server";

/**
 * removeMember — the group owner kicks another member out of the group.
 *
 * Authorization is enforced at the DB by RLS: the delete policy only matches
 * when the caller owns the group and the target is not themselves. We mirror the
 * self-removal guard here for a clear domain error, and inspect the deleted rows
 * (via .select()) to distinguish a real removal from an RLS-blocked no-op — the
 * latter surfaces as "forbidden" instead of a silent success.
 * Returns a discriminated union — never throws on domain failures.
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/shared/supabase/server";

export type RemoveMemberResult =
  | { ok: true }
  | {
      ok: false;
      reason: "unauthenticated" | "cannot_remove_self" | "forbidden";
    };

export async function removeMember(
  groupId: string,
  userId: string,
): Promise<RemoveMemberResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, reason: "unauthenticated" };
  }

  if (userId === user.id) {
    return { ok: false, reason: "cannot_remove_self" };
  }

  const { data, error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .select();

  if (error) {
    throw new Error(error.message);
  }

  // RLS blocked the delete (caller is not the owner) or the target was not a
  // member — either way nothing was removed.
  if (!data || data.length === 0) {
    return { ok: false, reason: "forbidden" };
  }

  revalidatePath("/");
  return { ok: true };
}
