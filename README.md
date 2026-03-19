# Costadoro Routes CRM

Coffee delivery route management application for Costadoro Coffee.

- **Modular architecture** — split into separate JS modules under `js/` and `js/pages/`
- **Mobile-first** — optimized for field use on phone
- **Vanilla stack** — HTML/CSS/JS + Tailwind CSS (CDN) + Leaflet.js (maps) + Supabase (sync)

## Features

- 100+ customers, Week A/B x 5-day route plan
- Order creation, stock tracking, delivery management
- Customer-specific pricing
- Product catalog (stock badges, daily product support)
- Reports and Excel export
- Offline-first + Supabase cloud sync
- JSON data backup/restore
- Drag-and-drop route ordering (touch + mouse, GPU-accelerated)
- Debt tracking with payment history
- Recurring orders
- Interactive map with Leaflet.js
- PWA with service worker caching (costadoro-v8)
- WCAG AA accessible (contrast, touch targets, pinch-to-zoom)
- XSS-safe templating via `escHtml()` + `data-*` attributes
