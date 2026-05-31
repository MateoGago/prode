import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

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
      className="block transition-opacity hover:opacity-80"
    >
      <Card size="sm">
        <CardHeader>
          <CardTitle>{groupName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                Posición
              </span>
              <span className="font-mono text-2xl font-bold tabular-nums">
                {position === null ? "—" : `#${position}`}
              </span>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                Puntos
              </span>
              <span className="font-mono text-2xl font-bold tabular-nums">
                {points}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
