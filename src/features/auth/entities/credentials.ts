/**
 * Auth form validation schemas (Zod).
 *
 * Pure module — no infra imports. These mirror, but do NOT replace, the
 * authority: Supabase Auth + Postgres RLS are the real boundary. Client-side
 * validation only fails fast with friendly messages (UI is in castellano).
 */

import { z } from "zod";

/**
 * The display name shown across the app — the single field a user can edit in
 * /settings. Extracted so signup and the settings form share one rule.
 */
const displayNameField = z
  .string()
  .trim()
  .min(2, "El nombre debe tener al menos 2 caracteres")
  .max(40, "El nombre es demasiado largo");

export const loginSchema = z.object({
  email: z.email("Ingresá un email válido"),
  password: z.string().min(1, "Ingresá tu contraseña"),
});

export const signupSchema = z.object({
  displayName: displayNameField,
  email: z.email("Ingresá un email válido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export const displayNameSchema = z.object({ displayName: displayNameField });

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type DisplayNameInput = z.infer<typeof displayNameSchema>;
