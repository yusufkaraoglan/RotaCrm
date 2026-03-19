# Development Plan v2 (Historical)

> **Note:** This plan was created during the early development phase when the app was a single-file architecture.
> All items have been completed as part of the v2 modular rewrite and subsequent bug fix rounds.
> This file is kept for historical reference only.

## Summary

4 main work items (all completed):

| # | Task | Description |
|---|------|-------------|
| 1 | Merge Plan + Route | Remove Plan page, move all features to Route |
| 2 | Orders page | New `page-orders` — select customer, add from catalog |
| 3 | Customer-specific pricing | Integration in order form and route |
| 4 | Reporting system | Daily/monthly/custom date delivery reports |

All 4 phases have been implemented in the current v2 modular architecture.

## Current Architecture

The application has been split from a single 4700+ line file into a modular structure:
- `js/app.js` — Core state, navigation, init
- `js/db.js` — Supabase REST API layer
- `js/utils.js` — Utility functions
- `js/migrate.js` — Data migration
- `js/pages/*.js` — Individual page modules

All UI text has been translated from Turkish to English.
Supabase DB persistence has been added to all save functions.
Tailwind CSS CDN has been integrated for styling.

## Post-v2 Maintenance

### DB & Performance Fixes (March 2026)
- Removed redundant `DB.setDebt()` calls — `save.debts()` handles persistence
- `save.*` helpers now all return Promises for proper await support
- Simplified `_fetchOrCache` cache protection logic
- Drag-drop optimized: touchmove throttling (~60fps), CSS transform positioning, single-element tracking
