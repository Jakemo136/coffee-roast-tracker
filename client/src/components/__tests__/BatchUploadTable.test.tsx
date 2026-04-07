import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BatchUploadTable } from "../BatchUploadTable";
import type { BatchRow } from "../BatchUploadTable";

const mockBeans = [
  { value: "bean-1", label: "Ethiopia Yirgacheffe" },
  { value: "bean-2", label: "Colombia Huila" },
];

function makeRow(overrides: Partial<BatchRow> = {}): BatchRow {
  return {
    fileName: "test.klog",
    fileContent: '{"roast":"data"}',
    preview: {
      roastDate: "2026-03-20T00:00:00.000Z",
      profileShortName: "Yirg",
      totalDuration: 405,
      developmentPercent: 18.5,
      suggestedBeans: [],
      parseWarnings: [],
    },
    error: null,
    selectedBeanId: "",
    saved: false,
    ...overrides,
  };
}

describe("BatchUploadTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a row for each parsed file", () => {
    const rows = [
      makeRow({ fileName: "roast1.klog" }),
      makeRow({ fileName: "roast2.klog" }),
    ];
    render(
      <BatchUploadTable
        rows={rows}
        beans={mockBeans}
        onBeanChange={vi.fn()}
        onAddBean={vi.fn()}
        onSaveAll={vi.fn()}
        saving={false}
        saveProgress={null}
      />,
    );

    expect(screen.getByText("roast1.klog")).toBeInTheDocument();
    expect(screen.getByText("roast2.klog")).toBeInTheDocument();
  });

  it("pre-fills bean combobox for auto-matched rows", () => {
    const rows = [
      makeRow({
        fileName: "matched.klog",
        selectedBeanId: "bean-1",
      }),
    ];
    render(
      <BatchUploadTable
        rows={rows}
        beans={mockBeans}
        onBeanChange={vi.fn()}
        onAddBean={vi.fn()}
        onSaveAll={vi.fn()}
        saving={false}
        saveProgress={null}
      />,
    );

    // The Combobox input should show the bean name
    const combobox = screen.getByPlaceholderText("Select a bean...");
    expect(combobox).toHaveValue("Ethiopia Yirgacheffe");
  });

  it("highlights unmatched rows", () => {
    const rows = [makeRow({ selectedBeanId: "" })];
    render(
      <BatchUploadTable
        rows={rows}
        beans={mockBeans}
        onBeanChange={vi.fn()}
        onAddBean={vi.fn()}
        onSaveAll={vi.fn()}
        saving={false}
        saveProgress={null}
      />,
    );

    const row = screen.getByTestId("batch-row-0");
    expect(row.className).toContain("unmatched");
  });

  it("shows error text for rows that failed to parse", () => {
    const rows = [makeRow({ error: "Invalid JSON", preview: null })];
    render(
      <BatchUploadTable
        rows={rows}
        beans={mockBeans}
        onBeanChange={vi.fn()}
        onAddBean={vi.fn()}
        onSaveAll={vi.fn()}
        saving={false}
        saveProgress={null}
      />,
    );

    expect(screen.getByText("Invalid JSON")).toBeInTheDocument();
  });

  it("Save All is disabled when any valid row has no bean", () => {
    const rows = [
      makeRow({ selectedBeanId: "bean-1" }),
      makeRow({ selectedBeanId: "" }),
    ];
    render(
      <BatchUploadTable
        rows={rows}
        beans={mockBeans}
        onBeanChange={vi.fn()}
        onAddBean={vi.fn()}
        onSaveAll={vi.fn()}
        saving={false}
        saveProgress={null}
      />,
    );

    expect(screen.getByRole("button", { name: /save all/i })).toBeDisabled();
  });

  it("Save All is enabled when every valid row has a bean", () => {
    const rows = [
      makeRow({ selectedBeanId: "bean-1" }),
      makeRow({ selectedBeanId: "bean-2" }),
    ];
    render(
      <BatchUploadTable
        rows={rows}
        beans={mockBeans}
        onBeanChange={vi.fn()}
        onAddBean={vi.fn()}
        onSaveAll={vi.fn()}
        saving={false}
        saveProgress={null}
      />,
    );

    expect(screen.getByRole("button", { name: /save all/i })).not.toBeDisabled();
  });

  it("calls onBeanChange when a bean is selected in a row", async () => {
    const user = userEvent.setup();
    const onBeanChange = vi.fn();
    const rows = [makeRow({ selectedBeanId: "" })];
    render(
      <BatchUploadTable
        rows={rows}
        beans={mockBeans}
        onBeanChange={onBeanChange}
        onAddBean={vi.fn()}
        onSaveAll={vi.fn()}
        saving={false}
        saveProgress={null}
      />,
    );

    const combobox = screen.getByPlaceholderText("Select a bean...");
    await user.click(combobox);
    await user.click(screen.getByText("Ethiopia Yirgacheffe"));

    expect(onBeanChange).toHaveBeenCalledWith(0, "bean-1");
  });

  it("calls onSaveAll when Save All is clicked", async () => {
    const user = userEvent.setup();
    const onSaveAll = vi.fn();
    const rows = [makeRow({ selectedBeanId: "bean-1" })];
    render(
      <BatchUploadTable
        rows={rows}
        beans={mockBeans}
        onBeanChange={vi.fn()}
        onAddBean={vi.fn()}
        onSaveAll={onSaveAll}
        saving={false}
        saveProgress={null}
      />,
    );

    await user.click(screen.getByRole("button", { name: /save all/i }));
    expect(onSaveAll).toHaveBeenCalledOnce();
  });

  it("shows saving progress when saving", () => {
    const rows = [
      makeRow({ selectedBeanId: "bean-1" }),
      makeRow({ selectedBeanId: "bean-2" }),
    ];
    render(
      <BatchUploadTable
        rows={rows}
        beans={mockBeans}
        onBeanChange={vi.fn()}
        onAddBean={vi.fn()}
        onSaveAll={vi.fn()}
        saving={true}
        saveProgress={{ current: 1, total: 2 }}
      />,
    );

    expect(screen.getByText("Saving 1 of 2…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save all/i })).toBeDisabled();
  });

  it("shows Add New Bean link", () => {
    const rows = [makeRow()];
    render(
      <BatchUploadTable
        rows={rows}
        beans={mockBeans}
        onBeanChange={vi.fn()}
        onAddBean={vi.fn()}
        onSaveAll={vi.fn()}
        saving={false}
        saveProgress={null}
      />,
    );

    expect(screen.getByRole("button", { name: /add new bean/i })).toBeInTheDocument();
  });

  it("error rows are excluded from Save All count", () => {
    const rows = [
      makeRow({ selectedBeanId: "bean-1" }),
      makeRow({ error: "Bad file", preview: null, selectedBeanId: "" }),
    ];
    render(
      <BatchUploadTable
        rows={rows}
        beans={mockBeans}
        onBeanChange={vi.fn()}
        onAddBean={vi.fn()}
        onSaveAll={vi.fn()}
        saving={false}
        saveProgress={null}
      />,
    );

    // Only 1 valid row, and it has a bean — Save All should be enabled
    expect(screen.getByRole("button", { name: /save all \(1\)/i })).not.toBeDisabled();
  });
});
