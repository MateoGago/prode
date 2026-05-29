"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

export type MatchBreakdownItem = {
  matchId: string;
  matchLabel: string;
  predictedHomeScore: number;
  predictedAwayScore: number;
  actualHomeScore: number;
  actualAwayScore: number;
  pointsAwarded: number;
};

export type MatchBreakdownListProps = {
  items: MatchBreakdownItem[];
  emptyMessage?: string;
  ariaLabel?: string;
};

function formatScore(homeScore: number, awayScore: number): string {
  return `${homeScore} - ${awayScore}`;
}

function formatPoints(points: number): string {
  return points > 0 ? `+${points} pts` : "0 pts";
}

export function MatchBreakdownList({
  items,
  emptyMessage,
  ariaLabel = "Desglose por partido",
}: MatchBreakdownListProps) {
  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Desglose por partido</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {emptyMessage ?? "No hay desglose para mostrar."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Desglose por partido</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table
            className="min-w-[560px] w-full text-sm"
            aria-label={ariaLabel}
          >
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th scope="col" className="px-3 py-2 font-medium">
                  Partido
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Predicción
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Resultado real
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Puntos
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.matchId} className="border-b last:border-0">
                  <td className="px-3 py-2">{item.matchLabel}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {formatScore(
                      item.predictedHomeScore,
                      item.predictedAwayScore,
                    )}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {formatScore(item.actualHomeScore, item.actualAwayScore)}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">
                    {formatPoints(item.pointsAwarded)}
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
