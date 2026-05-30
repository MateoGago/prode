"use client";

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
import type { PredictionInput } from "@/features/predictions/entities/prediction";
import type { CardState } from "@/features/predictions/entities/predictions-board";
import { formatAR } from "@/shared/datetime";
import { cn } from "@/shared/lib/utils";
import { TeamFlag } from "@/shared/ui/team-flag";

import { AdvancerPicker } from "./advancer-picker";
import { ScoreControl } from "./score-control";

export type MatchCardProps = {
  match: Match;
  cardState: CardState;
  prediction: PredictionInput | null;
  error?: string | null;
  onChange: (next: PredictionInput) => void;
};

/** Known prediction-error reasons we map to friendly Spanish copy. */
const ERROR_MESSAGES: Record<string, string> = {
  negative_score: "Los goles no pueden ser negativos.",
  non_integer_score: "Los goles deben ser números enteros.",
  advancer_required: "En empate de eliminatoria, elegí quién avanza.",
  advancer_not_competing: "El equipo que avanza debe ser uno de los que juega.",
  advancer_not_allowed: "Solo se elige quién avanza en empate de eliminatoria.",
  locked: "Este partido ya empezó. La predicción está bloqueada.",
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

/**
 * Maps a raw save-failure reason (a PredictionError, "locked",
 * "match_not_found", "unauthenticated", or anything unexpected) to friendly
 * Spanish copy. Unknown reasons fall back to a generic message so the user
 * always sees something actionable instead of a blank alert.
 */
function mapErrorMessage(error?: string | null): string | null {
  if (!error) return null;
  return ERROR_MESSAGES[error] ?? "No se pudo guardar. Probá de nuevo.";
}

function normalizeScore(value: number) {
  return Math.max(0, Math.trunc(value));
}

/**
 * Single team column in the vertical two-column scoreboard layout.
 * flag → name → stepper, all center-aligned.
 */
function TeamColumn({
  name,
  flagUrl,
  score,
  controlsDisabled,
  empty,
  onDecrement,
  onIncrement,
  scoreId,
}: {
  name: string;
  flagUrl: string | null;
  score: number;
  controlsDisabled: boolean;
  empty: boolean;
  onDecrement: () => void;
  onIncrement: () => void;
  scoreId: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-2 px-1">
      <TeamFlag name={name} flagUrl={flagUrl} />
      <span className="line-clamp-2 text-center text-[13px] font-semibold leading-tight">
        {name}
      </span>
      <ScoreControl
        value={score}
        disabled={controlsDisabled}
        empty={empty}
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
  cardState,
  prediction,
  error = null,
  onChange,
}: MatchCardProps) {
  const homeName = match.homeTeam?.name ?? "Equipo por definir";
  const awayName = match.awayTeam?.name ?? "Equipo por definir";

  const homeScore = prediction?.homeScore ?? 0;
  const awayScore = prediction?.awayScore ?? 0;
  const advancerTeamId = prediction?.advancerTeamId ?? null;
  const homeScoreId = `${match.id}-home-score`;
  const awayScoreId = `${match.id}-away-score`;

  // Frozen states come straight from the derived cardState (lock authority is
  // Postgres; cardState already folds live/confirmed/locked together).
  const isConfirmed = cardState === "confirmed";

  // TopChips speaks "open" for every editable state (empty/dirty/saved); the
  // three frozen states pass through unchanged.
  const chipState: "open" | "locked" | "live" | "confirmed" =
    cardState === "live" || cardState === "confirmed" || cardState === "locked"
      ? cardState
      : "open";

  // Constraint B: "saved" is editable — only the frozen states disable controls.
  const controlsDisabled =
    cardState === "locked" || cardState === "live" || cardState === "confirmed";

  // Empty (sin-cargar): no value yet — steppers show "–" and decrement is off.
  const isEmpty = cardState === "empty" && prediction === null;

  const message = mapErrorMessage(error);

  const showAdvancer = shouldShowAdvancer(match.round, homeScore, awayScore);
  const advancerOptions = [match.homeTeam, match.awayTeam].filter(
    (t): t is NonNullable<typeof t> => t !== null,
  );

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
        cardState === "locked" && "opacity-95",
      )}
    >
      <TopChips match={match} state={chipState} />

      {isConfirmed ? (
        <>
          {/* Two-column flag → name header, same structure as editable states */}
          <div className="flex items-center gap-2 py-1">
            <div className="flex flex-1 flex-col items-center gap-1.5 px-1">
              <TeamFlag
                name={homeName}
                flagUrl={match.homeTeam?.flagUrl ?? null}
              />
              <span className="line-clamp-2 text-center text-[13px] font-semibold leading-tight">
                {homeName}
              </span>
            </div>
            <span className="font-mono text-base font-bold text-muted-foreground">
              :
            </span>
            <div className="flex flex-1 flex-col items-center gap-1.5 px-1">
              <TeamFlag
                name={awayName}
                flagUrl={match.awayTeam?.flagUrl ?? null}
              />
              <span className="line-clamp-2 text-center text-[13px] font-semibold leading-tight">
                {awayName}
              </span>
            </div>
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
          {/* Vertical two-column scoreboard: home | ":" | away */}
          <div className="flex items-center gap-2 py-1">
            <TeamColumn
              name={homeName}
              flagUrl={match.homeTeam?.flagUrl ?? null}
              score={homeScore}
              controlsDisabled={controlsDisabled}
              empty={isEmpty}
              scoreId={homeScoreId}
              onDecrement={() => setHomeScore(homeScore - 1)}
              onIncrement={() => setHomeScore(homeScore + 1)}
            />

            <span className="font-mono text-base font-bold text-muted-foreground">
              :
            </span>

            <TeamColumn
              name={awayName}
              flagUrl={match.awayTeam?.flagUrl ?? null}
              score={awayScore}
              controlsDisabled={controlsDisabled}
              empty={isEmpty}
              scoreId={awayScoreId}
              onDecrement={() => setAwayScore(awayScore - 1)}
              onIncrement={() => setAwayScore(awayScore + 1)}
            />
          </div>

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
            {cardState === "locked" || cardState === "live" ? (
              <span className="inline-flex items-center gap-1.5 rounded-pill bg-card-muted px-2.5 py-1.5 text-xs font-semibold text-muted-foreground shadow-[inset_0_0_0_1.5px_var(--border)]">
                <span className="size-[7px] rounded-full bg-muted-foreground/50" />
                {cardState === "live"
                  ? "En juego — cerrado"
                  : "Este partido ya empezó"}
              </span>
            ) : cardState === "saved" ? (
              // Constraint B: saved ≠ locked — the green pill is purely an
              // indicator; the steppers above stay active.
              <span className="inline-flex items-center gap-1.5 rounded-pill bg-primary-soft px-2.5 py-1.5 text-xs font-semibold text-primary-deep">
                ✓ Guardado
              </span>
            ) : cardState === "dirty" ? (
              <span className="inline-flex items-center gap-1.5 rounded-pill bg-card-muted px-2.5 py-1.5 text-xs font-semibold text-muted-foreground shadow-[inset_0_0_0_1.5px_var(--border)]">
                <span className="size-[7px] rounded-full bg-warn" />
                Sin guardar
              </span>
            ) : null}
          </div>
        </>
      )}
    </article>
  );
}
