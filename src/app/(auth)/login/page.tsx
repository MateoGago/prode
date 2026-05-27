import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthForm } from "@/features/auth/ui/auth-form";
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
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-4 py-10">
      {/* Atmospheric stadium-night backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-primary/[0.07] via-transparent to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/2 -z-10 size-[36rem] -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]"
      />

      <section className="relative w-full max-w-sm">
        <header className="mb-8 text-center">
          <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-primary">
            Mundial 2026
          </span>
          <h1 className="mt-4 font-[family-name:var(--font-display)] text-6xl font-extrabold leading-none tracking-tight">
            PRODE
          </h1>
          <p className="mt-3 text-balance text-sm text-muted-foreground">
            Predecí los partidos, sumá puntos y ganale a tus amigos.
          </p>
        </header>

        <div className="rounded-2xl border bg-card/70 p-6 shadow-xl backdrop-blur-sm sm:p-7">
          <AuthForm />
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Al continuar aceptás jugar limpio. 🏆
        </p>
      </section>
    </main>
  );
}
