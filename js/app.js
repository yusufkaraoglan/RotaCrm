'use strict';
// ═══════════════════════════════════════════════════════════
// APP CORE - State, Navigation, Init
// ═══════════════════════════════════════════════════════════

// ── Constants ──────────────────────────────────────────────

const STOPS_DEFAULT = [];  // Will be populated from DB

const DAYS = [
  {id:'wA0',label:'Monday',   week:'A',color:'#E85D3A',ci:0},
  {id:'wA1',label:'Tuesday',  week:'A',color:'#F0A500',ci:1},
  {id:'wA2',label:'Wednesday',week:'A',color:'#12B76A',ci:2},
  {id:'wA3',label:'Thursday', week:'A',color:'#2E90FA',ci:3},
  {id:'wA4',label:'Friday',   week:'A',color:'#9E77ED',ci:4},
  {id:'wB0',label:'Monday',   week:'B',color:'#F63D68',ci:5},
  {id:'wB1',label:'Tuesday',  week:'B',color:'#06AED4',ci:6},
  {id:'wB2',label:'Wednesday',week:'B',color:'#DC6803',ci:7},
  {id:'wB3',label:'Thursday', week:'B',color:'#6172F3',ci:8},
  {id:'wB4',label:'Friday',   week:'B',color:'#2D9D6B',ci:9}
];

// ── Global State ───────────────────────────────────────────

let STOPS = [];
let S = {};
let curPage = 'route';
let profileStopId = null;
let tempOrderItems = [];
let tempOrderCustomerId = null;
let tempOrderDeliveryDate = '';
let deliveryStopId = null;
let deliveryPayMethod = null;
let deliveryOrderIds = null;
let profilePreviousPage = 'customers';
let leafletMap = null;
let mapMarkers = [];
let mapRouteLines = [];
let editingCatalogIdx = -1;
let editingOrderId = null;
let reportTab = 'overview';
let dhSearchTerm = '';

// ── Double-click protection utility ────────────────────────

let _btnLock = false;
function btnLock(fn) {
  if (_btnLock) return;
  _btnLock = true;
  try { fn(); } finally { setTimeout(() => _btnLock = false, 500); }
}

// ── Legacy load (from localStorage, for backward compat) ──

function loadStateLegacy() {
  STOPS = legacyGet('stops', STOPS_DEFAULT);
  S.assign = legacyGet('assign', {});
  S.routeOrder = legacyGet('routeOrder', null);
  if (!S.routeOrder) {
    S.routeOrder = legacyGet('order', {});
  }
  S.geo = legacyGet('geo', {});
  S.orders = legacyGet('ordersV2', {});
  S.debts = legacyGet('debts', {});
  S.debtHistory = legacyGet('debtHistory', {});
  S.cnotes = legacyGet('cnotes', {});
  S.catalog = legacyGet('catalog', []);
  S.customerPricing = legacyGet('customerPricing', null);
  if (!S.customerPricing) S.customerPricing = legacyGet('stopCatalog', {});
  S.customerProducts = legacyGet('customerProducts', {});
  S.recurringOrders = legacyGet('recurringOrders', {});
  initUIState();
}

// ── New DB load ────────────────────────────────────────────

async function loadStateFromDB() {
  const [customers, products, assignments, routeOrder, orders,
         debts, debtHistory, pricing, recurring] = await Promise.all([
    DB.getCustomers(),
    DB.getProducts(),
    DB.getAssignments(),
    DB.getRouteOrder(),
    DB.getOrders(),
    DB.getDebts(),
    DB.getDebtHistory(),
    DB.getCustomerPricing(),
    DB.getRecurringOrders()
  ]);

  // Map customers to STOPS format for backward compat
  STOPS = customers.map(c => ({
    id: c.id, n: c.name, a: c.address, c: c.city, p: c.postcode,
    cn: c.contact_name || '', ph: c.phone || '', em: c.email || ''
  }));

  S.assign = assignments;
  S.routeOrder = routeOrder;
  S.geo = {};
  customers.forEach(c => {
    if (c.lat && c.lng) {
      S.geo[c.id] = { lat: c.lat, lng: c.lng };
    }
  });
  S.orders = orders;
  S.debts = debts;
  S.debtHistory = debtHistory;
  S.cnotes = {};
  customers.forEach(c => { if (c.note) S.cnotes[c.id] = c.note; });
  S.catalog = products.map(p => ({
    name: p.name, unit: p.unit, price: parseFloat(p.price),
    stock: p.stock, trackStock: p.track_stock
  }));
  S.customerPricing = pricing;
  S.customerProducts = cacheGet('customer_products', {});
  S.recurringOrders = recurring;

  initUIState();
}

function initUIState() {
  S.routeWeek = getCurrentWeek();
  S.routeDay = getTodayDayIndex();
  S.ordersFilter = 'pending';
  S.ordersSearch = '';
  S.ordersLockedOrders = cacheGet('setting_ordersLockedOrders', legacyGet('ordersLockedOrders', []));
  S.customersFilter = 'all';
  S.customersSearch = '';
  S.reportRange = 'month';
  S.reportStart = '';
  S.reportEnd = '';
  S.reportProducts = [];
  S.mapFilter = 'all';
}

// ── Save helpers (write to both state + DB) ────────────────

const save = {
  stops: () => {
    cacheSet('customers', STOPS.map(s => ({
      id: s.id, name: s.n, address: s.a, city: s.c, postcode: s.p,
      lat: (S.geo[s.id] && S.geo[s.id].lat) || null,
      lng: (S.geo[s.id] && S.geo[s.id].lng) || null,
      note: S.cnotes[s.id] || '', contact_name: s.cn || '',
      phone: s.ph || '', email: s.em || ''
    })));
    // Persist each customer to Supabase
    STOPS.forEach(s => {
      DB.saveCustomer({
        id: s.id, name: s.n, address: s.a, city: s.c, postcode: s.p,
        lat: (S.geo[s.id] && S.geo[s.id].lat) || null,
        lng: (S.geo[s.id] && S.geo[s.id].lng) || null,
        note: S.cnotes[s.id] || '', contact_name: s.cn || '',
        phone: s.ph || '', email: s.em || ''
      });
    });
  },
  assign: () => {
    cacheSet('assignments', S.assign);
    // Persist each assignment to Supabase
    Object.entries(S.assign).forEach(([customerId, dayId]) => {
      DB.setAssignment(customerId, dayId);
    });
  },
  routeOrder: () => {
    cacheSet('route_order', S.routeOrder);
    // Persist each day's route order to Supabase
    Object.entries(S.routeOrder).forEach(([dayId, customerIds]) => {
      DB.saveRouteOrder(dayId, Array.isArray(customerIds) ? customerIds : []);
    });
  },
  geo: () => { /* stored in customers table via save.stops */ },
  orders: (changedOrderIds) => {
    cacheSet('orders', S.orders);
    // Also persist changed orders to Supabase
    if (changedOrderIds && Array.isArray(changedOrderIds)) {
      changedOrderIds.forEach(id => {
        if (S.orders[id]) DB.saveOrder(S.orders[id]);
        else DB.deleteOrder(id);
      });
    }
  },
  debts: () => {
    cacheSet('debts', S.debts);
    // Persist each debt to Supabase
    Object.entries(S.debts).forEach(([customerId, amount]) => {
      DB.setDebt(customerId, amount);
    });
  },
  debtHistory: () => {
    cacheSet('debt_history', S.debtHistory);
    // Persist debt history entries to Supabase
    Object.entries(S.debtHistory).forEach(([customerId, entries]) => {
      if (Array.isArray(entries)) {
        entries.forEach(entry => {
          DB.addDebtHistoryEntry(customerId, entry);
        });
      }
    });
  },
  cnotes: () => { /* stored in customers table via save.stops */ },
  catalog: () => {
    cacheSet('products', S.catalog.map(c => ({
      name: c.name, unit: c.unit || '1', price: c.price || 0,
      stock: c.stock ?? null, track_stock: c.trackStock !== false,
      sort_order: c.sort_order || 0
    })));
    // Persist each product to Supabase
    S.catalog.forEach(c => {
      DB.saveProduct({
        name: c.name, unit: c.unit || '1', price: c.price || 0,
        stock: c.stock ?? null, track_stock: c.trackStock !== false,
        sort_order: c.sort_order || 0
      });
    });
  },
  pricing: () => {
    cacheSet('customer_pricing', S.customerPricing);
    // Persist each customer's pricing to Supabase
    Object.entries(S.customerPricing).forEach(([customerId, pricingMap]) => {
      DB.setCustomerPricing(customerId, pricingMap || {});
    });
  },
  customerProducts: () => cacheSet('customer_products', S.customerProducts),
  recurringOrders: () => {
    cacheSet('recurring_orders', S.recurringOrders);
    // Persist each recurring order to Supabase
    Object.entries(S.recurringOrders).forEach(([customerId, data]) => {
      DB.setRecurringOrder(customerId, data);
    });
  }
};

// Legacy save helpers (still used by existing code during transition)
function lsSave(k, v) {
  try { localStorage.setItem('cr4_' + k, JSON.stringify(v)); } catch {}
  sbSet(k, v);
}

function lsGet(k, d) {
  try { const v = localStorage.getItem('cr4_' + k); return v !== null ? JSON.parse(v) : d; } catch { return d; }
}

function lsSaveLocal(k, v) {
  try { localStorage.setItem('cr4_' + k, JSON.stringify(v)); } catch {}
}

// ── Navigation ─────────────────────────────────────────────

function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pageEl = document.getElementById('page-' + name);
  if (pageEl) pageEl.classList.add('active');
  curPage = name;
  localStorage.setItem('lastPage', name);
  if (name === 'profile') localStorage.setItem('lastProfileId', profileStopId);
  document.querySelectorAll('.nav-btn').forEach(b => {
    const pg = b.dataset.page;
    b.classList.toggle('active',
      pg === name ||
      (name === 'profile' && pg === 'customers') ||
      (name === 'map' && pg === 'settings') ||
      (name === 'catalog' && pg === 'settings')
    );
  });
  renderCurrentPage();
}

function renderCurrentPage() {
  switch (curPage) {
    case 'route': renderRoute(); break;
    case 'orders': renderOrders(); break;
    case 'customers': renderCustomers(); break;
    case 'profile': renderProfile(); break;
    case 'reports': renderReports(); break;
    case 'settings': renderSettings(); break;
    case 'map': renderMapPage(); break;
    case 'catalog': renderCatalog(); break;
    case 'delivery-history': reportTab = 'history'; showPage('reports'); break;
  }
}

// ── Modal System ───────────────────────────────────────────

function openModal(html) {
  document.getElementById('modal-content').innerHTML = html;
  document.getElementById('modal-overlay').classList.add('show');
  document.body.classList.add('modal-open');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('show');
  document.getElementById('modal-content').innerHTML = '';
  document.body.classList.remove('modal-open');
}

// ── Alert / Confirm ────────────────────────────────────────

function appAlert(msg) {
  return new Promise(resolve => {
    openModal(`
      <div class="modal-handle"></div>
      <div style="padding:24px 20px;text-align:center">
        <p style="font-size:15px;margin-bottom:20px">${msg}</p>
        <button class="btn btn-primary btn-block" onclick="closeModal();(${resolve})()">OK</button>
      </div>
    `);
  });
}

function appConfirm(msg) {
  return new Promise(resolve => {
    const yes = () => { closeModal(); resolve(true); };
    const no = () => { closeModal(); resolve(false); };
    openModal(`
      <div class="modal-handle"></div>
      <div style="padding:24px 20px;text-align:center">
        <p style="font-size:15px;margin-bottom:20px">${msg}</p>
        <div style="display:flex;gap:8px">
          <button class="btn btn-outline btn-block" id="confirm-no">No</button>
          <button class="btn btn-primary btn-block" id="confirm-yes">Yes</button>
        </div>
      </div>
    `);
    document.getElementById('confirm-yes').onclick = yes;
    document.getElementById('confirm-no').onclick = no;
  });
}

// ── Toast Notifications ────────────────────────────────────

function showToast(message, type = 'info', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ── Mobile Debug Log ────────────────────────────────────────
// Shows DB errors on screen (tap Settings title 5x to toggle)

const _debugLog = [];
let _debugVisible = false;
let _debugTapCount = 0;

function dbLog(msg) {
  const entry = new Date().toLocaleTimeString() + ' ' + msg;
  _debugLog.push(entry);
  if (_debugLog.length > 50) _debugLog.shift();
  console.error('[DB]', msg);
  // Show toast for errors
  if (msg.includes('FAILED')) showToast(msg.slice(0, 80), 'error', 5000);
  if (_debugVisible) _renderDebugPanel();
}

function toggleDebugPanel() {
  _debugTapCount++;
  setTimeout(() => _debugTapCount = 0, 2000);
  if (_debugTapCount >= 5) {
    _debugVisible = !_debugVisible;
    _debugTapCount = 0;
    if (_debugVisible) _renderDebugPanel();
    else { const p = document.getElementById('debug-panel'); if (p) p.remove(); }
  }
}

function _renderDebugPanel() {
  let panel = document.getElementById('debug-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'debug-panel';
    panel.style.cssText = 'position:fixed;bottom:60px;left:0;right:0;max-height:40vh;overflow:auto;background:#111;color:#0f0;font:11px/1.4 monospace;padding:8px;z-index:99999;border-top:2px solid #0f0';
    document.body.appendChild(panel);
  }
  panel.innerHTML = '<b>DB Log</b> <button onclick="_debugVisible=false;this.parentElement.remove()" style="float:right;color:#f00;background:none;border:none;font-size:14px">✕</button><br>'
    + (_debugLog.length ? _debugLog.map(l => `<div style="border-bottom:1px solid #333;padding:2px 0">${l}</div>`).join('') : '<i>No logs yet</i>');
  panel.scrollTop = panel.scrollHeight;
}

// ── Initial Upload (local → Supabase, respects FK order) ───

async function _initialUpload() {
  // Step 1: customers + products (no FK deps)
  const step1 = [];
  STOPS.forEach(s => step1.push(DB.saveCustomer({
    id: s.id, name: s.n, address: s.a, city: s.c, postcode: s.p,
    lat: (S.geo[s.id] && S.geo[s.id].lat) || null,
    lng: (S.geo[s.id] && S.geo[s.id].lng) || null,
    note: S.cnotes[s.id] || '', contact_name: s.cn || '',
    phone: s.ph || '', email: s.em || ''
  })));
  S.catalog.forEach(c => step1.push(DB.saveProduct({
    name: c.name, unit: c.unit || '1', price: c.price || 0,
    stock: c.stock ?? null, track_stock: c.trackStock !== false,
    sort_order: c.sort_order || 0
  })));
  await Promise.all(step1);

  // Step 2: everything that references customers
  const step2 = [];
  Object.entries(S.assign).forEach(([cid, dayId]) => {
    step2.push(DB.setAssignment(cid, dayId));
  });
  Object.entries(S.routeOrder).forEach(([dayId, cids]) => {
    step2.push(DB.saveRouteOrder(dayId, Array.isArray(cids) ? cids : []));
  });
  Object.values(S.orders).forEach(order => {
    step2.push(DB.saveOrder(order));
  });
  Object.entries(S.debts).forEach(([cid, amount]) => {
    step2.push(DB.setDebt(cid, amount));
  });
  Object.entries(S.debtHistory || {}).forEach(([cid, entries]) => {
    if (Array.isArray(entries)) {
      entries.forEach(entry => step2.push(DB.addDebtHistoryEntry(cid, entry)));
    }
  });
  Object.entries(S.customerPricing || {}).forEach(([cid, pm]) => {
    step2.push(DB.setCustomerPricing(cid, pm || {}));
  });
  Object.entries(S.recurringOrders || {}).forEach(([cid, data]) => {
    step2.push(DB.setRecurringOrder(cid, data));
  });
  await Promise.all(step2);
}

// ── Init ───────────────────────────────────────────────────

async function init() {
  let dataLoaded = false;

  // 0) Check if DB tables exist
  await checkDbTables();

  // 1) Try new DB tables first (if previously migrated or has cache)
  const migrated = cacheGet('db_migrated', false);
  if (migrated) {
    await loadStateFromDB();
    dataLoaded = STOPS.length > 0;
    console.log('Init: loaded from new DB, STOPS:', STOPS.length);
  }

  // 2) If no data yet and DB is ready, try to fetch from new tables directly
  if (!dataLoaded && _dbReady) {
    try {
      const customers = await dbSelect('customers', 'select=id&limit=1');
      if (customers && customers.length > 0) {
        console.log('Init: new tables have data, loading from DB');
        cacheSet('db_migrated', true);
        await loadStateFromDB();
        dataLoaded = STOPS.length > 0;
      }
    } catch (e) {
      console.warn('Init: new tables check failed:', e.message);
    }
  }

  // 3) If still no data, try legacy localStorage / cr4_store
  if (!dataLoaded) {
    console.log('Init: trying legacy data');
    loadStateLegacy();
    dataLoaded = STOPS.length > 0;

    if (!dataLoaded) {
      try {
        await syncFromSupabase();
        dataLoaded = STOPS.length > 0;
        console.log('Init: after legacy sync, STOPS:', STOPS.length);
      } catch (e) {
        console.warn('Init: legacy sync failed:', e.message);
      }
    }
  }

  if (!dataLoaded) {
    console.log('Init: no data found in any source');
  }

  // 4) Auto-upload: tables exist + we have local data + DB is empty
  if (dataLoaded && _dbReady) {
    try {
      const dbCustomers = await dbSelect('customers', 'select=id&limit=1');
      if (!dbCustomers || dbCustomers.length === 0) {
        console.log('Init: DB tables empty, auto-uploading local data...');
        showToast('Uploading data to cloud...', 'info', 10000);
        await _initialUpload();
        showToast('Data uploaded to cloud!', 'success');
      }
      cacheSet('db_migrated', true);
    } catch (e) {
      console.warn('Init: auto-upload failed:', e.message);
    }
  }

  // Notify user if DB tables are missing
  if (!_dbReady) {
    setTimeout(() => {
      showToast('Database tables not found — data is only saved locally. Go to Settings to set up cloud sync.', 'error', 8000);
    }, 1500);
  }

  // Set initial report range
  setReportRange('month');

  // Nav binding
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => showPage(btn.dataset.page));
  });

  // Auto-create recurring orders for today
  autoCreateRecurringOrders();

  // Restore last page
  const savedPage = localStorage.getItem('lastPage') || 'route';
  if (savedPage === 'profile') {
    const savedId = localStorage.getItem('lastProfileId');
    if (savedId && getStop(parseInt(savedId))) {
      profileStopId = parseInt(savedId);
      showPage('profile');
    } else {
      showPage('route');
    }
  } else {
    showPage(savedPage);
  }

  // Periodic sync
  const useNewDB = cacheGet('db_migrated', false);
  if (useNewDB) {
    const doSync = async () => {
      if (!_dbReady) return; // skip sync if tables don't exist
      const ok = await syncAll();
      if (ok) { await loadStateFromDB(); renderCurrentPage(); }
    };
    setInterval(() => { if (navigator.onLine) doSync(); }, 5 * 60 * 1000);
    window.addEventListener('online', () => { doSync(); flushOfflineQueue(); });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && navigator.onLine) doSync();
    });
  } else {
    // Legacy periodic sync
    setInterval(() => { if (navigator.onLine) syncFromSupabase(); }, 5 * 60 * 1000);
    window.addEventListener('online', () => syncFromSupabase());
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && navigator.onLine) syncFromSupabase();
    });
  }
}

// Legacy sync function
async function syncFromSupabase() {
  try {
    const r = await fetch(`${SB_URL}/rest/v1/cr4_store?select=key,value`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const rows = await r.json();
    if (!Array.isArray(rows)) throw new Error('Invalid response');
    rows.forEach(row => {
      try { localStorage.setItem('cr4_' + row.key, JSON.stringify(row.value)); } catch {}
    });
    loadStateLegacy();
    renderCurrentPage();
  } catch (e) {
    console.warn('Sync error:', e.message);
  }
}

async function pushAllToSupabase() {
  const keys = ['stops','assign','routeOrder','geo','ordersV2','debts','debtHistory','cnotes','catalog','customerPricing','customerProducts','recurringOrders'];
  for (const k of keys) {
    const v = legacyGet(k, null);
    if (v !== null) await sbSet(k, v);
  }
  showToast('All data uploaded to cloud.', 'success');
}

document.addEventListener('DOMContentLoaded', init);

// Register service worker
if ('serviceWorker' in navigator) {
  const swCode = `
    const CACHE = 'costadoro-v5';
    const URLS = ['./', 'css/app.css', 'js/db.js', 'js/utils.js', 'js/app.js',
      'js/migrate.js',
      'js/pages/route.js', 'js/pages/orders.js', 'js/pages/customers.js', 'js/pages/profile.js',
      'js/pages/reports.js', 'js/pages/settings.js', 'js/pages/catalog.js', 'js/pages/map.js',
      'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
      'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'];
    self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(URLS)).then(() => self.skipWaiting())));
    self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
    self.addEventListener('fetch', e => {
      if (e.request.mode === 'navigate') {
        e.respondWith(fetch(e.request).then(res => {
          if (res.ok) { const clone = res.clone(); caches.open(CACHE).then(c => c.put('./', clone)); }
          return res;
        }).catch(() => caches.match(e.request).then(r => r || caches.match('./'))));
        return;
      }
      e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => {
        if (res.ok && e.request.url.startsWith('http')) { const clone = res.clone(); caches.open(CACHE).then(c => c.put(e.request, clone)); }
        return res;
      }).catch(() => caches.match('./'))));
    });
  `;
  const blob = new Blob([swCode], { type: 'application/javascript' });
  navigator.serviceWorker.register(URL.createObjectURL(blob)).catch(() => {});
}
