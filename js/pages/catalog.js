'use strict';
let catalogSearchTerm = '';

function renderCatalog() {
  let html = `
    <header class="topbar">
      <button class="btn-ghost" onclick="showPage('settings')" style="font-size:18px;padding:8px">&larr;</button>
      <h1 style="flex:1;text-align:center;font-size:16px">Product Catalog</h1>
      <button class="btn btn-primary btn-sm" onclick="showAddProductModal()">+ Add</button>
    </header>
    <div class="search-bar" style="margin:0 12px 4px">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input type="text" placeholder="Search products..." value="${escHtml(catalogSearchTerm)}" oninput="catalogSearchTerm=this.value;renderCatalogGrid()">
    </div>
    <div class="page-body" id="catalog-grid-container">`;

  html += buildCatalogGridHtml();
  html += `</div>`;
  document.getElementById('page-catalog').innerHTML = html;
}

function buildCatalogGridHtml() {
  const q = catalogSearchTerm.toLowerCase();
  const filtered = S.catalog.filter(c => !q || c.name.toLowerCase().includes(q));

  if (filtered.length === 0 && S.catalog.length === 0) {
    return `<div class="empty-state" style="padding:60px 20px">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="56" height="56"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
      <p style="margin-top:12px"><b>No products yet</b></p>
      <p>Tap "+ Add" to create your first product</p>
    </div>`;
  }

  if (filtered.length === 0) {
    return `<div class="empty-state" style="padding:40px 20px">
      <p class="text-muted">No products found</p>
    </div>`;
  }

  let html = `<div class="catalog-grid">`;
  filtered.forEach((c, fi) => {
    const i = q ? S.catalog.indexOf(c) : fi;
    const stockColor = c.stock != null && c.stock <= 5 ? 'var(--danger)' : c.stock != null && c.stock <= 20 ? 'var(--warning)' : 'var(--success)';
    const isDaily = c.trackStock === false;

    html += `
      <div class="catalog-card-v2" id="cat-card-${i}" onclick="showEditProductModal(${i})">
        <div class="catalog-card-v2-top">
          <div class="catalog-card-v2-name">${escHtml(c.name)}</div>
          <div class="catalog-card-v2-price">${formatCurrency(c.price)}</div>
        </div>
        <div class="catalog-card-v2-meta">
          <span class="text-muted">${escHtml(c.unit || 'unit')}</span>
          ${isDaily
            ? `<span class="badge badge-purple" style="font-size:10px">Daily</span>`
            : `<span class="catalog-stock-pill" style="background:${stockColor}">${c.stock != null ? c.stock : '—'}</span>`
          }
        </div>
        ${!isDaily && c.stock != null ? `
        <div class="catalog-stock-bar">
          <div class="catalog-stock-bar-fill" style="width:${Math.min(100, (c.stock / Math.max(c.stock, 50)) * 100)}%;background:${stockColor}"></div>
        </div>` : ''}
      </div>`;
  });
  html += `</div>`;
  return html;
}

function renderCatalogGrid() {
  const container = document.getElementById('catalog-grid-container');
  if (container) container.innerHTML = buildCatalogGridHtml();
}

function showAddProductModal() {
  openModal(`
    <div class="modal-handle"></div>
    <div class="modal-title">Add Product</div>
    <div class="form-group">
      <label class="form-label">Product Name</label>
      <input class="input" id="cat-name" placeholder="e.g. Espresso Beans">
    </div>
    <div style="display:flex;gap:10px">
      <div class="form-group" style="flex:1">
        <label class="form-label">Unit</label>
        <input class="input" id="cat-unit" placeholder="e.g. 1kg">
      </div>
      <div class="form-group" style="flex:1">
        <label class="form-label">Price</label>
        <input class="input" id="cat-price" placeholder="0.00" type="number" step="0.01">
      </div>
    </div>
    <div style="display:flex;gap:10px">
      <div class="form-group" style="flex:1">
        <label class="form-label">Initial Stock</label>
        <input class="input" id="cat-stock" placeholder="Optional" type="number">
      </div>
      <div class="form-group" style="flex:1;display:flex;align-items:flex-end;padding-bottom:14px">
        <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer">
          <input type="checkbox" id="cat-nostock" style="width:18px;height:18px"> Daily product
        </label>
      </div>
    </div>
    <button class="btn btn-primary btn-block" onclick="addCatalogItem()">Add Product</button>
  `);
}

function showEditProductModal(idx) {
  const c = S.catalog[idx];
  if (!c) return;
  const isDaily = c.trackStock === false;

  openModal(`
    <div class="modal-handle"></div>
    <div class="modal-title">Edit Product</div>
    <div class="form-group">
      <label class="form-label">Product Name</label>
      <input class="input" id="cat-edit-name-${idx}" value="${escHtml(c.name)}">
    </div>
    <div style="display:flex;gap:10px">
      <div class="form-group" style="flex:1">
        <label class="form-label">Unit</label>
        <input class="input" id="cat-edit-unit-${idx}" value="${escHtml(c.unit || '')}">
      </div>
      <div class="form-group" style="flex:1">
        <label class="form-label">Price</label>
        <input class="input" id="cat-edit-price-${idx}" value="${c.price}" type="number" step="0.01">
      </div>
    </div>
    ${!isDaily ? `
    <div class="form-group">
      <label class="form-label">Stock</label>
      <input class="input" id="cat-edit-stock-${idx}" value="${c.stock != null ? c.stock : ''}" type="number" placeholder="—" style="text-align:center;font-size:18px;font-weight:700">
    </div>` : ''}
    <div class="form-group">
      <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer">
        <input type="checkbox" id="cat-edit-nostock-${idx}" ${isDaily ? 'checked' : ''} style="width:18px;height:18px"> Don't track stock (daily product)
      </label>
    </div>
    <button class="btn btn-primary btn-block" onclick="saveCatalogEdit(${idx})">Save Changes</button>
    <button class="btn btn-block mt-1" style="color:var(--danger);border:1px solid var(--danger)" onclick="removeCatalogItem(${idx})">Delete Product</button>
  `);
}

function catalogModalAdjustStock(idx, delta) {
  const input = document.getElementById('cat-edit-stock-' + idx);
  if (!input) return;
  const cur = parseInt(input.value) || 0;
  input.value = Math.max(0, cur + delta);
}

function adjustStock(idx, delta) {
  if (!S.catalog[idx]) return;
  const cur = S.catalog[idx].stock;
  if (cur == null) {
    S.catalog[idx].stock = Math.max(0, delta);
  } else {
    S.catalog[idx].stock = Math.max(0, cur + delta);
  }
  save.catalog();
  renderCatalog();
}

function addToStock(idx) {
  if (!S.catalog[idx]) return;
  const input = document.getElementById('cat-stock-add-' + idx);
  if (!input) return;
  const val = parseInt(input.value);
  if (!val || val <= 0) return;
  const cur = S.catalog[idx].stock;
  S.catalog[idx].stock = (cur != null ? cur : 0) + val;
  save.catalog();
  input.value = '';
  renderCatalog();
}

function setStock(idx, val) {
  if (!S.catalog[idx]) return;
  const trimmed = (val + '').trim();
  if (trimmed === '') { S.catalog[idx].stock = null; }
  else { S.catalog[idx].stock = Math.max(0, parseInt(trimmed) || 0); }
  save.catalog();
}

function toggleCatalogEdit(idx) {
  showEditProductModal(idx);
}

function saveCatalogEdit(idx) {
  const name = document.getElementById('cat-edit-name-' + idx).value.trim();
  const unit = document.getElementById('cat-edit-unit-' + idx).value.trim();
  const price = parseFloat(document.getElementById('cat-edit-price-' + idx).value) || 0;
  if (!name) { appAlert('Product name is required.'); return; }
  const oldName = S.catalog[idx].name;
  if (name !== oldName && S.catalog.some(c => c.name === name)) { appAlert('This product already exists.'); return; }
  const noStockChecked = document.getElementById('cat-edit-nostock-' + idx)?.checked;
  let stock = S.catalog[idx].stock;
  if (noStockChecked) {
    stock = null;
  } else {
    const stockInput = document.getElementById('cat-edit-stock-' + idx);
    if (stockInput) {
      const sv = stockInput.value.trim();
      stock = sv === '' ? null : Math.max(0, parseInt(sv) || 0);
    }
  }
  S.catalog[idx] = { name, unit, price, stock, trackStock: noStockChecked ? false : true };
  save.catalog();
  closeModal();
  renderCatalog();
}

function addCatalogItem() {
  const name = document.getElementById('cat-name').value.trim();
  const unit = document.getElementById('cat-unit').value.trim();
  const price = parseFloat(document.getElementById('cat-price').value) || 0;
  const stockVal = document.getElementById('cat-stock').value;
  const stock = stockVal !== '' ? parseInt(stockVal) : null;
  const noStock = document.getElementById('cat-nostock')?.checked;
  if (!name) { appAlert('Product name is required.'); return; }
  if (S.catalog.some(c => c.name === name)) { appAlert('This product already exists.'); return; }
  S.catalog.push({ name, unit, price, stock: noStock ? null : stock, trackStock: noStock ? false : true });
  save.catalog();
  closeModal();
  if (curPage === 'catalog') renderCatalog();
  else if (curPage === 'settings') renderSettings();
}

async function removeCatalogItem(idx) {
  if (!(await appConfirm('Remove ' + S.catalog[idx].name + '?'))) return;
  S.catalog.splice(idx, 1);
  save.catalog();
  closeModal();
  if (curPage === 'catalog') renderCatalog();
  else if (curPage === 'settings') renderSettings();
}


async function resetAllData() {
  if (!(await appConfirm('This will delete ALL local data.<br>Are you sure?'))) return;
  if (!(await appConfirm('This cannot be undone. Proceed?'))) return;
  const keys = ['stops','assign','routeOrder','order','geo','ordersV2','orders','debts','debtHistory','cnotes','catalog','customerPricing','customerProducts','recurringOrders','stopCatalog','vis'];
  keys.forEach(k => localStorage.removeItem('cr4_' + k));
  const cr5Keys = ['customers','products','assignments','route_order','orders','debts','debt_history','customer_pricing','recurring_orders','customer_products','db_migrated'];
  cr5Keys.forEach(k => localStorage.removeItem('cr5_' + k));
  location.reload();
}

// ══════════════════════════════════════════════════════════════
// RECURRING ORDERS
// ══════════════════════════════════════════════════════════════
function showRecurringModal(stopId) {
  const stop = getStop(stopId);
  if (!stop) return;
  const existing = S.recurringOrders[stopId];
  if (existing) {
    openModal(`
      <div class="modal-handle"></div>
      <div class="modal-title">Recurring Order — ${escHtml(stop.n)}</div>
      <div style="margin-bottom:12px">
        <div style="font-size:13px;font-weight:600;color:var(--text-sec);margin-bottom:8px">Current Recurring Order:</div>
        ${existing.items.map(i => `<div style="padding:4px 0;font-size:14px">${i.qty}x ${escHtml(i.name)} — ${formatCurrency(i.price * i.qty)}</div>`).join('')}
        <div style="font-weight:700;padding-top:4px;font-size:15px">Total: ${formatCurrency(existing.items.reduce((s, i) => s + i.qty * i.price, 0))}</div>
      </div>
      <button class="btn btn-primary btn-block" onclick="createRecurringFromLast(${stopId})">Update (From Last Order)</button>
      <button class="btn btn-danger btn-block mt-1" onclick="removeRecurring(${stopId})">Remove Recurring Order</button>
    `);
  } else {
    openModal(`
      <div class="modal-handle"></div>
      <div class="modal-title">Recurring Order — ${escHtml(stop.n)}</div>
      <p class="text-muted" style="font-size:13px;margin-bottom:12px">Create an automatic recurring order for this customer. Orders will be created on their assigned route day.</p>
      <button class="btn btn-primary btn-block" onclick="createRecurringFromLast(${stopId})">Create from Last Order</button>
    `);
  }
}

function createRecurringFromLast(stopId) {
  const delivered = getStopOrders(stopId, 'delivered').filter(o => o.items && o.items.length > 0)
    .sort((a, b) => new Date(b.deliveredAt) - new Date(a.deliveredAt));
  if (delivered.length === 0) {
    const pending = getStopOrders(stopId, 'pending').filter(o => o.items && o.items.length > 0);
    if (pending.length === 0) { appAlert('This customer has no orders yet.'); return; }
    S.recurringOrders[stopId] = { items: pending[0].items.map(i => ({ name: i.name, qty: i.qty, price: i.price })) };
  } else {
    S.recurringOrders[stopId] = { items: delivered[0].items.map(i => ({ name: i.name, qty: i.qty, price: i.price })) };
  }
  save.recurringOrders();
  closeModal();
  appAlert('Recurring order saved.');
  if (curPage === 'profile') renderProfile();
}

function removeRecurring(stopId) {
  delete S.recurringOrders[stopId];
  save.recurringOrders();
  closeModal();
  appAlert('Recurring order removed.');
  if (curPage === 'profile') renderProfile();
}

function autoCreateRecurringOrders() {
  const week = getCurrentWeek();
  const dayIdx = getTodayDayIndex();
  const days = DAYS.filter(d => d.week === week);
  const dayObj = days[dayIdx];
  if (!dayObj) return;
  const dayId = dayObj.id;
  const today = todayStr();
  const lastAutoKey = 'cr4_lastAutoRecurring';
  if (localStorage.getItem(lastAutoKey) === today + '_' + dayId) return;

  const assigned = [];
  Object.entries(S.assign).forEach(([sid, did]) => {
    if (did === dayId) assigned.push(parseInt(sid));
  });

  let created = 0;
  const createdIds = [];
  assigned.forEach(stopId => {
    const rec = S.recurringOrders[stopId];
    if (!rec || !rec.items || rec.items.length === 0) return;
    const hasPending = getStopOrders(stopId, 'pending').length > 0;
    if (hasPending) return;
    const id = uid();
    S.orders[id] = {
      id, customerId: stopId,
      items: rec.items.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
      note: 'Automatic recurring order',
      status: 'pending', payMethod: null,
      createdAt: new Date().toISOString(), deliveredAt: null
    };
    created++;
    createdIds.push(id);
  });
  if (created > 0) {
    save.orders(createdIds);
  }
  localStorage.setItem(lastAutoKey, today + '_' + dayId);
}

// ══════════════════════════════════════════════════════════════
