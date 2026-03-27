# Coffee Roast Tracker — Project Status

> Last updated: 2026-03-26 (client buildout starting)

## Server — Feature-complete for v1

### Data Layer (Prisma)

| Item | Status | Notes |
|------|--------|-------|
| User model | Done | `clerkId`, `tempUnit` (CELSIUS/FAHRENHEIT) |
| Bean model | Done | Shared catalog (no userId); `name`, `origin`, `process`, `cropYear` |
| UserBean join | Done | Per-user library with `notes`, `shortName`; unique on `(userId, beanId)` |
| Roast model | Done | Full Kaffelogic fields: event times/temps, phase data, JSON chart columns |
| RoastFile model | Done | `fileKey`, `fileName`, `fileType` (KLOG/CSV) |
| RoastProfile model | Done | One-to-one with Roast; stores `profileShortName`, `profileDesigner`, `profileType`. `fileKey`/`fileName` still in schema but unused — `.kpro` extracted on demand |
| EspressoShot model | Scaffolded | Fields defined, no resolvers or UI — deferred to v2 |
| Migrations | Done | 4 applied: initial, bean refactor, klog field update, add_userbean_shortname |
| Seed data | Done | 3 users, 8 beans, 24 roasts with procedural time-series/curve data |

### GraphQL API

| Query/Mutation | Status | Notes |
|----------------|--------|-------|
| `myBeans` | Done | Returns `[UserBean!]!` with nested bean |
| `myRoasts` | Done | List view — excludes large JSON chart fields |
| `roastById` | Done | Full detail including chart data |
| `roastsByBean` | Done | User's roasts for a specific bean |
| `roastsByIds` | Done | Batch fetch for comparison views |
| `roastByShareToken` | Done | Public, no auth — checks `isShared: true` |
| `downloadProfile` | Done | On-demand `.kpro` extraction from stored `.klog` — returns `{ fileName, content }` |
| `previewRoastLog` | Done | Parses .klog, matches bean by `UserBean.shortName` (case-insensitive) |
| `createBean` | Done | Creates bean + auto-adds to user library |
| `addBeanToLibrary` | Done | Link existing bean to user, accepts `shortName` |
| `updateUserBean` | Done | Update per-user notes and `shortName` |
| `removeBeanFromLibrary` | Done | Remove from user library |
| `createRoast` | Done | Full create with all fields |
| `updateRoast` | Done | User-scoped update |
| `deleteRoast` | Done | User-scoped delete |
| `toggleRoastSharing` | Done | Flips `isShared`, preserves `shareToken` |
| `uploadRoastProfile` | Done | Upsert; assumes KAFFELOGIC |
| `uploadRoastLog` | Done | Validate + parse .klog + create Roast/RoastFile/RoastProfile + R2 upload |
| `updateTempUnit` | Done | Set user's display preference |

### Auth & Infrastructure

| Item | Status | Notes |
|------|--------|-------|
| Clerk JWT validation | Done | `context.ts` — verifies token, upserts User, sets `userId` |
| `requireAuth` helper | Done | Throws if no `userId` in context |
| R2 `getDownloadUrl` | Done | `src/utils/r2.ts` — presigned download URLs (1hr expiry) |
| R2 `uploadFile` | Done | `src/utils/r2.ts` — upload raw files to R2 |
| R2 `getFileContent` | Done | `src/utils/r2.ts` — fetch stored file content as string |
| `.klog` file parsing | Done | `src/lib/klogParser.ts` — pure function, truncates post-roast-end data |
| `.klog` file validation | Done | `src/lib/validateKlog.ts` — extension, header, time-series checks |
| `.kpro` extraction | Done | `extractKproContent()` in `klogParser.ts` — filters `.klog` headers to `.kpro` key subset |
| CSV file parsing | **Not done** | `FileType.CSV` enum exists, no parser |

### Server Testing — 55 tests, 7 suites

| Item | Status | Notes |
|------|--------|-------|
| Jest + ts-jest config | Done | ESM, `--experimental-vm-modules` |
| Test DB setup | Done | `globalSetup` runs `prisma migrate reset --force` |
| Placeholder test | Done | 1 test — verifies DB connection |
| Parser tests | Done | 26 tests — event markers, temps, curves, truncation, partial failure, profileShortName/profileDesigner |
| `extractKproContent` tests | Done | 6 tests — key filtering, exclusion, format, round-trip fidelity, null cases |
| Validation tests | Done | 4 tests — valid file, wrong extension, missing header, empty file |
| `uploadRoastLog` integration | Done | 4 tests — happy path, duplicate, invalid file, missing bean |
| `downloadProfile` integration | Done | 6 tests — happy path, content match, unauth, wrong user, bad ID, no klog |
| Bean resolver tests | Done | 3 tests — shortName in create/update/add |
| `previewRoastLog` integration | Done | 6 tests — match, no match, case-insensitive, metadata, invalid, unauth |

---

## Client — Buildout in progress

### Decisions Made

| Decision | Choice | Notes |
|----------|--------|-------|
| Styling | CSS Modules + CSS Variables | No runtime dependency; design tokens in `tokens.css` |
| Chart library | Chart.js + react-chartjs-2 | Canvas rendering, LTTB decimation, plugin ecosystem. See `docs/chart-research/recommendation.md` |
| GraphQL codegen | gql.tada | Zero-codegen TypeScript inference |

### Wiring & Providers

| Item | Status | Notes |
|------|--------|-------|
| CSS Modules + CSS Variables | Done (PR #2) | `tokens.css` design tokens, `reset.css`, Vite CSS Module types. Branch: `feat/css-modules-setup` |
| Chart.js install | **Next** | Install `chart.js`, `react-chartjs-2`, `chartjs-plugin-annotation`, `chartjs-plugin-zoom` |
| gql.tada setup | **Next** | Install, configure with server GraphQL schema, verify type inference |
| Apollo Client setup | **Next (after above)** | Wire `ApolloProvider` with `HttpLink` + Clerk JWT auth header |
| Clerk provider | **Next (after above)** | Wire `ClerkProvider`, auth context |
| React Router | **Next (after above)** | Wire `BrowserRouter`, define route structure |

### Pages & Features

| Feature | Status | Notes |
|---------|--------|-------|
| App shell / layout | **Not done** | `main.tsx` imports global styles, renders placeholder |
| Auth (sign in/up/out) | **Not done** | — |
| Dashboard / roast list | **Not done** | — |
| Roast detail view | **Not done** | — |
| Roast comparison view | **Not done** | `roastsByIds` query ready on server |
| Bean library | **Not done** | — |
| File upload (`.klog`) | **Not done** | Server `uploadRoastLog` + `previewRoastLog` ready; needs client UI with preview step |
| Profile download (`.kpro`) | **Not done** | Server `downloadProfile` ready; needs client trigger |
| Share link UI | **Not done** | Server sharing works; needs client UI |
| Settings (temp unit) | **Not done** | — |
| Roast curve charts | **Not done** | Chart.js chosen; not yet installed |

### Client Testing — 3 tests, 2 suites

| Item | Status | Notes |
|------|--------|-------|
| Vitest + RTL + MSW config | Done | `vitest.config.ts`, `test/setup.ts`, MSW server |
| MSW handlers | Empty | `test/mocks/handlers.ts` — ready for operation stubs |
| Placeholder test | Done | Renders a div |
| CSS Modules test | Done | Verifies scoped class names work with Vitest |
| Component tests | **Not done** | — |

---

## DevOps & Deployment

| Item | Status | Notes |
|------|--------|-------|
| GitHub repo | Done | `Jakemo136/coffee-roast-tracker` (private) |
| Root monorepo scripts | Done | `dev:server`, `dev:client`, `build`, `test`, `db:*` |
| `.gitignore` | Done | Covers `node_modules`, `.env`, `.env.test`, `coverage/`, etc. |
| `CLAUDE.md` | Done | Commands, architecture, conventions, git workflow |
| GitHub Actions CI | Done | `.github/workflows/ci.yml` — client (required) + server (allow-fail). **TODO:** (1) Server job uses `prisma migrate deploy` but test globalSetup uses `reset --force` — verify no conflict. (2) Add R2/Clerk secrets to GitHub Actions when integration tests need them. (3) Remove `continue-on-error: true` from server job once green. |
| Heroku Procfile | **Not done** | Needed for server deploy |
| Vercel config | **Not done** | Needed for client deploy |
| Client `.env.example` | **Not done** | Will need `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_API_URL` |

---

## Next Steps (in order)

Each step is a separate feature branch + PR with code review.

1. ~~**`feat/chartjs-install`**~~ — Merged (PR #5)
2. **`feat/gql-tada-setup`** — Install gql.tada, configure with server schema, verify types (PR #6 open)
3. **`feat/client-providers`** — Wire Apollo + Clerk + Router providers, define route structure (PR #4 open)
4. **`feat/auth-flow`** — Clerk sign-in/sign-up pages, protected routes (PR #7 open)
5. **`feat/upload-flow`** — File upload UI with preview step (previewRoastLog → confirm bean → uploadRoastLog)
6. **`feat/roast-list`** — Dashboard showing user's roasts (myRoasts query)
7. **`feat/roast-detail`** — Single roast view with Chart.js curve rendering
8. **`feat/roast-comparison`** — Multi-roast overlay chart

---

## Git Workflow

- Never push directly to `main`
- Feature branches: `type/short-description`
- Before committing: `code-reviewer` and `code-simplifier` subagents review the diff
- Open PRs via `gh pr create`

---

## Uncommitted Work

The following changes exist locally but are not yet committed to any branch:

| File | Content | Target branch |
|------|---------|---------------|
| `CLAUDE.md` | Updated git + development workflow instructions | `docs/workflow-update` |
| `DEVLOG.md` | Chart library evaluation entry + kpro extraction entry | `docs/devlog-updates` |
| `docs/chart-research/*.md` | Recharts, Chart.js, Visx evaluations + recommendation | `docs/chart-research` |

These should be committed on a `docs/*` branch before starting the next feature branch.

---

## Gotchas & Context for New Sessions

- **Apollo Server standalone mode**: Uses `startStandaloneServer` (not Express middleware). Use `ApolloServer.executeOperation()` for resolver tests.
- **Prisma 7 config**: `prisma.config.ts` at `server/` root. `datasource.url` set there via dotenv, not in `schema.prisma`.
- **Prisma AI agent safety**: `prisma migrate reset --force` requires `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION` env var. Already set in `server/test/global-setup.ts`.
- **Local Postgres uses peer auth**: No password — `postgresql://jakemosher@localhost:5432/dbname`. Test DB created manually via `createdb`.
- **Jest ESM quirks**: `import.meta.url` doesn't work in Jest `globalSetup`. Uses `process.cwd()` instead.
- **Vite proxy**: `client/vite.config.ts` proxies `/graphql` to `http://localhost:4000`.
- **`.kpro` extracted on demand**: Not stored separately. `RoastProfile.fileKey`/`fileName` columns are vestigial — set to empty strings.
- **`downloadUrl` removed from `RoastProfile` GraphQL type**: Replaced by `downloadProfile(roastId)` query.
- **`previewRoastLog` is read-only**: Parses `.klog` and suggests a bean match, no DB writes. Client calls it first, then `uploadRoastLog` with confirmed `beanId`.
- **Test commands**: `cd server && npm test` for server, `cd client && npm test` for client, `npm test` from root for both.
- **Open PR**: #2 (`feat/css-modules-setup`) — CSS Modules + CSS Variables. Needs merge before next client branches.
- **Pre-commit review**: Before committing, fire off `code-reviewer` and `code-simplifier` subagents in parallel to review the diff.
