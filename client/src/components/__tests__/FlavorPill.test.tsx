import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { FlavorPill } from "../FlavorPill";

describe("FlavorPill", () => {
  const defaultProps = {
    name: "Chocolate",
    color: "#8B4513",
  };

  it("renders with data-testid", () => {
    render(<FlavorPill {...defaultProps} />);
    expect(screen.getByTestId("flavor-pill")).toBeInTheDocument();
  });

  it("displays the flavor name", () => {
    render(<FlavorPill {...defaultProps} />);
    expect(screen.getByText("Chocolate")).toBeInTheDocument();
  });

  it("sets title attribute for tooltip", () => {
    render(<FlavorPill {...defaultProps} />);
    expect(screen.getByTestId("flavor-pill")).toHaveAttribute("title", "Chocolate");
  });

  it("applies color-based background style", () => {
    render(<FlavorPill {...defaultProps} />);
    const pill = screen.getByTestId("flavor-pill");
    expect(pill.style.backgroundColor).toBeTruthy();
  });

  it("does not show remove button by default", () => {
    render(<FlavorPill {...defaultProps} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows remove button when onRemove is provided", () => {
    render(<FlavorPill {...defaultProps} onRemove={() => {}} />);
    expect(screen.getByRole("button", { name: /remove chocolate/i })).toBeInTheDocument();
  });

  it("calls onRemove when remove button is clicked", async () => {
    const user = userEvent.setup();
    const handleRemove = vi.fn();
    render(<FlavorPill {...defaultProps} onRemove={handleRemove} />);

    await user.click(screen.getByRole("button", { name: /remove chocolate/i }));
    expect(handleRemove).toHaveBeenCalledOnce();
  });

  it("renders off-flavor variant", () => {
    render(<FlavorPill {...defaultProps} variant="off-flavor" />);
    const pill = screen.getByTestId("flavor-pill");
    expect(pill).toBeInTheDocument();
    // off-flavor has dashed border style set via CSS module
    expect(pill.style.borderColor).toBeTruthy();
  });

  it("renders default variant without off-flavor styling", () => {
    render(<FlavorPill {...defaultProps} variant="default" />);
    const pill = screen.getByTestId("flavor-pill");
    expect(pill.style.borderColor).toBe("transparent");
  });
});
