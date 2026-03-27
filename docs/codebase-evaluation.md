# Codebase Evaluation — Coffee Roast Tracker

> Generated: 2026-03-27 | Scope: full server + client as of main (all 4 client infra PRs merged)

## Executive Summary

The server backend (~1,100 lines of production code) has strong fundamentals: consistent auth patterns, good test coverage for file parsing and upload flows, and clean Prisma schema design. The client (~300 lines post-merge) is early-stage scaffold with solid provider wiring.

The evaluation found **34 findings** across 5 categories:

| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| DRY Violations | — | — | 5 | 2 |
| Separation of Concerns | — | 3 | 3 | 1 |
| Error Handling | — | 3 | 2 | 1 |
| Performance & Type Safety | — | 5 | 4 | 3 |
| Test Coverage Gaps | — | 4 | 3 | 3 |

---

## 1. DRY Violations

### 1.1 Repeated find-then-guard pattern in resolvers
- **Severity:** Medium
- **Location:** `server/src/resolvers/roast.ts` (lines 229, 253, 271, 418), `server/src/resolvers/bean.ts` (lines 51, 90), `server/src/resolvers/roast.ts` (lines 185, 313)
- **Current state:** 8 instances of `findFirst/findUnique` + null check + `throw new Error("X not found")` across two files
- **Recommendation:** Extract `requireRoast(prisma, id, userId)` and `requireBean(prisma, beanId)` helpers into `server/src/lib/guardHelpers.ts`
- **Effort:** S

### 1.2 Duplicated Prisma include object
- **Severity:** Medium
- **Location:** `server/src/resolvers/roast.ts` — 9 occurrences of `{ bean: true, roastFiles: true, roastProfile: true }`
- **Current state:** Same object literal repeated at lines 70, 78, 92, 107, 145, 194, 243, 282, 396
- **Recommendation:** Hoist to `const ROAST_INCLUDE = { bean: true, roastFiles: true, roastProfile: true } as const` alongside existing `LIST_QUERY_OMIT`
- **Effort:** S

### 1.3 Duplicated inline input types for createRoast/updateRoast
- **Severity:** Medium
- **Location:** `server/src/resolvers/roast.ts` lines 155–175 and 204–224
- **Current state:** Two nearly identical 13-field anonymous type annotations, differing only by `beanId`
- **Recommendation:** Define `RoastInputBase` interface, extend for `CreateRoastInput`
- **Effort:** S

### 1.4 Duplicated curve-parsing try/catch blocks
- **Severity:** Medium
- **Location:** `server/src/lib/klogParser.ts` lines 189–200 and 202–214
- **Current state:** Identical structure for `roast_profile` and `fan_profile` parsing — check header, call `parseCurvePairs`, map, catch + warn
- **Recommendation:** Extract `parseCurveHeader<T>(headers, key, mapper, warnings)` generic helper
- **Effort:** S

### 1.5 Duplicated header-line scanning
- **Severity:** Medium
- **Location:** `server/src/lib/validateKlog.ts` lines 14–25 reimplements header parsing already in `server/src/lib/klogParser.ts` `parseHeaders()`
- **Current state:** Both iterate lines, split on `:`, skip `!`-prefixed lines, break on blank lines
- **Recommendation:** Have `validateKlog` import and call `parseHeaders` from klogParser
- **Effort:** S

### 1.6 Duplicated roastProfile upsert shape
- **Severity:** Low
- **Location:** `server/src/resolvers/roast.ts` lines 373–391 and 426–439
- **Current state:** Both `uploadRoastLog` and `uploadRoastProfile` call `roastProfile.upsert` with identical field shapes
- **Recommendation:** Extract `upsertRoastProfile(prisma, roastId, data)` helper
- **Effort:** S

### 1.7 Repeated `requireAuth(ctx)` + userId pattern
- **Severity:** Low
- **Location:** Every authenticated resolver in `roast.ts` and `bean.ts`
- **Current state:** Pattern is consistent and correct — this is more observation than violation. The repetition is inherent to the resolver pattern.
- **Recommendation:** No change needed — this is addressed by the service layer extraction in Section 2

---

## 2. Separation of Concerns

### 2.1 `roast.ts` is a 451-line monolith handling five responsibilities
- **Severity:** High
- **Location:** `server/src/resolvers/roast.ts`
- **Current state:** Contains 5 query resolvers, 6 mutation resolvers, 3 field resolvers, file I/O via R2, and kpro extraction logic
- **Recommendation:** Extract `server/src/services/roastService.ts` for business logic. Resolvers become thin adapters (~5 lines each). Service owns validation, persistence coordination, and R2 interaction.
- **Effort:** L

### 2.2 `uploadRoastLog` performs 10 sequential operations with no transaction
- **Severity:** High
- **Location:** `server/src/resolvers/roast.ts` lines 285–400
- **Current state:** Auth check, file validation, duplicate check, bean lookup, parse, `roast.create`, R2 upload, `roastFile.create`, `roastProfile.upsert`, re-fetch — three DB writes are not wrapped in `prisma.$transaction`
- **Recommendation:** Extract to `RoastService.uploadRoastLog()`, wrap the three DB writes in `prisma.$transaction` for atomicity
- **Effort:** M

### 2.3 `klogParser.ts` mixes klog parsing with kpro extraction
- **Severity:** High
- **Location:** `server/src/lib/klogParser.ts` lines 371–449
- **Current state:** `KPRO_KEYS` (60 entries) and `extractKproContent()` are a separate domain concern (profile export) living inside the parsing module (data import)
- **Recommendation:** Move to `server/src/lib/kproExtractor.ts`. Import `parseHeaders` from klogParser.
- **Effort:** S

### 2.4 No service/repository layer — resolvers talk directly to Prisma
- **Severity:** Medium
- **Location:** All resolver files
- **Current state:** Authorization ownership checks, query composition, and business rules are all inline in resolvers
- **Recommendation:** Introduce `RoastService` and `BeanService` that encapsulate ownership guards, query logic, and multi-step operations. Resolvers call services.
- **Effort:** L (combined with 2.1)

### 2.5 `createBean` has two non-atomic DB writes
- **Severity:** Medium
- **Location:** `server/src/resolvers/bean.ts` lines 33–41
- **Current state:** `bean.create` then `userBean.create` — if the second fails, an orphaned `Bean` record is left
- **Recommendation:** Wrap in `prisma.$transaction`
- **Effort:** S

### 2.6 Field resolvers are redundant with eager `include`
- **Severity:** Medium
- **Location:** `server/src/resolvers/roast.ts` lines 443–450, `server/src/resolvers/bean.ts` lines 103–113
- **Current state:** Every query already passes `include: { bean: true, roastFiles: true, roastProfile: true }`, making the field resolvers dead code — but they're a latent N+1 trap if any future query omits `include`
- **Recommendation:** Remove field resolvers (rely on `include`), or replace with DataLoaders and remove `include` from queries
- **Effort:** S (remove) / M (DataLoaders)

### 2.7 `context.ts` upserts on every authenticated request
- **Severity:** Low
- **Location:** `server/src/context.ts` lines 31–35
- **Current state:** Every request with a valid JWT triggers `prisma.user.upsert` — unnecessary write on reads after first login
- **Recommendation:** Add short-lived in-process cache keyed by `clerkId` to skip redundant upserts
- **Effort:** S

---

## 3. Error Handling

### 3.1 All 14 error throws use `new Error()` instead of `GraphQLError`
- **Severity:** High
- **Location:** `server/src/resolvers/roast.ts` (9 throws), `server/src/resolvers/bean.ts` (3 throws), `server/src/context.ts` (1 throw), `server/src/lib/klogParser.ts` (1 throw)
- **Current state:** Clients receive no machine-readable error codes — must string-match on `message`
- **Recommendation:** Replace with `GraphQLError` from the `graphql` package with appropriate `extensions.code`:

| Current Message | Suggested Code |
|----------------|---------------|
| "Authentication required" | `UNAUTHENTICATED` |
| "Roast not found" (4x) | `NOT_FOUND` |
| "Bean not found" (4x) | `NOT_FOUND` |
| Validation errors (3x) | `BAD_USER_INPUT` |
| Duplicate filename | `DUPLICATE_FILE` (custom) |
| klogParser throw | `BAD_USER_INPUT` (at call site) |

- **Effort:** S

### 3.2 UI-specific copy in server error message
- **Severity:** High
- **Location:** `server/src/resolvers/roast.ts` lines 307–310
- **Current state:** `"A roast log with this filename already exists. Do you want to replace it?"` — the prompt is a UI concern
- **Recommendation:** Emit `"A roast log with this filename already exists"` with `extensions: { code: "DUPLICATE_FILE" }`. Client renders the confirmation dialog.
- **Effort:** S

### 3.3 `parseKlog` throws untyped into resolvers
- **Severity:** High
- **Location:** `server/src/lib/klogParser.ts` line 165, called at `roast.ts` lines 33 and 321
- **Current state:** Parser throws plain `Error` which surfaces as `INTERNAL_SERVER_ERROR` instead of `BAD_USER_INPUT`
- **Recommendation:** Wrap `parseKlog` calls in try/catch, re-throw as `GraphQLError` with `BAD_USER_INPUT`
- **Effort:** S

### 3.4 Silent error swallowing in token verification
- **Severity:** Medium
- **Location:** `server/src/context.ts` lines 37–39
- **Current state:** All token verification errors (expired, malformed, network failure to Clerk) are silently caught. Infrastructure errors are indistinguishable from invalid tokens.
- **Recommendation:** Log the error: `console.error("Token verification failed:", err)`
- **Effort:** S

### 3.5 Missing error handling on R2 `getFileContent`
- **Severity:** Medium
- **Location:** `server/src/resolvers/roast.ts` line 126
- **Current state:** `getFileContent` is called with no surrounding try/catch — R2 errors propagate as unhandled `INTERNAL_SERVER_ERROR`
- **Recommendation:** Wrap in try/catch, return `null` or throw a typed error
- **Effort:** S

### 3.6 `findUniqueOrThrow` after create
- **Severity:** Low
- **Location:** `server/src/resolvers/roast.ts` line 394
- **Current state:** Called immediately after `roast.create` — will only fail if the DB is in a catastrophic state. Throws `PrismaClientKnownRequestError` instead of a user-friendly error.
- **Recommendation:** Replace with `findUnique` + explicit null check, or keep and catch the Prisma error
- **Effort:** S

---

## 4. Performance & Type Safety

### 4.1 Active N+1: `Bean.roasts` field resolver
- **Severity:** High
- **Location:** `server/src/resolvers/bean.ts` lines 103–107
- **Current state:** Fires one `roast.findMany` per bean in a list — 20 beans = 20 queries
- **Recommendation:** Add DataLoader or include roasts eagerly in the query
- **Effort:** M

### 4.2 Latent N+1: `Roast` field resolvers
- **Severity:** High
- **Location:** `server/src/resolvers/roast.ts` lines 443–450
- **Current state:** Redundant with `include` on all current queries, but any future query missing `include` silently creates N+1
- **Recommendation:** Remove field resolvers (see 2.6)
- **Effort:** S

### 4.3 Missing composite indexes for common query patterns
- **Severity:** High
- **Location:** `server/prisma/schema.prisma`
- **Current state:** Separate indexes on `userId` and `beanId`, but no composite indexes for `(userId, roastDate)` or `(beanId, userId, roastDate)` which are the actual query patterns
- **Recommendation:** Add `@@index([userId, roastDate(sort: Desc)])` and `@@index([beanId, userId, roastDate(sort: Desc)])`
- **Effort:** S

### 4.4 `as unknown as Prisma.InputJsonValue` triple cast
- **Severity:** High
- **Location:** `server/src/resolvers/roast.ts` lines 341–343
- **Current state:** Suppresses TypeScript entirely — if parser returns non-serializable data, it fails at runtime
- **Recommendation:** Type parser output fields as `Prisma.InputJsonValue | null` directly
- **Effort:** S

### 4.5 `response.Body!` non-null assertion in R2
- **Severity:** High
- **Location:** `server/src/utils/r2.ts` line 48
- **Current state:** AWS SDK types `Body` as `StreamingBlobPayloadOutputTypes | undefined` — assertion hides potential undefined crash
- **Recommendation:** Add explicit null check before `transformToString`
- **Effort:** S

### 4.6 Missing `shortName` index for case-insensitive query
- **Severity:** Medium
- **Location:** `server/prisma/schema.prisma` — `UserBean.shortName` used in `previewRoastLog` with `mode: "insensitive"`
- **Recommendation:** Add `@@index([userId, shortName])` and a raw migration for `lower(short_name)` if case-insensitive performance matters
- **Effort:** S

### 4.7 Unnecessary re-fetch after create in `uploadRoastLog`
- **Severity:** Medium
- **Location:** `server/src/resolvers/roast.ts` lines 393–397
- **Current state:** Full re-fetch with includes after create, when created data is already in hand
- **Recommendation:** Use `include: { bean: true }` on the initial `create`, attach `roastFiles`/`roastProfile` from just-created records
- **Effort:** S

### 4.8 Unsafe `"KAFFELOGIC"` string cast
- **Severity:** Medium
- **Location:** `server/src/resolvers/roast.ts` lines 431, 437
- **Current state:** `input.profileType as "KAFFELOGIC"` — arbitrary string cast to enum literal bypasses validation
- **Recommendation:** Use Prisma's `ProfileType` enum type in the resolver parameter
- **Effort:** S

### 4.9 Fetch-then-write pattern in update/delete/toggle
- **Severity:** Medium
- **Location:** `server/src/resolvers/roast.ts` lines 229, 253, 271
- **Current state:** `findFirst` for auth check, then separate `update`/`delete` — two queries when one would suffice
- **Recommendation:** Use `update({ where: { id, userId } })` with `RecordNotFoundError` catch
- **Effort:** S

### 4.10 Duplicate `shareToken` index
- **Severity:** Low
- **Location:** `server/prisma/schema.prisma`
- **Current state:** `@unique` already creates an index; `@@index([shareToken])` is redundant
- **Recommendation:** Remove `@@index([shareToken])`
- **Effort:** S

### 4.11 `validation.error!` non-null assertion
- **Severity:** Low
- **Location:** `server/src/resolvers/roast.ts` line 29
- **Recommendation:** Use discriminated union return type for `validateKlogFile`
- **Effort:** S

### 4.12 R2 env var assertions at module init
- **Severity:** Low
- **Location:** `server/src/utils/r2.ts` lines 8–9
- **Current state:** `process.env.R2_ACCESS_KEY_ID!` — missing var produces `undefined` as `string`, fails at first API call with a cryptic auth error
- **Recommendation:** Validate at startup with explicit error message
- **Effort:** S

---

## 5. Test Coverage Gaps

### 5.1 Core CRUD resolvers have zero tests
- **Severity:** High
- **Location:** `server/src/resolvers/roast.ts`
- **Missing:** `myRoasts`, `roastById`, `roastsByBean`, `roastsByIds`, `createRoast` (dedicated), `updateRoast`, `deleteRoast`
- **Impact:** The primary data-access paths for the app are untested. Cross-user isolation is particularly important.
- **Effort:** L

### 5.2 Sharing feature is untested
- **Severity:** High
- **Location:** `server/src/resolvers/roast.ts`
- **Missing:** `toggleRoastSharing` and `roastByShareToken` — the public/private boundary
- **Impact:** `isShared: false` must block public access; neither path is tested
- **Effort:** M

### 5.3 `user.ts` resolver has zero tests
- **Severity:** High
- **Location:** `server/src/resolvers/user.ts` — `updateTempUnit`
- **Impact:** Trivial to test, currently zero coverage
- **Effort:** S

### 5.4 `context.ts` and `r2.ts` have zero tests
- **Severity:** High
- **Location:** `server/src/context.ts`, `server/src/utils/r2.ts`
- **Impact:** JWT verification path, user upsert on first login, and all R2 operations are untested
- **Effort:** M

### 5.5 `uploadRoastLog` R2 failure path untested
- **Severity:** Medium
- **Location:** `server/src/resolvers/roast.ts` lines 350–356
- **Missing:** The catch block that appends a warning when `uploadFile` throws is never exercised
- **Effort:** S

### 5.6 `uploadRoastLog` with no profile untested
- **Severity:** Medium
- **Location:** `server/src/resolvers/roast.ts` — the `if (parsed.profileFileName)` branch
- **Missing:** A klog file missing `profile_file_name` should create a roast without a `RoastProfile`
- **Effort:** S

### 5.7 `downloadProfile` when `extractKproContent` returns null untested
- **Severity:** Medium
- **Location:** `server/src/resolvers/roast.ts`
- **Missing:** klog exists but has no profile data — the third null return path
- **Effort:** S

### 5.8 Client `apollo.ts` and `App.tsx` untested
- **Severity:** Low
- **Location:** `client/src/lib/apollo.ts`, `client/src/App.tsx`
- **Impact:** Auth link token injection and route definitions are untested
- **Effort:** S

### 5.9 Placeholder tests should be removed
- **Severity:** Low
- **Location:** `server/src/__tests__/placeholder.test.ts`, `client/src/__tests__/placeholder.test.tsx`
- **Impact:** Test nothing meaningful; inflate test counts
- **Effort:** S

### 5.10 `bean.ts` missing edge case tests
- **Severity:** Low
- **Location:** `server/src/resolvers/bean.test.ts`
- **Missing:** `createBean` without shortName, `updateUserBean` cross-user isolation, `addBeanToLibrary` duplicate handling
- **Effort:** S

---

## 6. Prioritized Refactoring Roadmap

| Priority | Finding | Effort | Impact | Category |
|----------|---------|--------|--------|----------|
| 1 | 5.1 Add CRUD resolver tests (myRoasts, roastById, update, delete, etc.) | L | High | Testing |
| 2 | 3.1 Replace all `throw new Error()` with `GraphQLError` + error codes | S | High | Error Handling |
| 3 | 5.2 Add sharing feature tests (toggleRoastSharing, roastByShareToken) | M | High | Testing |
| 4 | 2.2 Extract `uploadRoastLog` to service + wrap in `$transaction` | M | High | SoC |
| 5 | 4.3 Add composite database indexes for query patterns | S | High | Performance |
| 6 | 2.1 Extract `RoastService` from resolver monolith | L | High | SoC |
| 7 | 4.4 Fix `as unknown as` triple cast — type parser output correctly | S | High | Type Safety |
| 8 | 4.5 Add null check for R2 `response.Body` | S | High | Type Safety |
| 9 | 1.1 Extract find-then-guard helpers | S | Medium | DRY |
| 10 | 1.2 Hoist `ROAST_INCLUDE` constant | S | Medium | DRY |
| 11 | 2.3 Move kpro extraction to its own module | S | Medium | SoC |
| 12 | 3.2 Remove UI copy from server error messages | S | Medium | Error Handling |
| 13 | 2.5 Wrap `createBean` in `$transaction` | S | Medium | SoC |
| 14 | 4.1 Fix Bean.roasts N+1 (DataLoader or remove field resolver) | M | Medium | Performance |
| 15 | 5.3 Add `updateTempUnit` tests | S | Medium | Testing |
| 16 | 5.4 Add `context.ts` and `r2.ts` tests | M | Medium | Testing |
| 17 | 4.10 Remove duplicate `shareToken` index | S | Low | Performance |
| 18 | 5.9 Delete placeholder tests | S | Low | Testing |

**Quick wins (all S effort, high impact):** Items 2, 5, 7, 8 can be done in a single PR and immediately improve error handling, query performance, and type safety.
