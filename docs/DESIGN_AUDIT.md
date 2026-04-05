# Design & Accessibility Audit

**Date:** 2026-04-04  
**Branch:** `feat/client-rebuild`  
**Standard:** WCAG 2.2 AA  
**Breakpoints tested:** 375px, 768px, 1280px, 1440px  
**Axe-core result:** 0 violations across all 4 auditable routes  
**RTL tests:** 265/265 passing after fixes

---

## Critical (fix before merge)

### C1. ~~Sign In link contrast — all pages~~ FIXED
- **Ratio:** 1.73:1 → **12.7:1** (now uses `--color-text-inverse`)
- **File:** `client/src/components/styles/UserButton.module.css:85`

### C2. ~~Chart toggle button contrast — roast detail~~ FIXED
- All button colors darkened to pass 4.5:1
- Fan RPM `#0d7a54`, Power kW `#8a5a00`, RoR `#dc2626`, Spot Temp `#6d28d9`, Desired RoR `#be185d`
- **File:** `client/src/features/roast-detail/RoastChart.tsx:43-51`

### C3. ~~Empty state text contrast~~ FIXED
- Changed from `--color-text-muted` (#9e9790) to `--color-text-secondary` (#6b6560)
- **Files:** `RoastDetailPage.module.css:178`, `BeanDetailPage.module.css:174`

### C4. ~~Chart canvas missing alt text~~ FIXED
- Added `aria-label="Roast profile chart showing temperature and rate of rise over time"`
- **File:** `client/src/features/roast-detail/RoastChart.tsx:472`

### C5. ~~StarRating aria-prohibited-attr~~ FIXED
- Added `role="img"` for non-interactive mode, `role="radiogroup"` for interactive
- **File:** `client/src/components/StarRating.tsx:100-104`

---

## Major (fix in same sprint)

### M1. ~~No `prefers-reduced-motion` support~~ FIXED
- Added global `@media (prefers-reduced-motion: reduce)` rule in `reset.css`
- Disables all animations and transitions when user prefers reduced motion

### M2. ~~Sign In link missing `:focus-visible`~~ FIXED
- Added `:focus-visible` and `:active` states
- **File:** `client/src/components/styles/UserButton.module.css:93-103`

### M3. ~~UploadModal textarea focus removes outline~~ FIXED
- Replaced `outline: none` with `outline: 2px solid var(--color-border-focus)`
- **File:** `client/src/components/styles/UploadModal.module.css:145`

### M4. ~~Missing `:active` states on toggle buttons~~ FIXED
- Added `:active` pseudo-class to all toggle buttons
- **Files:** `BeanLibraryPage.module.css`, `RoastDetailPage.module.css`, `RoastChart.module.css`

---

## Minor (fix when touching the component)

### m1. Magic number padding in UploadModal
- `.btn { padding: 8px 18px }` — should use spacing tokens
- **File:** `client/src/components/styles/UploadModal.module.css:151`

### m2. FlavorPill icon hardcoded font-size
- `.remove { font-size: 10px }` — nearest token `--text-xs: 0.75rem`
- **File:** `client/src/components/styles/FlavorPill.module.css:38`

### m3. SkeletonLoader magic heights
- `.card { height: 120px }`, `.circle { width/height: 48px }`
- **File:** `client/src/components/styles/SkeletonLoader.module.css:35,45-46`

### m4. ComparePage legend dot hardcoded size
- `.legendDot { width: 10px; height: 10px }`
- **File:** `client/src/features/compare/ComparePage.module.css:40-41`

### m5. BeanLibraryPage search max-width
- `.searchInput { max-width: 320px }` — not from tokens
- **File:** `client/src/features/beans/BeanLibraryPage.module.css:117`

### m6. Modal close button missing `:active` state
- **File:** `client/src/components/styles/Modal.module.css:52-54`

### m7. Pagination button heights use raw rem
- `.pageButton { min-width: 2rem; height: 2rem }`
- **File:** `client/src/components/styles/Pagination.module.css:56-59`

---

## Screenshots

All screenshots at 4 breakpoints (375/768/1280/1440px):

| Route | Mobile | Tablet | Desktop | LG Desktop |
|-------|--------|--------|---------|------------|
| Landing | `screenshots/landing/mobile.png` | `screenshots/landing/tablet.png` | `screenshots/landing/desktop.png` | `screenshots/landing/lgDesktop.png` |
| Bean Library | `screenshots/bean-library/mobile.png` | `screenshots/bean-library/tablet.png` | `screenshots/bean-library/desktop.png` | `screenshots/bean-library/lgDesktop.png` |
| Bean Detail | `screenshots/bean-detail/mobile.png` | `screenshots/bean-detail/tablet.png` | `screenshots/bean-detail/desktop.png` | `screenshots/bean-detail/lgDesktop.png` |
| Roast Detail | `screenshots/roast-detail/mobile.png` | `screenshots/roast-detail/tablet.png` | `screenshots/roast-detail/desktop.png` | `screenshots/roast-detail/lgDesktop.png` |
| Sign In | `screenshots/sign-in/mobile.png` | `screenshots/sign-in/tablet.png` | `screenshots/sign-in/desktop.png` | `screenshots/sign-in/lgDesktop.png` |
| Sign Up | `screenshots/sign-up/mobile.png` | `screenshots/sign-up/tablet.png` | `screenshots/sign-up/desktop.png` | `screenshots/sign-up/lgDesktop.png` |

**Note:** Sign-in/sign-up show Clerk provider errors in headless mode — these pages render correctly in the browser with Clerk loaded.

---

## Passes

- **Semantic landmarks** — `<nav>`, `<header>`, `<main>` in AppLayout
- **Modal focus management** — Tab/Shift+Tab cycling with proper boundaries
- **ARIA on modals** — `role="dialog"`, `aria-modal="true"`, `aria-label`
- **Form inputs** — all properly labeled via `<label>` or `aria-label`
- **Global focus indicator** — `:focus-visible` with 2px outline + offset
- **Error handling** — `role="alert"` on error states
- **Pagination** — `<nav>` with `aria-label="Pagination"`, `aria-current="page"`
- **Star rating interactive** — `role="radiogroup"` + individual `role="radio"`
- **Combobox** — correct `aria-expanded`, `aria-controls`, `aria-activedescendant`
- **Color tokens** — comprehensive palette with light/dark mode
- **Disabled states** — proper styling and `cursor: not-allowed`
- **Responsive layout** — content adapts across all 4 breakpoints (visual review)
- **17-20 axe-core rules passing** per route (no structural violations)
