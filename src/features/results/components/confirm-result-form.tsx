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

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import type { Round } from "@/features/fixtures/entities/match";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";

import {
  confirmResultFormSchema,
  type ConfirmResultFormValues,
} from "../entities/confirm-result-form-schema";
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
  defaultHomeScore,
  defaultAwayScore,
  defaultAdvancerTeamId,
  onSubmit,
  onSuccess,
}: ConfirmResultFormProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<ConfirmResultFormValues>({
    resolver: zodResolver(confirmResultFormSchema),
    defaultValues: {
      homeScore: defaultHomeScore ?? (NaN as unknown as number),
      awayScore: defaultAwayScore ?? (NaN as unknown as number),
      advancerTeamId: defaultAdvancerTeamId ?? null,
    },
  });

  const homeScore = form.watch("homeScore");
  const awayScore = form.watch("awayScore");

  const isKnockout = round !== "group";
  const isDraw =
    Number.isInteger(homeScore) &&
    Number.isInteger(awayScore) &&
    homeScore === awayScore;
  const showAdvancer = isKnockout && isDraw;
  const hasBothTeams = homeTeam !== null && awayTeam !== null;

  function handleSubmit(values: ConfirmResultFormValues) {
    // When the advancer control is hidden the slot must emit null, exactly as
    // validateResultInput expects for group / knockout-non-draw.
    const advancerTeamId = showAdvancer
      ? (values.advancerTeamId ?? null)
      : null;

    startTransition(async () => {
      const result = await onSubmit({
        matchId,
        homeScore: values.homeScore,
        awayScore: values.awayScore,
        advancerTeamId,
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
    <Card>
      <CardHeader>
        <CardTitle>Confirmar resultado</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="grid gap-4"
            noValidate
          >
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="homeScore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Local</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={1}
                        {...field}
                        value={Number.isNaN(field.value) ? "" : field.value}
                        onChange={(event) =>
                          field.onChange(event.target.valueAsNumber)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="awayScore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Visitante</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={1}
                        {...field}
                        value={Number.isNaN(field.value) ? "" : field.value}
                        onChange={(event) =>
                          field.onChange(event.target.valueAsNumber)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {showAdvancer ? (
              hasBothTeams ? (
                <FormField
                  control={form.control}
                  name="advancerTeamId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>¿Qué equipo avanzó?</FormLabel>
                      <div
                        role="radiogroup"
                        aria-label="Equipo que avanzó"
                        className="grid gap-2"
                      >
                        {[homeTeam, awayTeam].map((team) => (
                          <label
                            key={team.id}
                            className="flex items-center gap-2 text-sm"
                          >
                            <input
                              type="radio"
                              name={field.name}
                              value={team.id}
                              checked={field.value === team.id}
                              onChange={() => field.onChange(team.id)}
                            />
                            {team.name}
                          </label>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Los equipos aún no están definidos para este cruce.
                </p>
              )
            ) : null}

            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : null}
              Confirmar resultado
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
