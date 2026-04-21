# Coffee Roast Tracker

Web app for tracking and analyzing home coffee roasts. Upload a Kaffelogic `.klog` file — the app parses the roast curve, extracts event markers (colour change, first crack, roast end) and phase timing (DTR%), stores it against a bean in your library, and lets you overlay multiple roasts to see how your technique evolves.

## Stack

- **Frontend** — React 19, Vite, Apollo Client 4, gql.tada (zero-codegen TS inference), Chart.js, CSS Modules
- **Backend** — Apollo Server 4, Prisma, PostgreSQL, Clerk JWT auth (validated in Apollo context)
- **Storage** — Cloudflare R2 with presigned URLs for `.klog` / `.kpro` downloads
- **Testing** — Vitest + RTL (client), Jest + supertest (server), Playwright (E2E)

## How it works

- **Beans are shared, libraries are per-user.** `Bean` is a global catalog (origin, process, variety, supplier notes). `UserBean` joins user→bean with personal notes and a `shortName` used for case-insensitive auto-matching when parsing a `.klog` header.
- **Community matching on upload.** If the parsed bean isn't in your library, the upload modal searches the full public catalog and offers it as a one-click "add on save."
- **Sharing** is opt-in per-roast (`isShared: true`); public reads use an unauthenticated GraphQL query.
- **Temperatures** are stored in Celsius (Kaffelogic native); °F is a UI-only transform driven by `User.tempUnit`.

## Getting started

```bash
npm install
npm run db:migrate && npm run db:seed   # 3 users, 8 beans, 24 roasts
npm run dev:server                       # API on :4000
npm run dev:client                       # Vite on :3000
```

Env vars: `server/.env` (DATABASE_URL, CLERK_SECRET_KEY, R2_*), `client/.env.local` (VITE_CLERK_PUBLISHABLE_KEY, VITE_API_URL).

## Layout

```
client/   React + Vite frontend
server/   Apollo Server + Prisma backend (Prisma schema is the source of truth)
e2e/      Playwright tests
```

## Tests

```bash
npm test               # server + client
npm run test:e2e       # Playwright (requires test:e2e:setup once)
```

## License

MIT
