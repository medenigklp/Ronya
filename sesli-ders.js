/* ============================================================
   SESLİ DERS — tahtaya yazarak sesli konu anlatımı ve soru çözümü
   Ronya ve kimyamed için ortak modül (tek dosya, bağımlılık yok).

   Kullanım
     sayfanın sonuna: script etiketiyle sesli-ders.js (defer olabilir)
     SesliDers.yerlestir(kapsayici, { dersler: SesliDers.dersler, varsayilan: 'konu', metin: true });
     SesliDers.ac(ders);                 // tam ekran pencerede tek ders
     SesliDers.sorudanDers(soruKarti);   // kimyamed .soru kartından ders
     SesliDers.parcalardanDers({ baslik, soru: [html], siklar: [html], cozum: [html], cevap: html });

   kimyamed modüllerinde her .soru kartına "Sesli anlat" düğmesi kendiliğinden eklenir.
   Sesler: cihazın Türkçe sesleri ya da öğretmenin kendi kaydı (kayıt stüdyosu).
   Öğretmen kayıtları sitede sesli/liste.json ile yayımlanırsa bütün öğrenciler duyar.
   ============================================================ */
(function () {
  'use strict';
  if (window.SesliDers) return;

  /* ================= yardımcılar ================= */
  var AZ = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  // Öğretmen kayıtları betiğin yanındaki sesli/ klasöründe yayımlanır
  var BETIK_DIZIN = ((document.currentScript && document.currentScript.src) || '').replace(/[?#].*$/, '').replace(/[^\/]*$/, '');
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function tween(ms, fn) {
    return new Promise(function (res) {
      if (AZ || ms <= 0) { fn(1); res(); return; }
      var t0 = performance.now();
      (function adim(now) {
        var t = Math.min(1, (now - t0) / ms);
        fn(t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
        if (t < 1) requestAnimationFrame(adim); else res();
      })(t0);
    });
  }
  function karistir(a, b, t) {
    var pa = [1, 3, 5].map(function (i) { return parseInt(a.substr(i, 2), 16); });
    var pb = [1, 3, 5].map(function (i) { return parseInt(b.substr(i, 2), 16); });
    return '#' + pa.map(function (v, i) { var x = Math.round(v + (pb[i] - v) * t).toString(16); return x.length < 2 ? '0' + x : x; }).join('');
  }
  var depo = {
    al: function (k, d) { try { var v = localStorage.getItem('sesliDers.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    yaz: function (k, v) { try { localStorage.setItem('sesliDers.' + k, JSON.stringify(v)); } catch (e) {} }
  };
  function ozet(s) { // FNV-1a: cümleye bağlı kayıt anahtarı
    var h = 0x811c9dc5;
    s = String(s).replace(/\s+/g, ' ').trim();
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul ? Math.imul(h, 16777619) >>> 0 : (h * 16777619) >>> 0; }
    return ('0000000' + h.toString(16)).slice(-8);
  }
  function gurultu(boyut, oran, alfa) { // tebeşir dokusu için noktalı desen
    try {
      var c = document.createElement('canvas'); c.width = c.height = boyut;
      var x = c.getContext('2d'), im = x.createImageData(boyut, boyut);
      for (var i = 0; i < im.data.length; i += 4) {
        var del = Math.random() < oran;
        im.data[i] = im.data[i + 1] = im.data[i + 2] = 255;
        im.data[i + 3] = alfa == null ? (del ? 0 : 255) : (del ? alfa : 0);
      }
      x.putImageData(im, 0, 0);
      return c.toDataURL('image/png');
    } catch (e) { return ''; }
  }
  function b64(buf) {
    var bytes = new Uint8Array(buf), parca = 0x8000, s = '';
    for (var i = 0; i < bytes.length; i += parca) s += String.fromCharCode.apply(null, bytes.subarray(i, i + parca));
    return btoa(s);
  }

  /* ================= kayıt deposu (tarayıcıda) ve yayımlanmış kayıtlar ================= */
  var Kayitlar = {
    db: null,
    ac: function () {
      var self = this;
      if (this.db) return Promise.resolve(this.db);
      return new Promise(function (res, rej) {
        try {
          var r = indexedDB.open('sesliDers', 1);
          r.onupgradeneeded = function () { r.result.createObjectStore('kayit'); };
          r.onsuccess = function () { self.db = r.result; res(self.db); };
          r.onerror = function () { rej(r.error); };
        } catch (e) { rej(e); }
      });
    },
    islem: function (mod, fn) {
      return this.ac().then(function (db) {
        return new Promise(function (res, rej) {
          var tx = db.transaction('kayit', mod), st = tx.objectStore('kayit'), sonuc, r = fn(st);
          if (r) r.onsuccess = function () { sonuc = r.result; };
          tx.oncomplete = function () { res(sonuc); };
          tx.onerror = function () { rej(tx.error); };
        });
      });
    },
    al: function (k) { return this.islem('readonly', function (st) { return st.get(k); }).catch(function () { return null; }); },
    koy: function (k, v) { return this.islem('readwrite', function (st) { return st.put(v, k); }); },
    sil: function (k) { return this.islem('readwrite', function (st) { return st.delete(k); }).catch(function () {}); }
  };
  var Yayin = {
    harita: {}, soz: null,
    yukle: function (taban) {
      var self = this;
      if (this.soz) return this.soz;
      if (!window.fetch || /^(file|blob|data):/.test(location.protocol)) return (this.soz = Promise.resolve());
      this.soz = fetch(taban + 'liste.json', { cache: 'no-cache' })
        .then(function (r) { if (!r.ok) throw new Error('liste yok'); return r.json(); })
        .then(function (l) {
          var adlar = Array.isArray(l) ? l : (l.paketler || []);
          return Promise.all(adlar.map(function (ad) { return fetch(taban + ad).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); }));
        })
        .then(function (paketler) { (paketler || []).forEach(function (p) { if (p && p.kayitlar) Object.keys(p.kayitlar).forEach(function (h) { self.harita[h] = p.kayitlar[h]; }); }); })
        .catch(function () {});
      return this.soz;
    },
    al: function (h) { return this.harita[h] || null; }
  };

  /* ================= kimya: formül tanıma, yazım ve okunuş ================= */
  var SEMBOL_SET = {};
  ('H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu')
    .split(' ').forEach(function (s) { SEMBOL_SET[s] = 1; });
  var KATYON = { H: 'hidrojen', Li: 'lityum', Na: 'sodyum', K: 'potasyum', Rb: 'rubidyum', Cs: 'sezyum', Ag: 'gümüş', NH4: 'amonyum', Mg: 'magnezyum', Ca: 'kalsiyum', Sr: 'stronsiyum', Ba: 'baryum', Zn: 'çinko', Al: 'alüminyum', Pb: 'kurşun', Cu: 'bakır', Fe: 'demir', Hg: 'cıva', Sn: 'kalay', Mn: 'mangan', Ni: 'nikel', Co: 'kobalt', Cr: 'krom', Cd: 'kadmiyum', Au: 'altın', Pt: 'platin', Be: 'berilyum' };
  var DEGISKEN = { Pb: 1, Cu: 1, Fe: 1, Hg: 1, Sn: 1, Mn: 1, Ni: 1, Co: 1, Cr: 1, Au: 1 };
  var ANYON = { F: ['florür', 1], Cl: ['klorür', 1], Br: ['bromür', 1], I: ['iyodür', 1], O: ['oksit', 2], S: ['sülfür', 2], N: ['nitrür', 3], OH: ['hidroksit', 1], NO3: ['nitrat', 1], NO2: ['nitrit', 1], SO4: ['sülfat', 2], SO3: ['sülfit', 2], CO3: ['karbonat', 2], HCO3: ['bikarbonat', 1], PO4: ['fosfat', 3], CH3COO: ['asetat', 1], MnO4: ['permanganat', 1], Cr2O7: ['dikromat', 2], CrO4: ['kromat', 2], CN: ['siyanür', 1], ClO3: ['klorat', 1], HSO4: ['bisülfat', 1] };
  var MOLEKUL = { H2O: 'su', CO2: 'karbondioksit', CO: 'karbonmonoksit', NH3: 'amonyak', HCl: 'hidroklorik asit', HF: 'hidroflorik asit', HBr: 'hidrobromik asit', HI: 'hidrojen iyodür', I2: 'iyot', Br2: 'brom', F2: 'flor gazı', P4: 'fosfor', S8: 'kükürt', H2S: 'hidrojen sülfür', CS2: 'karbon disülfür', PCl5: 'fosfor pentaklorür', PCl3: 'fosfor triklorür', NOCl: 'nitrozil klorür', COCl2: 'fosgen', CaCO3: 'kalsiyum karbonat', CaO: 'kalsiyum oksit', N2O5: 'diazot pentoksit', N2O: 'diazot monoksit', C2H4: 'eten', C2H2: 'etin', C4H10: 'bütan', CH3OH: 'metanol', C12H22O11: 'sakkaroz', H2SO4: 'sülfürik asit', HNO3: 'nitrik asit', H3PO4: 'fosforik asit', H2CO3: 'karbonik asit', CH3COOH: 'asetik asit', CH4: 'metan', C2H6: 'etan', C3H8: 'propan', C2H5OH: 'etanol', C6H12O6: 'glikoz', O2: 'oksijen gazı', H2: 'hidrojen gazı', N2: 'azot gazı', Cl2: 'klor gazı', O3: 'ozon', H2O2: 'hidrojen peroksit', SO2: 'kükürt dioksit', SO3: 'kükürt trioksit', NO2: 'azot dioksit', NO: 'azot monoksit', N2O4: 'diazot tetroksit', NaOH: 'sodyum hidroksit', KOH: 'potasyum hidroksit' };
  var GAZ_ADI = { HCl: 'hidrojen klorür', HBr: 'hidrojen bromür', HF: 'hidrojen florür' };
  var SAYI = ['', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi'];
  var HARF = { A: 'a', B: 'be', C: 'ce', D: 'de', E: 'e', F: 'fe', G: 'ge', H: 'ha', I: 'ı', J: 'je', K: 'ke', L: 'le', M: 'me', N: 'ne', O: 'o', P: 'pe', R: 're', S: 'se', T: 'te', U: 'u', V: 've', Y: 'ye', Z: 'ze', Q: 'kü', W: 've', X: 'iks' };
  var ROMA = { 'I': 'birinci', 'II': 'ikinci', 'III': 'üçüncü', 'IV': 'dördüncü', 'V': 'beşinci', 'VI': 'altıncı' };
  var ROMA_SAYI = { 'I': 'bir', 'II': 'iki', 'III': 'üç', 'IV': 'dört', 'V': 'beş', 'VI': 'altı' };
  var BIRIM = { 'kJ': 'kilojul', 'kJ/mol': 'kilojul bölü mol', 'J': 'jul', '°C': 'derece', 'atm': 'atmosfer', 'mL': 'mililitre', 'L': 'litre', 'g': 'gram', 'mg': 'miligram', 'kg': 'kilogram', 'mol/L': 'mol bölü litre', 'g/mol': 'gram bölü mol', 'M': 'molar', 'mmHg': 'milimetre cıva', 'cm³': 'santimetreküp', 'dm³': 'desimetreküp', 'cm3': 'santimetreküp', 'dm3': 'desimetreküp', 'm3': 'metreküp', 'cm2': 'santimetrekare', 's': 'saniye', 'dk': 'dakika', 'sa': 'saat', 'K': 'kelvin', 'pm': 'pikometre', 'nm': 'nanometre', 'cmHg': 'santimetre cıva', 'torr': 'tor', 'kPa': 'kilopaskal', 'Pa': 'paskal', 'mol/dk': 'mol bölü dakika', 'mol/s': 'mol bölü saniye', 'M/s': 'molar bölü saniye', 'M/dk': 'molar bölü dakika', 'g/dk': 'gram bölü dakika', 'g/s': 'gram bölü saniye', 'mol/L·s': 'mol bölü litre saniye', 'g/mL': 'gram bölü mililitre', 'g/L': 'gram bölü litre', 'g/cm3': 'gram bölü santimetreküp', 'J/g°C': 'jul bölü gram derece', 'kcal': 'kilokalori', 'cal': 'kalori', 'mol': 'mol', 'μm': 'mikrometre', 'mm': 'milimetre', 'cm': 'santimetre', 'm': 'metre', 'km': 'kilometre', 'ppm': 'pe pe me', 'eV': 'elektronvolt', 'u': 'atomik kütle birimi', 'akb': 'atomik kütle birimi' };

  function semboller(govde) {
    var g = govde.replace(/[()\d]/g, ''), out = [], re = /[A-Z][a-z]?/g, m, son = 0;
    while ((m = re.exec(g))) { if (m.index !== son || !SEMBOL_SET[m[0]]) return null; out.push(m[0]); son = re.lastIndex; }
    return son === g.length && out.length ? out : null;
  }
  function formulCoz(tok) {
    var m = tok.match(/^(\d*)([A-Z(][A-Za-z0-9()]*?)((?:\^\{?\d*[+\-−]\}?|[+\-−])?)((?:\((?:suda|k|s|g|aq)\))?)$/);
    if (!m) return null;
    var kat = m[1], govde = m[2], yukHam = m[3].replace(/[\^{}]/g, '').replace('-', '−'), hal = m[4];
    if (/^\(/.test(govde) && !/^\(NH4\)/.test(govde)) return null;
    if ((govde.match(/\(/g) || []).length !== (govde.match(/\)/g) || []).length) return null;
    var yuk = null;
    if (yukHam) {
      var isaret = yukHam.slice(-1), basamak = yukHam.slice(0, -1);
      if (!basamak) {
        var mm = govde.match(/^(.*?)(\d)$/);
        if (mm) {
          var aday = mm[1], n = +mm[2];
          if ((/^[A-Z][a-z]?$/.test(aday) && SEMBOL_SET[aday]) || (ANYON[aday] && ANYON[aday][1] === n && isaret === '−')) { govde = aday; basamak = String(n); }
        }
      }
      yuk = { n: basamak ? +basamak : 1, isaret: isaret, yazi: (basamak && basamak !== '1' ? basamak : '') + isaret };
    }
    var sm = semboller(govde);
    if (!sm) return null;
    if (!/\d/.test(govde) && !yuk && sm.length < 2 && !MOLEKUL[govde]) return null;
    return { kat: kat, govde: govde, yuk: yuk, hal: hal };
  }
  function formulHTML(f) {
    return (f.kat || '') + f.govde.replace(/(\d+)/g, '<sub>$1</sub>') + (f.yuk ? '<sup>' + f.yuk.yazi + '</sup>' : '') + (f.hal || '');
  }
  function harfle(govde) {
    return govde.replace(/[()]/g, ' ').replace(/([A-Z])([a-z]?)/g, function (m, a, b) { return ' ' + HARF[a] + (b ? ' ' + (HARF[b.toUpperCase()] || b) : '') + ' '; })
      .replace(/(\d+)/g, ' $1 ').replace(/\s+/g, ' ').trim();
  }
  function tuzAdi(govde) {
    var m = govde.match(/^(\(NH4\)(\d*)|NH4|[A-Z][a-z]?)(\d*)(.+)$/);
    if (!m) return null;
    var kat = m[1], katSay = +(m[3] || 1), geri = m[4], an = null, anSay = 1, mm;
    if (/^\(NH4\)/.test(kat)) { katSay = +(m[2] || 1); kat = 'NH4'; }
    if (!KATYON[kat]) return null;
    if (ANYON[geri]) an = geri;
    else if ((mm = geri.match(/^\(([^)]+)\)(\d*)$/)) && ANYON[mm[1]]) { an = mm[1]; anSay = +(mm[2] || 1); }
    else if ((mm = geri.match(/^([A-Z][a-z]?)(\d*)$/)) && ANYON[mm[1]]) { an = mm[1]; anSay = +(mm[2] || 1); }
    if (!an) return null;
    var ad = KATYON[kat];
    if (DEGISKEN[kat]) { var yb = ANYON[an][1] * anSay / katSay; if (yb % 1 === 0 && SAYI[yb]) ad += ' ' + SAYI[yb]; }
    return ad + ' ' + ANYON[an][0];
  }
  function formulOku(f) {
    var ad;
    if (f.yuk) ad = KATYON[f.govde] && f.yuk.isaret === '+' ? KATYON[f.govde] + (DEGISKEN[f.govde] && SAYI[f.yuk.n] ? ' ' + SAYI[f.yuk.n] : '') + ' iyonu' : ANYON[f.govde] && f.yuk.isaret === '−' ? ANYON[f.govde][0] + ' iyonu' : harfle(f.govde) + ' iyonu';
    else if (f.hal === '(g)' && GAZ_ADI[f.govde]) ad = GAZ_ADI[f.govde];
    else ad = MOLEKUL[f.govde] || tuzAdi(f.govde) || harfle(f.govde);
    var hal = { '(suda)': ' suda', '(aq)': ' suda', '(k)': ' katı', '(s)': ' sıvı', '(g)': ' gaz' }[f.hal] || '';
    return (f.kat ? f.kat + ' ' : '') + ad + hal;
  }
  function sozcukAyir(tok) {
    var m = tok.match(/^(["“'«(]*)(.*?)([.,;:!?"”»]*)$/), on = m[1], ic = m[2], son = m[3], ek = '';
    if (on.indexOf('(') >= 0 && !/\)/.test(ic)) { /* "(NaCl" gibi */ } else if (on.indexOf('(') >= 0) { ic = on.slice(on.indexOf('(')) + ic; on = on.slice(0, on.indexOf('(')); }
    var k = ic.match(/^(.*?)['’]([a-zçğıöşü]+)$/i);
    if (k) { ic = k[1]; ek = k[2]; }
    return { on: on, ic: ic, ek: ek, son: son };
  }
  // Seslendirme metni: formülleri adlarıyla, okları ve simgeleri sözle
  var ELEMENT_AD = { H: 'hidrojen', He: 'helyum', Li: 'lityum', Be: 'berilyum', B: 'bor', C: 'karbon', N: 'azot', O: 'oksijen', F: 'flor', Ne: 'neon', Na: 'sodyum', Mg: 'magnezyum', Al: 'alüminyum', Si: 'silisyum', P: 'fosfor', S: 'kükürt', Cl: 'klor', Ar: 'argon', K: 'potasyum', Ca: 'kalsiyum', Sc: 'skandiyum', Ti: 'titanyum', V: 'vanadyum', Cr: 'krom', Mn: 'mangan', Fe: 'demir', Co: 'kobalt', Ni: 'nikel', Cu: 'bakır', Zn: 'çinko', Ga: 'galyum', Ge: 'germanyum', As: 'arsenik', Se: 'selenyum', Br: 'brom', Kr: 'kripton', Rb: 'rubidyum', Sr: 'stronsiyum', Ag: 'gümüş', Cd: 'kadmiyum', Sn: 'kalay', Sb: 'antimon', I: 'iyot', Xe: 'ksenon', Cs: 'sezyum', Ba: 'baryum', W: 'tungsten', Pt: 'platin', Au: 'altın', Hg: 'cıva', Pb: 'kurşun', Rn: 'radon', Ra: 'radyum', U: 'uranyum' };
  var KISALTMA = { Kc: 'ka ce', Kp: 'ka pe', Ka: 'ka a', Kb: 'ka be', Ksp: 'ka es pe', 'Kçç': 'ka çe çe', pH: 'pe ha', pOH: 'pe o ha', 'ΔH': 'delta ha', 'ΔH°': 'delta ha', 'Ea': 'e a', NK: 'normal koşullar', NA: 'en a', 'NŞA': 'normal şartlar altında', 'OK': 'oda koşulları' };
  var ALT_RAKAM = '₀₁₂₃₄₅₆₇₈₉', UST_RAKAM = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  function rakamCevir(s, tablo) { return s.replace(/./g, function (c) { var k = tablo.indexOf(c); return k < 0 ? c : String(k); }); }
  var HARF_SINIF = 'A-Za-zÇĞİÖŞÜçğıöşüÂâÎîÛû';
  var ON_SINIR = '(^|[^' + HARF_SINIF + '])';
  var ELEMENT_RE = Object.keys(ELEMENT_AD).sort(function (a, b) { return b.length - a.length; }).join('|');
  var RE_KUTLE = new RegExp(ON_SINIR + '(' + ELEMENT_RE + ')\\s*:\\s*(\\d+(?:,\\d+)?)', 'g');
  var RE_MOLKUTLE = new RegExp(ON_SINIR + '(' + ELEMENT_RE + ')\\s*=\\s*(\\d+(?:,\\d+)?)\\s*(g\\/mol)', 'g');
  // Tek harfli simgeler sorularda etiket olarak da kullanılır (B, C, K elementleri), bu yüzden yalnız iki harfliler ve H, N, O
  var RE_ATOMU = new RegExp(ON_SINIR + '(' + Object.keys(ELEMENT_AD).filter(function (k) { return k.length > 1 || /^[HNO]$/.test(k); }).join('|') + ')\\s+(atom|element|izotop|çekirde|metal)', 'g');
  // Seslendirme metni: formülleri adlarıyla, okları, birimleri ve simgeleri sözle
  function konusmaMetni(metin) {
    metin = String(metin).replace(/[   ]/g, ' ')
      // Unicode alt ve üst simgeler: N₂O₅ → N2O5, SO₄²⁻ → SO4^2−, 10²³ → 10 üzeri 23
      .replace(/([cdkm]?m)³/g, '$13').replace(/([cdkm]?m)²/g, '$12')
      .replace(/[₀-₉]+/g, function (m) { return rakamCevir(m, ALT_RAKAM); })
      .replace(/⁻([⁰-⁹¹²³]+)/g, function (m, r) { return ' üzeri eksi ' + rakamCevir(r, UST_RAKAM) + ' '; })
      .replace(/([⁰-⁹¹²³]*)([⁺⁻])/g, function (m, r, i) { return '^' + rakamCevir(r.replace(/¹/g, '1').replace(/²/g, '2').replace(/³/g, '3'), UST_RAKAM) + (i === '⁺' ? '+' : '−'); })
      .replace(/([⁰-⁹¹²³]+)/g, function (m) { return ' üzeri ' + rakamCevir(m.replace(/¹/g, '1').replace(/²/g, '2').replace(/³/g, '3'), UST_RAKAM) + ' '; })
      .replace(/([0-9])\s*[×x·]\s*10\s*\^\s*\{?([−-]?\d+)\}?/g, '$1 çarpı 10 üzeri $2')
      .replace(/(^|[^\d,])10\s*\^\s*\{?([−-]?\d+)\}?/g, '$110 üzeri $2 ')
      .replace(/\[([A-Za-z0-9()+\-−^]+)\]/g, ' $1 derişimi ')
      .replace(/(\d)\s*×\s*(?=\d)/g, '$1 çarpı ').replace(/(\d)·(?=\d)/g, '$1 çarpı ')
      .replace(/(\d|\))\s*÷\s*/g, '$1 bölü ').replace(/(\d|\))\s*\/\s*(?=[\d(])/g, '$1 bölü ')
      .replace(/=\s*(?:\.{3,}|…+)/g, '= kaç ').replace(/(?:\.{4,}|…{2,}|_{3,})/g, ' boşluk ')
      .replace(/(\d)\s*°\s*C\b/g, '$1 derece').replace(/(\d)\s*°/g, '$1 derece')
      .replace(/(\d+)\s*[-–]\s*(\d+)\s*(saniye|dakika|s|dk|sa)\b/g, '$1 ile $2 $3')
      .replace(/%\s*(\d+(?:[.,]\d+)?)/g, 'yüzde $1').replace(/[✔✓]/g, ' doğru ').replace(/[✘✗]/g, ' yanlış ')
      .replace(/≈/g, ' yaklaşık ').replace(/≤/g, ' küçük eşit ').replace(/≥/g, ' büyük eşit ').replace(/√/g, ' karekök ')
      .replace(RE_KUTLE, function (m, on, sym, n) { return sym === 'I' || sym === 'V' ? m : on + ELEMENT_AD[sym] + ' ' + n; })
      .replace(RE_MOLKUTLE, function (m, on, sym, n, b) { return on + ELEMENT_AD[sym] + ' ' + n + ' ' + b; })
      .replace(RE_ATOMU, function (m, on, sym, ek) { return on + ELEMENT_AD[sym] + ' ' + ek; });
    var toks = metin.split(/\s+/).filter(Boolean);
    var onceFormul = false;
    var okunus = toks.map(function (tok, i) {
      if (tok === '→' || tok === '->' || tok === '⟶') { var r = onceFormul ? 'verir,' : 'yani'; onceFormul = false; return { s: r }; }
      if (tok === '⇌' || tok === '<=>' || tok === '⇄') { onceFormul = false; return { s: 'dengede,' }; }
      if (tok === '+') return { s: 'artı' };
      if (tok === '=') return { s: 'eşittir' };
      if (tok === '·' || tok === '•' || tok === '|') return { s: ',' };
      if (tok === '×') return { s: 'çarpı' };
      if (tok === '÷' || tok === '/') return { s: 'bölü' };
      if (tok === '<') return { s: 'küçüktür' };
      if (tok === '>') return { s: 'büyüktür' };
      if (tok === '−' || tok === '-' || tok === '–') return { s: i > 0 && /[\d)]$/.test(toks[i - 1]) ? 'eksi' : ',' };
      if (tok === '—') return { s: ',' };
      if (/^\d+A$/.test(tok)) { onceFormul = false; return { s: tok.replace('A', ' A') }; }
      var rm = tok.match(/^(I{1,3}|IV|V|VI)[.)]$/);
      if (rm) return { s: ROMA[rm[1]] + ',' };
      var ry = tok.match(/^(I{1,3}|IV|V|VI)([,.;:]?)$/);
      if (ry) {
        var onceki = (toks[i - 1] || '').replace(/[,.;:]$/, ''), sonraki = (toks[i + 1] || '').replace(/[,.;:]$/, '');
        var romaKomsu = i === 0 || /^[—–:-]$/.test(toks[i + 1] || '') || /^(I{1,3}|IV|V|VI)$/.test(onceki) || /^(I{1,3}|IV|V|VI)$/.test(sonraki) || /^(ve|ile|veya|yalnız|yalniz|ya|da|de)$/i.test(onceki) || /^(ve|ile|veya|ya|da|de)$/i.test(sonraki);
        var ikiOnce = (toks[i - 2] || '').replace(/[,.;:]$/, '');
        if (ry[1] === 'I' && /^(ve|ile|veya)$/i.test(onceki) && ELEMENT_AD[ikiOnce] && !/^(I{1,3}|IV|V|VI)$/.test(ikiOnce)) return { s: 'iyot' + ry[2] };
        if (ry[1].length > 1 || romaKomsu || /[,:;]/.test(ry[2])) return { s: ROMA_SAYI[ry[1]] + ry[2] };
      }
      var sk = tok.match(/^([A-E])\)$/); if (sk) return { s: sk[1] + ' şıkkı,' };
      var mk = tok.match(/^([a-hçğı])\)$/); if (mk) return { s: mk[1] + ',' };
      var p = sozcukAyir(tok);
      if (KISALTMA[p.ic]) return { s: p.on + KISALTMA[p.ic] + (p.ek ? ' ' + p.ek : '') + p.son };
      if (BIRIM[p.ic] && ((i > 0 && (/\d$/.test(toks[i - 1]) || /^kaç$/i.test(toks[i - 1]))) || (!p.ek && /^(atm|mmHg|cmHg|mL|kJ|kPa|torr|kcal|kJ\/mol|g\/mol|mol\/L)$/.test(p.ic)))) return { s: p.on + BIRIM[p.ic] + p.son };
      var f = p.ic && formulCoz(p.ic);
      if (!f) {
        onceFormul = /\)$/.test(p.ic) && /\((suda|k|s|g)\)$/.test(p.ic);
        var yaz = /^[A-ZÇĞİÖŞÜÂÎÛ]{4,}$/.test(p.ic) ? p.on + p.ic.toLocaleLowerCase('tr-TR') + (p.ek ? '’' + p.ek.toLocaleLowerCase('tr-TR') : '') + p.son : tok;
        return { s: yaz.replace(/−/g, ' eksi ').replace(/^-(\d)/, 'eksi $1'), bag: /^(ve|ile|veya|ya|da|de)$/i.test(tok) };
      }
      onceFormul = true;
      return { s: p.on + formulOku(f) + (p.ek ? ' ' + p.ek : '') + p.son, iyon: !!f.yuk };
    });
    for (var i = 0; i < okunus.length; i++) {
      if (!/^iyon/i.test(okunus[i].s)) continue;
      for (var j = i - 1; j >= 0 && (okunus[j].iyon || okunus[j].bag); j--) if (okunus[j].iyon) okunus[j].s = okunus[j].s.replace(' iyonu', '');
    }
    return okunus.map(function (o) { return o.s; }).join(' ').replace(/\s+([,.;:!?])/g, '$1').replace(/,(\s*,)+/g, ',').replace(/^\s*,\s*/, '').replace(/\s+/g, ' ').trim();
  }
  function otomatikHTML(tok) {
    if (tok === '->') return '→';
    if (tok === '<=>') return '⇌';
    var p = sozcukAyir(tok), f = p.ic && formulCoz(p.ic);
    if (!f) return esc(tok);
    return esc(p.on) + formulHTML(f) + (p.ek ? '’' + esc(p.ek) : '') + esc(p.son);
  }
  function isaretHTML(tok) {
    var h = esc(tok).replace(/-&gt;/g, '→').replace(/&lt;=&gt;/g, '⇌');
    h = h.replace(/\*\*(.+?)\*\*/g, '<b class="vurgu">$1</b>');
    h = h.replace(/_\{([^}]*)\}/g, '<sub>$1</sub>').replace(/_([0-9])/g, '<sub>$1</sub>');
    h = h.replace(/\^\{([^}]*)\}/g, function (m, x) { return '<sup>' + x.replace(/-/g, '−') + '</sup>'; })
         .replace(/\^([0-9]*[+\-−])/g, function (m, x) { return '<sup>' + x.replace(/-/g, '−') + '</sup>'; });
    return h;
  }
  function sozcukler(metin) {
    metin = metin.replace(/\*\*(.+?)\*\*/g, function (m, ic) { return ic.split(' ').map(function (s) { return '**' + s + '**'; }).join(' '); });
    var out = [], re = /\[\[([\w-]+)\|([^\]]+)\]\]|(\S+)/g, m, son = 0;
    while ((m = re.exec(metin))) { out.push({ t: m[3] != null ? m[3] : m[2], k: m[1] || null, bitisik: out.length > 0 && m.index === son }); son = re.lastIndex; }
    return out;
  }
  // HTML parçasının okunuşu: üslü sayılar "üzeri", yükler formül okunuşuna bırakılır
  function htmlKonusma(html) {
    var d = document.createElement('div'); d.innerHTML = html;
    Array.prototype.forEach.call(d.querySelectorAll('svg,table,img,canvas,style,script'), function (n) { n.remove(); });
    Array.prototype.forEach.call(d.querySelectorAll('sup'), function (s) {
      var t = s.textContent.replace(/\s+/g, ''), onceki = s.previousSibling && s.previousSibling.nodeType === 3 ? s.previousSibling.nodeValue : '';
      if (/^[−-]?\d+$/.test(t) && /\d\s*$/.test(onceki)) s.textContent = ' üzeri ' + t.replace(/[−-]/, 'eksi ') + ' ';
    });
    Array.prototype.forEach.call(d.querySelectorAll('br,li,p,div'), function (n) { n.insertAdjacentText('afterend', ' '); });
    return konusmaMetni(d.textContent.replace(/\s+/g, ' ').trim());
  }

  /* ================= hazır dersler ================= */
  var DERSLER = {
    konu: {
      baslik: 'Çökelme tepkimeleri', sekme: 'Konu anlatımı',
      adimlar: [
        { sil: 1, sahne: null, w: [{ c: 'title', t: 'Çökelme Tepkimeleri' }], s: 'Merhaba! Bu derste çökelme tepkimelerini, net iyon denklemini ve seyirci iyonları öğreneceğiz.' },
        { w: [{ t: 'İki tuz çözeltisi karıştırılınca iyonlar **eş değiştirir.**' }], s: 'İki tuz çözeltisini karıştırdığımızda, çözeltilerdeki iyonlar eş değiştirir.' },
        { w: [{ c: 'eq', t: 'AB(suda) + CD(suda) -> AD(k) + CB(suda)' }], s: 'Yani A B ile C D karıştırılınca, A D ve C B oluşur.' },
        { w: [{ t: 'Ürünlerden biri suda çözünmüyorsa katı olarak ayrılır. Bu katıya [[ck|**çökelek**]] denir.' }], halka: 'ck', s: 'Oluşan ürünlerden biri suda çözünmüyorsa katı olarak ayrılır. Bu katıya çökelek, bu olaya da çökelme tepkimesi denir.' },
        { sil: 1, sahne: 'agcl', w: [{ c: 'label', t: 'Deney' }, { t: 'AgNO_3(suda) + NaCl(suda)' }], s: 'Şimdi bir deney yapalım. Beherde gümüş nitrat çözeltisi, tüpte ise sodyum klorür çözeltisi var.' },
        { yap: 'dok', w: [], s: 'Sodyum klorür çözeltisini gümüş nitrat çözeltisine ekliyoruz.' },
        { yap: 'bulut', w: [{ c: 'note', t: 'Çözelti bulanıklaştı!' }], s: 'Bakın! Çözelti bulanıklaştı ve beyaz bir katı oluştu.' },
        { yap: 'cokel', w: [{ t: 'Dibe çöken beyaz katı: **AgCl(k)**' }], s: 'Bir süre bekleyince bu beyaz katı kabın dibine çöker. Bu katı gümüş klorürdür.' },
        { sil: 1, sahne: null, w: [{ c: 'label', t: '1) Moleküler denklem' }, { c: 'eq', t: 'AgNO_3(suda) + NaCl(suda) -> AgCl(k) + NaNO_3(suda)' }], s: 'Bu olayı üç denklemle yazabiliriz. Birincisi moleküler denklem. Burada maddeleri formül hâlinde yazarız.' },
        { w: [{ c: 'label', t: '2) İyonik denklem' }, { c: 'eq', t: 'Ag^+ + [[n1|NO_3^-]] + [[a1|Na^+]] + Cl^- -> AgCl(k) + [[a2|Na^+]] + [[n2|NO_3^-]]' }], s: 'İkincisi iyonik denklem. Suda çözünen maddeleri iyonlarına ayırarak yazarız. Gümüş klorür katı olduğu için ayrılmaz.' },
        { ciz: ['a1', 'a2', 'n1', 'n2'], w: [], s: 'Şimdi iki tarafta da aynen duran iyonları bulalım. Sodyum ve nitrat iyonları iki tarafta da var. Bunları siliyoruz.' },
        { w: [{ c: 'label', t: '3) Net iyon denklemi' }, { c: 'box', t: 'Ag^+(suda) + Cl^-(suda) -> AgCl(k)' }], s: 'Geriye net iyon denklemi kalır. Gümüş iyonu ile klorür iyonu birleşir ve katı gümüş klorür oluşur.' },
        { sil: 1, sahne: 'iyon', w: [{ c: 'label', t: 'Tanecik gözüyle' }], s: 'Şimdi aynı olaya tanecik gözüyle bakalım. Çözeltide gümüş, nitrat, sodyum ve klorür iyonları serbestçe dolaşıyor.' },
        { yap: 'esles', w: [{ t: 'Ag^+ + Cl^- -> AgCl(k)' }], s: 'Gümüş ve klorür iyonları karşılaştıkça birleşir ve katı gümüş klorür olarak dibe çöker.' },
        { yap: 'seyirci', w: [{ c: 'ok', t: 'Seyirci iyonlar: Na^+ ve NO_3^-' }], s: 'Sodyum ve nitrat iyonları ise tepkimeye girmez. Baştan sona çözeltide dolaşırlar. Bunlara seyirci iyon denir.' },
        { sil: 1, sahne: null, w: [{ c: 'note', t: 'Dikkat!' }, { t: 'Katı, sıvı ve gaz hâldeki maddeler iyonlarına ayrılmaz.' }], s: 'Birkaç noktaya dikkat edelim. Katı, sıvı ve gaz hâldeki maddeler, iyonik denklemde iyonlarına ayrılmaz.' },
        { w: [{ t: 'Net iyon denkleminde yük korunur: (+1) + (−1) = 0' }], s: 'Net iyon denkleminde yük de korunur. Solda artı bir ve eksi bir var, toplam sıfır. Sağdaki katının yükü de sıfır.' },
        { w: [{ t: 'Bütün ürünler çözünüyorsa tepkime **gerçekleşmez.**' }], s: 'Son olarak, bütün ürünler suda çözünüyorsa tepkime gerçekleşmez. Kapta yalnızca bir iyon karışımı vardır.' },
        { w: [{ c: 'ok', t: 'Sıra sende: Pb(NO_3)_2(suda) + KI(suda) -> ?' }], s: 'Şimdi sıra sende. Kurşun iki nitrat ile potasyum iyodür karıştırılırsa ne olur? Soru çözümü bölümünde birlikte bakalım.' }
      ]
    },
    soru: {
      baslik: 'Soru çözümü: Pb(NO₃)₂ + KI', sekme: 'Soru çözümü',
      adimlar: [
        { sil: 1, sahne: null, w: [{ c: 'label', t: 'Soru' }, { c: 'q', t: 'Pb(NO_3)_2 çözeltisi ile KI çözeltisi karıştırıldığında parlak sarı bir çökelek oluşuyor.' }], s: 'Soruyu okuyalım. Kurşun iki nitrat çözeltisi ile potasyum iyodür çözeltisi karıştırıldığında, parlak sarı bir çökelek oluşuyor.' },
        { w: [{ c: 'q', t: 'a) Moleküler denklemi yazıp denkleştirin. b) Net iyon denklemini yazın. c) Seyirci iyonları belirtin.' }], s: 'Bizden üç şey isteniyor. Moleküler denklemi yazıp denkleştirmemiz, net iyon denklemini yazmamız ve seyirci iyonları belirtmemiz.' },
        { sil: 1, sahne: 'pbi2', yap: 'dok', w: [{ c: 'label', t: 'Önce deneye bakalım' }], s: 'Önce deneye bakalım. Potasyum iyodür çözeltisini kurşun nitrat çözeltisine ekliyoruz.' },
        { yap: 'bulut', w: [{ c: 'note', t: 'Parlak sarı çökelek!' }], s: 'İşte parlak sarı çökelek! Bu katı kurşun iyodürdür.' },
        { sil: 1, sahne: null, w: [{ c: 'label', t: 'İyonlar eş değiştirir' }, { c: 'eq', t: 'Pb^{2+} ile I^- · K^+ ile NO_3^-' }], s: 'Çözümde ilk adım: iyonlar eş değiştirir. Kurşun iyonu iyodür ile, potasyum iyonu da nitrat ile eşleşir.' },
        { w: [{ t: 'PbI_2: çözünmez (Pb^{2+}, I^- için istisna)' }, { t: 'KNO_3: çözünür (K^+ 1A grubunda)' }], s: 'Çözünürlük kurallarına göre kurşun iyodür suda çözünmez, çünkü kurşun iyonu iyodür için bir istisnadır. Potasyum nitrat ise çözünür, çünkü potasyum bir A grubundadır.' },
        { sil: 1, w: [{ c: 'label', t: 'a) Moleküler denklem' }, { c: 'eq', t: 'Pb(NO_3)_2(suda) + **2**KI(suda) -> PbI_2(k) + **2**KNO_3(suda)' }], s: 'a şıkkı. Moleküler denklemi yazıp denkleştiriyoruz. Potasyum iyodürün ve potasyum nitratın önüne iki katsayısı gelir.' },
        { w: [{ c: 'label', t: 'İyonik denklem' }, { c: 'eq', t: 'Pb^{2+} + [[n1|2NO_3^-]] + [[k1|2K^+]] + 2I^- -> PbI_2(k) + [[k2|2K^+]] + [[n2|2NO_3^-]]' }], s: 'İyonik denklemde suda çözünenleri iyonlarına ayırıyoruz. Kurşun iyodür katı olduğu için ayrılmaz.' },
        { ciz: ['k1', 'k2', 'n1', 'n2'], w: [], s: 'İki tarafta da aynen duran potasyum ve nitrat iyonlarını siliyoruz.' },
        { w: [{ c: 'label', t: 'b) Net iyon denklemi' }, { c: 'box', t: 'Pb^{2+}(suda) + 2I^-(suda) -> PbI_2(k)' }], s: 'b şıkkı. Net iyon denklemi: kurşun iyonu ile iki iyodür iyonu birleşir ve katı kurşun iyodür oluşur.' },
        { w: [{ c: 'ok', t: 'c) Seyirci iyonlar: K^+ ve NO_3^-' }], s: 'c şıkkı. Seyirci iyonlar potasyum ve nitrat iyonlarıdır.' },
        { w: [{ c: 'note', t: 'Dikkat: I^- önündeki 2 sadeleşmez, PbI_2 formülünden gelir.' }], s: 'Dikkat! İyodürün önündeki iki katsayısı sadeleşmez, çünkü kurşun iyodürün formülünden gelir.' }
      ]
    }
  };
  var ORNEK_METIN = 'Soru: NaCl çözeltisi ile KNO3 çözeltisi karıştırılıyor. Bir öğrenci "NaNO3 ve KCl oluştu, tepkime gerçekleşti" diyor. Öğrenci haklı mıdır?\n' +
    'Olası ürünler NaNO3 ve KCl’dir.\nHer ikisinin de katyonu 1A grubunda olduğu için ikisi de suda çözünür.\n' +
    'Kapta katı, gaz ya da su oluşmaz; yalnızca Na+, Cl−, K+ ve NO3− iyonlarının karışımı vardır.\n' +
    'Bütün iyonlar seyirci olduğu için net iyon denklemi yazılamaz.\nÖğrenci haksızdır: tepkime gerçekleşmez.';

  // Ses kopyası için okuma metni (yaklaşık 4 dakika)
  var ORNEK_OKUMA = [
    'Merhaba, ben kimya öğretmeninizim. Bu kayıtta sesimi tanıtmak için birkaç paragraf okuyacağım. Her cümleyi her zamanki ders anlatır gibi, doğal bir sesle okuyorum.',
    'Kimya, maddenin yapısını, özelliklerini ve değişimini inceleyen bilim dalıdır. Sabah içtiğimiz çaydan akşam yaktığımız ışığa kadar her şeyde kimya vardır. Ekmeğin kabarması, demirin paslanması, yaprağın sararması birer kimyasal değişimdir.',
    'Şimdi bir deney düşünelim. Bir behere gümüş nitrat çözeltisi koyuyoruz. Üzerine birkaç damla sodyum klorür ekleyince ne olur? Çözelti bulanıklaşır ve beyaz bir katı oluşur. Bu katı gümüş klorürdür ve bir süre sonra kabın dibine çöker.',
    'Peki bu tepkimede hangi iyonlar seyirci kalır? Sodyum ve nitrat iyonları değişmeden çözeltide dolaşır. Bu yüzden onlara seyirci iyon deriz. Net iyon denklemi ise yalnızca gümüş ve klorür iyonlarını gösterir.',
    'Biraz da sayılarla çalışalım. Bir mol su on sekiz gramdır. Normal koşullarda bir mol gaz yirmi iki virgül dört litre hacim kaplar. Avogadro sayısı yaklaşık altı virgül sıfır iki çarpı on üzeri yirmi üçtür. Oda koşullarında saf suyun pH değeri yedidir.',
    'Dikkat! Bu cümleyi vurgulayarak okuyorum: Bir asit çözeltisinin pH değeri yediden büyük olamaz. Aynı şekilde bir baz çözeltisinin pH değeri yediden küçük olamaz.',
    'Bazen sakin anlatırım: Elektronlar, çekirdeğin çevresinde belirli enerji düzeylerinde bulunur. Atom numarası arttıkça elektron sayısı da artar. Bazen de heyecanla: İşte bu yüzden tepkime bu kadar hızlı gerçekleşiyor!',
    'Bir soru soralım: Sıcaklık artınca tepkime hızı neden artar? Çünkü taneciklerin ortalama kinetik enerjisi artar ve eşik enerjisini aşan çarpışmaların sayısı çoğalır. Katalizör ise aktivasyon enerjisini düşürerek tepkimeyi hızlandırır.',
    'Şimdi birbirine benzeyen sesleri içeren bir paragraf: Çiçekli bahçede güneşli bir öğleden sonra, ağır ağır yürüyen yaşlı bir adam, şişedeki üzüm suyunu içti. Çocuklar ışıl ışıl gözlerle, gökyüzündeki uçurtmalara bakıyordu. Öğretmenimiz, öğrencilerin sorularını tek tek yanıtladı.',
    'Periyodik tabloda hidrojen, helyum, lityum, berilyum, bor, karbon, azot, oksijen, flor ve neon ilk on elementtir. Sodyum klorür, kalsiyum karbonat, sülfürik asit ve amonyak sık karşılaştığımız maddelerdir.',
    'Ve son olarak: Bugünkü dersimiz burada bitti. Konuyu tekrar etmeyi, soruları kendi başınıza çözmeyi unutmayın. Sorularınızı bekliyorum. Hepinize kolay gelsin, görüşmek üzere.'
  ];

  // Metinden ders: her cümle bir adım
  function metindenDers(metin, baslik) {
    var parca = [];
    String(metin || '').split(/\n+/).forEach(function (satir) {
      satir = satir.trim(); if (!satir) return;
      (satir.match(/[^.!?]+[.!?]+["”»]?|[^.!?]+$/g) || [satir]).forEach(function (c) {
        c = c.trim(); if (!c) return;
        if (c.length > 200 && c.indexOf(';') > 0) c.split(/;\s*/).forEach(function (x) { if (x.trim()) parca.push(x.trim()); });
        else parca.push(c);
      });
    });
    var adimlar = [{ sil: 1, sahne: null, w: [{ c: 'title', t: 'Birlikte çözelim' }], s: 'Bu metni birlikte tahtada inceleyelim.' }];
    parca.forEach(function (c, i) {
      adimlar.push({ oto: 1, w: [{ c: /^soru\b/i.test(c) ? 'q' : (i === parca.length - 1 ? 'ok' : ''), t: c }], s: konusmaMetni(c) });
    });
    return { id: 'metin', baslik: baslik || 'Kendi metnin', adimlar: adimlar };
  }
  // HTML parçalarından ders (kimyamed soru kartı, Ronya çözüm kartı)
  function gorselsizMetin(html) {
    var d = document.createElement('div'); d.innerHTML = html;
    Array.prototype.forEach.call(d.querySelectorAll('svg,table,img,canvas,style,script'), function (n) { n.remove(); });
    return d.textContent.replace(/\s+/g, ' ').trim();
  }
  // Bir kutunun içeriğini tahta satırlarına böl: <br>, paragraf, liste maddesi ve tablo ayrı satır olur
  function satirlaraBol(kok) {
    var satirlar = [], cur = '';
    var bitir = function () { if (cur.replace(/<[^>]*>|&nbsp;|\s/g, '').length || /<(svg|img|table)/i.test(cur)) satirlar.push(cur.trim()); cur = ''; };
    Array.prototype.forEach.call(kok.childNodes, function (n) {
      if (n.nodeType === 3) { cur += esc(n.nodeValue); return; }
      if (n.nodeType !== 1) return;
      var t = n.tagName;
      if (t === 'BR') { bitir(); return; }
      if (t === 'SCRIPT' || t === 'STYLE' || t === 'BUTTON' || (n.classList && n.classList.contains('sd-anlat'))) return;
      if (t === 'CANVAS') { bitir(); try { if (n.width && n.height) satirlar.push('<img src="' + n.toDataURL('image/png') + '" alt="">'); } catch (e) {} return; }
      if (t === 'UL' || t === 'OL') { bitir(); Array.prototype.forEach.call(n.children, function (li) { satirlar.push.apply(satirlar, satirlaraBol(li).length > 1 ? satirlaraBol(li) : [li.innerHTML.trim()]); }); return; }
      if (t === 'TABLE' || t === 'SVG' || t === 'svg' || t === 'IMG') { bitir(); satirlar.push(n.outerHTML); return; }
      if (/^(DIV|P|LI|SECTION|FIGURE|BLOCKQUOTE|H[1-6]|HEADER|FOOTER|ARTICLE|DETAILS)$/.test(t)) {
        bitir();
        if (n.querySelector('br,div,p,ul,ol,table,canvas,li')) satirlar.push.apply(satirlar, satirlaraBol(n));
        else if (n.textContent.replace(/\s+/g, '').length || n.querySelector('svg,img')) satirlar.push(n.innerHTML.trim());
        return;
      }
      cur += n.outerHTML;
    });
    bitir();
    return satirlar;
  }
  function parcalardanDers(o) {
    var adimlar = [], baslik = o.baslik || 'Soru', notIcinde = false;
    adimlar.push({ sil: 1, sahne: null, w: [{ c: 'label', t: baslik }], s: baslik + '. Önce soruyu okuyalım.' });
    var ekle = function (html, tur) { // tur: q = soru notu, c = çözüm satırı, ok = cevap
      var tmp = document.createElement('div'); tmp.innerHTML = html;
      var gorsel = tmp.querySelector('svg,table,img'), yazi = gorselsizMetin(html);
      if (!yazi && !gorsel) return;
      var s = yazi ? htmlKonusma(html) : (tmp.querySelector('table') ? 'Tabloya bakalım.' : 'Şekle bakalım.');
      if (!s) s = 'Şekle bakalım.';
      adimlar.push({ h: [{ c: tur === 'q' ? (notIcinde ? 'qd' : 'q') : tur === 'ok' ? 'ok' : '', html: html }], s: s });
      notIcinde = tur === 'q';
    };
    (o.soru || []).forEach(function (h) { ekle(h, 'q'); });
    (o.siklar || []).forEach(function (h) { ekle(h, 'q'); });
    notIcinde = false;
    if ((o.cozum || []).length || o.cevap) {
      adimlar.push({ w: [{ c: 'label', t: 'Çözüm' }], s: 'Şimdi çözüme geçelim.' });
      (o.cozum || []).forEach(function (h) { ekle(h, 'c'); });
      if (o.cevap) ekle('<b>Cevap:</b> ' + o.cevap, 'ok');
    }
    return { id: o.id || ('d' + ozet(baslik + (o.soru || []).join(''))), baslik: baslik, adimlar: adimlar };
  }
  // kimyamed .soru kartı
  function sorudanDers(soru) {
    var no = soru.querySelector('.numara'), govde = soru.querySelector('.govde') || soru, o = { soru: [], cozum: [] };
    o.baslik = no ? no.textContent.trim().replace(/^SORU/, 'Soru') : 'Soru';
    Array.prototype.forEach.call(govde.children, function (c) {
      if (c.matches('details') || c.matches('.sd-anlat')) return;
      if (c.matches('ul,ol')) { Array.prototype.forEach.call(c.children, function (li) { o.soru.push(li.innerHTML); }); return; }
      o.soru.push(c.outerHTML);
    });
    var d = govde.querySelector('details.cozum');
    if (d) {
      Array.prototype.forEach.call(d.children, function (c) {
        if (c.matches('summary,.cevap')) return;
        if (c.matches('ol,ul')) Array.prototype.forEach.call(c.children, function (li) { o.cozum.push(li.innerHTML); });
        else o.cozum.push(c.outerHTML);
      });
      var cv = d.querySelector('.cevap'); if (cv) o.cevap = cv.innerHTML;
    }
    o.id = 'km-' + ozet((location.pathname || '') + o.baslik + (o.soru[0] || ''));
    return parcalardanDers(o);
  }
  // Ronya: molToggle ile açılan çözüm kutuları
  function ronyaDers(el, hedef) {
    var soru = [], baslik = '';
    if (el.contains(hedef)) {
      Array.prototype.forEach.call(el.children, function (c) { if (c !== hedef && !c.classList.contains('sd-anlat')) soru.push.apply(soru, satirlaraBol(c).length ? satirlaraBol(c) : []); });
      if (!soru.length) soru.push.apply(soru, satirlaraBol(el).filter(function (h) { return h.indexOf('sd-anlat') < 0; }));
    } else {
      var onceki = [], n = el.previousElementSibling;
      while (n) { onceki.unshift(n); n = n.previousElementSibling; }
      onceki.forEach(function (c, i) {
        if (c.classList.contains('sd-anlat')) return;
        var t = c.textContent.replace(/\s+/g, ' ').trim();
        if (i === 0 && onceki.length > 1 && t.length < 40 && !c.querySelector('canvas,svg,table,img')) { var m = t.match(/^(\d+)/); baslik = m ? 'Soru ' + m[1] : ''; return; }
        var parca = c.tagName === 'CANVAS' ? satirlaraBol({ childNodes: [c] }) : satirlaraBol(c);
        if (!parca.length && t) parca = [c.innerHTML];
        soru.push.apply(soru, parca);
      });
    }
    if (soru.length) {
      var m = gorselsizMetin(soru[0]).match(/^(\d+)\s*[.)]\s*/);
      if (m) { if (!baslik) baslik = 'Soru ' + m[1]; soru[0] = soru[0].replace(/^((?:\s|<[^>]+>)*)\d+\s*[.)]\s*/, '$1'); }
    }
    var cozum = satirlaraBol(hedef);
    return parcalardanDers({ id: 'ry-' + ozet(soru.join('|') + cozum.join('|')), baslik: baslik || 'Soru', soru: soru, cozum: cozum });
  }
  /* ================= tahta, kalem ve yazı seçenekleri ================= */
  var TAHTALAR = {
    beyaz: { ad: 'Beyaz tahta', kalem: 'marker', zemin: '#FFFFFF', cerceve: 'metal', koyu: false, izgara: false },
    kareli: { ad: 'Kareli tahta', kalem: 'marker', zemin: '#FFFFFF', cerceve: 'metal', koyu: false, izgara: true },
    kara: { ad: 'Kara tahta', kalem: 'tebesir', zemin: '#262B2D', cerceve: 'ahsap', koyu: true },
    yesil: { ad: 'Yeşil tahta', kalem: 'tebesir', zemin: '#2D5A44', cerceve: 'ahsap', koyu: true },
    mavi: { ad: 'Mavi tahta', kalem: 'tebesir', zemin: '#22466F', cerceve: 'metal', koyu: true },
    akilli: { ad: 'Akıllı tahta', kalem: 'dijital', zemin: '#FCFDFF', cerceve: 'siyah', koyu: false }
  };
  var KALEMLER = {
    marker: { ad: 'Keçeli kalem', renkler: [['Siyah', '#1F2733'], ['Mavi', '#1E4FB4'], ['Kırmızı', '#D3202E'], ['Yeşil', '#17784A'], ['Mor', '#6D3FC0']],
      vurgu: { mavi: '#1E4FB4', kirmizi: '#D3202E', yesil: '#17784A', turuncu: '#E04E00', mor: '#6D3FC0', gri: '#5B6B7C' } },
    tebesir: { ad: 'Tebeşir', renkler: [['Beyaz', '#F4F2EC'], ['Sarı', '#FFE48A'], ['Pembe', '#FFB6C8'], ['Açık mavi', '#BEE3FF'], ['Yeşil', '#C9F0B9']],
      vurgu: { mavi: '#A9D6FF', kirmizi: '#FF9FB2', yesil: '#B6EBA8', turuncu: '#FFD27A', mor: '#D9BEFF', gri: '#C3C9CE' } },
    dijital: { ad: 'Akıllı kalem', renkler: [['Siyah', '#111827'], ['Mavi', '#2563EB'], ['Kırmızı', '#E11D48'], ['Yeşil', '#059669'], ['Mor', '#7C3AED']],
      vurgu: { mavi: '#2563EB', kirmizi: '#E11D48', yesil: '#059669', turuncu: '#EA580C', mor: '#7C3AED', gri: '#64748B' } }
  };
  var YAZILAR = [
    { id: 'caveat', ad: 'El yazısı', aile: '"Caveat"', css: 'Caveat:wght@500;700', olcek: 1 },
    { id: 'kalam', ad: 'Keçeli yazı', aile: '"Kalam"', css: 'Kalam:wght@400;700', olcek: 0.8 },
    { id: 'patrick', ad: 'Düzgün el yazısı', aile: '"Patrick Hand"', css: 'Patrick+Hand', olcek: 0.86 },
    { id: 'playpen', ad: 'Okul yazısı', aile: '"Playpen Sans"', css: 'Playpen+Sans:wght@400;700', olcek: 0.74 },
    { id: 'shantell', ad: 'Yuvarlak yazı', aile: '"Shantell Sans"', css: 'Shantell+Sans:wght@400;700', olcek: 0.74 },
    { id: 'duz', ad: 'Düz yazı', aile: 'system-ui', css: null, olcek: 0.72 }
  ];
  var yuklenenYazi = {};
  function yaziYukle(y) {
    if (!y.css || yuklenenYazi[y.id]) return;
    yuklenenYazi[y.id] = 1;
    try {
      var l = document.createElement('link'); l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=' + y.css + '&display=swap';
      document.head.appendChild(l);
    } catch (e) {}
  }
  var TARZLAR = [
    { ad: 'Sakin', hiz: 0.95, ton: 1.0, ara: 450 },
    { ad: 'Enerjik', hiz: 1.08, ton: 1.12, ara: 250 },
    { ad: 'Yavaş ve net', hiz: 0.82, ton: 1.0, ara: 700 },
    { ad: 'Hikâye gibi', hiz: 0.9, ton: 0.94, ara: 650 }
  ];
  var ayar = {
    tahta: depo.al('tahta', 'beyaz'), kalem: depo.al('kalem', null), renk: depo.al('renk', 0), yazi: depo.al('yazi', 'caveat'),
    cins: depo.al('cins', 'k'), sesAdi: depo.al('ses', ''), kaynak: depo.al('kaynak', 'cihaz'),
    tarz: Math.min(3, depo.al('tarz', 0)), hiz: depo.al('hiz', 1), ogretmen: depo.al('ogretmen', true)
  };
  if (!TAHTALAR[ayar.tahta]) ayar.tahta = 'beyaz';
  function kalemTuru() { return KALEMLER[ayar.kalem] ? ayar.kalem : TAHTALAR[ayar.tahta].kalem; }

  /* ================= ses motoru ================= */
  var Ses = {
    var: 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window,
    tr: [], tut: [], ses: null, oranFn: null, acik: false,
    yukle: function () {
      if (!this.var) return;
      var v = speechSynthesis.getVoices() || [];
      this.tr = v.filter(function (x) { return /^tr([-_]|$)/i.test(x.lang || '') || /t[uü]rk/i.test(x.name || ''); });
    },
    cinsi: function (v) {
      var n = ((v.name || '') + ' ' + (v.voiceURI || '')).toLowerCase();
      if (/yelda|emel|seda|filiz|zeynep|elif|ay[sş]e|female|kad[ıi]n|google t[uü]rk/.test(n)) return 'k';
      if (/tolga|ahmet|\bcem\b|mehmet|kerem|murat|erkek|\bmale\b/.test(n)) return 'e';
      return '?';
    },
    dogal: function (v) { return /natural|online|neural|premium|enhanced|geli[sş]mi[sş]|wavenet|studio/i.test((v.name || '') + ' ' + (v.voiceURI || '')); },
    ad: function (v) {
      var n = (v.name || '').replace(/\s*\((Turkish|Türkçe)[^)]*\)\s*/i, ' ').replace(/Microsoft\s+/i, '').replace(/\s+-\s+Turkish.*$/i, '').replace(/Online\s*\(Natural\)/i, '').replace(/\s{2,}/g, ' ').trim();
      return n || v.voiceURI || 'Türkçe ses';
    },
    sec: function () {
      if (this.var && !this.tr.length) this.yukle();
      var self = this, list = this.tr;
      if (!this.var) return { ses: null, ton: 1, not: 'Bu tarayıcı sesli okumayı desteklemiyor. Ders altyazıyla oynatılıyor.' };
      if (!list.length) return { ses: null, ton: 1, not: 'Bu cihazda Türkçe ses bulunamadı. Ders altyazıyla oynatılıyor; cihazın ses ayarlarından Türkçe ses eklenebilir.' };
      if (ayar.sesAdi) { var el = list.filter(function (v) { return v.voiceURI === ayar.sesAdi; })[0]; if (el) return { ses: el, ton: 1, not: '' }; }
      var sirala = function (a) { return a.slice().sort(function (x, y) { return (self.dogal(y) - self.dogal(x)) || (y.localService - x.localService); })[0]; };
      var uygun = list.filter(function (v) { return self.cinsi(v) === ayar.cins; });
      if (uygun.length) return { ses: sirala(uygun), ton: 1, not: '' };
      var bilinmeyen = list.filter(function (v) { return self.cinsi(v) === '?'; });
      if (bilinmeyen.length) return { ses: sirala(bilinmeyen), ton: ayar.cins === 'e' ? 0.82 : 1.06, not: 'Seslerin adından kadın mı erkek mi olduğu anlaşılamadı; listeden başka bir ses deneyebilirsin.' };
      return { ses: sirala(list), ton: ayar.cins === 'e' ? 0.72 : 1.18,
        not: ayar.cins === 'e' ? 'Bu cihazda erkek Türkçe ses yok; kadın sesi daha kalın tonda kullanılıyor. Gerçek erkek sesi için öğretmen kaydı ya da hazır ses dosyaları gerekir.' : 'Bu cihazda kadın Türkçe ses yok; erkek sesi daha ince tonda kullanılıyor.' };
    },
    sure: function (metin, hiz) { return metin.length / (14.5 * hiz) * 1000 + 350; },
    parcala: function (metin) { // uzun metni ~200 karakterlik parçalara böl (bazı tarayıcılar uzun cümleyi yarıda keser)
      var out = [], kalan = metin, MAX = 200;
      while (kalan.length > MAX) {
        var bolge = kalan.slice(0, MAX), kes = -1, m, re = /[.!?;:](\s|$)/g;
        while ((m = re.exec(bolge))) kes = m.index + 1;
        if (kes < 25) { var v = bolge.lastIndexOf(', '); kes = v > 25 ? v + 1 : -1; }
        if (kes < 25) { var bo = bolge.lastIndexOf(' '); kes = bo > 25 ? bo : MAX; }
        out.push(kalan.slice(0, kes)); kalan = kalan.slice(kes);
      }
      if (kalan.trim()) out.push(kalan);
      return out;
    },
    // metni seslendir; kayıt varsa onu çal. olay: basla(sure, sinirVar), sinir(ci, cl)
    konus: function (metin, olay, kayit) {
      var self = this, t = TARZLAR[ayar.tarz], hiz = Math.max(0.5, Math.min(2, t.hiz * ayar.hiz));
      this.oranFn = null;
      if (kayit && kayit.url) {
        return new Promise(function (bitir) {
          var a = self.ortak(), bitti = false, zaman, oran;
          self.ses = a;
          var son = function (n) {
            if (bitti) return; bitti = true; clearTimeout(zaman);
            if (self.oranFn === oran) self.oranFn = null;
            a.onended = a.onerror = a.onloadedmetadata = null;
            bitir(n);
          };
          a.onloadedmetadata = function () { olay.basla && olay.basla((isFinite(a.duration) ? a.duration : kayit.sure || 3) * 1000, false); };
          oran = function () { var d = isFinite(a.duration) && a.duration > 0 ? a.duration : (kayit.sure || 3); return Math.min(1, a.currentTime / d); };
          self.oranFn = oran;
          a.onended = function () { son('bitti'); };
          a.onerror = function () { son('hata'); };
          a.src = kayit.url;
          var p = a.play(); if (p && p.catch) p.catch(function () { son('hata'); });
          zaman = setTimeout(function () { son('zaman'); }, ((kayit.sure || 30) + 8) * 1000);
          self.kayitBitir = function () { son('iptal'); };
        });
      }
      var s = this.sec();
      return new Promise(function (bitir) {
        var bitti = false, nob;
        var son = function (n) { if (bitti) return; bitti = true; clearTimeout(nob); bitir(n); };
        if (!s.ses) {
          var tahmin = self.sure(metin, hiz);
          olay.basla && olay.basla(tahmin, false);
          self.sahte = { iptal: function () { son('iptal'); } };
          nob = setTimeout(function () { son('bitti'); }, tahmin);
          return;
        }
        var parcalar = self.parcala(metin), ofset = 0, i = 0, basladi = false;
        var sonraki = function () {
          if (bitti) return;
          if (i >= parcalar.length) { son('bitti'); return; }
          var parca = parcalar[i], buOfset = ofset;
          var u = new SpeechSynthesisUtterance(parca);
          u.lang = s.ses.lang || 'tr-TR'; u.voice = s.ses; u.rate = hiz; u.pitch = Math.max(0.1, Math.min(2, t.ton * s.ton));
          u.onstart = function () { if (!basladi) { basladi = true; olay.basla && olay.basla(self.sure(metin, hiz), true); } };
          u.onboundary = function (e) { if (e.name === 'word' || e.name == null) olay.sinir && olay.sinir(buOfset + e.charIndex, e.charLength || 0); };
          u.onend = function () { i++; ofset += parca.length; sonraki(); };
          u.onerror = function (e) { son('hata:' + (e && e.error)); };
          self.tut.push(u); if (self.tut.length > 40) self.tut.shift();
          speechSynthesis.speak(u);
        };
        nob = setTimeout(function () { son('zaman'); }, self.sure(metin, hiz) * 2.4 + 5000 * parcalar.length);
        sonraki();
      });
    },
    sus: function () {
      if (this.sahte) { this.sahte.iptal(); this.sahte = null; }
      if (this.ses) { try { this.ses.pause(); } catch (e) {} this.ses = null; }
      if (this.kayitBitir) { var f = this.kayitBitir; this.kayitBitir = null; f(); }
      this.oranFn = null;
      if (this.var) { try { speechSynthesis.cancel(); } catch (e) {} }
    },
    // iPhone'da ses dosyası yalnızca dokunuşla açılmış bir oynatıcıdan çalar: tek oynatıcı, ilk dokunuşta açılır
    ortak: function () {
      if (!this.oynatici) { this.oynatici = new Audio(); this.oynatici.preload = 'auto'; try { this.oynatici.setAttribute('playsinline', ''); } catch (e) {} }
      return this.oynatici;
    },
    kilidiAc: function () {
      if (!this.sesAcik) {
        try {
          var a = this.ortak();
          a.src = 'data:audio/wav;base64,UklGRrQBAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YZABAACA' + new Array(134).join('gICA');
          var p = a.play(); if (p && p.catch) p.catch(function () {});
          this.sesAcik = true;
        } catch (e) {}
      }
      if (!this.var || this.acik) return;
      try { var u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); this.acik = true; } catch (e) {}
    }
  };
  if (Ses.var) {
    Ses.yukle();
    try { speechSynthesis.addEventListener('voiceschanged', function () { Ses.yukle(); Oynatici.hepsi.forEach(function (o) { o.sesListesi(); }); }); } catch (e) {}
  }

  /* ================= mikrofon kaydı ================= */
  var Kaydedici = {
    var: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder),
    basla: function () {
      return navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }).then(function (akis) {
        var tip = ['audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'].filter(function (t) { try { return MediaRecorder.isTypeSupported(t); } catch (e) { return false; } })[0];
        var secenek = { audioBitsPerSecond: 64000 }; if (tip) secenek.mimeType = tip;
        var mr; try { mr = new MediaRecorder(akis, secenek); } catch (e) { mr = tip ? new MediaRecorder(akis, { mimeType: tip }) : new MediaRecorder(akis); }
        var parcalar = [], t0 = performance.now();
        mr.ondataavailable = function (e) { if (e.data && e.data.size) parcalar.push(e.data); };
        mr.start(250);
        return {
          durdur: function () {
            return new Promise(function (res) {
              mr.onstop = function () {
                akis.getTracks().forEach(function (t) { t.stop(); });
                var blob = new Blob(parcalar, { type: mr.mimeType || tip || 'audio/webm' });
                res({ blob: blob, sure: (performance.now() - t0) / 1000, mime: blob.type });
              };
              try { mr.stop(); } catch (e) { res(null); }
            });
          }
        };
      });
    }
  };
  function kayitUzanti(mime) { return /mp4|m4a|aac/.test(mime) ? 'm4a' : /ogg/.test(mime) ? 'ogg' : 'webm'; }
  function indir(blob, ad) {
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = ad; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
  }

  /* ================= görünüm: biçem ve şablon ================= */
  var TEBESIR_MASKE = '', TEBESIR_TOZ = '';
  var CSS = [
    ':host{all:initial;display:block}',
    '*{box-sizing:border-box}',
    '.sd{--kagit:#FBF8F5;--kart:#FFFFFF;--murekkep:#14110F;--gri:#5C554F;--cizgi:#E7E0D9;--turuncu:#F85300;--turuncu-y:#FFF1E9;--turuncu-k:#C24100;--odak:#0B5C8A;',
    '  --ui:"Segoe UI",-apple-system,BlinkMacSystemFont,Roboto,"Helvetica Neue",Arial,sans-serif;font-family:var(--ui);font-size:16px;line-height:1.55;color:var(--murekkep);-webkit-text-size-adjust:100%}',
    '.sd[data-tema="koyu"]{--kagit:#16130F;--kart:#1F1B17;--murekkep:#F2ECE6;--gri:#B5ABA1;--cizgi:#3A342E;--turuncu:#FF7633;--turuncu-y:#3B2316;--turuncu-k:#FF9A66;--odak:#7FB7DD;color-scheme:dark}',
    'button,input,select,textarea{font:inherit;color:inherit}button{cursor:pointer}',
    ':focus-visible{outline:3px solid var(--odak);outline-offset:2px}[hidden]{display:none!important}',
    /* pencere ve gömülü düzen */
    '.sd[data-mod="pencere"]{position:fixed;inset:0;background:rgba(20,17,15,.6);display:flex;align-items:flex-start;justify-content:center;overflow:auto;overscroll-behavior:contain;',
    '  padding:max(10px,env(safe-area-inset-top,0px)) max(10px,env(safe-area-inset-right,0px)) max(10px,env(safe-area-inset-bottom,0px)) max(10px,env(safe-area-inset-left,0px))}',
    '.sd-panel{background:var(--kagit);border-radius:16px;width:min(1180px,100%);padding:14px;display:grid;gap:12px;box-shadow:0 24px 60px -24px rgba(0,0,0,.7);margin:auto 0;container:sdpanel/inline-size}',
    '.sd[data-mod="satir"] .sd-panel{background:transparent;padding:0;box-shadow:none;border-radius:0;width:100%}',
    '.sd-ust{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
    '.sd-ust h2{margin:0;font-size:17px;font-weight:800;letter-spacing:-.01em;flex:1 1 180px;min-width:0;overflow-wrap:anywhere}',
    '.sd-sekmeler{display:flex;gap:4px;padding:4px;background:var(--kart);border:1px solid var(--cizgi);border-radius:999px;max-width:100%;overflow-x:auto}',
    '.sd-sekmeler button{border:0;background:transparent;padding:7px 14px;border-radius:999px;font-weight:600;color:var(--gri);white-space:nowrap;font-size:14px}',
    '.sd-sekmeler button[aria-selected="true"]{background:var(--murekkep);color:var(--kagit)}',
    '@container sdpanel (max-width:560px){.sd-ust .sd-sekmeler{width:100%}.sd-ust .sd-sekmeler button{flex:1 1 0;padding:7px 6px}}',
    '.sd-kucuk{border:1px solid var(--cizgi);background:var(--kart);border-radius:999px;padding:7px 12px;font-size:14px;font-weight:600;display:inline-flex;align-items:center;gap:6px}',
    '.sd-kucuk[aria-pressed="true"]{background:var(--murekkep);color:var(--kagit);border-color:var(--murekkep)}',
    '@container sdpanel (max-width:480px){.sd[data-mod="pencere"] .sd-ust .sd-kucuk .etk{display:none}.sd[data-mod="pencere"] .sd-ust .sd-kucuk{padding:9px}.sd-ust h2{font-size:16px}}',
    '@container sdpanel (max-width:420px){.sd-alan .sd-oynatici{gap:4px}.sd-oynatici .yv{width:40px;height:40px}.sd-oynatici .yv.ana{width:50px;height:50px}.sd-oynatici .sd-ilerleme{flex-basis:52px;min-width:52px}}',
    '.sd-duzen{display:grid;gap:16px;align-items:start}',
    '@container sdpanel (min-width:1000px){.sd[data-mod="satir"] .sd-duzen{grid-template-columns:minmax(0,1fr) 330px}.sd[data-mod="pencere"].ayar-acik .sd-duzen{grid-template-columns:minmax(0,1fr) 320px}}',
    '.sd[data-mod="pencere"]:not(.ayar-acik) .sd-yan{display:none}',
    '.sd-alan{min-width:0;display:grid;gap:10px}',
    /* tahta çerçevesi */
    '.sd-cerceve{position:relative;padding:9px 9px 0;border-radius:12px;background:linear-gradient(180deg,#E4E7EB,#B9C0C8);box-shadow:0 1px 0 rgba(255,255,255,.6) inset,0 10px 24px -14px rgba(20,17,15,.45)}',
    '.sd-cerceve[data-cerceve="ahsap"]{background:linear-gradient(180deg,#9A6A3C,#6E4724);box-shadow:inset 0 0 0 1px rgba(0,0,0,.25),0 10px 24px -14px rgba(20,17,15,.55)}',
    '.sd-cerceve[data-cerceve="ahsap"]::before{content:"";position:absolute;inset:0;border-radius:12px;pointer-events:none;opacity:.35;background:repeating-linear-gradient(95deg,rgba(255,255,255,.08) 0 2px,transparent 2px 9px),repeating-linear-gradient(80deg,rgba(0,0,0,.12) 0 1px,transparent 1px 13px)}',
    '.sd-cerceve[data-cerceve="siyah"]{background:linear-gradient(180deg,#2A2F36,#16191D);padding:12px 12px 0}',
    '.sd-tahta{position:relative;aspect-ratio:1/1;background:var(--zemin,#fff);border-radius:4px;overflow:hidden;container-type:inline-size;box-shadow:inset 0 0 0 1px rgba(120,130,140,.35),inset 0 3px 10px rgba(30,40,55,.08)}',
    '@container sdpanel (min-width:560px){.sd-tahta{aspect-ratio:4/3}}@container sdpanel (min-width:700px){.sd-tahta{aspect-ratio:16/10}}@container sdpanel (min-width:1300px){.sd-tahta{aspect-ratio:16/9}}',
    '.sd[data-mod="pencere"] .sd-cerceve{width:100%;max-width:max(300px,calc((100vh - 250px) * 1.6));margin:0 auto}',
    '@supports (height:100dvh){.sd[data-mod="pencere"] .sd-cerceve{max-width:max(300px,calc((100dvh - 250px) * 1.6))}}',
    '.sd-doku{position:absolute;inset:0;pointer-events:none}',
    '.sd-tahta[data-izgara="1"] .sd-doku{background-image:linear-gradient(rgba(70,120,170,.16) 1px,transparent 1px),linear-gradient(90deg,rgba(70,120,170,.16) 1px,transparent 1px);background-size:4cqw 4cqw}',
    '.sd-tahta.koyu .sd-doku{opacity:.5;background:radial-gradient(60% 40% at 30% 30%,rgba(255,255,255,.06),transparent 70%),radial-gradient(50% 35% at 75% 70%,rgba(255,255,255,.05),transparent 70%)}',
    '.sd-tahta.koyu .sd-doku::after{content:"";position:absolute;inset:0;background-image:var(--toz);opacity:.5}',
    '.sd-tahta[data-cerceve="siyah"]{box-shadow:inset 0 0 0 1px #0E1013,inset 0 0 18px rgba(0,0,0,.12)}',
    '.sd-tahta[data-cerceve="siyah"]::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(115deg,rgba(255,255,255,.22) 0 18%,transparent 18% 100%)}',
    '.sd-iz{position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .4s;background:linear-gradient(100deg,transparent 5%,rgba(255,255,255,.55) 30%,rgba(255,255,255,.3) 55%,transparent 80%)}',
    '.sd-tahta:not(.koyu) .sd-iz{display:none}',
    '.sd-raf{height:16px;margin:0 -9px;border-radius:0 0 12px 12px;background:linear-gradient(180deg,#C7CDD3,#AEB5BD);position:relative}',
    '.sd-cerceve[data-cerceve="ahsap"] .sd-raf{background:linear-gradient(180deg,#7B5230,#5A3A1E)}',
    '.sd-cerceve[data-cerceve="siyah"] .sd-raf{margin:0 -12px;height:22px;background:linear-gradient(180deg,#1C2025,#111317)}',
    '.sd-raf i{position:absolute;bottom:7px;height:6px;border-radius:3px}',
    /* yazı katmanı */
    '.sd-ic{position:absolute;inset:0;padding:4.6cqw 4.5cqw 4cqw 5.2cqw}',
    '@container (min-width:640px){.sd-ic{padding:3.6cqw 3.5cqw 3cqw 4cqw}}',
    '.sd-yer1{float:right;width:0;height:calc(100% - 20cqw)}.sd-yer2{float:right;clear:right;width:15.5cqw;height:20cqw}',
    '@container (min-width:640px){.sd-yer1{height:calc(100% - 15.5cqw)}.sd-yer2{width:11.5cqw;height:15.5cqw}}',
    '.sahneli .sd-yer1,.sahneli .sd-yer2,.ogretmensiz .sd-yer1,.ogretmensiz .sd-yer2{display:none}',
    '.sd-yazi{position:relative;height:100%;overflow:hidden;font-family:var(--aile),"Segoe Print","Bradley Hand","Comic Sans MS",cursive;font-size:21px;font-size:calc(5.8cqw * var(--olcek,1) * var(--sig,1));line-height:1.22;color:var(--k-yazi)}',
    '@container (min-width:640px){.sd-yazi{font-size:calc(3.65cqw * var(--olcek,1) * var(--sig,1))}}',
    '.sahneli .sd-yazi{height:38%}@container (min-width:640px){.sahneli .sd-yazi{height:100%;width:45%}}',
    '.sd-tahta[data-kalem="tebesir"] .blok:not(.b-q):not(.b-qd) .w:not(.w-blok){display:inline-block;-webkit-mask-image:var(--maske);mask-image:var(--maske);-webkit-mask-size:120px 120px;mask-size:120px 120px;text-shadow:0 0 1px rgba(255,255,255,.35),0 0 3px rgba(255,255,255,.12)}',
    '.sd-tahta[data-kalem="dijital"] .sd-yazi{text-shadow:0 0 .05em currentColor}',
    '.blok{margin:0 0 .26em;overflow-wrap:anywhere}.blok sub,.blok sup{font-size:.64em;line-height:0}',
    '.w{opacity:0;position:relative}.w.on{opacity:1;animation:yaz .3s ease-out both}',
    '.sd-tahta[data-kalem="tebesir"] .w.on{animation:yazT .42s ease-out both}',
    '.anlik.w.on,.anlik .w.on{animation:none}',
    '@keyframes yaz{from{clip-path:inset(-25% 100% -25% -4%)}to{clip-path:inset(-25% -18% -25% -4%)}}',
    '@keyframes yazT{from{clip-path:inset(-25% 100% -25% -4%);filter:blur(.6px)}to{clip-path:inset(-25% -18% -25% -4%);filter:none}}',
    '.w-blok{display:inline-block;max-width:100%}.w-blok.on{animation:solgun .5s ease-out both}@keyframes solgun{from{opacity:0}to{opacity:1}}',
    '.blok svg,.blok img{max-width:100%;height:auto;max-height:7em;vertical-align:middle}.blok table{border-collapse:collapse;font-size:.62em;font-family:var(--ui);line-height:1.35}.blok td,.blok th{border:1px solid currentColor;padding:.2em .45em;text-align:left}',
    '.b-q svg,.b-q img,.b-qd svg,.b-qd img{max-height:12em}.b-q table,.b-qd table{font-size:.92em}',
    '.koyu .w-blok{background:#fff;border-radius:8px;padding:4px;color:#1F2733}',
    '.b-title{font-size:1.42em;font-weight:700;color:var(--k-turuncu);margin-bottom:.32em}',
    '.b-title .w.on{text-decoration:underline;text-decoration-thickness:.06em;text-underline-offset:.14em}',
    '.b-eq{color:var(--k-mavi);font-weight:700;font-size:.94em}',
    '.b-box{display:inline-block;color:var(--k-turuncu);font-weight:700;padding:.04em .42em .1em;border:.07em solid transparent;border-radius:.35em;transition:border-color .5s}.b-box.acik{border-color:var(--k-turuncu)}',
    '.b-label{color:var(--k-gri);font-size:.8em;font-weight:700;margin-top:.3em;margin-bottom:.06em}',
    '.b-note{color:var(--k-kirmizi);font-weight:700}.b-ok{color:var(--k-yesil);font-weight:700}.b-ozel{color:var(--k-mor);font-weight:700}',
    '.b-q{font-family:var(--ui);font-size:.56em;line-height:1.5;color:#262B32;background:#FFFCEE;border:1px solid #EADFB6;border-radius:6px;padding:.55em .8em .6em 1.6em;position:relative;box-shadow:0 2px 0 rgba(0,0,0,.08);text-shadow:none}',
    '.b-q::before{content:"";position:absolute;left:.55em;top:.75em;width:.6em;height:.6em;border-radius:50%;background:#E04E00;box-shadow:inset -1px -1px 0 rgba(0,0,0,.25)}',
    '.b-q .w-blok,.b-qd .w-blok{background:transparent;padding:0}',
    '.b-qd{font-family:var(--ui);font-size:.56em;line-height:1.5;color:#262B32;background:#FFFCEE;border:1px solid #EADFB6;border-top:0;border-radius:0 0 6px 6px;padding:.15em .8em .6em 1.6em;margin-top:-.26em;text-shadow:none;box-shadow:0 2px 0 rgba(0,0,0,.08)}',
    '.b-q:has(+ .b-qd),.b-qd:has(+ .b-qd){border-bottom:0;border-bottom-left-radius:0;border-bottom-right-radius:0;padding-bottom:.15em;box-shadow:none}',
    '.sd-yer2 + .b-qd{border-top:1px solid #EADFB6;border-top-left-radius:6px;border-top-right-radius:6px;margin-top:0;padding-top:.55em}',
    '@container (max-width:639px){.b-q,.b-qd{font-size:.68em}}',
    '.b-q b,.b-qd b{font-weight:700}.b-q sub,.b-q sup,.b-qd sub,.b-qd sup{font-size:.72em}',
    '.vurgu{color:var(--k-kirmizi)}',
    '.w.ciz::after{content:"";position:absolute;left:-6%;right:-6%;top:50%;height:.09em;border-radius:.05em;background:var(--k-kirmizi);transform:rotate(-14deg) scaleX(0);transform-origin:left center;animation:ciz .45s .05s forwards}',
    '.w.ciz{opacity:.55}',
    '.w.halka::before{content:"";position:absolute;inset:-.16em -.32em -.1em;border:.075em solid var(--k-turuncu);border-radius:50%;transform:rotate(-4deg) scale(.6);opacity:0;animation:halka .5s forwards}',
    '.anlik.ciz::after,.anlik.halka::before{animation-duration:.01s}',
    '@keyframes ciz{to{transform:rotate(-14deg) scaleX(1)}}@keyframes halka{to{transform:rotate(-4deg) scale(1);opacity:1}}',
    '.sd-kalem{position:absolute;left:0;top:0;width:5.5cqw;min-width:18px;pointer-events:none;opacity:0;transition:transform .16s linear,opacity .25s;z-index:4}',
    '.sd-kalem.aktif{opacity:1}.sd-kalem svg{display:block;width:100%;height:auto}',
    '.sd-silgi{position:absolute;top:8%;left:-24%;width:20%;height:84%;pointer-events:none;z-index:5;display:none}',
    '.sd-silgi.calis{display:block;animation:sil .72s ease-in-out forwards}',
    '.sd-silgi div{position:absolute;top:30%;left:12%;width:76%;height:40%;border-radius:8px;background:linear-gradient(180deg,#3B4450 0 52%,#E6E9EC 52% 100%);box-shadow:0 6px 12px -6px rgba(0,0,0,.45)}',
    '.sd-tahta.koyu .sd-silgi div{background:linear-gradient(180deg,#6B4A2B 0 50%,#D8D2C6 50% 100%)}',
    '.sd-tahta[data-cerceve="siyah"] .sd-silgi div{background:linear-gradient(180deg,#E5E7EB,#CBD5E1);border-radius:50%;width:40%;left:30%}',
    '@keyframes sil{from{left:-24%}to{left:104%}}',
    '.sd-yazi.siliniyor{transition:opacity .62s ease-in;opacity:0}',
    /* sahne */
    '.sd-sahne{position:absolute;display:none;left:5cqw;right:19cqw;top:42%;bottom:2.5cqw;z-index:2}',
    '.sahneli .sd-sahne{display:block}',
    '@container (min-width:640px){.sd-sahne{left:46%;right:15cqw;top:4cqw;bottom:3cqw}}',
    '.koyu .sd-sahne{background:rgba(255,255,255,.93);border-radius:12px;padding:4px}',
    '.sd-sahne svg{width:100%;height:100%;display:block}',
    '.sd-sahne .etk{font-family:var(--ui);font-size:17px;font-weight:700;fill:#2B333D}.sd-sahne .etk.kucuk{font-size:13px;font-weight:600;fill:#6A7582}',
    '.sd-sahne .iy-yazi{font-family:var(--ui);font-size:11.5px;font-weight:800;pointer-events:none}',
    '.sd-sahne .parla circle{stroke:#E04E00;stroke-width:3.2;animation:parla 1.1s ease-in-out infinite alternate}@keyframes parla{from{stroke-opacity:.35}to{stroke-opacity:1}}',
    /* öğretmen */
    '.sd-ogretmen{position:absolute;right:1cqw;bottom:0;width:17.5cqw;z-index:6;pointer-events:none}',
    '@container (min-width:640px){.sd-ogretmen{width:13.2cqw}}',
    '.sd-ogretmen svg{display:block;width:100%;height:auto;animation:nefes 4.2s ease-in-out infinite}',
    '@keyframes nefes{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.2%)}}',
    '.sd-ogretmen .agiz-acik{display:none}.sd-ogretmen.agiz .agiz-acik{display:inline}.sd-ogretmen.agiz .agiz-kapali{display:none}',
    '.sd-ogretmen .gozler{transform-box:fill-box;transform-origin:center;animation:kirp 4.6s infinite}@keyframes kirp{0%,94%,100%{transform:scaleY(1)}96.5%{transform:scaleY(.1)}}',
    '.sd-ogretmen .kol{transform-box:view-box;transform-origin:40px 178px;transition:transform .3s}',
    '.sd-ogretmen.yaziyor .kol{animation:kolYaz .42s ease-in-out infinite alternate}.sd-ogretmen.gosteriyor .kol{transform:rotate(-22deg)}',
    '@keyframes kolYaz{from{transform:rotate(-5deg)}to{transform:rotate(6deg)}}',
    '.sd-ogretmen.erkek .sac-kadin,.sd-ogretmen.erkek .sac-arka{display:none}.sd-ogretmen.kadin .sac-erkek,.sd-ogretmen.kadin .kravat{display:none}',
    /* perde */
    '.sd-perde{position:absolute;inset:0;z-index:8;display:grid;place-items:center;background:rgba(255,255,255,.62);-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px)}',
    '.koyu .sd-perde{background:rgba(20,24,26,.55)}',
    '.sd-perde-ic{display:grid;justify-items:center;gap:10px;text-align:center;padding:12px}',
    '.sd-perde button{display:inline-flex;align-items:center;gap:10px;border:0;border-radius:999px;background:#F85300;color:#fff;font-weight:700;font-size:clamp(15px,2.2cqw,20px);padding:12px 22px 12px 16px;box-shadow:0 10px 22px -10px rgba(248,83,0,.75)}',
    '.sd-perde button svg{width:26px;height:26px}',
    '.sd-perde small{font-family:var(--ui);color:#3E4650;font-size:clamp(12px,1.7cqw,15px);max-width:34ch;background:rgba(255,255,255,.85);border-radius:8px;padding:4px 8px}',
    /* altyazı ve oynatıcı */
    '.sd-altyazi{min-height:3.4em;background:var(--kart);border:1px solid var(--cizgi);border-radius:12px;padding:10px 14px;font-size:15.5px;line-height:1.55}',
    '.sd-altyazi .k{border-radius:4px;transition:background-color .12s,color .12s}.sd-altyazi .k.su{background:var(--turuncu-y);color:var(--turuncu-k);box-shadow:0 0 0 2px var(--turuncu-y)}',
    '.sd-altyazi .bos{color:var(--gri)}',
    '.sd-oynatici{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
    '.yv{width:42px;height:42px;border-radius:50%;border:1px solid var(--cizgi);background:var(--kart);display:grid;place-items:center;color:var(--murekkep);padding:0}',
    '.yv svg{width:18px;height:18px}.yv.ana{width:54px;height:54px;border:0;background:var(--turuncu);color:#fff}.yv.ana svg{width:22px;height:22px}.yv:disabled{opacity:.4;cursor:default}',
    '.sd-ilerleme{flex:1 1 90px;min-width:76px;display:grid;gap:4px}',
    '.sd-ilerleme .cubuk{height:6px;border-radius:3px;background:var(--cizgi);overflow:hidden}.sd-ilerleme .cubuk i{display:block;height:100%;width:0;background:var(--turuncu);transition:width .3s}',
    '.sd-ilerleme span{font-size:13px;color:var(--gri);font-variant-numeric:tabular-nums}',
    /* ayarlar */
    '.sd-yan{display:grid;gap:14px;min-width:0}',
    '.kart{background:var(--kart);border:1px solid var(--cizgi);border-radius:14px;padding:16px;display:grid;gap:12px}',
    '.kart h3{margin:0;font-size:15.5px;letter-spacing:-.01em}',
    '.alan{display:grid;gap:6px}.alan>label,.alan>.etiket{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--gri)}',
    '.secim{display:flex;flex-wrap:wrap;gap:6px}',
    '.secim button{border:1px solid var(--cizgi);background:transparent;border-radius:999px;padding:6px 11px;font-size:14px;display:inline-flex;align-items:center;gap:6px}',
    '.secim button[aria-pressed="true"]{background:var(--murekkep);border-color:var(--murekkep);color:var(--kagit)}',
    '.ornek-tahta{width:16px;height:12px;border-radius:3px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.25)}',
    '.renkler{display:flex;gap:8px;flex-wrap:wrap}',
    '.renkler button{width:30px;height:30px;border-radius:50%;border:2px solid var(--cizgi);padding:0;box-shadow:inset 0 0 0 2px var(--kart)}',
    '.renkler button[aria-pressed="true"]{border-color:var(--murekkep);transform:scale(1.08)}',
    'select,input[type="text"],textarea{width:100%;border:1px solid var(--cizgi);background:var(--kagit);border-radius:10px;padding:9px 11px;font-size:15px}',
    'textarea{resize:vertical;line-height:1.5;min-height:170px}',
    '.satir{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.satir input[type="range"]{flex:1;accent-color:var(--turuncu)}',
    'output{font-variant-numeric:tabular-nums;font-size:14px;min-width:3.6em;text-align:right;color:var(--gri)}',
    '.anahtar{display:flex;align-items:center;gap:10px;font-size:15px}.anahtar input{width:18px;height:18px;accent-color:var(--turuncu)}',
    '.dugme{border:0;border-radius:10px;background:var(--turuncu);color:#fff;font-weight:700;padding:10px 14px;white-space:nowrap}',
    '.dugme.ikincil{background:transparent;color:var(--murekkep);border:1px solid var(--cizgi)}.dugme:disabled{opacity:.45;cursor:default}',
    '.not{margin:0;font-size:13.5px;color:var(--gri);line-height:1.5}.not b{color:var(--murekkep)}',
    '.uyari{margin:0;font-size:13.5px;line-height:1.5;padding:8px 10px;border-radius:10px;background:var(--turuncu-y);color:var(--turuncu-k)}',
    '.ozel-liste{list-style:none;margin:0;padding:0;display:grid;gap:6px}',
    '.ozel-liste li{display:flex;gap:8px;align-items:flex-start;font-size:14px;padding:8px 10px;border:1px dashed var(--cizgi);border-radius:10px}',
    '.ozel-liste li span{flex:1;min-width:0;overflow-wrap:anywhere}.ozel-liste button{border:0;background:transparent;color:var(--gri);padding:0 2px;font-size:18px;line-height:1}',
    /* kayıt stüdyosu */
    '.sd-studyo{position:fixed;inset:0;z-index:3;background:rgba(20,17,15,.55);display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:max(10px,env(safe-area-inset-top,0px)) 10px 10px}',
    '.sd[data-mod="studyo"] .sd-studyo{z-index:2147483000}',
    '.studyo-panel{background:var(--kagit);border-radius:16px;width:min(760px,100%);padding:16px;display:grid;gap:12px;margin:auto 0}',
    '.studyo-panel h3{margin:0;font-size:18px}',
    '.studyo-liste{list-style:none;margin:0;padding:0;display:grid;gap:8px;max-height:52vh;overflow:auto}',
    '.studyo-liste li{display:grid;grid-template-columns:auto 1fr;gap:4px 10px;align-items:start;padding:10px;border:1px solid var(--cizgi);border-radius:12px;background:var(--kart)}',
    '.studyo-liste li.su{border-color:var(--turuncu);box-shadow:0 0 0 2px var(--turuncu-y)}',
    '.studyo-liste .no{font-weight:800;color:var(--gri);font-variant-numeric:tabular-nums}',
    '.studyo-liste .ct{font-size:15px;line-height:1.5}.studyo-liste .durum{font-size:12.5px;color:var(--gri)}.studyo-liste .durum b{color:#17784A}',
    '.studyo-liste .islem{grid-column:2;display:flex;gap:6px;flex-wrap:wrap}',
    '.teleprompter{font-size:clamp(19px,4.6vw,26px);line-height:1.6;background:var(--kart);border:1px solid var(--cizgi);border-radius:12px;padding:16px;max-height:52vh;overflow:auto}',
    '.teleprompter p{margin:0 0 .9em}',
    '.kayit-isik{display:inline-block;width:10px;height:10px;border-radius:50%;background:#D3202E;animation:yanip 1s infinite}@keyframes yanip{50%{opacity:.25}}',
    '@media (prefers-reduced-motion:reduce){.w.on,.sd-tahta[data-kalem="tebesir"] .w.on{animation:none}.sd-ogretmen svg,.sd-ogretmen .gozler,.sd-ogretmen.yaziyor .kol{animation:none}.sd-silgi.calis{animation-duration:.01s}.sd-kalem{transition:none}}'
  ].join('\n');

  var IKON = {
    oynat: '<path d="M8 5v14l11-7z" fill="currentColor"/>', dur: '<path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"/>',
    geri: '<path d="M6 5h2v14H6zM19 5v14L9 12z" fill="currentColor"/>', ileri: '<path d="M16 5h2v14h-2zM5 5v14l10-7z" fill="currentColor"/>',
    bastan: '<path d="M12 5V2L7 6l5 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z" fill="currentColor"/>',
    tam: '<path d="M4 9V4h5v2H6v3zm10-5h6v5h-2V6h-4zM4 15h2v3h3v2H4zm14 3v-3h2v5h-5v-2z" fill="currentColor"/>',
    ayar: '<path d="M19.4 13a7.5 7.5 0 0 0 0-2l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-1.7-1L15 3.5h-4l-.4 2.5a7.6 7.6 0 0 0-1.7 1l-2.4-1-2 3.4L6.6 11a7.5 7.5 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 1.7 1l.4 2.5h4l.4-2.5a7.6 7.6 0 0 0 1.7-1l2.4 1 2-3.4zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" fill="currentColor" transform="translate(-1 0)"/>',
    kapat: '<path d="M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19l5.6-5.6 5.6 5.6 1.4-1.4-5.6-5.6L19 6.4 17.6 5 12 10.6z" fill="currentColor"/>'
  };
  function ikon(ad) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + IKON[ad] + '</svg>'; }
  function kalemSVG(tur, renk) {
    if (tur === 'tebesir') return '<svg viewBox="0 0 40 40"><g transform="rotate(-38 20 20)"><rect x="16" y="6" width="8" height="26" rx="3" fill="' + renk + '"/><path d="M16 9h8M16 15h8" stroke="rgba(0,0,0,.12)"/><path d="M16 32 L24 32 L22.5 34.5 L17.5 34.5 Z" fill="' + renk + '" opacity=".8"/></g></svg>';
    if (tur === 'dijital') return '<svg viewBox="0 0 40 40"><g transform="rotate(-38 20 20)"><rect x="17" y="2" width="6" height="28" rx="3" fill="#2B3036"/><rect x="17" y="4" width="6" height="5" rx="2" fill="' + renk + '"/><path d="M17 30 L23 30 L20 37 Z" fill="#9AA3AE"/><circle cx="20" cy="37" r="2.2" fill="' + renk + '" opacity=".75"/></g></svg>';
    return '<svg viewBox="0 0 40 40"><g transform="rotate(-38 20 20)"><rect x="16" y="2" width="8" height="26" rx="2.5" fill="' + renk + '"/><rect x="16" y="2" width="8" height="8" rx="2" fill="#14110F"/><path d="M16 28 L24 28 L21.5 35 L18.5 35 Z" fill="#14110F"/></g></svg>';
  }
  var OGRETMEN_SVG = '<svg viewBox="0 0 160 212" aria-hidden="true">' +
    '<path class="sac-arka" d="M47 96 C42 62 60 40 82 40 C106 40 122 60 117 96 C120 122 115 140 107 150 L57 150 C47 138 44 120 47 96 Z" fill="#3B2A22"/>' +
    '<path d="M22 212 C24 170 46 147 80 147 C114 147 136 170 138 212 Z" fill="#FFFFFF" stroke="#B9C0C8" stroke-width="2"/>' +
    '<path d="M64 148 L80 177 L96 148 C90 146 70 146 64 148 Z" fill="#F85300"/>' +
    '<path class="kravat" d="M77 150 L83 150 L85 158 L82 176 L78 176 L75 158 Z" fill="#1E4FB4"/>' +
    '<path d="M64 148 L75 173 L80 177 L70 151 Z" fill="#E9EDF1"/><path d="M96 148 L85 173 L80 177 L90 151 Z" fill="#E9EDF1"/>' +
    '<path d="M71 128 L71 146 C75 151 85 151 89 146 L89 128 Z" fill="#E7B28C"/>' +
    '<ellipse cx="53.5" cy="101" rx="4.5" ry="7" fill="#E7B28C"/><ellipse cx="106.5" cy="101" rx="4.5" ry="7" fill="#E7B28C"/>' +
    '<ellipse cx="80" cy="99" rx="27" ry="31" fill="#F1C6A2"/>' +
    '<path class="sac-erkek" d="M53 94 C51 70 64 61 80 61 C98 61 110 71 107 94 C103 81 93 76 80 76 C67 76 57 81 53 94 Z" fill="#3B2A22"/>' +
    '<path class="sac-kadin" d="M52 98 C49 70 64 59 82 60 C101 61 113 74 108 99 C104 84 96 74 84 72 C78 83 64 90 52 98 Z" fill="#3B2A22"/>' +
    '<g class="gozler" fill="#14110F"><ellipse cx="70" cy="101" rx="2.8" ry="3.4"/><ellipse cx="90" cy="101" rx="2.8" ry="3.4"/></g>' +
    '<g fill="none" stroke="#14110F" stroke-width="1.8"><circle cx="70" cy="101" r="8.5"/><circle cx="90" cy="101" r="8.5"/><path d="M78.5 100 Q80 98.5 81.5 100"/></g>' +
    '<g stroke="#3B2A22" stroke-width="2.2" stroke-linecap="round" fill="none"><path d="M63 89 Q70 86 76 89"/><path d="M84 89 Q90 86 97 89"/></g>' +
    '<path class="agiz-kapali" d="M73 117 Q80 122 87 117" fill="none" stroke="#8A3A26" stroke-width="2.4" stroke-linecap="round"/>' +
    '<ellipse class="agiz-acik" cx="80" cy="118.5" rx="5.2" ry="4.4" fill="#8A3A26"/>' +
    '<g class="kol"><path d="M40 178 C30 162 26 148 30 134" fill="none" stroke="#B9C0C8" stroke-width="17" stroke-linecap="round"/>' +
    '<path d="M40 178 C30 162 26 148 30 134" fill="none" stroke="#FFFFFF" stroke-width="13" stroke-linecap="round"/>' +
    '<circle cx="30" cy="130" r="7.5" fill="#F1C6A2"/><g class="el-kalem" transform="rotate(-28 30 122)"><rect x="27" y="104" width="6.5" height="19" rx="2" fill="#1E4FB4"/><rect x="27" y="99" width="6.5" height="7" rx="1.6" fill="#14110F"/></g></g></svg>';

  function sablon(o) {
    var pencere = o.mod === 'pencere';
    var sekmeler = '';
    if (!pencere && o.sekmeler && o.sekmeler.length > 1) {
      sekmeler = '<div class="sd-sekmeler" role="tablist" aria-label="Bölüm">' + o.sekmeler.map(function (s) {
        return '<button role="tab" data-ders="' + esc(s.id) + '" aria-selected="false">' + esc(s.ad) + '</button>';
      }).join('') + '</div>';
    }
    return '<div class="sd" data-mod="' + (pencere ? 'pencere' : 'satir') + '"><div class="sd-panel" role="' + (pencere ? 'dialog' : 'region') + '" aria-label="Sesli ders">' +
      '<div class="sd-ust">' + (pencere ? '<h2 data-r="baslik">Sesli anlatım</h2>' : (o.baslik ? '<h2>' + esc(o.baslik) + '</h2>' : '')) + sekmeler +
        '<button type="button" class="sd-kucuk" data-r="ayarDugme" aria-pressed="false" aria-label="Ayarlar">' + ikon('ayar').replace('<svg', '<svg width="16" height="16"') + '<span class="etk">Ayarlar</span></button>' +
        (pencere ? '<button type="button" class="sd-kucuk" data-r="kapat" aria-label="Kapat">' + ikon('kapat').replace('<svg', '<svg width="16" height="16"') + '<span class="etk">Kapat</span></button>' : '') +
      '</div>' +
      '<div class="sd-duzen"><section class="sd-alan">' +
        '<div class="sd-cerceve" data-r="cerceve"><div class="sd-tahta" data-r="tahta">' +
          '<div class="sd-doku"></div><div class="sd-iz" data-r="iz"></div>' +
          '<div class="sd-ic"><div class="sd-yazi" data-r="yazi"></div></div>' +
          '<div class="sd-sahne" data-r="sahne" aria-hidden="true"></div>' +
          '<div class="sd-kalem" data-r="kalem" aria-hidden="true"></div>' +
          '<div class="sd-silgi" data-r="silgi"><div></div></div>' +
          '<div class="sd-ogretmen kadin" data-r="ogretmen">' + OGRETMEN_SVG + '</div>' +
          '<div class="sd-perde" data-r="perde"><div class="sd-perde-ic"><button type="button" data-r="perdeDugme"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="rgba(255,255,255,.22)"/><path d="M9.5 7.5 L17 12 L9.5 16.5 Z" fill="#fff"/></svg><span data-r="perdeYazi">Dersi başlat</span></button><small data-r="perdeAlt">Ses açıkken başlat. Tahtaya yazılanlar sesle birlikte ilerler.</small></div></div>' +
        '</div><div class="sd-raf" data-r="raf" aria-hidden="true"></div></div>' +
        '<div class="sd-altyazi" data-r="altyazi"><span class="bos">Altyazı burada görünür: konuşulan kelime renklenir.</span></div>' +
        '<div class="sd-oynatici">' +
          '<button type="button" class="yv" data-r="geri" aria-label="Önceki adım">' + ikon('geri') + '</button>' +
          '<button type="button" class="yv ana" data-r="oynat" aria-label="Başlat">' + ikon('oynat') + '</button>' +
          '<button type="button" class="yv" data-r="ileri" aria-label="Sonraki adım">' + ikon('ileri') + '</button>' +
          '<button type="button" class="yv" data-r="bastan" aria-label="Baştan başlat">' + ikon('bastan') + '</button>' +
          '<div class="sd-ilerleme"><div class="cubuk"><i data-r="cubuk"></i></div><span data-r="adimYazi">Adım 0 / 0</span></div>' +
          '<button type="button" class="yv" data-r="tamEkran" aria-label="Tam ekran" hidden>' + ikon('tam') + '</button>' +
        '</div>' +
      '</section>' +
      '<aside class="sd-yan" data-r="yan" aria-label="Ayarlar">' +
        (o.metin ? '<section class="kart" data-r="metinKart" hidden><h3>Kendi metnini anlat</h3><textarea data-r="metin" aria-label="Anlatılacak metin"></textarea>' +
          '<div class="satir"><button type="button" class="dugme" data-r="metinDugme">Tahtada anlat</button><button type="button" class="dugme ikincil" data-r="ornekDugme">Örneği geri yükle</button></div>' +
          '<p class="not">Her cümle ayrı bir adım olur. Formüller tahtada alt ve üst simgelerle yazılır, seste adlarıyla okunur: NaCl → “sodyum klorür”.</p></section>' : '') +
        '<section class="kart"><h3>Tahta ve kalem</h3>' +
          '<div class="alan"><span class="etiket">Tahta</span><div class="secim" data-r="tahtalar"></div></div>' +
          '<div class="alan"><span class="etiket">Kalem</span><div class="secim" data-r="kalemler"></div></div>' +
          '<div class="alan"><span class="etiket">Kalem rengi</span><div class="renkler" data-r="renkler"></div></div>' +
          '<div class="alan"><label>Yazı karakteri<select data-r="yaziSec" style="margin-top:6px"></select></label></div>' +
        '</section>' +
        '<section class="kart"><h3>Ses ve anlatım</h3>' +
          '<div class="alan"><span class="etiket">Ses kaynağı</span><div class="secim" data-r="kaynaklar"><button type="button" data-kaynak="cihaz">Cihaz sesi</button><button type="button" data-kaynak="kayit">Öğretmen kaydı</button></div><p class="not" data-r="kaynakNot"></p></div>' +
          '<div class="alan"><span class="etiket">Ses</span><div class="secim" data-r="cinsler"><button type="button" data-cins="k">Kadın</button><button type="button" data-cins="e">Erkek</button></div></div>' +
          '<div class="alan"><label>Cihazdaki Türkçe sesler<select data-r="sesSec" style="margin-top:6px"></select></label></div>' +
          '<div class="alan"><span class="etiket">Anlatım tarzı</span><div class="secim" data-r="tarzlar"></div></div>' +
          '<div class="alan"><label>Hız</label><div class="satir"><input type="range" data-r="hiz" min="0.7" max="1.4" step="0.05" aria-label="Hız"><output data-r="hizDeger">1,00×</output></div></div>' +
          '<label class="anahtar"><input type="checkbox" data-r="ogrGoster"> Öğretmen figürünü göster</label>' +
          '<p class="uyari" data-r="sesNot" hidden></p>' +
          '<button type="button" class="dugme ikincil" data-r="studyoAc">🎙️ Kendi sesinle kaydet</button>' +
        '</section>' +
        '<section class="kart"><h3>Cümle ekle</h3>' +
          '<div class="alan"><label>Tahtaya yazılıp seslendirilecek cümle<input type="text" data-r="cumle" placeholder="Örn. Bu tepkime sınavlarda sık çıkar." maxlength="240" autocomplete="off" style="margin-top:6px"></label></div>' +
          '<button type="button" class="dugme" data-r="cumleDugme">Ekle ve seslendir</button>' +
          '<p class="not">Cümle, şu anki adımdan hemen sonra gelir. Formülleri düz yazabilirsin: AgCl, Pb2+, SO42−.</p>' +
          '<ul class="ozel-liste" data-r="ozelListe"></ul>' +
        '</section>' +
      '</aside></div></div>' +
      '<div class="sd-studyo" data-r="studyo" hidden><div class="studyo-panel" role="dialog" aria-label="Kayıt stüdyosu">' +
        '<div class="sd-ust"><h3 style="flex:1">🎙️ Kendi sesinle kaydet</h3><button type="button" class="sd-kucuk" data-r="studyoKapat">' + ikon('kapat').replace('<svg', '<svg width="16" height="16"') + ' Kapat</button></div>' +
        '<div class="sd-sekmeler" role="tablist"><button role="tab" data-st="ders" aria-selected="true">Ders cümleleri</button><button role="tab" data-st="ornek" aria-selected="false">Ses kopyası için örnek</button></div>' +
        '<div data-r="stDers">' +
          '<p class="not" style="margin-bottom:8px">Her cümleyi kendi sesinle oku: <b>● Kaydet</b>’e bas, cümleyi oku, <b>■ Bitir</b>’e bas. Sessiz bir odada, telefonu ağzından bir karış uzakta tut. Kayıtlar bu cihazda saklanır; ders “Öğretmen kaydı” seçiliyken senin sesinle oynar.</p>' +
          '<div class="satir" style="margin-bottom:10px"><button type="button" class="dugme" data-r="siraKaydet">● Sırayla kaydet</button><button type="button" class="dugme ikincil" data-r="paketIndir">Kayıtları indir</button></div>' +
          '<p class="uyari" data-r="studyoNot" hidden></p>' +
          '<ul class="studyo-liste" data-r="studyoListe"></ul>' +
          '<p class="not" style="margin-top:8px">Kayıtlar yalnızca bu cihazda durur. Öğrencilerin de duyması için “Kayıtları indir” ile alınan dosya sitenin <b>sesli</b> klasörüne eklenir.</p>' +
        '</div>' +
        '<div data-r="stOrnek" hidden>' +
          '<p class="not" style="margin-bottom:8px">Yeni yazılan metinlerin de senin sesinle okunması için bir ses servisinde (ör. ElevenLabs) sesinin kopyası oluşturulur. Servis bunun için 1–5 dakikalık temiz bir kayıt ister. Aşağıdaki metni doğal ders anlatır gibi oku, kaydı indirip servise yükle.</p>' +
          '<div class="satir" style="margin-bottom:10px"><button type="button" class="dugme" data-r="ornekKaydet">● Kaydı başlat</button><button type="button" class="dugme ikincil" data-r="ornekDinle" disabled>▶ Dinle</button><button type="button" class="dugme ikincil" data-r="ornekIndir" disabled>Kaydı indir</button><span class="not" data-r="ornekSure"></span></div>' +
          '<div class="teleprompter" data-r="okuma"></div>' +
        '</div>' +
      '</div></div>' +
    '</div>';
  }

  /* ================= oynatıcı ================= */
  function Oynatici(host, opt) {
    var self = this;
    this.opt = opt || {};
    this.host = host;
    this.kok = host.shadowRoot || (host.attachShadow ? host.attachShadow({ mode: 'open' }) : host);
    this.dersler = this.opt.dersler || {};
    var sekmeler = Object.keys(this.dersler).map(function (id) { return { id: id, ad: self.dersler[id].sekme || self.dersler[id].baslik }; });
    if (this.opt.metin) sekmeler.push({ id: 'metin', ad: 'Kendi metnin' });
    this.kok.innerHTML = '<style>' + CSS + '</style>' + sablon({ mod: this.opt.mod, sekmeler: sekmeler, metin: this.opt.metin, baslik: this.opt.baslik });
    this.r = {};
    Array.prototype.forEach.call(this.kok.querySelectorAll('[data-r]'), function (el) { self.r[el.getAttribute('data-r')] = el; });
    this.kokEl = this.kok.querySelector('.sd');
    if (this.opt.studyo === false) this.r.studyoAc.hidden = true;
    this.temaKoy(this.opt.tema);
    this.P = { id: null, ders: null, adimlar: [], i: -1, calisiyor: false, jeton: 0 };
    this.adimListeleri = {};
    this.sahneDurum = { tur: null, durum: {}, iyonlar: [], dongu: null };
    this.agizSaat = null;
    this.altKelimeler = [];
    this.kayitVar = {};
    Oynatici.hepsi.push(this);
    if (!TEBESIR_MASKE) { TEBESIR_MASKE = gurultu(120, 0.2); TEBESIR_TOZ = gurultu(160, 0.04, 70); }
    this.r.tahta.style.setProperty('--maske', TEBESIR_MASKE ? 'url(' + TEBESIR_MASKE + ')' : 'none');
    this.r.tahta.style.setProperty('--toz', TEBESIR_TOZ ? 'url(' + TEBESIR_TOZ + ')' : 'none');
    this.bagla();
    if (this.opt.mod !== 'pencere' && document.body) {
      // Kayıt stüdyosu sayfanın en üstünde açılsın (filtreli ya da kaydırılan kapsayıcıların dışında)
      var ph = document.createElement('div'); ph.setAttribute('data-sesli-ders', 'studyo');
      ph.style.cssText = 'position:relative;z-index:2147482500';
      document.body.appendChild(ph);
      var pk = ph.attachShadow ? ph.attachShadow({ mode: 'open' }) : ph;
      pk.innerHTML = '<style>' + CSS + '</style><div class="sd" data-mod="studyo"></div>';
      this.studyoKok = pk.querySelector('.sd');
      this.studyoKok.appendChild(this.r.studyo);
      this.temaKoy(this.opt.tema);
    }
    this.gorunumUygula();
    this.sesListesi();
    var klasor = this.opt.kayitKlasoru != null ? this.opt.kayitKlasoru : (window.SESLI_DERS_KAYIT_KLASORU || (BETIK_DIZIN ? BETIK_DIZIN + 'sesli/' : false));
    if (klasor) Yayin.yukle(klasor).then(function () { self.kayitDurumu(); });
  }
  Oynatici.hepsi = [];
  Oynatici.prototype.temaKoy = function (t) {
    [this.kokEl, this.studyoKok].forEach(function (el) { if (!el) return; if (t) el.setAttribute('data-tema', t); else el.removeAttribute('data-tema'); });
  };

  Oynatici.prototype.bagla = function () {
    var self = this, r = this.r;
    r.oynat.addEventListener('click', function () { self.oynatDuraklat(); });
    r.perdeDugme.addEventListener('click', function () { self.calis(self.P.i >= self.P.adimlar.length ? 0 : Math.max(0, self.P.i)); });
    r.ileri.addEventListener('click', function () { self.calis(Math.min(self.P.adimlar.length - 1, self.P.i + 1)); });
    r.geri.addEventListener('click', function () { self.calis(Math.max(0, self.P.i - 1)); });
    r.bastan.addEventListener('click', function () { self.calis(0); });
    r.ayarDugme.addEventListener('click', function () {
      var acik = !self.kokEl.classList.contains('ayar-acik');
      self.kokEl.classList.toggle('ayar-acik', acik); r.ayarDugme.setAttribute('aria-pressed', String(acik));
      if (self.opt.mod !== 'pencere') { if (acik) r.yan.scrollIntoView({ behavior: 'smooth', block: 'start' }); self.kokEl.classList.remove('ayar-acik'); r.ayarDugme.setAttribute('aria-pressed', 'false'); }
    });
    if (r.kapat) r.kapat.addEventListener('click', function () { self.kapat(); });
    Array.prototype.forEach.call(this.kok.querySelectorAll('.sd-sekmeler [data-ders]'), function (b) { b.addEventListener('click', function () { self.yukle(b.getAttribute('data-ders')); }); });
    r.cumleDugme.addEventListener('click', function () { self.cumleEkle(); });
    r.cumle.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); self.cumleEkle(); } });
    r.ozelListe.addEventListener('click', function (e) { var b = e.target.closest('[data-sil]'); if (b) self.cumleSil(+b.getAttribute('data-sil')); });
    if (r.metin) {
      r.metin.value = depo.al('metin', ORNEK_METIN);
      r.metin.addEventListener('input', function () { depo.yaz('metin', r.metin.value); });
      r.metinDugme.addEventListener('click', function () { self.adimListeleri.metin = metindenDers(r.metin.value).adimlar; self.P.adimlar = self.adimListeleri.metin; self.P.i = -1; self.ozelListeCiz(); self.calis(0); });
      r.ornekDugme.addEventListener('click', function () { r.metin.value = ORNEK_METIN; depo.yaz('metin', ORNEK_METIN); });
    }
    // ayarlar
    r.tahtalar.addEventListener('click', function (e) { var b = e.target.closest('[data-tahta]'); if (!b) return; ayar.tahta = b.getAttribute('data-tahta'); ayar.kalem = null; ayar.renk = 0; depo.yaz('tahta', ayar.tahta); depo.yaz('kalem', null); depo.yaz('renk', 0); Oynatici.hepsi.forEach(function (o) { o.gorunumUygula(); }); });
    r.kalemler.addEventListener('click', function (e) { var b = e.target.closest('[data-kalem]'); if (!b) return; ayar.kalem = b.getAttribute('data-kalem'); ayar.renk = 0; depo.yaz('kalem', ayar.kalem); depo.yaz('renk', 0); Oynatici.hepsi.forEach(function (o) { o.gorunumUygula(); }); });
    r.renkler.addEventListener('click', function (e) { var b = e.target.closest('[data-renk]'); if (!b) return; ayar.renk = +b.getAttribute('data-renk'); depo.yaz('renk', ayar.renk); Oynatici.hepsi.forEach(function (o) { o.gorunumUygula(); }); });
    r.yaziSec.addEventListener('change', function () { ayar.yazi = r.yaziSec.value; depo.yaz('yazi', ayar.yazi); Oynatici.hepsi.forEach(function (o) { o.gorunumUygula(); }); });
    r.kaynaklar.addEventListener('click', function (e) { var b = e.target.closest('[data-kaynak]'); if (!b) return; ayar.kaynak = b.getAttribute('data-kaynak'); depo.yaz('kaynak', ayar.kaynak); Oynatici.hepsi.forEach(function (o) { o.sesListesi(); o.kayitDurumu(); }); });
    r.cinsler.addEventListener('click', function (e) { var b = e.target.closest('[data-cins]'); if (!b) return; ayar.cins = b.getAttribute('data-cins'); ayar.sesAdi = ''; depo.yaz('cins', ayar.cins); depo.yaz('ses', ''); Oynatici.hepsi.forEach(function (o) { o.sesListesi(); o.gorunumUygula(); }); });
    r.sesSec.addEventListener('focus', function () { if (!Ses.tr.length) self.sesListesi(); });
    r.sesSec.addEventListener('change', function () {
      ayar.sesAdi = r.sesSec.value; depo.yaz('ses', ayar.sesAdi);
      var v = Ses.tr.filter(function (x) { return x.voiceURI === ayar.sesAdi; })[0];
      if (v && Ses.cinsi(v) !== '?') { ayar.cins = Ses.cinsi(v); depo.yaz('cins', ayar.cins); }
      Oynatici.hepsi.forEach(function (o) { o.sesListesi(); o.gorunumUygula(); });
    });
    r.tarzlar.addEventListener('click', function (e) { var b = e.target.closest('[data-tarz]'); if (!b) return; ayar.tarz = +b.getAttribute('data-tarz'); depo.yaz('tarz', ayar.tarz); Oynatici.hepsi.forEach(function (o) { o.sesListesi(); }); });
    r.hiz.addEventListener('input', function () { ayar.hiz = +r.hiz.value; depo.yaz('hiz', ayar.hiz); Oynatici.hepsi.forEach(function (o) { o.sesListesi(); }); });
    r.ogrGoster.addEventListener('change', function () { ayar.ogretmen = r.ogrGoster.checked; depo.yaz('ogretmen', ayar.ogretmen); Oynatici.hepsi.forEach(function (o) { o.gorunumUygula(); }); });
    r.studyoAc.addEventListener('click', function () { self.studyoAc(); });
    r.studyoKapat.addEventListener('click', function () { self.studyoKapat(); });
    var stDugmeleri = this.kok.querySelectorAll('[data-st]');
    Array.prototype.forEach.call(stDugmeleri, function (b) {
      b.addEventListener('click', function () {
        Array.prototype.forEach.call(stDugmeleri, function (x) { x.setAttribute('aria-selected', String(x === b)); });
        r.stDers.hidden = b.getAttribute('data-st') !== 'ders'; r.stOrnek.hidden = b.getAttribute('data-st') !== 'ornek';
      });
    });
    r.studyoListe.addEventListener('click', function (e) { var b = e.target.closest('[data-is]'); if (b) self.studyoIslem(b.getAttribute('data-is'), +b.getAttribute('data-i')); });
    r.siraKaydet.addEventListener('click', function () { self.siraliKayit(); });
    r.paketIndir.addEventListener('click', function () { self.paketIndir(); });
    r.ornekKaydet.addEventListener('click', function () { self.ornekKayit(); });
    r.ornekDinle.addEventListener('click', function () { if (self.ornekBlob) { var a = new Audio(URL.createObjectURL(self.ornekBlob)); a.play().catch(function () {}); } });
    r.ornekIndir.addEventListener('click', function () { if (self.ornekBlob) indir(self.ornekBlob, 'ses-ornegi.' + kayitUzanti(self.ornekBlob.type)); });
    r.okuma.innerHTML = ORNEK_OKUMA.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('');
    this.kok.addEventListener('keydown', function (e) {
      if (/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test((e.target && e.target.tagName) || '')) return;
      if (e.key === ' ') { e.preventDefault(); self.oynatDuraklat(); }
      else if (e.key === 'ArrowRight') self.calis(Math.min(self.P.adimlar.length - 1, self.P.i + 1));
      else if (e.key === 'ArrowLeft') self.calis(Math.max(0, self.P.i - 1));
    });
    if (document.fullscreenEnabled && r.cerceve.requestFullscreen) {
      r.tamEkran.hidden = false;
      r.tamEkran.addEventListener('click', function () {
        if (document.fullscreenElement) document.exitFullscreen().catch(function () {});
        else r.cerceve.requestFullscreen().catch(function () {});
      });
    }
  };

  /* ---- görünüm: tahta, kalem, renk, yazı ---- */
  Oynatici.prototype.gorunumUygula = function () {
    var r = this.r, t = TAHTALAR[ayar.tahta], kt = kalemTuru(), k = KALEMLER[kt];
    var renkler = k.renkler, ri = Math.min(ayar.renk || 0, renkler.length - 1), anaRenk = renkler[ri][1];
    var y = YAZILAR.filter(function (x) { return x.id === ayar.yazi; })[0] || YAZILAR[0];
    yaziYukle(y);
    var tahta = r.tahta;
    tahta.style.setProperty('--zemin', t.zemin);
    tahta.style.setProperty('--k-yazi', anaRenk);
    var v = k.vurgu, ayni = function (a, b) { return a.toLowerCase() === b.toLowerCase(); };
    tahta.style.setProperty('--k-mavi', ayni(v.mavi, anaRenk) ? v.mor : v.mavi);
    tahta.style.setProperty('--k-kirmizi', ayni(v.kirmizi, anaRenk) ? v.turuncu : v.kirmizi);
    tahta.style.setProperty('--k-yesil', ayni(v.yesil, anaRenk) ? v.mavi : v.yesil);
    tahta.style.setProperty('--k-turuncu', v.turuncu);
    tahta.style.setProperty('--k-mor', ayni(v.mor, anaRenk) ? v.mavi : v.mor);
    tahta.style.setProperty('--k-gri', v.gri);
    tahta.style.setProperty('--aile', y.aile);
    tahta.style.setProperty('--olcek', String(y.olcek));
    tahta.setAttribute('data-kalem', kt);
    tahta.setAttribute('data-izgara', t.izgara ? '1' : '0');
    tahta.setAttribute('data-cerceve', t.cerceve);
    tahta.classList.toggle('koyu', !!t.koyu);
    tahta.classList.toggle('ogretmensiz', !ayar.ogretmen);
    r.cerceve.setAttribute('data-cerceve', t.cerceve);
    r.kalem.innerHTML = kalemSVG(kt, anaRenk);
    // raf: kalemler ya da tebeşirler
    var raf = '';
    if (kt === 'tebesir') raf = renkler.slice(0, 4).map(function (c, i) { return '<i style="left:calc(12% + ' + (i * 34) + 'px);width:26px;background:' + c[1] + '"></i>'; }).join('') + '<i style="left:58%;width:58px;height:9px;bottom:6px;background:linear-gradient(180deg,#6B4A2B 55%,#D8D2C6 55%)"></i>';
    else if (kt === 'dijital') raf = renkler.slice(0, 4).map(function (c, i) { return '<i style="left:calc(12% + ' + (i * 44) + 'px);width:36px;height:5px;bottom:8px;background:linear-gradient(90deg,#2B3036 72%,' + c[1] + ' 72%)"></i>'; }).join('');
    else raf = renkler.slice(0, 3).map(function (c, i) { return '<i style="left:calc(14% + ' + (i * 54) + 'px);width:46px;background:linear-gradient(90deg,' + c[1] + ' 70%,#14110F 70%)"></i>'; }).join('') + '<i style="left:58%;width:58px;height:9px;bottom:6px;background:linear-gradient(180deg,#3B4450 55%,#D9DDE2 55%)"></i>';
    r.raf.innerHTML = raf;
    // öğretmenin elindeki kalem
    var elk = this.kok.querySelector('.el-kalem rect');
    if (elk) elk.setAttribute('fill', anaRenk);
    this.ogretmenCins(ayar.cins);
    r.ogretmen.hidden = !ayar.ogretmen;
    r.ogrGoster.checked = !!ayar.ogretmen;
    // seçim düğmeleri
    r.tahtalar.innerHTML = Object.keys(TAHTALAR).map(function (id) {
      var x = TAHTALAR[id]; return '<button type="button" data-tahta="' + id + '" aria-pressed="' + (id === ayar.tahta) + '"><span class="ornek-tahta" style="background:' + (x.izgara ? 'repeating-linear-gradient(0deg,#cfdbe7 0 1px,#fff 1px 4px)' : x.zemin) + '"></span>' + x.ad + '</button>';
    }).join('');
    r.kalemler.innerHTML = Object.keys(KALEMLER).map(function (id) { return '<button type="button" data-kalem="' + id + '" aria-pressed="' + (id === kt) + '">' + KALEMLER[id].ad + '</button>'; }).join('');
    r.renkler.innerHTML = renkler.map(function (c, i) { return '<button type="button" data-renk="' + i + '" aria-pressed="' + (i === ri) + '" aria-label="' + c[0] + '" title="' + c[0] + '" style="background:' + c[1] + '"></button>'; }).join('');
    if (!r.yaziSec.options.length) r.yaziSec.innerHTML = YAZILAR.map(function (x) { return '<option value="' + x.id + '">' + x.ad + '</option>'; }).join('');
    r.yaziSec.value = y.id;
    r.tarzlar.innerHTML = TARZLAR.map(function (x, i) { return '<button type="button" data-tarz="' + i + '" aria-pressed="' + (i === ayar.tarz) + '">' + x.ad + '</button>'; }).join('');
    r.hiz.value = ayar.hiz; r.hizDeger.textContent = Number(ayar.hiz).toFixed(2).replace('.', ',') + '×';
    Array.prototype.forEach.call(r.cinsler.querySelectorAll('[data-cins]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-cins') === ayar.cins)); });
    Array.prototype.forEach.call(r.kaynaklar.querySelectorAll('[data-kaynak]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-kaynak') === ayar.kaynak)); });
  };
  Oynatici.prototype.sesListesi = function () {
    var r = this.r;
    Ses.yukle();
    var gruplar = { k: [], e: [], '?': [] };
    Ses.tr.forEach(function (v) { gruplar[Ses.cinsi(v)].push(v); });
    var opt = function (v) { return '<option value="' + esc(v.voiceURI) + '">' + esc(Ses.ad(v)) + (Ses.dogal(v) ? ' · doğal' : '') + '</option>'; };
    r.sesSec.innerHTML = '<option value="">Otomatik seç</option>' +
      (gruplar.k.length ? '<optgroup label="Kadın sesleri">' + gruplar.k.map(opt).join('') + '</optgroup>' : '') +
      (gruplar.e.length ? '<optgroup label="Erkek sesleri">' + gruplar.e.map(opt).join('') + '</optgroup>' : '') +
      (gruplar['?'].length ? '<optgroup label="Diğer sesler">' + gruplar['?'].map(opt).join('') + '</optgroup>' : '');
    r.sesSec.value = Ses.tr.some(function (v) { return v.voiceURI === ayar.sesAdi; }) ? ayar.sesAdi : '';
    var s = Ses.sec();
    r.sesNot.textContent = s.not || ''; r.sesNot.hidden = !s.not;
    r.sesSec.disabled = !Ses.tr.length;
    Array.prototype.forEach.call(r.kaynaklar.querySelectorAll('[data-kaynak]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-kaynak') === ayar.kaynak)); });
  };

  /* ---- öğretmen ---- */
  Oynatici.prototype.ogretmenCins = function (c) { var o = this.r.ogretmen; o.classList.toggle('kadin', c === 'k'); o.classList.toggle('erkek', c !== 'k'); };
  Oynatici.prototype.konusuyor = function (v) {
    var o = this.r.ogretmen; clearInterval(this.agizSaat); o.classList.remove('agiz');
    if (v && !AZ) this.agizSaat = setInterval(function () { o.classList.toggle('agiz', Math.random() < 0.62); }, 115);
  };
  Oynatici.prototype.yaziyor = function (v) { this.r.ogretmen.classList.toggle('yaziyor', !!v); };
  Oynatici.prototype.gosteriyor = function (v) { this.r.ogretmen.classList.toggle('gosteriyor', !!v); };

  /* ---- tahta ---- */
  Oynatici.prototype.temizle = function () { var y = this.r.yazi; y.innerHTML = '<i class="sd-yer1" aria-hidden="true"></i><i class="sd-yer2" aria-hidden="true"></i>'; y.classList.remove('siliniyor'); y.style.removeProperty('--sig'); };
  Oynatici.prototype.tasiyor = function () { var y = this.r.yazi; return y.scrollHeight > y.clientHeight + 2; };
  // Tek başına tahtaya sığmayan uzun soru ya da şekil: yazıyı küçült
  Oynatici.prototype.sigdir = function () {
    var y = this.r.yazi, olcek = parseFloat(y.style.getPropertyValue('--sig')) || 1;
    while (this.tasiyor() && olcek > 0.5) { olcek = Math.round((olcek - 0.08) * 100) / 100; y.style.setProperty('--sig', String(olcek)); }
  };
  Oynatici.prototype.sil = function (anlik) {
    var self = this, r = this.r;
    if (anlik || AZ || !r.yazi.querySelector('.blok')) { this.temizle(); return Promise.resolve(); }
    r.silgi.classList.remove('calis'); void r.silgi.offsetWidth; r.silgi.classList.add('calis');
    r.yazi.classList.add('siliniyor');
    if (r.tahta.classList.contains('koyu')) { var iz = +(r.iz.dataset.d || 0); iz = Math.min(0.16, iz + 0.04); r.iz.dataset.d = iz; r.iz.style.opacity = iz; r.iz.style.transform = 'rotate(' + (Math.random() * 6 - 3) + 'deg)'; }
    return sleep(700).then(function () { self.temizle(); r.silgi.classList.remove('calis'); });
  };
  Oynatici.prototype.blok = function (b, oto) {
    var el = document.createElement('div');
    el.className = 'blok' + (b.c ? ' b-' + b.c : '');
    if (b.html != null) { el.innerHTML = b.html; stilTemizle(el); kelimele(el); return el; }
    el.innerHTML = sozcukler(b.t).map(function (x, i) {
      return (i && !x.bitisik ? ' ' : '') + '<span class="w"' + (x.k ? ' data-k="' + x.k + '"' : '') + '>' + (oto ? otomatikHTML(x.t) : isaretHTML(x.t)) + '</span>';
    }).join('');
    return el;
  };
  // Sayfadan gelen HTML'deki sınıf ve satır içi biçimler tahtada çakışmasın (şekillerin içi olduğu gibi kalır)
  function stilTemizle(kok) {
    Array.prototype.forEach.call(kok.querySelectorAll('*'), function (n) {
      if (n.closest('svg')) return;
      ['style', 'class', 'id', 'onclick', 'width', 'height', 'align', 'bgcolor', 'color'].forEach(function (a) { if (n.hasAttribute(a) && !(n.tagName === 'IMG' && /width|height/.test(a))) n.removeAttribute(a); });
      if (n.tagName === 'FONT') { while (n.firstChild) n.parentNode.insertBefore(n.firstChild, n); n.remove(); }
    });
  }
  function altUstHTML(t) {
    return esc(t).replace(/[₀-₉]+/g, function (m) { return '<sub>' + rakamCevir(m, ALT_RAKAM) + '</sub>'; })
      .replace(/[⁰-⁹¹²³⁺⁻]+/g, function (m) { return '<sup>' + rakamCevir(m, UST_RAKAM).replace(/⁺/g, '+').replace(/⁻/g, '−') + '</sup>'; });
  }
  function kelimele(kok) {
    (function gez(n) {
      Array.prototype.slice.call(n.childNodes).forEach(function (c) {
        if (c.nodeType === 3) {
          var parcalar = c.nodeValue.split(/(\s+)/);
          var frag = document.createDocumentFragment();
          parcalar.forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) frag.appendChild(document.createTextNode(' '));
            else { var s = document.createElement('span'); s.className = 'w'; if (/[₀-₉⁰-⁹¹²³⁺⁻]/.test(p)) s.innerHTML = altUstHTML(p); else s.textContent = p; frag.appendChild(s); }
          });
          n.replaceChild(frag, c);
        } else if (c.nodeType === 1) {
          var t = c.tagName.toLowerCase();
          if (t === 'svg' || t === 'table' || t === 'img' || t === 'canvas') { c.classList.add('w'); c.classList.add('w-blok'); return; }
          if (t === 'script' || t === 'style') { c.remove(); return; }
          if (c.hasAttribute('id')) c.removeAttribute('id');
          gez(c);
        }
      });
    })(kok);
  }
  Oynatici.prototype.ekle = function (bloklar, oto, anlik) {
    var self = this, y = this.r.yazi, els = (bloklar || []).map(function (b) { return self.blok(b, oto); });
    els.forEach(function (el) { y.appendChild(el); });
    if (els.length && this.tasiyor() && y.querySelectorAll('.blok').length > els.length) {
      els.forEach(function (el) { el.remove(); });
      return this.sil(anlik).then(function () { els.forEach(function (el) { y.appendChild(el); }); self.sigdir(); return els; });
    }
    if (els.length) this.sigdir();
    return Promise.resolve(els);
  };
  Oynatici.prototype.goster = function (kelimeler, n, anlik) {
    for (var i = 0; i < kelimeler.length; i++) {
      var w = kelimeler[i];
      if (i < n && !w.classList.contains('on')) { if (anlik) w.classList.add('anlik'); w.classList.add('on'); var b = w.closest('.blok'); if (b) b.classList.add('acik'); }
    }
    var sonW = kelimeler[Math.min(n, kelimeler.length) - 1];
    if (sonW && !anlik) {
      var rr = sonW.getBoundingClientRect(), t = this.r.tahta.getBoundingClientRect(), kh = this.r.kalem.getBoundingClientRect().height || 20;
      this.r.kalem.style.transform = 'translate(' + (rr.right - t.left - 2) + 'px,' + (rr.bottom - t.top - kh * 0.9) + 'px)';
    }
  };
  Oynatici.prototype.kalemGoster = function (v) { this.r.kalem.classList.toggle('aktif', !!v); };
  Oynatici.prototype.isaretle = function (anahtarlar, sinif, anlik) {
    var y = this.r.yazi;
    (anahtarlar || []).forEach(function (k, i) {
      Array.prototype.forEach.call(y.querySelectorAll('[data-k="' + k + '"]'), function (el) {
        if (anlik) { el.classList.add('anlik'); el.classList.add(sinif); return; }
        setTimeout(function () { el.classList.add(sinif); }, i * 260);
      });
    });
  };

  /* ---- deney sahneleri ---- */
  var SAHNE_AYAR = {
    agcl: { beher: 'AgNO₃(suda)', tup: 'NaCl(suda)', renk: '#FFFFFF', kenar: '#7E8E9E', ad: 'AgCl(k)', sivi: '#D7E8F5', bulanik: '#EEF2F5', akis: '#9EC3E2' },
    pbi2: { beher: 'Pb(NO₃)₂(suda)', tup: 'KI(suda)', renk: '#F8C913', kenar: '#B98C00', ad: 'PbI₂(k)', sivi: '#DCEAF5', bulanik: '#F6E38A', akis: '#A6C8E4' }
  };
  var IYON_TUR = {
    ag: { ad: 'Ag⁺', r: 13, renk: '#B7BFC9', yazi: '#1F2733' }, cl: { ad: 'Cl⁻', r: 15, renk: '#3E9B57', yazi: '#FFFFFF' },
    na: { ad: 'Na⁺', r: 11.5, renk: '#8A5CF0', yazi: '#FFFFFF' }, no3: { ad: 'NO₃⁻', r: 16, renk: '#2C74C2', yazi: '#FFFFFF' }
  };
  function siviYol(y) { return 'M152 ' + y + ' V260 Q152 272 164 272 H276 Q288 272 288 260 V' + y + ' Z'; }
  Oynatici.prototype.sahneGoster = function (ad) {
    var S = this.sahneDurum, r = this.r;
    if (S.tur === ad) return;
    this.sahneGizle(); if (!ad) return;
    S.tur = ad; S.durum = {};
    r.tahta.classList.add('sahneli');
    r.sahne.innerHTML = ad === 'iyon' ? this.iyonSVG() : this.beherSVG(SAHNE_AYAR[ad]);
    if (ad === 'iyon') this.iyonKur();
  };
  Oynatici.prototype.sahneGizle = function () {
    var S = this.sahneDurum; S.tur = null; cancelAnimationFrame(S.dongu); S.dongu = null;
    this.r.tahta.classList.remove('sahneli'); this.r.sahne.innerHTML = ''; this.gosteriyor(false);
  };
  Oynatici.prototype.beherSVG = function (c) {
    var cz = [140, 165, 190, 215, 240].map(function (y, i) { return '<line x1="160" y1="' + y + '" x2="' + (i % 2 ? 170 : 178) + '" y2="' + y + '"/>'; }).join('');
    return '<svg viewBox="0 0 400 300" role="img" aria-label="' + c.beher + ' bulunan behere ' + c.tup + ' ekleniyor">' +
      '<line x1="20" y1="275" x2="380" y2="275" stroke="#C3CAD2" stroke-width="3" stroke-linecap="round"/>' +
      '<path class="sivi" d="' + siviYol(196) + '" fill="' + c.sivi + '"/><line class="yuzey" x1="153" y1="196" x2="287" y2="196" stroke="#9FC0DA" stroke-width="2"/><g class="cokelek"></g>' +
      '<path d="M146 102 L152 110 V260 Q152 272 164 272 H276 Q288 272 288 260 V110 L294 102" fill="none" stroke="#56636F" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round"/>' +
      '<g stroke="#9AA6B2" stroke-width="2">' + cz + '</g>' +
      '<text x="226" y="252" text-anchor="middle" class="etk">' + c.beher + '</text>' +
      '<path class="akis" d="M212 74 Q215 130 219 196" fill="none" stroke="' + c.akis + '" stroke-width="6" stroke-linecap="round" opacity="0"/>' +
      '<g class="tup" transform="translate(84 44) rotate(0)"><path d="M-13 0 V92 A13 13 0 0 0 13 92 V0" fill="#F4F8FB" stroke="#56636F" stroke-width="3"/>' +
      '<path class="tup-sivi" d="M-10.5 38 V92 A10.5 10.5 0 0 0 10.5 92 V38 Z" fill="' + c.sivi + '"/><line x1="-17" y1="0" x2="17" y2="0" stroke="#56636F" stroke-width="3" stroke-linecap="round"/></g>' +
      '<text class="etk tup-etk" x="84" y="172" text-anchor="middle">' + c.tup + '</text>' +
      '<g class="cok-etk" opacity="0"><path d="M330 226 Q312 246 292 262" fill="none" stroke="#56636F" stroke-width="2"/><path d="M290 264 L292 254 L299 260 Z" fill="#56636F"/><text x="334" y="222" class="etk">' + c.ad + '</text></g></svg>';
  };
  Oynatici.prototype.iyonSVG = function () {
    return '<svg viewBox="62 0 276 300" role="img" aria-label="Çözeltideki iyonların büyütülmüş görünümü"><circle cx="200" cy="150" r="130" fill="#EEF5FB" stroke="#8FA0B0" stroke-width="3"/>' +
      '<text x="200" y="14" text-anchor="middle" class="etk kucuk">büyütülmüş görünüm</text><g class="iyonlar"></g>' +
      '<text class="iy-etk" x="200" y="297" text-anchor="middle" opacity="0" style="font-family:var(--ui);font-size:14px;font-weight:700;fill:#2B333D">AgCl(k) dibe çöker</text>' +
      '<text class="sy-etk" x="200" y="40" text-anchor="middle" opacity="0" style="font-family:var(--ui);font-size:14px;font-weight:700;fill:#E04E00">seyirci: Na⁺, NO₃⁻</text></svg>';
  };
  Oynatici.prototype.sahneYap = function (ad, anlik) {
    var S = this.sahneDurum, self = this, svg = this.r.sahne.querySelector('svg');
    if (!svg) return Promise.resolve();
    var c = SAHNE_AYAR[S.tur];
    if (ad === 'dok') {
      if (S.durum.dok) return Promise.resolve(); S.durum.dok = 1;
      var tup = svg.querySelector('.tup'), akis = svg.querySelector('.akis'), sivi = svg.querySelector('.sivi'), yuzey = svg.querySelector('.yuzey'), ts = svg.querySelector('.tup-sivi'), etk = svg.querySelector('.tup-etk');
      var L = akis.getTotalLength ? akis.getTotalLength() : 130;
      var tupA = function (x, y, a) { tup.setAttribute('transform', 'translate(' + x + ' ' + y + ') rotate(' + a + ')'); };
      var sev = function (y) { sivi.setAttribute('d', siviYol(y)); yuzey.setAttribute('y1', y); yuzey.setAttribute('y2', y); };
      if (anlik || AZ) { sev(182); ts.setAttribute('d', 'M-10.5 78 V92 A10.5 10.5 0 0 0 10.5 92 V78 Z'); etk.setAttribute('opacity', '0.55'); return Promise.resolve(); }
      this.gosteriyor(true); akis.style.strokeDasharray = L; akis.style.strokeDashoffset = L; etk.setAttribute('opacity', '0');
      return tween(900, function (t) { tupA(84 + 128 * t, 44 + 26 * t, 118 * t); })
        .then(function () { akis.setAttribute('opacity', '1'); return tween(380, function (t) { akis.style.strokeDashoffset = L * (1 - t); }); })
        .then(function () { return tween(1200, function (t) { sev(196 - 14 * t); var yy = 38 + 40 * t; ts.setAttribute('d', 'M-10.5 ' + yy + ' V92 A10.5 10.5 0 0 0 10.5 92 V' + yy + ' Z'); }); })
        .then(function () { return tween(280, function (t) { akis.setAttribute('opacity', String(1 - t)); }); })
        .then(function () { return tween(700, function (t) { tupA(212 - 128 * t, 70 - 26 * t, 118 * (1 - t)); }); })
        .then(function () { etk.setAttribute('opacity', '0.55'); self.gosteriyor(false); });
    }
    if (ad === 'bulut') {
      if (S.durum.bulut) return Promise.resolve(); S.durum.bulut = 1;
      if (!S.durum.dok) this.sahneYap('dok', true);
      var g = svg.querySelector('.cokelek'), sv = svg.querySelector('.sivi'), NS = 'http://www.w3.org/2000/svg', parca = [];
      for (var i = 0; i < 90; i++) {
        var p = document.createElementNS(NS, 'circle'), x = 158 + Math.random() * 124, y = 188 + Math.random() * 80;
        p.setAttribute('cx', x.toFixed(1)); p.setAttribute('cy', y.toFixed(1)); p.setAttribute('r', (1.5 + Math.random() * 1.9).toFixed(2));
        p.setAttribute('fill', c.renk); p.setAttribute('stroke', c.kenar); p.setAttribute('stroke-width', '0.6'); p.setAttribute('opacity', '0');
        g.appendChild(p); parca.push({ el: p, x: x, y: y, gec: Math.random() * 0.6 });
      }
      S.durum.parca = parca;
      if (anlik || AZ) { parca.forEach(function (q) { q.el.setAttribute('opacity', '0.95'); }); sv.setAttribute('fill', karistir(c.sivi, c.bulanik, .7)); if (S.tur === 'pbi2') this.sahneYap('cokel', true); return Promise.resolve(); }
      this.gosteriyor(true);
      return tween(1600, function (t) {
        sv.setAttribute('fill', karistir(c.sivi, c.bulanik, .7 * t));
        parca.forEach(function (q) { var k = Math.max(0, Math.min(1, (t - q.gec) / 0.4)); q.el.setAttribute('opacity', (0.95 * k).toFixed(2)); });
      }).then(function () { self.gosteriyor(false); if (S.tur === 'pbi2') return self.sahneYap('cokel', false); });
    }
    if (ad === 'cokel') {
      if (S.durum.cokel) return Promise.resolve();
      if (!S.durum.bulut) this.sahneYap('bulut', true);
      S.durum.cokel = 1;
      var sv2 = svg.querySelector('.sivi'), etk2 = svg.querySelector('.cok-etk'), pr = S.durum.parca || [];
      pr.forEach(function (q) { q.hx = 160 + Math.random() * 120; q.hy = 260 + Math.random() * 9; q.bx = q.x; q.by = q.y; });
      var bitir = function () { etk2.setAttribute('opacity', '1'); };
      if (anlik || AZ) { pr.forEach(function (q) { q.el.setAttribute('cx', q.hx.toFixed(1)); q.el.setAttribute('cy', q.hy.toFixed(1)); }); sv2.setAttribute('fill', karistir(c.sivi, c.bulanik, .12)); bitir(); return Promise.resolve(); }
      return tween(1900, function (t) {
        sv2.setAttribute('fill', karistir(c.sivi, c.bulanik, .7 - .58 * t));
        pr.forEach(function (q) { q.el.setAttribute('cx', (q.bx + (q.hx - q.bx) * t).toFixed(1)); q.el.setAttribute('cy', (q.by + (q.hy - q.by) * Math.min(1, t * (1.1 + q.gec))).toFixed(1)); });
      }).then(bitir);
    }
    if (ad === 'esles') return this.iyonEsles(anlik);
    if (ad === 'seyirci') {
      if (S.durum.seyirci) return Promise.resolve(); S.durum.seyirci = 1;
      if (!S.durum.esles) this.iyonEsles(true);
      S.iyonlar.forEach(function (o) { if (o.tur === 'na' || o.tur === 'no3') o.el.classList.add('parla'); });
      var e = svg.querySelector('.sy-etk'); if (e) e.setAttribute('opacity', '1');
    }
    return Promise.resolve();
  };
  Oynatici.prototype.iyonKur = function () {
    var S = this.sahneDurum, g = this.r.sahne.querySelector('.iyonlar'), NS = 'http://www.w3.org/2000/svg', self = this;
    S.iyonlar = [];
    [['ag', 5], ['cl', 5], ['na', 4], ['no3', 4]].forEach(function (d) {
      for (var i = 0; i < d[1]; i++) {
        var tur = IYON_TUR[d[0]], x, y, deneme = 0;
        do { var a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * (112 - tur.r); x = 200 + Math.cos(a) * rr; y = 150 + Math.sin(a) * rr; deneme++; }
        while (deneme < 60 && S.iyonlar.some(function (o) { return Math.hypot(o.x - x, o.y - y) < o.r + tur.r + 3; }));
        var el = document.createElementNS(NS, 'g');
        el.innerHTML = '<circle r="' + tur.r + '" fill="' + tur.renk + '" stroke="rgba(0,0,0,.18)" stroke-width="1.2"/><text class="iy-yazi" text-anchor="middle" dy="0.36em" fill="' + tur.yazi + '">' + tur.ad + '</text>';
        g.appendChild(el);
        var hz = 16 + Math.random() * 16, yon = Math.random() * Math.PI * 2;
        S.iyonlar.push({ tur: d[0], r: tur.r, x: x, y: y, vx: Math.cos(yon) * hz, vy: Math.sin(yon) * hz, el: el });
      }
    });
    this.iyonCiz();
    if (!AZ) { var once = performance.now(); var dongu = function (now) { var dt = Math.min(0.05, (now - once) / 1000); once = now; self.iyonAdim(dt); self.iyonCiz(); S.dongu = requestAnimationFrame(dongu); }; S.dongu = requestAnimationFrame(dongu); }
  };
  Oynatici.prototype.iyonAdim = function (dt) {
    var S = this.sahneDurum, ust = S.durum.esles ? 196 : 400;
    S.iyonlar.forEach(function (o) {
      if (o.sabit || o.hedef) return;
      o.x += o.vx * dt; o.y += o.vy * dt;
      var dx = o.x - 200, dy = o.y - 150, d = Math.hypot(dx, dy), max = 124 - o.r;
      if (d > max) { var nx = dx / d, ny = dy / d, vn = o.vx * nx + o.vy * ny; o.vx -= 2 * vn * nx; o.vy -= 2 * vn * ny; o.x = 200 + nx * max; o.y = 150 + ny * max; }
      if (o.y + o.r > ust) { o.y = ust - o.r; o.vy = -Math.abs(o.vy); }
    });
  };
  Oynatici.prototype.iyonCiz = function () { this.sahneDurum.iyonlar.forEach(function (o) { o.el.setAttribute('transform', 'translate(' + o.x.toFixed(1) + ' ' + o.y.toFixed(1) + ')'); }); };
  Oynatici.prototype.iyonEsles = function (anlik) {
    var S = this.sahneDurum, self = this;
    if (S.durum.esles) return Promise.resolve(); S.durum.esles = 1;
    var ag = S.iyonlar.filter(function (o) { return o.tur === 'ag'; }), cl = S.iyonlar.filter(function (o) { return o.tur === 'cl'; }), yer = [], j;
    for (j = 0; j < 6; j++) yer.push({ x: 200 + (j - 2.5) * 27.5, y: 243, tur: j % 2 ? 'cl' : 'ag' });
    for (j = 0; j < 4; j++) yer.push({ x: 200 + (j - 1.5) * 28.5, y: 216, tur: j % 2 ? 'ag' : 'cl' });
    var agY = yer.filter(function (p) { return p.tur === 'ag'; }), clY = yer.filter(function (p) { return p.tur === 'cl'; }), hepsi = [];
    var etk = this.r.sahne.querySelector('.iy-etk');
    ag.forEach(function (o, i) {
      var e = cl[i]; if (!e) return;
      var mx = (o.x + e.x) / 2, my = (o.y + e.y) / 2; o.hedef = 1; e.hedef = 1;
      hepsi.push({ o: o, ax: o.x, ay: o.y, bx: mx - 13, by: my, cx: agY[i].x, cy: agY[i].y });
      hepsi.push({ o: e, ax: e.x, ay: e.y, bx: mx + 13, by: my, cx: clY[i].x, cy: clY[i].y });
    });
    var bitir = function () { hepsi.forEach(function (h) { h.o.x = h.cx; h.o.y = h.cy; h.o.sabit = true; }); self.iyonCiz(); if (etk) etk.setAttribute('opacity', '1'); };
    if (anlik || AZ) { bitir(); return Promise.resolve(); }
    this.gosteriyor(true);
    return tween(1300, function (t) { hepsi.forEach(function (h) { h.o.x = h.ax + (h.bx - h.ax) * t; h.o.y = h.ay + (h.by - h.ay) * t; }); self.iyonCiz(); })
      .then(function () { return tween(1500, function (t) { hepsi.forEach(function (h) { h.o.x = h.bx + (h.cx - h.bx) * t; h.o.y = h.by + (h.cy - h.by) * t; }); self.iyonCiz(); }); })
      .then(function () { bitir(); self.gosteriyor(false); });
  };

  /* ---- altyazı ---- */
  Oynatici.prototype.altyaziYaz = function (metin) {
    var html = '', re = /\S+/g, m; this.altKelimeler = [];
    while ((m = re.exec(metin))) { this.altKelimeler.push({ bas: m.index, son: m.index + m[0].length }); html += '<span class="k">' + esc(m[0]) + '</span> '; }
    this.r.altyazi.innerHTML = html;
  };
  Oynatici.prototype.altyaziBos = function (metin) { this.r.altyazi.innerHTML = '<span class="bos">' + esc(metin) + '</span>'; this.altKelimeler = []; };
  Oynatici.prototype.altyaziVurgula = function (ci) {
    var spans = this.r.altyazi.querySelectorAll('.k'), a = this.altKelimeler;
    for (var i = 0; i < a.length && i < spans.length; i++) spans[i].classList.toggle('su', ci >= a[i].bas && ci < a[i].son + 1 && ci >= 0);
  };

  /* ---- kayıtlar ---- */
  Oynatici.prototype.kayitBul = function (metin) {
    var h = ozet(metin);
    return Kayitlar.al('k:' + h).then(function (v) {
      if (v && v.veri) return { url: URL.createObjectURL(new Blob([v.veri], { type: v.mime })), sure: v.sure, yerel: true };
      var y = Yayin.al(h);
      if (y && y.veri) return { url: 'data:' + y.mime + ';base64,' + y.veri, sure: y.sure };
      return null;
    });
  };
  Oynatici.prototype.kayitDurumu = function () {
    var self = this, r = this.r, adimlar = this.P.adimlar || [];
    if (!adimlar.length) { r.kaynakNot.textContent = ''; return; }
    Promise.all(adimlar.map(function (a) { var h = ozet(a.s); return Kayitlar.al('k:' + h).then(function (v) { return !!(v && v.veri) || !!Yayin.al(h); }); })).then(function (var_) {
      var n = var_.filter(Boolean).length;
      self.kayitVar = {}; adimlar.forEach(function (a, i) { if (var_[i]) self.kayitVar[ozet(a.s)] = 1; });
      r.kaynakNot.textContent = ayar.kaynak === 'kayit'
        ? (n ? 'Bu derste ' + adimlar.length + ' adımın ' + n + '’i öğretmen kaydıyla oynar; kalanlar cihaz sesiyle.' : 'Bu ders için henüz öğretmen kaydı yok; “Kendi sesinle kaydet” ile ekleyebilirsin.')
        : (n ? 'Bu dersin ' + n + ' adımı için öğretmen kaydı var.' : '');
    });
  };

  /* ---- oynatma ---- */
  Oynatici.prototype.kur = function (n) {
    var self = this, zincir = Promise.resolve();
    this.temizle(); this.sahneGizle();
    for (var k = 0; k < n; k++) (function (a) {
      zincir = zincir.then(function () {
        if (a.sil) self.temizle();
        if ('sahne' in a) self.sahneGoster(a.sahne);
        return self.ekle(a.w || a.h || [], a.oto, true).then(function (els) {
          var kel = []; els.forEach(function (el) { kel.push.apply(kel, el.querySelectorAll('.w')); });
          self.goster(kel, kel.length, true);
          if (a.yap) self.sahneYap(a.yap, true);
          if (a.ciz) self.isaretle(a.ciz, 'ciz', true);
          if (a.halka) self.isaretle([a.halka], 'halka', true);
        });
      });
    })(this.P.adimlar[k]);
    return zincir;
  };
  Oynatici.prototype.seslendir = function (a, els, jeton, kayit) {
    var self = this, kel = [];
    els.forEach(function (el) { kel.push.apply(kel, el.querySelectorAll('.w')); });
    var metin = a.s, uz = Math.max(1, metin.length);
    this.altyaziYaz(metin);
    this.konusuyor(true); if (kel.length) { this.yaziyor(true); this.kalemGoster(true); }
    var sinirVar = false, ci = 0, cl = 0, t0 = performance.now(), sure = Ses.sure(metin, TARZLAR[ayar.tarz].hiz * ayar.hiz), raf = null, isaretlendi = false;
    var tik = function () {
      if (jeton !== self.P.jeton) return;
      var p = Ses.oranFn ? Ses.oranFn() : sinirVar ? Math.min(1, (ci + cl) / uz) : Math.min(0.97, (performance.now() - t0) / sure);
      var n = Math.ceil(Math.min(1, p * 1.18) * kel.length);
      self.goster(kel, n, false);
      if (n >= kel.length) { self.yaziyor(false); self.kalemGoster(false); }
      self.altyaziVurgula(sinirVar ? ci : p * uz);
      if (!isaretlendi && p > 0.35) { isaretlendi = true; if (a.ciz) self.isaretle(a.ciz, 'ciz'); if (a.halka) self.isaretle([a.halka], 'halka'); }
      raf = requestAnimationFrame(tik);
    };
    raf = requestAnimationFrame(tik);
    return Ses.konus(metin, { basla: function (s) { t0 = performance.now(); sure = s; }, sinir: function (i, l) { sinirVar = true; ci = i; cl = l || 1; } }, kayit).then(function (neden) {
      cancelAnimationFrame(raf);
      self.konusuyor(false); self.yaziyor(false); self.kalemGoster(false);
      if (kayit && kayit.yerel) setTimeout(function () { URL.revokeObjectURL(kayit.url); }, 1000);
      if (jeton !== self.P.jeton) return neden;
      self.goster(kel, kel.length, false); self.altyaziVurgula(-1);
      if (!isaretlendi) { if (a.ciz) self.isaretle(a.ciz, 'ciz'); if (a.halka) self.isaretle([a.halka], 'halka'); }
      return neden;
    });
  };
  Oynatici.prototype.adimCalistir = function (a, jeton) {
    var self = this;
    var kayitSoz = ayar.kaynak === 'kayit' ? this.kayitBul(a.s) : Promise.resolve(null);
    var hazir = a.sil ? this.sil(false) : Promise.resolve();
    return Promise.all([hazir, kayitSoz]).then(function (sonuc) {
      if (jeton !== self.P.jeton) return;
      if ('sahne' in a) self.sahneGoster(a.sahne);
      return self.ekle(a.w || a.h || [], a.oto, false).then(function (els) {
        if (jeton !== self.P.jeton) return;
        var eylem = a.yap ? self.sahneYap(a.yap, false) : Promise.resolve();
        return Promise.all([self.seslendir(a, els, jeton, sonuc[1]), eylem]);
      });
    });
  };
  Oynatici.prototype.calis = function (bas) {
    var self = this;
    Oynatici.hepsi.forEach(function (o) { if (o !== self && o.P.calisiyor) o.durdur(); });
    var jeton = ++this.P.jeton;
    Ses.sus(); Ses.kilidiAc();
    this.P.calisiyor = true; this.arayuz();
    this.r.perde.hidden = true;
    return sleep(60).then(function () { return self.kur(bas); }).then(function () {
      var i = bas;
      var sonraki = function () {
        if (jeton !== self.P.jeton) return;
        if (i >= self.P.adimlar.length) { self.P.calisiyor = false; self.P.i = self.P.adimlar.length; self.arayuz(); self.bitti(); return; }
        self.P.i = i; self.arayuz();
        return self.adimCalistir(self.P.adimlar[i], jeton).then(function () {
          if (jeton !== self.P.jeton) return;
          i++;
          return sleep(TARZLAR[ayar.tarz].ara).then(sonraki);
        });
      };
      return sonraki();
    });
  };
  Oynatici.prototype.durdur = function () {
    this.P.jeton++; Ses.sus(); this.P.calisiyor = false;
    this.konusuyor(false); this.yaziyor(false); this.kalemGoster(false); this.arayuz();
  };
  Oynatici.prototype.oynatDuraklat = function () {
    if (this.P.calisiyor) { this.durdur(); return; }
    this.calis(this.P.i < 0 || this.P.i >= this.P.adimlar.length ? 0 : this.P.i);
  };
  Oynatici.prototype.bitti = function () {
    this.r.perdeYazi.textContent = 'Baştan izle';
    this.r.perdeAlt.textContent = 'Anlatım bitti. Cümle ekleyip yeniden dinleyebilirsin.';
    this.r.perde.hidden = false;
    this.altyaziBos('Anlatım bitti.');
  };
  Oynatici.prototype.arayuz = function () {
    var P = this.P, r = this.r, n = P.adimlar.length;
    r.adimYazi.textContent = 'Adım ' + (P.i < 0 ? 0 : Math.min(P.i + 1, n)) + ' / ' + n;
    r.cubuk.style.width = (P.i < 0 || !n ? 0 : Math.min(1, (P.i + (P.calisiyor ? 0.5 : 1)) / n) * 100) + '%';
    r.oynat.setAttribute('aria-label', P.calisiyor ? 'Duraklat' : 'Başlat');
    r.oynat.innerHTML = ikon(P.calisiyor ? 'dur' : 'oynat');
    r.geri.disabled = P.i <= 0; r.ileri.disabled = P.i >= n - 1;
  };
  Oynatici.prototype.yukle = function (id) {
    this.durdur();
    var ders = typeof id === 'object' ? id : null;
    if (ders) id = ders.id || 'ders';
    this.P.id = id;
    if (id === 'metin' && !ders) {
      if (!this.adimListeleri.metin) this.adimListeleri.metin = metindenDers(this.r.metin ? this.r.metin.value : ORNEK_METIN).adimlar;
    } else if (ders) this.adimListeleri[id] = ders.adimlar.slice();
    else if (!this.adimListeleri[id]) this.adimListeleri[id] = (this.dersler[id] || DERSLER.konu).adimlar.slice();
    this.P.ders = ders || this.dersler[id] || null;
    this.P.adimlar = this.adimListeleri[id]; this.P.i = -1;
    if (this.r.baslik) this.r.baslik.textContent = (ders && ders.baslik) || 'Sesli anlatım';
    var self = this;
    this.kur(1).then(function () { self.arayuz(); });
    this.r.perdeYazi.textContent = id === 'metin' ? 'Metni anlat' : /^(km-|d)/.test(id) || id === 'soru' ? 'Çözümü başlat' : 'Dersi başlat';
    this.r.perdeAlt.textContent = 'Ses açıkken başlat. Tahtaya yazılanlar sesle birlikte ilerler.';
    this.r.perde.hidden = false;
    this.altyaziBos('Altyazı burada görünür: konuşulan kelime renklenir.');
    Array.prototype.forEach.call(this.kok.querySelectorAll('.sd-sekmeler [data-ders]'), function (b) { b.setAttribute('aria-selected', String(b.getAttribute('data-ders') === id)); });
    if (this.r.metinKart) this.r.metinKart.hidden = id !== 'metin';
    this.ozelListeCiz(); this.arayuz(); this.kayitDurumu();
    return this;
  };

  /* ---- cümle ekle ---- */
  Oynatici.prototype.ozelListeCiz = function () {
    var ozel = this.P.adimlar.filter(function (a) { return a.ozel; });
    this.r.ozelListe.innerHTML = ozel.map(function (a, i) { return '<li><span>' + esc(a.w[0].t) + '</span><button type="button" data-sil="' + i + '" aria-label="Cümleyi kaldır">×</button></li>'; }).join('');
  };
  Oynatici.prototype.cumleEkle = function () {
    var inp = this.r.cumle, t = inp.value.trim(); if (!t) { inp.focus(); return; }
    var adim = { oto: 1, ozel: 1, w: [{ c: 'ozel', t: t }], s: konusmaMetni(t) };
    var yer = this.P.i >= 0 && this.P.i < this.P.adimlar.length ? this.P.i + 1 : this.P.adimlar.length;
    this.P.adimlar.splice(yer, 0, adim);
    inp.value = ''; this.ozelListeCiz(); this.arayuz();
    if (!this.P.calisiyor) this.calis(yer);
  };
  Oynatici.prototype.cumleSil = function (i) {
    var ozel = this.P.adimlar.filter(function (a) { return a.ozel; }), hedef = ozel[i], idx = this.P.adimlar.indexOf(hedef), self = this;
    if (idx < 0) return;
    if (this.P.calisiyor) this.durdur();
    this.P.adimlar.splice(idx, 1);
    if (this.P.i > idx) this.P.i--; else if (this.P.i >= this.P.adimlar.length) this.P.i = this.P.adimlar.length - 1;
    this.ozelListeCiz(); this.kur(Math.max(0, this.P.i)).then(function () { self.arayuz(); });
  };

  /* ---- kayıt stüdyosu ---- */
  Oynatici.prototype.studyoAc = function () {
    this.durdur();
    this.r.studyo.hidden = false;
    this.r.studyoNot.hidden = true;
    if (!Kaydedici.var) { this.r.studyoNot.textContent = 'Bu tarayıcı ses kaydını desteklemiyor. Telefonda Safari ya da Chrome ile dene.'; this.r.studyoNot.hidden = false; }
    this.studyoCiz();
  };
  Oynatici.prototype.studyoKapat = function () {
    if (this.kayitAktif) { this.kayitAktif.durdur(); this.kayitAktif = null; }
    this.siraliDur = true;
    this.r.studyo.hidden = true; this.kayitDurumu();
  };
  Oynatici.prototype.studyoCiz = function () {
    var self = this, adimlar = this.P.adimlar;
    Promise.all(adimlar.map(function (a) { return Kayitlar.al('k:' + ozet(a.s)); })).then(function (kayitlar) {
      self.r.studyoListe.innerHTML = adimlar.map(function (a, i) {
        var k = kayitlar[i], var_ = k && k.veri, yay = !var_ && Yayin.al(ozet(a.s));
        var kaydediyor = self.kayitIndex === i;
        return '<li data-i="' + i + '"' + (kaydediyor ? ' class="su"' : '') + '><span class="no">' + (i + 1) + '</span><div><div class="ct">' + esc(a.s) + '</div>' +
          '<div class="durum">' + (kaydediyor ? '<span class="kayit-isik"></span> Kaydediliyor… okuyunca ■ Bitir’e bas' : var_ ? '<b>✓ Kaydın var</b> · ' + (k.sure || 0).toFixed(1) + ' sn' : yay ? 'Sitede yayımlanmış kayıt var' : 'Kayıt yok') + '</div></div>' +
          '<div class="islem">' +
            '<button type="button" class="dugme' + (kaydediyor ? '' : ' ikincil') + '" data-is="kaydet" data-i="' + i + '">' + (kaydediyor ? '■ Bitir' : '● Kaydet') + '</button>' +
            '<button type="button" class="dugme ikincil" data-is="dinle" data-i="' + i + '"' + (var_ || yay ? '' : ' disabled') + '>▶ Dinle</button>' +
            '<button type="button" class="dugme ikincil" data-is="sil" data-i="' + i + '"' + (var_ ? '' : ' disabled') + '>Sil</button>' +
          '</div></li>';
      }).join('');
      var su = self.r.studyoListe.querySelector('li.su'); if (su && su.scrollIntoView) su.scrollIntoView({ block: 'nearest' });
    });
  };
  Oynatici.prototype.kayitBaslat = function (i) {
    var self = this;
    if (!Kaydedici.var) return Promise.reject(new Error('destek yok'));
    return Kaydedici.basla().then(function (k) { self.kayitAktif = k; self.kayitIndex = i; self.studyoCiz(); return k; })
      .catch(function (e) {
        self.r.studyoNot.textContent = SesliDers.mikrofonNotu || 'Mikrofon açılamadı. Tarayıcının bu site için mikrofon iznini ver ve yeniden dene.';
        self.r.studyoNot.hidden = false; self.kayitIndex = null; self.studyoCiz(); throw e;
      });
  };
  Oynatici.prototype.kayitBitir = function () {
    var self = this, k = this.kayitAktif, i = this.kayitIndex, a = this.P.adimlar[i];
    this.kayitAktif = null; this.kayitIndex = null;
    if (!k || !a) return Promise.resolve();
    return k.durdur().then(function (s) {
      if (!s || !s.blob || s.blob.size < 800) { self.studyoCiz(); return; }
      var oku = s.blob.arrayBuffer ? s.blob.arrayBuffer() : new Promise(function (res) { var fr = new FileReader(); fr.onload = function () { res(fr.result); }; fr.readAsArrayBuffer(s.blob); });
      return oku.then(function (buf) { return Kayitlar.koy('k:' + ozet(a.s), { mime: s.mime, veri: buf, sure: s.sure, metin: a.s, tarih: Date.now() }); })
        .then(function () { self.studyoCiz(); self.kayitDurumu(); });
    });
  };
  Oynatici.prototype.studyoIslem = function (is, i) {
    var self = this, a = this.P.adimlar[i];
    if (!a) return;
    if (is === 'kaydet') {
      if (this.kayitIndex === i) { this.kayitBitir(); return; }
      if (this.kayitAktif) { this.kayitBitir().then(function () { self.kayitBaslat(i).catch(function () {}); }); return; }
      this.kayitBaslat(i).catch(function () {});
    } else if (is === 'dinle') {
      Ses.kilidiAc();
      this.kayitBul(a.s).then(function (k) { if (k) { var au = Ses.ortak(); au.onended = au.onerror = au.onloadedmetadata = null; au.src = k.url; var p = au.play(); if (p && p.catch) p.catch(function () {}); } });
    } else if (is === 'sil') {
      Kayitlar.sil('k:' + ozet(a.s)).then(function () { self.studyoCiz(); self.kayitDurumu(); });
    }
  };
  Oynatici.prototype.siraliKayit = function () {
    var self = this;
    if (this.siraliCalisiyor) { this.siraliDur = true; if (this.kayitAktif) this.kayitBitir(); return; }
    this.siraliCalisiyor = true; this.siraliDur = false; this.r.siraKaydet.textContent = '■ Sırayı durdur';
    Promise.all(this.P.adimlar.map(function (a) { return Kayitlar.al('k:' + ozet(a.s)); })).then(function (kayitlar) {
      var i = kayitlar.findIndex ? kayitlar.findIndex(function (k) { return !(k && k.veri); }) : 0;
      if (i < 0) i = 0;
      var bekle = function () { // kullanıcı "Bitir" deyince sıradakine geç
        if (self.siraliDur || i >= self.P.adimlar.length) { self.siraliCalisiyor = false; self.r.siraKaydet.textContent = '● Sırayla kaydet'; self.studyoCiz(); return; }
        self.kayitBaslat(i).then(function () {
          var kontrol = setInterval(function () {
            if (self.kayitIndex !== i) { clearInterval(kontrol); i++; setTimeout(bekle, 500); }
          }, 200);
        }).catch(function () { self.siraliCalisiyor = false; self.r.siraKaydet.textContent = '● Sırayla kaydet'; });
      };
      bekle();
    });
  };
  Oynatici.prototype.paketIndir = function () {
    var self = this, adimlar = this.P.adimlar, paket = { surum: 1, ders: this.P.id, baslik: (this.P.ders && this.P.ders.baslik) || this.P.id, tarih: new Date().toISOString(), kayitlar: {} };
    Promise.all(adimlar.map(function (a) { return Kayitlar.al('k:' + ozet(a.s)); })).then(function (kayitlar) {
      var n = 0;
      kayitlar.forEach(function (k, i) { if (k && k.veri) { n++; paket.kayitlar[ozet(adimlar[i].s)] = { mime: k.mime, sure: Math.round(k.sure * 10) / 10, metin: adimlar[i].s, veri: b64(k.veri) }; } });
      if (!n) { self.r.studyoNot.textContent = 'İndirilecek kayıt yok. Önce birkaç cümle kaydet.'; self.r.studyoNot.hidden = false; return; }
      indir(new Blob([JSON.stringify(paket)], { type: 'application/json' }), 'sesli-' + String(self.P.id).replace(/[^\w-]+/g, '-') + '.json');
      self.r.studyoNot.textContent = n + ' kayıt indirildi. Dosya sitenin sesli klasörüne eklenince öğrenciler de bu sesi duyar.'; self.r.studyoNot.hidden = false;
    });
  };
  Oynatici.prototype.ornekKayit = function () {
    var self = this, r = this.r;
    if (this.ornekKayitci) {
      var k = this.ornekKayitci; this.ornekKayitci = null; clearInterval(this.ornekSaat);
      k.durdur().then(function (s) {
        r.ornekKaydet.textContent = '● Yeniden kaydet';
        if (s && s.blob && s.blob.size > 800) { self.ornekBlob = s.blob; r.ornekDinle.disabled = false; r.ornekIndir.disabled = false; r.ornekSure.textContent = Math.round(s.sure) + ' sn kaydedildi'; }
      });
      return;
    }
    if (!Kaydedici.var) { r.ornekSure.textContent = 'Bu tarayıcı ses kaydını desteklemiyor.'; return; }
    Kaydedici.basla().then(function (k) {
      self.ornekKayitci = k; var t0 = Date.now();
      r.ornekKaydet.textContent = '■ Kaydı bitir';
      self.ornekSaat = setInterval(function () { var s = Math.round((Date.now() - t0) / 1000); r.ornekSure.innerHTML = '<span class="kayit-isik"></span> ' + Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); }, 500);
    }).catch(function () { r.ornekSure.textContent = SesliDers.mikrofonNotu || 'Mikrofon açılamadı; tarayıcıdan mikrofon izni ver.'; });
  };

  /* ---- pencere ---- */
  Oynatici.prototype.kapat = function () {
    this.durdur(); this.studyoKapat();
    if (this.opt.mod === 'pencere') { this.host.style.display = 'none'; document.documentElement.style.overflow = this.eskiTasma || ''; }
  };

  /* ================= kimyamed köprüsü: .soru kartlarına "Sesli anlat" ================= */
  var pencereOynatici = null;
  function ac(ders, opt) {
    opt = opt || {};
    if (!pencereOynatici) {
      var h = document.createElement('div');
      h.setAttribute('data-sesli-ders', 'pencere');
      h.style.cssText = 'position:fixed;top:0;right:0;bottom:0;left:0;z-index:2147482000;display:none';
      document.body.appendChild(h);
      pencereOynatici = new Oynatici(h, { mod: 'pencere' });
    }
    Oynatici.hepsi.forEach(function (o) { if (o !== pencereOynatici && o.P.calisiyor) o.durdur(); });
    pencereOynatici.temaKoy(opt.tema || SesliDers.tema || null);
    if (pencereOynatici.host.style.display !== 'block') pencereOynatici.eskiTasma = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    pencereOynatici.host.style.display = 'block';
    pencereOynatici.yukle(ders);
    if (!ac.esc) { ac.esc = true; document.addEventListener('keydown', function (e) { if (e.key !== 'Escape' || !pencereOynatici || pencereOynatici.host.style.display !== 'block') return; if (!pencereOynatici.r.studyo.hidden) pencereOynatici.studyoKapat(); else pencereOynatici.kapat(); }); }
    setTimeout(function () { try { pencereOynatici.r.perdeDugme.focus(); } catch (e) {} }, 50);
    return pencereOynatici;
  }
  function dugmeStili() {
    if (document.getElementById('sd-anlat-stil')) return;
    var st = document.createElement('style'); st.id = 'sd-anlat-stil';
    st.textContent = '.sd-anlat{display:inline-flex;align-items:center;justify-content:center;gap:5px;font-family:inherit;font-size:12px;font-weight:800;letter-spacing:.04em;line-height:1.3;' +
      'color:#C24100;background:#FFF1E9;border:1px solid #F7C3A5;border-radius:999px;padding:4px 11px;cursor:pointer;white-space:nowrap;-webkit-tap-highlight-color:transparent}' +
      '.sd-anlat:hover{background:#FFE3D1}.sd-anlat:focus-visible{outline:3px solid #0B5C8A;outline-offset:2px}' +
      '.ust-serit{flex-wrap:wrap}.ust-serit .sd-anlat{margin-left:8px}' +
      '.sd-anlat.koyu{color:#fdba74;background:rgba(248,83,0,.14);border-color:rgba(248,83,0,.45)}.sd-anlat.koyu:hover{background:rgba(248,83,0,.26)}' +
      '.sd-anlat.serit{display:flex;width:100%;margin-top:6px;border-radius:10px;padding:8px;font-size:12.5px}' +
      '.sd-anlat.kucuk{margin-top:8px}' +
      '@media print{.sd-anlat{display:none!important}}';
    document.head.appendChild(st);
  }
  function dugme(sinif, etiket, fn) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'sd-anlat' + (sinif ? ' ' + sinif : '');
    b.innerHTML = '<span aria-hidden="true">🔊</span> Sesli anlat';
    b.setAttribute('aria-label', etiket);
    b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); fn(); });
    return b;
  }
  // kimyamed: her .soru kartının üst şeridine "Sesli anlat"
  function kimyamedKopru() {
    var sorular = document.querySelectorAll('div.soru');
    if (!sorular.length) return;
    dugmeStili();
    Array.prototype.forEach.call(sorular, function (s) {
      if (!s.querySelector('details.cozum') || s.querySelector('.sd-anlat')) return;
      var b = dugme('', 'Bu soruyu sesli anlat', function () { ac(sorudanDers(s)); });
      var serit = s.querySelector('.ust-serit');
      if (serit) serit.appendChild(b); else s.insertBefore(b, s.firstChild);
    });
  }
  // Ronya: çözümü molToggle ile açılan her soruya "Sesli anlat" (listeler sonradan çizildiği için izlenir)
  function ronyaKopru() {
    var bekliyor = false;
    var koyuMu = function () { // sayfanın zemini koyuysa koyu düğme ve koyu pencere
      try { var m = getComputedStyle(document.body).backgroundColor.match(/\d+(\.\d+)?/g); return !!m && (m.length < 4 || +m[3] > 0) && (+m[0] + +m[1] + +m[2]) / 3 < 90; } catch (e) { return false; }
    };
    var tara = function () {
      bekliyor = false;
      var els = document.querySelectorAll('[onclick^="molToggle("]:not([data-sd])');
      if (!els.length) return;
      dugmeStili();
      Array.prototype.forEach.call(els, function (el) {
        el.setAttribute('data-sd', '1');
        var m = (el.getAttribute('onclick') || '').match(/molToggle\(\s*['"]([^'"]+)['"]/);
        var hedef = m && document.getElementById(m[1]);
        if (!hedef) return;
        var b = dugme(koyuMu() ? 'koyu' : '', 'Bu soruyu sesli anlat', function () { ac(ronyaDers(el, hedef), { tema: koyuMu() ? 'koyu' : null }); });
        if (el.contains(hedef)) { b.className += ' kucuk'; el.appendChild(b); }
        else { b.className += ' serit'; el.insertAdjacentElement('afterend', b); }
      });
    };
    tara();
    if (window.MutationObserver) new MutationObserver(function () { if (!bekliyor) { bekliyor = true; requestAnimationFrame(tara); } }).observe(document.body, { childList: true, subtree: true });
  }
  function kopruler() { try { kimyamedKopru(); } catch (e) {} try { ronyaKopru(); } catch (e) {} }

  var SesliDers = window.SesliDers = {
    surum: '1.0',
    dersler: DERSLER,
    tema: null,
    yerlestir: function (el, opt) {
      opt = opt || {}; opt.mod = 'satir';
      var o = new Oynatici(el, opt);
      var ilk = opt.varsayilan || Object.keys(o.dersler)[0] || (opt.metin ? 'metin' : null);
      if (ilk) o.yukle(ilk);
      return o;
    },
    ac: ac,
    kapat: function () { if (pencereOynatici) pencereOynatici.kapat(); },
    durdur: function () { Oynatici.hepsi.forEach(function (o) { if (o.P.calisiyor) o.durdur(); }); },
    sorudanDers: sorudanDers,
    ronyaDers: ronyaDers,
    satirlaraBol: satirlaraBol,
    parcalardanDers: parcalardanDers,
    metindenDers: metindenDers,
    konusmaMetni: konusmaMetni,
    formulCoz: formulCoz,
    otomatikHTML: otomatikHTML,
    _ic: { Ses: Ses, Kayitlar: Kayitlar, Yayin: Yayin, ayar: ayar, ozet: ozet, Oynatici: Oynatici, ORNEK_OKUMA: ORNEK_OKUMA }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', kopruler); else kopruler();
})();
