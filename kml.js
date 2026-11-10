/* Halaman L0 Kendala: peta KML (Leaflet) + tabel site + catatan (gsheet) + topology */
(function(){
  let map, baseLayers={}, curBase, items=[], inited=false, lastSite=null, shown=new Set();
  const $=id=>document.getElementById(id);
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const KML_URL='kml-default.kmz?v=20261111b';
  const kmlNotes={}; let kmlNotesLoaded=false;
  window.kmlNotes=kmlNotes;
  function status(t,err){ const el=$('kmlStatus'); if(!el) return; el.textContent=t; el.style.color=err?'#E31B23':''; }
  function init(){
    if(inited){ setTimeout(()=>map.invalidateSize(),50); renderTable(); return; }
    inited=true;
    map=L.map('kmlMap',{preferCanvas:true,zoomControl:true}).setView([2.2,99.4],8);
    baseLayers.osm=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'});
    baseLayers.sat=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'© Esri'});
    curBase=baseLayers.osm.addTo(map);
    document.querySelectorAll('[data-kml-base]').forEach(b=>b.onclick=()=>{
      map.removeLayer(curBase); curBase=baseLayers[b.dataset.kmlBase].addTo(map);
      document.querySelectorAll('[data-kml-base]').forEach(x=>x.classList.toggle('on',x===b));
    });
    const upd=()=>{ $('kmlMap').classList.toggle('kml-nolbl',!$('kmlLbl').checked); };
    $('kmlLbl').onchange=upd; upd();
    $('kmlFit').onclick=()=>{ lastSite=null; markChips(); fitAll(); };
    $('kmlFull').onclick=()=>{ const w=$('kmlMapWrap'); w.classList.toggle('kv-full'); setTimeout(()=>map.invalidateSize(),80); $('kmlFull').textContent=w.classList.contains('kv-full')?'✕ Tutup':'⛶ Layar penuh'; };
    $('kmlSearch').oninput=renderList;
    $('kmlAllOn').onclick=()=>setAll(true); $('kmlAllOff').onclick=()=>setAll(false);
    $('kmlExp').onclick=()=>expandAll(true); $('kmlCol').onclick=()=>expandAll(false);
    document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&$('kmlMapWrap').classList.contains('kv-full')) $('kmlFull').click(); });
    setTimeout(()=>map.invalidateSize(),50);
  }
  async function loadDefault(){
    if(items.length) return;
    try{
      status('Memuat peta…');
      const r=await fetch(KML_URL); if(!r.ok) throw new Error('HTTP '+r.status);
      const z=await JSZip.loadAsync(await r.arrayBuffer()); const k=Object.keys(z.files).find(n=>/\.kml$/i.test(n));
      addKml(await z.files[k].async('string'),'L0 Kendala');
    }catch(e){ status('Peta tidak termuat ('+e.message+')',true); }
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
  function arrangeSites(entry){
    const doc=(entry.children.length===1&&!(entry.pms&&entry.pms.length))?entry.children[0]:entry;
    const tops=doc.children||[];
    const hit=c=>SITES.filter(code=>new RegExp('(^|[^A-Z0-9])'+code+'([^A-Z0-9]|$)').test((c.name||'').toUpperCase()));
    if(tops.filter(c=>hit(c).length).length<3) return null;
    const out={};
    tops.forEach(c=>{
      const codes=hit(c); if(!codes.length) return;
      codes.slice(1).forEach(code=>{
        const find=x=>{ for(const k of (x.children||[])){ if((k.name||'').trim().toUpperCase()===code) return [x,k]; const r=find(k); if(r) return r; } return null; };
        const r=find(c); if(r){ r[0].children=r[0].children.filter(k=>k!==r[1]); r[1].name=code; r[1].pe=null; out[code]=r[1]; }
      });
      c.name=codes[0]; c.pe=null; out[codes[0]]=c;
    });
    SITES.forEach(code=>{ if(!out[code]) out[code]={name:code,children:[],pms:[],on:true,open:false,pe:null}; });
    const GROUPS=[['PSP684','PSP702'],['TRT971','TRT967']];
    const GNAME={PSP684:'PSP684 · PSP702 · PSP439 (Sejalur)',TRT971:'TRT971 · TRT967 · TRT891 (Sejalur)'};
    const merged={};
    GROUPS.forEach(g=>{ const ge={name:GNAME[g[0]],children:g.map(c=>out[c]),pms:[],on:true,open:true,pe:null,group:true}; g.forEach(c=>{ merged[c]=c===g[0]?ge:null; }); });
    return SITES.map(code=>code in merged?merged[code]:out[code]).filter(Boolean);
  }
  function addKml(xml,name){
    const doc=new DOMParser().parseFromString(xml,'text/xml');
    if(doc.querySelector('parsererror')) throw new Error('File KML tidak valid');
    const styles={}, maps={};
    doc.querySelectorAll('Style').forEach(s=>{ const id=s.getAttribute('id'); if(id) styles['#'+id]=s; });
    doc.querySelectorAll('StyleMap').forEach(s=>{ const id=s.getAttribute('id'); const p=Array.from(s.children).find(p=>txt(p,'key')==='normal'); if(p&&id) maps['#'+id]=txt(p,'styleUrl'); });
    const getStyle=pm=>{ let st=kids(pm,'Style')[0]; if(st) return st; let u=txt(pm,'styleUrl'); if(maps[u]) u=maps[u]; return styles[u]||null; };
    let count=0;
    const entry={name,children:[],pms:[],on:true,open:true,pe:null};
    function walk(node,parentEntry){
      Array.from(node.children).forEach(c=>{
        const t=c.localName;
        if(t==='Folder'||t==='Document'){
          const e={name:txt(c,'name')||'(folder)',children:[],pms:[],on:true,open:false,pe:parentEntry};
          parentEntry.children.push(e); walk(c,e);
        } else if(t==='Placemark'){ count+=place(c,parentEntry,getStyle(c)); }
      });
    }
    function geoms(g){ const out=[]; const t=g.localName;
      if(t==='MultiGeometry') Array.from(g.children).forEach(x=>out.push(...geoms(x)));
      else if(['Point','LineString','LinearRing','Polygon'].includes(t)) out.push(g);
      return out; }
    function place(pm,pe,st){
      const name=txt(pm,'name'), desc=txt(pm,'description');
      let ext='';
      pm.querySelectorAll('Data').forEach(d=>{ext+=`<tr><td><b>${esc(d.getAttribute('name'))}</b></td><td>${esc(txt(d,'value'))}</td></tr>`;});
      pm.querySelectorAll('SimpleData').forEach(d=>{ext+=`<tr><td><b>${esc(d.getAttribute('name'))}</b></td><td>${esc(d.textContent)}</td></tr>`;});
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
        let len=0; if(g.localName==='LineString'||g.localName==='LinearRing'){ const pts=lyr.getLatLngs().flat(2); for(let i=1;i<pts.length;i++) len+=pts[i-1].distanceTo(pts[i]); }
        const p={name,lyr,len,pt:g.localName==='Point',cat:classify(name,g.localName!=='Point',pe.name),desc,ext,pe};
        lyr.on('click',()=>openPopup(p));
        if(p.pt) lyr.bindTooltip(name||'',{permanent:true,direction:'right',offset:[8,0],className:'kml-lbl'}); else lyr.bindTooltip(name||'',{sticky:true});
        pe.pms.push(p); n++;
      }));
      return n;
    }
    walk(doc.documentElement,entry);
    const arranged=arrangeSites(entry);
    items=arranged||[entry];
    refresh(); fitAll();
    status('');
    renderChips(); renderList(); renderTable(); window.topoInit&&window.topoInit();
  }
  function openPopup(p){
    const ll=p.lyr.getLatLng?p.lyr.getLatLng():p.lyr.getBounds().getCenter();
    const path=crumbs(p.pe).filter(Boolean).slice(1).join(' › ');
    const html=`<div class="kv-pop"><div class="kv-pop-t">${esc(p.name||'(tanpa nama)')}</div><div class="kv-pop-s">${esc(path)}</div><span class="kv-pop-c">${esc(p.cat||'')}</span>${p.desc?'<div class="kv-pop-d">'+p.desc.replace(/<script[\s\S]*?<\/script>/gi,'')+'</div>':''}${p.ext?'<table style="font-size:11px">'+p.ext+'</table>':''}<div class="kv-pop-l">📍 ${ll.lat.toFixed(6)}, ${ll.lng.toFixed(6)} · <a target="_blank" rel="noopener" href="https://www.google.com/maps?q=${ll.lat},${ll.lng}">Google Maps</a></div></div>`;
    L.popup({maxWidth:320}).setLatLng(ll).setContent(html).openOn(map);
  }
  // ---- visibilitas: satu-satunya tempat yang menambah/menghapus layer dari peta
  function refresh(){
    const rec=(e,pOn)=>{ const on=pOn&&e.on; (e.pms||[]).forEach(p=>{ const has=map.hasLayer(p.lyr); if(on&&!has) p.lyr.addTo(map); else if(!on&&has) map.removeLayer(p.lyr); }); (e.children||[]).forEach(c=>rec(c,on)); };
    items.forEach(e=>rec(e,true));
  }
  function boundsOf(e,only){
    const pts=[]; const rec=x=>{ (x.pms||[]).forEach(p=>pts.push(p.lyr.getLatLng?p.lyr.getLatLng():p.lyr.getBounds())); (x.children||[]).forEach(rec); };
    rec(e); const b=L.latLngBounds([]); pts.forEach(p=>b.extend(p)); return b;
  }
  function fitAll(){ const b=L.latLngBounds([]); items.forEach(e=>{ const x=boundsOf(e); if(x.isValid()) b.extend(x); }); if(b.isValid()) map.fitBounds(b,{padding:[30,30]}); }
  function zoomSite(e){
    const b=boundsOf(e); if(!b.isValid()){ status(e.name+': belum ada data di KML',true); setTimeout(()=>status(''),2500); return; }
    if(!e.on){ e.on=true; refresh(); renderList(); }
    lastSite=e; markChips(); map.fitBounds(b,{padding:[40,40],maxZoom:17});
    const w=$('kmlMapWrap'); if(w&&!w.classList.contains('kv-full')) w.scrollIntoView({behavior:'smooth',block:'center'});
  }
  function renderChips(){
    const box=$('kmlChips'); if(!box) return; box.innerHTML='';
    items.forEach(e=>{ const b=document.createElement('button'); b.type='button'; b.className='kv-chip'; b.textContent=e.group?e.name.replace(' (Sejalur)',''):e.name; b.title=e.name; b.onclick=()=>zoomSite(e); b._e=e; box.append(b); });
    $('kmlSiteCount').textContent=items.length;
  }
  function markChips(){ document.querySelectorAll('#kmlChips .kv-chip').forEach(b=>b.classList.toggle('on',b._e===lastSite)); }
  function renderList(){
    const q=($('kmlSearch').value||'').toLowerCase(), box=$('kmlList'); box.innerHTML='';
    if(!items.length){ box.innerHTML='<div class="kv-empty">Belum ada data.</div>'; return; }
    const pmCount=e=>{ let n=(e.pms||[]).length; (e.children||[]).forEach(c=>n+=pmCount(c)); return n; };
    function row(e,depth){
      const d=document.createElement('div'); d.className='kv-row'; d.style.paddingLeft=(depth*14)+'px';
      const has=(e.children||[]).length>0;
      const ar=document.createElement('span'); ar.className='kv-ar'; ar.textContent=has?(e.open?'▾':'▸'):'·'; ar.onclick=()=>{ if(has){ e.open=!e.open; renderList(); } };
      const cb=document.createElement('input'); cb.type='checkbox'; cb.checked=e.on; cb.onchange=()=>{ e.on=cb.checked; refresh(); };
      const lb=document.createElement('span'); lb.className='kv-lb'; lb.textContent=e.name; lb.title=e.name;
      lb.onclick=()=>{ if(has&&!e.open){ e.open=true; renderList(); } const bb=boundsOf(e); if(bb.isValid()){ if(!e.on){e.on=true;refresh();renderList();} map.fitBounds(bb,{padding:[30,30],maxZoom:17}); } };
      const ct=document.createElement('span'); ct.className='kv-ct'; ct.textContent=pmCount(e);
      d.append(ar,cb,lb,ct); box.append(d);
      if(e.open||q) (e.children||[]).forEach(c=>row(c,depth+1));
      if(q&&e.pms) e.pms.filter(p=>p.name&&p.name.toLowerCase().includes(q)).slice(0,50).forEach(p=>{
        const s2=document.createElement('div'); s2.className='kv-hit'; s2.style.paddingLeft=((depth+1)*14+18)+'px';
        s2.textContent='📍 '+p.name; s2.onclick=()=>{ if(!map.hasLayer(p.lyr)){ e.on=true; refresh(); } const ll=p.lyr.getLatLng?p.lyr.getLatLng():p.lyr.getBounds().getCenter(); map.setView(ll,Math.max(map.getZoom(),17)); openPopup(p); };
        box.append(s2);
      });
    }
    items.forEach(e=>row(e,0));
  }
  function setAll(on){ const rec=e=>{ e.on=on; (e.children||[]).forEach(rec); }; items.forEach(rec); refresh(); renderList(); }
  function expandAll(open){ const rec=e=>{ e.open=open; (e.children||[]).forEach(rec); }; items.forEach(rec); renderList(); }
  // ---- catatan (spreadsheet PROGRESS DEPLOYMENT, tab CATATAN L0 KENDALA)
  async function loadNotes(){
    try{
      const res=await universalFetch(WRITE_API_URL+'?action=getKmlCatatan&_='+Date.now(),{cache:'no-store'});
      const data=await res.json();
      if(data.ok){ Object.keys(kmlNotes).forEach(k=>delete kmlNotes[k]); Object.assign(kmlNotes,data.notes||{}); kmlNotesLoaded=true; }
    }catch(e){ console.warn('Catatan L0 Kendala belum bisa dimuat (deploy script write-back terbaru):',e.message); }
  }
  function noteCell(program,id,nama){
    const key=program+'|'+id;
    const hist=String(kmlNotes[key]||'').split('\n').filter(Boolean);
    return `<div class="kv-note" data-kv-key="${esc(key)}"><div class="kv-note-h" data-kv-hist="${esc(key)}">${hist.length?hist.slice(-3).map(esc).join('<br>'):'<span class="kv-mute">Belum ada catatan</span>'}</div><div class="kv-note-f no-cap"><input type="text" data-kv-in="${esc(key)}" data-kv-prog="${esc(program)}" data-kv-id="${esc(id)}" data-kv-nama="${esc(nama||id)}" placeholder="+ Tambah catatan…"><button type="button" data-kv-save="${esc(key)}">Simpan</button></div></div>`;
  }
  window.kmlNoteCell=noteCell;
  async function saveNote(input){
    const text=input.value.trim(); if(!text) return;
    input.classList.add('busy');
    try{
      const url=WRITE_API_URL+'?action=updateKmlCatatan&program='+encodeURIComponent(input.dataset.kvProg)+'&ihld='+encodeURIComponent(input.dataset.kvId)+'&nama='+encodeURIComponent(input.dataset.kvNama||'')+'&text='+encodeURIComponent(text);
      const res=await universalFetch(url,{cache:'no-store'}); const data=await res.json();
      input.classList.remove('busy');
      if(data.ok){ kmlNotes[input.dataset.kvIn]=data.isiTerbaru||''; input.value=''; renderTable(); window.topoRender&&window.topoRender(); }
      else { input.classList.add('err'); alert('Gagal simpan catatan: '+(data.error||'script write-back belum di-update')); }
    }catch(err){ input.classList.remove('busy'); input.classList.add('err'); alert('Gagal simpan catatan: '+err.message); }
  }
  document.addEventListener('keydown',e=>{ const i=e.target.closest&&e.target.closest('[data-kv-in]'); if(i&&e.key==='Enter') saveNote(i); });
  document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('[data-kv-save]'); if(!b) return; const i=document.querySelector(`[data-kv-in="${CSS.escape(b.dataset.kvSave)}"]`); if(i) saveNote(i); });
  // ---- tabel per site
  function renderTable(){
    const box=$('kmlTableBody'); if(!box) return;
    if(!items.length){ box.innerHTML='<tr><td colspan="4" class="kv-empty" style="text-align:center">Belum ada data.</td></tr>'; return; }
    box.innerHTML='';
    items.forEach((e,i)=>{
      const tr=document.createElement('tr');
      const hasData=boundsOf(e).isValid();
      tr.innerHTML=`<td class="kv-no">${i+1}</td><td><b>${esc(e.name)}</b>${e.group?'<span class="kv-badge">Sejalur</span>':''}${hasData?'':'<span class="kv-badge kv-badge-m">belum ada di KML</span>'}</td><td><button type="button" class="kv-btn kml-zoom"${hasData?'':' disabled'}>📍 Lihat</button></td><td class="kv-notecol">${noteCell('SITE',e.name,e.name)}</td>`;
      tr.querySelector('.kml-zoom').onclick=()=>zoomSite(e);
      box.append(tr);
    });
  }
  function stat(e,acc){ (e.pms||[]).forEach(p=>{ acc.n++; acc.len+=p.len||0; const k=p.cat||'LAINNYA'; acc.by[k]=(acc.by[k]||0)+1; }); (e.children||[]).forEach(c=>stat(c,acc)); return acc; }
  window.kmlSetNote=async function(program,id,nama,text){
    const url=WRITE_API_URL+'?action=setKmlCatatan&program='+encodeURIComponent(program)+'&ihld='+encodeURIComponent(id)+'&nama='+encodeURIComponent(nama||'')+'&text='+encodeURIComponent(text);
    const res=await universalFetch(url,{cache:'no-store'}); const data=await res.json();
    if(!data.ok) throw new Error(data.error||'script write-back belum di-update');
    kmlNotes[program+'|'+id]=text; return true;
  };
  window.kmlItems=()=>items;
  window.kmlRenderTable=function(){ renderTable(); window.topoInit&&window.topoInit(); };
  window.kmlInit=async function(){ init(); loadDefault(); await loadNotes(); renderTable(); window.topoInit&&window.topoInit(); };
  window.kmlHasNotes=()=>kmlNotesLoaded;
})();
