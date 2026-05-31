import { describe, expect, it } from "vitest";

import {
  generateInviteCode,
  isValidInviteCode,
} from "@/features/groups/entities/invite-code";

// Crockford base32 alphabet: 0-9 and A-Z minus I, L, O, U
const CROCKFORD_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const VALID_CODE_REGEX = /^[0-9A-HJKMNP-TV-Z]{8}$/;

describe("isValidInviteCode (REQ-01, REQ-02 — format validation)", () => {
  it("accepts a valid 8-char Crockford base32 code", () => {
    expect(isValidInviteCode("A1B2C3D4")).toBe(true);
  });

  it("accepts all uppercase Crockford characters", () => {
    // A valid 8-char string using chars from the alphabet
    expect(isValidInviteCode("ABCDEFGH")).toBe(true);
  });

  it("rejects a code shorter than 8 chars", () => {
    expect(isValidInviteCode("A1B2C3D")).toBe(false);
  });

  it("rejects a code longer than 8 chars", () => {
    expect(isValidInviteCode("A1B2C3D45")).toBe(false);
  });

  it("rejects lowercase letters", () => {
    expect(isValidInviteCode("a1b2c3d4")).toBe(false);
  });

  it("rejects code containing ambiguous char I", () => {
    expect(isValidInviteCode("ABCDEFGI")).toBe(false);
  });

  it("rejects code containing ambiguous char L", () => {
    expect(isValidInviteCode("ABCDEFL1")).toBe(false);
  });

  it("rejects code containing ambiguous char O", () => {
    expect(isValidInviteCode("ABCDEO12")).toBe(false);
  });

  it("rejects code containing ambiguous char U", () => {
    expect(isValidInviteCode("ABCDEU12")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isValidInviteCode("")).toBe(false);
  });

  it("rejects a code with special characters", () => {
    expect(isValidInviteCode("A1B2C3-4")).toBe(false);
  });

  it("rejects a code with spaces", () => {
    expect(isValidInviteCode("A1B2C3 4")).toBe(false);
  });
});

describe("generateInviteCode (REQ-01, REQ-02 — output contract)", () => {
  it("returns a string that passes isValidInviteCode", () => {
    const code = generateInviteCode();
    expect(isValidInviteCode(code)).toBe(true);
  });

  it("returns exactly 8 characters", () => {
    const code = generateInviteCode();
    expect(code).toHaveLength(8);
  });

  it("uses only Crockford base32 characters", () => {
    const code = generateInviteCode();
    expect(code).toMatch(VALID_CODE_REGEX);
  });

  it("generates different codes on successive calls (probabilistic)", () => {
    // P(collision) = 1/32^8 ≈ 1e-12; safe to assert uniqueness
    const codes = new Set(
      Array.from({ length: 20 }, () => generateInviteCode()),
    );
    expect(codes.size).toBeGreaterThan(1);
  });

  it("each generated code uses only chars from the Crockford alphabet", () => {
    const validChars = new Set(CROCKFORD_ALPHABET.split(""));
    const code = generateInviteCode();
    for (const char of code) {
      expect(validChars.has(char)).toBe(true);
    }
  });
});
