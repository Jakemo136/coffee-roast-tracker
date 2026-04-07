# Testing Strategy & User Story Generation — Design Spec

> Defines the testing pyramid conventions for frontend-orchestration
> projects, introduces a user-story-generation step to the orchestrator,
> and establishes integration testing as the primary defense against
> form-level and cross-component bugs.

## Problem

265 RTL unit tests and 103 E2E tests all passed, but 5 minutes of
manual click-testing found 9 bugs:

- GraphQL schema mismatch (form sends field not in mutation input type)
- Input fields losing focus after one keystroke
- Save button disabled when it should be enabled
- Flavor parsing producing no results with valid input
- Dead-end states with no way forward
- Cross-modal data flow broken (Add Bean from Upload doesn't return data)

**Root cause:** The test suite had no integration layer. RTL tests
mock GraphQL entirely, so they never validate form fields against
the actual schema. E2E tests verify page loads and navigation but
don't exercise multi-step form interactions. The gap between
"component renders correctly in isolation" and "full user journey
across pages" is where all 9 bugs lived.

**Secondary cause:** Test specs were derived from component
inventories ("AddBeanModal has fields X, Y, Z") rather than user
interaction sequences ("user pastes cupping notes, clicks Parse,
sees matched flavors, clicks Save"). The tests proved the UI
existed, not that it worked.

## Goals

1. Establish a testing pyramid with clear responsibilities per level
2. Add integration tests as the primary bug-catching layer
3. Introduce user-story-generation as an orchestrator step
4. Ensure every form, modal, and multi-step flow has interaction tests
5. Make schema mismatches fail at test time, not click-testing time

---

## Testing Pyramid

### Level 1: Static Analysis

**Tool:** TypeScript (`strict: true`) + ESLint
**Runs:** On every save (IDE) and in CI
**Tests:** Type errors, unused variables, import mistakes, a11y lint

Not a test you write — just configuration. Already in place.

### Level 2: Unit Tests

**Tool:** Vitest
**File pattern:** `src/**/*.test.ts` (no JSX, no rendering)
**Tests:** Pure functions, custom hooks, utility modules

| What belongs | What does NOT belong |
|-------------|---------------------|
| `parseKlog()` correctness | Anything that renders JSX |
| `celsiusToFahrenheit()` edge cases | Component behavior |
| `formatDuration()` formatting | GraphQL interactions |
| `scopeMeetsThreshold()` logic | DOM assertions |

**Convention:** If the test imports `render` from RTL, it's not
a unit test. Move it up a level.

### Level 3: Component Tests

**Tool:** Vitest + React Testing Library
**File pattern:** `src/**/__tests__/*.test.tsx`
**Tests:** Single component rendering, props contract, a11y, isolated interactions

| What belongs | What does NOT belong |
|-------------|---------------------|
| "Does StarRating render 5 stars?" | Multi-component flows |
| "Does Modal close on backdrop click?" | Form submission round-trips |
| "Does FlavorPill render name and color?" | GraphQL responses |
| "Is the button disabled when `disabled` prop is true?" | Cross-component data flow |

**Convention:** Component tests mock everything outside the
component boundary (GraphQL, context, navigation). They verify
the component's contract: given these props, when the user does X,
then Y is visible or callable.

### Level 4: Integration Tests — THE CRITICAL LAYER

**Tool:** Vitest + React Testing Library + schema-driven MSW
**File pattern:** `src/**/__tests__/*.integration.test.tsx`
**Tests:** Multi-component flows, forms, modals, cross-component
communication, button state machines, dead-end detection

This is the layer that was missing. It catches:
- Schema mismatches (form fields vs. mutation input types)
- Input focus loss during controlled component re-renders
- Button enabled/disabled state transitions
- Dead-end states (no exit path from a modal state)
- Cross-modal data flow (Modal A opens Modal B, data returns)
- Error recovery (submit fails → error → correct → resubmit)

#### Schema-Driven MSW

Integration tests do NOT use hand-written JSON mock responses.
They use the project's actual GraphQL schema as the mock contract.

**Required packages:**
- `@graphql-tools/schema` — creates executable schema from typeDefs
- `@graphql-tools/mock` — adds mock resolvers to the schema
- `@apollo/graphql-testing-library` — Apollo's official test lib,
  wraps the above for MSW integration (optional but recommended)

**The schema source is the actual server typeDefs** — imported
directly, not copied. Tests and server share the same source of
truth. If the server schema changes, tests that reference stale
fields fail immediately.

```typescript
// test/mocks/schema-handler.ts
import { makeExecutableSchema } from "@graphql-tools/schema";
import { addMocksToSchema } from "@graphql-tools/mock";

// Import the ACTUAL schema the server uses — single source of truth
import { typeDefs } from "../../../server/src/schema/typeDefs";

const schema = makeExecutableSchema({ typeDefs });

// Mock resolvers execute against the real schema.
// If the client sends a field the schema doesn't define,
// execution fails with a GraphQL validation error.
const mockedSchema = addMocksToSchema({
  schema,
  resolvers: {
    Mutation: {
      createBean: (_, { input }) => ({
        // input is schema-typed — sending { supplier: "..." }
        // when CreateBeanInput has no supplier field FAILS here
        id: "ub-new",
        bean: { id: "bean-new", name: input.name, origin: input.origin },
      }),
    },
  },
});
```

**What this prevents:**
- Client sends field not in mutation input type → validation error
- Client queries field not on return type → null/error
- Mock returns fields not on the type → caught by TypeScript
- Schema changes on server → all affected tests fail immediately
- No more stale `handlers.ts` that silently accepts anything

The old `client/test/mocks/handlers.ts` with hand-written JSON
blobs must be deleted and replaced entirely. See "Existing Mock
Audit" section below.

#### userEvent Always, fireEvent Never (for text inputs)

```typescript
// WRONG — hides focus-loss bugs
fireEvent.change(input, { target: { value: "Ethiopia" } });

// RIGHT — types character by character, catches re-mount/focus issues
await userEvent.type(input, "Ethiopia");
expect(input).toHaveFocus();
expect(input).toHaveValue("Ethiopia");
```

`fireEvent.change` sets the value in one shot. Real users type
character by character, each keystroke triggering a re-render in
controlled components. If the component re-mounts (losing focus),
`fireEvent.change` won't catch it. `userEvent.type` will.

#### Button State Machine Testing

Every form's submit button must be tested through its full
lifecycle, not just initial and final states:

1. **Empty form** → button disabled
2. **Partial fill** (each required field, one at a time) → still disabled
3. **All required filled** → enabled
4. **Clear one required field** → disabled again
5. **During submission** → disabled (loading)
6. **After error** → re-enabled
7. **After success** → modal closes

#### Dead-End Detection

Every modal state must have an assertion that the user can either
proceed forward or exit:

```typescript
function assertHasExitPath(container: HTMLElement) {
  const closeBtn = within(container).queryByLabelText(/close|cancel|back/i);
  const actionBtns = within(container).queryAllByRole("button")
    .filter(btn => !btn.hasAttribute("disabled")
      && btn.textContent?.match(/save|submit|next|create|add/i));

  expect(
    closeBtn !== null || actionBtns.length > 0,
    "Dead end: no enabled close/cancel and no enabled action button"
  ).toBe(true);
}
```

#### Cross-Component Flow Testing

When Modal A opens Modal B and data flows back:

```typescript
it("creating a bean in AddBeanModal returns data to UploadModal", async () => {
  // Render the parent that owns both modals
  // Open upload modal → upload file with no match
  // Click "Add New Bean" → fill bean form → Save
  // Assert: back in upload modal, new bean is selected
  // Assert: Save Roast button is enabled
});
```

### Level 5: E2E Tests

**Tool:** Playwright
**File pattern:** `e2e/*.spec.ts`
**Tests:** Full user journeys across multiple pages, real browser,
real server

| What belongs | What does NOT belong |
|-------------|---------------------|
| "Upload roast → land on detail → compare with another" | Individual form field validation |
| "Create bean → upload roast for it → see it in bean detail" | Component rendering |
| "Browse as logged-out user → bean library → bean detail → roast" | Anything testable faster at Level 4 |

**Convention:** E2E tests have NO soft conditionals. Every assertion
is unconditional. If a flow has two branches (bean match vs. no match),
write two tests, not one test with `if`.

### Level 6: Schema Validation (CI)

**Tool:** graphql-inspector or equivalent
**Runs:** In CI on every PR
**Tests:** All GraphQL operations in client source against the
server schema

```bash
npx graphql-inspector validate \
  'client/src/**/*.{ts,tsx}' \
  'server/src/schema/typeDefs.ts'
```

Catches field name changes, removed fields, type mismatches, and
missing required arguments before any tests run.

---

## Testing Conventions (Enforced by Orchestrator)

These apply to every component build and are checked by the
code-reviewer step.

### For every component with a form or modal:

1. **Integration test file exists** (`*.integration.test.tsx`)
2. **Schema-driven MSW** — no hand-written response JSON for mutations
3. **`userEvent.type()`** for all text input interactions
4. **Button state machine** — tested through full lifecycle
5. **Dead-end assertion** — every reachable state has an exit path
6. **Focus retention** — `expect(input).toHaveFocus()` after typing

### For every multi-step flow:

1. **Happy path integration test** — full sequence from open to close
2. **Each branch tested separately** — no `if (visible)` in tests
3. **Error recovery test** — submit fails → error shown → retry works
4. **Cancel/close at every step** — verify data doesn't leak

### For every cross-component interaction:

1. **Data round-trip test** — data created in child returns to parent
2. **State consistency test** — parent reflects child's changes
3. **Prop wiring test** — see Wiring Audit below

---

## Wiring Audit — Preventing Prop Flow Gaps

### The problem this solves

Component tests verify "does this component work when given
correct props?" They never verify "does this component receive
correct props from its actual parent?" This gap caused bug #3:
AddBeanModal's flavor parsing worked in isolation, but UploadModal
never passed the `flavors` prop — so parsing always returned
nothing in the real app.

265 tests passed. The circuit was broken.

### Root cause

The build-component protocol tests each component at its own
boundary. Parent-child data flow is nobody's responsibility.
The AddBeanModal builder tests flavor parsing with hardcoded
`flavors` prop. The UploadModal builder tests that "Add New Bean"
opens AddBeanModal. Neither tests that UploadModal passes
flavors to AddBeanModal.

### Three categories of wiring gap

**1. Prop passthrough gaps** — Parent renders child but doesn't
pass a prop the child needs to function (even if TypeScript
marks it optional). Bug #3: `flavors` prop.

**2. Data shape gaps** — Parent queries GraphQL and passes result
to child, but the query response shape doesn't match what the
child expects. Bug #6: `supplier` field not in mutation input.

**3. Callback chain gaps** — Child calls `onSave(data)`, parent
passes data to a mutation, but the mutation input type doesn't
match what the child sends. Also bug #6.

### Wiring audit rule

For every edge in the component dependency graph where a parent
renders a child with data props, the orchestrator's build step
must produce an integration test that:

1. Renders the **parent** (not the child in isolation)
2. Navigates to the state where the **child is active**
3. Exercises the child's **primary feature** through the parent
4. Verifies data **flows back** to the parent correctly

### Wiring audit checklist (derived from inventory)

The dependency-resolve step or user-story-generation step reads
COMPONENT_INVENTORY.md and generates a wiring checklist. For
each parent → child edge:

```
UploadModal → AddBeanModal
  [ ] Parent passes flavors to child (feature: flavor parsing)
  [ ] Child onSave data returns to parent (feature: bean creation)
  [ ] All child form fields survive the round-trip to mutation

AppLayout → UploadModal
  [ ] Parent passes onPreview/onSave/onCreateBean/flavors
  [ ] UploadModal.onSave triggers navigation

BeanLibraryPage → AddBeanModal
  [ ] Parent passes flavors to child
  [ ] Child onSave triggers refetch

RoastDetailPage → FlavorPickerModal
  [ ] Parent passes current flavors and descriptors
  [ ] Child onSave updates displayed pills
```

Each line becomes an integration test assertion. If a line has
no corresponding test, the build step fails the wiring audit.

### Where this fits in the build-component protocol

After step 7 (code review) and before step 8 (mark complete):

> **Step 7c: Wiring audit**
>
> For every parent that renders this component (from the
> dependency graph in COMPONENT_INVENTORY.md):
>
> 1. Does the parent pass all props the component needs to
>    function? Not just TypeScript-required props — functionally
>    required props (like `flavors` which is optional in types
>    but essential for parsing).
>
> 2. Is there an integration test that renders the parent and
>    exercises this component's primary features through it?
>
> 3. If not, write the integration test now.
>
> The wiring audit is NOT optional. A component with green unit
> tests but no wiring test for a parent that renders it cannot
> be marked `[x]` complete.

### User stories must trace data sources

Each user story that involves data flowing across component
boundaries must include a `Data flow:` annotation:

```markdown
### US-UP-2: Upload with no bean match — create bean inline
...
9. I click "Parse Flavors"
10. I see matched pills

**Data flow:** Flavor descriptors are queried by AppLayout
(FLAVOR_DESCRIPTORS_QUERY), passed to UploadModal as `flavors`
prop, then to AddBeanModal as `flavors` prop. If any link in
this chain is missing, parsing returns no results.

**Wiring test:** upload-flow.integration.test.tsx must render
UploadModal, open AddBeanModal, paste cupping notes, click
Parse Flavors, and verify matched pills appear.
```

This annotation tells the test writer exactly what chain to
test and what would break if a link is missing.

---

## User Story Generation — New Orchestrator Step

### Step definition

| | |
|---|---|
| **ID** | `user-story-generation` |
| **Type** | `user-story-generation` |
| **Scope threshold** | `page` (skipped for individual components) |
| **Prerequisites** | `ui-interview` complete (requirements + inventory approved) |
| **What it does** | Reads UI_REQUIREMENTS.md, COMPONENT_INVENTORY.md, and the GraphQL schema. Generates USER_STORIES.md with concrete interaction sequences for every form, modal, and multi-page flow. |
| **Pass condition** | USER_STORIES.md exists, covers all forms/modals identified in inventory, user approves. |
| **Fail condition** | Missing source docs, or user rejects stories. |
| **Artifacts** | `docs/USER_STORIES.md` |
| **User approval gate** | Yes — user reviews and approves stories before build. |

### Pipeline position

```
ui-interview → user-story-generation → e2e-scaffold
                                     → dependency-resolve
```

Stories inform both the E2E scaffold (multi-page journeys) and
the integration tests written during each component build.

### What it reads

1. **UI_REQUIREMENTS.md** — page specs, user flows, modal behavior
2. **GraphQL schema** — mutation input types, required fields, return types
3. **COMPONENT_INVENTORY.md** — which components contain forms, which modals open which

### What it produces

`docs/USER_STORIES.md` — organized by feature area. Each story:
- Written in PM voice, plain English, numbered steps
- Follows a user through a complete interaction
- Specifies what the user sees at each step
- Covers happy path, error, edge case, and escape hatch variants

### Story derivation rules

For each **form or modal** in the component inventory:

| Story type | What it covers | Count |
|-----------|---------------|-------|
| **Happy path** | All fields filled, submit succeeds, modal closes | 1 |
| **Required field boundaries** | Each required field empty, others filled — submit disabled | N (one per required field) |
| **Error recovery** | Submit fails (server error) → error shown → user retries → succeeds | 1 |
| **Escape hatches** | Cancel/close at every step of the flow | 1 per distinct state |
| **Schema alignment** | Form fields match mutation input type — verified by story steps | Implicit in happy path |

For each **cross-component flow** (e.g., Upload opens Add Bean):

| Story type | What it covers |
|-----------|---------------|
| **Data round-trip** | Create in child → data returns to parent → parent state updates |
| **Cancel in child** | Open child modal → cancel → parent state unchanged |
| **Prop passthrough** | Parent provides data child needs for features (e.g., flavors for parsing) |
| **Supplier description persistence** | Fill supplier desc in child → save → verify it persists in parent and in subsequent views |

Every cross-component story MUST include a `Data flow:` annotation
identifying the source of each piece of data and the chain of
props it flows through. This annotation directly informs which
wiring tests to write. See "Wiring Audit" section for details.

For each **multi-page journey**:

| Story type | What it covers |
|-----------|---------------|
| **End-to-end flow** | Navigate across 2+ pages with data continuity |
| **Entry from multiple points** | Same destination reached from different starting pages |

### Story format

```markdown
## Upload a Roast

### US-UP-1: Upload with bean match (happy path)
As a logged-in user, I want to upload a .klog file that matches
an existing bean so I can log my roast quickly.

1. I click "Upload" in the header
2. I see a modal with a dropzone saying "Drop your .klog file"
3. I drop a .klog file named "EGB 0320a.klog"
4. I see "Parsed successfully" with roast date, duration, and DTR%
5. I see "Bean match found: Ethiopia Yirgacheffe"
6. The Save button is enabled
7. I click Save
8. The modal closes
9. I land on the new roast's detail page

**Test level:** Integration (upload-flow.integration.test.tsx)
**Also covers:** E2E journey (upload.spec.ts)

### US-UP-2: Upload with no bean match — create bean inline
As a logged-in user, I want to upload a .klog file that doesn't
match any bean and create the bean inline with full details.

1. I click "Upload" in the header
2. I drop a .klog file with an unrecognized profile short name
3. I see "Parsed successfully" with roast metadata
4. I see "No bean match" with a prominent "Add New Bean" button
5. I click "Add New Bean"
6. I see the Add Bean form with name, origin, process,
   variety, supplier, score, and supplier description fields
7. I fill in name, origin, process, and supplier description
8. I paste cupping notes and click "Parse Flavors"
9. I see matched flavor pills (or "No match" with manual add option)
10. I click Save on the bean form
11. The bean is created and auto-selected in the upload modal
12. The supplier description I entered persists on the bean
13. The Save Roast button is enabled
14. I click Save Roast
15. The modal closes and I land on the roast detail page
16. Navigating to the bean detail page shows my supplier description

**Test level:** Integration (upload-flow.integration.test.tsx)

### US-UP-3: Upload — cancel at every step
As a user, I can exit the upload flow at any point without
side effects.

1. Open upload modal → click close → modal closes, no roast created
2. Upload file → see preview → click close → modal closes, no roast
3. Upload file → click "Add New Bean" → click cancel on bean form
   → back to upload preview, no bean created
4. Upload file → click "Add New Bean" → fill form → click close
   on upload modal → both modals close, no bean or roast created

**Test level:** Integration (upload-flow.integration.test.tsx)
```

### How stories map to test files

| Story prefix | Feature area | Integration test file | E2E test file |
|-------------|-------------|----------------------|---------------|
| US-UP-* | Upload roast | `upload-flow.integration.test.tsx` | `upload.spec.ts` |
| US-AB-* | Add bean | `add-bean-flow.integration.test.tsx` | `bean-library.spec.ts` |
| US-RD-* | Roast detail editing | `roast-detail-flow.integration.test.tsx` | `roast-detail.spec.ts` |
| US-BD-* | Bean detail editing | `bean-detail-flow.integration.test.tsx` | `bean-detail.spec.ts` |
| US-FP-* | Flavor picker | `flavor-picker-flow.integration.test.tsx` | — (tested via parent) |
| US-CMP-* | Compare flow | `compare-flow.integration.test.tsx` | `compare.spec.ts` |
| US-J-* | Multi-page journeys | — (E2E only) | `journeys.spec.ts` |

---

## Orchestrator Step Updates

### Updated `build-component` protocol

When a component includes a form or modal (identified by the
component inventory's "GraphQL" field listing mutations, or by
the user stories referencing it), the component builder must:

1. Read relevant user stories from USER_STORIES.md
2. Write component tests (`*.test.tsx`) — rendering, props, a11y
3. Write integration tests (`*.integration.test.tsx`) — form flows,
   button state machines, dead-end checks, schema-driven MSW
4. Both test files must exist before implementation begins (TDD)
5. **Wiring audit (step 7c):** For every parent in the dependency
   graph that renders this component, verify an integration test
   exists that renders the parent and exercises this component's
   features through it. If no test exists, write one. A component
   cannot be marked complete without passing its wiring audit.

### Updated `e2e-scaffold`

Reads USER_STORIES.md in addition to UI_REQUIREMENTS.md.
Multi-page journey stories (US-J-*) become E2E test specs.
Form-level stories are NOT duplicated as E2E — they're tested
at the integration level.

### Updated `post-wave-review`

Code reviewer checks for:
- Integration test file exists for every form/modal component
- **Wiring tests exist** for every parent-child rendering edge
  in the dependency graph (see Wiring Audit section)
- No `fireEvent.change` for text inputs (must use `userEvent.type`)
- No soft conditionals in E2E tests
- Schema-driven MSW setup (not hand-written response JSON)
- Button state machine coverage
- Dead-end assertions for modal states

### Updated `test-suite:N`

Runs integration tests as part of the client test suite:
```
typecheck → unit tests → component tests → integration tests → E2E
```

Integration test failures are blocking (not informational).

---

## Existing Mock Audit — Must Fix

The current `client/test/mocks/handlers.ts` is a liability. It
contains hand-written JSON blobs that have drifted from the actual
schema:

- Returns `isShared`/`shareToken` — renamed to `isPublic` on server
- `ToggleRoastSharing` mutation — renamed to `toggleRoastPublic`
- `CreateBean` silently accepts `supplier` in input — field doesn't
  exist in `CreateBeanInput` GraphQL type (this is bug #6)
- `UserSettings` returns `{ id, tempUnit }` — missing `theme`,
  `privateByDefault`
- `RoastByShareToken` query — share tokens were removed entirely

**These mocks are lies that tests believe.** The implementation
plan must:

1. Replace all hand-written MSW handlers with schema-driven mocks
   that execute against the actual GraphQL type definitions
2. Delete the stale `handlers.ts` file entirely
3. Add CI schema validation to prevent future drift
4. Any test that relied on stale mock shapes must be updated to
   match the real schema

This is not optional cleanup — it's the root cause of the
form-level bugs. Schema-driven mocks would have caught every
schema mismatch at test time instead of click-testing time.

---

## Scope

This spec covers:
- Testing pyramid conventions (what goes where)
- Schema-driven MSW mandate (mock replacement)
- User story generation orchestrator step
- **Wiring audit** (prop flow verification across component boundaries)
- Updated build-component protocol with wiring audit step
- Updated post-wave-review checklist

Implementation specifics (fixing bugs, writing USER_STORIES.md,
replacing mocks, writing wiring tests) belong in implementation
plans.

## Open Questions

None. All questions resolved during design discussion.
