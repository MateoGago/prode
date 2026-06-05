import { Home, ListOrdered, Shield, Swords, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Also light on group leaderboard/breakdown routes (the "Tabla" item). */
  matchGroupRoutes?: boolean;
  /** Gates the item behind the admin role gate (REQ-AUTH). */
  adminOnly?: boolean;
};

/**
 * Build the nav items. The "Tabla" href is dynamic: it points STRAIGHT at the
 * user's active group leaderboard (resolved in the app shell), so clicking it
 * lands on the table directly instead of bouncing through /onboarding (which
 * caused a visible redirect flash). Falls back to /onboarding when the user has
 * no group yet.
 */
export function buildNavItems(tablaHref: string): readonly NavItem[] {
  return [
    { href: "/", label: "Inicio", icon: Home },
    { href: "/predicciones", label: "Partidos", icon: Swords },
    { href: "/fixture", label: "Fixture", icon: Trophy },
    {
      href: tablaHref,
      label: "Tabla",
      icon: ListOrdered,
      matchGroupRoutes: true,
    },
    { href: "/admin", label: "Admin", icon: Shield, adminOnly: true },
  ];
}

/**
 * Active-state detection for a nav item. The root "/" must match exactly so it
 * never stays lit on a section route; every other item matches its own path or
 * any nested child, guarding against sibling routes that merely share a string
 * prefix ("/tablanueva" must not light "/tabla").
 *
 * The "Tabla" item passes `matchGroupRoutes = true`: any /g/[code]/leaderboard
 * or /g/[code]/tabla/* view (and the /onboarding fallback) keeps it lit, even
 * across group switches and regardless of which group its concrete href points
 * at.
 */
export function isNavItemActive(
  pathname: string,
  href: string,
  matchGroupRoutes = false,
): boolean {
  if (href === "/") return pathname === "/";

  if (matchGroupRoutes) {
    if (pathname.startsWith("/g/")) {
      const afterCode = pathname.split("/").slice(3).join("/");
      if (
        afterCode === "leaderboard" ||
        afterCode.startsWith("leaderboard/") ||
        afterCode === "tabla" ||
        afterCode.startsWith("tabla/")
      ) {
        return true;
      }
    }
    if (pathname === "/onboarding" || pathname.startsWith("/onboarding/")) {
      return true;
    }
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
