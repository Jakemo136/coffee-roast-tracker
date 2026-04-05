import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddBeanModal } from "../AddBeanModal";

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onSave: vi.fn(),
};

const flavors = [
  { name: "Blueberry", color: "#6a5acd" },
  { name: "Chocolate", color: "#8b4513" },
  { name: "Caramel", color: "#c4862a" },
  { name: "Citrus", color: "#ffd700" },
  { name: "Dark Chocolate", color: "#3d1c02" },
];

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  fireEvent.change(screen.getByPlaceholderText("Bean name, e.g. Kenya AA"), {
    target: { value: "Test Bean" },
  });
  fireEvent.change(screen.getByPlaceholderText("Origin, e.g. Yirgacheffe, Ethiopia"), {
    target: { value: "Colombia" },
  });

  // Select process via combobox
  const combobox = screen.getByRole("combobox");
  await user.click(combobox);
  await user.click(screen.getByText("Washed"));
}

describe("AddBeanModal", () => {
  it("renders the modal when open", () => {
    render(<AddBeanModal {...defaultProps} />);

    expect(screen.getByTestId("add-bean-modal")).toBeInTheDocument();
    expect(screen.getByText("Add Bean")).toBeInTheDocument();
  });

  it("does not render when isOpen is false", () => {
    render(<AddBeanModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId("add-bean-modal")).not.toBeInTheDocument();
  });

  it("has Save Bean button disabled when required fields are empty", () => {
    render(<AddBeanModal {...defaultProps} />);
    const saveBtn = screen.getByText("Save");
    expect(saveBtn).toBeDisabled();
  });

  it("enables Save when required fields are filled", async () => {
    const user = userEvent.setup();
    render(<AddBeanModal {...defaultProps} />);

    await fillRequiredFields(user);

    const saveBtn = screen.getByText("Save");
    expect(saveBtn).not.toBeDisabled();
  });

  it("calls onSave with correct data when Save is clicked", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<AddBeanModal {...defaultProps} onSave={onSave} />);

    // Use fireEvent.change to avoid Modal focus trap interference
    fireEvent.change(screen.getByPlaceholderText("Bean name, e.g. Kenya AA"), {
      target: { value: "Ethiopia Yirgacheffe" },
    });
    fireEvent.change(screen.getByPlaceholderText("Origin, e.g. Yirgacheffe, Ethiopia"), {
      target: { value: "Yirgacheffe, Ethiopia" },
    });

    // Select process via combobox
    const combobox = screen.getByRole("combobox");
    await user.click(combobox);
    await user.click(screen.getByText("Natural"));

    fireEvent.change(screen.getByPlaceholderText("e.g. Bourbon, SL28"), {
      target: { value: "Heirloom" },
    });
    fireEvent.change(screen.getByPlaceholderText("e.g. Sweet Maria's"), {
      target: { value: "Sweet Marias" },
    });

    await user.click(screen.getByText("Save"));

    expect(onSave).toHaveBeenCalledOnce();
    const savedBean = onSave.mock.calls[0]![0];
    expect(savedBean.name).toBe("Ethiopia Yirgacheffe");
    expect(savedBean.origin).toBe("Yirgacheffe, Ethiopia");
    expect(savedBean.process).toBe("Natural");
    expect(savedBean.variety).toBe("Heirloom");
    expect(savedBean.supplier).toBe("Sweet Marias");
  });

  it("calls onClose when Cancel is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<AddBeanModal {...defaultProps} onClose={onClose} />);

    await user.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("parses cupping notes and matches flavor names", async () => {
    const user = userEvent.setup();
    render(<AddBeanModal {...defaultProps} flavors={flavors} />);

    const cuppingTextarea = screen.getByPlaceholderText(
      "Paste tasting notes to auto-match flavors",
    );
    fireEvent.change(cuppingTextarea, {
      target: { value: "chocolate and blueberry with citrus" },
    });

    await user.click(screen.getByText("Parse Flavors"));

    // Should show matched flavor pills
    const pills = screen.getAllByTestId("flavor-pill");
    const pillNames = pills.map((p) => {
      const nameSpan = p.querySelector("[class*=name]");
      return nameSpan?.textContent?.trim();
    });
    expect(pillNames).toContain("Chocolate");
    expect(pillNames).toContain("Blueberry");
    expect(pillNames).toContain("Citrus");
  });

  it("includes matched flavors in saved data", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<AddBeanModal {...defaultProps} onSave={onSave} flavors={flavors} />);

    await fillRequiredFields(user);

    // Parse cupping notes
    const cuppingTextarea = screen.getByPlaceholderText(
      "Paste tasting notes to auto-match flavors",
    );
    fireEvent.change(cuppingTextarea, {
      target: { value: "chocolate and caramel" },
    });
    await user.click(screen.getByText("Parse Flavors"));

    await user.click(screen.getByText("Save"));

    expect(onSave).toHaveBeenCalledOnce();
    const savedBean = onSave.mock.calls[0]![0];
    expect(savedBean.suggestedFlavors).toContain("Chocolate");
    expect(savedBean.suggestedFlavors).toContain("Caramel");
  });

  it("allows removing matched flavors", async () => {
    const user = userEvent.setup();
    render(<AddBeanModal {...defaultProps} flavors={flavors} />);

    const cuppingTextarea = screen.getByPlaceholderText(
      "Paste tasting notes to auto-match flavors",
    );
    fireEvent.change(cuppingTextarea, {
      target: { value: "chocolate and blueberry" },
    });
    await user.click(screen.getByText("Parse Flavors"));

    // Should have 2 matched pills
    const pills = screen.getAllByTestId("flavor-pill");
    expect(pills).toHaveLength(2);

    // Remove one
    const removeBtn = screen.getByLabelText("Remove Chocolate");
    await user.click(removeBtn);

    // Should have 1 remaining
    const remainingPills = screen.getAllByTestId("flavor-pill");
    expect(remainingPills).toHaveLength(1);
  });

  it("shows required field indicators", () => {
    render(<AddBeanModal {...defaultProps} />);

    const requiredMarkers = screen.getAllByText("*");
    expect(requiredMarkers).toHaveLength(3); // Name, Origin, Process
  });

  it("does not include optional fields when empty", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<AddBeanModal {...defaultProps} onSave={onSave} />);

    await fillRequiredFields(user);

    await user.click(screen.getByText("Save"));

    const savedBean = onSave.mock.calls[0]![0];
    expect(savedBean.variety).toBeUndefined();
    expect(savedBean.supplier).toBeUndefined();
    expect(savedBean.score).toBeUndefined();
    expect(savedBean.notes).toBeUndefined();
    expect(savedBean.suggestedFlavors).toBeUndefined();
  });
});
