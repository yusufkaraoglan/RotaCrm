'use strict';
// PROFILE PAGE
// ══════════════════════════════════════════════════════════════
let clearDebtMethod = 'cash';

function showProfile(stopId) {
  profilePreviousPage = curPage || 'customers';
  profileStopId = parseInt(stopId);
  showPage('profile');
}

function renderProfile() {
  const stop = getStop(profileStopId);
  if (!stop) { showPage('customers'); return; }

  const dayId = S.assign[stop.id];
  const dayObj = dayId ? getDayObj(dayId) : null;
  const pending = getStopOrders(stop.id, 'pending');
  const delivered = getStopOrders(stop.id, 'delivered').sort((a, b) => (b.deliveredAt || '').localeCompare(a.deliveredAt || ''));
  const recentDelivered = delivered.slice(0, 20);
  const debt = S.debts[stop.id] || 0;
  const note = S.cnotes[stop.id] || '';

  let html = `
    <header class="topbar">
      <button class="btn-ghost" onclick="showPage('${profilePreviousPage}')" style="font-size:18px;padding:8px">&larr;</button>
      <h1 style="flex:1;text-align:center;font-size:16px">${escHtml(stop.n)}</h1>
      <button class="btn-ghost" onclick="showEditCustomerModal()" style="font-size:13px;color:var(--primary)">Edit</button>
    </header>
    <div class="page-body">
      <!-- Info Card -->
      <div class="card" style="text-align:center">
        <div class="profile-avatar">${getCustomerInitials(stop.n)}</div>
        <div style="font-size:12px;color:var(--text-sec);margin-top:4px">${escHtml(stop.a)}</div>
        <div style="font-size:12px;color:var(--text-sec)">${escHtml(stop.c)} &middot; ${escHtml(stop.p)}</div>
        ${dayObj ? `<div style="margin-top:8px"><span class="badge" style="background:${dayObj.color}20;color:${dayObj.color}">Week ${dayObj.week} - ${dayObj.label}</span></div>` : '<div style="margin-top:8px"><span class="badge badge-outline">Unassigned</span></div>'}
        ${S.brands[stop.id] ? `<div style="margin-top:6px"><span class="badge" style="background:var(--primary);color:#fff;font-size:11px">${escHtml(S.brands[stop.id])}</span></div>` : ''}
        ${note ? `<div style="margin-top:8px;font-size:12px;color:var(--text-sec);font-style:italic">"${escHtml(note)}"</div>` : ''}
        ${(stop.cn || stop.ph || stop.em) ? `
          <div style="margin-top:10px;display:flex;flex-direction:column;gap:4px;align-items:center;font-size:13px">
            ${stop.cn ? `<div style="color:var(--text-sec)"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:4px"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>${escHtml(stop.cn)}</div>` : ''}
            ${stop.ph ? `<div><a href="tel:${escHtml(stop.ph)}" style="color:var(--primary);text-decoration:none"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:4px"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.44 16l.48.92z"/></svg>${escHtml(stop.ph)}</a></div>` : ''}
            ${stop.em ? `<div><a href="mailto:${escHtml(stop.em)}" style="color:var(--primary);text-decoration:none"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:4px"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>${escHtml(stop.em)}</a></div>` : ''}
          </div>` : ''}
        ${(S.customerProducts[stop.id] && S.customerProducts[stop.id].length > 0) ? `
          <div style="margin-top:8px;display:flex;gap:4px;flex-wrap:wrap;justify-content:center">
            ${S.customerProducts[stop.id].map(p => `<span class="badge badge-purple" style="font-size:10px">${escHtml(p)}</span>`).join('')}
          </div>` : ''}
      </div>

      <!-- Action Bar -->
      <div class="action-bar">
        <button class="action-btn" onclick="showAssignModal()">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Assign Day
        </button>
        <button class="action-btn" onclick="showCustomerProductsModal()">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
          Products
        </button>
        <button class="action-btn" onclick="showBrandModal()">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7V4a2 2 0 0 1 2-2h8.5L20 7.5V20a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3"/><polyline points="14 2 14 8 20 8"/><line x1="1" y1="14" x2="11" y2="14"/><polyline points="8 11 11 14 8 17"/></svg>
          Brand
        </button>
        <button class="action-btn" onclick="showPricingModal()">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          Pricing
        </button>
        <button class="action-btn" onclick="showNoteModal()">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Note
        </button>
        <button class="action-btn" onclick="openNewOrderPage(${stop.id}, 'profile')">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          Order
        </button>
      </div>

      <!-- Debt -->
      <div class="section-head"><h3>Debt Status</h3></div>
      <div class="debt-card">
        <div class="flex-between">
          <span class="debt-amount ${debt > 0 ? 'text-danger' : 'text-success'}">${formatCurrency(debt)}</span>
        </div>
        <div class="debt-actions">
          <button class="btn btn-outline btn-sm" onclick="showAddDebtModal()">Add Debt</button>
          <button class="btn btn-success btn-sm" onclick="showClearDebtModal()" ${debt <= 0 ? 'disabled' : ''}>Collect Debt</button>
          <button class="btn btn-sm" style="color:var(--danger);border:1px solid var(--danger)" onclick="removeAllDebt()" ${debt <= 0 ? 'disabled' : ''}>Write Off</button>
        </div>
      </div>

      <!-- Quick Reorder -->
      ${(() => {
        const lastDelivered = getStopOrders(stop.id, 'delivered')
          .filter(o => o.items && o.items.length > 0)
          .sort((a,b) => new Date(b.deliveredAt) - new Date(a.deliveredAt))[0];
        return lastDelivered ? `
        <div style="margin:8px 0;display:flex;align-items:center;gap:8px">
          <button class="btn btn-sm" style="background:var(--primary);color:#fff;display:flex;align-items:center;gap:6px;flex-shrink:0;padding:6px 12px" onclick="quickReorder(${stop.id},'${lastDelivered.id}')">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            Repeat
          </button>
          <span class="text-muted" style="font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${lastDelivered.items.map(i => i.qty + 'x ' + escHtml(i.name)).join(', ')} — ${formatCurrency(calcOrderTotal(lastDelivered))}</span>
        </div>` : '';
      })()}

      <!-- Pending Orders -->
      <div class="section-head"><h3>Pending Orders (${pending.length})</h3></div>`;

  if (pending.length === 0) {
    html += `<p class="text-muted" style="font-size:13px;padding:8px 0">No pending orders</p>`;
  } else {
    pending.forEach(o => {
      html += `
        <div class="order-card">
          <div class="order-card-head">
            <div class="order-card-date">${formatDateTime(o.createdAt)}${o.deliveryDate ? ` · Delivery: ${o.deliveryDate}` : ''}</div>
            <span class="badge badge-warning">pending</span>
          </div>
          <div class="order-card-items">${o.items.map(i => `${i.qty}x ${escHtml(i.name)}`).join(', ')}</div>
          <div class="order-card-footer">
            <span class="order-card-total">${formatCurrency(calcOrderTotal(o))}</span>
            <div style="display:flex;gap:6px">
              <button class="btn btn-success btn-sm" onclick="showDeliveryFromOrder('${o.id}')">Deliver</button>
              <button class="btn btn-outline btn-sm" onclick="openEditOrderPage('${o.id}')">Edit</button>
              <button class="btn btn-sm" style="color:var(--danger);border:1px solid var(--danger)" onclick="deleteOrder('${o.id}')">Delete</button>
            </div>
          </div>
        </div>`;
    });
  }

  // ── Unified Activity Timeline ──────────────────────────
  // Combine orders + debt history + standalone payments into one list
  const dhRaw = S.debtHistory[stop.id] || [];
  const activity = [];

  // Build a map of orderId -> debt history entries for grouping
  const debtByOrder = {};
  const standaloneDebt = [];
  dhRaw.forEach((h, i) => {
    if (h.type === 'visit' || h.amount <= 0) return;
    const entry = { ...h };
    if (h.orderId && S.orders[h.orderId]) {
      if (!debtByOrder[h.orderId]) debtByOrder[h.orderId] = [];
      debtByOrder[h.orderId].push(entry);
    } else {
      standaloneDebt.push(entry);
    }
  });

  // Add delivered orders as activity items
  recentDelivered.forEach(o => {
    const isVisit = o.payMethod === 'visit';
    const total = calcOrderTotal(o);
    const debtEntries = debtByOrder[o.id] || [];
    // Determine payment status
    let payStatus, payColor, payIcon, payBadgeClass;
    if (isVisit) {
      payStatus = 'Visit'; payColor = 'var(--purple)'; payIcon = ''; payBadgeClass = 'badge-purple';
    } else if (o.payMethod === 'bank') {
      payStatus = 'Paid by bank'; payColor = 'var(--success)'; payIcon = '&#x1f3e6; '; payBadgeClass = 'badge-success';
    } else if (o.payMethod === 'unpaid') {
      payStatus = 'Not paid'; payColor = 'var(--danger)'; payIcon = ''; payBadgeClass = 'badge-danger';
    } else if (o.payMethod === 'cash') {
      const cashPaid = o.cashPaid !== undefined ? o.cashPaid : total;
      if (cashPaid >= total) {
        payStatus = 'Paid cash'; payColor = 'var(--success)'; payIcon = ''; payBadgeClass = 'badge-success';
      } else {
        payStatus = `Partial (${formatCurrency(cashPaid)}/${formatCurrency(total)})`; payColor = 'var(--warning)'; payIcon = ''; payBadgeClass = 'badge-warning';
      }
    } else {
      payStatus = o.payMethod || ''; payColor = 'var(--text-sec)'; payIcon = ''; payBadgeClass = 'badge-outline';
    }
    activity.push({
      type: 'order', date: o.deliveredAt || o.createdAt, order: o,
      total, isVisit, payStatus, payColor, payIcon, payBadgeClass, debtEntries
    });
  });

  // Add standalone debt entries (payments not linked to a specific order)
  standaloneDebt.forEach(h => {
    activity.push({
      type: h.type === 'clear' ? 'payment' : h.type === 'adjust' ? 'writeoff' : 'debt',
      date: h.date, entry: h
    });
  });

  // Sort newest first, then by type priority for same-millisecond entries
  const _typePriority = { order: 0, debt: 1, writeoff: 2, payment: 3 };
  activity.sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : 0;
    const db = b.date ? new Date(b.date).getTime() : 0;
    if (db !== da) return db - da;
    return (_typePriority[a.type] || 9) - (_typePriority[b.type] || 9);
  });

  // Calculate running balance (walk newest→oldest, reverse-engineer from current debt)
  const currentDebt = S.debts[stop.id] || 0;
  let _runBal = currentDebt;
  for (let i = 0; i < activity.length; i++) {
    const a = activity[i];
    a._balAfter = _runBal;
    if (a.type === 'order') {
      const impact = getOrderDebtImpact(a.order);
      const payTotal = (a.debtEntries || []).filter(e => e.type === 'clear').reduce((s, e) => s + e.amount, 0);
      _runBal = roundMoney(_runBal - impact + payTotal);
    } else if (a.type === 'debt') {
      _runBal = roundMoney(_runBal - a.entry.amount);
    } else if (a.type === 'payment') {
      _runBal = roundMoney(_runBal + a.entry.amount);
    } else if (a.type === 'writeoff') {
      _runBal = roundMoney(_runBal + a.entry.amount);
    }
  }

  html += `<div class="section-head"><h3>Activity</h3></div>`;
  if (activity.length === 0) {
    html += `<p class="text-muted" style="font-size:13px;padding:8px 0">No activity yet</p>`;
  }
  let _debtOwesShown = false; // Show "Owes" + "Collect Payment" only on the first (newest) entry
  let _lastDateGroup = '';
  activity.slice(0, 30).forEach(a => {
    // Date group header
    const _dt = a.date ? new Date(a.date) : null;
    const _dg = _dt ? _dt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : 'Unknown';
    if (_dg !== _lastDateGroup) {
      html += `<div style="font-size:12px;font-weight:600;color:var(--text-sec);padding:${_lastDateGroup ? '10px' : '4px'} 0 4px">${_dg}</div>`;
      _lastDateGroup = _dg;
    }
    if (a.type === 'order') {
      const o = a.order;
      const badgeLabel = a.isVisit ? 'visit' : 'delivered';
      const badgeClass = a.isVisit ? 'badge-purple' : 'badge-success';
      const hasUnpaidDebt = (o.payMethod === 'unpaid' || (o.payMethod === 'cash' && o.cashPaid !== undefined && o.cashPaid < a.total)) && a.total > 0;
      const debtAmount = getOrderDebtImpact(o);
      const showOwes = hasUnpaidDebt && debtAmount > 0 && !_debtOwesShown;
      if (showOwes) _debtOwesShown = true;
      html += `
        <div class="card" style="padding:10px;margin-bottom:6px">
          <div class="flex-between">
            <div class="order-card-date">${formatDateTime(a.date)}</div>
            <span class="badge ${badgeClass}">${badgeLabel}</span>
          </div>
          ${o.items.length > 0 ? `<div style="font-size:13px;font-weight:500;margin:4px 0">${o.items.map(i => i.qty + 'x ' + escHtml(i.name)).join(', ')}</div>` : (o.note ? `<div class="text-muted" style="font-size:13px;margin:4px 0">${escHtml(o.note)}</div>` : '')}
          ${o.deliveryNote ? `<div class="text-muted" style="font-size:12px;font-style:italic">Note: ${escHtml(o.deliveryNote)}</div>` : ''}
          <div class="flex-between" style="margin-top:4px">
            ${o.items.length > 0 ? `<span style="font-size:14px;font-weight:600">${formatCurrency(a.total)}</span>` : '<span></span>'}
            <span class="badge ${a.payBadgeClass}">${a.payIcon}${a.payStatus}</span>
          </div>
          ${showOwes ? `
          <div style="margin-top:6px;padding-top:6px;border-top:1px dashed var(--border);display:flex;align-items:center;justify-content:space-between">
            <span style="font-size:12px;color:var(--danger)">Owes ${formatCurrency(debtAmount)}</span>
            <button class="btn btn-success btn-sm" style="font-size:11px;padding:3px 10px" data-id="${escHtml(o.id)}" onclick="showCollectOrderPayment(this.dataset.id)">Collect Payment</button>
          </div>` : ''}
          ${a.debtEntries.filter(e => e.type === 'clear').length > 0 ? a.debtEntries.filter(e => e.type === 'clear').map(e => `
          <div style="margin-top:4px;padding:4px 8px;background:var(--success-light);border-radius:var(--radius-sm);display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:12px;color:var(--success)">${escHtml(e.note || 'Payment received')}</span>
            <span style="font-size:12px;font-weight:600;color:var(--success)">-${formatCurrency(e.amount)}</span>
          </div>`).join('') : ''}
          ${a._balAfter != null ? `<div style="font-size:11px;color:var(--text-sec);margin-top:2px">Balance: ${formatCurrency(a._balAfter)}</div>` : ''}
          <div style="display:flex;gap:6px;justify-content:flex-end;margin-top:4px">
            <button class="btn-ghost" style="font-size:11px;color:var(--primary);padding:2px 6px" data-id="${escHtml(o.id)}" onclick="showEditDeliveredOrderModal(this.dataset.id)">Edit</button>
            <button class="btn-ghost" style="font-size:11px;color:var(--danger);padding:2px 6px" data-id="${escHtml(o.id)}" onclick="deleteOrder(this.dataset.id)">Delete</button>
          </div>
        </div>`;
    } else if (a.type === 'payment') {
      const e = a.entry;
      html += `
        <div class="card" style="padding:10px;margin-bottom:6px;border-left:3px solid var(--success);background:var(--success-light)">
          <div class="flex-between">
            <span style="font-size:13px;font-weight:500">${escHtml(e.note || 'Payment received')}</span>
            <span style="font-size:13px;font-weight:600;color:var(--success)">-${formatCurrency(e.amount)}</span>
          </div>
          <div class="flex-between" style="margin-top:4px">
            <div style="font-size:11px;color:var(--text-sec)">${formatDateTime(e.date)}${a._balAfter != null ? ' · Bal: ' + formatCurrency(a._balAfter) : ''}</div>
            <div style="display:flex;gap:6px">
              <button class="btn-ghost" style="font-size:11px;color:var(--primary);padding:2px 6px" data-eid="${escHtml(e.id)}" onclick="btnLock(()=>showEditDebtHistoryModal(${stop.id},this.dataset.eid))">Edit</button>
              <button class="btn-ghost" style="font-size:11px;color:var(--danger);padding:2px 6px" data-eid="${escHtml(e.id)}" onclick="btnLock(()=>removeDebtHistory(${stop.id},this.dataset.eid))">Remove</button>
            </div>
          </div>
        </div>`;
    } else if (a.type === 'debt') {
      const e = a.entry;
      const customerDebt = S.debts[stop.id] || 0;
      const showDebtOwes = customerDebt > 0 && !_debtOwesShown;
      if (showDebtOwes) _debtOwesShown = true;
      html += `
        <div class="card" style="padding:10px;margin-bottom:6px;border-left:3px solid var(--danger);background:var(--danger-light)">
          <div class="flex-between">
            <span style="font-size:13px;font-weight:500">${escHtml(e.note || 'Debt added')}</span>
            <span style="font-size:13px;font-weight:600;color:var(--danger)">+${formatCurrency(e.amount)}</span>
          </div>
          ${showDebtOwes ? `
          <div style="margin-top:6px;padding-top:6px;border-top:1px dashed var(--border);display:flex;align-items:center;justify-content:space-between">
            <span style="font-size:12px;color:var(--danger)">Owes ${formatCurrency(customerDebt)}</span>
            <button class="btn btn-success btn-sm" style="font-size:11px;padding:3px 10px" onclick="showClearDebtModal()">Collect Payment</button>
          </div>` : ''}
          <div class="flex-between" style="margin-top:4px">
            <div style="font-size:11px;color:var(--text-sec)">${formatDateTime(e.date)}${a._balAfter != null ? ' · Bal: ' + formatCurrency(a._balAfter) : ''}</div>
            <div style="display:flex;gap:6px">
              <button class="btn-ghost" style="font-size:11px;color:var(--primary);padding:2px 6px" data-eid="${escHtml(e.id)}" onclick="btnLock(()=>showEditDebtHistoryModal(${stop.id},this.dataset.eid))">Edit</button>
              <button class="btn-ghost" style="font-size:11px;color:var(--danger);padding:2px 6px" data-eid="${escHtml(e.id)}" onclick="btnLock(()=>removeDebtHistory(${stop.id},this.dataset.eid))">Remove</button>
            </div>
          </div>
        </div>`;
    } else if (a.type === 'writeoff') {
      const e = a.entry;
      html += `
        <div class="card" style="padding:10px;margin-bottom:6px;border-left:3px solid var(--text-muted)">
          <div class="flex-between">
            <span style="font-size:13px;font-weight:500;text-decoration:line-through">${escHtml(e.note || 'Debt written off')}</span>
            <span style="font-size:13px;font-weight:600;color:var(--text-muted)">-${formatCurrency(e.amount)}</span>
          </div>
          <div class="flex-between" style="margin-top:4px">
            <div style="font-size:11px;color:var(--text-sec)">${formatDateTime(e.date)}${a._balAfter != null ? ' · Bal: ' + formatCurrency(a._balAfter) : ''}</div>
            <div style="display:flex;gap:6px">
              <button class="btn-ghost" style="font-size:11px;color:var(--primary);padding:2px 6px" data-eid="${escHtml(e.id)}" onclick="btnLock(()=>showEditDebtHistoryModal(${stop.id},this.dataset.eid))">Edit</button>
              <button class="btn-ghost" style="font-size:11px;color:var(--danger);padding:2px 6px" data-eid="${escHtml(e.id)}" onclick="btnLock(()=>removeDebtHistory(${stop.id},this.dataset.eid))">Remove</button>
            </div>
          </div>
        </div>`;
    }
  });

  html += `</div>`; // page-body
  document.getElementById('page-profile').innerHTML = html;
}

async function deleteOrder(orderId) {
  const order = S.orders[orderId];
  if (!order) return;

  // Check if this order has linked debt
  const debtImpact = getOrderDebtImpact(order);
  let msg = 'Are you sure you want to delete this record?';
  if (debtImpact > 0) {
    msg += `<br><br><span style="color:var(--danger)">This order has ${formatCurrency(debtImpact)} linked debt which will also be removed from the balance.</span>`;
  }
  if (!(await appConfirm(msg, true))) return;

  // Only restore stock if deleting a DELIVERED order
  let stockChange = { changed: false, lowStockWarnings: [] };
  if (order.status === 'delivered') {
    stockChange = applyTrackedStockChange(order.items || [], []);
  }
  const debtChanged = reconcileOrderDebtEffect(order, null);
  delete S.orders[orderId];
  // Clean up locked orders list
  const lockIdx = (S.ordersLockedOrders || []).indexOf(orderId);
  if (lockIdx >= 0) { S.ordersLockedOrders.splice(lockIdx, 1); DB.setSetting('ordersLockedOrders', S.ordersLockedOrders); }

  const savePromises = [save.orders([orderId])];
  if (stockChange.changed) savePromises.push(save.catalog());
  if (debtChanged) {
    savePromises.push(save.debts(), save.debtHistory([order.customerId]));
    DB.setDebt(order.customerId, S.debts[order.customerId] || 0);
  }
  await Promise.allSettled(savePromises);
  if (curPage === 'profile') renderProfile();
  else if (curPage === 'orders') renderOrders();
}

function showEditDeliveredOrderModal(orderId) {
  const o = S.orders[orderId];
  if (!o) return;
  const isVisit = o.payMethod === 'visit';
  const dt = o.deliveredAt ? new Date(o.deliveredAt) : new Date();
  const dateVal = dt.toISOString().slice(0, 16);
  const total = calcOrderTotal(o);
  // If order was bank/unpaid, default cash to 0 so user must enter actual received amount
  const cashDefault = (o.payMethod === 'bank' || o.payMethod === 'unpaid') ? 0 : total;
  const cashValue = roundMoney(Math.min(total, o.cashPaid !== undefined ? o.cashPaid : cashDefault));

  let modalHtml = `
    <div class="modal-handle"></div>
    <div class="modal-title">${isVisit ? 'Edit Visit' : 'Edit Delivery'}</div>
    <div class="form-group">
      <label class="form-label">Date</label>
      <input class="input" type="datetime-local" id="edit-del-date" value="${dateVal}">
    </div>`;

  if (isVisit) {
    modalHtml += `
    <div class="form-group">
      <label class="form-label">Note</label>
      <textarea class="textarea" id="edit-del-note" rows="2">${escHtml(o.note || o.deliveryNote || '')}</textarea>
    </div>`;
  } else {
    modalHtml += `
    <div class="form-group">
      <label class="form-label">Payment Method</label>
      <select class="input" id="edit-del-pay" onchange="toggleEditDeliveredCash(this.value)">
        <option value="cash" ${o.payMethod==='cash'?'selected':''}>Cash</option>
        <option value="bank" ${o.payMethod==='bank'?'selected':''}>Bank</option>
        <option value="unpaid" ${o.payMethod==='unpaid'?'selected':''}>Not Paid</option>
      </select>
    </div>
    <div class="form-group ${o.payMethod==='cash'?'':'hidden'}" id="edit-del-cash-wrap">
      <label class="form-label">Cash Amount Received</label>
      <input class="input" type="number" step="0.01" id="edit-del-cash" value="${cashValue.toFixed(2)}"
             data-total="${total}" oninput="updateEditDeliveredCashHint()">
      <div class="text-muted" style="font-size:12px;margin-top:4px" id="edit-del-cash-hint"></div>
    </div>
    <div class="form-group">
      <label class="form-label">Delivery Note</label>
      <textarea class="textarea" id="edit-del-note" rows="2">${escHtml(o.deliveryNote || '')}</textarea>
    </div>`;
  }

  modalHtml += `
    <button class="btn btn-primary btn-block mt-2" onclick="saveEditDeliveredOrder('${orderId}')">Save</button>`;
  openModal(modalHtml);
  if (!isVisit) updateEditDeliveredCashHint();
}

function toggleEditDeliveredCash(method) {
  const wrap = document.getElementById('edit-del-cash-wrap');
  if (!wrap) return;
  wrap.classList.toggle('hidden', method !== 'cash');
  if (method === 'cash') {
    // If switching TO cash from bank/unpaid, reset cash input to 0
    const cashInput = document.getElementById('edit-del-cash');
    if (cashInput && parseFloat(cashInput.value) === parseFloat(cashInput.dataset.total)) {
      cashInput.value = '0.00';
    }
    updateEditDeliveredCashHint();
  }
}

function updateEditDeliveredCashHint() {
  const input = document.getElementById('edit-del-cash');
  const hint = document.getElementById('edit-del-cash-hint');
  if (!input || !hint) return;
  const total = roundMoney(parseFloat(input.dataset.total) || 0);
  const paid = roundMoney(Math.max(0, parseFloat(input.value) || 0));
  const remaining = roundMoney(Math.max(0, total - paid));
  hint.innerHTML = remaining > 0 ? `<span style="color:var(--danger)">${formatCurrency(remaining)} will be added to debt</span>` : '';
}

async function saveEditDeliveredOrder(orderId) {
  const o = S.orders[orderId];
  if (!o) return;
  const prevOrder = JSON.parse(JSON.stringify(o));
  const dateInput = document.getElementById('edit-del-date');
  if (dateInput && dateInput.value) {
    o.deliveredAt = new Date(dateInput.value).toISOString();
  }
  const isVisit = prevOrder.payMethod === 'visit';
  let debtChanged = false;
  if (isVisit) {
    const note = document.getElementById('edit-del-note')?.value?.trim() || '';
    o.note = note;
    o.deliveryNote = note;
  } else {
    const pay = document.getElementById('edit-del-pay')?.value;
    if (pay) {
      o.payMethod = pay;
      if (pay === 'cash') {
        const total = calcOrderTotal(o);
        const cashInput = document.getElementById('edit-del-cash');
        const cashVal = parseFloat(cashInput?.value);
        o.cashPaid = roundMoney(Math.max(0, Math.min(total, isNaN(cashVal) ? total : cashVal)));
      } else {
        delete o.cashPaid;
      }
    }
    o.deliveryNote = document.getElementById('edit-del-note')?.value?.trim() || '';
    debtChanged = reconcileOrderDebtEffect(prevOrder, o);
  }
  const savePromises = [save.orders([o.id])];
  if (debtChanged) {
    savePromises.push(save.debts(), save.debtHistory([o.customerId]));
    DB.setDebt(o.customerId, S.debts[o.customerId] || 0);
  }
  await Promise.allSettled(savePromises);
  closeModal();
  if (curPage === 'profile') renderProfile();
}

function showEditCustomerModal() {
  const stop = getStop(profileStopId);
  if (!stop) return;
  openModal(`
    <div class="modal-handle"></div>
    <div class="modal-title">Edit Customer</div>
    <div class="form-group">
      <label class="form-label">Name</label>
      <input class="input" id="edit-cust-name" value="${escHtml(stop.n)}">
    </div>
    <div class="form-group">
      <label class="form-label">Address</label>
      <input class="input" id="edit-cust-addr" value="${escHtml(stop.a)}">
    </div>
    <div class="form-group">
      <label class="form-label">City / Area</label>
      <input class="input" id="edit-cust-city" value="${escHtml(stop.c)}">
    </div>
    <div class="form-group">
      <label class="form-label">Postcode</label>
      <input class="input" id="edit-cust-post" value="${escHtml(stop.p)}">
    </div>
    <div class="form-group">
      <label class="form-label">Contact Name</label>
      <input class="input" id="edit-cust-cn" value="${escHtml(stop.cn||'')}">
    </div>
    <div class="form-group">
      <label class="form-label">Mobile Phone</label>
      <input class="input" id="edit-cust-ph" type="tel" value="${escHtml(stop.ph||'')}">
    </div>
    <div class="form-group">
      <label class="form-label">Email</label>
      <input class="input" id="edit-cust-em" type="email" value="${escHtml(stop.em||'')}">
    </div>
    <button class="btn btn-primary btn-block mb-1" onclick="saveEditCustomer()">Save</button>
    <button class="btn btn-danger btn-block" onclick="deleteCustomer()">Delete Customer</button>
  `);
}

async function saveEditCustomer() {
  const stop = getStop(profileStopId);
  if (!stop) return;
  const previousAddressKey = getStopAddressKey(stop);
  stop.n = (document.getElementById('edit-cust-name').value.trim() || stop.n).toUpperCase();
  stop.a = document.getElementById('edit-cust-addr').value.trim();
  stop.c = document.getElementById('edit-cust-city').value.trim();
  stop.p = normalizePostcode(document.getElementById('edit-cust-post').value);
  stop.cn = document.getElementById('edit-cust-cn').value.trim();
  stop.ph = document.getElementById('edit-cust-ph').value.trim();
  stop.em = document.getElementById('edit-cust-em').value.trim();
  await save.stops();
  closeModal();
  renderProfile();
  if (previousAddressKey !== getStopAddressKey(stop)) {
    geocodeStop(stop, { force: true }).then(() => { if (leafletMap) refreshMapMarkers(); });
  }
}

async function deleteCustomer() {
  const pendingCount = getStopOrders(profileStopId, 'pending').length;
  const debt = S.debts[profileStopId] || 0;
  let msg = 'Are you sure you want to delete this customer?';
  if (pendingCount > 0 || debt > 0) {
    msg += '<br><br>';
    if (pendingCount > 0) msg += `<span style="color:var(--warning)">${pendingCount} pending order${pendingCount > 1 ? 's' : ''} will be orphaned.</span><br>`;
    if (debt > 0) msg += `<span style="color:var(--danger)">${formatCurrency(debt)} debt will be lost.</span><br>`;
  }
  msg += '<br>This action cannot be undone.';
  if (!(await appConfirm(msg, true))) return;
  STOPS = STOPS.filter(s => s.id !== profileStopId);
  delete S.assign[profileStopId];

  // Clean up all related data for deleted customer
  Object.keys(S.orders).forEach(oid => {
    if (S.orders[oid].customerId === profileStopId) delete S.orders[oid];
  });
  delete S.debts[profileStopId];
  delete S.debtHistory[profileStopId];
  Object.keys(S.routeOrder).forEach(dayId => {
    S.routeOrder[dayId] = (S.routeOrder[dayId] || []).filter(id => id !== profileStopId);
  });
  delete S.geo[profileStopId];
  delete S.cnotes[profileStopId];
  delete S.customerPricing[profileStopId];
  delete S.customerProducts[profileStopId];
  delete S.brands[profileStopId];
  delete S.recurringOrders[profileStopId];

  await Promise.allSettled([
    save.stops(), save.assign(), save.orders(Object.keys(S.orders)),
    save.debts(), save.debtHistory([profileStopId]),
    save.routeOrder(), save.geo(), save.cnotes(),
    save.pricing(), save.customerProducts(), save.brands(),
    save.recurringOrders()
  ]);
  closeModal();
  showPage('customers');
  DB.deleteCustomer(profileStopId);
}

// ══════════════════════════════════════════════════════════════
// ASSIGN DAY
// ══════════════════════════════════════════════════════════════
function showAssignModal() {
  const stop = getStop(profileStopId);
  if (!stop) return;
  const currentDay = S.assign[stop.id];

  let html = `<div class="modal-handle"></div>
    <div class="modal-title">Assign Day - ${escHtml(stop.n)}</div>`;

  ['A', 'B'].forEach(week => {
    html += `<div style="font-size:13px;font-weight:600;color:var(--text-sec);margin:12px 0 6px">Week ${week}</div>`;
    DAYS.filter(d => d.week === week).forEach(d => {
      const isActive = currentDay === d.id;
      html += `<button class="btn ${isActive ? 'btn-primary' : 'btn-outline'} btn-block mb-1"
        style="${!isActive ? 'border-color:'+d.color+'40;color:'+d.color : 'background:'+d.color}"
        onclick="assignToDay('${d.id}')">
        ${d.label}
      </button>`;
    });
  });

  if (currentDay) {
    html += `<button class="btn btn-danger btn-block mt-2" onclick="unassignFromDay()">Remove from Route</button>`;
  }

  openModal(html);
}

async function assignToDay(dayId) {
  S.assign[profileStopId] = dayId;
  await save.assign();
  DB.setAssignment(profileStopId, dayId);
  closeModal();
  renderProfile();
}

async function unassignFromDay() {
  delete S.assign[profileStopId];
  await save.assign();
  DB.removeAssignment(profileStopId);
  closeModal();
  renderProfile();
}

// ══════════════════════════════════════════════════════════════
// CUSTOMER PRODUCTS (which products this customer uses)
// ══════════════════════════════════════════════════════════════
function showCustomerProductsModal() {
  const stop = getStop(profileStopId);
  if (!stop) return;
  const assigned = S.customerProducts[stop.id] || [];

  if (S.catalog.length === 0) {
    openModal(`<div class="modal-handle"></div>
      <div class="modal-title">Customer Products</div>
      <p class="text-muted text-center" style="padding:20px">No products in catalog. Add products from Settings first.</p>
      <button class="btn btn-outline btn-block" onclick="closeModal()">Close</button>
    `);
    return;
  }

  let html = `<div class="modal-handle"></div>
    <div class="modal-title">Products - ${escHtml(stop.n)}</div>
    <p class="text-muted mb-2" style="font-size:12px">Select products this customer uses.</p>`;

  S.catalog.forEach((c, i) => {
    const checked = assigned.includes(c.name);
    html += `<label style="display:flex;align-items:center;gap:10px;padding:12px;border-bottom:1px solid var(--border);cursor:pointer">
      <input type="checkbox" id="cprod-${i}" ${checked ? 'checked' : ''} value="${escHtml(c.name)}"
        style="width:20px;height:20px;accent-color:var(--primary)">
      <div style="flex:1">
        <div style="font-weight:500">${escHtml(c.name)}</div>
        <div class="text-muted" style="font-size:12px">${escHtml(c.unit || '')} - ${formatCurrency(c.price)}</div>
      </div>
    </label>`;
  });

  html += `<button class="btn btn-primary btn-block mt-2" onclick="saveCustomerProducts()">Save</button>`;
  openModal(html);
}

function saveCustomerProducts() {
  const products = [];
  S.catalog.forEach((c, i) => {
    const el = document.getElementById('cprod-' + i);
    if (el && el.checked) products.push(c.name);
  });
  if (products.length > 0) {
    S.customerProducts[profileStopId] = products;
  } else {
    delete S.customerProducts[profileStopId];
  }
  save.customerProducts();
  closeModal();
  renderProfile();
}

// ══════════════════════════════════════════════════════════════
// PRICING MODAL
// ══════════════════════════════════════════════════════════════
function showPricingModal() {
  const stop = getStop(profileStopId);
  if (!stop) return;
  const cp = S.customerPricing[stop.id] || {};

  if (S.catalog.length === 0) {
    openModal(`<div class="modal-handle"></div>
      <div class="modal-title">Custom Pricing</div>
      <p class="text-muted text-center" style="padding:20px">No products in catalog. Add products from Settings first.</p>
      <button class="btn btn-outline btn-block" onclick="closeModal()">Close</button>
    `);
    return;
  }

  let html = `<div class="modal-handle"></div>
    <div class="modal-title">Custom Pricing - ${escHtml(stop.n)}</div>
    <p class="text-muted mb-2" style="font-size:12px">Leave empty for default catalog price.</p>`;

  S.catalog.forEach((c, i) => {
    const val = cp[c.name] !== undefined ? cp[c.name] : '';
    html += `<div class="flex-between mb-1">
      <div><div style="font-weight:500">${escHtml(c.name)}</div><div class="text-muted" style="font-size:12px">Default: ${formatCurrency(c.price)}</div></div>
      <input class="input" type="number" step="0.01" style="width:90px;text-align:right" id="cp-${i}" value="${val}" placeholder="${c.price}">
    </div>`;
  });

  html += `<button class="btn btn-primary btn-block mt-2" onclick="savePricing()">Save Prices</button>`;
  openModal(html);
}

async function savePricing() {
  const cp = {};
  S.catalog.forEach((c, i) => {
    const el = document.getElementById('cp-' + i);
    if (el && el.value !== '') cp[c.name] = parseFloat(el.value) || 0;
  });
  S.customerPricing[profileStopId] = cp;
  await save.pricing();
  closeModal();
  renderProfile();
}

// ══════════════════════════════════════════════════════════════
// NOTE MODAL
// ══════════════════════════════════════════════════════════════
function showNoteModal() {
  const note = S.cnotes[profileStopId] || '';
  openModal(`<div class="modal-handle"></div>
    <div class="modal-title">Customer Note</div>
    <div class="form-group">
      <textarea class="textarea" id="note-text" rows="4">${escHtml(note)}</textarea>
    </div>
    <button class="btn btn-primary btn-block" onclick="saveNote()">Save Note</button>
  `);
}

async function saveNote() {
  if (profileStopId == null) return;
  const note = document.getElementById('note-text').value.trim();
  if (note) S.cnotes[profileStopId] = note;
  else delete S.cnotes[profileStopId];
  await save.cnotes();
  closeModal();
  renderProfile();
}

// ══════════════════════════════════════════════════════════════
// BRAND MANAGEMENT
// ══════════════════════════════════════════════════════════════
function showBrandModal() {
  const current = S.brands[profileStopId] || '';
  const brands = S.brandList || [];
  let html = `<div class="modal-handle"></div>
    <div class="modal-title">Set Brand</div>
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">
      <button class="btn btn-block ${!current ? 'btn-primary' : 'btn-outline'}" onclick="setBrand('')" style="text-align:left">No Brand</button>
      ${brands.map(b => `
        <div style="display:flex;gap:6px;align-items:stretch">
          <button class="btn ${current === b ? 'btn-primary' : 'btn-outline'}" data-brand="${escHtml(b)}" onclick="setBrand(this.dataset.brand)" style="text-align:left;flex:1">${escHtml(b)}</button>
          <button class="btn btn-outline" data-brand="${escHtml(b)}" onclick="event.stopPropagation();renameBrand(this.dataset.brand)" title="Rename" style="padding:0 10px;font-size:14px;flex-shrink:0">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
          </button>
          <button class="btn btn-outline" data-brand="${escHtml(b)}" onclick="event.stopPropagation();deleteBrand(this.dataset.brand)" title="Delete" style="padding:0 10px;color:var(--danger);border-color:var(--danger);font-size:14px;flex-shrink:0">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          </button>
        </div>
      `).join('')}
    </div>
    <div class="form-group">
      <label class="form-label">Add New Brand</label>
      <div style="display:flex;gap:8px">
        <input class="input" type="text" id="new-brand-name" placeholder="Brand name...">
        <button class="btn btn-primary" onclick="addAndSetBrand()">Add</button>
      </div>
    </div>`;
  openModal(html);
}

function setBrand(name) {
  if (name) {
    S.brands[profileStopId] = name;
  } else {
    delete S.brands[profileStopId];
  }
  save.brands();
  closeModal();
  renderProfile();
}

function addAndSetBrand() {
  const name = document.getElementById('new-brand-name').value.trim();
  if (!name) return;
  if (!S.brandList.includes(name)) {
    S.brandList.push(name);
    save.brandList();
  }
  setBrand(name);
}

async function renameBrand(oldName) {
  closeModal();
  const newName = await appPromptInput('Enter new name for "' + oldName + '":');
  if (!newName || !newName.trim() || newName.trim() === oldName) { showBrandModal(); return; }
  const trimmed = newName.trim();
  if (S.brandList.includes(trimmed)) { await appAlert('A brand with this name already exists.'); showBrandModal(); return; }
  const idx = S.brandList.indexOf(oldName);
  if (idx !== -1) S.brandList[idx] = trimmed;
  for (const key of Object.keys(S.brands)) {
    if (S.brands[key] === oldName) S.brands[key] = trimmed;
  }
  await Promise.allSettled([save.brandList(), save.brands()]);
  renderProfile();
  showBrandModal();
}

async function deleteBrand(name) {
  closeModal();
  const count = Object.values(S.brands).filter(b => b === name).length;
  const msg = count > 0
    ? 'Delete brand "' + name + '"? It is assigned to ' + count + ' customer' + (count > 1 ? 's' : '') + '. They will be set to No Brand.'
    : 'Delete brand "' + name + '"?';
  const ok = await appConfirm(msg);
  if (!ok) { showBrandModal(); return; }
  S.brandList = S.brandList.filter(b => b !== name);
  for (const key of Object.keys(S.brands)) {
    if (S.brands[key] === name) delete S.brands[key];
  }
  await Promise.allSettled([save.brandList(), save.brands()]);
  renderProfile();
  showBrandModal();
}

// ══════════════════════════════════════════════════════════════
// DEBT MANAGEMENT
// ══════════════════════════════════════════════════════════════
function showAddDebtModal() {
  const now = new Date().toISOString().slice(0, 16);
  openModal(`<div class="modal-handle"></div>
    <div class="modal-title">Add Debt</div>
    <div class="form-group">
      <label class="form-label">Amount</label>
      <input class="input" type="number" step="0.01" min="0" id="debt-amount" placeholder="0.00">
    </div>
    <div class="form-group">
      <label class="form-label">Date & Time</label>
      <input class="input" type="datetime-local" id="debt-date" value="${now}">
    </div>
    <div class="form-group">
      <label class="form-label">Note (optional)</label>
      <input class="input" id="debt-note" placeholder="Reason...">
    </div>
    <button class="btn btn-primary btn-block" onclick="addDebt()">Add Debt</button>
  `);
}

async function addDebt() {
  const amount = parseFloat(document.getElementById('debt-amount').value) || 0;
  if (amount <= 0) { appAlert('Please enter a valid amount.'); return; }
  const note = document.getElementById('debt-note').value.trim() || 'Debt added';
  const dateInput = document.getElementById('debt-date');
  const debtDate = dateInput && dateInput.value ? new Date(dateInput.value).toISOString() : new Date().toISOString();

  S.debts[profileStopId] = (S.debts[profileStopId] || 0) + amount;
  createDebtHistoryEntry(profileStopId, { date: debtDate, amount, type: 'add', note });
  await Promise.allSettled([save.debts(), save.debtHistory([profileStopId])]);
  DB.setDebt(profileStopId, S.debts[profileStopId]);
  closeModal();
  renderProfile();
}

function showCollectOrderPayment(orderId) {
  const o = S.orders[orderId];
  if (!o) return;
  const debtAmount = getOrderDebtImpact(o);
  if (debtAmount <= 0) { appAlert('No outstanding debt for this order.'); return; }
  const items = o.items.map(i => i.qty + 'x ' + i.name).join(', ');
  const now = new Date().toISOString().slice(0, 16);
  openModal(`<div class="modal-handle"></div>
    <div class="modal-title">Collect Payment</div>
    <div class="card" style="padding:10px;margin-bottom:12px;background:var(--danger-light)">
      <div style="font-size:13px;font-weight:500">${escHtml(items)}</div>
      <div style="font-size:12px;color:var(--text-sec);margin-top:2px">${formatDateTime(o.deliveredAt)}</div>
      <div style="font-size:14px;font-weight:600;color:var(--danger);margin-top:4px">Owes ${formatCurrency(debtAmount)}</div>
    </div>
    <div class="form-group">
      <label class="form-label">Amount to collect</label>
      <input class="input" type="number" step="0.01" id="clear-amount" value="${debtAmount.toFixed(2)}">
    </div>
    <div class="form-group">
      <label class="form-label">Payment Date & Time</label>
      <input class="input" type="datetime-local" id="clear-date" value="${now}">
    </div>
    <div class="form-group">
      <label class="form-label">Payment Method</label>
      <div class="pay-options">
        <div class="pay-opt selected" onclick="selectClearMethod('cash',this)">Cash</div>
        <div class="pay-opt" onclick="selectClearMethod('bank',this)">Bank</div>
      </div>
    </div>
    <button class="btn btn-success btn-block" onclick="clearOrderDebt('${orderId}')">Collect Payment</button>
  `);
}

async function clearOrderDebt(orderId) {
  const o = S.orders[orderId];
  if (!o) return;
  const debtAmount = getOrderDebtImpact(o);
  const requested = parseFloat(document.getElementById('clear-amount').value) || 0;
  const amount = roundMoney(Math.min(debtAmount, Math.max(0, requested)));
  if (amount <= 0) return;
  const dateInput = document.getElementById('clear-date');
  const payDate = dateInput && dateInput.value ? new Date(dateInput.value).toISOString() : new Date().toISOString();

  // If fully paying, update the order's payment method
  if (amount >= debtAmount) {
    const prevOrder = JSON.parse(JSON.stringify(o));
    o.payMethod = clearDebtMethod || 'cash';
    if (o.payMethod === 'cash') {
      o.cashPaid = roundMoney(calcOrderTotal(o));
    } else {
      delete o.cashPaid;
    }
    reconcileOrderDebtEffect(prevOrder, o);
    save.orders([o.id]);
  } else {
    // Partial payment: reduce debt balance and add history entry
    S.debts[profileStopId] = Math.max(0, roundMoney((S.debts[profileStopId] || 0) - amount));
    const items = o.items.map(i => i.qty + 'x ' + i.name).join(', ');
    createDebtHistoryEntry(profileStopId, {
      date: payDate, amount, type: 'clear',
      note: 'Payment received (' + clearDebtMethod + ') — ' + items,
      orderId: o.id
    });
  }
  await Promise.allSettled([save.debts(), save.debtHistory([profileStopId])]);
  DB.setDebt(profileStopId, S.debts[profileStopId] || 0);
  closeModal();
  renderProfile();
}

function showClearDebtModal() {
  const debt = S.debts[profileStopId] || 0;
  const now = new Date().toISOString().slice(0, 16);

  // Find unpaid orders for this customer
  const unpaidOrders = getStopOrders(profileStopId, 'delivered')
    .filter(o => getOrderDebtImpact(o) > 0)
    .sort((a, b) => (b.deliveredAt || '').localeCompare(a.deliveredAt || ''));

  let html = `<div class="modal-handle"></div>
    <div class="modal-title">Collect Debt</div>
    <p class="mb-2">Current debt: <b>${formatCurrency(debt)}</b></p>`;

  if (unpaidOrders.length > 0) {
    html += `<div style="margin-bottom:12px">
      <div style="font-size:12px;font-weight:600;color:var(--text-sec);margin-bottom:6px">Unpaid Orders</div>`;
    unpaidOrders.forEach(o => {
      const owed = getOrderDebtImpact(o);
      const items = o.items.map(i => i.qty + 'x ' + i.name).join(', ');
      html += `<div class="card" style="padding:8px;margin-bottom:4px;cursor:pointer;border:1px solid var(--border)" onclick="closeModal();showCollectOrderPayment('${o.id}')">
        <div class="flex-between">
          <span style="font-size:12px">${escHtml(items)}</span>
          <span style="font-size:12px;font-weight:600;color:var(--danger)">${formatCurrency(owed)}</span>
        </div>
        <div class="text-muted" style="font-size:11px">${formatDateTime(o.deliveredAt)}</div>
      </div>`;
    });
    html += `<div style="font-size:11px;color:var(--text-sec);margin-top:4px;text-align:center">Tap an order to collect its payment</div></div>
    <div style="border-top:1px solid var(--border);padding-top:12px;margin-top:4px">
      <div style="font-size:12px;font-weight:600;color:var(--text-sec);margin-bottom:8px">Or collect a custom amount</div>`;
  }

  html += `<div class="form-group">
      <label class="form-label">Amount to collect</label>
      <input class="input" type="number" step="0.01" id="clear-amount" value="${debt.toFixed(2)}">
    </div>
    <div class="form-group">
      <label class="form-label">Payment Date & Time</label>
      <input class="input" type="datetime-local" id="clear-date" value="${now}">
    </div>
    <div class="form-group">
      <label class="form-label">Payment Method</label>
      <div class="pay-options">
        <div class="pay-opt selected" onclick="selectClearMethod('cash',this)" id="clear-cash">Cash</div>
        <div class="pay-opt" onclick="selectClearMethod('bank',this)" id="clear-bank">Bank</div>
      </div>
    </div>
    <button class="btn btn-success btn-block" onclick="clearDebt()">Collect Debt</button>`;

  if (unpaidOrders.length > 0) html += `</div>`;
  openModal(html);
}

clearDebtMethod = 'cash';
function selectClearMethod(method, el) {
  clearDebtMethod = method;
  document.querySelectorAll('.pay-opt').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
}

async function clearDebt() {
  const debt = S.debts[profileStopId] || 0;
  const requested = parseFloat(document.getElementById('clear-amount').value) || 0;
  const amount = roundMoney(Math.min(debt, Math.max(0, requested)));
  if (amount <= 0) return;
  const dateInput = document.getElementById('clear-date');
  const payDate = dateInput && dateInput.value ? new Date(dateInput.value).toISOString() : new Date().toISOString();
  S.debts[profileStopId] = Math.max(0, roundMoney(debt - amount));
  createDebtHistoryEntry(profileStopId, {
    date: payDate, amount: amount, type: 'clear',
    note: 'Payment received (' + clearDebtMethod + ')'
  });
  // If debt fully paid, sync unpaid orders so they no longer show "Not paid"
  const changedOrderIds = [];
  if (S.debts[profileStopId] <= 0) {
    getStopOrders(profileStopId, 'delivered')
      .filter(o => getOrderDebtImpact(o) > 0)
      .forEach(o => {
        const prev = JSON.parse(JSON.stringify(o));
        o.payMethod = clearDebtMethod || 'cash';
        if (o.payMethod === 'cash') { o.cashPaid = roundMoney(calcOrderTotal(o)); } else { delete o.cashPaid; }
        reconcileOrderDebtEffect(prev, o);
        changedOrderIds.push(o.id);
      });
  }
  const savePromises = [save.debts(), save.debtHistory([profileStopId])];
  if (changedOrderIds.length > 0) savePromises.push(save.orders(changedOrderIds));
  await Promise.allSettled(savePromises);
  DB.setDebt(profileStopId, S.debts[profileStopId]);
  closeModal();
  renderProfile();
}

async function removeAllDebt() {
  const debt = S.debts[profileStopId] || 0;
  if (debt <= 0) return;
  if (!(await appConfirm(formatCurrency(debt) + ' debt will be written off.<br>This will create a record but not count as payment. Continue?', true))) return;
  S.debts[profileStopId] = 0;
  createDebtHistoryEntry(profileStopId, {
    date: new Date().toISOString(),
    amount: debt,
    type: 'adjust',
    note: 'Debt written off'
  });
  await Promise.allSettled([save.debts(), save.debtHistory([profileStopId])]);
  DB.setDebt(profileStopId, 0);
  renderProfile();
}

function showEditDebtHistoryModal(stopId, entryId) {
  const dh = S.debtHistory[stopId];
  if (!dh) return;
  const idx = dh.findIndex(e => e.id === entryId);
  if (idx === -1) return;
  const h = dh[idx];
  const editDate = h.date ? new Date(h.date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16);
  openModal(`
    <div class="modal-handle"></div>
    <div class="modal-title">Edit Debt Record</div>
    <div class="form-group">
      <label class="form-label">Amount</label>
      <input class="input" type="number" step="0.01" id="edit-dh-amount" value="${h.amount}">
    </div>
    <div class="form-group">
      <label class="form-label">Date & Time</label>
      <input class="input" type="datetime-local" id="edit-dh-date" value="${editDate}">
    </div>
    <div class="form-group">
      <label class="form-label">Note</label>
      <input class="input" id="edit-dh-note" value="${escHtml(h.note || '')}">
    </div>
    <button class="btn btn-primary btn-block" data-eid="${escHtml(entryId)}" onclick="saveEditDebtHistory(${stopId},this.dataset.eid)">Save</button>
  `);
}

async function saveEditDebtHistory(stopId, entryId) {
  const dh = S.debtHistory[stopId];
  if (!dh) return;
  const idx = dh.findIndex(e => e.id === entryId);
  if (idx === -1) return;
  const oldAmount = dh[idx].amount;
  const oldType = dh[idx].type;
  const newAmount = parseFloat(document.getElementById('edit-dh-amount').value) || 0;
  const dateInput = document.getElementById('edit-dh-date');
  dh[idx].amount = newAmount;
  if (dateInput && dateInput.value) dh[idx].date = new Date(dateInput.value).toISOString();
  dh[idx].note = document.getElementById('edit-dh-note').value.trim();
  // Adjust debt balance
  if (oldType === 'add') {
    S.debts[stopId] = (S.debts[stopId] || 0) - oldAmount + newAmount;
  } else {
    S.debts[stopId] = (S.debts[stopId] || 0) + oldAmount - newAmount;
  }
  S.debts[stopId] = Math.max(0, S.debts[stopId]);
  await Promise.allSettled([save.debts(), save.debtHistory([stopId])]);
  DB.setDebt(stopId, S.debts[stopId]);
  closeModal();
  renderProfile();
}

async function removeDebtHistory(stopId, entryId) {
  if (!(await appConfirm('Are you sure you want to delete this debt record?'))) return;
  const dh = S.debtHistory[stopId];
  if (!dh) return;
  const idx = dh.findIndex(e => e.id === entryId);
  if (idx === -1) return;
  const h = dh[idx];
  // Reverse the debt effect
  if (h.type === 'add') {
    S.debts[stopId] = Math.max(0, (S.debts[stopId] || 0) - h.amount);
  } else {
    S.debts[stopId] = (S.debts[stopId] || 0) + h.amount;
  }
  dh.splice(idx, 1);
  await Promise.allSettled([save.debts(), save.debtHistory([stopId])]);
  DB.setDebt(stopId, S.debts[stopId]);
  renderProfile();
}

// ══════════════════════════════════════════════════════════════
