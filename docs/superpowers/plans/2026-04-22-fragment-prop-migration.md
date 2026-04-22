# Fragment-Derived Props Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace manually declared prop interfaces with colocated GraphQL fragments and Apollo `useFragment`, eliminating data mapping layers across all parent pages.

**Architecture:** Each data-display component defines a fragment on its GraphQL type, exports `FragmentOf<typeof FRAG>` as its data type, and reads from the Apollo cache via `useFragment`. Parents spread fragments in queries and pass cache references instead of transformed data objects.

**Tech Stack:** gql.tada (fragments, `FragmentOf`, `readFragment`), Apollo Client 4 (`useFragment` from `@apollo/client/react`), Vitest + React Testing Library + `MockedProvider`

**Spec ref:** `docs/superpowers/specs/2026-04-22-fragment-prop-migration-design.md`

---

### Task 1: Test infrastructure — shared cache helpers

**Files:**
- Create: `client/test/helpers/cacheHelpers.tsx`
- Modify: `client/src/graphql/graphql.ts` — add `readFragment` export

**Why first:** Every subsequent task's tests depend on this helper.

- [ ] **Step 1: Add `readFragment` export to graphql.ts**

```typescript
// client/src/graphql/graphql.ts — add this line before the type exports
export { readFragment } from "gql.tada";
```

- [ ] **Step 2: Create `client/test/helpers/cacheHelpers.tsx`**

```tsx
import { render } from "@testing-library/react";
import { InMemoryCache } from "@apollo/client/core";
import { MockedProvider } from "@apollo/client/testing";
import { MemoryRouter } from "react-router-dom";
import type { DocumentNode } from "graphql";

interface FragmentWrite {
  fragment: DocumentNode;
  data: Record<string, unknown>;
}

export function renderWithCache(
  ui: React.ReactNode,
  fragments: FragmentWrite[],
  { route = "/" }: { route?: string } = {},
) {
  const cache = new InMemoryCache();
  for (const { fragment, data } of fragments) {
    cache.writeFragment({ fragment, data });
  }
  return render(
    <MemoryRouter initialEntries={[route]}>
      <MockedProvider cache={cache} addTypename={false}>
        {ui}
      </MockedProvider>
    </MemoryRouter>,
  );
}
```

- [ ] **Step 3: Verify the helper compiles**

Run: `cd client && npx tsc --noEmit --skipLibCheck`

Expected: no errors from `test/helpers/cacheHelpers.tsx`

- [ ] **Step 4: Commit**

```bash
git add client/src/graphql/graphql.ts client/test/helpers/cacheHelpers.tsx
git commit -m "chore: add readFragment export and shared cache test helper"
```

---

### Task 2: FlavorPickerModal — `FlavorDescriptor` fragment

**Files:**
- Modify: `client/src/components/FlavorPickerModal.tsx`
- Modify: `client/src/graphql/operations.ts` — spread fragment in `FLAVOR_DESCRIPTORS_QUERY`
- Modify: `client/src/components/__tests__/FlavorPickerModal.test.tsx`

**Spec ref:** "Components In Scope" → FlavorPickerModal

This is the simplest fragment migration — the interface already matches the GraphQL type exactly (no field renaming). Good proof-of-concept before tackling more complex components.

- [ ] **Step 1: Define fragment and replace interface in FlavorPickerModal.tsx**

Replace the manual `interface FlavorDescriptor` with:

```typescript
import { graphql } from "../graphql/graphql";
import type { FragmentOf } from "../graphql/graphql";
import { useFragment } from "@apollo/client/react";

export const FLAVOR_DESCRIPTOR_FIELDS = graphql(`
  fragment FlavorDescriptorFields on FlavorDescriptor @_unmask {
    id
    name
    category
    color
    isOffFlavor
  }
`);

export type FlavorDescriptor = FragmentOf<typeof FLAVOR_DESCRIPTOR_FIELDS>;
```

Note: Using `@_unmask` here because `FlavorPickerModal` receives an array of descriptors as props (not from cache) — `useFragment` per-item in a list that's purely local state doesn't add value. The fragment is for **type derivation only** in this component.

Keep the `FlavorPickerModalProps` interface as-is — it already uses `FlavorDescriptor[]` which now resolves to the fragment type.

- [ ] **Step 2: Update FLAVOR_DESCRIPTORS_QUERY in operations.ts**

Import the fragment and spread it:

```typescript
import { FLAVOR_DESCRIPTOR_FIELDS } from "../components/FlavorPickerModal";

export const FLAVOR_DESCRIPTORS_QUERY = graphql(`
  query FlavorDescriptors($isOffFlavor: Boolean) {
    flavorDescriptors(isOffFlavor: $isOffFlavor) {
      ...FlavorDescriptorFields
      isCustom
    }
  }
`, [FLAVOR_DESCRIPTOR_FIELDS]);
```

Also spread in `PARSE_SUPPLIER_NOTES_QUERY`, `SET_ROAST_FLAVORS`, `SET_ROAST_OFF_FLAVORS`, and `CREATE_FLAVOR_DESCRIPTOR` — any query/mutation that returns `FlavorDescriptor` fields used by components.

- [ ] **Step 3: Update FlavorPickerModal.test.tsx**

Test fixtures should still work since `FlavorDescriptor` type shape is identical. Verify tests pass without changes (the type is the same, just derived differently).

Run: `cd client && npx vitest run src/components/__tests__/FlavorPickerModal.test.tsx`

Expected: all tests pass.

- [ ] **Step 4: Update BeanDetailPage and RoastDetailPage**

Both pages pass `flavorData?.flavorDescriptors ?? []` to FlavorPickerModal. This should still type-check since the query result now includes the fragment spread. Remove any manual type casts if present.

BeanDetailPage also maps `flavorDescriptors` to `{ name, color }` for its local flavor list — this is fine, it's extracting a subset for a different purpose.

- [ ] **Step 5: Run full client test suite**

Run: `cd client && npm test`

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/FlavorPickerModal.tsx client/src/graphql/operations.ts client/src/components/__tests__/FlavorPickerModal.test.tsx
git commit -m "refactor(flavors): derive FlavorDescriptor type from colocated fragment"
```

---

### Task 3: RoastsTable — `RoastRow` fragment + `useFragment` row extraction

**Files:**
- Modify: `client/src/components/RoastsTable.tsx` — fragment, extract `RoastTableRow` subcomponent
- Modify: `client/src/graphql/operations.ts` — spread fragment in roast queries
- Modify: `client/src/features/dashboard/DashboardPage.tsx` — remove mapping, pass refs
- Modify: `client/src/features/beans/BeanDetailPage.tsx` — remove mapping, pass refs
- Modify: `client/src/components/__tests__/RoastsTable.test.tsx` — use cache helpers

**Spec ref:** "Components In Scope" → RoastsTable, "Pattern: useFragment with Lists"

This is the highest-impact change — three parent pages currently duplicate the same field-renaming mapping logic.

- [ ] **Step 1: Define fragment in RoastsTable.tsx**

```typescript
import { graphql } from "../graphql/graphql";
import type { FragmentOf } from "../graphql/graphql";
import { useFragment } from "@apollo/client/react";

export const ROAST_ROW_FIELDS = graphql(`
  fragment RoastRowFields on Roast @_unmask {
    id
    roastDate
    rating
    totalDuration
    firstCrackTemp
    developmentPercent
    bean { id name }
  }
`);

export type RoastRow = FragmentOf<typeof ROAST_ROW_FIELDS>;
```

- [ ] **Step 2: Extract `RoastTableRow` subcomponent**

Move the `<tr>` rendering into a subcomponent that calls `useFragment`:

```tsx
interface RoastTableRowProps {
  roastRef: { __typename: "Roast"; id: string };
  selectable?: boolean;
  isSelected: boolean;
  isDisabled: boolean;
  onToggleSelect: (id: string) => void;
  onRatingChange?: (roastId: string, rating: number) => void;
  onRowClick?: (roastId: string) => void;
  tempUnit: TempUnit;
  hideBeanName?: boolean;
}

function RoastTableRow({ roastRef, ... }: RoastTableRowProps) {
  const { data: roast } = useFragment({
    fragment: ROAST_ROW_FIELDS,
    from: roastRef,
  });
  // render <tr> using roast.bean.name, roast.totalDuration, roast.developmentPercent, etc.
}
```

The parent `RoastsTable` component manages state (search, sort, pagination, selection) and renders `<RoastTableRow>` for each visible row.

**Key field name changes in the row rendering:**
- `roast.beanName` → `roast.bean.name`
- `roast.duration` → `roast.totalDuration`
- `roast.devPercent` → `roast.developmentPercent`

**Sort field type changes:**
- `"duration"` → `"totalDuration"`
- `"devPercent"` → `"developmentPercent"`

Column header display text stays the same ("Time", "DTR%").

**Sort/filter challenge:** `useFragment` in the row means the parent doesn't have direct field access for sorting and filtering. Two options:

**Option A:** Parent receives `RoastRow[]` as props (full data, not just refs). Uses the data for sort/filter/search logic. Passes refs to `RoastTableRow` for rendering. This means the table still receives data as props but the *row* reads from cache.

**Option B:** Parent receives refs only. Reads all fragments from cache in one pass for sort/filter. More complex.

**Choose Option A** — it's pragmatic. The table needs all rows in memory for sort/filter/search/pagination anyway. The per-row `useFragment` still gives granular re-renders on cache updates (e.g., rating change re-renders only that row).

So `RoastsTableProps` becomes:

```typescript
interface RoastsTableProps {
  roasts: RoastRow[];  // full data for sort/filter — also serves as ref source
  // ... same behavioral props
}
```

The table uses `roast.bean.name` for search/filter/sort, and passes `{ __typename: "Roast" as const, id: roast.id }` to `RoastTableRow`.

- [ ] **Step 3: Update sort and filter logic**

Update `SortField` type and `getSortValue` helper:

```typescript
type SortField = "beanName" | "roastDate" | "rating" | "totalDuration" | "firstCrackTemp" | "developmentPercent";

function getSortValue(roast: RoastRow, field: SortField): string | number | null {
  if (field === "beanName") return roast.bean.name;
  return roast[field];
}
```

Update search filter: `r.beanName.toLowerCase()` → `r.bean.name.toLowerCase()`

Update bean filter: `r.beanName === matchingBean.name` → `r.bean.name === matchingBean.name`

Update checkbox aria-label: `` `Select ${roast.beanName}` `` → `` `Select ${roast.bean.name}` ``

- [ ] **Step 4: Spread fragment in operations.ts**

```typescript
import { ROAST_ROW_FIELDS } from "../components/RoastsTable";

export const MY_ROASTS_QUERY = graphql(`
  query MyRoasts {
    myRoasts {
      ...RoastRowFields
      notes
      isPublic
      flavors { ...FlavorDescriptorFields }
      offFlavors { ...FlavorDescriptorFields }
    }
  }
`, [ROAST_ROW_FIELDS, FLAVOR_DESCRIPTOR_FIELDS]);
```

Similarly spread in `PUBLIC_ROASTS_QUERY`, `ROASTS_BY_BEAN_QUERY`, and any other query whose results feed into `RoastsTable`.

- [ ] **Step 5: Simplify DashboardPage.tsx**

Remove the `tableRows` mapping. Pass query results directly:

```tsx
const roasts = roastData?.myRoasts ?? [];
<RoastsTable roasts={roasts} ... />
```

The `uniqueBeans` logic (for the filter dropdown) stays — it extracts `{ id, name }` from `roast.bean`, which is available on the fragment type.

- [ ] **Step 6: Simplify BeanDetailPage.tsx**

Remove the `roastRows: RoastRow[]` mapping (`useMemo` at line 130-146). Remove the `import type { RoastRow }`. Pass query results directly:

```tsx
const rawRoasts = isOwner
  ? privateRoastsData?.roastsByBean ?? []
  : publicRoastsData?.publicRoasts ?? [];
<RoastsTable roasts={rawRoasts} ... />
```

- [ ] **Step 7: Rewrite RoastsTable.test.tsx**

Tests need `MockedProvider` with cache-seeded roasts. Use the cache helper:

```tsx
import { renderWithCache } from "../../../test/helpers/cacheHelpers";
import { ROAST_ROW_FIELDS } from "../RoastsTable";

const sampleRoasts = [
  { __typename: "Roast" as const, id: "r1", roastDate: "2025-03-01", rating: 4, totalDuration: 660, firstCrackTemp: 198, developmentPercent: 20.5, bean: { __typename: "Bean" as const, id: "b1", name: "Ethiopia Yirgacheffe" } },
  // ...
];

function renderTable(props = {}) {
  return renderWithCache(
    <RoastsTable roasts={sampleRoasts} {...props} />,
    sampleRoasts.map(r => ({ fragment: ROAST_ROW_FIELDS, data: r })),
  );
}
```

Update all test assertions to match new field names where relevant (behavior unchanged).

- [ ] **Step 8: Run tests**

Run: `cd client && npm test`

Expected: all tests pass.

- [ ] **Step 9: Commit**

```bash
git add client/src/components/RoastsTable.tsx client/src/graphql/operations.ts \
       client/src/features/dashboard/DashboardPage.tsx \
       client/src/features/beans/BeanDetailPage.tsx \
       client/src/components/__tests__/RoastsTable.test.tsx
git commit -m "refactor(roasts-table): colocated fragment + useFragment row rendering"
```

---

### Task 4: RoastMetricsTable — `RoastMetric` fragment + `useFragment` row extraction

**Files:**
- Modify: `client/src/features/roast-detail/RoastMetricsTable.tsx`
- Modify: `client/src/features/roast-detail/RoastDetailPage.tsx` — remove `toRoastMetric()` mapping
- Modify: `client/src/graphql/operations.ts` — spread fragment

**Spec ref:** "Components In Scope" → RoastMetricsTable, "Field Naming"

Same pattern as Task 3 but with different field renames.

- [ ] **Step 1: Define fragment in RoastMetricsTable.tsx**

```typescript
export const ROAST_METRIC_FIELDS = graphql(`
  fragment RoastMetricFields on Roast @_unmask {
    id
    roastDate
    totalDuration
    colourChangeTime
    colourChangeTemp
    firstCrackTime
    firstCrackTemp
    developmentTime
    developmentPercent
    roastEndTemp
  }
`);

export type RoastMetric = FragmentOf<typeof ROAST_METRIC_FIELDS>;
```

- [ ] **Step 2: Extract `MetricsRow` subcomponent with `useFragment`**

Each row in the metrics table calls `useFragment` to read its roast data from cache. Update all field accesses:
- `r.duration` → `r.totalDuration`
- `r.fcTime` → `r.firstCrackTime`
- `r.fcTemp` → `r.firstCrackTemp`
- `r.devTime` → `r.developmentTime`
- `r.dtr` → `r.developmentPercent`

- [ ] **Step 3: Simplify RoastDetailPage.tsx**

Remove the `toRoastMetric()` helper function (lines 274-287) and the `allBeanRoasts` mapping (lines 289-294). Pass roast data directly:

```tsx
const allBeanRoasts = [
  roast,
  ...(beanRoastsData?.roastsByBean ?? []).filter((r) => r.id !== roast.id),
];
<RoastMetricsTable roasts={allBeanRoasts} ... />
```

- [ ] **Step 4: Spread fragment in operations.ts**

Add `ROAST_METRIC_FIELDS` to `ROASTS_BY_BEAN_QUERY`, `ROAST_BY_ID_QUERY`, and `PUBLIC_ROAST_QUERY`.

- [ ] **Step 5: Run tests**

Run: `cd client && npm test`

- [ ] **Step 6: Commit**

```bash
git add client/src/features/roast-detail/RoastMetricsTable.tsx \
       client/src/features/roast-detail/RoastDetailPage.tsx \
       client/src/graphql/operations.ts
git commit -m "refactor(metrics-table): colocated fragment + useFragment row rendering"
```

---

### Task 5: MetricsTable — `Metrics` fragment

**Files:**
- Modify: `client/src/features/roast-detail/MetricsTable.tsx`
- Modify: `client/src/features/roast-detail/__tests__/MetricsTable.test.tsx`

**Spec ref:** "Components In Scope" → MetricsTable

- [ ] **Step 1: Define fragment and replace `Metrics` interface**

```typescript
export const METRICS_FIELDS = graphql(`
  fragment MetricsFields on Roast @_unmask {
    totalDuration
    colourChangeTime
    colourChangeTemp
    firstCrackTime
    firstCrackTemp
    developmentTime
    developmentPercent
    roastEndTemp
    rating
  }
`);

export type Metrics = FragmentOf<typeof METRICS_FIELDS> & { label?: string };
```

The `label` field is UI-only (not from GraphQL), so it's intersected with the fragment type.

- [ ] **Step 2: Update field accesses in MetricsTable.tsx**

- `metrics.duration` → `metrics.totalDuration`
- `metrics.fcTime` → `metrics.firstCrackTime`
- `metrics.fcTemp` → `metrics.firstCrackTemp`
- `metrics.devTime` → `metrics.developmentTime`
- `metrics.dtr` → `metrics.developmentPercent`

Update both the single-roast layout and the compare-mode table columns.

- [ ] **Step 3: Update MetricsTable.test.tsx**

Update test fixtures to use GraphQL field names:

```typescript
const fullMetrics = {
  __typename: "Roast" as const,
  totalDuration: 630,
  firstCrackTime: 480,
  developmentTime: 150,
  developmentPercent: 23.8,
  firstCrackTemp: 200,
  roastEndTemp: 215,
  colourChangeTime: 300,
  colourChangeTemp: 160,
  rating: 8,
};
```

- [ ] **Step 4: Run tests**

Run: `cd client && npx vitest run src/features/roast-detail/__tests__/MetricsTable.test.tsx`

- [ ] **Step 5: Commit**

```bash
git add client/src/features/roast-detail/MetricsTable.tsx \
       client/src/features/roast-detail/__tests__/MetricsTable.test.tsx
git commit -m "refactor(metrics-table): derive Metrics type from colocated fragment"
```

---

### Task 6: BeanCard — `Bean` fragment + `useFragment`

**Files:**
- Modify: `client/src/components/BeanCard.tsx`
- Modify: `client/src/components/__tests__/BeanCard.test.tsx`
- Modify: `client/src/features/beans/BeanLibraryPage.tsx`
- Modify: `client/src/features/landing/LandingPage.tsx`
- Modify: `client/src/graphql/operations.ts`

**Spec ref:** "Components In Scope" → BeanCard, "Special Cases" → computed props

- [ ] **Step 1: Define fragment in BeanCard.tsx**

```typescript
export const BEAN_CARD_FIELDS = graphql(`
  fragment BeanCardFields on Bean @_unmask {
    id
    name
    origin
    process
    suggestedFlavors
  }
`);
```

- [ ] **Step 2: Refactor BeanCard to use `useFragment`**

```tsx
interface BeanCardProps {
  beanRef: { __typename: "Bean"; id: string };
  roastCount?: number;
  avgRating?: number;
}

export function BeanCard({ beanRef, roastCount, avgRating }: BeanCardProps) {
  const { data: bean } = useFragment({
    fragment: BEAN_CARD_FIELDS,
    from: beanRef,
  });

  const flavors = (bean.suggestedFlavors ?? []).map(name => ({ name, color: "#888" }));
  // render using bean.name, bean.origin, bean.process, flavors
}
```

**Key change:** `suggestedFlavors: string[]` is now read from the fragment. The component handles the `{ name, color: "#888" }` mapping internally instead of receiving pre-mapped `flavors` from the parent.

- [ ] **Step 3: Spread fragment in operations.ts**

Add `BEAN_CARD_FIELDS` to `PUBLIC_BEANS_QUERY` and `MY_BEANS_QUERY` (nested under `bean { ...BeanCardFields }`).

- [ ] **Step 4: Simplify BeanLibraryPage.tsx**

Remove the `myBeanCards` / `publicBeanCards` mapping logic. Pass refs:

```tsx
{beanCards.map((bean) => (
  <BeanCard
    key={bean.id}
    beanRef={{ __typename: "Bean" as const, id: bean.id }}
    roastCount={agg?.roastCount}
    avgRating={agg?.avgRating}
  />
))}
```

For myBeans, the bean ID comes from `ub.bean.id`. For publicBeans, it comes from `b.id`.

- [ ] **Step 5: Simplify LandingPage.tsx**

```tsx
{beansQuery.data.publicBeans.map((bean) => (
  <BeanCard
    key={bean.id}
    beanRef={{ __typename: "Bean" as const, id: bean.id }}
  />
))}
```

- [ ] **Step 6: Rewrite BeanCard.test.tsx**

Use `renderWithCache` to seed bean data into cache:

```tsx
const testBean = {
  __typename: "Bean" as const,
  id: "bean-123",
  name: "Ethiopia Yirgacheffe",
  origin: "Ethiopia",
  process: "Washed",
  suggestedFlavors: ["Blueberry", "Chocolate", "Citrus", "Floral", "Honey"],
};

renderWithCache(
  <BeanCard beanRef={{ __typename: "Bean", id: "bean-123" }} roastCount={12} avgRating={4.5} />,
  [{ fragment: BEAN_CARD_FIELDS, data: testBean }],
);
```

- [ ] **Step 7: Run tests**

Run: `cd client && npm test`

- [ ] **Step 8: Commit**

```bash
git add client/src/components/BeanCard.tsx client/src/components/__tests__/BeanCard.test.tsx \
       client/src/features/beans/BeanLibraryPage.tsx \
       client/src/features/landing/LandingPage.tsx \
       client/src/graphql/operations.ts
git commit -m "refactor(bean-card): colocated fragment + useFragment for cache reads"
```

---

### Task 7: Consolidate `TimeSeriesEntry` + final cleanup

**Files:**
- Modify: `client/src/features/compare/ComparePage.tsx` — import `TimeSeriesEntry` from RoastChart
- Modify: `client/src/features/roast-detail/RoastChart.tsx` — export `TimeSeriesEntry`

- [ ] **Step 1: Export `TimeSeriesEntry` from RoastChart.tsx**

It's already exported (used by RoastDetailPage). Verify: `export type { TimeSeriesEntry }` at bottom of file or `export` on the interface.

- [ ] **Step 2: Remove duplicate `TimeSeriesEntry` from ComparePage.tsx**

Replace the local `interface TimeSeriesEntry { ... }` with:

```typescript
import type { TimeSeriesEntry } from "../roast-detail/RoastChart";
```

- [ ] **Step 3: Run full test suite**

Run: `cd client && npm test`

Run: `cd server && npm test`

- [ ] **Step 4: Type check**

Run: `cd client && npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add client/src/features/compare/ComparePage.tsx
git commit -m "refactor: consolidate TimeSeriesEntry to single definition in RoastChart"
```

---

### Task 8: Integration verification

**Files:** none (verification only)

- [ ] **Step 1: Run full client test suite**

Run: `cd client && npm test`

- [ ] **Step 2: Run server test suite**

Run: `cd server && npm test`

- [ ] **Step 3: Run E2E suite**

Run: `npx playwright test`

All E2E tests should pass unchanged — the refactor is internal, no UI behavior changes.

- [ ] **Step 4: Type check the entire client**

Run: `cd client && npx tsc --noEmit`

- [ ] **Step 5: Validate GraphQL schema alignment**

Run: `cd client && npm run validate:schema`

Confirm gql.tada types are consistent with the server schema.
