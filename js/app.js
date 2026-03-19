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
let _savePending = 0; // count of in-flight Supabase writes
let profilePreviousPage = 'customers';
let leafletMap = null;
let mapMarkers = [];
let mapRouteLines = [];
let editingOrderId = null;
let reportTab = 'overview';
let dhSearchTerm = '';

// ── Double-click protection utility ────────────────────────

let _btnLock = false;
function btnLock(fn) {
  if (_btnLock) return;
  _btnLock = true;
  try { fn(); } finally { setTimeout(() => _btnLock = false, 1500); }
}

// ── Load state from Supabase ──────────────────────────────

async function loadStateFromDB() {
  const results = await Promise.allSettled([
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
  const [customers, products, assignments, routeOrder, orders,
         debts, debtHistory, pricing, recurring] = results.map(r =>
    r.status === 'fulfilled' ? r.value : null
  );

  // Map customers to STOPS format for backward compat
  STOPS = (customers || []).map(c => ({
    id: c.id, n: c.name, a: c.address, c: c.city, p: c.postcode,
    cn: c.contact_name || '', ph: c.phone || '', em: c.email || ''
  }));

  S.assign = assignments || {};
  S.routeOrder = routeOrder || {};
  S.geo = {};
  (customers || []).forEach(c => {
    if (c.lat && c.lng) {
      S.geo[c.id] = { lat: c.lat, lng: c.lng };
    }
  });
  S.orders = orders || {};
  S.debts = debts || {};
  S.debtHistory = repairDebtHistoryTypes(debtHistory || {});
  cacheSet('debt_history', S.debtHistory);
  S.cnotes = {};
  (customers || []).forEach(c => { if (c.note) S.cnotes[c.id] = c.note; });
  S.catalog = (products || []).map(p => ({
    name: p.name, unit: p.unit, price: parseFloat(p.price),
    stock: p.stock, trackStock: p.track_stock
  }));
  S.customerPricing = pricing || {};
  S.recurringOrders = recurring || {};

  // Load settings stored in app_settings table
  const [customerProducts, brands, brandList, ordersLockedOrders, savedLastPage, savedLastProfileId] = await Promise.all([
    DB.getSetting('customer_products', {}),
    DB.getSetting('customer_brands', {}),
    DB.getSetting('brand_list', []),
    DB.getSetting('ordersLockedOrders', []),
    DB.getSetting('lastPage', 'route'),
    DB.getSetting('lastProfileId', null)
  ]);
  S.customerProducts = customerProducts || {};
  S.brands = brands || {};
  S.brandList = brandList || [];
  S.ordersLockedOrders = ordersLockedOrders || [];
  cacheSet('_lastPage', savedLastPage || 'route');
  cacheSet('_lastProfileId', savedLastProfileId);

  // Load route locked stops for all days
  if (typeof _routeLockedCache !== 'undefined') {
    const lockPromises = DAYS.map(d =>
      DB.getSetting('routeLockedStops_' + d.id, []).then(v => {
        _routeLockedCache[d.id] = v || [];
      }).catch(() => {})
    );
    await Promise.allSettled(lockPromises);
  }
}

function initUIState() {
  S.routeWeek = getCurrentWeek();
  S.routeDay = getTodayDayIndex();
  S.ordersFilter = 'pending';
  S.ordersSearch = '';
  S.customersFilter = 'all';
  S.customersBrandFilter = '';
  S.customersSearch = '';
  S.reportRange = 'month';
  S.reportStart = '';
  S.reportEnd = '';
  S.reportProducts = [];
  S.mapFilter = 'all';
}

// ── Save helpers (write to Supabase + update memory) ────────

// Write to Supabase first (source of truth), then update in-memory cache.
// Memory cache is only for avoiding redundant fetches within the same session.
const _persistLocks = {};
async function _persist(cacheKey, data, supabaseWrite) {
  if (_persistLocks[cacheKey]) {
    try { await _persistLocks[cacheKey]; } catch {}
  }
  // Update memory immediately so UI reflects changes
  cacheSet(cacheKey, data);
  _savePending++;
  _updateSaveIndicator();
  const promise = (async () => {
    try {
      const result = await supabaseWrite();
      // Promise.allSettled never throws — check individual results
      if (Array.isArray(result)) {
        const failed = result.filter(r =>
          r.status === 'rejected' || (r.status === 'fulfilled' && r.value === null)
        );
        if (failed.length > 0) {
          console.warn(`save ${cacheKey}: ${failed.length}/${result.length} write(s) failed`);
          if (typeof showToast === 'function') showToast(`Save failed (${failed.length} error${failed.length > 1 ? 's' : ''})`, 'error', 4000);
        }
      }
    } catch (e) {
      console.warn(`save ${cacheKey}: Supabase write failed`, e.message);
      if (typeof showToast === 'function') showToast(`Save failed: ${cacheKey}`, 'error', 3000);
    } finally {
      _savePending--;
      _updateSaveIndicator();
      delete _persistLocks[cacheKey];
    }
  })();
  _persistLocks[cacheKey] = promise;
  return promise;
}

// Visual indicator when saves are in-flight
function _updateSaveIndicator() {
  let el = document.getElementById('save-indicator');
  if (_savePending > 0 || offlineQueue.length > 0) {
    if (!el) {
      el = document.createElement('div');
      el.id = 'save-indicator';
      el.style.cssText = 'position:fixed;top:0;left:0;right:0;height:3px;background:var(--primary,#E85D3A);z-index:9999;animation:save-pulse 1.5s ease-in-out infinite';
      document.body.appendChild(el);
      if (!document.getElementById('save-pulse-style')) {
        const style = document.createElement('style');
        style.id = 'save-pulse-style';
        style.textContent = '@keyframes save-pulse{0%,100%{opacity:1}50%{opacity:0.3}}';
        document.head.appendChild(style);
      }
    }
  } else if (el) {
    el.remove();
  }
}

const save = {
  stops: () => {
    const mapped = STOPS.map(s => ({
      id: s.id, name: s.n, address: s.a, city: s.c, postcode: s.p,
      lat: (S.geo[s.id] && S.geo[s.id].lat) || null,
      lng: (S.geo[s.id] && S.geo[s.id].lng) || null,
      note: S.cnotes[s.id] || '', contact_name: s.cn || '',
      phone: s.ph || '', email: s.em || ''
    }));
    return _persist('customers', mapped, () =>
      Promise.allSettled(STOPS.map(s => DB.saveCustomer({
        id: s.id, name: s.n, address: s.a, city: s.c, postcode: s.p,
        lat: (S.geo[s.id] && S.geo[s.id].lat) || null,
        lng: (S.geo[s.id] && S.geo[s.id].lng) || null,
        note: S.cnotes[s.id] || '', contact_name: s.cn || '',
        phone: s.ph || '', email: s.em || ''
      })))
    );
  },
  assign: () => {
    return _persist('assignments', { ...S.assign }, () =>
      Promise.allSettled(Object.entries(S.assign).map(([cid, did]) => DB.setAssignment(cid, did)))
    );
  },
  routeOrder: () => {
    return _persist('route_order', { ...S.routeOrder }, () =>
      Promise.allSettled(Object.entries(S.routeOrder).map(([dayId, cids]) =>
        DB.saveRouteOrder(dayId, Array.isArray(cids) ? cids : [])
      ))
    );
  },
  geo: () => { return save.stops(); },
  orders: (changedOrderIds) => {
    return _persist('orders', { ...S.orders }, () => {
      if (!changedOrderIds || !Array.isArray(changedOrderIds)) return Promise.resolve();
      return Promise.allSettled(changedOrderIds.map(id =>
        S.orders[id] ? DB.saveOrder(S.orders[id]) : DB.deleteOrder(id)
      ));
    });
  },
  debts: () => {
    return _persist('debts', { ...S.debts }, () =>
      Promise.allSettled(Object.entries(S.debts).map(([cid, amt]) => DB.setDebt(cid, amt)))
    );
  },
  debtHistory: (changedCustomerIds) => {
    Object.values(S.debtHistory).forEach(entries => {
      if (Array.isArray(entries)) entries.forEach(e => delete e._new);
    });
    const ids = Array.isArray(changedCustomerIds) && changedCustomerIds.length > 0
      ? changedCustomerIds : (profileStopId ? [profileStopId] : []);
    return _persist('debt_history', { ...S.debtHistory }, () =>
      Promise.allSettled(ids.map(cid => DB.replaceDebtHistory(cid, S.debtHistory[cid] || [])))
    );
  },
  cnotes: () => { return save.stops(); },
  catalog: () => {
    const mapped = S.catalog.map(c => ({
      name: c.name, unit: c.unit || '1', price: c.price || 0,
      stock: c.stock ?? null, track_stock: c.trackStock !== false,
      sort_order: c.sort_order || 0
    }));
    return _persist('products', mapped, () =>
      Promise.allSettled(mapped.map(p =>
        dbInsert('products', p, { upsert: true, onConflict: 'name' }).catch(e => {
          if (typeof dbLog === 'function') dbLog(`save product FAILED: ${p.name} - ${e.message}`);
        })
      ))
    );
  },
  pricing: () => {
    return _persist('customer_pricing', { ...S.customerPricing }, () =>
      Promise.allSettled(Object.entries(S.customerPricing).map(([cid, pm]) =>
        DB.setCustomerPricing(cid, pm || {})
      ))
    );
  },
  customerProducts: () => {
    cacheSet('customer_products', S.customerProducts);
    return DB.setSetting('customer_products', S.customerProducts);
  },
  brands: () => {
    cacheSet('customer_brands', S.brands);
    return DB.setSetting('customer_brands', S.brands);
  },
  brandList: () => {
    cacheSet('brand_list', S.brandList);
    return DB.setSetting('brand_list', S.brandList);
  },
  recurringOrders: () => {
    return _persist('recurring_orders', { ...S.recurringOrders }, () =>
      Promise.allSettled(Object.entries(S.recurringOrders).map(([cid, data]) =>
        DB.setRecurringOrder(cid, data)
      ))
    );
  }
};

// ── Navigation ─────────────────────────────────────────────

function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pageEl = document.getElementById('page-' + name);
  if (pageEl) pageEl.classList.add('active');
  curPage = name;
  DB.setSetting('lastPage', name);
  if (name === 'profile') DB.setSetting('lastProfileId', profileStopId);
  document.querySelectorAll('.nav-btn').forEach(b => {
    const pg = b.dataset.page;
    b.classList.toggle('active',
      pg === name ||
      (name === 'profile' && pg === 'customers') ||
      (name === 'map' && pg === 'settings') ||
      (name === 'catalog' && pg === 'settings') ||
      (name === 'neworder' && pg === 'orders')
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
    case 'neworder': renderNewOrderPage(); break;
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

// ── Alert / Confirm (queued) ────────────────────────────────

const _modalQueue = [];
let _modalActive = false;

function _processModalQueue() {
  if (_modalActive || _modalQueue.length === 0) return;
  _modalActive = true;
  const { html, resolve, onShow } = _modalQueue.shift();
  openModal(html);
  window._currentModalResolve = resolve;
  if (onShow) setTimeout(onShow, 100);
}

function _resolveCurrentModal(val) {
  closeModal();
  _modalActive = false;
  if (window._currentModalResolve) {
    const r = window._currentModalResolve;
    window._currentModalResolve = null;
    r(val);
  }
  // Process next queued modal after a short delay
  setTimeout(_processModalQueue, 100);
}

function appAlert(msg, allowHtml) {
  return new Promise(resolve => {
    const safe = allowHtml ? msg : escHtml(msg);
    _modalQueue.push({
      html: `
        <div class="modal-handle"></div>
        <div style="padding:24px 20px;text-align:center">
          <p style="font-size:15px;margin-bottom:20px">${safe}</p>
          <button class="btn btn-primary btn-block" onclick="_appAlertOk()">OK</button>
        </div>`,
      resolve
    });
    _processModalQueue();
  });
}

function _appAlertOk() {
  _resolveCurrentModal(undefined);
}

function appConfirm(msg, allowHtml) {
  return new Promise(resolve => {
    const safe = allowHtml ? msg : escHtml(msg);
    _modalQueue.push({
      html: `
        <div class="modal-handle"></div>
        <div style="padding:24px 20px;text-align:center">
          <p style="font-size:15px;margin-bottom:20px">${safe}</p>
          <div style="display:flex;gap:8px">
            <button class="btn btn-outline btn-block" onclick="_appConfirmAnswer(false)">No</button>
            <button class="btn btn-primary btn-block" onclick="_appConfirmAnswer(true)">Yes</button>
          </div>
        </div>`,
      resolve
    });
    _processModalQueue();
  });
}

function _appConfirmAnswer(val) {
  _resolveCurrentModal(val);
}

function appPromptInput(msg, allowHtml) {
  return new Promise(resolve => {
    const safe = allowHtml ? msg : escHtml(msg);
    _modalQueue.push({
      html: `
        <div class="modal-handle"></div>
        <div style="padding:24px 20px;text-align:center">
          <p style="font-size:15px;margin-bottom:16px">${safe}</p>
          <input type="text" id="_appPromptField" autocomplete="off" style="width:100%;padding:10px 12px;font-size:16px;border:2px solid var(--border);border-radius:8px;text-align:center;letter-spacing:2px;margin-bottom:16px" />
          <div style="display:flex;gap:8px">
            <button class="btn btn-outline btn-block" onclick="_appPromptAnswer(null)">Cancel</button>
            <button class="btn btn-danger btn-block" onclick="_appPromptAnswer(document.getElementById('_appPromptField').value)">Confirm</button>
          </div>
        </div>`,
      resolve,
      onShow: () => { const f = document.getElementById('_appPromptField'); if (f) f.focus(); }
    });
    _processModalQueue();
  });
}

function _appPromptAnswer(val) {
  _resolveCurrentModal(val);
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

// ── Init ───────────────────────────────────────────────────

async function init() {
  // Check if DB tables exist
  await checkDbTables();

  if (!_dbReady) {
    setTimeout(() => {
      showToast('Database tables not found — go to Settings to set up.', 'error', 8000);
    }, 1500);
  }

  // Always load from Supabase (source of truth)
  try {
    await loadStateFromDB();
    console.log('Init: loaded from Supabase, STOPS:', STOPS.length);
  } catch (e) {
    console.warn('Init: loadStateFromDB failed:', e.message);
  }

  initUIState();

  // Set initial report range
  setReportRange('month');

  // Nav binding
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => showPage(btn.dataset.page));
  });

  // Seed customers (one-time import, safe to remove after first run)
  if (typeof runCustomerSeed === 'function') runCustomerSeed();

  // Auto-create recurring orders for today
  autoCreateRecurringOrders();

  // Restore last page (loaded from Supabase in loadStateFromDB)
  const savedPage = cacheGet('_lastPage', 'route');
  if (savedPage === 'profile') {
    const savedId = cacheGet('_lastProfileId', null);
    const parsedId = parseInt(savedId);
    if (savedId && !isNaN(parsedId) && getStop(parsedId)) {
      profileStopId = parsedId;
      showPage('profile');
    } else {
      showPage('route');
    }
  } else {
    showPage(savedPage);
  }

  // Periodic sync — always use new DB (legacy is one-time migration only)
  let _syncInProgress = false;
  let _lastSyncHash = '';
  const doSync = async () => {
    if (!_dbReady || _syncInProgress || _savePending > 0 || offlineQueue.length > 0) return;
    _syncInProgress = true;
    try {
      const ok = await syncAll();
      if (ok && _savePending === 0) {
        const newHash = JSON.stringify([
          cacheGet('customers', null)?.length,
          cacheGet('orders', null) && Object.keys(cacheGet('orders', {})).length,
          cacheGet('debts', null) && Object.keys(cacheGet('debts', {})).length
        ]);
        if (newHash !== _lastSyncHash) {
          _lastSyncHash = newHash;
          await loadStateFromDB();
          renderCurrentPage();
        }
      }
    } catch (e) {
      console.warn('doSync error:', e.message);
    } finally {
      _syncInProgress = false;
    }
  };
  const _syncInterval = setInterval(() => { if (navigator.onLine) doSync(); }, 5 * 60 * 1000);
  window.addEventListener('online', () => { doSync(); flushOfflineQueue(); });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && navigator.onLine) doSync();
  });
}

document.addEventListener('DOMContentLoaded', init);

// Prevent accidental data loss — warn user if writes are still in-flight
window.addEventListener('beforeunload', (e) => {
  if (_savePending > 0 || offlineQueue.length > 0) {
    e.preventDefault();
    e.returnValue = 'Changes are still saving. Are you sure you want to leave?';
    return e.returnValue;
  }
});

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js')
    .catch(e => console.warn('SW registration failed:', e.message));
}
