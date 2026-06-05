"use server";

/**
 * createGroup — validates and persists a new group with the creator as owner.
 *
 * Thin I/O shell: delegates name validation to the pure entity, generates an
 * invite code (retries up to 3 times on unique-constraint collision), and calls
 * the atomic `create_group(p_name, p_invite_code)` SECURITY DEFINER RPC. That
 * function inserts the group AND auto-enrolls the owner in group_members within
 * a single transaction — so there are no orphan groups, and the owner's first
 * read is never blocked by the membership-gated SELECT policy. Returns a
 * discriminated union — never throws on domain failures.
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/shared/supabase/server";
import { generateInviteCode } from "../entities/invite-code";
import { validateGroupName } from "../entities/membership";

const MAX_RETRIES = 3;
const UNIQUE_VIOLATION = "23505";

export type CreateGroupResult =
  | { ok: true; code: string }
  | { ok: false; reason: "empty_name" | "unauthenticated" | "code_collision" };

export async function createGroup(name: string): Promise<CreateGroupResult> {
  const validation = validateGroupName(name);
  if (!validation.ok) {
    return { ok: false, reason: "empty_name" };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, reason: "unauthenticated" };
  }

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const inviteCode = generateInviteCode();

    const { error } = await supabase.rpc("create_group", {
      p_name: name.trim(),
      p_invite_code: inviteCode,
    });

    if (!error) {
      revalidatePath("/");
      return { ok: true, code: inviteCode };
    }

    if (error.code !== UNIQUE_VIOLATION) {
      throw new Error(error.message);
    }
    // Unique collision on invite_code — retry with a fresh code.
  }

  return { ok: false, reason: "code_collision" };
}
