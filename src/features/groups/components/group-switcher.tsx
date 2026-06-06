"use client";

import { Plus } from "lucide-react";
import Link from "next/link";

import type { GroupSummary } from "@/features/groups/actions/list-my-groups";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { LinkPendingHint } from "@/shared/ui/nav-progress";

interface GroupSwitcherProps {
  groups: GroupSummary[];
  /** The invite code of the currently active group (from URL param). */
  activeCode: string;
}

/**
 * GroupSwitcher — horizontal pill list of the user's groups.
 *
 * Highlights the active group by comparing activeCode with each group's
 * inviteCode. Each pill links to /g/{code}/leaderboard.
 *
 * Received as a prop (server-prefetched in the g/[code] layout), so this
 * component never fetches data itself.
 */
export function GroupSwitcher({ groups, activeCode }: GroupSwitcherProps) {
  if (groups.length === 0) return null;

  return (
    <nav aria-label="Cambiar de grupo" className="flex flex-wrap gap-2 pb-1">
      {groups.map((group) => {
        const isActive = group.inviteCode === activeCode;
        const href = `/g/${group.inviteCode}/leaderboard`;

        return (
          <Link
            key={group.groupId}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "rounded-pill px-4 py-1.5 text-sm font-semibold transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            {group.name}
            <LinkPendingHint />
          </Link>
        );
      })}

      <Button asChild variant="pop" size="sm">
        <Link href="/onboarding">
          <Plus className="size-3.5" aria-hidden="true" />
          Nuevo
        </Link>
      </Button>
    </nav>
  );
}
