'use strict';
// MAP PAGE
// ══════════════════════════════════════════════════════════════
let mapAssignStopId = null;

function showMapModal() { showPage('map'); }

function renderMapPage() {
  let html = `
    <header class="topbar">
      <button class="btn-ghost" onclick="showPage('settings')" style="font-size:18px;padding:8px">&larr;</button>
      <h1 style="flex:1;text-align:center;font-size:16px">Map</h1>
      <div style="width:36px"></div>
    </header>
    <div class="chip-group" style="padding:8px 16px;background:var(--card);border-bottom:1px solid var(--border);margin:0">
      <button class="chip ${S.mapFilter==='all'?'active':''}" onclick="S.mapFilter='all';refreshMapMarkers()">All</button>
      <button class="chip ${S.mapFilter==='A'?'active':''}" onclick="S.mapFilter='A';refreshMapMarkers()">Week A</button>
      <button class="chip ${S.mapFilter==='B'?'active':''}" onclick="S.mapFilter='B';refreshMapMarkers()">Week B</button>
      <button class="chip ${S.mapFilter==='none'?'active':''}" onclick="S.mapFilter='none';refreshMapMarkers()">Unassigned</button>
    </div>
    <div id="map-container" style="flex:1;min-height:0"></div>`;
  document.getElementById('page-map').innerHTML = html;

  setTimeout(() => {
    const container = document.getElementById('map-container');
    if (!container) return;
    try { if (leafletMap) { leafletMap.remove(); leafletMap = null; } } catch {}
    leafletMap = L.map(container).setView([51.45, 0.05], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(leafletMap);
    leafletMap.on('zoomend', updateTooltipVisibility);
    refreshMapMarkers();
  }, 150);
}

function refreshMapMarkers() {
  if (!leafletMap) return;
  mapMarkers.forEach(m => { try { leafletMap.removeLayer(m); } catch {} });
  mapMarkers = [];
  mapRouteLines.forEach(l => { try { leafletMap.removeLayer(l); } catch {} });
  mapRouteLines = [];

  // Update filter chip visuals
  document.querySelectorAll('#page-map .chip').forEach(c => {
    const txt = c.textContent.trim();
    const val = txt === 'All' ? 'all' : txt === 'Week A' ? 'A' : txt === 'Week B' ? 'B' : 'none';
    c.classList.toggle('active', val === S.mapFilter);
  });

  // Build route order per day (same logic as route page)
  const dayStopOrder = {};
  DAYS.forEach(d => {
    const assigned = [];
    Object.entries(S.assign).forEach(([sid, did]) => { if (did === d.id) assigned.push(parseInt(sid)); });
    const ro = S.routeOrder[d.id] || [];
    dayStopOrder[d.id] = [...new Set([...ro.filter(id => assigned.includes(id)), ...assigned])];
  });

  STOPS.forEach(stop => {
    const geo = S.geo[stop.id];
    if (!geo || geo.lat == null || geo.lng == null || isNaN(geo.lat) || isNaN(geo.lng)) return;

    const dayId = S.assign[stop.id];
    const dayObj = dayId ? getDayObj(dayId) : null;

    // Apply filter
    if (S.mapFilter === 'A' && (!dayId || !dayId.startsWith('wA'))) return;
    if (S.mapFilter === 'B' && (!dayId || !dayId.startsWith('wB'))) return;
    if (S.mapFilter === 'none' && dayId) return;

    const color = dayObj ? dayObj.color : '#999';

    // Get route order number
    const dayOrder = dayId ? (dayStopOrder[dayId] || []) : [];
    const orderIdx = dayOrder.indexOf(stop.id);
    const orderNum = orderIdx >= 0 ? orderIdx + 1 : '';

    const icon = L.divIcon({
      className: '',
      html: `<div style="width:24px;height:24px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff">${orderNum}</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    const dayLabel = dayObj ? `Week ${dayObj.week} - ${dayObj.label}` : 'Unassigned';
    const popupHtml = `<div style="min-width:160px">
      <b>${orderNum ? orderNum + '. ' : ''}${escHtml(stop.n)}</b><br>
      ${stop.a ? `<span style="font-size:12px;color:#666">${escHtml(stop.a)}</span><br>` : ''}
      <span style="font-size:12px;color:#666">${escHtml(stop.c)} &middot; ${escHtml(stop.p)}</span><br>
      <span style="font-size:12px;color:${color}">${dayLabel}</span><br>
      <button onclick="showMapAssignModal(${stop.id})" style="margin-top:6px;padding:4px 10px;font-size:12px;background:${color};color:#fff;border:none;border-radius:6px;cursor:pointer">Assign Day</button>
      <button onclick="showProfile(${stop.id})" style="margin-top:6px;padding:4px 10px;font-size:12px;background:#eee;color:#333;border:none;border-radius:6px;cursor:pointer;margin-left:4px">Profile</button>
    </div>`;

    const marker = L.marker([geo.lat, geo.lng], { icon }).bindPopup(popupHtml).addTo(leafletMap);
    marker.bindTooltip(escHtml(stop.n), {
      permanent: false, direction: 'bottom', offset: [0, 10],
      className: 'map-label'
    });
    mapMarkers.push(marker);
  });

  // Draw route lines per day
  DAYS.forEach(d => {
    // Check filter
    if (S.mapFilter === 'A' && !d.id.startsWith('wA')) return;
    if (S.mapFilter === 'B' && !d.id.startsWith('wB')) return;
    if (S.mapFilter === 'none') return;

    const order = dayStopOrder[d.id] || [];
    const points = order
      .map(sid => S.geo[sid])
      .filter(g => g && g.lat && g.lng)
      .map(g => [g.lat, g.lng]);
    if (points.length >= 2) {
      const line = L.polyline(points, { color: d.color, weight: 2.5, opacity: 0.5, dashArray: '6,6' }).addTo(leafletMap);
      mapRouteLines.push(line);
    }
  });

  if (mapMarkers.length > 0) {
    const group = L.featureGroup(mapMarkers);
    leafletMap.fitBounds(group.getBounds().pad(0.1));
  }
  updateTooltipVisibility();
}

function updateTooltipVisibility() {
  if (!leafletMap) return;
  const zoom = leafletMap.getZoom();
  mapMarkers.forEach(m => {
    if (zoom >= 12) {
      if (m.getTooltip() && !m.isTooltipOpen()) m.openTooltip();
    } else {
      if (m.getTooltip() && m.isTooltipOpen()) m.closeTooltip();
    }
  });
}

function showMapAssignModal(stopId) {
  mapAssignStopId = stopId;
  const stop = getStop(stopId);
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
        onclick="mapAssignDay('${d.id}')">
        ${d.label}
      </button>`;
    });
  });

  if (currentDay) {
    html += `<button class="btn btn-danger btn-block mt-2" onclick="mapUnassignDay()">Remove from Route</button>`;
  }
  openModal(html);
}

function mapAssignDay(dayId) {
  if (mapAssignStopId == null) return;
  S.assign[mapAssignStopId] = dayId;
  save.assign();
  mapAssignStopId = null;
  closeModal();
  refreshMapMarkers();
}

function mapUnassignDay() {
  if (mapAssignStopId == null) return;
  delete S.assign[mapAssignStopId];
  save.assign();
  mapAssignStopId = null;
  closeModal();
  refreshMapMarkers();
}

// ══════════════════════════════════════════════════════════════
// IMPORT / EXPORT
// ══════════════════════════════════════════════════════════════
function showImportModal() {
  openModal(`<div class="modal-handle"></div>
    <div class="modal-title">Import from Excel</div>
    <p class="text-muted mb-2" style="font-size:13px">
      Upload an Excel file (.xlsx) with the following columns:<br>
      <b>Name, Address, City, Postcode</b>
    </p>
    <div class="form-group">
      <input type="file" accept=".xlsx,.xls" class="input" onchange="importExcel(this.files[0])" id="import-file">
    </div>
    <button class="btn btn-outline btn-block" onclick="closeModal()">Cancel</button>
  `);
}

function importExcel(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const wb = XLSX.read(e.target.result, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

      let added = 0;
      let maxId = STOPS.reduce((m, s) => Math.max(m, s.id), 0);
      const startRow = (data[0] && typeof data[0][0] === 'string' && data[0][0].toLowerCase().includes('name')) ? 1 : 0;

      for (let i = startRow; i < data.length; i++) {
        const row = data[i];
        if (!row || !row[0]) continue;
        const name = String(row[0]).trim().toUpperCase();
        if (STOPS.some(s => s.n.toUpperCase() === name)) continue;
        maxId++;
        STOPS.push({
          id: maxId,
          n: name,
          a: String(row[1] || '').trim(),
          c: String(row[2] || '').trim(),
          p: String(row[3] || '').trim().toUpperCase()
        });
        added++;
      }

      save.stops();
      closeModal();
      appAlert(`Import complete: ${added} new customers added.`);
      if (curPage === 'customers') renderCustomers();
      else if (curPage === 'settings') renderSettings();
    } catch (err) {
      appAlert('Import error: ' + err.message);
    }
  };
  reader.readAsArrayBuffer(file);
}

function exportExcel() {
  const wb = XLSX.utils.book_new();

  // Customers sheet
  const custData = [['Name', 'Address', 'City', 'Postcode', 'Assigned Day', 'Debt']];
  STOPS.forEach(s => {
    const dayId = S.assign[s.id];
    const dayObj = dayId ? getDayObj(dayId) : null;
    const dayLabel = dayObj ? `Week ${dayObj.week} - ${dayObj.label}` : '';
    custData.push([s.n, s.a, s.c, s.p, dayLabel, S.debts[s.id] || 0]);
  });
  const ws1 = XLSX.utils.aoa_to_sheet(custData);
  XLSX.utils.book_append_sheet(wb, ws1, 'Customers');

  // Orders sheet
  const ordData = [['Order ID', 'Customer', 'Items', 'Total', 'Status', 'Payment', 'Created', 'Delivered']];
  Object.values(S.orders).forEach(o => {
    const s = getStop(o.customerId);
    ordData.push([
      o.id,
      s ? s.n : 'Unknown',
      o.items.map(i => `${i.qty}x ${i.name}`).join(', '),
      calcOrderTotal(o),
      o.status,
      o.payMethod || '',
      o.createdAt || '',
      o.deliveredAt || ''
    ]);
  });
  const ws2 = XLSX.utils.aoa_to_sheet(ordData);
  XLSX.utils.book_append_sheet(wb, ws2, 'Orders');

  XLSX.writeFile(wb, 'costadoro_export_' + todayStr() + '.xlsx');
}

function shareRouteSummary() {
  const week = S.routeWeek;
  const dayIdx = S.routeDay;
  const days = DAYS.filter(d => d.week === week);
  const dayObj = days[dayIdx];
  if (!dayObj) return;
  const dayId = dayObj.id;
  const assigned = [];
  Object.entries(S.assign).forEach(([sid, did]) => {
    if (did === dayId) assigned.push(parseInt(sid));
  });
  const ro = S.routeOrder[dayId] || [];
  const sorted = [...new Set([...ro.filter(id => assigned.includes(id)), ...assigned])];
  const dateStr = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  let text = `📋 Costadoro Route\n${dateStr} (Week ${week})\n\n`;
  let totalRev = 0;
  sorted.forEach((stopId, idx) => {
    const stop = getStop(stopId);
    if (!stop) return;
    const pending = getStopOrders(stopId, 'pending');
    const delivered = getStopOrders(stopId, 'delivered').filter(o => {
      const d = o.deliveredAt ? new Date(o.deliveredAt).toDateString() : '';
      return d === new Date().toDateString();
    });
    const isDelivered = delivered.length > 0;
    const debt = S.debts[stopId] || 0;
    const todayRev = delivered.reduce((s, o) => s + calcOrderTotal(o), 0);
    totalRev += todayRev;
    const status = isDelivered ? '✅' : (pending.length > 0 ? '📦' : '⬜');
    text += `${idx + 1}. ${status} ${stop.n} — ${stop.c}, ${stop.p}`;
    if (pending.length > 0 && !isDelivered) text += ` (${pending.length} orders)`;
    if (todayRev > 0) text += ` — ${formatCurrency(todayRev)}`;
    if (debt > 0) text += ` [Debt: ${formatCurrency(debt)}]`;
    text += '\n';
  });
  text += `\n📊 ${sorted.filter(id => getStopOrders(id, 'delivered').some(o => o.deliveredAt && new Date(o.deliveredAt).toDateString() === new Date().toDateString())).length}/${sorted.length} delivered | Total: ${formatCurrency(totalRev)}`;

  if (navigator.share) {
    navigator.share({ title: 'Route Summary', text });
  } else {
    navigator.clipboard.writeText(text).then(() => appAlert('Route summary copied to clipboard.'));
  }
}

function exportRouteExcel() {
  const wb = XLSX.utils.book_new();

  ['A', 'B'].forEach(week => {
    const days = DAYS.filter(d => d.week === week);
    const data = [['#', 'Customer', 'City', 'Postcode', 'Day', 'Debt']];

    days.forEach(day => {
      const assigned = [];
      Object.entries(S.assign).forEach(([sid, did]) => {
        if (did === day.id) assigned.push(parseInt(sid));
      });
      const ro = S.routeOrder[day.id] || [];
      const sorted = [...new Set([...ro.filter(id => assigned.includes(id)), ...assigned])];

      sorted.forEach((stopId, idx) => {
        const stop = getStop(stopId);
        if (!stop) return;
        data.push([idx + 1, stop.n, stop.c, stop.p, day.label, S.debts[stopId] || 0]);
      });

      if (sorted.length > 0) data.push([]); // empty row between days
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 4 }, { wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 12 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Week ' + week);
  });

  XLSX.writeFile(wb, 'route_export_' + todayStr() + '.xlsx');
}

// ══════════════════════════════════════════════════════════════
