/**
 * Groups feature barrel — server-safe exports only.
 *
 * Exports: pure entities + server actions.
 * Client components ("use client") are intentionally excluded to prevent
 * the client graph from being pulled into Server Component bundles (Audit R-2).
 * Import client components directly from their paths:
 *   @/features/groups/components/create-group-form
 *   @/features/groups/components/join-group-form
 *   @/features/groups/components/onboarding
 *   @/features/groups/components/group-switcher
 *   @/features/groups/components/group-card
 */

// Entities
export type {
  Group,
  GroupNameError,
  GroupNameValidationResult,
} from "./entities/membership";
export { validateGroupName } from "./entities/membership";
export { generateInviteCode, isValidInviteCode } from "./entities/invite-code";

// Actions
export type { CreateGroupResult } from "./actions/create-group";
export { createGroup } from "./actions/create-group";

export type { JoinGroupResult } from "./actions/join-group";
export { joinGroup } from "./actions/join-group";

export type { ActiveGroupContext } from "./actions/resolve-active-group";
export { resolveActiveGroup } from "./actions/resolve-active-group";

export type { GroupSummary } from "./actions/list-my-groups";
export { listMyGroups } from "./actions/list-my-groups";
