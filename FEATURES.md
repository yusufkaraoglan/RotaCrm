# FEATURES.md — Feature and Function Reference

## Pages (9 pages)

> Bottom navigation has 5 buttons: Route, Orders, Customers, Reports, Settings.
> Catalog and Map pages are accessed from Settings.
> Profile page opens by clicking a customer name.
> New Order page opens from Orders FAB (+) or Profile quick order.

---

### Route (`page-route`) — Nav: Route
Daily visit tracking and route management.

**Features:**
- Week A/B selection + day tabs (Mon-Fri)
- Pending order indicator on day tabs (orange dot)
- Each customer card: name, address, postcode, pending badge
- Checkbox for delivery marking -> delivery modal
- Drag-and-drop route ordering (touch + mouse, GPU-accelerated with throttled touchmove)
- Bottom bar: delivered count, Cash/Bank/Unpaid totals
- Route summary share, Excel export, import buttons
- Visit mode for customers with no pending orders
- Debt collection during visits

---

### Orders (`page-orders`) — Nav: Orders
Order list and management.

**Features:**
- Search (by customer name)
- Filter: All / Pending / Delivered
- Sort: Date / Name / Amount / Day / Manual
- Manual sorting with drag-and-drop (GPU-accelerated touch drag)
- Each order card shows customer name + Week/Day badge
- Deliver, Edit, Remove buttons
- FAB (+) button for new order creation
- New order form opens as full-page overlay
- Customer picker with search
- Product picker with stock status
- Double-click protection on save

**New Order Form:**
- Customer selection (full-screen picker)
- Product adding (product picker — stock status shown)
- Quantity (-/+) and price editable
- Total calculated automatically
- Delivery date + note field
- Stock decremented for tracked products

---

### Customers (`page-customers`) — Nav: Customers
Customer list and management.

**Features:**
- 100+ customer list (alphabetical)
- Search filter
- Filter: All / Week A / Week B / Unassigned
- Each card: avatar, name, address, Week/Day badge, pending count, debt
- Click customer name -> Profile page
- "+ Add" button for new customer with contact details

---

### Profile (`page-profile`)
Customer detail page.

**Features:**
- Customer info (address, city, postcode, contact, phone, email)
- Assigned day badge
- Persistent customer notes
- Total order count, total spend, average
- Top ordered products (top 5)
- Order history list
- Debt status and history with clear/add functionality
- Quick order, recurring order buttons
- Customer-specific pricing management
- Edit customer, delete customer
- Day assignment/unassignment
- All changes persist to Supabase DB

---

### Reports (`page-reports`) — Nav: Reports
Reports and analytics.

**Features:**
- Overview / Products / Customers / Debts / Export / History tabs
- Date range filter (Today / This Week / This Month / Custom)
- Total revenue, delivery count, visit count, average order
- Payment breakdown (Cash / Bank / Unpaid) with progress bars
- Product-based sales table (quantity, revenue)
- Customer-based spending table (top 30)
- Debtor customers list
- Product sales report with PDF and Excel export
- Delivery history grouped by week with customer breakdown

---

### Settings (`page-settings`) — Nav: Settings
Application settings hub.

**Sub-pages:**
- **Product Catalog** -> `page-catalog`
- **Map** -> `page-map`

**Other settings:**
- Import from Excel
- Export to Excel
- JSON data backup/restore
- Geocode all customers
- Reset all data (danger zone)

---

### Catalog (`page-catalog`) — From Settings
Product catalog management.

**Features:**
- Product add form (name, unit, price, stock)
- Colored stock badge on each product (green/yellow/red)
- Stock -/+ buttons for quick adjustment (scroll preserved)
- "Add stock" input + Add button
- Edit mode: name, unit, price, stock changes
- "Don't track stock" checkbox (daily products)
- Delete product (from edit mode)
- `trackStock: false` products hide stock fields

---

### Map (`page-map`) — From Settings
Interactive map with Leaflet.js.

**Features:**
- Customer locations as markers with route order numbers
- All / Week A / Week B / Unassigned filter
- Marker popup (cafe name, address, day, assign/profile buttons)
- Route lines connecting stops per day
- OpenStreetMap geocoding
- Day assignment from map
- Tooltip visibility based on zoom level

---

### New Order (`page-neworder`) — From Orders / Profile
Full-page order creation and editing form.

**Features:**
- Customer selection with search picker
- Product picker with stock status badges
- Editable quantity and price per item
- Auto-calculated total
- Delivery date (date input) and note field
- Stock decremented for tracked products on save
- Double-click protection via `btnLock()`
- Returns to previous page (sessionStorage-backed)

---

## Order Flow

1. Orders -> FAB (+) -> New order form (full page)
2. Select customer -> Add products (product picker)
3. Edit price/quantity -> Save
4. Appears in Orders list as "pending"
5. Deliver -> Payment modal -> Select Cash/Bank/Unpaid
6. Stock automatically decremented (for trackStock=true products)
7. Debt info shown if applicable
8. All changes persisted to Supabase

---

## Stock Management

- Each catalog item has `stock` (number|null) and `trackStock` (boolean)
- `trackStock: false` -> daily product, no stock control
- Stock decremented when order is created
- Stock difference calculated when order is edited
- Products with stock 0 shown as disabled in product picker
- Stock <=5: red badge, <=20: yellow badge, >20: green badge

---

## Recurring Orders

- Set up recurring order templates per customer
- Created from the last delivered or pending order
- Auto-created on assigned route days if no pending orders exist
- Can be updated or removed from profile page
