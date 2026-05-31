"use server";

/**
 * createGroup — validates and persists a new group with the creator as owner.
 *
 * Thin I/O shell: delegates name validation to pure entity, generates invite
 * code (retries up to 3 times on unique-constraint collision), inserts the
 * group row (returning the new id via .select), then auto-enrolls the creator
 * in group_members. Returns a discriminated union — never throws on domain
 * failures.
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

  let groupId: string | null = null;
  let inviteCode = "";

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    inviteCode = generateInviteCode();

    const { data, error } = await supabase
      .from("groups")
      .insert({
        owner_id: user.id,
        name: name.trim(),
        invite_code: inviteCode,
      })
      .select("id")
      .single();

    if (!error) {
      groupId = (data as { id: string }).id;
      break;
    }

    if (error.code !== UNIQUE_VIOLATION) {
      throw new Error(error.message);
    }
    // Unique collision on invite_code — retry with a fresh code.
  }

  if (!groupId) {
    return { ok: false, reason: "code_collision" };
  }

  const { error: memberErr } = await supabase
    .from("group_members")
    .insert({ group_id: groupId, user_id: user.id });

  if (memberErr) {
    throw new Error(memberErr.message);
  }

  revalidatePath("/");
  return { ok: true, code: inviteCode };
}
