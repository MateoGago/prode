"use client";

/**
 * FilteredGroupsOrEmpty — renders children (the groups list) when the active
 * filter has at least one visible match. When the count is zero, renders the
 * shared EmptyState with a per-filter Spanish message instead.
 *
 * Emptiness is determined via getFilterCount() from PredictionsProvider —
 * the same function FilterSegment uses for live badge counts — so there is
 * no duplication of filter logic here.
 */

import type { ReactNode } from "react";

import type { FilterKind } from "@/features/predictions/entities/predictions-board";
import { EmptyState } from "@/shared/ui/empty-state";

import { usePredictionsBoard } from "./predictions-provider";

// Per-filter empty-state messages (UI Spanish).
const EMPTY_MESSAGES: Record<FilterKind, string> = {
  guardados: "Todavía no guardaste ningún pronóstico.",
  pendientes: "¡No te queda nada pendiente! Cargaste todo.",
  "cierran-pronto": "No hay partidos que cierren pronto.",
  todos: "No hay partidos para mostrar.",
};

interface FilteredGroupsOrEmptyProps {
  children: ReactNode;
}

export function FilteredGroupsOrEmpty({
  children,
}: FilteredGroupsOrEmptyProps) {
  const { filter, getFilterCount } = usePredictionsBoard();
  const count = getFilterCount(filter);

  if (count === 0) {
    return (
      <div className="pt-4">
        <EmptyState title={EMPTY_MESSAGES[filter]} />
      </div>
    );
  }

  return <>{children}</>;
}
