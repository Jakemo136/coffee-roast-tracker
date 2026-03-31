import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StarRating } from "../StarRating";

describe("StarRating", () => {
  it("renders 5 empty stars when rating is 0", () => {
    render(<StarRating value={0} />);
    expect(screen.getByLabelText("Rating: 0 out of 5")).toBeInTheDocument();
    expect(screen.getAllByText("☆")).toHaveLength(5);
  });

  it("renders full and half stars for 3.5", () => {
    render(<StarRating value={3.5} />);
    expect(screen.getByLabelText("Rating: 3.5 out of 5")).toBeInTheDocument();
    expect(screen.getAllByText("★")).toHaveLength(3);
    expect(screen.getAllByText("½")).toHaveLength(1);
    expect(screen.getAllByText("☆")).toHaveLength(1);
  });

  it("renders unrated state with disabled stars", () => {
    render(<StarRating value={null} />);
    expect(screen.getByLabelText("Unrated")).toBeInTheDocument();
  });

  it("calls onChange with new rating on click", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<StarRating value={3} onChange={onChange} />);
    const stars = screen.getAllByRole("button");
    await user.click(stars[3]);
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("does not render buttons when readOnly", () => {
    render(<StarRating value={4} readOnly />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});
