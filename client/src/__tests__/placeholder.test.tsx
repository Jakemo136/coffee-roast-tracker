import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

describe("test infrastructure", () => {
  it("renders with React Testing Library", () => {
    render(<div>Coffee Roast Tracker</div>);
    expect(screen.getByText("Coffee Roast Tracker")).toBeInTheDocument();
  });
});
