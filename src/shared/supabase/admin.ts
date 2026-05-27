/**
 * Service-role Supabase client — SERVER ONLY, never import into client code.
 * `SUPABASE_SERVICE_ROLE` bypasses RLS *and* the guard_points_awarded trigger,
 * so this is the only path allowed to write predictions.points_awarded
 * (REQ-RES-4). The caller MUST gate on the admin role before building it.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE;

  if (!url || !serviceRole) {
    throw new Error(
      "Faltan variables de Supabase admin: definí NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE en el entorno del servidor.",
    );
  }

  return createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
