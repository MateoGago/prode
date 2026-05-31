import { Home, ListOrdered, Shield, Swords } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Gates the item behind the admin role gate (REQ-AUTH). */
  adminOnly?: boolean;
};

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/predicciones", label: "Partidos", icon: Swords },
  // Tabla href points to /onboarding as the entry point (T-20).
  // The onboarding page redirects to /g/{code}/leaderboard for existing members.
  // isNavItemActive below ensures /g/*/leaderboard and /g/*/tabla/* keep this
  // item lit so the user always sees Tabla as active in group views.
  { href: "/onboarding", label: "Tabla", icon: ListOrdered },
  { href: "/admin", label: "Admin", icon: Shield, adminOnly: true },
];

/**
 * Active-state detection for a nav item. The root "/" must match exactly so it
 * never stays lit on a section route; every other item matches its own path or
 * any nested child (e.g. "/tabla/:userId"), guarding against sibling routes that
 * merely share a string prefix ("/tablanueva" must not light "/tabla").
 *
 * Special case (T-20/T-21): the group-scoped /g/[code]/leaderboard and
 * /g/[code]/tabla/* routes are logically under "Tabla" even though the nav href
 * changed to /onboarding. We detect them explicitly so the Tabla tab stays lit
 * while the user is inside a group view.
 */
export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";

  // Group-scoped leaderboard/breakdown routes map to the Tabla nav item.
  if (href === "/onboarding") {
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
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
