import { ChevronRight } from "lucide-react";
import Link from "next/link";

interface GroupCardProps {
  groupName: string;
  position: number | null;
  points: number;
  leaderboardHref: string;
}

export function GroupCard({
  groupName,
  position,
  points,
  leaderboardHref,
}: GroupCardProps) {
  return (
    <Link
      href={leaderboardHref}
      className="group flex items-center justify-between gap-3 rounded-xl bg-card p-4 shadow-card ring-1 ring-foreground/10 transition-[box-shadow,transform] hover:ring-primary/40"
    >
      <div className="min-w-0">
        <div className="truncate font-heading text-sm font-bold tracking-tight">
          {groupName}
        </div>
        <div className="mt-1.5 flex items-baseline gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
            Pos{" "}
            <b className="font-mono text-sm font-bold text-foreground">
              {position === null ? "—" : `#${position}`}
            </b>
          </span>
          <span className="h-3 w-px self-center bg-border" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
            Pts{" "}
            <b className="font-mono text-sm font-bold text-foreground tabular-nums">
              {points}
            </b>
          </span>
        </div>
      </div>
      <ChevronRight
        className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </Link>
  );
}
