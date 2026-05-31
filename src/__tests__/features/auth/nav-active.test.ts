import { describe, expect, it } from "vitest";

import { isNavItemActive } from "@/features/auth/components/app-nav-items";

describe("isNavItemActive", () => {
  it("matches the home route only exactly", () => {
    expect(isNavItemActive("/", "/")).toBe(true);
    expect(isNavItemActive("/predicciones", "/")).toBe(false);
    expect(isNavItemActive("/tabla", "/")).toBe(false);
  });

  it("matches a section route exactly", () => {
    expect(isNavItemActive("/predicciones", "/predicciones")).toBe(true);
    expect(isNavItemActive("/tabla", "/tabla")).toBe(true);
    expect(isNavItemActive("/admin", "/admin")).toBe(true);
  });

  it("matches nested routes by prefix", () => {
    expect(isNavItemActive("/tabla/abc-123", "/tabla")).toBe(true);
    expect(isNavItemActive("/predicciones/fecha-1", "/predicciones")).toBe(
      true,
    );
  });

  it("does not match a sibling sharing a string prefix", () => {
    // "/tablan" must NOT light up "/tabla".
    expect(isNavItemActive("/tablanueva", "/tabla")).toBe(false);
  });

  it("keeps home inactive while on a section route", () => {
    expect(isNavItemActive("/admin", "/")).toBe(false);
  });

  // The Tabla item now links straight at the active group leaderboard and opts
  // into group-route matching (3rd arg), so it stays lit across any group view
  // and on the /onboarding fallback — regardless of its concrete href.
  describe("group-scoped /g/[code] routes (matchGroupRoutes)", () => {
    const TABLA_HREF = "/g/EZ7SE6R3/leaderboard";

    it("lights Tabla on the same group's leaderboard", () => {
      expect(isNavItemActive("/g/EZ7SE6R3/leaderboard", TABLA_HREF, true)).toBe(
        true,
      );
    });

    it("lights Tabla on a different group's leaderboard", () => {
      expect(isNavItemActive("/g/ABCD1234/leaderboard", TABLA_HREF, true)).toBe(
        true,
      );
    });

    it("lights Tabla on /g/[code]/tabla/[userId]", () => {
      expect(
        isNavItemActive("/g/ABCD1234/tabla/some-uuid", TABLA_HREF, true),
      ).toBe(true);
    });

    it("lights Tabla on the /onboarding fallback href", () => {
      expect(isNavItemActive("/onboarding", "/onboarding", true)).toBe(true);
    });

    it("does NOT light Inicio on /g/[code]/leaderboard", () => {
      expect(isNavItemActive("/g/ABCD1234/leaderboard", "/")).toBe(false);
    });

    it("does NOT light Partidos on /g/[code]/leaderboard", () => {
      expect(isNavItemActive("/g/ABCD1234/leaderboard", "/predicciones")).toBe(
        false,
      );
    });
  });
});
