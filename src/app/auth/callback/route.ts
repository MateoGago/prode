/**
 * OAuth callback — exchanges the `code` for a session cookie (REQ-AUTH-1).
 *
 * Google redirects here after consent. On success the session cookie is set and
 * the user lands on the protected app shell; on failure we show a friendly page.
 */

import { NextResponse } from "next/server";

import { safeNext } from "@/features/auth/entities/safe-next";
import { createClient } from "@/shared/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
