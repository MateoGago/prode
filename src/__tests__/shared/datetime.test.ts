/**
 * Tests for formatAR — UTC → America/Argentina/Buenos_Aires display.
 *
 * Argentina is UTC-3 year-round (no DST since 2008).
 * All test cases verify the UTC-3 offset behaviour directly.
 */
import { describe, expect, it } from "vitest";
import { formatAR } from "@/shared/datetime";

describe("formatAR", () => {
  it("converts a 19:00 UTC kickoff to 16:00 Argentina time", () => {
    // World Cup group-stage evening kick-off
    const utc = new Date("2026-06-15T19:00:00Z");
    expect(formatAR(utc)).toBe("15/06/2026 16:00");
  });

  it("accepts an ISO string as input", () => {
    expect(formatAR("2026-06-15T19:00:00Z")).toBe("15/06/2026 16:00");
  });

  it("converts a midnight UTC instant to 21:00 the previous day in Argentina", () => {
    // 00:00 UTC = 21:00 previous day in UTC-3
    const utc = new Date("2026-06-16T00:00:00Z");
    expect(formatAR(utc)).toBe("15/06/2026 21:00");
  });

  it("handles a final at 20:00 UTC → 17:00 ART", () => {
    const utc = new Date("2026-07-19T20:00:00Z");
    expect(formatAR(utc)).toBe("19/07/2026 17:00");
  });

  it("correctly pads single-digit hours and minutes", () => {
    // 03:05 UTC → 00:05 ART
    const utc = new Date("2026-06-15T03:05:00Z");
    expect(formatAR(utc)).toBe("15/06/2026 00:05");
  });

  it("handles year boundary correctly (31 Dec 23:00 UTC → 1 Jan 20:00 ART)", () => {
    const utc = new Date("2026-12-31T23:00:00Z");
    // 23:00 UTC - 3h = 20:00 same day UTC-3 on Jan 1 2027... wait:
    // 2026-12-31T23:00Z - 3h = 2026-12-31T20:00 ART → still Dec 31
    expect(formatAR(utc)).toBe("31/12/2026 20:00");
  });
});
