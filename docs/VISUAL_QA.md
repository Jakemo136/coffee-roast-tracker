# Visual QA Report

**Date:** 2026-04-04
**Branch:** `feat/client-rebuild`
**Method:** Code analysis + Playwright interactive testing + screenshot review
**Result:** All 16 issues fixed (3 critical, 4 major, 9 minor). 265/265 RTL tests passing.

---

## Critical UX Issues (fix before merge)

### UX-C1. Silent file rejection for non-.klog files
- **Heuristic:** H9 (Error Recovery), Frustration Signal (silent failure)
- **File:** `client/src/components/UploadModal.tsx:105`
- **Issue:** User drops a .csv or other file → nothing happens. No error message, no feedback. The file is silently ignored.
- **User impact:** "Did my upload break? Is the app frozen?" — high confusion, frequent occurrence
- **Fix:** Show error toast or inline message: "Only .klog files are supported"

### UX-C2. Mutations lack pending state — duplicate submissions possible
- **Heuristic:** H1 (System Status), H5 (Error Prevention)
- **Files:** `RoastDetailPage.tsx:148,179,188,192`, `UploadModal.tsx:220`
- **Issue:** Save, rating, togglePublic, setFlavors mutations don't disable buttons during flight. Users can click repeatedly.
- **User impact:** Duplicate roast uploads, duplicate rating changes. "Did it save? Let me click again." — high frustration
- **Fix:** Disable buttons and show spinner during mutation. Use Apollo's `loading` state from `useMutation`.

### UX-C3. Delete mutation fails silently
- **Heuristic:** H9 (Error Recovery), Frustration Signal (silent failure)
- **File:** `RoastDetailPage.tsx:163-171`
- **Issue:** If delete fails, the catch block doesn't notify the user. Dialog stays open with no error message.
- **User impact:** "I clicked delete, nothing happened, is my roast deleted or not?" — high confusion
- **Fix:** Show error toast on catch: "Failed to delete roast. Please try again."

---

## Major UX Issues (fix in same sprint)

### UX-M1. Touch targets too small on mobile
- **Standard:** Touch targets must be ≥44x44px
- **Worst offenders:**
  - Gear/settings button: **20x26px**
  - Chart series toggle buttons: **~70x25px** (height fails)
  - Phase zoom buttons: **~33-66x26px** (height fails)
  - Nav link "Beans": **43x31px**
  - Back links: **~116x21px** (height fails)
  - Modal close button: **~28x28px**
  - Default checkboxes in table: **~16x16px**
  - Star rating half-targets: **~7-9px** wide at small size
- **User impact:** Frequent mis-taps on mobile, especially chart controls and close buttons
- **Fix:** Add `min-height: 2.75rem` (44px) to all interactive elements on mobile. Increase checkbox size. Increase star rating touch targets.

### UX-M2. No loading state during file parsing
- **Heuristic:** H1 (System Status)
- **File:** `UploadModal.tsx:91`
- **Issue:** After dropping a .klog file, `onPreview()` is called with no spinner or loading indicator. File "disappears" while being parsed.
- **User impact:** "Did my file upload? Is it processing?" — moderate confusion
- **Fix:** Show spinner or "Parsing file..." state while preview resolves

### UX-M3. Temp/theme toggles appear dead
- **Heuristic:** H1 (System Status), Frustration Signal (dead clicks)
- **Routes:** All routes with header
- **Issue:** Playwright testing found °C/°F and sun/moon toggles produce no observable visual change. State may be changing internally but the page doesn't reflect it.
- **User impact:** "These buttons don't work" — moderate frustration
- **Fix:** Verify toggle state is reflected visually. Temp toggle should update any visible temperatures. Theme toggle should swap CSS variables.

### UX-M4. Parse warnings displayed as comma-joined text
- **Heuristic:** H9 (Error Recovery)
- **File:** `UploadModal.tsx:274-276`
- **Issue:** Multiple parse warnings joined as "X, Y, Z" — not structured as a scannable list.
- **Fix:** Render as `<ul>` list items

---

## Minor UX Issues (fix when touching the area)

### UX-m1. Domain terminology not explained
- **Heuristic:** H2 (Real World Match), H10 (Help)
- "DTR%", "RoR", "FC Temp", "Development Time" used without explanation
- **Fix:** Add tooltips on first occurrence or an inline help icon

### UX-m2. Public/Private toggle ambiguous
- **Heuristic:** H2 (Real World Match)
- Unclear if "Public"/"Private" buttons are status indicators or toggles
- **Fix:** Use a labeled toggle switch with clear "on/off" visual

### UX-m3. No inline validation feedback
- **Heuristic:** H5 (Error Prevention)
- Submit buttons disable when form is incomplete but don't explain why
- **Fix:** Show "Required" hint below empty required fields on blur

### UX-m4. Sort indicators subtle
- **Heuristic:** H6 (Recognition vs Recall)
- Sort arrows ▲▼ are tiny text characters, easy to miss
- **Fix:** Use styled arrow icons with more visual weight

### UX-m5. Button sizes inconsistent across components
- **Heuristic:** H4 (Consistency)
- Pagination buttons (32px), form buttons (variable padding), action buttons all differ
- **Fix:** Standardize button height tokens

### UX-m6. Back links lack clear affordance
- **Heuristic:** H4 (Consistency), Affordances
- "← Back to Beans" styled as plain text, no underline or button styling
- **Fix:** Add underline or arrow icon with hover state

### UX-m7. No confirmation toast on visibility toggle
- **Heuristic:** H1 (System Status)
- Toggling Public/Private changes immediately with no feedback
- **Fix:** Show toast: "Roast is now public" / "Roast is now private"

### UX-m8. Flavor parse with no matches gives no feedback
- **Heuristic:** H9 (Error Recovery)
- User pastes cupping notes, clicks Parse → nothing visible if no matches found
- **Fix:** Show "No flavors matched" message

### UX-m9. No "recently viewed" or favorites
- **Heuristic:** H6 (Recognition vs Recall)
- Users navigate through full list every time
- **Fix:** Future enhancement — add recent/favorites section

---

## Passes

### What's working well
- **Empty states are excellent** — "Upload your first roast to get started" with clear action button
- **Modal interaction** — Escape, overlay click, focus trap all work correctly
- **Confirmation for destructive actions** — Delete shows ConfirmDialog with clear consequences
- **Star rating** — Interactive, visual feedback on hover, radio group semantics
- **Combobox** — Keyboard navigation (arrow keys, Enter, Escape), filtered suggestions
- **Error boundaries** — Network errors show retry option with ErrorState component
- **Visual hierarchy** — Clear heading structure, scannable sections, good white space
- **Gestalt proximity** — Related items grouped well (metadata fields, action buttons, content sections)
- **Gestalt similarity** — Buttons, cards, and nav links styled consistently
- **Gestalt figure-ground** — Cards and modals clearly distinct from background
- **Navigation** — No dead-end states found. Every page has a path back.
- **First-time experience** — Landing page communicates value, logged-out browsing works
- **Information density** — Cards show 3-5 fields, detail pages organized into sections
- **Core tasks ≤3 clicks** — Upload, view, and compare all reachable quickly

### Frustration Assessment
- **Silent failures** are the biggest frustration risk — file rejection and mutation errors
- **Touch targets** would cause frequent mis-taps on mobile, especially chart controls
- **No dead clicks** on core functionality (chart toggles, pagination, navigation all work)
- **No data loss** scenarios found — form data preserved on errors
- **No jarring transitions** — smooth modal/page navigation throughout

---

## Severity Summary

| Severity | Count | Key Areas |
|----------|-------|-----------|
| Critical | 3 | Silent file rejection, mutation pending states, silent delete failure |
| Major | 4 | Touch targets, file parse feedback, toggle feedback, parse warnings |
| Minor | 9 | Terminology, validation, affordances, consistency polish |

**Overall assessment:** Strong foundational UX — empty states, error boundaries, navigation, and visual hierarchy are all solid. Critical issues are concentrated in async operation feedback (mutations fire without visual state) and one silent failure (file format rejection). Touch targets need a mobile pass. These are all fixable without architectural changes.
