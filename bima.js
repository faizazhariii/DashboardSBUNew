/* Halaman "Log BIMA": monitoring work order dari tab "Log BIMA" (gid 1146581535). */
(function(){
  'use strict';
  var host = document.getElementById('bimaHost'); if(!host) return;
  var SS = '1PGH5LCx2zyFn2ps8J9kJ93tc6KjnLc1Hof1F2SB8DBM', GID = '1146581535', GID_SS = '571717744';
  var urlsOf = function(gid){ return ['https://docs.google.com/spreadsheets/d/' + SS + '/gviz/tq?tqx=out:csv&gid=' + gid, 'https://docs.google.com/spreadsheets/d/' + SS + '/export?format=csv&gid=' + gid]; };
  var esc = function(t){ return String(t == null ? '' : t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };
  var S = { data: null, ssErr: '', ssMap: null, jt: '', err: '', q: '', dist: '', desc: '', tipe: '', produk: '', aging: '', sort: 'umur', open: {}, loaded: null };
  var PAL = ['#0B5CAB','#167A4B','#C27A0A','#7A6BCB','#D7141A','#0891B2','#DB2777','#65A30D'];
  var BUCKET = [['0-3','0–3 hari',0,3,'#167A4B'],['4-7','4–7 hari',4,7,'#0B5CAB'],['8-14','8–14 hari',8,14,'#C27A0A'],['15-30','15–30 hari',15,30,'#E8590C'],['30+','> 30 hari',31,99999,'#D7141A']];

  var st = document.createElement('style');
  st.textContent =
    '.bm .bgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px;margin-top:12px;}' +
    '.bm .bc{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:14px;}' +
    '.bm .bc h4{margin:0 0 10px;font-size:13px;font-weight:700;}' +
    '.bm .dnr{display:flex;gap:14px;align-items:center;}' +
    '.bm .dn{position:relative;flex:0 0 auto;width:112px;height:112px;}.bm .dn svg{width:100%;height:100%;transform:rotate(-90deg);}' +
    '.bm .dn .c{position:absolute;inset:0;display:grid;place-content:center;text-align:center;}.bm .dn .c b{font-size:22px;line-height:1;}.bm .dn .c span{font-size:9.5px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.06em;margin-top:3px;}' +
    '.bm .lg{flex:1;min-width:0;}.bm .lgi{display:flex;align-items:center;gap:7px;font-size:12px;padding:4px 5px;border-radius:6px;cursor:pointer;}.bm .lgi:hover,.bm .lgi.on{background:var(--panel-2,#F5F7FA);}' +
    '.bm .lgi i{width:9px;height:9px;border-radius:3px;flex:0 0 auto;}.bm .lgi span{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}.bm .lgi b{font-variant-numeric:tabular-nums;}' +
    '.bm .ag{display:flex;gap:8px;align-items:flex-end;height:130px;padding-top:6px;}.bm .agc{flex:1;text-align:center;cursor:pointer;display:flex;flex-direction:column;justify-content:flex-end;height:100%;border-radius:8px;}' +
    '.bm .agc.on{background:var(--panel-2,#F5F7FA);}.bm .agb{border-radius:5px 5px 0 0;min-height:3px;}.bm .agv{font-weight:700;font-size:13px;margin-bottom:4px;}.bm .agl{font-size:10.5px;color:var(--text-dim);margin-top:5px;font-weight:600;}' +
    '.bm .bl{display:flex;align-items:center;gap:8px;font-size:12px;padding:4px 0;cursor:pointer;}.bm .bl .n{width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}.bm .bl .t{flex:1;height:8px;background:var(--line);border-radius:5px;overflow:hidden;}' +
    '.bm .bl .t i{display:block;height:100%;border-radius:5px;background:#0B5CAB;}.bm .bl b{width:26px;text-align:right;}' +
    '.bm table{width:100%;border-collapse:collapse;font-size:12.5px;}.bm th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--text-dim);padding:8px 10px;border-bottom:2px solid var(--line);white-space:nowrap;position:sticky;top:0;background:var(--panel);}' +
    '.bm td{padding:9px 10px;border-bottom:1px solid var(--line);vertical-align:top;}.bm tr.r{cursor:pointer;}.bm tr.r:hover td{background:var(--panel-2,#F5F7FA);}' +
    '.bm .tw{overflow:auto;max-height:560px;border:1px solid var(--line);border-radius:10px;margin-top:8px;}' +
    '.bm .pill{display:inline-block;padding:2px 9px;border-radius:99px;font-size:11px;font-weight:700;white-space:nowrap;background:#E4EEFA;color:#0B5CAB;}.bm .pill.rv{background:#EFEAFB;color:#6B4FC4;}.bm .pill.mo{background:#FFF0D6;color:#C27A0A;}' +
    '.bm .age{font-weight:700;font-variant-numeric:tabular-nums;}.bm .age.a1{color:#167A4B}.bm .age.a2{color:#0B5CAB}.bm .age.a3{color:#C27A0A}.bm .age.a4{color:#E8590C}.bm .age.a5{color:#D7141A}' +
    '.bm tr.dt td{background:var(--panel-2,#F5F7FA);font-size:12px;color:var(--text-dim);}.bm tr.dt dl{display:grid;grid-template-columns:150px 1fr;gap:4px 12px;margin:0;}.bm tr.dt dt{font-weight:700;color:var(--text);}.bm tr.dt dd{margin:0;word-break:break-word;}' +
    '.bm .pill.jt1{background:#E1F4EA;color:#167A4B;cursor:pointer}.bm .pill.jt0{background:#FBE4E5;color:#D7141A;cursor:pointer}.bm .sub.sc{font-family:ui-monospace,monospace;}' +
    '.bm .sub{font-size:11.5px;color:var(--text-dim);margin-top:2px;}.bm .wo{font-family:ui-monospace,monospace;font-weight:700;}';
  document.head.appendChild(st);

  /* "2026-11-13 15:14:19.327" -> Date */
  function pd(s){ var m = String(s || '').match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/); return m ? new Date(+m[1], +m[2]-1, +m[3], +m[4], +m[5], +(m[6]||0)) : null; }
  var day0 = function(){ var d = new Date(); d.setHours(0,0,0,0); return d; };
  var diffDays = function(d){ if(!d) return -1; var x = new Date(d); x.setHours(0,0,0,0); return Math.max(0, Math.round((day0() - x) / 86400000)); };
  var fmtD = function(d){ if(!d) return '—'; var B = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']; var p = function(n){ return (n < 10 ? '0' : '') + n; }; return d.getDate() + ' ' + B[d.getMonth()] + ' ' + String(d.getFullYear()).slice(2) + ' ' + p(d.getHours()) + '.' + p(d.getMinutes()); };

  function parse(text){
    var rows = Papa.parse(text, { skipEmptyLines: true }).data; if(!rows.length) return [];
    var h = rows[0].map(function(x){ return String(x).trim().toLowerCase(); }), ix = function(n){ return h.indexOf(n.toLowerCase()); };
    if(ix('work order number') < 0) throw new Error('Header "Work Order Number" tidak ditemukan di tab Log BIMA');
    var g = function(r, n){ var i = ix(n); return i < 0 ? '' : String(r[i] == null ? '' : r[i]).trim(); };
    return rows.slice(1).filter(function(r){ return g(r, 'Work Order Number'); }).map(function(r){
      var c = pd(g(r, 'Date Created')), m = pd(g(r, 'Date Modified'));
      var o = {
        wo: g(r, 'Work Order Number'), sc: g(r, 'SC Order Number'), oss: g(r, 'OSS Order Id'), status: g(r, 'Status') || '—', desc: g(r, 'Description') || '—',
        owner: g(r, 'Owner Group'), produk: g(r, 'Productname') || '—', tipe: g(r, 'CRM Order Type') || '—', zone: g(r, 'Work Zone') || '—', dist: g(r, 'District TIF') || '—',
        cust: g(r, 'Customer Name') || '—', addr: g(r, 'Address'), kontrak: g(r, 'NO. Kontrak (KB/KL/L)'), ptype: g(r, 'Product Type'), cls: g(r, 'WO Class'),
        booking: g(r, 'Booking ID'), channel: g(r, 'Channel ID TSEL'), ordtsel: g(r, 'Order ID TSEL'), svc: g(r, 'Service Number'), c: c, m: m, sd: pd(g(r, 'Status Date'))
      };
      o.umur = diffDays(c); o.idle = diffDays(m);
      var a = BUCKET.filter(function(b){ return o.umur >= b[2] && o.umur <= b[3]; })[0]; o.bk = a ? a[0] : '30+';
      o.addrS = o.addr.replace(/\s+/g, ' ').slice(0, 90);
      return o;
    });
  }
  var scShort = function(sc){ var m = String(sc || '').match(/801Mg[0-9A-Za-z]+/); return m ? m[0] : String(sc || '').split('_')[0]; };
  var norm = function(x){ return String(x == null ? '' : x).replace(/\s+/g, ' ').trim().toLowerCase(); };
  /* tab "Gsheet SS": kolom AO (WAJIB ADA) berisi ID 801... -> peta ID -> info permintaan JT */
  function parseSS(text){
    var rows = Papa.parse(text, { skipEmptyLines: true }).data; if(!rows.length) return {};
    var h = rows[0].map(norm), ix = function(n){ return h.indexOf(n); }, iAO = ix('ao (wajib ada)');
    if(iAO < 0) throw new Error('Kolom "AO (WAJIB ADA)" tidak ditemukan di tab Gsheet SS');
    var cols = { cust:'customer', svc:'service / produk', lok:'lokasi/ link', am:'am', tgl:'tanggal input order', aju:'tanggal pengajuan permohonan approval', apr:'approval decision', prog:'progress', sub:'sub progress', out:'outstanding remarks', cap:'high cap / low cap' };
    var map = {};
    rows.slice(1).forEach(function(r, n){
      var ao = String(r[iAO] || ''); var ids = ao.match(/801Mg[0-9A-Za-z]+/g); if(!ids) return;
      var o = { row: n + 2, ao: ao.trim() }; Object.keys(cols).forEach(function(k){ var i = ix(cols[k]); o[k] = i < 0 ? '' : String(r[i] == null ? '' : r[i]).trim(); });
      ids.forEach(function(id){ if(!map[id]) map[id] = o; });
    });
    return map;
  }
  async function fetchCsv(gid){
    var last = null;
    for(var i = 0, u = urlsOf(gid); i < u.length; i++){
      try{
        var res = await fetch(u[i] + '&_=' + Date.now(), { cache: 'no-store' });
        if(!res.ok){ last = new Error('HTTP ' + res.status); continue; }
        var t = await res.text(); if(!t || t.trim().charAt(0) === '<'){ last = new Error('Sheet belum dibagikan / tab tidak terbaca'); continue; }
        return t;
      }catch(e){ last = e; }
    }
    throw last || new Error('gagal memuat');
  }
  async function load(){
    S.err = ''; S.ssErr = ''; render(true);
    var rb = await Promise.allSettled([fetchCsv(GID), fetchCsv(GID_SS)]);
    if(rb[0].status === 'fulfilled'){ try{ S.data = parse(rb[0].value); }catch(e){ S.err = e.message; S.data = S.data || []; } }
    else { S.data = S.data || []; S.err = (rb[0].reason && rb[0].reason.message) || 'gagal memuat Log BIMA'; }
    if(rb[1].status === 'fulfilled'){ try{ S.ssMap = parseSS(rb[1].value); }catch(e){ S.ssErr = e.message; S.ssMap = null; } }
    else { S.ssErr = 'Gsheet SS: ' + ((rb[1].reason && rb[1].reason.message) || 'gagal memuat'); S.ssMap = null; }
    S.loaded = new Date(); applyJT(); render();
  }
  function applyJT(){ (S.data || []).forEach(function(r){ r.sc1 = scShort(r.sc); r.ss = S.ssMap ? (S.ssMap[r.sc1] || null) : undefined; r.jt = r.ss === undefined ? 'na' : (r.ss ? 'ada' : 'belum'); }); }
  function filtered(skip){
    var q = S.q.trim().toLowerCase();
    return (S.data || []).filter(function(r){
      return (skip === 'dist' || !S.dist || r.dist === S.dist) && (skip === 'desc' || !S.desc || r.desc === S.desc) && (skip === 'tipe' || !S.tipe || r.tipe === S.tipe) &&
        (skip === 'produk' || !S.produk || r.produk === S.produk) && (skip === 'aging' || !S.aging || r.bk === S.aging) && (skip === 'jt' || !S.jt || r.jt === S.jt) &&
        (!q || (r.wo + ' ' + r.cust + ' ' + r.dist + ' ' + r.zone + ' ' + r.addr + ' ' + r.oss + ' ' + r.sc).toLowerCase().indexOf(q) >= 0);
    });
  }
  function tally(list, key){ var m = {}; list.forEach(function(r){ m[r[key]] = (m[r[key]] || 0) + 1; }); return Object.keys(m).map(function(k){ return [k, m[k]]; }).sort(function(a, b){ return b[1] - a[1]; }); }
  function donut(items, key, cur, label){
    var col = function(x, i){ return key === 'jtl' ? (x[0] === 'Ada permintaan JT' ? '#167A4B' : '#D7141A') : PAL[i % PAL.length]; };
    var tot = items.reduce(function(a, x){ return a + x[1]; }, 0) || 1, R = 46, C = 2 * Math.PI * R, acc = 0;
    var svg = '<svg viewBox="0 0 112 112"><circle cx="56" cy="56" r="' + R + '" fill="none" stroke="var(--line)" stroke-width="13"/>';
    items.forEach(function(x, i){ var len = x[1] / tot * C, gap = items.length > 1 ? Math.min(2.5, len * .4) : 0;
      svg += '<circle cx="56" cy="56" r="' + R + '" fill="none" stroke="' + col(x, i) + '" stroke-width="13" stroke-dasharray="' + Math.max(len - gap, .1) + ' ' + C + '" stroke-dashoffset="' + (-acc) + '"/>'; acc += len; });
    var lg = items.slice(0, 7).map(function(x, i){ return '<div class="lgi' + (x[0] === cur ? ' on' : '') + '" data-k="' + key + '" data-v="' + esc(x[0]) + '"><i style="background:' + col(x, i) + '"></i><span title="' + esc(x[0]) + '">' + esc(x[0]) + '</span><b>' + x[1] + '</b></div>'; }).join('');
    return '<div class="dnr"><div class="dn">' + svg + '</svg><div class="c"><b>' + tot + '</b><span>' + label + '</span></div></div><div class="lg">' + lg + '</div></div>';
  }
  function jtCell(r){
    if(r.jt === 'na') return '<span class="sub">tidak terbaca</span>';
    if(r.jt === 'ada') return '<span class="pill jt1" data-jt="ada" title="Klik untuk filter">✔ Ada permintaan JT</span>' + (r.ss.apr ? '<div class="sub">' + esc(r.ss.apr) + (r.ss.prog ? ' · ' + esc(r.ss.prog) : '') + '</div>' : (r.ss.prog ? '<div class="sub">' + esc(r.ss.prog) + '</div>' : ''));
    return '<span class="pill jt0" data-jt="belum" title="Klik untuk filter">✖ Belum ada di Gsheet SS</span>';
  }
  function ssDetail(r){
    if(!r.ss) return '';
    var x = r.ss, f = function(l, v){ return v ? '<dt>' + l + '</dt><dd>' + esc(v) + '</dd>' : ''; };
    return '<dt style="grid-column:1/-1;margin-top:6px;color:#167A4B">Data Gsheet SS (baris ' + x.row + ')</dt>' + f('Customer', x.cust) + f('Service / Produk', x.svc) + f('Lokasi / Link', x.lok) + f('AM', x.am) + f('Tanggal input order', x.tgl) + f('Pengajuan approval', x.aju) + f('Approval Decision', x.apr) + f('High / Low Cap', x.cap) + f('Progress', x.prog) + f('Sub Progress', x.sub) + f('Outstanding Remarks', x.out);
  }
  var ageCls = function(d){ return d <= 3 ? 'a1' : d <= 7 ? 'a2' : d <= 14 ? 'a3' : d <= 30 ? 'a4' : 'a5'; };

  function render(loading){
    var h = '<div class="bm"><div class="section" style="margin-top:0;"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;"><div><p class="section-title" style="margin:0;">Log BIMA</p><p class="section-desc" style="margin:2px 0 0;">Monitoring work order dari tab <b>Log BIMA</b>' + (S.loaded ? ' · diperbarui ' + fmtD(S.loaded) : '') + '</p></div><button type="button" class="btn" id="bmRefresh">↻ Muat ulang</button></div>';
    if(loading && !S.data){ host.innerHTML = h + '<p class="section-desc">Memuat...</p></div></div>'; return; }
    if(S.err) h += '<div class="active-filter-badge" style="display:flex;background:#FBE4E5;color:#D7141A;margin-top:10px;">⚠ ' + esc(S.err) + '</div>';
    if(S.ssErr) h += '<div class="active-filter-badge" style="display:flex;background:#FFF0D6;color:#C27A0A;margin-top:10px;">⚠ Status permintaan JT tidak bisa dicek: ' + esc(S.ssErr) + '</div>';
    var all = S.data || [];
    if(!all.length){ host.innerHTML = h + '<div class="card" style="margin-top:12px;padding:18px;"><b>Belum ada data.</b><div class="section-desc">Tab Log BIMA kosong atau belum bisa dibaca.</div></div></div></div>'; bind(); return; }
    var list = filtered();
    var cnt = function(f){ return list.filter(f).length; };
    var avg = list.length ? Math.round(list.reduce(function(a, r){ return a + r.umur; }, 0) / list.length) : 0;
    var oldest = list.slice().sort(function(a, b){ return b.umur - a.umur; })[0];
    h += '<div class="wo-summary" style="margin-top:12px;">' +
      '<div class="wo-sum"><b>' + list.length + '</b><span>Total WO</span></div>' +
      '<div class="wo-sum p"><b>' + cnt(function(r){ return /review/i.test(r.desc); }) + '</b><span>Review LME</span></div>' +
      '<div class="wo-sum"><b>' + cnt(function(r){ return /inventory/i.test(r.desc); }) + '</b><span>Inventory LME</span></div>' +
      '<div class="wo-sum g"><b>' + cnt(function(r){ return /new/i.test(r.tipe); }) + '</b><span>New Install</span></div>' +
      '<div class="wo-sum o"><b>' + cnt(function(r){ return /modify/i.test(r.tipe); }) + '</b><span>Modify</span></div>' +
      '<div class="wo-sum o"><b>' + avg + ' hr</b><span>Rata-rata umur</span></div>' +
      '<div class="wo-sum g"><b>' + cnt(function(r){ return r.jt === 'ada'; }) + '</b><span>Ada permintaan JT dari SS</span></div>' +
      '<div class="wo-sum d"><b>' + cnt(function(r){ return r.jt === 'belum'; }) + '</b><span>Belum ada di Gsheet SS</span></div>' +
      '<div class="wo-sum d"><b>' + cnt(function(r){ return r.umur > 14; }) + '</b><span>Umur &gt; 14 hari</span></div>' +
      '<div class="wo-sum d"><b>' + (oldest ? oldest.umur + ' hr' : '—') + '</b><span>Paling lama</span></div></div>';

    var base = filtered('x');
    h += '<div class="bgrid">' +
      '<div class="bc"><h4>Tahap (Description)</h4>' + donut(tally(filtered('desc'), 'desc'), 'desc', S.desc, 'WO') + '</div>' +
      '<div class="bc"><h4>District TIF</h4>' + donut(tally(filtered('dist'), 'dist'), 'dist', S.dist, 'WO') + '</div>' +
      '<div class="bc"><h4>Tipe Order</h4>' + donut(tally(filtered('tipe'), 'tipe'), 'tipe', S.tipe, 'WO') + '</div>' +
      '<div class="bc"><h4>Produk</h4>' + donut(tally(filtered('produk'), 'produk'), 'produk', S.produk, 'WO') + '</div>' +
      '<div class="bc"><h4>Permintaan JT dari SS</h4>' + donut(tally(filtered('jt').filter(function(r){ return r.jt !== 'na'; }).map(function(r){ return { jt: r.jt === 'ada' ? 'Ada permintaan JT' : 'Belum ada di Gsheet SS' }; }), 'jt'), 'jtl', S.jt === 'ada' ? 'Ada permintaan JT' : (S.jt === 'belum' ? 'Belum ada di Gsheet SS' : ''), 'WO') + '</div>' +
      '<div class="bc"><h4>Umur WO <small style="font-weight:500;color:var(--text-dim)">(sejak dibuat)</small></h4><div class="ag">' + (function(){
        var fl = filtered('aging'), mx = 1, cs = BUCKET.map(function(b){ var n = fl.filter(function(r){ return r.bk === b[0]; }).length; mx = Math.max(mx, n); return n; });
        return BUCKET.map(function(b, i){ return '<div class="agc' + (S.aging === b[0] ? ' on' : '') + '" data-k="aging" data-v="' + b[0] + '"><div class="agv">' + cs[i] + '</div><div class="agb" style="height:' + (cs[i] / mx * 78) + '%;background:' + b[4] + '"></div><div class="agl">' + b[1] + '</div></div>'; }).join('');
      })() + '</div></div>' +
      '<div class="bc"><h4>Customer teratas</h4>' + (function(){
        var t = tally(list, 'cust').slice(0, 7), mx = t.length ? t[0][1] : 1;
        return t.map(function(x){ return '<div class="bl" data-k="q" data-v="' + esc(x[0]) + '"><span class="n" title="' + esc(x[0]) + '">' + esc(x[0]) + '</span><span class="t"><i style="width:' + (x[1] / mx * 100) + '%"></i></span><b>' + x[1] + '</b></div>'; }).join('');
      })() + '</div></div>';

    h += '<div class="wo-toolbar" style="margin-top:14px;"><input type="text" id="bmSearch" placeholder="🔎 Cari WO / customer / district / alamat..." value="' + esc(S.q) + '">' +
      '<select id="bmSort"><option value="umur"' + (S.sort === 'umur' ? ' selected' : '') + '>Urut: Umur terlama</option><option value="baru"' + (S.sort === 'baru' ? ' selected' : '') + '>Urut: Terbaru dibuat</option><option value="idle"' + (S.sort === 'idle' ? ' selected' : '') + '>Urut: Lama tak diubah</option></select>' +
      ((S.dist || S.desc || S.tipe || S.produk || S.aging || S.jt || S.q) ? '<button type="button" class="btn" id="bmClear">✕ Reset filter</button>' : '') + '<span class="count">' + list.length + ' dari ' + all.length + ' WO</span></div>';
    var rows = list.slice().sort(function(a, b){ return S.sort === 'baru' ? a.umur - b.umur : (S.sort === 'idle' ? b.idle - a.idle : b.umur - a.umur); });
    h += '<div class="tw"><table><thead><tr><th>Work Order</th><th>Permintaan JT dari SS</th><th>Customer</th><th>District / STO</th><th>Produk</th><th>Tipe</th><th>Tahap</th><th>Dibuat</th><th>Umur</th><th>Terakhir diubah</th></tr></thead><tbody>';
    if(!rows.length) h += '<tr><td colspan="10" style="text-align:center;padding:20px;color:var(--text-dim)">Tidak ada WO pada filter ini.</td></tr>';
    rows.forEach(function(r){
      var op = S.open[r.wo];
      h += '<tr class="r" data-wo="' + esc(r.wo) + '"><td><span class="wo">' + esc(r.wo) + '</span><div class="sub sc" title="SC Order">' + esc(r.sc1) + '</div></td><td>' + jtCell(r) + '</td><td><b>' + esc(r.cust) + '</b><div class="sub">' + esc(r.addrS) + '</div></td>' +
        '<td>' + esc(r.dist) + '<div class="sub">STO ' + esc(r.zone) + '</div></td><td>' + esc(r.produk) + '</td><td>' + esc(r.tipe) + '</td>' +
        '<td><span class="pill ' + (/review/i.test(r.desc) ? 'rv' : (/modify/i.test(r.tipe) ? 'mo' : '')) + '">' + esc(r.desc) + '</span><div class="sub">' + esc(r.status) + '</div></td>' +
        '<td>' + fmtD(r.c) + '</td><td><span class="age ' + ageCls(r.umur) + '">' + r.umur + ' hr</span></td><td>' + fmtD(r.m) + '<div class="sub">' + (r.idle === 0 ? 'hari ini' : r.idle + ' hr lalu') + '</div></td></tr>';
      if(op) h += '<tr class="dt"><td colspan="10"><dl><dt>Alamat</dt><dd>' + esc(r.addr) + '</dd><dt>SC Order Number</dt><dd>' + esc(r.sc) + '</dd><dt>OSS Order Id</dt><dd>' + esc(r.oss) + '</dd><dt>Owner Group</dt><dd>' + esc(r.owner) + '</dd><dt>Product Type</dt><dd>' + esc(r.ptype) + '</dd><dt>WO Class</dt><dd>' + esc(r.cls) + '</dd><dt>Status Date</dt><dd>' + fmtD(r.sd) + '</dd>' +
        (r.kontrak && r.kontrak.replace(/[-\s|]/g, '') ? '<dt>No. Kontrak</dt><dd>' + esc(r.kontrak) + '</dd>' : '') + (r.ordtsel ? '<dt>Order ID TSEL</dt><dd>' + esc(r.ordtsel) + '</dd>' : '') + '<dt>SC Order (lengkap)</dt><dd>' + esc(r.sc) + '</dd>' + ssDetail(r) + '</dl></td></tr>';
    });
    h += '</tbody></table></div></div></div>';
    host.innerHTML = h; bind();
  }
  function bind(){
    var rf = document.getElementById('bmRefresh'); if(rf) rf.onclick = load;
    host.querySelectorAll('[data-k]').forEach(function(el){ el.onclick = function(){
      var k = el.dataset.k, v = el.dataset.v; if(k === 'jtl'){ var nv = v === 'Ada permintaan JT' ? 'ada' : 'belum'; S.jt = S.jt === nv ? '' : nv; } else if(k === 'q'){ S.q = S.q === v ? '' : v; } else { S[k] = S[k] === v ? '' : v; } render(); }; });
    host.querySelectorAll('[data-jt]').forEach(function(el){ el.onclick = function(e){ e.stopPropagation(); S.jt = S.jt === el.dataset.jt ? '' : el.dataset.jt; render(); }; });
    var q = document.getElementById('bmSearch'); if(q) q.oninput = function(){ S.q = this.value; var p = this.selectionStart; render(); var n = document.getElementById('bmSearch'); n.focus(); n.setSelectionRange(p, p); };
    var so = document.getElementById('bmSort'); if(so) so.onchange = function(){ S.sort = this.value; render(); };
    var cl = document.getElementById('bmClear'); if(cl) cl.onclick = function(){ S.q = S.dist = S.desc = S.tipe = S.produk = S.aging = S.jt = ''; render(); };
    host.querySelectorAll('tr.r').forEach(function(tr){ tr.onclick = function(){ var w = tr.dataset.wo; S.open[w] = !S.open[w]; render(); }; });
  }
  window.bimaOpen = function(){ if(!S.data || !S.loaded || (new Date() - S.loaded) > 300000) load(); else render(); };
})();
