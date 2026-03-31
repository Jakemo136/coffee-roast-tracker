# UI & Features Design Spec

> **Status:** Approved design, ready for implementation planning
> **Date:** 2026-03-30
> **Approach:** Vertical slices — one complete page at a time (schema + GraphQL + UI together)
> **Visual direction:** Specialty Craft (Direction C) — linen-toned backgrounds, espresso header, coffee-flavor accent colors, Sora font

## Table of Contents

1. [Design Tokens](#1-design-tokens)
2. [Data Model Changes](#2-data-model-changes)
3. [GraphQL API Additions](#3-graphql-api-additions)
4. [Dashboard](#4-dashboard)
5. [Roast Detail](#5-roast-detail)
6. [Flavor Picker Modal](#6-flavor-picker-modal)
7. [Upload Modal](#7-upload-modal)
8. [Bean Library](#8-bean-library)
9. [Bean Detail](#9-bean-detail)
10. [Add Bean Modal](#10-add-bean-modal)
11. [Comparison View](#11-comparison-view)
12. [Settings](#12-settings)
13. [Shared Roast View](#13-shared-roast-view)
14. [Responsive Breakpoints](#14-responsive-breakpoints)
15. [Vertical Slice Order](#15-vertical-slice-order)

---

## 1. Design Tokens

Replace the current scaffolded token palette (`client/src/styles/tokens.css`) with the Specialty Craft direction.

### Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-bg` | `#faf7f2` | Linen page background |
| `--color-bg-surface` | `#ffffff` | Card surfaces, table rows |
| `--color-bg-muted` | `#f3f1ed` | Subtle backgrounds, hover states |
| `--color-header` | `#2c1810` | Espresso header bar |
| `--color-text` | `#1a1a1a` | Ink — primary body text |
| `--color-text-secondary` | `#6b6560` | Stone — secondary text |
| `--color-text-muted` | `#9e9790` | Labels, placeholders |
| `--color-text-disabled` | `#c4bfb8` | Empty states, disabled |
| `--color-border` | `#e0dcd6` | Default borders |
| `--color-border-strong` | `#c4bfb8` | Hover borders |
| `--color-action` | `#5a3e2b` | Chocolate — primary buttons, links |
| `--color-action-hover` | `#4a3020` | Darker chocolate for hover |
| `--color-accent-berry` | `#c27a8a` | Floral category pill bg |
| `--color-accent-caramel` | `#c4862a` | Warning states, star ratings |
| `--color-accent-herb` | `#5a7247` | Success states |
| `--color-error` | `#c44a3b` | Errors, off-flavor pills, destructive actions |
| `--color-dev-accent` | `#c44a3b` | Development metric accent border |

### Typography

| Token | Value | Usage |
|-------|-------|-------|
| `--font-heading` | `'Sora', sans-serif` | Headings, UI labels. **Replaces Inter.** |
| `--font-mono` | `'JetBrains Mono', monospace` | Temps, times, numeric data. Retained. |
| `--text-xs` through `--text-3xl` | Same scale as current | Unchanged |

### Spacing, Radii, Shadows

Unchanged from current tokens.

---

## 2. Data Model Changes

### New fields on existing models

**Roast:**
```prisma
rating    Float?    // 1.0–5.0 in 0.5 increments, nullable (unrated)
```

**Bean:**
```prisma
sourceUrl   String?   // Retailer product page URL
elevation   String?   // e.g. "1800-2000m"
bagNotes    String?   // Retailer tasting description (displayed as "Supplier Notes")
```

> Bean already has `name`, `origin`, `process`, `cropYear`. The `name` field stores the full descriptive name including country, varietal, and farm (e.g., "Colombia China Alta Jose Buitrago").

### New models

```prisma
model FlavorDescriptor {
  id          String        @id @default(cuid())
  name        String        @unique
  category    FlavorCategory
  isOffFlavor Boolean       @default(false)
  isCustom    Boolean       @default(false)
  color       String        // Hex color, inherited from category
  roasts      RoastFlavor[]
  createdAt   DateTime      @default(now())
}

model RoastFlavor {
  roast        Roast           @relation(fields: [roastId], references: [id], onDelete: Cascade)
  roastId      String
  descriptor   FlavorDescriptor @relation(fields: [descriptorId], references: [id])
  descriptorId String
  createdAt    DateTime        @default(now())

  @@id([roastId, descriptorId])
  @@index([roastId])
  @@index([descriptorId])
}
```

### New enum

```prisma
enum FlavorCategory {
  FLORAL
  HONEY
  SUGARS
  CARAMEL
  FRUITS
  CITRUS
  BERRY
  COCOA
  NUTS
  RUSTIC
  SPICE
  BODY
  OFF_FLAVOR
}
```

### Flavor category colors

These map 1:1 from the Sweet Maria's flavor descriptor palette:

| Category | Hex | Pill BG (15% opacity) |
|----------|-----|-----------------------|
| FLORAL | `#c27a8a` | `rgba(194,122,138,0.15)` |
| HONEY | `#c9a84c` | `rgba(201,168,76,0.15)` |
| SUGARS | `#bda67a` | `rgba(189,166,122,0.15)` |
| CARAMEL | `#a88545` | `rgba(168,133,69,0.15)` |
| FRUITS | `#d45f5f` | `rgba(212,95,95,0.15)` |
| CITRUS | `#b8b44f` | `rgba(184,180,79,0.15)` |
| BERRY | `#7a4a6e` | `rgba(122,74,110,0.15)` |
| COCOA | `#8b5e4b` | `rgba(139,94,75,0.15)` |
| NUTS | `#8a7a4a` | `rgba(138,122,74,0.15)` |
| RUSTIC | `#6b6b4a` | `rgba(107,107,74,0.15)` |
| SPICE | `#a07050` | `rgba(160,112,80,0.15)` |
| BODY | `#5a4a3a` | `rgba(90,74,58,0.15)` |
| OFF_FLAVOR | `#c44a3b` | `rgba(196,74,59,0.12)` |

Off-flavor pills additionally get `border: 1px dashed rgba(196,74,59,0.3)` to visually distinguish them.

### Seed data

~45 SCA-curated flavor descriptors distributed across the 12 positive categories (3–5 per category), plus ~15 common off-flavor descriptors in the `OFF_FLAVOR` category:

**Off-flavors to seed:** thin, sour, astringent, crabapple, pithy, flat, roasty/burnt, baked, cranberry, grassy, rubbery, musty, papery, acrid, ashy.

The full list of positive descriptors should be curated from the SCA flavor wheel — representative but not exhaustive. Users can add custom descriptors.

---

## 3. GraphQL API Additions

### Queries

```graphql
# Fetch the flavor descriptor library
flavorDescriptors(isOffFlavor: Boolean): [FlavorDescriptor!]!

# Scrape a Sweet Maria's product page (v1: Sweet Maria's only)
# Returns a preview — does NOT save. User reviews then saves via createBean.
scrapeBeanUrl(url: String!): BeanScrapeResult!
```

### Mutations

```graphql
# Add a custom descriptor to the library
createFlavorDescriptor(name: String!, category: FlavorCategory!): FlavorDescriptor!

# Replace all flavors for a roast (idempotent set operation)
setRoastFlavors(roastId: String!, descriptorIds: [String!]!): Roast!

# Replace all off-flavors for a roast
setRoastOffFlavors(roastId: String!, descriptorIds: [String!]!): Roast!
```

### Updated types

```graphql
type Roast {
  # ... existing fields ...
  rating: Float
  flavors: [FlavorDescriptor!]!      # positive flavors only
  offFlavors: [FlavorDescriptor!]!   # off-flavors only
}

type Bean {
  # ... existing fields ...
  sourceUrl: String
  elevation: String
  bagNotes: String
}

type FlavorDescriptor {
  id: String!
  name: String!
  category: FlavorCategory!
  isOffFlavor: Boolean!
  isCustom: Boolean!
  color: String!
}

type BeanScrapeResult {
  name: String
  origin: String
  process: String
  elevation: String
  bagNotes: String
  suggestedFlavors: [String!]   # flavor names, not IDs
}
```

### Updated mutations

`updateRoast` input gains an optional `rating: Float` field. All existing mutations unchanged.

---

## 4. Dashboard

The main screen. A table of the user's roasts, most recent first.

### Layout

**Desktop columns (7):** Bean | Date | Notes | Flavors | Dev Time | Dev ΔT | Rating

**Mobile columns (6):** Bean | Date | Notes & Flavors (combined) | Dev Time | Dev ΔT | Rating

Each row is a floating white card with `border-radius: 8px`, subtle shadow, and hover border highlight. Rows are clickable — navigate to Roast Detail.

### Bean column

- **Line 1:** Full bean name in semibold (e.g., "Colombia China Alta Jose Buitrago"). Wraps if long.
- **Line 2:** Short name in muted italic (e.g., *CCAJ*). This is the user's abbreviation from `UserBean.shortName`.

No retailer/source shown (v1 is Sweet Maria's only, so it's noise).

### Notes column (desktop)

Free-text roast notes. Plain text, truncated with ellipsis if too long.

### Flavors column (desktop)

Colored pill buttons for flavor descriptors assigned to that roast:
- Each pill: colored dot (category color) + descriptor name, tinted category-color background
- Off-flavor pills: red with dashed border
- Overflow: show first 3 pills + "+N more" chip if > 3
- Empty state: no content (blank, not "no flavors tagged")
- Hover on pill: shows full descriptor name (for truncated pills)

### Notes & Flavors column (mobile)

Notes text on top, flavor pills wrap below. Single column replaces both Notes and Flavors.

### Rating column

- Displays 0–5 stars with half-star support using `★`, `½`, `☆` glyphs
- **Clickable inline** — hover shows half-star targets, click saves immediately via `updateRoast` mutation
- Unrated roasts show empty stars in disabled color (`#d4d0cc`)
- Star color: `--color-accent-caramel` (`#c4862a`)

### Header bar

- Espresso background (`#2c1810`)
- Logo/wordmark left, nav links center (Dashboard [active], Beans, Compare, Settings), Upload button + user avatar right
- Active nav: underline in caramel
- Upload button: chocolate background (`#5a3e2b`), opens Upload Modal

### Toolbar

- Page title "My Roasts" with roast/bean count subtitle
- Search input (filters bean name + notes)
- Bean dropdown filter
- Sort: click column headers, default Date descending

### Multi-select for comparison

- Checkbox appears on row hover at left edge
- Select 2+ rows → floating action bar slides up from bottom: "Compare N roasts" button
- Clicking navigates to Comparison View with selected roast IDs

### Empty state

Friendly message: "No roasts yet" with prominent Upload CTA button.

---

## 5. Roast Detail

Full view of a single roast. Accessed by clicking a dashboard row.

### Layout

**Desktop:** 50/50 horizontal split.
- **Left half:** Roast curve chart (fills the entire half)
- **Right half:** Title/rating, metrics table, flavors, off-flavors, notes

**Mobile:** Vertical stack — title → chart (compact) → metrics (2-col grid) → flavors → notes.

**Breakpoint:** 768px.

### Top bar (full width)

- "← My Roasts" back link (left)
- Action buttons (right): Share, Download .kpro, Delete (red, destructive)

### Left half — Roast Curve Chart

Chart.js + react-chartjs-2 with annotation and zoom plugins.

**Curve toggle buttons** (top-left toolbar):
- Bean Temp (on by default), Env Temp, RoR, Fan Speed, Power, Zones
- Toggle on/off independently. Active = filled button, inactive = outline
- "Zones" toggle shows subtle colored background bands for Drying / Maillard / Development phases

**Phase zoom** (top-right toolbar, segmented control):
- Full | Dry | Maill. | Dev
- Zooms x-axis to the selected phase time window
- Uses `chart.zoomScale()` with phase boundary times from the Roast model (`colourChangeTime`, `firstCrackTime`, `roastEndTime`)
- "Dev" is the expected common use — jumps to FC→END for development analysis

**Event markers:** Vertical dashed lines at Colour Change, First Crack, and Roast End, each labeled with temp and time.

**Hover:** Crosshair showing time + temp at cursor position.

### Right half — Header

- Bean full name (h2, bold)
- Short name (italic muted) + "View listing →" link (if `bean.sourceUrl` exists)
- Star rating (clickable, same as dashboard inline rating)

### Right half — Metrics Table

Clean label/value table in a white card. Right-aligned monospace values. Secondary values inline to the LEFT of primary values in muted text to preserve right-alignment.

| Label | Secondary (left, muted) | Primary (right, mono bold) |
|-------|------------------------|---------------------------|
| Total Duration | | 10:24 |
| Dry End | 169°C | 5:18 |
| FC Time | | 8:42 |
| FC Temp | | 198°C |
| Dev Time | 16.3% | 1:42 |
| Dev ΔT | | 38°C |
| End Temp | | 207°C |

Dev Time and Dev ΔT rows have:
- Subtle red background tint (`rgba(196,74,59,0.03)`)
- Left border accent: 3px solid `#c44a3b`

### Right half — Flavors section

White card with "Flavors" header + "+ Edit" button.
- Displays assigned flavor pills (same pill component as dashboard)
- "+ Edit" opens the Flavor Picker Modal (see §6)

### Right half — Off-Flavors section

Same layout as Flavors. Red-themed pills with dashed border.
- Empty state: "None detected 🎉" in muted italic
- "+ Edit" opens the Flavor Picker Modal filtered to off-flavors

### Right half — Notes section

White card with "Notes" header + "Edit" button.
- Read mode: plain text paragraph
- Edit mode: textarea, saves on blur or explicit save button via `updateRoast`

### Mobile layout

- Title + rating at top
- Chart full-width, compact height (~140px)
- Chart toggles collapse to abbreviated labels (BT, ET, RoR). Phase zoom shows only Full + Dev.
- Metrics as 2-column grid of small cards. Development card spans full width with red accent.
- Flavors, off-flavors, notes stack below.

---

## 6. Flavor Picker Modal

Shared component used for both flavors and off-flavors. Opened from Roast Detail "Edit" buttons.

### Structure

1. **Header:** "Edit Flavors" or "Edit Off-Flavors" + close button
2. **Search bar:** type-to-filter across all categories. Typing a name that doesn't exist shows "Add [name] as custom descriptor" option.
3. **Selected section** (pinned at top, tinted background): shows currently selected pills with ✕ to deselect. Count in header: "Selected (3)".
4. **Category groups** (scrollable): each category gets a header (emoji + category name in category color), then a row of toggle pills.
   - Selected pills: stronger background (25% opacity), checkmark, bold text
   - Unselected pills: light background (8% opacity), normal text
   - Click toggles selection
5. **Footer:** Cancel + Save buttons. Save calls `setRoastFlavors` or `setRoastOffFlavors`.

### Flavor mode vs Off-flavor mode

- Flavor mode: shows all 12 positive categories
- Off-flavor mode: shows only the `OFF_FLAVOR` category, all pills in red

### Adding custom descriptors

When search text doesn't match any existing descriptor, show: "Add '[text]' to [category]" with a category dropdown. Calls `createFlavorDescriptor`, then auto-selects the new descriptor.

---

## 7. Upload Modal

Quick-upload modal triggered from the Dashboard "Upload" button.

### Step 1 — Drop zone

- Modal with header "Upload Roast Log"
- Dashed-border drop zone: "Drop your .klog file here" + "or browse files" link
- Accepts `.klog` files only (v1)

### Step 2 — Preview & Confirm

After file is parsed via `previewRoastLog`:

- **File info bar:** filename, size, "Parsed successfully ✓" or error
- **Extracted metadata grid:** Bean Match (with short name), Roast Date, Duration, End Temp
- **Parse warnings:** yellow bar if `parseWarnings` exist (e.g., "Ambient temp not recorded")
- **Notes textarea:** optional, pre-populated empty
- **Actions:** Cancel / Save Roast

"Save Roast" calls `uploadRoastLog`. On success, modal closes and dashboard refetches (Apollo cache update).

---

## 8. Bean Library

Card grid of the user's beans. Route: `/beans`.

### Layout

3-column grid (desktop), 2-column (tablet), 1-column (mobile).

"+ Add Bean" button top-right → opens Add Bean Modal (see §10).

### Bean card contents

1. **Full bean name** (semibold, wraps if long): country + varietal + farm
2. **Short name** (italic muted): user's abbreviation
3. **Process + Elevation** (if available): e.g., "Washed · 1800-2000m"
4. **Flavor pills** (positive only): aggregated most common flavors across all roasts of that bean. Max 3-4 pills, overflow as "+N".
5. **Footer:** roast count + average rating (star + number)

No retailer/source shown on cards.

Empty state for "No details yet" (no process/elevation scraped).
Empty state for "No roasts yet" (bean added but not yet roasted).

Card click → navigates to Bean Detail page.

---

## 9. Bean Detail

Full page for a single bean. Route: `/beans/:id`.

### Header

- "← My Beans" back link
- Full bean name (h2)
- Short name (italic muted) + "View listing →" link (opens `bean.sourceUrl` in new tab)
- "Edit" button → inline edit of bean metadata

### Metadata cards (4-column grid)

Origin | Process | Elevation | Avg Rating

### Flavors section

White card labeled "Flavors" — aggregated positive flavor pills from all roasts of this bean. Read-only (not editable here; edit on individual roasts).

**Aggregation logic:** collect all positive FlavorDescriptors across all roasts for this bean, count frequency, display the top N (most commonly tagged) as pills. This is a client-side derivation from the roast data already loaded for the roast table — no separate query needed.

### Supplier Notes section

White card labeled "Supplier Notes (from Sweet Maria's)" — scraped `bean.bagNotes`. Read-only.

### Your Notes section

White card labeled "Your Notes" — editable. Stored on `UserBean.notes`. Edit button toggles textarea.

### Roast table

Same layout as the main Dashboard roast table, minus the Bean column:

**Desktop columns (6):** Date | Notes | Flavors | Dev Time | Dev ΔT | Rating

**Mobile columns (5):** Date | Notes & Flavors | Dev Time | Dev ΔT | Rating

- Floating card rows, same styling as dashboard
- Row click → Roast Detail
- Off-flavors shown in Flavors column (dashed red pills), same as dashboard
- "Compare all" button in table header → navigates to Comparison View with all roasts for this bean

---

## 10. Add Bean Modal

Triggered from Bean Library "Add Bean" button.

### Unified form (URL fetch + manual entry coexist)

Single form with URL input at the top and manual fields below. No mode switch — fetch populates the same fields the user would fill manually.

**URL input section (top):**
- URL text input + "Fetch" button
- Hint text below: "Paste a supplier URL to auto-fill bean details. Fetching may take a moment."
- Calls `scrapeBeanUrl(url)` → returns `BeanScrapeResult`
- v1: Sweet Maria's only

**Divider:** "— or enter details manually —"

**Form fields (always visible):**
- Bean Name (required)
- Short Name (required) — helper: "Used for .klog matching & display"
- Origin, Process, Elevation (3-column row)
- Supplier Notes (textarea) — placeholder: "Paste or type tasting notes from the bag or listing"
- Flavors — "+ Add flavors" button opens flavor picker; hint: "Tag expected flavor notes for this bean"

### Fetch states

**Loading:** Spinner + "Fetching bean details from Sweet Maria's…" in amber status bar. Fields stay unlocked — user can start typing while waiting.

**Success:** Green checkmark + "Bean details fetched successfully — review and edit below". Auto-filled fields get a subtle green-tinted border to indicate "review me." All fields remain editable.

**Populated fields after fetch:**
- Bean Name, Origin, Process, Elevation auto-filled
- Short Name left blank (always user-entered)
- Supplier Notes textarea pre-filled (editable), hint: "Auto-filled from listing — edit as needed"
- Fetch button changes to "Refetch"

**Error:** Red status: "Couldn't get bean details from that URL. Enter them below." Retry button. Form stays fully usable.

### Suggested flavors

If `BeanScrapeResult.suggestedFlavors` returns matches against existing FlavorDescriptors, show a "Suggested Flavors" section below the form fields:
- Matched flavors shown as pre-selected pills (checkmark + stronger background)
- Unmatched scrape terms shown as unselected pills
- User can toggle any pill on/off
- Hint: "Click to select or deselect. Selected flavors will be tagged on future roasts of this bean as suggestions."
- Badge: "from supplier" next to section label

### Short Name field

- Required field, always left blank (never auto-generated)
- Helper text: "Used for .klog matching & display"
- This is what appears as the muted italic text everywhere the bean is shown

### Save Bean button

- Disabled until Bean Name and Short Name are both filled
- Calls `createBean` + `addBeanToLibrary`

### After save

- Modal closes
- Success toast slides up: "[Bean Name] added to your library" with "View bean →" link to the new bean detail page
- Toast auto-dismisses after ~4 seconds

### Mockup

Visual mockup (5 states): `add-bean-modal-v1.html` in the brainstorm content directory.

---

## 11. Comparison View

Side-by-side roast comparison. Route: `/compare`. Accessed via:
- Multi-select on Dashboard → "Compare selected"
- "Compare all" on Bean Detail

### Layout

1. **Header:** "Compare Roasts" + "+ Add roast" button (to add more roasts to the comparison)
2. **Legend:** color-coded roast identifiers (date + bean short name), each with a unique color from the accent palette
3. **Overlaid roast curves:** all selected roasts on one Chart.js canvas, each curve a different color matching the legend
4. **Comparison metrics table:**

| Metric | Roast 1 | Roast 2 | Roast 3 |
|--------|---------|---------|---------|
| Bean | | | |
| Duration | | | |
| Dev Time | | | |
| DTR% | | | |
| FC Temp | | | |
| End Temp | | | |
| Dev ΔT | | | |
| Rating | | | |

Column headers colored to match the legend. Values in monospace. Supports 2–4 roasts.

---

## 12. Settings

Minimal for v1. Route: `/settings`.

### Temperature Unit toggle

Segmented control: °C (default) | °F. Calls `updateTempUnit` mutation. Affects all temperature displays app-wide (client-side conversion only — all data stored in Celsius).

---

## 13. Shared Roast View

Public read-only view. Route: `/share/:token`. No auth required.

### Differences from authenticated Roast Detail

- No app header/nav — standalone page with minimal branding (small wordmark)
- No edit buttons, no rating interaction, no delete
- Shows: chart (with toggles/zoom), metrics table, flavors (read-only pills), notes
- "Download .kpro" button if profile exists
- Bottom CTA: "Roast Tracker" wordmark + "Track your own roasts →" link to sign-up

Validates `isShared: true` via `roastByShareToken` query before rendering.

---

## 14. Responsive Breakpoints

| Breakpoint | Layout changes |
|------------|---------------|
| ≥ 1024px | Full desktop: 7-col dashboard, 50/50 roast detail, 3-col bean grid |
| 768–1023px | Tablet: 7-col dashboard (tighter), 50/50 roast detail, 2-col bean grid |
| < 768px | Mobile: 6-col dashboard (Notes & Flavors combined), roast detail stacks vertically, 1-col bean grid |

---

## 15. Vertical Slice Order

Each slice delivers schema changes + GraphQL operations + UI components + tests as one unit.

| # | Slice | Schema changes | Key components |
|---|-------|---------------|----------------|
| 1 | **Design tokens + App shell** | None | Update `tokens.css`, add Sora font, update `AppLayout` header/nav styling, wire `ProtectedRoute` on auth-required routes |
| 2 | **Dashboard + Flavor schema** | `rating` on Roast, FlavorDescriptor, RoastFlavor, FlavorCategory enum | RoastTable, RoastRow, StarRating, FlavorPill, seed flavor descriptors |
| 3 | **Roast Detail** | None (uses rating + flavors from #2) | RoastChart, MetricsTable, NotesEditor, phase zoom |
| 4 | **Flavor Picker Modal** | None (uses schema from #2) | FlavorPickerModal, setRoastFlavors/setRoastOffFlavors mutations, createFlavorDescriptor |
| 5 | **Upload Modal** | None | UploadModal, drop zone, preview card |
| 6 | **Bean Library + Detail** | `sourceUrl`, `elevation`, `bagNotes` on Bean | BeanCard, BeanDetail, bean flavor aggregation |
| 7 | **Bean scraping** | None (uses fields from #6) | scrapeBeanUrl query, Add Bean Modal with URL fetch |
| 8 | **Comparison View** | None | CompareChart (overlaid curves), CompareTable |
| 9 | **Settings + Shared View** | None | TempUnitToggle, SharedRoastView |

### Shared components (emerge naturally)

These will be built as part of the first slice that needs them, then reused:
- `StarRating` — built in slice 2 (Dashboard), reused in 3, 8, 9
- `FlavorPill` — built in slice 2 (Dashboard), reused in 3, 4, 6, 8, 9
- `Modal` — built in slice 4 (Flavor system), reused in 5, 7

---

## Mockups

Visual mockups from the design session are preserved in:
```
.superpowers/brainstorm/29780-1774902984/content/
```

Key files:
- `dashboard-columns-v2.html` — Dashboard with separate Flavors column + Sweet Maria's color palette
- `roast-detail-v3.html` — 50/50 split layout (desktop + mobile)
- `metrics-table-final.html` — Metrics table with secondary values left-aligned
- `bean-page-v4.html` — Bean library cards + detail page with flavor pills
- `design-sections-2-through-7.html` — Flavor modal, upload modal, comparison view, settings

To view: run the brainstorm server with `--project-dir` pointing to the project root.

---

## Next Step

Invoke the `writing-plans` skill to create a detailed implementation plan from this spec.
