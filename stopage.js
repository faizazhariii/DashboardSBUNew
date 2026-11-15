/* Halaman "Master STO": daftar STO (kode, nama, regional, district) dari stomaster.js. */
(function(){
  'use strict';
  var host = document.getElementById('stoHost'); if(!host || !window.STO_MASTER) return;
  var esc = function(t){ return String(t == null ? '' : t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };
  var ROWS = window.STO_MASTER.rows.map(function(r){ return { kode: r[0], nama: r[1], reg: r[2], dist: r[3] }; });
  var PAL = ['#0B5CAB','#167A4B','#C27A0A','#7A6BCB','#D7141A','#0891B2'];
  var COLS = [ { k:'kode', l:'STO Code Location', t:'text' }, { k:'nama', l:'STO Description', t:'text' }, { k:'reg', l:'Regional', t:'sel' }, { k:'dist', l:'District', t:'sel' } ];
  var S = { q: '', dist: '', sort: { k: 'dist', dir: 1 }, cf: {}, lookup: '' };

  var st = document.createElement('style');
  st.textContent =
    '.sm .bgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px;margin-top:12px;}.sm .bc{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:14px;}.sm .bc h4{margin:0 0 10px;font-size:13px;font-weight:700;}' +
    '.sm .dnr{display:flex;gap:14px;align-items:center;}.sm .dn{position:relative;flex:0 0 auto;width:112px;height:112px;}.sm .dn svg{width:100%;height:100%;transform:rotate(-90deg);}' +
    '.sm .dn .c{position:absolute;inset:0;display:grid;place-content:center;text-align:center;}.sm .dn .c b{font-size:22px;line-height:1;}.sm .dn .c span{font-size:9.5px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.06em;margin-top:3px;}' +
    '.sm .lg{flex:1;min-width:0;}.sm .lgi{display:flex;align-items:center;gap:7px;font-size:12px;padding:4px 5px;border-radius:6px;cursor:pointer;}.sm .lgi:hover,.sm .lgi.on{background:var(--panel-2,#F5F7FA);}.sm .lgi i{width:9px;height:9px;border-radius:3px;flex:0 0 auto;}.sm .lgi span{flex:1;}.sm .lgi b{font-variant-numeric:tabular-nums;}' +
    '.sm .bl{display:flex;align-items:center;gap:8px;font-size:12px;padding:4px 0;cursor:pointer;}.sm .bl .n{width:120px;}.sm .bl .t{flex:1;height:8px;background:var(--line);border-radius:5px;overflow:hidden;}.sm .bl .t i{display:block;height:100%;border-radius:5px;}.sm .bl b{width:26px;text-align:right;}' +
    '.sm .tw{overflow:auto;max-height:560px;border:1px solid var(--line);border-radius:10px;margin-top:8px;}.sm table{width:100%;border-collapse:collapse;font-size:12.5px;user-select:text;}' +
    '.sm th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--text-dim);padding:8px 10px;white-space:nowrap;position:sticky;top:0;background:var(--panel);border-bottom:1px solid var(--line);}.sm th.sh{cursor:pointer;user-select:none}.sm th.sh.on{color:#0B5CAB}.sm .sar{font-size:9px;opacity:.7}' +
    '.sm tr.fr th{top:34px;padding:4px 6px 8px;border-bottom:2px solid var(--line)}.sm tr.fr input,.sm tr.fr select{width:100%;min-width:90px;font-size:11.5px;padding:4px 6px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--text);}' +
    '.sm td{padding:8px 10px;border-bottom:1px solid var(--line);}.sm tbody tr:hover td{background:var(--panel-2,#F5F7FA);}.sm .code{font-family:ui-monospace,monospace;font-weight:700;user-select:all;}' +
    '.sm .dtag{display:inline-block;padding:2px 9px;border-radius:99px;font-size:11px;font-weight:700;background:#E4EEFA;color:#0B5CAB;}' +
    '.sm .lk{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin-top:12px;}.sm .lk textarea{width:100%;min-height:54px;font:12.5px ui-monospace,monospace;padding:8px;border:1px solid var(--line);border-radius:8px;background:var(--panel);color:var(--text);box-sizing:border-box;}' +
    '.sm .lkr{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;}.sm .lkr span{padding:3px 10px;border-radius:8px;font-size:12px;background:#E1F4EA;color:#167A4B;font-weight:600;}.sm .lkr span.x{background:#FBE4E5;color:#D7141A;}';
  document.head.appendChild(st);

  var uniq = function(k){ var u = {}; ROWS.forEach(function(r){ u[r[k]] = 1; }); return Object.keys(u).sort(); };
  var tally = function(list, key){ var m = {}; list.forEach(function(r){ m[r[key]] = (m[r[key]] || 0) + 1; }); return Object.keys(m).map(function(k){ return [k, m[k]]; }).sort(function(a, b){ return b[1] - a[1]; }); };
  function filtered(){
    var q = S.q.trim().toLowerCase();
    return ROWS.filter(function(r){
      if(S.dist && r.dist !== S.dist) return false;
      if(q && (r.kode + ' ' + r.nama + ' ' + r.dist).toLowerCase().indexOf(q) < 0) return false;
      return COLS.every(function(c){ var f = S.cf[c.k]; if(!f) return true; return c.t === 'sel' ? r[c.k] === f : String(r[c.k]).toLowerCase().indexOf(f.toLowerCase()) >= 0; });
    });
  }
  function sorted(){ var k = S.sort.k, d = S.sort.dir; return filtered().slice().sort(function(a, b){ return (String(a[k]).localeCompare(String(b[k]), 'id') || a.kode.localeCompare(b.kode)) * d; }); }
  function donut(items){
    var tot = items.reduce(function(a, x){ return a + x[1]; }, 0) || 1, R = 46, C = 2 * Math.PI * R, acc = 0;
    var svg = '<svg viewBox="0 0 112 112"><circle cx="56" cy="56" r="46" fill="none" stroke="var(--line)" stroke-width="13"/>';
    items.forEach(function(x, i){ var len = x[1] / tot * C, gap = Math.min(2.5, len * .4); svg += '<circle cx="56" cy="56" r="46" fill="none" stroke="' + PAL[i % PAL.length] + '" stroke-width="13" stroke-dasharray="' + Math.max(len - gap, .1) + ' ' + C + '" stroke-dashoffset="' + (-acc) + '"/>'; acc += len; });
    return '<div class="dnr"><div class="dn">' + svg + '</svg><div class="c"><b>' + tot + '</b><span>STO</span></div></div><div class="lg">' + items.map(function(x, i){ return '<div class="lgi' + (x[0] === S.dist ? ' on' : '') + '" data-dist="' + esc(x[0]) + '"><i style="background:' + PAL[i % PAL.length] + '"></i><span>' + esc(x[0]) + '</span><b>' + x[1] + '</b></div>'; }).join('') + '</div></div>';
  }
  function lookup(){
    var codes = (S.lookup.toUpperCase().match(/[A-Z]{3}/g) || []), seen = {};
    return codes.filter(function(c){ if(seen[c]) return false; seen[c] = 1; return true; }).map(function(c){ var r = ROWS.filter(function(x){ return x.kode === c; })[0]; return r ? '<span>' + c + ' → ' + esc(r.dist) + ' · ' + esc(r.nama) + '</span>' : '<span class="x">' + c + ' tidak ada di master</span>'; }).join('');
  }
  function render(){
    var list = sorted(), bd = tally(ROWS, 'dist'), mx = bd[0][1];
    var h = '<div class="sm"><div class="section" style="margin-top:0;"><p class="section-title" style="margin:0;">Master STO</p><p class="section-desc" style="margin:2px 0 0;">Daftar STO Regional Sumbagut · data statis, update ' + esc(window.STO_MASTER.updated) + '</p>';
    h += '<div class="wo-summary" style="margin-top:12px;"><div class="wo-sum"><b>' + ROWS.length + '</b><span>Total STO</span></div>' + bd.map(function(x, i){ return '<div class="wo-sum" style="cursor:pointer" data-dist="' + esc(x[0]) + '"><b>' + x[1] + '</b><span>' + esc(x[0]) + '</span></div>'; }).join('') + '</div>';
    h += '<div class="bgrid"><div class="bc"><h4>Komposisi STO per District</h4>' + donut(bd) + '</div><div class="bc"><h4>Jumlah STO per District</h4>' + bd.map(function(x, i){ return '<div class="bl" data-dist="' + esc(x[0]) + '"><span class="n">' + esc(x[0]) + '</span><span class="t"><i style="width:' + (x[1] / mx * 100) + '%;background:' + PAL[i % PAL.length] + '"></i></span><b>' + x[1] + '</b></div>'; }).join('') + '</div></div>';
    h += '<div class="lk"><b style="font-size:13px">🔎 Cek STO → District</b><div class="section-desc" style="margin:2px 0 6px;">Tempel beberapa kode STO (3 huruf, dipisah spasi / koma / baris baru)</div><textarea id="stoLk" placeholder="contoh: PDN SBG KTN">' + esc(S.lookup) + '</textarea><div class="lkr" id="stoLkr">' + lookup() + '</div></div>';
    h += '<div class="wo-toolbar" style="margin-top:14px;"><input type="text" id="stoQ" placeholder="🔎 Cari kode / nama STO / district..." value="' + esc(S.q) + '">' + ((S.q || S.dist || Object.keys(S.cf).some(function(k){ return S.cf[k]; })) ? '<button type="button" class="btn" id="stoClr">✕ Reset filter</button>' : '') +
      '<button type="button" class="btn" id="stoCsv">⬇ CSV</button><button type="button" class="btn" id="stoXlsx">⬇ Excel</button><button type="button" class="btn" id="stoCopy" title="Salin tabel, bisa ditempel ke Excel">📋 Salin tabel</button><span class="count">' + list.length + ' dari ' + ROWS.length + ' STO</span></div>';
    h += '<div class="tw"><table><thead><tr>' + COLS.map(function(c){ var on = S.sort.k === c.k; return '<th class="sh' + (on ? ' on' : '') + '" data-sort="' + c.k + '">' + esc(c.l) + ' <span class="sar">' + (on ? (S.sort.dir > 0 ? '▲' : '▼') : '⇅') + '</span></th>'; }).join('') + '</tr><tr class="fr">' +
      COLS.map(function(c){ var v = S.cf[c.k] || ''; return c.t === 'sel' ? '<th><select data-cf="' + c.k + '"><option value="">Semua</option>' + uniq(c.k).map(function(o){ return '<option' + (o === v ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select></th>' : '<th><input type="text" data-cf="' + c.k + '" placeholder="filter…" value="' + esc(v) + '"></th>'; }).join('') + '</tr></thead><tbody>';
    if(!list.length) h += '<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--text-dim)">Tidak ada STO pada filter ini.</td></tr>';
    list.forEach(function(r){ h += '<tr><td><span class="code">' + esc(r.kode) + '</span></td><td>' + esc(r.nama) + '</td><td>' + esc(r.reg) + '</td><td><span class="dtag">' + esc(r.dist) + '</span></td></tr>'; });
    h += '</tbody></table></div></div></div>';
    host.innerHTML = h; bind();
  }
  var stamp = function(){ var d = new Date(), p = function(n){ return (n < 10 ? '0' : '') + n; }; return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()); };
  function bind(){
    host.querySelectorAll('[data-dist]').forEach(function(el){ el.onclick = function(){ S.dist = S.dist === el.dataset.dist ? '' : el.dataset.dist; render(); }; });
    host.querySelectorAll('th[data-sort]').forEach(function(th){ th.onclick = function(){ var k = th.dataset.sort; S.sort = S.sort.k === k ? { k: k, dir: -S.sort.dir } : { k: k, dir: 1 }; render(); }; });
    host.querySelectorAll('[data-cf]').forEach(function(el){
      var ch = function(){ S.cf[el.dataset.cf] = el.value; var key = el.dataset.cf, pos = el.selectionStart; render(); var n = host.querySelector('[data-cf="' + key + '"]'); if(n && n.tagName === 'INPUT'){ n.focus(); try{ n.setSelectionRange(pos, pos); }catch(e){} } };
      if(el.tagName === 'SELECT') el.onchange = ch; else el.oninput = ch;
    });
    var q = document.getElementById('stoQ'); if(q) q.oninput = function(){ S.q = this.value; var p = this.selectionStart; render(); var n = document.getElementById('stoQ'); n.focus(); n.setSelectionRange(p, p); };
    var lk = document.getElementById('stoLk'); if(lk) lk.oninput = function(){ S.lookup = this.value; document.getElementById('stoLkr').innerHTML = lookup(); };
    var cl = document.getElementById('stoClr'); if(cl) cl.onclick = function(){ S.q = ''; S.dist = ''; S.cf = {}; render(); };
    var H = ['STO Code Location', 'STO Description', 'Regional', 'District'], rows = function(){ return sorted().map(function(r){ return [r.kode, r.nama, r.reg, r.dist]; }); };
    var dl = function(blob, name){ var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 500); };
    var c1 = document.getElementById('stoCsv'); if(c1) c1.onclick = function(){ var q = function(v){ v = String(v); return /[",]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }; dl(new Blob(['﻿' + [H].concat(rows()).map(function(r){ return r.map(q).join(','); }).join('\r\n')], { type: 'text/csv;charset=utf-8' }), 'master-sto-' + stamp() + '.csv'); };
    var c2 = document.getElementById('stoXlsx'); if(c2) c2.onclick = function(){ if(!window.XLSX){ alert('Library Excel belum termuat, pakai tombol CSV.'); return; } var ws = XLSX.utils.aoa_to_sheet([H].concat(rows())); ws['!cols'] = [{ wch: 18 }, { wch: 30 }, { wch: 12 }, { wch: 20 }]; var wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Master STO'); XLSX.writeFile(wb, 'master-sto-' + stamp() + '.xlsx'); };
    var c3 = document.getElementById('stoCopy'); if(c3) c3.onclick = function(){ try{ navigator.clipboard.writeText([H].concat(rows()).map(function(r){ return r.join('\t'); }).join('\n')); c3.textContent = 'Tersalin ✓'; setTimeout(function(){ c3.textContent = '📋 Salin tabel'; }, 1200); }catch(e){} };
  }
  window.stoOpen = render;
})();
