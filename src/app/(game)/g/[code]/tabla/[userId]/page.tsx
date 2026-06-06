import Link from "next/link";
import { notFound } from "next/navigation";

import { getCurrentUser } from "@/features/auth/actions/get-current-user";
import { resolveActiveGroup } from "@/features/groups/actions/resolve-active-group";
import { getMatchBreakdown } from "@/features/leaderboard/actions/get-match-breakdown";
import { MatchBreakdownList } from "@/features/leaderboard";
import { createClient } from "@/shared/supabase/server";

/**
 * Group-scoped match breakdown — /g/[code]/tabla/[userId] (T-18, REQ-05, REQ-06).
 *
 * Co-member gate: both the caller and the target userId must belong to the
 * same group. resolveActiveGroup verifies the CALLER is a member. We then
 * check via is_group_member() that the TARGET userId is also a member of the
 * same group, returning 404 if not (REQ-05 gating-by-reachability).
 *
 * getMatchBreakdown(userId, groupId) reads through the get_match_breakdown RPC,
 * which self-gates on co-membership (the pred_select_own RLS policy would
 * otherwise return zero rows for any player other than the caller).
 */
export default async function GroupUserBreakdownPage({
  params,
}: {
  params: Promise<{ code: string; userId: string }>;
}) {
  const { code, userId } = await params;

  // Verifies caller membership and resolves groupId (notFound / redirect on fail).
  const { groupId } = await resolveActiveGroup(code);

  const supabase = await createClient();

  // The co-member check, the target's profile and the (cache()'d) current user
  // are independent reads — run them at once instead of as a 3-round-trip
  // waterfall. Only getMatchBreakdown is sequenced after, behind the gate.
  const [memberResult, profileResult, currentUser] = await Promise.all([
    supabase.rpc("is_group_member", {
      p_group_id: groupId,
      p_user_id: userId,
    }),
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle(),
    getCurrentUser(),
  ]);

  if (memberResult.error) {
    throw new Error(memberResult.error.message);
  }

  // Co-member gate (REQ-05): target must also belong to this group.
  if (!memberResult.data) {
    notFound();
  }

  if (!profileResult.data) {
    notFound();
  }

  const displayName = profileResult.data.display_name;
  const items = await getMatchBreakdown(userId, groupId);
  const subjectIsSelf = currentUser?.id === userId;

  return (
    <section className="grid gap-6">
      <div className="grid gap-1">
        <Link
          href={`/g/${code}/leaderboard`}
          className={
            "text-sm text-muted-foreground hover:text-foreground " +
            "transition-colors w-fit"
          }
        >
          &larr; Volver a la tabla
        </Link>
        <h1
          className={
            "font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight"
          }
        >
          Desglose de {displayName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Partidos confirmados y puntos obtenidos.
        </p>
      </div>

      <MatchBreakdownList
        items={items}
        emptyMessage="Este jugador todavía no tiene partidos confirmados."
        subjectIsSelf={subjectIsSelf}
      />
    </section>
  );
}
