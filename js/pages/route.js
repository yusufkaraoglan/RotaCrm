'use strict';
// ══════════════════════════════════════════════════════════════
// ROUTE PAGE
// ══════════════════════════════════════════════════════════════
function renderRoute() {
  const week = S.routeWeek;
  const days = DAYS.filter(d => d.week === week);
  const dayObj = days[S.routeDay] || days[0];
  if (!dayObj) return;
  const dayId = dayObj.id;
  const today = todayStr();

  // Get assigned stops for this day
  const assigned = [];
  Object.entries(S.assign).forEach(([sid, did]) => {
    if (did === dayId) assigned.push(parseInt(sid));
  });

  // Sort by route order
  const ro = S.routeOrder[dayId] || [];
  const sorted = [...new Set([...ro.filter(id => assigned.includes(id)), ...assigned])];

  // Current date info
  const dateInfo = new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });

  let html = `
    <header class="topbar">
      <div>
        <h1>Rota</h1>
        <div style="font-size:12px;color:var(--text-sec)">${dateInfo}</div>
      </div>
      <div class="topbar-actions">
        <button class="btn-ghost" onclick="shareRouteSummary()" title="Share Route Summary">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        </button>
        <button class="btn-ghost" onclick="exportRouteExcel()" title="Export Route">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        </button>
        <button class="btn-ghost" onclick="showImportModal()" title="Import">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
      </div>
    </header>
    <div class="week-toggle">
      <button class="week-btn ${week==='A'?'active':''}" onclick="setRouteWeek('A')">Week A</button>
      <button class="week-btn ${week==='B'?'active':''}" onclick="setRouteWeek('B')">Week B</button>
    </div>
    <div class="day-tabs">
      ${days.map((d, i) => {
        const dayStops = Object.entries(S.assign).filter(([,did]) => did === d.id).map(([sid]) => parseInt(sid));
        const dayPending = dayStops.reduce((sum, sid) => sum + getStopOrders(sid, 'pending').length, 0);
        return `
        <button class="day-tab ${i===S.routeDay?'active':''}"
                style="${i===S.routeDay ? 'background:'+d.color+';color:#fff' : ''};position:relative"
                onclick="setRouteDay(${i})">${d.label.slice(0,3)}${dayPending > 0 ? `<span style="position:absolute;top:2px;right:2px;width:8px;height:8px;border-radius:50%;background:var(--warning);${i===S.routeDay ? 'background:#fff' : ''}"></span>` : ''}</button>`;
      }).join('')}
    </div>
    <div class="page-body">`;

  if (sorted.length === 0) {
    html += `<div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
      <p><b>Bu güne müşteri atanmamış</b></p>
      <p>Müşteriler sayfasından gün atayabilirsiniz</p>
    </div>`;
  } else {
    sorted.forEach((stopId, idx) => {
      const stop = getStop(stopId);
      if (!stop) return;
      const pending = getStopOrders(stopId, 'pending');
      const delivered = isDeliveredThisWeek(stopId);
      const thisMonday = getWeekMondayStr(new Date());
      const weekOrders = Object.values(S.orders).filter(o =>
        o.customerId === stopId && o.status === 'delivered' &&
        o.deliveredAt && getWeekMondayStr(o.deliveredAt) === thisMonday
      );
      const todayRev = weekOrders.reduce((s, o) => s + calcOrderTotal(o), 0);
      const isVisited = delivered && weekOrders.every(o => o.payMethod === 'visit');
      const debt = S.debts[stopId] || 0;

      html += `
        <div class="route-card ${delivered ? 'delivered' : ''}" style="border-left-color:${dayObj.color}" data-stop-id="${stopId}">
          <div class="drag-handle" ontouchstart="routeTouchStart(event,${stopId},'${dayId}')" onmousedown="routeMouseStart(event,${stopId},'${dayId}')">
            <svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor"><circle cx="7" cy="5" r="1.5"/><circle cx="13" cy="5" r="1.5"/><circle cx="7" cy="10" r="1.5"/><circle cx="13" cy="10" r="1.5"/><circle cx="7" cy="15" r="1.5"/><circle cx="13" cy="15" r="1.5"/></svg>
          </div>
          <span class="route-order-num">${idx + 1}</span>
          <div class="route-card-body" onclick="showProfile(${stopId})" style="cursor:pointer">
            <div class="route-card-name">${escHtml(stop.n)}</div>
            <div class="route-card-sub">${escHtml(stop.c)} &middot; ${escHtml(stop.p)}</div>
            <div class="route-card-badges">
              ${pending.length > 0 ? `<span class="badge badge-warning">${pending.length} bekleyen</span>` : ''}
              ${delivered ? `<span class="badge badge-success">${isVisited ? 'Ziyaret' : 'Teslim'}</span>` : ''}
              ${todayRev > 0 ? `<span class="badge badge-info">${formatCurrency(todayRev)}</span>` : ''}
              ${!delivered && debt > 0 ? `<span class="badge badge-danger">${formatCurrency(debt)}</span>` : ''}
            </div>
          </div>
          <button class="delivery-btn ${delivered ? 'done' : ''}" onclick="event.stopPropagation();${delivered ? '' : `showDeliveryModal(${stopId})`}" title="${pending.length === 0 && !delivered ? 'Visit' : ''}">
            ${delivered ? '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>'
                        : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="3"/></svg>'}
          </button>
        </div>`;
    });
  }

  html += `</div>`;

  // Summary bar
  const deliveredCount = sorted.filter(id => isDeliveredThisWeek(id)).length;
  const rev = calcDayRevenue(dayId);
  html += `
    <div class="route-summary" style="flex-wrap:wrap;gap:6px">
      <span>${deliveredCount} / ${sorted.length} teslim</span>
      <div style="display:flex;gap:10px;font-size:12px">
        <span style="color:var(--success)">Nakit ${formatCurrency(rev.cash)}</span>
        <span style="color:var(--info)">Banka ${formatCurrency(rev.bank)}</span>
        <span style="color:var(--danger)">Ödenmedi ${formatCurrency(rev.unpaid)}</span>
      </div>
    </div>`;

  document.getElementById('page-route').innerHTML = html;
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
  renderRoute();
}

function setRouteDay(idx) {
  S.routeDay = idx;
  renderRoute();
}

function moveStop(stopId, dir, dayId) {
  const ro = S.routeOrder[dayId] || [];
  // Build full list
  const assigned = [];
  Object.entries(S.assign).forEach(([sid, did]) => {
    if (did === dayId) assigned.push(parseInt(sid));
  });
  const sorted = [...new Set([...ro.filter(id => assigned.includes(id)), ...assigned])];

  const idx = sorted.indexOf(stopId);
  if (idx < 0) return;
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= sorted.length) return;
  [sorted[idx], sorted[newIdx]] = [sorted[newIdx], sorted[idx]];
  S.routeOrder[dayId] = sorted;
  save.routeOrder();
  rerenderRouteKeepScroll();
}

let _rdDragSrc = null;

function _rdApplyDrop(targetStopId, dayId) {
  if (_rdDragSrc === null || _rdDragSrc === targetStopId) { _rdDragSrc = null; return; }
  const assigned = [];
  Object.entries(S.assign).forEach(([sid, did]) => { if (did === dayId) assigned.push(parseInt(sid)); });
  const ro = S.routeOrder[dayId] || [];
  const sorted = [...new Set([...ro.filter(id => assigned.includes(id)), ...assigned])];
  const srcIdx = sorted.indexOf(_rdDragSrc);
  const dstIdx = sorted.indexOf(targetStopId);
  if (srcIdx < 0 || dstIdx < 0) { _rdDragSrc = null; return; }
  sorted.splice(srcIdx, 1);
  sorted.splice(dstIdx, 0, _rdDragSrc);
  S.routeOrder[dayId] = sorted;
  save.routeOrder();
  _rdDragSrc = null;
  rerenderRouteKeepScroll();
}

function routeTouchStart(e, stopId, dayId) {
  e.preventDefault();
  e.stopPropagation();
  _rdDragSrc = stopId;
  const card = e.currentTarget.closest('.route-card');
  card.classList.add('dragging');
  const onMove = (ev) => {
    ev.preventDefault();
    const t = ev.touches[0];
    card.style.display = 'none';
    const el = document.elementFromPoint(t.clientX, t.clientY);
    card.style.display = '';
    const target = el && el.closest('.route-card');
    document.querySelectorAll('#page-route .route-card').forEach(c => c.classList.remove('drag-over'));
    if (target && target !== card) target.classList.add('drag-over');
  };
  const onEnd = () => {
    document.removeEventListener('touchmove', onMove);
    document.removeEventListener('touchend', onEnd);
    const over = document.querySelector('#page-route .route-card.drag-over');
    document.querySelectorAll('#page-route .route-card').forEach(c => { c.classList.remove('dragging'); c.classList.remove('drag-over'); });
    if (over) _rdApplyDrop(parseInt(over.dataset.stopId), dayId);
    else _rdDragSrc = null;
  };
  document.addEventListener('touchmove', onMove, { passive: false });
  document.addEventListener('touchend', onEnd);
}

function routeMouseStart(e, stopId, dayId) {
  if (e.button !== 0) return;
  e.preventDefault();
  e.stopPropagation();
  _rdDragSrc = stopId;
  const card = e.currentTarget.closest('.route-card');
  card.classList.add('dragging');
  const onMove = (ev) => {
    card.style.display = 'none';
    const el = document.elementFromPoint(ev.clientX, ev.clientY);
    card.style.display = '';
    const target = el && el.closest('.route-card');
    document.querySelectorAll('#page-route .route-card').forEach(c => c.classList.remove('drag-over'));
    if (target && target !== card) target.classList.add('drag-over');
  };
  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    const over = document.querySelector('#page-route .route-card.drag-over');
    document.querySelectorAll('#page-route .route-card').forEach(c => { c.classList.remove('dragging'); c.classList.remove('drag-over'); });
    if (over) _rdApplyDrop(parseInt(over.dataset.stopId), dayId);
    else _rdDragSrc = null;
  };
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
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
let deliveryCashAmount = 0;

function showDeliveryModal(stopId, singleOrderId) {
  deliveryStopId = stopId;
  deliveryPayMethod = null;
  deliveryCashAmount = 0;
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
        <div class="flex-between"><span class="text-muted" style="font-size:12px">${formatDateTime(o.createdAt)}${o.deliveryDate ? ` · Teslimat: ${o.deliveryDate}` : ''}</span><b>${formatCurrency(total)}</b></div>
        ${o.note ? `<div class="text-muted" style="font-size:12px;margin-top:4px">${escHtml(o.note)}</div>` : ''}
      </div>`;
    });
  }

  const grandTotal = pending.reduce((s, o) => s + calcOrderTotal(o), 0);

  if (isVisitMode) {
    // VISIT MODE - no pending orders
    let visitHtml = `
      <div class="modal-handle"></div>
      <div class="modal-title">Ziyaret - ${escHtml(stop.n)}</div>
      <div style="text-align:center;padding:12px 0">
        <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="var(--primary)" stroke-width="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        <p class="text-muted" style="margin-top:8px;font-size:13px">Bu müşterinin bekleyen siparişi yok</p>
      </div>`;

    if (debt > 0) {
      visitHtml += `
        <div class="card" style="border-left:4px solid var(--danger)">
          <div class="flex-between">
            <span style="font-size:13px;font-weight:600;color:var(--text-sec)">Mevcut Borç</span>
            <span style="font-size:18px;font-weight:700;color:var(--danger)">${formatCurrency(debt)}</span>
          </div>
          <div style="margin-top:12px">
            <div style="font-size:13px;font-weight:600;color:var(--text-sec);margin-bottom:6px">Ödeme Al</div>
            <div class="pay-options">
              <div class="pay-opt" onclick="selectVisitPayMethod('cash',this)">
                <div class="pay-icon">&#163;</div>Nakit
              </div>
              <div class="pay-opt" onclick="selectVisitPayMethod('bank',this)">
                <div class="pay-icon">&#127974;</div>Banka
              </div>
            </div>
            <div id="visit-cash-input" class="hidden" style="margin-top:8px">
              <label class="form-label">Alınan tutar</label>
              <input class="input" type="number" step="0.01" id="visit-cash-amount" value="${debt.toFixed(2)}" placeholder="0.00">
            </div>
          </div>
        </div>
        <button class="btn btn-success btn-block mt-2" onclick="confirmVisitWithPayment()" id="btn-confirm-visit-pay" disabled>
          Ödeme Al ve Ziyaret Olarak İşaretle
        </button>`;
    }

    visitHtml += `
      <div class="form-group" style="margin-top:12px">
        <label class="form-label">Ziyaret Notu (opsiyonel)</label>
        <textarea class="textarea" id="visit-note" rows="2" style="min-height:50px" placeholder="Not ekleyin..."></textarea>
      </div>
      <button class="btn ${debt > 0 ? 'btn-outline' : 'btn-success'} btn-block mt-1" onclick="confirmVisitOnly()">
        ${debt > 0 ? 'Ziyaret Olarak İşaretle (Ödemesiz)' : 'Ziyaret Olarak İşaretle'}
      </button>`;

    openModal(visitHtml);
  } else {
    // DELIVERY MODE - has pending orders
    openModal(`
      <div class="modal-handle"></div>
      <div class="modal-title">Teslimat - ${escHtml(stop.n)}</div>
      <div style="margin-bottom:12px">
        <div style="font-size:13px;font-weight:600;color:var(--text-sec);margin-bottom:8px">Bekleyen Siparişler (${pending.length})</div>
        ${itemsHtml}
        <div class="flex-between" style="font-size:15px;font-weight:700;padding:4px 0">
          <span>Toplam</span><span id="delivery-grand-total">${formatCurrency(grandTotal)}</span>
        </div>
        ${debt > 0 ? `<div class="flex-between" style="font-size:13px;padding:4px 0;color:var(--danger)">
          <span>Mevcut Borç</span><span style="font-weight:600">${formatCurrency(debt)}</span>
        </div>` : ''}
      </div>
      <div style="font-size:13px;font-weight:600;color:var(--text-sec);margin-bottom:8px">Ödeme Yöntemi</div>
      <div class="pay-options">
        <div class="pay-opt" onclick="selectPayMethod('cash',this)" data-method="cash">
          <div class="pay-icon">&#163;</div>Nakit
        </div>
        <div class="pay-opt" onclick="selectPayMethod('bank',this)" data-method="bank">
          <div class="pay-icon">&#127974;</div>Banka
        </div>
        <div class="pay-opt" onclick="selectPayMethod('unpaid',this)" data-method="unpaid">
          <div class="pay-icon">&#9203;</div>Ödenmedi
        </div>
      </div>
      <div id="cash-amount-section" class="hidden" style="margin-top:8px">
        <label class="form-label">Alınan nakit tutar</label>
        <input class="input" type="number" step="0.01" id="cash-amount-input" value="${grandTotal.toFixed(2)}" placeholder="0.00" oninput="updateCashRemainder()">
        <p class="text-muted" style="font-size:12px;margin-top:4px" id="cash-remainder-msg"></p>
      </div>
      <div style="margin-top:12px">
        <label class="form-label">Teslimat Notu (opsiyonel)</label>
        <textarea class="textarea" id="delivery-note" rows="2" placeholder="Not ekleyin..." style="width:100%;font-size:14px;padding:8px;border:1px solid var(--border);border-radius:8px;resize:vertical"></textarea>
      </div>
      <button class="btn btn-success btn-block mt-2" id="btn-confirm-delivery" style="opacity:0.5" ontouchend="confirmDelivery()" onclick="confirmDelivery()">
        Teslimatı Onayla
      </button>
    `);
  }
}

let visitPayMethod = null;

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

function confirmVisitOnly() {
  const stopId = parseInt(deliveryStopId);
  const now = new Date().toISOString();
  const visitNote = document.getElementById('visit-note')?.value?.trim() || '';
  // Mark as visited today by creating a zero-total delivery marker
  const vid = uid();
  S.orders[vid] = {
    id: vid, customerId: stopId, items: [],
    note: visitNote || 'Visit (no orders)', status: 'delivered',
    payMethod: 'visit', createdAt: now, deliveredAt: now
  };
  save.orders();
  DB.saveOrder(S.orders[vid]);
  closeModal();
  rerenderRouteKeepScroll();
}

function confirmVisitWithPayment() {
  const stopId = parseInt(deliveryStopId);
  if (!visitPayMethod) return;
  const debt = S.debts[stopId] || 0;
  let payAmount = debt;
  if (visitPayMethod === 'cash') {
    payAmount = parseFloat(document.getElementById('visit-cash-amount')?.value) || 0;
    if (payAmount <= 0) { appAlert('Enter a valid amount.'); return; }
  }

  const now = new Date().toISOString();
  const cleared = Math.min(payAmount, debt);
  S.debts[stopId] = Math.max(0, debt - cleared);
  createDebtHistoryEntry(stopId, {
    date: now, amount: cleared, type: 'clear',
    note: `Visit payment (${visitPayMethod})`
  });
  save.debts();
  save.debtHistory();
  DB.setDebt(stopId, S.debts[stopId]);

  const visitNote = document.getElementById('visit-note')?.value?.trim() || '';
  const vid = uid();
  S.orders[vid] = {
    id: vid, customerId: stopId, items: [],
    note: visitNote || `Visit - debt payment ${formatCurrency(cleared)}`, status: 'delivered',
    payMethod: visitPayMethod, createdAt: now, deliveredAt: now
  };
  save.orders();
  DB.saveOrder(S.orders[vid]);
  closeModal();
  rerenderRouteKeepScroll();
}

function selectPayMethod(method, el) {
  deliveryPayMethod = method;
  document.querySelectorAll('.pay-opt').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  const confirmBtn = document.getElementById('btn-confirm-delivery');
  if (confirmBtn) confirmBtn.style.opacity = '1';
  // Show/hide cash amount section
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
  const pending = getStopOrders(stopId, 'pending');
  const grandTotal = pending.reduce((s, o) => s + calcOrderTotal(o), 0);
  const cashInput = document.getElementById('cash-amount-input');
  const msg = document.getElementById('cash-remainder-msg');
  if (!cashInput || !msg) return;
  const paid = parseFloat(cashInput.value) || 0;
  const remainder = grandTotal - paid;
  if (remainder > 0.01) {
    msg.innerHTML = `<span style="color:var(--danger)">${formatCurrency(remainder)} borca eklenecek</span>`;
  } else {
    msg.innerHTML = '';
  }
}

function confirmDelivery() {
  try {
    if (!deliveryStopId && deliveryStopId !== 0) { appAlert('Hata: stopId yok'); return; }
    if (!deliveryPayMethod) { appAlert('Lutfen odeme yontemi secin.'); return; }
    const stopId = parseInt(deliveryStopId);
    const allPending = getStopOrders(stopId, 'pending');
    const pending = deliveryOrderIds ? allPending.filter(o => deliveryOrderIds.includes(o.id)) : allPending;
    if (pending.length === 0) { appAlert('Bekleyen siparis bulunamadi.'); closeModal(); return; }
    const now = new Date().toISOString();
    const grandTotal = pending.reduce((s, o) => s + calcOrderTotal(o), 0);

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

    let debtChanged = false;
    pending.forEach(o => {
      if (addOrderDebtEffect(o) > 0) debtChanged = true;
    });
    if (debtChanged) {
      save.debts();
      save.debtHistory();
      // Persist debts to DB
      const stopId = parseInt(deliveryStopId);
      DB.setDebt(stopId, S.debts[stopId] || 0);
    }

    save.orders();
    // Persist each delivered order to DB
    pending.forEach(o => DB.saveOrder(o));
    closeModal();
    if (curPage === 'orders') renderOrders();
    else if (curPage === 'profile') renderProfile();
    else rerenderRouteKeepScroll();
  } catch (err) {
    appAlert('Teslimat hatasi: ' + err.message);
    console.error('confirmDelivery error:', err);
  }
}

