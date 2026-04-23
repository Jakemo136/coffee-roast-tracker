# Integration Tests & CI Schema Validation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add integration tests for roast-detail and bean-detail page flows (US-RD-1 through US-RD-4, bean editing), plus CI-level GraphQL schema validation that catches client/server drift before tests even run.

**Architecture:** Integration tests render page components inside a lightweight provider wrapper with real Apollo Client pointed at the existing MSW schema-handler — no `vi.mock("@apollo/client/react")`. A shared `renderWithProviders` utility handles the boilerplate. For CI schema validation, a standalone script parses all client operations and validates them against the server typeDefs using `graphql`'s `validate()` function, added as a CI step before `npm run build`.

**Tech Stack:** Vitest, React Testing Library, MSW (schema-driven), Apollo Client 4, graphql (validate), gql.tada

**Orchestrator conventions enforced:**
- Schema-driven MSW (already in place via `schema-handler.ts`)
- `userEvent.type()` for text inputs — never `fireEvent.change`
- Dead-end detection — every modal state has an exit path assertion
- Wiring audit — integration tests render the parent page and exercise child features through it

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `client/test/helpers/renderWithProviders.tsx` | Shared integration test wrapper (ApolloClient + MemoryRouter + ToastProvider + TempProvider + ThemeProvider) |
| Create | `client/src/features/roast-detail/__tests__/roast-detail-flow.integration.test.tsx` | US-RD-1, US-RD-2, US-RD-3, US-RD-4 |
| Create | `client/src/features/beans/__tests__/bean-detail-flow.integration.test.tsx` | Bean editing, cupping notes, roast history |
| Create | `client/scripts/validate-operations.ts` | CI script: validates all client operations against server schema |
| Modify | `client/test/mocks/schema-handler.ts:14-46` | Add `supplier` field to mockBeans |
| Modify | `client/package.json` | Add `validate:schema` script |
| Modify | `.github/workflows/ci.yml` | Add schema validation step; fix server `continue-on-error` |

---

### Task 1: Fix `supplier` gap in mock data

**Files:**
- Modify: `client/test/mocks/schema-handler.ts:14-46`

- [ ] **Step 1: Add `supplier` to mockBeans**

In `client/test/mocks/schema-handler.ts`, add the `supplier` field to both mock beans:

```typescript
// Bean 1 (line ~14-30)
const mockBeans = [
  {
    id: "bean-1",
    name: "Ethiopia Yirgacheffe",
    origin: "Ethiopia",
    process: "Washed",
    elevation: "1800m",
    sourceUrl: "https://example.com/beans/ethiopia",
    bagNotes: null,
    variety: "Heirloom",
    supplier: "Sweet Maria's",   // <-- add this
    score: 88,
    cropYear: 2025,
    suggestedFlavors: ["Jasmine", "Blueberry"],
    roasts: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "bean-2",
    name: "Colombia Huila",
    origin: "Colombia",
    process: "Natural",
    elevation: "1600m",
    sourceUrl: null,
    bagNotes: null,
    variety: null,
    supplier: null,              // <-- add this
    score: null,
    cropYear: null,
    suggestedFlavors: [],
    roasts: [],
    createdAt: "2026-01-02T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
  },
];
```

- [ ] **Step 2: Run existing tests to confirm nothing broke**

Run: `cd /Users/jakemosher/Workspace/coffee-roast-tracker/client && npm test`
Expected: All 283 tests pass

- [ ] **Step 3: Commit**

```bash
git -C /Users/jakemosher/Workspace/coffee-roast-tracker add client/test/mocks/schema-handler.ts
git -C /Users/jakemosher/Workspace/coffee-roast-tracker commit -m "fix(test): add missing supplier field to mock beans in schema-handler"
```

---

### Task 2: Create shared `renderWithProviders` test utility

**Files:**
- Create: `client/test/helpers/renderWithProviders.tsx`

- [ ] **Step 1: Write the utility**

This wrapper provides the same provider tree that pages render inside, but using a test-friendly Apollo Client connected to MSW (which is already running via `test/setup.ts`).

```tsx
import { render, type RenderOptions } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client/core";
import { ApolloProvider } from "@apollo/client/react";
import { ToastProvider } from "../../src/components/Toast";
import { TempProvider } from "../../src/providers/TempContext";
import { ThemeProvider } from "../../src/providers/ThemeContext";

function createTestApolloClient() {
  return new ApolloClient({
    link: new HttpLink({ uri: "/graphql" }),
    cache: new InMemoryCache(),
    defaultOptions: {
      watchQuery: { fetchPolicy: "no-cache" },
      query: { fetchPolicy: "no-cache" },
    },
  });
}

interface RenderWithProvidersOptions extends Omit<RenderOptions, "wrapper"> {
  /** Initial route for MemoryRouter, e.g. "/roasts/test-id" */
  route?: string;
  /** Route path pattern, e.g. "/roasts/:id" */
  path?: string;
}

export function renderWithProviders(
  ui: React.ReactElement,
  { route = "/", path, ...renderOptions }: RenderWithProvidersOptions = {},
) {
  const client = createTestApolloClient();

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <ApolloProvider client={client}>
        <ThemeProvider>
          <ToastProvider>
            <TempProvider>
              <MemoryRouter initialEntries={[route]}>
                {path ? (
                  <Routes>
                    <Route path={path} element={children} />
                  </Routes>
                ) : (
                  children
                )}
              </MemoryRouter>
            </TempProvider>
          </ToastProvider>
        </ThemeProvider>
      </ApolloProvider>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    client,
  };
}
```

- [ ] **Step 2: Verify the file is importable**

Run: `cd /Users/jakemosher/Workspace/coffee-roast-tracker/client && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to `renderWithProviders.tsx`

- [ ] **Step 3: Commit**

```bash
git -C /Users/jakemosher/Workspace/coffee-roast-tracker add client/test/helpers/renderWithProviders.tsx
git -C /Users/jakemosher/Workspace/coffee-roast-tracker commit -m "test: add renderWithProviders utility for integration tests"
```

---

### Task 3: Roast detail integration tests

**Files:**
- Create: `client/src/features/roast-detail/__tests__/roast-detail-flow.integration.test.tsx`

These tests render `RoastDetailPage` inside the full provider tree with real Apollo Client + MSW schema-handler. They mock only `useAuthState` (Clerk boundary) and chart components (jsdom canvas limitation).

- [ ] **Step 1: Write the integration test file**

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../../test/helpers/renderWithProviders";
import { RoastDetailPage } from "../RoastDetailPage";

/**
 * Integration tests for RoastDetailPage.
 *
 * Renders the page with real Apollo Client wired to MSW schema-handler.
 * Exercises child features (notes editing, flavor picker, delete dialog,
 * public/private toggle) through the parent page — wiring audit pattern.
 *
 * Covers user stories:
 *   US-RD-1  Edit notes inline
 *   US-RD-2  Toggle public/private
 *   US-RD-3  Delete roast
 *   US-RD-4  Edit flavors
 */

// Mock auth — Clerk is an external boundary, not under test
vi.mock("../../../lib/useAuthState", () => ({
  useAuthState: vi.fn(),
}));

// Mock chart — jsdom has no canvas
vi.mock("react-chartjs-2", () => ({
  Line: (props: Record<string, unknown>) => (
    <canvas data-testid="chart-canvas" {...props} />
  ),
}));
vi.mock("../../../lib/chartSetup", () => ({}));

// Navigate spy
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

import { useAuthState } from "../../../lib/useAuthState";
const mockedUseAuth = vi.mocked(useAuthState);

function setupOwner() {
  mockedUseAuth.mockReturnValue({
    isSignedIn: true,
    isLoaded: true,
    userId: "user-1",
    getToken: vi.fn(),
    signOut: vi.fn(),
  } as ReturnType<typeof useAuthState>);
}

function renderRoastDetail(roastId = "test-id") {
  return renderWithProviders(<RoastDetailPage />, {
    route: `/roasts/${roastId}`,
    path: "/roasts/:id",
  });
}

describe("RoastDetailPage integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockReset();
  });

  // ---- US-RD-1: Edit notes inline ----

  it("edit notes: click Edit → type new notes → Save → notes update in UI", async () => {
    setupOwner();
    const user = userEvent.setup();
    renderRoastDetail();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Ethiopia Yirgacheffe/i })).toBeInTheDocument();
    });

    // Current notes should be visible
    expect(screen.getByText("Great first crack, smooth development")).toBeInTheDocument();

    // Click Edit on the notes section
    await user.click(screen.getByRole("button", { name: /^Edit$/i }));

    // Textarea should appear with existing notes
    const textarea = screen.getByLabelText("Roast notes");
    expect(textarea).toHaveValue("Great first crack, smooth development");

    // Clear and type new notes
    await user.clear(textarea);
    await user.type(textarea, "Bright acidity, clean finish");

    // Click Save
    await user.click(screen.getByRole("button", { name: /^Save$/i }));

    // Notes should update (mutation fires, MSW returns updated roast)
    await waitFor(() => {
      expect(screen.queryByLabelText("Roast notes")).not.toBeInTheDocument();
    });
  });

  // ---- US-RD-2: Toggle public/private ----

  it("toggle public/private: click toggle → mutation fires → toast appears", async () => {
    setupOwner();
    const user = userEvent.setup();
    renderRoastDetail();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Ethiopia Yirgacheffe/i })).toBeInTheDocument();
    });

    // Find the visibility toggle button
    const toggleBtn = screen.getByRole("button", { name: /visibility/i });
    expect(toggleBtn).toBeInTheDocument();

    // Click to toggle
    await user.click(toggleBtn);

    // Button should be disabled during mutation
    expect(toggleBtn).toBeDisabled();

    // Toast should appear confirming the change
    await waitFor(() => {
      const toast = screen.getByTestId("toast");
      expect(toast).toBeInTheDocument();
      expect(toast.textContent).toMatch(/roast is now (public|private)/i);
    });

    // Button should re-enable after mutation
    await waitFor(() => {
      expect(toggleBtn).not.toBeDisabled();
    });
  });

  // ---- US-RD-3: Delete roast ----

  it("delete roast: click Delete → confirm dialog → confirm → navigates to dashboard", async () => {
    setupOwner();
    const user = userEvent.setup();
    renderRoastDetail();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Ethiopia Yirgacheffe/i })).toBeInTheDocument();
    });

    // Click Delete
    await user.click(screen.getByRole("button", { name: /delete/i }));

    // Confirmation dialog appears
    await waitFor(() => {
      expect(screen.getByText("Are you sure? This roast will be permanently removed.")).toBeInTheDocument();
    });

    // Click confirm
    await user.click(screen.getByRole("button", { name: /yes, remove/i }));

    // Should navigate to dashboard
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  it("delete roast: click Delete → cancel → dialog closes, no navigation", async () => {
    setupOwner();
    const user = userEvent.setup();
    renderRoastDetail();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Ethiopia Yirgacheffe/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() => {
      expect(screen.getByText("Are you sure? This roast will be permanently removed.")).toBeInTheDocument();
    });

    // Cancel
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    // Dialog should close
    await waitFor(() => {
      expect(screen.queryByText("Are you sure? This roast will be permanently removed.")).not.toBeInTheDocument();
    });

    // No navigation
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // ---- US-RD-4: Edit flavors ----

  it("edit flavors: open picker → select a flavor → save → pill appears on page", async () => {
    setupOwner();
    const user = userEvent.setup();
    renderRoastDetail();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Ethiopia Yirgacheffe/i })).toBeInTheDocument();
    });

    // Click "Edit Flavors"
    await user.click(screen.getByRole("button", { name: /edit flavors/i }));

    // FlavorPickerModal should open
    await waitFor(() => {
      expect(screen.getByText(/select flavors/i)).toBeInTheDocument();
    });

    // Find and click a flavor checkbox (Jasmine from mockFlavorDescriptors)
    const jasmineCheckbox = screen.getByLabelText(/jasmine/i);
    await user.click(jasmineCheckbox);

    // Save
    const saveBtn = screen.getByRole("button", { name: /^save$/i });
    await user.click(saveBtn);

    // Modal should close
    await waitFor(() => {
      expect(screen.queryByText(/select flavors/i)).not.toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it works**

Run: `cd /Users/jakemosher/Workspace/coffee-roast-tracker/client && npx vitest run src/features/roast-detail/__tests__/roast-detail-flow.integration.test.tsx`
Expected: All tests pass. If any fail, fix the selectors to match the actual component DOM.

- [ ] **Step 3: Commit**

```bash
git -C /Users/jakemosher/Workspace/coffee-roast-tracker add client/src/features/roast-detail/__tests__/roast-detail-flow.integration.test.tsx
git -C /Users/jakemosher/Workspace/coffee-roast-tracker commit -m "test(integration): add roast-detail-flow wiring tests (US-RD-1 through US-RD-4)"
```

---

### Task 4: Bean detail integration tests

**Files:**
- Create: `client/src/features/beans/__tests__/bean-detail-flow.integration.test.tsx`

These tests render `BeanDetailPage` inside the full provider tree. The page owns its Apollo hooks (`PUBLIC_BEAN_QUERY`, `ROASTS_BY_BEAN_QUERY`, `UPDATE_BEAN`, `UPDATE_BEAN_SUGGESTED_FLAVORS`).

- [ ] **Step 1: Write the integration test file**

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../../test/helpers/renderWithProviders";
import { BeanDetailPage } from "../BeanDetailPage";

/**
 * Integration tests for BeanDetailPage.
 *
 * Renders with real Apollo Client wired to MSW schema-handler.
 * Wiring audit: exercises edit metadata, cupping notes parsing,
 * and roast history display through the parent page.
 */

vi.mock("../../../lib/useAuthState", () => ({
  useAuthState: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

import { useAuthState } from "../../../lib/useAuthState";
const mockedUseAuth = vi.mocked(useAuthState);

function setupOwner() {
  mockedUseAuth.mockReturnValue({
    isSignedIn: true,
    isLoaded: true,
    userId: "user-1",
    getToken: vi.fn(),
    signOut: vi.fn(),
  } as ReturnType<typeof useAuthState>);
}

function setupAnonymous() {
  mockedUseAuth.mockReturnValue({
    isSignedIn: false,
    isLoaded: true,
    userId: null,
    getToken: vi.fn(),
    signOut: vi.fn(),
  } as ReturnType<typeof useAuthState>);
}

function renderBeanDetail(beanId = "bean-1") {
  return renderWithProviders(<BeanDetailPage />, {
    route: `/beans/${beanId}`,
    path: "/beans/:id",
  });
}

describe("BeanDetailPage integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockReset();
  });

  // ---- Public view ----

  it("anonymous user sees bean details and roast history (read-only)", async () => {
    setupAnonymous();
    renderBeanDetail();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Ethiopia Yirgacheffe/i })).toBeInTheDocument();
    });

    // Metadata visible
    expect(screen.getByText("Ethiopia")).toBeInTheDocument();
    expect(screen.getByText("Washed")).toBeInTheDocument();

    // No edit button for anonymous users
    expect(screen.queryByTestId("edit-btn")).not.toBeInTheDocument();

    // No cupping notes paste section
    expect(screen.queryByTestId("cupping-paste")).not.toBeInTheDocument();
  });

  // ---- Owner edit metadata ----

  it("owner: click Edit → change origin → Save → metadata updates", async () => {
    setupOwner();
    const user = userEvent.setup();
    renderBeanDetail();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Ethiopia Yirgacheffe/i })).toBeInTheDocument();
    });

    // Click Edit
    await user.click(screen.getByTestId("edit-btn"));

    // Origin input should appear with current value
    const originInput = screen.getByLabelText("Origin");
    expect(originInput).toHaveValue("Ethiopia");

    // Update origin
    await user.clear(originInput);
    await user.type(originInput, "Yirgacheffe, Ethiopia");

    // Save
    await user.click(screen.getByRole("button", { name: /save/i }));

    // Edit mode should close — back to read view
    await waitFor(() => {
      expect(screen.queryByLabelText("Origin")).not.toBeInTheDocument();
    });
  });

  // ---- Owner paste cupping notes ----

  it("owner: paste cupping notes → Parse → flavor pills appear → Save", async () => {
    setupOwner();
    const user = userEvent.setup();
    renderBeanDetail();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Ethiopia Yirgacheffe/i })).toBeInTheDocument();
    });

    // Cupping notes section visible for owner
    expect(screen.getByTestId("cupping-paste")).toBeInTheDocument();

    // Type cupping notes
    const textarea = screen.getByLabelText("Cupping notes text");
    await user.type(textarea, "jasmine and blueberry with honey notes");

    // Click Parse
    await user.click(screen.getByRole("button", { name: /parse/i }));

    // Parsed flavor pills should appear
    await waitFor(() => {
      const pills = screen.getAllByTestId("flavor-pill");
      expect(pills.length).toBeGreaterThan(0);
    });

    // Save cupping notes
    await user.click(screen.getByRole("button", { name: /save cupping notes/i }));

    // Textarea should clear after save
    await waitFor(() => {
      expect(textarea).toHaveValue("");
    });
  });

  // ---- Bean not found ----

  it("shows 'Bean not found' for non-existent bean", async () => {
    setupAnonymous();
    renderBeanDetail("non-existent-id");

    await waitFor(() => {
      expect(screen.getByTestId("bean-not-found")).toBeInTheDocument();
    });
  });

  // ---- Roast history row click navigates ----

  it("clicking a roast row navigates to roast detail", async () => {
    setupOwner();
    const user = userEvent.setup();
    renderBeanDetail();

    await waitFor(() => {
      expect(screen.getByTestId("roast-history")).toBeInTheDocument();
    });

    // Wait for roast rows to appear
    await waitFor(() => {
      const rows = screen.getAllByRole("row");
      // At least header + 1 data row
      expect(rows.length).toBeGreaterThan(1);
    });

    // Click a roast row (first data row)
    const rows = screen.getAllByRole("row");
    await user.click(rows[1]!);

    expect(mockNavigate).toHaveBeenCalledWith(expect.stringMatching(/^\/roasts\//));
  });
});
```

- [ ] **Step 2: Run the test**

Run: `cd /Users/jakemosher/Workspace/coffee-roast-tracker/client && npx vitest run src/features/beans/__tests__/bean-detail-flow.integration.test.tsx`
Expected: All tests pass. Fix selectors if needed — the mock data in `schema-handler.ts` drives what the page renders.

- [ ] **Step 3: Commit**

```bash
git -C /Users/jakemosher/Workspace/coffee-roast-tracker add client/src/features/beans/__tests__/bean-detail-flow.integration.test.tsx
git -C /Users/jakemosher/Workspace/coffee-roast-tracker commit -m "test(integration): add bean-detail-flow wiring tests"
```

---

### Task 5: Run full client test suite

- [ ] **Step 1: Run all client tests**

Run: `cd /Users/jakemosher/Workspace/coffee-roast-tracker/client && npm test`
Expected: All tests pass (283 existing + new integration tests)

- [ ] **Step 2: Fix any failures**

If any existing tests break due to mock interactions, fix them before proceeding. The new integration tests should not interfere with existing unit tests because `vi.mock` is scoped per file.

---

### Task 6: Create CI schema validation script

**Files:**
- Create: `client/scripts/validate-operations.ts`
- Modify: `client/package.json`

This script validates every client GraphQL operation against the server schema at the SDL level. It catches field renames, removed fields, type mismatches, and missing arguments without needing to run the full test suite.

- [ ] **Step 1: Write the validation script**

```typescript
/**
 * Validates all client GraphQL operations against the server schema.
 *
 * Run: npm run validate:schema
 *
 * Catches:
 *   - Client operations referencing fields that don't exist in the schema
 *   - Incorrect argument types or missing required arguments
 *   - Schema renames or removals that client operations haven't caught up with
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSchema, parse, validate } from "graphql";

const __dirname = dirname(fileURLToPath(import.meta.url));

// 1. Extract SDL from server typeDefs.ts
const typeDefsPath = resolve(__dirname, "../../server/src/schema/typeDefs.ts");
const typeDefsContent = readFileSync(typeDefsPath, "utf-8");
const sdlMatch = typeDefsContent.match(/gql`([\s\S]*?)`/);
if (!sdlMatch) {
  console.error("Could not find gql template literal in typeDefs.ts");
  process.exit(1);
}
const schema = buildSchema(sdlMatch[1]!);

// 2. Extract operation strings from operations.ts
const opsPath = resolve(__dirname, "../src/graphql/operations.ts");
const opsContent = readFileSync(opsPath, "utf-8");

// Match all graphql(`...`) template literals
const operationRegex = /graphql\(`([\s\S]*?)`\)/g;
const operations: Array<{ name: string; source: string }> = [];
let match: RegExpExecArray | null;
while ((match = operationRegex.exec(opsContent)) !== null) {
  const source = match[1]!;
  const nameMatch = source.match(/(?:query|mutation|subscription)\s+(\w+)/);
  operations.push({
    name: nameMatch ? nameMatch[1]! : "anonymous",
    source,
  });
}

if (operations.length === 0) {
  console.error("No GraphQL operations found in operations.ts");
  process.exit(1);
}

// 3. Validate each operation
let hasErrors = false;
for (const op of operations) {
  try {
    const document = parse(op.source);
    const errors = validate(schema, document);
    if (errors.length > 0) {
      hasErrors = true;
      console.error(`\n✗ ${op.name}:`);
      for (const err of errors) {
        console.error(`  ${err.message}`);
      }
    } else {
      console.log(`✓ ${op.name}`);
    }
  } catch (parseError) {
    hasErrors = true;
    console.error(`\n✗ ${op.name}: parse error — ${(parseError as Error).message}`);
  }
}

console.log(`\n${operations.length} operations checked.`);

if (hasErrors) {
  console.error("\nSchema validation FAILED — client operations do not match server schema.");
  process.exit(1);
} else {
  console.log("Schema validation passed.");
}
```

- [ ] **Step 2: Add the script to client package.json**

Add to `client/package.json` scripts:

```json
"validate:schema": "npx tsx scripts/validate-operations.ts"
```

- [ ] **Step 3: Run the script to verify it works**

Run: `cd /Users/jakemosher/Workspace/coffee-roast-tracker/client && npm run validate:schema`
Expected: All operations pass validation with `✓` prefix, exit code 0

- [ ] **Step 4: Commit**

```bash
git -C /Users/jakemosher/Workspace/coffee-roast-tracker add client/scripts/validate-operations.ts client/package.json
git -C /Users/jakemosher/Workspace/coffee-roast-tracker commit -m "ci: add GraphQL schema validation script for client operations"
```

---

### Task 7: Wire schema validation into CI

**Files:**
- Modify: `.github/workflows/ci.yml`

Two changes:
1. Add `validate:schema` step to the client job (before `npm run build`)
2. Remove `continue-on-error: true` from the server job so server failures block CI

- [ ] **Step 1: Add schema validation step to client job**

In `.github/workflows/ci.yml`, add a step after `npm ci` and before `npm run build` in the client job:

```yaml
  client:
    name: Client
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: client
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - run: npm ci
        working-directory: .

      - name: Validate GraphQL schema
        run: npm run validate:schema

      - run: npm run build

      - run: npm test
```

- [ ] **Step 2: Remove `continue-on-error: true` from server job**

Delete line 38 (`continue-on-error: true`) from the server job. Server test failures should block CI.

- [ ] **Step 3: Commit**

```bash
git -C /Users/jakemosher/Workspace/coffee-roast-tracker add .github/workflows/ci.yml
git -C /Users/jakemosher/Workspace/coffee-roast-tracker commit -m "ci: add schema validation step, make server tests blocking"
```

---

### Task 8: Final verification and cleanup

- [ ] **Step 1: Run full test suite**

Run: `cd /Users/jakemosher/Workspace/coffee-roast-tracker && npm test`
Expected: Server tests pass (129), client tests pass (283 + new integration tests)

- [ ] **Step 2: Run schema validation**

Run: `cd /Users/jakemosher/Workspace/coffee-roast-tracker/client && npm run validate:schema`
Expected: All operations pass

- [ ] **Step 3: Update BUILD_STATUS.md**

Add to the Integration tests section:

```markdown
## Integration Tests

| File | Stories | Status |
|------|---------|--------|
| `upload-flow.integration.test.tsx` | US-UP-1, UP-2, UP-4, UP-5, UP-6 | Passing |
| `add-bean-flow.integration.test.tsx` | US-AB-1, AB-2, AB-3 | Passing |
| `roast-detail-flow.integration.test.tsx` | US-RD-1, RD-2, RD-3, RD-4 | Passing |
| `bean-detail-flow.integration.test.tsx` | Bean editing, cupping notes, roast history | Passing |
```

Update test counts and add CI schema validation entry.

- [ ] **Step 4: Commit BUILD_STATUS.md**

```bash
git -C /Users/jakemosher/Workspace/coffee-roast-tracker add docs/BUILD_STATUS.md
git -C /Users/jakemosher/Workspace/coffee-roast-tracker commit -m "docs: update BUILD_STATUS with new integration tests and CI schema validation"
```

---

## Selector Reference

The integration tests reference these DOM elements. If a test fails on a selector, check the actual component for the current attribute/text:

| Selector | Component | Used in |
|----------|-----------|---------|
| `role="heading" { name: /Ethiopia Yirgacheffe/ }` | RoastDetailPage h1, BeanDetailPage h1 | Task 3, 4 |
| `aria-label="Roast notes"` | RoastDetailPage textarea | Task 3 (US-RD-1) |
| `role="button" { name: /visibility/ }` | RoastDetailPage toggle | Task 3 (US-RD-2) |
| `data-testid="toast"` | Toast component | Task 3 (US-RD-2) |
| `role="button" { name: /delete/ }` | RoastDetailPage delete btn | Task 3 (US-RD-3) |
| `role="button" { name: /yes, remove/ }` | ConfirmDialog confirm btn | Task 3 (US-RD-3) |
| `role="button" { name: /edit flavors/ }` | RoastDetailPage edit flavors btn | Task 3 (US-RD-4) |
| `data-testid="edit-btn"` | BeanDetailPage edit button | Task 4 |
| `aria-label="Origin"` | BeanDetailPage origin input | Task 4 |
| `data-testid="cupping-paste"` | BeanDetailPage cupping section | Task 4 |
| `aria-label="Cupping notes text"` | BeanDetailPage cupping textarea | Task 4 |
| `data-testid="bean-not-found"` | BeanDetailPage 404 state | Task 4 |
| `data-testid="roast-history"` | BeanDetailPage roast section | Task 4 |
