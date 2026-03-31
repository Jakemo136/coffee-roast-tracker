# Codebase Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Address all 34 findings from `docs/codebase-evaluation.md` — standardize error handling, fix type safety issues, add missing tests, extract service layer, and clean up DRY violations.

**Architecture:** Five independent phases, each a separate feature branch and PR. Phases 1–3 can run in parallel (no shared files). Phase 4 depends on Phases 1–3. Phase 5 (tests) can partially overlap with Phase 4.

**Tech Stack:** Node.js, TypeScript, Apollo Server 4, Prisma 7, GraphQL, Jest, Vitest

---

## Phase Overview

| Phase | Branch | Findings Addressed | Parallelizable With |
|-------|--------|-------------------|-------------------|
| 1 | `refactor/error-handling` | 3.1, 3.2, 3.3, 3.4, 3.5, 3.6 | Phases 2, 3 |
| 2 | `refactor/type-safety-perf` | 4.3–4.12, 2.5, 2.6, 2.7 | Phases 1, 3 |
| 3 | `refactor/dry-extractions` | 1.1–1.6, 2.3, 1.4, 1.5 | Phases 1, 2 |
| 4 | `refactor/service-layer` | 2.1, 2.2, 2.4, 4.1, 4.2, 4.7, 4.9 | After 1–3 merged |
| 5 | `test/coverage-gaps` | 5.1–5.10 | After Phase 4 (or partially after 1–3) |

---

## Phase 1: Error Handling Standardization

**Branch:** `refactor/error-handling`
**Findings:** 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
**Files:**
- Modify: `server/src/context.ts`
- Modify: `server/src/resolvers/roast.ts`
- Modify: `server/src/resolvers/bean.ts`
- Modify: `server/src/utils/r2.ts`

### Task 1.1: Replace `requireAuth` with GraphQLError

**Files:**
- Modify: `server/src/context.ts`

- [ ] **Step 1: Update requireAuth to throw GraphQLError**

```ts
// server/src/context.ts — replace the requireAuth function and add import
import { GraphQLError } from "graphql";

export function requireAuth(ctx: Context): string {
  if (!ctx.userId) {
    throw new GraphQLError("Authentication required", {
      extensions: { code: "UNAUTHENTICATED" },
    });
  }
  return ctx.userId;
}
```

- [ ] **Step 2: Log token verification errors instead of swallowing**

In `createContext`, change the catch block:

```ts
    } catch (err) {
      console.error("Token verification failed:", err);
    }
```

- [ ] **Step 3: Run tests to verify nothing breaks**

Run: `cd server && npm test`
Expected: All 55 tests pass. Tests that check for "Authentication required" errors will still pass because GraphQLError extends Error.

- [ ] **Step 4: Commit**

```
git add server/src/context.ts
git commit -m "refactor(server): use GraphQLError for auth errors, log token failures"
```

### Task 1.2: Replace all `throw new Error()` in roast resolvers

**Files:**
- Modify: `server/src/resolvers/roast.ts`

- [ ] **Step 1: Add GraphQLError import**

```ts
import { GraphQLError } from "graphql";
```

- [ ] **Step 2: Replace each throw**

Apply these replacements throughout the file:

| Line | Current | Replacement |
|------|---------|-------------|
| 29 | `throw new Error(validation.error!)` | `throw new GraphQLError(validation.error!, { extensions: { code: "BAD_USER_INPUT" } })` |
| 185 | `throw new Error("Bean not found")` | `throw new GraphQLError("Bean not found", { extensions: { code: "NOT_FOUND" } })` |
| 233 | `throw new Error("Roast not found")` | `throw new GraphQLError("Roast not found", { extensions: { code: "NOT_FOUND" } })` |
| 257 | `throw new Error("Roast not found")` | `throw new GraphQLError("Roast not found", { extensions: { code: "NOT_FOUND" } })` |
| 275 | `throw new Error("Roast not found")` | `throw new GraphQLError("Roast not found", { extensions: { code: "NOT_FOUND" } })` |
| 299 | `throw new Error(validation.error ?? ...)` | `throw new GraphQLError(validation.error ?? "Invalid .klog file", { extensions: { code: "BAD_USER_INPUT" } })` |
| 307–309 | `"A roast log with this filename already exists. Do you want to replace it?"` | `throw new GraphQLError("A roast log with this filename already exists", { extensions: { code: "DUPLICATE_FILE" } })` |
| 317 | `throw new Error("Bean not found")` | `throw new GraphQLError("Bean not found", { extensions: { code: "NOT_FOUND" } })` |
| 421 | `throw new Error("Roast not found")` | `throw new GraphQLError("Roast not found", { extensions: { code: "NOT_FOUND" } })` |

- [ ] **Step 3: Wrap `parseKlog` calls in try/catch**

At line 33 (`previewRoastLog`) and line 321 (`uploadRoastLog`), wrap:

```ts
let parsed;
try {
  parsed = parseKlog(fileContent);
} catch (err) {
  throw new GraphQLError(
    err instanceof Error ? err.message : "Failed to parse .klog file",
    { extensions: { code: "BAD_USER_INPUT" } },
  );
}
```

- [ ] **Step 4: Wrap `getFileContent` in `downloadProfile` with try/catch**

At line 126:

```ts
let klogContent: string;
try {
  klogContent = await getFileContent(klogFile.fileKey);
} catch {
  return null;
}
```

- [ ] **Step 5: Replace `findUniqueOrThrow` with `findUnique`**

At line 394:

```ts
const fullRoast = await ctx.prisma.roast.findUnique({
  where: { id: roast.id },
  include: { bean: true, roastFiles: true, roastProfile: true },
});
if (!fullRoast) {
  throw new GraphQLError("Failed to retrieve created roast", {
    extensions: { code: "INTERNAL_SERVER_ERROR" },
  });
}
```

- [ ] **Step 6: Run tests**

Run: `cd server && npm test`
Expected: All pass. Update any test assertions that check exact error messages (the duplicate-file message changed).

- [ ] **Step 7: Commit**

```
git add server/src/resolvers/roast.ts
git commit -m "refactor(server): replace all throw Error with GraphQLError in roast resolvers"
```

### Task 1.3: Replace all `throw new Error()` in bean resolvers

**Files:**
- Modify: `server/src/resolvers/bean.ts`

- [ ] **Step 1: Add import and replace throws**

```ts
import { GraphQLError } from "graphql";
```

| Line | Current | Replacement |
|------|---------|-------------|
| 53 | `throw new Error("Bean not found")` | `throw new GraphQLError("Bean not found", { extensions: { code: "NOT_FOUND" } })` |
| 73 | `throw new Error("Bean not found in your library")` | `throw new GraphQLError("Bean not found in your library", { extensions: { code: "NOT_FOUND" } })` |
| 94 | `throw new Error("Bean not found in your library")` | `throw new GraphQLError("Bean not found in your library", { extensions: { code: "NOT_FOUND" } })` |

- [ ] **Step 2: Run tests, commit**

Run: `cd server && npm test`

```
git add server/src/resolvers/bean.ts
git commit -m "refactor(server): use GraphQLError in bean resolvers"
```

### Task 1.4: Fix R2 `response.Body!` assertion

**Files:**
- Modify: `server/src/utils/r2.ts`

- [ ] **Step 1: Replace non-null assertion with explicit check**

```ts
export async function getFileContent(fileKey: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: fileKey,
  });
  const response = await r2.send(command);
  if (!response.Body) {
    throw new Error(`R2 returned empty body for key: ${fileKey}`);
  }
  return await response.Body.transformToString("utf-8");
}
```

- [ ] **Step 2: Add startup validation for R2 env vars**

At the top of the file, before the `S3Client` constructor:

```ts
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.warn(
    "R2 credentials not configured — file storage operations will fail. " +
    "Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY.",
  );
}

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: R2_SECRET_ACCESS_KEY ?? "",
  },
});
```

Use `console.warn` instead of throwing so the server can still start in dev without R2 configured.

- [ ] **Step 3: Run tests, commit**

Run: `cd server && npm test`

```
git add server/src/utils/r2.ts
git commit -m "fix(server): add null check for R2 response body, validate env vars"
```

---

## Phase 2: Type Safety, Performance, and Small SoC Fixes

**Branch:** `refactor/type-safety-perf`
**Findings:** 4.3–4.12, 2.5, 2.6, 2.7
**Files:**
- Modify: `server/prisma/schema.prisma`
- Modify: `server/src/resolvers/roast.ts`
- Modify: `server/src/resolvers/bean.ts`
- Modify: `server/src/context.ts`
- Modify: `server/src/lib/validateKlog.ts`
- Modify: `server/src/lib/klogParser.ts`

### Task 2.1: Add composite indexes and remove duplicate

**Files:**
- Modify: `server/prisma/schema.prisma`

- [ ] **Step 1: Edit schema**

In the `Roast` model, replace:
```prisma
  @@index([userId])
  @@index([beanId])
  @@index([shareToken])
```
with:
```prisma
  @@index([userId, createdAt(sort: Desc)])
  @@index([beanId, userId, roastDate(sort: Desc)])
```

Remove `@@index([shareToken])` — the `@unique` already creates an index.

In the `UserBean` model, add:
```prisma
  @@index([userId, shortName])
```

- [ ] **Step 2: Create migration**

Run: `cd server && npx prisma migrate dev --name add_composite_indexes`

- [ ] **Step 3: Run tests, commit**

Run: `cd server && npm test`

```
git add server/prisma/
git commit -m "perf(server): add composite indexes, remove duplicate shareToken index"
```

### Task 2.2: Fix `as unknown as` triple cast and validation return type

**Files:**
- Modify: `server/src/lib/klogParser.ts`
- Modify: `server/src/lib/validateKlog.ts`

- [ ] **Step 1: Type parser output as JSON-compatible**

In `klogParser.ts`, find the return type of `parseKlog` and ensure `timeSeriesData`, `roastProfileCurve`, and `fanProfileCurve` are typed as `Record<string, unknown>[] | null` (which satisfies `Prisma.InputJsonValue`).

If the existing types are custom interfaces like `TimeSeriesPoint[]`, add an explicit cast at the parse site or widen the return type. The goal is that `roast.ts` lines 341–343 can become:

```ts
timeSeriesData: parsed.timeSeriesData,
roastProfileCurve: parsed.roastProfileCurve,
fanProfileCurve: parsed.fanProfileCurve,
```

without any `as unknown as` cast.

- [ ] **Step 2: Fix validateKlog return type to discriminated union**

Replace the return type in `validateKlog.ts`:

```ts
type ValidationResult =
  | { valid: true }
  | { valid: false; error: string };

export function validateKlogFile(
  fileName: string,
  fileContent: string,
): ValidationResult {
```

Then in `roast.ts`, the `validation.error!` assertion (line 29) becomes safe because TypeScript narrows `error` to `string` after `!validation.valid`.

- [ ] **Step 3: Fix the `"KAFFELOGIC"` cast in `uploadRoastProfile`**

In `roast.ts` lines 431, 437, replace:
```ts
profileType: (input.profileType as "KAFFELOGIC") ?? "KAFFELOGIC",
```
with:
```ts
profileType: "KAFFELOGIC",
```

The GraphQL schema only has one enum value. The `input.profileType` param is vestigial — always default to `"KAFFELOGIC"`.

- [ ] **Step 4: Run tests, commit**

Run: `cd server && npm test`

```
git add server/src/lib/klogParser.ts server/src/lib/validateKlog.ts server/src/resolvers/roast.ts
git commit -m "fix(server): remove unsafe casts, use discriminated union for validation"
```

### Task 2.3: Remove redundant field resolvers

**Files:**
- Modify: `server/src/resolvers/roast.ts`
- Modify: `server/src/resolvers/bean.ts`

- [ ] **Step 1: Remove Roast field resolvers**

Delete lines 443–450 from `roast.ts` (the `Roast: { bean, roastFiles, roastProfile }` block). Every query already uses `include`.

- [ ] **Step 2: Remove Bean and UserBean field resolvers**

Delete lines 102–113 from `bean.ts` (the `Bean: { roasts }` and `UserBean: { bean }` blocks). The `myBeans` query already uses `include: { bean: true }`, and `Bean.roasts` should be accessed via the `roastsByBean` query.

- [ ] **Step 3: Run tests**

Run: `cd server && npm test`
Expected: All pass — tests use `executeOperation` which goes through the full resolver chain with includes.

- [ ] **Step 4: Commit**

```
git add server/src/resolvers/roast.ts server/src/resolvers/bean.ts
git commit -m "refactor(server): remove redundant field resolvers, rely on eager include"
```

### Task 2.4: Wrap `createBean` in transaction

**Files:**
- Modify: `server/src/resolvers/bean.ts`

- [ ] **Step 1: Wrap the two writes in `$transaction`**

Replace lines 36–41:

```ts
const userId = requireAuth(ctx);
const { notes, shortName, ...beanData } = input;

return ctx.prisma.$transaction(async (tx) => {
  const bean = await tx.bean.create({ data: beanData });
  return tx.userBean.create({
    data: { userId, beanId: bean.id, notes, shortName },
    include: { bean: true },
  });
});
```

- [ ] **Step 2: Run tests, commit**

Run: `cd server && npm test`

```
git add server/src/resolvers/bean.ts
git commit -m "fix(server): wrap createBean in transaction for atomicity"
```

### Task 2.5: Cache user upsert in context

**Files:**
- Modify: `server/src/context.ts`

- [ ] **Step 1: Add in-process cache**

```ts
const userIdCache = new Map<string, { userId: string; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function createContext({
  req,
}: {
  req: IncomingMessage;
}): Promise<Context> {
  const authHeader = req.headers.authorization;
  let userId: string | null = null;

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY!,
      });
      const clerkId = payload.sub;

      // Check cache first
      const cached = userIdCache.get(clerkId);
      if (cached && cached.expiresAt > Date.now()) {
        userId = cached.userId;
      } else {
        const user = await prisma.user.upsert({
          where: { clerkId },
          update: {},
          create: { clerkId },
        });
        userId = user.id;
        userIdCache.set(clerkId, { userId, expiresAt: Date.now() + CACHE_TTL_MS });
      }
    } catch (err) {
      console.error("Token verification failed:", err);
    }
  }

  return { prisma, userId };
}
```

- [ ] **Step 2: Run tests, commit**

Run: `cd server && npm test`

```
git add server/src/context.ts
git commit -m "perf(server): cache user upsert for 5min to avoid redundant DB writes"
```

---

## Phase 3: DRY Extractions

**Branch:** `refactor/dry-extractions`
**Findings:** 1.1–1.6, 2.3
**Files:**
- Create: `server/src/lib/guardHelpers.ts`
- Create: `server/src/lib/kproExtractor.ts`
- Modify: `server/src/resolvers/roast.ts`
- Modify: `server/src/resolvers/bean.ts`
- Modify: `server/src/lib/klogParser.ts`
- Modify: `server/src/lib/validateKlog.ts`
- Move tests: update imports in `server/src/lib/klogParser.test.ts`

### Task 3.1: Extract `kproExtractor.ts` from `klogParser.ts`

**Files:**
- Create: `server/src/lib/kproExtractor.ts`
- Modify: `server/src/lib/klogParser.ts`

- [ ] **Step 1: Create `kproExtractor.ts`**

Move `KPRO_KEYS` array and `extractKproContent()` function from `klogParser.ts` to `server/src/lib/kproExtractor.ts`. Import `parseHeaders` from `klogParser.ts`.

```ts
import { parseHeaders } from "./klogParser.js";

const KPRO_KEYS = [
  // ... copy the full array from klogParser.ts
];

export function extractKproContent(fileContent: string): string | null {
  // ... copy the function from klogParser.ts, using imported parseHeaders
}
```

- [ ] **Step 2: Update imports in klogParser.ts**

Remove `KPRO_KEYS` and `extractKproContent` from `klogParser.ts`. Export `parseHeaders` if not already exported.

- [ ] **Step 3: Update imports in `roast.ts`**

Change:
```ts
import { extractKproContent, parseKlog } from "../lib/klogParser.js";
```
to:
```ts
import { parseKlog } from "../lib/klogParser.js";
import { extractKproContent } from "../lib/kproExtractor.js";
```

- [ ] **Step 4: Run tests**

Run: `cd server && npm test`
Expected: All pass — `extractKproContent` tests in `klogParser.test.ts` may need import update.

- [ ] **Step 5: Commit**

```
git add server/src/lib/kproExtractor.ts server/src/lib/klogParser.ts server/src/resolvers/roast.ts
git commit -m "refactor(server): extract kpro extraction to dedicated module"
```

### Task 3.2: Extract guard helpers

**Files:**
- Create: `server/src/lib/guardHelpers.ts`
- Modify: `server/src/resolvers/roast.ts`
- Modify: `server/src/resolvers/bean.ts`

- [ ] **Step 1: Create `guardHelpers.ts`**

```ts
import type { PrismaClient } from "@prisma/client";
import { GraphQLError } from "graphql";

export async function requireRoast(prisma: PrismaClient, id: string, userId: string) {
  const roast = await prisma.roast.findFirst({ where: { id, userId } });
  if (!roast) {
    throw new GraphQLError("Roast not found", { extensions: { code: "NOT_FOUND" } });
  }
  return roast;
}

export async function requireBean(prisma: PrismaClient, beanId: string) {
  const bean = await prisma.bean.findUnique({ where: { id: beanId } });
  if (!bean) {
    throw new GraphQLError("Bean not found", { extensions: { code: "NOT_FOUND" } });
  }
  return bean;
}

export async function requireUserBean(prisma: PrismaClient, id: string, userId: string) {
  const userBean = await prisma.userBean.findFirst({ where: { id, userId } });
  if (!userBean) {
    throw new GraphQLError("Bean not found in your library", { extensions: { code: "NOT_FOUND" } });
  }
  return userBean;
}
```

Note: This task assumes Phase 1 has already converted errors to GraphQLError. If running in parallel, use `throw new Error()` here and Phase 1 will convert later. Either way works.

- [ ] **Step 2: Replace inline guards in `roast.ts`**

Replace each `findFirst` + null check + throw pattern with:

```ts
import { requireRoast, requireBean } from "../lib/guardHelpers.js";

// In updateRoast, deleteRoast, toggleRoastSharing, uploadRoastProfile:
const roast = await requireRoast(ctx.prisma, id, userId);

// In createRoast, uploadRoastLog:
await requireBean(ctx.prisma, input.beanId);
```

- [ ] **Step 3: Replace inline guards in `bean.ts`**

```ts
import { requireBean, requireUserBean } from "../lib/guardHelpers.js";

// In addBeanToLibrary:
await requireBean(ctx.prisma, beanId);

// In updateUserBean:
await requireUserBean(ctx.prisma, id, userId);
```

For `removeBeanFromLibrary`, the lookup uses `userId_beanId` compound key — keep inline or add a specific helper.

- [ ] **Step 4: Run tests, commit**

Run: `cd server && npm test`

```
git add server/src/lib/guardHelpers.ts server/src/resolvers/roast.ts server/src/resolvers/bean.ts
git commit -m "refactor(server): extract find-then-guard patterns to guardHelpers"
```

### Task 3.3: Hoist `ROAST_INCLUDE` constant and deduplicate input types

**Files:**
- Modify: `server/src/resolvers/roast.ts`

- [ ] **Step 1: Add `ROAST_INCLUDE` constant**

Below `LIST_QUERY_OMIT`:

```ts
const ROAST_INCLUDE = {
  bean: true,
  roastFiles: true,
  roastProfile: true,
} as const;
```

Replace all 9 occurrences of `include: { bean: true, roastFiles: true, roastProfile: true }` with `include: ROAST_INCLUDE`.

- [ ] **Step 2: Extract shared input type**

Above the resolver object:

```ts
interface RoastInputBase {
  ambientTemp?: number;
  roastingLevel?: number;
  tastingNotes?: string;
  colourChangeTime?: number;
  firstCrackTime?: number;
  roastEndTime?: number;
  colourChangeTemp?: number;
  firstCrackTemp?: number;
  roastEndTemp?: number;
  developmentTime?: number;
  developmentPercent?: number;
  totalDuration?: number;
  roastDate?: string;
  timeSeriesData?: JsonInput;
  roastProfileCurve?: JsonInput;
  fanProfileCurve?: JsonInput;
  notes?: string;
}

interface CreateRoastInput extends RoastInputBase {
  beanId: string;
}

type UpdateRoastInput = RoastInputBase;
```

Update `createRoast` and `updateRoast` parameter types to use these interfaces.

- [ ] **Step 3: Run tests, commit**

Run: `cd server && npm test`

```
git add server/src/resolvers/roast.ts
git commit -m "refactor(server): hoist ROAST_INCLUDE, deduplicate input types"
```

### Task 3.4: Extract curve parser helper and deduplicate validateKlog

**Files:**
- Modify: `server/src/lib/klogParser.ts`
- Modify: `server/src/lib/validateKlog.ts`

- [ ] **Step 1: Extract `parseCurveHeader` generic helper in klogParser.ts**

```ts
function parseCurveHeader<T>(
  headers: Map<string, string>,
  key: string,
  mapper: (p: { time: number; value: number }) => T,
  warnings: string[],
): T[] | null {
  if (!headers.has(key)) return null;
  try {
    const pairs = parseCurvePairs(headers.get(key)!);
    return pairs ? pairs.map(mapper) : null;
  } catch {
    warnings.push(`Failed to parse ${key} curve data`);
    return null;
  }
}
```

Replace the two duplicated blocks with:

```ts
const roastProfileCurve = parseCurveHeader(
  headers, "roast_profile",
  (p) => ({ time: p.time, temp: p.value }),
  warnings,
);
const fanProfileCurve = parseCurveHeader(
  headers, "fan_profile",
  (p) => ({ time: p.time, rpm: p.value }),
  warnings,
);
```

- [ ] **Step 2: Make validateKlog use parseHeaders**

Export `parseHeaders` from `klogParser.ts` if not already exported. Then in `validateKlog.ts`:

```ts
import { parseHeaders } from "./klogParser.js";

export function validateKlogFile(
  fileName: string,
  fileContent: string,
): ValidationResult {
  if (!fileName.toLowerCase().endsWith(".klog")) {
    return {
      valid: false,
      error: `Invalid file extension: expected .klog, got "${fileName.slice(fileName.lastIndexOf("."))}"`,
    };
  }

  const lines = fileContent.split(/\r?\n/);
  const headers = parseHeaders(lines);
  if (headers.size === 0) {
    return { valid: false, error: "File does not contain any key:value header lines" };
  }

  const hasTimeHeader = lines.some((l) => l.startsWith("time\t"));
  if (!hasTimeHeader) {
    return { valid: false, error: "File does not contain a tab-separated time-series header row" };
  }

  return { valid: true };
}
```

- [ ] **Step 3: Run tests, commit**

Run: `cd server && npm test`

```
git add server/src/lib/klogParser.ts server/src/lib/validateKlog.ts
git commit -m "refactor(server): extract curve parser helper, dedup header scanning"
```

### Task 3.5: Extract `upsertRoastProfile` helper

**Files:**
- Modify: `server/src/resolvers/roast.ts`

- [ ] **Step 1: Add helper function**

```ts
async function upsertRoastProfile(
  prisma: PrismaClient,
  roastId: string,
  data: {
    fileKey: string;
    fileName: string;
    profileShortName?: string | null;
    profileDesigner?: string | null;
  },
) {
  return prisma.roastProfile.upsert({
    where: { roastId },
    update: { ...data, profileType: "KAFFELOGIC" },
    create: { roastId, ...data, profileType: "KAFFELOGIC" },
  });
}
```

Replace the upsert blocks in `uploadRoastLog` (lines 373–391) and `uploadRoastProfile` (lines 426–439) with calls to this helper.

- [ ] **Step 2: Run tests, commit**

Run: `cd server && npm test`

```
git add server/src/resolvers/roast.ts
git commit -m "refactor(server): extract upsertRoastProfile helper"
```

---

## Phase 4: Service Layer Extraction

**Branch:** `refactor/service-layer`
**Depends on:** Phases 1–3 merged to main
**Findings:** 2.1, 2.2, 2.4, 4.7, 4.9

### Task 4.1: Create `RoastService` with upload workflow

**Files:**
- Create: `server/src/services/roastService.ts`
- Modify: `server/src/resolvers/roast.ts`

- [ ] **Step 1: Create `server/src/services/roastService.ts`**

Extract `uploadRoastLog` business logic into a service class. The service:
- Takes `prisma` as a constructor argument
- Owns validation, parsing, duplicate checking, transaction-wrapped DB writes, R2 upload
- Returns `{ roast, parseWarnings }`

```ts
import type { PrismaClient, Prisma } from "@prisma/client";
import { GraphQLError } from "graphql";
import { parseKlog } from "../lib/klogParser.js";
import { validateKlogFile } from "../lib/validateKlog.js";
import { uploadFile } from "../utils/r2.js";

const ROAST_INCLUDE = {
  bean: true,
  roastFiles: true,
  roastProfile: true,
} as const;

export class RoastService {
  constructor(private prisma: PrismaClient) {}

  async uploadRoastLog(
    userId: string,
    beanId: string,
    fileName: string,
    fileContent: string,
  ) {
    // Validate
    const validation = validateKlogFile(fileName, fileContent);
    if (!validation.valid) {
      throw new GraphQLError(validation.error, {
        extensions: { code: "BAD_USER_INPUT" },
      });
    }

    // Duplicate check
    const existing = await this.prisma.roastFile.findFirst({
      where: { fileName, roast: { userId } },
    });
    if (existing) {
      throw new GraphQLError("A roast log with this filename already exists", {
        extensions: { code: "DUPLICATE_FILE" },
      });
    }

    // Verify bean
    const bean = await this.prisma.bean.findUnique({ where: { id: beanId } });
    if (!bean) {
      throw new GraphQLError("Bean not found", {
        extensions: { code: "NOT_FOUND" },
      });
    }

    // Parse
    let parsed;
    try {
      parsed = parseKlog(fileContent);
    } catch (err) {
      throw new GraphQLError(
        err instanceof Error ? err.message : "Failed to parse .klog file",
        { extensions: { code: "BAD_USER_INPUT" } },
      );
    }

    // Create roast + file + profile in a transaction
    const fileKey = `roasts/${userId}/${fileName}`;
    const parseWarnings = [...parsed.parseWarnings];

    const roast = await this.prisma.$transaction(async (tx) => {
      const created = await tx.roast.create({
        data: {
          userId,
          beanId,
          roastDate: parsed.roastDate,
          ambientTemp: parsed.ambientTemp,
          roastingLevel: parsed.roastingLevel,
          tastingNotes: parsed.tastingNotes,
          colourChangeTime: parsed.colourChangeTime,
          firstCrackTime: parsed.firstCrackTime,
          roastEndTime: parsed.roastEndTime,
          colourChangeTemp: parsed.colourChangeTemp,
          firstCrackTemp: parsed.firstCrackTemp,
          roastEndTemp: parsed.roastEndTemp,
          developmentTime: parsed.developmentTime,
          developmentPercent: parsed.developmentPercent,
          totalDuration: parsed.totalDuration,
          timeSeriesData: parsed.timeSeriesData,
          roastProfileCurve: parsed.roastProfileCurve,
          fanProfileCurve: parsed.fanProfileCurve,
        },
        include: { bean: true },
      });

      const roastFile = await tx.roastFile.create({
        data: {
          roastId: created.id,
          fileKey: `roasts/${userId}/${created.id}/${fileName}`,
          fileName,
          fileType: "KLOG",
        },
      });

      let roastProfile = null;
      if (parsed.profileFileName) {
        roastProfile = await tx.roastProfile.upsert({
          where: { roastId: created.id },
          update: {
            fileKey: parsed.profileFileName,
            fileName: parsed.profileFileName,
            profileType: "KAFFELOGIC",
            profileShortName: parsed.profileShortName,
            profileDesigner: parsed.profileDesigner,
          },
          create: {
            roastId: created.id,
            fileKey: parsed.profileFileName,
            fileName: parsed.profileFileName,
            profileType: "KAFFELOGIC",
            profileShortName: parsed.profileShortName,
            profileDesigner: parsed.profileDesigner,
          },
        });
      }

      return {
        ...created,
        roastFiles: [roastFile],
        roastProfile,
      };
    });

    // R2 upload outside transaction (non-fatal)
    const actualFileKey = `roasts/${userId}/${roast.id}/${fileName}`;
    try {
      await uploadFile(actualFileKey, fileContent, "text/plain");
    } catch (err) {
      parseWarnings.push(
        `Warning: failed to upload raw file to storage: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    return { roast, parseWarnings };
  }
}
```

- [ ] **Step 2: Slim down the resolver**

In `roast.ts`, the `uploadRoastLog` mutation becomes:

```ts
uploadRoastLog: async (_, { beanId, fileName, fileContent }, ctx) => {
  const userId = requireAuth(ctx);
  const service = new RoastService(ctx.prisma);
  return service.uploadRoastLog(userId, beanId, fileName, fileContent);
},
```

- [ ] **Step 3: Run tests**

Run: `cd server && npm test`
Expected: All `uploadRoastLog` integration tests pass.

- [ ] **Step 4: Commit**

```
git add server/src/services/roastService.ts server/src/resolvers/roast.ts
git commit -m "refactor(server): extract uploadRoastLog to RoastService with transaction"
```

### Task 4.2: Move remaining roast business logic to service

Continue extracting `downloadProfile`, `createRoast`, `updateRoast`, `deleteRoast`, `toggleRoastSharing` into `RoastService` methods. Each resolver becomes a thin adapter: auth check → service call → return.

This is a mechanical extraction — move the Prisma queries into service methods, keep the resolver as `requireAuth` + `service.method()`. Use the guard helpers from Phase 3.

- [ ] **Step 1: Add methods to `RoastService` for each resolver**
- [ ] **Step 2: Update resolvers to delegate**
- [ ] **Step 3: Run tests after each resolver is moved**
- [ ] **Step 4: Commit**

```
git commit -m "refactor(server): move remaining roast resolvers to RoastService"
```

---

## Phase 5: Test Coverage

**Branch:** `test/coverage-gaps`
**Depends on:** Phases 1–3 (ideally Phase 4 too, but can start CRUD tests on the current resolver code)
**Findings:** 5.1–5.10

### Task 5.1: CRUD resolver tests

**Files:**
- Create: `server/src/resolvers/roast.test.ts`

Write tests using `ApolloServer.executeOperation()` (following the pattern in existing test files like `uploadRoastLog.test.ts`). Cover:

- [ ] `myRoasts` — returns user's roasts, excludes other users' roasts, returns in desc order
- [ ] `roastById` — found, not found, cross-user isolation
- [ ] `roastsByBean` — filters by bean, cross-user isolation
- [ ] `roastsByIds` — batch fetch, partial match, cross-user isolation
- [ ] `createRoast` — happy path, bean not found
- [ ] `updateRoast` — happy path, not found, cross-user isolation
- [ ] `deleteRoast` — happy path, not found, cross-user isolation
- [ ] Commit after each group of related tests

### Task 5.2: Sharing feature tests

**Files:**
- Create: `server/src/resolvers/sharing.test.ts`

- [ ] `toggleRoastSharing` — toggles on, toggles off, not found, cross-user
- [ ] `roastByShareToken` — shared roast returns, unshared roast returns null, invalid token
- [ ] Commit

### Task 5.3: User resolver and bean edge case tests

**Files:**
- Create: `server/src/resolvers/user.test.ts`
- Modify: `server/src/resolvers/bean.test.ts`

- [ ] `updateTempUnit` — CELSIUS → FAHRENHEIT, auth required
- [ ] `createBean` without shortName
- [ ] `addBeanToLibrary` duplicate handling
- [ ] `updateUserBean` cross-user isolation
- [ ] Commit

### Task 5.4: Upload edge case tests

**Files:**
- Modify: `server/src/resolvers/uploadRoastLog.test.ts`
- Modify: `server/src/resolvers/downloadProfile.test.ts`

- [ ] `uploadRoastLog` with R2 failure — mock `uploadFile` to throw, verify roast created and warning present
- [ ] `uploadRoastLog` with no profile — klog missing `profile_file_name`, verify no RoastProfile created
- [ ] `downloadProfile` when `extractKproContent` returns null
- [ ] Commit

### Task 5.5: Delete placeholder tests

**Files:**
- Delete: `server/src/__tests__/placeholder.test.ts`
- Delete: `client/src/__tests__/placeholder.test.tsx`

- [ ] Delete both files
- [ ] Run: `cd server && npm test` and `cd client && npm test`
- [ ] Commit

```
git commit -m "chore: remove placeholder tests"
```

---

## Verification

After all phases are merged:

1. `cd server && npm test` — all tests pass (should be 70+ tests now)
2. `cd client && npm test` — all tests pass
3. `cd server && npm run build` — tsc compiles clean
4. `cd client && npm run build` — Vite build succeeds
5. `npm test` from root — both suites pass
6. Push to a PR and verify CI passes

## Agent Dispatch Strategy

For maximum parallelism, dispatch **3 agents simultaneously** for Phases 1–3 (each in its own worktree). After all 3 merge, dispatch Phase 4. After Phase 4, dispatch Phase 5. Phase 5 can also be split into 3 parallel agents (Tasks 5.1–5.2, Task 5.3–5.4, Task 5.5).
