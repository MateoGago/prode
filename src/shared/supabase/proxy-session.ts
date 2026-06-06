/**
 * Optimistic session refresh + auth redirect for the Next.js 16 Proxy.
 *
 * IMPORTANT: this is an OPTIMISTIC check only (REQ-AUTH-4 is ultimately enforced
 * by `(game)/layout.tsx` calling getUser() and by Postgres RLS). Per the Next 16
 * proxy docs, proxy must not be the sole authorization boundary. It exists here
 * to keep the cookie fresh and bounce obviously-unauthenticated visitors early.
 *
 * Do not add logic between createServerClient and getUser(): it can desync the
 * user's session and randomly log them out.
 */

import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { supabaseEnv } from "./env";

/** Paths that an unauthenticated visitor is allowed to reach. */
const PUBLIC_PREFIXES = ["/login", "/auth"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, publishableKey } = supabaseEnv();

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublicPath(request.nextUrl.pathname)) {
    // Carry the originally-requested path as ?next so the user returns to it
    // after auth (e.g. an invite link /join/<code>) instead of landing on /.
    // Without this the proxy bounces to a bare /login and the destination is
    // lost — the route handler's own next-preserving redirect never runs,
    // because the proxy intercepts the request first.
    const destination = request.nextUrl.pathname + request.nextUrl.search;
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", destination);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
