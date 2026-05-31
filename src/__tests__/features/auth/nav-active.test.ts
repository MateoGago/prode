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

  // T-21: group-scoped /g/* routes must keep the Tabla nav item lit.
  // The Tabla nav href changed to /onboarding (entry-point redirect); the
  // isNavItemActive function has a special case for /g/*/leaderboard and
  // /g/*/tabla/* so the tab stays highlighted inside a group view.
  describe("group-scoped /g/[code] routes", () => {
    it("lights Tabla (/onboarding href) on /g/[code]/leaderboard", () => {
      expect(isNavItemActive("/g/ABCD1234/leaderboard", "/onboarding")).toBe(
        true,
      );
    });

    it("lights Tabla (/onboarding href) on /g/[code]/tabla/[userId]", () => {
      expect(
        isNavItemActive("/g/ABCD1234/tabla/some-uuid", "/onboarding"),
      ).toBe(true);
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
