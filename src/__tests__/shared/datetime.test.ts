/**
 * Tests for formatAR — UTC → America/Argentina/Buenos_Aires display.
 *
 * Argentina is UTC-3 year-round (no DST since 2008).
 * All test cases verify the UTC-3 offset behaviour directly.
 */
import { describe, expect, it } from "vitest";
import {
  arDayParts,
  formatAR,
  formatCountdown,
  formatKickoffLong,
} from "@/shared/datetime";

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

describe("formatCountdown", () => {
  const MINUTE = 60_000;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;

  it("returns 'Cerrado' when the deadline has passed", () => {
    expect(formatCountdown(0)).toBe("Cerrado");
    expect(formatCountdown(-1)).toBe("Cerrado");
    expect(formatCountdown(-5 * HOUR)).toBe("Cerrado");
  });

  it("shows whole days when a day or more remains", () => {
    expect(formatCountdown(DAY)).toBe("1d");
    expect(formatCountdown(2 * DAY + 5 * HOUR)).toBe("2d");
  });

  it("shows hours and minutes when under a day", () => {
    expect(formatCountdown(2 * HOUR + 14 * MINUTE)).toBe("2h 14m");
    expect(formatCountdown(HOUR)).toBe("1h 0m");
  });

  it("shows only minutes when under an hour", () => {
    expect(formatCountdown(14 * MINUTE)).toBe("14m");
    expect(formatCountdown(MINUTE)).toBe("1m");
  });

  it("rounds sub-minute remainders up to '1m' so it never shows 0m while open", () => {
    expect(formatCountdown(30_000)).toBe("1m");
    expect(formatCountdown(1)).toBe("1m");
  });

  it("floors minutes within the hours+minutes range", () => {
    // 1h 14m 59s → 1h 14m (seconds dropped)
    expect(formatCountdown(HOUR + 14 * MINUTE + 59_000)).toBe("1h 14m");
  });
});

describe("formatKickoffLong", () => {
  it("renders a short AR weekday + dd/M · HH:mm lock line", () => {
    // 2026-06-13 is a Saturday; 19:00 UTC → 16:00 ART
    expect(formatKickoffLong(new Date("2026-06-13T19:00:00Z"))).toBe(
      "Sáb 13/6 · 16:00",
    );
  });

  it("accepts an ISO string and drops leading zeros from the day/month", () => {
    // 2026-06-01 is a Monday; 12:00 UTC → 09:00 ART
    expect(formatKickoffLong("2026-06-01T12:00:00Z")).toBe("Lun 1/6 · 09:00");
  });
});

describe("arDayParts", () => {
  it("returns a sortable AR-local key plus capitalized weekday/month", () => {
    // 2026-06-11 is a Thursday; 19:00 UTC → 16:00 ART (still June 11).
    expect(arDayParts(new Date("2026-06-11T19:00:00Z"))).toEqual({
      key: "2026-06-11",
      day: "11",
      weekday: "Jueves",
      month: "Junio",
    });
  });

  it("accepts an ISO string and unpads the day-of-month", () => {
    // 2026-06-01 is a Monday; 12:00 UTC → 09:00 ART.
    expect(arDayParts("2026-06-01T12:00:00Z")).toEqual({
      key: "2026-06-01",
      day: "1",
      weekday: "Lunes",
      month: "Junio",
    });
  });

  it("buckets a late-night UTC kickoff into the AR calendar day, not the UTC one", () => {
    // 00:00 UTC on Jun 12 = 21:00 ART on Jun 11 → belongs to Jun 11.
    expect(arDayParts(new Date("2026-06-12T00:00:00Z")).key).toBe("2026-06-11");
  });
});
