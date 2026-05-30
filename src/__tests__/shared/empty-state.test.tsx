import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EmptyState } from "@/shared/ui/empty-state";

describe("EmptyState", () => {
  it("renders the title", () => {
    render(<EmptyState title="No hay partidos" />);
    expect(screen.getByText("No hay partidos")).toBeInTheDocument();
  });

  it("renders a description when provided", () => {
    render(
      <EmptyState
        title="No hay partidos"
        description="Volvé más tarde cuando se habilite la próxima fecha."
      />,
    );
    expect(screen.getByText(/Volvé más tarde/)).toBeInTheDocument();
  });

  it("does not render description element when omitted", () => {
    render(<EmptyState title="No hay resultados" />);
    // The description text class marks muted-foreground; without description prop it's absent
    const { container } = render(<EmptyState title="Solo título" />);
    expect(container.querySelector(".text-muted-foreground")).toBeNull();
  });

  it("renders children as action slot", () => {
    render(
      <EmptyState title="Sin datos">
        <button type="button">Acción</button>
      </EmptyState>,
    );
    expect(screen.getByRole("button", { name: "Acción" })).toBeInTheDocument();
  });

  it("applies the dashed border container class", () => {
    const { container } = render(<EmptyState title="Vacío" />);
    const root = container.firstElementChild;
    expect(root?.className).toContain("border-dashed");
  });
});
