/* ==========================================================================
   RONYA KİMYA — TEMA v1
   Yeni görünüm katmanı: renkler, yazı tipleri, ana sayfa, menü.
   Eski dosyalara (index.html içeriği, ronya-eklenti.js, ronya-portal.js)
   DOKUNMAZ; onların üzerine giydirilir.

   KURULUM: index.html'de en sona, ronya-portal.js'in ALTINA:
     <script src="ronya-tema.js"></script>
   GERİ ALMAK İÇİN: o satırı silmek yeterli.
   ========================================================================== */
(function () {
  'use strict';
  var TEMA_SURUM = 'v8';
  window.RONYA_TEMA = TEMA_SURUM;

  /* ---------- 1. ARAÇ LİSTESİ (ana sayfadaki gruplar) ----------
     Yeni bir ekran eklersen buraya bir satır eklemen yeterli:
     [ekran-adı, başlık, kısa açıklama, ikon]
     Ekran adı nav('...') içinde kullandığın addır. Ayrı sayfa için
     'URL:sayfa.html', dış site için 'EXT:https://...' yaz.                                              */
  var GROUPS = [
    { id: 'rk-ders', title: 'Ders çalış', color: 'kobalt',
      sub: 'Tema 2 konuları: MEB konu anlatımı ve çözümlü sorular.',
      items: [
        ['kinetik', 'Tepkime hızı', 'Çarpışma teorisi, potansiyel enerji grafiği ve hız hesapları.', 'speed'],
        ['enerji', 'Kimyasal enerji', 'Tepkimelerde enerji değişimi, çözümlü sorularla.', 'flame'],
        ['denge2', 'Kimyasal denge', 'Denge sabiti ve Le Chatelier ilkesi, çözümlü sorularla.', 'eq'],
        ['redoks', 'Redoks denkleştirme', 'Yükseltgenme basamakları ve adım adım denkleştirme.', 'redox'],
        ['fizkim', 'Fiziksel ve kimyasal değişim', 'İki değişim türünü örneklerle ayırt et.', 'cycle'],
        ['asitbaz2', 'Asit-baz dengesi', 'pH, pOH, Ka ve Kb hesapları, nötralleşme ve titrasyon.', 'drop'],
        ['cozunurluk2', 'Çözünürlük dengesi', 'Kçç ve molar çözünürlük, tema sonu değerlendirme.', 'beaker']
      ] },
    { id: 'rk-hesapla', title: 'Hesapla', color: 'bakir',
      sub: 'Değerleri gir, sonucu hemen gör.',
      items: [
        ['mol', 'Mol hesaplayıcı', 'Mol, kütle, hacim, tanecik sayısı ve derişim dönüşümleri.', 'scale'],
        ['eq', 'Denklem denkleştirici', 'Tepkime denklemlerinin katsayılarını bul.', 'balance'],
        ['ph', 'pH hesaplayıcı', 'Kuvvetli ve zayıf asit-baz çözeltileri, tampon.', 'drop'],
        ['gaz', 'Gaz yasaları', 'Boyle, Charles, Gay-Lussac ve ideal gaz denklemi.', 'piston'],
        ['cozelti', 'Çözelti simülatörü', 'Mol, hacim ve molarite arasındaki ilişki.', 'flask'],
        ['izotop', 'İzotop ve çap', 'İzotop, izobar ve izoton ilişkisini bul.', 'iso'],
        ['cmp', 'Element karşılaştır', 'İki elementin özelliklerini yan yana gör.', 'compare'],
        ['URL:kcc.html', 'Kçç hesaplayıcı', 'Çözünürlük çarpımı ile molar çözünürlük arasında dönüşüm.', 'beaker']
      ] },
    { id: 'rk-gorsel', title: 'Görselleştir', color: 'sodyum',
      sub: 'Periyodik tablo, orbitaller ve 3D moleküller.',
      items: [
        ['pt', 'Periyodik tablo', '118 elementin bilgileri ve periyodik özelliklerin değişimi.', 'table'],
        ['URL:orbital.html', 'Orbitaller ve VSEPR', '3D atom orbitalleri ve molekül geometrileri.', 'atom'],
        ['bagSim', 'Lewis yapıları', 'Moleküllerde bağ ve ortaklanmamış elektron çiftleri.', 'bond'],
        ['wi', 'Etkileşimler', 'Moleküller arası etkileşimleri incele.', 'dipole'],
        ['hc', 'Hidrokarbonlar 3D', 'Hidrokarbon moleküllerini üç boyutta incele.', 'hex'],
        ['fg', 'Fonksiyonel gruplar 3D', 'Alkol, aldehit, keton, karboksilik asit, ester ve eter.', 'mol'],
        ['URL:organik.html', 'Organik kimya', 'Fonksiyonel gruplar, adlandırma kuralları ve izomeri.', 'hex'],
        ['URL:molekul-cizici.html', 'Molekül çizici', "2D yapı çiz, PubChem'de ara, 3D modelini incele.", 'draw'],
        ['lab3d', '3D laboratuvar', 'Laboratuvar malzemelerini döndür, yakınlaştır, incele.', 'cube'],
        ['lab', 'Laboratuvar malzemeleri', 'Ne işe yarar, nasıl kullanılır, nelere dikkat edilir.', 'tube'],
        ['risk', 'Risk piktogramları', 'GHS/CLP güvenlik işaretleri ve anlamları.', 'warn']
      ] },
    { id: 'rk-deney', title: 'Sanal deney', color: 'potasyum',
      sub: 'Değişkenleri değiştir, sonucu anında gör.',
      items: [
        ['URL:simulasyonlar.html', 'Kimya simülasyonları', 'Asit-baz, atom modelleri, katılar ve daha fazlası.', 'sim'],
        ['URL:gaz-lab.html', 'Gaz laboratuvarı', 'Piston düzenekleri, kinetik teori, Graham difüzyonu.', 'gaslab'],
        ['URL:denge.html', 'Denge kinetiği', 'Le Chatelier etkilerini derişim-zaman grafiğinde izle.', 'eq'],
        ['URL:elektro.html', 'Elektrokimyasal hücre', 'Galvanik hücre, Nernst denklemi ve pil potansiyeli.', 'cell'],
        ['gv', 'Galvanik hücre 3D', 'Anot, katot ve tuz köprüsünde elektron ve iyon akışı.', 'cell'],
        ['elz', 'Elektroliz laboratuvarı', 'Elektroliz düzeneğinde iyonların hareketini izle.', 'elz'],
        ['URL:seri-kaplar.html', 'Seri kaplar', 'Seri bağlı elektroliz kaplarında ürünleri karşılaştır.', 'elz'],
        ['rxntype', 'Tepkime türleri', 'Tepkimeleri türüne göre sınıflandır.', 'sort'],
        ['alev', 'Alev testi', 'Metal iyonlarının alev renkleri.', 'flame']
      ] },
    { id: 'rk-sinav', title: 'Sınava hazırlan', color: 'lityum',
      sub: 'Kendini dene, eksiğini bul, düzenli çalış.',
      items: [
        ['URL:test.html', 'Konu testleri', 'Konu ve soru sayısını seç, testi çöz.', 'list'],
        ['quiz', 'Element testi', 'Sembol ve isim eşleştirme. Yanlış yaptıkların takip edilir.', 'symbol'],
        ['flashcard', 'Bilgi kartları', 'Kimyasal bileşik kartlarıyla tekrar yap.', 'cards'],
        ['yks', 'YKS geri sayım', "TYT ve AYT'ye kalan süre.", 'clock'],
        ['pom', 'Odaklan', 'Ayarlanabilir çalışma ve mola zamanlayıcısı.', 'target'],
        ['puan', 'YKS net hesaplama', 'Doğru ve yanlışlarından TYT ve AYT netlerini hesapla.', 'chart'],
        ['board', 'Skor tablosu', 'Test sonuçlarına göre sıralama.', 'trophy'],
        ['video', 'Video dersler', 'Konu anlatım videoları.', 'video'],
        ['EXT:https://yokatlas.yok.gov.tr/', 'YÖK Atlas', 'Üniversite ve bölüm bilgileri. Yeni sekmede açılır.', 'cap']
      ] }
  ];

  /* ---------- 2. İKONLAR (tek çizgi kalınlığı, tek stil) ---------- */
  var S = 'fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"';
  var DOT = function (x, y) { return '<circle cx="' + x + '" cy="' + y + '" r=".9" fill="currentColor" stroke="none"/>'; };
  var ICONS = {
    speed: '<circle cx="13" cy="13" r="8"/><path d="M13 9v4l2.8 1.8M10.5 2.5h5M1.8 9.5h3M1.3 13h3M1.8 16.5h3"/>',
    flame: '<path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.3 2.2-5.3 3.6-7.7.5 1.9 1.4 3 2.6 3.6.3-3.1 1.4-5.7 3.3-7.7.6 3.5 4 6 4 11.2 0 4-2.7 6.8-7 6.8z"/>',
    eq: '<path d="M4 9h15l-3.5-3.5M20 15H5l3.5 3.5"/>',
    redox: '<circle cx="5.5" cy="15" r="3"/><circle cx="18.5" cy="15" r="3"/><path d="M7.5 9.5c2.6-3.3 6.4-3.3 9 0M16.5 9.5l.2-2.6M16.5 9.5l-2.5-.4"/>',
    cycle: '<path d="M20 12a8 8 0 0 1-14.3 4.9M4 12a8 8 0 0 1 14.3-4.9"/><path d="M18.5 3v4.2h-4.2M5.5 21v-4.2h4.2"/>',
    drop: '<path d="M12 3c3.6 4.6 6.2 7.8 6.2 11.2a6.2 6.2 0 0 1-12.4 0C5.8 10.8 8.4 7.6 12 3z"/><path d="M9.2 15.2a2.9 2.9 0 0 0 2.6 2.4"/>',
    beaker: '<path d="M5 3h14M6.5 3v15a3 3 0 0 0 3 3h5a3 3 0 0 0 3-3V3M6.5 12h11"/>' + DOT(10, 18) + DOT(13.5, 17.2),
    scale: '<path d="M12 4v16M7 20h10M5 7h14M5 7l-2.5 6a2.5 2.5 0 0 0 5 0zM19 7l-2.5 6a2.5 2.5 0 0 0 5 0z"/>',
    balance: '<path d="M3 12h11M11 8.5 14.5 12 11 15.5M18.5 9v6M15.5 12h6"/>',
    piston: '<path d="M5 3v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3M5 9h14M12 3v6"/>' + DOT(9, 14) + DOT(14.5, 13) + DOT(12, 17),
    flask: '<path d="M9 3h6M10 3v6.2L4.6 18.4A1.8 1.8 0 0 0 6.2 21h11.6a1.8 1.8 0 0 0 1.6-2.6L14 9.2V3M7.4 15h9.2"/>',
    iso: '<circle cx="7" cy="12" r="4.5"/><circle cx="17" cy="12" r="4.5"/><path d="M7 10v4M5 12h4M15 12h4"/>',
    compare: '<rect x="3" y="4" width="7.5" height="16" rx="1.5"/><rect x="13.5" y="4" width="7.5" height="16" rx="1.5"/><path d="M5.7 9h2M16.3 9h2M5.7 13h2M16.3 13h2"/>',
    table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9.5h18M3 15h18M9 9.5V20M15 9.5V20"/>',
    cube: '<path d="M12 2.8 20 7.4v9.2L12 21.2 4 16.6V7.4zM4 7.4 12 12l8-4.6M12 12v9.2"/>',
    bond: '<circle cx="7" cy="12" r="4"/><circle cx="17" cy="12" r="4"/>' + DOT(12, 10.3) + DOT(12, 13.7),
    hex: '<path d="M12 3l7.8 4.5v9L12 21l-7.8-4.5v-9zM8.2 9.3v5.4M12 18.3l4.7-2.7M16.7 8.4 12 5.7"/>',
    mol: '<circle cx="12" cy="12" r="2.6"/><circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="12" cy="20" r="2"/><path d="M6.6 7.3l3.4 3M17.4 7.3l-3.4 3M12 14.6V18"/>',
    dipole: '<ellipse cx="7" cy="12" rx="4.5" ry="3.2"/><ellipse cx="17" cy="12" rx="4.5" ry="3.2"/><path d="M4.8 12h1.8M16.2 12h1.8M17.1 11.1v1.8"/>',
    cell: '<rect x="2.5" y="7" width="16.5" height="10" rx="2"/><path d="M21.5 10.5v3M7 12h4M9 10v4M14 12h1.5"/>',
    elz: '<path d="M4 9v9a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V9M8.5 3v13M15.5 3v13M4 13h16"/>',
    sort: '<rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><path d="M14 17.25h6.5M17.25 14v6.5"/>',
    tube: '<path d="M8.5 3h7M9.8 3v14.2a2.2 2.2 0 0 0 4.4 0V3M9.8 12h4.4"/>',
    warn: '<path d="M12 2.8 21.2 12 12 21.2 2.8 12zM12 8v5"/>' + DOT(12, 16),
    symbol: '<rect x="3.5" y="3.5" width="17" height="17" rx="2.5"/><path d="M8.5 16.5v-8h4M8.5 12.5h3.2M14.5 16.5h2"/>',
    cards: '<rect x="6" y="7" width="14" height="13" rx="2"/><path d="M4 16V6a2 2 0 0 1 2-2h10"/>',
    clock: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9.5 2.5h5"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/>' + DOT(12, 12),
    chart: '<path d="M4 20h16M7 16v-5M12 16V6M17 16v-8"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3.4 4M16 6h3a3 3 0 0 1-3.4 4M12 13v4M8 20.5h8M9.5 17h5v3.5"/>',
    video: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M10 9.2v5.6l4.6-2.8z" fill="currentColor"/>',
    cap: '<path d="M2 9.5 12 5l10 4.5-10 4.5zM6 11.3V16c0 1.4 2.7 3 6 3s6-1.6 6-3v-4.7M22 9.5v5"/>',
    atom: '<circle cx="12" cy="12" r="1.6" fill="currentColor"/><ellipse cx="12" cy="12" rx="9.5" ry="3.8"/><ellipse cx="12" cy="12" rx="9.5" ry="3.8" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9.5" ry="3.8" transform="rotate(-60 12 12)"/>',
    draw: '<path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19z"/><path d="M14.5 6.5l3 3"/>',
    sim: '<path d="M3 17c3-8 6-8 9 0s6 8 9 0M3 21h18"/>',
    gaslab: '<circle cx="12" cy="12" r="8.5"/>' + '<circle cx="9" cy="10" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="9" r="1.2" fill="currentColor" stroke="none"/><circle cx="13" cy="15" r="1.2" fill="currentColor" stroke="none"/><path d="M10.4 10.6l1.8.9M15.6 10.3l-1.2 1.4"/>',
    list: '<path d="M10 6h10M10 12h10M10 18h10M3.5 6l1.2 1.2L7 5M3.5 12l1.2 1.2L7 11M3.5 18l1.2 1.2L7 17"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>'
  };
  function icon(name) {
    return '<svg viewBox="0 0 24 24" ' + S + ' aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
  }

  /* ---------- 3. GÖRÜNÜM (CSS) ---------- */
  var CSS = [
    /* Renk sistemi: eski değişken adları korunuyor, değerleri yenileniyor */
    ':root{--bg:#FBF8F5;--sf:#FFFFFF;--sf2:#F4EFEA;--sf3:#EDE6DF;--br:#E7E0D9;--br2:#D9D0C7;',
    '--ac:#D94800;--ac2:#B83D00;--ac3:#8F3000;--gr:#1B6B4A;--rd:#B42318;--yw:#A15C00;--cy:#0B5C8A;',
    '--tx:#14110F;--tx2:#5C554F;--tx3:#7A726B;--r:12px;--rsm:8px;--rlg:16px;--rxl:20px;',
    '--kobalt:#F85300;--bakir:#0B5C8A;--sodyum:#1B6B4A;--potasyum:#5B3A8C;--lityum:#B42318;',
    '--rk-display:"Bricolage Grotesque","Segoe UI",system-ui,sans-serif;',
    '--rk-body:"IBM Plex Sans","Segoe UI",system-ui,-apple-system,sans-serif;}',

    'html:not(.rk-lite),html:not(.rk-lite) body{background:var(--bg)!important;}',
    'html,body{font-family:var(--rk-body)!important;-webkit-font-smoothing:antialiased;}',
    '[style*="uppercase"]{text-transform:none!important;letter-spacing:0!important;}',
    'button,input,select,textarea,.btn,.inp,.sel,.ob,.ob2,.tab,.ltab,.nxt,.cat-btn,.trend-btn{font-family:var(--rk-body)!important;}',
    '.ptitle,.logo,.sbig,.rpct,.cdv,.pomtm,.rb .rv,.phval,.si .sv,.rstat .v,.tc .tt,h1,h2,h3,#pt-real-grid,[style*="Space Grotesk"]{font-family:var(--rk-display)!important;}',
    '[style*="Inter"]{font-family:var(--rk-body)!important;}',
    ':focus-visible{outline:3px solid var(--ac2);outline-offset:2px;}',

    /* Üst bar */
    'header{position:sticky;top:0;z-index:100;background:rgba(251,248,245,.94)!important;border-bottom:1px solid var(--br)!important;',
    'padding:max(10px,env(safe-area-inset-top)) clamp(14px,4vw,32px) 10px!important;}',
    'header img,.rk-logo-mark{width:auto!important;height:34px!important;border-radius:0!important;object-fit:contain!important;background:none!important;}',
    'header .logo{background:none!important;-webkit-text-fill-color:var(--tx)!important;color:var(--tx)!important;font-size:21px!important;font-weight:700!important;letter-spacing:-.01em!important;}',
    'header .logo-sub{-webkit-text-fill-color:var(--tx2)!important;font-family:var(--rk-display)!important;font-size:21px!important;font-weight:500!important;margin-left:5px!important;}',
    '.hmb{width:44px;height:44px;padding:0!important;font-size:0!important;border:1px solid var(--br2)!important;border-radius:12px!important;color:var(--tx)!important;}',
    '.hmb svg{width:22px;height:22px;}',
    '.hmb:hover{background:var(--sf2)!important;}',

    /* Menü */
    '#mn{background:var(--bg)!important;backdrop-filter:none!important;gap:2px!important;',
    'padding:calc(env(safe-area-inset-top,0px) + 12px) clamp(14px,4vw,28px) calc(env(safe-area-inset-bottom,0px) + 40px)!important;}',
    '#mn > *{max-width:560px;width:100%;margin-left:auto;margin-right:auto;}',
    '#mn button{background:transparent!important;border:0!important;border-radius:10px!important;padding:12px 14px!important;font-size:16px!important;font-weight:500!important;color:var(--tx)!important;}',
    '#mn button:hover{background:var(--sf2)!important;color:var(--tx)!important;}',
    '#mn .mn-grp-hdr{margin-top:10px;border-top:1px solid var(--br)!important;border-radius:0!important;padding-top:16px!important;font-family:var(--rk-display)!important;font-weight:700!important;font-size:17px!important;}',
    '#mn [id^="mn-group-"]{padding-left:6px!important;}',
    '#mn > button:last-child{margin-top:10px;border-top:1px solid var(--br)!important;border-radius:0!important;padding-top:16px!important;}',
    '.ptitle + .tabs,.ptitle + .ltabs,.psub + .tabs{margin-top:16px;}',
    '#mn [id^="mn-group-"] button{color:var(--tx2)!important;font-size:15.5px!important;}',
    '#mn [id^="mn-group-"] button:hover{color:var(--tx)!important;}',
    '.rk-mn-top{display:flex;align-items:center;justify-content:space-between;padding:4px 4px 12px;}',
    '.rk-mn-top b{font:700 22px/1 var(--rk-display);color:var(--tx);}',
    '#mn .rk-mn-close{width:44px;height:44px;padding:0!important;display:grid;place-items:center;border:1px solid var(--br2)!important;border-radius:12px!important;flex:none;}',
    '.rk-mn-close svg{width:22px;height:22px;}',

    /* Ekranların ortak parçaları */
    '.pw{padding-top:32px;}',
    '.ptitle{font-size:clamp(26px,4.5vw,36px)!important;font-weight:700!important;letter-spacing:-.02em;line-height:1.1;margin-bottom:8px!important;}',
    '.psub{color:var(--tx2)!important;font-size:16px!important;}',
    '.card{border-radius:16px!important;}',
    '.slbl,.rb .rl,.qlbl,.cdl,.brow.hdr,.rp-section-title{text-transform:none!important;letter-spacing:0!important;font-size:13.5px!important;font-weight:600!important;color:var(--tx2)!important;}',
    '.btn.bp,.btn.bp:hover{box-shadow:none!important;transform:none!important;}',
    '.btn.bp:hover{background:#B83D00!important;}',
    '.btn.bp,.tab.on,.ltab.on{color:#fff!important;}',
    '.app.ronya-light > *,.app.ronya-light header{filter:none!important;}',
    '::selection{background:#FFE2D1;}',
    '#s-set .card:has(#theme-btn-dark){display:none!important;}',
    'html.rk-pagelight body{background:#FBF8F5!important;}',
    '.rheader{background:rgba(251,248,245,.94)!important;border-bottom-color:#E7E0D9!important;}',
    '.tab.on,.ltab.on{background:var(--ac)!important;}',
    '.ob.sel2,.cat-btn.active,.trend-btn.active{background:#FFF1E9!important;border-color:var(--ac)!important;color:var(--ac3)!important;}',
    '.hero h1{text-shadow:none!important;}',
    '.toast{font-family:var(--rk-body)!important;}',

    /* Ayrı sayfalar (test.html vb.) */
    '.test-baslik{font-family:var(--rk-display)!important;color:var(--tx)!important;font-size:21px!important;font-weight:700!important;}',
    '.form-label,.kesif-baslik{text-transform:none!important;letter-spacing:0!important;font-size:13.5px!important;}',
    '.panel-baslik .icon,.yukle-icon{display:none!important;}',
    '#dosya-input{display:none!important;}',
    '.rlogo,[onclick*="index.html"] [style*="background-clip"]{background:none!important;-webkit-text-fill-color:#14110F!important;color:#14110F!important;font-family:var(--rk-display)!important;font-weight:700!important;}',
    '.rlogo-sub{-webkit-text-fill-color:#5C554F!important;font-family:var(--rk-display)!important;font-size:inherit!important;font-weight:500!important;}',
    '.rk-topbar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:max(10px,env(safe-area-inset-top)) clamp(14px,4vw,32px) 10px;background:#FBF8F5;border-bottom:1px solid #E7E0D9;}',
    '.rk-topbar a:first-child{display:flex;align-items:center;gap:10px;text-decoration:none;color:#14110F;font:700 21px/1 var(--rk-display);}',
    '.rk-topbar img{width:auto;height:34px;}',
    '.rk-topbar .rk-homebtn{display:inline-flex;align-items:center;text-decoration:none;}',
    '.rk-homebtn{height:44px;padding:0 16px!important;border-radius:12px!important;border:1px solid #D9D0C7!important;background:transparent!important;color:#14110F!important;font:500 15px var(--rk-body)!important;cursor:pointer;}',
    '.rk-homebtn:hover{background:#F4EFEA!important;}',
    'header .rk-homebtn{height:44px;padding:0 16px!important;border-radius:12px!important;border:1px solid var(--br2)!important;background:transparent!important;color:var(--tx)!important;font:500 15px var(--rk-body)!important;}',
    'header .rk-homebtn:hover{background:var(--sf2)!important;}',

    /* Portal (duyurular, haftanın sorusu, galeri) */
    '.rp-slide-emoji{display:none!important;}',
    '.rp-carousel{box-shadow:none!important;border-radius:16px!important;}',
    '.rp-slide{padding:26px 60px!important;color:#fff!important;}',
    '.rp-slide *{color:#fff!important;-webkit-text-fill-color:#fff!important;}',
    '.rp-gallery-empty,.rp-section-title:has(+ .rp-gallery-empty){display:none!important;}',
    '.rp-slide-title{font-family:var(--rk-display)!important;font-size:21px!important;font-weight:700!important;}',
    '.rp-slide-desc{font-size:14.5px!important;}',
    '#home-guide,#s-home #day-el{display:none!important;}',

    /* ---------- Yeni ana sayfa ---------- */
    '#s-home{--rk-w:1180px;}',
    '.rk-wrap{max-width:var(--rk-w);margin:0 auto;padding:0 clamp(16px,4vw,40px);}',
    '.rk-hero{padding:clamp(36px,7vw,80px) 0 clamp(28px,5vw,56px);}',
    '.rk-hero .rk-wrap{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);gap:clamp(28px,5vw,72px);align-items:center;}',
    '.rk-h1{font:800 clamp(38px,6vw,68px)/1.02 var(--rk-display);letter-spacing:-.035em;color:var(--tx);margin:0 0 20px;max-width:13ch;}',
    '.rk-lead{font-size:clamp(17px,1.6vw,20px);line-height:1.6;color:var(--tx2);max-width:46ch;margin:0 0 30px;}',
    '.rk-actions{display:flex;flex-wrap:wrap;gap:12px;}',
    '.rk-btn{display:inline-flex;align-items:center;justify-content:center;min-height:50px;padding:0 22px;border-radius:12px;font:600 16px/1 var(--rk-body);cursor:pointer;border:1.5px solid transparent;}',
    '.rk-btn-primary{background:var(--tx);color:var(--bg);}',
    '.rk-btn-primary:hover{background:#F85300;}',
    '.rk-btn-ghost{background:transparent;color:var(--tx);border-color:var(--br2);}',
    '.rk-btn-ghost:hover{border-color:var(--tx2);}',

    /* Günün elementi kartı */
    '.rk-el{justify-self:center;width:min(100%,360px);}',
    '.rk-tile{position:relative;display:grid;grid-template-rows:auto 1fr auto;width:100%;aspect-ratio:1;padding:clamp(18px,3vw,26px);',
    'border-radius:20px;background:var(--sf);border:1px solid var(--br2);color:var(--tx);cursor:pointer;text-align:left;overflow:hidden;transition:transform .25s ease;}',
    '.rk-tile:hover{transform:translateY(-3px);}',
    '.rk-tile::before{content:"";position:absolute;left:0;right:0;top:0;height:6px;background:var(--rk-cat,var(--kobalt));}',
    '.rk-tile-top{display:flex;justify-content:space-between;font:600 clamp(17px,2.4vw,21px)/1 var(--rk-body);font-variant-numeric:tabular-nums;}',
    '.rk-tile-top span:last-child{color:var(--tx2);font-weight:500;}',
    '.rk-sym{align-self:center;font:800 clamp(96px,16vw,150px)/.9 var(--rk-display);letter-spacing:-.04em;}',
    '.rk-name{display:block;font:700 clamp(22px,2.8vw,26px)/1.1 var(--rk-display);}',
    '.rk-cat{display:flex;align-items:center;gap:8px;margin-top:6px;font-size:15px;color:var(--tx2);}',
    '.rk-cat::before{content:"";width:9px;height:9px;border-radius:50%;background:var(--rk-cat,var(--kobalt));}',
    '.rk-facts{display:grid;grid-template-columns:1fr 1fr;gap:1px;margin:14px 0 0;background:var(--br);border:1px solid var(--br);border-radius:14px;overflow:hidden;}',
    '.rk-facts div{background:var(--sf);padding:11px 14px;}',
    '.rk-facts dt{font-size:13px;color:var(--tx3);}',
    '.rk-facts dd{margin:2px 0 0;font-weight:600;font-variant-numeric:tabular-nums;color:var(--tx);}',
    '.rk-el-foot{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:10px;font-size:14px;color:var(--tx3);}',
    '.rk-link{background:none;border:0;padding:8px 0;font:600 15px var(--rk-body);color:var(--ac2);cursor:pointer;}',
    '.rk-link:hover{color:var(--ac3);}',
    '.rk-fade{animation:rkfade .35s ease;}',
    '@keyframes rkfade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}',

    /* Portal alanı */
    '#s-home .rk-portal{max-width:var(--rk-w);padding:0 clamp(16px,4vw,40px)!important;}',
    '#s-home .rk-portal:empty{display:none;}',

    /* Arama ve kısayollar */
    '.rk-finder{display:flex;flex-wrap:wrap;align-items:center;gap:12px 20px;padding:12px 0 8px;}',
    '.rk-search{display:flex;align-items:center;gap:10px;flex:1 1 320px;max-width:520px;min-height:54px;padding:0 16px;background:var(--sf);border:1.5px solid var(--br2);border-radius:14px;}',
    '.rk-search:focus-within{border-color:var(--ac);}',
    '.rk-search svg{width:20px;height:20px;flex:none;color:var(--tx3);}',
    '.rk-search input{flex:1;min-width:0;border:0;outline:0;background:none;color:var(--tx);font:400 17px var(--rk-body);}',
    '.rk-search input::placeholder{color:var(--tx3);}',
    '.rk-jump{display:flex;gap:6px;flex-wrap:wrap;}',
    '.rk-jump button{display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:0 14px;border-radius:999px;border:1px solid var(--br);background:none;color:var(--tx2);font:500 15px var(--rk-body);cursor:pointer;}',
    '.rk-jump button:hover{color:var(--tx);border-color:var(--br2);}',
    '.rk-jump i{width:8px;height:8px;border-radius:50%;background:var(--c);}',
    '.rk-empty{display:none;padding:32px 0;color:var(--tx2);font-size:16px;}',

    /* Gruplar */
    '.rk-group{padding:clamp(28px,4vw,44px) 0;border-top:1px solid var(--br);}',
    '.rk-group[hidden]{display:none;}',
    '.rk-ghead{display:flex;align-items:baseline;flex-wrap:wrap;gap:6px 16px;margin-bottom:18px;}',
    '.rk-h2{display:flex;align-items:center;gap:10px;margin:0;font:700 clamp(24px,3vw,30px)/1.1 var(--rk-display);letter-spacing:-.02em;color:var(--tx);}',
    '.rk-h2::before{content:"";width:13px;height:13px;border-radius:4px;background:var(--c);}',
    '.rk-ghead p{margin:0;color:var(--tx2);font-size:16px;}',
    '.rk-tools{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:6px;list-style:none;margin:0;padding:0;}',
    '.rk-tools li[hidden]{display:none;}',
    '.rk-tool{display:flex;gap:14px;align-items:flex-start;width:100%;height:100%;padding:14px;border-radius:14px;border:1px solid transparent;background:none;color:var(--tx);text-align:left;cursor:pointer;font:inherit;}',
    '.rk-tool:hover{background:var(--sf);border-color:var(--br);}',
    '.rk-ico{flex:none;display:grid;place-items:center;width:46px;height:46px;border-radius:12px;color:var(--c);background:color-mix(in srgb,var(--c) 14%,transparent);}',
    '.rk-ico svg{width:24px;height:24px;}',
    '.rk-tool b{display:block;font-size:17px;font-weight:600;line-height:1.3;margin-bottom:3px;}',
    '.rk-tool span span{display:block;font-size:15px;line-height:1.45;color:var(--tx2);}',
    '.potasyum{--c:var(--potasyum)}.kobalt{--c:var(--kobalt)}.bakir{--c:var(--bakir)}.sodyum{--c:var(--sodyum)}.lityum{--c:var(--lityum)}',
    '.rk-foot{border-top:1px solid var(--br);padding:28px 0 calc(env(safe-area-inset-bottom,0px) + 36px);color:var(--tx3);font-size:14.5px;}',

    /* ---------- Ana sayfa: kimyamed renkleri (açık zemin) ----------
       Yalnızca ana sayfa açıkken geçerli; diğer ekranlar koyu kalır. */
    'html{--bg:#FBF8F5;--sf:#FFFFFF;--sf2:#F4EFEA;--br:#E7E0D9;--br2:#D9D0C7;',
    '--tx:#14110F;--tx2:#5C554F;--tx3:#7A726B;--ac:#F85300;--ac2:#C54200;--ac3:#A33700;',
    '--kobalt:#F85300;--bakir:#0B5C8A;--sodyum:#1B6B4A;--potasyum:#5B3A8C;--lityum:#B42318;}',
    'html,body{background:#FBF8F5!important;color:#14110F;}',
    'html header{background:rgba(251,248,245,.94)!important;border-bottom-color:#E7E0D9!important;}',
    'html header .logo{-webkit-text-fill-color:#14110F!important;color:#14110F!important;}',
    'html header .logo-sub{-webkit-text-fill-color:#5C554F!important;}',
    'html .hmb:hover,html #mn button:hover{background:#F4EFEA!important;}',
    'html .rk-btn-primary{background:#14110F;color:#fff;}',
    'html .rk-btn-primary:hover{background:#F85300;}',
    'html .rk-btn-ghost{background:#fff;}',
    'html .rk-ico{background:color-mix(in srgb,var(--c) 10%,#fff);}',
    'html .rk-tool:hover{background:#fff;}',
    'html .rk-search{background:#fff;}',
    'html .rk-tile{border-color:#E7E0D9;}',
    'html #s-home .card{background:#fff!important;border-color:#E7E0D9!important;}',
    'html #s-home [style*="color:#fff"]:not(.rp-slide *){color:#14110F!important;}',
    'html ::selection{background:#FFF1E9;}',

    '@media (max-width:820px){.rk-hero .rk-wrap{grid-template-columns:1fr}.rk-el{justify-self:stretch;max-width:440px;width:100%}',
    /* Telefonda günün elementi: kısa, yatay kart */
    '.rk-tile{aspect-ratio:auto;grid-template-columns:auto 1fr;grid-template-rows:auto auto;column-gap:20px;row-gap:6px;padding:20px 20px 18px;border-radius:16px;}',
    '.rk-sym{grid-column:1;grid-row:1/3;align-self:center;font-size:72px;min-width:1.3em;}',
    '.rk-tile-top{grid-column:2;grid-row:1;font-size:15px;}',
    '.rk-tile > span:last-child{grid-column:2;grid-row:2;align-self:end;}',
    '.rk-name{font-size:22px;}',
    '.rk-facts{margin-top:10px;}',
    '.rk-hero{padding-bottom:20px;}}',
    '@media (max-width:560px){.rk-tools{grid-template-columns:1fr}.rk-jump{display:none}}',
    /* Akıllı tahta ve büyük ekran */
    '@media (min-width:1600px){#s-home{--rk-w:1400px;zoom:1.12}}',
    '@media (prefers-reduced-motion:reduce){.rk-fade{animation:none}.rk-tile{transition:none}}'
  ].join('');

  function injectHead() {
    if (document.getElementById('rk-tema-css')) return;
    /* Ortak renk değişkenlerini (--sf2 vb.) kullanmayan sayfalar kendi zeminini korur */
    try {
      if (!getComputedStyle(document.documentElement).getPropertyValue('--sf2').trim())
        document.documentElement.classList.add('rk-lite');
      /* Sayfa zaten açık renkliyse (ör. Gaz Laboratuvarı) renk dönüştürücü çalışmaz */
      var bgc = getComputedStyle(document.body).backgroundColor;
      var mm = bgc.match(/\d+(\.\d+)?/g);
      if (mm && mm.length >= 3 && (mm.length < 4 || +mm[3] > 0) && (+mm[0] + +mm[1] + +mm[2]) / 3 > 180) {
        window.__rkPageLight = true;
        document.documentElement.classList.add('rk-pagelight');
      }
    } catch (e) {}
    var f = document.createElement('link');
    f.rel = 'stylesheet';
    f.href = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700;12..96,800&family=IBM+Plex+Sans:wght@400;500;600&display=swap';
    document.head.appendChild(f);
    var st = document.createElement('style');
    st.id = 'rk-tema-css';
    st.textContent = CSS;
    document.head.appendChild(st);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', '#FBF8F5');
  }

  /* ---------- 4. ANA SAYFA ---------- */
  function trGroup(g) {
    if (!g) return '';
    if (g <= 2) return g + 'A';
    if (g >= 13) return (g - 10) + 'A';
    if (g <= 7) return g + 'B';
    if (g <= 10) return '8B';
    return (g - 10) + 'B';
  }
  function fmtMass(m) {
    if (typeof m !== 'number') return '';
    if (m % 1 === 0) return '(' + m + ')';   /* kararsız elementler: en kararlı izotopun kütle numarası */
    var s = m >= 100 ? m.toFixed(2) : m.toFixed(3);
    return s.replace('.', ',');
  }
  function catColor(cat) {
    try {
      if (typeof CAT_COLORS2 !== 'undefined' && CAT_COLORS2[cat] && CAT_COLORS2[cat].border) return CAT_COLORS2[cat].border;
    } catch (e) {}
    return 'var(--kobalt)';
  }
  function elementList() {
    try { if (typeof ELS !== 'undefined' && ELS.length) return ELS; } catch (e) {}
    return [];
  }
  var curEl = 0;
  function showElement(n, animate) {
    var list = elementList();
    var el = null;
    for (var i = 0; i < list.length; i++) if (list[i].n === n) { el = list[i]; break; }
    var box = document.getElementById('rk-el');
    if (!el || !box) { if (box) box.style.display = 'none'; return; }
    var d = {};
    try { d = (typeof EL_DATA !== 'undefined' && EL_DATA[n]) || {}; } catch (e) {}
    curEl = n;
    var $ = function (id) { return document.getElementById(id); };
    $('rk-z').textContent = n;
    $('rk-m').textContent = fmtMass(el.mass);
    $('rk-sym').textContent = el.sym;
    $('rk-nm').textContent = el.name;
    $('rk-ct').textContent = el.cat || '';
    $('rk-ec').textContent = d.conf || '—';
    var pos = [];
    if (d.period) pos.push(d.period + '. periyot');
    var fblock = (n >= 57 && n <= 71) || (n >= 89 && n <= 103);
    if (fblock) pos.push('f bloku');
    else if (d.group) pos.push(trGroup(d.group) + ' grubu');
    $('rk-pos').textContent = pos.join(', ') || '—';
    $('rk-tile').style.setProperty('--rk-cat', catColor(el.cat));
    if (animate) {
      var s = $('rk-sym');
      s.classList.remove('rk-fade'); void s.offsetWidth; s.classList.add('rk-fade');
    }
  }

  function homeHTML() {
    var total = 0;
    GROUPS.forEach(function (g) { total += g.items.length; });

    var h = '';
    h += '<section class="rk-hero"><div class="rk-wrap">';
    h += '<div>';
    h += '<h1 class="rk-h1">Lise kimyasının çalışma masası.</h1>';
    h += '<p class="rk-lead">MEB konu anlatımları ve çözümlü sorular, hesaplayıcılar, 3D laboratuvar ve YKS araçları. Toplam ' + total + ' ekran, telefonda da akıllı tahtada da.</p>';
    h += '<div class="rk-actions">';
    h += '<button class="rk-btn rk-btn-primary" type="button" data-jump="rk-ders">Konu anlatımlarına git</button>';
    h += '<button class="rk-btn rk-btn-ghost" type="button" data-nav="pt">Periyodik tabloyu aç</button>';
    h += '</div></div>';

    h += '<figure class="rk-el" id="rk-el" style="margin:0">';
    h += '<button class="rk-tile" id="rk-tile" type="button" aria-label="Başka bir element göster">';
    h += '<span class="rk-tile-top"><span id="rk-z"></span><span id="rk-m"></span></span>';
    h += '<span class="rk-sym" id="rk-sym"></span>';
    h += '<span><span class="rk-name" id="rk-nm"></span><span class="rk-cat" id="rk-ct"></span></span>';
    h += '</button>';
    h += '<dl class="rk-facts"><div><dt>Elektron dizilimi</dt><dd id="rk-ec"></dd></div><div><dt>Tablodaki yeri</dt><dd id="rk-pos"></dd></div></dl>';
    h += '<figcaption class="rk-el-foot"><span>Günün elementi. Dokun, başkası gelsin.</span>';
    h += '<button class="rk-link" type="button" id="rk-detail">Ayrıntılar</button></figcaption>';
    h += '</figure>';
    h += '</div></section>';

    /* Portal (duyuru kaydırıcısı, haftanın sorusu, galeri) buraya yerleşir */
    h += '<div class="pw rk-portal"></div>';

    h += '<div class="rk-wrap"><div class="rk-finder">';
    h += '<label class="rk-search">' + icon('search') + '<input id="rk-q" type="search" placeholder="Ara: mol, redoks, alev…" aria-label="Ekran ara" autocomplete="off"></label>';
    h += '<nav class="rk-jump" aria-label="Gruplar">';
    GROUPS.forEach(function (g) {
      h += '<button type="button" class="' + g.color + '" data-jump="' + g.id + '"><i></i>' + g.title + '</button>';
    });
    h += '</nav></div>';
    h += '<p class="rk-empty" id="rk-empty">Bu adla bir ekran bulunamadı. "mol", "gaz" ya da "test" gibi bir kelime dene.</p></div>';

    GROUPS.forEach(function (g) {
      h += '<section class="rk-group ' + g.color + '" id="' + g.id + '"><div class="rk-wrap">';
      h += '<div class="rk-ghead"><h2 class="rk-h2">' + g.title + '</h2><p>' + g.sub + '</p></div>';
      h += '<ul class="rk-tools">';
      g.items.forEach(function (it) {
        h += '<li><button class="rk-tool" type="button" data-nav="' + it[0] + '">';
        h += '<span class="rk-ico">' + icon(it[3]) + '</span>';
        h += '<span><b>' + it[1] + '</b><span>' + it[2] + '</span></span></button></li>';
      });
      h += '</ul></div></section>';
    });

    h += '<footer class="rk-foot"><div class="rk-wrap">Ronya Kimya, Medeni Gökalp tarafından hazırlanıyor. <span style="opacity:.6">Tema ' + TEMA_SURUM + '</span></div></footer>';
    return h;
  }

  function buildHome() {
    var home = document.getElementById('s-home');
    if (!home || home.getAttribute('data-rk') === '1') return;
    home.setAttribute('data-rk', '1');
    home.innerHTML = homeHTML();

    home.addEventListener('click', function (e) {
      var t = e.target.closest('[data-nav],[data-jump]');
      if (!t) return;
      var jump = t.getAttribute('data-jump');
      if (jump) {
        var sec = document.getElementById(jump);
        if (sec) {
          var y = sec.getBoundingClientRect().top + window.pageYOffset - 70;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
        return;
      }
      var id = t.getAttribute('data-nav');
      if (id.indexOf('EXT:') === 0) { window.open(id.slice(4), '_blank'); return; }
      if (id.indexOf('URL:') === 0) { location.href = id.slice(4); return; }
      if (typeof window.nav === 'function') window.nav(id);
    });

    /* Günün elementi: eski sistemle aynı formül, aynı gün aynı element */
    var day = Math.floor(Date.now() / 86400000);
    showElement(((day * 37) % 118) + 1, false);
    document.getElementById('rk-tile').addEventListener('click', function () {
      showElement(Math.floor(Math.random() * 118) + 1, true);
    });
    document.getElementById('rk-detail').addEventListener('click', function () {
      if (typeof window.openElDetail === 'function') window.openElDetail(curEl);
    });

    /* Arama */
    var q = document.getElementById('rk-q');
    var norm = function (s) { return s.toLocaleLowerCase('tr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i'); };
    q.addEventListener('input', function () {
      var t = norm(q.value.trim()), any = false;
      home.querySelectorAll('.rk-group').forEach(function (g) {
        var n = 0;
        g.querySelectorAll('.rk-tools li').forEach(function (li) {
          var hit = !t || norm(li.textContent).indexOf(t) !== -1;
          li.hidden = !hit; if (hit) n++;
        });
        g.hidden = n === 0; if (n) any = true;
      });
      document.getElementById('rk-empty').style.display = any ? 'none' : 'block';
    });
  }

  /* ---------- 5. EMOJİ TEMİZLİĞİ ----------
     Başlık, buton ve sekmelerin BAŞINDAKİ emojiyi kaldırır.
     Yalnızca emojiden oluşan butonlara (ör. ses düğmesi) dokunmaz.  */
  var EMO;
  try { EMO = new RegExp('^(?:[\\p{Extended_Pictographic}\\u{1F1E6}-\\u{1F1FF}\\uFE0F\\u200D\\u20E3]|[0-9#*]\\uFE0F?\\u20E3)+\\s*', 'u'); }
  catch (e) { EMO = null; }
  var TARGETS = 'h1,h2,h3,h4,h5,.ptitle,button,.tab,.ltab,.slbl,.rp-section-title,label,.logo,.test-baslik,.panel-baslik,.org-tablo-baslik,.kesif-baslik';

  function stripOne(el) {
    if (!EMO || el.closest('.rk-tile,svg,canvas,#pt-real-grid')) return;
    var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false), node;
    while ((node = w.nextNode())) {
      if (!node.nodeValue.trim()) continue;
      var v = node.nodeValue.replace(/^\s+/, '');
      if (!EMO.test(v)) return;
      var rest = v.replace(EMO, '');
      var full = el.textContent.replace(EMO, '').trim();
      if (full.replace(EMO, '').length < 2) return;
      node.nodeValue = rest;
      return;
    }
  }
  function stripIn(root) {
    if (!root || root.nodeType !== 1) return;
    if (root.matches && root.matches(TARGETS)) stripOne(root);
    var list = root.querySelectorAll ? root.querySelectorAll(TARGETS) : [];
    for (var i = 0; i < list.length; i++) stripOne(list[i]);
  }
  var pending = [], timer = null;
  function queue(n) {
    pending.push(n);
    if (!timer) timer = setTimeout(function () {
      var p = pending; pending = []; timer = null;
      for (var i = 0; i < p.length; i++) stripIn(p[i]);
      fixMenu();
      fixTitles();
    }, 60);
  }
  function watch() {
    if (!window.MutationObserver) return;
    new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        if (m.target.nodeType === 1 && m.target.closest && m.target.closest(TARGETS)) queue(m.target.closest(TARGETS));
        for (var j = 0; j < m.addedNodes.length; j++) if (m.addedNodes[j].nodeType === 1) queue(m.addedNodes[j]);
      }
    }).observe(document.body, { childList: true, subtree: true });
  }

  /* ---------- 6. MENÜ VE ÜST BAR ---------- */
  function fixMenu() {
    var mn = document.getElementById('mn');
    if (!mn) return;
    if (!mn.querySelector('.rk-mn-top')) {
      mn.insertAdjacentHTML('afterbegin',
        '<div class="rk-mn-top"><b>Menü</b><button type="button" class="rk-mn-close" aria-label="Menüyü kapat" onclick="toggleMenu()">' + icon('close') + '</button></div>');
    }
    var ext = mn.querySelectorAll('button[onclick*="window.open"]');
    for (var i = 0; i < ext.length; i++) {
      ext[i].style.removeProperty('background');
      ext[i].style.removeProperty('color');
      ext[i].style.removeProperty('font-weight');
    }
    var hdrs = mn.querySelectorAll('.mn-grp-hdr');
    for (var k = 0; k < hdrs.length; k++) hdrs[k].style.removeProperty('background');
  }
  /* Başlığı içeriğin altında kalan ekranlarda (ör. Redoks) başlığı üste al */
  function fixTitles() {
    var ts = document.querySelectorAll('.pw > .ptitle');
    for (var i = 0; i < ts.length; i++) {
      var t = ts[i], par = t.parentNode;
      if (!t.previousElementSibling || t.getAttribute('data-rk-moved')) continue;
      var sub = t.nextElementSibling && t.nextElementSibling.classList.contains('psub') ? t.nextElementSibling : null;
      t.setAttribute('data-rk-moved', '1');
      par.insertBefore(t, par.firstChild);
      if (sub) par.insertBefore(sub, t.nextSibling);
    }
  }
  /* Sayfaların kendi CSS'indeki BÜYÜK HARF etiketleri normal yazıya çevir */
  function fixUppercase() {
    var sheets = document.styleSheets;
    for (var i = 0; i < sheets.length; i++) {
      var rules;
      try { rules = sheets[i].cssRules; } catch (e) { continue; }
      if (!rules) continue;
      for (var j = 0; j < rules.length; j++) {
        var st = rules[j].style;
        if (st && st.textTransform === 'uppercase') { st.textTransform = 'none'; st.letterSpacing = '0'; }
      }
    }
  }
  /* Üst bardaki logo: yazısız, şeffaf zeminli figür (medeni gökalp işareti) */
  var LOGO_MARK = 'data:image/png;base64,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';
  function fixLogo() {
    var imgs = document.querySelectorAll('img[src*="icon.10.png"]');
    for (var i = 0; i < imgs.length; i++) {
      var im = imgs[i];
      var top = im.getBoundingClientRect().top + (window.pageYOffset || 0);
      if (top > 160) continue;
      im.src = LOGO_MARK;
      im.alt = 'Ronya Kimya';
      im.classList.add('rk-logo-mark');
      im.removeAttribute('style');
    }
  }
  function fixHeader() {
    var b = document.querySelector('header .hmb');
    if (b && !b.querySelector('svg')) {
      b.innerHTML = icon('menu');
      b.setAttribute('aria-label', 'Menüyü aç');
    }
    /* Ayrı sayfalarda sağ üstteki ☰ aslında ana sayfaya dönüyor: adını doğru koy */
    if (!b) {
      var btns = document.querySelectorAll('button[onclick*="index.html"]');
      for (var i = 0; i < btns.length; i++) {
        var h = btns[i], t = h.textContent.trim();
        var top = h.getBoundingClientRect().top + (window.pageYOffset || 0);
        if (top < 140 && (t === '☰' || /ana sayfa/i.test(t))) { h.className = 'rk-homebtn'; h.removeAttribute('style'); h.textContent = 'Ana sayfa'; }
      }
      /* Ana sayfaya hiç dönüş yolu olmayan sayfalara üst bar ekle */
      if (!document.getElementById('s-home') && !document.querySelector('[onclick*="index.html"],a[href*="index.html"]')) {
        document.body.insertAdjacentHTML('afterbegin',
          '<div class="rk-topbar"><a href="index.html"><img src="icon.10.png" alt="">Ronya Kimya</a><a class="rk-homebtn" href="index.html">Ana sayfa</a></div>');
      }
    }
  }

  /* ---------- 7. AÇIK RENK DÖNÜŞTÜRÜCÜ ----------
     Eski kodda elle yazılmış koyu tema renklerini (CSS kuralları, satır içi
     stiller, SVG renkleri) açık temaya çevirir. Her rengi aynı kurala göre
     çevirdiği için renkler arasındaki karşıtlık korunur.
     Kapatmak için: LIGHT = false                                          */
  var LIGHT = true;
  var cache = {};
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function rgb2hsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), h = 0, s = 0, l = (mx + mn) / 2, d = mx - mn;
    if (d) {
      s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
      h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h *= 60;
    }
    return [h, s, l];
  }
  function hsl2rgb(h, s, l) {
    h = ((h % 360) + 360) % 360 / 360;
    if (!s) return [l * 255, l * 255, l * 255];
    var q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    function f(t) { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; }
    return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
  }
  function lum(rgb) {
    var c = rgb.map(function (v) { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); });
    return .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
  }
  function parse(tok) {
    tok = tok.toLowerCase();
    if (tok === 'white') return [255, 255, 255, 1];
    if (tok === 'black') return [0, 0, 0, 1];
    if (tok[0] === '#') {
      var x = tok.slice(1);
      if (x.length === 3 || x.length === 4) x = x.split('').map(function (c) { return c + c; }).join('');
      if (x.length !== 6 && x.length !== 8) return null;
      return [parseInt(x.slice(0, 2), 16), parseInt(x.slice(2, 4), 16), parseInt(x.slice(4, 6), 16), x.length === 8 ? parseInt(x.slice(6, 8), 16) / 255 : 1];
    }
    var m = tok.match(/rgba?\(([^)]*)\)/);
    if (m) {
      var p = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat);
      if (p.length < 3) return null;
      return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
    }
    var hm = tok.match(/hsla?\(([^)]*)\)/);
    if (hm) {
      var q = hm[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat);
      var rgb = hsl2rgb(q[0], q[1] / 100, q[2] / 100);
      return [rgb[0], rgb[1], rgb[2], q.length > 3 ? q[3] : 1];
    }
    return null;
  }
  function out(h, s, l, a) {
    var c = hsl2rgb(h, clamp(s, 0, 1), clamp(l, 0, 1));
    var r = Math.round(c[0]), g = Math.round(c[1]), b = Math.round(c[2]);
    return a < 1 ? 'rgba(' + r + ',' + g + ',' + b + ',' + (+a.toFixed(3)) + ')' : 'rgb(' + r + ',' + g + ',' + b + ')';
  }
  function darkenTo(h, s, l, target) {
    var i = 0;
    while (lum(hsl2rgb(h, s, l)) > target && l > .05 && i++ < 60) l -= .015;
    return l;
  }
  /* mode: bg | text | border | shadow | shape | any ; onDeep: yazı koyu renkli zemin üstünde */
  function conv(c, mode, onDeep) {
    var r = c[0], g = c[1], b = c[2], a = c[3];
    var hsl = rgb2hsl(r, g, b), h = hsl[0], s = hsl[1], l = hsl[2];
    var chroma = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
    var neutral = chroma < .16;
    if (!neutral && chroma >= .3 && h >= 224 && h <= 252) { h = 20; }   /* eski çivit vurgu → turuncu */
    if (mode === 'shadow') return 'rgba(20,17,15,' + (+(a * .45).toFixed(3)) + ')';
    if (neutral) {
      if (mode === 'text') {
        if (onDeep) return a < 1 ? 'rgba(255,255,255,' + a + ')' : '#fff';
        if (l < .3) return out(30, .08, l, a);               /* koyu yazı açık zemindeydi, kalsın */
        return out(30, .07, Math.min(1 - l, .5), a);
      }
      if (mode === 'border') return out(30, .18, a < .5 ? 1 - l : clamp(1 - l, .72, .9), a);
      if (mode === 'bg' && l > .9 && a >= .9) return out(30, .3, l, a);   /* bilerek beyaz yapılmış alanlar */
      if (mode === 'bg' && l > .8 && a < .3) return 'rgba(20,17,15,' + (+(a * .55).toFixed(3)) + ')';   /* hafif açık örtü → hafif gölge */
      if (l < .22) return out(30, .43, .965 + (l / .22) * .035, a);
      return out(30, .12, 1 - l, a);
    }
    if (mode === 'shape') return out(h, s, l, a);
    if (mode === 'text') return out(h, s, darkenTo(h, s, l, .18), a);
    if (mode === 'border') {
      if (l < .25) return out(h, s * .5, .82, a);
      return out(h, s, lum(hsl2rgb(h, s, l)) > .35 ? darkenTo(h, s, l, .3) : l, a);
    }
    /* bg ve any */
    if (l < .4) return out(h, s * .55, Math.max(.9, 1 - l), a);    /* koyu renkli panel → açık renkli zemin */
    if (a >= .6 || mode === 'any') return out(h, s, darkenTo(h, s, l, .18), a);   /* düğmeler: yazı beyaz okunsun */
    return out(h, s, l, a);                                           /* hafif renkli zemin olduğu gibi */
  }
  var TOK = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|\b(?:white|black)\b/g;
  function convValue(v, mode, onDeep) {
    var key = mode + (onDeep ? '!' : '') + v;
    if (cache[key] !== undefined) return cache[key];
    var res = v.replace(TOK, function (t) { var c = parse(t); return c ? conv(c, mode, onDeep) : t; });
    cache[key] = res;
    return res;
  }
  function modeOf(prop, el) {
    if (prop.indexOf('--') === 0) return 'any';
    if (prop.indexOf('shadow') !== -1) return 'shadow';
    if (prop.indexOf('background') !== -1) return 'bg';
    if (prop === 'fill' || prop === 'stroke' || prop === 'stop-color' || prop === 'flood-color') {
      if (el && /^(text|tspan|textPath)$/i.test(el.tagName) && prop === 'fill') return 'text';
      return 'shape';
    }
    if (prop === 'color' || prop === '-webkit-text-fill-color' || prop === 'caret-color' || prop === 'text-decoration-color') return 'text';
    if (prop.indexOf('border') !== -1 || prop.indexOf('outline') !== -1 || prop.indexOf('column-rule') !== -1) return 'border';
    return null;
  }
  var DEEPVAR = /var\(--(ac|gr|rd|yw|cy)\)/;
  function isDeep(bgVal) {
    if (!bgVal) return false;
    if (DEEPVAR.test(bgVal)) return true;
    var toks = bgVal.match(TOK) || [];
    for (var i = 0; i < toks.length; i++) {
      var c = parse(toks[i]); if (!c) continue;
      var chroma = (Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2])) / 255;
      if (chroma >= .16 && c[3] >= .6 && rgb2hsl(c[0], c[1], c[2])[2] >= .4) return true;
    }
    return false;
  }
  /* Bir stil bloğunu (CSS kuralı ya da satır içi stil) dönüştür */
  function convDecl(st, el, done) {
    var props = [];
    for (var i = 0; i < st.length; i++) props.push(st[i]);
    var deep = isDeep(st.getPropertyValue('background-color')) || isDeep(st.getPropertyValue('background-image'));
    for (var k = 0; k < props.length; k++) {
      var p = props[k], v = st.getPropertyValue(p);
      if (!v || !TOK.test(v)) { TOK.lastIndex = 0; continue; }
      TOK.lastIndex = 0;
      if (done && done[p] === v) continue;               /* zaten bizim çevirdiğimiz değer */
      var mode = modeOf(p, el);
      if (!mode) continue;
      var nv = convValue(v, mode, deep && mode === 'text');
      if (nv !== v) st.setProperty(p, nv, st.getPropertyPriority(p));
      if (done) done[p] = st.getPropertyValue(p);
    }
  }
  var doneSheets = typeof WeakSet !== 'undefined' ? new WeakSet() : null;
  function convRules(rules) {
    for (var i = 0; i < rules.length; i++) {
      var r = rules[i];
      try {
        if (r.style) convDecl(r.style, null, null);
        if (r.cssRules) convRules(r.cssRules);
      } catch (e) {}
    }
  }
  function convSheets() {
    var ss = document.styleSheets;
    for (var i = 0; i < ss.length; i++) {
      var sh = ss[i];
      if (doneSheets && doneSheets.has(sh)) continue;
      if (sh.ownerNode && (sh.ownerNode.id === 'rk-tema-css')) continue;
      var rules; try { rules = sh.cssRules; } catch (e) { continue; }
      if (!rules) continue;
      convRules(rules);
      if (doneSheets) doneSheets.add(sh);
    }
  }
  var doneEl = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
  function convEl(el) { try { convEl2(el); } catch (e) {} }
  function convEl2(el) {
    if (el.closest && el.closest('.rk-tile,.rk-ico,#rk-tema-css')) return;
    var done = doneEl ? (doneEl.get(el) || {}) : {};
    if (el.hasAttribute('style')) convDecl(el.style, el, done);
    if (el instanceof SVGElement) {
      ['fill', 'stroke', 'stop-color'].forEach(function (a) {
        var v = el.getAttribute(a);
        if (!v || done['@' + a] === v) return;
        var nv = convValue(v, modeOf(a, el), false);
        if (nv !== v) el.setAttribute(a, nv);
        done['@' + a] = el.getAttribute(a);
      });
    }
    if (el.tagName === 'CANVAS' && !el.getAttribute('data-rk-cv')) {
      /* tuval çizimleri koyu zemine göre yapılmış: koyu bir ekran gibi kalsın */
      el.setAttribute('data-rk-cv', '1');
      var cs = getComputedStyle(el);
      if (cs.position !== 'absolute' && /rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor)) {
        el.style.backgroundColor = '#14110F';
        if (!el.style.borderRadius) el.style.borderRadius = '12px';
        done['background-color'] = el.style.getPropertyValue('background-color');
      }
    }
    if (doneEl) doneEl.set(el, done);
  }
  function convTree(root) {
    if (!root || root.nodeType !== 1) return;
    if (root.tagName === 'STYLE' || root.tagName === 'LINK') { setTimeout(convSheets, 0); return; }
    convEl(root);
    var list = root.querySelectorAll('[style],svg [fill],svg [stroke],stop,canvas,style');
    for (var i = 0; i < list.length; i++) {
      if (list[i].tagName === 'STYLE') { setTimeout(convSheets, 0); continue; }
      convEl(list[i]);
    }
  }
  function startLight() {
    if (!LIGHT || window.__rkPageLight) return;
    convSheets();
    convTree(document.body);
    if (!window.MutationObserver) return;
    new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        if (m.type === 'attributes') { if (m.target.nodeType === 1) convEl(m.target); continue; }
        for (var j = 0; j < m.addedNodes.length; j++) convTree(m.addedNodes[j]);
      }
    }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'fill', 'stroke', 'stop-color'] });
  }

  /* ---------- BAŞLAT ---------- */
  injectHead();
  buildHome();          // eklenti ve portal çalışmadan ÖNCE ana sayfayı kur
  function safe(fn) { try { fn(); } catch (e) { if (window.console) console.warn('ronya-tema:', e); } }
  function start() {
    safe(startLight);
    safe(fixHeader);
    safe(fixLogo);
    safe(fixUppercase);
    safe(fixMenu);
    safe(function () { stripIn(document.body); });
    safe(fixTitles);
    safe(watch);
    /* eklenti element verisini zenginleştirdikten sonra kartı yeniden çiz */
    showElement(curEl || (((Math.floor(Date.now() / 86400000)) * 37) % 118) + 1, false);
    setTimeout(function () { showElement(curEl, false); }, 1200);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
