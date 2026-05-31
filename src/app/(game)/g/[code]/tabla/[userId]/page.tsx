import Link from "next/link";
import { notFound } from "next/navigation";

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
 * getMatchBreakdown(userId) is unchanged — purely per-user data (REQ-05 design
 * decision: no query filter needed, access gate is the page-level check).
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

  // Co-member check: target userId must also be in this group (REQ-05).
  const { data: isTargetMember, error: memberErr } = await supabase.rpc(
    "is_group_member",
    { p_group_id: groupId, p_user_id: userId },
  );

  if (memberErr) {
    throw new Error(memberErr.message);
  }

  if (!isTargetMember) {
    notFound();
  }

  const { data: profileResult } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .maybeSingle();

  if (!profileResult) {
    notFound();
  }

  const displayName = profileResult.display_name;
  const items = await getMatchBreakdown(userId);

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
      />
    </section>
  );
}
