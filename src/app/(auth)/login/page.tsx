import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthForm } from "@/features/auth/components/auth-form";
import { createClient } from "@/shared/supabase/server";

export const metadata: Metadata = {
  title: "Ingresar · Prode Mundial 2026",
};

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/");

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <section className="w-full max-w-sm animate-[rise_0.55s_var(--ease-bounce)_forwards]">
        <header className="mb-8 text-center">
          <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Mundial 2026
          </span>
          <h1 className="mt-4 font-[family-name:var(--font-display)] text-6xl font-extrabold leading-none tracking-tight">
            PRODE
          </h1>
          <p className="mt-3 text-balance text-sm text-muted-foreground">
            Predecí los partidos, sumá puntos y ganale a tus amigos.
          </p>
        </header>

        {/* Cancha Pop card — solid white, shadow-card, rounded-2xl */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card sm:p-7">
          <AuthForm />
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Al continuar aceptás jugar limpio. 🏆
        </p>
      </section>
    </main>
  );
}
