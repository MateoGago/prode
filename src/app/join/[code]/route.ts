/**
 * /join/[code] — invite-by-link landing (Route Handler, NOT a page).
 *
 * Must be a Route Handler because it calls joinGroup(), which uses
 * revalidatePath() — and revalidatePath is UNSUPPORTED during a render (a Server
 * Component page would call it mid-render and crash). A GET handler runs outside
 * render, so revalidation + redirect work. The join is idempotent, so a GET
 * side-effect is safe.
 *
 * Logged in     → auto-join → leaderboard with ?joined=1 (success toast).
 * Not logged in → /login?next=/join/<code> → after auth, comes back here.
 */

import { NextResponse } from "next/server";

import { joinGroup } from "@/features/groups/actions/join-group";
import { createClient } from "@/shared/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const { origin } = new URL(request.url);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = encodeURIComponent(`/join/${code}`);
    return NextResponse.redirect(`${origin}/login?next=${next}`);
  }

  const result = await joinGroup(code);

  if (!result.ok) {
    return NextResponse.redirect(`${origin}/grupo-no-encontrado`);
  }

  return NextResponse.redirect(
    `${origin}/g/${result.code}/leaderboard?joined=1`,
  );
}
