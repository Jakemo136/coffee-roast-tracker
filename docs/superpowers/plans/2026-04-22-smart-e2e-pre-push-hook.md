# Smart E2E Pre-Push Hook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run only the E2E specs affected by changed files when pushing a non-main branch, instead of skipping E2E or running the full suite.

**Architecture:** A standalone bash script maps changed file paths to E2E spec files via a case statement. A Claude Code PreToolUse hook invokes the script on `git push*`.

**Tech Stack:** Bash (associative arrays, case statement), Playwright CLI, Claude Code hooks (`settings.local.json`)

---

### Task 1: Create `scripts/e2e-smart.sh`

**Files:**
- Create: `scripts/e2e-smart.sh`

**Spec ref:** "Script Behavior" section + "Path-to-Spec Mapping" table

- [ ] **Step 1: Create the script with the full implementation**

```bash
#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
E2E_DIR="$PROJECT_ROOT/e2e"

# Skip E2E on main branch
BRANCH=$(git -C "$PROJECT_ROOT" rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" = "main" ]; then
  echo "[e2e-smart] On main — skipping E2E." >&2
  exit 0
fi

# Collect changed files relative to origin/main
CHANGED=$(git -C "$PROJECT_ROOT" diff --name-only origin/main...HEAD 2>/dev/null || true)
if [ -z "$CHANGED" ]; then
  echo "[e2e-smart] No changes vs origin/main — skipping E2E." >&2
  exit 0
fi

declare -A SPECS
FULL_SUITE=false

while IFS= read -r f; do
  case "$f" in
    # Feature directories
    client/src/features/beans/*|*/BeanCard*)
      SPECS["bean-detail.spec.ts"]=1
      SPECS["bean-library.spec.ts"]=1
      ;;
    client/src/features/roast-detail/*|*/RoastChart*|*/StarRating*)
      SPECS["roast-detail.spec.ts"]=1
      ;;
    client/src/features/dashboard/*)
      SPECS["dashboard.spec.ts"]=1
      SPECS["journeys.spec.ts"]=1
      ;;
    client/src/features/compare/*)
      SPECS["compare.spec.ts"]=1
      ;;
    client/src/features/landing/*)
      SPECS["landing.spec.ts"]=1
      ;;
    client/src/features/auth/*|client/src/App.tsx)
      SPECS["auth.spec.ts"]=1
      ;;

    # Shared components
    client/src/components/UploadModal*|*/AddBeanModal*|*/BatchUpload*)
      SPECS["upload.spec.ts"]=1
      ;;
    client/src/components/Header*|*/AppLayout*|*/TempToggle*|*/ThemeToggle*|*/UserButton*)
      SPECS["header-controls.spec.ts"]=1
      SPECS["auth.spec.ts"]=1
      ;;
    client/src/components/Combobox*|*/FlavorPicker*|*/Modal.*)
      SPECS["upload.spec.ts"]=1
      SPECS["bean-detail.spec.ts"]=1
      ;;

    # Server changes — smoke test
    server/src/resolvers/*|server/prisma/*|server/src/lib/*)
      SPECS["journeys.spec.ts"]=1
      ;;

    # Direct E2E spec edits
    e2e/*.spec.ts)
      SPEC_NAME=$(basename "$f")
      SPECS["$SPEC_NAME"]=1
      ;;

    # Infrastructure — full suite
    client/src/providers/*|client/src/graphql/*|client/src/lib/*)
      FULL_SUITE=true
      ;;
  esac
done <<< "$CHANGED"

# No E2E-affecting changes
if [ "$FULL_SUITE" = false ] && [ ${#SPECS[@]} -eq 0 ]; then
  echo "[e2e-smart] No E2E-affecting changes — skipping." >&2
  exit 0
fi

# Full suite
if [ "$FULL_SUITE" = true ]; then
  echo "[e2e-smart] Infrastructure change detected — running full E2E suite." >&2
  cd "$PROJECT_ROOT"
  exec npx playwright test
fi

# Build spec file paths
SPEC_PATHS=()
for spec in "${!SPECS[@]}"; do
  SPEC_PATHS+=("$E2E_DIR/$spec")
done

echo "[e2e-smart] Running ${#SPEC_PATHS[@]} spec(s): ${!SPECS[*]}" >&2

cd "$PROJECT_ROOT"
exec npx playwright test "${SPEC_PATHS[@]}"
```

- [ ] **Step 2: Make the script executable**

Run: `chmod +x scripts/e2e-smart.sh`

- [ ] **Step 3: Verify the script runs without errors on current branch**

Run: `bash scripts/e2e-smart.sh`

Expected: prints which specs are selected based on the current branch diff, then runs them. If on `fix/sign-in-header` branch, should pick up `auth.spec.ts` (since `client/src/App.tsx` changed) and `e2e/auth.spec.ts` (direct edit).

- [ ] **Step 4: Verify skip behavior on main**

Run: `git stash && git checkout main && bash scripts/e2e-smart.sh; echo "exit: $?"; git checkout - && git stash pop`

Expected: prints "On main — skipping E2E." and exits 0.

- [ ] **Step 5: Commit**

```bash
git add scripts/e2e-smart.sh
git commit -m "feat(scripts): add smart E2E spec selection for pre-push"
```

---

### Task 2: Add PreToolUse hook to `settings.local.json`

**Files:**
- Modify: `.claude/settings.local.json` — add second hook entry under `hooks.PreToolUse[0].hooks`

- [ ] **Step 1: Add the E2E hook entry after the existing unit-test hook**

The existing `hooks.PreToolUse[0].hooks` array has one entry (the unit-test hook). Add a second entry:

```json
{
  "type": "command",
  "command": "bash scripts/e2e-smart.sh 1>&2",
  "if": "Bash(git push*)",
  "timeout": 120,
  "statusMessage": "Running smart E2E selection..."
}
```

The full `hooks` section should become:

```json
"hooks": {
  "PreToolUse": [
    {
      "matcher": "Bash",
      "hooks": [
        {
          "type": "command",
          "command": "{ cd /Users/jakemosher/Workspace/coffee-roast-tracker && (cd server && npm test) && (cd client && npm test) && (cd client && npm run validate:schema); } 1>&2 || { echo '\"'\"'Pre-push checks failed. Fix and rerun. E2E is not part of this hook — run `npx playwright test` separately.'\"'\"' >&2; exit 2; }",
          "if": "Bash(git push*)",
          "timeout": 120,
          "statusMessage": "Running pre-push tests (server + client + schema)..."
        },
        {
          "type": "command",
          "command": "bash scripts/e2e-smart.sh 1>&2",
          "if": "Bash(git push*)",
          "timeout": 120,
          "statusMessage": "Running smart E2E selection..."
        }
      ]
    }
  ]
}
```

- [ ] **Step 2: Verify JSON is valid**

Run: `node -e "JSON.parse(require('fs').readFileSync('.claude/settings.local.json','utf8')); console.log('valid')"`

Expected: prints "valid"

- [ ] **Step 3: Update the existing unit-test hook's error message**

The current hook message says "E2E is not part of this hook — run `npx playwright test` separately." Since E2E now runs automatically via the second hook, update to:

```
Pre-push checks failed. Fix and rerun.
```

- [ ] **Step 4: Commit**

```bash
git add .claude/settings.local.json
git commit -m "chore(hooks): wire smart E2E selection into pre-push"
```

---

### Task 3: End-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Kill any running dev servers**

Run: `lsof -ti :3000 -ti :4000 2>/dev/null | xargs kill 2>/dev/null; echo "servers stopped"`

This ensures Playwright starts fresh with E2E config.

- [ ] **Step 2: Test the script directly on current branch**

Run: `bash scripts/e2e-smart.sh`

Expected: selects and runs the correct subset of specs. Should pass.

- [ ] **Step 3: Test with a simulated no-match scenario**

Run: `echo "README.md" | bash -c 'PROJECT_ROOT=. E2E_DIR=./e2e source <(sed "s/CHANGED=.*//" scripts/e2e-smart.sh)'`

Alternatively, verify by reading the script logic: a change to only `README.md` matches no case-statement pattern → prints "No E2E-affecting changes" → exits 0.

- [ ] **Step 4: Final commit with both files**

If any adjustments were made during verification:

```bash
git add scripts/e2e-smart.sh .claude/settings.local.json
git commit -m "fix(scripts): adjustments from e2e-smart verification"
```
