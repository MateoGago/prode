import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getMyProfile } from "@/features/auth/actions/get-my-profile";
import { DisplayNameForm } from "@/features/auth/components/display-name-form";

export const metadata: Metadata = {
  title: "Ajustes · Prode Mundial 2026",
};

/**
 * /settings — edit the name shown across the app. The (game) layout already
 * enforced auth; getMyProfile is the same cached read the shell used, so this
 * adds no extra round-trip. Seeds the form with profiles.display_name (the
 * canonical, leaderboard-visible name).
 */
export default async function SettingsPage() {
  const profile = await getMyProfile();
  if (!profile) redirect("/login");

  return (
    <section className="grid max-w-md gap-6">
      <div className="grid gap-1">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight">
          Ajustes
        </h1>
        <p className="text-sm text-muted-foreground">
          Cambiá el nombre que ven los demás en la tabla y el resto de la app.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <DisplayNameForm currentName={profile.displayName} />
      </div>
    </section>
  );
}
