/**
 * GroupSwitcher — pill list of the user's groups + an entry to add another.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { GroupSummary } from "@/features/groups/actions/list-my-groups";
import { GroupSwitcher } from "@/features/groups/components/group-switcher";

const groups: GroupSummary[] = [
  {
    groupId: "1",
    name: "Los del asado",
    inviteCode: "AAAA1111",
    position: 1,
    points: 0,
  },
  {
    groupId: "2",
    name: "Los pibes",
    inviteCode: "BBBB2222",
    position: 2,
    points: 5,
  },
];

describe("GroupSwitcher", () => {
  it("renders a pill per group linking to its leaderboard", () => {
    render(<GroupSwitcher groups={groups} activeCode="AAAA1111" />);

    expect(screen.getByRole("link", { name: "Los del asado" })).toHaveAttribute(
      "href",
      "/g/AAAA1111/leaderboard",
    );
    expect(screen.getByRole("link", { name: "Los pibes" })).toHaveAttribute(
      "href",
      "/g/BBBB2222/leaderboard",
    );
  });

  it("offers a '+ Nuevo' entry to create or join another group", () => {
    render(<GroupSwitcher groups={groups} activeCode="AAAA1111" />);

    expect(screen.getByRole("link", { name: /nuevo/i })).toHaveAttribute(
      "href",
      "/onboarding",
    );
  });
});
