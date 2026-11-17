/* Sanal Laboratuvar · elektroliz (lab-elektroliz.js)
   Erimiş tuzların, suyun ve (ek konu) sulu çözeltilerin elektrolizi. Maddeyi, hâlini (erimiş / sulu)
   ve anodu kullanıcı seçer; katotta ve anotta ne oluşacağını kurallar belirler. 1, 2 ya da 3 kap
   seri bağlanabilir: hepsinden aynı yük geçer. Akım, süre, yük ve herhangi bir kaptaki ürün miktarı
   birbirine bağlıdır. lab-arayuz.js'ten sonra yüklenir; 3D tezgâh varsa düzeneği orada canlandırır. */
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
  function ebob(a, b) { return b ? ebob(b, a % b) : a; }

  /* ================= İYONLAR ================= */
  /* aktif: sulu çözeltide katyonu indirgenmeyen (yerine su indirgenen) metaller */
  var KAT = {
    H: { s: 'H', f: 'H⁺', z: 1, M: 1, tip: 'H', ad: 'hidrojen' },
    Li: { s: 'Li', f: 'Li⁺', z: 1, M: 7, ad: 'lityum', aktif: 1, erime: 181, yuzer: 1, renkM: 0xd6dadf },
    Na: { s: 'Na', f: 'Na⁺', z: 1, M: 23, ad: 'sodyum', aktif: 1, erime: 98, yuzer: 1, renkM: 0xd3d8de },
    K: { s: 'K', f: 'K⁺', z: 1, M: 39, ad: 'potasyum', aktif: 1, erime: 63, yuzer: 1, renkM: 0xd0d6dc },
    Mg: { s: 'Mg', f: 'Mg²⁺', z: 2, M: 24, ad: 'magnezyum', aktif: 1, erime: 650, yuzer: 1, renkM: 0xcdd2d7 },
    Ca: { s: 'Ca', f: 'Ca²⁺', z: 2, M: 40, ad: 'kalsiyum', aktif: 1, erime: 842, yuzer: 1, renkM: 0xc9cdd1 },
    Ba: { s: 'Ba', f: 'Ba²⁺', z: 2, M: 137, ad: 'baryum', aktif: 1, erime: 727, renkM: 0xc5c9cc },
    Al: { s: 'Al', f: 'Al³⁺', z: 3, M: 27, ad: 'alüminyum', aktif: 1, erime: 660, renkM: 0xd8dce0 },
    Zn: { s: 'Zn', f: 'Zn²⁺', z: 2, M: 65, ad: 'çinko', erime: 420, renkM: 0x9ea7b0, anot: 1 },
    Fe: { s: 'Fe', f: 'Fe²⁺', z: 2, M: 56, ad: 'demir', erime: 1538, renkM: 0x7d8186, coz: [175, 212, 160] },
    Ni: { s: 'Ni', f: 'Ni²⁺', z: 2, M: 59, ad: 'nikel', erime: 1455, renkM: 0xbfc2c4, coz: [105, 190, 120], anot: 1 },
    Sn: { s: 'Sn', f: 'Sn²⁺', z: 2, M: 119, ad: 'kalay', erime: 232, renkM: 0xc7cbd0, anot: 1 },
    Pb: { s: 'Pb', f: 'Pb²⁺', z: 2, M: 207, ad: 'kurşun', erime: 327, renkM: 0x8d939a, anot: 1 },
    Cu: { s: 'Cu', f: 'Cu²⁺', z: 2, M: 64, ad: 'bakır', erime: 1085, renkM: 0xb8673a, coz: [80, 150, 235], anot: 1 },
    Ag: { s: 'Ag', f: 'Ag⁺', z: 1, M: 108, ad: 'gümüş', erime: 962, renkM: 0xe4e7ea, anot: 1 },
    Au: { s: 'Au', f: 'Au³⁺', z: 3, M: 197, ad: 'altın', erime: 1064, renkM: 0xe2b84a, coz: [235, 205, 90], anot: 1 }
  };
  var ANY = {
    F: { k: 'F', f: 'F⁻', z: 1, M: 19, tip: 'hal', X2: 'F₂', ad2: 'flor gazı', M2: 38, renk: 0xe8efb0 },
    Cl: { k: 'Cl', f: 'Cl⁻', z: 1, M: 35.5, tip: 'hal', X2: 'Cl₂', ad2: 'klor gazı', M2: 71, renk: 0xc3d93a },
    Br: { k: 'Br', f: 'Br⁻', z: 1, M: 80, tip: 'hal', X2: 'Br₂', ad2: 'brom', M2: 160, renk: 0xc0581e },
    I: { k: 'I', f: 'I⁻', z: 1, M: 127, tip: 'hal', X2: 'I₂', ad2: 'iyot', M2: 254, renk: 0x8a4a16 },
    O: { k: 'O', f: 'O²⁻', z: 2, M: 16, tip: 'oksit' },
    OH: { k: 'OH', f: 'OH⁻', z: 1, M: 17, tip: 'oh' },
    SO4: { k: 'SO4', f: 'SO₄²⁻', z: 2, M: 96, tip: 'okso' },
    NO3: { k: 'NO3', f: 'NO₃⁻', z: 1, M: 62, tip: 'okso' }
  };

  /* ================= MADDELER ================= */
  /* [id, formül, ad, katyon, katyon sayısı, anyon, anyon sayısı, erime noktası (°C, 0: eritilerek elektroliz edilmez), sulu en yüksek derişim (M, 0: suda yok), grup] */
  var GRUP = ['Klorürler', 'Bromürler, iyodürler, florürler', 'Sülfatlar', 'Nitratlar', 'Asitler', 'Bazlar', 'Oksitler'];
  var MD = [
    ['licl', 'LiCl', 'lityum klorür', 'Li', 1, 'Cl', 1, 605, 5, 0], ['nacl', 'NaCl', 'sodyum klorür', 'Na', 1, 'Cl', 1, 801, 5, 0],
    ['kcl', 'KCl', 'potasyum klorür', 'K', 1, 'Cl', 1, 770, 4, 0], ['mgcl2', 'MgCl₂', 'magnezyum klorür', 'Mg', 1, 'Cl', 2, 714, 4, 0],
    ['cacl2', 'CaCl₂', 'kalsiyum klorür', 'Ca', 1, 'Cl', 2, 772, 4, 0], ['bacl2', 'BaCl₂', 'baryum klorür', 'Ba', 1, 'Cl', 2, 962, 1.5, 0],
    ['alcl3', 'AlCl₃', 'alüminyum klorür', 'Al', 1, 'Cl', 3, 0, 3, 0], ['zncl2', 'ZnCl₂', 'çinko klorür', 'Zn', 1, 'Cl', 2, 290, 5, 0],
    ['fecl2', 'FeCl₂', 'demir(II) klorür', 'Fe', 1, 'Cl', 2, 0, 3, 0], ['nicl2', 'NiCl₂', 'nikel(II) klorür', 'Ni', 1, 'Cl', 2, 0, 3, 0],
    ['sncl2', 'SnCl₂', 'kalay(II) klorür', 'Sn', 1, 'Cl', 2, 247, 3, 0], ['pbcl2', 'PbCl₂', 'kurşun(II) klorür', 'Pb', 1, 'Cl', 2, 501, 0, 0],
    ['cucl2', 'CuCl₂', 'bakır(II) klorür', 'Cu', 1, 'Cl', 2, 0, 5, 0], ['agcl', 'AgCl', 'gümüş klorür', 'Ag', 1, 'Cl', 1, 455, 0, 0],
    ['aucl3', 'AuCl₃', 'altın(III) klorür', 'Au', 1, 'Cl', 3, 0, 1, 0],
    ['nabr', 'NaBr', 'sodyum bromür', 'Na', 1, 'Br', 1, 747, 5, 1], ['kbr', 'KBr', 'potasyum bromür', 'K', 1, 'Br', 1, 734, 5, 1],
    ['znbr2', 'ZnBr₂', 'çinko bromür', 'Zn', 1, 'Br', 2, 394, 5, 1], ['cubr2', 'CuBr₂', 'bakır(II) bromür', 'Cu', 1, 'Br', 2, 0, 3, 1],
    ['pbbr2', 'PbBr₂', 'kurşun(II) bromür', 'Pb', 1, 'Br', 2, 373, 0, 1], ['nai', 'NaI', 'sodyum iyodür', 'Na', 1, 'I', 1, 661, 5, 1],
    ['ki', 'KI', 'potasyum iyodür', 'K', 1, 'I', 1, 681, 5, 1], ['naf', 'NaF', 'sodyum florür', 'Na', 1, 'F', 1, 993, 1, 1],
    ['kf', 'KF', 'potasyum florür', 'K', 1, 'F', 1, 858, 5, 1],
    ['na2so4', 'Na₂SO₄', 'sodyum sülfat', 'Na', 2, 'SO4', 1, 0, 1.5, 2], ['k2so4', 'K₂SO₄', 'potasyum sülfat', 'K', 2, 'SO4', 1, 0, 0.6, 2],
    ['mgso4', 'MgSO₄', 'magnezyum sülfat', 'Mg', 1, 'SO4', 1, 0, 2.5, 2], ['al2so43', 'Al₂(SO₄)₃', 'alüminyum sülfat', 'Al', 2, 'SO4', 3, 0, 1, 2],
    ['znso4', 'ZnSO₄', 'çinko sülfat', 'Zn', 1, 'SO4', 1, 0, 3, 2], ['feso4', 'FeSO₄', 'demir(II) sülfat', 'Fe', 1, 'SO4', 1, 0, 1.5, 2],
    ['niso4', 'NiSO₄', 'nikel(II) sülfat', 'Ni', 1, 'SO4', 1, 0, 2, 2], ['cuso4', 'CuSO₄', 'bakır(II) sülfat', 'Cu', 1, 'SO4', 1, 0, 1.4, 2],
    ['nano3', 'NaNO₃', 'sodyum nitrat', 'Na', 1, 'NO3', 1, 0, 5, 3], ['kno3', 'KNO₃', 'potasyum nitrat', 'K', 1, 'NO3', 1, 0, 3, 3],
    ['cano32', 'Ca(NO₃)₂', 'kalsiyum nitrat', 'Ca', 1, 'NO3', 2, 0, 5, 3], ['zno32', 'Zn(NO₃)₂', 'çinko nitrat', 'Zn', 1, 'NO3', 2, 0, 5, 3],
    ['nino32', 'Ni(NO₃)₂', 'nikel(II) nitrat', 'Ni', 1, 'NO3', 2, 0, 3, 3], ['cuno32', 'Cu(NO₃)₂', 'bakır(II) nitrat', 'Cu', 1, 'NO3', 2, 0, 3, 3],
    ['agno3', 'AgNO₃', 'gümüş nitrat', 'Ag', 1, 'NO3', 1, 0, 5, 3], ['pbno32', 'Pb(NO₃)₂', 'kurşun(II) nitrat', 'Pb', 1, 'NO3', 2, 0, 1.5, 3],
    ['hcl', 'HCl', 'hidroklorik asit', 'H', 1, 'Cl', 1, 0, 6, 4], ['hbr', 'HBr', 'hidrobromik asit', 'H', 1, 'Br', 1, 0, 5, 4],
    ['h2so4', 'H₂SO₄', 'sülfürik asit', 'H', 2, 'SO4', 1, 0, 5, 4], ['hno3', 'HNO₃', 'nitrik asit', 'H', 1, 'NO3', 1, 0, 5, 4],
    ['naoh', 'NaOH', 'sodyum hidroksit', 'Na', 1, 'OH', 1, 318, 5, 5], ['koh', 'KOH', 'potasyum hidroksit', 'K', 1, 'OH', 1, 360, 5, 5],
    ['al2o3', 'Al₂O₃', 'alüminyum oksit (kriyolitte)', 'Al', 2, 'O', 3, 950, 0, 6]
  ];
  var MADDE = {}, MLISTE = MD.map(function (r) {
    var o = { id: r[0], f: r[1], ad: r[2], k: r[3], a: r[4], an: r[5], b: r[6], erime: r[7], maks: r[8], grup: GRUP[r[9]] };
    o.M = Math.round((KAT[o.k].M * o.a + ANY[o.an].M * o.b) * 10) / 10; MADDE[o.id] = o; return o;
  });
  function buyuk(s) { return s.charAt(0).toLocaleUpperCase('tr') + s.slice(1); }

  /* ================= KURALLAR: profil ================= */
  var URUN = { H2: { f: 'H₂', ad: 'hidrojen gazı', M: 2, e: 2, tur: 'gaz' }, O2: { f: 'O₂', ad: 'oksijen gazı', M: 32, e: 4, tur: 'gaz' } };
  var Y_SU_IND = { tip: 'su', sol: [[2, 'H₂O(s)']], sag: [[1, 'H₂(g)'], [2, 'OH⁻(suda)']], e: 2, u: URUN.H2, hal: 'g' };
  var Y_H_IND = { tip: 'H', sol: [[2, 'H⁺(suda)']], sag: [[1, 'H₂(g)']], e: 2, u: URUN.H2, hal: 'g' };
  var Y_SU_YUK = { tip: 'su', sol: [[2, 'H₂O(s)']], sag: [[1, 'O₂(g)'], [4, 'H⁺(suda)']], e: 4, u: URUN.O2, hal: 'g' };
  var Y_OH_YUK = { tip: 'oh', sol: [[4, 'OH⁻(suda)']], sag: [[1, 'O₂(g)'], [2, 'H₂O(s)']], e: 4, u: URUN.O2, hal: 'g' };
  function terim(c, s) { return (c === 1 ? '' : c) + s; }
  function yariYaz(Hy, ind) {
    var sol = Hy.sol.map(function (x) { return terim(x[0], x[1]); }), sag = Hy.sag.map(function (x) { return terim(x[0], x[1]); }), e = (Hy.e === 1 ? '' : Hy.e) + 'e⁻';
    if (ind) sol.push(e); else sag.push(e);
    return sol.join(' + ') + ' → ' + sag.join(' + ');
  }
  function netIyon(K, A) {
    var L = K.e * A.e / ebob(K.e, A.e), mk = L / K.e, ma = L / A.e, sol = {}, sag = {}, sira = [];
    function ek(o, c, s) { o[s] = (o[s] || 0) + c; if (sira.indexOf(s) < 0) sira.push(s); }
    K.sol.forEach(function (x) { ek(sol, x[0] * mk, x[1]); }); A.sol.forEach(function (x) { ek(sol, x[0] * ma, x[1]); });
    K.sag.forEach(function (x) { ek(sag, x[0] * mk, x[1]); }); A.sag.forEach(function (x) { ek(sag, x[0] * ma, x[1]); });
    [sol, sag].forEach(function (o) { var hp = o['H⁺(suda)'] || 0, oh = o['OH⁻(suda)'] || 0, m = Math.min(hp, oh); if (m > 0) { o['H⁺(suda)'] -= m; o['OH⁻(suda)'] -= m; ek(o, m, 'H₂O(s)'); } });
    Object.keys(sol).forEach(function (s) { if (sag[s]) { var m = Math.min(sol[s], sag[s]); sol[s] -= m; sag[s] -= m; } });
    var tum = Object.keys(sol).map(function (s) { return sol[s]; }).concat(Object.keys(sag).map(function (s) { return sag[s]; })).filter(function (x) { return x > 0; });
    var g = tum.reduce(function (a, b) { return ebob(a, b); }, 0) || 1;
    function yaz(o) { return sira.filter(function (s) { return o[s] > 0; }).map(function (s) { return terim(o[s] / g, s); }).join(' + '); }
    return { metin: yaz(sol) + ' → ' + yaz(sag), sol: sol, sag: sag, g: g, sira: sira };
  }
  var NOT = {
    'nacl|erimis': 'Sodyum metali ve klor gazı endüstride bu yolla üretilir. Erimiş sodyum tuzdan hafif olduğu için yüzeye çıkar.',
    'mgcl2|erimis': 'Magnezyum metali, deniz suyundan elde edilen MgCl₂’nin bu yolla elektroliziyle üretilir.',
    'al2o3|erimis': 'Kriyolit (Na₃AlF₆), Al₂O₃’ün erime sıcaklığını yaklaşık 2050 °C’den 950 °C’ye düşürür. Grafit anot, açığa çıkan oksijenle yanarak CO₂ oluşturduğu için zamanla aşınır.',
    'pbbr2|erimis': 'Okul laboratuvarlarında çeker ocakta yapılan klasik bir deneydir; brom buharı zehirlidir.',
    'nacl|sulu|inert': 'NaOH, H₂ ve Cl₂ endüstride bu yolla üretilir (klor-alkali yöntemi). Çok seyreltik çözeltide anotta Cl₂ yerine O₂ de çıkabilir.',
    'h2so4|sulu|inert': 'Suyun elektrolizi: H₂SO₄ yalnızca iletkenliği sağlar. Aynı sürede çıkan H₂’nin hacmi O₂’nin iki katıdır (2 : 1).',
    'cuso4|sulu|Cu': 'Bakırın saflaştırılması: saf olmayan bakır anot yapılır, katotta saf bakır toplanır. Değerli metaller anotun altında anot çamuru olarak birikir.',
    'agno3|sulu|Ag': 'Gümüş kaplama: kaplanacak eşya katot, gümüş levha anot yapılır.',
    'niso4|sulu|Ni': 'Nikel kaplama: kaplanacak eşya katot, nikel levha anot yapılır.',
    'znso4|sulu|Zn': 'Çinko kaplama: demir eşyayı paslanmaya karşı korumak için kullanılır.'
  };
  function profil(kap) {
    var md = MADDE[kap.madde], C = KAT[md.k], A = ANY[md.an], hal = kap.hal, erimis = hal === 'erimis';
    var p = { md: md, C: C, A: A, hal: hal, erimis: erimis, ad: md.f + (erimis ? '(s)' : '(suda)'), T: erimis ? md.erime : 0 };
    var anotM = (!erimis && kap.anot !== 'inert' && KAT[kap.anot]) ? KAT[kap.anot] : null;
    p.anotMetal = anotM; p.ayniMetal = !!(anotM && anotM.s === C.s);
    p.tam = erimis ? 'Erimiş ' + md.ad : buyuk(md.ad) + ' çözeltisi';
    p.elektrot = anotM ? anotM.ad + ' anot' : 'grafit elektrotlar';
    /* katot */
    var iyon = function (f) { return erimis ? f : f + '(suda)'; };
    if (erimis) {
      var dK = md.erime > C.erime ? 's' : 'k';
      p.kat = { tip: 'metal', sol: [[1, iyon(C.f)]], sag: [[1, C.s + '(' + dK + ')']], e: C.z, hal: dK, u: { f: C.s, ad: C.ad, M: C.M, e: C.z, tur: 'metal', renk: C.renkM, yuzer: !!C.yuzer } };
    } else if (C.tip === 'H') p.kat = Y_H_IND;
    else if (C.aktif) p.kat = Y_SU_IND;
    else p.kat = { tip: 'metal', sol: [[1, iyon(C.f)]], sag: [[1, C.s + '(k)']], e: C.z, hal: 'k', u: { f: C.s, ad: C.ad, M: C.M, e: C.z, tur: 'metal', renk: C.renkM } };
    /* anot */
    if (anotM) p.an = { tip: 'metal', sol: [[1, anotM.s + '(k)']], sag: [[1, anotM.f + '(suda)']], e: anotM.z, hal: 'k', u: { f: anotM.s, ad: anotM.ad + ' anot', M: anotM.M, e: anotM.z, tur: 'anotMetal', renk: anotM.renkM } };
    else if (A.tip === 'hal' && (erimis || A.k !== 'F')) {
      var coz = !erimis && (A.k === 'Br' || A.k === 'I'), dX = erimis ? 'g' : (A.k === 'I' ? 'k' : (A.k === 'Br' ? 'suda' : 'g'));
      p.an = { tip: 'hal', sol: [[2, iyon(A.f)]], sag: [[1, A.X2 + '(' + dX + ')']], e: 2, hal: dX, u: { f: A.X2, ad: A.ad2, M: A.M2, e: 2, tur: coz ? 'cozunen' : 'gaz', renk: A.renk } };
    } else if (A.tip === 'oksit') p.an = { tip: 'oksit', sol: [[2, 'O²⁻']], sag: [[1, 'O₂(g)']], e: 4, hal: 'g', u: URUN.O2 };
    else if (A.tip === 'oh') p.an = erimis ? { tip: 'oh', sol: [[4, 'OH⁻']], sag: [[1, 'O₂(g)'], [2, 'H₂O(g)']], e: 4, hal: 'g', u: URUN.O2 } : Y_OH_YUK;
    else p.an = Y_SU_YUK;
    /* iyon bitince */
    if (!erimis && !p.ayniMetal) {
      if (p.kat.tip === 'metal' || (p.kat.tip === 'H' && A.tip === 'hal')) p.kat2 = p.an.tip === 'su' ? Y_H_IND : Y_SU_IND;
      if (p.an.tip === 'hal') p.an2 = p.kat.tip === 'su' ? Y_OH_YUK : Y_SU_YUK;
    }
    p.kIyon = C.f; p.aIyon = A.f;
    p.kat.yari = yariYaz(p.kat, true); p.an.yari = yariYaz(p.an, false);
    if (p.kat2) p.kat2.yari = yariYaz(p.kat2, true); if (p.an2) p.an2.yari = yariYaz(p.an2, false);
    /* net tepkime */
    if (p.ayniMetal) { p.netBas = 'Net değişim'; p.net = C.s + '(k, anot) → ' + C.s + '(k, katot)'; }
    else {
      var N = netIyon(p.kat, p.an);
      if (erimis) {
        var kKat = (N.sol[C.f] || 0) / N.g, kat = kKat / md.a, sag = N.sira.filter(function (s) { return N.sag[s] > 0; }).map(function (s) { return terim(N.sag[s] / N.g, s); });
        if (kat % 1) { var c2 = 2; sag = N.sira.filter(function (s) { return N.sag[s] > 0; }).map(function (s) { return terim(N.sag[s] / N.g * c2, s); }); kat *= c2; }
        p.netBas = 'Net tepkime'; p.net = terim(kat, md.f + '(s)') + ' → ' + sag.join(' + ');
      } else { p.netBas = 'Net iyon tepkimesi'; p.net = N.metin; }
    }
    /* neden */
    var nd = [];
    if (erimis) {
      nd.push('Erimiş hâlde yalnızca ' + C.f + ' ve ' + A.f + ' iyonları vardır.');
      nd.push(C.f + ' katotta indirgenir: ' + C.ad + ' metali oluşur' + (p.kat.u.yuzer ? ' ve hafif olduğu için yüzeye çıkar.' : (p.kat.hal === 's' ? ' ve dibe çöker.' : '.')));
      if (A.tip === 'hal') nd.push(A.f + ' anotta yükseltgenir: ' + A.ad2 + ' oluşur.');
      else if (A.tip === 'oksit') nd.push('O²⁻ anotta yükseltgenir: oksijen gazı oluşur.');
      else nd.push('OH⁻ anotta yükseltgenir: oksijen gazı ve su buharı oluşur.');
    } else {
      if (C.tip === 'H') nd.push('Asitteki H⁺ iyonları katotta indirgenir: hidrojen gazı çıkar.');
      else if (C.aktif) nd.push(C.f + ' aktif bir metalin iyonudur; suda indirgenmez. Onun yerine su indirgenir: H₂ çıkar, katot çevresi bazikleşir.');
      else nd.push(C.f + ' sudan daha kolay indirgenir: katotta ' + C.ad + ' toplanır.');
      if (anotM) nd.push('Anot ' + anotM.ad + ' olduğu için anotta elektrotun kendisi yükseltgenir: anot incelir.' + (p.ayniMetal ? ' Anottan çözünen kadar ' + C.ad + ' katotta toplanır; çözeltideki ' + C.f + ' miktarı değişmez.' : ''));
      else if (A.tip === 'hal' && A.k !== 'F') nd.push(A.f + ' anotta yükseltgenir: ' + A.ad2 + ' oluşur' + (A.k === 'Br' ? ', çözelti turuncu-kahverengi olur.' : (A.k === 'I' ? ', anot çevresi kahverengileşir.' : '.')));
      else if (A.k === 'F') nd.push('F⁻ suda yükseltgenmez; anotta su yükseltgenir: O₂ çıkar, anot çevresi asidikleşir.');
      else if (A.tip === 'oh') nd.push('OH⁻ iyonları anotta yükseltgenir: O₂ ve su oluşur.');
      else nd.push(A.f + ' iyonu yükseltgenmez; anotta su yükseltgenir: O₂ çıkar, anot çevresi asidikleşir.');
      var phT;
      if (p.ayniMetal) phT = 'değişmez';
      else if (p.kat.tip === 'su' && p.an.tip === 'su') phT = 'değişmez; katot çevresi bazik, anot çevresi asidik olur';
      else if (p.kat.tip === 'su' && p.an.tip === 'oh') phT = 'artar: su harcandıkça baz derişimi artar';
      else if (p.kat.tip === 'H' && p.an.tip === 'su') phT = 'azalır: su harcandıkça asit derişimi artar';
      else if (p.kat.tip === 'su') phT = 'artar: katotta OH⁻ oluşur';
      else if (p.kat.tip === 'H') phT = 'artar: H⁺ iyonları harcanır';
      else if (p.an.tip === 'su') phT = 'azalır: anotta H⁺ oluşur';
      else phT = 'yaklaşık değişmez';
      p.ph = phT;
    }
    p.neden = nd.join(' ');
    p.not = NOT[md.id + '|' + hal + '|' + kap.anot] || NOT[md.id + '|' + hal] || '';
    p.renk = (!erimis && C.coz) ? C.coz : null;
    if (!erimis && md.id === 'cucl2') p.renk = [70, 170, 190];
    if (!erimis && md.id === 'cubr2') p.renk = [110, 150, 110];
    return p;
  }

  /* ================= DURUM ================= */
  function yeniKap(madde, hal, anot) {
    var md = MADDE[madde];
    return { madde: madde, hal: hal, anot: anot || 'inert', mik: { c: Math.min(1, md.maks || 1), V: 200, kutle: 100, anot: 20 } };
  }
  var S = { n: 1, kaplar: [yeniKap('nacl', 'erimis'), yeniKap('cuso4', 'sulu'), yeniKap('agno3', 'sulu')], I: 2, t: 965, calis: false, tg: 0, hiz: 0, surum: 1, canli: [], son: [], etiket: [] };
  var PROF = [];
  function profilYenile() { PROF = S.kaplar.map(profil); S.surum++; }
  profilYenile();
  S.profil = function (i) { return PROF[i]; };
  LA.el = S;

  /* ================= HESAP ================= */
  function kapasite(i) {
    var k = S.kaplar[i], p = PROF[i], m = k.mik, inf = Infinity;
    if (p.erimis) { var c = m.kutle / p.md.M * p.md.a * p.C.z; return { kat: c, an: c, birlikte: true, neden: 'tuz' }; }
    if (p.ayniMetal) { var ca = m.anot / p.anotMetal.M * p.anotMetal.z; return { kat: ca, an: ca, birlikte: true, neden: 'anot' }; }
    var ns = m.c * m.V / 1000, K = { kat: inf, an: inf };
    if (p.kat.tip === 'metal' || (p.kat.tip === 'H' && p.A.tip === 'hal')) K.kat = ns * p.md.a * p.C.z;
    if (p.an.tip === 'hal') K.an = ns * p.md.b;
    if (p.an.tip === 'metal') { K.an = m.anot / p.anotMetal.M * p.anotMetal.z; K.anotSinir = true; }
    return K;
  }
  function miktar(part, e) { var u = part.u, n = e / u.e; return { part: part, u: u, e: e, n: n, m: n * u.M, V: u.tur === 'gaz' ? n * VM : null }; }
  function hesapla(i, ne) {
    var K = kapasite(i), p = PROF[i], r = { ne: ne, kat: [], an: [], K: K, tukendi: false };
    if ((K.birlikte || K.anotSinir) && ne > Math.min(K.kat, K.an) + 1e-12 && (K.birlikte || ne > K.an)) { r.tukendi = K.birlikte ? K.neden : 'anot'; r.ne = ne = K.birlikte ? K.kat : K.an; }
    r.kat.push(miktar(p.kat, Math.min(ne, K.kat)));
    if (ne > K.kat + 1e-12 && p.kat2) r.kat.push(miktar(p.kat2, ne - K.kat));
    r.an.push(miktar(p.an, Math.min(ne, K.an)));
    if (ne > K.an + 1e-12 && p.an2) r.an.push(miktar(p.an2, ne - K.an));
    return r;
  }
  function Q() { return S.I * S.t; }
  /* seri bağlı kaplarda en az yükte biten kap akımı keser */
  function hepsi(ne) {
    var L = [], enAz = ne, sinir = -1, neden = '';
    for (var i = 0; i < S.n; i++) { var r = hesapla(i, ne); L.push(r); if (r.tukendi && r.ne < enAz - 1e-15) { enAz = r.ne; sinir = i; neden = r.tukendi; } }
    if (sinir >= 0) { L = []; for (i = 0; i < S.n; i++) L.push(hesapla(i, enAz)); L.durdu = enAz; L.sinir = sinir; L.neden = neden; }
    return L;
  }
  function tukenmeYaz(kap, neden) { return (S.n > 1 ? (kap + 1) + '. kapta ' : '') + (neden === 'anot' ? 'anot tamamen çözündü' : 'tuz tükendi'); }

  /* ================= İSKELET ================= */
  var nav = $('.lab-sekme'), tiBolum = $('#m-titrasyon');
  if (!nav || !tiBolum) return;
  var sekB = document.createElement('button'); sekB.setAttribute('data-mod', 'elektroliz'); sekB.textContent = 'Elektroliz';
  var tiB = nav.querySelector('[data-mod="titrasyon"]'); nav.insertBefore(sekB, tiB ? tiB.nextSibling : null);
  sekB.addEventListener('click', function () { LA.modAc('elektroliz'); });
  var bolum = document.createElement('section'); bolum.className = 'mod'; bolum.id = 'm-elektroliz';
  tiBolum.parentNode.insertBefore(bolum, tiBolum.nextSibling);
  var ik = LA.ikon || function () { return ''; };
  var HAZIR = [
    ['Erimiş NaCl', [['nacl', 'erimis']]], ['Suyun elektrolizi', [['h2so4', 'sulu', 'inert', 0.5]]], ['Klor-alkali (NaCl suda)', [['nacl', 'sulu', 'inert', 5]]],
    ['Bakır saflaştırma', [['cuso4', 'sulu', 'Cu']]], ['Gümüş kaplama', [['agno3', 'sulu', 'Ag']]],
    ['Seri: AgNO₃ + CuSO₄', [['agno3', 'sulu'], ['cuso4', 'sulu']]], ['Seri: 3 kap', [['agno3', 'sulu'], ['cuso4', 'sulu'], ['nacl', 'erimis']]], ['Erimiş Al₂O₃', [['al2o3', 'erimis']]]
  ];
  bolum.innerHTML = '<div class="el">' +
    '<div class="kart el-kart"><div class="tezgah el-tezgah"><canvas id="lb-ecan" aria-label="Elektroliz düzeneği"></canvas></div>' +
    '<div class="el-canli" id="lb-ecanli"></div><div class="el-kartlar" id="lb-ekartlar" aria-live="polite"></div>' +
    '<div class="el-dug"><button type="button" class="ab ana el-calis" data-el="calis">' + ik('oynat') + '<span>Akımı aç</span></button>' +
    '<button type="button" class="ab" data-el="bas">' + ik('temiz') + '<span>Baştan</span></button></div>' +
    '<div class="el-hiz"><span>Hız</span><div class="ayar-cip" id="lb-ehiz"></div></div></div>' +
    '<div class="kart el-ayar-kart"><div class="panel-bas"><h2>Deney ayarları</h2></div><div class="ti-ayarlar">' +
    '<div class="ti-grup"><div class="ti-gb">Hazır düzenler</div><div class="ayar-cip el-hazir">' + HAZIR.map(function (d, j) { return '<button type="button" data-ehazir="' + j + '">' + h(d[0]) + '</button>'; }).join('') + '</div></div>' +
    '<div class="ti-grup"><div class="ti-gb">Seri bağlı kap sayısı</div><div class="ayar-cip el-sayi" id="lb-esayi"></div><div class="el-tanim">Seri bağlı kaplardan aynı yük geçer: her kapta aynı mol elektron alınıp verilir.</div></div>' +
    '<div id="lb-ekaplar"></div>' +
    '<div class="ti-grup"><div class="ti-gb"><span class="ti-nok b"></span>Akım, süre ve yük</div><div id="lb-eakim"></div><div id="lb-esure"></div><div id="lb-eyuk"></div>' +
    '<div class="el-bilgi">Q = I · t &nbsp;·&nbsp; 1 mol e⁻ = 1 F = 96 500 C. Akımı, süreyi, yükü ya da sonuçlardaki herhangi bir ürün miktarını değiştir; ötekiler kendiliğinden hesaplanır.</div></div>' +
    '</div></div>' +
    '<div class="kart el-sonuc-kart"><div class="panel-bas"><h2>Elektrotlarda ne oluşur?</h2></div><div class="ti-sonuc el-sonuc" id="lb-esonuc"></div></div>' +
    '</div>';

  /* ================= KAP AYARLARI ================= */
  var SECENEK = GRUP.map(function (g) {
    return '<optgroup label="' + h(g) + '">' + MLISTE.filter(function (m) { return m.grup === g; }).map(function (m) { return '<option value="' + m.id + '">' + h(m.f + ' · ' + m.ad) + '</option>'; }).join('') + '</optgroup>';
  }).join('');
  function sayiCiz() { $('#lb-esayi').innerHTML = [1, 2, 3].map(function (n) { return '<button type="button" data-esayi="' + n + '" class="' + (S.n === n ? 'on' : '') + '">' + n + ' kap</button>'; }).join(''); }
  function kapHtml(i) {
    var k = S.kaplar[i], md = MADDE[k.madde], p = PROF[i], C = KAT[md.k];
    var s = '<div class="ti-grup el-kap" data-kap="' + i + '"><div class="ti-gb"><span class="el-no">' + (i + 1) + '</span>' + (S.n > 1 ? (i + 1) + '. kap' : 'Elektrolit') + '</div>';
    s += '<select data-kmadde="' + i + '" aria-label="' + (i + 1) + '. kaptaki madde">' + SECENEK.replace('value="' + k.madde + '"', 'value="' + k.madde + '" selected') + '</select>';
    s += '<div class="ayar-cip el-sec">' + [['erimis', 'Erimiş', md.erime > 0], ['sulu', 'Sulu çözelti', md.maks > 0]].map(function (o) { return '<button type="button" data-khal="' + o[0] + '" data-k="' + i + '" class="' + (k.hal === o[0] ? 'on' : '') + '"' + (o[2] ? '' : ' disabled') + '>' + o[1] + '</button>'; }).join('') + '</div>';
    if (k.hal === 'sulu' && C.anot) s += '<div class="ayar-cip el-sec">' + [['inert', 'Grafit anot (inert)'], [C.s, buyuk(C.ad) + ' anot']].map(function (o) { return '<button type="button" data-kanot="' + o[0] + '" data-k="' + i + '" class="' + (k.anot === o[0] ? 'on' : '') + '">' + h(o[1]) + '</button>'; }).join('') + '</div>';
    s += '<div class="el-mik-satir">';
    if (k.hal === 'erimis') s += mikGirdi(i, 'kutle', 'Tuzun kütlesi', 'g');
    else s += mikGirdi(i, 'c', 'Derişim', 'M') + mikGirdi(i, 'V', 'Hacim', 'mL');
    if (p.anotMetal) s += mikGirdi(i, 'anot', 'Anotun kütlesi', 'g');
    s += '</div><div class="el-tanim">' + h(p.tam) + ' · ' + h(p.elektrot) + (p.T ? ' · ' + p.T + ' °C' : '') + (k.hal === 'sulu' ? ' · <i>ek konu</i>' : '') + '</div></div>';
    return s;
  }
  function mikGirdi(i, ad, et, birim) { return '<label class="el-mg"><span>' + et + '</span><span class="el-g"><input type="text" inputmode="decimal" autocomplete="off" data-kmik="' + ad + '" data-k="' + i + '" value="' + sayiYaz(S.kaplar[i].mik[ad]) + '"><span>' + birim + '</span></span></label>'; }
  function kaplarCiz() { var s = ''; for (var i = 0; i < S.n; i++) s += kapHtml(i); $('#lb-ekaplar').innerHTML = s; }
  var kapKok = $('#lb-ekaplar');
  kapKok.addEventListener('change', function (e) {
    var t = e.target, i;
    if (t.matches('[data-kmadde]')) {
      i = +t.getAttribute('data-kmadde'); var md = MADDE[t.value], k = S.kaplar[i];
      k.madde = t.value; if (k.hal === 'erimis' && !md.erime) k.hal = 'sulu'; if (k.hal === 'sulu' && !md.maks) k.hal = 'erimis';
      k.anot = 'inert'; k.mik.c = Math.min(k.mik.c, md.maks || 1); kapDegisti();
    } else if (t.matches('[data-kmik]')) {
      i = +t.getAttribute('data-k'); var ad = t.getAttribute('data-kmik'), v = sayiOku(t.value), kk = S.kaplar[i];
      var sinir = { c: [0.001, MADDE[kk.madde].maks || 5], V: [1, 5000], kutle: [0.1, 10000], anot: [0.1, 1000] }[ad];
      if (v > 0) kk.mik[ad] = Math.max(sinir[0], Math.min(sinir[1], v));
      t.value = sayiYaz(kk.mik[ad]); S.surum++; degisti();
    }
  });
  kapKok.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.matches('[data-kmik]')) e.target.blur(); });
  kapKok.addEventListener('click', function (e) {
    var b = e.target.closest('[data-khal],[data-kanot]'); if (!b || b.disabled) return;
    var i = +b.getAttribute('data-k'), k = S.kaplar[i];
    if (b.hasAttribute('data-khal')) { k.hal = b.getAttribute('data-khal'); k.anot = 'inert'; }
    else k.anot = b.getAttribute('data-kanot');
    kapDegisti();
  });
  function kapDegisti() { S.calis = false; S.tg = 0; S.tukendi = false; profilYenile(); kaplarCiz(); degisti(); }

  /* ================= AKIM, SÜRE, YÜK ================= */
  function bagla(kok0, ad, cfg, degis) {
    var kut = $('#lb-a-' + ad, kok0), kay = $('[data-kay="' + ad + '"]', kok0), lmin = Math.log(cfg.min), lmax = Math.log(Math.max(cfg.max, cfg.min * 1.0001));
    function kayKonum(v) { kay.value = Math.round((Math.log(Math.max(cfg.min, Math.min(cfg.max, v))) - lmin) / (lmax - lmin) * 1000); }
    function cipIsle(v) { $$('[data-cip="' + ad + '"]', kok0).forEach(function (b) { b.classList.toggle('on', Math.abs(+b.getAttribute('data-v') - v) < Math.max(1e-9, v * 1e-6)); }); }
    function yuvarla(v) { var e = Math.floor(Math.log(v) / Math.LN10), f = Math.pow(10, 2 - e), r = Math.round(v * f) / f; return cfg.tam ? Math.max(1, Math.round(r)) : r; }
    function goster(v, kaynak) { if (kaynak !== 'kutu') kut.value = sayiYaz(v); if (kaynak !== 'kay') kayKonum(v); cipIsle(v); }
    function ata(v, kaynak) { v = Math.max(cfg.min, Math.min(cfg.max, v)); cfg.v = v; goster(v, kaynak); degis(v); }
    goster(cfg.v);
    kay.addEventListener('input', function () { ata(yuvarla(Math.exp(lmin + (lmax - lmin) * (+kay.value) / 1000)), 'kay'); });
    kut.addEventListener('input', function () { var v = sayiOku(kut.value); if (isFinite(v) && v > 0) ata(v, 'kutu'); });
    kut.addEventListener('blur', function () { var v = sayiOku(kut.value); ata(isFinite(v) && v > 0 ? v : cfg.v); });
    kut.addEventListener('focus', function () { try { kut.select(); } catch (e) {} });
    kut.addEventListener('keydown', function (e) { if (e.key === 'Enter') kut.blur(); });
    $$('[data-cip="' + ad + '"]', kok0).forEach(function (b) { b.addEventListener('click', function () { ata(+b.getAttribute('data-v')); }); });
    return { ata: ata, sessiz: function (v) { v = Math.max(cfg.min, Math.min(cfg.max, v)); cfg.v = v; goster(v); } };
  }
  var IMAX = 100, IMIN = 0.01, TMAX = 360000, TMIN = 1, A = {};
  function altYaz(id, s) { var e = $('#' + id); if (e) e.innerHTML = s; }
  function akimSureCiz() {
    var cI = { etiket: 'Akım <span class="sym">(I)</span>', birim: 'A', min: IMIN, max: IMAX, v: S.I, cip: [0.5, 1, 2, 5, 9.65, 10] };
    var cT = { etiket: 'Süre <span class="sym">(t)</span>', birim: 's', min: TMIN, max: TMAX, v: S.t, cip: [60, 300, 965, 1930, 3600, 9650], tam: true, altYazi: '<span id="lb-esurealt"></span>' };
    var cQ = { etiket: 'Yük <span class="sym">(Q)</span>', birim: 'C', min: 0.01, max: IMAX * TMAX, v: Q(), cip: [965, 1930, 9650, 19300, 96500], altYazi: '<span id="lb-eyukalt"></span>' };
    $('#lb-eakim').innerHTML = ayarHtml('eI', cI); $('#lb-esure').innerHTML = ayarHtml('eT', cT); $('#lb-eyuk').innerHTML = ayarHtml('eQ', cQ);
    A.I = bagla($('#lb-eakim'), 'eI', cI, function (v) { S.I = v; A.Q.sessiz(Q()); degisti(); });
    A.T = bagla($('#lb-esure'), 'eT', cT, function (v) { S.t = v; A.Q.sessiz(Q()); degisti(); });
    A.Q = bagla($('#lb-eyuk'), 'eQ', cQ, function (v) { yukAta(v, 'Q'); });
  }
  function yukAta(q, kaynak) {
    q = Math.max(0.01, Math.min(IMAX * TMAX, q));
    var t = q / S.I;
    if (t > TMAX) { S.I = Math.min(IMAX, q / TMAX); t = q / S.I; A.I.sessiz(S.I); }
    else if (t < TMIN) { S.I = Math.max(IMIN, q / TMIN); t = q / S.I; A.I.sessiz(S.I); }
    S.t = t; A.T.sessiz(S.t);
    if (kaynak !== 'Q') A.Q.sessiz(Q());
    degisti();
  }
  function altlarYaz() { altYaz('lb-esurealt', '= ' + sureYaz(S.t)); altYaz('lb-eyukalt', '= ' + anl(Q() / F, 3) + ' mol e⁻'); }
  var HIZLAR = [0, 1, 10, 100];
  function hizCiz() { $('#lb-ehiz').innerHTML = HIZLAR.map(function (v) { return '<button type="button" data-ehiz="' + v + '" class="' + (S.hiz === v ? 'on' : '') + '">' + (v ? v + '×' : 'Otomatik') + '</button>'; }).join(''); }
  function etkinHiz() {
    if (S.hiz) return S.hiz;
    var L = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000];
    for (var i = 0; i < L.length; i++) if (S.t / L[i] <= 12) return L[i];
    return L[L.length - 1];
  }

  /* ================= SONUÇ KARTI ================= */
  var HAL = { k: 'katı', s: 'sıvı', g: 'gaz', suda: 'suda çözünmüş' };
  function tarafHtml(i, tur, L) {
    var p = PROF[i], ana = L[0], u = ana.u, kat = tur === 'kat', anotM = u.tur === 'anotMetal';
    var s = '<div class="el-taraf ' + tur + '"><div class="el-tb"><span class="el-isaret">' + (kat ? '−' : '+') + '</span>' + (kat ? 'Katot' : 'Anot') + ' <small>' + (kat ? 'indirgenme' : 'yükseltgenme') + '</small></div>';
    s += '<div class="el-yari">' + h(ana.part.yari) + '</div>';
    s += '<div class="el-urun"><b>' + h(u.f) + '</b> ' + h(anotM ? 'anottan çözünen ' + p.anotMetal.ad : u.ad) + (anotM ? '' : ' · ' + HAL[ana.part.hal]) + '</div>';
    s += '<div class="el-mik"><span class="el-mol">' + anl(ana.n, 3) + ' mol</span>' +
      '<label class="el-g"><input type="text" inputmode="decimal" autocomplete="off" data-hedef="m" data-kap="' + i + '" data-taraf="' + tur + '" value="' + anl(ana.m, 3) + '"><span>g' + (anotM ? ' <small>azalır</small>' : '') + '</span></label>' +
      (ana.V !== null ? '<label class="el-g"><input type="text" inputmode="decimal" autocomplete="off" data-hedef="V" data-kap="' + i + '" data-taraf="' + tur + '" value="' + anl(ana.V, 3) + '"><span>L <small>(NŞ)</small></span></label>' : '') + '</div>';
    if (L[1]) { var e = L[1]; s += '<div class="el-ek"><b>' + h(kat ? p.kIyon : p.aIyon) + ' bitti.</b> Sonra: ' + h(e.part.yari) + '<br>' + h(e.u.f) + ': ' + anl(e.n, 3) + ' mol · ' + anl(e.m, 3) + ' g' + (e.V !== null ? ' · ' + hacimYaz(e.V) + ' (NŞ)' : '') + '</div>'; }
    return s + '</div>';
  }
  function hesapSatiri(tur, x) {
    var u = x.u, ad = tur === 'kat' ? 'Katot' : 'Anot', oran = (u.e === 1 ? '1' : u.e) + ' mol e⁻ ile 1 mol ' + u.f;
    var s = '<b>' + ad + ':</b> ' + h(x.part.yari) + ' ⇒ ' + oran + '<br>n(' + u.f + ') = ' + (u.e !== 1 ? anl(x.e, 3) + ' ÷ ' + u.e : 'n(e⁻)') + ' = ' + anl(x.n, 3) + ' mol · m = ' + anl(x.n, 3) + ' × ' + u.M + ' = <b>' + anl(x.m, 3) + ' g</b>';
    if (x.V !== null) s += ' · V = ' + anl(x.n, 3) + ' × 22,4 = <b>' + anl(x.V, 3) + ' L</b>';
    return s;
  }
  function sonucCiz() {
    var L = hepsi(Q() / F), s = '', sulu = false;
    S.son = L;
    for (var i = 0; i < S.n; i++) {
      var p = PROF[i], r = L[i]; if (p.hal === 'sulu') sulu = true;
      s += '<div class="el-kap-sonuc">';
      if (S.n > 1) s += '<div class="el-kb"><span class="el-no">' + (i + 1) + '</span><b>' + h(p.ad) + '</b> <small>' + h(p.elektrot) + '</small></div>';
      s += '<div class="el-taraflar">' + tarafHtml(i, 'kat', r.kat) + tarafHtml(i, 'an', r.an) + '</div>';
      s += '<div class="kutu el-net"><b>' + p.netBas + '</b><div class="el-denk">' + h(p.net) + '</div></div>';
      s += '<details class="kutu el-neden"' + (S.n === 1 ? ' open' : '') + '><summary>Neden bu ürünler?</summary>' + h(p.neden) + (p.ph ? '<br><span class="ince">Çözeltinin pH’ı ' + h(p.ph) + '.</span>' : '') + (p.not ? '<div class="el-not">' + h(p.not) + '</div>' : '') + '</details>';
      s += '</div>';
    }
    var hs = 'Q = I · t = ' + sayiYaz(S.I) + ' A × ' + sayiYaz(S.t) + ' s = <b>' + anl(Q(), 4) + ' C</b><br>n(e⁻) = Q ÷ F = ' + anl(Q(), 4) + ' ÷ 96 500 = <b>' + anl(Q() / F, 3) + ' mol</b>';
    if (L.durdu !== undefined) hs += '<br><span class="el-uyari">' + buyuk(tukenmeYaz(L.sinir, L.neden)) + ': devreden en fazla ' + anl(L.durdu, 3) + ' mol e⁻ (' + anl(L.durdu * F, 4) + ' C) geçebilir. Sonuçlar bu yüke göredir.</span>';
    for (i = 0; i < S.n; i++) {
      var r2 = L[i], p2 = PROF[i];
      if (S.n > 1) hs += '<br><b class="el-hk">' + (i + 1) + '. kap · ' + h(p2.ad) + '</b>';
      hs += '<br>' + hesapSatiri('kat', r2.kat[0]) + '<br>' + hesapSatiri('an', r2.an[0]);
      if (r2.kat[1]) hs += '<br>' + h(p2.kIyon) + ' en fazla ' + anl(r2.K.kat, 3) + ' mol e⁻ alabilir; kalan ' + anl(r2.kat[1].e, 3) + ' mol e⁻ ile katotta ' + r2.kat[1].u.f + ' çıkar.';
      if (r2.an[1]) hs += '<br>' + h(p2.aIyon) + ' en fazla ' + anl(r2.K.an, 3) + ' mol e⁻ verebilir; kalan ' + anl(r2.an[1].e, 3) + ' mol e⁻ ile anotta ' + r2.an[1].u.f + ' çıkar.';
    }
    var ust = '';
    if (S.n > 1) {
      var kl = L.map(function (r, j) { var x = r.kat[0]; return (j + 1) + '. kap: <b>' + anl(x.m, 3) + ' g ' + x.u.f + '</b>' + (x.V !== null ? ' (' + hacimYaz(x.V) + ')' : ''); });
      var al = L.map(function (r, j) { var x = r.an[0]; return (j + 1) + '. kap: <b>' + (x.u.tur === 'anotMetal' ? '−' : '') + anl(x.m, 3) + ' g ' + x.u.f + '</b>' + (x.V !== null ? ' (' + hacimYaz(x.V) + ')' : ''); });
      var kat = L.map(function (r) { return r.kat[0].u; }), ok = kat.map(function (u) { return 1 / u.e; }), en = Math.min.apply(null, ok);
      ust = '<div class="kutu el-seri"><b>Seri bağlı kaplar</b><br>Her kaptan aynı yük geçer: Q = ' + anl(Q(), 4) + ' C, n(e⁻) = ' + anl(Q() / F, 3) + ' mol.' +
        '<br>Katotlarda → ' + kl.join(' · ') + '<br>Anotlarda → ' + al.join(' · ') +
        '<br>Mol oranı: ' + kat.map(function (u) { return 'n(' + u.f + ')'; }).join(' : ') + ' = ' + ok.map(function (x) { return sayiYaz(Math.round(x / en * 100) / 100); }).join(' : ') + ' <span class="ince">(alınan elektronla ters orantılı)</span></div>';
    }
    s = ust + s + '<div class="kutu sonuc"><b>Hesap</b><div class="hesap">' + hs + '</div></div>';
    if (sulu) s += '<div class="kutu ince el-ekkonu">Sulu çözeltilerin elektrolizi ek konudur: kurallar, soru bankalarında karşına çıkan örneklere göre verilmiştir.</div>';
    var kutu = $('#lb-esonuc'); if (document.activeElement && kutu.contains(document.activeElement) && document.activeElement.matches('input')) return;
    var acik = $$('details.el-neden', kutu).map(function (d) { return d.open; });
    kutu.innerHTML = s;
    if (S.n > 1) $$('details.el-neden', kutu).forEach(function (d, j) { if (acik[j]) d.open = true; });
    sigdir(kutu);
  }
  function sigdir(kok0) { $$('.el-yari, .el-denk', kok0).forEach(function (e) { var f = 13.5; e.style.fontSize = ''; while (e.scrollWidth > e.clientWidth + 1 && f > 10.5) { f -= 0.5; e.style.fontSize = f + 'px'; } }); }
  $('#lb-esonuc').addEventListener('change', function (e) {
    var g = e.target.closest('input[data-hedef]'); if (!g) return;
    var v = sayiOku(g.value), i = +g.getAttribute('data-kap'), tur = g.getAttribute('data-taraf'), L = S.son;
    if (!(v > 0) || !L || !L[i]) { g.blur(); sonucCiz(); return; }
    var r = L[i], x = (tur === 'kat' ? r.kat : r.an)[0], u = x.u, ne = g.getAttribute('data-hedef') === 'V' ? v / VM * u.e : v / u.M * u.e;
    var cap = tur === 'kat' ? r.K.kat : r.K.an;
    if (ne > cap) { ne = cap; if (LA.tost) LA.tost('En fazla ' + anl(cap / u.e * u.M, 3) + ' g ' + u.f + ' oluşabilir: elektrolit yetmez.'); }
    g.blur(); yukAta(ne * F);
  });
  $('#lb-esonuc').addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.matches('input[data-hedef]')) e.target.blur(); });

  /* ================= CANLI GÖSTERGE ================= */
  function canliHesap() { S.canli = hepsi(S.I * S.tg / F); return S.canli; }
  function urunYaz(x) { var u = x.u; if (u.tur === 'gaz') return hacimYaz(x.V); if (u.tur === 'anotMetal') return '−' + anl(x.m, 3) + ' g'; return anl(x.m, 3) + ' g'; }
  /* tezgâhın altındaki canlı kartlar: her kapta katotta ve anotta o ana kadar oluşan */
  function kartHtml(i, r) {
    var p = PROF[i], s = '<div class="el-ec"><div class="el-ec-b">' + (S.n > 1 ? '<span class="el-no">' + (i + 1) + '</span>' : '') + '<span>' + h(p.md.f) + '<wbr>' + (p.erimis ? '(s)' : '(suda)') + (p.T ? ' <small>' + p.T + ' °C</small>' : '') + '</span></div>';
    [['kat', '−', 'Katot'], ['an', '+', 'Anot']].forEach(function (d) {
      var L = r[d[0]];
      s += '<div class="el-ec-s ' + d[0] + '"><i aria-label="' + d[2] + '">' + d[1] + '</i>' + L.map(function (x) { return '<span class="el-ec-u"><b>' + h(x.u.f) + '</b> ' + urunYaz(x) + '</span>'; }).join('<span class="el-ec-ok">→</span>') + '</div>';
    });
    return s + '</div>';
  }
  var sonKart = '';
  function canliCiz() {
    var L = canliHesap(), oran = Math.min(1, S.tg / S.t), hz = etkinHiz(), ne = L[0] ? L[0].ne : 0;
    $('#lb-ecanli').innerHTML = '<div class="el-ilerle"><i style="width:' + (oran * 100).toFixed(1) + '%"></i></div>' +
      '<div class="el-canli-s"><span><b>' + saatYaz(S.tg) + '</b> / ' + saatYaz(S.t) + '</span><span>Q <b>' + anl(S.I * S.tg, 3) + '</b> C</span><span>e⁻ <b>' + anl(ne, 3) + '</b> mol</span><span class="el-hz">' + (S.calis ? '×' + hz + ' hızlı' : (S.tukendi ? 'Madde tükendi' : (oran >= 1 ? 'Tamamlandı' : (S.tg > 0 ? 'Durdu' : 'Hazır')))) + '</span></div>';
    var s = ''; for (var i = 0; i < S.n; i++) s += kartHtml(i, L[i]);
    if (s !== sonKart) { var kk = $('#lb-ekartlar'); kk.innerHTML = s; kk.className = 'el-kartlar n' + S.n; sonKart = s; }
  }
  function dugmeCiz() {
    var b = $('[data-el="calis"]', bolum);
    b.classList.toggle('on', S.calis);
    b.innerHTML = (S.calis ? '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="1.5"/></svg><span>Akımı kes</span>' : ik('oynat') + '<span>' + (S.tg > 0 && S.tg < S.t && !S.tukendi ? 'Devam et' : 'Akımı aç') + '</span>');
  }
  function degisti() { altlarYaz(); sonucCiz(); if (S.tg > S.t) S.tg = S.t; canliCiz(); dugmeCiz(); }
  function bitir(erken, tk) {
    S.calis = false; S.tukendi = !!tk; dugmeCiz(); canliCiz();
    var L = canliHesap(), parca = [];
    for (var i = 0; i < S.n; i++) { var k = L[i].kat[0], a = L[i].an[0]; parca.push((S.n > 1 ? (i + 1) + '. kap ' : '') + PROF[i].ad + ': katotta ' + anl(k.m, 3) + ' g ' + k.u.f + (k.V !== null ? ' (' + hacimYaz(k.V) + ')' : '') + ', anotta ' + (a.u.tur === 'anotMetal' ? anl(a.m, 3) + ' g ' + a.u.f + ' çözündü' : anl(a.m, 3) + ' g ' + a.u.f + (a.V !== null ? ' (' + hacimYaz(a.V) + ')' : ''))); }
    if (LA.gunlukIs) LA.gunlukIs('Elektroliz · ' + sayiYaz(S.I) + ' A × ' + sureYaz(S.tg) + ' (' + anl(S.I * S.tg, 4) + ' C) · ' + parca.join(' · '));
    var k0 = L[0].kat[0];
    if (LA.tost) LA.tost(tk ? buyuk(tukenmeYaz(tk.kap, tk.neden)) + '; akım kesildi.' : (erken ? 'Akım kesildi.' : 'Elektroliz tamamlandı: ' + (S.n > 1 ? '1. kapta ' : 'katotta ') + anl(k0.m, 3) + ' g ' + k0.u.f + '.'));
  }

  /* ================= ETKİLEŞİM ================= */
  bolum.addEventListener('click', function (e) {
    var b = e.target.closest('[data-el]'), hz = e.target.closest('[data-ehiz]'), sy = e.target.closest('[data-esayi]'), hd = e.target.closest('[data-ehazir]');
    if (hz) { S.hiz = +hz.getAttribute('data-ehiz'); hizCiz(); canliCiz(); return; }
    if (sy) { S.n = +sy.getAttribute('data-esayi'); sayiCiz(); kapDegisti(); return; }
    if (hd) { hazirUygula(+hd.getAttribute('data-ehazir')); return; }
    if (!b) return;
    var v = b.getAttribute('data-el');
    if (v === 'calis') {
      if (S.calis) { bitir(true); return; }
      if (S.tg >= S.t - 1e-9 || S.tukendi) { S.tg = 0; S.tukendi = false; S.surum++; }
      S.calis = true; dugmeCiz(); canliCiz();
    } else if (v === 'bas') { S.calis = false; S.tg = 0; S.tukendi = false; S.surum++; dugmeCiz(); canliCiz(); }
  });
  function hazirUygula(j) {
    var d = HAZIR[j][1];
    S.n = d.length;
    d.forEach(function (x, i) { var k = yeniKap(x[0], x[1], x[2]); if (x[3]) k.mik.c = x[3]; S.kaplar[i] = k; });
    sayiCiz(); kapDegisti();
  }

  /* ================= DÖNGÜ ================= */
  var sonCanli = 0;
  LA.elDongu = function (t, dt) { try { elAdim(t, dt); } catch (e) { if (window.console) console.warn('elektroliz:', e); } };
  function elAdim(t, dt) {
    if (S.calis) {
      S.tg += dt * etkinHiz();
      var L = canliHesap();
      if (L.durdu !== undefined) { var tk = { kap: L.sinir, neden: L.neden }; S.tg = L.durdu * F / S.I; bitir(false, tk); }
      else if (S.tg >= S.t) { S.tg = S.t; bitir(false); }
    }
    var su = t * 1000;
    if (S.calis ? su - sonCanli > 120 : su - sonCanli > 600) { sonCanli = su; canliCiz(); }
    var C = LA.cizici;
    if (C && C.elCiz) C.elCiz(t, dt); else ciz2d();
  }
  LA.elAcildi = function () { canliCiz(); if (!(LA.cizici && LA.cizici.elCiz)) { boyut2d(); ciz2d(); } };

  /* ================= 2D YEDEK ÇİZİM (WebGL yoksa) ================= */
  var cv = $('#lb-ecan'), cx = cv.getContext('2d'), dpr2 = 1, w2 = 360, h2 = 300;
  function boyut2d() { w2 = cv.parentNode.clientWidth || 360; h2 = Math.round(w2 * 0.7); dpr2 = Math.min(2, window.devicePixelRatio || 1); cv.width = Math.round(w2 * dpr2); cv.height = Math.round(h2 * dpr2); cv.style.height = h2 + 'px'; }
  function ciz2d() {
    try {
      if (LA.cizici && LA.cizici.elCiz) return;
      if (cv.width < 10) boyut2d();
      var c = cx, s = w2 / 360, L = S.canli.length ? S.canli : canliHesap(), n = S.n, gw = 360 / n;
      c.setTransform(dpr2 * s, 0, 0, dpr2 * s, 0, 0);
      var g = c.createLinearGradient(0, 0, 0, 252); g.addColorStop(0, '#E3ECF4'); g.addColorStop(0.75, '#F5F0EA'); g.addColorStop(0.751, '#E6D2B4'); g.addColorStop(1, '#DCC3A0');
      c.fillStyle = g; c.fillRect(0, 0, 360, 252);
      for (var i = 0; i < n; i++) {
        var p = PROF[i], x0 = i * gw + gw * 0.18, w = gw * 0.64, r = L[i];
        c.fillStyle = p.erimis ? 'rgba(255,150,60,.85)' : (p.renk ? 'rgba(' + p.renk.join(',') + ',.45)' : 'rgba(200,225,245,.55)'); c.fillRect(x0, 120, w, 80);
        c.strokeStyle = 'rgba(120,140,160,.85)'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(x0, 70); c.lineTo(x0, 202); c.lineTo(x0 + w, 202); c.lineTo(x0 + w, 70); c.stroke();
        c.fillStyle = '#3A3D42'; c.fillRect(x0 + w * 0.25, 50, 7, 140); c.fillRect(x0 + w * 0.7, 50, 7, 140);
        c.fillStyle = '#14110F'; c.font = '700 11px system-ui'; c.textAlign = 'center'; c.fillText((n > 1 ? (i + 1) + '. ' : '') + p.ad, x0 + w / 2, 38);
        c.font = '600 10px system-ui'; c.fillStyle = '#5C554F';
        c.fillText('+ ' + r.an[0].u.f + (S.tg > 0 ? ' ' + urunYaz(r.an[0]) : ''), x0 + w / 2, 222);
        c.fillText('− ' + r.kat[0].u.f + (S.tg > 0 ? ' ' + urunYaz(r.kat[0]) : ''), x0 + w / 2, 238);
      }
    } catch (e) {}
  }
  window.addEventListener('resize', function () { if (LA.mod === 'elektroliz' && !(LA.cizici && LA.cizici.elCiz)) boyut2d(); });

  /* ================= BAŞLAT ================= */
  hizCiz(); sayiCiz(); kaplarCiz(); akimSureCiz(); degisti();
  LA.elMadde = MADDE; LA.elProfil = profil; LA.elHesapla = hesapla; LA.elDurum = S;
  LA.elHazir = function (ad) { var j = HAZIR.map(function (d) { return d[0]; }).indexOf(ad); if (j >= 0) hazirUygula(j); };
  LA.elKur = function (dizi, n) { S.n = n || dizi.length; dizi.forEach(function (x, i) { var k = yeniKap(x[0], x[1], x[2]); if (x[3]) k.mik.c = x[3]; S.kaplar[i] = k; }); sayiCiz(); kapDegisti(); };
  if ((location.hash || '') === '#elektroliz') LA.modAc('elektroliz');
})();
