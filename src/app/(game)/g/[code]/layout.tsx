import type { ReactNode } from "react";

import { resolveActiveGroup } from "@/features/groups/actions/resolve-active-group";

/**
 * Group shell layout — /g/[code]/** (T-16, REQ-06, REQ-07).
 *
 * Calls resolveActiveGroup(code) which:
 *   - returns 404 if the code matches no group
 *   - redirects to /onboarding if the caller is not a member
 *   - returns { groupId, group } on success
 *
 * The GroupSwitcher will go here in PR4 (T-26). A placeholder comment marks
 * the reserved slot so the layout file doesn't need structural changes later.
 */
export default async function GroupLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  // Membership gate — 404 on unknown code, redirect /onboarding on non-member.
  // groupId is available here for passing down in PR4 via a slot or context.
  await resolveActiveGroup(code); // eslint-disable-line @typescript-eslint/no-unused-vars

  // TODO(prode-groups PR4): render <GroupSwitcher groups={...} /> here once
  // the component exists. It needs listMyGroups() data and the current code so
  // it can highlight the active group and link to /g/{code}/leaderboard for
  // each alternative group. No structural layout change required — just drop
  // the component in the slot below.

  return <>{children}</>;
}
