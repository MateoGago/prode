import { GroupInviteButton } from "@/features/groups/components/group-invite-button";
import { GroupLeaderboard } from "@/features/groups/components/group-leaderboard";
import { resolveActiveGroup } from "@/features/groups/actions/resolve-active-group";
import { getLeaderboard } from "@/features/leaderboard/actions/get-leaderboard";
import { createClient } from "@/shared/supabase/server";

/**
 * Group-scoped leaderboard page — /g/[code]/leaderboard (T-17, REQ-04, REQ-06).
 *
 * resolveActiveGroup is also called by the parent layout, but the function is
 * wrapped with React.cache() so the DB round-trips are deduplicated per request.
 * The membership gate is authoritative in the layout; calling it here again is
 * belt-and-suspenders for the groupId — do NOT skip it in case this page is
 * ever co-located differently.
 *
 * Player name links point to /g/{code}/tabla/{userId} (REQ-05 co-member gate).
 */
export default async function GroupLeaderboardPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  const { groupId, group } = await resolveActiveGroup(code);

  const supabase = await createClient();

  const [rows, { data: authData }] = await Promise.all([
    getLeaderboard(groupId),
    supabase.auth.getUser(),
  ]);
  const user = authData.user;

  // Attach breakdown hrefs so player names are clickable (REQ-05).
  const rowsWithHrefs = rows.map((row) => ({
    ...row,
    href: `/g/${code}/tabla/${row.playerId}`,
  }));

  return (
    <section className="grid gap-6">
      <header className="flex items-start justify-between gap-3">
        <div className="grid gap-1">
          <h1
            className={
              "font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight"
            }
          >
            {group.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Tabla de posiciones del grupo.
          </p>
        </div>
        <GroupInviteButton code={code} />
      </header>

      <GroupLeaderboard
        rows={rowsWithHrefs}
        code={code}
        groupId={groupId}
        ownerId={group.ownerId}
        currentUserId={user?.id ?? ""}
        emptyMessage="Todavía no hay puntos en este grupo."
      />
    </section>
  );
}
