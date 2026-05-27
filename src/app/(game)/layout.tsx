import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { createClient } from "@/shared/supabase/server";

/**
 * Protected app shell — the authoritative authorization gate (REQ-AUTH-4).
 *
 * Runs `getUser()` on every render (verifies the JWT server-side). An
 * unauthenticated request is redirected to /login before any game content is
 * rendered, so nothing leaks in the response body.
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

  const displayName =
    (user.user_metadata?.display_name as string | undefined) ??
    user.email ??
    "Jugador";

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <span className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight">
            Prode <span className="text-primary">2026</span>
          </span>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {displayName}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}
