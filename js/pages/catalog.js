'use strict';
let catalogSearchTerm = '';
const _debouncedCatalogSearch = debounce(() => renderCatalogGrid(), 300);

function renderCatalog() {
  const body = document.querySelector('#page-catalog .page-body');
  const scrollPos = body ? body.scrollTop : 0;

  let html = `
    <header class="topbar">
      <button class="btn-ghost" onclick="showPage('settings')" style="font-size:18px;padding:8px">&larr;</button>
      <h1 style="flex:1;text-align:center;font-size:16px">Product Catalog</h1>
      <div class="topbar-actions">
        <span class="badge badge-outline">${S.catalog.length}</span>
        <button class="btn btn-primary btn-sm" onclick="showAddProductModal()">+ Add</button>
      </div>
    </header>
    <div class="page-body">
      <div class="search-bar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" placeholder="Search products..." value="${escHtml(catalogSearchTerm)}" oninput="catalogSearchTerm=this.value;_debouncedCatalogSearch()">
      </div>
      <div id="catalog-grid-container">`;

  html += buildCatalogGridHtml();
  html += `</div></div>`;
  document.getElementById('page-catalog').innerHTML = html;

  const newBody = document.querySelector('#page-catalog .page-body');
  if (newBody) newBody.scrollTop = scrollPos;
  initCatalogDragDrop();
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

  let html = `<div id="catalog-list">`;
  filtered.forEach((c, fi) => {
    const i = q ? S.catalog.indexOf(c) : fi;
    const isDaily = c.trackStock === false;
    const stockColor = c.stock != null && c.stock <= 5 ? 'var(--danger)' : c.stock != null && c.stock <= 20 ? 'var(--warning)' : 'var(--success)';

    html += `
      <div class="catalog-row${!q ? ' draggable-catalog' : ''}" data-idx="${i}" ${!q ? 'draggable="true"' : ''} onclick="showEditProductModal(${i})">
        <div class="catalog-row-drag"${q ? ' style="display:none"' : ''}>⠿</div>
        <div class="catalog-row-name">${escHtml(c.name)}</div>
        <div class="catalog-row-right">
          ${isDaily
            ? `<span class="badge badge-purple" style="font-size:10px">Daily</span>`
            : c.stock != null
              ? `<span class="catalog-stock-pill" style="background:${stockColor}">${c.stock}</span>`
              : ''
          }
          <span class="catalog-row-price">${formatCurrency(c.price)}</span>
        </div>
      </div>`;
  });
  html += `</div>`;
  return html;
}

function renderCatalogGrid() {
  const container = document.getElementById('catalog-grid-container');
  if (container) {
    container.innerHTML = buildCatalogGridHtml();
    initCatalogDragDrop();
  }
}

let _catalogDragAbort = null;
function initCatalogDragDrop() {
  const list = document.getElementById('catalog-list');
  if (!list) return;

  if (_catalogDragAbort) _catalogDragAbort.abort();
  _catalogDragAbort = new AbortController();
  const signal = _catalogDragAbort.signal;

  let draggedIdx = null;

  list.addEventListener('dragstart', e => {
    const row = e.target.closest('.draggable-catalog');
    if (!row) { e.preventDefault(); return; }
    draggedIdx = parseInt(row.dataset.idx);
    row.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  }, { signal });

  list.addEventListener('dragend', e => {
    const row = e.target.closest('.catalog-row');
    if (row) row.classList.remove('dragging');
    list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    draggedIdx = null;
  }, { signal });

  list.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const target = e.target.closest('.catalog-row');
    list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    if (target && parseInt(target.dataset.idx) !== draggedIdx) {
      target.classList.add('drag-over');
    }
  }, { signal });

  list.addEventListener('drop', e => {
    e.preventDefault();
    const target = e.target.closest('.catalog-row');
    if (!target || draggedIdx == null) return;
    const targetIdx = parseInt(target.dataset.idx);
    if (targetIdx === draggedIdx) return;
    applyCatalogDrop(draggedIdx, targetIdx);
  }, { signal });

  // Touch drag support
  let touchDragIdx = null;
  let touchClone = null;
  let longPressTimer = null;

  list.addEventListener('touchstart', e => {
    const row = e.target.closest('.draggable-catalog');
    if (!row) return;
    if (e.target.closest('.btn')) return;
    longPressTimer = setTimeout(() => {
      touchDragIdx = parseInt(row.dataset.idx);
      row.classList.add('dragging');
      touchClone = row.cloneNode(true);
      touchClone.style.cssText = 'position:fixed;z-index:9999;pointer-events:none;opacity:0.8;width:' + row.offsetWidth + 'px;transform:scale(0.95);box-shadow:0 8px 24px rgba(0,0,0,0.2);left:' + row.getBoundingClientRect().left + 'px;top:' + (e.touches[0].clientY - 20) + 'px';
      document.body.appendChild(touchClone);
    }, 300);
  }, { passive: true, signal });

  list.addEventListener('touchmove', e => {
    if (touchDragIdx == null) {
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
      return;
    }
    e.preventDefault();
    if (touchClone) touchClone.style.top = (e.touches[0].clientY - 20) + 'px';
    list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    const el = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY);
    if (el) {
      const target = el.closest('.catalog-row');
      if (target && parseInt(target.dataset.idx) !== touchDragIdx) target.classList.add('drag-over');
    }
  }, { passive: false, signal });

  list.addEventListener('touchend', e => {
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
    if (touchDragIdx == null) return;
    if (touchClone) { touchClone.remove(); touchClone = null; }
    list.querySelectorAll('.catalog-row').forEach(c => { c.classList.remove('dragging'); c.classList.remove('drag-over'); });
    const el = document.elementFromPoint(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    if (el) {
      const target = el.closest('.catalog-row');
      if (target && parseInt(target.dataset.idx) !== touchDragIdx) {
        applyCatalogDrop(touchDragIdx, parseInt(target.dataset.idx));
      }
    }
    touchDragIdx = null;
  }, { signal });
}

function applyCatalogDrop(fromIdx, toIdx) {
  const item = S.catalog.splice(fromIdx, 1)[0];
  S.catalog.splice(toIdx, 0, item);
  // Update sort_order
  S.catalog.forEach((c, i) => c.sort_order = i);
  save.catalog();
  renderCatalog();
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
      <label class="form-label">Current Stock: <b>${c.stock != null ? c.stock : '—'}</b></label>
      <div style="display:flex;gap:8px;align-items:center">
        <button class="btn" style="width:44px;height:44px;font-size:20px;font-weight:700;border:1px solid var(--success);color:var(--success);flex-shrink:0" onclick="toggleStockMode(${idx})">
          <span id="cat-stock-mode-icon-${idx}">+</span>
        </button>
        <input class="input" id="cat-edit-stock-${idx}" value="" type="number" min="0" placeholder="Enter amount..." style="text-align:center;font-size:18px;font-weight:700;flex:1" oninput="updateStockPreview(${idx})">
      </div>
      <input type="hidden" id="cat-stock-mode-${idx}" value="add">
      <div id="cat-stock-preview-${idx}" style="font-size:12px;color:var(--text-sec);margin-top:4px;text-align:center"></div>
      <div style="display:flex;gap:6px;margin-top:8px">
        <button class="btn btn-outline btn-sm" style="flex:1" onclick="quickStock(${idx}, 'set')">Set Exact</button>
      </div>
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

function quickStock(idx, mode) {
  const c = S.catalog[idx];
  if (!c) return;
  const modeInput = document.getElementById('cat-stock-mode-' + idx);
  const icon = document.getElementById('cat-stock-mode-icon-' + idx);
  const btn = icon?.parentElement;
  const stockInput = document.getElementById('cat-edit-stock-' + idx);
  const preview = document.getElementById('cat-stock-preview-' + idx);
  if (!modeInput || !stockInput) return;

  if (mode === 'set') {
    modeInput.value = 'set';
    if (icon) icon.textContent = '=';
    if (btn) { btn.style.borderColor = 'var(--primary)'; btn.style.color = 'var(--primary)'; }
    stockInput.placeholder = 'Set exact stock...';
    stockInput.value = c.stock != null ? c.stock : '';
    if (preview) preview.innerHTML = '';
  }
}

function toggleStockMode(idx) {
  const modeInput = document.getElementById('cat-stock-mode-' + idx);
  const icon = document.getElementById('cat-stock-mode-icon-' + idx);
  const btn = icon?.parentElement;
  const stockInput = document.getElementById('cat-edit-stock-' + idx);
  if (!modeInput || !icon) return;
  if (modeInput.value === 'add') {
    modeInput.value = 'subtract';
    icon.textContent = '−';
    if (btn) { btn.style.borderColor = 'var(--danger)'; btn.style.color = 'var(--danger)'; }
  } else if (modeInput.value === 'subtract') {
    modeInput.value = 'set';
    icon.textContent = '=';
    if (btn) { btn.style.borderColor = 'var(--primary)'; btn.style.color = 'var(--primary)'; }
    if (stockInput) stockInput.placeholder = 'Set exact stock...';
  } else {
    modeInput.value = 'add';
    icon.textContent = '+';
    if (btn) { btn.style.borderColor = 'var(--success)'; btn.style.color = 'var(--success)'; }
    if (stockInput) stockInput.placeholder = 'Enter amount...';
  }
  updateStockPreview(idx);
}

function updateStockPreview(idx) {
  const c = S.catalog[idx];
  if (!c) return;
  const preview = document.getElementById('cat-stock-preview-' + idx);
  const input = document.getElementById('cat-edit-stock-' + idx);
  const modeInput = document.getElementById('cat-stock-mode-' + idx);
  if (!preview || !input || !modeInput) return;
  const val = parseInt(input.value);
  if (isNaN(val)) { preview.textContent = ''; return; }
  const cur = c.stock != null ? c.stock : 0;
  const mode = modeInput.value;
  let newStock;
  if (mode === 'set') {
    newStock = Math.max(0, val);
    preview.innerHTML = `Stock will be set to <b>${newStock}</b>`;
  } else {
    newStock = mode === 'add' ? cur + val : Math.max(0, cur - val);
    preview.innerHTML = `${cur} ${mode === 'add' ? '+' : '−'} ${val} = <b>${newStock}</b>`;
  }
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
  const noStockChecked = document.getElementById('cat-edit-nostock-' + idx)?.checked || false;
  let stock = S.catalog[idx].stock;
  if (noStockChecked) {
    stock = null;
  } else {
    const stockInput = document.getElementById('cat-edit-stock-' + idx);
    const modeInput = document.getElementById('cat-stock-mode-' + idx);
    if (stockInput) {
      const sv = stockInput.value.trim();
      if (sv !== '') {
        const val = Math.max(0, parseInt(sv) || 0);
        const cur = stock != null ? stock : 0;
        const mode = modeInput ? modeInput.value : 'add';
        if (mode === 'set') {
          stock = val;
        } else if (mode === 'add') {
          stock = cur + val;
        } else {
          stock = Math.max(0, cur - val);
        }
      }
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
  const name = S.catalog[idx].name;
  S.catalog.splice(idx, 1);
  save.catalog();
  DB.deleteProduct(name).catch(() => {});
  closeModal();
  if (curPage === 'catalog') renderCatalog();
  else if (curPage === 'settings') renderSettings();
}


async function resetOrdersAndDebts() {
  if (!(await appConfirm('This will delete all <b>orders, debts, and debt history</b>.<br>Customers, routes, and map will be kept.<br><br>A backup will be downloaded first.', true))) return;
  if (!(await appConfirm('This cannot be undone. Proceed?'))) return;

  // Auto-backup before reset
  try { exportJSON(); } catch (e) { console.warn('Auto-backup failed:', e); }

  // Delete from Supabase FIRST (order matters for FK constraints)
  let sbFailed = false;
  try {
    const deletes = [
      ['order_items', 'id=not.is.null'],
      ['debt_history', 'id=not.is.null'],
      ['orders', 'id=not.is.null'],
      ['debts', 'customer_id=not.is.null']
    ];
    for (const [table, filter] of deletes) {
      const resp = await fetch(`${SB_URL}/rest/v1/${table}?${filter}`, {
        method: 'DELETE', headers: DB_HEADERS
      });
      if (!resp.ok) {
        console.error(`Reset: failed to delete ${table}`, resp.status, await resp.text().catch(() => ''));
        sbFailed = true;
      }
    }
  } catch (e) {
    console.error('resetOrdersAndDebts Supabase cleanup error:', e);
    sbFailed = true;
  }

  // Clear local state
  S.orders = {};
  S.debts = {};
  S.debtHistory = {};

  // Persist empty state through save helpers (updates cache + Supabase)
  await save.orders([]);
  await save.debts();
  await save.debtHistory([]);

  if (sbFailed) {
    showToast('Local data cleared but cloud sync had errors. Try syncing again.', 'warning', 5000);
  } else {
    appAlert('Orders and debts cleared successfully.');
  }
  renderSettings();
}

async function resetAllData() {
  // Step 1: First warning
  if (!(await appConfirm('This will delete <b>ALL data</b> (local + cloud).<br><br>A backup file will be downloaded first. You must confirm you saved it before data is deleted.', true))) return;

  // Step 2: Download backup
  let backupOk = false;
  try {
    const size = exportJSON({ silent: true });
    backupOk = size > 0;
  } catch (e) {
    console.warn('Auto-backup failed:', e);
  }

  if (!backupOk) {
    await appAlert('Backup download failed. Reset cancelled for safety.');
    return;
  }

  // Step 3: Confirm backup was saved
  if (!(await appConfirm('A backup file was just downloaded.<br><br><b>Did you save it?</b> Check your Downloads folder for the file before continuing.', true))) {
    await appAlert('Reset cancelled. Please download the backup manually from Settings first.');
    return;
  }

  // Step 4: Final confirmation — type DELETE
  const typed = await appPromptInput('Type <b>DELETE</b> to confirm you want to erase all data permanently:', true);
  if (!typed || typed.trim().toUpperCase() !== 'DELETE') {
    await appAlert('Reset cancelled.');
    return;
  }

  // Step 5: Clear Supabase tables
  // Strategy: delete customers first (CASCADE deletes all child data),
  // then clean up standalone tables and legacy store
  showToast('Deleting cloud data...', 'info', 5000);
  let failures = 0;
  try {
    if (typeof SB_URL !== 'undefined' && SB_URL) {
      // Helper: delete all rows from a table using a broad filter
      const delAll = async (table, filter) => {
        try {
          const resp = await fetch(`${SB_URL}/rest/v1/${table}?${filter}`, {
            method: 'DELETE', headers: DB_HEADERS
          });
          if (!resp.ok) {
            console.warn(`resetAllData: DELETE ${table} returned ${resp.status}`);
            failures++;
          }
        } catch (e) {
          console.warn(`resetAllData: DELETE ${table} error:`, e.message);
          failures++;
        }
      };

      // 1) Delete customers — CASCADE removes: assignments, route_order,
      //    orders (→ order_items), debts, debt_history, customer_pricing, recurring_orders
      await delAll('customers', 'id=not.is.null');

      // 2) Clean up standalone tables (no FK to customers)
      await delAll('products', 'id=not.is.null');
      await delAll('app_settings', 'key=not.is.null');

      // 3) Safety: delete any orphans in child tables (in case CASCADE missed something)
      const childDeletes = [
        ['order_items', 'id=not.is.null'],
        ['debt_history', 'id=not.is.null'],
        ['orders', 'id=not.is.null'],
        ['debts', 'customer_id=not.is.null'],
        ['customer_pricing', 'customer_id=not.is.null'],
        ['recurring_orders', 'customer_id=not.is.null'],
        ['route_order', 'customer_id=not.is.null'],
        ['assignments', 'customer_id=not.is.null']
      ];
      await Promise.all(childDeletes.map(([t, f]) => delAll(t, f).catch(() => {})));

      if (failures > 0) {
        console.warn('resetAllData: ' + failures + ' Supabase delete(s) failed');
        showToast(failures + ' cloud table(s) could not be cleared — check connection', 'error', 5000);
      }
    }
  } catch (e) { console.error('resetAllData Supabase cleanup error:', e); }

  // Reload — init() will fetch fresh (empty) data from Supabase
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

async function autoCreateRecurringOrders() {
  const week = getCurrentWeek();
  const dayIdx = getTodayDayIndex();
  const days = DAYS.filter(d => d.week === week);
  const dayObj = days[dayIdx];
  if (!dayObj) return;
  const dayId = dayObj.id;
  const today = todayStr();
  const lastAuto = await DB.getSetting('lastAutoRecurring', '');
  if (lastAuto === today + '_' + dayId) return;

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
  DB.setSetting('lastAutoRecurring', today + '_' + dayId);
}

// ══════════════════════════════════════════════════════════════
