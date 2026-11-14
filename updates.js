/* Halaman "Update Terbaru": feed perubahan order dari tab UPDATE_LOG (diisi BotUpdateHarian.gs). */
(function(){
  'use strict';
  var host = document.getElementById('updHost'); if(!host) return;
  var SS = '1PGH5LCx2zyFn2ps8J9kJ93tc6KjnLc1Hof1F2SB8DBM';
  var URLS = ['https://docs.google.com/spreadsheets/d/' + SS + '/gviz/tq?tqx=out:csv&sheet=UPDATE_LOG', 'https://docs.google.com/spreadsheets/d/' + SS + '/export?format=csv&sheet=UPDATE_LOG'];
  var esc = function(t){ return String(t == null ? '' : t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };
  var JENIS = {
    GOLIVE:{ l:'Golive', ic:'🟢', c:'g' }, DROP:{ l:'Drop', ic:'🔴', c:'d' }, NAIK:{ l:'Naik Tahap', ic:'🔼', c:'b' }, MUNDUR:{ l:'Mundur', ic:'🔽', c:'o' },
    STATUS:{ l:'Status Berubah', ic:'🔁', c:'b' }, KOMIT:{ l:'Komitmen Berubah', ic:'⏰', c:'o' }, UPDATE:{ l:'Update Baru', ic:'📝', c:'p' }, BARU:{ l:'LoP Baru', ic:'🆕', c:'p' }
  };
  var S = { data: null, period: '7', src: '', jenis: '', q: '', err: '' };
  var st = document.createElement('style');
  st.textContent = '.upd-wrap .uc{background:var(--panel);border:1px solid var(--line);border-left:4px solid var(--blue,#0B5CAB);border-radius:10px;padding:10px 14px;margin-bottom:8px;}' +
    '.upd-wrap .uc.g{border-left-color:#167A4B}.upd-wrap .uc.d{border-left-color:#D7141A}.upd-wrap .uc.o{border-left-color:#C27A0A}.upd-wrap .uc.p{border-left-color:#7A6BCB}' +
    '.upd-wrap .uh{font-size:12px;font-weight:700;margin:16px 2px 8px;color:var(--text-dim);display:flex;align-items:center;gap:8px;}.upd-wrap .uh:after{content:"";flex:1;height:1px;background:var(--line);}' +
    '.upd-wrap .ut{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:12px;}.upd-wrap .un{font-weight:700;font-size:13.5px;margin:4px 0 2px;}' +
    '.upd-wrap .us{font-size:12px;color:var(--text-dim);}.upd-wrap .ud{font-size:12px;margin-top:5px;padding:6px 9px;border-radius:7px;background:var(--panel-2,#F5F7FA);color:var(--text-dim);}' +
    '.upd-wrap .utag{padding:2px 9px;border-radius:99px;font-weight:700;font-size:11px;background:#E4EEFA;color:#0B5CAB}.upd-wrap .utag.g{background:#E1F4EA;color:#167A4B}.upd-wrap .utag.d{background:#FBE4E5;color:#D7141A}.upd-wrap .utag.o{background:#FFF0D6;color:#C27A0A}.upd-wrap .utag.p{background:#ECE9FA;color:#6354B8}' +
    '.upd-wrap .usrc{padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;background:var(--navy,#0B1F3A);color:#fff}.upd-wrap .uarr{font-weight:700}.upd-wrap .uid{cursor:pointer;font-family:monospace;color:var(--text-faint)}';
  document.head.appendChild(st);

  function parseCsv(text){
    var rows = Papa.parse(text, { skipEmptyLines: true }).data; if(!rows.length) return [];
    var h = rows[0].map(function(x){ return String(x).trim().toLowerCase(); }); var ix = function(n){ return h.indexOf(n); };
    if(ix('jenis') < 0) throw new Error('Format tab UPDATE_LOG tidak dikenali');
    return rows.slice(1).map(function(r){ return { tgl:r[ix('tanggal')] || '', src:r[ix('src')] || '', id:r[ix('id')] || '', nama:r[ix('nama')] || '', branch:r[ix('branch')] || '', jenis:(r[ix('jenis')] || '').toUpperCase(), dari:r[ix('dari')] || '', ke:r[ix('ke')] || '', cat:r[ix('catatan')] || '' }; }).filter(function(r){ return /^\d{4}-\d{2}-\d{2}/.test(r.tgl) && JENIS[r.jenis]; });
  }
  async function load(){
    S.err = ''; render(true);
    var last = null;
    for(var i = 0; i < URLS.length; i++){
      try{
        var res = await fetch(URLS[i] + '&_=' + Date.now(), { cache: 'no-store' });
        if(!res.ok){ last = new Error('HTTP ' + res.status); continue; }
        var t = await res.text(); if(!t || t.trim().charAt(0) === '<'){ last = new Error('Tab UPDATE_LOG belum ada / sheet belum dibagikan'); continue; }
        S.data = parseCsv(t); S.loaded = new Date(); render(); return;
      }catch(e){ last = e; }
    }
    S.data = S.data || []; S.err = (last && last.message) || 'gagal memuat'; render();
  }
  var dayDiff = function(iso){ var d = new Date(iso.slice(0,10) + 'T00:00:00'), n = new Date(); n.setHours(0,0,0,0); return Math.round((n - d) / 86400000); };
  var fmtTgl = function(iso){ var d = new Date(iso.slice(0,10) + 'T00:00:00'); var df = dayDiff(iso); var lbl = df === 0 ? 'Hari ini' : (df === 1 ? 'Kemarin' : ''); return (lbl ? lbl + ' · ' : '') + d.toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' }); };

  function filtered(){
    var q = S.q.trim().toLowerCase();
    return (S.data || []).filter(function(r){
      var df = dayDiff(r.tgl);
      if(S.period === '0' && df !== 0) return false; if(S.period === '1' && df !== 1) return false;
      if(S.period === '7' && df > 6) return false; if(S.period === '30' && df > 29) return false;
      return (!S.src || r.src === S.src) && (!S.jenis || r.jenis === S.jenis) && (!q || (r.id + ' ' + r.nama + ' ' + r.branch).toLowerCase().indexOf(q) >= 0);
    });
  }
  function chips(items, cur, key){ return items.map(function(i){ return '<button type="button" class="' + (i[0] === cur ? 'on' : '') + '" data-k="' + key + '" data-v="' + i[0] + '">' + i[1] + '</button>'; }).join(''); }

  function render(loading){
    var h = '<div class="upd-wrap"><div class="section" style="margin-top:0;"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;"><div><p class="section-title" data-ic="🆕" style="margin-bottom:2px;">Update Terbaru</p><p class="section-desc" style="margin:0;">Apa yang berubah di order-order yang sedang berjalan: Golive, Drop, naik tahap, komitmen bergeser, dan update baru. Dicatat otomatis tiap hari oleh bot.</p></div><button type="button" class="download-btn" id="updRefresh" style="margin:0;">↻ Muat ulang</button></div>';
    if(loading && !S.data){ host.innerHTML = h + '<p class="section-desc">Memuat...</p></div></div>'; return; }
    if(S.err){ h += '<div class="active-filter-badge" style="display:flex;background:#FBE4E5;color:#D7141A;margin-top:10px;">⚠ ' + esc(S.err) + '</div>'; }
    if(!S.data || !S.data.length){
      h += '<div class="card" style="margin-top:12px;padding:18px;"><b>Belum ada data perubahan.</b><div class="section-desc" style="margin-top:6px;">Log diisi oleh script <code>BotUpdateHarian.gs</code>. Pasang script itu di Apps Script, jalankan <code>testDigestSekarang</code> sekali (run pertama hanya menyimpan baseline), lalu <code>pasangTriggerHarian</code>. Perubahan mulai muncul di sini dari run kedua.</div></div></div></div>';
      host.innerHTML = h; bind(); return;
    }
    var all = S.data, list = filtered();
    var cnt = function(j){ return list.filter(function(r){ return r.jenis === j; }).length; };
    var uniq = {}; list.forEach(function(r){ uniq[r.src + '|' + r.id] = 1; });
    h += '<div class="wo-summary" style="margin-top:12px;">' +
      '<div class="wo-sum"><b>' + Object.keys(uniq).length + '</b><span>LoP berubah</span></div>' +
      '<div class="wo-sum g"><b>' + cnt('GOLIVE') + '</b><span>Golive</span></div><div class="wo-sum d"><b>' + cnt('DROP') + '</b><span>Drop</span></div>' +
      '<div class="wo-sum"><b>' + (cnt('NAIK') + cnt('STATUS')) + '</b><span>Naik / ubah tahap</span></div><div class="wo-sum o"><b>' + cnt('MUNDUR') + '</b><span>Mundur</span></div>' +
      '<div class="wo-sum o"><b>' + cnt('KOMIT') + '</b><span>Komitmen berubah</span></div><div class="wo-sum p"><b>' + cnt('UPDATE') + '</b><span>Update baru</span></div></div>';
    var srcs = Array.from(new Set(all.map(function(r){ return r.src; })));
    h += '<div class="wo-quick"><span class="wo-ql">Periode:</span>' + chips([['0','Hari ini'],['1','Kemarin'],['7','7 hari'],['30','30 hari'],['all','Semua']], S.period, 'period') + '</div>';
    h += '<div class="wo-quick"><span class="wo-ql">Jenis:</span>' + chips([['','Semua']].concat(Object.keys(JENIS).map(function(k){ return [k, JENIS[k].ic + ' ' + JENIS[k].l]; })), S.jenis, 'jenis') + '</div>';
    h += '<div class="wo-quick"><span class="wo-ql">Sumber:</span>' + chips([['','Semua']].concat(srcs.map(function(s){ return [s, s]; })), S.src, 'src') + '</div>';
    h += '<div class="wo-toolbar"><input type="text" id="updSearch" placeholder="🔎 Cari ID / nama / branch..." value="' + esc(S.q) + '"><span class="count">' + list.length + ' perubahan</span></div>';
    if(!list.length){ h += '<div class="section-desc" style="padding:20px;text-align:center;">Tidak ada perubahan pada filter ini.</div>'; }
    var byDate = {}; list.forEach(function(r){ (byDate[r.tgl.slice(0,10)] = byDate[r.tgl.slice(0,10)] || []).push(r); });
    Object.keys(byDate).sort().reverse().forEach(function(d){
      h += '<div class="uh">' + esc(fmtTgl(d)) + ' · ' + byDate[d].length + '</div>';
      byDate[d].forEach(function(r){
        var j = JENIS[r.jenis];
        var arrow = (r.dari || r.ke) && r.jenis !== 'UPDATE' ? '<div class="us">' + esc(r.dari || '—') + ' <span class="uarr">→</span> <b>' + esc(r.ke || '—') + '</b></div>' : '';
        var note = r.cat ? '<div class="ud">' + esc(r.cat) + '</div>' : '';
        h += '<div class="uc ' + j.c + '"><div class="ut"><span class="utag ' + j.c + '">' + j.ic + ' ' + j.l + '</span><span class="usrc">' + esc(r.src) + '</span><span class="uid" data-id="' + esc(r.id) + '" title="Klik untuk salin">' + esc(r.id) + '</span><span class="us">' + esc(r.branch) + '</span></div><div class="un">' + esc(r.nama) + '</div>' + arrow + note + '</div>';
      });
    });
    h += '</div></div>';
    host.innerHTML = h; bind();
  }
  function bind(){
    var rf = document.getElementById('updRefresh'); if(rf) rf.onclick = load;
    host.querySelectorAll('.wo-quick button').forEach(function(b){ b.onclick = function(){ S[b.dataset.k] = b.dataset.v; render(); }; });
    var q = document.getElementById('updSearch'); if(q) q.oninput = function(){ S.q = this.value; var p = this.selectionStart; render(); var n = document.getElementById('updSearch'); n.focus(); n.setSelectionRange(p, p); };
    host.querySelectorAll('.uid').forEach(function(el){ el.onclick = function(){ try{ navigator.clipboard.writeText(el.dataset.id); el.textContent = 'tersalin ✓'; setTimeout(function(){ el.textContent = el.dataset.id; }, 900); }catch(e){} }; });
  }
  window.updOpen = function(){ if(!S.data || !S.loaded || (new Date() - S.loaded) > 300000) load(); else render(); };
})();
