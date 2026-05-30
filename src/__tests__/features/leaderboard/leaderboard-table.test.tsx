import React from "react";
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

// motion/react: collapse all variants so rendered markup is deterministic.
vi.mock("motion/react", () => {
  const makeEl =
    (Tag: string) =>
    ({
      children,
      className,
      "aria-current": ariaCurrent,
      "aria-label": ariaLabel,
      role,
      ...rest
    }: {
      children?: React.ReactNode;
      className?: string;
      "aria-current"?: string;
      "aria-label"?: string;
      role?: string;
      [key: string]: unknown;
    }) => {
      const props: Record<string, unknown> = { className };
      if (ariaCurrent !== undefined) props["aria-current"] = ariaCurrent;
      if (ariaLabel !== undefined) props["aria-label"] = ariaLabel;
      if (role !== undefined) props.role = role;
      if (typeof rest["data-testid"] === "string")
        props["data-testid"] = rest["data-testid"];
      return React.createElement(Tag, props, children);
    };

  return {
    motion: {
      div: makeEl("div"),
      tr: makeEl("tr"),
      tbody: makeEl("tbody"),
    },
    useReducedMotion: () => false,
  };
});

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

  it("with row.href, player name (rank 4+) is a link with correct href", () => {
    // With podium showing top-3, rank 4+ appear in the table list with links
    const fourRows: LeaderboardRow[] = [
      ...sampleRows,
      {
        playerId: "u4",
        playerName: "Diana",
        totalPoints: 5,
        href: "/tabla/u4",
      },
    ];

    render(<LeaderboardTable rows={fourRows} />);

    const dianaLink = screen.getByRole("link", { name: "Diana" });
    expect(dianaLink).toHaveAttribute("href", "/tabla/u4");
  });

  it("without row.href, rank 4+ player renders as plain text (no links)", () => {
    const fourRows: LeaderboardRow[] = [
      ...sampleRows,
      { playerId: "u4", playerName: "Diana", totalPoints: 5 },
    ];
    render(<LeaderboardTable rows={fourRows} />);

    // Diana (rank 4, no href) should not be a link
    expect(screen.queryByRole("link", { name: "Diana" })).toBeNull();
    expect(screen.getByText("Diana")).toBeInTheDocument();
  });

  it("highlightPlayerId marks a rank-4+ row with aria-current", () => {
    // Bob is rank 2 (in podium); Diana is rank 4 (in list below podium)
    const fourRows: LeaderboardRow[] = [
      ...sampleRows,
      { playerId: "u4", playerName: "Diana", totalPoints: 5 },
    ];
    render(<LeaderboardTable rows={fourRows} highlightPlayerId="u4" />);

    const dianaCell = screen.getByText("Diana");
    const row = dianaCell.closest("tr");
    expect(row).toHaveAttribute("aria-current", "true");

    // Charlie is rank 3 — lives in the podium (not a <tr>), so no aria-current row
    const charlieCell = screen.getByText("Charlie");
    expect(charlieCell.closest("tr")).toBeNull();
  });

  it("highlighted row (rank 4+) has ring-primary class (own-row highlight)", () => {
    // Alice is rank 1 (in podium), Diana is rank 4 (in the list table)
    const moreRows: LeaderboardRow[] = [
      ...sampleRows,
      { playerId: "u4", playerName: "Diana", totalPoints: 5 },
    ];
    render(<LeaderboardTable rows={moreRows} highlightPlayerId="u4" />);

    const dianaCell = screen.getByText("Diana");
    const row = dianaCell.closest("tr");
    // The redesigned row uses ring-2 ring-primary for own-row highlight
    expect(row?.className).toMatch(/ring-primary/);
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

  // ── D-7: Cancha Pop podium + reveal ─────────────────────────────────────────

  it("renders a podium section for top-3 rows", () => {
    render(<LeaderboardTable rows={sampleRows} />);

    // Podium region is labelled
    expect(screen.getByRole("region", { name: /podio/i })).toBeInTheDocument();
  });

  it("podium shows names for rank 1, 2, and 3", () => {
    render(<LeaderboardTable rows={sampleRows} />);

    const podium = screen.getByRole("region", { name: /podio/i });
    expect(podium).toHaveTextContent("Alice");
    expect(podium).toHaveTextContent("Bob");
    expect(podium).toHaveTextContent("Charlie");
  });

  it("podium uses crown emoji for rank-1 player", () => {
    render(<LeaderboardTable rows={sampleRows} />);

    const podium = screen.getByRole("region", { name: /podio/i });
    expect(podium).toHaveTextContent("👑");
  });

  it("table rows below the podium still show position badges", () => {
    // With more than 3 players, ranks 4+ appear in the table list
    const moreRows: LeaderboardRow[] = [
      ...sampleRows,
      { playerId: "u4", playerName: "Diana", totalPoints: 5 },
    ];
    render(<LeaderboardTable rows={moreRows} />);

    // Diana is rank 4, should appear in the list (not podium)
    const dianaCell = screen.getByText("Diana");
    expect(dianaCell).toBeInTheDocument();

    // Position badge "4" should exist somewhere
    expect(screen.getByTestId("position-badge-u4")).toHaveTextContent("4");
  });

  it("podium is not rendered when fewer than 3 rows", () => {
    const twoRows: LeaderboardRow[] = [
      { playerId: "u1", playerName: "Alice", totalPoints: 30 },
      { playerId: "u2", playerName: "Bob", totalPoints: 20 },
    ];
    render(<LeaderboardTable rows={twoRows} />);

    // No podium region — falls back to full table view
    expect(
      screen.queryByRole("region", { name: /podio/i }),
    ).not.toBeInTheDocument();
  });

  it("own-row in list below podium gets aria-current and ring highlight", () => {
    const moreRows: LeaderboardRow[] = [
      ...sampleRows,
      { playerId: "u4", playerName: "Diana", totalPoints: 5 },
    ];
    render(<LeaderboardTable rows={moreRows} highlightPlayerId="u4" />);

    const dianaCell = screen.getByText("Diana");
    const row = dianaCell.closest("tr");
    expect(row).toHaveAttribute("aria-current", "true");
    expect(row?.className).toMatch(/ring-primary/);
  });

  it("renders EmptyState with no-posiciones text when rows is empty", () => {
    render(<LeaderboardTable rows={[]} />);

    // EmptyState renders a <p> with the title
    expect(
      screen.getByText("No hay posiciones para mostrar."),
    ).toBeInTheDocument();
  });
});
