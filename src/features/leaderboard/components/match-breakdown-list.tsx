"use client";

import { EmptyState } from "@/shared/ui/empty-state";
import { HitBadge } from "@/shared/ui/hit-badge";
import { TeamFlag } from "@/shared/ui/team-flag";
import type { HitType } from "@/features/predictions/entities/match-card-state";
import { HIT_PANEL_CLASS, HIT_TEXT_CLASS } from "@/shared/ui/hit-tone";
import { groupMatchBreakdownByDay } from "@/features/leaderboard/entities/match-breakdown";
import { cn } from "@/shared/lib/utils";

export type MatchBreakdownItem = {
  matchId: string;
  matchLabel: string;
  /** ISO 8601 UTC kickoff — drives the newest-first order and per-day grouping. */
  kickoffAt: string;
  homeTeamName: string;
  awayTeamName: string;
  homeFlagUrl: string | null;
  awayFlagUrl: string | null;
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
  subjectIsSelf?: boolean;
};

const PTS_CLASSES: Record<HitType, string> = {
  exact: "bg-primary-soft text-primary-deep",
  winner: "bg-warn-soft text-warn-deep",
  miss: "bg-muted text-muted-foreground",
};

type TeamRowProps = {
  name: string;
  flagUrl: string | null;
  score: number;
  isWinner: boolean;
};

function TeamRow({ name, flagUrl, score, isWinner }: TeamRowProps) {
  return (
    <div className="flex items-center gap-2.5">
      <TeamFlag name={name} flagUrl={flagUrl} size={20} />
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-sm",
          isWinner
            ? "font-bold text-foreground"
            : "font-medium text-muted-foreground",
        )}
      >
        {name}
      </span>
      {/* Fixed-width, right-aligned score so the real result reads as a clean
          scoreboard column that lines up across both team rows. */}
      <span
        className={cn(
          "w-5 shrink-0 text-right font-mono text-[15px] tabular-nums",
          isWinner
            ? "font-bold text-foreground"
            : "font-medium text-muted-foreground",
        )}
      >
        {score}
      </span>
    </div>
  );
}

export function MatchBreakdownList({
  items,
  emptyMessage,
  ariaLabel = "Desglose por partido",
  subjectIsSelf = false,
}: MatchBreakdownListProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="Desglose por partido"
        description={emptyMessage ?? "No hay desglose para mostrar."}
      />
    );
  }

  // Newest day first, with newest matches at the top of each day (REQ: últimos
  // resultados primero, agrupados por fecha).
  const days = groupMatchBreakdownByDay(items);

  return (
    <section aria-label={ariaLabel} className="grid gap-5">
      {days.map((day) => (
        <section key={day.dateKey} className="grid gap-2.5">
          {/* Day header — mirrors the predictions board DaySection. */}
          <header className="flex items-center gap-2.5 px-0.5">
            <span className="grid size-[30px] place-items-center rounded-xl bg-foreground font-heading text-[13px] font-bold text-background">
              {day.day}
            </span>
            <h2 className="font-heading text-[18px] font-bold tracking-tight">
              {day.weekday}
              {day.month ? (
                <span className="text-muted-foreground"> · {day.month}</span>
              ) : null}
            </h2>
            <span className="ml-auto text-xs font-semibold text-muted-foreground">
              {day.items.length}{" "}
              {day.items.length === 1 ? "partido" : "partidos"}
            </span>
          </header>

          <ul className="divide-y divide-border overflow-hidden rounded-2xl bg-card shadow-card">
            {day.items.map((item) => (
              <BreakdownRow
                key={item.matchId}
                item={item}
                subjectIsSelf={subjectIsSelf}
              />
            ))}
          </ul>
        </section>
      ))}
    </section>
  );
}

type BreakdownRowProps = {
  item: MatchBreakdownItem;
  subjectIsSelf: boolean;
};

function BreakdownRow({ item, subjectIsSelf }: BreakdownRowProps) {
  const homeWins = item.actualHomeScore > item.actualAwayScore;
  const awayWins = item.actualAwayScore > item.actualHomeScore;

  return (
    <li
      aria-label={item.matchLabel}
      className="flex items-center gap-3 px-4 py-3"
    >
      {/* Teams block: stacked home/away rows with actual result */}
      <div className="flex flex-1 flex-col gap-1.5 min-w-0">
        <TeamRow
          name={item.homeTeamName}
          flagUrl={item.homeFlagUrl}
          score={item.actualHomeScore}
          isWinner={homeWins}
        />
        <TeamRow
          name={item.awayTeamName}
          flagUrl={item.awayFlagUrl}
          score={item.actualAwayScore}
          isWinner={awayWins}
        />
      </div>

      {/* Prediction recap block, tinted by hit outcome. Fixed width so the
          recap + points columns line up across every row. */}
      <div
        className={cn(
          "flex w-[104px] flex-none flex-col items-center justify-center gap-1 rounded-xl px-3 py-2",
          HIT_PANEL_CLASS[item.hitType],
        )}
      >
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {subjectIsSelf ? "Tu pronóstico" : "Su pronóstico"}
        </span>
        <span
          className={cn(
            "font-mono text-sm font-bold tabular-nums",
            HIT_TEXT_CLASS[item.hitType],
          )}
        >
          {`${item.predictedHomeScore}–${item.predictedAwayScore}`}
        </span>
        <div className="flex flex-wrap items-center justify-center gap-1">
          <HitBadge hitType={item.hitType} />
          {item.multiplier > 1 ? (
            <span className="inline-flex items-center rounded-md bg-gol-soft px-1.5 py-0.5 font-mono text-[11px] font-bold text-gol-deep">
              {`×${item.multiplier}`}
            </span>
          ) : null}
        </div>
      </div>

      {/* Points pill — fixed width so the column aligns across rows */}
      <div
        className={cn(
          "flex w-11 flex-none items-center justify-center rounded-full px-2 py-1 font-mono text-sm font-bold tabular-nums",
          PTS_CLASSES[item.hitType],
        )}
      >
        {item.pointsAwarded > 0
          ? `+${item.pointsAwarded}`
          : `${item.pointsAwarded}`}
      </div>
    </li>
  );
}
