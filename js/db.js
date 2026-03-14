'use strict';
// ═══════════════════════════════════════════════════════════
// DATABASE LAYER - Supabase REST + localStorage cache
// ═══════════════════════════════════════════════════════════

const SB_URL = 'https://mvvvqloqwjimlbqeotsd.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12dnZxbG9xd2ppbWxicWVvdHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNTYxMDAsImV4cCI6MjA4NzkzMjEwMH0.tKSiEJouyr9dhs_vIAPUbX9NqtAsFAslZroNKtG2mBk';

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

// Check if required tables exist in Supabase
async function checkDbTables() {
  try {
    const r = await fetch(`${SB_URL}/rest/v1/orders?select=id&limit=1`, {
      headers: DB_HEADERS
    });
    if (r.status === 404 || r.status === 400) {
      _dbReady = false;
      console.warn('DB tables not found — running in cache-only mode');
      if (typeof dbLog === 'function') dbLog('DB tables NOT found — cache-only mode');
      return false;
    }
    _dbReady = true;
    if (typeof dbLog === 'function') dbLog('DB tables OK');
    return true;
  } catch (e) {
    console.warn('DB check failed:', e.message);
    return false;
  }
}

async function dbInsert(table, data, opts = {}) {
  if (!_dbReady) return null;
  try {
    const headers = { ...DB_HEADERS };
    if (opts.upsert) headers['Prefer'] = 'resolution=merge-duplicates';
    if (opts.returnData) headers['Prefer'] = (headers['Prefer'] || '') + ',return=representation';
    const r = await fetch(`${SB_URL}/rest/v1/${table}`, {
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
  if (!_dbReady) return null;
  try {
    const params = Object.entries(match).map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`).join('&');
    const r = await fetch(`${SB_URL}/rest/v1/${table}?${params}`, {
      method: 'PATCH',
      headers: DB_HEADERS,
      body: JSON.stringify(data)
    });
    if (!r.ok) {
      const body = await r.text().catch(() => '');
      throw new Error(`HTTP ${r.status}: ${body}`);
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
  if (!_dbReady) return null;
  try {
    const params = Object.entries(match).map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`).join('&');
    const r = await fetch(`${SB_URL}/rest/v1/${table}?${params}`, {
      method: 'DELETE',
      headers: DB_HEADERS
    });
    if (!r.ok) {
      const body = await r.text().catch(() => '');
      throw new Error(`HTTP ${r.status}: ${body}`);
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
  if (isSyncing || offlineQueue.length === 0) return;
  isSyncing = true;
  while (offlineQueue.length > 0) {
    const op = offlineQueue[0];
    let ok = false;
    try {
      if (op.action === 'insert') ok = await dbInsert(op.table, op.data, op.opts);
      else if (op.action === 'update') ok = await dbUpdate(op.table, op.match, op.data);
      else if (op.action === 'delete') ok = await dbDelete(op.table, op.match);
      if (ok) offlineQueue.shift();
      else break;
    } catch {
      break;
    }
  }
  isSyncing = false;
}

window.addEventListener('online', flushOfflineQueue);

// ── localStorage Cache ─────────────────────────────────────

function cacheGet(key, fallback) {
  try {
    const v = localStorage.getItem('cr5_' + key);
    return v !== null ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}

function cacheSet(key, value) {
  try { localStorage.setItem('cr5_' + key, JSON.stringify(value)); } catch {}
}

// ── Debt history helpers ──────────────────────────────────
function parseDebtHistoryRow(r) {
  let note = r.note || '';
  let type = undefined;
  if (note.includes('|||')) {
    const parts = note.split('|||');
    note = parts[0];
    type = parts[1] || undefined;
  }
  // Infer type from note if not encoded
  if (!type) {
    if (/payment received|paid/i.test(note)) type = 'clear';
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
    const dateKey = (e.date || '').slice(0, 16);
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

// ── Old cr4_store helpers (kept for backward compat) ───────

async function sbGet(key) {
  try {
    const r = await fetch(`${SB_URL}/rest/v1/cr4_store?key=eq.${encodeURIComponent(key)}&select=value`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }
    });
    const data = await r.json();
    return data?.[0]?.value ?? null;
  } catch { return null; }
}

async function sbSet(key, value) {
  try {
    await fetch(`${SB_URL}/rest/v1/cr4_store`, {
      method: 'POST',
      headers: {
        apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates'
      },
      body: JSON.stringify({ key, value, updated_at: new Date().toISOString() })
    });
  } catch {}
}

// ── CRUD Helpers per Entity ────────────────────────────────

const DB = {
  // -- Customers --
  async getCustomers() {
    const cached = cacheGet('customers', null);
    if (cached) return cached;
    const rows = await dbSelect('customers', 'order=name.asc');
    if (rows) cacheSet('customers', rows);
    return rows || [];
  },

  async saveCustomer(c) {
    const data = {
      id: c.id, name: c.name || c.n, address: c.address || c.a || '',
      city: c.city || c.c || '', postcode: c.postcode || c.p || '',
      lat: c.lat || null, lng: c.lng || null, note: c.note || '',
      contact_name: c.contact_name || c.cn || '',
      phone: c.phone || c.ph || '', email: c.email || c.em || ''
    };
    await dbUpsert('customers', data);
    // Update cache
    const all = cacheGet('customers', []);
    const idx = all.findIndex(x => x.id === c.id);
    if (idx >= 0) all[idx] = { ...all[idx], ...data };
    else all.push(data);
    cacheSet('customers', all);
  },

  async deleteCustomer(id) {
    await dbDelete('customers', { id });
    const all = cacheGet('customers', []);
    cacheSet('customers', all.filter(c => c.id !== id));
  },

  // -- Products --
  async getProducts() {
    const cached = cacheGet('products', null);
    if (cached) return cached;
    const rows = await dbSelect('products', 'order=sort_order.asc,name.asc');
    if (rows) cacheSet('products', rows);
    return rows || [];
  },

  async saveProduct(p) {
    const data = {
      name: p.name, unit: p.unit || '1', price: p.price || 0,
      stock: p.stock ?? null, track_stock: p.track_stock !== false,
      sort_order: p.sort_order || 0
    };
    if (p.id) data.id = p.id;
    const result = await dbInsert('products', data, { upsert: true, returnData: true });
    // Update cache
    const all = cacheGet('products', []);
    if (result && result[0]) {
      const idx = all.findIndex(x => x.name === data.name);
      if (idx >= 0) all[idx] = result[0];
      else all.push(result[0]);
      cacheSet('products', all);
    }
    return result?.[0] || null;
  },

  async deleteProduct(name) {
    await dbDelete('products', { name });
    const all = cacheGet('products', []);
    cacheSet('products', all.filter(p => p.name !== name));
  },

  // -- Assignments --
  async getAssignments() {
    const cached = cacheGet('assignments', null);
    if (cached) return cached;
    const rows = await dbSelect('assignments', 'select=customer_id,day_id');
    if (rows) {
      const map = {};
      rows.forEach(r => map[r.customer_id] = r.day_id);
      cacheSet('assignments', map);
      return map;
    }
    return {};
  },

  async setAssignment(customerId, dayId) {
    await dbUpsert('assignments', { customer_id: customerId, day_id: dayId });
    const map = cacheGet('assignments', {});
    map[customerId] = dayId;
    cacheSet('assignments', map);
  },

  async removeAssignment(customerId) {
    await dbDelete('assignments', { customer_id: customerId });
    const map = cacheGet('assignments', {});
    delete map[customerId];
    cacheSet('assignments', map);
  },

  // -- Route Order --
  async getRouteOrder() {
    const cached = cacheGet('route_order', null);
    if (cached) return cached;
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
    return {};
  },

  async saveRouteOrder(dayId, customerIds) {
    // Delete existing for this day, then insert new
    await dbDelete('route_order', { day_id: dayId });
    if (customerIds.length > 0) {
      const rows = customerIds.map((cid, i) => ({
        day_id: dayId, customer_id: cid, position: i
      }));
      await dbInsert('route_order', rows);
    }
    const map = cacheGet('route_order', {});
    map[dayId] = customerIds;
    cacheSet('route_order', map);
  },

  // -- Orders --
  async getOrders() {
    const cached = cacheGet('orders', null);
    if (cached) return cached;
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
    return {};
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
    // Replace order items
    await dbDelete('order_items', { order_id: order.id });
    if (order.items && order.items.length > 0) {
      await dbInsert('order_items', order.items.map(i => ({
        order_id: order.id, product_name: i.name, qty: i.qty, price: i.price
      })));
    }
    if (typeof dbLog === 'function') dbLog(`saveOrder OK: ${order.id} status=${order.status}`);
    // Update cache
    const map = cacheGet('orders', {});
    map[order.id] = order;
    cacheSet('orders', map);
  },

  async deleteOrder(orderId) {
    await dbDelete('orders', { id: orderId });
    const map = cacheGet('orders', {});
    delete map[orderId];
    cacheSet('orders', map);
  },

  // -- Debts --
  async getDebts() {
    const cached = cacheGet('debts', null);
    if (cached) return cached;
    const rows = await dbSelect('debts', 'select=customer_id,amount');
    if (rows) {
      const map = {};
      rows.forEach(r => map[r.customer_id] = parseFloat(r.amount));
      cacheSet('debts', map);
      return map;
    }
    return {};
  },

  async setDebt(customerId, amount) {
    await dbUpsert('debts', { customer_id: customerId, amount });
    const map = cacheGet('debts', {});
    map[customerId] = amount;
    cacheSet('debts', map);
  },

  // -- Debt History --
  async getDebtHistory() {
    const cached = cacheGet('debt_history', null);
    if (cached) return cached;
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
    return {};
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
    if (cached) return cached;
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
    return {};
  },

  async setCustomerPricing(customerId, pricingMap) {
    // Delete existing, insert new
    await dbDelete('customer_pricing', { customer_id: customerId });
    const entries = Object.entries(pricingMap).filter(([, p]) => p != null);
    if (entries.length > 0) {
      await dbInsert('customer_pricing', entries.map(([name, price]) => ({
        customer_id: customerId, product_name: name, price
      })));
    }
    const map = cacheGet('customer_pricing', {});
    map[customerId] = pricingMap;
    cacheSet('customer_pricing', map);
  },

  // -- Recurring Orders --
  async getRecurringOrders() {
    const cached = cacheGet('recurring_orders', null);
    if (cached) return cached;
    const rows = await dbSelect('recurring_orders');
    if (rows) {
      const map = {};
      rows.forEach(r => {
        map[r.customer_id] = { items: r.items, note: r.note || '' };
      });
      cacheSet('recurring_orders', map);
      return map;
    }
    return {};
  },

  async setRecurringOrder(customerId, data) {
    if (data) {
      await dbUpsert('recurring_orders', {
        customer_id: customerId, items: data.items || [],
        note: data.note || ''
      });
      const map = cacheGet('recurring_orders', {});
      map[customerId] = data;
      cacheSet('recurring_orders', map);
    } else {
      await dbDelete('recurring_orders', { customer_id: customerId });
      const map = cacheGet('recurring_orders', {});
      delete map[customerId];
      cacheSet('recurring_orders', map);
    }
  },

  // -- App Settings (key-value for UI state) --
  async getSetting(key, fallback) {
    const cached = cacheGet('setting_' + key, undefined);
    if (cached !== undefined) return cached;
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
    cacheSet('setting_' + key, value);
  }
};

// ── Full Sync (pull all from Supabase → cache) ────────────
// IMPORTANT: Fetch FIRST, then update cache. Never clear cache before fetching,
// because if the fetch fails, we'd lose local data that hasn't been synced yet.

async function syncAll() {
  try {
    // Fetch all tables from Supabase in parallel
    const [customers, products, assignments, routeOrder, orders,
           debts, debtHistory, pricing, recurring] = await Promise.all([
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
    return false;
  }
}
