/**
 * Groups feature barrel.
 *
 * PR1: entities only. Actions and components will be added in PR2/PR3/PR4.
 */

export type {
  Group,
  GroupNameError,
  GroupNameValidationResult,
} from "./entities/membership";
export { alreadyMember, validateGroupName } from "./entities/membership";
export { generateInviteCode, isValidInviteCode } from "./entities/invite-code";
