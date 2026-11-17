/* Sanal Laboratuvar · elektroliz (lab-elektroliz.js)
   Erimiş tuzların, suyun ve (ek konu) sulu çözeltilerin elektrolizi: katotta ve anotta ne oluşur,
   kaç mol, kaç gram, kaç litre (NŞ) oluşur? Akım, süre, yük ve ürün miktarı birbirine bağlıdır:
   birini değiştirince ötekiler güncellenir. lab-arayuz.js'ten sonra yüklenir; 3D tezgâh
   (lab-3d.js) varsa düzeneği orada canlandırır, yoksa basit bir 2D çizim gösterir. */
(function () {
  'use strict';
  var LA = window.LabArayuz, M = window.LabMotor;
  if (!LA || !M) return;
  var Y = M.yaz, h = LA.h;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  var F = 96500, VM = 22.4;

  /* ================= SAYI YAZIMI ================= */
  var UST = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
  function us(n) { return String(n).split('').map(function (c) { return UST[c] || c; }).join(''); }
  function binlik(s) { var p = s.split(','); if (p[0].replace('−', '').length > 4) p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' '); return p.join(','); }
  /* n anlamlı basamak, Türkçe ondalık virgül */
  function anl(x, n) {
    n = n || 3;
    if (!isFinite(x)) return '–';
    if (Math.abs(x) < 1e-12) return '0';
    var a = Math.abs(x);
    if (a < 1e-4) { var e = Math.floor(Math.log(a) / Math.LN10), m = x / Math.pow(10, e); if (Math.abs(m) >= 9.995) { m /= 10; e++; } return Y.tr(m, n - 1) + '·10' + us(e); }
    var d = Math.max(0, n - 1 - Math.floor(Math.log(a) / Math.LN10 + 1e-9));
    return binlik(Y.tr(x, Math.min(d, 6)));
  }
  function sayiOku(x) { var v = parseFloat(String(x).replace(/\s| /g, '').replace(',', '.')); return isFinite(v) ? v : NaN; }
  function sayiYaz(v) {
    if (!isFinite(v)) return '–';
    if (Math.abs(v) >= 1000) return String(Math.round(v));
    var d = Math.max(0, 3 - Math.floor(Math.log(Math.abs(v) || 1) / Math.LN10)), t = Y.tr(v, Math.min(d, 5));
    if (t.indexOf(',') >= 0) t = t.replace(/0+$/, '').replace(/,$/, '');
    return t;
  }
  /* kaydırıcı + sayı kutusu (LabArayuz.ayarHtml'in tam sayı yazan eşi) */
  function ayarHtml(ad, cfg) {
    var cips = (cfg.cip || []).filter(function (x) { return x >= cfg.min - 1e-12 && x <= cfg.max + 1e-12; });
    return '<div class="ayar" data-ayar="' + ad + '"><div class="ayar-ust"><label for="lb-a-' + ad + '">' + cfg.etiket + '</label>' +
      '<span class="ayar-sayi"><input id="lb-a-' + ad + '" type="text" inputmode="decimal" autocomplete="off" value="' + sayiYaz(cfg.v) + '"><span>' + h(cfg.birim) + '</span></span></div>' +
      '<input type="range" min="0" max="1000" step="1" aria-label="' + h(cfg.etiket.replace(/<[^>]+>/g, '')) + '" data-kay="' + ad + '">' +
      (cfg.altYazi ? '<div class="ayar-alt">' + cfg.altYazi + '</div>' : '') +
      (cips.length ? '<div class="ayar-cip">' + cips.map(function (x) { return '<button type="button" data-cip="' + ad + '" data-v="' + x + '">' + sayiYaz(x) + ' ' + h(cfg.birim) + '</button>'; }).join('') + '</div>' : '') + '</div>';
  }
  function sureYaz(s) {
    s = Math.round(s);
    var sa = Math.floor(s / 3600), dk = Math.floor((s % 3600) / 60), sn = s % 60, p = [];
    if (sa) p.push(sa + ' sa'); if (dk) p.push(dk + ' dk'); if (sn || !p.length) p.push(sn + ' s');
    return p.join(' ');
  }
  function saatYaz(s) {
    s = Math.max(0, Math.floor(s));
    var sa = Math.floor(s / 3600), dk = Math.floor((s % 3600) / 60), sn = s % 60;
    return (sa ? sa + ':' + (dk < 10 ? '0' : '') : '') + (dk < 10 && !sa ? '0' : '') + dk + ':' + (sn < 10 ? '0' : '') + sn;
  }
  function hacimYaz(L) { return L < 1 ? anl(L * 1000, 3) + ' mL' : anl(L, 3) + ' L'; }

  /* ================= ÜRÜNLER ================= */
  /* e: 1 mol ürün için gereken elektron (mol) ; tur: metal | gaz | cozunen | anotMetal */
  var U = {
    Na: { f: 'Na', ad: 'sodyum', M: 23, e: 1, tur: 'metal', renk: 0xd3d8de, yuzer: true },
    Mg: { f: 'Mg', ad: 'magnezyum', M: 24, e: 2, tur: 'metal', renk: 0xcdd2d7, yuzer: true },
    Al: { f: 'Al', ad: 'alüminyum', M: 27, e: 3, tur: 'metal', renk: 0xd8dce0, batar: true },
    Pb: { f: 'Pb', ad: 'kurşun', M: 207, e: 2, tur: 'metal', renk: 0x8d939a, batar: true },
    Cu: { f: 'Cu', ad: 'bakır', M: 64, e: 2, tur: 'metal', renk: 0xb8673a },
    Ag: { f: 'Ag', ad: 'gümüş', M: 108, e: 1, tur: 'metal', renk: 0xe4e7ea },
    H2: { f: 'H₂', ad: 'hidrojen gazı', M: 2, e: 2, tur: 'gaz', renk: 0xffffff },
    O2: { f: 'O₂', ad: 'oksijen gazı', M: 32, e: 4, tur: 'gaz', renk: 0xffffff },
    Cl2: { f: 'Cl₂', ad: 'klor gazı', M: 71, e: 2, tur: 'gaz', renk: 0xc9dc4a },
    Br2: { f: 'Br₂', ad: 'brom buharı', M: 160, e: 2, tur: 'gaz', renk: 0xa8481e },
    I2: { f: 'I₂', ad: 'iyot', M: 254, e: 2, tur: 'cozunen', renk: 0x8a4a16 },
    CuA: { f: 'Cu', ad: 'bakır anot (çözünür)', M: 64, e: 2, tur: 'anotMetal', renk: 0xb8673a }
  };
  var HAL = { k: 'katı', s: 'sıvı', g: 'gaz', suda: 'suda' };

  /* ================= ELEKTROLİTLER ================= */
  /* tuz: M (g/mol), kz: katyondan 1 formül birimi başına alınabilecek e⁻ (mol), az: halojenürden verilebilecek e⁻ */
  var GRUP = { erimis: 'Erimiş tuzlar', su: 'Suyun elektrolizi', sulu: 'Sulu çözeltiler (ek konu)' };
  var SU_IND = { u: 'H2', yari: '2H₂O(s) + 2e⁻ → H₂(g) + 2OH⁻(suda)', hal: 'g' };
  var H_IND = { u: 'H2', yari: '2H⁺(suda) + 2e⁻ → H₂(g)', hal: 'g' };
  var SU_YUK = { u: 'O2', yari: '2H₂O(s) → O₂(g) + 4H⁺(suda) + 4e⁻', hal: 'g' };
  var OH_YUK = { u: 'O2', yari: '4OH⁻(suda) → O₂(g) + 2H₂O(s) + 4e⁻', hal: 'g' };
  var EL = [
    { id: 'nacl_e', grup: 'erimis', ad: 'Erimiş NaCl', tam: 'Erimiş sodyum klorür', f: 'NaCl(s)', T: 801, elektrot: 'grafit elektrotlar',
      tuz: { M: 58.5, z: 1 }, mik: { kutle: 117 },
      kat: { u: 'Na', yari: 'Na⁺ + e⁻ → Na(s)', hal: 's' }, an: { u: 'Cl2', yari: '2Cl⁻ → Cl₂(g) + 2e⁻', hal: 'g' },
      net: '2NaCl(s) → 2Na(s) + Cl₂(g)',
      neden: 'Erimiş tuzda yalnızca Na⁺ ve Cl⁻ iyonları vardır. Na⁺ katotta elektron alarak sodyuma indirgenir; Cl⁻ anotta elektron vererek klor gazına yükseltgenir.',
      not: 'Sodyum metali ve klor gazı endüstride bu yolla üretilir. Erimiş sodyum tuzdan hafif olduğu için yüzeye çıkar.' },
    { id: 'mgcl2_e', grup: 'erimis', ad: 'Erimiş MgCl₂', tam: 'Erimiş magnezyum klorür', f: 'MgCl₂(s)', T: 714, elektrot: 'grafit elektrotlar',
      tuz: { M: 95, z: 2 }, mik: { kutle: 95 },
      kat: { u: 'Mg', yari: 'Mg²⁺ + 2e⁻ → Mg(s)', hal: 's' }, an: { u: 'Cl2', yari: '2Cl⁻ → Cl₂(g) + 2e⁻', hal: 'g' },
      net: 'MgCl₂(s) → Mg(s) + Cl₂(g)',
      neden: 'Mg²⁺ iyonu katotta iki elektron alarak magnezyuma indirgenir; Cl⁻ iyonları anotta yükseltgenerek klor gazı oluşturur.',
      not: 'Magnezyum metali, deniz suyundan elde edilen MgCl₂’nin bu yolla elektroliziyle üretilir.' },
    { id: 'al2o3_e', grup: 'erimis', ad: 'Erimiş Al₂O₃ (kriyolitli)', tam: 'Kriyolitte çözünmüş alüminyum oksit', f: 'Al₂O₃(s)', T: 950, elektrot: 'grafit elektrotlar',
      tuz: { M: 102, z: 6 }, mik: { kutle: 102 },
      kat: { u: 'Al', yari: 'Al³⁺ + 3e⁻ → Al(s)', hal: 's' }, an: { u: 'O2', yari: '2O²⁻ → O₂(g) + 4e⁻', hal: 'g' },
      net: '2Al₂O₃(s) → 4Al(s) + 3O₂(g)',
      neden: 'Al³⁺ katotta üç elektron alarak alüminyuma indirgenir ve dipte toplanır; oksit iyonu (O²⁻) anotta yükseltgenerek oksijen gazı oluşturur.',
      not: 'Kriyolit (Na₃AlF₆), Al₂O₃’ün erime sıcaklığını yaklaşık 2050 °C’den 950 °C’ye düşürür. Grafit anot, açığa çıkan oksijenle yanarak CO₂ oluşturduğu için zamanla aşınır.' },
    { id: 'pbbr2_e', grup: 'erimis', ad: 'Erimiş PbBr₂', tam: 'Erimiş kurşun(II) bromür', f: 'PbBr₂(s)', T: 373, elektrot: 'grafit elektrotlar',
      tuz: { M: 367, z: 2 }, mik: { kutle: 36.7 },
      kat: { u: 'Pb', yari: 'Pb²⁺ + 2e⁻ → Pb(s)', hal: 's' }, an: { u: 'Br2', yari: '2Br⁻ → Br₂(g) + 2e⁻', hal: 'g' },
      net: 'PbBr₂(s) → Pb(s) + Br₂(g)',
      neden: 'Pb²⁺ katotta kurşuna indirgenir; erimiş kurşun ağır olduğu için dibe çöker. Br⁻ anotta yükseltgenir ve kahverengi brom buharı çıkar.',
      not: 'Okul laboratuvarlarında çeker ocakta yapılan klasik bir elektroliz deneyidir; brom buharı zehirlidir.' },
    { id: 'su_h2so4', grup: 'su', ad: 'Su (az H₂SO₄ eklenmiş)', tam: 'Az miktar sülfürik asit eklenmiş su', f: 'H₂O(s)', elektrot: 'platin elektrotlar',
      tuz: null, mik: {},
      kat: H_IND, an: SU_YUK, net: '2H₂O(s) → 2H₂(g) + O₂(g)',
      neden: 'Saf su elektriği çok az iletir; eklenen az miktar H₂SO₄ iyon sağlar ama kendisi harcanmaz. Katotta hidrojen, anotta oksijen gazı çıkar.',
      not: 'Aynı sürede açığa çıkan H₂’nin hacmi O₂’nin iki katıdır (2 : 1).' },
    { id: 'cuso4', grup: 'sulu', ad: 'CuSO₄(suda)', tam: 'Bakır(II) sülfat çözeltisi', f: 'CuSO₄(suda)', elektrot: 'platin elektrotlar', renk: [80, 150, 235],
      tuz: { M: 160, kz: 2, az: 0, maks: 1.4 }, mik: { c: 1, V: 200 },
      kat: { u: 'Cu', yari: 'Cu²⁺(suda) + 2e⁻ → Cu(k)', hal: 'k' }, an: SU_YUK, kat2: H_IND, kIyon: 'Cu²⁺',
      net: '2CuSO₄(suda) + 2H₂O(s) → 2Cu(k) + O₂(g) + 2H₂SO₄(suda)', ph: 'azalır',
      neden: 'Cu²⁺ sudan daha kolay indirgenir: katotta bakır toplanır. SO₄²⁻ iyonu yükseltgenmez; anotta su yükseltgenir, O₂ çıkar ve ortam asidikleşir.' },
    { id: 'cucl2', grup: 'sulu', ad: 'CuCl₂(suda)', tam: 'Bakır(II) klorür çözeltisi', f: 'CuCl₂(suda)', elektrot: 'platin elektrotlar', renk: [70, 170, 190],
      tuz: { M: 135, kz: 2, az: 2, maks: 5 }, mik: { c: 1, V: 200 },
      kat: { u: 'Cu', yari: 'Cu²⁺(suda) + 2e⁻ → Cu(k)', hal: 'k' }, an: { u: 'Cl2', yari: '2Cl⁻(suda) → Cl₂(g) + 2e⁻', hal: 'g' }, kat2: SU_IND, an2: SU_YUK, kIyon: 'Cu²⁺', aIyon: 'Cl⁻',
      net: 'CuCl₂(suda) → Cu(k) + Cl₂(g)',
      neden: 'Cu²⁺ katotta bakıra indirgenir; Cl⁻ anotta klor gazına yükseltgenir. Cu²⁺ azaldıkça çözeltinin rengi açılır.' },
    { id: 'agno3', grup: 'sulu', ad: 'AgNO₃(suda)', tam: 'Gümüş nitrat çözeltisi', f: 'AgNO₃(suda)', elektrot: 'platin elektrotlar',
      tuz: { M: 170, kz: 1, az: 0, maks: 5 }, mik: { c: 0.5, V: 200 },
      kat: { u: 'Ag', yari: 'Ag⁺(suda) + e⁻ → Ag(k)', hal: 'k' }, an: SU_YUK, kat2: H_IND, kIyon: 'Ag⁺',
      net: '4AgNO₃(suda) + 2H₂O(s) → 4Ag(k) + O₂(g) + 4HNO₃(suda)', ph: 'azalır',
      neden: 'Ag⁺ çok kolay indirgenir: katotta gümüş toplanır (gümüş kaplama). NO₃⁻ iyonu yükseltgenmez; anotta su yükseltgenir ve O₂ çıkar.' },
    { id: 'nacl_s', grup: 'sulu', ad: 'NaCl(suda), derişik', tam: 'Derişik sodyum klorür çözeltisi', f: 'NaCl(suda)', elektrot: 'grafit elektrotlar',
      tuz: { M: 58.5, kz: 0, az: 1, maks: 5 }, mik: { c: 5, V: 200 },
      kat: SU_IND, an: { u: 'Cl2', yari: '2Cl⁻(suda) → Cl₂(g) + 2e⁻', hal: 'g' }, an2: OH_YUK, aIyon: 'Cl⁻',
      net: '2NaCl(suda) + 2H₂O(s) → 2NaOH(suda) + H₂(g) + Cl₂(g)', ph: 'artar',
      neden: 'Na⁺ aktif bir metalin iyonudur; suda indirgenmez, onun yerine su indirgenir (H₂ ve OH⁻ oluşur). Derişik çözeltide Cl⁻ yükseltgenir ve anotta klor gazı çıkar. Katot çevresi bazikleşir.',
      not: 'NaOH, H₂ ve Cl₂ endüstride bu yolla üretilir (klor-alkali yöntemi).' },
    { id: 'ki', grup: 'sulu', ad: 'KI(suda)', tam: 'Potasyum iyodür çözeltisi', f: 'KI(suda)', elektrot: 'platin elektrotlar',
      tuz: { M: 166, kz: 0, az: 1, maks: 5 }, mik: { c: 1, V: 200 },
      kat: SU_IND, an: { u: 'I2', yari: '2I⁻(suda) → I₂(k) + 2e⁻', hal: 'k' }, an2: OH_YUK, aIyon: 'I⁻',
      net: '2KI(suda) + 2H₂O(s) → 2KOH(suda) + H₂(g) + I₂(k)', ph: 'artar',
      neden: 'K⁺ suda indirgenmez; katotta su indirgenir. I⁻ kolayca yükseltgenir: anotta iyot oluşur ve anot çevresi kahverengileşir.' },
    { id: 'na2so4', grup: 'sulu', ad: 'Na₂SO₄(suda)', tam: 'Sodyum sülfat çözeltisi', f: 'Na₂SO₄(suda)', elektrot: 'platin elektrotlar',
      tuz: { M: 142, kz: 0, az: 0, maks: 1.5 }, mik: { c: 0.5, V: 200 },
      kat: SU_IND, an: SU_YUK, net: '2H₂O(s) → 2H₂(g) + O₂(g)',
      neden: 'Ne Na⁺ indirgenir ne de SO₄²⁻ yükseltgenir: iki elektrotta da su tepkimeye girer. Na₂SO₄ yalnızca çözeltinin iletkenliğini sağlar.' },
    { id: 'cuso4_cu', grup: 'sulu', ad: 'CuSO₄(suda) · bakır elektrotlar', tam: 'Bakır elektrotlarla bakır(II) sülfat (bakırın saflaştırılması)', f: 'CuSO₄(suda)', elektrot: 'bakır elektrotlar', renk: [80, 150, 235], bakir: true,
      tuz: { M: 160, kz: 2, az: 0, maks: 1.4 }, mik: { c: 1, V: 200, anot: 20 },
      kat: { u: 'Cu', yari: 'Cu²⁺(suda) + 2e⁻ → Cu(k)', hal: 'k' }, an: { u: 'CuA', yari: 'Cu(k) → Cu²⁺(suda) + 2e⁻', hal: 'k' },
      net: 'Cu(k, anot) → Cu(k, katot)',
      neden: 'Bakır anot kullanıldığında anotta su değil bakırın kendisi yükseltgenir. Anottan çözünen kadar bakır katotta toplanır; çözeltideki Cu²⁺ miktarı değişmez.',
      not: 'Bakırın saflaştırılması: saf olmayan bakır anot yapılır, katotta saf bakır toplanır. Anottaki değerli metaller anotun altında anot çamuru olarak birikir.' }
  ];

  /* ================= DURUM ================= */
  var S = { i: 0, I: 2, t: 965, mik: {}, calis: false, tg: 0, hiz: 0, surum: 1, canli: null, son: null, etiket: {} };
  function P() { return EL[S.i]; }
  function mikVarsay() { var p = P(), m = {}; for (var k in p.mik) m[k] = p.mik[k]; S.mik = m; }
  mikVarsay();
  S.P = P;
  LA.el = S;

  /* ================= HESAP ================= */
  function kapasite() {
    var p = P(), m = S.mik, inf = Infinity;
    if (p.grup === 'su') return { kat: inf, an: inf };
    if (p.grup === 'erimis') { var c = m.kutle / p.tuz.M * p.tuz.z; return { kat: c, an: c, birlikte: true }; }
    var ns = m.c * m.V / 1000;
    if (p.bakir) { var ca = m.anot / U.Cu.M * 2; return { kat: ca, an: ca, birlikte: true, anotBitti: true }; }
    return { kat: p.tuz.kz ? ns * p.tuz.kz : inf, an: p.tuz.az ? ns * p.tuz.az : inf };
  }
  function miktar(part, e) { var u = U[part.u], n = e / u.e; return { part: part, u: u, e: e, n: n, m: n * u.M, V: u.tur === 'gaz' ? n * VM : null }; }
  function hesapla(ne) {
    var K = kapasite(), r = { ne: ne, kat: [], an: [], K: K, tukendi: false };
    if (K.birlikte && ne > K.kat + 1e-12) { r.ne = ne = K.kat; r.tukendi = true; }
    var p = P();
    r.kat.push(miktar(p.kat, Math.min(ne, K.kat)));
    if (ne > K.kat + 1e-12 && p.kat2) r.kat.push(miktar(p.kat2, ne - K.kat));
    r.an.push(miktar(p.an, Math.min(ne, K.an)));
    if (ne > K.an + 1e-12 && p.an2) r.an.push(miktar(p.an2, ne - K.an));
    return r;
  }
  function Q() { return S.I * S.t; }

  /* ================= İSKELET ================= */
  var nav = $('.lab-sekme'), tiBolum = $('#m-titrasyon');
  if (!nav || !tiBolum) return;
  var sekB = document.createElement('button'); sekB.setAttribute('data-mod', 'elektroliz'); sekB.textContent = 'Elektroliz';
  var tiB = nav.querySelector('[data-mod="titrasyon"]'); nav.insertBefore(sekB, tiB ? tiB.nextSibling : null);
  sekB.addEventListener('click', function () { LA.modAc('elektroliz'); });
  var bolum = document.createElement('section'); bolum.className = 'mod'; bolum.id = 'm-elektroliz';
  tiBolum.parentNode.insertBefore(bolum, tiBolum.nextSibling);
  var ik = LA.ikon || function () { return ''; };
  bolum.innerHTML = '<div class="el">' +
    '<div class="kart el-kart"><div class="tezgah el-tezgah"><canvas id="lb-ecan" aria-label="Elektroliz düzeneği"></canvas><div class="el-etk" id="lb-eetk"></div></div>' +
    '<div class="el-canli" id="lb-ecanli"></div>' +
    '<div class="el-dug"><button type="button" class="ab ana el-calis" data-el="calis">' + ik('oynat') + '<span>Akımı aç</span></button>' +
    '<button type="button" class="ab" data-el="bas">' + ik('temiz') + '<span>Baştan</span></button></div>' +
    '<div class="el-hiz"><span>Hız</span><div class="ayar-cip" id="lb-ehiz"></div></div></div>' +
    '<div class="kart el-ayar-kart"><div class="panel-bas"><h2>Deney ayarları</h2></div><div class="ti-ayarlar">' +
    '<div class="ti-grup"><div class="ti-gb"><span class="ti-nok e"></span>Elektrolit</div><select id="lb-eelit" aria-label="Elektrolit"></select><div class="el-tanim" id="lb-etanim"></div><div id="lb-emik"></div></div>' +
    '<div class="ti-grup"><div class="ti-gb"><span class="ti-nok b"></span>Akım, süre ve yük</div><div id="lb-eakim"></div><div id="lb-esure"></div><div id="lb-eyuk"></div>' +
    '<div class="el-bilgi">Q = I · t &nbsp;·&nbsp; 1 mol e⁻ = 1 F = 96 500 C. Akımı, süreyi, yükü ya da aşağıdaki ürün kütlelerinden birini değiştir; ötekiler kendiliğinden hesaplanır.</div></div>' +
    '</div></div>' +
    '<div class="kart el-sonuc-kart"><div class="panel-bas"><h2>Elektrotlarda ne oluşur?</h2></div><div class="ti-sonuc el-sonuc" id="lb-esonuc"></div></div>' +
    '</div>';

  var sec = $('#lb-eelit');
  sec.innerHTML = Object.keys(GRUP).map(function (g) {
    return '<optgroup label="' + h(GRUP[g]) + '">' + EL.map(function (p, j) { return p.grup === g ? '<option value="' + j + '">' + h(p.ad) + '</option>' : ''; }).join('') + '</optgroup>';
  }).join('');

  /* ================= AYARLAR (sessiz güncellenebilen kaydırıcılar) ================= */
  function bagla(kok0, ad, cfg, degisti) {
    var kut = $('#lb-a-' + ad, kok0), kay = $('[data-kay="' + ad + '"]', kok0), lmin = Math.log(cfg.min), lmax = Math.log(Math.max(cfg.max, cfg.min * 1.0001));
    function kayKonum(v) { kay.value = Math.round((Math.log(Math.max(cfg.min, Math.min(cfg.max, v))) - lmin) / (lmax - lmin) * 1000); }
    function cipIsle(v) { $$('[data-cip="' + ad + '"]', kok0).forEach(function (b) { b.classList.toggle('on', Math.abs(+b.getAttribute('data-v') - v) < Math.max(1e-9, v * 1e-6)); }); }
    function yuvarla(v) { var e = Math.floor(Math.log(v) / Math.LN10), f = Math.pow(10, 2 - e), r = Math.round(v * f) / f; return cfg.tam ? Math.max(1, Math.round(r)) : r; }
    function goster(v, kaynak) { if (kaynak !== 'kutu') kut.value = sayiYaz(v); if (kaynak !== 'kay') kayKonum(v); cipIsle(v); }
    function ata(v, kaynak) { v = Math.max(cfg.min, Math.min(cfg.max, v)); cfg.v = v; goster(v, kaynak); degisti(v); }
    goster(cfg.v);
    kay.addEventListener('input', function () { ata(yuvarla(Math.exp(lmin + (lmax - lmin) * (+kay.value) / 1000)), 'kay'); });
    kut.addEventListener('input', function () { var v = sayiOku(kut.value); if (isFinite(v) && v > 0) ata(v, 'kutu'); });
    kut.addEventListener('blur', function () { var v = sayiOku(kut.value); ata(isFinite(v) && v > 0 ? v : cfg.v); });
    kut.addEventListener('focus', function () { try { kut.select(); } catch (e) {} });
    kut.addEventListener('keydown', function (e) { if (e.key === 'Enter') kut.blur(); });
    $$('[data-cip="' + ad + '"]', kok0).forEach(function (b) { b.addEventListener('click', function () { ata(+b.getAttribute('data-v')); }); });
    return { ata: ata, sessiz: function (v) { v = Math.max(cfg.min, Math.min(cfg.max, v)); cfg.v = v; goster(v); } };
  }
  var IMAX = 100, IMIN = 0.01, TMAX = 360000, TMIN = 1;
  var A = {};
  function altYaz(id, s) { var e = $('#' + id); if (e) e.innerHTML = s; }
  function akimSureCiz() {
    var cI = { etiket: 'Akım <span class="sym">(I)</span>', birim: 'A', min: IMIN, max: IMAX, v: S.I, cip: [0.5, 1, 2, 5, 9.65, 10] };
    var cT = { etiket: 'Süre <span class="sym">(t)</span>', birim: 's', min: TMIN, max: TMAX, v: S.t, cip: [60, 300, 965, 1930, 3600, 9650], tam: true, altYazi: '<span id="lb-esurealt"></span>' };
    var cQ = { etiket: 'Yük <span class="sym">(Q)</span>', birim: 'C', min: 0.01, max: IMAX * TMAX, v: Q(), cip: [965, 1930, 9650, 19300, 96500], altYazi: '<span id="lb-eyukalt"></span>' };
    $('#lb-eakim').innerHTML = ayarHtml('eI', cI);
    $('#lb-esure').innerHTML = ayarHtml('eT', cT);
    $('#lb-eyuk').innerHTML = ayarHtml('eQ', cQ);
    A.I = bagla($('#lb-eakim'), 'eI', cI, function (v) { S.I = v; A.Q.sessiz(Q()); degisti(); });
    A.T = bagla($('#lb-esure'), 'eT', cT, function (v) { S.t = v; A.Q.sessiz(Q()); degisti(); });
    A.Q = bagla($('#lb-eyuk'), 'eQ', cQ, function (v) { yukAta(v, 'Q'); });
    altlarYaz();
  }
  /* yeni yük: akım sabit kalır, süre değişir; süre sınırı aşılırsa akım da değişir */
  function yukAta(q, kaynak) {
    q = Math.max(0.01, Math.min(IMAX * TMAX, q));
    var t = q / S.I;
    if (t > TMAX) { S.I = Math.min(IMAX, q / TMAX); t = q / S.I; A.I.sessiz(S.I); }
    else if (t < TMIN) { S.I = Math.max(IMIN, q / TMIN); t = q / S.I; A.I.sessiz(S.I); }
    S.t = t; A.T.sessiz(S.t);
    if (kaynak !== 'Q') A.Q.sessiz(Q());
    degisti();
  }
  function altlarYaz() {
    altYaz('lb-esurealt', '= ' + sureYaz(S.t));
    altYaz('lb-eyukalt', '= ' + anl(Q() / F, 3) + ' mol e⁻');
  }
  function mikCiz() {
    var p = P(), s = '', b = $('#lb-emik');
    $('#lb-etanim').innerHTML = h(p.tam) + ' · ' + h(p.elektrot) + (p.T ? ' · ' + p.T + ' °C' : '');
    if (p.grup === 'erimis') s = ayarHtml('eK', { etiket: 'Tuzun kütlesi', birim: 'g', min: 1, max: 1000, v: S.mik.kutle, cip: [10, 50, 100, 200, 500] });
    else if (p.grup === 'sulu') {
      s = ayarHtml('eC', { etiket: 'Derişim', birim: 'M', min: 0.01, max: p.tuz.maks, v: S.mik.c, cip: [0.1, 0.5, 1, 2, 5] }) + ayarHtml('eV', { etiket: 'Hacim', birim: 'mL', min: 10, max: 1000, v: S.mik.V, cip: [50, 100, 200, 500, 1000] });
      if (p.bakir) s += ayarHtml('eA', { etiket: 'Anotun kütlesi', birim: 'g', min: 1, max: 200, v: S.mik.anot, cip: [5, 10, 20, 50, 100] });
    } else s = '<div class="el-tanim">Su tükenmez; eklenen asit harcanmaz.</div>';
    b.innerHTML = s;
    if (p.grup === 'erimis') bagla(b, 'eK', { min: 1, max: 1000, v: S.mik.kutle }, function (v) { S.mik.kutle = v; S.surum++; degisti(); });
    if (p.grup === 'sulu') {
      bagla(b, 'eC', { min: 0.01, max: p.tuz.maks, v: S.mik.c }, function (v) { S.mik.c = v; S.surum++; degisti(); });
      bagla(b, 'eV', { min: 10, max: 1000, v: S.mik.V }, function (v) { S.mik.V = v; S.surum++; degisti(); });
      if (p.bakir) bagla(b, 'eA', { min: 1, max: 200, v: S.mik.anot }, function (v) { S.mik.anot = v; S.surum++; degisti(); });
    }
  }
  var HIZLAR = [0, 1, 10, 100];
  function hizCiz() {
    $('#lb-ehiz').innerHTML = HIZLAR.map(function (v) { return '<button type="button" data-ehiz="' + v + '" class="' + (S.hiz === v ? 'on' : '') + '">' + (v ? v + '×' : 'Otomatik') + '</button>'; }).join('');
  }
  function etkinHiz() {
    if (S.hiz) return S.hiz;
    var L = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000];
    for (var i = 0; i < L.length; i++) if (S.t / L[i] <= 12) return L[i];
    return L[L.length - 1];
  }

  /* ================= SONUÇ KARTI ================= */
  function tarafHtml(tur, L) {
    var p = P(), ana = L[0], u = ana.u, kat = tur === 'kat', anotMetal = u.tur === 'anotMetal';
    var s = '<div class="el-taraf ' + tur + '"><div class="el-tb"><span class="el-isaret">' + (kat ? '−' : '+') + '</span>' + (kat ? 'Katot' : 'Anot') + ' <small>' + (kat ? 'indirgenme' : 'yükseltgenme') + '</small></div>';
    s += '<div class="el-yari">' + h(ana.part.yari) + '</div>';
    s += '<div class="el-urun"><b>' + h(u.f) + '</b> ' + h(anotMetal ? 'anottan çözünen bakır' : u.ad) + (anotMetal ? '' : ' · ' + HAL[ana.part.hal]) + '</div>';
    s += '<div class="el-mik"><span class="el-mol">' + anl(ana.n, 3) + ' mol</span>' +
      '<label class="el-g"><input type="text" inputmode="decimal" autocomplete="off" data-hedef="m" data-taraf="' + tur + '" value="' + anl(ana.m, 3) + '"><span>g' + (anotMetal ? ' <small>azalır</small>' : '') + '</span></label>' +
      (ana.V !== null ? '<label class="el-g"><input type="text" inputmode="decimal" autocomplete="off" data-hedef="V" data-taraf="' + tur + '" value="' + anl(ana.V, 3) + '"><span>L <small>(NŞ)</small></span></label>' : '') + '</div>';
    if (L[1]) {
      var e = L[1];
      s += '<div class="el-ek"><b>' + h(kat ? (p.kIyon || 'Katyon') : (p.aIyon || 'Anyon')) + ' bitti.</b> Sonra: ' + h(e.part.yari) + '<br>' + h(e.u.f) + ': ' + anl(e.n, 3) + ' mol · ' + anl(e.m, 3) + ' g' + (e.V !== null ? ' · ' + hacimYaz(e.V) + ' (NŞ)' : '') + '</div>';
    }
    return s + '</div>';
  }
  function hesapSatiri(tur, x) {
    var u = x.u, ad = tur === 'kat' ? 'Katot' : 'Anot';
    var oran = u.e === 1 ? '1 mol e⁻ ile 1 mol ' + u.f : u.e + ' mol e⁻ ile 1 mol ' + u.f;
    var s = '<b>' + ad + ':</b> ' + h(x.part.yari) + ' ⇒ ' + oran + '<br>n(' + u.f + ') = ' + (u.e !== 1 ? anl(x.e, 3) + ' ÷ ' + u.e : 'n(e⁻)') + ' = ' + anl(x.n, 3) + ' mol · m = ' + anl(x.n, 3) + ' × ' + u.M + ' = <b>' + anl(x.m, 3) + ' g</b>';
    if (x.V !== null) s += ' · V = ' + anl(x.n, 3) + ' × 22,4 = <b>' + anl(x.V, 3) + ' L</b>';
    return s;
  }
  function sonucCiz() {
    var p = P(), r = hesapla(Q() / F), s = '';
    S.son = r;
    s += '<div class="el-taraflar">' + tarafHtml('kat', r.kat) + tarafHtml('an', r.an) + '</div>';
    s += '<div class="kutu el-net"><b>Net tepkime</b><div class="el-denk">' + h(p.net) + '</div></div>';
    var hs = 'Q = I · t = ' + sayiYaz(S.I) + ' A × ' + sayiYaz(S.t) + ' s = <b>' + anl(Q(), 4) + ' C</b><br>' +
      'n(e⁻) = Q ÷ F = ' + anl(Q(), 4) + ' ÷ 96 500 = <b>' + anl(Q() / F, 3) + ' mol</b>';
    if (r.tukendi) hs += '<br><span class="el-uyari">' + (p.bakir ? 'Anot tamamen çözündü' : 'Tuz tükendi') + ': yalnızca ' + anl(r.ne, 3) + ' mol e⁻ tepkimeye girebildi.</span>';
    hs += '<br>' + hesapSatiri('kat', r.kat[0]) + '<br>' + hesapSatiri('an', r.an[0]);
    if (r.kat[1]) hs += '<br>' + h(p.kIyon) + ' en fazla ' + anl(r.K.kat, 3) + ' mol e⁻ alabilir; kalan ' + anl(r.kat[1].e, 3) + ' mol e⁻ ile katotta ' + r.kat[1].u.f + ' çıkar.';
    if (r.an[1]) hs += '<br>' + h(p.aIyon) + ' en fazla ' + anl(r.K.an, 3) + ' mol e⁻ verebilir; kalan ' + anl(r.an[1].e, 3) + ' mol e⁻ ile anotta ' + r.an[1].u.f + ' çıkar.';
    s += '<div class="kutu sonuc"><b>Hesap</b><div class="hesap">' + hs + '</div></div>';
    s += '<div class="kutu"><b>Neden bu ürünler?</b><br>' + h(p.neden) + (p.ph ? '<br><span class="ince">Çözeltinin pH’ı ' + p.ph + '.</span>' : '') + '</div>';
    if (p.not) s += '<div class="kutu iyi">' + h(p.not) + '</div>';
    if (p.grup === 'sulu') s += '<div class="kutu ince el-ekkonu">Sulu çözeltilerin elektrolizi ek konudur: kurallar, soru bankalarında karşına çıkan örneklere göre verilmiştir.</div>';
    var kutu = $('#lb-esonuc'), odak = document.activeElement && kutu.contains(document.activeElement) ? document.activeElement : null;
    if (odak) return;   /* kullanıcı bir kutuya yazarken yeniden çizme */
    kutu.innerHTML = s;
    sigdir(kutu);
  }
  /* denklemler tek satırda kalsın: sığmazsa yazıyı biraz küçült */
  function sigdir(kok0) {
    $$('.el-yari, .el-denk', kok0).forEach(function (e) {
      var f = 13.5; e.style.fontSize = '';
      while (e.scrollWidth > e.clientWidth + 1 && f > 10.5) { f -= 0.5; e.style.fontSize = f + 'px'; }
    });
  }
  $('#lb-esonuc').addEventListener('change', function (e) {
    var g = e.target.closest('input[data-hedef]'); if (!g) return;
    var v = sayiOku(g.value), tur = g.getAttribute('data-taraf'), r = S.son; if (!(v > 0) || !r) { sonucCiz(); return; }
    var x = (tur === 'kat' ? r.kat : r.an)[0], u = x.u, ne = g.getAttribute('data-hedef') === 'V' ? v / VM * u.e : v / u.M * u.e;
    var cap = tur === 'kat' ? r.K.kat : r.K.an;
    if (ne > cap) { ne = cap; LA.tost && LA.tost('En fazla ' + anl(cap / u.e * u.M, 3) + ' g ' + u.f + ' oluşabilir: elektrolit yetmez.'); }
    g.blur();
    yukAta(ne * F);
  });
  $('#lb-esonuc').addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.matches('input[data-hedef]')) e.target.blur(); });

  /* ================= CANLI GÖSTERGE ================= */
  function canliHesap() { S.canli = hesapla(S.I * S.tg / F); return S.canli; }
  function etiketMetni(L, tur) {
    var x = L[L.length - 1], ilk = L[0], u = ilk.u, s = '<small>' + (tur === 'kat' ? 'Katot (−)' : 'Anot (+)') + '</small>';
    if (S.tg <= 0) return s + '<b>' + h(u.f) + '</b>';
    if (u.tur === 'gaz') s += '<b>' + h(u.f) + '</b> ' + hacimYaz(ilk.V);
    else if (u.tur === 'anotMetal') s += '<b>' + h(u.f) + '</b> −' + anl(ilk.m, 3) + ' g';
    else s += '<b>' + h(u.f) + '</b> ' + anl(ilk.m, 3) + ' g';
    if (L[1]) s += '<br><b>' + h(x.u.f) + '</b> ' + (x.V !== null ? hacimYaz(x.V) : anl(x.m, 3) + ' g');
    return s;
  }
  function canliCiz() {
    var r = canliHesap(), oran = Math.min(1, S.tg / S.t), hz = etkinHiz();
    $('#lb-ecanli').innerHTML = '<div class="el-ilerle"><i style="width:' + (oran * 100).toFixed(1) + '%"></i></div>' +
      '<div class="el-canli-s"><span><b>' + saatYaz(S.tg) + '</b> / ' + saatYaz(S.t) + '</span><span>Q <b>' + anl(S.I * S.tg, 3) + '</b> C</span><span>e⁻ <b>' + anl(r.ne, 3) + '</b> mol</span><span class="el-hz">' + (S.calis ? '×' + hz + ' hızlı' : (oran >= 1 ? 'Tamamlandı' : (S.tg > 0 ? 'Durdu' : 'Hazır'))) + '</span></div>';
    S.etiket = { kat: etiketMetni(r.kat, 'kat'), an: etiketMetni(r.an, 'an'), T: P().T ? P().T + ' °C' : '' };
  }
  function dugmeCiz() {
    var b = $('[data-el="calis"]', bolum);
    b.classList.toggle('on', S.calis);
    b.innerHTML = (S.calis ? '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="1.5"/></svg><span>Akımı kes</span>' : ik('oynat') + '<span>' + (S.tg > 0 && S.tg < S.t ? 'Devam et' : 'Akımı aç') + '</span>');
  }
  function degisti() {
    altlarYaz(); sonucCiz();
    if (S.tg > S.t) S.tg = S.t;
    canliCiz(); dugmeCiz();
  }
  function bitir(erken) {
    S.calis = false; dugmeCiz();
    var r = canliHesap(), p = P(), k = r.kat[0], a = r.an[0];
    var metin = 'Elektroliz · ' + p.ad + ' · ' + sayiYaz(S.I) + ' A × ' + sureYaz(S.tg) + ' (' + anl(S.I * S.tg, 4) + ' C): katotta ' + anl(k.m, 3) + ' g ' + k.u.f +
      (k.V !== null ? ' (' + hacimYaz(k.V) + ')' : '') + ', anotta ' + (a.u.tur === 'anotMetal' ? anl(a.m, 3) + ' g Cu çözündü' : anl(a.m, 3) + ' g ' + a.u.f + (a.V !== null ? ' (' + hacimYaz(a.V) + ')' : ''));
    if (LA.gunlukIs) LA.gunlukIs(metin);
    if (LA.tost) LA.tost(r.tukendi ? (p.bakir ? 'Anot tamamen çözündü; akım kesildi.' : 'Tuz tükendi; elektroliz durdu.') : (erken ? 'Akım kesildi.' : 'Elektroliz tamamlandı: katotta ' + anl(k.m, 3) + ' g ' + k.u.f + '.'));
  }

  /* ================= ETKİLEŞİM ================= */
  bolum.addEventListener('click', function (e) {
    var b = e.target.closest('[data-el]'), hz = e.target.closest('[data-ehiz]');
    if (hz) { S.hiz = +hz.getAttribute('data-ehiz'); hizCiz(); canliCiz(); return; }
    if (!b) return;
    var v = b.getAttribute('data-el');
    if (v === 'calis') {
      if (S.calis) { bitir(true); return; }
      if (S.tg >= S.t - 1e-9) { S.tg = 0; S.surum++; }
      S.calis = true; dugmeCiz(); canliCiz();
    } else if (v === 'bas') { S.calis = false; S.tg = 0; S.surum++; dugmeCiz(); canliCiz(); }
  });
  sec.addEventListener('change', function () {
    S.i = +sec.value; S.calis = false; S.tg = 0; S.surum++; mikVarsay(); mikCiz(); degisti();
  });

  /* ================= DÖNGÜ ================= */
  var sonCanli = 0;
  LA.elDongu = function (t, dt) { try { elAdim(t, dt); } catch (e) { if (window.console) console.warn('elektroliz:', e); } };
  function elAdim(t, dt) {
    if (S.calis) {
      S.tg += dt * etkinHiz();
      var r = canliHesap();
      if (r.tukendi) { S.tg = r.ne * F / S.I; bitir(false); }
      else if (S.tg >= S.t) { S.tg = S.t; bitir(false); }
    }
    var su = t * 1000;
    if (S.calis ? su - sonCanli > 120 : su - sonCanli > 600) { sonCanli = su; canliCiz(); }
    var C = LA.cizici;
    if (C && C.elCiz) C.elCiz(t, dt); else ciz2d(t);
  }
  LA.elAcildi = function () { canliCiz(); if (!(LA.cizici && LA.cizici.elCiz)) { boyut2d(); ciz2d(0); } };

  /* ================= 2D YEDEK ÇİZİM (WebGL yoksa) ================= */
  var cv = $('#lb-ecan'), cx = cv.getContext('2d'), dpr2 = 1, w2 = 360, h2 = 300;
  function boyut2d() { w2 = cv.parentNode.clientWidth || 360; h2 = Math.round(w2 * 0.8); dpr2 = Math.min(2, window.devicePixelRatio || 1); cv.width = Math.round(w2 * dpr2); cv.height = Math.round(h2 * dpr2); cv.style.height = h2 + 'px'; }
  function ciz2d() {
    if (LA.cizici && LA.cizici.elCiz) return;
    if (cv.width < 10) boyut2d();
    var c = cx, p = P(), s = w2 / 360, r = S.canli || canliHesap();
    c.setTransform(dpr2 * s, 0, 0, dpr2 * s, 0, 0);
    var g = c.createLinearGradient(0, 0, 0, 288); g.addColorStop(0, '#E3ECF4'); g.addColorStop(0.75, '#F5F0EA'); g.addColorStop(0.751, '#E6D2B4'); g.addColorStop(1, '#DCC3A0');
    c.fillStyle = g; c.fillRect(0, 0, 360, 288);
    var erimis = p.grup === 'erimis', sv = erimis ? 'rgba(255,150,60,.85)' : (p.renk ? 'rgba(' + p.renk.join(',') + ',.45)' : 'rgba(200,225,245,.55)');
    c.fillStyle = sv; c.fillRect(102, 130, 156, 92);
    c.strokeStyle = erimis ? '#BFB6AA' : 'rgba(120,140,160,.85)'; c.lineWidth = 3; c.beginPath(); c.moveTo(100, 70); c.lineTo(100, 224); c.lineTo(260, 224); c.lineTo(260, 70); c.stroke();
    c.fillStyle = '#3A3D42'; c.fillRect(138, 44, 10, 166); c.fillRect(212, 44, 10, 166);
    c.fillStyle = '#2B2F35'; c.fillRect(278, 150, 70, 54); c.fillStyle = '#0F2A1A'; c.fillRect(286, 158, 54, 20); c.fillStyle = '#57F28A'; c.font = '700 13px system-ui'; c.textAlign = 'center'; c.fillText(sayiYaz(S.I) + ' A', 313, 173);
    c.strokeStyle = '#1C1F24'; c.lineWidth = 2; c.beginPath(); c.moveTo(143, 44); c.quadraticCurveTo(200, 18, 296, 196); c.stroke();
    c.strokeStyle = '#D8342C'; c.beginPath(); c.moveTo(217, 44); c.quadraticCurveTo(260, 30, 330, 196); c.stroke();
    c.fillStyle = '#14110F'; c.font = '700 12px system-ui'; c.fillText('Katot (−)', 143, 36); c.fillText('Anot (+)', 217, 36);
    c.font = '600 11px system-ui'; c.fillStyle = '#5C554F';
    var k = r.kat[0], a = r.an[0];
    c.fillText(k.u.f + (S.tg > 0 ? ' ' + (k.V !== null ? hacimYaz(k.V) : anl(k.m, 3) + ' g') : ''), 143, 250);
    c.fillText(a.u.f + (S.tg > 0 ? ' ' + (a.V !== null ? hacimYaz(a.V) : anl(a.m, 3) + ' g') : ''), 217, 250);
    if (S.calis) { c.fillStyle = 'rgba(255,255,255,.9)'; for (var i = 0; i < 8; i++) { var y = 210 - ((t2() * 60 + i * 23) % 80); c.beginPath(); c.arc(217 + Math.sin(i * 3.1) * 6, y, 2.2, 0, 7); c.fill(); } }
  }
  function t2() { return (window.performance ? performance.now() : Date.now()) / 1000; }
  window.addEventListener('resize', function () { if (LA.mod === 'elektroliz' && !(LA.cizici && LA.cizici.elCiz)) boyut2d(); });

  /* ================= BAŞLAT ================= */
  sec.value = String(S.i);
  hizCiz(); mikCiz(); akimSureCiz(); sonucCiz(); canliCiz(); dugmeCiz();
  LA.elEL = EL; LA.elHesapla = hesapla; LA.elDurum = S;
  LA.elSec = function (id) { var j = EL.map(function (p) { return p.id; }).indexOf(id); if (j < 0) return; sec.value = String(j); sec.dispatchEvent(new Event('change')); };
  if ((location.hash || '') === '#elektroliz') LA.modAc('elektroliz');
})();
