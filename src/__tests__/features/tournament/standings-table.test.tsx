// @vitest-environment jsdom

/**
 * Tests for <StandingsTable> — per-group standings display.
 *
 * Spec scenarios covered:
 * - Renders PJ/PG/PE/PP/GF/GC/DG/Pts column headers
 * - Top-2 rows highlighted differently from third and below
 * - Best-third rows highlighted differently from top-2 and non-qualifiers
 * - Empty-state copy when no rows are present
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type {
  GroupStandings,
  TeamStanding,
} from "@/features/tournament/entities/standings";
import { StandingsTable } from "@/features/tournament/components/standings-table";
import type { Team } from "@/features/fixtures/entities/match";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTeam(id: string, name: string): Team {
  return {
    id,
    externalRef: id.toUpperCase(),
    name,
    groupLabel: "A",
    flagUrl: null,
  };
}

function makeRow(id: string, name: string, pts: number, dg = 0): TeamStanding {
  return {
    team: makeTeam(id, name),
    pj: 3,
    pg: pts === 9 ? 3 : pts === 6 ? 2 : pts === 3 ? 1 : 0,
    pe: 0,
    pp: pts === 9 ? 0 : pts === 6 ? 1 : pts === 3 ? 2 : 3,
    gf: 3,
    gc: 3 - dg,
    dg,
    pts,
  };
}

const GROUP_A: GroupStandings = {
  groupLabel: "A",
  rows: [
    makeRow("t1", "Argentina", 9, 5),
    makeRow("t2", "Brasil", 6, 2),
    makeRow("t3", "Chile", 3, -2),
    makeRow("t4", "Uruguay", 0, -5),
  ],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("StandingsTable", () => {
  it("renders column headers PJ PG PE PP GF GC DG Pts", () => {
    render(
      <StandingsTable
        standings={[GROUP_A]}
        qualifiedTeamIds={[]}
        bestThirdTeamIds={[]}
      />,
    );

    for (const col of ["PJ", "PG", "PE", "PP", "GF", "GC", "DG", "Pts"]) {
      expect(screen.getByText(col)).toBeInTheDocument();
    }
  });

  it("renders the group label header", () => {
    render(
      <StandingsTable
        standings={[GROUP_A]}
        qualifiedTeamIds={[]}
        bestThirdTeamIds={[]}
      />,
    );

    expect(screen.getByText("Grupo A")).toBeInTheDocument();
  });

  it("renders all team names in a group", () => {
    render(
      <StandingsTable
        standings={[GROUP_A]}
        qualifiedTeamIds={[]}
        bestThirdTeamIds={[]}
      />,
    );

    expect(screen.getByText("Argentina")).toBeInTheDocument();
    expect(screen.getByText("Brasil")).toBeInTheDocument();
    expect(screen.getByText("Chile")).toBeInTheDocument();
    expect(screen.getByText("Uruguay")).toBeInTheDocument();
  });

  it("marks top-2 rows with the qualified data attribute", () => {
    render(
      <StandingsTable
        standings={[GROUP_A]}
        qualifiedTeamIds={["t1", "t2"]}
        bestThirdTeamIds={[]}
      />,
    );

    const rows = screen.getAllByRole("row");
    // Header row is first; data rows follow
    const dataRows = rows.filter((r) => r.dataset.qualification);
    const qualifiedRows = dataRows.filter(
      (r) => r.dataset.qualification === "top2",
    );
    expect(qualifiedRows).toHaveLength(2);
  });

  it("marks best-third rows with the best-third data attribute", () => {
    render(
      <StandingsTable
        standings={[GROUP_A]}
        qualifiedTeamIds={[]}
        bestThirdTeamIds={["t3"]}
      />,
    );

    const rows = screen.getAllByRole("row");
    const bestThirdRows = rows.filter(
      (r) => r.dataset.qualification === "best-third",
    );
    expect(bestThirdRows).toHaveLength(1);
  });

  it("shows the empty-state when standings is empty", () => {
    render(
      <StandingsTable
        standings={[]}
        qualifiedTeamIds={[]}
        bestThirdTeamIds={[]}
      />,
    );

    // The EmptyState component renders a <p> with the title
    expect(screen.getByText(/todavía no hay partidos/i)).toBeInTheDocument();
  });

  it("renders stats correctly (PJ, Pts)", () => {
    render(
      <StandingsTable
        standings={[GROUP_A]}
        qualifiedTeamIds={[]}
        bestThirdTeamIds={[]}
      />,
    );

    // Argentina: 3 PJ, 9 Pts
    const cells = screen.getAllByRole("cell");
    const values = cells.map((c) => c.textContent);
    expect(values).toContain("9"); // pts
    expect(values).toContain("3"); // pj
  });
});
