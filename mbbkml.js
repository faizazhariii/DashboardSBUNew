/* Halaman MBB → KML: daftar file KML/KMZ MBB (Google Drive, folder MBB) + peta Leaflet.
   File ikut dibundel di folder kml/mbb/<driveId>.<kml|kmz> (browser tidak bisa baca Drive langsung). */
(function(){
  'use strict';
  var $ = function(id){ return document.getElementById(id); };
  var esc = function(t){ return (t==null?'':String(t)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };
  var PAL = ['#E31B23','#1E6BFF','#22B14C','#F28C28','#8E44AD','#00A8A8','#C2185B','#6D4C41','#2E7D32','#AD1457'];
  var map, base = {}, curBase, inited = false, files = [], layers = {}, loading = {}, q = '', labelsOn = false;

  function list(){ return (((window.KML_FILES||{}).mbb) || []).map(function(f, i){ return {id:f[0], name:f[1], ext:f[2]||'kml', size:f[3]||0, color:PAL[i % PAL.length]}; }).sort(function(a,b){ return a.name.localeCompare(b.name,'id',{numeric:true}); }); }

  function kc(c, def){ /* KML aabbggrr -> css */
    if(!c || c.length < 8) return def; c = c.trim();
    return {color:'#' + c.substr(6,2) + c.substr(4,2) + c.substr(2,2), opacity:parseInt(c.substr(0,2),16)/255};
  }
  function attr(n, k){ return n.getAttribute(k) || n.getAttribute('kml:' + k) || n.getAttribute('xml:' + k) || ''; }
  function first(n, tag){ var l = n.getElementsByTagName(tag); return l.length ? l[0] : null; }
  function ptxt(n, tag){ var c = first(n, tag); return c ? c.textContent.trim() : ''; }
  function coords(t){
    return (t || '').trim().split(/\s+/).map(function(s){ var p = s.split(',').map(Number); return (isFinite(p[0]) && isFinite(p[1])) ? [p[1], p[0]] : null; }).filter(Boolean);
  }
  function styleMap(doc){
    var S = {}, M = {};
    Array.prototype.forEach.call(doc.getElementsByTagName('Style'), function(s){
      var id = attr(s, 'id'); if(!id) return;
      var ls = first(s,'LineStyle'), ps = first(s,'PolyStyle');
      S[id] = { line: ls ? kc(ptxt(ls,'color')) : null, w: ls ? parseFloat(ptxt(ls,'width')) || null : null, poly: ps ? kc(ptxt(ps,'color')) : null };
    });
    Array.prototype.forEach.call(doc.getElementsByTagName('StyleMap'), function(m){
      var id = attr(m, 'id'); if(!id) return;
      var pairs = m.getElementsByTagName('Pair');
      for(var i = 0; i < pairs.length; i++){ if(ptxt(pairs[i],'key') === 'normal'){ M[id] = ptxt(pairs[i],'styleUrl').replace(/^#/,''); break; } }
    });
    return function(pm){
      var u = ptxt(pm,'styleUrl').replace(/^#/,''); if(M[u]) u = M[u];
      var inl = first(pm,'Style'), st = S[u] || {};
      if(inl){ var ls = first(inl,'LineStyle'), ps = first(inl,'PolyStyle');
        st = { line: ls ? kc(ptxt(ls,'color')) : st.line, w: ls ? parseFloat(ptxt(ls,'width')) || st.w : st.w, poly: ps ? kc(ptxt(ps,'color')) : st.poly }; }
      return st;
    };
  }
  function build(xml, f){
    var doc = new DOMParser().parseFromString(xml, 'text/xml');
    var getSt = styleMap(doc), g = L.featureGroup(), n = 0;
    Array.prototype.forEach.call(doc.getElementsByTagName('Placemark'), function(pm){
      var name = ptxt(pm,'name'), desc = ptxt(pm,'description'), st = getSt(pm);
      var pop = '<b>' + esc(name || f.name) + '</b>' + (desc ? '<div style="max-height:140px;overflow:auto;font-size:12px;margin-top:4px;">' + (desc.length < 600 ? desc.replace(/<script[\s\S]*?<\/script>/gi,'') : esc(desc.slice(0,600)) + '…') + '</div>' : '') + '<div style="font-size:11px;color:#777;margin-top:4px;">' + esc(f.name) + '</div>';
      var lc = (st.line && st.line.color) || f.color, lo = (st.line && st.line.opacity != null) ? Math.max(st.line.opacity, .5) : .9;
      Array.prototype.forEach.call(pm.getElementsByTagName('LineString'), function(ln){
        var c = coords(ptxt(ln,'coordinates')); if(c.length < 2) return;
        L.polyline(c, {color:lc, weight:Math.min(Math.max(st.w || 3, 2), 6), opacity:lo}).bindPopup(pop).addTo(g); n++;
      });
      Array.prototype.forEach.call(pm.getElementsByTagName('Polygon'), function(pg){
        var ob = first(pg,'outerBoundaryIs'); var c = coords(ptxt(ob || pg,'coordinates')); if(c.length < 3) return;
        L.polygon(c, {color:lc, weight:2, fillColor:(st.poly && st.poly.color) || lc, fillOpacity:.25}).bindPopup(pop).addTo(g); n++;
      });
      Array.prototype.forEach.call(pm.getElementsByTagName('Point'), function(pt){
        var c = coords(ptxt(pt,'coordinates'))[0]; if(!c) return;
        var m = L.circleMarker(c, {radius:6, color:'#222', weight:1.5, fillColor:f.color, fillOpacity:.95}).bindPopup(pop);
        if(name) m.bindTooltip(esc(name), {permanent:false, direction:'top', className:'mbbkml-tt'});
        m.addTo(g); n++;
      });
    });
    g._n = n; return g;
  }
  async function fetchKml(f){
    var buf = null, txt = null;
    var r = await fetch('kml/mbb/' + f.id + '.' + f.ext + '?v=20261120a').catch(function(){ return null; });
    if(r && r.ok){ if(f.ext === 'kmz') buf = await r.arrayBuffer(); else txt = await r.text(); }
    else if(window.KML_API_URL){ /* file baru (belum dibundel): ambil lewat Apps Script */
      var j = await (await fetch(window.KML_API_URL + '?action=get&id=' + f.id)).json(); if(!j.ok) throw new Error(j.error || 'gagal');
      var bin = atob(j.b64), u8 = new Uint8Array(bin.length); for(var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      if(f.ext === 'kmz') buf = u8.buffer; else txt = new TextDecoder('utf-8').decode(u8);
    } else throw new Error('file belum ada di dashboard');
    if(txt !== null) return txt;
    if(f.ext === 'kmz'){
      var z = await JSZip.loadAsync(buf);
      var k = Object.keys(z.files).filter(function(n){ return /\.kml$/i.test(n); })[0];
      if(!k) throw new Error('KMZ kosong');
      return z.files[k].async('string');
    }
  }
  function status(t, err){ var el = $('mbbKmlStatus'); if(el){ el.textContent = t; el.style.color = err ? '#E31B23' : ''; } }
  async function show(f, on, fit){
    var cb = document.querySelector('#mbbKmlList input[data-id="' + f.id + '"]'); if(cb) cb.checked = on;
    if(!on){ if(layers[f.id]) map.removeLayer(layers[f.id]); updCount(); return; }
    if(!layers[f.id]){
      if(loading[f.id]) return; loading[f.id] = 1;
      try{ layers[f.id] = build(await fetchKml(f), f); }
      catch(e){ status('Gagal memuat ' + f.name + ': ' + e.message, true); if(cb) cb.checked = false; delete loading[f.id]; return; }
      delete loading[f.id];
    }
    layers[f.id].addTo(map);
    if(fit){ var b = layers[f.id].getBounds(); if(b.isValid()) map.fitBounds(b.pad(.15), {maxZoom:19}); }
    updCount();
  }
  function shownIds(){ return Object.keys(layers).filter(function(id){ return map.hasLayer(layers[id]); }); }
  function updCount(){ status(shownIds().length + ' file tampil di peta'); }
  function fitAll(){
    var b = null; shownIds().forEach(function(id){ var x = layers[id].getBounds(); if(x.isValid()) b = b ? b.extend(x) : L.latLngBounds(x.getSouthWest(), x.getNorthEast()); });
    if(b) map.fitBounds(b.pad(.1)); 
  }
  function renderList(){
    var host = $('mbbKmlList'), ql = q.toLowerCase();
    var on = {}; shownIds().forEach(function(id){ on[id] = 1; });
    host.innerHTML = files.filter(function(f){ return !ql || f.name.toLowerCase().indexOf(ql) >= 0; }).map(function(f){
      return '<label class="mk-row"><input type="checkbox" data-id="' + f.id + '"' + (on[f.id] ? ' checked' : '') + '><i style="background:' + f.color + '"></i><span class="mk-n">' + esc(f.name) + '</span><span class="mk-e">' + f.ext.toUpperCase() + '</span>' +
        '<a href="https://drive.google.com/file/d/' + f.id + '/view" target="_blank" rel="noopener" title="Buka di Google Drive">↗</a></label>';
    }).join('') || '<div style="padding:14px;color:var(--text-faint)">Tidak ada file.</div>';
    host.querySelectorAll('input[data-id]').forEach(function(cb){
      var f = files.filter(function(x){ return x.id === cb.dataset.id; })[0];
      cb.onchange = function(){ show(f, cb.checked, cb.checked && shownIds().length <= 1); };
    });
  }
  function init(){
    var host = $('mbbKmlHost'); if(!host) return;
    files = list();
    var folder = 'https://drive.google.com/drive/folders/' + ((window.KML_FOLDERS||{}).mbb || '');
    host.innerHTML =
      '<style>.mk-wrap{display:grid;grid-template-columns:300px 1fr;gap:14px;margin-top:14px}@media(max-width:900px){.mk-wrap{grid-template-columns:1fr}}' +
      '.mk-side{border:1px solid var(--border,#d8dee8);border-radius:12px;background:var(--card,#fff);display:flex;flex-direction:column;height:640px;overflow:hidden}' +
      '.mk-side .mk-tools{padding:10px;border-bottom:1px solid var(--border,#d8dee8);display:flex;flex-direction:column;gap:8px}' +
      '.mk-side input[type=text]{width:100%;box-sizing:border-box}' +
      '#mbbKmlList{overflow:auto;flex:1}.mk-row{display:flex;align-items:center;gap:8px;padding:7px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid rgba(128,128,128,.12)}' +
      '.mk-row:hover{background:rgba(30,107,255,.08)}.mk-row i{width:10px;height:10px;border-radius:50%;flex:none}.mk-n{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.mk-e{font-size:10px;opacity:.55}.mk-row a{text-decoration:none;font-weight:700}' +
      '#mbbKmlMapWrap{position:relative;height:640px;border-radius:12px;overflow:hidden;border:1px solid var(--border,#d8dee8)}#mbbKmlMap{height:100%;width:100%}' +
      '#mbbKmlMapWrap.mk-full{position:fixed;inset:10px;z-index:9999;height:auto;box-shadow:0 10px 40px rgba(0,0,0,.4)}' +
      '.mk-bar{position:absolute;top:10px;right:10px;z-index:1000;display:flex;gap:6px;flex-wrap:wrap}.mk-bar button{padding:6px 10px;border-radius:8px;border:1px solid #bbb;background:#fff;color:#222;font-size:12px;cursor:pointer}' +
      '.mk-bar button.on{background:#0a2342;color:#fff}.mbbkml-tt{font-size:11px}</style>' +
      '<div class="section" style="margin-top:0;"><div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">' +
      '<div><p class="section-title" style="margin-bottom:2px;">MBB — KML / KMZ</p><p class="section-desc" style="margin:0;">Centang file di daftar untuk menampilkannya di peta. Klik garis/titik untuk detail.</p></div>' +
      '<a class="download-btn" href="' + folder + '" target="_blank" rel="noopener" style="margin-top:0;text-decoration:none;">📁 Buka folder Drive</a></div>' +
      '<div class="kpi-row"><div class="kpi"><div class="accent" style="background:#0a2342"></div><p class="kpi-label">Jumlah file KML/KMZ</p><p class="kpi-value">' + files.length + '</p></div></div>' +
      '<div class="mk-wrap"><div class="mk-side"><div class="mk-tools"><input type="text" id="mbbKmlSearch" placeholder="Cari file…">' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap"><button type="button" class="wo-btn" id="mbbKmlAllOn">✔ Semua</button><button type="button" class="wo-btn" id="mbbKmlAllOff">✕ Kosongkan</button>' +
      '<label style="font-size:12px;display:flex;align-items:center;gap:4px"><input type="checkbox" id="mbbKmlLbl"> Label</label></div>' +
      '<div id="mbbKmlStatus" style="font-size:12px;opacity:.8">0 file tampil di peta</div></div><div id="mbbKmlList"></div></div>' +
      '<div id="mbbKmlMapWrap"><div class="mk-bar"><button type="button" id="mbbKmlOsm" class="on">Peta</button><button type="button" id="mbbKmlSat">Satelit</button><button type="button" id="mbbKmlFit">⤢ Fit</button><button type="button" id="mbbKmlFull">⛶ Layar penuh</button></div><div id="mbbKmlMap"></div></div></div></div>';
    map = L.map('mbbKmlMap', {preferCanvas:true}).setView([2.2, 99.4], 8);
    base.osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom:19, attribution:'© OpenStreetMap'});
    base.sat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {maxZoom:19, attribution:'© Esri'});
    curBase = base.osm.addTo(map);
    var sw = function(k){ map.removeLayer(curBase); curBase = base[k].addTo(map); $('mbbKmlOsm').classList.toggle('on', k==='osm'); $('mbbKmlSat').classList.toggle('on', k==='sat'); };
    $('mbbKmlOsm').onclick = function(){ sw('osm'); }; $('mbbKmlSat').onclick = function(){ sw('sat'); };
    $('mbbKmlFit').onclick = fitAll;
    $('mbbKmlFull').onclick = function(){ var w = $('mbbKmlMapWrap'); w.classList.toggle('mk-full'); $('mbbKmlFull').textContent = w.classList.contains('mk-full') ? '✕ Tutup' : '⛶ Layar penuh'; setTimeout(function(){ map.invalidateSize(); }, 80); };
    document.addEventListener('keydown', function(e){ var w = $('mbbKmlMapWrap'); if(e.key === 'Escape' && w && w.classList.contains('mk-full')) $('mbbKmlFull').click(); });
    $('mbbKmlSearch').oninput = function(){ q = this.value; renderList(); };
    $('mbbKmlAllOn').onclick = async function(){
      var vis = files.filter(function(f){ return !q || f.name.toLowerCase().indexOf(q.toLowerCase()) >= 0; });
      status('Memuat ' + vis.length + ' file…');
      for(var i = 0; i < vis.length; i += 6) await Promise.all(vis.slice(i, i + 6).map(function(f){ return show(f, true, false); }));
      fitAll(); updCount();
    };
    $('mbbKmlAllOff').onclick = function(){ files.forEach(function(f){ show(f, false); }); updCount(); };
    $('mbbKmlLbl').onchange = function(){ labelsOn = this.checked; Object.keys(layers).forEach(function(id){ layers[id].eachLayer(function(l){ if(l.getTooltip && l.getTooltip()){ l.unbindTooltip(); } }); layers[id].eachLayer(function(l){ if(l instanceof L.CircleMarker && l.getPopup()){ var m = (l.getPopup().getContent()||'').match(/<b>(.*?)<\/b>/); if(m) l.bindTooltip(m[1], {permanent:labelsOn, direction:'top', className:'mbbkml-tt'}); } }); }); };
    renderList(); inited = true;
  }
  document.addEventListener('kmllinks', function(){ if(inited){ files = list(); renderList(); var kv = document.querySelector('#mbbKmlHost .kpi-value'); if(kv) kv.textContent = files.length; } });
  window.mbbKmlOpen = function(){ if(!inited) init(); else setTimeout(function(){ map.invalidateSize(); }, 60); };
  window.mbbKmlDebug = function(){ return {files:files, shown:inited ? shownIds() : []}; };
})();
