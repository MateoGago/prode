/**
 * Groups feature barrel.
 *
 * PR1: entities only.
 * PR2: actions added.
 * PR4: components added.
 */

// Entities
export type {
  Group,
  GroupNameError,
  GroupNameValidationResult,
} from "./entities/membership";
export { alreadyMember, validateGroupName } from "./entities/membership";
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

// Components
export { CreateGroupForm } from "./components/create-group-form";
export { JoinGroupForm } from "./components/join-group-form";
export { OnboardingContent } from "./components/onboarding";
export { GroupSwitcher } from "./components/group-switcher";
export { GroupCard } from "./components/group-card";
