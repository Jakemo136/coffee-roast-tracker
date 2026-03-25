# Coffee Roast Tracker — Project Status

> Last updated: 2026-03-25 (post parser + upload mutation)

## Server

### Data Layer (Prisma)

| Item | Status | Notes |
|------|--------|-------|
| User model | Done | `clerkId`, `tempUnit` (CELSIUS/FAHRENHEIT) |
| Bean model | Done | Shared catalog (no userId); `name`, `origin`, `process`, `cropYear` |
| UserBean join | Done | Per-user library with `notes`; unique on `(userId, beanId)` |
| Roast model | Done | Full Kaffelogic fields: event times/temps, phase data, JSON chart columns |
| RoastFile model | Done | `fileKey`, `fileName`, `fileType` (KLOG/CSV) |
| RoastProfile model | Done | One-to-one with Roast; `profileType` (KAFFELOGIC only v1) |
| EspressoShot model | Scaffolded | Fields defined, no resolvers or UI — deferred to v2 |
| Migrations | Done | 3 applied: initial, bean refactor, klog field update |
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
| `updateTempUnit` | Done | Set user's display preference |

### Auth & Infrastructure

| Item | Status | Notes |
|------|--------|-------|
| Clerk JWT validation | Done | `context.ts` — verifies token, upserts User, sets `userId` |
| `requireAuth` helper | Done | Throws if no `userId` in context |
| R2 client + `getDownloadUrl` | Done | `src/utils/r2.ts` — presigned URLs (1hr expiry) |
| R2 client + `uploadFile` | Done | `src/utils/r2.ts` — upload raw files to R2 |
| R2 wired to GraphQL | Partial | `uploadRoastLog` uploads raw .klog to R2; `RoastProfile.downloadUrl` resolver still not wired |
| `.klog` file parsing | Done | `src/lib/klogParser.ts` — pure function, truncates post-roast-end data |
| `.klog` file validation | Done | `src/lib/validateKlog.ts` — extension, header, time-series checks |
| CSV file parsing | **Not done** | `FileType.CSV` enum exists, no parser |
| `uploadRoastLog` mutation | Done | Validates, parses, creates Roast + RoastFile + RoastProfile, uploads raw to R2 |

### Testing

| Item | Status | Notes |
|------|--------|-------|
| Jest + ts-jest config | Done | ESM, `--experimental-vm-modules` |
| Test DB setup | Done | `globalSetup` runs `prisma migrate reset --force` |
| Placeholder test | Done | Verifies DB connection |
| Parser + validation tests | Done | 28 tests against real .klog fixtures |
| `uploadRoastLog` integration tests | Done | 4 tests via `executeOperation()` — happy path, duplicate, invalid file, missing bean |
| Auth/context tests | **Not done** | — |
| Other resolver tests | **Not done** | — |

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
| File upload (`.klog`, `.csv`) | **Not done** | — |
| Profile upload (`.kpro`) | **Not done** | — |
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
| Root monorepo scripts | Done | `dev:server`, `dev:client`, `build`, `test`, `db:*` |
| `.gitignore` | Done | Covers `node_modules`, `.env`, `coverage/`, etc. |
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
4. ~~**File upload strategy**~~ — Decided: client sends raw file content as string, server parses + uploads to R2
5. **Codegen approach** — gql.tada (zero-codegen inference) or GraphQL Code Generator?
6. **Priority** — Client buildout first, or finish server gaps (file parsing, R2 wiring, resolver tests)?

---

## Gotchas & Context for New Sessions

- **Apollo Server standalone mode**: The server uses `startStandaloneServer` (not Express middleware), so there is no Express app to pass to supertest. Use `ApolloServer.executeOperation()` for resolver tests. Supertest is installed for future use if the server is refactored to `expressMiddleware`.
- **Prisma 7 config**: `prisma.config.ts` lives at `server/` root (not `prisma/`). `datasource.url` is set there, not in `schema.prisma`. Seed command is configured via `migrations.seed` in `prisma.config.ts`, not in `package.json`.
- **Prisma AI agent safety**: `prisma migrate reset --force` requires the env var `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION` when run from an AI agent context. This is already set in `server/test/global-setup.ts`.
- **Local Postgres uses peer auth**: No password — connection strings are `postgresql://jakemosher@localhost:5432/dbname`. The test DB (`coffee_roast_tracker_test`) must be created manually via `createdb`.
- **Jest ESM quirks**: `import.meta.url` doesn't work in Jest `globalSetup` files (ts-jest limitation). The global setup uses `process.cwd()` instead, which resolves to the server root where `jest.config.ts` lives.
- **Vite proxy**: `client/vite.config.ts` proxies `/graphql` to `http://localhost:4000` for local dev.
