'use strict';
// ═══════════════════════════════════════════════════════════
// DATABASE LAYER - Supabase REST + localStorage cache
// ═══════════════════════════════════════════════════════════

// SB_URL and SB_KEY can be overridden via js/config.js (excluded from git).
// Defaults below are the public Supabase anon key (safe for frontend, protected by RLS).
if (typeof SB_URL === 'undefined') var SB_URL = 'https://mvvvqloqwjimlbqeotsd.supabase.co';
if (typeof SB_KEY === 'undefined') var SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12dnZxbG9xd2ppbWxicWVvdHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNTYxMDAsImV4cCI6MjA4NzkzMjEwMH0.tKSiEJouyr9dhs_vIAPUbX9NqtAsFAslZroNKtG2mBk';

const DB_HEADERS = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  'Content-Type': 'application/json'
};

// ── DB Ready Flag ─────────────────────────────────────────
// Set to false when tables don't exist (404 errors)
let _dbReady = true;

// ── Offline Queue ──────────────────────────────────────────
// Stores pending operations when offline
const offlineQueue = [];
let isSyncing = false;

// ── Low-level REST helpers ─────────────────────────────────

async function dbSelect(table, params = '') {
  try {
    const r = await fetch(`${SB_URL}/rest/v1/${table}?${params}`, {
      headers: DB_HEADERS
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } catch (e) {
    console.warn(`dbSelect ${table}:`, e.message);
    return null;
  }
}

// Check if required tables exist and RLS policies are configured
async function checkDbTables() {
  try {
    // 1) Check if tables exist
    const r = await fetch(`${SB_URL}/rest/v1/orders?select=id&limit=1`, {
      headers: DB_HEADERS
    });
    if (r.status === 404 || r.status === 400) {
      _dbReady = false;
      console.warn('DB tables not found — running in cache-only mode');
      if (typeof dbLog === 'function') dbLog('DB tables NOT found — cache-only mode');
      return false;
    }

    // 2) Check if RLS policies allow writes (test with a dummy upsert to app_settings)
    const testR = await fetch(`${SB_URL}/rest/v1/app_settings`, {
      method: 'POST',
      headers: { ...DB_HEADERS, 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify([{ key: '_health_check', value: new Date().toISOString() }])
    });
    if (testR.status === 403 || testR.status === 401) {
      _dbReady = false;
      const msg = 'Database connection blocked — RLS policies may be missing. Go to Settings for help.';
      console.error(msg);
      if (typeof dbLog === 'function') dbLog(msg);
      if (typeof showToast === 'function') setTimeout(() => showToast(msg, 'error', 10000), 1500);
      return false;
    }

    _dbReady = true;
    if (typeof dbLog === 'function') dbLog('DB tables OK + RLS policies OK');
    return true;
  } catch (e) {
    console.warn('DB check failed:', e.message);
    return false;
  }
}

async function dbInsert(table, data, opts = {}) {
  if (!_dbReady) {
    // Queue operation instead of silently discarding (#7)
    offlineQueue.push({ action: 'insert', table, data, opts });
    console.warn(`dbInsert ${table}: DB not ready, queued for later`);
    return null;
  }
  try {
    const headers = { ...DB_HEADERS };
    if (opts.upsert) headers['Prefer'] = 'resolution=merge-duplicates';
    if (opts.returnData) headers['Prefer'] = (headers['Prefer'] ? headers['Prefer'] + ',' : '') + 'return=representation';
    let url = `${SB_URL}/rest/v1/${table}`;
    if (opts.upsert && opts.onConflict) url += `?on_conflict=${opts.onConflict}`;
    const r = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(Array.isArray(data) ? data : [data])
    });
    if (!r.ok) {
      const body = await r.text().catch(() => '');
      let detail = `HTTP ${r.status}`;
      try { const j = JSON.parse(body); detail = j.message || j.details || detail; } catch {}
      throw new Error(detail);
    }
    if (opts.returnData) return await r.json();
    return true;
  } catch (e) {
    if (typeof dbLog === 'function') dbLog(`INSERT ${table}: ${e.message}`);
    else console.error(`dbInsert ${table}:`, e.message);
    if (!navigator.onLine) {
      offlineQueue.push({ action: 'insert', table, data, opts });
    }
    return null;
  }
}

async function dbUpdate(table, match, data) {
  if (!_dbReady) {
    offlineQueue.push({ action: 'update', table, match, data });
    console.warn(`dbUpdate ${table}: DB not ready, queued for later`);
    return null;
  }
  try {
    const params = Object.entries(match).map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`).join('&');
    const r = await fetch(`${SB_URL}/rest/v1/${table}?${params}`, {
      method: 'PATCH',
      headers: DB_HEADERS,
      body: JSON.stringify(data)
    });
    if (!r.ok) {
      const body = await r.text().catch(() => '');
      let detail = `HTTP ${r.status}`;
      try { const j = JSON.parse(body); detail = j.message || j.details || detail; } catch {}
      throw new Error(detail);
    }
    return true;
  } catch (e) {
    if (typeof dbLog === 'function') dbLog(`UPDATE ${table} FAILED: ${e.message}`);
    else console.error(`dbUpdate ${table} FAILED:`, e.message);
    if (!navigator.onLine) {
      offlineQueue.push({ action: 'update', table, match, data });
    }
    return null;
  }
}

async function dbDelete(table, match) {
  if (!_dbReady) {
    offlineQueue.push({ action: 'delete', table, match });
    console.warn(`dbDelete ${table}: DB not ready, queued for later`);
    return null;
  }
  try {
    const params = Object.entries(match).map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`).join('&');
    const r = await fetch(`${SB_URL}/rest/v1/${table}?${params}`, {
      method: 'DELETE',
      headers: DB_HEADERS
    });
    if (!r.ok) {
      const body = await r.text().catch(() => '');
      let detail = `HTTP ${r.status}`;
      try { const j = JSON.parse(body); detail = j.message || j.details || detail; } catch {}
      throw new Error(detail);
    }
    return true;
  } catch (e) {
    if (typeof dbLog === 'function') dbLog(`DELETE ${table} FAILED: ${e.message}`);
    else console.error(`dbDelete ${table} FAILED:`, e.message);
    if (!navigator.onLine) {
      offlineQueue.push({ action: 'delete', table, match });
    }
    return null;
  }
}

async function dbUpsert(table, data) {
  return dbInsert(table, data, { upsert: true });
}

// ── Offline Queue Flush ────────────────────────────────────

async function flushOfflineQueue() {
  if (isSyncing || offlineQueue.length === 0 || !navigator.onLine) return;
  isSyncing = true;
  try {
    let retries = 0;
    while (offlineQueue.length > 0) {
      const op = offlineQueue[0];
      let ok = false;
      try {
        if (op.action === 'insert') ok = await dbInsert(op.table, op.data, op.opts);
        else if (op.action === 'update') ok = await dbUpdate(op.table, op.match, op.data);
        else if (op.action === 'delete') ok = await dbDelete(op.table, op.match);
        if (ok) { offlineQueue.shift(); retries = 0; }
        else {
          retries++;
          if (retries >= 3) { offlineQueue.shift(); retries = 0; } // Skip permanently failed ops
          else { await new Promise(r => setTimeout(r, 2000)); } // Wait before retry instead of breaking
        }
      } catch (e) {
        console.warn('flushOfflineQueue error:', e.message);
        retries++;
        if (retries >= 3) { offlineQueue.shift(); retries = 0; }
        else { await new Promise(r => setTimeout(r, 2000)); }
      }
    }
  } finally {
    isSyncing = false; // Always reset even if loop breaks unexpectedly
  }
}

window.addEventListener('online', flushOfflineQueue);

// Retry offline queue periodically in case flush was skipped (e.g., isSyncing was true)
const _offlineQueueInterval = setInterval(() => {
  if (navigator.onLine && offlineQueue.length > 0) flushOfflineQueue();
}, 30000);

// ── localStorage Cache ─────────────────────────────────────

const CACHE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes staleness threshold
const _memCache = {}; // In-memory cache to avoid repeated JSON.parse

function cacheGet(key, fallback) {
  if (_memCache.hasOwnProperty(key)) return _memCache[key];
  try {
    const v = localStorage.getItem('cr5_' + key);
    if (v !== null) {
      const parsed = JSON.parse(v);
      _memCache[key] = parsed;
      return parsed;
    }
    return fallback;
  } catch { return fallback; }
}

function cacheSet(key, value) {
  _memCache[key] = value;
  try {
    localStorage.setItem('cr5_' + key, JSON.stringify(value));
    localStorage.setItem('cr5_ts_' + key, Date.now().toString());
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      console.warn('localStorage quota exceeded for key:', key);
      if (typeof showToast === 'function') showToast('Storage full — some data may not be saved locally', 'error', 5000);
    }
  }
}

function cacheIsFresh(key) {
  try {
    const ts = localStorage.getItem('cr5_ts_' + key);
    if (!ts) return false;
    return (Date.now() - parseInt(ts)) < CACHE_MAX_AGE_MS;
  } catch { return false; }
}

// ── Debt history helpers ──────────────────────────────────
function parseDebtHistoryRow(r) {
  let note = r.note || '';
  let type = undefined;
  if (note.includes('|||')) {
    const idx = note.lastIndexOf('|||');
    type = note.slice(idx + 3) || undefined;
    note = note.slice(0, idx);
  }
  // Infer type from note if not encoded
  if (!type) {
    if (/payment received|(?<!un)paid/i.test(note)) type = 'clear';
    else if (/correction|adjust/i.test(note)) type = 'adjust';
    else if (/visit/i.test(note)) type = 'visit';
    else type = 'add';
  }
  return {
    id: r.id || uid(),
    date: r.created_at, amount: parseFloat(r.amount),
    type, note, orderId: r.order_id || undefined
  };
}

function dedupeDebtHistory(entries) {
  const seen = new Set();
  return entries.filter(e => {
    // Prefer dedup by unique ID if available
    if (e.id) {
      if (seen.has('id:' + e.id)) return false;
      seen.add('id:' + e.id);
      return true;
    }
    // Fallback: use millisecond-precision date + amount + note
    const dateKey = (e.date || '').slice(0, 23);
    const key = dateKey + '|' + e.amount + '|' + e.note;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Legacy cr4 read (for migration) ───────────────────────

function legacyGet(key, fallback) {
  try {
    const v = localStorage.getItem('cr4_' + key);
    return v !== null ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}

// ── CRUD Helpers per Entity ────────────────────────────────

const DB = {
  // -- Customers --
  async getCustomers() {
    const cached = cacheGet('customers', null);
    if (cached && cacheIsFresh('customers')) return cached;
    const rows = await dbSelect('customers', 'order=name.asc');
    if (rows) { cacheSet('customers', rows); return rows; }
    return cached || [];
  },

  async saveCustomer(c) {
    if (c.id == null) { console.warn('saveCustomer: missing id'); return null; }
    const name = c.name || c.n;
    if (!name) { console.warn('saveCustomer: missing name for id', c.id); return null; }
    const data = {
      id: c.id, name, address: c.address || c.a || '',
      city: c.city || c.c || '', postcode: c.postcode || c.p || '',
      lat: (typeof c.lat === 'number' && isFinite(c.lat)) ? c.lat : null,
      lng: (typeof c.lng === 'number' && isFinite(c.lng)) ? c.lng : null,
      note: c.note || '',
      contact_name: c.contact_name || c.cn || '',
      phone: c.phone || c.ph || '', email: c.email || c.em || ''
    };
    const result = await dbUpsert('customers', data);
    // Invalidate cache so next getCustomers() fetches fresh data
    try { localStorage.removeItem('cr5_ts_customers'); } catch {}
    return result;
  },

  async deleteCustomer(id) {
    return await dbDelete('customers', { id });
  },

  // -- Products --
  async getProducts() {
    const cached = cacheGet('products', null);
    if (cached && cacheIsFresh('products')) return cached;
    const rows = await dbSelect('products', 'order=sort_order.asc,name.asc');
    if (rows) { cacheSet('products', rows); return rows; }
    return cached || [];
  },

  async saveProduct(p) {
    const data = {
      name: p.name, unit: p.unit || '1', price: p.price || 0,
      stock: p.stock ?? null, track_stock: p.track_stock !== false,
      sort_order: p.sort_order || 0
    };
    if (p.id) data.id = p.id;
    const result = await dbInsert('products', data, { upsert: true, onConflict: 'name' });
    try { localStorage.removeItem('cr5_ts_products'); } catch {}
    return result;
  },

  async deleteProduct(name) {
    return await dbDelete('products', { name });
  },

  // -- Assignments --
  async getAssignments() {
    const cached = cacheGet('assignments', null);
    if (cached && cacheIsFresh('assignments')) return cached;
    const rows = await dbSelect('assignments', 'select=customer_id,day_id');
    if (rows) {
      const map = {};
      rows.forEach(r => map[r.customer_id] = r.day_id);
      cacheSet('assignments', map);
      return map;
    }
    return cached || {};
  },

  async setAssignment(customerId, dayId) {
    const result = await dbUpsert('assignments', { customer_id: customerId, day_id: dayId });
    try { localStorage.removeItem('cr5_ts_assignments'); } catch {}
    return result;
  },

  async removeAssignment(customerId) {
    const result = await dbDelete('assignments', { customer_id: customerId });
    try { localStorage.removeItem('cr5_ts_assignments'); } catch {}
    return result;
  },

  // -- Route Order --
  async getRouteOrder() {
    const cached = cacheGet('route_order', null);
    if (cached && cacheIsFresh('route_order')) return cached;
    const rows = await dbSelect('route_order', 'order=position.asc');
    if (rows) {
      const map = {};
      rows.forEach(r => {
        if (!map[r.day_id]) map[r.day_id] = [];
        map[r.day_id].push(r.customer_id);
      });
      cacheSet('route_order', map);
      return map;
    }
    return cached || {};
  },

  async saveRouteOrder(dayId, customerIds) {
    await dbDelete('route_order', { day_id: dayId });
    if (customerIds.length > 0) {
      const rows = customerIds.map((cid, i) => ({
        day_id: dayId, customer_id: cid, position: i
      }));
      await dbInsert('route_order', rows);
    }
    try { localStorage.removeItem('cr5_ts_route_order'); } catch {}
  },

  // -- Orders --
  async getOrders() {
    const cached = cacheGet('orders', null);
    if (cached && cacheIsFresh('orders')) return cached;
    const rows = await dbSelect('orders', 'select=*,order_items(*)&order=created_at.desc');
    if (rows) {
      const map = {};
      rows.forEach(o => {
        map[o.id] = {
          id: o.id, customerId: o.customer_id, status: o.status,
          payMethod: o.pay_method, cashPaid: o.cash_paid ? parseFloat(o.cash_paid) : undefined,
          deliveryDate: o.delivery_date, note: o.note || '',
          createdAt: o.created_at, deliveredAt: o.delivered_at,
          items: (o.order_items || []).map(i => ({
            name: i.product_name, qty: i.qty, price: parseFloat(i.price)
          }))
        };
      });
      cacheSet('orders', map);
      return map;
    }
    return cached || {};
  },

  async saveOrder(order) {
    // Upsert order row
    const ok = await dbUpsert('orders', {
      id: order.id, customer_id: order.customerId,
      status: order.status, pay_method: order.payMethod || null,
      cash_paid: order.cashPaid ?? null,
      delivery_date: order.deliveryDate || null,
      note: order.note || '', created_at: order.createdAt,
      delivered_at: order.deliveredAt || null
    });
    if (!ok) {
      if (typeof dbLog === 'function') dbLog(`saveOrder ${order.id} FAILED at upsert (status=${order.status})`);
      return;
    }
    // Replace order items — insert new first, then delete old to avoid data loss
    const newItems = (order.items || []).map(i => ({
      order_id: order.id, product_name: i.name, qty: i.qty, price: i.price
    }));
    const deleteOk = await dbDelete('order_items', { order_id: order.id });
    if (newItems.length > 0) {
      const insertOk = await dbInsert('order_items', newItems);
      if (!insertOk && deleteOk) {
        if (typeof dbLog === 'function') dbLog(`saveOrder ${order.id} WARNING: items deleted but re-insert failed`);
      }
    }
    try { localStorage.removeItem('cr5_ts_orders'); } catch {}
    if (typeof dbLog === 'function') dbLog(`saveOrder OK: ${order.id} status=${order.status}`);
  },

  async deleteOrder(orderId) {
    return await dbDelete('orders', { id: orderId });
  },

  // -- Debts --
  async getDebts() {
    const cached = cacheGet('debts', null);
    if (cached && cacheIsFresh('debts')) return cached;
    const rows = await dbSelect('debts', 'select=customer_id,amount');
    if (rows) {
      const map = {};
      rows.forEach(r => map[r.customer_id] = parseFloat(r.amount));
      cacheSet('debts', map);
      return map;
    }
    return cached || {};
  },

  async setDebt(customerId, amount) {
    const numAmount = parseFloat(amount) || 0;
    const result = await dbUpsert('debts', { customer_id: customerId, amount: numAmount });
    try { localStorage.removeItem('cr5_ts_debts'); } catch {}
    return result;
  },

  // -- Debt History --
  async getDebtHistory() {
    const cached = cacheGet('debt_history', null);
    if (cached && cacheIsFresh('debt_history')) return cached;
    const rows = await dbSelect('debt_history', 'order=created_at.desc');
    if (rows) {
      const map = {};
      rows.forEach(r => {
        const cid = r.customer_id;
        if (!map[cid]) map[cid] = [];
        map[cid].push(parseDebtHistoryRow(r));
      });
      // Deduplicate per customer
      Object.keys(map).forEach(cid => { map[cid] = dedupeDebtHistory(map[cid]); });
      cacheSet('debt_history', map);
      return map;
    }
    return cached || {};
  },

  async addDebtHistoryEntry(customerId, entry) {
    const encodedNote = (entry.note || '') + (entry.type ? '|||' + entry.type : '');
    await dbInsert('debt_history', {
      customer_id: customerId, amount: entry.amount,
      note: encodedNote, order_id: entry.orderId || null,
      created_at: entry.date || new Date().toISOString()
    });
  },

  async replaceDebtHistory(customerId, entries) {
    // Delete ALL existing entries for this customer from Supabase
    await dbDelete('debt_history', { customer_id: customerId });
    // Re-insert current entries
    if (entries && entries.length > 0) {
      const rows = entries.map(e => ({
        customer_id: customerId,
        amount: e.amount,
        note: (e.note || '') + (e.type ? '|||' + e.type : ''),
        order_id: e.orderId || null,
        created_at: e.date || new Date().toISOString()
      }));
      await dbInsert('debt_history', rows);
    }
  },

  async deleteDebtHistoryEntry(entryId) {
    if (entryId == null) return;
    await dbDelete('debt_history', { id: entryId });
  },

  async deleteDebtHistoryByOrderId(orderId) {
    if (!orderId) return;
    await dbDelete('debt_history', { order_id: orderId });
  },

  // -- Customer Pricing --
  async getCustomerPricing() {
    const cached = cacheGet('customer_pricing', null);
    if (cached && cacheIsFresh('customer_pricing')) return cached;
    const rows = await dbSelect('customer_pricing');
    if (rows) {
      const map = {};
      rows.forEach(r => {
        if (!map[r.customer_id]) map[r.customer_id] = {};
        map[r.customer_id][r.product_name] = parseFloat(r.price);
      });
      cacheSet('customer_pricing', map);
      return map;
    }
    return cached || {};
  },

  async setCustomerPricing(customerId, pricingMap) {
    await dbDelete('customer_pricing', { customer_id: customerId });
    const entries = Object.entries(pricingMap).filter(([, p]) => p != null);
    if (entries.length > 0) {
      await dbInsert('customer_pricing', entries.map(([name, price]) => ({
        customer_id: customerId, product_name: name, price
      })));
    }
    try { localStorage.removeItem('cr5_ts_customer_pricing'); } catch {}
  },

  // -- Recurring Orders --
  async getRecurringOrders() {
    const cached = cacheGet('recurring_orders', null);
    if (cached && cacheIsFresh('recurring_orders')) return cached;
    const rows = await dbSelect('recurring_orders');
    if (rows) {
      const map = {};
      rows.forEach(r => {
        map[r.customer_id] = { items: r.items, note: r.note || '' };
      });
      cacheSet('recurring_orders', map);
      return map;
    }
    return cached || {};
  },

  async setRecurringOrder(customerId, data) {
    let result;
    if (data) {
      result = await dbUpsert('recurring_orders', {
        customer_id: customerId, items: data.items || [],
        note: data.note || ''
      });
    } else {
      result = await dbDelete('recurring_orders', { customer_id: customerId });
    }
    try { localStorage.removeItem('cr5_ts_recurring_orders'); } catch {}
    return result;
  },

  // -- App Settings (key-value for UI state) --
  async getSetting(key, fallback) {
    const cached = cacheGet('setting_' + key, undefined);
    if (cached !== undefined && cacheIsFresh('setting_' + key)) return cached;
    const rows = await dbSelect('app_settings', `key=eq.${encodeURIComponent(key)}`);
    if (rows && rows[0]) {
      cacheSet('setting_' + key, rows[0].value);
      return rows[0].value;
    }
    return fallback;
  },

  async setSetting(key, value) {
    await dbUpsert('app_settings', {
      key, value, updated_at: new Date().toISOString()
    });
    cacheSet('setting_' + key, value); // settings are small key-value, cache here is fine
  }
};

// ── Full Sync (pull all from Supabase → cache) ────────────
// IMPORTANT: Fetch FIRST, then update cache. Never clear cache before fetching,
// because if the fetch fails, we'd lose local data that hasn't been synced yet.

async function syncAll() {
  try {
    // Fetch all tables from Supabase in parallel (allSettled so one failure doesn't block all)
    const results = await Promise.allSettled([
      dbSelect('customers', 'order=name.asc'),
      dbSelect('products', 'order=sort_order.asc,name.asc'),
      dbSelect('assignments', 'select=customer_id,day_id'),
      dbSelect('route_order', 'order=position.asc'),
      dbSelect('orders', 'select=*,order_items(*)&order=created_at.desc'),
      dbSelect('debts', 'select=customer_id,amount'),
      dbSelect('debt_history', 'order=created_at.desc'),
      dbSelect('customer_pricing'),
      dbSelect('recurring_orders')
    ]);
    const [customers, products, assignments, routeOrder, orders,
           debts, debtHistory, pricing, recurring] = results.map(r => r.status === 'fulfilled' ? r.value : null);

    // Only update cache for tables that were successfully fetched
    if (customers) cacheSet('customers', customers);
    if (products) cacheSet('products', products);
    if (assignments) {
      const map = {};
      assignments.forEach(r => map[r.customer_id] = r.day_id);
      cacheSet('assignments', map);
    }
    if (routeOrder) {
      const map = {};
      routeOrder.forEach(r => {
        if (!map[r.day_id]) map[r.day_id] = [];
        map[r.day_id].push(r.customer_id);
      });
      cacheSet('route_order', map);
    }
    if (orders) {
      const map = {};
      orders.forEach(o => {
        map[o.id] = {
          id: o.id, customerId: o.customer_id, status: o.status,
          payMethod: o.pay_method, cashPaid: o.cash_paid ? parseFloat(o.cash_paid) : undefined,
          deliveryDate: o.delivery_date, note: o.note || '',
          createdAt: o.created_at, deliveredAt: o.delivered_at,
          items: (o.order_items || []).map(i => ({
            name: i.product_name, qty: i.qty, price: parseFloat(i.price)
          }))
        };
      });
      cacheSet('orders', map);
    }
    if (debts) {
      const map = {};
      debts.forEach(r => map[r.customer_id] = parseFloat(r.amount));
      cacheSet('debts', map);
    }
    if (debtHistory) {
      const map = {};
      debtHistory.forEach(r => {
        const cid = r.customer_id;
        if (!map[cid]) map[cid] = [];
        map[cid].push(parseDebtHistoryRow(r));
      });
      Object.keys(map).forEach(cid => { map[cid] = dedupeDebtHistory(map[cid]); });
      cacheSet('debt_history', map);
    }
    if (pricing) {
      const map = {};
      pricing.forEach(r => {
        if (!map[r.customer_id]) map[r.customer_id] = {};
        map[r.customer_id][r.product_name] = parseFloat(r.price);
      });
      cacheSet('customer_pricing', map);
    }
    if (recurring) {
      const map = {};
      recurring.forEach(r => {
        map[r.customer_id] = { items: r.items, note: r.note || '' };
      });
      cacheSet('recurring_orders', map);
    }

    return true;
  } catch (e) {
    console.error('syncAll error:', e.message);
    if (typeof showToast === 'function') showToast('Cloud sync failed', 'error', 3000);
    return false;
  }
}
