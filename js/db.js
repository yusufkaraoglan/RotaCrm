'use strict';
// ═══════════════════════════════════════════════════════════
// DATABASE LAYER - Supabase REST + in-memory cache
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
let _isFlushing = false; // prevents re-enqueue during flush

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

// Check if required tables exist
async function checkDbTables() {
  try {
    const r = await fetch(`${SB_URL}/rest/v1/customers?select=id&limit=1`, {
      headers: DB_HEADERS
    });
    if (r.status === 404 || r.status === 400) {
      _dbReady = false;
      console.warn('DB tables not found');
      if (typeof dbLog === 'function') dbLog('DB tables NOT found');
      return false;
    }
    _dbReady = true;
    if (typeof dbLog === 'function') dbLog('DB tables OK');
    return true;
  } catch (e) {
    _dbReady = false;
    console.warn('DB check failed:', e.message);
    return false;
  }
}

async function dbInsert(table, data, opts = {}) {
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
    if (typeof dbLog === 'function') dbLog(`INSERT ${table} FAILED: ${e.message}`);
    else console.error(`dbInsert ${table}:`, e.message);
    // Queue for retry — but not if we're already retrying from the queue
    if (!_isFlushing) offlineQueue.push({ action: 'insert', table, data, opts });
    return null;
  }
}

async function dbUpdate(table, match, data) {
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
    if (!_isFlushing) offlineQueue.push({ action: 'update', table, match, data });
    return null;
  }
}

async function dbDelete(table, match) {
  const params = Object.entries(match).map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`).join('&');
  let lastErr = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt > 0) await new Promise(r => setTimeout(r, 1000 * attempt));
      const r = await fetch(`${SB_URL}/rest/v1/${table}?${params}`, {
        method: 'DELETE',
        headers: DB_HEADERS
      });
      if (r.ok) return true;
      const body = await r.text().catch(() => '');
      let detail = `HTTP ${r.status}`;
      try { const j = JSON.parse(body); detail = j.message || j.details || detail; } catch {}
      lastErr = new Error(detail);
      if (r.status < 500) break; // Only retry on 5xx
    } catch (e) {
      lastErr = e;
    }
  }
  if (typeof dbLog === 'function') dbLog(`DELETE ${table} FAILED: ${lastErr.message}`);
  else console.error(`dbDelete ${table} FAILED:`, lastErr.message);
  if (!_isFlushing) offlineQueue.push({ action: 'delete', table, match });
  return null;
}

async function dbUpsert(table, data, onConflict) {
  return dbInsert(table, data, { upsert: true, onConflict });
}

// ── Offline Queue Flush ────────────────────────────────────

async function flushOfflineQueue() {
  if (isSyncing || offlineQueue.length === 0 || !navigator.onLine) return;
  isSyncing = true;
  _isFlushing = true;
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
    _isFlushing = false;
    isSyncing = false;
  }
}

window.addEventListener('online', flushOfflineQueue);

// Retry offline queue periodically in case flush was skipped (e.g., isSyncing was true)
const _offlineQueueInterval = setInterval(() => {
  if (navigator.onLine && offlineQueue.length > 0) flushOfflineQueue();
}, 30000);

// ── In-Memory Cache ─────────────────────────────────────
// Data lives in Supabase (source of truth). Memory cache avoids redundant
// fetches within the same session. No localStorage — page refresh always
// re-fetches from Supabase.

const _memCache = {};
const _memCacheTs = {};
const CACHE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

function cacheGet(key, fallback) {
  return _memCache.hasOwnProperty(key) ? _memCache[key] : fallback;
}

function cacheSet(key, value) {
  _memCache[key] = value;
  _memCacheTs[key] = Date.now();
}

function cacheIsFresh(key) {
  return _memCacheTs[key] && (Date.now() - _memCacheTs[key]) < CACHE_MAX_AGE_MS;
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

// ── Cache-aware fetch helper ─────────────────────────────
// Fetches from Supabase when cache is stale. When fetch fails (returns null),
// falls back to cached data. When fetch succeeds with empty results, that is
// respected as a legitimate empty state (e.g. after a reset).
function _fetchOrCache(cacheKey, fallback, fetchFn, transformFn) {
  return async function () {
    const cached = cacheGet(cacheKey, null);
    if (cached && cacheIsFresh(cacheKey)) return cached;
    const rows = await fetchFn();
    if (!rows) return cached || fallback; // fetch failed entirely — keep cached data
    const data = transformFn ? transformFn(rows) : rows;
    cacheSet(cacheKey, data);
    return data;
  };
}

// ── CRUD Helpers per Entity ────────────────────────────────

const DB = {
  // -- Customers --
  getCustomers: _fetchOrCache('customers', [],
    () => dbSelect('customers', 'order=name.asc')
  ),

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
    const result = await dbUpsert('customers', data, 'id');
    // Invalidate cache so next getCustomers() fetches fresh data
    delete _memCacheTs['customers'];
    return result;
  },

  async deleteCustomer(id) {
    return await dbDelete('customers', { id });
  },

  // -- Products --
  getProducts: _fetchOrCache('products', [],
    () => dbSelect('products', 'order=sort_order.asc,name.asc')
  ),

  async saveProduct(p) {
    const data = {
      name: p.name, unit: p.unit || '1', price: p.price || 0,
      stock: p.stock ?? null, track_stock: p.track_stock !== false,
      sort_order: p.sort_order || 0
    };
    if (p.id) data.id = p.id;
    const result = await dbInsert('products', data, { upsert: true, onConflict: 'name' });
    delete _memCacheTs['products'];
    return result;
  },

  async deleteProduct(name) {
    return await dbDelete('products', { name });
  },

  // -- Assignments --
  getAssignments: _fetchOrCache('assignments', {},
    () => dbSelect('assignments', 'select=customer_id,day_id'),
    rows => { const m = {}; rows.forEach(r => m[r.customer_id] = r.day_id); return m; }
  ),

  async setAssignment(customerId, dayId) {
    const result = await dbUpsert('assignments', { customer_id: customerId, day_id: dayId }, 'customer_id');
    delete _memCacheTs['assignments'];
    return result;
  },

  async removeAssignment(customerId) {
    const result = await dbDelete('assignments', { customer_id: customerId });
    delete _memCacheTs['assignments'];
    return result;
  },

  // -- Route Order --
  getRouteOrder: _fetchOrCache('route_order', {},
    () => dbSelect('route_order', 'order=position.asc'),
    rows => {
      const m = {};
      rows.forEach(r => { if (!m[r.day_id]) m[r.day_id] = []; m[r.day_id].push(r.customer_id); });
      return m;
    }
  ),

  async saveRouteOrder(dayId, customerIds) {
    if (customerIds.length > 0) {
      const rows = customerIds.map((cid, i) => ({
        day_id: dayId, customer_id: cid, position: i
      }));
      // Upsert new entries first (composite PK: day_id, customer_id)
      const ok = await dbInsert('route_order', rows, { upsert: true, onConflict: 'day_id,customer_id' });
      if (ok) {
        // Delete entries not in the new list
        const current = await dbSelect('route_order', `day_id=eq.${encodeURIComponent(dayId)}`);
        if (current) {
          const newSet = new Set(customerIds.map(Number));
          for (const entry of current) {
            if (!newSet.has(entry.customer_id)) {
              await dbDelete('route_order', { day_id: dayId, customer_id: entry.customer_id });
            }
          }
        }
      }
    } else {
      // Empty list — safe to delete all for this day
      await dbDelete('route_order', { day_id: dayId });
    }
    delete _memCacheTs['route_order'];
  },

  // -- Orders --
  getOrders: _fetchOrCache('orders', {},
    () => dbSelect('orders', 'select=*,order_items(*)&order=created_at.desc'),
    rows => {
      const m = {};
      rows.forEach(o => {
        m[o.id] = {
          id: o.id, customerId: o.customer_id, status: o.status,
          payMethod: o.pay_method, cashPaid: o.cash_paid ? parseFloat(o.cash_paid) : undefined,
          deliveryDate: o.delivery_date, note: o.note || '',
          createdAt: o.created_at, deliveredAt: o.delivered_at,
          items: (o.order_items || []).map(i => ({
            name: i.product_name, qty: i.qty, price: parseFloat(i.price)
          }))
        };
      });
      return m;
    }
  ),

  async saveOrder(order) {
    // Upsert order row
    const ok = await dbUpsert('orders', {
      id: order.id, customer_id: order.customerId,
      status: order.status, pay_method: order.payMethod || null,
      cash_paid: order.cashPaid ?? null,
      delivery_date: order.deliveryDate || null,
      note: order.note || '', created_at: order.createdAt,
      delivered_at: order.deliveredAt || null
    }, 'id');
    if (!ok) {
      if (typeof dbLog === 'function') dbLog(`saveOrder ${order.id} FAILED at upsert (status=${order.status})`);
      return;
    }
    // Replace order items — delete old first, then insert new
    await dbDelete('order_items', { order_id: order.id });
    const newItems = (order.items || []).map(i => ({
      order_id: order.id, product_name: i.name, qty: i.qty, price: i.price
    }));
    if (newItems.length > 0) {
      const insertOk = await dbInsert('order_items', newItems);
      if (!insertOk && typeof dbLog === 'function') {
        dbLog(`saveOrder ${order.id} FAILED: items insert failed`);
      }
    }
    delete _memCacheTs['orders'];
    if (typeof dbLog === 'function') dbLog(`saveOrder OK: ${order.id} status=${order.status}`);
  },

  async deleteOrder(orderId) {
    return await dbDelete('orders', { id: orderId });
  },

  // -- Debts --
  getDebts: _fetchOrCache('debts', {},
    () => dbSelect('debts', 'select=customer_id,amount'),
    rows => { const m = {}; rows.forEach(r => m[r.customer_id] = parseFloat(r.amount)); return m; }
  ),

  async setDebt(customerId, amount) {
    const numAmount = parseFloat(amount) || 0;
    const result = await dbUpsert('debts', { customer_id: customerId, amount: numAmount }, 'customer_id');
    delete _memCacheTs['debts'];
    return result;
  },

  // -- Debt History --
  getDebtHistory: _fetchOrCache('debt_history', {},
    () => dbSelect('debt_history', 'order=created_at.desc'),
    rows => {
      const m = {};
      rows.forEach(r => {
        const cid = r.customer_id;
        if (!m[cid]) m[cid] = [];
        m[cid].push(parseDebtHistoryRow(r));
      });
      Object.keys(m).forEach(cid => { m[cid] = dedupeDebtHistory(m[cid]); });
      return m;
    }
  ),

  async addDebtHistoryEntry(customerId, entry) {
    const encodedNote = (entry.note || '') + (entry.type ? '|||' + entry.type : '');
    await dbInsert('debt_history', {
      customer_id: customerId, amount: entry.amount,
      note: encodedNote, order_id: entry.orderId || null,
      created_at: entry.date || new Date().toISOString()
    });
  },

  async replaceDebtHistory(customerId, entries) {
    // Delete existing entries first, then insert fresh
    const deleted = await dbDelete('debt_history', { customer_id: customerId });
    if (!deleted) {
      console.warn(`replaceDebtHistory ${customerId}: delete failed, skipping insert to prevent duplicates`);
      return;
    }
    if (entries && entries.length > 0) {
      const rows = entries.map(e => ({
        customer_id: customerId,
        amount: e.amount,
        note: (e.note || '') + (e.type ? '|||' + e.type : ''),
        order_id: e.orderId || null,
        created_at: e.date || new Date().toISOString()
      }));
      const ok = await dbInsert('debt_history', rows);
      if (!ok && typeof dbLog === 'function') {
        dbLog(`replaceDebtHistory ${customerId} FAILED: insert failed`);
      }
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
  getCustomerPricing: _fetchOrCache('customer_pricing', {},
    () => dbSelect('customer_pricing'),
    rows => {
      const m = {};
      rows.forEach(r => {
        if (!m[r.customer_id]) m[r.customer_id] = {};
        m[r.customer_id][r.product_name] = parseFloat(r.price);
      });
      return m;
    }
  ),

  async setCustomerPricing(customerId, pricingMap) {
    const entries = Object.entries(pricingMap).filter(([, p]) => p != null);
    if (entries.length > 0) {
      // Upsert new pricing first (composite PK: customer_id, product_name)
      const rows = entries.map(([name, price]) => ({
        customer_id: customerId, product_name: name, price
      }));
      const ok = await dbInsert('customer_pricing', rows, { upsert: true, onConflict: 'customer_id,product_name' });
      if (ok) {
        // Delete pricing entries not in the new map
        const current = await dbSelect('customer_pricing', `customer_id=eq.${customerId}`);
        if (current) {
          const newNames = new Set(entries.map(([n]) => n));
          for (const row of current) {
            if (!newNames.has(row.product_name)) {
              await dbDelete('customer_pricing', { customer_id: customerId, product_name: row.product_name });
            }
          }
        }
      }
    } else {
      // No pricing — safe to delete all
      await dbDelete('customer_pricing', { customer_id: customerId });
    }
    delete _memCacheTs['customer_pricing'];
  },

  // -- Recurring Orders --
  getRecurringOrders: _fetchOrCache('recurring_orders', {},
    () => dbSelect('recurring_orders'),
    rows => { const m = {}; rows.forEach(r => { m[r.customer_id] = { items: r.items, note: r.note || '' }; }); return m; }
  ),

  async setRecurringOrder(customerId, data) {
    let result;
    if (data) {
      result = await dbUpsert('recurring_orders', {
        customer_id: customerId, items: data.items || [],
        note: data.note || ''
      }, 'customer_id');
    } else {
      result = await dbDelete('recurring_orders', { customer_id: customerId });
    }
    delete _memCacheTs['recurring_orders'];
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

  // Bulk-load ALL settings in one request (used at init to avoid N+1 queries)
  async getAllSettings() {
    const rows = await dbSelect('app_settings', 'select=key,value');
    const map = {};
    if (rows) {
      rows.forEach(r => {
        map[r.key] = r.value;
        cacheSet('setting_' + r.key, r.value);
      });
    }
    return map;
  },

  async setSetting(key, value) {
    await dbUpsert('app_settings', {
      key, value, updated_at: new Date().toISOString()
    }, 'key');
    cacheSet('setting_' + key, value); // settings are small key-value, cache here is fine
  }
};

// ── Full Sync (pull all from Supabase → cache) ────────────
// Invalidates cache timestamps so DB.get* methods re-fetch from Supabase.
// Each getter already handles the empty-vs-cached protection via _fetchOrCache.

async function syncAll() {
  try {
    // Invalidate all cache timestamps so getters fetch fresh data
    const keys = ['customers', 'products', 'assignments', 'route_order',
                  'orders', 'debts', 'debt_history', 'customer_pricing', 'recurring_orders'];
    keys.forEach(k => { delete _memCacheTs[k]; });

    // Fetch all via DB.get* in parallel — each handles its own cache logic
    await Promise.allSettled([
      DB.getCustomers(), DB.getProducts(), DB.getAssignments(),
      DB.getRouteOrder(), DB.getOrders(), DB.getDebts(),
      DB.getDebtHistory(), DB.getCustomerPricing(), DB.getRecurringOrders()
    ]);
    return true;
  } catch (e) {
    console.error('syncAll error:', e.message);
    if (typeof showToast === 'function') showToast('Cloud sync failed', 'error', 3000);
    return false;
  }
}
