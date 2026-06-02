import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
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

  // ── PRO-53: flat leaderboard until points differ ─────────────────────────

  it("no podium when all players are tied at 0 pts (season start)", () => {
    const allZero: LeaderboardRow[] = [
      { playerId: "a1", playerName: "Ana", totalPoints: 0 },
      { playerId: "a2", playerName: "Bruno", totalPoints: 0 },
      { playerId: "a3", playerName: "Carla", totalPoints: 0 },
      { playerId: "a4", playerName: "Diego", totalPoints: 0 },
    ];
    render(<LeaderboardTable rows={allZero} />);

    // No podium section
    expect(
      screen.queryByRole("region", { name: /podio/i }),
    ).not.toBeInTheDocument();

    // No crown
    expect(screen.queryByText("👑")).not.toBeInTheDocument();

    // All four players appear in the flat list
    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.getByText("Bruno")).toBeInTheDocument();
    expect(screen.getByText("Carla")).toBeInTheDocument();
    expect(screen.getByText("Diego")).toBeInTheDocument();
  });

  it("no podium when 3+ players are all tied at the same non-zero score", () => {
    const allTied: LeaderboardRow[] = [
      { playerId: "t1", playerName: "Player 1", totalPoints: 15 },
      { playerId: "t2", playerName: "Player 2", totalPoints: 15 },
      { playerId: "t3", playerName: "Player 3", totalPoints: 15 },
    ];
    render(<LeaderboardTable rows={allTied} />);

    expect(
      screen.queryByRole("region", { name: /podio/i }),
    ).not.toBeInTheDocument();

    // All players render in the flat table (rank badges present)
    expect(screen.getByTestId("position-badge-t1")).toBeInTheDocument();
    expect(screen.getByTestId("position-badge-t2")).toBeInTheDocument();
    expect(screen.getByTestId("position-badge-t3")).toBeInTheDocument();
  });

  it("podium player with href renders as a link inside the podium region", () => {
    const rowsWithHref: LeaderboardRow[] = [
      {
        playerId: "u1",
        playerName: "Alice",
        totalPoints: 30,
        href: "/tabla/u1",
      },
      { playerId: "u2", playerName: "Bob", totalPoints: 20, href: "/tabla/u2" },
      { playerId: "u3", playerName: "Charlie", totalPoints: 10 },
    ];
    render(<LeaderboardTable rows={rowsWithHref} />);

    const podium = screen.getByRole("region", { name: /podio/i });

    // Alice (rank 1) and Bob (rank 2) have hrefs — should be links
    const aliceLink = screen.getAllByRole("link", { name: "Alice" })[0];
    expect(podium).toContainElement(aliceLink);
    expect(aliceLink).toHaveAttribute("href", "/tabla/u1");

    const bobLink = screen.getAllByRole("link", { name: "Bob" })[0];
    expect(podium).toContainElement(bobLink);
    expect(bobLink).toHaveAttribute("href", "/tabla/u2");

    // Charlie has no href — should NOT be a link inside the podium
    expect(podium).toHaveTextContent("Charlie");
    expect(screen.queryByRole("link", { name: "Charlie" })).toBeNull();
  });

  it("podium renders when points differ (top player has more than the rest)", () => {
    const withSpread: LeaderboardRow[] = [
      { playerId: "s1", playerName: "Leader", totalPoints: 50 },
      { playerId: "s2", playerName: "Second", totalPoints: 30 },
      { playerId: "s3", playerName: "Third", totalPoints: 10 },
      { playerId: "s4", playerName: "Fourth", totalPoints: 5 },
    ];
    render(<LeaderboardTable rows={withSpread} />);

    // Podium present with top-3
    const podium = screen.getByRole("region", { name: /podio/i });
    expect(podium).toHaveTextContent("Leader");
    expect(podium).toHaveTextContent("Second");
    expect(podium).toHaveTextContent("Third");

    // Rank 4 in flat list
    expect(screen.getByTestId("position-badge-s4")).toHaveTextContent("4");
  });
});

// ── Manage mode: owner-only remove controls (podium + list) ──────────────────

describe("LeaderboardTable — manage mode", () => {
  // 4 rows with a points spread: ranks 1-3 land in the podium, rank 4 in the list.
  const rows: LeaderboardRow[] = [
    { playerId: "owner", playerName: "Alice", totalPoints: 30 },
    { playerId: "u2", playerName: "Bob", totalPoints: 20 },
    { playerId: "u3", playerName: "Charlie", totalPoints: 10 },
    { playerId: "u4", playerName: "Diana", totalPoints: 5 },
  ];

  it("owner in manage mode sees a remove control for a list member, and clicking it fires onRemoveMember", () => {
    const onRemoveMember = vi.fn();
    render(
      <LeaderboardTable
        rows={rows}
        manageMode
        ownerId="owner"
        currentUserId="owner"
        onRemoveMember={onRemoveMember}
      />,
    );

    const removeDiana = screen.getByRole("button", { name: /echar a diana/i });
    fireEvent.click(removeDiana);

    expect(onRemoveMember).toHaveBeenCalledWith("u4", "Diana");
  });

  it("never shows a remove control for the owner themselves", () => {
    render(
      <LeaderboardTable
        rows={rows}
        manageMode
        ownerId="owner"
        currentUserId="owner"
        onRemoveMember={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: /echar a alice/i })).toBeNull();
  });

  it("shows remove controls for podium members (not just the list)", () => {
    render(
      <LeaderboardTable
        rows={rows}
        manageMode
        ownerId="owner"
        currentUserId="owner"
        onRemoveMember={vi.fn()}
      />,
    );

    // Bob (rank 2) and Charlie (rank 3) live in the podium, not the list.
    expect(
      screen.getByRole("button", { name: /echar a bob/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /echar a charlie/i }),
    ).toBeInTheDocument();
  });

  it("shows no remove controls when manage mode is off", () => {
    render(
      <LeaderboardTable
        rows={rows}
        ownerId="owner"
        currentUserId="owner"
        onRemoveMember={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: /echar a/i })).toBeNull();
  });

  it("shows no remove controls when the viewer is not the owner", () => {
    render(
      <LeaderboardTable
        rows={rows}
        manageMode
        ownerId="owner"
        currentUserId="u2"
        onRemoveMember={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: /echar a/i })).toBeNull();
  });
});
