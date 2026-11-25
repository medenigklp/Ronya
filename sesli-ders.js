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

  /* ================= doğal sesler: Google Cloud Text-to-Speech, sitenin ses servisi üzerinden =================
     Ses servisi (sesli/ses-servisi.js, Cloudflare Worker) API anahtarını saklar; adresi sesli/bulut.json'da yazar. */
  var BULUT_SESLER = (function () {
    var l = [];
    'Achernar Aoede Autonoe Callirrhoe Despina Erinome Gacrux Kore Laomedeia Leda Pulcherrima Sulafat Vindemiatrix Zephyr'.split(' ').forEach(function (a) { l.push({ id: 'tr-TR-Chirp3-HD-' + a, ad: a, cins: 'k', grup: 'dogal' }); });
    'Achird Algenib Algieba Alnilam Charon Enceladus Fenrir Iapetus Orus Puck Rasalgethi Sadachbia Sadaltager Schedar Umbriel Zubenelgenubi'.split(' ').forEach(function (a) { l.push({ id: 'tr-TR-Chirp3-HD-' + a, ad: a, cins: 'e', grup: 'dogal' }); });
    [['A', 'k'], ['B', 'e'], ['C', 'k'], ['D', 'k'], ['E', 'e']].forEach(function (x) { l.push({ id: 'tr-TR-Wavenet-' + x[0], ad: 'WaveNet ' + x[0], cins: x[1], grup: 'sade' }); });
    return l;
  })();
  var Bulut = {
    adres: null, bellek: {}, sira: [],
    hazir: function () { return !!this.adres; },
    ses: function () {
      var id = (Izin.ogretmen() && ayar.bulutSes) || Izin.sesi(ayar.cins);
      return BULUT_SESLER.filter(function (v) { return v.id === id; })[0] || BULUT_SESLER[7];
    },
    al: function (metin, sesId) {
      metin = String(metin || '').replace(/\s+/g, ' ').trim();
      if (!this.adres) return Promise.reject(new Error('ses servisi yok'));
      if (this.mola && Date.now() < this.mola) return Promise.reject(new Error('ses servisi molada'));
      if (!metin || metin.length > 1400) return Promise.reject(new Error('metin uygun değil'));
      var self = this, u = this.adres.replace(/\/+$/, '') + '/ses?ses=' + encodeURIComponent(sesId || this.ses().id) + '&m=' + encodeURIComponent(metin);
      if (this.bellek[u]) return this.bellek[u];
      var p = fetch(u, { mode: 'cors', credentials: 'omit' })
        .then(function (r) { if (!r.ok) { if (r.status === 429) self.mola = Date.now() + 10 * 60 * 1000; throw new Error('ses servisi ' + r.status); } return r.blob(); })
        .then(function (b) { if (!b.size) throw new Error('boş ses'); return { url: URL.createObjectURL(b), bulut: true }; });
      p.catch(function () { delete self.bellek[u]; var k = self.sira.indexOf(u); if (k >= 0) self.sira.splice(k, 1); });
      this.bellek[u] = p; this.sira.push(u);
      while (this.sira.length > 40) {
        var eski = this.sira.shift(), ep = this.bellek[eski]; delete this.bellek[eski];
        if (ep) ep.then(function (k) { setTimeout(function () { URL.revokeObjectURL(k.url); }, 60000); }, function () {});
      }
      return p;
    }
  };
  function kaynakNe() {
    var k = ayar.kaynak || (Bulut.hazir() ? 'bulut' : 'cihaz');
    if (!Izin.ogretmen()) k = k === 'kayit' && Yayin.var() ? 'kayit' : 'bulut';
    return k === 'bulut' && !Bulut.hazir() ? 'cihaz' : k;
  }

  /* ================= ses izinleri: öğretmen ve öğrenci =================
     Öğrenciler yalnız öğretmenin seçtiği iki doğal sesi kullanır (bir kadın, bir erkek); öteki sesler onlara kapalıdır.
     Öğretmen kendi cihazında öğretmen bağlantısını (…#ogretmen=anahtar) bir kez açar ya da Ayarlar → Öğretmen girişi'ne
     anahtarı yazar: o cihazda bütün sesler açılır, öğrenci seslerini değiştirebilir. Öğrenci sesleri ses servisinde
     saklanır (sesli/ses-servisi.js → /ayar); servise ulaşılamazsa sesli/bulut.json'daki "ogrenci" kullanılır.
     Kodda anahtarın kendisi yok, yalnız SHA-256 özeti var. */
  var OGRETMEN_OZET = 'eeb6c158a4aba2056a2d4768c8d5e11a326cd6cc2631b0a14d5d90d08eb1435c';
  var Izin = {
    ogrenci: { k: 'tr-TR-Chirp3-HD-Kore', e: 'tr-TR-Chirp3-HD-Charon' },
    anahtar: function () { return depo.al('ogrAnahtar', '') || ''; },
    ogretmen: function () { return !!this.anahtar(); },
    sesi: function (c) {
      var id = this.ogrenci[c === 'e' ? 'e' : 'k'];
      return BULUT_SESLER.some(function (v) { return v.id === id; }) ? id : (c === 'e' ? 'tr-TR-Chirp3-HD-Charon' : 'tr-TR-Chirp3-HD-Kore');
    },
    koy: function (o, sakla) {
      if (!o) return false;
      var gecerli = function (id, c) { return BULUT_SESLER.some(function (v) { return v.id === id && v.cins === c; }); }, deg = false;
      if (gecerli(o.k, 'k') && o.k !== this.ogrenci.k) { this.ogrenci.k = o.k; deg = true; }
      if (gecerli(o.e, 'e') && o.e !== this.ogrenci.e) { this.ogrenci.e = o.e; deg = true; }
      if (sakla) depo.yaz('ogrSesler', { k: this.ogrenci.k, e: this.ogrenci.e });
      return deg;
    },
    servis: function (yol) { return Bulut.adres ? Bulut.adres.replace(/\/+$/, '') + yol : null; },
    yukle: function () { // ses servisindeki güncel öğrenci sesleri
      var self = this, u = this.servis('/ayar');
      if (!u || !window.fetch) return Promise.resolve(false);
      return fetch(u, { mode: 'cors', credentials: 'omit', cache: 'no-cache' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) { return !!(j && j.ogrenci && self.koy(j.ogrenci, true)); })
        .catch(function () { return false; });
    },
    ozetle: function (s) {
      if (!(window.crypto && crypto.subtle && window.TextEncoder)) return Promise.resolve('');
      return crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)).then(function (b) {
        return Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
      }, function () { return ''; });
    },
    gir: function (anahtar) { // true: bu cihazda öğretmen modu açıldı
      anahtar = String(anahtar || '').trim();
      return this.ozetle(anahtar).then(function (h) {
        if (!anahtar || h !== OGRETMEN_OZET) return false;
        depo.yaz('ogrAnahtar', anahtar);
        Oynatici.hepsi.forEach(function (o) { o.izinUygula(); o.sesListesi(); o.gorunumUygula(); });
        return true;
      });
    },
    cik: function () { depo.yaz('ogrAnahtar', ''); Oynatici.hepsi.forEach(function (o) { o.izinUygula(); o.sesListesi(); o.gorunumUygula(); }); },
    kaydet: function (o) { // öğrenci seslerini ses servisine yaz → 'tamam' | 'eski' | 'red' | 'ag'
      var self = this, u = this.servis('/ayar');
      if (!u || !window.fetch) return Promise.resolve('ag');
      return fetch(u, { method: 'POST', mode: 'cors', credentials: 'omit', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify({ anahtar: this.anahtar(), ogrenci: o }) })
        .then(function (r) {
          if (r.status === 404 || r.status === 405) return 'eski';
          if (r.status === 403) return 'red';
          if (!r.ok) return 'ag';
          self.koy(o, true); return 'tamam';
        }).catch(function () { return 'ag'; });
    }
  };
  (function () { var s = depo.al('ogrSesler', null); if (s) Izin.koy(s); })();
  // Öğretmen bağlantısı: …#ogretmen=anahtar. Anahtar adres çubuğundan hemen silinir, cihazda saklanır.
  (function () {
    var m = /(^#|&)ogretmen=([A-Za-z0-9_-]{8,64})/.exec(location.hash || '');
    if (!m) return;
    var h = location.hash.replace(m[0], m[1] === '#' ? '#' : '').replace(/^#&/, '#');
    try { history.replaceState(null, '', location.pathname + location.search + (h === '#' ? '' : h)); } catch (e) {}
    Izin.gir(m[2]).then(function (ok) { Izin.girisSonuc = ok ? 'tamam' : 'yanlis'; Oynatici.hepsi.forEach(function (o) { o.izinUygula(); }); });
  })();

  /* ================= karşılıklı anlatım: kadın ve erkek öğretmen sırayla anlatır ================= */
  var KONUSMACI = { A: { ad: 'Elif Hoca', cins: 'k' }, B: { ad: 'Kerem Hoca', cins: 'e' } };
  var TEPKILER = ['Evet, aynen öyle.', 'Çok önemli bir nokta.', 'Bunu biraz açalım.', 'Güzel, devam edelim.', 'Şöyle düşünelim.', 'Bunu not almakta fayda var.', 'Bir de şuna bakalım.'];
  function konusmaciSesi(kim) {
    var og = Izin.ogretmen();
    if (!ayar.ikili || !kim) return { bulut: Bulut.ses().id, cins: ayar.cins, ad: og ? ayar.sesAdi : '' };
    var c = KONUSMACI[kim].cins;
    return { bulut: (og && (c === 'e' ? ayar.bulutSesE : ayar.bulutSesK)) || Izin.sesi(c), cins: c, ad: og ? (c === 'e' ? ayar.sesAdiE : ayar.sesAdiK) : '' };
  }
  // Hangi adımı kimin anlatacağı: başlıkları Elif Hoca açar, anlatım sırayla paylaşılır,
  // soru cümlesini öbürü yanıtlar, not kâğıdını bir öğretmen baştan sona okur, arada kısa geçiş sözleri olur.
  function karsilikliPlan(adimlar) {
    var plan = [], son = null, tepki = 0, degisim = 0;
    var diger = function (k) { return k === 'A' ? 'B' : 'A'; };
    adimlar.forEach(function (a, i) {
      var b = (a.h || a.w || [])[0] || {}, c = ' ' + String(b.c || '') + ' ', html = String(b.html != null ? b.html : (b.t || '')), on = null, k;
      var onceki = adimlar[i - 1], oncekiSoru = !!(onceki && /\?\s*$/.test(onceki.s || ''));
      if (a.grafik && a.grafik.asama > 0 && son) k = son;
      else if (a.sil || / title /.test(c) || / label /.test(c)) k = 'A';
      else if (/ qd /.test(c) && son) k = son;
      else if (oncekiSoru) k = diger(son || 'A');
      else if (/ q /.test(c)) {
        k = diger(son || 'A');
        on = /kural/i.test(html) ? 'Burada bir kural var, iyi aklında tut.' : /tuzak|dikkat/i.test(html) ? 'Dikkat, burada sık yapılan bir hata var.' : /günlük hayat/i.test(html) ? 'Bunu günlük hayatla bağlayalım.' : null;
      } else {
        k = diger(son || 'B'); degisim++;
        if (degisim % 4 === 0 && !(a.w && !a.w.length) && (a.s || '').length > 40) on = TEPKILER[tepki++ % TEPKILER.length];
      }
      plan.push({ kim: k, on: on });
      son = k;
    });
    return plan;
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
    sil: function (k) { return this.islem('readwrite', function (st) { return st.delete(k); }).catch(function () {}); },
    anahtarlar: function () { return this.islem('readonly', function (st) { return st.getAllKeys ? st.getAllKeys() : null; }).then(function (l) { return l || []; }, function () { return []; }); }
  };
  var Yayin = {
    harita: {}, soz: null,
    yukle: function (taban) {
      var self = this;
      if (this.soz) return this.soz;
      if (window.SESLI_DERS_BULUT) Bulut.adres = window.SESLI_DERS_BULUT;
      if (!window.fetch || /^(file|blob|data):/.test(location.protocol)) return (this.soz = Promise.resolve());
      var bulutSoz = Bulut.adres ? Promise.resolve() : fetch(taban + 'bulut.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) {
          if (j && typeof j.adres === 'string' && /^https:\/\//.test(j.adres)) Bulut.adres = j.adres;
          if (j && j.ogrenci && !depo.al('ogrSesler', null)) Izin.koy(j.ogrenci);
        }).catch(function () {});
      var listeSoz = fetch(taban + 'liste.json', { cache: 'no-cache' })
        .then(function (r) { if (!r.ok) throw new Error('liste yok'); return r.json(); })
        .then(function (l) {
          var adlar = Array.isArray(l) ? l : (l.paketler || []);
          return Promise.all(adlar.map(function (ad) { return fetch(taban + ad).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); }));
        })
        .then(function (paketler) { (paketler || []).forEach(function (p) { if (p && p.kayitlar) Object.keys(p.kayitlar).forEach(function (h) { self.harita[h] = p.kayitlar[h]; }); }); })
        .catch(function () {});
      this.soz = Promise.all([listeSoz, bulutSoz.then(function () { return Izin.yukle(); })]);
      return this.soz;
    },
    al: function (h) { return this.harita[h] || null; },
    var: function () { for (var k in this.harita) if (this.harita.hasOwnProperty(k)) return true; return false; }
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
      var sembolOnu = /^(sembol|işaret|ok)/i.test(toks[i + 1] || '');
      if (tok === '→' || tok === '->' || tok === '⟶') { var r = sembolOnu ? 'tek yönlü ok' : onceFormul ? 'verir,' : 'yani'; onceFormul = false; return { s: r }; }
      if (tok === '⇌' || tok === '<=>' || tok === '⇄') { onceFormul = false; return { s: sembolOnu ? 'çift yönlü ok' : 'dengede,' }; }
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

  /* ---- Metni tahta adımlarına böl: bir cümleden 2–3 sayfalık konuya kadar ----
     Her cümle bir adım olur. Başlık satırı yeni tahtada başlar, maddeler işaretiyle
     yazılır, çok uzun cümleler noktalı virgül, iki nokta, virgül ya da bağlaçtan
     bölünür. PDF'den kopyalanan metinde cümlenin ortasına düşen satır sonları birleşir.
     Tahta dolunca silinip yazmaya devam edilir (bkz. Oynatici.prototype.ekle). */
  var METIN_SINIR = 30000;   // eklenebilecek en uzun metin: yaklaşık 10 sayfa
  var PARCA_SINIR = 230;     // tahtaya tek adımda yazılacak en uzun parça
  var ozelSayac = 0;
  var MADDE_RE = /^(?:[-–—•*·▪●◦►✓✔]|\d{1,2}[.)]|[a-eA-E][)])\s+/;
  var KISALTMA_RE = /(?:^|[\s(])(?:vb|vs|vd|örn|ör|bkz|yy|sf|no|dr|prof|doç|yrd|av|bl)\.$/i;
  var CUMLE_SONU_RE = /[.!?…:;]["”»’)\]]*$/;
  function binlik(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function cumlelereAyir(s) {
    var out = [], bas = 0, re = /[.!?…]+["”»’)\]]*(?=\s+["“«(\[]?[A-ZÇĞİÖŞÜ0-9])/g, m, p;
    while ((m = re.exec(s))) {
      p = s.slice(bas, m.index + m[0].length);
      // kısaltma (vb., örn.), baş harf (M.) ya da madde numarası (1.) cümleyi bitirmez
      if (m[0] === '.' && (KISALTMA_RE.test(p) || /(?:^|\s)[A-ZÇĞİÖŞÜ]\.$/.test(p) || /^\s*\d{1,2}\.$/.test(p))) continue;
      if (p.trim()) out.push(p.trim());
      bas = m.index + m[0].length;
    }
    if (s.slice(bas).trim()) out.push(s.slice(bas).trim());
    return out;
  }
  function uzunuBol(c) {
    if (c.length <= PARCA_SINIR) return [c];
    var ayraclar = [/;\s+/g, /:\s+/g, /,\s+/g, /\s(?=(?:ve|veya|ya da|ancak|fakat|ama|çünkü|yani|bu nedenle|bu yüzden|böylece)\s)/g];
    for (var k = 0; k < ayraclar.length; k++) {
      var re = ayraclar[k], m, en = -1, fark = Infinity, kes;
      while ((m = re.exec(c))) {
        kes = k < 3 ? m.index + 1 : m.index; // noktalama önceki parçada kalır, bağlaç sonrakine geçer
        if (kes >= 40 && c.length - kes >= 40 && Math.abs(kes - c.length / 2) < fark) { fark = Math.abs(kes - c.length / 2); en = kes; }
      }
      if (en > 0) return uzunuBol(c.slice(0, en).trim()).concat(uzunuBol(c.slice(en).trim()));
    }
    var b = c.lastIndexOf(' ', Math.floor(c.length / 2));
    return b > 20 ? uzunuBol(c.slice(0, b)).concat(uzunuBol(c.slice(b + 1))) : [c];
  }
  function metniBol(metin) {
    var B = [];
    String(metin || '').replace(/\r\n?/g, '\n').split('\n').forEach(function (ham) {
      var s = ham.replace(/[\t  ]+/g, ' ').trim(), son = B[B.length - 1];
      if (!s) { if (son && son.tur !== 'bos') B.push({ tur: 'bos' }); return; }
      var madde = MADDE_RE.exec(s), kucuk = /^[a-zçğıöşü(]/.test(s);
      // satır sonu cümlenin ortasına düşmüşse alt satır üsttekine eklenir
      var devam = son && son.tur !== 'bos' && !madde && (son.tur === 'metin' ? !CUMLE_SONU_RE.test(son.t) : kucuk && (son.tur === 'baslik' || !CUMLE_SONU_RE.test(son.t)));
      if (devam) {
        son.t = /[-‐]$/.test(son.t) && kucuk ? son.t.replace(/[-‐]$/, '') + s : son.t + ' ' + s;
        if (son.tur === 'baslik') son.tur = 'metin';
        return;
      }
      if (madde) { B.push({ tur: 'madde', t: s.slice(madde[0].length), isaret: /^[\da-eA-E]/.test(madde[0]) ? madde[0].trim() : '•' }); return; }
      var baslik = s.length <= 70 && s.split(' ').length <= 9 && !kucuk && !/[.!?;:,…]["”»’)\]]*$/.test(s) && /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(s);
      B.push({ tur: baslik ? 'baslik' : 'metin', t: s });
    });
    for (var i = B.length - 1; i >= 0; i--) if (B[i].tur !== 'bos') { if (B[i].tur === 'baslik') B[i].tur = 'metin'; break; } // en sondaki kısa satır başlık değildir
    var out = [];
    B.forEach(function (b) {
      if (b.tur === 'bos') return;
      if (b.tur === 'baslik') { out.push({ tur: 'baslik', t: b.t }); return; }
      var parca = [];
      cumlelereAyir(b.t).forEach(function (c) { parca.push.apply(parca, uzunuBol(c)); });
      parca.forEach(function (c, k) { out.push({ tur: b.tur, t: b.tur === 'madde' && k === 0 ? b.isaret + ' ' + c : c, s: c }); });
    });
    return out;
  }
  // Parçalardan tahta adımları. o.grup: eklenen metnin kimliği, o.sinif(p, i, hepsi): yazı sınıfı
  function metinAdimlari(parcalar, o) {
    o = o || {};
    return parcalar.map(function (p, i) {
      var soz = p.tur === 'baslik' && !/[.!?…]$/.test(p.t) ? p.t + '.' : (p.s || p.t);
      var a = { oto: 1, w: [{ c: p.tur === 'baslik' ? 'title' : (o.sinif ? o.sinif(p, i, parcalar) : ''), t: p.t }], s: konusmaMetni(soz) };
      if (p.tur === 'baslik' && i > 0) a.sil = 1;
      if (o.grup) a.ozel = o.grup;
      return a;
    });
  }
  function metinOzeti(metin) {
    var t = String(metin || '').trim();
    if (!t) return 'En çok ' + binlik(METIN_SINIR) + ' karakter (yaklaşık 10 sayfa) ekleyebilirsin.';
    var n = metniBol(t).length;
    return binlik(t.length) + ' / ' + binlik(METIN_SINIR) + ' karakter · ' + n + ' adım · yaklaşık ' + Math.max(1, Math.round(t.length / 800)) + ' dakika';
  }
  // Metinden ders: her cümle bir adım
  function metindenDers(metin, baslik) {
    var parcalar = metniBol(metin), kisa = parcalar.length <= 12;
    var ilkBaslik = parcalar.length && parcalar[0].tur === 'baslik' ? parcalar[0].t : null;
    var adimlar = metinAdimlari(parcalar, { sinif: function (p, i, hepsi) { return /^soru\b/i.test(p.t) ? 'q' : (kisa && i === hepsi.length - 1 ? 'ok' : ''); } });
    if (!ilkBaslik) adimlar.unshift({ w: [{ c: 'title', t: 'Birlikte çözelim' }], s: 'Bu metni birlikte tahtada inceleyelim.' });
    adimlar[0].sil = 1; adimlar[0].sahne = null;
    return { id: 'metin', baslik: baslik || ilkBaslik || 'Kendi metnin', adimlar: adimlar };
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
      var sinif = tur === 'q' ? (notIcinde ? 'qd' : 'q') : tur === 'ok' ? 'ok' : '';
      var gg = gorsel && gorsel.tagName.toLowerCase() === 'svg' ? grafikAdimlari(html, sinif, yazi ? htmlKonusma(html) : '') : null;
      if (gg) adimlar.push.apply(adimlar, gg); else adimlar.push({ h: [{ c: sinif, html: html }], s: s });
      notIcinde = tur === 'q';
    };
    (o.soru || []).forEach(function (h) { ekle(h, 'q'); });
    (o.siklar || []).forEach(function (h) { ekle(h, 'q'); });
    notIcinde = false;
    var cozumBas = adimlar.length;
    if ((o.cozum || []).length || o.cevap) {
      adimlar.push({ w: [{ c: 'label', t: 'Çözüm' }], s: 'Şimdi çözüme geçelim.' });
      (o.cozum || []).forEach(function (h) { ekle(h, 'c'); });
      if (o.cevap) ekle('<b>Cevap:</b> ' + o.cevap, 'ok');
    }
    grupla(adimlar, 0, cozumBas, adimlar.length);
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
  /* ================= grafikler: eksen, eğri ve yazıları tanı; tahtada adım adım çizerek anlat =================
     Konu anlatımındaki ve sorulardaki eksenli SVG grafikler tanınır: eksen çiftleri (dikey + yatay, ortak başlangıç),
     eksen adları, eğriler (renge göre), kesikli kılavuz çizgileri, eğri adları. Her öğeye çizim aşaması yazılır
     (data-ga: aşama, data-gs: sıra, data-gt: c = çizilerek, f = belirerek); ders adımları bu aşamalarla kurulur:
     önce eksenler, sonra her eğri, en son kılavuzlar ve notlar. Kalem çizilen yerin ucunu izler. */
  var grafikSayac = 0;
  function gRenk(s) { // 'rgb(1, 2, 3)' → [1,2,3] ya da null
    var m = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?/.exec(s || '');
    if (!m || (m[4] != null && +m[4] === 0)) return null;
    return [+m[1], +m[2], +m[3]];
  }
  function gRenkFark(a, b) { return !a || !b ? 999 : Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]); }
  function gRenkAdi(c) {
    if (!c) return '';
    var r = c[0] / 255, g = c[1] / 255, b = c[2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn, h = 0;
    var s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    if (s < 0.18 || d < 0.08) return l < 0.3 ? 'siyah' : 'gri';
    if (mx === r) h = 60 * (((g - b) / d) % 6); else if (mx === g) h = 60 * ((b - r) / d + 2); else h = 60 * ((r - g) / d + 4);
    if (h < 0) h += 360;
    if (h < 14 || h >= 340) return 'kırmızı';
    if (h < 42) return l < 0.32 ? 'kahverengi' : 'turuncu';
    if (h < 68) return 'sarı';
    if (h < 165) return 'yeşil';
    if (h < 195) return 'camgöbeği';
    if (h < 255) return l < 0.26 ? 'lacivert' : 'mavi';
    if (h < 295) return 'mor';
    return 'pembe';
  }
  function gMatris(kok, el) { try { var a = kok.getScreenCTM(), b = el.getScreenCTM(); if (a && b) return a.inverse().multiply(b); } catch (e) {} return null; }
  function gNokta(m, x, y) { return m ? [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f] : [x, y]; }
  function gKoseler(el) { // düz çizgilerden oluşan öğenin köşeleri (yerel koordinat) ya da null
    var t = el.tagName.toLowerCase(), A = function (n) { return parseFloat(el.getAttribute(n)) || 0; };
    if (t === 'line') return [[A('x1'), A('y1')], [A('x2'), A('y2')]];
    if (t === 'polyline' || t === 'polygon') {
      var s = (el.getAttribute('points') || '').trim().split(/[\s,]+/).map(parseFloat), k = [];
      for (var i = 0; i + 1 < s.length; i += 2) k.push([s[i], s[i + 1]]);
      if (t === 'polygon' && k.length) k.push(k[0]);
      return k.length >= 2 ? k : null;
    }
    if (t === 'path') {
      var d = el.getAttribute('d') || '';
      if (/[CcSsQqTtAa]/.test(d)) return null;
      var re = /([MmLlHhVvZz])([^MmLlHhVvZz]*)/g, mm, x = 0, y = 0, x0 = 0, y0 = 0, out = [];
      while ((mm = re.exec(d))) {
        var c = mm[1], n = mm[2].trim() ? mm[2].trim().split(/[\s,]+|(?=-)/).map(parseFloat) : [], j;
        if (c === 'Z' || c === 'z') { x = x0; y = y0; out.push([x, y]); continue; }
        for (j = 0; j < n.length;) {
          if (c === 'M' || c === 'L') { x = n[j]; y = n[j + 1]; j += 2; }
          else if (c === 'm' || c === 'l') { x += n[j]; y += n[j + 1]; j += 2; }
          else if (c === 'H') { x = n[j]; j++; } else if (c === 'h') { x += n[j]; j++; }
          else if (c === 'V') { y = n[j]; j++; } else if (c === 'v') { y += n[j]; j++; }
          else break;
          if (c === 'M' || c === 'm') { x0 = x; y0 = y; }
          out.push([x, y]);
        }
      }
      return out.length >= 2 ? out : null;
    }
    return null;
  }
  // Yol düğümleri: düz parçaların uçları (duz = 1) ve eğri parçalarda ara noktalar; yay (A) varsa null
  function gYolDugum(d) {
    if (!d || /[Aa]/.test(d)) return null;
    var re = /([MmLlHhVvCcSsQqTtZz])([^MmLlHhVvCcSsQqTtZz]*)/g, mm, x = 0, y = 0, x0 = 0, y0 = 0, kx = 0, ky = 0, out = [], onc = '';
    var bez = function (pts) { // pts: [x0,y0, x1,y1, x2,y2, (x3,y3)] → 8 ara nokta
      for (var k = 1; k <= 8; k++) {
        var t = k / 8, u = 1 - t, X, Y;
        if (pts.length === 8) { X = u * u * u * pts[0] + 3 * u * u * t * pts[2] + 3 * u * t * t * pts[4] + t * t * t * pts[6]; Y = u * u * u * pts[1] + 3 * u * u * t * pts[3] + 3 * u * t * t * pts[5] + t * t * t * pts[7]; }
        else { X = u * u * pts[0] + 2 * u * t * pts[2] + t * t * pts[4]; Y = u * u * pts[1] + 2 * u * t * pts[3] + t * t * pts[5]; }
        out.push([X, Y, 0]);
      }
    };
    while ((mm = re.exec(d))) {
      var c = mm[1], n = mm[2].trim() ? mm[2].trim().replace(/(\d)-/g, '$1 -').split(/[\s,]+/).map(parseFloat) : [], j = 0, r = c === c.toLowerCase();
      if (c === 'Z' || c === 'z') { x = x0; y = y0; out.push([x, y, 1]); onc = c; continue; }
      do {
        var bx = r ? x : 0, by = r ? y : 0;
        switch (c.toUpperCase()) {
          case 'M': x = bx + n[j]; y = by + n[j + 1]; j += 2; x0 = x; y0 = y; out.push([x, y, 1]); c = r ? 'l' : 'L'; break;
          case 'L': x = bx + n[j]; y = by + n[j + 1]; j += 2; out.push([x, y, 1]); break;
          case 'H': x = bx + n[j]; j++; out.push([x, y, 1]); break;
          case 'V': y = (r ? y : 0) + n[j]; j++; out.push([x, y, 1]); break;
          case 'C': bez([x, y, bx + n[j], by + n[j + 1], kx = bx + n[j + 2], ky = by + n[j + 3], bx + n[j + 4], by + n[j + 5]]); x = bx + n[j + 4]; y = by + n[j + 5]; j += 6; break;
          case 'S': var sx = /[CcSs]/.test(onc) ? 2 * x - kx : x, sy = /[CcSs]/.test(onc) ? 2 * y - ky : y; bez([x, y, sx, sy, kx = bx + n[j], ky = by + n[j + 1], bx + n[j + 2], by + n[j + 3]]); x = bx + n[j + 2]; y = by + n[j + 3]; j += 4; break;
          case 'Q': bez([x, y, kx = bx + n[j], ky = by + n[j + 1], bx + n[j + 2], by + n[j + 3]]); x = bx + n[j + 2]; y = by + n[j + 3]; j += 4; break;
          case 'T': var tx = /[QqTt]/.test(onc) ? 2 * x - kx : x, ty = /[QqTt]/.test(onc) ? 2 * y - ky : y; kx = tx; ky = ty; bez([x, y, tx, ty, bx + n[j], by + n[j + 1]]); x = bx + n[j]; y = by + n[j + 1]; j += 2; break;
          default: j = n.length;
        }
        onc = mm[1];
      } while (j < n.length && n.length);
    }
    return out.length >= 2 && out.every(function (q) { return isFinite(q[0]) && isFinite(q[1]); }) ? out : null;
  }
  // Öğenin kök koordinatlarında örnek noktaları ve uzunluğu
  function gOrnekle(kok, el, n) {
    var m = gMatris(kok, el), k = gKoseler(el), out = [], L = 0, i;
    if (k) {
      var pk = k.map(function (p) { return gNokta(m, p[0], p[1]); }), uz = [0];
      for (i = 1; i < pk.length; i++) uz.push(uz[i - 1] + Math.hypot(pk[i][0] - pk[i - 1][0], pk[i][1] - pk[i - 1][1]));
      L = uz[uz.length - 1];
      for (i = 0; i <= n; i++) {
        var hedef = L * i / n, j = 1; while (j < uz.length - 1 && uz[j] < hedef) j++;
        var a = pk[j - 1], b = pk[j], u = uz[j] - uz[j - 1] > 0 ? (hedef - uz[j - 1]) / (uz[j] - uz[j - 1]) : 0;
        out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]);
      }
      return { L: L, n: out, kose: pk };
    }
    try { L = el.getTotalLength(); } catch (e) { L = 0; }
    if (!(L > 0)) return { L: 0, n: [] };
    for (i = 0; i <= n; i++) { var p = el.getPointAtLength(L * i / n); out.push(gNokta(m, p.x, p.y)); }
    var s = m ? Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) : 1;
    var dg = el.tagName.toLowerCase() === 'path' ? gYolDugum(el.getAttribute('d')) : null;
    return { L: L * s, n: out, dugum: dg ? dg.map(function (q) { var t = gNokta(m, q[0], q[1]); return [t[0], t[1], q[2]]; }) : null };
  }
  function gKutu(kok, el) {
    var b; try { b = el.getBBox(); } catch (e) { return null; }
    var m = gMatris(kok, el), p = [gNokta(m, b.x, b.y), gNokta(m, b.x + b.width, b.y), gNokta(m, b.x, b.y + b.height), gNokta(m, b.x + b.width, b.y + b.height)];
    var xs = p.map(function (q) { return q[0]; }), ys = p.map(function (q) { return q[1]; });
    return [Math.min.apply(null, xs), Math.min.apply(null, ys), Math.max.apply(null, xs), Math.max.apply(null, ys)];
  }
  function gMetin(t) { return String(t || '').replace(/\s+/g, ' ').trim(); }
  function gYazi(el) { // <text>: alt simge tspan'ları ayrı sözcük olur (t<tspan>denge</tspan> → "t denge")
    var parca = [];
    (function gez(n) { Array.prototype.forEach.call(n.childNodes, function (c) { if (c.nodeType === 3) parca.push(c.nodeValue); else if (c.nodeType === 1) { parca.push(' '); gez(c); parca.push(' '); } }); })(el);
    return gMetin(parca.join('').replace(/\s+([,.;:)])/g, '$1').replace(/([(])\s+/g, '$1'));
  }
  function gSayi(t) { var m = /^[−-]?\d+(?:[.,]\d+)?$/.exec(gMetin(t).replace(/\s/g, '')); return m ? parseFloat(m[0].replace(',', '.').replace('−', '-')) : null; }
  function gAnahtar(t) { // eğri adından eşleştirme anahtarları: formüller ve sözcükler (küçük harf, alt simgesiz)
    var s = String(t || '').replace(/[₀-₉]/g, function (c) { return String(c.charCodeAt(0) - 8320); }).replace(/[⁰¹²³⁴-⁹⁺⁻]/g, '');
    return s.toLocaleLowerCase('tr-TR').split(/[^a-zçğıöşü0-9]+/).filter(function (x) { return x.length >= 2 && !/^(ve|ile|mol|sn|dk|derişim|derişimi|derişimleri|zaman|eğri|eğrisi|grafik|grafiği|grafikte|sayısı|sabit|değer|değeri|hız|hızı|gaz|katı|sıvı|suda)$/.test(x) && !/^\d+$/.test(x); });
  }
  var GRAFIK_ON = /<line\b[^>]*\bx1="([\d.]+)"[^>]*\bx2="\1"|<polyline\b|\bd="M\s*[\d.]+[\s,]+[\d.]+\s*[LV]/;
  function grafikCoz(kaynak) {
    if (!kaynak || !document.body || !window.SVGElement || !document.createElementNS) return null;
    if (!GRAFIK_ON.test(kaynak.outerHTML || '') || !kaynak.querySelector('text')) return null;
    var kap = document.createElement('div');
    kap.setAttribute('aria-hidden', 'true');
    kap.style.cssText = 'position:absolute;left:-12000px;top:0;width:900px;visibility:hidden;pointer-events:none;contain:layout';
    var svg = kaynak.cloneNode(true);
    kap.appendChild(svg); document.body.appendChild(kap);
    try { return grafikCoz2(svg); } catch (e) { return null; } finally { if (kap.parentNode) kap.parentNode.removeChild(kap); }
  }
  function grafikCoz2(svg) {
    var vb = svg.viewBox && svg.viewBox.baseVal, W = vb && vb.width ? vb.width : 0, H = vb && vb.height ? vb.height : 0;
    if (!W || !H) { var bb0 = svg.getBBox(); W = bb0.width; H = bb0.height; }
    if (!W || !H) return null;
    var oge = [], sira = 0;
    Array.prototype.forEach.call(svg.querySelectorAll('line,polyline,polygon,path,rect,circle,ellipse,text'), function (el) {
      if (el.closest('defs,clipPath,mask,marker,pattern,symbol,text') && el.tagName.toLowerCase() !== 'text') return;
      if (el.tagName.toLowerCase() === 'text' && el.parentNode && el.parentNode.closest && el.parentNode.closest('text')) return;
      var cs = getComputedStyle(el), o = { el: el, t: el.tagName.toLowerCase(), i: sira++ };
      if (cs.display === 'none') return;
      o.bb = gKutu(svg, el); if (!o.bb) return;
      o.cx = (o.bb[0] + o.bb[2]) / 2; o.cy = (o.bb[1] + o.bb[3]) / 2; o.w = o.bb[2] - o.bb[0]; o.h = o.bb[3] - o.bb[1];
      o.stroke = cs.stroke && cs.stroke !== 'none' && (parseFloat(cs.strokeWidth) || 0) > 0 ? gRenk(cs.stroke) : null;
      o.fill = cs.fill && cs.fill !== 'none' ? gRenk(cs.fill) : null;
      o.kesik = !!(cs.strokeDasharray && cs.strokeDasharray !== 'none' && !/^0(px)?$/.test(cs.strokeDasharray));
      if (o.t === 'text') { o.metin = gYazi(el); if (!o.metin) return; }
      else if (o.stroke || o.fill) { var r = gOrnekle(svg, el, o.t === 'line' ? 2 : 48); o.L = r.L; o.n = r.n; o.kose = r.kose; o.dugum = r.dugum; }
      oge.push(o);
    });
    // eksen adayları: düz dikey ve yatay çizgiler
    var enAz = Math.max(26, 0.16 * Math.min(W, H)), dikey = [], yatay = [];
    oge.forEach(function (o) {
      if (o.t === 'text' || !o.stroke || o.kesik || !o.kose) return;
      var k = o.kose;
      if (k.length === 2) {
        if (o.w < 2 && o.h >= enAz) dikey.push({ o: o, x: o.cx, ust: o.bb[1], alt: o.bb[3] });
        else if (o.h < 2 && o.w >= enAz) yatay.push({ o: o, y: o.cy, sol: o.bb[0], sag: o.bb[2] });
      } else if (k.length === 3) { // tek parça L biçimli eksen
        var a = k[0], b = k[1], c = k[2];
        if (Math.abs(a[0] - b[0]) < 2 && Math.abs(b[1] - c[1]) < 2 && Math.abs(a[1] - b[1]) >= enAz && Math.abs(c[0] - b[0]) >= enAz) {
          dikey.push({ o: o, x: b[0], ust: Math.min(a[1], b[1]), alt: Math.max(a[1], b[1]), L: true }); yatay.push({ o: o, y: b[1], sol: Math.min(b[0], c[0]), sag: Math.max(b[0], c[0]), L: true });
        }
      }
    });
    var paneller = [], kullanildi = [];
    dikey.forEach(function (v) {
      var en = null, ef = 1e9;
      yatay.forEach(function (h) {
        if (kullanildi.indexOf(h) >= 0) return;
        var f = Math.abs(v.alt - h.y) + Math.abs(v.x - h.sol);
        if (Math.abs(v.alt - h.y) <= 9 && Math.abs(v.x - h.sol) <= 9 && f < ef) { ef = f; en = h; }
      });
      if (en) { kullanildi.push(en); paneller.push({ V: v, Hz: en, ox: v.x, oy: en.y, ust: v.ust, sag: en.sag, ogeler: [] }); }
    });
    if (!paneller.length) return null;
    paneller.sort(function (a, b) { return Math.abs(a.oy - b.oy) > 30 ? a.oy - b.oy : a.ox - b.ox; });
    // öğeleri panellere dağıt
    var eksenOge = [];
    paneller.forEach(function (p) { eksenOge.push(p.V.o, p.Hz.o); p.gx = p.sag - p.ox; p.gy = p.oy - p.ust; });
    var panelBul = function (o) {
      var en = null, ef = 1e9;
      paneller.forEach(function (p) {
        var x0 = p.ox - Math.max(48, 0.24 * p.gx), x1 = p.sag + 34, y0 = p.ust - 34, y1 = p.oy + Math.max(46, 0.2 * p.gy);
        if (o.cx >= x0 && o.cx <= x1 && o.cy >= y0 && o.cy <= y1) {
          var f = Math.hypot(o.cx - (p.ox + p.sag) / 2, o.cy - (p.oy + p.ust) / 2);
          if (f < ef) { ef = f; en = p; }
        }
      });
      return en;
    };
    var disari = [];
    oge.forEach(function (o) { if (eksenOge.indexOf(o) >= 0) return; var p = panelBul(o); if (p) p.ogeler.push(o); else disari.push(o); });
    // her panelde rolleri belirle
    paneller.forEach(function (p, pi) {
      p.okler = []; p.isaret = []; p.yazilar = []; p.egriler = []; p.kesik = []; p.nokta = []; p.dolgu = []; p.olcu = [];
      p.ogeler.forEach(function (o) {
        if (o.t === 'text') { p.yazilar.push(o); return; }
        var kucuk = Math.max(o.w, o.h) <= 17;
        if (kucuk && o.fill && (o.t === 'path' || o.t === 'polygon') && (Math.hypot(o.cx - p.ox, o.cy - p.ust) < 14 || Math.hypot(o.cx - p.sag, o.cy - p.oy) < 14)) { p.okler.push(o); return; }
        if (o.stroke && o.kose && o.kose.length === 2 && (o.L || 0) < 13 && ((o.w < 2 && Math.abs(o.cy - p.oy) < 9) || (o.h < 2 && Math.abs(o.cx - p.ox) < 9))) { p.isaret.push(o); return; }
        if ((o.t === 'circle' || o.t === 'ellipse') && Math.max(o.w, o.h) <= 15) { p.nokta.push(o); return; }
        var duz = o.kose && o.kose.length === 2 && (o.w < 2 || o.h < 2);
        if (o.kesik && o.stroke && (duz || o.t === 'line')) { p.kesik.push(o); return; }
        if (o.stroke && duz && o.w < 2 && (o.L || 0) >= 12) { p.olcu.push(o); return; }
        if (o.stroke && (o.L || 0) >= 12 && o.t !== 'rect') { if (o.kesik) o.acil = true; p.egriler.push(o); return; }
        p.dolgu.push(o);
      });
      // yazılar: eksen adları, bölme yazıları, panel başlığı, eğri adları
      var xAd = null, yAd = null, baslik = null, xBol = [], yBol = [], kalan = [];
      p.yazilar.forEach(function (o) {
        var n = gSayi(o.metin), kisa = o.metin.length <= 6;
        if (o.cx < p.ox - 2 && o.cy <= p.oy + 8 && o.cy >= p.ust - 6 && (n != null || kisa) && o.bb[2] <= p.ox + 2) { yBol.push(o); return; }
        if (o.cy > p.oy + 2 && o.cy < p.oy + 30 && o.cx >= p.ox - 12 && o.cx <= p.sag - 18 && (n != null || kisa)) { xBol.push(o); return; }
        kalan.push(o);
      });
      kalan.forEach(function (o) {
        var dy = Math.hypot(o.cx - p.ox, o.cy - p.ust), dx = Math.hypot(o.cx - p.sag, o.cy - p.oy);
        if (!yAd && (dy < 62 || (Math.abs(o.bb[0] - p.ox) < 34 && o.cy < p.ust + 6 && o.cy > p.ust - 40)) && o.cy < p.ust + 22) { yAd = o; return; }
        if (!yAd && o.cx < p.ox && o.h > o.w * 1.6) { yAd = o; return; } // döndürülmüş dikey eksen adı
        if (!xAd && (dx < 76 || (Math.abs(o.bb[2] - p.sag) < 60 && o.cy > p.oy + 2 && o.cy < p.oy + 40)) && o.cy > p.oy - 24) { xAd = o; return; }
      });
      kalan = kalan.filter(function (o) { return o !== xAd && o !== yAd; });
      kalan.forEach(function (o) {
        if (!baslik && o.cy > p.oy + 20 && o.metin.length >= 5 && o.metin.length <= 44) { baslik = o; return; }
        if (o.cy > p.oy + 20 && o.metin.length > 44) { o.not = true; return; }
        if (!xAd && o.cy > p.oy + 10 && o.cy < p.oy + 40 && Math.abs(o.cx - (p.ox + p.sag) / 2) < p.gx * 0.3 && o.metin.length <= 24) xAd = o;
      });
      kalan = kalan.filter(function (o) { return o !== xAd && o !== baslik; });
      p.xAd = xAd; p.yAd = yAd; p.baslik = baslik; p.xBol = xBol; p.yBol = yBol;
      // eğrileri renge göre grupla
      var gruplar = [];
      p.egriler.forEach(function (o) {
        var g = null;
        gruplar.forEach(function (x) { if (!g && gRenkFark(x.renk, o.stroke) < 40 && x.kesik === !!o.acil) g = x; });
        if (!g) { g = { renk: o.stroke, kesik: !!o.acil, ogeler: [], yazilar: [], nokta: [] }; gruplar.push(g); }
        g.ogeler.push(o);
      });
      gruplar.forEach(function (g) { g.ogeler.sort(function (a, b) { return a.bb[0] - b.bb[0] || a.i - b.i; }); });
      // kesikli kılavuz çizgilerinin yazıları (uçlarına yakın ya da dikey çizginin altında)
      p.kesikYazi = [];
      p.kesik.forEach(function (k) {
        var uc = k.n && k.n.length ? [k.n[0], k.n[k.n.length - 1]] : [[k.cx, k.cy]];
        kalan.slice().forEach(function (o) {
          if (o.not) return;
          if (uc.some(function (q) { return Math.hypot(q[0] - o.cx, q[1] - o.cy) < 22; }) || (k.w < 2 && Math.abs(o.cx - k.cx) < 10 && o.cy > p.oy)) { p.kesikYazi.push({ k: k, o: o }); kalan.splice(kalan.indexOf(o), 1); }
        });
        p.xBol.forEach(function (o) { if (k.w < 2 && Math.abs(o.cx - k.cx) < 10) p.kesikYazi.push({ k: k, o: o, bol: true }); });
      });
      // eğri adları: aynı renkte yazı, yoksa eğrinin ucuna en yakın yazı; sayı yazıları eğrinin değeridir
      var sahipsiz = [];
      p.olcu.forEach(function (o) { o.yazilar = []; });
      kalan.forEach(function (o) {
        if (o.not) { sahipsiz.push(o); return; }
        var en = null, ef = 1e9, enO = null, efO = 1e9;
        gruplar.forEach(function (g) {
          var renkli = o.fill && gRenkFark(o.fill, g.renk) < 46;
          g.ogeler.forEach(function (e) { (e.n || []).forEach(function (q) { var f = Math.hypot(q[0] - o.cx, q[1] - o.cy) - (renkli ? 60 : 0); if (f < ef) { ef = f; en = g; } }); });
        });
        p.olcu.forEach(function (k) { var renkli = o.fill && gRenkFark(o.fill, k.stroke) < 46, f = Math.abs(o.cx - k.cx) + Math.max(0, Math.abs(o.cy - k.cy) - k.h / 2) - (renkli ? 40 : 0); if (f < efO) { efO = f; enO = k; } });
        if (enO && efO < 30 && efO <= ef) { enO.yazilar.push(o); return; }
        if (en && ef < 34) { if (gSayi(o.metin) != null) (en.degerler = en.degerler || []).push(o); else en.yazilar.push(o); }
        else sahipsiz.push(o);
      });
      p.nokta.forEach(function (o) {
        var en = null, ef = 1e9;
        gruplar.forEach(function (g) { g.ogeler.forEach(function (e) { (e.n || []).forEach(function (q) { var f = Math.hypot(q[0] - o.cx, q[1] - o.cy); if (f < ef) { ef = f; en = g; } }); }); });
        if (en && ef < 10) en.nokta.push(o); else sahipsiz.push(o);
      });
      // ölçü oklarının uçları (küçük dolu üçgenler)
      p.dolgu = p.dolgu.filter(function (o) {
        if (Math.max(o.w, o.h) > 17 || !o.fill) return true;
        var k = null; p.olcu.forEach(function (x) { if (!k && Math.abs(o.cx - x.cx) < 8 && o.cy >= x.bb[1] - 14 && o.cy <= x.bb[3] + 14) k = x; });
        if (k) { (k.uclar = k.uclar || []).push(o); return false; }
        return true;
      });
      p.gruplar = gruplar; p.sahipsiz = sahipsiz;
    });
    // aşamalar ve konuşmalar
    var asamalar = [], id = 'g' + (++grafikSayac) + '-' + Math.random().toString(36).slice(2, 6);
    var isaretle = function (o, a, s, tur) { if (!o || o.el.hasAttribute('data-ga')) return; o.el.setAttribute('data-ga', a); o.el.setAttribute('data-gs', s); o.el.setAttribute('data-gt', tur); };
    var ys = function (o) { return o ? konusmaMetni(o.metin.replace(/^\((.*)\)$/, '$1')) : ''; };
    var bs = function (o) { return o ? konusmaMetni(o.metin.replace(/^\(?[a-zçğıöşü0-9]{1,2}\)\s*/i, '').replace(/\s+[–—-]\s+/g, '-')) : ''; };
    var Ydeger = function (p, y) { return (p.oy - y) / Math.max(1, p.gy); }, Xdeger = function (p, x) { return (x - p.ox) / Math.max(1, p.gx); };
    var cokPanel = paneller.length > 1, siraAd = ['Birinci', 'İkinci', 'Üçüncü', 'Dördüncü'];
    paneller.forEach(function (p, pi) {
      // 1) eksenler
      var a = asamalar.length, s = 0;
      isaretle(p.V.o, a, s++, 'c'); if (p.Hz.o !== p.V.o) isaretle(p.Hz.o, a, s++, 'c');
      p.okler.forEach(function (o) { isaretle(o, a, s++, 'f'); });
      [p.yAd, p.xAd].forEach(function (o) { isaretle(o, a, s++, 'f'); });
      p.isaret.forEach(function (o) { isaretle(o, a, s++, 'f'); });
      p.yBol.concat(p.xBol.filter(function (o) { return !p.kesikYazi.some(function (k) { return k.o === o; }); })).forEach(function (o) { isaretle(o, a, s++, 'f'); });
      isaretle(p.baslik, a, s++, 'f');
      var giris = cokPanel ? (siraAd[pi] || ((pi + 1) + '.')) + ' grafik' + (p.baslik ? ': ' + bs(p.baslik) + '.' : '.') : (p.baslik ? bs(p.baslik) + ' grafiğini adım adım çizelim.' : 'Grafiği adım adım çizelim.');
      var eksen = p.xAd && p.yAd ? ' Önce eksenler: yatay eksen ' + ys(p.xAd) + ', dikey eksen ' + ys(p.yAd) + '.' : p.yAd ? ' Önce eksenler: dikey eksen ' + ys(p.yAd) + '.' : p.xAd ? ' Önce eksenler: yatay eksen ' + ys(p.xAd) + '.' : ' Önce eksenleri çizelim.';
      asamalar.push((pi ? (cokPanel ? 'Şimdi ' + giris.charAt(0).toLocaleLowerCase('tr-TR') + giris.slice(1) : giris) : giris) + eksen);
      // 2) eğriler: çok eğri varsa ikişer ikişer
      var G = p.gruplar, adim = G.length > 4 ? 2 : 1;
      for (var gi = 0; gi < G.length; gi += adim) {
        var parca = G.slice(gi, gi + adim), soz = [];
        a = asamalar.length; s = 0;
        parca.forEach(function (g) {
          var anahtar = [gRenkAdi(g.renk)];
          g.ogeler.forEach(function (o) { isaretle(o, a, s++, 'c'); });
          g.nokta.forEach(function (o) { isaretle(o, a, s++, 'f'); });
          g.yazilar.forEach(function (o) { isaretle(o, a, s++, 'f'); anahtar = anahtar.concat(gAnahtar(o.metin)); });
          g.ogeler.forEach(function (o) { o.el.setAttribute('data-gk', anahtar.join(' ')); });
          soz.push(grafikEgriSoz(p, g, Xdeger, Ydeger, ys));
        });
        asamalar.push(soz.join(' '));
      }
      // 3) ölçü okları (Ea, ΔH gibi): her biri adıyla
      if (p.olcu.length) {
        a = asamalar.length; s = 0;
        var oSoz = [];
        p.olcu.forEach(function (k) {
          isaretle(k, a, s++, 'c');
          (k.uclar || []).forEach(function (o) { isaretle(o, a, s++, 'f'); });
          k.yazilar.forEach(function (o) { isaretle(o, a, s++, 'f'); });
          if (k.yazilar.length) oSoz.push(ys(k.yazilar[0]) + '.');
        });
        asamalar.push(oSoz.length ? oSoz.slice(0, 3).join(' ') : 'Okları da çizelim.');
      }
      // 4) kılavuzlar ve notlar
      var kalan = p.kesik.concat(p.dolgu).concat(p.sahipsiz);
      if (kalan.length) {
        a = asamalar.length; s = 0;
        var kSoz = [], notlar = [];
        p.kesik.forEach(function (k) {
          isaretle(k, a, s++, 'f');
          var yz = p.kesikYazi.filter(function (x) { return x.k === k; });
          yz.forEach(function (x) { isaretle(x.o, a, s++, 'f'); });
          var ad = yz.length ? ys(yz[0].o) : '';
          if (!ad) return;
          if (/^t\b|^t\s?\d|^t\s?denge/i.test(yz[0].o.metin)) kSoz.push('Kesikli çizgi ' + ad + ' anını gösteriyor.');
          else if (gSayi(yz[0].o.metin) == null) kSoz.push('Kesikli çizgi: ' + ad + '.');
        });
        p.dolgu.forEach(function (o) { isaretle(o, a, s++, 'f'); });
        p.sahipsiz.forEach(function (o) { isaretle(o, a, s++, 'f'); if (o.not && o.metin.length < 220) notlar.push(ys(o)); });
        var tekrar = {}; kSoz = kSoz.filter(function (x) { if (tekrar[x]) return false; tekrar[x] = 1; return true; }).slice(0, 3);
        if (!kSoz.length && !notlar.length) kSoz.push(p.kesik.length ? 'Kesikli çizgileri de ekleyelim.' : 'Grafikteki yazıları da ekleyelim.');
        asamalar.push(kSoz.concat(notlar.map(function (x) { return /[.!?]$/.test(x) ? x : x + '.'; })).join(' '));
      }
    });
    // panellerin dışındaki öğeler en son belirir
    if (disari.length) {
      var son = asamalar.length - 1, ss = 1000;
      disari.forEach(function (o) { isaretle(o, son, ss++, o.t === 'text' ? 'f' : (o.stroke && !o.kesik && (o.L || 0) > 12 ? 'c' : 'f')); });
    }
    svg.setAttribute('data-grafik', id);
    svg.setAttribute('data-gasama', String(asamalar.length));
    // x bölme yazıları (t₁ gibi): kalemle gösterilecek yerler
    paneller.forEach(function (p) { p.xBol.forEach(function (o) { var k = gAnahtar(o.metin); if (k.length) o.el.setAttribute('data-gx', k.join(' ')); }); });
    return { id: id, html: svg.outerHTML, asamalar: asamalar };
  }
  // Bir eğrinin anlatımı: renk, ad, gidişat (artıyor / azalıyor / sabit / aniden değişiyor / tepe yapıyor) ve
  // eksendeki bölme yazılarına denk gelen değerler
  function grafikEgriSoz(p, g, Xd, Yd, ys) {
    var renk = gRenkAdi(g.renk), ayni = g.yazilar.filter(function (o) { return o.fill && gRenkFark(o.fill, g.renk) < 46; });
    // ikinci ad yalnız eğrinin öbür ucundaysa (tepkenler … ürünler gibi)
    var uclar = [];
    g.ogeler.forEach(function (o) { if (o.n && o.n.length) uclar.push(o.n[0], o.n[o.n.length - 1]); });
    var ucaYakin = function (o) { var en = 0, ef = 1e9; uclar.forEach(function (q, k) { var f = Math.hypot(q[0] - o.cx, q[1] - o.cy); if (f < ef) { ef = f; en = k; } }); return { k: en, f: ef }; };
    var secilen = ayni.length ? [ayni[0]] : g.yazilar.slice(0, 1);
    if (ayni.length > 1) { var u0 = ucaYakin(ayni[0]); ayni.slice(1).forEach(function (o) { var u = ucaYakin(o); if (secilen.length < 2 && u.f < 46 && u0.f < 46 && u.k !== u0.k) secilen.push(o); }); }
    var adlar = secilen.map(ys).filter(Boolean);
    if (g.kesik) adlar = adlar.length ? adlar : [];
    var bas = (renk ? renk.charAt(0).toLocaleUpperCase('tr-TR') + renk.slice(1) + (g.kesik ? ' kesikli' : '') + ' eğri' : 'Bu eğri') + (adlar.length ? ', ' + adlar.join(' ve ') : '');
    var nk = [];
    g.ogeler.forEach(function (o) {
      var l = o.kose ? o.kose.map(function (q) { return [q[0], q[1], 1]; }) : o.dugum || (o.n || []).map(function (q) { return [q[0], q[1], 0]; });
      l.forEach(function (q) { nk.push([Xd(p, q[0]), Yd(p, q[1]), q[2]]); });
    });
    if (nk.length < 2) return bas + '.';
    // ardışık noktalardan gidişat parçaları
    var parcalar = [], yon = function (dy, dx, duz) { return dx < (duz ? 0.012 : 0.003) && Math.abs(dy) > 0.05 ? (dy > 0 ? 'sicra+' : 'sicra-') : Math.abs(dy) < Math.max(0.01, dx * 0.08) ? 'sabit' : dy > 0 ? 'artis' : 'azalis'; };
    var once = nk[0];
    for (var i = 1; i < nk.length; i++) {
      var q = nk[i], dx = Math.abs(q[0] - once[0]), dy = q[1] - once[1];
      if (dx < 0.004 && Math.abs(dy) < 0.004) continue;
      var y = yon(dy, dx, q[2]), u = parcalar[parcalar.length - 1];
      if (u && u.y === y) u.son = q; else parcalar.push({ y: y, bas: once, son: q });
      once = q;
    }
    // sıçramaya bitişik kısa artış/azalış sıçramaya katılır; çok kısa parçalar atılır
    for (i = 0; i < parcalar.length; i++) {
      var x = parcalar[i];
      if (x.y.indexOf('sicra') !== 0) continue;
      var isaret = x.y === 'sicra+' ? 'artis' : 'azalis';
      [i - 1, i + 1].forEach(function (j) { var k = parcalar[j]; if (k && k.y === isaret && Math.abs(k.son[0] - k.bas[0]) < 0.05) k.y = 'sil'; });
    }
    parcalar = parcalar.filter(function (x) { return x.y !== 'sil' && (x.y.indexOf('sicra') === 0 || Math.abs(x.son[0] - x.bas[0]) > 0.03 || Math.abs(x.son[1] - x.bas[1]) > 0.04); });
    var B = [];
    parcalar.forEach(function (x) { var u = B[B.length - 1]; if (u && u.y === x.y) u.son = x.son; else B.push({ y: x.y, bas: x.bas, son: x.son }); });
    for (i = 1; i < B.length - 1; i++) {
      var o1 = B[i - 1], o2 = B[i + 1];
      if (B[i].y === 'sabit' && Math.abs(B[i].son[0] - B[i].bas[0]) < 0.16 && ((o1.y === 'artis' && o2.y === 'azalis') || (o1.y === 'azalis' && o2.y === 'artis'))) {
        o1.son = B[i].bas; B.splice(i, 1); i--;
      }
    }
    B = B.reduce(function (l, x) { var u = l[l.length - 1]; if (u && u.y === x.y) u.son = x.son; else l.push(x); return l; }, []);
    if (!B.length) return bas + '.';
    var deger = function (Y) { // dikey eksendeki bölme yazısına ya da eğrinin sayı yazısına denk gelen değer
      var en = null, ef = 0.035;
      p.yBol.forEach(function (o) { var f = Math.abs(Yd(p, o.cy) - Y); if (gSayi(o.metin) != null && f < ef) { ef = f; en = o.metin; } });
      (g.degerler || []).forEach(function (o) { var f = Math.abs(Yd(p, o.cy) - Y); if (f < ef + 0.03) { ef = f; en = o.metin; } });
      return en;
    };
    var anAdi = function (X) { // sıçramanın olduğu yerdeki bölme yazısı (t₁ gibi)
      var px = p.ox + X * p.gx, en = null, ef = 12;
      p.xBol.concat(p.kesikYazi.map(function (k) { return k.o; })).forEach(function (o) { var f = Math.abs(o.cx - px); if (f < ef) { ef = f; en = o; } });
      return en ? ys(en) + ' anında' : 'bir anda';
    };
    var c = [], d = function (Y) { var v = deger(Y); return v ? konusmaMetni(v) + ' değerinde' : ''; };
    var ilk = B[0], v0 = deger(ilk.bas[1]);
    if (ilk.y !== 'sabit') { if (v0) c.push({ m: konusmaMetni(v0) + ' değerinden başlıyor', bas: 1 }); else if (ilk.bas[1] < 0.04) c.push({ m: 'sıfırdan başlıyor', bas: 1 }); }
    for (i = 0; i < Math.min(B.length, 5); i++) {
      var t = B[i], sn = B[i + 1], vs = deger(t.son[1]), sabitSonra = sn && sn.y === 'sabit' && Math.abs(sn.bas[1] - t.son[1]) < 0.03;
      if (t.y === 'sabit') { c.push({ m: (!i && B.length > 1 ? 'önce ' : '') + (d(t.bas[1]) ? d(t.bas[1]) + ' ' : '') + 'sabit kalıyor' }); continue; }
      if (t.y === 'sicra+' || t.y === 'sicra-') { c.push({ m: anAdi(t.bas[0]) + ' aniden ' + (vs ? konusmaMetni(vs) + ' değerine ' + (t.y === 'sicra+' ? 'çıkıyor' : 'iniyor') : (t.y === 'sicra+' ? 'artıyor' : 'azalıyor')), an: 1 }); continue; }
      if (t.y === 'artis' && sn && sn.y === 'azalis') { c.push({ m: (vs ? konusmaMetni(vs) + ' değerine çıkıp' : 'yükselip') + ' bir tepe yapıyor' }); continue; }
      if (t.y === 'azalis' && sn && sn.y === 'artis') { c.push({ m: (vs ? konusmaMetni(vs) + ' değerine inip' : 'azalıp') + ' bir çukur yapıyor' }); continue; }
      var fiil = t.y === 'artis' ? (vs ? konusmaMetni(vs) + ' değerine çıkıyor' : 'artıyor') : (vs ? konusmaMetni(vs) + ' değerine iniyor' : 'azalıyor');
      if (sabitSonra) { fiil = fiil.replace(/çıkıyor$/, 'çıkıp sabit kalıyor').replace(/iniyor$/, 'inip sabit kalıyor').replace(/^artıyor$/, 'artıp sabit kalıyor').replace(/^azalıyor$/, 'azalıp sabit kalıyor'); i++; }
      c.push({ m: fiil });
    }
    if (B.length > 5) c.push({ m: 'değişmeye devam ediyor' });
    var metin = c.map(function (x, k) {
      if (!k || x.an || x.bas) return x.m;
      return (c[k - 1].bas ? '' : 'sonra ') + x.m;
    }).join(', ').replace(/(sıfırdan|değerinden) başlıyor, /, '$1 başlayıp ');
    return bas + ': ' + metin + '.';
  }
  // Grafik içeren tahta parçası → ders adımları: ilk adım grafiği tahtaya koyar ve eksenleri çizer, sonrakiler eğrileri
  function grafikAdimlari(html, sinif, onSoz) {
    var d = document.createElement('div'); d.innerHTML = html;
    var svg = d.querySelector('svg'); if (!svg) return null;
    var g = grafikCoz(svg); if (!g || g.asamalar.length < 2) return null;
    var yeni = document.createElement('div'); yeni.innerHTML = g.html;
    if (!yeni.firstElementChild) return null;
    svg.parentNode.replaceChild(yeni.firstElementChild, svg);
    var on = String(onSoz || '').replace(/\s*Şekle bakalım\.?\s*/g, ' ').trim(), sonda = /(^|\s)sekil(\s|$)/.test(sinif || '');
    var ilkHtml = d.innerHTML, sonHtml = '';
    if (sonda) { // şekil altı yazısı grafik çizildikten sonra yazılır ve okunur
      var gEl = d.querySelector('svg[data-grafik]'), tut = gEl.outerHTML; gEl.parentNode.removeChild(gEl);
      if (gorunurUzunluk(d.innerHTML)) { sonHtml = d.innerHTML; ilkHtml = tut; }
    }
    var adim = [{ h: [{ c: ((sinif || '') + ' grafik').trim(), html: ilkHtml }], s: (on && !sonda ? on + ' ' : '') + g.asamalar[0], grafik: { id: g.id, asama: 0 } }];
    for (var k = 1; k < g.asamalar.length; k++) adim.push({ grafik: { id: g.id, asama: k }, s: g.asamalar[k] });
    if (on && sonda) { var son = adim[adim.length - 1]; son.s += ' ' + on; if (sonHtml) son.h = [{ c: sinif || '', html: sonHtml }]; }
    return adim;
  }
  /* ---- tahtada çizim: öğeler aşama aşama görünür, kalem çizginin ucunu izler ---- */
  var G_NS = 'http://www.w3.org/2000/svg';
  function gUzunluk(el) { try { var L = el.getTotalLength(); return L > 0 ? L : 0; } catch (e) { return 0; } }
  function grafikOgeKoy(o, u) {
    u = u <= 0 ? 0 : u >= 1 ? 1 : u;
    if (o.u === u) return;
    o.u = u;
    if (o.t === 'c') { o.el.style.strokeDasharray = o.L + ' ' + (o.L + 2); o.el.style.strokeDashoffset = String(o.L * (1 - u)); }
    else if (o.t === 'r') o.rect.setAttribute('width', String(o.bw * u));
    else o.el.style.opacity = String(Math.min(1, u * 1.5));
  }
  function grafikHazirla(svg) {
    if (!svg) return null;
    if (svg.__gh) return svg.__gh;
    var ogeler = [], defs = null, no = 0, kimlik = svg.getAttribute('data-grafik') || 'g';
    Array.prototype.forEach.call(svg.querySelectorAll('[data-ga]'), function (el) {
      var o = { el: el, a: +el.getAttribute('data-ga') || 0, s: +el.getAttribute('data-gs') || 0, t: el.getAttribute('data-gt') || 'f' };
      if (o.t === 'c') {
        var cs = getComputedStyle(el);
        if (cs.strokeDasharray && cs.strokeDasharray !== 'none' && !/^0(px)?$/.test(cs.strokeDasharray)) o.t = 'r';
        else { o.L = gUzunluk(el); if (!(o.L > 0)) o.t = 'f'; }
      }
      if (o.t === 'r') { // kesikli eğri: soldan sağa açılan bir kırpma ile çizilir
        try {
          var b = el.getBBox();
          if (!defs) { defs = document.createElementNS(G_NS, 'defs'); svg.insertBefore(defs, svg.firstChild); }
          var cp = document.createElementNS(G_NS, 'clipPath'), rc = document.createElementNS(G_NS, 'rect'), cid = kimlik + '-k' + (no++);
          cp.setAttribute('id', cid); rc.setAttribute('x', b.x - 4); rc.setAttribute('y', b.y - 8); rc.setAttribute('height', b.height + 16); rc.setAttribute('width', '0');
          cp.appendChild(rc); defs.appendChild(cp); el.setAttribute('clip-path', 'url(#' + cid + ')');
          o.rect = rc; o.bx = b.x - 4; o.bw = b.width + 8; o.L = gUzunluk(el);
        } catch (e) { o.t = 'f'; }
      }
      ogeler.push(o);
    });
    ogeler.sort(function (x, y) { return x.a - y.a || x.s - y.s; });
    ogeler.forEach(function (o) { grafikOgeKoy(o, 0); });
    svg.__gh = { ogeler: ogeler };
    return svg.__gh;
  }
  // Öğenin u kadar çizildiği andaki ucu (ekran koordinatı)
  function grafikUc(o, u) {
    try {
      var el = o.el, m = el.getScreenCTM(), x, y;
      if (!m) return null;
      if (o.t === 'c') { var q = el.getPointAtLength(o.L * u); x = q.x; y = q.y; }
      else if (o.t === 'r') {
        if (!o.orn) { o.orn = []; for (var i = 0; i <= 48 && o.L; i++) { var q2 = el.getPointAtLength(o.L * i / 48); o.orn.push([q2.x, q2.y]); } }
        var hx = o.bx + o.bw * u, en = null, ef = 1e9;
        o.orn.forEach(function (q3) { var f = Math.abs(q3[0] - hx); if (f < ef) { ef = f; en = q3; } });
        if (!en) return null; x = en[0]; y = en[1];
      } else { var b = el.getBBox(); x = b.x + b.width; y = b.y + b.height; }
      return { x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f };
    } catch (e) { return null; }
  }
  // a. aşama p (0–1) kadar çizilir; kalemin gideceği yer döner (aşama bitince null)
  function grafikIlerlet(svg, a, p) {
    var G = grafikHazirla(svg); if (!G) return null;
    var liste = G.ogeler.filter(function (o) { return o.a === a; }), top = 0, gecen = 0, uc = null;
    liste.forEach(function (o) { o.pay = o.t === 'c' ? Math.max(24, o.L) : o.t === 'r' ? Math.max(40, o.L || o.bw) : 20; top += o.pay; });
    if (!top) return null;
    var hedef = p * top;
    liste.forEach(function (o) {
      var u = (hedef - gecen) / o.pay; gecen += o.pay;
      grafikOgeKoy(o, u);
      if (!uc && u > 0 && u < 1) uc = grafikUc(o, u);
    });
    return uc;
  }
  function grafikBasUc(svg, a) {
    var G = grafikHazirla(svg); if (!G) return null;
    for (var i = 0; i < G.ogeler.length; i++) { var o = G.ogeler[i]; if (o.a === a && o.u < 1) return grafikUc(o, o.t === 'f' ? 1 : 0); }
    return null;
  }
  function grafikTamamla(svg, a) { // a. aşamaya kadar her şey görünür, sonrası gizli
    var G = grafikHazirla(svg); if (!G) return;
    G.ogeler.forEach(function (o) { grafikOgeKoy(o, o.a <= a ? 1 : 0); });
  }
  function adimMetni(a) { var b = (a.h || a.w || [])[0]; if (!b) return ''; return b.html != null ? gorselsizMetin(b.html) : String(b.t || ''); }

  /* ================= Ders PDF'si: tahtaya yazılanlardan ders notu =================
     Kitaplıklar yalnızca PDF istenince yüklenir (sesli/pdf-lib.min.js, sesli/pdf-yazi.js, sesli/sesli-pdf.js). */
  var pdfSoz = null;
  function betikYukle(src) {
    return new Promise(function (ok, red) { var s = document.createElement('script'); s.src = src; s.async = true; s.onload = function () { ok(); }; s.onerror = function () { red(new Error(src)); }; document.head.appendChild(s); });
  }
  function pdfHazirla() {
    if (pdfSoz) return pdfSoz;
    var k = window.SESLI_DERS_KAYIT_KLASORU || (BETIK_DIZIN ? BETIK_DIZIN + 'sesli/' : 'sesli/');
    pdfSoz = (window.PDFLib ? Promise.resolve() : betikYukle(k + 'pdf-lib.min.js'))
      .then(function () { return window.SesliPdfYazi ? null : betikYukle(k + 'pdf-yazi.js'); })
      .then(function () { return window.SesliPdf ? null : betikYukle(k + 'sesli-pdf.js'); })
      .catch(function (e) { pdfSoz = null; throw e; });
    return pdfSoz;
  }
  // Ders adımları → sade bloklar (başlık, ara başlık, etiket, not kutusu, denklem, cevap, madde, şekil, metin)
  function dersNotu(ders, opt) {
    opt = opt || {};
    var A = ders.adimlar || [], bas = 0, son = A.length, baslik = ders.baslik || 'Ders notu', alt = '';
    if (opt.bolum != null && ders.bolumler && ders.bolumler[opt.bolum]) {
      bas = ders.bolumler[opt.bolum].adim; son = ders.bolumler[opt.bolum + 1] ? ders.bolumler[opt.bolum + 1].adim : A.length;
      alt = baslik; baslik = ders.bolumler[opt.bolum].ad;
    }
    var bloklar = [];
    A.slice(bas, son).forEach(function (a) {
      (a.h || a.w || []).forEach(function (b) {
        if (b.gorsel) { bloklar.push({ tur: 'sekil', html: '<img src="' + esc(b.gorsel.url) + '" alt="">' }); return; }
        var c = ' ' + String(b.c || '') + ' ';
        var html = b.html != null ? b.html : sozcukler(b.t || '').map(function (x, k) { return (k && !x.bitisik ? ' ' : '') + (a.oto ? otomatikHTML(x.t) : isaretHTML(x.t)); }).join('');
        if (!gorunurUzunluk(html) && !/<(svg|img|table)[\s>]/i.test(html)) return;
        var tur = / title /.test(c) ? 'baslik' : / alt /.test(c) ? 'alt' : / label /.test(c) ? 'etiket' : / (q|qd) /.test(c) ? 'not' : / eq /.test(c) ? 'denklem' : / ok /.test(c) ? 'cevap'
          : / (li|lid|li2) /.test(c) ? 'madde' : / (sekil|grafik) /.test(c) ? 'sekil' : 'metin';
        bloklar.push({ tur: tur, html: html, pg: a.pg || null, ilk: / q /.test(c), ic: / li2 /.test(c) });
      });
    });
    if (opt.bolum != null && bloklar[0] && bloklar[0].tur === 'baslik') bloklar.shift();
    return { baslik: baslik, altBaslik: alt, bloklar: bloklar };
  }
  function markaBul() {
    if (window.SesliDers && SesliDers.marka) return SesliDers.marka;
    var y = (location.pathname || '') + ' ' + (document.title || '');
    return /kimyamed/i.test(y) ? 'kimyamed' : /ronya/i.test(y) ? 'Ronya Kimya' : '';
  }
  function pdfAdi(t) { // dosya adı her cihazda bozulmasın: Türkçe harfler sadeleşir
    var tr = { 'ç': 'c', 'Ç': 'C', 'ğ': 'g', 'Ğ': 'G', 'ı': 'i', 'İ': 'I', 'ö': 'o', 'Ö': 'O', 'ş': 's', 'Ş': 'S', 'ü': 'u', 'Ü': 'U', 'â': 'a', 'î': 'i', 'û': 'u' };
    t = String(t || 'Ders notu').replace(/[çÇğĞıİöÖşŞüÜâîû]/g, function (c) { return tr[c]; }).replace(/[^\x20-\x7E]/g, '');
    return String(t || 'Ders notu').replace(/[\\/:*?"<>|#%]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) + ' - Ders notu.pdf'; }
  function dersPdf(ders, opt) {
    var notu = dersNotu(ders, opt);
    return pdfHazirla().then(function () { return window.SesliPdf.olustur(notu, { marka: markaBul(), ust: 'Ders notu', baslik: notu.baslik }); })
      .then(function (bayt) { var blob = new Blob([bayt], { type: 'application/pdf' }); indir(blob, pdfAdi(notu.baslik)); return blob; });
  }

  /* ---- soru ve çözüm grupları ----
     Bir sorunun kendisi bir tahtaya, çözümünün tamamı bir tahtaya yazılır: grup başlarken bütün grup ölçülür,
     sığmıyorsa tahta silinir (çözümde soru yeniden yazılır) ve yazı gerektiği kadar küçülür; grup yarıda silinmez. */
  var grupSayac = 0;
  function grupla(adimlar, sBas, cBas, son) {
    var id = 'gr' + (++grupSayac);
    for (var k = sBas; k < son; k++) { adimlar[k].grup = id; adimlar[k].grupTur = k < cBas ? 's' : 'c'; delete adimlar[k].grupBas; }
    if (cBas > sBas) adimlar[sBas].grupBas = true;
    if (son > cBas) adimlar[cBas].grupBas = true;
  }

  /* ================= konu anlatımından ders ================= */
  // Sayfadaki konu anlatımı (başlık, paragraf, liste, not kutusu, tablo, şekil, çözümlü örnek) tahta adımlarına çevrilir.
  var ATLA_ETIKET = /^(SCRIPT|STYLE|BUTTON|NAV|DETAILS|SUMMARY|INPUT|SELECT|TEXTAREA|FORM|AUDIO|VIDEO|IFRAME|OBJECT|NOSCRIPT|TEMPLATE|LINK|META|HR)$/;
  var ATLA_SINIF = /(^|\s)(soru|test|icindekiler|sayac|sd-anlat|sd-arac|ks|ks-kart|ks-liste|ks-alt|ks-baslik|ks-not|sekmeler|sonraki|crumb|kaz|hero|sat|cozum-btn|ltabs)(\s|$)/;
  var NOT_SINIF = /(^|\s)(kart|card|not|ozet-kutu|ipucu|dikkat|uyari|bilgi|kutu|kural|tuzak|ek-not|gunluk)(\s|$)/;
  var BLOK_ETIKET = /^(P|DIV|UL|OL|LI|TABLE|FIGURE|SECTION|ARTICLE|BLOCKQUOTE|H[1-6]|HEADER|FOOTER|ASIDE|DL|DT|DD|PRE|HR|DETAILS|MAIN|SVG|IMG|CANVAS)$/;
  function gorunmez(n) { return !!(n.hidden || (n.style && n.style.display === 'none') || (n.getAttribute && n.getAttribute('aria-hidden') === 'true')); }
  function sinifi(n) { return typeof n.className === 'string' ? n.className : ''; }
  function yaziMetni(n) { return (n && n.textContent || '').replace(/\s+/g, ' ').trim(); }
  function blokVarMi(n) { for (var c = n.firstElementChild; c; c = c.nextElementSibling) if (BLOK_ETIKET.test(c.tagName.toUpperCase())) return true; return false; }
  function gorunurUzunluk(html) { return String(html).replace(/<[^>]*>/g, '').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim().length; }
  function dugmesizKopya(n) { var k = n.cloneNode(true); Array.prototype.forEach.call(k.querySelectorAll('.sd-anlat,.sd-arac,.rozet,.onbilgi,.kazanim'), function (x) { x.remove(); }); return k; }
  function basliksizMetin(n) { return yaziMetni(dugmesizKopya(n)); }
  // HTML'i cümlelere böl; açık kalan satır içi etiketler her parçada kapatılıp yeniden açılır
  function cumleBol(html) {
    var parcalar = String(html).split(/(<[^>]+>)/), sonuc = [], cur = '', acik = [], TEK = /^(br|img|hr|wbr|input|col|source)$/i;
    parcalar.forEach(function (p) {
      if (!p) return;
      if (p.charAt(0) === '<') {
        var m = p.match(/^<\s*(\/)?\s*([a-zA-Z][a-zA-Z0-9-]*)/);
        if (m) {
          var ad = m[2].toLowerCase();
          if (m[1]) { for (var q = acik.length - 1; q >= 0; q--) if (acik[q].ad === ad) { acik.splice(q, 1); break; } }
          else if (!TEK.test(ad) && !/\/\s*>$/.test(p)) acik.push({ ad: ad, etiket: p });
        }
        cur += p; return;
      }
      var re = /([.!?…]+["”’»)]*)(\s+)(?=[A-ZÇĞİÖŞÜ0-9"“«(])/g, son = 0, m2;
      while ((m2 = re.exec(p))) {
        cur += p.slice(son, m2.index + m2[1].length);
        sonuc.push(cur + acik.slice().reverse().map(function (t) { return '</' + t.ad + '>'; }).join(''));
        cur = acik.map(function (t) { return t.etiket; }).join('');
        son = m2.index + m2[1].length + m2[2].length;
      }
      cur += p.slice(son);
    });
    if (gorunurUzunluk(cur)) sonuc.push(cur);
    return sonuc;
  }
  // Paragrafı tahta adımlarına böl: kısa cümleler bir araya gelir, uzunlar ayrı yazılır
  function paragrafParcalari(html) {
    var out = [], cur = '';
    cumleBol(html).forEach(function (c) {
      if (!cur) { cur = c; return; }
      var a = gorunurUzunluk(cur), b = gorunurUzunluk(c);
      if ((a < 90 && a + b < 230) || b < 18) cur += ' ' + c; else { out.push(cur); cur = c; }
    });
    if (cur && gorunurUzunluk(cur)) out.push(cur);
    return out;
  }
  function tabloOkunus(t) {
    var satirlar = Array.prototype.slice.call(t.querySelectorAll('tr')), metin = [];
    if (satirlar.length && satirlar[0].querySelector('th') && !satirlar[0].querySelector('td')) satirlar.shift();
    satirlar.forEach(function (tr) {
      var h = Array.prototype.map.call(tr.children, function (c) { return yaziMetni(c); }).filter(Boolean);
      if (h.length) metin.push(h[0] + (h.length > 1 ? ': ' + h.slice(1).join(', ') : '') + '.');
    });
    var s = metin.join(' ');
    if (s.length > 900) s = s.slice(0, s.lastIndexOf('.', 900) + 1) + ' Tablonun devamını tahtadan inceleyelim.';
    return s;
  }
  var pgSayac = 0;
  function IcerikYapici() { this.adimlar = []; this.not = false; this.notIlk = false; }
  IcerikYapici.prototype.ekle = function (html, sinif, s) {
    html = String(html || '').replace(/<span class="(?:rozet|onbilgi|kazanim)[^"]*">[\s\S]*?<\/span>/g, '').trim();
    var gorselVar = /<(svg|img|table)[\s>]/i.test(html);
    if (!gorunurUzunluk(html) && !gorselVar) return;
    var konusma = s != null ? s : htmlKonusma(html);
    if (!konusma) konusma = gorselVar ? (/<table/i.test(html) ? 'Tabloya bakalım.' : 'Şekle bakalım.') : '';
    if (!konusma) return;
    var c = sinif || '';
    if (this.not) {
      var k = this.notIlk ? 'q' : 'qd'; this.notIlk = false;
      if (c === 'alt' || c === 'label') html = '<b>' + html + '</b>';
      c = /^(li|li2|lid)$/.test(c) ? k + ' ' + c : k;
    }
    var gg = /<svg[\s>]/i.test(html) ? grafikAdimlari(html, c, gorunurUzunluk(html) ? htmlKonusma(html) : '') : null;
    if (gg) { this.adimlar.push.apply(this.adimlar, gg); return; }
    this.adimlar.push({ h: [{ c: c, html: html }], s: konusma });
  };
  IcerikYapici.prototype.paragraf = function (html, sinif) {
    var self = this;
    String(html).split(/<br\s*\/?>/i).forEach(function (satir) {
      var pg = ++pgSayac, once = self.adimlar.length;
      if (gorunurUzunluk(satir)) paragrafParcalari(satir.trim()).forEach(function (p, i) { self.ekle(p, i && /^li/.test(sinif || '') ? 'lid' : (sinif || '')); });
      for (var k = once; k < self.adimlar.length; k++) if (!self.adimlar[k].grafik) self.adimlar[k].pg = pg;
    });
  };
  IcerikYapici.prototype.cocuklar = function (n) { var self = this; Array.prototype.slice.call(n.childNodes).forEach(function (c) { self.dugum(c); }); };
  IcerikYapici.prototype.dugum = function (n) {
    if (n.nodeType === 3) { var t = n.nodeValue.replace(/\s+/g, ' ').trim(); if (t) this.paragraf(esc(t)); return; }
    if (n.nodeType !== 1) return;
    var ust = n.tagName.toUpperCase(), cls = sinifi(n), oc = n.getAttribute('onclick') || '';
    if (ATLA_ETIKET.test(ust) || gorunmez(n) || ATLA_SINIF.test(cls) || /molToggle\(/.test(oc)) return;
    if (/^H[1-6]$/.test(ust) || /(^|\s)(slbl|baslik|alt-baslik)(\s|$)/.test(cls)) { var bh = dugmesizKopya(n).innerHTML; if (gorunurUzunluk(bh)) this.ekle(bh, 'alt'); return; }
    if (ust === 'TABLE') { this.ekle(n.outerHTML, '', 'Tabloya bakalım. ' + konusmaMetni(tabloOkunus(n))); return; }
    if (ust === 'SVG' || ust === 'IMG' || ust === 'CANVAS') { this.gorsel(n); return; }
    if (ust === 'FIGURE') { this.sekil(n); return; }
    if (ust === 'UL' || ust === 'OL') { this.liste(n, 'li'); return; }
    if (/(^|\s)ornek(\s|$)/.test(cls) && n.querySelector('.cozum')) { this.ornek(n); return; }
    if (/(^|\s)(blokform|denklem)(\s|$)/.test(cls)) { this.ekle(n.innerHTML, 'eq'); return; }
    if ((NOT_SINIF.test(cls) || ust === 'BLOCKQUOTE') && !this.not) { this.notKutusu(n); return; }
    if (/(^|\s)(tablo-kap|tablo-sar)(\s|$)/.test(cls)) { var tb = n.querySelector('table'); if (tb) { this.dugum(tb); return; } }
    if (blokVarMi(n)) { this.cocuklar(n); return; }
    this.paragraf(n.innerHTML);
  };
  IcerikYapici.prototype.gorsel = function (n) {
    var html;
    if (n.tagName.toUpperCase() === 'CANVAS') { try { if (!n.width || !n.height) return; html = '<img src="' + n.toDataURL('image/png') + '" alt="">'; } catch (e) { return; } }
    else html = n.outerHTML;
    this.ekle(html, 'sekil', 'Şekle bakalım.');
  };
  IcerikYapici.prototype.sekil = function (f) {
    var cap = f.querySelector('figcaption'), capT = cap ? yaziMetni(cap) : '', html = '';
    Array.prototype.forEach.call(f.childNodes, function (c) {
      if (c === cap || c.nodeType !== 1) return;
      if (c.tagName.toUpperCase() === 'CANVAS') { try { html += '<img src="' + c.toDataURL('image/png') + '" alt="">'; } catch (e) {} }
      else html += c.outerHTML;
    });
    if (capT) html += '<div class="altyazi-sekil">' + esc(capT) + '</div>';
    this.ekle(html, 'sekil', 'Şekle bakalım.' + (capT ? ' ' + konusmaMetni(capT) : ''));
  };
  IcerikYapici.prototype.liste = function (n, sinif) {
    var self = this, sira = 0, numarali = n.tagName.toUpperCase() === 'OL';
    Array.prototype.forEach.call(n.children, function (li) {
      if (li.tagName.toUpperCase() !== 'LI' || gorunmez(li) || ATLA_SINIF.test(sinifi(li))) return;
      sira++;
      var satir = '', bloklar = [];
      Array.prototype.forEach.call(li.childNodes, function (c) {
        if (c.nodeType === 1 && BLOK_ETIKET.test(c.tagName.toUpperCase())) bloklar.push(c);
        else if (c.nodeType === 3) satir += esc(c.nodeValue);
        else if (c.nodeType === 1 && !ATLA_ETIKET.test(c.tagName.toUpperCase())) satir += c.outerHTML;
      });
      if (gorunurUzunluk(satir)) self.paragraf((numarali ? sira + '. ' : '') + satir.trim(), numarali ? 'lid' : sinif);
      bloklar.forEach(function (b) { if (/^(UL|OL)$/.test(b.tagName.toUpperCase())) self.liste(b, 'li2'); else self.dugum(b); });
    });
  };
  IcerikYapici.prototype.notKutusu = function (n) {
    this.not = true; this.notIlk = true;
    var ilk = n.firstChild; while (ilk && ilk.nodeType === 3 && !ilk.nodeValue.trim()) ilk = ilk.nextSibling;
    if (ilk && ilk.nodeType === 1 && /^(B|STRONG)$/.test(ilk.tagName.toUpperCase()) && !blokVarMi(n)) {
      this.ekle('<b>' + ilk.innerHTML + '</b>', '');
      var kalan = ''; for (var c = ilk.nextSibling; c; c = c.nextSibling) kalan += c.nodeType === 3 ? esc(c.nodeValue) : (c.nodeType === 1 ? c.outerHTML : '');
      this.paragraf(kalan);
    } else this.cocuklar(n);
    this.not = false; this.notIlk = false;
  };
  IcerikYapici.prototype.ornek = function (n) {
    var self = this, et = n.querySelector('.etiket'), metin = n.querySelector('.metin'), coz = n.querySelector('.cozum'), ilk = true, sb = this.adimlar.length, cb;
    this.ekle(esc(et ? yaziMetni(et) : 'Örnek'), 'label');
    if (metin) satirlaraBol(metin).forEach(function (h) { self.ekle(h, ilk ? 'q' : 'qd'); ilk = false; });
    cb = this.adimlar.length;
    if (coz) { this.ekle('Çözüm', 'label', 'Çözüme bakalım.'); satirlaraBol(coz).forEach(function (h) { self.paragraf(h); }); }
    if (this.adimlar.length > sb) grupla(this.adimlar, sb, cb, this.adimlar.length);
  };
  // bolumler: [{ ad, dugumler: [düğüm...] }] → bölümlü ders
  function icerikDers(o) {
    var adimlar = [], bolumler = [];
    (o.bolumler || []).forEach(function (b) {
      var y = new IcerikYapici();
      b.dugumler.forEach(function (n) { y.dugum(n); });
      if (y.adimlar.length < (o.enAz || 1)) return;
      bolumler.push({ ad: b.ad, adim: adimlar.length, el: b.el || null });
      var bs = konusmaMetni(b.ad); if (!/[.!?:]$/.test(bs)) bs += '.';
      adimlar.push({ sil: 1, sahne: null, h: [{ c: 'title', html: esc(b.ad) }], s: bs });
      adimlar.push.apply(adimlar, y.adimlar);
    });
    if (!adimlar.length) return null;
    return { id: o.id || ('ic-' + ozet(o.baslik + adimlar.length)), baslik: o.baslik, adimlar: adimlar, bolumler: bolumler, dugme: 'Anlatımı başlat' };
  }
  // Kapsayıcının çocuklarını başlıklara (H3 ya da H2) ve başlıklı kartlara göre bölümlere ayır
  function bolumlereAyir(kok, baslik, opt) {
    opt = opt || {};
    var etiket = opt.etiket || 'H3', bolumler = [], cur = { ad: baslik, dugumler: [], el: null };
    var kapat = function () { if (cur.dugumler.length) bolumler.push(cur); };
    Array.prototype.forEach.call(kok.childNodes, function (c) {
      if (c.nodeType === 3) { if (c.nodeValue.trim()) cur.dugumler.push(c); return; }
      if (c.nodeType !== 1 || gorunmez(c) || /(^|\s)(sd-anlat|sd-arac)(\s|$)/.test(sinifi(c))) return;
      var ust = c.tagName.toUpperCase();
      if (ust === etiket) { kapat(); cur = { ad: opt.ad ? opt.ad(c) : basliksizMetin(c), dugumler: [], el: c }; return; }
      if (opt.kart && /(^|\s)card(\s|$)/.test(sinifi(c))) {
        if (c.querySelector('[onclick^="molToggle("]')) return;
        var lbl = null; for (var x = c.firstElementChild; x; x = x.nextElementSibling) if (/(^|\s)slbl(\s|$)/.test(sinifi(x))) { lbl = x; break; }
        if (lbl) {
          kapat();
          cur = { ad: basliksizMetin(lbl), dugumler: Array.prototype.filter.call(c.childNodes, function (y) { return y !== lbl; }), el: c };
          kapat(); cur = { ad: baslik, dugumler: [], el: null };
          return;
        }
      }
      cur.dugumler.push(c);
    });
    kapat();
    return bolumler;
  }
  // banka verisindeki konu nesnesi { ad, anlatim, ornek } → ders (örnekler bölümlerine yerleşir)
  function konuVerisindenDers(k, onEk) {
    var html = k.anlatim || '', ornek = k.ornek || [], parca = html.split(/(?=<h3[\s>])/), no = 0;
    var kutu = function (x) { no++; return '<div class="ornek"><div class="etiket">Çözümlü örnek ' + no + '</div><div class="metin">' + x.s + '</div><div class="cozum">' + x.c + '</div></div>'; };
    var bolumlu = ornek.some(function (x) { return typeof x.b === 'number'; }), ilkVar = !/^\s*<h3/.test(parca[0]);
    if (bolumlu) {
      html = parca.map(function (p, i) { var bi = ilkVar ? i - 1 : i; return p + ornek.filter(function (x) { return x.b === bi; }).map(kutu).join(''); }).join('');
      html += ornek.filter(function (x) { return typeof x.b !== 'number'; }).map(kutu).join('');
    } else if (ornek.length) html += '<h3>Çözümlü örnekler</h3>' + ornek.map(kutu).join('');
    var d = document.createElement('article'); d.innerHTML = html;
    return icerikDers({ id: 'rb-' + (k.id || ozet(k.ad)), baslik: (onEk || '') + k.ad, bolumler: bolumlereAyir(d, k.ad) });
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
    cins: depo.al('cins', 'k'), sesAdi: depo.al('ses', ''), kaynak: depo.al('kaynak', null), bulutSes: depo.al('bulutSes', ''),
    ikili: !!depo.al('ikili', false), bulutSesK: depo.al('bulutSesK', ''), bulutSesE: depo.al('bulutSesE', ''), sesAdiK: depo.al('sesAdiK', ''), sesAdiE: depo.al('sesAdiE', ''),
    tarz: Math.min(3, depo.al('tarz', 0)), hiz: depo.al('hiz', 1), ogretmen: depo.al('ogretmen', true), duzen: depo.al('duzen', 'normal'), buyukluk: depo.al('buyukluk', 1),
    gorunum: depo.al('gorunum', 'figur')
  };
  if (!/^(figur|foto|video)$/.test(ayar.gorunum)) ayar.gorunum = 'figur';
  if (!TAHTALAR[ayar.tahta]) ayar.tahta = 'beyaz';
  function kalemTuru() { return KALEMLER[ayar.kalem] ? ayar.kalem : TAHTALAR[ayar.tahta].kalem; }

  /* ================= ses motoru ================= */
  // Doğal sesin MP3'ü çözülür, başına sessizlik eklenip WAV olarak çalınır (bkz. Ses.dolgulu)
  var dolguBaglam = null;
  function dolguCoz(buf) {
    return new Promise(function (ok, red) {
      try {
        if (!dolguBaglam) {
          var O = window.OfflineAudioContext || window.webkitOfflineAudioContext;
          if (!O) { red(new Error('çözücü yok')); return; }
          try { dolguBaglam = new O(1, 1, 24000); } catch (e) { dolguBaglam = new O(1, 1, 44100); }
        }
        var p = dolguBaglam.decodeAudioData(buf, ok, red);
        if (p && p.then) p.then(ok, red);
      } catch (e) { red(e); }
    });
  }
  function dolguWav(v, sr, onSn) { // tek kanal Float32 → 16 bit WAV; başına onSn saniye sessizlik
    var on = Math.round((onSn || 0) * sr), n = on + v.length, b = new ArrayBuffer(44 + n * 2), d = new DataView(b), i;
    var yaz = function (o, s) { for (var k = 0; k < s.length; k++) d.setUint8(o + k, s.charCodeAt(k)); };
    yaz(0, 'RIFF'); d.setUint32(4, 36 + n * 2, true); yaz(8, 'WAVE'); yaz(12, 'fmt '); d.setUint32(16, 16, true); d.setUint16(20, 1, true); d.setUint16(22, 1, true);
    d.setUint32(24, sr, true); d.setUint32(28, sr * 2, true); d.setUint16(32, 2, true); d.setUint16(34, 16, true); yaz(36, 'data'); d.setUint32(40, n * 2, true);
    for (i = 0; i < v.length; i++) { var x = v[i] > 1 ? 1 : v[i] < -1 ? -1 : v[i]; d.setInt16(44 + (on + i) * 2, x < 0 ? x * 0x8000 : x * 0x7FFF, true); }
    return new Blob([b], { type: 'audio/wav' });
  }
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
    sec: function (cins, ad) {
      cins = cins || ayar.cins; if (ad === undefined) ad = Izin.ogretmen() ? ayar.sesAdi : '';
      if (this.var && !this.tr.length) this.yukle();
      var self = this, list = this.tr;
      if (!this.var) return { ses: null, ton: 1, not: 'Bu tarayıcı sesli okumayı desteklemiyor. Ders altyazıyla oynatılıyor.' };
      if (!list.length) return { ses: null, ton: 1, not: 'Bu cihazda Türkçe ses bulunamadı. Ders altyazıyla oynatılıyor; cihazın ses ayarlarından Türkçe ses eklenebilir.' };
      if (ad) { var el = list.filter(function (v) { return v.voiceURI === ad; })[0]; if (el) return { ses: el, ton: 1, not: '' }; }
      var sirala = function (a) { return a.slice().sort(function (x, y) { return (self.dogal(y) - self.dogal(x)) || (y.localService - x.localService); })[0]; };
      var uygun = list.filter(function (v) { return self.cinsi(v) === cins; });
      if (uygun.length) return { ses: sirala(uygun), ton: 1, not: '' };
      var bilinmeyen = list.filter(function (v) { return self.cinsi(v) === '?'; });
      if (bilinmeyen.length) return { ses: sirala(bilinmeyen), ton: cins === 'e' ? 0.82 : 1.06, not: 'Seslerin adından kadın mı erkek mi olduğu anlaşılamadı; listeden başka bir ses deneyebilirsin.' };
      return { ses: sirala(list), ton: cins === 'e' ? 0.72 : 1.18,
        not: cins === 'e' ? 'Bu cihazda erkek Türkçe ses yok; kadın sesi daha kalın tonda kullanılıyor. Gerçek erkek sesi doğal seslerle (ses servisi) gelir.' : 'Bu cihazda kadın Türkçe ses yok; erkek sesi daha ince tonda kullanılıyor.' };
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
    konus: function (metin, olay, kayit, sesSecimi) {
      var self = this, t = TARZLAR[ayar.tarz], hiz = Math.max(0.5, Math.min(2, t.hiz * ayar.hiz));
      this.oranFn = null;
      if (kayit && kayit.url) {
        return new Promise(function (bitir) {
          // Doğal seste cümlenin başına kısa sessizlik eklenir (bkz. Ses.dolgulu); ilerleme konuşmanın başladığı andan sayılır
          var a = null, bitti = false, zaman, oran, oh = kayit.bulut ? hiz : Math.max(0.5, Math.min(2, ayar.hiz)), pd = 0;
          var son = function (n) {
            if (bitti) return; bitti = true; clearTimeout(zaman);
            if (self.oranFn === oran) self.oranFn = null;
            if (a) a.onended = a.onerror = a.onloadedmetadata = null;
            self.sonDolgu = pd / oh;
            if (n === 'bitti' && self.surekli) self.isit();
            bitir(n);
          };
          var surele = function (sn) { clearTimeout(zaman); zaman = setTimeout(function () { son('zaman'); }, sn * 1000); };
          oran = function () {
            if (!a) return 0;
            var d = isFinite(a.duration) && a.duration > 0 ? a.duration : (kayit.sure || 3) + pd;
            return Math.max(0, Math.min(1, (a.currentTime - pd) / Math.max(0.1, d - pd)));
          };
          self.oranFn = oran;
          self.kayitBitir = function () { son('iptal'); };
          surele(45);
          (kayit.bulut ? self.dolgulu(kayit.url) : Promise.resolve(null)).then(function (dg) {
            if (bitti) return;
            a = self.ortak(); self.ses = a; pd = dg ? dg.pad : 0;
            a.onloadedmetadata = function () { var d = isFinite(a.duration) ? a.duration : (kayit.sure || 3) + pd; olay.basla && olay.basla((d - pd) / oh * 1000, false); surele(d / oh + 10); };
            a.onended = function () { son('bitti'); };
            a.onerror = function () { son('hata'); };
            a.loop = false;
            a.src = dg ? dg.url : kayit.url;
            try { a.defaultPlaybackRate = oh; a.playbackRate = oh; } catch (e) {}
            var p = a.play(); if (p && p.catch) p.catch(function () { son('hata'); });
            surele(kayit.sure ? kayit.sure / oh + 10 : 45);
          });
        });
      }
      var s = this.sec(sesSecimi && sesSecimi.cins, sesSecimi ? sesSecimi.ad : undefined);
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
      this.isitDur();
      if (this.sahte) { this.sahte.iptal(); this.sahte = null; }
      if (this.ses) { try { this.ses.pause(); } catch (e) {} this.ses = null; }
      if (this.kayitBitir) { var f = this.kayitBitir; this.kayitBitir = null; f(); }
      this.oranFn = null;
      if (this.var) { try { speechSynthesis.cancel(); } catch (e) {} }
    },
    // iPhone'da ses dosyası yalnızca dokunuşla açılmış bir oynatıcıdan çalar: tek oynatıcı, ilk dokunuşta açılır
    ortak: function () {
      if (!this.oynatici) { this.oynatici = new Audio(); this.oynatici.preload = 'auto'; try { this.oynatici.setAttribute('playsinline', ''); } catch (e) {} }
      if (this.isitiyor) { this.isitiyor = false; this.oynatici.loop = false; } // sessiz döngü biter, yeni ses hemen başlar
      return this.oynatici;
    },
    /* Cümle başı kesilmesin. Telefon, Bluetooth hoparlör ya da akıllı tahtanın sesi bir cümle bitince uykuya geçer;
       sonraki cümle başlarken ses yolu yeniden açılana kadar ilk kelimeler duyulmaz. İki önlem:
       1) doğal sesin her cümlesinin başına kısa bir sessizlik eklenir (kesilen kısım sessizlik olur),
       2) ders oynarken cümle aralarında duyulmayacak kadar kısık bir ses döngüsü çalar, ses yolu kapanmaz. */
    DOLGU: 0.4, dolguBellek: {}, dolguSira: [], surekli: false, sonDolgu: 0,
    dolgulu: function (url) {
      var self = this;
      if (!url) return Promise.resolve(null);
      if (this.dolguBellek[url]) return this.dolguBellek[url];
      var p = fetch(url).then(function (r) { return r.arrayBuffer(); }).then(dolguCoz).then(function (ab) {
        return { url: URL.createObjectURL(dolguWav(ab.getChannelData(0), ab.sampleRate, self.DOLGU)), pad: self.DOLGU };
      }).catch(function () { return null; });
      this.dolguBellek[url] = p; this.dolguSira.push(url);
      while (this.dolguSira.length > 6) {
        var eski = this.dolguSira.shift(), ep = this.dolguBellek[eski]; delete this.dolguBellek[eski];
        if (ep) ep.then(function (k) { if (k) setTimeout(function () { URL.revokeObjectURL(k.url); }, 60000); });
      }
      return p;
    },
    isit: function () {
      if (!this.sesAcik || this.isitiyor) return;
      var a = this.ortak();
      if (!this.sessizUrl) { var n = 11025, v = new Float32Array(n); for (var i = 0; i < n; i++) v[i] = (Math.random() - 0.5) * 0.00006; this.sessizUrl = URL.createObjectURL(dolguWav(v, 22050, 0)); }
      try {
        a.onended = a.onerror = a.onloadedmetadata = null; a.loop = true; a.src = this.sessizUrl;
        try { a.defaultPlaybackRate = 1; a.playbackRate = 1; } catch (e) {}
        var p = a.play(); if (p && p.catch) p.catch(function () {});
        this.isitiyor = true;
      } catch (e) {}
    },
    isitDur: function () {
      if (!this.isitiyor) return;
      this.isitiyor = false;
      var a = this.oynatici; if (a) { a.loop = false; try { a.pause(); } catch (e) {} }
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
    basla: function (hazirAkis) { // hazirAkis: kamera açıkken aynı akışın mikrofonu kullanılır, akış burada kapatılmaz
      var ac = hazirAkis && hazirAkis.getAudioTracks().length ? Promise.resolve(new MediaStream(hazirAkis.getAudioTracks()))
        : navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      return ac.then(function (akis) {
        var tip = ['audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'].filter(function (t) { try { return MediaRecorder.isTypeSupported(t); } catch (e) { return false; } })[0];
        var secenek = { audioBitsPerSecond: 64000 }; if (tip) secenek.mimeType = tip;
        var mr; try { mr = new MediaRecorder(akis, secenek); } catch (e) { mr = tip ? new MediaRecorder(akis, { mimeType: tip }) : new MediaRecorder(akis); }
        var parcalar = [], t0 = performance.now();
        mr.ondataavailable = function (e) { if (e.data && e.data.size) parcalar.push(e.data); };
        mr.onstart = function () { t0 = performance.now(); };
        mr.start(250);
        return {
          t0: function () { return t0; }, akis: akis,
          durdur: function () {
            return new Promise(function (res) {
              mr.onstop = function () {
                if (!hazirAkis) akis.getTracks().forEach(function (t) { t.stop(); });
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

  /* ================= öğretmenin yüzü: fotoğraf ve kamera kareleri (yalnızca bu cihazda) ================= */
  var YUZ_FPS = 12, YUZ_BOY = 192;
  function blobTampon(b) {
    return b.arrayBuffer ? b.arrayBuffer() : new Promise(function (res, rej) { var fr = new FileReader(); fr.onload = function () { res(fr.result); }; fr.onerror = function () { rej(fr.error); }; fr.readAsArrayBuffer(b); });
  }
  function resimYap(blob) {
    return new Promise(function (res) {
      var u = URL.createObjectURL(blob), im = new Image();
      im.onload = function () { res(im); setTimeout(function () { URL.revokeObjectURL(u); }, 0); };
      im.onerror = function () { URL.revokeObjectURL(u); res(null); };
      im.src = u;
    });
  }
  function bitmapYap(blob) { return window.createImageBitmap ? createImageBitmap(blob).catch(function () { return resimYap(blob); }) : resimYap(blob); }
  var YuzKayit = { // ön kameradan saniyede 12 kare: kare biçiminde küçük JPEG'ler, sesle aynı saatte
    var: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder && window.HTMLCanvasElement && HTMLCanvasElement.prototype.toBlob),
    basla: function (video, t0Al) {
      var tv = document.createElement('canvas'); tv.width = tv.height = YUZ_BOY;
      var c = tv.getContext('2d'), kareler = [], bekleyen = [], dur = false, son = -1e9, aralik = 1000 / YUZ_FPS;
      var al = function () {
        if (dur) return;
        var simdi = performance.now();
        if (simdi - son >= aralik - 4 && video.readyState >= 2 && video.videoWidth) {
          son = simdi;
          var w = video.videoWidth, h = video.videoHeight, k = Math.min(w, h), sx = (w - k) / 2, sy = (h - k) * 0.3, t = (simdi - t0Al()) / 1000;
          try {
            c.drawImage(video, sx, sy, k, k, 0, 0, YUZ_BOY, YUZ_BOY);
            bekleyen.push(new Promise(function (res) { tv.toBlob(function (b) { if (b) kareler.push({ t: t, b: b }); res(); }, 'image/jpeg', 0.72); }));
          } catch (e) {}
        }
        if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(al); else setTimeout(al, aralik / 2);
      };
      al();
      return {
        bitir: function () {
          dur = true;
          return Promise.all(bekleyen).then(function () {
            if (kareler.length < 3) return null;
            kareler.sort(function (a, b) { return a.t - b.t; });
            var parca = [], dizin = [], ofs = 0;
            kareler.forEach(function (x) { dizin.push([Math.round(x.t * 1000) / 1000, ofs, x.b.size]); parca.push(x.b); ofs += x.b.size; });
            return blobTampon(new Blob(parca, { type: 'image/jpeg' })).then(function (buf) { return { fps: YUZ_FPS, boy: YUZ_BOY, dizin: dizin, veri: buf }; });
          });
        }
      };
    }
  };
  function yuzCoz(y) { // kayıttaki kareleri çizilebilir resimlere çevirir
    if (!y || !y.veri || !y.dizin || !y.dizin.length) return Promise.resolve(null);
    var blob = new Blob([y.veri], { type: 'image/jpeg' });
    return Promise.all(y.dizin.map(function (d) { return bitmapYap(blob.slice(d[1], d[1] + d[2], 'image/jpeg')); }))
      .then(function (l) { return { t: y.dizin.map(function (d) { return d[0]; }), r: l }; });
  }
  function yuzBirak(c) { if (c && c.r) c.r.forEach(function (b) { if (b && b.close) { try { b.close(); } catch (e) {} } }); }
  function yuzKare(c, t) { // t saniyedeki ya da hemen önceki kare
    if (!c || !c.r || !c.r.length) return null;
    if (t <= c.t[0]) return c.r[0];
    var lo = 0, hi = c.t.length - 1;
    while (lo < hi) { var m = (lo + hi + 1) >> 1; if (c.t[m] <= t) lo = m; else hi = m - 1; }
    return c.r[lo] || null;
  }
  function yuzOynatimAl(metin) { // derste ve stüdyoda: önce gerçek video, yoksa eski kareler
    var h = ozet(metin);
    return Kayitlar.al('v:' + h).then(function (v) {
      if (v && v.veri) return { tur: 'video', url: URL.createObjectURL(new Blob([v.veri], { type: v.mime || 'video/mp4' })), fark: v.fark || 0 };
      return Kayitlar.al('y:' + h).then(yuzCoz).then(function (c) { if (c) c.tur = 'kare'; return c; });
    }).catch(function () { return null; });
  }
  function yuzSal(y) { if (!y) return; if (y.tur === 'video') { if (y.url) URL.revokeObjectURL(y.url); } else yuzBirak(y); }
  function fotoKirp(dosya) { // kare kırpılmış 360 px JPEG
    return resimYap(dosya).then(function (im) {
      if (!im) throw new Error('foto');
      var w = im.naturalWidth, h = im.naturalHeight, k = Math.min(w, h), sx = (w - k) / 2, sy = (h - k) * 0.25, tv = document.createElement('canvas');
      tv.width = tv.height = 360; tv.getContext('2d').drawImage(im, sx, sy, k, k, 0, 0, 360, 360);
      return new Promise(function (res, rej) { tv.toBlob(function (b) { if (b) res(b); else rej(new Error('foto')); }, 'image/jpeg', 0.86); });
    });
  }
  var Foto = { // öğretmenin fotoğrafı, bu cihazda
    url: null, resim: null, soz: null,
    yukle: function () {
      var self = this;
      if (this.soz) return this.soz;
      return (this.soz = Kayitlar.al('foto:ogretmen').then(function (v) {
        if (!v || !v.veri) { self.url = null; self.resim = null; return null; }
        var blob = new Blob([v.veri], { type: v.mime || 'image/jpeg' });
        if (self.url) URL.revokeObjectURL(self.url);
        self.url = URL.createObjectURL(blob);
        return bitmapYap(blob).then(function (im) { self.resim = im; return self; });
      }).catch(function () { return null; }));
    },
    koy: function (dosya) {
      var self = this;
      return fotoKirp(dosya).then(blobTampon).then(function (buf) { return Kayitlar.koy('foto:ogretmen', { mime: 'image/jpeg', veri: buf, tarih: Date.now() }); })
        .then(function () { self.soz = null; return self.yukle(); });
    }
  };
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
    '.sd-yazi{position:relative;height:100%;overflow:hidden;font-family:var(--aile),"Segoe Print","Bradley Hand","Comic Sans MS",cursive;font-size:21px;font-size:calc(5.8cqw * var(--olcek,1) * var(--sig,1) * var(--buyuk,1));line-height:1.22;color:var(--k-yazi)}',
    '@container (min-width:640px){.sd-yazi{font-size:calc(3.65cqw * var(--olcek,1) * var(--sig,1) * var(--buyuk,1))}}',
    '.sahneli .sd-yazi{height:38%}@container (min-width:640px){.sahneli .sd-yazi{height:100%;width:45%}}',
    '.sd-tahta[data-kalem="tebesir"] .blok .w:not(.w-blok){display:inline-block;-webkit-mask-image:var(--maske);mask-image:var(--maske);-webkit-mask-size:120px 120px;mask-size:120px 120px;text-shadow:0 0 1px rgba(255,255,255,.35),0 0 3px rgba(255,255,255,.12);padding:.2em .05em .3em;margin:-.2em -.05em -.3em}',
    '.sd-tahta[data-kalem="tebesir"] .blok sub .w:not(.w-blok),.sd-tahta[data-kalem="tebesir"] .blok sup .w:not(.w-blok){line-height:1;vertical-align:baseline}',
    /* tebeşir dokusu kelimenin kutusuna uygulanır: alt ve üst simgeler (CO₂, Kc) kutunun dışına taşıp silinmesin diye kutu dolgu ile genişletildi */
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
    /* tebeşir: soru kökü ve not kutuları da tebeşirle yazılır (basılı kâğıt görünümü yerine tebeşirle çizilmiş çerçeve) */
    '.sd-tahta[data-kalem="tebesir"] .b-q,.sd-tahta[data-kalem="tebesir"] .b-qd{font-family:var(--aile),"Segoe Print","Bradley Hand","Comic Sans MS",cursive;font-size:.8em;line-height:1.24;color:inherit;background:transparent;box-shadow:none;border-color:rgba(255,255,255,.4);border-color:color-mix(in srgb,currentColor 45%,transparent);border-width:.07em}',
    '.sd-tahta[data-kalem="tebesir"] .b-q::before{background:currentColor;box-shadow:none;opacity:.8}',
    '.sd-tahta[data-kalem="tebesir"] .b-q b,.sd-tahta[data-kalem="tebesir"] .b-qd b{font-weight:700}',
    '.sd-tahta[data-kalem="tebesir"].koyu .b-q .w-blok,.sd-tahta[data-kalem="tebesir"].koyu .b-qd .w-blok{background:#fff;border-radius:8px;padding:4px;color:#1F2733}',
    '@container (max-width:639px){.sd-tahta[data-kalem="tebesir"] .b-q,.sd-tahta[data-kalem="tebesir"] .b-qd{font-size:.92em}}',
    '.b-q b,.b-qd b{font-weight:700}.b-q sub,.b-q sup,.b-qd sub,.b-qd sup{font-size:.72em}',
    '.vurgu{color:var(--k-kirmizi)}',
    '.b-alt{font-weight:700;color:var(--k-mavi);margin-top:.28em}',
    '.b-li,.b-lid{position:relative;padding-left:1.05em}.b-li2{position:relative;padding-left:2em}',
    '.b-li::before{content:"•";position:absolute;left:.2em;color:var(--k-turuncu)}.b-li2::before{content:"–";position:absolute;left:1.05em;color:var(--k-turuncu)}',
    '.b-q.b-li,.b-qd.b-li,.b-q.b-lid,.b-qd.b-lid{padding-left:2.5em}.b-q.b-li2,.b-qd.b-li2{padding-left:3.3em}',
    '.b-q.b-li::before,.b-qd.b-li::before{left:1.55em;color:#E04E00}.b-q.b-li2::before,.b-qd.b-li2::before{left:2.4em;color:#E04E00}',
    /* grafik köşedeki öğretmenin yanına sığar (altına itilmez) */
    '.blok.b-grafik{margin:.12em 0 .3em}.blok.b-grafik svg{display:block;width:100%;height:auto;max-height:calc(40cqw * var(--sig,1));max-width:calc(100% - 16.5cqw);margin:0}',
    '@container (min-width:640px){.blok.b-grafik svg{max-width:calc(100% - 12.5cqw)}}',
    '.sahneli .blok.b-grafik svg,.ogretmensiz .blok.b-grafik svg{max-width:100%}',
    '.sd-yazi svg .ga-vurgu{filter:drop-shadow(0 0 2.5px rgba(248,83,0,.95)) drop-shadow(0 0 1px rgba(248,83,0,.9))}',
    '.sd-yazi svg .ga-halka{fill:none;stroke:#F85300;stroke-width:2.4;transform-box:fill-box;transform-origin:center;animation:gaNabiz 1.1s ease-in-out infinite}',
    '@keyframes gaNabiz{0%,100%{opacity:.95;transform:scale(1)}50%{opacity:.45;transform:scale(1.16)}}',
    '.sd-kalem.cizim{transition:transform .06s linear,opacity .2s}',
    '.b-sekil{text-align:center}.b-sekil .altyazi-sekil{font-family:var(--ui);font-size:.5em;color:var(--k-gri);margin-top:.2em;text-shadow:none}',
    '.koyu .b-sekil .altyazi-sekil{color:#E9EEF2}',
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
    '.sd-yuz{position:absolute;left:0;right:0;bottom:4%;aspect-ratio:1/1;border-radius:50%;overflow:hidden;background:#E9E2DA;border:3px solid #fff;box-shadow:0 4px 14px rgba(0,0,0,.22);display:none;transition:box-shadow .25s}',
    '.sd-ogretmen.yuzlu svg{visibility:hidden}.sd-ogretmen.yuzlu .sd-yuz{display:block}',
    '.sd-yuz img,.sd-yuz canvas,.sd-yuz video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}',
    '.sd-ogretmen.yuzlu.konus .sd-yuz{box-shadow:0 0 0 4px rgba(248,83,0,.55),0 4px 14px rgba(0,0,0,.22)}',
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
    '.sd-altyazi .kim{font-weight:800;font-size:12.5px;letter-spacing:.02em;padding:2px 9px;border-radius:999px;margin-right:4px;white-space:nowrap}',
    '.kim-A{background:#FCE4EE;color:#A3154B}.kim-B{background:#E1ECFA;color:#1A4A9C}',
    '.sd[data-tema="koyu"] .kim-A{background:#4A1E30;color:#FFB4CF}.sd[data-tema="koyu"] .kim-B{background:#1C2C47;color:#A9CBFF}',
    '.sd-ogr-ad{position:absolute;left:50%;bottom:3%;transform:translateX(-50%);font-family:var(--ui);font-size:clamp(9px,1.5cqw,12.5px);font-weight:800;padding:2px 8px;border-radius:999px;white-space:nowrap;box-shadow:0 2px 6px -2px rgba(0,0,0,.35)}',
    '.sd-bolum{display:flex;align-items:center;gap:8px;min-width:0}.sd-bolum label{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--gri);white-space:nowrap}',
    '.sd-bolum select{flex:1;min-width:0;width:auto;padding:7px 10px;font-size:14.5px;border-radius:10px}',
    '.sd-oynatici{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
    '.yv{width:42px;height:42px;border-radius:50%;border:1px solid var(--cizgi);background:var(--kart);display:grid;place-items:center;color:var(--murekkep);padding:0}',
    '.yv svg{width:18px;height:18px}.yv.ana{width:54px;height:54px;border:0;background:var(--turuncu);color:#fff}.yv.ana svg{width:22px;height:22px}.yv:disabled{opacity:.4;cursor:default}',
    '.sd-ilerleme{flex:1 1 90px;min-width:76px;display:grid;gap:4px}',
    '.sd-ilerleme .cubuk{height:6px;border-radius:3px;background:var(--cizgi);overflow:hidden}.sd-ilerleme .cubuk i{display:block;height:100%;width:0;background:var(--turuncu);transition:width .3s}',
    '.sd-ilerleme span{font-size:13px;color:var(--gri);font-variant-numeric:tabular-nums}',
    /* ayarlar */
    '.sd-yan{display:grid;gap:14px;min-width:0}',
    '.ogr-giris{text-align:center;display:grid;gap:8px;justify-items:center}.ogr-giris .satir{width:100%}.ogr-giris input{flex:1 1 140px;min-width:0;padding:9px 12px;border:1px solid var(--cizgi);border-radius:10px;background:var(--kart)}',
    '.baglanti{border:0;background:none;color:var(--gri);font-size:13px;text-decoration:underline;text-underline-offset:3px;padding:4px 8px}',
    '.rozet-ogr{font-size:11px;font-weight:800;letter-spacing:.04em;color:var(--turuncu-k);background:var(--turuncu-y);border-radius:999px;padding:2px 8px;vertical-align:middle;margin-left:6px}',
    '.ogr-dinle{margin-top:6px}',
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
    'textarea{resize:vertical;line-height:1.5;min-height:170px}textarea.kisa{min-height:110px}',
    '.satir{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.satir input[type="range"]{flex:1;accent-color:var(--turuncu)}',
    'output{font-variant-numeric:tabular-nums;font-size:14px;min-width:3.6em;text-align:right;color:var(--gri)}',
    '.anahtar{display:flex;align-items:center;gap:10px;font-size:15px}.anahtar input{width:18px;height:18px;accent-color:var(--turuncu)}',
    '.dugme{border:0;border-radius:10px;background:var(--turuncu);color:#fff;font-weight:700;padding:10px 14px;white-space:nowrap}',
    '.dugme.ikincil{background:transparent;color:var(--murekkep);border:1px solid var(--cizgi)}.dugme:disabled{opacity:.45;cursor:default}',
    '.not{margin:0;font-size:13.5px;color:var(--gri);line-height:1.5}.not b{color:var(--murekkep)}',
    '.uyari{margin:0;font-size:13.5px;line-height:1.5;padding:8px 10px;border-radius:10px;background:var(--turuncu-y);color:var(--turuncu-k)}',
    'a.dugme{display:inline-flex;align-items:center;gap:6px;text-decoration:none}.indir-ilerleme{flex:none;min-width:0}',
    '.indir-onizleme{border:1px solid var(--cizgi);border-radius:10px;overflow:hidden;background:#FBF8F5}.indir-onizleme canvas{display:block;width:100%;height:auto;max-height:58vh;object-fit:contain;background:#14110F}',
    '.alan>label.anahtar{font-size:15px;font-weight:400;letter-spacing:0;text-transform:none;color:var(--murekkep);margin-top:4px}',
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
    '.studyo-kamera{display:flex;gap:12px;align-items:center;margin-bottom:10px}',
    '.kamera-kutu{position:relative;width:min(120px,30vw);aspect-ratio:1/1;border-radius:50%;overflow:hidden;background:#1D1A18;flex:none;box-shadow:0 2px 10px rgba(0,0,0,.2)}',
    '.kamera-kutu video,.kamera-kutu canvas{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.kamera-kutu video{transform:scaleX(-1)}',
    '.kamera-kutu.kayitta{box-shadow:0 0 0 4px #D3202E}',
    '.kamera-kutu video.tekrar{transform:none}',
    '.kamera-yazi{flex:1;min-width:0}.kamera-yazi .not{margin:4px 0 0}',
    '.studyo-kamera.acik{position:sticky;top:0;z-index:2;background:var(--kagit);padding:12px 0 8px}.studyo-kamera.acik .not{display:none}',
    '.blok.b-sayfa{text-align:center;margin:0}.blok.b-sayfa img{max-width:none;max-height:none;vertical-align:top;background:#DDE2E7;padding:1px;border-radius:3px}',
    '.sd-yazi:has(.b-sayfa) .sd-yer1,.sd-yazi:has(.b-sayfa) .sd-yer2{display:none}',
    '.belge-liste{list-style:none;margin:0;padding:0;display:grid;gap:6px}.belge-liste:empty{display:none}',
    '.sunum-alan{margin-top:10px;padding-top:10px;border-top:1px solid var(--cizgi)}.sunum-ic{display:grid;gap:8px;padding:2px 0 6px 28px}.sunum-ic .sd-kucuk{justify-self:start}',
    '.sunum-etiket{display:grid;gap:4px;font-size:13px;font-weight:600;color:var(--gri)}.sunum-etiket input,.sunum-etiket select{color:var(--murekkep);font-weight:400}',
    '.sunum-etiket textarea{color:var(--murekkep);font-weight:400}',
    '.kapak-alan>.etiket,.paylasim>.etiket{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--gri)}',
    '.kapak-alan{display:grid;gap:6px;margin-top:8px;padding-top:10px;border-top:1px dashed var(--cizgi)}.kapak-alan .sd-kucuk{justify-self:start}',
    '.kapak-onizleme{justify-self:start;max-width:100%;border:1px solid var(--cizgi);border-radius:10px;overflow:hidden;background:#FBF8F5}.kapak-onizleme img{display:block;max-width:100%;max-height:300px;width:auto;height:auto}',
    '.kisim-satir{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}.kisim-satir select{min-width:0;width:100%}',
    '.paylasim{display:grid;gap:8px;margin-top:10px;padding-top:10px;border-top:1px solid var(--cizgi)}.paylasim textarea{min-height:180px;font-size:14px;line-height:1.45}',
    '.paylasim-baslik{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:end}.paylasim-baslik input{min-width:0}',
    '.kisim-satir input[type="number"]{width:100%;min-width:0;border:1px solid var(--cizgi);background:var(--kagit);border-radius:10px;padding:9px 11px;font-size:15px;color:var(--murekkep);font-weight:400}',
    '.ekran-alan{display:grid;gap:10px;margin-top:6px}.ekran-dosya{display:grid;gap:4px;justify-items:start}.ekran-dosya .not{overflow-wrap:anywhere}',
    '.ekran-ayar{display:grid;gap:8px}.ekran-ayar>.etiket{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--gri)}',
    '.kirp-kutu{border:1px solid var(--cizgi);border-radius:10px;overflow:hidden;background:#14110F;display:grid;place-items:center}.kirp-kutu canvas{display:block;max-width:100%;max-height:52vh;width:auto;height:auto;touch-action:none;cursor:crosshair}',
    '.belge-liste li{display:flex;gap:6px;align-items:center;font-size:14px}.belge-liste li span{flex:1;min-width:0;overflow-wrap:anywhere}',
    /* kalem stüdyosu */
    '.kalem-tanit{display:grid;gap:6px;padding:12px 14px;border-radius:12px;background:var(--turuncu-y);border:1px solid var(--cizgi);margin-bottom:10px}.kalem-tanit .dugme{justify-self:start}',
    '.kst{position:fixed;inset:0;z-index:20;background:#0F1216;color:#F2F4F7;display:flex;flex-direction:column;gap:6px;touch-action:none;overscroll-behavior:contain;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;',
    '  padding:max(8px,env(safe-area-inset-top,0px)) max(10px,env(safe-area-inset-right,0px)) max(8px,env(safe-area-inset-bottom,0px)) max(10px,env(safe-area-inset-left,0px))}',
    '.kst-ust{display:flex;align-items:center;gap:10px;min-height:48px}',
    '.kst-d{flex:none;width:44px;height:44px;border-radius:50%;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);color:#fff;display:grid;place-items:center;padding:0}.kst-d svg{width:20px;height:20px}',
    '.kst-d[aria-pressed="true"]{background:#fff;color:#111;border-color:#fff}.kst-d:disabled{opacity:.35;cursor:default}',
    '.kst-metin{flex:1;min-width:0;display:grid;gap:1px}',
    '.kst-no{font-size:11.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#FFB385}',
    '.kst-metin b{font-size:clamp(15px,2vw,21px);font-weight:700;line-height:1.3;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
    '.kst-metin small{font-size:12.5px;color:#9AA4B2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.kst-kamera{flex:none;display:flex}.kst-kamera .kamera-kutu{width:clamp(52px,7vw,88px)}',
    '.kst-sahne{flex:1;min-height:0;display:flex;align-items:center;justify-content:center}',
    '.kst-tahta{position:relative;width:100%;aspect-ratio:16/9;border-radius:10px;overflow:hidden;background:#1A1E24;box-shadow:0 18px 40px -18px rgba(0,0,0,.85)}',
    '.kst-tahta canvas{position:absolute;inset:0;width:100%;height:100%;display:block}',
    '.kst-tahta canvas.cizim{touch-action:none;cursor:crosshair;z-index:2}',
    '.kst-yukle{position:absolute;inset:0;z-index:3;display:grid;place-items:center;background:#1A1E24;color:#C9D1DB;font-size:15px;text-align:center;padding:16px}',
    '.kst-ipucu{position:absolute;left:50%;top:12px;transform:translateX(-50%);z-index:4;background:rgba(15,18,22,.88);color:#fff;font-size:14px;font-weight:600;padding:8px 14px;border-radius:999px;pointer-events:none;max-width:calc(100% - 24px);text-align:center}',
    '.kst-alt{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 16px}',
    '.kst-araclar,.kst-oynat{display:flex;align-items:center;gap:6px;flex-wrap:wrap}',
    '.kst-arac{width:44px;height:44px;border-radius:50%;border:2px solid transparent;background:rgba(255,255,255,.07);display:grid;place-items:center;padding:0;color:#fff}',
    '.kst-arac svg{width:22px;height:22px}.kst-arac i{display:block;width:20px;height:20px;border-radius:50%;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.55)}',
    '.kst-arac[aria-pressed="true"]{border-color:#fff;background:rgba(255,255,255,.18)}',
    '.kst-ayrac{width:1px;height:28px;background:rgba(255,255,255,.14);margin:0 3px}',
    '.kst-b{height:44px;border-radius:999px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.07);color:#fff;font-weight:700;font-size:15px;padding:0 16px;white-space:nowrap;display:inline-flex;align-items:center;gap:6px}',
    '.kst-b.kare{width:44px;padding:0;justify-content:center}.kst-b svg{width:18px;height:18px}.kst-b:disabled{opacity:.35;cursor:default}',
    '.kst-kayit{background:#E5322D;border-color:#E5322D;min-width:120px;justify-content:center}',
    '.kst-b.kayitta{background:#fff;color:#C21F1A;border-color:#fff}',
    '.kst-sure{font-variant-numeric:tabular-nums;font-size:14px;color:#C9D1DB;min-width:44px}',
    '.kst-seviye{width:70px;height:8px;border-radius:4px;background:rgba(255,255,255,.14);overflow:hidden;flex:none}.kst-seviye i{display:block;height:100%;width:0;background:#3DDC84;border-radius:4px}',
    '.kst-seviye.yuksek i{background:#FF5A4F}.kst-seviye.dusuk i{background:#C9D1DB}',
    '.kst-sayac{position:absolute;inset:0;z-index:5;display:grid;place-items:center;background:rgba(15,18,22,.4);color:#fff;font-size:clamp(72px,16vw,190px);font-weight:800;text-shadow:0 6px 28px rgba(0,0,0,.45);pointer-events:none}',
    '.kst-sayac span{display:grid;place-items:center;width:1.5em;height:1.5em;border-radius:50%;background:rgba(229,50,45,.94);box-shadow:0 0 0 .12em rgba(255,255,255,.85);font-size:.7em;animation:sayac .6s ease-out both}@keyframes sayac{from{transform:scale(1.5);opacity:0}to{transform:scale(1);opacity:1}}',
    '.kst-isik{flex:none;max-width:200px;font-size:12px;font-weight:700;line-height:1.3;color:#1E1A17;background:#FFD27A;border-radius:10px;padding:5px 8px}',
    '@media (max-width:640px){.kst-isik{display:none!important}}',
    '.kst-bilgi{flex-basis:100%;display:flex;gap:12px;align-items:center;font-size:12.5px;color:#9AA4B2;min-height:18px}',
    '.kst-baglanti{border:0;background:none;color:#FFB385;font-size:12.5px;font-weight:700;padding:0;text-decoration:underline}',
    '@media (max-width:640px){.kst-arac,.kst-b.kare,.kst-d{width:40px;height:40px}.kst-b{height:40px;font-size:14px;padding:0 12px}.kst-kayit{min-width:104px}}',
    /* akıllı tahta görünümü: tahta ekranı kaplar (16:9), yazı, altyazı ve düğmeler büyür, ayarlar sağdan açılır */
    '.pdf-menu{display:flex;align-items:center;gap:8px;flex-wrap:wrap;background:var(--turuncu-y);border:1px solid #F7C3A5;border-radius:12px;padding:8px 10px}',
    '.pdf-menu .pdf-baslik{font-weight:800;font-size:14px;color:var(--turuncu-k);margin-right:4px}.pdf-menu .pdf-durum{font-size:13.5px;color:var(--gri);flex:1 1 160px;min-width:0}',
    '.pdf-menu .pdf-kapat{margin-left:auto;padding:6px}.sd-kucuk:disabled{opacity:.55;cursor:default}',
    '.yan-baslik{display:none;align-items:center;justify-content:space-between;gap:10px;position:sticky;top:-16px;z-index:2;background:var(--kagit);padding:4px 0 8px}.yan-baslik b{font-size:18px}',
    '.sd.akilli{position:fixed;inset:0;z-index:2147482000;background:var(--kagit);overflow:auto;padding:0;display:block}',
    '.sd.akilli .sd-panel{width:100%;min-height:100%;max-width:none;border-radius:0;margin:0;box-shadow:none;background:var(--kagit);display:flex;flex-direction:column;gap:8px;',
    '  padding:max(8px,env(safe-area-inset-top,0px)) max(14px,env(safe-area-inset-right,0px)) max(8px,env(safe-area-inset-bottom,0px)) max(14px,env(safe-area-inset-left,0px))}',
    '.sd.akilli .sd-ust{flex-wrap:nowrap}.sd.akilli .sd-ust h2{font-size:clamp(17px,1.5vw,24px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.sd.akilli .sd-ust .sd-kucuk{padding:10px 16px;font-size:16px;white-space:nowrap}.sd.akilli .sd-ust .sd-kucuk svg{width:20px;height:20px}',
    '.sd.akilli .sd-duzen{display:block;flex:1 1 auto;min-height:0}',
    '.sd.akilli .sd-alan{display:flex;flex-direction:column;gap:8px;--tg:calc((100vh - 250px) * 16 / 9)}',
    '@supports (height:100dvh){.sd.akilli .sd-alan{--tg:calc((100dvh - 250px) * 16 / 9)}}',
    '.sd.akilli .sd-cerceve,.sd.akilli .sd-altyazi,.sd.akilli .sd-oynatici{width:100%;max-width:max(320px,var(--tg));margin:0 auto}',
    '.sd.akilli .sd-oynatici .sd-bolum{flex:1 1 200px;max-width:360px;min-width:0}.sd.akilli .sd-oynatici .sd-bolum label{display:none}',
    '.sd.akilli .sd-tahta{aspect-ratio:16/9}',
    '.sd.akilli .sd-altyazi{font-size:clamp(17px,1.75vw,30px);line-height:1.4;min-height:0;padding:8px 18px}.sd.akilli .sd-altyazi .kim{font-size:.72em}',
    '.sd.akilli .sd-bolum select{font-size:16px;padding:10px 12px}',
    '.sd.akilli .sd-oynatici{justify-content:center;gap:14px;flex-wrap:nowrap}',
    '.sd.akilli .yv{width:62px;height:62px}.sd.akilli .yv svg{width:26px;height:26px}.sd.akilli .yv.ana{width:78px;height:78px}.sd.akilli .yv.ana svg{width:32px;height:32px}',
    '.sd.akilli .sd-ilerleme{flex:1 1 200px}.sd.akilli .sd-ilerleme .cubuk{height:9px;border-radius:5px}.sd.akilli .sd-ilerleme span{font-size:17px}',
    '.sd.akilli .sd-yan{position:fixed;top:0;right:0;bottom:0;width:min(400px,94vw);overflow:auto;overscroll-behavior:contain;background:var(--kagit);',
    '  box-shadow:-18px 0 44px -20px rgba(20,17,15,.55);padding:16px;z-index:30;align-content:start}',
    '.sd.akilli:not(.ayar-acik) .sd-yan{display:none}.sd.akilli .yan-baslik{display:flex}',
    '@media (max-width:700px){.sd.akilli .sd-ust .sd-kucuk .etk{display:none}.sd.akilli .sd-ust .sd-kucuk{padding:10px}.sd.akilli .yv{width:48px;height:48px}.sd.akilli .yv.ana{width:60px;height:60px}.sd.akilli .sd-oynatici{gap:8px}}',
    '@media (prefers-reduced-motion:reduce){.w.on,.sd-tahta[data-kalem="tebesir"] .w.on{animation:none}.sd-ogretmen svg,.sd-ogretmen .gozler,.sd-ogretmen.yaziyor .kol{animation:none}.sd-silgi.calis{animation-duration:.01s}.sd-kalem{transition:none}}'
  ].join('\n');

  var KST_IKON = {
    kamera: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.5h3l1.6-2.2h6.8L17 7.5h3a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8.5a1 1 0 0 1 1-1z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
    fosfor: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 20.5h9" stroke="#FFD60A" stroke-width="3.2" stroke-linecap="round"/><path d="M14.6 3.6l5.8 5.8-7.9 7.9H7.4v-5.1z" fill="#FFD60A" stroke="#fff" stroke-width="1.3" stroke-linejoin="round"/><path d="M8.8 11.6l4.6 4.6" stroke="#5A4A00" stroke-width="1.3"/></svg>',
    lazer: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.2" fill="none" stroke="#FF2E2E" stroke-opacity=".5" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="#FF2E2E"/><circle cx="12" cy="12" r="1.4" fill="#fff"/></svg>',
    silgi: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.9 14.6l9.3-9.3a2 2 0 0 1 2.8 0l3 3a2 2 0 0 1 0 2.8l-8.3 8.3H7.3l-3.4-3.4a1 1 0 0 1 0-1.4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8.7 9.8l5.7 5.7M12 19.4h8.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    geri: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 5.5L5 10l4.5 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 10H14a4.75 4.75 0 0 1 0 9.5h-3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    temizle: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 7h15M9.5 7V4.8h5V7M6.8 7l1 12.2h8.4l1-12.2M10.2 10.5v5.5M13.8 10.5v5.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };
  var IKON = {
    oynat: '<path d="M8 5v14l11-7z" fill="currentColor"/>', dur: '<path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"/>',
    geri: '<path d="M6 5h2v14H6zM19 5v14L9 12z" fill="currentColor"/>', ileri: '<path d="M16 5h2v14h-2zM5 5v14l10-7z" fill="currentColor"/>',
    bastan: '<path d="M12 5V2L7 6l5 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z" fill="currentColor"/>',
    tam: '<path d="M4 9V4h5v2H6v3zm10-5h6v5h-2V6h-4zM4 15h2v3h3v2H4zm14 3v-3h2v5h-5v-2z" fill="currentColor"/>',
    ayar: '<path d="M19.4 13a7.5 7.5 0 0 0 0-2l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-1.7-1L15 3.5h-4l-.4 2.5a7.6 7.6 0 0 0-1.7 1l-2.4-1-2 3.4L6.6 11a7.5 7.5 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 1.7 1l.4 2.5h4l.4-2.5a7.6 7.6 0 0 0 1.7-1l2.4 1 2-3.4zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" fill="currentColor" transform="translate(-1 0)"/>',
    kapat: '<path d="M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19l5.6-5.6 5.6 5.6 1.4-1.4-5.6-5.6L19 6.4 17.6 5 12 10.6z" fill="currentColor"/>',
    tahta: '<path fill="currentColor" fill-rule="evenodd" d="M2 3.5h20v13H2zm2 2v9h16v-9z"/><path fill="currentColor" d="M11 16.5h2V19h4v2H7v-2h4z"/>',
    pdf: '<path fill="currentColor" fill-rule="evenodd" d="M6 2h8.5L20 7.5V22H6zm2 2v16h10V9h-5V4zm3 6.5h2v4.3l1.6-1.6 1.4 1.4-4 4-4-4 1.4-1.4 1.6 1.6z"/>'
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
    return '<div class="sd" lang="tr" data-mod="' + (pencere ? 'pencere' : 'satir') + '"><div class="sd-panel" role="' + (pencere ? 'dialog' : 'region') + '" aria-label="Sesli ders">' +
      '<div class="sd-ust">' + (pencere ? '<h2 data-r="baslik">Sesli anlatım</h2>' : (o.baslik ? '<h2>' + esc(o.baslik) + '</h2>' : '')) + sekmeler +
        '<button type="button" class="sd-kucuk" data-r="ikiliDugme" aria-pressed="false" title="Kadın ve erkek öğretmen sırayla anlatsın"><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="8" r="3.2" fill="currentColor"/><circle cx="16.5" cy="8" r="3.2" fill="currentColor"/><path d="M2.5 19c.6-3.4 2.8-5.2 5.5-5.2s4.9 1.8 5.5 5.2zM11 19c.5-3.4 2.7-5.2 5.5-5.2S21.4 15.6 22 19z" fill="currentColor"/></svg><span class="etk">Karşılıklı</span></button>' +
        '<button type="button" class="sd-kucuk" data-r="indirDugme" aria-label="Dersi indir" title="Dersi ses ya da video olarak indir"><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5v11m0 0l-4.6-4.6M12 14.5l4.6-4.6M4.5 16.5v3h15v-3" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="etk">İndir</span></button>' +
        '<button type="button" class="sd-kucuk" data-r="pdfDugme" aria-expanded="false" title="Tahtaya yazılanları PDF ders notu olarak indir">' + ikon('pdf').replace('<svg', '<svg width="16" height="16"') + '<span class="etk">Ders PDF\'si</span></button>' +
        '<button type="button" class="sd-kucuk" data-r="akilliDugme" aria-pressed="false" title="Akıllı tahtaya yansıtma görünümü: tahta ekranı kaplar, yazı ve düğmeler büyür">' + ikon('tahta').replace('<svg', '<svg width="16" height="16"') + '<span class="etk">Akıllı tahta</span></button>' +
        '<button type="button" class="sd-kucuk" data-r="ayarDugme" aria-pressed="false" aria-label="Ayarlar">' + ikon('ayar').replace('<svg', '<svg width="16" height="16"') + '<span class="etk">Ayarlar</span></button>' +
        (pencere ? '<button type="button" class="sd-kucuk" data-r="kapat" aria-label="Kapat">' + ikon('kapat').replace('<svg', '<svg width="16" height="16"') + '<span class="etk">Kapat</span></button>' : '') +
      '</div>' +
      '<div class="pdf-menu" data-r="pdfMenu" hidden><span class="pdf-baslik">Ders PDF\'si</span>' +
        '<button type="button" class="sd-kucuk" data-r="pdfTum">Bütün ders</button><button type="button" class="sd-kucuk" data-r="pdfBolum">Bu bölüm</button>' +
        '<span class="pdf-durum" data-r="pdfDurum" aria-live="polite"></span><button type="button" class="sd-kucuk pdf-kapat" data-r="pdfKapat" aria-label="Kapat">' + ikon('kapat').replace('<svg', '<svg width="14" height="14"') + '</button></div>' +
      '<div class="sd-duzen"><section class="sd-alan">' +
        '<div class="sd-cerceve" data-r="cerceve"><div class="sd-tahta" data-r="tahta">' +
          '<div class="sd-doku"></div><div class="sd-iz" data-r="iz"></div>' +
          '<div class="sd-ic"><div class="sd-yazi" data-r="yazi"></div></div>' +
          '<div class="sd-sahne" data-r="sahne" aria-hidden="true"></div>' +
          '<div class="sd-kalem" data-r="kalem" aria-hidden="true"></div>' +
          '<div class="sd-silgi" data-r="silgi"><div></div></div>' +
          '<div class="sd-ogretmen kadin" data-r="ogretmen">' + OGRETMEN_SVG + '<div class="sd-yuz" data-r="yuz"><img data-r="yuzFoto" alt="" hidden><canvas data-r="yuzTuval" width="384" height="384" hidden></canvas><video data-r="yuzVideo" muted playsinline preload="auto" hidden></video></div><span class="sd-ogr-ad" data-r="ogrAd" hidden></span></div>' +
          '<div class="sd-perde" data-r="perde"><div class="sd-perde-ic"><button type="button" data-r="perdeDugme"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="rgba(255,255,255,.22)"/><path d="M9.5 7.5 L17 12 L9.5 16.5 Z" fill="#fff"/></svg><span data-r="perdeYazi">Dersi başlat</span></button><small data-r="perdeAlt">Ses açıkken başlat. Tahtaya yazılanlar sesle birlikte ilerler.</small></div></div>' +
        '</div><div class="sd-raf" data-r="raf" aria-hidden="true"></div></div>' +
        '<div class="sd-bolum" data-r="bolumKutu" hidden><label for="sd-bolum-sec">Bölüm</label><select id="sd-bolum-sec" data-r="bolumSec" aria-label="Bölüm seç"></select></div>' +
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
        '<div class="yan-baslik"><b>Ayarlar</b><button type="button" class="sd-kucuk" data-r="yanKapat">' + ikon('kapat').replace('<svg', '<svg width="16" height="16"') + ' Kapat</button></div>' +
        (o.metin ? '<section class="kart" data-r="metinKart" hidden><h3>Kendi metnini anlat</h3><textarea data-r="metin" maxlength="' + METIN_SINIR + '" aria-label="Anlatılacak metin"></textarea><p class="not" data-r="metinSay" aria-live="polite"></p>' +
          '<div class="satir"><button type="button" class="dugme" data-r="metinDugme">Tahtada anlat</button><button type="button" class="dugme ikincil" data-r="ornekDugme">Örneği geri yükle</button></div>' +
          '<p class="not">Her cümle ayrı bir adım olur; 2–3 sayfalık bir konuyu da yapıştırabilirsin. Başlık satırları yeni tahtada başlar, tahta dolunca silinip yazmaya devam edilir. Formüller tahtada alt ve üst simgelerle yazılır, seste adlarıyla okunur: NaCl → “sodyum klorür”.</p></section>' : '') +
        '<section class="kart"><h3>Tahta ve kalem</h3>' +
          '<div class="alan"><span class="etiket">Görünüm</span><div class="secim" data-r="duzenler"><button type="button" data-duzen="normal">Normal</button><button type="button" data-duzen="akilli">Akıllı tahta</button></div>' +
            '<p class="not">Akıllı tahta görünümünde tahta ekranı kaplar; yazı, altyazı ve düğmeler sınıfın arkasından da görülecek kadar büyür.</p></div>' +
          '<div class="alan"><span class="etiket">Yazı büyüklüğü</span><div class="secim" data-r="buyuklukler"><button type="button" data-buyukluk="0.85">Küçük</button><button type="button" data-buyukluk="1">Orta</button><button type="button" data-buyukluk="1.18">Büyük</button></div></div>' +
          '<div class="alan"><span class="etiket">Tahta</span><div class="secim" data-r="tahtalar"></div></div>' +
          '<div class="alan"><span class="etiket">Kalem</span><div class="secim" data-r="kalemler"></div></div>' +
          '<div class="alan"><span class="etiket">Kalem rengi</span><div class="renkler" data-r="renkler"></div></div>' +
          '<div class="alan"><label>Yazı karakteri<select data-r="yaziSec" style="margin-top:6px"></select></label></div>' +
        '</section>' +
        '<section class="kart"><h3>Ses ve anlatım</h3>' +
          '<div class="alan"><span class="etiket">Ses kaynağı</span><div class="secim" data-r="kaynaklar"><button type="button" data-kaynak="bulut" hidden>Doğal sesler</button><button type="button" data-kaynak="cihaz">Cihaz sesi</button><button type="button" data-kaynak="kayit">Öğretmen kaydı</button></div><p class="not" data-r="kaynakNot"></p></div>' +
          '<div class="alan"><span class="etiket">Anlatım</span><div class="secim" data-r="bicimler"><button type="button" data-ikili="0">Tek öğretmen</button><button type="button" data-ikili="1">Karşılıklı · kadın ve erkek</button></div></div>' +
          '<div class="alan" data-r="ikiliSes" hidden><label>Elif Hoca (kadın)<select data-r="sesSecK" style="margin-top:6px"></select></label><label style="margin-top:8px">Kerem Hoca (erkek)<select data-r="sesSecE" style="margin-top:6px"></select></label></div>' +
          '<div class="alan" data-r="tekCins"><span class="etiket">Ses</span><div class="secim" data-r="cinsler"><button type="button" data-cins="k">Kadın</button><button type="button" data-cins="e">Erkek</button></div></div>' +
          '<div class="alan" data-r="tekSes"><label><span data-r="sesEtiket">Cihazdaki Türkçe sesler</span><select data-r="sesSec" style="margin-top:6px"></select></label></div>' +
          '<div class="alan"><span class="etiket">Anlatım tarzı</span><div class="secim" data-r="tarzlar"></div></div>' +
          '<div class="alan"><label>Hız</label><div class="satir"><input type="range" data-r="hiz" min="0.7" max="1.4" step="0.05" aria-label="Hız"><output data-r="hizDeger">1,00×</output></div></div>' +
          '<label class="anahtar"><input type="checkbox" data-r="ogrGoster"> Öğretmen figürünü göster</label>' +
          '<div class="alan" data-r="gorunumAlan"><span class="etiket">Köşedeki öğretmen</span><div class="secim" data-r="gorunumler"><button type="button" data-gor="figur">Çizgi figür</button><button type="button" data-gor="foto">Fotoğrafım</button><button type="button" data-gor="video">Videom</button></div>' +
            '<p class="not" data-r="gorunumNot"></p><button type="button" class="sd-kucuk" data-r="fotoDegistir" hidden>Fotoğrafı değiştir</button><input type="file" accept="image/*" data-r="fotoSec" hidden></div>' +
          '<p class="not" data-r="ogrSesNot" hidden></p>' +
          '<p class="uyari" data-r="sesNot" hidden></p>' +
          '<button type="button" class="dugme ikincil" data-r="studyoAc">🎙️ Kendi sesinle kaydet</button>' +
        '</section>' +
        '<section class="kart" data-r="ogrKart" hidden><h3>Öğrenci sesleri <span class="rozet-ogr">Öğretmen</span></h3>' +
          '<p class="not">Öğrenciler yalnız bu iki doğal sesi seçebilir; öteki sesler onlara kapalıdır. Değiştirip kaydedince bütün öğrencilere geçer.</p>' +
          '<div class="alan"><label>Kadın sesi<select data-r="ogrSesK" style="margin-top:6px"></select></label><button type="button" class="sd-kucuk ogr-dinle" data-r="ogrDinleK">▶ Dinle</button></div>' +
          '<div class="alan"><label>Erkek sesi<select data-r="ogrSesE" style="margin-top:6px"></select></label><button type="button" class="sd-kucuk ogr-dinle" data-r="ogrDinleE">▶ Dinle</button></div>' +
          '<div class="satir"><button type="button" class="dugme" data-r="ogrKaydet">Kaydet</button><button type="button" class="dugme ikincil" data-r="ogretmenCik">Öğretmen modundan çık</button></div>' +
          '<p class="not" data-r="ogrKartNot" aria-live="polite"></p>' +
        '</section>' +
        '<div class="ogr-giris" data-r="ogrGiris"><button type="button" class="baglanti" data-r="ogrGirisAc">Öğretmen girişi</button>' +
          '<div class="satir" data-r="ogrGirisForm" hidden><input type="password" autocomplete="off" autocapitalize="off" spellcheck="false" data-r="ogrAnahtar" placeholder="Öğretmen anahtarı" aria-label="Öğretmen anahtarı"><button type="button" class="dugme" data-r="ogrGirisDugme">Giriş</button></div>' +
          '<p class="not" data-r="ogrGirisNot" aria-live="polite" hidden></p></div>' +
        '<section class="kart" data-r="indirKart"><h3>Dersi indir</h3>' +
          '<p class="not">Dersin anlatımı ses ya da video dosyası olarak iner. Telefonda açabilir, öğrencilerinle paylaşabilirsin.</p>' +
          '<div class="alan"><span class="etiket">Biçim</span><div class="secim" data-r="indirBicimler"><button type="button" data-ibic="mp3">MP3 ses</button><button type="button" data-ibic="m4a">MP4 ses</button><button type="button" data-ibic="mp4">MP4 video</button></div><p class="not" data-r="indirBicimNot"></p>' +
            '<div class="alan" data-r="vkAlan" hidden><span class="etiket">Video neyden yapılsın?</span><div class="secim" data-r="vkSecim"><button type="button" data-vk="ders">Bu dersten</button><button type="button" data-vk="ekran">Ekran kaydından (GoodNotes)</button></div>' +
              '<div class="ekran-alan" data-r="ekranAlan" hidden>' +
                '<p class="not">Tablette yazarken ekranını sesinle birlikte kaydet: Denetim Merkezi’nde Ekran Kaydı düğmesine basılı tut, mikrofonu aç. İstersen aynı anda telefonla kendini de çek.</p>' +
                '<div class="ekran-dosya"><button type="button" class="dugme ikincil" data-r="ekranSec">📱 Ekran kaydını seç</button><span class="not" data-r="ekranBilgi" aria-live="polite"></span><input type="file" accept="video/*" data-r="ekranDosya" hidden></div>' +
                '<div class="ekran-dosya"><button type="button" class="dugme ikincil" data-r="yuzVidSec">🎥 Yüz videosu ekle (isteğe bağlı)</button><span class="not" data-r="yuzVidBilgi" aria-live="polite"></span><input type="file" accept="video/*" data-r="yuzVidDosya" hidden></div>' +
                '<div class="ekran-ayar" data-r="ekranAyar" hidden><span class="etiket">Görünecek alan</span>' +
                  '<div class="kirp-kutu"><canvas data-r="kirpTuval" width="640" height="480" aria-label="Kayıttan görünecek alanı seç"></canvas></div>' +
                  '<div class="satir"><span class="not" style="flex:1;min-width:0">Köşeleri sürükleyip sayfayı çerçevele; üstteki araç çubuğu dışarıda kalsın.</span><button type="button" class="sd-kucuk" data-r="kirpTum">Tamamı</button></div>' +
                  '<div class="kisim-satir"><label class="sunum-etiket">Başlangıç (sn)<input type="number" min="0" step="0.5" inputmode="decimal" data-r="ekranBas"></label><label class="sunum-etiket">Bitiş (sn)<input type="number" min="0" step="0.5" inputmode="decimal" data-r="ekranSon"></label></div>' +
                  '<div class="secim" data-r="ekranSesler" hidden><button type="button" data-es="tahta">Ses: tabletten</button><button type="button" data-es="yuz">Ses: telefondan</button></div>' +
                  '<p class="not" data-r="ekranNot"></p></div>' +
              '</div></div>' +
            '<div class="alan" data-r="indirPlatAlan" hidden><span class="etiket">Nerede paylaşacaksın?</span><div class="secim" data-r="indirPlatlar"></div><span class="etiket" style="margin-top:10px">Yerleşim</span><div class="secim" data-r="indirYerler"></div>' +
              '<span class="etiket" style="margin-top:10px" data-r="indirGorEtiket">Görünüm</span><div class="secim" data-r="indirArkalar"><button type="button" data-arka="yok">Olduğu gibi</button><button type="button" data-arka="bulanik">Arka plan bulanık</button><button type="button" data-arka="studyo">Stüdyo fonu</button></div>' +
              '<span class="etiket" style="margin-top:10px" data-r="indirCerEtiket">Yüz çerçevesi</span><div class="secim" data-r="indirCerceveler"><button type="button" data-cerceve="yakin">Yakın</button><button type="button" data-cerceve="orta">Orta</button><button type="button" data-cerceve="genis">Geniş</button></div>' +
              '<label class="anahtar" data-r="indirIsikSatir" style="margin-top:4px"><input type="checkbox" data-r="indirIsik"> Stüdyo ışığı ve renk</label><p class="not" data-r="indirPlatNot"></p></div>' +
            '<label class="anahtar" data-r="indirAltyaziSatir" hidden><input type="checkbox" data-r="indirAltyazi" checked> Videoda altyazı olsun</label><div class="secim" data-r="indirAltStiller" hidden><button type="button" data-astil="buyuk">Büyük altyazı</button><button type="button" data-astil="klasik">Klasik şerit</button></div>' +
            '<div class="alan sunum-alan" data-r="sunumAlan" hidden><span class="etiket">Giriş ve marka</span>' +
              '<label class="anahtar"><input type="checkbox" data-r="girisAc"> 5 saniyelik giriş: konuya göre animasyon ve ses</label>' +
              '<div class="sunum-ic" data-r="girisAyrinti"><label class="sunum-etiket">Başlık<input type="text" data-r="girisBaslik" maxlength="70"></label>' +
                '<label class="sunum-etiket">Alt başlık<input type="text" data-r="girisAlt" maxlength="60" placeholder="ör. 9. sınıf kimya · 2. bölüm"></label>' +
                '<label class="sunum-etiket">Animasyon<select data-r="girisMotif"></select></label>' +
                '<button type="button" class="sd-kucuk" data-r="girisOnizle">▶ Girişi önizle</button></div>' +
              '<label class="anahtar"><input type="checkbox" data-r="kapanisAc"> Sonda takip kartı</label>' +
              '<label class="anahtar"><input type="checkbox" data-r="filigranAc"> Köşede “Instagram’da @kanal” yazısı</label>' +
              '<div class="sunum-ic"><label class="sunum-etiket">Kanal adı<input type="text" data-r="kanalAd" maxlength="40" placeholder="@kimyamed"></label>' +
                '<label class="sunum-etiket">Alt bantta adın (isteğe bağlı)<input type="text" data-r="altBantAd" maxlength="40" placeholder="ör. Ad Soyad"></label>' +
                '<label class="sunum-etiket">Unvanın<input type="text" data-r="altBantUnvan" maxlength="40" placeholder="ör. Kimya öğretmeni"></label></div>' +
              '<div class="kapak-alan"><span class="etiket">Kapak görseli</span><p class="not" data-r="kapakNot"></p>' +
                '<div class="satir"><button type="button" class="sd-kucuk" data-r="kapakDugme">🖼️ Kapak hazırla</button><a class="dugme ikincil" data-r="kapakLink" href="#" download hidden>⬇ Kapağı indir</a><button type="button" class="dugme ikincil" data-r="kapakPaylas" hidden>Paylaş</button></div>' +
                '<div class="kapak-onizleme" data-r="kapakOnizleme" hidden></div></div></div></div>' +
          '<div class="alan" data-r="sesAlan" hidden><span class="etiket">Ses kalitesi</span><label class="anahtar"><input type="checkbox" data-r="sesIsleAc"> Stüdyo sesi: gürültü azaltma, ses dengesi, netlik</label>' +
            '<span class="etiket" style="margin-top:8px">Fon müziği</span><div class="secim" data-r="muzikler"></div><input type="file" accept="audio/*" data-r="muzikSec" hidden><p class="not" data-r="muzikNot"></p></div>' +
          '<div class="alan" data-r="indirSesAlan"><span class="etiket">Hangi sesle?</span><div class="secim" data-r="indirSesler"><button type="button" data-isec="bulut">Doğal ses</button><button type="button" data-isec="kayit">Kendi sesim</button></div><p class="not" data-r="indirSesNot"></p></div>' +
          '<div class="alan" data-r="kisimAlan" hidden><span class="etiket">Hangi kısım?</span><div class="secim" data-r="kisimBolumler"></div>' +
            '<div class="kisim-satir"><label class="sunum-etiket">Başlangıç<select data-r="kisimBas"></select></label><label class="sunum-etiket">Bitiş<select data-r="kisimSon"></select></label></div><p class="not" data-r="kisimNot"></p></div>' +
          '<button type="button" class="dugme" data-r="indirHazirla">Ses dosyasını hazırla</button>' +
          '<div class="indir-onizleme" data-r="indirOnizleme" hidden></div>' +
          '<div class="sd-ilerleme indir-ilerleme" data-r="indirIlerleme" hidden><div class="cubuk"><i data-r="indirCubuk"></i></div><span data-r="indirYazi" aria-live="polite"></span>' +
          '<button type="button" data-r="indirIptal" hidden style="display:block;margin-top:10px;padding:8px 16px;border-radius:999px;border:1px solid currentColor;background:transparent;color:inherit;font:inherit;font-weight:600;opacity:.8">Vazgeç</button></div>' +
          '<div class="satir" data-r="indirSonuc" hidden><a class="dugme" data-r="indirLink" href="#" download>⬇ İndir</a><button type="button" class="dugme ikincil" data-r="indirPaylas" hidden>Paylaş</button><a class="dugme ikincil" data-r="indirSrt" href="#" download hidden title="YouTube’a yüklerken altyazı dosyası olarak ekleyebilirsin">Altyazı dosyası (.srt)</a></div>' +
          '<div class="paylasim" data-r="paylasimKutu" hidden><span class="etiket">Paylaşım metni</span>' +
            '<div class="paylasim-baslik" data-r="paylasimBaslikSatir" hidden><label class="sunum-etiket">YouTube başlığı<input type="text" readonly data-r="paylasimBaslik"></label><button type="button" class="sd-kucuk" data-kopyala="paylasimBaslik">Kopyala</button></div>' +
            '<label class="sunum-etiket">Açıklama<textarea readonly rows="9" data-r="paylasimMetin"></textarea></label>' +
            '<div class="satir"><button type="button" class="sd-kucuk" data-kopyala="paylasimMetin">Kopyala</button><span class="not" data-r="paylasimNot" aria-live="polite"></span></div></div>' +
          '<p class="uyari" data-r="indirUyari" hidden></p>' +
        '</section>' +
        '<section class="kart"><h3>Cümle ya da metin ekle</h3>' +
          '<div class="alan"><label>Tahtaya yazılıp seslendirilecek metin<textarea data-r="cumle" class="kisa" rows="4" maxlength="' + METIN_SINIR + '" placeholder="Bir cümle yaz ya da 2–3 sayfalık bir konuyu buraya yapıştır." style="margin-top:6px"></textarea></label>' +
          '<p class="not" data-r="cumleSay" aria-live="polite"></p></div>' +
          '<button type="button" class="dugme" data-r="cumleDugme">Ekle ve seslendir</button>' +
          '<p class="not">Metin, şu anki adımdan hemen sonra gelir. Uzun metin cümle cümle yazılır ve okunur; tahta dolunca silinip devam edilir, başlık satırları yeni tahtada başlar. Formülleri düz yazabilirsin: AgCl, Pb2+, SO42−.</p>' +
          '<ul class="ozel-liste" data-r="ozelListe"></ul>' +
        '</section>' +
      '</aside></div></div>' +
      '<div class="sd-studyo" data-r="studyo" hidden><div class="studyo-panel" role="dialog" aria-label="Kayıt stüdyosu">' +
        '<div class="sd-ust"><h3 style="flex:1">🎙️ Kendi sesinle kaydet</h3><button type="button" class="sd-kucuk" data-r="studyoKapat">' + ikon('kapat').replace('<svg', '<svg width="16" height="16"') + ' Kapat</button></div>' +
        '<div class="sd-sekmeler" role="tablist"><button role="tab" data-st="ders" aria-selected="true">Ders cümleleri</button><button role="tab" data-st="ornek" aria-selected="false">Ses kopyası için örnek</button></div>' +
        '<div data-r="stDers">' +
          '<p class="not" style="margin-bottom:8px">Her cümleyi kendi sesinle oku: <b>● Kaydet</b>’e bas, cümleyi oku, <b>■ Bitir</b>’e bas. Sessiz bir odada, telefonu ağzından bir karış uzakta tut. Kayıtlar bu cihazda saklanır; ders “Öğretmen kaydı” seçiliyken senin sesinle oynar.</p>' +
          '<div class="studyo-kamera"><div class="kamera-kutu" data-r="kameraKutu" hidden><video data-r="kameraVideo" playsinline muted autoplay></video><canvas data-r="kameraDinle" width="384" height="384" hidden></canvas><video class="tekrar" data-r="kameraTekrar" muted playsinline hidden></video></div>' +
            '<div class="kamera-yazi"><label class="anahtar"><input type="checkbox" data-r="kameraAc"> 📷 Kamerayı aç: yüzün de kaydedilsin</label><p class="not">Ön kamera açılır. Böyle kaydettiğin cümlelerde dersin köşesinde senin yüzün görünür (Köşedeki öğretmen: Videom).</p></div></div>' +
          '<div class="kalem-tanit" data-r="kstTanit"><div class="satir"><button type="button" class="dugme" data-r="kstAcDugme">✏️ Tahtada kalemle kaydet</button><button type="button" class="dugme ikincil" data-r="belgeDugme">📄 PDF ya da resim aç</button><input type="file" accept="application/pdf,image/*" multiple data-r="belgeSec" hidden></div>' +
            '<p class="not">iPad’de Apple Pencil ile tahtaya yaz, işaretle, lazerle göster. Kalem, sesin ve yüzünle aynı anda kaydedilir; indirdiğin videoda da aynen görünür. Kalemsiz kayıt için de en rahat ekran: büyük yazı, 3-2-1 geri sayım, <b>eller serbest</b> kayıt. <b>PDF ya da resim aç</b>: GoodNotes’tan PDF olarak paylaştığın sayfalar ya da çektiğin soru fotoğrafı tahtaya gelir, her sayfa ayrı anlatılır.</p>' +
            '<p class="uyari" data-r="belgeNot" hidden></p><ul class="belge-liste" data-r="belgeListe"></ul></div>' +
          '<div class="satir" style="margin-bottom:10px"><button type="button" class="dugme" data-r="siraKaydet">● Sırayla kaydet</button><button type="button" class="dugme ikincil" data-r="studyoMp3">⬇ Kendi sesimle dersi indir</button><button type="button" class="dugme ikincil" data-r="paketIndir">Site paketi (JSON)</button></div>' +
          '<p class="uyari" data-r="studyoNot" hidden></p>' +
          '<ul class="studyo-liste" data-r="studyoListe"></ul>' +
          '<p class="not" style="margin-top:8px">Kayıtlar yalnızca bu cihazda durur. <b>Kendi sesimle dersi indir</b> dersin tamamını tek bir ses ya da video dosyası yapar. <b>Site paketi</b> ise dinlemek için değil: sitenin <b>sesli</b> klasörüne eklenince öğrenciler dersi senin sesinle duyar.</p>' +
        '</div>' +
        '<div data-r="stOrnek" hidden>' +
          '<p class="not" style="margin-bottom:8px">Yeni yazılan metinlerin de senin sesinle okunması için bir ses servisinde (ör. ElevenLabs) sesinin kopyası oluşturulur. Servis bunun için 1–5 dakikalık temiz bir kayıt ister. Aşağıdaki metni doğal ders anlatır gibi oku, kaydı indirip servise yükle.</p>' +
          '<div class="satir" style="margin-bottom:10px"><button type="button" class="dugme" data-r="ornekKaydet">● Kaydı başlat</button><button type="button" class="dugme ikincil" data-r="ornekDinle" disabled>▶ Dinle</button><button type="button" class="dugme ikincil" data-r="ornekIndir" disabled>Kaydı indir</button><span class="not" data-r="ornekSure"></span></div>' +
          '<div class="teleprompter" data-r="okuma"></div>' +
        '</div>' +
      '</div>' + kstSablon() + '</div>' +
    '</div>';
  }
  function kstSablon() { // kalem stüdyosu: tam ekran tahta, kalem araçları, kayıt düğmeleri
    return '<div class="kst" data-r="kst" hidden role="dialog" aria-label="Tahtada kalemle kayıt">' +
      '<div class="kst-ust"><button type="button" class="kst-d" data-r="kstKapat" aria-label="Kalem stüdyosunu kapat">' + ikon('kapat') + '</button>' +
        '<div class="kst-metin"><span class="kst-no" data-r="kstNo"></span><b data-r="kstMetin"></b><small data-r="kstSonraki"></small></div>' +
        '<div class="kst-kamera" data-r="kstKamera"></div><span class="kst-isik" data-r="kstIsik" hidden></span>' +
        '<button type="button" class="kst-d" data-r="kstKameraDugme" aria-pressed="false" aria-label="Kamera" title="Kamera: yüzün de kaydedilsin">' + KST_IKON.kamera + '</button></div>' +
      '<div class="kst-sahne" data-r="kstSahne"><div class="kst-tahta" data-r="kstTahta"><canvas class="cizim" data-r="kstCizim"></canvas><div class="kst-ipucu" data-r="kstIpucu" hidden></div><div class="kst-sayac" data-r="kstSayac" hidden></div><div class="kst-yukle" data-r="kstYukle">Tahta hazırlanıyor…</div></div></div>' +
      '<div class="kst-alt"><div class="kst-araclar" data-r="kstAraclar"></div>' +
        '<div class="kst-oynat"><button type="button" class="kst-b kare" data-r="kstGeri" aria-label="Önceki cümle">' + ikon('geri') + '</button>' +
          '<button type="button" class="kst-b kst-kayit" data-r="kstKayit">● Kaydet</button>' +
          '<button type="button" class="kst-b kare" data-r="kstIleri" aria-label="Sonraki cümle">' + ikon('ileri') + '</button>' +
          '<button type="button" class="kst-b" data-r="kstDinle">▶ Dinle</button>' +
          '<button type="button" class="kst-b" data-r="kstUstune">✏️ Sesin üstüne çiz</button>' +
          '<button type="button" class="kst-b" data-r="kstEller" aria-pressed="false" title="Konuşman bitince kayıt kendiliğinden durur, sıradaki cümle başlar">🤚 Eller serbest</button>' +
          '<span class="kst-seviye" data-r="kstSeviye" title="Mikrofon düzeyi" hidden><i></i></span><span class="kst-sure" data-r="kstSure"></span></div>' +
        '<div class="kst-bilgi"><span data-r="kstDurum"></span><button type="button" class="kst-baglanti" data-r="kstCizimSil" hidden>Bu cümlenin çizimini sil</button></div></div>' +
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
    this.indirBicim = depo.al('indirBicim', 'mp3'); if (!/^(mp3|m4a|mp4)$/.test(this.indirBicim)) this.indirBicim = 'mp3';
    this.indirPlat = depo.al('indirPlat', 'reels'); this.indirYer = depo.al('indirYer', 'bolunmus'); this.indirAltStil = depo.al('indirAltStil', 'buyuk');
    this.indirArka = depo.al('indirArka', 'bulanik'); if (!/^(yok|bulanik|studyo)$/.test(this.indirArka)) this.indirArka = 'bulanik';
    this.indirCerceve = depo.al('indirCerceve', 'orta'); if (!/^(yakin|orta|genis)$/.test(this.indirCerceve)) this.indirCerceve = 'orta';
    this.vidKaynak = 'ders'; this.ekranSes = 'tahta'; this.ekran = null; this.yuzVid = null;
    this.r.indirIsik.checked = depo.al('indirIsik', true) !== false;
    this.muzikTur = depo.al('fonMuzik', 'yok'); if (!/^(yok|sakin|enerjik|kendi)$/.test(this.muzikTur)) this.muzikTur = 'yok';
    this.r.sesIsleAc.checked = depo.al('sesIsle', true) !== false;
    if (window.SesliSunum) {
      var rr = this.r;
      rr.girisMotif.innerHTML = window.SesliSunum.MOTIFLER.map(function (m) { return '<option value="' + m[0] + '">' + m[1] + '</option>'; }).join('');
      rr.girisAc.checked = depo.al('girisAc', true) !== false; rr.kapanisAc.checked = depo.al('kapanisAc', true) !== false; rr.filigranAc.checked = depo.al('filigranAc', true) !== false;
      rr.kanalAd.value = depo.al('kanalAd', '@kimyamed'); rr.girisAlt.value = depo.al('girisAlt', ''); rr.altBantAd.value = depo.al('altBantAd', ''); rr.altBantUnvan.value = depo.al('altBantUnvan', '');
      rr.girisMotif.value = depo.al('girisMotif', 'otomatik') || 'otomatik';
    }
    if (window.SesliStudyo) { var BC = window.SesliStudyo.BICIMLER; if (!BC[this.indirPlat]) this.indirPlat = 'reels'; if (BC[this.indirPlat].yer.indexOf(this.indirYer) < 0) this.indirYer = BC[this.indirPlat].yer[0]; }
    this.r.indirAltyazi.checked = depo.al('videoAltyazi', true) !== false;
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
    this.izinUygula();
    if (klasor) Yayin.yukle(klasor).then(function () { self.izinUygula(); self.sesListesi(); self.kayitDurumu(); self.bulutHazirla(); });
    else if (window.SESLI_DERS_BULUT) { Bulut.adres = window.SESLI_DERS_BULUT; setTimeout(function () { self.sesListesi(); }, 0); }
  }
  Oynatici.hepsi = [];
  Oynatici.prototype.temaKoy = function (t) {
    [this.kokEl, this.studyoKok].forEach(function (el) { if (!el) return; if (t) el.setAttribute('data-tema', t); else el.removeAttribute('data-tema'); });
  };

  Oynatici.prototype.bagla = function () {
    var self = this, r = this.r;
    r.oynat.addEventListener('click', function () { self.oynatDuraklat(); });
    r.perdeDugme.addEventListener('click', function () { self.calis(self.P.i >= self.P.adimlar.length ? 0 : Math.max(0, self.P.i)); });
    r.bolumSec.addEventListener('change', function () { var B = self.P.bolumler, b = B && B[+r.bolumSec.value]; if (b) self.calis(b.adim); });
    r.ileri.addEventListener('click', function () { self.calis(Math.min(self.P.adimlar.length - 1, self.P.i + 1)); });
    r.geri.addEventListener('click', function () { self.calis(Math.max(0, self.P.i - 1)); });
    r.bastan.addEventListener('click', function () { self.calis(0); });
    r.indirDugme.addEventListener('click', function () { self.indirAc(); });
    r.indirSesler.addEventListener('click', function (e) { var b = e.target.closest('[data-isec]'); if (!b || b.disabled || self.indiriliyor) return; self.indirSecim = b.getAttribute('data-isec'); self.indirSifirla(); self.indirCiz(); });
    r.indirBicimler.addEventListener('click', function (e) { var b = e.target.closest('[data-ibic]'); if (!b || self.indiriliyor) return; self.indirBicim = b.getAttribute('data-ibic'); depo.yaz('indirBicim', self.indirBicim); self.indirSifirla(); self.indirCiz(); });
    r.indirPlatlar.addEventListener('click', function (e) {
      var b = e.target.closest('[data-plat]'), ST = window.SesliStudyo; if (!b || self.indiriliyor || !ST) return;
      self.indirPlat = b.getAttribute('data-plat'); depo.yaz('indirPlat', self.indirPlat);
      var P = ST.BICIMLER[self.indirPlat]; if (P.yer.indexOf(self.indirYer) < 0) { self.indirYer = P.yer[0]; depo.yaz('indirYer', self.indirYer); }
      self.indirSifirla(); self.indirCiz();
    });
    r.indirYerler.addEventListener('click', function (e) { var b = e.target.closest('[data-yer]'); if (!b || self.indiriliyor) return; self.indirYer = b.getAttribute('data-yer'); depo.yaz('indirYer', self.indirYer); self.indirSifirla(); self.indirCiz(); });
    if (window.SesliSunum) { // giriş ve marka ayarları saklanır; değişince hazırlanmış dosya geçersiz olur
      var sunumDegisti = function () { if (!self.indiriliyor) { self.indirSifirla(); self.indirCiz(); } };
      [['girisAc', 'checked'], ['kapanisAc', 'checked'], ['filigranAc', 'checked'], ['kanalAd', 'value'], ['girisAlt', 'value'], ['altBantAd', 'value'], ['altBantUnvan', 'value'], ['girisMotif', 'value']].forEach(function (x) {
        r[x[0]].addEventListener('change', function () { depo.yaz(x[0], r[x[0]][x[1]]); sunumDegisti(); });
      });
      r.girisBaslik.addEventListener('change', function () { self.sunumBaslik = { id: self.ekranModu() ? 'ekran' : self.P.id, yazi: r.girisBaslik.value }; sunumDegisti(); });
      r.girisOnizle.addEventListener('click', function () { self.girisOnizle(); });
      r.kapakDugme.addEventListener('click', function () { self.kapakYap(); });
      r.kapakLink.addEventListener('click', function (e) { if (r.kapakLink.getAttribute('href') === '#') e.preventDefault(); });
      r.kapakPaylas.addEventListener('click', function () { var f = self.kapakDosya; if (f && navigator.share) navigator.share({ files: [f] }).catch(function () {}); });
    }
    r.sesIsleAc.addEventListener('change', function () { depo.yaz('sesIsle', !!r.sesIsleAc.checked); if (!self.indiriliyor) { self.indirSifirla(); self.indirCiz(); } });
    r.muzikler.addEventListener('click', function (e) {
      var b = e.target.closest('[data-muzik]'); if (!b || self.indiriliyor) return;
      var tur = b.getAttribute('data-muzik');
      if (tur === 'kendi' && (!self.kendiMuzik || b.getAttribute('aria-pressed') === 'true')) { r.muzikSec.click(); if (!self.kendiMuzik) return; }
      self.muzikTur = tur; depo.yaz('fonMuzik', tur); self.indirSifirla(); self.indirCiz();
    });
    r.muzikSec.addEventListener('change', function () {
      var f = r.muzikSec.files && r.muzikSec.files[0]; r.muzikSec.value = ''; if (!f) return;
      blobTampon(f).then(function (buf) { return Kayitlar.koy('muzik:kendi', { mime: f.type || 'audio/mpeg', veri: buf, ad: f.name, tarih: Date.now() }); }).then(function () {
        self.kendiMuzik = { ad: f.name }; self.muzikTur = 'kendi'; depo.yaz('fonMuzik', 'kendi'); self.indirSifirla(); self.indirCiz();
      }).catch(function () { r.muzikNot.textContent = 'Müzik dosyası saklanamadı.'; });
    });
    Kayitlar.al('muzik:kendi').then(function (v) { if (v && v.veri) { self.kendiMuzik = { ad: v.ad || 'müzik' }; if (!self.indiriliyor) self.indirCiz(); } });
    r.indirArkalar.addEventListener('click', function (e) { var b = e.target.closest('[data-arka]'); if (!b || self.indiriliyor) return; self.indirArka = b.getAttribute('data-arka'); depo.yaz('indirArka', self.indirArka); self.indirSifirla(); self.indirCiz(); });
    r.indirIptal.addEventListener('click', function () { // video hazırlamayı durdur: çevirme, inceleme ya da çizim neredeyse orada kesilir
      if (!self.indiriliyor) return; self.iptalIstek = true; r.indirIptal.disabled = true; r.indirYazi.textContent = 'Durduruluyor…';
      (self.aktifIsler || []).forEach(function (x) { try { if (x && x.iptal) x.iptal(); } catch (e) {} });
    });
    r.indirCerceveler.addEventListener('click', function (e) { var b = e.target.closest('[data-cerceve]'); if (!b || self.indiriliyor) return; self.indirCerceve = b.getAttribute('data-cerceve'); depo.yaz('indirCerceve', self.indirCerceve); self.indirSifirla(); self.indirCiz(); });
    r.indirIsik.addEventListener('change', function () { depo.yaz('indirIsik', !!r.indirIsik.checked); if (!self.indiriliyor) { self.indirSifirla(); self.indirCiz(); } });
    r.indirAltStiller.addEventListener('click', function (e) { var b = e.target.closest('[data-astil]'); if (!b || self.indiriliyor) return; self.indirAltStil = b.getAttribute('data-astil'); depo.yaz('indirAltStil', self.indirAltStil); self.indirSifirla(); self.indirCiz(); });
    r.indirAltyazi.addEventListener('change', function () { depo.yaz('videoAltyazi', !!r.indirAltyazi.checked); if (!self.indiriliyor) { self.indirSifirla(); self.indirCiz(); } });
    r.indirHazirla.addEventListener('click', function () { self.sesDosyasi(); });
    r.indirPaylas.addEventListener('click', function () { self.indirPaylas(); });
    r.indirLink.addEventListener('click', function (e) { if (r.indirLink.getAttribute('href') === '#') e.preventDefault(); });
    r.indirSrt.addEventListener('click', function (e) { if (r.indirSrt.getAttribute('href') === '#') e.preventDefault(); });
    var kisimDegisti = function () {
      if (self.indiriliyor) return;
      var b = +r.kisimBas.value, sn = +r.kisimSon.value;
      if (sn < b) { if (this === r.kisimBas) sn = b; else b = sn; }
      self.kisim = { id: self.P.id, bas: b, son: sn }; self.indirSifirla(); self.indirCiz();
    };
    r.kisimBas.addEventListener('change', kisimDegisti); r.kisimSon.addEventListener('change', kisimDegisti);
    r.kisimBolumler.addEventListener('click', function (e) {
      var b = e.target.closest('[data-kisim]'); if (!b || self.indiriliyor) return;
      var v = b.getAttribute('data-kisim').split('-'); self.kisim = { id: self.P.id, bas: +v[0], son: +v[1] }; self.indirSifirla(); self.indirCiz();
    });
    r.paylasimKutu.addEventListener('click', function (e) {
      var b = e.target.closest('[data-kopyala]'); if (!b) return;
      var el = r[b.getAttribute('data-kopyala')], yaz = function (y) { r.paylasimNot.textContent = y; clearTimeout(self.paylasimSaat); self.paylasimSaat = setTimeout(function () { r.paylasimNot.textContent = ''; }, 3500); };
      var sec = function () { try { el.focus(); el.select(); } catch (x) {} yaz('Seçildi: şimdi kopyalayabilirsin.'); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(el.value).then(function () { yaz('✓ Kopyalandı'); }, sec); else sec();
    });
    // ekran kaydından video
    r.vkSecim.addEventListener('click', function (e) { var b = e.target.closest('[data-vk]'); if (!b || self.indiriliyor) return; self.vidKaynak = b.getAttribute('data-vk'); self.indirSifirla(); self.indirCiz(); });
    r.ekranSec.addEventListener('click', function () { if (!self.indiriliyor) r.ekranDosya.click(); });
    r.yuzVidSec.addEventListener('click', function () { if (!self.indiriliyor) r.yuzVidDosya.click(); });
    r.ekranDosya.addEventListener('change', function () { var f = r.ekranDosya.files && r.ekranDosya.files[0]; r.ekranDosya.value = ''; if (f) self.ekranYukle(f); });
    r.yuzVidDosya.addEventListener('change', function () { var f = r.yuzVidDosya.files && r.yuzVidDosya.files[0]; r.yuzVidDosya.value = ''; if (f) self.yuzVidYukle(f); });
    r.kirpTum.addEventListener('click', function () { if (!self.ekran || self.indiriliyor) return; self.ekran.kirp = { x: 0, y: 0, g: 1, h: 1 }; self.kirpCiz(); self.indirSifirla(); self.indirCiz(); });
    r.ekranBas.addEventListener('change', function () { self.ekranAralik(); }); r.ekranSon.addEventListener('change', function () { self.ekranAralik(); });
    r.ekranSesler.addEventListener('click', function (e) { var b = e.target.closest('[data-es]'); if (!b || self.indiriliyor) return; self.ekranSes = b.getAttribute('data-es'); self.indirSifirla(); self.indirCiz(); });
    this.kirpOlaylari();
    r.studyoMp3.addEventListener('click', function () { self.studyoKapat(); self.indirAc('kayit', true); });
    r.ayarDugme.addEventListener('click', function () {
      var acik = !self.kokEl.classList.contains('ayar-acik');
      self.kokEl.classList.toggle('ayar-acik', acik); r.ayarDugme.setAttribute('aria-pressed', String(acik));
      if (self.opt.mod !== 'pencere' && ayar.duzen !== 'akilli') { if (acik) r.yan.scrollIntoView({ behavior: 'smooth', block: 'start' }); self.kokEl.classList.remove('ayar-acik'); r.ayarDugme.setAttribute('aria-pressed', 'false'); }
    });
    if (r.kapat) r.kapat.addEventListener('click', function () { self.kapat(); });
    Array.prototype.forEach.call(this.kok.querySelectorAll('.sd-sekmeler [data-ders]'), function (b) { b.addEventListener('click', function () { self.yukle(b.getAttribute('data-ders')); }); });
    r.cumleDugme.addEventListener('click', function () { self.cumleEkle(); });
    r.cumle.addEventListener('keydown', function (e) { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); self.cumleEkle(); } });
    var sayZaman = {};
    var sayac = function (ad) { clearTimeout(sayZaman[ad]); sayZaman[ad] = setTimeout(function () { self.metinSay(ad); }, 180); };
    r.cumle.addEventListener('input', function () { sayac('cumle'); });
    this.metinSay('cumle');
    r.ozelListe.addEventListener('click', function (e) { var b = e.target.closest('[data-sil]'); if (b) self.cumleSil(b.getAttribute('data-sil')); });
    if (r.metin) {
      r.metin.value = depo.al('metin', ORNEK_METIN);
      this.metinSay('metin');
      r.metin.addEventListener('input', function () { depo.yaz('metin', r.metin.value); sayac('metin'); });
      r.metinDugme.addEventListener('click', function () { self.adimListeleri.metin = metindenDers(r.metin.value).adimlar; self.P.adimlar = self.adimListeleri.metin; self.P.i = -1; self.planYap(); self.ozelListeCiz(); self.calis(0); });
      r.ornekDugme.addEventListener('click', function () { r.metin.value = ORNEK_METIN; depo.yaz('metin', ORNEK_METIN); self.metinSay('metin'); });
    }
    // ayarlar
    r.tahtalar.addEventListener('click', function (e) { var b = e.target.closest('[data-tahta]'); if (!b) return; ayar.tahta = b.getAttribute('data-tahta'); ayar.kalem = null; ayar.renk = 0; depo.yaz('tahta', ayar.tahta); depo.yaz('kalem', null); depo.yaz('renk', 0); Oynatici.hepsi.forEach(function (o) { o.gorunumUygula(); }); });
    r.kalemler.addEventListener('click', function (e) { var b = e.target.closest('[data-kalem]'); if (!b) return; ayar.kalem = b.getAttribute('data-kalem'); ayar.renk = 0; depo.yaz('kalem', ayar.kalem); depo.yaz('renk', 0); Oynatici.hepsi.forEach(function (o) { o.gorunumUygula(); }); });
    r.renkler.addEventListener('click', function (e) { var b = e.target.closest('[data-renk]'); if (!b) return; ayar.renk = +b.getAttribute('data-renk'); depo.yaz('renk', ayar.renk); Oynatici.hepsi.forEach(function (o) { o.gorunumUygula(); }); });
    r.yaziSec.addEventListener('change', function () { ayar.yazi = r.yaziSec.value; depo.yaz('yazi', ayar.yazi); Oynatici.hepsi.forEach(function (o) { o.gorunumUygula(); }); });
    r.kaynaklar.addEventListener('click', function (e) { var b = e.target.closest('[data-kaynak]'); if (!b) return; ayar.kaynak = b.getAttribute('data-kaynak'); depo.yaz('kaynak', ayar.kaynak); Oynatici.hepsi.forEach(function (o) { o.sesListesi(); o.kayitDurumu(); o.bulutHazirla(); o.gorunumNotYaz(); }); });
    r.cinsler.addEventListener('click', function (e) { var b = e.target.closest('[data-cins]'); if (!b) return; ayar.cins = b.getAttribute('data-cins'); ayar.sesAdi = ''; ayar.bulutSes = ''; depo.yaz('cins', ayar.cins); depo.yaz('ses', ''); depo.yaz('bulutSes', ''); Oynatici.hepsi.forEach(function (o) { o.sesListesi(); o.gorunumUygula(); }); });
    r.sesSec.addEventListener('focus', function () { if (!Ses.tr.length) self.sesListesi(); });
    r.sesSec.addEventListener('change', function () {
      if (kaynakNe() === 'bulut') {
        var bv = BULUT_SESLER.filter(function (x) { return x.id === r.sesSec.value; })[0];
        ayar.bulutSes = bv ? bv.id : ''; depo.yaz('bulutSes', ayar.bulutSes);
        if (bv) { ayar.cins = bv.cins; depo.yaz('cins', ayar.cins); }
        Oynatici.hepsi.forEach(function (o) { o.sesListesi(); o.gorunumUygula(); o.bulutHazirla(); });
        return;
      }
      ayar.sesAdi = r.sesSec.value; depo.yaz('ses', ayar.sesAdi);
      var v = Ses.tr.filter(function (x) { return x.voiceURI === ayar.sesAdi; })[0];
      if (v && Ses.cinsi(v) !== '?') { ayar.cins = Ses.cinsi(v); depo.yaz('cins', ayar.cins); }
      Oynatici.hepsi.forEach(function (o) { o.sesListesi(); o.gorunumUygula(); });
    });
    r.tarzlar.addEventListener('click', function (e) { var b = e.target.closest('[data-tarz]'); if (!b) return; ayar.tarz = +b.getAttribute('data-tarz'); depo.yaz('tarz', ayar.tarz); Oynatici.hepsi.forEach(function (o) { o.sesListesi(); }); });
    r.hiz.addEventListener('input', function () { ayar.hiz = +r.hiz.value; depo.yaz('hiz', ayar.hiz); Oynatici.hepsi.forEach(function (o) { o.sesListesi(); }); });
    r.ogrGoster.addEventListener('change', function () { ayar.ogretmen = r.ogrGoster.checked; depo.yaz('ogretmen', ayar.ogretmen); Oynatici.hepsi.forEach(function (o) { o.gorunumUygula(); }); });
    r.gorunumler.addEventListener('click', function (e) { var b = e.target.closest('[data-gor]'); if (b) self.gorunumSec(b.getAttribute('data-gor')); });
    r.fotoDegistir.addEventListener('click', function () { r.fotoSec.click(); });
    r.fotoSec.addEventListener('change', function () { var f = r.fotoSec.files && r.fotoSec.files[0]; r.fotoSec.value = ''; if (f) self.fotoYukle(f); });
    r.kameraAc.addEventListener('change', function () { if (r.kameraAc.checked) self.kameraBaslat(); else self.kameraKapat(); });
    var ikiliYap = function (v) { ayar.ikili = !!v; depo.yaz('ikili', ayar.ikili); Oynatici.hepsi.forEach(function (o) { o.planYap(); o.sesListesi(); o.gorunumUygula(); }); };
    r.bicimler.addEventListener('click', function (e) { var b = e.target.closest('[data-ikili]'); if (b) ikiliYap(b.getAttribute('data-ikili') === '1'); });
    r.ikiliDugme.addEventListener('click', function () { ikiliYap(!ayar.ikili); });
    var ikiliSecim = function (cins, deger) {
      if (kaynakNe() === 'bulut') { if (cins === 'e') { ayar.bulutSesE = deger; depo.yaz('bulutSesE', deger); } else { ayar.bulutSesK = deger; depo.yaz('bulutSesK', deger); } }
      else if (cins === 'e') { ayar.sesAdiE = deger; depo.yaz('sesAdiE', deger); } else { ayar.sesAdiK = deger; depo.yaz('sesAdiK', deger); }
      Oynatici.hepsi.forEach(function (o) { o.sesListesi(); });
    };
    r.sesSecK.addEventListener('change', function () { ikiliSecim('k', r.sesSecK.value); });
    r.sesSecE.addEventListener('change', function () { ikiliSecim('e', r.sesSecE.value); });
    r.studyoAc.addEventListener('click', function () { self.studyoAc(); });
    // Ders PDF'si: bölümlü derste bütün ders ya da şu anki bölüm
    r.pdfDugme.addEventListener('click', function () {
      var B = self.P.bolumler;
      if (!B || B.length < 2) { self.pdfYap(null); return; }
      var ac = r.pdfMenu.hidden; r.pdfMenu.hidden = !ac; r.pdfDugme.setAttribute('aria-expanded', String(ac));
      if (ac) { var b = self.bolumNo(); r.pdfTum.textContent = 'Bütün ders (' + B.length + ' bölüm)'; r.pdfBolum.textContent = 'Bu bölüm: ' + (B[b].ad.length > 34 ? B[b].ad.slice(0, 32) + '…' : B[b].ad); r.pdfDurum.textContent = ''; }
    });
    r.pdfTum.addEventListener('click', function () { self.pdfYap(null); });
    r.pdfBolum.addEventListener('click', function () { self.pdfYap(self.bolumNo()); });
    r.pdfKapat.addEventListener('click', function () { r.pdfMenu.hidden = true; r.pdfDugme.setAttribute('aria-expanded', 'false'); });
    // akıllı tahta görünümü ve yazı büyüklüğü (bu cihazda saklanır)
    var duzenYap = function (d) {
      ayar.duzen = d === 'akilli' ? 'akilli' : 'normal'; depo.yaz('duzen', ayar.duzen);
      Oynatici.hepsi.forEach(function (o) { o.gorunumUygula(); if (ayar.duzen !== 'akilli' && o.opt.mod !== 'pencere') { o.kokEl.classList.remove('ayar-acik'); o.r.ayarDugme.setAttribute('aria-pressed', 'false'); } });
      if (ayar.duzen !== 'akilli' && document.fullscreenElement) { try { document.exitFullscreen().catch(function () {}); } catch (e) {} }
      setTimeout(function () { Oynatici.hepsi.forEach(function (o) { if (o.tasiyor && o.tasiyor()) o.sigdir(); }); }, 60);
    };
    r.akilliDugme.addEventListener('click', function () { duzenYap(ayar.duzen === 'akilli' ? 'normal' : 'akilli'); });
    r.duzenler.addEventListener('click', function (e) { var b = e.target.closest('[data-duzen]'); if (b) duzenYap(b.getAttribute('data-duzen')); });
    r.buyuklukler.addEventListener('click', function (e) { var b = e.target.closest('[data-buyukluk]'); if (!b) return; ayar.buyukluk = +b.getAttribute('data-buyukluk') || 1; depo.yaz('buyukluk', ayar.buyukluk); Oynatici.hepsi.forEach(function (o) { o.gorunumUygula(); }); });
    r.yanKapat.addEventListener('click', function () { self.kokEl.classList.remove('ayar-acik'); r.ayarDugme.setAttribute('aria-pressed', 'false'); try { r.ayarDugme.focus(); } catch (e) {} });
    // öğretmen girişi ve öğrenci sesleri
    r.ogrGirisAc.addEventListener('click', function () { r.ogrGirisForm.hidden = !r.ogrGirisForm.hidden; if (!r.ogrGirisForm.hidden) { try { r.ogrAnahtar.focus(); } catch (e) {} } });
    var girisYap = function () {
      r.ogrGirisNot.hidden = false; r.ogrGirisNot.textContent = 'Denetleniyor…';
      Izin.gir(r.ogrAnahtar.value).then(function (ok) {
        r.ogrAnahtar.value = '';
        r.ogrGirisNot.textContent = ok ? '' : 'Anahtar geçersiz.'; r.ogrGirisNot.hidden = ok;
        if (ok) r.ogrGirisForm.hidden = true;
      });
    };
    r.ogrGirisDugme.addEventListener('click', girisYap);
    r.ogrAnahtar.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); girisYap(); } });
    r.ogretmenCik.addEventListener('click', function () { Izin.cik(); });
    r.ogrKaydet.addEventListener('click', function () { self.ogrKaydet(); });
    r.ogrSesK.addEventListener('change', function () { self.ogrDegisti = true; r.ogrKartNot.textContent = ''; });
    r.ogrSesE.addEventListener('change', function () { self.ogrDegisti = true; r.ogrKartNot.textContent = ''; });
    r.ogrDinleK.addEventListener('click', function () { self.ogrDinle(r.ogrSesK.value); });
    r.ogrDinleE.addEventListener('click', function () { self.ogrDinle(r.ogrSesE.value); });
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
    if (r.kst) {
      r.kstAcDugme.addEventListener('click', function () { self.kstAc(); });
      r.kstKapat.addEventListener('click', function () { self.kstKapat(); });
      r.kstKayit.addEventListener('click', function () { self.kstKayit(); });
      r.kstUstune.addEventListener('click', function () { self.kstUstune(); });
      r.kstDinle.addEventListener('click', function () { self.kstDinle(); });
      r.kstGeri.addEventListener('click', function () { self.kstGit(-1); });
      r.kstIleri.addEventListener('click', function () { self.kstGit(1); });
      r.kstKameraDugme.addEventListener('click', function () { self.kstKameraDegis(); });
      r.kstCizimSil.addEventListener('click', function () { self.kstCizimSil(); });
      r.kstEller.addEventListener('click', function () { self.kstEllerDegis(); });
      r.kstAraclar.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) self.kstAracSec(b); });
      r.belgeDugme.addEventListener('click', function () { r.belgeSec.click(); });
      r.belgeSec.addEventListener('change', function () { var l = r.belgeSec.files ? Array.prototype.slice.call(r.belgeSec.files) : []; r.belgeSec.value = ''; if (l.length) self.belgeSecildi(l); });
      r.belgeListe.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; var a = b.getAttribute('data-belge-ac'), sl = b.getAttribute('data-belge-sil'); if (a) self.belgeAc(a); else if (sl) self.belgeSil(sl, b); });
      if (!window.SesliKalem) r.kstTanit.hidden = true;
    }
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
        else (ayar.duzen === 'akilli' && self.host.requestFullscreen ? self.host : r.cerceve).requestFullscreen().catch(function () {});
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
    if (!ayar.ikili) this.ogretmenCins(ayar.cins);
    r.ogretmen.hidden = !ayar.ogretmen;
    r.ogrGoster.checked = !!ayar.ogretmen;
    this.yuzGorunum();
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
    var ek = kaynakNe(); Array.prototype.forEach.call(r.kaynaklar.querySelectorAll('[data-kaynak]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-kaynak') === ek)); });
    Array.prototype.forEach.call(r.bicimler.querySelectorAll('[data-ikili]'), function (b) { b.setAttribute('aria-pressed', String((b.getAttribute('data-ikili') === '1') === ayar.ikili)); });
    r.ikiliDugme.setAttribute('aria-pressed', String(ayar.ikili));
    var ogt = Izin.ogretmen();
    r.tekCins.hidden = ayar.ikili; r.tekSes.hidden = ayar.ikili || !ogt; r.ikiliSes.hidden = !ayar.ikili || !ogt;
    var akilli = ayar.duzen === 'akilli';
    this.kokEl.classList.toggle('akilli', akilli); r.akilliDugme.setAttribute('aria-pressed', String(akilli));
    Array.prototype.forEach.call(r.duzenler.querySelectorAll('[data-duzen]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-duzen') === ayar.duzen)); });
    Array.prototype.forEach.call(r.buyuklukler.querySelectorAll('[data-buyukluk]'), function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-buyukluk') === +ayar.buyukluk)); });
    r.tahta.style.setProperty('--buyuk', String(+ayar.buyukluk || 1));
    // akıllı tahtada bölüm seçimi düğmelerin yanına geçer (tahtaya daha çok yer kalır)
    var oyn = this.kok.querySelector('.sd-oynatici'), bk = r.bolumKutu;
    if (oyn && bk) {
      if (akilli && bk.parentNode !== oyn) oyn.insertBefore(bk, oyn.querySelector('.sd-ilerleme'));
      else if (!akilli && bk.parentNode === oyn) r.cerceve.parentNode.insertBefore(bk, r.cerceve.nextSibling);
    }
  };
  Oynatici.prototype.ikiliListe = function () {
    var r = this.r, kaynak = kaynakNe();
    if (kaynak === 'bulut') {
      var liste = function (c) { return BULUT_SESLER.filter(function (v) { return v.cins === c; }).map(function (v) { return '<option value="' + v.id + '">' + esc(v.ad + (v.grup === 'dogal' ? '' : ' (sade)')) + '</option>'; }).join(''); };
      r.sesSecK.innerHTML = liste('k'); r.sesSecE.innerHTML = liste('e');
      r.sesSecK.value = konusmaciSesi('A').bulut; r.sesSecE.value = konusmaciSesi('B').bulut;
      r.sesSecK.disabled = r.sesSecE.disabled = false;
      return '';
    }
    Ses.yukle();
    var opt = function (v) { return '<option value="' + esc(v.voiceURI) + '">' + esc(Ses.ad(v)) + (Ses.dogal(v) ? ' · doğal' : '') + '</option>'; };
    var k = Ses.tr.filter(function (v) { return Ses.cinsi(v) !== 'e'; }), e = Ses.tr.filter(function (v) { return Ses.cinsi(v) !== 'k'; });
    r.sesSecK.innerHTML = '<option value="">Otomatik seç</option>' + k.map(opt).join('');
    r.sesSecE.innerHTML = '<option value="">Otomatik seç</option>' + e.map(opt).join('');
    r.sesSecK.value = Ses.tr.some(function (v) { return v.voiceURI === ayar.sesAdiK; }) ? ayar.sesAdiK : '';
    r.sesSecE.value = Ses.tr.some(function (v) { return v.voiceURI === ayar.sesAdiE; }) ? ayar.sesAdiE : '';
    r.sesSecK.disabled = r.sesSecE.disabled = !Ses.tr.length;
    var se = Ses.sec('e', ayar.sesAdiE || ''), sk = Ses.sec('k', ayar.sesAdiK || '');
    return se.not || sk.not || '';
  };
  Oynatici.prototype.sesListesi = function () {
    var r = this.r, kaynak = kaynakNe();
    if (ayar.ikili) {
      var bd0 = r.kaynaklar.querySelector('[data-kaynak="bulut"]'); if (bd0) bd0.hidden = !Bulut.hazir();
      Array.prototype.forEach.call(r.kaynaklar.querySelectorAll('[data-kaynak]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-kaynak') === kaynak)); });
      var not = this.ikiliListe();
      if (kaynak === 'bulut') not = this.bulutUyari || '';
      r.sesNot.textContent = not; r.sesNot.hidden = !not;
      return;
    }
    var bd = r.kaynaklar.querySelector('[data-kaynak="bulut"]'); if (bd) bd.hidden = !Bulut.hazir();
    Array.prototype.forEach.call(r.kaynaklar.querySelectorAll('[data-kaynak]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-kaynak') === kaynak)); });
    if (kaynak === 'bulut') {
      var sv = Bulut.ses(), bop = function (v) { return '<option value="' + v.id + '">' + esc(v.ad) + '</option>'; };
      r.sesEtiket.textContent = 'Doğal sesler (Google)';
      r.sesSec.innerHTML = '<optgroup label="Kadın sesleri">' + BULUT_SESLER.filter(function (v) { return v.cins === 'k' && v.grup === 'dogal'; }).map(bop).join('') + '</optgroup>' +
        '<optgroup label="Erkek sesleri">' + BULUT_SESLER.filter(function (v) { return v.cins === 'e' && v.grup === 'dogal'; }).map(bop).join('') + '</optgroup>' +
        '<optgroup label="Sade sesler">' + BULUT_SESLER.filter(function (v) { return v.grup !== 'dogal'; }).map(function (v) { return '<option value="' + v.id + '">' + esc(v.ad + (v.cins === 'k' ? ' · kadın' : ' · erkek')) + '</option>'; }).join('') + '</optgroup>';
      r.sesSec.value = sv.id; r.sesSec.disabled = false;
      r.sesNot.hidden = !this.bulutUyari; r.sesNot.textContent = this.bulutUyari || '';
      return;
    }
    r.sesEtiket.textContent = 'Cihazdaki Türkçe sesler';
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
  };
  // Öğretmen modunda bütün sesler ve öğrenci sesleri kartı; öğrencide yalnız kadın/erkek seçimi
  Oynatici.prototype.izinUygula = function () {
    var r = this.r, og = Izin.ogretmen(), yv = Yayin.var();
    this.kokEl.classList.toggle('ogretmen', og);
    r.ogrKart.hidden = !og; r.ogrGiris.hidden = og;
    var cihazB = r.kaynaklar.querySelector('[data-kaynak="cihaz"]'); if (cihazB) cihazB.hidden = !og;
    var kayitB = r.kaynaklar.querySelector('[data-kaynak="kayit"]'); if (kayitB) kayitB.hidden = !og && !yv;
    var kaynakAlan = r.kaynaklar.parentNode; if (kaynakAlan && kaynakAlan.classList.contains('alan')) kaynakAlan.hidden = !og && !yv;
    if (r.studyoAc) r.studyoAc.hidden = !og || this.opt.studyo === false;
    ['gorunumAlan', 'indirKart', 'indirDugme'].forEach(function (k) { if (r[k]) r[k].hidden = !og; }); // video ve ses üretimi öğretmen araçlarıdır
    r.ogrSesNot.hidden = og;
    if (!og) r.ogrSesNot.textContent = ayar.ikili ? 'Elif Hoca ve Kerem Hoca öğretmeninin seçtiği seslerle anlatır.' : 'Kadın ya da erkek sesi seçebilirsin; sesler öğretmeninin seçtiği doğal seslerdir.';
    if (og) this.ogrKartDoldur();
    else if (Izin.girisSonuc === 'yanlis') { r.ogrGirisForm.hidden = false; r.ogrGirisNot.hidden = false; r.ogrGirisNot.textContent = 'Öğretmen bağlantısındaki anahtar geçersiz.'; }
    var ogt = og; r.tekSes.hidden = ayar.ikili || !ogt; r.ikiliSes.hidden = !ayar.ikili || !ogt;
  };
  Oynatici.prototype.ogrKartDoldur = function () {
    var r = this.r, op = function (c) { return BULUT_SESLER.filter(function (v) { return v.cins === c; }).map(function (v) { return '<option value="' + v.id + '">' + esc(v.ad + (v.grup === 'dogal' ? '' : ' (sade)')) + '</option>'; }).join(''); };
    if (!r.ogrSesK.options.length) { r.ogrSesK.innerHTML = op('k'); r.ogrSesE.innerHTML = op('e'); }
    if (!this.ogrDegisti) { r.ogrSesK.value = Izin.ogrenci.k; r.ogrSesE.value = Izin.ogrenci.e; }
  };
  Oynatici.prototype.ogrKaydet = function () {
    var self = this, r = this.r, o = { k: r.ogrSesK.value, e: r.ogrSesE.value };
    r.ogrKaydet.disabled = true; r.ogrKartNot.textContent = 'Kaydediliyor…';
    Izin.kaydet(o).then(function (s) {
      r.ogrKaydet.disabled = false;
      if (s === 'tamam') { self.ogrDegisti = false; r.ogrKartNot.textContent = 'Kaydedildi. Öğrenciler bundan sonra bu iki sesi duyar.'; Oynatici.hepsi.forEach(function (x) { x.ogrKartDoldur(); x.sesListesi(); }); }
      else if (s === 'eski') r.ogrKartNot.textContent = 'Ses servisi eski sürümde. Öğrenci seslerini kaydetmek için ses servisini bir kez güncellemek gerekiyor (sesli/README.md).';
      else if (s === 'red') r.ogrKartNot.textContent = 'Ses servisi öğretmen anahtarını kabul etmedi.';
      else r.ogrKartNot.textContent = 'Ses servisine ulaşılamadı; biraz sonra yeniden dene.';
    });
  };
  Oynatici.prototype.ogrDinle = function (id) {
    var r = this.r;
    if (!Bulut.hazir()) { r.ogrKartNot.textContent = 'Doğal seslere şu an ulaşılamıyor.'; return; }
    Ses.kilidiAc();
    Bulut.al('Merhaba! Bugün kimya dersinde birlikte çalışacağız.', id).then(function (k) {
      var a = Ses.ortak(); a.onended = a.onerror = a.onloadedmetadata = null; a.loop = false; a.src = k.url;
      try { a.defaultPlaybackRate = 1; a.playbackRate = 1; } catch (e) {}
      var p = a.play(); if (p && p.catch) p.catch(function () {});
    }).catch(function () { r.ogrKartNot.textContent = 'Ses örneği alınamadı.'; });
  };
  // Bulut sesinde ilk cümle önceden istenir; başlatınca beklemeden çalar
  Oynatici.prototype.bulutHazirla = function () {
    var a = this.P.adimlar && this.P.adimlar[Math.max(0, this.P.i)];
    if (a && kaynakNe() === 'bulut') Bulut.al(a.s).catch(function () {});
  };
  Oynatici.prototype.bulutUyar = function () {
    this.bulutUyari = Bulut.mola && Date.now() < Bulut.mola ? 'Doğal seslerin bugünkü kotası doldu ya da servis çok yoğun; cümleler bir süre cihaz sesiyle okunacak.' : 'Doğal seslere şu an ulaşılamadı; cümleler cihaz sesiyle okunuyor.';
    this.r.sesNot.textContent = this.bulutUyari; this.r.sesNot.hidden = false;
  };

  /* ---- öğretmen ---- */
  Oynatici.prototype.ogretmenCins = function (c) { var o = this.r.ogretmen; o.classList.toggle('kadin', c === 'k'); o.classList.toggle('erkek', c !== 'k'); };
  Oynatici.prototype.konusuyor = function (v) {
    var o = this.r.ogretmen; clearInterval(this.agizSaat); o.classList.remove('agiz'); o.classList.toggle('konus', !!v);
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
    var enAz = this.grupKilit ? 0.36 : 0.5, adim = this.grupKilit ? 0.04 : 0.08;
    while (this.tasiyor() && olcek > enAz) { olcek = Math.round((olcek - adim) * 100) / 100; y.style.setProperty('--sig', String(olcek)); }
  };
  // Henüz yazılmamış bloklar tahtaya (üstteki yazılarla birlikte) sığıyor mu? Görünmez eklenip ölçülür;
  // sığana kadar yazı küçültülür (en çok enAz'a kadar). Sığarsa ölçek kalır.
  Oynatici.prototype.olcekKoy = function (bloklar, enAz) {
    var y = this.r.yazi, eski = y.style.getPropertyValue('--sig'), o = 1;
    bloklar.forEach(function (el) { el.style.visibility = 'hidden'; y.appendChild(el); });
    y.style.setProperty('--sig', '1');
    while (this.tasiyor() && o > enAz) { o = Math.round((o - 0.04) * 100) / 100; y.style.setProperty('--sig', String(o)); }
    var ok = !this.tasiyor();
    bloklar.forEach(function (el) { if (el.parentNode) el.parentNode.removeChild(el); });
    if (!ok) { if (eski) y.style.setProperty('--sig', eski); else y.style.removeProperty('--sig'); }
    return ok;
  };
  // Grup başı: soru tek tahtada; çözüm tek tahtada (sığmazsa tahta silinir, soru yeniden yazılır, gerekirse yalnız çözüm)
  Oynatici.prototype.grupHazirla = function (i, anlik) {
    var self = this, A = this.P.adimlar, a = A[i], g = a.grup, tur = a.grupTur, parca = [], soru = [], j;
    for (j = i; j < A.length && A[j].grup === g && A[j].grupTur === tur; j++) parca.push(A[j]);
    if (tur === 'c') for (j = i - 1; j >= 0 && A[j].grup === g && A[j].grupTur === 's'; j--) soru.unshift(A[j]);
    var yap = function (l) { var els = []; l.forEach(function (s) { (s.w || s.h || []).forEach(function (b) { els.push(self.blok(b, s.oto)); }); }); return els; };
    if (!this.r.yazi.querySelector('.blok')) { this.olcekKoy(yap(parca), 0.36); return Promise.resolve(); }
    if (this.olcekKoy(yap(parca), 0.66)) return Promise.resolve(); // yazı çok küçülmeden soru ile çözüm birlikte
    return this.sil(anlik).then(function () {
      if (soru.length) { // soru yeniden (bir anda) yazılır, çözüm altına sığıyorsa öyle kalır
        var sEl = yap(soru);
        sEl.forEach(function (el) { self.r.yazi.appendChild(el); });
        sEl.forEach(function (el) {
          var kel = el.querySelectorAll('.w'); self.goster(kel, kel.length, true);
          Array.prototype.forEach.call(el.querySelectorAll('svg[data-grafik]'), function (svg) { grafikHazirla(svg); grafikTamamla(svg, 1e9); });
        });
        if (self.olcekKoy(yap(parca), 0.66)) return;
        self.temizle();
      }
      self.olcekKoy(yap(parca), 0.36);
    });
  };
  Oynatici.prototype.sil = function (anlik) {
    var self = this, r = this.r;
    if (anlik || AZ || !r.yazi.querySelector('.blok')) { this.temizle(); return Promise.resolve(); }
    r.silgi.classList.remove('calis'); void r.silgi.offsetWidth; r.silgi.classList.add('calis');
    r.yazi.classList.add('siliniyor');
    if (r.tahta.classList.contains('koyu')) { var iz = +(r.iz.dataset.d || 0); iz = Math.min(0.16, iz + 0.04); r.iz.dataset.d = iz; r.iz.style.opacity = iz; r.iz.style.transform = 'rotate(' + (Math.random() * 6 - 3) + 'deg)'; }
    return sleep(700).then(function () { self.temizle(); r.silgi.classList.remove('calis'); });
  };
  function sayfaOlcu(g, y) { // tahtadaki boyu: tahta eninin yüzdesi olarak, en çok 90 × 46
    var a = Math.max(0.2, Math.min(5, g / y)), H = Math.min(46, 90 / a);
    return { g: Math.round(H * a * 100) / 100, y: Math.round(H * 100) / 100 };
  }
  Oynatici.prototype.blok = function (b, oto) {
    var el = document.createElement('div');
    el.className = 'blok' + (b.c ? ' ' + String(b.c).split(/\s+/).filter(Boolean).map(function (x) { return 'b-' + x; }).join(' ') : '');
    if (b.gorsel) { // PDF sayfası ya da resim: ölçüsü baştan bellidir (yüklenmeden de yer tutar)
      var im = document.createElement('img'), so = sayfaOlcu(b.gorsel.g, b.gorsel.y);
      im.className = 'w w-blok'; im.alt = ''; im.decoding = 'async'; im.src = b.gorsel.url;
      im.style.width = so.g + 'cqw'; im.style.height = so.y + 'cqw';
      el.appendChild(im); return el;
    }
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
    if (els.length && this.tasiyor() && y.querySelectorAll('.blok').length > els.length && !this.grupKilit) {
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
  Oynatici.prototype.bolumNo = function () { var B = this.P.bolumler || [], i = Math.max(0, this.P.i), s = 0; for (var k = 0; k < B.length; k++) if (B[k].adim <= i) s = k; return s; };
  Oynatici.prototype.pdfYap = function (bolum) {
    var self = this, r = this.r, P = this.P;
    if (this.pdfCalisiyor) return;
    var ders = { baslik: (P.ders && P.ders.baslik) || (r.baslik ? r.baslik.textContent : '') || 'Ders notu', adimlar: P.adimlar || [], bolumler: P.bolumler };
    if (!ders.adimlar.length) return;
    this.pdfCalisiyor = true;
    var durum = function (t) { if (r.pdfMenu.hidden) { r.pdfMenu.hidden = false; r.pdfDugme.setAttribute('aria-expanded', 'true'); r.pdfTum.hidden = r.pdfBolum.hidden = !(P.bolumler && P.bolumler.length > 1); } r.pdfDurum.textContent = t; };
    [r.pdfDugme, r.pdfTum, r.pdfBolum].forEach(function (b) { b.disabled = true; });
    durum('PDF hazırlanıyor…');
    dersPdf(ders, { bolum: bolum }).then(function () { durum('İndirildi. Dosyalar ya da İndirilenler klasörüne bak.'); }, function () { durum('PDF hazırlanamadı. İnternet bağlantısını denetleyip yeniden dene.'); })
      .then(function () { self.pdfCalisiyor = false; [r.pdfDugme, r.pdfTum, r.pdfBolum].forEach(function (b) { b.disabled = false; }); });
  };
  Oynatici.prototype.kalemKoy = function (x, y) { // kalemin ucu ekrandaki (x, y) noktasına
    var t = this.r.tahta.getBoundingClientRect(), kh = this.r.kalem.getBoundingClientRect().height || 20;
    this.r.kalem.style.transform = 'translate(' + (x - t.left - 2) + 'px,' + (y - t.top - kh * 0.9) + 'px)';
  };
  // Grafik adımı: tahtadaki grafiği bul, önceki aşamaları tamamla
  Oynatici.prototype.grafikBul = function (a, els) {
    if (!a.grafik) return null;
    var svg = null;
    (els || []).forEach(function (el) { if (!svg) svg = el.querySelector('svg[data-grafik]'); });
    if (!svg) svg = this.r.yazi.querySelector('svg[data-grafik="' + a.grafik.id + '"]');
    if (!svg) return null;
    grafikHazirla(svg); grafikTamamla(svg, a.grafik.asama - 1);
    return { svg: svg, asama: a.grafik.asama };
  };
  // Cümlede tahtadaki grafiğin bir eğrisi (adı, formülü ya da rengi) ya da bir anı (t₁ gibi) geçiyorsa kalem orayı gösterir
  Oynatici.prototype.grafikHedef = function (a) {
    var svgler = this.r.yazi.querySelectorAll('svg[data-grafik]');
    if (!svgler.length || AZ) return null;
    var svg = svgler[svgler.length - 1], tok = gAnahtar(adimMetni(a));
    if (!tok.length) return null;
    var esle = function (el, ad) { return el.getAttribute(ad).split(' ').some(function (x) { return x.length >= 2 && tok.indexOf(x) >= 0; }); };
    var ogeler = Array.prototype.filter.call(svg.querySelectorAll('[data-gk]'), function (el) { return esle(el, 'data-gk') && getComputedStyle(el).opacity !== '0'; });
    var isaret = null;
    if (!ogeler.length) Array.prototype.forEach.call(svg.querySelectorAll('[data-gx]'), function (el) { if (!isaret && esle(el, 'data-gx')) isaret = el; });
    return ogeler.length || isaret ? { svg: svg, ogeler: ogeler.slice(0, 3), isaret: isaret } : null;
  };
  Oynatici.prototype.grafikGoster = function (h, p) {
    if (!h.kuruldu) {
      h.kuruldu = true;
      h.ogeler.forEach(function (el) { el.classList.add('ga-vurgu'); });
      h.liste = h.ogeler.map(function (el) { return { el: el, t: 'c', L: gUzunluk(el) }; }).filter(function (o) { return o.L > 0; });
      if (h.isaret) {
        try {
          var b = h.isaret.getBBox(), c = document.createElementNS(G_NS, 'ellipse');
          c.setAttribute('cx', b.x + b.width / 2); c.setAttribute('cy', b.y + b.height / 2); c.setAttribute('rx', b.width / 2 + 7); c.setAttribute('ry', b.height / 2 + 5);
          c.setAttribute('class', 'ga-halka'); if (h.isaret.getAttribute('transform')) c.setAttribute('transform', h.isaret.getAttribute('transform'));
          h.isaret.parentNode.appendChild(c); h.halka = c;
        } catch (e) {}
      }
    }
    var q = p / 0.92;
    if (q <= 0) return null;
    if (q > 1) q = 1;
    if (h.liste.length) {
      var top = 0, gecen = 0, uc = null; h.liste.forEach(function (o) { top += o.L; });
      h.liste.forEach(function (o) { var u = (q * top - gecen) / o.L; gecen += o.L; if (!uc && u >= 0 && u <= 1) uc = grafikUc(o, u); });
      return uc;
    }
    return h.isaret ? grafikUc({ el: h.isaret, t: 'f' }, 1) : null;
  };
  Oynatici.prototype.grafikGosterBitir = function (h) {
    h.ogeler.forEach(function (el) { el.classList.remove('ga-vurgu'); });
    if (h.halka && h.halka.parentNode) h.halka.parentNode.removeChild(h.halka);
  };
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
  Oynatici.prototype.altyaziYaz = function (metin, kim) {
    var html = kim ? '<b class="kim kim-' + kim + '">' + esc(KONUSMACI[kim].ad) + '</b> ' : '', re = /\S+/g, m; this.altKelimeler = [];
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
      r.kaynakNot.textContent = kaynakNe() === 'bulut' ? 'Cümleler Google’ın doğal Türkçe sesleriyle okunur. Bir cümle ilk kez seslendirilirken kısa bir bekleme olabilir.' : kaynakNe() === 'kayit'
        ? (n ? 'Bu derste ' + adimlar.length + ' adımın ' + n + '’i öğretmen kaydıyla oynar; kalanlar cihaz sesiyle.' : 'Bu ders için henüz öğretmen kaydı yok; “Kendi sesinle kaydet” ile ekleyebilirsin.')
        : (n ? 'Bu dersin ' + n + ' adımı için öğretmen kaydı var.' : '');
      if (!self.indiriliyor) self.indirCiz();
    });
  };

  /* ---- oynatma ---- */
  Oynatici.prototype.kur = function (n) {
    var self = this, zincir = Promise.resolve(), A = this.P.adimlar, bas = 0;
    n = Math.min(n, A.length);
    for (var j = n - 1; j > 0; j--) if (A[j].sil) { bas = j; break; }
    this.temizle(); this.sahneGizle();
    if (bas > 0 && !('sahne' in A[bas])) for (var sj = bas - 1; sj >= 0; sj--) if ('sahne' in A[sj]) { this.sahneGoster(A[sj].sahne); break; }
    var kj = this.kurJeton = (this.kurJeton || 0) + 1;
    for (var k = bas; k < n; k++) (function (a, k) {
      zincir = zincir.then(function () {
        if (kj !== self.kurJeton) return;
        var onc = A[k - 1];
        if (a.sil || (k > bas && onc && onc.grup && onc.grup !== a.grup)) self.temizle();
        if ('sahne' in a) self.sahneGoster(a.sahne);
        return (a.grupBas ? self.grupHazirla(k, true) : Promise.resolve()).then(function () {
          if (kj !== self.kurJeton) return [];
          self.grupKilit = !!a.grup;
          return self.ekle(a.w || a.h || [], a.oto, true);
        }).then(function (els) {
          self.grupKilit = false;
          if (kj !== self.kurJeton) return;
          var kel = []; els.forEach(function (el) { kel.push.apply(kel, el.querySelectorAll('.w')); });
          self.goster(kel, kel.length, true);
          var gb = self.grafikBul(a, els); if (gb) grafikTamamla(gb.svg, gb.asama);
          if (a.yap) self.sahneYap(a.yap, true);
          if (a.ciz) self.isaretle(a.ciz, 'ciz', true);
          if (a.halka) self.isaretle([a.halka], 'halka', true);
        });
      });
    })(this.P.adimlar[k], k);
    return zincir;
  };
  Oynatici.prototype.seslendir = function (a, els, jeton, kayit, sesi, kim, yuz) {
    var self = this, kel = [];
    if (yuz && yuz.tur === 'video') this.yuzVideoOynat(yuz, jeton, kayit.url); else if (yuz) this.yuzOynat(yuz, jeton, kayit.url); else this.yuzBekle();
    els.forEach(function (el) { kel.push.apply(kel, el.querySelectorAll('.w')); });
    var gs = this.grafikSu; this.grafikSu = null;
    if (gs && AZ) { grafikTamamla(gs.svg, gs.asama); gs = null; }
    var gn = !gs && !a.grafik ? this.grafikHedef(a) : null;
    this.r.kalem.classList.toggle('cizim', !!(gs || gn));
    var metin = a.s, uz = Math.max(1, metin.length);
    this.altyaziYaz(metin, kim);
    this.konusuyor(true); if (kel.length) { this.yaziyor(true); this.kalemGoster(true); }
    var sinirVar = false, ci = 0, cl = 0, t0 = performance.now(), sure = Ses.sure(metin, TARZLAR[ayar.tarz].hiz * ayar.hiz), raf = null, isaretlendi = false;
    var tik = function () {
      if (jeton !== self.P.jeton) return;
      var p = Ses.oranFn ? Ses.oranFn() : sinirVar ? Math.min(1, (ci + cl) / uz) : Math.min(0.97, (performance.now() - t0) / sure);
      var yh = gn ? 2 : 1.18, n = Math.ceil(Math.min(1, p * yh) * kel.length); // eğri gösterilecekse yazı cümlenin ilk yarısında biter
      self.goster(kel, n, false);
      if (gs) { // grafik çiziliyor: kalem çizginin ucunda
        var gp = Math.min(1, p * 1.12), uc = grafikIlerlet(gs.svg, gs.asama, gp);
        if (!uc && gp < 1) uc = grafikBasUc(gs.svg, gs.asama); // konuşma başlamadan kalem ilk çizginin başında bekler
        if (uc) { self.kalemKoy(uc.x, uc.y); self.kalemGoster(true); self.yaziyor(true); } else { self.kalemGoster(false); self.yaziyor(false); }
      } else if (gn && n >= kel.length) { // cümle bitti: kalem anlatılan eğrinin üzerinden geçer
        var gu = self.grafikGoster(gn, (p - 1 / yh) / (1 - 1 / yh));
        if (gu) { self.kalemKoy(gu.x, gu.y); self.kalemGoster(true); self.gosteriyor(true); } else { self.kalemGoster(false); self.gosteriyor(false); }
        self.yaziyor(false);
      } else if (n >= kel.length) { self.yaziyor(false); self.kalemGoster(false); }
      self.altyaziVurgula(sinirVar ? ci : p * uz);
      if (!isaretlendi && p > 0.35) { isaretlendi = true; if (a.ciz) self.isaretle(a.ciz, 'ciz'); if (a.halka) self.isaretle([a.halka], 'halka'); }
      raf = requestAnimationFrame(tik);
    };
    raf = requestAnimationFrame(tik);
    return Ses.konus(metin, { basla: function (s) { t0 = performance.now(); sure = s; }, sinir: function (i, l) { sinirVar = true; ci = i; cl = l || 1; } }, kayit, sesi).then(function (neden) {
      cancelAnimationFrame(raf);
      if (gs) grafikTamamla(gs.svg, gs.asama);
      if (gn) { self.grafikGosterBitir(gn); self.gosteriyor(false); }
      self.r.kalem.classList.remove('cizim');
      self.konusuyor(false); self.yaziyor(false); self.kalemGoster(false); self.yuzDur();
      if (kayit && kayit.yerel) setTimeout(function () { URL.revokeObjectURL(kayit.url); }, 1000);
      if (jeton !== self.P.jeton) return neden;
      self.goster(kel, kel.length, false); self.altyaziVurgula(-1);
      if (!isaretlendi) { if (a.ciz) self.isaretle(a.ciz, 'ciz'); if (a.halka) self.isaretle([a.halka], 'halka'); }
      return neden;
    });
  };
  Oynatici.prototype.adimCalistir = function (a, jeton, i) {
    var self = this, pl = this.P.plan && this.P.plan[i], kim = pl ? pl.kim : null, sesi = konusmaciSesi(kim);
    var kaynak = kaynakNe(), bulutVar = kaynak !== 'cihaz' && Bulut.hazir();
    var bulutAl = function (m) { return Bulut.al(m, sesi.bulut); };
    var kayitSoz;
    if (kaynak === 'kayit') kayitSoz = this.kayitBul(a.s).then(function (k) { return k || (Bulut.hazir() ? bulutAl(a.s).catch(function () { return null; }) : null); });
    else if (kaynak === 'bulut') kayitSoz = bulutAl(a.s).catch(function () { self.bulutUyar(); return null; });
    else kayitSoz = Promise.resolve(null);
    var yuzSoz = kaynak === 'kayit' && this.yuzModu() === 'video' ? yuzOynatimAl(a.s) : Promise.resolve(null);
    var onSoz = pl && pl.on ? (bulutVar ? bulutAl(pl.on).catch(function () { return null; }) : Promise.resolve(null)) : null;
    if (kim) { this.ogretmenCins(sesi.cins); this.konusmaciGoster(kim); }
    var onc = i > 0 ? this.P.adimlar[i - 1] : null, grupBitti = !!(onc && onc.grup && onc.grup !== a.grup);
    var hazir = (a.sil || grupBitti ? this.sil(false) : Promise.resolve()).then(function () { if (a.grupBas && jeton === self.P.jeton) return self.grupHazirla(i, false); });
    var once = onSoz ? Promise.all([hazir, onSoz]).then(function (r) { if (jeton !== self.P.jeton) return; return self.araSoz(pl.on, r[1], sesi, kim, jeton); }) : hazir;
    return Promise.all([once, kayitSoz, yuzSoz]).then(function (sonuc) {
      var yuz = sonuc[1] && sonuc[1].url && !sonuc[1].bulut ? sonuc[2] : null;
      if (!yuz) yuzSal(sonuc[2]);
      if (jeton !== self.P.jeton) { yuzSal(yuz); return; }
      if ('sahne' in a) self.sahneGoster(a.sahne);
      self.grupKilit = !!a.grup;
      return self.ekle(a.w || a.h || [], a.oto, false).then(function (els) {
        if (jeton !== self.P.jeton) return;
        self.grafikSu = self.grafikBul(a, els);
        self.grupKilit = false;
        var eylem = a.yap ? self.sahneYap(a.yap, false) : Promise.resolve();
        return Promise.all([self.seslendir(a, els, jeton, sonuc[1], sesi, kim, yuz), eylem]);
      });
    });
  };
  // Tahtaya yazmadan kısa bir söz (karşılıklı anlatımdaki geçişler)
  Oynatici.prototype.araSoz = function (metin, kayit, sesi, kim, jeton) {
    var self = this;
    this.altyaziYaz(metin, kim); this.konusuyor(true);
    return Ses.konus(metin, {}, kayit, sesi).then(function () { self.konusuyor(false); if (jeton === self.P.jeton) return sleep(160); });
  };
  Oynatici.prototype.konusmaciGoster = function (kim) {
    var e = this.r.ogrAd; if (!e) return;
    e.hidden = !kim; if (kim) { e.textContent = KONUSMACI[kim].ad; e.className = 'sd-ogr-ad kim-' + kim; }
  };
  Oynatici.prototype.planYap = function () {
    this.P.plan = ayar.ikili && this.P.adimlar ? karsilikliPlan(this.P.adimlar) : null;
    if (!ayar.ikili) { this.konusmaciGoster(null); this.ogretmenCins(ayar.cins); }
  };
  Oynatici.prototype.calis = function (bas) {
    var self = this;
    Oynatici.hepsi.forEach(function (o) { if (o !== self && o.P.calisiyor) o.durdur(); });
    var jeton = ++this.P.jeton;
    Ses.sus(); Ses.kilidiAc();
    Ses.surekli = kaynakNe() !== 'cihaz'; if (Ses.surekli) Ses.isit();
    this.P.calisiyor = true; this.arayuz();
    this.r.perde.hidden = true;
    return sleep(60).then(function () { return self.kur(bas); }).then(function () {
      var i = bas;
      var sonraki = function () {
        if (jeton !== self.P.jeton) return;
        if (i >= self.P.adimlar.length) { Ses.surekli = false; Ses.isitDur(); self.P.calisiyor = false; self.P.i = self.P.adimlar.length; self.arayuz(); self.bitti(); return; }
        self.P.i = i; self.arayuz(); self.bolumIzle();
        var sonA = self.P.adimlar[i + 1];
        if (sonA && kaynakNe() === 'bulut') { var sp = self.P.plan && self.P.plan[i + 1], ss = konusmaciSesi(sp && sp.kim); Bulut.al(sonA.s, ss.bulut).then(function (k) { Ses.dolgulu(k.url); }).catch(function () {}); if (sp && sp.on) Bulut.al(sp.on, ss.bulut).catch(function () {}); }
        return self.adimCalistir(self.P.adimlar[i], jeton, i).then(function () {
          if (jeton !== self.P.jeton) return;
          i++;
          var ara = Math.max(80, TARZLAR[ayar.tarz].ara - (Ses.sonDolgu || 0) * 1000); Ses.sonDolgu = 0; // baştaki sessizlik aradan düşülür
          return sleep(ara).then(sonraki);
        });
      };
      return sonraki();
    });
  };
  Oynatici.prototype.durdur = function () {
    this.P.jeton++; Ses.surekli = false; Ses.sus(); this.P.calisiyor = false;
    this.konusuyor(false); this.yaziyor(false); this.kalemGoster(false); this.yuzDur(); this.arayuz();
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
  Oynatici.prototype.bolumIzle = function () {
    var B = this.P.bolumler, i = this.P.i, sec = 0;
    if (!B || B.length < 2) return;
    for (var k = 0; k < B.length; k++) if (B[k].adim <= i) sec = k;
    if (this.r.bolumSec.value !== String(sec)) this.r.bolumSec.value = String(sec);
  };
  Oynatici.prototype.yukle = function (id, opt) {
    if (this.yuzSifirla) this.yuzSifirla();
    opt = opt || {};
    this.durdur();
    if (!this.indiriliyor) this.indirSifirla();
    var ders = typeof id === 'object' ? id : null;
    if (ders) id = ders.id || 'ders';
    this.P.id = id;
    if (id === 'metin' && !ders) {
      if (!this.adimListeleri.metin) this.adimListeleri.metin = metindenDers(this.r.metin ? this.r.metin.value : ORNEK_METIN).adimlar;
    } else if (ders) this.adimListeleri[id] = ders.adimlar.slice();
    else if (!this.adimListeleri[id]) this.adimListeleri[id] = (this.dersler[id] || DERSLER.konu).adimlar.slice();
    this.P.ders = ders || this.dersler[id] || null;
    this.P.adimlar = this.adimListeleri[id]; this.P.i = -1; this.planYap();
    if (this.r.baslik) this.r.baslik.textContent = (ders && ders.baslik) || 'Sesli anlatım';
    var self = this, B = this.P.bolumler = this.P.ders && this.P.ders.bolumler ? this.P.ders.bolumler.map(function (b) { return { ad: b.ad, adim: b.adim, el: b.el }; }) : null, bas = 0;
    this.r.bolumKutu.hidden = !(B && B.length > 1);
    this.r.bolumSec.innerHTML = B && B.length > 1 ? B.map(function (b, k) { return '<option value="' + k + '">' + esc((k + 1) + '. ' + b.ad) + '</option>'; }).join('') : '';
    if (B && opt.bolum != null && B[opt.bolum]) bas = B[opt.bolum].adim;
    if (opt.adim != null) bas = Math.max(0, Math.min(this.P.adimlar.length - 1, opt.adim));
    if (bas > 0) this.P.i = bas;
    this.kur(bas + 1).then(function () { self.arayuz(); self.bolumIzle(); });
    this.r.perdeYazi.textContent = (ders && ders.dugme) || (id === 'metin' ? 'Metni anlat' : /^(km-|d|ry-)/.test(id) || id === 'soru' ? 'Çözümü başlat' : 'Dersi başlat');
    this.r.perdeAlt.textContent = 'Ses açıkken başlat. Tahtaya yazılanlar sesle birlikte ilerler.';
    this.r.perde.hidden = false;
    this.altyaziBos('Altyazı burada görünür: konuşulan kelime renklenir.');
    Array.prototype.forEach.call(this.kok.querySelectorAll('.sd-sekmeler [data-ders]'), function (b) { b.setAttribute('aria-selected', String(b.getAttribute('data-ders') === id)); });
    if (this.r.metinKart) this.r.metinKart.hidden = id !== 'metin';
    this.ozelListeCiz(); this.arayuz(); this.kayitDurumu(); this.bulutHazirla();
    return this;
  };

  /* ---- cümle ya da metin ekle ---- */
  Oynatici.prototype.metinSay = function (ad) {
    var alan = this.r[ad], hedef = this.r[ad + 'Say'];
    if (alan && hedef) hedef.textContent = metinOzeti(alan.value);
  };
  Oynatici.prototype.ozelListeCiz = function () {
    var gruplar = [], bul = {};
    this.P.adimlar.forEach(function (a) {
      if (a.ozel == null) return;
      var k = String(a.ozel);
      if (!bul[k]) { bul[k] = { k: k, n: 0, ilk: a.w[0].t }; gruplar.push(bul[k]); }
      bul[k].n++;
    });
    this.r.ozelListe.innerHTML = gruplar.map(function (g) {
      var yazi = g.n > 1 ? (g.ilk.length > 70 ? g.ilk.slice(0, 70) + '…' : g.ilk) + ' · ' + g.n + ' adım' : g.ilk;
      return '<li><span>' + esc(yazi) + '</span><button type="button" data-sil="' + esc(g.k) + '" aria-label="' + (g.n > 1 ? 'Metni kaldır' : 'Cümleyi kaldır') + '">×</button></li>';
    }).join('');
  };
  Oynatici.prototype.cumleEkle = function () {
    var inp = this.r.cumle, t = inp.value.trim(); if (!t) { inp.focus(); return; }
    var parcalar = metniBol(t); if (!parcalar.length) return;
    var uzun = parcalar.length > 2;
    var adimlar = metinAdimlari(parcalar, { grup: 'o' + (++ozelSayac), sinif: function () { return uzun ? '' : 'ozel'; } });
    if (uzun) { adimlar[0].sil = 1; adimlar[0].sahne = null; } // uzun metin temiz tahtada başlar
    var yer = this.P.i >= 0 && this.P.i < this.P.adimlar.length ? this.P.i + 1 : this.P.adimlar.length;
    Array.prototype.splice.apply(this.P.adimlar, [yer, 0].concat(adimlar));
    (this.P.bolumler || []).forEach(function (b) { if (b.adim >= yer) b.adim += adimlar.length; });
    this.planYap();
    inp.value = ''; this.metinSay('cumle'); this.ozelListeCiz(); this.arayuz();
    if (!this.P.calisiyor) this.calis(yer);
  };
  Oynatici.prototype.cumleSil = function (grup) {
    var self = this, A = this.P.adimlar, sil = [];
    A.forEach(function (a, i) { if (a.ozel != null && String(a.ozel) === String(grup)) sil.push(i); });
    if (!sil.length) return;
    if (this.P.calisiyor) this.durdur();
    for (var k = sil.length - 1; k >= 0; k--) {
      var idx = sil[k];
      A.splice(idx, 1);
      (this.P.bolumler || []).forEach(function (b) { if (b.adim > idx) b.adim--; });
      if (this.P.i > idx) this.P.i--;
    }
    if (this.P.i >= A.length) this.P.i = A.length - 1;
    this.planYap(); this.ozelListeCiz();
    this.kur(Math.max(0, this.P.i)).then(function () { self.arayuz(); });
  };

  /* ---- köşedeki öğretmen: çizgi figür, fotoğraf ya da kamerayla kaydedilmiş yüz ---- */
  Oynatici.prototype.yuzModu = function () { return !ayar.ogretmen || ayar.ikili ? 'figur' : (ayar.gorunum || 'figur'); };
  Oynatici.prototype.yuzGorunum = function () {
    var self = this, r = this.r;
    if (!r.gorunumler) return;
    Array.prototype.forEach.call(r.gorunumler.querySelectorAll('[data-gor]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-gor') === ayar.gorunum)); });
    r.gorunumAlan.hidden = !ayar.ogretmen || !Izin.ogretmen();
    Foto.yukle().then(function () {
      if (Foto.url && r.yuzFoto.getAttribute('src') !== Foto.url) r.yuzFoto.setAttribute('src', Foto.url);
      r.fotoDegistir.hidden = !Foto.url || ayar.gorunum === 'figur';
      self.yuzKose(self.yuzSu ? (self.yuzSu.tur === 'video' ? 'video' : 'tuval') : (self.yuzCizildi && !Foto.url ? (self.yuzSonTur || 'tuval') : null));
      self.gorunumNotYaz();
    });
  };
  Oynatici.prototype.gorunumNotYaz = function () {
    var r = this.r, A = (this.P && this.P.adimlar) || [];
    if (ayar.gorunum === 'figur' || ayar.ikili) { r.gorunumNot.textContent = ayar.ikili && ayar.gorunum !== 'figur' ? 'Karşılıklı anlatımda çizgi figürler görünür.' : ''; return; }
    if (ayar.gorunum === 'foto') { r.gorunumNot.textContent = Foto.url ? 'Köşede fotoğrafın görünür; konuşurken çevresi parlar.' : 'Fotoğrafını seç: kare biçiminde kırpılır, yalnızca bu cihazda saklanır.'; return; }
    Kayitlar.anahtarlar().then(function (l) {
      var y = {}; l.forEach(function (x) { if (/^[yv]:/.test(x)) y[x.slice(2)] = 1; });
      var n = A.filter(function (a) { return y[ozet(a.s)]; }).length, yedek = Foto.url ? 'fotoğrafın' : 'çizgi figür';
      r.gorunumNot.textContent = !n ? 'Bu derste henüz yüz videon yok. “Kendi sesinle kaydet” bölümünde 📷 Kamerayı aç ve cümleleri öyle oku.'
        : 'Bu derste ' + n + ' cümlede yüz videon var' + (n < A.length ? '; diğerlerinde ' + yedek + ' görünür.' : '.') + (kaynakNe() !== 'kayit' ? ' Görünmesi için ses kaynağını “Öğretmen kaydı” yap.' : '');
    });
  };
  Oynatici.prototype.yuzKose = function (tercih) { // 'tuval': kamera karesi; yoksa fotoğraf (varsa) ya da çizgi figür
    var r = this.r, mod = this.yuzModu();
    if (!r.yuzTuval) return;
    var tuval = mod === 'video' && tercih === 'tuval', video = mod === 'video' && tercih === 'video', foto = !tuval && !video && mod !== 'figur' && !!Foto.url;
    r.ogretmen.classList.toggle('yuzlu', tuval || video || foto);
    r.yuzTuval.hidden = !tuval; r.yuzVideo.hidden = !video; r.yuzFoto.hidden = !foto;
  };
  Oynatici.prototype.gorunumSec = function (g) {
    if (!/^(figur|foto|video)$/.test(g)) return;
    if (g === 'foto' && !Foto.url) { this.fotoBekleyen = true; this.r.fotoSec.click(); return; }
    ayar.gorunum = g; depo.yaz('gorunum', g);
    Oynatici.hepsi.forEach(function (o) { o.yuzGorunum(); });
  };
  Oynatici.prototype.fotoYukle = function (dosya) {
    var self = this, r = this.r;
    r.gorunumNot.textContent = 'Fotoğraf hazırlanıyor…';
    Foto.koy(dosya).then(function () {
      if (self.fotoBekleyen || ayar.gorunum === 'figur') { ayar.gorunum = 'foto'; depo.yaz('gorunum', 'foto'); }
      self.fotoBekleyen = false;
      Oynatici.hepsi.forEach(function (o) { o.yuzGorunum(); });
    }).catch(function () { r.gorunumNot.textContent = 'Fotoğraf açılamadı. Başka bir fotoğraf dene.'; });
  };
  Oynatici.prototype.yuzOynat = function (yuz, jeton, url) { // cümlenin yüz kareleri, sesin kendi saatine göre
    var self = this, r = this.r, c = r.yuzTuval.getContext('2d'), W = r.yuzTuval.width;
    this.yuzDur();
    if (this.yuzOnceki) { yuzSal(this.yuzOnceki); this.yuzOnceki = null; }
    this.yuzSu = yuz;
    var ciz = function () {
      if (self.yuzSu !== yuz || jeton !== self.P.jeton) return;
      var el = Ses.ses, t = el && el.src === url ? el.currentTime : 0, k = yuzKare(yuz, t);
      if (k) { try { c.drawImage(k, 0, 0, W, W); } catch (e) {} if (!self.yuzCizildi || r.yuzTuval.hidden) { self.yuzCizildi = true; self.yuzSonTur = 'tuval'; self.yuzKose('tuval'); } }
      self.yuzRaf = requestAnimationFrame(ciz);
    };
    ciz();
  };
  Oynatici.prototype.yuzVideoOynat = function (yuz, jeton, url) { // gerçek yüz videosu: sesin saatine bağlı oynar
    var self = this, r = this.r, v = r.yuzVideo;
    this.yuzDur();
    if (this.yuzOnceki) { yuzSal(this.yuzOnceki); this.yuzOnceki = null; }
    this.yuzSu = yuz;
    if (v.getAttribute('src') !== yuz.url) { v.setAttribute('src', yuz.url); try { v.load(); } catch (e) {} }
    v.muted = true;
    var dongu = function () {
      if (self.yuzSu !== yuz || jeton !== self.P.jeton) return;
      var el = Ses.ses;
      if (el && el.src === url) {
        var hedef = Math.max(0, el.currentTime + yuz.fark);
        if (v.readyState >= 1 && Math.abs(v.currentTime - hedef) > 0.15) { try { v.currentTime = hedef; } catch (e) {} }
        try { v.playbackRate = el.playbackRate || 1; } catch (e) {}
        if (v.paused && !el.paused) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
      }
      if (v.readyState >= 2 && (!self.yuzCizildi || r.yuzVideo.hidden)) { self.yuzCizildi = true; self.yuzSonTur = 'video'; self.yuzKose('video'); }
      self.yuzZaman = setTimeout(dongu, 120);
    };
    dongu();
  };
  Oynatici.prototype.yuzDur = function () { // son kare görünür kalır; kayıt bir sonraki cümlede bırakılır
    if (this.yuzRaf) { cancelAnimationFrame(this.yuzRaf); this.yuzRaf = null; }
    if (this.yuzZaman) { clearTimeout(this.yuzZaman); this.yuzZaman = null; }
    if (this.r.yuzVideo && !this.r.yuzVideo.paused) { try { this.r.yuzVideo.pause(); } catch (e) {} }
    if (this.yuzSu) { if (this.yuzOnceki && this.yuzOnceki !== this.yuzSu) yuzSal(this.yuzOnceki); this.yuzOnceki = this.yuzSu; this.yuzSu = null; }
  };
  Oynatici.prototype.yuzBekle = function () { // bu cümlenin yüz videosu yok
    this.yuzDur();
    if (this.yuzModu() === 'video') this.yuzKose(!Foto.url && this.yuzCizildi ? (this.yuzSonTur || 'tuval') : null);
  };
  Oynatici.prototype.yuzSifirla = function () {
    this.yuzDur();
    if (this.yuzOnceki) { yuzSal(this.yuzOnceki); this.yuzOnceki = null; }
    this.yuzCizildi = false; this.yuzSonTur = null; this.yuzKose(null);
  };
  Oynatici.prototype.kameraBaslat = function () {
    var self = this, r = this.r;
    if (this.kameraAkis) return;
    if (!YuzKayit.var) { r.kameraAc.checked = false; return; }
    r.studyoNot.hidden = true;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30, max: 30 } }, audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }).then(function (akis) {
      if (!r.kameraAc.checked || r.studyo.hidden) { akis.getTracks().forEach(function (t) { t.stop(); }); return; }
      self.kameraAkis = akis;
      r.kameraVideo.srcObject = akis; r.kameraKutu.hidden = false; r.kameraKutu.parentNode.classList.add('acik');
      var p = r.kameraVideo.play(); if (p && p.catch) p.catch(function () {});
      if (ayar.gorunum !== 'video') { ayar.gorunum = 'video'; depo.yaz('gorunum', 'video'); Oynatici.hepsi.forEach(function (o) { o.yuzGorunum(); }); }
      if (self.KS) self.kstKameraDurum();
    }).catch(function () {
      r.kameraAc.checked = false;
      if (self.KS) { self.kstKameraDurum(); self.kstIpucu('Kamera açılamadı. Bu site için kamera iznini ver.'); }
      r.studyoNot.textContent = 'Kamera açılamadı. Tarayıcının bu site için kamera ve mikrofon iznini ver ve yeniden dene.'; r.studyoNot.hidden = false;
    });
  };
  Oynatici.prototype.kameraKapat = function () {
    var r = this.r;
    if (this.kayitAktif && this.yuzAktif) this.kayitBitir();
    if (this.kameraAkis) { this.kameraAkis.getTracks().forEach(function (t) { t.stop(); }); this.kameraAkis = null; }
    try { r.kameraVideo.srcObject = null; } catch (e) {}
    r.kameraAc.checked = false; r.kameraKutu.parentNode.classList.remove('acik');
    if (!this.studyoYuz) r.kameraKutu.hidden = true;
    if (this.KS) this.kstKameraDurum();
  };
  Oynatici.prototype.studyoVideoOynat = function (yuz, au, url) { // "Dinle": video kaydı yuvarlakta, sesle eş zamanlı
    var self = this, r = this.r, v = r.kameraTekrar;
    if (this.studyoYuz) { cancelAnimationFrame(this.studyoYuz.raf); clearTimeout(this.studyoYuz.zaman); yuzSal(this.studyoYuz.yuz); }
    var d = { yuz: yuz, raf: 0, zaman: 0 }; this.studyoYuz = d;
    r.kameraKutu.hidden = false; v.hidden = false; v.setAttribute('src', yuz.url); v.muted = true;
    var bitir = function () {
      clearTimeout(d.zaman);
      if (self.studyoYuz === d) { self.studyoYuz = null; try { v.pause(); } catch (e) {} v.hidden = true; v.removeAttribute('src'); if (!self.kameraAkis) r.kameraKutu.hidden = true; }
      yuzSal(yuz);
    };
    var dongu = function () {
      if (self.studyoYuz !== d) return;
      if (au.src !== url) { bitir(); return; }
      var hedef = Math.max(0, au.currentTime + yuz.fark);
      if (v.readyState >= 1 && Math.abs(v.currentTime - hedef) > 0.15) { try { v.currentTime = hedef; } catch (e) {} }
      if (v.paused && !au.paused) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
      if (au.ended || (au.paused && au.currentTime > 0.05)) { bitir(); return; }
      d.zaman = setTimeout(dongu, 120);
    };
    dongu();
  };
  Oynatici.prototype.studyoYuzOynat = function (yuz, au, url) { // "Dinle": kaydın yüz kareleri stüdyonun yuvarlağında
    var self = this, r = this.r, tv = r.kameraDinle, c = tv.getContext('2d'), W = tv.width;
    if (this.studyoYuz) { cancelAnimationFrame(this.studyoYuz.raf); yuzBirak(this.studyoYuz.yuz); }
    var d = { yuz: yuz, raf: 0 }; this.studyoYuz = d;
    r.kameraKutu.hidden = false; tv.hidden = false;
    var bitir = function () {
      cancelAnimationFrame(d.raf);
      if (self.studyoYuz === d) { self.studyoYuz = null; tv.hidden = true; if (!self.kameraAkis) r.kameraKutu.hidden = true; }
      yuzBirak(yuz);
    };
    var ciz = function () {
      if (self.studyoYuz !== d) return;
      if (au.src !== url) { bitir(); return; }
      var k = yuzKare(yuz, au.currentTime); if (k) { try { c.drawImage(k, 0, 0, W, W); } catch (e) {} }
      if (au.ended || (au.paused && au.currentTime > 0.05)) { bitir(); return; }
      d.raf = requestAnimationFrame(ciz);
    };
    d.raf = requestAnimationFrame(ciz);
  };

  /* ---- kayıt stüdyosu ---- */
  Oynatici.prototype.studyoAc = function () {
    this.durdur();
    this.r.studyo.hidden = false;
    this.r.studyoNot.hidden = true;
    if (!Kaydedici.var) { this.r.studyoNot.textContent = 'Bu tarayıcı ses kaydını desteklemiyor. Telefonda Safari ya da Chrome ile dene.'; this.r.studyoNot.hidden = false; }
    this.r.kameraAc.checked = !!this.kameraAkis; this.r.kameraKutu.hidden = !this.kameraAkis; this.r.kameraAc.disabled = !YuzKayit.var;
    this.studyoCiz(); this.belgeListeCiz();
  };
  Oynatici.prototype.studyoKapat = function (hepsi) {
    if (this.KS) { this.kstKapat(); if (!hepsi) return; }
    if (this.kayitAktif) { this.kayitAktif.durdur(); this.kayitAktif = null; }
    this.siraliDur = true;
    if (this.yuzAktif) { if (this.yuzAktif.video) this.yuzAktif.durdur(); else this.yuzAktif.bitir(); this.yuzAktif = null; }
    this.kameraKapat();
    this.r.studyo.hidden = true; this.kayitDurumu(); this.yuzGorunum();
  };
  Oynatici.prototype.studyoCiz = function () {
    var self = this, adimlar = this.P.adimlar;
    Promise.all([Promise.all(adimlar.map(function (a) { return Kayitlar.al('k:' + ozet(a.s)); })), Kayitlar.anahtarlar()]).then(function (s2) {
      var kayitlar = s2[0], yuzlu = {}, cizimli = {}, kalemVar = !!window.SesliKalem; s2[1].forEach(function (x) { if (/^[yv]:/.test(x)) yuzlu[x.slice(2)] = 1; else if (/^c:/.test(x)) cizimli[x.slice(2)] = 1; });
      self.r.studyoListe.innerHTML = adimlar.map(function (a, i) {
        var k = kayitlar[i], var_ = k && k.veri, yay = !var_ && Yayin.al(ozet(a.s));
        var kaydediyor = self.kayitIndex === i;
        return '<li data-i="' + i + '"' + (kaydediyor ? ' class="su"' : '') + '><span class="no">' + (i + 1) + '</span><div><div class="ct">' + esc(a.s) + '</div>' +
          '<div class="durum">' + (kaydediyor ? '<span class="kayit-isik"></span> Kaydediliyor… okuyunca ■ Bitir’e bas' : var_ ? '<b>✓ Kaydın var</b> · ' + (k.sure || 0).toFixed(1) + ' sn' + (yuzlu[ozet(a.s)] ? ' · 📷 yüzün de var' : '') + (cizimli[ozet(a.s)] ? ' · ✏️ çizimin var' : '') : yay ? 'Sitede yayımlanmış kayıt var' : 'Kayıt yok') + '</div></div>' +
          '<div class="islem">' +
            '<button type="button" class="dugme' + (kaydediyor ? '' : ' ikincil') + '" data-is="kaydet" data-i="' + i + '">' + (kaydediyor ? '■ Bitir' : '● Kaydet') + '</button>' +
            '<button type="button" class="dugme ikincil" data-is="dinle" data-i="' + i + '"' + (var_ || yay ? '' : ' disabled') + '>▶ Dinle</button>' +
            '<button type="button" class="dugme ikincil" data-is="sil" data-i="' + i + '"' + (var_ ? '' : ' disabled') + '>Sil</button>' +
            (kalemVar ? '<button type="button" class="dugme ikincil" data-is="kalem" data-i="' + i + '">✏️ Kalemle</button>' : '') +
          '</div></li>';
      }).join('');
      var su = self.r.studyoListe.querySelector('li.su'); if (su && su.scrollIntoView) su.scrollIntoView({ block: 'nearest' });
    });
  };
  Oynatici.prototype.kayitBaslat = function (i) {
    var self = this;
    if (!Kaydedici.var) return Promise.reject(new Error('destek yok'));
    var akis = this.kameraAkis;
    return Kaydedici.basla(akis).then(function (k) {
      self.kayitAktif = k; self.kayitIndex = i;
      var ST = window.SesliStudyo, vk = akis && ST && ST.videoKaydedici.var() ? ST.videoKaydedici : null;
      if (vk) { self.yuzAktif = vk.basla(akis); if (self.yuzAktif) self.yuzAktif.video = true; }
      if (akis && !self.yuzAktif && YuzKayit.var) self.yuzAktif = YuzKayit.basla(self.r.kameraVideo, k.t0);
      if (self.yuzAktif) self.r.kameraKutu.classList.add('kayitta');
      self.studyoCiz(); return k;
    })
      .catch(function (e) {
        self.r.studyoNot.textContent = SesliDers.mikrofonNotu || 'Mikrofon açılamadı. Tarayıcının bu site için mikrofon iznini ver ve yeniden dene.';
        self.r.studyoNot.hidden = false; self.kayitIndex = null; self.studyoCiz(); throw e;
      });
  };
  Oynatici.prototype.kayitBitir = function (kalem) { // kalem: kalem stüdyosunun izleri; yoksa eski izler silinir (yeni sesle zamanlaması tutmaz)
    var self = this, k = this.kayitAktif, i = this.kayitIndex, a = this.P.adimlar[i], yz = this.yuzAktif;
    var yzBitir = function () { return !yz ? Promise.resolve(null) : (yz.video ? yz.durdur() : yz.bitir()).catch(function () { return null; }); };
    this.kayitAktif = null; this.kayitIndex = null; this.yuzAktif = null; this.r.kameraKutu.classList.remove('kayitta');
    if (!k || !a) { yzBitir(); return Promise.resolve(false); }
    var h = ozet(a.s);
    return Promise.all([k.durdur(), yzBitir()]).then(function (s2) {
      var s = s2[0], yuz = s2[1];
      if (!s || !s.blob || s.blob.size < 800) { self.studyoCiz(); return false; }
      return blobTampon(s.blob).then(function (buf) { return Kayitlar.koy('k:' + h, { mime: s.mime, veri: buf, sure: s.sure, metin: a.s, tarih: Date.now() }); })
        .then(function () {
          if (yz && yz.video && yuz && yuz.blob && yuz.blob.size > 4000) return blobTampon(yuz.blob).then(function (vb) {
            return Kayitlar.koy('v:' + h, { mime: yuz.mime, veri: vb, sure: yuz.sure, fark: (k.t0() - yz.t0()) / 1000, g: yuz.g, y: yuz.y, metin: a.s, tarih: Date.now() });
          }).then(function () { return Kayitlar.sil('y:' + h); });
          if (yz && !yz.video && yuz) return Kayitlar.koy('y:' + h, { fps: yuz.fps, boy: yuz.boy, dizin: yuz.dizin, veri: yuz.veri, metin: a.s, tarih: Date.now() }).then(function () { return Kayitlar.sil('v:' + h); });
          return Promise.all([Kayitlar.sil('y:' + h), Kayitlar.sil('v:' + h)]);
        })
        .then(function () { return kalem ? Kayitlar.koy('c:' + h, kalem) : Kayitlar.sil('c:' + h); })
        .then(function () { self.studyoCiz(); self.kayitDurumu(); return true; });
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
      Promise.all([this.kayitBul(a.s), yuzOynatimAl(a.s)]).then(function (s2) {
        var k = s2[0], yuz = s2[1];
        if (!k) { yuzSal(yuz); return; }
        var au = Ses.ortak(); au.onended = au.onerror = au.onloadedmetadata = null; au.src = k.url; var p = au.play(); if (p && p.catch) p.catch(function () {});
        if (yuz && yuz.tur === 'video') self.studyoVideoOynat(yuz, au, k.url); else if (yuz) self.studyoYuzOynat(yuz, au, k.url);
      });
    } else if (is === 'sil') {
      Promise.all([Kayitlar.sil('k:' + ozet(a.s)), Kayitlar.sil('y:' + ozet(a.s)), Kayitlar.sil('v:' + ozet(a.s)), Kayitlar.sil('c:' + ozet(a.s))]).then(function () { self.studyoCiz(); self.kayitDurumu(); });
    } else if (is === 'kalem') this.kstAc(i);
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
  /* ---- PDF ve resim: her sayfa tahtada ayrı bir sayfa (yalnızca bu cihazda saklanır) ---- */
  Oynatici.prototype.belgeListeCiz = function () {
    var r = this.r; if (!r.belgeListe) return;
    Kayitlar.anahtarlar().then(function (l) {
      return Promise.all(l.filter(function (k) { return /^gd:/.test(k); }).map(function (k) { return Kayitlar.al(k).then(function (v) { return v ? { id: k.slice(3), ad: v.ad, n: (v.adimlar || []).length, tarih: v.tarih || 0 } : null; }); }));
    }).then(function (l) {
      l = l.filter(Boolean).sort(function (a, b) { return b.tarih - a.tarih; });
      r.belgeListe.innerHTML = l.map(function (b) { return '<li><span>📄 ' + esc(b.ad) + ' · ' + b.n + ' sayfa</span><button type="button" class="sd-kucuk" data-belge-ac="' + esc(b.id) + '">Aç</button><button type="button" class="sd-kucuk" data-belge-sil="' + esc(b.id) + '">Sil</button></li>'; }).join('');
    });
  };
  Oynatici.prototype.belgeSecildi = function (dosyalar) {
    var self = this, r = this.r, KL = window.SesliKalem;
    if (!KL || !dosyalar.length || this.belgeIsleniyor) return;
    var id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6), sayfalar = [], ad = '';
    var not = function (y) { r.belgeNot.textContent = y; r.belgeNot.hidden = !y; };
    var kaydet = function () { return Kayitlar.koy('gd:' + id, { ad: ad, tarih: Date.now(), adimlar: sayfalar }); };
    var koy = function (sy) { // { blob, g, y }: sayfa resmi cümle anahtarıyla saklanır; ses ve kalem kayıtları da bu anahtara bağlanır
      var s = ad + ' · sayfa ' + (sayfalar.length + 1), h = ozet(s);
      return blobTampon(sy.blob).then(function (buf) { return Kayitlar.koy('g:' + h, { mime: 'image/jpeg', veri: buf, g: sy.g, y: sy.y, belge: id, tarih: Date.now() }); })
        .then(function () { sayfalar.push({ s: s, h: h, g: sy.g, y: sy.y }); not('Sayfalar hazırlanıyor… ' + sayfalar.length); });
    };
    this.belgeIsleniyor = true; not('Dosya açılıyor…');
    Kayitlar.anahtarlar().then(function (l) { // aynı adlı belge varsa sonuna sayı eklenir (kayıtlar karışmasın)
      return Promise.all(l.filter(function (k) { return /^gd:/.test(k); }).map(function (k) { return Kayitlar.al(k).then(function (v) { return v && v.ad; }); }));
    }).then(function (adlar) {
      var kok = (dosyalar.length === 1 ? dosyalar[0].name : dosyalar[0].name + ' ve ' + (dosyalar.length - 1) + ' dosya').replace(/\.[a-z0-9]{2,5}$/i, '').replace(/\s+/g, ' ').trim().slice(0, 60) || 'Belge';
      ad = kok; for (var n = 2; adlar.indexOf(ad) >= 0; n++) ad = kok + ' (' + n + ')';
      var zincir = Promise.resolve();
      dosyalar.forEach(function (f) {
        zincir = zincir.then(function () {
          if (/pdf$/i.test(f.type || '') || /\.pdf$/i.test(f.name || '')) return KL.pdfAc(f).then(function (pdf) {
            var z = Promise.resolve(), en = Math.min(pdf.sayfa, 60);
            for (var i = 1; i <= en; i++) (function (i) { z = z.then(function () { return pdf.ciz(i, 1800).then(koy); }); })(i);
            return z.then(function () { pdf.kapat(); }, function (e) { pdf.kapat(); throw e; });
          });
          return KL.resimDosyasi(f).then(koy);
        });
      });
      return zincir;
    }).then(function () {
      if (!sayfalar.length) throw new Error('sayfa yok');
      return kaydet();
    }).then(function () {
      self.belgeIsleniyor = false; not(''); self.belgeListeCiz();
      return self.belgeAc(id);
    }).catch(function (e) {
      self.belgeIsleniyor = false;
      if (sayfalar.length) { kaydet().then(function () { self.belgeListeCiz(); }); not('Bazı sayfalar açılamadı; açılan ' + sayfalar.length + ' sayfa listede.'); }
      else not('Dosya açılamadı. PDF ya da resim (JPEG, PNG) seç; PDF için internet bağlantısı gerekir.');
      if (window.console) console.warn('Belge:', e);
    });
  };
  Oynatici.prototype.belgeAc = function (id, kalemsiz) {
    var self = this;
    return Kayitlar.al('gd:' + id).then(function (b) {
      if (!b || !b.adimlar || !b.adimlar.length) return;
      return Promise.all(b.adimlar.map(function (p) { return Kayitlar.al('g:' + p.h); })).then(function (l) {
        (self.belgeUrller || []).forEach(function (u) { URL.revokeObjectURL(u); });
        self.belgeUrller = [];
        var adimlar = [];
        b.adimlar.forEach(function (p, i) {
          var v = l[i]; if (!v || !v.veri) return;
          var url = URL.createObjectURL(new Blob([v.veri], { type: v.mime || 'image/jpeg' })); self.belgeUrller.push(url);
          adimlar.push({ s: p.s, sil: 1, gorsel: true, w: [{ c: 'sayfa', gorsel: { url: url, g: p.g, y: p.y } }] });
        });
        if (!adimlar.length) return;
        self.yukle({ id: 'gd-' + id, baslik: b.ad, adimlar: adimlar, dugme: 'Anlatımı başlat' });
        self.studyoCiz();
        if (!kalemsiz) self.kstAc(0);
      });
    });
  };
  Oynatici.prototype.belgeSil = function (id, b) {
    var self = this;
    if (b.getAttribute('data-onay') !== '1') { // iki dokunuşla silinir
      b.setAttribute('data-onay', '1'); b.textContent = 'Sayfalar ve kayıtları silinsin mi?';
      setTimeout(function () { b.removeAttribute('data-onay'); b.textContent = 'Sil'; }, 3500); return;
    }
    Kayitlar.al('gd:' + id).then(function (v) {
      var is = [Kayitlar.sil('gd:' + id)];
      ((v && v.adimlar) || []).forEach(function (p) { ['g:', 'k:', 'v:', 'y:', 'c:'].forEach(function (on) { is.push(Kayitlar.sil(on + p.h)); }); });
      return Promise.all(is);
    }).then(function () { self.belgeListeCiz(); });
  };

  /* ---- kalem stüdyosu: tahtaya kalemle yazarak ve göstererek kayıt ----
     Tahta, indirilecek videodaki tahtanın aynısıdır (aynı ölçüm ve çizici). Kalem izleri kaydın saatine göre saklanır. */
  Oynatici.prototype.kstAc = function (i) {
    var self = this, r = this.r, A = this.P.adimlar;
    if (!window.SesliKalem || !A || !A.length || !r.kst || this.KS) return;
    if (this.siraliCalisiyor) this.siraliDur = true;
    var once = this.kayitAktif ? this.kayitBitir() : Promise.resolve();
    if (i == null) { i = 0; for (var j = 0; j < A.length; j++) if (!this.kayitVar[ozet(A[j].s)]) { i = j; break; } }
    var KS = this.KS = { i: Math.max(0, Math.min(A.length - 1, i)), mod: 'yukleniyor', arac: 'kalem', renk: null, eller: !!depo.al('kstEller', false) };
    this.kstIsikBak();
    r.kst.hidden = false; r.kstYukle.hidden = false; r.kstYukle.textContent = 'Tahta hazırlanıyor…';
    r.kstNo.textContent = ''; r.kstMetin.textContent = A[KS.i].s; r.kstSonraki.textContent = ''; r.kstSure.textContent = '';
    this.kstKameraYerlestir(true); this.kstArayuz();
    if (!this.kstTus) { // klavye: boşluk kayıt, oklar cümle değiştirir, Esc kapatır
      this.kstTus = function (e) {
        if (!self.KS || self.r.kst.hidden) return;
        var hedef = e.composedPath ? e.composedPath()[0] : e.target;
        if (hedef && /^(INPUT|TEXTAREA|SELECT)$/.test(hedef.tagName || '')) return;
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); self.kstKapat(); }
        else if (e.key === ' ' && !(hedef && hedef.tagName === 'BUTTON')) { e.preventDefault(); self.kstKayit(); }
        else if (e.key === 'ArrowRight') self.kstGit(1);
        else if (e.key === 'ArrowLeft') self.kstGit(-1);
      };
      document.addEventListener('keydown', this.kstTus, true);
      window.addEventListener('resize', function () { if (self.KS) { self.kstBoyut(); self.kstArayuz(); } });
    }
    requestAnimationFrame(function () { self.kstBoyut(); });
    return once.then(function () { return self.kstHazirla(KS); }).then(function () {
      if (self.KS !== KS) return;
      KS.mod = 'bos'; r.kstYukle.hidden = true;
      self.kstBoyut(); self.kstAdim(KS.i);
    }).catch(function (e) {
      if (self.KS !== KS) return;
      KS.mod = 'hata'; r.kstYukle.textContent = 'Tahta hazırlanamadı. Kapatıp yeniden dene.'; self.kstArayuz();
      if (window.console) console.warn('Kalem stüdyosu:', e);
    });
  };
  Oynatici.prototype.kstHazirla = function (KS) {
    var self = this, r = this.r, KL = window.SesliKalem, A = KS.A = this.P.adimlar.slice();
    return Promise.all([
      this.videoOlc(A, null, false),
      Promise.all(A.map(function (a) { return Kayitlar.al('k:' + ozet(a.s)); })),
      Promise.all(A.map(function (a) { return Kayitlar.al('c:' + ozet(a.s)); }))
    ]).then(function (s) {
      KS.O = s[0];
      KS.kayit = s[1].map(function (k) { return k && k.veri ? { sure: k.sure || 0 } : null; });
      KS.veri = s[2].map(function (v) { return v && (v.izler || v.olay) ? v : null; });
      return vKaynaklar(KS.O);
    }).then(function (Kk) {
      if (self.KS !== KS) return;
      var O = KS.O, B = O.G.tahta;
      KS.K = Kk;
      KS.Z = vZaman(O, A.map(function () { return { ana: { length: KALEM_UZUN, kirpBas: 0, kendi: true } }; }), 1, { studyo: true });
      var gen = r.kstTahta.getBoundingClientRect().width || 960;
      KS.RS = Math.max(1, Math.min(2, gen * Math.min(2, window.devicePixelRatio || 1) / VID_G));
      KS.ciz = vCizici(O, KS.Z, Kk, '', KS.RS, { kosesiz: true, murekkep: { ciz: function (c, T, p) { return KS.mur ? KS.mur.ciz(c, T, p) : null; } } });
      var eski = r.kstTahta.querySelector('canvas.tahta-tuval'); if (eski) eski.parentNode.removeChild(eski);
      KS.ciz.tuval.className = 'tahta-tuval';
      r.kstTahta.insertBefore(KS.ciz.tuval, r.kstCizim);
      KS.renk = KS.renk || O.gor.anaRenk;
      KS.yuzey = KL.yuzey(r.kstCizim, {
        alan: function () { return { lg: VID_G, bx: B.x, by: B.y, bg: B.g, bh: B.h }; },
        saat: function () { return KS.saat ? KS.saat() : null; },
        koyu: !!O.gor.t.koyu,
        kapali: function () {
          self.kstIpucu(KS.mod !== 'bos' ? 'Önizleme sırasında çizilmez' : KS.kayit[KS.i] ? 'Çizmek için ● Kaydet’e ya da ✏️ Sesin üstüne çiz’e bas' : 'Çizmek için önce ● Kaydet’e bas');
        },
        eskiler: function () { return KS.mur ? KS.mur.gorunenler(KS.sonT || 0, O.adimlar[KS.i].sayfa) : []; },
        silindi: function () { self.kstMurekkep(KS.i); KS.kirli = true; }
      });
      KS.yuzey.renk(KS.renk); KS.yuzey.arac(KS.arac);
      self.kstAraclarCiz();
    });
  };
  // tahtadaki izler; kaydı yapılan adımın eski izleri yerine yalnız canlı silmeler (yeni izler üst katmanda çizilir)
  Oynatici.prototype.kstMurekkep = function (haric) {
    var KS = this.KS; if (!KS || !KS.O) return;
    var O = KS.O, Z = KS.Z.adimlar, B = O.G.tahta, canli = KS.yuzey && haric != null ? { izler: [], olay: KS.yuzey.olaylar() } : null;
    KS.mur = window.SesliKalem.cizici({ RS: KS.RS, g: B.g, h: B.h, koyu: !!O.gor.t.koyu, adimlar: O.adimlar.map(function (Ka, j) {
      var v = j === haric ? canli : KS.veri[j];
      return { sayfa: Ka.sayfa, veri: v, olcek: v && v.g ? B.g / v.g : 1, esle: function (t) { return Z[j].kBas + t; } };
    }) });
  };
  Oynatici.prototype.kstSonT = function (i) { // adımın son hâli: kayıt ve çizim bittikten sonra
    var KS = this.KS, v = KS.veri[i], s = v ? window.SesliKalem.sinirlar(v) : null, k = KS.kayit[i];
    return Math.max(2.5, s ? s.son + 0.6 : 0, k ? k.sure + 0.2 : 0);
  };
  Oynatici.prototype.kstGoster = function (trel) {
    var KS = this.KS; if (!KS || !KS.ciz) return;
    if (trel == null) trel = KS.sonTrel != null ? KS.sonTrel : this.kstSonT(KS.i);
    KS.sonTrel = trel; KS.sonT = KS.Z.adimlar[KS.i].kBas + trel;
    KS.ciz.kare(KS.sonT);
  };
  Oynatici.prototype.kstAdim = function (i) {
    var KS = this.KS, r = this.r; if (!KS || !KS.O) return;
    var A = KS.A; i = Math.max(0, Math.min(A.length - 1, i)); KS.i = i;
    var sy = !!A[i].gorsel;
    r.kstNo.textContent = (sy ? 'Sayfa ' : 'Cümle ') + (i + 1) + ' / ' + A.length;
    r.kstMetin.textContent = A[i].s;
    r.kstSonraki.textContent = A[i + 1] ? 'Sonra: ' + A[i + 1].s : (sy ? 'Son sayfa' : 'Son cümle');
    r.kstSure.textContent = '';
    KS.sonTrel = null;
    if (KS.yuzey) KS.yuzey.basla();
    this.kstMurekkep(null);
    this.kstGoster(this.kstSonT(i));
    this.kstArayuz();
  };
  Oynatici.prototype.kstGit = function (d) { var KS = this.KS; if (!KS || KS.mod !== 'bos') return; this.kstAdim(KS.i + d); };
  Oynatici.prototype.kstArayuz = function () {
    var KS = this.KS, r = this.r; if (!KS) return;
    var i = KS.i, n = KS.A ? KS.A.length : 0, m = KS.mod, kayitVar = !!(KS.kayit && KS.kayit[i]), izVar = !!(KS.veri && KS.veri[i]), ad = KS.A && KS.A[i] && KS.A[i].gorsel ? 'sayfa' : 'cümle';
    var mesgul = /^(kayit|ustune|hazirlaniyor|kaydediliyor|yukleniyor|hata|sayiyor)$/.test(m);
    if (r.kstEller) { r.kstEller.setAttribute('aria-pressed', String(!!KS.eller)); r.kstEller.disabled = m === 'yukleniyor' || m === 'hata'; }
    r.kstKayit.textContent = m === 'kayit' ? '■ Bitir' : m === 'sayiyor' ? '✕ Vazgeç' : '● Kaydet';
    r.kstKayit.classList.toggle('kayitta', m === 'kayit');
    r.kstKayit.disabled = mesgul && m !== 'kayit' && m !== 'sayiyor';
    r.kstUstune.textContent = m === 'ustune' ? '■ Bitir' : '✏️ Sesin üstüne çiz';
    r.kstUstune.classList.toggle('kayitta', m === 'ustune');
    r.kstUstune.disabled = !kayitVar || (mesgul && m !== 'ustune');
    r.kstDinle.textContent = m === 'dinle' ? '■ Durdur' : '▶ Dinle';
    r.kstDinle.disabled = !kayitVar || mesgul;
    r.kstGeri.disabled = i <= 0 || mesgul || m === 'dinle'; r.kstIleri.disabled = i >= n - 1 || mesgul || m === 'dinle';
    r.kstKameraDugme.disabled = m === 'kayit' || m === 'hazirlaniyor';
    r.kstDurum.textContent = m === 'kayit' ? '● Kaydediliyor: konuş, tahtaya yaz, göster. Bitince ■ Bitir.' : m === 'ustune' ? 'Sesin çalıyor: konuştuğun yerleri yaz ya da göster.' : m === 'dinle' ? 'Önizleme: videoda böyle görünecek.' :
      m === 'yukleniyor' ? '' : (kayitVar ? '✓ Sesin var' + (izVar ? ' · ✏️ çizimin var' : ' · çizim yok') : 'Bu ' + ad + ' için henüz kayıt yok.') + (KS.yuzey && KS.yuzey.kalemVar() ? '' : ' Kalem yoksa parmakla da çizebilirsin.') + (window.innerWidth < 700 && window.innerHeight > window.innerWidth ? ' Telefonu yan çevirirsen tahta büyür.' : '');
    r.kstCizimSil.hidden = !(izVar && m === 'bos'); r.kstCizimSil.textContent = 'Bu ' + (ad === 'sayfa' ? 'sayfanın' : 'cümlenin') + ' çizimini sil';
  };
  Oynatici.prototype.kstAraclarCiz = function () {
    var KS = this.KS, r = this.r; if (!KS) return;
    var renkler = KALEMLER[kalemTuru()].renkler, ana = KS.renk || renkler[0][1];
    var d = function (arac, ad, ic) { return '<button type="button" class="kst-arac" data-arac="' + arac + '" aria-label="' + ad + '" title="' + ad + '" aria-pressed="' + (KS.arac === arac) + '">' + ic + '</button>'; };
    r.kstAraclar.innerHTML = renkler.map(function (x) {
      return '<button type="button" class="kst-arac" data-arac="kalem" data-renk="' + x[1] + '" aria-label="Kalem: ' + x[0] + '" title="' + x[0] + ' kalem" aria-pressed="' + (KS.arac === 'kalem' && ana === x[1]) + '"><i style="background:' + x[1] + '"></i></button>';
    }).join('') + '<span class="kst-ayrac"></span>' +
      d('fosfor', 'Fosforlu kalem', KST_IKON.fosfor) + d('lazer', 'Lazer: göster', KST_IKON.lazer) + d('silgi', 'Silgi', KST_IKON.silgi) +
      '<span class="kst-ayrac"></span>' +
      '<button type="button" class="kst-arac" data-is="geri" aria-label="Geri al" title="Geri al">' + KST_IKON.geri + '</button>' +
      '<button type="button" class="kst-arac" data-is="temizle" aria-label="Çizimleri temizle" title="Tahtadaki çizimleri temizle">' + KST_IKON.temizle + '</button>';
  };
  Oynatici.prototype.kstAracSec = function (b) {
    var KS = this.KS; if (!KS || !KS.yuzey) return;
    var a = b.getAttribute('data-arac'), is = b.getAttribute('data-is');
    if (a) { KS.arac = a; if (a === 'kalem') KS.renk = b.getAttribute('data-renk') || KS.renk; KS.yuzey.arac(a); KS.yuzey.renk(KS.renk); this.kstAraclarCiz(); return; }
    if (is === 'geri') { if (!KS.yuzey.geriAl()) this.kstIpucu(KS.saat ? 'Geri alınacak çizim yok' : 'Geri alma kayıt sırasında çalışır'); }
    else if (is === 'temizle') { if (!KS.yuzey.temizle()) this.kstIpucu('Temizleme kayıt sırasında çalışır'); }
  };
  Oynatici.prototype.kstIpucu = function (yazi) {
    var r = this.r; if (!r.kstIpucu) return;
    clearTimeout(this.kstIpucuZaman);
    r.kstIpucu.textContent = yazi; r.kstIpucu.hidden = false;
    this.kstIpucuZaman = setTimeout(function () { r.kstIpucu.hidden = true; }, 2600);
  };
  Oynatici.prototype.kstBoyut = function () { // tahta 16:9, sahneye sığacak en büyük boyda
    var r = this.r, KS = this.KS; if (!KS) return;
    var R = r.kstSahne.getBoundingClientRect(), g = Math.max(160, R.width), h = Math.max(90, R.height), w = Math.floor(Math.min(g, h * 16 / 9));
    r.kstTahta.style.width = w + 'px'; r.kstTahta.style.height = Math.floor(w * 9 / 16) + 'px';
    if (KS.yuzey) KS.yuzey.boyut();
  };
  Oynatici.prototype.kstKameraYerlestir = function (ac) { // kameranın yuvarlağı kalem stüdyosunun köşesine taşınır, kapanınca geri döner
    var r = this.r, kutu = r.kameraKutu, yer = r.kameraAc.closest ? r.kameraAc.closest('.studyo-kamera') : null;
    if (ac) r.kstKamera.appendChild(kutu);
    else if (yer) { if (kutu.parentNode !== yer) yer.insertBefore(kutu, yer.firstChild); yer.classList.toggle('acik', !!this.kameraAkis); }
    kutu.hidden = !this.kameraAkis && !this.studyoYuz;
    this.kstKameraDurum();
  };
  Oynatici.prototype.kstKameraDurum = function () {
    var r = this.r, ac = !!this.kameraAkis;
    if (r.kstKameraDugme) r.kstKameraDugme.setAttribute('aria-pressed', String(ac));
    if (this.KS && r.kameraKutu.parentNode === r.kstKamera) r.kameraKutu.hidden = !ac && !this.studyoYuz;
  };
  Oynatici.prototype.kstKameraDegis = function () {
    var KS = this.KS, r = this.r; if (!KS || KS.mod === 'kayit' || KS.mod === 'hazirlaniyor') return;
    if (this.kameraAkis) this.kameraKapat(); else { r.kameraAc.checked = true; this.kameraBaslat(); }
    this.kstKameraDurum();
  };
  // kayıt, sesin üstüne çizim ve önizleme sırasında: tahta yalnız gerekince yeniden çizilir (yazı açılırken, silince, önizlemede)
  Oynatici.prototype.kstDongu = function () {
    var self = this, KS = this.KS;
    cancelAnimationFrame(KS.raf);
    var adim = function () {
      if (self.KS !== KS || !/^(kayit|ustune|dinle)$/.test(KS.mod)) return;
      var t = KS.saat ? KS.saat() : null;
      if (t != null) {
        if (KS.mod === 'dinle' || t < 3 || KS.kirli) { KS.kirli = false; self.kstGoster(t); }
        else { KS.sonTrel = t; KS.sonT = KS.Z.adimlar[KS.i].kBas + t; }
        self.r.kstSure.textContent = saatYazi(t);
      }
      KS.raf = requestAnimationFrame(adim);
    };
    KS.raf = requestAnimationFrame(adim);
  };
  Oynatici.prototype.kstYenile = function (i) {
    var KS = this.KS, h = ozet(KS.A[i].s);
    return Promise.all([Kayitlar.al('k:' + h), Kayitlar.al('c:' + h)]).then(function (s) {
      KS.kayit[i] = s[0] && s[0].veri ? { sure: s[0].sure || 0 } : null;
      KS.veri[i] = s[1] && (s[1].izler || s[1].olay) ? s[1] : null;
    });
  };
  Oynatici.prototype.kstKayit = function (kisa) {
    var self = this, KS = this.KS; if (!KS || !KS.O) return;
    if (KS.mod === 'kayit') { KS.ellerDur = KS.eller; this.kstKayitBitir(); return; }
    if (KS.mod === 'sayiyor') { this.kstSayacDur(); return; } // geri sayımda dokununca vazgeçilir
    if (KS.mod === 'dinle') this.kstSus();
    if (KS.mod !== 'bos') return;
    var i = KS.i; KS.ellerDur = false;
    if (!kisa) this.kstSesBaglam(); // iPhone'da ses bağlamı yalnız dokunuşla açılır: ilk dokunuşta açılıp kayıtlar boyunca kullanılır
    this.kstSayac(kisa ? 2 : 3, function () { self.kstKayitBasla(i); });
  };
  Oynatici.prototype.kstSayac = function (n, bitince) { // 3-2-1: hazırlanmak için
    var self = this, KS = this.KS, r = this.r;
    KS.mod = 'sayiyor'; this.kstArayuz();
    var adim = function (k) {
      if (self.KS !== KS || KS.mod !== 'sayiyor') return;
      if (k <= 0) { r.kstSayac.hidden = true; KS.mod = 'bos'; bitince(); return; }
      r.kstSayac.innerHTML = '<span>' + k + '</span>'; r.kstSayac.hidden = false;
      KS.sayacZaman = setTimeout(function () { adim(k - 1); }, 650);
    };
    adim(n);
  };
  Oynatici.prototype.kstSayacDur = function () {
    var KS = this.KS; if (!KS) return;
    clearTimeout(KS.sayacZaman); this.r.kstSayac.hidden = true;
    if (KS.mod === 'sayiyor') KS.mod = 'bos';
    this.kstArayuz();
  };
  Oynatici.prototype.kstKayitBasla = function (i) {
    var self = this, KS = this.KS; if (!KS || KS.mod !== 'bos') return;
    KS.mod = 'hazirlaniyor'; this.kstArayuz();
    this.kayitBaslat(i).then(function (k) {
      if (self.KS !== KS) { self.kayitBitir(); return; }
      KS.mod = 'kayit';
      KS.saat = function () { return (performance.now() - k.t0()) / 1000; };
      KS.yuzey.basla(); self.kstMurekkep(i);
      self.kstGoster(0); self.kstDongu(); self.kstArayuz();
      self.kstSeviyeBasla(k.akis);
    }).catch(function () {
      if (self.KS !== KS) return;
      KS.mod = 'bos'; self.kstArayuz(); self.kstIpucu('Mikrofon açılamadı. Bu site için mikrofon iznini ver.');
    });
  };
  Oynatici.prototype.kstKayitBitir = function (kapaniyor) {
    var self = this, KS = this.KS; if (!KS || KS.mod !== 'kayit') return Promise.resolve();
    this.kstSeviyeDur();
    var i = KS.i, B = KS.O.G.tahta, v = KS.yuzey.bitir();
    KS.saat = null; KS.mod = 'kaydediliyor'; cancelAnimationFrame(KS.raf); this.kstArayuz();
    var kayit = v.izler.length || v.olay.length ? { surum: 1, izler: v.izler, olay: v.olay, g: B.g, y: B.h, metin: KS.A[i].s, tarih: Date.now() } : false;
    return this.kayitBitir(kayit).then(function (ok) {
      if (self.KS !== KS) return;
      return self.kstYenile(i).then(function () {
        KS.mod = 'bos';
        if (kapaniyor) return;
        if (!ok) { self.kstAdim(i); self.kstIpucu('Kayıt çok kısa ya da sessiz kaldı; yeniden dene.'); return; }
        var ad = KS.A[i].gorsel ? 'sayfa' : 'cümle';
        if (i < KS.A.length - 1) {
          self.kstAdim(i + 1); self.kstIpucu('✓ Kaydedildi · sıradaki ' + ad);
          if (KS.eller && !KS.ellerDur) setTimeout(function () { if (self.KS === KS && KS.mod === 'bos' && KS.eller) self.kstKayit(true); }, 700); // eller serbest: sıradaki cümle kendiliğinden başlar
        } else { self.kstAdim(i); self.kstIpucu('✓ Kaydedildi · son ' + ad + 'ydi'); if (KS.eller) { KS.eller = false; self.kstArayuz(); } }
      });
    }).catch(function () { if (self.KS === KS) { KS.mod = 'bos'; if (!kapaniyor) self.kstAdim(i); } });
  };
  // ses düzeyi göstergesi ve eller serbest kayıt: konuşma bitip 1,6 sn sessiz kalınca (kalem de durmuşsa) kayıt kendiliğinden biter
  Oynatici.prototype.kstSesBaglam = function () {
    var KS = this.KS; if (!KS) return null;
    if (!KS.sesAC) { var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; try { KS.sesAC = new AC(); } catch (e) { return null; } }
    if (KS.sesAC.state === 'suspended' && KS.sesAC.resume) { try { KS.sesAC.resume(); } catch (e) {} }
    return KS.sesAC;
  };
  Oynatici.prototype.kstSeviyeBasla = function (akis) {
    var self = this, KS = this.KS, r = this.r;
    this.kstSeviyeDur();
    if (!akis || !akis.getAudioTracks || !akis.getAudioTracks().length) return;
    var ac = this.kstSesBaglam(); if (!ac) return;
    var kaynak = ac.createMediaStreamSource(akis), an = ac.createAnalyser(); an.fftSize = 1024; kaynak.connect(an);
    var buf = new Float32Array(an.fftSize), t0 = performance.now(), taban = [], esik = 0.012, konusma = 0, sessiz = 0, son = t0, bar = r.kstSeviye.firstChild;
    r.kstSeviye.hidden = false;
    var dongu = function () {
      if (self.KS !== KS || KS.mod !== 'kayit') return;
      var simdi = performance.now(), dt = (simdi - son) / 1000; son = simdi;
      if (an.getFloatTimeDomainData) an.getFloatTimeDomainData(buf); else { var b8 = new Uint8Array(an.fftSize); an.getByteTimeDomainData(b8); for (var j = 0; j < b8.length; j++) buf[j] = (b8[j] - 128) / 128; }
      var t = 0, tepe = 0; for (var i = 0; i < buf.length; i++) { t += buf[i] * buf[i]; tepe = Math.max(tepe, Math.abs(buf[i])); }
      var rms = Math.sqrt(t / buf.length), db = 20 * Math.log10(rms + 1e-9);
      bar.style.width = Math.max(0, Math.min(100, (db + 60) / 54 * 100)) + '%';
      r.kstSeviye.classList.toggle('yuksek', tepe > 0.97); r.kstSeviye.classList.toggle('dusuk', db < -50);
      var gecen = (simdi - t0) / 1000;
      taban.push(rms); if (taban.length > 480) taban.shift(); // gürültü tabanı: son ~8 sn'nin en sessiz %10'u (hemen konuşmaya başlansa da şaşmaz)
      if (taban.length % 15 === 1) { var sr = taban.slice().sort(function (a, b) { return a - b; }); esik = Math.min(0.035, Math.max(0.008, sr[Math.floor(sr.length * 0.1)] * 3.2)); }
      if (gecen > 0.3 && KS.eller) {
        if (rms > esik) { konusma += dt; sessiz = 0; } else sessiz += dt;
        var kalem = KS.yuzey && (KS.yuzey.yaziyor() || simdi - KS.yuzey.sonHareket() < 1500);
        if (konusma > 0.35 && sessiz > 1.6 && !kalem) { self.kstKayitBitir(); return; }
      }
      KS.seviyeRaf = requestAnimationFrame(dongu);
    };
    KS.seviye = { ac: ac, kaynak: kaynak };
    KS.seviyeRaf = requestAnimationFrame(dongu);
  };
  Oynatici.prototype.kstSeviyeDur = function () {
    var KS = this.KS; if (!KS) return;
    cancelAnimationFrame(KS.seviyeRaf);
    if (KS.seviye) { try { KS.seviye.kaynak.disconnect(); } catch (e) {} KS.seviye = null; }
    if (this.r.kstSeviye) this.r.kstSeviye.hidden = true;
  };
  Oynatici.prototype.kstEllerDegis = function () {
    var KS = this.KS; if (!KS) return;
    KS.eller = !KS.eller; depo.yaz('kstEller', KS.eller);
    this.kstIpucu(KS.eller ? 'Eller serbest: konuşman bitince kayıt durur, sıradaki cümle kendiliğinden başlar' : 'Eller serbest kapandı');
    this.kstArayuz();
  };
  Oynatici.prototype.kstIsikBak = function () { // kamera açıkken ışık az ya da arkadan geliyorsa uyarır
    var self = this, KS = this.KS, r = this.r;
    clearInterval(this.kstIsikZaman);
    var tv = document.createElement('canvas'); tv.width = tv.height = 24; var c = tv.getContext('2d');
    this.kstIsikZaman = setInterval(function () {
      if (!self.KS || self.r.kst.hidden) { clearInterval(self.kstIsikZaman); return; }
      var v = r.kameraVideo, yazi = '';
      if (self.kameraAkis && v && v.readyState >= 2) {
        try {
          c.drawImage(v, 0, 0, 24, 24); var d = c.getImageData(0, 0, 24, 24).data, top = 0, orta = 0, kn = 0, on = 0;
          for (var y = 0; y < 24; y++) for (var x = 0; x < 24; x++) { var i = (y * 24 + x) * 4, l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; top += l; if (x > 7 && x < 16 && y > 5 && y < 16) { orta += l; on++; } else kn++; }
          var ort = top / 576, ortaL = orta / on, kenarL = (top - orta) / kn;
          if (ort < 55) yazi = '💡 Işık az: yüzünü pencereye ya da lambaya çevir';
          else if (kenarL - ortaL > 45) yazi = '💡 Arkandaki ışık güçlü: ışık önünden gelsin';
        } catch (e) {}
      }
      r.kstIsik.textContent = yazi; r.kstIsik.hidden = !yazi;
    }, 1500);
  };
  Oynatici.prototype.kstSesCal = function (mod) { // 'ustune' ya da 'dinle': adımın kaydı çalar, yüz videosu yuvarlakta
    var self = this, KS = this.KS, i = KS.i, a = KS.A[i];
    KS.mod = 'hazirlaniyor'; this.kstArayuz();
    Ses.kilidiAc();
    return Promise.all([this.kayitBul(a.s), yuzOynatimAl(a.s)]).then(function (s2) {
      var k = s2[0], yuz = s2[1];
      if (self.KS !== KS || !k) { yuzSal(yuz); if (self.KS === KS) { KS.mod = 'bos'; self.kstArayuz(); } return; }
      var au = Ses.ortak(); au.onended = au.onerror = au.onloadedmetadata = null;
      try { au.defaultPlaybackRate = 1; au.playbackRate = 1; } catch (e) {}
      au.src = k.url; KS.au = au; KS.auKayit = k;
      KS.saat = function () { return au.src === k.url ? au.currentTime : null; };
      au.onended = function () {
        if (self.KS !== KS) return;
        if (KS.mod === 'ustune') self.kstUstuneBitir();
        else if (KS.mod === 'dinle') { self.kstSus(); self.kstGoster(self.kstSonT(KS.i)); }
      };
      var p = au.play(); if (p && p.catch) p.catch(function () { if (self.KS === KS && KS.mod === mod) { if (mod === 'ustune') self.kstUstuneBitir(); else self.kstSus(); } });
      if (yuz && yuz.tur === 'video') self.studyoVideoOynat(yuz, au, k.url); else if (yuz) self.studyoYuzOynat(yuz, au, k.url);
      KS.mod = mod;
      if (mod === 'ustune') { KS.yuzey.basla(); self.kstMurekkep(i); } else self.kstMurekkep(null);
      self.kstGoster(0); self.kstDongu(); self.kstArayuz();
    }).catch(function () { if (self.KS === KS && KS.mod === 'hazirlaniyor') { KS.mod = 'bos'; self.kstArayuz(); } });
  };
  Oynatici.prototype.kstSesBirak = function () {
    var KS = this.KS; if (!KS) return;
    if (KS.au) { try { KS.au.pause(); } catch (e) {} KS.au.onended = null; KS.au = null; }
    if (KS.auKayit && KS.auKayit.yerel) { var u = KS.auKayit.url; setTimeout(function () { URL.revokeObjectURL(u); }, 1500); }
    KS.auKayit = null; KS.saat = null; cancelAnimationFrame(KS.raf);
  };
  Oynatici.prototype.kstUstune = function () {
    var KS = this.KS; if (!KS || !KS.O) return;
    if (KS.mod === 'ustune') { this.kstUstuneBitir(); return; }
    if (KS.mod === 'dinle') this.kstSus();
    if (KS.mod !== 'bos' || !KS.kayit[KS.i]) return;
    this.kstSesCal('ustune');
  };
  Oynatici.prototype.kstUstuneBitir = function (kapaniyor) {
    var self = this, KS = this.KS; if (!KS || KS.mod !== 'ustune') return Promise.resolve();
    var i = KS.i, B = KS.O.G.tahta, h = ozet(KS.A[i].s), v = KS.yuzey.bitir();
    this.kstSesBirak(); KS.mod = 'kaydediliyor'; this.kstArayuz();
    var yeni = v.izler.length || v.olay.length; // hiç çizmediyse eski çizim kalır
    var is = yeni ? Kayitlar.koy('c:' + h, { surum: 1, izler: v.izler, olay: v.olay, g: B.g, y: B.h, metin: KS.A[i].s, tarih: Date.now() }) : Promise.resolve();
    return is.then(function () { return self.kstYenile(i); }).then(function () {
      if (self.KS !== KS) return;
      KS.mod = 'bos'; self.studyoCiz();
      if (!kapaniyor) { self.kstAdim(i); self.kstIpucu(yeni ? '✓ Çizim kaydedildi' : 'Çizim yapılmadı; önceki hâli duruyor'); }
    }).catch(function () { if (self.KS === KS) { KS.mod = 'bos'; if (!kapaniyor) self.kstAdim(i); } });
  };
  Oynatici.prototype.kstDinle = function () {
    var KS = this.KS; if (!KS || !KS.O) return;
    if (KS.mod === 'dinle') { this.kstSus(); this.kstGoster(this.kstSonT(KS.i)); return; }
    if (KS.mod !== 'bos' || !KS.kayit[KS.i]) return;
    this.kstSesCal('dinle');
  };
  Oynatici.prototype.kstSus = function () {
    var KS = this.KS; if (!KS) return;
    this.kstSesBirak();
    if (KS.mod === 'dinle') KS.mod = 'bos';
    this.r.kstSure.textContent = '';
    this.kstArayuz();
  };
  Oynatici.prototype.kstCizimSil = function () {
    var self = this, KS = this.KS; if (!KS || KS.mod !== 'bos') return;
    var i = KS.i;
    Kayitlar.sil('c:' + ozet(KS.A[i].s)).then(function () { if (self.KS !== KS) return; KS.veri[i] = null; self.kstAdim(i); self.studyoCiz(); self.kstIpucu('Çizim silindi; sesin duruyor'); });
  };
  Oynatici.prototype.kstKapat = function () {
    var self = this, KS = this.KS, r = this.r; if (!KS) return Promise.resolve();
    KS.eller = false; this.kstSayacDur(); clearInterval(this.kstIsikZaman);
    if (KS.sesAC) { var acK = KS.sesAC; setTimeout(function () { try { acK.close(); } catch (e) {} }, 1500); }
    var bitis = KS.mod === 'kayit' ? this.kstKayitBitir(true) : KS.mod === 'ustune' ? this.kstUstuneBitir(true) : null;
    if (KS.mod === 'dinle') this.kstSus();
    var kapat = function () {
      if (self.KS !== KS) return;
      cancelAnimationFrame(KS.raf);
      if (KS.yuzey) KS.yuzey.kapat();
      self.kstSesBirak();
      self.KS = null; r.kst.hidden = true;
      var eski = r.kstTahta.querySelector('canvas.tahta-tuval'); if (eski) eski.parentNode.removeChild(eski);
      self.kstKameraYerlestir(false);
      self.studyoCiz(); self.kayitDurumu();
    };
    if (bitis && bitis.then) return bitis.then(kapat, kapat);
    kapat(); return Promise.resolve();
  };

  /* ---- sesli anlatımı tek dosya olarak indir: doğal ses ya da öğretmenin kendi kaydı ---- */
  // Cihaz sesi (tarayıcının konuşma motoru) dosyaya kaydedilemez; bu yüzden yalnız bu iki kaynak sunulur.
  var INDIR_ORAN = 24000;
  function slugla(t) {
    var h = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'Ç': 'c', 'Ğ': 'g', 'İ': 'i', 'Ö': 'o', 'Ş': 's', 'Ü': 'u' };
    return String(t || 'ders').replace(/[çğıöşüÇĞİÖŞÜ]/g, function (c) { return h[c]; }).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'ders';
  }
  function sureYazi(sn) { sn = Math.max(1, Math.round(sn)); var d = Math.floor(sn / 60), k = sn % 60; return d ? d + ' dk' + (k ? ' ' + k + ' sn' : '') : k + ' sn'; }
  function kalanYazi(sn) { return sn >= 90 ? Math.round(sn / 60) + ' dk' : Math.max(10, Math.round(sn / 10) * 10) + ' sn'; } // tahmin oynak: kaba yuvarlanır
  function boyutYazi(b) { return b >= 1048576 ? (b / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; }
  var lameSoz = null;
  function lameYukle() { // MP3 kodlayıcı yalnız gerektiğinde yüklenir; yüklenemezse dosya WAV olur
    if (window.lamejs && window.lamejs.Mp3Encoder) return Promise.resolve(window.lamejs);
    if (lameSoz) return lameSoz;
    lameSoz = ['https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/lamejs/1.2.1/lame.min.js'].reduce(function (zincir, u) {
      return zincir.catch(function () {
        return new Promise(function (ok, red) {
          var sc = document.createElement('script'), zaman = setTimeout(function () { red(new Error('zaman aşımı')); }, 15000);
          sc.src = u; sc.async = true;
          sc.onload = function () { clearTimeout(zaman); if (window.lamejs && window.lamejs.Mp3Encoder) ok(window.lamejs); else red(new Error('kodlayıcı yok')); };
          sc.onerror = function () { clearTimeout(zaman); red(new Error('yüklenemedi')); };
          document.head.appendChild(sc);
        });
      });
    }, Promise.reject(new Error('başla')));
    lameSoz.catch(function () { lameSoz = null; });
    return lameSoz;
  }
  function cozucuYap() { // 24 kHz'lik çevrimdışı ses bağlamı: çözülen her ses bu hıza dönüşür
    var O = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!O) return null;
    var oranlar = [48000, 44100, INDIR_ORAN]; // 48 kHz: sesin "havası" korunur
    for (var i = 0; i < oranlar.length; i++) { try { return new O(1, 1, oranlar[i]); } catch (e) {} }
    return null;
  }
  function sesCoz(ctx, buf) {
    return new Promise(function (ok, red) {
      try { var p = ctx.decodeAudioData(buf, ok, red); if (p && p.then) p.then(ok, red); } catch (e) { red(e); }
    });
  }
  // tek kanala indir, baştaki ve sondaki sessizliği kırp, ses düzeyini eşitle (yaklaşık −20 dBFS)
  var SES_ISLE = false; // indirirken "Stüdyo sesi" açıksa kendi kayıtların temizlenir
  function parcaHazirla(ab, kayitMi) {
    var n = ab.length, k = ab.numberOfChannels, v = new Float32Array(n), c, i;
    for (c = 0; c < k; c++) { var d = ab.getChannelData(c); for (i = 0; i < n; i++) v[i] += d[i] / k; }
    if (kayitMi && SES_ISLE && window.SesliSes) { try { v = window.SesliSes.sesIsle(v, ab.sampleRate); } catch (e) { if (window.console) console.warn('Stüdyo sesi:', e); } }
    var esik = 0.012, bas = 0, son = n - 1, pay = Math.round(ab.sampleRate * 0.08);
    while (bas < n && Math.abs(v[bas]) < esik) bas++;
    while (son > bas && Math.abs(v[son]) < esik) son--;
    if (son <= bas) return null;
    v = v.subarray(Math.max(0, bas - pay), Math.min(n, son + pay + 1));
    var top = 0, say = 0;
    for (i = 0; i < v.length; i++) { var x = v[i]; if (x > esik || x < -esik) { top += x * x; say++; } }
    var rms = say ? Math.sqrt(top / say) : 0, kazanc = rms ? Math.max(0.5, Math.min(kayitMi ? 4 : 2, 0.1 / rms)) : 1;
    if (Math.abs(kazanc - 1) > 0.02) { var w = new Float32Array(v.length); for (i = 0; i < v.length; i++) w[i] = v[i] * kazanc; v = w; }
    v.kirpBas = Math.max(0, bas - pay) / ab.sampleRate; v.kendi = !!kayitMi; // yüz kareleri bu kaymayla eşlenir
    return v;
  }
  function int16Yap(f) { // yumuşak sınırlayıcıyla 16 bit tam sayıya
    var o = new Int16Array(f.length);
    for (var i = 0; i < f.length; i++) {
      var x = f[i];
      if (x > 0.95) x = 0.95 + 0.05 * Math.tanh((x - 0.95) / 0.05); else if (x < -0.95) x = -0.95 - 0.05 * Math.tanh((-x - 0.95) / 0.05);
      o[i] = x < 0 ? Math.round(x * 32768) : Math.round(x * 32767);
    }
    return o;
  }
  function wavYap(i16, oran) {
    var b = new ArrayBuffer(44 + i16.length * 2), d = new DataView(b);
    var yaz = function (o, t) { for (var i = 0; i < t.length; i++) d.setUint8(o + i, t.charCodeAt(i)); };
    yaz(0, 'RIFF'); d.setUint32(4, 36 + i16.length * 2, true); yaz(8, 'WAVE'); yaz(12, 'fmt ');
    d.setUint32(16, 16, true); d.setUint16(20, 1, true); d.setUint16(22, 1, true); d.setUint32(24, oran, true);
    d.setUint32(28, oran * 2, true); d.setUint16(32, 2, true); d.setUint16(34, 16, true); yaz(36, 'data'); d.setUint32(40, i16.length * 2, true);
    new Int16Array(b, 44).set(i16);
    return new Blob([b], { type: 'audio/wav' });
  }
  function mp3Yap(lame, i16, oran, ilerle) { // parça parça kodlanır; arada sayfa donmaz
    return new Promise(function (ok, red) {
      try {
        var enc = new lame.Mp3Encoder(1, oran, 64), parca = [], i = 0, BLOK = 1152, TUR = 1152 * 100;
        var adim = function () {
          try {
            var bit = Math.min(i16.length, i + TUR);
            for (; i < bit; i += BLOK) { var m = enc.encodeBuffer(i16.subarray(i, Math.min(i + BLOK, i16.length))); if (m.length) parca.push(new Uint8Array(m)); }
            ilerle(Math.min(1, i / i16.length));
            if (i < i16.length) setTimeout(adim, 0);
            else { var sn = enc.flush(); if (sn.length) parca.push(new Uint8Array(sn)); ok(new Blob(parca, { type: 'audio/mpeg' })); }
          } catch (e) { red(e); }
        };
        adim();
      } catch (e) { red(e); }
    });
  }
  /* ---- dersin bir kısmı, kapak görseli, paylaşım metni ---- */
  function htmlYazi(h) { return String(h == null ? '' : h).replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, '\'').replace(/&amp;/g, '&'); }
  function paylasimYazi(t) { // tahtadaki yazım düz metne: AgNO_3 → AgNO₃, Pb^{2+} → Pb²⁺, **2** → 2, -> → →
    t = String(t == null ? '' : t).replace(/\*\*/g, '')
      .replace(/_\{([^}]*)\}|_(\d+)/g, function (m, a, b) { return String(a != null ? a : b).replace(/\d/g, function (r) { return ALT_RAKAM.charAt(+r); }); })
      .replace(/\^\{([^}]*)\}|\^([0-9+\-−]+)/g, function (m, a, b) { return String(a != null ? a : b).replace(/\d/g, function (r) { return UST_RAKAM.charAt(+r); }).replace(/\+/g, '⁺').replace(/[−-]/g, '⁻'); })
      .replace(/<=>/g, '⇌').replace(/->/g, '→');
    return altyaziMetni(t).replace(/\s+/g, ' ').trim();
  }
  function kisalt(t, m) { t = String(t || ''); return t.length > m ? t.slice(0, m - 1).replace(/\s+\S*$/, '') + '…' : t; }
  function adimBasligi(a) { // tahtaya yazılan başlık ya da etiket (YouTube bölüm adı için)
    var l = (a && (a.w || a.h)) || [];
    for (var i = 0; i < l.length; i++) {
      var b = l[i] || {}; if (!/(^|\s)(title|label)(\s|$)/.test(String(b.c || ''))) continue;
      var t = paylasimYazi(b.t != null ? b.t : htmlYazi(b.html));
      if (t) return kisalt(t, 60);
    }
    return '';
  }
  var KONU_ETIKET = { atom: ['#atom', '#atomunyapısı'], asit: ['#asitlervebazlar', '#ph'], beher: ['#çözeltiler', '#karışımlar'], molekul: ['#kimyasalbağlar', '#moleküller'], periyodik: ['#periyodiktablo', '#elementler'],
    gaz: ['#gazlar', '#gazkanunları'], tepkime: ['#kimyasaltepkimeler', '#mol'], enerji: ['#termokimya', '#enerji'], denge: ['#kimyasaldenge', '#denge'], elektro: ['#elektrokimya', '#piller'], hiz: ['#tepkimehızı', '#katalizör'], cekirdek: ['#çekirdekkimyası', '#radyoaktivite'] };
  function kareNetlik(tv, olc) { // yüz bölgesinin keskinliği (Laplace varyansı); karanlık kare sıfır alır
    var w = tv.width, h = tv.height, k = Math.min(w, h) * 0.6, c = olc.getContext('2d', { willReadFrequently: true }), N = olc.width, i, x, y, ort = 0;
    c.drawImage(tv, (w - k) / 2, Math.max(0, Math.min(h - k, h * 0.42 - k / 2)), k, k, 0, 0, N, N);
    var d = c.getImageData(0, 0, N, N).data, g = new Float32Array(N * N);
    for (i = 0; i < g.length; i++) { g[i] = d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114; ort += g[i]; }
    if (ort / g.length < 35) return 0;
    var top = 0, top2 = 0, n = 0;
    for (y = 1; y < N - 1; y++) for (x = 1; x < N - 1; x++) { i = y * N + x; var l = 4 * g[i] - g[i - 1] - g[i + 1] - g[i - N] - g[i + N]; top += l; top2 += l * l; n++; }
    var m = top / n; return top2 / n - m * m;
  }
  function videoNetKare(v) { // yüz videosunda birkaç an dener; yüz bölgesi en net kareyi verir: { tv, n } | null
    return new Promise(function (res) {
      var url = URL.createObjectURL(v.dosya || new Blob([v.veri], { type: v.mime || 'video/mp4' })), vd = document.createElement('video');
      var sure = v.sure > 0.6 ? v.sure : 3, anlar = v.anlar || [0.3, 0.45, 0.6, 0.75].map(function (p) { return Math.max(0.15, sure * p); }), j = 0, enIyi = null, bitti = false, bs = null, basladi = false;
      var olc = document.createElement('canvas'); olc.width = olc.height = 96;
      var son = function () { if (bitti) return; bitti = true; clearTimeout(genel); clearTimeout(bs); try { vd.pause(); vd.removeAttribute('src'); vd.load(); } catch (e) {} URL.revokeObjectURL(url); res(enIyi); };
      var genel = setTimeout(son, 15000);
      var al = function () {
        if (bitti) return; if (j >= anlar.length) { son(); return; }
        var t = anlar[j++], tamam = false;
        var bak = function () {
          if (tamam || bitti) return; tamam = true; clearTimeout(bs); vd.removeEventListener('seeked', bak);
          var w = vd.videoWidth, h = vd.videoHeight;
          if (w && h) { var tv = document.createElement('canvas'); tv.width = w; tv.height = h; try { tv.getContext('2d').drawImage(vd, 0, 0, w, h); var n = kareNetlik(tv, olc); if (n > 0 && (!enIyi || n > enIyi.n)) enIyi = { n: n, tv: tv }; } catch (e) {} }
          al();
        };
        vd.addEventListener('seeked', bak); bs = setTimeout(bak, 3000);
        var ds = vd.duration; if (ds && isFinite(ds)) t = Math.min(t, Math.max(0, ds - 0.1));
        try { vd.currentTime = t; } catch (e) { bak(); }
      };
      var basla = function () { if (basladi) return; basladi = true; try { vd.pause(); } catch (e) {} al(); };
      vd.muted = true; vd.playsInline = true; vd.setAttribute('playsinline', ''); vd.preload = 'auto';
      vd.addEventListener('loadeddata', basla);
      vd.addEventListener('error', son);
      vd.src = url;
      try { var p = vd.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {} // iPhone'da kareler oynatılınca çözülür
    });
  }
  Oynatici.prototype.bolumAraligi = function (j) { // j. bölümün ilk ve son adımı
    var B = this.P.bolumler || [], n = (this.P.adimlar || []).length, bs = Math.max(0, Math.min(n - 1, B[j].adim));
    return [bs, j + 1 < B.length ? Math.max(bs, Math.min(n - 1, B[j + 1].adim - 1)) : n - 1];
  };
  Oynatici.prototype.kisimAl = function () { // indirilecek kısım: { bas, son, parca: dersin bir kısmı mı, bolum: tam bir bölümse sırası }
    var n = (this.P.adimlar || []).length, k = this.kisim, B = this.P.bolumler || [], bas = 0, son = Math.max(0, n - 1), bolum = -1;
    if (k && k.id === this.P.id && n) { bas = Math.max(0, Math.min(n - 1, k.bas | 0)); son = Math.max(bas, Math.min(n - 1, k.son | 0)); }
    var parca = n > 0 && (bas > 0 || son < n - 1);
    if (parca && B.length > 1) for (var j = 0; j < B.length; j++) { var a = this.bolumAraligi(j); if (a[0] === bas && a[1] === son) { bolum = j; break; } }
    return { bas: bas, son: son, parca: parca, bolum: bolum };
  };
  Oynatici.prototype.kisimCiz = function () { // bölüm düğmeleri, başlangıç ve bitiş adımı
    var self = this, r = this.r, A = this.P.adimlar || [], n = A.length;
    if (!r.kisimAlan) return;
    r.kisimAlan.hidden = n < 3;
    if (r.kisimAlan.hidden) return;
    var KS = this.kisimAl(), B = this.P.bolumler || [];
    var dug = '<button type="button" data-kisim="0-' + (n - 1) + '" aria-pressed="' + !KS.parca + '">Tüm ders</button>';
    if (B.length > 1) B.forEach(function (b, j) { var a = self.bolumAraligi(j); dug += '<button type="button" data-kisim="' + a[0] + '-' + a[1] + '" aria-pressed="' + (KS.bolum === j) + '">' + esc((j + 1) + '. ' + kisalt(paylasimYazi(b.ad || 'Bölüm'), 30)) + '</button>'; });
    r.kisimBolumler.innerHTML = dug;
    var imza = this.P.id + ':' + n + ':' + ozet(A.map(function (a) { return a.s; }).join('|'));
    if (this.kisimImza !== imza) {
      var se = A.map(function (a, i) { return '<option value="' + i + '">' + esc((i + 1) + '. ' + kisalt(paylasimYazi(a.s), 34)) + '</option>'; }).join('');
      r.kisimBas.innerHTML = se; r.kisimSon.innerHTML = se; this.kisimImza = imza;
    }
    r.kisimBas.value = String(KS.bas); r.kisimSon.value = String(KS.son);
    r.kisimBas.disabled = r.kisimSon.disabled = !!this.indiriliyor;
    this.kisimNotYaz();
  };
  Oynatici.prototype.kisimNotYaz = function () { // seçilen kısmın adım sayısı ve yaklaşık süresi
    var r = this.r, A = this.P.adimlar || [], KS = this.kisimAl();
    if (!r.kisimNot || !A.length || r.kisimAlan.hidden) return;
    var ks = this.kayitSure && this.kayitSure.id === this.P.id && this.indirSecim === 'kayit' ? this.kayitSure.l : null, t = 0.6, i;
    for (i = KS.bas; i <= KS.son && A[i]; i++) { var k = ks && ks[i]; t += (k > 0 ? k : String(A[i].s || '').length / 14) + (A[i].sil && i > KS.bas ? 1.1 : 0.6); }
    var video = (this.indirBicim || 'mp3') === 'mp4', SA = video ? this.sunumAyar() : null;
    if (SA && SA.giris && window.SesliSunum) t += window.SesliSunum.GIRIS_SURE;
    if (SA && SA.kapanis && window.SesliSunum) t += window.SesliSunum.KAPANIS_SURE;
    var n = KS.son - KS.bas + 1, yazi = (KS.parca ? (KS.bas + 1) + '–' + (KS.son + 1) + '. adımlar (' + n + ' adım)' : 'Dersin tamamı (' + n + ' adım)') + ' · yaklaşık ' + sureYazi(Math.max(5, Math.round(t / 5) * 5));
    if (video && (this.indirPlat === 'reels' || this.indirPlat === 'gonderi') && t > 180) yazi += '. Reels ve Shorts için 3 dakikayı geçmemesi iyi olur: daha kısa bir kısım seçebilirsin.';
    r.kisimNot.textContent = yazi;
  };
  Oynatici.prototype.kapakImza = function () { // kapağı değiştiren ayarlar: biri değişince hazırlanmış kapak eskir
    var A = this.sunumAyar() || {};
    return JSON.stringify([this.P.id, this.indirPlat, A.baslik, A.alt, A.kanal, A.motif, ayar.ogretmen, ayar.ikili, ayar.gorunum, this.indirArka, this.indirCerceve, !!(this.r.indirIsik && this.r.indirIsik.checked)]);
  };
  Oynatici.prototype.kapakSifirla = function () {
    var r = this.r;
    if (this.kapakUrl) { URL.revokeObjectURL(this.kapakUrl); this.kapakUrl = null; }
    this.kapakDosya = null; this.kapakImzasi = null;
    if (!r.kapakLink) return;
    r.kapakLink.hidden = true; r.kapakLink.setAttribute('href', '#'); r.kapakPaylas.hidden = true;
    r.kapakOnizleme.hidden = true; r.kapakOnizleme.innerHTML = '';
    if (!this.kapakYapiliyor) r.kapakDugme.textContent = '🖼️ Kapak hazırla';
  };
  Oynatici.prototype.kapakFoto = function () { // kapaktaki yüz: kayıttaki videodan en net kare, yoksa fotoğrafın; çizgi figürde yüz yok
    var self = this, ST = window.SesliStudyo, A = this.P.adimlar || [], KS = this.kisimAl(), ekranM = this.ekranModu(), Yv = this.yuzVid, E = this.ekran;
    if (!(ekranM && Yv) && (!ayar.ogretmen || ayar.ikili || ayar.gorunum === 'figur')) return Promise.resolve(null);
    var foto = function () { return Foto.yukle().then(function () { return Foto.resim || null; }); };
    var sira = A.slice(KS.bas, KS.son + 1).concat(A.slice(0, KS.bas)).slice(0, 10), bulunan = 0, enIyi = null;
    var dene = function (i) { // en çok iki videoya bakılır
      if (i >= sira.length || bulunan >= 2) return enIyi ? Promise.resolve(enIyi.tv) : foto();
      return Kayitlar.al('v:' + ozet(sira[i].s)).then(function (v) {
        if (!v || !v.veri) return dene(i + 1);
        bulunan++;
        return videoNetKare(v).then(function (k) { if (k && (!enIyi || k.n > enIyi.n)) enIyi = k; return dene(i + 1); });
      }, function () { return dene(i + 1); });
    };
    var ham = ekranM ? (Yv ? videoNetKare({ dosya: Yv.dosya, sure: Yv.d.sure, anlar: E ? [0.25, 0.4, 0.55, 0.7].map(function (p) { return Math.max(0.15, E.bas + p * (E.son - E.bas) + Yv.ofs); }) : null }).then(function (k) { return k ? k.tv : foto(); }) : foto())
      : ayar.gorunum === 'video' ? dene(0) : foto();
    return ham.then(function (im) {
      if (!im || !ST || !ST.gorunum) return im;
      var isik = !!(self.r.indirIsik && self.r.indirIsik.checked), arka = self.indirArka || 'bulanik';
      if (!isik && arka === 'yok') return im;
      var ay = arka !== 'yok' ? Promise.race([ST.ayiriciYukle(), sleep(20000).then(function () { throw new Error('zaman aşımı'); })]).catch(function () { return null; }) : Promise.resolve(null);
      return ay.then(function (ayirici) { // videodaki stüdyo görünümü kapağa da uygulanır
        var w = im.width || im.naturalWidth || im.videoWidth, h = im.height || im.naturalHeight || im.videoHeight, k = Math.min(w, h, 1080);
        if ((!isik && !ayirici) || !w || !h) return im;
        var c = ST.gorunum({ isik: isik, arka: ayirici ? arka : 'yok', ayirici: ayirici }).isle(im, w, h, k, k, 0.5, 0.3, 0), tv = document.createElement('canvas');
        tv.width = tv.height = k; tv.getContext('2d').drawImage(c, 0, 0); return tv;
      });
    }).catch(function () { return null; });
  };
  Oynatici.prototype.kapakYap = function () { // Reels kapağı ya da YouTube küçük resmi: başlık, konunun çizimi ya da öğretmenin yüzü, kanal adı
    var self = this, r = this.r, SU = window.SesliSunum, ST = window.SesliStudyo, A = this.sunumAyar();
    if (!SU || !SU.kapak || !A || this.kapakYapiliyor) return;
    var plat = ST && ST.BICIMLER[this.indirPlat] ? this.indirPlat : 'yt', boy = plat === 'reels' ? [1080, 1920] : plat === 'gonderi' ? [1080, 1350] : [1280, 720], imza = this.kapakImza();
    this.kapakYapiliyor = true; r.kapakDugme.disabled = true; r.kapakDugme.textContent = 'Hazırlanıyor…';
    this.kapakFoto().then(function (foto) {
      var tv = SU.kapak({ G: boy[0], Y: boy[1], baslik: A.baslik, alt: A.alt, kullanici: A.kanal, motif: A.motif, foto: foto, filigran: A.kanal ? 'Instagram’da ' + A.kanal : '' });
      return new Promise(function (res, rej) { tv.toBlob(function (b) { if (b) res(b); else rej(new Error('kapak')); }, 'image/jpeg', 0.92); });
    }).then(function (blob) {
      self.kapakYapiliyor = false; self.kapakSifirla();
      var ad = 'kapak-' + slugla(A.baslik + (A.alt ? ' ' + A.alt : '')) + '-' + plat + '.jpg';
      self.kapakUrl = URL.createObjectURL(blob); self.kapakImzasi = imza;
      try { self.kapakDosya = new File([blob], ad, { type: 'image/jpeg' }); } catch (e) { self.kapakDosya = null; }
      r.kapakLink.setAttribute('href', self.kapakUrl); r.kapakLink.setAttribute('download', ad); r.kapakLink.hidden = false;
      r.kapakLink.textContent = '⬇ Kapağı indir (JPEG, ' + boyutYazi(blob.size) + ')';
      var paylas = false; try { paylas = !!(self.kapakDosya && navigator.share && navigator.canShare && navigator.canShare({ files: [self.kapakDosya] })); } catch (e) {}
      r.kapakPaylas.hidden = !paylas;
      r.kapakOnizleme.innerHTML = '<img alt="Kapak görseli" src="' + self.kapakUrl + '">'; r.kapakOnizleme.hidden = false;
    }).catch(function (e) {
      self.kapakYapiliyor = false; r.kapakNot.textContent = 'Kapak hazırlanamadı. Yeniden dene.';
      if (window.console) console.warn('Kapak görseli:', e);
    }).then(function () { r.kapakDugme.disabled = false; r.kapakDugme.textContent = self.kapakUrl ? '🖼️ Yeniden hazırla' : '🖼️ Kapak hazırla'; });
  };
  Oynatici.prototype.youtubeBolumleri = function (d, KS, A) { // YouTube bölümleri: 0:00'dan başlar, en az üç bölüm, her biri en az 10 sn
    var z = d && d.zamanlar, B = this.P.bolumler || [], L = [], k;
    if (!z || !z.adim || !z.adim.length || !A || !A.length) return [];
    var dersAd = paylasimYazi((this.P.ders && this.P.ders.baslik) || '').toLocaleLowerCase('tr');
    var ad = function (t) { return kisalt(paylasimYazi(t), 60); };
    var ilkAd = function (t) { t = ad(t); return !t || t.toLocaleLowerCase('tr') === dersAd ? 'Giriş' : t; };
    if (B.length > 1) { // dersin bölümleri; kısım bir bölümün ortasından başlıyorsa ilk bölüm onun adını alır
      var icinde = null; B.forEach(function (b) { if (b.adim <= KS.bas) icinde = b; });
      L.push({ t: 0, ad: ilkAd(icinde ? icinde.ad : '') });
      B.forEach(function (b) { var k2 = b.adim - KS.bas; if (k2 > 0 && k2 < A.length) L.push({ t: z.adim[k2], ad: ad(b.ad) || 'Bölüm' }); });
    }
    if (L.length < 3) { // bölüm yoksa tahtanın yeni sayfaları: başlığı ya da etiketi olanlar
      L = [{ t: 0, ad: ilkAd(adimBasligi(A[0])) }];
      for (k = 1; k < A.length; k++) { if (!A[k].sil) continue; var a2 = adimBasligi(A[k]); if (a2 && a2 !== L[L.length - 1].ad) L.push({ t: z.adim[k], ad: a2 }); }
    }
    var S = [];
    L.forEach(function (b) { if (!S.length || b.t - S[S.length - 1].t >= 10) S.push(b); });
    while (S.length > 1 && (d.sure || 0) - S[S.length - 1].t < 10) S.pop();
    return S.length >= 3 ? S.map(function (b) { return saatYazi(b.t) + ' ' + b.ad; }) : [];
  };
  Oynatici.prototype.paylasimMetni = function (d, KS, A) { // açıklamaya yapıştırılacak metin; YouTube için ayrıca başlık ve bölümler
    var SA = this.sunumAyar() || {}, yt = !window.SesliStudyo || this.indirPlat === 'yt' || this.indirPlat === 'hizli';
    var baslik = SA.baslik || this.varsayilanBaslik(), alt = SA.alt || '', kanal = SA.kanal || '', acik = '', c = 0, i;
    for (i = 0; i < A.length && c < 2; i++) { var s = paylasimYazi(A[i].s); if (!s) continue; if (acik && acik.length + s.length > 230) break; acik += (acik ? ' ' : '') + s; c++; }
    var konu = KONU_ETIKET[SA.motif] || [], sinif = (baslik + ' ' + alt).toLocaleLowerCase('tr').match(/(^|\D)(9|10|11|12)\.\s*sınıf/), gor = {};
    var etiket = ['#kimya', konu[0], sinif ? '#' + sinif[2] + 'sınıf' : null, '#yks', '#kimyadersi', konu[1], '#tyt', '#ayt', '#kimyaöğretmeni']
      .filter(function (e) { if (!e || gor[e]) return false; gor[e] = 1; return true; }).slice(0, yt ? 6 : 5);
    var bas = baslik + (alt ? (yt ? ' | ' : ' · ') + alt : ''), sat = [];
    if (yt) {
      if (acik) sat.push(acik, '');
      var bl = this.youtubeBolumleri(d, KS, A);
      if (bl.length) sat.push('Bölümler', bl.join('\n'), '');
      if (kanal) sat.push('Instagram’da ' + kanal, '');
      sat.push(etiket.join(' '));
      return { baslik: kisalt(bas, 100), metin: sat.join('\n') };
    }
    sat.push(bas + ' ⚗️', '');
    if (acik) sat.push(acik, '');
    sat.push('📌 Kaydet, tekrar ederken işine yarasın.');
    if (kanal) sat.push('Daha fazlası için takip et: ' + kanal);
    sat.push('', etiket.join(' '));
    return { baslik: '', metin: sat.join('\n') };
  };
  /* ---- ekran kaydından video (GoodNotes): tahta ekran kaydından, yüz aynı anda çekilmiş videodan ---- */
  Oynatici.prototype.ekranModu = function () { return (this.indirBicim || 'mp3') === 'mp4' && this.vidKaynak === 'ekran' && !!window.SesliVideo && !!window.SesliStudyo; };
  function tekKanal(ab) { var n = ab.length, k = ab.numberOfChannels, v = new Float32Array(n); for (var c = 0; c < k; c++) { var dd = ab.getChannelData(c); for (var i = 0; i < n; i++) v[i] += dd[i] / k; } return v; }
  function dosyaSesi(d, ctx) { // içe alınan videonun sesi → { veri: tek kanal, oran, bas: ilk örneğin zamanı }
    // AAC izleri M4A'ya sarılıp çözülür; birden çok iz varsa (ekran kaydında uygulama sesi ve mikrofon) karıştırılır
    var izler = (d.sesler && d.sesler.length ? d.sesler : d.ses ? [d.ses] : []).filter(function (s) { return s && s.asc; });
    if (!izler.length) { // dosya ayrıştırılamadıysa tamamı çözülür (ekran kayıtları genelde küçüktür)
      if (!d.dosya || d.dosya.size > 400 * 1048576) return Promise.resolve(null);
      return blobTampon(d.dosya).then(function (buf) { return sesCoz(ctx, buf); }).then(function (ab) { return { veri: tekKanal(ab), oran: ab.sampleRate, bas: 0 }; }, function () { return null; });
    }
    return Promise.all(izler.map(function (s) {
      return window.SesliVideo.sesOrnekleri(d, s).then(function (o) {
        return blobTampon(mp4Yap([sesIzi({ ornekler: o, asc: s.asc, kanal: s.kanal, oran: s.oran, bit: 128000, opus: false }, 1)], 'M4A ', 'audio/mp4'));
      }).then(function (buf) { return sesCoz(ctx, buf); }).then(function (ab) { return { veri: tekKanal(ab), oran: ab.sampleRate, bas: s.kayma || 0 }; }, function (e) { if (window.console) console.warn('Ses izi çözülemedi:', e); return null; });
    })).then(function (l) {
      l = l.filter(Boolean); if (!l.length) return null; if (l.length === 1) return l[0];
      var oran = l[0].oran, bas = Math.min.apply(null, l.map(function (x) { return x.bas; })), son = 0;
      l = l.filter(function (x) { return x.oran === oran; });
      l.forEach(function (x) { son = Math.max(son, x.bas - bas + x.veri.length / oran); });
      var v = new Float32Array(Math.ceil(son * oran));
      l.forEach(function (x) { var o = Math.round((x.bas - bas) * oran); for (var i = 0; i < x.veri.length && o + i < v.length; i++) v[o + i] += x.veri[i]; });
      return { veri: v, oran: oran, bas: bas };
    });
  }
  function cevrilsin(d) { // önce hızlı okunacak biçime çevrilecek kayıt: cihazın oynatıcısıyla okunan ya da iPhone'un HEVC videosu
    var SV = window.SesliVideo; return !!(d && SV && SV.cevirebilir && SV.cevirebilir() && (d.oge || SV.hevcMi(d)));
  }
  function oynaticiNotu(E, Y) { // hızlı yolla çözülemeyen ya da çevrilecek kayıt: hangisi, neden (ekran görüntüsüyle sorulabilsin diye kısa ayrıntı)
    var l = [], neden = [];
    if (E && (E.d.oge || cevrilsin(E.d))) { l.push('ekran kaydı'); if (E.d.neden) neden.push(E.d.neden); }
    if (Y && (Y.d.oge || cevrilsin(Y.d) || (E && cevrilsin(E.d)))) { l.push('yüz videosu'); if (Y.d.neden) neden.push(Y.d.neden); }
    if (!l.length) return '';
    var m = l.join(' ve '), SV = window.SesliVideo, cev = !!(SV && SV.cevirebilir && SV.cevirebilir()); m = m.charAt(0).toLocaleUpperCase('tr') + m.slice(1);
    return ' ' + m + (cev ? ' önce hızlı okunacak biçime çevrilecek (kaydın süresinin yaklaşık yarısı kadar sürer).' : ' cihazın oynatıcısıyla işlenecek; hazırlaması daha uzun sürer.') +
      (neden.length ? ' (Ayrıntı: ' + neden.join(' / ') + ')' : '');
  }
  function dusukMu(g, y) { return Math.min(g || 9999, y || 9999) < 720; } // WhatsApp gibi uygulamalar videoyu küçültür
  function sessizMi(s) { // en yüksek nokta −54 dB'in altındaysa kayıtta ses yok sayılır (ekran kaydında mikrofon kapalı kalmış)
    if (!s || !s.veri || !s.veri.length) return true;
    var m = 0, v = s.veri; for (var i = 0; i < v.length; i += 3) { var a = v[i] < 0 ? -v[i] : v[i]; if (a > m) m = a; }
    return m < 0.002;
  }
  function sesDilimi(s, bas, sure, oran) { // [bas, bas + sure) aralığının sesi; kaydın dışında kalan yerler sessiz
    var n = Math.max(0, Math.round(sure * oran)), cik = new Float32Array(n);
    if (!s || !s.veri) return cik;
    var i0 = Math.round((bas - s.bas) * s.oran), a = Math.max(0, i0), b = Math.min(s.veri.length, i0 + n);
    if (b > a) cik.set(s.veri.subarray(a, b), a - i0);
    return cik;
  }
  Oynatici.prototype.ekranYukle = function (f) {
    var self = this, r = this.r, SV = window.SesliVideo, ctx = cozucuYap(), d = null;
    this.ekran = null; this.indirSifirla(); r.ekranAyar.hidden = true; this.indirCiz();
    r.ekranBilgi.textContent = 'Kayıt okunuyor…';
    SV.ac(f).then(function (m) {
      d = m;
      if (d.neden && window.console) console.warn('Ekran kaydı cihazın oynatıcısıyla okunuyor:', d.neden);
      r.ekranBilgi.textContent = 'Ses ayrılıyor…';
      return Promise.all([d.onizleme, ctx ? dosyaSesi(d, ctx).catch(function (e) { if (window.console) console.warn('Ekran kaydının sesi:', e); return null; }) : null]);
    }).then(function (x) {
      var ses = x[1], sessiz = !!ses && sessizMi(ses), kon = ses && !sessiz ? window.SesliVideo.konusma(ses.veri, ses.oran) : null;
      var bas = kon ? Math.max(0, kon.bas - 0.6) : 0, son = kon ? Math.min(d.sure, kon.son + 1) : d.sure;
      if (son - bas < 1) { bas = 0; son = d.sure; }
      self.ekran = { dosya: f, d: d, onizleme: x[0], ses: ses, sessiz: sessiz, kirp: { x: 0, y: 0.035, g: 1, h: 0.965 }, bas: Math.floor(bas * 2) / 2, son: Math.floor(Math.min(d.sure, Math.ceil(son * 2) / 2) * 10) / 10 };
      r.ekranBilgi.textContent = (f.name || 'Ekran kaydı') + ' · ' + sureYazi(d.sure) + ' · ' + x[0].genis + '×' + x[0].yuksek + (!ses ? ' · ses bulunamadı' : sessiz ? ' · kayıtta ses yok' : '') +
        (dusukMu(x[0].genis, x[0].yuksek) ? ' · Kayıt düşük çözünürlüklü; WhatsApp gibi uygulamalarla gönderildiyse küçültülmüş olabilir. Yazılar net görünsün diye kaydın aslını seç.' : '');
      r.ekranBas.value = String(self.ekran.bas); r.ekranSon.value = String(self.ekran.son); r.ekranBas.max = r.ekranSon.max = String(Math.floor(d.sure * 10) / 10);
      r.ekranAyar.hidden = false; self.kirpCiz();
      if (self.yuzVid) self.yuzVidEsitle();
      self.indirCiz();
    }).catch(function (e) {
      r.ekranBilgi.textContent = e && e.kullanici ? e.message : 'Kayıt okunamadı. Ayrıntı: ' + SV.hataYazi(e);
      if (window.console) console.warn('Ekran kaydı:', e);
    });
  };
  Oynatici.prototype.yuzVidYukle = function (f) {
    var self = this, r = this.r, SV = window.SesliVideo, ctx = cozucuYap(), d = null;
    this.yuzVid = null; this.indirSifirla(); this.indirCiz();
    r.yuzVidBilgi.textContent = 'Video okunuyor…';
    SV.ac(f).then(function (m) {
      d = m;
      if (d.neden && window.console) console.warn('Yüz videosu cihazın oynatıcısıyla okunuyor:', d.neden);
      r.yuzVidBilgi.textContent = 'Ses ayrılıyor…';
      return ctx ? dosyaSesi(d, ctx).catch(function () { return null; }) : null;
    }).then(function (ses) {
      self.yuzVid = { dosya: f, d: d, ses: ses, ofs: 0, guven: 0 };
      if (ses) self.ekranSes = 'yuz';
      self.yuzVidEsitle(); self.indirCiz();
    }).catch(function (e) {
      r.yuzVidBilgi.textContent = e && e.kullanici ? e.message : 'Video okunamadı. Ayrıntı: ' + SV.hataYazi(e);
      if (window.console) console.warn('Yüz videosu:', e);
    });
  };
  Oynatici.prototype.yuzVidEsitle = function () { // iki kaydı sesten eşitler: yüz zamanı = tahta zamanı + ofs
    var r = this.r, Y = this.yuzVid, E = this.ekran; if (!Y) return;
    var ad = (Y.dosya.name || 'Yüz videosu') + ' · ' + sureYazi(Y.d.sure) + (dusukMu(Y.d.video.g, Y.d.video.y) ? ' · ' + Y.d.video.g + '×' + Y.d.video.y + ': düşük çözünürlüklü; WhatsApp gibi uygulamalar videoyu küçültür. Daha net görüntü için videonun aslını seç.' : '');
    if (!E || !E.ses || E.sessiz || !Y.ses || E.ses.oran !== Y.ses.oran) { Y.ofs = 0; Y.guven = 0; r.yuzVidBilgi.textContent = ad + (!E ? ' · ekran kaydını da seç: sesinden eşleştirilecek.' : ' · ses olmadığı için eşleştirilemedi; aynı anda başlamış sayıldı.'); return; }
    var s = window.SesliVideo.esitle(E.ses.veri, Y.ses.veri, E.ses.oran);
    Y.ofs = s.ofs + (Y.ses.bas - E.ses.bas); Y.guven = s.guven; Y.iyi = s.oran >= 1.3 && s.guven >= 0.1;
    var m = Math.abs(Y.ofs).toFixed(1).replace('.', ',');
    var yazi = ad + (Y.iyi ? ' · sesinden eşleşti ✓ (' + (Math.abs(Y.ofs) < 0.05 ? 'ikisi aynı anda başlamış' : 'telefon ' + m + ' sn ' + (Y.ofs > 0 ? 'önce' : 'sonra') + ' başlamış') + ')' : ' · sesler tam eşleşmedi; iki kaydın aynı anda çekildiğinden emin ol.');
    if (Y.iyi && (E.bas + Y.ofs < -0.5 || E.son + Y.ofs > Y.d.sure + 0.5)) yazi += ' Yüz videosu ekran kaydının bir kısmını kapsıyor.';
    r.yuzVidBilgi.textContent = yazi;
  };
  Oynatici.prototype.ekranAralik = function () {
    var E = this.ekran, r = this.r; if (!E) return;
    var s = E.d.sure, b = parseFloat(String(r.ekranBas.value).replace(',', '.')), n = parseFloat(String(r.ekranSon.value).replace(',', '.'));
    if (!isFinite(b)) b = E.bas; if (!isFinite(n)) n = E.son;
    b = Math.max(0, Math.min(s - 1, b)); n = Math.max(b + 1, Math.min(s, n));
    E.bas = Math.round(b * 10) / 10; E.son = Math.max(E.bas + 1, Math.floor(n * 10) / 10);
    r.ekranBas.value = String(E.bas); r.ekranSon.value = String(E.son);
    if (this.yuzVid) this.yuzVidEsitle();
    this.indirSifirla(); this.indirCiz();
  };
  Oynatici.prototype.ekranCiz = function () { // video neyden: bu ders ya da ekran kaydı; ekran kaydında derse ait seçenekler gizlenir
    var self = this, r = this.r; if (!r.vkAlan) return;
    var var_ = (this.indirBicim || 'mp3') === 'mp4' && !!window.SesliVideo && !!window.SesliStudyo, ekran = this.ekranModu(), E = this.ekran, Y = this.yuzVid;
    r.vkAlan.hidden = !var_;
    Array.prototype.forEach.call(r.vkSecim.querySelectorAll('[data-vk]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-vk') === (ekran ? 'ekran' : 'ders'))); });
    r.ekranAlan.hidden = !ekran;
    r.indirSesAlan.hidden = ekran;
    r.girisBaslik.placeholder = ekran ? 'ör. VSEPR soru çözümü' : '';
    if (!ekran) return;
    r.kisimAlan.hidden = true; r.indirAltyaziSatir.hidden = true; r.indirAltStiller.hidden = true;
    r.ekranSesler.hidden = !(E && E.ses && !E.sessiz && Y && Y.ses);
    Array.prototype.forEach.call(r.ekranSesler.querySelectorAll('[data-es]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-es') === self.ekranSes)); });
    r.indirHazirla.disabled = !!this.indiriliyor || !E;
    var fotoVar = ayar.ogretmen && !ayar.ikili && ayar.gorunum !== 'figur' && !!Foto.url;
    r.ekranNot.textContent = E ? 'Videoya giren kısım: ' + sureYazi(E.son - E.bas) + '.' + (Y ? '' : fotoVar ? ' Yüz videosu yoksa fotoğrafın görünür.' : ' Yüz videosu yoksa yalnız ekran kaydı görünür.') +
      (!(Y && Y.ses) && (E.sessiz || (!E.ses && (E.d.yol === 'kod' || E.d.ayristi) && !(E.d.sesler && E.d.sesler.length))) ? ' Bu ekran kaydında ses yok. Bir dahaki kayıtta, kaydı başlatmadan önce Denetim Merkezi’nde kayıt düğmesine basılı tut ve Mikrofon’u aç.' : '') +
      oynaticiNotu(E, Y) +
      (this.indirPlat === 'reels' && E.son - E.bas > 180 ? ' Reels için 3 dakikayı geçmemesi iyi olur.' : '') : '';
    if (!E) r.indirHazirla.textContent = 'Videoyu hazırla';
  };
  Oynatici.prototype.kirpCiz = function () { // önizleme karesi, görünecek alanın çerçevesi ve köşe tutamakları
    var E = this.ekran, tv = this.r.kirpTuval; if (!E || !E.onizleme) return;
    var im = E.onizleme, W = im.width, H = im.height, k = E.kirp, x = k.x * W, y = k.y * H, w = k.g * W, h = k.h * H, t = Math.max(10, Math.round(Math.min(W, H) * 0.03));
    if (tv.width !== W || tv.height !== H) { tv.width = W; tv.height = H; }
    var c = tv.getContext('2d');
    c.drawImage(im, 0, 0);
    c.fillStyle = 'rgba(10,8,6,.58)'; c.fillRect(0, 0, W, y); c.fillRect(0, y + h, W, H - y - h); c.fillRect(0, y, x, h); c.fillRect(x + w, y, W - x - w, h);
    c.strokeStyle = '#F85300'; c.lineWidth = Math.max(2, W / 300); c.strokeRect(x, y, w, h);
    c.fillStyle = '#F85300'; [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].forEach(function (q) { c.beginPath(); c.arc(q[0], q[1], t, 0, Math.PI * 2); c.fill(); });
  };
  Oynatici.prototype.kirpOlaylari = function () { // köşeyi sürükle: o köşe; içini sürükle: çerçeve kayar; dışarıda: yeni çerçeve
    var self = this, tv = this.r.kirpTuval, tut = null, EN_AZ = 0.12;
    var konum = function (e) { var q = tv.getBoundingClientRect(); return { x: Math.max(0, Math.min(1, (e.clientX - q.left) / q.width)), y: Math.max(0, Math.min(1, (e.clientY - q.top) / q.height)), q: q }; };
    tv.addEventListener('pointerdown', function (e) {
      var E = self.ekran; if (!E || self.indiriliyor) return;
      var p = konum(e), k = E.kirp, enYakin = 30, tur = null;
      [['su', k.x, k.y], ['ss', k.x + k.g, k.y], ['au', k.x, k.y + k.h], ['as', k.x + k.g, k.y + k.h]].forEach(function (c) { var m = Math.hypot((p.x - c[1]) * p.q.width, (p.y - c[2]) * p.q.height); if (m < enYakin) { enYakin = m; tur = c[0]; } });
      if (!tur) tur = p.x > k.x && p.x < k.x + k.g && p.y > k.y && p.y < k.y + k.h ? 'tasi' : 'yeni';
      tut = { tur: tur, p0: p, k0: { x: k.x, y: k.y, g: k.g, h: k.h } };
      try { tv.setPointerCapture(e.pointerId); } catch (x) {}
      e.preventDefault();
    });
    tv.addEventListener('pointermove', function (e) {
      if (!tut || !self.ekran) return;
      var p = konum(e), k0 = tut.k0, x0 = k0.x, y0 = k0.y, x1 = k0.x + k0.g, y1 = k0.y + k0.h, dx = p.x - tut.p0.x, dy = p.y - tut.p0.y;
      if (tut.tur === 'tasi') { x0 = Math.max(0, Math.min(1 - k0.g, k0.x + dx)); y0 = Math.max(0, Math.min(1 - k0.h, k0.y + dy)); x1 = x0 + k0.g; y1 = y0 + k0.h; }
      else if (tut.tur === 'yeni') { x0 = Math.min(tut.p0.x, p.x); x1 = Math.max(tut.p0.x, p.x); y0 = Math.min(tut.p0.y, p.y); y1 = Math.max(tut.p0.y, p.y); }
      else {
        if (tut.tur.charAt(1) === 'u') x0 = Math.min(p.x, x1 - EN_AZ); else x1 = Math.max(p.x, x0 + EN_AZ);
        if (tut.tur.charAt(0) === 's') y0 = Math.min(p.y, y1 - EN_AZ); else y1 = Math.max(p.y, y0 + EN_AZ);
      }
      if (x1 - x0 < EN_AZ || y1 - y0 < EN_AZ) { if (tut.tur === 'yeni') return; }
      self.ekran.kirp = { x: Math.max(0, x0), y: Math.max(0, y0), g: Math.min(1, x1) - Math.max(0, x0), h: Math.min(1, y1) - Math.max(0, y0) };
      self.kirpCiz(); e.preventDefault();
    });
    var birak = function () { if (!tut) return; tut = null; if (self.ekran) { self.indirSifirla(); self.indirCiz(); } };
    tv.addEventListener('pointerup', birak); tv.addEventListener('pointercancel', birak);
  };
  Oynatici.prototype.ekranVideosu = function () {
    var self = this, r = this.r, E = this.ekran, Y = this.yuzVid, SV = window.SesliVideo, ST = window.SesliStudyo, SU = window.SesliSunum;
    if (this.indiriliyor) return;
    if (!E) { this.indirHata('Önce ekran kaydını seç.'); return; }
    var ctx = cozucuYap(); if (!ctx) { this.indirHata('Bu tarayıcı video hazırlayamıyor. Safari ya da Chrome’un güncel sürümünü dene.'); return; }
    this.indirSifirla(); this.indiriliyor = true; this.indirCiz();
    this.iptalIstek = false; this.aktifIsler = []; r.indirIptal.hidden = false; r.indirIptal.disabled = false;
    var iptalMi = function () { return !!self.iptalIstek; }, iptalBak = function (x) { if (self.iptalIstek) throw kHata('Video hazırlama durduruldu.'); return x; };
    var basAn = performance.now();
    var durum = function (yazi, oran) { r.indirYazi.textContent = yazi; if (oran != null) r.indirCubuk.style.width = Math.round(Math.max(0, Math.min(1, oran)) * 100) + '%'; };
    var kilit = null; if (navigator.wakeLock && navigator.wakeLock.request) navigator.wakeLock.request('screen').then(function (k) { kilit = k; }, function () {});
    r.indirIlerleme.hidden = false;
    var P0 = ST.BICIMLER[this.indirPlat] || ST.BICIMLER.reels, P = { G: P0.G, Y: P0.Y, fps: P0.fps, bit: P0.bit }, yer = P0.yer.indexOf(this.indirYer) >= 0 ? this.indirYer : P0.yer[0];
    var bas = E.bas, T = Math.max(0.5, E.son - E.bas), oran = ctx.sampleRate, mod = ayar.ogretmen && !ayar.ikili ? (ayar.gorunum || 'figur') : 'figur';
    var SA = SU ? this.sunumAyar() : null, GI = SA && SA.giris ? SU.GIRIS_SURE : 0, GO = SA && SA.kapanis ? SU.KAPANIS_SURE : 0;
    var sesK = Y && Y.ses && (this.ekranSes === 'yuz' || !E.ses || E.sessiz) ? Y : E, sesOfs = sesK === Y ? Y.ofs : 0, stdSes = !!(r.sesIsleAc && r.sesIsleAc.checked && window.SesliSes);
    var tahta = null, yuzS = null, an = null, kd = null, muzikVeri = null, foto = null, GR = null, gorNot = '', icerik = null;
    var bitir = function () { if (tahta) { tahta.kapat(); tahta = null; } if (yuzS) { yuzS.kapat(); yuzS = null; } };
    var imza = JSON.stringify([E.kirp, E.bas, E.son]);
    // Cihazın oynatıcısıyla okunan kayıt önce hızlı okunacak biçime çevrilir (her karede atlamak çok yavaş).
    // Video bu sırada önizlemede oynar: iPhone görünmeyen videoyu oynatmayabilir; oynatma izni bu dokunuşta alınır.
    var aralikE = [Math.max(0, E.bas - 0.5), Math.min(E.d.sure, E.son + 0.5)], aralikY = Y ? [Math.max(0, E.bas + Y.ofs - 0.5), Math.min(Y.d.sure, E.son + Y.ofs + 0.5)] : null;
    var kapsar = function (K, a) { return !!(K && K.cev && K.cev.bas <= a[0] + 0.01 && K.cev.son >= a[1] - 0.01); };
    var cevE = null, cevY = null;
    if (SV.cevirebilir && SV.cevirebilir()) {
      // ekran kaydı çevrilecekse yüz videosu da çevrilir: ikisi aynı anda çevrildiğinden ek süre tutmaz, çizerken iki hafif H.264 çözülür
      var yuzC = !!(Y && (cevrilsin(Y.d) || cevrilsin(E.d)) && aralikY[1] > aralikY[0] && !kapsar(Y, aralikY));
      var gerek = (cevrilsin(E.d) && !kapsar(E, aralikE) ? 1 : 0) + (yuzC ? 1 : 0);
      if (gerek) {
        r.indirOnizleme.innerHTML = ''; r.indirOnizleme.hidden = false;
        var izg = document.createElement('div'); izg.style.cssText = 'display:flex;gap:8px;height:' + (gerek > 1 ? 150 : 190) + 'px'; r.indirOnizleme.appendChild(izg);
        var yer1 = function () { var k = document.createElement('div'); k.style.cssText = 'flex:1;min-width:0;height:100%'; izg.appendChild(k); return k; };
        if (cevrilsin(E.d) && !kapsar(E, aralikE)) cevE = SV.cevirici(E.d, yer1());
        if (yuzC) cevY = SV.cevirici(Y.d, yer1());
      }
    }
    // Kayıtlar sırayla çevrilir: iPhone'da ikisi aynı anda çevrilirken biri eski yavaş yola düşmüş, öteki bozuk çıkmış görünüyordu.
    // Yüz videosu 1280 pikselde ama daha yüksek bit hızıyla: telefonda kare almak ucuzlar, yüz akıcı ve temiz kalır.
    var cevirme = function () {
      if (!cevE && !cevY) return Promise.resolve();
      var sira = [], n = (cevE ? 1 : 0) + (cevY ? 1 : 0), bitenSay = 0;
      var is = function (cv, K, a, ayar0, ad) {
        return function () {
          var goster = function (x, hiz) { durum(ad + ' hızlı okunacak biçime çevriliyor… %' + Math.round(x * 100) + (hiz ? ' (' + String(hiz).replace('.', ',') + ' kat hızda)' : '') + (n > 1 ? ' · ' + (bitenSay + 1) + '/' + n : ''), 0.01 + (bitenSay + x) / n * 0.1); };
          goster(0, 0);
          var dene = function (ay) { iptalBak(); return cv.cevir({ bas: a[0], son: a[1], enBuyuk: ay.enBuyuk, bpp: ay.bpp, dogrudan: ay.dogrudan, dogOlcek: ay.dogOlcek, resim: ay.resim, kapsam: ay.kapsam, hiz: ay.hiz, hizAlt: ay.hizAlt, ilerle: goster }); };
          return dene(ayar0).catch(function (e) {
            if (self.iptalIstek || !ayar0.yedek) throw e;
            if (window.console) console.warn(ad + ' ilk yolla çevrilemedi, yedek yolla deneniyor:', e);
            K.cevHata1 = window.SesliVideo.hataYazi(e); return dene(ayar0.yedek);
          }).then(function (d2) { K.cev = { d: d2, bas: a[0], son: a[1] }; }, function (e) { if (window.console) console.warn(ad + ' çevrilemedi:', e); K.cevHata = window.SesliVideo.hataYazi(e); })
            .then(function () { cv.kapat(); bitenSay++; iptalBak(); });
        };
      };
      // ekran kaydı: kare oynatıcıdan doğrudan (tuvalsiz) ve 2 kat hızda; sayfada az şey değiştiğinden karelerin yarısı yeter.
      // Kodlayıcı 2048 piksele küçültür (sınanır; olmazsa kaydın kendi boyunda): çevirme ve videonun her karesi daha az iş
      // olmazsa yedek: tuval kipi, 2048 piksel (bu telefonda çalıştığı görülen yol)
      if (cevE) sira.push(is(cevE, E, aralikE, { enBuyuk: 2048, bpp: 0.06, dogrudan: true, dogOlcek: true, kapsam: 0.5, yedek: { enBuyuk: 2048, bpp: 0.08, dogrudan: false, resim: false, kapsam: 0.5, hiz: 2 } }, 'Ekran kaydı'));
      // yüz: gösterilen karelerin %90'ı yakalanmalı; yetişemezse oynatma yarım hıza kadar yavaşlar (biraz uzun sürer, yüz akıcı oynar).
      // Önce kare doğrudan (kodlayıcı küçültür; bir kare sınanır), olmazsa resim yoluyla: iPhone'da tuvalden okumak saniyede ~12 kareye düşürüyordu
      if (cevY) sira.push(is(cevY, Y, aralikY, { enBuyuk: 1280, bpp: 0.12, dogrudan: true, dogOlcek: true, kapsam: 0.9, hiz: 1.5, hizAlt: 0.5, yedek: { enBuyuk: 1280, bpp: 0.12, dogrudan: false, resim: false, kapsam: 0.9, hiz: 1, hizAlt: 0.5 } }, 'Yüz videosu'));
      self.aktifIsler = [cevE, cevY].filter(Boolean);
      return sira.reduce(function (z, f) { return z.then(f); }, Promise.resolve()).then(function () { r.indirOnizleme.innerHTML = ''; self.aktifIsler = []; });
    };
    var dE = function () { return kapsar(E, aralikE) ? E.cev.d : E.d; }, dY = function () { return Y && kapsar(Y, aralikY) ? Y.cev.d : Y ? Y.d : null; };
    var ib = cevE || cevY ? 0.11 : 0.01;
    cevirme().then(function () {
      iptalBak();
      durum('Kayıt inceleniyor…', ib);
      if (E.analiz && E.analizImza === imza) return E.analiz;
      var ins = SV.incele(dE(), { bas: E.bas, son: E.son, kirp: E.kirp, adim: 0.1, ilerle: function (p) { durum('Kayıt inceleniyor: kalemin yazdığı yerler… %' + Math.round(p * 100), ib + p * (0.22 - ib)); } });
      self.aktifIsler = [ins];
      return ins.then(function (a) { self.aktifIsler = []; E.analiz = a; E.analizImza = imza; return a; });
    }).then(function (a) {
      iptalBak();
      an = a;
      return Promise.all([self.muzikHazirla(ctx), videoKodlayiciSec(P.G, P.Y, P.fps, P.bit), sesKodlayiciSec(oran), !Y && mod !== 'figur' ? Foto.yukle().then(function () { return Foto.resim || null; }) : null]);
    }).then(function (x) {
      muzikVeri = x[0]; kd = [x[1], x[2]]; foto = x[3];
      if (!kd[0] || !kd[1]) throw kHata('Bu tarayıcı videoyu cihazda hazırlayamıyor. iPad’de Safari’nin güncel sürümünü (iPadOS 26 ya da sonrası) dene.');
      durum(stdSes ? 'Ses temizleniyor…' : 'Ses hazırlanıyor…', 0.225);
      icerik = sesDilimi(sesK.ses, bas + sesOfs, T, oran);
      if (stdSes) { try { icerik = window.SesliSes.sesIsle(icerik, oran); } catch (e) { if (window.console) console.warn('Stüdyo sesi:', e); } }
      var yuzVar = !!Y || !!foto, gorA = { isik: !!(r.indirIsik && r.indirIsik.checked), arka: self.indirArka || 'bulanik' };
      if (!ST.gorunum || !yuzVar || (!gorA.isik && gorA.arka === 'yok')) return null;
      if (gorA.arka === 'yok') return ST.gorunum({ isik: gorA.isik, arka: 'yok', ayirici: null });
      durum('Arka plan ayırıcı hazırlanıyor…', 0.235);
      return Promise.race([ST.ayiriciYukle(), sleep(30000).then(function () { throw new Error('zaman aşımı'); })]).catch(function (e) {
        gorNot = 'Arka plan ayrılamadı (ilk seferde internet gerekir); yüzün arka planıyla birlikte kullanıldı.'; if (window.console) console.warn('Arka plan ayırıcı:', e); return null;
      }).then(function (ayirici) { return gorA.isik || ayirici ? ST.gorunum({ isik: gorA.isik, arka: ayirici ? gorA.arka : 'yok', ayirici: ayirici }) : null; });
    }).then(function (gr) {
      GR = gr;
      var yuzVar = !!Y || !!foto;
      if (!yuzVar && P.Y > P.G) yer = 'uzun'; // yüz yoksa dikey videoda sayfa büyük görünür
      // yüz videosunun en/boy oranı: yatay çekilmişse bölünmüş yerleşimde yüz alanı bu orana uyar (yüz kırpılmaz)
      var yuzOran = 0, yv = Y && dY() && dY().video;
      if (yv && yv.g && yv.y) yuzOran = yv.donus === 90 || yv.donus === 270 ? yv.y / yv.g : yv.g / yv.y;
      var L = ST.yerlesim(yer, P.G, P.Y, yuzVar, yuzOran), R = L.tahta;
      var cerceveK = L.yuzUyum ? (ST.CERCEVE_UYUM || {})[self.indirCerceve] || 1 : (ST.CERCEVE || {})[self.indirCerceve] || 1;
      tahta = SV.tahta({ d: dE(), bas: bas, kirp: E.kirp, analiz: an, G: R.g, Y: R.h });
      if (Y) yuzS = SV.yuz({ d: dY(), bas: bas, ofs: Y.ofs });
      var yuzAl = function (t) {
        if (yuzS) { var s0 = yuzS.kaynak(t); if (s0) return s0; }
        return foto ? { im: foto, g: foto.width || foto.naturalWidth, y: foto.height || foto.naturalHeight, foto: true } : null;
      };
      var ciz = ST.kompozitor({ bicim: P, yer: yer, fps: P.fps, tahta: tahta, stil: 'yok', gorunum: GR, yuzVar: yuzVar, yuz: yuzAl, yuzOran: yuzOran, cerceve: cerceveK, altyazi: function () { return null; } });
      if (yer === 'kose' && yuzVar) { // köşede yuvarlak yüz: kompozitör çizmez, burada eklenir
        var ciz0 = ciz, kc = ciz0.tuval.getContext('2d');
        ciz = { tuval: ciz0.tuval, yerlesim: ciz0.yerlesim, kare: function (t) {
          ciz0.kare(t);
          var s0 = yuzAl(t); if (!s0) return;
          var D = Math.round(Math.min(P.G, P.Y) * 0.27), m = Math.round(Math.min(P.G, P.Y) * 0.04), cx = P.G - m - D / 2, cy = P.Y - m - D / 2;
          var im = GR ? GR.isle(s0.im, s0.g, s0.y, D, D, 0.5, 0.36, t) : s0.im, ig = GR ? D : s0.g, iy = GR ? D : s0.y, kk = Math.min(ig, iy);
          kc.save(); kc.shadowColor = 'rgba(0,0,0,.35)'; kc.shadowBlur = D * 0.08; kc.shadowOffsetY = D * 0.02;
          kc.beginPath(); kc.arc(cx, cy, D / 2 + D * 0.025, 0, Math.PI * 2); kc.fillStyle = '#fff'; kc.fill(); kc.restore();
          kc.save(); kc.beginPath(); kc.arc(cx, cy, D / 2, 0, Math.PI * 2); kc.clip();
          try { kc.drawImage(im, (ig - kk) / 2, (iy - kk) * 0.3, kk, kk, cx - D / 2, cy - D / 2, D, D); } catch (e) {}
          kc.restore();
        } };
      }
      var cikti = ciz;
      if (SA && (GI || GO || SA.filigran || SA.altBant)) {
        cikti = SU.sunum({ G: P.G, Y: P.Y, icerik: ciz, icerikSure: T,
          giris: GI ? SU.giris({ G: P.G, Y: P.Y, baslik: SA.baslik, alt: SA.alt, kullanici: SA.kanal, motif: SA.motif }) : null,
          kapanis: GO ? SU.kapanis({ G: P.G, Y: P.Y, kullanici: SA.kanal, foto: foto || null, motif: SA.motif }) : null,
          // bölünmüş yerleşimde kanal adı yüz alanının köşesine: tahtadaki yazının üstüne binmesin
          ust: SA.filigran || SA.altBant ? SU.ustKatman({ G: P.G, Y: P.Y, filigran: SA.filigran, altBant: SA.altBant, filigranY: L.yuz && L.ad === 'bolunmus' ? L.yuz.y : null }) : null });
      }
      var tuval = cikti.tuval, sure = GI + T + GO, kareSay = Math.ceil(sure * P.fps);
      var n = Math.ceil(sure * oran), ses = new Float32Array(n), b0 = Math.round(GI * oran);
      ses.set(icerik.subarray(0, Math.max(0, Math.min(icerik.length, n - b0))), b0); icerik = null;
      var kat = function (p, t) { if (!p) return; var b = Math.round(t * oran); for (var i = 0; i < p.length && b + i < n; i++) ses[b + i] += p[i]; };
      if (GI) kat(SU.girisSesi(oran), 0);
      if (GO) kat(SU.kapanisSesi(oran), GI + T);
      if (window.SesliSes) window.SesliSes.son(ses, oran, { muzik: muzikVeri, bas: GI, son: GI + T }); else vSinirla(ses);
      cikti.kare(GI ? Math.min(2.6, GI) : 0); self.indirOnizle(tuval);
      var hazirla = function (t) {
        var ti = t - GI; if (ti < -0.6 || ti > T + 0.3) return null;
        var tt = Math.max(0, Math.min(T, ti)), a = tahta.hazirla(tt), b = yuzS ? yuzS.hazirla(tt) : null;
        return a && b ? Promise.all([a, b]) : a || b;
      };
      var cizBas = 0, yolKisa = function (K, d) { return d.cevrildi ? 'çevrildi' : d.oge ? 'oynatıcı' + (K.cevHata ? ', çevrilemedi' : '') : 'hızlı'; };
      return vVideoKodla(kd[0], kareSay, cikti.kare, tuval, function (o, ol, ks) {
        var an = performance.now(); if (!cizBas) cizBas = an;
        var gecen = (an - cizBas) / 1000, kalan = o > 0.02 && gecen > 6 ? gecen * (1 - o) / o : 0;
        // yavaşlarsa hangi adımın yavaşladığı ekran görüntüsünden okunabilsin diye kısa döküm
        var dokum = ol && ks > 30 ? ' · kare ' + Math.round((ol.bekle + ol.ciz + ol.kare + ol.kodla) / ks) + ' ms (bekleme ' + Math.round(ol.bekle / ks) + ', çizim ' + Math.round(ol.ciz / ks) + ', alma ' + Math.round(ol.kare / ks) + ', kodlama ' + Math.round(ol.kodla / ks) + ') · ekran: ' + yolKisa(E, dE()) + (Y ? ', yüz: ' + yolKisa(Y, dY()) : '') : '';
        var yavas = kalan > 900 && gecen > 20 ? ' · Bu hızla çok uzun sürecek' + (E.d.oge && !dE().cevrildi ? ' (ekran kaydı hızlı biçime çevrilemedi' + (E.cevHata ? ': ' + E.cevHata : '') + ')' : Y && Y.d.oge && !dY().cevrildi ? ' (yüz videosu hızlı biçime çevrilemedi' + (Y.cevHata ? ': ' + Y.cevHata : '') + ')' : '') + '. İstersen Vazgeç’e basıp bu yazının ekran görüntüsünü gönder.' : '';
        durum('Video çiziliyor… %' + Math.round(o * 100) + (kalan >= 5 ? ' · yaklaşık ' + kalanYazi(kalan) + ' kaldı' : '') + dokum + yavas, 0.25 + o * 0.68);
      }, hazirla, P.fps, iptalMi).then(function (v) {
        var okunamadi = [[tahta, 'Ekran kaydı'], [yuzS, 'Yüz videosu']].map(function (x) {
          var s0 = x[0] && x[0].durum ? x[0].durum() : null;
          return s0 ? x[1] + ' ' + sureYazi(Math.max(0, s0.t)) + ' civarından sonra okunamadı (' + s0.neden + '); oradan sonra son karesi görünüyor.' : '';
        }).filter(Boolean).join(' ');
        bitir();
        durum('Ses ekleniyor…', 0.94);
        return vSesKodla(ses, oran, kd[1], function (o) { durum('Ses ekleniyor… %' + Math.round(o * 100), 0.94 + o * 0.05); }).then(function (s) {
          durum('Dosya birleştiriliyor…', 0.995);
          var ol = v.olcum, ks = Math.max(1, kareSay), yol = function (K, d) {
            var c = d.cevirme; // çevirme: süresi, son hızı, gösterilen karelerin ne kadarı yakalandı
            return (d.cevrildi ? 'çevrilerek' + (c ? ' [' + Math.round(c.sn) + ' sn, ' + String(c.hiz).replace('.', ',') + ' kat, %' + Math.round(c.kapsam * 100) + ', ' + c.g + '×' + c.y + ', ' + ({ dog: 'doğrudan', bmp: 'resim', tuval: 'tuval' }[c.yontem] || c.yontem) + (c.yon ? ' ' + c.yon + '°' : '') + (c.fark != null ? ' (fark ' + Math.round(c.fark) + ')' : '') + (c.deneme ? '; ' + c.deneme : '') + (K.cevHata1 ? ', ilk deneme olmadı: ' + K.cevHata1 : '') + ']' : '') : d.oge ? 'oynatıcı' : 'hızlı yol') + (K.cevHata && !d.cevrildi ? ' (çevrilemedi: ' + K.cevHata + ')' : '');
          };
          var teknik = 'Hazırlama ' + sureYazi((performance.now() - basAn) / 1000) + ' sürdü (kare başına ' + Math.round(ol.sure / ks) + ' ms: bekleme ' + Math.round(ol.bekle / ks) + ', çizim ' + Math.round(ol.ciz / ks) +
            ', kare alma ' + Math.round(ol.kare / ks) + ', kodlama ' + Math.round(ol.kodla / ks) + ' · ekran kaydı: ' + yol(E, dE()) + (Y ? ', yüz videosu: ' + yol(Y, dY()) : '') + (ol.atla ? ' · ' + ol.atla + ' kez takıldı' : '') + ').';
          return { blob: mp4Yap([videoIzi(v, P.G, P.Y), sesIzi(s, 2)], 'isom', 'video/mp4'), ad: 'video-' + slugla(SA ? SA.baslik : 'ekran-kaydi') + '.mp4', tur: 'MP4 video', sure: sure,
            not: [gorNot, sesK.ses && !sesK.sessiz ? '' : 'Kayıtta ses olmadığı için konuşma duyulmuyor.', s.sorun, okunamadi, teknik].filter(Boolean).join(' '), zamanlar: { giris: GI, adim: [GI] } };
        });
      });
    }).then(function (d) {
      self.indirTamam(d, { video: true, KS: { bas: 0, son: 0, parca: false, bolum: -1 }, A: [] });
    }).catch(function (e) {
      bitir(); self.indiriliyor = false; r.indirIlerleme.hidden = true; self.indirCiz();
      self.indirHata(e && e.kullanici ? e.message : 'Video hazırlanamadı. Kaydı yeniden seçip tekrar dene.');
      if (window.console && e) console.warn('Ekran kaydından video:', e);
    }).then(function () {
      if (kilit && kilit.release) { try { kilit.release(); } catch (e) {} }
      r.indirOnizleme.hidden = true; r.indirOnizleme.innerHTML = '';
      r.indirIptal.hidden = true; self.aktifIsler = [];
      [cevE, cevY].forEach(function (cv) { if (cv) { try { cv.kapat(); } catch (e) {} } });
    });
  };
  /* ---- giriş ve marka ---- */
  Oynatici.prototype.varsayilanBaslik = function () { // videonun girişindeki başlık: dersin adı, kendi metninde ilk satır
    if (this.ekranModu()) return ''; // ekran kaydında başlığı öğretmen yazar
    var b = this.P.ders && this.P.ders.baslik;
    if (this.P.id === 'metin' && this.r.metin) { var ilk = (this.r.metin.value || '').split(/\n/).map(function (x) { return x.trim(); }).filter(Boolean)[0] || ''; if (ilk) b = ilk.length <= 70 ? ilk.replace(/[.:]$/, '') : ilk.split(/\s+/).slice(0, 7).join(' ') + '…'; }
    return b || 'Kimya';
  };
  Oynatici.prototype.sunumAyar = function () {
    var r = this.r, SU = window.SesliSunum; if (!SU || !r.girisAc) return null;
    var kanal = (r.kanalAd.value || '').trim().replace(/\s+/g, ''); if (kanal && kanal.charAt(0) !== '@') kanal = '@' + kanal;
    var ekranM = this.ekranModu(), baslik = (r.girisBaslik.value || '').trim() || this.varsayilanBaslik() || 'Kimya', alt = (r.girisAlt.value || '').trim(), motif = r.girisMotif.value || 'otomatik', KS = this.kisimAl();
    if (!alt && !ekranM && KS.bolum >= 0) { // dersin bir bölümü indiriliyorsa alt başlık bölümün adı olur
      var bad = paylasimYazi((this.P.bolumler[KS.bolum] || {}).ad || '');
      if (bad && bad.toLocaleLowerCase('tr') !== baslik.toLocaleLowerCase('tr')) alt = kisalt(bad, 48);
    }
    if (motif === 'otomatik') motif = SU.motifBul(baslik + ' ' + alt) || (ekranM ? null : SU.motifBul((this.P.adimlar || []).slice(KS.bas, KS.bas + 4).map(function (a) { return a.s; }).join(' '))) || 'atom';
    var ad = (r.altBantAd.value || '').trim(), fil = !!r.filigranAc.checked && !!kanal;
    return { giris: !!r.girisAc.checked, baslik: baslik, alt: alt, motif: motif, kapanis: !!r.kapanisAc.checked && !!kanal, kanal: kanal,
      filigran: fil ? 'Instagram’da ' + kanal : '', altBant: ad ? { ad: ad, unvan: (r.altBantUnvan.value || '').trim() } : null };
  };
  Oynatici.prototype.girisOnizle = function () {
    var SU = window.SesliSunum, A = this.sunumAyar(), ST = window.SesliStudyo; if (!SU || !A || this.indiriliyor) return;
    var P = ST && this.indirPlat !== 'hizli' ? ST.BICIMLER[this.indirPlat] : { G: VID_G, Y: VID_Y };
    SU.onizle(this.r.indirOnizleme, { G: P.G, Y: P.Y, baslik: A.baslik, alt: A.alt, kullanici: A.kanal, motif: A.motif });
  };
  Oynatici.prototype.indirSifirla = function () {
    if (window.SesliSunum && window.SesliSunum.onizlemeDur) window.SesliSunum.onizlemeDur();
    var r = this.r;
    if (this.indirUrl) { URL.revokeObjectURL(this.indirUrl); this.indirUrl = null; }
    if (this.srtUrl) { URL.revokeObjectURL(this.srtUrl); this.srtUrl = null; }
    if (r.indirSrt) { r.indirSrt.hidden = true; r.indirSrt.setAttribute('href', '#'); }
    this.indirDosya = null;
    r.indirSonuc.hidden = true; r.indirLink.setAttribute('href', '#'); r.indirPaylas.hidden = true; r.indirUyari.hidden = true;
    r.indirIlerleme.hidden = true; r.indirCubuk.style.width = '0';
    if (r.paylasimKutu) r.paylasimKutu.hidden = true;
    if (!this.indiriliyor) { r.indirOnizleme.hidden = true; r.indirOnizleme.innerHTML = ''; }
  };
  Oynatici.prototype.indirHata = function (yazi) { this.r.indirUyari.textContent = yazi; this.r.indirUyari.hidden = false; };
  Oynatici.prototype.indirCiz = function () {
    var self = this, r = this.r, A = this.P.adimlar || [], bulutVar = Bulut.hazir();
    if (!this.indirSecim) this.indirSecim = kaynakNe() === 'kayit' ? 'kayit' : (bulutVar ? 'bulut' : 'kayit');
    if (this.indirSecim === 'bulut' && !bulutVar) this.indirSecim = 'kayit';
    Array.prototype.forEach.call(r.indirSesler.querySelectorAll('[data-isec]'), function (b) {
      var s = b.getAttribute('data-isec'); b.setAttribute('aria-pressed', String(s === self.indirSecim)); if (s === 'bulut') b.hidden = !bulutVar;
    });
    var bicim = this.indirBicim || 'mp3';
    Array.prototype.forEach.call(r.indirBicimler.querySelectorAll('[data-ibic]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-ibic') === bicim)); });
    this.kisimCiz();
    if (r.sesAlan && window.SesliSes) {
      r.sesAlan.hidden = false;
      if (this.muzikTur === 'kendi' && !this.kendiMuzik) this.muzikTur = 'yok';
      r.muzikler.innerHTML = window.SesliSes.MUZIKLER.map(function (m) { return '<button type="button" data-muzik="' + m[0] + '" aria-pressed="' + (m[0] === self.muzikTur) + '">' + m[1] + '</button>'; }).join('');
      r.muzikNot.textContent = this.muzikTur === 'kendi' ? '🎵 ' + this.kendiMuzik.ad + ' · değiştirmek için yeniden dokun. Telifli müzik paylaşımda sorun çıkarabilir.' : this.muzikTur !== 'yok' ? 'Müzik bu uygulamada üretilir, telifsizdir; konuşurken kendiliğinden kısılır.' : '';
    }
    r.indirBicimNot.textContent = bicim === 'mp4' ? 'Tahtaya yazılanlar sesle birlikte video olur. Hazırlanırken bu sayfada kal.' : bicim === 'm4a' ? 'MP4 biçiminde ses dosyası (.m4a); iPhone’da doğrudan açılır.' : 'En küçük dosya; her cihazda açılır.';
    r.indirAltyaziSatir.hidden = bicim !== 'mp4';
    this.indirPlatCiz(bicim);
    r.indirHazirla.disabled = !!this.indiriliyor || !A.length;
    r.indirHazirla.className = this.indirDosya ? 'dugme ikincil' : 'dugme';
    r.indirHazirla.textContent = this.indiriliyor ? 'Hazırlanıyor…' : (this.indirDosya ? 'Yeniden hazırla' : bicim === 'mp4' ? 'Videoyu hazırla' : bicim === 'm4a' ? 'MP4 ses dosyasını hazırla' : 'Ses dosyasını hazırla');
    this.ekranCiz();
    if (this.ekranModu()) return;
    if (!A.length) { r.indirSesNot.textContent = 'Önce bir ders aç; indirilen dosya o dersin anlatımı olur.'; return; }
    if (this.indirSecim === 'bulut') { r.indirSesNot.textContent = ayar.ikili ? 'Karşılıklı anlatım açık: kadın ve erkek doğal ses sırayla okur.' : 'Ayarlar’da seçili doğal sesle okunur.'; return; }
    r.indirSesNot.textContent = 'Kayıtların sayılıyor…';
    var sureler = [], kimlik = this.P.id;
    Promise.all(A.map(function (a, i) { var h = ozet(a.s); return Kayitlar.al('k:' + h).then(function (v) { sureler[i] = v && v.veri ? (v.sure || 0) : 0; return !!(v && v.veri) || !!Yayin.al(h); }); })).then(function (v) {
      if (self.P.id === kimlik) { self.kayitSure = { id: kimlik, l: sureler }; self.kisimNotYaz(); }
      if (self.indirSecim !== 'kayit') return;
      var n = v.filter(Boolean).length;
      r.indirSesNot.textContent = n
        ? 'Bu derste ' + A.length + ' adımın ' + n + '’i senin kaydınla.' + (n < A.length ? (bulutVar ? ' Kaydı olmayan cümleleri doğal ses okur.' : ' Kaydı olmayan cümleler dosyaya girmez.') : '')
        : 'Bu ders için henüz kendi ses kaydın yok. Önce “Kendi sesinle kaydet” ile cümleleri oku' + (bulutVar ? ' ya da “Doğal ses”i seç.' : '.');
    });
  };
  Oynatici.prototype.indirPlatCiz = function (bicim) { // MP4 video: platform, yerleşim, altyazı biçimi
    var self = this, r = this.r, ST = window.SesliStudyo, video = bicim === 'mp4' && !!ST;
    r.indirPlatAlan.hidden = !video;
    r.indirAltStiller.hidden = !video || !r.indirAltyazi.checked || this.indirPlat === 'hizli';
    if (r.sunumAlan) {
      r.sunumAlan.hidden = !video || !window.SesliSunum;
      if (!r.sunumAlan.hidden) {
        var bk = this.ekranModu() ? 'ekran' : this.P.id;
        if (!this.sunumBaslik || this.sunumBaslik.id !== bk) { this.sunumBaslik = { id: bk, yazi: this.varsayilanBaslik() }; }
        if (document.activeElement !== r.girisBaslik && this.kok.activeElement !== r.girisBaslik) r.girisBaslik.value = this.sunumBaslik.yazi;
        r.girisAyrinti.hidden = !r.girisAc.checked && !this.ekranModu(); // ekran kaydında başlık kapak ve paylaşım metni için de gerekir
        if (r.kapakNot) {
          if (this.kapakUrl && this.kapakImzasi !== this.kapakImza()) this.kapakSifirla();
          var kp = this.indirPlat, yz = ayar.ogretmen && !ayar.ikili && ayar.gorunum !== 'figur';
          r.kapakNot.textContent = (kp === 'reels' ? 'Reels kapağı (1080×1920)' : kp === 'gonderi' ? 'Gönderi kapağı (1080×1350)' : 'YouTube küçük resmi (1280×720)') + ': başlık, ' + (yz ? 'yüzün' : 'konunun çizimi') + ' ve kanal adın.';
        }
      }
    }
    if (!video) return;
    var B = ST.BICIMLER, P = B[this.indirPlat] || B.reels;
    r.indirPlatlar.innerHTML = Object.keys(B).map(function (k) { return '<button type="button" data-plat="' + k + '" aria-pressed="' + (k === self.indirPlat) + '">' + B[k].ad + ' <small style="opacity:.7">' + B[k].alt + '</small></button>'; }).join('');
    r.indirYerler.innerHTML = P.yer.map(function (y) { return '<button type="button" data-yer="' + y + '" aria-pressed="' + (y === self.indirYer) + '">' + ST.YERLESIM_ADI[y] + '</button>'; }).join('');
    Array.prototype.forEach.call(r.indirAltStiller.querySelectorAll('[data-astil]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-astil') === self.indirAltStil)); });
    var ekranM = this.ekranModu(), yuzlu = ekranM ? !!this.yuzVid || (ayar.ogretmen && !ayar.ikili && ayar.gorunum !== 'figur' && !!Foto.url) : ayar.ogretmen && !ayar.ikili && ayar.gorunum !== 'figur';
    r.indirGorEtiket.hidden = r.indirArkalar.hidden = r.indirIsikSatir.hidden = !yuzlu || !ST.gorunum;
    Array.prototype.forEach.call(r.indirArkalar.querySelectorAll('[data-arka]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-arka') === self.indirArka)); });
    r.indirCerEtiket.hidden = r.indirCerceveler.hidden = !yuzlu || !ST.CERCEVE;
    Array.prototype.forEach.call(r.indirCerceveler.querySelectorAll('[data-cerceve]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-cerceve') === self.indirCerceve)); });
    r.indirPlatNot.textContent = P.G + '×' + P.Y + ', saniyede ' + P.fps + ' kare. ' +
      (ekranM ? 'Görüntü kalemin yazdığı yere yaklaşır' + (yuzlu ? (this.indirYer === 'kose' ? '; yüzün köşede yuvarlak çerçevede görünür.' : '; yüzün ayrı bir alanda görünür.') : '.') :
        this.indirYer === 'kose' ? 'Yüzün tahtanın köşesinde yuvarlak çerçevede görünür.' : yuzlu ? 'Tahta yazılan yeri izleyerek yakınlaşır; yüzün ayrı bir alanda büyük görünür.' : 'Yüz videon ya da fotoğrafın yoksa tahta tek başına, yakın çekimle gösterilir.') +
      (yuzlu && this.indirArka !== 'yok' ? ' Arka planı ayırmak için ilk seferde birkaç MB’lık bir model indirilir (internet gerekir).' : '');
  };
  Oynatici.prototype.indirAc = function (secim, basla) {
    var r = this.r;
    if (secim && !this.indiriliyor) { this.indirSecim = secim; this.indirSifirla(); }
    if (this.opt.mod === 'pencere') { this.kokEl.classList.add('ayar-acik'); r.ayarDugme.setAttribute('aria-pressed', 'true'); }
    this.indirCiz();
    setTimeout(function () { try { r.indirKart.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) { r.indirKart.scrollIntoView(); } }, 60);
    if (basla) this.sesDosyasi();
  };
  /* ================= MP4 yazıcı: H.264 görüntü, AAC ya da Opus ses; moov başta (hızlı açılır) ================= */
  function mp4Birlestir(l) { var n = 0, i, o = 0; for (i = 0; i < l.length; i++) n += l[i].length; var b = new Uint8Array(n); for (i = 0; i < l.length; i++) { b.set(l[i], o); o += l[i].length; } return b; }
  function mp4Kutu(tur, parcalar) {
    var n = 8, i, o = 8;
    for (i = 0; i < parcalar.length; i++) n += parcalar[i].length;
    var b = new Uint8Array(n);
    new DataView(b.buffer).setUint32(0, n);
    for (i = 0; i < 4; i++) b[4 + i] = tur.charCodeAt(i);
    for (i = 0; i < parcalar.length; i++) { b.set(parcalar[i], o); o += parcalar[i].length; }
    return b;
  }
  function mp4Tam(tur, surum, bayrak, parcalar) { return mp4Kutu(tur, [new Uint8Array([surum, (bayrak >> 16) & 255, (bayrak >> 8) & 255, bayrak & 255])].concat(parcalar)); }
  function mp4U32(a) { var b = new Uint8Array(a.length * 4), d = new DataView(b.buffer); for (var i = 0; i < a.length; i++) d.setUint32(i * 4, a[i] >>> 0); return b; }
  function mp4U16(a) { var b = new Uint8Array(a.length * 2), d = new DataView(b.buffer); for (var i = 0; i < a.length; i++) d.setUint16(i * 2, a[i] & 0xffff); return b; }
  function mp4Yazi(s) { var b = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 255; return b; }
  var MP4_MATRIS = [0x00010000, 0, 0, 0, 0x00010000, 0, 0, 0, 0x40000000];
  function avc1Girisi(g, y, avcC) {
    return mp4Kutu('avc1', [new Uint8Array(6), mp4U16([1, 0, 0]), mp4U32([0, 0, 0]), mp4U16([g, y]), mp4U32([0x00480000, 0x00480000, 0]), mp4U16([1]), new Uint8Array(32), mp4U16([0x0018, 0xffff]),
      mp4Kutu('avcC', [avcC]), mp4Kutu('pasp', [mp4U32([1, 1])])]);
  }
  function sesGirisi(kod, kanal, oran, ek) { return mp4Kutu(kod, [new Uint8Array(6), mp4U16([1]), mp4U32([0, 0]), mp4U16([kanal, 16, 0, 0]), mp4U32([oran * 65536]), ek]); }
  function esdsKutusu(asc, bit) {
    var tanim = function (etiket, govde) { var b = new Uint8Array(2 + govde.length); b[0] = etiket; b[1] = govde.length; b.set(govde, 2); return b; };
    var dcd = tanim(0x04, mp4Birlestir([new Uint8Array([0x40, 0x15, 0, 0x18, 0]), mp4U32([bit, bit]), tanim(0x05, asc)]));
    return mp4Tam('esds', 0, 0, [tanim(0x03, mp4Birlestir([mp4U16([2]), new Uint8Array([0]), dcd, tanim(0x06, new Uint8Array([2]))]))]);
  }
  function dOpsKutusu(kanal, onAtla, girisOrani) { return mp4Kutu('dOps', [new Uint8Array([0, kanal]), mp4U16([onAtla]), mp4U32([girisOrani]), mp4U16([0]), new Uint8Array([0])]); }
  var ASC_HIZ = [96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000, 7350];
  function ascYap(oran, kanal) { // AAC-LC AudioSpecificConfig
    var i = ASC_HIZ.indexOf(oran);
    if (i < 0) i = 3;
    return new Uint8Array([(2 << 3) | (i >> 1), ((i & 1) << 7) | (kanal << 3)]);
  }
  function ascUyar(a, oran, kanal) { // AAC-LC AudioSpecificConfig mi; örnekleme hızı ve kanal sayısı beklenen mi
    if (!a || a.length < 2 || a.length > 16 || (a[0] >> 3) !== 2) return false;
    var fi = ((a[0] & 7) << 1) | (a[1] >> 7), hz, ch;
    if (fi === 15) { if (a.length < 5) return false; hz = ((a[1] & 0x7f) << 17) | (a[2] << 9) | (a[3] << 1) | (a[4] >> 7); ch = (a[4] >> 3) & 15; }
    else { hz = ASC_HIZ[fi]; ch = (a[1] >> 3) & 15; }
    return hz === oran && ch === kanal;
  }
  // Kodlayıcının verdiği tanımdaki ASC. Chrome çıplak ASC verir; Safari (WebKit hata 302253) içinde ASC bulunan
  // esds tanımlayıcısını (03 … 04 … 05 <ASC> 06 …) verir: o hâliyle dosyaya yazılırsa ses izi çalınamaz.
  function ascBul(b, oran, kanal) {
    if (!b) return null;
    if (ascUyar(b, oran, kanal)) return b;
    for (var i = 0; i + 2 < b.length; i++) {
      if (b[i] !== 0x05) continue;
      var j = i + 1, n = 0, k = 0, c;
      do { c = b[j++]; n = (n << 7) | (c & 0x7f); } while ((c & 0x80) && ++k < 4 && j < b.length);
      if (j + n <= b.length) { var a = b.subarray(j, j + n); if (ascUyar(a, oran, kanal)) return a; }
    }
    return null;
  }
  // izler: [{tur: 'vide'|'soun', id, olcek (zaman ölçeği), giris (örnek tanımı kutusu), genis, yuk, ornekler: [{veri, sure, anahtar, kayma}]}]
  function mp4Yap(izler, marka, tip) {
    izler = izler.filter(function (iz) { return iz.ornekler.length; });
    if (!izler.length) throw new Error('boş dosya');
    var bitis = 0, DILIM = 0.5, sira = [], imlec = [], i;
    izler.forEach(function (iz) {
      var t = 0; iz.ornekler.forEach(function (s) { s.zaman = t / iz.olcek; t += s.sure; });
      iz.sure = t; iz.parcalar = []; imlec.push(0); bitis = Math.max(bitis, t / iz.olcek);
    });
    // görüntü ve sesi yarım saniyelik parçalar hâlinde sırayla diz: oynatıcı dosyayı baştan okurken ikisi birlikte gelir
    var kalan = true;
    for (var t0 = DILIM; kalan; t0 += DILIM) {
      kalan = false;
      izler.forEach(function (iz, k) {
        var bas = imlec[k], son = bas, o = iz.ornekler;
        while (son < o.length && (o[son].zaman < t0 || t0 > bitis + DILIM)) son++;
        if (son > bas) { var p = { iz: k, bas: bas, say: son - bas, boyut: 0, ofs: 0 }; for (var q = bas; q < son; q++) p.boyut += o[q].veri.length; sira.push(p); iz.parcalar.push(p); imlec[k] = son; }
        if (son < o.length) kalan = true;
      });
    }
    var stbl = function (iz) {
      var s = iz.ornekler, g = [], son = -1, say = 0, j;
      for (j = 0; j < s.length; j++) { if (s[j].sure === son) say++; else { if (say) g.push(say, son); son = s[j].sure; say = 1; } }
      if (say) g.push(say, son);
      var k = [mp4Tam('stsd', 0, 0, [mp4U32([1]), iz.giris]), mp4Tam('stts', 0, 0, [mp4U32([g.length / 2]), mp4U32(g)])];
      if (iz.tur === 'vide') {
        var kv = false, cg = [], cs = null, cn = 0;
        for (j = 0; j < s.length; j++) if (s[j].kayma) kv = true;
        if (kv) { for (j = 0; j < s.length; j++) { var ky = s[j].kayma || 0; if (ky === cs) cn++; else { if (cn) cg.push(cn, cs); cs = ky; cn = 1; } } if (cn) cg.push(cn, cs); k.push(mp4Tam('ctts', 0, 0, [mp4U32([cg.length / 2]), mp4U32(cg)])); }
        var an = []; for (j = 0; j < s.length; j++) if (s[j].anahtar) an.push(j + 1);
        if (an.length < s.length) k.push(mp4Tam('stss', 0, 0, [mp4U32([an.length]), mp4U32(an)]));
      }
      var sc = [], onceki = -1;
      iz.parcalar.forEach(function (p, n) { if (p.say !== onceki) { sc.push(n + 1, p.say, 1); onceki = p.say; } });
      k.push(mp4Tam('stsc', 0, 0, [mp4U32([sc.length / 3]), mp4U32(sc)]));
      k.push(mp4Tam('stsz', 0, 0, [mp4U32([0, s.length]), mp4U32(s.map(function (x) { return x.veri.length; }))]));
      k.push(mp4Tam('stco', 0, 0, [mp4U32([iz.parcalar.length]), mp4U32(iz.parcalar.map(function (p) { return p.ofs; }))]));
      return mp4Kutu('stbl', k);
    };
    var moovYap = function () {
      var ms = Math.round(bitis * 1000);
      var mvhd = mp4Tam('mvhd', 0, 0, [mp4U32([0, 0, 1000, ms, 0x00010000]), mp4U16([0x0100, 0]), mp4U32([0, 0]), mp4U32(MP4_MATRIS), mp4U32([0, 0, 0, 0, 0, 0]), mp4U32([izler.length + 1])]);
      return mp4Kutu('moov', [mvhd].concat(izler.map(function (iz) {
        var v = iz.tur === 'vide';
        var tkhd = mp4Tam('tkhd', 0, 3, [mp4U32([0, 0, iz.id, 0, Math.round(iz.sure / iz.olcek * 1000), 0, 0]), mp4U16([0, 0, v ? 0 : 0x0100, 0]), mp4U32(MP4_MATRIS), mp4U32([v ? iz.genis * 65536 : 0, v ? iz.yuk * 65536 : 0])]);
        var mdhd = mp4Tam('mdhd', 0, 0, [mp4U32([0, 0, iz.olcek, iz.sure]), mp4U16([0x55c4, 0])]);
        var hdlr = mp4Tam('hdlr', 0, 0, [mp4U32([0]), mp4Yazi(v ? 'vide' : 'soun'), mp4U32([0, 0, 0]), mp4Yazi(v ? 'VideoHandler\0' : 'SoundHandler\0')]);
        var xmhd = v ? mp4Tam('vmhd', 0, 1, [mp4U16([0, 0, 0, 0])]) : mp4Tam('smhd', 0, 0, [mp4U16([0, 0])]);
        var dinf = mp4Kutu('dinf', [mp4Tam('dref', 0, 0, [mp4U32([1]), mp4Tam('url ', 0, 1, [])])]);
        return mp4Kutu('trak', [tkhd, mp4Kutu('mdia', [mdhd, hdlr, mp4Kutu('minf', [xmhd, dinf, stbl(iz)])])]);
      })));
    };
    var ftyp = marka === 'M4A ' ? mp4Kutu('ftyp', [mp4Yazi('M4A '), mp4U32([0]), mp4Yazi('M4A isomiso2mp41')]) : mp4Kutu('ftyp', [mp4Yazi('isom'), mp4U32([512]), mp4Yazi('isomiso2avc1mp41')]);
    var bas = ftyp.length + moovYap().length + 8, ofs = bas;
    sira.forEach(function (p) { p.ofs = ofs; ofs += p.boyut; });
    if (ofs > 0xffffffff) throw new Error('dosya çok büyük');
    var moov = moovYap(), mdat = new Uint8Array(8);
    new DataView(mdat.buffer).setUint32(0, ofs - bas + 8); mdat.set(mp4Yazi('mdat'), 4);
    var hepsi = [ftyp, moov, mdat];
    sira.forEach(function (p) { var o = izler[p.iz].ornekler; for (i = p.bas; i < p.bas + p.say; i++) hepsi.push(o[i].veri); });
    return new Blob(hepsi, { type: tip });
  }
  // H.264: Annex-B (başlangıç kodlu) çıktıyı MP4'ün uzunluk önekli biçimine çevir
  function annexbMi(b) { return b.length > 4 && b[0] === 0 && b[1] === 0 && (b[2] === 1 || (b[2] === 0 && b[3] === 1)); }
  function naller(b) {
    var l = [], i = 0, bas = -1, n = b.length;
    var kes = function (son) { while (son > bas && b[son - 1] === 0) son--; if (son > bas) l.push(b.subarray(bas, son)); };
    while (i + 2 < n) {
      if (b[i] === 0 && b[i + 1] === 0 && b[i + 2] === 1) { if (bas >= 0) kes(i); i += 3; bas = i; }
      else i++;
    }
    if (bas >= 0) kes(n);
    return l;
  }
  function avcCYap(sps, pps) {
    return mp4Birlestir([new Uint8Array([1, sps[1], sps[2], sps[3], 0xff, 0xe1]), mp4U16([sps.length]), sps, new Uint8Array([1]), mp4U16([pps.length]), pps]);
  }
  function avccYap(nal) { // NAL listesinden (SPS/PPS/AUD hariç) uzunluk önekli örnek
    var l = [];
    nal.forEach(function (x) { var t = x[0] & 31; if (t === 7 || t === 8 || t === 9) return; l.push(mp4U32([x.length]), x); });
    return mp4Birlestir(l);
  }
  /* ================= ders videosu: tahtaya yazılanlar ve ses birlikte, MP4 ================= */
  var VID_G = 1280, VID_Y = 720, VID_FPS = 25, VID_UI = 'system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif', VID_UI_TEK = VID_UI.replace(/"/g, "'");
  function vRastgele(n) { var x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); }
  function vYumusak(t) { t = Math.max(0, Math.min(1, t)); return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function vCikis(t) { t = Math.max(0, Math.min(1, t)); return 1 - Math.pow(1 - t, 3); }
  function vSeffaf(c) { return !c || c === 'transparent' || /^rgba\(.*,\s*0\)$/.test(c); }
  function vBayt(d) { return d instanceof ArrayBuffer ? new Uint8Array(d.slice(0)) : new Uint8Array(d.buffer.slice(d.byteOffset, d.byteOffset + d.byteLength)); }
  function vYuvarlak(c, x, y, g, h, r) { // r: sayı ya da [sol üst, sağ üst, sağ alt, sol alt]
    var m = Math.max(0, Math.min(g, h) / 2), k = (typeof r === 'number' ? [r, r, r, r] : r).map(function (v) { return Math.max(0, Math.min(v || 0, m)); });
    c.beginPath(); c.moveTo(x + k[0], y);
    c.lineTo(x + g - k[1], y); if (k[1]) c.arcTo(x + g, y, x + g, y + k[1], k[1]);
    c.lineTo(x + g, y + h - k[2]); if (k[2]) c.arcTo(x + g, y + h, x + g - k[2], y + h, k[2]);
    c.lineTo(x + k[3], y + h); if (k[3]) c.arcTo(x, y + h, x, y + h - k[3], k[3]);
    c.lineTo(x, y + k[0]); if (k[0]) c.arcTo(x, y, x + k[0], y, k[0]);
    c.closePath();
  }
  function vGolge(s) { // CSS gölgesinin ilki: {renk, x, y, bulanik}; içe dönük gölge atlanır
    if (!s || s === 'none') return null;
    var l = s.split(/,(?![^(]*\))/);
    for (var i = 0; i < l.length; i++) {
      if (/inset/.test(l[i])) continue;
      var renkRe = /(rgba?|hsla?)\([^)]*\)|#[0-9a-f]{3,8}\b/i, renk = (l[i].match(renkRe) || [])[0] || 'rgba(0,0,0,.3)';
      var say = l[i].replace(renkRe, '').match(/-?[\d.]+/g) || [];
      return { renk: renk, x: parseFloat(say[0]) || 0, y: parseFloat(say[1]) || 0, bulanik: parseFloat(say[2]) || 0 };
    }
    return null;
  }
  function vResim(src) { return new Promise(function (ok) { if (!src) { ok(null); return; } var im = new Image(); im.onload = function () { ok(im); }; im.onerror = function () { ok(null); }; im.src = src; }); }
  function vTemiz(im) { // çizildiğinde tuvali kirletmeyen (videoya alınabilir) resim mi
    try { var c = document.createElement('canvas'); c.width = c.height = 2; var x = c.getContext('2d'); x.drawImage(im, 0, 0, 2, 2); x.getImageData(0, 0, 1, 1); return true; } catch (e) { return false; }
  }
  function vSvgResim(metin) { return vResim('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(metin)).then(function (im) { return im && vTemiz(im) ? im : null; }); }
  function vSinirla(f) { for (var i = 0; i < f.length; i++) { var x = f[i]; if (x > 0.95) f[i] = 0.95 + 0.05 * Math.tanh((x - 0.95) / 0.05); else if (x < -0.95) f[i] = -0.95 - 0.05 * Math.tanh((-x - 0.95) / 0.05); } return f; }
  function saatYazi(sn) { sn = Math.max(0, Math.round(sn)); return Math.floor(sn / 60) + ':' + ('0' + sn % 60).slice(-2); }
  /* ---- altyazı: formüller simgeli, ilerleme konuşmaya göre, YouTube için .srt ---- */
  function formulUnicode(f) {
    var g = f.govde.replace(/\d/g, function (r) { return ALT_RAKAM.charAt(+r); });
    var y = f.yuk ? f.yuk.yazi.replace(/\d/g, function (r) { return UST_RAKAM.charAt(+r); }).replace('+', '⁺').replace(/[−-]/, '⁻') : '';
    return (f.kat || '') + g + y + (f.hal || '');
  }
  function altyaziMetni(metin) { // H2SO4 → H₂SO₄, Fe3+ → Fe³⁺, -> → →
    return String(metin || '').split(/(\s+)/).map(function (tok) {
      if (!tok || /^\s+$/.test(tok)) return tok;
      if (tok === '->') return '→'; if (tok === '<=>') return '⇌';
      var p = sozcukAyir(tok), f = p.ic && formulCoz(p.ic);
      return f ? p.on + formulUnicode(f) + (p.ek ? '’' + p.ek : '') + p.son : tok;
    }).join('');
  }
  function konusmaIlerleme(v, oran) { // her 10 ms'de cümlenin ne kadarı söylendi (0–1): duraklamalarda altyazı bekler
    var A = Math.max(1, Math.round(oran * 0.01)), F = Math.max(1, Math.ceil(v.length / A)), e = new Float32Array(F), i, j;
    for (i = 0; i < F; i++) { var t = 0, b = i * A, son = Math.min(v.length, b + A); for (j = b; j < son; j++) t += v[j] * v[j]; e[i] = Math.sqrt(t / Math.max(1, son - b)); }
    var sirali = Array.prototype.slice.call(e).sort(function (a, b) { return a - b; }), esik = Math.max(0.004, sirali[Math.floor(F * 0.5)] * 0.25);
    var kum = new Float32Array(F + 1), top = 0;
    for (i = 0; i < F; i++) { top += e[i] > esik ? 1 : 0.15; kum[i + 1] = top; }
    for (i = 0; i <= F; i++) kum[i] /= top || 1;
    return {
      ileri: function (yer) { var f = yer / 0.01; if (f <= 0) return 0; var k = Math.floor(f); if (k >= F) return 1; return kum[k] + (kum[k + 1] - kum[k]) * (f - k); },
      geri: function (p) { var lo = 0, hi = F; if (p <= 0) return 0; if (p >= 1) return F * 0.01; while (hi - lo > 1) { var m = (lo + hi) >> 1; if (kum[m] < p) lo = m; else hi = m; } var a = kum[lo], b = kum[hi]; return (lo + (b > a ? (p - a) / (b - a) : 0)) * 0.01; }
    };
  }
  function altyaziHazirla(O, Z, sonuc, oran) {
    Z.adimlar.forEach(function (z, i) {
      z.alt = altyaziMetni(O.adimlar[i].s);
      var x = sonuc[i] && sonuc[i].ana;
      if (x && x.length && z.sure) { var k = konusmaIlerleme(x, oran); z.ilerleme = k.ileri; z.ilerlemeTers = k.geri; }
    });
  }
  function srtZaman(t) { var ms = Math.max(0, Math.round(t * 1000)), p = function (x, n) { return ('000' + x).slice(-n); }; return p(Math.floor(ms / 3600000), 2) + ':' + p(Math.floor(ms / 60000) % 60, 2) + ':' + p(Math.floor(ms / 1000) % 60, 2) + ',' + p(ms % 1000, 3); }
  function srtYap(O, Z, ofset) { // YouTube altyazı dosyası: en çok iki satır, satırda ~42 harf, konuşmayla eş zamanlı
    var parca = [], no = 0, sonT = 0;
    Z.adimlar.forEach(function (z, i) {
      if (!z.sure || O.adimlar[i].gorsel) return;
      var metin = String(z.alt || O.adimlar[i].s || '').replace(/\s+/g, ' ').trim(); if (!metin) return;
      var gruplar = [], su = [], uz = 0;
      metin.split(' ').forEach(function (w) {
        if (su.length && uz + 1 + w.length > 84) { gruplar.push(su); su = []; uz = 0; }
        su.push(w); uz += (uz ? 1 : 0) + w.length;
        if (/[.!?;:]$/.test(w) && uz > 34) { gruplar.push(su); su = []; uz = 0; }
      });
      if (su.length) gruplar.push(su);
      var bas = 0;
      gruplar.forEach(function (g) {
        var yazi = g.join(' '), p0 = bas / metin.length, p1 = Math.min(1, (bas + yazi.length) / metin.length); bas += yazi.length + 1;
        var t0 = z.bas + (z.ilerlemeTers ? z.ilerlemeTers(p0) : p0 * z.sure) + ofset, t1 = z.bas + (z.ilerlemeTers ? z.ilerlemeTers(p1) : p1 * z.sure) + ofset;
        t0 = Math.max(t0, sonT + 0.01); if (t1 < t0 + 0.8) t1 = t0 + 0.8; sonT = t1;
        if (yazi.length > 42) { var orta = yazi.length / 2, en = -1, fark = 1e9; for (var j = 0; j < yazi.length; j++) if (yazi.charAt(j) === ' ' && Math.abs(j - orta) < fark) { fark = Math.abs(j - orta); en = j; } if (en > 0) yazi = yazi.slice(0, en) + '\n' + yazi.slice(en + 1); }
        parca.push((++no) + '\n' + srtZaman(t0) + ' --> ' + srtZaman(t1) + '\n' + yazi + '\n');
      });
    });
    return parca.join('\n');
  }
  function vGeometri(altyazi, cerceve) {
    var kenar = 16, ust = 14, altH = altyazi ? 84 : 0, ara = altyazi ? 10 : 0;
    var cer = { x: kenar, y: ust, g: VID_G - 2 * kenar, h: VID_Y - ust - 14 - altH - ara };
    var p = cerceve === 'siyah' ? 12 : 9, rh = cerceve === 'siyah' ? 22 : 16;
    var tahta = { x: cer.x + p, y: cer.y + p, g: cer.g - 2 * p, h: cer.h - p - rh };
    return { cer: cer, tahta: tahta, raf: { x: cer.x, y: tahta.y + tahta.h, g: cer.g, h: rh }, alt: altyazi ? { x: kenar, y: cer.y + cer.h + ara, g: VID_G - 2 * kenar, h: altH } : null };
  }
  function vOgretmenSvg(cins, renk, g, h) { // gövde (ağız kapalı/açık, gözler açık/kapalı) ve ayrı çizilen kol
    var s = OGRETMEN_SVG.replace('<svg viewBox="0 0 160 212" aria-hidden="true">', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 212" width="' + g + '" height="' + h + '">');
    var kb = s.indexOf('<g class="kol">'), kol = s.slice(kb, s.lastIndexOf('</svg>')), govde = s.slice(0, kb) + '</svg>';
    govde = cins === 'e' ? govde.replace(/<path class="sac-arka"[^>]*\/>/, '').replace(/<path class="sac-kadin"[^>]*\/>/, '') : govde.replace(/<path class="kravat"[^>]*\/>/, '').replace(/<path class="sac-erkek"[^>]*\/>/, '');
    kol = kol.replace('<rect x="27" y="104" width="6.5" height="19" rx="2" fill="#1E4FB4"/>', '<rect x="27" y="104" width="6.5" height="19" rx="2" fill="' + renk + '"/>');
    var kapali = govde.replace(/<ellipse class="agiz-acik"[^>]*\/>/, ''), acik = govde.replace(/<path class="agiz-kapali"[^>]*\/>/, '');
    var kirp = function (x) { return x.replace(/ry="3\.4"/g, 'ry="0.45"'); };
    return { govde: [kapali, acik, kirp(kapali), kirp(acik)], kol: s.slice(0, s.indexOf('>') + 1) + kol + '</svg>' };
  }
  function vSahneMetni(svg, g, h) {
    var k = svg.cloneNode(true), NS = 'http://www.w3.org/2000/svg', st = document.createElementNS(NS, 'style');
    k.setAttribute('xmlns', NS); if (!k.getAttribute('viewBox')) k.setAttribute('viewBox', '0 0 ' + g + ' ' + h); k.setAttribute('width', String(g * 2)); k.setAttribute('height', String(h * 2));
    st.textContent = '.etk{font-family:' + VID_UI + ';font-size:17px;font-weight:700;fill:#2B333D}.etk.kucuk{font-size:13px;font-weight:600;fill:#6A7582}.iy-yazi{font-family:' + VID_UI + ';font-size:11.5px;font-weight:800}.parla circle{stroke:#E04E00;stroke-width:3.2}';
    k.insertBefore(st, k.firstChild);
    return new XMLSerializer().serializeToString(k).replace(/var\(--ui\)/g, VID_UI_TEK);
  }

  // Ölçüm: adımlar görünmez bir tahtada (videonun boyunda) oynatıcının kendi kurallarıyla kurulur; her adımdan sonra
  // kelimelerin yeri, yazı biçimi, kutular ve sahne kaydedilir. Kanvas bu kayıtlardan çizer, böylece video tahtayla aynı görünür.
  Oynatici.prototype.videoOlc = function (A, plan, altyazi) {
    var self = this, r = this.r, t = TAHTALAR[ayar.tahta] || TAHTALAR.beyaz, kt = kalemTuru(), k = KALEMLER[kt], renkler = k.renkler;
    var anaRenk = renkler[Math.min(ayar.renk || 0, renkler.length - 1)][1];
    var y = YAZILAR.filter(function (q) { return q.id === ayar.yazi; })[0] || YAZILAR[0];
    var G = vGeometri(altyazi, t.cerceve), gor = { t: t, kt: kt, renkler: renkler, anaRenk: anaRenk };
    var yazi = y.css && document.fonts && document.fonts.load ? Promise.race([Promise.all(['400', '700'].map(function (w) { return document.fonts.load(w + ' 40px ' + y.aile, 'AaĞğŞşİıÇçÖöÜü0123→'); })), sleep(6000)]).catch(function () {}) : Promise.resolve();
    return yazi.then(function () {
      if (!self.olcumStil) { var st = document.createElement('style'); st.textContent = '.sd-olcum,.sd-olcum *{transition:none!important;animation:none!important}'; self.kok.appendChild(st); self.olcumStil = st; }
      var T = document.createElement('div');
      T.className = r.tahta.className.replace(/\bsahneli\b/g, '') + ' sd-olcum';
      ['data-kalem', 'data-izgara', 'data-cerceve'].forEach(function (a) { var v = r.tahta.getAttribute(a); if (v != null) T.setAttribute(a, v); });
      T.style.cssText = r.tahta.style.cssText;
      T.style.position = 'fixed'; T.style.left = '-30000px'; T.style.top = '0'; T.style.width = G.tahta.g + 'px'; T.style.height = G.tahta.h + 'px';
      T.style.aspectRatio = 'auto'; T.style.visibility = 'hidden'; T.style.pointerEvents = 'none';
      // videodaki tahta enine geniş: yazı biraz küçülür ki bir tahtaya ekrandaki kadar satır sığsın
      T.style.setProperty('--olcek', String(Math.round((parseFloat(T.style.getPropertyValue('--olcek')) || 1) * 0.88 * 1000) / 1000));
      T.innerHTML = '<div class="sd-ic"><div class="sd-yazi"></div></div><div class="sd-sahne"></div><div class="sd-kalem">' + kalemSVG(kt, anaRenk) + '</div><div class="sd-ogretmen">' + OGRETMEN_SVG + '</div>';
      self.kokEl.appendChild(T);
      try { var O = self.videoOlcAdimlar(T, A, plan); O.G = G; O.gor = gor; return O; }
      finally { if (T.parentNode) T.parentNode.removeChild(T); }
    });
  };
  Oynatici.prototype.videoOlcAdimlar = function (T, A, plan) {
    var self = this, yazi = T.querySelector('.sd-yazi'), sahneEl = T.querySelector('.sd-sahne'), tebesir = T.getAttribute('data-kalem') === 'tebesir';
    var temizle = function () { yazi.innerHTML = '<i class="sd-yer1" aria-hidden="true"></i><i class="sd-yer2" aria-hidden="true"></i>'; yazi.style.removeProperty('--sig'); };
    var tasiyor = function () { return yazi.scrollHeight > yazi.clientHeight + 2; };
    var sigdir = function () { var o = parseFloat(yazi.style.getPropertyValue('--sig')) || 1; while (tasiyor() && o > 0.5) { o = Math.round((o - 0.08) * 100) / 100; yazi.style.setProperty('--sig', String(o)); } };
    // deney sahnesi: oynatıcının sahne işlevleri bir süreliğine ölçüm tahtasında çalışır
    var asilR = this.r, asilS = this.sahneDurum, olcR = Object.create(asilR), olcS = { tur: null, durum: {}, iyonlar: [], dongu: null };
    olcR.sahne = sahneEl; olcR.tahta = T; olcR.ogretmen = T.querySelector('.sd-ogretmen');
    var sahnede = function (fn) { self.r = olcR; self.sahneDurum = olcS; try { fn(); } finally { cancelAnimationFrame(olcS.dongu); olcS.dongu = null; self.r = asilR; self.sahneDurum = asilS; } };
    var O = { adimlar: [], kelime: [], sahneler: [], blokAcik: {} };
    var kutuR = function (el, R0) { var q = el.getBoundingClientRect(); return { x: q.left - R0.left, y: q.top - R0.top, g: q.width, h: q.height }; };
    var font = function (st) { return st.fontStyle + ' ' + st.fontWeight + ' ' + st.fontSize + ' ' + st.fontFamily; };
    var rng = document.createRange();
    var metinler = function (kok, R0, runs, sahip) {
      var tw = document.createTreeWalker(kok, NodeFilter.SHOW_TEXT, null, false), n;
      while ((n = tw.nextNode())) {
        var m = n.nodeValue, eb = n.parentNode, q;
        if (!m || !/\S/.test(m)) continue;
        if (sahip && eb.closest && eb.closest('.w') !== sahip) continue;
        var st = getComputedStyle(eb), f = font(st), renk = st.color;
        rng.selectNodeContents(n);
        var rl = rng.getClientRects();
        if (rl.length <= 1) { q = rl.length ? rl[0] : rng.getBoundingClientRect(); if (q.width || q.height) runs.push({ t: m, x: q.left - R0.left, ust: q.top - R0.top, h: q.height, font: f, renk: renk }); continue; }
        var g = null; // satır sonunda bölünmüş: harf harf satırlara ayır
        for (var c = 0; c < m.length; c++) {
          rng.setStart(n, c); rng.setEnd(n, c + 1); q = rng.getBoundingClientRect();
          if (!q.width && !q.height) { if (g) g.t += m.charAt(c); continue; }
          if (!g || Math.abs(q.top - g.top) > q.height * 0.5) { if (g) runs.push({ t: g.t, x: g.x - R0.left, ust: g.top - R0.top, h: g.h, font: f, renk: renk }); g = { t: '', x: q.left, top: q.top, h: q.height }; }
          g.t += m.charAt(c);
        }
        if (g) runs.push({ t: g.t, x: g.x - R0.left, ust: g.top - R0.top, h: g.h, font: f, renk: renk });
      }
    };
    var tabloOlc = function (tb, R0) {
      var o = { hucre: [], metin: [] };
      Array.prototype.forEach.call(tb.querySelectorAll('td,th'), function (hc) {
        var st = getComputedStyle(hc), q = kutuR(hc, R0);
        q.arka = vSeffaf(st.backgroundColor) ? null : st.backgroundColor;
        q.kg = [st.borderTopWidth, st.borderRightWidth, st.borderBottomWidth, st.borderLeftWidth].map(function (v) { return parseFloat(v) || 0; });
        q.kr = [st.borderTopColor, st.borderRightColor, st.borderBottomColor, st.borderLeftColor];
        o.hucre.push(q);
      });
      metinler(tb, R0, o.metin, null);
      return o;
    };
    var kelimeOlc = function (w, R0) {
      var o = kutuR(w, R0), st = getComputedStyle(w), kay = O.kelime[w.__vid];
      o.fs = parseFloat(st.fontSize) || 20;
      if (w.classList.contains('w-blok')) {
        o.blok = true;
        o.arka = vSeffaf(st.backgroundColor) ? null : { renk: st.backgroundColor, rad: parseFloat(st.borderTopLeftRadius) || 0 };
        var pl = parseFloat(st.paddingLeft) || 0, pt = parseFloat(st.paddingTop) || 0, pr = parseFloat(st.paddingRight) || 0, pb = parseFloat(st.paddingBottom) || 0;
        o.ic = { x: o.x + pl, y: o.y + pt, g: Math.max(1, o.g - pl - pr), h: Math.max(1, o.h - pt - pb) };
        var tag = w.tagName.toLowerCase();
        if (tag === 'table') o.tablo = tabloOlc(w, R0);
        else if (!kay.kaynak) {
          if (tag === 'svg') {
            var kl = w.cloneNode(true); kl.removeAttribute('class'); kl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            if (!kl.getAttribute('font-family')) kl.setAttribute('font-family', VID_UI_TEK);
            kl.setAttribute('color', st.color);
            kay.kaynak = { svg: kl, g: o.ic.g, h: o.ic.h };
          } else kay.kaynak = { el: w };
        }
        return o;
      }
      o.golge = vGolge(st.textShadow);
      o.cizgi = !!w.closest('.b-title');
      o.tebesir = tebesir;
      o.runs = []; metinler(w, R0, o.runs, w);
      return o;
    };
    var blokOlc = function (b, R0) {
      var st = getComputedStyle(b), o = kutuR(b, R0);
      o.id = b.__vb;
      var kg = [st.borderTopWidth, st.borderRightWidth, st.borderBottomWidth, st.borderLeftWidth].map(function (v) { return parseFloat(v) || 0; });
      var kr = [st.borderTopColor, st.borderRightColor, st.borderBottomColor, st.borderLeftColor];
      var kenar = kg.some(function (v, j) { return v > 0 && !vSeffaf(kr[j]); });
      if (!vSeffaf(st.backgroundColor) || kenar) o.kutu = { arka: vSeffaf(st.backgroundColor) ? null : st.backgroundColor, kg: kg, kr: kr, golge: vGolge(st.boxShadow),
        rad: [st.borderTopLeftRadius, st.borderTopRightRadius, st.borderBottomRightRadius, st.borderBottomLeftRadius].map(function (v) { return parseFloat(v) || 0; }) };
      if (b.classList.contains('b-box')) { b.classList.add('acik'); var s2 = getComputedStyle(b); o.acik = { renk: s2.borderTopColor, k: parseFloat(s2.borderTopWidth) || 2, rad: parseFloat(s2.borderTopLeftRadius) || 0 }; b.classList.remove('acik'); }
      var ps = getComputedStyle(b, '::before'), ic = ps.content;
      if (ic && ic !== 'none' && ic !== 'normal') {
        var yz = ic.replace(/^["']|["']$/g, ''), sol = parseFloat(ps.left) || 0, ust = parseFloat(ps.top);
        if (yz) o.once = { tur: 'yazi', t: yz, x: o.x + sol, font: font(ps), renk: ps.color };
        else if (!vSeffaf(ps.backgroundColor)) o.once = { tur: 'kutu', x: o.x + sol, y: o.y + (isNaN(ust) ? 0 : ust), g: parseFloat(ps.width) || 0, h: parseFloat(ps.height) || 0, arka: ps.backgroundColor, rad: parseFloat(ps.borderTopLeftRadius) || 0 };
      }
      return o;
    };
    var anlik = function () {
      var R0 = T.getBoundingClientRect(), an = { w: {}, sira: [], bloklar: [], sahne: null };
      Array.prototype.forEach.call(yazi.querySelectorAll('.blok'), function (b) { an.bloklar.push(blokOlc(b, R0)); });
      Array.prototype.forEach.call(yazi.querySelectorAll('.w'), function (w) { if (w.__vid == null) return; an.w[w.__vid] = kelimeOlc(w, R0); an.sira.push(w.__vid); });
      if (T.classList.contains('sahneli')) an.sahne = kutuR(sahneEl, R0);
      return an;
    };
    temizle();
    var sayfa = 0, wid = 0, bid = 0, sonSahne = null;
    A.forEach(function (a, i) {
      var K = { i: i, s: a.s, on: plan && plan[i] ? plan[i].on : null, kim: plan && plan[i] ? plan[i].kim : null, silme: null, yeni: [], isaret: [], sahne: null, gorsel: !!a.gorsel };
      if (a.sil) { if (yazi.querySelector('.blok')) { K.silme = 'acik'; sayfa++; } temizle(); }
      if ('sahne' in a) sahnede(function () { self.sahneGoster(a.sahne); });
      var els = (a.w || a.h || []).map(function (b) { return self.blok(b, a.oto); });
      els.forEach(function (el) { yazi.appendChild(el); });
      if (els.length && tasiyor() && yazi.querySelectorAll('.blok').length > els.length) {
        els.forEach(function (el) { el.remove(); }); temizle();
        if (!K.silme) { K.silme = 'oto'; sayfa++; }
        els.forEach(function (el) { yazi.appendChild(el); }); sigdir();
      } else if (els.length) sigdir();
      if (a.yap) sahnede(function () { self.sahneYap(a.yap, true); });
      K.sayfa = sayfa;
      els.forEach(function (el) {
        el.__vb = ++bid;
        Array.prototype.forEach.call(el.querySelectorAll('.w'), function (w) { w.__vid = wid; O.kelime[wid] = { id: wid, adim: i, sayfa: sayfa, blok: bid }; K.yeni.push(wid); wid++; });
      });
      (a.ciz || []).forEach(function (key, j) { Array.prototype.forEach.call(yazi.querySelectorAll('[data-k="' + key + '"]'), function (w) { if (w.__vid != null) K.isaret.push({ wid: w.__vid, tur: 'ciz', gec: j * 0.26 }); }); });
      if (a.halka) Array.prototype.forEach.call(yazi.querySelectorAll('[data-k="' + a.halka + '"]'), function (w) { if (w.__vid != null) K.isaret.push({ wid: w.__vid, tur: 'halka', gec: 0 }); });
      var svg = T.classList.contains('sahneli') ? sahneEl.querySelector('svg') : null;
      if (svg) {
        var st = getComputedStyle(sahneEl), pad = parseFloat(st.paddingLeft) || 0, kut = sahneEl.getBoundingClientRect();
        var metin = vSahneMetni(svg, Math.round((kut.width - 2 * pad) * 2), Math.round((kut.height - 2 * pad) * 2));
        if (!sonSahne || sonSahne.metin !== metin) { sonSahne = { metin: metin, no: O.sahneler.length }; O.sahneler.push({ metin: metin, pad: pad }); }
        K.sahne = sonSahne.no;
      } else sonSahne = null;
      K.an = anlik();
      O.adimlar.push(K);
    });
    var R0 = T.getBoundingClientRect(), ts = getComputedStyle(T);
    O.ogretmen = kutuR(T.querySelector('.sd-ogretmen'), R0);
    O.kalemG = T.querySelector('.sd-kalem').getBoundingClientRect().width || 18;
    O.renk = { kirmizi: ts.getPropertyValue('--k-kirmizi').trim() || '#D3202E', turuncu: ts.getPropertyValue('--k-turuncu').trim() || '#E04E00' };
    O.kelime.forEach(function (kay) { var an = O.adimlar[kay.adim].an, w = an.w[kay.id]; if (w) { var ilk = O.blokAcik[kay.blok]; O.blokAcik[kay.blok] = ilk == null ? kay.id : Math.min(ilk, kay.id); } });
    return O;
  };

  // Zaman çizelgesi: adımlar arası boşluklar, silgi, karşılıklı anlatımdaki geçiş sözleri ve kelimelerin açılış anları
  // Kalemle kaydedilmiş adımda yazı hemen açılır; izlerin öncesine ve sonrasına süre eklenir (sessizken çizilenler kırpılmasın).
  // sec.kalem[i]: { ilk, son } kaydın saatinde; sec.studyo: kalem stüdyosu (her adım çok uzun, yazı hemen açılır)
  var KALEM_UZUN = 100000;
  function vZaman(O, sonuc, oran, sec) {
    sec = sec || {};
    var Z = [], t = 0.6, studyo = !!sec.studyo, KI = sec.kalem || [];
    O.adimlar.forEach(function (K, i) {
      var x = sonuc[i] || {}, z = { i: i }, ki = studyo ? null : KI[i], kb = 0;
      if (i) t += K.silme ? 0.25 : 0.55;
      z.bas0 = t;
      if (K.silme) { z.silBas = t; z.silSon = t + 0.72; t += 0.85; }
      if (x.on && !studyo) { z.onBas = t; z.onSure = x.on.length / oran; t += z.onSure + 0.25; }
      z.sure = x.ana ? x.ana.length / oran : 0;
      if (studyo || (ki && x.ana && x.ana.kendi)) {
        kb = studyo ? 0 : (x.ana.kirpBas || 0);
        z.kalemli = true; z.kBas = t; z.kirp = kb;
        t += studyo ? 0 : Math.max(0, Math.min(8, kb - ki.ilk + 0.15));
        z.bas = t; t += z.sure;
        if (!studyo) { z.ek = Math.max(0, Math.min(30, ki.son - kb - z.sure + 0.3)); t += z.ek; }
        z.gor = z.kBas;
      } else { z.bas = t; t += z.sure; z.gor = z.bas; }
      var n = K.yeni.length;
      if (z.kalemli) { var b0 = Math.max(z.kBas + 0.1, z.bas - kb + 0.15), ad = n ? Math.min(0.035, 0.9 / n) : 0; K.yeni.forEach(function (wid, j) { O.kelime[wid].acilis = b0 + ad * j; }); }
      else K.yeni.forEach(function (wid, j) { O.kelime[wid].acilis = z.bas + (n ? z.sure * j / (1.18 * n) : 0); });
      z.sonAcilis = n ? O.kelime[K.yeni[n - 1]].acilis : z.bas;
      z.isaret = K.isaret.map(function (s) { return { wid: s.wid, tur: s.tur, t: (z.kalemli ? z.sonAcilis + 0.4 : z.bas + 0.35 * z.sure) + s.gec }; });
      Z.push(z);
    });
    Object.keys(O.blokAcik).forEach(function (b) { O.blokAcik[b] = O.kelime[O.blokAcik[b]].acilis; });
    return { adimlar: Z, toplam: t + 1.4 };
  }

  // Videonun tek tek resimleri (öğretmen, kalem, sahneler, tahtadaki şekiller) önceden yüklenir
  function vKaynaklar(O) {
    var K = { ogretmen: {}, sahne: [] }, is = [], gor = O.gor, og = O.ogretmen, gw = Math.max(2, Math.round(og.g * 2)), gh = Math.max(2, Math.round(og.h * 2));
    is.push(vResim(TEBESIR_TOZ).then(function (im) { K.toz = im; }), vResim(TEBESIR_MASKE).then(function (im) { K.maske = im; }));
    if (ayar.ogretmen && !ayar.ikili && ayar.gorunum !== 'figur') is.push(Foto.yukle().then(function () { K.foto = Foto.resim || null; }));
    if (ayar.ogretmen) ['k', 'e'].forEach(function (cins) {
      var p = vOgretmenSvg(cins, gor.anaRenk, gw, gh);
      is.push(Promise.all(p.govde.map(vSvgResim)).then(function (l) { if (l.every(Boolean)) K.ogretmen[cins] = l; }));
      if (cins === 'k') is.push(vSvgResim(p.kol).then(function (im) { K.kol = im; }));
    });
    var kg = Math.max(2, Math.round(O.kalemG * 2));
    is.push(vSvgResim(kalemSVG(gor.kt, gor.anaRenk).replace('<svg viewBox="0 0 40 40">', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="' + kg + '" height="' + kg + '">')).then(function (im) { K.kalem = im; }));
    O.sahneler.forEach(function (s, i) { is.push(vSvgResim(s.metin).then(function (im) { K.sahne[i] = im; })); });
    O.kelime.forEach(function (kay) {
      var q = kay && kay.kaynak; if (!q) return;
      if (q.svg) { q.svg.setAttribute('width', String(Math.max(2, Math.round(q.g * 2)))); q.svg.setAttribute('height', String(Math.max(2, Math.round(q.h * 2)))); is.push(vSvgResim(new XMLSerializer().serializeToString(q.svg)).then(function (im) { kay.resim = im; })); }
      else if (q.el.tagName === 'IMG') is.push((q.el.complete && q.el.naturalWidth ? Promise.resolve(q.el) : vResim(q.el.currentSrc || q.el.src)).then(function (im) { kay.resim = im && vTemiz(im) ? im : null; }));
      else if (vTemiz(q.el)) kay.resim = q.el;
    });
    return Promise.all(is).then(function () { return K; });
  }

  function vArkaPlan(G, gor, K, RS) { // çerçeve, raf ve tahta zemini: bir kez çizilir
    RS = RS || 1;
    var c = document.createElement('canvas'); c.width = Math.round(VID_G * RS); c.height = Math.round(VID_Y * RS);
    var x = c.getContext('2d'); x.scale(RS, RS); var C = G.cer, B = G.tahta, R = G.raf, t = gor.t, cer = t.cerceve, gr, i;
    x.fillStyle = '#FBF8F5'; x.fillRect(0, 0, VID_G, VID_Y);
    var ik = cer === 'ahsap' ? ['#9A6A3C', '#6E4724'] : cer === 'siyah' ? ['#2A2F36', '#16191D'] : ['#E4E7EB', '#B9C0C8'];
    x.save(); x.shadowColor = 'rgba(20,17,15,.32)'; x.shadowBlur = 20; x.shadowOffsetY = 8;
    gr = x.createLinearGradient(0, C.y, 0, C.y + C.h); gr.addColorStop(0, ik[0]); gr.addColorStop(1, ik[1]);
    vYuvarlak(x, C.x, C.y, C.g, C.h, 12); x.fillStyle = gr; x.fill(); x.restore();
    if (cer === 'ahsap') {
      x.save(); vYuvarlak(x, C.x, C.y, C.g, C.h, 12); x.clip();
      x.strokeStyle = 'rgba(255,255,255,.03)'; x.lineWidth = 2;
      for (i = -C.h; i < C.g + C.h; i += 9) { x.beginPath(); x.moveTo(C.x + i, C.y); x.lineTo(C.x + i - C.h * 0.087, C.y + C.h); x.stroke(); }
      x.strokeStyle = 'rgba(0,0,0,.045)'; x.lineWidth = 1;
      for (i = -C.h; i < C.g + C.h; i += 13) { x.beginPath(); x.moveTo(C.x + i, C.y); x.lineTo(C.x + i + C.h * 0.176, C.y + C.h); x.stroke(); }
      x.strokeStyle = 'rgba(0,0,0,.25)'; vYuvarlak(x, C.x + .5, C.y + .5, C.g - 1, C.h - 1, 12); x.stroke();
      x.restore();
    } else if (cer === 'metal') { x.strokeStyle = 'rgba(255,255,255,.6)'; x.lineWidth = 1; x.beginPath(); x.moveTo(C.x + 12, C.y + 1.5); x.lineTo(C.x + C.g - 12, C.y + 1.5); x.stroke(); }
    var rk = cer === 'ahsap' ? ['#7B5230', '#5A3A1E'] : cer === 'siyah' ? ['#1C2025', '#111317'] : ['#C7CDD3', '#AEB5BD'];
    gr = x.createLinearGradient(0, R.y, 0, R.y + R.h); gr.addColorStop(0, rk[0]); gr.addColorStop(1, rk[1]);
    vYuvarlak(x, R.x, R.y, R.g, R.h, [0, 0, 12, 12]); x.fillStyle = gr; x.fill();
    var cubuk = function (sol, gen, yuk, alt, iki, ayir, dikey) {
      var cx = R.x + sol, cy = R.y + R.h - alt - yuk;
      x.save(); vYuvarlak(x, cx, cy, gen, yuk, 3); x.clip();
      x.fillStyle = iki[0]; x.fillRect(cx, cy, gen, yuk);
      if (iki[1]) { x.fillStyle = iki[1]; if (dikey) x.fillRect(cx, cy + yuk * ayir, gen, yuk * (1 - ayir)); else x.fillRect(cx + gen * ayir, cy, gen * (1 - ayir), yuk); }
      x.restore();
    };
    var rl = gor.renkler;
    if (gor.kt === 'tebesir') { rl.slice(0, 4).forEach(function (q, j) { cubuk(R.g * .12 + j * 34, 26, 6, 7, [q[1]]); }); cubuk(R.g * .58, 58, 9, 6, ['#6B4A2B', '#D8D2C6'], .55, true); }
    else if (gor.kt === 'dijital') rl.slice(0, 4).forEach(function (q, j) { cubuk(R.g * .12 + j * 44, 36, 5, 8, ['#2B3036', q[1]], .72); });
    else { rl.slice(0, 3).forEach(function (q, j) { cubuk(R.g * .14 + j * 54, 46, 6, 7, [q[1], '#14110F'], .7); }); cubuk(R.g * .58, 58, 9, 6, ['#3B4450', '#D9DDE2'], .55, true); }
    x.save(); vYuvarlak(x, B.x, B.y, B.g, B.h, 4); x.clip();
    x.fillStyle = t.zemin; x.fillRect(B.x, B.y, B.g, B.h);
    if (t.izgara) {
      x.fillStyle = 'rgba(70,120,170,.16)'; var ad = B.g * 0.04;
      for (var gx = 0; gx < B.g; gx += ad) x.fillRect(B.x + Math.round(gx), B.y, 1, B.h);
      for (var gy = 0; gy < B.h; gy += ad) x.fillRect(B.x, B.y + Math.round(gy), B.g, 1);
    }
    if (t.koyu) {
      [[.3, .3, .6, .4, .06], [.75, .7, .5, .35, .05]].forEach(function (q) {
        x.save(); x.translate(B.x + B.g * q[0], B.y + B.h * q[1]); x.scale(B.g * q[2], B.h * q[3]);
        var rg = x.createRadialGradient(0, 0, 0, 0, 0, 1); rg.addColorStop(0, 'rgba(255,255,255,' + q[4] * .5 + ')'); rg.addColorStop(.7, 'rgba(255,255,255,0)');
        x.fillStyle = rg; x.fillRect(-1, -1, 2, 2); x.restore();
      });
      if (K.toz) { x.save(); x.globalAlpha = .25; x.translate(B.x, B.y); x.fillStyle = x.createPattern(K.toz, 'repeat'); x.fillRect(0, 0, B.g, B.h); x.restore(); }
    }
    if (cer === 'siyah') { x.strokeStyle = '#0E1013'; x.lineWidth = 2; x.strokeRect(B.x, B.y, B.g, B.h); }
    else {
      x.strokeStyle = 'rgba(120,130,140,.35)'; x.lineWidth = 2; x.strokeRect(B.x, B.y, B.g, B.h);
      var ig = x.createLinearGradient(0, B.y, 0, B.y + 12); ig.addColorStop(0, 'rgba(30,40,55,.08)'); ig.addColorStop(1, 'rgba(30,40,55,0)'); x.fillStyle = ig; x.fillRect(B.x, B.y, B.g, 12);
    }
    x.restore();
    return c;
  }
  function vEgimli(B, aci, duraklar, RS) { // CSS linear-gradient(aci) karşılığı, tahta boyunda
    RS = RS || 1;
    var c = document.createElement('canvas'); c.width = Math.round(B.g * RS); c.height = Math.round(B.h * RS);
    var x = c.getContext('2d'); x.scale(RS, RS); var a = aci * Math.PI / 180, dx = Math.sin(a), dy = -Math.cos(a), L = Math.abs(B.g * dx) + Math.abs(B.h * dy);
    var gr = x.createLinearGradient(B.g / 2 - dx * L / 2, B.h / 2 - dy * L / 2, B.g / 2 + dx * L / 2, B.h / 2 + dy * L / 2);
    duraklar.forEach(function (d) { gr.addColorStop(d[0], d[1]); });
    x.fillStyle = gr; x.fillRect(0, 0, B.g, B.h); return c;
  }
  function vTabloCiz(x, tb, asc) {
    tb.hucre.forEach(function (h) {
      if (h.arka) { x.fillStyle = h.arka; x.fillRect(h.x, h.y, h.g, h.h); }
      [[h.x, h.y, h.x + h.g, h.y], [h.x + h.g, h.y, h.x + h.g, h.y + h.h], [h.x, h.y + h.h, h.x + h.g, h.y + h.h], [h.x, h.y, h.x, h.y + h.h]].forEach(function (k, j) {
        if (!(h.kg[j] > 0) || vSeffaf(h.kr[j])) return;
        x.strokeStyle = h.kr[j]; x.lineWidth = h.kg[j]; x.beginPath(); x.moveTo(k[0], k[1]); x.lineTo(k[2], k[3]); x.stroke();
      });
    });
    x.textBaseline = 'alphabetic';
    tb.metin.forEach(function (q) { x.font = q.font; x.fillStyle = q.renk; x.fillText(q.t, q.x, q.ust + asc(q.font).a); });
  }

  // Kare çizici: t saniyesindeki görüntüyü 1280×720 kanvasa çizer
  function vCizici(O, ZM, K, baslik, RS, secenek) { // RS: çizim ölçeği (1080p için 1,5); secenek.kosesiz: köşedeki öğretmen çizilmez
    RS = RS || 1; secenek = secenek || {};
    var Z = ZM.adimlar, G = O.G, gor = O.gor, B = G.tahta, A2 = G.alt, izD = { kalem: null, sil: false }; // izD: yakın çekimin izlediği kalem ve silme anı
    var tuval = document.createElement('canvas'); tuval.width = Math.round(VID_G * RS); tuval.height = Math.round(VID_Y * RS);
    var c = tuval.getContext('2d'), arka = vArkaPlan(G, gor, K, RS);
    var parlak = gor.t.cerceve === 'siyah' ? vEgimli(B, 115, [[0, 'rgba(255,255,255,.22)'], [.18, 'rgba(255,255,255,.22)'], [.18, 'rgba(255,255,255,0)'], [1, 'rgba(255,255,255,0)']], RS) : null;
    var iz = gor.t.koyu ? vEgimli(B, 100, [[.05, 'rgba(255,255,255,0)'], [.3, 'rgba(255,255,255,.55)'], [.55, 'rgba(255,255,255,.3)'], [.8, 'rgba(255,255,255,0)']], RS) : null;
    var olcX = document.createElement('canvas').getContext('2d'), ascB = {}, spr = {}, sprSayfa = -1, isrB = {}, altB = {};
    var asc = function (f) {
      if (ascB[f]) return ascB[f];
      olcX.font = f; var m = olcX.measureText('HgİÇ'), fs = parseFloat((f.match(/([\d.]+)px/) || [0, 16])[1]), a = m.fontBoundingBoxAscent, d = m.fontBoundingBoxDescent;
      if (!(a > 0)) { a = fs * 0.82; d = fs * 0.24; }
      return (ascB[f] = { a: a, d: d || fs * 0.24, fs: fs });
    };
    var sprite = function (wid, o) {
      var key = wid + '|' + Math.round(o.fs * 100) + '|' + Math.round(o.g), s = spr[key];
      if (s !== undefined) return s;
      var kay = O.kelime[wid], cv = document.createElement('canvas'), x, pad;
      if (o.blok) {
        pad = 2; var bg = Math.max(1, Math.ceil(o.g) + pad * 2), bh = Math.max(1, Math.ceil(o.h) + pad * 2); cv.width = Math.ceil(bg * RS); cv.height = Math.ceil(bh * RS);
        x = cv.getContext('2d'); x.scale(RS, RS); x.translate(pad - o.x, pad - o.y);
        if (o.arka) { x.fillStyle = o.arka.renk; vYuvarlak(x, o.x, o.y, o.g, o.h, o.arka.rad); x.fill(); }
        if (o.tablo) vTabloCiz(x, o.tablo, asc);
        else if (kay.resim) { try { x.drawImage(kay.resim, o.ic.x, o.ic.y, o.ic.g, o.ic.h); } catch (e) {} }
        return (spr[key] = { c: cv, dx: -pad, dy: -pad, g: bg, h: bh });
      }
      var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9, L = [];
      o.runs.forEach(function (q) {
        var m = asc(q.font); olcX.font = q.font;
        var gw = olcX.measureText(q.t).width, bl = q.ust + m.a;
        L.push({ q: q, bl: bl, gw: gw, m: m });
        minX = Math.min(minX, q.x - m.fs * 0.3); maxX = Math.max(maxX, q.x + gw + m.fs * 0.35);
        minY = Math.min(minY, bl - m.a - m.fs * 0.15); maxY = Math.max(maxY, bl + m.d + m.fs * 0.2);
      });
      if (!L.length) return (spr[key] = null);
      var b0 = o.golge ? Math.ceil(o.golge.bulanik * 2 + 2) : 0;
      minX = Math.floor(minX - b0); minY = Math.floor(minY - b0); maxX += b0; maxY += b0;
      var lg = Math.max(1, Math.ceil(maxX - minX)), lh = Math.max(1, Math.ceil(maxY - minY)); cv.width = Math.ceil(lg * RS); cv.height = Math.ceil(lh * RS);
      x = cv.getContext('2d'); x.scale(RS, RS); x.textBaseline = 'alphabetic';
      if (o.golge) { x.shadowColor = o.golge.renk; x.shadowBlur = o.golge.bulanik; x.shadowOffsetX = o.golge.x; x.shadowOffsetY = o.golge.y; }
      L.forEach(function (p) {
        x.font = p.q.font; x.fillStyle = p.q.renk; x.fillText(p.q.t, p.q.x - minX, p.bl - minY);
        if (o.cizgi) x.fillRect(p.q.x - minX, p.bl - minY + p.m.fs * 0.14, p.gw, Math.max(1, p.m.fs * 0.06));
      });
      if (o.tebesir && K.maske) { // tebeşir dokusu: yazıda küçük boşluklar
        x.shadowColor = 'transparent'; x.globalCompositeOperation = 'destination-in';
        var ox = Math.round(o.x - minX), oy = Math.round(o.y - minY);
        x.save(); x.translate(ox, oy); x.fillStyle = x.createPattern(K.maske, 'repeat'); x.fillRect(-ox, -oy, lg, lh); x.restore();
        x.globalCompositeOperation = 'source-over';
      }
      return (spr[key] = { c: cv, dx: minX - o.x, dy: minY - o.y, g: lg, h: lh });
    };
    var sayfaIsaret = function (k) {
      if (isrB[k]) return isrB[k];
      var m = {}, p = O.adimlar[k].sayfa;
      for (var j = k; j >= 0 && O.adimlar[j].sayfa === p; j--) Z[j].isaret.forEach(function (s) { var e = m[s.wid] || (m[s.wid] = {}); if (e[s.tur] == null || s.t < e[s.tur]) e[s.tur] = s.t; });
      return (isrB[k] = m);
    };
    var kutuCiz = function (b, k) {
      if (k.arka) {
        c.save();
        if (k.golge) { c.shadowColor = k.golge.renk; c.shadowBlur = k.golge.bulanik; c.shadowOffsetX = k.golge.x; c.shadowOffsetY = k.golge.y; }
        vYuvarlak(c, b.x, b.y, b.g, b.h, k.rad); c.fillStyle = k.arka; c.fill(); c.restore();
      }
      var es = k.kg[0] === k.kg[1] && k.kg[1] === k.kg[2] && k.kg[2] === k.kg[3] && k.kr[0] === k.kr[1] && k.kr[1] === k.kr[2] && k.kr[2] === k.kr[3];
      if (es) { if (k.kg[0] > 0 && !vSeffaf(k.kr[0])) { var w = k.kg[0]; c.strokeStyle = k.kr[0]; c.lineWidth = w; vYuvarlak(c, b.x + w / 2, b.y + w / 2, b.g - w, b.h - w, k.rad.map(function (r) { return Math.max(0, r - w / 2); })); c.stroke(); } return; }
      [[b.x, b.y + k.kg[0] / 2, b.x + b.g, b.y + k.kg[0] / 2], [b.x + b.g - k.kg[1] / 2, b.y, b.x + b.g - k.kg[1] / 2, b.y + b.h], [b.x, b.y + b.h - k.kg[2] / 2, b.x + b.g, b.y + b.h - k.kg[2] / 2], [b.x + k.kg[3] / 2, b.y, b.x + k.kg[3] / 2, b.y + b.h]].forEach(function (q, j) {
        if (!(k.kg[j] > 0) || vSeffaf(k.kr[j])) return;
        c.strokeStyle = k.kr[j]; c.lineWidth = k.kg[j]; c.beginPath(); c.moveTo(q[0], q[1]); c.lineTo(q[2], q[3]); c.stroke();
      });
    };
    var onceCiz = function (b, an) {
      var o = b.once;
      if (o.tur === 'kutu') { c.fillStyle = o.arka; vYuvarlak(c, o.x, o.y, o.g, o.h, o.rad); c.fill(); return; }
      var bl = null;
      for (var i = 0; i < an.sira.length && bl == null; i++) { var w = an.w[an.sira[i]]; if (O.kelime[an.sira[i]].blok === b.id && w.runs && w.runs.length) bl = w.runs[0].ust + asc(w.runs[0].font).a; }
      if (bl == null) bl = b.y + asc(o.font).a;
      c.font = o.font; c.fillStyle = o.renk; c.fillText(o.t, o.x, bl);
    };
    var isaretCiz = function (o, tur, gecen) {
      if (tur === 'ciz') {
        var p = vCikis((gecen - 0.05) / 0.45); if (p <= 0) return;
        var kal = Math.max(1.5, 0.09 * o.fs);
        c.save(); c.translate(o.x - 0.06 * o.g, o.y + 0.5 * o.h); c.rotate(-14 * Math.PI / 180);
        c.fillStyle = O.renk.kirmizi; vYuvarlak(c, 0, -kal / 2, 1.12 * o.g * p, kal, kal / 2); c.fill(); c.restore();
        return;
      }
      var e = vCikis(gecen / 0.5), sc = 0.6 + 0.4 * e, eg = o.g + 0.64 * o.fs, eh = o.h + 0.26 * o.fs;
      c.save(); c.globalAlpha *= e; c.translate(o.x - 0.32 * o.fs + eg / 2, o.y - 0.16 * o.fs + eh / 2); c.rotate(-4 * Math.PI / 180); c.scale(sc, sc);
      c.strokeStyle = O.renk.turuncu; c.lineWidth = Math.max(1.5, 0.075 * o.fs); c.beginPath(); c.ellipse(0, 0, eg / 2, eh / 2, 0, 0, Math.PI * 2); c.stroke(); c.restore();
    };
    var sayfaCiz = function (k, t) {
      var an = O.adimlar[k].an, isr = sayfaIsaret(k);
      an.bloklar.forEach(function (b) {
        if (b.kutu) kutuCiz(b, b.kutu);
        if (b.acik) { var ta = O.blokAcik[b.id]; if (ta != null && t >= ta) { c.save(); c.globalAlpha *= Math.min(1, (t - ta) / 0.5); c.strokeStyle = b.acik.renk; c.lineWidth = b.acik.k; vYuvarlak(c, b.x + b.acik.k / 2, b.y + b.acik.k / 2, b.g - b.acik.k, b.h - b.acik.k, b.acik.rad); c.stroke(); c.restore(); } }
        if (b.once) onceCiz(b, an);
      });
      an.sira.forEach(function (wid) {
        var kay = O.kelime[wid], o = an.w[wid];
        if (!o || kay.acilis == null || t < kay.acilis) return;
        var s = sprite(wid, o); if (!s) return;
        var gecen = t - kay.acilis, a0 = c.globalAlpha, m = isr[wid];
        if (m && m.ciz != null && t >= m.ciz) c.globalAlpha = a0 * 0.55;
        if (o.blok) { c.globalAlpha *= Math.min(1, gecen / 0.5); c.drawImage(s.c, o.x + s.dx, o.y + s.dy, s.g, s.h); }
        else {
          var p = gecen / (o.tebesir ? 0.42 : 0.3);
          if (p >= 1) c.drawImage(s.c, o.x + s.dx, o.y + s.dy, s.g, s.h);
          else { var gw = Math.min(s.g, o.g * 1.18 * vCikis(p) - s.dx); if (gw > 0.5) c.drawImage(s.c, 0, 0, Math.min(s.c.width, gw * RS), s.c.height, o.x + s.dx, o.y + s.dy, gw, s.h); }
        }
        c.globalAlpha = a0;
      });
      Object.keys(isr).forEach(function (wid) {
        var m = isr[wid], o = an.w[wid]; if (!o || O.kelime[wid].acilis > t) return;
        if (m.ciz != null && t >= m.ciz) isaretCiz(o, 'ciz', t - m.ciz);
        if (m.halka != null && t >= m.halka) isaretCiz(o, 'halka', t - m.halka);
      });
    };
    var sahneCiz = function (k, t) {
      var Ka = O.adimlar[k], kut = Ka.an.sahne; if (!kut || Ka.sahne == null) return;
      var simdi = K.sahne[Ka.sahne], once = null, a = 1, j = k;
      while (j > 0 && O.adimlar[j - 1].sahne === Ka.sahne) j--; // sahnenin geldiği adım
      var gecen = t - Z[j].bas;
      if (gecen < 1.2) { a = vYumusak(gecen / 1.2); if (j > 0 && O.adimlar[j - 1].sahne != null) once = K.sahne[O.adimlar[j - 1].sahne]; }
      var pad = O.sahneler[Ka.sahne].pad || 0;
      if (gor.t.koyu) { c.save(); c.globalAlpha = once ? 1 : a; c.fillStyle = 'rgba(255,255,255,.93)'; vYuvarlak(c, kut.x, kut.y, kut.g, kut.h, 12); c.fill(); c.restore(); }
      var ix = kut.x + pad, iy = kut.y + pad, ig = kut.g - pad * 2, ih = kut.h - pad * 2;
      if (once) { c.globalAlpha = 1 - a; c.drawImage(once, ix, iy, ig, ih); }
      if (simdi) { c.globalAlpha = a; c.drawImage(simdi, ix, iy, ig, ih); }
      c.globalAlpha = 1;
      return gecen < 1.2;
    };
    var silgiCiz = function (p) {
      var sx = B.g * (-0.24 + 1.28 * vYumusak(p)), sy = B.h * 0.08, sw = B.g * 0.2, sh = B.h * 0.84, iy = sy + sh * 0.3, ih = sh * 0.4, ix, iw, gr;
      c.save(); c.shadowColor = 'rgba(0,0,0,.32)'; c.shadowBlur = 12; c.shadowOffsetY = 6;
      if (gor.t.cerceve === 'siyah') {
        iw = sw * 0.4; ix = sx + sw * 0.3; gr = c.createLinearGradient(0, iy, 0, iy + ih); gr.addColorStop(0, '#E5E7EB'); gr.addColorStop(1, '#CBD5E1');
        c.fillStyle = gr; c.beginPath(); c.ellipse(ix + iw / 2, iy + ih / 2, iw / 2, ih / 2, 0, 0, Math.PI * 2); c.fill();
      } else {
        var ky = gor.t.koyu; iw = sw * 0.76; ix = sx + sw * 0.12;
        vYuvarlak(c, ix, iy, iw, ih, 8); c.fillStyle = ky ? '#6B4A2B' : '#3B4450'; c.fill();
        c.shadowColor = 'transparent'; c.clip(); c.fillStyle = ky ? '#D8D2C6' : '#E6E9EC'; c.fillRect(ix, iy + ih * (ky ? 0.5 : 0.52), iw, ih);
      }
      c.restore();
    };
    var altDuzen = function (anahtar, metin, kim) {
      if (altB[anahtar]) return altB[anahtar];
      var gen = A2.g - 36, sat = [[]], x0 = 0, rz = 0, re = /\S+/g, m;
      c.font = '500 24px ' + VID_UI; var bos = c.measureText(' ').width;
      if (kim) { c.font = '800 15px ' + VID_UI; rz = c.measureText(KONUSMACI[kim].ad).width + 18; x0 = rz + 8; c.font = '500 24px ' + VID_UI; }
      while ((m = re.exec(metin || ''))) {
        var w = c.measureText(m[0]).width;
        if (x0 + w > gen && sat[sat.length - 1].length) { sat.push([]); x0 = 0; }
        sat[sat.length - 1].push({ t: m[0], x: x0, g: w, bas: m.index, son: m.index + m[0].length });
        x0 += w + bos;
      }
      return (altB[anahtar] = { sat: sat, rz: rz, kim: kim, uz: Math.max(1, (metin || '').length) });
    };
    var altyaziCiz = function (d, p) {
      c.save(); c.shadowColor = 'rgba(20,17,15,.10)'; c.shadowBlur = 10; c.shadowOffsetY = 3;
      vYuvarlak(c, A2.x, A2.y, A2.g, A2.h, 12); c.fillStyle = '#FFFFFF'; c.fill(); c.restore();
      c.strokeStyle = '#E7E0D9'; c.lineWidth = 1; vYuvarlak(c, A2.x + .5, A2.y + .5, A2.g - 1, A2.h - 1, 12); c.stroke();
      c.textBaseline = 'middle';
      if (!d) {
        c.font = '700 26px ' + VID_UI; c.fillStyle = '#14110F';
        var bt = baslik || 'Sesli anlatım';
        while (bt.length > 4 && c.measureText(bt).width > A2.g - 40) bt = bt.slice(0, -2).replace(/\s+\S*$/, '') + '…';
        c.fillText(bt, A2.x + 20, A2.y + A2.h / 2 + 1); c.textBaseline = 'alphabetic'; return;
      }
      var ci = p >= 0 && p < 1 ? Math.floor(p * d.uz) : -1, su = 0, i, j;
      if (ci >= 0) for (i = 0; i < d.sat.length; i++) for (j = 0; j < d.sat[i].length; j++) if (ci >= d.sat[i][j].bas && ci < d.sat[i][j].son + 1) su = i;
      var cift = Math.floor(su / 2) * 2, gs = d.sat.slice(cift, cift + 2), satH = 32, y0 = A2.y + (A2.h - gs.length * satH) / 2;
      gs.forEach(function (s, k) {
        var yy = y0 + k * satH + satH / 2;
        if (k === 0 && cift === 0 && d.kim) {
          var kb = d.kim === 'A' ? ['#FCE4EE', '#A3154B'] : ['#E1ECFA', '#1A4A9C'];
          vYuvarlak(c, A2.x + 18, yy - 12, d.rz, 24, 12); c.fillStyle = kb[0]; c.fill();
          c.font = '800 15px ' + VID_UI; c.fillStyle = kb[1]; c.fillText(KONUSMACI[d.kim].ad, A2.x + 27, yy + 1);
        }
        c.font = '500 24px ' + VID_UI;
        s.forEach(function (w) {
          var xx = A2.x + 18 + w.x, vur = ci >= w.bas && ci < w.son + 1;
          if (vur) { c.fillStyle = '#FFF1E9'; vYuvarlak(c, xx - 3, yy - 15, w.g + 6, 30, 5); c.fill(); }
          c.fillStyle = vur ? '#C24100' : '#14110F'; c.fillText(w.t, xx, yy + 1);
        });
      });
      c.textBaseline = 'alphabetic';
    };
    var kalemKonum = function (an, Ka, z, t) { // son açılan kelimenin sağ altı; kalem 0,16 sn'de yeni yere kayar
      var hedef = function (j) { var o = an.w[Ka.yeni[j]]; return o ? [o.x + o.g - 2, o.y + o.h - O.kalemG * 0.9] : null; };
      var j = 0; while (j + 1 < Ka.yeni.length && O.kelime[Ka.yeni[j + 1]].acilis <= t) j++;
      var h1 = hedef(j); if (!h1) return null;
      var h0 = j > 0 ? hedef(j - 1) : h1, f = Math.min(1, (t - O.kelime[Ka.yeni[j]].acilis) / 0.16);
      if (!h0) return h1;
      return [h0[0] + (h1[0] - h0[0]) * f, h0[1] + (h1[1] - h0[1]) * f];
    };
    var kare = function (t) {
      c.setTransform(RS, 0, 0, RS, 0, 0);
      c.drawImage(arka, 0, 0, VID_G, VID_Y);
      var k = -1, i, z, Ka;
      for (i = 0; i < Z.length; i++) { if (Z[i].gor <= t) k = i; else break; }
      var sn = Z[k + 1], silP = -1, bos = false;
      if (sn && sn.silBas != null && t >= sn.silBas) { if (t < sn.silSon) silP = (t - sn.silBas) / (sn.silSon - sn.silBas); else bos = true; }
      if (k >= 0) { z = Z[k]; Ka = O.adimlar[k]; if (Ka.sayfa !== sprSayfa) { spr = {}; sprSayfa = Ka.sayfa; } }
      c.save(); c.translate(B.x, B.y); vYuvarlak(c, 0, 0, B.g, B.h, 4); c.clip();
      if (iz) { // silgi izi: koyu tahtada her silmede biraz artar
        var say = 0, son = -1; for (i = 0; i < Z.length; i++) if (Z[i].silBas != null && Z[i].silBas <= t) { say++; son = i; }
        if (say) { var lv = function (n) { return Math.min(0.16, 0.04 * n); }, ia = lv(say - 1) + (lv(say) - lv(say - 1)) * Math.min(1, (t - Z[son].silBas) / 0.4);
          c.save(); c.globalAlpha = ia; c.translate(B.g / 2, B.h / 2); c.rotate((vRastgele(son + 3) * 6 - 3) * Math.PI / 180); c.drawImage(iz, -B.g / 2, -B.h / 2, B.g, B.h); c.restore(); }
      }
      if (k >= 0 && !bos) {
        if (silP >= 0) { var q = Math.min(1, silP * 0.72 / 0.62); c.globalAlpha = Math.max(0, 1 - q * q); }
        sayfaCiz(k, t);
        c.globalAlpha = 1;
      }
      if (parlak) c.drawImage(parlak, 0, 0, B.g, B.h);
      var degisiyor = k >= 0 ? sahneCiz(k, t) : false;
      izD.sil = silP >= 0 || bos;
      if (k >= 0 && !bos && silP < 0 && Ka.yeni.length && t >= z.gor && t < z.sonAcilis + 0.25) {
        var kp = kalemKonum(Ka.an, Ka, z, t);
        var go = Ka.gorsel ? Ka.an.w[Ka.yeni[0]] : null;
        if (go) izD.kalem = [B.x + go.x + go.g / 2, B.y + go.y + go.h / 2]; else if (kp) izD.kalem = [B.x + kp[0], B.y + kp[1]];
        if (kp && K.kalem && !z.kalemli) { c.globalAlpha = t > z.sonAcilis ? 1 - (t - z.sonAcilis) / 0.25 : 1; c.drawImage(K.kalem, kp[0], kp[1], O.kalemG, O.kalemG); c.globalAlpha = 1; }
      }
      if (secenek.murekkep && k >= 0 && !bos) { // öğretmenin kalemle çizdikleri: sayfa silinirken yazıyla birlikte solar
        c.save();
        if (silP >= 0) { var q2 = Math.min(1, silP * 0.72 / 0.62); c.globalAlpha = Math.max(0, 1 - q2 * q2); }
        var mu = secenek.murekkep.ciz(c, t, Ka.sayfa);
        c.restore();
        if (mu && silP < 0) izD.kalem = [B.x + mu[0], B.y + mu[1]];
      }
      if (silP >= 0) silgiCiz(silP);
      if (ayar.ogretmen && !secenek.kosesiz) {
        var kj = -1; for (i = 0; i < Z.length; i++) { if (Z[i].bas0 <= t) kj = i; else break; }
        var kim = kj >= 0 ? O.adimlar[kj].kim : null, cins = kim ? KONUSMACI[kim].cins : ayar.cins, set = K.ogretmen[cins === 'e' ? 'e' : 'k'];
        var yz = K.yuzSec ? K.yuzSec(t, k) : null;
        if (yz) vYuzDaire(c, O.ogretmen, yz.im, yz.konus, t);
        else if (set) {
          var og = O.ogretmen, konus = (z && t >= z.bas && t < z.bas + z.sure) || (sn && sn.onBas != null && t >= sn.onBas && t < sn.onBas + sn.onSure);
          var agiz = konus && vRastgele(Math.floor(t / 0.115) + 11) < 0.62 ? 1 : 0, faz = (t % 4.6) / 4.6, kirp = faz > 0.95 && faz < 0.985 ? 2 : 0;
          var gy = og.y - 0.012 * og.h * (0.5 - 0.5 * Math.cos(2 * Math.PI * t / 4.2));
          c.drawImage(set[agiz + kirp], og.x, gy, og.g, og.h);
          if (K.kol) {
            var aci = 0;
            if (degisiyor) aci = -22;
            else if (z && Ka.yeni.length && t >= z.bas && t < z.sonAcilis) { var ph = (t / 0.42) % 2; aci = -5 + 11 * vYumusak(ph > 1 ? 2 - ph : ph); }
            var px = og.x + 40 * og.g / 160, py = gy + 178 * og.h / 212;
            c.save(); c.translate(px, py); c.rotate(aci * Math.PI / 180); c.drawImage(K.kol, og.x - px, gy - py, og.g, og.h); c.restore();
          }
          if (kim) {
            var adk = KONUSMACI[kim].ad, kb = kim === 'A' ? ['#FCE4EE', '#A3154B'] : ['#E1ECFA', '#1A4A9C'];
            c.font = '800 12.5px ' + VID_UI; var bw = c.measureText(adk).width + 16, bx = og.x + og.g / 2 - bw / 2, by = gy + og.h * 0.97 - 20;
            c.save(); c.shadowColor = 'rgba(0,0,0,.25)'; c.shadowBlur = 6; c.shadowOffsetY = 2; vYuvarlak(c, bx, by, bw, 20, 10); c.fillStyle = kb[0]; c.fill(); c.restore();
            c.fillStyle = kb[1]; c.textBaseline = 'middle'; c.fillText(adk, bx + 8, by + 10.5); c.textBaseline = 'alphabetic';
          }
        }
      }
      c.restore();
      if (A2) {
        var d = null, p = -1;
        if (sn && sn.onBas != null && t >= sn.onBas) { d = altDuzen('o' + (k + 1), O.adimlar[k + 1].on, O.adimlar[k + 1].kim); p = (t - sn.onBas) / sn.onSure; }
        else if (k >= 0 && !Ka.gorsel) { d = altDuzen('a' + k, z.alt || Ka.s, Ka.kim); p = z.ilerleme ? (t < z.bas + z.sure ? Math.min(0.999, z.ilerleme(t - z.bas)) : 1) : z.sure ? (t - z.bas) / z.sure : -1; }
        altyaziCiz(d, p);
      }
    };
    return {
      tuval: tuval, kare: kare, olcek: RS,
      alan: { x: B.x * RS, y: B.y * RS, g: B.g * RS, h: B.h * RS },
      kalem: function () { return izD.kalem ? [izD.kalem[0] * RS, izD.kalem[1] * RS] : null; },
      sil: function () { return izD.sil; }
    };
  }

  /* ---- kodlama: WebCodecs (hızlı) ya da tarayıcının kaydedicisi (gerçek zamanlı) ---- */
  function videoKodlayiciSec(gen, yuk, fps, bit) {
    gen = gen || VID_G; yuk = yuk || VID_Y; fps = fps || VID_FPS; bit = bit || 1200000;
    if (!window.VideoEncoder || !window.VideoFrame) return Promise.resolve(null);
    var l = gen * yuk > 921600 ? ['avc1.640028', 'avc1.4d0028', 'avc1.420028', 'avc1.64002a', 'avc1.640032'] : ['avc1.42001f', 'avc1.42e01f', 'avc1.4d001f', 'avc1.640028'], i = 0;
    var dene = function () {
      if (i >= l.length) return null;
      var c = { codec: l[i++], width: gen, height: yuk, bitrate: bit, framerate: fps, avc: { format: 'avc' } };
      return VideoEncoder.isConfigSupported(c).then(function (s) { return s && s.supported ? c : dene(); }, function () { return dene(); });
    };
    return Promise.resolve().then(dene);
  }
  function sesKodlayiciSec(oran) {
    if (!window.AudioEncoder || !window.AudioData) return Promise.resolve(null);
    var l = [], i = 0;
    [oran, 48000, 44100].forEach(function (o) { if (!l.some(function (x) { return x.sampleRate === o; })) l.push({ codec: 'mp4a.40.2', sampleRate: o, numberOfChannels: 1, bitrate: 64000 }); });
    l.push({ codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 2, bitrate: 96000 }, { codec: 'opus', sampleRate: 48000, numberOfChannels: 1, bitrate: 64000 });
    var dene = function () {
      if (i >= l.length) return null;
      var c = l[i++];
      return AudioEncoder.isConfigSupported(c).then(function (s) { return s && s.supported ? c : dene(); }, function () { return dene(); });
    };
    return Promise.resolve().then(dene);
  }
  // Videoda köşedeki öğretmen: yuvarlak çerçevede fotoğraf ya da kamerayla kaydedilmiş yüz
  function vYuzDaire(c, og, im, konus, t) {
    var d = og.g, cx = og.x + og.g / 2, cy = og.y + og.h - d / 2 - og.h * 0.04;
    c.save();
    if (konus) { c.beginPath(); c.arc(cx, cy, d / 2 + 5 + 1.5 * Math.sin(t * 9), 0, Math.PI * 2); c.fillStyle = 'rgba(248,83,0,.5)'; c.fill(); }
    c.shadowColor = 'rgba(0,0,0,.25)'; c.shadowBlur = 10; c.shadowOffsetY = 3;
    c.beginPath(); c.arc(cx, cy, d / 2 + 3, 0, Math.PI * 2); c.fillStyle = '#fff'; c.fill();
    c.shadowColor = 'transparent'; c.shadowBlur = 0; c.shadowOffsetY = 0;
    c.beginPath(); c.arc(cx, cy, d / 2, 0, Math.PI * 2); c.clip();
    try {
      var sg = im.displayWidth || im.videoWidth || im.naturalWidth || im.width, sh = im.displayHeight || im.videoHeight || im.naturalHeight || im.height, kk = Math.min(sg, sh);
      c.drawImage(im, (sg - kk) / 2, (sh - kk) * 0.35, kk, kk, cx - d / 2, cy - d / 2, d, d);
    } catch (e) {}
    c.restore();
  }
  function vYuzOnbellek(A, sonuc, anahtar) { // adımların yüz kareleri sırası gelince çözülür, geride kalanlar bırakılır
    var var_ = A.map(function (a, i) { var x = sonuc[i]; return !!(x && x.ana && x.ana.kendi && anahtar['y:' + ozet(a.s)]); });
    var hazir = {}, soz = {};
    return {
      var: var_.some(Boolean),
      vardir: function (k) { return !!var_[k]; },
      hazirMi: function (k) { return !var_[k] || !!hazir[k]; },
      kare: function (k, t) { return yuzKare(hazir[k], t); },
      yukle: function (k) {
        if (!var_[k] || hazir[k]) return Promise.resolve();
        if (!soz[k]) soz[k] = Kayitlar.al('y:' + ozet(A[k].s)).then(yuzCoz).then(function (c) { hazir[k] = c || { t: [], r: [] }; delete soz[k]; }, function () { hazir[k] = { t: [], r: [] }; delete soz[k]; });
        return soz[k];
      },
      birak: function (sinir) { Object.keys(hazir).forEach(function (k) { if (+k < sinir) { yuzBirak(hazir[k]); delete hazir[k]; } }); }
    };
  }
  function vYuzSecici(Z, sonuc, yb, foto) { // o andaki köşe resmi: yüz karesi, fotoğraf ya da null (çizgi figür)
    var tut = null, tutC = null;
    var sakla = function (im) { // son kare ayrı tuvalde tutulur; aralarda o görünür
      if (!tut) { tut = document.createElement('canvas'); tut.width = tut.height = YUZ_BOY; tutC = tut.getContext('2d'); }
      try { tutC.drawImage(im, 0, 0, YUZ_BOY, YUZ_BOY); tut.dolu = true; } catch (e) {}
    };
    return function (t, k) {
      var z = k >= 0 ? Z[k] : null, konus = !!(z && t >= z.bas && t < z.bas + z.sure);
      if (yb && yb.var) {
        var kk = Math.max(0, k), zk = Z[kk];
        yb.birak(kk - 1);
        if (kk + 1 < Z.length && yb.vardir(kk + 1) && t >= Z[kk + 1].bas0 - 1.5) yb.yukle(kk + 1);
        if (yb.vardir(kk)) {
          var x = sonuc[kk] && sonuc[kk].ana, ft = Math.max(0, Math.min(t, zk.bas + zk.sure) - zk.bas) + (x && x.kirpBas || 0);
          var im = yb.hazirMi(kk) ? yb.kare(kk, ft) : (yb.yukle(kk), null);
          if (im) { sakla(im); return { im: tut, konus: konus }; }
        }
        if (!foto && tut && tut.dolu) return { im: tut, konus: konus };
      }
      return foto ? { im: foto, konus: konus } : null;
    };
  }
  function vYuzHazirla(Z, yb) { // kodlarken: o adımın yüz kareleri çözülmeden kare çizilmez
    return function (t) {
      var k = -1; for (var i = 0; i < Z.length; i++) { if (Z[i].bas <= t) k = i; else break; }
      var kk = Math.max(0, k);
      return yb.vardir(kk) && !yb.hazirMi(kk) ? yb.yukle(kk) : null;
    };
  }
  // hazirla(t): o kare için beklenecek iş varsa söz döner. Bir kaynak takılırsa sonsuza dek beklenmez: 15 sn sonra
  // var olan kareyle devam edilir (sonraki beklemeler 2 sn); üç kez olursa artık beklenmez. olcum: sürelerin dökümü (ms)
  function vVideoKodla(kod, kareSay, ciz, tuval, ilerle, hazirla, fps, iptal) {
    fps = fps || VID_FPS;
    return new Promise(function (ok, red) {
      var ornekler = [], tanim = null, hata = null, ANAHTAR = fps * 2, i = 0, sabir = 15000, zorla = false, beklemeYok = false, doluAn = 0;
      var olc = { bekle: 0, ciz: 0, kare: 0, kodla: 0, atla: 0, bas: performance.now(), sure: 0 };
      var enc = new VideoEncoder({
        output: function (ch, meta) { var v = new Uint8Array(ch.byteLength); ch.copyTo(v); if (meta && meta.decoderConfig && meta.decoderConfig.description && !tanim) tanim = vBayt(meta.decoderConfig.description); ornekler.push({ veri: v, zaman: ch.timestamp, anahtar: ch.type === 'key' }); },
        error: function (e) { hata = e || new Error('görüntü kodlanamadı'); }
      });
      try { enc.configure(kod); } catch (e) { red(e); return; }
      var bekle = function (bek) {
        var t0 = performance.now(), bitti = false;
        var zs = setTimeout(function () {
          if (bitti) return; bitti = true; olc.bekle += performance.now() - t0; olc.atla++;
          if (window.console) console.warn('Kare ' + i + ' için kaynak ' + Math.round(sabir / 1000) + ' sn yanıt vermedi; var olan kareyle devam ediliyor.');
          sabir = 2000; zorla = true; if (olc.atla >= 3) beklemeYok = true; adim();
        }, sabir);
        // bekleme bitince bu kare yeniden sorulmadan çizilir: kaynak "hazırım" demese de (ör. oynatıcı kareyi bırakmışsa) döngü kilitlenmesin
        bek.then(function () { if (bitti) return; bitti = true; clearTimeout(zs); olc.bekle += performance.now() - t0; zorla = true; adim(); },
          function (e) { if (bitti) return; bitti = true; clearTimeout(zs); red(e); });
      };
      var adim = function () {
        if (hata) { red(hata); return; }
        if (iptal && iptal()) { try { enc.close(); } catch (e) {} red(kHata('Video hazırlama durduruldu.')); return; }
        try {
          var bitis = performance.now() + 28;
          while (i < kareSay && performance.now() < bitis && enc.encodeQueueSize < 6) {
            var bek = hazirla && !zorla && !beklemeYok ? hazirla(i / fps) : null;
            zorla = false;
            if (bek) { bekle(bek); return; }
            var t1 = performance.now();
            ciz(i / fps);
            var t2 = performance.now();
            var kare = new VideoFrame(tuval, { timestamp: Math.round(i * 1e6 / fps), duration: Math.round(1e6 / fps) }); // tuvalin çizimi burada tamamlanıp alınır
            var t3 = performance.now();
            enc.encode(kare, { keyFrame: i % ANAHTAR === 0 }); kare.close(); i++;
            olc.ciz += t2 - t1; olc.kare += t3 - t2; olc.kodla += performance.now() - t3;
          }
        } catch (e) { red(e); return; }
        ilerle(i / kareSay, olc, i);
        if (i < kareSay) {
          if (enc.encodeQueueSize >= 6) { // kodlayıcı kare almıyorsa sonsuz döngü yerine hata
            if (!doluAn) doluAn = performance.now();
            else if (performance.now() - doluAn > 20000) { red(kHata('Görüntü kodlayıcısı yanıt vermiyor. Ronya’yı kapatıp yeniden açtıktan sonra tekrar dene.')); return; }
          } else doluAn = 0;
          setTimeout(adim, enc.encodeQueueSize >= 6 ? 4 : 0);
        } else zamanSiniri(enc.flush(), 30000, 'Görüntü kodlayıcısı bitiremedi. Ronya’yı kapatıp yeniden açtıktan sonra tekrar dene.').then(function () {
          try { enc.close(); } catch (e) {} if (hata) throw hata;
          olc.sure = performance.now() - olc.bas; ok({ ornekler: ornekler, aciklama: tanim, olcum: olc });
        }).catch(red);
      };
      adim();
    });
  }
  function zamanSiniri(soz, ms, yazi) { // söz ms içinde bitmezse kullanıcıya gösterilecek hatayla düşer
    return Promise.race([soz, new Promise(function (ok, red) { setTimeout(function () { red(kHata(yazi)); }, ms); })]);
  }
  function vSesKodla(veri, oran, kod, ilerle) {
    return new Promise(function (ok, red) {
      var ornekler = [], tanim = null, hata = null, hedef = kod.sampleRate, kanal = kod.numberOfChannels, opus = kod.codec === 'opus', i = 0;
      var enc = new AudioEncoder({
        output: function (ch, meta) {
          var v = new Uint8Array(ch.byteLength); ch.copyTo(v);
          if (meta && meta.decoderConfig && meta.decoderConfig.description && !tanim) tanim = vBayt(meta.decoderConfig.description);
          if (!opus && v.length > 7 && v[0] === 0xff && (v[1] & 0xf0) === 0xf0) v = v.subarray((v[1] & 1) ? 7 : 9); // ADTS başlığı geldiyse at
          ornekler.push({ veri: v, sure: ch.duration });
        },
        error: function (e) { hata = e || new Error('ses kodlanamadı'); }
      });
      try { enc.configure(kod); } catch (e) { red(e); return; }
      var oranK = hedef / oran, toplam = Math.floor(veri.length * oranK), PARCA = 4096, doluAn = 0;
      var adim = function () {
        if (hata) { red(hata); return; }
        try {
          var bitis = performance.now() + 25;
          while (i < toplam && performance.now() < bitis && enc.encodeQueueSize < 8) {
            var n = Math.min(PARCA, toplam - i), b = new Float32Array(n * kanal);
            for (var j = 0; j < n; j++) {
              var xx = (i + j) / oranK, kk = Math.floor(xx), f = xx - kk, a0 = veri[kk] || 0, a1 = kk + 1 < veri.length ? veri[kk + 1] : a0, s = a0 + (a1 - a0) * f;
              b[j] = s; if (kanal > 1) b[n + j] = s;
            }
            var ad = new AudioData({ format: 'f32-planar', sampleRate: hedef, numberOfFrames: n, numberOfChannels: kanal, timestamp: Math.round(i * 1e6 / hedef), data: b });
            enc.encode(ad); ad.close(); i += n;
          }
        } catch (e) { red(e); return; }
        ilerle(toplam ? i / toplam : 1);
        if (i < toplam) {
          if (enc.encodeQueueSize >= 8) { if (!doluAn) doluAn = performance.now(); else if (performance.now() - doluAn > 20000) { red(kHata('Ses kodlayıcısı yanıt vermiyor. Ronya’yı kapatıp yeniden açtıktan sonra tekrar dene.')); return; } } else doluAn = 0;
          setTimeout(adim, enc.encodeQueueSize >= 8 ? 5 : 0);
        } else Promise.race([enc.flush(), sleep(20000).then(function () { // flush bitmezse elde olanla devam (en çok son birkaç çerçeve eksik kalır)
          if (!ornekler.length) throw kHata('Ses kodlayıcısı bitiremedi. Ronya’yı kapatıp yeniden açtıktan sonra tekrar dene.');
          if (window.console) console.warn('Ses kodlayıcısının flush’ı bitmedi; ' + ornekler.length + ' çerçeveyle devam ediliyor.');
        })]).then(function () {
          try { enc.close(); } catch (e) {}
          if (hata) throw hata;
          ornekler.forEach(function (o) { var d = opus && o.sure ? Math.round(o.sure * 48000 / 1e6) : 0; o.sure = opus ? (d > 0 ? d : 960) : 1024; });
          var onAtla = 312;
          if (opus && tanim && tanim.length >= 19 && String.fromCharCode.apply(null, tanim.subarray(0, 8)) === 'OpusHead') onAtla = tanim[10] | (tanim[11] << 8);
          ok({ ornekler: ornekler, asc: !opus ? ascBul(tanim, hedef, kanal) : null, opus: opus, onAtla: onAtla, kanal: kanal, oran: hedef, bit: kod.bitrate || 64000 });
        }).catch(red);
      };
      adim();
    }).then(function (s) { return sesSina(s, veri, oran); });
  }
  // Kodlanan AAC bu cihazda çalınabiliyor mu: ilk ~10 saniye M4A'ya sarılıp çözülür, ses gücü girişle karşılaştırılır.
  // Olmazsa tanım kendi kurduğumuzla değiştirilip yeniden denenir; yine olmazsa s.sorun videonun notuna yazılır.
  function sesSina(s, veri, oran) {
    if (!s || s.opus) return Promise.resolve(s);
    if (!s.ornekler.length) { s.sorun = 'Ses kodlanamadı; videonun sesi yok.'; return Promise.resolve(s); }
    var ctx = cozucuYap(); if (!ctx) return Promise.resolve(s);
    var n = Math.min(s.ornekler.length, Math.ceil(10 * s.oran / 1024) + 2), son = Math.min(veri.length, Math.round(10 * oran)), gir = 0, say = 0, i;
    for (i = 0; i < son; i += 8) { gir += veri[i] * veri[i]; say++; }
    gir = say ? Math.sqrt(gir / say) : 0;
    var dene = function (asc) {
      var t = { ornekler: s.ornekler.slice(0, n), asc: asc, kanal: s.kanal, oran: s.oran, bit: s.bit, opus: false };
      return blobTampon(mp4Yap([sesIzi(t, 1)], 'M4A ', 'audio/mp4')).then(function (buf) { return sesCoz(ctx, buf); }).then(function (ab) {
        var d = ab.getChannelData(0), c = 0, m = 0;
        for (var j = 0; j < d.length; j += 8) { c += d[j] * d[j]; m++; }
        return ab.length > 0 && (gir < 0.003 || (m ? Math.sqrt(c / m) : 0) > gir * 0.1);
      }, function () { return false; });
    };
    var kendi = ascYap(s.oran, s.kanal), ilk = s.asc || kendi;
    return dene(ilk).then(function (iyi) {
      if (iyi) return s;
      var ayni = ilk.length === kendi.length && Array.prototype.every.call(ilk, function (x, k) { return x === kendi[k]; });
      return (ayni ? Promise.resolve(false) : dene(kendi)).then(function (iyi2) {
        if (iyi2) s.asc = kendi; else s.sorun = 'Ses bu cihazda doğrulanamadı; videonun sesini kontrol et.';
        if (window.console) console.warn('Ses denetimi:', iyi2 ? 'kendi tanımımızla düzeldi' : 'çözülemedi', Array.prototype.slice.call(ilk));
        return s;
      });
    }).catch(function () { return s; });
  }
  function sesIzi(s, id) {
    var giris = s.opus ? sesGirisi('Opus', s.kanal, 48000, dOpsKutusu(s.kanal, s.onAtla, 48000)) : sesGirisi('mp4a', s.kanal, s.oran, esdsKutusu(s.asc || ascYap(s.oran, s.kanal), s.bit));
    return { tur: 'soun', id: id, olcek: s.opus ? 48000 : s.oran, giris: giris, ornekler: s.ornekler };
  }
  function videoIzi(v, gen, yuk) {
    gen = gen || VID_G; yuk = yuk || VID_Y;
    var o = v.ornekler, avcC = v.aciklama, i;
    if (o.length && annexbMi(o[0].veri)) { // tanım yoksa SPS ve PPS'ten kur
      var sps = null, pps = null;
      o.forEach(function (s) { var nl = naller(s.veri); nl.forEach(function (x) { var t = x[0] & 31; if (t === 7 && !sps) sps = x; if (t === 8 && !pps) pps = x; }); s.veri = avccYap(nl); });
      if (!avcC && sps && pps) avcC = avcCYap(sps, pps);
    }
    if (!avcC) throw new Error('Görüntü kodlayıcısı gerekli bilgiyi vermedi.');
    var pts = o.map(function (s) { return Math.round(s.zaman * 0.09); }), sirali = pts.slice().sort(function (a, b) { return a - b; }), gecik = 0, ks = Math.round(90000 / VID_FPS);
    for (i = 0; i < pts.length; i++) gecik = Math.max(gecik, sirali[i] - pts[i]);
    o.forEach(function (s, j) { var dts = sirali[j] - gecik, son = j + 1 < o.length ? sirali[j + 1] - gecik : dts + ks; s.sure = Math.max(1, son - dts); s.kayma = pts[j] - dts; });
    return { tur: 'vide', id: 1, olcek: 90000, genis: gen, yuk: yuk, giris: avc1Girisi(gen, yuk, avcC), ornekler: o };
  }
  function vKayitTuru(l) {
    if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return null;
    for (var i = 0; i < l.length; i++) { try { if (MediaRecorder.isTypeSupported(l[i])) return l[i]; } catch (e) {} }
    return null;
  }
  function vCanliKayit(o) { // ses (ve varsa tahta) gerçek zamanlı çalınıp tarayıcının kaydedicisiyle dosyaya alınır
    return new Promise(function (ok, red) {
      var ctx = o.ctx, ab, kaynak, hedef, izler, mr, parca = [], bitti = false;
      try {
        ab = ctx.createBuffer(1, o.ses.length, o.oran); ab.getChannelData(0).set(o.ses);
        kaynak = ctx.createBufferSource(); kaynak.buffer = ab; hedef = ctx.createMediaStreamDestination(); kaynak.connect(hedef);
        izler = hedef.stream.getAudioTracks();
        if (o.tuval) { o.ciz(0); izler = o.tuval.captureStream(o.fps || VID_FPS).getVideoTracks().concat(izler); }
        mr = new MediaRecorder(new MediaStream(izler), { mimeType: o.mime, videoBitsPerSecond: o.bit || 2500000, audioBitsPerSecond: 128000 });
      } catch (e) { red(e); return; }
      mr.ondataavailable = function (e) { if (e.data && e.data.size) parca.push(e.data); };
      mr.onstop = function () { izler.forEach(function (t) { try { t.stop(); } catch (e) {} }); ok(new Blob(parca, { type: (mr.mimeType || o.mime).split(';')[0] })); };
      mr.onerror = function (e) { if (!bitti) { bitti = true; red(e && e.error || new Error('kayıt hatası')); } };
      Promise.resolve(ctx.resume && ctx.resume()).then(function () {
        mr.start(1000);
        var t0 = ctx.currentTime + 0.25; kaynak.start(t0);
        var dongu = function () {
          if (bitti) return;
          var t = ctx.currentTime - t0;
          if (o.tuval) o.ciz(Math.max(0, t));
          o.ilerle(Math.max(0, Math.min(1, t / o.toplam)), Math.max(0, t));
          if (t >= o.toplam + 0.2) { bitti = true; try { mr.stop(); } catch (e) { red(e); } return; }
          setTimeout(dongu, 1000 / 30);
        };
        dongu();
      }).catch(red);
    });
  }
  function kHata(m) { var e = new Error(m); e.kullanici = true; return e; }
  // Her adımın sesi (öğretmen kaydı ya da doğal ses) çözülüp temizlenir; aynı anda en çok 3 cümle
  Oynatici.prototype.sesTopla = function (A, plan, secim, ctx, ilerle) {
    var self = this, say = { bitti: 0, eksik: 0, kendi: 0, dogal: 0 };
    var tampon = function (url) { return fetch(url).then(function (x) { if (!x.ok && x.status) throw new Error('ses alınamadı'); return x.arrayBuffer(); }); };
    var adimSesi = function (i) {
      var a = A[i], pl = plan && plan[i], sesi = konusmaciSesi(pl ? pl.kim : null);
      var bulut = function (m, sayilsin) {
        if (!Bulut.hazir()) return Promise.resolve(null);
        return Bulut.al(m, sesi.bulut).then(function (k) { return tampon(k.url); }).then(function (b) { return sesCoz(ctx, b); })
          .then(function (ab) { var v = parcaHazirla(ab, false); if (v && sayilsin) say.dogal++; return v; });
      };
      var ana = secim === 'kayit'
        ? self.kayitBul(a.s).then(function (k) {
            if (!k) return bulut(a.s, true);
            return tampon(k.url).then(function (b) { if (k.yerel) URL.revokeObjectURL(k.url); return sesCoz(ctx, b); })
              .then(function (ab) { var v = parcaHazirla(ab, true); if (v) say.kendi++; return v; })
              .catch(function () { return bulut(a.s, true); });
          })
        : bulut(a.s, true);
      var on = pl && pl.on ? bulut(pl.on, false).catch(function () { return null; }) : Promise.resolve(null);
      return Promise.all([on, ana.catch(function () { return null; })]).then(function (s) {
        say.bitti++; if (!s[1]) say.eksik++;
        ilerle(say.bitti);
        return { on: s[0], ana: s[1], sil: !!a.sil };
      });
    };
    var sonuc = new Array(A.length), sira = 0;
    var isci = function () { if (sira >= A.length) return Promise.resolve(); var i = sira++; return adimSesi(i).then(function (x) { sonuc[i] = x; return isci(); }); };
    var iscilar = []; for (var w = 0; w < Math.min(3, A.length); w++) iscilar.push(isci());
    return Promise.all(iscilar).then(function () { return { sonuc: sonuc, say: say }; });
  };
  function sesBirlestir(sonuc, oran) { // MP3 ve MP4 ses: adımlar arasında kısa boşluklarla tek parça
    var parcalar = [], toplam = Math.round(0.35 * oran), ilk = true;
    sonuc.forEach(function (x) {
      if (!x || !x.ana) return;
      if (!ilk) { var bos = Math.round((x.sil ? 1.0 : 0.55) * oran); parcalar.push(bos); toplam += bos; }
      if (x.on) { var ara = Math.round(0.25 * oran); parcalar.push(x.on, ara); toplam += x.on.length + ara; }
      parcalar.push(x.ana); toplam += x.ana.length; ilk = false;
    });
    if (ilk) return null;
    toplam += Math.round(0.6 * oran);
    var cikis = new Float32Array(toplam), konum = Math.round(0.35 * oran);
    parcalar.forEach(function (p) { if (typeof p === 'number') konum += p; else { cikis.set(p, konum); konum += p.length; } });
    return cikis;
  }
  Oynatici.prototype.sesDosyasi = function () {
    if (this.ekranModu()) { this.ekranVideosu(); return; }
    var self = this, r = this.r, A = (this.P.adimlar || []).slice(), plan = this.P.plan, secim = this.indirSecim, bicim = this.indirBicim || 'mp3';
    if (this.indiriliyor || !A.length) return;
    var KS = this.kisimAl();
    if (KS.parca) { // dersin bir kısmı: ilk adımı temiz tahtada başlar, önceki adımlardan kalan deney sahnesi korunur
      var tum = A, ilk = {}, j;
      A = tum.slice(KS.bas, KS.son + 1);
      for (j in A[0]) if (Object.prototype.hasOwnProperty.call(A[0], j)) ilk[j] = A[0][j];
      ilk.sil = 1;
      if (!('sahne' in ilk)) for (j = KS.bas - 1; j >= 0; j--) if ('sahne' in tum[j]) { ilk.sahne = tum[j].sahne; break; }
      A[0] = ilk;
      if (plan) plan = plan.slice(KS.bas, KS.son + 1);
    }
    if (secim === 'bulut' && !Bulut.hazir()) { this.indirHata('Doğal sesler şu an kullanılamıyor.'); return; }
    var ctx = cozucuYap();
    if (!ctx) { this.indirHata('Bu tarayıcı ses dosyası hazırlayamıyor. Safari ya da Chrome’un güncel sürümünü dene.'); return; }
    var canli = null; // gerçek zamanlı kayıt gerekirse diye: iPhone'da ses yalnız dokunuşla açılır
    if (bicim !== 'mp3') { try { var AC = window.AudioContext || window.webkitAudioContext; if (AC) { canli = new AC(); if (canli.resume) canli.resume(); } } catch (e) { canli = null; } }
    this.indirSifirla(); this.indiriliyor = true; this.indirCiz();
    var baslik = (this.P.ders && this.P.ders.baslik) || (this.P.id === 'metin' ? 'kendi metnim' : this.P.id) || 'ders';
    var kisimEk = KS.parca ? (KS.bolum >= 0 ? '-bolum-' + (KS.bolum + 1) : '-adim-' + (KS.bas + 1) + '-' + (KS.son + 1)) : '';
    var ad = 'sesli-' + slugla(baslik) + (secim === 'kayit' ? '-kendi-sesim' : '') + kisimEk, video = bicim === 'mp4', altyazi = !!(r.indirAltyazi && r.indirAltyazi.checked);
    var durum = function (yazi, oran) { r.indirYazi.textContent = yazi; if (oran != null) r.indirCubuk.style.width = Math.round(Math.max(0, Math.min(1, oran)) * 100) + '%'; };
    var bosHata = secim === 'kayit' ? 'Bu derste kullanılabilecek ses kaydı bulunamadı. Önce “Kendi sesinle kaydet” ile cümleleri oku.' : 'Doğal ses alınamadı. İnternet bağlantını kontrol edip yeniden dene.';
    var kilit = null, say = null;
    if (video && navigator.wakeLock && navigator.wakeLock.request) navigator.wakeLock.request('screen').then(function (k) { kilit = k; }, function () {});
    r.indirIlerleme.hidden = false;
    durum('Sesler hazırlanıyor… 0/' + A.length, 0);
    SES_ISLE = !!(r.sesIsleAc && r.sesIsleAc.checked && window.SesliSes && secim === 'kayit');
    var muzikVeri = null;
    this.muzikHazirla(ctx).then(function (m) { muzikVeri = m; return self.sesTopla(A, plan, secim, ctx, function (n) { durum((SES_ISLE ? 'Sesler temizleniyor… ' : 'Sesler hazırlanıyor… ') + n + '/' + A.length, n / A.length * (video ? 0.3 : 0.7)); }); }).then(function (s) {
      say = s.say;
      if (!s.sonuc.some(function (x) { return x && x.ana; })) throw kHata(bosHata);
      if (video) return self.videoUret(A, plan, s.sonuc, ctx.sampleRate, ad, durum, canli, altyazi, baslik, muzikVeri);
      var oran = ctx.sampleRate, cikis = sesBirlestir(s.sonuc, oran), sure = cikis.length / oran;
      if (window.SesliSes && (SES_ISLE || muzikVeri)) { durum('Ses düzenleniyor…', 0.71); window.SesliSes.son(cikis, oran, { muzik: muzikVeri }); }
      if (bicim === 'm4a') return self.m4aUret(cikis, oran, ad, durum, canli);
      var i16 = int16Yap(cikis); cikis = null;
      durum('Dosyaya çevriliyor…', 0.72);
      return lameYukle().then(function (lame) {
        return mp3Yap(lame, i16, oran, function (o) { durum('MP3’e çevriliyor… %' + Math.round(o * 100), 0.72 + o * 0.28); })
          .then(function (blob) { return { blob: blob, ad: ad + '.mp3', tur: 'MP3', sure: sure }; });
      }, function () { return { blob: wavYap(i16, oran), ad: ad + '.wav', tur: 'WAV', sure: sure }; });
    }).then(function (d) {
      self.indirTamam(d, { video: video, secim: secim, say: say, KS: KS, A: A });
    }).catch(function (e) {
      self.indiriliyor = false; r.indirIlerleme.hidden = true; self.indirCiz();
      self.indirHata(e && e.kullanici ? e.message : (video ? 'Video hazırlanamadı. ' : 'Dosya hazırlanamadı. ') + 'Bağlantını kontrol edip yeniden dene.');
      if (window.console && e) console.warn('Sesli ders indirme:', e);
    }).then(function () {
      if (canli && canli.close) { try { canli.close(); } catch (e) {} }
      if (kilit && kilit.release) { try { kilit.release(); } catch (e) {} }
      r.indirOnizleme.hidden = true; r.indirOnizleme.innerHTML = '';
    });
  };
  Oynatici.prototype.indirTamam = function (d, o) { // hazırlanan dosya: indirme bağlantısı, paylaş, altyazı, paylaşım metni, notlar
    var self = this, r = this.r, say = o.say;
    this.indiriliyor = false;
    this.indirUrl = URL.createObjectURL(d.blob); this.indirDosya = d;
    r.indirLink.setAttribute('href', this.indirUrl); r.indirLink.setAttribute('download', d.ad);
    r.indirLink.textContent = '⬇ İndir (' + d.tur + ', ' + boyutYazi(d.blob.size) + ')';
    if (d.srt && r.indirSrt) { this.srtUrl = URL.createObjectURL(new Blob(['﻿' + d.srt], { type: 'application/x-subrip;charset=utf-8' })); r.indirSrt.setAttribute('href', this.srtUrl); r.indirSrt.setAttribute('download', d.ad.replace(/\.[a-z0-9]+$/i, '') + '.srt'); r.indirSrt.hidden = false; }
    r.indirSonuc.hidden = false;
    var dosya = null; try { dosya = new File([d.blob], d.ad, { type: d.blob.type }); } catch (e) {}
    var paylas = false; try { paylas = !!(dosya && navigator.share && navigator.canShare && navigator.canShare({ files: [dosya] })); } catch (e) {}
    r.indirPaylas.hidden = !paylas;
    r.indirYazi.textContent = 'Hazır: ' + sureYazi(d.sure) + ' · ' + d.ad; r.indirCubuk.style.width = '100%';
    if (o.video && d.zamanlar && r.paylasimKutu) {
      try { var pm = self.paylasimMetni(d, o.KS, o.A); r.paylasimBaslik.value = pm.baslik; r.paylasimBaslikSatir.hidden = !pm.baslik; r.paylasimMetin.value = pm.metin; r.paylasimNot.textContent = ''; r.paylasimKutu.hidden = false; }
      catch (e) { if (window.console) console.warn('Paylaşım metni:', e); }
    }
    var not = [];
    if (d.not) not.push(d.not);
    if (o.secim === 'kayit' && say && say.dogal) not.push(say.kendi + ' cümle senin sesinle, ' + say.dogal + ' cümle doğal sesle.');
    if (say && say.eksik) not.push(say.eksik + ' cümlenin sesi alınamadığı için ' + (o.video ? 'videoda sessiz geçti.' : 'dosyaya girmedi.'));
    if (not.length) this.indirHata(not.join(' '));
    this.indirCiz();
  };
  Oynatici.prototype.m4aUret = function (cikis, oran, ad, durum, canli) {
    var sure = cikis.length / oran;
    vSinirla(cikis);
    durum('MP4’e çevriliyor…', 0.72);
    return sesKodlayiciSec(oran).then(function (kod) {
      if (kod) return vSesKodla(cikis, oran, kod, function (o) { durum('MP4’e çevriliyor… %' + Math.round(o * 100), 0.72 + o * 0.26); }).then(function (s) {
        return { blob: mp4Yap([sesIzi(s, 1)], 'M4A ', 'audio/mp4'), ad: ad + '.m4a', tur: 'MP4 ses', sure: sure, not: s.sorun || '' };
      });
      var mime = vKayitTuru(['audio/mp4;codecs=mp4a.40.2', 'audio/mp4']);
      if (!mime || !canli) throw kHata('Bu tarayıcı MP4 ses dosyası hazırlayamıyor. “MP3 ses”i seçebilir ya da Safari/Chrome’un güncel sürümünü deneyebilirsin.');
      return vCanliKayit({ ctx: canli, ses: cikis, oran: oran, mime: mime, toplam: sure, ilerle: function (o, t) { durum('Kaydediliyor… ' + saatYazi(t) + ' / ' + saatYazi(sure) + ' · sayfadan ayrılma', 0.72 + o * 0.27); } })
        .then(function (blob) { return { blob: blob, ad: ad + '.m4a', tur: 'MP4 ses', sure: sure }; });
    });
  };
  Oynatici.prototype.muzikHazirla = function (ctx) { // fon müziği: üretilecek türün adı ya da kendi müziğinin tek kanallı sesi
    var tur = this.muzikTur || 'yok';
    if (!window.SesliSes || tur === 'yok') return Promise.resolve(null);
    if (tur !== 'kendi') return Promise.resolve(tur);
    return Kayitlar.al('muzik:kendi').then(function (v) {
      if (!v || !v.veri) return null;
      return sesCoz(ctx, v.veri.slice(0)).then(function (ab) { var n = ab.length, k = ab.numberOfChannels, m = new Float32Array(n); for (var c = 0; c < k; c++) { var d = ab.getChannelData(c); for (var i = 0; i < n; i++) m[i] += d[i] / k; } return m; });
    }).catch(function () { return null; });
  };
  Oynatici.prototype.videoUret = function (A, plan, sonuc, oran, ad, durum, canli, altyazi, baslik, muzikVeri) {
    var self = this, O, Z, K, ST = window.SesliStudyo, P = ST && this.indirPlat !== 'hizli' ? ST.BICIMLER[this.indirPlat] : null;
    var hizli = !P; if (hizli) P = { G: VID_G, Y: VID_Y, fps: VID_FPS, bit: 1200000 };
    var mod = ayar.ogretmen && !ayar.ikili ? (ayar.gorunum || 'figur') : 'figur';
    var yer = hizli ? 'kose' : (this.indirYer || P.yer[0]), stil = !altyazi ? 'yok' : hizli ? 'klasik' : (this.indirAltStil || 'buyuk');
    var kose = yer === 'kose', klasikTahtada = kose && stil === 'klasik', RS = hizli ? 1 : 1.5; // tahta 1920×1080 çizilir, yerleşime göre kırpılır
    var sb = null, yb = null, kd = null;
    var adimNo = function (t) { var k = -1; for (var i = 0; i < Z.adimlar.length; i++) { if (Z.adimlar[i].gor <= t) k = i; else break; } return k; };
    var KV = [], KL = window.SesliKalem;
    durum('Tahta hazırlanıyor…', 0.31);
    return Promise.all([this.videoOlc(A, plan, klasikTahtada), this.kalemVerileri(A, sonuc)]).then(function (s0) {
      var o = s0[0]; KV = s0[1];
      O = o; Z = vZaman(O, sonuc, oran, { kalem: KV.map(function (v) { return v && KL ? KL.sinirlar(v) : null; }) });
      altyaziHazirla(O, Z, sonuc, oran);
      return Promise.all([vKaynaklar(O), mod === 'video' ? Kayitlar.anahtarlar() : [], videoKodlayiciSec(P.G, P.Y, P.fps, P.bit), sesKodlayiciSec(oran)]);
    }).then(function (kk) {
      K = kk[0]; kd = [kk[2], kk[3]];
      var anah = {}, cevrimdisi = !!(kd[0] && kd[1]);
      kk[1].forEach(function (x) { anah[x] = 1; });
      if (mod === 'video' && ST) {
        var var_ = A.map(function (a, i) { var x = sonuc[i], h = ozet(a.s); return !!(x && x.ana && x.ana.kendi && (anah['v:' + h] || anah['y:' + h])); });
        sb = ST.yuzSaglayici({
          Z: Z.adimlar, sonuc: sonuc, var: var_, canli: !cevrimdisi, foto: K.foto || null, kareBul: yuzKare, kareBirak: yuzBirak,
          al: function (k) {
            var h = ozet(A[k].s);
            return Kayitlar.al('v:' + h).then(function (v) {
              if (v && v.veri && (cevrimdisi ? ST.YuzCozucu.destek() : true)) return { tur: 'video', veri: v.veri, mime: v.mime, fark: v.fark || 0 };
              return Kayitlar.al('y:' + h).then(yuzCoz).then(function (c) { return c ? { tur: 'kare', cozum: c, fark: 0 } : null; });
            });
          }
        });
        K.yuzSec = kose ? function (t, k) { return sb.kaynak(t, k); } : null;
      } else {
        if (mod === 'video') yb = vYuzOnbellek(A, sonuc, anah);
        K.yuzSec = mod === 'figur' || !kose ? null : vYuzSecici(Z.adimlar, sonuc, yb, K.foto || null);
      }
      // stüdyo görünümü: yüzün ışığı, rengi ve arka planı (arka plan için kişi maskesi gerekir)
      var yuzVarMi = !!(sb && sb.var) || (mod !== 'figur' && !!K.foto), gorA = { isik: !!(self.r.indirIsik && self.r.indirIsik.checked), arka: self.indirArka || 'bulanik' }, gorNot = '';
      var ayiriciSoz = ST && ST.gorunum && yuzVarMi && gorA.arka !== 'yok' ? (durum('Arka plan ayırıcı hazırlanıyor…', 0.315), Promise.race([ST.ayiriciYukle(), sleep(30000).then(function () { throw new Error('zaman aşımı'); })]).catch(function (e) {
        gorNot = 'Arka plan ayrılamadı (ilk seferde internet gerekir); yüzün arka planıyla birlikte kullanıldı.'; if (window.console) console.warn('Arka plan ayırıcı:', e); return null;
      })) : Promise.resolve(null);
      return ayiriciSoz.then(function (ayirici) {
      var GR = ST && ST.gorunum && yuzVarMi && (gorA.isik || ayirici) ? ST.gorunum({ isik: gorA.isik, arka: ayirici ? gorA.arka : 'yok', ayirici: ayirici }) : null;
      if (GR && K.yuzSec) { // köşedeki yuvarlak için kare biçiminde işlenir
        var yuzSec0 = K.yuzSec;
        K.yuzSec = function (t, k) {
          var s0 = yuzSec0(t, k); if (!s0 || !s0.im) return s0;
          var im0 = s0.im, w0 = s0.g || im0.displayWidth || im0.videoWidth || im0.naturalWidth || im0.width, h0 = s0.y || im0.displayHeight || im0.videoHeight || im0.naturalHeight || im0.height;
          return w0 && h0 ? { im: GR.isle(im0, w0, h0, 400, 400, 0.5, 0.36, t), g: 400, y: 400, konus: s0.konus } : s0;
        };
      }
      var SU = window.SesliSunum, SA = SU ? self.sunumAyar() : null, GI = SA && SA.giris ? SU.GIRIS_SURE : 0, GO = SA && SA.kapanis ? SU.KAPANIS_SURE : 0;
      var n = Math.ceil((GI + Z.toplam + GO) * oran), ses = new Float32Array(n);
      var koy = function (p, t) { if (!p || t == null) return; var bas = Math.round((t + GI) * oran), m = Math.min(p.length, n - bas); if (m > 0) ses.set(m < p.length ? p.subarray(0, m) : p, bas); };
      var kat = function (p, t) { if (!p) return; var bas = Math.round(t * oran); for (var i = 0; i < p.length && bas + i < n; i++) ses[bas + i] += p[i]; };
      Z.adimlar.forEach(function (z, i) { var x = sonuc[i]; if (!x) return; koy(x.on, z.onBas); koy(x.ana, z.bas); });
      if (GI) kat(SU.girisSesi(oran), 0);
      if (GO) kat(SU.kapanisSesi(oran), GI + Z.toplam);
      if (window.SesliSes && (SES_ISLE || muzikVeri || GI || GO)) window.SesliSes.son(ses, oran, { muzik: muzikVeri, bas: GI, son: GI + Z.toplam });
      else vSinirla(ses);
      var TB = O.G.tahta, mur = KL && KV.some(Boolean) ? KL.cizici({ RS: RS, g: TB.g, h: TB.h, koyu: !!O.gor.t.koyu, adimlar: O.adimlar.map(function (Ka, i) {
        var v = KV[i], z = Z.adimlar[i];
        return { sayfa: Ka.sayfa, veri: v && z.kalemli ? v : null, olcek: v && v.g ? TB.g / v.g : 1, esle: function (t) { return z.bas + t - (z.kirp || 0); } };
      }) }) : null;
      var cizT = vCizici(O, Z, K, baslik, RS, { kosesiz: !kose, murekkep: mur }), ciz = cizT;
      if (!hizli && ST) {
        var foto = K.foto || null;
        ciz = ST.kompozitor({
          bicim: P, yer: yer, fps: P.fps, tahta: cizT, stil: stil, klasikTahtada: klasikTahtada, gorunum: GR, cerceve: (ST.CERCEVE || {})[self.indirCerceve] || 1,
          yuzVar: !!(sb && sb.var) || (mod !== 'figur' && !!foto),
          yuz: function (t) { if (sb) return sb.kaynak(t, adimNo(t)); if (mod !== 'figur' && foto) return { im: foto, g: foto.width || foto.naturalWidth, y: foto.height || foto.naturalHeight, foto: true }; return null; },
          altyazi: function (t) { var k = adimNo(t), z = Z.adimlar[k]; if (k < 0 || !z.sure || t > z.bas + z.sure + 0.15 || O.adimlar[k].gorsel) return null; return { metin: z.alt || O.adimlar[k].s, p: z.ilerleme ? z.ilerleme(t - z.bas) : Math.max(0, Math.min(1, (t - z.bas) / z.sure)) }; }
        });
      }
      var cikti = ciz;
      if (SA && (GI || GO || SA.filigran || SA.altBant)) { // giriş, kapanış, köşede kanal adı, alt bant
        cikti = SU.sunum({ G: P.G, Y: P.Y, icerik: ciz, icerikSure: Z.toplam,
          giris: GI ? SU.giris({ G: P.G, Y: P.Y, baslik: SA.baslik, alt: SA.alt, kullanici: SA.kanal, motif: SA.motif }) : null,
          kapanis: GO ? SU.kapanis({ G: P.G, Y: P.Y, kullanici: SA.kanal, foto: mod !== 'figur' ? (K.foto || null) : null, motif: SA.motif }) : null,
          ust: SA.filigran || SA.altBant ? SU.ustKatman({ G: P.G, Y: P.Y, filigran: SA.filigran, altBant: SA.altBant }) : null });
      }
      var tuval = cikti.tuval, sure = GI + Z.toplam + GO, kareSay = Math.ceil(sure * P.fps), bitir = function () { if (sb) sb.kapat(); if (yb) yb.birak(Infinity); };
      var zamanlar = { giris: GI, adim: Z.adimlar.map(function (z) { return GI + z.bas0; }) }; // YouTube bölümleri için
      cikti.kare(GI ? Math.min(2.6, GI) : 0); self.indirOnizle(tuval);
      if (kd[0] && kd[1]) {
        var hazirla0 = sb && sb.var ? function (t) { return sb.hazirla(t); } : yb && yb.var ? vYuzHazirla(Z.adimlar, yb) : null;
        var hazirla = hazirla0 && (GI || GO) ? function (t) { var ti = t - GI; return ti < -0.6 ? null : hazirla0(Math.min(Math.max(0, ti), Z.toplam)); } : hazirla0;
        return vVideoKodla(kd[0], kareSay, cikti.kare, tuval, function (o) { durum('Video çiziliyor… %' + Math.round(o * 100), 0.32 + o * 0.6); }, hazirla, P.fps).then(function (v) {
          bitir();
          durum('Ses ekleniyor…', 0.93);
          return vSesKodla(ses, oran, kd[1], function (o) { durum('Ses ekleniyor… %' + Math.round(o * 100), 0.93 + o * 0.05); }).then(function (s) {
            durum('Dosya birleştiriliyor…', 0.99);
            return { blob: mp4Yap([videoIzi(v, P.G, P.Y), sesIzi(s, 2)], 'isom', 'video/mp4'), ad: ad + '.mp4', tur: 'MP4 video', sure: sure, not: [gorNot, s.sorun].filter(Boolean).join(' '), srt: srtYap(O, Z, GI), zamanlar: zamanlar };
          });
        }, function (e) { bitir(); throw e; });
      }
      var mime = vKayitTuru(['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']);
      if (!mime || !canli || !tuval.captureStream) { bitir(); throw kHata('Bu tarayıcı video hazırlayamıyor. Safari ya da Chrome’un güncel sürümünü dene.'); }
      var webm = /webm/.test(mime);
      return vCanliKayit({ ctx: canli, tuval: tuval, ciz: cikti.kare, ses: ses, oran: oran, mime: mime, toplam: sure, fps: P.fps, bit: P.bit, ilerle: function (o, t) { durum('Video kaydediliyor… ' + saatYazi(t) + ' / ' + saatYazi(sure) + ' · ekranı açık tut', 0.32 + o * 0.67); } })
        .then(function (blob) { bitir(); return { blob: blob, ad: ad + (webm ? '.webm' : '.mp4'), tur: webm ? 'WebM video' : 'MP4 video', sure: sure, zamanlar: zamanlar, srt: srtYap(O, Z, GI), not: [webm ? 'Bu tarayıcı MP4 kaydedemediği için video WebM biçiminde hazırlandı.' : '', gorNot].filter(Boolean).join(' ') }; }, function (e) { bitir(); throw e; });
      });
    });
  };
  Oynatici.prototype.kalemVerileri = function (A, sonuc) { // kendi sesiyle kaydedilmiş adımların kalem izleri
    if (!window.SesliKalem) return Promise.resolve(A.map(function () { return null; }));
    return Promise.all(A.map(function (a, i) {
      var x = sonuc[i]; if (!(x && x.ana && x.ana.kendi)) return null;
      return Kayitlar.al('c:' + ozet(a.s)).then(function (v) { return v && ((v.izler && v.izler.length) || (v.olay && v.olay.length)) ? v : null; }).catch(function () { return null; });
    }));
  };
  Oynatici.prototype.indirOnizle = function (tuval) { var k = this.r.indirOnizleme; k.innerHTML = ''; k.appendChild(tuval); k.hidden = false; };
  Oynatici.prototype.indirPaylas = function () {
    var d = this.indirDosya, dosya;
    if (!d || !navigator.share) return;
    try { dosya = new File([d.blob], d.ad, { type: d.blob.type }); } catch (e) { return; }
    var r = this.r, metin = r.paylasimKutu && !r.paylasimKutu.hidden ? r.paylasimMetin.value : '';
    if (metin && navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(metin).then(function () { r.paylasimNot.textContent = '✓ Açıklama panoya kopyalandı: paylaşırken yapıştırabilirsin.'; }, function () {});
    navigator.share({ files: [dosya], title: d.ad }).catch(function () {});
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
    this.durdur(); this.studyoKapat(true);
    if (this.opt.mod === 'pencere') { this.host.style.display = 'none'; document.documentElement.style.overflow = this.eskiTasma || ''; }
  };

  /* ================= kimyamed köprüsü: .soru kartlarına "Sesli anlat" ================= */
  var pencereOynatici = null;
  function ac(ders, opt) {
    opt = opt || {};
    if (ders && ders.bolumBas != null && opt.bolum == null) opt.bolum = ders.bolumBas;
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
    pencereOynatici.yukle(ders, opt);
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
      '.sd-arac{display:flex;flex-wrap:wrap;gap:8px;margin:4px 0 14px}' +
      '.sd-anlat.buyuk{font-size:13.5px;letter-spacing:.02em;padding:9px 16px;box-shadow:0 6px 14px -10px rgba(194,65,0,.6)}' +
      '.sd-anlat.pdf{color:#1E1A17;background:#FFFFFF;border-color:#E7E0D9}.sd-anlat.pdf:hover{background:#FBF8F5}.sd-anlat:disabled{opacity:.75;cursor:progress}' +
      '.sd-anlat.baslikta{margin-left:10px;vertical-align:middle;font:800 11.5px/1.3 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;letter-spacing:.03em;text-transform:none;padding:3px 10px}' +
      '.sd-anlat.yanda{margin-left:8px}' +
      '@media print{.sd-anlat{display:none!important}}';
    document.head.appendChild(st);
  }
  function dugme(sinif, etiket, fn, yazi) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'sd-anlat' + (sinif ? ' ' + sinif : '');
    b.innerHTML = '<span aria-hidden="true">🔊</span> ' + esc(yazi || 'Sesli anlat');
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
  function bolumBul(ders, el) { var B = ders && ders.bolumler || []; for (var k = 0; k < B.length; k++) if (B[k].el === el) return k; return 0; }
  function icerikVarMi(dugumler) {
    return dugumler.some(function (n) {
      if (n.nodeType !== 1 || gorunmez(n) || ATLA_SINIF.test(sinifi(n)) || ATLA_ETIKET.test(n.tagName.toUpperCase())) return false;
      return /^(P|UL|OL|FIGURE|TABLE|BLOCKQUOTE|H3|H4|SVG|IMG|CANVAS)$/.test(n.tagName.toUpperCase()) || (n.tagName.toUpperCase() === 'DIV' && yaziMetni(n).length > 25);
    });
  }
  function aracEkle(kap, once, yazi, fn, pdfYap) {
    var a = document.createElement('div'); a.className = 'sd-arac';
    a.appendChild(dugme('buyuk', yazi, fn, yazi));
    if (pdfYap) a.appendChild(pdfDugmesi(pdfYap));
    if (once) kap.insertBefore(a, once); else kap.appendChild(a);
    return a;
  }
  function pdfDugmesi(yap) { // konu anlatımı → Ders PDF'si (sesli anlatımı açmadan)
    var b = document.createElement('button'), yazi = '<span aria-hidden="true">📄</span> Ders PDF\'si';
    b.type = 'button'; b.className = 'sd-anlat buyuk pdf'; b.innerHTML = yazi; b.setAttribute('aria-label', 'Konu anlatımını PDF ders notu olarak indir');
    b.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      if (b.disabled) return;
      b.disabled = true; b.innerHTML = '<span aria-hidden="true">⏳</span> PDF hazırlanıyor…';
      setTimeout(function () {
        var d = null; try { d = yap(); } catch (x) { d = null; }
        (d ? dersPdf(d) : Promise.reject(new Error('ders yok'))).then(function () { b.innerHTML = '<span aria-hidden="true">✓</span> İndirildi'; }, function () { b.innerHTML = '<span aria-hidden="true">⚠️</span> PDF hazırlanamadı, yeniden dene'; })
          .then(function () { setTimeout(function () { b.disabled = false; b.innerHTML = yazi; }, 4000); });
      }, 30);
    });
    return b;
  }
  function hazirlaVeAc(yap, opt) { // büyük sayfalarda dersi kurmak birkaç yüz milisaniye sürebilir
    setTimeout(function () { var d = yap(); if (d) ac(d, opt); }, 0);
  }
  // Ronya soru bankası (banka.html): konu anlatımı, çözümlü örnekler, konu soruları
  function bankaOrnekDers(o) {
    var et = o.querySelector('.etiket');
    return parcalardanDers({ id: 'rbo-' + ozet(yaziMetni(o).slice(0, 400)), baslik: et ? yaziMetni(et) : 'Örnek', soru: satirlaraBol(o.querySelector('.metin') || o), cozum: satirlaraBol(o.querySelector('.cozum') || document.createElement('div')) });
  }
  function ksDers(k) {
    var g = k.querySelector('.ks-goster'), cz = k.querySelector('.ks-cozum');
    if (g && cz && !yaziMetni(cz)) g.click(); // çözümü sayfada da aç ("Çözümü göster" ile aynı)
    var no = k.querySelector('.ks-no'), siklar = [];
    Array.prototype.forEach.call(k.querySelectorAll('.sik'), function (b) { var h = b.querySelector('.h'), t = b.querySelector('.t'); siklar.push('<b>' + esc(h ? yaziMetni(h) : '') + ')</b> ' + (t ? t.innerHTML : b.innerHTML)); });
    var gb = cz && cz.querySelector('.geri-bildirim'), cozum = [];
    if (gb) { var bb = gb.querySelector('b'); if (bb) cozum.push('<b>' + esc(yaziMetni(bb).replace(/^Yanlış\.\s*/, '')) + '</b>'); var gc = gb.querySelector('.gc'); if (gc) cozum = cozum.concat(satirlaraBol(gc)); }
    return parcalardanDers({ id: 'rbs-' + ozet(yaziMetni(k).slice(0, 400)), baslik: no ? yaziMetni(no) : 'Soru', soru: satirlaraBol(k.querySelector('.soru-metin') || k), siklar: siklar, cozum: cozum });
  }
  function bankaKopru() {
    Array.prototype.forEach.call(document.querySelectorAll('article.anlatim'), function (ar) {
      if (ar.querySelector(':scope > .sd-arac')) return;
      var bEl = document.querySelector('.rb-h1'), ad = bEl ? yaziMetni(bEl) : document.title;
      var yap = function () { return icerikDers({ id: 'rb-' + ozet(ad + (location.hash || '').split('/').slice(0, 3).join('/')), baslik: ad, bolumler: bolumlereAyir(ar, ad) }); };
      aracEkle(ar, ar.firstChild, 'Konuyu sesli anlat', function () { hazirlaVeAc(yap); }, yap);
      Array.prototype.forEach.call(ar.querySelectorAll(':scope > h3'), function (h) {
        h.appendChild(dugme('baslikta', 'Bu bölümü sesli anlat', function () { hazirlaVeAc(function () { var d = yap(); if (d) d.bolumBas = bolumBul(d, h); return d; }); }));
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('.ornek'), function (o) {
      if (o.querySelector('.sd-anlat') || !o.querySelector('.cozum')) return;
      var b = dugme('yanda', 'Bu örneği sesli anlat', function () { ac(bankaOrnekDers(o)); });
      var cb = o.querySelector('.cozum-btn'); if (cb) cb.insertAdjacentElement('afterend', b); else o.appendChild(b);
    });
    Array.prototype.forEach.call(document.querySelectorAll('.ks-kart'), function (k) {
      if (k.querySelector('.sd-anlat')) return;
      var g = k.querySelector('.ks-goster'); if (!g) return;
      g.insertAdjacentElement('afterend', dugme('yanda', 'Bu soruyu sesli çöz', function () { ac(ksDers(k)); }, 'Sesli çözüm'));
    });
  }
  // Ronya ana sayfa ekranlarındaki konu anlatımları (hız, denge, asit-baz, çözünürlük, fonksiyonel gruplar)
  var RONYA_KONU = '#maarif-content, #mdg-wrap, #mab-wrap, #cozunurluk-body, #fg-theory';
  function ronyaKonuKopru() {
    Array.prototype.forEach.call(document.querySelectorAll(RONYA_KONU), function (kap) {
      if (!kap.firstElementChild || kap.querySelector(':scope > .sd-arac')) return;
      var adBul = function () {
        var ekran = kap.closest('[id^="s-"]'), t = ekran && ekran.querySelector('.ptitle'), ad = t ? yaziMetni(t).replace(/^[^A-Za-zÇĞİÖŞÜçğıöşü0-9]+/, '') : 'Konu anlatımı';
        var alt = kap.parentNode && kap.parentNode.querySelector('.ob.sel2'); if (alt && !/soru/i.test(yaziMetni(alt))) ad += ' · ' + yaziMetni(alt);
        return ad;
      };
      var bolumler = bolumlereAyir(kap, adBul(), { kart: true }).filter(function (b) { return icerikVarMi(b.dugumler); });
      if (!bolumler.length) return;
      var yap = function () { var ad = adBul(); return icerikDers({ id: 'rk-' + ozet(kap.id + ad), baslik: ad, bolumler: bolumlereAyir(kap, ad, { kart: true }), enAz: 1 }); };
      aracEkle(kap, kap.firstChild, 'Konuyu sesli anlat', function () { hazirlaVeAc(yap); }, yap);
      bolumler.forEach(function (b) {
        if (!b.el) return;
        var hedef = /(^|\s)card(\s|$)/.test(sinifi(b.el)) ? b.el.querySelector('.slbl') : b.el;
        if (hedef && !hedef.querySelector('.sd-anlat')) hedef.appendChild(dugme('baslikta', 'Bu bölümü sesli anlat', function () { hazirlaVeAc(function () { var d = yap(); if (d) d.bolumBas = bolumBul(d, b.el); return d; }); }));
      });
    });
  }
  // kimyamed modül sayfaları: her "Bölüm" başlığına ve sayfa başına konu anlatımı düğmesi
  function kimyamedKonuKopru() {
    var main = document.querySelector('main.wrap') || document.querySelector('main');
    if (!main || !main.querySelector(':scope > h2') || main.querySelector('.sd-arac')) return;
    var h1 = document.querySelector('h1'), baslik = h1 ? yaziMetni(h1) : document.title;
    var adFn = function (h) { var k = dugmesizKopya(h), no = k.querySelector('.no'), n = no ? yaziMetni(no) : ''; if (no) no.remove(); return (n ? n + ': ' : '') + yaziMetni(k); };
    var bolumler = bolumlereAyir(main, baslik, { etiket: 'H2', ad: adFn }).filter(function (b) { return b.el && icerikVarMi(b.dugumler); });
    if (!bolumler.length) return;
    dugmeStili();
    var yap = function () { return icerikDers({ id: 'kmk-' + ozet(location.pathname), baslik: baslik, bolumler: bolumlereAyir(main, baslik, { etiket: 'H2', ad: adFn }).filter(function (b) { return b.el; }), enAz: 2 }); };
    var hero = main.querySelector('.hero');
    aracEkle(hero || main, hero ? null : main.firstChild, 'Konuyu baştan sona sesli anlat', function () { hazirlaVeAc(yap); }, yap);
    bolumler.forEach(function (b) {
      if (!b.el.querySelector('.sd-anlat')) b.el.appendChild(dugme('baslikta', 'Bu bölümü sesli anlat', function () { hazirlaVeAc(function () { var d = yap(); if (d) d.bolumBas = bolumBul(d, b.el); return d; }); }));
    });
  }
  function kopruler() {
    try { kimyamedKopru(); } catch (e) {}
    try { ronyaKopru(); } catch (e) {}
    var izle = function () {
      if (document.querySelector('article.anlatim, .ornek, .ks-kart, ' + RONYA_KONU)) dugmeStili();
      try { bankaKopru(); } catch (e) {}
      try { ronyaKonuKopru(); } catch (e) {}
    };
    izle();
    var bekliyor = false;
    if (window.MutationObserver && document.body) new MutationObserver(function () { if (!bekliyor) { bekliyor = true; setTimeout(function () { bekliyor = false; izle(); }, 120); } }).observe(document.body, { childList: true, subtree: true });
    setTimeout(function () { try { kimyamedKonuKopru(); } catch (e) {} }, 250);
  }

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
    icerikDers: icerikDers,
    bolumlereAyir: bolumlereAyir,
    konuVerisindenDers: konuVerisindenDers,
    paragrafParcalari: paragrafParcalari,
    ronyaDers: ronyaDers,
    satirlaraBol: satirlaraBol,
    parcalardanDers: parcalardanDers,
    metindenDers: metindenDers,
    pdf: function (ders, opt) { return dersPdf(ders, opt); },
    dersNotu: dersNotu,
    konusmaMetni: konusmaMetni,
    formulCoz: formulCoz,
    otomatikHTML: otomatikHTML,
    _ic: { Ses: Ses, Kayitlar: Kayitlar, Yayin: Yayin, ayar: ayar, ozet: ozet, Oynatici: Oynatici, ORNEK_OKUMA: ORNEK_OKUMA }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', kopruler); else kopruler();
})();
