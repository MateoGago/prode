import { describe, expect, it } from "vitest";

import { validateGroupName } from "@/features/groups/entities/membership";

describe("validateGroupName (REQ-01, REQ-03 — name invariants)", () => {
  it("accepts a non-empty group name", () => {
    expect(validateGroupName("Los Cracks")).toEqual({ ok: true });
  });

  it("accepts a single character name", () => {
    expect(validateGroupName("A")).toEqual({ ok: true });
  });

  it("accepts a name with numbers and special characters", () => {
    expect(validateGroupName("Equipo #1 - 2026")).toEqual({ ok: true });
  });

  it("rejects an empty string", () => {
    const result = validateGroupName("");
    expect(result).toEqual({ ok: false, reason: "empty_name" });
  });

  it("rejects a whitespace-only string", () => {
    const result = validateGroupName("   ");
    expect(result).toEqual({ ok: false, reason: "empty_name" });
  });

  it("rejects a tab-only string", () => {
    const result = validateGroupName("\t");
    expect(result).toEqual({ ok: false, reason: "empty_name" });
  });

  it("rejects a newline-only string", () => {
    const result = validateGroupName("\n");
    expect(result).toEqual({ ok: false, reason: "empty_name" });
  });

  it("accepts a name that has leading/trailing whitespace but non-whitespace content", () => {
    // The name itself is valid; trimming is the action layer's job
    expect(validateGroupName("  Real Squad  ")).toEqual({ ok: true });
  });
});
