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
 * 3. Run "testDigestSekarang" (izinkan akses Sheets & eksternal saat diminta).
 *    Run PERTAMA hanya menyimpan baseline (belum ada pembanding) dan kirim pesan konfirmasi.
 * 4. Run "pasangTriggerHarian" sekali -> jadwal otomatis tiap hari jam 07.xx WIB.
 *    (Kalau mau jam lain, ubah JAM_KIRIM.) Pastikan timezone project = Asia/Jakarta
 *    (Project Settings > Time zone).
 * 5. Run kedua dan seterusnya membandingkan dengan run sebelumnya.
 * ---------------------------------------------------------------
 */

const TELEGRAM_BOT_TOKEN       = 'ISI_TOKEN_BOT';
const TELEGRAM_CHAT_ID_PRIBADI = 'ISI_CHAT_ID_PRIBADI';

const SPREADSHEET_ID = '1PGH5LCx2zyFn2ps8J9kJ93tc6KjnLc1Hof1F2SB8DBM';
const JAM_KIRIM = 7;                 // 07.00-08.00 WIB
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
  if(!sh){ sh = ss.insertSheet(nama); sh.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold'); sh.setFrozenRows(1); }
  return sh;
}
const HDR_SNAP = ['key', 'src', 'id', 'nama', 'branch', 'status', 'komit', 'cat', 'detail_hash', 'detail_awal', 'tanggal'];
const HDR_LOG = ['tanggal', 'src', 'id', 'nama', 'branch', 'jenis', 'dari', 'ke', 'catatan'];

function bacaSnapshot_(ss){
  const sh = ss.getSheetByName(TAB_SNAPSHOT); const map = {}; let ada = false;
  if(!sh || sh.getLastRow() < 2) return { map: map, ada: false };
  sh.getRange(2, 1, sh.getLastRow() - 1, HDR_SNAP.length).getValues().forEach(function(r){
    map[r[0]] = { src: r[1], id: r[2], nama: r[3], branch: r[4], status: r[5], komit: r[6], cat: r[7], hash: r[8], awal: r[9] }; ada = true;
  });
  return { map: map, ada: ada };
}

/* ---------- Deteksi perubahan ---------- */
function bandingkan_(lama, baru){
  const hasil = [];
  const tambah = function(r, jenis, dari, ke, cat){ hasil.push({ src: r.src, id: r.id, nama: r.nama, branch: r.branch, jenis: jenis, dari: dari || '', ke: ke || '', catatan: cat || '' }); };
  baru.forEach(function(r){
    const o = lama[r.key];
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
    if(norm_(o.komit) !== norm_(r.komit)){
      const ket = !o.komit ? 'komitmen baru' : (!r.komit ? 'komitmen dihapus' : 'komitmen digeser');
      jenisList.push(['KOMIT', o.komit || '—', r.komit || '—', ket]);
    }
    if(md5_(r.detail) !== o.hash){
      jenisList.push(['UPDATE', '', '', awalBaru]);
    }
    jenisList.forEach(function(j){ tambah(r, j[0], j[1], j[2], j[3] || (j[0] === 'GOLIVE' || j[0] === 'DROP' || j[0] === 'NAIK' || j[0] === 'MUNDUR' || j[0] === 'STATUS' ? awalBaru : '')); });
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
  sh.getRange(2, 1, Math.max(sh.getMaxRows() - 1, 1), HDR_SNAP.length).clearContent();
  if(rows.length){
    if(sh.getMaxRows() < rows.length + 1) sh.insertRowsAfter(sh.getMaxRows(), rows.length + 1 - sh.getMaxRows());
    sh.getRange(2, 1, rows.length, HDR_SNAP.length).setValues(rows);
  }
}
function tulisLog_(ss, perubahan){
  if(!perubahan.length) return;
  const sh = ambilTab_(ss, TAB_LOG, HDR_LOG), tgl = fmtTgl_(new Date());
  const rows = perubahan.map(function(p){ return ["'" + tgl, p.src, p.id, p.nama, p.branch, p.jenis, p.dari, p.ke, p.catatan]; });
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, HDR_LOG.length).setValues(rows);
  sh.getRange(2, 1, sh.getLastRow() - 1, 1).setNumberFormat('@');
  const lebih = sh.getLastRow() - 1 - MAX_LOG_BARIS;
  if(lebih > 0) sh.deleteRows(2, lebih);
}

/* ---------- Pesan Telegram ---------- */
function kirimTelegram_(teks){
  const potong = []; let cur = '';
  teks.split('\n').forEach(function(l){ if((cur + '\n' + l).length > 3800){ potong.push(cur); cur = l; } else cur += (cur ? '\n' : '') + l; });
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
const BLN_ = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
function baris_(p){ return '• <b>' + esc_(p.src) + '</b> · <code>' + esc_(p.id) + '</code> · ' + esc_(p.nama).slice(0, 48); }

function susunPesan_(perubahan, records, baseline){
  const now = new Date();
  let t = '📊 <b>UPDATE ORDER — ' + HARI_[now.getDay()] + ', ' + now.getDate() + ' ' + BLN_[now.getMonth()] + ' ' + now.getFullYear() + '</b>\n';
  if(baseline){ return t + '\nBaseline pertama tersimpan (' + records.length + ' LoP dari ' + SUMBER.length + ' sumber).\nPerbandingan mulai dikirim pada run berikutnya.'; }
  const per = function(j){ return perubahan.filter(function(p){ return p.jenis === j; }); };
  const jml = function(j){ return per(j).length; };
  const lopUnik = {}; perubahan.forEach(function(p){ lopUnik[p.src + '|' + p.id] = 1; });
  t += 'Dibanding run sebelumnya · <b>' + Object.keys(lopUnik).length + '</b> LoP berubah\n';
  t += '\n🟢 Golive ' + jml('GOLIVE') + '  🔴 Drop ' + jml('DROP') + '  🔼 Naik ' + jml('NAIK') + '  🔽 Mundur ' + jml('MUNDUR') + '\n⏰ Komit berubah ' + jml('KOMIT') + '  📝 Update baru ' + jml('UPDATE') + '  🆕 LoP baru ' + jml('BARU') + '\n';
  const bagian = function(judul, jenis, fmt){
    const a = per(jenis); if(!a.length) return '';
    let s = '\n<b>' + judul + ' (' + a.length + ')</b>\n';
    a.slice(0, MAX_BARIS_PER_BAGIAN).forEach(function(p){ s += fmt(p) + '\n'; });
    if(a.length > MAX_BARIS_PER_BAGIAN) s += '… dan ' + (a.length - MAX_BARIS_PER_BAGIAN) + ' lainnya (lihat dashboard)\n';
    return s;
  };
  t += bagian('🟢 GOLIVE BARU', 'GOLIVE', baris_);
  t += bagian('🔴 DROP BARU', 'DROP', baris_);
  t += bagian('🔼 NAIK TAHAP', 'NAIK', function(p){ return baris_(p) + '\n   ' + esc_(p.dari) + ' → <b>' + esc_(p.ke) + '</b>'; });
  t += bagian('🔽 MUNDUR', 'MUNDUR', function(p){ return baris_(p) + '\n   ' + esc_(p.dari) + ' → <b>' + esc_(p.ke) + '</b>'; });
  t += bagian('⏰ KOMITMEN BERUBAH', 'KOMIT', function(p){ return baris_(p) + '\n   ' + esc_(p.dari) + ' → <b>' + esc_(p.ke) + '</b> (' + esc_(p.catatan) + ')'; });
  const upd = per('UPDATE');
  if(upd.length){
    t += '\n<b>📝 UPDATE BARU (' + upd.length + ')</b>\n';
    upd.slice(0, MAX_BARIS_PER_BAGIAN).forEach(function(p){ t += baris_(p) + '\n   <i>' + esc_(String(p.catatan).slice(0, 90)) + '</i>\n'; });
    if(upd.length > MAX_BARIS_PER_BAGIAN) t += '… dan ' + (upd.length - MAX_BARIS_PER_BAGIAN) + ' lainnya\n';
  }
  t += bagian('🆕 LoP BARU', 'BARU', baris_);
  if(!perubahan.length) t += '\nTidak ada perubahan sejak run sebelumnya.\n';

  // kondisi saat ini
  const t0 = new Date(); t0.setHours(0, 0, 0, 0);
  const ogp = records.filter(function(r){ return r.cat === 'ogp'; });
  const terlewat = ogp.filter(function(r){ const d = parseTgl_(r.komit); return d && d < t0; });
  const basi = ogp.filter(function(r){ const d = lastUpdate_(r.detail); return d && Math.round((t0 - d) / 86400000) > STALE_DAYS; });
  t += '\n<b>⚠ Kondisi saat ini</b>\n⏰ Komitmen terlewat: <b>' + terlewat.length + '</b> · ⏱ Belum update &gt;' + STALE_DAYS + ' hari: <b>' + basi.length + '</b>';
  return t;
}

/* ---------- Fungsi utama ---------- */
function jalankanDigest_(kirim){
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const lama = bacaSnapshot_(ss);
  let records = [], gagal = [];
  SUMBER.forEach(function(s){
    try{ const r = bacaSumber_(ss, s); if(!r.length) throw new Error('0 baris'); records = records.concat(r); }
    catch(e){ gagal.push(s.key); Logger.log('GAGAL ' + s.key + ': ' + e.message); }
  });
  // LoP dari sumber yang gagal tidak dibandingkan
  const perbandingan = lama.ada ? bandingkan_(lama.map, records) : [];
  if(lama.ada) tulisLog_(ss, perbandingan);
  tulisSnapshot_(ss, records, gagal, lama.map);
  let pesan = susunPesan_(perbandingan, records, !lama.ada);
  if(gagal.length) pesan += '\n\n⚠ Sumber gagal dibaca: ' + gagal.join(', ');
  if(kirim) kirimTelegram_(pesan); else Logger.log(pesan);
  return perbandingan.length;
}

/** Dipanggil trigger harian. */
function kirimDigestHarian(){ jalankanDigest_(true); }
/** Coba manual (kirim ke Telegram). */
function testDigestSekarang(){ jalankanDigest_(true); }
/** Coba tanpa kirim Telegram (hasil di Logs). */
function testTanpaKirim(){ jalankanDigest_(false); }

/** Pasang trigger harian (jalankan sekali). */
function pasangTriggerHarian(){
  ScriptApp.getProjectTriggers().forEach(function(t){ if(t.getHandlerFunction() === 'kirimDigestHarian') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('kirimDigestHarian').timeBased().everyDays(1).atHour(JAM_KIRIM).create();
  Logger.log('Trigger terpasang: tiap hari sekitar jam ' + JAM_KIRIM + ':00');
}
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
