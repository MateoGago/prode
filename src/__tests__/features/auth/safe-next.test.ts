/**
 * safeNext — pure security helper that prevents open-redirect attacks.
 *
 * A `next` value is safe only when it starts with a single "/" and is not
 * a protocol-relative URL ("//…") or a backslash-relative path ("/\…").
 */
import { describe, expect, it } from "vitest";

import { safeNext } from "@/features/auth/entities/safe-next";

describe("safeNext", () => {
  it("returns a valid same-origin path as-is", () => {
    expect(safeNext("/join/ABC")).toBe("/join/ABC");
  });

  it("returns the root path '/'", () => {
    expect(safeNext("/")).toBe("/");
  });

  it("returns the fallback for null", () => {
    expect(safeNext(null)).toBe("/");
  });

  it("returns the fallback for undefined", () => {
    expect(safeNext(undefined)).toBe("/");
  });

  it("returns the fallback for an empty string", () => {
    expect(safeNext("")).toBe("/");
  });

  it("returns the fallback for an absolute URL (https://…)", () => {
    expect(safeNext("https://evil.com")).toBe("/");
  });

  it("blocks protocol-relative URL (//evil.com)", () => {
    expect(safeNext("//evil.com")).toBe("/");
  });

  it("blocks backslash-relative path (/\\evil.com)", () => {
    expect(safeNext("/\\evil.com")).toBe("/");
  });

  it("blocks javascript: scheme", () => {
    expect(safeNext("javascript:alert(1)")).toBe("/");
  });

  it("returns the fallback for a relative path without leading slash", () => {
    expect(safeNext("evil.com")).toBe("/");
  });

  it("uses a custom fallback when provided", () => {
    expect(safeNext(null, "/dashboard")).toBe("/dashboard");
  });

  it("returns nested paths correctly", () => {
    expect(safeNext("/g/ABC123/leaderboard")).toBe("/g/ABC123/leaderboard");
  });
});
