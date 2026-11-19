/**
 * KmlDriveAPI.gs — Web App kecil supaya dashboard bisa membaca file KML/KMZ
 * dari folder Google Drive "KaeMeL" secara otomatis (file baru langsung terbaca).
 *
 * CARA PASANG (sekali saja):
 * 1. script.google.com → Proyek baru → tempel seluruh file ini → Simpan.
 * 2. Deploy → Deployment baru → jenis "Aplikasi web"
 *      Jalankan sebagai : Saya (akun yang punya folder KaeMeL)
 *      Yang punya akses : Siapa saja
 *    → Deploy → izinkan akses Drive → salin URL yang berakhiran /exec
 * 3. Kirim URL /exec itu ke Claude (atau isi KML_API_URL di kml-links.js).
 *
 * Keamanan: hanya file di dalam folder ROOT_FOLDER_ID (KaeMeL) yang bisa dibaca.
 */
var ROOT_FOLDER_ID = '1Gsrj6ko7Bkb9M6V7a-v_Tyrb9JhdjF1h'; // folder KaeMeL

function doGet(e){
  var p = (e && e.parameter) || {};
  try{
    if(p.action === 'list') return out_(listFolder_(p.folder || ROOT_FOLDER_ID));
    if(p.action === 'get')  return out_(getFile_(p.id));
    return out_({ok:true, info:'KML Drive API', actions:['list','get']});
  }catch(err){
    return out_({ok:false, error:String(err && err.message || err)});
  }
}

function out_(o){
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/* apakah folder/file berada di bawah ROOT_FOLDER_ID? */
function inRoot_(item){
  if(item.getId() === ROOT_FOLDER_ID) return true;
  var ps = item.getParents();
  while(ps.hasNext()){ if(inRoot_(ps.next())) return true; }
  return false;
}

function listFolder_(folderId){
  var f = DriveApp.getFolderById(folderId);
  if(!inRoot_(f)) throw new Error('Folder di luar KaeMeL');
  var files = [], it = f.getFiles();
  while(it.hasNext()){
    var x = it.next(), n = x.getName(), m = n.match(/\.(kml|kmz)$/i);
    if(!m) continue;
    files.push({id:x.getId(), name:n.replace(/\.(kml|kmz)$/i,''), ext:m[1].toLowerCase(), size:x.getSize(), date:Utilities.formatDate(x.getLastUpdated(),'Asia/Jakarta','yyyy-MM-dd')});
  }
  files.sort(function(a,b){ return a.name < b.name ? -1 : 1; });
  return {ok:true, folder:f.getName(), files:files};
}

function getFile_(id){
  var x = DriveApp.getFileById(id);
  if(!inRoot_(x)) throw new Error('File di luar KaeMeL');
  var n = x.getName(), m = n.match(/\.(kml|kmz)$/i);
  if(!m) throw new Error('Bukan KML/KMZ');
  return {ok:true, id:id, ext:m[1].toLowerCase(), b64:Utilities.base64Encode(x.getBlob().getBytes())};
}

/* Uji manual dari editor: Run → testList */
function testList(){ Logger.log(JSON.stringify(listFolder_('12oYzeI6sbR5fep4boX8-aXZJD-LHvNtF')).slice(0,500)); }
