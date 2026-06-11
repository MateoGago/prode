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

  it("with row.href, the player name is a link with the correct href", () => {
    const rowsWithHref: LeaderboardRow[] = [
      ...sampleRows,
      {
        playerId: "u4",
        playerName: "Diana",
        totalPoints: 5,
        href: "/tabla/u4",
      },
    ];

    render(<LeaderboardTable rows={rowsWithHref} />);

    const dianaLink = screen.getByRole("link", { name: "Diana" });
    expect(dianaLink).toHaveAttribute("href", "/tabla/u4");
  });

  it("without row.href, the player renders as plain text (no link)", () => {
    const rowsNoHref: LeaderboardRow[] = [
      ...sampleRows,
      { playerId: "u4", playerName: "Diana", totalPoints: 5 },
    ];
    render(<LeaderboardTable rows={rowsNoHref} />);

    expect(screen.queryByRole("link", { name: "Diana" })).toBeNull();
    expect(screen.getByText("Diana")).toBeInTheDocument();
  });

  it("highlightPlayerId marks the matching row with aria-current", () => {
    render(<LeaderboardTable rows={sampleRows} highlightPlayerId="u2" />);

    const bobCell = screen.getByText("Bob");
    const row = bobCell.closest("tr");
    expect(row).toHaveAttribute("aria-current", "true");
  });

  it("the highlighted row carries the ring-primary own-row highlight", () => {
    render(<LeaderboardTable rows={sampleRows} highlightPlayerId="u2" />);

    const bobCell = screen.getByText("Bob");
    expect(bobCell.closest("tr")?.className).toMatch(/ring-primary/);
  });

  it("numbers tied players sequentially (1,2,3 — never shared)", () => {
    const tiedRows: LeaderboardRow[] = [
      { playerId: "p1", playerName: "Player 1", totalPoints: 50 },
      { playerId: "p2", playerName: "Player 2", totalPoints: 50 },
      { playerId: "p3", playerName: "Player 3", totalPoints: 10 },
    ];

    render(<LeaderboardTable rows={tiedRows} />);

    expect(screen.getByTestId("position-badge-p1")).toHaveTextContent("1");
    expect(screen.getByTestId("position-badge-p2")).toHaveTextContent("2");
    expect(screen.getByTestId("position-badge-p3")).toHaveTextContent("3");
  });

  it("breaks point ties alphabetically by name", () => {
    // Equal points: Zoe before Ana would be wrong — name order puts Ana first.
    const tied: LeaderboardRow[] = [
      { playerId: "z", playerName: "Zoe", totalPoints: 10 },
      { playerId: "a", playerName: "Ana", totalPoints: 10 },
    ];
    render(<LeaderboardTable rows={tied} />);

    expect(screen.getByTestId("position-badge-a")).toHaveTextContent("1");
    expect(screen.getByTestId("position-badge-z")).toHaveTextContent("2");
  });

  it("every row shows a position badge", () => {
    const moreRows: LeaderboardRow[] = [
      ...sampleRows,
      { playerId: "u4", playerName: "Diana", totalPoints: 5 },
    ];
    render(<LeaderboardTable rows={moreRows} />);

    expect(screen.getByTestId("position-badge-u1")).toHaveTextContent("1");
    expect(screen.getByTestId("position-badge-u4")).toHaveTextContent("4");
  });

  it("renders EmptyState with no-posiciones text when rows is empty", () => {
    render(<LeaderboardTable rows={[]} />);

    expect(
      screen.getByText("No hay posiciones para mostrar."),
    ).toBeInTheDocument();
  });

  it("renders all players in a flat list even when everyone is tied at 0", () => {
    const allZero: LeaderboardRow[] = [
      { playerId: "a1", playerName: "Ana", totalPoints: 0 },
      { playerId: "a2", playerName: "Bruno", totalPoints: 0 },
      { playerId: "a3", playerName: "Carla", totalPoints: 0 },
    ];
    render(<LeaderboardTable rows={allZero} />);

    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.getByText("Bruno")).toBeInTheDocument();
    expect(screen.getByText("Carla")).toBeInTheDocument();
  });
});

// ── Manage mode: owner-only remove controls ──────────────────────────────────

describe("LeaderboardTable — manage mode", () => {
  const rows: LeaderboardRow[] = [
    { playerId: "owner", playerName: "Alice", totalPoints: 30 },
    { playerId: "u2", playerName: "Bob", totalPoints: 20 },
    { playerId: "u3", playerName: "Charlie", totalPoints: 10 },
    { playerId: "u4", playerName: "Diana", totalPoints: 5 },
  ];

  it("owner in manage mode sees a remove control for a member, and clicking it fires onRemoveMember", () => {
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

  it("shows remove controls for every non-owner member", () => {
    render(
      <LeaderboardTable
        rows={rows}
        manageMode
        ownerId="owner"
        currentUserId="owner"
        onRemoveMember={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: /echar a bob/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /echar a charlie/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /echar a diana/i }),
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
