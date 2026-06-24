"use client";

/**
 * BracketView — a FIFA-style connected knockout bracket.
 *
 * Layout: round columns are equal-height flex siblings, and each round's match
 * cells share the column height via flex:1 — so a round-N card lands at the
 * vertical midpoint of its two round-(N-1) feeders. Connector lines are drawn
 * as pseudo-elements in the gutters (see `.ko-*` rules in globals.css).
 *
 * Responsiveness (web / mobile / PWA): the bracket scrolls horizontally inside
 * its own container (the page itself never scrolls sideways — globals clips X).
 * A round-filter chip bar above it scroll-jumps to any round and tracks the
 * active round as the user drags, mirroring fifa.com on mobile.
 *
 * Each match card shows the kickoff (AR time), flags, the score once played,
 * the advancer emphasised + the loser dimmed, a penalty marker, and a live
 * pulse. The Final is a gold hero card; "Tercer puesto" trails as its own card.
 *
 * UI text in Spanish.
 */

import { Trophy } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { formatKickoffLong } from "@/shared/datetime";
import { cn } from "@/shared/lib/utils";
import { TeamFlag } from "@/shared/ui/team-flag";
import type {
  BracketMatch,
  BracketRound,
  BracketSlot,
  BracketWinner,
} from "@/features/tournament/entities/bracket";

// ---------------------------------------------------------------------------
// BracketView
// ---------------------------------------------------------------------------

export interface BracketViewProps {
  rounds: BracketRound[];
}

/** Connector geometry per column position (see `.ko-cell[data-line]` in CSS). */
type LineMode = "out" | "in" | "both" | null;

export function BracketView({ rounds }: BracketViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const colRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Split the funnel (r32 → final) from the standalone third-place match.
  const connected = useMemo(
    () => rounds.filter((round) => round.round !== "third_place"),
    [rounds],
  );
  const thirdPlace = useMemo(
    () => rounds.find((round) => round.round === "third_place") ?? null,
    [rounds],
  );

  // Chip order: every funnel round, then the third-place match if present.
  const chips = useMemo(() => {
    const list = connected.map((round) => ({
      round: round.round,
      label: round.label,
    }));
    if (thirdPlace) {
      list.push({ round: thirdPlace.round, label: "3er puesto" });
    }
    return list;
  }, [connected, thirdPlace]);

  const [active, setActive] = useState<string>(chips[0]?.round ?? "");

  // Scroll-spy: the active chip follows the leftmost column in view as the user
  // drags the bracket. rAF-throttled; passive listener.
  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller || chips.length === 0) return;

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const threshold = scroller.scrollLeft + 24;
        let current = chips[0]?.round ?? "";
        for (const chip of chips) {
          const el = colRefs.current[chip.round];
          if (el && el.offsetLeft <= threshold) current = chip.round;
        }
        setActive(current);
      });
    };

    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [chips]);

  if (rounds.length === 0) return null;

  const selectRound = (round: string) => {
    const el = colRefs.current[round];
    const scroller = scrollRef.current;
    setActive(round);
    if (!el || !scroller) return;
    // offsetParent is the (relative) scroll container — offsetLeft is the
    // column's position within the scrollable content.
    scroller.scrollTo({
      left: Math.max(0, el.offsetLeft - 8),
      behavior: "smooth",
    });
  };

  const lastIndex = connected.length - 1;
  const single = connected.length <= 1;

  return (
    <div className="grid gap-3">
      {/* Round filter chips — horizontally scrollable, like fifa.com on mobile */}
      <div
        role="tablist"
        aria-label="Filtrar por ronda"
        className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {chips.map((chip) => (
          <button
            key={chip.round}
            type="button"
            role="tab"
            aria-selected={active === chip.round}
            onClick={() => selectRound(chip.round)}
            className={cn(
              "shrink-0 cursor-pointer select-none rounded-full px-3.5 py-1.5 text-[12.5px] font-[650] whitespace-nowrap transition-colors duration-150",
              active === chip.round
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Horizontal scroller — the page never scrolls sideways, only this does */}
      <div ref={scrollRef} className="relative overflow-x-auto pb-3">
        <div
          className="flex min-w-max items-stretch gap-[1.75rem]"
          style={{ "--ko-gap": "1.75rem" } as React.CSSProperties}
        >
          {connected.map((round, index) => (
            <RoundColumn
              key={round.round}
              ref={(el) => {
                colRefs.current[round.round] = el;
              }}
              round={round}
              lineMode={
                single
                  ? null
                  : index === 0
                    ? "out"
                    : index === lastIndex
                      ? "in"
                      : "both"
              }
              joined={!single && index > 0}
              tone={round.round === "final" ? "gold" : "default"}
            />
          ))}

          {thirdPlace ? (
            <RoundColumn
              ref={(el) => {
                colRefs.current[thirdPlace.round] = el;
              }}
              round={{ ...thirdPlace, label: "Tercer puesto" }}
              lineMode={null}
              joined={false}
              tone="bronze"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RoundColumn — one round; its cells share the column height (flex:1)
// ---------------------------------------------------------------------------

type Tone = "default" | "gold" | "bronze";

interface RoundColumnProps {
  round: BracketRound;
  lineMode: LineMode;
  joined: boolean;
  tone: Tone;
  ref?: React.Ref<HTMLDivElement>;
}

function RoundColumn({ round, lineMode, joined, tone, ref }: RoundColumnProps) {
  return (
    <div
      ref={ref}
      className="flex w-[180px] shrink-0 flex-col scroll-mt-24 sm:w-[212px]"
    >
      <div
        className={cn(
          "mb-3 rounded-lg px-2 py-1.5 text-center",
          tone === "gold"
            ? "bg-gold/20"
            : tone === "bronze"
              ? "bg-bronze/15"
              : "bg-muted/70",
        )}
      >
        <span
          className={cn(
            "text-[11px] font-bold uppercase tracking-[0.12em]",
            tone === "gold"
              ? "text-warn-deep"
              : tone === "bronze"
                ? "text-bronze"
                : "text-muted-foreground",
          )}
        >
          {round.label}
        </span>
      </div>

      <div className="flex flex-1 flex-col">
        {round.matches.map((match) => (
          <div
            key={match.id}
            className="ko-cell relative flex min-h-[4.25rem] flex-1 items-center py-4"
            data-line={lineMode ?? undefined}
            data-join={joined ? "" : undefined}
          >
            <KnockoutCard match={match} tone={tone} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// KnockoutCard — a single cross (home vs away)
// ---------------------------------------------------------------------------

interface KnockoutCardProps {
  match: BracketMatch;
  tone: Tone;
}

function KnockoutCard({ match, tone }: KnockoutCardProps) {
  const hasResult = match.homeScore !== null && match.awayScore !== null;
  const isLive = match.status === "live";
  const showScore = hasResult || isLive;

  const homeState = sideState(match.winner, "home");
  const awayState = sideState(match.winner, "away");

  return (
    <div
      className={cn(
        "relative z-[1] w-full overflow-hidden rounded-xl border bg-card shadow-card",
        tone === "gold"
          ? "border-gold/60 ring-1 ring-gold/35"
          : tone === "bronze"
            ? "border-bronze/45"
            : "border-border",
      )}
    >
      {/* Kickoff / live strip */}
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-2.5 py-1">
        {isLive ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-live">
            <span className="size-1.5 rounded-full bg-live animate-pulse-live" />
            En vivo
          </span>
        ) : (
          <span className="truncate text-[10.5px] font-medium text-muted-foreground">
            {formatKickoffLong(match.kickoffAt)}
          </span>
        )}
        {tone === "gold" ? (
          <Trophy aria-hidden className="size-3.5 shrink-0 text-gold" />
        ) : null}
      </div>

      <SlotRow
        slot={match.home}
        score={match.homeScore}
        state={homeState}
        showScore={showScore}
        penalties={match.decidedByPenalties && match.winner === "home"}
      />
      <div className="h-px bg-border/60" />
      <SlotRow
        slot={match.away}
        score={match.awayScore}
        state={awayState}
        showScore={showScore}
        penalties={match.decidedByPenalties && match.winner === "away"}
      />
    </div>
  );
}

type SideState = "win" | "lose" | "neutral";

function sideState(winner: BracketWinner, side: "home" | "away"): SideState {
  if (winner === null) return "neutral";
  return winner === side ? "win" : "lose";
}

// ---------------------------------------------------------------------------
// SlotRow — one team line inside a card
// ---------------------------------------------------------------------------

interface SlotRowProps {
  slot: BracketSlot;
  score: number | null;
  state: SideState;
  showScore: boolean;
  penalties: boolean;
}

function SlotRow({ slot, score, state, showScore, penalties }: SlotRowProps) {
  const isTeam = slot.kind === "team";

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-2.5 py-2",
        state === "win" && "bg-primary-soft/40",
      )}
    >
      {/* Winner accent bar, flush to the card's left edge. */}
      <span
        aria-hidden
        className={cn(
          "-ml-2.5 h-7 w-[3px] shrink-0 rounded-r",
          state === "win" ? "bg-primary" : "bg-transparent",
        )}
      />

      {isTeam ? (
        <TeamFlag name={slot.team.name} flagUrl={slot.team.flagUrl} size={16} />
      ) : (
        <span
          aria-hidden
          className="size-4 shrink-0 rounded-[3px] border border-dashed border-border-strong"
        />
      )}

      <span
        className={cn(
          "min-w-0 flex-1 truncate",
          isTeam
            ? cn(
                "text-[12.5px]",
                state === "win"
                  ? "font-bold text-foreground"
                  : state === "lose"
                    ? "font-medium text-muted-foreground"
                    : "font-semibold text-foreground",
              )
            : "text-[11.5px] text-muted-foreground",
        )}
      >
        {isTeam ? slot.team.name : slot.label}
      </span>

      {penalties ? (
        <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
          pen
        </span>
      ) : null}

      {showScore && score !== null ? (
        <span
          className={cn(
            "w-4 shrink-0 text-right font-mono text-[13px] tabular-nums",
            state === "win"
              ? "font-bold text-foreground"
              : "font-medium text-muted-foreground",
          )}
        >
          {score}
        </span>
      ) : null}
    </div>
  );
}
