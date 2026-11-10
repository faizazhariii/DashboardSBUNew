/* Topology per site/grup dari KML: diagram jalur + ruas (dari/sampai & status diisi sendiri, simpan ke gsheet) */
(function(){
  const $=id=>document.getElementById(id);
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const COL={bb:'#8E44AD',old:'#3AA0D8',new:'#14214D',plan:'#14214D'};
  const PAL=['#E5383B','#F2A900','#1F9BE0','#2E9E5B','#8E44AD','#E67E22','#16A085','#C0392B'];
  // topologi hasil susunan manual (dari gambar Topology After) untuk grup PSP684 · PSP702 · PSP439
  const CURATED={ 'PSP684':{
    nodes:[{l:'GNT',t:'bld'},{l:'ME-BINANGA',t:'box'},{l:'PSP703',t:'tw'},{l:'PSP531',t:'tw'},{l:'PSP684',t:'tw',tag:'NY OA'},{l:'PSP702',t:'tw',tag:'NY OA'},{l:'PSP439',t:'tw',tag:'NY OA'},{l:'RAP845',t:'tw',tag:'NY OA'},{l:'RAP829',t:'tw',tag:'NY OA'},{l:'GPON KPI',t:'box'},{l:'KPI',t:'bld'}],
    links:[{km:25,k:'bb'},{km:5,k:'old'},{km:30,k:'old'},{km:6,k:'new',tg:'Prog c'},{km:10,k:'new',tg:'Prog a'},{km:5,k:'new'},{km:12,k:'plan',tg:'Prog b',dash:1},{km:15,k:'new'},{km:7,k:'new'},{km:30,k:'bb'}],
    branch:{at:'PSP531',l:'PSP129'},
    ruas:[['PSP531','PSP439'],['PSP439','RAP845'],['RAP845','RAP829']] } };
  let GR=[], cur=null, cfg=null, dirty=false, saving=false;
  function hv(a,b){ const R=6371,p=Math.PI/180,dl=(b[0]-a[0])*p,dn=(b[1]-a[1])*p; const x=Math.sin(dl/2)**2+Math.cos(a[0]*p)*Math.cos(b[0]*p)*Math.sin(dn/2)**2; return 2*R*Math.asin(Math.sqrt(x)); }
  // ---- turunkan node (site/STO) dari isi KML sebuah site/grup
  function deriveNodes(e){
    const pts=[]; const rec=(x)=>{ (x.pms||[]).forEach(p=>{ if(!p.pt||!p.lyr.getLatLng) return;
        const nm=(p.name||'').toUpperCase().trim(), folder=(p.pe&&p.pe.name||'').toUpperCase().trim();
        const m=nm.match(/\b([A-Z]{3})\s?(\d{3})\b/); let label=null;
        if(m&&(/^(SITE|STO)/.test(folder)||/^[A-Z]{3}\s?\d{3}$/.test(nm)||/\bSITE\b/.test(nm))) label=m[1]+m[2];
        else if(/^STO/.test(folder)&&nm) label='STO '+nm;
        if(!label) return; const ll=p.lyr.getLatLng(); pts.push({l:label,ll:[ll.lat,ll.lng],t:/^STO/.test(label)?'box':'tw'}); });
      (x.children||[]).forEach(rec); };
    rec(e);
    const seen={}, u=[]; pts.forEach(p=>{ if(!seen[p.l]){ seen[p.l]=1; u.push(p); } });
    if(u.length<2) return u;
    // urut sepanjang jalur (sumbu utama / PCA 2D)
    const mx=u.reduce((a,p)=>a+p.ll[1],0)/u.length, my=u.reduce((a,p)=>a+p.ll[0],0)/u.length;
    let sxx=0,syy=0,sxy=0; u.forEach(p=>{ const dx=p.ll[1]-mx, dy=p.ll[0]-my; sxx+=dx*dx; syy+=dy*dy; sxy+=dx*dy; });
    const th=0.5*Math.atan2(2*sxy,sxx-syy), ux=Math.cos(th), uy=Math.sin(th);
    u.sort((a,b)=>((a.ll[1]-mx)*ux+(a.ll[0]-my)*uy)-((b.ll[1]-mx)*ux+(b.ll[0]-my)*uy));
    return u;
  }
  function buildGroups(){
    const items=window.kmlItems?window.kmlItems():[];
    GR=[];
    items.forEach(e=>{
      const code=Object.keys(CURATED).find(c=>(e.name||'').indexOf(c)===0);
      if(code){ GR.push({name:e.name,key:e.name,cur:CURATED[code]}); return; }
      const nodes=deriveNodes(e);
      if(nodes.length>=2) GR.push({name:e.name,key:e.name,nodes});
    });
  }
  function nodesOf(g){ return g.cur?g.cur.nodes:g.nodes; }
  function defaultCfg(g){
    const N=nodesOf(g).map(n=>n.l);
    if(g.cur) return {ruas:g.cur.ruas.map(r=>({a:r[0],b:r[1],x:''}))};
    return {ruas:[{a:N[0],b:N[N.length-1],x:''}]};
  }
  function loadCfg(g){
    try{ const raw=(window.kmlNotes||{})['TOPO|'+g.key+'|cfg']; if(raw){ const c=JSON.parse(raw); if(c&&Array.isArray(c.ruas)) return c; } }catch(e){}
    return defaultCfg(g);
  }
  // ---- gambar
  const ICON={
    tw:c=>`<path d="M0 -9 L-5.5 8 H5.5 Z" fill="none" stroke="${c}" stroke-width="1.8" stroke-linejoin="round"/><path d="M-3 0H3M-4.4 4H4.4" stroke="${c}" stroke-width="1.5"/><path d="M-8 -9 q-4 4 0 8 M8 -9 q4 4 0 8" fill="none" stroke="${c}" stroke-width="1.5"/>`,
    box:c=>`<rect x="-9" y="-6" width="18" height="12" rx="2" fill="none" stroke="${c}" stroke-width="1.8"/><path d="M-5 -2H5M-5 2H5" stroke="${c}" stroke-width="1.5"/>`,
    bld:c=>`<rect x="-6" y="-10" width="12" height="20" rx="1.5" fill="none" stroke="${c}" stroke-width="1.8"/><path d="M-3 -6h2M1 -6h2M-3 -1h2M1 -1h2M-3 4h2M1 4h2" stroke="${c}" stroke-width="2"/>`
  };
  function diagram(g,c){
    const nodes=nodesOf(g), n=nodes.length, W=1240, pad=60, step=n>1?(W-2*pad)/(n-1):0, X=nodes.map((_,i)=>pad+i*step), Y=118;
    const idx=l=>nodes.findIndex(x=>x.l===l);
    let links;
    if(g.cur) links=g.cur.links; else { links=[]; for(let i=0;i<n-1;i++) links.push({km:hv(nodes[i].ll,nodes[i+1].ll),k:i===0&&nodes[0].t==='box'?'old':'new',approx:1}); }
    let sv='';
    links.forEach((L,i)=>{
      const x1=X[i]+18,x2=X[i+1]-18,col=COL[L.k]||'#14214D',w=(L.k==='new'||L.k==='plan')?6:4;
      sv+=`<line x1="${x1}" y1="${Y}" x2="${x2}" y2="${Y}" stroke="${col}" stroke-width="${w}" stroke-linecap="round" ${L.dash?'stroke-dasharray="2 9"':''}/>`;
      const mx=(X[i]+X[i+1])/2, txt=(L.approx?'≈':'')+(+L.km).toFixed(L.approx?1:0)+' km';
      sv+=`<g transform="translate(${mx},${Y+22})"><rect x="-26" y="-9" width="52" height="18" rx="9" fill="#fff" stroke="#d7dde8"/><text y="4" font-size="10.5" font-weight="700" text-anchor="middle" fill="#33405a">${txt}</text></g>`;
      if(L.tg) sv+=`<text x="${mx}" y="${Y-14}" font-size="10" font-weight="700" text-anchor="middle" fill="#8a94a6">${L.tg}</text>`;
    });
    nodes.forEach((nd,i)=>{
      const oa=nd.tag==='NY OA', col=oa?'#E5383B':'#33405a', fs=(n>9||nd.l.length>9)?10:11.5;
      sv+=`<g transform="translate(${X[i]},${Y})"><circle r="18" fill="#fff" stroke="${col}" stroke-width="2.2"/>${ICON[nd.t||'tw'](col)}</g>`;
      sv+=`<text x="${X[i]}" y="${Y-34}" font-size="${fs}" font-weight="800" text-anchor="middle" fill="#14214D">${esc(nd.l)}</text>`;
      if(oa) sv+=`<g transform="translate(${X[i]},${Y-62})"><rect x="-19" y="-8" width="38" height="15" rx="7.5" fill="#E5383B"/><text y="3" font-size="9" font-weight="800" text-anchor="middle" fill="#fff">NY OA</text></g>`;
    });
    if(g.cur&&g.cur.branch){ const bi=idx(g.cur.branch.at); if(bi>=0){ const bx=X[bi]; sv+=`<line x1="${bx}" y1="${Y+18}" x2="${bx}" y2="${Y+54}" stroke="#aab" stroke-width="1.6" stroke-dasharray="3 3"/><g transform="translate(${bx},${Y+66})"><circle r="13" fill="#fff" stroke="#33405a" stroke-width="2"/><g transform="scale(.8)">${ICON.tw('#33405a')}</g></g><text x="${bx+20}" y="${Y+70}" font-size="11" font-weight="800" fill="#14214D">${esc(g.cur.branch.l)}</text>`; } }
    // ruas: baris bertumpuk jika tumpang-tindih
    const SY0=Y+(g.cur&&g.cur.branch?112:84), rowEnd=[];
    c.ruas.forEach((r,k)=>{
      let a=idx(r.a), b=idx(r.b); if(a<0||b<0) return; if(a>b){const t=a;a=b;b=t;}
      let row=0; while(rowEnd[row]!==undefined&&rowEnd[row]>a) row++; rowEnd[row]=b;
      const col=PAL[k%PAL.length], x1=X[a]+6, x2=X[b]-6, SY=SY0+row*32;
      if(row===0) sv+=`<line x1="${X[a]}" y1="${Y+34}" x2="${x1}" y2="${SY}" stroke="${col}" stroke-opacity=".35" stroke-dasharray="2 4"/><line x1="${X[b]}" y1="${Y+34}" x2="${x2}" y2="${SY}" stroke="${col}" stroke-opacity=".35" stroke-dasharray="2 4"/>`;
      sv+=`<rect x="${x1}" y="${SY}" width="${Math.max(30,x2-x1)}" height="26" rx="13" fill="${col}"/><circle cx="${x1+14}" cy="${SY+13}" r="9" fill="#fff"/><text x="${x1+14}" y="${SY+17}" font-size="11" font-weight="800" text-anchor="middle" fill="${col}">${k+1}</text>${(x2-x1)>170?`<text x="${(x1+x2)/2+10}" y="${SY+17}" font-size="11.5" font-weight="700" text-anchor="middle" fill="#fff">${esc(r.a)} – ${esc(r.b)}</text>`:''}`;
    });
    const H=SY0+(rowEnd.length||1)*32+14;
    return `<svg width="100%" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" style="display:block;max-width:${W}px;margin:0 auto;font-family:'Inter','Segoe UI',Arial,sans-serif">${sv}</svg>`;
  }
  function cardsHtml(g,c){
    const N=nodesOf(g).map(n=>n.l), opt=v=>N.map(l=>`<option${l===v?' selected':''}>${esc(l)}</option>`).join('');
    const cards=c.ruas.map((r,k)=>{
      const col=PAL[k%PAL.length];
      return `<div class="tp-card" style="border-top:4px solid ${col}"><div class="tp-ct"><span class="tp-n" style="background:${col}">${k+1}</span><span class="tp-rt">Ruas ${esc(r.a)} – ${esc(r.b)}</span><span class="tp-grow"></span><span class="no-cap tp-sel"><select data-tp-a="${k}">${opt(r.a)}</select>→<select data-tp-b="${k}">${opt(r.b)}</select><button type="button" class="tp-x" data-tp-del="${k}" title="Hapus ruas">🗑</button></span></div><textarea class="tp-ta" data-tp-x="${k}" rows="4" placeholder="Isi status ruas ini… (satu baris = satu poin)">${esc(r.x||'')}</textarea></div>`;
    }).join('');
    return `<div class="tp-cards">${cards}</div><div class="no-cap tp-act"><button type="button" class="kv-btn" id="tpAdd">＋ Tambah ruas</button><button type="button" class="kv-btn tp-save" id="tpSave">💾 Simpan topology</button><span id="tpMsg" class="kv-mute"></span></div>`;
  }
  function render(){
    const box=$('topoBox'); if(!box) return;
    if(!cur){ box.innerHTML='<div class="kv-empty" style="padding:18px">Pilih site/grup di atas. Topology dibuat otomatis dari titik SITE/STO di KML (butuh minimal 2 site).</div>'; return; }
    const leg=cur.cur?`<div class="tp-leg"><span><i style="background:${COL.new}"></i>Jalur FO</span><span><i class="dash"></i>New link</span><span><i style="background:${COL.old}"></i>Existing</span><span><i style="background:#E5383B;border-radius:50%"></i>NY OA</span></div>`:'<div class="tp-leg"><span class="kv-mute">Jarak ≈ garis lurus antar-site dari koordinat KML</span></div>';
    box.innerHTML=`<div id="topoCanvas" class="tp"><div class="tp-h"><div class="tp-t">Topology After</div><div class="tp-s">${esc(cur.name)}</div>${leg}</div><div id="tpSvg">${diagram(cur,cfg)}</div><div id="tpCards">${cardsHtml(cur,cfg)}</div></div>`;
    setMsg(dirty?'Ada perubahan belum disimpan':'');
  }
  function redrawKeep(){ $('tpSvg').innerHTML=diagram(cur,cfg); const t=$('topoCanvas').querySelectorAll('.tp-rt'); cfg.ruas.forEach((r,k)=>{ if(t[k]) t[k].textContent='Ruas '+r.a+' – '+r.b; }); }
  function setMsg(t){ const m=$('tpMsg'); if(m) m.textContent=t||''; }
  function markDirty(){ dirty=true; setMsg('Ada perubahan belum disimpan'); }
  function pickGroup(name){
    cur=GR.find(g=>g.name===name)||GR[0]||null;
    cfg=cur?loadCfg(cur):null; dirty=false; render();
  }
  function fillSelect(){
    const s=$('topoGroup'); if(!s) return; const prev=s.value;
    s.innerHTML=GR.map(g=>`<option value="${esc(g.name)}">${esc(g.name)}</option>`).join('')||'<option value="">(belum ada)</option>';
    if(prev&&GR.some(g=>g.name===prev)) s.value=prev;
    return s.value;
  }
  async function save(){
    if(!cur||saving) return; saving=true; setMsg('Menyimpan…');
    try{ await window.kmlSetNote('TOPO',cur.key+'|cfg',cur.name,JSON.stringify(cfg)); dirty=false; setMsg('✔ Tersimpan ke Google Sheets'); }
    catch(e){ setMsg('✖ Gagal simpan: '+e.message); alert('Gagal simpan topology: '+e.message); }
    saving=false;
  }
  function download(){
    const el=$('topoCanvas'); if(!el||!window.html2canvas) return;
    html2canvas(el,{backgroundColor:'#ffffff',scale:2,ignoreElements:n=>n.classList&&n.classList.contains('no-cap'),onclone:doc=>{
      doc.querySelectorAll('.tp-ta').forEach(t=>{ const d=doc.createElement('div'); d.className='tp-txt'; d.innerHTML=t.value.split('\n').filter(Boolean).map(l=>'• '+esc(l)).join('<br>')||'<span style="color:#999">—</span>'; t.parentNode.replaceChild(d,t); });
    }}).then(cv=>{ const a=document.createElement('a'); a.download='topology-'+(cur?cur.name.replace(/[^A-Za-z0-9]+/g,'_'):'x')+'.png'; a.href=cv.toDataURL('image/png'); a.click(); });
  }
  document.addEventListener('input',e=>{ const t=e.target; if(t.dataset&&t.dataset.tpX!==undefined&&cfg){ cfg.ruas[+t.dataset.tpX].x=t.value; markDirty(); } });
  document.addEventListener('change',e=>{ const t=e.target; if(!cfg||!t.dataset) return;
    if(t.dataset.tpA!==undefined){ cfg.ruas[+t.dataset.tpA].a=t.value; markDirty(); redrawKeep(); }
    if(t.dataset.tpB!==undefined){ cfg.ruas[+t.dataset.tpB].b=t.value; markDirty(); redrawKeep(); } });
  document.addEventListener('click',e=>{ const t=e.target.closest&&e.target.closest('button'); if(!t||!cfg) return;
    if(t.dataset.tpDel!==undefined){ cfg.ruas.splice(+t.dataset.tpDel,1); markDirty(); render(); }
    if(t.id==='tpAdd'){ const N=nodesOf(cur).map(n=>n.l); const last=cfg.ruas[cfg.ruas.length-1]; const la=last?N.indexOf(last.b):-1; cfg.ruas.push(la>=0&&la<N.length-1?{a:N[la],b:N[N.length-1],x:''}:{a:N[0],b:N[N.length-1],x:''}); markDirty(); render(); }
    if(t.id==='tpSave') save(); });
  const css=document.createElement('style'); css.textContent=`
.tp{background:#fff;padding:16px 20px 20px;font-family:'Inter','Segoe UI',Arial,sans-serif;color:#14214D;min-width:760px}
.tp-h{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:8px}
.tp-t{font-size:20px;font-weight:800}.tp-s{font-size:13px;color:#667;font-weight:600}
.tp-leg{margin-left:auto;display:flex;gap:14px;font-size:11px;color:#556}
.tp-leg span{display:flex;align-items:center;gap:5px}.tp-leg i{display:inline-block;width:18px;height:5px;border-radius:3px}
.tp-leg i.dash{background:repeating-linear-gradient(90deg,#14214D 0 3px,transparent 3px 8px)}
.tp-cards{display:grid;gap:12px;margin-top:10px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}
.tp-card{background:#f7f9fc;border:1px solid #e4e8ef;border-radius:10px;padding:10px 12px;font-size:12.5px;line-height:1.5}
.tp-ct{font-weight:800;font-size:13px;margin-bottom:6px;display:flex;align-items:center;gap:7px;flex-wrap:wrap}
.tp-grow{flex:1}
.tp-n{display:inline-flex;width:20px;height:20px;border-radius:50%;color:#fff;font-size:11px;align-items:center;justify-content:center;flex:0 0 20px}
.tp-sel{display:flex;align-items:center;gap:3px;font-weight:400;font-size:11px}
.tp-sel select{border:1px solid #d7dde8;border-radius:6px;font-size:11px;padding:2px;max-width:92px}
.tp-x{border:0;background:none;cursor:pointer;font-size:13px}
.tp-ta{width:100%;box-sizing:border-box;border:1px solid #d7dde8;border-radius:8px;padding:7px 9px;font:inherit;font-size:12.5px;resize:vertical;background:#fff}
.tp-txt{font-size:12.5px;line-height:1.6;min-height:40px}
.tp-act{display:flex;gap:8px;align-items:center;margin-top:12px;flex-wrap:wrap}
.tp-save{background:#0A2342;color:#fff;border-color:#0A2342}
`;
  document.head.appendChild(css);
  window.topoRender=render;
  window.topoInit=function(){
    const s=$('topoGroup'); if(!s) return;
    if(!s._b){ s._b=1; s.onchange=()=>{ if(dirty&&!confirm('Perubahan topology belum disimpan. Pindah site tetap lanjut?')){ s.value=cur?cur.name:''; return; } pickGroup(s.value); }; $('topoDl').onclick=download; }
    if(dirty) return; // jangan timpa edit yang belum disimpan
    buildGroups(); const v=fillSelect(); pickGroup(v);
  };
})();
