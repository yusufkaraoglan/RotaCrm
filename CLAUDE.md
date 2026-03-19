# CLAUDE.md — Costadoro Route CRM

> This file is prepared for Claude Code. Read this file and the referenced MD files before continuing with the project.

---

## Project Overview

**Costadoro Routes** — A mobile-first route management application developed for Costadoro Coffee branded coffee distribution.

- **Owner:** Yusuf (business owner, not a developer — "vibe coding" approach)
- **Usage:** Phone in the field + computer in the office
- **Language:** English UI, English code
- **Technology:** Vanilla HTML/CSS/JS + Tailwind CSS (CDN) + Leaflet.js + Supabase

**Modular file architecture** (v2, split from single file in March 2026):

---

## File Structure

```
index.html              <- HTML shell (page divs + nav + script loads + Tailwind CDN)
index_old.html          <- Old single-file backup (4700+ lines)
css/
  app.css               <- All CSS styles (~510 lines)
js/
  config.js             <- Supabase credentials (EXCLUDED from git via .gitignore)
  config.example.js     <- Template for config.js (safe to commit)
  db.js                 <- Supabase REST + localStorage cache + offline queue
  utils.js              <- Utility functions (format, geocode, calculations)
  app.js                <- State, navigation, modal, init, service worker
  pages/
    route.js            <- Route page (daily delivery, drag-and-drop)
    orders.js           <- Orders page (order form, product picker)
    customers.js        <- Customers list page
    profile.js          <- Customer profile (debt, pricing, notes)
    reports.js          <- Reports (overview, products, customers, debts, export)
    settings.js         <- Settings page (JSON backup, cache clear)
    catalog.js          <- Product catalog + recurring orders + reset
    map.js              <- Map page (Leaflet) + import/export + route share
    neworder.js         <- New/edit order form (full-page overlay)
CLAUDE.md               <- This file
PROJECT.md              <- Project details, architecture, data models
FEATURES.md             <- All features and function reference
ROADMAP.md              <- Planned features and development ideas
PLAN.md                 <- Historical development plan (v2 rewrite)
README.md               <- Short project description
```

---

## Critical Development Rules

### 1. File Organization
- **CSS:** `css/app.css` — all styles here
- **JS:** `js/` folder — each module has its own file, pages in `js/pages/`
- **HTML:** `index.html` — only page divs and script loads
- Script load order: `config.js -> db.js -> utils.js -> app.js -> pages/*.js`

### 2. Brace Balance Check
Check JS brace/parenthesis balance after every change:
```bash
# Check all files:
for f in js/*.js js/pages/*.js; do node -c "$f"; done
```
**This error has crashed the project before** — `clearDebt()` function was missing its closing `}`.

### 3. Dual-Layer Storage (Transition Period)

**Old system (cr4_store):**
- `lsSave(key, value)` -> localStorage + Supabase cr4_store
- `lsGet(key, default)` -> reads from localStorage
- `syncFromSupabase()` -> pulls from cr4_store and updates localStorage

**New system (relational tables):**
- `DB.saveCustomer(data)` -> customers table + cache
- `DB.getOrders()` -> from orders table + cache
- `cacheGet/cacheSet` -> cr5_ prefix in localStorage
- `syncAll()` -> pulls from all tables and updates cache

**Transition logic:** If `cacheGet('db_migrated', false)` is true, new DB is used.

**Save functions now persist to both localStorage AND Supabase** via `save.*` helpers in app.js.

### 4. Call Save on State Changes
```js
S.debts[stopId] = newValue;
save.debts();  // <- MUST call this
// Do NOT also call DB.setDebt() — save.debts() already persists to Supabase.
// Calling both causes duplicate writes and race conditions.
```

All `save.*` helpers return Promises. Await them when needed (e.g. in `Promise.allSettled`).

### 5. Adding New Pages
1. Add `<div class="page" id="page-NAME">` in `index.html`
2. `app.js` -> add `case 'NAME': renderNAME(); break;` to `renderCurrentPage()`
3. Create `js/pages/NAME.js` with `renderNAME()` function
4. If needed, update `app.js` -> `showPage()` nav mapping

**Existing pages:** route, orders, customers, profile, reports, settings, catalog, map, neworder

**Bottom navigation (5 buttons):** Route, Orders, Customers, Reports, Settings

### 6. English UI
All user-visible text must be in English. Code comments can be in English.

### 7. Scroll Position Preservation
Save/restore scroll position on in-page updates:
```js
const body = document.querySelector('#page-xyz .page-body');
const scrollPos = body ? body.scrollTop : 0;
renderXyz();
const newBody = document.querySelector('#page-xyz .page-body');
if (newBody) newBody.scrollTop = scrollPos;
```

### 8. Order Form Full Page
New order/edit forms use a full-page overlay (`order-form-overlay`) instead of `openModal()`.

### 9. Double-Click Protection
Use `btnLock(fn)` from app.js for actions like saving orders to prevent duplicate submissions.

### 10. XSS Prevention
Never interpolate user data into inline `onclick` handlers. Use `data-*` attributes + `escHtml()`:
```js
// BAD: onclick="doThing('${name}')"
// GOOD:
`<span data-name="${escHtml(name)}" onclick="doThing(this.dataset.name)">`
```

### 11. Debt History `|||` Delimiter
Debt history entries encode the type (add/clear/adjust/visit) into the note field using `|||` as a delimiter.
Parsing uses `lastIndexOf('|||')` to handle notes that may contain the literal string `|||`.

---

## Database (Supabase)

```
Project: ClientRotaCrm
URL: (see js/db.js)
Anon Key: (see js/db.js — this is a public anon key, safe in frontend code)
RLS: ENABLED on all tables with "allow_all" policy (single-user app)
```

### Security Notes
- **Anon key in frontend is normal** — Supabase anon key is designed to be public. RLS is the real protection.
- **RLS must stay ENABLED** — Never disable RLS. All tables have `allow_all` policy for single-user use.
- **If RLS policies are missing**, the app will detect it on startup and show an error toast.
- **Migration SQL includes RLS + policies** — New setups automatically get correct security config.
- **`.gitignore`** excludes `js/config.js`, `.env`, and other sensitive files.

### Old Table (preserved during transition)
- `cr4_store` (key TEXT PRIMARY KEY, value JSONB, updated_at TIMESTAMPTZ)

### New Tables (migration/001_create_tables.sql)
- `customers` — customers (id, name, address, city, postcode, lat, lng, note, contact_name, phone, email)
- `products` — product catalog
- `assignments` — customer -> day assignment
- `route_order` — intra-day route ordering
- `orders` — orders
- `order_items` — order line items
- `debts` — current debt balance
- `debt_history` — debt transaction history
- `customer_pricing` — customer-specific pricing
- `recurring_orders` — recurring order templates
- `app_settings` — application settings (key-value)
- `migrations` — migration tracking

---

## Dependencies (CDN)

```html
<script src="https://cdn.tailwindcss.com"></script>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js">
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js">
```

---

## Quick Start

Things Claude Code should do before starting on the project:

- [ ] Read this file
- [ ] `js/app.js` — understand state structure and navigation
- [ ] `js/db.js` — understand the storage layer
- [ ] `js/pages/*.js` — review page render functions
- [ ] Run brace balance check before making changes
- [ ] Validate syntax with `node -c` after every change
