"use server";

/**
 * joinGroup — resolves an invite code and enrolls the current user.
 *
 * Idempotent: ON CONFLICT DO NOTHING means re-joining is a no-op at the DB.
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
    .insert({ group_id: group.id, user_id: user.id });

  if (memberErr) {
    throw new Error(memberErr.message);
  }

  revalidatePath("/");
  return {
    ok: true,
    code: (group as { id: string; invite_code: string }).invite_code,
  };
}
