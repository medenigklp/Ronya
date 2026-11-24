/* Sanal Laboratuvar · Deney masası deneyleri (lab-deneyler.js)
   Her deney LabDeney.ekle({...}) ile tanımlanır. Sayısal değerler gerçek verilere dayanır;
   açıklamalar Maarif programının kapsamında tutulmuştur.
   Kod ES5 ile yazıldı (eski tarayıcılarda da çalışsın diye). */
(function () {
  'use strict';
  var LD = window.LabDeney;
  if (!LD) return;
  var tr = LD.tr, sure = LD.sure;
  function sinir(x, a, b) { return x < a ? a : (x > b ? b : x); }
  function yaklas(x, hedef, dt, tau) { return x + (hedef - x) * (1 - Math.exp(-dt / tau)); }
  function gurultu(g) { return (Math.random() + Math.random() - 1) * g; }

  /* =====================================================================
     1. KAYNAMA NOKTASI VE TANECİK SAYISI (KİM.10.2.8)
     ===================================================================== */
  (function () {
    var KB = 0.512, LV = 2257;
    var COZ = {
      yok: { ad: 'Saf su', i: 0 },
      glikoz: { ad: 'Glikoz', i: 1, dH: 11.0, g: '45,0', M: 180 },
      nacl: { ad: 'NaCl', i: 2, dH: 3.9, g: '14,6', M: 58.5 },
      cacl2: { ad: 'CaCl₂', i: 3, dH: -82.8, g: '27,8', M: 111 }
    };
    var N = 0.25;
    function kap(v) { return v.m * 4.18 + 60; }
    function tKaynama(v) { var c = COZ[v.coz]; if (!v.eklendi || !c.i) return 100; return 100 + KB * N * v.cozunmus * c.i / (v.m / 1000); }
    function bas() { return { T: 20, Tth: 20, m: 100, coz: 'yok', sec: 'yok', eklendi: false, cozunmus: 0, alev: false, kar: 0, kaynama: false, kSure: 0, nt: {} }; }
    function hazir(S) { return S.yer.bek && S.yer.sacayagi && S.yer.beher; }
    var EY = {
      yak: function (S) {
        if (!hazir(S)) { S.ipucu('Önce bek, sacayağı ve beheri yerleştir.', true); return; }
        if (!S.yer.termometre) S.ipucu('Termometre suya daldırılmadı: ölçüm kaydedilemez.', true);
        S.v.alev = true; S.kronoBaslat();
        if (!S.v.nt.yak) { S.v.nt.yak = 1; S.notEkle('Bek yakıldı; ' + (S.v.eklendi ? COZ[S.v.coz].ad + ' çözeltisi' : 'saf su') + ' ısınmaya başladı. Sıcaklık her 20 saniyede kaydediliyor.'); }
      },
      sondur: function (S) { if (!S.v.alev) return; S.v.alev = false; S.kronoDur(); S.notEkle('Bek söndürüldü. Su yavaşça soğuyor.'); },
      ekle: function (S) {
        var v = S.v; if (v.sec === 'yok' || v.eklendi) return;
        if (!S.yer.beher) { S.ipucu('Önce beheri yerleştir.', true); return; }
        v.coz = v.sec; v.eklendi = true; v.cozunmus = 0; v.kar = 0;
        var c = COZ[v.coz];
        S.notEkle(c.g + ' g (0,25 mol) ' + c.ad + ' suya eklendi. Tamamen çözünene kadar karıştır.');
      },
      karistir: function (S) { S.v.kar = 2.4; }
    };
    LD.ekle({
      id: 'kaynama', sinif: 10, konu: 'Çözeltiler', sure: '15 dk',
      ad: 'Kaynama noktası ve tanecik sayısı',
      kisa: 'Suyu ısıt, sıcaklığı ölç. Kaynarken sıcaklık neden sabit kalır? Eşit mol glikoz, NaCl ve CaCl₂ kaynama noktasını aynı ölçüde mi yükseltir?',
      cikti: { kod: 'KİM.10.2.8', metin: 'Çözünen tanecik sayısının kaynama ve donma noktasına etkisine ilişkin hipotez oluşturabilme' },
      ikon: '<path d="M10 13.5V5a2 2 0 1 1 4 0v8.5a4 4 0 1 1-4 0z"/><path d="M12 9v6.5"/><circle cx="18.5" cy="6" r="1.2"/><circle cx="20" cy="10" r=".9"/>',
      amac: 'Saf suyun ısınma eğrisini çizmek; eşit mol sayısında glikoz, NaCl ve CaCl₂ çözerek çözünenin suya verdiği tanecik sayısının kaynama noktasına etkisini ölçmek.',
      degiskenler: { bagimsiz: 'Çözünenin türü (suya verdiği tanecik sayısı)', bagimli: 'Kaynamaya başlama sıcaklığı', kontrol: 'Su miktarı (100 g), çözünen miktarı (0,25 mol), ısıtma düzeneği, dış basınç (1 atm)' },
      beceriler: ['Hipotez kurma', 'Ölçme ve kaydetme', 'Grafik çizme', 'Karşılaştırma'],
      malzemeler: [
        { ad: 'Bunsen beki', is: 'Isı kaynağı', parca: 'bek' },
        { ad: 'Sacayağı ve tel kafes', is: 'Beheri alevin üstünde tutar', parca: 'sacayagi' },
        { ad: '150 mL beher', is: 'İçinde 100 mL (100 g) su', parca: 'beher' },
        { ad: 'Dijital termometre', is: '0,1 °C duyarlıkla ölçer', parca: 'termometre' },
        { ad: 'Glikoz, NaCl, CaCl₂', is: 'Her birinden 0,25 mol: 45,0 g · 14,6 g · 27,8 g' },
        { ad: 'Cam baget ve spatül', is: 'Karıştırmak ve katı almak için' }
      ],
      guvenlik: ['Koruyucu gözlük tak; kaynayan sudan çıkan buhar yakar.', 'Sıcak beheri çıplak elle tutma, maşa ya da ısıya dayanıklı eldiven kullan.', 'Beki yakarken önce kibriti yak, sonra gaz musluğunu aç; işin bitince musluğu kapat.', 'CaCl₂ suda çözünürken ısı açığa çıkar; azar azar ekle ve karıştır.'],
      tahminler: [
        {
          id: 'sabit', soru: 'Su kaynamaya başladıktan sonra ısıtmaya devam edilirse termometredeki değer nasıl değişir?',
          secenekler: ['Artmaya devam eder', 'Kaynama sürdükçe sabit kalır', 'Azalmaya başlar'], dogru: 1,
          gozlem: function (S) { var k = null; S.kosular.forEach(function (x) { if (x.coz === 'yok' && x.kb) k = x; }); return k ? 'Saf su ' + tr(k.kb, 1) + ' °C\'ta kaynadı; kaynama boyunca sıcaklık değişmedi.' : ''; }
        },
        {
          id: 'tanecik', soru: 'Eşit kütlede suda eşit mol sayısında glikoz, NaCl ve CaCl₂ ayrı ayrı çözülürse hangi çözeltinin kaynamaya başlama sıcaklığı en yüksek olur?',
          secenekler: ['Glikoz çözeltisi', 'NaCl çözeltisi', 'CaCl₂ çözeltisi', 'Üçü de aynı sıcaklıkta kaynar'], dogru: 2,
          gozlem: function (S) {
            var L = [];
            S.kosular.forEach(function (x) { if (x.kb && x.coz !== 'yok') L.push(COZ[x.coz].ad + ' ' + tr(x.kb, 1) + ' °C'); });
            return L.length ? 'Ölçtüğün kaynama sıcaklıkları: ' + L.join(', ') + '.' : '';
          }
        }
      ],
      parcalar: [
        { id: 'bek', ad: 'Bunsen beki', x: 430, y: 470, bb: [-170, -180, 215, 180], ciz: function (g, P) { return P.bek(g, { hortumX: -150 }); } },
        { id: 'sacayagi', ad: 'Sacayağı ve tel kafes', x: 430, y: 470, bb: [-90, -160, 180, 160], ciz: function (g, P) { return P.sacayagi(g, { h: 150, w: 150 }); } },
        {
          id: 'beher', ad: 'Beher (100 mL su)', x: 430, y: 317, gerek: ['sacayagi'], bb: [-68, -156, 136, 158],
          ciz: function (g, P, kucuk) {
            var k = P.kap(g, { profil: P.profilBeher(118, 150), kapasite: 150, kapasiteY: 135, hacim: 100, gaga: true, renk: '#A9D9F2', cizgiler: [{ ml: 50, etiket: '50', uzun: true }, { ml: 100, etiket: '100', uzun: true }, { ml: 150, etiket: '150 mL', uzun: true }] });
            if (!kucuk) { k.kab = P.kabarcik(k); k.yig = P.yigin(k, { n: 46, yay: 0.75 }); k.yig.ayar(0); k.bag = P.baget(k); }
            return k;
          }
        },
        { id: 'termometre', ad: 'Dijital termometre', x: 640, y: 470, gerek: ['beher'], bb: [-200, -395, 335, 397], ciz: function (g, P) { return P.termometre(g, { probX: -185, probY: -172, kolY: -340 }); } }
      ],
      kur: function (S, P) { S.buhar = P.buhar(S.ust, 430, 162, 90); },
      baslangic: bas,
      hiz: 10, otoHiz: 30,
      fizik: function (S, dt) {
        var v = S.v, c = COZ[v.coz], k = S.kosu();
        if (v.eklendi && v.cozunmus < 1) {
          var dx = Math.min(1 - v.cozunmus, (v.kar > 0 ? 0.2 : 0.012) * dt);
          v.cozunmus += dx;
          v.T += -c.dH * 1000 * N * dx / kap(v);
          if (v.cozunmus > 0.9999) {
            v.cozunmus = 1;
            var nt = N * c.i;
            S.notEkle(c.ad + ' tamamen çözündü: çözeltide ' + tr(nt, 2) + ' mol tanecik var.', c.i === 1 ? 'Glikoz suda molekül olarak dağılır: 1 mol glikoz → 1 mol tanecik.' : (c.i === 2 ? 'NaCl → Na⁺ + Cl⁻: 1 mol NaCl suya 2 mol iyon verir.' : 'CaCl₂ → Ca²⁺ + 2Cl⁻: 1 mol CaCl₂ suya 3 mol iyon verir.'));
            if (c.dH < 0) S.notEkle('Çözünme sırasında su ısındı (yaklaşık ' + tr(v.T, 0) + ' °C).', 'CaCl₂\'nin suda çözünmesi ısı veren (ekzotermik) bir olaydır. Bu ısınma kaynama noktasını değiştirmez; yalnızca kaynamaya daha kısa sürede ulaşılır.', 'uyari');
            else if (c.dH > 3) S.notEkle('Çözünme sırasında su biraz soğudu (' + tr(v.T, 1) + ' °C).', 'Glikozun suda çözünmesi ısı alan (endotermik) bir olaydır.');
          }
        }
        var Pin = v.alev && hazir(S) ? 210 : 0, kayip = 0.55 * (v.T - 20), tb = tKaynama(v);
        if (Pin > 0 && v.T >= tb - 1e-6 && Pin - kayip > 0) {
          if (!v.kaynama) {
            v.kaynama = true; k.kb = tb;
            S.notEkle('Kaynama başladı: büyük kabarcıklar sıvının her yerinde oluşuyor. Sıcaklık ' + tr(tb, 1) + ' °C.', 'Sıvının buhar basıncı dış basınca (1 atm) eşit olduğunda kabarcıklar sıvının içinde de oluşur; buna kaynama denir.', 'on');
          }
          v.T = tb; v.m = Math.max(40, v.m - (Pin - kayip) / LV * dt); v.kSure += dt;
          if (v.kSure >= 60 && !v.nt.k60) {
            v.nt.k60 = 1;
            if (!v.eklendi) S.notEkle('Bir dakikadır ısıtılmasına rağmen saf suyun sıcaklığı değişmiyor.', 'Kaynama sırasında verilen ısı tanecikler arası etkileşimleri yenip sıvıyı buhara dönüştürmekte kullanılır; ortalama kinetik enerji (sıcaklık) artmaz.');
            else S.notEkle('Kaynayan çözeltinin sıcaklığı çok yavaş yükseliyor (' + tr(tb, 1) + ' °C).', 'Su buharlaştıkça çözelti derişir; tanecik derişimi arttıkça kaynama sıcaklığı da yükselir. Saf suda bu olmaz.');
          }
        } else {
          v.T += (Pin - kayip) / kap(v) * dt;
          if (v.T > tb) v.T = tb;
          if (v.kaynama && v.T < tb - 0.25) { v.kaynama = false; }
        }
        if (v.T > 62 && v.alev && !v.nt.hava && !v.kaynama) { v.nt.hava = 1; S.notEkle('Kabın dibinde ve kenarlarında küçük kabarcıklar belirdi (' + tr(v.T, 0) + ' °C).', 'Bunlar kaynama değil: sıcaklık arttıkça gazların sudaki çözünürlüğü azalır, suda çözünmüş hava küçük kabarcıklar hâlinde ayrılır.'); }
        if (S.yer.termometre) v.Tth = yaklas(v.Tth, v.T, dt, 4);
        k.coz = v.eklendi ? v.coz : 'yok'; k.kSure = v.kSure; k.alevAcik = v.alev;
      },
      goster: function (S, dtR) {
        var v = S.v, r = S.r, tb = tKaynama(v);
        if (v.kar > 0) v.kar = Math.max(0, v.kar - dtR);
        if (r.bek && r.bek.alev) { r.bek.alev.guncelle(dtR, v.alev && S.yer.bek, 1); r.bek.musluk(v.alev); }
        if (r.sacayagi && r.sacayagi.kor) r.sacayagi.kor.setAttribute('opacity', v.alev && S.yer.bek ? 0.85 : 0);
        var b = r.beher;
        if (b && b.kab) {
          b.ayar(v.m * (1 + 0.0004 * (v.T - 20)), v.eklendi && v.coz === 'cacl2' ? '#B9DDF0' : '#A9D9F2');
          var oran = 0;
          if (v.kaynama) oran = 1.9; else if (v.T > 60) oran = sinir((v.T - 60) / (tb - 60), 0, 1) * (v.T > tb - 4 ? 0.9 : 0.18);
          b.kab.guncelle(dtR * Math.min(3, 1 + S.hiz / 20), S.yer.beher ? oran : 0, v.kaynama ? 3.2 : 1.8);
          b.yig.ayar(v.eklendi ? 1 - v.cozunmus : 0);
          b.bag.guncelle(dtR, v.kar > 0);
        }
        if (S.buhar) S.buhar.guncelle(dtR, S.yer.beher ? (v.kaynama ? 1 : sinir((v.T - 78) / 22, 0, 1) * 0.35) : 0);
        if (r.termometre) r.termometre.yaz(S.yer.termometre ? tr(v.Tth, 1) : '--,-');
      },
      okumalar: function (S) {
        var v = S.v, c = COZ[v.eklendi ? v.coz : 'yok'];
        return [
          { ad: 'Sıcaklık', d: S.yer.termometre ? tr(v.Tth, 1) : '–', b: '°C', vurgu: v.kaynama },
          { ad: 'Süre', d: sure(S.krono) },
          { ad: 'Durum', d: v.kaynama ? 'Kaynıyor' : (v.alev ? 'Isınıyor' : (v.T > 24 ? 'Soğuyor' : 'Bekliyor')) },
          { ad: 'Çözelti', d: v.eklendi ? c.ad + (v.cozunmus < 1 ? ' (çözünüyor)' : '') : 'Saf su' }
        ];
      },
      kontroller: function (S) {
        var v = S.v, L = [], kilit = v.eklendi || v.alev || S.kosu().satirlar.length > 0;
        L.push({
          tur: 'secim', id: 'cozunen', etiket: kilit && !v.eklendi && S.kosu().satirlar.length ? 'Çözünen · değiştirmek için Yeni deneme' : 'Çözünen (0,25 mol)', deger: v.eklendi ? v.coz : v.sec, pasif: kilit,
          secenekler: [{ v: 'yok', etiket: 'Saf su' }, { v: 'glikoz', etiket: 'Glikoz' }, { v: 'nacl', etiket: 'NaCl' }, { v: 'cacl2', etiket: 'CaCl₂' }],
          degis: function (S2, x) { if (!S2.v.eklendi) S2.v.sec = x; }
        });
        if (v.sec !== 'yok' && !v.eklendi) L.push({ tur: 'dugme', id: 'ekle', etiket: COZ[v.sec].g + ' g ' + COZ[v.sec].ad + ' ekle', pasif: !S.yer.beher || v.alev || S.kosu().satirlar.length > 0, yap: EY.ekle });
        if (v.eklendi && v.cozunmus < 1) L.push({ tur: 'dugme', id: 'karistir', etiket: 'Karıştır', yap: EY.karistir, ana: true });
        L.push({ tur: 'dugme', id: 'alev', etiket: v.alev ? 'Beki söndür' : 'Beki yak', ana: !v.alev && !(v.eklendi && v.cozunmus < 1), pasif: !hazir(S), yap: function (S2) { if (S2.v.alev) EY.sondur(S2); else EY.yak(S2); } });
        return L;
      },
      eylem: EY,
      yeniKosu: function (S) { var sec = S.v.sec; S.kosu().alevAcik = false; S.v = bas(); S.v.sec = sec; },
      kosuAd: function (S) { return S.v.eklendi ? COZ[S.v.coz].ad + ' çözeltisi' : 'Saf su'; },
      olcum: {
        oto: 20,
        sutunlar: [
          { id: 't', ad: 'Süre', birim: 'dk:sn', bicim: function (x) { return sure(x); } },
          { id: 'T', ad: 'Sıcaklık', birim: '°C', ondalik: 1 },
          { id: 'durum', ad: 'Durum' }
        ],
        satir: function (S) { if (!S.yer.termometre) return null; return { t: S.krono, T: Math.round(S.v.Tth * 10) / 10, durum: S.v.kaynama ? 'kaynıyor' : (S.v.alev ? 'ısınıyor' : 'soğuyor') }; },
        uyari: function () { return 'Önce termometrenin ucunu suya daldır.'; },
        bos: 'Beki yakınca sıcaklık her 20 saniyede bir buraya yazılır.',
        ozet: function (S, k) { return k.kb ? 'Kaynamaya başlama sıcaklığı: <b>' + tr(k.kb, 1) + ' °C</b>' + (k.coz && k.coz !== 'yok' ? ' · tanecik: ' + tr(N * COZ[k.coz].i, 2) + ' mol (100 g suda)' : '') : ''; },
        grafikler: [{
          ad: 'Sıcaklık–zaman', x: 't', y: 'T', xd: function (x) { return x / 60; }, xEt: 'Zaman (dk)', yEt: 'Sıcaklık (°C)', sifirX: true, yPay: 0.2, nokta: false, bos: { x: [0, 6], y: [0, 110] },
          ekle: function (S, o, seriler) {
            seriler.forEach(function (s) {
              var k = s.kosu; if (!k.kb) return;
              o.dogrular.push({ x1: 0, y1: k.kb, x2: 1000, y2: k.kb, renk: s.renk, kesik: true, kalin: 1.2, opak: 0.75 });
            });
          },
          not: function (S, seriler) { return seriler.length ? 'Kesikli çizgiler kaynamaya başlama sıcaklıklarını gösterir. Farkları görmek için “Kaynama bölgesi” grafiğine geç.' : ''; }
        }, {
          ad: 'Kaynama bölgesi', x: 't', y: 'T', xd: function (x) { return x / 60; }, xEt: 'Zaman (dk)', yEt: 'Sıcaklık (°C)', yMin: 99, yMax: 105, sifirX: true, nokta: false, bos: { x: [0, 6], y: [99, 105] },
          ekle: function (S, o, seriler) {
            seriler.forEach(function (s) {
              var k = s.kosu; if (!k.kb) return;
              var son = s.n[s.n.length - 1], ust = null;
              s.n.forEach(function (p) { if (p[1] >= k.kb - 0.05 && !ust) ust = p; });
              o.isaretler.push({ x: (ust || son)[0], y: k.kb, metin: (k.coz === 'yok' ? 'Saf su ' : COZ[k.coz].ad + ' ') + tr(k.kb, 1) + ' °C', renk: s.renk, dx: 4, dy: -8 });
            });
          },
          not: function (S, seriler) { return seriler.length ? 'Yalnızca 99–105 °C aralığı büyütülerek gösteriliyor. Saf suyun eğrisi kaynarken yataydır; çözeltilerin eğrisi su buharlaştıkça çok hafif yükselir.' : ''; }
        }, {
          ad: 'Kaynama noktası–tanecik', xEt: 'Çözünen tanecik (mol, 100 g suda)', yEt: 'Kaynamaya başlama sıcaklığı (°C)', xMin: 0, xMax: 0.8, yMin: 99.5, yMax: 104.5, xBol: 4,
          seriYap: function (S) {
            var n = [], k0 = {};
            S.kosular.forEach(function (k) { if (k.kb && !k0[k.coz]) { k0[k.coz] = 1; n.push([k.coz === 'yok' ? 0 : N * COZ[k.coz].i, k.kb, k.coz]); } });
            n.sort(function (a, b) { return a[0] - b[0]; });
            return n.length ? [{ ad: 'Ölçülen kaynama sıcaklığı', renk: '#F85300', n: n, cizgi: false, nokta: true, r: 6 }] : [];
          },
          ekle: function (S, o, seriler) {
            if (!seriler.length) return;
            var n = seriler[0].n;
            n.forEach(function (p) { o.isaretler.push({ x: p[0], y: p[1], metin: p[2] === 'yok' ? 'saf su' : COZ[p[2]].ad, dx: 10, dy: 5 }); });
            if (n.length >= 2) {
              var e = LD.egim(n.map(function (p) { return [p[0], p[1]]; }));
              if (e) { o.dogrular.push({ x1: 0, y1: e.b, x2: 0.8, y2: e.b + 0.8 * e.m, renk: '#0B5C8A', kesik: true, kalin: 1.6 }); o.lejant = [{ ad: 'Eğilim doğrusu', renk: '#0B5C8A', kesik: true }]; }
            }
          },
          not: function (S, seriler) {
            if (!seriler.length || seriler[0].n.length < 2) return 'Her çözeltinin kaynamaya başlama sıcaklığı burada bir nokta olur. En az iki çözelti dene.';
            var e = LD.egim(seriler[0].n.map(function (p) { return [p[0], p[1]]; }));
            return e ? 'Noktalar bir doğru üzerinde: her 0,25 mol tanecik kaynama noktasını yaklaşık <b>' + tr(e.m * 0.25, 1) + ' °C</b> yükseltiyor. Önemli olan maddenin cinsi değil, verdiği tanecik sayısı.' : '';
          }
        }]
      },
      adimlar: [
        { metin: 'Sacayağını masaya yerleştir (tel kafes üstünde).', parca: 'sacayagi', tamam: function (S) { return S.yer.sacayagi; } },
        { metin: 'Bunsen bekini sacayağının altına koy.', parca: 'bek', tamam: function (S) { return S.yer.bek; } },
        { metin: 'İçinde 100 mL su bulunan beheri tel kafesin üstüne koy.', parca: 'beher', tamam: function (S) { return S.yer.beher; } },
        { metin: 'Termometrenin ucunu suya daldır.', parca: 'termometre', tamam: function (S) { return S.yer.termometre; } },
        { metin: 'İlk deneme saf suyla: beki yak. Kronometre kendiliğinden başlar.', tamam: function (S) { return S.kosuVar(function (k) { return k.coz === 'yok' && k.satirlar.length > 0; }); }, oto: [['sec', 'cozunen', 'yok'], ['eylem', 'yak']] },
        { metin: 'Su kaynayana kadar ısıt; kaynadıktan sonra 2 dakika daha ölçmeye devam et.', tamam: function (S) { return S.kosuVar(function (k) { return k.coz === 'yok' && k.kSure >= 120; }); }, oto: [['bekle', function (S) { return S.v.kSure >= 122; }]] },
        { metin: 'Beki söndür. Saf suyun kaynama sıcaklığını tablodan oku.', tamam: function (S) { return S.kosuVar(function (k) { return k.coz === 'yok' && k.kSure >= 120 && !k.alevAcik; }); }, oto: [['eylem', 'sondur']] },
        { metin: 'Yeni deneme başlat (beher taze suyla dolar). NaCl seç, ekle ve tamamen çözünene kadar karıştır.', tamam: function (S) { return (S.v.eklendi && S.v.coz === 'nacl' && S.v.cozunmus >= 1) || S.kosuVar(function (k) { return k.coz === 'nacl' && k.satirlar.length > 0; }); }, oto: [['yeni'], ['sec', 'cozunen', 'nacl'], ['eylem', 'ekle'], ['eylem', 'karistir'], ['bekle', function (S) { return S.v.cozunmus >= 1; }]] },
        { metin: 'Beki yak; çözelti kaynadıktan 2 dakika sonra söndür.', tamam: function (S) { return S.kosuVar(function (k) { return k.coz === 'nacl' && k.kSure >= 120 && !k.alevAcik; }); }, oto: [['eylem', 'yak'], ['bekle', function (S) { return S.v.kSure >= 122; }], ['eylem', 'sondur']] },
        {
          metin: 'Aynı işlemleri glikoz ve CaCl₂ ile tekrarla; kaynama sıcaklıklarını karşılaştır.',
          tamam: function (S) { function b(c) { return S.kosuVar(function (k) { return k.coz === c && k.kSure >= 120 && !k.alevAcik; }); } return b('glikoz') && b('cacl2'); },
          oto: [['yeni'], ['sec', 'cozunen', 'glikoz'], ['eylem', 'ekle'], ['eylem', 'karistir'], ['bekle', function (S) { return S.v.cozunmus >= 1; }], ['eylem', 'yak'], ['bekle', function (S) { return S.v.kSure >= 122; }], ['eylem', 'sondur'],
            ['yeni'], ['sec', 'cozunen', 'cacl2'], ['eylem', 'ekle'], ['eylem', 'karistir'], ['bekle', function (S) { return S.v.cozunmus >= 1; }], ['eylem', 'yak'], ['bekle', function (S) { return S.v.kSure >= 122; }], ['eylem', 'sondur']]
        }
      ],
      ozet: function (S) {
        var saf = null, L = [];
        S.kosular.forEach(function (k) { if (!k.kb) return; if (k.coz === 'yok') saf = saf || k; else L.push(k); });
        if (!saf && !L.length) return '';
        var s = '<div class="dm-tsar" style="margin:0 0 10px"><table><thead><tr><th>Deneme</th><th>Tanecik <small>(mol, 100 g suda)</small></th><th>Kaynama başlangıcı <small>(°C)</small></th><th>Yükselme <small>(°C)</small></th></tr></thead><tbody>';
        if (saf) s += '<tr><td>Saf su</td><td>0</td><td>' + tr(saf.kb, 1) + '</td><td>–</td></tr>';
        L.sort(function (a, b) { return COZ[a.coz].i - COZ[b.coz].i; });
        var a = [];
        L.forEach(function (k) { var c = COZ[k.coz], dT = k.kb - 100; a.push(dT / (N * c.i / 0.1)); s += '<tr><td>' + c.ad + '</td><td>' + tr(N * c.i, 2) + '</td><td>' + tr(k.kb, 1) + '</td><td>' + tr(dT, 1) + '</td></tr>'; });
        s += '</tbody></table></div>';
        if (L.length) {
          var ort = a.reduce(function (x, y) { return x + y; }, 0) / a.length;
          s += '<p>Tanecik sayısı iki katına çıkınca kaynama noktasındaki yükselme de yaklaşık iki katına çıktı. Verilerine göre 1 kg suda çözünen <b>1 mol tanecik</b> kaynama noktasını yaklaşık <b>' + tr(ort, 2) + ' °C</b> yükseltir; bu, çözünenin cinsine değil tanecik sayısına bağlıdır.</p>';
        }
        if (saf) s += '<p>Saf su kaynarken sıcaklık ' + tr(saf.kb, 1) + ' °C\'ta sabit kaldı.</p>';
        return s;
      },
      neden: '<p>Bir sıvı, buhar basıncı dış basınca eşit olduğunda kaynar. Kaynama sırasında verilen ısı, tanecikler arası etkileşimleri yenerek sıvıyı buhara dönüştürmekte kullanılır; ortalama kinetik enerji artmadığı için saf suyun sıcaklığı sabit kalır.</p>' +
        '<p>Uçucu olmayan bir madde çözündüğünde yüzeydeki su moleküllerinin bir kısmının yerini çözünen tanecikleri alır; buhar basıncı düşer ve kaynamak için daha yüksek sıcaklık gerekir. Bu etki <b>koligatif</b> bir özelliktir: çözünenin cinsine değil, çözeltideki <b>toplam tanecik derişimine</b> bağlıdır.</p>' +
        '<span class="dm-fk">Glikoz → 1 tanecik · NaCl → Na⁺ + Cl⁻ (2) · CaCl₂ → Ca²⁺ + 2Cl⁻ (3)</span>' +
        '<p>Eşit mol sayısında çözünen bu üç maddeden CaCl₂ en çok tanecik verdiği için kaynama noktasını en çok yükseltir. Çözelti kaynarken su buharlaştıkça çözelti derişir; bu yüzden çözeltinin kaynama sıcaklığı sabit kalmaz, çok yavaş yükselmeye devam eder.</p>',
        hayat: '<p>Makarna suyuna atılan bir tutam tuz suyun kaynama noktasını yalnızca yaklaşık 0,04 °C yükseltir; tuz pişme süresi için değil tat için kullanılır. Kışın yollara tuz serpilmesi ise aynı ilkenin donma noktası tarafıdır: çözünen tanecikler suyun donma noktasını düşürür.</p>',
      sorular: [
        {
          kok: 'Ayşe, 2 L suya kaynamadan önce 5 g NaCl atıyor ve "Su daha sıcakta kaynar, makarna çabuk pişer." diyor. Deneyindeki veriye göre (100 g suda 0,25 mol NaCl kaynama noktasını yaklaşık 2,6 °C yükseltti) bu tuz kaynama noktasını yaklaşık ne kadar yükseltir?',
          secenekler: ['Yaklaşık 0,04 °C', 'Yaklaşık 2,6 °C', 'Yaklaşık 10 °C', 'Hiç değiştirmez'], dogru: 0,
          aciklama: '5 g NaCl ≈ 0,085 mol ve 2 kg suda çözünüyor: kilogram başına tanecik derişimi deneydekinden yaklaşık 60 kat küçük (2,5 ÷ 0,043). Yükselme de yaklaşık 60 kat küçük olur: 2,6 ÷ 60 ≈ 0,04 °C. Tuz tat verir ama pişme süresini fark edilir biçimde değiştirmez.'
        },
        {
          kok: 'Kışın buzlanmaya karşı yollara tuz serpilir. Eşit kütlede NaCl ve CaCl₂ aynı miktar suda çözülürse hangisi suyun donma noktasını daha çok düşürür? (NaCl: 58,5 g/mol, CaCl₂: 111 g/mol)',
          secenekler: ['NaCl, çünkü 1 gramı daha çok tanecik verir.', 'CaCl₂, çünkü bir formül birimi 3 tanecik verir.', 'İkisi aynı ölçüde düşürür, çünkü kütleleri eşittir.', 'Karar verilemez, çünkü etki çözünenin cinsine bağlıdır.'], dogru: 0,
          aciklama: 'Etki tanecik sayısına bağlıdır. 111 g NaCl ≈ 1,9 mol → 3,8 mol tanecik; 111 g CaCl₂ = 1 mol → 3 mol tanecik. Eşit kütlede NaCl daha çok tanecik verir, donma noktasını daha çok düşürür. Formül birimi başına tanecik sayısı ancak mol sayıları eşitse belirleyicidir.'
        },
        {
          kok: 'Bir öğrenci tuzlu su kaynarken sıcaklığın 2 dakikada 102,6 °C\'tan 102,9 °C\'a çıktığını görüp "Termometre bozuk." diyor. Bu gözlemin en doğru açıklaması hangisidir?',
          secenekler: ['Su buharlaştıkça çözelti derişir, kaynama sıcaklığı yükselir.', 'Tuz çözündükçe ısı açığa çıkar, su ısınır.', 'Kaynama sırasında saf maddelerin sıcaklığı da artar.', 'Bekin alevi büyüdüğü için kaynama noktası yükselir.'], dogru: 0,
          aciklama: 'Çözeltide kaynama süresince su buhar olarak ayrılır, çözünen kapta kalır. Tanecik derişimi arttıkça kaynama sıcaklığı da yavaşça yükselir. Saf suyun sıcaklığı ise kaynama boyunca sabittir; alevin büyüklüğü kaynama noktasını değil kaynamaya ulaşma süresini değiştirir.'
        }
      ]
    });
  })();

  /* =====================================================================
     2. BOYLE YASASI: BASINÇ–HACİM (KİM.10.1.9)
     ===================================================================== */
  (function () {
    var VD = 1.0, P0 = 101.3, SX = 380, SY = 392, UZ = 330;
    function bas() { return { V: 50, hedef: 50, vana: 'acik', nRT: P0 * (50 + VD), Pg: P0 }; }
    function basinc(v) { return v.vana === 'acik' ? P0 : v.nRT / (v.V + VD); }
    function sayVar(S, f) { var n = 0; S.kosu().satirlar.forEach(function (r) { if (f(r)) n++; }); return n; }
    var EY = {
      vana: function (S) {
        var v = S.v;
        if (!S.yer.hortum) { S.ipucu('Önce hortumu bağla.', true); return; }
        if (v.vana === 'acik') { v.vana = 'kapali'; v.nRT = P0 * (v.V + VD); S.notEkle('Vana kapatıldı: şırıngadaki ' + tr(v.V, 0) + ' mL hava hapsedildi. Gazın miktarı ve sıcaklığı artık sabit.'); }
        else { v.vana = 'acik'; S.notEkle('Vana açıldı: şırınga yeniden dış havayla bağlantılı, basınç ' + tr(P0, 1) + ' kPa oldu.', 'Vana açıkken şırıngaya hava girip çıkabildiği için gaz miktarı sabit kalmaz; Boyle yasası yalnızca sabit miktardaki gaz için geçerlidir.', 'uyari'); }
      }
    };
    LD.ekle({
      id: 'boyle', sinif: 10, konu: 'Gazlar', sure: '10 dk',
      ad: 'Boyle yasası: basınç ve hacim',
      kisa: 'Kapalı şırıngadaki havayı sıkıştır ve genişlet, basıncı ölç. Hacim yarıya inince basınç ne olur? P·V çarpımı gerçekten sabit mi?',
      cikti: { kod: 'KİM.10.1.9', metin: 'Gazların özellikleri arasındaki ilişkileri bilimsel sorgulayabilme' },
      ikon: '<rect x="3" y="9" width="12" height="6" rx="1"/><path d="M15 12h5M20 9v6M7 9v6M1.5 12H3"/>',
      amac: 'Sabit sıcaklıkta, miktarı sabit tutulan bir gazın basıncı ile hacmi arasındaki ilişkiyi ölçümle bulmak ve grafikle göstermek.',
      degiskenler: { bagimsiz: 'Gazın hacmi (pistonun konumu)', bagimli: 'Gazın basıncı', kontrol: 'Gaz miktarı (vana kapalı), sıcaklık (25 °C)' },
      beceriler: ['Ölçme ve kaydetme', 'Grafik çizme', 'Örüntü bulma', 'Tümevarım'],
      malzemeler: [
        { ad: '60 mL şırınga ve destek', is: 'Hacmi okunabilen kap', parca: 'siringa' },
        { ad: 'Dijital basınç ölçer', is: 'Gaz basıncını kPa cinsinden ölçer', parca: 'olcer' },
        { ad: 'Vanalı bağlantı hortumu', is: 'Şırıngayı ölçere bağlar; vana kapanınca gaz hapsolur', parca: 'hortum' }
      ],
      guvenlik: ['Pistonu ani ve çok güçlü itme; şırınga ya da hortum yerinden çıkabilir.', 'Şırınganın ucunu kimsenin yüzüne doğru tutma.', 'Ölçümler arasında pistonu yavaş hareket ettir; hızlı sıkıştırmada gaz biraz ısınır.'],
      tahminler: [
        { id: 'yari', soru: 'Kapalı şırıngadaki havanın hacmi yarıya inerse (40 mL → 20 mL) basıncı nasıl değişir?', secenekler: ['Yarıya iner', 'Değişmez', 'İki katına çıkar', 'Dört katına çıkar'], dogru: 2,
          gozlem: function (S) { var a = null, b = null; S.kosular.forEach(function (k) { k.satirlar.forEach(function (r) { if (Math.abs(r.V - 40) < 0.3) a = r.P; if (Math.abs(r.V - 20) < 0.3) b = r.P; }); }); return a && b ? '40 mL\'de ' + tr(a, 1) + ' kPa, 20 mL\'de ' + tr(b, 1) + ' kPa (' + tr(b / a, 2) + ' kat).' : ''; } },
        { id: 'grafik', soru: 'Basınç–hacim grafiği hangi biçimde olur?', secenekler: ['Artan bir doğru', 'Azalan bir doğru', 'Azalan bir eğri (hiperbol)', 'Yatay bir doğru'], dogru: 2 }
      ],
      parcalar: [
        { id: 'olcer', ad: 'Basınç ölçer', x: 190, y: 470, bb: [-64, -102, 142, 104], ciz: function (g, P) { return P.basincOlcer(g, { sag: true }); } },
        {
          id: 'siringa', ad: 'Şırınga (60 mL)', x: SX, y: SY, bb: [-30, -30, 410, 110],
          ciz: function (g, P) {
            var y0 = 470 - SY;
            [70, 250].forEach(function (x) { P.yol(g, 'M' + (x - 16) + ' ' + y0 + ' L' + (x + 16) + ' ' + y0 + ' L' + (x + 10) + ' 24 L' + (x + 4) + ' 18 L' + (x - 4) + ' 18 L' + (x - 10) + ' 24 Z', { fill: 'url(#dm-g-ahsap)', stroke: '#8C6B45', 'stroke-width': 1 }); });
            var s = P.siringa(g, { uz: UZ, r: 20, max: 60, ml: 50 });
            s.tutamak.setAttribute('class', 'dm-tut'); s.tutamak.style.cursor = 'ew-resize';
            return s;
          }
        },
        {
          id: 'hortum', ad: 'Vanalı hortum', x: 0, y: 0, gerek: ['olcer', 'siringa'], bb: [250, 360, 110, 96],
          ciz: function (g, P) {
            P.hortum(g, 334, SY, 264, 444, { sarkma: 26, kalin: 7, renk: '#BBA990' });
            P.el('rect', { x: 330, y: SY - 4, width: 26, height: 8, rx: 3, fill: '#CFC5B8' }, g);
            return P.vana(g, 342, SY);
          }
        }
      ],
      baslangic: bas, zaman: false,
      kur: function (S) {
        var s = S.r.siringa; if (!s || !s.tutamak) return;
        var aktif = false;
        s.tutamak.addEventListener('pointerdown', function (e) { if (!S.yer.siringa) return; aktif = true; try { s.tutamak.setPointerCapture(e.pointerId); } catch (er) {} e.preventDefault(); });
        s.tutamak.addEventListener('pointermove', function (e) {
          if (!aktif) return;
          var q = S.nokta(e.clientX, e.clientY), xm = q.x - SX - UZ - 37 + 6;
          S.v.hedef = Math.round(sinir((xm - 6) / (UZ - 20) * 60, 20, 60) * 2) / 2;
        });
        function bit() { aktif = false; }
        s.tutamak.addEventListener('pointerup', bit); s.tutamak.addEventListener('pointercancel', bit);
      },
      goster: function (S, dtR) {
        var v = S.v;
        v.V = yaklas(v.V, v.hedef, dtR, 0.05);
        if (Math.abs(v.V - v.hedef) < 0.01) v.V = v.hedef;
        var P = basinc(v);
        v.Pg = Math.abs(P - v.Pg) > 0.3 ? P : yaklas(v.Pg, P + gurultu(0.04), dtR, 0.4);
        if (S.r.siringa && S.r.siringa.ayar) S.r.siringa.ayar(v.V);
        if (S.r.olcer) S.r.olcer.yaz(S.yer.olcer ? tr(S.yer.hortum ? v.Pg : P0, 1) : '');
        if (S.r.hortum && S.r.hortum.ayar) S.r.hortum.ayar(v.vana === 'acik');
      },
      okumalar: function (S) {
        var v = S.v;
        return [
          { ad: 'Hacim', d: tr(v.V, 1), b: 'mL' },
          { ad: 'Basınç', d: S.yer.hortum ? tr(v.Pg, 1) : '–', b: 'kPa', vurgu: v.vana === 'kapali' },
          { ad: 'Sıcaklık', d: '25,0', b: '°C' },
          { ad: 'Vana', d: v.vana === 'acik' ? 'Açık' : 'Kapalı' }
        ];
      },
      kontroller: function (S) {
        var v = S.v;
        return [
          { tur: 'kaydirici', id: 'hacim', etiket: 'Pistonun konumu (ya da tutamağı sürükle)', min: 20, max: 60, adim: 0.5, deger: v.hedef, pasif: !S.yer.siringa, bicim: function (x) { return tr(x, 1) + ' mL'; }, degis: function (S2, x) { S2.v.hedef = sinir(Math.round(x * 2) / 2, 20, 60); } },
          { tur: 'dugme', id: 'vana', etiket: v.vana === 'acik' ? 'Vanayı kapat' : 'Vanayı aç', ana: v.vana === 'acik', pasif: !S.yer.hortum, yap: EY.vana }
        ];
      },
      eylem: EY,
      yeniKosu: function (S) { S.v = bas(); },
      kosuAd: function (S) { return 'Deneme (25 °C)'; },
      olcum: {
        sutunlar: [
          { id: 'V', ad: 'Hacim', birim: 'mL', ondalik: 1 },
          { id: 'P', ad: 'Basınç', birim: 'kPa', ondalik: 1 },
          { id: 'iV', ad: '1/V', birim: '1/mL', hesap: function (r) { return 1 / r.V; }, ondalik: 4 },
          { id: 'PV', ad: 'P·V', birim: 'kPa·mL', hesap: function (r) { return r.P * r.V; }, ondalik: 0 }
        ],
        satir: function (S) {
          var v = S.v;
          if (!S.yer.hortum || v.vana === 'acik') return null;
          if (Math.abs(v.V - v.hedef) > 0.3) return null;
          return { V: Math.round(v.hedef * 10) / 10, P: Math.round(v.Pg * 10) / 10 };
        },
        uyari: function (S) { if (!S.yer.hortum) return 'Önce düzeneği kur.'; if (S.v.vana === 'acik') return 'Vana açıkken gaz miktarı sabit değil. Önce vanayı kapat.'; return 'Piston dursun, sonra kaydet.'; },
        bos: 'Vanayı kapatıp her hacimde “Ölçümü kaydet”e dokun.',
        ozet: function (S, k) {
          if (k.satirlar.length < 2) return '';
          var pv = k.satirlar.map(function (r) { return r.P * r.V; }), o = pv.reduce(function (a, b) { return a + b; }, 0) / pv.length;
          var sap = Math.max.apply(null, pv.map(function (x) { return Math.abs(x - o) / o * 100; }));
          return 'P·V ortalaması: <b>' + tr(o, 0) + ' kPa·mL</b> · en büyük sapma %' + tr(sap, 1);
        },
        grafikler: [{
          ad: 'Basınç–hacim', x: 'V', y: 'P', sirala: true, xEt: 'Hacim (mL)', yEt: 'Basınç (kPa)', xMin: 0, xMax: 70, yMin: 0, yMax: 250, xBol: 7,
          ekle: function (S, o, seriler) {
            seriler.forEach(function (s) {
              if (s.n.length < 2) return;
              var k = s.n.reduce(function (a, p) { return a + p[0] * p[1]; }, 0) / s.n.length, n = [];
              for (var V = 16; V <= 70; V += 1) n.push([V, k / V]);
              o.seriler.push({ ad: 'P·V = ' + tr(k, 0) + ' eğrisi', renk: '#0B5C8A', n: n, nokta: false, kesik: true, kalin: 1.6 });
            });
          },
          not: function (S, seriler) { return seriler.length && seriler[0].n.length > 2 ? 'Noktalar kesikli P·V = sabit eğrisinin üstünde. Hacim azaldıkça basınç artıyor ama doğrusal değil: hacim yarıya inince basınç iki katına çıkıyor.' : ''; }
        }, {
          ad: 'Basınç–1/hacim', x: 'iV', y: 'P', xEt: '1/Hacim (1/mL)', yEt: 'Basınç (kPa)', xMin: 0, xMax: 0.06, yMin: 0, yMax: 250, xBol: 6, cizgi: false,
          ekle: function (S, o, seriler) {
            seriler.forEach(function (s) {
              var e = LD.egim(s.n, true);
              if (e) { o.dogrular.push({ x1: 0, y1: 0, x2: 0.06, y2: 0.06 * e.m, renk: '#0B5C8A', kesik: true, kalin: 1.6 }); o.lejant = [{ ad: 'Orijinden geçen doğru', renk: '#0B5C8A', kesik: true }]; }
            });
          },
          not: function (S, seriler) {
            var e = seriler.length ? LD.egim(seriler[0].n, true) : null;
            return e && seriler[0].n.length > 2 ? 'Basınç ile 1/hacim arasında orijinden geçen doğrusal ilişki var: <b>P = k · (1/V)</b>, yani P·V = k ≈ ' + tr(e.m, 0) + ' kPa·mL. Basınç ile hacim <b>ters orantılıdır</b>.' : '';
          }
        }]
      },
      adimlar: [
        { metin: 'Basınç ölçeri masaya koy.', parca: 'olcer', tamam: function (S) { return S.yer.olcer; } },
        { metin: 'Şırıngayı desteğinin üstüne yerleştir.', parca: 'siringa', tamam: function (S) { return S.yer.siringa; } },
        { metin: 'Vanalı hortumla şırıngayı basınç ölçere bağla.', parca: 'hortum', tamam: function (S) { return S.yer.hortum; } },
        { metin: 'Vana açıkken pistonu 40 mL çizgisine getir.', tamam: function (S) { return S.yer.hortum && Math.abs(S.v.V - 40) < 0.3 && Math.abs(S.v.hedef - 40) < 0.3; }, oto: [['ayar', 'hacim', 40, 900]] },
        { metin: 'Vanayı kapat: şırıngadaki hava hapsolsun.', tamam: function (S) { return S.v.vana === 'kapali'; }, oto: [['eylem', 'vana']] },
        { metin: '40 mL\'deki basıncı kaydet.', tamam: function (S) { return S.kosu().satirlar.length > 0; }, oto: [['kaydet']] },
        { metin: 'Pistonu iterek hacmi 35, 30, 25 ve 20 mL yap; her birinde basıncı kaydet.', tamam: function (S) { return sayVar(S, function (r) { return r.V < 39; }) >= 4 && sayVar(S, function (r) { return r.V <= 20.5; }) >= 1; },
          oto: [['ayar', 'hacim', 35, 700], ['kaydet'], ['ayar', 'hacim', 30, 700], ['kaydet'], ['ayar', 'hacim', 25, 700], ['kaydet'], ['ayar', 'hacim', 20, 700], ['kaydet']] },
        { metin: 'Pistonu çekerek 45, 50, 55 ve 60 mL\'de de ölç.', tamam: function (S) { return sayVar(S, function (r) { return r.V > 41; }) >= 4 && sayVar(S, function (r) { return r.V >= 59.5; }) >= 1; },
          oto: [['ayar', 'hacim', 45, 900], ['kaydet'], ['ayar', 'hacim', 50, 700], ['kaydet'], ['ayar', 'hacim', 55, 700], ['kaydet'], ['ayar', 'hacim', 60, 700], ['kaydet']] }
      ],
      bitisMetni: 'Ölçümler tamam. Tablodaki P·V sütununu karşılaştır, sonra grafikte “Basınç–1/hacim” görünümüne geç.',
      ozet: function (S) {
        var k = S.kosu(); if (k.satirlar.length < 3) return '';
        var pv = k.satirlar.map(function (r) { return r.P * r.V; }), o = pv.reduce(function (a, b) { return a + b; }, 0) / pv.length;
        var s = '<p>' + k.satirlar.length + ' ölçümde P·V çarpımı ortalama <b>' + tr(o, 0) + ' kPa·mL</b> çıktı; değerler arasındaki fark yüzde birkaçı geçmiyor. Bu fark hortumdaki küçük hava hacminden ve okuma duyarlılığından gelir.</p>';
        var a = null, b = null; k.satirlar.forEach(function (r) { if (Math.abs(r.V - 40) < 0.3) a = r; if (Math.abs(r.V - 20) < 0.3) b = r; });
        if (a && b) s += '<p>Hacim 40 mL\'den 20 mL\'ye yarıya indiğinde basınç ' + tr(a.P, 1) + ' kPa\'dan ' + tr(b.P, 1) + ' kPa\'ya çıktı: yaklaşık <b>' + tr(b.P / a.P, 2) + ' katı</b>.</p>';
        return s + '<p>Sonuç: sabit sıcaklıkta belirli miktardaki bir gazın basıncı ile hacmi <b>ters orantılıdır</b> (P·V = sabit).</p>';
      },
      neden: '<p>Gaz tanecikleri sürekli ve gelişigüzel hareket eder; basınç, taneciklerin kabın çeperlerine birim zamanda birim yüzeye yaptığı çarpmalardan kaynaklanır. Sıcaklık sabit kaldığı için taneciklerin ortalama hızı değişmez.</p>' +
        '<p>Hacim yarıya inince aynı sayıdaki tanecik yarı hacimde toplanır; birim hacimdeki tanecik sayısı iki katına çıkar ve çeperlere birim zamanda iki kat fazla çarpma olur. Bu yüzden basınç iki katına çıkar.</p>' +
        '<span class="dm-fk">n ve T sabitken: P₁·V₁ = P₂·V₂</span>' +
        '<p>Vana açıkken şırıngaya hava girip çıkabildiğinden gaz miktarı sabit değildir; Boyle yasası yalnızca miktarı ve sıcaklığı sabit tutulan gaz için geçerlidir.</p>',
      hayat: '<p>Nefes alırken diyafram kası kasılır, göğüs boşluğunun hacmi büyür, akciğerlerdeki basınç düşer ve hava içeri dolar. Dalgıçlar yüzeye çıkarken nefeslerini tutmamalıdır: azalan basınçta akciğerdeki hava genişler.</p>',
      sorular: [
        { kok: 'Bir dalgıç 10 m derinlikte (yaklaşık 2 atm) akciğerine 3 L hava alıp nefesini tutarak yüzeye (1 atm) çıkıyor. Sıcaklık sabitse akciğerindeki havanın hacmi ne olmaya çalışır?', secenekler: ['1,5 L', '3 L', '6 L', '9 L'], dogru: 2, aciklama: 'P₁·V₁ = P₂·V₂ → 2 atm · 3 L = 1 atm · V₂ → V₂ = 6 L. Akciğer bu kadar genişleyemeyeceği için dalgıçlar yükselirken nefes vermelidir.' },
        { kok: 'Ucu kapatılmış bir bisiklet pompasının pistonu itildiğinde içerideki havanın basıncı artar. Bunun tanecik düzeyindeki açıklaması hangisidir?', secenekler: ['Gaz tanecikleri küçülür.', 'Birim yüzeye birim zamanda çarpan tanecik sayısı artar.', 'Taneciklerin ortalama hızı azalır.', 'Pompadaki tanecik sayısı artar.'], dogru: 1, aciklama: 'Tanecik sayısı ve büyüklüğü değişmez; aynı tanecikler daha küçük hacme sıkışır. Birim hacimdeki tanecik sayısı arttığı için çeperlere birim zamanda daha çok çarpma olur.' },
        { kok: 'Deneyde 40 mL\'de yaklaşık 101 kPa ölçüldü. Aynı hava (sıcaklık sabit) 25 mL\'ye sıkıştırılırsa basınç yaklaşık kaç kPa olur?', secenekler: ['63 kPa', '101 kPa', '162 kPa', '203 kPa'], dogru: 2, aciklama: 'P₂ = P₁·V₁/V₂ = 101 · 40 / 25 ≈ 162 kPa. Hacim 1,6 kat azaldığı için basınç 1,6 kat artar.' }
      ]
    });
  })();

  /* =====================================================================
     3–4. SU BANYOSUYLA GAZ DENEYLERİ: CHARLES ve GAY-LUSSAC (KİM.10.1.9)
     ===================================================================== */
  var BX = 450, BY = 418;
  function banyoBas(ek) { var v = { Tb: 20, Tg: 20, Tth: 20, buz: 0, su: 950, hedef: 0, Pis: 0, dT: 0, denge: true }; for (var k in ek) v[k] = ek[k]; return v; }
  function banyoFizik(S, dt, tauGaz) {
    var v = S.v, C = v.su * 4.18 + 400, kayip = 2.5 * (v.Tb - 20), Pis = 0, Qb = 0;
    if (v.hedef > 0 && S.yer.isitici && S.yer.banyo) Pis = sinir(kayip + 700 * (v.hedef - v.Tb) / 1.5, 0, 700);
    if (v.buz > 0) {
      Qb = 80 * Math.pow(v.buz / 100, 2 / 3) * Math.max(0, v.Tb);
      var dm = Math.min(v.buz, Qb / 334 * dt);
      v.buz -= dm; v.Tb = v.Tb * v.su / (v.su + dm); v.su += dm;
      if (v.buz < 0.5) v.buz = 0;
    }
    var once = v.Tb;
    v.Tb += (Pis - kayip - Qb) / C * dt;
    if (v.buz > 0 && v.Tb < 0) v.Tb = 0;
    v.dT = (v.Tb - once) / Math.max(dt, 1e-6);
    v.Pis = Pis;
    v.Tg = yaklas(v.Tg, v.Tb, dt, tauGaz);
    if (S.yer.termometre) v.Tth = yaklas(v.Tth, v.Tb, dt, 3);
    v.denge = Math.abs(v.Tg - v.Tb) < 0.15 && Math.abs(v.dT) < 0.004;
  }
  var BANYO_EY = {
    buz: function (S) {
      if (!S.yer.banyo) { S.ipucu('Önce su banyosunu yerleştir.', true); return; }
      if (S.v.buz >= 400) { S.ipucu('Banyoda yeterince buz var.'); return; }
      S.v.buz += 100;
      S.notEkle('Banyoya 100 g buz eklendi.', 'Buz erirken sudan ısı alır; buz bitene kadar su 0 °C\'ın altına inmez.');
    }
  };
  function banyoParcalari(ekParcalar) {
    var L = [
      { id: 'isitici', ad: 'Isıtıcı', x: BX, y: 470, bb: [-122, -60, 244, 62], ciz: function (g, P) { return P.isitici(g, { w: 230, h: 46 }); } },
      { id: 'termometre', ad: 'Dijital termometre', x: 720, y: 470, gerek: ['banyo'], bb: [-195, -370, 330, 372], ciz: function (g, P) { return P.termometre(g, { probX: -180, probY: -78, kolY: -320 }); } }
    ];
    ekParcalar.forEach(function (p) { L.push(p); });
    L.push({
      id: 'banyo', ad: 'Su banyosu (950 mL su)', x: BX, y: BY, gerek: ['isitici'], bb: [-132, -248, 264, 250],
      ciz: function (g, P, kucuk) {
        var k = P.kap(g, { profil: P.profilBeher(250, 240), kapasite: 1100, kapasiteY: 228, hacim: 950, gaga: true, renk: '#BFE3F5', opak: 0.5, cizgiler: [{ ml: 500, etiket: '500', uzun: true }, { ml: 1000, etiket: '1000 mL', uzun: true }] });
        if (!kucuk) k.buzlar = P.buzlar(k);
        return k;
      }
    });
    return L;
  }
  function banyoGoster(S, dtR) {
    var v = S.v, r = S.r;
    if (r.isitici && r.isitici.ayar) r.isitici.ayar(S.yer.isitici && S.yer.banyo ? v.Pis / 700 : 0);
    if (r.banyo && r.banyo.buzlar) { r.banyo.ayar(v.su * (1 + 0.0003 * (v.Tb - 20))); r.banyo.buzlar.ayar(Math.ceil(v.buz / 70)); }
    if (r.termometre) r.termometre.yaz(S.yer.termometre ? tr(v.Tth, 1) : '--,-');
  }
  function banyoKontrol(S) {
    var v = S.v;
    return [
      { tur: 'kaydirici', id: 'hedef', etiket: 'Isıtıcı ayarı (termostat)', min: 0, max: 90, adim: 5, deger: v.hedef, pasif: !(S.yer.isitici && S.yer.banyo), bicim: function (x) { return x <= 0 ? 'Kapalı' : tr(x, 0) + ' °C'; }, degis: function (S2, x) { S2.v.hedef = Math.round(x / 5) * 5; } },
      { tur: 'dugme', id: 'buz', etiket: 'Buz ekle (100 g)', pasif: !S.yer.banyo || v.buz >= 400, yap: BANYO_EY.buz }
    ];
  }
  function banyoOkuma(S, ek) {
    var v = S.v;
    var L = [{ ad: 'Su sıcaklığı', d: S.yer.termometre ? tr(v.Tth, 1) : '–', b: '°C' }];
    ek.forEach(function (x) { L.push(x); });
    L.push({ ad: 'Isıtıcı', d: v.hedef > 0 ? tr(v.hedef, 0) + ' °C' : 'Kapalı' });
    L.push({ ad: 'Denge', d: v.denge ? 'Sağlandı' : 'Bekleniyor', vurgu: v.denge && S.yer.termometre });
    return L;
  }
  function esitlikBekle(hedef) { return function (S) { return S.v.denge && Math.abs(S.v.Tb - hedef) < 0.6 && S.yer.termometre; }; }
  function gazAdimlari(parcaAd, parcaMetin, olcAd) {
    function var_(S, a, b) { return S.kosuVar(function (k) { return k.satirlar.some(function (r) { return r.tc >= a && r.tc <= b; }); }); }
    var A = [
      { metin: 'Isıtıcıyı masaya koy.', parca: 'isitici', tamam: function (S) { return S.yer.isitici; } },
      { metin: 'İçinde 950 mL su bulunan büyük beheri ısıtıcının üstüne koy.', parca: 'banyo', tamam: function (S) { return S.yer.banyo; } },
      { metin: 'Termometrenin ucunu suya daldır.', parca: 'termometre', tamam: function (S) { return S.yer.termometre; } },
      { metin: parcaMetin, parca: parcaAd, tamam: function (S) { return S.yer[parcaAd]; } }
    ];
    if (olcAd) A.push({ metin: 'Basınç ölçeri hortumla kaba bağla.', parca: olcAd, tamam: function (S) { return S.yer[olcAd]; } });
    A.push({ metin: 'Banyoya üç kez buz ekle. Su 0 °C\'a yaklaşıp denge sağlanınca ölçümü kaydet.', tamam: function (S) { return var_(S, -1, 3); }, oto: [['eylem', 'buz'], ['eylem', 'buz'], ['eylem', 'buz'], ['bekle', function (S) { return S.v.denge && S.v.Tb < 1.5; }], ['kaydet']] });
    A.push({ metin: 'Isıtıcıyı 20 °C\'a ayarla; sıcaklık sabitlenip denge sağlanınca kaydet.', tamam: function (S) { return var_(S, 18, 22); }, oto: [['ayar', 'hedef', 20, 600], ['bekle', esitlikBekle(20)], ['kaydet']] });
    A.push({
      metin: 'Aynı işlemi 40, 60 ve 80 °C için tekrarla.', tamam: function (S) { return var_(S, 38, 42) && var_(S, 58, 62) && var_(S, 78, 82); },
      oto: [['ayar', 'hedef', 40, 600], ['bekle', esitlikBekle(40)], ['kaydet'], ['ayar', 'hedef', 60, 600], ['bekle', esitlikBekle(60)], ['kaydet'], ['ayar', 'hedef', 80, 600], ['bekle', esitlikBekle(80)], ['kaydet']]
    });
    return A;
  }
  function uzatmaGrafigi(ad, yId, yEt, yMax, birimAd) {
    return {
      ad: ad, x: 'tc', y: yId, sirala: true, cizgi: false, xEt: 'Sıcaklık (°C)', yEt: yEt, xMin: -300, xMax: 100, yMin: 0, yMax: yMax, xBol: 8,
      ekle: function (S, o, seriler) {
        seriler.forEach(function (s) {
          if (s.n.length < 2) return;
          var e = LD.egim(s.n); if (!e || Math.abs(e.m) < 1e-9) return;
          var x0 = -e.b / e.m;
          o.dogrular.push({ x1: x0, y1: 0, x2: 100, y2: e.b + 100 * e.m, renk: '#0B5C8A', kesik: true, kalin: 1.6 });
          o.isaretler.push({ x: x0, y: 0, metin: '≈ ' + tr(x0, 0) + ' °C', renk: '#B42318', dx: 4, dy: -10 });
          o.lejant = [{ ad: 'Eğilim doğrusu ve uzantısı', renk: '#0B5C8A', kesik: true }];
        });
      },
      not: function (S, seriler) {
        if (!seriler.length || seriler[0].n.length < 3) return 'Ölçtüğün noktalardan geçen doğru, ' + birimAd + ' sıfır olacağı sıcaklığa kadar uzatılacak.';
        var e = LD.egim(seriler[0].n);
        return e ? 'Noktalardan geçen doğru uzatıldığında ' + birimAd + ' yaklaşık <b>' + tr(-e.b / e.m, 0) + ' °C</b>\'ta sıfıra iniyor. Bu sıcaklık mutlak sıfırdır (0 K = −273,15 °C).' : '';
      }
    };
  }
  function kelvinGrafigi(ad, yId, yEt, yMax, oranAd, birim) {
    return {
      ad: ad, x: 'TK', y: yId, sirala: true, cizgi: false, xEt: 'Mutlak sıcaklık (K)', yEt: yEt, xMin: 0, xMax: 400, yMin: 0, yMax: yMax, xBol: 8,
      ekle: function (S, o, seriler) { seriler.forEach(function (s) { var e = LD.egim(s.n, true); if (e) { o.dogrular.push({ x1: 0, y1: 0, x2: 400, y2: 400 * e.m, renk: '#0B5C8A', kesik: true, kalin: 1.6 }); o.lejant = [{ ad: 'Orijinden geçen doğru', renk: '#0B5C8A', kesik: true }]; } }); },
      not: function (S, seriler) { var e = seriler.length ? LD.egim(seriler[0].n, true) : null; return e && seriler[0].n.length > 2 ? 'Doğru orijinden geçiyor: ' + oranAd + ' ≈ ' + tr(e.m, 3) + ' ' + birim + '. Kelvin cinsinden sıcaklıkla doğru orantılı.' : ''; }
    };
  }

  /* ---------- 3. Charles ---------- */
  (function () {
    var SX = 395, SY = 369, UZ = 180, V0 = 30.0, T0 = 20;
    function hacim(v) { return V0 * (v.Tg + 273.15) / (T0 + 273.15); }
    LD.ekle({
      id: 'charles', sinif: 10, konu: 'Gazlar', sure: '15 dk',
      ad: 'Charles yasası: hacim ve sıcaklık',
      kisa: 'Şırıngadaki havayı buzlu sudan 80 °C\'a kadar ısıt, hacmini ölç. Grafiği uzat: hacim hangi sıcaklıkta sıfır olur?',
      cikti: { kod: 'KİM.10.1.9', metin: 'Gazların özellikleri arasındaki ilişkileri bilimsel sorgulayabilme' },
      ikon: '<rect x="8" y="3" width="6" height="12" rx="1"/><path d="M11 15v4M8 6h6M3 21h18M5 18c1.5 1.3 3 1.3 4.5 0s3-1.3 4.5 0 3 1.3 4.5 0"/>',
      amac: 'Sabit basınçta, miktarı sabit bir gazın hacmi ile sıcaklığı arasındaki ilişkiyi ölçmek; grafiği uzatarak mutlak sıfırı bulmak.',
      degiskenler: { bagimsiz: 'Gazın sıcaklığı (su banyosunun sıcaklığı)', bagimli: 'Gazın hacmi', kontrol: 'Gaz miktarı (ucu kapalı şırınga), basınç (piston serbest: dış basınç)' },
      beceriler: ['Ölçme', 'Denge durumunu bekleme', 'Grafik çizme', 'Grafiği uzatma (ekstrapolasyon)'],
      malzemeler: [
        { ad: 'Isıtıcı (termostatlı)', is: 'Banyoyu istenen sıcaklıkta tutar', parca: 'isitici' },
        { ad: 'Büyük beher (su banyosu)', is: '950 mL su', parca: 'banyo' },
        { ad: 'Ucu kapalı 50 mL şırınga', is: '20 °C\'ta 30,0 mL hava; piston serbestçe kayar', parca: 'siringa' },
        { ad: 'Dijital termometre', is: 'Banyonun sıcaklığını ölçer', parca: 'termometre' },
        { ad: 'Buz', is: 'Banyoyu 0 °C\'a kadar soğutmak için' }
      ],
      guvenlik: ['Isıtıcının yüzeyi ve sıcak su yakar; sıcak behere dokunma.', 'Isıtıcıyı suyu kaynatacak kadar açma.', 'Şırınganın ucunun sıkıca kapalı olduğundan emin ol.'],
      tahminler: [
        { id: 'iki', soru: 'Şırıngadaki havanın sıcaklığı 40 °C\'tan 80 °C\'a (iki katına) çıkarsa hacmi de iki katına çıkar mı?', secenekler: ['Evet, hacim iki katına çıkar', 'Hayır, hacim yalnızca yaklaşık %13 artar', 'Hayır, hacim değişmez', 'Hayır, hacim azalır'], dogru: 1,
          gozlem: function (S) { var a = null, b = null; S.kosular.forEach(function (k) { k.satirlar.forEach(function (r) { if (Math.abs(r.tc - 40) < 2) a = r.V; if (Math.abs(r.tc - 80) < 2) b = r.V; }); }); return a && b ? '40 °C\'ta ' + tr(a, 1) + ' mL, 80 °C\'ta ' + tr(b, 1) + ' mL (%' + tr((b / a - 1) * 100, 0) + ' artış).' : ''; } },
        { id: 'sifir', soru: 'Hacim–sıcaklık (°C) grafiğindeki doğru uzatılırsa hacim yaklaşık hangi sıcaklıkta sıfır olur?', secenekler: ['0 °C', '−100 °C', '−273 °C', 'Doğru hiçbir zaman sıfıra inmez'], dogru: 2 }
      ],
      parcalar: banyoParcalari([{
        id: 'siringa', ad: 'Ucu kapalı şırınga', x: SX, y: SY, gerek: ['banyo'], bb: [-205, -352, 240, 456],
        ciz: function (g, P) {
          var st = P.g(g, { transform: 'translate(-180,' + (470 - SY) + ')' });
          P.statif(st, { h: 380, taban: 110 });
          P.kiskac(g, -180, -150, -18, { ceneW: 34 });
          var s = P.siringa(g, { uz: UZ, r: 16, max: 50, dikey: true, ml: 30, adim: 10, kucuk: 2 });
          P.el('rect', { x: -6, y: 24, width: 12, height: 7, rx: 2, fill: '#2C3136' }, g);
          return s;
        }
      }]),
      kur: function (S, P) { S.etk = P.yazi(S.ust, 0, 0, '', { 'font-size': 15, fill: '#0B5C8A', 'paint-order': 'stroke', stroke: '#fff', 'stroke-width': 4 }); },
      baslangic: function () { return banyoBas({}); },
      hiz: 10, otoHiz: 30,
      fizik: function (S, dt) { banyoFizik(S, dt, 12); },
      goster: function (S, dtR) {
        banyoGoster(S, dtR);
        var V = hacim(S.v), s = S.r.siringa;
        if (s && s.ayar) s.ayar(V);
        if (S.etk) {
          if (S.yer.siringa) { var y = SY - s.xMl(V); S.etk.setAttribute('x', SX + 24); S.etk.setAttribute('y', y + 5); S.etk.textContent = '← ' + tr(V, 1) + ' mL'; }
          else S.etk.textContent = '';
        }
      },
      okumalar: function (S) { return banyoOkuma(S, [{ ad: 'Gaz hacmi', d: S.yer.siringa ? tr(hacim(S.v), 1) : '–', b: 'mL' }]); },
      kontroller: banyoKontrol,
      eylem: BANYO_EY,
      yeniKosu: function (S) { S.v = banyoBas({}); },
      kosuAd: function () { return 'Şırıngadaki hava'; },
      olcum: {
        sutunlar: [
          { id: 'tc', ad: 'Sıcaklık', birim: '°C', ondalik: 1 },
          { id: 'V', ad: 'Hacim', birim: 'mL', ondalik: 1 },
          { id: 'TK', ad: 'Mutlak sıcaklık', birim: 'K', hesap: function (r) { return r.tc + 273; }, ondalik: 0 },
          { id: 'VT', ad: 'V/T', birim: 'mL/K', hesap: function (r) { return r.V / (r.tc + 273); }, ondalik: 4 }
        ],
        satir: function (S) {
          var v = S.v;
          if (!S.yer.siringa || !S.yer.termometre || !v.denge) return null;
          return { tc: Math.round(v.Tth * 10) / 10, V: Math.round((hacim(v) + gurultu(0.04)) * 10) / 10 };
        },
        uyari: function (S) { if (!S.yer.siringa || !S.yer.termometre) return 'Önce düzeneği kur.'; return 'Gaz henüz suyun sıcaklığına ulaşmadı. “Denge: Sağlandı” görününce kaydet.'; },
        bos: 'Her sıcaklıkta denge sağlanınca “Ölçümü kaydet”e dokun.',
        ozet: function (S, k) { if (k.satirlar.length < 2) return ''; var e = LD.egim(k.satirlar.map(function (r) { return [r.tc, r.V]; })); return e ? 'Doğrunun uzantısı hacmi <b>' + tr(-e.b / e.m, 0) + ' °C</b>\'ta sıfırlıyor.' : ''; },
        grafikler: [uzatmaGrafigi('Hacim–sıcaklık (°C)', 'V', 'Hacim (mL)', 40, 'hacim'), kelvinGrafigi('Hacim–mutlak sıcaklık (K)', 'V', 'Hacim (mL)', 40, 'V/T', 'mL/K')]
      },
      adimlar: gazAdimlari('siringa', 'Ucu kapalı, içinde 30 mL hava bulunan şırıngayı kıskaçla suya daldır.'),
      bitisMetni: 'Ölçümler tamam. Grafikte doğrunun uzantısının hacim eksenini kestiği sıcaklığı oku; sonra “Hacim–mutlak sıcaklık” grafiğine geç.',
      ozet: function (S) {
        var k = S.kosu(); if (k.satirlar.length < 3) return '';
        var e = LD.egim(k.satirlar.map(function (r) { return [r.tc, r.V]; })), e2 = LD.egim(k.satirlar.map(function (r) { return [r.tc + 273, r.V]; }), true);
        var s = '<p>Sıcaklık arttıkça hacim <b>düzenli olarak</b> arttı: her 10 °C\'lık artış hacmi yaklaşık ' + tr(e.m * 10, 2) + ' mL büyüttü.</p>';
        s += '<p>Ölçümlerinden geçen doğru uzatıldığında hacim yaklaşık <b>' + tr(-e.b / e.m, 0) + ' °C</b>\'ta sıfır oluyor. Bu değer mutlak sıfırdır: <b>0 K = −273,15 °C</b>.</p>';
        if (e2) s += '<p>Sıcaklığı Kelvin cinsinden alınca V/T oranı yaklaşık sabit (≈ ' + tr(e2.m, 3) + ' mL/K): hacim mutlak sıcaklıkla <b>doğru orantılı</b>. °C cinsinden sıcaklık iki katına çıkınca hacim iki katına çıkmaz.</p>';
        return s;
      },
      neden: '<p>Sıcaklık arttıkça gaz taneciklerinin ortalama kinetik enerjisi artar; tanecikler pistona daha sık ve daha şiddetli çarpar. Piston serbest olduğu için gaz, içerideki basınç dışarıdaki basınca yeniden eşitlenene kadar genişler.</p>' +
        '<span class="dm-fk">n ve P sabitken: V₁/T₁ = V₂/T₂ (T: Kelvin)</span>' +
        '<p>Hacim mutlak sıcaklıkla doğru orantılıdır; °C ile değil. Grafiğin uzantısının hacim eksenini −273 °C\'ta kesmesi bu sıcaklığın (0 K) ulaşılabilecek en düşük sıcaklık olduğunu gösterir. Gerçek gazlar bu sıcaklığa inmeden sıvılaşır; uzantı yalnızca kuramsal bir sonuçtur.</p>',
      hayat: '<p>Güneşte kalan balon şişer, kışın soğukta top söner. Sıcak hava balonlarında ısıtılan hava genişler, yoğunluğu azalır ve balon yükselir. Fırındaki hamurun kabarmasında da içindeki gaz kabarcıklarının genişlemesi rol oynar.</p>',
      sorular: [
        { kok: '27 °C\'taki odada 3,0 L hacminde şişirilen bir balon −3 °C\'taki dışarıya çıkarılıyor. Basınç değişmediyse balonun hacmi yaklaşık kaç litre olur?', secenekler: ['0,3 L', '2,7 L', '3,0 L', '3,3 L'], dogru: 1, aciklama: 'Sıcaklıklar Kelvin\'e çevrilir: 300 K → 270 K. V₂ = 3,0 · 270 / 300 = 2,7 L. °C ile oranlanırsa (27 → −3) anlamsız bir sonuç çıkar.' },
        { kok: 'Sabit basınçtaki bir gazın sıcaklığı 20 °C\'tan 40 °C\'a çıkarılırsa hacmi nasıl değişir?', secenekler: ['İki katına çıkar.', 'Yaklaşık %7 artar.', 'Yarıya iner.', 'Değişmez.'], dogru: 1, aciklama: '293 K → 313 K: oran 313/293 ≈ 1,07. Hacim yaklaşık %7 artar. °C cinsinden değerin iki katına çıkması mutlak sıcaklığın iki katına çıktığı anlamına gelmez.' },
        { kok: 'Hacim–sıcaklık (°C) grafiğindeki doğru uzatıldığında hacmin yaklaşık −273 °C\'ta sıfır olması neyi gösterir?', secenekler: ['Gazın −273 °C\'ta gerçekten yok olduğunu.', 'Kelvin ölçeğinin sıfır noktasının (mutlak sıfır) yaklaşık −273 °C olduğunu.', 'Termometrenin hatalı olduğunu.', 'Hacmin sıcaklıkla ters orantılı olduğunu.'], dogru: 1, aciklama: 'Gerçek gazlar −273 °C\'a inmeden sıvılaşır; uzantı kuramsaldır. Doğrunun bu noktada sıfırlanması, hacmin mutlak sıcaklıkla doğru orantılı olduğunu ve en düşük sıcaklığın 0 K olduğunu gösterir.' }
      ]
    });
  })();

  /* ---------- 4. Gay-Lussac ---------- */
  (function () {
    var FX = 410, P0 = 101.3, T0 = 20;
    function basinc(v) { return P0 * (v.Tg + 273.15) / (T0 + 273.15); }
    LD.ekle({
      id: 'gay-lussac', sinif: 10, konu: 'Gazlar', sure: '15 dk',
      ad: 'Gay-Lussac yasası: basınç ve sıcaklık',
      kisa: 'Kapalı bir kaptaki havayı 0 °C\'tan 80 °C\'a ısıt, basıncını ölç. Basınç–sıcaklık grafiği nereden geçer?',
      cikti: { kod: 'KİM.10.1.9', metin: 'Gazların özellikleri arasındaki ilişkileri bilimsel sorgulayabilme' },
      ikon: '<path d="M8 3h5M9 3v5l-5 9a2 2 0 0 0 2 3h9a2 2 0 0 0 2-3l-5-9V3"/><circle cx="19" cy="7" r="3"/><path d="M19 7l1.4-1.4"/>',
      amac: 'Hacmi ve miktarı sabit bir gazın basıncı ile sıcaklığı arasındaki ilişkiyi ölçmek; grafikten mutlak sıfırı bulmak.',
      degiskenler: { bagimsiz: 'Gazın sıcaklığı', bagimli: 'Gazın basıncı', kontrol: 'Gaz miktarı ve hacmi (tıpalı, sağlam cam kap)' },
      beceriler: ['Ölçme', 'Denge durumunu bekleme', 'Grafik çizme', 'Karşılaştırma'],
      malzemeler: [
        { ad: 'Isıtıcı (termostatlı)', is: 'Banyoyu istenen sıcaklıkta tutar', parca: 'isitici' },
        { ad: 'Büyük beher (su banyosu)', is: '950 mL su', parca: 'banyo' },
        { ad: 'Tıpalı erlen', is: 'İçindeki hava 20 °C\'ta kapatıldı', parca: 'balon' },
        { ad: 'Basınç ölçer ve hortum', is: 'Kaptaki gazın basıncını ölçer', parca: 'olcer' },
        { ad: 'Dijital termometre', is: 'Banyonun sıcaklığını ölçer', parca: 'termometre' }
      ],
      guvenlik: ['Sıcak su ve ısıtıcı yakar; sıcak behere dokunma.', 'Kapalı kapları doğrudan alevle ya da çok yüksek sıcaklığa ısıtma; basınç artınca kap patlayabilir.', 'Tıpanın sıkıca oturduğundan emin ol.'],
      tahminler: [
        { id: 'yon', soru: 'Kapalı kaptaki havanın sıcaklığı artarsa basıncı nasıl değişir?', secenekler: ['Artar', 'Azalır', 'Değişmez'], dogru: 0 },
        { id: 'iki', soru: 'Sıcaklık 20 °C\'tan 40 °C\'a çıkarsa basınç iki katına çıkar mı?', secenekler: ['Evet, iki katına çıkar', 'Hayır, yaklaşık %7 artar', 'Hayır, yarıya iner'], dogru: 1,
          gozlem: function (S) { var a = null, b = null; S.kosular.forEach(function (k) { k.satirlar.forEach(function (r) { if (Math.abs(r.tc - 20) < 2) a = r.P; if (Math.abs(r.tc - 40) < 2) b = r.P; }); }); return a && b ? '20 °C\'ta ' + tr(a, 1) + ' kPa, 40 °C\'ta ' + tr(b, 1) + ' kPa (%' + tr((b / a - 1) * 100, 0) + ' artış).' : ''; } }
      ],
      parcalar: banyoParcalari([{
        id: 'balon', ad: 'Tıpalı erlen', x: FX, y: BY, gerek: ['banyo'], bb: [-200, -205, 285, 258],
        ciz: function (g, P) {
          var st = P.g(g, { transform: 'translate(-180,' + (470 - BY) + ')' });
          P.statif(st, { h: 300, taban: 110 });
          P.kiskac(g, -180, -158, -22, { ceneW: 22 });
          P.kap(g, { profil: P.profilErlen(150, 168, 18, 40), kapasite: 250, hacim: 0, agiz: false });
          P.tipa(g, 0, -176, 44, 18, '#7A5236');
          P.el('rect', { x: -3, y: -196, width: 6, height: 24, fill: '#CFC5B8' }, g);
          return {};
        }
      }, {
        id: 'olcer', ad: 'Basınç ölçer ve hortum', x: 912, y: 470, gerek: ['balon'], bb: [-512, -330, 578, 332],
        ciz: function (g, P) {
          P.yol(g, 'M' + (FX - 912) + ' ' + (BY - 470 - 196) + ' C ' + (FX - 912) + ' -330 -120 -330 -82 -26', { stroke: '#BBA990', 'stroke-width': 7, fill: 'none', 'stroke-linecap': 'round' });
          return P.basincOlcer(g, {});
        }
      }]),
      baslangic: function () { return banyoBas({}); },
      hiz: 10, otoHiz: 30,
      fizik: function (S, dt) { banyoFizik(S, dt, 15); },
      goster: function (S, dtR) {
        banyoGoster(S, dtR);
        S.v.Pg = S.v.Pg === undefined ? P0 : yaklas(S.v.Pg, basinc(S.v) + gurultu(0.03), dtR, 0.3);
        if (S.r.olcer && S.r.olcer.yaz) S.r.olcer.yaz(S.yer.olcer ? tr(S.v.Pg, 1) : '');
      },
      okumalar: function (S) { return banyoOkuma(S, [{ ad: 'Basınç', d: S.yer.olcer ? tr(S.v.Pg === undefined ? P0 : S.v.Pg, 1) : '–', b: 'kPa' }]); },
      kontroller: banyoKontrol,
      eylem: BANYO_EY,
      yeniKosu: function (S) { S.v = banyoBas({}); },
      kosuAd: function () { return 'Erlendeki hava'; },
      olcum: {
        sutunlar: [
          { id: 'tc', ad: 'Sıcaklık', birim: '°C', ondalik: 1 },
          { id: 'P', ad: 'Basınç', birim: 'kPa', ondalik: 1 },
          { id: 'TK', ad: 'Mutlak sıcaklık', birim: 'K', hesap: function (r) { return r.tc + 273; }, ondalik: 0 },
          { id: 'PT', ad: 'P/T', birim: 'kPa/K', hesap: function (r) { return r.P / (r.tc + 273); }, ondalik: 4 }
        ],
        satir: function (S) {
          var v = S.v;
          if (!S.yer.olcer || !S.yer.termometre || !v.denge) return null;
          return { tc: Math.round(v.Tth * 10) / 10, P: Math.round(basinc(v) * 10) / 10 };
        },
        uyari: function (S) { if (!S.yer.olcer || !S.yer.termometre) return 'Önce düzeneği kur.'; return 'Gaz henüz suyun sıcaklığına ulaşmadı. “Denge: Sağlandı” görününce kaydet.'; },
        bos: 'Her sıcaklıkta denge sağlanınca “Ölçümü kaydet”e dokun.',
        ozet: function (S, k) { if (k.satirlar.length < 2) return ''; var e = LD.egim(k.satirlar.map(function (r) { return [r.tc, r.P]; })); return e ? 'Doğrunun uzantısı basıncı <b>' + tr(-e.b / e.m, 0) + ' °C</b>\'ta sıfırlıyor.' : ''; },
        grafikler: [uzatmaGrafigi('Basınç–sıcaklık (°C)', 'P', 'Basınç (kPa)', 140, 'basınç'), kelvinGrafigi('Basınç–mutlak sıcaklık (K)', 'P', 'Basınç (kPa)', 140, 'P/T', 'kPa/K')]
      },
      adimlar: gazAdimlari('balon', 'İçindeki hava 20 °C\'ta tıpayla kapatılmış erleni kıskaçla suya daldır.', 'olcer'),
      bitisMetni: 'Ölçümler tamam. Grafikte doğrunun uzantısının basınç eksenini kestiği sıcaklığı oku; sonra “Basınç–mutlak sıcaklık” grafiğine geç.',
      ozet: function (S) {
        var k = S.kosu(); if (k.satirlar.length < 3) return '';
        var e = LD.egim(k.satirlar.map(function (r) { return [r.tc, r.P]; })), e2 = LD.egim(k.satirlar.map(function (r) { return [r.tc + 273, r.P]; }), true);
        return '<p>Sıcaklık arttıkça basınç düzenli olarak arttı: her 10 °C\'ta yaklaşık ' + tr(e.m * 10, 1) + ' kPa.</p><p>Doğrunun uzantısı basıncı yaklaşık <b>' + tr(-e.b / e.m, 0) + ' °C</b>\'ta sıfırlıyor (mutlak sıfır). Kelvin cinsinden P/T oranı yaklaşık sabit (≈ ' + tr(e2.m, 3) + ' kPa/K): basınç mutlak sıcaklıkla <b>doğru orantılı</b>.</p>';
      },
      neden: '<p>Kap sağlam ve tıpalı olduğu için gazın hacmi ve miktarı değişmez. Isıtılan gaz taneciklerinin ortalama kinetik enerjisi artar; tanecikler çeperlere daha sık ve daha şiddetli çarpar, basınç artar.</p>' +
        '<span class="dm-fk">n ve V sabitken: P₁/T₁ = P₂/T₂ (T: Kelvin)</span>' +
        '<p>Basınç–sıcaklık (°C) doğrusu uzatıldığında basınç −273 °C civarında sıfırlanır; Charles deneyindeki hacim doğrusuyla aynı nokta. Bu ortak nokta mutlak sıfırdır.</p>',
      hayat: '<p>Araç lastiklerinin basıncı yolculuk sonunda artar; bu yüzden basınç soğukken ölçülmelidir. Sprey kutularının üzerindeki “50 °C\'ın üzerinde saklamayın, ateşe atmayın” uyarısı da bu yüzdendir. Düdüklü tencerede basınç arttığı için su 100 °C\'ın üzerinde kaynar.</p>',
      sorular: [
        { kok: 'Bir aracın lastik basıncı sabah 7 °C\'ta 2,10 atm ölçülüyor. Yolculuk sonunda lastikteki havanın sıcaklığı 47 °C oluyor. Lastiğin hacmi değişmediyse basınç yaklaşık kaç atm olur?', secenekler: ['1,84 atm', '2,10 atm', '2,40 atm', '14,1 atm'], dogru: 2, aciklama: '280 K → 320 K: P₂ = 2,10 · 320 / 280 = 2,40 atm. °C ile oranlamak (47/7) çok yanlış bir sonuç verir.' },
        { kok: 'Sprey kutularında “Ateşe atmayınız” uyarısı bulunur. Bunun en doğru nedeni hangisidir?', secenekler: ['Isınan gazın hacmi azalır, kutu çöker.', 'Kutu kapalı olduğu için ısınan gazın basıncı artar, kutu patlayabilir.', 'Isı gazın miktarını artırır.', 'Kutudaki gaz soğuyunca basınç artar.'], dogru: 1, aciklama: 'Hacim ve miktar sabitken basınç mutlak sıcaklıkla doğru orantılı artar. Kutunun dayanabileceği basınç aşılırsa kutu patlar.' },
        { kok: 'Gay-Lussac deneyinde basıncın mutlak sıcaklığa (K) karşı grafiği nasıl bir çizgi verir?', secenekler: ['Orijinden geçen artan doğru', 'Azalan doğru', 'Yatay doğru', 'Azalan eğri'], dogru: 0, aciklama: 'P = k · T olduğu için P–T(K) grafiği orijinden geçen bir doğrudur. °C ekseninde ise doğru −273 °C\'ta basınç eksenini keser.' }
      ]
    });
  })();

})();
