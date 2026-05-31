import { redirect } from "next/navigation";

import { getDashboard } from "@/features/dashboard";
import {
  InicioContent,
  type NextMatchView,
} from "@/features/dashboard/components/inicio-content";
import { listMyGroups } from "@/features/groups/actions/list-my-groups";
import { GroupCard } from "@/features/groups/components/group-card";
import { formatKickoffLong } from "@/shared/datetime";
import { createClient } from "@/shared/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // If user has no groups, force them into onboarding (REQ-07, decision B).
  const groups = await listMyGroups();
  if (groups.length === 0) redirect("/onboarding");

  const displayName =
    (user.user_metadata?.display_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "crack";

  const dashboard = await getDashboard(user.id);

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

  return (
    <>
      {/* Per-group cards — position and points are group-scoped (decision B) */}
      <section className="grid gap-3">
        <h2 className="font-heading text-[17px] font-bold tracking-tight">
          {groups.length === 1 ? "Tu grupo" : "Tus grupos"}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
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

      {/* Rest of the dashboard — próximo partido, cargadas, últimos resultados */}
      <InicioContent
        displayName={displayName}
        subline={subline}
        position={null}
        points={0}
        played={dashboard.played}
        totalMatches={dashboard.totalMatches}
        predictionsLoaded={dashboard.predictionsProgress.loaded}
        predictionsTotal={dashboard.predictionsProgress.total}
        nextMatch={nextMatch}
        lastResults={dashboard.lastResults}
      />
    </>
  );
}
