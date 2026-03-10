'use strict';
// PROFILE PAGE
// ══════════════════════════════════════════════════════════════
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
      <button class="btn-ghost" onclick="showEditCustomerModal()" style="font-size:13px;color:var(--primary)">Düzenle</button>
    </header>
    <div class="page-body">
      <!-- Info Card -->
      <div class="card" style="text-align:center">
        <div class="profile-avatar">${getCustomerInitials(stop.n)}</div>
        <div style="font-size:12px;color:var(--text-sec);margin-top:4px">${escHtml(stop.a)}</div>
        <div style="font-size:12px;color:var(--text-sec)">${escHtml(stop.c)} &middot; ${escHtml(stop.p)}</div>
        ${dayObj ? `<div style="margin-top:8px"><span class="badge" style="background:${dayObj.color}20;color:${dayObj.color}">Hafta ${dayObj.week} - ${dayObj.label}</span></div>` : '<div style="margin-top:8px"><span class="badge badge-outline">Atanmamış</span></div>'}
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
          Gün Ata
        </button>
        <button class="action-btn" onclick="showCustomerProductsModal()">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
          Ürünler
        </button>
        <button class="action-btn" onclick="showPricingModal()">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          Fiyat
        </button>
        <button class="action-btn" onclick="showNoteModal()">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Not
        </button>
        <button class="action-btn" onclick="showNewOrderModal(${stop.id})">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          Sipariş
        </button>
      </div>

      <!-- Debt -->
      <div class="section-head"><h3>Borç Durumu</h3></div>
      <div class="debt-card">
        <div class="flex-between">
          <span class="debt-amount ${debt > 0 ? 'text-danger' : 'text-success'}">${formatCurrency(debt)}</span>
        </div>
        <div class="debt-actions">
          <button class="btn btn-outline btn-sm" onclick="showAddDebtModal()">Borç Ekle</button>
          <button class="btn btn-success btn-sm" onclick="showClearDebtModal()" ${debt <= 0 ? 'disabled' : ''}>Borç Tahsil</button>
          <button class="btn btn-sm" style="color:var(--danger);border:1px solid var(--danger)" onclick="removeAllDebt()" ${debt <= 0 ? 'disabled' : ''}>Borç Sil</button>
        </div>
      </div>

      <!-- Quick Reorder -->
      ${(() => {
        const lastDelivered = getStopOrders(stop.id, 'delivered')
          .filter(o => o.items && o.items.length > 0)
          .sort((a,b) => new Date(b.deliveredAt) - new Date(a.deliveredAt))[0];
        return lastDelivered ? `
        <div style="margin:8px 0">
          <button class="btn btn-block" style="background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;gap:8px" onclick="quickReorder(${stop.id},'${lastDelivered.id}')">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            Son Siparişi Tekrarla
          </button>
          <div class="text-muted" style="font-size:11px;text-align:center;margin-top:4px">${lastDelivered.items.map(i => i.qty + 'x ' + escHtml(i.name)).join(', ')} — ${formatCurrency(calcOrderTotal(lastDelivered))}</div>
        </div>` : '';
      })()}

      <!-- Pending Orders -->
      <div class="section-head"><h3>Bekleyen Siparişler (${pending.length})</h3></div>`;

  if (pending.length === 0) {
    html += `<p class="text-muted" style="font-size:13px;padding:8px 0">Bekleyen sipariş yok</p>`;
  } else {
    pending.forEach(o => {
      html += `
        <div class="order-card">
          <div class="order-card-head">
            <div class="order-card-date">${formatDateTime(o.createdAt)}${o.deliveryDate ? ` · Teslimat: ${o.deliveryDate}` : ''}</div>
            <span class="badge badge-warning">bekleyen</span>
          </div>
          <div class="order-card-items">${o.items.map(i => `${i.qty}x ${escHtml(i.name)}`).join(', ')}</div>
          <div class="order-card-footer">
            <span class="order-card-total">${formatCurrency(calcOrderTotal(o))}</span>
            <button class="btn btn-danger btn-sm" onclick="deleteOrder('${o.id}')">Sil</button>
          </div>
        </div>`;
    });
  }

  html += `<div class="section-head"><h3>Sipariş Geçmişi</h3></div>`;
  if (recentDelivered.length === 0) {
    html += `<p class="text-muted" style="font-size:13px;padding:8px 0">Teslimat geçmişi yok</p>`;
  } else {
    recentDelivered.forEach(o => {
      const isVisit = o.payMethod === 'visit';
      const badgeLabel = isVisit ? 'ziyaret' : 'teslim';
      const badgeClass = isVisit ? 'badge-purple' : 'badge-success';
      const payLabel = o.payMethod === 'visit' ? '' : o.payMethod === 'cash' && o.cashPaid !== undefined && o.cashPaid < calcOrderTotal(o) ? `cash (partial ${formatCurrency(o.cashPaid)})` : (o.payMethod || '');
      html += `
        <div class="order-card" style="opacity:0.85">
          <div class="order-card-head">
            <div class="order-card-date">${formatDateTime(o.deliveredAt)}</div>
            <span class="badge ${badgeClass}">${badgeLabel}</span>
          </div>
          ${o.items.length > 0 ? `<div class="order-card-items">${o.items.map(i => `${i.qty}x ${escHtml(i.name)}`).join(', ')}</div>` : (o.note ? `<div class="order-card-items text-muted">${escHtml(o.note)}</div>` : '')}
          ${o.deliveryNote ? `<div class="text-muted" style="font-size:12px;padding:2px 0;font-style:italic">📝 ${escHtml(o.deliveryNote)}</div>` : ''}
          <div class="order-card-footer">
            ${o.items.length > 0 ? `<span class="order-card-total">${formatCurrency(calcOrderTotal(o))}</span>` : '<span></span>'}
            <span class="text-muted" style="font-size:12px">${payLabel}</span>
          </div>
          <div style="display:flex;gap:6px;justify-content:flex-end;margin-top:4px">
            <button class="btn-ghost" style="font-size:11px;color:var(--primary);padding:2px 6px" onclick="showEditDeliveredOrderModal('${o.id}')">Düzenle</button>
            <button class="btn-ghost" style="font-size:11px;color:var(--danger);padding:2px 6px" onclick="deleteOrder('${o.id}')">Sil</button>
          </div>
        </div>`;
    });
  }

  // Debt History (only show add/clear with actual amounts, skip visit-only entries)
  const dhRaw = S.debtHistory[stop.id] || [];
  const dh = dhRaw.map((h, i) => ({...h, _idx: i})).filter(h => h.type !== 'visit' && h.amount > 0);
  if (dh.length > 0) {
    html += `<div class="section-head"><h3>Borç Geçmişi</h3></div>`;
    dh.slice(0, 15).forEach(h => {
      html += `<div class="card" style="padding:10px;margin-bottom:6px">
        <div class="flex-between">
          <span style="font-size:13px;flex:1;min-width:0">${h.note || h.type}</span>
          <span style="font-size:13px;font-weight:600;color:${h.type === 'add' ? 'var(--danger)' : 'var(--success)'};white-space:nowrap;margin-left:8px">
            ${h.type === 'add' ? '+' : '-'}${formatCurrency(Math.abs(h.amount))}
          </span>
        </div>
        <div class="flex-between" style="margin-top:4px">
          <div class="text-muted" style="font-size:11px">${formatDateTime(h.date)}</div>
          <div style="display:flex;gap:6px">
            <button class="btn-ghost" style="font-size:11px;color:var(--primary);padding:2px 6px" onclick="showEditDebtHistoryModal(${stop.id},${h._idx})">Edit</button>
            <button class="btn-ghost" style="font-size:11px;color:var(--danger);padding:2px 6px" onclick="removeDebtHistory(${stop.id},${h._idx})">Remove</button>
          </div>
        </div>
      </div>`;
    });
  }

  html += `</div>`; // page-body
  document.getElementById('page-profile').innerHTML = html;
}

async function deleteOrder(orderId) {
  if (!(await appConfirm('Bu kaydı silmek istediğinize emin misiniz?'))) return;
  const order = S.orders[orderId];
  if (!order) return;

  const stockChange = applyTrackedStockChange(order.items || [], []);
  const debtChanged = reconcileOrderDebtEffect(order, null);
  delete S.orders[orderId];

  if (stockChange.changed) save.catalog();
  if (debtChanged) {
    save.debts();
    save.debtHistory();
    DB.setDebt(order.customerId, S.debts[order.customerId] || 0);
  }
  save.orders();
  DB.deleteOrder(orderId);
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
  const cashValue = roundMoney(Math.min(total, o.cashPaid !== undefined ? o.cashPaid : total));

  let modalHtml = `
    <div class="modal-handle"></div>
    <div class="modal-title">${isVisit ? 'Ziyaret Duzenle' : 'Teslimat Duzenle'}</div>
    <div class="form-group">
      <label class="form-label">Tarih</label>
      <input class="input" type="datetime-local" id="edit-del-date" value="${dateVal}">
    </div>`;

  if (isVisit) {
    modalHtml += `
    <div class="form-group">
      <label class="form-label">Not</label>
      <textarea class="textarea" id="edit-del-note" rows="2">${escHtml(o.note || o.deliveryNote || '')}</textarea>
    </div>`;
  } else {
    modalHtml += `
    <div class="form-group">
      <label class="form-label">Odeme Yontemi</label>
      <select class="input" id="edit-del-pay" onchange="toggleEditDeliveredCash(this.value)">
        <option value="cash" ${o.payMethod==='cash'?'selected':''}>Cash</option>
        <option value="bank" ${o.payMethod==='bank'?'selected':''}>Bank</option>
        <option value="unpaid" ${o.payMethod==='unpaid'?'selected':''}>Not Paid</option>
      </select>
    </div>
    <div class="form-group ${o.payMethod==='cash'?'':'hidden'}" id="edit-del-cash-wrap">
      <label class="form-label">Nakit Alinan Tutar</label>
      <input class="input" type="number" step="0.01" id="edit-del-cash" value="${cashValue.toFixed(2)}"
             data-total="${total}" oninput="updateEditDeliveredCashHint()">
      <div class="text-muted" style="font-size:12px;margin-top:4px" id="edit-del-cash-hint"></div>
    </div>
    <div class="form-group">
      <label class="form-label">Teslimat Notu</label>
      <textarea class="textarea" id="edit-del-note" rows="2">${escHtml(o.deliveryNote || '')}</textarea>
    </div>`;
  }

  modalHtml += `
    <button class="btn btn-primary btn-block mt-2" onclick="saveEditDeliveredOrder('${orderId}')">Kaydet</button>`;
  openModal(modalHtml);
  if (!isVisit) updateEditDeliveredCashHint();
}

function toggleEditDeliveredCash(method) {
  const wrap = document.getElementById('edit-del-cash-wrap');
  if (!wrap) return;
  wrap.classList.toggle('hidden', method !== 'cash');
  if (method === 'cash') updateEditDeliveredCashHint();
}

function updateEditDeliveredCashHint() {
  const input = document.getElementById('edit-del-cash');
  const hint = document.getElementById('edit-del-cash-hint');
  if (!input || !hint) return;
  const total = roundMoney(parseFloat(input.dataset.total) || 0);
  const paid = roundMoney(Math.max(0, parseFloat(input.value) || 0));
  const remaining = roundMoney(Math.max(0, total - paid));
  hint.innerHTML = remaining > 0 ? `<span style="color:var(--danger)">${formatCurrency(remaining)} borca eklenecek</span>` : '';
}

function saveEditDeliveredOrder(orderId) {
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
        o.cashPaid = roundMoney(Math.max(0, Math.min(total, parseFloat(cashInput?.value) || total)));
      } else {
        delete o.cashPaid;
      }
    }
    o.deliveryNote = document.getElementById('edit-del-note')?.value?.trim() || '';
    debtChanged = reconcileOrderDebtEffect(prevOrder, o);
  }
  if (debtChanged) {
    save.debts();
    save.debtHistory();
    DB.setDebt(o.customerId, S.debts[o.customerId] || 0);
  }
  save.orders();
  DB.saveOrder(o);
  closeModal();
  if (curPage === 'profile') renderProfile();
}

function showEditCustomerModal() {
  const stop = getStop(profileStopId);
  if (!stop) return;
  openModal(`
    <div class="modal-handle"></div>
    <div class="modal-title">Müşteri Düzenle</div>
    <div class="form-group">
      <label class="form-label">İsim</label>
      <input class="input" id="edit-cust-name" value="${escHtml(stop.n)}">
    </div>
    <div class="form-group">
      <label class="form-label">Adres</label>
      <input class="input" id="edit-cust-addr" value="${escHtml(stop.a)}">
    </div>
    <div class="form-group">
      <label class="form-label">Şehir / Bölge</label>
      <input class="input" id="edit-cust-city" value="${escHtml(stop.c)}">
    </div>
    <div class="form-group">
      <label class="form-label">Posta Kodu</label>
      <input class="input" id="edit-cust-post" value="${escHtml(stop.p)}">
    </div>
    <div class="form-group">
      <label class="form-label">Ad Soyad (İletişim)</label>
      <input class="input" id="edit-cust-cn" value="${escHtml(stop.cn||'')}">
    </div>
    <div class="form-group">
      <label class="form-label">Cep Telefonu</label>
      <input class="input" id="edit-cust-ph" type="tel" value="${escHtml(stop.ph||'')}">
    </div>
    <div class="form-group">
      <label class="form-label">Email</label>
      <input class="input" id="edit-cust-em" type="email" value="${escHtml(stop.em||'')}">
    </div>
    <button class="btn btn-primary btn-block mb-1" onclick="saveEditCustomer()">Kaydet</button>
    <button class="btn btn-danger btn-block" onclick="deleteCustomer()">Müşteriyi Sil</button>
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
  save.stops();
  if (previousAddressKey !== getStopAddressKey(stop)) {
    await geocodeStop(stop, { force: true });
    if (leafletMap) refreshMapMarkers();
  }
  closeModal();
  renderProfile();
}

async function deleteCustomer() {
  if (!(await appConfirm('Bu müşteriyi silmek istediğinize emin misiniz?<br>Bu işlem geri alınamaz.'))) return;
  STOPS = STOPS.filter(s => s.id !== profileStopId);
  delete S.assign[profileStopId];
  save.stops();
  save.assign();
  closeModal();
  showPage('customers');
}

// ══════════════════════════════════════════════════════════════
// ASSIGN DAY
// ══════════════════════════════════════════════════════════════
function showAssignModal() {
  const stop = getStop(profileStopId);
  if (!stop) return;
  const currentDay = S.assign[stop.id];

  let html = `<div class="modal-handle"></div>
    <div class="modal-title">Gün Ata - ${escHtml(stop.n)}</div>`;

  ['A', 'B'].forEach(week => {
    html += `<div style="font-size:13px;font-weight:600;color:var(--text-sec);margin:12px 0 6px">Hafta ${week}</div>`;
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
    html += `<button class="btn btn-danger btn-block mt-2" onclick="unassignFromDay()">Rotadan Çıkar</button>`;
  }

  openModal(html);
}

function assignToDay(dayId) {
  S.assign[profileStopId] = dayId;
  save.assign();
  closeModal();
  renderProfile();
}

function unassignFromDay() {
  delete S.assign[profileStopId];
  save.assign();
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
      <div class="modal-title">Müşteri Ürünleri</div>
      <p class="text-muted text-center" style="padding:20px">Katalogda ürün yok. Önce Ayarlar'dan ürün ekleyin.</p>
      <button class="btn btn-outline btn-block" onclick="closeModal()">Kapat</button>
    `);
    return;
  }

  let html = `<div class="modal-handle"></div>
    <div class="modal-title">Ürünler - ${escHtml(stop.n)}</div>
    <p class="text-muted mb-2" style="font-size:12px">Bu müşterinin kullandığı ürünleri seçin.</p>`;

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

  html += `<button class="btn btn-primary btn-block mt-2" onclick="saveCustomerProducts()">Kaydet</button>`;
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
      <div class="modal-title">Özel Fiyatlandırma</div>
      <p class="text-muted text-center" style="padding:20px">Katalogda ürün yok. Önce Ayarlar'dan ürün ekleyin.</p>
      <button class="btn btn-outline btn-block" onclick="closeModal()">Kapat</button>
    `);
    return;
  }

  let html = `<div class="modal-handle"></div>
    <div class="modal-title">Özel Fiyat - ${escHtml(stop.n)}</div>
    <p class="text-muted mb-2" style="font-size:12px">Varsayılan katalog fiyatı için boş bırakın.</p>`;

  S.catalog.forEach((c, i) => {
    const val = cp[c.name] !== undefined ? cp[c.name] : '';
    html += `<div class="flex-between mb-1">
      <div><div style="font-weight:500">${escHtml(c.name)}</div><div class="text-muted" style="font-size:12px">Varsayılan: ${formatCurrency(c.price)}</div></div>
      <input class="input" type="number" step="0.01" style="width:90px;text-align:right" id="cp-${i}" value="${val}" placeholder="${c.price}">
    </div>`;
  });

  html += `<button class="btn btn-primary btn-block mt-2" onclick="savePricing()">Fiyatları Kaydet</button>`;
  openModal(html);
}

function savePricing() {
  const cp = {};
  S.catalog.forEach((c, i) => {
    const el = document.getElementById('cp-' + i);
    if (el && el.value !== '') cp[c.name] = parseFloat(el.value) || 0;
  });
  S.customerPricing[profileStopId] = cp;
  save.pricing();
  closeModal();
}

// ══════════════════════════════════════════════════════════════
// NOTE MODAL
// ══════════════════════════════════════════════════════════════
function showNoteModal() {
  const note = S.cnotes[profileStopId] || '';
  openModal(`<div class="modal-handle"></div>
    <div class="modal-title">Müşteri Notu</div>
    <div class="form-group">
      <textarea class="textarea" id="note-text" rows="4">${escHtml(note)}</textarea>
    </div>
    <button class="btn btn-primary btn-block" onclick="saveNote()">Notu Kaydet</button>
  `);
}

function saveNote() {
  const note = document.getElementById('note-text').value.trim();
  if (note) S.cnotes[profileStopId] = note;
  else delete S.cnotes[profileStopId];
  save.cnotes();
  closeModal();
  renderProfile();
}

// ══════════════════════════════════════════════════════════════
// DEBT MANAGEMENT
// ══════════════════════════════════════════════════════════════
function showAddDebtModal() {
  openModal(`<div class="modal-handle"></div>
    <div class="modal-title">Borç Ekle</div>
    <div class="form-group">
      <label class="form-label">Tutar</label>
      <input class="input" type="number" step="0.01" id="debt-amount" placeholder="0.00">
    </div>
    <div class="form-group">
      <label class="form-label">Not (opsiyonel)</label>
      <input class="input" id="debt-note" placeholder="Sebep...">
    </div>
    <button class="btn btn-primary btn-block" onclick="addDebt()">Borç Ekle</button>
  `);
}

function addDebt() {
  const amount = parseFloat(document.getElementById('debt-amount').value) || 0;
  if (amount <= 0) { appAlert('Geçerli bir tutar girin.'); return; }
  const note = document.getElementById('debt-note').value.trim() || 'Manuel giriş';

  S.debts[profileStopId] = (S.debts[profileStopId] || 0) + amount;
  if (!S.debtHistory[profileStopId]) S.debtHistory[profileStopId] = [];
  S.debtHistory[profileStopId].unshift({
    date: new Date().toISOString(), amount: amount, type: 'add', note: note
  });
  save.debts();
  save.debtHistory();
  DB.setDebt(profileStopId, S.debts[profileStopId]);
  closeModal();
  renderProfile();
}

function showClearDebtModal() {
  const debt = S.debts[profileStopId] || 0;
  openModal(`<div class="modal-handle"></div>
    <div class="modal-title">Borç Tahsil Et</div>
    <p class="mb-2">Mevcut borç: <b>${formatCurrency(debt)}</b></p>
    <div class="form-group">
      <label class="form-label">Tahsil edilecek tutar</label>
      <input class="input" type="number" step="0.01" id="clear-amount" value="${debt.toFixed(2)}">
    </div>
    <div class="form-group">
      <label class="form-label">Ödeme Yöntemi</label>
      <div class="pay-options">
        <div class="pay-opt selected" onclick="selectClearMethod('cash',this)" id="clear-cash">Nakit</div>
        <div class="pay-opt" onclick="selectClearMethod('bank',this)" id="clear-bank">Banka</div>
      </div>
    </div>
    <button class="btn btn-success btn-block" onclick="clearDebt()">Borç Tahsil Et</button>
  `);
}

let clearDebtMethod = 'cash';
function selectClearMethod(method, el) {
  clearDebtMethod = method;
  document.querySelectorAll('.pay-opt').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
}

function clearDebt() {
  const debt = S.debts[profileStopId] || 0;
  const requested = parseFloat(document.getElementById('clear-amount').value) || 0;
  const amount = roundMoney(Math.min(debt, Math.max(0, requested)));
  if (amount <= 0) return;
  S.debts[profileStopId] = Math.max(0, roundMoney(debt - amount));
  createDebtHistoryEntry(profileStopId, {
    date: new Date().toISOString(), amount: amount, type: 'clear',
    note: 'Payment received (' + clearDebtMethod + ')'
  });
  save.debts();
  save.debtHistory();
  DB.setDebt(profileStopId, S.debts[profileStopId]);
  closeModal();
  renderProfile();
}

async function removeAllDebt() {
  const debt = S.debts[profileStopId] || 0;
  if (debt <= 0) return;
  if (!(await appConfirm(formatCurrency(debt) + ' tutarındaki tüm borcu silmek istediğinize emin misiniz?<br>Bu işlem ödeme kaydı oluşturmaz.'))) return;
  S.debts[profileStopId] = 0;
  save.debts();
  DB.setDebt(profileStopId, 0);
  renderProfile();
}

function showEditDebtHistoryModal(stopId, idx) {
  const dh = S.debtHistory[stopId];
  if (!dh || !dh[idx]) return;
  const h = dh[idx];
  openModal(`
    <div class="modal-handle"></div>
    <div class="modal-title">Borç Kaydını Düzenle</div>
    <div class="form-group">
      <label class="form-label">Tutar</label>
      <input class="input" type="number" step="0.01" id="edit-dh-amount" value="${h.amount}">
    </div>
    <div class="form-group">
      <label class="form-label">Note</label>
      <input class="input" id="edit-dh-note" value="${escHtml(h.note || '')}">
    </div>
    <button class="btn btn-primary btn-block" onclick="saveEditDebtHistory(${stopId},${idx})">Kaydet</button>
  `);
}

function saveEditDebtHistory(stopId, idx) {
  const dh = S.debtHistory[stopId];
  if (!dh || !dh[idx]) return;
  const oldAmount = dh[idx].amount;
  const oldType = dh[idx].type;
  const newAmount = parseFloat(document.getElementById('edit-dh-amount').value) || 0;
  dh[idx].amount = newAmount;
  dh[idx].note = document.getElementById('edit-dh-note').value.trim();
  // Adjust debt balance
  if (oldType === 'add') {
    S.debts[stopId] = (S.debts[stopId] || 0) - oldAmount + newAmount;
  } else {
    S.debts[stopId] = (S.debts[stopId] || 0) + oldAmount - newAmount;
  }
  S.debts[stopId] = Math.max(0, S.debts[stopId]);
  save.debts();
  save.debtHistory();
  DB.setDebt(stopId, S.debts[stopId]);
  closeModal();
  renderProfile();
}

async function removeDebtHistory(stopId, idx) {
  if (!(await appConfirm('Bu borç kaydını silmek istediğinize emin misiniz?'))) return;
  const dh = S.debtHistory[stopId];
  if (!dh || !dh[idx]) return;
  const h = dh[idx];
  // Reverse the debt effect
  if (h.type === 'add') {
    S.debts[stopId] = Math.max(0, (S.debts[stopId] || 0) - h.amount);
  } else {
    S.debts[stopId] = (S.debts[stopId] || 0) + h.amount;
  }
  dh.splice(idx, 1);
  save.debts();
  save.debtHistory();
  DB.setDebt(stopId, S.debts[stopId]);
  renderProfile();
}

// ══════════════════════════════════════════════════════════════
