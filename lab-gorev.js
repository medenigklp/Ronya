/* Sanal Laboratuvar · görevler (lab-gorev.js)
   Adım adım ilerleyen, sahnede yeşil okla yönlendiren, ara sorular ve keşif kartları olan
   görevler. lab-arayuz.js ve lab-3d.js'ten sonra yüklenir; 3D yoksa yalnızca bilgi gösterir. */
(function () {
  'use strict';
  var LA = window.LabArayuz, M = window.LabMotor;
  if (!LA || !M) return;
  var Y = M.yaz, h = LA.h, UC = null, T = null, KAT = M.KAT;
  var simdi = function () { return (window.performance && performance.now) ? performance.now() : Date.now(); };
  var DEPO = 'lab-gorev-1';
  function depoOku() { try { return JSON.parse(localStorage.getItem(DEPO) || '{}') || {}; } catch (e) { return {}; } }
  function depoYaz(d) { try { localStorage.setItem(DEPO, JSON.stringify(d)); } catch (e) {} }

  /* ================= SEKME, LİSTE, BAŞLIK KARTI ================= */
  var nav = document.querySelector('.lab-sekme'), serbest = document.getElementById('m-serbest');
  if (!nav || !serbest) return;
  var sekB = document.createElement('button'); sekB.setAttribute('data-mod', 'gorevler'); sekB.textContent = 'Görevler';
  nav.insertBefore(sekB, nav.children[1]);
  var bolum = document.createElement('section'); bolum.className = 'mod'; bolum.id = 'm-gorevler';
  serbest.parentNode.insertBefore(bolum, serbest.nextSibling);
  sekB.addEventListener('click', function () { LA.modAc('gorevler'); listeCiz(); });
  var bas = document.createElement('div'); bas.className = 'kart gv-bas'; bas.id = 'lb-gorev'; bas.hidden = true;
  var sol = serbest.querySelector('.sb-sol'); sol.insertBefore(bas, sol.querySelector('.tezgah-kart'));
  var tezgahEl = serbest.querySelector('.tezgah');

  var GOREV = [
    { id: 'alev', ad: 'Alev testi', ikon: '🔥', renk: '#FDEBE2', konu: 'Atom modelleri · 9. sınıf', ozet: 'Beki yak, alevi maviye ayarla, metal iyonlarını alev renginden tanı ve bilinmeyen X örneğini bul.', kur: alevKur },
    { id: 'belirti', ad: 'Tepkime belirtileri', ikon: '🫧', renk: '#E4F0F8', konu: 'Kimyasal değişimler · 10. sınıf', ozet: 'Gaz çıkışını, renk değişimini, çökeleği ve sıcaklık değişimini kendi elinle gözle.', kur: belirtiKur },
    { id: 'asitbaz', ad: 'Asitler ve bazlar', ikon: '🌈', renk: '#F1E6FA', konu: 'Asitler, bazlar ve tuzlar · 10. sınıf', ozet: 'Evdeki maddelerin pH’ını evrensel göstergeyle bul, sonra büretle nötralleştir.', kur: asitBazKur },
    { id: 'grup1', ad: 'Alkali metaller ve su', ikon: '💥', renk: '#FFF3D9', konu: 'Periyodik sistem · 9. sınıf', ozet: 'Li, Na ve K’yi suya at; grupta aşağı inildikçe aktifliğin nasıl arttığını gör.', kur: grup1Kur },
    { id: 'iletken', ad: 'Çözeltilerde iletkenlik', ikon: '💡', renk: '#FFF7CC', konu: 'Elektrolitler · 9.–10. sınıf', ozet: 'Elektrotları çözeltilere daldır; ampulün parlaklığından elektrolitleri ayırt et.', kur: iletkenKur },
    { id: 'atom', ad: 'Atom kur', ikon: '⚛️', renk: '#E5F3EC', konu: 'Atomun yapısı · 9. sınıf', ozet: 'Proton, nötron ve elektron ekle; elementin kimliğini, kütle numarasını ve iyonları keşfet.', kur: atomKur },
    { id: 'ayirma', ad: 'Karışımları ayırma', ikon: '🧲', renk: '#EDF1F5', konu: 'Karışımlar · 10. sınıf', ozet: 'Tuz, kum ve demir tozu karışımını mıknatıs, süzme ve buharlaştırmayla ayır.', kur: ayirmaKur },
    { id: 'yakma', ad: 'Yakma ve oksitler', ikon: '✨', renk: '#FFF0E0', konu: 'Asitler, bazlar ve tuzlar · 10. sınıf', ozet: 'Magnezyumu ve kükürdü yak; metal ve ametal oksitlerin suda asit mi baz mı verdiğini bul.', kur: yakmaKur },
    { id: 'elektroliz', ad: 'Suyun elektrolizi', ikon: '🔋', renk: '#E4F0F8', konu: 'Kimyasal değişimler · 9.–10. sınıf', ozet: 'Suyu hidrojen ve oksijene ayır; hacim oranını gör, gazları kibrit ve korla test et.', kur: elektrolizKur },
    { id: 'gaz', ad: 'Gazları toplama', ikon: '🫙', renk: '#E8F2F8', konu: 'Gazlar · laboratuvar becerisi', ozet: 'Hidrojeni su altında, karbondioksiti ağzı yukarı kapta topla; gazları kibritle tanı.', kur: gazKur },
    { id: 'final', ad: 'Final: Bilinmeyeni bul', ikon: '🕵️', renk: '#F4EEE8', konu: 'Tekrar · tüm görevler', ozet: 'Etiketsiz dört çözeltiyi gösterge, magnezyum ve asit testleriyle tanı.', kur: finalKur }
  ];
  var GI = {}; GOREV.forEach(function (d) { GI[d.id] = d; });
  function yildizHtml(n) { var s = ''; for (var i = 0; i < 3; i++) s += '<i class="' + (i < n ? 'on' : '') + '">★</i>'; return s; }
  function listeCiz() {
    var d = depoOku(), top = 0;
    GOREV.forEach(function (g) { top += (d[g.id] && d[g.id].yildiz) || 0; });
    var s = '<div class="gv-liste-ust"><div><h2>Görevler</h2><p>Adım adım ilerle, sorulara cevap ver, yıldızları topla. Yeşil ok sıradaki adımı gösterir.</p></div><div class="gv-toplam">★ ' + top + ' / ' + GOREV.length * 3 + '</div></div>';
    if (G) s += '<div class="gv-devam"><span>Devam eden görev: <b>' + h(G.D.ad) + '</b></span><button class="ab ana" data-gvl="devam">Devam et</button></div>';
    if (!UC) s += '<div class="gv-uyari">Görevler 3D tezgâh ister. Bu tarayıcıda 3D (WebGL) açılamadı; serbest deney ve hazır deneyler kullanılabilir.</div>';
    s += '<div class="gv-izgara">' + GOREV.map(function (g, i) {
      var y = (d[g.id] && d[g.id].yildiz) || 0;
      return '<button class="gv-k" data-gvl="' + g.id + '"' + (UC ? '' : ' disabled') + '><span class="gv-no">' + (i + 1) + '</span><span class="gv-ik" style="background:' + g.renk + '">' + g.ikon + '</span><h3>' + h(g.ad) + '</h3><p>' + h(g.ozet) + '</p><span class="gv-kalt"><span class="etk">' + h(g.konu) + '</span><span class="gv-y">' + yildizHtml(y) + '</span></span></button>';
    }).join('') + '</div>';
    bolum.innerHTML = s;
  }
  bolum.addEventListener('click', function (e) {
    var b = e.target.closest('[data-gvl]'); if (!b || b.disabled) return;
    var v = b.getAttribute('data-gvl');
    if (v === 'devam') { LA.modAc('serbest'); kaydir(); return; }
    baslat(v);
  });
  function kaydir() { setTimeout(function () { var r = bas.getBoundingClientRect(); window.scrollTo({ top: Math.max(0, window.pageYOffset + r.top - 8), behavior: 'smooth' }); }, 60); }
  listeCiz();

  /* ================= ÇALIŞMA ZAMANI ================= */
  var G = null, TW = [];
  function anim(sure, f, cb, anahtar) { if (anahtar) TW = TW.filter(function (x) { return x.a !== anahtar; }); TW.push({ t: 0, sure: sure, f: f, cb: cb, a: anahtar }); }
  function twGuncelle(dt) {
    var var0 = TW.length > 0;
    for (var i = TW.length - 1; i >= 0; i--) {
      var w = TW[i]; w.t += dt;
      var k = Math.min(1, w.t / w.sure), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      w.f(e, k);
      if (k >= 1) { TW.splice(i, 1); if (w.cb) w.cb(); }
    }
    return var0;
  }
  function tasi(o, p1, q1, sure, yay, cb) {
    var p0 = o.position.clone(), q0 = o.quaternion.clone(), p = p1.clone(), q = q1 ? q1.clone() : null;
    anim(sure, function (e, k) { o.position.lerpVectors(p0, p, e); o.position.y += (yay || 0) * Math.sin(Math.PI * k); if (q) o.quaternion.slerpQuaternions(q0, q, e); }, cb, o.uuid);
  }
  function dondur(o, ax, a1, sure, cb) { var a0 = o.rotation[ax]; anim(sure, function (e) { o.rotation[ax] = a0 + (a1 - a0) * e; }, cb, o.uuid + ax); }
  function bekle(ms, f) { var g0 = G; setTimeout(function () { if (G && G === g0) f(); }, ms); }
  function grup(x, y, z) { var g = new T.Group(); g.position.set(x || 0, y || 0, z || 0); return g; }
  function hedefKutu(par, r, hgt, y) { var m = new T.Mesh(new T.CylinderGeometry(r, r, hgt, 12), new T.MeshBasicMaterial({ visible: false })); m.position.y = y; par.add(m); return m; }
  function yonQ(x, y, z) { return new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), new T.Vector3(x, y, z).normalize()); }
  function sahneyeEkle(o) { UC.sahne.add(o); G.nesneler.push(o); return o; }
  function etiket(nesne, metin, y, sinif) { return UC.etiket(nesne, metin, y, sinif); }
  function dokun(nesne, fn) { UC.dokun(nesne, function () { if (!G || G.kart) return; fn(); UC.kirli(); }); }
  function mesaj(m, sure) { if (!G) return; G.mesaj = m; G.mesajBit = simdi() + (sure || 2800); }
  function okNesne(o, y, r) { return { nesne: o, y: y === undefined ? 0.3 : y, r: r || 1 }; }
  function kap(i) { return LA.KAPLAR[i]; }
  function karistir(L) { var a = L.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  LA.gorevIpucu = function () {
    if (!G || G.kart || G.bitti) return null;
    if (G.mesaj && simdi() < G.mesajBit) return G.mesaj;
    if (!G.A) return null;
    var m = typeof G.A.metin === 'function' ? G.A.metin(G) : G.A.metin;
    return m ? '<i class="gv-adno">' + (G.adim + 1) + '</i> ' + m : null;
  };
  LA.gorevBitir = function () { if (G) bitir(); };
  LA.olay = function (tur, veri) { if (G && G.D.olay) G.D.olay(tur, veri); };

  function baslat(id) {
    if (!UC) return;
    if (G) bitir();
    var D = GI[id];
    LA.modAc('serbest');
    G = { D: D, adim: -1, A: null, v: {}, nesneler: [], soru: 0, dogru: 0, tahmin: {}, kart: null, bitti: false };
    if (LA.deneyKapat) LA.deneyKapat();
    LA.gorevAktif = true; LA.kilit = true; UC.sahip = 'gorev';
    UC.ok(null); UC.siseBirak();
    serbest.classList.add('gv-gorev');
    G.guncel = UC.guncelle(function (t, dt) { if (!G) return false; var a = twGuncelle(dt); if (G.D.guncelle && G.D.guncelle(t, dt)) a = true; kontrol(); return a; });
    LA.gunlukIs('Görev başladı: ' + D.ad);
    D.kur();
    LA.dugmeDurum();
    ilerle();
    kaydir();
  }
  function bitir() {
    if (!G) return;
    var g0 = G;
    perdeKapat();
    if (g0.D.bitir) try { g0.D.bitir(); } catch (e) {}
    G = null; TW = [];
    g0.nesneler.forEach(function (o) { UC.sahne.remove(o); UC.yoket(o); });
    UC.etiketKaldir(); UC.dokunKaldir(); UC.guncelleKaldir(g0.guncel);
    UC.ok(null); UC.ptSabit(null); UC.kameraAyar(null); UC.oran(null);
    UC.arkaRaf.visible = true; UC.PISET.visible = true; UC.siseBirak();
    serbest.classList.remove('gv-gorev', 'gv-istasyon');
    tezgahEl.classList.remove('gv-kobalt');
    LA.kilit = false; LA.gorevAktif = false; LA.gorevSiseDugmesiz = false; LA.olcerGizli = false;
    UC.sahip = 'serbest';
    LA.standartKaplar();
    LA.dugmeDurum();
    bas.hidden = true;
    listeCiz();
  }
  function ilerle() {
    if (!G) return;
    G.adim++; G.A = null;
    var D = G.D;
    if (G.adim >= D.adim.length) { tamamla(); return; }
    var A = D.adim[G.adim];
    if (A.atla && A.atla(G)) { ilerle(); return; }
    basCiz();
    if (A.tahmin) kartGoster({ tur: 'tahmin', id: G.adim, soru: A.tahmin.soru, secenekler: A.tahmin.secenekler }, function () { adimBaslat(A); });
    else adimBaslat(A);
  }
  function adimBaslat(A) {
    if (!G) return;
    G.A = A; G.okSon = undefined;
    if (A.basla) A.basla(G);
    basCiz(); UC.kirli();
  }
  function kontrol() {
    if (!G || !G.A || G.kart) { if (G && (G.kart || !G.A)) UC.ok(null); return; }
    var A = G.A, hd = A.ok ? (typeof A.ok === 'function' ? A.ok(G) : A.ok) : null;
    if (hd !== G.okSon) { UC.ok(hd); G.okSon = hd; }
    if (A.kosul && A.kosul(G)) adimBitti();
  }
  function adimBitti() {
    var A = G.A; G.A = null; UC.ok(null); G.okSon = undefined;
    basCiz();
    var k = typeof A.kart === 'function' ? A.kart(G) : A.kart;
    if (k) bekle(A.gecikme || 700, function () { kartGoster(k, ilerle); });
    else bekle(350, ilerle);
  }
  function tamamla() {
    G.bitti = true; UC.ok(null);
    var y = G.soru ? (G.dogru === G.soru ? 3 : (G.dogru >= G.soru / 2 ? 2 : 1)) : 3, d = depoOku();
    d[G.D.id] = { yildiz: Math.max(y, (d[G.D.id] && d[G.D.id].yildiz) || 0) }; depoYaz(d);
    basCiz();
    LA.gunlukIs('Görev tamamlandı: ' + G.D.ad + ' (' + y + ' yıldız)');
    kartGoster({ tur: 'bitis', yildiz: y, baslik: G.D.ad, ozet: G.D.ozetSon }, null);
  }
  function basCiz() {
    if (!G) { bas.hidden = true; return; }
    var D = G.D, n = D.adim.length, i = Math.max(0, Math.min(G.adim, n - 1)), oran = G.bitti ? 1 : Math.max(0, G.adim) / n;
    var s = '<div class="gv-bu"><span class="gv-ik" style="background:' + D.renk + '">' + D.ikon + '</span><div class="gv-bt"><b>' + h(D.ad) + '</b><small>' + (G.bitti ? 'Tamamlandı' : 'Adım ' + (i + 1) + ' / ' + n) + (G.soru ? ' · ' + G.dogru + '/' + G.soru + ' soru' : '') + '</small></div><button class="ab gv-cik" data-gvb="cik">Görevden çık</button></div>' +
      '<div class="gv-cubuk"><i style="width:' + Math.round(oran * 100) + '%"></i></div>';
    if (D.tablo) { var tb = D.tablo(); if (tb) s += '<div class="gv-tablo">' + tb + '</div>'; }
    if (bas._h !== s) { bas.innerHTML = s; bas._h = s; }
    bas.hidden = false;
  }
  bas.addEventListener('click', function (e) { var b = e.target.closest('[data-gvb]'); if (b && b.getAttribute('data-gvb') === 'cik') { bitir(); LA.modAc('gorevler'); listeCiz(); } });

  /* ---- Kartlar: keşif, soru, tahmin, bitiş ---- */
  var perde = null;
  function perdeKapat() { if (perde && perde.parentNode) perde.parentNode.removeChild(perde); perde = null; if (G) G.kart = null; }
  function kartGoster(k, devam) {
    if (!G) return;
    perdeKapat();
    G.kart = k; UC.ok(null);
    perde = document.createElement('div'); perde.className = 'gv-perde';
    var s = '<div class="gv-kart gv-' + k.tur + '" role="dialog" aria-modal="true">';
    if (k.tur === 'kesif') {
      s += '<div class="gv-etk">Keşfettin</div><h3>' + h(k.baslik) + '</h3><p>' + k.metin + '</p>';
      if (k.denklem) s += '<div class="gv-dnk">' + h(k.denklem) + '</div>';
      if (k.tahminId !== undefined && G.tahmin[k.tahminId] !== undefined) s += '<div class="gv-tah ' + (G.tahmin[k.tahminId] === k.tahminDogru ? 'ok' : '') + '">' + (G.tahmin[k.tahminId] === k.tahminDogru ? 'Tahminin doğruydu!' : 'Tahminin farklıydı; şimdi nedenini biliyorsun.') + '</div>';
      s += '<button class="gv-dug" data-gvk="devam">Devam</button>';
    } else if (k.tur === 'soru' || k.tur === 'tahmin') {
      s += '<div class="gv-etk">' + (k.tur === 'soru' ? 'Hızlı kontrol' : 'Tahmin et') + '</div><h3>' + h(k.soru) + '</h3>' + (k.tur === 'tahmin' ? '<p class="gv-ince">Yanlış cevap yok. Tahminini seç, sonra deneyerek gör.</p>' : '') +
        '<div class="gv-sec">' + k.secenekler.map(function (x, i) { return '<button data-gvs="' + i + '">' + h(x) + '</button>'; }).join('') + '</div><div class="gv-geri" aria-live="polite"></div>';
    } else if (k.tur === 'bitis') {
      s += '<div class="gv-etk">Görev tamamlandı</div><div class="gv-yb">' + yildizHtml(k.yildiz) + '</div><h3>' + h(k.baslik) + '</h3>' +
        (G.soru ? '<p>Soruların ' + G.soru + ' tanesinden ' + G.dogru + ' tanesini ilk denemede bildin.</p>' : '') +
        (k.ozet ? '<ul class="gv-oz">' + k.ozet.map(function (x) { return '<li>' + h(x) + '</li>'; }).join('') + '</ul>' : '') +
        '<div class="gv-ikili"><button class="gv-dug" data-gvk="liste">Görevlere dön</button><button class="gv-dug ikinci" data-gvk="tekrar">Tekrar oyna</button></div>';
    }
    perde.innerHTML = s + '</div>';
    UC.katman.appendChild(perde);
    var ilk = true;
    perde.addEventListener('click', function (e) {
      var b = e.target.closest('[data-gvk]');
      if (b) {
        var v = b.getAttribute('data-gvk');
        if (v === 'devam') { perdeKapat(); if (devam) devam(); }
        else if (v === 'liste') { bitir(); LA.modAc('gorevler'); listeCiz(); }
        else if (v === 'tekrar') { var id = G.D.id; bitir(); baslat(id); }
        return;
      }
      var sb = e.target.closest('[data-gvs]'); if (!sb || sb.disabled) return;
      var i = +sb.getAttribute('data-gvs'), geri = perde.querySelector('.gv-geri');
      if (k.tur === 'tahmin') {
        G.tahmin[k.id] = i;
        perde.querySelectorAll('[data-gvs]').forEach(function (x) { x.disabled = true; x.classList.toggle('sec', x === sb); });
        geri.innerHTML = '<p>Tahminin kaydedildi. Şimdi deneyerek gör!</p><button class="gv-dug" data-gvk="devam">Deneye geç</button>';
        return;
      }
      if (i === k.dogru) {
        if (ilk) G.dogru++;
        if (ilk) G.soru++;
        perde.querySelectorAll('[data-gvs]').forEach(function (x) { x.disabled = true; });
        sb.classList.add('dogru');
        geri.innerHTML = '<p class="ok"><b>Doğru!</b> ' + (k.aciklama || '') + '</p><button class="gv-dug" data-gvk="devam">Devam</button>';
        basCiz();
      } else {
        if (ilk) { G.soru++; ilk = false; basCiz(); }
        sb.classList.add('yanlis'); sb.disabled = true;
        geri.innerHTML = '<p class="hayir">Tam değil. ' + (k.ipucu ? h(k.ipucu) + ' ' : '') + 'Başka bir cevap dene.</p>';
      }
    });
    var odak = perde.querySelector('button'); if (odak) try { odak.focus({ preventScroll: true }); } catch (er) {}
  }

  /* ---- Görev düğmeleri (talimat şeridindeki) ---- */
  function baglaKatman() {
    UC.katman.addEventListener('click', function (e) {
      if (!G) return;
      var b = e.target.closest('[data-gva]');
      if (b && G.D.eylem) { G.D.eylem(b.getAttribute('data-gva')); UC.kirli(); }
    });
    var tut = null;
    UC.katman.addEventListener('pointerdown', function (e) { var b = e.target.closest('[data-gvh]'); if (!b || !G) return; e.preventDefault(); tut = b.getAttribute('data-gvh'); if (G.D.tut) G.D.tut(tut, true); });
    function birak() { if (tut && G && G.D.tut) G.D.tut(tut, false); tut = null; }
    document.addEventListener('pointerup', birak); document.addEventListener('pointercancel', birak);
  }
  function siseDug(id, metin) { return '<button type="button" class="gv-b" data-gva="sise:' + id + '">' + metin + '</button>'; }
  function siseVar(id) { return UC.sise.id === id; }
  function istasyon(ac) { serbest.classList.toggle('gv-istasyon', !!ac); }
  function gozlukAdimi() {
    return { metin: 'Önce <b>koruyucu gözlüğünü</b> tak: gözlüğe dokun.', atla: function () { return LA.gozluk; }, ok: function () { return G.v.gozlukG ? okNesne(G.v.gozlukG, 0.32, 0.8) : null; }, kosul: function () { return LA.gozluk; } };
  }
  function gozlukKoy(x, z) {
    if (LA.gozluk) return;
    var g = sahneyeEkle(grup(x, 0, z)), mavi = new T.MeshStandardMaterial({ color: 0x2a6fd6, roughness: 0.4 });
    function yay(r, y, a0, a1) { var p = []; for (var i = 0; i <= 24; i++) { var a = a0 + (a1 - a0) * i / 24; p.push(new T.Vector3(r * Math.sin(a), y, r * Math.cos(a))); } return new T.CatmullRomCurve3(p); }
    var lens = new T.Mesh(new T.CylinderGeometry(0.21, 0.21, 0.12, 32, 1, true, -1.15, 2.3), new T.MeshPhysicalMaterial({ color: 0xc4e6ff, transparent: true, opacity: 0.5, roughness: 0.05, clearcoat: 1, side: T.DoubleSide, depthWrite: false }));
    lens.position.y = 0.09; lens.renderOrder = 5; g.add(lens);
    [0.03, 0.15].forEach(function (y) { g.add(new T.Mesh(new T.TubeGeometry(yay(0.21, y, -1.15, 1.15), 24, 0.014, 8), mavi)); });
    g.add(new T.Mesh(new T.TubeGeometry(yay(0.21, 0.09, 1.15, 2 * Math.PI - 1.15), 30, 0.022, 8), new T.MeshStandardMaterial({ color: 0x30353c, roughness: 0.7 })));
    hedefKutu(g, 0.3, 0.3, 0.1); UC.golgeKoy(g, 0, 0, 0.6, 0.6, 0.6);
    g.rotation.y = 0.35;
    G.v.gozlukG = g;
    var ge = etiket(g, 'Koruyucu gözlük', 0.32, 'gv-pr');
    G.v.gozlukEt = ge;
    dokun(g, function () {
      if (LA.gozluk) return;
      var hedef = UC.kamera.position.clone().lerp(new T.Vector3(0, 1, 0.3), 0.75);
      UC.dokunKaldir(g);
      ge.gizli = true;
      tasi(g, hedef, null, 0.6, 0.2, function () { g.visible = false; LA.gozluk = true; tezgahEl.classList.add('gv-gozluk'); mesaj('Gözlük takıldı. Güvenlik önce!'); });
    });
  }

  /* ================= 1. ALEV TESTİ ================= */
  function alevKur() {
    var D = GI.alev, V = G.v;
    LA.kapKur([{ tip: 'beher', gizli: true }]);
    istasyon(true); UC.arkaRaf.visible = false;
    UC.kameraAyar(new T.Vector3(0, 0.5, 0.55), 2.05, new T.Vector3(0.14, 0.6, 1)); UC.oran([0.95, 0.6]);
    V.gaz = false; V.alev = 'yok'; V.hava = false; V.oze = 'dinlen'; V.yuk = null; V.kirli = null; V.test = {}; V.temizlendi = 0; V.kobaltBak = false; V.renkT = 0; V.sira = [];
    V.X = ['Li', 'K', 'Ca', 'Sr', 'Ba'][Math.floor(Math.random() * 5)];
    var kok = sahneyeEkle(grup(0, 0, 0));
    var altlik = UC.yuvarlakKutu(1.0, 0.03, 1.0, 0.05, new T.MeshStandardMaterial({ color: 0xf1eee9, roughness: 0.9 })); altlik.position.set(0, 0, -0.15); kok.add(altlik);
    var bek = UC.bekYap(true); bek.g.position.set(0, 0.03, -0.15); kok.add(bek.g);
    bek.bilezik.add(bek.delik); bek.delik.position.set(0, 0, 0.066); bek.bilezik.rotation.y = Math.PI;
    var bilHedef = hedefKutu(bek.bilezik, 0.17, 0.2, 0);
    /* renkli ve sarı alev (normal karışım: açık zeminde renk görünsün) */
    var renkliAlev = new T.Mesh(new T.ConeGeometry(0.13, 0.72, 32, 1, true), new T.MeshBasicMaterial({ map: UC.alevD, transparent: true, opacity: 0.92, depthWrite: false, side: T.DoubleSide }));
    renkliAlev.position.y = 0.95; renkliAlev.visible = false; bek.g.add(renkliAlev);
    var icAlev = new T.Mesh(new T.ConeGeometry(0.06, 0.34, 24, 1, true), new T.MeshBasicMaterial({ map: UC.alevD, color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false, side: T.DoubleSide }));
    icAlev.position.y = 0.78; icAlev.visible = false; bek.g.add(icAlev);
    var parilti = new T.Sprite(new T.SpriteMaterial({ map: UC.yumusakD, transparent: true, opacity: 0, depthWrite: false })); parilti.position.y = 0.85; parilti.scale.set(0.5, 0.7, 1); bek.g.add(parilti);
    /* gaz vanası ve hortum */
    var vanaG = grup(1.2, 0, -1.2); kok.add(vanaG);
    var boru = new T.Mesh(new T.CylinderGeometry(0.035, 0.045, 0.34, 16), UC.MAT.krom); boru.position.y = 0.17; vanaG.add(boru);
    var agiz = new T.Mesh(new T.CylinderGeometry(0.02, 0.02, 0.16, 12), UC.MAT.krom); agiz.rotation.x = Math.PI / 2; agiz.position.set(0, 0.25, 0.08); vanaG.add(agiz);
    var kol = grup(0, 0.36, 0); vanaG.add(kol);
    var kolM = new T.Mesh(new T.BoxGeometry(0.32, 0.05, 0.07), UC.MAT.sari); kolM.position.x = 0.13; kol.add(kolM);
    kol.rotation.y = Math.PI / 2;
    hedefKutu(vanaG, 0.28, 0.6, 0.3); UC.golgeKoy(vanaG, 0, 0, 0.5, 0.5, 0.7);
    kok.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(0.2, 0.15, -0.15), new T.Vector3(0.55, 0.05, -0.32), new T.Vector3(0.95, 0.04, -0.8), new T.Vector3(1.2, 0.25, -1.06)]), 40, 0.032, 10), UC.MAT.lastik));
    /* çakmak: uç noktası grubun merkezinde */
    var cak = grup(-0.95, 0.045, 0.22); kok.add(cak);
    var cakIc = new T.Group(); cak.add(cakIc);
    var gv = new T.Mesh(new T.BoxGeometry(0.4, 0.075, 0.1), UC.MAT.kirmizi); gv.position.x = -0.62; cakIc.add(gv);
    var tetik = new T.Mesh(new T.BoxGeometry(0.06, 0.06, 0.05), UC.MAT.siyah); tetik.position.set(-0.45, -0.055, 0); cakIc.add(tetik);
    var nl = new T.Mesh(new T.CylinderGeometry(0.016, 0.02, 0.42, 12), UC.MAT.celik); nl.rotation.z = Math.PI / 2; nl.position.x = -0.21; cakIc.add(nl);
    var cakHedef = new T.Mesh(new T.BoxGeometry(0.9, 0.3, 0.3), new T.MeshBasicMaterial({ visible: false })); cakHedef.position.x = -0.42; cakIc.add(cakHedef);
    cak.rotation.y = 0.45;
    var cakP0 = cak.position.clone(), cakQ0 = cak.quaternion.clone();
    var kivilcim = new T.Sprite(new T.SpriteMaterial({ map: UC.yumusakD, color: 0xfff1a0, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false })); kivilcim.scale.setScalar(0.25); cak.add(kivilcim);
    /* tel öze: uç grubun merkezinde, sap +y yönünde */
    var oze = grup(); kok.add(oze);
    var tel = new T.Mesh(new T.CylinderGeometry(0.006, 0.006, 0.5, 8), UC.MAT.celik); tel.position.y = 0.28; oze.add(tel);
    var hlk = new T.Mesh(new T.TorusGeometry(0.03, 0.007, 8, 24), UC.MAT.celik); hlk.position.y = 0.0; oze.add(hlk);
    var sap = new T.Mesh(new T.CylinderGeometry(0.03, 0.034, 0.42, 16), new T.MeshStandardMaterial({ color: 0x2b2f35, roughness: 0.5 })); sap.position.y = 0.74; oze.add(sap);
    var yuk = new T.Mesh(new T.SphereGeometry(0.024, 10, 8), new T.MeshStandardMaterial({ color: 0xffffff, roughness: 1 })); yuk.visible = false; oze.add(yuk);
    var kor = new T.Sprite(new T.SpriteMaterial({ map: UC.yumusakD, color: 0xff7a2a, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false })); kor.scale.setScalar(0.12); oze.add(kor);
    var ozeHedef = new T.Mesh(new T.CylinderGeometry(0.12, 0.12, 1.0, 8), new T.MeshBasicMaterial({ visible: false })); ozeHedef.position.y = 0.5; oze.add(ozeHedef);
    var OZ = {
      dinlen: { p: new T.Vector3(0.62, 0.035, 0.3), q: yonQ(1, 0.06, -0.3) },
      el: { p: new T.Vector3(0.42, 0.95, 0.42), q: yonQ(0.55, 0.78, 0.3) },
      hcl: { p: new T.Vector3(1.42, 0.14, -0.42), q: yonQ(0.3, 0.92, 0.25) },
      alev: { p: new T.Vector3(0.0, 0.84, -0.15), q: yonQ(0.78, 0.5, 0.35) }
    };
    oze.position.copy(OZ.dinlen.p); oze.quaternion.copy(OZ.dinlen.q);
    /* seyreltik HCl */
    var hclG = grup(1.42, 0, -0.42); kok.add(hclG);
    var hb = new T.Mesh(UC.torna([[0, 0], [0.2, 0], [0.21, 0.01], [0.21, 0.42], [0.225, 0.43]], 48), UC.MAT.cam); hb.renderOrder = 4; hclG.add(hb);
    var hs = new T.Mesh(UC.torna([[0, 0.012], [0.198, 0.012], [0.198, 0.26], [0, 0.26]], 40), new T.MeshPhysicalMaterial({ color: 0xe2eef6, transparent: true, opacity: 0.55, depthWrite: false })); hs.renderOrder = 2; hclG.add(hs);
    hedefKutu(hclG, 0.28, 0.5, 0.22); UC.golgeKoy(hclG, 0, 0, 0.6, 0.6, 0.7);
    /* saat camları */
    var DIZ = [['Li', 'LiCl'], ['Na', 'NaCl'], ['K', 'KCl'], ['Ca', 'CaCl₂'], ['Sr', 'SrCl₂'], ['Ba', 'BaCl₂'], ['Cu', 'CuCl₂'], ['KNa', 'KCl+NaCl'], ['X', 'X ?']];
    var CAM = {};
    DIZ.forEach(function (d, i) {
      var x = i < 5 ? -1.64 + i * 0.82 : -1.23 + (i - 5) * 0.82, z = i < 5 ? 0.78 : 1.48;
      var g = grup(x, 0, z); kok.add(g);
      var c = new T.Mesh(UC.torna([[0, 0.004], [0.12, 0.008], [0.2, 0.024], [0.25, 0.05], [0.256, 0.056]], 48), UC.MAT.camKalin); c.renderOrder = 4; g.add(c);
      var toz = new T.Mesh(new T.SphereGeometry(0.12, 24, 10, 0, 6.283, 0, 1.15), new T.MeshStandardMaterial({ color: d[0] === 'Cu' ? 0x5cc6b0 : 0xf6f6f3, roughness: 1 }));
      toz.scale.set(1, 0.32, 1); toz.position.y = 0.006; g.add(toz);
      hedefKutu(g, 0.32, 0.3, 0.1); UC.golgeKoy(g, 0, 0, 0.62, 0.62, 0.55);
      var et = grup(0, 0, 0.27); g.add(et);
      CAM[d[0]] = { g: g, i: i, ad: d[1], et: etiket(et, '<b>' + d[1] + '</b>', 0, 'gv-alt' + (d[0] === 'X' ? ' gv-x' : '')) };
      dokun(g, function () { ornekDokun(d[0]); });
    });
    /* kobalt camı */
    var kob = grup(-1.3, 0, -0.75); kok.add(kob); kob.visible = false;
    var kc = new T.Mesh(new T.BoxGeometry(0.42, 0.42, 0.02), new T.MeshPhysicalMaterial({ color: 0x2747d8, transparent: true, opacity: 0.7, roughness: 0.05, clearcoat: 1 })); kc.position.y = 0.33; kob.add(kc);
    var ka = new T.Mesh(new T.BoxGeometry(0.3, 0.06, 0.16), UC.MAT.gri); ka.position.y = 0.03; kob.add(ka);
    var kd = new T.Mesh(new T.BoxGeometry(0.03, 0.12, 0.03), UC.MAT.gri); kd.position.y = 0.1; kob.add(kd);
    hedefKutu(kob, 0.3, 0.6, 0.3); kob.rotation.y = 0.3;
    gozlukKoy(-1.72, -0.45);
    /* etiketler */
    var etV = etiket(vanaG, 'Gaz vanası', 0.55, 'gv-pr'), etC = etiket(cak, 'Çakmak', 0.2, 'gv-pr'), etB = etiket(bek.bilezik, 'Hava deliği', 0.12, 'gv-pr'), etO = etiket(oze, 'Tel öze', 0.25, 'gv-pr'), etH = etiket(hclG, 'Seyreltik HCl', 0.55, 'gv-pr'), etK = etiket(kob, 'Kobalt camı', 0.62, 'gv-pr');
    var alevN = grup(0, 0.85, -0.15); kok.add(alevN);
    var etA = etiket(alevN, '', 0.42, 'gv-alev'); etA.gizli = true;
    [etV, etC, etB, etO, etH, etK].forEach(function (e) { e.gizli = true; });
    function etiketleriAyarla() {
      var hd = G && G.okSon, ad = hd && hd.nesne;
      etV.gizli = ad !== vanaG; etC.gizli = ad !== cak; etB.gizli = ad !== bek.bilezik; etO.gizli = ad !== oze; etH.gizli = ad !== hclG; etK.gizli = !kob.visible;
    }
    /* eylemler */
    function vanaDokun() {
      V.gaz = !V.gaz; dondur(kol, 'y', V.gaz ? 0 : Math.PI / 2, 0.35);
      if (!V.gaz && V.alev !== 'yok') { V.alev = 'yok'; mesaj('Gaz kapandı; alev söndü.'); }
      else mesaj(V.gaz ? 'Gaz açıldı. Şimdi çakmakla yak.' : 'Gaz kapandı.');
    }
    function cakmakDokun() {
      if (!V.gaz) { mesaj('Önce gaz vanasını aç.'); return; }
      if (V.alev !== 'yok') { mesaj('Bek zaten yanıyor.'); return; }
      if (V.cakYolda) return;
      V.cakYolda = true;
      var q = new T.Quaternion().setFromEuler(new T.Euler(0, 0.35, -0.55));
      tasi(cak, new T.Vector3(0.06, 0.68, -0.12), q, 0.6, 0.25, function () {
        anim(0.35, function (e, k) { kivilcim.material.opacity = Math.sin(Math.PI * k) * 1.2; kivilcim.scale.setScalar(0.12 + 0.3 * k); }, function () {
          V.alev = V.hava ? 'mavi' : 'sari'; mesaj('Bek yandı.');
          tasi(cak, cakP0, cakQ0, 0.6, 0.15, function () { V.cakYolda = false; });
        });
      });
    }
    function bilezikDokun() {
      V.hava = !V.hava; dondur(bek.bilezik, 'y', V.hava ? 0 : Math.PI, 0.4);
      if (V.alev !== 'yok') V.alev = V.hava ? 'mavi' : 'sari';
      mesaj(V.hava ? 'Hava deliği açıldı.' : 'Hava deliği kapandı.');
    }
    function ozeGit(ad, hedefCam, cb) {
      var k = ad === 'ornek' ? { p: hedefCam.g.position.clone().add(new T.Vector3(0, 0.035, 0)), q: yonQ(0.42, 0.85, 0.32) } : OZ[ad];
      V.oze = 'yolda';
      tasi(oze, k.p, k.q, 0.55, ad === 'dinlen' ? 0.12 : 0.32, function () { V.oze = ad; if (cb) cb(); });
    }
    function hazirMi() {
      if (V.oze === 'dinlen') { mesaj('Önce <b>tel özeye</b> dokunup al.'); return false; }
      return V.oze === 'el';
    }
    function ozeDokun() { if (V.oze === 'dinlen') { ozeGit('el'); mesaj('Tel öze elinde.'); } else if (V.oze === 'el') ozeGit('dinlen'); }
    function hclDokun() {
      if (!hazirMi()) return;
      ozeGit('hcl', null, function () { bekle(500, function () { V.kirli = null; V.yuk = null; yuk.visible = false; V.temizlendi++; mesaj('Tel temizlendi.'); ozeGit('el'); }); });
    }
    function ornekDokun(ad) {
      if (!hazirMi()) return;
      ozeGit('ornek', CAM[ad], function () {
        bekle(380, function () {
          var iy = ad === 'KNa' ? ['K', 'Na'] : [ad === 'X' ? V.X : ad];
          if (V.kirli && V.kirli.length) { V.kirli.forEach(function (x) { if (iy.indexOf(x) < 0) iy.push(x); }); mesaj('Dikkat: tel temiz değildi, örnekler karıştı!', 3400); }
          V.yuk = { ad: ad, iyon: iy }; yuk.visible = true; yuk.material.color.setHex(ad === 'Cu' ? 0x5cc6b0 : 0xf4f4f1);
          ozeGit('el');
        });
      });
    }
    function renkSec(iy) {
      if (V.kobaltBak) {
        var dg = iy.filter(function (x) { return x !== 'Na'; });
        if (!dg.length) return { renk: '#3b3f8e', ad: 'sarı ışık camdan geçmedi', iyon: 'Na' };
        return { renk: dg[0] === 'K' ? '#9a62ff' : KAT[dg[0]].alev, ad: KAT[dg[0]].alevAd, iyon: dg[0] };
      }
      if (iy.indexOf('Na') >= 0) return { renk: KAT.Na.alev, ad: KAT.Na.alevAd, iyon: 'Na' };
      return { renk: KAT[iy[0]].alev, ad: KAT[iy[0]].alevAd, iyon: iy[0] };
    }
    var IYAD = { Li: 'Lityum', Na: 'Sodyum', K: 'Potasyum', Ca: 'Kalsiyum', Sr: 'Stronsiyum', Ba: 'Baryum', Cu: 'Bakır' };
    V.IYAD = IYAD;
    function alevDokun() {
      if (!hazirMi()) return;
      if (V.alev === 'yok') { mesaj('Önce beki yak.'); return; }
      ozeGit('alev', null, function () {
        if (V.alev === 'sari') { mesaj('Alev sarı ve isli; metal rengi görünmüyor. Önce hava deliğini aç.', 3600); bekle(1300, function () { ozeGit('el'); }); return; }
        var y = V.yuk;
        if (!y && !(V.kirli && V.kirli.length)) { mesaj('Tel temiz: alevin rengi değişmedi.'); bekle(1200, function () { ozeGit('el'); }); return; }
        var iy = y ? y.iyon : V.kirli, r = renkSec(iy), sure = y ? 3.6 : 1.8;
        V.renk = r.renk; V.renkT = sure;
        etA.el.innerHTML = '<b>' + (V.kobaltBak && r.iyon === 'Na' ? 'Kobalt camından' : IYAD[r.iyon]) + '</b> · ' + h(r.ad); etA.gizli = false;
        UC.ptSabit([r.iyon]);
        if (y) {
          V.test[y.ad] = { renk: r.renk, ad: r.ad, iyon: r.iyon };
          if (y.ad === 'KNa' && V.kobaltBak) V.test.KNaK = true;
          if (V.sira.indexOf(y.ad) < 0) V.sira.push(y.ad);
          LA.gunlukIs('Alev testi: ' + CAM[y.ad].ad + ' → ' + r.ad + (V.kobaltBak ? ' (kobalt camından)' : ''));
          basCiz();
        } else mesaj('Tel kirliydi; önceki örneğin rengi göründü. HCl ile temizle.', 3200);
        V.kirli = iy.slice(); V.yuk = null; yuk.visible = false;
        bekle(sure * 1000, function () { etA.gizli = true; ozeGit('el'); });
      });
    }
    function kobaltDokun() {
      V.kobaltBak = !V.kobaltBak; tezgahEl.classList.toggle('gv-kobalt', V.kobaltBak);
      mesaj(V.kobaltBak ? 'Alevi kobalt camının arkasından izliyorsun.' : 'Kobalt camını bıraktın.');
    }
    dokun(vanaG, vanaDokun); dokun(cak, cakmakDokun); dokun(bek.bilezik, bilezikDokun); dokun(oze, ozeDokun); dokun(hclG, hclDokun); dokun(kob, kobaltDokun);
    var alevHedef = new T.Mesh(new T.CylinderGeometry(0.2, 0.2, 0.6, 10), new T.MeshBasicMaterial({ visible: false })); alevHedef.position.set(0, 0.85, -0.15); kok.add(alevHedef);
    dokun(alevHedef, alevDokun);
    D.eylem = function () {};
    D.test = { vana: vanaDokun, cakmak: cakmakDokun, bilezik: bilezikDokun, oze: ozeDokun, hcl: hclDokun, ornek: ornekDokun, alev: alevDokun, kobalt: kobaltDokun };
    D.guncelle = function (t, dt) {
      etiketleriAyarla();
      var A = bek.alev, hareket = false;
      if (V.renkT > 0) V.renkT -= dt;
      var renkli = V.renkT > 0 && V.renk && V.alev === 'mavi', sari = V.alev === 'sari';
      A.visible = V.alev !== 'yok' && !renkli && !sari;
      renkliAlev.visible = renkli || sari; icAlev.visible = renkli;
      var f = 1 + Math.sin(t * 29) * 0.05 + Math.sin(t * 13) * 0.04;
      if (sari) { renkliAlev.material.color.setHex(0xffb22a); renkliAlev.material.opacity = 0.93; renkliAlev.scale.set(0.95 + Math.sin(t * 7) * 0.05, 0.95 * f + Math.sin(t * 5) * 0.08, 0.95); renkliAlev.position.y = 0.93; parilti.material.color.setHex(0xffa030); parilti.material.opacity = 0.35; bek.isik.color.setHex(0xffa040); bek.isik.intensity = 1.3; hareket = true; }
      else if (renkli) { renkliAlev.material.color.set(V.renk); renkliAlev.material.opacity = 0.95; renkliAlev.scale.set(1 + Math.sin(t * 9) * 0.05, f, 1); renkliAlev.position.y = 0.95; icAlev.scale.set(1, 2 - f, 1); parilti.material.color.set(V.renk); parilti.material.opacity = 0.45; bek.isik.color.set(V.renk); bek.isik.intensity = 1.7; hareket = true; }
      else if (A.visible) { bek.dis.scale.set(1, f, 1); bek.ic.scale.set(1, 2 - f, 1); parilti.material.opacity = 0; bek.isik.color.setHex(0x7f9bff); bek.isik.intensity = 0.5; hareket = true; }
      else { parilti.material.opacity = 0; bek.isik.intensity = 0; }
      kor.material.opacity = V.oze === 'alev' && V.alev === 'mavi' ? 0.8 : 0;
      return hareket;
    };
    D.tablo = function () {
      if (!V.sira.length) return '';
      return '<div class="gv-tb-bas">Gözlem tablosu</div><div class="gv-renkler">' + V.sira.map(function (k) { var x = V.test[k]; return '<span><i style="background:' + x.renk + '"></i><b>' + h(CAM[k].ad) + '</b> ' + h(k === 'X' ? '?' : x.ad) + '</span>'; }).join('') + '</div>';
    };
    D.bitir = function () { tezgahEl.classList.remove('gv-kobalt'); };
    /* adımlar */
    function dongu(ad) { return function () { if (V.oze === 'dinlen') return okNesne(oze, 0.22, 0.7); if (V.yuk && V.yuk.ad === ad) return okNesne(alevN, 0.15, 0.55); if (V.kirli && V.kirli.length) return okNesne(hclG, 0.55, 0.7); return okNesne(CAM[ad].g, 0.18, 0.75); }; }
    function sonraki(L) { for (var i = 0; i < L.length; i++) if (!V.test[L[i]]) return L[i]; return L[0]; }
    var DIGER = ['K', 'Ca', 'Sr', 'Ba', 'Cu'];
    D.adim = [
      gozlukAdimi(),
      { metin: '<b>Gaz vanasını</b> aç.', ok: okNesne(vanaG, 0.55, 0.8), kosul: function () { return V.gaz; } },
      { metin: '<b>Çakmağa</b> dokun, beki yak.', ok: okNesne(cak, 0.2, 0.8), kosul: function () { return V.alev !== 'yok'; },
        kart: { tur: 'kesif', baslik: 'Sarı alev', metin: 'Hava deliği kapalıyken gaz tam yanmaz. Alevdeki küçük is (karbon) tanecikleri ısınıp ışık saçar; alev sarı, titrek ve isli olur.' } },
      { tahmin: { soru: 'Hava deliğini açarsan alev nasıl değişir?', secenekler: ['Daha sarı ve büyük olur', 'Mavi ve daha sıcak olur', 'Söner'] },
        metin: 'Bekin altındaki <b>hava deliği bileziğini</b> çevirip aç.', ok: okNesne(bek.bilezik, 0.18, 0.6), kosul: function () { return V.alev === 'mavi'; },
        kart: function () { return { tur: 'kesif', baslik: 'Mavi alev', metin: 'Hava deliği açılınca gaza daha çok oksijen karışır ve yanma tamamlanır. Alev mavi, daha sıcak ve neredeyse görünmez olur. Mavi alev metallerin renklerini gizlemez; alev testi için uygundur.', tahminId: 3, tahminDogru: 1 }; } },
      { metin: '<b>Tel özeyi</b> al ve <b>seyreltik HCl</b>’ye batırıp temizle.', ok: function () { return V.oze === 'dinlen' ? okNesne(oze, 0.22, 0.7) : okNesne(hclG, 0.55, 0.7); }, kosul: function () { return V.temizlendi >= 1; } },
      { metin: 'Teli <b>LiCl</b> örneğine batır, sonra <b>alevin içine</b> tut.', ok: dongu('Li'), kosul: function () { return !!V.test.Li; }, gecikme: 2600,
        kart: { tur: 'kesif', baslik: 'Lityum: koyu kırmızı alev', metin: 'Alevde ısınan atomların elektronları daha yüksek enerji düzeylerine çıkar. Eski düzeylerine dönerken her element kendine özgü renkte ışık yayar. Lityumun rengi koyu kırmızıdır; duvardaki tabloda lityum yanıyor.' } },
      { metin: 'Teli HCl’de temizle, sonra <b>NaCl</b>’yi alevde dene.', ok: dongu('Na'), kosul: function () { return !!V.test.Na; }, gecikme: 2600,
        kart: { tur: 'soru', soru: 'Sodyumun sarı alevi neden dikkat ister?', secenekler: ['Çok parlaktır; az sodyum bile başka renkleri bastırır', 'Alevi söndürür', 'Hiçbir zaman görünmez'], dogru: 0, aciklama: 'Sodyumun sarı ışığı çok güçlüdür. Tel iyi temizlenmezse sodyum bulaşığı diğer renkleri örter.' } },
      { metin: function () { var n = DIGER.filter(function (x) { return V.test[x]; }).length; return 'Diğer örneklerden <b>en az üçünü</b> dene: KCl, CaCl₂, SrCl₂, BaCl₂, CuCl₂. Her seferinde önce teli temizle. (' + n + '/3)'; },
        ok: function () { return dongu(V.yuk ? V.yuk.ad : sonraki(DIGER))(); }, kosul: function () { return DIGER.filter(function (x) { return V.test[x]; }).length >= 3; }, gecikme: 2600,
        kart: { tur: 'kesif', baslik: 'Her metalin parmak izi', metin: 'Lityum koyu kırmızı, kalsiyum tuğla kırmızısı, stronsiyum parlak kırmızı, baryum açık yeşil, bakır mavi-yeşil, potasyum leylak renk verir. Bu renkler havai fişeklerin renkleridir.' } },
      { metin: 'Bu örnekte potasyuma biraz sodyum bulaşmış: <b>KCl + NaCl</b>’yi alevde dene.', ok: dongu('KNa'), kosul: function () { return !!V.test.KNa; }, gecikme: 2600,
        kart: { tur: 'kesif', baslik: 'Sarı, leylağı örttü', metin: 'Potasyumun soluk leylak rengi, sodyumun parlak sarısının arkasında kayboldu. Peki potasyumu nasıl görebiliriz?' } },
      { basla: function () { kob.visible = true; }, metin: function () { return V.kobaltBak ? 'Kobalt camından bakıyorsun. Şimdi <b>KCl + NaCl</b>’yi yeniden dene.' : '<b>Kobalt camına</b> dokun; alevi mavi camın arkasından izle.'; },
        ok: function () { return V.kobaltBak ? dongu('KNa')() : okNesne(kob, 0.62, 0.7); }, kosul: function () { return !!V.test.KNaK; }, gecikme: 2600,
        kart: { tur: 'soru', soru: 'Kobalt camı neden kullanılır?', secenekler: ['Sodyumun sarı ışığını süzer, potasyumun rengini gösterir', 'Alevi daha sıcak yapar', 'Teli temizler'], dogru: 0, aciklama: 'Mavi kobalt camı sarı ışığı geçirmez; sodyum bulaşığının arkasındaki potasyumun leylak (mor) rengi görünür.' } },
      { basla: function () { if (V.kobaltBak) kobaltDokun(); }, metin: 'Son adım: <b>bilinmeyen X</b> örneğini test et.', ok: dongu('X'), kosul: function () { return !!V.test.X; }, gecikme: 2600,
        kart: function () { var sec = karistir(['Li', 'K', 'Ca', 'Sr', 'Ba'].filter(function (x) { return x !== V.X; })).slice(0, 3).concat([V.X]); sec = karistir(sec); return { tur: 'soru', soru: 'X örneği hangi metal iyonunu içeriyor?', secenekler: sec.map(function (x) { return IYAD[x] + ' (' + KAT[x].ad + ')'; }), dogru: sec.indexOf(V.X), aciklama: 'X örneği alevi ' + KAT[V.X].alevAd + ' renge boyadı: ' + IYAD[V.X] + ' iyonu.', ipucu: 'Gözlem tablosundaki renklerle karşılaştır.' }; } }
    ];
    D.ozetSon = ['Hava deliği açık bek mavi, sıcak ve temiz bir alev verir.', 'Metal iyonları alevi kendine özgü renklere boyar; bu renkler elementlerin tanınmasını sağlar.', 'Tel her denemeden önce HCl ile temizlenir; sodyum bulaşığı renkleri örter.', 'Kobalt camı sodyumun sarı ışığını süzer.'];
  }

  /* ================= 2. TEPKİME BELİRTİLERİ ================= */
  function belirtiKur() {
    var D = GI.belirti, V = G.v;
    LA.kapKur([{ tip: 'beher', ad: 'Beher', duzenek: 'yok' }, { tip: 'erlen', ad: 'Erlenmeyer', duzenek: 'yok' }, { tip: 'tup', ad: 'Deney tüpü', duzenek: 'yok' }, { tip: 'beher', ad: 'Beher 2', duzenek: 'yok' }]);
    UC.arkaRaf.visible = false; UC.PISET.visible = false;
    UC.kameraAyar(new T.Vector3(0, 0.62, 0.45), 3.35);
    gozlukKoy(-2.7, 1.25);
    function m(i, id) { var k = kap(i); return k ? (k.eklenen.indexOf(id) >= 0) : false; }
    function V0(i) { return kap(i) ? kap(i).V : 0; }
    D.eylem = function (a) { if (a.indexOf('sise:') === 0) UC.siseAl(a.slice(5)); };
    function adimSise(id, ad, hedef, kosul, metin, kart, gecikme) {
      return { metin: function () { return (siseVar(id) ? 'Şişeyi <b>' + LA.KAPLAR[hedef].ad + '</b> kabının üstüne sürükle.' : metin + ' ' + siseDug(id, ad + ' al')); }, ok: function () { return siseVar(id) ? { kap: hedef } : null; }, kosul: kosul, kart: kart, gecikme: gecikme };
    }
    D.adim = [
      gozlukAdimi(),
      adimSise('hcl', 'HCl', 0, function () { return V0(0) >= 0.008; }, '<b>Gaz çıkışı:</b> Behere 10 mL hidroklorik asit dök.'),
      adimSise('mermer', 'Mermer', 0, function () { var k = kap(0); return m(0, 'mermer') && (k.gazHiz.CO2 || 0) > 1e-6; }, 'Şimdi behere <b>mermer</b> (CaCO₃) parçacıkları ekle.',
        { tur: 'kesif', baslik: 'Gaz çıkışı', metin: 'Kabarcıklar yeni bir maddenin, karbondioksit gazının oluştuğunu gösterir. Gaz çıkışı kimyasal tepkimenin belirtilerinden biridir.', denklem: 'CaCO₃ + 2HCl → CaCl₂ + H₂O + CO₂' }, 1800),
      adimSise('fecl3', 'FeCl₃', 1, function () { return V0(1) >= 0.004; }, '<b>Renk değişimi:</b> Erlene 5 mL demir(III) klorür dök.'),
      adimSise('kscn', 'KSCN', 1, function () { return m(1, 'kscn'); }, 'Şimdi erlene birkaç mL <b>potasyum tiyosiyanat</b> ekle.',
        { tur: 'kesif', baslik: 'Renk değişimi', metin: 'Sarımsı çözelti kan kırmızısına döndü. Yeni bir iyon (FeSCN²⁺) oluştu; renk değişimi de bir tepkime belirtisidir.', denklem: 'Fe³⁺ + SCN⁻ → FeSCN²⁺' }, 1200),
      adimSise('agno3', 'AgNO₃', 2, function () { return V0(2) >= 0.003; }, '<b>Çökelek:</b> Tüpe 5 mL gümüş nitrat dök.'),
      adimSise('nacl', 'NaCl', 2, function () { return m(2, 'nacl'); }, 'Şimdi tüpe biraz <b>sodyum klorür</b> çözeltisi ekle.',
        { tur: 'kesif', baslik: 'Çökelek oluşumu', metin: 'İki berrak çözelti karışınca beyaz bir katı oluştu ve dibe çöktü. Suda çözünmeyen yeni bir katının (AgCl) oluşması tepkime belirtisidir.', denklem: 'Ag⁺ + Cl⁻ → AgCl(k)' }, 1500),
      adimSise('naoh', 'NaOH', 3, function () { return V0(3) >= 0.018; }, '<b>Sıcaklık değişimi:</b> Beher 2’ye 20 mL sodyum hidroksit dök.', null),
      { basla: function () { V.T0 = kap(3).T; LA.kapSec(3); }, metin: function () { return siseVar('hcl') ? 'Şişeyi <b>Beher 2</b> üstüne sürükle ve termometreyi izle.' : 'Şimdi Beher 2’ye 20 mL <b>HCl</b> ekle; termometreyi izle. ' + siseDug('hcl', 'HCl al'); },
        ok: function () { return siseVar('hcl') ? { kap: 3 } : null; }, kosul: function () { return kap(3).T - V.T0 > 3; }, gecikme: 1500,
        kart: function () { return { tur: 'kesif', baslik: 'Sıcaklık değişimi', metin: 'Çözelti ' + Y.tr(kap(3).T - V.T0, 1) + ' °C ısındı. Nötralleşme ısı veren (ekzotermik) bir tepkimedir; sıcaklık değişimi de tepkime belirtisidir.', denklem: 'H⁺ + OH⁻ → H₂O' }; } },
      { basla: function () { UC.siseBirak(); }, metin: 'Gözlemlerini düşün.', kosul: function () { return true; }, gecikme: 200,
        kart: { tur: 'soru', soru: 'Bir tepkime olduğunu en iyi hangisi gösterir?', secenekler: ['Bir şeyin ıslanması', 'Yeni bir madde oluşması', 'Karıştırılması'], dogru: 1, aciklama: 'Kimyasal tepkimede yeni maddeler oluşur. Gaz, renk, çökelek ve sıcaklık değişimi bunun işaretleridir.' } },
      { metin: '', kosul: function () { return true; }, gecikme: 100,
        kart: { tur: 'soru', soru: 'Hangisi kimyasal değişimin belirtisi değildir?', secenekler: ['Gaz çıkışı', 'Buzun erimesi', 'Çökelek oluşması', 'Renk değişimi'], dogru: 1, aciklama: 'Buz erirken yeni madde oluşmaz; su yalnızca hâl değiştirir. Bu fiziksel bir değişimdir.' } }
    ];
    D.ozetSon = ['Gaz çıkışı, renk değişimi, çökelek oluşumu ve sıcaklık değişimi kimyasal tepkime belirtileridir.', 'Kimyasal değişimde yeni maddeler oluşur; hâl değişimi fiziksel değişimdir.'];
  }

  /* ================= 3. ASİTLER VE BAZLAR ================= */
  var DENKLEM_D = null;
  function denklemPanosu() {
    var t = UC.tuval(1024, 300, function (c, w) {
      c.fillStyle = '#FDFDFC'; c.fillRect(0, 0, w, 300);
      c.fillStyle = '#1C1A18'; c.textBaseline = 'middle'; c.textAlign = 'center';
      c.font = '700 54px "IBM Plex Sans", system-ui, sans-serif'; c.fillText('asit + baz → tuz + su', w / 2, 100);
      c.font = '600 34px "IBM Plex Sans", system-ui, sans-serif'; c.fillStyle = '#5C554F'; c.fillText('(nötralleşme)', w / 2, 160);
      c.font = '600 44px "IBM Plex Sans", system-ui, sans-serif'; c.fillStyle = '#1B6B4A'; c.fillText('HCl + NaOH → NaCl + H₂O', w / 2, 232);
    });
    var g = new T.Group(), w = 2.6, hh = w * 300 / 1024;
    var cer = new T.Mesh(new T.BoxGeometry(w + 0.1, hh + 0.1, 0.03), UC.MAT.cerceve); cer.position.z = -0.005; g.add(cer);
    var pl = new T.Mesh(new T.PlaneGeometry(w, hh), new T.MeshStandardMaterial({ map: t, roughness: 0.6 })); pl.position.z = 0.012; g.add(pl);
    return g;
  }
  function asitBazKur() {
    var D = GI.asitbaz, V = G.v;
    var EV = [['limon', 'Limon suyu'], ['su', 'Saf su'], ['nahco3', 'Yemek sodası'], ['naocl', 'Çamaşır suyu']];
    LA.kapKur(EV.map(function (e) { return { tip: 'beher', ad: e[1], duzenek: 'yok' }; }));
    EV.forEach(function (e, i) { M.ekle(kap(i), e[0], 0.06, { sessiz: true }); });
    LA.kapSec(0);
    UC.arkaRaf.visible = false; UC.PISET.visible = false;
    UC.kameraAyar(new T.Vector3(0, 0.62, 0.45), 3.35);
    gozlukKoy(-2.7, 1.25);
    V.faz = 1;
    D.eylem = function (a) {
      if (a.indexOf('sise:') === 0) UC.siseAl(a.slice(5));
      if (a === 'bas') buretKur(true);
    };
    function gosVar(i) { return kap(i) && (kap(i).gos.evr || 0) > 0; }
    function buretKur(yeniden) {
      V.faz = 2; UC.siseBirak();
      LA.kapKur([{ tip: 'erlen', ad: 'Erlenmeyer', duzenek: 'fayans', yerX: 0, yerZ: 0.35 }]);
      M.ekle(kap(0), 'hcl01', 0.025, { sessiz: true }); M.ekle(kap(0), 'evrensel', 0.00025, { sessiz: true });
      LA.kapSec(0);
      UC.kameraAyar(new T.Vector3(0, 1.05, 0.4), 2.4);
      V.eklenen = 0;
      if (yeniden && V.buret) return;
      var kok = sahneyeEkle(grup(0, 0, 0)), z = 0.35;
      var taban = UC.yuvarlakKutu(0.95, 0.05, 0.6, 0.05, UC.MAT.gri); taban.position.set(0.75, 0, -0.25); kok.add(taban);
      var cubuk = new T.Mesh(new T.CylinderGeometry(0.025, 0.025, 3.3, 20), UC.MAT.celik); cubuk.position.set(0.95, 1.65, -0.3); kok.add(cubuk);
      var kol = new T.Mesh(new T.BoxGeometry(0.95, 0.05, 0.06), UC.MAT.gri); kol.position.set(0.48, 2.35, -0.3); kok.add(kol);
      var kol2 = new T.Mesh(new T.BoxGeometry(0.06, 0.05, 0.62), UC.MAT.gri); kol2.position.set(0.02, 2.35, 0.02); kok.add(kol2);
      var bG = grup(0, 1.32, z); kok.add(bG);
      var bc = new T.Mesh(UC.torna([[0, 0], [0.008, 0], [0.012, 0.1], [0.02, 0.2], [0.05, 0.3], [0.05, 2.7], [0.058, 2.72]], 32), UC.MAT.cam); bc.renderOrder = 4; bG.add(bc);
      var musluk = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 0.18, 12), new T.MeshStandardMaterial({ color: 0x2a6fd6, roughness: 0.4 })); musluk.rotation.z = Math.PI / 2; musluk.position.y = 0.24; bG.add(musluk);
      var sivi = new T.Mesh(new T.CylinderGeometry(0.042, 0.042, 1, 20), new T.MeshPhysicalMaterial({ color: 0xdbe9f3, transparent: true, opacity: 0.6, depthWrite: false })); sivi.renderOrder = 2; bG.add(sivi);
      var derece = UC.tuval(64, 512, function (c, w, hh) { c.clearRect(0, 0, w, hh); c.fillStyle = 'rgba(30,30,30,.85)'; for (var i = 0; i <= 50; i++) { var y = 8 + i * (hh - 16) / 50; c.fillRect(0, y, i % 5 ? 18 : 34, i % 5 ? 2 : 3); } });
      var dr = new T.Mesh(new T.CylinderGeometry(0.052, 0.052, 2.2, 16, 1, true, -0.5, 1.0), new T.MeshBasicMaterial({ map: derece, transparent: true, depthWrite: false })); dr.position.y = 1.5; dr.renderOrder = 5; bG.add(dr);
      var damla = new T.Mesh(new T.SphereGeometry(0.018, 10, 8), new T.MeshPhysicalMaterial({ color: 0xdbe9f3, transparent: true, opacity: 0.85 })); damla.visible = false; kok.add(damla);
      var pano = denklemPanosu(); pano.position.set(-1.9, 2.75, -1.985); kok.add(pano);
      V.buret = { g: bG, sivi: sivi, damla: damla };
      etiket(bG, 'Büret: NaOH 0,1 M', 1.75, 'gv-pr');
    }
    D.tut = function (ad, acik) { if (ad === 'akit') V.akit = acik; if (acik) V.tutT = 0; };
    D.guncelle = function (t, dt) {
      if (V.faz !== 2 || !V.buret) return false;
      var B = V.buret, kalan = Math.max(0, 50 - V.eklenen), L = 0.3 + 2.3 * kalan / 50, hareket = false;
      B.sivi.scale.y = L - 0.3; B.sivi.position.y = 0.3 + (L - 0.3) / 2;
      if (V.akit && kap(0)) {
        V.tutT = (V.tutT || 0) + dt;
        var hiz = V.tutT < 1.2 ? 0.6 : Math.min(2.2, 0.6 + (V.tutT - 1.2) * 1.2), ml = hiz * dt;
        V.bir = (V.bir || 0) + ml; V.eklenen += ml;
        if (V.bir >= 0.1) { LA.dokSessiz(0, 'naoh01', V.bir / 1000); V.bir = 0; }
        B.damla.visible = true; var p = (t * 3) % 1; B.damla.position.set(0, 1.32 - p * 0.25, 0.35);
        hareket = true;
      } else B.damla.visible = false;
      return hareket;
    };
    D.adim = [
      gozlukAdimi(),
      { tahmin: { soru: 'Limon suyu sence nasıl bir maddedir?', secenekler: ['Asidik', 'Nötr', 'Bazik'] },
        metin: function () {
          var n = [0, 1, 2, 3].filter(gosVar).length;
          return siseVar('evrensel') ? 'Şişeyi her kabın üstüne sürükle; birkaç damla damlat. (' + n + '/4)' : 'Her kaba <b>evrensel gösterge</b> damlat. ' + siseDug('evrensel', 'Göstergeyi al');
        },
        ok: function () { if (!siseVar('evrensel')) return null; for (var i = 0; i < 4; i++) if (!gosVar(i)) return { kap: i }; return null; },
        kosul: function () { return [0, 1, 2, 3].every(gosVar); }, gecikme: 1600,
        kart: function () { return { tur: 'kesif', baslik: 'Renkler pH’ı gösteriyor', metin: 'Evrensel gösterge her pH için farklı renk verir. Duvardaki pH ölçeğiyle karşılaştır: kırmızı ve turuncu asidik, yeşil nötr, mavi ve mor bazik. Bir kaba dokununca pH metre o kabın değerini gösterir.', tahminId: 1, tahminDogru: 0 }; } },
      { basla: function () { UC.siseBirak(); V.goruldu = {}; }, metin: function () { var n = Object.keys(V.goruldu).length; return 'Kaplara tek tek <b>dokun</b>; pH değerlerini oku. (' + n + '/4)'; },
        ok: function () { for (var i = 0; i < 4; i++) if (!V.goruldu[i]) return { kap: i }; return null; }, kosul: function () { V.goruldu[LA.aktif] = 1; return Object.keys(V.goruldu).length >= 4; }, gecikme: 900,
        kart: { tur: 'soru', soru: 'Hangisi en asidik?', secenekler: ['Limon suyu', 'Saf su', 'Yemek sodası', 'Çamaşır suyu'], dogru: 0, aciklama: 'pH değeri en küçük olan limon suyudur. pH ne kadar küçükse ortam o kadar asidiktir.' } },
      { metin: '', kosul: function () { return true; }, gecikme: 100,
        kart: { tur: 'soru', soru: 'Çamaşır suyunun pH’ı 12 civarında. Bu ne anlama gelir?', secenekler: ['Kuvvetli baziktir', 'Zayıf asidiktir', 'Nötrdür'], dogru: 0, aciklama: 'pH 7’den büyükse ortam baziktir; 12 kuvvetli bazik bir değerdir. Bu yüzden çamaşır suyu cilde zarar verir.' } },
      { basla: function () { buretKur(); }, metin: function () {
          var k = kap(0), ph = k && k.r ? k.r.pH : 1;
          if (ph > 10.3) return 'Fazla kaçtı: çözelti mora döndü, artık bazik. ' + '<button type="button" class="gv-b" data-gva="bas">Baştan başla</button>';
          return 'Bürette NaOH var. Kırmızı rengi <b>yeşile</b> çevir. Turuncu görünce yavaşla, damla damla ekle. <button type="button" class="gv-b gv-tut" data-gvh="akit">Basılı tut: akıt</button><button type="button" class="gv-b" data-gva="damla">1 damla</button>';
        },
        kosul: function () { var k = kap(0); return V.eklenen > 5 && k && k.r && k.r.pH >= 5.5 && k.r.pH <= 10.3 && !V.akit; }, gecikme: 900,
        kart: function () { var ph = kap(0).r.pH; return { tur: 'kesif', baslik: 'Nötralleşme', metin: 'Yaklaşık ' + Y.tr(V.eklenen, 1) + ' mL NaOH ile asit tamamen nötrleşti; tuz ve su oluştu. Eşdeğerlik noktası yakınında tek bir damla pH’ı 4’ten 10’a sıçratabilir; bu yüzden son damlalar tek tek eklenir. Şu anki pH: ' + Y.tr(ph, 1) + '.', denklem: 'HCl + NaOH → NaCl + H₂O' }; } },
      { metin: '', kosul: function () { return true; }, gecikme: 100,
        kart: { tur: 'soru', soru: 'Nötralleşmede hangi maddeler oluşur?', secenekler: ['Tuz ve su', 'Asit ve baz', 'Gaz ve çökelek'], dogru: 0, aciklama: 'Asit + baz → tuz + su. Burada tuz NaCl’dir.' } }
    ];
    var eskiEylem = D.eylem;
    D.eylem = function (a) { if (a === 'damla' && kap(0)) { LA.dokSessiz(0, 'naoh01', 0.00005); V.eklenen = (V.eklenen || 0) + 0.05; return; } eskiEylem(a); };
    D.bitir = function () { V.akit = false; };
    D.ozetSon = ['pH < 7 asidik, pH = 7 nötr, pH > 7 baziktir.', 'Evrensel gösterge pH’a göre kırmızıdan mora kadar renk değiştirir.', 'Asit + baz → tuz + su (nötralleşme).'];
  }

  /* ================= 4. ALKALİ METALLER VE SU ================= */
  function grup1Kur() {
    var D = GI.grup1, V = G.v;
    LA.kapKur([{ tip: 'beher', ad: 'Lityum için', duzenek: 'yok' }, { tip: 'beher', ad: 'Sodyum için', duzenek: 'yok' }, { tip: 'beher', ad: 'Potasyum için', duzenek: 'yok' }]);
    [0, 1, 2].forEach(function (i) { M.ekle(kap(i), 'su', 0.1, { sessiz: true }); M.ekle(kap(i), 'fenol', 0.0001, { sessiz: true }); });
    LA.kapSec(0);
    UC.arkaRaf.visible = false; UC.PISET.visible = false;
    UC.kameraAyar(new T.Vector3(0, 0.62, 0.55), 3.05);
    gozlukKoy(-2.5, 1.3);
    UC.ptSabit(['Li', 'Na', 'K', 'Rb', 'Cs']);
    /* koruyucu ekran */
    var ek = sahneyeEkle(grup(-0.95, 0, -1.05)), ekc = new T.Mesh(new T.BoxGeometry(2.4, 1.5, 0.03), new T.MeshPhysicalMaterial({ color: 0xeaf6ff, transparent: true, opacity: 0.18, roughness: 0.02, clearcoat: 1, depthWrite: false }));
    ekc.position.y = 0.8; ekc.renderOrder = 9; ek.add(ekc);
    var cer = new T.Mesh(new T.BoxGeometry(2.44, 0.05, 0.05), UC.MAT.gri); cer.position.y = 1.55; ek.add(cer);
    [-1.2, 1.2].forEach(function (x) { var a = new T.Mesh(new T.BoxGeometry(0.05, 1.6, 0.05), UC.MAT.gri); a.position.set(x, 0.8, 0); ek.add(a); var f = new T.Mesh(new T.BoxGeometry(0.1, 0.04, 0.5), UC.MAT.gri); f.position.set(x, 0.02, 0); ek.add(f); });
    ek.rotation.y = 0.15; ek.scale.setScalar(0.55);
    hedefKutu(ek, 0.8, 1.6, 0.8);
    var etE = etiket(ek, 'Koruyucu ekran', 1.7, 'gv-pr');
    V.ekran = false;
    dokun(ek, function () { if (V.ekran) return; V.ekran = true; etE.gizli = true; UC.dokunKaldir(ek); tasi(ek, new T.Vector3(0, 0, 1.35), new T.Quaternion(), 0.8, 0.3, null); anim(0.8, function (e) { ek.scale.setScalar(0.55 + 0.45 * e); }); });
    D.eylem = function (a) {
      if (a.indexOf('sise:') === 0) UC.siseAl(a.slice(5));
      if (a === 'buyuk') { UC.siseBirak(); LA.ekle(1, 'na', 1); V.buyuk = true; }
    };
    function var0(i, id) { return kap(i) && kap(i).eklenen.indexOf(id) >= 0; }
    function adimMetal(id, ad, i) {
      return { metin: function () { return siseVar(id) ? 'Metal kavanozunu <b>' + kap(i).ad + '</b> kabının üstüne sürükle ve bırak.' : '<b>' + ad + '</b> parçasını ' + (i + 1) + '. behere at. ' + siseDug(id, ad + ' al'); },
        ok: function () { return siseVar(id) ? { kap: i } : null; }, kosul: function () { return var0(i, id); }, gecikme: 2500 };
    }
    D.adim = [
      gozlukAdimi(),
      { metin: '<b>Koruyucu ekranı</b> kapların önüne yerleştir: ekrana dokun.', ok: okNesne(ek, 1.0, 1.2), kosul: function () { return V.ekran; } },
      (function () { var a = adimMetal('li', 'Lityum', 0); a.tahmin = { soru: 'Hangi metal suyla en şiddetli tepkime verir?', secenekler: ['Lityum', 'Sodyum', 'Potasyum'] }; return a; })(),
      adimMetal('na', 'Sodyum', 1),
      (function () {
        var a = adimMetal('k', 'Potasyum', 2);
        a.kart = function () { return { tur: 'kesif', baslik: 'Aşağı indikçe daha aktif', metin: 'Lityum yavaşça köpürdü, sodyum eriyip suyun üstünde koşturdu, potasyum leylak renkli alevle yandı. Üç beherde de fenolftalein pembeleşti: oluşan hidroksitler bazdır. 1A grubunda aşağı inildikçe aktiflik artar.', denklem: '2M + 2H₂O → 2MOH + H₂   (M: Li, Na, K)', tahminId: 2, tahminDogru: 2 }; };
        a.gecikme = 3200; return a;
      })(),
      { basla: function () { UC.siseBirak(); }, metin: '', kosul: function () { return true; }, gecikme: 100,
        kart: { tur: 'soru', soru: 'Rubidyum (Rb), 1A grubunda potasyumun altındadır. Suyla nasıl tepkime verir?', secenekler: ['Potasyumdan daha şiddetli', 'Lityumdan daha yavaş', 'Hiç tepkime vermez'], dogru: 0, aciklama: 'Grupta aşağı inildikçe dış elektron çekirdekten uzaklaşır ve daha kolay verilir; rubidyum potasyumdan da şiddetli tepkime verir.' } },
      { metin: 'Okulda neden yalnızca küçük parça kullanılır? <button type="button" class="gv-b gv-kirmizi" data-gva="buyuk">Büyük sodyum parçası at (yalnızca sanal!)</button>',
        kosul: function () { return kap(1) && kap(1).kirik; }, gecikme: 2200,
        kart: { tur: 'kesif', baslik: 'Büyük parça patlar', metin: 'Büyük sodyum parçasında ısı dağılamaz; metal erir, çıkan hidrojen tutuşur ve patlar. Gerçek laboratuvarda alkali metaller pirinç tanesi kadar parçalarla, koruyucu ekran arkasında ve öğretmen gözetiminde kullanılır.' } }
    ];
    D.ozetSon = ['Alkali metaller suyla hidrojen gazı ve bazik hidroksitler oluşturur.', '1A grubunda aşağı inildikçe aktiflik artar: Li < Na < K < Rb.', 'Alkali metallerle küçük parça ve koruyucu ekranla çalışılır.'];
  }

  /* ================= 5. ÇÖZELTİLERDE İLETKENLİK ================= */
  function iletkenKur() {
    var D = GI.iletken, V = G.v;
    var C = [['Saf su', [['su', 0.1]]], ['Şekerli su', [['su', 0.1], ['seker', 5]]], ['Sirke', [['sirke', 0.1]]], ['Tuzlu su', [['su', 0.09], ['nacl', 0.01]]]];
    LA.kapKur(C.map(function (c) { return { tip: 'beher', ad: c[0], duzenek: 'yok' }; }));
    C.forEach(function (c, i) { c[1].forEach(function (x) { M.ekle(kap(i), x[0], x[1], { sessiz: true }); }); });
    LA.kapSec(0);
    UC.arkaRaf.visible = false; UC.PISET.visible = false;
    UC.kameraAyar(new T.Vector3(0, 0.75, 0.2), 3.35);
    LA.olcerGizli = true;
    V.dalgin = -1; V.yol = false; V.goruldu = {};
    var kok = sahneyeEkle(grup(0, 0, 0));
    var tahta = UC.yuvarlakKutu(2.2, 0.07, 0.75, 0.04, UC.MAT.ahsap); tahta.position.set(0, 0, -1.15); kok.add(tahta);
    var pil = grup(-0.65, 0.07, -1.15); kok.add(pil);
    var pg = new T.Mesh(new T.BoxGeometry(0.42, 0.56, 0.24), new T.MeshStandardMaterial({ color: 0x23262b, roughness: 0.4 })); pg.position.y = 0.28; pil.add(pg);
    var pu = new T.Mesh(new T.BoxGeometry(0.43, 0.14, 0.245), new T.MeshStandardMaterial({ color: 0xF85300, roughness: 0.4 })); pu.position.y = 0.5; pil.add(pu);
    var pe = new T.Mesh(new T.PlaneGeometry(0.4, 0.2), new T.MeshBasicMaterial({ map: UC.tuval(256, 128, function (c) { c.fillStyle = '#23262b'; c.fillRect(0, 0, 256, 128); c.fillStyle = '#fff'; c.font = '800 70px "IBM Plex Sans", system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('9 V', 128, 66); }) })); pe.position.set(0, 0.26, 0.122); pil.add(pe);
    [-0.09, 0.09].forEach(function (x) { var u = new T.Mesh(new T.CylinderGeometry(0.035, 0.035, 0.05, 12), UC.MAT.krom); u.position.set(x, 0.59, 0); pil.add(u); });
    var amp = grup(0.65, 0.07, -1.15); kok.add(amp);
    var duy = new T.Mesh(new T.CylinderGeometry(0.09, 0.1, 0.16, 20), UC.MAT.gri); duy.position.y = 0.08; amp.add(duy);
    var vida = new T.Mesh(new T.CylinderGeometry(0.07, 0.07, 0.1, 20), UC.MAT.krom); vida.position.y = 0.2; amp.add(vida);
    var ampMat = new T.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, roughness: 0.05, clearcoat: 1, emissive: 0xffc04a, emissiveIntensity: 0, depthWrite: false });
    var cam = new T.Mesh(new T.SphereGeometry(0.17, 32, 24), ampMat); cam.position.y = 0.4; cam.renderOrder = 4; amp.add(cam);
    var flm = new T.Mesh(new T.TorusGeometry(0.04, 0.006, 6, 20, Math.PI), new T.MeshBasicMaterial({ color: 0x8a6a3a })); flm.position.y = 0.38; amp.add(flm);
    var isik = new T.PointLight(0xffc860, 0, 3.5); isik.position.y = 0.45; amp.add(isik);
    var hale = new T.Sprite(new T.SpriteMaterial({ map: UC.yumusakD, color: 0xffd36a, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending })); hale.position.y = 0.4; hale.scale.setScalar(0.9); amp.add(hale);
    var el = grup(0, 1.9, -0.55); kok.add(el);
    var bar = new T.Mesh(new T.BoxGeometry(0.5, 0.07, 0.12), new T.MeshStandardMaterial({ color: 0x30353c, roughness: 0.5 })); el.add(bar);
    [-0.14, 0.14].forEach(function (x) { var r = new T.Mesh(new T.CylinderGeometry(0.032, 0.032, 0.9, 14), new T.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.75 })); r.position.set(x, -0.48, 0); el.add(r); });
    var telMat = new T.MeshStandardMaterial({ color: 0xd8342c, roughness: 0.5 }), tel2Mat = new T.MeshStandardMaterial({ color: 0x1f63c6, roughness: 0.5 });
    var tA = new T.Mesh(new T.BufferGeometry(), telMat), tB = new T.Mesh(new T.BufferGeometry(), tel2Mat); kok.add(tA); kok.add(tB);
    kok.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(-0.56, 0.68, -1.15), new T.Vector3(-0.2, 0.8, -1.25), new T.Vector3(0.3, 0.3, -1.3), new T.Vector3(0.6, 0.12, -1.18)]), 30, 0.014, 6), tel2Mat));
    function tellerKur() {
      var p = el.position, a1 = new T.Vector3(p.x - 0.25, p.y, p.z), b1 = new T.Vector3(p.x + 0.25, p.y, p.z);
      tA.geometry.dispose(); tA.geometry = new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(-0.74, 0.68, -1.15), new T.Vector3(-0.8, 1.2, -1.0), a1.clone().add(new T.Vector3(-0.2, 0.25, 0)), a1]), 30, 0.014, 6);
      tB.geometry.dispose(); tB.geometry = new T.TubeGeometry(new T.CatmullRomCurve3([b1, b1.clone().add(new T.Vector3(0.25, 0.25, 0)), new T.Vector3(0.9, 1.0, -1.0), new T.Vector3(0.72, 0.18, -1.15)]), 30, 0.014, 6);
    }
    tellerKur();
    etiket(amp, 'Ampul', 0.7, 'gv-pr');
    var etEl = etiket(el, 'Grafit elektrotlar', 0.2, 'gv-pr');
    function daldir(i) {
      if (V.yol) return;
      var K = UC.kapBul(i); if (!K) return;
      V.yol = true; V.dalgin = -1; etEl.gizli = true;
      var ust = new T.Vector3(K.kok.position.x, 1.9, K.kok.position.z), alt = new T.Vector3(K.kok.position.x, 1.0, K.kok.position.z);
      tasi(el, ust, null, 0.5, 0.1, function () { tasi(el, alt, null, 0.5, 0, function () { V.yol = false; V.dalgin = i; V.goruldu[i] = 1; }); });
    }
    D.olay = function (tur, veri) { if (tur === 'sec' && G && G.A && !G.kart) daldir(veri.i); };
    D.guncelle = function () {
      tellerKur();
      var k = V.dalgin >= 0 ? kap(V.dalgin) : null, kp = k ? M.iletkenlik(k) : 0;
      var parl = k ? Math.max(0, Math.min(1, Math.log(Math.max(kp, 1e-3) / 0.3) / Math.log(60 / 0.3))) : 0;
      ampMat.emissiveIntensity = parl * 2.4; isik.intensity = parl * 3; hale.material.opacity = parl * 0.9; hale.scale.setScalar(0.5 + parl * 0.9);
      flm.material.color.setHex(parl > 0.05 ? 0xffe9a0 : 0x8a6a3a);
      V.parl = parl;
      return V.yol;
    };
    function adimDal(i, kart) { return { metin: 'Elektrotları <b>' + LA.KAPLAR[i].ad.toLocaleLowerCase('tr') + '</b> kabına daldır: kaba dokun.', ok: function () { return V.yol ? null : { kap: i }; }, kosul: function () { return V.dalgin === i; }, gecikme: 1300, kart: kart }; }
    D.adim = [
      (function () { var a = adimDal(0, { tur: 'kesif', baslik: 'Saf su iletmiyor', metin: 'Ampul yanmadı. Saf suda iyon neredeyse yoktur; elektrik akımını taşıyacak yüklü tanecik olmadığı için iletmez.' }); a.tahmin = { soru: 'Hangi çözeltide ampul en parlak yanar?', secenekler: ['Saf su', 'Şekerli su', 'Sirke', 'Tuzlu su'] }; return a; })(),
      adimDal(1, { tur: 'kesif', baslik: 'Şeker iyon vermez', metin: 'Ampul yine yanmadı. Şeker suda molekül olarak çözünür, iyonlarına ayrışmaz. Bu yüzden şekerli su elektrolit değildir.' }),
      adimDal(2, { tur: 'kesif', baslik: 'Sirke: sönük ışık', metin: 'Ampul sönük yandı. Sirkedeki asetik asit suda yalnızca kısmen iyonlaşır; az iyon az akım demektir. Asetik asit zayıf elektrolittir.', denklem: 'CH₃COOH ⇌ CH₃COO⁻ + H⁺' }),
      adimDal(3, { tur: 'kesif', baslik: 'Tuzlu su: parlak ışık', metin: 'Ampul parlak yandı. NaCl suda tamamen iyonlarına ayrışır; çok sayıda serbest iyon akımı kolayca taşır. NaCl kuvvetli elektrolittir.', denklem: 'NaCl(k) → Na⁺(suda) + Cl⁻(suda)', tahminId: 0, tahminDogru: 3 }),
      { metin: '', kosul: function () { return true; }, gecikme: 100,
        kart: { tur: 'soru', soru: 'Çözeltiler elektriği neyle iletir?', secenekler: ['Serbest iyonlarla', 'Moleküllerle', 'Su buharıyla'], dogru: 0, aciklama: 'Çözeltide akımı, serbestçe hareket eden yüklü tanecikler (iyonlar) taşır.' } },
      { metin: '', kosul: function () { return true; }, gecikme: 100,
        kart: { tur: 'soru', soru: 'Hangisi kuvvetli elektrolittir?', secenekler: ['Şeker', 'Hidroklorik asit (HCl)', 'Saf su'], dogru: 1, aciklama: 'HCl suda tamamen iyonlaşır (H⁺ ve Cl⁻); kuvvetli elektrolittir.' } }
    ];
    D.bitir = function () { LA.olcerGizli = false; };
    D.ozetSon = ['Çözeltide akımı serbest iyonlar taşır.', 'Tamamen iyonlaşan maddeler (NaCl, HCl) kuvvetli, kısmen iyonlaşanlar (CH₃COOH) zayıf elektrolittir.', 'Şeker gibi moleküler maddeler ve saf su elektriği iletmez.'];
  }

  /* ================= 6. ATOM KUR ================= */
  var EL_AD = ['Hidrojen', 'Helyum', 'Lityum', 'Berilyum', 'Bor', 'Karbon', 'Azot', 'Oksijen', 'Flor', 'Neon', 'Sodyum', 'Magnezyum', 'Alüminyum', 'Silisyum', 'Fosfor', 'Kükürt', 'Klor', 'Argon', 'Potasyum', 'Kalsiyum'];
  var EL_S = ['H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne', 'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar', 'K', 'Ca'];
  function dizilim(e) { var L = [], k = [2, 8, 8, 2]; for (var i = 0; i < k.length && e > 0; i++) { var x = Math.min(k[i], e); L.push(x); e -= x; } return L; }
  function ustYaz(n) { var m = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' }; return String(n).split('').map(function (c) { return m[c]; }).join(''); }
  function atomKur() {
    var D = GI.atom, V = G.v;
    LA.kapKur([{ tip: 'beher', gizli: true }]);
    istasyon(true); UC.arkaRaf.visible = false; UC.PISET.visible = false;
    UC.kameraAyar(new T.Vector3(0, 1.0, 0.5), 2.25, new T.Vector3(0.12, 0.42, 1)); UC.oran([1.15, 0.62]);
    V.p = 0; V.n = 0; V.e = 0;
    var kok = sahneyeEkle(grup(0, 0, 0));
    var plat = new T.Mesh(new T.CylinderGeometry(0.85, 0.95, 0.08, 48), new T.MeshStandardMaterial({ color: 0x2a2e35, roughness: 0.5, metalness: 0.3 })); plat.position.set(0, 0.04, 0.05); kok.add(plat);
    var hlk = new T.Mesh(new T.TorusGeometry(0.86, 0.015, 8, 64), new T.MeshBasicMaterial({ color: 0x5ad0ff })); hlk.rotation.x = Math.PI / 2; hlk.position.set(0, 0.085, 0.05); kok.add(hlk);
    var atom = grup(0, 1.3, 0.05); kok.add(atom);
    var cekirdek = grup(); atom.add(cekirdek);
    var kabukG = grup(); atom.add(kabukG);
    var pMat = new T.MeshStandardMaterial({ color: 0xE5484D, roughness: 0.35 }), nMat = new T.MeshStandardMaterial({ color: 0xB8BDC4, roughness: 0.4 }), eMat = new T.MeshStandardMaterial({ color: 0x3B82F6, roughness: 0.3, emissive: 0x0b3a8a, emissiveIntensity: 0.6 });
    pMat.userData.paylasik = nMat.userData.paylasik = eMat.userData.paylasik = true;
    var parG = new T.SphereGeometry(0.075, 20, 14), elG = new T.SphereGeometry(0.045, 14, 10);
    var parca = [], elek = [], kabuk = [];
    var KR = [0.5, 0.78, 1.04, 1.28];
    for (var j = 0; j < 4; j++) { var r = new T.Mesh(new T.TorusGeometry(KR[j], 0.006, 6, 96), new T.MeshBasicMaterial({ color: 0x8fb6e8, transparent: true, opacity: 0.7 })); r.visible = false; kabukG.add(r); kabuk.push(r); }
    function cekKonum(i, N) {
      if (N === 1) return new T.Vector3(0, 0, 0);
      var R = 0.075 * Math.cbrt(N) * 1.05, f = Math.sqrt((i + 0.5) / N), y = 1 - 2 * (i + 0.5) / N, rr = Math.sqrt(Math.max(0, 1 - y * y)), a = i * 2.39996;
      return new T.Vector3(Math.cos(a) * rr * R * f * 1.6, y * R * f * 1.6, Math.sin(a) * rr * R * f * 1.6);
    }
    function cekDuzen() { var N = parca.length; parca.forEach(function (m, i) { m.userData.hedef = cekKonum(i, N); }); }
    var KASE = {};
    [['p', -1.3, 0xE5484D, 'Protonlar', '+1 yük'], ['n', 0, 0xB8BDC4, 'Nötronlar', 'yüksüz'], ['e', 1.3, 0x3B82F6, 'Elektronlar', '−1 yük']].forEach(function (d) {
      var g = grup(d[1], 0, 1.05); kok.add(g);
      var kase = new T.Mesh(UC.torna([[0, 0], [0.18, 0.005], [0.3, 0.06], [0.34, 0.16], [0.35, 0.17]], 40), new T.MeshStandardMaterial({ color: 0xf2f0ec, roughness: 0.5, side: T.DoubleSide })); g.add(kase);
      var mt = d[0] === 'p' ? pMat : (d[0] === 'n' ? nMat : eMat);
      for (var q = 0; q < 9; q++) { var s = new T.Mesh(d[0] === 'e' ? elG : parG, mt); var a = q * 2.1, rr = 0.06 + (q % 3) * 0.07; s.position.set(Math.cos(a) * rr, 0.07 + Math.floor(q / 3) * 0.05, Math.sin(a) * rr); g.add(s); }
      hedefKutu(g, 0.4, 0.4, 0.15); UC.golgeKoy(g, 0, 0, 0.8, 0.8, 0.6);
      var et = grup(0, 0, 0.36); g.add(et);
      etiket(et, '<b>' + d[3] + '</b><small>' + d[4] + '</small>', 0, 'gv-alt gv-kase');
      KASE[d[0]] = g;
      dokun(g, function () { ekle(d[0], 1); });
    });
    D.test = { ekle: ekle };
    var kartEl = document.createElement('div'); kartEl.className = 'gv-atom'; UC.katman.appendChild(kartEl);
    var kontrol = document.createElement('div'); kontrol.className = 'gv-atom-kont';
    kontrol.innerHTML = ['p', 'n', 'e'].map(function (x) { return '<div><button type="button" data-atom="' + x + '-">−</button><span>' + { p: 'Proton', n: 'Nötron', e: 'Elektron' }[x] + '</span><button type="button" data-atom="' + x + '+">+</button></div>'; }).join('');
    UC.katman.appendChild(kontrol);
    kontrol.addEventListener('click', function (e) { var b = e.target.closest('[data-atom]'); if (!b || !G || G.kart) return; var v = b.getAttribute('data-atom'); ekle(v[0], v[1] === '+' ? 1 : -1); });
    function ekle(tur, d) {
      if (d > 0) {
        if (tur === 'p' && V.p >= 20) { mesaj('Bu görevde en fazla 20 proton (kalsiyum) kurabilirsin.'); return; }
        if (tur === 'n' && V.n >= 24) { mesaj('Çok fazla nötron.'); return; }
        if (tur === 'e' && V.e >= Math.min(22, V.p + 3)) { mesaj(V.p ? 'Daha fazla elektron tutamaz.' : 'Önce proton ekle: çekirdek olmadan elektron tutulmaz.'); return; }
        var kp = KASE[tur].position.clone().add(new T.Vector3(0, 0.15, 0)).sub(atom.position);
        if (tur === 'e') { var m = new T.Mesh(elG, eMat); m.position.copy(kp); atom.add(m); m.userData.faz = Math.random() * 6.283; m.userData.gel = 0; elek.push(m); V.e++; }
        else { var m2 = new T.Mesh(parG, tur === 'p' ? pMat : nMat); m2.position.copy(kp); m2.userData.tur = tur; cekirdek.add(m2); if (tur === 'p') { parca.splice(Math.floor(Math.random() * (parca.length + 1)), 0, m2); V.p++; } else { parca.push(m2); V.n++; } cekDuzen(); }
      } else {
        if (tur === 'e') { if (!V.e) return; var x = elek.pop(); atom.remove(x); V.e--; }
        else { var idx = -1; for (var i = parca.length - 1; i >= 0; i--) if (parca[i].userData.tur === tur) { idx = i; break; } if (idx < 0) return; cekirdek.remove(parca[idx]); parca.splice(idx, 1); if (tur === 'p') V.p--; else V.n--; cekDuzen(); }
      }
      kartCiz(); UC.kirli();
    }
    function kartCiz() {
      var p = V.p, n = V.n, e = V.e, yuk = p - e, s;
      if (!p) s = '<div class="gv-at-s">?</div><div><b>Boş atom</b><small>Proton ekleyerek başla</small></div>';
      else {
        var ad = EL_AD[p - 1], sem = EL_S[p - 1], yk = yuk === 0 ? '' : ustYaz(Math.abs(yuk) === 1 ? '' : Math.abs(yuk)) + (yuk > 0 ? '⁺' : '⁻');
        var ANY_AD = { 1: 'Hidrür', 7: 'Nitrür', 8: 'Oksit', 9: 'Florür', 15: 'Fosfür', 16: 'Sülfür', 17: 'Klorür' };
        var baslik = !yuk ? ad + ' atomu' : (yuk > 0 ? ad + ' iyonu (katyon)' : (ANY_AD[p] ? ANY_AD[p] + ' iyonu (anyon)' : ad + ' iyonu (anyon)'));
        s = '<div class="gv-at-s"><sup>' + (p + n) + '</sup><sub>' + p + '</sub>' + sem + '<i>' + yk + '</i></div><div><b>' + baslik + '</b>' +
          '<small>Atom numarası ' + p + ' · Kütle numarası ' + (p + n) + ' · Yük ' + (yuk > 0 ? '+' + yuk : (yuk < 0 ? '−' + Math.abs(yuk) : '0')) + (e ? ' · Dizilim ' + dizilim(e).join(', ') : '') + '</small></div>';
      }
      kartEl.innerHTML = s;
      UC.ptSabit(p ? [EL_S[p - 1]] : []);
    }
    kartCiz();
    D.guncelle = function (t, dt) {
      var hareket = false;
      parca.forEach(function (m) { var hd = m.userData.hedef || new T.Vector3(); if (m.position.distanceTo(hd) > 0.002) { m.position.lerp(hd, Math.min(1, dt * 6)); hareket = true; } });
      var dz = dizilim(elek.length), sira = 0;
      kabuk.forEach(function (r, i) { r.visible = i < dz.length; });
      kabukG.quaternion.copy(UC.kamera.quaternion);
      elek.forEach(function (m) {
        var kb = 0, say = 0, top = 0; for (var q = 0; q < dz.length; q++) { if (sira < top + dz[q]) { kb = q; say = dz[q]; break; } top += dz[q]; }
        var k2 = sira - top, a = k2 / say * 6.283 + t * (0.9 - kb * 0.15);
        var hd = new T.Vector3(Math.cos(a) * KR[kb], Math.sin(a) * KR[kb], 0).applyQuaternion(kabukG.quaternion);
        m.userData.gel = Math.min(1, m.userData.gel + dt * 2.2);
        m.position.lerp(hd, m.userData.gel < 1 ? Math.min(1, dt * 5) : 1);
        sira++; hareket = true;
      });
      atom.rotation.y = 0;
      cekirdek.rotation.y += dt * 0.4;
      return hareket || parca.length > 0;
    };
    D.bitir = function () { if (kartEl.parentNode) kartEl.parentNode.removeChild(kartEl); if (kontrol.parentNode) kontrol.parentNode.removeChild(kontrol); };
    D.adim = [
      { metin: 'Boş atoma bir <b>proton</b> ekle: kırmızı kaseye dokun.', ok: okNesne(KASE.p, 0.45, 0.9), kosul: function () { return V.p >= 1; }, gecikme: 900,
        kart: { tur: 'kesif', baslik: 'Hidrojen!', metin: 'Tek protonlu atom hidrojendir. Elementin kimliğini proton sayısı belirler; buna atom numarası denir.' } },
      { tahmin: { soru: 'İkinci bir proton eklersen ne olur?', secenekler: ['Hâlâ hidrojendir, sadece ağırlaşır', 'Başka bir element olur'] },
        metin: 'Bir <b>proton</b> daha ekle.', ok: okNesne(KASE.p, 0.45, 0.9), kosul: function () { return V.p >= 2; }, gecikme: 900,
        kart: { tur: 'kesif', baslik: 'Helyum oldu', metin: 'Proton sayısı 2 olunca element helyuma dönüştü. Proton sayısı değişirse element de değişir.', tahminId: 1, tahminDogru: 1 } },
      { metin: function () { var y = V.p - V.e; return 'Atomun yükü +' + y + '. Yükü dengelemek için <b>elektron</b> ekle. (' + V.e + '/' + V.p + ')'; }, ok: okNesne(KASE.e, 0.45, 0.9), kosul: function () { return V.p >= 1 && V.e === V.p; }, gecikme: 900,
        kart: { tur: 'kesif', baslik: 'Nötr atom', metin: 'Elektron sayısı proton sayısına eşit olunca atom yüksüz (nötr) olur. Elektronlar çekirdeğin çevresindeki katmanlarda bulunur; ilk katman en fazla 2 elektron alır.' } },
      { metin: function () { return '<b>2 nötron</b> ekle; kütle numarasını izle. (' + V.n + '/2)'; }, ok: okNesne(KASE.n, 0.45, 0.9), kosul: function () { return V.n >= 2; }, gecikme: 900,
        kart: { tur: 'kesif', baslik: 'Kütle numarası', metin: 'Kütle numarası = proton sayısı + nötron sayısı. Nötron eklemek elementi değiştirmez; aynı elementin nötron sayısı farklı atomlarına izotop denir.' } },
      { metin: function () { return 'Şimdi bir <b>karbon</b> atomu kur: 6 proton, 6 nötron, 6 elektron. (p ' + V.p + ' · n ' + V.n + ' · e ' + V.e + ')'; },
        ok: function () { return okNesne(V.p < 6 ? KASE.p : (V.n < 6 ? KASE.n : KASE.e), 0.45, 0.9); }, kosul: function () { return V.p === 6 && V.n === 6 && V.e === 6; }, gecikme: 900,
        kart: { tur: 'kesif', baslik: 'Karbon (C)', metin: '6 proton: atom numarası 6. Kütle numarası 6 + 6 = 12. Elektron dizilimi 2, 4: ilk katmanda 2, ikinci katmanda 4 elektron var.' } },
      { metin: '', kosul: function () { return true; }, gecikme: 100,
        kart: { tur: 'soru', soru: 'Nötr bir sodyum atomu (11 proton) 1 elektron kaybederse ne olur?', secenekler: ['+1 yüklü iyon (Na⁺) olur', 'Neon atomuna dönüşür', 'Kütle numarası 1 azalır'], dogru: 0, aciklama: 'Proton sayısı değişmez, element yine sodyumdur. Bir elektron eksik olduğu için +1 yüklü katyon oluşur.' } },
      { metin: function () { return 'Bir <b>oksit iyonu O²⁻</b> kur: 8 proton, 8 nötron, 10 elektron. (p ' + V.p + ' · n ' + V.n + ' · e ' + V.e + ')'; },
        ok: function () { return okNesne(V.p !== 8 ? KASE.p : (V.n !== 8 ? KASE.n : KASE.e), 0.45, 0.9); }, kosul: function () { return V.p === 8 && V.n === 8 && V.e === 10; }, gecikme: 900,
        kart: { tur: 'kesif', baslik: 'Oksit iyonu (O²⁻)', metin: 'Oksijen 2 elektron alınca −2 yüklü anyon oluşur. Dizilimi 2, 8 olur; dış katmanı soy gaz neon gibi dolar.' } }
    ];
    D.ozetSon = ['Proton sayısı (atom numarası) elementin kimliğini belirler.', 'Kütle numarası = proton + nötron.', 'Nötr atomda elektron sayısı proton sayısına eşittir; elektron veren atom katyon, alan atom anyon olur.'];
  }

  /* ================= 7. KARIŞIMLARI AYIRMA ================= */
  function noktaBulut(n, renk, boy, f) {
    var g = new T.BufferGeometry(), a = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) { var p = f(i); a[i * 3] = p[0]; a[i * 3 + 1] = p[1]; a[i * 3 + 2] = p[2]; }
    g.setAttribute('position', new T.BufferAttribute(a, 3));
    var m = new T.Points(g, new T.PointsMaterial({ color: renk, size: boy, transparent: true, opacity: 1 }));
    m.frustumCulled = false; return m;
  }
  function diskNokta(r, y0, y1) { return function () { var a = Math.random() * 6.283, rr = Math.sqrt(Math.random()) * r; return [Math.cos(a) * rr, y0 + Math.random() * (y1 - y0), Math.sin(a) * rr]; }; }
  function devral(par, P) {
    P.updateMatrixWorld(true); par.updateMatrixWorld(true);
    var at = P.geometry.attributes.position, v = new T.Vector3(), inv = new T.Matrix4().copy(par.matrixWorld).invert();
    for (var i = 0; i < at.count; i++) { v.fromBufferAttribute(at, i).applyMatrix4(P.matrixWorld).applyMatrix4(inv); at.setXYZ(i, v.x, v.y, v.z); }
    at.needsUpdate = true; if (P.parent) P.parent.remove(P);
    P.position.set(0, 0, 0); P.quaternion.identity(); P.scale.set(1, 1, 1); par.add(P);
  }
  function noktaTasi(P, hedefF, sure, cb) {
    var at = P.geometry.attributes.position, a0 = Float32Array.from(at.array), n = at.count, h = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) { var q = hedefF(i); h[i * 3] = q[0]; h[i * 3 + 1] = q[1]; h[i * 3 + 2] = q[2]; }
    anim(sure, function (e, k) {
      for (var i = 0; i < n * 3; i++) at.array[i] = a0[i] + (h[i] - a0[i]) * e;
      for (var j = 0; j < n; j++) at.array[j * 3 + 1] += Math.sin(Math.PI * k) * 0.06 * ((j % 7) / 7);
      at.needsUpdate = true;
    }, cb);
  }
  function lathe(oz, h, sc) { var p = [[0, oz.y0]], n = 12; for (var j = 0; j <= n; j++) { var y = oz.y0 + (h - oz.y0) * j / n; p.push([Math.max(0.001, oz.r(y) - 0.003), y]); } p.push([0, h]); var g = UC.torna(p, 40); if (sc) g.scale(sc, sc, sc); return g; }
  function akisCubugu() { var m = new T.Mesh(new T.CylinderGeometry(0.014, 0.01, 1, 10, 1, true), new T.MeshPhysicalMaterial({ color: 0xd6e8f4, transparent: true, opacity: 0.8, depthWrite: false })); m.visible = false; m.renderOrder = 7; return m; }
  function akisGoster(m, ust, alt) { var uz = Math.max(0.01, ust.y - alt.y); m.visible = true; m.scale.set(1, uz, 1); m.position.set((ust.x + alt.x) / 2, alt.y + uz / 2, (ust.z + alt.z) / 2); }
  function ayirmaKur() {
    var D = GI.ayirma, V = G.v;
    LA.kapKur([{ tip: 'beher', gizli: true }]);
    istasyon(true); UC.arkaRaf.visible = false; UC.PISET.visible = false;
    UC.kameraAyar(new T.Vector3(0.14, 0.6, 0.35), 2.85, new T.Vector3(0.1, 0.5, 1)); UC.oran([0.86, 0.58]);
    V.demir = false; V.beher = false; V.su = 0; V.cozundu = false; V.suzuldu = false; V.dokuldu = false; V.buhar = false; V.yol = false; V.alev = false;
    var kok = sahneyeEkle(grup());
    /* karışım kabı */
    var kab = grup(-1.62, 0, 0.82); kok.add(kab);
    var kc = new T.Mesh(UC.torna([[0, 0], [0.4, 0], [0.41, 0.01], [0.41, 0.07], [0.42, 0.075]], 48), UC.MAT.camKalin); kc.renderOrder = 4; kab.add(kc);
    hedefKutu(kab, 0.45, 0.25, 0.08); UC.golgeKoy(kab, 0, 0, 0.95, 0.95, 0.6);
    var kum = noktaBulut(260, 0xd4b47a, 0.028, diskNokta(0.33, 0.012, 0.03)), tuz = noktaBulut(110, 0xfafafa, 0.036, diskNokta(0.33, 0.014, 0.034)), demir = noktaBulut(120, 0x45484d, 0.022, diskNokta(0.33, 0.014, 0.034));
    kab.add(kum); kab.add(tuz); kab.add(demir);
    var etKab = etiket(grup(0, 0, 0.47), '<b>tuz + kum + demir</b>', 0, 'gv-alt'); kab.add(etKab.nesne);
    /* mıknatıs */
    var mk = grup(-2.35, 0.06, 0.0); kok.add(mk);
    var uEgri = new T.CatmullRomCurve3([new T.Vector3(0.12, 0, 0), new T.Vector3(0.12, 0.2, 0), new T.Vector3(0.085, 0.285, 0), new T.Vector3(0, 0.32, 0), new T.Vector3(-0.085, 0.285, 0), new T.Vector3(-0.12, 0.2, 0), new T.Vector3(-0.12, 0, 0)]);
    var uM = new T.Mesh(new T.TubeGeometry(uEgri, 40, 0.045, 12), UC.MAT.kirmizi); mk.add(uM);
    [-0.12, 0.12].forEach(function (x) { var u = new T.Mesh(new T.CylinderGeometry(0.047, 0.047, 0.07, 14), UC.MAT.krom); u.position.set(x, -0.02, 0); mk.add(u); });
    hedefKutu(mk, 0.25, 0.45, 0.15);
    var mkQ0 = new T.Quaternion().setFromEuler(new T.Euler(-Math.PI / 2, 0, 0.4)); mk.quaternion.copy(mkQ0); var mkP0 = mk.position.clone();
    etiket(mk, 'Mıknatıs', 0.15, 'gv-pr').gizli = false;
    /* beher */
    var bh = grup(-0.5, 0, -0.2); kok.add(bh);
    var bc = new T.Mesh(UC.torna([[0, 0], [0.3, 0], [0.31, 0.01], [0.31, 0.75], [0.33, 0.77]], 48), UC.MAT.cam); bc.renderOrder = 4; bh.add(bc);
    var suM = new T.Mesh(UC.torna([[0, 0.012], [0.298, 0.012], [0.298, 1], [0, 1]], 40), new T.MeshPhysicalMaterial({ color: 0xd5e9f6, transparent: true, opacity: 0.5, depthWrite: false })); suM.renderOrder = 2; suM.scale.y = 0.001; suM.visible = false; bh.add(suM);
    var baget = new T.Mesh(new T.CylinderGeometry(0.012, 0.012, 0.95, 10), UC.MAT.camKalin); baget.visible = false; baget.renderOrder = 5; bh.add(baget);
    hedefKutu(bh, 0.38, 0.8, 0.38); UC.golgeKoy(bh, 0, 0, 0.8, 0.8, 0.65);
    var eB = grup(0, 0, 0.42); bh.add(eB); etiket(eB, 'Beher', 0, 'gv-alt');
    /* süzme düzeneği */
    var sz = grup(0.75, 0, -0.35); kok.add(sz);
    var sTaban = UC.yuvarlakKutu(0.6, 0.05, 0.5, 0.05, UC.MAT.gri); sTaban.position.set(0.32, 0, -0.1); sz.add(sTaban);
    var sCubuk = new T.Mesh(new T.CylinderGeometry(0.022, 0.022, 1.6, 16), UC.MAT.celik); sCubuk.position.set(0.48, 0.8, -0.18); sz.add(sCubuk);
    var hlk2 = new T.Mesh(new T.TorusGeometry(0.27, 0.014, 8, 40), UC.MAT.celik); hlk2.rotation.x = Math.PI / 2; hlk2.position.y = 1.24; sz.add(hlk2);
    var kol = new T.Mesh(new T.CylinderGeometry(0.014, 0.014, 0.25, 8), UC.MAT.celik); kol.rotation.z = Math.PI / 2; kol.position.set(0.37, 1.24, -0.09); kol.rotation.y = 0.6; sz.add(kol);
    var huni = new T.Mesh(UC.torna([[0.018, 0.7], [0.022, 0.7], [0.022, 1.0], [0.04, 1.02], [0.29, 1.32], [0.3, 1.33]], 40), UC.MAT.camKalin); huni.renderOrder = 5; sz.add(huni);
    var kagit = new T.Mesh(UC.torna([[0.02, 1.04], [0.26, 1.3], [0.265, 1.31]], 32), new T.MeshStandardMaterial({ color: 0xfbfaf6, roughness: 0.95, side: T.DoubleSide })); sz.add(kagit);
    var oz = UC.ozellik('erlen'), ER = 0.68, er = grup(0, 0, 0); sz.add(er);
    var ec = new T.Mesh(UC.torna(oz.dis, 64), UC.MAT.cam); ec.scale.setScalar(ER); ec.renderOrder = 4; er.add(ec);
    var eSu = new T.Mesh(new T.BufferGeometry(), new T.MeshPhysicalMaterial({ color: 0xd5e9f6, transparent: true, opacity: 0.55, depthWrite: false })); eSu.visible = false; eSu.renderOrder = 2; er.add(eSu);
    hedefKutu(er, 0.34, 0.8, 0.4); UC.golgeKoy(sz, 0, 0, 0.9, 0.9, 0.6);
    var etEr = etiket(grup(0, 0, 0.38), 'Süzüntü', 0, 'gv-alt'); er.add(etEr.nesne); etEr.gizli = true;
    /* buharlaştırma */
    var bu = grup(2.2, 0, 0.3); kok.add(bu);
    var sac = UC.sacayagi(); bu.add(sac);
    var lam = UC.ispirtoOcagi(); bu.add(lam.g);
    var kapsul = new T.Mesh(UC.torna([[0, 0.962], [0.13, 0.965], [0.24, 0.99], [0.31, 1.04], [0.325, 1.055]], 40), new T.MeshStandardMaterial({ color: 0xf6f4ef, roughness: 0.35, side: T.DoubleSide })); bu.add(kapsul);
    var kSu = new T.Mesh(new T.CylinderGeometry(0.27, 0.19, 0.04, 32), new T.MeshPhysicalMaterial({ color: 0xd5e9f6, transparent: true, opacity: 0.6, depthWrite: false })); kSu.position.y = 0.99; kSu.visible = false; bu.add(kSu);
    var kristal = noktaBulut(90, 0xffffff, 0.04, diskNokta(0.2, 0.972, 0.985)); kristal.material.opacity = 0; bu.add(kristal);
    var buhar = []; for (var j = 0; j < 7; j++) { var sp = new T.Sprite(new T.SpriteMaterial({ map: UC.yumusakD, color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })); sp.userData.f = j / 7; bu.add(sp); buhar.push(sp); }
    hedefKutu(lam.g, 0.3, 0.6, 0.3);
    var etLam = etiket(lam.g, 'İspirto ocağı', 0.62, 'gv-pr'); etLam.gizli = true;
    var akis = akisCubugu(); kok.add(akis);
    D.eylem = function (a) {
      if (a === 'su' && V.beher && !V.su && !V.yol) { V.yol = true; suM.visible = true; anim(1.6, function (e) { suM.scale.y = 0.001 + 0.45 * e; akisGoster(akis, new T.Vector3(-0.42, 1.25, -0.2), new T.Vector3(-0.42, 0.012 + 0.45 * e, -0.2)); }, function () { akis.visible = false; V.su = 1; V.yol = false; }); }
      if (a === 'kar' && V.su && !V.cozundu && !V.yol) {
        V.yol = true; baget.visible = true;
        anim(2.6, function (e, k) {
          var a2 = k * 6.283 * 4; baget.position.set(Math.cos(a2) * 0.12, 0.5, Math.sin(a2) * 0.12); baget.rotation.set(Math.sin(a2) * 0.2, 0, -Math.cos(a2) * 0.2);
          tuz.material.opacity = 1 - e; kum.rotation.y = k * 6;
        }, function () { baget.visible = false; tuz.visible = false; V.cozundu = true; V.yol = false; });
      }
    };
    function miknatisDokun() {
      if (V.demir || V.yol) return;
      V.yol = true;
      var qDik = new T.Quaternion().setFromEuler(new T.Euler(Math.PI, 0, 0));
      tasi(mk, new T.Vector3(-1.62, 0.5, 0.82), qDik, 0.7, 0.2, function () {
        anim(1.0, function (e) { mk.position.x = -1.62 + Math.sin(e * Math.PI * 2) * 0.16; }, function () {
          var uc1 = kab.worldToLocal(mk.localToWorld(new T.Vector3(0.12, -0.05, 0))), uc2 = kab.worldToLocal(mk.localToWorld(new T.Vector3(-0.12, -0.05, 0)));
          noktaTasi(demir, function (i) { var u = i % 2 ? uc1 : uc2; return [u.x + (Math.random() - 0.5) * 0.08, u.y - Math.random() * 0.06, u.z + (Math.random() - 0.5) * 0.08]; }, 0.7, function () {
            devral(mk, demir);
            tasi(mk, mkP0.clone().add(new T.Vector3(0, 0.02, 0)), mkQ0, 0.8, 0.2, function () { V.demir = true; V.yol = false; });
          });
        });
      });
    }
    function kabDokun() {
      if (!V.demir || V.beher || V.yol) { if (!V.demir) mesaj('Önce demir tozunu mıknatısla ayır.'); return; }
      V.yol = true;
      var p0 = kab.position.clone(), q0 = kab.quaternion.clone(), qe = new T.Quaternion().setFromEuler(new T.Euler(0, 0, -1.1));
      tasi(kab, new T.Vector3(-0.9, 1.15, -0.2), qe, 0.8, 0.2, function () {
        devral(bh, kum); devral(bh, tuz);
        var dn = diskNokta(0.26, 0.016, 0.05);
        noktaTasi(kum, dn, 0.7); noktaTasi(tuz, dn, 0.7, function () {
          tasi(kab, p0, q0, 0.7, 0.15, function () { V.beher = true; V.yol = false; });
        });
      });
    }
    function beherDokun() {
      if (!V.cozundu || V.suzuldu || V.yol) { if (V.su && !V.cozundu) mesaj('Önce cam bagetle karıştır.'); return; }
      V.yol = true;
      var p0 = bh.position.clone(), q0 = bh.quaternion.clone(), qe = new T.Quaternion().setFromEuler(new T.Euler(0, 0, -1.55));
      tasi(bh, new T.Vector3(1.5, 1.52, -0.35), qe, 0.9, 0.3, function () {
        var huniUst = sz.localToWorld(new T.Vector3(0.05, 1.3, 0)), dudak = bh.localToWorld(new T.Vector3(0.31, 0.77, 0));
        devral(sz, kum);
        noktaTasi(kum, function () { var a = Math.random() * 6.283, y = 1.06 + Math.random() * 0.18, rr = (y - 1.04) * 0.9 * Math.random(); return [Math.cos(a) * rr, y, Math.sin(a) * rr]; }, 1.4);
        eSu.visible = true; etEr.gizli = false;
        anim(3.2, function (e) {
          suM.scale.y = Math.max(0.001, 0.45 * (1 - e)); suM.visible = e < 0.98;
          akisGoster(akis, dudak, huniUst);
          var hgt = oz.y0 + 0.32 * e; eSu.geometry.dispose(); eSu.geometry = lathe(oz, hgt, ER);
        }, function () {
          akis.visible = false;
          tasi(bh, p0, q0, 0.8, 0.2, function () { V.suzuldu = true; V.yol = false; });
        });
      });
    }
    function erlenDokun() {
      if (!V.suzuldu || V.dokuldu || V.yol) return;
      V.yol = true;
      var p0 = er.position.clone(), q0 = er.quaternion.clone(), qe = new T.Quaternion().setFromEuler(new T.Euler(0, 0, -1.7));
      var hedef = sz.worldToLocal(new T.Vector3(2.2 - 0.62, 1.35, 0.3));
      tasi(er, hedef, qe, 0.9, 0.3, function () {
        var dudak = er.localToWorld(new T.Vector3(0.15 * ER, 1.12 * ER, 0)); kSu.visible = true; kSu.scale.set(0.1, 1, 0.1);
        anim(2.0, function (e) {
          akisGoster(akis, dudak, new T.Vector3(2.15, 1.0, 0.3));
          var hgt = oz.y0 + 0.32 * (1 - e); eSu.geometry.dispose(); eSu.geometry = lathe(oz, Math.max(oz.y0 + 0.002, hgt), ER); eSu.visible = e < 0.98;
          var s0 = 0.1 + 0.9 * e; kSu.scale.set(s0, 1, s0);
        }, function () { akis.visible = false; etEr.gizli = true; tasi(er, p0, q0, 0.8, 0.2, function () { V.dokuldu = true; V.yol = false; }); });
      });
    }
    function lambaDokun() {
      if (!V.dokuldu || V.alev) { if (!V.dokuldu) mesaj('Önce süzüntüyü buharlaştırma kabına dök.'); return; }
      V.alev = true; lam.alev.visible = true;
      anim(6.5, function (e) {
        var s0 = Math.max(0.02, 1 - e); kSu.scale.set(0.35 + 0.65 * s0, s0, 0.35 + 0.65 * s0); kSu.material.opacity = 0.6 * s0 + 0.05;
        kristal.material.opacity = Math.max(0, (e - 0.55) / 0.45);
      }, function () { kSu.visible = false; V.buhar = true; lam.alev.visible = false; V.alev = false; });
    }
    dokun(mk, miknatisDokun); dokun(kab, kabDokun); dokun(bh, beherDokun); dokun(er, erlenDokun); dokun(lam.g, lambaDokun);
    D.test = { miknatis: miknatisDokun, kab: kabDokun, beher: beherDokun, erlen: erlenDokun, lamba: lambaDokun };
    D.guncelle = function (t, dt) {
      var h = false;
      if (lam.alev.visible) { var f = 1 + Math.sin(t * 23) * 0.06; lam.dis.scale.set(1, f, 1); lam.isik.intensity = 0.9; h = true; } else lam.isik.intensity = 0;
      buhar.forEach(function (sp, i) { var ph = (t * 0.35 + sp.userData.f) % 1; sp.position.set(Math.sin(t + i) * 0.12, 1.06 + ph * 0.7, Math.cos(t * 0.7 + i) * 0.08); sp.scale.setScalar(0.12 + ph * 0.3); sp.material.opacity = V.alev ? 0.4 * (1 - ph) : 0; });
      etLam.gizli = !(G && G.okSon && G.okSon.nesne === lam.g);
      return h || V.alev;
    };
    D.adim = [
      gozlukAdimi(),
      { metin: 'Kapta tuz, kum ve demir tozu karışımı var. <b>Mıknatısa</b> dokun ve karışımın üstünde gezdir.', ok: okNesne(mk, 0.3, 0.7), kosul: function () { return V.demir; }, gecikme: 600,
        kart: { tur: 'kesif', baslik: 'Mıknatısla ayırma', metin: 'Demir tozu mıknatısa yapıştı; tuz ve kum yerinde kaldı. Manyetik özellik farkı kullanılarak demir karışımdan ayrıldı.' } },
      { metin: 'Kalan tuz–kum karışımını <b>behere</b> boşalt: kaba dokun.', ok: okNesne(kab, 0.25, 0.9), kosul: function () { return V.beher; } },
      { metin: 'Behere <b>su</b> ekle. <button type="button" class="gv-b" data-gva="su">Su ekle</button>', ok: okNesne(bh, 0.95, 0.7), kosul: function () { return V.su > 0; } },
      { tahmin: { soru: 'Karıştırınca ne olur?', secenekler: ['Tuz da kum da çözünür', 'Yalnız tuz çözünür', 'Hiçbiri çözünmez'] },
        metin: 'Cam bagetle <b>karıştır</b>. <button type="button" class="gv-b" data-gva="kar">Karıştır</button>', ok: okNesne(bh, 0.95, 0.7), kosul: function () { return V.cozundu; }, gecikme: 500,
        kart: { tur: 'kesif', baslik: 'Çözünme farkı', metin: 'Tuz suda çözünüp gözden kayboldu; kum çözünmedi ve dibe çöktü. Bu farkı kullanarak kumu ayırabiliriz.', tahminId: 4, tahminDogru: 1 } },
      { metin: '<b>Süz:</b> beheri süzgeç kâğıdının üstüne boşalt: behere dokun.', ok: okNesne(bh, 0.95, 0.7), kosul: function () { return V.suzuldu; }, gecikme: 500,
        kart: { tur: 'kesif', baslik: 'Süzme', metin: 'Kum süzgeç kâğıdında kaldı; tuzlu su (süzüntü) kâğıttan geçip erlene aktı. Süzme, sıvı ile içinde çözünmeyen katıyı ayırır.' } },
      { metin: 'Süzüntüyü <b>buharlaştırma kapsülüne</b> dök: erlene dokun.', ok: okNesne(er, 0.85, 0.7), kosul: function () { return V.dokuldu; } },
      { metin: 'Altındaki <b>ispirto ocağını</b> yak: ocağa dokun.', ok: okNesne(lam.g, 0.65, 0.7), kosul: function () { return V.buhar; }, gecikme: 600,
        kart: { tur: 'kesif', baslik: 'Buharlaştırma', metin: 'Su buharlaşıp uçtu, kapsülde beyaz tuz kristalleri kaldı. Çözünmüş bir katı, çözücü buharlaştırılarak elde edilir.' } },
      { metin: '', kosul: function () { return true; }, gecikme: 100,
        kart: { tur: 'soru', soru: 'Tuzlu sudan tuzu elde etmek için hangi yöntem kullanılır?', secenekler: ['Buharlaştırma', 'Süzme', 'Mıknatısla ayırma'], dogru: 0, aciklama: 'Tuz suda çözündüğü için süzgeçten geçer; su buharlaştırılınca tuz geride kalır.' } },
      { metin: '', kosul: function () { return true; }, gecikme: 100,
        kart: { tur: 'soru', soru: 'Zeytinyağı ve su karışımı nasıl ayrılır?', secenekler: ['Ayırma hunisiyle', 'Mıknatısla', 'Buharlaştırarak'], dogru: 0, aciklama: 'Birbirinde çözünmeyen ve yoğunlukları farklı sıvılar ayırma hunisinde iki katman oluşturur; alttaki sıvı musluktan akıtılır.' } }
    ];
    D.ozetSon = ['Mıknatıs manyetik maddeleri (demir) ayırır.', 'Süzme, sıvıdan çözünmeyen katıyı ayırır.', 'Buharlaştırma, çözünmüş katıyı çözücüden ayırır.', 'Karışmayan sıvılar ayırma hunisiyle ayrılır.'];
  }

  /* ================= 8. YAKMA: METAL VE AMETAL OKSİTLERİ ================= */
  function yakmaKur() {
    var D = GI.yakma, V = G.v;
    LA.kapKur([{ tip: 'beher', gizli: true }]);
    istasyon(true); UC.arkaRaf.visible = false; UC.PISET.visible = false;
    UC.kameraAyar(new T.Vector3(0, 0.6, 0.3), 2.45, new T.Vector3(0.12, 0.52, 1)); UC.oran([0.88, 0.58]);
    V.mg = 'dur'; V.kul = false; V.s = 'dur'; V.sAsit = false; V.flas = 0;
    var kok = sahneyeEkle(grup());
    var altlik = UC.yuvarlakKutu(1.0, 0.03, 1.0, 0.05, new T.MeshStandardMaterial({ color: 0xf1eee9, roughness: 0.9 })); altlik.position.set(0, 0, -0.15); kok.add(altlik);
    var bek = UC.bekYap(true); bek.g.position.set(0, 0.03, -0.15); kok.add(bek.g); bek.alev.visible = true;
    var parla = new T.Sprite(new T.SpriteMaterial({ map: UC.yumusakD, color: 0xffffff, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false })); parla.position.set(0, 0.95, -0.15); parla.renderOrder = 10; kok.add(parla);
    var duman = []; for (var j = 0; j < 8; j++) { var sp = new T.Sprite(new T.SpriteMaterial({ map: UC.yumusakD, color: 0xf4f4f4, transparent: true, opacity: 0, depthWrite: false })); sp.userData.f = j / 8; kok.add(sp); duman.push(sp); }
    /* beherler (görsel) */
    function beher(x, z, renk, ad) {
      var g = grup(x, 0, z); kok.add(g);
      var c = new T.Mesh(UC.torna([[0, 0], [0.3, 0], [0.31, 0.01], [0.31, 0.7], [0.33, 0.72]], 48), UC.MAT.cam); c.renderOrder = 4; g.add(c);
      var s = new T.Mesh(UC.torna([[0, 0.012], [0.298, 0.012], [0.298, 0.42], [0, 0.42]], 40), new T.MeshPhysicalMaterial({ color: renk, transparent: true, opacity: 0.55, depthWrite: false })); s.renderOrder = 2; g.add(s);
      hedefKutu(g, 0.38, 0.8, 0.38); UC.golgeKoy(g, 0, 0, 0.8, 0.8, 0.65);
      etiket(g, ad, 0.92);
      return { g: g, s: s };
    }
    var bA = beher(-1.7, -0.35, 0xe7f1f8, 'Fenolftaleinli su'), bB = beher(1.7, -0.35, 0x5dbb46, 'Göstergeli su');
    /* maşa ve magnezyum */
    var masa = grup(-0.95, 0.04, 0.55); kok.add(masa);
    var mi = grup(); masa.add(mi);
    [-1, 1].forEach(function (s) { var kol = new T.Mesh(new T.BoxGeometry(0.62, 0.02, 0.025), UC.MAT.celik); kol.position.set(-0.33, 0, s * 0.03); kol.rotation.y = s * 0.05; mi.add(kol); });
    var mgS = new T.Mesh(new T.BoxGeometry(0.3, 0.004, 0.035), UC.metalMat('Mg')); mgS.position.set(0.13, 0, 0); mi.add(mgS);
    var kulM = new T.Mesh(new T.BoxGeometry(0.22, 0.03, 0.05), new T.MeshStandardMaterial({ color: 0xf7f7f5, roughness: 1 })); kulM.position.set(0.1, 0, 0); kulM.visible = false; mi.add(kulM);
    var mgHedef = new T.Mesh(new T.BoxGeometry(0.9, 0.25, 0.25), new T.MeshBasicMaterial({ visible: false })); mgHedef.position.x = -0.2; mi.add(mgHedef);
    masa.rotation.y = 0.4; var masaP0 = masa.position.clone(), masaQ0 = masa.quaternion.clone();
    var etMasa = etiket(masa, 'Maşa + Mg', 0.12, 'gv-pr');
    /* yakma kaşığı ve kükürt */
    var kas = grup(0.95, 0.04, 0.55); kok.add(kas);
    var ki = grup(); kas.add(ki);
    var sap = new T.Mesh(new T.CylinderGeometry(0.01, 0.01, 0.7, 8), UC.MAT.celik); sap.rotation.z = Math.PI / 2; sap.position.x = 0.36; ki.add(sap);
    var kasik = new T.Mesh(new T.SphereGeometry(0.06, 16, 8, 0, 6.283, Math.PI / 2, Math.PI / 2), new T.MeshStandardMaterial({ color: 0x9aa0a6, metalness: 0.8, roughness: 0.35, side: T.DoubleSide })); ki.add(kasik);
    var kukurt = new T.Mesh(new T.SphereGeometry(0.045, 12, 8), new T.MeshStandardMaterial({ color: 0xf2d43a, roughness: 0.8 })); kukurt.scale.y = 0.5; kukurt.position.y = -0.01; ki.add(kukurt);
    var sAlev = new T.Sprite(new T.SpriteMaterial({ map: UC.yumusakD, color: 0x4f6bff, transparent: true, opacity: 0, depthWrite: false })); sAlev.scale.set(0.12, 0.16, 1); sAlev.position.y = 0.06; ki.add(sAlev);
    var kasHedef = new T.Mesh(new T.BoxGeometry(0.85, 0.25, 0.25), new T.MeshBasicMaterial({ visible: false })); kasHedef.position.x = 0.3; ki.add(kasHedef);
    kas.rotation.y = -0.35; var kasP0 = kas.position.clone(), kasQ0 = kas.quaternion.clone();
    var etKas = etiket(kas, 'Kaşık + kükürt', 0.12, 'gv-pr');
    var alevN = grup(0, 0.95, -0.15); kok.add(alevN);
    function masaDokun() {
      if (V.mg === 'dur') {
        V.mg = 'yolda'; etMasa.gizli = true;
        tasi(masa, new T.Vector3(-0.12, 0.88, -0.1), new T.Quaternion().setFromEuler(new T.Euler(0, 0.25, 0.25)), 0.8, 0.25, function () {
          V.mg = 'yaniyor'; tezgahEl.classList.add('gv-flas');
          anim(3.0, function (e, k) { parla.material.opacity = Math.min(1, k * 6) * (1 - Math.pow(k, 4)); parla.scale.setScalar(1.6 + Math.sin(k * 60) * 0.15); mgS.scale.x = 1 - e * 0.7; mgS.position.x = 0.13 + 0.1 * e; V.duman = 1; }, function () {
            tezgahEl.classList.remove('gv-flas'); mgS.visible = false; kulM.visible = true; parla.material.opacity = 0; V.mg = 'kul'; V.duman = 0.5;
            tasi(masa, new T.Vector3(-0.5, 0.95, 0.3), null, 0.6, 0.1, null);
          });
        });
      } else if (V.mg === 'kul') kulAt();
    }
    function kulAt() {
      if (V.mg !== 'kul' || V.kul) return;
      V.mg = 'yolda';
      tasi(masa, new T.Vector3(-1.6, 0.92, -0.35), null, 0.8, 0.2, function () {
        var d = kulM.getWorldPosition(new T.Vector3());
        anim(0.5, function (e) { kulM.position.y = -e * 0.4; }, function () {
          kulM.visible = false;
          var c0 = bA.s.material.color.clone(), c1 = new T.Color(0xe0389a);
          anim(2.2, function (e) { bA.s.material.color.copy(c0).lerp(c1, e); bA.s.material.opacity = 0.55 + 0.25 * e; }, function () { V.kul = true; tasi(masa, masaP0, masaQ0, 0.8, 0.2, function () { V.mg = 'bitti'; }); });
        });
      });
    }
    function kasDokun() {
      if (V.s === 'dur') {
        V.s = 'yolda'; etKas.gizli = true;
        tasi(kas, new T.Vector3(0.0, 0.82, -0.12), null, 0.8, 0.25, function () { V.s = 'yaniyor'; sAlev.material.opacity = 0.85; V.duman = 0.6; bekle(1600, function () { tasi(kas, new T.Vector3(0.6, 1.0, 0.25), null, 0.5, 0.1, function () { V.s = 'elde'; }); }); });
      } else if (V.s === 'elde') {
        V.s = 'yolda';
        tasi(kas, new T.Vector3(1.7, 0.82, -0.35), null, 0.8, 0.2, function () {
          var c0 = bB.s.material.color.clone(), c1 = new T.Color(0xe8572a);
          anim(3.0, function (e) { bB.s.material.color.copy(c0).lerp(c1, e); }, function () { V.sAsit = true; sAlev.material.opacity = 0; V.duman = 0; tasi(kas, kasP0, kasQ0, 0.8, 0.2, function () { V.s = 'bitti'; }); });
        });
      }
    }
    dokun(masa, masaDokun); dokun(bA.g, kulAt); dokun(kas, kasDokun); dokun(bB.g, function () { if (V.s === 'elde') kasDokun(); });
    D.test = { masa: masaDokun, kul: kulAt, kasik: kasDokun };
    D.guncelle = function (t, dt) {
      var f = 1 + Math.sin(t * 29) * 0.05; bek.dis.scale.set(1, f, 1); bek.ic.scale.set(1, 2 - f, 1); bek.isik.intensity = 0.5;
      if (V.s === 'yaniyor' || V.s === 'elde' || (V.s === 'yolda' && sAlev.material.opacity > 0)) sAlev.scale.set(0.12 + Math.sin(t * 20) * 0.02, 0.16 + Math.sin(t * 13) * 0.03, 1);
      duman.forEach(function (sp, i) {
        var ph = (t * 0.3 + sp.userData.f) % 1, kaynak = V.mg === 'yaniyor' ? masa : kas;
        var p = kaynak.position; sp.position.set(p.x + Math.sin(t + i) * 0.1, p.y + 0.1 + ph * 0.8, p.z + Math.cos(t * 0.7 + i) * 0.08);
        sp.scale.setScalar(0.15 + ph * 0.4); sp.material.opacity = (V.duman || 0) * 0.45 * (1 - ph);
      });
      return true;
    };
    D.bitir = function () { tezgahEl.classList.remove('gv-flas'); };
    D.adim = [
      gozlukAdimi(),
      { metin: 'Bek yanıyor. <b>Maşaya</b> dokun: magnezyum şeridi aleve sok.', ok: okNesne(masa, 0.2, 0.8), kosul: function () { return V.mg === 'kul'; }, gecikme: 500,
        kart: { tur: 'kesif', baslik: 'Göz kamaştıran ışık', metin: 'Magnezyum havadaki oksijenle göz kamaştırıcı beyaz bir ışıkla yandı ve beyaz magnezyum oksit (MgO) külü oluştu. Gerçekte bu ışığa doğrudan bakılmaz.', denklem: '2Mg + O₂ → 2MgO' } },
      { metin: 'Külü <b>fenolftaleinli suya</b> at: behere dokun.', ok: okNesne(bA.g, 0.85, 0.8), kosul: function () { return V.kul; }, gecikme: 500,
        kart: { tur: 'kesif', baslik: 'Metal oksit: bazik', metin: 'Su pembeleşti: magnezyum oksit suyla magnezyum hidroksit (baz) oluşturdu. Metal oksitler suda bazik çözelti verir.', denklem: 'MgO + H₂O → Mg(OH)₂' } },
      { tahmin: { soru: 'Kükürt yanınca oluşan gaz suda asit mi, baz mı oluşturur?', secenekler: ['Asit', 'Baz', 'Hiçbiri'] },
        metin: '<b>Yakma kaşığına</b> dokun: kükürdü aleve tut.', ok: okNesne(kas, 0.2, 0.8), kosul: function () { return V.s === 'elde'; } },
      { metin: 'Yanan kükürdü <b>evrensel göstergeli suyun</b> üstüne götür: behere dokun.', ok: okNesne(bB.g, 0.85, 0.8), kosul: function () { return V.sAsit; }, gecikme: 500,
        kart: { tur: 'kesif', baslik: 'Ametal oksit: asidik', metin: 'Kükürt mavi bir alevle yanıp kükürt dioksit gazı oluşturdu. Gaz suda çözünüp asit verdi; gösterge yeşilden turuncu-kırmızıya döndü. Ametal oksitler suda asidik çözelti verir.', denklem: 'S + O₂ → SO₂ ;  SO₂ + H₂O → H₂SO₃', tahminId: 3, tahminDogru: 0 } },
      { metin: '', kosul: function () { return true; }, gecikme: 100,
        kart: { tur: 'soru', soru: 'Hangisi doğrudur?', secenekler: ['Metal oksitler suda bazik, ametal oksitler asidik çözelti verir', 'Metal oksitler suda asidik çözelti verir', 'Bütün oksitler suda nötrdür'], dogru: 0, aciklama: 'MgO, Na₂O gibi metal oksitler bazik; CO₂, SO₂ gibi ametal oksitler asidik oksitlerdir.' } }
    ];
    D.ozetSon = ['Magnezyum parlak beyaz ışıkla yanar: 2Mg + O₂ → 2MgO.', 'Metal oksitler suyla baz, ametal oksitler suyla asit oluşturur.', 'Kükürt mavi alevle yanar; oluşan SO₂ asit yağmurlarının nedenlerindendir.'];
  }

  /* ================= 9. SUYUN ELEKTROLİZİ ================= */
  function elektrolizKur() {
    var D = GI.elektroliz, V = G.v;
    LA.kapKur([{ tip: 'beher', gizli: true }]);
    istasyon(true); UC.arkaRaf.visible = false; UC.PISET.visible = false;
    UC.kameraAyar(new T.Vector3(0.15, 0.95, 0.3), 2.3, new T.Vector3(0.12, 0.38, 1)); UC.oran([1.12, 0.62]);
    V.akim = false; V.h2 = 0; V.o2 = 0; V.hTest = false; V.oTest = false; V.yol = false;
    var kok = sahneyeEkle(grup());
    var ho = grup(-0.2, 0, -0.2); kok.add(ho);
    var taban = UC.yuvarlakKutu(1.3, 0.06, 0.55, 0.05, UC.MAT.gri); taban.position.z = -0.05; ho.add(taban);
    var cubuk = new T.Mesh(new T.CylinderGeometry(0.022, 0.022, 2.2, 16), UC.MAT.celik); cubuk.position.set(0, 1.1, -0.25); ho.add(cubuk);
    var TB = 0.3, TU = 1.85, X = [-0.36, 0.36];
    var suMat = new T.MeshPhysicalMaterial({ color: 0xd6eaf6, transparent: true, opacity: 0.55, depthWrite: false });
    var TUP = X.map(function (x, i) {
      var g = grup(x, 0, 0); ho.add(g);
      var c = new T.Mesh(new T.CylinderGeometry(0.075, 0.075, TU - TB, 24, 1, true), UC.MAT.camKalin); c.position.y = (TB + TU) / 2; c.renderOrder = 5; g.add(c);
      var tepe = new T.Mesh(new T.SphereGeometry(0.075, 20, 10, 0, 6.283, 0, Math.PI / 2), UC.MAT.camKalin); tepe.position.y = TU; g.add(tepe);
      var mus = new T.Mesh(new T.CylinderGeometry(0.02, 0.02, 0.16, 10), UC.MAT.camKalin); mus.position.y = TU + 0.12; g.add(mus);
      var kol = new T.Mesh(new T.BoxGeometry(0.12, 0.025, 0.03), new T.MeshStandardMaterial({ color: 0x2a6fd6, roughness: 0.4 })); kol.position.y = TU + 0.12; g.add(kol);
      var su = new T.Mesh(new T.CylinderGeometry(0.068, 0.068, 1, 20), suMat); su.renderOrder = 2; g.add(su);
      var el = new T.Mesh(new T.BoxGeometry(0.05, 0.12, 0.012), new T.MeshStandardMaterial({ color: 0x8c9096, metalness: 0.9, roughness: 0.3 })); el.position.y = TB + 0.1; g.add(el);
      var kab = new T.InstancedMesh(new T.SphereGeometry(1, 8, 6), new T.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, roughness: 0, depthWrite: false }), 40); kab.count = 0; kab.frustumCulled = false; g.add(kab);
      var ets = grup(0, TU + 0.28, 0); g.add(ets);
      return { g: g, su: su, kab: kab, L: [], et: etiket(ets, '', 0, 'gv-pr') };
    });
    var alt = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, 0.8, 16, 1, true), UC.MAT.camKalin); alt.rotation.z = Math.PI / 2; alt.position.set(0, TB, 0); ho.add(alt);
    var orta = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, TU + 0.1 - TB, 16, 1, true), UC.MAT.camKalin); orta.position.set(0, (TB + TU + 0.1) / 2, -0.06); ho.add(orta);
    var hz = new T.Mesh(UC.torna([[0.05, 0], [0.1, 0.05], [0.16, 0.2], [0.17, 0.25]], 24), UC.MAT.camKalin); hz.position.set(0, TU + 0.1, -0.06); ho.add(hz);
    var ortaSu = new T.Mesh(new T.CylinderGeometry(0.043, 0.043, 1, 14), suMat); ortaSu.position.z = -0.06; ho.add(ortaSu);
    /* güç kaynağı */
    var gk = grup(1.35, 0, 0.25); kok.add(gk);
    var kutuG = new T.Mesh(new T.BoxGeometry(0.62, 0.36, 0.42), new T.MeshStandardMaterial({ color: 0x2b2f35, roughness: 0.5 })); kutuG.position.y = 0.18; gk.add(kutuG);
    var ekran = new T.Mesh(new T.PlaneGeometry(0.3, 0.12), new T.MeshBasicMaterial({ map: UC.tuval(256, 100, function (c) { c.fillStyle = '#0f2a1a'; c.fillRect(0, 0, 256, 100); c.fillStyle = '#57f28a'; c.font = '700 64px "IBM Plex Sans", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('6.0 V', 128, 54); }) })); ekran.position.set(-0.08, 0.24, 0.211); gk.add(ekran);
    var anahtar = new T.Mesh(new T.BoxGeometry(0.07, 0.11, 0.05), UC.MAT.kirmizi); anahtar.position.set(0.18, 0.2, 0.22); anahtar.rotation.x = 0.4; gk.add(anahtar);
    var led = new T.Mesh(new T.SphereGeometry(0.022, 10, 8), new T.MeshBasicMaterial({ color: 0x3a3a3a })); led.position.set(0.18, 0.32, 0.215); gk.add(led);
    hedefKutu(gk, 0.4, 0.5, 0.2); UC.golgeKoy(gk, 0, 0, 0.9, 0.7, 0.6);
    etiket(gk, 'Güç kaynağı', 0.52, 'gv-pr');
    var telK = new T.MeshStandardMaterial({ color: 0x1c1f24, roughness: 0.5 }), telR = new T.MeshStandardMaterial({ color: 0xd8342c, roughness: 0.5 });
    kok.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(1.1, 0.25, 0.46), new T.Vector3(0.6, 0.05, 0.5), new T.Vector3(-0.2, 0.04, 0.35), new T.Vector3(-0.56, 0.4, -0.2)]), 30, 0.014, 6), telK));
    kok.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(1.2, 0.25, 0.46), new T.Vector3(0.8, 0.06, 0.3), new T.Vector3(0.4, 0.05, 0.15), new T.Vector3(0.16, 0.4, -0.2)]), 30, 0.014, 6), telR));
    [['−', X[0]], ['+', X[1]]].forEach(function (d) { var e = grup(d[1], TB - 0.05, 0.12); ho.add(e); etiket(e, '<b>' + d[0] + '</b>', 0, 'gv-alt'); });
    /* test çubukları */
    var kib = grup(-1.45, 0.03, 0.6); kok.add(kib);
    var kc = new T.Mesh(new T.CylinderGeometry(0.012, 0.012, 0.5, 8), new T.MeshStandardMaterial({ color: 0xc9a46a, roughness: 0.9 })); kc.rotation.z = Math.PI / 2; kc.position.x = -0.25; kib.add(kc);
    var kAlev = new T.Sprite(new T.SpriteMaterial({ map: UC.yumusakD, color: 0xffb547, transparent: true, opacity: 0.9, depthWrite: false })); kAlev.scale.set(0.1, 0.14, 1); kAlev.position.set(0.02, 0.04, 0); kib.add(kAlev);
    hedefKutu(kib, 0.3, 0.25, 0); kib.rotation.y = 0.3;
    var etKib = etiket(kib, 'Yanan kibrit', 0.15, 'gv-pr');
    var kor = grup(-0.9, 0.03, 0.85); kok.add(kor);
    var korc = new T.Mesh(new T.CylinderGeometry(0.013, 0.013, 0.5, 8), new T.MeshStandardMaterial({ color: 0xb08a5c, roughness: 0.9 })); korc.rotation.z = Math.PI / 2; korc.position.x = -0.25; kor.add(korc);
    var korUc = new T.Mesh(new T.SphereGeometry(0.02, 10, 8), new T.MeshBasicMaterial({ color: 0xff5a1f })); kor.add(korUc);
    var korAlev = new T.Sprite(new T.SpriteMaterial({ map: UC.yumusakD, color: 0xffb547, transparent: true, opacity: 0, depthWrite: false })); korAlev.scale.set(0.14, 0.2, 1); korAlev.position.set(0.02, 0.07, 0); kor.add(korAlev);
    hedefKutu(kor, 0.3, 0.25, 0); kor.rotation.y = 0.15;
    var etKor = etiket(kor, 'Kor hâlinde çubuk', 0.15, 'gv-pr');
    var pat = new T.Sprite(new T.SpriteMaterial({ map: UC.yumusakD, color: 0xfff2b0, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false })); kok.add(pat);
    var patEt = etiket(grup(), '<b>Pıt!</b>', 0, 'gv-alev'); patEt.gizli = true; kok.add(patEt.nesne);
    var kibP0 = kib.position.clone(), kibQ0 = kib.quaternion.clone(), korP0 = kor.position.clone(), korQ0 = kor.quaternion.clone();
    function tupUst(i) { return ho.localToWorld(new T.Vector3(X[i], TU + 0.24, 0)); }
    function anahtarDokun() { V.akim = !V.akim; anahtar.rotation.x = V.akim ? -0.4 : 0.4; led.material.color.setHex(V.akim ? 0x37e07a : 0x3a3a3a); mesaj(V.akim ? 'Akım geçiyor.' : 'Güç kaynağı kapandı.'); }
    function kibritDokun() {
      if (V.h2 < 10 || V.yol) { if (V.h2 < 10) mesaj('Önce sol tüpte gaz toplanmalı.'); return; }
      V.yol = true; etKib.gizli = true;
      var u = tupUst(0);
      tasi(kib, u.clone().add(new T.Vector3(0.05, 0.02, 0.06)), new T.Quaternion().setFromEuler(new T.Euler(0, 0, -0.5)), 0.8, 0.3, function () {
        pat.position.copy(u); patEt.nesne.position.copy(u).add(new T.Vector3(0, 0.15, 0)); patEt.gizli = false;
        anim(0.6, function (e, k) { pat.material.opacity = Math.sin(Math.PI * k) * 1.2; pat.scale.setScalar(0.2 + k * 0.8); kAlev.material.opacity = 0.9 * (1 - e); }, function () {
          V.h2 = 0; V.hTest = true; bekle(900, function () { patEt.gizli = true; });
          tasi(kib, kibP0, kibQ0, 0.8, 0.2, function () { V.yol = false; });
        });
      });
    }
    function korDokun() {
      if (V.o2 < 5 || V.yol) { if (V.o2 < 5) mesaj('Önce sağ tüpte gaz toplanmalı.'); return; }
      V.yol = true; etKor.gizli = true;
      var u = tupUst(1);
      tasi(kor, u.clone().add(new T.Vector3(0.05, 0.02, 0.06)), new T.Quaternion().setFromEuler(new T.Euler(0, 0, -0.5)), 0.8, 0.3, function () {
        anim(1.2, function (e) { korAlev.material.opacity = e * 0.95; korAlev.scale.set(0.14 + e * 0.06, 0.2 + e * 0.1, 1); }, function () {
          V.o2 = 0; V.oTest = true;
          bekle(900, function () { tasi(kor, korP0, korQ0, 0.8, 0.2, function () { V.yol = false; }); });
        });
      });
    }
    dokun(gk, anahtarDokun); dokun(kib, kibritDokun); dokun(kor, korDokun);
    D.test = { anahtar: anahtarDokun, kibrit: kibritDokun, kor: korDokun };
    var birQ = new T.Quaternion(), mtx = new T.Matrix4(), vv = new T.Vector3(), ss = new T.Vector3();
    D.guncelle = function (t, dt) {
      if (V.akim) { V.h2 = Math.min(24, V.h2 + dt * 2.4); V.o2 = Math.min(12, V.o2 + dt * 1.2); }
      var uz = TU - TB - 0.05, hacim = [V.h2, V.o2];
      TUP.forEach(function (T0, i) {
        var gaz = hacim[i] / 24 * 0.9, top = TU - gaz, boy = Math.max(0.01, top - TB);
        T0.su.scale.y = boy; T0.su.position.y = TB + boy / 2;
        var tx = (i ? 'O₂ ' : 'H₂ ') + Math.round(hacim[i]) + ' mL'; if (T0.et._t !== tx) { T0.et.el.innerHTML = tx; T0.et._t = tx; }
        T0.et.gizli = hacim[i] < 0.5;
        if (V.akim && Math.random() < dt * (i ? 12 : 24) && T0.L.length < 38) T0.L.push({ y: TB + 0.12, x: (Math.random() - 0.5) * 0.06, z: (Math.random() - 0.5) * 0.06, r: 0.006 + Math.random() * 0.008, v: 0.35 + Math.random() * 0.3 });
        for (var j = T0.L.length - 1; j >= 0; j--) { var b = T0.L[j]; b.y += b.v * dt; if (b.y > top) T0.L.splice(j, 1); }
        T0.L.forEach(function (b, j) { vv.set(b.x, b.y, b.z); ss.setScalar(b.r); mtx.compose(vv, birQ, ss); T0.kab.setMatrixAt(j, mtx); });
        T0.kab.count = T0.L.length; T0.kab.instanceMatrix.needsUpdate = true;
      });
      var ortaBoy = 0.9 + (V.h2 + V.o2) / 36 * 0.6; ortaSu.scale.y = ortaBoy; ortaSu.position.y = TB + ortaBoy / 2;
      kAlev.scale.set(0.1 + Math.sin(t * 17) * 0.01, 0.14 + Math.sin(t * 11) * 0.02, 1);
      return true;
    };
    D.adim = [
      gozlukAdimi(),
      { metin: '', kosul: function () { return true; }, gecikme: 200,
        kart: { tur: 'soru', soru: 'Saf su elektriği çok az iletir. Elektroliz için suya biraz sodyum sülfat (Na₂SO₄) neden eklenir?', secenekler: ['İyon sayısını artırıp akımın geçmesini sağlamak için', 'Suyu renklendirmek için', 'Suyu soğutmak için'], dogru: 0, aciklama: 'Na₂SO₄ suda iyonlarına ayrışır; bu iyonlar akımı taşır. Kendisi tepkimeye girmez.' } },
      { metin: function () { return V.akim ? 'Tüplerde gaz toplanıyor. Hacimleri izle. (H₂ ' + Math.round(V.h2) + ' mL · O₂ ' + Math.round(V.o2) + ' mL)' : '<b>Güç kaynağına</b> dokun ve akımı aç.'; }, ok: function () { return V.akim ? null : okNesne(gk, 0.5, 0.8); }, kosul: function () { return V.h2 >= 20; }, gecikme: 400,
        kart: { tur: 'kesif', baslik: 'Hacimler 2 : 1', metin: 'Negatif elektrotta (katot) hidrojen, pozitif elektrotta (anot) oksijen toplandı. Hidrojenin hacmi oksijenin iki katı: su molekülünde her oksijen atomuna iki hidrojen atomu düşer.', denklem: '2H₂O → 2H₂ + O₂' } },
      { metin: 'Hidrojeni test et: <b>yanan kibrite</b> dokun, sol tüpün ağzına tut.', ok: okNesne(kib, 0.15, 0.6), kosul: function () { return V.hTest; }, gecikme: 700,
        kart: { tur: 'kesif', baslik: 'Hidrojen: “pıt” sesi', metin: 'Hidrojen yanıcı bir gazdır. Yanan kibrit yaklaştırılınca küçük bir patlamayla “pıt” sesi çıkararak yandı.' } },
      { metin: 'Oksijeni test et: <b>kor hâlindeki çubuğa</b> dokun, sağ tüpün ağzına tut.', ok: okNesne(kor, 0.15, 0.6), kosul: function () { return V.oTest; }, gecikme: 700,
        kart: { tur: 'kesif', baslik: 'Oksijen: kor alevlendi', metin: 'Oksijen yakıcıdır (yanmayı destekler). Kor hâlindeki çubuk oksijenli tüpe tutulunca yeniden alev aldı.' } },
      { metin: '', kosul: function () { return true; }, gecikme: 100,
        kart: { tur: 'soru', soru: 'Suyun elektrolizinde hidrojen ve oksijen hangi hacim oranında toplanır?', secenekler: ['2 : 1', '1 : 1', '1 : 2'], dogru: 0, aciklama: '2H₂O → 2H₂ + O₂: aynı koşulda 2 hacim hidrojene karşılık 1 hacim oksijen oluşur.' } }
    ];
    D.ozetSon = ['Elektrolizde su, elektrik enerjisiyle hidrojen ve oksijene ayrışır.', 'Katotta (−) hidrojen, anotta (+) oksijen toplanır; hacim oranı 2 : 1.', 'Hidrojen “pıt” sesiyle yanar; oksijen kor hâlindeki çubuğu alevlendirir.'];
  }

  /* ================= 11. GAZLARI TOPLAMA ================= */
  function gazKur() {
    var D = GI.gaz, V = G.v;
    LA.kapKur([{ tip: 'beher', gizli: true }]);
    istasyon(true); UC.arkaRaf.visible = false; UC.PISET.visible = false;
    UC.kameraAyar(new T.Vector3(0.0, 0.58, 0.35), 2.45, new T.Vector3(0.1, 0.5, 1)); UC.oran([0.92, 0.6]);
    V.h2 = 0; V.h2Akis = false; V.hTest = false; V.co2 = 0; V.co2Akis = false; V.cTest = false; V.yol = false;
    var kok = sahneyeEkle(grup());
    var suMat = new T.MeshPhysicalMaterial({ color: 0xcfe6f5, transparent: true, opacity: 0.5, depthWrite: false });
    function erlen(x, z, renk) {
      var g = grup(x, 0, z); kok.add(g);
      var oz = UC.ozellik('erlen'), sc = 0.7;
      var c = new T.Mesh(UC.torna(oz.dis, 64), UC.MAT.cam); c.scale.setScalar(sc); c.renderOrder = 4; g.add(c);
      var s = new T.Mesh(lathe(oz, 0.3, sc), new T.MeshPhysicalMaterial({ color: renk, transparent: true, opacity: 0.55, depthWrite: false })); s.renderOrder = 2; g.add(s);
      var tipa = new T.Mesh(new T.CylinderGeometry(0.1, 0.085, 0.1, 16), new T.MeshStandardMaterial({ color: 0xb98c5a, roughness: 0.9 })); tipa.position.y = 1.12 * sc + 0.03; g.add(tipa);
      var kab = new T.InstancedMesh(new T.SphereGeometry(1, 8, 6), new T.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, roughness: 0, depthWrite: false }), 30); kab.count = 0; kab.frustumCulled = false; g.add(kab);
      hedefKutu(g, 0.38, 0.9, 0.4); UC.golgeKoy(g, 0, 0, 0.9, 0.9, 0.6);
      return { g: g, kab: kab, L: [] };
    }
    /* 1) Su üstünde toplama: H₂ */
    var e1 = erlen(-1.9, -0.3, 0xe4eef4);
    var cinko = []; for (var j = 0; j < 5; j++) { var c = new T.Mesh(new T.DodecahedronGeometry(0.035, 0), UC.metalMat('Zn')); c.position.set((j - 2) * 0.05, 0.035, (j % 2) * 0.05 - 0.025); e1.g.add(c); cinko.push(c); }
    var legen = grup(-0.75, 0, 0.1); kok.add(legen);
    var lg = new T.Mesh(UC.torna([[0, 0], [0.5, 0], [0.52, 0.02], [0.55, 0.3], [0.57, 0.31]], 48), UC.MAT.cam); lg.renderOrder = 4; legen.add(lg);
    var lsu = new T.Mesh(UC.torna([[0, 0.012], [0.505, 0.012], [0.535, 0.24], [0, 0.24]], 48), suMat); lsu.renderOrder = 2; legen.add(lsu);
    var kavanoz = grup(0, 0.13, 0); legen.add(kavanoz);
    var kv = new T.Mesh(UC.torna([[0.2, 0], [0.2, 0.7], [0.17, 0.76], [0, 0.78]], 40), UC.MAT.camKalin); kv.renderOrder = 5; kavanoz.add(kv);
    var kvSu = new T.Mesh(new T.CylinderGeometry(0.19, 0.19, 1, 24), suMat); kvSu.renderOrder = 3; kavanoz.add(kvSu);
    var kvKab = new T.InstancedMesh(new T.SphereGeometry(1, 8, 6), new T.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.75, roughness: 0, depthWrite: false }), 24); kvKab.count = 0; kvKab.frustumCulled = false; kavanoz.add(kvKab); var kvL = [];
    var boru1 = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(-1.9, 0.86, -0.3), new T.Vector3(-1.9, 1.05, -0.28), new T.Vector3(-1.5, 1.1, -0.15), new T.Vector3(-1.05, 0.6, 0.0), new T.Vector3(-0.85, 0.2, 0.08), new T.Vector3(-0.76, 0.2, 0.1)]), 50, 0.02, 8), UC.MAT.camKalin); kok.add(boru1);
    hedefKutu(kavanoz, 0.3, 0.9, 0.4);
    var e1et = grup(0, 0, 0.42); e1.g.add(e1et); etiket(e1et, '<b>Zn + HCl</b>', 0, 'gv-alt');
    var lget = grup(0, 0, 0.62); legen.add(lget); etiket(lget, '<b>Su altında</b>', 0, 'gv-alt');
    /* 2) Havayı yukarı iterek toplama: CO₂ */
    var e2 = erlen(0.75, -0.35, 0xe8eef2);
    var mermer = []; for (j = 0; j < 4; j++) { var mm = new T.Mesh(new T.DodecahedronGeometry(0.045, 0), new T.MeshStandardMaterial({ color: 0xece8e0, roughness: 0.8 })); mm.position.set((j - 1.5) * 0.06, 0.04, (j % 2) * 0.05 - 0.02); e2.g.add(mm); mermer.push(mm); }
    var sise2 = grup(1.85, 0, 0.15); kok.add(sise2);
    var s2c = new T.Mesh(UC.torna([[0, 0], [0.22, 0], [0.23, 0.02], [0.23, 0.62], [0.16, 0.72], [0.16, 0.8], [0.18, 0.81]], 40), UC.MAT.camKalin); s2c.renderOrder = 5; sise2.add(s2c);
    var co2Sis = new T.Mesh(new T.CylinderGeometry(0.215, 0.215, 1, 24), new T.MeshBasicMaterial({ color: 0xd9dde2, transparent: true, opacity: 0.0, depthWrite: false })); co2Sis.renderOrder = 3; sise2.add(co2Sis);
    var boru2 = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(0.75, 0.86, -0.35), new T.Vector3(0.78, 1.15, -0.3), new T.Vector3(1.4, 1.25, -0.05), new T.Vector3(1.78, 1.05, 0.12), new T.Vector3(1.84, 0.3, 0.15), new T.Vector3(1.85, 0.08, 0.15)]), 50, 0.02, 8), UC.MAT.camKalin); kok.add(boru2);
    hedefKutu(sise2, 0.3, 0.9, 0.4);
    var e2et = grup(0, 0, 0.42); e2.g.add(e2et); etiket(e2et, '<b>CaCO₃ + HCl</b>', 0, 'gv-alt');
    var s2et = grup(0, 0, 0.45); sise2.add(s2et); etiket(s2et, '<b>Ağzı yukarı kap</b>', 0, 'gv-alt');
    /* kibrit */
    var kib = grup(0.15, 0.03, 1.2); kok.add(kib);
    var kc = new T.Mesh(new T.CylinderGeometry(0.012, 0.012, 0.5, 8), new T.MeshStandardMaterial({ color: 0xc9a46a, roughness: 0.9 })); kc.rotation.z = Math.PI / 2; kc.position.x = -0.25; kib.add(kc);
    var kAlev = new T.Sprite(new T.SpriteMaterial({ map: UC.yumusakD, color: 0xffb547, transparent: true, opacity: 0.9, depthWrite: false })); kAlev.scale.set(0.1, 0.14, 1); kAlev.position.set(0.02, 0.04, 0); kib.add(kAlev);
    hedefKutu(kib, 0.3, 0.25, 0); kib.rotation.y = 0.1;
    var etKib = etiket(kib, 'Yanan kibrit', 0.15, 'gv-pr');
    var kibP0 = kib.position.clone(), kibQ0 = kib.quaternion.clone();
    var pat = new T.Sprite(new T.SpriteMaterial({ map: UC.yumusakD, color: 0xfff2b0, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false })); kok.add(pat);
    var patEt = etiket(grup(), '<b>Pıt!</b>', 0, 'gv-alev'); patEt.gizli = true; kok.add(patEt.nesne);
    D.eylem = function (a) {
      if (a === 'hcl1' && !V.h2Akis) { V.h2Akis = true; mesaj('HCl döküldü: hidrojen kabarcıkları!'); }
      if (a === 'hcl2' && !V.co2Akis) { V.co2Akis = true; mesaj('HCl döküldü: karbondioksit çıkıyor!'); }
    };
    function kibritTest(hedefNokta, tur) {
      if (V.yol) return;
      V.yol = true; etKib.gizli = true;
      tasi(kib, hedefNokta.clone().add(new T.Vector3(0.04, 0.0, 0.05)), new T.Quaternion().setFromEuler(new T.Euler(0, 0, -0.45)), 0.8, 0.3, function () {
        if (tur === 'h2') {
          pat.position.copy(hedefNokta); patEt.nesne.position.copy(hedefNokta).add(new T.Vector3(0, 0.15, 0)); patEt.gizli = false;
          anim(0.6, function (e, k) { pat.material.opacity = Math.sin(Math.PI * k) * 1.2; pat.scale.setScalar(0.2 + k * 0.8); kAlev.material.opacity = 0.9 * (1 - e); }, function () { V.hTest = true; bekle(900, function () { patEt.gizli = true; }); geri(); });
        } else {
          anim(0.7, function (e) { kAlev.material.opacity = 0.9 * (1 - e); kAlev.scale.set(0.1 * (1 - e) + 0.02, 0.14 * (1 - e) + 0.02, 1); }, function () { V.cTest = true; geri(); });
        }
      });
      function geri() { tasi(kib, kibP0, kibQ0, 0.8, 0.2, function () { kAlev.material.opacity = 0.9; kAlev.scale.set(0.1, 0.14, 1); V.yol = false; }); }
    }
    dokun(kavanoz, function () { if (V.h2 >= 1) { var p = kavanoz.localToWorld(new T.Vector3(0, 0.0, 0)); kibritTest(new T.Vector3(p.x, 0.62, p.z + 0.22), 'h2'); } else mesaj('Önce kavanozda gaz toplanmalı.'); });
    dokun(sise2, function () { if (V.co2 >= 1) { kibritTest(sise2.localToWorld(new T.Vector3(0, 0.86, 0)), 'co2'); } else mesaj('Önce kapta gaz toplanmalı.'); });
    dokun(kib, function () { mesaj('Kibriti test etmek istediğin kaba dokun.'); });
    var birQ = new T.Quaternion(), mtx = new T.Matrix4(), vv = new T.Vector3(), ss = new T.Vector3();
    function kabarcik(E, hiz, dt, y0, y1) {
      if (hiz && Math.random() < dt * hiz && E.L.length < 28) E.L.push({ x: (Math.random() - 0.5) * 0.18, z: (Math.random() - 0.5) * 0.18, y: y0, r: 0.008 + Math.random() * 0.01, v: 0.25 + Math.random() * 0.2 });
      for (var i = E.L.length - 1; i >= 0; i--) { var b = E.L[i]; b.y += b.v * dt; if (b.y > y1) E.L.splice(i, 1); }
      E.L.forEach(function (b, i) { vv.set(b.x, b.y, b.z); ss.setScalar(b.r); mtx.compose(vv, birQ, ss); E.kab.setMatrixAt(i, mtx); });
      E.kab.count = E.L.length; E.kab.instanceMatrix.needsUpdate = true;
    }
    D.guncelle = function (t, dt) {
      etKib.gizli = V.yol || !(G && G.A && (G.adim === 2 || G.adim === 4));
      if (V.h2Akis) V.h2 = Math.min(1, V.h2 + dt * 0.18);
      if (V.co2Akis) V.co2 = Math.min(1, V.co2 + dt * 0.2);
      kabarcik(e1, V.h2Akis ? 30 : 0, dt, 0.04, 0.2);
      kabarcik(e2, V.co2Akis ? 30 : 0, dt, 0.04, 0.2);
      cinko.forEach(function (c, i) { if (V.h2Akis) c.position.y = 0.035 + Math.sin(t * 9 + i) * 0.004; });
      var suBoy = 0.7 * (1 - V.h2 * 0.85); kvSu.scale.y = Math.max(0.01, suBoy); kvSu.position.y = suBoy / 2;
      if (V.h2Akis && V.h2 < 1 && Math.random() < dt * 14 && kvL.length < 20) kvL.push({ x: (Math.random() - 0.5) * 0.1, z: (Math.random() - 0.5) * 0.1, y: 0.02, r: 0.012 + Math.random() * 0.01 });
      for (var i = kvL.length - 1; i >= 0; i--) { var b = kvL[i]; b.y += 0.5 * dt; if (b.y > suBoy) kvL.splice(i, 1); }
      kvL.forEach(function (b, i) { vv.set(b.x, b.y, b.z); ss.setScalar(b.r); mtx.compose(vv, birQ, ss); kvKab.setMatrixAt(i, mtx); });
      kvKab.count = kvL.length; kvKab.instanceMatrix.needsUpdate = true;
      var cb = 0.02 + 0.6 * V.co2; co2Sis.scale.y = cb; co2Sis.position.y = cb / 2 + 0.02; co2Sis.material.opacity = V.co2 > 0 ? 0.28 : 0;
      kAlev.scale.x = (V.yol ? kAlev.scale.x : 0.1 + Math.sin(t * 17) * 0.01);
      return true;
    };
    D.adim = [
      gozlukAdimi(),
      { tahmin: { soru: 'Hidrojen suda çok az çözünür. Sence nasıl toplanır?', secenekler: ['Su dolu kabın içine, suyu iterek', 'Ağzı yukarı kapta', 'Hiç toplanamaz'] },
        metin: 'Erlendeki çinkonun üstüne <b>HCl</b> dök. <button type="button" class="gv-b" data-gva="hcl1">HCl dök</button>', ok: okNesne(e1.g, 0.95, 0.8), kosul: function () { return V.h2 >= 1; }, gecikme: 400,
        kart: { tur: 'kesif', baslik: 'Su altında toplama', metin: 'Hidrojen kabarcıkları su dolu kavanozdaki suyu aşağı itip yerini aldı. Suda az çözünen gazlar (H₂, O₂) böyle toplanır.', denklem: 'Zn + 2HCl → ZnCl₂ + H₂', tahminId: 1, tahminDogru: 0 } },
      { metin: 'Gazı test et: <b>kavanoza</b> dokun, yanan kibriti ağzına tut.', ok: okNesne(kavanoz, 0.95, 0.7), kosul: function () { return V.hTest; }, gecikme: 600,
        kart: { tur: 'kesif', baslik: '“Pıt!”', metin: 'Hidrojen yanan kibritle küçük bir patlama sesiyle yandı. Bu, hidrojenin tanınma testidir.' } },
      { metin: 'Şimdi mermerin üstüne <b>HCl</b> dök. CO₂ havadan ağırdır; ağzı yukarı kabın dibine iner. <button type="button" class="gv-b" data-gva="hcl2">HCl dök</button>', ok: okNesne(e2.g, 0.95, 0.8), kosul: function () { return V.co2 >= 1; }, gecikme: 400,
        kart: { tur: 'kesif', baslik: 'Havayı yukarı iterek toplama', metin: 'Karbondioksit havadan ağır olduğu için kabın dibinde birikti ve havayı yukarı itti. Havadan ağır gazlar ağzı yukarı kapta toplanır.', denklem: 'CaCO₃ + 2HCl → CaCl₂ + H₂O + CO₂' } },
      { metin: 'Gazı test et: <b>ağzı yukarı kaba</b> dokun, yanan kibriti ağzına tut.', ok: okNesne(sise2, 0.95, 0.7), kosul: function () { return V.cTest; }, gecikme: 600,
        kart: { tur: 'kesif', baslik: 'Kibrit söndü', metin: 'Karbondioksit yanmayı desteklemez; yanan kibrit söndü. Yangın söndürücülerde bu yüzden CO₂ kullanılır.' } },
      { metin: '', kosul: function () { return true; }, gecikme: 100,
        kart: { tur: 'soru', soru: 'Amonyak (NH₃) havadan hafiftir ve suda çok çözünür. Nasıl toplanır?', secenekler: ['Ağzı aşağı kapta, havayı aşağı iterek', 'Su altında', 'Ağzı yukarı kapta'], dogru: 0, aciklama: 'Suda çok çözündüğü için su altında toplanamaz; havadan hafif olduğu için ağzı aşağı kapta yukarıda birikir.' } }
    ];
    D.ozetSon = ['Suda az çözünen gazlar (H₂, O₂) su altında toplanır.', 'Havadan ağır gazlar (CO₂) ağzı yukarı, havadan hafif gazlar (NH₃) ağzı aşağı kapta toplanır.', 'H₂ “pıt” sesiyle yanar; CO₂ yanan kibriti söndürür.'];
  }

  /* ================= 10. FİNAL: BİLİNMEYENİ BUL ================= */
  function finalKur() {
    var D = GI.final, V = G.v;
    var M4 = karistir([['hcl', 'Hidroklorik asit'], ['naoh', 'Sodyum hidroksit'], ['nacl', 'Sodyum klorür'], ['na2co3', 'Sodyum karbonat']]);
    V.M4 = M4;
    LA.kapKur(['A', 'B', 'C', 'D'].map(function (h) { return { tip: 'beher', ad: h + ' kabı', duzenek: 'yok' }; }));
    M4.forEach(function (m, i) { if (m[0] === 'na2co3' || m[0] === 'naoh') { M.ekle(kap(i), 'su', 0.036, { sessiz: true }); M.ekle(kap(i), m[0], 0.004, { sessiz: true }); } else M.ekle(kap(i), m[0], 0.04, { sessiz: true }); });
    LA.kapSec(0);
    UC.arkaRaf.visible = false; UC.PISET.visible = false;
    UC.kameraAyar(new T.Vector3(0, 0.62, 0.45), 3.35);
    gozlukKoy(-2.7, 1.25);
    D.eylem = function (a) { if (a.indexOf('sise:') === 0) UC.siseAl(a.slice(5)); };
    function idx(id) { for (var i = 0; i < 4; i++) if (M4[i][0] === id) return i; return -1; }
    function gos(i) { return kap(i) && (kap(i).gos.evr || 0) > 0; }
    function harf(i) { return 'ABCD'[i]; }
    V.mgYanlis = {};
    D.olay = function (tur, v) {
      if (tur === 'ekle' && v.id === 'mg' && G && G.A) { if (v.i !== idx('hcl')) mesaj(harf(v.i) + ' kabında gaz çıkmadı: bu kap asit değil.', 3200); }
    };
    D.adim = [
      gozlukAdimi(),
      { metin: function () { var n = [0, 1, 2, 3].filter(gos).length; return 'Etiketsiz dört çözelti: asit, baz, tuz ve karbonat. Her kaba <b>evrensel gösterge</b> damlat. (' + n + '/4) ' + (siseVar('evrensel') ? '' : siseDug('evrensel', 'Göstergeyi al')); },
        ok: function () { if (!siseVar('evrensel')) return null; for (var i = 0; i < 4; i++) if (!gos(i)) return { kap: i }; return null; }, kosul: function () { return [0, 1, 2, 3].every(gos); }, gecikme: 1400,
        kart: { tur: 'kesif', baslik: 'İlk ipuçları', metin: 'Kırmızı-turuncu renk asidik, yeşil nötr, mavi-mor bazik çözeltiyi gösterir. Tuz nötrdür; asit asidiktir. Hem baz hem de karbonat bazik görünür; onları ayırmak için bir test daha gerek.' } },
      { basla: function () { UC.siseBirak(); }, metin: function () { return 'Asidik olduğunu düşündüğün kaba <b>magnezyum şerit</b> at. ' + (siseVar('mg') ? '' : siseDug('mg', 'Magnezyumu al')); },
        ok: function () { return null; }, kosul: function () { var i = idx('hcl'); return kap(i).eklenen.indexOf('mg') >= 0; }, gecikme: 2200,
        kart: function () { return { tur: 'kesif', baslik: harf(idx('hcl')) + ' kabı: asit', metin: 'Magnezyum hidrojen gazı kabarcıkları çıkardı. Asitler aktif metallerle hidrojen gazı oluşturur.', denklem: 'Mg + 2HCl → MgCl₂ + H₂' }; } },
      { basla: function () { UC.siseBirak(); }, metin: function () { return 'Bazik görünen kaplara biraz <b>hidroklorik asit</b> ekle; hangisi köpürüyor? ' + (siseVar('hcl') ? '' : siseDug('hcl', 'HCl al')); },
        ok: function () { return null; }, kosul: function () { var k = kap(idx('na2co3')); return k.eklenen.indexOf('hcl') >= 0 && (k.gazHiz.CO2 || 0) > 1e-6; }, gecikme: 1800,
        kart: function () { return { tur: 'kesif', baslik: harf(idx('na2co3')) + ' kabı: karbonat', metin: 'Asit eklenince karbondioksit gazı çıktı. Karbonatlar asitlerle CO₂ oluşturur; baz (NaOH) ise gaz çıkarmadan nötrleşir.', denklem: 'Na₂CO₃ + 2HCl → 2NaCl + H₂O + CO₂' }; } },
      { basla: function () { UC.siseBirak(); }, metin: '', kosul: function () { return true; }, gecikme: 200,
        kart: function () { var d = idx('naoh'); return { tur: 'soru', soru: 'Sodyum hidroksit (baz) hangi kapta?', secenekler: ['A kabı', 'B kabı', 'C kabı', 'D kabı'], dogru: d, aciklama: harf(d) + ' kabı bazikti ama asit eklenince gaz çıkarmadı: sodyum hidroksit.', ipucu: 'Bazik görünüp köpürmeyen kabı düşün.' }; } },
      { metin: '', kosul: function () { return true; }, gecikme: 100,
        kart: function () { var d = idx('nacl'); return { tur: 'soru', soru: 'Sodyum klorür (tuz) hangi kapta?', secenekler: ['A kabı', 'B kabı', 'C kabı', 'D kabı'], dogru: d, aciklama: harf(d) + ' kabında gösterge yeşildi (nötr): tuz çözeltisi.', ipucu: 'Göstergenin yeşil olduğu kabı düşün.' }; } }
    ];
    D.ozetSon = ['Göstergeler asidik, nötr ve bazik çözeltileri ayırt eder.', 'Asitler aktif metallerle H₂, karbonatlarla CO₂ gazı çıkarır.', 'Birkaç basit test birlikte kullanılarak bilinmeyen maddeler tanınır.'];
  }

  /* ================= BAŞLAT ================= */
  function ucHazir() {
    if (UC || !LA.uc) return;
    UC = LA.uc; T = UC.T;
    baglaKatman();
    listeCiz();
    var hs = (location.hash || '').replace('#', '');
    if (hs === 'gorevler') { LA.modAc('gorevler'); listeCiz(); }
  }
  window.addEventListener('lab3d-kuruldu', ucHazir);
  ucHazir();
  window.LabGorev = { baslat: baslat, bitir: bitir, durum: function () { return G; }, test: function () { return G && G.D.test; }, gozluk: function () { var g = G && G.v.gozlukG; if (g) { var d = null; return g; } }, GOREV: GOREV, kartSec: function (i) { var b = perde && perde.querySelectorAll('[data-gvs]')[i]; if (b) b.click(); }, devam: function () { var b = perde && perde.querySelector('[data-gvk="devam"]'); if (b) b.click(); } };
})();
