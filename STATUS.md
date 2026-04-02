# Coffee Roast Tracker — Project Status

> Last updated: 2026-04-02

## Current State

**Branch:** `main` — all PRs merged, CI green (Client + Server + E2E).

**Test counts:** 116 server, 145 client, 36 E2E (Playwright) — all passing.

---

## Server — 116 tests, 11 suites

### Data Layer (Prisma)

| Item | Status | Notes |
|------|--------|-------|
| User model | Done | `clerkId`, `tempUnit` (CELSIUS/FAHRENHEIT) |
| Bean model | Done | `name`, `origin`, `process`, `cropYear`, `elevation`, `variety`, `score`, `bagNotes`, `sourceUrl`, `suggestedFlavors` |
| UserBean join | Done | Per-user library with `notes`, `shortName`; unique on `(userId, beanId)` |
| Roast model | Done | Full Kaffelogic fields: event times/temps, phase data, JSON chart columns |
| RoastFile model | Done | `fileKey`, `fileName`, `fileType` (KLOG/CSV) |
| RoastProfile model | Done | One-to-one with Roast; `.kpro` extracted on demand |
| FlavorDescriptor + RoastFlavor | Done | Category-based flavor system with colors |
| EspressoShot model | Scaffolded | Fields defined, no resolvers — deferred to v2 |
| Migrations | Done | 8 applied (latest: `add_suggested_flavors_to_bean`) |
| Seed data | Done | 60 flavor descriptors, 4 users (Alice/Bob/Carol/Dave), 8 beans, 24 roasts |

### GraphQL API

| Query/Mutation | Status | Notes |
|----------------|--------|-------|
| `scrapeBeanUrl` | Done | Multi-vendor scraper, 10 strategies, 10s timeout |
| `parseBeanPage` | Done | Parse pasted HTML/text — paste fallback |
| `previewRoastLog` | Done | Parses .klog, returns `suggestedBeans` (bidirectional matching on shortName + bean name + filename) |
| `createBean` | Done | Accepts `variety`, `score`, `cropYear`, `suggestedFlavors` |
| `updateBean` | Done | Whitelisted fields with ownership check |
| `updateBeanSuggestedFlavors` | Done | Array update with ownership check |
| `myBeans` / `myRoasts` | Done | User-scoped queries |
| All roast CRUD | Done | create, update, delete, sharing, upload |
| `flavorDescriptors` | Done | With `isOffFlavor` filter |
| `setRoastFlavors` / `setRoastOffFlavors` | Done | Per-roast flavor tagging |
| `userSettings` / `updateTempUnit` | Done | Sticky temp unit preference |
| `uploadRoastLog` | Done | Validate + parse + create Roast/RoastFile/RoastProfile |

### Services

| Service | Status | Notes |
|---------|--------|-------|
| ScrapingService | Done | 10 extraction strategies, KNOWN_FLAVORS validation, Shopify unicode decode |
| RoastService | Done | Bean matching (bidirectional shortName + name + filename), all roast logic |
| FlavorService | Done | Descriptor CRUD, roast-flavor associations |
| klogParser | Done | Event markers, temps, curves, truncation |

---

## Client — 145 tests, 25 suites

### Folder Structure

Feature-based: `features/{dashboard,roast-detail,beans,compare,settings,auth,shared}/` with `styles/` and `tests/` subdirs. Shared primitives in `components/`.

### Pages & Features

| Feature | Status | Notes |
|---------|--------|-------|
| App shell / layout | Done | Specialty Craft theme, espresso header, Sora font |
| Auth | Done | Clerk sign-in/up/out, E2E bypass for testing |
| Dashboard | Done | Roast table, star rating, flavor pills, search/filter, bean filter dropdown, multi-select compare |
| Roast Detail | Done | 50/50 split, chart + details, phase zoom, editable notes, flavor picker, share toggle, incomplete-bean nudge banner |
| Flavor Picker Modal | Done | Search, category groups, custom descriptors |
| Upload Modal | Done | Drag-and-drop .klog, preview with metadata, bean matching (bidirectional), radio confirmation, inline "+ Add new bean", navigate to roast detail after save |
| Bean Library | Done | Card grid, flavor pills (suggested + roast-aggregated deduped), MASL suffix, avg rating |
| Add Bean Modal | Done | ParseSupplierModal trigger, manual form, Process combobox, comma-split flavor input |
| Bean Detail | Done | Editable metadata (6-col grid with Score), removable suggested flavors, re-parse from supplier with diff preview, roast table |
| ParseSupplierModal | Done | URL fetch + paste textarea both visible, Cloudflare detection |
| ParseDiffModal | Done | Field-by-field comparison with checkboxes, cherry-pick apply |
| Comparison View | Done | Overlaid curves, transposed metrics table, color-coded legend |
| Settings | Done | Explicit Save button, dirty-state tracking, "Saved" confirmation |
| Shared Roast View | Done | Public page via shareToken |

### Not Done

| Feature | Notes |
|---------|-------|
| Welcome/landing page | Unauthenticated users redirect to sign-in |
| "Upload your first roast" on empty dashboard | Done — wired to open UploadModal |

---

## E2E Tests — 36 tests, 9 spec files + journeys

### Infrastructure

- Playwright with Chromium headless
- E2E auth bypass: server `E2E_TEST_USER_ID` + client `VITE_E2E_TEST`
- Per-request user switching via `x-e2e-clerk-id` header (Dave for empty state)
- .klog fixture files in `mocks/sample-roasts/`
- CI: GitHub Actions E2E job runs after Client + Server pass

### Spec Files

| File | Tests | Coverage |
|------|-------|----------|
| `dashboard.spec.ts` | 6 | Data loading, bean names, filter, roast navigation |
| `roast-detail.spec.ts` | 2 | Notes editing, share toggle |
| `bean-library.spec.ts` | 4 | Add bean, new bean in library, flavor persistence, combobox |
| `bean-detail.spec.ts` | 4 | Metadata editing, cancel, flavor removal, re-parse |
| `upload.spec.ts` | 6 | Modal open/close, .klog preview + match, save + navigate, add new bean flow |
| `compare.spec.ts` | 2 | Checkbox selection, compare navigation |
| `settings.spec.ts` | 1 | Temp unit toggle + save |
| `navigation.spec.ts` | 6 | Nav links, bean card round-trip, 404, upload CTA, view listing, roast row |
| `journeys.spec.ts` | 5 | Cross-page user flows |

---

## DevOps

| Item | Status |
|------|--------|
| GitHub repo | `Jakemo136/coffee-roast-tracker` (private) |
| GitHub Actions CI | 3 jobs: Client, Server, E2E — all green |
| Heroku / Vercel deploy | Not done |

---

## Completed PRs

| PR | Description |
|----|-------------|
| #2–#8 | Infrastructure: CSS Modules, Chart.js, gql.tada, Apollo+Clerk+Router, CI |
| #9–#16 | Server refactoring: type safety, DRY, error handling, RoastService, tests |
| #17–#28 | UI vertical slices: all 9 features implemented |
| #29 | Multi-vendor scraper, suggestedFlavors, ParseSupplierModal, settings save |
| #30 | Server build fix (BeanScrapeResult export) |
| #31 | E2E test infrastructure + Score on Bean Detail |
| #32 | Test restructure, DEVLOG, README, remove .superpowers |
| #33 | Frontend folder restructure (feature-based) |
| #34 | Upload bean matching (bidirectional), inline add bean, nudge banner, E2E tests |

---

## v2 Backlog

- Roast-level suggested flavors (SM lists flavors by roast level)
- Bean dedup/sharing (move suggestedFlavors to UserBean if needed)
- CSV file parsing
- EspressoShot feature
- Welcome/landing page for unauthenticated users
- Heroku + Vercel deployment

---

## Gotchas for New Sessions

- **Local Postgres peer auth**: No password — `postgresql://jakemosher@localhost:5432/dbname`
- **Vite proxy**: `/graphql` → `http://localhost:4000`
- **Commands**: `npm run dev:server` (port 4000), `npm run dev:client` (port 3000), `npm test` from root for both
- **E2E tests**: Seed test DB first (`bash e2e/setup-db.sh`), then `npm run test:e2e`
- **Seed**: `npm run db:seed` for 60 flavors, 4 users, 8 beans, 24 roasts
- **Jest ESM**: Requires `NODE_OPTIONS='--experimental-vm-modules'`
- **gql.tada regen**: `cd client && npx gql.tada generate-output` after schema changes
- **Dev workflow**: ALWAYS include E2E tests when adding/updating features (CLAUDE.md step 4)
- **Git**: NEVER `cd /path && git ...` — ALWAYS `git -C /path/to/repo ...`
