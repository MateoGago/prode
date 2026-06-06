import { describe, expect, it } from "vitest";

import {
  buildNavItems,
  isNavItemActive,
} from "@/features/auth/components/app-nav-items";

describe("buildNavItems", () => {
  const TABLA_HREF = "/g/ABC123/leaderboard";

  it("includes a Fixture item linking to /fixture", () => {
    const items = buildNavItems(TABLA_HREF);
    const fixtureItem = items.find((i) => i.href === "/fixture");
    expect(fixtureItem).toBeDefined();
    expect(fixtureItem?.label).toBe("Fixture");
  });

  it("positions Fixture as the 3rd item (index 2)", () => {
    const items = buildNavItems(TABLA_HREF);
    expect(items[2].href).toBe("/fixture");
  });

  it("non-admin items excludes the Admin item", () => {
    const items = buildNavItems(TABLA_HREF);
    const nonAdminItems = items.filter((i) => !i.adminOnly);
    // Inicio, Partidos, Fixture, Tabla, Ajustes = 5 non-admin items
    expect(nonAdminItems).toHaveLength(5);
  });

  it("admin sees 6 items total (including adminOnly)", () => {
    const items = buildNavItems(TABLA_HREF);
    // Inicio, Partidos, Fixture, Tabla, Admin, Ajustes
    expect(items).toHaveLength(6);
  });

  it("includes an Ajustes item linking to /settings, not admin-gated", () => {
    const items = buildNavItems(TABLA_HREF);
    const settingsItem = items.find((i) => i.href === "/settings");
    expect(settingsItem?.label).toBe("Ajustes");
    expect(settingsItem?.adminOnly).toBeFalsy();
  });

  it("Fixture item has no adminOnly flag", () => {
    const items = buildNavItems(TABLA_HREF);
    const fixtureItem = items.find((i) => i.href === "/fixture");
    expect(fixtureItem?.adminOnly).toBeFalsy();
  });
});

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
