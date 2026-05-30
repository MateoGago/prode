import { redirect } from "next/navigation";

import { getDashboard } from "@/features/dashboard";
import {
  InicioContent,
  type NextMatchView,
} from "@/features/dashboard/components/inicio-content";
import { formatKickoffLong } from "@/shared/datetime";
import { createClient } from "@/shared/supabase/server";

function initialsOf(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return initials || "JG";
}

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const displayName =
    (user.user_metadata?.display_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "crack";

  const dashboard = await getDashboard(user.id);

  // Honesty rule: the proof's "racha 🔥" (streak) has no data model, so it's
  // dropped in favour of a real, computed nudge — how many open matches the
  // player still hasn't predicted.
  const subline =
    dashboard.pendingPredictions > 0
      ? `Te faltan ${dashboard.pendingPredictions} ${
          dashboard.pendingPredictions === 1 ? "pronóstico" : "pronósticos"
        } para la fecha`
      : "Estás al día con tus pronósticos 💪";

  // Map the domain Match (Date, Team) into a plain, RSC-serializable view so no
  // class instances or functions cross the client boundary.
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
    <InicioContent
      displayName={displayName}
      initials={initialsOf(displayName)}
      subline={subline}
      position={dashboard.stats.position}
      points={dashboard.stats.points}
      played={dashboard.played}
      totalMatches={dashboard.totalMatches}
      predictionsLoaded={dashboard.predictionsProgress.loaded}
      predictionsTotal={dashboard.predictionsProgress.total}
      nextMatch={nextMatch}
      lastResults={dashboard.lastResults}
    />
  );
}
