/**
 * /join/[code] — invite-by-link landing page.
 *
 * Logged in  → auto-join the group → land on leaderboard with a success toast.
 * Not logged in → redirect to /login?next=/join/<code> → after auth, come back
 *                 here and auto-join.
 *
 * This page is NOT under (game) or (auth) so it is accessible without a group
 * membership gate.
 */

import { redirect } from "next/navigation";

import { joinGroup } from "@/features/groups/actions/join-group";
import { createClient } from "@/shared/supabase/server";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/join/${code}`)}`);
  }

  const result = await joinGroup(code);

  if (!result.ok) {
    redirect("/grupo-no-encontrado");
  }

  redirect(`/g/${result.code}/leaderboard?joined=1`);

  // Unreachable — redirect() throws, but TypeScript needs the function body
  // to be exhaustive.
  return null;
}
