/**
 * T-25 [TEST] — OnboardingContent shell component
 *
 * Verifies:
 *  - renders both CreateGroupForm and JoinGroupForm via tabs
 *  - shows Spanish "Crear" and "Unirse" tab labels
 *  - displays the onboarding headline
 */
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
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

// next/link mock — render a plain anchor so the href is assertable in jsdom
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
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

  it("renders JoinGroupForm in the default (Unirse) tab", () => {
    render(<OnboardingContent />);

    expect(screen.getByTestId("join-group-form")).toBeInTheDocument();
  });

  it("hides the back-to-home link by default", () => {
    render(<OnboardingContent />);

    expect(
      screen.queryByRole("link", { name: /volver al inicio/i }),
    ).not.toBeInTheDocument();
  });

  it("shows a back-to-home link when canGoBack is true", () => {
    render(<OnboardingContent canGoBack />);

    expect(
      screen.getByRole("link", { name: /volver al inicio/i }),
    ).toHaveAttribute("href", "/");
  });
});
