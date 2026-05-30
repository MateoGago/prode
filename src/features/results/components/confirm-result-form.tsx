"use client";

/**
 * Admin result-override form (REQ-RES-5, REQ-XCUT-5). Purely presentational:
 * it collects a score, conditionally asks who advanced on a knockout draw,
 * emits a ResultInput, and surfaces server errors via toast. The real role gate
 * and the advancer business rules live server-side in confirmResultAction /
 * validateResultInput — this form NEVER hides the submit as a security measure
 * and NEVER duplicates those rules. No infra imports cross this boundary except
 * the injected onSubmit Server Action.
 */

import { Loader2 } from "lucide-react";
import type React from "react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import type { Round } from "@/features/fixtures/entities/match";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Stepper } from "@/shared/ui/stepper";

import type {
  ConfirmActionResult,
  ResultInput,
} from "../entities/confirm-result";

/** Every failure reason the server action can return. */
type ServerErrorReason = Extract<ConfirmActionResult, { ok: false }>["reason"];

/** A competing team option for the advancer selector (subset of Team). */
export interface ConfirmResultTeamOption {
  id: string;
  name: string;
}

export interface ConfirmResultFormProps {
  matchId: string;
  round: Round;
  homeTeam: ConfirmResultTeamOption | null;
  awayTeam: ConfirmResultTeamOption | null;
  defaultHomeScore?: number;
  defaultAwayScore?: number;
  defaultAdvancerTeamId?: string | null;
  onSubmit: (input: ResultInput) => Promise<ConfirmActionResult>;
  onSuccess?: (recomputed: number) => void;
}

/** Humanized server-side errors (castellano). The client schema never raises these. */
const SERVER_ERROR_MESSAGES: Record<ServerErrorReason, string> = {
  forbidden: "No tenés permisos para confirmar resultados.",
  match_not_found: "No se encontró el partido.",
  negative_score: "El marcador no puede ser negativo.",
  non_integer_score: "El marcador debe ser un número entero.",
  advancer_required: "Elegí qué equipo avanzó.",
  advancer_not_competing: "El equipo elegido no juega este partido.",
  advancer_not_allowed: "Este partido no admite un equipo que avanza.",
};

export function ConfirmResultForm({
  matchId,
  round,
  homeTeam,
  awayTeam,
  defaultHomeScore = 0,
  defaultAwayScore = 0,
  defaultAdvancerTeamId,
  onSubmit,
  onSuccess,
}: ConfirmResultFormProps) {
  const [isPending, startTransition] = useTransition();
  const [homeScore, setHomeScore] = useState<number>(defaultHomeScore);
  const [awayScore, setAwayScore] = useState<number>(defaultAwayScore);
  const [advancerTeamId, setAdvancerTeamId] = useState<string | null>(
    defaultAdvancerTeamId ?? null,
  );

  const isKnockout = round !== "group";
  const isDraw = homeScore === awayScore;
  const showAdvancer = isKnockout && isDraw;
  const hasBothTeams = homeTeam !== null && awayTeam !== null;

  function handleHomeChange(next: number) {
    setHomeScore(next);
    // Breaking out of a draw state — clear any selected advancer.
    if (next !== awayScore) setAdvancerTeamId(null);
  }

  function handleAwayChange(next: number) {
    setAwayScore(next);
    if (homeScore !== next) setAdvancerTeamId(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const result = await onSubmit({
        matchId,
        homeScore,
        awayScore,
        // When the advancer control is hidden the slot must emit null, exactly
        // as validateResultInput expects for group / knockout-non-draw.
        advancerTeamId: showAdvancer ? advancerTeamId : null,
      });

      if (result.ok) {
        toast.success(
          `Resultado confirmado. Se recalcularon ${result.recomputed} predicciones.`,
        );
        onSuccess?.(result.recomputed);
        return;
      }

      toast.error(SERVER_ERROR_MESSAGES[result.reason]);
    });
  }

  return (
    <Card className="shadow-card">
      <CardHeader className="border-b">
        <CardTitle className="text-base font-semibold">
          Confirmar resultado
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-6 pt-4" noValidate>
          {/* Score steppers row */}
          <div className="grid grid-cols-2 gap-6">
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Local
              </span>
              <Stepper
                value={homeScore}
                onValueChange={handleHomeChange}
                label="Local"
                disabled={isPending}
              />
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Visitante
              </span>
              <Stepper
                value={awayScore}
                onValueChange={handleAwayChange}
                label="Visitante"
                disabled={isPending}
              />
            </div>
          </div>

          {/* Advancer selector — knockout draws only */}
          {showAdvancer ? (
            hasBothTeams ? (
              <div className="grid gap-2">
                <span className="text-sm font-medium">¿Qué equipo avanzó?</span>
                <div
                  role="radiogroup"
                  aria-label="Equipo que avanzó"
                  className="grid gap-2"
                >
                  {[homeTeam, awayTeam].map((team) => (
                    <label
                      key={team.id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card-muted px-3 py-2 text-sm transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary-soft"
                    >
                      <input
                        type="radio"
                        name={`advancer-${matchId}`}
                        value={team.id}
                        checked={advancerTeamId === team.id}
                        onChange={() => setAdvancerTeamId(team.id)}
                        disabled={isPending}
                      />
                      {team.name}
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Los equipos aún no están definidos para este cruce.
              </p>
            )
          ) : null}

          <Button
            type="submit"
            variant="pop-gol"
            size="lg"
            disabled={isPending}
            className="w-full"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : null}
            Confirmar resultado
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
