"use client";

import Image from "next/image";

import type { Match } from "@/features/fixtures/entities/match";
import type {
  PredictionError,
  PredictionInput,
} from "@/features/predictions/entities/prediction";
import { formatAR } from "@/shared/datetime";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

export type MatchCardProps = {
  match: Match;
  prediction: PredictionInput | null;
  isLocked: boolean;
  error?: PredictionError | "locked" | null;
  saving?: boolean;
  onChange: (next: PredictionInput) => void;
  onSubmit?: () => void;
};

function mapErrorMessage(
  error?: PredictionError | "locked" | null,
): string | null {
  if (!error) return null;

  const messages: Record<PredictionError | "locked", string> = {
    negative_score: "Los goles no pueden ser negativos.",
    non_integer_score: "Los goles deben ser números enteros.",
    advancer_required: "En empate de eliminatoria, elegí quién avanza.",
    advancer_not_competing:
      "El equipo que avanza debe ser uno de los que juega.",
    advancer_not_allowed:
      "Solo se elige quién avanza en empate de eliminatoria.",
    locked: "Este partido ya empezó. La predicción está bloqueada.",
  };

  return messages[error];
}

function ScoreControl({
  value,
  disabled,
  onDecrement,
  onIncrement,
  teamName,
  scoreId,
}: {
  value: number;
  disabled: boolean;
  onDecrement: () => void;
  onIncrement: () => void;
  teamName: string;
  scoreId: string;
}) {
  return (
    <div className="inline-flex items-center rounded-lg border bg-background">
      <Label htmlFor={scoreId} className="sr-only">
        Goles de {teamName}
      </Label>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="h-8 w-8 rounded-r-none"
        disabled={disabled || value <= 0}
        onClick={onDecrement}
        aria-label={`Restar gol a ${teamName}`}
      >
        -
      </Button>

      <Input
        id={scoreId}
        type="number"
        readOnly
        disabled={disabled}
        value={value}
        className="h-8 w-12 rounded-none border-y-0 border-x text-center font-semibold tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="h-8 w-8 rounded-l-none"
        disabled={disabled}
        onClick={onIncrement}
        aria-label={`Sumar gol a ${teamName}`}
      >
        +
      </Button>
    </div>
  );
}

function TeamRow({
  name,
  flagUrl,
  score,
  controlsDisabled,
  onDecrement,
  onIncrement,
  scoreId,
}: {
  name: string;
  flagUrl: string | null;
  score: number;
  controlsDisabled: boolean;
  onDecrement: () => void;
  onIncrement: () => void;
  scoreId: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-card/40 p-3">
      <div className="flex min-w-0 items-center gap-2.5">
        {flagUrl ? (
          <Image
            src={flagUrl}
            alt={`Bandera de ${name}`}
            width={24}
            height={16}
            className="h-4 w-6 shrink-0 rounded-sm object-cover ring-1 ring-border"
            unoptimized
          />
        ) : (
          <div
            aria-hidden="true"
            className="h-4 w-6 shrink-0 rounded-sm border border-dashed border-border"
          />
        )}
        <span className="truncate text-sm font-medium">{name}</span>
      </div>

      <ScoreControl
        value={score}
        disabled={controlsDisabled}
        onDecrement={onDecrement}
        onIncrement={onIncrement}
        teamName={name}
        scoreId={scoreId}
      />
    </div>
  );
}

export function MatchCard({
  match,
  prediction,
  isLocked,
  error = null,
  saving = false,
  onChange,
  onSubmit,
}: MatchCardProps) {
  const homeName = match.homeTeam?.name ?? "Equipo por definir";
  const awayName = match.awayTeam?.name ?? "Equipo por definir";

  const homeScore = prediction?.homeScore ?? 0;
  const awayScore = prediction?.awayScore ?? 0;
  const advancerTeamId = prediction?.advancerTeamId ?? null;
  const homeScoreId = `${match.id}-home-score`;
  const awayScoreId = `${match.id}-away-score`;

  const controlsDisabled = isLocked || saving;
  const message = mapErrorMessage(error);
  const lockedHint = isLocked && !message ? "Predicción bloqueada" : null;

  function setHomeScore(nextValue: number) {
    onChange({
      homeScore: Math.max(0, nextValue),
      awayScore,
      advancerTeamId,
    });
  }

  function setAwayScore(nextValue: number) {
    onChange({
      homeScore,
      awayScore: Math.max(0, nextValue),
      advancerTeamId,
    });
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex-row items-center justify-between gap-3">
        {match.matchday ? (
          <p className="text-xs font-medium text-muted-foreground">
            Jornada {match.matchday}
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          {formatAR(match.kickoffAt)}
        </p>
      </CardHeader>

      <CardContent className="grid gap-3">
        <TeamRow
          name={homeName}
          flagUrl={match.homeTeam?.flagUrl ?? null}
          score={homeScore}
          controlsDisabled={controlsDisabled}
          scoreId={homeScoreId}
          onDecrement={() => setHomeScore(homeScore - 1)}
          onIncrement={() => setHomeScore(homeScore + 1)}
        />

        <TeamRow
          name={awayName}
          flagUrl={match.awayTeam?.flagUrl ?? null}
          score={awayScore}
          controlsDisabled={controlsDisabled}
          scoreId={awayScoreId}
          onDecrement={() => setAwayScore(awayScore - 1)}
          onIncrement={() => setAwayScore(awayScore + 1)}
        />

        {message ? (
          <p className="text-sm text-destructive" role="alert">
            {message}
          </p>
        ) : null}

        {lockedHint ? (
          <p className="text-xs text-muted-foreground">{lockedHint}</p>
        ) : null}
      </CardContent>

      {onSubmit ? (
        <CardFooter className="justify-end">
          <Button
            type="button"
            onClick={onSubmit}
            disabled={controlsDisabled}
            className="min-w-28"
          >
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
}
