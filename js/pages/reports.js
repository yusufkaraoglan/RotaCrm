'use strict';
// REPORTS PAGE
// ══════════════════════════════════════════════════════════════
function renderReports() {
  const body = document.querySelector('#page-reports .page-body');
  const scrollPos = body ? body.scrollTop : 0;
  const data = calcReportData();

  let html = `
    <header class="topbar">
      <h1>Reports</h1>
    </header>
    <div class="report-tabs-bar">
      <button class="report-tab-btn ${reportTab==='overview'?'active':''}" onclick="reportTab='overview';renderReports()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="12" width="4" height="9" rx="1"/><rect x="10" y="5" width="4" height="16" rx="1"/><rect x="17" y="8" width="4" height="13" rx="1"/></svg>
        Overview
      </button>
      <button class="report-tab-btn ${reportTab==='products'?'active':''}" onclick="reportTab='products';renderReports()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
        Products
      </button>
      <button class="report-tab-btn ${reportTab==='customers'?'active':''}" onclick="reportTab='customers';renderReports()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
        Customers
      </button>
      <button class="report-tab-btn ${reportTab==='debts'?'active':''}" onclick="reportTab='debts';renderReports()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        Debts
      </button>
      <button class="report-tab-btn ${reportTab==='export'?'active':''}" onclick="reportTab='export';renderReports()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Export
      </button>
      <button class="report-tab-btn ${reportTab==='history'?'active':''}" onclick="reportTab='history';renderReports()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        History
      </button>
    </div>
    <div class="page-body">
      <div class="date-range-bar">
        <button class="date-btn ${S.reportRange==='today'?'active':''}" onclick="setReportRange('today')">Today</button>
        <button class="date-btn ${S.reportRange==='week'?'active':''}" onclick="setReportRange('week')">This Week</button>
        <button class="date-btn ${S.reportRange==='month'?'active':''}" onclick="setReportRange('month')">This Month</button>
        <button class="date-btn ${S.reportRange==='custom'?'active':''}" onclick="setReportRange('custom')">Custom</button>
      </div>
      ${S.reportRange === 'custom' ? `
        <div class="custom-dates">
          <input type="date" value="${S.reportStart}" onchange="S.reportStart=this.value;renderReports()">
          <input type="date" value="${S.reportEnd}" onchange="S.reportEnd=this.value;renderReports()">
        </div>
      ` : ''}`;

  if (reportTab === 'overview') {
    html += renderOverviewTab(data);
  } else if (reportTab === 'products') {
    html += renderProductsTab(data);
  } else if (reportTab === 'customers') {
    html += renderCustomersTab(data);
  } else if (reportTab === 'debts') {
    html += renderDebtsTab();
  } else if (reportTab === 'export') {
    html += renderExportTab();
  } else if (reportTab === 'history') {
    html += renderDeliveryHistoryContent();
  }

  html += `</div>`;
  document.getElementById('page-reports').innerHTML = html;

  const newBody = document.querySelector('#page-reports .page-body');
  if (newBody) newBody.scrollTop = scrollPos;

  // Focus search input if dropdown is open
  if (productFilterOpen) {
    const searchInput = document.querySelector('.pf-search');
    if (searchInput) { searchInput.focus(); searchInput.selectionStart = searchInput.selectionEnd = searchInput.value.length; }
  }

  // Click-outside listener
  document.removeEventListener('click', closeProductFilterOnOutsideClick);
  if (productFilterOpen) {
    setTimeout(() => document.addEventListener('click', closeProductFilterOnOutsideClick), 0);
  }

  if (reportTab === 'overview') {
    renderOverviewCharts(data);
  }
}

function renderOverviewTab(data) {
  const hasProductFilter = S.reportProducts.length > 0;
  const productRevenue = hasProductFilter
    ? Object.entries(data.products).reduce((s, [_, d]) => s + d.revenue, 0)
    : data.totalRevenue;

  return `
    ${renderProductFilterDropdown('Filter by Product')}

    <div class="report-hero-card">
      <div class="report-hero-label">${hasProductFilter ? 'Filtered Revenue' : 'Total Revenue'}</div>
      <div class="report-hero-value">${formatCurrency(hasProductFilter ? productRevenue : data.totalRevenue)}</div>
      <div class="report-hero-sub">${data.deliveryCount} deliveries &middot; ${data.visitCount} visits</div>
      ${hasProductFilter ? `<div class="report-hero-sub" style="font-size:11px;margin-top:4px">${S.reportProducts.map(p => escHtml(p)).join(', ')}</div>` : ''}
    </div>

    <div class="metric-grid">
      <div class="metric-card">
        <div class="metric-icon" style="background:var(--success-light);color:var(--success)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
        </div>
        <div class="metric-value">${data.deliveryCount}</div>
        <div class="metric-label">Deliveries</div>
      </div>
      <div class="metric-card">
        <div class="metric-icon" style="background:var(--purple-light);color:var(--purple)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
        <div class="metric-value" style="color:var(--purple)">${data.visitCount}</div>
        <div class="metric-label">Visits</div>
      </div>
      <div class="metric-card">
        <div class="metric-icon" style="background:var(--info-light);color:var(--info)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
        </div>
        <div class="metric-value">${formatCurrency(data.avgOrder)}</div>
        <div class="metric-label">Avg. Order</div>
      </div>
      <div class="metric-card">
        <div class="metric-icon" style="background:var(--danger-light);color:var(--danger)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
        <div class="metric-value text-danger">${formatCurrency(data.totalDebt)}</div>
        <div class="metric-label">Total Debt</div>
      </div>
    </div>

    <div class="report-section">
      <h3>Daily Revenue</h3>
      <div class="card chart-card"><canvas id="revenueChart"></canvas></div>
    </div>

    <div class="report-section">
      <h3>Payment Breakdown</h3>
      <div class="card" style="padding:16px;display:flex;gap:16px;align-items:center;flex-wrap:wrap">
        <div style="width:120px;height:120px;flex-shrink:0"><canvas id="paymentChart"></canvas></div>
        <div style="flex:1;min-width:140px">
          <div class="pay-breakdown-row">
            <div class="pay-breakdown-label">
              <span class="pay-dot" style="background:var(--success)"></span>Cash
            </div>
            <span class="pay-breakdown-amount" style="color:var(--success)">${formatCurrency(data.payments.cash)}</span>
          </div>
          <div class="pay-breakdown-row">
            <div class="pay-breakdown-label">
              <span class="pay-dot" style="background:var(--info)"></span>Bank
            </div>
            <span class="pay-breakdown-amount" style="color:var(--info)">${formatCurrency(data.payments.bank)}</span>
          </div>
          <div class="pay-breakdown-row">
            <div class="pay-breakdown-label">
              <span class="pay-dot" style="background:var(--danger)"></span>Unpaid
            </div>
            <span class="pay-breakdown-amount" style="color:var(--danger)">${formatCurrency(data.payments.unpaid)}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="report-section">
      <h3>Top Products</h3>
      <div class="card chart-card"><canvas id="productsChart"></canvas></div>
    </div>`;
}

function renderProductsTab(data) {
  let html = '';
  html += renderProductFilterDropdown('');

  const products = Object.entries(data.products).sort((a, b) => b[1].revenue - a[1].revenue);
  if (products.length === 0) {
    html += '<div class="empty-state" style="padding:30px"><p>No product data for this period</p></div>';
  } else {
    html += `<div class="report-section">`;
    products.forEach(([name, d]) => {
      html += `
        <div class="report-row-card">
          <div class="report-row-info">
            <div class="report-row-name">${escHtml(name)}</div>
            <div class="report-row-sub">${d.qty} sold</div>
          </div>
          <div class="report-row-value">${formatCurrency(d.revenue)}</div>
        </div>`;
    });
    html += `</div>`;
  }
  return html;
}

function renderCustomersTab(data) {
  const customers = Object.entries(data.customers).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 30);
  if (customers.length === 0) {
    return '<div class="empty-state" style="padding:30px"><p>No customer data for this period</p></div>';
  }
  let html = '<div class="report-section">';
  customers.forEach(([id, d], idx) => {
    const s = getStop(parseInt(id));
    html += `
      <div class="report-row-card" onclick="showProfile(${id})" style="cursor:pointer">
        <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0">
          <span class="report-rank">${idx + 1}</span>
          <div class="report-row-info">
            <div class="report-row-name">${s ? escHtml(s.n) : 'Unknown'}</div>
            <div class="report-row-sub">${d.orders} orders</div>
          </div>
        </div>
        <div class="report-row-value">${formatCurrency(d.revenue)}</div>
      </div>`;
  });
  html += '</div>';
  return html;
}

function renderDebtsTab() {
  const debtors = Object.entries(S.debts).filter(([_, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const totalDebt = debtors.reduce((s, [_, v]) => s + v, 0);

  let html = `
    <div class="report-hero-card" style="background:linear-gradient(135deg, #FEF3F2, #FFF0EC)">
      <div class="report-hero-label" style="color:var(--danger)">Total Outstanding</div>
      <div class="report-hero-value" style="color:var(--danger)">${formatCurrency(totalDebt)}</div>
      <div class="report-hero-sub">${debtors.length} customer${debtors.length !== 1 ? 's' : ''} with debt</div>
    </div>`;

  if (debtors.length === 0) {
    html += '<div class="empty-state" style="padding:20px"><p>No customers with debt</p></div>';
  } else {
    html += '<div class="report-section">';
    debtors.forEach(([id, amount]) => {
      const s = getStop(parseInt(id));
      html += `
        <div class="report-row-card" onclick="showProfile(${id})" style="cursor:pointer">
          <div class="report-row-info">
            <div class="report-row-name">${s ? escHtml(s.n) : 'Unknown'}</div>
          </div>
          <div class="report-row-value text-danger">${formatCurrency(amount)}</div>
        </div>`;
    });
    html += '</div>';
  }
  return html;
}

function renderExportTab() {
  let html = '';
  html += renderProductFilterDropdown('Select Products');

  if (S.reportProducts.length === 0) {
    html += '<div class="card" style="text-align:center;padding:30px"><p class="text-muted">Select products above to generate report</p></div>';
    return html;
  }

  const report = calcProductSalesReport();
  if (report.rows.length === 0) {
    html += '<div class="card" style="text-align:center;padding:30px"><p class="text-muted">No matching orders for this period</p></div>';
    return html;
  }

  html += '<div class="report-section">';
  report.rows.forEach(r => {
    let payHtml = '';
    r.payDisplay.parts.forEach(p => {
      const c = p.type === 'cash' ? 'var(--success)' : p.type === 'bank' ? 'var(--info)' : 'var(--danger)';
      payHtml += `<span style="font-weight:700;color:${c};font-size:13px">${p.text}</span> `;
    });
    if (r.payDisplay.unpaidAmount > 0 && r.payDisplay.type !== 'unpaid') {
      payHtml += `<span style="font-weight:600;color:var(--danger);font-size:11px">(${formatCurrency(r.payDisplay.unpaidAmount)} left)</span>`;
    }
    html += `
      <div class="report-row-card" style="${r.isDebtPayment ? 'border-left:3px solid var(--success);background:var(--success-light)' : ''}">
        <div style="flex:1;min-width:0">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
            <span style="font-weight:600;font-size:14px">${escHtml(r.name)}</span>
            <span style="font-size:11px;color:var(--text-muted);flex-shrink:0;margin-left:8px">${r.dateTime || ''}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div>${payHtml}</div>
            <div style="font-size:12px;color:${r.isDebtPayment ? 'var(--success)' : 'var(--text-sec)'};text-align:right;flex-shrink:0;margin-left:8px">${r.isDebtPayment ? '<em>'+r.productsSummary+'</em>' : r.productsSummary}</div>
          </div>
        </div>
      </div>`;
  });
  html += `</div>

  <div class="card" style="margin-bottom:12px">
    <div style="font-size:13px;font-weight:700;margin-bottom:8px">TOTAL (${report.rows.length} orders)</div>
    <div style="display:flex;flex-wrap:wrap;gap:12px;font-size:14px;font-weight:600">
      <span style="color:var(--success)">Cash ${formatCurrency(report.totalCash)}</span>
      <span style="color:var(--info)">Bank ${formatCurrency(report.totalBank)}</span>
      <span style="color:var(--danger)">Unpaid ${formatCurrency(report.totalUnpaid)}</span>
    </div>
  </div>
  <div style="display:flex;gap:8px">
    <button class="btn btn-primary" style="flex:1" onclick="exportProductReportPDF()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      PDF
    </button>
    <button class="btn btn-outline" style="flex:1" onclick="exportProductReportExcel()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 7h8M8 12h8M8 17h4"/></svg>
      Excel
    </button>
  </div>`;
  return html;
}

function setReportRange(range) {
  S.reportRange = range;
  const today = new Date();
  if (range === 'today') {
    S.reportStart = todayStr();
    S.reportEnd = todayStr();
  } else if (range === 'week') {
    const jsDay = today.getDay();
    const mondayOff = jsDay === 0 ? -6 : 1 - jsDay;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOff);
    S.reportStart = monday.toISOString().slice(0, 10);
    S.reportEnd = todayStr();
  } else if (range === 'month') {
    S.reportStart = today.toISOString().slice(0, 8) + '01';
    S.reportEnd = todayStr();
  } else if (range === 'custom') {
    if (!S.reportStart) S.reportStart = todayStr();
    if (!S.reportEnd) S.reportEnd = todayStr();
  }
  renderReports();
}

function toggleReportProduct(name) {
  const idx = S.reportProducts.indexOf(name);
  if (idx >= 0) S.reportProducts.splice(idx, 1);
  else S.reportProducts.push(name);
  renderReports();
}

let productFilterOpen = false;
let productFilterSearch = '';

function renderProductFilterDropdown(label) {
  if (S.catalog.length === 0) return '';
  const selected = S.reportProducts;
  const selectedChips = selected.length > 0
    ? selected.map(n => `<span class="pf-chip">${escHtml(n)}<span class="pf-chip-x" data-product="${escHtml(n)}" onclick="event.stopPropagation();toggleReportProduct(this.dataset.product)">&times;</span></span>`).join('')
    : '';

  return `
    <div class="pf-container" style="margin-bottom:12px">
      ${label ? `<div style="font-size:12px;font-weight:600;color:var(--text-sec);margin-bottom:6px">${label}</div>` : ''}
      <div class="pf-trigger" onclick="toggleProductFilter()">
        <span class="pf-trigger-text">${selected.length === 0 ? 'All Products' : selected.length + ' product' + (selected.length > 1 ? 's' : '') + ' selected'}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;transition:transform .2s;${productFilterOpen ? 'transform:rotate(180deg)' : ''}"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      ${selectedChips ? `<div class="pf-chips">${selectedChips}</div>` : ''}
      ${productFilterOpen ? `
      <div class="pf-dropdown">
        <input class="pf-search" type="text" placeholder="Search products..." value="${escHtml(productFilterSearch)}" oninput="productFilterSearch=this.value;renderReports()" autofocus>
        <div class="pf-actions">
          <button class="pf-action-btn" onclick="S.reportProducts=S.catalog.map(c=>c.name);renderReports()">Select All</button>
          <button class="pf-action-btn" onclick="S.reportProducts=[];renderReports()">Clear All</button>
        </div>
        <div class="pf-list">
          ${S.catalog.filter(c => !productFilterSearch || c.name.toLowerCase().includes(productFilterSearch.toLowerCase())).map(c => {
            const checked = selected.includes(c.name);
            return `<label class="pf-item${checked ? ' checked' : ''}" data-product="${escHtml(c.name)}" onclick="event.preventDefault();toggleReportProduct(this.dataset.product)">
              <span class="pf-checkbox${checked ? ' checked' : ''}">${checked ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : ''}</span>
              <span class="pf-item-name">${escHtml(c.name)}</span>
            </label>`;
          }).join('')}
        </div>
      </div>` : ''}
    </div>`;
}

function toggleProductFilter() {
  productFilterOpen = !productFilterOpen;
  if (!productFilterOpen) productFilterSearch = '';
  renderReports();
}

function closeProductFilterOnOutsideClick(e) {
  if (productFilterOpen && !e.target.closest('.pf-container')) {
    productFilterOpen = false;
    productFilterSearch = '';
    renderReports();
  }
}

function calcReportData() {
  const orders = Object.values(S.orders);

  let filtered = orders.filter(o => {
    if (o.status !== 'delivered' || !o.deliveredAt) return false;
    const d = o.deliveredAt.slice(0, 10);
    if (S.reportStart && d < S.reportStart) return false;
    if (S.reportEnd && d > S.reportEnd) return false;
    return true;
  });

  if (S.reportProducts.length > 0) {
    filtered = filtered.filter(o =>
      (o.items || []).some(item => S.reportProducts.includes(item.name))
    );
  }

  const totalRevenue = filtered.filter(o => o.payMethod !== 'visit').reduce((s, o) => s + calcOrderTotal(o), 0);
  const deliveryCount = filtered.filter(o => o.payMethod !== 'visit').length;
  const visitCount = filtered.filter(o => o.payMethod === 'visit').length;
  const avgOrder = deliveryCount > 0 ? totalRevenue / deliveryCount : 0;
  const totalDebt = Object.values(S.debts).reduce((s, d) => s + (d || 0), 0);

  const products = {};
  filtered.forEach(o => {
    (o.items || []).forEach(item => {
      if (S.reportProducts.length > 0 && !S.reportProducts.includes(item.name)) return;
      if (!products[item.name]) products[item.name] = { qty: 0, revenue: 0 };
      products[item.name].qty += item.qty;
      products[item.name].revenue += item.qty * item.price;
    });
  });

  const payments = { cash: 0, bank: 0, unpaid: 0 };
  filtered.forEach(o => {
    const total = calcOrderTotal(o);
    if (o.payMethod === 'cash') {
      const paid = (o.cashPaid !== undefined) ? o.cashPaid : total;
      payments.cash += Math.min(paid, total);
      payments.unpaid += Math.max(0, total - paid);
    } else if (o.payMethod === 'bank') {
      payments.bank += total;
    } else if (o.payMethod !== 'visit') {
      payments.unpaid += total;
    }
  });

  const customers = {};
  filtered.forEach(o => {
    const id = o.customerId;
    if (!customers[id]) customers[id] = { orders: 0, revenue: 0 };
    customers[id].orders++;
    customers[id].revenue += calcOrderTotal(o);
  });

  // Daily revenue for chart
  const dailyRevenue = {};
  filtered.filter(o => o.payMethod !== 'visit').forEach(o => {
    const day = o.deliveredAt.slice(0, 10);
    dailyRevenue[day] = (dailyRevenue[day] || 0) + calcOrderTotal(o);
  });

  return { totalRevenue, deliveryCount, visitCount, avgOrder, totalDebt, products, payments, customers, dailyRevenue };
}

function calcProductSalesReport() {
  const orders = Object.values(S.orders);
  let filtered = orders.filter(o => {
    if (o.status !== 'delivered' || !o.deliveredAt) return false;
    if (o.payMethod === 'visit' && (!o.items || o.items.length === 0)) return false;
    const d = o.deliveredAt.slice(0, 10);
    if (S.reportStart && d < S.reportStart) return false;
    if (S.reportEnd && d > S.reportEnd) return false;
    return (o.items || []).some(item => S.reportProducts.includes(item.name));
  });

  filtered.sort((a, b) => (a.deliveredAt || '').localeCompare(b.deliveredAt || ''));

  const rows = [];
  let totalCash = 0, totalBank = 0, totalUnpaid = 0, grandTotal = 0;

  filtered.forEach(o => {
    const stop = getStop(o.customerId);
    if (!stop) return;

    const total = calcOrderTotal(o);
    const prodMap = {};
    (o.items || []).forEach(item => {
      if (S.reportProducts.includes(item.name)) {
        prodMap[item.name] = (prodMap[item.name] || 0) + item.qty;
      }
    });

    let cashPaid = 0, bankPaid = 0, unpaidTotal = 0;
    if (o.payMethod === 'cash') {
      const paid = (o.cashPaid !== undefined) ? o.cashPaid : total;
      cashPaid = Math.min(paid, total);
      unpaidTotal = Math.max(0, total - paid);
    } else if (o.payMethod === 'bank') {
      bankPaid = total;
    } else {
      unpaidTotal = total;
    }

    const payDisplay = (() => {
      const parts = [];
      let primaryType = 'unpaid';
      if (cashPaid > 0) { parts.push({ text: formatCurrency(cashPaid), type: 'cash' }); primaryType = 'cash'; }
      if (bankPaid > 0) { parts.push({ text: formatCurrency(bankPaid), type: 'bank' }); if (primaryType === 'unpaid') primaryType = 'bank'; }
      if (unpaidTotal > 0) { parts.push({ text: 'Not Paid', type: 'unpaid' }); }
      if (parts.length === 0) parts.push({ text: 'Not Paid', type: 'unpaid' });
      return { parts, type: primaryType, unpaidAmount: unpaidTotal };
    })();

    totalCash += cashPaid;
    totalBank += bankPaid;
    totalUnpaid += unpaidTotal;
    grandTotal += total;

    rows.push({
      name: stop.n,
      rawDate: o.deliveredAt || '',
      dateTime: formatDateTime(o.deliveredAt),
      dateOnly: formatDate(o.deliveredAt),
      payDisplay,
      productsSummary: Object.entries(prodMap).map(([n, q]) => `${q} ${n}`).join(', '),
      total
    });
  });

  // Add debt payment rows
  Object.entries(S.debtHistory).forEach(([cid, history]) => {
    if (!history) return;
    const stop = getStop(parseInt(cid));
    if (!stop) return;
    history.forEach(entry => {
      if (entry.type !== 'clear') return;
      const d = entry.date ? entry.date.slice(0, 10) : '';
      if (S.reportStart && d < S.reportStart) return;
      if (S.reportEnd && d > S.reportEnd) return;
      const payMethod = entry.note?.includes('bank') ? 'bank' : entry.note?.includes('cash') ? 'cash' : 'bank';
      const parts = [{ text: formatCurrency(entry.amount), type: payMethod }];
      if (payMethod === 'cash') totalCash += entry.amount;
      else totalBank += entry.amount;
      rows.push({
        name: stop.n,
        rawDate: entry.date || '',
        dateTime: formatDateTime(entry.date),
        dateOnly: formatDate(entry.date),
        payDisplay: { parts, type: payMethod, unpaidAmount: 0 },
        productsSummary: 'Outstanding payment received',
        total: entry.amount,
        isDebtPayment: true
      });
    });
  });

  rows.sort((a, b) => (a.rawDate || '').localeCompare(b.rawDate || ''));
  return { rows, totalCash, totalBank, totalUnpaid, grandTotal };
}

function getReportDateLabel() {
  return `${S.reportStart} to ${S.reportEnd}`;
}

function exportProductReportPDF() {
  const report = calcProductSalesReport();
  if (report.rows.length === 0) { appAlert('No data to export.'); return; }

  const dateLabel = getReportDateLabel();
  const exportDate = new Date().toLocaleString('en-GB');
  const productsLabel = S.reportProducts.join(', ');

  let tableRows = '';
  report.rows.forEach(r => {
    let payCell = '';
    r.payDisplay.parts.forEach(p => {
      const c = p.type === 'cash' ? '#12B76A' : p.type === 'bank' ? '#2E90FA' : '#F04438';
      if (p.type === 'bank') {
        payCell += `<div style="color:${c};font-weight:600">Bank</div><div style="color:${c};font-size:10px">(${p.text})</div>`;
      } else {
        payCell += `<div style="color:${c};font-weight:600">${p.text}</div>`;
      }
    });
    if (r.payDisplay.unpaidAmount > 0 && r.payDisplay.type !== 'unpaid') {
      payCell += `<div style="color:#F04438;font-size:10px;font-weight:600">left: ${formatCurrency(r.payDisplay.unpaidAmount)}</div>`;
    }
    tableRows += `<tr${r.isDebtPayment ? ' style="background:#f0fdf4"' : ''}>
      <td>${escHtml(r.name)}</td>
      <td style="font-size:11px;color:#666;white-space:nowrap">${r.dateOnly || ''}</td>
      <td>${payCell}</td>
      <td>${r.isDebtPayment ? '<em style="color:#12B76A">'+r.productsSummary+'</em>' : r.productsSummary}</td>
    </tr>`;
  });

  const html = `<!DOCTYPE html><html><head>
    <meta charset="UTF-8">
    <title>Product Sales Report - ${exportDate}</title>
    <style>
      body{font-family:'Inter',Arial,sans-serif;font-size:12px;color:#111;padding:20px;max-width:800px;margin:0 auto}
      h1{font-size:18px;margin-bottom:4px}
      .meta{color:#666;font-size:11px;margin-bottom:16px}
      table{width:100%;border-collapse:collapse;margin-bottom:16px}
      th{text-align:left;padding:8px;background:#f5f5f7;border-bottom:2px solid #ddd;font-size:11px;color:#666}
      td{padding:8px;border-bottom:1px solid #eee}
      .total-row{background:#f5f5f7;font-weight:700}
      .total-row td{border-top:2px solid #ddd}
      @media print{body{padding:10px}.no-print{display:none!important}}
    </style>
  </head><body>
    <h1>Costadoro Delivery - Product Sales Report</h1>
    <div class="meta">
      Period: ${dateLabel}<br>
      Products: ${escHtml(productsLabel)}<br>
      Generated: ${exportDate}
    </div>
    <table>
      <thead><tr><th>Customer</th><th>Date</th><th>Payment</th><th>Products</th></tr></thead>
      <tbody>
        ${tableRows}
        <tr class="total-row">
          <td>TOTAL (${report.rows.length})</td>
          <td></td>
          <td style="font-size:10px">
            <span style="color:#12B76A">Cash ${formatCurrency(report.totalCash)}</span> |
            <span style="color:#2E90FA">Bank ${formatCurrency(report.totalBank)}</span> |
            <span style="color:#F04438">Unpaid ${formatCurrency(report.totalUnpaid)}</span>
          </td>
          <td></td>
        </tr>
      </tbody>
    </table>
    <button class="no-print" onclick="window.print()" style="padding:10px 24px;background:#E85D3A;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer">
      Save as PDF
    </button>
  </body></html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function exportProductReportExcel() {
  const report = calcProductSalesReport();
  if (report.rows.length === 0) { appAlert('No data to export.'); return; }

  const data = [['Customer', 'Date', 'Total', 'Cash', 'Bank', 'Unpaid', 'Products']];
  report.rows.forEach(r => {
    const cashAmt = r.payDisplay.parts.filter(p => p.method === 'cash').reduce((s, p) => s + p.amount, 0);
    const bankAmt = r.payDisplay.parts.filter(p => p.method === 'bank').reduce((s, p) => s + p.amount, 0);
    const unpaidAmt = r.payDisplay.unpaidAmount || 0;
    const totalAmt = cashAmt + bankAmt + unpaidAmt;
    data.push([r.name, r.dateTime || '', totalAmt, cashAmt || '', bankAmt || '', unpaidAmt || '', r.isDebtPayment ? 'Outstanding payment received' : r.productsSummary]);
  });
  data.push([]);
  data.push(['TOTAL', '', report.totalCash + report.totalBank + report.totalUnpaid, report.totalCash, report.totalBank, report.totalUnpaid]);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Product Report');
  XLSX.writeFile(wb, 'product_report_' + todayStr() + '.xlsx');
}

// ══════════════════════════════════════════════════════════════
// DELIVERY HISTORY
// ══════════════════════════════════════════════════════════════
function renderDeliveryHistoryContent() {
  let delivered = Object.values(S.orders).filter(o => o.status === 'delivered' && o.deliveredAt);
  // Apply date range filter if set
  if (S.reportStart) delivered = delivered.filter(o => (o.deliveredAt || '').slice(0, 10) >= S.reportStart);
  if (S.reportEnd) delivered = delivered.filter(o => (o.deliveredAt || '').slice(0, 10) <= S.reportEnd);
  const weeks = {};
  delivered.forEach(o => {
    const monday = getWeekMondayStr(o.deliveredAt);
    if (!weeks[monday]) weeks[monday] = [];
    weeks[monday].push(o);
  });

  const sortedWeeks = Object.keys(weeks).sort((a, b) => b.localeCompare(a));
  const ref = new Date(2026, 2, 2); // Week A/B reference: 2 March 2026 = Monday of Week A
  function weekLabel(mondayStr) {
    const mon = new Date(mondayStr);
    const diffDays = Math.floor((mon - ref) / 86400000);
    const weekNum = Math.floor(diffDays / 7);
    return (weekNum % 2 === 0) ? 'A' : 'B';
  }

  const thisMonday = getWeekMondayStr(new Date());

  let html = `
    <div style="margin-bottom:12px">
      <input class="input" type="search" placeholder="Search customer..." value="${escHtml(dhSearchTerm)}" oninput="dhSearchTerm=this.value;reportTab='history';renderReports()">
    </div>`;

  if (sortedWeeks.length === 0) {
    html += `<div class="empty-state"><p>No delivery history yet</p></div>`;
  } else {
    sortedWeeks.forEach(monday => {
      const orders = weeks[monday];
      const wLabel = weekLabel(monday);
      const isCurrent = monday === thisMonday;
      const monDate = new Date(monday);
      const endDate = new Date(monDate);
      endDate.setDate(endDate.getDate() + 4);
      const dateRange = monDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' - ' + endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

      let filtered = orders;
      if (dhSearchTerm) {
        const term = dhSearchTerm.toLowerCase();
        filtered = orders.filter(o => {
          const stop = getStop(o.customerId);
          return stop && stop.n.toLowerCase().includes(term);
        });
        if (filtered.length === 0) return;
      }

      filtered.sort((a, b) => (b.deliveredAt || '').localeCompare(a.deliveredAt || ''));

      const byCustomer = {};
      filtered.forEach(o => {
        if (!byCustomer[o.customerId]) byCustomer[o.customerId] = [];
        byCustomer[o.customerId].push(o);
      });

      const totalRev = filtered.filter(o => o.payMethod !== 'visit').reduce((s, o) => s + calcOrderTotal(o), 0);
      const cashTotal = filtered.filter(o => o.payMethod === 'cash').reduce((s, o) => {
        const total = calcOrderTotal(o);
        const paid = (o.cashPaid !== undefined) ? Math.min(o.cashPaid, total) : total;
        return s + paid;
      }, 0);
      const bankTotal = filtered.filter(o => o.payMethod === 'bank').reduce((s, o) => s + calcOrderTotal(o), 0);
      const visitCount = filtered.filter(o => o.payMethod === 'visit').length;
      const deliveryCount = filtered.filter(o => o.payMethod !== 'visit').length;

      html += `
        <div class="card" style="margin-bottom:12px;overflow:hidden;padding:0">
          <div style="padding:12px 14px;background:${isCurrent ? 'var(--primary)' : 'var(--bg)'};color:${isCurrent ? '#fff' : 'var(--text)'}">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div>
                <b>Week ${wLabel}</b>${isCurrent ? ' (This Week)' : ''}
                <div style="font-size:12px;opacity:0.8">${dateRange}</div>
              </div>
              <div style="text-align:right;font-size:12px">
                <div>${deliveryCount} deliveries &middot; ${visitCount} visits</div>
                ${totalRev > 0 ? `<div style="font-weight:700">${formatCurrency(totalRev)}</div>` : ''}
              </div>
            </div>
            ${totalRev > 0 ? `<div style="display:flex;gap:12px;margin-top:6px;font-size:11px;opacity:0.85">
              <span>Cash: ${formatCurrency(cashTotal)}</span>
              <span>Bank: ${formatCurrency(bankTotal)}</span>
            </div>` : ''}
          </div>
          <div style="padding:4px 12px">`;

      Object.entries(byCustomer).forEach(([cid, cOrders]) => {
        const stop = getStop(cid);
        if (!stop) return;
        const custTotal = cOrders.filter(o => o.payMethod !== 'visit').reduce((s, o) => s + calcOrderTotal(o), 0);
        const allVisit = cOrders.every(o => o.payMethod === 'visit');

        html += `<div style="padding:8px 0;border-bottom:1px solid var(--border)">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-weight:600;font-size:13px;cursor:pointer;color:var(--primary)" onclick="showProfile(${cid})">${escHtml(stop.n)}</span>
            <span style="font-size:12px;${allVisit ? 'color:#8b5cf6' : 'font-weight:600'}">${allVisit ? 'visited' : formatCurrency(custTotal)}</span>
          </div>`;

        cOrders.sort((a, b) => (b.deliveredAt || '').localeCompare(a.deliveredAt || '')).forEach(o => {
          const isVisit = o.payMethod === 'visit';
          const dt = new Date(o.deliveredAt);
          const dayName = dt.toLocaleDateString('en-GB', { weekday: 'short' });
          const time = dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
          html += `<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-sec);padding:2px 0">
            <span>${dayName} ${time} — ${isVisit ? 'Visit' : (o.items || []).map(i => i.qty + 'x ' + i.name).join(', ')}</span>
            <span>${isVisit ? '' : (o.payMethod || '')}</span>
          </div>`;
        });

        html += `</div>`;
      });

      html += `</div></div>`;
    });
  }

  return html;
}

// ══════════════════════════════════════════════════════════════
// CHARTS
// ══════════════════════════════════════════════════════════════

let _revenueChart = null;
let _paymentChart = null;
let _productsChart = null;

function renderOverviewCharts(data) {
  if (typeof Chart === 'undefined') return;

  // Destroy previous instances
  if (_revenueChart) { _revenueChart.destroy(); _revenueChart = null; }
  if (_paymentChart) { _paymentChart.destroy(); _paymentChart = null; }
  if (_productsChart) { _productsChart.destroy(); _productsChart = null; }

  // ── Revenue Bar Chart ──
  const revenueEl = document.getElementById('revenueChart');
  if (revenueEl) {
    const days = Object.keys(data.dailyRevenue).sort();
    const labels = days.map(d => {
      const dt = new Date(d + 'T00:00:00');
      return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    });
    const values = days.map(d => data.dailyRevenue[d]);

    _revenueChart = new Chart(revenueEl, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: '#E85D3A',
          borderRadius: 4,
          maxBarThickness: 32
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 45 } },
          y: { beginAtZero: true, ticks: { font: { size: 10 }, callback: v => '\u00A3' + v } }
        }
      }
    });
  }

  // ── Payment Doughnut Chart ──
  const payEl = document.getElementById('paymentChart');
  if (payEl) {
    const hasData = data.payments.cash > 0 || data.payments.bank > 0 || data.payments.unpaid > 0;
    _paymentChart = new Chart(payEl, {
      type: 'doughnut',
      data: {
        labels: ['Cash', 'Bank', 'Unpaid'],
        datasets: [{
          data: hasData ? [data.payments.cash, data.payments.bank, data.payments.unpaid] : [1],
          backgroundColor: hasData ? ['#12B76A', '#2E90FA', '#F04438'] : ['#E5E7EB'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '65%',
        plugins: { legend: { display: false } }
      }
    });
  }

  // ── Top Products Horizontal Bar Chart ──
  const prodEl = document.getElementById('productsChart');
  if (prodEl) {
    const sorted = Object.entries(data.products).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 8);
    const prodLabels = sorted.map(([name]) => name.length > 15 ? name.slice(0, 15) + '\u2026' : name);
    const prodValues = sorted.map(([, d]) => d.revenue);
    const colors = ['#E85D3A', '#F0A500', '#12B76A', '#2E90FA', '#9E77ED', '#F63D68', '#06AED4', '#DC6803'];

    _productsChart = new Chart(prodEl, {
      type: 'bar',
      data: {
        labels: prodLabels,
        datasets: [{
          data: prodValues,
          backgroundColor: colors.slice(0, sorted.length),
          borderRadius: 4,
          maxBarThickness: 24
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, grid: { display: false }, ticks: { font: { size: 10 }, callback: v => '\u00A3' + v } },
          y: { grid: { display: false }, ticks: { font: { size: 11 } } }
        }
      }
    });
  }
}
