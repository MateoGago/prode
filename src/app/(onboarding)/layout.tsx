import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { createClient } from "@/shared/supabase/server";

/**
 * Onboarding shell — a deliberately chrome-less surface (no app sidebar / tab
 * bar). It lives OUTSIDE the (game) route group so the protected app shell does
 * not wrap it: the only navigation here is "create/join a group" or sign out.
 *
 * Still an authorization boundary: runs getUser() (verifies the JWT) and
 * redirects unauthenticated requests to /login before rendering anything.
 */
export default async function OnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-5 py-4 sm:px-8 sm:py-6">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-lg font-bold tracking-[0.02em]"
        >
          PRODE
        </Link>
        <SignOutButton />
      </header>

      <main className="flex flex-1 items-center justify-center px-5 pb-20">
        {children}
      </main>
    </div>
  );
}
