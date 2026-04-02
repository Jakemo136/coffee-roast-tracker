import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FlavorPill } from "../FlavorPill";

describe("FlavorPill", () => {
  it("renders descriptor name with colored dot", () => {
    render(<FlavorPill name="Dark Chocolate" color="#8b5e4b" />);
    expect(screen.getByText("Dark Chocolate")).toBeInTheDocument();
  });

  it("applies off-flavor styling when isOffFlavor", () => {
    const { container } = render(
      <FlavorPill name="Roasty" color="#c44a3b" isOffFlavor />,
    );
    const pill = container.firstChild as HTMLElement;
    expect(pill.className).toContain("offFlavor");
  });

  it("renders remove button when onRemove provided", () => {
    render(
      <FlavorPill name="Caramel" color="#a88545" onRemove={() => {}} />,
    );
    expect(screen.getByLabelText("Remove Caramel")).toBeInTheDocument();
  });
});
