"use server";

/**
 * joinGroup — resolves an invite code and enrolls the current user.
 *
 * Delegates to the `join_group(p_code)` SECURITY DEFINER RPC. That function is
 * required because the groups SELECT policy (groups_select_member) only exposes
 * groups the caller already belongs to — so looking the group up with the user's
 * own session BEFORE membership existed always returned null for invitees. The
 * RPC bypasses that membership gate, inserts the membership ON CONFLICT DO
 * NOTHING (idempotent re-join), and returns the invite_code — or NULL for an
 * unknown code. Returns a discriminated union — never throws on domain failures.
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

  const { data: resolvedCode, error } = await supabase.rpc("join_group", {
    p_code: code,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!resolvedCode) {
    return { ok: false, reason: "invalid_code" };
  }

  revalidatePath("/");
  return { ok: true, code: resolvedCode as string };
}
