# Salvage Notes — Client Source Audit

> Audit date: 2026-04-02
> Purpose: Document what's worth preserving before archiving `/client/src`

---

## Use Case Considerations Already in Place

- **Auth boundary:** Clerk JWT injected into Apollo via auth link; server rejects unauthorized requests. E2E test mode bypasses auth with hardcoded token (`VITE_E2E_TEST=true`).
- **Public sharing:** `/share/:token` route is unauthenticated; server validates `isShared: true` before returning data. CTA encourages sign-up.
- **Temperature preference:** All temps stored Celsius; UI converts based on user `tempUnit` setting. Conversion lives in `lib/tempConversion.ts`.
- **DTR% derived client-side:** Development time ratio calculated in UI from `developmentTime / totalDuration`, not stored in DB.
- **File upload flow:** Two-step dropzone -> preview with bean matching; supports inline bean creation during upload.
- **Bean supplier scraping:** URL-based or HTML-paste scraping with Cloudflare-blocked domain detection and diff-based field selection.
- **Flavor system:** Two parallel channels (flavors + off-flavors) with category-grouped picker, custom descriptor creation, and colored pills.

---

## Correctly Implemented & Properly Wired

### Components
| Component | Path | Notes |
|-----------|------|-------|
| **Modal** | `components/Modal.tsx` | Portal-based, backdrop click, close button, footer slot |
| **StarRating** | `components/StarRating.tsx` | Half-star support, interactive + read-only, good a11y |
| **FlavorPill** | `components/FlavorPill.tsx` | Colored pills with suggested/off-flavor variants |
| **Combobox** | `components/Combobox.tsx` | Searchable dropdown, click-outside, accessible |
| **FlavorPickerModal** | `components/FlavorPickerModal.tsx` | Multi-category selector, custom descriptor creation, both modes |
| **UploadModal** | `components/UploadModal.tsx` | Dropzone -> preview, bean matching, inline bean creation |
| **AppLayout** | `components/AppLayout.tsx` | Header nav + upload trigger, Outlet for routes |

### Feature Pages
| Page | Path | Notes |
|------|------|-------|
| **DashboardPage** | `features/dashboard/` | My Roasts table, search/filter by bean, inline rating, multi-select for compare |
| **RoastDetailPage** | `features/roast-detail/` | Full roast display with chart, metrics, flavors, notes editing, sharing toggle |
| **RoastChart** | `features/roast-detail/RoastChart.tsx` | Chart.js with toggleable metrics (bean temp, env temp, RoR, fan, power), phase zoom |
| **MetricsTable** | `features/roast-detail/MetricsTable.tsx` | Fixed-format metrics (duration, FC time, dev time, etc.) |
| **BeanLibraryPage** | `features/beans/BeanLibraryPage.tsx` | Card grid with aggregated flavor stats, roast counts, avg ratings |
| **BeanDetailPage** | `features/beans/BeanDetailPage.tsx` | Bean metadata editing, roast history, inline rating |
| **AddBeanModal** | `features/beans/AddBeanModal.tsx` | Bean creation + supplier parse integration |
| **ParseSupplierModal** | `features/beans/ParseSupplierModal.tsx` | URL scrape or HTML paste, Cloudflare detection |
| **ParseDiffModal** | `features/beans/ParseDiffModal.tsx` | Visual diff of current vs. parsed, checkbox selection |
| **ComparePage** | `features/compare/` | Side-by-side temperature curves, metrics table |
| **SettingsPage** | `features/settings/` | Temperature unit toggle |
| **SharedRoastPage** | `features/shared/` | Public read-only roast view, sign-up CTA |

### Auth
| Component | Path | Notes |
|-----------|------|-------|
| **SignInPage** | `features/auth/SignInPage.tsx` | Clerk hosted UI |
| **SignUpPage** | `features/auth/SignUpPage.tsx` | Clerk hosted UI |
| **ProtectedRoute** | `features/auth/ProtectedRoute.tsx` | Exists but UNUSED in routing (see issues below) |

---

## GraphQL Operations Correctly Hooked Up

All 25+ operations in `graphql/operations.ts` use gql.tada for end-to-end type safety.

### Queries
- `MY_ROASTS_QUERY` — Dashboard + comparison list (includes flavors, bean ref, share token)
- `MY_BEANS_QUERY` — Bean library + upload modal
- `ROAST_BY_ID_QUERY` — Full roast with time series, chart data
- `ROASTS_BY_BEAN_QUERY` — Roasts filtered by bean ID
- `ROASTS_BY_IDS_QUERY` — Multiple roasts for comparison
- `ROAST_BY_SHARE_TOKEN` — Public roast access (no auth)
- `PREVIEW_ROAST_LOG` — Upload preview + warnings
- `FLAVOR_DESCRIPTORS_QUERY` — Filtered by isOffFlavor
- `USER_SETTINGS_QUERY` — User preferences

### Mutations
- `UPLOAD_ROAST_LOG` — File upload + bean matching
- `SET_ROAST_FLAVORS` / `SET_ROAST_OFF_FLAVORS` — Bulk flavor assignment
- `UPDATE_ROAST_RATING` / `UPDATE_ROAST_MUTATION` — Inline rating + notes
- `DELETE_ROAST_MUTATION` — With refetch
- `TOGGLE_ROAST_SHARING_MUTATION` — Share/unshare
- `CREATE_BEAN` / `UPDATE_BEAN` / `UPDATE_USER_BEAN` — Bean CRUD
- `UPDATE_BEAN_SUGGESTED_FLAVORS` — Flavor array updates
- `SCRAPE_BEAN_URL` / `PARSE_BEAN_PAGE` — Supplier data extraction
- `CREATE_FLAVOR_DESCRIPTOR` — Custom flavor creation
- `UPDATE_TEMP_UNIT` — User preference

---

## Routing Structure Worth Preserving

```
/                     DashboardPage (My Roasts)       [auth required]
/roasts/:id           RoastDetailPage                 [auth required]
/compare?ids=...      ComparePage                     [auth required]
/beans                BeanLibraryPage                 [auth required]
/beans/:id            BeanDetailPage                  [auth required]
/settings             SettingsPage                    [auth required]
/sign-in/*            SignInPage (Clerk)              [public]
/sign-up/*            SignUpPage (Clerk)              [public]
/share/:token         SharedRoastPage                 [public]
```

Layout: Authenticated routes nested under `<AppLayout />` which provides header nav + upload modal trigger.

---

## CSS & Design Token Decisions Worth Keeping

### Token System (`styles/tokens.css`)
- **Colors:** Background (3 levels), text (4 shades), borders, actions, accents (berry/caramel/herb), error
- **Typography:** Sora (headings), JetBrains Mono (code); 8 size steps; 4 weights; 3 line heights
- **Spacing:** 0.25rem to 4rem scale
- **Radii:** sm/md/lg/full
- **Shadows:** sm/md/lg
- **Transitions:** fast (150ms), normal (250ms)
- **Layout:** 72rem max-width, 16rem sidebar

### CSS Modules Pattern
- All 22 component styles use CSS Modules (`ComponentName.module.css`)
- No runtime CSS-in-JS, no Tailwind, no global class leaks
- Reset/normalization in `styles/reset.css`

---

## Utilities & Helpers Worth Keeping

| File | Functions | Notes |
|------|-----------|-------|
| `lib/formatters.ts` | `formatDuration`, `formatTemp`, `formatDate` | Clean, well-tested |
| `lib/tempConversion.ts` | `celsiusToFahrenheit`, `fahrenheitToCelsius` | Standard formulas, tested |
| `lib/chartSetup.ts` | Chart.js plugin registration | Annotation + zoom plugins |
| `lib/coffeeProcesses.ts` | Coffee process enum (10 methods) | Reference data |
| `lib/apollo.ts` | Apollo client factory with Clerk auth link | Core infrastructure |

---

## What Should NOT Be Carried Forward

### Critical Issues
| Issue | Location | Why |
|-------|----------|-----|
| **ProtectedRoute unused** | `App.tsx` routing | Auth pages aren't actually protected; component exists but was never wired into the route tree. Must fix in rebuild. |
| **No error boundaries** | All pages | Unhandled query/mutation errors cause blank screens. Need React ErrorBoundary wrapping. |

### Anti-Patterns to Drop
| Pattern | Where | Better Approach |
|---------|-------|-----------------|
| `as any` type casts | `ParseDiffModal.tsx` | Use `Record<string, unknown>` or proper generics |
| Duplicate `formatDuration` | `UploadModal.tsx` (local copy) | Import from `lib/formatters.ts` |
| Hardcoded `MAX_VISIBLE_PILLS = 3` | Dashboard, BeanDetail, BeanLibrary | Centralize constant |
| String-based modal states | UploadModal (`"dropzone" \| "preview"`) | State machine or discriminated union |
| Inline `hexToRgb()` | FlavorPill.tsx | Extract to utility or use CSS custom properties |
| No lazy loading | All feature pages | Use `React.lazy` + `Suspense` for route-level code splitting |
| `refetchQueries` everywhere | Most mutations | Use Apollo cache `update()` for optimistic updates where possible |

### Structural Issues
| Issue | Notes |
|-------|-------|
| No loading skeletons | Pages show nothing while queries load |
| No empty states | Tables/lists have no guidance when data is empty |
| No 404 page | Just a `<div>404</div>` |
| No offline handling | No service worker or cache strategy |
