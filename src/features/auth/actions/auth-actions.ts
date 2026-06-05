"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/shared/supabase/server";
import { safeNext } from "../entities/safe-next";
import { loginSchema, signupSchema } from "../entities/credentials";

/**
 * UI feedback channel. On full success the action redirects instead of
 * returning, so a returned state is always something to surface to the user:
 *  - "error" → a failure (red toast)
 *  - "info"  → a non-failure that still needs attention, e.g. "confirm your
 *              email" when no session was issued yet (blue info toast)
 */
export type AuthActionState =
  | { status: "error"; message: string }
  | { status: "info"; message: string };

/** Map raw Supabase auth errors to friendly castellano messages. */
function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) {
    return "Email o contraseña incorrectos.";
  }
  if (
    m.includes("already registered") ||
    m.includes("already been registered")
  ) {
    return "Ese email ya tiene una cuenta. Probá ingresar.";
  }
  if (m.includes("email not confirmed")) {
    return "Confirmá tu email antes de ingresar.";
  }
  if (m.includes("password")) {
    return "La contraseña no cumple los requisitos.";
  }
  return "No pudimos completar la operación. Probá de nuevo.";
}

function fail(message: string): AuthActionState {
  return { status: "error", message };
}

/**
 * URL of our OAuth/PKCE callback, carrying a sanitized `next` so the user
 * returns to where they started (e.g. an invite link) after the code exchange.
 * Both Google OAuth and the email-confirmation magic link route through here.
 */
function authCallbackUrl(origin: string, next?: string): string {
  const path = safeNext(next);
  return path === "/"
    ? `${origin}/auth/callback`
    : `${origin}/auth/callback?next=${encodeURIComponent(path)}`;
}

async function requestOrigin(): Promise<string> {
  return (
    (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? ""
  );
}

export async function signInWithPassword(
  input: unknown,
  next?: string,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return fail("Revisá los datos del formulario.");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return fail(translateAuthError(error.message));

  revalidatePath("/", "layout");
  redirect(safeNext(next));
}

export async function signUpWithPassword(
  input: unknown,
  next?: string,
): Promise<AuthActionState> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) return fail("Revisá los datos del formulario.");

  const supabase = await createClient();
  const origin = await requestOrigin();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.displayName },
      // With confirm-email on, the magic link routes through /auth/callback so
      // the PKCE code is exchanged AND the user returns to `next` (e.g. /join).
      emailRedirectTo: authCallbackUrl(origin, next),
    },
  });
  if (error) return fail(translateAuthError(error.message));

  // If "Confirm email" is enabled in Supabase, no session is returned yet.
  // This is NOT a failure — it is an informational next-step for the user.
  if (!data.session) {
    return { status: "info", message: "Te enviamos un email para confirmar tu cuenta." };
  }

  revalidatePath("/", "layout");
  redirect(safeNext(next));
}

export async function signInWithGoogle(
  next?: string,
): Promise<AuthActionState> {
  const supabase = await createClient();
  const origin = await requestOrigin();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: authCallbackUrl(origin, next) },
  });
  if (error) return fail(translateAuthError(error.message));
  if (data.url) redirect(data.url);

  return fail("No pudimos iniciar sesión con Google.");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
