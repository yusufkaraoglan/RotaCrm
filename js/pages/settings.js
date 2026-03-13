'use strict';
// SETTINGS PAGE
// ══════════════════════════════════════════════════════════════
function renderSettings() {
  let html = `
    <header class="topbar">
      <h1 onclick="toggleDebugPanel()">Settings</h1>
    </header>
    <div class="page-body">

      <!-- Catalog Section -->
      <div class="settings-section">
        <div class="settings-title">Product Catalog</div>
        <div class="settings-card">
          <div class="settings-item" onclick="showPage('catalog')" style="cursor:pointer">
            <div>
              <div class="settings-item-label">Manage Catalog</div>
              <div class="settings-item-desc">${S.catalog.length} products</div>
            </div>
            <span style="color:var(--text-muted)">&rarr;</span>
          </div>
        </div>
      </div>

      <!-- Map Section -->
      <div class="settings-section">
        <div class="settings-title">Map</div>
        <div class="settings-card">
          <div class="settings-item" onclick="showMapModal()" style="cursor:pointer">
            <div>
              <div class="settings-item-label">View Map</div>
              <div class="settings-item-desc">View all customers on map</div>
            </div>
            <span style="color:var(--text-muted)">&rarr;</span>
          </div>
          <div class="settings-item" onclick="geocodeAllStops()" style="cursor:pointer">
            <div>
              <div class="settings-item-label">Geocode All</div>
              <div class="settings-item-desc">Geocode customers without coordinates</div>
            </div>
            <span style="color:var(--text-muted)">&rarr;</span>
          </div>
        </div>
      </div>

      <!-- Import/Export Section -->
      <div class="settings-section">
        <div class="settings-title">Data</div>
        <div class="settings-card">
          <div class="settings-item" style="cursor:pointer" onclick="showImportModal()">
            <div>
              <div class="settings-item-label">Import from Excel</div>
              <div class="settings-item-desc">Upload customer list (.xlsx)</div>
            </div>
            <span style="color:var(--text-muted)">&rarr;</span>
          </div>
          <div class="settings-item" style="cursor:pointer" onclick="exportExcel()">
            <div>
              <div class="settings-item-label">Export to Excel</div>
              <div class="settings-item-desc">Download all data</div>
            </div>
            <span style="color:var(--text-muted)">&rarr;</span>
          </div>
        </div>
      </div>

      <!-- Data Backup -->
      <div class="settings-section">
        <div class="settings-title">Data Backup</div>
        <div class="settings-card">
          <div class="settings-item" style="cursor:pointer" onclick="exportJSON()">
            <div>
              <div class="settings-item-label">Export as JSON</div>
              <div class="settings-item-desc">Save all data to backup file</div>
            </div>
            <span style="color:var(--text-muted)">&darr;</span>
          </div>
          <div class="settings-item" style="cursor:pointer" onclick="document.getElementById('json-import-input').click()">
            <div>
              <div class="settings-item-label">Import from JSON</div>
              <div class="settings-item-desc">Restore data from backup file</div>
            </div>
            <span style="color:var(--text-muted)">&uarr;</span>
          </div>
        </div>
        <input type="file" id="json-import-input" accept=".json" style="display:none" onchange="importJSON(this)">
      </div>


      <!-- Database Status -->
      <div class="settings-section">
        <div class="settings-title">Database</div>
        <div class="settings-card">
          <div class="settings-item">
            <div>
              <div class="settings-item-label">Supabase Sync</div>
              <div class="settings-item-desc" id="db-status-text">${_dbReady ? '<span style="color:var(--success)">Connected — Auto Sync</span>' : '<span style="color:var(--danger)">Tables not found — cache-only mode</span>'}</div>
            </div>
            ${!_dbReady ? `<button class="btn btn-primary btn-sm" onclick="showDbSetupModal()">Setup</button>` : `<span style="color:var(--success);font-size:20px">&#10003;</span>`}
          </div>
        </div>
      </div>

      <!-- Danger Zone -->
      <div class="settings-section">
        <div class="settings-title" style="color:var(--danger)">Danger Zone</div>
        <div class="settings-card">
          <div class="settings-item">
            <div>
              <div class="settings-item-label">Reset All Data</div>
              <div class="settings-item-desc">Delete all local data and start fresh</div>
            </div>
            <button class="btn btn-danger btn-sm" onclick="resetAllData()">Reset</button>
          </div>
        </div>
      </div>

      <!-- App Info -->
      <div class="text-center text-muted" style="padding:20px;font-size:12px">
        Costadoro Delivery v2.0<br>
        ${STOPS.length} customers &middot; ${Object.keys(S.orders).length} orders
      </div>
    </div>`;

  document.getElementById('page-settings').innerHTML = html;
}

// JSON BACKUP
// ══════════════════════════════════════════════════════════════
function exportJSON() {
  const backup = {
    version: '2.0',
    exportedAt: new Date().toISOString(),
    data: {
      stops: STOPS,
      assign: S.assign,
      routeOrder: S.routeOrder,
      geo: S.geo,
      orders: S.orders,
      debts: S.debts,
      debtHistory: S.debtHistory,
      cnotes: S.cnotes,
      catalog: S.catalog,
      customerPricing: S.customerPricing,
      customerProducts: S.customerProducts,
      recurringOrders: S.recurringOrders
    }
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `costadoro-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  appAlert('Backup file downloaded.');
}

async function importJSON(input) {
  const file = input.files[0];
  if (!file) return;
  input.value = '';
  try {
    const text = await file.text();
    const backup = JSON.parse(text);
    if (!backup.data) { appAlert('Invalid backup file.'); return; }
    if (!(await appConfirm(`This backup is dated ${backup.exportedAt ? formatDate(backup.exportedAt) : 'unknown'}.<br>Existing data will be overwritten. Continue?`))) return;
    const d = backup.data;
    if (d.stops) { STOPS = d.stops; save.stops(); }
    if (d.assign) { S.assign = d.assign; save.assign(); }
    if (d.routeOrder) { S.routeOrder = d.routeOrder; save.routeOrder(); }
    if (d.geo) { S.geo = d.geo; save.geo(); }
    if (d.orders) { S.orders = d.orders; save.orders(Object.keys(d.orders)); }
    if (d.debts) { S.debts = d.debts; save.debts(); }
    if (d.debtHistory) { S.debtHistory = d.debtHistory; save.debtHistory(); }
    if (d.cnotes) { S.cnotes = d.cnotes; save.cnotes(); }
    if (d.catalog) { S.catalog = d.catalog; save.catalog(); }
    if (d.customerPricing) { S.customerPricing = d.customerPricing; save.pricing(); }
    if (d.customerProducts) { S.customerProducts = d.customerProducts; save.customerProducts(); }
    if (d.recurringOrders) { S.recurringOrders = d.recurringOrders; save.recurringOrders(); }
    appAlert('Data restored successfully.');
    renderSettings();
  } catch (e) {
    appAlert('Could not read file: ' + e.message);
  }
}

function _getSetupSQL() {
  return `CREATE TABLE IF NOT EXISTS customers (id SERIAL PRIMARY KEY, name TEXT NOT NULL, address TEXT DEFAULT '', city TEXT DEFAULT '', postcode TEXT DEFAULT '', lat DOUBLE PRECISION, lng DOUBLE PRECISION, note TEXT DEFAULT '', contact_name TEXT DEFAULT '', phone TEXT DEFAULT '', email TEXT DEFAULT '', created_at TIMESTAMPTZ DEFAULT now());
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS products (id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE, unit TEXT DEFAULT '1', price NUMERIC(10,2) DEFAULT 0, stock INT, track_stock BOOLEAN DEFAULT true, sort_order INT DEFAULT 0, created_at TIMESTAMPTZ DEFAULT now());
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS assignments (customer_id INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE, day_id TEXT NOT NULL, PRIMARY KEY (customer_id));
ALTER TABLE assignments DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS route_order (day_id TEXT NOT NULL, customer_id INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE, position INT DEFAULT 0, PRIMARY KEY (day_id, customer_id));
ALTER TABLE route_order DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, customer_id INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE, status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'delivered')), pay_method TEXT, cash_paid NUMERIC(10,2), delivery_date DATE, note TEXT DEFAULT '', created_at TIMESTAMPTZ DEFAULT now(), delivered_at TIMESTAMPTZ);
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS order_items (id SERIAL PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE, product_name TEXT NOT NULL, qty INT DEFAULT 1, price NUMERIC(10,2) DEFAULT 0);
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS debts (customer_id INT PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE, amount NUMERIC(10,2) DEFAULT 0);
ALTER TABLE debts DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS debt_history (id SERIAL PRIMARY KEY, customer_id INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE, amount NUMERIC(10,2) DEFAULT 0, note TEXT DEFAULT '', order_id TEXT, created_at TIMESTAMPTZ DEFAULT now());
ALTER TABLE debt_history DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS customer_pricing (customer_id INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE, product_name TEXT NOT NULL, price NUMERIC(10,2) NOT NULL, PRIMARY KEY (customer_id, product_name));
ALTER TABLE customer_pricing DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS recurring_orders (customer_id INT PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE, items JSONB NOT NULL DEFAULT '[]', note TEXT DEFAULT '', created_at TIMESTAMPTZ DEFAULT now());
ALTER TABLE recurring_orders DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value JSONB, updated_at TIMESTAMPTZ DEFAULT now());
ALTER TABLE app_settings DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS migrations (id SERIAL PRIMARY KEY, name TEXT NOT NULL, executed_at TIMESTAMPTZ DEFAULT now());
ALTER TABLE migrations DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_delivered ON orders(delivered_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_debt_history_customer ON debt_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_route_order_day ON route_order(day_id);
CREATE INDEX IF NOT EXISTS idx_assignments_day ON assignments(day_id);`;
}

function showDbSetupModal() {
  const sqlUrl = 'https://supabase.com/dashboard/project/mvvvqloqwjimlbqeotsd/sql/new';
  const sql = _getSetupSQL();
  openModal(`
    <div class="modal-handle"></div>
    <div class="modal-title">Database Setup Required</div>
    <div style="padding:0 16px 16px;font-size:13px;line-height:1.5">
      <p style="margin-bottom:12px">The database tables have not been created yet. Data is only saved in your browser.</p>
      <p style="margin-bottom:12px"><b>To enable cloud sync:</b></p>
      <ol style="margin-bottom:16px;padding-left:20px">
        <li style="margin-bottom:6px">Open the <a href="${sqlUrl}" target="_blank" style="color:var(--primary);text-decoration:underline">Supabase SQL Editor</a></li>
        <li style="margin-bottom:6px">Select ALL text in the box below, copy it</li>
        <li style="margin-bottom:6px">Paste it in the SQL Editor and click "Run"</li>
        <li style="margin-bottom:6px">Come back here and tap "Verify"</li>
      </ol>
      <div style="position:relative;margin-bottom:8px">
        <textarea id="setup-sql-text" readonly style="width:100%;height:180px;font-size:11px;font-family:monospace;background:#1a1a2e;color:#0f0;border:1px solid #333;border-radius:8px;padding:10px;resize:none;-webkit-user-select:all;user-select:all">${sql.replace(/</g,'&lt;')}</textarea>
        <button onclick="selectAndCopySQL()" style="position:absolute;top:6px;right:6px;background:var(--primary);color:#fff;border:none;border-radius:6px;padding:6px 12px;font-size:12px;cursor:pointer">Copy</button>
      </div>
      <button class="btn btn-primary btn-block" onclick="verifyDbSetup()">Verify Tables</button>
    </div>
  `);
}

function selectAndCopySQL() {
  const ta = document.getElementById('setup-sql-text');
  if (!ta) return;
  ta.select();
  ta.setSelectionRange(0, ta.value.length);
  try {
    document.execCommand('copy');
    showToast('SQL copied!', 'success');
  } catch {
    showToast('Text selected — long-press to copy', 'info', 4000);
  }
}

async function verifyDbSetup() {
  const ok = await checkDbTables();
  if (!ok) {
    appAlert('Tables still not found. Please make sure you ran the SQL in Supabase SQL Editor and clicked "Run".');
    return;
  }

  showToast('Tables verified! Uploading data to cloud...', 'success', 8000);
  closeModal();

  try {
    await _initialUpload();
    cacheSet('db_migrated', true);
    showToast('All data uploaded!', 'success');
    renderSettings();
  } catch (e) {
    showToast('Upload error: ' + e.message, 'error', 5000);
  }
}

async function uploadAllData() {
  if (!_dbReady) { appAlert('Database tables not found. Run Setup first.'); return; }
  showToast('Uploading all data...', 'info', 10000);
  try {
    await _initialUpload();
    cacheSet('db_migrated', true);
    showToast('All data uploaded to cloud!', 'success');
    renderSettings();
  } catch (e) {
    showToast('Upload error: ' + e.message, 'error', 5000);
  }
}

async function forceSyncNow() {
  showToast('Syncing...', 'info', 2000);
  const ok = await syncAll();
  if (ok) {
    await loadStateFromDB();
    renderCurrentPage();
    showToast('Sync complete!', 'success');
  } else {
    showToast('Sync failed', 'error');
  }
}

// ══════════════════════════════════════════════════════════════
