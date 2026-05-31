"use server";

/**
 * joinGroup — resolves an invite code and enrolls the current user.
 *
 * Idempotent: upsert with ignoreDuplicates means re-joining is a no-op at the
 * DB level. A 23505 unique-violation (belt-and-suspenders) is also treated as
 * silent success per REQ-02.
 * Returns a discriminated union — never throws on domain failures.
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/shared/supabase/server";

export type JoinGroupResult =
  | { ok: true; code: string }
  | { ok: false; reason: "unauthenticated" | "invalid_code" };

export async function joinGroup(code: string): Promise<JoinGroupResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, reason: "unauthenticated" };
  }

  const { data: group, error: lookupErr } = await supabase
    .from("groups")
    .select("id, invite_code")
    .eq("invite_code", code)
    .maybeSingle();

  if (lookupErr) {
    throw new Error(lookupErr.message);
  }

  if (!group) {
    return { ok: false, reason: "invalid_code" };
  }

  const { error: memberErr } = await supabase
    .from("group_members")
    .upsert(
      { group_id: group.id, user_id: user.id },
      { onConflict: "group_id,user_id", ignoreDuplicates: true },
    );

  // 23505 = unique_violation: user is already a member — silent success (REQ-02).
  if (memberErr && memberErr.code !== "23505") {
    throw new Error(memberErr.message);
  }

  revalidatePath("/");
  return {
    ok: true,
    code: (group as { id: string; invite_code: string }).invite_code,
  };
}
