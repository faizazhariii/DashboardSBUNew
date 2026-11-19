/* Link file KML dari Google Drive (folder KaeMeL) per kategori.
   Dicocokkan otomatis ke "Nama Proyek" lewat nama file (tanpa .kml, huruf besar, tanpa tanda baca).
   Subfolder yang masih kosong (HEM, MBB, JPP PT3) tinggal ditambah isinya di sini. */
(function(){
  const L = {
    olo: [
      ['1x2Qsc7uBQ59pfKjgqqWz_4ZDYUpiZCsY','1ACH OLO PT3 KTN-FK WKT  Lawe Rutung'],
      ['13K-VRQ4U1VX1-tfMXuXPDAdaujoiGXEL','SMU OLO PT3 SBG XLSMART SUM-SU-SBG-1199'],
      ['1HN6dw0XlqMwsrlQBoxUmvGFoJstSVkbI','1MDN OLO PT3 TJM-FDB GARUDA AN_KIM1'],
      ['1IjIpGCUznU19dT_CFT4xNO2j2hxIcfkI','1SMU OLO PT3B SIH-FAG RACKH LA_MYAMIN'],
      ['13J9Zhdbq26o-XP9G_Nia4TSz5syFyq0L','1SMU OLO PT3B SDK-FAT NUANSA_TIGALINGGA'],
      ['1vuOiu_ix0KXaC8wj6hz-nUxnlZ_8g9g8','1SMU OLO PT3 PRR-FAC TOBA JNET_LMBN SUHI'],
      ['1Pc3wirS60u7ZxBGPbjmi-QCxlsBHrLlD','SMU OLO PT3 GST XLSMART SUM-SU-GST-1722'],
      ['1M5-pZC1mwyNjYb3xfKriJoKMBXIuZ70N','1ACH OLO PT3 MBO-FG ACEHLINK_KT PADANG']
    ],
    hem: [],
    mbb: [
      ['1dXu3oxXGhrN4halnNw8rhdJqf90o8Is4','BGE009','kml',8491,'2026-11-02'],
      ['18wHfDiLBflY-agiJS6UnRvZfub9UHcGi','BGE010','kmz',1425,'2026-11-02'],
      ['1-AsUyStzwXvy_ZVkU-B71mhcRYi3ekYN','BGE012','kml',122841,'2026-11-02'],
      ['1lbccg4m4UpyfbOtFqdPCd6_F0SDBep7C','BIR011','kml',388409,'2026-11-02'],
      ['1v7GtL-GfU6mYRKUmQe61xevhaJccWVKm','BIR013','kml',388392,'2026-11-02'],
      ['1v9L8HBeLTljmjftRIJ_8VHJenTDD9jRe','DH GPON00-D1-TRT-2PGN','kmz',73860,'2026-11-19'],
      ['1b8PwSsDjeimNUtksk2tiivSxe9Xv1STS','DH GPON00-D1-TRT-2SRL','kmz',88531,'2026-11-19'],
      ['1c-xtchzmpnNMowMdzuTU9VpgpxWU5LK7','EPA012','kmz',1055,'2026-11-02'],
      ['1UuDWd6xktxnRfZrnIXL1FtjcKWoKhlT5','IRY027','kml',205624,'2026-11-02'],
      ['1hp2rjFK0p20q7yA6Aq2Ugppf_mnim3w-','IRY032','kml',40272,'2026-11-02'],
      ['1A7ytChuwFbk7Lwn2n-kc_y8eBpIp3XMP','IRY035','kml',33493,'2026-11-02'],
      ['1fn4pg0b4Zb8VoXIaVIuJEhyMdT13iiqo','IRY500','kml',205624,'2026-11-02'],
      ['1KR_pGTNDfRgag_7soIy91K4CXkdoS6jh','KBJ034','kmz',1117,'2026-11-02'],
      ['1I4DIbVIGSJfnhf-fm7V2VkcY4VLSZrdR','KBJ060','kmz',2935,'2026-11-02'],
      ['1cxzIesw_xrgfjN5AVEs70rdjpMWwWY_e','KPD022','kml',15524,'2026-11-02'],
      ['1ZhEVFKUMJ8EV5elljYWDNedoxRKLFhgY','KPD023','kml',18783,'2026-11-02'],
      ['1Bf75pEaMrK9bf5dPUgmQPRNF4KSvdHTN','KRB012','kml',31540,'2026-11-02'],
      ['1sZfSGghnVlEbPxgMbt2z5WeCAY1O0mtK','KTN012','kmz',8178,'2026-11-02'],
      ['1POxPTS0L3I99lxRIjxnEFHbFqPlYe5Td','KTN015','kmz',3214,'2026-11-02'],
      ['1-nDX0ZKGKLYDyxezsvngkNgu95-KTN3V','LBP399','kml',38200,'2026-11-02'],
      ['1-yK4-OyZlSyz37vPrSHSMmtu8x-sivD6','LBP402','kml',4109,'2026-11-02'],
      ['1MbxUq7E0hPf8DMtl5uIwQ-0WagbsiPI5','LBP404','kmz',1411,'2026-11-02'],
      ['1ERQJjRxXjcgNi7_SXSyHOKBpReZrqtSb','LBP405','kmz',445,'2026-11-02'],
      ['1YdiU07ZbBAo-m_8GBdbtHhxlFCFBFQYD','LBP621','kmz',991,'2026-11-02'],
      ['1nsbX87HqTYGfuB2bMx_a219vvcERgITQ','LMH023','kmz',1089,'2026-11-02'],
      ['1AjO7Zlc3U5dqPvXfx6mK4-i_ybmElMec','LMH024','kmz',5708,'2026-11-02'],
      ['16gypIizRgIF1gRmtqfbKt5MTyOrFtUad','LMH027','kml',49436,'2026-11-02'],
      ['1LzjIaQG8Qnjfcxgfg2K0ZmAUqXB-rNGQ','LMH028','kml',24191,'2026-11-02'],
      ['1H8YpaTf6wo3WjLXHTZ5YMxv2tRXdPqmU','MDN032','kmz',1361,'2026-11-02'],
      ['19NwdP6Cnnsk4zoc58ciKuJBrzeMarH77','MDN091','kmz',1644,'2026-11-02'],
      ['1Ljd76l-CT9I82yUFQGhD0nqIGImCePWA','MDN093','kmz',1341,'2026-11-02'],
      ['1uzRIpN72KT4AZHUPGJUgc1h_2u32Pb1V','MDN096','kmz',1357,'2026-11-02'],
      ['18F_zHTLQU0epZrEmdjW44K_EY6q2IO_0','MDN097','kmz',1346,'2026-11-02'],
      ['17s4unOwOkEKBFQVZMYKttvVmCp7eXzpq','MDN099','kmz',1345,'2026-11-02'],
      ['1R4PKbhNUqMGv5b8VOP18XQbOCQ4v_qRk','MDN114','kmz',1356,'2026-11-02'],
      ['1DViJu5UuCwPuG94tC40QkABWfyrwWcMn','MDN129','kmz',1367,'2026-11-02'],
      ['1Uo6OR1aQSDvIP0aIK8J3whSoPkB67NOD','MDN132','kmz',1372,'2026-11-02'],
      ['1rCpPYArX6nvZ0u-CMwjDnJ90UcZ9Svsn','MDN274','kmz',1302,'2026-11-02'],
      ['1-eZaXR9D-vGDaHHhkEfdI9f1clZLtHQe','MDN329','kmz',2630,'2026-11-02'],
      ['1nacfcURoCstaokYF0jPH7xKUyDs4KBjN','MDN794','kmz',1471,'2026-11-02'],
      ['1rp59DZ8LOkidqH3ZytLNvfP2M6rkPHIo','NAD018','kml',867760,'2026-11-02'],
      ['10E89yA0b-O1LU2aBlVHJ-o7x2-gA5qIr','PMR067','kml',35915,'2026-11-02'],
      ['1xrotMsp23rrL2FL0_CwxoAT3xNC_PIg0','PMR112','kml',26808,'2026-11-02'],
      ['1Nyvu70wVNfKeIFILrxF2iXCSXdBodWL5','PMR114','kml',40953,'2026-11-02'],
      ['1qN6xSfLkcio-ReOVKxQ-lUlCEUPjWilq','PMR169','kml',59275,'2026-11-02'],
      ['1DiRoBBahZI5CRfRKH3H2rKCTKMTX0sBc','PMR311','kml',178643,'2026-11-02'],
      ['1wdsJWN6FEBUBn6fkQxtY0lhBNgNRnb89','PMR500','kmz',6133,'2026-11-02'],
      ['1PUB07WcfPpGax3MHYtUBjbusFaAVDqSr','PSP338','kml',161472,'2026-11-02'],
      ['1a_NCf-5FGihVgYtvOjelH2wdGP3sIoNM','PSP400','kmz',1074,'2026-11-02'],
      ['1nlEBR10FsQlYFJhuF8wStlxxfpXUjJhR','RAP253','kml',82538,'2026-11-02'],
      ['1H7yxUsiEdhaV60ioRneVunIoG28ZwPpE','RAP823','kml',14657,'2026-11-02'],
      ['1YEBlflnhFitKmeXoUJRspIHRAnOYgazb','RAP824','kmz',16178,'2026-11-02'],
      ['1sUkzq6awQDabBKE7AI0o4YCo5prFuH6h','SGI500','kml',11312,'2026-11-02'],
      ['1Zg2_Ggm67Ux6cR5V6nU6-CX7k3PmTYvY','SGI553','kml',8226,'2026-11-02'],
      ['1FYFKva0wnx_JSLFljN25RNitWwxaFLhZ','SHN016','kml',36972,'2026-11-02'],
      ['1U74ga6B9yOkrRq5iq6gREjUfUrc-arg1','SHN016 (2)','kml',36972,'2026-11-02'],
      ['1DRmZHiY1cTKchrUZuwbYRgMNDzC7Ca9U','SPK028','kml',23939,'2026-11-02'],
      ['1vS7Ubt8WZj0KROzIio_lWOUh9sFZDxVL','SPK033','kmz',10373,'2026-11-02'],
      ['1hrZLD3ieR2aF7EQNp5ErXlsUxYRhWE0R','SPK035','kmz',2135,'2026-11-02'],
      ['1Yyu8U1WnrsSGg9XUjopEAlRzbyhyAFjw','SRP004','kmz',4365,'2026-11-02'],
      ['1KZ2Ejsh7b4dTwOr06N6l9_y-tmm5ePcG','SRP007','kml',35978,'2026-11-02'],
      ['1RJJvNGSsKZqlofIOd3fZJW7ruOK_l010','SRP500','kmz',7798,'2026-11-02'],
      ['1Luwid8SjkZsjH7Mzgy-JnMwc7OIe6A2W','STB011','kmz',18114,'2026-11-02'],
      ['17qlAjIeLxmcLN5AOookJ4Syayw8V9mIp','TKN018','kmz',1145,'2026-11-02'],
      ['1fU1-H1yY8KjDRWja2jKTTO5AS0jgUBhS','TKN019','kmz',2261,'2026-11-02'],
      ['1Kuj-EQrbmWB3_PtINuX1TalL7f_aAx1x','TKN761','kml',7506,'2026-11-02'],
      ['1Gy4INi_Ej1kMtFYvyaWzWNqZRjDFxYAV','TRT717','kml',9279,'2026-11-02'],
      ['1luGrw7Y30Ie4_pxM68Q7_-5J1Xejfq2d','spk034','kml',1687,'2026-11-02']
    ],
    pt3: []
  };
  window.KML_FILES = L;
  window.KML_FOLDERS = {mbb:'12oYzeI6sbR5fep4boX8-aXZJD-LHvNtF', olo:'1WT8QRwZjPJW7LUMzfeP28Waq32-frh4y'};
  const norm = s => String(s||'').toUpperCase().replace(/\.KML$/,'').replace(/[^A-Z0-9]+/g,'');
  const idx = {};
  Object.keys(L).forEach(k=>{ idx[k] = {}; L[k].forEach(([id,name])=>{ idx[k][norm(name)] = id; }); });
  /* Isi dengan URL Web App KmlDriveAPI.gs (…/exec) supaya file baru di Drive terbaca otomatis. Kosong = pakai daftar tanam saja. */
  window.KML_API_URL = 'https://script.google.com/macros/s/AKfycbzExB4lq_kIlTeGHZDU8KZ4lhIHUOTP-GP4dvIcVBXd_Kp9wMA00ylVkdVeOHr1Y3ag/exec';
  window.kmlAdd = function(kat, id, name){ if(!idx[kat]) idx[kat] = {}; if(!L[kat]) L[kat] = []; if(!L[kat].some(function(x){ return x[0]===id; })) L[kat].push([id,name]); idx[kat][norm(name)] = id; };
  /* kembalikan HTML sel "KML" untuk satu baris */
  window.kmlCell = function(kat, namaProyek, alt){
    const id = (idx[kat]||{})[norm(namaProyek)] || (alt ? (idx[kat]||{})[norm(alt)] : '');
    return id ? `<a href="https://drive.google.com/file/d/${id}/view" target="_blank" rel="noopener" title="Buka KML/KMZ di Google Drive" style="font-weight:700;text-decoration:none;">🗺️ KML</a>` : '—';
  };

  /* Sinkron otomatis dari Drive (kalau KML_API_URL diisi): tambahkan file yang belum ada di daftar tanam */
  window.kmlLiveSync = async function(){
    if(!window.KML_API_URL) return false;
    var changed = false;
    for(const kat of Object.keys(window.KML_FOLDERS||{})){
      try{
        const r = await fetch(window.KML_API_URL + '?action=list&folder=' + window.KML_FOLDERS[kat]); const j = await r.json();
        if(!j.ok) continue;
        j.files.forEach(function(f){
          if(!L[kat]) L[kat] = [];
          if(!L[kat].some(function(x){ return x[0]===f.id; })){ L[kat].push([f.id,f.name,f.ext,f.size,f.date]); idx[kat] = idx[kat]||{}; idx[kat][norm(f.name)] = f.id; changed = true; }
        });
      }catch(e){}
    }
    if(changed){ try{ window.oloRenderTable && oloRenderTable(); window.mbbRenderTable && mbbRenderTable(); }catch(e){} document.dispatchEvent(new Event('kmllinks')); }
    return changed;
  };
  window.addEventListener('load', function(){ setTimeout(function(){ window.kmlLiveSync && kmlLiveSync(); }, 2500); });
})();
