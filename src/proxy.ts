/**
 * Next.js 16 Proxy (formerly Middleware — renamed in v16, see docs/next16-notes.md).
 *
 * Runs on the Node.js runtime (edge is unsupported in proxy). It performs an
 * OPTIMISTIC session refresh and bounces unauthenticated visitors to /login.
 * The authoritative gate is `(game)/layout.tsx` (getUser) + Postgres RLS.
 */

import type { NextRequest } from "next/server";

import { updateSession } from "@/shared/supabase/proxy-session";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets and image files, so the
     * session cookie is refreshed on every navigable route.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
