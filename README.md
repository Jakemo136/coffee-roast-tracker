# Coffee Roast Tracker

A web app for tracking and analyzing home coffee roasts. Import Kaffelogic `.klog` files, annotate batches, compare roast curves, and browse your bean library.

![Build Status](#) <!-- TODO: add CI badge -->

---

## What it does

Coffee Roast Tracker is a personal log for Kaffelogic roasts. You upload a `.klog` file (the JSON export from the Kaffelogic roaster), the app parses it, extracts roast events (colour change, first crack, roast end), phase timing (development time, DTR%), and the full temperature/ROR time-series for chart rendering, then stores the roast against a bean in your library.

The bean library is a shared catalog — beans have origin, process, crop year, variety, SCA score, and supplier bag notes. Each user maintains their own library view (`UserBean`) with personal notes and a short name used to auto-match beans when importing a `.klog`. Beans also carry `suggestedFlavors` populated from supplier data or a scraper, which flow through as flavor tag suggestions when you annotate a roast.

The comparison view lets you overlay multiple roast curves for the same bean to track how your technique or profile evolves over time. Roasts can be shared via a UUID-based share link — no login required to view a shared roast.

> **Current state:** The server is feature-complete for v1. The client is in active buildout — auth, upload, roast list, and detail views are in progress. See [STATUS.md](STATUS.md) for the full picture.

---

## Screenshots

<!-- TODO: screenshots -->

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Apollo Client 4, CSS Modules |
| GraphQL codegen | gql.tada (zero-codegen TypeScript inference) |
| Charting | Chart.js + react-chartjs-2 |
| Backend | Node.js, Apollo Server 4, TypeScript |
| Database | PostgreSQL via Prisma |
| Auth | Clerk (JWT validated in Apollo context) |
| File storage | Cloudflare R2 (S3-compatible) |
| Testing (server) | Jest + ts-jest + supertest |
| Testing (client) | Vitest + React Testing Library + MSW |
| E2E testing | Playwright |
| Deploy | Heroku (API + DB), Vercel (frontend) |

---

## Getting Started

### Prerequisites

- Node.js (see `.nvmrc` for the pinned version)
- PostgreSQL running locally
- A [Clerk](https://clerk.com) account with an application configured
- A Cloudflare R2 bucket (or any S3-compatible store)

### 1. Clone and install

```bash
git clone https://github.com/Jakemo136/coffee-roast-tracker.git
cd coffee-roast-tracker
npm install
```

### 2. Configure environment variables

**Server** — create `server/.env`:

```env
DATABASE_URL=postgresql://jakemosher@localhost:5432/coffee_roast_tracker
CLERK_SECRET_KEY=sk_...
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=...
R2_PUBLIC_URL=https://...
```

**Server tests** — create `server/.env.test`:

```env
DATABASE_URL=postgresql://jakemosher@localhost:5432/coffee_roast_tracker_test
```

Create the test database manually:

```bash
createdb coffee_roast_tracker_test
```

**Client** — create `client/.env.local`:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_...
VITE_API_URL=http://localhost:4000
```

### 3. Migrate and seed

```bash
npm run db:migrate   # apply all Prisma migrations
npm run db:seed      # seed with 3 users, 8 beans, 24 roasts
```

### 4. Start dev servers

```bash
npm run dev:server   # Apollo Server on :4000, hot reload via tsx watch
npm run dev:client   # Vite on :3000, proxies /graphql to :4000
```

---

## Project Structure

```
coffee-roast-tracker/
├── client/                  # React + Vite frontend
│   ├── src/
│   │   ├── components/      # Shared UI primitives and layout
│   │   ├── pages/           # Route-level page components
│   │   └── App.tsx          # Route definitions
│   └── test/
│       └── mocks/
│           └── handlers.ts  # MSW GraphQL handlers for tests
├── server/                  # Apollo Server + Prisma backend
│   ├── prisma/
│   │   └── schema.prisma    # Source of truth for data models
│   └── src/
│       ├── lib/             # klogParser, validateKlog
│       ├── resolvers/       # GraphQL resolvers
│       ├── utils/           # r2.ts, auth helpers
│       └── schema.ts        # GraphQL type definitions
├── e2e/                     # Playwright end-to-end tests
├── CLAUDE.md                # AI agent instructions and architecture notes
└── STATUS.md                # Detailed feature status
```

---

## Available Scripts

Run from the repo root unless noted.

| Script | Description |
|---|---|
| `npm run dev:server` | Start the API server with hot reload |
| `npm run dev:client` | Start the Vite dev server on port 3000 |
| `npm run build` | Production build for all workspaces |
| `npm run lint` | Lint all workspaces |
| `npm run db:migrate` | Apply pending Prisma migrations |
| `npm run db:seed` | Seed the database with sample data |
| `npm run db:generate` | Regenerate the Prisma client after schema changes |
| `npm test` | Run server then client unit tests sequentially |
| `npm run test:e2e:setup` | Create and migrate the E2E test database |
| `npm run test:e2e` | Run Playwright E2E tests |

**Server only** (run from `server/`):

| Script | Description |
|---|---|
| `npm test` | Run all server tests once |
| `npm run test:watch` | Watch mode |
| `npm run test:coverage` | With coverage report |
| `npx prisma studio` | Visual database browser |
| `npx prisma migrate dev` | Create and apply a new migration |

**Client only** (run from `client/`):

| Script | Description |
|---|---|
| `npm test` | Run all client tests once |
| `npm run test:watch` | Watch mode |
| `npm run test:coverage` | With coverage report |

---

## Testing

### Server — 55 tests across 7 suites

The server suite uses Jest + ts-jest + supertest against a real PostgreSQL test database. `globalSetup` runs `prisma migrate reset --force` before the suite so each run starts clean.

```bash
cd server && npm test
```

Coverage includes: `.klog` parsing (event markers, temps, curves, truncation), `.kpro` extraction, file validation, `uploadRoastLog`, `downloadProfile`, `previewRoastLog`, and bean resolver logic.

### Client — 3 tests (buildout in progress)

The client suite uses Vitest + React Testing Library in a jsdom environment. MSW intercepts GraphQL requests at the network boundary — add handlers in `client/test/mocks/handlers.ts` as you build out components.

```bash
cd client && npm test
```

### E2E

Playwright tests live in `e2e/`. Run `npm run test:e2e:setup` once to create and migrate the E2E database, then `npm run test:e2e`.

---

## Architecture Notes

**Auth** — Clerk issues JWTs. The Apollo context middleware (`server/src/context.ts`) verifies the token on every request, upserts the `User` row (keyed on `clerkId`), and sets `userId` in context. All queries and mutations call `requireAuth()` and are scoped to that `userId` — data never crosses users.

**Sharing** — Each roast has a UUID `shareToken`. `toggleRoastSharing` flips `isShared`. The `roastByShareToken` query is unauthenticated and checks `isShared: true` before returning anything.

**Temperatures** — All values stored in Celsius (Kaffelogic native). Fahrenheit conversion is UI-only, driven by `User.tempUnit`. The user can toggle the preference via `updateTempUnit`.

**DTR%** — Development-time ratio is derived client-side (`developmentTime / totalDuration`). The `developmentPercent` field parsed from the `.klog` is also stored as a cross-check, but the displayed value is always calculated.

**Bean catalog** — `Bean` is a shared table (no `userId`). Per-user data (notes, short name) lives on `UserBean`. The `shortName` field is used for case-insensitive auto-matching when `previewRoastLog` parses a `.klog` header.

**`suggestedFlavors`** — A `String[]` on `Bean` populated from supplier bag notes or a multi-vendor scraper. These flow to the client as flavor tag suggestions when annotating a roast. Users can accept, ignore, or add their own tags.

**Flavor descriptors** — `FlavorDescriptor` is a seeded reference table of named flavors (Floral, Citrus, Berry, Cocoa, etc.) with categories and hex colors. `RoastFlavor` is the join table linking a roast to its applied descriptors. Custom descriptors are supported via `isCustom: true`.

**`.kpro` files** — Not stored separately. The `.kpro` content is extracted on demand from the stored `.klog` by `extractKproContent()`, which filters to the subset of headers that define a Kaffelogic profile. `RoastProfile.fileKey`/`fileName` columns are vestigial and set to empty strings.

**File storage** — Roast `.klog` (and CSV, once supported) files are uploaded to Cloudflare R2. Presigned download URLs (1-hour expiry) are generated server-side in `src/utils/r2.ts`.

**CSV support** — The `FileType.CSV` enum exists but there is no parser yet. This is deferred post-v1.

**EspressoShot** — The model is scaffolded (dose, yield, time, TDS) but has no resolvers or UI. Deferred to v2.

---

## Contributing

This is a hobby project, but if you're poking around:

- **Commits:** [Conventional Commits](https://www.conventionalcommits.org/) — `type(scope): description` in imperative mood, max 50 characters on the subject line
  - Common types: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`, `ci`, `perf`
- **Branches:** `type/short-description` (e.g. `feat/roast-detail`, `fix/parser-edge-case`)
- **PRs:** Never push directly to `main`. Open a PR via `gh pr create`. One logical change per branch.
- **Tests:** Run the relevant test suite before opening a PR. New behavior needs a test.

---

## License

MIT
