# UI Requirements — Coffee Roast Tracker

## App Overview

Web app for tracking, analyzing, and sharing home coffee roasts. Users import Kaffelogic `.klog`/`.kpro` files, annotate batches, and compare roast phases across beans over time.

## Auth Model

- **Public reads, private writes.** Read endpoints (`getBean`, `getAllBeans`, `getRoast`, `getUserRoasts`) work without auth. Write endpoints (`addBean`, `updateBean`, `addRoast`, `updateRoast`, `deleteRoast`, etc.) require authentication.
- Auth via Clerk (JWT in Apollo context).
- Roasts are **public by default** but owners can toggle them private. Private roasts show "This roast is private" to non-owners.
- User-level setting: **"Make all roasts private by default"** (boolean, default false). When enabled, newly uploaded roasts are created with `isPublic: false`. Individual roasts can still be toggled public/private from Roast Detail.
- No shareToken mechanism — just use `/roasts/:id` with an `isPublic` boolean (rename from `isShared`).

## Theme

- **"Latte Mode"** (light, default) and **"Black Coffee Mode"** (dark)
- CSS custom properties token swap on `[data-theme="dark"]`
- Persisted: `localStorage` for anonymous users, user settings (server-side) for logged-in users. Synced on login.
- Design direction: "Specialty Craft" — Sora (headings) + JetBrains Mono (mono), coffee-flavor accent colors (berry, caramel, herb), spacious layout

## Temperature Preference

- Sticky toggle in header showing "°F" or "°C", click to toggle
- Same persistence as theme: `localStorage` for anon, user settings for logged-in
- All data stored Celsius; conversion is UI-only

## Global Patterns

- **Save in modals:** Save = close modal on success. Error = toast + modal stays open.
- **Toasts:** Stay visible until the user's next interaction. Used for save confirmations and error feedback on modal actions.
- **Delete:** ALL delete actions require a confirmation dialog.
- **Compare limit:** Max 5 roasts. Checkboxes disabled beyond 5 with inline message.

---

## Pages & Routes

| Route | Page | Auth Required | Notes |
|-------|------|---------------|-------|
| `/` (logged out) | LandingPage | No | Popular beans, community stats, sign-up CTA |
| `/` (logged in) | DashboardPage | Yes | My Roasts — post-login landing |
| `/roasts/:id` | RoastDetailPage | No (public roasts) | Owner sees edit controls; non-owner read-only; private roasts show "private" message |
| `/compare?ids=...` | ComparePage | Yes | Side-by-side roast comparison |
| `/beans` | BeanLibraryPage | No | Logged-out: all beans. Logged-in: My Beans + "Browse Community" button |
| `/beans/:id` | BeanDetailPage | No | Public bean info + roast history; owner sees edit controls |
| `/sign-in/*` | SignInPage | No | Clerk hosted UI |
| `/sign-up/*` | SignUpPage | No | Clerk hosted UI |

No dedicated Settings page — temp and theme toggles live in the header.

---

## Navigation & Layout

### Header (all pages except Landing)

- **Left:** App logo/name
- **Center/Left nav:** Bean Library, My Roasts (auth-only), Upload button (auth-only)
- **Right:** °C/°F toggle, Latte/Black Coffee mode toggle, User avatar with dropdown (logged-in) or Sign In button (logged-out)
- **User avatar dropdown:** "Private by default" toggle + Sign Out
- **Tablet-down:** Collapse right-side items into hamburger menu

### Responsive Strategy

- Build for tablet as primary breakpoint
- Single-column collapse on phone-sized screens
- Chart gets full width on all breakpoints

---

## Page Specifications

### Landing Page (`/`, logged out)

**Purpose:** Window into the community — show actual content, not marketing copy.

**Content:**
- Community stats: total roasts logged, total beans tracked
- Popular beans section: beans with most roasts, showing origin, process, avg rating. Clicking navigates to `/beans/:id`
- Clear sign-up CTA: "Track your own roasts — sign up free" (make it clear you need an account to add/edit beans and roasts, and it's free)

**States:**
- Loading: skeleton placeholders for stats and bean cards
- Empty: unlikely but handle gracefully (e.g., "Be the first to log a roast!")
- Error: inline error message with retry

---

### Dashboard Page (`/`, logged in)

**Purpose:** My Roasts — the user's personal roast log.

**Layout:**
- **Stat chips** above the table: total roasts, avg rating, most-used bean
- **Table** of roasts with columns. Do NOT show roast notes (noisy — star rating is the signal). Columns TBD but include: bean name, roast date, rating (inline editable stars), duration, and more.
- **Checkboxes** on each row for multi-select (convention TBD: left or right side)
- **Action row** above table: search, filters (by bean), sort controls, and a **Compare button** (always visible, disabled with tooltip "Select 2 or more roasts to compare" when <2 selected, disabled with message when 5 selected)

**Features:**
- Searchable, filterable, sortable, paginated
- Inline star rating editing
- Max 5 roasts selectable for comparison; additional checkboxes disabled with message when limit reached

**States:**
- Loading: table skeleton
- Empty: SVG of steaming coffee cup + prompt to upload first roast
- Error: inline error with retry

---

### Roast Detail Page (`/roasts/:id`)

**Purpose:** Full roast display with interactive chart and metadata.

**Public view (non-owner or logged-out):**
- Chart, metrics table, flavor pills (read-only)
- `.kpro` download button (if profile exists)
- Share button (copies URL to clipboard)
- "This roast is private" message if owner has toggled it private

**Owner view (logged-in, own roast):**
- Everything above, plus:
- Inline notes editing
- Inline flavor editing (FlavorPickerModal)
- Star rating editing
- Public/private toggle
- Delete button (with confirmation dialog -> redirects to Dashboard)
- Share button (copies URL)

**"Other roasts of this bean" table** at the bottom:
- Shows the user's other roasts of the same bean
- Selectable via checkboxes for comparison (same max-5 limit)
- Compare button appears when 2+ selected
- This creates a seamless Roast Detail -> Compare flow

---

### Chart Specification (Roast Detail + Compare)

**Data lines (toggleable via visible controls, not buried):**
- Mean Temp (default ON) — cleaner than raw spot temp
- Profile Temp (default ON) — the target roast profile line
- Fan RPM (default ON)
- Power kW (default ON)
- Rate of Rise / RoR (default ON)
- Other lines available but off by default (spot temp, env temp, desired RoR, etc.) — order TBD

**Zone boosts:**
- Rendered as semi-transparent green bands centered on the profile temp line
- Width increases per zone: Zone 1 = narrow, Zone 2 = medium, Zone 3 = wide
- Only rendered when boost value is non-zero (0 = off)
- Boost value shown on hover (label-on-hover to avoid crowding)

**Event markers:**
- Colour Change (DE), First Crack (FC), Roast End
- Smart label positioning to avoid collision when markers are close together

**Grid lines:**
- Visible by default
- Gear icon / settings control to adjust grid scale

**Phase zoom:**
- Click to zoom into Dry, Maillard, or Development phase
- ~10-15 seconds of "breathing room" padding on either side when zoomed

**Overall feel:** Analytical, not artistic.

**Dark mode:** Flagged as potential issue — will need iteration on chart colors/backgrounds.

**Compare page chart:** Same chart but with overlaid curves from multiple roasts, each in a distinct color.

---

### Bean Library Page (`/beans`)

**Purpose:** Browse and manage beans.

**Layout:**
- **Card/Table toggle** — cards for visual browsing (eye candy, organized by recently roasted), table for search/sort/filter
- Card view: bean name, origin, process, flavor pills, roast count, avg rating
- Table view: searchable, sortable, filterable by name, origin, process, variety

**Auth variants:**
- Logged-out: sees all beans (community). No "Add Bean" button.
- Logged-in: sees "My Beans" by default with "Browse Community Beans" button. "Add Bean" button visible.

**States:**
- Loading: card skeletons or table skeleton
- Empty (logged-in, no beans): prompt to add first bean or browse community
- Error: inline with retry

---

### Bean Detail Page (`/beans/:id`)

**Purpose:** View bean details and roast history.

**Layout:**
- Bean details first: name, origin, process, variety, score, supplier, flavor pills (supplier's cupping notes — authoritative, not "suggested")
- Then: recent roasts table (paginated, 10 per page)
  - Logged-in: shows the user's roasts of this bean
  - Logged-out: shows all recent roasts of this bean

**Owner actions (logged-in):**
- Edit bean metadata inline
- "Paste cupping notes" textarea -> parse flavor descriptors -> confirm/edit pills -> save

**Flavor model:**
- Bean flavors = supplier's professional cupping notes (authoritative)
- Roast flavors = user's personal tasting notes (per-roast, stay on the roast, not pulled into bean detail)
- Future enhancement (post-v1): if a bean has 5+ roasts with user-added flavors, show flavors appearing in 60%+ of roasts as "community flavors"

**States:**
- Loading: skeleton
- Bean not found: 404 message
- No roasts: "No roasts logged for this bean yet"
- Error: inline with retry

---

### Compare Page (`/compare?ids=1,2,3`)

**Purpose:** Side-by-side roast comparison.

**Layout:**
- Shared chart with overlaid temperature curves (distinct colors per roast)
- Metrics table below with columns for each roast, including star rating
- Auth-only page

**Flow:**
- User arrives from Dashboard (select roasts -> Compare button) or from Roast Detail ("other roasts of this bean" table)
- Max 5 roasts
- Can compare across different beans (no restriction)

**States:**
- Loading: chart + table skeleton
- Error: inline with retry

---

### Add Bean Modal

**Trigger:** "Add Bean" button on Bean Library page, or inline during Upload flow when no bean match found.

**Fields:**
- Required: name, origin, process
- Optional: variety, supplier, score, notes
- "Paste cupping notes" textarea -> parse flavor descriptors from text using flavor DB as dictionary -> show matched flavors as pills -> user confirms/edits before saving

**Behavior:** Save closes modal on success. Error toast + stay open on failure.

---

### Upload Modal

**Trigger:** "Upload" button in header (auth-only).

**Flow:**
1. Dropzone: drag-and-drop or click to select `.klog` file
2. Preview: parsed roast data + bean matching
   - If bean match found: auto-select
   - If no match: banner prompting user to create a new bean entry (inline bean creation with minimal fields to get a library entry, then banner encourages completing bean details later)
3. Save -> modal closes -> navigate to new Roast Detail page
4. Error -> toast + modal stays open

---

### Flavor Picker Modal

**Trigger:** Editing flavors on Roast Detail page (owner only).

**Features:**
- Multi-category flavor selector grouped by category
- Search/filter within categories
- Custom descriptor creation (add new flavors not in DB)
- Two modes: flavors and off-flavors
- Save closes modal on success

---

### Sign In / Sign Up Pages

- Clerk hosted UI components
- Standard redirect flow
- Public routes, no layout shell

---

### 404 Page

- Proper 404 component (not just `<div>404</div>`)
- Link back to home

---

## User Flows

### Upload a Roast

1. Click "Upload" in header
2. Drop or select `.klog` file in modal dropzone
3. Preview shows parsed data + bean matching
4. If no bean match -> banner + create bean inline
5. Click Save -> modal closes -> land on new Roast Detail page
6. Error -> toast, modal stays open

### Compare Roasts

1. On Dashboard, check 2-5 roast rows
2. Compare button in action row becomes enabled
3. Click Compare -> navigate to `/compare?ids=1,2,3`
4. OR: On Roast Detail, scroll to "other roasts of this bean" table, select roasts, click Compare

### Add a Bean

1. Click "Add Bean" on Bean Library page
2. Fill required fields (name, origin, process)
3. Optionally paste cupping notes -> flavor pills parsed
4. Save -> modal closes -> bean appears in library

### Delete a Roast

1. On Roast Detail, click Delete
2. Confirmation dialog appears
3. Confirm -> roast deleted -> redirect to Dashboard
4. Cancel -> dialog closes, no action

### Browse as Logged-Out User

1. Land on Landing Page -> see popular beans + stats
2. Click a bean -> navigate to Bean Detail (public)
3. Click a roast -> navigate to Roast Detail (public, if not private)
4. Can download `.kpro`, copy share link
5. Cannot: upload, edit, add beans, compare, rate

---

## Open Questions / Future Items

- Chart iteration needed once rendered — marker collision, grid scale UX, dark mode colors
- Community flavor aggregation threshold (post-v1): show roast flavors on bean detail when 5+ roasts, 60%+ frequency
- EspressoShot model scaffolded but unimplemented
- Compare page: can user add/remove roasts from comparison after arriving? (TBD)
- Dashboard column order TBD
- Checkbox position (left vs right) TBD based on UX conventions
