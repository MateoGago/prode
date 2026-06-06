"use client";

/**
 * Navigation feedback primitives — built ONLY on documented Next.js hooks
 * (`useLinkStatus` from next/link + `usePathname`), never on router internals,
 * so they stay stable across Next upgrades.
 *
 * Two complementary affordances share one source of truth (a Link's pending
 * state):
 *   - <LinkPendingHint/> — a fixed-size inline dot that pulses while its parent
 *     <Link> is navigating. MUST be rendered as a descendant of a <Link>.
 *   - <NavProgressBar/> — a single top progress bar (mounted once via
 *     <NavProgressProvider/>) that activates whenever ANY registered hint is
 *     pending, covering the cold-entry / not-yet-prefetched window.
 *
 * Both are CSS-driven (see globals.css): the hint reserves its space with
 * visibility:hidden and only toggles opacity, and the bar starts at opacity:0
 * with a 100ms animation-delay — so a fast navigation never flashes either one.
 */

import { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { cn } from "@/shared/lib/utils";

type NavProgressApi = { report: (id: string, pending: boolean) => void };

const NavProgressContext = createContext<NavProgressApi | null>(null);

function NavProgressBar({ active }: { active: boolean }) {
  return (
    <div
      aria-hidden="true"
      data-active={active || undefined}
      className="nav-progress"
    />
  );
}

/**
 * Tracks how many <LinkPendingHint/> descendants are currently pending and
 * drives the shared top bar. A completed navigation changes the pathname, which
 * hard-resets the pending set (useLinkStatus also flips to false on its own).
 */
export function NavProgressProvider({ children }: { children: ReactNode }) {
  const pendingIds = useRef<Set<string>>(new Set());
  const [active, setActive] = useState(false);
  const pathname = usePathname();

  const report = useCallback((id: string, pending: boolean) => {
    const set = pendingIds.current;
    if (pending) set.add(id);
    else set.delete(id);
    setActive(set.size > 0);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname is the trigger, not read inside — a completed navigation hard-resets any pending hint that never flipped back (safety belt).
  useEffect(() => {
    pendingIds.current.clear();
    setActive(false);
  }, [pathname]);

  const api = useMemo<NavProgressApi>(() => ({ report }), [report]);

  return (
    <NavProgressContext.Provider value={api}>
      <NavProgressBar active={active} />
      {children}
    </NavProgressContext.Provider>
  );
}

/**
 * Inline pending dot. Renders inside a <Link>; reads that Link's pending state
 * via useLinkStatus and reports it to the provider so the global bar reacts too.
 * If a prefetched destination resolves instantly, pending stays false and
 * neither affordance shows.
 */
export function LinkPendingHint({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  const ctx = useContext(NavProgressContext);
  const id = useId();

  useEffect(() => {
    ctx?.report(id, pending);
    return () => ctx?.report(id, false);
  }, [ctx, id, pending]);

  return (
    <span
      aria-hidden="true"
      className={cn("link-hint", pending && "is-pending", className)}
    />
  );
}
