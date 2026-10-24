/* ============================================================
   Rekap PPT — 1 klik bikin .pptx (gaya Huddle Review ED Region Sumbagut) dari data live
   dashboard: MBB, OLO, HEM, PT3 TA, PT3 FH, PT2, QE.
   Dipanggil dari halaman "Rekap PPT". Butuh: PptxGenJS + ppt-assets.js
   ============================================================ */
(function(){
'use strict';

const SECTIONS = [
  { key:'mbb',  label:'MBB Deployment',  notes:['Problems','ATBT','Support Needed'] },
  { key:'olo',  label:'OLO Deployment',  notes:['Current Conditions','Action to be Taken','Support Needed'] },
  { key:'hem',  label:'HEM Deployment',  notes:['Current Conditions','Action to be Taken','Support Needed'] },
  { key:'pt3ta',label:'FBB PT3 — TA',    notes:['Current Conditions','Action to be Taken','Support Needed'] },
  { key:'pt3fh',label:'FBB PT3 — FH',    notes:['Current Conditions','Action to be Taken','Support Needed'] },
  { key:'pt2',  label:'FBB PT2',         notes:['Current Conditions','Action to be Taken','Support Needed'] },
  { key:'qe',   label:'QE Relok',        notes:['Notes','Support Needed'] },
];
const LS_KEY = 'rekapPptState_v1';
const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const BLN3 = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
const HARI = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const DISTS = ['Medan','Binjai','Banda Aceh','Rantau Prapat','Pematang Siantar','Padang Sidempuan'];
const DABBR = {'Medan':'MDN','Binjai':'BNJ','Banda Aceh':'BNA','Rantau Prapat':'RAP','Pematang Siantar':'SIA','Padang Sidempuan':'PSP'};
const DKEY = Object.fromEntries(DISTS.map(x=>[x.toUpperCase().replace(/[^A-Z]/g,''), x]));
const DALIAS = { ACEH:'Banda Aceh', SIANTAR:'Pematang Siantar', PEMATANGSIANTAR:'Pematang Siantar', RANTAUPRAPAT:'Rantau Prapat', PADANGSIDIMPUAN:'Padang Sidempuan', SIDEMPUAN:'Padang Sidempuan', SIDIMPUAN:'Padang Sidempuan', PSIANTAR:'Pematang Siantar', PSIDEMPUAN:'Padang Sidempuan', PSIDIMPUAN:'Padang Sidempuan', RPRAPAT:'Rantau Prapat', BNDACEH:'Banda Aceh', BANDAACEH:'Banda Aceh', PADANGSIDEMPUAN:'Padang Sidempuan' };
function distNorm(v){
  const raw = String(v||'').trim(); if(!raw) return 'Tidak Diketahui';
  const k = raw.toUpperCase().replace(/[^A-Z]/g,'');
  return DKEY[k] || DALIAS[k] || raw;
}
function abbr(x){ return DABBR[x] || String(x).replace(/[^A-Za-z]/g,'').slice(0,3).toUpperCase(); }
const C = { navy:'1F3864', blue:'2F5597', grey:'595959', lgrey:'F2F2F2', border:'A6A6A6', red:'D9202F', green:'1E6B3A', ink:'222222' };
const nf = n => (Number(n)||0).toLocaleString('id-ID');
const pct = (a,b) => b ? ((a/b*100).toLocaleString('id-ID',{maximumFractionDigits:1})+'%') : '-';
const dash = n => n ? nf(n) : '-';

/* ---------- state (tersimpan di browser) ---------- */
function loadState(){ try{ return JSON.parse(localStorage.getItem(LS_KEY)||'{}'); }catch(e){ return {}; } }
function saveState(s){ try{ localStorage.setItem(LS_KEY, JSON.stringify(s)); }catch(e){} }

/* ---------- util tanggal ---------- */
function inputDate(){
  const v = document.getElementById('rpDate').value;
  const d = v ? new Date(v+'T'+(document.getElementById('rpTime').value||'10:00')) : new Date();
  return isNaN(d) ? new Date() : d;
}
function cutoffText(d){
  const hh = String(d.getHours()).padStart(2,'0'), mm = String(d.getMinutes()).padStart(2,'0');
  return `CUT OFF : ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()} | ${hh}.${mm} WIB`;
}
function sameMonth(str, d){
  const x = (typeof parseDMY === 'function') ? parseDMY(str) : null;
  return !!x && x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth();
}

/* ============================================================
   AGREGASI DATA (dihitung dari array baris mentah, tanpa filter halaman)
   ============================================================ */
function mbbSide(rowsAll, side){ return rowsAll.filter(r => mbbSowSide(r) === side); }

function mbbBlock(rowsSide, d){
  const regs = regionsOf(rowsSide, r => distNorm(mbbGet(r,'BRANCH')));
  const per = {}; regs.forEach(r => per[r] = {order:0, drop:0, kendala:0, fi:0, oa:0, ogp:0, kom:0});
  const kend = {}, age = {}, prog = {}, batches = new Set();
  regs.forEach(r => age[r] = {'<7':0,'7-14':0,'14-30':0,'>30':0});
  rowsSide.forEach(row=>{
    const rg = distNorm(mbbGet(row,'BRANCH')), cat = mbbFiOaOgp(row);
    per[rg].order++;
    if(cat==='drop') per[rg].drop++;
    else if(cat==='fi') per[rg].fi++;
    else if(cat==='oa') per[rg].oa++;
    else if(cat==='ogp'){
      per[rg].ogp++;
      const kl = mbbKendalaLabel(row);
      if(kl){ per[rg].kendala++; (kend[kl] = kend[kl] || {})[rg] = (kend[kl][rg]||0)+1; }
      const b = mbbAgeBucket(mbbAgeDays(row)); if(b) age[rg][b]++;
      const st = mbbProgresRowLabel(row), bt = mbbBatchLabel(row);
      batches.add(bt); ((prog[st] = prog[st] || {})[bt] = (prog[st][bt]||0)+1);
    }
    if((cat==='ogp'||cat==='fi') && sameMonth(mbbGet(row,'TGL COMMIT OA FIX'), d)) per[rg].kom++;
  });
  return { regs, per, kend, age, prog, batches:[...batches].sort((a,b)=> (parseInt(a)||999)-(parseInt(b)||999) || a.localeCompare(b)) };
}
function regionsOf(rowsArr, fn){
  const present = [...new Set(rowsArr.map(fn))];
  return DISTS.concat(present.filter(r=>!DISTS.includes(r)).sort());
}

function pt3Block(cfg, d){
  const rowsAll = cfg.rows;
  const regs = regionsOf(rowsAll, cfg.region);
  const per = {}; regs.forEach(r => per[r] = {order:0, drop:0, kendala:0, fi:0, gl:0, ogp:0, kom:0, komGl:0});
  const stage = {}, dropSt = {};
  rowsAll.forEach(row=>{
    const rg = cfg.region(row), port = cfg.num(cfg.get(row,'PORT PLAN')), cat = cfg.cat(row);
    per[rg].order += port;
    if(cat==='drop'){ per[rg].drop += port; const s = hemStripStatusPrefix(cfg.get(row,'SUB STATUS KONS')||cfg.status(row)||'DROP').toUpperCase(); (dropSt[s] = dropSt[s] || {})[rg] = (dropSt[s][rg]||0)+port; }
    else if(cat==='fi') per[rg].fi += port;
    else if(cat==='gl') per[rg].gl += port;
    else { per[rg].ogp += port; if(cfg.kendala(row)) per[rg].kendala += port; }
    if(cat!=='drop'){
      const st = hemStripStatusPrefix(cfg.status(row)).toUpperCase();
      (stage[st] = stage[st] || {})[rg] = (stage[st][rg]||0) + port;
    }
    if(cat!=='drop' && sameMonth(cfg.get(row,'KOMITMEN GOLIVE'), d)){ per[rg].kom += port; if(cat==='gl') per[rg].komGl += port; }
  });
  const stageOrder = Object.keys(stage).sort((a,b)=> (cfg.stageIdx(a)-cfg.stageIdx(b)) || a.localeCompare(b));
  return { regs, per, stage, stageOrder, dropSt };
}

/* OLO / HEM: dikelompokkan per DISTRICT */
function ohBlock(cfg, d){
  const dists = regionsOf(cfg.rows, r => distNorm(cfg.get(r,'DISTRICT')));
  const per = {}; dists.forEach(x => per[x] = {order:0, drop:0, golive:0, bisa:0, hold:0, ogp:0, kom:0});
  const prog = {}, drops = [];
  cfg.rows.forEach(row=>{
    const dist = distNorm(cfg.get(row,'DISTRICT'));
    const label = cfg.prog(row), cat = hemCategoryOfLabel(label);
    per[dist].order++; per[dist][cat]++;
    const st = hemStripStatusPrefix(label).toUpperCase();
    (prog[st] = prog[st] || {})[dist] = (prog[st][dist]||0)+1;
    if(cat==='drop') drops.push({ nama: cfg.get(row,'NAMA PROYEK') || cfg.get(row,'NAMA LOP') || cfg.get(row,'IHLD') || '-', dist, status: st });
    if(cat!=='drop' && cat!=='golive' && sameMonth(cfg.get(row,'Komitmen Golive'), d)) per[dist].kom++;
  });
  const progOrder = Object.keys(prog).sort((a,b)=> (typeof PROGRESS_STAGE_ORDER!=='undefined' ? (PROGRESS_STAGE_ORDER.indexOf(a)+1||999)-(PROGRESS_STAGE_ORDER.indexOf(b)+1||999) : 0) || a.localeCompare(b));
  return { dists, per, prog, progOrder, drops };
}

function pt2Block(){
  const byBranch = {}, byStat = {};
  pr('pt2').forEach(row=>{
    const br = distNorm(get(row,'Telkomsel Branch'));
    const port = parseNum(get(row,'PORT ACTUAL'));
    const cls = statusClass(deriveStatus(get(row,'STAT FINAL')));
    const o = byBranch[br] = byBranch[br] || {lop:0, port:0, golive:0, godeploy:0, drop:0, other:0};
    o.lop++; o.port += port; o[cls] += port;
    const st = (get(row,'STAT FINAL') || 'Tidak Diketahui').replace(/^\s*\d+[\.\-\)]?\s*/,'').trim();
    const s = byStat[st] = byStat[st] || {lop:0, port:0}; s.lop++; s.port += port;
  });
  return { byBranch, byStat };
}

/* ============================================================
   CATATAN OTOMATIS (draft dari data, bisa ditimpa user di textarea)
   ============================================================ */
function autoNotes(key, d){
  const out = {};
  try{
    if(key==='mbb'){
      const parts = ['infra','link'].map(s=>({s, b:mbbBlock(mbbSide(pr('mbb'),s), d)}));
      const sum = f => parts.reduce((a,p)=> a + p.b.regs.reduce((x,r)=>x+p.b.per[r][f],0), 0);
      const ord = sum('order')-sum('drop');
      out['Problems'] = [`Total order MBB ${nf(sum('order'))} site (New Infra + New Link): OA ${nf(sum('oa'))}, FI ${nf(sum('fi'))}, OGP ${nf(sum('ogp'))} (${pct(sum('oa'),ord)} OA)`,
        sum('kendala') ? `${nf(sum('kendala'))} site OGP berstatus kendala` : '', sum('drop') ? `${nf(sum('drop'))} site drop` : ''].filter(Boolean).join('\n');
      out['ATBT'] = sum('ogp') ? `Akselerasi dan pengawalan day to day untuk penyelesaian pekerjaan ${nf(sum('ogp'))} site OGP\nEvaluasi kecukupan man power mitra\nMemastikan ketersediaan material` : '';
    } else if(key==='olo' || key==='hem'){
      const cfg = ohCfg(key), b = ohBlock(cfg, d);
      const t = f => b.dists.reduce((a,x)=>a+b.per[x][f],0);
      out['Current Conditions'] = `Total order ${nf(t('order'))} LoP: Golive ${nf(t('golive'))}, OGP ${nf(t('ogp'))}, Bisa PT1 ${nf(t('bisa'))}, Hold ${nf(t('hold'))}, Drop ${nf(t('drop'))}\nAchievement Golive ${pct(t('golive'), t('order'))}`;
      out['Action to be Taken'] = t('ogp') ? `Pengawalan intensif penyelesaian konstruksi ${nf(t('ogp'))} LoP OGP bersama tim Reg ED & District\nKomitmen tambahan Golive ${BULAN[d.getMonth()]}: ${nf(t('kom'))} LoP` : '';
    } else if(key==='pt3ta' || key==='pt3fh'){
      const b = pt3Block(pt3Cfg(key), d), t = f => b.regs.reduce((a,r)=>a+b.per[r][f],0);
      out['Current Conditions'] = `Total order ${nf(t('order'))} port: Golive ${nf(t('gl'))} (${pct(t('gl'), t('order'))}), OGP ${nf(t('ogp'))}, Drop ${nf(t('drop'))}\n${nf(t('kendala'))} port OGP berstatus kendala`;
      out['Action to be Taken'] = `Prioritas order siap instalasi, minim kendala dan tarikan pendek (Quick Win)\nKomitmen Golive ${BULAN[d.getMonth()]}: ${nf(t('kom'))} port, tercapai ${nf(t('komGl'))} port (${pct(t('komGl'), t('kom'))})`;
    } else if(key==='pt2'){
      const b = pt2Block(), arr = Object.values(b.byBranch), tp = arr.reduce((a,x)=>a+x.port,0), gl = arr.reduce((a,x)=>a+x.golive,0), dr = arr.reduce((a,x)=>a+x.drop,0);
      out['Current Conditions'] = `Total ${nf(tp)} port PT2: Golive ${nf(gl)} (${pct(gl,tp)}), Drop ${nf(dr)}`;
    } else if(key==='qe'){
      out['Notes'] = `Total ${nf(qeRows.length)} LoP QE Relok`;
    }
  }catch(e){ console.warn('autoNotes', key, e); }
  return out;
}

function ohCfg(key){
  return key==='olo'
    ? { rows: pr('olo'), get: oloGet, prog: oloRowProgressLabel }
    : { rows: pr('hem'), get: hemGet, prog: hemRowProgressLabel };
}
function pt3Cfg(key){
  return key==='pt3ta'
    ? { rows: pr('pt3ta'), get: pt3Get, num: pt3ParseNum, region: r=>distNorm(pt3Get(r,'BRANCH FMC')), cat: pt3Category2, kendala: pt3HasKendala, status: pt3RowStatusLabel, stageIdx: pt3StageOrderIndex }
    : { rows: pr('pt3fh'), get: pt3fhGet, num: pt3fhParseNum, region: r=>distNorm(pt3fhGet(r,'BRANCH FMC')), cat: pt3fhCategory2, kendala: pt3fhHasKendala, status: pt3fhRowStatusLabel, stageIdx: (typeof pt3fhStageOrderIndex==='function' ? pt3fhStageOrderIndex : ()=>0) };
}

/* ============================================================
   PEMBANGUN SLIDE
   ============================================================ */
const W = 13.333, H = 7.5;
let A;                       // aset gambar
let pptx, cutoff, curD;
const P = { mode:'ytd' };
const DATECOL = {
  mbb:  r => mbbGet(r,'TGL WO'),
  olo:  r => oloGet(r,'TANGGAL ORDER'),
  hem:  r => hemGet(r,'Tanggal submit order nde'),
  pt3ta:r => pt3Get(r,'Tgl Order'),
};
const SRC = { mbb:()=>mbbRows, olo:()=>oloRows, hem:()=>hemRows, pt3ta:()=>pt3Rows, pt3fh:()=>pt3fhRows, pt2:()=>rows };
/* baris sesuai periode: YTD = semua; MTD = bulan dari tanggal huddle (hanya modul yang punya kolom tanggal order) */
function pr(key){
  const all = SRC[key]() || [];
  if(P.mode !== 'mtd' || !DATECOL[key]) return all;
  const d = curD || inputDate();
  return all.filter(r => sameMonth(DATECOL[key](r), d));
}
function modeLabel(d){ return P.mode==='mtd' ? `MTD ${BULAN[d.getMonth()]} ${d.getFullYear()}` : 'All (YTD)'; }

const hc = (t,o={}) => ({ text:String(t), options:Object.assign({ bold:true, color:'FFFFFF', fill:{color:C.navy}, align:'center', valign:'middle' }, o) });
const bc = (t,o={}) => ({ text:String(t), options:Object.assign({ color:C.ink, align:'center', valign:'middle' }, o) });
const lc = (t,o={}) => bc(t, Object.assign({ align:'left' }, o));
const tc = (t,o={}) => ({ text:String(t), options:Object.assign({ bold:true, color:'FFFFFF', fill:{color:C.blue}, align:'center', valign:'middle' }, o) });

function table(s, data, x, y, w, colW, o={}){
  const fs = o.fontSize || 8, rh = o.rowH || 0.2;
  s.addTable(data, { x, y, w, colW, fontFace:'Arial', fontSize:fs, rowH:rh,
    border:{ type:'solid', pt:0.5, color:C.border }, margin:[0.01,0.04,0.01,0.04], autoPage:false, valign:'middle' });
  return y + rh * data.length;
}
function pill(s, text, x, y, w, color){
  s.addShape(pptx.ShapeType.roundRect, { x, y, w, h:0.3, fill:{color}, line:{color, width:0}, rectRadius:0.15 });
  s.addText(text, { x, y, w, h:0.3, align:'center', valign:'middle', bold:true, italic:true, color:'FFFFFF', fontFace:'Arial', fontSize:10 });
}
function caption(s, text, x, y, w, o={}){
  s.addText(text, Object.assign({ x, y, w, h:0.22, fontFace:'Arial', fontSize:9, bold:true, italic:true, color:C.navy, margin:0 }, o));
}
function base(title, sub){
  const s = pptx.addSlide();
  s.background = { color:'FFFFFF' };
  s.addImage({ data:A.hdr, x:0, y:0, w:W, h:0.82 });
  s.addText([
    { text:title, options:{ bold:true, fontSize:28, color:'FFFFFF' } },
    { text:'   '+(sub||(cutoff+'  |  '+modeLabel(curD))), options:{ fontSize:11, color:'FFFFFF', italic:true } },
  ], { x:0.4, y:0.1, w:9.2, h:0.62, fontFace:'Arial', valign:'middle', margin:0, fit:'shrink' });
  s.addText('ED REGION\nSUMBAGUT', { x:9.2, y:0.1, w:2.1, h:0.62, align:'right', valign:'middle', fontFace:'Arial Black', bold:true, fontSize:13, color:C.navy, margin:0 });
  s.addImage({ data:A.infra, x:11.55, y:0.14, w:1.6, h:0.47 });
  s.addImage({ data:A.footer, x:0.75, y:7.18, w:W-0.75, h:0.32 });
  s.addImage({ data:A.nlogo, x:0.18, y:7.02, w:0.5, h:0.5 });
  s.addText('2026 | ED Region Sumbagut | PT. Telkom Infrastruktur Indonesia', { x:6.2, y:7.2, w:7.1, h:0.28, align:'right', fontFace:'Arial', fontSize:10, bold:true, color:'FFFFFF', margin:[0,0.2,0,0] });
  return s;
}

/* kotak catatan: judul abu-abu + daftar bernomor */
function noteBox(s, heading, text, x, y, w, h, o={}){
  s.addShape(pptx.ShapeType.rect, { x, y, w, h:0.26, fill:{color:'8C8C8C'}, line:{color:'8C8C8C', width:0} });
  s.addText(heading, { x:x+0.05, y, w:w-0.1, h:0.26, bold:true, fontFace:'Arial', fontSize:10.5, color:'FFFFFF', valign:'middle', margin:0 });
  const lines = String(text||'').split('\n').map(l=>l.trimEnd()).filter(l=>l.trim());
  if(!lines.length) return;
  const runs = [];
  lines.forEach(l=>{
    const sub = /^\s*[-•◦o]\s+/.test(l) || /^\s{2,}\S/.test(l);
    const t = l.replace(/^\s*[-•◦]\s+/,'').replace(/^\s*\d+[\.\)]\s+/,'').trim();
    runs.push({ text:t, options: sub ? { bullet:true, indentLevel:1, breakLine:true } : { bullet:{type:'number'}, breakLine:true } });
  });
  s.addText(runs, { x:x+0.02, y:y+0.3, w:w-0.04, h:h-0.3, fontFace:'Arial', fontSize:o.fontSize||9, color:C.ink, valign:'top', margin:[0,2,0,2], paraSpaceAfter:2, fit:'shrink' });
}
function notesFor(s, sec, st, d, x, y, w, h){
  const auto = (document.getElementById('rpAuto').checked) ? autoNotes(sec.key, d) : {};
  const saved = (st.notes && st.notes[sec.key]) || {};
  const items = sec.notes.filter(n => n !== 'Support Needed' || true).map(n => ({ n, text: (saved[n] && saved[n].trim()) ? saved[n] : (auto[n]||'') }));
  const each = h / items.length;
  items.forEach((it,i)=> noteBox(s, it.n, it.text, x, y + i*each, w, each-0.06));
}

/* ---------- 1. COVER ---------- */
function slideCover(st, d){
  const s = pptx.addSlide();
  s.addImage({ data:A.cover, x:0, y:0, w:W, h:H });
  s.addImage({ data:A.p1_960, x:0.4, y:0.3, w:2.3, h:1.3 });
  s.addImage({ data:A.infra_cover, x:10.9, y:0.35, w:2.2, h:0.76 });
  s.addText('HUDDLE REVIEW', { x:0.5, y:1.75, w:W-1, h:0.7, align:'center', fontFace:'Arial Black', bold:true, fontSize:36, color:'F7A41D', margin:0 });
  s.addText((st.title || 'PROGRESS DEPLOYMENT ED REGION SUMBAGUT').toUpperCase(), { x:0.3, y:2.4, w:W-0.6, h:0.8, align:'center', fontFace:'Arial Black', bold:true, fontSize:32, color:'FFFFFF', margin:0, fit:'shrink' });
  s.addText(String(d.getFullYear())+'  |  '+modeLabel(d), { x:0.5, y:3.25, w:W-1, h:0.5, align:'center', fontFace:'Arial Black', bold:true, fontSize:24, color:'FFFFFF', margin:0 });
  s.addImage({ data:A.nlogo, x:0.55, y:4.55, w:2.2, h:2.2 });
  s.addImage({ data:A.p1_182, x:0.4, y:6.5, w:0.45, h:0.5 });
  s.addText('PT. TELKOM INFRASTRUKTUR INDONESIA', { x:1.05, y:6.5, w:6, h:0.22, fontFace:'Arial', fontSize:9, bold:true, color:'FFFFFF', margin:0 });
  s.addText('Jl. Gaharu No.1, Gaharu, Kec. Medan Tim., Kota Medan, Sumatera Utara 20236', { x:1.05, y:6.75, w:5, h:0.4, fontFace:'Arial', fontSize:9, color:'FFFFFF', margin:0 });
  s.addText(`${HARI[d.getDay()]}, ${String(d.getDate()).padStart(2,'0')} ${BULAN[d.getMonth()]} ${d.getFullYear()}`.toUpperCase(), { x:8.2, y:6.55, w:4.8, h:0.4, align:'right', fontFace:'Times New Roman', italic:true, bold:true, fontSize:20, color:'FFFFFF', margin:0 });
}

/* ---------- 2. MBB ---------- */
function mbbTables(s, b, label, color, x, w, d){
  pill(s, label, x, 0.95, Math.min(w-0.3, 4.2), color);
  const hdr = ['DISTRICT','ORDER','DROP','KENDALA','FI','OA','OGP','%OA','KOM OA'].map(t=>hc(t,{fontSize:7}));
  const T = {order:0,drop:0,kendala:0,fi:0,oa:0,ogp:0,kom:0};
  const body = b.regs.map(r=>{ const p=b.per[r]; Object.keys(T).forEach(k=>T[k]+=p[k]);
    return [lc(r,{bold:true}), bc(nf(p.order)), bc(dash(p.drop)), bc(dash(p.kendala)), bc(dash(p.fi)), bc(dash(p.oa)), bc(dash(p.ogp)), bc(pct(p.oa, p.order-p.drop)), bc(dash(p.kom))]; });
  body.push(['TOTAL',nf(T.order),dash(T.drop),dash(T.kendala),dash(T.fi),dash(T.oa),dash(T.ogp),pct(T.oa,T.order-T.drop),dash(T.kom)].map(t=>tc(t)));
  const f = [1.2,0.5,0.45,0.6,0.35,0.4,0.45,0.55,0.55], fs = f.reduce((a,v)=>a+v,0);
  let y = table(s, [hdr, ...body], x, 1.32, w, f.map(v=>v*w/fs), {fontSize:7.5, rowH:0.2});
  y += 0.12; const hw = (w-0.1)/2;
  const gh = (t)=> hc(t,{fill:{color:'D9D9D9'},color:C.ink,fontSize:5.5});
  const kl = Object.keys(b.kend).sort();
  const kh = [gh('KENDALA'), ...b.regs.map(r=>gh(abbr(r))), gh('TOT')];
  const kb = kl.map(k=>{ const tot = b.regs.reduce((a,r)=>a+(b.kend[k][r]||0),0); return [lc(k,{fontSize:5.5}), ...b.regs.map(r=>bc(dash(b.kend[k][r]||0))), bc(nf(tot),{bold:true})]; });
  if(!kb.length) kb.push([lc('— tidak ada —'), ...b.regs.map(()=>bc('')), bc('')]);
  const kn = b.regs.length;
  table(s, [kh, ...kb], x, y, hw, [hw*0.26, ...b.regs.map(()=>hw*0.62/kn), hw*0.12], {fontSize:6, rowH:0.16});
  const bk = ['<7','7-14','14-30','>30'];
  const ah = [gh('OPEN'), ...bk.map(gh), gh('TOT')];
  const ab = b.regs.map(r=>{ const a=b.age[r]; return [lc(abbr(r),{bold:true}), ...bk.map(k=>bc(dash(a[k]))), bc(dash(bk.reduce((q,k)=>q+a[k],0)),{bold:true})]; });
  ab.push(['TOTAL', ...bk.map(k=>dash(b.regs.reduce((q,r)=>q+b.age[r][k],0))), dash(b.regs.reduce((q,r)=>q+bk.reduce((z,k)=>z+b.age[r][k],0),0))].map(t=>tc(t,{fontSize:6.5})));
  table(s, [ah, ...ab], x+hw+0.1, y, hw, [hw*0.22, ...bk.map(()=>hw*0.14), hw*0.22], {fontSize:6.5, rowH:0.16});
  y += 0.16 * Math.max(kb.length+1, ab.length+1) + 0.15;
  const bt = b.batches.slice(0,14);
  const ph = [hc('PROGRES',{fontSize:7}), ...bt.map(t=>hc(t,{fill:{color:'1E6B3A'},fontSize:7})), hc('TOTAL',{fontSize:7})];
  const order = ['AANWIJZING','PERIZINAN','MATDEL','INSTALASI','XX HOLD ISSUE','XX ISSUE TSEL','XX REDESIGN'];
  const pl = Object.keys(b.prog).sort((a,c)=> (order.indexOf(a)<0?99:order.indexOf(a)) - (order.indexOf(c)<0?99:order.indexOf(c)) || a.localeCompare(c));
  const pb = pl.map(p=>{ const tot = Object.values(b.prog[p]).reduce((a,v)=>a+v,0); return [lc(p,{fontSize:6}), ...bt.map(k=>bc(dash(b.prog[p][k]||0))), bc(nf(tot),{bold:true})]; });
  if(pb.length){
    pb.push(['TOTAL', ...bt.map(k=>dash(pl.reduce((a,p)=>a+(b.prog[p][k]||0),0))), nf(pl.reduce((a,p)=>a+Object.values(b.prog[p]).reduce((z,v)=>z+v,0),0))].map(t=>tc(t,{fontSize:6.5})));
    caption(s, 'PROGRES x BATCH (OGP)', x, y-0.02, w);
    y = table(s, [ph, ...pb], x, y+0.2, w, [w*0.2, ...bt.map(()=>w*0.65/Math.max(bt.length,1)), w*0.15], {fontSize:6.5, rowH:0.17});
  }
  s.addText(`KOM OA = komitmen tambah OA ${BULAN[d.getMonth()]} ${d.getFullYear()}`, { x, y:y+0.08, w, h:0.2, fontFace:'Arial', fontSize:7.5, italic:true, color:C.blue, margin:0 });
}
function slideMbb(st, d){
  const s = base('MBB DEPLOYMENT');
  const all = pr('mbb');
  mbbTables(s, mbbBlock(mbbSide(all,'infra'), d), 'ALL ORDER NEW INFRA', '595959', 0.3, 5.0, d);
  mbbTables(s, mbbBlock(mbbSide(all,'link'), d), 'ALL ORDER NEW LINK', C.blue, 5.45, 5.0, d);
  notesFor(s, SECTIONS[0], st, d, 10.6, 0.95, 2.55, 6.15);
}

/* ---------- OLO / HEM ---------- */
function slideOH(key, title, st, d){
  const cfg = ohCfg(key), b = ohBlock(cfg, d), s = base(title);
  caption(s, `ALL ORDER ${key.toUpperCase()} (per District) — ${modeLabel(d)}`, 0.3, 0.95, 7, {fontSize:10});
  const hdr = ['DISTRICT','ORDER','DROP','GOLIVE','BISA PT1','HOLD','OGP','%GL','KOM GL'].map(t=>hc(t,{fontSize:8}));
  const T = {order:0,drop:0,golive:0,bisa:0,hold:0,ogp:0,kom:0};
  const body = b.dists.map(x=>{ const p=b.per[x]; Object.keys(T).forEach(k=>T[k]+=p[k]);
    return [lc(x,{bold:true}), bc(nf(p.order)), bc(dash(p.drop)), bc(dash(p.golive)), bc(dash(p.bisa)), bc(dash(p.hold)), bc(dash(p.ogp)), bc(pct(p.golive,p.order)), bc(dash(p.kom))]; });
  body.push(['TOTAL',nf(T.order),dash(T.drop),dash(T.golive),dash(T.bisa),dash(T.hold),dash(T.ogp),pct(T.golive,T.order),dash(T.kom)].map(t=>tc(t)));
  const f=[1.4,0.65,0.55,0.65,0.7,0.55,0.55,0.6,0.7], fw=f.reduce((a,v)=>a+v,0), LW=6.9;
  let y = table(s, [hdr, ...body], 0.3, 1.22, LW, f.map(v=>v*LW/fw), {fontSize:9, rowH:0.27});
  y += 0.12;
  s.addText(`KOM GL = komitmen golive ${BULAN[d.getMonth()]} ${d.getFullYear()} (order belum golive)`, { x:0.3, y, w:LW, h:0.2, fontFace:'Arial', fontSize:7.5, italic:true, color:C.blue, margin:0 });
  y += 0.3;
  caption(s, 'PROGRES LAPANGAN x DISTRICT', 0.3, y-0.02, 6);
  const ds = b.dists;
  const ph = [hc('PROGRES',{fontSize:7.5}), ...ds.map(x=>hc(abbr(x),{fontSize:7.5})), hc('TOTAL',{fontSize:7.5})];
  const pb = b.progOrder.map(p=>[lc(p,{fontSize:7.5}), ...ds.map(x=>bc(dash(b.prog[p][x]||0))), bc(nf(Object.values(b.prog[p]).reduce((a,v)=>a+v,0)),{bold:true})]);
  pb.push(['TOTAL', ...ds.map(x=>dash(b.progOrder.reduce((a,p)=>a+(b.prog[p][x]||0),0))), nf(T.order)].map(t=>tc(t)));
  table(s, [ph, ...pb], 0.3, y+0.2, LW, [LW*0.28, ...ds.map(()=>LW*0.57/ds.length), LW*0.15], {fontSize:8, rowH:0.22});
  let ry = 0.95; const RX = 7.45, RW = 5.6;
  if(b.drops.length){
    caption(s, `DAFTAR DROP (${b.drops.length} LoP)`, RX, ry-0.02, 5);
    const dl = b.drops.slice(0,8).map(r=>[lc(r.nama,{fontSize:6.5}), lc(r.dist,{fontSize:6.5}), lc(r.status,{fontSize:6.5})]);
    ry = table(s, [[hc('NAMA PROYEK'), hc('DISTRICT'), hc('STATUS')], ...dl], RX, ry+0.22, RW, [3.1,1.3,1.2], {fontSize:7, rowH:0.2});
    if(b.drops.length>8){ s.addText(`…dan ${b.drops.length-8} LoP drop lainnya`, { x:RX, y:ry, w:RW, h:0.2, fontSize:7, italic:true, fontFace:'Arial', color:C.grey, margin:0 }); ry += 0.2; }
    ry += 0.1;
  }
  notesFor(s, SECTIONS.find(x=>x.key===key), st, d, RX, ry, RW, 7.05-ry);
}

/* ---------- PT3 ---------- */
function slidePt3(key, title, st, d){
  const cfg = pt3Cfg(key), b = pt3Block(cfg, d), s = base(title);
  const LW = 7.0;
  caption(s, `ALL ORDER ${key==='pt3ta'?'PT3 TA':'PT3 FH'} (PORT PLAN) — ${key==='pt3ta' ? modeLabel(d) : 'All (YTD)'}`, 0.3, 0.95, 7, {fontSize:10});
  const hdr = ['DISTRICT','ORDER','DROP','KENDALA','FI','GL','OGP','%GL','KOM GL','TERCAPAI','% ACH'].map(t=>hc(t,{fontSize:7}));
  const T = {order:0,drop:0,kendala:0,fi:0,gl:0,ogp:0,kom:0,komGl:0};
  const body = b.regs.map(r=>{ const p=b.per[r]; Object.keys(T).forEach(k=>T[k]+=p[k]);
    return [lc(r,{bold:true}), bc(nf(p.order)), bc(dash(p.drop)), bc(dash(p.kendala)), bc(dash(p.fi)), bc(dash(p.gl)), bc(dash(p.ogp)), bc(pct(p.gl,p.order)), bc(dash(p.kom)), bc(dash(p.komGl)), bc(pct(p.komGl,p.kom))]; });
  body.push(['TOTAL',nf(T.order),dash(T.drop),dash(T.kendala),dash(T.fi),dash(T.gl),dash(T.ogp),pct(T.gl,T.order),dash(T.kom),dash(T.komGl),pct(T.komGl,T.kom)].map(t=>tc(t,{fontSize:7.5})));
  const f=[1.25,0.6,0.5,0.6,0.45,0.5,0.6,0.5,0.55,0.65,0.55], fw=f.reduce((a,v)=>a+v,0);
  let y = table(s, [hdr, ...body], 0.3, 1.22, LW, f.map(v=>v*LW/fw), {fontSize:8, rowH:0.26});
  y += 0.1;
  s.addText(`KOM GL = komitmen golive ${BULAN[d.getMonth()]} ${d.getFullYear()} (port); TERCAPAI = yang sudah golive`, { x:0.3, y, w:LW, h:0.2, fontFace:'Arial', fontSize:7.5, italic:true, color:C.blue, margin:0 });
  y += 0.3;
  caption(s, 'STATUS x DISTRICT (tanpa Drop, port)', 0.3, y-0.02, 6);
  const sh = [hc('STATUS',{fontSize:7.5}), ...b.regs.map(r=>hc(abbr(r),{fontSize:7.5})), hc('TOTAL',{fontSize:7.5})];
  const sb = b.stageOrder.map(k=>[lc(k,{fontSize:7.5}), ...b.regs.map(r=>bc(dash(b.stage[k][r]||0))), bc(nf(Object.values(b.stage[k]).reduce((a,v)=>a+v,0)),{bold:true})]);
  sb.push(['TOTAL', ...b.regs.map(r=>dash(b.stageOrder.reduce((a,k)=>a+(b.stage[k][r]||0),0))), nf(T.order-T.drop)].map(t=>tc(t)));
  table(s, [sh, ...sb], 0.3, y+0.2, LW, [LW*0.25, ...b.regs.map(()=>LW*0.58/b.regs.length), LW*0.17], {fontSize:8, rowH:0.22});
  let ry = 0.95; const RX = 7.55, RW = 5.5;
  const dk = Object.keys(b.dropSt);
  if(dk.length){
    caption(s, 'DETAIL DROP (port)', RX, ry-0.02, 5);
    const db = dk.slice(0,8).map(k=>[lc(k,{fontSize:6.5}), ...b.regs.map(r=>bc(dash(b.dropSt[k][r]||0))), bc(nf(Object.values(b.dropSt[k]).reduce((a,v)=>a+v,0)),{bold:true})]);
    db.push(['TOTAL', ...b.regs.map(r=>dash(b.per[r].drop)), nf(T.drop)].map(t=>tc(t,{fontSize:6.5})));
    ry = table(s, [[hc('STATUS',{fontSize:7}), ...b.regs.map(r=>hc(abbr(r),{fontSize:7})), hc('JLH',{fontSize:7})], ...db], RX, ry+0.22, RW, [RW*0.28, ...b.regs.map(()=>RW*0.58/b.regs.length), RW*0.14], {fontSize:7, rowH:0.19}) + 0.12;
  }
  notesFor(s, SECTIONS.find(x=>x.key===key), st, d, RX, ry, RW, 7.05-ry);
}

/* ---------- PT2 ---------- */
function slidePt2(st, d){
  const b = pt2Block(), s = base('FBB PT2');
  caption(s, 'ALL ORDER PT2 (port actual, per District) — All (YTD)', 0.3, 0.95, 7, {fontSize:10});
  const brs = regionsOf(Object.keys(b.byBranch), x=>x);
  const T = {lop:0,port:0,golive:0,godeploy:0,drop:0,other:0};
  const body = brs.map(k=>{ const p=b.byBranch[k] || {lop:0,port:0,golive:0,godeploy:0,drop:0,other:0}; Object.keys(T).forEach(q=>T[q]+=p[q]);
    return [lc(k,{bold:true}), bc(dash(p.lop)), bc(dash(p.port)), bc(dash(p.drop)), bc(dash(p.godeploy)), bc(dash(p.golive)), bc(dash(p.other)), bc(pct(p.golive,p.port))]; });
  body.push(['TOTAL',nf(T.lop),nf(T.port),dash(T.drop),dash(T.godeploy),dash(T.golive),dash(T.other),pct(T.golive,T.port)].map(t=>tc(t)));
  const f=[1.5,0.6,0.9,0.8,0.9,0.8,0.8,0.6], fw=f.reduce((a,v)=>a+v,0), LW=6.9;
  let y = table(s, [['DISTRICT','LOP','PORT','DROP','GO DEPLOY','GOLIVE','LAINNYA','%GL'].map(t=>hc(t,{fontSize:8})), ...body], 0.3, 1.22, LW, f.map(v=>v*LW/fw), {fontSize:9, rowH:0.27});
  y += 0.3;
  caption(s, 'STATUS FINAL (top 12)', 0.3, y-0.02, 6);
  const sk = Object.keys(b.byStat).sort((a,c)=>b.byStat[c].port-b.byStat[a].port).slice(0,12);
  const sb = sk.map(k=>[lc(k,{fontSize:8}), bc(nf(b.byStat[k].lop)), bc(nf(b.byStat[k].port))]);
  table(s, [[hc('STATUS'), hc('LOP'), hc('PORT')], ...sb], 0.3, y+0.2, LW, [4.5,1.1,1.3], {fontSize:8, rowH:0.2});
  notesFor(s, SECTIONS.find(x=>x.key==='pt2'), st, d, 7.45, 0.95, 5.6, 6.1);
}

/* ---------- QE ---------- */
function qeDist(r){ return distNorm(qeGet(r,'DISTRICT TIF') || qeGet(r,'DISTRICT') || qeGet(r,'BRANCH')); }
function slideQe(st, d){
  const s = base('QE RELOK');
  const by = {};
  qeRows.forEach(r=>{ const k = qeStatusLabel(r); (by[k] = by[k] || []).push(r); });
  const keys = Object.keys(by).sort((a,c)=>by[c].length-by[a].length);
  const ds = regionsOf(qeRows, qeDist);
  caption(s, 'ALL ORDER QE (per District) — All (YTD)', 0.3, 0.95, 7, {fontSize:10});
  const sb = keys.map(k=>[lc(k,{bold:true,fontSize:8}), ...ds.map(x=>bc(dash(by[k].filter(r=>qeDist(r)===x).length))), bc(nf(by[k].length),{bold:true})]);
  sb.push(['TOTAL', ...ds.map(x=>dash(qeRows.filter(r=>qeDist(r)===x).length)), nf(qeRows.length)].map(t=>tc(t)));
  const LW = 6.6;
  let y = table(s, [[hc('STATUS PROGRES',{fontSize:8}), ...ds.map(x=>hc(abbr(x),{fontSize:8})), hc('TOTAL',{fontSize:8})], ...sb.slice(0,14)], 0.3, 1.22, LW, [LW*0.28, ...ds.map(()=>LW*0.57/ds.length), LW*0.15], {fontSize:8.5, rowH:0.22});
  const open = qeRows.filter(r => !/CLOSE|SELESAI|DONE/i.test(qeStatusLabel(r))).slice(0,14);
  caption(s, `DAFTAR LOP BELUM CLOSED (${open.length}${qeRows.length>open.length?'+':''})`, 7.15, 0.93, 5.8);
  const ob = open.map(r=>[lc(qeGet(r,'NAMA LOP'),{fontSize:7}), lc(qeDist(r),{fontSize:7}), lc(qeStatusLabel(r),{fontSize:7})]);
  table(s, [[hc('NAMA PROYEK'), hc('DISTRICT'), hc('STATUS')], ...ob], 7.15, 1.22, 5.8, [3.2,1.2,1.4], {fontSize:7.5, rowH:0.2});
  const ny = Math.max(y, 4.4)+0.2;
  notesFor(s, SECTIONS.find(x=>x.key==='qe'), st, d, 0.3, ny, LW, 7.0-ny);
}

/* ---------- Support Needed (rekap dari semua tematik) ---------- */
function slideSupport(st, d, included){
  const s = base('Support Needed', ' ');
  const hdr = [ { text:'Tematik', options:{ bold:true, color:'FFFFFF', fill:{color:'1F5C7A'}, fontSize:12, align:'left' } }, { text:'Support Needed', options:{ bold:true, color:'FFFFFF', fill:{color:'1F5C7A'}, fontSize:12, align:'left' } } ];
  const auto = {};
  const body = [];
  const groups = [ ['MBB',['mbb']], ['OLO',['olo']], ['HEM',['hem']], ['FBB',['pt3ta','pt3fh','pt2']], ['QE',['qe']] ];
  groups.forEach(([label, ks], gi)=>{
    const lines = [];
    ks.filter(k=>included.includes(k)).forEach(k=>{ const t = ((st.notes||{})[k]||{})['Support Needed']; if(t) String(t).split('\n').forEach(l=>{ if(l.trim()) lines.push(l.replace(/^\s*[-•◦]\s+/,'').replace(/^\s*\d+[\.\)]\s+/,'').trim()); }); });
    if(!lines.length) return;
    const fill = { color: gi%2 ? 'E7EAF1' : 'CFD5E3' };
    body.push([ { text:label, options:{ color:C.ink, fontSize:12, fill, valign:'middle', align:'left' } },
      { text: lines.map((l,i)=>({ text:l, options:{ bullet:{type:'number'}, breakLine:true } })), options:{ color:C.ink, fontSize:11, fill, valign:'middle' } } ]);
  });
  if(!body.length) body.push([ {text:'-', options:{fontSize:12}}, {text:'Belum ada Support Needed yang diisi (isi di halaman Rekap PPT).', options:{fontSize:11, italic:true, color:C.grey}} ]);
  s.addTable([hdr, ...body], { x:0.6, y:1.05, w:12.1, colW:[1.6,10.5], fontFace:'Arial', border:{ type:'solid', pt:1, color:'FFFFFF' }, margin:[0.05,0.1,0.05,0.1], autoPage:false });
}

/* ---------- Thank You ---------- */
function slideEnd(){
  const s = pptx.addSlide();
  s.addImage({ data:A.end, x:0, y:0, w:W, h:H });
  s.addImage({ data:A.p1_960, x:7.3, y:0.35, w:2.9, h:1.63 });
  s.addImage({ data:A.infra_cover, x:10.4, y:0.45, w:2.5, h:0.86 });
  s.addText('Thank You', { x:0.5, y:3.6, w:6, h:1.2, fontFace:'Arial', fontSize:54, color:'F7A41D', margin:0 });
  s.addImage({ data:A.nlogo, x:5.2, y:1.7, w:3.9, h:3.9 });
  s.addText('2026 | ED Region Sumbagut | PT. Telkom Infrastruktur Indonesia', { x:4.5, y:7.05, w:8.7, h:0.3, align:'right', fontFace:'Arial', fontSize:10, bold:true, color:'FFFFFF', margin:0 });
}

/* ============================================================
   ORKESTRASI + UI
   ============================================================ */
function dataReady(){
  const chk = [
    ['mbb','MBB', typeof mbbRows!=='undefined' && mbbRows.length],
    ['olo','OLO', typeof oloRows!=='undefined' && oloRows.length],
    ['hem','HEM', typeof hemRows!=='undefined' && hemRows.length],
    ['pt3ta','PT3 TA', typeof pt3Rows!=='undefined' && pt3Rows.length],
    ['pt3fh','PT3 FH', typeof pt3fhRows!=='undefined' && pt3fhRows.length],
    ['pt2','PT2', typeof rows!=='undefined' && rows.length],
    ['qe','QE', typeof qeRows!=='undefined' && qeRows.length],
  ];
  return chk;
}
function readUI(){
  const st = loadState();
  st.title = document.getElementById('rpTitle').value.trim();
  st.date = document.getElementById('rpDate').value; st.time = document.getElementById('rpTime').value;
  st.auto = document.getElementById('rpAuto').checked; st.mode = document.getElementById('rpMode').value;
  st.inc = SECTIONS.filter(sec => document.getElementById('rpInc_'+sec.key).checked).map(sec=>sec.key);
  st.notes = st.notes || {};
  SECTIONS.forEach(sec=>{ st.notes[sec.key] = st.notes[sec.key] || {}; sec.notes.forEach(n=>{ st.notes[sec.key][n] = document.getElementById(`rpN_${sec.key}_${n.replace(/\W/g,'')}`).value; }); });
  saveState(st); return st;
}

async function generate(){
  const btn = document.getElementById('rpGo'), msg = document.getElementById('rpMsg');
  const say = (t,err)=>{ msg.textContent = t; msg.style.color = err ? '#B42318' : ''; };
  try{
    if(typeof PptxGenJS === 'undefined'){
      say('Memuat library PPT…');
      const srcs = ['pptxgen.bundle.js','https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js','https://cdnjs.cloudflare.com/ajax/libs/pptxgenjs/3.12.0/pptxgen.bundle.js','https://unpkg.com/pptxgenjs@3.12.0/dist/pptxgen.bundle.js'];
      for(const src of srcs){
        if(typeof PptxGenJS !== 'undefined') break;
        await new Promise(res=>{ const el = document.createElement('script'); el.src = src; el.onload = res; el.onerror = res; document.head.appendChild(el); });
      }
    }
    if(typeof PptxGenJS === 'undefined') throw new Error('Library PptxGenJS gagal dimuat. Pastikan file pptxgen.bundle.js ikut ter-upload di folder yang sama dengan index.html (atau cek koneksi internet).');
    if(!window.PPT_ASSETS) throw new Error('File ppt-assets.js belum termuat — pastikan ada di folder yang sama dengan index.html.');
    A = window.PPT_ASSETS;
    btn.disabled = true; say('Menyiapkan data…');
    const st = readUI(), d = inputDate();
    if(st.inc.includes('qe') && !qeRows.length && typeof qeLoad === 'function'){ say('Memuat data QE…'); try{ await qeLoad(); }catch(e){} }
    const sel = document.getElementById('rpMode').value;
    const modes = sel==='both' ? ['ytd','mtd'] : [sel];
    const miss = [], files = [];
    for(const mode of modes){
      P.mode = mode; curD = d;
      pptx = new PptxGenJS(); pptx.layout = 'LAYOUT_WIDE';
      pptx.title = 'Huddle Review ED Region Sumbagut'; pptx.company = 'PT Telkom Infrastruktur Indonesia';
      cutoff = cutoffText(d);
      const run = (key, fn) => { if(!st.inc.includes(key)) return; try{ fn(); }catch(e){ console.error(key, e); const l = SECTIONS.find(x=>x.key===key).label; if(!miss.includes(l)) miss.push(l); } };
      say(`Membuat slide (${modeLabel(d)})…`);
      slideCover(st, d);
      run('mbb', ()=> slideMbb(st,d));
      run('olo', ()=> slideOH('olo','OLO DEPLOYMENT', st, d));
      run('hem', ()=> slideOH('hem','HEM DEPLOYMENT', st, d));
      run('pt3ta', ()=> slidePt3('pt3ta','FBB PT3 — TA', st, d));
      run('pt3fh', ()=> slidePt3('pt3fh','FBB PT3 — FH', st, d));
      run('pt2', ()=> slidePt2(st, d));
      run('qe', ()=> slideQe(st, d));
      slideSupport(st, d, st.inc);
      slideEnd();
      const fn = `Huddle_Review_ED_Sumbagut_${mode==='mtd'?'MTD':'YTD'}_${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}.pptx`;
      await pptx.writeFile({ fileName: fn }); files.push(fn);
    }
    say(`Selesai — ${files.join(' & ')} terunduh.` + (miss.length ? ` (Slide gagal dibuat: ${miss.join(', ')} — datanya mungkin belum termuat.)` : ''), miss.length>0);
  }catch(e){ console.error(e); say('Gagal: '+(e.message||e), true); }
  finally{ btn.disabled = false; }
}
window.rekapPptGenerate = generate;

function buildUI(){
  const host = document.getElementById('rekapPptHost'); if(!host || host.dataset.ready) return;
  host.dataset.ready = '1';
  const st = loadState(), now = new Date();
  if(/TIF1/i.test(st.title||'')) st.title = '';
  const pad = n => String(n).padStart(2,'0');
  const dv = st.date || `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
  const tv = st.time || `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const esc = t => String(t||'').replace(/&/g,'&amp;').replace(/</g,'&lt;');
  host.innerHTML = `
    <div class="card" style="padding:18px 20px;margin-bottom:14px;">
      <p class="section-title" style="margin:0 0 4px;">Rekap Presentasi (PPT) — 1 klik</p>
      <p class="kpi-sub" style="margin:0 0 14px;">Merangkum MBB, OLO, HEM, PT3 TA/FH, PT2 dan QE dari data live dashboard ke file PowerPoint bergaya Huddle Review ED Region Sumbagut. Angka diambil otomatis; teks catatan bisa diisi sendiri (opsional).</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;">
        <label style="flex:2;min-width:260px;font-size:12px;">Judul cover<input id="rpTitle" type="text" style="width:100%;" value="${esc(st.title||'Progress Deployment ED Region Sumbagut')}"></label>
        <label style="font-size:12px;">Tanggal huddle<input id="rpDate" type="date" value="${dv}"></label>
        <label style="font-size:12px;">Cut off jam<input id="rpTime" type="time" value="${tv}"></label>
        <label style="font-size:12px;">Periode<select id="rpMode"><option value="ytd" ${st.mode==='ytd'||!st.mode?'selected':''}>All (YTD)</option><option value="mtd" ${st.mode==='mtd'?'selected':''}>MTD (bulan tanggal huddle)</option><option value="both" ${st.mode==='both'?'selected':''}>Keduanya (2 file)</option></select></label>
        <button id="rpGo" type="button" style="padding:10px 22px;font-weight:700;background:var(--navy,#1F3864);color:#fff;border:0;border-radius:6px;cursor:pointer;">Generate PPT</button>
      </div>
      <div id="rpMsg" class="kpi-sub" style="margin-top:10px;min-height:18px;"></div>
    </div>
    <div class="card" style="padding:16px 20px;margin-bottom:14px;">
      <p class="section-title" style="font-size:14px;margin:0 0 8px;">Slide yang disertakan</p>
      <div id="rpIncList" style="display:flex;gap:16px;flex-wrap:wrap;font-size:13px;"></div>
      <label style="display:block;margin-top:10px;font-size:12.5px;"><input type="checkbox" id="rpAuto" ${st.auto===false?'':'checked'}> Isi otomatis ringkasan Current Conditions / Action dari data bila kolom catatan kosong</label>
      <div id="rpData" class="kpi-sub" style="margin-top:8px;"></div>
    </div>
    <div class="card" style="padding:16px 20px;">
      <p class="section-title" style="font-size:14px;margin:0 0 4px;">Catatan per slide (opsional)</p>
      <p class="kpi-sub" style="margin:0 0 10px;">1 baris = 1 poin bernomor. Awali baris dengan "-" untuk sub-poin. Tersimpan otomatis di browser ini. "Support Needed" dirangkum juga ke slide Support Needed.</p>
      <div id="rpNotes"></div>
    </div>`;
  const inc = host.querySelector('#rpIncList');
  SECTIONS.forEach(sec=>{
    const on = !st.inc || st.inc.includes(sec.key);
    inc.insertAdjacentHTML('beforeend', `<label><input type="checkbox" id="rpInc_${sec.key}" ${on?'checked':''}> ${sec.label}</label>`);
  });
  const nb = host.querySelector('#rpNotes');
  SECTIONS.forEach(sec=>{
    const saved = (st.notes && st.notes[sec.key]) || {};
    nb.insertAdjacentHTML('beforeend', `<details style="margin-bottom:8px;"><summary style="cursor:pointer;font-weight:600;font-size:13px;">${sec.label}</summary>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px;margin-top:8px;">
      ${sec.notes.map(n=>`<label style="font-size:12px;">${n}<textarea id="rpN_${sec.key}_${n.replace(/\W/g,'')}" rows="5" style="width:100%;font-family:inherit;font-size:12.5px;">${esc(saved[n]||'')}</textarea></label>`).join('')}
      </div></details>`);
  });
  host.querySelector('#rpGo').onclick = generate;
  host.addEventListener('change', ()=>{ try{ readUI(); }catch(e){} });
  host.addEventListener('input', ()=>{ try{ readUI(); }catch(e){} });
  refreshStatus();
}
function refreshStatus(){
  const el = document.getElementById('rpData'); if(!el) return;
  el.innerHTML = 'Data termuat: ' + dataReady().map(([k,l,n])=> `<span style="margin-right:12px;${n?'':'color:#B42318;'}">${l}: ${n?nf(n)+' baris':'belum ada'}</span>`).join('');
}
window.rekapPptOpen = function(){ buildUI(); refreshStatus(); };
})();
