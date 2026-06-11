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

/** Single row in the standings list. */
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

  // Sequential positions (1..n), points DESC, ties broken by name. A simple flat
  // list — no podium — so it fits any width (the podium overflowed on the PWA).
  const rankedRows: RankedLeaderboardRow[] = rankByPoints(rows);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tabla de posiciones</CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-2 pt-0">
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
            {rankedRows.map((row) => (
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
      </CardContent>
    </Card>
  );
}
