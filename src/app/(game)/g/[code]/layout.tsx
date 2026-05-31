import type { ReactNode } from "react";

import { resolveActiveGroup } from "@/features/groups/actions/resolve-active-group";
import { listMyGroups } from "@/features/groups/actions/list-my-groups";
import { GroupSwitcher } from "@/features/groups/components/group-switcher";

/**
 * Group shell layout — /g/[code]/** (T-16, T-26, REQ-06, REQ-07).
 *
 * Calls resolveActiveGroup(code) which:
 *   - returns 404 if the code matches no group
 *   - redirects to /onboarding if the caller is not a member
 *   - returns { groupId, group } on success
 *
 * Also fetches listMyGroups() to populate the GroupSwitcher (T-26).
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
  await resolveActiveGroup(code);

  // Prefetch all user's groups for the switcher.
  const groups = await listMyGroups();

  return (
    <div className="grid gap-4">
      {groups.length > 1 ? (
        <GroupSwitcher groups={groups} activeCode={code} />
      ) : null}
      {children}
    </div>
  );
}
