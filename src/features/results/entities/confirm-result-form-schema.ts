/**
 * Confirm-result form-shape schema (Zod).
 *
 * Pure module — no infra imports. Mirrors the auth credentials.ts pattern: it
 * validates ONLY the cosmetic form shape (non-negative integer scores) with
 * friendly castellano messages. The business rules (advancer_required /
 * advancer_not_competing / advancer_not_allowed) are NOT duplicated here — they
 * live in validateResultInput and are enforced server-side (REQ-XCUT-5).
 */

import { z } from "zod";

// An empty number input surfaces NaN (typeof "number"), so we reject it with
// the friendly required message. The integer / sign checks only see real
// numbers, so the user gets one precise message at a time.
const scoreSchema = z
  .number({ error: "Ingresá un número" })
  .refine((value) => !Number.isNaN(value), { error: "Ingresá un número" })
  .refine((value) => Number.isInteger(value), {
    error: "El marcador debe ser un número entero",
  })
  .refine((value) => value >= 0, {
    error: "El marcador no puede ser negativo",
  });

export const confirmResultFormSchema = z.object({
  homeScore: scoreSchema,
  awayScore: scoreSchema,
  // Collected only; presence/eligibility is a server rule, not a client one.
  advancerTeamId: z.string().nullable().optional(),
});

export type ConfirmResultFormValues = z.infer<typeof confirmResultFormSchema>;
