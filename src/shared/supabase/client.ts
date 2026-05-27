/**
 * Browser Supabase client (anon key, cookie-backed via @supabase/ssr).
 *
 * Used only inside Client Components. The session lives in cookies that the
 * proxy refreshes; this client never holds a long-lived JWT in localStorage
 * as the sole auth mechanism (REQ-AUTH-3).
 */

import { createBrowserClient } from "@supabase/ssr";

import { supabaseEnv } from "./env";

export function createClient() {
  const { url, publishableKey } = supabaseEnv();
  return createBrowserClient(url, publishableKey);
}
