/**
 * BracketView — renders BracketRound[] as a horizontally-scrollable knockout bracket.
 *
 * Each round is a column of matches. Each match shows:
 * - Resolved slot: TeamFlag + team name
 * - Unresolved slot: formatted placeholder text (e.g. "1° Grupo A")
 * - Kickoff time formatted in AR timezone via formatKickoffLong()
 *
 * UI text in Spanish.
 */

import { TeamFlag } from "@/shared/ui/team-flag";
import { formatKickoffLong } from "@/shared/datetime";
import type {
  BracketRound,
  BracketSlot,
} from "@/features/tournament/entities/bracket";

// ---------------------------------------------------------------------------
// BracketView
// ---------------------------------------------------------------------------

export interface BracketViewProps {
  rounds: BracketRound[];
}

export function BracketView({ rounds }: BracketViewProps) {
  if (rounds.length === 0) {
    return null;
  }

  return (
    <div className="overflow-x-auto pb-4 lg:overflow-visible">
      <div className="flex min-w-max gap-4 lg:min-w-0">
        {rounds.map((round) => (
          <BracketRoundColumn key={round.round} round={round} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BracketRoundColumn — one column per round
// ---------------------------------------------------------------------------

interface BracketRoundColumnProps {
  round: BracketRound;
}

function BracketRoundColumn({ round }: BracketRoundColumnProps) {
  return (
    <div className="flex w-56 shrink-0 flex-col gap-3 lg:w-auto lg:flex-1">
      <div className="rounded-md bg-muted/60 px-3 py-1.5 text-center">
        <span className="text-[12px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
          {round.label}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {round.matches.map((match) => (
          <div
            key={match.id}
            className="overflow-hidden rounded-xl border border-border bg-card shadow-card"
          >
            {/* Kickoff */}
            <div className="border-b border-border/50 px-3 py-1.5 text-center">
              <span className="text-[11px] text-muted-foreground">
                {formatKickoffLong(match.kickoffAt)}
              </span>
            </div>

            {/* Home slot */}
            <div className="border-b border-border/50 px-3 py-2">
              <BracketSlotDisplay slot={match.home} />
            </div>

            {/* Away slot */}
            <div className="px-3 py-2">
              <BracketSlotDisplay slot={match.away} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BracketSlotDisplay — resolved team or placeholder
// ---------------------------------------------------------------------------

interface BracketSlotDisplayProps {
  slot: BracketSlot;
}

function BracketSlotDisplay({ slot }: BracketSlotDisplayProps) {
  if (slot.kind === "team") {
    return (
      <div className="flex items-center gap-2">
        <TeamFlag name={slot.team.name} flagUrl={slot.team.flagUrl} size={18} />
        <span className="text-[13px] font-medium">{slot.team.name}</span>
      </div>
    );
  }

  return (
    <span className="text-[12px] text-muted-foreground">{slot.label}</span>
  );
}
