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
    const upd=()=>{ const on=$('kmlLbl').checked; $('kmlMap').classList.toggle('kml-nolbl',!on); };
    $('kmlLbl').onchange=upd; map.on('zoomend',upd); upd();
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

  const ICONCOL={'ylw-pushpin':'#FFD400','blue-pushpin':'#1E6BFF','grn-pushpin':'#22B14C','red-pushpin':'#E31B23','wht-pushpin':'#FFFFFF','red-circle':'#E31B23','grn-circle':'#22B14C','flag':'#E31B23'};
  function iconShape(name,col,sc){
    const k=(name||'').toLowerCase(); const z=Math.round(22*(sc||1)); const st=`stroke="#222" stroke-width="1.4"`; let b;
    if(/pushpin/.test(k)) b=`<path d="M12 22 L7 10 A6 6 0 1 1 17 10 Z" fill="${col}" ${st}/><circle cx="12" cy="8" r="2" fill="#fff"/>`;
    else if(k==='square') b=`<rect x="4" y="4" width="16" height="16" rx="2" fill="${col}" ${st}/>`;
    else if(k==='triangle') b=`<path d="M12 3 L22 20 L2 20 Z" fill="${col}" ${st}/>`;
    else if(k==='forbidden') b=`<circle cx="12" cy="12" r="9" fill="none" stroke="${col}" stroke-width="3.2"/><path d="M6 18 L18 6" stroke="${col}" stroke-width="3.2"/><circle cx="12" cy="12" r="10.4" fill="none" stroke="#222" stroke-width=".8"/>`;
    else if(k==='flag') b=`<path d="M6 21 V3" stroke="#222" stroke-width="2"/><path d="M6 4 H19 L15 8.5 L19 13 H6 Z" fill="${col}" ${st}/>`;
    else if(k==='water') b=`<path d="M12 2 C12 2 4 11 4 15 A8 8 0 0 0 20 15 C20 11 12 2 12 2Z" fill="${col}" ${st}/>`;
    else if(k==='picnic') b=`<path d="M2 20 L12 4 L22 20 Z" fill="${col}" ${st}/><rect x="9" y="13" width="6" height="7" fill="#fff" stroke="#222" stroke-width="1"/>`;
    else if(k==='sunny') b=`<circle cx="12" cy="12" r="5" fill="${col}" ${st}/><g stroke="${col}" stroke-width="2.4"><path d="M12 1v4M12 19v4M1 12h4M19 12h4M4 4l3 3M17 17l3 3M20 4l-3 3M7 17l-3 3"/></g>`;
    else if(k==='target'||k==='cross-hairs') b=`<circle cx="12" cy="12" r="9" fill="none" ${st} stroke-width="2"/><circle cx="12" cy="12" r="4" fill="${col}" ${st}/>`;
    else if(k==='arrow') b=`<path d="M12 2 L21 20 L12 15 L3 20 Z" fill="${col}" ${st}/>`;
    else b=`<circle cx="12" cy="12" r="8" fill="${col}" ${st}/>`;
    return L.divIcon({className:'kml-ico',html:`<svg width="${z}" height="${z}" viewBox="0 0 24 24">${b}</svg>`,iconSize:[z,z],iconAnchor:[z/2,/pushpin/.test(k)?z-2:z/2]});
  }
  function classify(name,isLine,folder){
    const n=(name||'').toUpperCase().trim(), f=(folder||'').toUpperCase().trim();
    if(isLine) return /ROUTE|RUTE|CATUAN|PATH/.test(f)||/^(ROUTE|RUTE|UNTITLED PATH)/.test(n)?'RUTE':'KABEL';
    if(!isLine){ const F=[[/^TIANG/,'TIANG'],[/^CLOSUR|^CLOSURE|^CL$/,'CLOSURE'],[/^(MH|HH|MM)[\s\/&]|^(MH|HH)$|^HH/,'HH/MH'],[/^JEMBATAN/,'JEMBATAN'],[/^ODC/,'ODC'],[/^ODP/,'ODP'],[/^OLT/,'OLT'],[/^STO/,'STO'],[/^SITE/,'SITE'],[/^GALVANIS/,'GALVANIS'],[/^CATUAN/,'CATUAN'],[/^JT$/,'JEMBATAN']]; for(const [r,v] of F) if(r.test(f)) return v; }
    if(/^PU[-_\s]?S?\d|^PU\d/.test(n)) return 'TIANG';
    if(/^(TN|TE|TB)\b|TIANG|^TN[-\s]?\d|^TE[-\s]?\d|\bTN\d*\b/.test(n)) return 'TIANG';
    if(/\bCL\b|^NEW CL|^EX CL|CLOSURE|\bCL[-\s]?\d/.test(n)) return 'CLOSURE';
    if(/\bODC\b|^TC-.*ODC/.test(n)) return 'ODC';
    if(/\bODP\b|^ODP/.test(n)) return 'ODP';
    if(/\bOLT\b/.test(n)) return 'OLT';
    if(/\bSTO\b/.test(n)) return 'STO';
    if(/JEMBATAN|^JT[.\s\d]/.test(n)) return 'JEMBATAN';
    if(/GALVANIS/.test(n)) return 'GALVANIS';
    if(/GORONG/.test(n)) return 'GORONG-GORONG';
    if(/BCTR|BORING|BOX\b/.test(n)) return 'BORING/BOX';
    if(/\bHH\b|\bMH\b|HH\/|MH\/|MM\/HH|HANDHOLE|HH\d|HH-/.test(n)) return 'HH/MH';
    if(/^(DD|HB|M-BC)[-\s]/.test(n)||/^DD/.test(n)) return 'DD (titik survey)';
    if(/^(TRT|PSP|RAP|GST|SKL|PYB|TUK|AKN)\d*/.test(n)||/\bSITE\b/.test(n)) return 'SITE';
    if(/SPICLING|SPARE|SPER/.test(n)) return 'SPARE/SPICLING';
    if(/CATUAN/.test(f)) return 'CATUAN';
    if(f&&!/^(TRT|PSP|RAP|GST|SKL|PYB|TUK|AKN|QE|EXTEND|NODE|PLAN|NEW|HASIL)/.test(f)&&f.length<18) return f;
    return 'LAINNYA';
  }
  function crumbs(e){ const a=[]; for(let x=e; x; x=x.pe) a.unshift(x.name); return a; }

  const SITES=['PSP721','TRT913','PSP723','TRT573','RAP047','SKL602','TUK070','PYB690','TUK908','PSP683','PSP684','PSP702','TRT971','TRT967'];
  function arrangeSites(entry,top){
    const doc=(entry.children.length===1&&!(entry.pms&&entry.pms.length))?entry.children[0]:entry;
    const tops=doc.children||[];
    const hit=c=>SITES.filter(code=>new RegExp('(^|[^A-Z0-9])'+code+'([^A-Z0-9]|$)').test((c.name||'').toUpperCase()));
    if(tops.filter(c=>hit(c).length).length<3) return; // bukan file ini: tampilkan apa adanya
    const out={};
    const take=(e,code,parent)=>{ e.name=code; e.pe=null; e.open=false; e.on=true; if(e.parent) e.parent.removeLayer(e.layer); e.layer.addTo(root); e.parent=root; out[code]=e; };
    // folder gabungan: kode kedua+ diambil dari sub-folder bernama persis kode itu
    tops.forEach(c=>{
      const codes=hit(c); if(!codes.length) return;
      const primary=codes[0];
      codes.slice(1).forEach(code=>{
        const find=(x)=>{ for(const k of (x.children||[])){ if((k.name||'').trim().toUpperCase()===code) return [x,k]; const r=find(k); if(r) return r; } return null; };
        const r=find(c); if(r){ r[0].children=r[0].children.filter(k=>k!==r[1]); take(r[1],code); }
      });
      take(c,primary);
    });
    // kode yang tidak ada di KML: baris kosong
    SITES.forEach(code=>{ if(!out[code]) out[code]={name:code,layer:L.featureGroup(),children:[],on:true,open:false,parent:root,pe:null}; });
    root.removeLayer(top);
    entry.sitesOut=SITES.map(code=>out[code]);
  }
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
    const entry={name,layer:top,children:[],on:true,open:true,parent:root,pe:null};
    function walk(node,parentGroup,parentEntry){
      Array.from(node.children).forEach(c=>{
        const t=c.localName;
        if(t==='Folder'||t==='Document'){
          const g=L.featureGroup().addTo(parentGroup);
          const e={name:txt(c,'name')||'(folder)',layer:g,children:[],on:true,open:(t==='Document'),parent:parentGroup,pe:parentEntry};
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
      const path=crumbs(pe).filter(Boolean).slice(1).join(' › ');
      const html0=`<div style="max-width:300px;max-height:260px;overflow:auto"><div style="font-size:14px;font-weight:700;margin-bottom:2px">${esc(name||'(tanpa nama)')}</div><div style="font-size:11px;color:#666;margin-bottom:4px">${esc(path)}</div>${desc?'<div>'+desc.replace(/<script[\s\S]*?<\/script>/gi,'')+'</div>':''}${ext?'<table style="font-size:11px">'+ext+'</table>':''}@@COORD@@</div>`;
      const ls=st?kids(st,'LineStyle')[0]:null, ps=st?kids(st,'PolyStyle')[0]:null;
      const lc=kmlColor(ls&&txt(ls,'color'),{color:'#E31B23',opacity:1});
      const lw=ls&&parseFloat(txt(ls,'width'))||3;
      const fc=kmlColor(ps&&txt(ps,'color'),{color:'#E31B23',opacity:.35});
      let n=0;
      Array.from(pm.children).filter(c=>['Point','LineString','LinearRing','Polygon','MultiGeometry'].includes(c.localName)).forEach(g0=>geoms(g0).forEach(g=>{
        let lyr;
        if(g.localName==='Point'){
          const c=parseCoords(txt(g,'coordinates'))[0]; if(!c) return;
          const is=st?kids(st,'IconStyle')[0]:null;
          const href=is&&kids(is,'Icon')[0]?txt(kids(is,'Icon')[0],'href'):'';
          const base=(href.split('/').pop()||'').replace(/\.png.*$/i,'');
          const ic=kmlColor(is&&txt(is,'color'),null);
          const col=ic?ic.color:(ICONCOL[base]||'#FFFFFF');
          lyr=L.marker(c,{icon:iconShape(base,col,is&&parseFloat(txt(is,'scale'))||1)});
        } else if(g.localName==='Polygon'){
          const rings=[]; const ob=g.querySelector('outerBoundaryIs coordinates'); if(ob) rings.push(parseCoords(ob.textContent));
          g.querySelectorAll('innerBoundaryIs coordinates').forEach(i=>rings.push(parseCoords(i.textContent)));
          lyr=L.polygon(rings,{color:lc.color,weight:lw,opacity:lc.opacity,fillColor:fc.color,fillOpacity:fc.opacity});
        } else {
          lyr=L.polyline(parseCoords(txt(g,'coordinates')),{color:lc.color,weight:lw,opacity:lc.opacity});
        }
        const ll=lyr.getLatLng?lyr.getLatLng():(lyr.getBounds().getCenter());
        const coord=`<div style="font-size:11px;color:#444;margin-top:6px">📍 ${ll.lat.toFixed(6)}, ${ll.lng.toFixed(6)}</div>`;
        lyr.bindPopup(html0.replace('@@COORD@@',coord));
        if(g.localName==='Point') lyr.bindTooltip(name||'',{permanent:true,direction:'right',offset:[8,0],className:'kml-lbl'}); else lyr.bindTooltip(name||'',{sticky:true});
        lyr.addTo(group); n++;
        let len=0; if(g.localName==='LineString'||g.localName==='LinearRing'){ const pts=lyr.getLatLngs().flat(2); for(let i=1;i<pts.length;i++) len+=pts[i-1].distanceTo(pts[i]); }
        (pe.pms=pe.pms||[]).push({name,lyr,len,pt:g.localName==='Point',cat:classify(name,g.localName!=='Point',pe.name)});
      }));
      return n;
    }
    top.addTo(root);
    walk(doc.documentElement,top,entry);
    arrangeSites(entry,top);
    items.push(...(entry.sitesOut||[entry]));
    const b=(entry.sitesOut?root:top).getBounds(); if(b.isValid()) map.fitBounds(b,{padding:[30,30]});
    status(`${name}: ${count} objek dimuat`);
    renderList(); renderTable();
  }
  function renderList(){
    const q=($('kmlSearch').value||'').toLowerCase(), box=$('kmlList'); box.innerHTML='';
    if(!items.length){ box.innerHTML='<div style="font-size:12px;color:var(--text-faint,#888)">Belum ada file dimuat.</div>'; return; }
    function pmCount(e){ let n=(e.pms||[]).length; (e.children||[]).forEach(c=>n+=pmCount(c)); return n; }
    function row(e,depth){
      const d=document.createElement('div'); d.style.cssText='padding:2px 0 2px '+(depth*14)+'px;font-size:12.5px;display:flex;gap:4px;align-items:center;';
      const has=(e.children||[]).length>0;
      const ar=document.createElement('span'); ar.textContent=has?(e.open?'▾':'▸'):'·'; ar.style.cssText='width:14px;text-align:center;cursor:'+(has?'pointer':'default')+';user-select:none;flex:0 0 14px;';
      ar.onclick=()=>{ if(has){ e.open=!e.open; renderList(); } };
      const cb=document.createElement('input'); cb.type='checkbox'; cb.checked=e.on;
      cb.onchange=()=>{ e.on=cb.checked; if(e.on) e.layer.addTo(e.parent); else e.parent.removeLayer(e.layer); };
      const lb=document.createElement('span'); lb.textContent=e.name; lb.title=e.name; lb.style.cssText='cursor:pointer;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
      lb.onclick=()=>{ if(has){ e.open=!e.open; renderList(); } const bb=e.layer.getBounds(); if(bb.isValid()) map.fitBounds(bb,{padding:[30,30]}); };
      const ct=document.createElement('span'); ct.textContent=pmCount(e); ct.style.cssText='font-size:11px;color:#888;';
      d.append(ar,cb,lb,ct); box.append(d);
      if(e.open||q) (e.children||[]).forEach(c=>row(c,depth+1));
      if(q&&e.pms) e.pms.filter(p=>p.name&&p.name.toLowerCase().includes(q)).slice(0,50).forEach(p=>{
        const s2=document.createElement('div'); s2.style.cssText='padding:2px 0 2px '+((depth+1)*14+18)+'px;font-size:12px;color:var(--brand-red,#E31B23);cursor:pointer;';
        s2.textContent='📍 '+p.name; s2.onclick=()=>{ const ll=p.lyr.getLatLng?p.lyr.getLatLng():p.lyr.getBounds().getCenter(); map.setView(ll,Math.max(map.getZoom(),17)); p.lyr.openPopup&&p.lyr.openPopup(); };
        box.append(s2);
      });
    }
    items.forEach(e=>row(e,0));
  }
  function clearAll(){ if(root){ root.clearLayers(); } items=[]; renderList(); renderTable(); status('Peta dikosongkan'); }
  function fit(){ if(root){ const b=root.getBounds(); if(b.isValid()) map.fitBounds(b,{padding:[30,30]}); } }
  function stat(e,acc){
    (e.pms||[]).forEach(p=>{ acc.n++; acc.len+=p.len||0; const k=p.cat||'LAINNYA'; acc.by[k]=(acc.by[k]||0)+1; });
    (e.children||[]).forEach(c=>stat(c,acc));
    return acc;
  }
  function sites(){
    const out=[];
    items.forEach(f=>{ out.push(f); return;
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
