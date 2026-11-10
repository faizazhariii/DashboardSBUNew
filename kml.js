/* Halaman KML Viewer: upload/drag KML/KMZ atau URL, tampil di peta Leaflet */
(function(){
  let map, baseLayers={}, curBase, root=null, items=[], inited=false;
  const $=id=>document.getElementById(id);
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  function init(){
    if(inited){ setTimeout(()=>map.invalidateSize(),50); renderTable(); return; }
    inited=true;
    map=L.map('kmlMap',{preferCanvas:true}).setView([3.59,98.67],8);
    baseLayers.osm=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'});
    baseLayers.sat=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'© Esri'});
    curBase=baseLayers.osm.addTo(map);
    $('kmlBase').onchange=e=>{ map.removeLayer(curBase); curBase=baseLayers[e.target.value].addTo(map); };
    $('kmlFile').onchange=e=>{ loadFiles(e.target.files); e.target.value=''; };
    const dz=$('kmlDrop');
    ['dragover','dragenter'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.add('over');}));
    ['dragleave','drop'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.remove('over');}));
    dz.addEventListener('drop',e=>loadFiles(e.dataTransfer.files));
    $('kmlUrlBtn').onclick=loadUrl;
    $('kmlClear').onclick=clearAll;
    $('kmlFit').onclick=fit;
    $('kmlSearch').oninput=renderList;
    setTimeout(()=>map.invalidateSize(),50);
  }
  function status(t,err){ const el=$('kmlStatus'); el.textContent=t; el.style.color=err?'#E31B23':''; }
  async function loadFiles(files){
    for(const f of files){
      try{
        status('Membaca '+f.name+'…');
        if(/\.kmz$/i.test(f.name)){
          if(!window.JSZip) throw new Error('JSZip belum termuat');
          const z=await JSZip.loadAsync(await f.arrayBuffer());
          const k=Object.keys(z.files).find(n=>/\.kml$/i.test(n));
          if(!k) throw new Error('KML tidak ditemukan di dalam KMZ');
          addKml(await z.files[k].async('string'),f.name);
        } else addKml(await f.text(),f.name);
      }catch(e){ status('Gagal: '+e.message,true); }
    }
  }
  async function loadUrl(){
    let u=$('kmlUrl').value.trim(); if(!u) return;
    const m=u.match(/drive\.google\.com\/file\/d\/([^/]+)/)||u.match(/[?&]id=([^&]+)/);
    if(/drive\.google\.com/.test(u)&&m) u='https://drive.google.com/uc?export=download&id='+m[1];
    try{
      status('Mengunduh…');
      const r=await fetch(u); if(!r.ok) throw new Error('HTTP '+r.status);
      const buf=await r.arrayBuffer();
      const b=new Uint8Array(buf);
      if(b[0]===0x50&&b[1]===0x4B){
        const z=await JSZip.loadAsync(buf); const k=Object.keys(z.files).find(n=>/\.kml$/i.test(n));
        addKml(await z.files[k].async('string'),u.split('/').pop()||'URL');
      } else addKml(new TextDecoder().decode(buf),u.split('/').pop()||'URL');
    }catch(e){ status('Gagal ambil URL ('+e.message+'). Kalau diblok CORS, download dulu lalu upload file.',true); }
  }
  function kmlColor(c,def){ // aabbggrr -> {color,opacity}
    if(!c||c.length<8) return def; c=c.trim();
    const a=parseInt(c.substr(0,2),16)/255, b=c.substr(2,2), g=c.substr(4,2), r=c.substr(6,2);
    return {color:'#'+r+g+b, opacity:a};
  }
  function parseCoords(t){
    return (t||'').trim().split(/\s+/).map(s=>{const p=s.split(',').map(Number);return (isFinite(p[0])&&isFinite(p[1]))?[p[1],p[0]]:null;}).filter(Boolean);
  }
  const kids=(n,tag)=>Array.from(n.children).filter(c=>c.localName===tag);
  const txt=(n,tag)=>{const c=kids(n,tag)[0];return c?c.textContent.trim():'';};
  function addKml(xml,name){
    const doc=new DOMParser().parseFromString(xml,'text/xml');
    if(doc.querySelector('parsererror')) throw new Error('File KML tidak valid');
    const styles={}, maps={};
    doc.querySelectorAll('Style').forEach(s=>{ const id=s.getAttribute('id'); if(id) styles['#'+id]=s; });
    doc.querySelectorAll('StyleMap').forEach(s=>{ const id=s.getAttribute('id'); const p=Array.from(s.children).find(p=>txt(p,'key')==='normal'); if(p&&id) maps['#'+id]=txt(p,'styleUrl'); });
    const getStyle=pm=>{
      let st=kids(pm,'Style')[0]; if(st) return st;
      let u=txt(pm,'styleUrl'); if(maps[u]) u=maps[u]; return styles[u]||null;
    };
    if(!root){ root=L.featureGroup().addTo(map); }
    const top=L.featureGroup(); let count=0;
    const entry={name,layer:top,children:[],on:true};
    function walk(node,parentGroup,parentEntry){
      Array.from(node.children).forEach(c=>{
        const t=c.localName;
        if(t==='Folder'||t==='Document'){
          const g=L.featureGroup().addTo(parentGroup);
          const e={name:txt(c,'name')||'(folder)',layer:g,children:[],on:true};
          parentEntry.children.push(e); walk(c,g,e);
        } else if(t==='Placemark'){ count+=place(c,parentGroup,parentEntry,getStyle(c)); }
      });
    }
    function geoms(g){
      const out=[]; const t=g.localName;
      if(t==='MultiGeometry') Array.from(g.children).forEach(x=>out.push(...geoms(x)));
      else if(['Point','LineString','LinearRing','Polygon'].includes(t)) out.push(g);
      return out;
    }
    function place(pm,group,pe,st){
      const name=txt(pm,'name'), desc=txt(pm,'description');
      let ext='';
      pm.querySelectorAll('Data').forEach(d=>{ext+=`<tr><td><b>${esc(d.getAttribute('name'))}</b></td><td>${esc(txt(d,'value'))}</td></tr>`;});
      pm.querySelectorAll('SimpleData').forEach(d=>{ext+=`<tr><td><b>${esc(d.getAttribute('name'))}</b></td><td>${esc(d.textContent)}</td></tr>`;});
      const html=`<div style="max-width:280px;max-height:240px;overflow:auto"><b>${esc(name)}</b>${desc?'<div>'+desc.replace(/<script[\s\S]*?<\/script>/gi,'')+'</div>':''}${ext?'<table style="font-size:11px">'+ext+'</table>':''}</div>`;
      const ls=st?kids(st,'LineStyle')[0]:null, ps=st?kids(st,'PolyStyle')[0]:null;
      const lc=kmlColor(ls&&txt(ls,'color'),{color:'#E31B23',opacity:1});
      const lw=ls&&parseFloat(txt(ls,'width'))||3;
      const fc=kmlColor(ps&&txt(ps,'color'),{color:'#E31B23',opacity:.35});
      let n=0;
      Array.from(pm.children).filter(c=>['Point','LineString','LinearRing','Polygon','MultiGeometry'].includes(c.localName)).forEach(g0=>geoms(g0).forEach(g=>{
        let lyr;
        if(g.localName==='Point'){
          const c=parseCoords(txt(g,'coordinates'))[0]; if(!c) return;
          lyr=L.circleMarker(c,{radius:6,color:'#fff',weight:1.5,fillColor:lc.color==='#E31B23'?'#E31B23':lc.color,fillOpacity:.95});
        } else if(g.localName==='Polygon'){
          const rings=[]; const ob=g.querySelector('outerBoundaryIs coordinates'); if(ob) rings.push(parseCoords(ob.textContent));
          g.querySelectorAll('innerBoundaryIs coordinates').forEach(i=>rings.push(parseCoords(i.textContent)));
          lyr=L.polygon(rings,{color:lc.color,weight:lw,opacity:lc.opacity,fillColor:fc.color,fillOpacity:fc.opacity});
        } else {
          lyr=L.polyline(parseCoords(txt(g,'coordinates')),{color:lc.color,weight:lw,opacity:lc.opacity});
        }
        lyr.bindPopup(html); lyr.bindTooltip(name||'',{sticky:true}); lyr.addTo(group); n++;
        let len=0; if(g.localName==='LineString'||g.localName==='LinearRing'){ const pts=lyr.getLatLngs().flat(2); for(let i=1;i<pts.length;i++) len+=pts[i-1].distanceTo(pts[i]); }
        (pe.pms=pe.pms||[]).push({name,lyr,len,pt:g.localName==='Point'});
      }));
      return n;
    }
    top.addTo(root);
    walk(doc.documentElement,top,entry);
    items.push(entry);
    const b=top.getBounds(); if(b.isValid()) map.fitBounds(b,{padding:[30,30]});
    status(`${name}: ${count} objek dimuat`);
    renderList(); renderTable();
  }
  function renderList(){
    const q=($('kmlSearch').value||'').toLowerCase(), box=$('kmlList'); box.innerHTML='';
    function row(e,depth,parentArr){
      const d=document.createElement('div'); d.style.cssText='padding:3px 0 3px '+(depth*14)+'px;font-size:12.5px;display:flex;gap:6px;align-items:center;';
      const cb=document.createElement('input'); cb.type='checkbox'; cb.checked=e.on;
      cb.onchange=()=>{ e.on=cb.checked; const p=e.parentGroup||(depth===0?root:null);
        if(e.on) e.layer.addTo(e.parent||root); else (e.parent||root).removeLayer(e.layer); };
      const lb=document.createElement('span'); lb.textContent=e.name; lb.style.cursor='pointer';
      lb.onclick=()=>{ const b=e.layer.getBounds(); if(b.isValid()) map.fitBounds(b,{padding:[30,30]}); };
      d.append(cb,lb); box.append(d);
      (e.children||[]).forEach(c=>{c.parent=e.layer; row(c,depth+1);});
      if(q&&e.pms) e.pms.filter(p=>p.name&&p.name.toLowerCase().includes(q)).slice(0,50).forEach(p=>{
        const s=document.createElement('div'); s.style.cssText='padding:2px 0 2px '+((depth+1)*14)+'px;font-size:12px;color:var(--brand-red,#E31B23);cursor:pointer;';
        s.textContent='📍 '+p.name; s.onclick=()=>{ const b=p.lyr.getBounds?p.lyr.getBounds():L.latLngBounds([p.lyr.getLatLng()]); map.fitBounds(b.pad(.5),{maxZoom:18}); p.lyr.openPopup&&p.lyr.openPopup(); };
        box.append(s);
      });
    }
    items.forEach(e=>{ e.parent=root; row(e,0); });
    if(!items.length) box.innerHTML='<div style="font-size:12px;color:var(--text-faint,#888)">Belum ada file dimuat.</div>';
  }
  function clearAll(){ if(root){ root.clearLayers(); } items=[]; renderList(); renderTable(); status('Peta dikosongkan'); }
  function fit(){ if(root){ const b=root.getBounds(); if(b.isValid()) map.fitBounds(b,{padding:[30,30]}); } }
  function stat(e,acc){
    (e.pms||[]).forEach(p=>{ acc.n++; acc.len+=p.len||0; const k=(e.name||'-').toUpperCase().trim(); acc.by[k]=(acc.by[k]||0)+1; });
    (e.children||[]).forEach(c=>stat(c,acc));
    return acc;
  }
  function sites(){
    const out=[];
    items.forEach(f=>{
      let lvl=f.children&&f.children.length===1&&!(f.pms&&f.pms.length)?f.children[0]:f;
      if(lvl.children&&lvl.children.length) lvl.children.forEach(c=>out.push(c)); else out.push(lvl);
    });
    return out;
  }
  function renderTable(){
    const box=$('kmlTableBody'); if(!box) return;
    const list=sites();
    $('kmlTableCount').textContent=list.length?`(${list.length} site)`:'';
    if(!list.length){ box.innerHTML='<tr><td colspan="7" style="text-align:center;padding:14px;color:var(--text-faint,#888)">Belum ada data.</td></tr>'; return; }
    box.innerHTML='';
    list.forEach((e,i)=>{
      const a=stat(e,{n:0,len:0,by:{}});
      const rinci=Object.entries(a.by).sort((x,y)=>y[1]-x[1]).slice(0,8).map(([k,v])=>`<span style="display:inline-block;background:var(--surface-2,#eef1f6);border-radius:6px;padding:1px 6px;margin:1px 3px 1px 0;font-size:11px;white-space:nowrap">${esc(k)} <b>${v}</b></span>`).join('');
      const tr=document.createElement('tr');
      const catHtml=(window.prioCatatanCell?window.prioCatatanCell('KML',{id:e.name,nama:e.name}):'');
      tr.innerHTML=`<td>${i+1}</td><td><b>${esc(e.name)}</b></td><td style="text-align:right">${a.n.toLocaleString('id-ID')}</td><td style="text-align:right">${a.len?(a.len/1000).toLocaleString('id-ID',{maximumFractionDigits:2}):'—'}</td><td>${rinci}</td><td><button type="button" class="refresh-btn kml-zoom">📍 Lihat</button></td><td style="min-width:260px">${catHtml}</td>`;
      tr.querySelector('.kml-zoom').onclick=()=>{ if(!map.hasLayer(e.layer)) e.layer.addTo(e.parent||root); const b=e.layer.getBounds(); if(b.isValid()){ window.scrollTo({top:$('kmlMap').getBoundingClientRect().top+scrollY-80,behavior:'smooth'}); map.fitBounds(b,{padding:[30,30]}); } };
      box.append(tr);
    });
  }
  async function loadDefault(){
    if(items.length) return;
    try{
      status('Memuat data default…');
      const r=await fetch('kml-default.kmz?v=20261111a'); if(!r.ok) throw new Error('HTTP '+r.status);
      const z=await JSZip.loadAsync(await r.arrayBuffer()); const k=Object.keys(z.files).find(n=>/\.kml$/i.test(n));
      addKml(await z.files[k].async('string'),'L0 Kendala MAI Gabungan');
    }catch(e){ status('Data default tidak termuat ('+e.message+'). Upload file manual.',true); }
  }
  window.kmlRenderTable=renderTable;
  window.kmlInit=function(){ init(); loadDefault(); };
})();
