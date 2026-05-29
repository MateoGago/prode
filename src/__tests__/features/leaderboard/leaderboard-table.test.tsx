import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  LeaderboardTable,
  type LeaderboardRow,
} from "@/features/leaderboard/components/leaderboard-table";

// next/link requires router context in tests; we stub it to a plain <a>.
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

const sampleRows: LeaderboardRow[] = [
  { playerId: "u1", playerName: "Alice", totalPoints: 30 },
  { playerId: "u2", playerName: "Bob", totalPoints: 20 },
  { playerId: "u3", playerName: "Charlie", totalPoints: 10 },
];

describe("LeaderboardTable", () => {
  it("renders player names", () => {
    render(<LeaderboardTable rows={sampleRows} />);

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Charlie")).toBeInTheDocument();
  });

  it("shows empty message when rows is empty", () => {
    render(
      <LeaderboardTable
        rows={[]}
        emptyMessage="Todavía no hay puntos cargados."
      />,
    );

    expect(
      screen.getByText("Todavía no hay puntos cargados."),
    ).toBeInTheDocument();
  });

  it("shows default empty message when emptyMessage is not provided", () => {
    render(<LeaderboardTable rows={[]} />);

    expect(
      screen.getByText("No hay posiciones para mostrar."),
    ).toBeInTheDocument();
  });

  it("with getPlayerHref, player name is a link with correct href", () => {
    render(
      <LeaderboardTable
        rows={sampleRows}
        getPlayerHref={(row) => `/tabla/${row.playerId}`}
      />,
    );

    const aliceLink = screen.getByRole("link", { name: "Alice" });
    expect(aliceLink).toHaveAttribute("href", "/tabla/u1");

    const bobLink = screen.getByRole("link", { name: "Bob" });
    expect(bobLink).toHaveAttribute("href", "/tabla/u2");
  });

  it("without getPlayerHref, renders player names as plain text (no links)", () => {
    render(<LeaderboardTable rows={sampleRows} />);

    const links = screen.queryAllByRole("link");
    expect(links).toHaveLength(0);

    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("highlightPlayerId marks the matching row with aria-current", () => {
    render(<LeaderboardTable rows={sampleRows} highlightPlayerId="u2" />);

    // Find the row containing "Bob" — it should be highlighted
    const bobCell = screen.getByText("Bob");
    const row = bobCell.closest("tr");
    expect(row).toHaveAttribute("aria-current", "true");

    // Other rows must NOT have aria-current
    const aliceCell = screen.getByText("Alice");
    const aliceRow = aliceCell.closest("tr");
    expect(aliceRow).not.toHaveAttribute("aria-current");
  });

  it("highlighted row has bg-primary/10 class", () => {
    render(<LeaderboardTable rows={sampleRows} highlightPlayerId="u1" />);

    const aliceCell = screen.getByText("Alice");
    const row = aliceCell.closest("tr");
    expect(row?.className).toContain("bg-primary/10");
  });

  it("shared rank on ties: two players with same points share the same Puesto (LB-1)", () => {
    const tiedRows: LeaderboardRow[] = [
      { playerId: "p1", playerName: "Player 1", totalPoints: 50 },
      { playerId: "p2", playerName: "Player 2", totalPoints: 50 },
      { playerId: "p3", playerName: "Player 3", totalPoints: 10 },
    ];

    render(<LeaderboardTable rows={tiedRows} />);

    // Both first-place rows should show rank 1
    const rankCells = screen.getAllByText("1");
    expect(rankCells).toHaveLength(2);

    // The last player should be rank 3 (not 2) due to shared rank
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});
