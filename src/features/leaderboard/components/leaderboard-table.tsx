"use client";

import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

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
};

type RankedLeaderboardRow = LeaderboardRow & {
  rank: number;
};

function getRankedRows(rows: LeaderboardRow[]): RankedLeaderboardRow[] {
  const sortedRows = [...rows].sort((a, b) => b.totalPoints - a.totalPoints);
  let lastPoints: number | null = null;
  let lastRank = 0;

  return sortedRows.map((row, index) => {
    const rank = lastPoints === row.totalPoints ? lastRank : index + 1;
    lastPoints = row.totalPoints;
    lastRank = rank;

    return {
      ...row,
      rank,
    };
  });
}

export function LeaderboardTable({
  rows,
  emptyMessage,
  ariaLabel = "Tabla de posiciones",
  highlightPlayerId,
}: LeaderboardTableProps) {
  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tabla de posiciones</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {emptyMessage ?? "No hay posiciones para mostrar."}
          </p>
        </CardContent>
      </Card>
    );
  }

  const rankedRows = getRankedRows(rows);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tabla de posiciones</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table
            className="min-w-[440px] w-full text-sm"
            aria-label={ariaLabel}
          >
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th scope="col" className="px-3 py-2 font-medium">
                  Puesto
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Jugador
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Puntos
                </th>
              </tr>
            </thead>
            <tbody>
              {rankedRows.map((row) => {
                const isHighlighted = highlightPlayerId === row.playerId;
                return (
                  <tr
                    key={row.playerId}
                    className={`border-b last:border-0${isHighlighted ? " bg-primary/10" : ""}`}
                    aria-current={isHighlighted ? "true" : undefined}
                  >
                    <td className="px-3 py-2 font-semibold tabular-nums">
                      {row.rank}
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
                        row.playerName
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">
                      {row.totalPoints}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
