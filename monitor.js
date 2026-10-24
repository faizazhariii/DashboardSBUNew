/* ============================================================
   Halaman "Peringatan" (order bermasalah) + "Perbandingan" (snapshot mingguan)
   ============================================================ */
(function(){
'use strict';
const $ = id => document.getElementById(id);
const esc = t => String(t==null?'':t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const nf = n => (Number(n)||0).toLocaleString('id-ID');
const DAY = 86400000;
const A = () => window.RekapAgg;
const today0 = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
const daysBetween = (a,b) => Math.floor((a-b)/DAY);

/* ---------- CSS ---------- */
const st = document.createElement('style');
st.textContent = `
.mon-wrap .card{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:16px 20px;margin-bottom:14px;}
.mon-kpis{display:flex;gap:10px;flex-wrap:wrap;margin:10px 0 4px;}
.mon-kpi{flex:1;min-width:130px;border:1px solid var(--line);border-radius:8px;padding:10px 12px;background:var(--panel-2);cursor:pointer;}
.mon-kpi b{display:block;font-size:22px;color:var(--text);}
.mon-kpi span{font-size:11px;color:var(--text-dim);}
.mon-kpi.on{outline:2px solid var(--navy,#1F3864);}
.mon-filters{display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;font-size:12px;}
.mon-filters input[type=number]{width:70px;}
.mon-table{width:100%;border-collapse:collapse;font-size:11.5px;}
.mon-table th,.mon-table td{border:1px solid var(--line);padding:5px 8px;text-align:left;}
.mon-table th{background:var(--panel-2);color:var(--text);font-size:10.5px;text-transform:uppercase;position:sticky;top:0;}
.mon-table td.n{text-align:center;}
.mon-tag{display:inline-block;padding:1px 7px;border-radius:10px;font-size:10px;font-weight:700;margin-right:3px;color:#fff;}
.mon-tag.late{background:#B42318;}.mon-tag.stale{background:#B45309;}.mon-tag.old{background:#475569;}
.mon-up{color:#1E6B3A;font-weight:700;}.mon-down{color:#B42318;font-weight:700;}.mon-flat{color:var(--text-dim);}
.mon-scroll{max-height:560px;overflow:auto;}
.mon-btn{padding:7px 14px;border-radius:6px;border:1px solid var(--line);background:var(--panel-2);cursor:pointer;font-size:12px;}
.mon-btn.pri{background:var(--navy,#1F3864);color:#fff;border-color:transparent;font-weight:700;}
`;
document.head.appendChild(st);

/* ============================================================
   1. PERINGATAN
   ============================================================ */
function lastStamp(text){
  let best = null; const re = /\[(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/g; let m;
  while((m = re.exec(text||''))){ const d = new Date(+m[3], +m[2]-1, +m[1]); if(!best || d > best) best = d; }
  return best;
}
const strip = l => (typeof hemStripStatusPrefix==='function') ? hemStripStatusPrefix(l||'') : (l||'');

/* sumber: tiap tematik -> daftar baris "belum selesai" dengan field seragam */
function collect(){
  const out = [], dn = A().distNorm;
  const add = (tema, o) => out.push(Object.assign({ tema }, o));
  const ok = (arr)=> Array.isArray(arr) ? arr : [];
  ok(mbbRows).forEach(r=>{
    const c = mbbFiOaOgp(r); if(c==='drop' || c==='oa') return;
    add('MBB', { id:mbbGet(r,'ID'), nama:mbbGet(r,'SITE NAME'), dist:dn(mbbGet(r,'BRANCH')), status:strip(mbbGet(r,'STATUS')), komit:mbbGet(r,'TGL COMMIT OA FIX'), order:mbbGet(r,'TGL WO'), catatan:mbbGet(r,'CATATAN'), hasCat:true });
  });
  ok(oloRows).forEach(r=>{
    const lb = oloRowProgressLabel(r), c = hemCategoryOfLabel(lb); if(c==='drop'||c==='golive'||c==='bisa') return;
    add('OLO', { id:oloGet(r,'IHLD'), nama:oloGet(r,'NAMA PROYEK'), dist:dn(oloGet(r,'DISTRICT')), status:strip(lb), komit:oloGet(r,'Komitmen Golive'), order:oloGet(r,'TANGGAL ORDER'), catatan:oloGet(r,'CATATAN'), hasCat:true });
  });
  ok(hemRows).forEach(r=>{
    const lb = hemRowProgressLabel(r), c = hemCategoryOfLabel(lb); if(c==='drop'||c==='golive'||c==='bisa') return;
    add('HEM', { id:hemGet(r,'IHLD'), nama:hemGet(r,'NAMA LOP'), dist:dn(hemGet(r,'DISTRICT')), status:strip(lb), komit:hemGet(r,'Komitmen Golive'), order:hemGet(r,'Tanggal submit order nde'), catatan:hemGet(r,'CATATAN')||hemGet(r,'W'), hasCat:true });
  });
  ok(pt3Rows).forEach(r=>{
    const c = pt3Category2(r); if(c==='drop'||c==='gl') return;
    add('PT3 TA', { id:pt3Get(r,'ID-IHLD'), nama:pt3Get(r,'NAMA LOP'), dist:dn(pt3Get(r,'BRANCH FMC')), status:strip(pt3RowStatusLabel(r)), komit:pt3Get(r,'KOMITMEN GOLIVE'), order:pt3Get(r,'Tgl Order'), catatan:'', hasCat:false });
  });
  ok(pt3fhRows).forEach(r=>{
    const c = pt3fhCategory2(r); if(c==='drop'||c==='gl') return;
    add('PT3 FH', { id:pt3fhGet(r,'ID-IHLD'), nama:pt3fhGet(r,'NAMA LOP'), dist:dn(pt3fhGet(r,'BRANCH FMC')), status:strip(pt3fhRowStatusLabel(r)), komit:pt3fhGet(r,'KOMITMEN GOLIVE'), order:'', catatan:'', hasCat:false });
  });
  return out;
}

let alertsCache = [], alertFlag = 'all', alertsBuilt = false;
function computeAlerts(){
  const t0 = today0(), staleN = +$('alStale').value || 7, oldN = +$('alOld').value || 30;
  const res = [];
  collect().forEach(x=>{
    const kd = parseDMY(x.komit), od = parseDMY(x.order);
    const late = (kd && kd < t0) ? daysBetween(t0, kd) : null;
    const age = od ? daysBetween(t0, od) : null;
    let stale = null, catDays = null;
    if(x.hasCat){ const ls = lastStamp(x.catatan); catDays = ls ? daysBetween(t0, ls) : null; if(!ls || catDays >= staleN) stale = ls ? catDays : 9999; }
    const old = (age !== null && age >= oldN) ? age : null;
    const flags = []; if(late!==null) flags.push('late'); if(stale!==null) flags.push('stale'); if(old!==null) flags.push('old');
    if(flags.length) res.push(Object.assign({}, x, { late, stale, catDays, age:(age), old, flags }));
  });
  return res;
}
function renderAlerts(){
  const all = computeAlerts(); alertsCache = all;
  const tema = $('alTema').value, dist = $('alDist').value, q = $('alQ').value.trim().toLowerCase();
  let list = all.filter(x => (!tema || x.tema===tema) && (!dist || x.dist===dist) && (alertFlag==='all' || x.flags.includes(alertFlag)) &&
    (!q || (x.id+' '+x.nama).toLowerCase().includes(q)));
  list.sort((a,b)=> (b.late||0)-(a.late||0) || (b.age||0)-(a.age||0));
  const cnt = f => all.filter(x=> (!tema||x.tema===tema) && (!dist||x.dist===dist) && (f==='all'||x.flags.includes(f))).length;
  $('alKpis').innerHTML = [['all','Total bermasalah'],['late','Lewat komitmen golive'],['stale','Catatan basi / kosong'],['old','Order umur tua']]
    .map(([k,l])=>`<div class="mon-kpi ${alertFlag===k?'on':''}" data-f="${k}"><b>${nf(cnt(k))}</b><span>${l}</span></div>`).join('');
  $('alKpis').querySelectorAll('.mon-kpi').forEach(el=> el.onclick = ()=>{ alertFlag = el.dataset.f; renderAlerts(); });
  const tag = x => x.flags.map(f=> f==='late' ? `<span class="mon-tag late">Telat ${x.late} hr</span>` : f==='stale' ? `<span class="mon-tag stale">${x.stale===9999?'Belum ada catatan':'Catatan '+x.stale+' hr lalu'}</span>` : `<span class="mon-tag old">Umur ${x.old} hr</span>`).join('');
  $('alBody').innerHTML = list.slice(0,600).map(x=>`<tr><td>${esc(x.tema)}</td><td>${esc(x.id)}</td><td>${esc(x.nama)}</td><td>${esc(A().abbr(x.dist))}</td><td>${esc(x.status)}</td><td class="n">${esc(x.komit||'-')}</td><td class="n">${x.late!==null?x.late:'-'}</td><td class="n">${x.age!==null?x.age:'-'}</td><td>${tag(x)}</td></tr>`).join('') ||
    `<tr><td colspan="9" style="text-align:center;padding:18px;">Tidak ada order bermasalah dengan filter ini.</td></tr>`;
  $('alCount').textContent = `${nf(list.length)} order${list.length>600?' (tampil 600 teratas)':''}`;
  window.__alertsList = list;
}
function buildAlerts(){
  const host = $('alertsHost'); if(!host) return;
  if(!alertsBuilt){
    alertsBuilt = true;
    host.innerHTML = `<div class="mon-wrap">
      <div class="card"><p class="section-title" style="margin:0 0 4px;">Peringatan — order yang perlu ditindak</p>
        <p class="kpi-sub" style="margin:0 0 10px;">Order yang belum Golive/OA/Drop tapi: <b>lewat tanggal komitmen</b>, <b>catatan basi</b> (belum ada catatan, atau catatan terakhir lebih lama dari batas — hanya OLO, HEM, MBB karena hanya itu yang punya kolom catatan), atau <b>umur order terlalu tua</b>.</p>
        <div class="mon-filters">
          <label>Tematik<br><select id="alTema"><option value="">Semua</option><option>MBB</option><option>OLO</option><option>HEM</option><option>PT3 TA</option><option>PT3 FH</option></select></label>
          <label>District<br><select id="alDist"><option value="">Semua</option></select></label>
          <label>Catatan basi jika ≥ (hari)<br><input id="alStale" type="number" min="1" value="7"></label>
          <label>Umur order tua jika ≥ (hari)<br><input id="alOld" type="number" min="1" value="30"></label>
          <label>Cari ID / nama<br><input id="alQ" type="text" style="width:170px;"></label>
          <button class="mon-btn" id="alRefresh" type="button">Hitung ulang</button>
          <button class="mon-btn pri" id="alCsv" type="button">Unduh CSV</button>
          <span id="alCount" class="kpi-sub"></span>
        </div>
        <div class="mon-kpis" id="alKpis"></div>
      </div>
      <div class="card"><div class="mon-scroll"><table class="mon-table"><thead><tr><th>Tematik</th><th>ID</th><th>Nama</th><th>District</th><th>Status</th><th>Komitmen</th><th>Telat (hr)</th><th>Umur (hr)</th><th>Peringatan</th></tr></thead><tbody id="alBody"></tbody></table></div></div></div>`;
    const ds = $('alDist'); A().DISTS.forEach(d=> ds.insertAdjacentHTML('beforeend', `<option>${d}</option>`));
    ['alTema','alDist','alStale','alOld'].forEach(id=> $(id).onchange = renderAlerts);
    $('alQ').oninput = renderAlerts; $('alRefresh').onclick = renderAlerts;
    $('alCsv').onclick = ()=>{
      const cols = [['Tematik','tema'],['ID','id'],['Nama','nama'],['District','dist'],['Status','status'],['Komitmen','komit'],['Telat (hari)','late'],['Umur (hari)','age']].map(([label,k])=>({label, get:r=> r[k]==null?'':r[k]}));
      cols.push({label:'Peringatan', get:r=> r.flags.join(' / ')});
      downloadRowsAsCsv(`peringatan_${new Date().toISOString().slice(0,10)}.csv`, cols, window.__alertsList||[]);
    };
  }
  renderAlerts();
}

/* ============================================================
   2. PERBANDINGAN (snapshot mingguan)
   ============================================================ */
const SNAP_KEY = 'dashSnapshots_v1';
function loadSnaps(){ try{ return JSON.parse(localStorage.getItem(SNAP_KEY)||'[]'); }catch(e){ return []; } }
function saveSnaps(a){ try{ localStorage.setItem(SNAP_KEY, JSON.stringify(a.slice(-150))); return true; }catch(e){ return false; } }
const ymd = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

function dataReady(){
  return [mbbRows, oloRows, hemRows, pt3Rows, pt3fhRows, rows].every(a=> Array.isArray(a) && a.length);
}
const mk = (keys, per, fn) => { const o = {}; keys.forEach(k=>{ o[A().abbr(k)] = fn(per[k]||{}); }); return o; };
function takeSnapshot(){
  const R = A(), d = new Date(); R.P.mode = 'ytd'; R.P.both = false;
  const out = {};
  ['infra','link'].forEach(sd=>{
    const b = R.mbbBlock(R.mbbSide(R.pr('mbb'), sd), d);
    out['MBB New '+(sd==='infra'?'Infra':'Link')] = mk(b.regs, b.per, p=>({ order:p.order||0, gl:p.oa||0, ogp:(p.ogp||0)+(p.fi||0), drop:p.drop||0 }));
  });
  [['olo','OLO'],['hem','HEM']].forEach(([k,l])=>{
    const b = R.ohBlock(R.ohCfg(k), d);
    out[l] = mk(b.dists, b.per, p=>({ order:p.order||0, gl:(p.golive||0)+(p.bisa||0), ogp:(p.ogp||0)+(p.hold||0), drop:p.drop||0 }));
  });
  [['pt3ta','PT3 TA (port)'],['pt3fh','PT3 FH (port)']].forEach(([k,l])=>{
    const b = R.pt3Block(R.pt3Cfg(k), d);
    out[l] = mk(b.regs, b.per, p=>({ order:p.order||0, gl:p.gl||0, ogp:(p.ogp||0)+(p.fi||0), drop:p.drop||0 }));
  });
  const p2 = R.pt2Block(), keys = R.regionsOf(Object.keys(p2.byBranch), x=>x);
  out['PT2 (port)'] = mk(keys, p2.byBranch, p=>({ order:p.port||0, gl:p.golive||0, ogp:(p.godeploy||0)+(p.other||0), drop:p.drop||0 }));
  return { date:ymd(d), ts:d.getTime(), data:out };
}
function saveToday(force){
  if(!dataReady()) return false;
  const snaps = loadSnaps(), key = ymd(new Date()), i = snaps.findIndex(s=>s.date===key);
  if(i>=0 && !force) return false;
  const s = takeSnapshot(); if(i>=0) snaps[i] = s; else snaps.push(s);
  snaps.sort((a,b)=>a.ts-b.ts); return saveSnaps(snaps);
}
/* snapshot otomatis 1x/hari begitu semua data selesai dimuat */
let autoTimer = setInterval(()=>{ try{ if(dataReady()){ saveToday(false); clearInterval(autoTimer); } }catch(e){ console.warn('snapshot', e); } }, 4000);

const fmtD = s => { const [y,m,d] = s.split('-'); return `${d}/${m}/${y}`; };
function delta(cur, base, goodUp){
  const dlt = cur - base;
  if(!dlt) return `<span class="mon-flat">±0</span>`;
  const good = goodUp ? dlt>0 : dlt<0;
  return `<span class="${good?'mon-up':'mon-down'}">${dlt>0?'+':''}${nf(dlt)}</span>`;
}
function renderCompare(){
  const snaps = loadSnaps(), cur = takeSnapshot();
  const sel = $('cmpBase'), want = sel.value;
  const prev = snaps.filter(s=>s.date!==ymd(new Date()));
  sel.innerHTML = prev.map(s=>`<option value="${s.date}">${fmtD(s.date)}</option>`).join('');
  let baseDate = want && prev.some(s=>s.date===want) ? want : null;
  if(!baseDate){ const target = Date.now() - 7*DAY; let best = null; prev.forEach(s=>{ if((!best || Math.abs(s.ts-target) < Math.abs(best.ts-target))) best = s; }); baseDate = best ? best.date : null; }
  if(baseDate) sel.value = baseDate;
  const base = snaps.find(s=>s.date===baseDate);
  $('cmpInfo').textContent = base ? `Pembanding: ${fmtD(base.date)} → hari ini (${fmtD(ymd(new Date()))}), selisih ${(()=>{ const x = new Date(base.ts); x.setHours(0,0,0,0); return daysBetween(today0(), x); })()} hari. Snapshot tersimpan: ${snaps.length}.`
    : `Belum ada pembanding. ${snaps.length ? 'Snapshot hari ini sudah ada; perbandingan muncul setelah ada snapshot dari hari lain.' : 'Klik "Simpan snapshot sekarang"; snapshot juga otomatis tersimpan sekali sehari saat dashboard dibuka.'}`;
  const host = $('cmpBody');
  host.innerHTML = Object.keys(cur.data).map(tema=>{
    const dists = Object.keys(cur.data[tema]);
    const row = d => { const c = cur.data[tema][d] || {order:0,gl:0,ogp:0,drop:0}, b = base && base.data[tema] && base.data[tema][d];
      const cell = (k,up)=> `${nf(c[k])}${b?` <small>(${delta(c[k], b[k], up)})</small>`:''}`;
      return `<tr><td><b>${esc(d)}</b></td><td class="n">${cell('order',true)}</td><td class="n">${cell('gl',true)}</td><td class="n">${cell('ogp',false)}</td><td class="n">${cell('drop',false)}</td></tr>`; };
    const sum = k => dists.reduce((a,d)=>a+(cur.data[tema][d][k]||0),0), bsum = k => base && base.data[tema] ? Object.values(base.data[tema]).reduce((a,x)=>a+(x[k]||0),0) : 0;
    const tot = (k,up)=> `<b>${nf(sum(k))}</b>${base?` <small>(${delta(sum(k), bsum(k), up)})</small>`:''}`;
    return `<div class="card"><p class="section-title" style="font-size:14px;margin:0 0 8px;">${esc(tema)}</p>
      <table class="mon-table"><thead><tr><th>District</th><th>Order</th><th>GL / OA</th><th>OGP</th><th>Drop</th></tr></thead><tbody>${dists.map(row).join('')}
      <tr style="background:var(--panel-2);"><td><b>TOTAL</b></td><td class="n">${tot('order',true)}</td><td class="n">${tot('gl',true)}</td><td class="n">${tot('ogp',false)}</td><td class="n">${tot('drop',false)}</td></tr></tbody></table></div>`;
  }).join('');
}
function buildCompare(){
  const host = $('compareHost'); if(!host) return;
  if(!host.dataset.ready){
    host.dataset.ready = '1';
    host.innerHTML = `<div class="mon-wrap"><div class="card"><p class="section-title" style="margin:0 0 4px;">Perbandingan — dibanding snapshot sebelumnya</p>
      <p class="kpi-sub" style="margin:0 0 10px;">Dashboard menyimpan snapshot angka (per district) sekali sehari di browser ini. Pilih tanggal pembanding untuk melihat naik/turunnya. Hijau = membaik (GL/OA naik, OGP/Drop turun), merah = memburuk.</p>
      <div class="mon-filters"><label>Bandingkan dengan<br><select id="cmpBase"></select></label>
        <button class="mon-btn pri" id="cmpSave" type="button">Simpan snapshot sekarang</button>
        <button class="mon-btn" id="cmpExp" type="button">Ekspor JSON</button>
        <label class="mon-btn" style="margin:0;">Impor JSON<input id="cmpImp" type="file" accept=".json" style="display:none;"></label>
        <button class="mon-btn" id="cmpDel" type="button">Hapus snapshot terpilih</button></div>
      <p id="cmpInfo" class="kpi-sub" style="margin-top:10px;"></p></div><div id="cmpBody"></div></div>`;
    $('cmpBase').onchange = renderCompare;
    $('cmpSave').onclick = ()=>{ if(!dataReady()){ $('cmpInfo').textContent = 'Data belum selesai dimuat, coba beberapa detik lagi.'; return; } saveToday(true); renderCompare(); };
    $('cmpDel').onclick = ()=>{ const v = $('cmpBase').value; if(!v) return; saveSnaps(loadSnaps().filter(s=>s.date!==v)); $('cmpBase').value=''; renderCompare(); };
    $('cmpExp').onclick = ()=>{ const blob = new Blob([JSON.stringify(loadSnaps())], {type:'application/json'}); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `snapshot_dashboard_${ymd(new Date())}.json`; document.body.appendChild(a); a.click(); a.remove(); };
    $('cmpImp').onchange = e=>{ const f = e.target.files[0]; if(!f) return; const rd = new FileReader(); rd.onload = ()=>{ try{ const inc = JSON.parse(rd.result); const map = {}; loadSnaps().concat(inc).forEach(s=>{ if(s && s.date && s.data) map[s.date] = s; }); saveSnaps(Object.values(map).sort((a,b)=>a.ts-b.ts)); renderCompare(); }catch(err){ $('cmpInfo').textContent = 'File JSON tidak valid.'; } }; rd.readAsText(f); };
  }
  if(!dataReady()){ $('cmpBody').innerHTML = '<div class="card">Data belum selesai dimuat — buka halaman ini lagi beberapa detik lagi.</div>'; return; }
  saveToday(false); renderCompare();
}

window.monitorOpenAlerts = function(){ if(!A()){ return; } buildAlerts(); };
window.monitorOpenCompare = function(){ if(!A()){ return; } buildCompare(); };
})();
