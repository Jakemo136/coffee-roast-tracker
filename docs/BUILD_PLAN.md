# BUILD_PLAN.md

> Dependency-resolved build order for Coffee Roast Tracker frontend rebuild.
> Generated 2026-04-03 from COMPONENT_INVENTORY.md.

---

## Wave 0 — Foundation

Infrastructure that everything else depends on. Not components per se, but
required before any component can render.

| Item | Type | Notes |
|------|------|-------|
| `styles/tokens.css` | CSS | Design tokens (colors, spacing, typography, radii, shadows) |
| `styles/reset.css` | CSS | Normalization |
| `styles/themes.css` | CSS | Latte Mode + Black Coffee Mode token overrides |
| `graphql/graphql.ts` | Setup | gql.tada configuration with introspection |
| `graphql/operations.ts` | GraphQL | All queries + mutations (port from archive, update for new requirements) |
| `lib/apollo.ts` | Utility | Apollo client factory with Clerk auth link |
| `lib/formatters.ts` | Utility | Date, temp, duration formatters |
| `lib/tempConversion.ts` | Utility | Celsius/Fahrenheit conversion |
| `lib/chartSetup.ts` | Utility | Chart.js plugin registration |
| `lib/coffeeProcesses.ts` | Utility | Coffee process enum |
| `vite-env.d.ts` | Types | Vite environment types |

**Parallel agents:** 3 (styles, graphql+lib, types)
**Tests after wave:** Unit tests for lib utilities

---

## Wave 1 — Shared UI Primitives

Zero component dependencies. Can all be built in parallel.

| Component | Complexity | Notes |
|-----------|-----------|-------|
| Modal | low | Portal-based, backdrop close, footer slot |
| StarRating | low | Half-star, interactive/read-only, a11y |
| FlavorPill | low | Colored pill, regular/off-flavor variants |
| Combobox | medium | Searchable dropdown, click-outside, a11y |
| Toast | low | Stays until next user interaction |
| Pagination | low | Reusable page controls |
| EmptyState | low | Configurable icon + message + CTA |
| ErrorState | low | Inline error with retry button |
| SkeletonLoader | low | Card, table, content placeholders |
| MetricsTable | low | Fixed-format roast metrics display |
| StatChips | low | Total roasts, avg rating, most-used bean |
| TempToggle | low | °C/°F toggle, localStorage + server sync |
| ThemeToggle | low | Latte/Black Coffee toggle, data-theme attr |
| RoastChart | high | Chart.js with zone boosts, phase zoom, markers |

**Parallel agents:** 14 (one per component)
**Tests after wave:** RTL tests for each component

---

## Wave 2 — Composed Components

Depend only on Wave 1 primitives.

| Component | Dependencies (Wave 1) | Complexity |
|-----------|----------------------|-----------|
| ConfirmDialog | Modal | low |
| ErrorBoundary | ErrorState | low |
| BeanCard | FlavorPill, StarRating | low |
| UserButton | _(Clerk + custom dropdown)_ | medium |
| RoastsTable | StarRating, Pagination, Combobox | high |
| FlavorPickerModal | Modal, FlavorPill, Combobox | medium |
| AddBeanModal | Modal, Combobox, FlavorPill, Toast | medium |

**Parallel agents:** 7 (one per component)
**Tests after wave:** RTL tests for each component

---

## Wave 3 — Complex Modals

Depends on Wave 2 components.

| Component | Dependencies (Wave 2) | Complexity |
|-----------|----------------------|-----------|
| UploadModal | Modal, Combobox, AddBeanModal, Toast | high |

**Parallel agents:** 1
**Tests after wave:** RTL tests for UploadModal

---

## Wave 4 — Providers & Shell

Depends on Waves 1-3 for Header composition.

| Component | Dependencies | Complexity |
|-----------|-------------|-----------|
| ApolloProvider | _(lib/apollo.ts from Wave 0)_ | medium |
| AppProviders | ApolloProvider, ClerkProvider, ThemeProvider, TempProvider | medium |
| ProtectedRoute | _(Clerk hooks)_ | low |
| Header | TempToggle, ThemeToggle, UserButton, UploadModal | medium |
| AppLayout | Header, Toast | medium |

**Build order within wave:** ApolloProvider → AppProviders → ProtectedRoute + Header (parallel) → AppLayout
**Parallel agents:** 2-3 (sequential where noted)
**Tests after wave:** RTL tests, provider integration tests

---

## Wave 5 — Pages

All feature pages. Depend on shell + shared components.

| Component | Key Dependencies | Complexity |
|-----------|-----------------|-----------|
| SignInPage | _(Clerk)_ | low |
| SignUpPage | _(Clerk)_ | low |
| NotFoundPage | _(none)_ | low |
| LandingPage | BeanCard, EmptyState, ErrorState, SkeletonLoader | medium |
| DashboardPage | StatChips, RoastsTable, EmptyState, ErrorState, SkeletonLoader | high |
| BeanLibraryPage | BeanCard, RoastsTable, EmptyState, ErrorState, SkeletonLoader | high |
| BeanDetailPage | FlavorPill, RoastsTable, FlavorPickerModal, ErrorState, SkeletonLoader, Toast | high |
| RoastDetailPage | RoastChart, MetricsTable, FlavorPill, FlavorPickerModal, StarRating, RoastsTable, ConfirmDialog, ErrorState, SkeletonLoader, Toast | high |
| ComparePage | RoastChart, MetricsTable, ErrorState, SkeletonLoader | high |

**Parallel agents:** 9 (one per page)
**Tests after wave:** RTL tests for each page

---

## Wave 6 — App Entry & Routing

Wire everything together.

| Item | Notes |
|------|-------|
| `App.tsx` | Route definitions, layout nesting, ProtectedRoute wiring |
| `main.tsx` | Vite entry point, AppProviders wrapper |

**Parallel agents:** 1 (single file, fast)
**Tests after wave:** Full RTL suite + full E2E suite

---

## Summary

| Wave | Components | Parallel Agents | Blocking? |
|------|-----------|----------------|-----------|
| 0 | Foundation (styles, graphql, lib) | 3 | — |
| 1 | 14 shared primitives | 14 | — |
| 2 | 7 composed components | 7 | — |
| 3 | 1 complex modal (UploadModal) | 1 | — |
| 4 | 5 providers + shell | 2-3 | Sequential within |
| 5 | 9 pages | 9 | — |
| 6 | App entry + routing | 1 | — |
| **Total** | **34 components + foundation** | | |

## Circular Dependency Check

No circular dependencies detected. Dependency graph is a clean DAG.

## Server Changes Required

Before or during Wave 0, the following server-side changes are needed
to support the new UI requirements:

1. **Public read queries** — `beans`, `bean(id)`, `roasts`, `roast(id)` must work without auth
2. **Rename `isShared` → `isPublic`** on Roast model (Prisma + GraphQL schema)
3. **Remove `shareToken`** field and `roastByShareToken` query
4. **Add `communityStats` query** — returns total roasts, total beans
5. **Add `publicBeans` query** — returns popular beans sorted by roast count
6. **Add `theme` field** to User model (LATTE / BLACK_COFFEE enum)
7. **Add `privateByDefault` field** to User model (boolean, default false)
8. **Add/extend user settings mutation** for theme + privacy default
9. **Pagination support** — cursor or offset-based for roasts and beans queries

These can be done as a pre-Wave-0 step or in parallel with Wave 0.
