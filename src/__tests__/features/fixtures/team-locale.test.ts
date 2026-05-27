import { describe, expect, it } from "vitest";

import { localizeTeam } from "@/features/fixtures/entities/team-locale";

describe("localizeTeam", () => {
  it("returns the Spanish name and flagcdn url for a known slug", () => {
    expect(localizeTeam("germany", "Germany")).toEqual({
      name: "Alemania",
      flagUrl: "https://flagcdn.com/w320/de.png",
    });
  });

  it("falls back to the raw name and a null flag for an unknown slug", () => {
    expect(localizeTeam("atlantis", "Atlantis")).toEqual({
      name: "Atlantis",
      flagUrl: null,
    });
  });
});
