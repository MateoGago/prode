import { redirect } from "next/navigation";

import { listMyGroups } from "@/features/groups/actions/list-my-groups";
import { OnboardingContent } from "@/features/groups/components/onboarding";

/**
 * /onboarding — forced group onboarding (REQ-07).
 *
 * Server Component. Calls listMyGroups():
 *   - if the user already belongs to groups → redirect to the first one
 *   - otherwise → render OnboardingContent (CreateGroupForm + JoinGroupForm)
 */
export default async function OnboardingPage() {
  const groups = await listMyGroups();

  if (groups.length > 0) {
    redirect(`/g/${groups[0].inviteCode}/leaderboard`);
  }

  return <OnboardingContent />;
}
