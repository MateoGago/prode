"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { UserMinus } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { useReveal } from "@/shared/motion";
import { rankByPoints } from "../entities/leaderboard";

export type RemoveMemberHandler = (
  playerId: string,
  playerName: string,
) => void;

/** Small destructive icon button shown in manage mode to kick a member. */
function RemoveMemberButton({
  playerId,
  playerName,
  onRemove,
}: {
  playerId: string;
  playerName: string;
  onRemove: RemoveMemberHandler;
}) {
  return (
    <button
      type="button"
      onClick={() => onRemove(playerId, playerName)}
      aria-label={`Echar a ${playerName}`}
      className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-destructive ring-1 ring-inset ring-destructive/30 transition-colors hover:bg-destructive hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
    >
      <UserMinus className="size-3.5" aria-hidden="true" />
    </button>
  );
}

export type LeaderboardRow = {
  playerId: string;
  playerName: string;
  totalPoints: number;
  /**
   * When provided, the player name cell is wrapped in a Next.js Link.
   * Precomputed on the server so no function crosses the RSC boundary.
   */
  href?: string;
};

export type LeaderboardTableProps = {
  rows: LeaderboardRow[];
  emptyMessage?: string;
  ariaLabel?: string;
  /** When set, the matching row receives a highlight background and aria-current="true". */
  highlightPlayerId?: string;
  /**
   * Manage mode: when true AND the viewer (currentUserId) is the owner
   * (ownerId), every member EXCEPT the owner gets a remove control wired to
   * onRemoveMember. The owner can never remove themselves.
   */
  manageMode?: boolean;
  ownerId?: string;
  currentUserId?: string;
  onRemoveMember?: RemoveMemberHandler;
};

type RankedLeaderboardRow = LeaderboardRow & {
  rank: number;
};

/** Derives two-letter initials from a display name. */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/** Avatar circle styled by rank (1=gold, 2=silver, 3=bronze, else muted). */
function PodiumAvatar({ name, rank }: { name: string; rank: 1 | 2 | 3 }) {
  const avatarClass =
    rank === 1
      ? "bg-gradient-to-br from-gold to-gol"
      : rank === 2
        ? "bg-gradient-to-br from-[#9aa6c4] to-silver"
        : "bg-gradient-to-br from-bronze to-gol-deep";

  const avatarShadow =
    rank === 1
      ? "shadow-[0_3px_0_oklch(0.7_0.14_82),0_6px_12px_-4px_oklch(0.7_0.14_82/0.4)]"
      : rank === 2
        ? "shadow-[0_3px_0_oklch(0.66_0.012_250),0_6px_12px_-4px_oklch(0.66_0.012_250/0.4)]"
        : "shadow-[0_3px_0_oklch(0.56_0.10_50),0_6px_12px_-4px_oklch(0.56_0.10_50/0.4)]";

  return (
    <div
      aria-hidden="true"
      className={`relative grid size-12 shrink-0 place-items-center rounded-full text-lg font-bold text-white ring-1 ring-inset ring-black/10 ${avatarClass} ${avatarShadow}`}
    >
      {rank === 1 && (
        <span
          aria-hidden="true"
          className="absolute -top-5 text-xl animate-[crownpop_0.6s_0.5s_var(--ease-bounce)_both]"
        >
          👑
        </span>
      )}
      {getInitials(name)}
    </div>
  );
}

/** The three-column podium block above the table. Only rendered when ≥3 rows. */
function Podium({
  top3,
  highlightPlayerId,
  canManage,
  ownerId,
  onRemoveMember,
}: {
  top3: [RankedLeaderboardRow, RankedLeaderboardRow, RankedLeaderboardRow];
  highlightPlayerId?: string;
  canManage?: boolean;
  ownerId?: string;
  onRemoveMember?: RemoveMemberHandler;
}) {
  // Design shows order: 2nd | 1st | 3rd
  const [first, second, third] = top3;
  const ordered = [second, first, third] as const;

  const barHeight: Record<1 | 2 | 3, string> = {
    1: "h-[150px]",
    2: "h-[108px]",
    3: "h-[84px]",
  };

  // Solid medal fill + chunky hard 3D bottom ledge (darker oklch shade) + soft ambient
  const barStyle: Record<1 | 2 | 3, string> = {
    1: "bg-gold shadow-[0_6px_0_oklch(0.7_0.14_82),0_12px_20px_-8px_oklch(0.7_0.14_82/0.5)] ring-1 ring-inset ring-black/5",
    2: "bg-silver shadow-[0_6px_0_oklch(0.66_0.012_250),0_12px_20px_-8px_oklch(0.66_0.012_250/0.5)] ring-1 ring-inset ring-black/5",
    3: "bg-bronze shadow-[0_6px_0_oklch(0.56_0.10_50),0_12px_20px_-8px_oklch(0.56_0.10_50/0.5)] ring-1 ring-inset ring-black/5",
  };

  return (
    <section
      aria-label="Podio"
      className="flex items-end justify-center gap-2.5 mx-1.5 mb-1.5 mt-7 pt-2 h-[200px]"
    >
      {ordered.map((row) => {
        const r = row.rank as 1 | 2 | 3;
        const isOwn = highlightPlayerId === row.playerId;
        const showRemove =
          canManage && !!onRemoveMember && row.playerId !== ownerId;
        const columnContent = (
          <>
            <PodiumAvatar name={row.playerName} rank={r} />
            <span
              className={`text-[13px] font-bold truncate max-w-full text-center ${isOwn ? "text-primary" : ""}`}
            >
              {row.playerName}
            </span>
          </>
        );
        return (
          <div
            key={row.playerId}
            className="flex flex-1 flex-col items-center gap-2 justify-end"
          >
            {row.href ? (
              <Link
                href={row.href}
                className="flex flex-col items-center gap-2 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
              >
                {columnContent}
              </Link>
            ) : (
              <div className="flex flex-col items-center gap-2">
                {columnContent}
              </div>
            )}
            {showRemove && onRemoveMember && (
              <RemoveMemberButton
                playerId={row.playerId}
                playerName={row.playerName}
                onRemove={onRemoveMember}
              />
            )}
            {/* Bar grows from bottom; CSS animation reuses the shared bargrow keyframe */}
            <div
              className={[
                "w-full rounded-t-2xl flex flex-col items-center justify-start pt-2.5 gap-1 origin-bottom",
                "animate-[bargrow_0.7s_var(--ease-bounce)_forwards]",
                barHeight[r],
                barStyle[r],
              ].join(" ")}
              style={{
                // stagger: p3 first, p2 second, p1 last (matches design-lab)
                animationDelay: r === 1 ? "0.34s" : r === 2 ? "0.18s" : "0.05s",
                // start at scaleY(0) until animation kicks in
                transform: "scaleY(0)",
              }}
            >
              {/* span doesn't support aria-label — use visually-hidden sr-only text instead */}
              <span
                aria-hidden="true"
                className="font-heading text-2xl font-extrabold text-white leading-none"
              >
                {row.rank}
              </span>
              <span className="sr-only">Puesto {row.rank}</span>
              <span className="font-mono text-[13px] font-bold text-white/90 tabular-nums">
                {row.totalPoints} pts
              </span>
            </div>
          </div>
        );
      })}
    </section>
  );
}

/** Single row in the list below the podium (ranks 4+, or all rows if < 3). */
function TableRow({
  row,
  isHighlighted,
  rise,
  showRemove,
  onRemoveMember,
}: {
  row: RankedLeaderboardRow;
  isHighlighted: boolean;
  // biome-ignore lint/suspicious/noExplicitAny: motion variant or undefined
  rise: any;
  showRemove?: boolean;
  onRemoveMember?: RemoveMemberHandler;
}) {
  return (
    <motion.tr
      key={row.playerId}
      variants={rise}
      className={[
        "transition-colors",
        isHighlighted
          ? // Continuous rounded ring: each cell draws only its outer edges
            // (first=top/bottom/left, middle=top/bottom, last=top/bottom/right)
            // so there are no internal vertical dividers between the columns.
            "ring-primary bg-primary/10 [&>td:first-child]:rounded-l-xl [&>td:last-child]:rounded-r-xl [&>td:first-child]:shadow-[inset_0_2px_0_var(--color-primary),inset_0_-2px_0_var(--color-primary),inset_2px_0_0_var(--color-primary)] [&>td:nth-child(2)]:shadow-[inset_0_2px_0_var(--color-primary),inset_0_-2px_0_var(--color-primary)] [&>td:last-child]:shadow-[inset_0_2px_0_var(--color-primary),inset_0_-2px_0_var(--color-primary),inset_-2px_0_0_var(--color-primary)]"
          : "[&>td]:border-b",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-current={isHighlighted ? "true" : undefined}
    >
      <td className="px-3 py-2">
        <span
          data-testid={`position-badge-${row.playerId}`}
          className="inline-flex size-7 items-center justify-center rounded-full bg-muted font-mono text-[13px] font-bold tabular-nums text-muted-foreground"
        >
          {row.rank}
        </span>
      </td>
      <td className="px-3 py-2">
        {row.href ? (
          <Link
            href={row.href}
            className="font-medium text-primary underline-offset-4 hover:underline focus-visible:underline"
          >
            {row.playerName}
          </Link>
        ) : (
          <span className="font-semibold">{row.playerName}</span>
        )}
      </td>
      <td className="px-3 py-2 text-right font-mono font-bold tabular-nums">
        <span className="inline-flex items-center justify-end gap-2">
          {row.totalPoints}
          {showRemove && onRemoveMember && (
            <RemoveMemberButton
              playerId={row.playerId}
              playerName={row.playerName}
              onRemove={onRemoveMember}
            />
          )}
        </span>
      </td>
    </motion.tr>
  );
}

export function LeaderboardTable({
  rows,
  emptyMessage,
  ariaLabel = "Tabla de posiciones",
  highlightPlayerId,
  manageMode,
  ownerId,
  currentUserId,
  onRemoveMember,
}: LeaderboardTableProps) {
  const { rise, staggerContainer } = useReveal();

  // Only the owner, while manage mode is on, may remove members. Guarding on the
  // viewer here keeps the control off-limits even if a caller passes manageMode
  // for a non-owner.
  const canManage =
    !!manageMode && !!currentUserId && currentUserId === ownerId;

  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tabla de posiciones</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title={emptyMessage ?? "No hay posiciones para mostrar."}
          />
        </CardContent>
      </Card>
    );
  }

  const rankedRows: RankedLeaderboardRow[] = rankByPoints(rows);

  // Podium: only show when there are ≥3 rows AND players are NOT all tied on
  // the same points (e.g. season start at 0 should be a flat list, not a
  // degenerate podium where everyone is gold with a crown).
  const hasPodium =
    rankedRows.length >= 3 &&
    new Set(rankedRows.map((r) => r.totalPoints)).size > 1;
  const podiumRows = hasPodium
    ? (rankedRows.slice(0, 3) as [
        RankedLeaderboardRow,
        RankedLeaderboardRow,
        RankedLeaderboardRow,
      ])
    : null;

  // Rows below the podium: rank 4+ when podium is shown, otherwise all rows
  const listRows = hasPodium ? rankedRows.slice(3) : rankedRows;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tabla de posiciones</CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-2 pt-0">
        {podiumRows && (
          <Podium
            top3={podiumRows}
            highlightPlayerId={highlightPlayerId}
            canManage={canManage}
            ownerId={ownerId}
            onRemoveMember={onRemoveMember}
          />
        )}

        {listRows.length > 0 && (
          <div className="mt-3">
            <table
              className="w-full border-separate border-spacing-y-1 text-sm"
              aria-label={ariaLabel}
            >
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th
                    scope="col"
                    className="px-3 py-2 font-medium border-b border-border"
                  >
                    Puesto
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2 font-medium border-b border-border"
                  >
                    Jugador
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2 text-right font-medium border-b border-border"
                  >
                    Puntos
                  </th>
                </tr>
              </thead>
              <motion.tbody
                variants={staggerContainer}
                initial={staggerContainer ? "hidden" : undefined}
                animate={staggerContainer ? "visible" : undefined}
              >
                {listRows.map((row) => (
                  <TableRow
                    key={row.playerId}
                    row={row}
                    isHighlighted={highlightPlayerId === row.playerId}
                    rise={rise}
                    showRemove={canManage && row.playerId !== ownerId}
                    onRemoveMember={onRemoveMember}
                  />
                ))}
              </motion.tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
