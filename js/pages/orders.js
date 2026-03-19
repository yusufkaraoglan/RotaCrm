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
              <button class="order-lock-btn${isLocked ? ' locked' : ''}" data-id="${escHtml(o.id)}" onclick="event.stopPropagation();toggleOrderLock(this.dataset.id)" title="${isLocked ? 'Unlock' : 'Lock'}">
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
                <button class="btn btn-success btn-sm" data-id="${escHtml(o.id)}" onclick="showDeliveryFromOrder(this.dataset.id)">Deliver</button>
                <button class="btn btn-outline btn-sm" data-id="${escHtml(o.id)}" onclick="openEditOrderPage(this.dataset.id)">Edit</button>
              ` : ''}
              <button class="btn btn-sm" style="color:var(--danger);border:1px solid var(--danger)" data-id="${escHtml(o.id)}" onclick="deleteOrderFromList(this.dataset.id)">Delete</button>
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

  let ordDragOver = null;
  list.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const target = e.target.closest('.draggable-order');
    if (ordDragOver && ordDragOver !== target) ordDragOver.classList.remove('drag-over');
    if (target && target.dataset.orderId !== draggedId) {
      target.classList.add('drag-over');
      ordDragOver = target;
    } else { ordDragOver = null; }
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
  let ordTouchDragOver = null;
  let ordLastTouchMove = 0;

  list.addEventListener('touchstart', e => {
    const card = e.target.closest('.draggable-order');
    if (!card || card.getAttribute('draggable') !== 'true') return;
    if (e.target.closest('.order-lock-btn') || e.target.closest('.btn')) return;
    touchStartY = e.touches[0].clientY;
    longPressTimer = setTimeout(() => {
      touchDragId = card.dataset.orderId;
      card.classList.add('dragging');
      touchClone = card.cloneNode(true);
      touchClone.style.cssText = 'position:fixed;z-index:9999;pointer-events:none;opacity:0.8;width:' + card.offsetWidth + 'px;box-shadow:0 8px 24px rgba(0,0,0,0.2);left:' + card.getBoundingClientRect().left + 'px;top:' + (e.touches[0].clientY - 30) + 'px;will-change:transform';
      document.body.appendChild(touchClone);
    }, 300);
  }, { passive: true, signal });

  list.addEventListener('touchmove', e => {
    if (!touchDragId) {
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
      return;
    }
    e.preventDefault();
    const now = Date.now();
    if (now - ordLastTouchMove < 16) return;
    ordLastTouchMove = now;
    if (touchClone) touchClone.style.transform = 'translateY(' + (e.touches[0].clientY - touchStartY) + 'px) scale(0.95)';
    if (ordTouchDragOver) ordTouchDragOver.classList.remove('drag-over');
    const el = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY);
    if (el) {
      const target = el.closest('.draggable-order');
      if (target && target.dataset.orderId !== touchDragId) {
        target.classList.add('drag-over');
        ordTouchDragOver = target;
      } else { ordTouchDragOver = null; }
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
