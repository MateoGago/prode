import { describe, expect, it } from "vitest";
import {
  loginSchema,
  signupSchema,
} from "@/features/auth/entities/credentials";

describe("loginSchema", () => {
  it("accepts a valid email + non-empty password", () => {
    const result = loginSchema.safeParse({
      email: "santi@prode.ar",
      password: "secret",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "secret",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty password", () => {
    const result = loginSchema.safeParse({
      email: "santi@prode.ar",
      password: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("signupSchema", () => {
  it("accepts a valid display name, email and 8+ char password", () => {
    const result = signupSchema.safeParse({
      displayName: "Santi",
      email: "santi@prode.ar",
      password: "12345678",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a password shorter than 8 chars", () => {
    const result = signupSchema.safeParse({
      displayName: "Santi",
      email: "santi@prode.ar",
      password: "1234567",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a display name shorter than 2 chars", () => {
    const result = signupSchema.safeParse({
      displayName: "S",
      email: "santi@prode.ar",
      password: "12345678",
    });
    expect(result.success).toBe(false);
  });

  it("trims the display name before validating", () => {
    const result = signupSchema.safeParse({
      displayName: "  Santi  ",
      email: "santi@prode.ar",
      password: "12345678",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.displayName).toBe("Santi");
    }
  });
});
