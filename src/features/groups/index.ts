/**
 * Groups feature barrel.
 *
 * PR1: entities only.
 * PR2: actions added.
 * PR3/PR4: components and route helpers will be added.
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
