# Frontend Orchestrator DAG Runner — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a portable, config-driven DAG runner that enforces the frontend-orchestration plugin's workflow with typed step implementations, quality gates, scope-aware execution, and incremental PRs.

**Architecture:** TypeScript CLI tool (`orchestrate`) that reads `orchestrator.config.yaml`, resolves a dependency graph of steps, tracks progress in `WORKFLOW_STATE.json`, and executes steps by invoking plugin commands. Steps are typed classes implementing a `Step` interface with `describe()`, `preflight()`, and `execute()` methods.

**Tech Stack:** TypeScript, Zod (config validation), yaml (config parsing), Node.js built-in `child_process` for shell execution. No runtime dependencies beyond these.

---

## File Structure

```
orchestrator/
  package.json              # name: "@frontend-orchestration/runner"
  tsconfig.json
  src/
    types.ts                # All shared interfaces and type definitions
    config/
      schema.ts             # Zod schema for orchestrator.config.yaml
      loader.ts             # Parse + validate config file
      defaults.ts           # Generate default step pipeline based on scope
    state/
      state.ts              # Read/write WORKFLOW_STATE.json
    runner/
      dag.ts                # Topological sort, dependency resolution
      executor.ts           # Run next step, handle results
      context.ts            # RunContext implementation
    steps/
      base.ts               # Abstract base class with shared helpers
      session-start.ts
      requirements-gate.ts
      review-requirements.ts
      e2e-scaffold.ts
      dependency-resolve.ts
      build-wave.ts
      test-suite.ts
      post-wave-review.ts
      e2e-green.ts
      design-audit.ts
      visual-qa.ts
      set-baseline.ts
      pre-commit-review.ts
      open-prs.ts
      await-merge.ts
      merge-to-main.ts
      registry.ts           # Maps type string → Step class
    explain/
      explain.ts            # --explain output formatter
    cli.ts                  # Entry point, arg parsing
  tests/
    config/
      schema.test.ts
      loader.test.ts
      defaults.test.ts
    state/
      state.test.ts
    runner/
      dag.test.ts
      executor.test.ts
      context.test.ts
    steps/
      base.test.ts
      session-start.test.ts
      requirements-gate.test.ts
      build-wave.test.ts
      test-suite.test.ts
      open-prs.test.ts
      await-merge.test.ts
    explain/
      explain.test.ts
    cli.test.ts
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `orchestrator/package.json`
- Create: `orchestrator/tsconfig.json`
- Create: `orchestrator/src/types.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@frontend-orchestration/runner",
  "version": "0.1.0",
  "type": "module",
  "bin": {
    "orchestrate": "./dist/cli.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/cli.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "yaml": "^2.7.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "vitest": "^4.1.0"
  },
  "engines": {
    "node": ">=20"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 3: Create src/types.ts with all shared interfaces**

This is the full type system from the design spec. Every other file imports from here.

```typescript
// ─── Scope ───────────────────────────────────────────

/**
 * Scope levels ordered smallest to largest.
 * A step with scope "page" runs for page and app pipelines,
 * but is skipped for component and feature pipelines.
 */
export const SCOPE_ORDER = ["component", "feature", "page", "app"] as const;
export type ScopeThreshold = (typeof SCOPE_ORDER)[number];

export interface PipelineScope {
  type: ScopeThreshold;
  target: string | null;
}

/** Returns true if the pipeline scope meets or exceeds the threshold. */
export function scopeMeetsThreshold(
  pipelineScope: ScopeThreshold,
  threshold: ScopeThreshold,
): boolean {
  return SCOPE_ORDER.indexOf(pipelineScope) >= SCOPE_ORDER.indexOf(threshold);
}

// ─── Config ──────────────────────────────────────────

export interface OrchestratorConfig {
  project: string;
  scope: PipelineScope;
  branches: {
    main: string;
    feature: string | null;
  };
  artifacts: {
    requirements: string;
    inventory: string;
    build_plan: string;
    build_status: string;
    design_audit: string;
    visual_qa: string;
  };
  commands: {
    test_client: string;
    test_server: string;
    test_e2e: string;
    build_client: string;
    dev_server: string;
    typecheck: string;
  };
  ci: {
    required_on_main: string[];
    required_on_feature: string[];
    informational_on_feature: string[];
  };
  steps?: StepDefinition[];
}

// ─── Step Definition (from config) ───────────────────

export interface StepDefinition {
  id: string;
  type: string;
  deps: string[];
  params: Record<string, unknown>;
}

// ─── Step Result ─────────────────────────────────────

export interface StepResult {
  status: "passed" | "failed" | "skipped";
  artifacts: string[];
  metrics: Record<string, number>;
  message: string;
}

// ─── Step Description (for --explain) ────────────────

export interface StepDescription {
  id: string;
  type: string;
  summary: string;
  prerequisites: string[];
  artifacts: string[];
  passCondition: string;
  failCondition: string;
  scope: ScopeThreshold;
}

// ─── Preflight ───────────────────────────────────────

export interface PreflightResult {
  ready: boolean;
  issues: string[];
}

// ─── Exec ────────────────────────────────────────────

export interface ExecOpts {
  cwd?: string;
  timeout?: number;
  env?: Record<string, string>;
}

export interface ExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

// ─── Command ─────────────────────────────────────────

export interface CommandResult {
  success: boolean;
  output: string;
  artifacts: string[];
  error?: string;
}

// ─── Run Context ─────────────────────────────────────

export interface RunContext {
  config: OrchestratorConfig;
  state: WorkflowState;
  projectRoot: string;
  scope: PipelineScope;
  resolve(path: string): string;
  exists(path: string): Promise<boolean>;
  exec(cmd: string, opts?: ExecOpts): Promise<ExecResult>;
  invokeCommand(command: string, args?: string): Promise<CommandResult>;
  awaitApproval(prompt: string): Promise<void>;
  updateState(stepId: string, result: StepResult): void;
}

// ─── Step Interface ──────────────────────────────────

export interface Step {
  describe(): StepDescription;
  preflight(ctx: RunContext): Promise<PreflightResult>;
  execute(ctx: RunContext): Promise<StepResult>;
}

// ─── Workflow State ──────────────────────────────────

export interface StepState {
  status: "in_progress" | "passed" | "failed" | "skipped";
  started_at?: string;
  completed_at?: string;
  artifacts: string[];
  metrics: Record<string, number>;
  message: string;
}

export interface WorkflowState {
  project: string;
  scope: PipelineScope;
  started_at: string;
  updated_at: string;
  steps: Record<string, StepState>;
}
```

- [ ] **Step 4: Install dependencies and verify**

Run: `cd orchestrator && npm install`
Run: `cd orchestrator && npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
git add orchestrator/
git commit -m "feat(orchestrator): scaffold project with full type system"
```

---

### Task 2: Config Schema + Loader

**Files:**
- Create: `orchestrator/src/config/schema.ts`
- Create: `orchestrator/src/config/loader.ts`
- Create: `orchestrator/tests/config/schema.test.ts`
- Create: `orchestrator/tests/config/loader.test.ts`

- [ ] **Step 1: Write failing tests for config schema validation**

```typescript
// tests/config/schema.test.ts
import { describe, it, expect } from "vitest";
import { configSchema } from "../../src/config/schema.js";

const VALID_CONFIG = {
  project: "test-project",
  scope: { type: "app", target: null },
  branches: { main: "main", feature: "feat/rebuild" },
  artifacts: {
    requirements: "docs/UI_REQUIREMENTS.md",
    inventory: "docs/COMPONENT_INVENTORY.md",
    build_plan: "docs/BUILD_PLAN.md",
    build_status: "docs/BUILD_STATUS.md",
    design_audit: "docs/DESIGN_AUDIT.md",
    visual_qa: "docs/VISUAL_QA.md",
  },
  commands: {
    test_client: "npm test",
    test_server: "cd server && npm test",
    test_e2e: "npx playwright test",
    build_client: "npm run build",
    dev_server: "npm run dev",
    typecheck: "npx tsc --noEmit",
  },
  ci: {
    required_on_main: ["server", "client", "e2e"],
    required_on_feature: ["server", "client"],
    informational_on_feature: ["e2e"],
  },
};

describe("configSchema", () => {
  it("accepts a valid full config", () => {
    const result = configSchema.safeParse(VALID_CONFIG);
    expect(result.success).toBe(true);
  });

  it("rejects missing project name", () => {
    const { project, ...rest } = VALID_CONFIG;
    const result = configSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects invalid scope type", () => {
    const config = { ...VALID_CONFIG, scope: { type: "universe", target: null } };
    const result = configSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it("accepts null feature branch", () => {
    const config = {
      ...VALID_CONFIG,
      branches: { main: "main", feature: null },
    };
    const result = configSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it("accepts config without steps (uses defaults)", () => {
    const result = configSchema.safeParse(VALID_CONFIG);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.steps).toBeUndefined();
    }
  });

  it("accepts config with explicit steps", () => {
    const config = {
      ...VALID_CONFIG,
      steps: [
        { id: "session-start", type: "session-start", deps: [], params: {} },
        { id: "ui-interview", type: "requirements-gate", deps: [], params: {} },
      ],
    };
    const result = configSchema.safeParse(config);
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd orchestrator && npx vitest run tests/config/schema.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement config schema**

```typescript
// src/config/schema.ts
import { z } from "zod";

const scopeTypeSchema = z.enum(["app", "page", "component", "feature"]);

const pipelineScopeSchema = z.object({
  type: scopeTypeSchema,
  target: z.string().nullable(),
});

const stepDefinitionSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  deps: z.array(z.string()),
  params: z.record(z.unknown()),
});

export const configSchema = z.object({
  project: z.string().min(1),
  scope: pipelineScopeSchema,
  branches: z.object({
    main: z.string().min(1),
    feature: z.string().nullable(),
  }),
  artifacts: z.object({
    requirements: z.string().min(1),
    inventory: z.string().min(1),
    build_plan: z.string().min(1),
    build_status: z.string().min(1),
    design_audit: z.string().min(1),
    visual_qa: z.string().min(1),
  }),
  commands: z.object({
    test_client: z.string().min(1),
    test_server: z.string().min(1),
    test_e2e: z.string().min(1),
    build_client: z.string().min(1),
    dev_server: z.string().min(1),
    typecheck: z.string().min(1),
  }),
  ci: z.object({
    required_on_main: z.array(z.string()),
    required_on_feature: z.array(z.string()),
    informational_on_feature: z.array(z.string()),
  }),
  steps: z.array(stepDefinitionSchema).optional(),
});

export type ValidatedConfig = z.infer<typeof configSchema>;
```

- [ ] **Step 4: Run schema tests to verify they pass**

Run: `cd orchestrator && npx vitest run tests/config/schema.test.ts`
Expected: 6 passed

- [ ] **Step 5: Write failing tests for config loader**

```typescript
// tests/config/loader.test.ts
import { describe, it, expect } from "vitest";
import { loadConfig } from "../../src/config/loader.js";
import { writeFileSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

function makeTempDir(): string {
  const dir = join(tmpdir(), `orchestrator-test-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

const VALID_YAML = `
project: test-project
scope:
  type: app
  target: null
branches:
  main: main
  feature: feat/rebuild
artifacts:
  requirements: docs/UI_REQUIREMENTS.md
  inventory: docs/COMPONENT_INVENTORY.md
  build_plan: docs/BUILD_PLAN.md
  build_status: docs/BUILD_STATUS.md
  design_audit: docs/DESIGN_AUDIT.md
  visual_qa: docs/VISUAL_QA.md
commands:
  test_client: "npm test"
  test_server: "cd server && npm test"
  test_e2e: "npx playwright test"
  build_client: "npm run build"
  dev_server: "npm run dev"
  typecheck: "npx tsc --noEmit"
ci:
  required_on_main: [server, client, e2e]
  required_on_feature: [server, client]
  informational_on_feature: [e2e]
`;

describe("loadConfig", () => {
  it("loads and validates a YAML config file", () => {
    const dir = makeTempDir();
    writeFileSync(join(dir, "orchestrator.config.yaml"), VALID_YAML);
    const config = loadConfig(dir);
    expect(config.project).toBe("test-project");
    expect(config.scope.type).toBe("app");
    rmSync(dir, { recursive: true });
  });

  it("throws if config file is missing", () => {
    const dir = makeTempDir();
    expect(() => loadConfig(dir)).toThrow(/not found/i);
    rmSync(dir, { recursive: true });
  });

  it("throws if config is invalid YAML", () => {
    const dir = makeTempDir();
    writeFileSync(join(dir, "orchestrator.config.yaml"), "project: ");
    expect(() => loadConfig(dir)).toThrow();
    rmSync(dir, { recursive: true });
  });
});
```

- [ ] **Step 6: Implement config loader**

```typescript
// src/config/loader.ts
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import YAML from "yaml";
import { configSchema } from "./schema.js";
import type { OrchestratorConfig } from "../types.js";

const CONFIG_FILENAME = "orchestrator.config.yaml";

export function loadConfig(projectRoot: string): OrchestratorConfig {
  const configPath = join(projectRoot, CONFIG_FILENAME);

  if (!existsSync(configPath)) {
    throw new Error(
      `Config not found: ${configPath}\nRun 'orchestrate init' to create one.`,
    );
  }

  const raw = readFileSync(configPath, "utf-8");
  const parsed = YAML.parse(raw);
  const result = configSchema.safeParse(parsed);

  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid config in ${configPath}:\n${issues}`);
  }

  return result.data as OrchestratorConfig;
}
```

- [ ] **Step 7: Run loader tests**

Run: `cd orchestrator && npx vitest run tests/config/loader.test.ts`
Expected: 3 passed

- [ ] **Step 8: Commit**

```bash
git add orchestrator/src/config/ orchestrator/tests/config/
git commit -m "feat(orchestrator): config schema + loader with Zod validation"
```

---

### Task 3: Default Pipeline Generator

**Files:**
- Create: `orchestrator/src/config/defaults.ts`
- Create: `orchestrator/tests/config/defaults.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/config/defaults.test.ts
import { describe, it, expect } from "vitest";
import { generateDefaultPipeline } from "../../src/config/defaults.js";
import type { OrchestratorConfig } from "../../src/types.js";

const BASE_CONFIG: OrchestratorConfig = {
  project: "test",
  scope: { type: "app", target: null },
  branches: { main: "main", feature: "feat/rebuild" },
  artifacts: {
    requirements: "docs/UI_REQUIREMENTS.md",
    inventory: "docs/COMPONENT_INVENTORY.md",
    build_plan: "docs/BUILD_PLAN.md",
    build_status: "docs/BUILD_STATUS.md",
    design_audit: "docs/DESIGN_AUDIT.md",
    visual_qa: "docs/VISUAL_QA.md",
  },
  commands: {
    test_client: "npm test",
    test_server: "cd server && npm test",
    test_e2e: "npx playwright test",
    build_client: "npm run build",
    dev_server: "npm run dev",
    typecheck: "npx tsc --noEmit",
  },
  ci: {
    required_on_main: ["server", "client", "e2e"],
    required_on_feature: ["server", "client"],
    informational_on_feature: ["e2e"],
  },
};

describe("generateDefaultPipeline", () => {
  it("generates all phases for app scope", () => {
    const steps = generateDefaultPipeline(BASE_CONFIG);
    const ids = steps.map((s) => s.id);
    expect(ids).toContain("session-start");
    expect(ids).toContain("ui-interview");
    expect(ids).toContain("e2e-scaffold");
    expect(ids).toContain("dependency-resolve");
    expect(ids).toContain("e2e-green");
    expect(ids).toContain("design-audit");
    expect(ids).toContain("visual-qa");
    expect(ids).toContain("set-baseline");
    expect(ids).toContain("pre-commit-review");
    expect(ids).toContain("merge-to-main");
  });

  it("skips e2e-scaffold, design-audit, visual-qa for component scope", () => {
    const config = { ...BASE_CONFIG, scope: { type: "component" as const, target: "StarRating" } };
    const steps = generateDefaultPipeline(config);
    const ids = steps.map((s) => s.id);
    expect(ids).toContain("ui-interview");
    expect(ids).toContain("pre-commit-review");
    expect(ids).not.toContain("e2e-scaffold");
    expect(ids).not.toContain("design-audit");
    expect(ids).not.toContain("visual-qa");
    expect(ids).not.toContain("set-baseline");
    expect(ids).not.toContain("merge-to-main");
  });

  it("wires dependency-resolve after ui-interview", () => {
    const steps = generateDefaultPipeline(BASE_CONFIG);
    const depResolve = steps.find((s) => s.id === "dependency-resolve")!;
    expect(depResolve.deps).toContain("ui-interview");
  });

  it("wires e2e-scaffold after ui-interview (parallel with dependency-resolve)", () => {
    const steps = generateDefaultPipeline(BASE_CONFIG);
    const e2e = steps.find((s) => s.id === "e2e-scaffold")!;
    expect(e2e.deps).toContain("ui-interview");
    expect(e2e.deps).not.toContain("dependency-resolve");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd orchestrator && npx vitest run tests/config/defaults.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement default pipeline generator**

```typescript
// src/config/defaults.ts
import type { OrchestratorConfig, StepDefinition } from "../types.js";
import { scopeMeetsThreshold } from "../types.js";

/**
 * Generates the default step pipeline based on project scope.
 * Steps below the scope threshold are excluded entirely.
 * Wave-specific steps (build-wave:N, test-suite:N, etc.) are NOT
 * generated here — the runner creates them dynamically after
 * dependency-resolve produces BUILD_PLAN.md.
 */
export function generateDefaultPipeline(
  config: OrchestratorConfig,
): StepDefinition[] {
  const s = config.scope.type;
  const steps: StepDefinition[] = [];

  function add(
    id: string,
    type: string,
    deps: string[],
    params: Record<string, unknown>,
    threshold: typeof s,
  ) {
    if (scopeMeetsThreshold(s, threshold)) {
      steps.push({ id, type, deps, params });
    }
  }

  // Phase 1: Requirements
  add("session-start", "session-start", [], {}, "component");
  add("ui-interview", "requirements-gate", ["session-start"], {}, "component");
  add("review-requirements", "review-requirements", ["ui-interview"], {}, "page");

  // Phase 2: Planning
  add("e2e-scaffold", "e2e-scaffold", ["ui-interview"], {}, "page");
  add("dependency-resolve", "dependency-resolve", ["ui-interview"], {}, "page");

  // Phase 3: Build — wave steps are generated dynamically by the runner
  // after dependency-resolve completes and BUILD_PLAN.md is parsed.
  // For component scope, a single wave is created inline.
  if (s === "component" || s === "feature") {
    add("build-wave:0", "build-wave", ["ui-interview"], { wave: 0 }, "component");
    add("test-suite:0", "test-suite", ["build-wave:0"], { wave: 0, e2e_blocking: false }, "component");
    add("open-prs:0", "open-prs", ["test-suite:0"], { wave: 0 }, "component");
    add("await-merge:0", "await-merge", ["open-prs:0"], { wave: 0 }, "component");
  }

  // Phase 4: Quality
  add("e2e-green", "e2e-green", ["dependency-resolve"], {}, "page");
  add("design-audit", "design-audit", ["e2e-green"], {}, "page");
  add("visual-qa", "visual-qa", ["design-audit"], {}, "page");
  add("set-baseline", "set-baseline", ["design-audit"], {}, "page");

  // Phase 5: Ship
  const shipDeps =
    s === "component" || s === "feature"
      ? ["await-merge:0"]
      : ["visual-qa", "set-baseline"];
  add("pre-commit-review", "pre-commit-review", shipDeps, {}, "component");
  add("merge-to-main", "merge-to-main", ["pre-commit-review"], {}, "app");

  return steps;
}
```

- [ ] **Step 4: Run tests**

Run: `cd orchestrator && npx vitest run tests/config/defaults.test.ts`
Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
git add orchestrator/src/config/defaults.ts orchestrator/tests/config/defaults.test.ts
git commit -m "feat(orchestrator): default pipeline generator based on scope"
```

---

### Task 4: State Management

**Files:**
- Create: `orchestrator/src/state/state.ts`
- Create: `orchestrator/tests/state/state.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/state/state.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { StateManager } from "../../src/state/state.js";
import { mkdirSync, rmSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import type { PipelineScope, StepResult } from "../../src/types.js";

function makeTempDir(): string {
  const dir = join(tmpdir(), `orchestrator-state-test-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe("StateManager", () => {
  let dir: string;
  let mgr: StateManager;
  const scope: PipelineScope = { type: "app", target: null };

  beforeEach(() => {
    dir = makeTempDir();
    mgr = new StateManager(dir);
  });

  it("initializes fresh state when no file exists", () => {
    const state = mgr.load("test-project", scope);
    expect(state.project).toBe("test-project");
    expect(state.scope.type).toBe("app");
    expect(Object.keys(state.steps)).toHaveLength(0);
  });

  it("creates .orchestrator directory on save", () => {
    const state = mgr.load("test-project", scope);
    const result: StepResult = {
      status: "passed",
      artifacts: [],
      metrics: {},
      message: "done",
    };
    mgr.update(state, "session-start", result);
    mgr.save(state);
    expect(existsSync(join(dir, ".orchestrator", "WORKFLOW_STATE.json"))).toBe(true);
    rmSync(dir, { recursive: true });
  });

  it("round-trips state through save and load", () => {
    const state = mgr.load("test-project", scope);
    const result: StepResult = {
      status: "passed",
      artifacts: ["docs/UI_REQUIREMENTS.md"],
      metrics: { components: 34 },
      message: "Requirements approved.",
    };
    mgr.update(state, "ui-interview", result);
    mgr.save(state);

    const loaded = mgr.load("test-project", scope);
    expect(loaded.steps["ui-interview"]?.status).toBe("passed");
    expect(loaded.steps["ui-interview"]?.metrics.components).toBe(34);
    rmSync(dir, { recursive: true });
  });

  it("marks step as in_progress with started_at", () => {
    const state = mgr.load("test-project", scope);
    mgr.markInProgress(state, "build-wave:0");
    expect(state.steps["build-wave:0"]?.status).toBe("in_progress");
    expect(state.steps["build-wave:0"]?.started_at).toBeDefined();
    rmSync(dir, { recursive: true });
  });

  it("sets completed_at when updating with a terminal status", () => {
    const state = mgr.load("test-project", scope);
    mgr.markInProgress(state, "build-wave:0");
    mgr.update(state, "build-wave:0", {
      status: "passed",
      artifacts: [],
      metrics: {},
      message: "done",
    });
    expect(state.steps["build-wave:0"]?.completed_at).toBeDefined();
    rmSync(dir, { recursive: true });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd orchestrator && npx vitest run tests/state/state.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement StateManager**

```typescript
// src/state/state.ts
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import type { WorkflowState, PipelineScope, StepResult, StepState } from "../types.js";

const STATE_DIR = ".orchestrator";
const STATE_FILE = "WORKFLOW_STATE.json";

export class StateManager {
  private stateDir: string;
  private statePath: string;

  constructor(projectRoot: string) {
    this.stateDir = join(projectRoot, STATE_DIR);
    this.statePath = join(this.stateDir, STATE_FILE);
  }

  load(project: string, scope: PipelineScope): WorkflowState {
    if (existsSync(this.statePath)) {
      const raw = readFileSync(this.statePath, "utf-8");
      return JSON.parse(raw) as WorkflowState;
    }

    return {
      project,
      scope,
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      steps: {},
    };
  }

  save(state: WorkflowState): void {
    mkdirSync(this.stateDir, { recursive: true });
    state.updated_at = new Date().toISOString();
    writeFileSync(this.statePath, JSON.stringify(state, null, 2) + "\n");
  }

  markInProgress(state: WorkflowState, stepId: string): void {
    state.steps[stepId] = {
      status: "in_progress",
      started_at: new Date().toISOString(),
      artifacts: [],
      metrics: {},
      message: "",
    };
  }

  update(state: WorkflowState, stepId: string, result: StepResult): void {
    const existing = state.steps[stepId];
    state.steps[stepId] = {
      status: result.status,
      started_at: existing?.started_at,
      completed_at: new Date().toISOString(),
      artifacts: result.artifacts,
      metrics: result.metrics,
      message: result.message,
    };
  }
}
```

- [ ] **Step 4: Run tests**

Run: `cd orchestrator && npx vitest run tests/state/state.test.ts`
Expected: 5 passed

- [ ] **Step 5: Commit**

```bash
git add orchestrator/src/state/ orchestrator/tests/state/
git commit -m "feat(orchestrator): state manager with JSON persistence"
```

---

### Task 5: DAG Resolver

**Files:**
- Create: `orchestrator/src/runner/dag.ts`
- Create: `orchestrator/tests/runner/dag.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/runner/dag.test.ts
import { describe, it, expect } from "vitest";
import { resolveDAG, getRunnable, topologicalSort } from "../../src/runner/dag.js";
import type { StepDefinition, WorkflowState } from "../../src/types.js";

const STEPS: StepDefinition[] = [
  { id: "a", type: "session-start", deps: [], params: {} },
  { id: "b", type: "requirements-gate", deps: ["a"], params: {} },
  { id: "c", type: "e2e-scaffold", deps: ["b"], params: {} },
  { id: "d", type: "dependency-resolve", deps: ["b"], params: {} },
  { id: "e", type: "e2e-green", deps: ["c", "d"], params: {} },
];

describe("topologicalSort", () => {
  it("sorts steps in dependency order", () => {
    const sorted = topologicalSort(STEPS);
    const ids = sorted.map((s) => s.id);
    expect(ids.indexOf("a")).toBeLessThan(ids.indexOf("b"));
    expect(ids.indexOf("b")).toBeLessThan(ids.indexOf("c"));
    expect(ids.indexOf("b")).toBeLessThan(ids.indexOf("d"));
    expect(ids.indexOf("c")).toBeLessThan(ids.indexOf("e"));
    expect(ids.indexOf("d")).toBeLessThan(ids.indexOf("e"));
  });

  it("throws on circular dependency", () => {
    const circular: StepDefinition[] = [
      { id: "x", type: "t", deps: ["y"], params: {} },
      { id: "y", type: "t", deps: ["x"], params: {} },
    ];
    expect(() => topologicalSort(circular)).toThrow(/circular/i);
  });
});

describe("getRunnable", () => {
  it("returns steps with all deps passed and not yet started", () => {
    const state: WorkflowState = {
      project: "test",
      scope: { type: "app", target: null },
      started_at: "",
      updated_at: "",
      steps: {
        a: { status: "passed", artifacts: [], metrics: {}, message: "" },
      },
    };
    const runnable = getRunnable(STEPS, state);
    expect(runnable.map((s) => s.id)).toEqual(["b"]);
  });

  it("returns multiple steps when parallel deps are met", () => {
    const state: WorkflowState = {
      project: "test",
      scope: { type: "app", target: null },
      started_at: "",
      updated_at: "",
      steps: {
        a: { status: "passed", artifacts: [], metrics: {}, message: "" },
        b: { status: "passed", artifacts: [], metrics: {}, message: "" },
      },
    };
    const runnable = getRunnable(STEPS, state);
    const ids = runnable.map((s) => s.id);
    expect(ids).toContain("c");
    expect(ids).toContain("d");
    expect(ids).not.toContain("e");
  });

  it("treats skipped as passed for dependency resolution", () => {
    const state: WorkflowState = {
      project: "test",
      scope: { type: "app", target: null },
      started_at: "",
      updated_at: "",
      steps: {
        a: { status: "skipped", artifacts: [], metrics: {}, message: "" },
      },
    };
    const runnable = getRunnable(STEPS, state);
    expect(runnable.map((s) => s.id)).toEqual(["b"]);
  });

  it("does not return steps that are in_progress or already passed", () => {
    const state: WorkflowState = {
      project: "test",
      scope: { type: "app", target: null },
      started_at: "",
      updated_at: "",
      steps: {
        a: { status: "passed", artifacts: [], metrics: {}, message: "" },
        b: { status: "in_progress", artifacts: [], metrics: {}, message: "" },
      },
    };
    const runnable = getRunnable(STEPS, state);
    expect(runnable).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd orchestrator && npx vitest run tests/runner/dag.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement DAG resolver**

```typescript
// src/runner/dag.ts
import type { StepDefinition, WorkflowState } from "../types.js";

/**
 * Kahn's algorithm for topological sort.
 * Throws if the graph contains a cycle.
 */
export function topologicalSort(steps: StepDefinition[]): StepDefinition[] {
  const idToStep = new Map(steps.map((s) => [s.id, s]));
  const inDegree = new Map(steps.map((s) => [s.id, 0]));
  const adjacency = new Map<string, string[]>();

  for (const step of steps) {
    adjacency.set(step.id, []);
  }

  for (const step of steps) {
    for (const dep of step.deps) {
      if (!adjacency.has(dep)) continue;
      adjacency.get(dep)!.push(step.id);
      inDegree.set(step.id, (inDegree.get(step.id) ?? 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id);
  }

  const sorted: StepDefinition[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    sorted.push(idToStep.get(id)!);
    for (const neighbor of adjacency.get(id) ?? []) {
      const newDegree = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) queue.push(neighbor);
    }
  }

  if (sorted.length !== steps.length) {
    throw new Error(
      `Circular dependency detected. Resolved ${sorted.length}/${steps.length} steps.`,
    );
  }

  return sorted;
}

/**
 * Returns steps whose dependencies are all satisfied (passed or skipped)
 * and that haven't started yet.
 */
export function getRunnable(
  steps: StepDefinition[],
  state: WorkflowState,
): StepDefinition[] {
  const satisfiedStatuses = new Set(["passed", "skipped"]);

  return steps.filter((step) => {
    // Already started or completed — not runnable
    const stepState = state.steps[step.id];
    if (stepState) return false;

    // All deps must be satisfied
    return step.deps.every((dep) => {
      const depState = state.steps[dep];
      return depState != null && satisfiedStatuses.has(depState.status);
    });
  });
}
```

- [ ] **Step 4: Run tests**

Run: `cd orchestrator && npx vitest run tests/runner/dag.test.ts`
Expected: 6 passed

- [ ] **Step 5: Commit**

```bash
git add orchestrator/src/runner/dag.ts orchestrator/tests/runner/dag.test.ts
git commit -m "feat(orchestrator): DAG resolver with topological sort"
```

---

### Task 6: RunContext Implementation

**Files:**
- Create: `orchestrator/src/runner/context.ts`
- Create: `orchestrator/tests/runner/context.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/runner/context.test.ts
import { describe, it, expect } from "vitest";
import { createRunContext } from "../../src/runner/context.js";
import { StateManager } from "../../src/state/state.js";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import type { OrchestratorConfig } from "../../src/types.js";

function makeTempProject(): string {
  const dir = join(tmpdir(), `orchestrator-ctx-test-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

const CONFIG: OrchestratorConfig = {
  project: "test",
  scope: { type: "app", target: null },
  branches: { main: "main", feature: null },
  artifacts: {
    requirements: "docs/reqs.md",
    inventory: "docs/inv.md",
    build_plan: "docs/plan.md",
    build_status: "docs/status.md",
    design_audit: "docs/audit.md",
    visual_qa: "docs/qa.md",
  },
  commands: {
    test_client: "echo pass",
    test_server: "echo pass",
    test_e2e: "echo pass",
    build_client: "echo pass",
    dev_server: "echo pass",
    typecheck: "echo pass",
  },
  ci: {
    required_on_main: [],
    required_on_feature: [],
    informational_on_feature: [],
  },
};

describe("RunContext", () => {
  it("resolves paths relative to project root", () => {
    const dir = makeTempProject();
    const stateMgr = new StateManager(dir);
    const state = stateMgr.load("test", CONFIG.scope);
    const ctx = createRunContext(CONFIG, state, dir, stateMgr);
    expect(ctx.resolve("docs/reqs.md")).toBe(join(dir, "docs/reqs.md"));
    rmSync(dir, { recursive: true });
  });

  it("checks file existence", async () => {
    const dir = makeTempProject();
    mkdirSync(join(dir, "docs"), { recursive: true });
    writeFileSync(join(dir, "docs/reqs.md"), "# Reqs");
    const stateMgr = new StateManager(dir);
    const state = stateMgr.load("test", CONFIG.scope);
    const ctx = createRunContext(CONFIG, state, dir, stateMgr);
    expect(await ctx.exists("docs/reqs.md")).toBe(true);
    expect(await ctx.exists("docs/nope.md")).toBe(false);
    rmSync(dir, { recursive: true });
  });

  it("executes shell commands and returns result", async () => {
    const dir = makeTempProject();
    const stateMgr = new StateManager(dir);
    const state = stateMgr.load("test", CONFIG.scope);
    const ctx = createRunContext(CONFIG, state, dir, stateMgr);
    const result = await ctx.exec("echo hello");
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe("hello");
    expect(result.timedOut).toBe(false);
    rmSync(dir, { recursive: true });
  });

  it("returns non-zero exit code for failing commands", async () => {
    const dir = makeTempProject();
    const stateMgr = new StateManager(dir);
    const state = stateMgr.load("test", CONFIG.scope);
    const ctx = createRunContext(CONFIG, state, dir, stateMgr);
    const result = await ctx.exec("exit 1");
    expect(result.exitCode).toBe(1);
    rmSync(dir, { recursive: true });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd orchestrator && npx vitest run tests/runner/context.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement RunContext**

```typescript
// src/runner/context.ts
import { join } from "path";
import { existsSync } from "fs";
import { exec as execCb } from "child_process";
import { promisify } from "util";
import { StateManager } from "../state/state.js";
import type {
  OrchestratorConfig,
  WorkflowState,
  RunContext,
  ExecOpts,
  ExecResult,
  CommandResult,
  StepResult,
} from "../types.js";

const execAsync = promisify(execCb);

export function createRunContext(
  config: OrchestratorConfig,
  state: WorkflowState,
  projectRoot: string,
  stateManager: StateManager,
): RunContext {
  return {
    config,
    state,
    projectRoot,
    scope: config.scope,

    resolve(path: string): string {
      return join(projectRoot, path);
    },

    async exists(path: string): Promise<boolean> {
      return existsSync(join(projectRoot, path));
    },

    async exec(cmd: string, opts?: ExecOpts): Promise<ExecResult> {
      const cwd = opts?.cwd ?? projectRoot;
      const timeout = opts?.timeout ?? 120_000;
      const env = { ...process.env, ...opts?.env };

      try {
        const { stdout, stderr } = await execAsync(cmd, {
          cwd,
          timeout,
          env,
          shell: "/bin/bash",
        });
        return { exitCode: 0, stdout, stderr, timedOut: false };
      } catch (err: unknown) {
        const e = err as { code?: number; stdout?: string; stderr?: string; killed?: boolean };
        return {
          exitCode: e.code ?? 1,
          stdout: e.stdout ?? "",
          stderr: e.stderr ?? "",
          timedOut: e.killed === true,
        };
      }
    },

    async invokeCommand(
      command: string,
      args?: string,
    ): Promise<CommandResult> {
      // Plugin commands are invoked through Claude Code's skill system.
      // In the orchestrator context, this is a placeholder that will be
      // wired to the actual invocation mechanism at integration time.
      // For now, return a not-implemented result so steps can be tested
      // with a mocked context.
      return {
        success: false,
        output: "",
        artifacts: [],
        error: `invokeCommand not yet wired: ${command} ${args ?? ""}`,
      };
    },

    async awaitApproval(prompt: string): Promise<void> {
      // In CLI mode, this will use readline to prompt the user.
      // For now, auto-approve in test contexts.
      console.log(`\n⏸  APPROVAL REQUIRED: ${prompt}`);
      console.log("   (auto-approved in development mode)\n");
    },

    updateState(stepId: string, result: StepResult): void {
      stateManager.update(state, stepId, result);
      stateManager.save(state);
    },
  };
}
```

- [ ] **Step 4: Run tests**

Run: `cd orchestrator && npx vitest run tests/runner/context.test.ts`
Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
git add orchestrator/src/runner/context.ts orchestrator/tests/runner/context.test.ts
git commit -m "feat(orchestrator): RunContext implementation with exec and state"
```

---

### Task 7: Base Step Class + Step Registry

**Files:**
- Create: `orchestrator/src/steps/base.ts`
- Create: `orchestrator/src/steps/registry.ts`
- Create: `orchestrator/tests/steps/base.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/steps/base.test.ts
import { describe, it, expect } from "vitest";
import { BaseStep } from "../../src/steps/base.js";
import { stepRegistry, getStepClass } from "../../src/steps/registry.js";
import type {
  StepDefinition,
  StepDescription,
  PreflightResult,
  StepResult,
  RunContext,
} from "../../src/types.js";

class TestStep extends BaseStep {
  describe(): StepDescription {
    return {
      id: this.definition.id,
      type: this.definition.type,
      summary: "A test step",
      prerequisites: [],
      artifacts: [],
      passCondition: "always",
      failCondition: "never",
      scope: "component",
    };
  }

  async preflight(_ctx: RunContext): Promise<PreflightResult> {
    return { ready: true, issues: [] };
  }

  async execute(_ctx: RunContext): Promise<StepResult> {
    return { status: "passed", artifacts: [], metrics: {}, message: "done" };
  }
}

describe("BaseStep", () => {
  it("stores definition and exposes id and type", () => {
    const def: StepDefinition = { id: "test-1", type: "test", deps: [], params: {} };
    const step = new TestStep(def);
    expect(step.definition.id).toBe("test-1");
    expect(step.definition.type).toBe("test");
  });

  it("shouldSkip returns true when scope is below threshold", () => {
    const def: StepDefinition = { id: "test-1", type: "test", deps: [], params: {} };
    const step = new TestStep(def);
    // TestStep has scope "component" which is the lowest — never skipped
    expect(step.shouldSkip("component")).toBe(false);
    expect(step.shouldSkip("app")).toBe(false);
  });
});

describe("stepRegistry", () => {
  it("returns undefined for unknown type", () => {
    expect(getStepClass("nonexistent")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd orchestrator && npx vitest run tests/steps/base.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement BaseStep and registry**

```typescript
// src/steps/base.ts
import type { StepDefinition, Step, ScopeThreshold } from "../types.js";
import { scopeMeetsThreshold } from "../types.js";

export abstract class BaseStep implements Step {
  constructor(public readonly definition: StepDefinition) {}

  abstract describe(): import("../types.js").StepDescription;
  abstract preflight(ctx: import("../types.js").RunContext): Promise<import("../types.js").PreflightResult>;
  abstract execute(ctx: import("../types.js").RunContext): Promise<import("../types.js").StepResult>;

  /**
   * Returns true if the pipeline scope is below this step's threshold.
   * The step's scope comes from describe().scope.
   */
  shouldSkip(pipelineScope: ScopeThreshold): boolean {
    const threshold = this.describe().scope;
    return !scopeMeetsThreshold(pipelineScope, threshold);
  }
}
```

```typescript
// src/steps/registry.ts
import type { StepDefinition } from "../types.js";
import type { BaseStep } from "./base.js";

type StepConstructor = new (definition: StepDefinition) => BaseStep;

const registry = new Map<string, StepConstructor>();

export function registerStep(type: string, ctor: StepConstructor): void {
  registry.set(type, ctor);
}

export function getStepClass(type: string): StepConstructor | undefined {
  return registry.get(type);
}

export { registry as stepRegistry };
```

- [ ] **Step 4: Run tests**

Run: `cd orchestrator && npx vitest run tests/steps/base.test.ts`
Expected: 3 passed

- [ ] **Step 5: Commit**

```bash
git add orchestrator/src/steps/base.ts orchestrator/src/steps/registry.ts orchestrator/tests/steps/base.test.ts
git commit -m "feat(orchestrator): BaseStep abstract class + step registry"
```

---

### Task 8: Executor (Runner Core)

**Files:**
- Create: `orchestrator/src/runner/executor.ts`
- Create: `orchestrator/tests/runner/executor.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/runner/executor.test.ts
import { describe, it, expect, vi } from "vitest";
import { Executor } from "../../src/runner/executor.js";
import { StateManager } from "../../src/state/state.js";
import { BaseStep } from "../../src/steps/base.js";
import { registerStep } from "../../src/steps/registry.js";
import { mkdirSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import type {
  StepDefinition,
  StepDescription,
  PreflightResult,
  StepResult,
  RunContext,
  OrchestratorConfig,
} from "../../src/types.js";

function makeTempDir(): string {
  const dir = join(tmpdir(), `orchestrator-exec-test-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

class PassingStep extends BaseStep {
  describe(): StepDescription {
    return {
      id: this.definition.id,
      type: "passing",
      summary: "Always passes",
      prerequisites: [],
      artifacts: [],
      passCondition: "always",
      failCondition: "never",
      scope: "component",
    };
  }
  async preflight(): Promise<PreflightResult> {
    return { ready: true, issues: [] };
  }
  async execute(): Promise<StepResult> {
    return { status: "passed", artifacts: [], metrics: { ran: 1 }, message: "passed" };
  }
}

class FailingPreflightStep extends BaseStep {
  describe(): StepDescription {
    return {
      id: this.definition.id,
      type: "failing-preflight",
      summary: "Preflight fails",
      prerequisites: [],
      artifacts: [],
      passCondition: "never",
      failCondition: "always",
      scope: "component",
    };
  }
  async preflight(): Promise<PreflightResult> {
    return { ready: false, issues: ["Something is missing"] };
  }
  async execute(): Promise<StepResult> {
    return { status: "passed", artifacts: [], metrics: {}, message: "should not run" };
  }
}

// Register test step types
registerStep("passing", PassingStep);
registerStep("failing-preflight", FailingPreflightStep);

const CONFIG: OrchestratorConfig = {
  project: "test",
  scope: { type: "app", target: null },
  branches: { main: "main", feature: null },
  artifacts: {
    requirements: "docs/reqs.md",
    inventory: "docs/inv.md",
    build_plan: "docs/plan.md",
    build_status: "docs/status.md",
    design_audit: "docs/audit.md",
    visual_qa: "docs/qa.md",
  },
  commands: {
    test_client: "echo pass",
    test_server: "echo pass",
    test_e2e: "echo pass",
    build_client: "echo pass",
    dev_server: "echo pass",
    typecheck: "echo pass",
  },
  ci: {
    required_on_main: [],
    required_on_feature: [],
    informational_on_feature: [],
  },
};

describe("Executor", () => {
  it("runs the next available step and updates state", async () => {
    const dir = makeTempDir();
    const steps: StepDefinition[] = [
      { id: "step-a", type: "passing", deps: [], params: {} },
    ];
    const executor = new Executor(CONFIG, steps, dir);
    const result = await executor.runNext();
    expect(result).not.toBeNull();
    expect(result!.stepId).toBe("step-a");
    expect(result!.result.status).toBe("passed");
    rmSync(dir, { recursive: true });
  });

  it("returns null when no steps are runnable", async () => {
    const dir = makeTempDir();
    const steps: StepDefinition[] = [
      { id: "step-a", type: "passing", deps: ["nonexistent"], params: {} },
    ];
    const executor = new Executor(CONFIG, steps, dir);
    const result = await executor.runNext();
    expect(result).toBeNull();
    rmSync(dir, { recursive: true });
  });

  it("skips step when preflight fails", async () => {
    const dir = makeTempDir();
    const steps: StepDefinition[] = [
      { id: "step-a", type: "failing-preflight", deps: [], params: {} },
    ];
    const executor = new Executor(CONFIG, steps, dir);
    const result = await executor.runNext();
    expect(result).not.toBeNull();
    expect(result!.result.status).toBe("failed");
    expect(result!.result.message).toContain("Something is missing");
    rmSync(dir, { recursive: true });
  });

  it("runs steps in dependency order across multiple runNext calls", async () => {
    const dir = makeTempDir();
    const steps: StepDefinition[] = [
      { id: "first", type: "passing", deps: [], params: {} },
      { id: "second", type: "passing", deps: ["first"], params: {} },
    ];
    const executor = new Executor(CONFIG, steps, dir);

    const r1 = await executor.runNext();
    expect(r1!.stepId).toBe("first");

    const r2 = await executor.runNext();
    expect(r2!.stepId).toBe("second");

    const r3 = await executor.runNext();
    expect(r3).toBeNull(); // nothing left

    rmSync(dir, { recursive: true });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd orchestrator && npx vitest run tests/runner/executor.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement Executor**

```typescript
// src/runner/executor.ts
import { getRunnable } from "./dag.js";
import { createRunContext } from "./context.js";
import { StateManager } from "../state/state.js";
import { getStepClass } from "../steps/registry.js";
import type {
  OrchestratorConfig,
  StepDefinition,
  StepResult,
  WorkflowState,
} from "../types.js";

export interface ExecutionResult {
  stepId: string;
  result: StepResult;
}

export class Executor {
  private stateManager: StateManager;
  private state: WorkflowState;

  constructor(
    private config: OrchestratorConfig,
    private steps: StepDefinition[],
    private projectRoot: string,
  ) {
    this.stateManager = new StateManager(projectRoot);
    this.state = this.stateManager.load(config.project, config.scope);
  }

  /**
   * Finds the next runnable step, runs it, and returns the result.
   * Returns null if no steps are runnable (all done or blocked).
   */
  async runNext(): Promise<ExecutionResult | null> {
    const runnable = getRunnable(this.steps, this.state);
    if (runnable.length === 0) return null;

    const stepDef = runnable[0]!;
    const StepClass = getStepClass(stepDef.type);

    if (!StepClass) {
      const result: StepResult = {
        status: "failed",
        artifacts: [],
        metrics: {},
        message: `Unknown step type: ${stepDef.type}`,
      };
      this.stateManager.update(this.state, stepDef.id, result);
      this.stateManager.save(this.state);
      return { stepId: stepDef.id, result };
    }

    const step = new StepClass(stepDef);

    // Check scope — skip if below threshold
    if (step.shouldSkip(this.config.scope.type)) {
      const result: StepResult = {
        status: "skipped",
        artifacts: [],
        metrics: {},
        message: `Skipped — below scope threshold for ${this.config.scope.type}`,
      };
      this.stateManager.update(this.state, stepDef.id, result);
      this.stateManager.save(this.state);
      return { stepId: stepDef.id, result };
    }

    const ctx = createRunContext(
      this.config,
      this.state,
      this.projectRoot,
      this.stateManager,
    );

    // Preflight
    const preflight = await step.preflight(ctx);
    if (!preflight.ready) {
      const result: StepResult = {
        status: "failed",
        artifacts: [],
        metrics: {},
        message: `Preflight failed: ${preflight.issues.join("; ")}`,
      };
      this.stateManager.update(this.state, stepDef.id, result);
      this.stateManager.save(this.state);
      return { stepId: stepDef.id, result };
    }

    // Execute
    this.stateManager.markInProgress(this.state, stepDef.id);
    this.stateManager.save(this.state);

    const result = await step.execute(ctx);

    this.stateManager.update(this.state, stepDef.id, result);
    this.stateManager.save(this.state);

    return { stepId: stepDef.id, result };
  }

  /** Returns current state for status display. */
  getState(): WorkflowState {
    return this.state;
  }
}
```

- [ ] **Step 4: Run tests**

Run: `cd orchestrator && npx vitest run tests/runner/executor.test.ts`
Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
git add orchestrator/src/runner/executor.ts orchestrator/tests/runner/executor.test.ts
git commit -m "feat(orchestrator): executor with preflight, scope skip, and state updates"
```

---

### Task 9: Explain Engine

**Files:**
- Create: `orchestrator/src/explain/explain.ts`
- Create: `orchestrator/tests/explain/explain.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/explain/explain.test.ts
import { describe, it, expect } from "vitest";
import { formatExplain } from "../../src/explain/explain.js";
import type { StepDefinition, StepDescription, WorkflowState } from "../../src/types.js";

const DESCRIPTIONS: StepDescription[] = [
  {
    id: "session-start",
    type: "session-start",
    summary: "Read project docs, produce briefing",
    prerequisites: [],
    artifacts: [],
    passCondition: "briefing generated",
    failCondition: "never",
    scope: "component",
  },
  {
    id: "ui-interview",
    type: "requirements-gate",
    summary: "Interactive requirements interview",
    prerequisites: ["session-start"],
    artifacts: ["docs/UI_REQUIREMENTS.md"],
    passCondition: "both docs exist and approved",
    failCondition: "user cancels",
    scope: "component",
  },
];

const STEPS: StepDefinition[] = [
  { id: "session-start", type: "session-start", deps: [], params: {} },
  { id: "ui-interview", type: "requirements-gate", deps: ["session-start"], params: {} },
];

describe("formatExplain", () => {
  it("shows [x] for passed steps", () => {
    const state: WorkflowState = {
      project: "test",
      scope: { type: "app", target: null },
      started_at: "",
      updated_at: "",
      steps: {
        "session-start": { status: "passed", artifacts: [], metrics: {}, message: "done" },
      },
    };
    const output = formatExplain("test", "app", DESCRIPTIONS, state);
    expect(output).toContain("[x] session-start");
    expect(output).toContain("[ ] ui-interview");
  });

  it("shows [>] for in_progress steps", () => {
    const state: WorkflowState = {
      project: "test",
      scope: { type: "app", target: null },
      started_at: "",
      updated_at: "",
      steps: {
        "session-start": { status: "in_progress", artifacts: [], metrics: {}, message: "" },
      },
    };
    const output = formatExplain("test", "app", DESCRIPTIONS, state);
    expect(output).toContain("[>] session-start");
  });

  it("shows [~] for skipped steps", () => {
    const state: WorkflowState = {
      project: "test",
      scope: { type: "app", target: null },
      started_at: "",
      updated_at: "",
      steps: {
        "session-start": { status: "skipped", artifacts: [], metrics: {}, message: "skipped" },
      },
    };
    const output = formatExplain("test", "app", DESCRIPTIONS, state);
    expect(output).toContain("[~] session-start");
  });

  it("includes project name and scope in header", () => {
    const state: WorkflowState = {
      project: "test",
      scope: { type: "app", target: null },
      started_at: "",
      updated_at: "",
      steps: {},
    };
    const output = formatExplain("test", "app", DESCRIPTIONS, state);
    expect(output).toContain("test");
    expect(output).toContain("app");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd orchestrator && npx vitest run tests/explain/explain.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement explain formatter**

```typescript
// src/explain/explain.ts
import type { StepDescription, WorkflowState, StepState } from "../types.js";

function statusIcon(state: StepState | undefined): string {
  if (!state) return "[ ]";
  switch (state.status) {
    case "passed": return "[x]";
    case "in_progress": return "[>]";
    case "failed": return "[!]";
    case "skipped": return "[~]";
  }
}

export function formatExplain(
  project: string,
  scopeType: string,
  descriptions: StepDescription[],
  state: WorkflowState,
): string {
  const lines: string[] = [];
  lines.push(`Frontend Orchestrator — ${project} (scope: ${scopeType})`);
  lines.push("");

  for (const desc of descriptions) {
    const stepState = state.steps[desc.id];
    const icon = statusIcon(stepState);
    const msg = stepState?.message ? ` — ${stepState.message}` : "";
    lines.push(`  ${icon} ${desc.id} — ${desc.summary}${msg}`);
    lines.push(`      Pass: ${desc.passCondition}`);
    if (desc.failCondition !== "never") {
      lines.push(`      Fail: ${desc.failCondition}`);
    }
  }

  return lines.join("\n");
}
```

- [ ] **Step 4: Run tests**

Run: `cd orchestrator && npx vitest run tests/explain/explain.test.ts`
Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
git add orchestrator/src/explain/ orchestrator/tests/explain/
git commit -m "feat(orchestrator): --explain output formatter"
```

---

### Task 10: CLI Entry Point

**Files:**
- Create: `orchestrator/src/cli.ts`
- Create: `orchestrator/tests/cli.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/cli.test.ts
import { describe, it, expect } from "vitest";
import { parseArgs } from "../src/cli.js";

describe("parseArgs", () => {
  it("defaults to 'run' command", () => {
    const cmd = parseArgs([]);
    expect(cmd.command).toBe("run");
  });

  it("parses 'status' command", () => {
    const cmd = parseArgs(["status"]);
    expect(cmd.command).toBe("status");
  });

  it("parses '--explain' flag", () => {
    const cmd = parseArgs(["--explain"]);
    expect(cmd.command).toBe("explain");
  });

  it("parses 'run <step-id>' command", () => {
    const cmd = parseArgs(["run", "build-wave:0"]);
    expect(cmd.command).toBe("run-step");
    expect(cmd.stepId).toBe("build-wave:0");
  });

  it("parses 'reset <step-id>' command", () => {
    const cmd = parseArgs(["reset", "build-wave:0"]);
    expect(cmd.command).toBe("reset");
    expect(cmd.stepId).toBe("build-wave:0");
  });

  it("parses 'init' command", () => {
    const cmd = parseArgs(["init"]);
    expect(cmd.command).toBe("init");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd orchestrator && npx vitest run tests/cli.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement CLI**

```typescript
// src/cli.ts
export interface ParsedCommand {
  command: "run" | "status" | "explain" | "run-step" | "reset" | "init";
  stepId?: string;
}

export function parseArgs(args: string[]): ParsedCommand {
  if (args.length === 0) return { command: "run" };

  const first = args[0]!;

  if (first === "--explain") return { command: "explain" };
  if (first === "status") return { command: "status" };
  if (first === "init") return { command: "init" };

  if (first === "run" && args[1]) {
    return { command: "run-step", stepId: args[1] };
  }

  if (first === "reset" && args[1]) {
    return { command: "reset", stepId: args[1] };
  }

  return { command: "run" };
}

// Main entry point — wired up after all steps are registered
async function main() {
  const cmd = parseArgs(process.argv.slice(2));
  console.log(`orchestrate: ${cmd.command}${cmd.stepId ? ` ${cmd.stepId}` : ""}`);
  // TODO: wire to executor, explain, init commands
}

// Only run main when executed directly (not imported in tests)
const isDirectRun = process.argv[1]?.endsWith("cli.ts") || process.argv[1]?.endsWith("cli.js");
if (isDirectRun) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
```

- [ ] **Step 4: Run tests**

Run: `cd orchestrator && npx vitest run tests/cli.test.ts`
Expected: 6 passed

- [ ] **Step 5: Run ALL tests to verify nothing is broken**

Run: `cd orchestrator && npx vitest run`
Expected: All tests passing (schema: 6, loader: 3, defaults: 4, state: 5, dag: 6, context: 4, executor: 4, base: 3, explain: 4, cli: 6 = ~45 total)

- [ ] **Step 6: Commit**

```bash
git add orchestrator/src/cli.ts orchestrator/tests/cli.test.ts
git commit -m "feat(orchestrator): CLI arg parser with run/status/explain/reset/init commands"
```

---

### Task 11: First Real Step — SessionStartStep

This is the first real step implementation. It establishes the pattern all other steps will follow.

**Files:**
- Create: `orchestrator/src/steps/session-start.ts`
- Create: `orchestrator/tests/steps/session-start.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/steps/session-start.test.ts
import { describe, it, expect, vi } from "vitest";
import { SessionStartStep } from "../../src/steps/session-start.js";
import type { StepDefinition, RunContext } from "../../src/types.js";

function makeDefinition(): StepDefinition {
  return { id: "session-start", type: "session-start", deps: [], params: {} };
}

function makeMockContext(overrides: Partial<RunContext> = {}): RunContext {
  return {
    config: {
      project: "test",
      scope: { type: "app", target: null },
      branches: { main: "main", feature: null },
      artifacts: {
        requirements: "docs/reqs.md",
        inventory: "docs/inv.md",
        build_plan: "docs/plan.md",
        build_status: "docs/status.md",
        design_audit: "docs/audit.md",
        visual_qa: "docs/qa.md",
      },
      commands: {
        test_client: "",
        test_server: "",
        test_e2e: "",
        build_client: "",
        dev_server: "",
        typecheck: "",
      },
      ci: { required_on_main: [], required_on_feature: [], informational_on_feature: [] },
    },
    state: { project: "test", scope: { type: "app", target: null }, started_at: "", updated_at: "", steps: {} },
    projectRoot: "/tmp/test",
    scope: { type: "app", target: null },
    resolve: (p) => `/tmp/test/${p}`,
    exists: vi.fn(async () => false),
    exec: vi.fn(async () => ({ exitCode: 0, stdout: "", stderr: "", timedOut: false })),
    invokeCommand: vi.fn(async () => ({ success: true, output: "briefing", artifacts: [] })),
    awaitApproval: vi.fn(async () => {}),
    updateState: vi.fn(),
    ...overrides,
  };
}

describe("SessionStartStep", () => {
  it("describe() returns correct metadata", () => {
    const step = new SessionStartStep(makeDefinition());
    const desc = step.describe();
    expect(desc.id).toBe("session-start");
    expect(desc.scope).toBe("component"); // runs at all scopes
    expect(desc.passCondition).toContain("briefing");
  });

  it("preflight always returns ready", async () => {
    const step = new SessionStartStep(makeDefinition());
    const result = await step.preflight(makeMockContext());
    expect(result.ready).toBe(true);
  });

  it("execute invokes /session-start command", async () => {
    const invokeCommand = vi.fn(async () => ({
      success: true,
      output: "Session briefing content",
      artifacts: [],
    }));
    const ctx = makeMockContext({ invokeCommand });
    const step = new SessionStartStep(makeDefinition());
    const result = await step.execute(ctx);
    expect(invokeCommand).toHaveBeenCalledWith("/session-start");
    expect(result.status).toBe("passed");
  });

  it("execute passes even if command fails (informational only)", async () => {
    const invokeCommand = vi.fn(async () => ({
      success: false,
      output: "",
      artifacts: [],
      error: "no docs found",
    }));
    const ctx = makeMockContext({ invokeCommand });
    const step = new SessionStartStep(makeDefinition());
    const result = await step.execute(ctx);
    expect(result.status).toBe("passed"); // never fails
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd orchestrator && npx vitest run tests/steps/session-start.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement SessionStartStep**

```typescript
// src/steps/session-start.ts
import { BaseStep } from "./base.js";
import { registerStep } from "./registry.js";
import type {
  StepDescription,
  PreflightResult,
  StepResult,
  RunContext,
} from "../types.js";

export class SessionStartStep extends BaseStep {
  describe(): StepDescription {
    return {
      id: this.definition.id,
      type: "session-start",
      summary:
        "Read project docs (CLAUDE.md, requirements, inventory, build status). Produce structured briefing.",
      prerequisites: [],
      artifacts: [],
      passCondition: "Briefing generated. Always passes — missing files are reported, not fatal.",
      failCondition: "never",
      scope: "component",
    };
  }

  async preflight(_ctx: RunContext): Promise<PreflightResult> {
    // No preconditions — this step always runs
    return { ready: true, issues: [] };
  }

  async execute(ctx: RunContext): Promise<StepResult> {
    const result = await ctx.invokeCommand("/session-start");

    // Session-start is informational — always passes
    return {
      status: "passed",
      artifacts: [],
      metrics: {},
      message: result.success
        ? "Session briefing generated."
        : "Session briefing attempted (some docs may be missing).",
    };
  }
}

registerStep("session-start", SessionStartStep);
```

- [ ] **Step 4: Run tests**

Run: `cd orchestrator && npx vitest run tests/steps/session-start.test.ts`
Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
git add orchestrator/src/steps/session-start.ts orchestrator/tests/steps/session-start.test.ts
git commit -m "feat(orchestrator): SessionStartStep — first real step implementation"
```

---

### Task 12: RequirementsGateStep

**Files:**
- Create: `orchestrator/src/steps/requirements-gate.ts`
- Create: `orchestrator/tests/steps/requirements-gate.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/steps/requirements-gate.test.ts
import { describe, it, expect, vi } from "vitest";
import { RequirementsGateStep } from "../../src/steps/requirements-gate.js";
import type { StepDefinition, RunContext } from "../../src/types.js";

function makeDefinition(): StepDefinition {
  return { id: "ui-interview", type: "requirements-gate", deps: [], params: {} };
}

function makeMockContext(overrides: Partial<RunContext> = {}): RunContext {
  return {
    config: {
      project: "test",
      scope: { type: "app", target: null },
      branches: { main: "main", feature: null },
      artifacts: {
        requirements: "docs/UI_REQUIREMENTS.md",
        inventory: "docs/COMPONENT_INVENTORY.md",
        build_plan: "docs/BUILD_PLAN.md",
        build_status: "docs/BUILD_STATUS.md",
        design_audit: "docs/DESIGN_AUDIT.md",
        visual_qa: "docs/VISUAL_QA.md",
      },
      commands: {
        test_client: "",
        test_server: "",
        test_e2e: "",
        build_client: "",
        dev_server: "",
        typecheck: "",
      },
      ci: { required_on_main: [], required_on_feature: [], informational_on_feature: [] },
    },
    state: { project: "test", scope: { type: "app", target: null }, started_at: "", updated_at: "", steps: {} },
    projectRoot: "/tmp/test",
    scope: { type: "app", target: null },
    resolve: (p) => `/tmp/test/${p}`,
    exists: vi.fn(async () => false),
    exec: vi.fn(async () => ({ exitCode: 0, stdout: "", stderr: "", timedOut: false })),
    invokeCommand: vi.fn(async () => ({ success: true, output: "", artifacts: [] })),
    awaitApproval: vi.fn(async () => {}),
    updateState: vi.fn(),
    ...overrides,
  };
}

describe("RequirementsGateStep", () => {
  it("describe() requires user approval", () => {
    const step = new RequirementsGateStep(makeDefinition());
    const desc = step.describe();
    expect(desc.passCondition).toContain("approved");
  });

  it("execute invokes /ui-interview then checks artifacts exist", async () => {
    const invokeCommand = vi.fn(async () => ({
      success: true,
      output: "interview done",
      artifacts: ["docs/UI_REQUIREMENTS.md", "docs/COMPONENT_INVENTORY.md"],
    }));
    const exists = vi.fn(async () => true);
    const awaitApproval = vi.fn(async () => {});
    const ctx = makeMockContext({ invokeCommand, exists, awaitApproval });

    const step = new RequirementsGateStep(makeDefinition());
    const result = await step.execute(ctx);

    expect(invokeCommand).toHaveBeenCalledWith("/ui-interview");
    expect(awaitApproval).toHaveBeenCalled();
    expect(result.status).toBe("passed");
    expect(result.artifacts).toContain("docs/UI_REQUIREMENTS.md");
  });

  it("execute fails if artifacts don't exist after interview", async () => {
    const invokeCommand = vi.fn(async () => ({
      success: true,
      output: "interview done",
      artifacts: [],
    }));
    const exists = vi.fn(async () => false);
    const ctx = makeMockContext({ invokeCommand, exists });

    const step = new RequirementsGateStep(makeDefinition());
    const result = await step.execute(ctx);

    expect(result.status).toBe("failed");
    expect(result.message).toContain("missing");
  });

  it("execute fails if user rejects approval", async () => {
    const invokeCommand = vi.fn(async () => ({
      success: true,
      output: "interview done",
      artifacts: [],
    }));
    const exists = vi.fn(async () => true);
    const awaitApproval = vi.fn(async () => {
      throw new Error("User rejected");
    });
    const ctx = makeMockContext({ invokeCommand, exists, awaitApproval });

    const step = new RequirementsGateStep(makeDefinition());
    const result = await step.execute(ctx);

    expect(result.status).toBe("failed");
    expect(result.message).toContain("rejected");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd orchestrator && npx vitest run tests/steps/requirements-gate.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement RequirementsGateStep**

```typescript
// src/steps/requirements-gate.ts
import { BaseStep } from "./base.js";
import { registerStep } from "./registry.js";
import type {
  StepDescription,
  PreflightResult,
  StepResult,
  RunContext,
} from "../types.js";

export class RequirementsGateStep extends BaseStep {
  describe(): StepDescription {
    return {
      id: this.definition.id,
      type: "requirements-gate",
      summary:
        "Interactive requirements interview. Produces UI_REQUIREMENTS.md and COMPONENT_INVENTORY.md.",
      prerequisites: [],
      artifacts: ["UI_REQUIREMENTS.md", "COMPONENT_INVENTORY.md"],
      passCondition: "Both artifact files exist AND user has explicitly approved them.",
      failCondition: "User cancels, artifacts missing, or user rejects approval.",
      scope: "component",
    };
  }

  async preflight(_ctx: RunContext): Promise<PreflightResult> {
    return { ready: true, issues: [] };
  }

  async execute(ctx: RunContext): Promise<StepResult> {
    // Invoke the interview
    await ctx.invokeCommand("/ui-interview");

    // Check that both artifacts exist
    const reqPath = ctx.config.artifacts.requirements;
    const invPath = ctx.config.artifacts.inventory;
    const reqExists = await ctx.exists(reqPath);
    const invExists = await ctx.exists(invPath);

    if (!reqExists || !invExists) {
      const missing = [
        !reqExists ? reqPath : null,
        !invExists ? invPath : null,
      ].filter(Boolean);
      return {
        status: "failed",
        artifacts: [],
        metrics: {},
        message: `Artifacts missing after interview: ${missing.join(", ")}`,
      };
    }

    // User approval gate
    try {
      await ctx.awaitApproval(
        `Review and approve:\n  - ${reqPath}\n  - ${invPath}`,
      );
    } catch {
      return {
        status: "failed",
        artifacts: [],
        metrics: {},
        message: "User rejected requirements approval.",
      };
    }

    return {
      status: "passed",
      artifacts: [reqPath, invPath],
      metrics: {},
      message: "Requirements and inventory approved.",
    };
  }
}

registerStep("requirements-gate", RequirementsGateStep);
```

- [ ] **Step 4: Run tests**

Run: `cd orchestrator && npx vitest run tests/steps/requirements-gate.test.ts`
Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
git add orchestrator/src/steps/requirements-gate.ts orchestrator/tests/steps/requirements-gate.test.ts
git commit -m "feat(orchestrator): RequirementsGateStep with artifact check + approval gate"
```

---

### Task 13: Remaining Step Implementations

The remaining 14 steps follow the same pattern established by SessionStartStep and RequirementsGateStep. Each step:
1. Implements `describe()` with metadata from the spec
2. Implements `preflight()` checking preconditions
3. Implements `execute()` by calling `ctx.invokeCommand()` and evaluating results

**Files (one pair per step):**
- Create: `orchestrator/src/steps/review-requirements.ts` + test
- Create: `orchestrator/src/steps/e2e-scaffold.ts` + test
- Create: `orchestrator/src/steps/dependency-resolve.ts` + test
- Create: `orchestrator/src/steps/build-wave.ts` + test
- Create: `orchestrator/src/steps/test-suite.ts` + test
- Create: `orchestrator/src/steps/post-wave-review.ts` + test
- Create: `orchestrator/src/steps/e2e-green.ts` + test
- Create: `orchestrator/src/steps/design-audit.ts` + test
- Create: `orchestrator/src/steps/visual-qa.ts` + test
- Create: `orchestrator/src/steps/set-baseline.ts` + test
- Create: `orchestrator/src/steps/pre-commit-review.ts` + test
- Create: `orchestrator/src/steps/open-prs.ts` + test
- Create: `orchestrator/src/steps/await-merge.ts` + test
- Create: `orchestrator/src/steps/merge-to-main.ts` + test

Each step follows the exact same TDD cycle:
1. Write test with mock context
2. Verify test fails
3. Implement step (describe + preflight + execute)
4. Verify test passes
5. Commit

**Key implementation notes per step:**

- **build-wave**: `execute()` reads wave number from `params.wave`, reads COMPONENT_INVENTORY.md to find components in that wave, calls `ctx.invokeCommand("/build-component", componentName)` for each. Tests mock invokeCommand returning success for each component.

- **test-suite**: `execute()` calls `ctx.exec(ctx.config.commands.typecheck)`, `ctx.exec(ctx.config.commands.test_client)`, `ctx.exec(ctx.config.commands.test_e2e)`. Parses stdout for pass/fail counts. Tests mock exec with sample test output.

- **open-prs**: `execute()` calls `ctx.exec("git checkout -b ...")`, `ctx.exec("git add ...")`, `ctx.exec("git commit ...")`, `ctx.exec("git push ...")`, `ctx.exec("gh pr create ...")` for each component. Tests mock exec chain.

- **await-merge**: `execute()` calls `ctx.exec("gh pr view ... --json state")` for each PR, checks all are merged. If not all merged, calls `ctx.awaitApproval()`. Tests mock gh output.

- **design-audit**: `preflight()` checks dev server is running via `ctx.exec("curl -s -o /dev/null -w '%{http_code}' http://localhost:3000")`. `execute()` calls `ctx.invokeCommand("/design-audit")`.

- [ ] **Step 1: Implement all 14 steps following TDD cycle (test → fail → implement → pass → commit for each)**

Each commit message follows: `feat(orchestrator): <StepName> step implementation`

- [ ] **Step 2: Run full test suite**

Run: `cd orchestrator && npx vitest run`
Expected: All tests passing

- [ ] **Step 3: Run typecheck**

Run: `cd orchestrator && npx tsc --noEmit`
Expected: 0 errors

---

### Task 14: Integration Test + Wiring

**Files:**
- Modify: `orchestrator/src/cli.ts` — wire commands to executor/explain
- Create: `orchestrator/tests/integration.test.ts`

- [ ] **Step 1: Write integration test**

```typescript
// tests/integration.test.ts
import { describe, it, expect } from "vitest";
import { Executor } from "../src/runner/executor.js";
import { generateDefaultPipeline } from "../src/config/defaults.js";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import type { OrchestratorConfig } from "../src/types.js";

// Import all steps to trigger registration
import "../src/steps/session-start.js";
import "../src/steps/requirements-gate.js";

function makeTempProject(): string {
  const dir = join(tmpdir(), `orchestrator-int-test-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

const CONFIG: OrchestratorConfig = {
  project: "integration-test",
  scope: { type: "component", target: "TestWidget" },
  branches: { main: "main", feature: null },
  artifacts: {
    requirements: "docs/UI_REQUIREMENTS.md",
    inventory: "docs/COMPONENT_INVENTORY.md",
    build_plan: "docs/BUILD_PLAN.md",
    build_status: "docs/BUILD_STATUS.md",
    design_audit: "docs/DESIGN_AUDIT.md",
    visual_qa: "docs/VISUAL_QA.md",
  },
  commands: {
    test_client: "echo 'Tests: 5 passed'",
    test_server: "echo pass",
    test_e2e: "echo pass",
    build_client: "echo pass",
    dev_server: "echo pass",
    typecheck: "echo pass",
  },
  ci: {
    required_on_main: ["server", "client", "e2e"],
    required_on_feature: ["server", "client"],
    informational_on_feature: ["e2e"],
  },
};

describe("Integration: component-scope pipeline", () => {
  it("runs session-start as first step for component scope", async () => {
    const dir = makeTempProject();
    const steps = generateDefaultPipeline(CONFIG);
    const executor = new Executor(CONFIG, steps, dir);

    const result = await executor.runNext();
    expect(result).not.toBeNull();
    expect(result!.stepId).toBe("session-start");
    expect(result!.result.status).toBe("passed");

    rmSync(dir, { recursive: true });
  });
});
```

- [ ] **Step 2: Run integration test**

Run: `cd orchestrator && npx vitest run tests/integration.test.ts`
Expected: PASS

- [ ] **Step 3: Wire CLI to executor and explain**

Update `orchestrator/src/cli.ts` main function to:
- `run`: create Executor, call `runNext()` in a loop until null or failure
- `status`: load state, print summary
- `explain`: load config, generate pipeline, instantiate steps, call `describe()`, format with `formatExplain()`
- `run-step`: run a specific step by ID
- `reset`: reset a step's state to pending
- `init`: write a template `orchestrator.config.yaml`

- [ ] **Step 4: Run full test suite**

Run: `cd orchestrator && npx vitest run`
Expected: All passing

- [ ] **Step 5: Run typecheck**

Run: `cd orchestrator && npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 6: Final commit**

```bash
git add orchestrator/
git commit -m "feat(orchestrator): wire CLI to executor, explain, and full step registry"
```

---

### Task 15: Create Example Config for Coffee Roast Tracker

**Files:**
- Create: `orchestrator.config.yaml` (in project root)

- [ ] **Step 1: Write the config**

```yaml
# orchestrator.config.yaml
# Frontend Orchestrator pipeline config for coffee-roast-tracker

project: coffee-roast-tracker

scope:
  type: app
  target: null

branches:
  main: main
  feature: feat/client-rebuild

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
```

- [ ] **Step 2: Validate it loads**

Run: `cd orchestrator && npx tsx -e "import { loadConfig } from './src/config/loader.js'; console.log(loadConfig('..').project)"`
Expected: `coffee-roast-tracker`

- [ ] **Step 3: Commit**

```bash
git add orchestrator.config.yaml
git commit -m "chore: add orchestrator config for coffee-roast-tracker"
```
