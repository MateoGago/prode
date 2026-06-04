import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { AppSidebarNav, AppTabBar } from "@/features/auth/components/app-nav";
import { createClient } from "@/shared/supabase/server";

function Wordmark() {
  return (
    <Link
      href="/"
      className="font-heading text-xl font-extrabold tracking-tight text-foreground"
    >
      Pro<span className="text-primary">Debates</span>
    </Link>
  );
}

/**
 * Protected app shell — the authoritative authorization gate (REQ-AUTH-4).
 *
 * Runs `getUser()` on every render (verifies the JWT server-side). An
 * unauthenticated request is redirected to /login before any game content is
 * rendered, so nothing leaks in the response body. The admin nav item reuses
 * the same `profiles.role === "admin"` gate the /admin route enforces, so the
 * link is a hint only — never the boundary.
 */
export default async function GameLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name")
    .eq("id", user.id)
    .maybeSingle();
  const isAdmin = profile?.role === "admin";

  const displayName =
    (profile?.display_name as string | undefined) ??
    (user.user_metadata?.display_name as string | undefined) ??
    "Jugador";

  // Resolve the "Tabla" nav target to the user's first group leaderboard so the
  // item links straight there (no /onboarding redirect hop). RLS scopes the
  // query to groups the user belongs to. Falls back to /onboarding if none.
  const { data: firstGroup } = await supabase
    .from("groups")
    .select("invite_code")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const tablaHref = firstGroup?.invite_code
    ? `/g/${firstGroup.invite_code}/leaderboard`
    : "/onboarding";

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      {/* Desktop: persistent left sidebar. */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 border-r border-border bg-background/60 px-4 py-6 backdrop-blur md:flex">
        <div className="px-2">
          <Wordmark />
        </div>
        <AppSidebarNav isAdmin={isAdmin} tablaHref={tablaHref} />
        <div className="mt-auto grid gap-3 border-t border-border pt-4">
          <div className="flex items-center gap-2.5 px-1">
            <span className="truncate text-sm font-medium">{displayName}</span>
          </div>
          <SignOutButton />
        </div>
      </aside>

      {/* Mobile: slim sticky top header. */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-xl md:hidden">
        <Wordmark />
        <SignOutButton />
      </header>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Bottom padding clears the fixed mobile tab bar; md drops it. */}
        <main className="container-app flex-1 py-6 pb-24 md:py-10 md:pb-10">
          {children}
        </main>
      </div>

      <AppTabBar isAdmin={isAdmin} tablaHref={tablaHref} />
    </div>
  );
}
