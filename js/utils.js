'use strict';
// ═══════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════

function uid() { return 'o' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

function repairDebtHistoryTypes(dhMap) {
  if (!dhMap || typeof dhMap !== 'object') return {};
  Object.keys(dhMap).forEach(cid => {
    const entries = dhMap[cid];
    if (!Array.isArray(entries)) return;
    entries.forEach(e => {
      if (!e.type) {
        if (/payment received|paid/i.test(e.note)) e.type = 'clear';
        else if (/correction|adjust/i.test(e.note)) e.type = 'adjust';
        else if (/visit/i.test(e.note)) e.type = 'visit';
        else e.type = 'add';
      }
      if (!e.id) e.id = uid();
    });
    // Deduplicate (round date to minute to catch near-identical entries)
    const seen = new Set();
    dhMap[cid] = entries.filter(e => {
      const dateKey = (e.date || '').slice(0, 16);
      const key = dateKey + '|' + e.amount + '|' + e.note;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });
  return dhMap;
}
function escHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function formatCurrency(n) { return '\u00A3' + (n || 0).toFixed(2); }

function formatDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(d) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) + ' ' +
         dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function todayStr() { return new Date().toISOString().slice(0, 10); }

function normalizePostcode(postcode) {
  return String(postcode || '').trim().toUpperCase();
}

function buildStopAddress(stop) {
  const a = stop.address || stop.a || '';
  const c = stop.city || stop.c || '';
  const p = stop.postcode || stop.p || '';
  const parts = [a, c, normalizePostcode(p)]
    .map(v => String(v || '').trim())
    .filter(Boolean);
  if (!parts.length) return '';
  parts.push('United Kingdom');
  return parts.join(', ');
}

function getStopAddressKey(stop) {
  const a = stop.address || stop.a || '';
  const c = stop.city || stop.c || '';
  const p = stop.postcode || stop.p || '';
  return [a, c, normalizePostcode(p)]
    .map(v => String(v || '').trim().toUpperCase())
    .join('|');
}

function buildGeocodeQueries(stop) {
  const name = stop.name || stop.n || '';
  const a = stop.address || stop.a || '';
  const c = stop.city || stop.c || '';
  const postcode = normalizePostcode(stop.postcode || stop.p || '');
  const queries = [
    [name, a, c, postcode, 'United Kingdom'].filter(Boolean).join(', '),
    [a, c, postcode, 'United Kingdom'].filter(Boolean).join(', '),
    [c, postcode, 'United Kingdom'].filter(Boolean).join(', '),
    [postcode, 'United Kingdom'].filter(Boolean).join(', ')
  ].map(q => q.trim()).filter(Boolean);
  return [...new Set(queries)];
}

async function geocodeWithNominatim(query) {
  if (!query) return null;
  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=gb&q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const results = await res.json();
  const first = Array.isArray(results) ? results[0] : null;
  if (!first || !first.lat || !first.lon) return null;
  return { lat: Number(first.lat), lng: Number(first.lon), matchedQuery: query, source: 'nominatim' };
}

async function geocodeWithPostcode(postcode) {
  const normalized = normalizePostcode(postcode).replace(/\s+/g, '');
  if (!normalized) return null;
  const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(normalized)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data || data.status !== 200 || !data.result || data.result.latitude == null) return null;
  return { lat: Number(data.result.latitude), lng: Number(data.result.longitude), matchedQuery: normalized, source: 'postcodes.io' };
}

async function geocodeStop(stop, opts = {}) {
  const { force = false, silent = false } = opts;
  if (!stop) return false;
  const addressKey = getStopAddressKey(stop);
  const queries = buildGeocodeQueries(stop);
  const cached = S.geo[stop.id];
  if (!force && cached && cached.lat && cached.lng && cached.addressKey === addressKey) return true;
  if (!queries.length) { delete S.geo[stop.id]; save.geo(); return false; }
  let match = null, lastError = null;
  for (const query of queries) {
    try { match = await geocodeWithNominatim(query); if (match) break; } catch (err) { lastError = err; }
  }
  if (!match && (stop.p || stop.postcode)) {
    try { match = await geocodeWithPostcode(stop.p || stop.postcode); } catch (err) { lastError = err; }
  }
  if (match) {
    S.geo[stop.id] = { lat: match.lat, lng: match.lng, addressKey, matchedQuery: match.matchedQuery, source: match.source, updatedAt: new Date().toISOString() };
    save.geo();
    return true;
  }
  if (!silent) {
    const msg = lastError ? 'Could not geocode address: ' + lastError.message : 'Address not found on map.';
    appAlert(msg);
  }
  return false;
}

async function geocodeAllStops() {
  const missing = STOPS.filter(s => !S.geo[s.id] || !S.geo[s.id].lat);
  if (missing.length === 0) { appAlert('All customers are already geocoded.'); return; }
  appAlert(`Geocoding ${missing.length} customers...`);
  let done = 0;
  for (const stop of missing) {
    await geocodeStop(stop, { force: true, silent: true });
    done++;
    if (done < missing.length) await new Promise(r => setTimeout(r, 1100));
  }
  appAlert(`${done} customers geocoded.`);
  if (curPage === 'map') refreshMapMarkers();
}

function getCurrentWeek() {
  const now = new Date();
  const ref = new Date(2026, 2, 2); // 2 March 2026 = Week A
  const diffDays = Math.floor((now - ref) / 86400000);
  const weekNum = Math.floor(diffDays / 7);
  return (weekNum % 2 === 0) ? 'A' : 'B';
}

function getTodayDayIndex() {
  const jsDay = new Date().getDay();
  if (jsDay === 0 || jsDay === 6) return 0;
  return jsDay - 1;
}

function getStop(id) {
  return STOPS.find(s => s.id === parseInt(id));
}

function getStopOrders(stopId, status) {
  return Object.values(S.orders).filter(o => {
    if (o.customerId !== parseInt(stopId)) return false;
    if (status && o.status !== status) return false;
    return true;
  });
}

function calcOrderTotal(order) {
  if (!order || !order.items) return 0;
  return order.items.reduce((s, i) => s + (i.qty || 0) * (i.price || 0), 0);
}

function roundMoney(n) {
  return Math.round((n || 0) * 100) / 100;
}

function getTrackedCatalogItem(name) {
  return S.catalog.find(c => c.name === name && c.trackStock !== false && c.stock != null);
}

function buildItemQtyMap(items) {
  const map = {};
  (items || []).forEach(item => {
    if (!item || !item.name) return;
    map[item.name] = (map[item.name] || 0) + (parseInt(item.qty, 10) || 0);
  });
  return map;
}

function validateTrackedStockChange(prevItems, nextItems) {
  const prevMap = buildItemQtyMap(prevItems);
  const nextMap = buildItemQtyMap(nextItems);
  const names = [...new Set([...Object.keys(prevMap), ...Object.keys(nextMap)])];
  const shortages = [];
  names.forEach(name => {
    const catItem = getTrackedCatalogItem(name);
    if (!catItem) return;
    const available = (catItem.stock || 0) + (prevMap[name] || 0);
    const needed = nextMap[name] || 0;
    if (needed > available) shortages.push(`${name} (${available} available, ${needed} requested)`);
  });
  return shortages;
}

function applyTrackedStockChange(prevItems, nextItems) {
  const prevMap = buildItemQtyMap(prevItems);
  const nextMap = buildItemQtyMap(nextItems);
  const names = [...new Set([...Object.keys(prevMap), ...Object.keys(nextMap)])];
  const touched = [];
  names.forEach(name => {
    const catItem = getTrackedCatalogItem(name);
    if (!catItem) return;
    const prevQty = prevMap[name] || 0;
    const nextQty = nextMap[name] || 0;
    if (prevQty === nextQty) return;
    catItem.stock = Math.max(0, (catItem.stock || 0) - (nextQty - prevQty));
    touched.push(catItem);
  });
  return {
    changed: touched.length > 0,
    lowStockWarnings: touched.filter(item => item.stock <= 5).map(item => `${item.name}: ${item.stock} remaining`)
  };
}

function createDebtHistoryEntry(stopId, entry) {
  if (!S.debtHistory[stopId]) S.debtHistory[stopId] = [];
  const debtEntry = { id: uid(), _new: true, ...entry };
  S.debtHistory[stopId].unshift(debtEntry);
  return debtEntry;
}

function getOrderDebtImpact(order) {
  if (!order || order.status !== 'delivered') return 0;
  const total = roundMoney(calcOrderTotal(order));
  if (order.payMethod === 'unpaid') return total;
  if (order.payMethod === 'cash') {
    const paid = roundMoney(Math.max(0, Math.min(total, parseFloat(order.cashPaid) || 0)));
    return roundMoney(Math.max(0, total - paid));
  }
  return 0;
}

function getOrderDebtNote(order) {
  const impact = getOrderDebtImpact(order);
  if (impact <= 0) return '';
  if (order.payMethod === 'unpaid') return 'Delivery - unpaid';
  return `Delivery - short cash (${formatCurrency(impact)})`;
}

function addOrderDebtEffect(order) {
  const impact = getOrderDebtImpact(order);
  if (impact <= 0) { order.debtEntryIds = []; return 0; }
  const entry = createDebtHistoryEntry(order.customerId, {
    date: order.deliveredAt || new Date().toISOString(),
    amount: impact, type: 'add',
    note: getOrderDebtNote(order), orderId: order.id
  });
  order.debtEntryIds = [entry.id];
  S.debts[order.customerId] = roundMoney((S.debts[order.customerId] || 0) + impact);
  return impact;
}

function removeLinkedOrderDebtEntries(order) {
  const ids = Array.isArray(order?.debtEntryIds) ? order.debtEntryIds : [];
  const history = S.debtHistory[order.customerId] || [];
  let removed = 0;

  // Try matching by entry ID first
  if (ids.length) {
    ids.forEach(id => {
      const idx = history.findIndex(entry => entry.id === id);
      if (idx >= 0) { removed = roundMoney(removed + (history[idx].amount || 0)); history.splice(idx, 1); }
    });
  }

  // Fallback: if no entries removed by ID, match by orderId + type 'add'
  if (removed === 0 && order.id) {
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].orderId === order.id && history[i].type === 'add') {
        removed = roundMoney(removed + (history[i].amount || 0));
        history.splice(i, 1);
      }
    }
  }

  order.debtEntryIds = [];
  return removed;
}

function addDebtAdjustmentEntry(stopId, amount, note, orderId) {
  if (amount <= 0) return;
  createDebtHistoryEntry(stopId, {
    date: new Date().toISOString(), amount, type: 'adjust', note, orderId
  });
}

function reconcileOrderDebtEffect(prevOrder, nextOrder) {
  const order = nextOrder || prevOrder;
  if (!order) return false;
  const stopId = order.customerId;
  let changed = false;
  if (prevOrder) {
    const removed = removeLinkedOrderDebtEntries(prevOrder);
    if (removed > 0) { S.debts[stopId] = Math.max(0, roundMoney((S.debts[stopId] || 0) - removed)); changed = true; }
    const prevImpact = getOrderDebtImpact(prevOrder);
    const unresolved = roundMoney(Math.max(0, prevImpact - removed));
    if (unresolved > 0) {
      S.debts[stopId] = Math.max(0, roundMoney((S.debts[stopId] || 0) - unresolved));
      addDebtAdjustmentEntry(stopId, unresolved, 'Order debt correction', prevOrder.id);
      changed = true;
    }
  }
  if (nextOrder && getOrderDebtImpact(nextOrder) > 0) { addOrderDebtEffect(nextOrder); changed = true; }
  else if (nextOrder) { nextOrder.debtEntryIds = []; }
  return changed;
}

function getWeekMondayStr(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d.getFullYear(), d.getMonth(), diff);
  return mon.toISOString().slice(0, 10);
}

function isDeliveredThisWeek(stopId) {
  const thisMonday = getWeekMondayStr(new Date());
  return Object.values(S.orders).some(o =>
    o.customerId === parseInt(stopId) &&
    o.status === 'delivered' &&
    o.deliveredAt && getWeekMondayStr(o.deliveredAt) === thisMonday
  );
}

function getDayObj(dayId) { return DAYS.find(d => d.id === dayId); }

function getCustomerInitials(name) {
  const parts = (name || '?').split(/\s+/);
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
}

function getPrice(stopId, productName) {
  const cp = S.customerPricing[stopId];
  if (cp && cp[productName] !== undefined) return cp[productName];
  const cat = S.catalog.find(c => c.name === productName);
  return cat ? cat.price : 0;
}

// ── Stock Warning System ──────────────────────────────────

function getLowStockItems(threshold) {
  if (threshold === undefined) threshold = 10;
  return S.catalog.filter(c =>
    c.trackStock !== false && c.stock != null && c.stock <= threshold
  ).sort((a, b) => a.stock - b.stock);
}

function getOutOfStockItems() {
  return S.catalog.filter(c =>
    c.trackStock !== false && c.stock != null && c.stock <= 0
  );
}

function buildStockWarningBannerHtml() {
  const outOfStock = getOutOfStockItems();
  const lowStock = getLowStockItems(10);
  if (lowStock.length === 0) return '';

  const outCount = outOfStock.length;
  const lowCount = lowStock.length - outCount;
  let msg = '';
  if (outCount > 0 && lowCount > 0) {
    msg = `${outCount} out of stock, ${lowCount} low stock`;
  } else if (outCount > 0) {
    msg = `${outCount} product${outCount > 1 ? 's' : ''} out of stock`;
  } else {
    msg = `${lowCount} product${lowCount > 1 ? 's' : ''} low on stock`;
  }

  return `
    <div class="stock-warning-banner" onclick="showStockWarningModal()">
      <svg class="stock-warning-banner-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      <span class="stock-warning-banner-text">${msg}</span>
      <span class="stock-warning-banner-count">${lowStock.length} items &rsaquo;</span>
    </div>`;
}

function showStockWarningModal() {
  const lowStock = getLowStockItems(10);
  if (lowStock.length === 0) { appAlert('All stock levels are OK.'); return; }

  let itemsHtml = '';
  lowStock.forEach(c => {
    const color = c.stock <= 0 ? 'var(--danger)' : c.stock <= 5 ? 'var(--warning)' : 'var(--info)';
    const label = c.stock <= 0 ? 'OUT' : c.stock;
    itemsHtml += `
      <div class="stock-warning-modal-item">
        <div>
          <div class="stock-warning-modal-item-name">${escHtml(c.name)}</div>
          <div style="font-size:12px;color:var(--text-sec)">${escHtml(c.unit || 'unit')} &middot; ${formatCurrency(c.price)}</div>
        </div>
        <div class="stock-warning-modal-item-stock" style="background:${color}">${label}</div>
      </div>`;
  });

  openModal(`
    <div class="modal-handle"></div>
    <div class="modal-title">Stock Warnings</div>
    <div style="background:var(--card);border-radius:var(--radius);overflow:hidden;border:1px solid var(--border)">
      ${itemsHtml}
    </div>
    <button class="btn btn-primary btn-block mt-2" onclick="closeModal();showPage('catalog')">Go to Catalog</button>
  `);
}
