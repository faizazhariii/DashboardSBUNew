/**
 * BOT UPDATE HARIAN — "Apa yang berubah sejak kemarin?"
 * ---------------------------------------------------------------
 * Tiap hari script ini:
 *  1. Membaca 6 sumber (PT3 TA, PT3 FH, HEM, OLO, MBB, QE) dari spreadsheet utama.
 *  2. Membandingkan dengan snapshot run sebelumnya (tab SNAPSHOT_HARIAN).
 *  3. Mencatat semua perubahan ke tab UPDATE_LOG  -> dibaca halaman "Update Terbaru" di dashboard.
 *  4. Mengirim ringkasan ke Telegram PRIBADI (japri) kamu.
 *
 * Jenis perubahan yang dideteksi per LoP:
 *   GOLIVE  = baru Golive/OA          DROP   = baru Drop
 *   NAIK    = status naik tahap        MUNDUR = status mundur
 *   STATUS  = status berubah (tanpa urutan angka)
 *   KOMIT   = komitmen golive digeser / baru / dihapus
 *   UPDATE  = detail progres bertambah / berubah
 *   BARU    = LoP baru muncul di sheet
 *
 * ================= CARA PASANG =================
 * 1. https://script.google.com -> New project (standalone). Paste seluruh file ini.
 * 2. Isi TELEGRAM_BOT_TOKEN (token bot yang sama dengan bot lain) dan
 *    TELEGRAM_CHAT_ID_PRIBADI di bawah.
 *      - Chat id pribadi: chat ke bot @userinfobot di Telegram -> dia membalas "Id: 123456789".
 *        (Fungsi cariChatId tidak jalan kalau bot punya webhook aktif, seperti bot Golive/Proyeksi.)
 *      - Bot HARUS sudah kamu START (kirim /start ke bot-nya), kalau belum Telegram menolak kirim japri.
 * 3. Run "testCekPerubahan" (izinkan akses Sheets & eksternal saat diminta).
 *    Run PERTAMA hanya menyimpan baseline (belum ada pembanding) dan kirim pesan konfirmasi.
 * 4. Run "pasangTrigger" sekali -> cek perubahan tiap INTERVAL_MENIT menit (hanya LoP yang berubah)
 *    + rangkuman semua perubahan hari ini sekitar jam 20.00 WIB. Pastikan timezone project = Asia/Jakarta
 *    (Project Settings > Time zone).
 * 5. Run kedua dan seterusnya membandingkan dengan run sebelumnya.
 * ---------------------------------------------------------------
 */

const TELEGRAM_BOT_TOKEN       = 'ISI_TOKEN_BOT';
const TELEGRAM_CHAT_ID_PRIBADI = 'ISI_CHAT_ID_PRIBADI';

const SPREADSHEET_ID = '1PGH5LCx2zyFn2ps8J9kJ93tc6KjnLc1Hof1F2SB8DBM';
const INTERVAL_MENIT = 10;           // cek perubahan tiap N menit (boleh: 1, 5, 10, 15, 30)
const JAM_RANGKUMAN = 20;            // rangkuman seluruh perubahan hari ini (sekitar 20.00 WIB)
const JAM_SENYAP_MULAI = 22;         // jam senyap: tidak kirim notifikasi (perubahan tetap tercatat)
const JAM_SENYAP_SELESAI = 6;        // samakan kedua angka ini kalau ingin menonaktifkan
const STALE_DAYS = 25;
const MAX_BARIS_PER_BAGIAN = 12;     // baris per bagian di pesan Telegram
const MAX_LOG_BARIS = 4000;          // log lama dipangkas
const TAB_SNAPSHOT = 'SNAPSHOT_HARIAN';
const TAB_LOG = 'UPDATE_LOG';

/* ---------- Konfigurasi sumber (sama dengan Mini Web / dashboard) ---------- */
function isDropNum_(l){ return /^\s*0\b/.test(l || ''); }
function strip_(l){ return String(l || '').replace(/^\s*\d+(?:\.\d+)*[\.\-\)]?\s*/, '').trim() || String(l || ''); }
const GL_SET_ = ['GOLIVE', 'UJI TERIMA', 'ON AIR', 'REKON'];
const DROP_SET_ = ['DROP', 'PROPOSED DROP', 'APPROVED DROP'];

const SUMBER = [
  { key:'PT3 TA', gid:1041674095, req:'ID-IHLD',
    f:{ id:'ID-IHLD', nama:'NAMA LOP', branch:'BRANCH FMC', status:'Status', komit:'KOMITMEN GOLIVE', detail:'DETAIL STATUS' },
    cat:function(g){ const st = g('Status'); if(isDropNum_(st)) return 'drop'; if(GL_SET_.indexOf(strip_(st).toUpperCase()) >= 0 || g('STATUS GOLIVE').toUpperCase() === 'GOLIVE') return 'golive'; return 'ogp'; } },
  { key:'PT3 FH', gid:745436831, req:'ID-IHLD',
    f:{ id:'ID-IHLD', nama:'NAMA LOP', branch:'BRANCH FMC', status:'Status', komit:'KOMITMEN GOLIVE', detail:'DETAIL STATUS' },
    cat:function(g){ const st = g('Status'); if(isDropNum_(st)) return 'drop'; if(GL_SET_.indexOf(strip_(st).toUpperCase()) >= 0) return 'golive'; return 'ogp'; } },
  { key:'HEM', gid:277538737, req:'IHLD',
    f:{ id:'IHLD', nama:'NAMA LOP', branch:'DISTRICT', status:'Progress Lapangan', komit:'Komitmen Golive', detail:'Detail Progres' },
    cat:function(g){ const s = strip_(g('Progress Lapangan')).toUpperCase(); if(GL_SET_.indexOf(s) >= 0) return 'golive'; if(DROP_SET_.indexOf(s) >= 0) return 'drop'; return 'ogp'; } },
  { key:'OLO', gid:1782023053, req:'IHLD',
    f:{ id:'IHLD', nama:'NAMA PROYEK', branch:'DISTRICT', status:'Progress Lapangan', komit:'Komitmen Golive', detail:'Detail Progres' },
    cat:function(g){ const s = strip_(g('Progress Lapangan')).toUpperCase(); if(GL_SET_.indexOf(s) >= 0) return 'golive'; if(DROP_SET_.indexOf(s) >= 0) return 'drop'; return 'ogp'; } },
  { key:'MBB', gid:264409897, req:'SITE ID',
    f:{ id:'ID', nama:'SITE NAME', branch:'BRANCH', status:'STATUS', komit:'TGL COMMIT OA FIX', detail:'DETIL PROGRESS' },
    cat:function(g){ const m = String(g('STATUS') || '').match(/^\s*(\d+)/); const n = m ? parseInt(m[1], 10) : -1; if(n === 0) return 'drop'; if(n === 6 || n === 7) return 'golive'; return 'ogp'; } },
  { key:'QE', gid:2018392112, req:'NAMA LOP', region:{ col:'REGION', val:'SBU' },
    f:{ id:'ID DIGASSS', nama:'NAMA LOP', branch:'DISTRICT TIF', status:'STATUS PROGRES', komit:null, detail:'DETAIL STATUS' },
    cat:function(g){ const s = strip_(g('STATUS PROGRES')).toUpperCase(); if(s === 'CLOSED') return 'golive'; if(s === 'DROP') return 'drop'; return 'ogp'; } }
];

/* ---------- Util ---------- */
function norm_(s){ return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().toUpperCase(); }
function md5_(s){ return Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, String(s || '')).map(function(b){ return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join(''); }
function esc_(t){ return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function tz_(){ return Session.getScriptTimeZone() || 'Asia/Jakarta'; }
function fmtTgl_(d){ return Utilities.formatDate(d, tz_(), 'yyyy-MM-dd'); }

const MON_ = { jan:0, feb:1, mar:2, apr:3, mei:4, may:4, jun:5, jul:6, agu:7, agt:7, aug:7, sep:8, okt:9, oct:9, nov:10, des:11, dec:11 };
function parseTgl_(str){
  if(!str) return null;
  const p = String(str).trim().split(/[\/\-\s]+/).filter(Boolean);
  if(p.length === 2 && /^\d{1,2}$/.test(p[0]) && isNaN(parseInt(p[1])) && MON_[p[1].slice(0, 3).toLowerCase()] !== undefined) p.push(String(new Date().getFullYear()));
  if(p.length !== 3) return null;
  let d = p[0], m = p[1], y = p[2];
  if(isNaN(parseInt(m))){ const mi = MON_[m.slice(0, 3).toLowerCase()]; if(mi === undefined) return null; let yr = parseInt(y); if(y.length === 2) yr += 2000; const dt = new Date(yr, mi, parseInt(d)); return isNaN(dt) ? null : dt; }
  if(y.length === 2) y = '20' + y;
  const dt = new Date(parseInt(y), parseInt(m) - 1, parseInt(d)); return isNaN(dt) ? null : dt;
}
function lastUpdate_(text){
  if(!text) return null; const now = new Date(); now.setHours(0, 0, 0, 0); let latest = null, m;
  const re = /\(?\b(\d{1,2})\s*[\/\-]\s*(\d{1,2})\)?/g;
  while((m = re.exec(text)) !== null){
    const day = +m[1], mon = +m[2]; if(day < 1 || day > 31 || mon < 1 || mon > 12) continue;
    let d = new Date(now.getFullYear(), mon - 1, day); if(d > now) d = new Date(now.getFullYear() - 1, mon - 1, day);
    if(!latest || d > latest) latest = d;
  }
  return latest;
}
const HARI_PENDEK_ = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const BLN_PENDEK_ = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
/** Nilai sel (teks / Date) -> Date atau null. */
function keDate_(v){
  if(v instanceof Date) return isNaN(v) ? null : v;
  if(v === '' || v == null) return null;
  const d = parseTgl_(v); if(d) return d;
  const t = new Date(v); return isNaN(t) ? null : t;
}
/** Kunci pembanding komitmen: yyyy-MM-dd (format teks berbeda tidak dianggap berubah). */
function komitKey_(v){ const d = keDate_(v); return d ? Utilities.formatDate(d, tz_(), 'yyyy-MM-dd') : norm_(v); }
/** Tampilan tanggal ringkas & mudah dibaca: "Kam, 26 Nov" (tahun hanya jika bukan tahun ini). */
function fmtTglPendek_(v){
  const d = keDate_(v); if(!d) return v ? String(v) : '—';
  const thn = d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : '';
  return HARI_PENDEK_[d.getDay()] + ', ' + d.getDate() + ' ' + BLN_PENDEK_[d.getMonth()] + thn;
}
function selisihHari_(a, b){ const x = keDate_(a), y = keDate_(b); if(!x || !y) return null; const ux = Date.UTC(x.getFullYear(), x.getMonth(), x.getDate()), uy = Date.UTC(y.getFullYear(), y.getMonth(), y.getDate()); return Math.round((uy - ux) / 86400000); }
function nomorStatus_(raw){ const m = String(raw || '').match(/^\s*(\d+(?:\.\d+)?)/); return m ? parseFloat(m[1]) : null; }

/* ---------- Baca satu sumber -> array record ---------- */
function bacaSumber_(ss, src){
  const sh = ss.getSheets().filter(function(s){ return s.getSheetId() === src.gid; })[0];
  if(!sh) throw new Error('Tab gid ' + src.gid + ' tidak ditemukan');
  const data = sh.getDataRange().getDisplayValues();
  const hi = data.findIndex(function(r){ return r.some(function(c){ return norm_(c) === norm_(src.req); }); });
  if(hi < 0) throw new Error('Header "' + src.req + '" tidak ditemukan');
  const map = {}; data[hi].forEach(function(h, i){ const k = norm_(h); if(!(k in map)) map[k] = i; });
  const out = [];
  data.slice(hi + 1).forEach(function(row){
    const g = function(n){ const i = map[norm_(n)]; return i === undefined ? '' : String(row[i] || '').trim(); };
    if(src.region && g(src.region.col).toUpperCase() !== src.region.val) return;
    const id = g(src.f.id), nama = g(src.f.nama); if(!id && !nama) return;
    out.push({ key: src.key + '|' + (id || nama), src: src.key, id: id, nama: nama || '(tanpa nama)', branch: g(src.f.branch),
      status: g(src.f.status), komit: src.f.komit ? g(src.f.komit) : '', detail: g(src.f.detail), cat: src.cat(g) });
  });
  return out;
}

/* ---------- Snapshot ---------- */
function ambilTab_(ss, nama, header){
  let sh = ss.getSheetByName(nama);
  if(!sh){ sh = ss.insertSheet(nama); sh.setFrozenRows(1); }
  const cur = sh.getRange(1, 1, 1, header.length).getValues()[0];
  if(cur.join('|') !== header.join('|')) sh.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold');
  return sh;
}
const HDR_SNAP = ['key', 'src', 'id', 'nama', 'branch', 'status', 'komit', 'cat', 'detail_hash', 'detail_awal', 'tanggal'];
const HDR_LOG = ['tanggal', 'src', 'id', 'nama', 'branch', 'jenis', 'dari', 'ke', 'catatan', 'dari_raw', 'ke_raw'];

function bacaSnapshot_(ss){
  const sh = ss.getSheetByName(TAB_SNAPSHOT); const map = {}; let ada = false;
  if(!sh || sh.getLastRow() < 2) return { map: map, ada: false };
  sh.getRange(2, 1, sh.getLastRow() - 1, HDR_SNAP.length).getDisplayValues().forEach(function(r){
    map[r[0]] = { src: r[1], id: r[2], nama: r[3], branch: r[4], status: r[5], komit: r[6], cat: r[7], hash: r[8], awal: r[9] }; ada = true;
  });
  return { map: map, ada: ada };
}

/* ---------- Deteksi perubahan ---------- */
function norm0_(v){ return String(v == null ? '' : v); }
function bandingkan_(lama, baru){
  const hasil = [];
  const tambah = function(r, jenis, dari, ke, cat){ const o = { src: r.src, id: r.id, nama: r.nama, branch: r.branch, jenis: jenis, dari: dari || '', ke: ke || '', catatan: cat || '', dr: '', kr: '' }; hasil.push(o); return o; };
  baru.forEach(function(r){
    const o = lama[r.key]; const o0 = o || {};
    const awalBaru = String(r.detail || '').replace(/\s+/g, ' ').slice(0, 160);
    if(!o){ tambah(r, 'BARU', '', strip_(r.status), awalBaru); return; }
    const jenisList = [];
    if(o.cat !== 'golive' && r.cat === 'golive') jenisList.push(['GOLIVE', strip_(o.status), strip_(r.status), '']);
    else if(o.cat !== 'drop' && r.cat === 'drop') jenisList.push(['DROP', strip_(o.status), strip_(r.status), '']);
    else if(norm_(o.status) !== norm_(r.status)){
      const a = nomorStatus_(o.status), b = nomorStatus_(r.status);
      const jns = (a !== null && b !== null) ? (b > a ? 'NAIK' : (b < a ? 'MUNDUR' : 'STATUS')) : 'STATUS';
      jenisList.push([jns, strip_(o.status), strip_(r.status), '']);
    }
    if(komitKey_(o.komit) !== komitKey_(r.komit)){
      const sel = selisihHari_(o.komit, r.komit);
      const ket = !o.komit ? 'komitmen baru' : (!r.komit ? 'komitmen dihapus' : (sel === null ? 'komitmen digeser' : (sel > 0 ? 'mundur ' + sel + ' hari' : 'dimajukan ' + Math.abs(sel) + ' hari')));
      jenisList.push(['KOMIT', o.komit ? fmtTglPendek_(o.komit) : '—', r.komit ? fmtTglPendek_(r.komit) : '—', ket]);
    }
    if(md5_(r.detail) !== o.hash){
      jenisList.push(['UPDATE', '', '', awalBaru]);
    }
    jenisList.forEach(function(j){ const ob = tambah(r, j[0], j[1], j[2], j[3] || (j[0] === 'GOLIVE' || j[0] === 'DROP' || j[0] === 'NAIK' || j[0] === 'MUNDUR' || j[0] === 'STATUS' ? awalBaru : '')); if(j[0] === 'KOMIT'){ ob.dr = norm0_(o0.komit); ob.kr = norm0_(r.komit); } });
  });
  return hasil;
}

/* ---------- Tulis snapshot + log ---------- */
function tulisSnapshot_(ss, records, sumberGagal, snapLama){
  const sh = ambilTab_(ss, TAB_SNAPSHOT, HDR_SNAP);
  const tgl = fmtTgl_(new Date());
  const rows = records.map(function(r){ return [r.key, r.src, r.id, r.nama, r.branch, r.status, r.komit, r.cat, md5_(r.detail), String(r.detail || '').replace(/\s+/g, ' ').slice(0, 160), tgl]; });
  // sumber yang gagal dibaca: pertahankan baris lama supaya besok tidak muncul "perubahan palsu"
  Object.keys(snapLama).forEach(function(k){
    const o = snapLama[k]; if(sumberGagal.indexOf(o.src) >= 0) rows.push([k, o.src, o.id, o.nama, o.branch, o.status, o.komit, o.cat, o.hash, o.awal, tgl]);
  });
  sh.getRange(1, 1, sh.getMaxRows(), HDR_SNAP.length).setNumberFormat('@');
  sh.getRange(2, 1, Math.max(sh.getMaxRows() - 1, 1), HDR_SNAP.length).clearContent();
  if(rows.length){
    if(sh.getMaxRows() < rows.length + 1) sh.insertRowsAfter(sh.getMaxRows(), rows.length + 1 - sh.getMaxRows());
    sh.getRange(2, 1, rows.length, HDR_SNAP.length).setValues(rows);
  }
}
function tulisLog_(ss, perubahan){
  if(!perubahan.length) return;
  const sh = ambilTab_(ss, TAB_LOG, HDR_LOG), tgl = fmtTgl_(new Date());
  sh.getRange(1, 1, sh.getMaxRows(), HDR_LOG.length).setNumberFormat('@');
  const rows = perubahan.map(function(p){ return [tgl, p.src, p.id, p.nama, p.branch, p.jenis, p.dari, p.ke, p.catatan, p.dr || '', p.kr || '']; });
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, HDR_LOG.length).setValues(rows);
  const lebih = sh.getLastRow() - 1 - MAX_LOG_BARIS;
  if(lebih > 0) sh.deleteRows(2, lebih);
}

/* ---------- Pesan Telegram ---------- */
function kirimTelegram_(teks){
  const potong = []; let cur = '', buka = false;
  teks.split('\n').forEach(function(l){
    if((cur + '\n' + l).length > 3700){ potong.push(cur + (buka ? '</pre>' : '')); cur = buka ? '<pre>' : ''; }
    cur += (cur ? '\n' : '') + l;
    if(l.indexOf('<pre>') >= 0) buka = true;
    if(l.indexOf('</pre>') >= 0) buka = false;
  });
  if(cur) potong.push(cur);
  potong.forEach(function(t){
    const res = UrlFetchApp.fetch('https://api.telegram.org/bot' + TELEGRAM_BOT_TOKEN + '/sendMessage', {
      method: 'post', muteHttpExceptions: true, contentType: 'application/json',
      payload: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID_PRIBADI, text: t, parse_mode: 'HTML', disable_web_page_preview: true })
    });
    if(res.getResponseCode() !== 200) throw new Error('Telegram gagal: ' + res.getContentText());
  });
}
const HARI_ = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MAX_LOP_REALTIME = 25;
const GARIS_ = '━━━━━━━━━━━━━━━━━━';
const SRC_SINGKAT_ = { 'PT3 TA':'TA', 'PT3 FH':'FH', 'HEM':'HEM', 'OLO':'OLO', 'MBB':'MBB', 'QE':'QE' };

function kartu_(p, baris){
  let t = '▸ <b>' + esc_(SRC_SINGKAT_[p.src] || p.src) + '</b> · <code>' + esc_(p.id) + '</code>\n   ' + esc_(p.nama).slice(0, 52);
  (baris || []).forEach(function(b){ t += '\n   ' + b; });
  return t + '\n';
}

function susunPesan_(perubahan, records, baseline, opsi){
  opsi = opsi || { judul: 'UPDATE ORDER', sub: 'sejak run sebelumnya', kondisi: true };
  const now = new Date();
  const jam = Utilities.formatDate(now, tz_(), 'HH.mm');
  let t = '📊 <b>' + opsi.judul + '</b>\n🗓 ' + HARI_[now.getDay()] + ', ' + now.getDate() + ' ' + BLN_PENDEK_[now.getMonth()] + ' ' + now.getFullYear() + ' · ' + jam + ' WIB\n' + GARIS_ + '\n';
  if(baseline){ return t + 'Baseline pertama tersimpan.\n' + records.length + ' LoP dari ' + SUMBER.length + ' sumber.\nPerbandingan mulai dikirim pada run berikutnya.'; }
  const per = function(j){ return perubahan.filter(function(p){ return p.jenis === j; }); };
  const jml = function(j){ return per(j).length; };
  const lopUnik = {}; perubahan.forEach(function(p){ lopUnik[p.src + '|' + p.id] = 1; });
  t += '<b>' + Object.keys(lopUnik).length + ' LoP berubah</b> ' + opsi.sub + '\n\n';
  t += '🟢 Golive <b>' + jml('GOLIVE') + '</b>  ·  🔴 Drop <b>' + jml('DROP') + '</b>\n';
  t += '🔼 Naik <b>' + jml('NAIK') + '</b>  ·  🔽 Mundur <b>' + jml('MUNDUR') + '</b>\n';
  t += '⏰ Komitmen <b>' + jml('KOMIT') + '</b>  ·  📝 Update <b>' + jml('UPDATE') + '</b>  ·  🆕 Baru <b>' + jml('BARU') + '</b>\n';

  const judul = function(ic, nama, n){ return '\n' + GARIS_ + '\n' + ic + ' <b>' + nama + ' (' + n + ')</b>\n\n'; };
  const lebih = function(a){ return a.length > MAX_BARIS_PER_BAGIAN ? '… +' + (a.length - MAX_BARIS_PER_BAGIAN) + ' lainnya, lihat dashboard › Update Terbaru\n' : ''; };
  const bagian = function(ic, nama, jenis, fmt){
    const a = per(jenis); if(!a.length) return '';
    let s = judul(ic, nama, a.length);
    a.slice(0, MAX_BARIS_PER_BAGIAN).forEach(function(p){ s += fmt(p); });
    return s + lebih(a);
  };
  t += bagian('🟢', 'GOLIVE BARU', 'GOLIVE', function(p){ return kartu_(p, [esc_(p.dari) + ' → <b>' + esc_(p.ke) + '</b>']); });
  t += bagian('🔴', 'DROP BARU', 'DROP', function(p){ return kartu_(p, [esc_(p.dari) + ' → <b>' + esc_(p.ke) + '</b>']); });
  t += bagian('🔼', 'NAIK TAHAP', 'NAIK', function(p){ return kartu_(p, [esc_(p.dari) + ' → <b>' + esc_(p.ke) + '</b>']); });
  t += bagian('🔽', 'MUNDUR TAHAP', 'MUNDUR', function(p){ return kartu_(p, [esc_(p.dari) + ' → <b>' + esc_(p.ke) + '</b>']); });

  // komitmen: ringkasan arah + per sumber + yang paling jauh bergeser
  const km = per('KOMIT');
  if(km.length){
    const geser = function(p){ const m = String(p.catatan).match(/(mundur|dimajukan) (\d+)/); return m ? (m[1] === 'mundur' ? +m[2] : -m[2]) : 0; };
    const mundur = km.filter(function(p){ return /^mundur/.test(p.catatan); }).length;
    const maju = km.filter(function(p){ return /^dimajukan/.test(p.catatan); }).length;
    const baru = km.filter(function(p){ return p.catatan === 'komitmen baru'; }).length;
    const hapus = km.filter(function(p){ return p.catatan === 'komitmen dihapus'; }).length;
    t += judul('⏰', 'KOMITMEN BERUBAH', km.length);
    t += '↗️ Mundur <b>' + mundur + '</b> · ↘️ Dimajukan <b>' + maju + '</b> · ➕ Baru <b>' + baru + '</b> · ➖ Dihapus <b>' + hapus + '</b>\n';
    const bySrc = {}; km.forEach(function(p){ bySrc[p.src] = (bySrc[p.src] || 0) + 1; });
    t += Object.keys(bySrc).map(function(k){ return esc_(SRC_SINGKAT_[k] || k) + ' ' + bySrc[k]; }).join(' · ') + '\n\n';
    const top = km.slice().sort(function(a, b){ return Math.abs(geser(b)) - Math.abs(geser(a)); }).slice(0, MAX_BARIS_PER_BAGIAN);
    top.forEach(function(p){ t += kartu_(p, ['📅 ' + esc_(p.dari) + ' → <b>' + esc_(p.ke) + '</b>', '<i>' + esc_(p.catatan) + '</i>']); });
    t += (km.length > top.length ? '… +' + (km.length - top.length) + ' lainnya, lihat dashboard › Update Terbaru\n' : '');
  }
  const upd = per('UPDATE');
  if(upd.length){
    t += judul('📝', 'UPDATE BARU', upd.length);
    upd.slice(0, MAX_BARIS_PER_BAGIAN).forEach(function(p){ t += kartu_(p, ['<i>' + esc_(String(p.catatan).slice(0, 90)) + '</i>']); });
    t += lebih(upd);
  }
  t += bagian('🆕', 'LoP BARU', 'BARU', function(p){ return kartu_(p, [esc_(p.ke)]); });
  if(!perubahan.length) t += '\nTidak ada perubahan.\n';
  if(!opsi.kondisi) return t;


  const t0 = new Date(); t0.setHours(0, 0, 0, 0);
  const ogp = records.filter(function(r){ return r.cat === 'ogp'; });
  const terlewat = ogp.filter(function(r){ const d = keDate_(r.komit); return d && d < t0; });
  const basi = ogp.filter(function(r){ const d = lastUpdate_(r.detail); return d && Math.round((t0 - d) / 86400000) > STALE_DAYS; });
  t += '\n⚠ <b>KONDISI SAAT INI</b>\n⏰ Komitmen terlewat: <b>' + terlewat.length + '</b>\n⏱ Belum update &gt;' + STALE_DAYS + ' hari: <b>' + basi.length + '</b>';
  return t;
}

const IKON_JENIS_ = { GOLIVE:'🟢', DROP:'🔴', NAIK:'🔼', MUNDUR:'🔽', KOMIT:'⏰', UPDATE:'📝', BARU:'🆕', STATUS:'🔄' };
const NAMA_JENIS_ = { GOLIVE:'GOLIVE', DROP:'DROP', NAIK:'NAIK TAHAP', MUNDUR:'MUNDUR TAHAP', KOMIT:'KOMITMEN', UPDATE:'UPDATE DETAIL', BARU:'LoP BARU', STATUS:'STATUS' };
/** Laporan real-time: tiap LoP satu kartu, semua perubahannya digabung, tanpa ringkasan/kondisi. */
function susunRealtime_(perubahan){
  const now = new Date();
  const jam = Utilities.formatDate(now, tz_(), 'HH.mm');
  const grup = {}, urut = [];
  perubahan.forEach(function(p){ const k = p.src + '|' + p.id; if(!grup[k]){ grup[k] = []; urut.push(k); } grup[k].push(p); });
  let t = '🔔 <b>PERUBAHAN LoP</b>  ·  ' + jam + ' WIB\n<b>' + urut.length + ' LoP</b> baru berubah\n';
  urut.slice(0, MAX_LOP_REALTIME).forEach(function(k){
    const l = grup[k], p0 = l[0];
    t += '\n' + GARIS_ + '\n<b>' + esc_(SRC_SINGKAT_[p0.src] || p0.src) + '</b> · <code>' + esc_(p0.id) + '</code>';
    if(p0.branch) t += ' · ' + esc_(String(p0.branch).slice(0, 18));
    t += '\n' + esc_(String(p0.nama || '').replace(/\s+/g, ' ').slice(0, 60)) + '\n';
    l.forEach(function(p){
      const ic = IKON_JENIS_[p.jenis] || '•', nm = NAMA_JENIS_[p.jenis] || p.jenis;
      if(p.jenis === 'KOMIT') t += '\n' + ic + ' <b>' + nm + '</b>\n    ' + esc_(p.dari) + ' → <b>' + esc_(p.ke) + '</b>  <i>(' + esc_(p.catatan) + ')</i>\n';
      else if(p.jenis === 'UPDATE') t += '\n' + ic + ' <b>' + nm + '</b>\n    <i>' + esc_(String(p.catatan).slice(0, 110)) + '</i>\n';
      else if(p.jenis === 'BARU') t += '\n' + ic + ' <b>' + nm + '</b>\n    ' + esc_(p.ke) + '\n';
      else t += '\n' + ic + ' <b>' + nm + '</b>\n    ' + esc_(p.dari) + ' → <b>' + esc_(p.ke) + '</b>\n';
    });
  });
  if(urut.length > MAX_LOP_REALTIME) t += '\n' + GARIS_ + '\n… +' + (urut.length - MAX_LOP_REALTIME) + ' LoP lainnya, lihat dashboard › Update Terbaru\n';
  return t;
}


/* ---------- Fungsi utama ---------- */
function bacaSemua_(ss){
  let records = [], gagal = [];
  SUMBER.forEach(function(s){
    try{ const r = bacaSumber_(ss, s); if(!r.length) throw new Error('0 baris'); records = records.concat(r); }
    catch(e){ gagal.push(s.key); Logger.log('GAGAL ' + s.key + ': ' + e.message); }
  });
  return { records: records, gagal: gagal };
}
function jamSenyap_(){
  if(JAM_SENYAP_MULAI === JAM_SENYAP_SELESAI) return false;
  const h = Number(Utilities.formatDate(new Date(), tz_(), 'H'));
  return JAM_SENYAP_MULAI > JAM_SENYAP_SELESAI ? (h >= JAM_SENYAP_MULAI || h < JAM_SENYAP_SELESAI) : (h >= JAM_SENYAP_MULAI && h < JAM_SENYAP_SELESAI);
}

/** Bandingkan sekarang vs snapshot, catat ke log, kirim laporan LoP yang berubah saja. */
function cekPerubahan_(kirim, abaikanSenyap){
  const lock = LockService.getScriptLock();
  if(!lock.tryLock(20000)){ Logger.log('Masih ada proses lain, dilewati'); return -1; }
  try{
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const lama = bacaSnapshot_(ss), data = bacaSemua_(ss);
    const per = lama.ada ? bandingkan_(lama.map, data.records) : [];
    if(!lama.ada){
      tulisSnapshot_(ss, data.records, data.gagal, lama.map);
      if(kirim && abaikanSenyap) kirimTelegram_(susunPesan_([], data.records, true));
      return 0;
    }
    // jam senyap: laporan ditahan (snapshot tidak di-update, jadi terkirim saat jam senyap berakhir)
    if(!abaikanSenyap && jamSenyap_() && per.length) return -2;
    if(per.length) tulisLog_(ss, per);
    tulisSnapshot_(ss, data.records, data.gagal, lama.map);
    if(per.length){
      let pesan = susunRealtime_(per);
      if(data.gagal.length) pesan += '\n⚠ Sumber gagal dibaca: ' + data.gagal.join(', ');
      if(kirim) kirimTelegram_(pesan); else Logger.log(pesan);
    }
    return per.length;
  } finally { lock.releaseLock(); }
}
/** TRIGGER tiap N menit: kirim hanya kalau ada LoP yang berubah. */
function cekPerubahan(){ cekPerubahan_(true, false); }

/* ---------- Rangkuman malam: gabungan perubahan hari ini dari UPDATE_LOG ---------- */
function perubahanHariIni_(ss){
  const sh = ss.getSheetByName(TAB_LOG); if(!sh || sh.getLastRow() < 2) return [];
  const tgl = fmtTgl_(new Date());
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, HDR_LOG.length).getDisplayValues().filter(function(r){ return String(r[0]).slice(0, 10) === tgl; });
  const gab = {}, urut = [];
  rows.forEach(function(r){
    const p = { src: r[1], id: r[2], nama: r[3], branch: r[4], jenis: String(r[5]).toUpperCase(), dari: r[6], ke: r[7], catatan: r[8], dr: r[9], kr: r[10] };
    const k = p.src + '|' + p.id + '|' + p.jenis;
    if(!gab[k]){ gab[k] = p; urut.push(k); return; }
    const g = gab[k];                       // gabung: dari = paling awal, ke = paling akhir
    g.ke = p.ke; g.catatan = p.catatan;
    if(p.jenis === 'KOMIT'){
      g.kr = p.kr;
      const sel = selisihHari_(g.dr, g.kr);
      g.dari = g.dr ? fmtTglPendek_(g.dr) : '—'; g.ke = g.kr ? fmtTglPendek_(g.kr) : '—';
      g.catatan = !g.dr ? 'komitmen baru' : (!g.kr ? 'komitmen dihapus' : (sel === null ? 'komitmen digeser' : (sel > 0 ? 'mundur ' + sel + ' hari' : (sel < 0 ? 'dimajukan ' + Math.abs(sel) + ' hari' : 'kembali ke semula'))));
    }
  });
  return urut.map(function(k){ return gab[k]; }).filter(function(p){ return !(p.jenis === 'KOMIT' && p.catatan === 'kembali ke semula'); });
}
function rangkumanMalam_(kirim){
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const data = bacaSemua_(ss), per = perubahanHariIni_(ss);
  let pesan = susunPesan_(per, data.records, false, { judul: 'RANGKUMAN HARI INI', sub: 'berubah sepanjang hari ini', kondisi: true });
  if(data.gagal.length) pesan += '\n\n⚠ Sumber gagal dibaca: ' + data.gagal.join(', ');
  if(kirim) kirimTelegram_(pesan); else Logger.log(pesan);
}
/** TRIGGER harian sekitar jam 20.00. */
function kirimRangkumanMalam(){ rangkumanMalam_(true); }

/** Coba manual. */
function testCekPerubahan(){ cekPerubahan_(true, true); }
function testRangkumanMalam(){ rangkumanMalam_(true); }
function testTanpaKirim(){ cekPerubahan_(false, true); }

/** Pasang semua trigger (jalankan sekali). */
function pasangTrigger(){
  const hapus = ['cekPerubahan', 'kirimRangkumanMalam', 'kirimDigestHarian'];
  ScriptApp.getProjectTriggers().forEach(function(t){ if(hapus.indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('cekPerubahan').timeBased().everyMinutes(INTERVAL_MENIT).create();
  ScriptApp.newTrigger('kirimRangkumanMalam').timeBased().everyDays(1).atHour(JAM_RANGKUMAN).nearMinute(0).create();
  Logger.log('Terpasang: cekPerubahan tiap ' + INTERVAL_MENIT + ' menit; rangkuman tiap hari sekitar ' + JAM_RANGKUMAN + ':00. Jam senyap ' + JAM_SENYAP_MULAI + '-' + JAM_SENYAP_SELESAI);
}
function pasangTriggerHarian(){ pasangTrigger(); }
function lihatTrigger(){ ScriptApp.getProjectTriggers().forEach(function(t){ Logger.log(t.getHandlerFunction() + ' · ' + t.getEventType()); }); }

/** Hapus snapshot (run berikutnya jadi baseline baru). */
function resetSnapshot(){
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID), sh = ss.getSheetByName(TAB_SNAPSHOT);
  if(sh && sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, HDR_SNAP.length).clearContent();
}
/** Bantu cari chat id pribadi: kirim /start ke bot dulu, lalu run ini. */
function cariChatId(){
  const res = UrlFetchApp.fetch('https://api.telegram.org/bot' + TELEGRAM_BOT_TOKEN + '/getUpdates', { muteHttpExceptions: true });
  const j = JSON.parse(res.getContentText());
  (j.result || []).forEach(function(u){ const m = u.message || u.edited_message; if(m && m.chat && m.chat.type === 'private') Logger.log('Chat id: ' + m.chat.id + ' (' + (m.from.first_name || '') + ')'); });
  if(!(j.result || []).length) Logger.log('Belum ada pesan. Kirim /start ke bot dulu. Catatan: jika ada webhook aktif, getUpdates kosong — pakai @userinfobot untuk lihat id.');
}

/** Hapus baris UPDATE_LOG tanggal hari ini (kalau ada run yang salah). Setelah itu jalankan resetSnapshot lalu testCekPerubahan. */
function bersihkanLogHariIni(){
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID), sh = ss.getSheetByName(TAB_LOG); if(!sh || sh.getLastRow() < 2) return;
  const tgl = fmtTgl_(new Date()), vals = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getDisplayValues();
  for(let i = vals.length - 1; i >= 0; i--){ if(String(vals[i][0]).slice(0, 10) === tgl) sh.deleteRow(i + 2); }
}
