'use strict';
// REPORTS PAGE
// ══════════════════════════════════════════════════════════════
function renderReports() {
  const data = calcReportData();

  let html = `
    <header class="topbar">
      <h1>Raporlar</h1>
    </header>
    <!-- Report Tabs (scrollable chips) -->
    <div style="padding:8px 16px;background:var(--card);border-bottom:1px solid var(--border);overflow-x:auto;-webkit-overflow-scrolling:touch;white-space:nowrap">
      <div class="chip-group" style="flex-wrap:nowrap;display:inline-flex;margin-bottom:0">
        <button class="chip ${reportTab==='overview'?'active':''}" onclick="reportTab='overview';renderReports()">Özet</button>
        <button class="chip ${reportTab==='products'?'active':''}" onclick="reportTab='products';renderReports()">Ürünler</button>
        <button class="chip ${reportTab==='customers'?'active':''}" onclick="reportTab='customers';renderReports()">Müşteriler</button>
        <button class="chip ${reportTab==='debts'?'active':''}" onclick="reportTab='debts';renderReports()">Borçlar</button>
        <button class="chip ${reportTab==='export'?'active':''}" onclick="reportTab='export';renderReports()">Dışa Aktar</button>
        <button class="chip ${reportTab==='history'?'active':''}" onclick="reportTab='history';renderReports()">Geçmiş</button>
      </div>
    </div>
    <div class="page-body">
      <!-- Date Range (always visible) -->
      <div class="date-range-bar">
        <button class="date-btn ${S.reportRange==='today'?'active':''}" onclick="setReportRange('today')">Bugün</button>
        <button class="date-btn ${S.reportRange==='week'?'active':''}" onclick="setReportRange('week')">Bu Hafta</button>
        <button class="date-btn ${S.reportRange==='month'?'active':''}" onclick="setReportRange('month')">Bu Ay</button>
        <button class="date-btn ${S.reportRange==='custom'?'active':''}" onclick="setReportRange('custom')">Özel</button>
      </div>
      ${S.reportRange === 'custom' ? `
        <div class="custom-dates">
          <input type="date" value="${S.reportStart}" onchange="S.reportStart=this.value;renderReports()">
          <input type="date" value="${S.reportEnd}" onchange="S.reportEnd=this.value;renderReports()">
        </div>
      ` : ''}`;

  if (reportTab === 'overview') {
    html += `
      <!-- Summary Cards -->
      <div class="metric-grid">
        <div class="metric-card">
          <div class="metric-value text-success">${formatCurrency(data.totalRevenue)}</div>
          <div class="metric-label">Gelir</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${data.deliveryCount}</div>
          <div class="metric-label">Teslimat</div>
        </div>
        <div class="metric-card">
          <div class="metric-value" style="color:var(--purple)">${data.visitCount}</div>
          <div class="metric-label">Ziyaret</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${formatCurrency(data.avgOrder)}</div>
          <div class="metric-label">Ort. Sipariş</div>
        </div>
        <div class="metric-card">
          <div class="metric-value text-danger">${formatCurrency(data.totalDebt)}</div>
          <div class="metric-label">Toplam Borç</div>
        </div>
      </div>

      <!-- Payment Breakdown -->
      <div class="report-section">
        <h3>Ödeme Özeti</h3>
        <div class="card">
          <div class="flex-between mb-1">
            <span style="display:flex;align-items:center;gap:6px"><span style="width:10px;height:10px;border-radius:50%;background:var(--success);display:inline-block"></span> Nakit</span>
            <span style="font-weight:600">${formatCurrency(data.payments.cash)}</span>
          </div>
          <div class="progress-bar mb-2">
            <div class="progress-fill" style="width:${data.totalRevenue > 0 ? (data.payments.cash / data.totalRevenue * 100) : 0}%;background:var(--success)"></div>
          </div>
          <div class="flex-between mb-1">
            <span style="display:flex;align-items:center;gap:6px"><span style="width:10px;height:10px;border-radius:50%;background:var(--info);display:inline-block"></span> Banka</span>
            <span style="font-weight:600">${formatCurrency(data.payments.bank)}</span>
          </div>
          <div class="progress-bar mb-2">
            <div class="progress-fill" style="width:${data.totalRevenue > 0 ? (data.payments.bank / data.totalRevenue * 100) : 0}%;background:var(--info)"></div>
          </div>
          <div class="flex-between mb-1">
            <span style="display:flex;align-items:center;gap:6px"><span style="width:10px;height:10px;border-radius:50%;background:var(--danger);display:inline-block"></span> Ödenmedi</span>
            <span style="font-weight:600">${formatCurrency(data.payments.unpaid)}</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width:${data.totalRevenue > 0 ? (data.payments.unpaid / data.totalRevenue * 100) : 0}%;background:var(--danger)"></div>
          </div>
        </div>
      </div>`;
  } else if (reportTab === 'products') {
    html += `
      <!-- Product Filter -->
      ${S.catalog.length > 0 ? `
        <div style="margin-bottom:12px">
          <div style="font-size:12px;font-weight:600;color:var(--text-sec);margin-bottom:6px">Ürün Filtresi</div>
          <div class="chip-group">
            <button class="chip ${S.reportProducts.length===0?'active':''}" onclick="S.reportProducts=[];renderReports()">Tümü</button>
            ${S.catalog.map(c => `
              <button class="chip ${S.reportProducts.includes(c.name)?'active':''}"
                onclick="toggleReportProduct('${escHtml(c.name)}')">${escHtml(c.name)}</button>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Product Breakdown -->
      <div class="report-section">
        <h3>Ürün Dağılımı</h3>
        ${Object.keys(data.products).length === 0 ? '<p class="text-muted" style="font-size:13px">Bu dönem için veri yok</p>' : `
          <div class="card" style="padding:0;overflow:hidden">
            <table class="report-table">
              <thead><tr><th>Ürün</th><th class="text-right">Adet</th><th class="text-right">Gelir</th></tr></thead>
              <tbody>
                ${Object.entries(data.products)
                  .sort((a, b) => b[1].revenue - a[1].revenue)
                  .map(([name, d]) => `
                    <tr><td>${escHtml(name)}</td><td class="text-right">${d.qty}</td><td class="text-right">${formatCurrency(d.revenue)}</td></tr>
                  `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>`;
  } else if (reportTab === 'customers') {
    html += `
      <!-- Top Customers -->
      <div class="report-section">
        <h3>En İyi Müşteriler</h3>
        ${Object.keys(data.customers).length === 0 ? '<p class="text-muted" style="font-size:13px">Bu dönem için veri yok</p>' : `
          <div class="card" style="padding:0;overflow:hidden">
            <table class="report-table">
              <thead><tr><th>Müşteri</th><th class="text-right">Sipariş</th><th class="text-right">Gelir</th></tr></thead>
              <tbody>
                ${Object.entries(data.customers)
                  .sort((a, b) => b[1].revenue - a[1].revenue)
                  .slice(0, 30)
                  .map(([id, d]) => {
                    const s = getStop(parseInt(id));
                    return `<tr onclick="showProfile(${id})" style="cursor:pointer"><td>${s ? escHtml(s.n) : 'Unknown'}</td><td class="text-right">${d.orders}</td><td class="text-right">${formatCurrency(d.revenue)}</td></tr>`;
                  }).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>`;
  } else if (reportTab === 'debts') {
    const debtors = Object.entries(S.debts).filter(([_, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    const totalDebt = debtors.reduce((s, [_, v]) => s + v, 0);
    html += `
      <div class="card" style="text-align:center;margin-bottom:12px">
        <div style="font-size:12px;color:var(--text-sec)">Toplam Borç</div>
        <div style="font-size:28px;font-weight:700;color:var(--danger)">${formatCurrency(totalDebt)}</div>
        <div class="text-muted" style="font-size:12px">${debtors.length} borçlu müşteri</div>
      </div>
      ${debtors.length === 0 ? '<p class="text-muted text-center" style="font-size:13px;padding:20px">Borçlu müşteri yok</p>' : `
        <div class="card" style="padding:0;overflow:hidden">
          <table class="report-table">
            <thead><tr><th>Müşteri</th><th class="text-right">Borç</th></tr></thead>
            <tbody>${debtors.map(([id, amount]) => {
              const s = getStop(parseInt(id));
              return `<tr onclick="showProfile(${id})" style="cursor:pointer"><td>${s ? escHtml(s.n) : 'Unknown'}</td><td class="text-right text-danger" style="font-weight:600">${formatCurrency(amount)}</td></tr>`;
            }).join('')}</tbody>
          </table>
        </div>
      `}`;
  } else if (reportTab === 'export') {
    html += `
      <!-- Product Filter for Export -->
      ${S.catalog.length > 0 ? `
        <div style="margin-bottom:12px">
          <div style="font-size:12px;font-weight:600;color:var(--text-sec);margin-bottom:6px">Rapor İçin Ürün Seçin</div>
          <div class="chip-group">
            ${S.catalog.map(c => `
              <button class="chip ${S.reportProducts.includes(c.name)?'active':''}"
                onclick="toggleReportProduct('${escHtml(c.name)}')">${escHtml(c.name)}</button>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Product Sales Report -->
      <div class="report-section">
        <h3>Ürün Satış Raporu</h3>
        ${(() => {
          if (S.reportProducts.length === 0) return '<div class="card" style="text-align:center;padding:20px"><p class="text-muted" style="font-size:13px">Satış raporu oluşturmak için yukarıdan ürün seçin</p></div>';
          const report = calcProductSalesReport();
          if (report.rows.length === 0) return '<div class="card" style="text-align:center;padding:20px"><p class="text-muted" style="font-size:13px">Bu dönem için eşleşen sipariş yok</p></div>';
          let t = `<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:10px">`;
          report.rows.forEach(r => {
            let payHtml = '';
            r.payDisplay.parts.forEach(p => {
              const c = p.type === 'cash' ? 'var(--success)' : p.type === 'bank' ? 'var(--info)' : 'var(--danger)';
              payHtml += `<span style="font-weight:700;color:${c};font-size:14px">${p.text}</span> `;
            });
            if (r.payDisplay.unpaidAmount > 0 && r.payDisplay.type !== 'unpaid') {
              payHtml += `<span style="font-weight:600;color:var(--danger);font-size:11px">(kalan: ${formatCurrency(r.payDisplay.unpaidAmount)})</span>`;
            }
            t += `<div style="background:${r.isDebtPayment ? '#f0fdf4' : 'var(--card)'};border:1px solid var(--border);border-radius:10px;padding:10px 12px">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:4px">
                <span style="font-weight:600;font-size:14px">${escHtml(r.name)}</span>
                <span style="font-size:11px;color:var(--text-sec);white-space:nowrap;flex-shrink:0">${r.dateTime || ''}</span>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
                <div>${payHtml}</div>
                <div style="font-size:12px;color:${r.isDebtPayment ? 'var(--success)' : 'var(--text-sec)'};text-align:right">${r.isDebtPayment ? '<em>'+r.productsSummary+'</em>' : r.productsSummary}</div>
              </div>
            </div>`;
          });
          t += `</div>
          <div style="background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:10px 14px;margin-bottom:12px">
            <div style="font-size:13px;font-weight:700;margin-bottom:4px">TOPLAM (${report.rows.length})</div>
            <div style="display:flex;flex-wrap:wrap;gap:8px;font-size:13px;font-weight:600">
              <span style="color:var(--success)">Cash ${formatCurrency(report.totalCash)}</span>
              <span style="color:var(--info)">Bank ${formatCurrency(report.totalBank)}</span>
              <span style="color:var(--danger)">Unpaid ${formatCurrency(report.totalUnpaid)}</span>
            </div>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-primary" style="flex:1;padding:12px" onclick="exportProductReportPDF()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              PDF
            </button>
            <button class="btn btn-outline" style="flex:1;padding:12px" onclick="exportProductReportExcel()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 7h8M8 12h8M8 17h4"/></svg>
              Excel
            </button>
          </div>`;
          return t;
        })()}
      </div>`;
  } else if (reportTab === 'history') {
    html += renderDeliveryHistoryContent();
  }

  html += `</div>`;

  document.getElementById('page-reports').innerHTML = html;
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
  }
  renderReports();
}

function toggleReportProduct(name) {
  const idx = S.reportProducts.indexOf(name);
  if (idx >= 0) S.reportProducts.splice(idx, 1);
  else S.reportProducts.push(name);
  renderReports();
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
      o.items.some(item => S.reportProducts.includes(item.name))
    );
  }

  const totalRevenue = filtered.filter(o => o.payMethod !== 'visit').reduce((s, o) => s + calcOrderTotal(o), 0);
  const deliveryCount = filtered.filter(o => o.payMethod !== 'visit').length;
  const visitCount = filtered.filter(o => o.payMethod === 'visit').length;
  const avgOrder = deliveryCount > 0 ? totalRevenue / deliveryCount : 0;
  const totalDebt = Object.values(S.debts).reduce((s, d) => s + (d || 0), 0);

  const products = {};
  filtered.forEach(o => {
    o.items.forEach(item => {
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

  return { totalRevenue, deliveryCount, visitCount, avgOrder, totalDebt, products, payments, customers };
}

function calcProductSalesReport() {
  const orders = Object.values(S.orders);
  let filtered = orders.filter(o => {
    if (o.status !== 'delivered' || !o.deliveredAt) return false;
    if (o.payMethod === 'visit' && (!o.items || o.items.length === 0)) return false;
    const d = o.deliveredAt.slice(0, 10);
    if (S.reportStart && d < S.reportStart) return false;
    if (S.reportEnd && d > S.reportEnd) return false;
    return o.items.some(item => S.reportProducts.includes(item.name));
  });

  // Sort by delivery date
  filtered.sort((a, b) => (a.deliveredAt || '').localeCompare(b.deliveredAt || ''));

  const rows = [];
  let totalCash = 0, totalBank = 0, totalUnpaid = 0, grandTotal = 0;

  // Each order = separate row
  filtered.forEach(o => {
    const stop = getStop(o.customerId);
    if (!stop) return;

    const total = calcOrderTotal(o);
    const prodMap = {};
    o.items.forEach(item => {
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
      if (bankPaid > 0) { parts.push({ text: 'Bank', type: 'bank' }); if (primaryType === 'unpaid') primaryType = 'bank'; }
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

  // Add debt payment rows (outstanding payment received)
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
      totalUnpaid = Math.max(0, totalUnpaid - entry.amount);
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

  // Sort by date ascending (old to new)
  rows.sort((a, b) => (a.rawDate || '').localeCompare(b.rawDate || ''));

  return { rows, totalCash, totalBank, totalUnpaid, grandTotal };
}

function getReportDateLabel() {
  if (S.reportRange === 'custom') return `${S.reportStart} to ${S.reportEnd}`;
  return `${S.reportStart} to ${S.reportEnd}`;
}

function exportProductReportPDF() {
  const report = calcProductSalesReport();
  if (report.rows.length === 0) { appAlert('Dışa aktarılacak veri yok.'); return; }

  const dateLabel = getReportDateLabel();
  const exportDate = new Date().toLocaleString('tr-TR');
  const productsLabel = S.reportProducts.join(', ');

  let tableRows = '';
  report.rows.forEach(r => {
    let payCell = '';
    r.payDisplay.parts.forEach(p => {
      const c = p.type === 'cash' ? '#12B76A' : p.type === 'bank' ? '#2E90FA' : '#F04438';
      payCell += `<div style="color:${c};font-weight:600">${p.text}</div>`;
    });
    if (r.payDisplay.unpaidAmount > 0 && r.payDisplay.type !== 'unpaid') {
      payCell += `<div style="color:#F04438;font-size:10px;font-weight:600">left: ${formatCurrency(r.payDisplay.unpaidAmount)}</div>`;
    }
    tableRows += `<tr${r.isDebtPayment ? ' style="background:#f0fdf4"' : ''}>
      <td>${escHtml(r.name)}</td>
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
      <thead><tr><th>Customer</th><th>Payment</th><th>Products</th></tr></thead>
      <tbody>
        ${tableRows}
        <tr class="total-row">
          <td>TOTAL (${report.rows.length})</td>
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
  if (report.rows.length === 0) { appAlert('Dışa aktarılacak veri yok.'); return; }

  const data = [['Customer', 'Date', 'Payment', 'Unpaid', 'Products']];
  report.rows.forEach(r => {
    const payText = r.payDisplay.parts.map(p => p.text).join(' + ');
    const unpaidText = r.payDisplay.unpaidAmount > 0 ? formatCurrency(r.payDisplay.unpaidAmount) : '';
    data.push([r.name, r.dateTime || '', payText, unpaidText, r.isDebtPayment ? 'Outstanding payment received' : r.productsSummary]);
  });
  data.push([]);
  data.push(['TOTAL']);
  data.push(['Cash', '', formatCurrency(report.totalCash)]);
  data.push(['Bank', '', formatCurrency(report.totalBank)]);
  data.push(['Unpaid', '', formatCurrency(report.totalUnpaid)]);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 15 }, { wch: 12 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Product Report');
  XLSX.writeFile(wb, 'product_report_' + todayStr() + '.xlsx');
}

// ══════════════════════════════════════════════════════════════
// DELIVERY HISTORY PAGE
// ══════════════════════════════════════════════════════════════
function renderDeliveryHistoryContent() {
  // Group all delivered orders by week
  const delivered = Object.values(S.orders).filter(o => o.status === 'delivered' && o.deliveredAt);
  const weeks = {};
  delivered.forEach(o => {
    const monday = getWeekMondayStr(o.deliveredAt);
    if (!weeks[monday]) weeks[monday] = [];
    weeks[monday].push(o);
  });

  // Sort weeks descending (most recent first)
  const sortedWeeks = Object.keys(weeks).sort((a, b) => b.localeCompare(a));

  // Determine week label (A or B) using the same logic as getCurrentWeek
  const ref = new Date(2026, 2, 2); // 2 March 2026 = Week A Monday
  function weekLabel(mondayStr) {
    const mon = new Date(mondayStr);
    const diffDays = Math.floor((mon - ref) / 86400000);
    const weekNum = Math.floor(diffDays / 7);
    return (weekNum % 2 === 0) ? 'A' : 'B';
  }

  const thisMonday = getWeekMondayStr(new Date());

  let html = `
    <div style="margin-bottom:12px">
      <input class="input" type="search" placeholder="Müşteri ara..." value="${escHtml(dhSearchTerm)}" oninput="dhSearchTerm=this.value;reportTab='history';renderReports()">
    </div>`;

  if (sortedWeeks.length === 0) {
    html += `<div class="empty-state"><p>Henüz teslimat geçmişi yok</p></div>`;
  } else {
    sortedWeeks.forEach(monday => {
      const orders = weeks[monday];
      const wLabel = weekLabel(monday);
      const isCurrent = monday === thisMonday;
      const monDate = new Date(monday);
      const endDate = new Date(monDate);
      endDate.setDate(endDate.getDate() + 4); // Friday
      const dateRange = monDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' - ' + endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

      // Filter by search
      let filtered = orders;
      if (dhSearchTerm) {
        const term = dhSearchTerm.toLowerCase();
        filtered = orders.filter(o => {
          const stop = getStop(o.customerId);
          return stop && stop.n.toLowerCase().includes(term);
        });
        if (filtered.length === 0) return;
      }

      // Sort within week: newest first
      filtered.sort((a, b) => (b.deliveredAt || '').localeCompare(a.deliveredAt || ''));

      // Group by customer
      const byCustomer = {};
      filtered.forEach(o => {
        if (!byCustomer[o.customerId]) byCustomer[o.customerId] = [];
        byCustomer[o.customerId].push(o);
      });

      // Week summary
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
        <div class="card" style="margin-bottom:12px;overflow:hidden">
          <div style="padding:12px;background:${isCurrent ? 'var(--primary)' : '#f3f4f6'};color:${isCurrent ? '#fff' : 'var(--text)'}">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div>
                <b>Week ${wLabel}</b>${isCurrent ? ' (Bu Hafta)' : ''}
                <div style="font-size:12px;opacity:0.8">${dateRange}</div>
              </div>
              <div style="text-align:right;font-size:12px">
                <div>${deliveryCount} teslimat · ${visitCount} ziyaret</div>
                ${totalRev > 0 ? `<div style="font-weight:700">${formatCurrency(totalRev)}</div>` : ''}
              </div>
            </div>
            ${totalRev > 0 ? `<div style="display:flex;gap:12px;margin-top:6px;font-size:11px;opacity:0.85">
              <span>Cash: ${formatCurrency(cashTotal)}</span>
              <span>Bank: ${formatCurrency(bankTotal)}</span>
            </div>` : ''}
          </div>
          <div style="padding:8px">`;

      Object.entries(byCustomer).forEach(([cid, cOrders]) => {
        const stop = getStop(cid);
        if (!stop) return;
        const custTotal = cOrders.filter(o => o.payMethod !== 'visit').reduce((s, o) => s + calcOrderTotal(o), 0);
        const allVisit = cOrders.every(o => o.payMethod === 'visit');

        html += `<div style="padding:8px;border-bottom:1px solid var(--border)">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-weight:600;font-size:13px;cursor:pointer;color:var(--primary)" onclick="showProfile(${cid})">${escHtml(stop.n)}</span>
            <span style="font-size:12px;${allVisit ? 'color:#8b5cf6' : 'font-weight:600'}">${allVisit ? 'visited' : formatCurrency(custTotal)}</span>
          </div>`;

        // Within customer, sort newest first
        cOrders.sort((a, b) => (b.deliveredAt || '').localeCompare(a.deliveredAt || '')).forEach(o => {
          const isVisit = o.payMethod === 'visit';
          const dt = new Date(o.deliveredAt);
          const dayName = dt.toLocaleDateString('en-GB', { weekday: 'short' });
          const time = dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
          html += `<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-sec);padding:2px 0">
            <span>${dayName} ${time} — ${isVisit ? 'Ziyaret' : o.items.map(i => i.qty + 'x ' + i.name).join(', ')}</span>
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

function renderDeliveryHistory() {
  // Redirect to reports history tab
  reportTab = 'history';
  showPage('reports');
}

// ══════════════════════════════════════════════════════════════
