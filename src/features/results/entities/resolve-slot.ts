/**
 * Pure types + validation for the admin bracket slot resolution use-case.
 *
 * Lives in the entity layer (NOT "use server") because Turbopack turns every
 * export of a "use server" module into a Server Action binding. Exporting a
 * type or pure function from a "use server" file breaks the build (same
 * pattern as correctable-match.ts).
 */

import type { Match, Team } from "@/features/fixtures/entities/match";

/** The two fillable slots on a knockout match. */
export type Slot = "home" | "away";

/** Input shape for the resolve-slot server action. */
export interface ResolveSlotInput {
  matchId: string;
  slot: Slot;
  teamId: string;
}

/** Reasons a resolve-slot request can fail. */
export type ResolveSlotError = "not_knockout" | "team_not_found";

/**
 * Discriminated result of the resolve-slot validation + server action.
 * Mirrors ConfirmActionResult from confirm-result.ts — components import from
 * this module; they NEVER import from the "use server" action module.
 */
export type ResolveSlotResult =
  | { ok: true; matchId: string; slot: Slot; teamId: string }
  | { ok: false; reason: "forbidden" | "match_not_found" | ResolveSlotError };

/**
 * Pure validation for a bracket slot assignment.
 *
 * Rules (spec: bracket-admin-resolution → Slot Assignment):
 * 1. Match must be a knockout round (round !== "group").
 * 2. The target team must exist in the provided team list.
 * 3. Idempotent re-assign (same or different team) is always allowed.
 *
 * The admin-only gate is NOT enforced here — that lives in the server action.
 */
export function validateResolveSlot(
  input: ResolveSlotInput,
  match: Match,
  teams: Team[],
): ResolveSlotResult {
  if (match.round === "group") {
    return { ok: false, reason: "not_knockout" };
  }

  const team = teams.find((t) => t.id === input.teamId);
  if (team === undefined) {
    return { ok: false, reason: "team_not_found" };
  }

  return {
    ok: true,
    matchId: input.matchId,
    slot: input.slot,
    teamId: input.teamId,
  };
}
