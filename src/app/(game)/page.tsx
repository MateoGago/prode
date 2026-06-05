import { Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/features/auth/actions/get-current-user";
import { getDashboard } from "@/features/dashboard";
import {
  InicioContent,
  type NextMatchView,
} from "@/features/dashboard/components/inicio-content";
import { listMyGroups } from "@/features/groups/actions/list-my-groups";
import { GroupCard } from "@/features/groups/components/group-card";
import { formatKickoffLong } from "@/shared/datetime";
import { Button } from "@/shared/ui/button";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // The group list and the dashboard are independent reads — fetch in parallel.
  // The empty-groups gate (REQ-07, decision B) still wins: a wasted dashboard
  // fetch on the rare no-groups path is cheaper than serializing both reads.
  const [groups, dashboard] = await Promise.all([
    listMyGroups(),
    getDashboard(user.id),
  ]);
  if (groups.length === 0) redirect("/onboarding");

  const displayName =
    (user.user_metadata?.display_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "crack";

  const subline =
    dashboard.pendingPredictions > 0
      ? `Te faltan ${dashboard.pendingPredictions} ${
          dashboard.pendingPredictions === 1 ? "pronóstico" : "pronósticos"
        } para la fecha`
      : "Estás al día con tus pronósticos 💪";

  const next = dashboard.nextMatch;
  const nextMatch: NextMatchView | null =
    next?.homeTeam && next.awayTeam
      ? {
          groupLabel: next.homeTeam.groupLabel ?? next.awayTeam.groupLabel,
          kickoffAtISO: next.kickoffAt.toISOString(),
          closesAtLabel: formatKickoffLong(next.kickoffAt),
          home: { name: next.homeTeam.name, flagUrl: next.homeTeam.flagUrl },
          away: { name: next.awayTeam.name, flagUrl: next.awayTeam.flagUrl },
        }
      : null;

  // Per-group standings — position/points are group-scoped (decision B).
  const groupsSection = (
    <section className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-[17px] font-bold tracking-tight">
          {groups.length === 1 ? "Tu grupo" : "Tus grupos"}
        </h2>
        <Button asChild variant="pop" size="sm">
          <Link href="/onboarding">
            <Plus className="size-3.5" aria-hidden="true" />
            Nuevo grupo
          </Link>
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => (
          <GroupCard
            key={group.groupId}
            groupName={group.name}
            position={group.position}
            points={group.points}
            leaderboardHref={`/g/${group.inviteCode}/leaderboard`}
          />
        ))}
      </div>
    </section>
  );

  // position omitted — group-scoped stats live in the GroupCards above.
  return (
    <InicioContent
      displayName={displayName}
      subline={subline}
      groupsSlot={groupsSection}
      position={null}
      played={dashboard.played}
      totalMatches={dashboard.totalMatches}
      predictionsLoaded={dashboard.predictionsProgress.loaded}
      predictionsTotal={dashboard.predictionsProgress.total}
      nextMatch={nextMatch}
      lastResults={dashboard.lastResults}
    />
  );
}
