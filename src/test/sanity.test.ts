// Sanity test: confirms Vitest is wired up and running.
// This is intentionally trivial — its only job is to prove the runner works.
import { describe, expect, it } from "vitest";

describe("Vitest sanity check", () => {
  it("adds two numbers correctly", () => {
    expect(1 + 1).toBe(2);
  });
});
