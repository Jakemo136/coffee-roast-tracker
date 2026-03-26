# Coffee Roast Tracker — Project Status

> Last updated: 2026-03-26 (post shortName + preview)

## Server

### Data Layer (Prisma)

| Item | Status | Notes |
|------|--------|-------|
| User model | Done | `clerkId`, `tempUnit` (CELSIUS/FAHRENHEIT) |
| Bean model | Done | Shared catalog (no userId); `name`, `origin`, `process`, `cropYear` |
| UserBean join | Done | Per-user library with `notes`, `shortName`; unique on `(userId, beanId)` |
| Roast model | Done | Full Kaffelogic fields: event times/temps, phase data, JSON chart columns |
| RoastFile model | Done | `fileKey`, `fileName`, `fileType` (KLOG/CSV) |
| RoastProfile model | Done | One-to-one with Roast; stores `profileShortName`, `profileDesigner`, `profileType`. `fileKey`/`fileName` still in schema but unused — `.kpro` is extracted on demand from stored `.klog` |
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
| `createBean` | Done | Creates bean + auto-adds to user library |
| `addBeanToLibrary` | Done | Link existing bean to user |
| `updateUserBean` | Done | Update per-user notes |
| `removeBeanFromLibrary` | Done | Remove from user library |
| `createRoast` | Done | Full create with all fields |
| `updateRoast` | Done | User-scoped update |
| `deleteRoast` | Done | User-scoped delete |
| `toggleRoastSharing` | Done | Flips `isShared`, preserves `shareToken` |
| `uploadRoastProfile` | Done | Upsert; assumes KAFFELOGIC |
| `uploadRoastLog` | Done | Validate + parse .klog + create Roast/RoastFile/RoastProfile + R2 upload |
| `previewRoastLog` | Done | Parses .klog, matches bean by `UserBean.shortName` |
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

### Testing — 55 tests, 7 suites

| Item | Status | Notes |
|------|--------|-------|
| Jest + ts-jest config | Done | ESM, `--experimental-vm-modules` |
| Test DB setup | Done | `globalSetup` runs `prisma migrate reset --force` |
| Placeholder test | Done | 1 test — verifies DB connection |
| Parser tests | Done | 26 tests — event markers, temps, curves, truncation, partial failure, edge cases, profileShortName, profileDesigner |
| `extractKproContent` tests | Done | 6 tests — key filtering, exclusion, format, round-trip fidelity, null cases |
| Validation tests | Done | 4 tests — valid file, wrong extension, missing header, empty file |
| `uploadRoastLog` integration | Done | 4 tests — happy path, duplicate, invalid file, missing bean |
| `downloadProfile` integration | Done | 6 tests — happy path, content match, unauth, wrong user, bad ID, no klog |
| Bean resolver tests | Done | 3 tests — shortName in create/update/add |
| `previewRoastLog` integration | Done | 6 tests — match, no match, case-insensitive, metadata, invalid, unauth |
| Auth/context tests | **Not done** | — |
| Other resolver tests | **Not done** | Roast CRUD, sharing, etc. |

---

## Client

### Wiring & Providers

| Item | Status | Notes |
|------|--------|-------|
| Apollo Client setup | **Not done** | Package installed (`@apollo/client@^4.1.0`), not configured |
| Clerk provider | **Not done** | Package installed (`@clerk/clerk-react@^5.20.0`), not configured |
| React Router | **Not done** | Package installed (`react-router-dom@^7.4.0`), not configured |
| Styling system | **Not decided** | No CSS framework chosen or installed |
| Chart library | **Not decided** | Needed for roast curves — no library chosen |
| GraphQL codegen | **Not decided** | gql.tada vs GraphQL Code Generator |

### Pages & Features

| Feature | Status | Notes |
|---------|--------|-------|
| App shell / layout | **Not done** | `main.tsx` renders placeholder text only |
| Auth (sign in/up/out) | **Not done** | — |
| Dashboard / roast list | **Not done** | — |
| Roast detail view | **Not done** | — |
| Roast comparison view | **Not done** | `roastsByIds` query ready on server |
| Bean library | **Not done** | — |
| File upload (`.klog`) | **Not done** | Server `uploadRoastLog` + `previewRoastLog` ready; needs client UI with preview step |
| Profile download (`.kpro`) | **Not done** | Server `downloadProfile` ready; needs client trigger |
| Share link UI | **Not done** | Server sharing works; needs client UI |
| Settings (temp unit) | **Not done** | — |
| Roast curve charts | **Not done** | — |

### Testing

| Item | Status | Notes |
|------|--------|-------|
| Vitest + RTL + MSW config | Done | `vitest.config.ts`, `test/setup.ts`, MSW server |
| MSW handlers | Empty | `test/mocks/handlers.ts` — ready for operation stubs |
| Placeholder test | Done | Renders a div |
| Component tests | **Not done** | — |

---

## DevOps & Deployment

| Item | Status | Notes |
|------|--------|-------|
| GitHub repo | Done | `Jakemo136/coffee-roast-tracker` (private) |
| Root monorepo scripts | Done | `dev:server`, `dev:client`, `build`, `test`, `db:*` |
| `.gitignore` | Done | Covers `node_modules`, `.env`, `.env.test`, `coverage/`, etc. |
| `CLAUDE.md` | Done | Commands, architecture, conventions, workflow |
| GitHub Actions CI | **Not done** | — |
| Heroku Procfile | **Not done** | Needed for server deploy |
| Vercel config | **Not done** | Needed for client deploy |
| Client `.env.example` | **Not done** | Will need `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_API_URL` |

---

## Decisions Needed

These are blocking or shaping the client buildout:

1. **Styling** — Tailwind, CSS Modules, or something else?
2. **Chart library** — Recharts, Chart.js, D3, Visx, etc.?
3. **Routing structure** — What pages/views? What URL scheme?
4. **Codegen approach** — gql.tada (zero-codegen inference) or GraphQL Code Generator?
---

## Gotchas & Context for New Sessions

- **Apollo Server standalone mode**: The server uses `startStandaloneServer` (not Express middleware), so there is no Express app to pass to supertest. Use `ApolloServer.executeOperation()` for resolver tests. Supertest is installed for future use if the server is refactored to `expressMiddleware`.
- **Prisma 7 config**: `prisma.config.ts` lives at `server/` root (not `prisma/`). `datasource.url` is set there, not in `schema.prisma`. Seed command is configured via `migrations.seed` in `prisma.config.ts`, not in `package.json`.
- **Prisma AI agent safety**: `prisma migrate reset --force` requires the env var `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION` when run from an AI agent context. This is already set in `server/test/global-setup.ts`.
- **Local Postgres uses peer auth**: No password — connection strings are `postgresql://jakemosher@localhost:5432/dbname`. The test DB (`coffee_roast_tracker_test`) must be created manually via `createdb`.
- **Jest ESM quirks**: `import.meta.url` doesn't work in Jest `globalSetup` files (ts-jest limitation). The global setup uses `process.cwd()` instead, which resolves to the server root where `jest.config.ts` lives.
- **Vite proxy**: `client/vite.config.ts` proxies `/graphql` to `http://localhost:4000` for local dev.
- **`.kpro` files are not stored separately**: They're extracted on demand from the stored `.klog` via `extractKproContent()`. The `RoastProfile` model still has `fileKey`/`fileName` columns (from the original design) but they're set to empty strings — a future migration could remove them.
- **`downloadUrl` removed from `RoastProfile` GraphQL type**: Replaced by the `downloadProfile(roastId)` query which returns file content directly.
- **Test run command**: `cd server && npm test` (from server dir), or `npm test` from root runs both server + client.
- **`previewRoastLog` is read-only**: It parses the `.klog` and suggests a bean match but performs no DB writes. The client calls it first for a preview/confirmation UI, then calls `uploadRoastLog` with the confirmed `beanId`.
