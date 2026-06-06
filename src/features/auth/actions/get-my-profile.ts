import { cache } from "react";

import { createClient } from "@/shared/supabase/server";
import { getCurrentUser } from "./get-current-user";

export type MyProfile = {
  id: string;
  displayName: string;
  role: "admin" | "player";
};

/**
 * Per-request memoized profile of the current user — the single source of truth
 * for the name shown across the app. The (game) layout (app shell) and the pages
 * it wraps (Inicio) both need it; React.cache() collapses them into one read.
 *
 * Reads profiles.display_name (NOT auth user_metadata): the same column the
 * leaderboard and breakdown render from, so the displayed name is consistent
 * regardless of provider. profiles is seeded/repaired by the handle_new_user
 * trigger and editable in /settings.
 */
export const getMyProfile = cache(
  async function getMyProfile(): Promise<MyProfile | null> {
    const user = await getCurrentUser();
    if (!user) return null;

    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("display_name, role")
      .eq("id", user.id)
      .maybeSingle();

    if (!data) return null;

    return {
      id: user.id,
      displayName: data.display_name,
      role: data.role === "admin" ? "admin" : "player",
    };
  },
);
