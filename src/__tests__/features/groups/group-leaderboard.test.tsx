import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GroupLeaderboard } from "@/features/groups/components/group-leaderboard";
import type { LeaderboardRow } from "@/features/leaderboard/components/leaderboard-table";

// ── Mocks ─────────────────────────────────────────────────────────────────────
const { mockRemoveMember, mockLeaveGroup, mockPush, mockToastError } =
  vi.hoisted(() => ({
    mockRemoveMember: vi.fn(),
    mockLeaveGroup: vi.fn(),
    mockPush: vi.fn(),
    mockToastError: vi.fn(),
  }));

vi.mock("@/features/groups/actions/remove-member", () => ({
  removeMember: mockRemoveMember,
}));
vi.mock("@/features/groups/actions/leave-group", () => ({
  leaveGroup: mockLeaveGroup,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
}));
vi.mock("sonner", () => ({
  toast: { error: mockToastError, success: vi.fn() },
}));
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));
vi.mock("motion/react", () => {
  const passthrough =
    (Tag: string) =>
    ({ children, ...rest }: { children?: React.ReactNode }) =>
      React.createElement(Tag, rest, children);
  return {
    motion: {
      div: passthrough("div"),
      tr: passthrough("tr"),
      tbody: passthrough("tbody"),
    },
    useReducedMotion: () => true,
  };
});

// ─────────────────────────────────────────────────────────────────────────────

const GROUP_ID = "group-1";
const CODE = "ABCD1234";
const OWNER_ID = "owner";

const rows: LeaderboardRow[] = [
  { playerId: OWNER_ID, playerName: "Alice", totalPoints: 30 },
  { playerId: "u2", playerName: "Bob", totalPoints: 20 },
  { playerId: "u3", playerName: "Charlie", totalPoints: 10 },
  { playerId: "u4", playerName: "Diana", totalPoints: 5 },
];

function renderAs(currentUserId: string) {
  return render(
    <GroupLeaderboard
      rows={rows}
      code={CODE}
      groupId={GROUP_ID}
      ownerId={OWNER_ID}
      currentUserId={currentUserId}
    />,
  );
}

describe("GroupLeaderboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRemoveMember.mockResolvedValue({ ok: true });
    mockLeaveGroup.mockResolvedValue({ ok: true });
  });

  it("shows a 'Gestionar' toggle to the owner", () => {
    renderAs(OWNER_ID);

    expect(
      screen.getByRole("button", { name: /gestionar/i }),
    ).toBeInTheDocument();
  });

  it("shows 'Salir del grupo' to a non-owner, and no 'Gestionar' toggle", () => {
    renderAs("u2");

    expect(
      screen.getByRole("button", { name: /salir del grupo/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /gestionar/i })).toBeNull();
  });

  it("toggling 'Gestionar' reveals per-member remove controls", () => {
    renderAs(OWNER_ID);

    expect(screen.queryByRole("button", { name: /echar a bob/i })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /gestionar/i }));

    expect(
      screen.getByRole("button", { name: /echar a bob/i }),
    ).toBeInTheDocument();
  });

  it("confirming a removal calls removeMember with the group and target ids", async () => {
    renderAs(OWNER_ID);

    fireEvent.click(screen.getByRole("button", { name: /gestionar/i }));
    fireEvent.click(screen.getByRole("button", { name: /echar a bob/i }));
    // Inline confirmation appears; confirm it.
    fireEvent.click(screen.getByRole("button", { name: /sí, echar/i }));

    await waitFor(() =>
      expect(mockRemoveMember).toHaveBeenCalledWith(GROUP_ID, "u2"),
    );
  });

  it("a non-owner confirming 'Salir' calls leaveGroup and navigates away", async () => {
    renderAs("u2");

    fireEvent.click(screen.getByRole("button", { name: /salir del grupo/i }));
    fireEvent.click(screen.getByRole("button", { name: /sí, salir/i }));

    await waitFor(() => expect(mockLeaveGroup).toHaveBeenCalledWith(CODE));
    expect(mockPush).toHaveBeenCalledWith("/");
  });
});
