import { redirect } from "next/navigation";

/**
 * /tabla is superseded by the group-scoped /g/[code]/leaderboard route (PR3).
 *
 * The global leaderboard was removed in the groups migration — get_leaderboard()
 * now requires a group id. Any bookmark or old link hitting /tabla is sent to
 * /onboarding, where the user can create or join a group and then land on the
 * correct group leaderboard. (T-19, REQ-06, REQ-07)
 */
export default function TablaPage() {
  redirect("/onboarding");
}
