'use strict';
// ══════════════════════════════════════════════════════════════
// NEW ORDER PAGE — Full page order creation with improved UX
// ══════════════════════════════════════════════════════════════

let newOrderPreviousPage = 'orders';
let newOrderProductSearch = '';

function openNewOrderPage(preCustomerId, fromPage) {
  editingOrderId = null;
  tempOrderItems = [{ name: '', qty: 1, price: 0 }];
  tempOrderCustomerId = preCustomerId != null ? preCustomerId : null;
  tempOrderDeliveryDate = '';
  newOrderPreviousPage = fromPage || curPage || 'orders';
  newOrderProductSearch = '';
  showPage('neworder');
}

function openEditOrderPage(orderId, fromPage) {
  const order = S.orders[orderId];
  if (!order) return;
  editingOrderId = orderId;
  tempOrderCustomerId = order.customerId;
  tempOrderItems = order.items.map(i => ({ ...i }));
  if (tempOrderItems.length === 0) tempOrderItems = [{ name: '', qty: 1, price: 0 }];
  tempOrderDeliveryDate = order.deliveryDate || '';
  newOrderPreviousPage = fromPage || curPage || 'orders';
  newOrderProductSearch = '';
  showPage('neworder');
}

function closeNewOrderPage() {
  showPage(newOrderPreviousPage);
}

function renderNewOrderPage() {
  const isEdit = !!editingOrderId;
  const title = isEdit ? 'Edit Order' : 'New Order';
  const selectedStop = tempOrderCustomerId != null ? getStop(tempOrderCustomerId) : null;

  // Calculate cart
  const cartItems = tempOrderItems.filter(i => i.name);
  const total = cartItems.reduce((s, i) => s + (i.qty || 0) * (i.price || 0), 0);

  // Existing note
  const noteEl = document.getElementById('neworder-note');
  const existingNote = noteEl ? noteEl.value : (isEdit && S.orders[editingOrderId] ? S.orders[editingOrderId].note || '' : '');

  // Selected product count
  const selectedCount = cartItems.length;

  let html = `
    <header class="topbar">
      <button class="btn-ghost" onclick="closeNewOrderPage()" style="font-size:20px;padding:4px 8px">&larr;</button>
      <h1 style="flex:1">${title}</h1>
      ${selectedCount > 0 ? `<span class="badge badge-info">${selectedCount} items</span>` : ''}
    </header>
    <div class="page-body" id="neworder-body">

      <!-- CUSTOMER SECTION -->
      <div class="neworder-section">
        <div class="neworder-section-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          Customer
        </div>
        <div class="neworder-customer-select ${selectedStop ? 'selected' : ''}"
             onclick="${isEdit ? '' : 'openNewOrderCustomerPicker()'}"
             style="${isEdit ? 'opacity:0.6;cursor:default' : ''}">
          <div class="neworder-customer-avatar">
            ${selectedStop ? escHtml(selectedStop.n.substring(0,2).toUpperCase()) : '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>'}
          </div>
          <div style="flex:1;min-width:0">
            <div style="font-size:15px;font-weight:600;${selectedStop ? '' : 'color:var(--text-muted)'}">${selectedStop ? escHtml(selectedStop.n) : 'Select a customer'}</div>
            ${selectedStop ? `<div style="font-size:12px;color:var(--text-sec)">${escHtml(selectedStop.c || '')}${selectedStop.p ? ' · ' + escHtml(selectedStop.p) : ''}</div>` : '<div style="font-size:12px;color:var(--text-muted)">Tap to choose</div>'}
          </div>
          ${!isEdit ? '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--text-muted)" stroke-width="2" style="flex-shrink:0"><polyline points="9 18 15 12 9 6"/></svg>' : ''}
        </div>
      </div>

      <!-- PRODUCTS SECTION (merged with cart) -->
      <div class="neworder-section">
        <div class="neworder-section-title" style="justify-content:space-between">
          <div style="display:flex;align-items:center;gap:6px">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
            Products${selectedCount > 0 ? ' (' + selectedCount + ')' : ''}
          </div>
          <button class="btn-ghost" onclick="openNewOrderProductPicker()" style="font-size:13px;color:var(--primary);font-weight:600;padding:4px 8px">
            + Add
          </button>
        </div>
        ${buildNewOrderProductsCartMerged(cartItems)}
      </div>

      <!-- DETAILS SECTION -->
      <div class="neworder-section">
        <div class="neworder-section-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Details
        </div>
        <div class="form-group" style="margin-bottom:10px">
          <label class="form-label">Delivery Date</label>
          <div style="position:relative">
            <input class="input" type="text" id="neworder-delivery-date-display"
                   value="${tempOrderDeliveryDate ? formatDateForDisplay(tempOrderDeliveryDate) : ''}"
                   placeholder="Today (default)"
                   readonly
                   onclick="document.getElementById('neworder-delivery-date-hidden').showPicker ? document.getElementById('neworder-delivery-date-hidden').showPicker() : document.getElementById('neworder-delivery-date-hidden').focus()"
                   style="cursor:pointer">
            <input type="date" id="neworder-delivery-date-hidden"
                   value="${tempOrderDeliveryDate}"
                   min="${new Date().toISOString().split('T')[0]}"
                   onchange="newOrderSetDeliveryDate(this.value)"
                   style="position:absolute;top:0;left:0;width:100%;height:100%;opacity:0;cursor:pointer">
          </div>
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Note (optional)</label>
          <textarea class="textarea" id="neworder-note" rows="2" style="min-height:50px">${escHtml(existingNote)}</textarea>
        </div>
      </div>

      <div style="height:16px"></div>
    </div>

    <!-- TOTAL + SAVE -->
    <div class="neworder-total-bar">
      <span class="neworder-total-label">Total</span>
      <span class="neworder-total-value">${formatCurrency(total)}</span>
    </div>
    <div class="neworder-footer">
      <button class="btn btn-primary btn-block" onclick="saveNewOrderPage()" style="font-size:16px;padding:14px">${isEdit ? 'Update Order' : 'Save Order'}</button>
    </div>`;

  document.getElementById('page-neworder').innerHTML = html;
}

function formatDateForDisplay(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function newOrderSetDeliveryDate(val) {
  tempOrderDeliveryDate = val;
  const display = document.getElementById('neworder-delivery-date-display');
  if (display) display.value = val ? formatDateForDisplay(val) : '';
}

// ── Merged Products + Cart ──

function buildNewOrderProductsCartMerged(cartItems) {
  if (cartItems.length === 0) {
    return `<div style="text-align:center;padding:20px 16px;color:var(--text-muted)">
      <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" style="margin:0 auto 8px;display:block;opacity:0.4"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
      <div style="font-size:13px">Tap <b>+ Add</b> to select products</div>
    </div>`;
  }

  let html = '';
  cartItems.forEach(item => {
    const actualIdx = tempOrderItems.indexOf(item);
    const lineTotal = (item.qty || 0) * (item.price || 0);
    const cat = S.catalog.find(c => c.name === item.name);
    const isCustomProduct = tempOrderCustomerId != null &&
      S.customerProducts[tempOrderCustomerId] &&
      S.customerProducts[tempOrderCustomerId].includes(item.name);
    const hasCustomPrice = tempOrderCustomerId != null &&
      S.customerPricing[tempOrderCustomerId] &&
      S.customerPricing[tempOrderCustomerId][item.name] !== undefined;

    html += `
      <div class="no-product-row">
        <div class="no-product-row-top">
          <div style="flex:1;min-width:0">
            <div style="font-size:14px;font-weight:600;display:flex;align-items:center;gap:4px;flex-wrap:wrap">
              ${escHtml(item.name)}
              ${isCustomProduct ? '<span class="badge badge-purple" style="font-size:9px;padding:1px 5px">Assigned</span>' : ''}
              ${hasCustomPrice ? '<span class="badge badge-info" style="font-size:9px;padding:1px 5px">Special</span>' : ''}
            </div>
          </div>
          <div style="font-size:15px;font-weight:700;flex-shrink:0">${formatCurrency(lineTotal)}</div>
          <button class="no-product-remove" onclick="newOrderRemoveItem(${actualIdx})">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="no-product-row-bottom">
          <div style="display:flex;align-items:center;gap:4px">
            <span style="font-size:12px;color:var(--text-sec)">&pound;</span>
            <input type="number" step="0.01" value="${item.price.toFixed(2)}"
                   onchange="newOrderSetPrice(${actualIdx},parseFloat(this.value)||0)"
                   onclick="this.select()"
                   class="no-price-input">
            <span style="font-size:11px;color:var(--text-muted)">/${cat ? escHtml(cat.unit || 'ea') : 'ea'}</span>
          </div>
          <div class="no-qty-controls">
            <button class="qty-btn" onclick="newOrderChangeQty(${actualIdx},-1)">&minus;</button>
            <input type="number" class="qty-input" value="${item.qty}" min="1"
                   onchange="newOrderSetQty(${actualIdx},parseInt(this.value)||1)"
                   onclick="this.select()">
            <button class="qty-btn" onclick="newOrderChangeQty(${actualIdx},1)">+</button>
          </div>
        </div>
      </div>`;
  });
  return html;
}

// ── Product Picker Overlay (like customer picker) ──

function openNewOrderProductPicker() {
  const overlay = document.createElement('div');
  overlay.className = 'product-picker-overlay';
  overlay.id = 'neworder-product-picker';
  overlay.innerHTML = `
    <div class="ppick-header">
      <button class="btn-ghost" onclick="closeNewOrderProductPicker()" style="font-size:20px;padding:4px">&larr;</button>
      <input type="text" id="ppick-search-input" placeholder="Search products..." autofocus
             oninput="filterNewOrderProductPicker(this.value)">
      <button class="btn btn-primary btn-sm" onclick="closeNewOrderProductPicker()" style="min-width:60px">Done</button>
    </div>
    <div class="ppick-list" id="ppick-product-list"></div>
  `;
  document.body.appendChild(overlay);
  filterNewOrderProductPicker('');
}

function closeNewOrderProductPicker() {
  const el = document.getElementById('neworder-product-picker');
  if (el) el.remove();
  renderNewOrderPage();
}

function filterNewOrderProductPicker(q) {
  const list = document.getElementById('ppick-product-list');
  if (!list) return;
  const query = q.toLowerCase().trim();
  const selectedNames = tempOrderItems.filter(i => i.name).map(i => i.name);

  // Separate customer-assigned products and others
  const customerProducts = tempOrderCustomerId != null ?
    (S.customerProducts[tempOrderCustomerId] || []) : [];

  let allProducts = [...S.catalog];
  if (query) allProducts = allProducts.filter(c => c.name.toLowerCase().includes(query));

  // Sort: customer-assigned first, then rest
  allProducts.sort((a, b) => {
    const aAssigned = customerProducts.includes(a.name) ? 0 : 1;
    const bAssigned = customerProducts.includes(b.name) ? 0 : 1;
    if (aAssigned !== bAssigned) return aAssigned - bAssigned;
    return a.name.localeCompare(b.name);
  });

  let html = '';
  let lastWasAssigned = null;

  allProducts.forEach(c => {
    const isAssigned = customerProducts.includes(c.name);
    const isSelected = selectedNames.includes(c.name);
    const outOfStock = c.trackStock !== false && c.stock != null && c.stock <= 0;
    const price = tempOrderCustomerId != null ? getPrice(tempOrderCustomerId, c.name) : c.price;
    const hasCustomPrice = tempOrderCustomerId != null &&
      S.customerPricing[tempOrderCustomerId] &&
      S.customerPricing[tempOrderCustomerId][c.name] !== undefined;
    const stockInfo = c.trackStock !== false && c.stock != null ? c.stock + ' in stock' : '';

    // Section header
    if (lastWasAssigned === null && isAssigned && !query) {
      html += `<div style="padding:8px 16px;font-size:11px;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:0.5px;background:var(--primary-light)">Assigned to this customer</div>`;
    } else if (lastWasAssigned === true && !isAssigned && !query) {
      html += `<div style="padding:8px 16px;font-size:11px;font-weight:700;color:var(--text-sec);text-transform:uppercase;letter-spacing:0.5px;background:var(--bg)">All Products</div>`;
    }
    lastWasAssigned = isAssigned;

    html += `
      <div class="ppick-item ${isSelected ? 'selected' : ''}" style="${outOfStock ? 'opacity:0.4' : ''}"
           onclick="${outOfStock ? '' : `toggleNewOrderProductFromPicker('${escHtml(c.name)}')`}">
        <div class="ppick-item-info">
          <div class="ppick-item-name" style="display:flex;align-items:center;gap:4px">
            ${escHtml(c.name)}
            ${isAssigned ? '<span class="badge badge-purple" style="font-size:9px;padding:1px 5px">Assigned</span>' : ''}
            ${hasCustomPrice ? '<span class="badge badge-info" style="font-size:9px;padding:1px 5px">Special</span>' : ''}
          </div>
          <div class="ppick-item-detail">
            ${escHtml(c.unit || 'unit')}${stockInfo ? ' &middot; ' + stockInfo : ''}${outOfStock ? ' &middot; <span style="color:var(--danger);font-weight:600">Out of stock</span>' : ''}
          </div>
        </div>
        <div class="ppick-item-price">${formatCurrency(price)}</div>
        <div class="ppick-item-check">
          ${isSelected ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
        </div>
      </div>`;
  });

  if (allProducts.length === 0) {
    html = '<div style="padding:40px;text-align:center;color:var(--text-muted)">No products found</div>';
  }

  list.innerHTML = html;
}

function toggleNewOrderProductFromPicker(productName) {
  const existingIdx = tempOrderItems.findIndex(i => i.name === productName);
  if (existingIdx >= 0) {
    tempOrderItems.splice(existingIdx, 1);
    if (tempOrderItems.length === 0) tempOrderItems.push({ name: '', qty: 1, price: 0 });
  } else {
    const price = tempOrderCustomerId != null ? getPrice(tempOrderCustomerId, productName) : (S.catalog.find(c => c.name === productName)?.price || 0);
    const emptyIdx = tempOrderItems.findIndex(i => !i.name);
    if (emptyIdx >= 0) {
      tempOrderItems[emptyIdx] = { name: productName, qty: 1, price };
    } else {
      tempOrderItems.push({ name: productName, qty: 1, price });
    }
  }
  // Re-filter to update checkmarks
  const searchInput = document.getElementById('ppick-search-input');
  filterNewOrderProductPicker(searchInput ? searchInput.value : '');
}

function rerenderNewOrderKeepScroll() {
  const body = document.getElementById('neworder-body');
  const scrollPos = body ? body.scrollTop : 0;
  renderNewOrderPage();
  const newBody = document.getElementById('neworder-body');
  if (newBody) newBody.scrollTop = scrollPos;
}

function newOrderChangeQty(idx, delta) {
  if (!tempOrderItems[idx]) return;
  const newQty = (tempOrderItems[idx].qty || 1) + delta;
  if (newQty < 1) return;
  tempOrderItems[idx].qty = newQty;
  rerenderNewOrderKeepScroll();
}

function newOrderSetQty(idx, qty) {
  if (!tempOrderItems[idx]) return;
  tempOrderItems[idx].qty = Math.max(1, qty);
  rerenderNewOrderKeepScroll();
}

function newOrderSetPrice(idx, price) {
  if (!tempOrderItems[idx]) return;
  tempOrderItems[idx].price = Math.max(0, price);
  rerenderNewOrderKeepScroll();
}

function newOrderRemoveItem(idx) {
  tempOrderItems.splice(idx, 1);
  if (tempOrderItems.length === 0) tempOrderItems.push({ name: '', qty: 1, price: 0 });
  rerenderNewOrderKeepScroll();
}

// ── Customer Picker ──

function openNewOrderCustomerPicker() {
  if (editingOrderId) return;
  const overlay = document.createElement('div');
  overlay.className = 'customer-picker-overlay';
  overlay.id = 'customer-picker';
  overlay.innerHTML = `
    <div class="cpick-header">
      <button class="btn-ghost" onclick="closeNewOrderCustomerPicker()" style="font-size:20px;padding:4px">&larr;</button>
      <input type="text" id="cpick-search" placeholder="Search customer..." autofocus
             oninput="filterNewOrderCPicker(this.value)">
    </div>
    <div class="cpick-list" id="cpick-list"></div>
  `;
  document.body.appendChild(overlay);
  filterNewOrderCPicker('');
}

function closeNewOrderCustomerPicker() {
  const el = document.getElementById('customer-picker');
  if (el) el.remove();
}

function filterNewOrderCPicker(q) {
  const list = document.getElementById('cpick-list');
  if (!list) return;
  const query = q.toLowerCase().trim();
  let filtered = STOPS;
  if (query) filtered = STOPS.filter(s =>
    s.n.toLowerCase().includes(query) ||
    (s.c||'').toLowerCase().includes(query) ||
    (s.p||'').toLowerCase().includes(query)
  );
  filtered.sort((a, b) => a.n.localeCompare(b.n));
  list.innerHTML = filtered.map(s => {
    const dayId = S.assign[s.id];
    const dayObj = dayId ? DAYS.find(d => d.id === dayId) : null;
    return `<div class="cpick-item" onclick="pickNewOrderCustomer(${s.id})">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="font-weight:500;flex:1">${escHtml(s.n)}</div>
        ${dayObj ? `<span class="badge" style="background:${dayObj.color}20;color:${dayObj.color};font-size:10px">${dayObj.week}-${dayObj.label.slice(0,3)}</span>` : ''}
      </div>
      <div style="font-size:12px;color:var(--text-sec)">${escHtml(s.c || '')} &middot; ${escHtml(s.p || '')}</div>
    </div>`;
  }).join('');
}

function pickNewOrderCustomer(stopId) {
  tempOrderCustomerId = stopId;
  closeNewOrderCustomerPicker();
  // Update prices for selected customer
  tempOrderItems.forEach(item => {
    if (item.name) {
      item.price = getPrice(stopId, item.name);
    }
  });
  renderNewOrderPage();
}

// ── Save ──

function saveNewOrderPage() {
  if (_btnLock) return;
  _btnLock = true;
  setTimeout(() => _btnLock = false, 500);

  if (tempOrderCustomerId == null) { appAlert('Please select a customer.'); return; }
  const items = tempOrderItems.filter(i => i.name && i.qty > 0);
  if (items.length === 0) { appAlert('Please add at least one product.'); return; }

  const existingOrder = editingOrderId ? S.orders[editingOrderId] : null;
  const previousItems = existingOrder ? (existingOrder.items || []) : [];
  const stockIssues = validateTrackedStockChange(previousItems, items);
  if (stockIssues.length > 0) {
    appAlert('Insufficient stock: ' + stockIssues.join(', '));
    return;
  }

  const note = document.getElementById('neworder-note')?.value || '';
  const deliveryDate = tempOrderDeliveryDate;

  let newOrderId = null;
  if (editingOrderId && existingOrder) {
    existingOrder.items = items.map(i => ({ name: i.name, qty: i.qty, price: i.price }));
    existingOrder.note = note;
    existingOrder.deliveryDate = deliveryDate;
  } else {
    newOrderId = uid();
    S.orders[newOrderId] = {
      id: newOrderId,
      customerId: parseInt(tempOrderCustomerId),
      items: items.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
      note,
      deliveryDate,
      status: 'pending',
      payMethod: null,
      createdAt: new Date().toISOString(),
      deliveredAt: null
    };
  }

  const stockChange = applyTrackedStockChange(previousItems, items);
  if (stockChange.changed) {
    save.catalog();
    if (stockChange.lowStockWarnings.length > 0) {
      setTimeout(() => appAlert('Low stock:<br>' + stockChange.lowStockWarnings.join('<br>')), 300);
    }
  }

  const savedOrderId = editingOrderId || newOrderId;
  editingOrderId = null;
  save.orders([savedOrderId]);

  showToast(newOrderId ? 'Order created' : 'Order updated', 'success');
  showPage(newOrderPreviousPage);
}
