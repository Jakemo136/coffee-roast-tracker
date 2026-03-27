# Plan: Merge PRs #4 & #7, then Codebase Evaluation

## Context

Two feature PRs remain open from a parallel 4-branch buildout of client infrastructure. Both branched from `main` before Chart.js, gql.tada, and CI were merged, so they need conflict resolution. After merging, the server codebase (~1,100 lines of production code) is mature enough for a structured quality evaluation to identify refactoring opportunities before building more features on top.

---

## Part 1: Merge PR #4 (feat/client-providers), then PR #7 (feat/auth-flow)

Same workflow for each, in order:

### PR #4 first (worktree: `.claude/worktrees/agent-a6424147`)

1. **Merge main in**: `git fetch origin main && git merge origin/main`
2. **Resolve conflicts**:
   - `client/package.json` — additive (keep both chartjs/gql.tada deps and any PR #4 additions like `generate:schema` script)
   - `client/tsconfig.json` — take main's version (has GraphQLSP plugin + scripts in include)
   - `client/test/setup.ts`, `client/test/mocks/server.ts` — take main's (extensionless imports)
   - `server/package.json`, `server/tsconfig.json` — take main's (tsconfig.build.json changes)
   - `package-lock.json` — `git checkout --theirs package-lock.json && npm install`
   - `STATUS.md`, `.gitignore` — take main's
3. **Verify**: `cd client && npx tsc -b && npm test`
4. **Commit, push**
5. **Wait for CI green**
6. **Code review** (5-agent pattern)
7. **Fix findings, merge**

### PR #7 second (worktree: `.claude/worktrees/agent-ad15fee5`)

Same steps. By this point main includes PR #4, so PR #7 gets providers + auth components together. PR #7's unique files are all new (no content conflicts), only package/config conflicts from the base divergence.

---

## Part 2: Codebase Evaluation

### Output

Single markdown document at `docs/codebase-evaluation.md` with findings organized by category, severity ratings, and a prioritized refactoring roadmap.

### Agent Strategy: 5 evaluators + 1 coordinator

Launch all 5 in parallel, then a coordinator synthesizes.

#### Agent 1: DRY Violations
- **Files**: `server/src/resolvers/roast.ts`, `bean.ts`, `user.ts`, `server/src/lib/klogParser.ts`, `validateKlog.ts`
- **Look for**: Repeated find-then-guard patterns, duplicated include objects, inline type definitions that mirror GraphQL schema, duplicated curve-parsing blocks in klogParser

#### Agent 2: Separation of Concerns
- **Files**: `server/src/resolvers/roast.ts`, `server/src/lib/klogParser.ts`, `server/src/resolvers/index.ts`, `server/src/context.ts`
- **Look for**: `roast.ts` monolith (451 lines, 5 queries + 6 mutations + field resolvers), `uploadRoastLog` doing 7+ operations in 115 lines, `klogParser.ts` mixing parsing with kpro extraction, no service/repository layer

#### Agent 3: Error Handling
- **Files**: All resolver files, `context.ts`, `klogParser.ts`, `validateKlog.ts`
- **Look for**: ~13 raw `throw new Error()` with no GraphQLError or error codes, `requireAuth` throwing raw Error instead of UNAUTHENTICATED, UI copy in error messages ("Do you want to replace it?")

#### Agent 4: Performance & Type Safety
- **Files**: `server/src/resolvers/roast.ts`, `bean.ts`, `server/prisma/schema.prisma`, `server/src/utils/r2.ts`
- **Look for**: N+1 in field resolvers (Roast.bean, Roast.roastFiles, Bean.roasts), missing index on RoastFile.fileName, unnecessary re-fetch after create in uploadRoastLog, unsafe casts (`as unknown as Prisma.InputJsonValue`), non-null assertions in r2.ts

#### Agent 5: Test Coverage Gaps
- **Files**: All test files, plus identify untested source files
- **Look for**: No tests for core CRUD resolvers (myRoasts, roastById, createRoast, updateRoast, deleteRoast, toggleRoastSharing, roastByShareToken), no tests for user.ts, context.ts, r2.ts, placeholder.test.ts that should be removed

#### Coordinator Agent
- Receives all 5 agent outputs
- Deduplicates overlapping findings
- Assigns consistent severity (Critical / High / Medium / Low)
- Produces the final `docs/codebase-evaluation.md` with:
  - Executive summary with counts
  - Findings grouped by category
  - Each finding: severity, location, current state, recommendation, effort (S/M/L)
  - Prioritized refactoring roadmap table

### Document Structure

```
# Codebase Evaluation — Coffee Roast Tracker

## Executive Summary
## 1. DRY Violations
## 2. Separation of Concerns
## 3. Error Handling
## 4. Performance & Type Safety
## 5. Test Coverage Gaps
## 6. Prioritized Refactoring Roadmap
```

---

## Verification

- **Part 1**: CI passes on both PRs before merge. All client tests pass locally. Both PRs merged to main.
- **Part 2**: `docs/codebase-evaluation.md` committed to a `docs/codebase-evaluation` branch with a PR. Document reviewed for accuracy by spot-checking 2-3 findings against actual code.
