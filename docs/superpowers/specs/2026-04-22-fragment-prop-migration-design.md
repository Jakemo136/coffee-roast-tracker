# Fragment-Derived Props Migration

## Problem

Every data-display component manually declares a TypeScript interface that mirrors the shape of GraphQL fields it renders. These interfaces are maintained by hand, drift from the schema, and require a transformation layer in every parent component that maps query results into the component's prop shape — renaming fields, converting `null` to `undefined`, flattening nested objects.

Example: `RoastsTable` declares `interface RoastRow { duration?: number; devPercent?: number; beanName: string; ... }`. Every parent that renders it must map `totalDuration` → `duration`, `developmentPercent` → `devPercent`, `bean.name` → `beanName`. This mapping is duplicated across DashboardPage, BeanDetailPage, and RoastDetailPage.

## Solution

Replace manual prop interfaces with colocated GraphQL fragments and Apollo Client 4's `useFragment` hook. Each data-display component:

1. **Defines a fragment** declaring exactly which fields it needs
2. **Exports `FragmentOf<typeof FRAG>`** as its data prop type
3. **Calls `useFragment()`** to read its data from the Apollo cache
4. **Receives only a cache reference** (`{ __typename, id }`) from parents — not the full data blob

Parents spread the fragment in their query, pass the reference, and the component reads what it needs from cache. No mapping layer, no field renaming, no null-to-undefined conversion.

## Components In Scope

### Tier 1: Direct GraphQL type mirrors (fragment + `useFragment`)

| Component | Current Interface | GraphQL Type | Fragment Fields |
|---|---|---|---|
| `RoastsTable` → extract `RoastTableRow` | `RoastRow` | `Roast` | `id roastDate rating totalDuration firstCrackTemp developmentPercent bean { id name }` |
| `RoastMetricsTable` | `RoastMetric` | `Roast` | `id roastDate totalDuration colourChangeTime colourChangeTemp firstCrackTime firstCrackTemp developmentTime developmentPercent roastEndTemp` |
| `FlavorPickerModal` | `FlavorDescriptor` | `FlavorDescriptor` | `id name category color isOffFlavor` |
| `BeanCard` | `BeanCardProps` | `Bean` | `id name origin process suggestedFlavors` |
| `MetricsTable` | `Metrics` | `Roast` | `totalDuration colourChangeTime colourChangeTemp firstCrackTime firstCrackTemp developmentTime developmentPercent roastEndTemp rating` |

### Out of Scope (pure UI — no GraphQL type backing)

`FlavorPill`, `StarRating`, `Pagination`, `Modal`, `ConfirmDialog`, `Combobox`, `EmptyState`, `ErrorState`, `SkeletonLoader`, `Header`, `Toast`

### Special Cases

- **`RoastChart` / `TimeSeriesEntry`** — the data is a `JSON` scalar blob, not a typed GraphQL object with `__typename`/`id`. Can't use `useFragment`. Stays as a manual interface. `ComparePage` currently duplicates this type — consolidate to a single export from `RoastChart.tsx`.
- **`BeanCard` computed props** — `roastCount` and `avgRating` are aggregated from a separate roasts query, not from the Bean type. These stay as regular non-fragment props alongside the fragment data.
- **`BeanCard` flavor display** — currently receives `flavors: Array<{ name, color }>` where parent maps `suggestedFlavors: string[]` → `{ name, color: "#888" }`. With the fragment, BeanCard reads `suggestedFlavors` directly and handles the color internally.

## Pattern: `useFragment` with Lists

`useFragment` is a hook — you can't call it in a loop. For list components like `RoastsTable`, extract a row subcomponent:

```tsx
// RoastsTable.tsx
function RoastTableRow({ roastRef }: { roastRef: { __typename: "Roast"; id: string } }) {
  const { data } = useFragment({ fragment: ROAST_ROW_FIELDS, from: roastRef });
  return <tr>...</tr>;
}

// Parent passes just the reference array
<RoastsTable roastRefs={roasts.map(r => ({ __typename: "Roast" as const, id: r.id }))} />
```

Each row subscribes to its own cache entry. When a single roast's rating changes, only that row re-renders.

## Pattern: Non-Fragment Props

Components can mix fragment data with regular props. Fragment covers the GraphQL-shaped data; regular props cover UI behavior and computed values:

```tsx
interface BeanCardProps {
  beanRef: { __typename: "Bean"; id: string };
  roastCount?: number;  // computed, not from Bean type
  avgRating?: number;   // computed, not from Bean type
}
```

## Field Naming

Components adopt the GraphQL schema's field names. No more aliases:

| Current alias | GraphQL field |
|---|---|
| `duration` | `totalDuration` |
| `devPercent` / `dtr` | `developmentPercent` |
| `fcTime` | `firstCrackTime` |
| `fcTemp` | `firstCrackTemp` |
| `devTime` | `developmentTime` |
| `beanName` | `bean.name` (nested access via fragment) |

Column header display text stays human-readable ("Time", "DTR%", "FC Temp") — only the data access changes.

## Query Changes

Parent queries spread the component's fragment instead of manually selecting fields:

```graphql
# Before
query MyRoasts {
  myRoasts {
    id
    roastDate
    rating
    totalDuration
    firstCrackTemp
    developmentPercent
    bean { id name }
    # ... many more fields for other consumers
  }
}

# After
query MyRoasts {
  myRoasts {
    ...RoastRowFields          # for RoastsTable
    ...RoastMetricFields       # for RoastMetricsTable
    notes
    isPublic
    flavors { ...FlavorDescriptorFields }
    offFlavors { ...FlavorDescriptorFields }
  }
}
```

Queries that currently select overlapping field sets will naturally deduplicate via fragment composition.

## Test Strategy

Tests must wrap components in `MockedProvider` (or equivalent) with cache-seeded data instead of passing props directly. Pattern:

```tsx
import { InMemoryCache } from "@apollo/client/core";
import { MockedProvider } from "@apollo/client/testing";

function renderWithCache(ui: React.ReactNode, cacheData: Record<string, unknown>) {
  const cache = new InMemoryCache();
  cache.writeFragment({
    fragment: ROAST_ROW_FIELDS,
    data: { __typename: "Roast", id: "r1", roastDate: "2025-03-01", ... },
  });
  return render(<MockedProvider cache={cache}>{ui}</MockedProvider>);
}
```

A shared test helper (`test/helpers/cacheHelpers.ts`) will provide `renderWithCache` and typed factory functions for seeding common entities.

## Parent Simplification

Parents no longer transform data. Before vs after for DashboardPage:

```tsx
// BEFORE: manual mapping in every parent
const tableRows = roasts.map((roast) => ({
  id: roast.id,
  beanName: roast.bean.name,
  roastDate: roast.roastDate ?? undefined,
  duration: roast.totalDuration ?? undefined,
  devPercent: roast.developmentPercent ?? undefined,
  ...
}));
<RoastsTable roasts={tableRows} />

// AFTER: pass references, component reads from cache
<RoastsTable roastRefs={roasts.map(r => ({ __typename: "Roast" as const, id: r.id }))} />
```

## Affected Files

### Modified
- `client/src/graphql/graphql.ts` — export `readFragment`
- `client/src/graphql/operations.ts` — spread fragments, import from component files
- `client/src/components/RoastsTable.tsx` — fragment, `useFragment`, extract row subcomponent
- `client/src/components/BeanCard.tsx` — fragment, `useFragment`
- `client/src/components/FlavorPickerModal.tsx` — fragment, export type
- `client/src/features/roast-detail/RoastMetricsTable.tsx` — fragment, `useFragment`, extract row subcomponent
- `client/src/features/roast-detail/MetricsTable.tsx` — fragment, `useFragment`
- `client/src/features/roast-detail/RoastDetailPage.tsx` — remove `toRoastMetric()` mapping, pass refs
- `client/src/features/dashboard/DashboardPage.tsx` — remove `tableRows` mapping, pass refs
- `client/src/features/beans/BeanDetailPage.tsx` — remove `roastRows` mapping, pass refs
- `client/src/features/beans/BeanLibraryPage.tsx` — pass bean refs + computed props
- `client/src/features/landing/LandingPage.tsx` — pass bean refs
- `client/src/features/compare/ComparePage.tsx` — import `TimeSeriesEntry` from RoastChart instead of redeclaring

### Test files updated
- `client/src/components/__tests__/RoastsTable.test.tsx`
- `client/src/components/__tests__/BeanCard.test.tsx`
- `client/src/components/__tests__/FlavorPickerModal.test.tsx`
- `client/src/features/roast-detail/__tests__/MetricsTable.test.tsx`
- `client/src/features/roast-detail/__tests__/RoastChart.test.tsx` (no change — TimeSeriesEntry stays manual)

### Created
- `client/test/helpers/cacheHelpers.ts` — shared `renderWithCache` + entity factories

## Tradeoffs

- **Test complexity increases** — every data-display component test needs `MockedProvider` + cache seeding instead of plain prop passing. One-time cost, and the test helper mitigates ongoing friction.
- **`useFragment` requires normalized cache** — entities need `__typename` + `id`. All our types have `id` and `InMemoryCache` normalizes by default. No issue.
- **Fragment-query coupling** — `operations.ts` imports fragments from component files. This inverts the current dependency direction but doesn't create cycles (components don't import from `operations.ts`).
- **List row extraction** — `RoastsTable` and `RoastMetricsTable` need inner row components for per-row `useFragment`. More files, but better re-render granularity.
- **TimeSeriesEntry stays manual** — JSON scalar blobs aren't typed GraphQL objects. No fragment possible. Accepted limitation.
