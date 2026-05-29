"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

export type LeaderboardRow = {
  playerId: string;
  playerName: string;
  totalPoints: number;
};

export type LeaderboardTableProps = {
  rows: LeaderboardRow[];
  emptyMessage?: string;
  ariaLabel?: string;
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
              {rankedRows.map((row) => (
                <tr key={row.playerId} className="border-b last:border-0">
                  <td className="px-3 py-2 font-semibold tabular-nums">
                    {row.rank}
                  </td>
                  <td className="px-3 py-2">{row.playerName}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">
                    {row.totalPoints}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
