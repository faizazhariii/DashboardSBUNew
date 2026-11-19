/* Halaman MBB → KML: daftar KML/KMZ MBB (Google Drive) + peta interaktif lengkap.
   File dibundel di kml/mbb/<driveId>.<kml|kmz>; file baru dibaca lewat Apps Script (KML_API_URL). */
(function(){
  'use strict';
  var $ = function(id){ return document.getElementById(id); };
  var esc = function(t){ return (t==null?'':String(t)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };
  var PAL = ['#E31B23','#1E6BFF','#22B14C','#F28C28','#8E44AD','#00A8A8','#C2185B','#6D4C41','#2E7D32','#AD1457'];

  /* ---------- kategori objek ---------- */
  var CATS = {
    'Kabel':          {c:'#E31B23', line:1},
    'Rute / Catuan':  {c:'#1E6BFF', line:1, dash:'8 6'},
    'Garis lain':     {c:'#8E44AD', line:1},
    'Site / STO':     {c:'#0a2342', r:10, shape:'star', ring:'#F2C94C'},
    'Closure':        {c:'#E31B23', r:7.5, shape:'diamond', inner:'dot'},
    'HH / MH':        {c:'#22B14C', r:6.5, shape:'square', inner:'sq'},
    'ODP':            {c:'#F28C28', r:7, shape:'tri'},
    'ODC':            {c:'#8E44AD', r:8, shape:'hex', inner:'dot'},
    'OTB':            {c:'#00A8A8', r:6.5, shape:'diamond'},
    'Tiang Baru':     {c:'#1E6BFF', r:5, shape:'circle', inner:'dot'},
    'Tiang Existing': {c:'#7B8794', r:4.6, shape:'ring'},
    'Tiang':          {c:'#3B82F6', r:4.4, shape:'square'},
    'Slack / Hanging':{c:'#F2C94C', r:6, shape:'ring', dark:1},
    'Jembatan':       {c:'#6D4C41', r:7, shape:'rect'},
    'Penanda':        {c:'#8892A0', r:4, shape:'cross'},
    'Lainnya':        {c:'#9AA5B1', r:4, shape:'circle'}
  };
  var UNIT = {
    diamond:[[0,-1.25],[1.25,0],[0,1.25],[-1.25,0]],
    square:[[-1,-1],[1,-1],[1,1],[-1,1]],
    rect:[[-1.5,-.8],[1.5,-.8],[1.5,.8],[-1.5,.8]],
    tri:[[0,-1.2],[1.2,.95],[-1.2,.95]],
    hex:[[1.15,0],[.575,1],[-.575,1],[-1.15,0],[-.575,-1],[.575,-1]],
    star:(function(){ var p = []; for(var i = 0; i < 10; i++){ var a = -Math.PI/2 + i*Math.PI/5, r = i % 2 ? .5 : 1.25; p.push([r*Math.cos(a), r*Math.sin(a)]); } return p; })()
  };
  function zf(z){ return z <= 11 ? .55 : z <= 13 ? .75 : z <= 15 ? .95 : z <= 17 ? 1.2 : 1.55; }
  /* marker simbol di atas canvas (cepat untuk ribuan titik) */
  L.Canvas.include({
    _updateSymbol: function(l){
      if(!this._drawing || l._empty()) return;
      var ctx = this._ctx, p = l._point, r = l._radius, o = l.options, sh = o.shape;
      ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      var poly = function(unit, k){ ctx.beginPath(); unit.forEach(function(u, i){ var x = p.x + u[0]*k, y = p.y + u[1]*k; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath(); };
      if(sh === 'cross'){
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(p.x-r, p.y-r); ctx.lineTo(p.x+r, p.y+r); ctx.moveTo(p.x+r, p.y-r); ctx.lineTo(p.x-r, p.y+r); ctx.stroke();
        ctx.strokeStyle = o.fillColor; ctx.lineWidth = 2; ctx.stroke();
      } else {
        var outline = function(){ ctx.lineWidth = 2.6; ctx.strokeStyle = o.ring || '#fff'; ctx.stroke(); };
        if(sh === 'circle' || sh === 'ring'){ ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI*2); }
        else poly(UNIT[sh] || UNIT.square, r);
        outline();
        if(sh === 'ring'){ ctx.fillStyle = o.dark ? '#fff' : '#fff'; ctx.fill(); ctx.lineWidth = Math.max(2, r*.5); ctx.strokeStyle = o.fillColor; ctx.stroke(); }
        else { ctx.fillStyle = o.fillColor; ctx.fill(); }
        if(o.inner === 'dot'){ ctx.beginPath(); ctx.arc(p.x, p.y, r*.32, 0, Math.PI*2); ctx.fillStyle = '#fff'; ctx.fill(); }
        else if(o.inner === 'sq'){ ctx.fillStyle = '#fff'; var q = r*.45; ctx.fillRect(p.x - q, p.y - q, q*2, q*2); }
      }
      ctx.restore();
    }
  });
  L.SymbolMarker = L.CircleMarker.extend({
    _project: function(){ this._radius = this.options.base * zf(this._map.getZoom()); this._radiusY = this._radius; L.CircleMarker.prototype._project.call(this); },
    _updatePath: function(){ this._renderer._updateSymbol(this); }
  });
  function svgSym(c){
    var k = 8, cx = 12, col = c.c, st = 'stroke="#fff" stroke-width="2" stroke-linejoin="round"', t = '';
    if(c.shape === 'circle') t = '<circle cx="12" cy="12" r="7" fill="' + col + '" ' + st + '/>';
    else if(c.shape === 'ring') t = '<circle cx="12" cy="12" r="6" fill="#fff" stroke="' + col + '" stroke-width="3"/>';
    else if(c.shape === 'cross') t = '<path d="M6 6L18 18M18 6L6 18" stroke="' + col + '" stroke-width="2.6" stroke-linecap="round"/>';
    else { var u = UNIT[c.shape] || UNIT.square; t = '<polygon points="' + u.map(function(a){ return (12 + a[0]*k) + ',' + (12 + a[1]*k) ; }).join(' ') + '" fill="' + col + '" ' + st + '/>'; }
    if(c.inner === 'dot') t += '<circle cx="12" cy="12" r="2.4" fill="#fff"/>'; else if(c.inner === 'sq') t += '<rect x="9" y="9" width="6" height="6" fill="#fff"/>';
    return '<svg width="20" height="20" viewBox="0 0 24 24" style="flex:none;filter:drop-shadow(0 0 1px rgba(0,0,0,.6))">' + t + '</svg>';
  }
  function classify(name, isLine, folder){
    var n = (name||'').toUpperCase().trim(), f = (folder||'').toUpperCase().trim();
    if(isLine){
      if(/ROUTE|RUTE|CATUAN/.test(f) || /^(ROUTE|RUTE|UNTITLED PATH)/.test(n)) return 'Rute / Catuan';
      if(/PIPA|GALVANIS|CUTTING|ASPAL|ROJOK/.test(n)) return 'Garis lain';
      return 'Kabel';
    }
    if(/^(NEW )?SLACK|HANGING/.test(n)) return 'Slack / Hanging';
    if(/\bODP\b|^ODP/.test(n)) return 'ODP';
    if(/\bODC\b/.test(n)) return 'ODC';
    if(/\bOTB\b/.test(n)) return 'OTB';
    if(/(^|\s)(NEW\s)?CL(\b|\d|-)|CLOSURE/.test(n)) return 'Closure';
    if(/\bHH\b|\bMH\b|HANDHOLE|^HH|^MH/.test(n)) return 'HH / MH';
    if(/JEMBATAN/.test(n)) return 'Jembatan';
    if(/^(TN|NP)\b|^(TN|NP)[\s\-_]?\d|NEW (TN|TIANG)|TIANG BARU/.test(n)) return 'Tiang Baru';
    if(/^(TE|EX)\b|^(TE|EX)[\s\-_]?\d|EXIST/.test(n)) return 'Tiang Existing';
    if(/^(T|TB|TX|TIANG)[\s\-_]?\d*$|^TIANG/.test(n)) return 'Tiang';
    if(/\bSTO\b|\bSITE\b|NODE[\s-]?B|^[A-Z]{3}\d{3}\b/.test(n)) return 'Site / STO';
    if(/PENANDA|^BM\b|^TANDA/.test(n)) return 'Penanda';
    if(/CLOSURE/.test(f)) return 'Closure';
    if(/HH|MH/.test(f)) return 'HH / MH';
    if(/TIANG/.test(f)) return 'Tiang';
    if(/ODP/.test(f)) return 'ODP';
    if(/ODC/.test(f)) return 'ODC';
    if(/OTB/.test(f)) return 'OTB';
    if(/SITE|STO|NODE/.test(f)) return 'Site / STO';
    if(/JEMBATAN/.test(f)) return 'Jembatan';
    return 'Lainnya';
  }

  var BASES = {
    osm:   {n:'Jalan (OSM)',        u:'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', o:{maxZoom:20, maxNativeZoom:19, attribution:'© OpenStreetMap'}},
    light: {n:'Terang',             u:'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', o:{maxZoom:20, subdomains:'abcd', attribution:'© OpenStreetMap © CARTO'}},
    sat:   {n:'Satelit',            u:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', o:{maxZoom:20, maxNativeZoom:19, attribution:'© Esri'}},
    hyb:   {n:'Satelit + Jalan',    u:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', o:{maxZoom:20, maxNativeZoom:19, attribution:'© Esri'},
            over:['https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}','https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}']},
    topo:  {n:'Topografi',          u:'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', o:{maxZoom:20, maxNativeZoom:17, attribution:'© OpenTopoMap'}},
    dark:  {n:'Gelap',              u:'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png', o:{maxZoom:20, subdomains:'abcd', attribution:'© OpenStreetMap © CARTO'}}
  };

  var map, inited = false, files = [], q = '', data = {}, loading = {}, catOn = {}, baseLayers = [], curBase = 'osm';
  var labelMode = 'auto', labeled = new Set(), measure = null, linesR, ptsR, focusId = null;
  Object.keys(CATS).forEach(function(k){ catOn[k] = true; });

  function list(){ return (((window.KML_FILES||{}).mbb) || []).map(function(f, i){ return {id:f[0], name:f[1], ext:f[2]||'kml', size:f[3]||0, color:PAL[i % PAL.length]}; }).sort(function(a,b){ return a.name.localeCompare(b.name,'id',{numeric:true}); }); }
  function lum(h){ var n = parseInt(h.slice(1),16); return (0.299*(n>>16) + 0.587*((n>>8)&255) + 0.114*(n&255))/255; }
  function fmtLen(m){ return m >= 1000 ? (m/1000).toFixed(2) + ' km' : Math.round(m) + ' m'; }
  function lsGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
  function lsSet(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }

  /* ---------- parser KML ---------- */
  function kc(c, def){ if(!c || c.length < 8) return def; c = c.trim(); return {color:'#' + c.substr(6,2) + c.substr(4,2) + c.substr(2,2), opacity:parseInt(c.substr(0,2),16)/255}; }
  function attr(n, k){ return n.getAttribute(k) || n.getAttribute('kml:' + k) || ''; }
  function first(n, tag){ var l = n.getElementsByTagName(tag); return l.length ? l[0] : null; }
  function ownTxt(n, tag){ for(var c = n.firstElementChild; c; c = c.nextElementSibling){ if(c.localName === tag) return c.textContent.trim(); } return ''; }
  function coords(t){ return (t || '').trim().split(/\s+/).map(function(s){ var p = s.split(',').map(Number); return (isFinite(p[0]) && isFinite(p[1])) ? [p[1], p[0]] : null; }).filter(Boolean); }
  function styleResolver(doc){
    var S = {}, M = {};
    Array.prototype.forEach.call(doc.getElementsByTagName('Style'), function(s){
      var id = attr(s, 'id'); if(!id) return;
      var ls = first(s,'LineStyle'), ps = first(s,'PolyStyle');
      S[id] = {line: ls ? kc(ownTxt(ls,'color')) : null, w: ls ? parseFloat(ownTxt(ls,'width')) || null : null, poly: ps ? kc(ownTxt(ps,'color')) : null};
    });
    Array.prototype.forEach.call(doc.getElementsByTagName('StyleMap'), function(m){
      var id = attr(m, 'id'); if(!id) return;
      var pr = m.getElementsByTagName('Pair');
      for(var i = 0; i < pr.length; i++){ if(ownTxt(pr[i],'key') === 'normal'){ M[id] = ownTxt(pr[i],'styleUrl').replace(/^#/,''); break; } }
    });
    return function(pm){
      var u = ownTxt(pm,'styleUrl').replace(/^#/,''); if(M[u]) u = M[u];
      var st = S[u] || {}, inl = null;
      for(var c = pm.firstElementChild; c; c = c.nextElementSibling){ if(c.localName === 'Style'){ inl = c; break; } }
      if(inl){ var ls = first(inl,'LineStyle'), ps = first(inl,'PolyStyle'); st = {line: ls ? kc(ownTxt(ls,'color')) : st.line, w: ls ? parseFloat(ownTxt(ls,'width')) || st.w : st.w, poly: ps ? kc(ownTxt(ps,'color')) : st.poly}; }
      return st;
    };
  }
  function folderOf(pm){ for(var p = pm.parentNode; p && p.nodeType === 1; p = p.parentNode){ if(p.localName === 'Folder'){ return ownTxt(p,'name'); } } return ''; }
  function extData(pm){
    var rows = '';
    Array.prototype.forEach.call(pm.getElementsByTagName('Data'), function(d){ var v = ownTxt(d,'value'); if(v) rows += '<tr><td><b>' + esc(d.getAttribute('name')) + '</b></td><td>' + esc(v) + '</td></tr>'; });
    Array.prototype.forEach.call(pm.getElementsByTagName('SimpleData'), function(d){ if(d.textContent.trim()) rows += '<tr><td><b>' + esc(d.getAttribute('name')) + '</b></td><td>' + esc(d.textContent) + '</td></tr>'; });
    return rows;
  }
  function parse(xml, f){
    var doc = new DOMParser().parseFromString(xml, 'text/xml');
    if(doc.getElementsByTagName('parsererror').length) throw new Error('KML tidak valid');
    var getSt = styleResolver(doc), items = [];
    Array.prototype.forEach.call(doc.getElementsByTagName('Placemark'), function(pm){
      var name = ownTxt(pm,'name'), desc = ownTxt(pm,'description'), st = getSt(pm), fol = folderOf(pm), ext = extData(pm);
      var geoms = [];
      Array.prototype.forEach.call(pm.getElementsByTagName('Point'), function(g){ geoms.push(['P', g]); });
      Array.prototype.forEach.call(pm.getElementsByTagName('LineString'), function(g){ geoms.push(['L', g]); });
      Array.prototype.forEach.call(pm.getElementsByTagName('LinearRing'), function(g){ if(!g.parentNode || g.parentNode.localName !== 'outerBoundaryIs' && g.parentNode.localName !== 'innerBoundaryIs') geoms.push(['L', g]); });
      Array.prototype.forEach.call(pm.getElementsByTagName('Polygon'), function(g){ geoms.push(['G', g]); });
      geoms.forEach(function(x){
        var t = x[0], g = x[1], it = {name:name, desc:desc, ext:ext, folder:fol, fid:f.id, file:f.name, pt:t === 'P'};
        if(t === 'P'){
          var c = coords(ownTxt(g,'coordinates'))[0]; if(!c) return;
          it.cat = classify(name, false, fol); it.ll = L.latLng(c[0], c[1]);
        } else if(t === 'L'){
          var cs = coords(ownTxt(g,'coordinates')); if(cs.length < 2) return;
          it.cat = classify(name, true, fol); it.cs = cs; it.col = (st.line && st.line.color) || null; it.w = st.w; it.op = (st.line && st.line.opacity);
          var len = 0; for(var i = 1; i < cs.length; i++) len += L.latLng(cs[i-1]).distanceTo(L.latLng(cs[i])); it.len = len;
        } else {
          var ob = g.getElementsByTagName('outerBoundaryIs')[0]; var cp = coords(ownTxt(ob || g,'coordinates')); if(cp.length < 3) return;
          it.cat = 'Garis lain'; it.poly = cp; it.col = (st.poly && st.poly.color) || null; it.len = 0;
        }
        items.push(it);
      });
    });
    return items;
  }

  /* ---------- membangun layer ---------- */
  function popHtml(it){
    var ll = it.ll || (it.lyr && it.lyr.getBounds ? it.lyr.getBounds().getCenter() : null);
    var cat = CATS[it.cat] || CATS['Lainnya'];
    var coord = ll ? ll.lat.toFixed(6) + ', ' + ll.lng.toFixed(6) : '';
    var desc = it.desc ? it.desc.replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<img[^>]*>/gi,'') : '';
    if(desc.length > 900) desc = esc(desc.slice(0, 900)) + '…';
    return '<div class="mk-pop"><div class="mk-pt">' + esc(it.name || '(tanpa nama)') + '</div>' +
      '<div class="mk-ps"><span class="mk-chip" style="background:' + cat.c + '"></span>' + esc(it.cat) + (it.len ? ' · <b>' + fmtLen(it.len) + '</b>' : '') + '</div>' +
      (desc ? '<div class="mk-pd">' + desc + '</div>' : '') +
      (it.ext ? '<table class="mk-px">' + it.ext + '</table>' : '') +
      '<div class="mk-pf">📄 ' + esc(it.file) + (it.folder ? ' › ' + esc(it.folder) : '') + '</div>' +
      (ll ? '<div class="mk-pa"><a href="https://www.google.com/maps?q=' + ll.lat + ',' + ll.lng + '" target="_blank" rel="noopener">Google Maps</a>' +
        '<a href="https://www.google.com/maps?layer=c&cbll=' + ll.lat + ',' + ll.lng + '" target="_blank" rel="noopener">Street View</a>' +
        '<a href="#" data-copy="' + coord + '">Salin koordinat</a></div>' : '') + '</div>';
  }
  function makeLayers(items, f){
    items.forEach(function(it){
      var cat = CATS[it.cat] || CATS['Lainnya'];
      if(it.pt){
        it.lyr = new L.SymbolMarker(it.ll, {renderer:ptsR, radius:cat.r, base:cat.r, shape:cat.shape || 'circle', inner:cat.inner, ring:cat.ring, dark:cat.dark, fillColor:cat.c, fillOpacity:1, stroke:false});
      } else if(it.poly){
        it.lyr = L.polygon(it.poly, {renderer:linesR, color:cat.c, weight:2, fillColor:(it.col && lum(it.col) < .82) ? it.col : cat.c, fillOpacity:.2});
      } else {
        var col = (it.col && lum(it.col) < .82) ? it.col : cat.c, w = Math.min(Math.max(it.w || 3, 2.5), 6);
        it.casing = L.polyline(it.cs, {renderer:linesR, color:'#fff', weight:w + 3, opacity:.85, interactive:false});
        it.lyr = L.polyline(it.cs, {renderer:linesR, color:col, weight:w, opacity:Math.max(it.op == null ? 1 : it.op, .7), dashArray:cat.dash || null});
        it.lyr.on('mouseover', function(){ it.lyr.setStyle({weight:w + 2.5}); });
        it.lyr.on('mouseout', function(){ it.lyr.setStyle({weight:w}); });
        it.lyr.bindTooltip(esc(it.name || it.cat) + ' · ' + fmtLen(it.len), {sticky:true});
      }
      it.lyr.on('click', function(e){ if(measure && measure.on) return; L.popup({maxWidth:340}).setLatLng(it.ll || e.latlng).setContent(popHtml(it)).openOn(map); });
    });
    var s = {n:items.length, len:0, cat:{}};
    items.forEach(function(it){ s.cat[it.cat] = (s.cat[it.cat] || 0) + 1; if(it.len && !it.pt) s.len += it.len; });
    return s;
  }
  function bounds(items){
    var b = L.latLngBounds([]);
    items.forEach(function(it){ if(it.pt) b.extend(it.ll); else if(it.cs) it.cs.forEach(function(c){ b.extend(c); }); else if(it.poly) it.poly.forEach(function(c){ b.extend(c); }); });
    return b;
  }

  async function fetchKml(f){
    var buf = null, txt = null;
    var r = await fetch('kml/mbb/' + f.id + '.' + f.ext + '?v=20261120a').catch(function(){ return null; });
    if(r && r.ok){ if(f.ext === 'kmz') buf = await r.arrayBuffer(); else txt = await r.text(); }
    else if(window.KML_API_URL){
      var j = await (await fetch(window.KML_API_URL + '?action=get&id=' + f.id)).json(); if(!j.ok) throw new Error(j.error || 'gagal');
      var bin = atob(j.b64), u8 = new Uint8Array(bin.length); for(var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      if(f.ext === 'kmz') buf = u8.buffer; else txt = new TextDecoder('utf-8').decode(u8);
    } else throw new Error('file belum ada di dashboard');
    if(txt !== null) return txt;
    var z = await JSZip.loadAsync(buf);
    var k = Object.keys(z.files).filter(function(n){ return /\.kml$/i.test(n); })[0];
    if(!k) throw new Error('KMZ kosong');
    return z.files[k].async('string');
  }

  /* ---------- tampil / sembunyi ---------- */
  function status(t, err){ var el = $('mbbKmlStatus'); if(el){ el.textContent = t; el.style.color = err ? '#E31B23' : ''; } }
  function fileOn(id){ return data[id] && data[id].on; }
  function applyVis(){
    Object.keys(data).forEach(function(id){
      var d = data[id];
      d.items.forEach(function(it){
        var want = d.on && catOn[it.cat];
        [it.casing, it.lyr].forEach(function(l){ if(!l) return; var has = map.hasLayer(l); if(want && !has) l.addTo(map); else if(!want && has) map.removeLayer(l); });
      });
    });
    updStats(); updLabels(); renderLegend();
  }
  async function show(f, on, fit){
    var cb = document.querySelector('#mbbKmlList input[data-id="' + f.id + '"]'); if(cb) cb.checked = on;
    if(!data[f.id]){
      if(!on) return; if(loading[f.id]) return; loading[f.id] = 1; status('Memuat ' + f.name + '…');
      try{ var items = parse(await fetchKml(f), f); var s = makeLayers(items, f); data[f.id] = {items:items, stat:s, on:false, f:f, b:bounds(items)}; }
      catch(e){ status('Gagal memuat ' + f.name + ': ' + e.message, true); if(cb) cb.checked = false; delete loading[f.id]; return; }
      delete loading[f.id]; rowStat(f);
    }
    data[f.id].on = on; applyVis();
    if(on && fit && data[f.id].b.isValid()) map.fitBounds(data[f.id].b.pad(.12), {maxZoom:19});
  }
  function rowStat(f){
    var el = document.querySelector('#mbbKmlList [data-st="' + f.id + '"]'); var d = data[f.id]; if(!el || !d) return;
    el.textContent = (d.stat.len ? fmtLen(d.stat.len) + ' · ' : '') + d.stat.n + ' obj';
  }
  function shownFiles(){ return Object.keys(data).filter(fileOn); }
  function fitShown(){
    var b = L.latLngBounds([]); shownFiles().forEach(function(id){ if(data[id].b.isValid()) b.extend(data[id].b); });
    if(b.isValid()) map.fitBounds(b.pad(.1));
  }

  /* ---------- statistik & legenda ---------- */
  function visItems(){ var a = []; shownFiles().forEach(function(id){ data[id].items.forEach(function(it){ if(catOn[it.cat]) a.push(it); }); }); return a; }
  function updStats(){
    var el = $('mbbKmlStats'), n = shownFiles().length; if(!el) return;
    var all = []; shownFiles().forEach(function(id){ all = all.concat(data[id].items); });
    var len = 0, c = {}; all.forEach(function(it){ if(!it.pt && it.len) len += it.len; c[it.cat] = (c[it.cat] || 0) + 1; });
    var tiang = (c['Tiang Baru'] || 0) + (c['Tiang Existing'] || 0) + (c['Tiang'] || 0);
    el.innerHTML = n ? '<div><b>' + n + '</b> file</div><div><b>' + fmtLen(len) + '</b> kabel/rute</div><div><b>' + tiang + '</b> tiang</div><div><b>' + (c['Closure'] || 0) + '</b> closure</div><div><b>' + (c['HH / MH'] || 0) + '</b> HH/MH</div><div><b>' + (c['ODP'] || 0) + '</b> ODP</div>' : '<div style="opacity:.6">Belum ada file ditampilkan</div>';
    status(n + ' file tampil di peta');
  }
  function renderLegend(){
    var el = $('mbbKmlLegend'); if(!el) return;
    var cnt = {}; shownFiles().forEach(function(id){ data[id].items.forEach(function(it){ cnt[it.cat] = (cnt[it.cat] || 0) + 1; }); });
    var ks = Object.keys(CATS).filter(function(k){ return cnt[k]; });
    el.innerHTML = ks.length ? ks.map(function(k){
      var c = CATS[k];
      var sym = c.line ? '<i class="mk-ln" style="background:' + c.c + (c.dash ? ';background:repeating-linear-gradient(90deg,' + c.c + ' 0 6px,transparent 6px 10px)' : '') + '"></i>' : svgSym(c);
      return '<label class="mk-lg"><input type="checkbox" data-cat="' + esc(k) + '"' + (catOn[k] ? ' checked' : '') + '>' + sym + '<span>' + esc(k) + '</span><em>' + cnt[k] + '</em></label>';
    }).join('') : '<div style="opacity:.6;font-size:12px;padding:4px 2px">Centang file untuk melihat layer</div>';
    el.querySelectorAll('input[data-cat]').forEach(function(cb){ cb.onchange = function(){ catOn[cb.dataset.cat] = cb.checked; applyVis(); }; });
  }

  /* ---------- label otomatis ---------- */
  function updLabels(){
    labeled.forEach(function(it){ if(it.lyr.getTooltip && it.lyr.getTooltip()) it.lyr.unbindTooltip(); }); labeled.clear();
    if(labelMode === 'off' || !map) return;
    var z = map.getZoom(); if(labelMode === 'auto' && z < 17) return;
    var b = map.getBounds().pad(.1), n = 0;
    visItems().forEach(function(it){
      if(!it.pt || !it.name || n > 600) return;
      if(labelMode === 'auto' && !b.contains(it.ll)) return;
      it.lyr.bindTooltip(esc(it.name), {permanent:true, direction:'right', offset:[6,0], className:'mk-lbl'}); labeled.add(it); n++;
    });
  }

  /* ---------- daftar file ---------- */
  function renderList(){
    var host = $('mbbKmlList'), ql = q.toLowerCase(); if(!host) return;
    host.innerHTML = files.filter(function(f){ return !ql || f.name.toLowerCase().indexOf(ql) >= 0; }).map(function(f){
      return '<div class="mk-row' + (focusId === f.id ? ' sel' : '') + '"><input type="checkbox" data-id="' + f.id + '"' + (fileOn(f.id) ? ' checked' : '') + '><i style="background:' + f.color + '"></i>' +
        '<span class="mk-n" data-go="' + f.id + '" title="Klik untuk zoom ke file">' + esc(f.name) + '<small data-st="' + f.id + '"></small></span><span class="mk-e">' + f.ext.toUpperCase() + '</span>' +
        '<a href="https://drive.google.com/file/d/' + f.id + '/view" target="_blank" rel="noopener" title="Buka di Google Drive">↗</a></div>';
    }).join('') || '<div style="padding:14px;color:var(--text-faint)">Tidak ada file.</div>';
    files.forEach(rowStat);
    host.querySelectorAll('input[data-id]').forEach(function(cb){
      var f = files.filter(function(x){ return x.id === cb.dataset.id; })[0];
      cb.onchange = function(){ show(f, cb.checked, cb.checked && shownFiles().length <= 1); if(cb.checked) info(f); };
    });
    host.querySelectorAll('[data-go]').forEach(function(sp){
      var f = files.filter(function(x){ return x.id === sp.dataset.go; })[0];
      sp.onclick = function(){ focusId = f.id; show(f, true, true).then(function(){ info(f); renderList(); }); };
    });
  }
  function info(f){
    var el = $('mbbKmlInfo'); if(!el) return;
    var row = null;
    if(typeof mbbRows !== 'undefined' && mbbRows && mbbRows.length){
      var nm = function(s){ return String(s||'').toUpperCase().replace(/[^A-Z0-9]+/g,''); }, k = nm(f.name);
      for(var i = 0; i < mbbRows.length; i++){ if(nm(mbbGet(mbbRows[i],'SITE NAME')) === k || nm(mbbGet(mbbRows[i],'SITE ID')) === k){ row = mbbRows[i]; break; } }
    }
    var d = data[f.id];
    var h = '<div class="mk-it"><b>' + esc(f.name) + '</b> <span style="opacity:.6">' + f.ext.toUpperCase() + '</span></div>';
    if(d) h += '<div class="mk-ii">Kabel/rute <b>' + fmtLen(d.stat.len) + '</b> · objek <b>' + d.stat.n + '</b></div>';
    if(row){
      var g = function(k2){ return esc(mbbGet(row, k2) || '—'); };
      h += '<div class="mk-ii">Status <b>' + g('STATUS') + '</b></div><div class="mk-ii">Sub status ' + g('SUB STATUS') + '</div><div class="mk-ii">Branch ' + g('BRANCH') + ' · STO ' + g('STO') + '</div><div class="mk-ii">Komitmen OA ' + g('TGL COMMIT OA FIX') + '</div>';
    }
    el.innerHTML = h; el.style.display = 'block';
  }

  /* ---------- alat: ukur jarak, cari, lokasi ---------- */
  function setMeasure(on){
    if(on){ measure = {on:true, pts:[], line:L.polyline([], {color:'#F2C94C', weight:3, dashArray:'6 6', interactive:false}).addTo(map), mk:[]}; map.getContainer().style.cursor = 'crosshair'; $('mbbKmlMeasure').classList.add('on'); $('mbbKmlMeasureOut').style.display = 'block'; $('mbbKmlMeasureOut').textContent = 'Klik titik di peta untuk mengukur jarak'; }
    else if(measure){ map.removeLayer(measure.line); measure.mk.forEach(function(m){ map.removeLayer(m); }); measure = null; map.getContainer().style.cursor = ''; $('mbbKmlMeasure').classList.remove('on'); $('mbbKmlMeasureOut').style.display = 'none'; }
  }
  function measureClick(e){
    if(!measure || !measure.on) return;
    measure.pts.push(e.latlng); measure.line.setLatLngs(measure.pts);
    measure.mk.push(L.circleMarker(e.latlng, {radius:4, color:'#fff', fillColor:'#F2C94C', fillOpacity:1, weight:1.5, interactive:false}).addTo(map));
    var t = 0; for(var i = 1; i < measure.pts.length; i++) t += measure.pts[i-1].distanceTo(measure.pts[i]);
    $('mbbKmlMeasureOut').textContent = 'Jarak: ' + fmtLen(t) + ' (' + measure.pts.length + ' titik) — klik Ukur lagi untuk selesai';
  }
  function searchItems(term){
    var t = term.toLowerCase(), out = [];
    shownFiles().forEach(function(id){ data[id].items.forEach(function(it){ if(out.length < 12 && it.name && it.name.toLowerCase().indexOf(t) >= 0) out.push(it); }); });
    return out;
  }

  function setBase(k){
    baseLayers.forEach(function(l){ map.removeLayer(l); }); baseLayers = [];
    var b = BASES[k] || BASES.osm, t = L.tileLayer(b.u, b.o).addTo(map); t.bringToBack(); baseLayers.push(t);
    (b.over || []).forEach(function(u){ var o = L.tileLayer(u, {maxZoom:20, maxNativeZoom:19, opacity:.9}).addTo(map); baseLayers.push(o); });
    curBase = k; lsSet('mbbkml_base', k); var s = $('mbbKmlBase'); if(s) s.value = k;
  }

  function init(){
    var host = $('mbbKmlHost'); if(!host) return;
    files = list();
    var folder = 'https://drive.google.com/drive/folders/' + ((window.KML_FOLDERS||{}).mbb || '');
    host.innerHTML =
      '<style>.mk-wrap{display:grid;grid-template-columns:290px 1fr;gap:14px;margin-top:14px}@media(max-width:900px){.mk-wrap{grid-template-columns:1fr}}' +
      '.mk-side{border:1px solid var(--border,#d8dee8);border-radius:12px;background:var(--card,#fff);display:flex;flex-direction:column;height:78vh;min-height:560px;overflow:hidden}' +
      '.mk-tools{padding:10px;border-bottom:1px solid var(--border,#d8dee8);display:flex;flex-direction:column;gap:8px}.mk-tools input[type=text]{width:100%;box-sizing:border-box}' +
      '#mbbKmlList{overflow:auto;flex:1}.mk-row{display:flex;align-items:center;gap:8px;padding:7px 12px;font-size:13px;border-bottom:1px solid rgba(128,128,128,.12)}' +
      '.mk-row:hover{background:rgba(30,107,255,.08)}.mk-row.sel{background:rgba(30,107,255,.14)}.mk-row i{width:10px;height:10px;border-radius:50%;flex:none}' +
      '.mk-n{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;display:flex;flex-direction:column;line-height:1.25}.mk-n small{font-size:10.5px;opacity:.6}.mk-e{font-size:10px;opacity:.55}.mk-row a{text-decoration:none;font-weight:700}' +
      '#mbbKmlMapWrap{position:relative;height:78vh;min-height:560px;border-radius:12px;overflow:hidden;border:1px solid var(--border,#d8dee8)}#mbbKmlMap{height:100%;width:100%;background:#dfe5ec}' +
      '#mbbKmlMapWrap.mk-full{position:fixed;inset:8px;z-index:9999;height:auto;min-height:0;box-shadow:0 10px 40px rgba(0,0,0,.45)}' +
      '.mk-bar{position:absolute;top:10px;right:10px;z-index:1000;display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;max-width:70%}.mk-bar button,.mk-bar select{padding:6px 10px;border-radius:8px;border:1px solid #b8c0cc;background:#fff;color:#1b2430;font-size:12px;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,.18)}' +
      '.mk-bar button.on{background:#0a2342;color:#fff;border-color:#0a2342}' +
      '.mk-panel{position:absolute;z-index:1000;background:rgba(255,255,255,.96);color:#1b2430;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,.25);font-size:12px}' +
      '#mbbKmlLegendBox{left:10px;bottom:34px;max-height:42%;overflow:auto;padding:8px 10px;min-width:170px}#mbbKmlLegendBox h4{margin:0 0 4px;font-size:12px}' +
      '.mk-lg{display:flex;align-items:center;gap:6px;padding:2px 0;cursor:pointer}.mk-lg span{flex:1}.mk-lg em{font-style:normal;opacity:.55;font-size:11px}.mk-dot{width:11px;height:11px;border-radius:50%;border:1.5px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.35)}.mk-ln{width:18px;height:4px;border-radius:2px}' +
      '.mk-stack{position:absolute;left:10px;top:10px;z-index:1000;display:flex;flex-direction:column;gap:8px;width:240px}.mk-stack .mk-panel{position:static}' +
      '#mbbKmlStats{padding:8px 10px;display:grid;grid-template-columns:repeat(2,auto);gap:4px 14px}' +
      '#mbbKmlInfo{padding:8px 10px;display:none;line-height:1.5}.mk-it{font-size:13px;margin-bottom:2px}' +
      '#mbbKmlCoord{left:50%;transform:translateX(-50%);bottom:6px;padding:3px 8px;font-size:11px;font-family:monospace}' +
      '#mbbKmlMeasureOut{left:50%;transform:translateX(-50%);top:10px;padding:6px 12px;display:none;font-weight:700}' +
      '#mbbKmlSrWrap input{width:100%;box-sizing:border-box;padding:6px 8px;border:none;border-radius:10px;outline:none}' +
      '#mbbKmlSrRes{max-height:220px;overflow:auto}#mbbKmlSrRes div{padding:6px 10px;cursor:pointer;border-top:1px solid rgba(128,128,128,.15)}#mbbKmlSrRes div:hover{background:rgba(30,107,255,.12)}' +
      '.mk-pop{min-width:200px}.mk-pt{font-weight:700;font-size:14px}.mk-ps{margin:3px 0 6px;font-size:12px;color:#555}.mk-chip{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:5px}' +
      '.mk-pd{max-height:130px;overflow:auto;font-size:12px;margin-bottom:6px}.mk-px{font-size:11.5px;border-collapse:collapse;margin-bottom:6px}.mk-px td{padding:1px 6px 1px 0;vertical-align:top}.mk-pf{font-size:11px;color:#888;margin-bottom:6px}' +
      '.mk-pa{display:flex;gap:10px;flex-wrap:wrap}.mk-pa a{font-size:12px;font-weight:700;text-decoration:none}.mk-lbl{font-size:10.5px;padding:1px 4px;background:rgba(255,255,255,.85);border:none;box-shadow:none}' +
      '@media(max-width:900px){.mk-stack{width:190px}.mk-bar{max-width:100%;top:auto;bottom:40px}}</style>' +
      '<div class="section" style="margin-top:0;"><div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">' +
      '<div><p class="section-title" style="margin-bottom:2px;">MBB — KML / KMZ</p><p class="section-desc" style="margin:0;">Centang file untuk menampilkannya di peta · klik nama file untuk zoom · klik objek untuk detail.</p></div>' +
      '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><div class="kpi" style="min-width:130px;padding:6px 14px"><div class="accent" style="background:#0a2342"></div><p class="kpi-label">File KML/KMZ</p><p class="kpi-value" style="font-size:20px">' + files.length + '</p></div>' +
      '<a class="download-btn" href="' + folder + '" target="_blank" rel="noopener" style="margin-top:0;text-decoration:none;">📁 Buka folder Drive</a></div></div>' +
      '<div class="mk-wrap"><div class="mk-side"><div class="mk-tools"><input type="text" id="mbbKmlSearch" placeholder="Cari file…">' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap"><button type="button" class="wo-btn" id="mbbKmlAllOn">✔ Semua</button><button type="button" class="wo-btn" id="mbbKmlAllOff">✕ Kosongkan</button></div>' +
      '<div style="display:flex;gap:6px;align-items:center;font-size:12px">Label <select id="mbbKmlLblMode" class="period-select" style="flex:1"><option value="auto">Otomatis (zoom dekat)</option><option value="all">Semua titik</option><option value="off">Mati</option></select></div>' +
      '<div id="mbbKmlStatus" style="font-size:12px;opacity:.8">0 file tampil di peta</div></div><div id="mbbKmlList"></div></div>' +
      '<div id="mbbKmlMapWrap"><div id="mbbKmlMap"></div>' +
      '<div class="mk-bar"><select id="mbbKmlBase">' + Object.keys(BASES).map(function(k){ return '<option value="' + k + '">' + BASES[k].n + '</option>'; }).join('') + '</select>' +
      '<button type="button" id="mbbKmlMeasure">📏 Ukur</button><button type="button" id="mbbKmlLoc">📍 Lokasi saya</button><button type="button" id="mbbKmlFit">⤢ Fit</button><button type="button" id="mbbKmlFull">⛶ Layar penuh</button></div>' +
      '<div class="mk-stack"><div class="mk-panel" id="mbbKmlStats"></div><div class="mk-panel" id="mbbKmlSrWrap"><input type="text" id="mbbKmlSr" placeholder="🔎 Cari tiang / titik…"><div id="mbbKmlSrRes"></div></div><div class="mk-panel" id="mbbKmlInfo"></div></div>' +
      '<div class="mk-panel" id="mbbKmlMeasureOut"></div>' +
      '<div class="mk-panel" id="mbbKmlLegendBox"><h4>Layer</h4><div id="mbbKmlLegend"></div></div>' +
      '<div class="mk-panel" id="mbbKmlCoord">—</div></div></div></div>';

    map = L.map('mbbKmlMap', {preferCanvas:true, maxZoom:20, zoomControl:false}).setView([2.6, 99.0], 8);
    map.createPane('mkLines').style.zIndex = 410; map.createPane('mkPts').style.zIndex = 430;
    linesR = L.canvas({pane:'mkLines', tolerance:6}); ptsR = L.canvas({pane:'mkPts', tolerance:4});
    L.control.scale({imperial:false, position:'bottomleft'}).addTo(map); L.control.zoom({position:'bottomright'}).addTo(map);
    setBase(lsGet('mbbkml_base') && BASES[lsGet('mbbkml_base')] ? lsGet('mbbkml_base') : 'osm');
    $('mbbKmlBase').onchange = function(){ setBase(this.value); };
    $('mbbKmlFit').onclick = fitShown;
    $('mbbKmlFull').onclick = function(){ var w = $('mbbKmlMapWrap'); w.classList.toggle('mk-full'); $('mbbKmlFull').textContent = w.classList.contains('mk-full') ? '✕ Tutup' : '⛶ Layar penuh'; setTimeout(function(){ map.invalidateSize(); }, 80); };
    document.addEventListener('keydown', function(e){ var w = $('mbbKmlMapWrap'); if(e.key === 'Escape' && w && w.classList.contains('mk-full')) $('mbbKmlFull').click(); });
    $('mbbKmlMeasure').onclick = function(){ setMeasure(!measure); };
    map.on('click', measureClick);
    $('mbbKmlLoc').onclick = function(){ status('Mencari lokasi…'); map.locate({setView:true, maxZoom:17}); };
    map.on('locationfound', function(e){ L.circleMarker(e.latlng, {radius:8, color:'#fff', fillColor:'#1E6BFF', fillOpacity:1, weight:2}).addTo(map).bindPopup('Lokasi kamu (±' + Math.round(e.accuracy) + ' m)'); updStats(); });
    map.on('locationerror', function(){ status('Lokasi tidak bisa diakses (izinkan lokasi di browser)', true); });
    map.on('mousemove', function(e){ $('mbbKmlCoord').textContent = e.latlng.lat.toFixed(5) + ', ' + e.latlng.lng.toFixed(5) + ' · z' + map.getZoom(); });
    map.on('moveend zoomend', updLabels);
    map.on('popupopen', function(e){ var a = e.popup.getElement().querySelector('[data-copy]'); if(a) a.onclick = function(ev){ ev.preventDefault(); try{ navigator.clipboard.writeText(a.dataset.copy); a.textContent = 'Tersalin ✓'; }catch(x){ a.textContent = a.dataset.copy; } }; });
    $('mbbKmlSearch').oninput = function(){ q = this.value; renderList(); };
    $('mbbKmlLblMode').onchange = function(){ labelMode = this.value; updLabels(); };
    $('mbbKmlAllOn').onclick = async function(){
      var vis = files.filter(function(f){ return !q || f.name.toLowerCase().indexOf(q.toLowerCase()) >= 0; });
      for(var i = 0; i < vis.length; i += 6){ status('Memuat ' + Math.min(i + 6, vis.length) + '/' + vis.length + '…'); await Promise.all(vis.slice(i, i + 6).map(function(f){ return show(f, true, false); })); }
      fitShown(); renderList();
    };
    $('mbbKmlAllOff').onclick = function(){ Object.keys(data).forEach(function(id){ data[id].on = false; }); applyVis(); renderList(); $('mbbKmlInfo').style.display = 'none'; };
    var sr = $('mbbKmlSr'), res = $('mbbKmlSrRes');
    sr.oninput = function(){
      var t = sr.value.trim(); if(t.length < 2){ res.innerHTML = ''; return; }
      var r = searchItems(t); res.innerHTML = r.map(function(it, i){ return '<div data-i="' + i + '">' + esc(it.name) + ' <small style="opacity:.55">' + esc(it.cat) + ' · ' + esc(it.file) + '</small></div>'; }).join('') || '<div style="opacity:.6">Tidak ada (cari di file yang tampil)</div>';
      res.querySelectorAll('[data-i]').forEach(function(d){ d.onclick = function(){ var it = r[+d.dataset.i]; map.setView(it.ll, 19); L.popup({maxWidth:340}).setLatLng(it.ll).setContent(popHtml(it)).openOn(map); res.innerHTML = ''; }; });
    };
    L.DomEvent.disableClickPropagation($('mbbKmlMapWrap').querySelector('.mk-bar')); ['mbbKmlStats','mbbKmlInfo','mbbKmlSrWrap','mbbKmlLegendBox','mbbKmlCoord'].forEach(function(id){ L.DomEvent.disableClickPropagation($(id)); L.DomEvent.disableScrollPropagation($(id)); });
    renderList(); updStats(); renderLegend(); inited = true;
  }
  document.addEventListener('kmllinks', function(){ if(inited){ files = list(); renderList(); var kv = document.querySelector('#mbbKmlHost .kpi-value'); if(kv) kv.textContent = files.length; } });
  window.mbbKmlOpen = function(){ if(!inited) init(); else setTimeout(function(){ map.invalidateSize(); }, 60); };
  window.mbbKmlDebug = function(){ return {files:files.length, shown:shownFiles(), items:Object.keys(data).map(function(id){ return data[id].stat; })}; };
})();
