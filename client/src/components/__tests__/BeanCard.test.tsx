import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { BeanCard } from "../BeanCard";

function renderWithRouter(ui: React.ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("BeanCard", () => {
  const fullProps = {
    id: "bean-123",
    name: "Ethiopia Yirgacheffe",
    origin: "Ethiopia",
    process: "Washed",
    flavors: [
      { name: "Blueberry", color: "#4a3d9e" },
      { name: "Chocolate", color: "#8B4513" },
      { name: "Citrus", color: "#e6a817" },
      { name: "Floral", color: "#c27a8a" },
      { name: "Honey", color: "#d4a017" },
    ],
    roastCount: 12,
    avgRating: 4.5,
  };

  it("renders with data-testid", () => {
    renderWithRouter(<BeanCard {...fullProps} />);
    expect(screen.getByTestId("bean-card")).toBeInTheDocument();
  });

  it("renders bean name, origin, and process", () => {
    renderWithRouter(<BeanCard {...fullProps} />);
    expect(screen.getByText("Ethiopia Yirgacheffe")).toBeInTheDocument();
    expect(screen.getByText(/Ethiopia \u00B7 Washed/)).toBeInTheDocument();
  });

  it("renders roast count", () => {
    renderWithRouter(<BeanCard {...fullProps} />);
    expect(screen.getByText("12 roasts")).toBeInTheDocument();
  });

  it("renders star rating", () => {
    renderWithRouter(<BeanCard {...fullProps} />);
    expect(screen.getByTestId("star-rating")).toBeInTheDocument();
  });

  it("renders with minimal props", () => {
    renderWithRouter(<BeanCard id="bean-min" name="Simple Bean" />);
    expect(screen.getByText("Simple Bean")).toBeInTheDocument();
    expect(screen.queryByTestId("flavor-pill")).not.toBeInTheDocument();
    expect(screen.queryByTestId("star-rating")).not.toBeInTheDocument();
  });

  it("limits visible flavor pills to 3 and shows overflow count", () => {
    renderWithRouter(<BeanCard {...fullProps} />);
    const pills = screen.getAllByTestId("flavor-pill");
    expect(pills).toHaveLength(3);
    expect(screen.getByText("+2 more")).toBeInTheDocument();
  });

  it("does not show overflow when flavors are within limit", () => {
    renderWithRouter(
      <BeanCard
        id="bean-few"
        name="Few Flavors"
        flavors={[
          { name: "Chocolate", color: "#8B4513" },
          { name: "Citrus", color: "#e6a817" },
        ]}
      />
    );
    const pills = screen.getAllByTestId("flavor-pill");
    expect(pills).toHaveLength(2);
    expect(screen.queryByText(/more/)).not.toBeInTheDocument();
  });

  it("links to the correct bean detail page", () => {
    renderWithRouter(<BeanCard {...fullProps} />);
    const link = screen.getByTestId("bean-card");
    expect(link).toHaveAttribute("href", "/beans/bean-123");
  });

  it("displays singular roast count correctly", () => {
    renderWithRouter(
      <BeanCard id="bean-one" name="One Roast" roastCount={1} />
    );
    expect(screen.getByText("1 roast")).toBeInTheDocument();
  });

  it("does not render details line when origin and process are absent", () => {
    const { container } = renderWithRouter(
      <BeanCard id="bean-no-details" name="No Details" />
    );
    expect(
      container.querySelector("[class*=details]")
    ).not.toBeInTheDocument();
  });
});
