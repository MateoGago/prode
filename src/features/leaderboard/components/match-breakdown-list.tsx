"use client";

import { EmptyState } from "@/shared/ui/empty-state";
import { HitBadge } from "@/shared/ui/hit-badge";
import type { HitType } from "@/features/predictions/entities/match-card-state";
import { cn } from "@/shared/lib/utils";

export type MatchBreakdownItem = {
  matchId: string;
  matchLabel: string;
  predictedHomeScore: number;
  predictedAwayScore: number;
  actualHomeScore: number;
  actualAwayScore: number;
  pointsAwarded: number;
  hitType: HitType;
  multiplier: number;
};

export type MatchBreakdownListProps = {
  items: MatchBreakdownItem[];
  emptyMessage?: string;
  ariaLabel?: string;
};

function formatScore(homeScore: number, awayScore: number): string {
  return `${homeScore}–${awayScore}`;
}

const PTS_CLASSES: Record<HitType, string> = {
  exact: "bg-primary-soft text-primary-deep",
  winner: "bg-warn-soft text-warn-deep",
  miss: "bg-muted text-muted-foreground",
};

export function MatchBreakdownList({
  items,
  emptyMessage,
  ariaLabel = "Desglose por partido",
}: MatchBreakdownListProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="Desglose por partido"
        description={emptyMessage ?? "No hay desglose para mostrar."}
      />
    );
  }

  return (
    <section
      aria-label={ariaLabel}
      className="overflow-hidden rounded-2xl bg-card shadow-card"
    >
      <header className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">
          Desglose por partido
        </h2>
      </header>

      <ul className="divide-y divide-border">
        {items.map((item) => (
          <li key={item.matchId} className="flex items-center gap-3 px-4 py-3">
            {/* Score block */}
            <div className="flex min-w-[72px] flex-col gap-0.5 text-center">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Vos
              </span>
              <span className="font-mono text-sm font-bold tabular-nums text-primary-deep">
                {formatScore(item.predictedHomeScore, item.predictedAwayScore)}
              </span>
              <span className="font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Real
              </span>
              <span className="font-mono text-sm font-bold tabular-nums text-foreground">
                {formatScore(item.actualHomeScore, item.actualAwayScore)}
              </span>
            </div>

            {/* Match label + badges */}
            <div className="flex flex-1 flex-col gap-1.5 min-w-0">
              <span className="truncate text-sm font-semibold text-foreground">
                {item.matchLabel}
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <HitBadge hitType={item.hitType} />
                {item.multiplier > 1 ? (
                  <span className="inline-flex items-center rounded-md bg-gol-soft px-1.5 py-0.5 font-mono text-[11px] font-bold text-gol-deep">
                    {`×${item.multiplier}`}
                  </span>
                ) : null}
              </div>
            </div>

            {/* Points */}
            <div
              className={cn(
                "flex-none rounded-full px-2.5 py-1 font-mono text-sm font-bold tabular-nums whitespace-nowrap",
                PTS_CLASSES[item.hitType],
              )}
            >
              {item.pointsAwarded > 0
                ? `+${item.pointsAwarded}`
                : `${item.pointsAwarded}`}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
