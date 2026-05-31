"use client";

/**
 * FilterSegment — horizontal segmented filter bar for predictions.
 *
 * Reads `filter`, `setFilter`, and `getFilterCount` from PredictionsProvider
 * context. The count derivation (filterPredicate logic) lives entirely in
 * predictions-board.ts + the provider — no logic here, only layout.
 *
 * Tabs: Todos / Pendientes / Cierran pronto / Guardados
 */

import type { FilterKind } from "@/features/predictions/entities/predictions-board";
import { cn } from "@/shared/lib/utils";

import { usePredictionsBoard } from "./predictions-provider";

export function FilterSegment() {
  const { filter, setFilter, getFilterCount } = usePredictionsBoard();

  const counts = {
    todos: getFilterCount("todos"),
    pendientes: getFilterCount("pendientes"),
    "cierran-pronto": getFilterCount("cierran-pronto"),
    guardados: getFilterCount("guardados"),
  } as const;

  return (
    <div
      className="flex gap-[7px] overflow-x-auto pb-[4px] pt-[12px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="toolbar"
      aria-label="Filtrar predicciones"
    >
      <FilterTab
        label="Todos"
        filterKind="todos"
        count={counts.todos}
        active={filter === "todos"}
        onClick={() => setFilter("todos")}
      />
      <FilterTab
        label="Pendientes"
        filterKind="pendientes"
        count={counts.pendientes}
        active={filter === "pendientes"}
        onClick={() => setFilter("pendientes")}
      />
      <FilterTab
        label="Cierran pronto"
        filterKind="cierran-pronto"
        count={counts["cierran-pronto"]}
        active={filter === "cierran-pronto"}
        onClick={() => setFilter("cierran-pronto")}
      />
      <FilterTab
        label="Guardados"
        filterKind="guardados"
        count={counts.guardados}
        active={filter === "guardados"}
        onClick={() => setFilter("guardados")}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// FilterTab — individual tab button
// ---------------------------------------------------------------------------

interface FilterTabProps {
  label: string;
  filterKind: FilterKind;
  count: number;
  active: boolean;
  onClick: () => void;
}

function FilterTab({ label, count, active, onClick }: FilterTabProps) {
  return (
    <button
      type="button"
      data-active={active}
      onClick={onClick}
      className={cn(
        // Base style matching design proof .seg
        "flex flex-none cursor-pointer select-none items-center gap-[7px] rounded-full border-0 px-[15px] py-[9px] font-sans text-[13.5px] font-[650] transition-all duration-[180ms]",
        active
          ? "bg-foreground text-background shadow-none"
          : "bg-background text-muted-foreground shadow-[inset_0_0_0_1.5px_var(--border)]",
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          "rounded-full px-[7px] py-[1px] font-mono text-[11.5px] font-bold",
          active
            ? "bg-white/[0.18] text-white"
            : "bg-muted text-muted-foreground",
        )}
      >
        {count}
      </span>
    </button>
  );
}
