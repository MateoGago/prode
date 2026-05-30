"use client";

import Image from "next/image";

import {
  type Match,
  ROUND_MULTIPLIERS,
  type Round,
} from "@/features/fixtures/entities/match";
import {
  deriveHit,
  type HitType,
  shouldShowAdvancer,
} from "@/features/predictions/entities/match-card-state";
import type {
  PredictionError,
  PredictionInput,
} from "@/features/predictions/entities/prediction";
import { formatAR } from "@/shared/datetime";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";

import { AdvancerPicker } from "./advancer-picker";
import { ScoreControl } from "./score-control";

export type MatchCardProps = {
  match: Match;
  prediction: PredictionInput | null;
  isLocked: boolean;
  error?: PredictionError | "locked" | null;
  saving?: boolean;
  onChange: (next: PredictionInput) => void;
  onSubmit?: () => void;
};

const ROUND_LABELS: Record<Round, string> = {
  group: "Fase de grupos",
  r32: "32avos",
  r16: "Octavos",
  qf: "Cuartos",
  sf: "Semifinal",
  third_place: "Tercer puesto",
  final: "Final",
};

const HIT_LABELS: Record<HitType, string> = {
  exact: "Exacto",
  winner: "Ganador",
  miss: "Erró",
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

function normalizeScore(value: number) {
  return Math.max(0, Math.trunc(value));
}

function TeamFlag({ name, flagUrl }: { name: string; flagUrl: string | null }) {
  if (flagUrl) {
    return (
      <Image
        src={flagUrl}
        alt={`Bandera de ${name}`}
        width={30}
        height={30}
        className="size-[30px] shrink-0 rounded-full object-cover ring-[1.5px] ring-inset ring-border"
        unoptimized
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className="size-[30px] shrink-0 rounded-full border border-dashed border-border bg-card-muted"
    />
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
    <div className="flex items-center gap-3 py-1.5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <TeamFlag name={name} flagUrl={flagUrl} />
        <span className="truncate text-[15px] font-semibold">{name}</span>
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

/** Round / multiplier / status chip row at the top of the card. */
function TopChips({
  match,
  state,
}: {
  match: Match;
  state: "open" | "locked" | "live" | "confirmed";
}) {
  const multiplier = match.multiplier || ROUND_MULTIPLIERS[match.round];

  return (
    <div className="mb-3.5 flex items-center gap-1.5">
      <span className="inline-flex items-center gap-1.5 rounded-pill bg-card px-2.5 py-1.5 text-xs font-semibold text-muted-foreground shadow-[inset_0_0_0_1.5px_var(--border)]">
        {ROUND_LABELS[match.round]}
      </span>

      {multiplier > 1 ? (
        <span className="inline-flex items-center gap-1.5 rounded-pill bg-primary-soft px-2.5 py-1.5 font-mono text-xs font-bold text-primary-deep">
          ×{multiplier}
        </span>
      ) : null}

      <span className="ml-auto">
        {state === "live" ? (
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-gol-soft px-2.5 py-1.5 text-xs font-semibold text-gol-deep">
            <span className="size-[7px] animate-pulse-live rounded-full bg-gol" />
            En juego
          </span>
        ) : state === "confirmed" ? (
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-primary-soft px-2.5 py-1.5 text-xs font-semibold text-primary-deep">
            ✓ Confirmado
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-warn-soft px-2.5 py-1.5 text-xs font-semibold text-warn-deep">
            ⏱ {formatAR(match.kickoffAt)}
          </span>
        )}
      </span>
    </div>
  );
}

/** Confirmed: Vos vs Real + the hit badge. Hit is derived purely from scores. */
function ConfirmedPanel({
  prediction,
  homeScore,
  awayScore,
}: {
  prediction: PredictionInput;
  homeScore: number;
  awayScore: number;
}) {
  const hit = deriveHit(
    { homeScore: prediction.homeScore, awayScore: prediction.awayScore },
    { homeScore, awayScore },
  );

  const hitClass =
    hit === "exact"
      ? "bg-primary text-primary-foreground"
      : hit === "winner"
        ? "bg-winner text-[oklch(0.28_0.06_80)]"
        : "bg-card-muted text-muted-foreground";

  return (
    <div className="mt-3 flex items-center gap-3 rounded-xl bg-primary-soft p-3">
      <div className="flex items-center gap-3.5">
        <div className="text-center">
          <div className="text-[10px] font-bold uppercase tracking-wide text-primary-deep/80">
            Vos
          </div>
          <div className="font-mono text-lg font-bold text-primary-deep">
            {prediction.homeScore}–{prediction.awayScore}
          </div>
        </div>
        <div className="text-center">
          <div className="text-[10px] font-bold uppercase tracking-wide text-primary-deep/80">
            Real
          </div>
          <div className="font-mono text-lg font-bold text-primary-deep">
            {homeScore}–{awayScore}
          </div>
        </div>
      </div>
      <span
        className={cn(
          "ml-auto rounded-lg px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide",
          hitClass,
        )}
      >
        {HIT_LABELS[hit]}
      </span>
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

  const isConfirmed =
    match.resultConfirmedAt !== null &&
    match.homeScore !== null &&
    match.awayScore !== null;
  const isLive = !isConfirmed && match.status === "live";

  const state: "open" | "locked" | "live" | "confirmed" = isConfirmed
    ? "confirmed"
    : isLive
      ? "live"
      : isLocked
        ? "locked"
        : "open";

  const controlsDisabled = isLocked || saving || isConfirmed || isLive;
  const message = mapErrorMessage(error);

  const showAdvancer = shouldShowAdvancer(match.round, homeScore, awayScore);
  const advancerOptions = [match.homeTeam, match.awayTeam].filter(
    (t): t is NonNullable<typeof t> => t !== null,
  );
  const celebration = match.round !== "group";

  function setHomeScore(nextValue: number) {
    onChange({
      homeScore: normalizeScore(nextValue),
      awayScore,
      advancerTeamId: showAdvancerAfter(nextValue, awayScore)
        ? advancerTeamId
        : null,
    });
  }

  function setAwayScore(nextValue: number) {
    onChange({
      homeScore,
      awayScore: normalizeScore(nextValue),
      advancerTeamId: showAdvancerAfter(homeScore, nextValue)
        ? advancerTeamId
        : null,
    });
  }

  // Clear a stale advancer when the prediction stops being a KO draw, so we
  // never submit an advancer the validation rule would reject (advancer_not_allowed).
  function showAdvancerAfter(home: number, away: number) {
    return shouldShowAdvancer(
      match.round,
      normalizeScore(home),
      normalizeScore(away),
    );
  }

  function setAdvancer(teamId: string) {
    onChange({ homeScore, awayScore, advancerTeamId: teamId });
  }

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-3xl bg-card p-4 shadow-card",
        state === "locked" && "opacity-95",
      )}
    >
      <TopChips match={match} state={state} />

      {state === "confirmed" ? (
        <>
          <div className="flex items-center gap-3 py-1.5">
            <TeamFlag
              name={homeName}
              flagUrl={match.homeTeam?.flagUrl ?? null}
            />
            <span className="truncate text-[15px] font-semibold">
              {homeName}
            </span>
          </div>
          <div className="my-1.5 h-px bg-border/60" />
          <div className="flex items-center gap-3 py-1.5">
            <TeamFlag
              name={awayName}
              flagUrl={match.awayTeam?.flagUrl ?? null}
            />
            <span className="truncate text-[15px] font-semibold">
              {awayName}
            </span>
          </div>
          {prediction ? (
            <ConfirmedPanel
              prediction={prediction}
              homeScore={match.homeScore ?? 0}
              awayScore={match.awayScore ?? 0}
            />
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              No pronosticaste este partido.
            </p>
          )}
        </>
      ) : (
        <>
          <TeamRow
            name={homeName}
            flagUrl={match.homeTeam?.flagUrl ?? null}
            score={homeScore}
            controlsDisabled={controlsDisabled}
            scoreId={homeScoreId}
            onDecrement={() => setHomeScore(homeScore - 1)}
            onIncrement={() => setHomeScore(homeScore + 1)}
          />

          <div className="my-0.5 flex items-center justify-center">
            <span className="font-heading text-xs font-bold tracking-wider text-muted-foreground">
              VS
            </span>
          </div>

          <TeamRow
            name={awayName}
            flagUrl={match.awayTeam?.flagUrl ?? null}
            score={awayScore}
            controlsDisabled={controlsDisabled}
            scoreId={awayScoreId}
            onDecrement={() => setAwayScore(awayScore - 1)}
            onIncrement={() => setAwayScore(awayScore + 1)}
          />

          {showAdvancer && advancerOptions.length === 2 ? (
            <AdvancerPicker
              options={advancerOptions}
              selectedTeamId={advancerTeamId}
              disabled={controlsDisabled}
              onSelect={setAdvancer}
            />
          ) : null}

          {message ? (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {message}
            </p>
          ) : null}

          <div className="mt-3.5 flex items-center gap-2.5">
            {state === "locked" || state === "live" ? (
              <span className="text-[13px] font-semibold text-muted-foreground">
                {state === "live"
                  ? "🔴 En juego — predicción cerrada"
                  : "🔒 Este partido ya empezó"}
              </span>
            ) : (
              <span className="text-[13px] font-medium text-muted-foreground">
                💾 Sin guardar
              </span>
            )}

            {onSubmit && state === "open" ? (
              <Button
                type="button"
                variant={celebration ? "pop-gol" : "pop"}
                onClick={onSubmit}
                disabled={controlsDisabled}
                className="ml-auto h-auto px-5 py-2.5 text-[15px]"
              >
                {saving ? "Guardando..." : "Guardar"}
              </Button>
            ) : null}
          </div>
        </>
      )}
    </article>
  );
}
