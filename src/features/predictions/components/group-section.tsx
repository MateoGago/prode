"use client";

import { ChevronDown } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

import type { Match } from "@/features/fixtures/entities/match";
import { filterPredicate } from "@/features/predictions/entities/predictions-board";
import { cn } from "@/shared/lib/utils";
import { useReveal } from "@/shared/motion";

import { MatchCardConnected } from "./match-card-connected";
import { usePredictionsBoard } from "./predictions-provider";

export type GroupSectionProps = {
  groupLabel: string;
  matches: Match[];
};

export function GroupSection({ groupLabel, matches }: GroupSectionProps) {
  const { rise, staggerContainer } = useReveal();
  const totalMatches = matches.length;

  // Read group progress + filter state from context
  const { groupProgress, filter, savedMap, workingMap, getLock } =
    usePredictionsBoard();
  const gp = groupProgress.find((g) => g.label === groupLabel);
  const isDone = gp?.status === "done";

  // Collapsed by default when the group is fully completed (REQ-06).
  // The user can always toggle any group open or closed.
  const [open, setOpen] = useState(!isDone);

  // Derive which matches are visible under the active filter (REQ-05).
  // `now` is the client clock — a hint only (constraint E); lock authority is Postgres.
  const now = new Date();
  const visibleMatchIds = new Set(
    matches
      .filter((m) => {
        const lock = getLock(m.id, m.kickoffAt);
        return filterPredicate(
          filter,
          m.id,
          savedMap,
          workingMap,
          lock,
          m.kickoffAt,
          now,
        );
      })
      .map((m) => m.id),
  );

  // If no matches are visible under the current filter, hide the entire group
  if (visibleMatchIds.size === 0 && filter !== "todos") {
    return null;
  }

  const bodyId = `group-body-${groupLabel}`;

  if (totalMatches === 0) {
    return (
      <section id={groupLabel} className="grid gap-3">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-controls={bodyId}
          className="flex w-full items-center gap-2.5 rounded-xl text-left transition-colors hover:opacity-90"
        >
          <span
            className={cn(
              "grid size-[30px] place-items-center rounded-xl font-heading text-[13px] font-bold text-background",
              isDone ? "bg-primary" : "bg-foreground",
            )}
          >
            {groupLabel}
          </span>
          <h2 className="font-heading text-[19px] font-bold tracking-tight">
            Grupo {groupLabel}
          </h2>
          <span className="ml-auto text-xs font-semibold text-muted-foreground">
            0 partidos
          </span>
          <ChevronDown
            aria-hidden
            className={cn(
              "size-4 text-muted-foreground transition-transform duration-200",
              open ? "rotate-0" : "-rotate-90",
            )}
          />
        </button>
        <p className="text-sm text-muted-foreground">
          No hay partidos para mostrar.
        </p>
      </section>
    );
  }

  return (
    <section id={groupLabel} className="grid gap-3">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls={bodyId}
        className="flex w-full items-center gap-2.5 rounded-xl text-left transition-colors hover:opacity-90"
      >
        <span
          className={cn(
            "grid size-[30px] place-items-center rounded-xl font-heading text-[13px] font-bold text-background",
            isDone ? "bg-primary" : "bg-foreground",
          )}
        >
          {groupLabel}
        </span>
        <h2 className="font-heading text-[19px] font-bold tracking-tight">
          Grupo {groupLabel}
        </h2>
        <span className="ml-auto text-xs font-semibold text-muted-foreground">
          {totalMatches} {totalMatches === 1 ? "partido" : "partidos"}
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            "size-4 text-muted-foreground transition-transform duration-200",
            open ? "rotate-0" : "-rotate-90",
          )}
        />
      </button>

      {open ? (
        <motion.div
          id={bodyId}
          className="grid gap-3 md:grid-cols-2"
          variants={staggerContainer}
          initial={staggerContainer ? "hidden" : undefined}
          animate={staggerContainer ? "visible" : undefined}
        >
          {matches
            .filter((m) => visibleMatchIds.has(m.id))
            .map((match) => (
              <motion.div key={match.id} variants={rise}>
                <MatchCardConnected match={match} />
              </motion.div>
            ))}
        </motion.div>
      ) : null}
    </section>
  );
}
