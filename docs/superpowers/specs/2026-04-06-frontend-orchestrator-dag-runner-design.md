# Frontend Orchestrator — DAG Runner Design

> Spec for a portable, config-driven pipeline runner that enforces the
> frontend-orchestration plugin's workflow as a dependency graph with
> typed step implementations, quality gates, and scope-aware execution.

## Problem

The frontend-orchestration plugin defines a powerful workflow:
interview → plan → build → test → audit → QA → ship. But the
workflow is described in prose markdown. Ordering is enforced by
humans remembering to follow it. There is no machine-readable state,
no gate enforcement, and no way to resume after interruption.

This led to a 249-file PR with no incremental review, tests that
were never run in CI until the end, and three layers of failures
that could have been caught wave-by-wave.

## Goals

1. **Enforce ordering** — steps cannot run until prerequisites pass
2. **Track state** — machine-readable progress that survives session restarts
3. **Incremental PRs** — one PR per component, merged per wave
4. **Portable** — works on any project via config, not hardcoded paths
5. **Scope-aware** — same pipeline for an app, a page, or a single component
6. **Explainable** — `--explain` prints the full flow in plain English

## Non-Goals (explicit scope boundary)

The runner resolves a DAG, checks artifacts, invokes plugin commands,
and evaluates pass/fail. It does NOT:

- Manage retries (escalates to user on failure)
- Schedule across time (not a cron system)
- Distribute execution across machines
- Persist state across machine restarts (file-based, local only)
- Replace CI (it orchestrates local dev workflow; CI enforces merge gates)

If you find yourself wanting any of these, adopt a real workflow
engine (Temporal, Inngest) rather than building one.

Every step type must justify its existence with a real scenario from
a project that has actually been built. No speculative step types.

---

## Architecture

### Components

```
orchestrator/
  config/
    schema.ts              # Zod schema for orchestrator.config.yaml
  steps/                   # Typed step implementations
    session-start.ts       # informational briefing
    requirements-gate.ts   # ui-interview + artifact check
    review-requirements.ts # build state summary
    e2e-scaffold.ts        # write E2E tests before build
    dependency-resolve.ts  # wave planning
    build-wave.ts          # parallel component builds
    test-suite.ts          # typecheck + RTL + E2E
    post-wave-review.ts    # cross-component review + audit
    e2e-green.ts           # fix until E2E passes
    design-audit.ts        # a11y + design audit
    visual-qa.ts           # UX quality review
    set-baseline.ts        # screenshot baseline
    pre-commit-review.ts   # final review + all tests
    open-prs.ts            # create PRs per component
    await-merge.ts         # gate on PR merges
    merge-to-main.ts       # final PR to main
  runner.ts                # DAG resolver + executor
  state.ts                 # WORKFLOW_STATE.json read/write
  explain.ts               # --explain mode: prints flow in English
  cli.ts                   # Entry point
```

### Per-project files

```
<project-root>/
  orchestrator.config.yaml   # Pipeline definition
  .orchestrator/
    WORKFLOW_STATE.json      # Machine-readable progress
```

### Step interface

Every step implements this interface. Steps are traffic cops —
they gate-check, invoke plugin commands, and evaluate results.
They do NOT reimplement the logic that lives in plugin commands.

```typescript
// ─────────────────────────────────────────────────────
//  Step Definition (from config)
// ─────────────────────────────────────────────────────

/**
 * Declares a step instance in orchestrator.config.yaml.
 * The runner reads these, instantiates the matching Step class,
 * and wires up the dependency graph.
 *
 * Example from config:
 *   { id: "build-wave:1", type: "build-wave", deps: ["await-merge:0"], params: { wave: 1 } }
 */
interface StepDefinition {
  /** Unique ID for this step instance (e.g. "build-wave:2", "design-audit") */
  id: string;

  /** Which step type — maps to a class in steps/ (e.g. "build-wave" → BuildWaveStep) */
  type: string;

  /** Step IDs that must have status "passed" before this step can execute */
  deps: string[];

  /** Step-specific parameters from config. Each step type defines its own shape.
   *  Examples:
   *    build-wave:  { wave: 2 }
   *    test-suite:  { wave: 2, e2e_blocking: false }
   *    design-audit: { routes: ["/beans", "/roasts/:id"] }
   */
  params: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────
//  Step Result (returned by execute)
// ─────────────────────────────────────────────────────

/**
 * The outcome of running a step. Written to WORKFLOW_STATE.json
 * and used by the runner to determine what's unblocked next.
 */
interface StepResult {
  /** "passed" = all criteria met, unblocks dependents.
   *  "failed" = criteria not met, blocks dependents, escalates to user.
   *  "skipped" = scope below threshold, treated as "passed" for dependency resolution. */
  status: "passed" | "failed" | "skipped";

  /** Paths (relative to project root) of files this step created or modified.
   *  Used by downstream steps and by --explain to show what each step produces.
   *  Examples: ["docs/BUILD_PLAN.md"], ["client/src/components/Modal.tsx", "client/src/components/__tests__/Modal.test.tsx"] */
  artifacts: string[];

  /** Numeric measurements for logging and progress tracking.
   *  Keys are step-defined. Used in --explain and BUILD_STATUS.md updates.
   *  Examples: { rtl_pass: 265, rtl_fail: 0, e2e_pass: 40, e2e_fail: 63 }
   *            { components_built: 8, prs_opened: 8 }
   *            { critical_violations: 0, major_violations: 2 } */
  metrics: Record<string, number>;

  /** Human-readable summary shown in `orchestrate status` and --explain.
   *  Should be one line, suitable for a progress report.
   *  Example: "Wave 2: 7 components built. RTL: 180/180. E2E: 40/103 (informational)." */
  message: string;
}

// ─────────────────────────────────────────────────────
//  Step Interface (implemented by each step type)
// ─────────────────────────────────────────────────────

/**
 * Every step type (build-wave, design-audit, etc.) implements this.
 * Steps are traffic cops: gate-check → invoke plugin command → evaluate result.
 * They do NOT contain business logic — that lives in plugin commands.
 */
interface Step {
  /**
   * Returns a structured description of this step for --explain mode.
   * Pure function — no side effects, no I/O. Called even for skipped steps.
   */
  describe(): StepDescription;

  /**
   * Checks whether this step CAN run right now. Verifies preconditions
   * beyond just dependency status: artifact files exist, dev server is
   * reachable, required tools are installed, etc.
   *
   * Called by the runner before execute(). If preflight fails, the step
   * is not executed and the failure reason is shown to the user.
   *
   * Example checks:
   *   - design-audit: is localhost:3000 responding?
   *   - build-wave: do all dependency components have [x] in inventory?
   *   - open-prs: is `gh` CLI authenticated?
   */
  preflight(ctx: RunContext): Promise<PreflightResult>;

  /**
   * Runs the step. Invokes plugin commands via ctx.invokeCommand(),
   * runs shell commands via ctx.exec(), evaluates results, and returns
   * a StepResult.
   *
   * If the step includes a user approval gate (e.g. ui-interview,
   * dependency-resolve), it calls ctx.awaitApproval() which pauses
   * execution until the user confirms.
   */
  execute(ctx: RunContext): Promise<StepResult>;
}

// ─────────────────────────────────────────────────────
//  Step Description (for --explain mode)
// ─────────────────────────────────────────────────────

/**
 * Structured metadata returned by describe(). The runner composes
 * these into the full --explain output. This is how the code
 * documents itself — no separate prose workflow docs needed.
 */
interface StepDescription {
  /** Same as StepDefinition.id */
  id: string;

  /** Same as StepDefinition.type */
  type: string;

  /** 1-2 sentence plain English summary of what this step does.
   *  Example: "Builds all components in wave 2 in parallel using TDD protocol,
   *  with code review and simplification after each component." */
  summary: string;

  /** Plain English list of what must be true before this runs.
   *  Example: ["All wave 1 PRs merged", "BUILD_PLAN.md exists"] */
  prerequisites: string[];

  /** File paths this step is expected to produce.
   *  Example: ["docs/DESIGN_AUDIT.md", "screenshots/"] */
  artifacts: string[];

  /** Plain English pass condition.
   *  Example: "0 critical violations. 0 major violations. DESIGN_AUDIT.md written." */
  passCondition: string;

  /** Plain English fail condition.
   *  Example: "Unresolved critical/major after auto-fix. Escalate to user." */
  failCondition: string;

  /** Minimum scope for this step to run. If the pipeline scope is
   *  below this threshold, the step is skipped (status = "skipped").
   *  Ordering: component < feature < page < app */
  scope: ScopeThreshold;
}

/**
 * Scope levels ordered from smallest to largest.
 * A step with scope "page" runs for page and app pipelines,
 * but is skipped for component and feature pipelines.
 *
 *   component — single component (RTL only, no E2E, no audit)
 *   feature   — small feature addition (affected E2E flows, affected routes)
 *   page      — full page + its components (page-specific E2E, page route audit)
 *   app       — entire application (all E2E, all routes, feature branch → main)
 */
type ScopeThreshold = "app" | "page" | "component" | "feature";

// ─────────────────────────────────────────────────────
//  Preflight Result
// ─────────────────────────────────────────────────────

/**
 * Returned by preflight(). Tells the runner whether the step
 * is safe to execute, and if not, what's wrong.
 */
interface PreflightResult {
  /** Whether all preconditions are met */
  ready: boolean;

  /** If not ready, human-readable explanations of what's missing.
   *  Example: ["Dev server not running at localhost:3000",
   *            "docs/UI_REQUIREMENTS.md does not exist"] */
  issues: string[];
}

// ─────────────────────────────────────────────────────
//  RunContext (injected into every step)
// ─────────────────────────────────────────────────────

/**
 * Passed to every step's preflight() and execute() methods.
 * Provides access to config, state, and project operations
 * without steps needing to know file paths or shell details.
 *
 * Steps interact with the outside world ONLY through RunContext.
 * This makes steps testable (mock the context) and portable
 * (context adapts to the project's layout).
 */
interface RunContext {
  /** Parsed orchestrator.config.yaml */
  config: OrchestratorConfig;

  /** Current WORKFLOW_STATE.json (read-only snapshot; use updateState to write) */
  state: WorkflowState;

  /** Absolute path to the project root directory */
  projectRoot: string;

  /** The pipeline's scope configuration (type + target) */
  scope: PipelineScope;

  /** Resolve a relative path against projectRoot.
   *  Example: ctx.resolve("docs/BUILD_PLAN.md") → "/Users/jake/project/docs/BUILD_PLAN.md" */
  resolve(path: string): string;

  /** Check if a file or directory exists (relative to projectRoot).
   *  Used in preflight to verify artifacts from previous steps. */
  exists(path: string): Promise<boolean>;

  /** Run a shell command from projectRoot. Returns exit code + stdout/stderr.
   *  Used for test commands, git operations, gh CLI, etc.
   *
   *  opts.cwd: override working directory (default: projectRoot)
   *  opts.timeout: max execution time in ms (default: 120_000)
   *  opts.env: additional environment variables */
  exec(cmd: string, opts?: ExecOpts): Promise<ExecResult>;

  /** Invoke a frontend-orchestration plugin command.
   *  This is the primary way steps trigger work — they invoke the
   *  plugin command and evaluate the result, rather than reimplementing
   *  the command's logic.
   *
   *  Example: ctx.invokeCommand("/build-component", "StarRating")
   *  Example: ctx.invokeCommand("/design-audit", "/beans")
   *
   *  Returns the command's output and whether it succeeded. */
  invokeCommand(command: string, args?: string): Promise<CommandResult>;

  /** Pause execution and prompt the user for approval.
   *  The runner displays the prompt and waits for explicit confirmation.
   *  Used for: approving requirements, approving build plan, confirming
   *  baseline promotion, merging PRs.
   *
   *  Throws if the user rejects (step should catch and return "failed"). */
  awaitApproval(prompt: string): Promise<void>;

  /** Persist a step's result to WORKFLOW_STATE.json.
   *  Called by the runner after execute() returns — steps should NOT
   *  call this directly. Exposed on the interface for testing. */
  updateState(stepId: string, result: StepResult): void;
}

// ─────────────────────────────────────────────────────
//  Supporting Types
// ─────────────────────────────────────────────────────

/**
 * Parsed orchestrator.config.yaml. Contains all project-specific
 * configuration: artifact paths, shell commands, CI rules, branch
 * names, and step overrides.
 */
interface OrchestratorConfig {
  /** Project name (used in --explain headers and PR bodies) */
  project: string;

  /** Pipeline scope — determines which steps run vs. skip */
  scope: PipelineScope;

  /** Branch configuration */
  branches: {
    /** Always-green branch (e.g. "main") — all CI required to merge */
    main: string;
    /** Integration branch for multi-wave builds (e.g. "feat/client-rebuild").
     *  null for component/feature scopes that PR directly to main. */
    feature: string | null;
  };

  /** Paths to key artifact files (relative to project root).
   *  Steps use these to check for existence and to know where to write. */
  artifacts: {
    requirements: string;  // e.g. "docs/UI_REQUIREMENTS.md"
    inventory: string;     // e.g. "docs/COMPONENT_INVENTORY.md"
    build_plan: string;    // e.g. "docs/BUILD_PLAN.md"
    build_status: string;  // e.g. "docs/BUILD_STATUS.md"
    design_audit: string;  // e.g. "docs/DESIGN_AUDIT.md"
    visual_qa: string;     // e.g. "docs/VISUAL_QA.md"
  };

  /** Shell commands the runner executes via ctx.exec().
   *  Each project defines its own — the runner is command-agnostic. */
  commands: {
    test_client: string;   // e.g. "cd client && npm test"
    test_server: string;   // e.g. "cd server && npm test"
    test_e2e: string;      // e.g. "npm run db:seed && npx playwright test"
    build_client: string;  // e.g. "cd client && npm run build"
    dev_server: string;    // e.g. "npm run dev:client"
    typecheck: string;     // e.g. "cd client && npx tsc --noEmit"
  };

  /** CI check configuration per branch target */
  ci: {
    /** CI jobs that must pass to merge to main (e.g. ["server", "client", "e2e"]) */
    required_on_main: string[];
    /** CI jobs that must pass to merge to feature branch */
    required_on_feature: string[];
    /** CI jobs that run but don't block merge on feature branch */
    informational_on_feature: string[];
  };

  /** Optional step overrides. When omitted, the runner generates
   *  defaults based on scope. */
  steps?: StepDefinition[];
}

/**
 * The pipeline's scope — what are we building?
 */
interface PipelineScope {
  /** Scale of the work */
  type: "app" | "page" | "component" | "feature";

  /** What specifically (null for app-scope, name for others).
   *  Examples: "BeanLibrary", "RoastChart", "add-compare-flow" */
  target: string | null;
}

/**
 * Full contents of WORKFLOW_STATE.json. Read on startup to resume,
 * updated after every step completes.
 */
interface WorkflowState {
  /** Project name (must match config) */
  project: string;

  /** Scope at pipeline creation time */
  scope: PipelineScope;

  /** When the pipeline was first started (ISO 8601) */
  started_at: string;

  /** When the state file was last written (ISO 8601) */
  updated_at: string;

  /** Per-step status and results. Keys are step IDs.
   *  Missing keys = step has not started (implicit "pending"). */
  steps: Record<string, StepState>;
}

/**
 * Per-step state within WORKFLOW_STATE.json.
 */
interface StepState {
  /** Current status */
  status: "in_progress" | "passed" | "failed" | "skipped";

  /** When this step started (ISO 8601). Set on transition to in_progress. */
  started_at?: string;

  /** When this step completed (ISO 8601). Set on transition to passed/failed/skipped. */
  completed_at?: string;

  /** Artifacts produced (from StepResult) */
  artifacts: string[];

  /** Metrics collected (from StepResult) */
  metrics: Record<string, number>;

  /** Human-readable summary (from StepResult) */
  message: string;
}

/**
 * Options for ctx.exec() shell command execution.
 */
interface ExecOpts {
  /** Working directory (default: projectRoot) */
  cwd?: string;

  /** Max execution time in milliseconds (default: 120_000 = 2 minutes) */
  timeout?: number;

  /** Additional environment variables merged with process.env */
  env?: Record<string, string>;
}

/**
 * Result of ctx.exec() shell command execution.
 */
interface ExecResult {
  /** Process exit code (0 = success) */
  exitCode: number;

  /** Combined stdout content */
  stdout: string;

  /** Combined stderr content */
  stderr: string;

  /** Whether the command was killed due to timeout */
  timedOut: boolean;
}

/**
 * Result of ctx.invokeCommand() plugin command invocation.
 * The orchestrator calls plugin commands (e.g. "/build-component")
 * and inspects the result to determine pass/fail.
 */
interface CommandResult {
  /** Whether the command completed successfully */
  success: boolean;

  /** Command's text output (for logging and error diagnosis) */
  output: string;

  /** Paths to files the command created or modified (if detectable) */
  artifacts: string[];

  /** If failed, the error message */
  error?: string;
}
```

---

## Config Schema

```yaml
# orchestrator.config.yaml

project: coffee-roast-tracker

scope:
  type: app                    # "app" | "page" | "component" | "feature"
  target: null                 # null for app, "BeanLibrary" for page, etc.

branches:
  main: main                   # always-green branch
  feature: feat/client-rebuild # integration branch (null if scope < app)

artifacts:
  requirements: docs/UI_REQUIREMENTS.md
  inventory: docs/COMPONENT_INVENTORY.md
  build_plan: docs/BUILD_PLAN.md
  build_status: docs/BUILD_STATUS.md
  design_audit: docs/DESIGN_AUDIT.md
  visual_qa: docs/VISUAL_QA.md

commands:
  test_client: "cd client && npm test"
  test_server: "cd server && npm test"
  test_e2e: "npm run db:seed && npx playwright test"
  build_client: "cd client && npm run build"
  dev_server: "npm run dev:client"
  typecheck: "cd client && npx tsc --noEmit"

ci:
  required_on_main: [server, client, e2e]
  required_on_feature: [server, client]
  informational_on_feature: [e2e]

# Steps can be omitted — the runner uses defaults based on scope.
# Override only when you need non-standard behavior.
steps:
  # Explicit overrides go here. See "Default Pipeline" section.
```

### Scope-aware defaults

When `steps:` is omitted or partial, the runner generates the
default pipeline based on scope:

| Scope | Steps included | Steps skipped |
|-------|---------------|---------------|
| **app** | All 14 steps | None |
| **page** | All except merge-to-main uses feature branch | None |
| **component** | requirements-gate, build-wave (1 wave), test-suite, pre-commit-review, open-prs | e2e-scaffold, dependency-resolve, post-wave-review, e2e-green, design-audit, visual-qa, set-baseline |
| **feature** | All except e2e-scaffold (uses existing tests), dependency-resolve may produce 1-2 waves | set-baseline (existing baseline) |

Skipped steps still appear in `--explain` output with
"skipped — below scope threshold" so the user knows the
full pipeline exists.

---

## Pipeline Flow — Full Step Reference

### Phase 1: Requirements

#### session-start

| | |
|---|---|
| **Type** | `session-start` |
| **Scope threshold** | all |
| **Prerequisites** | None |
| **What it does** | Reads project docs (CLAUDE.md, requirements, inventory, build status). Produces structured briefing: what's complete, what's next, blockers. |
| **Pass condition** | Briefing generated. Always passes — missing files are reported, not fatal. |
| **Fail condition** | Never fails. Informational only. |
| **Artifacts produced** | None (verbal output) |
| **Invokes** | `/session-start` plugin command |

#### ui-interview

| | |
|---|---|
| **Type** | `requirements-gate` |
| **Scope threshold** | all |
| **Prerequisites** | None (session-start runs first by convention) |
| **What it does** | Interactive Q&A with user. Produces requirements and component inventory. For smaller scopes, the interview is shorter and focused on the target. |
| **Pass condition** | Both artifact files exist AND user has explicitly approved them. |
| **Fail condition** | User cancels, or artifacts incomplete/missing. |
| **Artifacts produced** | `UI_REQUIREMENTS.md`, `COMPONENT_INVENTORY.md` |
| **Invokes** | `/ui-interview` plugin command |
| **User approval gate** | Yes — user must approve both documents |

#### review-requirements

| | |
|---|---|
| **Type** | `review-requirements` |
| **Scope threshold** | page, app |
| **Prerequisites** | `ui-interview` complete |
| **What it does** | Reads requirements, inventory, and build status. Summarizes what's built, what's next, what's blocked. |
| **Pass condition** | Summary generated. Informational. |
| **Fail condition** | Required artifact files missing. |
| **Artifacts produced** | None (verbal output) |
| **Invokes** | `/review-requirements` plugin command |

### Phase 2: Planning

#### e2e-scaffold

| | |
|---|---|
| **Type** | `e2e-scaffold` |
| **Scope threshold** | page, app |
| **Prerequisites** | `ui-interview` complete |
| **What it does** | Writes Playwright test files for every user flow in requirements. Runs them — expects all to fail (nothing to pass yet). |
| **Pass condition** | Test files exist in e2e dir AND all tests fail. |
| **Fail condition** | Tests unexpectedly pass (stale components), or writer errors. |
| **Artifacts produced** | `e2e/*.spec.ts` files |
| **Invokes** | `e2e-writer` subagent |

#### dependency-resolve

| | |
|---|---|
| **Type** | `dependency-resolve` |
| **Scope threshold** | page, app (single wave for component/feature) |
| **Prerequisites** | `ui-interview` complete |
| **What it does** | Reads inventory, groups components into build waves by dependency order. Wave 0 = no deps, Wave N = all deps in earlier waves. Writes build plan. |
| **Pass condition** | BUILD_PLAN.md exists, no circular deps, user explicitly approves. |
| **Fail condition** | Circular dependency detected, or user rejects plan. |
| **Artifacts produced** | `BUILD_PLAN.md` |
| **Invokes** | `dependency-resolver` subagent |
| **User approval gate** | Yes — user must approve BUILD_PLAN.md |

### Phase 3: Build (repeats per wave)

The runner generates N instances of these three steps from
BUILD_PLAN.md. Each wave triplet depends on the previous
wave's `await-merge` completing.

#### build-wave:N

| | |
|---|---|
| **Type** | `build-wave` |
| **Scope threshold** | all |
| **Prerequisites** | `dependency-resolve` complete + `await-merge:N-1` complete (or none if N=0) |
| **What it does** | For each component in wave N, invokes component-builder subagent **in parallel**. Each builder runs the full TDD protocol: write RTL tests → confirm fail → build component → confirm pass → CSS modules pass → code-reviewer gate (critical/major must pass clean) → code-simplifier pass → mark `[x]` in inventory. |
| **Pass condition** | All components in wave marked `[x]` complete in COMPONENT_INVENTORY.md. |
| **Fail condition** | Any component fails TDD protocol, code review gate, or tests. |
| **Artifacts produced** | Component files, test files, CSS modules, updated inventory entries |
| **Invokes** | `/build-component [Name]` for each component (parallel within wave) |

#### test-suite:N

| | |
|---|---|
| **Type** | `test-suite` |
| **Scope threshold** | all |
| **Prerequisites** | `build-wave:N` complete |
| **What it does** | Runs typecheck, full RTL suite, and E2E suite. Logs results to BUILD_STATUS.md. |
| **Pass condition** | Typecheck: 0 errors. RTL: 0 failures. E2E: failure count <= previous wave (monotonically improving). E2E is informational, not blocking, until `e2e-green` step. |
| **Fail condition** | New typecheck errors, new RTL failures, or E2E regression (more failures than previous wave). |
| **Artifacts produced** | Updated `BUILD_STATUS.md` |
| **Invokes** | Commands from config: `typecheck`, `test_client`, `test_e2e` |

#### post-wave-review:N

| | |
|---|---|
| **Type** | `post-wave-review` |
| **Scope threshold** | page, app |
| **Prerequisites** | `test-suite:N` passes |
| **What it does** | Runs code-reviewer + code-simplifier on wave's full diff (catches cross-component issues the per-component review missed). Runs design-audit on routes touched by this wave. Auto-fixes critical/major violations. |
| **Pass condition** | Code review clean (no critical/major). Design audit clean (no unresolved critical). |
| **Fail condition** | Unresolved critical violations after auto-fix attempt. Escalate to user. |
| **Artifacts produced** | Fixes applied to source files |
| **Invokes** | `code-reviewer` subagent, `code-simplifier` subagent, `/design-audit [routes]` |

#### open-prs:N

| | |
|---|---|
| **Type** | `open-prs` |
| **Scope threshold** | all |
| **Prerequisites** | `post-wave-review:N` passes (or `test-suite:N` if scope=component) |
| **What it does** | For each component in the wave: creates branch, commits, pushes, opens PR targeting the feature branch (or main if no feature branch). PR body uses standard template with tests, checklist, screenshots. |
| **Pass condition** | All PRs opened successfully, Server + Client CI green. |
| **Fail condition** | CI failures on any PR. Fix on branch, re-push. |
| **Artifacts produced** | Git branches, PRs |
| **Invokes** | Git commands, `gh pr create` |

#### await-merge:N

| | |
|---|---|
| **Type** | `await-merge` |
| **Scope threshold** | all |
| **Prerequisites** | `open-prs:N` complete |
| **What it does** | Gate that checks all PRs from wave N are merged. Reports status and pauses until all are merged. |
| **Pass condition** | All PRs from this wave are in `merged` state. |
| **Fail condition** | User closes a PR without merging (needs discussion). |
| **Artifacts produced** | None |
| **User approval gate** | Yes — user merges PRs at their own pace |

### Phase 4: Quality

#### e2e-green

| | |
|---|---|
| **Type** | `e2e-green` |
| **Scope threshold** | page, app |
| **Prerequisites** | All `await-merge:N` steps complete |
| **What it does** | For any still-failing E2E tests: diagnoses root cause, fixes components (never modifies test assertions), re-runs until green. |
| **Pass condition** | E2E suite: 0 failures. |
| **Fail condition** | Cannot resolve failures without modifying tests. Escalate to user. |
| **Artifacts produced** | Component fixes |
| **Invokes** | `test_e2e` command, component edits |

#### design-audit

| | |
|---|---|
| **Type** | `design-audit` |
| **Scope threshold** | page, app |
| **Prerequisites** | `e2e-green` complete |
| **What it does** | Full design + a11y audit at all breakpoints (375, 768, 1280, 1440px). Three parallel subagents: static analysis, axe-core, screenshot capture. Auto-fixes critical and major violations. Re-runs to verify fixes. |
| **Pass condition** | 0 critical violations. 0 major violations. DESIGN_AUDIT.md written. |
| **Fail condition** | Unresolved critical/major after auto-fix. Escalate to user. |
| **Artifacts produced** | `DESIGN_AUDIT.md`, screenshots |
| **Invokes** | `/design-audit` plugin command |

#### visual-qa

| | |
|---|---|
| **Type** | `visual-qa` |
| **Scope threshold** | page, app |
| **Prerequisites** | `design-audit` passes |
| **What it does** | UX quality review: Nielsen's heuristics, Gestalt principles, interaction quality, frustration signals. Auto-fixes critical/major issues. |
| **Pass condition** | 0 critical UX issues. VISUAL_QA.md written. |
| **Fail condition** | Unresolved critical UX issues. Escalate to user. |
| **Artifacts produced** | `VISUAL_QA.md` |
| **Invokes** | `/visual-qa` plugin command |

#### set-baseline

| | |
|---|---|
| **Type** | `set-baseline` |
| **Scope threshold** | page, app |
| **Prerequisites** | `design-audit` passes |
| **What it does** | Captures screenshots at all breakpoints, promotes to visual regression baseline. |
| **Pass condition** | User confirms baseline promotion. |
| **Fail condition** | User rejects. |
| **Artifacts produced** | Baseline screenshots |
| **Invokes** | `/set-baseline` plugin command |
| **User approval gate** | Yes — user confirms overwrite |

### Phase 5: Ship

#### pre-commit-review

| | |
|---|---|
| **Type** | `pre-commit-review` |
| **Scope threshold** | all |
| **Prerequisites** | `visual-qa` passes + `set-baseline` complete (or `test-suite` if scope=component) |
| **What it does** | Runs code-reviewer + code-simplifier on full diff since feature branch creation. Applies fixes. Re-runs all test suites (typecheck, RTL, E2E). |
| **Pass condition** | All tests pass. No critical/major review findings. |
| **Fail condition** | Test failures or unresolved findings. |
| **Artifacts produced** | Fixes applied, updated BUILD_STATUS.md |
| **Invokes** | `code-reviewer`, `code-simplifier`, all test commands |

#### merge-to-main

| | |
|---|---|
| **Type** | `merge-to-main` |
| **Scope threshold** | app (feature-branch scopes only) |
| **Prerequisites** | `pre-commit-review` passes |
| **What it does** | Opens PR from feature branch to main with guided review body. All CI checks (Server, Client, E2E) must be green merge gates. Updates BUILD_STATUS.md with final summary. |
| **Pass condition** | All CI green, PR merged. |
| **Fail condition** | CI failures (fix on feature branch, re-push). |
| **Artifacts produced** | PR, updated BUILD_STATUS.md |
| **Invokes** | Git commands, `gh pr create` |
| **User approval gate** | Yes — user merges the final PR |

---

## State Management

### WORKFLOW_STATE.json

Machine-readable progress file. Updated after every step.

```json
{
  "project": "coffee-roast-tracker",
  "scope": { "type": "app", "target": null },
  "started_at": "2026-04-06T10:00:00Z",
  "updated_at": "2026-04-06T14:30:00Z",
  "steps": {
    "session-start": {
      "status": "passed",
      "completed_at": "2026-04-06T10:01:00Z",
      "artifacts": [],
      "metrics": {},
      "message": "Briefing generated. 0/34 components built."
    },
    "ui-interview": {
      "status": "passed",
      "completed_at": "2026-04-06T10:45:00Z",
      "artifacts": [
        "docs/UI_REQUIREMENTS.md",
        "docs/COMPONENT_INVENTORY.md"
      ],
      "metrics": { "components": 34, "pages": 9 },
      "message": "34 components across 9 pages. User approved."
    },
    "build-wave:0": {
      "status": "passed",
      "completed_at": "2026-04-06T12:00:00Z",
      "artifacts": ["client/src/styles/tokens.css"],
      "metrics": { "components_built": 6, "rtl_pass": 42, "rtl_fail": 0 },
      "message": "Wave 0: 6 foundation components built. 42 RTL passing."
    },
    "test-suite:0": {
      "status": "passed",
      "completed_at": "2026-04-06T12:05:00Z",
      "artifacts": [],
      "metrics": { "rtl_pass": 42, "rtl_fail": 0, "e2e_pass": 0, "e2e_fail": 91 },
      "message": "RTL: 42/42. E2E: 0/91 (expected, informational)."
    },
    "build-wave:1": {
      "status": "in_progress",
      "started_at": "2026-04-06T13:00:00Z",
      "artifacts": [],
      "metrics": {},
      "message": "Building 8 components in parallel..."
    }
  }
}
```

### State transitions

```
pending → in_progress → passed
                      → failed
                      → skipped (scope below threshold)
```

Steps cannot transition from `failed` to `passed` without
re-executing. Re-execution resets the step to `in_progress`.

The runner reads WORKFLOW_STATE.json on startup, resolves
what's runnable (all deps passed, step not yet passed),
and executes the next available step. This makes the pipeline
**resumable** — if a session ends mid-pipeline, the next
`orchestrate` invocation picks up where it left off.

---

## Branch Strategy

```
main (always green — Server, Client, E2E all required)
 |
 +-- feat/<scope-name> (integration branch — E2E informational)
      |
      +-- feat/<component-name>  (wave PRs target integration branch)
      +-- feat/<component-name>
      +-- ...
      |
      final PR: feat/<scope-name> → main (all CI required)
```

| Target branch | Server CI | Client CI | E2E CI |
|---------------|-----------|-----------|--------|
| `main` | Required | Required | Required |
| `feat/*` integration | Required | Required | Informational |

For scopes without a feature branch (component, small feature),
PRs target main directly and all CI is required.

---

## CLI Interface

```bash
# Start or resume the pipeline
orchestrate

# Show current state
orchestrate status

# Print the full flow in plain English (no side effects)
orchestrate --explain

# Run a specific step (for debugging/manual override)
orchestrate run <step-id>

# Reset a step to pending (re-run it)
orchestrate reset <step-id>

# Initialize config for a new project
orchestrate init
```

### `--explain` output example

```
Frontend Orchestrator — coffee-roast-tracker (scope: app)

Phase 1: Requirements
  [x] session-start — Read project docs, produce briefing
      Pass: briefing generated (always passes)
  [x] ui-interview — Interactive requirements interview
      Pass: UI_REQUIREMENTS.md + COMPONENT_INVENTORY.md exist, user approved
      Gate: USER APPROVAL (approve both documents)
  [x] review-requirements — Summarize build state
      Pass: summary generated

Phase 2: Planning
  [x] e2e-scaffold — Write E2E tests for all user flows
      Pass: test files exist, all tests fail (nothing built yet)
  [x] dependency-resolve — Group components into build waves
      Pass: BUILD_PLAN.md exists, no circular deps, user approved
      Gate: USER APPROVAL (approve build plan)

Phase 3: Build
  Wave 0 (6 components: tokens, reset, formatters, ...):
    [x] build-wave:0 — Build components (parallel), TDD + review + simplify each
    [x] test-suite:0 — RTL: 42/42, E2E: 0/91 (informational)
    [x] post-wave-review:0 — Code review clean, no critical a11y violations
    [x] open-prs:0 — 6 PRs opened targeting feat/client-rebuild
    [x] await-merge:0 — All 6 PRs merged

  Wave 1 (8 components: Modal, StarRating, FlavorPill, ...):
    [>] build-wave:1 — Building 8 components in parallel...
        Pass: all 8 marked [x] in inventory
    [ ] test-suite:1
    [ ] post-wave-review:1
    [ ] open-prs:1
    [ ] await-merge:1

  Wave 2 ...

Phase 4: Quality
  [ ] e2e-green — Fix components until E2E suite is 100% green
  [ ] design-audit — Full a11y + design audit at all breakpoints
  [ ] visual-qa — UX quality review (Nielsen, Gestalt, frustration signals)
  [ ] set-baseline — Promote screenshots to regression baseline
      Gate: USER APPROVAL (confirm baseline)

Phase 5: Ship
  [ ] pre-commit-review — Final code review + simplify + all tests
  [ ] merge-to-main — PR from feat/client-rebuild → main (all CI green)
      Gate: USER APPROVAL (merge final PR)
```

---

## Design Constraints (Mitigations)

### Steps invoke commands, they don't reimplement them

The Step interface is designed to make it natural to call
`ctx.invokeCommand("/build-component StarRating")` and
evaluate the result, and awkward to inline business logic.
The plugin commands remain the source of truth for what
each step does. The orchestrator is the traffic cop.

If a step's `execute()` method exceeds ~50 lines of logic
(beyond command invocation and result evaluation), that's
a signal the logic belongs in a plugin command, not the step.

### Self-describing steps for explainability

Every step implements `describe()` returning structured metadata:
summary, prerequisites, artifacts, pass/fail conditions, scope
threshold. The `--explain` command composes these into the full
flow documentation. The code IS the documentation — no prose
workflow docs to keep in sync.

### Scope boundary enforcement

The runner's scope is: resolve DAG, check artifacts, invoke
commands, evaluate pass/fail, update state. PRs that add
retry logic, scheduling, distributed execution, or cross-machine
persistence are out of scope and should be rejected in review.

---

## Scope Adaptation

| Scope | ui-interview | e2e-scaffold | Waves | design-audit | visual-qa | Branch strategy |
|-------|-------------|-------------|-------|-------------|-----------|----------------|
| **app** | Full app requirements | All user flows | Many waves, feature branch | All routes | All routes | `feat/*` → `main` |
| **page** | Page-focused requirements | Flows touching this page | 1-3 waves, feature branch | This route only | This route only | `feat/*` → `main` |
| **component** | Component spec only | Skipped (RTL only) | 1 wave, direct to main | Skipped | Skipped | Direct to `main` |
| **feature** | Feature requirements | Affected flows only | 1-2 waves | Affected routes | Affected routes | `feat/*` → `main` or direct |

Skipped steps still appear in `--explain` output annotated with
"skipped — below scope threshold for [component]" so the full
pipeline is always visible.

Scopes compose: build Bean Library as a page-scope pipeline,
build Roast Detail as another, then run an app-scope
design-audit + visual-qa across everything.

---

## Open Questions

None. All questions resolved during design discussion.
