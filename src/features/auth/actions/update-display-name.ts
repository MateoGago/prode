"use server";

/**
 * updateDisplayName — lets a signed-in user change the name shown across the
 * app (Inicio, leaderboard, breakdown, nav).
 *
 * profiles.display_name is the single source of truth: it is the ONLY name
 * readable for OTHER users (you cannot read another user's auth metadata), so
 * the leaderboard and breakdown render from it. The RLS policy profiles_update_own
 * already permits a user to update their own row except `role`, so no extra
 * grant is needed here. Returns a discriminated state — never throws on a
 * domain failure.
 */

import { revalidatePath } from "next/cache";

import { createClient } from "@/shared/supabase/server";
import { displayNameSchema } from "../entities/credentials";
import { getCurrentUser } from "./get-current-user";

export type UpdateDisplayNameState =
  | { status: "success"; message: string; displayName: string }
  | { status: "error"; message: string };

export async function updateDisplayName(
  input: unknown,
): Promise<UpdateDisplayNameState> {
  const parsed = displayNameSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Revisá el nombre.",
    };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { status: "error", message: "Tenés que iniciar sesión." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: parsed.data.displayName })
    .eq("id", user.id);

  if (error) {
    return {
      status: "error",
      message: "No pudimos guardar el nombre. Probá de nuevo.",
    };
  }

  // The name appears in the app shell (layout) and on Inicio — revalidate the
  // whole layout tree so both pick up the change immediately.
  revalidatePath("/", "layout");

  return {
    status: "success",
    message: "Listo, actualizamos tu nombre.",
    displayName: parsed.data.displayName,
  };
}
