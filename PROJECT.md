# PROJECT.md — Architecture and Technical Details

## What is the Application?

A custom-built route management system for Yusuf, who delivers coffee to ~103 cafes in the Kent and London regions for Costadoro Coffee.

**Core workflow:**
1. 103+ customers distributed across a two-week rotation (Week A / Week B)
2. 5 days per week (Mon-Fri) x 2 weeks = 10-day plan
3. Mobile phone in the field for visit tracking + order/payment recording
4. Computer in the office for route planning and analysis

---

## Technical Architecture

```
index.html
├── Tailwind CSS CDN        (utility-first CSS framework)
├── css/app.css              Custom component styles
├── js/db.js                 Supabase REST + localStorage cache + offline queue
├── js/utils.js              Utility functions (format, geocode, calculations)
├── js/app.js                State, navigation, modal, init, service worker
└── js/pages/
    ├── route.js             Daily route / visit tracking
    ├── orders.js            Order list (pending/delivered) + order form
    ├── customers.js         Customer list + CRUD
    ├── profile.js           Customer profile detail
    ├── reports.js           Reports / dashboard
    ├── settings.js          Settings (backup, data management)
    ├── catalog.js           Product catalog + recurring orders
    ├── map.js               Leaflet map + import/export
    └── neworder.js          New/edit order form (full-page overlay)
```

---

## Navigation Structure

### Bottom Nav Bar (5 buttons)
| Button | Page | Description |
|--------|------|-------------|
| Route | `page-route` | Daily route + visit tracking |
| Orders | `page-orders` | Order list + new order |
| Customers | `page-customers` | Customer list + add |
| Reports | `page-reports` | Reports / dashboard |
| Settings | `page-settings` | Settings hub (catalog, map, backup) |

### Settings Sub-pages
| Page | Access |
|------|--------|
| `page-catalog` | Settings -> Product Catalog |
| `page-map` | Settings -> Map |

### Profile Page
| Page | Access |
|------|--------|
| `page-profile` | Click customer name from Customers list or Order card |

### New Order Page
| Page | Access |
|------|--------|
| `page-neworder` | FAB (+) from Orders or Quick Order from Profile |

---

## Data Models

### STOPS (Customer Stop)
```js
{
  id: number,        // unique
  n: string,         // Cafe name (e.g. "ABBEY CAFE")
  a: string,         // Address line
  c: string,         // City (e.g. "Gravesend")
  p: string,         // Postcode (e.g. "DA11 0BB")
  cn: string,        // Contact name
  ph: string,        // Phone
  em: string,        // Email
}
```

### DAYS (Day Definitions) — fixed, 10 days
```js
{
  id: string,        // e.g. "wA0" (Week A Monday)
  label: string,     // "Monday"
  week: "A" | "B",
  color: string,     // hex color code
  ci: number,        // color index (0-9)
}
```

**ID format:** `w{WEEK}{DAY_INDEX}` -> `wA0`=WeekA Mon, `wB3`=WeekB Thu

### State (S object) — stored in localStorage + Supabase

| Key | Type | Description |
|-----|------|-------------|
| `assign` | `{stopId: dayId}` | Which stop is assigned to which day |
| `routeOrder` | `{dayId: [stopId, ...]}` | Intra-day ordering |
| `geo` | `{stopId: {lat, lng}}` | Geocoded coordinates |
| `orders` | `{orderId: OrderObj}` | All orders (UUID key) |
| `debts` | `{stopId: number}` | Accumulated debt (£) |
| `cnotes` | `{stopId: string}` | Persistent customer notes |
| `debtHistory` | `{stopId: [TxObj, ...]}` | Debt transaction history |
| `catalog` | `[CatalogItem, ...]` | Global product catalog |
| `customerPricing` | `{stopId: {productName: price}}` | Customer-specific prices |
| `customerProducts` | `{stopId: {...}}` | Customer product preferences |
| `recurringOrders` | `{stopId: {items: [...]}}` | Recurring order templates |

### Order Object (V2)
```js
{
  id: string,           // UUID
  customerId: number,   // stop id
  items: [{name, qty, price}],
  note: string,
  deliveryDate: string, // YYYY-MM-DD
  status: "pending" | "delivered",
  payMethod: "cash" | "bank" | "unpaid" | "visit" | null,
  cashPaid: number,     // amount paid in cash (for partial payments)
  createdAt: ISO8601,
  deliveredAt: ISO8601 | null,
  debtEntryIds: [string], // linked debt history entry IDs
}
```

### Catalog Item
```js
{
  name: string,
  unit: string,        // e.g. "1kg", "250g"
  price: number,
  stock: number | null, // null = no stock tracking
  trackStock: boolean,  // false = daily product, no stock tracking
}
```

---

## Storage Architecture

### Hybrid localStorage + Supabase

```
Write:  save.*(key)
          ├── cacheSet(key, value)  -> localStorage['cr5_' + key] (instant)
          └── DB.*(data)            -> Supabase REST API (async, returns Promise)

Read:   loadStateFromDB() or loadStateLegacy()
          └── localStorage cache (for speed)

Sync:   syncAll()
          ├── Pull all tables from Supabase
          ├── Update localStorage cache
          └── Re-render current page

Note: save.* helpers return Promises. Do NOT call DB.set*() separately
      after save.*() — this causes duplicate writes and race conditions.
```

**Note:** Supabase SDK is NOT used — pure `fetch()` REST API calls.

---

## CSS Architecture

### Theme Variables (`:root`)
```css
--bg: #F5F5F7        /* Page background */
--card: #FFFFFF      /* Card background */
--border: #E5E7EB    /* Light border */
--text: #111827      /* Primary text */
--text-sec: #4B5563  /* Secondary text (WCAG AA) */
--text-muted: #6B7280 /* Muted text (WCAG AA) */
--primary: #E85D3A   /* Costadoro orange */
--success: #12B76A   /* Green */
--danger: #F04438    /* Red */
--warning: #F79009   /* Warning */
--info: #2E90FA      /* Info blue */
```

### Design System
- Font: Inter (system-ui fallback)
- Border-radius: `--radius` (12px), `--radius-sm` (8px)
- Mobile-first responsive
- Safe area: `env(safe-area-inset-bottom)` for iPhone notch support
- Chip/toggle system for filters
- Tailwind CSS CDN for utility classes

---

## Known Limitations

1. **Single user** — no multi-user conflict resolution (last-write-wins)
2. **Large data** — `orders` object can grow over time
3. **Offline first load** — Supabase sync won't work without internet
4. **Geocoding** — OpenStreetMap Nominatim has rate limits
5. **Excel export** — requires SheetJS CDN
6. **Offline queue** — in-memory only, lost on tab crash (operations dropped after 3 retries)
7. **Cache TTL** — 10 minutes; settings changed on another device may be stale until sync
