import { describe, expect, it } from "vitest";

import {
  deriveHit,
  shouldShowAdvancer,
} from "@/features/predictions/entities/match-card-state";

describe("shouldShowAdvancer (KO + predicted draw)", () => {
  it("hides on a group match even when drawn", () => {
    expect(shouldShowAdvancer("group", 1, 1)).toBe(false);
  });

  it("hides on a knockout match that is not a draw", () => {
    expect(shouldShowAdvancer("r16", 2, 1)).toBe(false);
    expect(shouldShowAdvancer("final", 0, 1)).toBe(false);
  });

  it("shows on a knockout match predicted as a draw", () => {
    expect(shouldShowAdvancer("r16", 1, 1)).toBe(true);
    expect(shouldShowAdvancer("qf", 0, 0)).toBe(true);
    expect(shouldShowAdvancer("final", 2, 2)).toBe(true);
  });
});

describe("deriveHit (confirmed badge)", () => {
  it("is exact when both scores match", () => {
    expect(
      deriveHit({ homeScore: 2, awayScore: 1 }, { homeScore: 2, awayScore: 1 }),
    ).toBe("exact");
    expect(
      deriveHit({ homeScore: 0, awayScore: 0 }, { homeScore: 0, awayScore: 0 }),
    ).toBe("exact");
  });

  it("is winner when the outcome matches but the score does not", () => {
    expect(
      deriveHit({ homeScore: 3, awayScore: 1 }, { homeScore: 2, awayScore: 1 }),
    ).toBe("winner");
    expect(
      deriveHit({ homeScore: 1, awayScore: 2 }, { homeScore: 0, awayScore: 3 }),
    ).toBe("winner");
  });

  it("is winner when both predicted and actual are draws of different scores", () => {
    expect(
      deriveHit({ homeScore: 1, awayScore: 1 }, { homeScore: 2, awayScore: 2 }),
    ).toBe("winner");
  });

  it("is miss when the outcome is wrong", () => {
    expect(
      deriveHit({ homeScore: 2, awayScore: 1 }, { homeScore: 1, awayScore: 2 }),
    ).toBe("miss");
    expect(
      deriveHit({ homeScore: 1, awayScore: 1 }, { homeScore: 2, awayScore: 1 }),
    ).toBe("miss");
    expect(
      deriveHit({ homeScore: 2, awayScore: 1 }, { homeScore: 1, awayScore: 1 }),
    ).toBe("miss");
  });
});
