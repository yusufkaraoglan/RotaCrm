'use strict';
// ══════════════════════════════════════════════════════════════
// ROUTE PAGE
// ══════════════════════════════════════════════════════════════
let routeSearchTerm = '';
let routeLockedStops = [];
let visitPayMethod = null;
const _routeLockedCache = {}; // in-memory cache for locked stops per day
const _debouncedRouteSearch = debounce(() => renderRouteSearchResults(), 300);

function renderRoute() {
  const week = S.routeWeek;
  const days = DAYS.filter(d => d.week === week);
  const dayObj = days[S.routeDay] || days[0];
  if (!dayObj) return;
  const dayId = dayObj.id;

  // Load locked stops from memory (loaded from DB on init)
  routeLockedStops = _routeLockedCache[dayId] || [];

  // Get assigned stops for this day
  const assigned = [];
  Object.entries(S.assign).forEach(([sid, did]) => {
    if (did === dayId) assigned.push(parseInt(sid));
  });

  // Sort by route order: locked first (in saved order), then unlocked
  const ro = S.routeOrder[dayId] || [];
  const allSorted = [...new Set([...ro.filter(id => assigned.includes(id)), ...assigned])];

  // Apply lock ordering: locked stops first in their locked order, then rest
  const lockedStops = [];
  routeLockedStops.forEach(id => {
    if (allSorted.includes(id)) lockedStops.push(id);
  });
  const unlockedStops = allSorted.filter(id => !routeLockedStops.includes(id));
  const sorted = [...lockedStops, ...unlockedStops];

  // Current date info
  const dateInfo = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  let html = `
    <header class="topbar">
      <div>
        <h1>Route</h1>
        <div style="font-size:11px;color:var(--text-sec);display:flex;gap:8px;align-items:center">
          <span>${dateInfo}</span>
          <span id="sync-status" style="font-size:10px">${typeof getLastSyncTimeLabel === 'function' ? (navigator.onLine ? 'Synced ' + getLastSyncTimeLabel() : '<span style=color:var(--danger)>Offline</span>') : ''}</span>
        </div>
      </div>
      <div class="topbar-actions">
        <button class="btn-ghost" onclick="optimizeRouteOrder()" title="Optimize Route Order">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        </button>
        <button class="btn-ghost" onclick="shareRouteSummary()" title="Share Route Summary">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        </button>
        <button class="btn-ghost" onclick="showExportRouteModal()" title="Export Route">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        </button>
        <button class="btn-ghost" onclick="showImportModal()" title="Import">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
      </div>
    </header>
    <div class="route-search-bar">
      <div class="search-bar" style="margin:0">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" placeholder="Search all customers..." value="${escHtml(routeSearchTerm)}" oninput="routeSearchTerm=this.value;_debouncedRouteSearch()">
      </div>
    </div>
    ${buildStockWarningBannerHtml()}
    <div id="route-search-results" class="${routeSearchTerm ? '' : 'hidden'}"></div>
    <div id="route-main-content" class="${routeSearchTerm ? 'hidden' : ''}">
    <div class="week-toggle">
      <button class="week-btn ${week==='A'?'active':''}" onclick="setRouteWeek('A')">Week A</button>
      <button class="week-btn ${week==='B'?'active':''}" onclick="setRouteWeek('B')">Week B</button>
    </div>
    <div class="day-tabs">
      ${days.map((d, i) => {
        const dayStops = Object.entries(S.assign).filter(([,did]) => did === d.id).map(([sid]) => parseInt(sid));
        const dayStopSet = new Set(dayStops);
        const dayPending = Object.values(S.orders).filter(o => o.status === 'pending' && dayStopSet.has(o.customerId)).length;
        return `
        <button class="day-tab ${i===S.routeDay?'active':''}"
                style="${i===S.routeDay ? 'background:'+d.color+';color:#fff' : ''};position:relative"
                onclick="setRouteDay(${i})">${d.label.slice(0,3)}${dayPending > 0 ? `<span style="position:absolute;top:2px;right:2px;width:8px;height:8px;border-radius:50%;background:var(--warning);${i===S.routeDay ? 'background:#fff' : ''}"></span>` : ''}</button>`;
      }).join('')}
    </div>
    <div class="page-body">
      <div id="route-list">`;

  html += buildRouteListHtml(sorted, dayObj, sorted);
  html += `</div></div>`;

  // Close route-main-content
  html += `</div>`;

  // Summary bar
  const deliveredCount = sorted.filter(id => isDeliveredThisWeek(id)).length;
  const rev = calcDayRevenue(dayId);
  html += `
    <div class="route-summary" style="flex-wrap:wrap;gap:6px;cursor:pointer" onclick="showDayCashSummary()">
      <span>${deliveredCount} / ${sorted.length} delivered</span>
      <div style="display:flex;gap:10px;font-size:12px">
        <span style="color:var(--success)">Cash ${formatCurrency(rev.cash)}</span>
        <span style="color:var(--info)">Bank ${formatCurrency(rev.bank)}</span>
        <span style="color:var(--danger)">Unpaid ${formatCurrency(rev.unpaid)}</span>
      </div>
    </div>`;

  document.getElementById('page-route').innerHTML = html;
  initRouteDragDrop();
}

function buildRouteListHtml(filtered, dayObj, allSorted) {
  if (filtered.length === 0) {
    return `<div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
      <p><b>No customers assigned to this day</b></p>
      <p>You can assign days from the Customers page</p>
    </div>`;
  }

  // Pre-compute order data per customer to avoid O(N×M) loops
  const thisMonday = getWeekMondayStr(new Date());
  const pendingByCustomer = {};
  const weekOrdersByCustomer = {};
  Object.values(S.orders).forEach(o => {
    const cid = o.customerId;
    if (o.status === 'pending') {
      if (!pendingByCustomer[cid]) pendingByCustomer[cid] = [];
      pendingByCustomer[cid].push(o);
    }
    if (o.status === 'delivered' && o.deliveredAt && getWeekMondayStr(o.deliveredAt) === thisMonday) {
      if (!weekOrdersByCustomer[cid]) weekOrdersByCustomer[cid] = [];
      weekOrdersByCustomer[cid].push(o);
    }
  });

  const stopMap = new Map(STOPS.map(s => [s.id, s]));
  const lockedSet = new Set(routeLockedStops);
  const sortedIndexMap = new Map(allSorted.map((id, i) => [id, i]));

  let html = '';
  filtered.forEach((stopId) => {
    const stop = stopMap.get(stopId) || getStop(stopId);
    if (!stop) return;
    const idx = sortedIndexMap.get(stopId) ?? allSorted.indexOf(stopId);
    const pending = pendingByCustomer[stopId] || [];
    const weekOrders = weekOrdersByCustomer[stopId] || [];
    const delivered = weekOrders.length > 0;
    const todayRev = weekOrders.reduce((s, o) => s + calcOrderTotal(o), 0);
    const isVisited = delivered && weekOrders.every(o => o.payMethod === 'visit');
    const debt = S.debts[stopId] || 0;
    const isLocked = lockedSet.has(stopId);

    html += `
      <div class="route-card ${delivered ? 'delivered' : ''}${!isLocked ? ' draggable-route' : ''}" style="border-left-color:${dayObj.color}" data-stop-id="${stopId}" ${!isLocked ? 'draggable="true"' : ''}>
        <div class="route-lock-col">
          <button class="order-lock-btn${isLocked ? ' locked' : ''}" onclick="event.stopPropagation();toggleRouteLock(${stopId})" title="${isLocked ? 'Unlock' : 'Lock position'}">
            ${isLocked ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>' : '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 019.9-1"/></svg>'}
          </button>
        </div>
        <span class="route-order-num">${idx + 1}</span>
        <div class="route-card-body" onclick="showProfile(${stopId})" style="cursor:pointer">
          <div class="route-card-name">${escHtml(stop.n)}</div>
          <div class="route-card-sub">${escHtml(stop.c)} &middot; ${escHtml(stop.p)}</div>
          <div class="route-card-badges">
            ${pending.length > 0 ? `<span class="badge badge-warning">${pending.length} pending</span>` : ''}
            ${delivered ? `<span class="badge badge-success">${isVisited ? 'Visit' : 'Delivered'}</span>` : ''}
            ${todayRev > 0 ? `<span class="badge badge-info">${formatCurrency(todayRev)}</span>` : ''}
            ${!delivered && debt > 0 ? getDebtAgeBadge(stopId, debt) : ''}
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex-shrink:0">
          <button class="delivery-btn ${delivered ? 'done' : ''}" onclick="event.stopPropagation();${delivered ? '' : `showDeliveryModal(${stopId})`}" title="${pending.length === 0 && !delivered ? 'Visit' : ''}">
            ${delivered ? '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>'
                        : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="3"/></svg>'}
          </button>
          ${!delivered ? `<button class="btn-ghost" onclick="event.stopPropagation();skipRouteStop(${stopId})" title="Skip - move to end" style="padding:2px;font-size:10px;color:var(--text-sec);line-height:1">Skip</button>` : ''}
        </div>
      </div>`;
  });
  return html;
}

function renderRouteSearchResults() {
  const searchContainer = document.getElementById('route-search-results');
  const mainContent = document.getElementById('route-main-content');
  if (!searchContainer || !mainContent) return;

  if (!routeSearchTerm) {
    searchContainer.classList.add('hidden');
    mainContent.classList.remove('hidden');
    return;
  }

  searchContainer.classList.remove('hidden');
  mainContent.classList.add('hidden');

  const q = routeSearchTerm.toLowerCase();
  const results = STOPS.filter(s =>
    s.n.toLowerCase().includes(q) ||
    (s.c||'').toLowerCase().includes(q) ||
    (s.p||'').toLowerCase().includes(q) ||
    (s.a||'').toLowerCase().includes(q)
  ).slice(0, 20);

  if (results.length === 0) {
    searchContainer.innerHTML = `<div style="padding:30px 16px" class="empty-state"><p>No customers found</p></div>`;
    return;
  }

  let html = `<div style="padding:8px 16px;overflow-y:auto;flex:1;-webkit-overflow-scrolling:touch">`;
  results.forEach(s => {
    const dayId = S.assign[s.id];
    const dayObj = dayId ? DAYS.find(d => d.id === dayId) : null;
    const pending = getStopOrders(s.id, 'pending');
    const debt = S.debts[s.id] || 0;

    html += `
      <div class="customer-card" onclick="routeSearchTerm='';showProfile(${s.id})">
        <div class="customer-avatar">${escHtml(s.n.substring(0,2).toUpperCase())}</div>
        <div class="customer-info">
          <div class="customer-name">${escHtml(s.n)}</div>
          <div class="customer-area">${escHtml(s.c || '')}${s.p ? ' · ' + escHtml(s.p) : ''}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">
          ${dayObj ? `<span class="badge" style="background:${dayObj.color}20;color:${dayObj.color};font-size:10px">${dayObj.week}-${dayObj.label.slice(0,3)}</span>` : ''}
          ${pending.length > 0 ? `<span class="badge badge-warning" style="font-size:10px">${pending.length} pending</span>` : ''}
          ${debt > 0 ? `<span class="badge badge-danger" style="font-size:10px">${formatCurrency(debt)}</span>` : ''}
        </div>
      </div>`;
  });
  html += `</div>`;
  searchContainer.innerHTML = html;
}

function toggleRouteLock(stopId) {
  const week = S.routeWeek;
  const days = DAYS.filter(d => d.week === week);
  const dayObj = days[S.routeDay] || days[0];
  if (!dayObj) return;
  const dayId = dayObj.id;

  const idx = routeLockedStops.indexOf(stopId);
  if (idx >= 0) {
    routeLockedStops.splice(idx, 1);
  } else {
    routeLockedStops.push(stopId);
  }
  _routeLockedCache[dayId] = [...routeLockedStops];
  DB.setSetting('routeLockedStops_' + dayId, routeLockedStops);
  rerenderRouteKeepScroll();
}

let _routeDragAbort = null;
function initRouteDragDrop() {
  const list = document.getElementById('route-list');
  if (!list) return;

  // Abort previous listeners cleanly
  if (_routeDragAbort) _routeDragAbort.abort();
  _routeDragAbort = new AbortController();
  const signal = _routeDragAbort.signal;

  const week = S.routeWeek;
  const days = DAYS.filter(d => d.week === week);
  const dayObj = days[S.routeDay] || days[0];
  if (!dayObj) return;
  const dayId = dayObj.id;

  let draggedId = null;

  list.addEventListener('dragstart', e => {
    const card = e.target.closest('.draggable-route');
    if (!card || card.getAttribute('draggable') !== 'true') { e.preventDefault(); return; }
    draggedId = parseInt(card.dataset.stopId);
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  }, { signal });

  list.addEventListener('dragend', e => {
    const card = e.target.closest('.draggable-route');
    if (card) card.classList.remove('dragging');
    list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    draggedId = null;
  }, { signal });

  let currentDragOver = null;
  list.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const target = e.target.closest('.route-card');
    if (currentDragOver && currentDragOver !== target) currentDragOver.classList.remove('drag-over');
    if (target && parseInt(target.dataset.stopId) !== draggedId) {
      target.classList.add('drag-over');
      currentDragOver = target;
    } else { currentDragOver = null; }
  }, { signal });

  list.addEventListener('drop', e => {
    e.preventDefault();
    const target = e.target.closest('.route-card');
    if (!target || !draggedId || parseInt(target.dataset.stopId) === draggedId) return;
    applyRouteDrop(draggedId, parseInt(target.dataset.stopId), dayId);
  }, { signal });

  // Touch drag support
  let touchDragId = null;
  let touchClone = null;
  let longPressTimer = null;
  let touchStartY = 0;
  let touchDragOver = null;
  let lastTouchMove = 0;

  list.addEventListener('touchstart', e => {
    const card = e.target.closest('.draggable-route');
    if (!card || card.getAttribute('draggable') !== 'true') return;
    if (e.target.closest('.order-lock-btn') || e.target.closest('.btn') || e.target.closest('.delivery-btn')) return;
    touchStartY = e.touches[0].clientY;
    longPressTimer = setTimeout(() => {
      touchDragId = parseInt(card.dataset.stopId);
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
    if (now - lastTouchMove < 16) return;
    lastTouchMove = now;
    if (touchClone) touchClone.style.transform = 'translateY(' + (e.touches[0].clientY - touchStartY) + 'px) scale(0.95)';
    if (touchDragOver) touchDragOver.classList.remove('drag-over');
    const el = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY);
    if (el) {
      const target = el.closest('.route-card');
      if (target && parseInt(target.dataset.stopId) !== touchDragId) {
        target.classList.add('drag-over');
        touchDragOver = target;
      } else { touchDragOver = null; }
    }
  }, { passive: false, signal });

  function cleanupTouchDrag() {
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
    if (touchClone) { touchClone.remove(); touchClone = null; }
    list.querySelectorAll('.dragging,.drag-over').forEach(c => { c.classList.remove('dragging'); c.classList.remove('drag-over'); });
    touchDragOver = null;
    touchDragId = null;
  }

  list.addEventListener('touchend', e => {
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
    if (!touchDragId) return;
    const dragId = touchDragId;
    if (touchClone) { touchClone.remove(); touchClone = null; }
    list.querySelectorAll('.dragging,.drag-over').forEach(c => { c.classList.remove('dragging'); c.classList.remove('drag-over'); });
    touchDragOver = null;
    const el = document.elementFromPoint(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    if (el) {
      const target = el.closest('.route-card');
      if (target && parseInt(target.dataset.stopId) !== dragId) {
        applyRouteDrop(dragId, parseInt(target.dataset.stopId), dayId);
      }
    }
    touchDragId = null;
  }, { signal });

  list.addEventListener('touchcancel', cleanupTouchDrag, { signal });
}

function applyRouteDrop(srcId, targetId, dayId) {
  // Get current full list
  const assigned = [];
  Object.entries(S.assign).forEach(([sid, did]) => { if (did === dayId) assigned.push(parseInt(sid)); });
  const ro = S.routeOrder[dayId] || [];
  const sorted = [...new Set([...ro.filter(id => assigned.includes(id)), ...assigned])];
  const srcIdx = sorted.indexOf(srcId);
  const dstIdx = sorted.indexOf(targetId);
  if (srcIdx < 0 || dstIdx < 0) return;
  sorted.splice(srcIdx, 1);
  const adjustedDst = srcIdx < dstIdx ? dstIdx - 1 : dstIdx;
  sorted.splice(adjustedDst, 0, srcId);
  S.routeOrder[dayId] = sorted;
  save.routeOrder();

  // Lock the dragged item
  if (!routeLockedStops.includes(srcId)) {
    routeLockedStops.push(srcId);
    _routeLockedCache[dayId] = [...routeLockedStops];
    DB.setSetting('routeLockedStops_' + dayId, routeLockedStops);
  }

  rerenderRouteKeepScroll();
}

function rerenderRouteKeepScroll() {
  const body = document.querySelector('#page-route .page-body');
  const scrollPos = body ? body.scrollTop : 0;
  renderRoute();
  const newBody = document.querySelector('#page-route .page-body');
  if (newBody) newBody.scrollTop = scrollPos;
}

function setRouteWeek(w) {
  S.routeWeek = w;
  S.routeDay = (w === getCurrentWeek()) ? getTodayDayIndex() : 0;
  routeSearchTerm = '';
  renderRoute();
}

function setRouteDay(idx) {
  S.routeDay = idx;
  routeSearchTerm = '';
  renderRoute();
}

function calcDayRevenue(dayId) {
  const thisMonday = getWeekMondayStr(new Date());
  const assigned = [];
  Object.entries(S.assign).forEach(([sid, did]) => {
    if (did === dayId) assigned.push(parseInt(sid));
  });
  const todayOrders = Object.values(S.orders)
    .filter(o => assigned.includes(o.customerId) && o.status === 'delivered' &&
                 o.deliveredAt && getWeekMondayStr(o.deliveredAt) === thisMonday && o.payMethod !== 'visit');
  let cash = 0, bank = 0, unpaid = 0;
  todayOrders.forEach(o => {
    const total = calcOrderTotal(o);
    if (o.payMethod === 'cash') {
      const paid = (o.cashPaid !== undefined) ? o.cashPaid : total;
      cash += Math.min(paid, total);
      unpaid += Math.max(0, total - paid);
    } else if (o.payMethod === 'bank') {
      bank += total;
    } else {
      unpaid += total;
    }
  });
  return { cash, bank, unpaid, total: cash + bank + unpaid };
}

// ══════════════════════════════════════════════════════════════
// DELIVERY MODAL
// ══════════════════════════════════════════════════════════════

function showDeliveryModal(stopId, singleOrderId) {
  deliveryStopId = stopId;
  deliveryPayMethod = null;
  deliveryOrderIds = singleOrderId ? [singleOrderId] : null;
  const stop = getStop(stopId);
  if (!stop) return;
  const allPending = getStopOrders(stopId, 'pending');
  const pending = singleOrderId ? allPending.filter(o => o.id === singleOrderId) : allPending;
  const debt = S.debts[stopId] || 0;
  const isVisitMode = pending.length === 0;

  let itemsHtml = '';
  if (pending.length > 0) {
    pending.forEach(o => {
      const total = calcOrderTotal(o);
      itemsHtml += `<div class="card" style="margin-bottom:8px">
        <div class="order-card-items">${o.items.map(i => `${i.qty}x ${escHtml(i.name)}`).join(', ')}</div>
        <div class="flex-between"><span class="text-muted" style="font-size:12px">${formatDateTime(o.createdAt)}${o.deliveryDate ? ` · Delivery: ${o.deliveryDate}` : ''}</span><b>${formatCurrency(total)}</b></div>
        ${o.note ? `<div class="text-muted" style="font-size:12px;margin-top:4px">${escHtml(o.note)}</div>` : ''}
      </div>`;
    });
  }

  const grandTotal = pending.reduce((s, o) => s + calcOrderTotal(o), 0);

  if (isVisitMode) {
    let visitHtml = `
      <div class="modal-handle"></div>
      <div class="modal-title">Visit - ${escHtml(stop.n)}</div>
      <div style="text-align:center;padding:12px 0">
        <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="var(--primary)" stroke-width="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        <p class="text-muted" style="margin-top:8px;font-size:13px">No pending orders for this customer</p>
      </div>`;

    if (debt > 0) {
      visitHtml += `
        <div class="card" style="border-left:4px solid var(--danger)">
          <div class="flex-between">
            <span style="font-size:13px;font-weight:600;color:var(--text-sec)">Current Debt</span>
            <span style="font-size:18px;font-weight:700;color:var(--danger)">${formatCurrency(debt)}</span>
          </div>
          <div style="margin-top:12px">
            <div style="font-size:13px;font-weight:600;color:var(--text-sec);margin-bottom:6px">Collect Payment</div>
            <div class="pay-options">
              <div class="pay-opt" onclick="selectVisitPayMethod('cash',this)">
                <div class="pay-icon">&#163;</div>Cash
              </div>
              <div class="pay-opt" onclick="selectVisitPayMethod('bank',this)">
                <div class="pay-icon">&#127974;</div>Bank
              </div>
            </div>
            <div id="visit-cash-input" class="hidden" style="margin-top:8px">
              <label class="form-label">Amount received</label>
              <input class="input" type="number" step="0.01" id="visit-cash-amount" value="${debt.toFixed(2)}" placeholder="0.00">
            </div>
          </div>
        </div>
        <button class="btn btn-success btn-block mt-2" onclick="btnLock(confirmVisitWithPayment)" id="btn-confirm-visit-pay" disabled>
          Collect Payment & Mark as Visited
        </button>`;
    }

    visitHtml += `
      <div class="form-group" style="margin-top:12px">
        <label class="form-label">Visit Note (optional)</label>
        <textarea class="textarea" id="visit-note" rows="2" style="min-height:50px" placeholder="Add a note..."></textarea>
      </div>
      <button class="btn ${debt > 0 ? 'btn-outline' : 'btn-success'} btn-block mt-1" onclick="btnLock(confirmVisitOnly)">
        ${debt > 0 ? 'Mark as Visited (No Payment)' : 'Mark as Visited'}
      </button>`;

    openModal(visitHtml);
  } else {
    openModal(`
      <div class="modal-handle"></div>
      <div class="modal-title">Delivery - ${escHtml(stop.n)}</div>
      <div style="margin-bottom:12px">
        <div style="font-size:13px;font-weight:600;color:var(--text-sec);margin-bottom:8px">Pending Orders (${pending.length})</div>
        ${itemsHtml}
        <div class="flex-between" style="font-size:15px;font-weight:700;padding:4px 0">
          <span>Total</span><span id="delivery-grand-total">${formatCurrency(grandTotal)}</span>
        </div>
        ${debt > 0 ? `<div class="flex-between" style="font-size:13px;padding:4px 0;color:var(--danger)">
          <span>Current Debt</span><span style="font-weight:600">${formatCurrency(debt)}</span>
        </div>` : ''}
      </div>
      <div style="font-size:13px;font-weight:600;color:var(--text-sec);margin-bottom:8px">Payment Method</div>
      <div class="pay-options">
        <div class="pay-opt" onclick="selectPayMethod('cash',this)" data-method="cash">
          <div class="pay-icon">&#163;</div>Cash
        </div>
        <div class="pay-opt" onclick="selectPayMethod('bank',this)" data-method="bank">
          <div class="pay-icon">&#127974;</div>Bank
        </div>
        <div class="pay-opt" onclick="selectPayMethod('unpaid',this)" data-method="unpaid">
          <div class="pay-icon">&#9203;</div>Unpaid
        </div>
      </div>
      <div id="cash-amount-section" class="hidden" style="margin-top:8px">
        <label class="form-label">Cash amount received</label>
        <input class="input" type="number" step="0.01" id="cash-amount-input" value="${grandTotal.toFixed(2)}" placeholder="0.00" oninput="updateCashRemainder()">
        <p class="text-muted" style="font-size:12px;margin-top:4px" id="cash-remainder-msg"></p>
      </div>
      <div style="margin-top:12px">
        <label class="form-label">Delivery Date & Time</label>
        <input class="input" type="datetime-local" id="delivery-datetime" value="${new Date().toISOString().slice(0,16)}" style="font-size:14px">
      </div>
      <div style="margin-top:12px">
        <label class="form-label">Delivery Note (optional)</label>
        <textarea class="textarea" id="delivery-note" rows="2" placeholder="Add a note..." style="width:100%;font-size:14px;padding:8px;border:1px solid var(--border);border-radius:8px;resize:vertical"></textarea>
      </div>
      <button class="btn btn-success btn-block mt-2" id="btn-confirm-delivery" style="opacity:0.5" onclick="btnLock(confirmDelivery)">
        Confirm Delivery
      </button>
    `);
  }
}

function selectVisitPayMethod(method, el) {
  visitPayMethod = method;
  document.querySelectorAll('.pay-opt').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  const btn = document.getElementById('btn-confirm-visit-pay');
  if (btn) btn.disabled = false;
  const cashSection = document.getElementById('visit-cash-input');
  if (cashSection) {
    if (method === 'cash') cashSection.classList.remove('hidden');
    else cashSection.classList.add('hidden');
  }
}

async function confirmVisitOnly() {
  const stopId = parseInt(deliveryStopId);
  const now = new Date().toISOString();
  const visitNote = document.getElementById('visit-note')?.value?.trim() || '';
  const vid = uid();
  S.orders[vid] = {
    id: vid, customerId: stopId, items: [],
    note: visitNote || 'Visit (no orders)', status: 'delivered',
    payMethod: 'visit', createdAt: now, deliveredAt: now
  };
  await save.orders([vid]);
  closeModal();
  rerenderRouteKeepScroll();
}

async function confirmVisitWithPayment() {
  const stopId = parseInt(deliveryStopId);
  if (!visitPayMethod) return;
  const debt = S.debts[stopId] || 0;
  let payAmount = debt;
  if (visitPayMethod === 'cash') {
    payAmount = parseFloat(document.getElementById('visit-cash-amount')?.value) || 0;
    if (payAmount <= 0) { appAlert('Enter a valid amount.'); return; }
  }

  const now = new Date().toISOString();
  const cleared = roundMoney(Math.min(payAmount, debt));
  const overpaid = roundMoney(Math.max(0, payAmount - debt));
  S.debts[stopId] = Math.max(0, roundMoney(debt - cleared));
  createDebtHistoryEntry(stopId, {
    date: now, amount: cleared, type: 'clear',
    note: `Visit payment (${visitPayMethod})`
  });
  if (overpaid > 0) {
    showToast(`${formatCurrency(overpaid)} overpayment returned/noted`, 'info', 5000);
  }
  const savePromises = [save.debts(), save.debtHistory([stopId])];

  const visitNote = document.getElementById('visit-note')?.value?.trim() || '';
  const vid = uid();
  S.orders[vid] = {
    id: vid, customerId: stopId, items: [],
    note: visitNote || `Visit - debt payment ${formatCurrency(cleared)}`, status: 'delivered',
    payMethod: visitPayMethod, createdAt: now, deliveredAt: now
  };
  savePromises.push(save.orders([vid]));
  await Promise.allSettled(savePromises);
  closeModal();
  rerenderRouteKeepScroll();
}

function selectPayMethod(method, el) {
  deliveryPayMethod = method;
  document.querySelectorAll('.pay-opt').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  const confirmBtn = document.getElementById('btn-confirm-delivery');
  if (confirmBtn) confirmBtn.style.opacity = '1';
  const cashSection = document.getElementById('cash-amount-section');
  if (cashSection) {
    if (method === 'cash') {
      cashSection.classList.remove('hidden');
      updateCashRemainder();
    } else {
      cashSection.classList.add('hidden');
    }
  }
}

function updateCashRemainder() {
  const stopId = parseInt(deliveryStopId);
  const allPending = getStopOrders(stopId, 'pending');
  const pending = deliveryOrderIds ? allPending.filter(o => deliveryOrderIds.includes(o.id)) : allPending;
  const grandTotal = pending.reduce((s, o) => s + calcOrderTotal(o), 0);
  const cashInput = document.getElementById('cash-amount-input');
  const msg = document.getElementById('cash-remainder-msg');
  if (!cashInput || !msg) return;
  const paid = parseFloat(cashInput.value) || 0;
  const remainder = grandTotal - paid;
  if (remainder > 0.01) {
    msg.innerHTML = `<span style="color:var(--danger)">${formatCurrency(remainder)} will be added to debt</span>`;
  } else {
    msg.innerHTML = '';
  }
}

async function confirmDelivery() {
  try {
    if (!deliveryStopId && deliveryStopId !== 0) { appAlert('Error: no stopId'); return; }
    if (!deliveryPayMethod) { appAlert('Please select a payment method.'); return; }
    const stopId = parseInt(deliveryStopId);
    const allPending = getStopOrders(stopId, 'pending');
    const pending = deliveryOrderIds ? allPending.filter(o => deliveryOrderIds.includes(o.id)) : allPending;
    if (pending.length === 0) { appAlert('No pending orders found.'); closeModal(); return; }
    const dtInput = document.getElementById('delivery-datetime');
    const now = dtInput && dtInput.value ? new Date(dtInput.value).toISOString() : new Date().toISOString();
    const grandTotal = roundMoney(pending.reduce((s, o) => s + calcOrderTotal(o), 0));

    const cashAllocations = new Map();
    if (deliveryPayMethod === 'cash') {
      const cashInput = document.getElementById('cash-amount-input');
      let remainingCash = roundMoney(Math.max(0, cashInput ? (parseFloat(cashInput.value) || 0) : grandTotal));
      pending.forEach(o => {
        const orderTotal = roundMoney(calcOrderTotal(o));
        const paidForOrder = roundMoney(Math.min(orderTotal, Math.max(0, remainingCash)));
        cashAllocations.set(o.id, paidForOrder);
        remainingCash = roundMoney(Math.max(0, remainingCash - paidForOrder));
      });
    }

    const deliveryNote = document.getElementById('delivery-note')?.value?.trim() || '';
    pending.forEach(o => {
      o.status = 'delivered';
      o.deliveredAt = now;
      o.payMethod = deliveryPayMethod;
      if (deliveryNote) o.deliveryNote = deliveryNote;
      if (deliveryPayMethod === 'cash') {
        o.cashPaid = cashAllocations.get(o.id) || 0;
      } else {
        delete o.cashPaid;
      }
    });

    // Deduct stock on delivery
    let stockChanged = false;
    pending.forEach(o => {
      const sc = applyTrackedStockChange([], o.items || []);
      if (sc.changed) stockChanged = true;
    });

    // Await all saves to ensure data reaches Supabase before UI closes
    const savePromises = [];
    if (stockChanged) savePromises.push(save.catalog());

    let debtChanged = false;
    pending.forEach(o => {
      if (addOrderDebtEffect(o) > 0) debtChanged = true;
    });
    if (debtChanged) {
      savePromises.push(save.debts());
      savePromises.push(save.debtHistory([parseInt(deliveryStopId)]));
    }

    savePromises.push(save.orders(pending.map(o => o.id)));
    await Promise.allSettled(savePromises);

    closeModal();
    if (curPage === 'orders') renderOrders();
    else if (curPage === 'profile') renderProfile();
    else rerenderRouteKeepScroll();
  } catch (err) {
    appAlert('Delivery error: ' + err.message);
    console.error('confirmDelivery error:', err);
  }
}

// ══════════════════════════════════════════════════════════════
// DAILY CASH SUMMARY
// ══════════════════════════════════════════════════════════════

function showDayCashSummary() {
  const week = S.routeWeek;
  const days = DAYS.filter(d => d.week === week);
  const dayObj = days[S.routeDay] || days[0];
  if (!dayObj) return;
  const dayId = dayObj.id;
  const thisMonday = getWeekMondayStr(new Date());

  const assigned = [];
  Object.entries(S.assign).forEach(([sid, did]) => {
    if (did === dayId) assigned.push(parseInt(sid));
  });

  // Collect all delivered orders for today's stops this week
  const todayOrders = Object.values(S.orders).filter(o =>
    assigned.includes(o.customerId) && o.status === 'delivered' &&
    o.deliveredAt && getWeekMondayStr(o.deliveredAt) === thisMonday && o.payMethod !== 'visit'
  );

  let cashTotal = 0, bankTotal = 0, unpaidTotal = 0;
  let cashCount = 0, bankCount = 0, unpaidCount = 0;
  const customerBreakdown = [];

  // Group by customer
  const byCustomer = {};
  todayOrders.forEach(o => {
    if (!byCustomer[o.customerId]) byCustomer[o.customerId] = [];
    byCustomer[o.customerId].push(o);
  });

  Object.entries(byCustomer).forEach(([cid, orders]) => {
    const stop = getStop(parseInt(cid));
    let custCash = 0, custBank = 0, custUnpaid = 0;
    orders.forEach(o => {
      const total = calcOrderTotal(o);
      if (o.payMethod === 'cash') {
        const paid = (o.cashPaid !== undefined) ? Math.min(o.cashPaid, total) : total;
        custCash += paid;
        custUnpaid += Math.max(0, total - paid);
        cashCount++;
      } else if (o.payMethod === 'bank') {
        custBank += total;
        bankCount++;
      } else {
        custUnpaid += total;
        unpaidCount++;
      }
    });
    cashTotal += custCash;
    bankTotal += custBank;
    unpaidTotal += custUnpaid;
    customerBreakdown.push({
      name: stop ? stop.n : 'Unknown',
      cash: custCash, bank: custBank, unpaid: custUnpaid,
      total: custCash + custBank + custUnpaid
    });
  });

  customerBreakdown.sort((a, b) => b.total - a.total);
  const grandTotal = cashTotal + bankTotal + unpaidTotal;

  // Also count debt payments collected today for these customers
  let debtCollected = 0;
  assigned.forEach(cid => {
    const dh = S.debtHistory[cid] || [];
    dh.forEach(h => {
      if (h.type === 'clear' && h.date && h.date.slice(0, 10) === todayStr()) {
        debtCollected += h.amount;
      }
    });
  });

  let html = `
    <div class="modal-handle"></div>
    <div class="modal-title">Daily Cash Summary</div>
    <div class="modal-subtitle" style="font-size:12px;color:var(--text-sec);margin:-8px 0 12px">${dayObj.label} — Week ${week}</div>

    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:16px">
      <div class="card" style="padding:10px;text-align:center;border-top:3px solid var(--success)">
        <div style="font-size:18px;font-weight:700;color:var(--success)">${formatCurrency(cashTotal)}</div>
        <div style="font-size:11px;color:var(--text-sec)">Cash (${cashCount})</div>
      </div>
      <div class="card" style="padding:10px;text-align:center;border-top:3px solid var(--info)">
        <div style="font-size:18px;font-weight:700;color:var(--info)">${formatCurrency(bankTotal)}</div>
        <div style="font-size:11px;color:var(--text-sec)">Bank (${bankCount})</div>
      </div>
      <div class="card" style="padding:10px;text-align:center;border-top:3px solid var(--danger)">
        <div style="font-size:18px;font-weight:700;color:var(--danger)">${formatCurrency(unpaidTotal)}</div>
        <div style="font-size:11px;color:var(--text-sec)">Unpaid (${unpaidCount})</div>
      </div>
    </div>

    <div class="card" style="padding:12px;margin-bottom:12px">
      <div class="flex-between" style="margin-bottom:4px">
        <span style="font-weight:600">Total Revenue</span>
        <span style="font-weight:700;font-size:16px">${formatCurrency(grandTotal)}</span>
      </div>
      <div class="flex-between">
        <span style="font-size:12px;color:var(--text-sec)">Cash in Hand</span>
        <span style="font-weight:600;color:var(--success)">${formatCurrency(cashTotal)}</span>
      </div>
      ${debtCollected > 0 ? `<div class="flex-between" style="margin-top:2px">
        <span style="font-size:12px;color:var(--text-sec)">Debt Collected Today</span>
        <span style="font-weight:600;color:var(--success)">+${formatCurrency(debtCollected)}</span>
      </div>
      <div class="flex-between" style="margin-top:4px;padding-top:4px;border-top:1px solid var(--border)">
        <span style="font-size:13px;font-weight:600">Total Cash to Deposit</span>
        <span style="font-weight:700;color:var(--success)">${formatCurrency(cashTotal + debtCollected)}</span>
      </div>` : ''}
    </div>`;

  if (customerBreakdown.length > 0) {
    html += `<div style="font-size:12px;font-weight:600;color:var(--text-sec);margin-bottom:6px">Per Customer</div>`;
    customerBreakdown.forEach(c => {
      html += `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:13px">
        <span>${escHtml(c.name)}</span>
        <div style="display:flex;gap:8px;font-size:12px">
          ${c.cash > 0 ? `<span style="color:var(--success)">${formatCurrency(c.cash)}</span>` : ''}
          ${c.bank > 0 ? `<span style="color:var(--info)">${formatCurrency(c.bank)}</span>` : ''}
          ${c.unpaid > 0 ? `<span style="color:var(--danger)">${formatCurrency(c.unpaid)}</span>` : ''}
        </div>
      </div>`;
    });
  } else {
    html += `<div class="empty-state" style="padding:20px"><p class="text-muted">No deliveries yet</p></div>`;
  }

  openModal(html);
}

// ══════════════════════════════════════════════════════════════
// ROUTE OPTIMIZATION (Nearest Neighbor)
// ══════════════════════════════════════════════════════════════

function _haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function optimizeRouteOrder() {
  const week = S.routeWeek;
  const days = DAYS.filter(d => d.week === week);
  const dayObj = days[S.routeDay] || days[0];
  if (!dayObj) return;
  const dayId = dayObj.id;

  const assigned = [];
  Object.entries(S.assign).forEach(([sid, did]) => {
    if (did === dayId) assigned.push(parseInt(sid));
  });

  // Separate locked and unlocked
  const locked = routeLockedStops.filter(id => assigned.includes(id));
  const unlocked = assigned.filter(id => !routeLockedStops.includes(id));

  // Check geo availability
  const withGeo = unlocked.filter(id => S.geo[id] && S.geo[id].lat && S.geo[id].lng);
  const withoutGeo = unlocked.filter(id => !S.geo[id] || !S.geo[id].lat || !S.geo[id].lng);

  if (withGeo.length < 2) {
    appAlert('Not enough geocoded customers to optimize. Geocode customers from Settings > Map first.');
    return;
  }

  // Find starting point: last locked stop's location, or first geocoded stop
  let startLat, startLng;
  if (locked.length > 0) {
    const lastLocked = locked[locked.length - 1];
    const g = S.geo[lastLocked];
    if (g && g.lat && g.lng) { startLat = g.lat; startLng = g.lng; }
  }
  if (!startLat) {
    const g = S.geo[withGeo[0]];
    startLat = g.lat; startLng = g.lng;
  }

  // Nearest-neighbor algorithm
  const remaining = new Set(withGeo);
  const optimized = [];
  let curLat = startLat, curLng = startLng;

  while (remaining.size > 0) {
    let nearest = null, nearestDist = Infinity;
    remaining.forEach(id => {
      const g = S.geo[id];
      const dist = _haversineDistance(curLat, curLng, g.lat, g.lng);
      if (dist < nearestDist) { nearestDist = dist; nearest = id; }
    });
    remaining.delete(nearest);
    optimized.push(nearest);
    const g = S.geo[nearest];
    curLat = g.lat; curLng = g.lng;
  }

  // Final order: locked (in their order) + optimized + non-geocoded at end
  const newOrder = [...locked, ...optimized, ...withoutGeo];
  S.routeOrder[dayId] = newOrder;
  save.routeOrder();
  rerenderRouteKeepScroll();

  const savedKm = _estimateRouteSaving(assigned, newOrder, dayId);
  showToast(`Route optimized!${savedKm ? ' ~' + savedKm + ' km shorter' : ''}`, 'success', 3000);
}

function _estimateRouteSaving(oldOrder, newOrder, dayId) {
  const ro = S.routeOrder[dayId] || oldOrder;
  const calcDist = (order) => {
    let total = 0;
    for (let i = 0; i < order.length - 1; i++) {
      const a = S.geo[order[i]], b = S.geo[order[i + 1]];
      if (a && b && a.lat && b.lat) total += _haversineDistance(a.lat, a.lng, b.lat, b.lng);
    }
    return total;
  };
  const oldDist = calcDist(oldOrder);
  const newDist = calcDist(newOrder);
  const diff = oldDist - newDist;
  return diff > 0.5 ? diff.toFixed(1) : '';
}

// ══════════════════════════════════════════════════════════════
// SKIP STOP (move to end of route)
// ══════════════════════════════════════════════════════════════

async function skipRouteStop(stopId) {
  const week = S.routeWeek;
  const days = DAYS.filter(d => d.week === week);
  const dayObj = days[S.routeDay] || days[0];
  if (!dayObj) return;
  const dayId = dayObj.id;

  const assigned = [];
  Object.entries(S.assign).forEach(([sid, did]) => { if (did === dayId) assigned.push(parseInt(sid)); });
  const ro = S.routeOrder[dayId] || [];
  const sorted = [...new Set([...ro.filter(id => assigned.includes(id)), ...assigned])];

  // Move to end
  const idx = sorted.indexOf(stopId);
  if (idx >= 0) sorted.splice(idx, 1);
  sorted.push(stopId);

  // Unlock if locked
  const lockIdx = routeLockedStops.indexOf(stopId);
  if (lockIdx >= 0) {
    routeLockedStops.splice(lockIdx, 1);
    _routeLockedCache[dayId] = [...routeLockedStops];
    DB.setSetting('routeLockedStops_' + dayId, routeLockedStops);
  }

  S.routeOrder[dayId] = sorted;
  save.routeOrder();

  const stop = getStop(stopId);
  showToast(`${stop ? stop.n : 'Stop'} moved to end`, 'info', 2000);
  rerenderRouteKeepScroll();
}
