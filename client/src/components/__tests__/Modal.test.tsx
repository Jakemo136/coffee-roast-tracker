import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Modal } from "../Modal";

describe("Modal", () => {
  it("renders title and children", () => {
    render(
      <Modal title="Test Modal" onClose={() => {}}>
        <p>Modal content</p>
      </Modal>,
    );
    expect(screen.getByText("Test Modal")).toBeInTheDocument();
    expect(screen.getByText("Modal content")).toBeInTheDocument();
  });

  it("calls onClose when close button clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal title="Test" onClose={onClose}>
        Content
      </Modal>,
    );
    await user.click(screen.getByLabelText("Close modal"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when backdrop clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal title="Test" onClose={onClose}>
        Content
      </Modal>,
    );
    await user.click(screen.getByTestId("modal-backdrop"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not close when modal content clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal title="Test" onClose={onClose}>
        <button>Inner button</button>
      </Modal>,
    );
    await user.click(screen.getByText("Inner button"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("renders footer when provided", () => {
    render(
      <Modal title="Test" onClose={() => {}} footer={<button>Save</button>}>
        Content
      </Modal>,
    );
    expect(screen.getByText("Save")).toBeInTheDocument();
  });
});
