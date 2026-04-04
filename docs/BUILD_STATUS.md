# BUILD_STATUS.md

> Last updated: 2026-04-04

## Build Summary

| Metric | Value |
|--------|-------|
| Components built | 34 / 34 |
| RTL test files | 35 |
| RTL tests passing | 265 / 265 |
| Server test files | 11 |
| Server tests passing | 129 / 129 |
| E2E test files | 9 (+ 1 journeys) |
| E2E tests passing | 91 / 92 |
| PR | #35 (feat/client-rebuild) |

## Wave Completion

| Wave | Status | Components | Tests |
|------|--------|-----------|-------|
| 0 — Foundation | Done | Styles, GraphQL, lib utilities | Unit tests for formatters, tempConversion |
| 1 — Shared primitives | Done | Modal, StarRating, FlavorPill, Combobox, Toast, Pagination, EmptyState, ErrorState, SkeletonLoader, MetricsTable, StatChips, TempToggle, ThemeToggle, RoastChart | 116 |
| 2 — Composed components | Done | ConfirmDialog, ErrorBoundary, BeanCard, UserButton, RoastsTable, FlavorPickerModal, AddBeanModal | 64 |
| 3 — UploadModal | Done | UploadModal | 11 |
| 4 — Providers & Shell | Done | ApolloProvider, E2eApolloProvider, ThemeContext, TempContext, AppProviders, ProtectedRoute, Header, AppLayout | 18 |
| 5 — Pages | Done | LandingPage, DashboardPage, BeanLibraryPage, BeanDetailPage, RoastDetailPage, ComparePage, SignInPage, SignUpPage, NotFoundPage | 56 |
| 6 — App entry & routing | Done | App.tsx, main.tsx | — |

## Server Changes

| Change | Status |
|--------|--------|
| Rename `isShared` → `isPublic` (default true) | Done |
| Remove `shareToken` field | Done |
| Add `theme`, `privateByDefault` to User | Done |
| Public queries: `communityStats`, `publicBeans`, `publicRoasts`, `bean`, `roast` | Done |
| `flavorDescriptors` made public (no auth) | Done |
| `toggleRoastPublic` mutation (replaces `toggleRoastSharing`) | Done |
| `updateTheme`, `updatePrivacyDefault` mutations | Done |
| `uploadRoastLog` respects `privateByDefault` setting | Done |
| Prisma migration applied | Done |
| Server tests updated and passing (129/129) | Done |

## E2E Test Files

| File | Flows | Status |
|------|-------|--------|
| `landing.spec.ts` | Landing page, public browsing | Pending |
| `auth.spec.ts` | Public/protected route boundaries | Pending |
| `dashboard.spec.ts` | Stats, table, search/filter, compare, empty state | Pending |
| `upload.spec.ts` | Upload modal, file preview, bean matching | Pending |
| `roast-detail.spec.ts` | Public view, owner editing, delete, chart | Pending |
| `bean-library.spec.ts` | Card/table toggle, auth variants, add bean | Pending |
| `bean-detail.spec.ts` | Public view, owner editing, cupping notes | Pending |
| `compare.spec.ts` | From dashboard, from roast detail, cross-bean | Pending |
| `header-controls.spec.ts` | Temp toggle, theme toggle, privacy default | Pending |
| `journeys.spec.ts` | 6 cross-page journey flows | Pending |

## Known Issues

- Pre-existing TypeScript error in `server/src/lib/validateKlog.test.ts` (not from this build)
- 1 E2E failure: journey delete test — Playwright strict-mode locator conflict (notes text "about to delete" matches same regex as confirmation dialog)
- Dashboard empty state "Upload your first roast" navigates to `/?upload=true` — AppLayout needs to read this search param and open UploadModal
- Chart needs visual iteration once rendered (marker collision, grid scale UX, dark mode colors)
- E2E tests mutate data — reseed (`npm run db:seed`) before each full E2E run

## Code Review Applied

- Fixed: authenticated users couldn't see other users' public roasts (auth query fallback)
- Fixed: delete mutation had no error handling (now awaits + keeps dialog open on failure)
- Fixed: .kpro download now works for public roasts (server resolver updated)
- Fixed: ComparePage temperature conversion applied to chart data
- Fixed: ThemeProvider sets data-theme on initial render (dark mode persists across reload)
- Fixed: ConfirmDialog wrapper div only renders when open (a11y)
- Simplified: duplicate formatTime/celsiusToFahrenheit removed, single-pass aggregation, shared saveRoast helper

## Design Audit

Not yet run. **This is the next step.**

## Next Steps

1. **Run `/design-audit`** — a11y + visual audit at all 4 breakpoints
2. **Run `/set-baseline`** — promote screenshots as visual regression baseline
3. Merge PR #35
4. Chart iteration (interactive, post-merge)
5. Wire `?upload=true` search param for empty state upload button
