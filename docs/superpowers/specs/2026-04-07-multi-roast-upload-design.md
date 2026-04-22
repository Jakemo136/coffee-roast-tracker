# Multi-Roast Upload — Design Spec

## Overview

Extend the existing UploadModal to support uploading multiple `.klog` files at once. Single-file uploads behave exactly as today. When 2+ files are dropped, the modal switches to a batch flow: parse all → auto-match beans → display a table with inline bean selectors → "Save All."

## UX Flow

### Single file (unchanged)
1. Drop/select one `.klog` file
2. Existing preview + bean match + notes flow
3. Save → navigate to roast detail

### Multiple files (new)
1. Drop/select 2+ `.klog` files
2. Modal title changes to "Upload Roasts (N files)"
3. All files parsed in parallel via `previewRoastLog`
4. Table displays with columns: Filename, Roast Date, Profile, Bean (Combobox)
5. Auto-matched beans are pre-filled in each row's Combobox
6. Rows with no match have empty Combobox — highlighted with a subtle warning style
7. User adjusts bean selections as needed
8. "Add New Bean" link available (opens AddBeanModal, new bean appears in all Comboboxes)
9. "Save All" button — enabled when every row has a bean assigned
10. On save: calls `uploadRoastLog` for each roast sequentially
11. Progress: "Saving 2 of 5..." indicator
12. On complete: navigate to dashboard (not a single roast detail)
13. On partial failure: toast error for failed roasts, successfully saved roasts are removed from the table, user can retry remaining

### File validation
- Non-`.klog` files are filtered out with an inline warning: "Skipped N non-.klog files"
- Parse failures show inline error per row (red text instead of parsed data), excluded from Save All
- Max files: 20. Dropzone shows "Up to 20 files" hint. Beyond 20, show "Too many files. Upload up to 20 at a time."

## Component Changes

### UploadModal
- Dropzone and file input: change `accept` to allow `multiple`
- New state: `mode: "single" | "batch"` — determined by file count after drop
- Single mode: existing flow, untouched
- Batch mode: renders `BatchUploadTable` instead of the preview/bean-match UI

### BatchUploadTable (new component)
- Props: `rows: BatchRow[]`, `beans: ComboboxOption[]`, `onBeanChange: (index, beanId) => void`, `onAddBean: () => void`
- Each row: filename (truncated), roast date, profile short name, bean Combobox
- Footer row: "Save All (N roasts)" button, disabled until all rows have beans
- Error rows: show parse error message, dimmed, not selectable

### Types

```typescript
interface BatchRow {
  fileName: string;
  fileContent: string;
  preview: RoastPreview | null;
  error: string | null;
  selectedBeanId: string;
  saved: boolean;
}
```

## Server Changes

None. The existing `previewRoastLog` and `uploadRoastLog` mutations are called per-file. No batch endpoint needed.

## Data Flow

1. User drops N files → FileReader reads all → `Promise.all(files.map(f => onPreview(f.name, f.content)))`
2. Results populate `BatchRow[]` state
3. Auto-match: for each row with `preview.suggestedBeans.length > 0`, set `selectedBeanId` to first match
4. User adjusts via inline Comboboxes
5. Save All: sequential `onSave(beanId, fileName, fileContent)` per row (no notes in batch mode)
6. Navigate to `/` on complete

## Test Plan

### Unit tests (BatchUploadTable)
- Renders rows with parsed data
- Bean Combobox pre-filled for matched rows
- Unmatched rows highlighted
- Save All disabled when any row has no bean
- Save All enabled when all rows have beans
- Error rows displayed but excluded from save

### Integration tests (UploadModal batch flow)
- Drop 2+ files → batch mode activates
- Parse results displayed in table
- Bean auto-matching works
- Save All calls onSave for each roast
- Non-.klog files filtered with warning
- Parse failure shown inline

### E2E
- Upload multiple .klog files → batch table → Save All → lands on dashboard

## Scope Exclusions

- No manual notes textarea in batch mode — notes embedded in the `.klog` file are parsed server-side from `fileContent` automatically
- No drag-to-reorder rows
- No "select all" bean assignment (each row gets its own selection)
- No `.kpro` profile upload in batch mode
