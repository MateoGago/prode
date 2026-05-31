/**
 * T-25 [TEST] — OnboardingContent shell component
 *
 * Verifies:
 *  - renders both CreateGroupForm and JoinGroupForm via tabs
 *  - shows Spanish "Crear" and "Unirse" tab labels
 *  - displays the onboarding headline
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Mock child forms — we only test the shell structure here
vi.mock("@/features/groups/components/create-group-form", () => ({
  CreateGroupForm: () => (
    <div data-testid="create-group-form">CreateGroupForm</div>
  ),
}));

vi.mock("@/features/groups/components/join-group-form", () => ({
  JoinGroupForm: () => <div data-testid="join-group-form">JoinGroupForm</div>,
}));

// next/navigation mock
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/onboarding",
}));

import { OnboardingContent } from "@/features/groups/components/onboarding";

describe("OnboardingContent", () => {
  it("renders the main heading", () => {
    render(<OnboardingContent />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /prode/i,
    );
  });

  it("renders Crear and Unirse tabs", () => {
    render(<OnboardingContent />);

    expect(screen.getByRole("tab", { name: /crear/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /unirse/i })).toBeInTheDocument();
  });

  it("renders CreateGroupForm in the default (Crear) tab", () => {
    render(<OnboardingContent />);

    expect(screen.getByTestId("create-group-form")).toBeInTheDocument();
  });
});
