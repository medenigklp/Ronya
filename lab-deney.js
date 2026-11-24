/* Sanal Laboratuvar · Deney masası (lab-deney.js)
   Düzeneği sürükle-bırak ile kur, ölçümleri tabloya kaydet, grafiği canlı çiz.
   Her deney: Maarif öğrenme çıktısı etiketi, Hazırlık (amaç, değişkenler, malzeme, güvenlik),
   Tahmin, Deney (tezgâh + adımlar + gözlem defteri + ölçüm tablosu + grafik) ve Sonuç
   (tahmin–gözlem karşılaştırması, kuram, bağlam temelli sorular) aşamalarından oluşur.
   Otomatik oynat, öğretmen modu (akıllı tahta/TV) ve yazdırılabilir çalışma kâğıdı vardır.
   Deneyler lab-deneyler.js içinde LabDeney.ekle({...}) ile tanımlanır.
   Kod ES5 ile yazıldı (eski tarayıcılarda da çalışsın diye). */
(function () {
  'use strict';
  var LA = window.LabArayuz, P = window.LabDeneyCizim;
  var D = [], DI = {};
  var LD = window.LabDeney = { ekle: function (d) { D.push(d); DI[d.id] = d; }, liste: D };
  if (!P) return;

  /* ================= YARDIMCILAR ================= */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function h(s) { return String(s === undefined || s === null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function tr(x, d) {
    if (x === undefined || x === null || !isFinite(x)) return '–';
    var s = (Math.abs(x) < 1e-12 ? 0 : x).toFixed(d === undefined ? 1 : d);
    if (s === '-0' || /^-0[.,]0*$/.test(s)) s = s.slice(1);
    return s.replace('-', '−').replace('.', ',');
  }
  function sure(s) {
    s = Math.max(0, Math.round(s || 0));
    var sa = Math.floor(s / 3600), dk = Math.floor((s % 3600) / 60), sn = s % 60;
    return (sa ? sa + ':' + (dk < 10 ? '0' : '') : '') + dk + ':' + (sn < 10 ? '0' : '') + sn;
  }
  function kopya(o) { var r = {}; for (var k in o) if (o.hasOwnProperty(k)) r[k] = o[k]; return r; }
  function dom(html) { var d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; }
  var simdi = function () { return (window.performance && performance.now) ? performance.now() : Date.now(); };
  LD.tr = tr; LD.sure = sure; LD.h = h;

  var IK = {
    geri: '<path d="M15 18l-6-6 6-6"/>',
    ileri: '<path d="M9 18l6-6-6-6"/>',
    oynat: '<path d="M7 5v14l11-7z" fill="currentColor" stroke="none"/>',
    duraklat: '<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" stroke="none"/>',
    atla: '<path d="M6 5v14l9-7z" fill="currentColor" stroke="none"/><path d="M18 5v14"/>',
    dur: '<rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor" stroke="none"/>',
    sunum: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16v4"/>',
    cik: '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>',
    yazdir: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>',
    kaydet: '<circle cx="12" cy="12" r="8"/><path d="M12 8v8M8 12h8"/>',
    kopya: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>',
    yeni: '<path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5"/>',
    kur: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3.5 17.5l3 3 5.8-5.8a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
    tik: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    sil: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    ok: '<path d="M5 12h14M13 6l6 6-6 6"/>'
  };
  function ikon(ad) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IK[ad] + '</svg>'; }
  function deneyIkon(d) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (d.ikon || '') + '</svg>'; }
  var RENK = ['#F85300', '#0B5C8A', '#1B6B4A', '#7A3FC0', '#B42318', '#A15C00', '#2E7D8C', '#6B6460'];
  var SINIF_RENK = { 9: ['#FFF6E0', '#8A4F00'], 10: ['#E6F1F8', '#0B5C8A'], 11: ['#E8F4EE', '#1B6B4A'], 12: ['#F3EDFB', '#5B3A99'] };

  /* ================= KALICI KAYIT (yalnızca bu tarayıcıda) ================= */
  var DEPO = 'lab-deney-1';
  function depoOku() { try { return JSON.parse(localStorage.getItem(DEPO) || '{}') || {}; } catch (e) { return {}; } }
  function depoYaz(o) { try { localStorage.setItem(DEPO, JSON.stringify(o)); } catch (e) {} }
  function kayit(id) { var a = depoOku(); return a[id] || {}; }
  function kayitYaz(id, f) { var a = depoOku(); a[id] = a[id] || {}; f(a[id]); depoYaz(a); }

  /* ================= SEKME VE BÖLÜM ================= */
  var nav = $('.lab-sekme'), serbest = $('#m-serbest');
  if (!nav || !serbest) return;
  P.tanimlar();
  var sekB = document.createElement('button');
  sekB.setAttribute('data-mod', 'deney'); sekB.textContent = 'Deney masası';
  var tiB = nav.querySelector('[data-mod="titrasyon"]');
  nav.insertBefore(sekB, tiB || null);
  var bolum = document.createElement('section');
  bolum.className = 'mod'; bolum.id = 'm-deney';
  bolum.innerHTML = '<div class="dm-katalog"></div><div class="dm-deney" hidden></div>';
  serbest.parentNode.insertBefore(bolum, serbest.nextSibling);
  var katalogEl = $('.dm-katalog', bolum), deneyEl = $('.dm-deney', bolum);
  sekB.addEventListener('click', function () { LA.modAc('deney'); katalogGoster(); });
  $$('button', nav).forEach(function (b) { b.addEventListener('click', function () { setTimeout(gorunurlukDegisti, 0); }); });

  var gorunum = 'katalog';
  function modDeney() { return LA && LA.mod === 'deney'; }
  function gorunurlukDegisti() { if (modDeney() && gorunum === 'deney') donguBaslat(); if (!modDeney() && sunumda()) sunumKapat(); }

  /* ================= KATALOG ================= */
  var filtre = 'hepsi';
  function katalogCiz() {
    var kay = depoOku();
    var siniflar = [];
    D.forEach(function (d) { if (siniflar.indexOf(d.sinif) < 0) siniflar.push(d.sinif); });
    siniflar.sort(function (a, b) { return a - b; });
    var top = D.length, biten = D.filter(function (d) { return kay[d.id] && kay[d.id].bitti; }).length;
    var s = '<div class="dm-kbas"><div><h2>Deney masası</h2><p>Düzeneği kendin kur, ölç, grafiğini çiz. Önce tahmin et, sonra gözle ve açıkla. Her deney Maarif programındaki bir öğrenme çıktısına bağlı.</p></div>' +
      '<div class="cipler" role="tablist"><button class="cip' + (filtre === 'hepsi' ? ' on' : '') + '" data-flt="hepsi">Tümü · ' + top + '</button>' +
      siniflar.map(function (k) { return '<button class="cip' + (filtre === String(k) ? ' on' : '') + '" data-flt="' + k + '">' + k + '. sınıf</button>'; }).join('') + '</div></div>';
    s += '<div class="dm-izgara">' + D.filter(function (d) { return filtre === 'hepsi' || String(d.sinif) === filtre; }).map(function (d) {
      var r = SINIF_RENK[d.sinif] || SINIF_RENK[10], b = kay[d.id] && kay[d.id].bitti;
      return '<button class="dm-k" data-dm="' + d.id + '"><div class="dm-k-ust"><span class="dm-ikon" style="background:' + r[0] + ';color:' + r[1] + '">' + deneyIkon(d) + '</span>' +
        (b ? '<span class="dm-rz ok">' + ikon('tik').replace('<svg', '<svg width="12" height="12"') + ' Tamamlandı</span>' : '<span class="dm-rz s' + d.sinif + '">' + d.sinif + '. sınıf</span>') + '</div>' +
        '<h3>' + h(d.ad) + '</h3><p>' + h(d.kisa) + '</p>' +
        '<div class="dm-k-alt">' + (d.cikti && d.cikti.kod ? '<span class="dm-rz kod">' + h(d.cikti.kod) + '</span>' : '') + '<span class="dm-rz">' + h(d.konu) + '</span>' + (d.olcum && d.olcum.grafikler ? '<span class="dm-rz">Ölçüm + grafik</span>' : '<span class="dm-rz">Ölçüm</span>') + '<span class="dm-rz">' + h(d.sure || '') + '</span></div></button>';
    }).join('') + '</div>';
    s += '<p class="dm-not">' + biten + ' / ' + top + ' deney tamamlandı. Bu bir benzetimdir: değerler gerçek ölçümlere yakın hesaplanır ama gerçek laboratuvarın ve öğretmen gözetiminin yerini tutmaz.</p>';
    katalogEl.innerHTML = s;
  }
  katalogEl.addEventListener('click', function (e) {
    var f = e.target.closest('[data-flt]');
    if (f) { filtre = f.getAttribute('data-flt'); katalogCiz(); return; }
    var k = e.target.closest('[data-dm]');
    if (k) deneyAc(k.getAttribute('data-dm'));
  });
  function katalogGoster() {
    otoDur(); sunumKapat();
    gorunum = 'katalog'; deneyEl.hidden = true; katalogEl.hidden = false; katalogCiz();
    try { history.replaceState(null, '', '#deney'); } catch (e) {}
  }

  /* ================= DENEY DURUMU ================= */
  var S = null, d = null, ONB = {};
  function durumYeni(dd) {
    var st = {
      d: dd, P: P, v: dd.baslangic ? dd.baslangic() : {}, yer: {}, r: {}, t: 0, krono: 0, kronoCalisiyor: false,
      hiz: dd.hiz || 1, kosular: [], ak: 0, tk: 0, defter: [], ok: [], asama: 'hazirlik', tahmin: {}, gerekce: '', not: '', soru: {}
    };
    st.kosular.push({ no: 1, ad: '', renk: RENK[0], satirlar: [] });
    var k = kayit(dd.id);
    st.tahmin = k.tahmin || {}; st.gerekce = k.gerekce || ''; st.not = k.not || ''; st.soru = k.soru || {};
    return st;
  }
  /* Deney tanımlarının kullandığı servisler */
  function servisler(st) {
    st.notEkle = function (metin, neden, tur) { st.defter.push({ t: st.krono, metin: metin, neden: neden || '', tur: tur || 'on' }); defterEkle(st.defter[st.defter.length - 1]); };
    st.ipucu = function (m, kirmizi) { ipucu(m, kirmizi); };
    st.kaydet = function () { return kaydet(); };
    st.kronoBaslat = function () { if (!st.kronoCalisiyor) { st.kronoCalisiyor = true; if (d.olcum && d.olcum.oto && st.krono === 0) kaydet(true); } };
    st.kronoDur = function () { st.kronoCalisiyor = false; };
    st.kronoSifirla = function () { st.krono = 0; st.kronoCalisiyor = false; };
    st.kosu = function () { return st.kosular[st.ak]; };
    st.kosuVar = function (f) { for (var i = 0; i < st.kosular.length; i++) if (f(st.kosular[i], i)) return true; return false; };
    st.yeniKosu = function () { yeniKosu(); };
    st.kirli = function () { veriKirli = true; kontrolImza = ''; };
    st.nokta = function (cx, cy) { return svgNokta(cx, cy); };
    st.kaldir = function (id) { parcaKaldir(id); };
    st.yerlestir = function (id) { return yerlestir(id, true); };
    st.tr = tr; st.sure = sure;
  }

  /* ================= DENEY GÖRÜNÜMÜ ================= */
  var ASAMALAR = [['hazirlik', 'Hazırlık'], ['tahmin', 'Tahmin'], ['deney', 'Deney'], ['sonuc', 'Sonuç']];
  function deneyAc(id) {
    var dd = DI[id]; if (!dd) return;
    otoDur();
    d = dd;
    if (!ONB[id]) { ONB[id] = durumYeni(dd); servisler(ONB[id]); }
    S = ONB[id];
    gorunum = 'deney'; katalogEl.hidden = true; deneyEl.hidden = false;
    deneyCiz();
    asamaAc(S.asama || 'hazirlik', true);
    try { history.replaceState(null, '', '#deney-' + id); } catch (e) {}
    var r = bolum.getBoundingClientRect();
    if (r.top < 0) window.scrollTo(0, Math.max(0, window.pageYOffset + r.top - 8));
    donguBaslat();
  }
  LD.ac = function (id) { if (LA) LA.modAc('deney'); deneyAc(id); };

  function etiketlerHtml(dd) {
    return '<span class="dm-rz s' + dd.sinif + '">' + dd.sinif + '. sınıf</span><span class="dm-rz">' + h(dd.konu) + '</span>' +
      (dd.cikti && dd.cikti.kod ? '<span class="dm-rz kod">' + h(dd.cikti.kod) + '</span>' : '') + (dd.sure ? '<span class="dm-rz">' + h(dd.sure) + '</span>' : '');
  }
  function deneyCiz() {
    var s = '<div class="dm-ust"><div class="dm-bas"><button class="ab dm-geri" data-is="katalog">' + ikon('geri') + 'Deneyler</button>' +
      '<h2>' + h(d.ad) + '</h2><div class="dm-etk" style="margin-top:8px">' + etiketlerHtml(d) + '</div>' +
      (d.cikti ? '<p class="dm-cikti"><b>Öğrenme çıktısı:</b> ' + (d.cikti.kod ? h(d.cikti.kod) + ' · ' : '') + h(d.cikti.metin) + '</p>' : '') + '</div>' +
      '<div class="dm-arac"><button class="ab ana" data-is="oto">' + ikon('oynat') + '<span>Otomatik oynat</span></button>' +
      '<button class="ab" data-is="sunum">' + ikon('sunum') + '<span>Öğretmen modu</span></button>' +
      '<button class="ab" data-is="yazdir">' + ikon('yazdir') + '<span>Çalışma kâğıdı</span></button></div></div>' +
      '<nav class="dm-asama">' + ASAMALAR.map(function (a, i) { return '<button data-asama="' + a[0] + '"><i>' + (i + 1) + '</i><span>' + a[1] + '</span></button>'; }).join('') + '</nav>' +
      '<div class="dm-panel" data-p="hazirlik"></div><div class="dm-panel" data-p="tahmin"></div><div class="dm-panel" data-p="deney"></div><div class="dm-panel" data-p="sonuc"></div>';
    deneyEl.innerHTML = s;
    hazirlikCiz(); tahminCiz(); deneyPanelCiz();
  }
  deneyEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-is]');
    if (b) {
      var is = b.getAttribute('data-is');
      if (is === 'katalog') katalogGoster();
      else if (is === 'oto') { if (O) otoDur(); else otoBaslat(); }
      else if (is === 'sunum') { if (sunumda()) sunumKapat(); else sunumAc(); }
      else if (is === 'yazdir') yazdir();
      return;
    }
    var a = e.target.closest('[data-asama]');
    if (a) { asamaAc(a.getAttribute('data-asama')); return; }
    var gt = e.target.closest('[data-git]');
    if (gt) { asamaAc(gt.getAttribute('data-git')); var r = deneyEl.getBoundingClientRect(); if (r.top < 0 && !sunumda()) window.scrollTo(0, Math.max(0, window.pageYOffset + r.top - 8)); }
  });
  function asamaAc(a, ilk) {
    S.asama = a;
    $$('.dm-panel', deneyEl).forEach(function (p) { p.hidden = p.getAttribute('data-p') !== a; });
    $$('.dm-asama button', deneyEl).forEach(function (b) {
      var x = b.getAttribute('data-asama');
      b.classList.toggle('on', x === a);
      b.classList.toggle('bitti', !!(x !== a && ((x === 'hazirlik' && a !== 'hazirlik') || (x === 'tahmin' && tahminVar()) || (x === 'deney' && S.bitti))));
    });
    if (a === 'sonuc') sonucCiz();
    if (a === 'deney') { veriKirli = true; kontrolImza = ''; setTimeout(boyutla, 0); }
    if (sunumda() && !ilk) deneyEl.scrollTop = 0;
  }
  function tahminVar() { for (var k in S.tahmin) if (S.tahmin.hasOwnProperty(k)) return true; return false; }

  /* ---------- Hazırlık ---------- */
  function parcaBul(id) { for (var i = 0; i < d.parcalar.length; i++) if (d.parcalar[i].id === id) return d.parcalar[i]; return null; }
  function hazirlikCiz() {
    var p = $('[data-p="hazirlik"]', deneyEl);
    var dg = d.degiskenler || {};
    var s = '<div class="dm-hz"><div class="kart dm-kutu"><h3>Amaç</h3><p>' + h(d.amac) + '</p>' +
      (d.degiskenler ? '<h3 style="margin-top:14px">Değişkenler</h3><dl class="dm-dg">' +
        (dg.bagimsiz ? '<div><dt>Bağımsız (değiştirilen)</dt><dd>' + h(dg.bagimsiz) + '</dd></div>' : '') +
        (dg.bagimli ? '<div><dt>Bağımlı (ölçülen)</dt><dd>' + h(dg.bagimli) + '</dd></div>' : '') +
        (dg.kontrol ? '<div><dt>Kontrol (sabit tutulan)</dt><dd>' + h(dg.kontrol) + '</dd></div>' : '') + '</dl>' : '') +
      (d.beceriler ? '<h3 style="margin-top:14px">Kullanacağın beceriler</h3><div class="dm-etk">' + d.beceriler.map(function (b) { return '<span class="dm-rz">' + h(b) + '</span>'; }).join('') + '</div>' : '') +
      '</div><div class="kart dm-kutu"><h3>Malzemeler</h3><div class="dm-mlz"></div>' +
      (d.guvenlik ? '<h3 style="margin-top:16px">Gerçek laboratuvarda güvenlik</h3><ul class="dm-gv">' + d.guvenlik.map(function (g) { return '<li>' + h(g) + '</li>'; }).join('') + '</ul>' : '') +
      '</div></div><div class="dm-ileri"><button class="ab" data-git="deney">Doğrudan deneye geç</button><button class="ab ana" data-git="tahmin">Tahmine geç' + ikon('ok') + '</button></div>';
    p.innerHTML = s;
    var mk = $('.dm-mlz', p);
    (d.malzemeler || []).forEach(function (m) {
      var e = dom('<div class="dm-ml"><div><b>' + h(m.ad) + '</b><small>' + h(m.is || '') + '</small></div></div>');
      var pc = m.parca ? parcaBul(m.parca) : null;
      if (pc && pc.bb) e.insertBefore(P.kucukResim(function (g, PP, k) { pc.ciz(g, PP, true, null); }, pc.bb, 40), e.firstChild);
      mk.appendChild(e);
    });
  }

  /* ---------- Tahmin ---------- */
  function tahminCiz() {
    var p = $('[data-p="tahmin"]', deneyEl);
    var L = d.tahminler || [];
    var s = '<div class="dm-th">' + L.map(function (t, i) {
      return '<div class="kart dm-thk" data-th="' + t.id + '"><div class="dm-sno">Tahmin ' + (i + 1) + '</div><h3>' + h(t.soru) + '</h3><div class="dm-sec">' +
        t.secenekler.map(function (x, j) { return '<button data-ths="' + j + '" class="' + (S.tahmin[t.id] === j ? 'on' : '') + '"><i>' + 'ABCDE'.charAt(j) + '</i><span>' + h(x) + '</span></button>'; }).join('') + '</div></div>';
    }).join('') +
      '<div class="kart dm-thk"><div class="dm-gerek" style="margin-top:0"><label for="dm-gerekce">Neden böyle düşünüyorsun? (isteğe bağlı)</label><textarea id="dm-gerekce" placeholder="Tahminini bir cümleyle gerekçelendir.">' + h(S.gerekce) + '</textarea></div></div></div>' +
      '<div class="dm-ileri"><button class="ab" data-git="hazirlik">' + ikon('geri') + 'Hazırlık</button><button class="ab ana" data-git="deney">Deneye başla' + ikon('ok') + '</button></div>';
    p.innerHTML = s;
    p.addEventListener('click', function (e) {
      var b = e.target.closest('[data-ths]'); if (!b) return;
      var k = b.closest('[data-th]'), id = k.getAttribute('data-th'), j = +b.getAttribute('data-ths');
      S.tahmin[id] = j;
      $$('[data-ths]', k).forEach(function (x) { x.classList.toggle('on', +x.getAttribute('data-ths') === j); });
      kayitYaz(d.id, function (o) { o.tahmin = S.tahmin; });
    });
    var ta = $('#dm-gerekce', p);
    ta.addEventListener('input', function () { S.gerekce = ta.value; kayitYaz(d.id, function (o) { o.gerekce = ta.value; }); });
  }

  /* ---------- Deney paneli ---------- */
  var W = 1000, H = 560, MASA = 470;
  var svg, katYuva, katParca, katUst, sahneEl, tepsiEl, kontrolEl, okEl, talEl, adimEl, defterEl, tabloEl, grafikEl, zamanEl;
  function deneyPanelCiz() {
    var p = $('[data-p="deney"]', deneyEl);
    var s = '<div class="dm-dz">' +
      '<div class="kart dm-tk"><div class="dm-tal"><span class="dm-tno"></span><span class="dm-tmt"></span></div>' +
      '<div class="dm-ok"></div><div class="dm-sahne"><div class="dm-ipucu" role="status" aria-live="polite"></div></div>' +
      '<div class="dm-tepsi"></div><div class="dm-kontrol"></div><div class="dm-zaman"></div><div class="dm-oyn" hidden></div></div>' +
      '<div class="kart dm-ad"><div class="dm-kb"><h3>Adımlar</h3><small class="dm-adsay"></small></div><ol class="dm-adl"></ol></div>' +
      '<div class="kart dm-df dm-defter"><div class="dm-kb"><h3>Gözlem defteri</h3><small>Neden? bağlantılarına dokun</small></div><ol class="dm-dl"></ol>' +
      '<div class="dm-dnot"><textarea placeholder="Kendi gözlemini ya da sorunu yaz…" aria-label="Kendi notun"></textarea><div class="dm-ds"><button class="ab" data-df="ekle">Deftere ekle</button><button class="ab" data-df="kopya">' + ikon('kopya') + 'Defteri kopyala</button></div></div></div>' +
      '<div class="kart dm-tb"><div class="dm-kb"><h3>Ölçüm tablosu</h3><small class="dm-tbsay"></small></div><div class="dm-kosular"></div><div class="dm-tsar"></div><div class="dm-tozet"></div>' +
      '<div class="dm-tdug"><button class="ab" data-tb="kopya">' + ikon('kopya') + 'Tabloyu kopyala</button><button class="ab" data-tb="sil">' + ikon('sil') + 'Son satırı sil</button></div></div>' +
      '<div class="kart dm-gr"><div class="dm-kb"><h3>Grafik</h3><div class="dm-gsec"></div></div><div class="dm-gkap"></div><div class="dm-gal"></div><div class="dm-gnot" hidden></div></div>' +
      '</div><div class="dm-ileri"><button class="ab" data-git="tahmin">' + ikon('geri') + 'Tahmin</button><button class="ab ana" data-git="sonuc">Sonuca geç' + ikon('ok') + '</button></div>';
    p.innerHTML = s;
    sahneEl = $('.dm-sahne', p); tepsiEl = $('.dm-tepsi', p); kontrolEl = $('.dm-kontrol', p); okEl = $('.dm-ok', p);
    talEl = $('.dm-tal', p); adimEl = $('.dm-adl', p); defterEl = $('.dm-dl', p); tabloEl = $('.dm-tb', p); grafikEl = $('.dm-gr', p); zamanEl = $('.dm-zaman', p);
    sahneKur();
    tepsiCiz(); okumaKur(); zamanCiz(); adimlarCiz(true); defterCiz(); kontrolImza = ''; veriKirli = true; grafikSecim = 0;
    $('.dm-defter textarea', p).value = '';
    p.addEventListener('click', panelTik);
  }
  function panelTik(e) {
    var b = e.target.closest('[data-df]');
    if (b) {
      var ta = $('.dm-defter textarea', deneyEl);
      if (b.getAttribute('data-df') === 'ekle') { var m = ta.value.trim(); if (m) { S.notEkle(m, '', 'kendi'); ta.value = ''; } }
      else kopyala(S.defter.map(function (x) { return sure(x.t) + '  ' + x.metin + (x.neden ? ' (' + x.neden + ')' : ''); }).join('\n'), 'Defter kopyalandı');
      return;
    }
    var t = e.target.closest('[data-tb]');
    if (t) {
      var is = t.getAttribute('data-tb');
      if (is === 'kopya') kopyala(tabloMetin(), 'Tablo kopyalandı: Excel ya da Sayılar\'a yapıştırabilirsin');
      else if (is === 'sil') { var k = S.kosular[S.tk]; if (k && k.satirlar.length) { k.satirlar.pop(); veriKirli = true; } }
      return;
    }
    var ks = e.target.closest('[data-kosu]');
    if (ks) { S.tk = +ks.getAttribute('data-kosu'); veriKirli = true; return; }
    var gs = e.target.closest('[data-gsec]');
    if (gs) { grafikSecim = +gs.getAttribute('data-gsec'); veriKirli = true; return; }
    var z = e.target.closest('[data-hiz]');
    if (z) { S.hiz = +z.getAttribute('data-hiz'); zamanCiz(); return; }
    var zi = e.target.closest('[data-zis]');
    if (zi) {
      var x = zi.getAttribute('data-zis');
      if (x === 'kaydet') { if (kaydet()) ipucu('Ölçüm kaydedildi'); }
      else if (x === 'yeni') yeniKosu();
      return;
    }
    var tp = e.target.closest('[data-tepsi]');
    if (tp && tp.getAttribute('data-tepsi') === 'kur') hepsiniKur();
  }
  function kopyala(metin, mesaj) {
    function yedek() {
      var ta = document.createElement('textarea'); ta.value = metin; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); ipucu(mesaj); } catch (e) { ipucu('Kopyalanamadı', true); }
      document.body.removeChild(ta);
    }
    try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(metin).then(function () { ipucu(mesaj); }, yedek); else yedek(); } catch (e) { yedek(); }
  }

  /* ---------- Tezgâh (SVG) ---------- */
  var parcaG = {};
  function sahneKur() {
    svg = P.el('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'dm-svg', role: 'img', 'aria-label': d.ad + ' düzeneği' });
    P.arka(P.g(svg), W, H, MASA);
    katYuva = P.g(svg, { class: 'dm-yuvalar' });
    katParca = P.g(svg);
    katUst = P.g(svg);
    S.ust = katUst; S.svg = svg; S.r = {}; parcaG = {};
    if (d.sahne) d.sahne(S, P.g(katParca), P);
    d.parcalar.forEach(function (pc) {
      var gg = P.g(katParca, { class: 'dm-p', 'data-id': pc.id, transform: 'translate(' + pc.x + ',' + pc.y + ')' });
      S.r[pc.id] = pc.ciz(gg, P, false, S) || {};
      gg.style.display = S.yer[pc.id] ? '' : 'none';
      parcaG[pc.id] = gg;
    });
    if (d.kur) d.kur(S, P);
    sahneEl.insertBefore(svg, sahneEl.firstChild);
    yuvalarCiz();
    if (d.goster) d.goster(S, 0, 0);
  }
  function boyutla() { /* SVG kendiliğinden ölçeklenir */ }
  function gerekTamam(pc) { return !pc.gerek || pc.gerek.every(function (x) { return S.yer[x]; }); }
  function eksikGerek(pc) { if (!pc.gerek) return null; for (var i = 0; i < pc.gerek.length; i++) if (!S.yer[pc.gerek[i]]) return parcaBul(pc.gerek[i]); return null; }
  function siradakiParca() {
    var A = d.adimlar || [], i = adimSu();
    if (i >= 0 && A[i] && A[i].parca && !S.yer[A[i].parca]) return A[i].parca;
    for (var j = 0; j < d.parcalar.length; j++) { var pc = d.parcalar[j]; if (!S.yer[pc.id] && gerekTamam(pc)) return pc.id; }
    return null;
  }
  function yuvalarCiz(vurgu) {
    while (katYuva.firstChild) katYuva.removeChild(katYuva.firstChild);
    var sira = siradakiParca();
    d.parcalar.forEach(function (pc) {
      if (S.yer[pc.id] || !gerekTamam(pc) || !pc.bb) return;
      if (vurgu ? pc.id !== vurgu : pc.id !== sira) return;
      var on = pc.id === vurgu || pc.id === sira;
      var x = pc.x + pc.bb[0], y = pc.y + pc.bb[1];
      P.el('rect', { x: x - 6, y: y - 6, width: pc.bb[2] + 12, height: pc.bb[3] + 12, rx: 14, fill: on ? 'rgba(248,83,0,.06)' : 'rgba(20,17,15,.02)', stroke: on ? '#F85300' : '#B9B0A6', 'stroke-width': 2.2, 'stroke-dasharray': '9 7', class: 'dm-yuva' }, katYuva);
      var ty = Math.max(16, y - 14);
      P.yazi(katYuva, x + pc.bb[2] / 2, ty, pc.ad, { 'font-size': 15, 'text-anchor': 'middle', fill: on ? '#C54200' : '#7A726B', class: 'dm-yuva' });
    });
  }
  function tepsiCiz() {
    var kalan = d.parcalar.filter(function (pc) { return !S.yer[pc.id] && !pc.gizli; });
    if (!kalan.length) { tepsiEl.innerHTML = ''; return; }
    var sira = siradakiParca();
    tepsiEl.innerHTML = '<span class="dm-tbas">Malzemeler</span>';
    d.parcalar.forEach(function (pc) {
      if (pc.gizli) return;
      var yer = !!S.yer[pc.id];
      var b = dom('<button class="dm-cp' + (yer ? ' yerde' : '') + (pc.id === sira ? ' sira' : '') + '" data-pc="' + pc.id + '"' + (yer ? ' disabled' : '') + '><span>' + h(pc.ad) + '</span></button>');
      if (pc.bb) b.insertBefore(P.kucukResim(function (g, PP) { pc.ciz(g, PP, true, null); }, pc.bb, 42), b.firstChild);
      tepsiEl.appendChild(b);
      if (!yer) suruklemeBagla(b, pc);
    });
    tepsiEl.appendChild(dom('<button class="ab" data-tepsi="kur" style="flex:none;align-self:center">' + ikon('kur') + 'Düzeneği kur</button>'));
  }
  function svgNokta(cx, cy) {
    var m = svg.getScreenCTM();
    if (!m) return { x: W / 2, y: H / 2 };
    var pt = svg.createSVGPoint(); pt.x = cx; pt.y = cy;
    var q = pt.matrixTransform(m.inverse());
    return { x: q.x, y: q.y };
  }
  function suruklemeBagla(b, pc) {
    var aktif = false, x0, y0, oynadi = false, id = null;
    function konum(e) {
      var q = svgNokta(e.clientX, e.clientY), cy = pc.bb ? pc.bb[1] + pc.bb[3] / 2 : -40;
      parcaG[pc.id].setAttribute('transform', 'translate(' + q.x.toFixed(1) + ',' + (q.y - cy).toFixed(1) + ')');
      return { x: q.x, y: q.y - cy };
    }
    b.addEventListener('pointerdown', function (e) {
      if (S.yer[pc.id] || O) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      aktif = true; oynadi = false; x0 = e.clientX; y0 = e.clientY; id = e.pointerId;
      try { b.setPointerCapture(id); } catch (er) {}
      e.preventDefault();
    });
    b.addEventListener('pointermove', function (e) {
      if (!aktif) return;
      if (!oynadi && Math.abs(e.clientX - x0) + Math.abs(e.clientY - y0) > 8) {
        oynadi = true; parcaG[pc.id].style.display = ''; parcaG[pc.id].style.opacity = '0.92';
        katParca.appendChild(parcaG[pc.id]); yuvalarCiz(pc.id);
      }
      if (oynadi) konum(e);
    });
    function birak(e) {
      if (!aktif) return; aktif = false;
      try { b.releasePointerCapture(id); } catch (er) {}
      if (!oynadi) { yerlestir(pc.id, true); return; }
      var q = konum(e), dx = q.x - pc.x, dy = q.y - pc.y;
      parcaG[pc.id].style.opacity = '';
      if (!gerekTamam(pc)) { var g = eksikGerek(pc); geriGonder(pc); ipucu('Önce ' + (g ? g.ad.toLocaleLowerCase('tr') : 'diğer malzemeyi') + ' yerleştir.', true); return; }
      if (Math.sqrt(dx * dx + dy * dy) < (pc.yakalama || 110)) yerlestir(pc.id, false, q);
      else { geriGonder(pc); ipucu(pc.ad + ' için kesikli çizgili yeri hedefle.'); }
    }
    b.addEventListener('pointerup', birak);
    b.addEventListener('pointercancel', function () { if (aktif) { aktif = false; geriGonder(pc); } });
  }
  function geriGonder(pc) { parcaG[pc.id].style.display = 'none'; zSirasi(); yuvalarCiz(); }
  function zSirasi() { d.parcalar.forEach(function (pc) { katParca.appendChild(parcaG[pc.id]); }); }
  var TW = [];
  function tween(sure, f, bitti) { TW.push({ t: 0, s: sure, f: f, b: bitti }); }
  function tweenGuncelle(dt) {
    for (var i = TW.length - 1; i >= 0; i--) {
      var w = TW[i]; w.t += dt; var k = Math.min(1, w.t / w.s), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      w.f(e, k);
      if (k >= 1) { TW.splice(i, 1); if (w.b) w.b(); }
    }
  }
  function yerlestir(id, ucur, nereden) {
    var pc = parcaBul(id); if (!pc || S.yer[id]) return false;
    if (!gerekTamam(pc)) { var g = eksikGerek(pc); ipucu('Önce ' + (g ? g.ad.toLocaleLowerCase('tr') : 'diğer malzemeyi') + ' yerleştir.', true); return false; }
    var gg = parcaG[id], bas = nereden || { x: pc.x + (ucur ? 0 : 0), y: ucur ? H + 120 : pc.y };
    if (ucur && !nereden) {
      var cp = tepsiEl.querySelector('[data-pc="' + id + '"]');
      if (cp) { var r = cp.getBoundingClientRect(), q = svgNokta(r.left + r.width / 2, r.top + r.height / 2); bas = { x: q.x, y: q.y + 60 }; }
    }
    S.yer[id] = true;
    gg.style.display = ''; zSirasi();
    tween(ucur || nereden ? 0.45 : 0.01, function (e) {
      var x = bas.x + (pc.x - bas.x) * e, y = bas.y + (pc.y - bas.y) * e - Math.sin(Math.PI * e) * (ucur ? 40 : 8);
      gg.setAttribute('transform', 'translate(' + x.toFixed(1) + ',' + y.toFixed(1) + ')');
    }, function () { gg.setAttribute('transform', 'translate(' + pc.x + ',' + pc.y + ')'); });
    if (pc.yerlesince) pc.yerlesince(S);
    if (pc.not) S.notEkle(pc.not);
    tepsiCiz(); yuvalarCiz(); kontrolImza = '';
    return true;
  }
  function parcaKaldir(id) {
    if (!S.yer[id]) return;
    S.yer[id] = false;
    if (parcaG[id]) parcaG[id].style.display = 'none';
    var pc = parcaBul(id); if (pc && pc.kalkinca) pc.kalkinca(S);
    tepsiCiz(); yuvalarCiz(); kontrolImza = '';
  }
  function hepsiniKur() {
    var L = [], kalan = d.parcalar.filter(function (pc) { return !S.yer[pc.id]; }), guv = 0;
    while (kalan.length && guv++ < 40) {
      for (var i = 0; i < kalan.length; i++) if (!kalan[i].gerek || kalan[i].gerek.every(function (x) { return S.yer[x] || L.indexOf(x) >= 0; })) { L.push(kalan[i].id); kalan.splice(i, 1); break; }
    }
    L.forEach(function (id, j) { setTimeout(function () { if (S && !S.yer[id]) yerlestir(id, true); }, j * 380); });
  }
  LD.yerlestir = function (id) { return yerlestir(id, true); };

  /* ---------- İpucu ---------- */
  var ipT = 0;
  function ipucu(m, kirmizi) {
    var e = $('.dm-ipucu', deneyEl); if (!e) return;
    e.textContent = m; e.classList.toggle('kirmizi', !!kirmizi); e.classList.add('acik');
    clearTimeout(ipT); ipT = setTimeout(function () { e.classList.remove('acik'); }, 2600);
  }

  /* ---------- Okumalar ---------- */
  var okImza = '';
  function okumaKur() { okImza = ''; okEl.innerHTML = ''; okumaGuncelle(); }
  function okumaGuncelle() {
    var L = d.okumalar ? d.okumalar(S) : [];
    var im = L.map(function (o) { return o.ad + '|' + (o.vurgu ? 1 : 0); }).join(';');
    if (im !== okImza) {
      okImza = im;
      okEl.innerHTML = L.map(function (o, i) { return '<div class="dm-okc' + (o.vurgu ? ' vurgu' : '') + '"><small>' + h(o.ad) + '</small><b data-ok="' + i + '"></b></div>'; }).join('');
    }
    L.forEach(function (o, i) {
      var b = okEl.querySelector('[data-ok="' + i + '"]'), m = h(o.d) + (o.b ? '<span>' + h(o.b) + '</span>' : '');
      if (b && b.getAttribute('data-m') !== m) { b.innerHTML = m; b.setAttribute('data-m', m); }
    });
  }

  /* ---------- Kontroller ---------- */
  var kontrolImza = '', kayAktif = null;
  function kontrolleriGuncelle() {
    var L = d.kontroller ? d.kontroller(S) : [];
    var im = L.map(function (k) { return k.tur + ':' + k.id + ':' + (k.etiket || '') + ':' + (k.pasif ? 1 : 0) + ':' + (k.ana ? 1 : 0) + ':' + (k.secenekler ? k.secenekler.map(function (x) { return x.etiket; }).join(',') : '') + ':' + (k.min === undefined ? '' : k.min + '-' + k.max); }).join('|');
    if (im !== kontrolImza) {
      kontrolImza = im;
      kontrolEl.innerHTML = L.map(function (k, i) {
        if (k.tur === 'dugme') return '<button class="ab' + (k.ana ? ' ana' : '') + (k.on ? ' on' : '') + '" data-k="' + i + '"' + (k.pasif ? ' disabled' : '') + '>' + (k.ikon ? ikon(k.ikon) : '') + h(k.etiket) + '</button>';
        if (k.tur === 'secim') return '<div class="dm-kt"><label>' + h(k.etiket) + '</label><div class="secim">' + k.secenekler.map(function (x, j) { return '<button data-k="' + i + '" data-v="' + j + '"' + (k.pasif ? ' disabled' : '') + '>' + h(x.etiket) + '</button>'; }).join('') + '</div></div>';
        if (k.tur === 'kaydirici') return '<div class="dm-kt dm-kay"><label for="dm-k' + i + '">' + h(k.etiket) + '</label><div class="dm-kay-s"><input id="dm-k' + i + '" type="range" data-k="' + i + '" min="' + k.min + '" max="' + k.max + '" step="' + (k.adim || 1) + '"' + (k.pasif ? ' disabled' : '') + '><output></output></div></div>';
        return '';
      }).join('');
      kontrolEl.style.display = L.length ? '' : 'none';
      kontrolEl._L = L;
      $$('input[type=range]', kontrolEl).forEach(function (inp) {
        inp.addEventListener('input', function () { var k = kontrolEl._L[+inp.getAttribute('data-k')]; if (k && k.degis) { kayAktif = inp; k.degis(S, +inp.value); } });
        inp.addEventListener('change', function () { kayAktif = null; });
        inp.addEventListener('pointerup', function () { kayAktif = null; });
      });
    }
    kontrolEl._L = L;
    L.forEach(function (k, i) {
      if (k.tur === 'kaydirici') {
        var inp = kontrolEl.querySelector('input[data-k="' + i + '"]'); if (!inp) return;
        if (inp !== kayAktif && document.activeElement !== inp && +inp.value !== k.deger) inp.value = k.deger;
        var out = inp.parentNode.querySelector('output'), m = k.bicim ? k.bicim(k.deger) : tr(k.deger, 0) + (k.birim ? ' ' + k.birim : '');
        if (out.textContent !== m) out.textContent = m;
      } else if (k.tur === 'secim') {
        $$('[data-k="' + i + '"]', kontrolEl).forEach(function (b) { b.classList.toggle('on', k.secenekler[+b.getAttribute('data-v')].v === k.deger); });
      } else if (k.tur === 'dugme') {
        var b = kontrolEl.querySelector('button[data-k="' + i + '"]'); if (b) b.classList.toggle('on', !!k.on);
      }
    });
  }
  function kontrolBul(id) { var L = d.kontroller ? d.kontroller(S) : []; for (var i = 0; i < L.length; i++) if (L[i].id === id) return L[i]; return null; }
  if (true) {
    document.addEventListener('click', function (e) {
      if (!kontrolEl || !kontrolEl.contains(e.target)) return;
      var b = e.target.closest('button[data-k]'); if (!b || b.disabled) return;
      var k = kontrolEl._L && kontrolEl._L[+b.getAttribute('data-k')]; if (!k) return;
      if (k.tur === 'dugme' && k.yap) k.yap(S);
      else if (k.tur === 'secim' && k.degis) k.degis(S, k.secenekler[+b.getAttribute('data-v')].v);
      kontrolImza = ''; kontrolleriGuncelle();
    });
  }

  /* ---------- Zaman çubuğu ---------- */
  function zamanCiz() {
    var hz = d.hizlar || [1, 10, 30, 60], ol = d.olcum || {};
    var s = '';
    if (d.zaman !== false) s += '<span class="dm-saat" title="Kronometre">' + sure(S.krono) + '</span><span class="secim" role="group" aria-label="Zaman hızı">' + hz.map(function (x) { return '<button data-hiz="' + x + '" class="' + (S.hiz === x ? 'on' : '') + '">' + x + '×</button>'; }).join('') + '</span>';
    s += '<span class="dm-sag">' + (ol.elle !== false && d.olcum ? '<button class="ab" data-zis="kaydet">' + ikon('kaydet') + (ol.elleEtiket || 'Ölçümü kaydet') + '</button>' : '') +
      (d.olcum && d.coklu !== false ? '<button class="ab" data-zis="yeni">' + ikon('yeni') + (d.yeniEtiket || 'Yeni deneme') + '</button>' : '') + '</span>';
    zamanEl.innerHTML = s;
    zamanEl.style.display = s.replace(/<[^>]+>/g, '').trim() ? '' : 'none';
  }
  function saatGuncelle() { var e = zamanEl && zamanEl.querySelector('.dm-saat'); if (e) { var m = sure(S.krono); if (e.textContent !== m) e.textContent = m; } }

  /* ---------- Adımlar ---------- */
  function adimSu() { var A = d.adimlar || []; for (var i = 0; i < A.length; i++) if (!S.ok[i]) return i; return -1; }
  var adimImza = '';
  function adimlarCiz(zorla) {
    var A = d.adimlar || [], su = adimSu(), im = su + ':' + S.ok.join(',');
    if (im === adimImza && !zorla) return;
    var yeniBitti = su === -1 && !S.bitti && A.length;
    adimImza = im;
    adimEl.innerHTML = A.map(function (a, i) { return '<li class="' + (S.ok[i] ? 'ok' : (i === su ? 'su' : '')) + '"><i>' + (S.ok[i] ? '✓' : (i + 1)) + '</i><span>' + h(a.metin) + '</span></li>'; }).join('');
    $('.dm-adsay', deneyEl).textContent = A.filter(function (a, i) { return S.ok[i]; }).length + ' / ' + A.length;
    var tno = $('.dm-tno', talEl), tmt = $('.dm-tmt', talEl);
    if (su >= 0) { tno.textContent = 'Adım ' + (su + 1) + '/' + A.length; tmt.textContent = A[su].metin; talEl.classList.remove('bitti'); }
    else { tno.textContent = 'Tamam'; tmt.textContent = d.bitisMetni || 'Bütün adımlar tamam. Verilerini incele, sonra Sonuç bölümüne geç.'; talEl.classList.add('bitti'); }
    if (yeniBitti) {
      S.bitti = true;
      kayitYaz(d.id, function (o) { o.bitti = true; });
      S.notEkle('Deneyin bütün adımları tamamlandı.', '', 'on');
      $$('.dm-asama button[data-asama="deney"]', deneyEl).forEach(function (b) { b.classList.add('bitti'); });
    }
    tepsiCiz(); yuvalarCiz();
  }
  function adimKontrol() {
    var A = d.adimlar || [], degisti = false;
    for (var i = 0; i < A.length; i++) {
      if (!S.ok[i]) {
        var t = false;
        try { t = !!A[i].tamam(S); } catch (e) { t = false; }
        if (t) { S.ok[i] = true; degisti = true; }
        else if (!A[i].serbest) break;
      }
    }
    if (degisti) adimlarCiz();
  }

  /* ---------- Gözlem defteri ---------- */
  function defterLi(x) {
    var li = document.createElement('li');
    li.className = x.tur || 'on';
    li.innerHTML = '<time>' + (x.tur === 'kendi' ? 'Notun · ' : '') + sure(x.t) + '</time>' + h(x.metin) + (x.neden ? '<details><summary>Neden?</summary><p>' + h(x.neden) + '</p></details>' : '');
    return li;
  }
  function defterCiz() { defterEl.innerHTML = ''; S.defter.forEach(function (x) { defterEl.appendChild(defterLi(x)); }); defterEl.scrollTop = defterEl.scrollHeight; }
  function defterEkle(x) { if (!defterEl || !S || gorunum !== 'deney') return; defterEl.appendChild(defterLi(x)); defterEl.scrollTop = defterEl.scrollHeight; }

  /* ---------- Ölçüm ve koşular ---------- */
  var veriKirli = true, grafikSecim = 0, grafikSon = 0;
  function kaydet(oto) {
    var ol = d.olcum; if (!ol) return false;
    var satir = ol.satir ? ol.satir(S, oto) : null;
    if (!satir) { if (!oto && ol.uyari) ipucu(ol.uyari(S) || 'Şu an kaydedilecek ölçüm yok.', true); return false; }
    var k = S.kosu();
    if (!k.satirlar.length || !k.ad) { k.ad = d.kosuAd ? d.kosuAd(S) : 'Deneme ' + k.no; if (d.kosuAyar) k.ayar = d.kosuAyar(S); }
    k.satirlar.push(satir);
    S.tk = S.ak; veriKirli = true;
    return true;
  }
  function yeniKosu() {
    var k = S.kosu();
    if (d.yeniKosu) { var izin = d.yeniKosu(S); if (izin === false) return; }
    if (k.satirlar.length) {
      var no = S.kosular.length + 1;
      S.kosular.push({ no: no, ad: '', renk: RENK[(no - 1) % RENK.length], satirlar: [] });
      S.ak = S.kosular.length - 1;
    } else k.ad = '';
    S.tk = S.ak; S.krono = 0; S.kronoCalisiyor = false;
    veriKirli = true; kontrolImza = '';
    S.notEkle('Yeni deneme başladı (' + S.kosular.length + '. deneme).', '', 'on');
  }
  function sutunlar() { return (d.olcum && d.olcum.sutunlar) || []; }
  function deger(satir, c) { return c.hesap ? c.hesap(satir) : satir[c.id]; }
  function bicim(c, v) { if (c.bicim) return c.bicim(v); if (typeof v === 'string') return v; return tr(v, c.ondalik === undefined ? 1 : c.ondalik); }
  function tabloCiz() {
    var C = sutunlar(), K = S.kosular;
    var kosHtml = K.length > 1 || K[0].satirlar.length ? K.map(function (k, i) { return '<button data-kosu="' + i + '" class="' + (i === S.tk ? 'on' : '') + '"><b style="background:' + k.renk + '"></b>' + h(k.ad || ('Deneme ' + k.no)) + (i === S.ak ? ' ·&nbsp;şimdiki' : '') + '</button>'; }).join('') : '';
    $('.dm-kosular', tabloEl).innerHTML = kosHtml;
    var k = K[S.tk] || K[0];
    var s = '<table><thead><tr>' + C.map(function (c) { return '<th>' + h(c.ad) + (c.birim ? ' <small>(' + h(c.birim) + ')</small>' : '') + '</th>'; }).join('') + '</tr></thead><tbody>';
    if (!k.satirlar.length) s += '<tr><td class="dm-bos" colspan="' + C.length + '">' + h((d.olcum && d.olcum.bos) || 'Henüz ölçüm yok. Deneyi başlatınca değerler buraya yazılır.') + '</td></tr>';
    else s += k.satirlar.map(function (r) { return '<tr>' + C.map(function (c) { return '<td>' + h(bicim(c, deger(r, c))) + '</td>'; }).join('') + '</tr>'; }).join('');
    s += '</tbody></table>';
    var sar = $('.dm-tsar', tabloEl); sar.innerHTML = s; sar.scrollTop = sar.scrollHeight;
    var oz = d.olcum && d.olcum.ozet ? d.olcum.ozet(S, k) : '';
    $('.dm-tozet', tabloEl).innerHTML = oz || '';
    var top = K.reduce(function (a, x) { return a + x.satirlar.length; }, 0);
    $('.dm-tbsay', tabloEl).textContent = top ? top + ' ölçüm · ' + K.filter(function (x) { return x.satirlar.length; }).length + ' deneme' : '';
  }
  function tabloMetin() {
    var C = sutunlar(), sat = [];
    S.kosular.forEach(function (k) {
      if (!k.satirlar.length) return;
      sat.push(k.ad || ('Deneme ' + k.no));
      sat.push(C.map(function (c) { return c.ad + (c.birim ? ' (' + c.birim + ')' : ''); }).join('\t'));
      k.satirlar.forEach(function (r) { sat.push(C.map(function (c) { return bicim(c, deger(r, c)); }).join('\t')); });
      sat.push('');
    });
    return sat.join('\n');
  }

  /* ---------- Grafik ---------- */
  function adimBul(aralik, hedef) {
    var ham = aralik / (hedef || 6), us = Math.pow(10, Math.floor(Math.log(ham) / Math.LN10)), m = ham / us;
    return (m < 1.5 ? 1 : m < 3 ? 2 : m < 7 ? 5 : 10) * us;
  }
  function grafikSvg(o) {
    var GW = o.gw || 640, GH = o.gh || 380, ml = 62, mr = 22, mt = 18, mb = 52;
    var xs = [], ys = [];
    o.seriler.forEach(function (s) { s.n.forEach(function (p) { if (isFinite(p[0]) && isFinite(p[1])) { xs.push(p[0]); ys.push(p[1]); } }); });
    (o.ekX || []).forEach(function (x) { xs.push(x); }); (o.ekY || []).forEach(function (y) { ys.push(y); });
    var bos = !o.seriler.some(function (s) { return s.n.length; });
    if (bos && o.bos) { xs = [o.bos.x[0], o.bos.x[1]]; ys = [o.bos.y[0], o.bos.y[1]]; }
    var x0 = o.xMin !== undefined ? o.xMin : (xs.length ? Math.min.apply(null, xs) : 0), x1 = o.xMax !== undefined ? o.xMax : (xs.length ? Math.max.apply(null, xs) : 10);
    var y0 = o.yMin !== undefined ? o.yMin : (ys.length ? Math.min.apply(null, ys) : 0), y1 = o.yMax !== undefined ? o.yMax : (ys.length ? Math.max.apply(null, ys) : 10);
    if (o.sifirX && x0 > 0) x0 = 0; if (o.sifirY && y0 > 0) y0 = 0;
    if (x1 - x0 < 1e-9) { x1 = x0 + 1; x0 -= 1; } if (y1 - y0 < 1e-9) { y1 = y0 + 1; y0 -= 1; }
    var ax = adimBul(x1 - x0, o.xBol || 6), ay = adimBul(y1 - y0, o.yBol || 5);
    if (o.xMin === undefined) x0 = Math.floor(x0 / ax + 1e-9) * ax; if (o.xMax === undefined) x1 = Math.ceil(x1 / ax - 1e-9) * ax;
    if (o.yMin === undefined) y0 = Math.floor(y0 / ay + 1e-9) * ay; if (o.yMax === undefined) y1 = Math.ceil(y1 / ay - 1e-9) * ay;
    if (o.yPay && o.yMax === undefined) y1 += ay * o.yPay;
    var pw = GW - ml - mr, ph = GH - mt - mb;
    function X(x) { return ml + (x - x0) / (x1 - x0) * pw; }
    function Y(y) { return mt + ph - (y - y0) / (y1 - y0) * ph; }
    var s = '<svg viewBox="0 0 ' + GW + ' ' + GH + '" role="img" aria-label="' + h(o.yEt + ' – ' + o.xEt + ' grafiği') + '">';
    var dx = ax < 1 ? Math.max(0, -Math.floor(Math.log(ax) / Math.LN10 + 1e-9)) : 0, dy = ay < 1 ? Math.max(0, -Math.floor(Math.log(ay) / Math.LN10 + 1e-9)) : 0;
    for (var gx = Math.ceil(x0 / ax - 1e-9) * ax; gx <= x1 + ax * 1e-6; gx += ax) {
      s += '<line x1="' + X(gx).toFixed(1) + '" y1="' + mt + '" x2="' + X(gx).toFixed(1) + '" y2="' + (mt + ph) + '" stroke="#EFE8E1"/>';
      s += '<text x="' + X(gx).toFixed(1) + '" y="' + (mt + ph + 18) + '" text-anchor="middle">' + tr(gx, dx) + '</text>';
    }
    for (var gy = Math.ceil(y0 / ay - 1e-9) * ay; gy <= y1 + ay * 1e-6; gy += ay) {
      s += '<line x1="' + ml + '" y1="' + Y(gy).toFixed(1) + '" x2="' + (ml + pw) + '" y2="' + Y(gy).toFixed(1) + '" stroke="#EFE8E1"/>';
      s += '<text x="' + (ml - 8) + '" y="' + (Y(gy) + 4.5).toFixed(1) + '" text-anchor="end">' + tr(gy, dy) + '</text>';
    }
    /* sıfır çizgileri */
    if (x0 < 0 && x1 > 0) s += '<line x1="' + X(0).toFixed(1) + '" y1="' + mt + '" x2="' + X(0).toFixed(1) + '" y2="' + (mt + ph) + '" stroke="#CFC6BC" stroke-width="1.2"/>';
    if (y0 < 0 && y1 > 0) s += '<line x1="' + ml + '" y1="' + Y(0).toFixed(1) + '" x2="' + (ml + pw) + '" y2="' + Y(0).toFixed(1) + '" stroke="#CFC6BC" stroke-width="1.2"/>';
    /* eksenler: ok uçları sabit üçgenlerle */
    s += '<line x1="' + ml + '" y1="' + (mt + ph) + '" x2="' + (ml + pw + 10) + '" y2="' + (mt + ph) + '" stroke="#14110F" stroke-width="1.6"/>';
    s += '<path d="M' + (ml + pw + 16) + ' ' + (mt + ph) + ' l-10 -5 l0 10 z" fill="#14110F"/>';
    s += '<line x1="' + ml + '" y1="' + (mt + ph) + '" x2="' + ml + '" y2="' + (mt - 8) + '" stroke="#14110F" stroke-width="1.6"/>';
    s += '<path d="M' + ml + ' ' + (mt - 14) + ' l-5 10 l10 0 z" fill="#14110F"/>';
    s += '<text class="dm-get" x="' + (ml + pw / 2) + '" y="' + (GH - 10) + '" text-anchor="middle">' + h(o.xEt) + '</text>';
    s += '<text class="dm-get" transform="translate(16 ' + (mt + ph / 2) + ') rotate(-90)" text-anchor="middle">' + h(o.yEt) + '</text>';
    s += '<clipPath id="dm-gkirp"><rect x="' + ml + '" y="' + (mt - 2) + '" width="' + pw + '" height="' + (ph + 4) + '"/></clipPath><g clip-path="url(#dm-gkirp)">';
    (o.dogrular || []).forEach(function (L) {
      s += '<line x1="' + X(L.x1).toFixed(1) + '" y1="' + Y(L.y1).toFixed(1) + '" x2="' + X(L.x2).toFixed(1) + '" y2="' + Y(L.y2).toFixed(1) + '" stroke="' + (L.renk || '#14110F') + '" stroke-width="' + (L.kalin || 1.8) + '"' + (L.kesik ? ' stroke-dasharray="7 6"' : '') + ' opacity="' + (L.opak || 0.9) + '"/>';
    });
    o.seriler.forEach(function (sr) {
      var n = sr.n.filter(function (p) { return isFinite(p[0]) && isFinite(p[1]); });
      if (!n.length) return;
      if (sr.cizgi !== false && n.length > 1) s += '<polyline fill="none" stroke="' + sr.renk + '" stroke-width="' + (sr.kalin || 2.6) + '" stroke-linejoin="round" stroke-linecap="round"' + (sr.kesik ? ' stroke-dasharray="6 6"' : '') + ' points="' + n.map(function (p) { return X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1); }).join(' ') + '"/>';
      if (sr.nokta !== false && n.length <= 80) n.forEach(function (p) { s += '<circle cx="' + X(p[0]).toFixed(1) + '" cy="' + Y(p[1]).toFixed(1) + '" r="' + (sr.r || 4) + '" fill="#fff" stroke="' + sr.renk + '" stroke-width="2.2"/>'; });
    });
    s += '</g>';
    var IS = [];
    (o.isaretler || []).forEach(function (m) {
      if (m.x < x0 || m.x > x1 || m.y < y0 || m.y > y1) return;
      var px = X(m.x) + (m.dx === undefined ? 6 : m.dx), py = Y(m.y) + (m.dy === undefined ? -6 : m.dy), yon = m.yon || 'start';
      if (yon === 'start' && px > ml + pw - 62) { yon = 'end'; px = X(m.x) - 4; }
      IS.push({ px: px, py: py, yon: yon, m: m });
    });
    IS.sort(function (a, b) { return a.py - b.py; });
    for (var ii = 1; ii < IS.length; ii++) for (var jj = 0; jj < ii; jj++) if (Math.abs(IS[ii].px - IS[jj].px) < 96 && IS[ii].py - IS[jj].py < 15) IS[ii].py = IS[jj].py + 15;
    IS.forEach(function (q) {
      s += '<text x="' + q.px.toFixed(1) + '" y="' + q.py.toFixed(1) + '" text-anchor="' + q.yon + '" style="font-weight:700;fill:' + (q.m.renk || '#14110F') + ';paint-order:stroke;stroke:#fff;stroke-width:3px">' + h(q.m.metin) + '</text>';
    });
    if (bos) s += '<text class="dm-gbos" x="' + (ml + pw / 2) + '" y="' + (mt + ph / 2) + '" text-anchor="middle">' + h(o.bosMetin || 'Ölçüm kaydettikçe noktalar burada belirir.') + '</text>';
    s += '</svg>';
    return s;
  }
  LD.grafikSvg = grafikSvg;
  function egimHesap(n, orijin) {
    var N = n.length; if (N < 2) return null;
    var sx = 0, sy = 0, sxx = 0, sxy = 0;
    n.forEach(function (p) { sx += p[0]; sy += p[1]; sxx += p[0] * p[0]; sxy += p[0] * p[1]; });
    if (orijin) return sxx > 0 ? { m: sxy / sxx, b: 0 } : null;
    var dd = N * sxx - sx * sx; if (Math.abs(dd) < 1e-12) return null;
    var m = (N * sxy - sx * sy) / dd; return { m: m, b: (sy - m * sx) / N };
  }
  LD.egim = egimHesap;
  function grafikVeri(gs) {
    if (gs.seriYap) return gs.seriYap(S) || [];
    var C = {}; sutunlar().forEach(function (c) { C[c.id] = c; });
    var seriler = [];
    S.kosular.forEach(function (k) {
      if (!k.satirlar.length) return;
      if (gs.kosuSec && !gs.kosuSec(k)) return;
      var n = k.satirlar.map(function (r) { var x = C[gs.x] ? deger(r, C[gs.x]) : r[gs.x], y = C[gs.y] ? deger(r, C[gs.y]) : r[gs.y]; return [gs.xd ? gs.xd(x) : x, gs.yd ? gs.yd(y) : y]; });
      if (gs.sirala) n.sort(function (a, b) { return a[0] - b[0]; });
      seriler.push({ ad: k.ad || ('Deneme ' + k.no), renk: k.renk, n: n, cizgi: gs.cizgi, nokta: gs.nokta, kosu: k });
    });
    return seriler;
  }
  function grafikCiz() {
    var G = (d.olcum && d.olcum.grafikler) || [];
    if (!G.length) { grafikEl.style.display = 'none'; return; }
    grafikEl.style.display = '';
    if (grafikSecim >= G.length) grafikSecim = 0;
    var gs = G[grafikSecim];
    $('.dm-gsec', grafikEl).innerHTML = G.length > 1 ? G.map(function (g, i) { return '<button data-gsec="' + i + '" class="' + (i === grafikSecim ? 'on' : '') + '">' + h(g.ad) + '</button>'; }).join('') : '';
    var seriler = grafikVeri(gs), o = kopya(gs);
    o.seriler = seriler; o.dogrular = []; o.isaretler = [];
    if (gs.ekle) gs.ekle(S, o, seriler);
    $('.dm-gkap', grafikEl).innerHTML = grafikSvg(o);
    $('.dm-gal', grafikEl).innerHTML = seriler.map(function (s) { return '<span><b style="background:' + s.renk + '"></b>' + h(s.ad) + '</span>'; }).join('') + (o.lejant || []).map(function (l) { return '<span><b style="background:' + l.renk + (l.kesik ? ';background:repeating-linear-gradient(90deg,' + l.renk + ' 0 5px,transparent 5px 9px)' : '') + '"></b>' + h(l.ad) + '</span>'; }).join('');
    var nt = $('.dm-gnot', grafikEl), not = gs.not ? gs.not(S, seriler) : '';
    nt.hidden = !not; nt.innerHTML = not || '';
  }
  LD.grafikVeri = function (gs) { return grafikVeri(gs); };

  /* ================= ANA DÖNGÜ ================= */
  var raf = 0, son = 0, uiSon = 0;
  function donguBaslat() { if (!raf) { son = 0; raf = requestAnimationFrame(dongu); } }
  function dongu(ts) {
    raf = 0;
    if (!S || gorunum !== 'deney' || !modDeney()) return;
    var dtR = son ? Math.min(0.1, (ts - son) / 1000) : 0.016; son = ts;
    tweenGuncelle(dtR);
    var dtS = 0;
    if (S.asama === 'deney' || O) {
      dtS = dtR * S.hiz;
      var n = Math.max(1, Math.ceil(dtS / (d.maxAdim || 0.25)));
      for (var i = 0; i < n; i++) fizikAdim(dtS / n);
    }
    if (d.goster) d.goster(S, dtR, dtS);
    if (ts - uiSon > 110) {
      uiSon = ts;
      okumaGuncelle(); kontrolleriGuncelle(); adimKontrol(); saatGuncelle();
      if (veriKirli) { veriKirli = false; tabloCiz(); grafikCiz(); grafikSon = ts; }
    }
    otoGuncelle(dtR);
    raf = requestAnimationFrame(dongu);
  }
  function fizikAdim(dt) {
    if (d.fizik) d.fizik(S, dt);
    S.t += dt;
    if (S.kronoCalisiyor) {
      var once = S.krono; S.krono += dt;
      var a = d.olcum && d.olcum.oto;
      if (a && Math.floor(once / a + 1e-9) < Math.floor(S.krono / a + 1e-9)) { var t0 = S.krono; S.krono = Math.floor(S.krono / a + 1e-9) * a; kaydet(true); S.krono = t0; }
    }
  }

  /* ================= OTOMATİK OYNAT ================= */
  var O = null;
  function otoBaslat() {
    if (!S) return;
    if (S.asama !== 'deney') asamaAc('deney');
    O = { i: adimSu(), k: 0, bek: null, dur: false, ara: 0.6 };
    if (O.i < 0) { O = null; ipucu('Bütün adımlar zaten tamam.'); return; }
    if (S.hiz < (d.otoHiz || 30)) { S.hiz = d.otoHiz || 30; zamanCiz(); }
    oynaticiCiz();
    var b = $('[data-is="oto"]', deneyEl); if (b) b.innerHTML = ikon('dur') + '<span>Durdur</span>';
  }
  function otoDur() {
    if (!O) return;
    O = null;
    var e = $('.dm-oyn', deneyEl); if (e) e.hidden = true;
    var b = $('[data-is="oto"]', deneyEl); if (b) b.innerHTML = ikon('oynat') + '<span>Otomatik oynat</span>';
  }
  function oynaticiCiz() {
    var e = $('.dm-oyn', deneyEl); if (!e) return;
    if (!O) { e.hidden = true; return; }
    e.hidden = false;
    var A = d.adimlar || [];
    e.innerHTML = '<span class="dm-oyn-y">Otomatik oynatılıyor · Adım ' + (Math.max(0, O.i) + 1) + '/' + A.length + (O.dur ? ' · duraklatıldı' : '') + '</span>' +
      '<button class="ab" data-oyn="dur">' + ikon(O.dur ? 'oynat' : 'duraklat') + (O.dur ? 'Sürdür' : 'Duraklat') + '</button><button class="ab" data-oyn="atla">' + ikon('atla') + 'Adımı atla</button><button class="ab" data-oyn="bitir">' + ikon('dur') + 'Durdur</button>';
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-oyn]'); if (!b || !O) return;
    var x = b.getAttribute('data-oyn');
    if (x === 'dur') { O.dur = !O.dur; oynaticiCiz(); }
    else if (x === 'atla') { otoAtla(); }
    else otoDur();
  });
  function otoAtla() {
    if (!O) return;
    var A = d.adimlar || [], a = A[O.i];
    if (a) { S.ok[O.i] = true; adimlarCiz(); }
    O.i = adimSu(); O.k = 0; O.bek = null; O.ara = 0.4;
    if (O.i < 0) otoBitti(); else oynaticiCiz();
  }
  function otoBitti() { otoDur(); ipucu('Otomatik oynatma bitti. Sonuç bölümüne geçebilirsin.'); }
  function otoGuncelle(dt) {
    if (!O || O.dur) return;
    if (O.ara > 0) { O.ara -= dt; return; }
    var A = d.adimlar || [], a = A[O.i];
    if (!a) { O.i = adimSu(); if (O.i < 0) { otoBitti(); return; } a = A[O.i]; O.k = 0; oynaticiCiz(); }
    if (O.bek) {
      var bk = O.bek;
      if (bk.ms !== undefined) { bk.ms -= dt * 1000; if (bk.ms > 0) return; }
      else if (bk.f) { bk.zaman += dt; var ok = false; try { ok = bk.f(S); } catch (er) { ok = true; } if (!ok && bk.zaman < (bk.azami || 240)) return; }
      O.bek = null;
    }
    var K = a.oto || (a.parca ? [['yer', a.parca]] : []);
    if (O.k < K.length) {
      var c = K[O.k++];
      komut(c);
      O.ara = c[0] === 'bekle' ? 0 : 0.55;
      return;
    }
    /* adımın komutları bitti: tamam olmasını bekle */
    var tamam = false; try { tamam = !!a.tamam(S); } catch (er) { tamam = true; }
    if (!tamam) { O.bekTamam = (O.bekTamam || 0) + dt; if (O.bekTamam < 6) return; S.ok[O.i] = true; adimlarCiz(); }
    else if (!S.ok[O.i]) { S.ok[O.i] = true; adimlarCiz(); }
    O.bekTamam = 0;
    O.i = adimSu(); O.k = 0; O.ara = 0.9;
    if (O.i < 0) otoBitti(); else oynaticiCiz();
  }
  function komut(c) {
    var tur = c[0];
    if (tur === 'yer') yerlestir(c[1], true);
    else if (tur === 'eylem') { if (d.eylem && d.eylem[c[1]]) d.eylem[c[1]](S, c[2]); kontrolImza = ''; }
    else if (tur === 'sec') { var k = kontrolBul(c[1]); if (k && k.degis) k.degis(S, c[2]); kontrolImza = ''; }
    else if (tur === 'ayar') {
      var kk = kontrolBul(c[1]); if (!kk) return;
      var v0 = kk.deger, v1 = c[2];
      tween((c[3] || 1200) / 1000, function (e) { var k2 = kontrolBul(c[1]); if (k2 && k2.degis) k2.degis(S, v0 + (v1 - v0) * e); });
      O.bek = { ms: (c[3] || 1200) + 150 };
    }
    else if (tur === 'bekle') { if (typeof c[1] === 'number') O.bek = { ms: c[1] }; else O.bek = { f: c[1], zaman: 0, azami: c[2] }; }
    else if (tur === 'kaydet') kaydet();
    else if (tur === 'hiz') { S.hiz = c[1]; zamanCiz(); }
    else if (tur === 'yeni') yeniKosu();
    else if (tur === 'ipucu') ipucu(c[1]);
  }

  /* ================= ÖĞRETMEN MODU ================= */
  function sunumda() { return deneyEl.classList.contains('dm-sunum'); }
  function sunumAc() {
    deneyEl.classList.add('dm-sunum'); document.documentElement.classList.add('dm-sunum-acik');
    var b = $('[data-is="sunum"]', deneyEl); if (b) b.innerHTML = ikon('cik') + '<span>Öğretmen modundan çık</span>';
    try { var r = document.documentElement; if (r.requestFullscreen) r.requestFullscreen().catch(function () {}); else if (r.webkitRequestFullscreen) r.webkitRequestFullscreen(); } catch (e) {}
    if (S && S.asama === 'hazirlik') asamaAc('tahmin');
  }
  function sunumKapat() {
    if (!sunumda()) return;
    deneyEl.classList.remove('dm-sunum'); document.documentElement.classList.remove('dm-sunum-acik');
    var b = $('[data-is="sunum"]', deneyEl); if (b) b.innerHTML = ikon('sunum') + '<span>Öğretmen modu</span>';
    try { if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {}); else if (document.webkitFullscreenElement && document.webkitExitFullscreen) document.webkitExitFullscreen(); } catch (e) {}
  }
  document.addEventListener('keydown', function (e) {
    if (!S || gorunum !== 'deney' || !modDeney()) return;
    var t = e.target, k = e.key;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
    if (t && t.tagName === 'BUTTON' && (k === ' ' || k === 'Spacebar' || k === 'Enter')) return;
    if (k === 'Escape' && sunumda()) { sunumKapat(); return; }
    if (!sunumda()) return;
    var sira = ['hazirlik', 'tahmin', 'deney', 'sonuc'], i = sira.indexOf(S.asama);
    if (k === ' ' || k === 'Spacebar') { e.preventDefault(); if (S.asama !== 'deney') asamaAc('deney'); if (!O) otoBaslat(); else { O.dur = !O.dur; oynaticiCiz(); } }
    else if (k === 'ArrowRight' || k === 'PageDown') { e.preventDefault(); if (O) otoAtla(); else if (i < 3) asamaAc(sira[i + 1]); }
    else if (k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); if (i > 0) asamaAc(sira[i - 1]); }
  });
  document.addEventListener('fullscreenchange', function () { if (!document.fullscreenElement && sunumda()) { /* tam ekrandan çıkılsa da öğretmen modu sürer */ } });

  /* ================= SONUÇ ================= */
  function sonucCiz() {
    var p = $('[data-p="sonuc"]', deneyEl);
    var L = d.tahminler || [];
    var s = '<div class="dm-sn">';
    if (L.length) {
      s += '<div class="kart dm-kutu"><h3>Tahmin ve gözlem</h3><div class="dm-tg">' + L.map(function (t) {
        var sec = S.tahmin[t.id], dog = typeof t.dogru === 'function' ? t.dogru(S) : t.dogru, gz = t.gozlem ? t.gozlem(S) : '';
        var ok = sec !== undefined && dog !== undefined && dog !== null && sec === dog;
        return '<div class="dm-tgk ' + (sec === undefined ? '' : (ok ? 'iyi' : 'kotu')) + '"><small>' + h(t.soru) + '</small>' +
          '<p><b>Tahminin:</b> ' + (sec === undefined ? 'Tahmin yapmadın.' : h(t.secenekler[sec])) + '</p>' +
          (dog !== undefined && dog !== null ? '<p><b>Gözlenen:</b> ' + h(t.secenekler[dog]) + (gz ? ' · ' + h(gz) : '') + '</p>' : (gz ? '<p><b>Gözlenen:</b> ' + h(gz) + '</p>' : '')) +
          (sec !== undefined && dog !== undefined && dog !== null ? '<p>' + (ok ? 'Tahminin gözlemle uyuştu.' : 'Tahminin gözlemle uyuşmadı; açıklamayı oku ve nedenini düşün.') + '</p>' : '') + '</div>';
      }).join('') + '</div>' + (S.gerekce ? '<p style="margin-top:10px;color:var(--tx2)"><b>Gerekçen:</b> ' + h(S.gerekce) + '</p>' : '') + '</div>';
    }
    var oz = d.ozet ? d.ozet(S) : '';
    s += '<div class="kart dm-kutu"><h3>Verilerin ne söylüyor?</h3>' + (oz || '<p>Henüz yeterli ölçüm yok. Deney bölümünde ölçüm yaptıkça burada kendi verilerinden çıkarılan sonuçlar görünür.</p>') + '</div>';
    s += '<div class="kart dm-kutu"><h3>Neden böyle olur?</h3><div class="dm-neden">' + (d.neden || '') + '</div>' + (d.hayat ? '<h3 style="margin-top:12px">Günlük hayatta</h3><div class="dm-neden">' + d.hayat + '</div>' : '') + '</div>';
    if (d.sorular && d.sorular.length) {
      s += '<div class="kart dm-kutu"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px"><h3 style="margin:0">Bağlam temelli sorular</h3><span class="dm-puan" hidden></span></div>' +
        d.sorular.map(function (q, i) {
          var sec = S.soru[i];
          return '<div class="dm-soru" data-sq="' + i + '"><span class="dm-stur">' + h(q.tur || 'Bağlam temelli') + '</span><h4>' + (i + 1) + '. ' + h(q.kok) + '</h4><div class="dm-sec">' +
            q.secenekler.map(function (x, j) {
              var c = sec === undefined ? '' : (j === q.dogru ? 'dogru' : (j === sec ? 'yanlis' : ''));
              return '<button data-sqs="' + j + '" class="' + c + '"' + (sec !== undefined ? ' disabled' : '') + '><i>' + 'ABCDE'.charAt(j) + '</i><span>' + h(x) + '</span></button>';
            }).join('') + '</div>' + (sec !== undefined ? '<div class="dm-acik"><b>' + (sec === q.dogru ? 'Doğru.' : 'Doğru cevap ' + 'ABCDE'.charAt(q.dogru) + '.') + '</b> ' + h(q.aciklama) + '</div>' : '') + '</div>';
        }).join('') + '</div>';
    }
    var sonraki = D[(D.indexOf(d) + 1) % D.length];
    s += '</div><div class="dm-ileri"><button class="ab" data-git="deney">' + ikon('geri') + 'Deneye dön</button><button class="ab" data-is="yazdir">' + ikon('yazdir') + 'Çalışma kâğıdı</button>' +
      (sonraki && sonraki !== d ? '<button class="ab ana" data-sonraki="' + sonraki.id + '">Sonraki deney: ' + h(sonraki.ad) + ikon('ok') + '</button>' : '') + '</div>';
    p.innerHTML = s;
    puanYaz();
  }
  function puanYaz() {
    var e = $('.dm-puan', deneyEl); if (!e || !d.sorular) return;
    var n = 0, dog = 0;
    d.sorular.forEach(function (q, i) { if (S.soru[i] !== undefined) { n++; if (S.soru[i] === q.dogru) dog++; } });
    e.hidden = !n; e.textContent = dog + ' / ' + d.sorular.length + ' doğru';
  }
  deneyEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-sqs]');
    if (b && !b.disabled) {
      var q = b.closest('[data-sq]'), i = +q.getAttribute('data-sq'), j = +b.getAttribute('data-sqs');
      S.soru[i] = j; kayitYaz(d.id, function (o) { o.soru = S.soru; });
      var y = window.pageYOffset; sonucCiz(); window.scrollTo(0, y);
      return;
    }
    var sn = e.target.closest('[data-sonraki]');
    if (sn) deneyAc(sn.getAttribute('data-sonraki'));
  });

  /* ================= ÇALIŞMA KÂĞIDI ================= */
  function yazdir() {
    var ayar = window.LAB_AYAR || {}, marka = ayar.marka || 'Sanal Laboratuvar';
    var bugun = new Date(), tarih = bugun.getDate() + '.' + (bugun.getMonth() + 1) + '.' + bugun.getFullYear();
    var C = sutunlar();
    var s = '<div class="bb-ust"><b>' + h(marka) + ' · Sanal Laboratuvar · Deney masası</b><span>Çalışma kâğıdı</span></div>' +
      '<h1>' + h(d.ad) + '</h1><div class="bb-etk">' + d.sinif + '. sınıf · ' + h(d.konu) + (d.cikti ? ' · Öğrenme çıktısı: ' + (d.cikti.kod ? h(d.cikti.kod) + ' ' : '') + h(d.cikti.metin) : '') + '</div>' +
      '<div class="bb-kim"><div>Ad Soyad</div><div>Sınıf / No</div><div>Tarih</div></div>' +
      '<h2>Amaç</h2><p>' + h(d.amac) + '</p>';
    if (d.degiskenler) s += '<div class="bb-blok"><h2>Değişkenleri belirle</h2><table><tr><th style="width:30%">Bağımsız değişken</th><td></td></tr><tr><th>Bağımlı değişken</th><td></td></tr><tr><th>Kontrol değişkenleri</th><td></td></tr></table></div>';
    s += '<h2>Malzemeler</h2><p>' + (d.malzemeler || []).map(function (m) { return h(m.ad); }).join(', ') + '</p>';
    if (d.tahminler && d.tahminler.length) {
      s += '<div class="bb-blok"><h2>Tahminim</h2>' + d.tahminler.map(function (t, i) {
        return '<p><b>' + (i + 1) + '.</b> ' + h(t.soru) + '</p>' + t.secenekler.map(function (x, j) { return '<div class="bb-sec">○ ' + 'ABCDE'.charAt(j) + ') ' + h(x) + '</div>'; }).join('');
      }).join('') + '<p style="margin-top:6pt">Gerekçem:</p><div class="bb-cizgi"></div><div class="bb-cizgi"></div></div>';
    }
    if (C.length) {
      var dolu = S.kosular.filter(function (k) { return k.satirlar.length; });
      s += '<div class="bb-blok"><h2>Ölçümlerim</h2>';
      if (dolu.length) dolu.forEach(function (k) {
        s += '<p style="margin:4pt 0 2pt"><b>' + h(k.ad || ('Deneme ' + k.no)) + '</b></p><table><tr>' + C.map(function (c) { return '<th>' + h(c.ad) + (c.birim ? ' (' + h(c.birim) + ')' : '') + '</th>'; }).join('') + '</tr>' +
          k.satirlar.slice(0, 16).map(function (r) { return '<tr>' + C.map(function (c) { return '<td>' + h(bicim(c, deger(r, c))) + '</td>'; }).join('') + '</tr>'; }).join('') + '</table>';
      });
      else {
        s += '<table><tr>' + C.map(function (c) { return '<th>' + h(c.ad) + (c.birim ? ' (' + h(c.birim) + ')' : '') + '</th>'; }).join('') + '</tr>';
        for (var i = 0; i < 8; i++) s += '<tr>' + C.map(function () { return '<td></td>'; }).join('') + '</tr>';
        s += '</table>';
      }
      s += '</div>';
    }
    var G = (d.olcum && d.olcum.grafikler) || [];
    if (G.length) {
      var gs = G[grafikSecim] || G[0], seriler = grafikVeri(gs), o = kopya(gs);
      o.seriler = seriler; o.dogrular = []; o.isaretler = [];
      if (gs.ekle) gs.ekle(S, o, seriler);
      if (!seriler.length) o.bosMetin = 'Grafiğini buraya çiz.';
      s += '<div class="bb-blok"><h2>Grafik: ' + h(gs.ad) + '</h2>' + grafikSvg(o).replace('<svg ', '<svg style="max-height:85mm" ') + '</div>';
    }
    s += '<div class="bb-blok"><h2>Sonuç ve yorum</h2><div class="bb-cizgi"></div><div class="bb-cizgi"></div><div class="bb-cizgi"></div></div>';
    if (d.sorular && d.sorular.length) {
      s += '<div class="bb-blok"><h2>Sorular</h2>' + d.sorular.map(function (q, i) {
        return '<div class="bb-blok" style="margin-bottom:6pt"><p><b>' + (i + 1) + '.</b> ' + h(q.kok) + '</p>' + q.secenekler.map(function (x, j) { return '<div class="bb-sec">' + 'ABCDE'.charAt(j) + ') ' + h(x) + '</div>'; }).join('') + '</div>';
      }).join('') + '</div>';
    }
    s += '<div class="bb-alt">' + h(marka) + ' · ' + tarih + ' · Bu çalışma kâğıdı sanal laboratuvar benzetimiyle kullanılmak üzere hazırlanmıştır; gerçek deneyler öğretmen gözetiminde yapılmalıdır.</div>';
    var e = document.getElementById('dm-baski');
    if (!e) { e = document.createElement('div'); e.id = 'dm-baski'; document.body.appendChild(e); }
    e.innerHTML = s;
    document.documentElement.classList.add('dm-yazdir');
    var kaldir = function () { document.documentElement.classList.remove('dm-yazdir'); window.removeEventListener('afterprint', kaldir); };
    window.addEventListener('afterprint', kaldir);
    setTimeout(function () { try { window.print(); } catch (er) { ipucu('Bu tarayıcı yazdırmayı desteklemiyor.', true); } }, 60);
  }

  /* ================= BAŞLANGIÇ (bağlantıyla açılış) ================= */
  function hashIsle() {
    var hs = (location.hash || '').replace('#', '');
    if (hs.indexOf('deney') !== 0) return;
    LA.modAc('deney');
    var id = hs.indexOf('deney-') === 0 ? hs.slice(6) : '';
    if (id && DI[id]) deneyAc(id); else katalogGoster();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hashIsle); else setTimeout(hashIsle, 0);
})();
