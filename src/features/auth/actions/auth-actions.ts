"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/shared/supabase/server";
import { loginSchema, signupSchema } from "../entities/credentials";

/** Failure/info channel. On full success the action redirects instead. */
export type AuthActionState = { error: string };

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

export async function signInWithPassword(
  input: unknown,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { error: "Revisá los datos del formulario." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: translateAuthError(error.message) };

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signUpWithPassword(
  input: unknown,
): Promise<AuthActionState> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) return { error: "Revisá los datos del formulario." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { display_name: parsed.data.displayName } },
  });
  if (error) return { error: translateAuthError(error.message) };

  // If "Confirm email" is enabled in Supabase, no session is returned yet.
  if (!data.session) {
    return { error: "Te enviamos un email para confirmar tu cuenta." };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signInWithGoogle(): Promise<AuthActionState> {
  const supabase = await createClient();
  const origin =
    (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback` },
  });
  if (error) return { error: translateAuthError(error.message) };
  if (data.url) redirect(data.url);

  return { error: "No pudimos iniciar sesión con Google." };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
