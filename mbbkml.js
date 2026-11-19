/* Halaman MBB → KML: daftar file KML/KMZ MBB di Google Drive (folder KaeMeL/MBB),
   digabung dengan data MBB (cocok lewat Site Name). */
(function(){
  'use strict';
  var esc = function(t){ return (t==null?'':String(t)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };
  var norm = function(s){ return String(s||'').toUpperCase().replace(/\.(KML|KMZ)$/,'').replace(/[^A-Z0-9]+/g,''); };
  var S = { q:'', tipe:'', status:'', sort:null, dir:1 };
  var COLS = [
    {k:'file', h:'File', get:function(r){ return r.name; }},
    {k:'tipe', h:'Tipe', get:function(r){ return r.ext.toUpperCase(); }, sel:1},
    {k:'id', h:'ID MBB', get:function(r){ return r.mbb ? mbbGet(r.mbb,'ID') : ''; }},
    {k:'branch', h:'Branch', get:function(r){ return r.mbb ? mbbGet(r.mbb,'BRANCH') : ''; }, sel:1},
    {k:'sto', h:'STO', get:function(r){ return r.mbb ? mbbGet(r.mbb,'STO') : ''; }},
    {k:'status', h:'Status MBB', get:function(r){ return r.mbb ? mbbGet(r.mbb,'STATUS') : ''; }, sel:1},
    {k:'sub', h:'Sub Status', get:function(r){ return r.mbb ? mbbGet(r.mbb,'SUB STATUS') : ''; }},
    {k:'komit', h:'Komitmen OA', get:function(r){ return r.mbb ? mbbGet(r.mbb,'TGL COMMIT OA FIX') : ''; }},
    {k:'size', h:'Ukuran', get:function(r){ return r.size; }, num:1, fmt:function(v){ return v ? (v/1024).toFixed(0) + ' KB' : '—'; }},
    {k:'tgl', h:'Diupload', get:function(r){ return r.date; }}
  ];
  var F = {};
  function rows(){
    var files = ((window.KML_FILES||{}).mbb) || [];
    var idx = {};
    if(typeof mbbRows !== 'undefined' && mbbRows && mbbRows.length){
      mbbRows.forEach(function(r){ var n = norm(mbbGet(r,'SITE NAME')), m = norm(mbbGet(r,'SITE ID')); if(n && !idx[n]) idx[n] = r; if(m && !idx[m]) idx[m] = r; });
    }
    return files.map(function(f){ return {id:f[0], name:f[1], ext:f[2]||'kml', size:f[3]||0, date:f[4]||'', mbb: idx[norm(f[1])] || null}; });
  }
  function filtered(all){
    var q = S.q.toLowerCase();
    return all.filter(function(r){
      if(q && COLS.map(function(c){ return c.get(r); }).join(' ').toLowerCase().indexOf(q) < 0) return false;
      for(var i=0;i<COLS.length;i++){ var c = COLS[i], f = F[c.k]; if(!f) continue;
        var v = c.get(r);
        if(c.sel){ if((v||'(kosong)') !== f) return false; }
        else if(String(v).toLowerCase().indexOf(String(f).toLowerCase()) < 0) return false; }
      return true;
    });
  }
  function render(){
    var host = document.getElementById('mbbKmlHost'); if(!host) return;
    var all = rows(), data = filtered(all);
    if(S.sort){ var c = COLS.filter(function(x){ return x.k===S.sort; })[0];
      data.sort(function(a,b){ var x=c.get(a), y=c.get(b); return (c.num ? x-y : String(x).localeCompare(String(y),'id',{numeric:true})) * S.dir; }); }
    var matched = all.filter(function(r){ return r.mbb; }).length;
    var folder = 'https://drive.google.com/drive/folders/' + ((window.KML_FOLDERS||{}).mbb || '');
    var head = '<tr>' + COLS.map(function(c){ return '<th data-k="'+c.k+'" style="cursor:pointer;white-space:nowrap;">'+c.h+' <span style="opacity:.5">'+(S.sort===c.k?(S.dir>0?'▲':'▼'):'⇅')+'</span></th>'; }).join('') + '<th>Buka</th></tr>' +
      '<tr>' + COLS.map(function(c){
        if(c.sel){ var vals = Array.from(new Set(all.map(function(r){ return c.get(r) || '(kosong)'; }))).sort();
          return '<th><select data-f="'+c.k+'" style="width:100%;min-width:80px;font-size:11px;"><option value="">Semua</option>'+vals.map(function(v){ return '<option'+(F[c.k]===v?' selected':'')+'>'+esc(v)+'</option>'; }).join('')+'</select></th>'; }
        return '<th><input data-f="'+c.k+'" value="'+esc(F[c.k]||'')+'" placeholder="filter" style="width:100%;min-width:60px;font-size:11px;box-sizing:border-box;"></th>'; }).join('') + '<th></th></tr>';
    var body = data.map(function(r){
      return '<tr>' + COLS.map(function(c){ var v = c.get(r); var t = c.fmt ? c.fmt(v) : (v || '—');
        return '<td' + (c.k==='file' ? ' class="name"' : '') + '>' + esc(t) + '</td>'; }).join('') +
        '<td><a href="https://drive.google.com/file/d/'+r.id+'/view" target="_blank" rel="noopener" style="font-weight:700;text-decoration:none;">🗺️ Buka</a></td></tr>';
    }).join('') || '<tr><td colspan="'+(COLS.length+1)+'" style="text-align:center;padding:30px;">Tidak ada file yang cocok.</td></tr>';
    var hadFocus = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.f;
    host.innerHTML =
      '<div class="section" style="margin-top:0;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">' +
      '<div><p class="section-title" style="margin-bottom:2px;">MBB — KML / KMZ</p><p class="section-desc" style="margin:0;">File KML & KMZ MBB yang sudah di-share di Google Drive (folder MBB). Dicocokkan ke data MBB lewat Site ID / Site Name.</p></div>' +
      '<a class="download-btn" href="'+folder+'" target="_blank" rel="noopener" style="margin-top:0;text-decoration:none;">📁 Buka folder Drive</a></div>' +
      '<div class="kpi-row"><div class="kpi"><div class="accent" style="background:#0a2342"></div><p class="kpi-label">File KML/KMZ</p><p class="kpi-value">'+all.length+'</p></div>' +
      '<div class="kpi"><div class="accent" style="background:#167A4B"></div><p class="kpi-label">Cocok dengan data MBB</p><p class="kpi-value">'+matched+'</p></div>' +
      '<div class="kpi"><div class="accent" style="background:#d69e2e"></div><p class="kpi-label">Belum cocok</p><p class="kpi-value">'+(all.length-matched)+'</p></div></div>' +
      '<div class="filters"><input type="text" id="mbbKmlSearch" placeholder="Cari nama file, ID, STO, status..." value="'+esc(S.q)+'"><span class="count">'+data.length+' file</span></div>' +
      '<div class="table-card" style="overflow-x:auto;"><table class="mbb-report-table"><thead>'+head+'</thead><tbody>'+body+'</tbody></table></div></div>';
    var sb = document.getElementById('mbbKmlSearch');
    sb.oninput = function(){ S.q = sb.value; var pos = sb.selectionStart; render(); var n = document.getElementById('mbbKmlSearch'); n.focus(); n.setSelectionRange(pos,pos); };
    host.querySelectorAll('thead th[data-k]').forEach(function(th){ th.onclick = function(){
      var k = th.dataset.k; if(S.sort===k){ if(S.dir>0) S.dir=-1; else S.sort=null; } else { S.sort=k; S.dir=1; } render(); }; });
    host.querySelectorAll('[data-f]').forEach(function(el){
      var run = function(){ F[el.dataset.f] = el.value; var k = el.dataset.f, pos = el.selectionStart; render(); var n = host.querySelector('[data-f="'+k+'"]'); if(n && n.tagName==='INPUT'){ n.focus(); n.setSelectionRange(pos,pos); } };
      if(el.tagName==='SELECT') el.onchange = run; else el.oninput = run; });
  }
  window.mbbKmlOpen = function(){ render(); setTimeout(render, 1500); };
})();
