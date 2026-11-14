/* Kebutuhan Port OLT (PT3 TA + FH, komitmen bulan berjalan) vs Idle Port per STO.
   Kebutuhan per LoP = ceil(Port Plan / 32), minimal 1. Relasi data = STO. */
(function(){
  'use strict';
  if(!window.IDLE_PORT) return;
  var host = document.getElementById('needOltCaptureArea'); if(!host) return;
  var esc = function(t){ return String(t == null ? '' : t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };
  var S = { month: new Date().getMonth(), basis: 'ogp', flt: 'all', q: '', sort: 'selisih' };
  var MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  var num = function(v){ var n = parseFloat(String(v || '').replace(/[^\d.,-]/g,'').replace(/\.(?=\d{3}(\D|$))/g,'').replace(',','.')); return isNaN(n) ? 0 : n; };
  var need = function(pp){ return Math.max(1, Math.ceil(pp / 32)); };
  var fmt = function(n){ return Number(n).toLocaleString('id-ID'); };

  /* idle per STO */
  var idleBy = {};
  window.IDLE_PORT.rows.forEach(function(r){
    var k = r[1]; var o = idleBy[k] || (idleBy[k] = { witel:r[0], sto:k, idle:0, total:0, zte:0, hw:0, olts:[] });
    o.idle += r[6]; o.total += r[5]; if(/ZTE/i.test(r[2])) o.zte += r[6]; else o.hw += r[6];
    o.olts.push({ merk:r[2], ne:r[3], lokasi:r[4], total:r[5], idle:r[6] });
  });

  var sec = document.createElement('div'); sec.className = 'section'; sec.id = 'oltCapSection';
  sec.innerHTML =
    '<p class="section-title" data-ic="🔌">Kebutuhan Port OLT vs Idle Port per STO</p>' +
    '<p class="section-desc">Kebutuhan = Port Plan ÷ 32 dibulatkan ke atas (minimal 1 per LoP), dari komitmen golive PT3 TA + PT3 FH. Dibandingkan dengan Idle Port OLT (ZTE + Huawei) di STO yang sama. Data idle port update <b id="oltCapUpd"></b>.</p>' +
    '<div class="wo-quick" id="oltCapBasis"><span class="wo-ql">Basis:</span><button type="button" class="on" data-b="ogp">Belum Golive (OGP)</button><button type="button" data-b="all">Semua Komitmen</button><span class="wo-sep"></span>' +
    '<select id="oltCapMonth" class="period-select"></select></div>' +
    '<div class="wo-summary" id="oltCapSum"></div>' +
    '<div class="wo-quick" id="oltCapFlt"><span class="wo-ql">Tampilkan:</span><button type="button" class="on" data-f="all">Semua STO</button><button type="button" data-f="kurang">🔴 Kurang</button><button type="button" data-f="cukup">🟢 Cukup</button><button type="button" data-f="nodata">⚪ Tanpa data idle</button></div>' +
    '<div class="wo-toolbar"><input type="text" id="oltCapSearch" placeholder="🔎 Cari STO / Branch..."><span class="count" id="oltCapCount"></span><div class="wo-tools"><button type="button" class="download-btn capture-hide" id="oltCapDl" style="margin:0;">📥 Download CSV</button></div></div>' +
    '<div class="wo-scroll" style="max-height:480px;"><table class="wo-table"><thead><tr id="oltCapHead"></tr></thead><tbody id="oltCapBody"></tbody></table></div>';
  var first = host.querySelector('.section'); first.parentNode.insertBefore(sec, first.nextSibling);
  document.getElementById('oltCapUpd').textContent = window.IDLE_PORT.updated;
  var msel = document.getElementById('oltCapMonth');
  msel.innerHTML = MONTHS.map(function(m,i){ return '<option value="' + i + '">' + m + '</option>'; }).join(''); msel.value = S.month;

  var COLS = [['witel','Branch'],['sto','STO'],['ta','LoP TA'],['fh','LoP FH'],['pp','Port Plan'],['need','Kebutuhan'],['zte','Idle ZTE'],['hw','Idle HW'],['idle','Idle Total'],['selisih','Selisih'],['status','Status']];
  var head = document.getElementById('oltCapHead');
  head.innerHTML = COLS.map(function(c){ return '<th data-k="' + c[0] + '" style="cursor:pointer" title="Urutkan">' + c[1] + (S.sort === c[0] ? ' ↑' : '') + '</th>'; }).join('');
  head.onclick = function(e){ var th = e.target.closest('th'); if(!th) return; S.sort = th.dataset.k; head.querySelectorAll('th').forEach(function(x,i){ x.textContent = COLS[i][1] + (COLS[i][0] === S.sort ? ' ↑' : ''); }); render(); };

  function collect(){
    var by = {}, t0 = new Date().getFullYear();
    var add = function(rows, get, label, kind){
      (rows || []).forEach(function(r){
        var d = parseDMY(get(r,'KOMITMEN GOLIVE')); if(!d || d.getFullYear() !== t0 || d.getMonth() !== S.month) return;
        var cat = hemCategoryOfLabel(pt3GlStage(label(r)));
        if(S.basis === 'ogp' && cat !== 'ogp') return;
        var sto = (get(r,'STO') || '').trim().toUpperCase(); if(!sto) return;
        var pp = num(get(r,'PORT PLAN')), n = need(pp);
        var o = by[sto] || (by[sto] = { sto:sto, witel:(get(r,'BRANCH FMC') || '').toUpperCase(), ta:0, fh:0, pp:0, need:0, lops:[] });
        o[kind]++; o.pp += pp; o.need += n;
        o.lops.push({ src: kind === 'ta' ? 'PT3 TA' : 'PT3 FH', id:get(r,'ID-IHLD'), nama:get(r,'NAMA LOP'), pp:pp, n:n, komit:get(r,'KOMITMEN GOLIVE'), status:get(r,'Status') });
      });
    };
    if(typeof pt3Rows !== 'undefined') add(pt3Rows, pt3Get, pt3RowStatusLabel, 'ta');
    if(typeof pt3fhRows !== 'undefined') add(pt3fhRows, pt3fhGet, pt3fhRowStatusLabel, 'fh');
    return Object.keys(by).map(function(k){
      var o = by[k], i = idleBy[k];
      o.zte = i ? i.zte : 0; o.hw = i ? i.hw : 0; o.idle = i ? i.idle : 0; o.has = !!i; o.olts = i ? i.olts : [];
      if(!o.witel && i) o.witel = i.witel;
      o.selisih = o.idle - o.need;
      o.status = !o.has ? 'nodata' : (o.selisih >= 0 ? 'cukup' : 'kurang');
      return o;
    });
  }
  var rowsNow = [];
  function render(){
    var all = collect(), q = S.q.trim().toLowerCase();
    var kurang = all.filter(function(o){ return o.status === 'kurang'; }), cukup = all.filter(function(o){ return o.status === 'cukup'; }), nod = all.filter(function(o){ return o.status === 'nodata'; });
    var tot = function(a, k){ return a.reduce(function(s,o){ return s + o[k]; }, 0); };
    var kekurangan = kurang.reduce(function(s,o){ return s + (o.need - o.idle); }, 0);
    document.getElementById('oltCapSum').innerHTML =
      '<div class="wo-sum"><b>' + all.length + '</b><span>STO dengan komitmen</span></div>' +
      '<div class="wo-sum o"><b>' + fmt(tot(all,'need')) + '</b><span>Total kebutuhan port</span></div>' +
      '<div class="wo-sum g"><b>' + fmt(tot(all,'idle')) + '</b><span>Idle port (STO tsb)</span></div>' +
      '<div class="wo-sum d"><b>' + kurang.length + '</b><span>STO kurang</span></div>' +
      '<div class="wo-sum d"><b>' + fmt(kekurangan) + '</b><span>Total kekurangan port</span></div>' +
      '<div class="wo-sum g"><b>' + cukup.length + '</b><span>STO cukup</span></div>' +
      (nod.length ? '<div class="wo-sum"><b>' + nod.length + '</b><span>STO tanpa data idle</span></div>' : '');
    var rows = all.filter(function(o){ return (S.flt === 'all' || o.status === S.flt) && (!q || (o.sto + ' ' + o.witel).toLowerCase().indexOf(q) >= 0); });
    var k = S.sort, asc = (k === 'witel' || k === 'sto' || k === 'status' || k === 'selisih');
    rows.sort(function(a,b){ var x = a[k], y = b[k]; var c = typeof x === 'number' ? (k === 'selisih' ? x - y : y - x) : String(x).localeCompare(String(y)); return c || (b.need - a.need); });
    rowsNow = rows;
    document.getElementById('oltCapCount').textContent = rows.length + ' STO';
    var pill = { kurang:'<span class="wo-pill drop">KURANG</span>', cukup:'<span class="wo-pill golive">CUKUP</span>', nodata:'<span class="wo-pill hold">TANPA DATA</span>' };
    document.getElementById('oltCapBody').innerHTML = rows.map(function(o, i){
      var sel = o.has ? (o.selisih >= 0 ? '+' + fmt(o.selisih) : '−' + fmt(-o.selisih)) : '—';
      var col = o.status === 'kurang' ? 'var(--red)' : (o.status === 'cukup' ? 'var(--emerald)' : 'var(--text-faint)');
      return '<tr data-i="' + i + '" class="c-' + (o.status === 'kurang' ? 'drop' : (o.status === 'cukup' ? 'golive' : 'hold')) + '" style="cursor:pointer"><td>' + esc(o.witel) + '</td><td><b>' + esc(o.sto) + '</b></td><td class="num">' + (o.ta || '—') + '</td><td class="num">' + (o.fh || '—') + '</td><td class="num">' + fmt(o.pp) + '</td><td class="num"><b>' + fmt(o.need) + '</b></td><td class="num">' + (o.has ? fmt(o.zte) : '—') + '</td><td class="num">' + (o.has ? fmt(o.hw) : '—') + '</td><td class="num"><b>' + (o.has ? fmt(o.idle) : '—') + '</b></td><td class="num" style="color:' + col + ';font-weight:700">' + sel + '</td><td>' + pill[o.status] + '</td></tr>';
    }).join('') || '<tr><td colspan="11" style="text-align:center;padding:24px;cursor:default;">Tidak ada komitmen golive PT3 di bulan ini.</td></tr>';
  }

  /* detail */
  function openDetail(o){
    var old = document.getElementById('oltCapDr'); if(old) old.remove();
    var bg = document.createElement('div'); bg.id = 'oltCapDr'; bg.className = 'wo-drawer-bg open';
    var dr = document.createElement('div'); dr.className = 'wo-drawer open';
    var close = function(){ bg.remove(); dr.remove(); };
    bg.onclick = close;
    dr.innerHTML = '<div class="hd"><div><h3>STO ' + esc(o.sto) + ' — ' + esc(o.witel) + '</h3><div style="margin-top:6px;font-size:12.5px;">Kebutuhan <b>' + fmt(o.need) + '</b> · Idle <b>' + (o.has ? fmt(o.idle) : '—') + '</b> · Selisih <b>' + (o.has ? (o.selisih >= 0 ? '+' : '−') + fmt(Math.abs(o.selisih)) : '—') + '</b></div></div><button type="button" id="oltCapX">✕</button></div><div class="bd">' +
      '<p style="font-weight:700;font-size:13px;margin:0 0 6px;">LoP yang dikomitmenkan (' + o.lops.length + ')</p><table class="wo-table dense" style="margin-bottom:14px;"><thead><tr><th>Sumber</th><th>ID</th><th>Nama LoP</th><th>Port Plan</th><th>Butuh</th><th>Komitmen</th></tr></thead><tbody>' +
      o.lops.map(function(l){ return '<tr style="cursor:default"><td>' + l.src + '</td><td>' + esc(l.id) + '</td><td class="name">' + esc(l.nama) + '</td><td class="num">' + fmt(l.pp) + '</td><td class="num"><b>' + l.n + '</b></td><td>' + esc(l.komit) + '</td></tr>'; }).join('') + '</tbody></table>' +
      '<p style="font-weight:700;font-size:13px;margin:0 0 6px;">OLT di STO ini (' + o.olts.length + ')</p>' +
      (o.olts.length ? '<table class="wo-table dense"><thead><tr><th>Merk</th><th>Hostname</th><th>Lokasi</th><th>Total Port</th><th>Idle</th></tr></thead><tbody>' + o.olts.map(function(t){ return '<tr style="cursor:default"><td>' + esc(t.merk) + '</td><td>' + esc(t.ne) + '</td><td>' + esc(t.lokasi) + '</td><td class="num">' + fmt(t.total) + '</td><td class="num"><b>' + fmt(t.idle) + '</b></td></tr>'; }).join('') + '</tbody></table>' : '<div style="color:var(--text-faint);font-size:12.5px;">STO ini tidak ditemukan di data idle port (cek penulisan nama STO).</div>') + '</div>';
    document.body.appendChild(bg); document.body.appendChild(dr);
    dr.querySelector('#oltCapX').onclick = close;
  }
  document.getElementById('oltCapBody').onclick = function(e){ var tr = e.target.closest('tr[data-i]'); if(tr) openDetail(rowsNow[+tr.dataset.i]); };

  /* kontrol */
  document.querySelectorAll('#oltCapBasis [data-b]').forEach(function(b){ b.onclick = function(){ S.basis = b.dataset.b; document.querySelectorAll('#oltCapBasis [data-b]').forEach(function(x){ x.classList.toggle('on', x === b); }); render(); }; });
  document.querySelectorAll('#oltCapFlt [data-f]').forEach(function(b){ b.onclick = function(){ S.flt = b.dataset.f; document.querySelectorAll('#oltCapFlt [data-f]').forEach(function(x){ x.classList.toggle('on', x === b); }); render(); }; });
  msel.onchange = function(){ S.month = parseInt(msel.value); render(); };
  document.getElementById('oltCapSearch').oninput = function(){ S.q = this.value; render(); };
  document.getElementById('oltCapDl').onclick = function(){
    var hd = ['Branch','STO','LoP TA','LoP FH','Port Plan','Kebutuhan','Idle ZTE','Idle HW','Idle Total','Selisih','Status'];
    var lines = [hd].concat(rowsNow.map(function(o){ return [o.witel,o.sto,o.ta,o.fh,o.pp,o.need,o.zte,o.hw,o.idle,o.has ? o.selisih : '',o.status]; }));
    var csv = lines.map(function(r){ return r.map(function(c){ return '"' + String(c).replace(/"/g,'""') + '"'; }).join(','); }).join('\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], {type:'text/csv'})); a.download = 'kebutuhan-vs-idle-port-olt.csv'; a.click();
  };

  window.renderOltCap = render;
  var wrap = window.renderPt3NeedOltPage;
  if(typeof wrap === 'function') window.renderPt3NeedOltPage = function(){ wrap.apply(this, arguments); try{ render(); }catch(e){} };
  var tb = document.getElementById('tabBtnNeedOlt'); if(tb) tb.addEventListener('click', function(){ setTimeout(render, 50); });
  render();
})();
