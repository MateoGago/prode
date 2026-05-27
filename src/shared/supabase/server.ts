/**
 * Server Supabase client (anon key + request cookies via @supabase/ssr).
 *
 * Next.js 16: `cookies()` is async — `await` is required. Use this in Server
 * Components, Server Functions, and Route Handlers. Always check auth with
 * `getUser()` (verifies the JWT), never `getSession()`.
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { supabaseEnv } from "./env";

export async function createClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = supabaseEnv();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // The proxy refreshes the session cookie, so this is safe to ignore.
        }
      },
    },
  });
}
