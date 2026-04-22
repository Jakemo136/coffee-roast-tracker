# Multi-Roast Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the UploadModal to support uploading multiple `.klog` files — single files use the existing flow, 2+ files show a batch table with inline bean selectors and "Save All."

**Architecture:** UploadModal gains a `mode` state ("single" | "batch") determined by file count after drop. Batch mode renders a new `BatchUploadTable` component. No server changes — existing `previewRoastLog` and `uploadRoastLog` are called per-file. The dropzone accepts `multiple` files.

**Tech Stack:** React 19, TypeScript, Vitest, RTL, MSW, Apollo Client 4, existing Combobox component

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `client/src/components/BatchUploadTable.tsx` | Table of parsed roasts with inline bean Comboboxes |
| Create | `client/src/components/styles/BatchUploadTable.module.css` | Styles for batch table |
| Create | `client/src/components/__tests__/BatchUploadTable.test.tsx` | Unit tests for batch table |
| Modify | `client/src/components/UploadModal.tsx` | Multi-file support, batch mode routing |
| Modify | `client/src/components/styles/UploadModal.module.css` | Dropzone hint text, saving progress styles |
| Modify | `client/src/components/__tests__/upload-flow.integration.test.tsx` | Batch upload integration tests |

---

### Task 1: BatchUploadTable component + tests

**Files:**
- Create: `client/src/components/BatchUploadTable.tsx`
- Create: `client/src/components/styles/BatchUploadTable.module.css`
- Create: `client/src/components/__tests__/BatchUploadTable.test.tsx`

This is a pure presentational component — no Apollo, no side effects. It receives rows and callbacks.

- [ ] **Step 1: Define the types and write the test file**

Create `client/src/components/__tests__/BatchUploadTable.test.tsx`:

```tsx
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
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `cd /Users/jakemosher/Workspace/coffee-roast-tracker/client && npx vitest run src/components/__tests__/BatchUploadTable.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Write the BatchUploadTable component**

Create `client/src/components/BatchUploadTable.tsx`:

```tsx
import { Combobox } from "./Combobox";
import { formatDuration } from "../lib/formatters";
import styles from "./styles/BatchUploadTable.module.css";

interface RoastPreviewMinimal {
  roastDate?: string | null;
  profileShortName?: string | null;
  totalDuration?: number | null;
  developmentPercent?: number | null;
  suggestedBeans: Array<{ bean: { id: string; name: string } }>;
  parseWarnings: string[];
}

export interface BatchRow {
  fileName: string;
  fileContent: string;
  preview: RoastPreviewMinimal | null;
  error: string | null;
  selectedBeanId: string;
  saved: boolean;
}

interface BatchUploadTableProps {
  rows: BatchRow[];
  beans: Array<{ value: string; label: string }>;
  onBeanChange: (index: number, beanId: string) => void;
  onAddBean: () => void;
  onSaveAll: () => void;
  saving: boolean;
  saveProgress: { current: number; total: number } | null;
}

export function BatchUploadTable({
  rows,
  beans,
  onBeanChange,
  onAddBean,
  onSaveAll,
  saving,
  saveProgress,
}: BatchUploadTableProps) {
  const validRows = rows.filter((r) => !r.error);
  const allHaveBeans = validRows.length > 0 && validRows.every((r) => r.selectedBeanId);
  const canSave = allHaveBeans && !saving;

  return (
    <div className={styles.container}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th}>File</th>
            <th className={styles.th}>Date</th>
            <th className={styles.th}>Profile</th>
            <th className={styles.th}>Duration</th>
            <th className={styles.th}>Bean</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className={`${styles.row} ${row.error ? styles.errorRow : ""} ${!row.error && !row.selectedBeanId ? styles.unmatched : ""} ${row.saved ? styles.savedRow : ""}`}
              data-testid={`batch-row-${i}`}
            >
              {row.error ? (
                <>
                  <td className={styles.td}>{row.fileName}</td>
                  <td className={`${styles.td} ${styles.errorText}`} colSpan={4}>
                    {row.error}
                  </td>
                </>
              ) : (
                <>
                  <td className={styles.td}>{row.fileName}</td>
                  <td className={styles.td}>
                    {row.preview?.roastDate
                      ? new Date(row.preview.roastDate).toLocaleDateString()
                      : "\u2014"}
                  </td>
                  <td className={styles.td}>
                    {row.preview?.profileShortName ?? "\u2014"}
                  </td>
                  <td className={styles.td}>
                    {formatDuration(row.preview?.totalDuration)}
                  </td>
                  <td className={styles.td}>
                    <Combobox
                      options={beans}
                      value={row.selectedBeanId}
                      onChange={(beanId) => onBeanChange(i, beanId)}
                      placeholder="Select a bean..."
                    />
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <div className={styles.footer}>
        <button
          type="button"
          className={styles.addBeanLink}
          onClick={onAddBean}
        >
          + Add New Bean
        </button>

        <div className={styles.saveSection}>
          {saveProgress && (
            <span className={styles.progressText}>
              Saving {saveProgress.current} of {saveProgress.total}…
            </span>
          )}
          <button
            type="button"
            className={styles.saveAllBtn}
            onClick={onSaveAll}
            disabled={!canSave}
          >
            Save All ({validRows.length})
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Write the CSS module**

Create `client/src/components/styles/BatchUploadTable.module.css`:

```css
.container {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}

.th {
  text-align: left;
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--color-border);
}

.row {
  border-bottom: 1px solid var(--color-border);
}

.td {
  padding: var(--space-2) var(--space-3);
  vertical-align: middle;
}

.unmatched {
  background: var(--color-warning-muted);
}

.errorRow {
  opacity: 0.5;
}

.errorText {
  color: var(--color-error);
  font-style: italic;
}

.savedRow {
  opacity: 0.4;
}

.footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.addBeanLink {
  background: none;
  border: none;
  color: var(--color-action);
  font-size: var(--text-sm);
  cursor: pointer;
  padding: 0;
}

.addBeanLink:hover {
  text-decoration: underline;
}

.saveSection {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.progressText {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.saveAllBtn {
  padding: 8px 18px;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  cursor: pointer;
  border: none;
  background: var(--color-action);
  color: #faf7f2;
}

.saveAllBtn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

- [ ] **Step 5: Run tests**

Run: `cd /Users/jakemosher/Workspace/coffee-roast-tracker/client && npx vitest run src/components/__tests__/BatchUploadTable.test.tsx`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git -C /Users/jakemosher/Workspace/coffee-roast-tracker add client/src/components/BatchUploadTable.tsx client/src/components/styles/BatchUploadTable.module.css client/src/components/__tests__/BatchUploadTable.test.tsx
git -C /Users/jakemosher/Workspace/coffee-roast-tracker commit -m "feat: add BatchUploadTable component with tests"
```

---

### Task 2: Wire batch mode into UploadModal

**Files:**
- Modify: `client/src/components/UploadModal.tsx`
- Modify: `client/src/components/styles/UploadModal.module.css`

This task modifies UploadModal to:
1. Accept `multiple` files on the dropzone/input
2. Detect single vs batch mode from file count
3. In batch mode: parse all files, build `BatchRow[]` state, render `BatchUploadTable`
4. Handle Save All: sequential `onSave` per row with progress
5. Navigate to dashboard on completion

- [ ] **Step 1: Modify UploadModal**

Read the current `UploadModal.tsx` (already provided above). Apply these changes:

**Imports — add:**
```typescript
import { BatchUploadTable } from "./BatchUploadTable";
import type { BatchRow } from "./BatchUploadTable";
```

**Constants — add at top of file:**
```typescript
const MAX_FILES = 20;
```

**State — add new state variables inside the component:**
```typescript
const [mode, setMode] = useState<"single" | "batch">("single");
const [batchRows, setBatchRows] = useState<BatchRow[]>([]);
const [batchSaving, setBatchSaving] = useState(false);
const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
const [skippedFiles, setSkippedFiles] = useState(0);
```

**Reset function — add the new state resets:**
```typescript
function reset() {
  // ...existing resets...
  setMode("single");
  setBatchRows([]);
  setBatchSaving(false);
  setBatchProgress(null);
  setSkippedFiles(0);
}
```

**New function — handle multiple files:**
```typescript
async function handleMultipleFiles(files: File[]) {
  const klogFiles = files.filter((f) => f.name.endsWith(".klog"));
  const skipped = files.length - klogFiles.length;
  setSkippedFiles(skipped);

  if (klogFiles.length === 0) {
    setError("No .klog files found. Only Kaffelogic roast files are supported.");
    return;
  }

  if (klogFiles.length === 1) {
    handleFile(klogFiles[0]!);
    return;
  }

  if (klogFiles.length > MAX_FILES) {
    setError(`Too many files. Upload up to ${MAX_FILES} at a time.`);
    return;
  }

  setMode("batch");
  setParsing(true);

  // Read all files
  const fileData = await Promise.all(
    klogFiles.map(
      (f) =>
        new Promise<{ name: string; content: string }>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) =>
            resolve({ name: f.name, content: e.target?.result as string });
          reader.readAsText(f);
        }),
    ),
  );

  // Parse all files in parallel
  const rows: BatchRow[] = await Promise.all(
    fileData.map(async ({ name, content }) => {
      try {
        const preview = await onPreview(name, content);
        const matchedBeanId =
          preview.suggestedBeans.length > 0 && preview.suggestedBeans[0]
            ? preview.suggestedBeans[0].bean.id
            : "";
        return {
          fileName: name,
          fileContent: content,
          preview,
          error: null,
          selectedBeanId: matchedBeanId,
          saved: false,
        };
      } catch (err) {
        return {
          fileName: name,
          fileContent: content,
          preview: null,
          error: err instanceof Error ? err.message : "Failed to parse",
          selectedBeanId: "",
          saved: false,
        };
      }
    }),
  );

  setBatchRows(rows);
  setParsing(false);
}
```

**New function — handle batch bean change:**
```typescript
function handleBatchBeanChange(index: number, beanId: string) {
  setBatchRows((prev) =>
    prev.map((r, i) => (i === index ? { ...r, selectedBeanId: beanId } : r)),
  );
}
```

**New function — handle Save All:**
```typescript
async function handleSaveAll() {
  const validRows = batchRows.filter((r) => !r.error && !r.saved);
  setBatchSaving(true);
  setBatchProgress({ current: 0, total: validRows.length });

  for (let i = 0; i < validRows.length; i++) {
    const row = validRows[i]!;
    setBatchProgress({ current: i + 1, total: validRows.length });
    try {
      await onSave(row.selectedBeanId, row.fileName, row.fileContent);
      setBatchRows((prev) =>
        prev.map((r) =>
          r.fileName === row.fileName ? { ...r, saved: true } : r,
        ),
      );
    } catch {
      // Stop on first failure — remaining rows stay unsaved
      setError(`Failed to save ${row.fileName}. Previously saved roasts are safe.`);
      setBatchSaving(false);
      setBatchProgress(null);
      return;
    }
  }

  // All saved — navigate to dashboard
  setBatchSaving(false);
  setBatchProgress(null);
  onClose();
  reset();
}
```

**Update drop handler — accept multiple files:**
```typescript
function handleDrop(e: React.DragEvent) {
  e.preventDefault();
  setIsDragging(false);
  const files = Array.from(e.dataTransfer.files);
  if (files.length > 1) {
    handleMultipleFiles(files);
  } else if (files[0]) {
    handleFile(files[0]);
  }
}
```

**Update input handler — accept multiple files:**
```typescript
function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
  const files = Array.from(e.target.files ?? []);
  if (files.length > 1) {
    handleMultipleFiles(files);
  } else if (files[0]) {
    handleFile(files[0]);
  }
}
```

**Update file input — add `multiple`:**
```tsx
<input
  ref={fileInputRef}
  type="file"
  accept=".klog"
  multiple
  style={{ display: "none" }}
  onChange={handleInputChange}
  data-testid="file-input"
/>
```

**Update dropzone text — add hint:**
```tsx
<p className={styles.dropText}>Drop your .klog files to upload roast data</p>
<p className={styles.dropHint}>Up to {MAX_FILES} files at once</p>
```

**Add batch rendering — after the dropzone step, before the single preview step:**

When `mode === "batch"`:
```tsx
if (mode === "batch") {
  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Upload Roasts (${batchRows.filter((r) => !r.error).length} files)`}
    >
      {parsing ? (
        <div className={styles.dropzone} data-testid="parsing-indicator">
          <p className={styles.dropText}>Parsing files…</p>
        </div>
      ) : (
        <>
          {skippedFiles > 0 && (
            <div className={styles.warningBar} data-testid="skipped-warning">
              Skipped {skippedFiles} non-.klog file{skippedFiles > 1 ? "s" : ""}
            </div>
          )}
          <BatchUploadTable
            rows={batchRows}
            beans={beanOptions}
            onBeanChange={handleBatchBeanChange}
            onAddBean={() => setAddBeanOpen(true)}
            onSaveAll={handleSaveAll}
            saving={batchSaving}
            saveProgress={batchProgress}
          />
          {error && (
            <div className={styles.errorMessage} data-testid="save-error">
              {error}
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
```

The `AddBeanModal` at the end of the component already handles bean creation and is shared by both modes.

- [ ] **Step 2: Add CSS for new elements**

In `client/src/components/styles/UploadModal.module.css`, add:

```css
.dropHint {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  margin: 0;
  opacity: 0.7;
}
```

- [ ] **Step 3: Run existing tests**

Run: `cd /Users/jakemosher/Workspace/coffee-roast-tracker/client && npm test`
Expected: All existing tests pass (single-file upload tests unchanged). The new batch paths are not yet tested by integration tests.

- [ ] **Step 4: Commit**

```bash
git -C /Users/jakemosher/Workspace/coffee-roast-tracker add client/src/components/UploadModal.tsx client/src/components/styles/UploadModal.module.css
git -C /Users/jakemosher/Workspace/coffee-roast-tracker commit -m "feat: wire batch mode into UploadModal for multi-file upload"
```

---

### Task 3: Integration tests for batch upload

**Files:**
- Modify: `client/src/components/__tests__/upload-flow.integration.test.tsx`

Add batch upload tests to the existing integration test file. These tests render UploadModal with `vi.fn()` callbacks (same pattern as existing tests).

- [ ] **Step 1: Add batch upload tests**

In `client/src/components/__tests__/upload-flow.integration.test.tsx`, add a new describe block:

```typescript
describe("UploadModal integration: batch upload flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createKlogFiles(count: number) {
    return Array.from({ length: count }, (_, i) =>
      new File([`{"roast":"data${i}"}`], `roast${i + 1}.klog`, {
        type: "application/json",
      }),
    );
  }

  it("dropping 2+ .klog files enters batch mode with table", async () => {
    const { props } = renderUploadModal();
    const input = screen.getByTestId("file-input");
    const files = createKlogFiles(3);

    fireEvent.change(input, { target: { files } });

    await waitFor(() => {
      expect(screen.getByText(/Upload Roasts \(3 files\)/i)).toBeInTheDocument();
    });

    // Each file should have a row
    expect(screen.getByTestId("batch-row-0")).toBeInTheDocument();
    expect(screen.getByTestId("batch-row-1")).toBeInTheDocument();
    expect(screen.getByTestId("batch-row-2")).toBeInTheDocument();
  });

  it("single .klog file uses existing single upload flow", async () => {
    const user = userEvent.setup();
    renderUploadModal();

    await uploadFile(user);

    await waitFor(() => {
      expect(screen.getByText("Parsed successfully")).toBeInTheDocument();
    });

    // Should NOT show batch table
    expect(screen.queryByTestId("batch-row-0")).not.toBeInTheDocument();
  });

  it("non-.klog files are filtered with warning in batch mode", async () => {
    renderUploadModal();
    const input = screen.getByTestId("file-input");
    const files = [
      new File(['{"roast":"data"}'], "roast1.klog", { type: "application/json" }),
      new File(["csv data"], "data.csv", { type: "text/csv" }),
      new File(['{"roast":"data2"}'], "roast2.klog", { type: "application/json" }),
    ];

    fireEvent.change(input, { target: { files } });

    await waitFor(() => {
      expect(screen.getByText(/Upload Roasts \(2 files\)/i)).toBeInTheDocument();
    });

    expect(screen.getByTestId("skipped-warning")).toBeInTheDocument();
    expect(screen.getByText(/Skipped 1 non-.klog file/)).toBeInTheDocument();
  });

  it("batch Save All calls onSave for each row", async () => {
    const user = userEvent.setup();
    const onPreviewMock = vi.fn().mockResolvedValue({
      ...mockPreviewData,
      suggestedBeans: [
        { id: "ub-1", shortName: "Yirg", bean: { id: "bean-1", name: "Ethiopia Yirgacheffe" } },
      ],
    });
    const onSaveMock = vi.fn().mockResolvedValue({ roastId: "new-1" });
    const { props } = renderUploadModal({
      onPreview: onPreviewMock,
      onSave: onSaveMock,
    });

    const input = screen.getByTestId("file-input");
    const files = createKlogFiles(2);
    fireEvent.change(input, { target: { files } });

    await waitFor(() => {
      expect(screen.getByText(/Upload Roasts/i)).toBeInTheDocument();
    });

    // Both rows should be auto-matched
    const saveBtn = await screen.findByRole("button", { name: /save all/i });
    expect(saveBtn).not.toBeDisabled();

    await user.click(saveBtn);

    await waitFor(() => {
      expect(onSaveMock).toHaveBeenCalledTimes(2);
    });
  });

  it("too many files shows error", () => {
    renderUploadModal();
    const input = screen.getByTestId("file-input");
    const files = createKlogFiles(21);

    fireEvent.change(input, { target: { files } });

    expect(screen.getByText(/Too many files/i)).toBeInTheDocument();
  });
});
```

Note: `fireEvent.change` on the file input is correct here — we need to bypass the browser's file dialog and directly set `files`. This is different from text inputs (where we use `userEvent.type`). The `uploadFile` helper also uses this pattern.

- [ ] **Step 2: Run tests**

Run: `cd /Users/jakemosher/Workspace/coffee-roast-tracker/client && npx vitest run src/components/__tests__/upload-flow.integration.test.tsx`
Expected: All tests pass (existing + new batch tests)

- [ ] **Step 3: Run full suite**

Run: `cd /Users/jakemosher/Workspace/coffee-roast-tracker/client && npm test`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git -C /Users/jakemosher/Workspace/coffee-roast-tracker add client/src/components/__tests__/upload-flow.integration.test.tsx
git -C /Users/jakemosher/Workspace/coffee-roast-tracker commit -m "test: add batch upload integration tests"
```

---

### Task 4: Verification + docs

- [ ] **Step 1: Run full test suite**

Run: `cd /Users/jakemosher/Workspace/coffee-roast-tracker && npm test`

- [ ] **Step 2: Run schema validation**

Run: `cd /Users/jakemosher/Workspace/coffee-roast-tracker/client && npm run validate:schema`

- [ ] **Step 3: Update BUILD_STATUS.md**

Add a "Multi-Roast Upload" section before Next Steps.

- [ ] **Step 4: Commit and push**

```bash
git -C /Users/jakemosher/Workspace/coffee-roast-tracker add docs/BUILD_STATUS.md
git -C /Users/jakemosher/Workspace/coffee-roast-tracker commit -m "docs: update BUILD_STATUS with multi-roast upload"
```
