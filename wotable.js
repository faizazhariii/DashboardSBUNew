/* ============================================================
   Work Order table generik (header sort/filter, quick filter, kolom,
   drawer detail) + bar-list + performa untuk halaman HEM & OLO.
   Bergantung pada helper global di index.html (hemGet, oloGet, _woEsc, dll).
   ============================================================ */
(function(){
  'use strict';
  var esc = function(t){ return _woEsc(t); };
  var STALE = (typeof PT3_STALE_THRESHOLD_DAYS !== 'undefined') ? PT3_STALE_THRESHOLD_DAYS : 25;
  var MONTHS_UNUSED = null;

  function today0(){ var t = new Date(); t.setHours(0,0,0,0); return t; }
  function gapDays(text){
    var d = extractLatestUpdateDateFromText(text);
    if(!d) return -1;
    return Math.round((today0() - d) / 86400000);
  }
  function fmtGap(n){ return n < 0 ? '—' : (n <= 0 ? 'Hari ini' : n + ' hari'); }
  function oneLine(t){ return String(t||'').split(/\s*\n\s*|\s{2,}/).filter(Boolean).join(' • '); }
  function unesc(t){ return t.replace(/&quot;|&amp;|&lt;|&gt;/g, function(m){ return {'&quot;':'"','&amp;':'&','&lt;':'<','&gt;':'>'}[m]; }); }

  /* ---------- bar list ---------- */
  function barList(elId, entries, opts){
    var el = document.getElementById(elId); if(!el) return;
    opts = opts || {};
    var tot = opts.total || entries.reduce(function(a,e){ return a + e[1]; }, 0) || 1;
    var max = entries.length ? Math.max.apply(null, entries.map(function(e){ return e[1]; })) : 1;
    var pal = opts.colors || ['#0B5CAB','#2E7DD1','#4C9BE8','#E0A030','#C2417A','#3E9E8E','#7A6BCB','#8992A8'];
    var list = entries.slice(0, opts.limit || 8);
    el.innerHTML = list.map(function(e,i){
      var col = typeof pal === 'function' ? pal(e[0], i) : pal[i % pal.length];
      return '<div class="ogp-row" data-l="' + esc(e[0]) + '" title="Klik untuk filter"><span class="ogp-l">' + esc(e[0]) + '</span><span class="ogp-bar"><i style="width:' + Math.max(4, e[1]/max*100) + '%;background:' + col + '"></i></span><span class="ogp-n">' + e[1].toLocaleString('id-ID') + '</span><span class="ogp-p">' + (e[1]/tot*100).toFixed(0) + '%</span></div>';
    }).join('') || '<div style="color:var(--text-faint);font-size:12px;">Tidak ada data.</div>';
    if(opts.onPick) el.querySelectorAll('.ogp-row').forEach(function(r){ r.onclick = function(){ opts.onPick(unesc(r.dataset.l)); }; });
  }
  window.woBarList = barList;

  /* ---------- factory ---------- */
  function makeWo(cfg){
    var p = cfg.prefix;
    var S = { colF:{}, sortField:null, sortDir:'asc', pageSize:100, quick:'all', dense:false, hidden:new Set() };
    try{ S.hidden = new Set(JSON.parse(localStorage.getItem(p + '_hidden_cols') || '[]')); }catch(e){}
    var $ = function(id){ return document.getElementById(p + id); };
    var cols = cfg.cols;
    var vis = function(){ return cols.filter(function(c){ return !c.drawerOnly && !S.hidden.has(c.k); }); };
    var getPage = function(){ return cfg.page.get(); }, setPage = function(v){ cfg.page.set(v); };

    function catOf(r){ return cfg.cat(r); }
    function quickPass(r){
      var q = S.quick; if(q === 'all') return true;
      var kom = (cfg.komit(r) || '').trim(), cat = catOf(r);
      if(q === 'komit') return !!kom;
      if(q === 'nokomit') return !kom;
      if(q === 'late'){ var d = parseDMY(kom); return !!d && d < today0() && cat === 'ogp'; }
      if(q === 'stale'){ if(cat !== 'ogp') return false; return gapDays(cfg.detail(r)) > STALE; }
      return cat === q;
    }

    function baseRows(){ return cfg.filterCtl().apply(cfg.base()); }

    function rows(){
      var qv = ($('SearchInput').value || '').trim().toLowerCase();
      var active = cols.filter(function(c){ return S.colF[c.k]; });
      var out = baseRows().filter(function(r){
        for(var i=0;i<active.length;i++){
          var c = active[i], f = S.colF[c.k], v = c.val(r) || '';
          if(f.text !== undefined){ if(v.toLowerCase().indexOf(f.text.toLowerCase()) < 0) return false; }
          else if(!f.has(_woBlank(v))) return false;
        }
        if(!quickPass(r)) return false;
        if(qv && cfg.search(r).toLowerCase().indexOf(qv) < 0) return false;
        return true;
      });
      if(!S.sortField) return out;
      var col = cols.filter(function(c){ return c.k === S.sortField; })[0]; if(!col) return out;
      var sv = col.sv || function(r){ return String(col.val(r) || ''); };
      out = out.slice().sort(function(a,b){
        var x = sv(a), y = sv(b);
        return (typeof x === 'number' && typeof y === 'number') ? x - y : String(x).localeCompare(String(y), 'id', {numeric:true, sensitivity:'base'});
      });
      return S.sortDir === 'asc' ? out : out.reverse();
    }

    function buildHead(){
      var tr = $('TableHead'); if(!tr) return;
      tr.innerHTML = vis().map(function(c){
        var sIc = S.sortField === c.k ? (S.sortDir === 'asc' ? '↑' : '↓') : '⇅';
        return '<th class="' + (c.stk ? 'stk ' : '') + (c.stk2 ? 'stk2' : '') + '" data-k="' + c.k + '"><div class="wo-h"><span class="wo-hl" data-sort="' + c.k + '">' + esc(c.label) + '</span><span class="wo-ic ' + (S.sortField === c.k ? 'on' : '') + '" data-sort="' + c.k + '" title="Urutkan">' + sIc + '</span><span class="wo-ic ' + (S.colF[c.k] ? 'on' : '') + '" data-flt="' + c.k + '" title="Filter">▽</span></div></th>';
      }).join('');
      tr.querySelectorAll('[data-sort]').forEach(function(el){ el.onclick = function(e){
        e.stopPropagation(); var k = el.dataset.sort;
        if(S.sortField !== k){ S.sortField = k; S.sortDir = 'asc'; } else if(S.sortDir === 'asc') S.sortDir = 'desc'; else S.sortField = null;
        setPage(1); buildHead(); render();
      }; });
      tr.querySelectorAll('[data-flt]').forEach(function(el){ el.onclick = function(e){ e.stopPropagation(); openFilter(el.dataset.flt, el); }; });
    }

    function openFilter(k, anchor){
      var old = document.getElementById('pt3ColPop'); if(old) old.remove();
      var col = cols.filter(function(c){ return c.k === k; })[0]; if(!col) return;
      _woPopT = Date.now();
      var pop = document.createElement('div'); pop.id = 'pt3ColPop'; pop.className = 'wo-pop';
      var r = anchor.getBoundingClientRect();
      pop.style.top = (r.bottom + 6) + 'px'; pop.style.left = Math.max(8, Math.min(r.left - 120, innerWidth - 262)) + 'px';
      var apply = function(){ setPage(1); buildHead(); render(); };
      if(col.text){
        var cur = S.colF[k] ? S.colF[k].text : '';
        pop.innerHTML = '<b>' + esc(col.label) + '</b><input type="text" id="woTxt" placeholder="Mengandung kata..." value="' + esc(cur) + '" style="margin-top:6px;"><div class="acts"><button id="woClr">Hapus</button><button class="pri" id="woOk">Terapkan</button></div>';
        document.body.appendChild(pop);
        var inp = pop.querySelector('#woTxt'); inp.focus();
        var go = function(){ var v = inp.value.trim(); if(v) S.colF[k] = {text:v}; else delete S.colF[k]; pop.remove(); apply(); };
        pop.querySelector('#woOk').onclick = go; inp.onkeydown = function(e){ if(e.key === 'Enter') go(); };
        pop.querySelector('#woClr').onclick = function(){ delete S.colF[k]; pop.remove(); apply(); };
        return;
      }
      var cnt = new Map();
      baseRows().forEach(function(row){ var v = _woBlank(col.val(row) || ''); cnt.set(v, (cnt.get(v) || 0) + 1); });
      var vals = Array.from(cnt.keys()).sort(function(a,b){ return String(a).localeCompare(String(b), 'id', {numeric:true, sensitivity:'base'}); });
      var sel = new Set(S.colF[k] && S.colF[k].has ? S.colF[k] : vals);
      pop.innerHTML = '<b>' + esc(col.label) + '</b><input type="text" id="woSrch" placeholder="Cari nilai..." style="margin-top:6px;"><div class="lst" id="woLst"></div><div class="acts"><button id="woAll">Semua</button><button id="woNone">Kosongkan</button><button class="pri" id="woOk">Terapkan</button></div>';
      document.body.appendChild(pop);
      var lst = pop.querySelector('#woLst'), srch = pop.querySelector('#woSrch');
      var draw = function(){
        var t = srch.value.toLowerCase();
        lst.innerHTML = vals.filter(function(v){ return String(v).toLowerCase().indexOf(t) >= 0; }).slice(0,400).map(function(v){
          return '<label><input type="checkbox" data-v="' + esc(v) + '" ' + (sel.has(v) ? 'checked' : '') + '><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(v) + '</span><span style="margin-left:auto;color:var(--text-faint)">' + cnt.get(v) + '</span></label>';
        }).join('') || '<div style="padding:8px;color:var(--text-faint)">Tidak ada.</div>';
        lst.querySelectorAll('input').forEach(function(i){ i.onchange = function(){ var v = unesc(i.dataset.v); i.checked ? sel.add(v) : sel.delete(v); }; });
      };
      draw(); srch.oninput = draw; srch.focus();
      pop.querySelector('#woAll').onclick = function(){ vals.forEach(function(v){ sel.add(v); }); draw(); };
      pop.querySelector('#woNone').onclick = function(){ sel.clear(); draw(); };
      pop.querySelector('#woOk').onclick = function(){ if(sel.size === vals.length) delete S.colF[k]; else S.colF[k] = new Set(sel); pop.remove(); apply(); };
    }

    function renderChips(){
      var el = $('ColChips'); if(!el) return;
      el.innerHTML = cols.filter(function(c){ return S.colF[c.k]; }).map(function(c){
        var f = S.colF[c.k];
        var d = f.text !== undefined ? '"' + esc(f.text) + '"' : (f.size === 1 ? esc(Array.from(f)[0]) : f.size + ' dipilih');
        return '<span class="wo-chip">' + esc(c.label) + ': ' + d + '<button data-rm="' + c.k + '" title="Hapus">✕</button></span>';
      }).join('');
      el.querySelectorAll('[data-rm]').forEach(function(b){ b.onclick = function(){ delete S.colF[b.dataset.rm]; setPage(1); buildHead(); render(); }; });
    }

    /* ---- drawer ---- */
    var dList = [], dIdx = 0;
    function openDrawer(row, list, idx){
      if(list){ dList = list; dIdx = idx; }
      var bg = document.getElementById(p + 'WoDrawerBg'), dr = document.getElementById(p + 'WoDrawer');
      if(!dr){
        bg = document.createElement('div'); bg.id = p + 'WoDrawerBg'; bg.className = 'wo-drawer-bg';
        dr = document.createElement('div'); dr.id = p + 'WoDrawer'; dr.className = 'wo-drawer';
        document.body.appendChild(bg); document.body.appendChild(dr);
        bg.onclick = function(){ bg.classList.remove('open'); dr.classList.remove('open'); };
        document.addEventListener('keydown', function(e){
          if(!dr.classList.contains('open')) return;
          if(e.key === 'Escape') bg.onclick();
          if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
          if(e.key === 'ArrowDown' || e.key === 'ArrowRight') step(1);
          if(e.key === 'ArrowUp' || e.key === 'ArrowLeft') step(-1);
        });
      }
      var cat = catOf(row);
      var kv = cols.filter(function(c){ return !c.det && !c.noDrawer; }).map(function(c){
        var v = c.val(row);
        return '<dt>' + esc(c.label) + '</dt><dd>' + esc(c.fmt ? c.fmt(v) : (v || '—')) + '</dd>';
      }).join('');
      dr.innerHTML = '<div class="hd"><div><h3>' + esc(cfg.name(row) || '—') + '</h3><div style="margin-top:6px;"><span class="wo-pill ' + cat + '">' + esc(cfg.status(row) || '—') + '</span> <span class="copy-id" title="Klik untuk salin" style="font-size:12px;color:var(--text-faint);margin-left:6px;">' + esc(cfg.id(row)) + '</span></div></div><div style="display:flex;gap:6px;"><button type="button" id="dPrev" title="Sebelumnya">↑</button><button type="button" id="dNext" title="Berikutnya">↓</button><button type="button" id="dX">✕</button></div></div><div class="bd"><dl class="kv">' + kv + '</dl><p style="font-weight:700;font-size:13px;margin:0 0 6px;">Detail Progres (riwayat)</p><pre>' + esc(cfg.detail(row) || '—') + '</pre></div>';
      dr.querySelector('#dX').onclick = function(){ bg.onclick(); };
      dr.querySelector('#dPrev').onclick = function(){ step(-1); };
      dr.querySelector('#dNext').onclick = function(){ step(1); };
      bg.classList.add('open'); dr.classList.add('open');
    }
    function step(d){ var n = dIdx + d; if(n < 0 || n >= dList.length) return; dIdx = n; openDrawer(dList[n]); }

    /* ---- render ---- */
    function render(){
      var filtered = rows();
      $('ResultCount').textContent = filtered.length.toLocaleString('id-ID') + ' order';
      var sum = filtered.reduce(function(a,r){ var c = catOf(r); a[c] = (a[c] || 0) + 1; return a; }, {});
      var sm = $('WoSummary');
      if(sm){
        var extra = cfg.metric ? '<div class="wo-sum p"><b>' + cfg.metric.get(filtered) + '</b><span>' + cfg.metric.label + '</span></div>' : '';
        sm.innerHTML = '<div class="wo-sum"><b>' + filtered.length.toLocaleString('id-ID') + '</b><span>Order</span></div>' + extra +
          '<div class="wo-sum g" data-qq="golive"><b>' + (sum.golive || 0).toLocaleString('id-ID') + '</b><span>Golive</span></div>' +
          '<div class="wo-sum o" data-qq="ogp"><b>' + (sum.ogp || 0).toLocaleString('id-ID') + '</b><span>OGP</span></div>' +
          '<div class="wo-sum d" data-qq="drop"><b>' + (sum.drop || 0).toLocaleString('id-ID') + '</b><span>Drop</span></div>';
        sm.querySelectorAll('[data-qq]').forEach(function(el){ el.onclick = function(){ var b = document.querySelector('#' + p + 'Quick [data-q=' + el.dataset.qq + ']'); if(b) b.click(); }; });
      }
      renderChips();

      var psz = S.pageSize || Math.max(1, filtered.length);
      var totalPages = Math.max(1, Math.ceil(filtered.length / psz));
      if(getPage() > totalPages) setPage(totalPages);
      var pageRows = filtered.slice((getPage() - 1) * psz, getPage() * psz);
      var t0 = today0();
      var vc = vis();
      var tbody = $('TableBody');
      tbody.innerHTML = pageRows.map(function(row, i){
        var cat = catOf(row);
        return '<tr data-i="' + i + '" class="c-' + cat + '">' + vc.map(function(c){
          var v = c.val(row) || '', inner;
          if(c.html) inner = c.html(row);
          else if(c.pill) inner = v ? '<span class="wo-pill ' + cat + '">' + esc(v) + '</span>' : '—';
          else if(c.det) inner = v ? '<div class="wo-detail" title="' + esc(v) + '">' + esc(oneLine(v)) + '</div>' : '—';
          else if(c.fmt) inner = esc(c.fmt(v));
          else if(c.gap){ var n = c.sv(row); inner = n >= 0 ? '<span class="wo-gap ' + (n > STALE ? 'bad' : (n > 15 ? 'warn' : '')) + '">' + esc(v) + '</span>' : '—'; }
          else if(c.late){ var d = parseDMY(v); inner = v ? (d && d < t0 && cat === 'ogp' ? '<span class="wo-late" title="Komitmen terlewat">' + esc(v) + ' ⚠</span>' : esc(v)) : '—'; }
          else inner = v ? esc(v) : '—';
          return '<td class="' + (c.cls || '') + ' ' + (c.stk ? 'stk ' : '') + (c.stk2 ? 'stk2' : '') + '">' + inner + '</td>';
        }).join('') + '</tr>';
      }).join('') || '<tr><td colspan="' + vc.length + '" style="text-align:center;padding:30px;cursor:default;">Tidak ada data yang cocok.</td></tr>';
      tbody.onclick = function(e){
        if(e.target.closest('a,select,input,button,textarea,.hem-catatan-history,.hem-catatan-row')) return;
        var tr = e.target.closest('tr[data-i]'); if(tr) openDrawer(pageRows[+tr.dataset.i], pageRows, +tr.dataset.i);
      };
      $('PageInfo').textContent = 'Halaman ' + getPage() + ' dari ' + totalPages;
      $('PrevPage').disabled = getPage() <= 1;
      $('NextPage').disabled = getPage() >= totalPages;
      var sc = $('WoScroll'); if(sc) sc.scrollTop = 0;
      if(cfg.after) cfg.after(pageRows);
    }

    /* ---- setup / wiring ---- */
    function setup(){
      buildHead();
      $('SearchInput').oninput = function(){ setPage(1); render(); };
      var qb = document.querySelectorAll('#' + p + 'Quick button');
      qb.forEach(function(b){ b.onclick = function(){ S.quick = b.dataset.q; qb.forEach(function(x){ x.classList.toggle('on', x === b); }); setPage(1); render(); }; });
      $('PrevPage').onclick = function(){ if(getPage()>1){ setPage(getPage()-1); render(); } };
      $('NextPage').onclick = function(){ setPage(getPage()+1); render(); };
      $('PageSizeSel').onchange = function(){ S.pageSize = parseInt(this.value) || 0; setPage(1); render(); };
      $('ResetFilterBtn').onclick = function(){
        S.quick = 'all'; qb.forEach(function(x){ x.classList.toggle('on', x.dataset.q === 'all'); });
        S.colF = {}; S.sortField = null; $('SearchInput').value = ''; cfg.filterCtl().clear(); setPage(1); buildHead(); render();
      };
      $('DensityBtn').onclick = function(){ S.dense = !S.dense; $('WoTable').classList.toggle('dense', S.dense); this.textContent = S.dense ? '↕ Longgar' : '↕ Rapat'; };
      var cb = $('ColsBtn');
      cb.onclick = function(){
        var o = document.getElementById('pt3ColPop'); if(o) o.remove();
        var pop = document.createElement('div'); pop.id = 'pt3ColPop'; pop.className = 'wo-pop'; _woPopT = Date.now();
        var r = cb.getBoundingClientRect(); pop.style.top = (r.bottom + 6) + 'px'; pop.style.left = Math.max(8, r.right - 250) + 'px';
        pop.innerHTML = '<b>Tampilkan kolom</b><div class="lst" style="margin-top:6px;">' + cols.filter(function(c){ return !c.drawerOnly; }).map(function(c){ return '<label><input type="checkbox" data-k="' + c.k + '" ' + (S.hidden.has(c.k) ? '' : 'checked') + ' ' + (c.stk ? 'disabled' : '') + '>' + esc(c.label) + '</label>'; }).join('') + '</div>';
        document.body.appendChild(pop);
        pop.querySelectorAll('input').forEach(function(i){ i.onchange = function(){ i.checked ? S.hidden.delete(i.dataset.k) : S.hidden.add(i.dataset.k); try{ localStorage.setItem(p + '_hidden_cols', JSON.stringify(Array.from(S.hidden))); }catch(e){} buildHead(); render(); }; });
      };
    }

    return { setup: setup, render: render, rows: rows, state: S, base: baseRows };
  }

  /* ---------- HTML builders ---------- */
  function sectionHTML(p, title, desc, quickCats){
    var qc = (quickCats || []).map(function(q){ return '<button type="button" data-q="' + q[0] + '">' + q[1] + '</button>'; }).join('');
    return '<div class="section" id="' + p + 'WorkOrderSection">' +
      '<p class="section-title" data-ic="📋">' + title + '</p>' +
      '<p class="section-desc">' + desc + '</p>' +
      '<div id="' + p + 'ActiveFilterBadge" class="active-filter-badge" style="display:none;"></div>' +
      '<div class="wo-summary" id="' + p + 'WoSummary"></div>' +
      '<div class="wo-quick" id="' + p + 'Quick"><span class="wo-ql">Tampilkan:</span><button type="button" class="on" data-q="all">Semua</button><button type="button" data-q="komit">✅ Berkomitmen</button><button type="button" data-q="nokomit">Belum Komitmen</button><span class="wo-sep"></span>' + qc + '<span class="wo-sep"></span><button type="button" data-q="late">⚠ Komitmen Terlewat</button><button type="button" data-q="stale">⏱ Belum Update &gt;' + STALE + ' hari</button></div>' +
      '<div class="wo-toolbar"><input type="text" id="' + p + 'SearchInput" placeholder="🔎 Cari ..."><span class="count" id="' + p + 'ResultCount"></span><div class="wo-chips" id="' + p + 'ColChips"></div>' +
      '<div class="wo-tools"><select id="' + p + 'PageSizeSel" class="period-select" title="Baris per halaman"><option value="25">25 baris</option><option value="50">50 baris</option><option value="100" selected>100 baris</option><option value="250">250 baris</option><option value="0">Semua data (berat)</option></select>' +
      '<button type="button" class="wo-btn" id="' + p + 'ColsBtn">⚙ Kolom</button><button type="button" class="wo-btn" id="' + p + 'DensityBtn">↕ Rapat</button><button type="button" class="wo-btn" id="' + p + 'ResetFilterBtn">✕ Reset Filter</button>' +
      '<button type="button" class="download-btn" id="' + p + 'DownloadBtn" style="margin:0;">📥 Download CSV</button></div></div>' +
      '<div class="wo-scroll" id="' + p + 'WoScroll"><table class="wo-table" id="' + p + 'WoTable"><thead><tr id="' + p + 'TableHead"></tr></thead><tbody id="' + p + 'TableBody"></tbody></table></div>' +
      '<div class="pager"><span id="' + p + 'PageInfo"></span><div style="margin-left:auto;display:flex;gap:8px;"><button id="' + p + 'PrevPage">← Sebelumnya</button><button id="' + p + 'NextPage">Selanjutnya →</button></div></div></div>';
  }
  function extraHTML(p, tabs){
    return '<div class="section" id="' + p + 'ExtraSection"><p class="section-title" data-ic="🏅">Performa per ' + tabs.map(function(t){ return t.label; }).join(' / ') + '</p>' +
      '<p class="section-desc">Ringkasan order, capaian, dan kepatuhan update per kelompok. Klik angka untuk memfilter Daftar Work Order.</p>' +
      '<div class="wo-quick" id="' + p + 'PerfTabs" style="margin-bottom:8px;">' + tabs.map(function(t,i){ return '<button type="button" class="' + (i ? '' : 'on') + '" data-g="' + t.g + '">' + t.label + '</button>'; }).join('') + '</div>' +
      '<div class="wo-scroll" style="max-height:340px;"><table class="wo-table"><thead><tr id="' + p + 'PerfHead"></tr></thead><tbody id="' + p + 'PerfBody"></tbody></table></div>' +
      '<p class="section-title" style="margin-top:18px;" data-ic="⏳">Top 10 Order OGP Paling Lama Tanpa Update</p>' +
      '<p class="section-desc">Order OGP dengan log progres terakhir paling lama. Klik baris untuk memfilter ke order tersebut.</p>' +
      '<div class="wo-scroll" style="max-height:340px;"><table class="wo-table"><thead><tr><th>IHLD</th><th>Nama</th><th>District</th><th>Progres</th><th>Jarak Update</th><th>Detail Progres</th></tr></thead><tbody id="' + p + 'TopStaleBody"></tbody></table></div></div>';
  }

  /* ---------- performa ---------- */
  function makePerf(cfg, wo){
    var p = cfg.prefix, group = cfg.perf[0].g;
    function render(){
      var rowsAll = cfg.base();
      var gdef = cfg.perf.filter(function(t){ return t.g === group; })[0];
      var t0 = today0();
      var groups = {};
      rowsAll.forEach(function(r){ var k = (gdef.get(r) || '').trim() || '(Kosong)'; (groups[k] = groups[k] || []).push(r); });
      var ent = Object.keys(groups).map(function(k){ return [k, groups[k]]; }).sort(function(a,b){ return b[1].length - a[1].length; });
      var head = document.getElementById(p + 'PerfHead'), body = document.getElementById(p + 'PerfBody');
      if(!head || !body) return;
      var hasOther = !!cfg.hasOther;
      head.innerHTML = '<th>' + gdef.label + '</th><th>Order</th><th>Golive</th><th>OGP</th>' + (hasOther ? '<th>' + (cfg.otherLabel || 'Bisa PT1 / Hold') + '</th>' : '') + '<th>Drop</th><th style="min-width:150px">% Golive</th><th>Komitmen Terlewat</th><th>Tanpa Update &gt;' + STALE + 'h</th>';
      var reg = {};
      body.innerHTML = ent.map(function(e, i){
        var k = e[0], arr = e[1];
        var g = arr.filter(function(r){ return cfg.cat(r) === 'golive'; }), o = arr.filter(function(r){ return cfg.cat(r) === 'ogp'; }), d = arr.filter(function(r){ return cfg.cat(r) === 'drop'; });
        var x = arr.filter(function(r){ var c = cfg.cat(r); return c === 'bisa' || c === 'hold'; });
        var late = o.filter(function(r){ var dd = parseDMY(cfg.komit(r)); return dd && dd < t0; });
        var stale = o.filter(function(r){ return gapDays(cfg.detail(r)) > STALE; });
        var pct = Math.round(g.length / arr.length * 100);
        var col = pct >= 50 ? 'var(--emerald)' : (pct >= 25 ? 'var(--amber)' : 'var(--red)');
        reg['a' + i] = { all:arr, g:g, o:o, d:d, x:x, late:late, stale:stale };
        var c = function(key, list, cls){ return list.length ? '<td class="num pt3pf ' + (cls || '') + '" data-i="a' + i + '" data-s="' + key + '" style="cursor:pointer;">' + list.length.toLocaleString('id-ID') + '</td>' : '<td class="num" style="color:var(--text-faint)">—</td>'; };
        return '<tr style="cursor:default"><td class="name" style="min-width:160px;font-weight:600;">' + esc(k) + '</td>' + c('all', arr) + c('g', g, 'g') + c('o', o) + (hasOther ? c('x', x) : '') + c('d', d, 'd') +
          '<td><div style="display:flex;align-items:center;gap:8px;"><span class="ogp-bar" style="flex:1;"><i style="width:' + pct + '%;background:' + col + '"></i></span><b style="min-width:34px;text-align:right;color:' + col + '">' + pct + '%</b></div></td>' + c('late', late, 'd') + c('stale', stale, 'w') + '</tr>';
      }).join('') || '<tr><td colspan="9" style="text-align:center;padding:20px;">Tidak ada data.</td></tr>';
      body.querySelectorAll('.pt3pf').forEach(function(td){ td.onclick = function(){
        var set = new Set(reg[td.dataset.i][td.dataset.s]);
        var lab = {all:'semua', g:'Golive', o:'OGP', d:'Drop', x:'Bisa PT1/Hold', late:'komitmen terlewat', stale:'tanpa update'}[td.dataset.s];
        cfg.filterCtl().set(function(r){ return set.has(r); }, gdef.label + ' ' + td.closest('tr').querySelector('td').textContent + ' — ' + lab);
      }; });

      var tb = document.getElementById(p + 'TopStaleBody');
      if(tb){
        var top = rowsAll.filter(function(r){ return cfg.cat(r) === 'ogp' && gapDays(cfg.detail(r)) >= 0; }).sort(function(a,b){ return gapDays(cfg.detail(b)) - gapDays(cfg.detail(a)); }).slice(0, 10);
        tb.innerHTML = top.map(function(r, i){
          var n = gapDays(cfg.detail(r));
          return '<tr data-i="' + i + '"><td>' + esc(cfg.id(r)) + '</td><td class="name">' + esc(cfg.name(r)) + '</td><td>' + esc(cfg.district(r)) + '</td><td><span class="wo-pill ogp">' + esc(cfg.status(r)) + '</span></td><td><span class="wo-gap ' + (n > STALE ? 'bad' : (n > 15 ? 'warn' : '')) + '">' + n + ' hari</span></td><td><div class="wo-detail" title="' + esc(cfg.detail(r)) + '">' + esc(oneLine(cfg.detail(r))) + '</div></td></tr>';
        }).join('') || '<tr><td colspan="6" style="text-align:center;padding:16px;">Tidak ada data.</td></tr>';
        tb.onclick = function(e){ var tr = e.target.closest('tr[data-i]'); if(!tr) return; var r = top[+tr.dataset.i]; cfg.filterCtl().set(function(x){ return x === r; }, 'Order ' + cfg.id(r)); };
      }
      document.querySelectorAll('#' + p + 'PerfTabs button').forEach(function(b){ b.onclick = function(){ group = b.dataset.g; document.querySelectorAll('#' + p + 'PerfTabs button').forEach(function(x){ x.classList.toggle('on', x === b); }); render(); }; });
    }
    return { render: render };
  }

  /* ---------- pasang ke halaman ---------- */
  function install(cfg, o){
    var p = cfg.prefix;
    var oldSec = document.getElementById(p + 'WorkOrderSection'); if(!oldSec) return null;
    var oldDl = document.getElementById(p + 'DownloadBtn');
    var dlHandler = oldDl ? oldDl.onclick : null;
    var holder = document.createElement('div');
    holder.innerHTML = extraHTML(p, cfg.perf) + sectionHTML(p, o.title, o.desc, cfg.quickCats);
    var frag = document.createDocumentFragment(); while(holder.firstChild) frag.appendChild(holder.firstChild);
    oldSec.parentNode.replaceChild(frag, oldSec);
    var wo = makeWo(cfg);
    var perf = makePerf(cfg, wo);
    var dl = document.getElementById(p + 'DownloadBtn'); if(dl && dlHandler) dl.onclick = dlHandler;
    var sInp = document.getElementById(p + 'SearchInput'); if(sInp) sInp.placeholder = o.placeholder;
    return { wo: wo, perf: perf };
  }

  var hemPjg = function(r){ return hemGet(r,'Panjang Kabel (m)') || hemGet(r,'Panjang Kabel') || hemGet(r,'Panjang (m)') || hemGet(r,'Panjang'); };
  var oloPjg = function(r){ return oloGet(r,'Panjang Kabel (m)') || oloGet(r,'Panjang Kabel') || oloGet(r,'Panjang (m)') || oloGet(r,'Panjang'); };
  /* =================== HEM =================== */
  function hemCat(r){ return hemCategoryOfLabel(hemRowProgressLabel(r)); }
  var fmtIDR = function(v){ var n = hemParseNum(v); return n ? 'Rp' + Math.round(n).toLocaleString('id-ID') : '—'; };
  var HEMC = {
    prefix:'hem',
    cols:[
      {k:'ihld', label:'IHLD', stk:1, val:function(r){ return hemGet(r,'IHLD'); }},
      {k:'nama', label:'Nama LOP', cls:'name', stk2:1, val:function(r){ return hemGet(r,'NAMA LOP'); }},
      {k:'tipe', label:'Tipe Desain', val:function(r){ return hemGet(r,'TIPE DESAIN'); }},
      {k:'tipe2', label:'Tipe Desain 2', val:function(r){ return hemGet(r,'TIPE DESAIN 2'); }},
      {k:'witel', label:'Witel', val:function(r){ return hemGet(r,'WITEL'); }},
      {k:'district', label:'District', val:function(r){ return hemGet(r,'DISTRICT'); }},
      {k:'sto', label:'STO', val:function(r){ return hemGet(r,'STO'); }},
      {k:'nde', label:'NDE Work Order', val:function(r){ return hemGet(r,'NDE WORK ORDER KE TA'); }},
      {k:'komit', label:'Komitmen Golive', late:1, val:function(r){ return hemGet(r,'Komitmen Golive'); }, sv:function(r){ var d = parseDMY(hemGet(r,'Komitmen Golive')); return d ? d.getTime() : 0; }},
      {k:'prog', label:'Progres Lapangan', pill:1, val:function(r){ return hemGet(r,'Progress Lapangan'); }},
      {k:'tgl', label:'Tgl Submit Order NDE', val:function(r){ return hemGet(r,'Tanggal submit order nde'); }},
      {k:'det', label:'Detail Progres', det:1, text:1, val:function(r){ return hemGet(r,'Detail Progres'); }},
      {k:'cat', label:'Catatan', text:1, noDrawer:0, val:function(r){ return hemGet(r,'CATATAN') || hemGet(r,'W'); }, html:function(r){ return renderCatatanCell('hem', hemGet(r,'IHLD'), hemGet(r,'CATATAN') || hemGet(r,'W')); }},
      {k:'pt1', label:'Status PT1', val:function(r){ return getByColLetter(r,'Y'); }, html:function(r){ return renderStatusPT1Cell('hem', hemGet(r,'IHLD'), getByColLetter(r,'Y')); }},
      {k:'kabel', label:'Jenis Kabel', val:function(r){ return hemGet(r,'Jenis Kabel'); }},
      {k:'pjg', label:'Panjang Kabel (m)', drawerOnly:1, val:function(r){ return hemPjg(r); }},
      {k:'ohem', label:'No Order HEM', val:function(r){ return hemGet(r,'NO ORDER HEM'); }},
      {k:'ounsc', label:'No Order UNSC', val:function(r){ return hemGet(r,'NO ORDER UNSC'); }},
      {k:'rev', label:'Revenue', cls:'num', val:function(r){ return hemGet(r,'REVENEU'); }, sv:function(r){ return hemParseNum(hemGet(r,'REVENEU')); }, fmt:fmtIDR},
      {k:'boq', label:'BOQ', cls:'num', val:function(r){ return hemGet(r,'BOQ'); }, sv:function(r){ return hemParseNum(hemGet(r,'BOQ')); }, fmt:fmtIDR},
      {k:'thr', label:'Treshold', val:function(r){ return hemGet(r,'TRESHOLD'); }},
      {k:'sla', label:'SLA', val:function(r){ return hemGet(r,'SLA'); }, html:function(r){ var s = hemSlaClass(hemGet(r,'SLA')); return '<span class="badge ' + (s==='in' ? 'badge-in' : s==='out' ? 'badge-out' : 'badge-other') + '">' + esc(hemGet(r,'SLA') || '—') + '</span>'; }},
      {k:'ttd', label:'TTD', val:function(r){ return hemGet(r,'TTD'); }, sv:function(r){ return hemParseNum(hemGet(r,'TTD')); }},
      {k:'upd', label:'Diupdate', val:function(r){ var d = extractLatestUpdateDateFromText(hemGet(r,'Detail Progres')); return d ? d.toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}) : '—'; }, sv:function(r){ var d = extractLatestUpdateDateFromText(hemGet(r,'Detail Progres')); return d ? d.getTime() : 0; }},
      {k:'gap', label:'Jarak Update', gap:1, val:function(r){ return fmtGap(gapDays(hemGet(r,'Detail Progres'))); }, sv:function(r){ return gapDays(hemGet(r,'Detail Progres')); }}
    ],
    quickCats:[['ogp','🔵 OGP'],['golive','🟢 Golive'],['drop','🔴 Drop'],['bisa','🟣 Bisa PT1'],['hold','🟠 Hold']],
    hasOther:true,
    perf:[
      {g:'district', label:'District', get:function(r){ return hemGet(r,'DISTRICT'); }},
      {g:'witel', label:'Witel', get:function(r){ return hemGet(r,'WITEL'); }},
      {g:'tipe', label:'Tipe Desain', get:function(r){ return hemGet(r,'TIPE DESAIN'); }},
      {g:'sla', label:'SLA', get:function(r){ return hemGet(r,'SLA'); }}
    ],
    base:function(){ return (hemAGG && hemAGG.rows) ? hemAGG.rows : hemRows; },
    filterCtl:function(){ return hemFilterCtl; },
    page:{ get:function(){ return hemCurrentPage; }, set:function(v){ hemCurrentPage = v; } },
    cat:hemCat,
    komit:function(r){ return hemGet(r,'Komitmen Golive'); },
    detail:function(r){ return hemGet(r,'Detail Progres'); },
    search:function(r){ return [hemGet(r,'IHLD'), hemGet(r,'NAMA LOP'), hemGet(r,'STO'), hemGet(r,'DISTRICT'), hemGet(r,'NO ORDER HEM')].join(' '); },
    id:function(r){ return hemGet(r,'IHLD'); }, name:function(r){ return hemGet(r,'NAMA LOP'); },
    status:function(r){ return hemGet(r,'Progress Lapangan'); }, district:function(r){ return hemGet(r,'DISTRICT'); },
    after:function(){ wireCatatanUI('hem','HEM'); wireStatusPT1UI('hem','HEM'); }
  };

  /* =================== OLO =================== */
  function oloCat(r){ return hemCategoryOfLabel(oloRowProgressLabel(r)); }
  var fmtIDRo = function(v){ var n = oloParseNum(v); return n ? 'Rp' + Math.round(n).toLocaleString('id-ID') : '—'; };
  var OLOC = {
    prefix:'olo',
    cols:[
      {k:'ihld', label:'IHLD', stk:1, val:function(r){ return oloGet(r,'IHLD'); }},
      {k:'nama', label:'Nama Proyek', cls:'name', stk2:1, val:function(r){ return oloGet(r,'NAMA PROYEK'); }},
      {k:'kml', label:'KML', val:function(r){ return (window.kmlCell && kmlCell('olo', oloGet(r,'NAMA PROYEK')) !== '—') ? 'Ada KML' : 'Belum ada'; }, html:function(r){ return window.kmlCell ? kmlCell('olo', oloGet(r,'NAMA PROYEK')) : '—'; }},
      {k:'no', label:'No Order', val:function(r){ return oloGet(r,'NO ORDER'); }},
      {k:'witel', label:'Witel', val:function(r){ return oloGet(r,'WITEL'); }},
      {k:'district', label:'District', val:function(r){ return oloGet(r,'DISTRICT'); }},
      {k:'sto', label:'STO', val:function(r){ return oloGet(r,'STO'); }},
      {k:'prog', label:'Progres Lapangan', pill:1, val:function(r){ return oloGet(r,'Progress Lapangan'); }},
      {k:'sub', label:'Sub Status', val:function(r){ return oloGet(r,'SUB STATUS'); }},
      {k:'pjg', label:'Panjang Kabel (m)', drawerOnly:1, val:function(r){ return oloPjg(r); }},
      {k:'nde', label:'NDE Work Order', val:function(r){ return oloGet(r,'NDE WORK ORDER KE TA'); }},
      {k:'tgl', label:'Tanggal Order', val:function(r){ return oloGet(r,'TANGGAL ORDER'); }},
      {k:'komit', label:'Komitmen Golive', late:1, val:function(r){ return oloGet(r,'Komitmen Golive'); }, sv:function(r){ var d = parseDMY(oloGet(r,'Komitmen Golive')); return d ? d.getTime() : 0; }},
      {k:'det', label:'Detail Progres', det:1, text:1, val:function(r){ return oloGet(r,'Detail Progres'); }},
      {k:'cat', label:'Catatan', text:1, val:function(r){ return oloGet(r,'CATATAN'); }, html:function(r){ return renderCatatanCell('olo', oloGet(r,'IHLD'), oloGet(r,'CATATAN')); }},
      {k:'pt1', label:'Status PT1', val:function(r){ return oloGet(r,'STATUS PT1'); }, html:function(r){ return renderStatusPT1Cell('olo', oloGet(r,'IHLD'), oloGet(r,'STATUS PT1')); }},
      {k:'ttd', label:'TTD', val:function(r){ return oloGet(r,'TTD'); }, sv:function(r){ return oloParseNum(oloGet(r,'TTD')); }},
      {k:'boq', label:'BOQ', cls:'num', val:function(r){ return oloGet(r,'BOQ'); }, sv:function(r){ return oloParseNum(oloGet(r,'BOQ')); }, fmt:fmtIDRo},
      {k:'rev', label:'Revenue', cls:'num', val:function(r){ return oloGet(r,'REVENEU'); }, sv:function(r){ return oloParseNum(oloGet(r,'REVENEU')); }, fmt:fmtIDRo},
      {k:'svc', label:'Service', val:function(r){ return oloGet(r,'SERVICE'); }},
      {k:'bw', label:'BW', val:function(r){ return oloGet(r,'BW'); }},
      {k:'upd', label:'Diupdate', val:function(r){ var d = extractLatestUpdateDateFromText(oloGet(r,'Detail Progres')); return d ? d.toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}) : '—'; }, sv:function(r){ var d = extractLatestUpdateDateFromText(oloGet(r,'Detail Progres')); return d ? d.getTime() : 0; }},
      {k:'gap', label:'Jarak Update', gap:1, val:function(r){ return fmtGap(gapDays(oloGet(r,'Detail Progres'))); }, sv:function(r){ return gapDays(oloGet(r,'Detail Progres')); }}
    ],
    quickCats:[['ogp','🔵 OGP'],['golive','🟢 Golive'],['drop','🔴 Drop'],['bisa','🟣 Bisa PT1'],['hold','🟠 Hold']],
    hasOther:true,
    perf:[
      {g:'district', label:'District', get:function(r){ return oloGet(r,'DISTRICT'); }},
      {g:'witel', label:'Witel', get:function(r){ return oloGet(r,'WITEL'); }},
      {g:'sub', label:'Sub Status', get:function(r){ return oloGet(r,'SUB STATUS'); }},
      {g:'svc', label:'Service', get:function(r){ return oloGet(r,'SERVICE'); }}
    ],
    base:function(){ return (oloAGG && oloAGG.rows) ? oloAGG.rows : oloRows; },
    filterCtl:function(){ return oloFilterCtl; },
    page:{ get:function(){ return oloCurrentPage; }, set:function(v){ oloCurrentPage = v; } },
    cat:oloCat,
    komit:function(r){ return oloGet(r,'Komitmen Golive'); },
    detail:function(r){ return oloGet(r,'Detail Progres'); },
    search:function(r){ return [oloGet(r,'IHLD'), oloGet(r,'NO ORDER'), oloGet(r,'NAMA PROYEK'), oloGet(r,'STO'), oloGet(r,'DISTRICT')].join(' '); },
    id:function(r){ return oloGet(r,'IHLD'); }, name:function(r){ return oloGet(r,'NAMA PROYEK'); },
    status:function(r){ return oloGet(r,'Progress Lapangan'); }, district:function(r){ return oloGet(r,'DISTRICT'); },
    after:function(){ wireCatatanUI('olo','OLO'); wireStatusPT1UI('olo','OLO'); }
  };

  /* ---- ganti section grafik lama dengan bar-list ---- */
  function replaceSection(canvasId, html){
    var cv = document.getElementById(canvasId); if(!cv) return false;
    var sec = cv.closest('.section'); if(!sec) return false;
    var h = document.createElement('div'); h.innerHTML = html;
    sec.parentNode.replaceChild(h.firstChild, sec);
    return true;
  }
  replaceSection('hemChartSla',
    '<div class="section"><p class="section-title" data-ic="🎯">Breakdown SLA &amp; District</p><p class="section-desc">Klik baris untuk memfilter Daftar Work Order.</p>' +
    '<div class="ogp-grid"><div class="ogp-card"><div class="ogp-h">SLA</div><div id="hemSlaBars"></div></div><div class="ogp-card"><div class="ogp-h">Per District</div><div id="hemDistrictBars"></div></div></div></div>');
  replaceSection('hemOgpStatusDonut',
    '<div class="section"><p class="section-title" data-ic="🔎">Breakdown OGP</p><p class="section-desc">Sebaran progres untuk order yang masih OGP. Klik baris untuk memfilter Daftar Work Order.</p>' +
    '<div class="ogp-card" style="max-width:640px;"><div id="hemOgpBars"></div></div></div>');
  replaceSection('oloChartDistrict',
    '<div class="section"><p class="section-title" data-ic="🎯">Breakdown District</p><p class="section-desc">Sebaran order per district. Klik baris untuk memfilter Daftar Work Order.</p>' +
    '<div class="ogp-card" style="max-width:640px;"><div id="oloDistrictBars"></div></div></div>');
  replaceSection('oloOgpStatusDonut',
    '<div class="section"><p class="section-title" data-ic="🔎">Breakdown OGP</p><p class="section-desc">Sebaran progres untuk order yang masih OGP. Klik baris untuk memfilter Daftar Work Order.</p>' +
    '<div class="ogp-card" style="max-width:640px;"><div id="oloOgpBars"></div></div></div>');

  var H = install(HEMC, {title:'Daftar Work Order HEM', desc:'Klik ikon ⇅ di header untuk urutkan, ▽ untuk filter per kolom. Kolom Catatan & Status PT1 tersimpan ke Google Sheets. Klik baris untuk detail lengkap.', placeholder:'🔎 Cari IHLD / Nama LOP / STO / District...'});
  var O = install(OLOC, {title:'Daftar Work Order OLO', desc:'Klik ikon ⇅ di header untuk urutkan, ▽ untuk filter per kolom. Kolom Catatan & Status PT1 tersimpan ke Google Sheets. Klik baris untuk detail lengkap.', placeholder:'🔎 Cari IHLD / No Order / Nama Proyek / STO...'});


  /* =================== MBB =================== */
  var mbbCat = function(r){ var c = mbbFiOaOgp(r); return c === 'oa' ? 'golive' : (c === 'drop' ? 'drop' : (c === 'other' ? 'hold' : 'ogp')); };
  var fmtIDRm = function(v){ var n = mbbParseNum(v); return n ? 'Rp' + Math.round(n).toLocaleString('id-ID') : '—'; };
  var MBBC = {
    prefix:'mbb',
    cols:[
      {k:'id', label:'ID', stk:1, val:function(r){ return mbbGet(r,'ID'); }},
      {k:'site', label:'Site Name', cls:'name', stk2:1, val:function(r){ return mbbGet(r,'SITE NAME'); }},
      {k:'kml', label:'KML', val:function(r){ return (window.kmlCell && kmlCell('mbb', mbbGet(r,'SITE NAME'), mbbGet(r,'SITE ID')) !== '—') ? 'Ada KML' : 'Belum ada'; }, html:function(r){ return window.kmlCell ? kmlCell('mbb', mbbGet(r,'SITE NAME'), mbbGet(r,'SITE ID')) : '—'; }},
      {k:'branch', label:'Branch', val:function(r){ return mbbGet(r,'BRANCH'); }},
      {k:'sto', label:'STO', val:function(r){ return mbbGet(r,'STO'); }},
      {k:'sow', label:'SOW Order', val:function(r){ return mbbGet(r,'SOW PRE ORDER') || mbbGet(r,'SOW ORDER'); }},
      {k:'batch', label:'Batch', val:function(r){ return mbbGet(r,'BATCH WO'); }},
      {k:'mitra', label:'Mitra', val:function(r){ return mbbGet(r,'MITRA'); }},
      {k:'tgl', label:'Tgl WO', val:function(r){ return mbbGet(r,'TGL WO'); }},
      {k:'status', label:'Status', pill:1, val:function(r){ return mbbGet(r,'STATUS'); }},
      {k:'sub', label:'Sub Status', val:function(r){ return mbbGet(r,'SUB STATUS'); }},
      {k:'komit', label:'Komitmen OA', late:1, val:function(r){ return mbbGet(r,'TGL COMMIT OA FIX'); }, sv:function(r){ var d = parseDMY(mbbGet(r,'TGL COMMIT OA FIX')); return d ? d.getTime() : 0; }},
      {k:'det', label:'Detil Progress', det:1, text:1, val:function(r){ return mbbGet(r,'DETIL PROGRESS'); }},
      {k:'cat', label:'Catatan', text:1, val:function(r){ return mbbGet(r,'CATATAN'); }, html:function(r){ return renderCatatanCell('mbb', mbbGet(r,'ID'), mbbGet(r,'CATATAN')); }},
      {k:'plan', label:'Nilai Plan', cls:'num', val:function(r){ return mbbGet(r,'NILAI PLAN'); }, sv:function(r){ return mbbParseNum(mbbGet(r,'NILAI PLAN')); }, fmt:fmtIDRm},
      {k:'drm', label:'Nilai DRM', cls:'num', val:function(r){ return mbbGet(r,'NILAI DRM'); }, sv:function(r){ return mbbParseNum(mbbGet(r,'NILAI DRM')); }, fmt:fmtIDRm},
      {k:'prog', label:'Progress %', val:function(r){ return mbbGet(r,'PROGRESS%'); }, sv:function(r){ return mbbParseNum(mbbGet(r,'PROGRESS%')); }},
      {k:'spv', label:'Supervisor', val:function(r){ return mbbGet(r,'SUPERVISOR'); }},
      {k:'sla', label:'Tgl SLA HO', val:function(r){ return mbbGet(r,'TGL SLA HO'); }},
      {k:'csla', label:'Cat SLA HO', val:function(r){ return mbbGet(r,'CAT SLA HO'); }, html:function(r){ var v = mbbGet(r,'CAT SLA HO'), u = v.toUpperCase(); return v ? '<span class="badge ' + (u.indexOf('OUT') >= 0 ? 'badge-out' : (u.indexOf('IN') >= 0 ? 'badge-in' : 'badge-other')) + '">' + esc(v) + '</span>' : '—'; }},
      {k:'upd', label:'Diupdate', val:function(r){ var d = extractLatestUpdateDateFromText(mbbGet(r,'DETIL PROGRESS')); return d ? d.toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}) : '—'; }, sv:function(r){ var d = extractLatestUpdateDateFromText(mbbGet(r,'DETIL PROGRESS')); return d ? d.getTime() : 0; }},
      {k:'gap', label:'Jarak Update', gap:1, val:function(r){ return fmtGap(gapDays(mbbGet(r,'DETIL PROGRESS'))); }, sv:function(r){ return gapDays(mbbGet(r,'DETIL PROGRESS')); }}
    ],
    quickCats:[['ogp','🔵 OGP'],['golive','🟢 On Air'],['drop','🔴 Drop']],
    hasOther:false,
    perf:[
      {g:'branch', label:'Branch', get:function(r){ return mbbGet(r,'BRANCH'); }},
      {g:'mitra', label:'Mitra', get:function(r){ return mbbGet(r,'MITRA'); }},
      {g:'sow', label:'SOW Order', get:function(r){ return mbbGet(r,'SOW PRE ORDER'); }},
      {g:'batch', label:'Batch', get:function(r){ return mbbGet(r,'BATCH WO'); }}
    ],
    base:function(){ return (mbbAGG && mbbAGG.rows) ? mbbAGG.rows : mbbRows; },
    filterCtl:function(){ return mbbFilterCtl; },
    page:{ get:function(){ return mbbCurrentPage; }, set:function(v){ mbbCurrentPage = v; } },
    cat:mbbCat,
    komit:function(r){ return mbbGet(r,'TGL COMMIT OA FIX'); },
    detail:function(r){ return mbbGet(r,'DETIL PROGRESS'); },
    search:function(r){ return [mbbGet(r,'ID'), mbbGet(r,'SITE NAME'), mbbGet(r,'SITE ID'), mbbGet(r,'STO'), mbbGet(r,'BRANCH'), mbbGet(r,'MITRA')].join(' '); },
    id:function(r){ return mbbGet(r,'ID'); }, name:function(r){ return mbbGet(r,'SITE NAME'); },
    status:function(r){ return mbbGet(r,'STATUS'); }, district:function(r){ return mbbGet(r,'BRANCH'); },
    after:function(){ wireCatatanUI('mbb','MBB'); }
  };
  replaceSection('mbbPriorityChart',
    '<div class="section"><p class="section-title" data-ic="🎯">Ringkasan Priority, Mitra &amp; SOW Order</p><p class="section-desc">Klik baris untuk memfilter Daftar Work Order.</p>' +
    '<div class="ogp-grid"><div class="ogp-card"><div class="ogp-h">NY Priority vs Priority</div><div id="mbbPriorityBars"></div></div><div class="ogp-card"><div class="ogp-h">Distribusi Mitra</div><div id="mbbMitraBars"></div></div><div class="ogp-card"><div class="ogp-h">SOW Order</div><div id="mbbSowBars"></div></div></div></div>');
  replaceSection('mbbOgpStatusDonut',
    '<div class="section"><p class="section-title" data-ic="🔎">Breakdown OGP</p><p class="section-desc">Sebaran order yang masih OGP. Klik baris untuk memfilter Daftar Work Order.</p>' +
    '<div class="ogp-grid"><div class="ogp-card"><div class="ogp-h">Berdasarkan Status</div><div id="mbbOgpStatusBars"></div></div><div class="ogp-card"><div class="ogp-h">Berdasarkan Sub Status</div><div id="mbbOgpSubBars"></div></div></div></div>');
  var M = install(MBBC, {title:'Daftar Work Order MBB', desc:'Klik ikon ⇅ di header untuk urutkan, ▽ untuk filter per kolom. Kolom Catatan tersimpan ke Google Sheets. Klik baris untuk detail lengkap.', placeholder:'🔎 Cari ID / Site Name / STO / Branch / Mitra...'});
  if(M){
    window.mbbGetFilteredRows = function(){ return M.wo.rows(); };
    window.mbbRenderTable = function(){ M.wo.render(); };
    window.mbbSetupFilters = function(){ M.wo.setup(); };
    window.mbbSetupSortableHeaders = function(){};
    var cntBy = function(rows, fn){ var a = {}; rows.forEach(function(r){ var k = fn(r); a[k] = (a[k] || 0) + 1; }); return Object.keys(a).map(function(k){ return [k, a[k]]; }).sort(function(x,y){ return y[1] - x[1]; }); };
    window.mbbRenderPriorityChart = function(){
      if(!mbbAGG) return;
      var rows = mbbAGG.rows, tot = rows.length;
      barList('mbbPriorityBars', cntBy(rows, mbbPriorityBucket), { total:tot, colors:function(l){ return l === 'Priority' ? '#C2417A' : '#0B5CAB'; }, onPick:function(l){ mbbFilterCtl.set(function(r){ return mbbPriorityBucket(r) === l; }, 'Priority: ' + l); } });
      barList('mbbMitraBars', cntBy(rows, function(r){ return mbbGet(r,'MITRA') || 'Tidak Diketahui'; }), { total:tot, limit:8, onPick:function(l){ mbbFilterCtl.set(function(r){ return (mbbGet(r,'MITRA') || 'Tidak Diketahui') === l; }, 'Mitra: ' + l); } });
      barList('mbbSowBars', cntBy(rows, function(r){ return mbbGet(r,'SOW PRE ORDER') || 'Tidak Diketahui'; }), { total:tot, limit:8, onPick:function(l){ mbbFilterCtl.set(function(r){ return (mbbGet(r,'SOW PRE ORDER') || 'Tidak Diketahui') === l; }, 'SOW: ' + l); } });
      var ogp = rows.filter(function(r){ return mbbFiOaOgp(r) === 'ogp'; });
      var stg = function(r){ return hemStripStatusPrefix(mbbRowStatusLabel(r)).toUpperCase(); };
      var sub = function(r){ return mbbGet(r,'SUB STATUS') || 'Tidak Diketahui'; };
      barList('mbbOgpStatusBars', cntBy(ogp, stg), { total:ogp.length, limit:10, onPick:function(l){ mbbFilterCtl.set(function(r){ return mbbFiOaOgp(r) === 'ogp' && stg(r) === l; }, 'Status: ' + l); } });
      barList('mbbOgpSubBars', cntBy(ogp, sub), { total:ogp.length, limit:10, onPick:function(l){ mbbFilterCtl.set(function(r){ return mbbFiOaOgp(r) === 'ogp' && sub(r) === l; }, 'Sub Status: ' + l); } });
      M.perf.render();
    };
    window.mbbRenderMitraChart = function(){}; window.mbbRenderSowChart = function(){};
  }

  var progLabel = function(r){ return hemStripStatusPrefix(hemRowProgressLabel(r)).toUpperCase(); };
  var progLabelO = function(r){ return hemStripStatusPrefix(oloRowProgressLabel(r)).toUpperCase(); };

  if(H){
    window.hemGetFilteredRows = function(){ return H.wo.rows(); };
    window.hemRenderTable = function(){ H.wo.render(); };
    window.hemSetupFilters = function(){ H.wo.setup(); };
    window.hemSetupSortableHeaders = function(){};
    window.hemRenderDistrictChart = function(){};
    window.hemRenderSlaChart = function(){
      if(!hemAGG) return;
      var a = hemAGG.slaAgg, tot = a.in + a.out + a.other;
      barList('hemSlaBars', [['IN SLA', a.in], ['OUT SLA', a.out], ['TIDAK MASUK PERHITUNGAN', a.other]], { total: tot,
        colors:function(l){ return l === 'IN SLA' ? '#167A4B' : (l === 'OUT SLA' ? '#D7141A' : '#8992A8'); },
        onPick:function(l){ var want = l === 'IN SLA' ? 'in' : (l === 'OUT SLA' ? 'out' : 'empty'); hemFilterCtl.set(function(r){ var s = hemSlaClass(hemGet(r,'SLA')); return want === 'empty' ? (s !== 'in' && s !== 'out') : s === want; }, 'SLA: ' + l); } });
      var de = Object.keys(hemAGG.districtAgg).map(function(k){ return [k, hemAGG.districtAgg[k]]; }).sort(function(x,y){ return y[1] - x[1]; });
      barList('hemDistrictBars', de, { limit:10, total: hemAGG.totalCount, onPick:function(l){ hemFilterCtl.set(function(r){ return (hemGet(r,'DISTRICT') || 'Tidak Diketahui') === l; }, 'District: ' + l); } });
      var ogp = hemAGG.rows.filter(function(r){ return hemCat(r) === 'ogp'; }), agg = {};
      ogp.forEach(function(r){ var l = progLabel(r); agg[l] = (agg[l] || 0) + 1; });
      barList('hemOgpBars', Object.keys(agg).map(function(k){ return [k, agg[k]]; }).sort(function(x,y){ return y[1] - x[1]; }), { total: ogp.length, limit:10,
        onPick:function(l){ hemFilterCtl.set(function(r){ return hemCat(r) === 'ogp' && progLabel(r) === l; }, 'Progres: ' + l); } });
      H.perf.render();
    };
  }
  if(O){
    window.oloGetFilteredRows = function(){ return O.wo.rows(); };
    window.oloRenderTable = function(){ O.wo.render(); };
    window.oloSetupFilters = function(){ O.wo.setup(); };
    window.oloSetupSortableHeaders = function(){};
    window.oloRenderDistrictChart = function(){
      if(!oloAGG) return;
      var de = Object.keys(oloAGG.districtAgg).map(function(k){ return [k, oloAGG.districtAgg[k]]; }).sort(function(x,y){ return y[1] - x[1]; });
      barList('oloDistrictBars', de, { limit:10, total: oloAGG.totalCount, onPick:function(l){ oloFilterCtl.set(function(r){ return (oloGet(r,'DISTRICT') || 'Tidak Diketahui') === l; }, 'District: ' + l); } });
      var ogp = oloAGG.rows.filter(function(r){ return oloCat(r) === 'ogp'; }), agg = {};
      ogp.forEach(function(r){ var l = progLabelO(r); agg[l] = (agg[l] || 0) + 1; });
      barList('oloOgpBars', Object.keys(agg).map(function(k){ return [k, agg[k]]; }).sort(function(x,y){ return y[1] - x[1]; }), { total: ogp.length, limit:10,
        onPick:function(l){ oloFilterCtl.set(function(r){ return oloCat(r) === 'ogp' && progLabelO(r) === l; }, 'Progres: ' + l); } });
      O.perf.render();
    };
  }

  /* ---- Komitmen Golive Bulan Ini: format pivot District x Status ---- */
  function installCommit(pre, G, rowProg, ctl, aggFn){
    var body = document.getElementById(pre + 'CommitTableBody'); if(!body) return;
    var card = body.closest('.table-card'); card.style.overflowX = 'auto';
    card.innerHTML = '<table class="pivot-table"><thead><tr id="' + pre + 'CommitHead"></tr></thead><tbody id="' + pre + 'CommitTableBody"></tbody></table>';
    var stg = function(r){ return hemMergeStage(hemStripStatusPrefix(rowProg(r)).toUpperCase()); };
    var dist = function(r){ return G(r,'DISTRICT') || 'Tidak Diketahui'; };
    window[pre + 'RenderCommitTable'] = function(){
      var agg = aggFn(); var bodyEl = document.getElementById(pre + 'CommitTableBody'), headEl = document.getElementById(pre + 'CommitHead');
      if(!bodyEl || !agg) return;
      var month = window[pre + 'CommitMonthGet'](), yr = new Date().getFullYear();
      var inM = function(r){ var d = parseDMY(G(r,'Komitmen Golive')); return d && d.getFullYear() === yr && d.getMonth() === month; };
      var rows = agg.rows.filter(inM);
      var cols = Array.from(new Set(rows.map(stg))).sort(function(a,b){ return progressStageSortIndex(a) - progressStageSortIndex(b); });
      if(!rows.length){ headEl.innerHTML = '<th>District</th><th>Total</th>'; bodyEl.innerHTML = '<tr><td colspan="2" style="text-align:center;padding:14px;">Tidak ada komitmen di bulan ini.</td></tr>'; return; }
      var pv = {}, tot = {};
      rows.forEach(function(r){ var d = dist(r), s2 = stg(r); (pv[d] = pv[d] || {})[s2] = (pv[d][s2] || 0) + 1; tot[d] = (tot[d] || 0) + 1; });
      var ds = Object.keys(pv).sort(function(a,b){ return tot[b] - tot[a]; });
      headEl.innerHTML = '<th class="pivot-sticky-col">District</th>' + cols.map(function(c){ return '<th class="cat-' + hemCategoryOfLabel(c) + '">' + esc(c) + '</th>'; }).join('') + '<th>Total</th>';
      var ct = {}; cols.forEach(function(c){ ct[c] = 0; });
      var spec = function(o){ return JSON.stringify(o).replace(/"/g,'&quot;'); };
      bodyEl.innerHTML = ds.map(function(d){
        return '<tr><td class="name pivot-sticky-col">' + esc(d) + '</td>' + cols.map(function(c){
          var v = pv[d][c] || 0; ct[c] += v;
          return '<td class="cat-' + hemCategoryOfLabel(c) + (v ? ' clickable-cell" data-flt="' + spec({district:d, stage:c, month:month, label:'Komitmen ' + d + ' \u2014 ' + c}) : '') + '">' + (v || '\u2014') + '</td>';
        }).join('') + '<td><strong>' + tot[d] + '</strong></td></tr>';
      }).join('') + '<tr class="pivot-total"><td class="name pivot-sticky-col">TOTAL</td>' + cols.map(function(c){ return '<td>' + ct[c] + '</td>'; }).join('') + '<td>' + rows.length + '</td></tr>';
      wireClickableCells(pre + 'CommitTableBody', ctl, function(sp){ return function(r){ return inM(r) && dist(r) === sp.district && stg(r) === sp.stage; }; });
    };
  }
  window.hemCommitMonthGet = function(){ return hemCommitMonth; }; window.oloCommitMonthGet = function(){ return oloCommitMonth; };
  installCommit('hem', hemGet, hemRowProgressLabel, hemFilterCtl, function(){ return hemAGG; });
  installCommit('olo', oloGet, oloRowProgressLabel, oloFilterCtl, function(){ return oloAGG; });
  // render ulang bila data sudah dimuat sebelum script ini jalan
  try{ window.hemRenderCommitTable(); }catch(e){}
  try{ window.oloRenderCommitTable(); }catch(e){}
  try{ if(typeof hemAGG !== 'undefined' && hemAGG){ window.hemRenderSlaChart(); H.wo.setup(); H.wo.render(); } }catch(e){}
  try{ if(M && typeof mbbAGG !== 'undefined' && mbbAGG){ window.mbbRenderPriorityChart(); M.wo.setup(); M.wo.render(); } }catch(e){}
  try{ if(typeof oloAGG !== 'undefined' && oloAGG){ window.oloRenderDistrictChart(); O.wo.setup(); O.wo.render(); } }catch(e){}
})();
