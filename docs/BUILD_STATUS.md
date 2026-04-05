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
| E2E tests passing | 103 / 103 |
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

## Design Audit — COMPLETE

All Critical and Major issues fixed. See `/docs/DESIGN_AUDIT.md`.

| Category | Found | Fixed |
|----------|-------|-------|
| Critical (a11y) | 5 | 5 |
| Major (a11y) | 4 | 4 |
| Minor (a11y) | 7 | 0 (flagged) |
| Axe-core violations | 0 across all routes | — |

Fixes applied:
- Color contrast: sign-in link, chart toggle buttons, empty state text
- ARIA: StarRating role="img", chart aria-label
- Accessibility: prefers-reduced-motion global rule
- Focus: textarea outline, sign-in link focus-visible
- Active states: toggle buttons across 3 files
- Layout: removed duplicate header from LandingPage
- Alignment: nav link vertical alignment with logo

## Visual QA — COMPLETE

All Critical, Major, and Minor UX issues fixed. See `/docs/VISUAL_QA.md`.

| Category | Found | Fixed |
|----------|-------|-------|
| Critical (UX) | 3 | 3 |
| Major (UX) | 4 | 4 |
| Minor (UX) | 9 | 8 (m9 skipped — feature request) |

Fixes applied:
- Silent file rejection → error message for non-.klog files
- Mutation pending states → isMutating disables buttons, toast errors
- Delete failure → toast error on catch
- Touch targets → min-height: var(--control-min-height) across all controls
- File parse loading → "Parsing..." indicator
- Parse warnings → structured list
- Domain tooltips → FC, DTR, Dev Time, Dry End in MetricsTable
- Public/Private toggle → lock icons, aria-label, toast confirmation
- Sort indicators → ↕ on unsorted columns
- Back links → underline + proper touch targets
- Parse button → "Parse Flavors" + no-match feedback

## Visual Baseline — SET

Screenshots promoted as baseline for 4 routes × 4 breakpoints (16 total):
landing, bean-library, bean-detail, roast-detail

## Code Review — COMPLETE

code-reviewer and code-simplifier ran in parallel. Fixes applied:
- Race condition: toast message in handleTogglePublic (captured state before await)
- Dead code: removed unused activeTextColor, tempSymbol
- Token consolidation: --control-min-height token, --color-text-inverse-hover/active
- Color dedup: DATASET_COLOR lookup + colorWithAlpha helper in RoastChart
- Error handling: handleDownloadProfile converted to async/await with toast
- Simplification: Math.max(0, 0 - PHASE_PADDING) → 0
- Parsing state: added setParsing(false) to reset()

## E2E Test Files

| File | Flows | Status |
|------|-------|--------|
| `landing.spec.ts` | Landing page, public browsing | Passing (pre-audit) |
| `auth.spec.ts` | Public/protected route boundaries | Passing |
| `dashboard.spec.ts` | Stats, table, search/filter, compare, empty state | Passing |
| `upload.spec.ts` | Upload modal, file preview, bean matching, file validation, parsing indicator, parse warnings | Passing |
| `roast-detail.spec.ts` | Public view, owner editing, delete, chart, toast feedback, tooltips (FC/DTR/Dev/Dry End), lock icon + aria-label | Passing |
| `bean-library.spec.ts` | Card/table toggle, auth variants, add bean, sort indicators, parse no-match feedback | Passing |
| `bean-detail.spec.ts` | Public view, owner editing, cupping notes | Passing |
| `compare.spec.ts` | From dashboard, from roast detail, cross-bean | Passing |
| `header-controls.spec.ts` | Temp toggle, theme toggle, privacy default | Passing |
| `journeys.spec.ts` | 6 cross-page journey flows | Passing |

## Frontend Orchestration Plugin Updates

- `standards/ux-quality.md` — NEW: Nielsen's heuristics, Gestalt principles, interaction quality, frustration signals
- `commands/visual-qa.md` — NEW: UX quality review command
- `subagents/visual-qa-reviewer.md` — NEW: visual QA reviewer subagent
- `commands/design-audit.md` — UPDATED: Phase 2 visual composition review, Phase 3 re-review
- `subagents/screenshot-reviewer.md` — UPDATED: page-level composition analysis
- `standards/design-and-a11y.md` — UPDATED: Visual Composition checklist section

## Bug Fix

- **ToastProvider missing from AppProviders** — `useToast()` threw at runtime because `ToastProvider` was never added to the app's provider tree. All unit tests passed (each test wrapped components individually), but E2E tests exposed the gap. Fixed by adding `ToastProvider` inside `ThemeProvider` in `AppProviders.tsx`.

## Known Issues

- Dashboard empty state "Upload your first roast" navigates to `/?upload=true` — needs wiring
- Chart needs visual iteration (marker collision, grid scale UX, dark mode colors)
- E2E tests mutate data — reseed (`npm run db:seed`) before each full E2E run

## Next Steps

1. **Merge PR #35** — waiting for Jake's review
2. Chart iteration (interactive, post-merge)
3. Wire `?upload=true` search param
