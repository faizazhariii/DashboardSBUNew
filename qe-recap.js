/* ============================================================
   QE (menu Tematik): dropdown BRT Medan / QE Lubuk Pakam / Dusem
   + halaman rekap QE Lubuk Pakam dan Dusem (data dari Apps Script Mini Web QE).
   Pakai kelas CSS bawaan dashboard (kpi, chart-card, table-card, mbb-report-table, dst).
   ============================================================ */
(function(){
  'use strict';
  var API = 'https://script.google.com/macros/s/AKfycbzwDowJ4CHMEgtlFYd45rqFAYAVj9QSRBdjXKcLqEcMdQWM4ybkSTxV5UxUEtcaagfbKQ/exec';
  var CACHE_MS = 60 * 1000;
  var cache = {};
  var charts = {};

  /* ---------- util ---------- */
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function nf(n){ return new Intl.NumberFormat('id-ID').format(Math.round(n || 0)); }
  function rp(n){
    n = Number(n) || 0;
    if (n >= 1e9) return 'Rp ' + (n / 1e9).toFixed(2).replace('.', ',') + ' M';
    if (n >= 1e6) return 'Rp ' + (n / 1e6).toFixed(1).replace('.', ',') + ' jt';
    return 'Rp ' + nf(n);
  }
  function pct(v){ return Math.round((v || 0) * 100); }
  function clamp01(x){ return Math.max(0, Math.min(1, x)); }
  function $(id){ return document.getElementById(id); }
  async function api(action, extra){
    var key = action + (extra || '');
    var c = cache[key];
    if (c && Date.now() - c.t < CACHE_MS) return c.d;
    var last = null;
    for (var i = 0; i < 3; i++){
      try {
        var res = await fetch(API + '?action=' + action + (extra || '') + '&_=' + Date.now(), { cache: 'no-store' });
        var txt = await res.text();
        var d = JSON.parse(txt);
        if (!d.ok) throw new Error(d.error || 'Server menolak permintaan');
        cache[key] = { t: Date.now(), d: d };
        return d;
      } catch (e) {
        last = e;
        await new Promise(function(r){ setTimeout(r, 900 * (i + 1)); });
      }
    }
    throw last || new Error('Gagal memuat');
  }
  function kpiHtml(list){
    return list.map(function(k){
      return '<div class="kpi"><div class="accent" style="background:' + k[2] + '"></div><p class="kpi-label">' + esc(k[0]) + '</p>' +
        '<p class="kpi-value" style="' + (String(k[1]).length > 9 ? 'font-size:18px;' : '') + '">' + k[1] + '</p>' +
        (k[3] ? '<div class="kpi-sub">' + k[3] + '</div>' : '') + '</div>';
    }).join('');
  }
  function drawChart(id, type, labels, datasets, opts){
    if (typeof Chart === 'undefined') return;
    if (charts[id]) charts[id].destroy();
    var el = $(id); if (!el) return;
    charts[id] = new Chart(el, {
      type: type, data: { labels: labels, datasets: datasets },
      options: Object.assign({
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } }, datalabels: { display: false } }
      }, opts || {})
    });
  }
  function bar(p, color){
    return '<div style="display:flex;align-items:center;gap:8px;min-width:120px;"><div style="flex:1;height:8px;border-radius:5px;background:#e3e9f1;overflow:hidden;">' +
      '<div style="height:100%;width:' + Math.min(100, p) + '%;background:' + color + ';"></div></div><b style="font-size:12px;min-width:36px;text-align:right;">' + p + '%</b></div>';
  }
  function colorFor(p){ return p >= 100 ? '#167A4B' : (p >= 50 ? '#2b6cb0' : '#d69e2e'); }
  function fmtWaktu(iso){
    try { return new Date(iso).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return iso || ''; }
  }
  function updatesTable(list, firstColLabel){
    if (!list.length) return '<div style="padding:22px;text-align:center;color:var(--text-dim);">Belum ada update dari Mini Web.</div>';
    return '<table class="mbb-report-table"><thead><tr><th>Waktu</th><th>' + firstColLabel + '</th><th>Ringkasan</th><th>Catatan</th><th>Oleh</th></tr></thead><tbody>' +
      list.map(function(u){
        return '<tr><td style="white-space:nowrap;">' + esc(fmtWaktu(u.time)) + '</td><td class="name">' + esc(u.segmen || u.lop || '') + '</td>' +
          '<td style="min-width:240px;max-width:380px;font-size:11.5px;color:var(--text-dim);">' + esc(u.summary || '—') + '</td>' +
          '<td style="min-width:160px;max-width:260px;font-size:11.5px;color:var(--text-dim);">' + esc(u.catatan || '—') + '</td>' +
          '<td>' + esc(u.user || '—') + '</td></tr>';
      }).join('') + '</tbody></table>';
  }
  function errBox(host, e){
    host.innerHTML = '<div class="section" style="margin-top:0;"><div style="padding:14px;border:1px solid var(--red);border-radius:10px;color:var(--red);font-size:13px;">' +
      'Gagal memuat data: ' + esc(e && e.message ? e.message : e) + '. <button type="button" class="refresh-btn" style="margin-left:8px;" onclick="location.reload()">Coba lagi</button></div></div>';
  }

  /* ============================================================
     QE LUBUK PAKAM
     ============================================================ */
  var lp = { items: [], jalan: [], updates: [], loadedAt: null };

  function lpBuild(structure, timeline, updates){
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var tl = {};
    (timeline.rows || []).forEach(function(r){
      (r.items || []).forEach(function(it){ tl[r.segmen + '|' + it.label] = it; });
    });
    var items = [];
    (structure.rows || []).forEach(function(r){
      (r.items || []).forEach(function(it){
        var t = tl[r.segmen + '|' + it.label] || {};
        var plan = Number(it.plan) || 0, akt = Number(it.aktual) || 0;
        var p = plan > 0 ? clamp01(akt / plan) : 0;
        var target = null;
        if (t.start && t.end){
          var s = new Date(t.start + 'T00:00:00'), e = new Date(t.end + 'T00:00:00');
          var span = (e - s) / 864e5;
          target = span <= 0 ? (today >= s ? 1 : 0) : clamp01(((today - s) / 864e5) / span);
        }
        items.push({ jalan: r.segmen, label: it.label, unit: it.unit, plan: plan, akt: akt, p: p, target: target, start: t.startDisplay || '', end: t.endDisplay || '' });
      });
    });
    var byJ = {};
    items.forEach(function(it){ (byJ[it.jalan] = byJ[it.jalan] || []).push(it); });
    var jalan = Object.keys(byJ).map(function(name){
      var its = byJ[name];
      var avg = function(a){ return a.length ? a.reduce(function(s, x){ return s + x; }, 0) / a.length : 0; };
      var prog = avg(its.map(function(i){ return i.p; }));
      var tg = its.filter(function(i){ return i.target !== null; });
      var target = tg.length ? avg(tg.map(function(i){ return i.target; })) : null;
      var done = its.filter(function(i){ return i.p >= 1; }).length;
      var status = prog >= 1 ? 'Selesai' : (target === null ? 'Berjalan' : (prog < target - 0.10 ? 'Terlambat' : 'Tepat waktu'));
      return { name: name, items: its, prog: prog, target: target, done: done, status: status };
    });
    lp.items = items; lp.jalan = jalan; lp.updates = updates || []; lp.loadedAt = new Date();
  }

  function lpHost(){
    var page = $('pageQeLp');
    if (!page.dataset.built){
      page.dataset.built = '1';
      page.innerHTML =
        '<div class="section" style="margin-top:0;">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">' +
            '<div><p class="section-title" style="margin-bottom:2px;">QE Lubuk Pakam — Rekap Progress</p>' +
            '<p class="section-desc" style="margin:0;" id="lpSource">Memuat data…</p></div>' +
            '<div style="display:flex;gap:8px;flex-wrap:wrap;"><button type="button" class="refresh-btn" id="lpRefresh">↻ Muat ulang</button>' +
            '<button type="button" class="download-btn" id="lpDownload" style="margin-top:0;">📥 Download CSV</button></div>' +
          '</div>' +
          '<div id="lpBody"></div>' +
        '</div>';
      $('lpRefresh').onclick = function(){ cache = {}; qeLpOpen(true); };
      $('lpDownload').onclick = lpDownload;
    }
  }

  async function qeLpOpen(force){
    lpHost();
    var body = $('lpBody');
    if (force || !lp.loadedAt) body.innerHTML = '<div class="state-msg">Memuat data Lubuk Pakam…</div>';
    try {
      var r = await Promise.all([api('lpStructure'), api('lpTimeline'), api('lpUpdates', '&limit=15')]);
      lpBuild(r[0], r[1], r[2].updates);
      lpRender();
    } catch (e) { errBox(body, e); }
  }

  function lpRender(){
    var J = lp.jalan, I = lp.items;
    var tot = I.length ? I.reduce(function(s, i){ return s + i.p; }, 0) / I.length : 0;
    var tgI = I.filter(function(i){ return i.target !== null; });
    var tgt = tgI.length ? tgI.reduce(function(s, i){ return s + i.target; }, 0) / tgI.length : null;
    var diff = tgt === null ? null : (tot - tgt) * 100;
    var done = I.filter(function(i){ return i.p >= 1; }).length;
    var notStarted = I.filter(function(i){ return i.p === 0; }).length;
    var late = J.filter(function(j){ return j.status === 'Terlambat'; }).length;
    $('lpSource').textContent = 'Sumber: Mini Web QE (sheet LUBUK PAKAM) · ' + J.length + ' jalan · ' + I.length + ' item · dimuat ' + lp.loadedAt.toLocaleString('id-ID');

    var kpis = [
      ['Progress Total', pct(tot) + '%', '#16406F'],
      ['Target Hari Ini', tgt === null ? '—' : pct(tgt) + '%', '#805ad5'],
      ['Selisih', diff === null ? '—' : (diff >= 0 ? '+' : '') + diff.toFixed(1) + ' poin', diff !== null && diff < -10 ? '#c8102e' : '#167A4B'],
      ['Jumlah Jalan', J.length, '#0a2342'],
      ['Jalan Terlambat', late, late ? '#c8102e' : '#167A4B'],
      ['Item Selesai', done + ' / ' + I.length, '#167A4B'],
      ['Item Belum Mulai', notStarted, '#d69e2e']
    ];

    var statusColor = { 'Selesai': '#167A4B', 'Tepat waktu': '#2b6cb0', 'Terlambat': '#c8102e', 'Berjalan': '#d69e2e' };
    var jalanOpts = '<option value="">Semua Jalan</option>' + J.map(function(j){ return '<option>' + esc(j.name) + '</option>'; }).join('');

    $('lpBody').innerHTML =
      '<div class="kpi-row">' + kpiHtml(kpis) + '</div>' +
      '<div style="margin-top:18px;display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:14px;">' +
        '<div class="chart-card"><h3>Progress vs Target per Jalan (%)</h3><div class="canvas-wrap" style="height:290px;"><canvas id="lpChartJalan"></canvas></div></div>' +
        '<div class="chart-card"><h3>Progress per Item (%)</h3><div class="canvas-wrap" style="height:290px;"><canvas id="lpChartItem"></canvas></div></div>' +
      '</div>' +
      '<p class="section-title" style="margin:22px 0 4px;font-size:15px;">Rekap per Jalan</p>' +
      '<div class="table-card" style="overflow-x:auto;"><table class="mbb-report-table"><thead><tr><th>Jalan</th><th>Progress</th><th>Target Hari Ini</th><th>Selisih</th><th>Item Selesai</th><th>Status</th></tr></thead><tbody>' +
        J.map(function(j){
          var d = j.target === null ? null : (j.prog - j.target) * 100;
          return '<tr><td class="name">' + esc(j.name) + '</td><td>' + bar(pct(j.prog), colorFor(pct(j.prog))) + '</td>' +
            '<td>' + (j.target === null ? '—' : pct(j.target) + '%') + '</td>' +
            '<td style="color:' + (d !== null && d < -10 ? '#c8102e' : 'inherit') + ';">' + (d === null ? '—' : (d >= 0 ? '+' : '') + d.toFixed(1)) + '</td>' +
            '<td>' + j.done + ' / ' + j.items.length + '</td>' +
            '<td><span style="font-weight:700;color:' + statusColor[j.status] + ';">' + j.status + '</span></td></tr>';
        }).join('') +
        '<tr class="pivot-total"><td><b>TOTAL</b></td><td>' + bar(pct(tot), colorFor(pct(tot))) + '</td><td><b>' + (tgt === null ? '—' : pct(tgt) + '%') + '</b></td><td><b>' + (diff === null ? '—' : (diff >= 0 ? '+' : '') + diff.toFixed(1)) + '</b></td><td><b>' + done + ' / ' + I.length + '</b></td><td></td></tr>' +
      '</tbody></table></div>' +
      '<p class="section-title" style="margin:22px 0 4px;font-size:15px;">Detail Item</p>' +
      '<div class="filters"><input type="text" id="lpSearch" placeholder="Cari jalan / item…"><select id="lpFJalan" class="period-select">' + jalanOpts + '</select>' +
        '<select id="lpFStatus" class="period-select"><option value="">Semua Status</option><option value="done">Selesai</option><option value="run">Berjalan</option><option value="zero">Belum mulai</option></select><span class="count" id="lpCount"></span></div>' +
      '<div class="table-card" style="overflow-x:auto;"><table class="mbb-report-table"><thead><tr><th>Jalan</th><th>Item</th><th>Satuan</th><th>Plan</th><th>Aktual</th><th>Progress</th><th>Mulai</th><th>Selesai</th><th>Target</th></tr></thead><tbody id="lpItemBody"></tbody></table></div>' +
      '<p class="section-title" style="margin:22px 0 4px;font-size:15px;">Update Terakhir dari Mini Web</p>' +
      '<div class="table-card" style="overflow-x:auto;">' + updatesTable(lp.updates, 'Jalan') + '</div>';

    drawChart('lpChartJalan', 'bar', J.map(function(j){ return j.name; }), [
      { label: 'Progress', data: J.map(function(j){ return pct(j.prog); }), backgroundColor: '#16406F' },
      { label: 'Target', data: J.map(function(j){ return j.target === null ? null : pct(j.target); }), backgroundColor: '#c8102e' }
    ], { indexAxis: 'y', scales: { x: { beginAtZero: true, max: 100 } } });
    var labels = []; lp.items.forEach(function(i){ if (labels.indexOf(i.label) < 0) labels.push(i.label); });
    var perItem = labels.map(function(l){
      var a = lp.items.filter(function(i){ return i.label === l; });
      return pct(a.reduce(function(s, i){ return s + i.p; }, 0) / a.length);
    });
    drawChart('lpChartItem', 'bar', labels, [{ label: 'Progress (%)', data: perItem, backgroundColor: perItem.map(colorFor) }],
      { indexAxis: 'y', plugins: { legend: { display: false }, datalabels: { display: false } }, scales: { x: { beginAtZero: true, max: 100 } } });

    ['lpSearch', 'lpFJalan', 'lpFStatus'].forEach(function(id){ $(id).oninput = $(id).onchange = lpRenderItems; });
    lpRenderItems();
  }

  function lpFiltered(){
    var q = $('lpSearch').value.trim().toLowerCase(), j = $('lpFJalan').value, s = $('lpFStatus').value;
    return lp.items.filter(function(i){
      if (j && i.jalan !== j) return false;
      if (s === 'done' && i.p < 1) return false;
      if (s === 'zero' && i.p !== 0) return false;
      if (s === 'run' && !(i.p > 0 && i.p < 1)) return false;
      return !q || (i.jalan + ' ' + i.label).toLowerCase().indexOf(q) >= 0;
    });
  }
  function lpRenderItems(){
    var rows = lpFiltered();
    $('lpCount').textContent = rows.length + ' item';
    $('lpItemBody').innerHTML = rows.map(function(i){
      var p = pct(i.p);
      return '<tr><td class="name">' + esc(i.jalan) + '</td><td>' + esc(i.label) + '</td><td>' + esc(i.unit) + '</td><td>' + nf(i.plan) + '</td><td>' + nf(i.akt) + '</td>' +
        '<td>' + bar(p, colorFor(p)) + '</td><td>' + esc(i.start || '—') + '</td><td>' + esc(i.end || '—') + '</td><td>' + (i.target === null ? '—' : pct(i.target) + '%') + '</td></tr>';
    }).join('') || '<tr><td colspan="9" style="text-align:center;padding:30px;">Tidak ada data yang cocok.</td></tr>';
  }
  function lpDownload(){
    var q = function(v){ return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; };
    var csv = [['Jalan', 'Item', 'Satuan', 'Plan', 'Aktual', 'Progress %', 'Mulai', 'Selesai', 'Target %'].map(q).join(',')].concat(lpFiltered().map(function(i){
      return [i.jalan, i.label, i.unit, i.plan, i.akt, pct(i.p), i.start, i.end, i.target === null ? '' : pct(i.target)].map(q).join(',');
    })).join('\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })); a.download = 'QE_Lubuk_Pakam.csv'; a.click();
  }

  /* ============================================================
     DUSEM
     ============================================================ */
  var ds = { lops: [], updates: [], loadedAt: null };
  var dsOpen = {};

  function dsLabel(st){ return String(st || '').replace(/^\d+\s*/, '') || '—'; }
  function dsColor(st){
    var c = String(st).slice(0, 2);
    return (c === '08' || c === '07') ? '#167A4B' : (c === '06' ? '#2b6cb0' : (c === '05' ? '#d69e2e' : '#e07b39'));
  }
  function dsPct(l){
    if (!l.items.length) return null;
    return l.items.reduce(function(s, it){ return s + clamp01(it.aktual / it.plan); }, 0) / l.items.length;
  }
  function dsHost(){
    var page = $('pageQeDusem');
    if (!page.dataset.built){
      page.dataset.built = '1';
      page.innerHTML =
        '<div class="section" style="margin-top:0;">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">' +
            '<div><p class="section-title" style="margin-bottom:2px;">Dusem — Rekap Progress Material</p>' +
            '<p class="section-desc" style="margin:0;" id="dsSource">Memuat data…</p></div>' +
            '<div style="display:flex;gap:8px;flex-wrap:wrap;"><button type="button" class="refresh-btn" id="dsRefresh">↻ Muat ulang</button>' +
            '<button type="button" class="download-btn" id="dsDownload" style="margin-top:0;">📥 Download CSV</button></div>' +
          '</div>' +
          '<div id="dsBody"></div>' +
        '</div>';
      $('dsRefresh').onclick = function(){ cache = {}; qeDusemOpen(true); };
      $('dsDownload').onclick = dsDownload;
    }
  }
  async function qeDusemOpen(force){
    dsHost();
    var body = $('dsBody');
    if (force || !ds.loadedAt) body.innerHTML = '<div class="state-msg">Memuat data Dusem…</div>';
    try {
      var r = await Promise.all([api('dsStructure'), api('dsUpdates', '&limit=15')]);
      ds.lops = r[0].lops || []; ds.updates = r[1].updates || []; ds.loadedAt = new Date();
      dsRender();
    } catch (e) { errBox(body, e); }
  }
  function dsRender(){
    var L = ds.lops;
    var pairs = 0, sum = 0, full = 0;
    L.forEach(function(l){ l.items.forEach(function(it){ pairs++; sum += clamp01(it.aktual / it.plan); if (it.aktual >= it.plan) full++; }); });
    var tot = pairs ? sum / pairs : 0;
    var cnt = function(codes){ return L.filter(function(l){ return codes.indexOf(String(l.status).slice(0, 2)) >= 0; }).length; };
    var nilai = L.reduce(function(s, l){ return s + (l.nilai || 0); }, 0);
    $('dsSource').textContent = 'Sumber: sheet DUSEM & MATERIAL DUSEM · ' + L.length + ' LOP · dimuat ' + ds.loadedAt.toLocaleString('id-ID');

    var kpis = [
      ['Total LOP', L.length, '#0a2342'],
      ['Closed', cnt(['08', '07']), '#167A4B'],
      ['Instalasi', cnt(['06']), '#2b6cb0'],
      ['Perizinan / Matdel', cnt(['04', '05']), '#d69e2e'],
      ['Progres Material', pct(tot) + '%', '#805ad5', full + ' dari ' + pairs + ' material penuh'],
      ['Total Nilai', rp(nilai), '#16406F']
    ];
    var stOrder = {}; L.forEach(function(l){ stOrder[l.status] = 1; });
    var sts = Object.keys(stOrder).sort();
    var stoList = Array.from(new Set(L.map(function(l){ return l.sto; }))).sort();

    $('dsBody').innerHTML =
      '<div class="kpi-row">' + kpiHtml(kpis) + '</div>' +
      '<div style="margin-top:18px;display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:14px;">' +
        '<div class="chart-card"><h3>Status LOP</h3><div class="canvas-wrap" style="height:270px;"><canvas id="dsChartStatus"></canvas></div></div>' +
        '<div class="chart-card"><h3>Progres Material per LOP (%)</h3><div class="canvas-wrap" style="height:270px;"><canvas id="dsChartLop"></canvas></div></div>' +
      '</div>' +
      '<p class="section-title" style="margin:22px 0 4px;font-size:15px;">Rekap per LOP <span style="font-weight:400;font-size:12px;color:var(--text-dim);">(klik baris untuk detail)</span></p>' +
      '<div class="filters"><input type="text" id="dsSearch" placeholder="Cari nama LOP / detail…">' +
        '<select id="dsFStatus" class="period-select"><option value="">Semua Status</option>' + sts.map(function(s){ return '<option>' + esc(s) + '</option>'; }).join('') + '</select>' +
        '<select id="dsFSto" class="period-select"><option value="">Semua STO</option>' + stoList.map(function(s){ return '<option>' + esc(s) + '</option>'; }).join('') + '</select>' +
        '<span class="count" id="dsCount"></span></div>' +
      '<div class="table-card" style="overflow-x:auto;"><table class="mbb-report-table"><thead><tr><th>Nama LOP</th><th>STO</th><th>Status</th><th>Progres Material</th><th>Nilai</th><th>Detail Progress</th></tr></thead><tbody id="dsTableBody"></tbody></table></div>' +
      '<p class="section-title" style="margin:22px 0 4px;font-size:15px;">Rekap per Material (seluruh LOP)</p>' +
      '<div class="table-card" style="overflow-x:auto;"><table class="mbb-report-table"><thead><tr><th>Material</th><th>Satuan</th><th>Kebutuhan</th><th>Terpasang</th><th>Progres</th><th>LOP</th></tr></thead><tbody>' + dsMaterialRows() + '</tbody></table></div>' +
      '<p class="section-title" style="margin:22px 0 4px;font-size:15px;">Update Terakhir dari Mini Web</p>' +
      '<div class="table-card" style="overflow-x:auto;">' + updatesTable(ds.updates, 'LOP') + '</div>';

    var stCount = sts.map(function(s){ return L.filter(function(l){ return l.status === s; }).length; });
    drawChart('dsChartStatus', 'doughnut', sts.map(dsLabel), [{ data: stCount, backgroundColor: sts.map(dsColor) }],
      { plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } }, datalabels: { color: '#fff', font: { weight: 'bold', size: 11 }, formatter: function(v){ return v || ''; } } } });
    var withMat = L.filter(function(l){ return l.items.length; });
    var pv = withMat.map(function(l){ return pct(dsPct(l)); });
    drawChart('dsChartLop', 'bar', withMat.map(function(l){ return l.nama.replace(/^QE UTI RELOKASI\s*/, '').replace(/\s*AKIBAT PIPA GAS$/, ''); }),
      [{ label: 'Progres (%)', data: pv, backgroundColor: pv.map(colorFor) }],
      { indexAxis: 'y', plugins: { legend: { display: false }, datalabels: { display: false } }, scales: { x: { beginAtZero: true, max: 100 } } });

    ['dsSearch', 'dsFStatus', 'dsFSto'].forEach(function(id){ $(id).oninput = $(id).onchange = dsRenderTable; });
    dsRenderTable();
  }

  function dsMaterialRows(){
    var m = {}, order = [];
    ds.lops.forEach(function(l){
      l.items.forEach(function(it){
        if (!m[it.des]){ m[it.des] = { unit: it.unit, plan: 0, akt: 0, n: 0 }; order.push(it.des); }
        m[it.des].plan += it.plan; m[it.des].akt += Math.min(it.aktual, it.plan); m[it.des].n++;
      });
    });
    return order.map(function(d){
      var x = m[d], p = x.plan ? Math.round(x.akt / x.plan * 100) : 0;
      return '<tr><td class="name">' + esc(d) + '</td><td>' + esc(x.unit) + '</td><td>' + nf(x.plan) + '</td><td>' + nf(x.akt) + '</td><td>' + bar(p, colorFor(p)) + '</td><td>' + x.n + '</td></tr>';
    }).join('') || '<tr><td colspan="6" style="text-align:center;padding:24px;">Belum ada kebutuhan material.</td></tr>';
  }

  function dsFiltered(){
    var q = $('dsSearch').value.trim().toLowerCase(), s = $('dsFStatus').value, o = $('dsFSto').value;
    return ds.lops.filter(function(l){
      if (s && l.status !== s) return false;
      if (o && l.sto !== o) return false;
      return !q || (l.nama + ' ' + l.detail).toLowerCase().indexOf(q) >= 0;
    });
  }
  function dsLogHtml(t){
    return String(t || '').split('\n').map(function(x){ return x.trim().replace(/^"+|"+$/g, ''); }).filter(Boolean).map(function(x){
      var m = x.match(/^\(([^)]*)\)\s*(.*)$/);
      return m ? '<div style="padding:3px 0;border-bottom:1px solid var(--line);"><b style="color:var(--navy-2);margin-right:6px;">' + esc(m[1]) + '</b>' + esc(m[2]) + '</div>' : '<div style="padding:3px 0;">' + esc(x) + '</div>';
    }).join('') || '<span style="color:var(--text-dim);">Belum ada detail.</span>';
  }
  function dsRenderTable(){
    var rows = dsFiltered();
    $('dsCount').textContent = rows.length + ' LOP';
    var html = '';
    rows.forEach(function(l){
      var p = dsPct(l), pp = p === null ? null : pct(p), open = !!dsOpen[l.row];
      var first = (String(l.detail || '').split('\n').map(function(x){ return x.trim(); }).filter(Boolean)[0]) || '—';
      html += '<tr class="ds-row" data-row="' + l.row + '" style="cursor:pointer;"><td class="name">' + (open ? '▾ ' : '▸ ') + esc(l.nama) + '</td><td>' + esc(l.sto) + '</td>' +
        '<td><span style="font-weight:700;color:' + dsColor(l.status) + ';">' + esc(l.status || '—') + '</span></td>' +
        '<td>' + (pp === null ? '<span style="color:var(--text-dim);font-size:12px;">hanya jasa</span>' : bar(pp, colorFor(pp))) + '</td>' +
        '<td>' + rp(l.nilai) + '</td><td style="min-width:260px;max-width:380px;font-size:11.5px;color:var(--text-dim);">' + esc(first) + '</td></tr>';
      if (open){
        var mats = l.items.map(function(it){
          var q = pct(clamp01(it.aktual / it.plan));
          return '<tr><td>' + esc(it.des) + '</td><td>' + nf(it.aktual) + ' / ' + nf(it.plan) + ' ' + esc(it.unit) + '</td><td>' + bar(q, colorFor(q)) + '</td></tr>';
        }).join('') || '<tr><td colspan="3" style="color:var(--text-dim);">Belum ada kebutuhan material.</td></tr>';
        html += '<tr><td colspan="6" style="background:var(--panel-2,#f4f7fb);padding:14px 18px;">' +
          '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:18px;">' +
            '<div><div style="font-weight:700;margin-bottom:6px;">Progres Material</div><table class="mbb-report-table"><thead><tr><th>Material</th><th>Terpasang / Kebutuhan</th><th>Progres</th></tr></thead><tbody>' + mats + '</tbody></table></div>' +
            '<div><div style="font-weight:700;margin-bottom:6px;">Riwayat Detail Progress</div><div style="font-size:12px;line-height:1.5;max-height:300px;overflow-y:auto;">' + dsLogHtml(l.detail) + '</div></div>' +
          '</div></td></tr>';
      }
    });
    var tb = $('dsTableBody');
    tb.innerHTML = html || '<tr><td colspan="6" style="text-align:center;padding:30px;">Tidak ada data yang cocok.</td></tr>';
    Array.prototype.forEach.call(tb.querySelectorAll('.ds-row'), function(tr){
      tr.onclick = function(){ var k = tr.getAttribute('data-row'); dsOpen[k] = !dsOpen[k]; dsRenderTable(); };
    });
  }
  function dsDownload(){
    var q = function(v){ return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; };
    var lines = [['NO', 'STO', 'NAMA LOP', 'STATUS', 'NILAI', 'PROGRES %', 'MATERIAL (terpasang/kebutuhan)', 'DETAIL STATUS'].map(q).join(',')];
    dsFiltered().forEach(function(l){
      var p = dsPct(l);
      lines.push([l.no, l.sto, l.nama, l.status, l.nilai, p === null ? '' : pct(p),
        l.items.map(function(it){ return it.des + ' ' + it.aktual + '/' + it.plan; }).join('; '), l.detail].map(q).join(','));
    });
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + lines.join('\n')], { type: 'text/csv' })); a.download = 'QE_Dusem.csv'; a.click();
  }

  /* ============================================================
     Menu: grup QE (dropdown)
     ============================================================ */
  var GROUP = ['brt', 'qeLp', 'qeDusem'];
  window.qeMenuSync = function(active){
    var g = $('tabBtnQeGroup'), sub = $('qeSub');
    if (!g || !sub) return;
    var inGroup = GROUP.indexOf(active) >= 0;
    g.classList.toggle('active-parent', inGroup);
    if (inGroup){ sub.classList.add('open'); g.setAttribute('aria-expanded', 'true'); }
  };
  (function init(){
    var g = $('tabBtnQeGroup'), sub = $('qeSub');
    if (g && sub){
      g.onclick = function(){
        var o = sub.classList.toggle('open');
        g.setAttribute('aria-expanded', o ? 'true' : 'false');
      };
    }
    var b1 = $('tabBtnQeLp'), b2 = $('tabBtnQeDusem');
    if (b1) b1.onclick = function(){ switchTab('qeLp'); qeLpOpen(); };
    if (b2) b2.onclick = function(){ switchTab('qeDusem'); qeDusemOpen(); };
  })();
  window.qeLpOpen = qeLpOpen;
  window.qeDusemOpen = qeDusemOpen;
})();
