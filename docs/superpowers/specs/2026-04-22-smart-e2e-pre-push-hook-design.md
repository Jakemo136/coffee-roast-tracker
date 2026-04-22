# Smart E2E Pre-Push Hook

## Problem

The full E2E suite (105 tests, 10 spec files) takes ~21s locally and
~5min in CI. Running it on every push is wasteful when only a subset
of features changed. Skipping it entirely means E2E regressions aren't
caught until CI — adding a 10-15 min feedback loop.

## Solution

A shell script (`scripts/e2e-smart.sh`) that diffs the current branch
against `origin/main`, maps changed files to the E2E spec files that
exercise those features, and runs only the relevant specs. Integrated
as a Claude Code PreToolUse hook on `git push*`.

## Path-to-Spec Mapping

Each row lists file patterns and the specs they trigger. Patterns are
matched against the output of `git diff --name-only origin/main...HEAD`.

| Changed file pattern | Specs triggered |
|---|---|
| `client/src/features/beans/*`, `*BeanCard*` | `bean-detail.spec.ts`, `bean-library.spec.ts` |
| `client/src/features/roast-detail/*`, `*RoastChart*`, `*StarRating*` | `roast-detail.spec.ts` |
| `client/src/features/dashboard/*` | `dashboard.spec.ts`, `journeys.spec.ts` |
| `client/src/features/compare/*` | `compare.spec.ts` |
| `client/src/features/landing/*` | `landing.spec.ts` |
| `client/src/features/auth/*`, `client/src/App.tsx` | `auth.spec.ts` |
| `client/src/components/UploadModal*`, `*AddBeanModal*`, `*BatchUpload*` | `upload.spec.ts` |
| `client/src/components/Header*`, `*AppLayout*`, `*TempToggle*`, `*ThemeToggle*`, `*UserButton*` | `header-controls.spec.ts`, `auth.spec.ts` |
| `client/src/components/Combobox*`, `*FlavorPicker*`, `*Modal.*` | `upload.spec.ts`, `bean-detail.spec.ts` |
| `server/src/resolvers/*`, `server/prisma/*`, `server/src/lib/*` | `journeys.spec.ts` |
| `e2e/<name>.spec.ts` (direct edit) | that specific spec |
| `client/src/providers/*`, `client/src/graphql/*`, `client/src/lib/*` | full suite (infrastructure) |

### Fallback rules

- **No matches:** skip E2E entirely (no relevant changes).
- **Infrastructure match:** run all 10 specs (providers, graphql ops,
  or shared libs changed).
- **Multiple matches:** deduplicate into a unique spec set.

## Script Behavior

`scripts/e2e-smart.sh`:

1. Exit 0 immediately if current branch is `main`.
2. Run `git diff --name-only origin/main...HEAD` to collect changed
   files.
3. Walk each file through the case-statement mapping, accumulating
   spec paths into an associative array (natural dedup).
4. If no specs matched, print "No E2E-affecting changes" and exit 0.
5. If the `FULL_SUITE` flag was set, run `npx playwright test` (all).
6. Otherwise run `npx playwright test ${SPECS[*]}`.
7. Print which specs are running and why before invoking Playwright.
8. Exit with Playwright's exit code (non-zero blocks push).

## Hook Integration

Added as a second entry in `.claude/settings.local.json` under
`hooks.PreToolUse`, matching `Bash(git push*)` — runs after the
existing unit-test hook.

```json
{
  "type": "command",
  "command": "bash scripts/e2e-smart.sh 1>&2",
  "if": "Bash(git push*)",
  "timeout": 120,
  "statusMessage": "Running smart E2E selection..."
}
```

## Maintenance

When adding a new feature directory or E2E spec file:

1. Add a case-statement entry in `scripts/e2e-smart.sh`.
2. No other changes needed — the hook auto-discovers specs from the
   mapping.

## Tradeoffs

- **Coverage gaps:** cross-cutting changes (e.g., a shared CSS token)
  won't trigger any spec unless they touch a mapped path. The
  infrastructure fallback (providers/graphql/lib) catches most of
  these, but not all.
- **Maintenance cost:** the mapping needs a new entry when a new
  feature dir or spec is added. This is low-frequency (~monthly).
- **Server startup:** if dev servers aren't running, Playwright's
  `webServer` config starts them (~15s overhead). The script does not
  manage servers itself.
- **CI redundancy:** PRs still run the full E2E suite in CI. This
  hook shifts failure detection earlier, not replaces CI.
