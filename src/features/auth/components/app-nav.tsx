"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/shared/lib/utils";

import { buildNavItems, isNavItemActive } from "./app-nav-items";

type AppNavProps = {
  isAdmin: boolean;
  /** Active group leaderboard href for the "Tabla" item (/onboarding if none). */
  tablaHref: string;
};

function visibleItems(isAdmin: boolean, tablaHref: string) {
  return buildNavItems(tablaHref).filter((item) => !item.adminOnly || isAdmin);
}

/**
 * Mobile bottom tab bar — fixed, blurred, safe-area aware. Hidden from md up,
 * where the sidebar takes over.
 */
export function AppTabBar({ isAdmin, tablaHref }: AppNavProps) {
  const pathname = usePathname();
  const items = visibleItems(isAdmin, tablaHref);

  return (
    <nav
      data-app-tab-bar
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-background/80 backdrop-blur-xl backdrop-saturate-150 md:hidden"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.75rem)" }}
    >
      {items.map(({ href, label, icon: Icon, matchGroupRoutes }) => {
        const active = isNavItemActive(pathname, href, matchGroupRoutes);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 px-1 pt-2 pb-2.5 text-[0.7rem] font-medium transition-colors",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "relative rounded-pill px-3.5 py-1 transition-colors",
                active && "bg-primary-soft",
              )}
            >
              <Icon
                className="size-[22px]"
                aria-hidden="true"
                strokeWidth={2.2}
              />
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Desktop left sidebar — the same items as the tab bar, stacked vertically with
 * the active-pill pattern. Hidden below md.
 */
export function AppSidebarNav({ isAdmin, tablaHref }: AppNavProps) {
  const pathname = usePathname();
  const items = visibleItems(isAdmin, tablaHref);

  return (
    <nav aria-label="Navegación principal" className="grid gap-1">
      {items.map(({ href, label, icon: Icon, matchGroupRoutes }) => {
        const active = isNavItemActive(pathname, href, matchGroupRoutes);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-pill px-3.5 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary-soft text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-5" aria-hidden="true" strokeWidth={2.2} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
