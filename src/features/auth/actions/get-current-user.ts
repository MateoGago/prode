import type { User } from "@supabase/supabase-js";
import { cache } from "react";

import { createClient } from "@/shared/supabase/server";

/**
 * Per-request memoized current user. The (game) layout, the page it wraps, and
 * helpers like listMyGroups each need the authenticated user; without memoization
 * that is 2-3 separate JWT-verifying round-trips to Supabase Auth per request.
 * React.cache() collapses them into one (same pattern as resolveActiveGroup).
 *
 * Not a 'use server' action — it is a server-only helper called by RSC. Keeps
 * getUser() (verifies the JWT) over getSession() for the same reason as everywhere.
 */
export const getCurrentUser = cache(
  async function getCurrentUser(): Promise<User | null> {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  },
);
