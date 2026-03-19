# ROADMAP.md — Planned Features and Development Ideas

## Completed

### Core Infrastructure
- [x] 100+ customers, Leaflet map
- [x] Week A/B x 5-day rotation
- [x] Drag-and-drop route ordering (Route page)
- [x] OpenStreetMap geocoding
- [x] Excel export (route, reports)
- [x] JSON data backup/restore
- [x] Modular file architecture (split from single file)
- [x] Tailwind CSS CDN integration
- [x] English UI throughout
- [x] Supabase DB persistence in all save functions

### Orders and Payments
- [x] Full-page order form (new/edit)
- [x] Product picker for item selection
- [x] Editable price order items
- [x] Payment methods: Cash / Bank / Unpaid
- [x] Stock tracking (auto-decrement on order creation)
- [x] Order sorting: Date / Name / Amount / Day / Manual
- [x] Week/day badge on order cards
- [x] Double-click protection on order save

### Customer Management
- [x] Customer CRUD (add/edit/delete)
- [x] Excel/CSV import
- [x] Persistent customer notes
- [x] Customer profile page (order history, top products, debt)
- [x] Customer-specific pricing (customerPricing)
- [x] Filters: All / Week A / Week B / Unassigned
- [x] Contact details (name, phone, email)

### Catalog
- [x] Global product catalog (name, unit, price, stock)
- [x] Colored stock badges (green/yellow/red)
- [x] Stock add/remove (scroll preserved)
- [x] Daily product support (trackStock: false)
- [x] Edit mode (name, unit, price, stock, daily toggle)

### Debt Management
- [x] Debt tracking
- [x] Debt history with add/clear entries
- [x] Quick payment form
- [x] Debt collection during visits

### Reports
- [x] Overview / Products / Customers / Debts / Export / History tabs
- [x] Date range filter (Today / Week / Month / Custom)
- [x] Product sales report with PDF and Excel export
- [x] Delivery history grouped by week

### Route
- [x] Pending order indicator on day tabs
- [x] Route summary share (clipboard/native share)
- [x] Delivery modal with payment options
- [x] Visit mode (no pending orders)
- [x] Recurring orders auto-creation

### Sync & Storage
- [x] Supabase hybrid storage (dual-layer)
- [x] Offline-first (localStorage cache)
- [x] New relational DB tables
- [x] Data migration from cr4_store to new tables
- [x] PWA service worker caching

### Bug Fix Round (March 2026 — 30 items)
- [x] XSS prevention: `data-*` attributes + `escHtml()` for inline handlers
- [x] Cache invalidation for `setCustomerPricing` and `setRecurringOrder`
- [x] `doSync` race condition fix (try/finally on `_syncInProgress`)
- [x] `saveOrder` transaction safety (warning log on partial item insert)
- [x] `clearLocalCache` prefix-based scan (cr4_/cr5_) instead of hardcoded keys
- [x] `clearOrderDebt` uses `clearDebtMethod` instead of hardcoded 'cash'
- [x] `deleteOrder` cleans up `S.ordersLockedOrders` array
- [x] Drag-drop validates source and target orders exist
- [x] `getPrice` null-safe for `S.customerPricing`
- [x] Map marker cleanup with try/catch for `removeLayer`
- [x] New order form uses `date` input instead of `datetime-local`
- [x] WCAG AA contrast: `--text-muted` #6B7280, `--text-sec` #4B5563
- [x] Touch targets: `.btn-sm` min-height 40px
- [x] Viewport allows pinch-to-zoom (`maximum-scale=5.0, user-scalable=yes`)
- [x] Service worker cache bumped to costadoro-v8
- [x] Debt history `|||` parsing uses `lastIndexOf` for robustness

### DB & Performance Fix Round (March 2026)
- [x] Remove 12 redundant `DB.setDebt()` fire-and-forget calls (profile.js, route.js) — `save.debts()` already persists via `Promise.allSettled`, double-writing caused race conditions
- [x] `save.customerProducts/brands/brandList` now return promises (were fire-and-forget, callers could not await)
- [x] Simplify `_fetchOrCache` empty-cache protection logic (remove redundant `cacheIsEmpty` variable)
- [x] Drag-drop touchmove throttled to ~60fps across route.js, catalog.js, orders.js — was unthrottled at 120+ events/sec
- [x] Drag clone uses CSS `transform` instead of `top` for GPU-accelerated positioning
- [x] `will-change: transform` hint added to drag clone elements
- [x] Drag-over highlight tracks single element instead of `querySelectorAll` per event (O(1) vs O(N))

---

## Pending Features

### High Priority

#### 1. Route Optimization
Currently manual ordering only.

**TODO:**
- Nearest neighbor algorithm for auto-ordering
- Or Google Maps / OSRM API integration

---

#### 2. Weekly/Monthly Revenue Charts
Reports have numbers but no visual charts.

**TODO:**
- Canvas/SVG line chart
- Weekly bar chart

---

### Medium Priority

#### 3. Push Notification / Reminders
Morning notification with "today's route" at a set time.

#### 4. WhatsApp Order Summary
Format day's orders as a WhatsApp message.

---

### Low Priority

#### 5. Multi-User / Team
Supabase Auth + Row Level Security

#### 6. Geographic Region Sorting
Kent / London region toggle + region filter

---

## Technical Debt

### High
- [ ] Orders data growth — archive old orders
- [x] Error handling — sync errors now logged; doSync has try/finally guard
- [ ] Conflict resolution — timestamp-based merge
- [x] Redundant DB writes — removed duplicate `DB.setDebt()` calls that raced with `save.debts()`

### Medium
- [ ] Batch Supabase writes — debounce for bulk writes
- [ ] Geocoding retry mechanism
- [x] Drag-drop performance — touchmove throttling, GPU transform, single-element tracking

### Low
- [ ] CSS cleanup — inline styles could be moved to Tailwind classes
- [ ] Further Tailwind CSS adoption across all page templates
- [x] XSS in inline handlers — migrated to `data-*` attribute pattern
- [x] WCAG contrast issues — text colors updated to AA compliance
