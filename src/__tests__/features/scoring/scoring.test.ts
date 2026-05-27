import { describe, expect, it } from "vitest";

import { calculatePoints } from "@/features/scoring/entities/scoring";

describe("calculatePoints — base tiers, group stage (REQ-SCORE-2)", () => {
  it("awards 3 for an exact score (SCORE-1)", () => {
    expect(
      calculatePoints(
        { homeScore: 2, awayScore: 1 },
        { homeScore: 2, awayScore: 1 },
        "group",
      ),
    ).toBe(3);
  });

  it("awards 1 for the correct winner direction, not exact (SCORE-2)", () => {
    expect(
      calculatePoints(
        { homeScore: 3, awayScore: 1 },
        { homeScore: 2, awayScore: 1 },
        "group",
      ),
    ).toBe(1);
  });

  it("awards 0 for the wrong direction (SCORE-3)", () => {
    expect(
      calculatePoints(
        { homeScore: 0, awayScore: 1 },
        { homeScore: 2, awayScore: 1 },
        "group",
      ),
    ).toBe(0);
  });

  it("awards 3 for an exact draw (SCORE-4)", () => {
    expect(
      calculatePoints(
        { homeScore: 1, awayScore: 1 },
        { homeScore: 1, awayScore: 1 },
        "group",
      ),
    ).toBe(3);
  });

  it("awards 1 for a correct draw direction, not exact (SCORE-5)", () => {
    expect(
      calculatePoints(
        { homeScore: 2, awayScore: 2 },
        { homeScore: 1, awayScore: 1 },
        "group",
      ),
    ).toBe(1);
  });
});

describe("calculatePoints — round multipliers (REQ-SCORE-4, REQ-KO-5)", () => {
  // Exact score (base 3) isolates the multiplier per round.
  it.each([
    ["group", 3],
    ["r32", 3], // R32 is ×1 by design, identical to group (KO-1, REQ-KO-5)
    ["r16", 6], // ×2
    ["qf", 9], // ×3
    ["sf", 12], // ×4 (SCORE-6)
    ["third_place", 12], // ×4, treated as semis (SCORE-10)
    ["final", 15], // ×5
  ] as const)("exact score in %s yields %i", (round, expected) => {
    expect(
      calculatePoints(
        { homeScore: 2, awayScore: 0 },
        { homeScore: 2, awayScore: 0 },
        round,
      ),
    ).toBe(expected);
  });

  it("scales the direction tier by the multiplier (SCORE-7, final ×5)", () => {
    expect(
      calculatePoints(
        { homeScore: 2, awayScore: 0 },
        { homeScore: 3, awayScore: 1 },
        "final",
      ),
    ).toBe(5);
  });
});

describe("calculatePoints — knockouts use the 120' score; advancer never scores (REQ-SCORE-5/6, REQ-KO-3)", () => {
  it("awards 3 × multiplier for an exact ET draw (SCORE-8, qf)", () => {
    // The advancer/penalty winner is not an argument: it cannot affect points.
    expect(
      calculatePoints(
        { homeScore: 1, awayScore: 1 },
        { homeScore: 1, awayScore: 1 },
        "qf",
      ),
    ).toBe(9);
  });

  it("awards 0 for a non-draw prediction against an ET draw (SCORE-9)", () => {
    expect(
      calculatePoints(
        { homeScore: 2, awayScore: 1 },
        { homeScore: 1, awayScore: 1 },
        "qf",
      ),
    ).toBe(0);
  });

  it("awards 3 × multiplier for an exact ET draw regardless of advancer (KO-4)", () => {
    expect(
      calculatePoints(
        { homeScore: 2, awayScore: 2 },
        { homeScore: 2, awayScore: 2 },
        "sf",
      ),
    ).toBe(12);
  });
});

describe("calculatePoints — purity & idempotency (REQ-SCORE-1, SCORE-11)", () => {
  it("returns the same value when run repeatedly for the same inputs (SCORE-11)", () => {
    const prediction = { homeScore: 2, awayScore: 1 };
    const result = { homeScore: 2, awayScore: 1 };
    const first = calculatePoints(prediction, result, "group");
    const second = calculatePoints(prediction, result, "group");
    expect(first).toBe(3);
    expect(second).toBe(first);
  });

  it("does not mutate its inputs", () => {
    const prediction = { homeScore: 2, awayScore: 1 };
    const result = { homeScore: 3, awayScore: 0 };
    calculatePoints(prediction, result, "final");
    expect(prediction).toEqual({ homeScore: 2, awayScore: 1 });
    expect(result).toEqual({ homeScore: 3, awayScore: 0 });
  });
});
