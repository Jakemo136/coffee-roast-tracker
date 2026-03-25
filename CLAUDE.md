# Coffee Roast Tracker

## Project Overview

Web app for tracking, analyzing, and sharing home coffee roasts. Users import Kaffelogic `.klog` (JSON) or CSV files, annotate batches, and compare roast phases across beans over time. Optional `.kpro` profile file uploads for sharing.

## Stack

- **Frontend:** React 19 + TypeScript + Vite + Apollo Client 4
- **Backend:** Node.js + Apollo Server 4 (GraphQL)
- **ORM:** Prisma
- **Database:** PostgreSQL
- **Auth:** Clerk (JWT validation in Apollo context)
- **File storage:** Cloudflare R2 (S3-compatible)
- **Deploy:** Heroku (API + DB) + Vercel (frontend)

## Monorepo Layout

```
/client  — React + Vite frontend
/server  — Apollo Server + Prisma backend
```

## Commands

```bash
# Root (runs across workspaces)
npm run dev:server       # Start server with hot reload (tsx watch)
npm run dev:client       # Start Vite dev server
npm run build            # Build all workspaces
npm run db:migrate       # Run Prisma migrations
npm run db:seed          # Seed database
npm run db:generate      # Regenerate Prisma client

# Server
cd server
npx prisma studio        # Visual DB browser
npx prisma migrate dev   # Create + apply migration
npx prisma db seed       # Run seed script

# Client
cd client
npm run dev              # Vite dev server on :3000
npm run build            # Production build
```

## Architecture Notes

- All authenticated queries/mutations are userId-scoped — never return data across users
- Clerk JWT is validated in Apollo context middleware; userId is resolved per request
- Sharing uses UUID shareTokens — public queries validate `isShared: true` before returning
- R2 presigned URLs are generated server-side for profile downloads
- All temperatures stored in Celsius (Kaffelogic native); Fahrenheit is UI-only via user `tempUnit` preference
- DTR% is derived client-side (`developmentTime / totalDuration`), not stored
- EspressoShot model is scaffolded but unimplemented (v1)
- RoastProfile supports KAFFELOGIC only (v1); other roaster types are stubbed as enum comments

## Testing

**Server (Jest + ts-jest + supertest)**

```bash
cd server
npm test              # Run all server tests once
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```

- Requires a `coffee_roast_tracker_test` PostgreSQL database
- Configure `server/.env.test` with `DATABASE_URL` pointing to the test DB
- Jest `globalSetup` runs `prisma migrate reset --force` before the suite
- Uses `--experimental-vm-modules` for ESM support
- Test files: `src/**/*.test.ts`

**Client (Vitest + React Testing Library + MSW)**

```bash
cd client
npm test              # Run all client tests once
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```

- MSW mocks GraphQL responses — add handlers in `client/test/mocks/handlers.ts`
- jsdom environment for DOM rendering
- Test files: `src/**/*.test.{ts,tsx}`

**Both (from root)**

```bash
npm test              # Runs server then client tests sequentially
```

## Conventions

- Server uses ES modules (`"type": "module"`)
- Prisma schema is the source of truth for data models
- GraphQL schema mirrors Prisma models
- Server imports use `.js` extensions in relative paths (Node ESM resolution); client (Vite) does not require extensions

## Workflow

For every task:

1. Implement the change
2. Write or update tests
3. Run the relevant test suite
4. Fix any failures
5. Confirm tests pass before responding that the task is complete
