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
    hem: [], mbb: [], pt3: []
  };
  const norm = s => String(s||'').toUpperCase().replace(/\.KML$/,'').replace(/[^A-Z0-9]+/g,'');
  const idx = {};
  Object.keys(L).forEach(k=>{ idx[k] = {}; L[k].forEach(([id,name])=>{ idx[k][norm(name)] = id; }); });
  /* kembalikan HTML sel "KML" untuk satu baris */
  window.kmlCell = function(kat, namaProyek){
    const id = (idx[kat]||{})[norm(namaProyek)];
    return id ? `<a href="https://drive.google.com/file/d/${id}/view" target="_blank" rel="noopener" title="Buka KML di Google Drive" style="font-weight:700;text-decoration:none;">🗺️ KML</a>` : '—';
  };
})();
