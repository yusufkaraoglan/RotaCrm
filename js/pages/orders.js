'use strict';
const _debouncedOrderSearch = debounce(() => renderOrderResults(), 300);
const _debouncedProductFilter = debounce((q) => filterProductPicker(q), 200);
const _debouncedCustomerFilter = debounce((q) => filterCPicker(q), 200);

function renderOrders(fullRender) {
  const isSearchUpdate = !fullRender && document.getElementById('orders-results');

  if (!isSearchUpdate) {
    let html = `
      <header class="topbar">
        <h1>Orders</h1>
        <div class="topbar-actions">
          <span class="badge badge-outline" id="orders-pending-badge">${Object.values(S.orders).filter(o=>o.status==='pending'&&o.payMethod!=='visit').length} pending</span>
        </div>
      </header>
      <div class="page-body">
        <div class="search-bar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Search customer..." value="${escHtml(S.ordersSearch)}" oninput="S.ordersSearch=this.value;_debouncedOrderSearch()">
        </div>
        <div class="chip-group">
          <button class="chip ${S.ordersFilter==='pending'?'active':''}" onclick="S.ordersFilter='pending';renderOrders(true)">Pending</button>
          <button class="chip ${S.ordersFilter==='delivered'?'active':''}" onclick="S.ordersFilter='delivered';renderOrders(true)">Delivered</button>
          <button class="chip ${S.ordersFilter==='all'?'active':''}" onclick="S.ordersFilter='all';renderOrders(true)">All</button>
        </div>
        <div id="orders-results"></div>
      </div>
      <button class="fab" onclick="openNewOrderPage()" aria-label="New Order">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>`;
    document.getElementById('page-orders').innerHTML = html;
  }

  renderOrderResults();
}

function renderOrderResults() {
  const container = document.getElementById('orders-results');
  if (!container) return;

  let orders = Object.values(S.orders).filter(o => o.payMethod !== 'visit' || (o.items && o.items.length > 0));
  if (S.ordersFilter === 'pending') orders = orders.filter(o => o.status === 'pending');
  else if (S.ordersFilter === 'delivered') orders = orders.filter(o => o.status === 'delivered');
  if (S.ordersSearch) {
    const q = S.ordersSearch.toLowerCase();
    orders = orders.filter(o => { const stop = getStop(o.customerId); return stop && stop.n.toLowerCase().includes(q); });
  }

  // Sorting logic
  if (S.ordersFilter === 'pending') {
    // Pending: locked orders first (in their saved order), then unlocked by date
    const locked = S.ordersLockedOrders || [];
    const orderMap = new Map(orders.map(o => [o.id, o]));
    const lockedSet = new Set(locked);
    const lockedOrders = [];
    locked.forEach(id => {
      const o = orderMap.get(id);
      if (o) lockedOrders.push(o);
    });
    const unlockedOrders = orders.filter(o => !lockedSet.has(o.id));
    unlockedOrders.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    orders = [...lockedOrders, ...unlockedOrders];
  } else if (S.ordersFilter === 'delivered') {
    // Delivered: newest delivery first
    orders.sort((a, b) => (b.deliveredAt || '').localeCompare(a.deliveredAt || ''));
  } else {
    // All: newest first by createdAt
    orders.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }

  // Update badge
  const badge = document.getElementById('orders-pending-badge');
  if (badge) badge.textContent = Object.values(S.orders).filter(o=>o.status==='pending'&&o.payMethod!=='visit').length + ' pending';

  const isPending = S.ordersFilter === 'pending';
  const locked = S.ordersLockedOrders || [];

  let html = '';
  if (orders.length === 0) {
    html = `<div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
      <p><b>No orders found</b></p><p>Create a new order with the + button</p></div>`;
  } else {
    if (isPending) {
      html += `<div id="orders-drag-list">`;
    }
    orders.forEach((o, oIdx) => {
      const stop = getStop(o.customerId);
      const total = calcOrderTotal(o);
      const dayId = S.assign[o.customerId];
      const dayObj = dayId ? DAYS.find(d => d.id === dayId) : null;
      const isLocked = locked.includes(o.id);
      const isDelivered = o.status === 'delivered';

      html += `
        <div class="order-card-v2${isPending ? ' draggable-order' : ''}" data-order-id="${o.id}" ${isPending && !isLocked ? 'draggable="true"' : ''}>
          <div class="order-card-v2-header">
            ${isPending ? `<div class="order-drag-row">
              <button class="order-lock-btn${isLocked ? ' locked' : ''}" onclick="event.stopPropagation();toggleOrderLock('${o.id}')" title="${isLocked ? 'Unlock' : 'Lock'}">
                ${isLocked ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>' : '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 019.9-1"/></svg>'}
              </button>
            </div>` : ''}
            <div class="order-card-v2-name" onclick="showProfile(${o.customerId})" style="cursor:pointer">${stop ? escHtml(stop.n) : 'Unknown'}</div>
            ${dayObj ? `<span class="badge" style="background:${dayObj.color}20;color:${dayObj.color};font-size:10px;font-weight:600;flex-shrink:0">${dayObj.week}-${dayObj.label.slice(0,3)}</span>` : ''}
          </div>
          <div class="order-card-v2-items">${o.items.map(i => `${i.qty}x ${escHtml(i.name)}`).join(', ')}</div>
          <div class="order-card-v2-footer">
            <span class="order-card-v2-price">${formatCurrency(total)}</span>
            ${isDelivered ? `<span style="font-size:11px;color:var(--text-muted)">${o.payMethod || ''} · ${formatDate(o.deliveredAt)}</span>` : ''}
            <div class="order-card-v2-actions">
              ${o.status === 'pending' ? `
                <button class="btn btn-success btn-sm" onclick="showDeliveryFromOrder('${o.id}')">Deliver</button>
                <button class="btn btn-outline btn-sm" onclick="openEditOrderPage('${o.id}')">Edit</button>
              ` : ''}
              <button class="btn btn-sm" style="color:var(--danger);border:1px solid var(--danger)" onclick="deleteOrderFromList('${o.id}')">Delete</button>
            </div>
          </div>
        </div>`;
    });
    if (isPending) {
      html += `</div>`;
    }
  }
  container.innerHTML = html;

  // Init drag-and-drop for pending orders
  if (isPending) initOrderDragDrop();
}

function showDeliveryFromOrder(orderId) {
  const order = S.orders[orderId];
  if (order) showDeliveryModal(order.customerId, orderId);
}

async function deleteOrderFromList(orderId) {
  await deleteOrder(orderId);
}

function toggleOrderLock(orderId) {
  const locked = S.ordersLockedOrders || [];
  const idx = locked.indexOf(orderId);
  if (idx >= 0) {
    locked.splice(idx, 1);
  } else {
    locked.push(orderId);
  }
  S.ordersLockedOrders = locked;
  DB.setSetting('ordersLockedOrders', locked);
  renderOrderResults();
}

let _orderDragAbort = null;
function initOrderDragDrop() {
  const list = document.getElementById('orders-drag-list');
  if (!list) return;

  // Abort previous listeners cleanly
  if (_orderDragAbort) _orderDragAbort.abort();
  _orderDragAbort = new AbortController();
  const signal = _orderDragAbort.signal;

  let draggedId = null;

  list.addEventListener('dragstart', e => {
    const card = e.target.closest('.draggable-order');
    if (!card || card.getAttribute('draggable') !== 'true') { e.preventDefault(); return; }
    draggedId = card.dataset.orderId;
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  }, { signal });

  list.addEventListener('dragend', e => {
    const card = e.target.closest('.draggable-order');
    if (card) card.classList.remove('dragging');
    list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    draggedId = null;
  }, { signal });

  list.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const target = e.target.closest('.draggable-order');
    list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    if (target && target.dataset.orderId !== draggedId) {
      target.classList.add('drag-over');
    }
  }, { signal });

  list.addEventListener('drop', e => {
    e.preventDefault();
    const target = e.target.closest('.draggable-order');
    if (!target || !draggedId || target.dataset.orderId === draggedId) return;
    const targetId = target.dataset.orderId;
    if (!S.orders[draggedId] || !S.orders[targetId]) return;

    const locked = S.ordersLockedOrders || [];
    const filteredLocked = locked.filter(id => id !== draggedId);
    const targetIdx = filteredLocked.indexOf(targetId);
    if (targetIdx >= 0) {
      filteredLocked.splice(targetIdx, 0, draggedId);
    } else {
      filteredLocked.push(draggedId);
    }
    S.ordersLockedOrders = filteredLocked;
    DB.setSetting('ordersLockedOrders', filteredLocked);
    renderOrderResults();
  }, { signal });

  // Touch drag support
  let touchDragId = null;
  let touchClone = null;
  let touchStartY = 0;
  let longPressTimer = null;

  list.addEventListener('touchstart', e => {
    const card = e.target.closest('.draggable-order');
    if (!card || card.getAttribute('draggable') !== 'true') return;
    if (e.target.closest('.order-lock-btn') || e.target.closest('.btn')) return;
    touchStartY = e.touches[0].clientY;
    longPressTimer = setTimeout(() => {
      touchDragId = card.dataset.orderId;
      card.classList.add('dragging');
      touchClone = card.cloneNode(true);
      touchClone.style.cssText = 'position:fixed;z-index:9999;pointer-events:none;opacity:0.8;width:' + card.offsetWidth + 'px;transform:scale(0.95);box-shadow:0 8px 24px rgba(0,0,0,0.2);left:' + card.getBoundingClientRect().left + 'px;top:' + (e.touches[0].clientY - 30) + 'px';
      document.body.appendChild(touchClone);
    }, 300);
  }, { passive: true, signal });

  list.addEventListener('touchmove', e => {
    if (!touchDragId) {
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
      return;
    }
    e.preventDefault();
    if (touchClone) touchClone.style.top = (e.touches[0].clientY - 30) + 'px';
    list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    const el = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY);
    if (el) {
      const target = el.closest('.draggable-order');
      if (target && target.dataset.orderId !== touchDragId) target.classList.add('drag-over');
    }
  }, { passive: false, signal });

  list.addEventListener('touchend', e => {
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
    if (!touchDragId) return;
    if (touchClone) { touchClone.remove(); touchClone = null; }
    const cards = list.querySelectorAll('.draggable-order');
    cards.forEach(c => { c.classList.remove('dragging'); c.classList.remove('drag-over'); });

    const el = document.elementFromPoint(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    if (el) {
      const target = el.closest('.draggable-order');
      if (target && target.dataset.orderId !== touchDragId) {
        const targetId = target.dataset.orderId;
        const locked = S.ordersLockedOrders || [];
        const filteredLocked = locked.filter(id => id !== touchDragId);
        const targetIdx = filteredLocked.indexOf(targetId);
        if (targetIdx >= 0) {
          filteredLocked.splice(targetIdx, 0, touchDragId);
        } else {
          filteredLocked.push(touchDragId);
        }
        S.ordersLockedOrders = filteredLocked;
        DB.setSetting('ordersLockedOrders', filteredLocked);
        renderOrderResults();
      }
    }
    touchDragId = null;
  }, { signal });
}

function quickReorder(customerId, lastOrderId) {
  const lastOrder = S.orders[lastOrderId];
  if (!lastOrder || !lastOrder.items || lastOrder.items.length === 0) return;
  editingOrderId = null;
  tempOrderCustomerId = customerId;
  tempOrderItems = lastOrder.items.map(i => ({ name: i.name, qty: i.qty, price: i.price }));
  tempOrderDeliveryDate = '';
  newOrderPreviousPage = curPage || 'orders';
  newOrderProductSearch = '';
  showPage('neworder');
}

function closeOrderForm() {
  const el = document.getElementById('order-form-overlay');
  if (el) el.remove();
  document.body.style.overflow = '';
}

function showNewOrderModal(preCustomerId) {
  editingOrderId = null;
  tempOrderItems = [{ name: '', qty: 1, price: 0 }];
  tempOrderCustomerId = preCustomerId != null ? preCustomerId : null;
  tempOrderDeliveryDate = '';
  renderOrderFormModal('New Order');
}

function showEditOrderModal(orderId) {
  const order = S.orders[orderId];
  if (!order) return;
  editingOrderId = orderId;
  tempOrderCustomerId = order.customerId;
  tempOrderItems = order.items.map(i => ({ ...i }));
  if (tempOrderItems.length === 0) tempOrderItems = [{ name: '', qty: 1, price: 0 }];
  tempOrderDeliveryDate = order.deliveryDate || '';
  renderOrderFormModal('Edit Order', order.note || '');
}

function renderOrderFormModal(title, existingNote) {
  // Preserve note from existing form if re-rendering
  if (existingNote === undefined) {
    const noteEl = document.getElementById('order-note');
    if (noteEl) existingNote = noteEl.value;
  }
  const selectedStop = tempOrderCustomerId !== null && tempOrderCustomerId !== undefined ? getStop(tempOrderCustomerId) : null;

  let itemsHtml = '';
  let total = 0;
  tempOrderItems.forEach((item, idx) => {
    if (!item.name) return;
    const lineTotal = (item.qty || 0) * (item.price || 0);
    total += lineTotal;
    itemsHtml += `
      <div style="background:var(--bg);border-radius:var(--radius-sm);padding:10px 12px;margin-bottom:8px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <div style="font-size:14px;font-weight:600;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(item.name)}</div>
          <button style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:12px;flex-shrink:0" onclick="removeOrderItem(${idx})">&#10005;</button>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
          <div style="display:flex;align-items:center;gap:4px">
            <button class="qty-btn" onclick="changeOrderItemQty(${idx},-1)">−</button>
            <input type="number" class="qty-input" value="${item.qty}" min="1"
                   onchange="setOrderItemQty(${idx},parseInt(this.value)||1)"
                   onclick="this.select()">
            <button class="qty-btn" onclick="changeOrderItemQty(${idx},1)">+</button>
            <span style="color:var(--text-sec);font-size:11px;margin-left:2px">x</span>
            <div style="display:flex;align-items:center;border:1.5px solid var(--border);border-radius:6px;padding:4px 8px;background:var(--card)" onclick="this.querySelector('input').focus()">
              <span style="color:var(--text-sec);font-size:13px;margin-right:2px">£</span>
              <input type="number" step="0.01" value="${item.price}" min="0"
                     onchange="setOrderItemPrice(${idx},parseFloat(this.value)||0)"
                     onclick="this.select()"
                     style="width:50px;font-size:14px;font-weight:600;border:none;background:transparent;color:var(--text);padding:0;outline:none;-moz-appearance:textfield">
            </div>
          </div>
          <div id="order-line-total-${idx}" style="font-size:15px;font-weight:700;flex-shrink:0">${formatCurrency(lineTotal)}</div>
        </div>
      </div>`;
  });

  const hasEmptyItems = tempOrderItems.some(i => !i.name);
  const itemCount = tempOrderItems.filter(i => i.name).length;

  // Close any existing modal first
  closeModal();
  // Remove existing order form overlay if any
  const existingOverlay = document.getElementById('order-form-overlay');
  if (existingOverlay) existingOverlay.remove();

  const overlay = document.createElement('div');
  overlay.className = 'order-form-overlay';
  overlay.id = 'order-form-overlay';
  overlay.innerHTML = `
    <div class="order-form-header">
      <button class="btn-ghost" onclick="closeOrderForm()" style="font-size:20px;padding:4px">&larr;</button>
      <h2>${title}</h2>
    </div>
    <div class="order-form-body">
      <div class="form-group">
        <label class="form-label">Customer</label>
        <div class="input" id="cust-display"
             onclick="${editingOrderId ? '' : 'openCustomerPicker()'}"
             style="cursor:${editingOrderId ? 'default' : 'pointer'};color:${selectedStop ? 'var(--text)' : 'var(--text-muted)'};${editingOrderId ? 'opacity:0.6' : ''}">
          ${selectedStop ? escHtml(selectedStop.n) : 'Tap to select a customer...'}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Products${itemCount > 0 ? ' (' + itemCount + ')' : ''}</label>
        <div id="order-items-list">${itemsHtml || '<div style="text-align:center;padding:12px;color:var(--text-muted);font-size:13px">No products added yet</div>'}</div>
        <button class="btn btn-outline btn-block mt-1" onclick="openProductPicker()" style="gap:6px">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Product
        </button>
      </div>
      <div class="flex-between mb-2" style="padding:12px;background:var(--card);border-radius:var(--radius-sm)">
        <span style="font-weight:700;font-size:16px">Total</span>
        <span style="font-weight:700;font-size:18px;color:var(--primary)" id="order-total">${formatCurrency(total)}</span>
      </div>
      <div class="form-group">
        <label class="form-label">Delivery Date & Time</label>
        <input class="input" type="datetime-local" id="order-delivery-date" value="${tempOrderDeliveryDate}" onchange="tempOrderDeliveryDate=this.value">
        <div class="text-muted" style="font-size:11px;margin-top:4px">${tempOrderDeliveryDate ? '' : 'If left empty, defaults to today'}</div>
      </div>
      <div class="form-group">
        <label class="form-label">Note (optional)</label>
        <textarea class="textarea" id="order-note" rows="2" style="min-height:50px">${existingNote !== undefined ? escHtml(existingNote) : ''}</textarea>
      </div>
    </div>
    <div class="order-form-footer">
      <button class="btn btn-primary btn-block" onclick="saveOrder()">${editingOrderId ? 'Update Order' : 'Save Order'}</button>
    </div>
  `;
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
}

function changeOrderItemQty(idx, delta) {
  if (!tempOrderItems[idx]) return;
  const newQty = (tempOrderItems[idx].qty || 1) + delta;
  if (newQty < 1) return;
  tempOrderItems[idx].qty = newQty;
  renderOrderFormModal(editingOrderId ? 'Edit Order' : 'New Order');
}

function setOrderItemQty(idx, qty) {
  if (!tempOrderItems[idx]) return;
  tempOrderItems[idx].qty = Math.max(1, qty);
  updateOrderFormTotals();
}

function setOrderItemPrice(idx, price) {
  if (!tempOrderItems[idx]) return;
  tempOrderItems[idx].price = Math.max(0, price);
  updateOrderFormTotals();
}

function updateOrderFormTotals() {
  let total = 0;
  tempOrderItems.forEach((item, idx) => {
    if (!item.name) return;
    const lineTotal = (item.qty || 0) * (item.price || 0);
    total += lineTotal;
    const lineEl = document.getElementById('order-line-total-' + idx);
    if (lineEl) lineEl.textContent = formatCurrency(lineTotal);
  });
  const totalEl = document.getElementById('order-total');
  if (totalEl) totalEl.textContent = formatCurrency(total);
}

function openProductPicker() {
  const overlay = document.createElement('div');
  overlay.className = 'product-picker-overlay';
  overlay.id = 'product-picker';
  overlay.innerHTML = `
    <div class="ppick-header">
      <button class="btn-ghost" onclick="closeProductPicker()" style="font-size:20px;padding:4px">&larr;</button>
      <input type="text" id="ppick-search" placeholder="Search product..." autofocus
             oninput="_debouncedProductFilter(this.value)">
    </div>
    <div class="ppick-list" id="ppick-list"></div>
    <div style="padding:12px 16px calc(12px + var(--safe-b));background:var(--card);border-top:1px solid var(--border)">
      <button class="btn btn-primary btn-block" id="ppick-done-btn" onclick="doneProductPicker()">Done</button>
    </div>
  `;
  document.body.appendChild(overlay);
  filterProductPicker('');
}

function closeProductPicker() {
  const el = document.getElementById('product-picker');
  if (el) el.remove();
}

function doneProductPicker() {
  closeProductPicker();
  renderOrderFormModal(editingOrderId ? 'Edit Order' : 'New Order');
}

function updateDoneBtn() {
  const btn = document.getElementById('ppick-done-btn');
  if (!btn) return;
  const count = tempOrderItems.filter(i => i.name).length;
  btn.textContent = count > 0 ? 'Done (' + count + ' selected)' : 'Done';
}

function filterProductPicker(q) {
  const list = document.getElementById('ppick-list');
  if (!list) return;
  const query = q.toLowerCase().trim();
  let filtered = S.catalog;
  if (query) filtered = S.catalog.filter(c => c.name.toLowerCase().includes(query));

  const selectedNames = tempOrderItems.filter(i => i.name).map(i => i.name);

  list.innerHTML = filtered.map(c => {
    const isSelected = selectedNames.includes(c.name);
    const outOfStock = c.trackStock !== false && c.stock != null && c.stock <= 0;
    return `<div class="ppick-item${isSelected ? ' selected' : ''}${outOfStock ? ' out-of-stock' : ''}" onclick="${outOfStock ? '' : `toggleProductInOrder('${escHtml(c.name)}')`}" style="${outOfStock ? 'opacity:0.4;pointer-events:none' : ''}">
      <div class="ppick-item-info">
        <div class="ppick-item-name">${escHtml(c.name)}${outOfStock ? ' <span style="color:var(--danger);font-size:11px">(Out of stock)</span>' : (c.trackStock !== false && c.stock != null ? ` <span style="color:var(--text-sec);font-size:11px">(${c.stock})</span>` : '')}</div>
        <div class="ppick-item-detail">${escHtml(c.unit || 'No unit')}</div>
      </div>
      <div class="ppick-item-price">${formatCurrency(tempOrderCustomerId != null ? getPrice(tempOrderCustomerId, c.name) : c.price)}</div>
      <div class="ppick-item-check">${isSelected ? '✓' : ''}</div>
    </div>`;
  }).join('');

  if (filtered.length === 0) {
    list.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted)">Product not found</div>';
  }
}

function toggleProductInOrder(productName) {
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
  filterProductPicker(document.getElementById('ppick-search')?.value || '');
  updateDoneBtn();
}

function openCustomerPicker() {
  if (editingOrderId) return;
  const overlay = document.createElement('div');
  overlay.className = 'customer-picker-overlay';
  overlay.id = 'customer-picker';
  overlay.innerHTML = `
    <div class="cpick-header">
      <button class="btn-ghost" onclick="closeCustomerPicker()" style="font-size:20px;padding:4px">&larr;</button>
      <input type="text" id="cpick-search" placeholder="Search customer..." autofocus
             oninput="_debouncedCustomerFilter(this.value)">
    </div>
    <div class="cpick-list" id="cpick-list"></div>
  `;
  document.body.appendChild(overlay);
  filterCPicker('');
}

function filterCPicker(q) {
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
  list.innerHTML = filtered.map(s =>
    `<div class="cpick-item" onclick="pickCustomer(${s.id})">
      <div style="font-weight:500">${escHtml(s.n)}</div>
      <div style="font-size:12px;color:var(--text-sec)">${escHtml(s.c)} &middot; ${escHtml(s.p)}</div>
    </div>`
  ).join('');
}

function pickCustomer(stopId) {
  tempOrderCustomerId = stopId;
  closeCustomerPicker();
  updateOrderPrices();
}

function closeCustomerPicker() {
  const el = document.getElementById('customer-picker');
  if (el) el.remove();
}

function updateOrderItem(idx, field, value) {
  if (!tempOrderItems[idx]) return;
  tempOrderItems[idx][field] = value;
  if (field === 'name' && value) {
    const price = tempOrderCustomerId != null ? getPrice(tempOrderCustomerId, value) : (S.catalog.find(c => c.name === value)?.price || 0);
    tempOrderItems[idx].price = price;
  }
  renderOrderFormModal(editingOrderId ? 'Edit Order' : 'New Order');
}

function updateOrderPrices() {
  tempOrderItems.forEach(item => {
    if (item.name) {
      item.price = tempOrderCustomerId != null ? getPrice(tempOrderCustomerId, item.name) : (S.catalog.find(c => c.name === item.name)?.price || 0);
    }
  });
  renderOrderFormModal(editingOrderId ? 'Edit Order' : 'New Order');
}

function addOrderItem() {
  openProductPicker();
}

function removeOrderItem(idx) {
  tempOrderItems.splice(idx, 1);
  if (tempOrderItems.length === 0) tempOrderItems.push({ name: '', qty: 1, price: 0 });
  renderOrderFormModal(editingOrderId ? 'Edit Order' : 'New Order');
}

async function saveOrder() {
  if (_btnLock) return;
  _btnLock = true;
  setTimeout(() => _btnLock = false, 2000);

  if (tempOrderCustomerId == null || isNaN(parseInt(tempOrderCustomerId))) { appAlert('Please select a customer.'); return; }
  const items = tempOrderItems.filter(i => i.name && i.qty > 0);
  if (items.length === 0) { appAlert('Please add at least one product.'); return; }

  const existingOrder = editingOrderId ? S.orders[editingOrderId] : null;
  const previousItems = existingOrder ? (existingOrder.items || []) : [];
  const stockIssues = validateTrackedStockChange(previousItems, items);
  if (stockIssues.length > 0) {
    appAlert('Insufficient stock: ' + stockIssues.join(', '));
    return;
  }

  const note = document.getElementById('order-note')?.value || '';
  const deliveryDate = document.getElementById('order-delivery-date')?.value || '';

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

  // Only deduct stock if editing a DELIVERED order (pending orders don't affect stock)
  const isDelivered = editingOrderId && existingOrder && existingOrder.status === 'delivered';
  if (isDelivered) {
    const stockChange = applyTrackedStockChange(previousItems, items);
    if (stockChange.changed) {
      save.catalog();
      if (stockChange.lowStockWarnings.length > 0) {
        setTimeout(() => appAlert('Low stock:<br>' + stockChange.lowStockWarnings.map(w => escHtml(w)).join('<br>'), true), 300);
      }
    }
  }

  const savedOrderId = editingOrderId || newOrderId;
  editingOrderId = null;
  await save.orders([savedOrderId]);
  closeOrderForm();
  closeModal();
  if (curPage === 'orders') renderOrders();
  else if (curPage === 'profile') renderProfile();
  else if (curPage === 'route') renderRoute();
}

// ══════════════════════════════════════════════════════════════
