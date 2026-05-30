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
  { href: "/tabla", label: "Tabla", icon: ListOrdered },
  { href: "/admin", label: "Admin", icon: Shield, adminOnly: true },
];

/**
 * Active-state detection for a nav item. The root "/" must match exactly so it
 * never stays lit on a section route; every other item matches its own path or
 * any nested child (e.g. "/tabla/:userId"), guarding against sibling routes that
 * merely share a string prefix ("/tablanueva" must not light "/tabla").
 */
export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
