"use client";

/**
 * GroupNav — horizontally scrollable chip row for group navigation.
 *
 * Reads `groupProgress` and `jumpToGroup` from PredictionsProvider context.
 * Chip visual states: done (green) / partial (warn ring) / empty (neutral).
 * Tapping a chip scrolls to the matching group section anchor.
 */

import { cn } from "@/shared/lib/utils";

import { usePredictionsBoard } from "./predictions-provider";

export function GroupNav() {
  const { groupProgress, jumpToGroup } = usePredictionsBoard();

  return (
    <nav
      className="flex gap-[7px] overflow-x-auto px-[18px] pb-[6px] pt-[8px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Navegación por grupos"
    >
      {groupProgress.map((gp) => (
        <GroupChip
          key={gp.label}
          label={gp.label}
          loaded={gp.loaded}
          total={gp.total}
          status={gp.status}
          onTap={() => jumpToGroup(gp.label)}
        />
      ))}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// GroupChip — individual chip per group
// ---------------------------------------------------------------------------

interface GroupChipProps {
  label: string;
  loaded: number;
  total: number;
  status: "done" | "partial" | "empty";
  onTap: () => void;
}

function GroupChip({ label, loaded, total, status, onTap }: GroupChipProps) {
  return (
    <button
      type="button"
      aria-label={`Grupo ${label}`}
      data-status={status}
      onClick={onTap}
      className={cn(
        // Base chip style matching design proof .gchip
        "flex flex-none cursor-pointer select-none items-center gap-[7px] rounded-full border-0 px-[12px] py-[7px] font-sans text-[12.5px] font-bold transition-all duration-[160ms]",
        // Empty state: white pill with inset border
        status === "empty" &&
          "bg-background text-muted-foreground shadow-[inset_0_0_0_1.5px_var(--border)]",
        // Partial state: warn inset ring
        status === "partial" &&
          "bg-background text-foreground shadow-[inset_0_0_0_1.5px_var(--color-warn)]",
        // Done state: primary soft bg, no shadow
        status === "done" && "bg-primary/12 text-primary-deep shadow-none",
      )}
    >
      {/* Group letter */}
      <span>{label}</span>

      {/* Fraction: loaded/total */}
      <span
        className={cn(
          "font-mono text-[11px]",
          status === "empty" && "text-muted-foreground/60",
          status === "partial" && "text-warn-deep",
          status === "done" && "text-primary-deep",
        )}
      >
        {loaded}/{total}
      </span>
    </button>
  );
}
