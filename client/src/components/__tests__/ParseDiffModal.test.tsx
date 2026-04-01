import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ParseDiffModal } from "../ParseDiffModal";
import type { ParseResult } from "../ParseSupplierModal";

const baseCurrent = {
  name: "Ethiopia Yirgacheffe",
  origin: "Ethiopia",
  process: "Washed",
  elevation: "1800m",
  variety: null,
  bagNotes: null,
  score: null,
  cropYear: null,
  suggestedFlavors: [] as readonly string[],
};

const baseParsed: ParseResult = {
  name: "Ethiopia Yirgacheffe",
  origin: "Ethiopia",
  process: "Washed",
  elevation: "1800m",
  variety: null,
  bagNotes: null,
  score: null,
  cropYear: null,
  suggestedFlavors: [],
};

describe("ParseDiffModal", () => {
  it("shows diff rows for changed fields", () => {
    const parsed: ParseResult = {
      ...baseParsed,
      origin: "Kenya",
      process: "Natural",
    };

    render(
      <ParseDiffModal
        current={baseCurrent}
        parsed={parsed}
        onApply={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("Origin")).toBeInTheDocument();
    expect(screen.getByText("Process")).toBeInTheDocument();
    expect(screen.getByText("Kenya")).toBeInTheDocument();
    expect(screen.getByText("Natural")).toBeInTheDocument();
  });

  it("all checkboxes are checked by default", () => {
    const parsed: ParseResult = {
      ...baseParsed,
      origin: "Kenya",
      process: "Natural",
    };

    render(
      <ParseDiffModal
        current={baseCurrent}
        parsed={parsed}
        onApply={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(2);
    checkboxes.forEach((cb) => expect(cb).toBeChecked());
  });

  it("shows No Changes Found when nothing differs", () => {
    render(
      <ParseDiffModal
        current={baseCurrent}
        parsed={baseParsed}
        onApply={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("No changes found")).toBeInTheDocument();
  });

  it("Apply button shows count of selected fields", () => {
    const parsed: ParseResult = {
      ...baseParsed,
      origin: "Kenya",
      process: "Natural",
    };

    render(
      <ParseDiffModal
        current={baseCurrent}
        parsed={parsed}
        onApply={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Apply 2 fields" })).toBeInTheDocument();
  });

  it("unchecking a field excludes it from apply", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();

    const parsed: ParseResult = {
      ...baseParsed,
      origin: "Kenya",
      process: "Natural",
    };

    render(
      <ParseDiffModal
        current={baseCurrent}
        parsed={parsed}
        onApply={onApply}
        onClose={vi.fn()}
      />,
    );

    // Uncheck the Origin checkbox (first checkbox in the list)
    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[0]);

    await user.click(screen.getByRole("button", { name: "Apply 1 field" }));

    expect(onApply).toHaveBeenCalledOnce();
    const applied = onApply.mock.calls[0][0] as Partial<ParseResult>;
    expect(applied).not.toHaveProperty("origin");
    expect(applied).toHaveProperty("process", "Natural");
  });
});
