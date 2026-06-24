"use client";

/**
 * Admin form to assign — or re-assign — a team to a knockout bracket slot.
 * Purely presentational — the role gate lives server-side in resolveSlotAction.
 * The submit button is NEVER hidden (spec: gate is server-side only).
 *
 * Two modes, driven by `currentTeamId`:
 *  - assign (no currentTeamId): empty selector, "Asignar", disabled until a team
 *    is picked.
 *  - edit (currentTeamId set): pre-selected with the current team, "Reasignar",
 *    disabled until a *different* team is picked (no pointless no-op writes).
 *
 * UI strings: Spanish. Code: English.
 */

import { Loader2 } from "lucide-react";
import type React from "react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/shared/ui/button";
import { TeamFlag } from "@/shared/ui/team-flag";
import type {
  ResolveSlotInput,
  ResolveSlotResult,
  Slot,
} from "../entities/resolve-slot";

/** Team option shape expected by the form (a subset of Team). */
export interface ResolveSlotFormTeamOption {
  id: string;
  name: string;
}

export interface ResolveSlotFormProps {
  matchId: string;
  slot: Slot;
  /** Human hint for which team belongs in this slot (e.g. "1° Grupo A", "Ganador P74"). */
  slotHint?: string;
  /**
   * Team currently occupying this slot, if any. When set, the form switches to
   * edit mode: pre-selected with this team and labelled "Reasignar".
   */
  currentTeamId?: string;
  /** Display name of the current team — shown (with its flag) as the previous value. */
  currentTeamName?: string;
  /** Flag of the current team for the previous-value line (null = no flag). */
  currentTeamFlagUrl?: string | null;
  teams: ResolveSlotFormTeamOption[];
  onSubmit: (input: ResolveSlotInput) => Promise<ResolveSlotResult>;
}

/** Humanized server-side errors for the slot resolution action (Spanish). */
const SERVER_ERROR_MESSAGES: Record<
  Extract<ResolveSlotResult, { ok: false }>["reason"],
  string
> = {
  forbidden: "No tenés permisos para asignar equipos.",
  match_not_found: "No se encontró el partido.",
  not_knockout:
    "Solo se pueden asignar equipos a partidos de fase eliminatoria.",
  team_not_found: "El equipo seleccionado no existe.",
};

export function ResolveSlotForm({
  matchId,
  slot,
  slotHint,
  currentTeamId,
  currentTeamName,
  currentTeamFlagUrl,
  teams,
  onSubmit,
}: ResolveSlotFormProps) {
  const isEdit = currentTeamId !== undefined;
  const [isPending, startTransition] = useTransition();
  // Assign mode starts unselected so a stray click can't assign the first team;
  // edit mode starts on the current team so the admin sees what's there.
  const [selectedTeamId, setSelectedTeamId] = useState<string>(
    currentTeamId ?? "",
  );

  // Nothing to submit until there's a real, *changed* selection — in edit mode
  // re-submitting the same team would be a pointless no-op write.
  const isUnchanged = !selectedTeamId || selectedTeamId === currentTeamId;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isUnchanged) return;

    startTransition(async () => {
      const result = await onSubmit({ matchId, slot, teamId: selectedTeamId });

      if (result.ok) {
        toast.success(
          isEdit
            ? "Equipo reasignado correctamente."
            : "Equipo asignado correctamente.",
        );
        return;
      }

      toast.error(SERVER_ERROR_MESSAGES[result.reason]);
    });
  }

  const slotLabel = slot === "home" ? "Local" : "Visitante";
  const showCurrent = isEdit && currentTeamName !== undefined;

  return (
    <form onSubmit={handleSubmit} className="grid gap-2">
      {showCurrent ? (
        <p className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Actual:</span>
          <TeamFlag
            name={currentTeamName ?? ""}
            flagUrl={currentTeamFlagUrl ?? null}
            size={18}
          />
          <span className="font-medium">{currentTeamName}</span>
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">
          <span className="text-muted-foreground">{slotLabel}:</span>
          {slotHint ? (
            <span className="ml-1 font-semibold">{slotHint}</span>
          ) : null}
        </span>

        <select
          value={selectedTeamId}
          onChange={(e) => setSelectedTeamId(e.target.value)}
          disabled={isPending}
          className="flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label={`Equipo ${slotLabel}`}
        >
          <option value="" disabled>
            — Elegí equipo —
          </option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>

        <Button
          type="submit"
          variant="pop"
          size="sm"
          disabled={isPending || isUnchanged}
        >
          {isPending ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          ) : null}
          {isEdit ? "Reasignar" : "Asignar"}
        </Button>
      </div>
    </form>
  );
}
