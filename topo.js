/* Topology Sejalur: diagram jalur + ruas bernomor + kartu status (catatan sync gsheet) */
(function(){
  const $=id=>document.getElementById(id);
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const COL={bb:'#8E44AD',old:'#3AA0D8',new:'#14214D',plan:'#14214D'};
  const GROUPS={
    PSP:{title:'PSP684 · PSP702 · PSP439',
      nodes:[{l:'GNT',t:'bld'},{l:'ME-BINANGA',t:'box'},{l:'PSP703',t:'tw'},{l:'PSP531',t:'tw'},{l:'PSP684',t:'tw',tag:'NY OA'},{l:'PSP702',t:'tw',tag:'NY OA'},{l:'PSP439',t:'tw',tag:'NY OA'},{l:'RAP845',t:'tw',tag:'NY OA'},{l:'RAP829',t:'tw',tag:'NY OA'},{l:'GPON KPI',t:'box',full:'GPON00-D1-KPI-2LGP'},{l:'KPI',t:'bld'}],
      links:[{km:25,k:'bb'},{km:5,k:'old'},{km:30,k:'old'},{km:6,k:'new',tg:'Prog c'},{km:10,k:'new',tg:'Prog a'},{km:5,k:'new'},{km:12,k:'plan',tg:'Prog b',dash:1},{km:15,k:'new'},{km:7,k:'new'},{km:30,k:'bb'}],
      branch:{at:3,l:'PSP129'},
      ruas:[
        {c:'#E5383B',a:3,b:6,t:'Ruas PSP531 – PSP439',lines:['New Deploy, <b>L0 KENDALA</b>, Mitra TA','Need QE : Plan Mitra MAI','Proses Survey MAI','Need TPAS 3 Site (PSP531, 684, 702, 439)'],tag:'LOP FO NodeB OnGoing'},
        {c:'#F2A900',a:6,b:7,t:'Ruas PSP439 – RAP845',lines:['<b>New Deploy</b>, Mitra TA','Batch WO: TIF Batch 03','Redesign KT ke KU sepanjang 12 Km (Approve)','Lanjut progress after QE <b><i>RAP845-RAP829 Done</i></b>','<b>TGT 30 Nov</b>'],tag:'LOP FO NodeB New Link · Proses Perizinan'},
        {c:'#1F9BE0',a:7,b:8,t:'Ruas QE : RAP845 – RAP829',lines:['<b>QE, Mitra</b> TA Konstruksi','Redesign KT ke KU sepanjang 4 Km (Approve)','QE Project, status OGP TGT 20 Nov'],tag:'QE Project'}
      ]},
    TRT:{title:'TRT971 · TRT967 · TRT891',
      nodes:[['STO TRT',2.0149198,98.964393],['TRT906',2.1118426,99.089555],['TRT917',2.0099937,99.165236],['TRT583',1.9850492,99.179399],['TRT889',1.95584,99.198499],['TRT971',1.9298407,99.228923],['TRT967',1.9045034,99.288056],['TRT891',1.8497035,99.331516]].map((n,i)=>({l:n[0],t:i?'tw':'box',ll:[n[1],n[2]]})),
      auto:true,
      ruas:[
        {c:'#E5383B',a:0,b:1,t:'Ruas STO – TRT906',f:['TRT906']},
        {c:'#F2A900',a:1,b:4,t:'Ruas TRT906 – TRT889 (TRT917, TRT583)',f:['TRT889','TRT889,TRT583,TRT917']},
        {c:'#1F9BE0',a:4,b:5,t:'Ruas TRT889 – TRT971',f:['TRT971']},
        {c:'#2E9E5B',a:6,b:7,t:'Ruas TRT967 – TRT891',f:['TRT891']}
      ]}
  };
  function hv(a,b){ const R=6371,p=Math.PI/180,dl=(b[0]-a[0])*p,dn=(b[1]-a[1])*p; const x=Math.sin(dl/2)**2+Math.cos(a[0]*p)*Math.cos(b[0]*p)*Math.sin(dn/2)**2; return 2*R*Math.asin(Math.sqrt(x)); }
  function notes(key){ const t=(window.kmlNotes&&window.kmlNotes[key])||''; return t.split('\n').filter(Boolean); }
  function statOf(names){
    const OK=['TIANG','CLOSURE','HH/MH','JEMBATAN','GALVANIS','GORONG-GORONG','BORING/BOX','ODC','ODP'];
    const by={}; let len=0;
    const count=e=>{ (e.pms||[]).forEach(p=>{ len+=p.len||0; if(OK.includes(p.cat)) by[p.cat]=(by[p.cat]||0)+1; }); (e.children||[]).forEach(count); };
    const find=e=>{ if(names.some(n=>(e.name||'').trim().toUpperCase()===n)){ count(e); return; } (e.children||[]).forEach(find); };
    (window.kmlItems?window.kmlItems():[]).forEach(find);
    return {km:len/1000,by};
  }
  const ICON={
    tw:(c)=>`<path d="M0 -9 L-5.5 8 H5.5 Z" fill="none" stroke="${c}" stroke-width="1.8" stroke-linejoin="round"/><path d="M-3 0H3M-4.4 4H4.4" stroke="${c}" stroke-width="1.5"/><path d="M-8 -9 q-4 4 0 8 M8 -9 q4 4 0 8" fill="none" stroke="${c}" stroke-width="1.5"/>`,
    box:(c)=>`<rect x="-9" y="-6" width="18" height="12" rx="2" fill="none" stroke="${c}" stroke-width="1.8"/><path d="M-5 -2H5M-5 2H5" stroke="${c}" stroke-width="1.5"/>`,
    bld:(c)=>`<rect x="-6" y="-10" width="12" height="20" rx="1.5" fill="none" stroke="${c}" stroke-width="1.8"/><path d="M-3 -6h2M1 -6h2M-3 -1h2M1 -1h2M-3 4h2M1 4h2" stroke="${c}" stroke-width="2"/>`
  };
  function diagram(g,key){
    const n=g.nodes.length, W=1240, pad=60, step=(W-2*pad)/(n-1), X=g.nodes.map((_,i)=>pad+i*step);
    const Y=118;
    let links=g.links;
    if(g.auto){ links=[]; for(let i=0;i<n-1;i++) links.push({km:hv(g.nodes[i].ll,g.nodes[i+1].ll),k:i===0?'old':'new',approx:1}); }
    let sv='';
    // jalur
    links.forEach((L,i)=>{
      const x1=X[i]+18,x2=X[i+1]-18, col=COL[L.k]||'#14214D', w=L.k==='new'||L.k==='plan'?6:4;
      sv+=`<line x1="${x1}" y1="${Y}" x2="${x2}" y2="${Y}" stroke="${col}" stroke-width="${w}" stroke-linecap="round" ${L.dash?'stroke-dasharray="2 9"':''}/>`;
      const mx=(X[i]+X[i+1])/2, txt=(L.approx?'≈':'')+(+L.km).toFixed(L.approx?1:0)+' km';
      sv+=`<g transform="translate(${mx},${Y+22})"><rect x="-26" y="-9" width="52" height="18" rx="9" fill="#fff" stroke="#d7dde8"/><text y="4" font-size="10.5" font-weight="700" text-anchor="middle" fill="#33405a">${txt}</text></g>`;
      if(L.tg) sv+=`<text x="${mx}" y="${Y-14}" font-size="10" font-weight="700" text-anchor="middle" fill="#8a94a6">${L.tg}</text>`;
    });
    // node
    g.nodes.forEach((nd,i)=>{
      const oa=nd.tag==='NY OA', c=oa?'#E5383B':'#33405a';
      sv+=`<g transform="translate(${X[i]},${Y})"><circle r="18" fill="#fff" stroke="${c}" stroke-width="2.2"/>${ICON[nd.t](c)}</g>`;
      const lab=nd.l, fs=lab.length>9?10:11.5;
      sv+=`<text x="${X[i]}" y="${Y-34}" font-size="${fs}" font-weight="800" text-anchor="middle" fill="#14214D">${esc(lab)}</text>`;
      if(oa) sv+=`<g transform="translate(${X[i]},${Y-62})"><rect x="-19" y="-8" width="38" height="15" rx="7.5" fill="#E5383B"/><text y="3" font-size="9" font-weight="800" text-anchor="middle" fill="#fff">NY OA</text></g>`;
    });
    if(g.branch){ const bx=X[g.branch.at]; sv+=`<line x1="${bx}" y1="${Y+18}" x2="${bx}" y2="${Y+54}" stroke="#aab" stroke-width="1.6" stroke-dasharray="3 3"/><g transform="translate(${bx},${Y+66})"><circle r="13" fill="#fff" stroke="#33405a" stroke-width="2"/><g transform="scale(.8)">${ICON.tw('#33405a')}</g></g><text x="${bx+20}" y="${Y+70}" font-size="11" font-weight="800" fill="#14214D">${g.branch.l}</text>`; }
    // ruas strip
    const SY=Y+110;
    g.ruas.forEach((r,k)=>{
      const x1=X[r.a]+6, x2=X[r.b]-6;
      sv+=`<line x1="${X[r.a]}" y1="${Y+34}" x2="${x1}" y2="${SY}" stroke="${r.c}" stroke-opacity=".35" stroke-dasharray="2 4"/><line x1="${X[r.b]}" y1="${Y+34}" x2="${x2}" y2="${SY}" stroke="${r.c}" stroke-opacity=".35" stroke-dasharray="2 4"/>`;
      sv+=`<rect x="${x1}" y="${SY}" width="${x2-x1}" height="26" rx="13" fill="${r.c}"/><circle cx="${x1+14}" cy="${SY+13}" r="9" fill="#fff"/><text x="${x1+14}" y="${SY+17}" font-size="11" font-weight="800" text-anchor="middle" fill="${r.c}">${k+1}</text>${(x2-x1)>170?`<text x="${(x1+x2)/2+10}" y="${SY+17}" font-size="11.5" font-weight="700" text-anchor="middle" fill="#fff">${esc(r.t.replace('Ruas ','').replace(/ \(.*\)/,''))}</text>`:''}`;
    });
    return {svg:`<svg width="100%" viewBox="0 0 ${W} ${SY+40}" preserveAspectRatio="xMidYMid meet" style="display:block;max-width:${W}px;margin:0 auto;font-family:'Inter','Segoe UI',Arial,sans-serif">${sv}</svg>`,W};
  }
  function cards(g,key){
    return `<div class="tp-cards" style="grid-template-columns:repeat(auto-fit,minmax(250px,1fr))">`+g.ruas.map((r,k)=>{
      let body='';
      if(g.auto){ const st=statOf(r.f); const chips=Object.entries(st.by).map(([a,b])=>`<span class="tp-chip">${esc(a)} <b>${b}</b></span>`).join(''); body=`<div class="tp-km">Kabel ±${st.km.toFixed(1)} km <span class="kv-mute">(dari KML)</span></div><div>${chips||'<span class="kv-mute">—</span>'}</div>`; }
      else body='<ul class="tp-ul">'+r.lines.map(l=>`<li>${l}</li>`).join('')+'</ul>'+(r.tag?`<div class="tp-tag">${esc(r.tag)}</div>`:'');
      const nk='TOPO|'+key+'|'+k, nl=notes(nk).slice(-2);
      const upd=nl.length?`<div class="tp-upd"><b>Update:</b> ${nl.map(esc).join('<br>')}</div>`:'';
      const form=window.kmlNoteCell?window.kmlNoteCell('TOPO',key+'|'+k,r.t).replace(/<div class="kv-note-h"[\s\S]*?<\/div><div class="kv-note-f/,'<div class="kv-note-f'):'';
      return `<div class="tp-card" style="border-top:4px solid ${r.c}"><div class="tp-ct"><span class="tp-n" style="background:${r.c}">${k+1}</span>${esc(r.t)}</div>${body}${upd}<div class="no-cap">${form}</div></div>`;
    }).join('')+'</div>';
  }
  function render(){
    const box=$('topoBox'); if(!box) return;
    const key=$('topoGroup').value, g=GROUPS[key], d=diagram(g,key);
    const leg=`<div class="tp-leg"><span><i style="background:${COL.new}"></i>Jalur FO (ongoing)</span><span><i class="dash"></i>New link (proses perizinan)</span><span><i style="background:${COL.old}"></i>Existing</span><span><i style="background:#E5383B;border-radius:50%"></i>NY OA</span></div>`;
    box.innerHTML=`<div id="topoCanvas" class="tp" style="min-width:760px"><div class="tp-h"><div class="tp-t">Topology After</div><div class="tp-s">${esc(g.title)} (Sejalur)</div>${g.ruas.length?leg:''}</div>${d.svg}${cards(g,key)}</div>`;
  }
  function download(){
    const el=$('topoCanvas'); if(!el||!window.html2canvas) return;
    html2canvas(el,{backgroundColor:'#ffffff',scale:2,ignoreElements:n=>n.classList&&n.classList.contains('no-cap')}).then(c=>{ const a=document.createElement('a'); a.download='topology-'+$('topoGroup').value+'.png'; a.href=c.toDataURL('image/png'); a.click(); });
  }
  const css=document.createElement('style'); css.textContent=`
.tp{background:#fff;padding:16px 20px 20px;font-family:'Inter','Segoe UI',Arial,sans-serif;color:#14214D}
.tp-h{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:8px}
.tp-t{font-size:20px;font-weight:800}.tp-s{font-size:13px;color:#667;font-weight:600}
.tp-leg{margin-left:auto;display:flex;gap:14px;font-size:11px;color:#556}
.tp-leg span{display:flex;align-items:center;gap:5px}.tp-leg i{display:inline-block;width:18px;height:5px;border-radius:3px}
.tp-leg i.dash{background:repeating-linear-gradient(90deg,#14214D 0 3px,transparent 3px 8px)}
.tp-cards{display:grid;gap:12px;margin-top:6px}
.tp-card{background:#f7f9fc;border:1px solid #e4e8ef;border-radius:10px;padding:10px 12px;font-size:12.5px;line-height:1.5}
.tp-ct{font-weight:800;font-size:13px;margin-bottom:6px;display:flex;align-items:center;gap:7px}
.tp-n{display:inline-flex;width:20px;height:20px;border-radius:50%;color:#fff;font-size:11px;align-items:center;justify-content:center;flex:0 0 20px}
.tp-ul{margin:0 0 6px;padding-left:18px}.tp-ul li{margin:1px 0}
.tp-tag{display:inline-block;background:#fff;border:1px dashed #c5cddb;border-radius:6px;font-size:11px;padding:1px 7px;color:#556;margin-bottom:4px}
.tp-km{font-weight:700;margin-bottom:4px}
.tp-chip{display:inline-block;background:#fff;border:1px solid #e4e8ef;border-radius:6px;padding:1px 7px;margin:1px 4px 1px 0;font-size:11.5px}
.tp-upd{background:#fff8e1;border-left:3px solid #F2A900;padding:4px 8px;margin:6px 0;font-size:12px;border-radius:4px}
`;
  document.head.appendChild(css);
  window.topoRender=render;
  window.topoInit=function(){ const s=$('topoGroup'); if(s&&!s._b){ s._b=1; s.onchange=render; $('topoDl').onclick=download; } render(); };
})();
