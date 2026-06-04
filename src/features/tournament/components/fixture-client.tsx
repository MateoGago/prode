"use client";

/**
 * FixtureClient — holds the Grupos | Llave toggle state.
 *
 * Receives pre-computed standings and bracket from the RSC page (single fetch).
 * No secondary fetch on toggle — all data is already in props.
 * Visual language mirrors ViewModeToggle (segmented pill bar).
 */

import { useState } from "react";
import { LayoutGrid, Trophy, type LucideIcon } from "lucide-react";

import type { GroupStandings } from "@/features/tournament/entities/standings";
import type { BracketRound } from "@/features/tournament/entities/bracket";
import { cn } from "@/shared/lib/utils";
import { StandingsTable } from "./standings-table";
import { BracketView } from "./bracket-view";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FixtureView = "grupos" | "llave";

// ---------------------------------------------------------------------------
// FixtureClient
// ---------------------------------------------------------------------------

export interface FixtureClientProps {
  standings: GroupStandings[];
  bracket: BracketRound[];
  /** Team IDs for top-2 qualification highlights (plain array — RSC-safe). */
  qualifiedTeamIds: string[];
  /** Team IDs for best-thirds highlights. */
  bestThirdTeamIds?: string[];
}

export function FixtureClient({
  standings,
  bracket,
  qualifiedTeamIds,
  bestThirdTeamIds = [],
}: FixtureClientProps) {
  const [view, setView] = useState<FixtureView>("grupos");

  return (
    <div className="grid gap-6">
      {/* Segmented toggle */}
      <div
        role="toolbar"
        aria-label="Ver por"
        className="inline-flex w-fit flex-none items-center gap-[3px] rounded-full bg-muted p-[3px]"
      >
        <FixtureSegment
          label="Grupos"
          icon={LayoutGrid}
          view="grupos"
          active={view === "grupos"}
          onSelect={() => setView("grupos")}
        />
        <FixtureSegment
          label="Llave"
          icon={Trophy}
          view="llave"
          active={view === "llave"}
          onSelect={() => setView("llave")}
        />
      </div>

      {/* Content */}
      {view === "grupos" ? (
        <StandingsTable
          standings={standings}
          qualifiedTeamIds={qualifiedTeamIds}
          bestThirdTeamIds={bestThirdTeamIds}
        />
      ) : (
        <BracketView rounds={bracket} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FixtureSegment — individual toggle segment
// ---------------------------------------------------------------------------

interface FixtureSegmentProps {
  label: string;
  icon: LucideIcon;
  view: FixtureView;
  active: boolean;
  onSelect: () => void;
}

function FixtureSegment({
  label,
  icon: Icon,
  active,
  onSelect,
}: FixtureSegmentProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      data-active={active}
      onClick={onSelect}
      className={cn(
        "flex cursor-pointer select-none items-center gap-1.5 rounded-full border-0 px-[15px] py-[7px] font-sans text-[13px] font-[650] transition-all duration-[180ms]",
        active
          ? "bg-background text-foreground shadow-[0_1px_2px_oklch(0.24_0.03_165/0.12)]"
          : "bg-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="size-[15px]" aria-hidden="true" />
      {label}
    </button>
  );
}
