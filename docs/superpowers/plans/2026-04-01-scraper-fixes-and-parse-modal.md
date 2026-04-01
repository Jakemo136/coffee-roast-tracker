# Scraper Fixes & Reusable Parse Modal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 3 confirmed scraper bugs (CBC name duplication, Bodhi Leaf Shopify encoding, `<b>` vs `<strong>` gap), then extract the URL+paste parsing flow into a reusable `ParseSupplierModal` that works both from AddBeanModal (new beans) and BeanDetailPage (re-parse existing beans with field-by-field diff/cherry-pick).

**Architecture:** Extract URL fetch + paste + parse into a standalone `ParseSupplierModal` component. In "create" context (AddBeanModal), it passes all parsed fields up via callback. In "update" context (BeanDetailPage), it shows a diff view with checkboxes so the user can cherry-pick which fields to overwrite. Both URL and paste sections are visible by default (no hidden fallback). The scraper bugs are server-side fixes to `scrapingService.ts`.

**Tech Stack:** React 19, Apollo Client 4, CSS Modules, Node.js server with existing `scrapeBeanUrl` / `parseBeanPage` queries.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `server/src/services/scrapingService.ts` | Modify | Fix CBC name duplication, Bodhi Leaf unicode decode, add `<b>` strategy, add "varieties" label |
| `server/src/services/scrapingService.test.ts` | Modify | Update fixtures for CBC name fix, add Bodhi Leaf unicode test, add `<b>` extraction test |
| `client/src/components/ParseSupplierModal.tsx` | Create | Reusable modal: URL input + paste textarea (both visible), fetch/parse logic, diff preview with checkboxes |
| `client/src/components/ParseSupplierModal.module.css` | Create | Styles for parse modal, diff table |
| `client/src/components/AddBeanModal.tsx` | Modify | Replace inline URL/paste UI with `ParseSupplierModal` trigger |
| `client/src/pages/BeanDetailPage.tsx` | Modify | Add "Re-parse from supplier" button, open `ParseSupplierModal` in update mode |
| `client/src/components/__tests__/ParseSupplierModal.test.tsx` | Create | Tests for modal rendering, diff view, cherry-pick behavior |

---

### Task 1: Fix CBC name duplication in scraper

The CBC `<h1>` contains both visible spans (`<span class="coff-country">Bolivia</span>`) and a hidden `<span itemprop="name">Bolivia: Apolo...</span>`, causing the name to double. Fix: prefer the `itemprop="name"` span when present.

**Files:**
- Modify: `server/src/services/scrapingService.ts` (extractName method, ~line 168)
- Modify: `server/src/services/scrapingService.test.ts` (CBC fixtures)

- [ ] **Step 1: Add failing test for CBC name with itemprop**

Add to `scrapingService.test.ts` after the existing CBC tests (~line 252):

```ts
it("extracts clean name from CBC page with itemprop span", () => {
  const html = `
    <h1><span class="coff-country">Bolivia</span> <span class="coff-name">Apolo</span>
    <span class="coff-region">La Paz</span>
    <span itemprop="name">Bolivia: Apolo, La Paz</span></h1>
  `;
  const result = service.parseProductPage(html);
  expect(result.name).toBe("Bolivia: Apolo, La Paz");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && NODE_OPTIONS='--experimental-vm-modules' npx jest --testPathPatterns=scrapingService`
Expected: FAIL — name will be "Bolivia Apolo La Paz Bolivia: Apolo, La Paz" (duplicated)

- [ ] **Step 3: Fix extractName — prefer itemprop="name"**

In `scrapingService.ts`, add at the top of `extractName()` (before the WooCommerce check):

```ts
// Prefer itemprop="name" when present (avoids CBC duplicate spans)
const itemprop = this.matchAndStrip(
  html,
  /<[^>]*itemprop="name"[^>]*>(.*?)<\/[^>]+>/si,
);
if (itemprop) return itemprop;
```

- [ ] **Step 4: Run tests to verify pass**

Run: `cd server && NODE_OPTIONS='--experimental-vm-modules' npx jest --testPathPatterns=scrapingService`
Expected: All pass. Verify no other tests broke (the itemprop strategy is tried first but only matches pages that have it).

- [ ] **Step 5: Commit**

```bash
git -C /Users/jakemosher/Workspace/coffee-roast-tracker add server/src/services/scrapingService.ts server/src/services/scrapingService.test.ts
git -C /Users/jakemosher/Workspace/coffee-roast-tracker commit -m "fix(scraper): prefer itemprop=name to avoid CBC name duplication"
```

---

### Task 2: Fix Bodhi Leaf Shopify unicode encoding

`extractShopifyField` returns raw Shopify JSON with `\u003c` encoded HTML. `stripTags` doesn't decode these, so fields get the entire description blob. Fix: decode unicode escapes before processing.

**Files:**
- Modify: `server/src/services/scrapingService.ts` (extractShopifyField, ~line 547, and stripTags ~line 601)

- [ ] **Step 1: Add failing test for Shopify unicode HTML**

```ts
it("extracts fields from Shopify page with unicode-encoded HTML description", () => {
  const html = `
    <html>
      <h1>Colombia Test Bean</h1>
      <script>
        window.meta = {
          productData: {
            "title": "Colombia Test Bean",
            "description": "\\u003cp\\u003e\\u003cb\\u003eCountry:\\u003c/b\\u003e Colombia\\u003cbr\\u003e\\u003cb\\u003eProcess:\\u003c/b\\u003e Washed\\u003cbr\\u003e\\u003cb\\u003eVarietal:\\u003c/b\\u003e Caturra\\u003cbr\\u003e\\u003cb\\u003eAltitude:\\u003c/b\\u003e 1,800 MASL\\u003c/p\\u003e"
          }
        }
      </script>
    </html>
  `;
  const result = service.parseProductPage(html);
  expect(result.origin).toContain("Colombia");
  expect(result.process).toBe("Washed");
  expect(result.variety).toContain("Caturra");
  expect(result.elevation).toContain("1,800");
});
```

- [ ] **Step 2: Run test to verify it fails**

Expected: FAIL — origin/process/variety all null or garbage blobs

- [ ] **Step 3: Add unicode decode to stripTags**

In `stripTags()` method, add unicode escape decoding before tag stripping:

```ts
private stripTags(html: string): string {
  return html
    .replace(/\\u003c/gi, "<")
    .replace(/\\u003e/gi, ">")
    .replace(/\\u0026/gi, "&")
    .replace(/\\u0022/gi, '"')
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
```

Also add the same decode in `extractShopifyField` when the field value is returned from the regex fallback path — replace the return block (~line 576):

```ts
if (fieldMatch?.[1]) {
  return fieldMatch[1]
    .replace(/\\"/g, '"')
    .replace(/\\n/g, "\n")
    .replace(/\\\\/g, "\\")
    .replace(/\\u003c/gi, "<")
    .replace(/\\u003e/gi, ">")
    .replace(/\\u0026/gi, "&");
}
```

- [ ] **Step 4: Run tests to verify pass**

Expected: New test passes, all existing tests still pass.

- [ ] **Step 5: Commit**

```bash
git -C /Users/jakemosher/Workspace/coffee-roast-tracker add server/src/services/scrapingService.ts server/src/services/scrapingService.test.ts
git -C /Users/jakemosher/Workspace/coffee-roast-tracker commit -m "fix(scraper): decode Shopify unicode-escaped HTML before extraction"
```

---

### Task 3: Add `<b>Label:</b> Value` strategy and missing variety labels

Captain's Coffee uses `<b>Processing:</b> Washed` but Strategy 5 only matches `<strong>`. Also, "varieties" (plural with s) is not in VARIETY_LABELS.

**Files:**
- Modify: `server/src/services/scrapingService.ts`
- Modify: `server/src/services/scrapingService.test.ts`

- [ ] **Step 1: Add failing test for `<b>` label pattern**

```ts
it("extracts from bold-label pattern without span wrapper", () => {
  const html = `
    <h1>Panama Geisha Test</h1>
    <p><b>Region:</b> Chiriqui</p>
    <p><b>Processing:</b> Fully washed, sun dried</p>
    <p><b>Varieties:</b> Gesha</p>
  `;
  const result = service.parseProductPage(html);
  expect(result.origin).toContain("Chiriqui");
  expect(result.process).toContain("Fully washed");
  expect(result.variety).toContain("Gesha");
});
```

- [ ] **Step 2: Run test to verify it fails**

Expected: FAIL — origin/process/variety all null

- [ ] **Step 3: Add `<b>` text strategy and "varieties" label**

In `extractByLabels`, add Strategy 5b after Strategy 5 (the `<strong>` one):

```ts
// Strategy 5b: <b>Label:</b> Value (up to next tag or newline)
const bText = this.matchAndStrip(
  html,
  new RegExp(
    `<b>\\s*${escaped}\\s*:?\\s*</b>\\s*(.*?)(?:<(?:br|b|div|p)|\\n|$)`,
    "si",
  ),
);
if (bText) return bText;
```

Add `"varieties"` to `VARIETY_LABELS`:

```ts
const VARIETY_LABELS = [
  "variety",
  "varietal",
  "varietals",
  "varieties",
  "cultivar detail",
  "cultivar",
  "botanical variety",
];
```

- [ ] **Step 4: Run tests to verify pass**

Expected: New test passes, all existing tests still pass.

- [ ] **Step 5: Commit**

```bash
git -C /Users/jakemosher/Workspace/coffee-roast-tracker add server/src/services/scrapingService.ts server/src/services/scrapingService.test.ts
git -C /Users/jakemosher/Workspace/coffee-roast-tracker commit -m "fix(scraper): add <b> label strategy and 'varieties' to VARIETY_LABELS"
```

---

### Task 4: Create ParseSupplierModal component

Extract the URL fetch + paste + parse logic from AddBeanModal into a reusable modal. Both URL input and paste textarea are visible by default. The modal calls `scrapeBeanUrl` or `parseBeanPage` and returns the result to the parent via an `onResult` callback.

**Files:**
- Create: `client/src/components/ParseSupplierModal.tsx`
- Create: `client/src/components/ParseSupplierModal.module.css`

- [ ] **Step 1: Create ParseSupplierModal component**

```tsx
// client/src/components/ParseSupplierModal.tsx
import { useState } from "react";
import { useLazyQuery } from "@apollo/client/react";
import { Modal } from "./Modal";
import { SCRAPE_BEAN_URL, PARSE_BEAN_PAGE } from "../graphql/operations";
import type { BeanScrapeResult } from "./parseSupplierTypes";
import styles from "./ParseSupplierModal.module.css";

const PASTE_ONLY_DOMAINS = ["sweetmarias.com"];

function requiresPaste(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return PASTE_ONLY_DOMAINS.some((d) => hostname === d || hostname.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

// Shape returned by both scrapeBeanUrl and parseBeanPage queries
export interface ParseResult {
  name: string | null;
  origin: string | null;
  process: string | null;
  elevation: string | null;
  variety: string | null;
  bagNotes: string | null;
  score: number | null;
  cropYear: number | null;
  suggestedFlavors: readonly string[];
}

interface ParseSupplierModalProps {
  onClose: () => void;
  onResult: (result: ParseResult) => void;
  initialUrl?: string;
}

export function ParseSupplierModal({ onClose, onResult, initialUrl }: ParseSupplierModalProps) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const [pasteContent, setPasteContent] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const [scrapeBean] = useLazyQuery(SCRAPE_BEAN_URL, { fetchPolicy: "no-cache" });
  const [parsePage] = useLazyQuery(PARSE_BEAN_PAGE, { fetchPolicy: "no-cache" });

  async function handleFetch() {
    if (!url.trim()) return;
    if (requiresPaste(url.trim())) {
      setErrorMsg("This site requires paste mode. Copy the product details from the page and paste below.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    try {
      const { data } = await scrapeBean({ variables: { url: url.trim() } });
      if (data?.scrapeBeanUrl) {
        onResult(data.scrapeBeanUrl as ParseResult);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to fetch URL");
      setStatus("error");
    }
  }

  async function handleParse() {
    if (!pasteContent.trim()) return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const { data } = await parsePage({ variables: { html: pasteContent.trim() } });
      if (data?.parseBeanPage) {
        onResult(data.parseBeanPage as ParseResult);
      }
    } catch {
      setErrorMsg("Failed to parse pasted content");
      setStatus("error");
    }
  }

  const loading = status === "loading";

  return (
    <Modal title="Parse Supplier Details" onClose={onClose}>
      {/* URL Section */}
      <div className={styles.section}>
        <label className={styles.label}>Supplier URL</label>
        <div className={styles.inputRow}>
          <input
            type="text"
            className={styles.input}
            placeholder="Paste a green coffee supplier URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button
            type="button"
            className={styles.btn}
            disabled={loading || !url.trim()}
            onClick={handleFetch}
          >
            Fetch
          </button>
        </div>
        <div className={styles.hint}>Attempt to auto-fill bean details from supplier URL.</div>
      </div>

      {/* Divider */}
      <div className={styles.divider}>
        <span className={styles.dividerText}>or</span>
      </div>

      {/* Paste Section */}
      <div className={styles.section}>
        <label className={styles.label}>Paste supplier notes</label>
        <textarea
          className={styles.textarea}
          placeholder="Copy the product specs section from the supplier page and paste here"
          value={pasteContent}
          onChange={(e) => setPasteContent(e.target.value)}
          rows={5}
        />
        <button
          type="button"
          className={styles.btn}
          disabled={loading || !pasteContent.trim()}
          onClick={handleParse}
        >
          Parse
        </button>
      </div>

      {/* Status */}
      {loading && (
        <div className={styles.status}>Parsing...</div>
      )}
      {errorMsg && (
        <div className={styles.error}>{errorMsg}</div>
      )}
    </Modal>
  );
}
```

- [ ] **Step 2: Create CSS module**

```css
/* client/src/components/ParseSupplierModal.module.css */
.section { margin-bottom: var(--space-3); }
.label { display: block; font-size: var(--text-xs); font-weight: var(--weight-medium); color: var(--color-text-secondary); margin-bottom: var(--space-1); }
.inputRow { display: flex; gap: var(--space-2); }
.input { flex: 1; padding: 9px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--text-sm); }
.input:focus { border-color: var(--color-action); outline: none; }
.textarea { width: 100%; padding: 9px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--text-sm); font-family: inherit; resize: vertical; margin-bottom: var(--space-2); }
.textarea:focus { border-color: var(--color-action); outline: none; }
.btn { padding: 8px 18px; border-radius: var(--radius-md); font-size: var(--text-sm); font-weight: var(--weight-medium); cursor: pointer; border: 1px solid var(--color-border); background: none; color: var(--color-text-secondary); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.hint { font-size: var(--text-xs); color: var(--color-text-muted); margin-top: 3px; }
.divider { display: flex; align-items: center; gap: var(--space-3); margin: var(--space-3) 0; }
.divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: var(--color-border); }
.dividerText { font-size: var(--text-xs); color: var(--color-text-muted); }
.status { font-size: var(--text-xs); color: var(--color-text-muted); margin-top: var(--space-2); }
.error { font-size: var(--text-xs); color: var(--color-error); margin-top: var(--space-2); }
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd client && npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git -C /Users/jakemosher/Workspace/coffee-roast-tracker add client/src/components/ParseSupplierModal.tsx client/src/components/ParseSupplierModal.module.css
git -C /Users/jakemosher/Workspace/coffee-roast-tracker commit -m "feat: create reusable ParseSupplierModal component"
```

---

### Task 5: Integrate ParseSupplierModal into AddBeanModal

Replace the inline URL/paste UI in AddBeanModal with a button that opens ParseSupplierModal. When the modal returns a result, apply it to the form fields (same as current `applyResult`).

**Files:**
- Modify: `client/src/components/AddBeanModal.tsx`

- [ ] **Step 1: Replace URL/paste inline UI with ParseSupplierModal trigger**

Remove: the `url` state, `fetchState` state, `pasteContent` state, `requiresPaste` function, `PASTE_ONLY_DOMAINS`, `handleFetch`, `handleParse`, and all the URL/paste/status JSX (lines ~186-253 in current file).

Replace with: a `showParseModal` state, a button "Parse from supplier" above the divider, and the `ParseSupplierModal` rendered conditionally. When the modal calls `onResult`, run the existing `applyResult` logic and close the modal.

The form fields, flavor input, and save logic remain unchanged.

Keep the `sourceUrl` state — set it from the URL when fetched via ParseSupplierModal (pass the URL via a ref or track it in the result).

- [ ] **Step 2: Verify TypeScript compiles and tests pass**

Run: `cd client && npx tsc --noEmit && npm test`

- [ ] **Step 3: Commit**

```bash
git -C /Users/jakemosher/Workspace/coffee-roast-tracker add client/src/components/AddBeanModal.tsx
git -C /Users/jakemosher/Workspace/coffee-roast-tracker commit -m "refactor: use ParseSupplierModal in AddBeanModal"
```

---

### Task 6: Add diff preview modal for BeanDetailPage

When opened from Bean Detail, the ParseSupplierModal returns a result, then we show a diff/merge UI: for each field where old !== new, show a checkbox row with current value → new value. All checked by default. User unchecks fields they don't want to overwrite, then clicks "Apply Selected".

**Files:**
- Create: `client/src/components/ParseDiffModal.tsx`
- Create: `client/src/components/ParseDiffModal.module.css`
- Modify: `client/src/pages/BeanDetailPage.tsx`

- [ ] **Step 1: Create ParseDiffModal**

This component receives the current bean data and the parsed result, shows a diff table with checkboxes, and calls `onApply` with only the selected fields.

```tsx
// client/src/components/ParseDiffModal.tsx
import { useState } from "react";
import { Modal } from "./Modal";
import styles from "./ParseDiffModal.module.css";
import type { ParseResult } from "./ParseSupplierModal";

interface DiffField {
  key: string;
  label: string;
  current: string;
  parsed: string;
}

interface ParseDiffModalProps {
  current: {
    name: string;
    origin: string | null;
    process: string | null;
    elevation: string | null;
    variety: string | null;
    bagNotes: string | null;
    score: number | null;
    cropYear: number | null;
    suggestedFlavors: readonly string[];
  };
  parsed: ParseResult;
  onApply: (fields: Partial<ParseResult>) => void;
  onClose: () => void;
}

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  origin: "Origin",
  process: "Process",
  elevation: "Elevation",
  variety: "Variety",
  bagNotes: "Supplier Notes",
  score: "Score",
  cropYear: "Crop Year",
  suggestedFlavors: "Suggested Flavors",
};

function formatValue(val: unknown): string {
  if (val == null) return "—";
  if (Array.isArray(val)) return val.length > 0 ? val.join(", ") : "—";
  return String(val);
}

export function ParseDiffModal({ current, parsed, onApply, onClose }: ParseDiffModalProps) {
  // Build diff rows for fields that changed
  const diffs: DiffField[] = [];
  for (const key of Object.keys(FIELD_LABELS)) {
    const curVal = formatValue(current[key as keyof typeof current]);
    const newVal = formatValue(parsed[key as keyof ParseResult]);
    if (newVal !== "—" && curVal !== newVal) {
      diffs.push({ key, label: FIELD_LABELS[key], current: curVal, parsed: newVal });
    }
  }

  const [selected, setSelected] = useState<Set<string>>(() => new Set(diffs.map((d) => d.key)));

  function toggleField(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleApply() {
    const fields: Record<string, unknown> = {};
    for (const key of selected) {
      fields[key] = parsed[key as keyof ParseResult];
    }
    onApply(fields as Partial<ParseResult>);
  }

  if (diffs.length === 0) {
    return (
      <Modal title="No Changes Found" onClose={onClose}>
        <p>The parsed data matches the current bean details. Nothing to update.</p>
      </Modal>
    );
  }

  const footer = (
    <>
      <button type="button" className={styles.btnSecondary} onClick={onClose}>Cancel</button>
      <button type="button" className={styles.btnPrimary} onClick={handleApply} disabled={selected.size === 0}>
        Apply {selected.size} field{selected.size !== 1 ? "s" : ""}
      </button>
    </>
  );

  return (
    <Modal title="Review Parsed Changes" onClose={onClose} footer={footer}>
      <div className={styles.table}>
        <div className={styles.headerRow}>
          <span />
          <span>Field</span>
          <span>Current</span>
          <span>New</span>
        </div>
        {diffs.map((d) => (
          <label key={d.key} className={styles.diffRow}>
            <input
              type="checkbox"
              checked={selected.has(d.key)}
              onChange={() => toggleField(d.key)}
            />
            <span className={styles.fieldLabel}>{d.label}</span>
            <span className={styles.currentVal}>{d.current}</span>
            <span className={styles.newVal}>{d.parsed}</span>
          </label>
        ))}
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Create ParseDiffModal CSS**

```css
/* client/src/components/ParseDiffModal.module.css */
.table { display: flex; flex-direction: column; gap: 2px; }
.headerRow { display: grid; grid-template-columns: 24px 100px 1fr 1fr; gap: var(--space-2); padding: var(--space-2) 0; font-size: var(--text-xs); font-weight: var(--weight-medium); color: var(--color-text-secondary); border-bottom: 1px solid var(--color-border); }
.diffRow { display: grid; grid-template-columns: 24px 100px 1fr 1fr; gap: var(--space-2); padding: var(--space-2) 0; font-size: var(--text-sm); align-items: start; cursor: pointer; border-bottom: 1px solid var(--color-bg-muted); }
.diffRow:hover { background: rgba(90, 114, 71, 0.03); }
.fieldLabel { font-weight: var(--weight-medium); font-size: var(--text-xs); color: var(--color-text-secondary); }
.currentVal { color: var(--color-text-muted); }
.newVal { color: var(--color-action); font-weight: var(--weight-medium); }
.btnSecondary { padding: 8px 18px; border-radius: var(--radius-md); font-size: var(--text-sm); font-weight: var(--weight-medium); cursor: pointer; border: 1px solid var(--color-border); background: none; color: var(--color-text-secondary); }
.btnPrimary { padding: 8px 18px; border-radius: var(--radius-md); font-size: var(--text-sm); font-weight: var(--weight-medium); cursor: pointer; border: none; background: var(--color-action); color: #faf7f2; }
.btnPrimary:disabled { opacity: 0.5; cursor: not-allowed; }
```

- [ ] **Step 3: Wire into BeanDetailPage**

Add a "Re-parse from supplier" button next to the Edit button in the header. Clicking it opens ParseSupplierModal (with bean.sourceUrl as initialUrl). When ParseSupplierModal returns a result, open ParseDiffModal showing the diff against current bean. When the user clicks Apply, call `updateBean` and `updateBeanSuggestedFlavors` with the selected fields.

Add to BeanDetailPage state:
```ts
const [showParseModal, setShowParseModal] = useState(false);
const [parseResult, setParseResult] = useState<ParseResult | null>(null);
```

Add handler:
```ts
function handleParseResult(result: ParseResult) {
  setShowParseModal(false);
  setParseResult(result);
}

function handleApplyParsed(fields: Partial<ParseResult>) {
  if (!bean) return;
  const { suggestedFlavors: newFlavors, ...beanFields } = fields;
  // Filter out null/undefined values
  const cleanFields = Object.fromEntries(
    Object.entries(beanFields).filter(([, v]) => v != null),
  );
  if (Object.keys(cleanFields).length > 0) {
    updateBean({ variables: { id: bean.id, input: cleanFields } });
  }
  if (newFlavors) {
    updateSuggestedFlavors({
      variables: { beanId: bean.id, suggestedFlavors: [...newFlavors] },
      refetchQueries: [{ query: MY_BEANS_QUERY }],
    });
  }
  setParseResult(null);
}
```

Add button in JSX (next to Edit):
```tsx
<button type="button" className={styles.reparseBtn} onClick={() => setShowParseModal(true)}>
  Re-parse from supplier
</button>
```

Add modals at the end of the component:
```tsx
{showParseModal && (
  <ParseSupplierModal
    onClose={() => setShowParseModal(false)}
    onResult={handleParseResult}
    initialUrl={bean.sourceUrl ?? undefined}
  />
)}
{parseResult && (
  <ParseDiffModal
    current={bean}
    parsed={parseResult}
    onApply={handleApplyParsed}
    onClose={() => setParseResult(null)}
  />
)}
```

- [ ] **Step 4: Verify TypeScript compiles and all tests pass**

Run: `cd client && npx tsc --noEmit && npm test`
Run: `cd server && npm test`

- [ ] **Step 5: Commit**

```bash
git -C /Users/jakemosher/Workspace/coffee-roast-tracker add client/src/components/ParseDiffModal.tsx client/src/components/ParseDiffModal.module.css client/src/pages/BeanDetailPage.tsx
git -C /Users/jakemosher/Workspace/coffee-roast-tracker commit -m "feat: add re-parse from supplier with diff preview on bean detail"
```

---

### Task 7: Tests for ParseSupplierModal and ParseDiffModal

**Files:**
- Create: `client/src/components/__tests__/ParseSupplierModal.test.tsx`
- Create: `client/src/components/__tests__/ParseDiffModal.test.tsx`

- [ ] **Step 1: Write ParseSupplierModal tests**

Test that both URL input and paste textarea are visible by default, Fetch button disabled when empty, Parse button disabled when empty.

- [ ] **Step 2: Write ParseDiffModal tests**

Test: renders diff rows for changed fields, all checked by default, unchecking a field excludes it from apply, "No Changes Found" shown when nothing differs, Apply button shows count.

- [ ] **Step 3: Run tests to verify pass**

Run: `cd client && npm test`

- [ ] **Step 4: Commit**

```bash
git -C /Users/jakemosher/Workspace/coffee-roast-tracker add client/src/components/__tests__/ParseSupplierModal.test.tsx client/src/components/__tests__/ParseDiffModal.test.tsx
git -C /Users/jakemosher/Workspace/coffee-roast-tracker commit -m "test: add tests for ParseSupplierModal and ParseDiffModal"
```

---

### Task 8: Update AddBeanModal tests and run full suite

**Files:**
- Modify: `client/src/components/__tests__/AddBeanModal.test.tsx`

- [ ] **Step 1: Update tests for new AddBeanModal structure**

The AddBeanModal no longer has inline URL/paste UI — it has a "Parse from supplier" button that opens ParseSupplierModal. Update the test that checks for the URL input placeholder and Fetch button. The form fields, save button, and flavor tests should still work.

- [ ] **Step 2: Run full test suite**

Run: `cd /Users/jakemosher/Workspace/coffee-roast-tracker && npm test` (runs both server and client)
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git -C /Users/jakemosher/Workspace/coffee-roast-tracker add client/src/components/__tests__/AddBeanModal.test.tsx
git -C /Users/jakemosher/Workspace/coffee-roast-tracker commit -m "test: update AddBeanModal tests for ParseSupplierModal integration"
```
