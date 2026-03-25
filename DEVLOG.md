# DEVLOG

## 2026-03-24 — Initial scaffold

### Summary
Scaffolded the full monorepo structure for Coffee Roast Tracker: a web app for tracking, analyzing, and sharing home coffee roasts with Kaffelogic integration.

### Stack decisions

**React 19 + TypeScript + Vite (frontend):** React 19 is stable with the React Compiler, Server Components, and new hooks (`use`, `useActionState`, `useOptimistic`). Vite is the standard build tool for new React projects — fast HMR, minimal config. No UI built yet; shell only.

**Apollo Server 4 + Apollo Client 4 (GraphQL):** Apollo Client 4 shipped Sept 2025 with smaller bundles, ESM-first packaging, `useSuspenseQuery`, `useFragment`, and the new `dataState` property. Using Apollo over REST because roast comparison queries benefit from GraphQL's flexible field selection — clients can request exactly the phase data they need for comparison views without over-fetching.

**Prisma (ORM):** Type-safe database access with schema-as-source-of-truth. Migrations, seeding, and Prisma Studio for development. Generates TypeScript types from the schema automatically.

**Clerk (auth):** Managed auth with JWT validation. No password storage, no session management code. Clerk handles signup/login flows; we validate JWTs in Apollo context and resolve to a local userId via upsert.

**Cloudflare R2 (file storage):** S3-compatible object storage for `.klog`, `.csv`, and `.kpro` files. Presigned URLs for downloads — files never pass through our server on read. Cost-effective for the expected volume of roast files.

**PostgreSQL on Heroku + Vercel (deploy target):** Heroku for the API + managed Postgres. Vercel for the Vite frontend with edge deployment. Standard split for this kind of app.

### Data model notes

- Every model with user data is scoped by `userId` — all queries enforce ownership
- `Roast.shareToken` is a UUID generated on creation (Prisma `@default(uuid())`), enabling share-by-link without exposing internal IDs
- Phase data fields (`dryingEndTime`, `maillardEndTime`, `firstCrackTime`, `firstCrackTemp`, `developmentTime`, `developmentDeltaTemp`, `roastEndTemp`, `totalDuration`) are nullable floats — not every import format provides all fields
- All temperatures stored in Celsius (Kaffelogic native format); Fahrenheit display is a UI conversion only, never stored
- User `tempUnit` preference (CELSIUS/FAHRENHEIT) controls display only — no temp values are ever persisted in Fahrenheit
- DTR% is not stored; it's derived client-side from `developmentTime / totalDuration`
- `RoastProfile` is one-to-one with `Roast` — upsert on upload replaces any existing profile

### Intentional scope limits (v1)

- **EspressoShot:** Model is scaffolded in Prisma but has no GraphQL resolvers. Will add in a future version when the shot tracking UI is designed.
- **RoastProfile types:** Only `KAFFELOGIC` is active. Enum stubs for ARTISAN, BULLET, KALEIDO, and ROEST are commented in both Prisma and GraphQL schemas for future expansion.
- **`.kpro` file diffing is an explicit non-goal for v1.** Profile comparison means comparing parsed phase data (DTR%, development time, total duration, phase timestamps) across roasts of the same bean — not diffing the raw `.kpro` files themselves.

### Seed data
3 users (Alice, Bob, Carol), 8 beans across different origins and processes, 24 roasts with realistic phase data showing progression (dialing in lighter/darker, noting improvements between roasts). Several roasts have `isShared: true` for testing the public share flow.

---

## 2026-03-25 — Make Bean user-agnostic

### Summary
Refactored `Bean` from a user-owned entity to a shared catalog entity. A bean like "Yirgacheffe Kochere" is a real-world coffee — it shouldn't be locked to a single user. Introduced a `UserBean` join table so users maintain personal bean libraries with their own notes.

### Schema changes
- **Bean:** Removed `userId` and `notes` fields, added `cropYear Int?` for distinguishing harvests
- **UserBean (new):** Join table with `userId`, `beanId`, `notes`, and a `@@unique([userId, beanId])` constraint
- **User:** `beans Bean[]` → `userBeans UserBean[]`

### GraphQL changes
- `myBeans` query now returns `[UserBean!]!` (includes per-user notes alongside bean data)
- `createBean` mutation creates the Bean and auto-adds it to the caller's library (returns `UserBean`)
- New mutations: `addBeanToLibrary`, `updateUserBean`, `removeBeanFromLibrary`
- `createRoast` no longer validates bean ownership — any user can roast any bean, the roast itself is user-scoped

### Seed data updated
- Beans are created without userId; `cropYear` added to most beans
- UserBean records link users to their beans with personal tasting notes
- Bob now also has Ethiopia Yirgacheffe in his library (shared bean, different notes)
- 3 users, 8 beans, 11 user-bean links, 24 roasts

### Prisma 7 notes
- `prisma.config.ts` lives at `server/` root (not inside `prisma/`) — Prisma 7 expects it there
- `datasource.url` is configured in `prisma.config.ts`, not in `schema.prisma` (removed in Prisma 7)
- Seed command configured via `migrations.seed` in `prisma.config.ts` (replaces `package.json` `prisma.seed`)
- `PrismaClient` requires `@prisma/adapter-pg` with `{ connectionString }` — no more `datasourceUrl` constructor option

---

## 2026-03-25 — Update Roast fields from .klog analysis

### Summary
Revised the Roast data model based on analysis of an actual Kaffelogic `.klog` file. Several original fields didn't map to real `.klog` event markers; replaced them with fields that directly correspond to the file format.

### Fields removed
- **`dryingEndTime`**: No discrete event marker exists in `.klog` format — drying phase end isn't logged as a timestamped event
- **`maillardEndTime`**: Incorrect terminology. Kaffelogic uses `!colour_change` as the event marker, not "Maillard end"
- **`developmentDeltaTemp`**: Not logged in `.klog` files. Derivable client-side as `roastEndTemp - firstCrackTemp` if needed

### Fields added (Roast)
- **`ambientTemp`** (Float?): From `ambient_temperature` header — ambient °C at time of roast
- **`roastingLevel`** (Float?): KL roasting level from header metadata, e.g. 4.3
- **`tastingNotes`** (String?): From `tasting_notes` header — distinct from user `notes` (which are post-roast journal entries)
- **`colourChangeTime`** (Float?): Seconds, from `!colour_change` event marker
- **`colourChangeTemp`** (Float?): °C at the `!colour_change` timestamp (looked up from time-series)
- **`roastEndTime`** (Float?): Seconds, from `!roast_end` event marker
- **`developmentPercent`** (Float?): Logged directly in `.klog` as `!development_percent` (e.g. 13.7606). More reliable than calculating DTR% client-side from `developmentTime / totalDuration`
- **`timeSeriesData`** (Json?): Full parsed time-series rows for chart rendering — `[{time, spotTemp, temp, meanTemp, profileTemp, profileROR, actualROR, desiredROR, powerKW, actualFanRPM}]`. Stored as a single JSON blob; consumed whole for charting, never queried row-by-row
- **`roastProfileCurve`** (Json?): Decoded `roast_profile` header — `[{time, temp}]` target curve
- **`fanProfileCurve`** (Json?): Decoded `fan_profile` header — `[{time, rpm}]` target curve

### Fields added (RoastProfile)
- **`profileShortName`** (String?): From `profile_short_name` header, e.g. "EGB"
- **`profileDesigner`** (String?): From `profile_designer` header, e.g. "jakemo"

### Performance note
`timeSeriesData`, `roastProfileCurve`, and `fanProfileCurve` are excluded from list query resolvers (`myRoasts`, `roastsByBean`, `roastsByIds`) via Prisma `omit`. Only single-roast queries (`roastById`, `roastByShareToken`) return the full chart data.

### GraphQL changes
- `JSON` scalar added for time-series and curve fields
- `CreateRoastInput` / `UpdateRoastInput` updated to match new field set
- `RoastProfile` type gains `profileShortName` and `profileDesigner`

### What informed these decisions
All field naming and sourcing decisions came from analyzing an actual `.klog` file exported from a Kaffelogic Nano 7e. The `.klog` format uses `!`-prefixed inline rows for event markers and header key-value pairs for metadata — this is the authoritative source for what data is available

---

## 2026-03-25 — Remove premature multi-roaster abstraction

### Summary
Removed commented-out enum stubs (ARTISAN, BULLET, KALEIDO, ROEST) from the `ProfileType` enum in both Prisma and GraphQL schemas. The data model is built directly on `.klog` structure and makes Kaffelogic-specific assumptions throughout — field names, event markers, curve encoding, and header metadata all map 1:1 to the `.klog` format. I realized I have no idea how roast logs are structured when coming from other roaster ecosystems and therefore could not reasonably, at this time, expect to support other file types.

### Rationale
- Supporting other roaster log formats (Artisan, Bullet, Kaleido, Roest) would require a separate design effort and likely a different or extended data model — not a simple enum addition
- Commented-out enum values overpromised future compatibility and implied the current schema could handle arbitrary formats
- `ProfileType` enum retained as a single-value enum (`KAFFELOGIC`) to preserve the extension point without overpromising

---

## 2026-03-25 — Implement .klog parser and upload mutation

### Summary
Added server-side `.klog` file parsing and validation as pure functions, plus an `uploadRoastLog` GraphQL mutation that validates, parses, stores the raw file to R2, and creates Roast + RoastFile records in a single operation.

### Design decisions

**Parser as pure function:** `parseKlog(fileContent: string)` has no DB or R2 dependencies — it takes a string and returns structured data. This makes it trivially testable and reusable outside the GraphQL layer.

**Discard post-roast data:** All time-series rows after `!roast_end` are discarded during parsing. Cooldown data is not useful for roast analysis. `totalDuration` equals `roastEndTime`, not the final timestamp in the raw file.

**Partial failure strategy:** If time-series data, roast profile curve, or fan profile curve fail to parse, the field is set to `null` and a descriptive message is pushed to `parseWarnings`. Scalar fields (event markers, header metadata) are always extracted if possible. The parser only throws if the file has no recognizable headers AND no time-series data — i.e., it's not a `.klog` file at all.

**parseWarnings surfaced to client:** `UploadRoastResult` returns both the created `Roast` and a `parseWarnings: [String!]!` array. The client can display these as non-blocking warnings ("Profile curve could not be parsed") without failing the upload.

**Duplicate detection:** The resolver checks for an existing roast with the same `fileName` + `userId`. If found, it returns a descriptive error rather than silently replacing. The client is responsible for confirmation UX ("A roast log with this filename already exists. Do you want to replace it?") — the server does not auto-replace.

**File content as string (not Upload scalar):** Apollo Server standalone mode doesn't support the `Upload` scalar (requires graphql-upload + Express middleware). The mutation accepts `fileName: String!` and `fileContent: String!` — the client reads the file and sends content directly. `.klog` files are plain text and small (typically <100KB), so this is practical.

### Test fixtures
Real `.klog` files in `/mocks/sample-roasts/` (exported from a Kaffelogic Nano 7e) are used as the primary test fixtures. Parser tests assert against actual values from these files — not synthetic data — ensuring the parser handles real-world format variations.

### Files added
- `server/src/lib/klogParser.ts` — Pure parser: headers, time-series, event markers, curve decoding
- `server/src/lib/validateKlog.ts` — Pre-parse validation (extension, header presence, time-series header)
- `server/src/lib/klogParser.test.ts` — Parser tests against real .klog fixtures
- `server/src/lib/validateKlog.test.ts` — Validation tests

### Files modified
- `server/src/schema/typeDefs.ts` — Added `UploadRoastResult` type and `uploadRoastLog` mutation
- `server/src/resolvers/roast.ts` — Added `uploadRoastLog` resolver
- `server/src/utils/r2.ts` — Added `uploadFile` function
