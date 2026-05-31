/**
 * Membership domain: pure invariants for group membership. No infra imports.
 *
 * These rules are mirrored at the DB level (RLS + CHECK constraints) but run
 * in the action layer for fast rejection before hitting the DB (REQ-01, REQ-03).
 */

/** A group with its essential identifiers. */
export interface Group {
  id: string;
  ownerId: string;
  name: string;
  inviteCode: string;
  createdAt: Date;
}

export type GroupNameError = "empty_name";

export type GroupNameValidationResult =
  | { ok: true }
  | { ok: false; reason: GroupNameError };

/**
 * Validates that a group name is not empty or whitespace-only.
 * The DB enforces this via CHECK (length(btrim(name)) > 0).
 * This function matches that constraint at the pure layer (REQ-01).
 */
export function validateGroupName(name: string): GroupNameValidationResult {
  if (name.trim().length === 0) {
    return { ok: false, reason: "empty_name" };
  }
  return { ok: true };
}
