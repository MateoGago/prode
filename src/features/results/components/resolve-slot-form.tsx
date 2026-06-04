"use client";

/**
 * Admin form to assign a team to an unresolved knockout bracket slot.
 * Purely presentational — the role gate lives server-side in resolveSlotAction.
 * The submit button is NEVER hidden (spec: gate is server-side only).
 *
 * UI strings: Spanish. Code: English.
 */

import { Loader2 } from "lucide-react";
import type React from "react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/shared/ui/button";
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
  teams,
  onSubmit,
}: ResolveSlotFormProps) {
  const [isPending, startTransition] = useTransition();
  // Start unselected so a stray "Asignar" click can't assign the first team.
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedTeamId) return;

    startTransition(async () => {
      const result = await onSubmit({ matchId, slot, teamId: selectedTeamId });

      if (result.ok) {
        toast.success("Equipo asignado correctamente.");
        return;
      }

      toast.error(SERVER_ERROR_MESSAGES[result.reason]);
    });
  }

  const slotLabel = slot === "home" ? "Local" : "Visitante";

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-3">
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
        disabled={isPending || !selectedTeamId}
      >
        {isPending ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
        ) : null}
        Asignar
      </Button>
    </form>
  );
}
