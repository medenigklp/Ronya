/* Sanal Laboratuvar · kimya motoru (lab-motor.js)
   Kaptaki her bileşenin toplam mol miktarı tutulur. pH yük denkliğinden; çökelme
   çözünürlük çarpımından (Kçç); kompleks iyonlar oluşum sabitlerinden hesaplanır.
   Metal + asit, H2O2 bozunması ve gaz çıkışı gibi yavaş olaylar zaman adımıyla
   ilerler. Sıcaklık; nötralleşme, çözünme, çökelme ve tepkime ısılarından bulunur.
   Kod ES5 ile yazıldı (eski tarayıcılarda da çalışsın diye). */
(function (kok) {
  'use strict';

  /* ================= 0. YARDIMCILAR ================= */
  var LN10 = Math.LN10, R = 8.314, TK = 273.15;
  function lg(x) { return Math.log(x) / LN10; }
  function p10(x) { return Math.pow(10, x); }
  function sinir(x, a, b) { return x < a ? a : (x > b ? b : x); }
  function topla(o, k, x) { o[k] = (o[k] || 0) + x; }
  function obeb(a, b) { return b ? obeb(b, a % b) : a; }

  var ALT = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉' };
  var UST = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '+': '⁺', '-': '⁻' };
  /* 'Al2(SO4)3' → 'Al₂(SO₄)₃'; baştaki katsayıya dokunmaz */
  function alt(f) {
    var s = '', altta = false;
    for (var i = 0; i < f.length; i++) {
      var ch = f.charAt(i);
      if (ALT[ch] && altta) { s += ALT[ch]; continue; }
      altta = /[A-Za-z\)\]]/.test(ch);
      s += ch;
    }
    return s;
  }
  function tr(x, d) {
    if (!isFinite(x)) return '–';
    var s = (Math.abs(x) < 1e-12 ? 0 : x).toFixed(d === undefined ? 2 : d);
    return s.replace('-', '−').replace('.', ',');
  }
  function us(n) { return String(n).split('').map(function (c) { return UST[c] || c; }).join(''); }
  function bilimsel(x, d) {
    if (!(x > 0)) return '0';
    var e = Math.floor(lg(x)), m = x / p10(e);
    if (m >= 9.95) { m /= 10; e += 1; }
    if (e === 0) return tr(m, d === undefined ? 1 : d);
    return tr(m, d === undefined ? 1 : d) + '·10' + us(e);
  }
  function derisim(c) {
    if (!(c > 0)) return '0 M';
    if (c >= 0.0095) return tr(c, c >= 1 ? 2 : 3) + ' M';
    return bilimsel(c, 1) + ' M';
  }
  function molYaz(n) {
    if (n >= 0.01) return tr(n, 3) + ' mol';
    if (n >= 1e-5) return tr(n * 1000, 2) + ' mmol';
    return bilimsel(n, 1) + ' mol';
  }

  /* ================= 1. İYONLAR VE SABİTLER (25 °C) ================= */
  /* Katyonlar. oh: [[n, logβn]] → M + nOH⁻ ⇌ M(OH)n ; nh3: logβ1..βn (amin kompleksleri)
     dHf: oluşum entalpisi (kJ/mol, H⁺ = 0) ; lam: molar iletkenlik (S·cm²/mol) */
  var KAT = {
    Na:  { z: 1, ad: 'Na⁺', lam: 50.1, dHf: -240.1, alev: '#FFB21E', alevAd: 'sarı-turuncu' },
    K:   { z: 1, ad: 'K⁺', lam: 73.5, dHf: -252.4, alev: '#B784E0', alevAd: 'leylak (açık mor)' },
    Li:  { z: 1, ad: 'Li⁺', lam: 38.7, dHf: -278.5, alev: '#E3123F', alevAd: 'koyu kırmızı' },
    Ag:  { z: 1, ad: 'Ag⁺', lam: 61.9, dHf: 105.6, nh3: [3.31, 7.22] },
    Ca:  { z: 2, ad: 'Ca²⁺', lam: 119, dHf: -542.8, alev: '#F0642A', alevAd: 'tuğla kırmızısı (turuncu-kırmızı)' },
    Ba:  { z: 2, ad: 'Ba²⁺', lam: 127, dHf: -537.6, alev: '#A9DC52', alevAd: 'açık yeşil' },
    Sr:  { z: 2, ad: 'Sr²⁺', lam: 119, dHf: -545.8, alev: '#F2162A', alevAd: 'parlak kırmızı' },
    Mg:  { z: 2, ad: 'Mg²⁺', lam: 106, dHf: -466.9 },
    Cu:  { z: 2, ad: 'Cu²⁺', lam: 107, dHf: 64.8, oh: [[1, 6.0], [4, 16.4]], nh3: [4.31, 7.98, 11.02, 13.32], alev: '#22C7A0', alevAd: 'mavi-yeşil' },
    Zn:  { z: 2, ad: 'Zn²⁺', lam: 106, dHf: -153.9, oh: [[1, 5.0], [3, 14.2], [4, 15.5]], nh3: [2.37, 4.81, 7.31, 9.46] },
    Fe2: { z: 2, ad: 'Fe²⁺', lam: 108, dHf: -89.1, oh: [[1, 4.5]] },
    Pb:  { z: 2, ad: 'Pb²⁺', lam: 142, dHf: -1.7, oh: [[1, 6.3], [3, 13.9]] },
    Co:  { z: 2, ad: 'Co²⁺', lam: 110, dHf: -58.2, oh: [[1, 4.3]] },
    Mn:  { z: 2, ad: 'Mn²⁺', lam: 107, dHf: -220.8, oh: [[1, 3.4]] },
    Fe3: { z: 3, ad: 'Fe³⁺', lam: 204, dHf: -48.5, oh: [[1, 11.8], [2, 22.3]] },
    Al:  { z: 3, ad: 'Al³⁺', lam: 189, dHf: -531, oh: [[1, 9.0], [4, 33.0]] }
  };
  /* Kuvvetli asitlerin anyonları */
  var ANY = {
    Cl:   { z: -1, ad: 'Cl⁻', lam: 76.3 },
    Br:   { z: -1, ad: 'Br⁻', lam: 78.1 },
    I:    { z: -1, ad: 'I⁻', lam: 76.8 },
    NO3:  { z: -1, ad: 'NO₃⁻', lam: 71.5 },
    SCN:  { z: -1, ad: 'SCN⁻', lam: 66 },
    MnO4: { z: -1, ad: 'MnO₄⁻', lam: 61.3 },
    S2O3: { z: -2, ad: 'S₂O₃²⁻', lam: 170 }
  };
  /* Zayıf asit-baz sistemleri. z0: tam protonlu türün yükü; h: türlerin bağıl entalpisi (kJ/mol) */
  var ZAY = {
    Ac:  { pKa: [4.76], z0: 0, tur: ['CH₃COOH', 'CH₃COO⁻'], lam: [0, 40.9], h: [0, -0.4] },
    NH3: { pKa: [9.25], z0: 1, tur: ['NH₄⁺', 'NH₃'], lam: [73.5, 0], h: [0, 52.2] },
    CO3: { pKa: [6.35, 10.33], z0: 0, tur: ['H₂CO₃', 'HCO₃⁻', 'CO₃²⁻'], lam: [0, 44.5, 138.6], h: [0, 9.2, 24.0] },
    SO4: { pKa: [-3, 1.99], z0: 0, tur: ['H₂SO₄', 'HSO₄⁻', 'SO₄²⁻'], lam: [0, 52, 160], h: [0, 0, -22] },
    Sit: { pKa: [3.13, 4.76, 6.40], z0: 0, tur: ['H₃C₆H₅O₇', 'H₂C₆H₅O₇⁻', 'HC₆H₅O₇²⁻', 'C₆H₅O₇³⁻'], lam: [0, 30, 60, 90], h: [0, 4.1, 6.3, 2.9] },
    OCl: { pKa: [7.53], z0: 0, tur: ['HOCl', 'OCl⁻'], lam: [0, 40], h: [0, 13.8] },
    Vit: { pKa: [4.17, 11.57], z0: 0, tur: ['C₆H₈O₆', 'C₆H₇O₆⁻', 'C₆H₆O₆²⁻'], lam: [0, 30, 60], h: [0, 0, 0] }
  };
  /* İyonlaşmayan (moleküler) bileşenler */
  var MOL = { H2O2: 'H₂O₂', I2: 'I₂', Nis: 'Nişasta', Sab: 'Deterjan', Seker: 'C₁₂H₂₂O₁₁', Dhs: 'C₆H₆O₆', S: 'S (kükürt)', C: 'C (karbon)' };
  /* Çökelekler: m metal, a katsayı, x anyon ('OH' = hidroksit), b katsayı, lk log Kçç,
     dh çökelme entalpisi (kJ/mol, iyonlardan katıya), dT: log Kçç'nin °C başına değişimi (ölçüm) */
  var CK = [
    { id: 'AgCl', f: 'AgCl', ad: 'gümüş klorür', m: 'Ag', a: 1, x: 'Cl', b: 1, lk: -9.74, dh: -65.5, renk: '#F4F4EF', tarif: 'beyaz, peynirimsi', bul: 320 },
    { id: 'AgBr', f: 'AgBr', ad: 'gümüş bromür', m: 'Ag', a: 1, x: 'Br', b: 1, lk: -12.3, dh: -84.4, renk: '#EFE6B8', tarif: 'krem renkli', bul: 300 },
    { id: 'AgI', f: 'AgI', ad: 'gümüş iyodür', m: 'Ag', a: 1, x: 'I', b: 1, lk: -16.08, dh: -112.2, renk: '#EBD65E', tarif: 'açık sarı', bul: 300 },
    { id: 'PbI2', f: 'PbI2', ad: 'kurşun(II) iyodür', m: 'Pb', a: 1, x: 'I', b: 2, lk: -8.0, dT: 0.0293, dh: -63.4, renk: '#F3BE0C', tarif: 'parlak sarı', bul: 260, parilti: 1 },
    { id: 'PbCl2', f: 'PbCl2', ad: 'kurşun(II) klorür', m: 'Pb', a: 1, x: 'Cl', b: 2, lk: -4.77, dT: 0.012, dh: -23.3, renk: '#F4F4F0', tarif: 'beyaz', bul: 200 },
    { id: 'PbSO4', f: 'PbSO4', ad: 'kurşun(II) sülfat', m: 'Pb', a: 1, x: 'SO4', b: 1, lk: -7.6, dh: -8.9, renk: '#F6F6F2', tarif: 'beyaz', bul: 240 },
    { id: 'BaSO4', f: 'BaSO4', ad: 'baryum sülfat', m: 'Ba', a: 1, x: 'SO4', b: 1, lk: -9.96, dh: -26.3, renk: '#FAFAF7', tarif: 'beyaz, ince taneli', bul: 340 },
    { id: 'SrSO4', f: 'SrSO4', ad: 'stronsiyum sülfat', m: 'Sr', a: 1, x: 'SO4', b: 1, lk: -6.5, dh: 2.0, renk: '#F8F8F5', tarif: 'beyaz', bul: 260 },
    { id: 'CaSO4', f: 'CaSO4', ad: 'kalsiyum sülfat', m: 'Ca', a: 1, x: 'SO4', b: 1, lk: -4.31, dh: 18, renk: '#F8F8F5', tarif: 'beyaz', bul: 200 },
    { id: 'Ag2SO4', f: 'Ag2SO4', ad: 'gümüş sülfat', m: 'Ag', a: 2, x: 'SO4', b: 1, lk: -4.92, dh: -17.8, renk: '#F6F6F2', tarif: 'beyaz', bul: 200 },
    { id: 'CaCO3', f: 'CaCO3', ad: 'kalsiyum karbonat', m: 'Ca', a: 1, x: 'CO3', b: 1, lk: -8.47, dh: 12.3, renk: '#F7F7F3', tarif: 'beyaz', bul: 300 },
    { id: 'BaCO3', f: 'BaCO3', ad: 'baryum karbonat', m: 'Ba', a: 1, x: 'CO3', b: 1, lk: -8.59, dh: -1.6, renk: '#F7F7F3', tarif: 'beyaz', bul: 300 },
    { id: 'SrCO3', f: 'SrCO3', ad: 'stronsiyum karbonat', m: 'Sr', a: 1, x: 'CO3', b: 1, lk: -9.25, dh: 2.8, renk: '#F7F7F3', tarif: 'beyaz', bul: 300 },
    { id: 'MgCO3', f: 'MgCO3', ad: 'magnezyum karbonat', m: 'Mg', a: 1, x: 'CO3', b: 1, lk: -5.17, dh: 48.2, renk: '#F7F7F3', tarif: 'beyaz', bul: 240 },
    { id: 'CuCO3', f: 'CuCO3', ad: 'bakır(II) karbonat', m: 'Cu', a: 1, x: 'CO3', b: 1, lk: -9.63, dh: 17.3, renk: '#5DA99B', tarif: 'mavi-yeşil', bul: 260 },
    { id: 'ZnCO3', f: 'ZnCO3', ad: 'çinko karbonat', m: 'Zn', a: 1, x: 'CO3', b: 1, lk: -10.0, dh: 18.2, renk: '#F7F7F3', tarif: 'beyaz', bul: 260 },
    { id: 'PbCO3', f: 'PbCO3', ad: 'kurşun(II) karbonat', m: 'Pb', a: 1, x: 'CO3', b: 1, lk: -13.13, dh: -20.3, renk: '#F7F7F3', tarif: 'beyaz', bul: 280 },
    { id: 'Ag2CO3', f: 'Ag2CO3', ad: 'gümüş karbonat', m: 'Ag', a: 2, x: 'CO3', b: 1, lk: -11.09, dh: -39.9, renk: '#EEE3BC', tarif: 'açık sarı', bul: 260 },
    { id: 'Cu(OH)2', f: 'Cu(OH)2', ad: 'bakır(II) hidroksit', m: 'Cu', a: 1, x: 'OH', b: 2, lk: -19.3, dh: -54.6, renk: '#6EB0E6', tarif: 'açık mavi, jöle kıvamında', bul: 220 },
    { id: 'Fe(OH)3', f: 'Fe(OH)3', ad: 'demir(III) hidroksit', m: 'Fe3', a: 1, x: 'OH', b: 3, lk: -36.5, dh: -84.5, renk: '#9C4A1A', tarif: 'kızıl-kahverengi', bul: 260 },
    { id: 'Fe(OH)2', f: 'Fe(OH)2', ad: 'demir(II) hidroksit', m: 'Fe2', a: 1, x: 'OH', b: 2, lk: -16.31, dh: -19.9, renk: '#7F9B6E', tarif: 'kirli yeşil', bul: 220 },
    { id: 'Mg(OH)2', f: 'Mg(OH)2', ad: 'magnezyum hidroksit', m: 'Mg', a: 1, x: 'OH', b: 2, lk: -11.25, dh: 2.4, renk: '#F8F8F5', tarif: 'beyaz', bul: 240 },
    { id: 'Zn(OH)2', f: 'Zn(OH)2', ad: 'çinko hidroksit', m: 'Zn', a: 1, x: 'OH', b: 2, lk: -15.5, dh: -28, renk: '#F8F8F5', tarif: 'beyaz', bul: 240 },
    { id: 'Al(OH)3', f: 'Al(OH)3', ad: 'alüminyum hidroksit', m: 'Al', a: 1, x: 'OH', b: 3, lk: -31.6, dh: -55, renk: '#F2F4F5', tarif: 'beyaz, jelatinimsi', bul: 180 },
    { id: 'Ca(OH)2', f: 'Ca(OH)2', ad: 'kalsiyum hidroksit', m: 'Ca', a: 1, x: 'OH', b: 2, lk: -5.26, dh: 17.6, renk: '#F8F8F5', tarif: 'beyaz', bul: 220 },
    { id: 'Pb(OH)2', f: 'Pb(OH)2', ad: 'kurşun(II) hidroksit', m: 'Pb', a: 1, x: 'OH', b: 2, lk: -16.0, dh: -54.2, renk: '#F8F8F5', tarif: 'beyaz', bul: 240 },
    { id: 'Ag2O', f: 'Ag2O', ad: 'gümüş oksit', m: 'Ag', a: 1, x: 'OH', b: 1, lk: -7.71, dh: -34, renk: '#5C3B22', tarif: 'kahverengi', bul: 300 },
    { id: 'Co(OH)2', f: 'Co(OH)2', ad: 'kobalt(II) hidroksit', m: 'Co', a: 1, x: 'OH', b: 2, lk: -14.9, dh: -21.5, renk: '#C58AA8', tarif: 'pembe-mor', bul: 220 },
    { id: 'Mn(OH)2', f: 'Mn(OH)2', ad: 'mangan(II) hidroksit', m: 'Mn', a: 1, x: 'OH', b: 2, lk: -12.7, dh: -10, renk: '#E9DFD2', tarif: 'beyazımsı', bul: 220 }
  ];
  var CKI = {};
  CK.forEach(function (t) { CKI[t.id] = t; });
  var K_FESCN = p10(2.95), K_COCL4 = p10(-2.7), DH_COCL4 = 50;
  /* M + SO4²⁻ ⇌ MSO4 iyon çifti (log K) */
  var KSO4 = { Cu: 2.36, Zn: 2.37, Mg: 2.23, Ca: 2.31, Fe2: 2.2, Mn: 2.25, Co: 2.36, Pb: 2.75, Ba: 2.7, Sr: 2.55, Fe3: 4.04, Al: 3.5 };
  var PKW = [[0, 14.94], [10, 14.53], [20, 14.17], [25, 14.00], [30, 13.83], [40, 13.53], [50, 13.26], [60, 13.02], [70, 12.80], [80, 12.60], [90, 12.42], [100, 12.26], [150, 11.64]];
  function pKw(T) {
    if (T <= PKW[0][0]) return PKW[0][1];
    for (var i = 1; i < PKW.length; i++) if (T <= PKW[i][0]) {
      var a = PKW[i - 1], b = PKW[i];
      return a[1] + (b[1] - a[1]) * (T - a[0]) / (b[0] - a[0]);
    }
    return PKW[PKW.length - 1][1];
  }

  /* Metaller: E indirgenme potansiyeli (V), z iyon yükü, iyon bileşeni; hız sabitleri */
  var METAL = {
    K:  { ad: 'Potasyum', E: -2.93, z: 1, iyon: 'K', MA: 39.10, su: 4e-3, asit: 0.08, alkali: 1, yuzer: 1, renk: '#C7CBD1' },
    Na: { ad: 'Sodyum', E: -2.71, z: 1, iyon: 'Na', MA: 22.99, su: 2e-3, asit: 0.05, alkali: 1, yuzer: 1, renk: '#D5D8DC' },
    Li: { ad: 'Lityum', E: -3.04, z: 1, iyon: 'Li', MA: 6.94, su: 5e-4, asit: 0.02, alkali: 1, yuzer: 1, renk: '#CFD3D8' },
    Ca: { ad: 'Kalsiyum', E: -2.87, z: 2, iyon: 'Ca', MA: 40.08, su: 2.5e-4, asit: 3e-3, alkali: 1, renk: '#D9D9D0' },
    Mg: { ad: 'Magnezyum', E: -2.37, z: 2, iyon: 'Mg', MA: 24.31, su: 1.2e-7, asit: 2.3e-4, renk: '#C9CED4' },
    Al: { ad: 'Alüminyum', E: -1.66, z: 3, iyon: 'Al', MA: 26.98, asit: 6e-5, baz: 6e-5, gecikme: 8, renk: '#DADFE4' },
    Zn: { ad: 'Çinko', E: -0.76, z: 2, iyon: 'Zn', MA: 65.38, asit: 4e-5, baz: 5e-6, renk: '#A8AFB7' },
    Fe: { ad: 'Demir', E: -0.44, z: 2, iyon: 'Fe2', MA: 55.85, asit: 6e-6, renk: '#6D7277' },
    Pb: { ad: 'Kurşun', E: -0.13, z: 2, iyon: 'Pb', MA: 207.2, asit: 2e-7, renk: '#5F6670' },
    Cu: { ad: 'Bakır', E: 0.34, z: 2, iyon: 'Cu', MA: 63.55, nitrik: 2e-6, renk: '#C46A3A' },
    Ag: { ad: 'Gümüş', E: 0.80, z: 1, iyon: 'Ag', MA: 107.87, nitrik: 1.5e-6, renk: '#D9DEE3' }
  };
  /* Metal tarafından indirgenebilen iyonlar (yer değiştirme) */
  var IND = [
    { k: 'Ag', E: 0.80, z: 1, m: 'Ag' }, { k: 'Cu', E: 0.34, z: 2, m: 'Cu' }, { k: 'Pb', E: -0.13, z: 2, m: 'Pb' },
    { k: 'Fe2', E: -0.44, z: 2, m: 'Fe' }, { k: 'Zn', E: -0.76, z: 2, m: 'Zn' }
  ];

  /* ================= 2. KİMYASAL DOLABI ================= */
  /* bil: sıvılarda mol/L, katılarda mol başına bileşen; iy: denklem yazımı için iyonlar */
  var KIM = [
    /* Asitler */
    { id: 'hcl', ad: 'Hidroklorik asit', diger: 'tuz ruhu', f: 'HCl', kat: 'asit', tur: 'sivi', M: 1, bil: { Cl: 1 }, iy: { k: 'H', a: 'Cl' }, tip: 'kuvvetli', ghs: ['GHS05', 'GHS07'], not: 'Kuvvetli asit; suda tamamen iyonlaşır.' },
    { id: 'hcl01', ad: 'Hidroklorik asit', f: 'HCl', kat: 'asit', tur: 'sivi', M: 0.1, bil: { Cl: 0.1 }, iy: { k: 'H', a: 'Cl' }, tip: 'kuvvetli', ghs: ['GHS07'], not: 'Titrasyon için seyreltik kuvvetli asit.' },
    { id: 'hcl_d', ad: 'Derişik hidroklorik asit', f: 'HCl', kat: 'asit', tur: 'sivi', M: 12, bil: { Cl: 12 }, iy: { k: 'H', a: 'Cl' }, tip: 'kuvvetli', dil: { H: -14, C: 12 }, ghs: ['GHS05', 'GHS07'], renk: '#F1F5E6', not: 'Yaklaşık %37 HCl; keskin kokulu, buhar çıkarır.', uyari: 'Çeker ocakta, eldiven ve gözlükle kullanılır.' },
    { id: 'h2so4', ad: 'Sülfürik asit', f: 'H2SO4', kat: 'asit', tur: 'sivi', M: 1, bil: { SO4: 1 }, iy: { k: 'H', a: 'SO4' }, tip: 'kuvvetli', ghs: ['GHS05'], not: 'Kuvvetli, iki protonlu asit.' },
    { id: 'h2so401', ad: 'Sülfürik asit', f: 'H2SO4', kat: 'asit', tur: 'sivi', M: 0.1, bil: { SO4: 0.1 }, iy: { k: 'H', a: 'SO4' }, tip: 'kuvvetli', ghs: ['GHS07'], not: 'Titrasyon için seyreltik sülfürik asit.' },
    { id: 'h2so4_d', ad: 'Derişik sülfürik asit', f: 'H2SO4', kat: 'asit', tur: 'sivi', M: 18, bil: { SO4: 18 }, iy: { k: 'H', a: 'SO4' }, tip: 'kuvvetli', dil: { H: -73, C: 18 }, ghs: ['GHS05'], renk: '#F3F0E6', not: '%98 H₂SO₄. Su çekicidir; suyla karışırken çok ısınır.', uyari: 'Asit suya yavaşça eklenir. Su, asidin üzerine asla dökülmez.' },
    { id: 'hno3', ad: 'Nitrik asit', f: 'HNO3', kat: 'asit', tur: 'sivi', M: 1, bil: { NO3: 1 }, iy: { k: 'H', a: 'NO3' }, tip: 'kuvvetli', ghs: ['GHS03', 'GHS05'], not: 'Kuvvetli ve yükseltgen asit.' },
    { id: 'hno3_d', ad: 'Derişik nitrik asit', f: 'HNO3', kat: 'asit', tur: 'sivi', M: 15, bil: { NO3: 15 }, iy: { k: 'H', a: 'NO3' }, tip: 'kuvvetli', dil: { H: -13, C: 15 }, ghs: ['GHS03', 'GHS05'], renk: '#F7F2D6', not: 'Yaklaşık %65 HNO₃. Bakır ve gümüşü bile çözer.', uyari: 'Çeker ocakta kullanılır; zehirli NO₂ gazı çıkabilir.' },
    { id: 'asetik', ad: 'Asetik asit', f: 'CH3COOH', kat: 'asit', tur: 'sivi', M: 1, bil: { Ac: 1 }, iy: { k: 'H', a: 'CH3COO' }, tip: 'zayif', ghs: ['GHS07'], not: 'Zayıf asit (Ka = 1,8·10⁻⁵).' },
    { id: 'asetik01', ad: 'Asetik asit', f: 'CH3COOH', kat: 'asit', tur: 'sivi', M: 0.1, bil: { Ac: 0.1 }, iy: { k: 'H', a: 'CH3COO' }, tip: 'zayif', ghs: [], not: 'Titrasyon için seyreltik zayıf asit.' },
    { id: 'sirke', ad: 'Sirke', f: 'CH3COOH', kat: 'asit', tur: 'sivi', M: 0.83, bil: { Ac: 0.83 }, iy: { k: 'H', a: 'CH3COO' }, tip: 'zayif', ghs: [], renk: '#F5E7C6', ev: 1, not: 'Yaklaşık %5 asetik asit içerir.' },
    { id: 'limon', ad: 'Limon suyu', f: 'H3C6H5O7', kat: 'asit', tur: 'sivi', M: 0.3, bil: { Sit: 0.3, K: 0.05 }, iy: { k: 'H', a: 'C6H5O7' }, tip: 'zayif', ghs: [], renk: '#F6EDA8', ev: 1, not: 'Sitrik asit içerir (üç protonlu zayıf asit).' },
    { id: 'vitc', ad: 'C vitamini çözeltisi', f: 'C6H8O6', kat: 'asit', tur: 'sivi', M: 0.05, bil: { Vit: 0.05 }, tip: 'zayif', ghs: [], renk: '#FBF6E2', ev: 1, not: 'Askorbik asit: zayıf asit ve indirgen. İyotun rengini giderir.' },
    { id: 'soda', ad: 'Gazlı su (soda)', f: 'H2CO3', kat: 'asit', tur: 'sivi', M: 0.12, bil: { CO3: 0.12 }, iy: { k: 'H', a: 'CO3' }, tip: 'zayif', ghs: [], renk: '#F2F9FC', ev: 1, not: 'Basınç altında çözünmüş CO₂ (karbonik asit) içerir; açılınca köpürür.' },
    /* Bazlar */
    { id: 'naoh', ad: 'Sodyum hidroksit', diger: 'sud kostik', f: 'NaOH', kat: 'baz', tur: 'sivi', M: 1, bil: { Na: 1 }, iy: { k: 'Na', a: 'OH' }, tip: 'kuvvetli', ghs: ['GHS05'], not: 'Kuvvetli baz; deriyi yakar.' },
    { id: 'naoh01', ad: 'Sodyum hidroksit', f: 'NaOH', kat: 'baz', tur: 'sivi', M: 0.1, bil: { Na: 0.1 }, iy: { k: 'Na', a: 'OH' }, tip: 'kuvvetli', ghs: ['GHS07'], not: 'Titrasyon için seyreltik kuvvetli baz.' },
    { id: 'naoh_k', ad: 'Sodyum hidroksit (katı)', f: 'NaOH', kat: 'baz', tur: 'kati', MA: 40.0, bil: { Na: 1 }, dHc: -44.5, iy: { k: 'Na', a: 'OH' }, tip: 'kuvvetli', ghs: ['GHS05'], renk: '#FFFFFF', not: 'Granül. Suda çözünürken çok ısı açığa çıkar.' },
    { id: 'nh3', ad: 'Amonyak çözeltisi', f: 'NH3', kat: 'baz', tur: 'sivi', M: 1, bil: { NH3: 1 }, tip: 'zayif', ghs: ['GHS07'], not: 'Zayıf baz (Kb = 1,8·10⁻⁵); keskin kokulu.' },
    { id: 'nh301', ad: 'Amonyak çözeltisi', f: 'NH3', kat: 'baz', tur: 'sivi', M: 0.1, bil: { NH3: 0.1 }, tip: 'zayif', ghs: [], not: 'Titrasyon için seyreltik zayıf baz.' },
    { id: 'nh3_d', ad: 'Derişik amonyak', f: 'NH3', kat: 'baz', tur: 'sivi', M: 6, bil: { NH3: 6 }, tip: 'zayif', ghs: ['GHS05', 'GHS07', 'GHS09'], not: 'Göz yaşartıcı, keskin kokulu.', uyari: 'Çamaşır suyuyla asla karıştırılmaz.' },
    { id: 'kirec', ad: 'Kireç suyu', f: 'Ca(OH)2', kat: 'baz', tur: 'sivi', M: 0.02, bil: { Ca: 0.02 }, iy: { k: 'Ca', a: 'OH' }, tip: 'kuvvetli', ghs: ['GHS07'], not: 'Doymuş kalsiyum hidroksit çözeltisi; CO₂ ile bulanıklaşır.' },
    { id: 'baoh2', ad: 'Baryum hidroksit', f: 'Ba(OH)2', kat: 'baz', tur: 'sivi', M: 0.1, bil: { Ba: 0.1 }, iy: { k: 'Ba', a: 'OH' }, tip: 'kuvvetli', ghs: ['GHS05', 'GHS07'], not: 'Kuvvetli baz; sülfat iyonuyla beyaz çökelek verir.' },
    { id: 'na2co3', ad: 'Sodyum karbonat', diger: 'çamaşır sodası', f: 'Na2CO3', kat: 'baz', tur: 'sivi', M: 0.5, bil: { Na: 1, CO3: 0.5 }, iy: { k: 'Na', a: 'CO3' }, tip: 'karbonat', ghs: ['GHS07'], not: 'Bazik tuz; asitlerle CO₂ gazı çıkarır.' },
    { id: 'nahco3', ad: 'Sodyum bikarbonat çözeltisi', diger: 'karbonat', f: 'NaHCO3', kat: 'baz', tur: 'sivi', M: 0.5, bil: { Na: 0.5, CO3: 0.5 }, iy: { k: 'Na', a: 'HCO3' }, tip: 'karbonat', ghs: [], ev: 1, not: 'Hafif bazik; asitlerle köpürür.' },
    { id: 'nahco3_k', ad: 'Yemek sodası (katı)', diger: 'sodyum bikarbonat', f: 'NaHCO3', kat: 'baz', tur: 'kati', MA: 84.0, bil: { Na: 1, CO3: 1 }, dHc: 16.7, iy: { k: 'Na', a: 'HCO3' }, tip: 'karbonat', ghs: [], renk: '#FFFFFF', ev: 1, not: 'Karbonat (NaHCO₃) tozu.' },
    /* Tuzlar */
    { id: 'nacl', ad: 'Sodyum klorür çözeltisi', f: 'NaCl', kat: 'tuz', tur: 'sivi', M: 1, bil: { Na: 1, Cl: 1 }, iy: { k: 'Na', a: 'Cl' }, ghs: [], not: 'Yemek tuzu çözeltisi.' },
    { id: 'nacl_k', ad: 'Yemek tuzu (katı)', f: 'NaCl', kat: 'tuz', tur: 'kati', MA: 58.44, bil: { Na: 1, Cl: 1 }, dHc: 3.9, iy: { k: 'Na', a: 'Cl' }, ghs: [], renk: '#FFFFFF', ev: 1, not: 'Sodyum klorür kristalleri.' },
    { id: 'agno3', ad: 'Gümüş nitrat', f: 'AgNO3', kat: 'tuz', tur: 'sivi', M: 0.1, bil: { Ag: 0.1, NO3: 0.1 }, iy: { k: 'Ag', a: 'NO3' }, ghs: ['GHS03', 'GHS05', 'GHS09'], not: 'Halojenür iyonlarıyla çökelek verir; deriyi siyaha boyar.' },
    { id: 'pbno3', ad: 'Kurşun(II) nitrat', f: 'Pb(NO3)2', kat: 'tuz', tur: 'sivi', M: 0.1, bil: { Pb: 0.1, NO3: 0.2 }, iy: { k: 'Pb', a: 'NO3' }, ghs: ['GHS07', 'GHS08', 'GHS09'], not: 'Zehirli ağır metal tuzu.', uyari: 'Kurşun bileşikleri zehirlidir; atığı lavaboya dökülmez.' },
    { id: 'ki', ad: 'Potasyum iyodür', f: 'KI', kat: 'tuz', tur: 'sivi', M: 0.5, bil: { K: 0.5, I: 0.5 }, iy: { k: 'K', a: 'I' }, ghs: ['GHS07'], not: 'İyodür kaynağı; H₂O₂ bozunmasında katalizör.' },
    { id: 'kbr', ad: 'Potasyum bromür', f: 'KBr', kat: 'tuz', tur: 'sivi', M: 0.5, bil: { K: 0.5, Br: 0.5 }, iy: { k: 'K', a: 'Br' }, ghs: ['GHS07'], not: 'Bromür kaynağı.' },
    { id: 'cuso4', ad: 'Bakır(II) sülfat', f: 'CuSO4', kat: 'tuz', tur: 'sivi', M: 0.5, bil: { Cu: 0.5, SO4: 0.5 }, iy: { k: 'Cu', a: 'SO4' }, ghs: ['GHS07', 'GHS09'], not: 'Mavi renkli çözelti (Cu²⁺ iyonu).' },
    { id: 'fecl3', ad: 'Demir(III) klorür', f: 'FeCl3', kat: 'tuz', tur: 'sivi', M: 0.1, bil: { Fe3: 0.1, Cl: 0.3 }, iy: { k: 'Fe3', a: 'Cl' }, ghs: ['GHS05', 'GHS07'], not: 'Sarı-turuncu çözelti; Fe³⁺ iyonu suyu asidik yapar.' },
    { id: 'feso4', ad: 'Demir(II) sülfat', f: 'FeSO4', kat: 'tuz', tur: 'sivi', M: 0.1, bil: { Fe2: 0.1, SO4: 0.1 }, iy: { k: 'Fe2', a: 'SO4' }, ghs: ['GHS07'], not: 'Soluk yeşil çözelti.' },
    { id: 'bacl2', ad: 'Baryum klorür', f: 'BaCl2', kat: 'tuz', tur: 'sivi', M: 0.1, bil: { Ba: 0.1, Cl: 0.2 }, iy: { k: 'Ba', a: 'Cl' }, ghs: ['GHS06'], not: 'Sülfat iyonunun ayıracı (beyaz BaSO₄).' },
    { id: 'cacl2', ad: 'Kalsiyum klorür', f: 'CaCl2', kat: 'tuz', tur: 'sivi', M: 0.5, bil: { Ca: 0.5, Cl: 1 }, iy: { k: 'Ca', a: 'Cl' }, ghs: ['GHS07'], not: 'Kalsiyum iyonu kaynağı.' },
    { id: 'cacl2_k', ad: 'Kalsiyum klorür (katı)', f: 'CaCl2', kat: 'tuz', tur: 'kati', MA: 110.98, bil: { Ca: 1, Cl: 2 }, dHc: -82.8, iy: { k: 'Ca', a: 'Cl' }, ghs: ['GHS07'], renk: '#FFFFFF', not: 'Suda çözünürken ısı verir (sıcak paket).' },
    { id: 'na2so4', ad: 'Sodyum sülfat', f: 'Na2SO4', kat: 'tuz', tur: 'sivi', M: 0.5, bil: { Na: 1, SO4: 0.5 }, iy: { k: 'Na', a: 'SO4' }, ghs: [], not: 'Sülfat iyonu kaynağı.' },
    { id: 'mgso4', ad: 'Magnezyum sülfat', f: 'MgSO4', kat: 'tuz', tur: 'sivi', M: 0.5, bil: { Mg: 0.5, SO4: 0.5 }, iy: { k: 'Mg', a: 'SO4' }, ghs: [], not: 'İngiliz tuzu.' },
    { id: 'znso4', ad: 'Çinko sülfat', f: 'ZnSO4', kat: 'tuz', tur: 'sivi', M: 0.5, bil: { Zn: 0.5, SO4: 0.5 }, iy: { k: 'Zn', a: 'SO4' }, ghs: ['GHS05', 'GHS07', 'GHS09'], not: 'Çinko iyonu kaynağı.' },
    { id: 'al2so4', ad: 'Alüminyum sülfat', f: 'Al2(SO4)3', kat: 'tuz', tur: 'sivi', M: 0.1, bil: { Al: 0.2, SO4: 0.3 }, iy: { k: 'Al', a: 'SO4' }, ghs: ['GHS05'], not: 'Al³⁺ iyonu suyu asidik yapar.' },
    { id: 'nh4cl', ad: 'Amonyum klorür', f: 'NH4Cl', kat: 'tuz', tur: 'sivi', M: 1, bil: { NH3: 1, Cl: 1 }, iy: { k: 'NH4', a: 'Cl' }, ghs: ['GHS07'], not: 'Asidik tuz (NH₄⁺ iyonu).' },
    { id: 'nh4no3_k', ad: 'Amonyum nitrat (katı)', f: 'NH4NO3', kat: 'tuz', tur: 'kati', MA: 80.04, bil: { NH3: 1, NO3: 1 }, dHc: 25.7, iy: { k: 'NH4', a: 'NO3' }, ghs: ['GHS03', 'GHS07'], renk: '#FFFFFF', not: 'Suda çözünürken çevreden ısı alır (soğuk paket).' },
    { id: 'kscn', ad: 'Potasyum tiyosiyanat', f: 'KSCN', kat: 'tuz', tur: 'sivi', M: 0.1, bil: { K: 0.1, SCN: 0.1 }, iy: { k: 'K', a: 'SCN' }, ghs: ['GHS07'], not: 'Fe³⁺ iyonuyla kan kırmızısı renk verir.' },
    { id: 'cocl2', ad: 'Kobalt(II) klorür', f: 'CoCl2', kat: 'tuz', tur: 'sivi', M: 0.2, bil: { Co: 0.2, Cl: 0.4 }, iy: { k: 'Co', a: 'Cl' }, ghs: ['GHS07', 'GHS08', 'GHS09'], not: 'Pembe çözelti; ısıtınca ve Cl⁻ eklenince maviye döner.' },
    { id: 'naac', ad: 'Sodyum asetat', f: 'CH3COONa', kat: 'tuz', tur: 'sivi', M: 1, bil: { Na: 1, Ac: 1 }, iy: { k: 'Na', a: 'CH3COO' }, ghs: [], not: 'Bazik tuz; asetik asitle tampon oluşturur.' },
    { id: 'licl', ad: 'Lityum klorür', f: 'LiCl', kat: 'tuz', tur: 'sivi', M: 0.5, bil: { Li: 0.5, Cl: 0.5 }, iy: { k: 'Li', a: 'Cl' }, ghs: ['GHS07'], not: 'Alev testinde kırmızı renk.' },
    { id: 'srcl2', ad: 'Stronsiyum klorür', f: 'SrCl2', kat: 'tuz', tur: 'sivi', M: 0.5, bil: { Sr: 0.5, Cl: 1 }, iy: { k: 'Sr', a: 'Cl' }, ghs: ['GHS07'], not: 'Alev testinde parlak kırmızı.' },
    { id: 'kmno4', ad: 'Potasyum permanganat', f: 'KMnO4', kat: 'tuz', tur: 'sivi', M: 0.02, bil: { K: 0.02, MnO4: 0.02 }, iy: { k: 'K', a: 'MnO4' }, ghs: ['GHS03', 'GHS07', 'GHS09'], not: 'Mor renkli, güçlü yükseltgen.' },
    { id: 'naocl', ad: 'Çamaşır suyu', diger: 'sodyum hipoklorit', f: 'NaOCl', kat: 'tuz', tur: 'sivi', M: 0.7, bil: { Na: 1.45, OCl: 0.7, Cl: 0.7 }, iy: { k: 'Na', a: 'OCl' }, ghs: ['GHS05', 'GHS09'], renk: '#F1F4DA', ev: 1, not: 'Yaklaşık %5 NaOCl içerir; baziktir.', uyari: 'Tuz ruhu gibi asitlerle ve amonyakla asla karıştırılmaz: zehirli gaz çıkar.' },
    { id: 'tiyo', ad: 'Sodyum tiyosülfat', f: 'Na2S2O3', kat: 'tuz', tur: 'sivi', M: 0.1, bil: { Na: 0.2, S2O3: 0.1 }, iy: { k: 'Na', a: 'S2O3' }, ghs: [], not: 'Asitle bir süre sonra bulanıklaşır (kükürt): tepkime hızı deneyi.' },
    { id: 'mermer', ad: 'Mermer tozu', diger: 'kalsiyum karbonat', f: 'CaCO3', kat: 'tuz', tur: 'kati', MA: 100.09, bil: { Ca: 1, CO3: 1 }, iy: { k: 'Ca', a: 'CO3' }, ghs: [], renk: '#F3F1EC', not: 'Suda çözünmez; asitlerde CO₂ çıkararak çözünür.' },
    /* Metaller */
    { id: 'mg', ad: 'Magnezyum şerit', f: 'Mg', kat: 'metal', tur: 'metal', metal: 'Mg', sek: 3, ghs: ['GHS02'], miktar: [0.05, 0.1, 0.25], not: 'Aktif metal; asitlerde hızla H₂ gazı çıkarır.' },
    { id: 'mg_toz', ad: 'Magnezyum tozu', f: 'Mg', kat: 'metal', tur: 'metal', metal: 'Mg', sek: 14, toz: 1, ghs: ['GHS02'], miktar: [0.05, 0.1, 0.25], not: 'Toz hâlde yüzey alanı büyüktür; tepkime çok daha hızlıdır.' },
    { id: 'zn', ad: 'Çinko granül', f: 'Zn', kat: 'metal', tur: 'metal', metal: 'Zn', sek: 1.6, ghs: [], miktar: [0.25, 0.5, 1], not: 'Asitlerde H₂ çıkarır; Cu²⁺ iyonunu bakıra indirger.' },
    { id: 'fe', ad: 'Demir çivi', f: 'Fe', kat: 'metal', tur: 'metal', metal: 'Fe', sek: 1.3, ghs: [], miktar: [1, 2], not: 'Bakır sülfat çözeltisinde bakırla kaplanır.' },
    { id: 'fe_toz', ad: 'Demir tozu', f: 'Fe', kat: 'metal', tur: 'metal', metal: 'Fe', sek: 9, toz: 1, ghs: ['GHS02'], miktar: [0.25, 0.5, 1], not: 'Toz hâlde daha hızlı tepkime verir.' },
    { id: 'cu', ad: 'Bakır tel', f: 'Cu', kat: 'metal', tur: 'metal', metal: 'Cu', sek: 2, ghs: [], miktar: [0.25, 0.5, 1], not: 'Hidrojenden az aktif: seyreltik HCl ile tepkime vermez.' },
    { id: 'al', ad: 'Alüminyum folyo', f: 'Al', kat: 'metal', tur: 'metal', metal: 'Al', sek: 4, ghs: [], miktar: [0.1, 0.25, 0.5], not: 'Yüzeyindeki oksit tabakası yüzünden tepkimeye geç başlar. Amfoterdir.' },
    { id: 'na', ad: 'Sodyum', f: 'Na', kat: 'metal', tur: 'metal', metal: 'Na', sek: 1, ghs: ['GHS02', 'GHS05'], miktar: [0.02, 0.05, 0.1, 1], not: 'Gazyağı içinde saklanır; suyla şiddetli tepkime verir.', uyari: 'Gerçekte yalnızca pirinç tanesi kadar parça, öğretmen gözetiminde kullanılır. Büyük parça patlar.' },
    { id: 'li', ad: 'Lityum', f: 'Li', kat: 'metal', tur: 'metal', metal: 'Li', sek: 1, ghs: ['GHS02', 'GHS05'], miktar: [0.02, 0.05, 0.1], not: 'Alkali metallerin en az aktifidir; suyla yavaş ve sakin tepkime verir.', uyari: 'Yağ içinde saklanır; elle tutulmaz.' },
    { id: 'k', ad: 'Potasyum', f: 'K', kat: 'metal', tur: 'metal', metal: 'K', sek: 1, ghs: ['GHS02', 'GHS05'], miktar: [0.02, 0.05, 1], not: 'Sodyumdan da aktif; suyla leylak renkli alevle tepkime verir.', uyari: 'Okul laboratuvarında kullanılmaz; yalnızca gösteri amaçlı.' },
    { id: 'ca', ad: 'Kalsiyum', f: 'Ca', kat: 'metal', tur: 'metal', metal: 'Ca', sek: 1.6, ghs: ['GHS02'], miktar: [0.1, 0.25], not: 'Suyla tepkime verir; çözelti bulanıklaşır (Ca(OH)₂).' },
    /* Diğer */
    { id: 'su', ad: 'Saf su', f: 'H2O', kat: 'diger', tur: 'sivi', bil: {}, ghs: [], renk: '#EAF4FA', su: 1, not: 'Damıtılmış su.' },
    { id: 'h2o2_3', ad: 'Hidrojen peroksit %3', diger: 'oksijenli su', f: 'H2O2', kat: 'diger', tur: 'sivi', M: 0.88, bil: { H2O2: 0.88 }, ghs: [], ev: 1, not: 'Katalizörle hızla su ve oksijene ayrışır.' },
    { id: 'h2o2_30', ad: 'Hidrojen peroksit %30', f: 'H2O2', kat: 'diger', tur: 'sivi', M: 9.8, bil: { H2O2: 9.8 }, ghs: ['GHS05', 'GHS07'], not: 'Derişik peroksit; deriyi yakar.', uyari: 'Eldiven ve koruyucu gözlük şart.' },
    { id: 'mno2', ad: 'Mangan(IV) oksit', f: 'MnO2', kat: 'diger', tur: 'kati', ek: 'mno2', ghs: ['GHS07'], renk: '#2B2522', not: 'Siyah toz. H₂O₂ bozunmasında katalizör; kendisi harcanmaz.' },
    { id: 'maya', ad: 'Kuru maya', kat: 'diger', tur: 'kati', ek: 'maya', ghs: [], renk: '#C9A46A', ev: 1, not: 'Katalaz enzimi içerir; 60 °C üstünde etkisini kaybeder.' },
    { id: 'deterjan', ad: 'Bulaşık deterjanı', kat: 'diger', tur: 'sivi', bil: { Sab: 1000 }, ghs: ['GHS07'], renk: '#79C49D', ev: 1, not: 'Gaz kabarcıklarını tutarak köpük yapar.' },
    { id: 'nisasta', ad: 'Nişasta çözeltisi', kat: 'diger', tur: 'sivi', bil: { Nis: 1 }, ghs: [], renk: '#F4F2EC', not: 'İyotla lacivert renk verir.' },
    { id: 'lugol', ad: 'İyot çözeltisi (Lugol)', f: 'I2', kat: 'diger', tur: 'sivi', M: 0.02, bil: { I2: 0.02, K: 0.12, I: 0.12 }, ghs: ['GHS07'], not: 'İyot ve potasyum iyodür içerir.' },
    { id: 'seker', ad: 'Şeker (sakaroz)', f: 'C12H22O11', kat: 'diger', tur: 'kati', MA: 342.3, bil: { Seker: 1 }, dHc: 5.4, ghs: [], renk: '#FFFFFF', ev: 1, not: 'Suda çözünür ama iyonlaşmaz (elektrolit değildir).' },
    /* Göstergeler */
    { id: 'fenol', ad: 'Fenolftalein', kat: 'gosterge', tur: 'gosterge', gos: 'fenol', birim: 20000, ghs: ['GHS02', 'GHS08'], not: 'pH 8,2–10 arasında renksizden pembeye döner.' },
    { id: 'mo', ad: 'Metil oranj', kat: 'gosterge', tur: 'gosterge', gos: 'mo', birim: 20000, ghs: ['GHS06'], not: 'pH 3,1–4,4 arasında kırmızıdan sarıya döner.' },
    { id: 'mk', ad: 'Metil kırmızısı', kat: 'gosterge', tur: 'gosterge', gos: 'mk', birim: 20000, ghs: ['GHS02'], not: 'pH 4,4–6,2 arasında kırmızıdan sarıya döner.' },
    { id: 'btb', ad: 'Bromtimol mavisi', kat: 'gosterge', tur: 'gosterge', gos: 'btb', birim: 20000, ghs: ['GHS02'], not: 'pH 6,0–7,6 arasında sarıdan maviye döner.' },
    { id: 'turnusol', ad: 'Turnusol çözeltisi', kat: 'gosterge', tur: 'gosterge', gos: 'tur', birim: 20000, ghs: [], not: 'Asitte kırmızı, bazda mavi.' },
    { id: 'lahana', ad: 'Kırmızı lahana suyu', kat: 'gosterge', tur: 'gosterge', gos: 'lah', birim: 40, ghs: [], ev: 1, not: 'Doğal gösterge: pH 1–14 arasında kırmızıdan sarıya birçok renk.' },
    { id: 'evrensel', ad: 'Evrensel gösterge', kat: 'gosterge', tur: 'gosterge', gos: 'evr', birim: 20000, ghs: ['GHS02'], not: 'Her pH değeri için farklı renk.' }
  ];
  var KIMI = {};
  KIM.forEach(function (k) { KIMI[k.id] = k; });

  var GHS = { GHS01: 'Patlayıcı', GHS02: 'Yanıcı', GHS03: 'Yükseltgen', GHS04: 'Basınçlı gaz', GHS05: 'Aşındırıcı', GHS06: 'Zehirli', GHS07: 'Zararlı, tahriş edici', GHS08: 'Sağlığa ciddi zarar verir', GHS09: 'Çevreye zararlı' };

  /* Göstergeler: pH → geçirgenlik (R, G, B), 1 damla / 50 mL için */
  var GOS = {
    fenol: { ad: 'Fenolftalein', d: [[0, [1, 1, 1]], [8.2, [1, 1, 1]], [9, [0.97, 0.62, 0.83]], [10, [0.9, 0.17, 0.58]], [13, [0.9, 0.17, 0.58]], [14, [0.95, 0.5, 0.75]]],
      sinif: function (p) { return p < 8.2 ? 'renksiz' : 'pembe'; } },
    mo: { ad: 'Metil oranj', d: [[0, [0.9, 0.16, 0.2]], [3.1, [0.92, 0.22, 0.17]], [3.8, [0.98, 0.5, 0.13]], [4.4, [1, 0.8, 0.12]], [14, [1, 0.82, 0.12]]],
      sinif: function (p) { return p < 3.1 ? 'kırmızı' : (p < 4.4 ? 'turuncu' : 'sarı'); } },
    mk: { ad: 'Metil kırmızısı', d: [[0, [0.92, 0.14, 0.22]], [4.4, [0.92, 0.16, 0.22]], [5.3, [0.98, 0.45, 0.22]], [6.2, [1, 0.84, 0.16]], [14, [1, 0.85, 0.16]]],
      sinif: function (p) { return p < 4.4 ? 'kırmızı' : (p < 6.2 ? 'turuncu' : 'sarı'); } },
    btb: { ad: 'Bromtimol mavisi', d: [[0, [1, 0.92, 0.18]], [6, [1, 0.9, 0.18]], [6.8, [0.55, 0.84, 0.32]], [7.6, [0.18, 0.46, 0.9]], [14, [0.18, 0.46, 0.9]]],
      sinif: function (p) { return p < 6 ? 'sarı' : (p < 7.6 ? 'yeşil' : 'mavi'); } },
    tur: { ad: 'Turnusol', d: [[0, [0.86, 0.14, 0.17]], [4.5, [0.86, 0.17, 0.22]], [6.5, [0.56, 0.27, 0.56]], [8.3, [0.27, 0.37, 0.86]], [14, [0.27, 0.37, 0.86]]],
      sinif: function (p) { return p < 5 ? 'kırmızı' : (p < 8 ? 'mor' : 'mavi'); } },
    lah: { ad: 'Kırmızı lahana', d: [[0, [0.9, 0.1, 0.24]], [2, [0.9, 0.12, 0.3]], [4, [0.86, 0.24, 0.58]], [6, [0.6, 0.28, 0.72]], [7, [0.45, 0.36, 0.84]], [8, [0.3, 0.5, 0.9]], [9.5, [0.22, 0.68, 0.74]], [11, [0.36, 0.8, 0.32]], [13, [0.94, 0.9, 0.22]], [14, [0.95, 0.9, 0.2]]],
      sinif: function (p) { return p < 3 ? 'kırmızı' : (p < 5 ? 'pembe' : (p < 7 ? 'mor' : (p < 8.5 ? 'mavi' : (p < 10 ? 'mavi-yeşil' : (p < 12.5 ? 'yeşil' : 'sarı'))))); } },
    evr: { ad: 'Evrensel gösterge', d: [[0, [0.9, 0.1, 0.15]], [3, [0.94, 0.3, 0.13]], [4, [0.98, 0.55, 0.12]], [5, [1, 0.75, 0.12]], [6, [0.95, 0.9, 0.16]], [7, [0.36, 0.8, 0.26]], [8, [0.16, 0.65, 0.55]], [9, [0.16, 0.4, 0.85]], [10, [0.3, 0.26, 0.8]], [11, [0.5, 0.2, 0.7]], [14, [0.55, 0.15, 0.65]]],
      sinif: function (p) { return p < 3.5 ? 'kırmızı' : (p < 5.5 ? 'turuncu' : (p < 6.5 ? 'sarı' : (p < 7.5 ? 'yeşil' : (p < 9.5 ? 'mavi' : 'mor')))); } }
  };
  function gosGecirgen(g, pH) {
    var d = GOS[g].d, i;
    if (pH <= d[0][0]) return d[0][1];
    for (i = 1; i < d.length; i++) if (pH <= d[i][0]) {
      var a = d[i - 1], b = d[i], t = (pH - a[0]) / (b[0] - a[0]), o = [];
      for (var j = 0; j < 3; j++) o.push(p10((1 - t) * lg(a[1][j]) + t * lg(b[1][j])));
      return o;
    }
    return d[d.length - 1][1];
  }

  /* ================= 3. DENGE ÇÖZÜCÜ ================= */
  function alfa(Ka, h) {
    var t = [1], p = 1, s = 1, i;
    for (i = 0; i < Ka.length; i++) { p = p * Ka[i] / h; t.push(p); s += p; }
    for (i = 0; i < t.length; i++) t[i] /= s;
    return t;
  }
  function hazirla(c, T) {
    var B = { T: T, Kw: p10(-pKw(T)), zay: [], zI: {}, met: [], mI: {}, any: [], aI: {}, tuz: [] }, k, i;
    var invT = 1 / (T + TK) - 1 / 298.15, vh = 1000 / (R * LN10);
    for (k in ZAY) if (c[k] > 1e-15) {
      var z = ZAY[k], Ka = [];
      for (i = 0; i < z.pKa.length; i++) Ka.push(p10(-(z.pKa[i] + (z.h[i + 1] - z.h[i]) * vh * invT)));
      B.zI[k] = B.zay.length; B.zay.push({ k: k, z: z, Ka: Ka, C: c[k], Cd: c[k], a: null });
    }
    for (k in KAT) if (c[k] > 1e-15) { B.mI[k] = B.met.length; B.met.push({ k: k, d: KAT[k], C: c[k], Cd: c[k], alfa: 1, aoh: 0, noh: 0, kso4: KSO4[k] ? p10(KSO4[k]) : 0 }); }
    for (k in ANY) if (c[k] > 1e-15) { B.aI[k] = B.any.length; B.any.push({ k: k, d: ANY[k], C: c[k], Cd: c[k] }); }
    for (i = 0; i < CK.length; i++) {
      var t = CK[i];
      if (B.mI[t.m] === undefined) continue;
      if (t.x !== 'OH' && B.aI[t.x] === undefined && B.zI[t.x] === undefined) continue;
      var lk = t.lk + (t.dT !== undefined ? t.dT * (T - 25) : t.dh * vh * invT);
      B.tuz.push({ t: t, lk: lk, s: 0 });
    }
    B.kCo = K_COCL4 * Math.exp(-DH_COCL4 * 1000 / R * invT);
    return B;
  }
  function anyonu(B, x) {
    if (B.aI[x] !== undefined) return B.any[B.aI[x]];
    if (B.zI[x] !== undefined) return B.zay[B.zI[x]];
    return null;
  }
  function tuzCoz(Mav, Xav, a, b, aM, fi, K) {
    if (Mav <= 0 || Xav <= 0) return 0;
    if (a * lg(Mav / aM) + b * lg(fi * Xav) <= K) return 0;
    var lo = 0, hi = Math.min(Mav / a, Xav / b);
    for (var i = 0; i < 64; i++) {
      var s = 0.5 * (lo + hi), rm = Mav - a * s, rx = Xav - b * s;
      if (rm <= 0 || rx <= 0) { hi = s; continue; }
      if (a * lg(rm / aM) + b * lg(fi * rx) > K) lo = s; else hi = s;
    }
    return 0.5 * (lo + hi);
  }
  function nh3Coz(B, h, Z) {
    var N = Z.Cd, KaN = Z.Ka[0], i, j, mets = [];
    if (!(N > 0)) return 0;
    for (i = 0; i < B.met.length; i++) if (B.met[i].d.nh3 && B.met[i].Cd > 1e-15) mets.push(B.met[i]);
    var taban = 1 + h / KaN;
    if (!mets.length) return N / taban;
    var lo = -25, hi = lg(N / taban) + 1e-9;
    for (var it = 0; it < 60; it++) {
      var orta = 0.5 * (lo + hi), L = p10(orta), top = L * taban;
      for (i = 0; i < mets.length; i++) {
        var m = mets[i], dn = m.d.nh3, a = 1 + m.aoh, sn = 0, Lp = 1;
        for (j = 0; j < dn.length; j++) { Lp *= L; var t = p10(dn[j]) * Lp; a += t; sn += (j + 1) * t; }
        top += m.Cd * sn / a;
      }
      if (top > N) hi = orta; else lo = orta;
    }
    return p10(0.5 * (lo + hi));
  }
  /* Sabit [H⁺] için çökelme ve kompleksleşmeyi çözer, yük toplamını döndürür */
  function hCoz(B, h) {
    var oh = B.Kw / h, lgoh = lg(oh), i, j, m, T_, t, it;
    for (i = 0; i < B.zay.length; i++) B.zay[i].a = alfa(B.zay[i].Ka, h);
    for (i = 0; i < B.met.length; i++) {
      m = B.met[i]; m.aoh = 0; m.noh = 0;
      var d = m.d.oh;
      if (d) for (j = 0; j < d.length; j++) { var tt = p10(d[j][1] + d[j][0] * lgoh); m.aoh += tt; m.noh += d[j][0] * tt; }
    }
    for (j = 0; j < B.tuz.length; j++) {
      T_ = B.tuz[j]; t = T_.t;
      if (t.x !== 'OH' && B.zI[t.x] !== undefined) { var za = B.zay[B.zI[t.x]].a; T_.fi = za[za.length - 1]; } else T_.fi = 1;
    }
    var fe = B.mI.Fe3 !== undefined ? B.met[B.mI.Fe3] : null, co = B.mI.Co !== undefined ? B.met[B.mI.Co] : null;
    var scnA = B.aI.SCN !== undefined ? B.any[B.aI.SCN] : null, clA = B.aI.Cl !== undefined ? B.any[B.aI.Cl] : null;
    var nh3 = B.zI.NH3 !== undefined ? B.zay[B.zI.NH3] : null;
    var so4 = B.zI.SO4 !== undefined ? B.zay[B.zI.SO4] : null, so4s = so4 ? so4.C : 0, r1 = 0, r2 = 0;
    if (so4) { r2 = h / so4.Ka[1]; r1 = r2 * h / so4.Ka[0]; }
    var L = 0, scn = 0, cl = 0;
    for (it = 0; it < 150; it++) {
      for (i = 0; i < B.met.length; i++) B.met[i].Cd = B.met[i].C;
      for (i = 0; i < B.any.length; i++) B.any[i].Cd = B.any[i].C;
      for (i = 0; i < B.zay.length; i++) B.zay[i].Cd = B.zay[i].C;
      for (j = 0; j < B.tuz.length; j++) {
        T_ = B.tuz[j]; if (!T_.s) continue;
        B.met[B.mI[T_.t.m]].Cd -= T_.t.a * T_.s;
        var X0 = T_.t.x === 'OH' ? null : anyonu(B, T_.t.x);
        if (X0) X0.Cd -= T_.t.b * T_.s;
      }
      if (nh3) L = nh3Coz(B, h, nh3);
      if (scnA && fe) { var feS = Math.max(fe.Cd, 0) / (1 + fe.aoh + K_FESCN * scn); scn = Math.max(scnA.Cd, 0) / (1 + K_FESCN * feS); }
      else scn = scnA ? scnA.Cd : 0;
      cl = clA ? Math.max(clA.Cd, 0) : 0;
      var dso4 = 0;
      if (so4) {
        var cift = 0;
        for (i = 0; i < B.met.length; i++) if (B.met[i].kso4) cift += B.met[i].kso4 * Math.max(B.met[i].Cd, 0) / B.met[i].alfa;
        var Dz = r1 + r2 + 1 + cift, yeniS = Math.max(so4.Cd, 0) / Dz;
        dso4 = so4s > 0 ? Math.abs(yeniS - so4s) / so4s : 0;
        so4s = yeniS; so4.a = [r1 / Dz, r2 / Dz, (1 + cift) / Dz]; so4.serbest = yeniS;
        for (j = 0; j < B.tuz.length; j++) if (B.tuz[j].t.x === 'SO4') B.tuz[j].fi = 1 / Dz;
      }
      for (i = 0; i < B.met.length; i++) {
        m = B.met[i]; var a = 1 + m.aoh, dn = m.d.nh3;
        if (m.kso4 && so4) a += m.kso4 * so4s;
        if (dn && L > 0) { var Lp = 1; for (j = 0; j < dn.length; j++) { Lp *= L; a += p10(dn[j]) * Lp; } }
        if (m === fe && scn > 0) a += K_FESCN * scn;
        if (m === co && cl > 0) a += B.kCo * cl * cl * cl * cl;
        m.alfa = a;
      }
      var dmax = 0;
      for (j = 0; j < B.tuz.length; j++) {
        T_ = B.tuz[j]; t = T_.t; m = B.met[B.mI[t.m]];
        var Mav = m.Cd + t.a * T_.s, yeni;
        var X = t.x === 'OH' ? null : anyonu(B, t.x);
        var Xav = X ? X.Cd + t.b * T_.s : 0;
        if (t.x === 'OH') yeni = Math.max(0, (Mav - m.alfa * p10((T_.lk - t.b * lgoh) / t.a)) / t.a);
        else yeni = tuzCoz(Mav, Xav, t.a, t.b, m.alfa, T_.fi, T_.lk);
        if (Mav > 0) dmax = Math.max(dmax, Math.abs(yeni - T_.s) * t.a / Mav);
        T_.s = yeni;
        m.Cd = Math.max(0, Mav - t.a * yeni);
        if (X) X.Cd = Math.max(0, Xav - t.b * yeni);
      }
      if (it > 0 && dmax < 1e-10 && dso4 < 1e-9) break;
    }
    var q = h - oh;
    for (i = 0; i < B.met.length; i++) { m = B.met[i]; q += m.Cd * (m.d.z - m.noh / m.alfa); }
    for (i = 0; i < B.any.length; i++) q += B.any[i].d.z * B.any[i].Cd;
    for (i = 0; i < B.zay.length; i++) {
      var Z = B.zay[i], s = 0;
      for (j = 0; j < Z.a.length; j++) s += Z.a[j] * (Z.z.z0 - j);
      q += Z.Cd * s;
    }
    B.L = L; B.scn = scn; B.cl = cl; B.oh = oh; B.so4s = so4s;
    return q;
  }
  /* c: bileşen derişimleri (M), T (°C) → denge sonucu */
  function coz(c, T, onceki) {
    if (T === undefined || !isFinite(T)) T = 25;
    var B = hazirla(c, T), i;
    if (onceki && onceki.cokM) for (i = 0; i < B.tuz.length; i++) B.tuz[i].s = onceki.cokM[B.tuz[i].t.id] || 0;
    var lo = -2, hi = 16;
    for (i = 0; i < 64; i++) {
      var orta = 0.5 * (lo + hi);
      if (hCoz(B, p10(-orta)) > 0) lo = orta; else hi = orta;
      if (hi - lo < 2e-8) break;
    }
    var pH = 0.5 * (lo + hi);
    hCoz(B, p10(-pH));
    return sonucYap(B, pH);
  }
  function sonucYap(B, pH) {
    var h = p10(-pH), oh = B.oh, r = { pH: pH, h: h, oh: oh, T: B.T, pKw: pKw(B.T), m: {}, z: {}, a: {}, cokM: {}, L: B.L || 0, scn: B.scn || 0, cl: B.cl || 0 }, i, j;
    for (i = 0; i < B.met.length; i++) {
      var m = B.met[i], s = m.Cd / m.alfa, o = { Cd: m.Cd, serbest: s, noh: m.noh / m.alfa, nh3: 0, nh3n: 0, ohk: 0, scn: 0, cl4: 0 };
      if (m.d.nh3 && r.L > 0) {
        var Lp = 1;
        for (j = 0; j < m.d.nh3.length; j++) { Lp *= r.L; var tt = s * p10(m.d.nh3[j]) * Lp; o.nh3 += tt; o.nh3n += (j + 1) * tt; }
      }
      if (m.d.oh) for (j = 0; j < m.d.oh.length; j++) if (m.d.oh[j][0] >= m.d.z + 1) o.ohk += s * p10(m.d.oh[j][1] + m.d.oh[j][0] * lg(oh));
      if (m.k === 'Fe3') o.scn = s * K_FESCN * r.scn;
      if (m.kso4 && B.so4s) o.so4 = s * m.kso4 * B.so4s;
      if (m.k === 'Co') o.cl4 = s * B.kCo * Math.pow(r.cl, 4);
      r.m[m.k] = o;
    }
    for (i = 0; i < B.any.length; i++) r.a[B.any[i].k] = B.any[i].Cd;
    for (i = 0; i < B.zay.length; i++) r.z[B.zay[i].k] = { Cd: B.zay[i].Cd, a: B.zay[i].a.slice(), serbest: B.zay[i].serbest };
    for (i = 0; i < B.tuz.length; i++) if (B.tuz[i].s > 0) r.cokM[B.tuz[i].t.id] = B.tuz[i].s;
    return r;
  }

  /* Etkin entalpi (kJ): OH⁻ ve bağlı OH 55,8; zayıf türlerin bağıl entalpileri; çökelekler */
  function entalpi(r, V) {
    if (!r) return 0;
    var H = 55.8 * r.oh, k, j;
    for (k in r.z) { var Z = r.z[k], hz = ZAY[k].h; for (j = 0; j < Z.a.length; j++) H += Z.Cd * Z.a[j] * hz[j]; }
    for (k in r.m) H += r.m[k].Cd * r.m[k].noh * 55.8;
    for (k in r.cokM) {
      var t = CKI[k], ha = t.x === 'OH' ? 55.8 : (ZAY[t.x] ? ZAY[t.x].h[ZAY[t.x].h.length - 1] : 0);
      H += r.cokM[k] * (t.dh + t.b * ha);
    }
    return H * V;
  }
  var _stokH = {};
  function stokEntalpi(K) {   /* kJ/L (sıvı) ya da kJ/mol (katı, çözünme ısısı dahil) */
    if (_stokH[K.id] !== undefined) return _stokH[K.id];
    var c = {}, k, var0 = false;
    for (k in K.bil) if (KAT[k] || ANY[k] || ZAY[k]) { c[k] = K.bil[k]; var0 = true; }
    var H = var0 ? entalpi(coz(c, 25), 1) : 0;
    if (K.tur === 'kati') H -= (K.dHc || 0);
    _stokH[K.id] = H;
    return H;
  }

  /* ================= 4. RENK, İLETKENLİK ================= */
  /* Renkli türler: geçirgenlik (R,G,B) hangi derişimde → soğurma katsayısı */
  function eps(t, c) { return [-lg(t[0]) / c, -lg(t[1]) / c, -lg(t[2]) / c]; }
  var EPS = {
    Cu: eps([0.3, 0.7, 0.95], 0.5), CuNH3: eps([0.1, 0.38, 0.92], 0.05), Fe3: eps([0.97, 0.75, 0.25], 0.1),
    Fe2: eps([0.85, 0.96, 0.82], 0.5), FeSCN: eps([0.92, 0.15, 0.12], 1e-3), I2: eps([0.86, 0.5, 0.08], 2e-3),
    NisI: eps([0.12, 0.12, 0.4], 2e-4), MnO4: eps([0.7, 0.08, 0.6], 2e-3), Co: eps([0.95, 0.66, 0.8], 0.2),
    CoCl4: eps([0.2, 0.6, 0.95], 0.02), Sab: eps([0.94, 0.985, 0.96], 0.02)
  };
  function renk(kap) {
    var r = kap.r, V = kap.V, A = [0, 0, 0], L = kap.tip === 'tup' ? 0.55 : 1, k;
    function ek(e, c) { if (c > 0) for (var i = 0; i < 3; i++) A[i] += e[i] * c * L; }
    var o = { sivi: [250, 251, 252], bulanik: 0, bulRenk: [255, 255, 255], cokelek: [], nisI: false };
    if (!(V > 2e-6)) return o;
    if (r) {
      var cu = r.m.Cu, fe = r.m.Fe3, co = r.m.Co;
      if (cu) { ek(EPS.CuNH3, cu.nh3n / 4); ek(EPS.Cu, Math.max(0, cu.Cd - cu.nh3)); }
      if (fe) { ek(EPS.Fe3, Math.max(0, fe.Cd - fe.scn)); ek(EPS.FeSCN, fe.scn); }
      if (r.m.Fe2) ek(EPS.Fe2, r.m.Fe2.Cd);
      if (co) { ek(EPS.CoCl4, co.cl4); ek(EPS.Co, Math.max(0, co.Cd - co.cl4)); }
      if (r.a.MnO4) ek(EPS.MnO4, r.a.MnO4);
      for (k in kap.gos) if (kap.gos[k] > 0) {
        var tg = gosGecirgen(k, r.pH), cg = kap.gos[k] / V * 0.05;
        for (var i = 0; i < 3; i++) A[i] += -lg(tg[i]) * cg * L;
      }
    }
    var i2 = (kap.n.I2 || 0) / V;
    if (i2 > 0) {
      if ((kap.n.Nis || 0) > 0 && kap.T < 65) { ek(EPS.NisI, i2); o.nisI = i2 > 2e-6; }
      else ek(EPS.I2, i2);
    }
    if (kap.n.Sab) ek(EPS.Sab, kap.n.Sab / 1000 / V);
    for (k = 0; k < 3; k++) o.sivi[k] = Math.round(o.sivi[k] * p10(-Math.min(A[k], 6)));
    /* Askıdaki çökelek bulanıklığı */
    var top = 0, rr = 0, gg = 0, bb = 0;
    if (r) for (k in r.cokM) {
      var t = CKI[k], mol = r.cokM[k] * V;
      if (mol < 1e-9) continue;
      o.cokelek.push({ id: k, renk: t.renk, mol: mol, parilti: !!t.parilti && kap.kristal > 0 });
      var w = t.bul * r.cokM[k] * kap.askida;
      var rgb = hexRgb(t.renk); top += w; rr += rgb[0] * w; gg += rgb[1] * w; bb += rgb[2] * w;
    }
    var sk = (kap.n.S || 0) / V;
    if (sk > 0) { var ws = 700 * sk; top += ws; rr += 246 * ws; gg += 238 * ws; bb += 196 * ws; }
    if (top > 0) { o.bulanik = 1 - Math.exp(-top * L); o.bulRenk = [rr / top, gg / top, bb / top]; }
    return o;
  }
  function hexRgb(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  /* İletkenlik (mS/cm) */
  function iletkenlik(kap) {
    var r = kap.r;
    if (!r || !(kap.V > 2e-6)) return 0;
    var k = 349.8 * r.h + 198.6 * r.oh, I = r.h + r.oh, x, j;
    var cift = 0;
    for (x in r.m) { var m = r.m[x], z = KAT[x].z, cd = m.Cd - (m.so4 || 0); cift += m.so4 || 0; k += KAT[x].lam * cd; I += z * z * cd; }
    for (x in r.a) { var za = ANY[x].z; k += ANY[x].lam * r.a[x]; I += za * za * r.a[x]; }
    for (x in r.z) {
      var Z = r.z[x], zz = ZAY[x];
      for (j = 0; j < Z.a.length; j++) {
        var zc = zz.z0 - j, cj = Z.Cd * Z.a[j];
        if (x === 'SO4' && j === 2) cj = Math.max(0, cj - cift);
        k += zz.lam[j] * cj; I += zc * zc * cj;
      }
    }
    I *= 0.5;
    return k / (1 + 0.6 * Math.sqrt(I)) * (1 + 0.02 * (kap.T - 25));
  }

  /* ================= 5. DENKLEMLER ================= */
  var IYF = {
    H: ['H', 1], Na: ['Na', 1], K: ['K', 1], Li: ['Li', 1], Ag: ['Ag', 1], NH4: ['NH4', 1, 1], Ca: ['Ca', 2], Ba: ['Ba', 2], Sr: ['Sr', 2],
    Mg: ['Mg', 2], Cu: ['Cu', 2], Zn: ['Zn', 2], Fe2: ['Fe', 2], Pb: ['Pb', 2], Co: ['Co', 2], Mn: ['Mn', 2], Fe3: ['Fe', 3], Al: ['Al', 3],
    Cl: ['Cl', -1], Br: ['Br', -1], I: ['I', -1], NO3: ['NO3', -1, 1], OH: ['OH', -1, 1], CH3COO: ['CH3COO', -1, 1], SCN: ['SCN', -1, 1],
    OCl: ['OCl', -1, 1], HCO3: ['HCO3', -1, 1], MnO4: ['MnO4', -1, 1], SO4: ['SO4', -2, 1], CO3: ['CO3', -2, 1], S2O3: ['S2O3', -2, 1], C6H5O7: ['C6H5O7', -3, 1]
  };
  function bilesik(k, a) {
    if (k === 'H' && a === 'OH') return 'H2O';
    var K = IYF[k], A = IYF[a];
    if (!K || !A) return null;
    var zk = K[1], za = -A[1], g = obeb(zk, za), nk = za / g, na = zk / g;
    function par(x, n) { return n === 1 ? x[0] : (x[2] ? '(' + x[0] + ')' + n : x[0] + n); }
    if (a === 'CH3COO') return par(A, na) + par(K, nk);
    return par(K, nk) + par(A, na);
  }
  function atomlar(f) {
    var yigin = [{}], i = 0;
    function sayi() { var s = ''; while (i < f.length && /[0-9]/.test(f.charAt(i))) s += f.charAt(i++); return s ? parseInt(s, 10) : 1; }
    while (i < f.length) {
      var ch = f.charAt(i);
      if (ch === '(' || ch === '[') { yigin.push({}); i++; }
      else if (ch === ')' || ch === ']') {
        i++; var n = sayi(), ust = yigin.pop(), alt0 = yigin[yigin.length - 1];
        for (var e in ust) topla(alt0, e, ust[e] * n);
      } else if (/[A-Z]/.test(ch)) {
        var el = ch; i++;
        while (i < f.length && /[a-z]/.test(f.charAt(i))) el += f.charAt(i++);
        topla(yigin[yigin.length - 1], el, sayi());
      } else i++;
    }
    return yigin[0];
  }
  function denklestir(sol, sag) {
    var tum = sol.concat(sag), A = tum.map(atomlar), el = {}, n = tum.length, k = [], en = null, enT = 1e9, i;
    if (n > 5) return null;
    A.forEach(function (a) { for (var e in a) el[e] = 1; });
    var els = Object.keys(el);
    function dene(i) {
      if (i === n) {
        var t = 0;
        for (var x = 0; x < n; x++) t += k[x];
        if (t >= enT) return;
        for (var e = 0; e < els.length; e++) {
          var top = 0;
          for (var y = 0; y < n; y++) top += (A[y][els[e]] || 0) * k[y] * (y < sol.length ? 1 : -1);
          if (top !== 0) return;
        }
        en = k.slice(); enT = t; return;
      }
      for (var c = 1; c <= 8; c++) { k[i] = c; dene(i + 1); }
    }
    dene(0);
    if (!en) return null;
    function yaz(liste, bas) {
      return liste.map(function (s, j) { var kat = en[bas + j]; return (kat > 1 ? kat : '') + alt(s[0]) + (s[1] ? '(' + s[1] + ')' : ''); }).join(' + ');
    }
    return { sol: sol, sag: sag, k: en, yaz: function (solH, sagH) {
      return yaz(sol.map(function (s, j) { return [s, solH[j]]; }), 0) + ' → ' + yaz(sag.map(function (s, j) { return [s, sagH[j]]; }), sol.length);
    } };
  }
  var CKF = {};
  CK.forEach(function (t) { CKF[t.f] = 1; });
  function hal(f) {
    if (f === 'H2O') return 's';
    if (CKF[f]) return 'k';
    if (f === 'H2' || f === 'O2' || f === 'CO2' || f === 'NO2' || f === 'NO' || f === 'Cl2' || f === 'SO2') return 'g';
    if (/^(Mg|Zn|Fe|Cu|Ag|Al|Na|K|Ca|Pb|Li|S|C)$/.test(f)) return 'k';
    return 'suda';
  }
  function molekuler(sol, sag, ozel) {
    if (sol.indexOf(null) >= 0 || sag.indexOf(null) >= 0) return null;
    var d = denklestir(sol, sag);
    if (!d) return null;
    var hs = sol.map(function (f) { return (ozel && ozel[f]) || hal(f); }), hg = sag.map(function (f) { return (ozel && ozel[f]) || hal(f); });
    return d.yaz(hs, hg);
  }
  /* Kapta bir bileşeni en çok getiren kimyasal */
  function kaynak(kap, komp, filtre) {
    var o = kap.kay[komp], en = null, eb = 0;
    if (!o) return null;
    for (var id in o) { var K = KIMI[id]; if (!K || (filtre && !filtre(K))) continue; if (o[id] > eb) { eb = o[id]; en = K; } }
    return en;
  }
  function bazKaynak(kap) {
    var en = null, eb = 0;
    for (var komp in kap.kay) for (var id in kap.kay[komp]) {
      var K = KIMI[id];
      if (K && K.kat === 'baz' && kap.kay[komp][id] > eb) { eb = kap.kay[komp][id]; en = K; }
    }
    return en;
  }
  function asitKaynak(kap) {
    var en = null, eb = 0;
    for (var komp in kap.kay) for (var id in kap.kay[komp]) {
      var K = KIMI[id];
      if (K && K.kat === 'asit' && kap.kay[komp][id] > eb) { eb = kap.kay[komp][id]; en = K; }
    }
    return en;
  }
  function iyonAd(x) { return KAT[x] ? KAT[x].ad : (ANY[x] ? ANY[x].ad : ({ OH: 'OH⁻', CO3: 'CO₃²⁻', SO4: 'SO₄²⁻', NH4: 'NH₄⁺', H: 'H⁺', Ac: 'CH₃COO⁻', OCl: 'OCl⁻' })[x] || x); }
  function netCokelme(t) {
    if (t.id === 'Ag2O') return '2Ag⁺(suda) + 2OH⁻(suda) → Ag₂O(k) + H₂O(s)';
    return (t.a > 1 ? t.a : '') + iyonAd(t.m) + '(suda) + ' + (t.b > 1 ? t.b : '') + iyonAd(t.x) + '(suda) → ' + alt(t.f) + '(k)';
  }
  function molCokelme(kap, t) {
    var A = kaynak(kap, t.m, function (K) { return K.iy && K.iy.k === (t.m === 'Fe3' ? 'Fe3' : t.m); });
    if (!A) return null;
    if (t.x === 'OH') {
      var B = bazKaynak(kap);
      if (!B) return null;
      if (B.id.indexOf('nh3') === 0) return molekuler([A.f, 'NH3', 'H2O'], [t.id === 'Ag2O' ? 'Ag2O' : t.f, bilesik('NH4', A.iy.a)], { Ag2O: 'k' });
      if (!B.iy || B.iy.a !== 'OH') return null;
      var sag = [t.id === 'Ag2O' ? 'Ag2O' : t.f, bilesik(B.iy.k, A.iy.a)];
      if (t.id === 'Ag2O') sag.push('H2O');
      return molekuler([A.f, B.f], sag, { Ag2O: 'k', 'Cu(OH)2': 'k', 'Fe(OH)3': 'k', 'Fe(OH)2': 'k', 'Mg(OH)2': 'k', 'Zn(OH)2': 'k', 'Al(OH)3': 'k', 'Ca(OH)2': 'k', 'Pb(OH)2': 'k', 'Co(OH)2': 'k', 'Mn(OH)2': 'k' });
    }
    var X = kaynak(kap, t.x, function (K) { return K.iy && (K.iy.a === t.x); });
    if (!X || X === A) return null;
    var oz = {}; oz[t.f] = 'k';
    var yan = bilesik(X.iy.k, A.iy.a);
    if (yan === 'H2O' && A.iy.a === 'OH') oz.H2O = 's';
    return molekuler([A.f, X.f], [t.f, yan], oz);
  }

  /* ================= 6. KAP ================= */
  function Kap(id, ad, tip, kapasite) {
    this.id = id; this.ad = ad; this.tip = tip; this.kapasite = kapasite;
    this.bosalt();
  }
  Kap.prototype.bosalt = function () {
    this.V = 0; this.T = 25; this.n = {}; this.metal = []; this.ek = {}; this.gos = {}; this.kay = {};
    this.r = null; this.H = 0; this.rT = 25; this.kopuk = 0; this.tasma = 0; this.askida = 1; this.karistir = 0;
    this.isit = false; this.sogut = false; this.gazHiz = {}; this.gazSon = {}; this.bulut = {}; this.son = {};
    this.dilN = 0; this.dilH = 0; this.dilC = 1; this.Phi = 0; this.tiyo = -1; this.tiyoT0 = 0; this.tiyoBitti = false;
    this.zaman = 0; this.kristal = 0; this.buhar = 0; this.kaynama = 0; this.sekerT = 0; this.eklenen = [];
  };
  function dengele(kap) {
    if (!(kap.V > 2e-6)) { kap.r = null; return null; }
    var c = {}, k;
    for (k in kap.n) if (kap.n[k] > 1e-14 && (KAT[k] || ANY[k] || ZAY[k])) c[k] = kap.n[k] / kap.V;
    kap.r = coz(c, kap.T, kap.r);
    kap.rT = kap.T;
    return kap.r;
  }
  function isiVer(kap, q) {   /* q: açığa çıkan ısı (kJ) */
    if (!q) return;
    if (!(kap.V > 2e-6)) { kap.T = sinir(kap.T + q * 1000 / 60, -10, 300); return; }
    var C = 4184 * kap.V + 40;
    kap.T += q * 1000 / C;
    if (kap.T > 100) {
      var fazla = (kap.T - 100) * C, g = fazla / 2257;
      kap.V = Math.max(0, kap.V - g / 1000);
      kap.T = 100; kap.buhar = Math.min(1, kap.buhar + g * 0.2);
    }
    if (kap.T < -8) kap.T = -8;
  }
  function seyrelme(kap) {   /* derişik asidin seyrelme ısısı */
    if (!(kap.dilN > 0)) return 0;
    var c = kap.V > 0 ? kap.dilN / kap.V : kap.dilC;
    var Phi = -kap.dilH * kap.dilN * Math.max(0, 1 - c / kap.dilC);
    var q = Phi - kap.Phi; kap.Phi = Phi;
    return q;
  }
  /* Kapta görülen her şeyin özeti: olayları bulmak için önce/sonra karşılaştırılır */
  function ozet(kap) {
    var r = kap.r, o = { V: kap.V, T: kap.T, pH: r ? r.pH : null, cok: {}, gos: {}, cuN: 0, fescn: 0, cocl: 0, i2: 0, nisI: false, mno4: 0, amf: {}, nh3k: {}, tampon: null };
    if (r) {
      for (var id in r.cokM) if (r.cokM[id] * kap.V > 2e-7) o.cok[id] = r.cokM[id] * kap.V;
      if (r.m.Cu && r.m.Cu.Cd > 1e-6) o.cuN = r.m.Cu.nh3 / r.m.Cu.Cd;
      if (r.m.Fe3) o.fescn = r.m.Fe3.scn;
      if (r.m.Co && r.m.Co.Cd > 1e-6) o.cocl = r.m.Co.cl4 / r.m.Co.Cd;
      ['Zn', 'Al', 'Pb', 'Cu'].forEach(function (k) { if (r.m[k] && r.m[k].Cd > 1e-6) o.amf[k] = r.m[k].ohk / r.m[k].Cd; });
      ['Cu', 'Ag', 'Zn'].forEach(function (k) { if (r.m[k] && r.m[k].Cd > 1e-6) o.nh3k[k] = r.m[k].nh3 / r.m[k].Cd; });
      for (var g in kap.gos) if (kap.gos[g] > 0) o.gos[g] = GOS[g].sinif(r.pH);
      o.mno4 = r.a.MnO4 || 0;
      ['Ac', 'NH3', 'CO3'].forEach(function (k) {
        var Z = r.z[k];
        if (!Z || Z.Cd < 0.01) return;
        var a = Z.a, i = k === 'CO3' ? (a[2] > a[0] ? 1 : 0) : 0, x = a[i] * Z.Cd, y = a[i + 1] * Z.Cd;
        if (x > 0.005 && y > 0.005 && x / y < 10 && y / x < 10) o.tampon = k;
      });
    }
    if (kap.V > 2e-6) {
      o.i2 = (kap.n.I2 || 0) / kap.V;
      o.nisI = (kap.n.Nis || 0) > 0 && o.i2 > 2e-6 && kap.T < 65;
    }
    return o;
  }
  function olay(tur, baslik, gozlem, ek) {
    var o = { tur: tur, baslik: baslik, gozlem: gozlem || '' };
    if (ek) for (var k in ek) o[k] = ek[k];
    return o;
  }
  function pHYaz(p) { return p === null || p === undefined ? '–' : tr(p, 2); }

  /* Kimyasal ekle. miktar: sıvıda L, katı ve metalde g */
  function ekle(kap, id, miktar, secenek) {
    var K = KIMI[id], olaylar = [], sessiz = !!(secenek && secenek.sessiz);
    if (!K || !(miktar > 0)) return olaylar;
    var once = ozet(kap), k, x, T0 = kap.T;
    if (kap.eklenen.indexOf(id) < 0) kap.eklenen.push(id);
    if (K.tur === 'metal') {
      var Md = METAL[K.metal], mol = miktar / Md.MA;
      kap.metal.push({ m: K.metal, n: mol, n0: mol, sek: K.sek, yas: 0, toz: !!K.toz, kim: id, x: Math.random(), aci: Math.random() * 6.28, kap: false });
      if (!(kap.V > 2e-6)) { olaylar.push(olay('bilgi', Md.ad + ' boş kaba kondu', 'Tepkime için kaba bir sıvı eklemelisin.')); return olaylar; }
      olaylar = olaylar.concat(adim(kap, 0.05));
      if (!olaylar.length) olaylar.push(metalYok(kap, kap.metal[kap.metal.length - 1], Md));
      return olaylar;
    }
    if (K.tur === 'kati' && K.ek) {
      topla(kap.ek, K.ek, miktar);
      if (K.ek === 'maya' && kap.ek.mayaAktif === undefined) kap.ek.mayaAktif = 1;
      olaylar.push(olay('bilgi', K.ad + ' eklendi', K.ek === 'mno2' ? 'Siyah toz kabın dibine çöktü. Kendisi tepkimeye girmez, yalnızca bazı tepkimeleri hızlandırır.' : 'Maya taneleri sıvıya dağıldı.'));
      return olaylar;
    }
    var H0 = kap.H, Vonce = kap.V;
    if (K.tur === 'sivi' || K.tur === 'gosterge') {
      var v = miktar, bos = kap.kapasite - kap.V;
      if (v > bos) {
        v = Math.max(0, bos);
        olaylar.push(olay('uyari', 'Kap doldu', 'Kabın alabileceğinden fazlası eklenemez. Taşan kısım eklenmedi.', { seviye: 'uyari' }));
      }
      if (v <= 0) return olaylar;
      if (kap.dilN > 0 && kap.V > 0 && kap.dilN / kap.V > 9 && !K.dil && v > 0.0004) {
        olaylar.push(olay('tehlike', 'Sıçrama tehlikesi!', 'Derişik asidin üzerine sulu çözelti döktün. Su, asidin yüzeyinde aniden kaynar ve asit sıçrar.',
          { seviye: 'tehlike', aciklama: 'Doğrusu: asit, suya yavaş yavaş ve karıştırarak eklenir. “Asit suya, su asite asla.”', konu: 'Laboratuvar güvenliği' }));
      }
      if (K.bil) for (k in K.bil) { var nn = K.bil[k] * v; topla(kap.n, k, nn); if (!kap.kay[k]) kap.kay[k] = {}; topla(kap.kay[k], id, nn); }
      if (K.gos) topla(kap.gos, K.gos, v * K.birim);
      if (K.dil) { kap.dilN += K.bil.SO4 ? K.bil.SO4 * v : (K.bil.Cl ? K.bil.Cl * v : (K.bil.NO3 || 0) * v); kap.dilH = K.dil.H; kap.dilC = K.dil.C; }
      H0 += stokEntalpi(K) * v;
      var C0 = 4184 * kap.V + 40, Ce = 4184 * v;
      kap.T = (C0 * kap.T + Ce * 25) / (C0 + Ce);
      kap.V += v;
    } else {   /* katı */
      var mk = miktar / K.MA;
      for (k in K.bil) { topla(kap.n, k, K.bil[k] * mk); if (!kap.kay[k]) kap.kay[k] = {}; topla(kap.kay[k], id, K.bil[k] * mk); }
      H0 += stokEntalpi(K) * mk;
    }
    if (kap.V > 2e-6) {
      dengele(kap);
      var H1 = entalpi(kap.r, kap.V), q = H0 - H1 + seyrelme(kap);
      kap.H = H1;
      isiVer(kap, q);
      if (Math.abs(kap.T - kap.rT) > 0.5) dengele(kap);
      kap.H = entalpi(kap.r, kap.V);
    } else kap.H = H0;
    if (once.V < 2e-6 && kap.V > 2e-6) once.bosKap = true;
    var sonra = ozet(kap);
    olaylar = olaylar.concat(olayBul(kap, once, sonra, { tur: 'ekle', K: K, Vonce: Vonce, T0: T0 }));
    if (sessiz) return olaylar.filter(function (e) { return e.tur !== 'bilgi' || /asidik|bazik|Tampon/.test(e.baslik); });
    if (kap.V > 2e-6) olaylar = olaylar.concat(adim(kap, 0.05));
    if (!olaylar.length) olaylar.push(degisimYok(kap, K, once, ozet(kap)));
    return olaylar;
  }
  function metalYok(kap, p, M) {
    var r = kap.r, ack, asitli = r && (r.h > 1e-3 || zayifAsit(r) > 1e-3);
    if (M.gecikme) ack = 'Alüminyumun yüzeyindeki ince oksit tabakası tepkimeyi geciktiriyor. Biraz bekle.';
    else if (M.E > 0 && asitli) ack = M.ad + ', aktiflik sırasında hidrojenden sonra gelir (daha az aktiftir). Bu yüzden HCl ya da seyreltik H₂SO₄ gibi asitlerin H⁺ iyonlarını indirgeyemez; H₂ gazı çıkmaz.';
    else if (!asitli && !M.alkali) {
      var dah = [];
      for (var k in (r ? r.m : {})) if (METAL[k] || k === 'Fe2') { var mm = k === 'Fe2' ? 'Fe' : k; if (METAL[mm] && METAL[mm].E < M.E && mm !== p.m) dah.push(METAL[mm].ad.toLowerCase()); }
      ack = dah.length ? M.ad + ', ' + dah.join(' ve ') + ' metalinden daha az aktif olduğu için bu iyonları indirgeyemez.' : M.ad + ' bu ortamda tepkime vermez; suyla da tepkimeye girmez.';
    } else ack = 'Tepkime çok yavaş.';
    return olay('yok', M.ad + ': gözle görülür bir tepkime yok', 'Metal kabın dibinde değişmeden duruyor.', { aciklama: ack, konu: '12. sınıf · Metallerin aktifliği' });
  }
  /* Bir kaptan diğerine aktar. oran: 0–1 */
  function aktar(a, b, oran, secenek) {
    var olaylar = [], sessiz = !!(secenek && secenek.sessiz);
    if (!(a.V > 2e-6) || oran <= 0) return olaylar;
    var v = a.V * oran, bos = b.kapasite - b.V;
    if (v > bos) { oran = bos / a.V; v = bos; olaylar.push(olay('uyari', 'Kap doldu', 'Hedef kap dolduğu için sıvının bir kısmı aktarılamadı.', { seviye: 'uyari' })); }
    if (v <= 1e-7) return olaylar;
    var once = ozet(b), k, id, Vonce = b.V, T0 = b.T;
    var Ha = a.H * oran;
    for (k in a.n) { var x = a.n[k] * oran; topla(b.n, k, x); a.n[k] -= x; }
    for (k in a.kay) { if (!b.kay[k]) b.kay[k] = {}; for (id in a.kay[k]) { var y = a.kay[k][id] * oran; topla(b.kay[k], id, y); a.kay[k][id] -= y; } }
    for (k in a.gos) { var gx = a.gos[k] * oran; topla(b.gos, k, gx); a.gos[k] -= gx; }
    if (a.dilN > 0) { var dn = a.dilN * oran; b.dilN += dn; b.dilH = a.dilH; b.dilC = a.dilC; b.Phi += a.Phi * oran; a.dilN -= dn; a.Phi *= (1 - oran); }
    if (oran > 0.999) { b.metal = b.metal.concat(a.metal); a.metal = []; for (k in a.ek) topla(b.ek, k, a.ek[k]); a.ek = {}; }
    var Cb = 4184 * b.V + 40, Ca = 4184 * v;
    b.T = (Cb * b.T + Ca * a.T) / (Cb + Ca);
    b.V += v; a.V -= v; a.H -= Ha;
    a.eklenen.forEach(function (e) { if (b.eklenen.indexOf(e) < 0) b.eklenen.push(e); });
    if (a.V < 2e-6) { a.bosalt(); } else dengele(a);
    var H0 = b.H + Ha;
    dengele(b);
    var H1 = entalpi(b.r, b.V), q = H0 - H1 + seyrelme(b);
    b.H = H1; isiVer(b, q);
    if (Math.abs(b.T - b.rT) > 0.5) { dengele(b); b.H = entalpi(b.r, b.V); }
    b.askida = 1;
    if (once.V < 2e-6) once.bosKap = true;
    olaylar = olaylar.concat(olayBul(b, once, ozet(b), { tur: 'aktar', kaynak: a, Vonce: Vonce, T0: T0 }));
    if (sessiz) return olaylar;
    olaylar = olaylar.concat(adim(b, 0.05));
    if (!olaylar.length) olaylar.push(once.bosKap ? olay('bilgi', 'Aktarıldı', tr(v * 1000, 1) + ' mL sıvı ' + b.ad.toLowerCase() + ' kabına aktarıldı.') : olay('yok', 'Gözle görülür bir tepkime yok', 'Karışımda renk değişimi, çökelek ya da gaz çıkışı gözlenmedi.'));
    return olaylar;
  }

  /* ================= 7. OLAYLAR ================= */
  function olayBul(kap, o, s, ctx) {
    var L = [], id, t, K = ctx.K;
    var yeniCok = false;
    /* Çökelme */
    for (id in s.cok) {
      t = CKI[id];
      var onceMol = o.cok[id] || 0;
      if (s.cok[id] > 2e-6 && s.cok[id] > onceMol * 1.5 + 1e-6) {
        if (onceMol < 2e-7 || s.cok[id] > 10 * onceMol) {
          yeniCok = true; kap.askida = 1;
          var soguma = ctx.tur === 'sicaklik' && s.T < o.T;
          if (soguma && t.parilti) kap.kristal = 1;
          L.push(olay('cokelme', (soguma ? 'Soğuyunca kristallendi: ' : 'Çökelek oluştu: ') + t.ad + ' (' + alt(t.f) + ')',
            soguma && t.parilti ? 'Çözelti soğurken parıltılı, ' + t.tarif + ' kristaller oluştu ve yavaşça dibe döküldü (“altın yağmuru”).'
              : 'Kapta ' + t.tarif + ' bir katı (çökelek) oluştu, sıvı bulanıklaştı.',
            { renk: t.renk, net: netCokelme(t), denklem: molCokelme(kap, t),
              aciklama: soguma ? alt(t.f) + '’nin çözünürlüğü sıcaklık düştükçe azalır. Sıcakta çözünmüş kalan iyonlar, soğuyunca Qç > Kçç olduğu için yeniden katı oluşturdu.'
                : 'İyon derişimlerinin çarpımı (Qç), ' + t.ad + ' için çözünürlük çarpımını (Kçç = ' + bilimsel(p10(t.lk), 1) + ') aştı. Qç > Kçç olduğunda çökelme olur.' + seyirciMetni(kap, t),
              konu: '11. sınıf · Çözünürlük dengesi' }));
        }
      }
    }
    /* Çözünme */
    for (id in o.cok) {
      t = CKI[id];
      if ((s.cok[id] || 0) < o.cok[id] * 0.08 && o.cok[id] > 2e-6) L.push(cozunmeOlayi(kap, t, o, s, ctx));
    }
    /* Nötralleşme */
    if (K && (K.kat === 'asit' || K.kat === 'baz') && o.pH !== null && s.pH !== null && !o.bosKap) {
      var asit = K.kat === 'asit', karsi = asit ? bazKaynak(kap) : asitKaynak(kap);
      if (karsi && ((asit && o.pH > 7.5) || (!asit && o.pH < 6.5) || o.tampon) && Math.abs(s.pH - o.pH) > 0.15) L.push(notrOlayi(kap, K, o, s));
    }
    if (ctx.tur === 'aktar' && o.pH !== null && s.pH !== null && !o.bosKap && ctx.kaynak) {
      var ap = ctx.kaynak.r ? ctx.kaynak.r.pH : null;
      if (Math.abs(s.pH - o.pH) > 1.5 && ((o.pH < 6 && s.pH > o.pH) || (o.pH > 8 && s.pH < o.pH))) L.push(notrOlayi(kap, null, o, s));
    }
    /* Hidroliz: tuz çözeltisinin pH'ı */
    if (K && K.kat === 'tuz' && s.pH !== null && (o.bosKap || (o.pH > 6.3 && o.pH < 7.7)) && (s.pH < 6 || s.pH > 8)) {
      var h = hidrolizMetni(kap, s.pH);
      if (h) L.push(h);
    }
    /* Tampon oluştu */
    if (s.tampon && s.tampon !== o.tampon) L.push(tamponOlayi(s.tampon, s.pH));
    /* Gösterge renkleri */
    for (var g in s.gos) {
      if (o.gos[g] && o.gos[g] !== s.gos[g]) L.push(olay('renk', GOS[g].ad + ': ' + o.gos[g] + ' → ' + s.gos[g],
        'Göstergenin rengi değişti (pH ' + pHYaz(o.pH) + ' → ' + pHYaz(s.pH) + ').',
        { aciklama: gosAciklama(g, s.pH), konu: '10. sınıf · Asitler, bazlar ve tuzlar', renkG: g }));
      else if (!o.gos[g] && K && K.gos === g) L.push(olay('renk', GOS[g].ad + ' eklendi: ' + s.gos[g],
        'Çözeltinin pH değeri ' + pHYaz(s.pH) + '. ' + GOS[g].ad + ' bu pH değerinde ' + (s.gos[g] === 'renksiz' ? 'renksizdir.' : s.gos[g] + ' renk verir.'),
        { aciklama: gosAciklama(g, s.pH), konu: '10. sınıf · Asitler, bazlar ve tuzlar', renkG: g }));
    }
    /* Kompleks iyon ve renk değişimleri */
    if (s.cuN > 0.4 && o.cuN <= 0.4) L.push(olay('renk', 'Koyu mavi kompleks iyon: [Cu(NH₃)₄]²⁺',
      'Çözelti koyu laciverte yakın, parlak bir maviye döndü.' + (o.cok['Cu(OH)2'] ? ' Önceki açık mavi çökelek çözündü.' : ''),
      { net: o.cok['Cu(OH)2'] ? 'Cu(OH)₂(k) + 4NH₃(suda) → [Cu(NH₃)₄]²⁺(suda) + 2OH⁻(suda)' : 'Cu²⁺(suda) + 4NH₃(suda) → [Cu(NH₃)₄]²⁺(suda)',
        aciklama: 'Amonyak molekülleri ortaklanmamış elektron çiftleriyle Cu²⁺ iyonuna bağlanır ve kompleks iyon oluşur. Bu yüzden fazla amonyakta bakır hidroksit çökeleği çözünür.',
        konu: '11. sınıf · Çözünürlük dengesi (kompleks oluşumu)', renk: '#1F4FC4' }));
    if (s.fescn > 2e-5 && o.fescn <= 2e-5) L.push(olay('renk', 'Kan kırmızısı renk: FeSCN²⁺',
      'Çözelti koyu kırmızıya döndü.', { net: 'Fe³⁺(suda) + SCN⁻(suda) ⇌ FeSCN²⁺(suda)',
        aciklama: 'Fe³⁺ ve SCN⁻ iyonları kırmızı renkli FeSCN²⁺ iyonunu oluşturur. Bu bir denge tepkimesidir: Fe³⁺ ya da SCN⁻ eklersen renk koyulaşır (denge ürünler yönüne kayar), seyreltirsen ya da Fe³⁺ iyonunu çöktürürsen renk açılır.',
        konu: '11. sınıf · Kimyasal denge (Le Chatelier ilkesi)', renk: '#B3141B' }));
    else if (o.fescn > 2e-5) {
      var oran = s.fescn / o.fescn;
      var neden = ctx.tur === 'ekle' && K ? K.ad : 'değişiklik';
      if (oran > 1.35 && ctx.tur !== 'sicaklik') L.push(olay('renk', 'Kırmızı renk koyulaştı', neden + ' eklenince FeSCN²⁺ derişimi arttı.',
        { aciklama: 'Girenlerden birinin derişimi artınca denge, bu artışı azaltacak yönde, yani ürünler (FeSCN²⁺) yönüne kayar.', konu: '11. sınıf · Kimyasal denge (Le Chatelier ilkesi)', net: 'Fe³⁺(suda) + SCN⁻(suda) ⇌ FeSCN²⁺(suda)' }));
      else if (oran < 0.6 && !(s.V > o.V * 1.3 && oran > 0.4)) L.push(olay('renk', s.fescn < 2e-6 ? 'Kırmızı renk kayboldu' : 'Kırmızı renk açıldı', 'FeSCN²⁺ derişimi azaldı.',
        { aciklama: s.cok['Fe(OH)3'] ? 'OH⁻ iyonları Fe³⁺ iyonlarını Fe(OH)₃ olarak çöktürdü. Fe³⁺ azalınca denge girenler yönüne kaydı ve kırmızı renk açıldı.' : 'Denge girenler yönüne kaydı (Le Chatelier ilkesi).',
          konu: '11. sınıf · Kimyasal denge (Le Chatelier ilkesi)', net: 'Fe³⁺(suda) + SCN⁻(suda) ⇌ FeSCN²⁺(suda)' }));
    }
    if (o.cocl < 0.5 && s.cocl >= 0.5) L.push(olay('renk', 'Pembeden maviye: [CoCl₄]²⁻', ctx.tur === 'sicaklik' ? 'Isıtınca çözelti maviye döndü.' : 'Çözelti maviye döndü.',
      { net: '[Co(H₂O)₆]²⁺(suda, pembe) + 4Cl⁻(suda) ⇌ [CoCl₄]²⁻(suda, mavi) + 6H₂O(s)  ΔH > 0',
        aciklama: ctx.tur === 'sicaklik' ? 'İleri tepkime endotermiktir. Sıcaklık artınca denge, ısıyı harcayan yöne, yani mavi [CoCl₄]²⁻ yönüne kayar.' : 'Cl⁻ derişimi artınca denge mavi [CoCl₄]²⁻ yönüne kayar.',
        konu: '11. sınıf · Kimyasal denge (Le Chatelier ilkesi)', renk: '#2C5BD8' }));
    else if (o.cocl >= 0.5 && s.cocl < 0.5) L.push(olay('renk', 'Maviden pembeye: [Co(H₂O)₆]²⁺', ctx.tur === 'sicaklik' ? 'Soğuyunca çözelti pembeye döndü.' : 'Çözelti pembeye döndü.',
      { net: '[Co(H₂O)₆]²⁺(suda, pembe) + 4Cl⁻(suda) ⇌ [CoCl₄]²⁻(suda, mavi) + 6H₂O(s)  ΔH > 0',
        aciklama: ctx.tur === 'sicaklik' ? 'Sıcaklık düşünce denge ısı veren yöne, yani pembe [Co(H₂O)₆]²⁺ yönüne kayar.' : 'Su eklenince (seyreltme) denge pembe [Co(H₂O)₆]²⁺ yönüne kayar.',
        konu: '11. sınıf · Kimyasal denge (Le Chatelier ilkesi)', renk: '#D9809E' }));
    if (ctx.tur !== 'tepkime' && s.nisI && !o.nisI) L.push(olay('renk', 'Lacivert renk: nişasta + iyot', 'Çözelti koyu laciverte (mavi-siyah) döndü.',
      { aciklama: 'İyot molekülleri nişastanın sarmal zincirlerinin içine girer ve koyu mavi renkli bir yapı oluşturur. Bu, nişasta ya da iyotun varlığını gösteren bir testtir.', konu: 'Biyokimya · Nişasta testi', renk: '#1D2550' }));
    else if (ctx.tur !== 'tepkime' && !s.nisI && o.nisI) L.push(olay('renk', 'Lacivert renk kayboldu', ctx.tur === 'sicaklik' ? 'Isıtınca koyu mavi renk kayboldu (soğuyunca geri gelir).' : 'Koyu mavi renk kayboldu.',
      { aciklama: ctx.tur === 'sicaklik' ? 'Sıcaklık artınca nişasta sarmalı açılır ve iyotu tutamaz.' : 'İyot (I₂) başka bir maddeye dönüştüğü için renk kayboldu.', konu: 'Biyokimya · Nişasta testi' }));
    /* Sıcaklık */
    var dT = s.T - (ctx.T0 !== undefined ? ctx.T0 : o.T);
    if (ctx.tur === 'ekle' && K && K.tur === 'kati' && K.dHc && Math.abs(dT) >= 1) L.push(cozunmeIsisi(K, dT, s.T));
    else if ((ctx.tur === 'ekle' || ctx.tur === 'aktar') && Math.abs(dT) >= 2 && !L.some(function (e) { return e.tur === 'notr'; })) {
      L.push(olay('isi', dT > 0 ? 'Kap ısındı: +' + tr(dT, 1) + ' °C' : 'Kap soğudu: ' + tr(dT, 1) + ' °C',
        'Sıcaklık ' + tr(s.T - dT, 1) + ' °C’den ' + tr(s.T, 1) + ' °C’ye ' + (dT > 0 ? 'çıktı' : 'düştü') + '.',
        { aciklama: dT > 0 ? 'Gerçekleşen değişim ekzotermiktir: çevreye ısı verdi.' : 'Gerçekleşen değişim endotermiktir: çevreden ısı aldı.', konu: '11. sınıf · Tepkimelerde enerji' }));
    }
    /* Saf suyun pH'ı ve sıcaklık */
    if (ctx.tur === 'sicaklik' && kap.isit && s.pH !== null && o.T < 60 && s.T >= 60 && Math.abs(s.pH - pKw(s.T) / 2) < 0.3)
      L.push(olay('bilgi', 'Sıcak suda pH 7’nin altında, ama su nötr', 'Sıcaklık ' + tr(s.T, 0) + ' °C; pH ' + pHYaz(s.pH) + '.',
        { aciklama: 'Suyun iyonlaşması endotermiktir: sıcaklık artınca Ksu büyür, [H⁺] ve [OH⁻] birlikte artar. pH 7’nin altına düşer ama [H⁺] = [OH⁻] olduğu için su hâlâ nötrdür. 100 °C’de nötr suyun pH’ı yaklaşık 6,1’dir.', konu: '11. sınıf · Asit-baz dengesi (suyun iyonlaşması)' }));
    return L;
  }
  function seyirciMetni(kap, t) {
    var s = [], k;
    for (k in kap.n) {
      if (kap.n[k] <= 0 || k === t.m || k === t.x) continue;
      if (KAT[k] && (k === 'Na' || k === 'K' || k === 'Li')) s.push(KAT[k].ad);
      if (ANY[k] && (k === 'NO3' || (k === 'Cl' && t.x !== 'Cl'))) s.push(ANY[k].ad);
      if (k === 'SO4' && t.x !== 'SO4' && !/SO4/.test(t.id)) s.push('SO₄²⁻');
    }
    if (!s.length) return '';
    return ' ' + s.join(', ') + ' iyonları tepkimeye girmez (seyirci iyonlar).';
  }
  function cozunmeOlayi(kap, t, o, s, ctx) {
    var r = kap.r, net = null, ack, baslik = 'Çökelek çözündü: ' + t.ad;
    var amf = s.amf[t.m] || 0, nk = s.nh3k[t.m] || 0, pH0 = o.pH, pH1 = s.pH;
    if (t.x === 'OH' && amf > 0.5 && pH1 > pH0) {
      net = { Zn: 'Zn(OH)₂(k) + 2OH⁻(suda) → [Zn(OH)₄]²⁻(suda)', Al: 'Al(OH)₃(k) + OH⁻(suda) → [Al(OH)₄]⁻(suda)', Pb: 'Pb(OH)₂(k) + OH⁻(suda) → [Pb(OH)₃]⁻(suda)', Cu: 'Cu(OH)₂(k) + 2OH⁻(suda) → [Cu(OH)₄]²⁻(suda)' }[t.m];
      ack = alt(t.f) + ' amfoterdir: hem asitlerde hem de kuvvetli bazlarda çözünür. Fazla OH⁻ ile suda çözünen hidrokso kompleks iyonu oluştu.';
      baslik = 'Amfoter hidroksit fazla bazda çözündü';
    } else if (nk > 0.5) {
      net = { Ag: t.id === 'AgCl' ? 'AgCl(k) + 2NH₃(suda) → [Ag(NH₃)₂]⁺(suda) + Cl⁻(suda)' : (t.id === 'Ag2O' ? 'Ag₂O(k) + 4NH₃(suda) + H₂O(s) → 2[Ag(NH₃)₂]⁺(suda) + 2OH⁻(suda)' : null),
        Cu: 'Cu(OH)₂(k) + 4NH₃(suda) → [Cu(NH₃)₄]²⁺(suda) + 2OH⁻(suda)', Zn: 'Zn(OH)₂(k) + 4NH₃(suda) → [Zn(NH₃)₄]²⁺(suda) + 2OH⁻(suda)' }[t.m];
      ack = 'Amonyak, metal iyonuyla suda çözünen bir kompleks iyon oluşturdu. Serbest metal iyonu azalınca Qç < Kçç oldu ve çökelek çözündü.';
      baslik = 'Çökelek amonyakta çözündü (kompleks oluşumu)';
    } else if (t.x === 'OH' && pH1 < pH0 - 0.3) {
      net = t.id === 'Ag2O' ? 'Ag₂O(k) + 2H⁺(suda) → 2Ag⁺(suda) + H₂O(s)' : alt(t.f) + '(k) + ' + t.b + 'H⁺(suda) → ' + iyonAd(t.m) + '(suda) + ' + t.b + 'H₂O(s)';
      ack = 'Eklenen asidin H⁺ iyonları OH⁻ iyonlarıyla su oluşturdu. OH⁻ azalınca Qç < Kçç oldu ve hidroksit çözündü.';
      baslik = 'Hidroksit çökeleği asitte çözündü';
    } else if (t.x === 'CO3' && pH1 < pH0 - 0.2) {
      if (pH1 > 5.6 && r && r.z.CO3 && r.z.CO3.a[1] > 0.5) {
        net = alt(t.f) + '(k) + CO₂(suda) + H₂O(s) → ' + iyonAd(t.m) + '(suda) + 2HCO₃⁻(suda)';
        ack = 'Fazla CO₂ (karbonik asit), karbonatı suda çözünen hidrojen karbonata dönüştürdü; bulanıklık kayboldu.';
      } else {
        net = alt(t.f) + '(k) + 2H⁺(suda) → ' + iyonAd(t.m) + '(suda) + H₂O(s) + CO₂(g)';
        ack = 'Karbonat iyonu asitle karbonik aside dönüşür; karbonik asit de su ve CO₂ gazına ayrışır.';
      }
      baslik = 'Karbonat asitte çözündü';
    } else if (ctx.tur === 'sicaklik' ? s.T > o.T : s.T > o.T + 3) {
      ack = alt(t.f) + '’nin çözünürlüğü sıcaklıkla artar. Isıtınca Kçç büyüdü ve katı çözündü.';
      baslik = 'Isıtınca çözündü: ' + t.ad;
    } else if (s.V > o.V * 1.3) {
      ack = 'Su eklenince iyon derişimleri azaldı; Qç, Kçç’nin altına düştü ve katı çözündü.';
      baslik = 'Seyreltince çözündü: ' + t.ad;
    } else ack = 'İyonlardan biri başka bir tepkimeyle harcandığı için Qç < Kçç oldu ve katı çözündü.';
    return olay('cozunme', baslik, 'Bulanıklık kayboldu; ' + t.tarif + ' katı çözündü.', { net: net, aciklama: ack, konu: '11. sınıf · Çözünürlük dengesi' });
  }
  function notrOlayi(kap, K, o, s) {
    var asit = K ? (K.kat === 'asit' ? K : asitKaynak(kap)) : asitKaynak(kap), baz = K ? (K.kat === 'baz' ? K : bazKaynak(kap)) : bazKaynak(kap);
    var net = 'H⁺(suda) + OH⁻(suda) → H₂O(s)', mol = null, ack;
    if (asit && baz) {
      var aZ = asit.tip === 'zayif', bZ = baz.tip === 'zayif', bK = baz.tip === 'karbonat';
      if (bK) {
        net = baz.iy.a === 'HCO3' ? 'HCO₃⁻(suda) + H⁺(suda) → H₂O(s) + CO₂(g)' : 'CO₃²⁻(suda) + 2H⁺(suda) → H₂O(s) + CO₂(g)';
        if (asit.iy) mol = molekuler([baz.f, asit.f], [bilesik(baz.iy.k, asit.iy.a), 'H2O', 'CO2']);
      } else if (bZ) {
        net = aZ ? 'CH₃COOH(suda) + NH₃(suda) → CH₃COO⁻(suda) + NH₄⁺(suda)' : 'NH₃(suda) + H⁺(suda) → NH₄⁺(suda)';
        if (asit.iy) mol = molekuler([baz.f, asit.f], [bilesik('NH4', asit.iy.a)]);
      } else {
        if (aZ && asit.id.indexOf('asetik') === 0 || asit.id === 'sirke') net = 'CH₃COOH(suda) + OH⁻(suda) → CH₃COO⁻(suda) + H₂O(s)';
        else if (aZ && asit.id === 'limon') net = 'H₃C₆H₅O₇(suda) + 3OH⁻(suda) → C₆H₅O₇³⁻(suda) + 3H₂O(s)';
        else if (aZ && asit.id === 'soda') net = 'H₂CO₃(suda) + 2OH⁻(suda) → CO₃²⁻(suda) + 2H₂O(s)';
        if (asit.iy && baz.iy) mol = molekuler([asit.f, baz.f], [bilesik(baz.iy.k, asit.iy.a), 'H2O']);
      }
    }
    var p = s.pH, sonuc = p < 6.5 ? 'Çözelti hâlâ asidik.' : (p > 7.5 ? 'Çözelti bazik.' : 'Çözelti nötre yakın.');
    ack = 'Asidin H⁺ iyonları ile bazın OH⁻ iyonları birleşerek su oluşturdu; geriye tuz kaldı. Nötralleşme ekzotermiktir. ' + sonuc;
    if (s.tampon) ack += ' Ortamda zayıf asit ve onun eşlenik bazı birlikte bulunduğu için çözelti tampon özelliği gösterir.';
    var dT = s.T - o.T;
    return olay('notr', 'Nötralleşme', 'pH ' + pHYaz(o.pH) + ' → ' + pHYaz(s.pH) + (Math.abs(dT) >= 0.3 ? '; sıcaklık ' + (dT > 0 ? '+' : '') + tr(dT, 1) + ' °C' : '') + '.',
      { net: net, denklem: mol, aciklama: ack, konu: '10. sınıf · Asitler, bazlar ve tuzlar' });
  }
  function hidrolizMetni(kap, pH) {
    var r = kap.r, asidik = pH < 7, neden = [];
    if (asidik) {
      if (kap.n.NH3 > 0 && r.z.NH3 && r.z.NH3.a[0] > 0.5) neden.push('NH₄⁺ iyonu suya proton vererek H₃O⁺ oluşturur: NH₄⁺ + H₂O ⇌ NH₃ + H₃O⁺');
      ['Fe3', 'Al', 'Cu', 'Zn', 'Pb'].forEach(function (k) { if (kap.n[k] > 0) neden.push(KAT[k].ad + ' iyonu çevresindeki su moleküllerinden H⁺ ayrılmasına yol açar (metal iyonu hidrolizi).'); });
    } else {
      if (r.z.Ac && r.z.Ac.a[1] > 0.5) neden.push('CH₃COO⁻ iyonu sudan proton alarak OH⁻ oluşturur: CH₃COO⁻ + H₂O ⇌ CH₃COOH + OH⁻');
      if (r.z.CO3 && kap.n.CO3 > 0) neden.push('CO₃²⁻ ve HCO₃⁻ iyonları sudan proton alarak OH⁻ oluşturur: CO₃²⁻ + H₂O ⇌ HCO₃⁻ + OH⁻');
      if (r.z.OCl) neden.push('OCl⁻ iyonu zayıf asidin (HOCl) anyonudur ve suyla OH⁻ oluşturur.');
    }
    if (!neden.length) return null;
    return olay('bilgi', 'Tuz çözeltisi ' + (asidik ? 'asidik' : 'bazik') + ' (pH ' + pHYaz(pH) + ')', 'Tuz suda çözündü ama çözelti nötr değil.',
      { aciklama: neden.join(' ') + ' Bu olaya hidroliz denir.', konu: '10. sınıf · Asitler, bazlar ve tuzlar' });
  }
  function tamponOlayi(k, pH) {
    var ad = { Ac: 'CH₃COOH / CH₃COO⁻', NH3: 'NH₄⁺ / NH₃', CO3: pH < 8.3 ? 'H₂CO₃ / HCO₃⁻' : 'HCO₃⁻ / CO₃²⁻' }[k];
    return olay('bilgi', 'Tampon çözelti oluştu (' + ad + ')', 'pH ' + pHYaz(pH) + '. Az miktarda asit ya da baz eklendiğinde pH fazla değişmez.',
      { aciklama: 'Zayıf asit ile eşlenik bazı birlikte bulunduğunda eklenen H⁺ iyonlarını baz, OH⁻ iyonlarını asit karşılar. pH ≈ pKa + log([baz]/[asit]).', konu: '11. sınıf · Asit-baz dengesi (tampon çözeltiler)' });
  }
  function gosAciklama(g, pH) {
    var a = { fenol: 'Fenolftalein asidik ve nötr ortamda renksiz, pH 8,2’nin üstünde pembedir.', mo: 'Metil oranj pH 3,1’in altında kırmızı, 4,4’ün üstünde sarıdır.',
      mk: 'Metil kırmızısı pH 4,4’ün altında kırmızı, 6,2’nin üstünde sarıdır.', btb: 'Bromtimol mavisi asitte sarı, nötrde yeşil, bazda mavidir.',
      tur: 'Turnusol asitte kırmızı, bazda mavidir.', lah: 'Kırmızı lahanadaki antosiyaninler pH’a göre kırmızıdan sarıya kadar renk değiştirir.',
      evr: 'Evrensel gösterge birkaç göstergenin karışımıdır; her pH için farklı bir renk verir.' }[g];
    return a + ' Çözelti şu an ' + (pH < 6.5 ? 'asidik' : (pH > 7.5 ? 'bazik' : 'nötre yakın')) + '.';
  }
  function cozunmeIsisi(K, dT, T) {
    var ack = dT > 0 ? 'Çözünme ekzotermik: iyonlar su molekülleriyle sarılırken (hidratasyon) açığa çıkan enerji, kristali dağıtmak için gerekenden fazla.'
      : 'Çözünme endotermik: kristal örgüyü dağıtmak için gereken enerji, hidratasyonda açığa çıkandan fazla; ısı çevreden alınır.';
    if (K.id === 'nh4no3_k') ack += ' Soğuk paketler bu ilkeyle çalışır.';
    if (K.id === 'cacl2_k') ack += ' Sıcak paketler bu ilkeyle çalışır.';
    if (K.id === 'naoh_k') ack += ' Katı NaOH çözünürken kap çok ısınabilir; dikkatli olunmalı.';
    return olay('isi', (dT > 0 ? 'Çözünürken ısındı: +' : 'Çözünürken soğudu: ') + tr(dT, 1) + ' °C', K.ad + ' çözündü; sıcaklık ' + tr(T, 1) + ' °C oldu.',
      { net: alt(K.f) + '(k) → ' + iyonlar(K) + '   ΔH ' + (K.dHc > 0 ? '> 0' : '< 0'), aciklama: ack, konu: '11. sınıf · Tepkimelerde enerji' });
  }
  function iyonlar(K) {
    if (!K.iy) return alt(K.f) + '(suda)';
    var f = bilesik(K.iy.k, K.iy.a), zk = IYF[K.iy.k][1], za = -IYF[K.iy.a][1], g = obeb(zk, za);
    var nk = za / g, na = zk / g;
    return (nk > 1 ? nk : '') + iyonAd(K.iy.k === 'Fe3' ? 'Fe3' : K.iy.k) + '(suda) + ' + (na > 1 ? na : '') + iyonAd(K.iy.a === 'CH3COO' ? 'Ac' : K.iy.a) + '(suda)';
  }
  function degisimYok(kap, K, o, s) {
    var ack = '', b = 'Gözle görülür bir tepkime yok';
    if (K.kat === 'gosterge') return olay('bilgi', K.ad + ' eklendi', 'Gösterge çözeltiye karıştı.');
    if (K.su) {
      if (s.V > 2e-6 && o.V > 2e-6) return olay('bilgi', 'Su eklendi (seyreltme)', 'Hacim ' + tr(o.V * 1000, 1) + ' mL’den ' + tr(s.V * 1000, 1) + ' mL’ye çıktı.' + (o.pH !== null && Math.abs(s.pH - o.pH) > 0.05 ? ' pH ' + pHYaz(o.pH) + ' → ' + pHYaz(s.pH) + '.' : ''),
        { aciklama: 'Seyreltmede madde miktarı (mol) değişmez, derişim azalır: M₁·V₁ = M₂·V₂.', konu: '10. sınıf · Çözeltiler (derişim)' });
      return olay('bilgi', 'Saf su eklendi', 'pH ' + pHYaz(s.pH) + ' (nötr).');
    }
    if (o.bosKap || o.V < 2e-6) {
      var pH = s.pH, d = pH === null ? '' : 'pH ' + pHYaz(pH) + (pH < 6.5 ? ' (asidik)' : (pH > 7.5 ? ' (bazik)' : ' (nötr)')) + '.';
      return olay('bilgi', K.ad + ' kaba kondu', (d + (K.tur === 'kati' && s.V < 2e-6 ? ' Kap boş; katı, sıvı ekleyince çözünecek.' : '')).replace(/^ /, ''));
    }
    if (K.kat === 'tuz' && K.tur === 'sivi') ack = 'Karışımdaki iyonların hiçbiri az çözünen bir bileşik oluşturmadı; hepsi suda çözünmüş olarak kaldı.';
    else if (K.kat === 'asit' || K.kat === 'baz') ack = 'pH ' + pHYaz(o.pH) + ' → ' + pHYaz(s.pH) + '.';
    return olay('yok', b, 'Karışımda renk değişimi, çökelek ya da gaz çıkışı gözlenmedi.', { aciklama: ack });
  }

  /* ================= 8. ZAMANLA İLERLEYEN OLAYLAR ================= */
  function episod(kap, anahtar, hiz, esik) {   /* aynı olay kısa sürede tekrar yazılmasın */
    if (hiz < esik) return false;
    var son = kap.son[anahtar];
    kap.son[anahtar] = kap.zaman;
    return son === undefined || kap.zaman - son > 10;
  }
  function zayifAsit(r) {
    var s = 0;
    if (r.z.Ac) s += r.z.Ac.Cd * r.z.Ac.a[0];
    if (r.z.Sit) s += r.z.Sit.Cd * (r.z.Sit.a[0] + r.z.Sit.a[1] * 0.5);
    if (r.z.SO4) s += r.z.SO4.Cd * r.z.SO4.a[1] * 5;
    if (r.z.Vit) s += r.z.Vit.Cd * r.z.Vit.a[0];
    if (r.z.CO3) s += r.z.CO3.Cd * r.z.CO3.a[0] * 0.1;
    if (r.m.Al) s += r.m.Al.serbest * 0.2;
    if (r.m.Fe3) s += r.m.Fe3.serbest * 0.2;
    if (r.m.Cu) s += r.m.Cu.serbest * 0.05;
    return s;
  }
  function adim(kap, dt) {
    var L = [];
    kap.zaman += dt;
    var C = 4184 * kap.V + 40;
    /* Sıcaklık: ısıtıcı, buz banyosu, ortam */
    var q = 0;
    if (kap.isit) q += (kap.tip === 'tup' ? 350 : 1400) * dt / 1000;
    var hedef = kap.sogut ? 0 : 25, kk = kap.sogut ? 0.05 : 0.004;
    q += (hedef - kap.T) * (1 - Math.exp(-kk * dt)) * C / 1000;
    kap.buhar *= Math.exp(-dt / 2);
    if (kap.V > 2e-6 || kap.metal.length) {
      var D = { q: 0, gaz: {}, degisti: false, L: L };
      var r = kap.r || dengele(kap), once = ozet(kap);
      if (r) {
        metalKurali(kap, r, dt, D);
        hizliKurallar(kap, r, dt, D);
        gazCikisi(kap, r, dt, D);
      }
      if (D.degisti || Math.abs(kap.T + (q + D.q) * 1000 / C - kap.rT) > 0.8) {
        var H0 = kap.H;
        isiVer(kap, q + D.q); q = 0; D.q = 0;
        dengele(kap);
        var H1 = entalpi(kap.r, kap.V);
        if (D.degisti) isiVer(kap, H0 - H1);
        kap.H = entalpi(kap.r, kap.V);
        if (Math.abs(kap.T - kap.rT) > 0.5) { dengele(kap); kap.H = entalpi(kap.r, kap.V); }
        var ol = olayBul(kap, once, ozet(kap), { tur: D.degisti ? 'tepkime' : 'sicaklik' });
        for (var i = 0; i < ol.length; i++) L.push(ol[i]);
      } else isiVer(kap, q + D.q);
      /* Gaz hızları ve köpük */
      var gazTop = 0;
      for (var g in D.gaz) gazTop += D.gaz[g];
      ['H2', 'O2', 'CO2', 'NH3', 'Cl2', 'NO2', 'NO', 'SO2', 'NH2Cl'].forEach(function (g) {
        var x = D.gaz[g] || 0;
        kap.gazHiz[g] = (kap.gazHiz[g] || 0) * Math.exp(-dt / 0.6) + x / dt * (1 - Math.exp(-dt / 0.6));
        kap.gazSon[g] = (kap.gazSon[g] || 0) * Math.exp(-dt / 20) + x;
        kap.bulut[g] = Math.min(1, (kap.bulut[g] || 0) * Math.exp(-dt / 6) + x * 300);
      });
      if (gazTop > 0 && (kap.n.Sab || 0) > 0.2) {
        var tut = Math.min(0.9, 0.35 + 0.12 * kap.n.Sab);
        kap.kopuk += gazTop * 24.5 * (kap.T + TK) / 298 * tut;
      }
      kap.kopuk *= Math.exp(-dt / 45);
      var fazla = kap.V + kap.kopuk - kap.kapasite;
      if (fazla > 0) { kap.tasma = Math.min(2, kap.tasma + fazla); kap.kopuk = Math.max(0, kap.kapasite - kap.V); }
      kap.tasma *= Math.exp(-dt / 30);
    } else isiVer(kap, q);
    /* Kaynama ve buharlaşma */
    var kaynar = kap.T >= 99.5 && kap.isit && kap.V > 2e-6 ? 1 : 0;
    if (kaynar && !kap.kaynama && episod(kap, 'kayna', 1, 0.5)) L.push(olay('bilgi', 'Kaynama başladı', 'Sıvının içinden büyük kabarcıklar yükseliyor; buhar çıkıyor. Sıcaklık 100 °C’de sabit kalıyor.',
      { aciklama: 'Kaynama sırasında verilen ısı sıvıyı buhara dönüştürmek için harcanır; bu yüzden saf maddelerde kaynama süresince sıcaklık değişmez.', konu: '9. sınıf · Maddenin hâlleri' }));
    kap.kaynama = kaynar;
    if (kap.V > 0 && kap.V < 3e-4 && kap.T >= 99.5 && kap.isit) {
      kap.V = 0; kap.isit = false; kap.r = null;
      L.push(olay('bilgi', 'Kap kurudu', 'Suyun tamamı buharlaştı; kabın dibinde katı kalıntı (kristaller) kaldı. Isıtma durduruldu.',
        { aciklama: 'Buharlaştırma, çözünmüş katıyı çözeltiden ayırmanın bir yoludur. Çözücü buharlaşır, çözünen katı geride kalır.', konu: '9. sınıf · Karışımların ayrılması' }));
    }
    if (kap.karistir > 0) { kap.karistir -= dt; kap.askida = Math.min(1, kap.askida + dt * 2); }
    else kap.askida *= Math.exp(-dt / 12);
    if (kap.kristal > 0) kap.kristal = Math.max(0, kap.kristal - dt / 40);
    return L;
  }
  function metalKurali(kap, r, dt, D) {
    if (!kap.metal.length || !(kap.V > 2e-6)) return;
    var f = Math.pow(2, (kap.T - 25) / 10), V = kap.V, h = r.h, oh = r.oh, aEff = h + 0.02 * zayifAsit(r);
    var no3 = r.a.NO3 || 0, yeni = [];
    for (var i = kap.metal.length - 1; i >= 0; i--) {
      var p = kap.metal[i], M = METAL[p.m];
      p.yas += dt;
      if (p.n <= 1e-10) { kap.metal.splice(i, 1); continue; }
      var S = p.sek * Math.pow(p.n * M.MA, 2 / 3);
      var ind = M.gecikme ? sinir(p.yas / (M.gecikme * (r.a.Cl > 0.05 ? 0.5 : 1)), 0.03, 1) : 1;
      var yollar = [];
      var pas = (p.m === 'Fe' || p.m === 'Al') && no3 > 6 && h > 3;
      var oksit = no3 > 0.5 && h > 0.3;
      if (M.E < 0 && !pas) {
        var ra = (M.asit || 0) * S * aEff * f * ind, rw = (M.su || 0) * S * Math.pow(2, (kap.T - 25) / (M.alkali ? 25 : 10));
        if (oksit && no3 > 6 && !M.alkali) yollar.push(['no2', ra]);
        else if (ra + rw > 0) yollar.push(['h2', ra + rw]);
        if (M.baz && oh > 1e-3) yollar.push(['baz', M.baz * S * oh * f * ind]);
      }
      if (M.E > 0 && oksit && M.nitrik) yollar.push([no3 > 6 ? 'no2' : 'no', M.nitrik * S * h * Math.sqrt(no3) * f]);
      if (!M.alkali && r.m) {
        for (var j = 0; j < IND.length; j++) {
          var N = IND[j];
          if (N.E <= M.E + 0.05 || !r.m[N.k]) continue;
          var cN = r.m[N.k].serbest;
          if (cN < 1e-7) continue;
          var kd = 3e-4 * Math.min(3, 1 + N.E - M.E) * (p.m === 'Al' && !(r.a.Cl > 0.05) ? 0.12 : 1);
          yollar.push(['yer', kd * S * cN * f * ind, N]);
        }
        if (r.m.Fe3 && M.E < 0.77 && r.m.Fe3.serbest > 1e-6) yollar.push(['fe3', 6e-5 * S * r.m.Fe3.serbest * f]);
      }
      for (var y = 0; y < yollar.length; y++) {
        var yol = yollar[y][0], hiz = yollar[y][1], dx = Math.min(p.n, hiz * dt), z = M.z;
        if (!(dx > 1e-12)) continue;
        if (yol === 'h2') {
          if (!M.alkali) dx = Math.min(dx, 0.4 * aEff * V / z);
          p.n -= dx; topla(kap.n, M.iyon, dx); topla(D.gaz, 'H2', dx * z / 2); D.q += -dx * KAT[M.iyon].dHf; D.degisti = true;
          if (episod(kap, 'h2' + p.m, dx / dt, 1.5e-6)) D.L.push(metalAsitOlayi(kap, p, M, h > 1e-4 || zayifAsit(r) > 1e-3));
        } else if (yol === 'baz') {
          dx = Math.min(dx, 0.3 * oh * V);
          p.n -= dx; topla(kap.n, M.iyon, dx); topla(D.gaz, 'H2', dx * z / 2); D.q += -dx * KAT[M.iyon].dHf; D.degisti = true;
          if (episod(kap, 'baz' + p.m, dx / dt, 1.5e-6)) D.L.push(olay('gaz', M.ad + ' bazda çözünüyor: H₂ gazı', 'Metalin yüzeyinden gaz kabarcıkları çıkıyor; metal yavaşça çözünüyor.',
            { net: p.m === 'Al' ? '2Al(k) + 2OH⁻(suda) + 6H₂O(s) → 2[Al(OH)₄]⁻(suda) + 3H₂(g)' : 'Zn(k) + 2OH⁻(suda) + 2H₂O(s) → [Zn(OH)₄]²⁻(suda) + H₂(g)',
              aciklama: M.ad + ' amfoter bir metaldir: hem asitlerle hem de kuvvetli bazlarla tepkime vererek H₂ gazı açığa çıkarır.', konu: '12. sınıf · Metallerin aktifliği', gaz: 'H2' }));
        } else if (yol === 'no2' || yol === 'no') {
          dx = Math.min(dx, 0.1 * h * V / z, 0.3 * no3 * V / z);
          var nN = yol === 'no2' ? z : z / 3;
          p.n -= dx; topla(kap.n, M.iyon, dx); kap.n.NO3 -= nN * dx; topla(D.gaz, yol === 'no2' ? 'NO2' : 'NO', nN * dx); D.q += (yol === 'no2' ? 15 : 40) * z * dx; D.degisti = true;
          if (episod(kap, yol + p.m, dx / dt, 1e-6)) D.L.push(nitrikOlayi(kap, p, M, yol));
        } else if (yol === 'yer') {
          var Nn = yollar[y][2];
          dx = Math.min(dx, 0.4 * r.m[Nn.k].serbest * V * Nn.z / z);
          var nd = dx * z / Nn.z;
          p.n -= dx; topla(kap.n, M.iyon, dx); kap.n[Nn.k] -= nd; D.q += -dx * (KAT[M.iyon].dHf - (z / Nn.z) * KAT[Nn.k].dHf); D.degisti = true;
          p.kap = Nn.m; p.kapMiktar = (p.kapMiktar || 0) + nd;
          yeni.push([Nn.m, nd]);
          if (episod(kap, 'yer' + p.m + Nn.k, dx / dt, 4e-7)) D.L.push(yerDegistirmeOlayi(kap, p, M, Nn));
        } else if (yol === 'fe3') {
          dx = Math.min(dx, 0.4 * r.m.Fe3.serbest * V / z);
          p.n -= dx; topla(kap.n, M.iyon, dx); kap.n.Fe3 -= z * dx; topla(kap.n, 'Fe2', z * dx);
          D.q += -dx * (KAT[M.iyon].dHf + z * (KAT.Fe2.dHf - KAT.Fe3.dHf)); D.degisti = true;
          if (episod(kap, 'fe3' + p.m, dx / dt, 4e-7)) D.L.push(olay('renk', M.ad + ', Fe³⁺ iyonlarını Fe²⁺ iyonuna indirgedi', 'Sarı-turuncu renk soluk yeşile dönüyor.',
            { net: (z === 2 ? '' : z === 1 ? '' : '') + M.ad.charAt(0) + '…', aciklama: 'Fe³⁺ iyonu iyi bir yükseltgendir; ' + M.ad.toLowerCase() + ' metali yükseltgenerek çözünürken Fe³⁺ iyonları Fe²⁺ iyonuna indirgenir.', konu: '12. sınıf · Redoks tepkimeleri' }));
        }
      }
    }
    for (var u = 0; u < yeni.length; u++) {
      var mm = yeni[u][0], mol = yeni[u][1], bulundu = null;
      for (var w = 0; w < kap.metal.length; w++) if (kap.metal[w].m === mm && kap.metal[w].cokme) bulundu = kap.metal[w];
      if (bulundu) bulundu.n += mol;
      else kap.metal.push({ m: mm, n: mol, n0: mol, sek: 8, yas: 0, cokme: true, x: Math.random(), aci: 0 });
    }
  }
  function metalAsitOlayi(kap, p, M, asitli) {
    var A = asitKaynak(kap), net, mol = null;
    if (M.alkali && !asitli) {
      net = (M.z === 1 ? '2' + p.m + '(k) + 2H₂O(s) → 2' + KAT[M.iyon].ad + '(suda) + 2OH⁻(suda) + H₂(g)' : p.m + '(k) + 2H₂O(s) → ' + KAT[M.iyon].ad + '(suda) + 2OH⁻(suda) + H₂(g)');
      mol = molekuler([p.m, 'H2O'], [bilesik(M.iyon, 'OH'), 'H2'], { 'Ca(OH)2': 'suda' });
      var gz = p.m === 'Na' ? 'Sodyum suyun üstünde yüzüyor, cızırdayarak hızla dönüyor ve küçülüyor.' : (p.m === 'K' ? 'Potasyum suyun üstünde leylak renkli alevle yanarak koşturuyor.' : (p.m === 'Li' ? 'Lityum suyun üstünde yüzerek yavaşça köpürüyor.' : 'Metal kabın dibinde gaz kabarcıkları çıkararak çözünüyor; çözelti bulanıklaşıyor.'));
      return olay('gaz', M.ad + ' + su: H₂ gazı ve baz oluşuyor', gz,
        { net: net, denklem: mol, aciklama: M.ad + ' çok aktif bir metaldir: suyla tepkime vererek hidrojen gazı ve ' + alt(bilesik(M.iyon, 'OH')) + ' bazını oluşturur. Ortam bazikleştiği için fenolftalein pembeleşir. Tepkime ekzotermiktir.', konu: '12. sınıf · Metallerin aktifliği', gaz: 'H2', seviye: p.m === 'K' || p.m === 'Na' ? 'uyari' : null });
    }
    net = (M.z === 3 ? '2' + p.m + '(k) + 6H⁺(suda) → 2' + KAT[M.iyon].ad + '(suda) + 3H₂(g)' : (M.z === 1 ? '2' + p.m + '(k) + 2H⁺(suda) → 2' + KAT[M.iyon].ad + '(suda) + H₂(g)' : p.m + '(k) + 2H⁺(suda) → ' + KAT[M.iyon].ad + '(suda) + H₂(g)'));
    if (A && A.iy) mol = molekuler([p.m, A.f], [bilesik(M.iyon, A.iy.a), 'H2']);
    var hizAd = { Mg: 'Hızlı ve bol kabarcık çıkışı var; metal hızla küçülüyor, kap ısınıyor.', Zn: 'Çinkonun yüzeyinden düzenli gaz kabarcıkları çıkıyor.', Fe: 'Demirin yüzeyinden yavaş yavaş gaz kabarcıkları çıkıyor; çözelti soluk yeşile dönüyor.', Al: 'Bir süre bekledikten sonra alüminyum yüzeyinden gaz çıkışı başladı ve hızlandı.', Ca: 'Kalsiyum köpürerek çözünüyor.', Pb: 'Çok yavaş gaz çıkışı var.' }[p.m] || 'Metalin yüzeyinden gaz kabarcıkları çıkıyor.';
    return olay('gaz', M.ad + ' + asit: H₂ gazı çıkıyor', (p.toz ? 'Toz hâlde olduğu için tepkime çok hızlı. ' : '') + hizAd,
      { net: net, denklem: mol, aciklama: M.ad + ', hidrojenden daha aktif olduğu için asidin H⁺ iyonlarını H₂ gazına indirger, kendisi ' + KAT[M.iyon].ad + ' iyonuna yükseltgenir.' + (p.m === 'Al' ? ' Yüzeydeki koruyucu oksit tabakası çözülene kadar tepkime yavaş başlar.' : ''), konu: '12. sınıf · Metallerin aktifliği', gaz: 'H2' });
  }
  function nitrikOlayi(kap, p, M, yol) {
    var net = yol === 'no2' ? (M.z === 2 ? p.m + '(k) + 4H⁺(suda) + 2NO₃⁻(suda) → ' + KAT[M.iyon].ad + '(suda) + 2NO₂(g) + 2H₂O(s)' : p.m + '(k) + 2H⁺(suda) + NO₃⁻(suda) → ' + KAT[M.iyon].ad + '(suda) + NO₂(g) + H₂O(s)')
      : (M.z === 2 ? '3' + p.m + '(k) + 8H⁺(suda) + 2NO₃⁻(suda) → 3' + KAT[M.iyon].ad + '(suda) + 2NO(g) + 4H₂O(s)' : '3' + p.m + '(k) + 4H⁺(suda) + NO₃⁻(suda) → 3' + KAT[M.iyon].ad + '(suda) + NO(g) + 2H₂O(s)');
    var mol = yol === 'no2' ? molekuler([p.m, 'HNO3'], [bilesik(M.iyon, 'NO3'), 'NO2', 'H2O']) : molekuler([p.m, 'HNO3'], [bilesik(M.iyon, 'NO3'), 'NO', 'H2O']);
    return olay(yol === 'no2' ? 'tehlike' : 'gaz', M.ad + ' nitrik asitte çözünüyor: ' + (yol === 'no2' ? 'NO₂ gazı' : 'NO gazı'),
      yol === 'no2' ? 'Kırmızı-kahverengi, boğucu bir gaz çıkıyor. ' + (p.m === 'Cu' ? 'Çözelti yeşilimsi maviye dönüyor.' : '') : 'Renksiz gaz kabarcıkları çıkıyor; gaz kabın ağzında havayla karşılaşınca kahverengiye dönüyor. ' + (p.m === 'Cu' ? 'Çözelti maviye dönüyor.' : ''),
      { net: net, denklem: mol, aciklama: M.ad + ' hidrojenden az aktiftir; HCl ile tepkime vermez. Nitrik asit ise yükseltgen bir asittir: metali yükseltger, kendisi ' + (yol === 'no2' ? 'NO₂’ye' : 'NO’ya') + ' indirgenir. H₂ gazı çıkmaz.',
        konu: '12. sınıf · Redoks tepkimeleri', gaz: yol === 'no2' ? 'NO2' : 'NO', seviye: yol === 'no2' ? 'tehlike' : null });
  }
  function yerDegistirmeOlayi(kap, p, M, N) {
    var A = kaynak(kap, N.k, function (K) { return K.iy && K.iy.k === N.k; }), mol = null;
    var net = (M.z === N.z ? p.m + '(k) + ' + KAT[N.k].ad + '(suda) → ' + KAT[M.iyon].ad + '(suda) + ' + N.m + '(k)'
      : (M.z === 2 && N.z === 1 ? p.m + '(k) + 2' + KAT[N.k].ad + '(suda) → ' + KAT[M.iyon].ad + '(suda) + 2' + N.m + '(k)'
        : (M.z === 3 && N.z === 2 ? '2' + p.m + '(k) + 3' + KAT[N.k].ad + '(suda) → 2' + KAT[M.iyon].ad + '(suda) + 3' + N.m + '(k)' : M.z + p.m + '…')));
    if (A && A.iy) mol = molekuler([p.m, A.f], [bilesik(M.iyon, A.iy.a), N.m]);
    var gz = { Cu: 'Metalin yüzeyi kırmızı-kahverengi bakırla kaplanıyor; mavi renk zamanla açılıyor.', Ag: 'Metalin yüzeyinde parlak, gri-gümüş renkli dallanan kristaller (gümüş ağacı) oluşuyor; çözelti maviye dönüyor.', Pb: 'Metalin yüzeyinde koyu gri, yaprak şeklinde kurşun kristalleri oluşuyor.', Fe: 'Metalin yüzeyinde koyu renkli demir birikiyor.', Zn: 'Metalin yüzeyinde gri çinko birikiyor.' }[N.m];
    if (N.m === 'Ag' && p.m !== 'Cu') gz = 'Metalin yüzeyinde gri-gümüş renkli kristaller oluşuyor.';
    return olay('metal', 'Yer değiştirme: ' + M.ad + ' → ' + METAL[N.m].ad + ' açığa çıktı', gz,
      { net: net, denklem: mol, aciklama: M.ad + ' (' + p.m + '), ' + METAL[N.m].ad.toLowerCase() + ' (' + N.m + ') metalinden daha aktiftir. Elektron vererek çözeltiye geçer; ' + KAT[N.k].ad + ' iyonları bu elektronları alarak metal hâline indirgenir.',
        konu: '12. sınıf · Metallerin aktifliği', renk: METAL[N.m].renk });
  }
  function hizliKurallar(kap, r, dt, D) {
    var V = kap.V, f = Math.pow(2, (kap.T - 25) / 10), n = kap.n, dx;
    /* H2O2 bozunması (katalizörlü) */
    if (n.H2O2 > 1e-9) {
      var H = n.H2O2 / V, I = r.a.I || 0, fe3 = r.m.Fe3 ? r.m.Fe3.serbest : 0, cu = r.m.Cu ? r.m.Cu.serbest : 0;
      var mno2 = (kap.ek.mno2 || 0) / V, maya = (kap.ek.maya || 0) * (kap.ek.mayaAktif === undefined ? 1 : kap.ek.mayaAktif) / V;
      var kI = (r.pH > 4.5 ? 0.4 : 0.03) * I, kk = 2e-6 + kI + 0.3 * fe3 + 0.01 * cu + 0.03 * mno2 + 0.012 * maya;
      dx = Math.min(n.H2O2 * 0.5, kk * H * Math.min(f, 6) * V * dt);
      if (dx > 1e-12) {
        n.H2O2 -= dx; topla(D.gaz, 'O2', dx / 2); D.q += 98.2 * dx;
        var kat = kI >= Math.max(0.03 * mno2, 0.012 * maya, 0.3 * fe3) ? 'KI (I⁻ iyonu)' : (0.03 * mno2 >= 0.012 * maya ? 'MnO₂' : (0.012 * maya > 0.3 * fe3 ? 'maya (katalaz enzimi)' : 'Fe³⁺ iyonu'));
        if (episod(kap, 'o2', dx / dt, 3e-6)) {
          var kp = (n.Sab || 0) > 0.2;
          D.L.push(olay('gaz', 'H₂O₂ hızla bozunuyor: O₂ gazı' + (kp ? ' ve köpük' : ''),
            kp ? 'Kabarcıklar deterjanın içinde tutuldu; köpük hızla yükseliyor' + (n.H2O2 / V > 3 ? ', kabı aşıp taşıyor. Kap ısınıyor ve buhar çıkıyor (fil diş macunu).' : '.') : 'Bol miktarda gaz kabarcığı çıkıyor; kap ısınıyor.',
            { net: '2H₂O₂(suda) → 2H₂O(s) + O₂(g)', katalizor: kat,
              aciklama: 'Hidrojen peroksit kendiliğinden çok yavaş bozunur. Katalizör (' + kat + ') tepkimenin aktifleşme enerjisini düşürerek hızlandırır; kendisi tepkimeden değişmeden çıkar. Tepkime ekzotermiktir.',
              konu: '11. sınıf · Tepkime hızı (katalizör)', gaz: 'O2' }));
        }
      }
      /* Asitli ortamda iyodürün iyota yükseltgenmesi */
      if (I > 1e-6 && r.h > 1e-4 && n.H2O2 > 1e-9) {
        dx = Math.min(n.H2O2 * 0.5, 0.4 * I * V, 10 * (0.0115 + 0.17 * r.h) * (n.H2O2 / V) * I * V * dt * f);
        if (dx > 1e-12) {
          n.H2O2 -= dx; n.I -= 2 * dx; topla(n, 'I2', dx); D.q += 247 * dx; D.degisti = true;
          if (episod(kap, 'iyot', dx / dt, 2e-7)) D.L.push(olay('renk', 'İyot oluşuyor: çözelti kahverengileşiyor', (n.Nis > 0 ? 'Nişasta olduğu için çözelti laciverte dönüyor.' : 'Renksiz çözelti önce sarıya, sonra kahverengiye dönüyor.'),
            { net: 'H₂O₂(suda) + 2I⁻(suda) + 2H⁺(suda) → I₂(suda) + 2H₂O(s)', aciklama: 'Asidik ortamda H₂O₂, iyodür iyonlarını iyota yükseltger. Oluşan iyot çözeltiye kahverengi renk verir.', konu: '12. sınıf · Redoks tepkimeleri' }));
        }
      }
      /* Fe2+ → Fe3+ */
      if (r.m.Fe2 && r.m.Fe2.serbest > 1e-6 && n.H2O2 > 1e-9) {
        dx = Math.min(n.H2O2 * 0.5, 0.4 * r.m.Fe2.serbest * V / 2, 5 * (n.H2O2 / V) * r.m.Fe2.serbest * V * dt * f);
        if (dx > 1e-12) {
          n.H2O2 -= dx; n.Fe2 -= 2 * dx; topla(n, 'Fe3', 2 * dx); D.q += 150 * dx; D.degisti = true;
          if (episod(kap, 'fe2ox', dx / dt, 2e-7)) D.L.push(olay('renk', 'Fe²⁺ → Fe³⁺: renk sarıya dönüyor', 'Soluk yeşil çözelti sarı-turuncuya dönüyor.',
            { net: 'H₂O₂(suda) + 2Fe²⁺(suda) + 2H⁺(suda) → 2Fe³⁺(suda) + 2H₂O(s)', aciklama: 'H₂O₂ yükseltgendir: Fe²⁺ iyonlarından elektron alır.', konu: '12. sınıf · Redoks tepkimeleri' }));
        }
      }
    }
    if (kap.ek.maya && kap.T > 55) kap.ek.mayaAktif = (kap.ek.mayaAktif === undefined ? 1 : kap.ek.mayaAktif) * Math.exp(-dt * (kap.T - 55) / 15);
    /* C vitamini + iyot */
    if (n.I2 > 1e-10 && n.Vit > 1e-10) {
      dx = Math.min(n.I2, n.Vit, 1e3 * (n.I2 / V) * (n.Vit / V) * V * dt + 1e-9);
      n.I2 -= dx; n.Vit -= dx; topla(n, 'Dhs', dx); topla(n, 'I', 2 * dx); D.q += 50 * dx; D.degisti = true;
      if (episod(kap, 'vitc', dx / dt, 1e-8)) D.L.push(olay('renk', 'C vitamini iyotu harcadı', 'İyotun rengi (ve nişasta varsa lacivert renk) kayboluyor.',
        { net: 'C₆H₈O₆(suda) + I₂(suda) → C₆H₆O₆(suda) + 2H⁺(suda) + 2I⁻(suda)', aciklama: 'Askorbik asit (C vitamini) bir indirgendir: iyotu (I₂) renksiz iyodür iyonlarına (I⁻) indirger, kendisi yükseltgenir. Bu yöntemle meyve sularındaki C vitamini ölçülebilir.', konu: '12. sınıf · Redoks tepkimeleri' }));
    }
    /* Permanganat */
    var mn = r.a.MnO4 || 0;
    if (mn > 1e-7) {
      if (n.H2O2 > 1e-9) {
        var asitli = r.h > 1e-2;
        dx = Math.min(n.MnO4 * 0.9, n.H2O2 / 2.5, (asitli ? 50 : 20) * mn * (n.H2O2 / V) * V * dt + 1e-10);
        if (dx > 1e-12) {
          n.MnO4 -= dx; D.degisti = true;
          if (asitli) { topla(n, 'Mn', dx); n.H2O2 -= 2.5 * dx; topla(D.gaz, 'O2', 1.25 * dx); D.q += 345 * dx; }
          else { topla(kap.ek, 'mno2', dx * 86.9); n.H2O2 -= 1.5 * dx; topla(D.gaz, 'O2', 0.75 * dx); D.q += 200 * dx; }
          if (episod(kap, 'mno4h', dx / dt, 1e-8)) D.L.push(olay('renk', asitli ? 'Permanganat H₂O₂ ile renksizleşti' : 'Permanganat kahverengi MnO₂’ye dönüştü',
            asitli ? 'Mor renk kayboluyor, gaz kabarcıkları çıkıyor.' : 'Mor renk kahverengi bulanıklığa dönüşüyor, gaz çıkıyor.',
            { net: asitli ? '2MnO₄⁻(suda) + 5H₂O₂(suda) + 6H⁺(suda) → 2Mn²⁺(suda) + 5O₂(g) + 8H₂O(s)' : '2MnO₄⁻(suda) + 3H₂O₂(suda) → 2MnO₂(k) + 3O₂(g) + 2OH⁻(suda) + 2H₂O(s)',
              aciklama: 'MnO₄⁻ güçlü bir yükseltgendir. ' + (asitli ? 'Asidik ortamda Mn²⁺ iyonuna (renksiz) indirgenir.' : 'Nötr ya da bazik ortamda MnO₂’ye (kahverengi katı) indirgenir.'), konu: '12. sınıf · Redoks tepkimeleri', gaz: 'O2' }));
        }
      }
      if (r.m.Fe2 && r.m.Fe2.serbest > 1e-7 && r.h > 1e-3) {
        dx = Math.min(n.MnO4 * 0.95, r.m.Fe2.serbest * V / 5 * 0.95, 1e3 * mn * r.m.Fe2.serbest * V * dt + 1e-10);
        if (dx > 1e-12) {
          n.MnO4 -= dx; topla(n, 'Mn', dx); n.Fe2 -= 5 * dx; topla(n, 'Fe3', 5 * dx); D.q += 620 * dx; D.degisti = true;
          if (episod(kap, 'mno4fe', dx / dt, 1e-9)) D.L.push(olay('renk', 'Permanganat Fe²⁺ ile renksizleşti', 'Eklenen mor damlalar karıştırınca renksizleşiyor.',
            { net: 'MnO₄⁻(suda) + 5Fe²⁺(suda) + 8H⁺(suda) → Mn²⁺(suda) + 5Fe³⁺(suda) + 4H₂O(s)', aciklama: 'Fe²⁺ iyonları biter bitmez ilk fazla permanganat damlası çözeltiyi pembeye boyar; böylece dönüm noktası göstergesiz anlaşılır.', konu: '12. sınıf · Redoks tepkimeleri' }));
        }
      }
      if ((r.a.Cl || 0) > 3 && r.h > 3) {
        dx = Math.min(n.MnO4 * 0.9, 0.5 * mn * V * dt + 1e-10);
        if (dx > 1e-12) {
          n.MnO4 -= dx; topla(n, 'Mn', dx); n.Cl -= 5 * dx; topla(D.gaz, 'Cl2', 2.5 * dx); D.degisti = true;
          if (episod(kap, 'mno4cl', dx / dt, 1e-9)) D.L.push(klorOlayi('2MnO₄⁻(suda) + 10Cl⁻(suda) + 16H⁺(suda) → 2Mn²⁺(suda) + 5Cl₂(g) + 8H₂O(s)'));
        }
      }
    }
    /* Çamaşır suyu + asit → Cl2 */
    var hocl = r.z.OCl ? r.z.OCl.Cd * r.z.OCl.a[0] : 0, cl = r.a.Cl || 0;
    if (hocl > 1e-6 && cl > 1e-4 && r.h > 1e-5) {
      dx = Math.min(0.5 * hocl * V, 0.5 * cl * V, 0.4 * r.h * V, 40 * hocl * r.h * cl * V * dt);
      if (dx > 1e-12) {
        n.OCl -= dx; n.Cl -= dx; topla(D.gaz, 'Cl2', dx); D.degisti = true;
        if (episod(kap, 'cl2', dx / dt, 2e-7)) D.L.push(klorOlayi('OCl⁻(suda) + Cl⁻(suda) + 2H⁺(suda) → Cl₂(g) + H₂O(s)', molekuler(['NaOCl', 'HCl'], ['NaCl', 'Cl2', 'H2O'])));
      }
    }
    /* Çamaşır suyu + amonyak → kloramin */
    var ocl = r.z.OCl ? r.z.OCl.Cd : 0, nh3f = r.z.NH3 ? r.z.NH3.Cd * r.z.NH3.a[1] : 0;
    if (ocl > 1e-5 && nh3f > 1e-5) {
      dx = Math.min(0.5 * ocl * V, 0.5 * nh3f * V, 5 * ocl * nh3f * V * dt);
      if (dx > 1e-12) {
        n.OCl -= dx; n.NH3 -= dx; topla(D.gaz, 'NH2Cl', dx * 0.5); D.degisti = true;
        if (episod(kap, 'nh2cl', dx / dt, 2e-7)) D.L.push(olay('tehlike', 'TEHLİKE: Zehirli kloramin oluştu!', 'Çamaşır suyu ile amonyak karıştı; göz yaşartıcı, boğucu kokulu zehirli buhar çıkıyor.',
          { net: 'NH₃(suda) + OCl⁻(suda) → NH₂Cl(suda) + OH⁻(suda)', aciklama: 'Kloramin (NH₂Cl) solunum yollarına ciddi zarar verir. Temizlik ürünleri asla birbirine karıştırılmaz; ortam havalandırılır.', konu: 'Laboratuvar güvenliği', seviye: 'tehlike', gaz: 'NH2Cl' }));
      }
    }
    /* Tiyosülfat + asit → kükürt (tepkime hızı) */
    var s2 = r.a.S2O3 || 0;
    if (s2 > 1e-5 && r.h > 1e-4) {
      if (kap.tiyo < 0) { kap.tiyo = 0; kap.tiyoT0 = kap.zaman; kap.tiyoBitti = false; }
      var hz = s2 * Math.sqrt(r.h) * f;
      kap.tiyo += hz * dt / 1.0;
      if (kap.tiyo >= 1) {
        dx = Math.min(0.5 * s2 * V, 0.03 * hz * V * dt);
        n.S2O3 -= dx; topla(n, 'S', dx); topla(D.gaz, 'SO2', dx); D.degisti = true;
        if (!kap.tiyoBitti && (n.S || 0) / V > 3e-3) {
          kap.tiyoBitti = true;
          D.L.push(olay('cokelme', 'Bulanıklık: ' + tr(kap.zaman - kap.tiyoT0, 0) + ' saniyede kükürt oluştu', 'Çözelti sarımsı beyaz renkte bulanıklaştı; kabın altındaki “X” işareti artık görünmüyor.',
            { net: 'S₂O₃²⁻(suda) + 2H⁺(suda) → S(k) + SO₂(g) + H₂O(s)', denklem: molekuler(['Na2S2O3', 'HCl'], ['NaCl', 'S', 'SO2', 'H2O']), sure: kap.zaman - kap.tiyoT0,
              aciklama: 'Bulanıklığın görülme süresi tepkime hızının bir ölçüsüdür. Derişim ya da sıcaklık artınca tanecikler daha sık ve daha enerjik çarpışır, süre kısalır (yaklaşık her 10 °C’de hız iki katına çıkar).', konu: '11. sınıf · Tepkime hızı', renk: '#F2E9B5' }));
        }
      }
    } else if (kap.tiyo >= 0 && !(s2 > 1e-5)) kap.tiyo = -1;
    /* Şeker + derişik sülfürik asit */
    if (n.Seker > 1e-7 && kap.dilN > 0 && kap.dilN / Math.max(V, 1e-6) > 10) {
      kap.sekerT += dt;
      if (kap.sekerT > 3) {
        dx = Math.min(n.Seker, (0.12 * n.Seker + 2e-5) * dt * f);
        n.Seker -= dx; topla(n, 'C', 12 * dx); kap.V += 11 * 0.018 * dx; D.q += 450 * dx; topla(D.gaz, 'SO2', 0.3 * dx); kap.buhar = 1;
        if (episod(kap, 'seker', 1, 0.5)) D.L.push(olay('tehlike', 'Şeker kömürleşiyor', 'Beyaz şeker önce sarardı, sonra karardı; siyah, gözenekli bir karbon sütunu buhar çıkararak yükseliyor. Keskin bir koku (SO₂) var.',
          { net: 'C₁₂H₂₂O₁₁(k) → 12C(k) + 11H₂O(g)   (derişik H₂SO₄)', aciklama: 'Derişik sülfürik asit su çekicidir: şekerin yapısındaki hidrojen ve oksijeni su olarak koparır, geriye karbon kalır. Açığa çıkan ısı suyu buharlaştırır ve karbonu köpürtür.', konu: 'Laboratuvar güvenliği · Derişik asitler', seviye: 'uyari' }));
      }
    }
  }
  function klorOlayi(net, mol) {
    return olay('tehlike', 'TEHLİKE: Zehirli klor gazı çıktı!', 'Sarı-yeşil, boğucu kokulu bir gaz kabın ağzından yayılıyor.',
      { net: net, denklem: mol || null, aciklama: 'Klor gazı (Cl₂) solunum yollarını ve gözleri yakar. Çamaşır suyu (NaOCl) tuz ruhu (HCl) gibi asitlerle asla karıştırılmaz. Evde de temizlik ürünleri birbirine karıştırılmamalıdır.', konu: 'Laboratuvar güvenliği', seviye: 'tehlike', gaz: 'Cl2' });
  }
  function gazCikisi(kap, r, dt, D) {
    var V = kap.V, T = kap.T, n = kap.n, dx;
    if (r.z.CO3 && n.CO3 > 1e-10) {
      var co2 = r.z.CO3.Cd * r.z.CO3.a[0], kh = 0.034 * Math.exp(2400 * (1 / (T + TK) - 1 / 298.15)), hiz = 0;
      if (co2 > kh) hiz = (1.2 + (kap.karistir > 0 ? 2 : 0)) * (co2 - kh) * V;
      else if (T > 35) hiz = 0.012 * (T - 25) / 25 * co2 * V;
      dx = Math.min(hiz * dt, 0.8 * co2 * V, n.CO3);
      if (dx > 1e-12) {
        n.CO3 -= dx; topla(D.gaz, 'CO2', dx); D.q -= 19.4 * dx; D.degisti = true;
        if (episod(kap, 'co2', dx / dt, 2e-6)) D.L.push(co2Olayi(kap));
      }
    }
    if (r.z.NH3 && n.NH3 > 1e-10) {
      var nf = r.z.NH3.Cd * r.z.NH3.a[1], k = 2e-4 * Math.pow(2, (T - 25) / 8);
      dx = Math.min(nf * V * 0.5, k * nf * V * dt);
      if (dx > 1e-12) {
        n.NH3 -= dx; topla(D.gaz, 'NH3', dx); D.q -= 34 * dx; D.degisti = true;
        if (episod(kap, 'nh3', dx / dt, 3e-6)) {
          var am = kaynak(kap, 'NH3', function (K) { return K.id === 'nh4cl'; }), B = bazKaynak(kap);
          D.L.push(olay('gaz', 'Keskin koku: NH₃ gazı çıkıyor', T > 50 ? 'Isıtınca kabın ağzından keskin kokulu amonyak gazı çıkmaya başladı.' : 'Kabın ağzında keskin bir amonyak kokusu var.',
            { net: am && B && B.iy && B.iy.a === 'OH' ? 'NH₄⁺(suda) + OH⁻(suda) → NH₃(g) + H₂O(s)' : 'NH₃(suda) → NH₃(g)',
              denklem: am && B && B.iy && B.iy.a === 'OH' ? molekuler(['NH4Cl', B.f], [bilesik(B.iy.k, 'Cl'), 'NH3', 'H2O'], { NH3: 'g' }) : null,
              aciklama: 'Amonyum tuzları kuvvetli bazlarla ısıtılınca amonyak gazı açığa çıkar. Islak kırmızı turnusol kâğıdını maviye çevirir. Bu, NH₄⁺ iyonunun tanınma testidir.', konu: '10. sınıf · Asitler, bazlar ve tuzlar', gaz: 'NH3' }));
        }
      }
    }
  }
  function co2Olayi(kap) {
    var B = null, A = asitKaynak(kap), en = 0;
    for (var id in kap.kay.CO3 || {}) if (kap.kay.CO3[id] > en) { en = kap.kay.CO3[id]; B = KIMI[id]; }
    var net = 'CO₃²⁻(suda) + 2H⁺(suda) → H₂O(s) + CO₂(g)', mol = null, gz = 'Çözeltide köpürme: bol miktarda gaz kabarcığı çıkıyor.';
    if (B && B.id === 'soda') { net = 'H₂CO₃(suda) → H₂O(s) + CO₂(g)'; gz = 'Çözünmüş CO₂ kabarcıklar hâlinde çıkıyor.'; }
    else if (B && B.iy && B.iy.a === 'HCO3') { net = 'HCO₃⁻(suda) + H⁺(suda) → H₂O(s) + CO₂(g)'; if (A && A.iy) mol = molekuler([B.f, A.f], [bilesik(B.iy.k, A.iy.a), 'H2O', 'CO2']); }
    else if (B && B.id === 'mermer') { net = 'CaCO₃(k) + 2H⁺(suda) → Ca²⁺(suda) + H₂O(s) + CO₂(g)'; if (A && A.iy) mol = molekuler(['CaCO3', A.f], [bilesik('Ca', A.iy.a), 'H2O', 'CO2'], { CaCO3: 'k' }); gz = 'Mermer tozu köpürerek çözünüyor.'; }
    else if (B && B.iy) { if (A && A.iy) mol = molekuler([B.f, A.f], [bilesik(B.iy.k, A.iy.a), 'H2O', 'CO2']); }
    return olay('gaz', 'CO₂ gazı çıkıyor', gz, { net: net, denklem: mol, aciklama: B && B.id === 'soda' ? 'Gazların sudaki çözünürlüğü basınç azaldıkça ve sıcaklık arttıkça azalır; fazla CO₂ gaz olarak ayrılır.' : 'Karbonatlar ve hidrojen karbonatlar asitlerle karbonik asit oluşturur; karbonik asit kararsızdır, su ve CO₂ gazına ayrışır. CO₂ kireç suyunu bulandırır.', konu: '10. sınıf · Asitler, bazlar ve tuzlar', gaz: 'CO2' });
  }

  /* ================= 9. TESTLER VE İÇERİK ================= */
  var GAZ = {
    H2: { ad: 'Hidrojen (H₂)', test: 'Kabın ağzına yanan bir kibrit tuttun.', sonuc: 'Hafif bir “pıt” sesi duyuldu: hidrojen gazı yandı.', net: '2H₂(g) + O₂(g) → 2H₂O(s)' },
    O2: { ad: 'Oksijen (O₂)', test: 'Kor hâlindeki tahta çubuğu kabın ağzına tuttun.', sonuc: 'Çubuk yeniden alevlendi: oksijen yanmayı destekler.', net: 'C(k) + O₂(g) → CO₂(g)' },
    CO2: { ad: 'Karbon dioksit (CO₂)', test: 'Yanan kibriti kabın ağzına tuttun, sonra gazı kireç suyundan geçirdin.', sonuc: 'Kibrit söndü. Kireç suyu bulanıklaştı (CaCO₃ oluştu).', net: 'CO₂(g) + Ca(OH)₂(suda) → CaCO₃(k) + H₂O(s)' },
    NH3: { ad: 'Amonyak (NH₃)', test: 'Islak kırmızı turnusol kâğıdını kabın ağzına tuttun.', sonuc: 'Kâğıt maviye döndü. Derişik HCl şişesinin ağzı yaklaşınca beyaz duman (NH₄Cl) oluştu.', net: 'NH₃(g) + HCl(g) → NH₄Cl(k)' },
    Cl2: { ad: 'Klor (Cl₂)', test: 'Islak mavi turnusol kâğıdını uzaktan kabın ağzına tuttun.', sonuc: 'Kâğıt önce kırmızıya döndü, sonra ağardı. Gaz sarı-yeşil ve boğucu kokulu. ZEHİRLİDİR.', net: 'Cl₂(g) + H₂O(s) ⇌ HCl(suda) + HOCl(suda)', tehlike: 1 },
    NO2: { ad: 'Azot dioksit (NO₂)', test: 'Gazın rengine baktın.', sonuc: 'Kırmızı-kahverengi, boğucu kokulu bir gaz. ZEHİRLİDİR; çeker ocakta çalışılır.', net: '2NO₂(g) ⇌ N₂O₄(g)', tehlike: 1 },
    NO: { ad: 'Azot monoksit (NO)', test: 'Kabın ağzını gözledin.', sonuc: 'Renksiz gaz, havayla karşılaşınca kahverengi NO₂’ye dönüştü.', net: '2NO(g) + O₂(g) → 2NO₂(g)', tehlike: 1 },
    SO2: { ad: 'Kükürt dioksit (SO₂)', test: 'Permanganat emdirilmiş kâğıdı kabın ağzına tuttun.', sonuc: 'Mor kâğıt renksizleşti; keskin, boğucu bir koku var.', net: '5SO₂ + 2MnO₄⁻ + 2H₂O → 5SO₄²⁻ + 2Mn²⁺ + 4H⁺' },
    NH2Cl: { ad: 'Kloramin (NH₂Cl)', test: 'Kokuyu fark ettin.', sonuc: 'Göz yaşartıcı, boğucu bir buhar. ZEHİRLİDİR; ortam hemen havalandırılmalı.', net: 'NH₃ + OCl⁻ → NH₂Cl + OH⁻', tehlike: 1 }
  };
  function gazTesti(kap) {
    var en = null, eb = 1.5e-5;
    for (var g in kap.gazSon) if (kap.gazSon[g] > eb && GAZ[g]) { eb = kap.gazSon[g]; en = g; }
    if (!en) return { yok: true, baslik: 'Belirgin gaz çıkışı yok', sonuc: 'Son saniyelerde bu kaptan test edilecek kadar gaz çıkmadı.' };
    var G = GAZ[en];
    return { gaz: en, baslik: 'Gaz testi: ' + G.ad, test: G.test, sonuc: G.sonuc, net: G.net, tehlike: !!G.tehlike };
  }
  function alevTesti(kap) {
    var r = kap.r, w = { Na: 6, K: 1, Li: 2, Ca: 1.5, Sr: 2, Ba: 1, Cu: 1.5 }, en = null, eb = 0, k, top = 0;
    if (!r) {
      for (k in kap.n) if (w[k] && kap.n[k] * w[k] > eb) { eb = kap.n[k] * w[k]; en = k; }
    } else for (k in r.m) if (w[k] && KAT[k].alev) { var x = r.m[k].Cd * w[k]; top += x; if (x > eb) { eb = x; en = k; } }
    if (!en || eb < 1e-5) return { yok: true, renk: '#5B8DEF', baslik: 'Alev rengi değişmedi', sonuc: 'Alev mavi kaldı: kapta alevi renklendiren bir metal iyonu yok.' };
    var d = KAT[en];
    var ack = 'Isınan atomlardaki elektronlar daha yüksek enerji düzeylerine çıkar; eski düzeylerine dönerken belirli dalga boylarında ışık yayarlar. Her elementin yaydığı ışık farklı olduğu için alev rengi metal iyonunu tanımaya yarar.';
    if (en === 'Na' && top > eb * 1.05) ack += ' Sodyumun sarı ışığı çok parlaktır; az miktarda bile başka renkleri bastırabilir.';
    return { iyon: en, renk: d.alev, baslik: 'Alev rengi: ' + d.alevAd, sonuc: d.ad + ' iyonu alevi ' + d.alevAd + ' renge boyadı.', aciklama: ack };
  }
  function icerik(kap) {
    var L = [], r = kap.r, V = kap.V, k, j;
    if (r) {
      L.push({ ad: 'H⁺ (H₃O⁺)', c: r.h, tur: 'iyon' }); L.push({ ad: 'OH⁻', c: r.oh, tur: 'iyon' });
      for (k in r.m) {
        var m = r.m[k];
        L.push({ ad: KAT[k].ad, c: m.serbest, tur: 'iyon' });
        if (m.nh3 > 1e-6) L.push({ ad: { Cu: '[Cu(NH₃)₄]²⁺', Ag: '[Ag(NH₃)₂]⁺', Zn: '[Zn(NH₃)₄]²⁺' }[k] || k + '–NH₃', c: m.nh3, tur: 'iyon' });
        if (m.ohk > 1e-6) L.push({ ad: { Zn: '[Zn(OH)₄]²⁻', Al: '[Al(OH)₄]⁻', Pb: '[Pb(OH)₃]⁻', Cu: '[Cu(OH)₄]²⁻' }[k] || k + '(OH)ₙ', c: m.ohk, tur: 'iyon' });
        if (m.scn > 1e-7) L.push({ ad: 'FeSCN²⁺', c: m.scn, tur: 'iyon' });
        if (m.cl4 > 1e-6) L.push({ ad: '[CoCl₄]²⁻', c: m.cl4, tur: 'iyon' });
      }
      for (k in r.a) L.push({ ad: ANY[k].ad, c: r.a[k], tur: 'iyon' });
      for (k in r.z) { var Z = r.z[k]; for (j = 0; j < Z.a.length; j++) L.push({ ad: ZAY[k].tur[j], c: Z.Cd * Z.a[j], tur: ZAY[k].z0 - j === 0 ? 'molekul' : 'iyon' }); }
    }
    if (V > 2e-6) for (k in MOL) if (kap.n[k] > 1e-12 && k !== 'S' && k !== 'C' && k !== 'Sab' && k !== 'Nis') L.push({ ad: MOL[k], c: kap.n[k] / V, tur: 'molekul' });
    L = L.filter(function (x) { return x.c > 1e-7; }).sort(function (a, b) { return b.c - a.c; });
    var K = [];
    if (r) for (k in r.cokM) if (r.cokM[k] * V > 1e-8) K.push({ ad: alt(CKI[k].f) + '(k) · ' + CKI[k].ad, n: r.cokM[k] * V, tur: 'kati' });
    if (kap.n.S > 1e-8) K.push({ ad: 'S(k) · kükürt (koloit)', n: kap.n.S, tur: 'kati' });
    if (kap.n.C > 1e-8) K.push({ ad: 'C(k) · karbon', n: kap.n.C, tur: 'kati' });
    kap.metal.forEach(function (p) { K.push({ ad: METAL[p.m].ad + (p.cokme ? ' (açığa çıkan)' : (p.toz ? ' tozu' : '')), n: p.n, g: p.n * METAL[p.m].MA, tur: 'metal' }); });
    if (kap.ek.mno2) K.push({ ad: 'MnO₂(k) · katalizör', g: kap.ek.mno2, tur: 'kati' });
    if (kap.ek.maya) K.push({ ad: 'Maya' + ((kap.ek.mayaAktif || 1) < 0.3 ? ' (etkisiz)' : ''), g: kap.ek.maya, tur: 'kati' });
    if (!(V > 2e-6)) {
      var kuru = [];
      for (k in kap.n) if (kap.n[k] > 1e-9 && (KAT[k] || ANY[k] || ZAY[k] || MOL[k])) kuru.push(k);
      if (kuru.length) K.push({ ad: 'Katı karışım (' + kuru.map(function (x) { return (KAT[x] && KAT[x].ad) || (ANY[x] && ANY[x].ad) || (ZAY[x] && ZAY[x].tur[ZAY[x].tur.length - 1]) || MOL[x]; }).join(', ') + ')', tur: 'kati' });
    }
    var G = [];
    for (k in kap.gos) if (kap.gos[k] > 0) G.push({ ad: GOS[k].ad, tur: 'gosterge', renk: r ? GOS[k].sinif(r.pH) : '' });
    return { cozunen: L, kati: K, gosterge: G };
  }

  /* Titrasyon için hızlı ekleme (olay üretmez) */
  function damla(kap, id, v) {
    var K = KIMI[id];
    if (!K || !(v > 0)) return;
    var H0 = kap.H + stokEntalpi(K) * v, k;
    for (k in K.bil) { var nn = K.bil[k] * v; topla(kap.n, k, nn); if (!kap.kay[k]) kap.kay[k] = {}; topla(kap.kay[k], id, nn); }
    if (K.gos) topla(kap.gos, K.gos, v * K.birim);
    var C0 = 4184 * kap.V + 40, Ce = 4184 * v;
    kap.T = (C0 * kap.T + Ce * 25) / (C0 + Ce);
    kap.V += v;
    dengele(kap);
    var H1 = entalpi(kap.r, kap.V);
    isiVer(kap, H0 - H1); kap.H = H1;
  }

  var API = {
    KIM: KIM, KIMI: KIMI, GHS: GHS, GOS: GOS, KAT: KAT, ANY: ANY, ZAY: ZAY, CK: CK, CKI: CKI, METAL: METAL, GAZ: GAZ,
    Kap: Kap, ekle: ekle, aktar: aktar, adim: adim, dengele: dengele, damla: damla, renk: renk, iletkenlik: iletkenlik,
    icerik: icerik, gazTesti: gazTesti, alevTesti: alevTesti, ozet: ozet, coz: coz, entalpi: entalpi, gosGecirgen: gosGecirgen,
    yaz: { alt: alt, tr: tr, bilimsel: bilimsel, derisim: derisim, molYaz: molYaz }, denklestir: denklestir, bilesik: bilesik, pKw: pKw
  };
  kok.LabMotor = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : this);
