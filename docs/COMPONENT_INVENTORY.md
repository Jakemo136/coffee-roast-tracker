# COMPONENT_INVENTORY.md

> Component inventory for Coffee Roast Tracker frontend rebuild.
> Generated from UI requirements interview 2026-04-03.

---

## Layout & Shell

---

## AppLayout
- Page: shared (wraps all routes except Landing, SignIn, SignUp)
- Dependencies: Header, Toast system
- GraphQL: none
- Complexity: medium
- Build status: [x] built

Notes: Provides Outlet for nested routes. Includes header with nav, temp toggle, theme toggle, user controls.

## Header
- Page: shared (inside AppLayout)
- Dependencies: TempToggle, ThemeToggle, UserButton, UploadModal
- GraphQL: none
- Complexity: medium
- Build status: [x] built

Notes: Left: logo + nav (Bean Library, My Roasts [auth], Upload [auth]). Right: °C/°F toggle, theme toggle, avatar/sign-in. Hamburger on tablet-down.

## ProtectedRoute
- Page: shared (route wrapper)
- Dependencies: none (uses Clerk hooks)
- GraphQL: none
- Complexity: low
- Build status: [x] built

Notes: Wraps routes requiring auth. Redirects to sign-in if not authenticated. MUST actually be wired into routing this time.

---

## Shared UI Components

---

## Modal
- Page: shared
- Dependencies: none
- GraphQL: none
- Complexity: low
- Build status: [x] built

Notes: Portal-based, backdrop click to close, close button, footer slot. Save = close on success pattern.

## StarRating
- Page: shared
- Dependencies: none
- GraphQL: none
- Complexity: low
- Build status: [x] built

Notes: 5-star with half-star support, interactive and read-only modes, accessible.

## FlavorPill
- Page: shared
- Dependencies: none
- GraphQL: none
- Complexity: low
- Build status: [x] built

Notes: Colored pill badge. Supports regular and off-flavor variants.

## Combobox
- Page: shared
- Dependencies: none
- GraphQL: none
- Complexity: medium
- Build status: [x] built

Notes: Searchable dropdown with click-outside detection. Accessible.

## Toast
- Page: shared
- Dependencies: none
- GraphQL: none
- Complexity: low
- Build status: [x] built

Notes: Stays visible until user's next interaction. Used for save confirmations and error feedback.

## ConfirmDialog
- Page: shared
- Dependencies: Modal
- GraphQL: none
- Complexity: low
- Build status: [x] built

Notes: Reusable confirmation dialog for all delete actions and other destructive operations.

## Pagination
- Page: shared
- Dependencies: none
- GraphQL: none
- Complexity: low
- Build status: [x] built

Notes: Reusable pagination controls for tables (Dashboard, Bean Detail roasts).

## EmptyState
- Page: shared
- Dependencies: none
- GraphQL: none
- Complexity: low
- Build status: [x] built

Notes: Configurable empty state component. Accepts icon/SVG, message, and optional CTA.

## ErrorState
- Page: shared
- Dependencies: none
- GraphQL: none
- Complexity: low
- Build status: [x] built

Notes: Inline error display with retry button. Used across all data-fetching pages.

## SkeletonLoader
- Page: shared
- Dependencies: none
- GraphQL: none
- Complexity: low
- Build status: [x] built

Notes: Loading placeholders for cards, tables, and content areas.

---

## Landing Page

---

## LandingPage
- Page: Landing (`/`, logged out)
- Dependencies: BeanCard, EmptyState, ErrorState, SkeletonLoader
- GraphQL: publicBeans (new query), communityStats (new query)
- Complexity: medium
- Build status: [x] built

Notes: Popular beans section, community stats (total roasts, total beans), sign-up CTA. Clicking a bean navigates to BeanDetailPage.

---

## Dashboard

---

## DashboardPage
- Page: Dashboard (`/`, logged in)
- Dependencies: StatChips, RoastsTable, EmptyState, ErrorState, SkeletonLoader
- GraphQL: MY_ROASTS_QUERY (paginated), dashboard stats query
- Complexity: high
- Build status: [x] built

Notes: Stat chips + roast table. Search, filter, sort, paginate. Inline rating. Multi-select with compare.

## StatChips
- Page: Dashboard
- Dependencies: none
- GraphQL: none (data passed from parent)
- Complexity: low
- Build status: [x] built

Notes: Displays total roasts, avg rating, most-used bean above the table.

## RoastsTable
- Page: Dashboard (also used on BeanDetailPage and RoastDetailPage)
- Dependencies: StarRating, Pagination, Combobox
- GraphQL: none (data passed from parent)
- Complexity: high
- Build status: [x] built

Notes: Reusable table with search/filter/sort/pagination. Checkboxes for multi-select (max 5). Compare button always visible (disabled when <2 selected, tooltip). Inline star rating.

---

## Roast Detail

---

## RoastDetailPage
- Page: RoastDetail (`/roasts/:id`)
- Dependencies: RoastChart, MetricsTable, FlavorPill, FlavorPickerModal, StarRating, RoastsTable, ConfirmDialog, ErrorState, SkeletonLoader, Toast
- GraphQL: ROAST_BY_ID_QUERY, UPDATE_ROAST_MUTATION, UPDATE_ROAST_RATING, DELETE_ROAST_MUTATION, TOGGLE_ROAST_SHARING (rename from sharing mutation), SET_ROAST_FLAVORS, SET_ROAST_OFF_FLAVORS
- Complexity: high
- Build status: [x] built

Notes: Full roast display. Public: read-only chart+metrics+flavors+download+share. Owner: inline editing of notes/flavors/rating, public/private toggle, delete. "Other roasts of this bean" table at bottom with compare flow. Private roasts show "This roast is private" to non-owners.

## RoastChart
- Page: RoastDetail, ComparePage
- Dependencies: none (Chart.js)
- GraphQL: none (data passed from parent)
- Complexity: high
- Build status: [x] built

Notes: Chart.js line chart. Default visible: Mean Temp, Profile Temp, Fan, Power, RoR. Zone boosts as semi-transparent green bands centered on profile line (width: zone1<zone2<zone3, only when boost!=0, value on hover). Event markers (DE, FC, Roast End) with smart collision avoidance. Grid lines with configurable scale (gear icon). Phase zoom (Dry/Maillard/Dev) with 10-15s padding. Analytical feel. Dark mode needs iteration.

## MetricsTable
- Page: RoastDetail, ComparePage
- Dependencies: none
- GraphQL: none (data passed from parent)
- Complexity: low
- Build status: [x] built

Notes: Fixed-format metrics display: duration, FC time, dev time, DTR%, temps at markers. On Compare page includes star rating column.

---

## Beans

---

## BeanLibraryPage
- Page: BeanLibrary (`/beans`)
- Dependencies: BeanCard, RoastsTable (table view), EmptyState, ErrorState, SkeletonLoader
- GraphQL: MY_BEANS_QUERY (logged-in), publicBeans query (logged-out or community browse)
- Complexity: high
- Build status: [x] built

Notes: Card/table toggle view. Cards: visual browsing by recently roasted. Table: search/sort/filter by name, origin, process, variety. Logged-out: all beans, no Add button. Logged-in: My Beans default + "Browse Community" button. Add Bean button (auth-only).

## BeanCard
- Page: BeanLibrary, LandingPage
- Dependencies: FlavorPill, StarRating
- GraphQL: none (data passed from parent)
- Complexity: low
- Build status: [x] built

Notes: Card showing bean name, origin, process, flavor pills, roast count, avg rating. Clickable -> navigates to BeanDetailPage.

## BeanDetailPage
- Page: BeanDetail (`/beans/:id`)
- Dependencies: FlavorPill, RoastsTable, FlavorPickerModal (for cupping notes), ErrorState, SkeletonLoader, Toast
- GraphQL: bean query (by ID), ROASTS_BY_BEAN_QUERY (paginated, 10/page), UPDATE_BEAN, UPDATE_BEAN_SUGGESTED_FLAVORS (rename -- no longer "suggested")
- Complexity: high
- Build status: [x] built

Notes: Bean details + roast history. Owner: inline edit of metadata, "paste cupping notes" textarea -> flavor parsing -> pill confirmation. Flavors are supplier's authoritative cupping notes. Roast table: logged-in sees own roasts, logged-out sees recent roasts.

## AddBeanModal
- Page: BeanLibrary (also triggered inline from UploadModal)
- Dependencies: Modal, Combobox, FlavorPill, Toast
- GraphQL: CREATE_BEAN, FLAVOR_DESCRIPTORS_QUERY
- Complexity: medium
- Build status: [x] built

Notes: Required: name, origin, process. Optional: variety, supplier, score, notes. Cupping notes textarea -> flavor descriptor parsing -> pill confirmation. Save closes modal. Error toast + stay open.

---

## Compare

---

## ComparePage
- Page: Compare (`/compare?ids=...`)
- Dependencies: RoastChart, MetricsTable, ErrorState, SkeletonLoader
- GraphQL: ROASTS_BY_IDS_QUERY
- Complexity: high
- Build status: [x] built

Notes: Auth-only. Overlaid temp curves in distinct colors per roast. Metrics table with rating column. Arrived at from Dashboard or RoastDetail "other roasts" table. Max 5 roasts. Cross-bean comparison allowed.

---

## Upload

---

## UploadModal
- Page: shared (triggered from Header)
- Dependencies: Modal, Combobox, AddBeanModal, Toast
- GraphQL: PREVIEW_ROAST_LOG, UPLOAD_ROAST_LOG, MY_BEANS_QUERY
- Complexity: high
- Build status: [x] built

Notes: Two-step flow: dropzone -> preview with bean matching. Auto-select matched bean; banner if no match prompting inline bean creation. Save -> close modal -> navigate to new Roast Detail. Error toast + stay open.

---

## Flavor

---

## FlavorPickerModal
- Page: RoastDetail (owner), BeanDetail (owner)
- Dependencies: Modal, FlavorPill, Combobox
- GraphQL: FLAVOR_DESCRIPTORS_QUERY, CREATE_FLAVOR_DESCRIPTOR
- Complexity: medium
- Build status: [x] built

Notes: Multi-category flavor selector. Search/filter within categories. Custom descriptor creation. Two modes: flavors and off-flavors.

---

## Header Controls

---

## TempToggle
- Page: shared (Header)
- Dependencies: none
- GraphQL: UPDATE_TEMP_UNIT (logged-in only)
- Complexity: low
- Build status: [x] built

Notes: Shows "°C" or "°F", click to toggle. Persists to localStorage (anon) or user settings (logged-in). Syncs on login.

## ThemeToggle
- Page: shared (Header)
- Dependencies: none
- GraphQL: user settings mutation (may need new mutation or extend UPDATE_TEMP_UNIT)
- Complexity: low
- Build status: [x] built

Notes: Latte Mode / Black Coffee Mode toggle. Sets data-theme attribute on root. Same persistence as TempToggle.

## UserButton
- Page: shared (Header)
- Dependencies: none (Clerk component + custom dropdown)
- GraphQL: UPDATE_PRIVACY_DEFAULT (new mutation, or extend user settings mutation)
- Complexity: medium
- Build status: [x] built

Notes: Logged-in: avatar with dropdown menu containing "Private by default" toggle + Sign Out. Logged-out: "Sign In" button. E2E test variant. Privacy toggle updates user setting; when enabled, new roasts are created with isPublic: false.

---

## Auth Pages

---

## SignInPage
- Page: SignIn (`/sign-in/*`)
- Dependencies: none (Clerk component)
- GraphQL: none
- Complexity: low
- Build status: [x] built

## SignUpPage
- Page: SignUp (`/sign-up/*`)
- Dependencies: none (Clerk component)
- GraphQL: none
- Complexity: low
- Build status: [x] built

---

## Error & Fallback

---

## NotFoundPage
- Page: 404 (`*`)
- Dependencies: none
- GraphQL: none
- Complexity: low
- Build status: [x] built

Notes: Proper 404 page with link back to home. Not just a div.

## ErrorBoundary
- Page: shared (wraps feature pages)
- Dependencies: ErrorState
- GraphQL: none
- Complexity: low
- Build status: [x] built

Notes: React ErrorBoundary wrapping pages to catch unhandled errors. Renders ErrorState with retry.

---

## Providers

---

## AppProviders
- Page: root (wraps entire app)
- Dependencies: ApolloProvider, ClerkProvider, ThemeProvider, TempProvider
- GraphQL: none
- Complexity: medium
- Build status: [x] built

Notes: Composes all context providers. Theme and temp state managed here and exposed via context.

## ApolloProvider
- Page: root (inside AppProviders)
- Dependencies: none
- GraphQL: Apollo client setup with auth link
- Complexity: medium
- Build status: [x] built

Notes: Apollo client factory with Clerk JWT injection. E2E test variant with hardcoded token.

---

## Summary

| Complexity | Count |
|-----------|-------|
| Low | 18 |
| Medium | 9 |
| High | 7 |
| **Total** | **34** |
