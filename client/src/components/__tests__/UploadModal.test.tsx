import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UploadModal } from "../UploadModal";

const mockPreview = {
  roastDate: "2024-03-20T10:00:00Z",
  totalDuration: 630,
  profileShortName: "EGB",
  developmentPercent: 13.5,
  suggestedBeans: [
    {
      id: "bean1",
      shortName: "EGB",
      bean: { id: "bean1", name: "Ethiopia Yirgacheffe" },
    },
  ],
  parseWarnings: [],
};

const mockBeans = [
  { id: "bean1", name: "Ethiopia Yirgacheffe" },
  { id: "bean2", name: "Colombia Huila" },
];

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onPreview: vi.fn().mockResolvedValue(mockPreview),
  onSave: vi.fn().mockResolvedValue({ roastId: "roast-1" }),
  beans: mockBeans,
  onCreateBean: vi
    .fn()
    .mockResolvedValue({ id: "new-bean", name: "New Bean" }),
};

function createFileChangeEvent(
  fileName = "test.klog",
  content = '{"roast":"data"}',
) {
  const file = new File([content], fileName, { type: "application/json" });
  return { target: { files: [file] } };
}

describe("UploadModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders dropzone when open", () => {
    render(<UploadModal {...defaultProps} />);

    expect(screen.getByTestId("dropzone")).toBeInTheDocument();
    expect(screen.getByText("Drop your .klog file to upload roast data")).toBeInTheDocument();
    expect(screen.getByText("or browse files")).toBeInTheDocument();
  });

  it("does not render when isOpen is false", () => {
    render(<UploadModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId("dropzone")).not.toBeInTheDocument();
  });

  it("modal can be closed via close button", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<UploadModal {...defaultProps} onClose={onClose} />);

    await user.click(screen.getByLabelText("Close modal"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("file upload triggers onPreview and shows preview", async () => {
    const onPreview = vi.fn().mockResolvedValue(mockPreview);
    render(<UploadModal {...defaultProps} onPreview={onPreview} />);

    const fileInput = screen.getByTestId("file-input");
    fireEvent.change(fileInput, createFileChangeEvent());

    await waitFor(() => {
      expect(onPreview).toHaveBeenCalledWith(
        "test.klog",
        '{"roast":"data"}',
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Parsed successfully")).toBeInTheDocument();
    });

    expect(screen.getByText("10:30")).toBeInTheDocument();
    expect(screen.getByText("EGB")).toBeInTheDocument();
    expect(screen.getByText("13.5%")).toBeInTheDocument();
  });

  it('shows "Bean match found" when suggestedBeans has items', async () => {
    render(<UploadModal {...defaultProps} />);

    const fileInput = screen.getByTestId("file-input");
    fireEvent.change(fileInput, createFileChangeEvent());

    await waitFor(() => {
      expect(screen.getByTestId("bean-match-found")).toBeInTheDocument();
    });

    expect(
      screen.getByText("Bean match found: Ethiopia Yirgacheffe"),
    ).toBeInTheDocument();
  });

  it('shows "No bean match found" when suggestedBeans is empty', async () => {
    const noMatchPreview = {
      ...mockPreview,
      suggestedBeans: [],
    };
    const onPreview = vi.fn().mockResolvedValue(noMatchPreview);
    render(<UploadModal {...defaultProps} onPreview={onPreview} />);

    const fileInput = screen.getByTestId("file-input");
    fireEvent.change(fileInput, createFileChangeEvent());

    await waitFor(() => {
      expect(screen.getByTestId("no-bean-match")).toBeInTheDocument();
    });

    expect(screen.getByText(/No bean match/)).toBeInTheDocument();
  });

  it("save button disabled without bean selection", async () => {
    const noMatchPreview = {
      ...mockPreview,
      suggestedBeans: [],
    };
    const onPreview = vi.fn().mockResolvedValue(noMatchPreview);
    render(<UploadModal {...defaultProps} onPreview={onPreview} />);

    const fileInput = screen.getByTestId("file-input");
    fireEvent.change(fileInput, createFileChangeEvent());

    await waitFor(() => {
      expect(screen.getByText("Save Roast")).toBeInTheDocument();
    });

    expect(screen.getByText("Save Roast")).toBeDisabled();
  });

  it("save button calls onSave with correct args", async () => {
    const onSave = vi.fn().mockResolvedValue({ roastId: "roast-1" });
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <UploadModal
        {...defaultProps}
        onSave={onSave}
        onClose={onClose}
      />,
    );

    const fileInput = screen.getByTestId("file-input");
    fireEvent.change(fileInput, createFileChangeEvent());

    await waitFor(() => {
      expect(screen.getByText("Parsed successfully")).toBeInTheDocument();
    });

    // Bean should be auto-selected from suggestedBeans
    // Add optional notes
    const notesInput = screen.getByTestId("notes-input");
    fireEvent.change(notesInput, { target: { value: "Great roast" } });

    await user.click(screen.getByText("Save Roast"));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        "bean1",
        "test.klog",
        '{"roast":"data"}',
        "Great roast",
      );
    });

    expect(onClose).toHaveBeenCalled();
  });

  it("shows error when onPreview fails", async () => {
    const onPreview = vi.fn().mockRejectedValue(new Error("Invalid file format"));
    render(<UploadModal {...defaultProps} onPreview={onPreview} />);

    const fileInput = screen.getByTestId("file-input");
    fireEvent.change(fileInput, createFileChangeEvent());

    await waitFor(() => {
      expect(screen.getByTestId("upload-error")).toBeInTheDocument();
    });

    expect(screen.getByText("Invalid file format")).toBeInTheDocument();
    // Should still be on dropzone step
    expect(screen.getByTestId("dropzone")).toBeInTheDocument();
  });

  it("shows error when onSave fails", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("Network error"));
    const user = userEvent.setup();
    render(<UploadModal {...defaultProps} onSave={onSave} />);

    const fileInput = screen.getByTestId("file-input");
    fireEvent.change(fileInput, createFileChangeEvent());

    await waitFor(() => {
      expect(screen.getByText("Parsed successfully")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Save Roast"));

    await waitFor(() => {
      expect(screen.getByTestId("save-error")).toBeInTheDocument();
    });

    expect(screen.getByText("Network error")).toBeInTheDocument();
  });

  it("shows parse warnings when present", async () => {
    const warningPreview = {
      ...mockPreview,
      parseWarnings: ["Missing ambient temperature", "Unusual roast duration"],
    };
    const onPreview = vi.fn().mockResolvedValue(warningPreview);
    render(<UploadModal {...defaultProps} onPreview={onPreview} />);

    const fileInput = screen.getByTestId("file-input");
    fireEvent.change(fileInput, createFileChangeEvent());

    await waitFor(() => {
      expect(screen.getByTestId("parse-warnings")).toBeInTheDocument();
    });

    expect(screen.getByText("Missing ambient temperature")).toBeInTheDocument();
    expect(screen.getByText("Unusual roast duration")).toBeInTheDocument();
  });
});
