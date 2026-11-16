/* Sanal Laboratuvar · arayüz (lab-arayuz.js) — lab-motor.js'ten sonra yüklenir */
(function () {
  'use strict';
  var M = window.LabMotor, Y = M.yaz, AY = window.LAB_AYAR || {}, GHSY = AY.ghs || 'ghs/';
  var kok = document.getElementById('lab-kok');
  if (!kok || !M) return;

  /* ================= YARDIMCILAR ================= */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function h(s) { return String(s === undefined || s === null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function rgba(a, al) { return 'rgba(' + Math.round(a[0]) + ',' + Math.round(a[1]) + ',' + Math.round(a[2]) + ',' + (al === undefined ? 1 : al) + ')'; }
  function hexRgb(x) { var n = parseInt(x.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function karis(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function rnd(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  var simdi = function () { return (window.performance && performance.now) ? performance.now() : Date.now(); };
  var IK = {
    arti: '<path d="M12 5v14M5 12h14"/>',
    kar: '<path d="M5 12a7 7 0 0 1 12-5M19 12a7 7 0 0 1-12 5"/><path d="M17 3v4h-4M7 21v-4h4"/>',
    alev: '<path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.3 2.2-5.3 3.6-7.7.5 1.9 1.4 3 2.6 3.6.3-3.1 1.4-5.7 3.3-7.7.6 3.5 4 6 4 11.2 0 4-2.7 6.8-7 6.8z"/>',
    buz: '<path d="M12 2v20M4.5 6.5l15 11M19.5 6.5l-15 11"/><path d="M9.5 3.5 12 6l2.5-2.5M9.5 20.5 12 18l2.5 2.5"/>',
    aktar: '<path d="M4 8h12l-3-3M20 16H8l3 3"/>',
    bosalt: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    gaz: '<circle cx="8" cy="16" r="3"/><circle cx="15" cy="10" r="2.5"/><circle cx="10" cy="5" r="1.6"/><circle cx="17" cy="18" r="1.8"/>',
    alevt: '<path d="M12 3c2.5 3 5 5.3 5 9a5 5 0 0 1-10 0c0-2 1-3.4 2-4.6.4 1.4 1.1 2.2 2 2.6.2-2.7.6-4.8 1-7z"/><path d="M8 21h8"/>',
    temiz: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    oynat: '<path d="M7 4l12 8-12 8z"/>', dur: '<rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/>',
    kopya: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
    kap: '<path d="M6 4h9M7 4v14a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V4"/><path d="M7 11h8"/><path d="M19 8v6M16 11h6"/>'
  };
  function ikon(ad) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IK[ad] + '</svg>'; }
  function tost(m, kirmizi) {
    var t = $('#lb-tost'); t.textContent = m; t.className = 'tost acik' + (kirmizi ? ' kirmizi' : '');
    clearTimeout(tost.z); tost.z = setTimeout(function () { t.className = 'tost' + (kirmizi ? ' kirmizi' : ''); }, kirmizi ? 4200 : 2400);
  }

  var LAx = {};
  /* ================= DURUM ================= */
  var KAPLAR = [new M.Kap('beher', 'Beher', 'beher', 0.25), new M.Kap('erlen', 'Erlenmeyer', 'erlen', 0.25), new M.Kap('tup', 'Deney tüpü', 'tup', 0.025)];
  var aktif = 0, gunluk = [], t0 = Date.now(), olaylarK = [[], [], []], rozet = [0, 0, 0], kullanilan = {};
  var anim = [], kabarcik = [[], [], []], pul = [[], [], []], hedefT = [null, null, null], tutT = [null, null, null];
  function cz() { return window.LabArayuz && window.LabArayuz.cizici; }
  function diziEkle() { olaylarK.push([]); rozet.push(0); kabarcik.push([]); pul.push([]); hedefT.push(null); tutT.push(null); }
  function diziSil(i) { [olaylarK, rozet, kabarcik, pul, hedefT, tutT].forEach(function (d) { d.splice(i, 1); }); }
  function diziSifirla() { [olaylarK, rozet, kabarcik, pul, hedefT, tutT].forEach(function (d) { d.length = 0; }); KAPLAR.forEach(function () { diziEkle(); }); }
  var KAT_AD = { tumu: 'Tümü', asit: 'Asitler', baz: 'Bazlar', tuz: 'Tuzlar', metal: 'Elementler', gosterge: 'Göstergeler', diger: 'Diğer', ev: 'Evde bulunanlar' };
  var dolapKat = 'tumu', dolapAra = '';

  /* ================= İSKELET ================= */
  kok.innerHTML =
    '<div class="lab">' +
    '<header class="lab-bas"><div><h1>Sanal Laboratuvar</h1><p>Kimyasalları karıştır; pH, renk, çökelek, gaz ve ısı değişimlerini gözle. Her gözlemin denklemi ve açıklaması yanında.</p></div>' +
    '<nav class="lab-sekme" role="tablist"><button data-mod="serbest" class="on">Serbest</button><button data-mod="titrasyon">Titrasyon</button><button data-mod="hazir">Hazır deneyler</button><button data-mod="rapor">Rapor</button></nav></header>' +
    /* SERBEST */
    '<section class="mod on" id="m-serbest"><div class="sb"><div class="sb-sol">' +
    '<div class="kart" id="lb-adim" hidden></div>' +
    '<div class="kart tezgah-kart"><div class="tezgah"><canvas id="lb-tezgah" aria-label="Laboratuvar tezgâhı: beher, erlenmeyer ve deney tüpü. Bir kaba dokunarak seç."></canvas></div>' +
    '<div class="serit" id="lb-serit"><span class="nokta"></span><span><b>Beher</b> seçili. Kimyasal eklemek için <b>Kimyasal ekle</b>’ye dokun.</span></div>' +
    '<div class="olcum" id="lb-olcum"></div>' +
    '<div class="araclar">' +
    '<button class="ab ana" data-is="dolap">' + ikon('arti') + 'Kimyasal ekle</button>' +
    '<button class="ab" data-is="kar">' + ikon('kar') + 'Karıştır</button>' +
    '<button class="ab" data-is="isit">' + ikon('alev') + 'Isıt</button>' +
    '<button class="ab sogut" data-is="sogut" title="Buz banyosu">' + ikon('buz') + 'Soğut</button>' +
    '<button class="ab" data-is="aktar">' + ikon('aktar') + 'Aktar</button>' +
    '<button class="ab" data-is="gaz">' + ikon('gaz') + 'Gaz testi</button>' +
    '<button class="ab" data-is="alev">' + ikon('alevt') + 'Alev testi</button>' +
    '<button class="ab" data-is="bosalt">' + ikon('bosalt') + 'Boşalt</button>' +
    '<button class="ab" data-is="malzeme" hidden>' + ikon('kap') + 'Kaplar</button>' +
    '</div></div>' +
    '<div class="kart gozlem-kart" style="margin-top:12px"><div class="panel-bas"><h2>Gözlemler</h2><span class="kucuk" id="lb-gk1"></span></div><div class="gozlem-liste" id="lb-gozlem1"></div></div>' +
    '<div class="kart" style="margin-top:12px"><div class="panel-bas"><h2>Kapta neler var?</h2><span class="kucuk" id="lb-ick"></span></div><div class="icerik" id="lb-icerik"></div></div>' +
    '</div><div class="sb-sag">' +
    '<div class="kart gozlem-kart" style="margin-bottom:12px"><div class="panel-bas"><h2>Gözlemler</h2><span class="kucuk" id="lb-gk2"></span></div><div class="gozlem-liste" id="lb-gozlem2"></div></div>' +
    '<div class="kart dolap" id="lb-dolap"><div class="dolap-ust"><div class="satir"><h2>Kimyasal dolabı</h2><button class="dolap-kapat" data-is="dolapkapat" aria-label="Kapat">×</button></div>' +
    '<input class="ara" id="lb-ara" type="search" placeholder="Ara: HCl, bakır, sirke…" autocomplete="off">' +
    '<div class="cipler" id="lb-cip"></div></div><div class="liste" id="lb-liste"></div></div>' +
    '</div></div></section>' +
    /* TİTRASYON */
    '<section class="mod" id="m-titrasyon"><div class="ti"><div class="kart"><div class="tezgah"><canvas id="lb-tcan"></canvas></div>' +
    '<div class="olcum" id="lb-tolcum"></div>' +
    '<div class="ti-ayar">' +
    '<div><label for="lb-tanalit">Erlendeki çözelti</label><select id="lb-tanalit"></select></div>' +
    '<div><label for="lb-thacim">Hacmi</label><select id="lb-thacim"><option value="10">10 mL</option><option value="20">20 mL</option><option value="25" selected>25 mL</option></select></div>' +
    '<div><label for="lb-ttitrant">Bürette</label><select id="lb-ttitrant"></select></div>' +
    '<div><label for="lb-tgos">Gösterge</label><select id="lb-tgos"><option value="fenol">Fenolftalein</option><option value="mo">Metil oranj</option><option value="mk">Metil kırmızısı</option><option value="btb">Bromtimol mavisi</option><option value="">Yok (pH metre)</option></select></div>' +
    '</div><div class="ti-dug">' +
    '<button class="ab" data-ti="0.05">1 damla</button><button class="ab" data-ti="0.5">0,5 mL</button><button class="ab" data-ti="1">1 mL</button><button class="ab" data-ti="5">5 mL</button>' +
    '<button class="ab ana" data-ti="akit">' + ikon('oynat') + '<span>Sürekli akıt</span></button><button class="ab" data-ti="bas">' + ikon('temiz') + 'Baştan</button></div>' +
    '<div class="hiz"><span>Akış hızı</span><input type="range" id="lb-thiz" min="0.05" max="2" step="0.05" value="0.5"><span id="lb-thizd">0,5 mL/sn</span></div></div>' +
    '<div class="kart"><div class="panel-bas"><h2>Titrasyon eğrisi</h2><div class="secim" id="lb-teksen"><button class="on" data-e="ph">pH</button><button data-e="k">İletkenlik</button></div></div>' +
    '<div class="grafik"><canvas id="lb-tgraf"></canvas></div><div class="ti-sonuc" id="lb-tsonuc"></div></div></div></section>' +
    /* HAZIR DENEYLER */
    '<section class="mod" id="m-hazir"><p style="margin:0 0 12px;color:var(--tx2);font-size:14px">Bir deney seç; malzemeler tezgâha gelir, adımları tek dokunuşla yap ya da kendin dene.</p><div class="dn-izgara" id="lb-deneyler"></div></section>' +
    /* RAPOR */
    '<section class="mod" id="m-rapor"><div class="kart rapor"><h2 style="font-size:19px">Deney raporu</h2>' +
    '<label for="lb-rad">Deneyin adı</label><input id="lb-rad" placeholder="Örn. Metallerin aktifliği">' +
    '<label for="lb-ramac">Amaç</label><textarea id="lb-ramac" placeholder="Bu deneyde neyi araştırdın?"></textarea>' +
    '<label>Kullanılan malzemeler</label><div class="mlz" id="lb-rmlz"></div>' +
    '<label>Yapılanlar ve gözlemler</label><div class="rapor-liste" id="lb-rliste"></div>' +
    '<label for="lb-rsonuc">Sonuç ve yorum</label><textarea id="lb-rsonuc" placeholder="Gözlemlerinden hangi sonuca vardın?"></textarea>' +
    '<div class="dug"><button class="ab ana" data-is="rkopya">' + ikon('kopya') + 'Raporu kopyala</button><button class="ab" data-is="rtemiz">' + ikon('temiz') + 'Günlüğü temizle</button></div></div>' +
    '<p class="alt-not">Bu bir benzetimdir: sonuçlar gerçek deneylere yakın olacak şekilde hesaplanır ama gerçek laboratuvarın ve öğretmen gözetiminin yerini tutmaz.</p></section>' +
    '<div class="ort" id="lb-ort"></div><div class="pen" id="lb-pen" role="dialog" aria-modal="true"></div><div class="tost" id="lb-tost" role="status" aria-live="polite"></div>' +
    '</div>';

  /* ================= SEKMELER ================= */
  var mod = 'serbest';
  function modAc(m) {
    mod = m;
    $$('.lab-sekme button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-mod') === m); });
    $$('.mod').forEach(function (s) { s.classList.toggle('on', s.id === 'm-' + m); });
    if (m === 'titrasyon') { tiBoyut(); tiCiz(); grafikCiz(); }
    if (m === 'rapor') raporCiz();
    if (m === 'serbest') { boyut(); if (cz()) cz().boyut(); }
    try { history.replaceState(null, '', m === 'serbest' ? location.pathname + location.search : '#' + m); } catch (e) {}
  }
  $$('.lab-sekme button').forEach(function (b) { b.addEventListener('click', function () { modAc(b.getAttribute('data-mod')); }); });

  /* ================= TEZGÂH ÇİZİMİ ================= */
  var LW = 600, LH = 412, ZEMIN = 322;
  var G = [
    { tip: 'beher', x: 108, taban: 318, w: 136, h: 168, dolu: 0.93 },
    { tip: 'erlen', x: 302, taban: 318, tw: 172, nw: 46, gh: 144, bh: 56 },
    { tip: 'tup', x: 494, taban: 318, w: 40, h: 206 }
  ];
  /* Hacim → sıvı yüksekliği tabloları */
  (function () {
    var E = G[1], N = 240, H = E.gh + E.bh, v = 0, tw = E.tw / 2, nw = E.nw / 2;
    E.ys = [0]; E.vs = [0];
    for (var i = 1; i <= N; i++) { var y = H * i / N, r = y <= E.gh ? tw - (tw - nw) * (y / E.gh) : nw; v += Math.PI * r * r * H / N; E.ys.push(y); E.vs.push(v); }
    E.vtam = E.vs[Math.round(N * (E.gh + 0.3 * E.bh) / H)];
    var T = G[2], R = T.w / 2; T.ys = [0]; T.vs = [0]; v = 0;
    for (i = 1; i <= N; i++) { var yy = T.h * i / N, rr = yy < R ? Math.sqrt(Math.max(0, R * R - (R - yy) * (R - yy))) : R; v += Math.PI * rr * rr * T.h / N; T.ys.push(yy); T.vs.push(v); }
    T.vtam = T.vs[Math.round(N * 0.9)];
  })();
  function seviye(i, V) {
    var g = G[i], k = KAPLAR[i], f = Math.max(0, V / k.kapasite);
    if (g.tip === 'beher') return g.h * g.dolu * f;
    var hedef = f * g.vtam, j = 1;
    while (j < g.vs.length - 1 && g.vs[j] < hedef) j++;
    var a = g.vs[j - 1], b = g.vs[j];
    return g.ys[j - 1] + (g.ys[j] - g.ys[j - 1]) * (b > a ? (hedef - a) / (b - a) : 0);
  }
  function yariGen(i, y) {   /* tabandan y yükseklikte iç yarıçap */
    var g = G[i];
    if (g.tip === 'beher') return g.w / 2;
    if (g.tip === 'tup') { var R = g.w / 2; return y < R ? Math.sqrt(Math.max(0, R * R - (R - y) * (R - y))) : R; }
    return y <= g.gh ? g.tw / 2 - (g.tw / 2 - g.nw / 2) * (y / g.gh) : g.nw / 2;
  }
  function ust(i) { var g = G[i]; return g.tip === 'erlen' ? g.taban - g.gh - g.bh : g.taban - g.h; }
  function icYol(i, dis) {
    var g = G[i], p = new Path2D(), d = dis ? 3 : 0, x = g.x, b = g.taban + d;
    if (g.tip === 'beher') {
      var l = x - g.w / 2 - d, r = x + g.w / 2 + d, t = g.taban - g.h - (dis ? 4 : 0), rr = 13;
      p.moveTo(l, t); p.lineTo(l, b - rr); p.quadraticCurveTo(l, b, l + rr, b); p.lineTo(r - rr, b); p.quadraticCurveTo(r, b, r, b - rr); p.lineTo(r, t);
      if (!dis) p.closePath();
    } else if (g.tip === 'erlen') {
      var tw = g.tw / 2 + d, nw = g.nw / 2 + d, sy = g.taban - g.gh, ty = g.taban - g.gh - g.bh - (dis ? 4 : 0), rq = 16;
      p.moveTo(x - nw, ty); p.lineTo(x - nw, sy + 6); p.quadraticCurveTo(x - nw, sy + 12, x - nw - 5, sy + 20);
      p.lineTo(x - tw + 4, b - rq); p.quadraticCurveTo(x - tw - 2, b, x - tw + rq, b); p.lineTo(x + tw - rq, b);
      p.quadraticCurveTo(x + tw + 2, b, x + tw - 4, b - rq); p.lineTo(x + nw + 5, sy + 20); p.quadraticCurveTo(x + nw, sy + 12, x + nw, sy + 6); p.lineTo(x + nw, ty);
      if (!dis) p.closePath();
    } else {
      var R = g.w / 2 + d, tt = g.taban - g.h - (dis ? 4 : 0);
      p.moveTo(x - R, tt); p.lineTo(x - R, g.taban - g.w / 2); p.arc(x, g.taban - g.w / 2, R, Math.PI, 0, true); p.lineTo(x + R, tt);
      if (!dis) p.closePath();
    }
    return p;
  }
  var cv = $('#lb-tezgah'), cx = cv.getContext('2d'), olc = 1, dpr = 1;
  function boyut() {
    var w = cv.parentNode.clientWidth || 360;
    dpr = Math.min(2.5, window.devicePixelRatio || 1);
    olc = w / LW;
    cv.width = Math.round(w * dpr); cv.height = Math.round(LH * olc * dpr);
    cv.style.height = (LH * olc) + 'px';
  }
  window.addEventListener('resize', function () { boyut(); if (mod === 'titrasyon') { tiBoyut(); grafikCiz(); } });

  function arkaPlan(c) {
    var g1 = c.createLinearGradient(0, 0, 0, LH);
    var z = ZEMIN / LH;
    g1.addColorStop(0, '#FDFBF9'); g1.addColorStop(z, '#F2EBE3'); g1.addColorStop(z + 0.001, '#E8DACA'); g1.addColorStop(1, '#D9C7B2');
    c.fillStyle = g1; c.fillRect(0, 0, LW, LH);
    c.strokeStyle = 'rgba(120,95,70,.07)'; c.lineWidth = 1;
    for (var x = 30; x < LW; x += 60) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, ZEMIN - 2); c.stroke(); }
    for (var y = 22; y < ZEMIN - 2; y += 60) { c.beginPath(); c.moveTo(0, y); c.lineTo(LW, y); c.stroke(); }
    c.fillStyle = 'rgba(255,255,255,.6)'; c.fillRect(0, ZEMIN, LW, 2);
  }
  function ocak(c, i, t) {
    var g = G[i], k = KAPLAR[i], x = g.x, y = g.taban + 4, w = g.tip === 'tup' ? 70 : (g.tip === 'erlen' ? 190 : 176), isi = k.isit;
    c.fillStyle = 'rgba(60,40,20,.10)'; c.beginPath(); c.ellipse(x, y + 26, w * 0.55, 6, 0, 0, 7); c.fill();
    if (g.tip === 'tup') {   /* tüplük */
      c.fillStyle = '#B98B5E'; c.fillRect(x - 50, g.taban - 84, 100, 10); c.fillStyle = '#9E7449'; c.fillRect(x - 50, g.taban - 74, 100, 3);
      c.fillStyle = '#A97C50'; c.fillRect(x - 48, g.taban - 84, 7, 110); c.fillRect(x + 41, g.taban - 84, 7, 110);
    }
    var gr = c.createLinearGradient(0, y, 0, y + 24); gr.addColorStop(0, '#5E6268'); gr.addColorStop(1, '#3A3D42');
    c.fillStyle = gr; yuvarlak(c, x - w / 2, y + 2, w, 22, 6); c.fill();
    var ust0 = isi ? 'rgba(255,' + Math.round(110 + 40 * Math.sin(t * 3)) + ',40,1)' : '#9AA0A8';
    c.fillStyle = ust0; yuvarlak(c, x - w / 2 + 6, y - 1, w - 12, 6, 3); c.fill();
    if (isi) {
      var gl = c.createRadialGradient(x, y, 4, x, y, w * 0.6); gl.addColorStop(0, 'rgba(255,120,40,.45)'); gl.addColorStop(1, 'rgba(255,120,40,0)');
      c.fillStyle = gl; c.fillRect(x - w, y - 40, 2 * w, 60);
    }
    c.fillStyle = isi ? '#FF6A2B' : (k.karistir > 0 ? '#38C172' : '#2A2D31'); c.beginPath(); c.arc(x + w / 2 - 14, y + 13, 3.2, 0, 7); c.fill();
    c.fillStyle = '#C9CDD2'; c.beginPath(); c.arc(x - w / 2 + 16, y + 13, 5, 0, 7); c.fill();
  }
  function yuvarlak(c, x, y, w, hh, r) { c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r); c.lineTo(x + w, y + hh - r); c.quadraticCurveTo(x + w, y + hh, x + w - r, y + hh); c.lineTo(x + r, y + hh); c.quadraticCurveTo(x, y + hh, x, y + hh - r); c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath(); }
  function buzBanyosu(c, i, on) {
    var g = G[i], x = g.x, w = (g.tip === 'beher' ? g.w : (g.tip === 'erlen' ? g.tw : 40)) + 46, y0 = g.taban - 46;
    c.save();
    if (!on) {
      c.fillStyle = 'rgba(170,215,240,.35)'; yuvarlak(c, x - w / 2, y0, w, 52, 10); c.fill();
      for (var j = 0; j < 7; j++) { var ix = x - w / 2 + 8 + (j / 6) * (w - 30), iy = y0 + 6 + (j % 2) * 12; c.fillStyle = 'rgba(235,248,255,.95)'; yuvarlak(c, ix, iy, 14, 12, 3); c.fill(); c.strokeStyle = 'rgba(150,200,230,.8)'; c.stroke(); }
    } else {
      c.fillStyle = 'rgba(150,205,235,.28)'; yuvarlak(c, x - w / 2, y0 + 14, w, 38, 10); c.fill();
      c.strokeStyle = 'rgba(120,180,215,.8)'; c.lineWidth = 1.5; yuvarlak(c, x - w / 2, y0, w, 52, 10); c.stroke();
    }
    c.restore();
  }
  var BOS_RENK = [252, 252, 253];
  function kapCiz(c, i, t, dt) {
    var g = G[i], k = KAPLAR[i], R = M.renk(k), V = k.V, top = ust(i), lv = seviye(i, V), yl = g.taban - lv, ic = icYol(i);
    if (k.sogut) buzBanyosu(c, i, false);
    /* Arka cam */
    c.fillStyle = 'rgba(214,232,244,.20)'; c.fill(ic);
    c.save(); c.clip(ic);
    if (V > 1e-6) {
      var renk = [R.sivi[0] * 0.9, R.sivi[1] * 0.95, R.sivi[2] * 0.99], bul = R.bulanik;
      var sv = karis(renk, R.bulRenk, bul * 0.94);
      var gr = c.createLinearGradient(0, yl, 0, g.taban);
      gr.addColorStop(0, rgba(karis(sv, [255, 255, 255], 0.18), 0.86)); gr.addColorStop(1, rgba(karis(sv, [0, 0, 0], 0.06), 0.92));
      c.fillStyle = gr; c.fillRect(g.x - 100, yl, 200, g.taban - yl + 8);
      var gk = c.createLinearGradient(g.x - 90, 0, g.x + 90, 0);
      gk.addColorStop(0, 'rgba(20,40,60,.10)'); gk.addColorStop(0.3, 'rgba(20,40,60,0)'); gk.addColorStop(0.7, 'rgba(20,40,60,0)'); gk.addColorStop(1, 'rgba(20,40,60,.12)');
      c.fillStyle = gk; c.fillRect(g.x - 100, yl, 200, g.taban - yl + 8);
      c.strokeStyle = rgba(karis(sv, [40, 60, 80], 0.35), 0.55); c.lineWidth = 1.2; var hw0 = yariGen(i, lv);
      c.beginPath(); c.moveTo(g.x - hw0, yl + 0.5); c.lineTo(g.x + hw0, yl + 0.5); c.stroke();
      /* Karıştırma girdabı */
      var hw = yariGen(i, lv), kr = k.karistir > 0 ? Math.min(1, k.karistir) : 0;
      c.fillStyle = 'rgba(255,255,255,.55)';
      c.beginPath(); c.moveTo(g.x - hw, yl); c.quadraticCurveTo(g.x, yl + 3 + kr * Math.min(10, lv * 0.25), g.x + hw, yl); c.lineTo(g.x + hw, yl - 2); c.lineTo(g.x - hw, yl - 2); c.fill();
      /* Askıdaki tanecikler */
      if (bul > 0.04) {
        c.fillStyle = rgba(karis(R.bulRenk, [120, 120, 120], 0.12), 0.75);
        var n = Math.round(14 + 60 * bul);
        for (var j = 0; j < n; j++) {
          var px = g.x + (rnd(j + i * 97) - 0.5) * 2 * yariGen(i, lv * rnd(j * 3.1 + i)) * 0.9;
          var py = g.taban - ((rnd(j * 7.7 + i) * lv + t * (3 + 6 * rnd(j)) * (1 - k.askida * 0.6)) % Math.max(4, lv));
          c.fillRect(px, py, 1.6, 1.6);
        }
      }
      /* Kükürt / karbon / dipteki çökelek */
      var cokMol = 0, cr = 0, cg = 0, cb = 0;
      R.cokelek.forEach(function (o) { var rr = hexRgb(o.renk); cokMol += o.mol; cr += rr[0] * o.mol; cg += rr[1] * o.mol; cb += rr[2] * o.mol; });
      if (cokMol > 1e-8) {
        var sh = Math.min(28, 3 + 10 * Math.pow(cokMol * 1000, 1 / 3)) * (1 - k.askida * 0.85), crgb = [cr / cokMol, cg / cokMol, cb / cokMol];
        if (sh > 0.8) {
          var w0 = yariGen(i, sh) + 2;
          c.fillStyle = rgba(crgb, 0.96);
          c.beginPath(); c.moveTo(g.x - w0 - 4, g.taban + 4); c.lineTo(g.x - w0, g.taban - sh * 0.55);
          c.quadraticCurveTo(g.x, g.taban - sh * 1.25, g.x + w0, g.taban - sh * 0.55); c.lineTo(g.x + w0 + 4, g.taban + 4); c.fill();
          c.fillStyle = 'rgba(0,0,0,.06)';
          for (j = 0; j < 18; j++) c.fillRect(g.x + (rnd(j + 40) - 0.5) * 2 * w0 * 0.9, g.taban - rnd(j + 77) * sh * 0.8, 1.5, 1.5);
        }
      }
      /* Altın yağmuru parıltısı */
      var par = R.cokelek.filter(function (o) { return o.parilti; })[0];
      if (par && k.kristal > 0) {
        for (j = 0; j < 46; j++) {
          var fx = g.x + (rnd(j * 1.3 + 5) - 0.5) * 2 * yariGen(i, lv * 0.5) * 0.85;
          var fy = yl + ((rnd(j * 2.9) * lv + t * (6 + 8 * rnd(j + 9))) % Math.max(5, lv - 3));
          var tw = 0.5 + 0.5 * Math.sin(t * 6 + j * 1.7);
          c.fillStyle = 'rgba(255,' + Math.round(200 + 40 * tw) + ',40,' + (0.55 + 0.45 * tw) + ')';
          c.save(); c.translate(fx, fy); c.rotate(j + t); c.fillRect(-2.2, -0.8, 4.4, 1.6); c.restore();
        }
      }
    }
    /* Metaller */
    metalCiz(c, i, t, yl, lv);
    /* Kabarcıklar */
    kabarcikCiz(c, i, dt, yl, lv);
    /* Manyetik karıştırıcı balığı */
    if (k.karistir > 0 && V > 1e-6 && g.tip !== 'tup') {
      c.save(); c.translate(g.x, g.taban - 5); var ac = t * 14; c.fillStyle = '#FFFFFF'; c.strokeStyle = '#BFC5CC';
      c.beginPath(); c.ellipse(0, 0, 16 * Math.abs(Math.cos(ac)) + 4, 3.2, 0, 0, 7); c.fill(); c.stroke(); c.restore();
    }
    c.restore();
    /* Karbon sütunu (şeker + derişik H2SO4) */
    if ((k.n.C || 0) > 1e-6) {
      var hc = Math.min(250, (k.n.C * 12) * 26 / 250 * (g.h || 150) * 1.1), wc = yariGen(i, lv) * 0.85;
      c.save(); c.fillStyle = '#1A1714';
      c.beginPath(); c.moveTo(g.x - wc, g.taban - 2);
      for (var s = 0; s <= 12; s++) { var yy = g.taban - 2 - hc * s / 12, ww = wc * (0.75 + 0.25 * Math.sin(s * 1.7)); c.lineTo(g.x - ww, yy); }
      c.quadraticCurveTo(g.x, g.taban - hc - 14, g.x + wc * 0.8, g.taban - hc);
      for (s = 12; s >= 0; s--) { var y2 = g.taban - 2 - hc * s / 12, w2 = wc * (0.78 + 0.22 * Math.cos(s * 1.3)); c.lineTo(g.x + w2, y2); }
      c.fill();
      c.fillStyle = 'rgba(80,72,64,.7)'; for (s = 0; s < 40; s++) { c.beginPath(); c.arc(g.x + (rnd(s) - 0.5) * wc * 1.4, g.taban - rnd(s + 9) * hc, 1 + rnd(s + 3) * 2.2, 0, 7); c.fill(); }
      c.restore();
    }
    /* Köpük */
    if (k.kopuk > 1e-5 || k.tasma > 1e-4) kopukCiz(c, i, t, yl, lv, R);
    /* Cam */
    var dis = icYol(i, true);
    c.strokeStyle = 'rgba(92,116,140,.78)'; c.lineWidth = 2.5; c.stroke(dis);
    c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 1; c.stroke(ic);
    c.save(); c.clip(ic); c.fillStyle = 'rgba(255,255,255,.28)';
    if (g.tip === 'beher') { c.fillRect(g.x - g.w / 2 + 7, top + 10, 7, g.h - 22); c.fillRect(g.x + g.w / 2 - 12, top + 14, 3, g.h - 40); }
    else if (g.tip === 'erlen') { c.beginPath(); c.moveTo(g.x - g.nw / 2 + 5, top + 6); c.lineTo(g.x - g.nw / 2 + 10, top + 6); c.lineTo(g.x - g.tw / 2 + 26, g.taban - 18); c.lineTo(g.x - g.tw / 2 + 16, g.taban - 18); c.fill(); }
    else c.fillRect(g.x - g.w / 2 + 5, top + 8, 5, g.h - 30);
    c.restore();
    /* Ağız kenarı ve dereceler */
    c.strokeStyle = 'rgba(105,128,150,.75)'; c.lineWidth = 3; c.lineCap = 'round';
    if (g.tip === 'beher') { c.beginPath(); c.moveTo(g.x - g.w / 2 - 9, top - 7); c.lineTo(g.x - g.w / 2 - 2, top - 3); c.moveTo(g.x + g.w / 2 + 2, top - 4); c.lineTo(g.x + g.w / 2 + 6, top - 4); c.stroke(); }
    else if (g.tip === 'erlen') { c.beginPath(); c.moveTo(g.x - g.nw / 2 - 6, top - 4); c.lineTo(g.x + g.nw / 2 + 6, top - 4); c.stroke(); }
    else { c.beginPath(); c.moveTo(g.x - g.w / 2 - 5, top - 4); c.lineTo(g.x + g.w / 2 + 5, top - 4); c.stroke(); }
    c.lineCap = 'butt'; c.strokeStyle = 'rgba(90,110,130,.55)'; c.lineWidth = 1; c.fillStyle = 'rgba(70,88,105,.7)'; c.font = '9px system-ui,sans-serif';
    var isaret = g.tip === 'tup' ? [5, 10, 15, 20] : [50, 100, 150, 200];
    isaret.forEach(function (ml) {
      var yy = g.taban - seviye(i, ml / 1000), xr = g.x + yariGen(i, g.taban - yy) - 2;
      c.beginPath(); c.moveTo(xr - 9, yy); c.lineTo(xr, yy); c.stroke();
      if (g.tip !== 'tup') c.fillText(String(ml), xr - 27, yy + 3);
    });
    /* Buhar, gaz bulutu, koku */
    var agiz = top - 6, vx = g.x;
    var buh = Math.max(k.buhar, k.T > 70 && V > 1e-6 ? (k.T - 70) / 30 : 0);
    if (buh > 0.02) for (j = 0; j < 6; j++) {
      var ph = (t * 0.35 + j / 6) % 1, bx = vx + Math.sin(t * 1.3 + j * 2) * 10 + (j - 2.5) * 5, by = agiz - ph * 70;
      c.fillStyle = 'rgba(255,255,255,' + (0.5 * buh * (1 - ph)) + ')'; c.beginPath(); c.arc(bx, by, 6 + ph * 14, 0, 7); c.fill();
    }
    [['Cl2', [196, 214, 70]], ['NO2', [160, 74, 24]], ['NH2Cl', [220, 225, 200]]].forEach(function (gz) {
      var b = k.bulut[gz[0]] || 0;
      if (b > 0.02) for (var q = 0; q < 7; q++) {
        var ph2 = (t * 0.22 + q / 7) % 1, gx = vx + Math.sin(t + q * 1.9) * 16 + (q - 3) * 7, gy = agiz - ph2 * 90;
        c.fillStyle = rgba(gz[1], 0.38 * Math.min(1, b) * (1 - ph2)); c.beginPath(); c.arc(gx, gy, 9 + ph2 * 18, 0, 7); c.fill();
      }
    });
    var koku = (k.gazHiz.NH3 || 0) + (k.gazHiz.SO2 || 0) + (k.gazHiz.NH2Cl || 0) + (k.gazHiz.Cl2 || 0), q;
    if (koku > 2e-6) {
      c.strokeStyle = 'rgba(120,110,100,.45)'; c.lineWidth = 1.4;
      for (q = 0; q < 3; q++) {
        var ox = vx - 16 + q * 16, ph3 = (t * 0.5 + q * 0.33) % 1;
        c.beginPath();
        for (var s2 = 0; s2 <= 10; s2++) { var yy3 = agiz - 6 - s2 * 3.4 - ph3 * 12, xx3 = ox + Math.sin(s2 * 0.9 + t * 3 + q) * 4; if (s2) c.lineTo(xx3, yy3); else c.moveTo(xx3, yy3); }
        c.stroke();
      }
    }
    if (k.sogut) buzBanyosu(c, i, true);
  }
  function metalCiz(c, i, t, yl, lv) {
    var g = G[i], k = KAPLAR[i];
    k.metal.forEach(function (p, j) {
      var Md = M.METAL[p.m], gr = p.n * Md.MA, s = 5 + 9 * Math.pow(Math.max(gr, 0.002), 1 / 3), rk = Md.renk;
      var x0 = g.x + (p.x - 0.5) * (g.tip === 'tup' ? 10 : (g.tip === 'erlen' ? 80 : 70)), y0 = g.taban - 4;
      if (Md.yuzer && lv > 4) {   /* yüzen metal (Na, K, Li) */
        var gen = yariGen(i, lv) - s;
        x0 = g.x + Math.sin(t * (1.7 + p.x) + p.aci) * gen * 0.8 + Math.sin(t * 4.3 + j) * 3; y0 = yl - 1;
        c.fillStyle = rk; yuvarlak(c, x0 - s / 2, y0 - s * 0.55, s, s * 0.7, 2); c.fill();
        if (p.m === 'K' && (k.gazHiz.H2 || 0) > 1e-5) { var fl = c.createRadialGradient(x0, y0 - s, 1, x0, y0 - s, s * 2.2); fl.addColorStop(0, 'rgba(220,170,255,.95)'); fl.addColorStop(1, 'rgba(180,120,240,0)'); c.fillStyle = fl; c.beginPath(); c.arc(x0, y0 - s, s * 2.2, 0, 7); c.fill(); }
        return;
      }
      if (p.cokme) {   /* açığa çıkan metal */
        var adet = Math.min(70, 6 + Math.round(gr * 260));
        for (var q = 0; q < adet; q++) {
          var hedef = k.metal.filter(function (m) { return !m.cokme; })[0], hx = hedef ? g.x + (hedef.x - 0.5) * (g.tip === 'tup' ? 10 : (g.tip === 'erlen' ? 80 : 70)) : g.x;
          var px = hx + (rnd(q + j * 13) - 0.5) * (p.m === 'Ag' ? 26 : 40), py = g.taban - 3 - rnd(q * 2.3 + j) * (p.m === 'Ag' ? 26 : 8);
          if (p.m === 'Ag') { c.strokeStyle = 'rgba(200,206,212,.95)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(px, py); c.lineTo(px + (rnd(q) - 0.5) * 7, py - 4 - rnd(q + 5) * 5); c.stroke(); if (q % 5 === 0) { c.fillStyle = 'rgba(255,255,255,' + (0.5 + 0.5 * Math.sin(t * 5 + q)) + ')'; c.fillRect(px, py - 3, 1.5, 1.5); } }
          else { c.fillStyle = p.m === 'Cu' ? '#B4562C' : (p.m === 'Pb' ? '#4E555E' : '#5E6369'); c.fillRect(px, py, 2.2, 2); }
        }
        return;
      }
      c.save(); c.translate(x0, y0);
      var kap = p.kap ? M.METAL[p.kap].renk : null;
      var renk = kap ? rgba(karis(hexRgb(rk), hexRgb(kap), Math.min(0.85, (p.kapMiktar || 0) * 400)), 1) : rk;
      c.fillStyle = renk; c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 0.8;
      if (p.toz) { for (q = 0; q < 26; q++) { c.fillRect((rnd(q + j) - 0.5) * s * 3, -rnd(q * 3 + j) * 4, 2, 2); } }
      else if (p.m === 'Mg') { c.strokeStyle = renk; c.lineWidth = 3; c.beginPath(); c.moveTo(-s, 0); for (q = 1; q <= 6; q++) c.lineTo(-s + q * s / 3, q % 2 ? -s * 0.7 : -1); c.stroke(); }
      else if (p.m === 'Cu') { c.strokeStyle = renk; c.lineWidth = 2.4; c.beginPath(); for (q = 0; q <= 40; q++) { var a = q / 40 * Math.PI * 6, xx = -s + q / 40 * 2 * s, yy = -s * 0.5 - Math.sin(a) * s * 0.35; if (q) c.lineTo(xx, yy); else c.moveTo(xx, yy); } c.stroke(); }
      else if (p.m === 'Fe') { c.rotate(-0.25); c.fillRect(-s * 1.4, -3, s * 2.6, 3.4); c.fillRect(-s * 1.5, -5, 3, 7.4); c.beginPath(); c.moveTo(s * 1.2, -3); c.lineTo(s * 1.6, -1.3); c.lineTo(s * 1.2, 0.4); c.fill(); }
      else if (p.m === 'Al') { c.beginPath(); for (q = 0; q < 9; q++) { var a2 = q / 9 * 6.283, rr = s * (0.6 + 0.4 * rnd(q + 3)); var xa = Math.cos(a2) * rr, ya = -s * 0.6 + Math.sin(a2) * rr * 0.6; if (q) c.lineTo(xa, ya); else c.moveTo(xa, ya); } c.closePath(); c.fill(); c.stroke(); }
      else { for (q = 0; q < 3; q++) { c.beginPath(); c.ellipse((q - 1) * s * 0.7, -s * 0.35 - (q === 1 ? s * 0.3 : 0), s * 0.45, s * 0.38, q, 0, 7); c.fill(); c.stroke(); } }
      c.restore();
    });
  }
  function kabarcikCiz(c, i, dt, yl, lv) {
    var k = KAPLAR[i], g = G[i], L = kabarcik[i];
    if (k.V > 1e-6) {
      var hiz = 0, gz;
      for (gz in k.gazHiz) if (gz !== 'NH3' && gz !== 'NH2Cl' && gz !== 'SO2') hiz += k.gazHiz[gz] || 0;
      var adet = Math.min(110, 5200 * Math.pow(hiz, 0.62)) * dt;
      if (k.kaynama) adet += 22 * dt;
      var kaynak = k.metal.filter(function (p) { return !p.cokme && !M.METAL[p.m].yuzer; });
      var yuzen = k.metal.filter(function (p) { return M.METAL[p.m].yuzer; });
      while (adet > 0) {
        if (adet < 1 && Math.random() > adet) break;
        adet -= 1;
        var x, y, b = { r: 1 + Math.random() * 2.6, vy: 34 + Math.random() * 40, faz: Math.random() * 6 };
        if (k.kaynama && Math.random() < 0.4) { b.r = 2.5 + Math.random() * 3.5; b.vy = 60; x = g.x + (Math.random() - 0.5) * 1.6 * yariGen(i, 4); y = g.taban - 3; }
        else if (yuzen.length && (k.gazHiz.H2 || 0) > 1e-6) { x = g.x + (Math.random() - 0.5) * yariGen(i, lv) * 1.4; y = yl - 1; b.vy = 4; b.r = 1 + Math.random() * 1.5; }
        else if (kaynak.length && ((k.gazHiz.H2 || 0) + (k.gazHiz.NO2 || 0) + (k.gazHiz.NO || 0)) > hiz * 0.4) { var p = kaynak[Math.floor(Math.random() * kaynak.length)]; x = g.x + (p.x - 0.5) * (g.tip === 'tup' ? 10 : (g.tip === 'erlen' ? 80 : 70)) + (Math.random() - 0.5) * 14; y = g.taban - 6; }
        else { var yy = Math.random() * lv * 0.85; x = g.x + (Math.random() - 0.5) * 1.7 * yariGen(i, yy); y = g.taban - 3 - yy * Math.random(); }
        b.x = x; b.y = y; L.push(b);
      }
    }
    c.strokeStyle = 'rgba(255,255,255,.95)'; c.fillStyle = 'rgba(255,255,255,.28)'; c.lineWidth = 0.9;
    for (var j = L.length - 1; j >= 0; j--) {
      var q = L[j];
      q.y -= q.vy * dt; q.faz += dt * 8; q.x += Math.sin(q.faz) * 0.25;
      if (q.y < yl + q.r || k.V < 1e-6) { L.splice(j, 1); continue; }
      c.beginPath(); c.arc(q.x, q.y, q.r, 0, 7); c.fill(); c.stroke();
    }
    if (L.length > 400) L.splice(0, L.length - 400);
  }
  function kopukCiz(c, i, t, yl, lv, R) {
    var g = G[i], k = KAPLAR[i], top = ust(i);
    var ml = k.kopuk * 1000, fy = yl - Math.min(yl - top + 2, seviye(i, k.V + k.kopuk) - lv);
    var renk = karis(R.sivi, [255, 255, 255], 0.65);
    c.save(); c.clip(icYol(i));
    c.fillStyle = rgba(renk, 0.97); c.fillRect(g.x - 90, fy, 180, yl - fy + 1);
    c.fillStyle = 'rgba(255,255,255,.7)';
    for (var j = 0; j < 40; j++) { c.beginPath(); c.arc(g.x + (rnd(j) - 0.5) * 160, fy + rnd(j + 4) * (yl - fy), 1.5 + rnd(j + 8) * 3, 0, 7); c.fill(); }
    c.restore();
    if (k.tasma > 1e-4) {
      var cik = Math.min(130, 30 + k.tasma * 90), w = g.tip === 'erlen' ? g.nw / 2 + 4 : (g.tip === 'tup' ? g.w / 2 + 3 : g.w / 2 + 3);
      c.fillStyle = rgba(renk, 0.98);
      c.beginPath(); c.moveTo(g.x - w, top);
      c.bezierCurveTo(g.x - w - 6, top - cik * 0.6, g.x - w * 0.3, top - cik, g.x, top - cik * 0.95);
      c.bezierCurveTo(g.x + w * 0.4, top - cik * 1.05, g.x + w + 8, top - cik * 0.5, g.x + w, top);
      c.closePath(); c.fill();
      var akis = Math.min(1, k.tasma * 2);
      [-1, 1].forEach(function (yon) {
        var x1 = g.x + yon * w, akY = top + (g.taban - top) * akis;
        c.beginPath(); c.moveTo(x1, top);
        var gen = g.tip === 'erlen' ? g.tw / 2 : w;
        c.bezierCurveTo(x1 + yon * 14, top + 30, g.x + yon * (gen + 10), akY - 30, g.x + yon * (gen + 6), akY);
        c.lineTo(g.x + yon * (gen + 18), akY); c.bezierCurveTo(g.x + yon * (gen + 22), akY - 30, x1 + yon * 26, top + 10, x1 + yon * 6, top - 4); c.fill();
        if (akis > 0.95) { c.beginPath(); c.ellipse(g.x + yon * (gen + 14), g.taban + 6, 26 + k.tasma * 14, 6, 0, 0, 7); c.fill(); }
      });
      c.fillStyle = 'rgba(255,255,255,.75)';
      for (j = 0; j < 24; j++) { c.beginPath(); c.arc(g.x + (rnd(j + 50) - 0.5) * w * 2.2, top - rnd(j + 60) * cik * 0.9, 1.5 + rnd(j + 70) * 3, 0, 7); c.fill(); }
    }
  }
  function etiketCiz(c, i) {
    var g = G[i], k = KAPLAR[i], x = g.x, y = g.taban + 52, sec = i === aktif;
    c.textAlign = 'center';
    c.font = '700 15px "Bricolage Grotesque","IBM Plex Sans",system-ui,sans-serif'; c.fillStyle = sec ? '#C54200' : '#3A332E';
    c.fillText(k.ad, x, y);
    c.font = '500 12.5px "IBM Plex Sans",system-ui,sans-serif'; c.fillStyle = '#6B625B';
    var alt = k.V > 1e-6 ? Y.tr(k.V * 1000, k.V < 0.0095 ? 1 : 0) + ' mL · pH ' + (k.r ? Y.tr(Math.max(-1, Math.min(15, k.r.pH)), 1) : '–') + ' · ' + Y.tr(k.T, 0) + ' °C' : (k.metal.length || Object.keys(k.n).length ? 'katı var' : 'boş');
    c.fillText(alt, x, y + 17);
    if (sec) { c.fillStyle = '#F85300'; yuvarlak(c, x - 34, y + 25, 68, 4, 2); c.fill(); }
    if (rozet[i] && !sec) { c.fillStyle = '#F85300'; c.beginPath(); c.arc(x + c.measureText(k.ad).width / 2 + 30, y - 14, 5, 0, 7); c.fill(); }
    c.textAlign = 'left';
  }
  function animCiz(c, t) {
    var su = simdi();
    for (var j = anim.length - 1; j >= 0; j--) {
      var a = anim[j], p = (su - a.t0) / a.sure;
      if (p >= 1) { anim.splice(j, 1); continue; }
      var g = G[a.i], top = ust(a.i), mx = g.x, egim = Math.min(1, p * 4) * (p > 0.8 ? (1 - p) * 5 : 1);
      c.save();
      if (a.tur === 'sivi') {
        var sx = mx - 34, sy = top - 62;
        c.translate(sx, sy); c.rotate(egim * 1.15);
        c.fillStyle = 'rgba(255,255,255,.92)'; c.strokeStyle = 'rgba(105,128,150,.8)'; c.lineWidth = 1.6;
        yuvarlak(c, -12, -34, 24, 44, 5); c.fill(); c.stroke(); c.fillRect(-5, -44, 10, 12); c.strokeRect(-5, -44, 10, 12);
        c.fillStyle = rgba(a.renk, 0.85); yuvarlak(c, -10, -12, 20, 20, 4); c.fill();
        c.restore(); c.save();
        if (p > 0.18 && p < 0.86) {
          var x1 = sx + 30, y1 = sy + 4, y2 = g.taban - seviye(a.i, KAPLAR[a.i].V);
          c.strokeStyle = rgba(karis(a.renk, [200, 220, 235], 0.3), 0.85); c.lineWidth = 3.5;
          c.beginPath(); c.moveTo(x1, y1); c.quadraticCurveTo(mx - 6, y1 + 6, mx - 4, y2); c.stroke();
        }
      } else if (a.tur === 'damla') {
        c.fillStyle = 'rgba(255,255,255,.95)'; c.strokeStyle = 'rgba(105,128,150,.8)'; c.lineWidth = 1.4;
        yuvarlak(c, mx - 4, top - 70, 8, 34, 3); c.fill(); c.stroke();
        c.fillStyle = '#3A3D42'; yuvarlak(c, mx - 7, top - 86, 14, 18, 5); c.fill();
        var dy = top - 34 + ((p * 3) % 1) * (g.taban - seviye(a.i, KAPLAR[a.i].V) - top + 34);
        c.fillStyle = rgba(a.renk, 0.95); c.beginPath(); c.arc(mx, dy, 3, 0, 7); c.fill();
      } else if (a.tur === 'kati') {
        c.translate(mx - 24, top - 30); c.rotate(-0.35 + egim * 0.5);
        c.fillStyle = '#B8BEC6'; c.fillRect(-36, -2, 44, 4); c.beginPath(); c.ellipse(12, 0, 10, 5, 0, 0, 7); c.fill();
        c.restore(); c.save();
        if (p > 0.25) for (var q = 0; q < 16; q++) { var gy = top - 20 + ((p * 2 + q / 16) % 1) * (g.taban - top); c.fillStyle = rgba(a.renk, 0.9); c.fillRect(mx - 12 + rnd(q) * 18, gy, 2.2, 2.2); }
      } else if (a.tur === 'metal') {
        var my = top - 40 + Math.min(1, p * 1.6) * (g.taban - top + 30);
        c.fillStyle = a.renkHex; c.fillRect(mx - 6, my, 12, 6);
      }
      c.restore();
    }
  }
  var sonCiz = simdi();
  function tezgahCiz(t, dt) {
    cx.setTransform(olc * dpr, 0, 0, olc * dpr, 0, 0);
    arkaPlan(cx);
    for (var i = 0; i < 3; i++) { ocak(cx, i, t); kapCiz(cx, i, t, dt); etiketCiz(cx, i); }
    animCiz(cx, t);
  }
  cv.addEventListener('click', function (e) {
    var r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / olc;
    var i = x < 205 ? 0 : (x < 405 ? 1 : 2);
    kapSec(i);
  });
  function kapSec(i) {
    if (!(i >= 0 && i < KAPLAR.length)) return;
    aktif = i; rozet[i] = 0;
    if (LAx.olay) LAx.olay('sec', { i: i });
    gozlemCiz(); olcumCiz(); icerikCiz(); dugmeDurum();
    var k = KAPLAR[i];
    seritYaz(null, '<b>' + h(k.ad) + '</b> seçili' + (k.V > 1e-6 ? ' · ' + Y.tr(k.V * 1000, 1) + ' mL' : ' · boş'));
  }

  /* ================= ÖLÇÜMLER ================= */
  function olcumHtml(k, tit) {
    var r = k.r, pH = r ? Math.max(-1, Math.min(15, r.pH)) : null, kap = M.iletkenlik(k);
    var parl = Math.max(0, Math.min(1, Math.log(Math.max(kap, 1e-3) / 0.05) / Math.log(40 / 0.05)));
    var amp = 'background:' + (parl > 0.02 ? 'rgba(255,' + Math.round(170 + 70 * parl) + ',40,' + (0.35 + 0.65 * parl) + ');box-shadow:0 0 ' + Math.round(14 * parl) + 'px rgba(255,190,40,' + parl + ')' : '#ddd');
    return '<div class="olc"><small>pH</small><strong>' + (pH === null ? '–' : Y.tr(pH, 2)) + '</strong><div class="phbar"><i style="left:' + (pH === null ? -10 : Math.max(0, Math.min(100, pH / 14 * 100))) + '%"></i></div></div>' +
      '<div class="olc' + (tit ? '' : ' tik') + '"' + (tit ? '' : ' data-is="sicaklik" role="button" tabindex="0" title="Sıcaklığı ayarla"') + '><small>Sıcaklık' + (!tit && tutT[aktif] !== null && KAPLAR[aktif] === k ? ' → ' + tutT[aktif] + ' °C' : '') + '</small><strong>' + Y.tr(k.T, 1) + '<span class="birim">°C</span></strong></div>' +
      '<div class="olc"><small>' + (tit ? 'Eklenen' : 'Hacim') + '</small><strong>' + (tit ? Y.tr(ti.v, 2) : Y.tr(k.V * 1000, k.V < 0.0095 ? 2 : 1)) + '<span class="birim">mL</span></strong></div>' +
      '<div class="olc"><small><span class="ampul" style="' + amp + '"></span>İletkenlik</small><strong>' + (k.V > 1e-6 ? Y.tr(kap, kap < 10 ? 2 : (kap < 100 ? 1 : 0)) : '–') + '<span class="birim">mS/cm</span></strong></div>';
  }
  function olcumCiz() { $('#lb-olcum').innerHTML = olcumHtml(KAPLAR[aktif]); }
  function dugmeDurum() {
    var k = KAPLAR[aktif];
    $('[data-is="isit"]').classList.toggle('on', k.isit);
    $('[data-is="sogut"]').classList.toggle('on', k.sogut);
    $('[data-is="isit"]').lastChild.textContent = k.isit ? 'Isıtılıyor' : 'Isıt';
    $('[data-is="sogut"]').lastChild.textContent = k.sogut ? 'Soğutuluyor' : 'Soğut';
    var mb = $('[data-is="malzeme"]'); if (mb && cz()) mb.hidden = !!LAx.kilit;
  }
  function seritYaz(renk, metin) {
    var s = $('#lb-serit');
    s.innerHTML = '<span class="nokta" style="background:' + (renk || 'var(--tx3)') + '"></span><span>' + metin + '</span>' + (KAPLAR[aktif].tiyo >= 0 && !KAPLAR[aktif].tiyoBitti ? '<span class="sag">⏱ ' + Y.tr(KAPLAR[aktif].zaman - KAPLAR[aktif].tiyoT0, 0) + ' sn</span>' : '');
    s.classList.remove('yeni'); void s.offsetWidth; s.classList.add('yeni');
  }

  /* ================= GÖZLEMLER ================= */
  var TUR_RENK = { cokelme: '#8C8C8C', gaz: '#3B82C4', tehlike: '#B42318', renk: '#8A4FC4', notr: '#1B6B4A', isi: '#E8730C', metal: '#B5642F', cozunme: '#5A9BD5', uyari: '#A15C00', bilgi: '#B9AFA5', yok: '#B9AFA5' };
  function dnk(x) { return h(x).split(/( \+ | → | ⇌ )/).map(function (p) { return /^ (\+|→|⇌) $/.test(p) ? p : '<span class="nw">' + p + '</span>'; }).join(''); }
  function olayHtml(o, kapAd) {
    var s = '<div class="ol ' + h(o.tur) + '"' + (o.renk && o.tur !== 'tehlike' ? ' style="border-left-color:' + h(o.renk) + '"' : '') + '>';
    if (kapAd) s += '<div class="kap-ad">' + h(kapAd) + '</div>';
    s += '<h3>' + h(o.baslik) + '</h3>';
    if (o.gozlem) s += '<p>' + h(o.gozlem) + '</p>';
    if (o.net) s += '<div class="dnk"><span>' + (/[⁺⁻]/.test(o.net) ? 'Net iyon denklemi' : 'Tepkime denklemi') + '</span><div>' + dnk(o.net) + '</div></div>';
    if (o.denklem) s += '<div class="dnk"><span>Denklem</span><div>' + dnk(o.denklem) + '</div></div>';
    if (o.katalizor) s += '<p style="font-size:13px">Katalizör: <b>' + h(o.katalizor) + '</b></p>';
    if (o.aciklama) s += '<details' + (o.tur === 'tehlike' ? ' open' : '') + '><summary>Neden?</summary><p>' + h(o.aciklama) + '</p></details>';
    if (o.konu) s += '<span class="etk">' + h(o.konu) + '</span>';
    return s + '</div>';
  }
  function gozlemCiz() {
    var L = olaylarK[aktif], k = KAPLAR[aktif];
    var html = L.length ? L.slice(0, 14).map(function (o) { return olayHtml(o); }).join('') :
      '<div class="bos"><b>' + h(k.ad) + '</b> için henüz gözlem yok.<br>Kimyasal ekle ya da <b>Hazır deneyler</b>’den birini seç.</div>';
    $('#lb-gozlem1').innerHTML = html; $('#lb-gozlem2').innerHTML = html;
    var e = L.length ? L.length + ' gözlem · ' + k.ad : k.ad;
    $('#lb-gk1').textContent = e; $('#lb-gk2').textContent = e;
  }
  function olaylariIsle(i, L) {
    if (!L || !L.length) return;
    var k = KAPLAR[i], sure = (Date.now() - t0) / 1000;
    L.forEach(function (o) {
      olaylarK[i].unshift(o);
      gunluk.push({ t: sure, kap: k.ad, o: o });
      if (o.tur === 'tehlike' || o.seviye === 'tehlike') tost('⚠ ' + o.baslik, true);
    });
    if (olaylarK[i].length > 40) olaylarK[i].length = 40;
    var son = L[L.length - 1];
    for (var j = L.length - 1; j >= 0; j--) if (L[j].tur !== 'bilgi' && L[j].tur !== 'yok') { son = L[j]; break; }
    if (i === aktif) { gozlemCiz(); seritYaz(son.renk || TUR_RENK[son.tur], h(son.baslik)); icerikCiz(); }
    else { rozet[i] = 1; if (son.tur !== 'bilgi' && son.tur !== 'yok') tost(k.ad + ': ' + son.baslik); }
  }

  /* ================= İÇERİK ================= */
  function icerikCiz() {
    var k = KAPLAR[aktif], I = M.icerik(k), s = '';
    $('#lb-ick').textContent = k.V > 1e-6 ? Y.tr(k.V * 1000, 1) + ' mL çözelti' : '';
    if (!I.cozunen.length && !I.kati.length) { $('#lb-icerik').innerHTML = '<div class="bos">Kap boş.</div>'; return; }
    s += '<table>';
    if (I.cozunen.length) { s += '<tr><td class="bolum" colspan="2">Çözeltide (derişim)</td></tr>'; I.cozunen.slice(0, 16).forEach(function (x) { s += '<tr><td>' + h(x.ad) + '</td><td>' + h(Y.derisim(x.c)) + '</td></tr>'; }); }
    if (I.kati.length) { s += '<tr><td class="bolum" colspan="2">Katılar</td></tr>'; I.kati.forEach(function (x) { s += '<tr><td>' + h(x.ad) + '</td><td>' + (x.g !== undefined ? Y.tr(x.g, x.g < 0.1 ? 3 : 2) + ' g' : (x.n ? h(Y.molYaz(x.n)) : '')) + '</td></tr>'; }); }
    if (I.gosterge.length) { s += '<tr><td class="bolum" colspan="2">Göstergeler</td></tr>'; I.gosterge.forEach(function (x) { s += '<tr><td>' + h(x.ad) + '</td><td>' + h(x.renk) + '</td></tr>'; }); }
    $('#lb-icerik').innerHTML = s + '</table>';
  }

  /* ================= KİMYASAL DOLABI ================= */
  var _renkOnbellek = {};
  function stokRenk(K) {
    if (_renkOnbellek[K.id]) return _renkOnbellek[K.id];
    var r;
    if (K.tur === 'sivi') { var tk = new M.Kap('x', 'x', 'beher', 0.25); M.ekle(tk, K.id, 0.05); var R = M.renk(tk); r = karis(R.sivi, R.bulRenk, R.bulanik); if (K.id === 'deterjan') r = [121, 196, 157]; }
    else r = hexRgb(K.renk || (K.tur === 'metal' ? M.METAL[K.metal].renk : '#FFFFFF'));
    _renkOnbellek[K.id] = r;
    return r;
  }
  function siseSvg(K) {
    if (K.tur === 'gosterge') {
      var dur = M.GOS[K.gos].d, st = '';
      [2, 5, 7, 9, 12].forEach(function (p, j) { var g = M.gosGecirgen(K.gos, p); st += '<stop offset="' + (j / 4) + '" stop-color="' + rgba([252 * g[0], 252 * g[1], 252 * g[2]]) + '"/>'; });
      return '<svg class="sise" viewBox="0 0 34 40" aria-hidden="true"><defs><linearGradient id="g' + K.id + '" x1="0" x2="0" y1="0" y2="1">' + st + '</linearGradient></defs><path d="M14 2h6v6l2 2v3H12v-3l2-2z" fill="#3A3D42"/><rect x="9" y="13" width="16" height="25" rx="4" fill="url(#g' + K.id + ')" stroke="#C9BFB5" stroke-width="1.3"/></svg>';
    }
    var c = rgba(stokRenk(K));
    if (K.tur === 'metal') return '<svg class="sise" viewBox="0 0 34 40" aria-hidden="true"><rect x="5" y="9" width="24" height="29" rx="5" fill="#fff" stroke="#C9BFB5" stroke-width="1.3"/><rect x="7" y="5" width="20" height="6" rx="2" fill="#8B8F96"/><path d="M10 33l4-8 3 5 3-7 4 10z" fill="' + c + '" stroke="rgba(0,0,0,.25)" stroke-width=".8"/></svg>';
    if (K.tur === 'kati') return '<svg class="sise" viewBox="0 0 34 40" aria-hidden="true"><rect x="5" y="9" width="24" height="29" rx="5" fill="#fff" stroke="#C9BFB5" stroke-width="1.3"/><rect x="7" y="5" width="20" height="6" rx="2" fill="#E07B39"/><path d="M7 26c5-4 15-4 20 0v8a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3z" fill="' + c + '" stroke="rgba(0,0,0,.12)" stroke-width=".8"/></svg>';
    return '<svg class="sise" viewBox="0 0 34 40" aria-hidden="true"><path d="M13 2h8v8l7 9v16a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V19l7-9z" fill="#fff" stroke="#C9BFB5" stroke-width="1.3"/><path d="M7 22h20v13a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z" fill="' + c + '"/><rect x="12" y="1" width="10" height="4" rx="1.5" fill="#3A3D42"/></svg>';
  }
  function ghsImg(c, boy) { return '<img src="' + GHSY + c.toLowerCase() + '.svg" alt="' + h(M.GHS[c]) + '" title="' + h(M.GHS[c]) + '" width="' + boy + '" height="' + boy + '" loading="lazy">'; }
  function stokYaz(K) {
    if (K.tur === 'metal') return 'metal';
    if (K.tur === 'kati') return 'katı';
    if (K.tur === 'gosterge') return 'gösterge';
    return K.M ? Y.tr(K.M, K.M < 1 && K.M * 100 % 10 ? 2 : (K.M % 1 ? 2 : 0)).replace(/,00$/, '') + ' M' : 'sıvı';
  }
  function dolapCiz() {
    var cip = '';
    for (var k in KAT_AD) cip += '<button class="cip' + (dolapKat === k ? ' on' : '') + '" data-kat="' + k + '">' + KAT_AD[k] + '</button>';
    $('#lb-cip').innerHTML = cip;
    var q = dolapAra.toLocaleLowerCase('tr').trim(), s = '';
    M.KIM.forEach(function (K) {
      if (dolapKat === 'ev' ? !K.ev : (dolapKat !== 'tumu' && K.kat !== dolapKat)) return;
      var metin = (K.ad + ' ' + (K.diger || '') + ' ' + (K.f || '')).toLocaleLowerCase('tr');
      if (q && metin.indexOf(q) < 0 && (K.f || '').toLowerCase().indexOf(q.replace(/\s/g, '')) < 0) return;
      s += '<button class="kim" data-kim="' + K.id + '">' + siseSvg(K) + '<span class="ad"><b>' + h(K.ad) + '</b><small>' + (K.f ? h(Y.alt(K.f)) + ' · ' : '') + h(stokYaz(K)) + (K.diger ? ' · ' + h(K.diger) : '') + '</small></span><span class="ghs">' + K.ghs.slice(0, 3).map(function (c) { return ghsImg(c, 20); }).join('') + '</span></button>';
    });
    $('#lb-liste').innerHTML = s || '<div class="bos">Sonuç yok.</div>';
  }
  $('#lb-cip').addEventListener('click', function (e) { var b = e.target.closest('[data-kat]'); if (!b) return; dolapKat = b.getAttribute('data-kat'); dolapCiz(); });
  $('#lb-ara').addEventListener('input', function () { dolapAra = this.value; dolapCiz(); });
  $('#lb-liste').addEventListener('click', function (e) {
    var b = e.target.closest('[data-kim]'); if (!b) return;
    var id = b.getAttribute('data-kim');
    if (cz() && mod === 'serbest' && !LAx.siseKapali) { dolapKapat(); cz().siseAl(id); if (window.matchMedia('(max-width:979px)').matches) { var tz = $('#m-serbest .tezgah'); if (tz && tz.getBoundingClientRect().top < 0) tz.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }
    else miktarAc(id);
  });
  function dolapAc() { $('#lb-dolap').classList.add('acik'); ortAc(true); }
  function dolapKapat() { $('#lb-dolap').classList.remove('acik'); if (!$('#lb-pen').classList.contains('acik')) ortAc(false); }
  function ortAc(a) { $('#lb-ort').classList.toggle('acik', a); }
  $('#lb-ort').addEventListener('click', function () { penKapat(); dolapKapat(); });

  /* ================= MİKTAR / AKTAR PENCERESİ ================= */
  var penHedef = 0;
  function miktarlar(K) {
    if (K.tur === 'metal') return K.miktar.map(function (g) { return [Y.tr(g, g < 0.1 ? 2 : (g < 1 ? 2 : 0)).replace(/,?0+$/, '').replace(/,$/, '') + ' g', g, g <= 0.05 ? 'küçük parça' : (g >= 1 ? 'büyük parça' : 'parça')]; });
    if (K.tur === 'kati') return K.ek ? [['Spatula ucu', 0.2, '0,2 g'], ['0,5 g', 0.5], ['1 g', 1]] : [['Spatula ucu', 0.1, '0,1 g'], ['0,5 g', 0.5], ['1 g', 1], ['2 g', 2], ['5 g', 5], ['10 g', 10]];
    if (K.tur === 'gosterge') return K.gos === 'lah' ? [['5 mL', 0.005], ['10 mL', 0.01], ['25 mL', 0.025]] : [['1 damla', 0.00005, '0,05 mL'], ['2 damla', 0.0001, '0,1 mL'], ['5 damla', 0.00025, '0,25 mL']];
    return [['1 damla', 0.00005, '0,05 mL'], ['1 mL', 0.001], ['5 mL', 0.005], ['10 mL', 0.01], ['25 mL', 0.025], ['50 mL', 0.05]];
  }
  function kapSecHtml() {
    return '<div class="etiket">Hangi kaba?</div><div class="kap-sec">' + KAPLAR.map(function (k, i) { return '<button data-hedef="' + i + '" class="' + (i === penHedef ? 'on' : '') + '">' + h(k.ad) + '</button>'; }).join('') + '</div>';
  }
  function miktarAc(id) {
    var K = M.KIMI[id]; penHedef = aktif;
    var tehl = K.ghs.length ? '<div class="tehl">' + K.ghs.map(function (c) { return '<span>' + ghsImg(c, 26) + h(M.GHS[c]) + '</span>'; }).join('') + '</div>' : '';
    var s = '<button class="kapat" data-pen="kapat" aria-label="Kapat">×</button><h3>' + h(K.ad) + '</h3><div class="alt">' + (K.f ? h(Y.alt(K.f)) + ' · ' : '') + h(stokYaz(K)) + (K.diger ? ' · ' + h(K.diger) : '') + '</div>' +
      (K.not ? '<p class="not">' + h(K.not) + '</p>' : '') + tehl + (K.uyari ? '<div class="uyari">⚠ ' + h(K.uyari) + '</div>' : '') + kapSecHtml() +
      '<div class="etiket">Ne kadar?</div><div class="miktarlar">' + miktarlar(K).map(function (m) { return '<button data-mik="' + m[1] + '">' + h(m[0]) + (m[2] ? '<small>' + h(m[2]) + '</small>' : '') + '</button>'; }).join('') + '</div>';
    penAc(s, function (e) {
      var b = e.target.closest('[data-mik]');
      if (b) { penKapat(); dolapKapat(); ekleAnim(penHedef, id, parseFloat(b.getAttribute('data-mik'))); }
    });
  }
  function aktarAc() {
    var a = KAPLAR[aktif];
    if (KAPLAR.length < 2) { tost('Aktarmak için tezgâhta ikinci bir kap olmalı.'); return; }
    if (!(a.V > 1e-6)) { tost('Kap boş; aktarılacak sıvı yok.'); return; }
    penHedef = aktif === 0 ? 1 : 0;
    var s = '<button class="kapat" data-pen="kapat" aria-label="Kapat">×</button><h3>' + h(a.ad) + ' kabından aktar</h3><div class="alt">Kapta ' + Y.tr(a.V * 1000, 1) + ' mL sıvı var.</div>' +
      '<div class="etiket">Nereye?</div><div class="kap-sec">' + KAPLAR.map(function (k, i) { return i === aktif ? '' : '<button data-hedef="' + i + '" class="' + (i === penHedef ? 'on' : '') + '">' + h(k.ad) + '</button>'; }).join('') + '</div>' +
      '<div class="etiket">Ne kadar?</div><div class="miktarlar"><button data-or="0.25">Çeyreği</button><button data-or="0.5">Yarısı</button><button data-or="1">Tamamı</button><button data-ml="1">1 mL</button><button data-ml="5">5 mL</button><button data-ml="10">10 mL</button></div>';
    penAc(s, function (e) {
      var b = e.target.closest('[data-or],[data-ml]');
      if (!b) return;
      var oran = b.hasAttribute('data-or') ? parseFloat(b.getAttribute('data-or')) : Math.min(1, parseFloat(b.getAttribute('data-ml')) / 1000 / a.V);
      penKapat();
      var hedef = penHedef, kaynak = aktif;
      anim.push({ i: hedef, tur: 'sivi', renk: karis(M.renk(a).sivi, M.renk(a).bulRenk, M.renk(a).bulanik), t0: simdi(), sure: 900 });
      if (KAPLAR[hedef].kirik) { tost(KAPLAR[hedef].ad + ' kırık. Önce temizle.', true); return; }
      setTimeout(function () { var L = M.aktar(KAPLAR[kaynak], KAPLAR[hedef], oran); gunlukIs(KAPLAR[kaynak].ad + ' → ' + KAPLAR[hedef].ad + ' aktarıldı'); if (hedef !== aktif) kapSec(hedef); olaylariIsle(hedef, L); }, 450);
    });
  }
  var penTik = null;
  function penAc(html, tik) {
    var p = $('#lb-pen'); p.innerHTML = html; penTik = tik;
    p.classList.add('acik'); ortAc(true);
  }
  function penKapat() { $('#lb-pen').classList.remove('acik'); if (!$('#lb-dolap').classList.contains('acik')) ortAc(false); }
  $('#lb-pen').addEventListener('click', function (e) {
    if (e.target.closest('[data-pen="kapat"]')) { penKapat(); return; }
    var hb = e.target.closest('[data-hedef]');
    if (hb) { penHedef = +hb.getAttribute('data-hedef'); $$('[data-hedef]', this).forEach(function (b) { b.classList.toggle('on', b === hb); }); return; }
    if (penTik) penTik(e);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { penKapat(); dolapKapat(); }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.getAttribute && e.target.getAttribute('data-is') === 'sicaklik') { e.preventDefault(); sicaklikAc(); }
  });

  function gunlukIs(m) { gunluk.push({ t: (Date.now() - t0) / 1000, kap: '', yap: m }); }
  function ekleAnim(i, id, mik, sessiz) {
    var K = M.KIMI[id], k = KAPLAR[i];
    if (!k || !K) return;
    if (k.kirik) { tost(k.ad + ' kırık. Önce etiketindeki Temizle’ye dokun.', true); return; }
    kullanilan[id] = 1;
    var tur = K.tur === 'metal' ? 'metal' : (K.tur === 'kati' ? 'kati' : (mik <= 0.00026 ? 'damla' : 'sivi'));
    anim.push({ i: i, tur: tur, renk: stokRenk(K), renkHex: K.tur === 'metal' ? M.METAL[K.metal].renk : '#fff', metal: K.metal, t0: simdi(), sure: tur === 'sivi' ? 900 : 800 });
    if (i !== aktif && !sessiz) kapSec(i);
    setTimeout(function () {
      var miktarAd = K.tur === 'metal' || K.tur === 'kati' ? Y.tr(mik, mik < 1 ? 2 : 1) + ' g' : (mik <= 0.00026 ? Math.round(mik / 0.00005) + ' damla' : Y.tr(mik * 1000, mik < 0.001 ? 2 : 0) + ' mL');
      gunlukIs(k.ad + ' kabına ' + miktarAd + ' ' + K.ad + (K.f ? ' (' + Y.alt(K.f) + ')' : '') + ' eklendi');
      if (KAPLAR.indexOf(k) < 0 || k.kirik) return;
      var L = M.ekle(k, id, mik);
      olaylariIsle(i, L);
      olcumCiz(); icerikCiz();
      patlamaKontrol(k, K, mik);
      if (LAx.olay) LAx.olay('ekle', { i: KAPLAR.indexOf(k), id: id, mik: mik });
    }, tur === 'sivi' ? 480 : 380);
  }
  /* ---- Sürekli döküm (3D tezgâh) ---- */
  var dokum = null;
  function dokumBasla(i) {
    if (!KAPLAR[i]) return;
    dokum = { i: i, gor: {}, olay: 0 };
    if (i !== aktif) kapSec(i);
    if (LAx.olay) LAx.olay('dokumBasla', { i: i });
  }
  function dokumOlay(i, L) {
    if (!L || !L.length) return;
    var yeni = L.filter(function (o) {
      if (!dokum || dokum.i !== i) return true;
      if (dokum.gor[o.baslik]) return false;
      dokum.gor[o.baslik] = 1; return true;
    });
    if (yeni.length) { if (dokum) dokum.olay += yeni.filter(function (o) { return o.tur !== 'bilgi'; }).length; olaylariIsle(i, yeni); }
  }
  function dokSessiz(i, id, miktar) {
    var k = KAPLAR[i], K = M.KIMI[id];
    if (!k || !K || !(miktar > 0)) return;
    if (k.kirik) return;
    kullanilan[id] = 1;
    dokumOlay(i, M.ekle(k, id, miktar, { sessiz: true }));
    if (LAx.olay) LAx.olay('dok', { i: i, id: id, mik: miktar });
  }
  function aktarSessiz(a, b, oran) {
    var A = KAPLAR[a], B = KAPLAR[b];
    if (!A || !B || B.kirik || !(A.V > 1e-7) || !(oran > 0)) return;
    dokumOlay(b, M.aktar(A, B, Math.min(1, oran), { sessiz: true }));
    if (LAx.olay) LAx.olay('aktar', { a: a, b: b });
  }
  function dokumBitti(i, miktar, id, kaynak) {
    var k = KAPLAR[i], olay = dokum ? dokum.olay : 0;
    dokum = null;
    if (!k || !(miktar > 0)) return;
    var ad;
    if (id) {
      var K = M.KIMI[id];
      ad = K.tur === 'kati' ? Y.tr(miktar, 1) + ' g' : (K.tur === 'gosterge' && K.gos !== 'lah' ? Math.round(miktar / 0.00005) + ' damla' : Y.tr(miktar * 1000, miktar < 0.01 ? 1 : 0) + ' mL');
      gunlukIs(k.ad + ' kabına ' + ad + ' ' + K.ad + (K.f ? ' (' + Y.alt(K.f) + ')' : '') + ' eklendi');
      if (!olay) seritYaz(null, '<b>' + h(k.ad) + '</b> kabına ' + h(ad) + ' ' + h(K.ad) + ' eklendi' + (k.r ? ' · pH ' + Y.tr(Math.max(-1, Math.min(15, k.r.pH)), 1) : ''));
    } else if (kaynak >= 0 && KAPLAR[kaynak]) {
      ad = Y.tr(miktar * 1000, miktar < 0.01 ? 1 : 0) + ' mL';
      gunlukIs(KAPLAR[kaynak].ad + ' → ' + k.ad + ' ' + ad + ' aktarıldı');
      if (!olay) seritYaz(null, KAPLAR[kaynak].ad + ' → <b>' + h(k.ad) + '</b>: ' + h(ad) + ' aktarıldı');
    }
    olcumCiz(); icerikCiz();
    if (LAx.olay) LAx.olay('dokumBitti', { i: i, id: id, kaynak: kaynak, mik: miktar });
  }
  /* ---- Büyük alkali metal parçası: patlama ---- */
  function patlamaKontrol(k, K, mik) {
    if (!K.metal || k.kirik || !(k.V > 0.002)) return;
    if (!((K.metal === 'Na' && mik >= 0.5) || (K.metal === 'K' && mik >= 0.25))) return;
    setTimeout(function () { var i = KAPLAR.indexOf(k); if (i >= 0 && k.metal.some(function (p) { return p.m === K.metal; })) patlat(i, K.metal); }, 1100);
  }
  function patlat(i, m) {
    var k = KAPLAR[i];
    if (!k || k.kirik) return;
    var R0 = M.renk(k);
    k.dokulenRenk = karis(R0.sivi, R0.bulRenk, R0.bulanik);
    k.bosalt(); k.kirik = true; kabarcik[i] = []; hedefT[i] = null; tutT[i] = null;
    olaylariIsle(i, [{ tur: 'tehlike', baslik: 'Patlama! ' + k.ad + ' kırıldı', gozlem: (m === 'K' ? 'Potasyum' : 'Sodyum') + ' parçası çok büyüktü. Tepkime çok hızlı ısındı, çıkan hidrojen gazı tutuştu ve patladı.', net: '2' + m + ' + 2H₂O → 2' + m + 'OH + H₂', aciklama: 'Alkali metallerin suyla tepkimesi ekzotermiktir. Küçük parçada ısı dağılır; büyük parçada metal erir, hidrojen ile havanın karışımı tutuşur ve patlar. Okulda yalnızca pirinç tanesi kadar parça, koruyucu ekran arkasında kullanılır.', konu: 'Aktif metaller · laboratuvar güvenliği' }]);
    gunlukIs(k.ad + ' patladı ve kırıldı');
    olcumCiz(); icerikCiz();
    if (!cz()) setTimeout(function () { k.kirik = false; }, 1500);
    if (LAx.olay) LAx.olay('patlama', { i: i });
  }
  function kirikTemizle(i) {
    var k = KAPLAR[i];
    if (!k) return;
    k.bosalt(); k.kirik = false; olaylarK[i].length = 0; kabarcik[i] = [];
    kapSec(i); tost('Kırık cam toplandı; ' + k.ad + ' yenisiyle değiştirildi.');
  }
  /* ---- Kaplar: ekle / kaldır ---- */
  var KAP_TIP = { beher: ['Beher', 0.25], erlen: ['Erlenmeyer', 0.25], tup: ['Deney tüpü', 0.025] };
  function kapEkle(tip) {
    if (KAPLAR.length >= 4) { tost('Tezgâhta en fazla 4 kap olabilir.'); return; }
    var T0 = KAP_TIP[tip], say = KAPLAR.filter(function (k) { return k.tip === tip; }).length;
    var ad = T0[0] + (say ? ' ' + (say + 1) : '');
    while (KAPLAR.some(function (k) { return k.ad === ad; })) { say++; ad = T0[0] + ' ' + (say + 1); }
    var k = new M.Kap(tip + Date.now() % 100000, ad, tip, T0[1]);
    KAPLAR.push(k); diziEkle();
    if (cz()) cz().senkron();
    kapSec(KAPLAR.length - 1); gunlukIs(ad + ' tezgâha kondu');
  }
  function kapKaldir(i) {
    if (KAPLAR.length <= 1 || !KAPLAR[i]) return;
    var ad = KAPLAR[i].ad;
    KAPLAR.splice(i, 1); diziSil(i);
    if (cz()) cz().senkron();
    kapSec(Math.min(aktif >= i && aktif > 0 ? aktif - 1 : aktif, KAPLAR.length - 1));
    gunlukIs(ad + ' tezgâhtan kaldırıldı');
  }
  function kapKur(L) {
    KAPLAR.length = 0;
    L.forEach(function (d) {
      var T0 = KAP_TIP[d.tip], k = new M.Kap(d.id || d.tip, d.ad || T0[0], d.tip, d.kapasite || T0[1]);
      ['duzenek', 'yerX', 'yerZ', 'gizli'].forEach(function (a) { if (d[a] !== undefined) k[a] = d[a]; });
      KAPLAR.push(k);
    });
    diziSifirla(); aktif = 0; dokum = null;
    if (cz()) cz().senkron();
    kapSec(0);
  }
  function standartKaplar() { kapKur([{ tip: 'beher', id: 'beher' }, { tip: 'erlen', id: 'erlen' }, { tip: 'tup', id: 'tup' }]); }
  function malzemeAc() {
    var s = '<button class="kapat" data-pen="kapat" aria-label="Kapat">×</button><h3>Kaplar</h3><div class="alt">Tezgâhta ' + KAPLAR.length + ' kap var (en fazla 4).</div>' +
      '<div class="etiket">Tezgâha ekle</div><div class="miktarlar">' +
      '<button data-yeni="beher"' + (KAPLAR.length >= 4 ? ' disabled' : '') + '>Beher<small>250 mL</small></button>' +
      '<button data-yeni="erlen"' + (KAPLAR.length >= 4 ? ' disabled' : '') + '>Erlenmeyer<small>250 mL</small></button>' +
      '<button data-yeni="tup"' + (KAPLAR.length >= 4 ? ' disabled' : '') + '>Deney tüpü<small>25 mL</small></button></div>' +
      '<div class="etiket">Seçili kap: ' + h(KAPLAR[aktif].ad) + '</div><div class="miktarlar">' +
      '<button data-kaldir="1"' + (KAPLAR.length <= 1 ? ' disabled' : '') + '>Tezgâhtan kaldır</button>' +
      '<button data-sifirla="1">Tezgâhı baştan kur<small>beher, erlen, tüp</small></button></div>';
    penAc(s, function (e) {
      var b = e.target.closest('[data-yeni],[data-kaldir],[data-sifirla]');
      if (!b || b.disabled) return;
      penKapat();
      if (b.hasAttribute('data-yeni')) kapEkle(b.getAttribute('data-yeni'));
      else if (b.hasAttribute('data-kaldir')) kapKaldir(aktif);
      else { standartKaplar(); tost('Tezgâh baştan kuruldu.'); }
    });
  }
  /* ---- Sıcaklık ayarı (termostat) ---- */
  function sicaklikAc() {
    var k = KAPLAR[aktif], d = tutT[aktif] !== null ? tutT[aktif] : Math.round(Math.max(40, Math.min(90, k.T + 20)) / 5) * 5;
    var s = '<button class="kapat" data-pen="kapat" aria-label="Kapat">×</button><h3>Sıcaklık ayarı</h3><div class="alt">' + h(k.ad) + ' şu an ' + Y.tr(k.T, 1) + ' °C</div>' +
      '<div class="sic-ayar"><input type="range" id="lb-sic" min="0" max="100" step="5" value="' + d + '" aria-label="Hedef sıcaklık"><output id="lb-sicd">' + d + ' °C</output></div>' +
      '<p class="not">Ocak ya da buz banyosu kabı bu sıcaklığa getirip orada tutar.</p>' +
      '<div class="miktarlar"><button data-sicak="ayar">Ayarla</button><button data-sicak="kapat">Kapat</button></div>';
    penAc(s, function (e) {
      var b = e.target.closest('[data-sicak]'); if (!b) return;
      penKapat();
      if (b.getAttribute('data-sicak') === 'kapat') { tutT[aktif] = null; k.isit = false; k.sogut = false; tost('Sıcaklık ayarı kapatıldı.'); }
      else { tutT[aktif] = +$('#lb-sic').value; tost(k.ad + ' ' + tutT[aktif] + ' °C’ye getiriliyor.'); gunlukIs(k.ad + ' ' + tutT[aktif] + ' °C’de tutuluyor'); }
      dugmeDurum(); olcumCiz();
    });
    $('#lb-sic').addEventListener('input', function () { $('#lb-sicd').textContent = this.value + ' °C'; });
  }

  /* ================= ARAÇLAR ================= */
  kok.addEventListener('click', function (e) {
    var b = e.target.closest('[data-is]');
    if (!b) return;
    var is = b.getAttribute('data-is'), k = KAPLAR[aktif];
    if (is === 'dolap') { if (window.matchMedia('(min-width:980px)').matches) $('#lb-ara').focus(); else dolapAc(); }
    else if (is === 'dolapkapat') dolapKapat();
    else if (is === 'kar') { if (!(k.V > 1e-6)) return tost('Kap boş.'); k.karistir = 2.5; gunlukIs(k.ad + ' karıştırıldı'); }
    else if (is === 'malzeme') malzemeAc();
    else if (is === 'sicaklik') sicaklikAc();
    else if (k.kirik && /^(kar|isit|sogut|aktar|gaz|alev)$/.test(is)) tost(k.ad + ' kırık. Önce etiketindeki Temizle’ye dokun.', true);
    else if (is === 'isit') { k.isit = !k.isit; if (k.isit) k.sogut = false; hedefT[aktif] = null; tutT[aktif] = null; dugmeDurum(); gunlukIs(k.ad + (k.isit ? ' ısıtılmaya başlandı' : ' ısıtma kapatıldı')); }
    else if (is === 'sogut') { k.sogut = !k.sogut; if (k.sogut) k.isit = false; tutT[aktif] = null; dugmeDurum(); gunlukIs(k.ad + (k.sogut ? ' buz banyosuna kondu' : ' buz banyosundan çıkarıldı')); }
    else if (is === 'aktar') aktarAc();
    else if (is === 'bosalt') { if (k.kirik) { kirikTemizle(aktif); return; } k.bosalt(); kabarcik[aktif] = []; olaylarK[aktif].length = 0; hedefT[aktif] = null; tutT[aktif] = null; gunlukIs(k.ad + ' boşaltıldı'); kapSec(aktif); tost(k.ad + ' boşaltıldı ve yıkandı.'); }
    else if (is === 'gaz') testGoster(M.gazTesti(k), 'gaz');
    else if (is === 'alev') testGoster(M.alevTesti(k), 'alev');
    else if (is === 'rkopya') raporKopya();
    else if (is === 'rtemiz') { gunluk = []; olaylarK.forEach(function (x) { x.length = 0; }); t0 = Date.now(); raporCiz(); gozlemCiz(); tost('Günlük temizlendi.'); }
  });
  function testGoster(T, tur, sessiz) {
    var k = KAPLAR[aktif], o;
    if (tur === 'alev') {
      o = { tur: T.yok ? 'yok' : 'renk', baslik: T.baslik, gozlem: (T.yok ? '' : 'Platin tel kaptaki çözeltiye batırılıp aleve tutuldu. ') + T.sonuc, aciklama: T.aciklama, konu: '9. sınıf · Atom modelleri (alev testi)', renk: T.renk };
      var s = '<button class="kapat" data-pen="kapat" aria-label="Kapat">×</button><h3>' + h(T.baslik) + '</h3><div style="display:flex;justify-content:center;margin:14px 0 6px"><svg viewBox="0 0 120 150" width="120" height="150" aria-hidden="true"><defs><radialGradient id="alv" cx=".5" cy=".7" r=".6"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".35" stop-color="' + T.renk + '"/><stop offset="1" stop-color="' + T.renk + '" stop-opacity="0"/></radialGradient></defs><path d="M60 12c14 24 34 40 34 72a34 34 0 0 1-68 0c0-22 12-34 20-48 2 10 6 16 12 19 0-16 1-30 2-43z" fill="url(#alv)"/><rect x="48" y="118" width="24" height="30" rx="3" fill="#8C9096"/></svg></div><p class="not">' + h(T.sonuc) + '</p>' + (T.aciklama ? '<p class="not" style="color:var(--tx2)">' + h(T.aciklama) + '</p>' : '');
      if (sessiz) tost(T.baslik); else penAc(s, null);
    } else {
      o = { tur: T.yok ? 'yok' : (T.tehlike ? 'tehlike' : 'gaz'), baslik: T.baslik, gozlem: T.yok ? T.sonuc : T.test + ' ' + T.sonuc, net: T.net, konu: T.yok ? '' : 'Gazların tanınması' };
      tost(T.yok ? T.sonuc : T.sonuc, T.tehlike);
    }
    olaylariIsle(aktif, [o]);
  }

  /* ================= HAZIR DENEYLER ================= */
  var DENEY = [
    { id: 'lahana', ikon: '🥬', renk: '#F3E8FA', ad: 'Kırmızı lahana ile pH skalası', konu: 'Asitler, bazlar · 10. sınıf', ozet: 'Doğal bir gösterge asitte, nötrde ve bazda nasıl renk değiştirir?',
      adim: [['Üç kaba da kırmızı lahana suyu koy.', [['e', 0, 'lahana', 0.03], ['e', 1, 'lahana', 0.03], ['e', 2, 'lahana', 0.01]]],
        ['Behere sirke ekle.', [['e', 0, 'sirke', 0.01]]], ['Erlene yemek sodası çözeltisi ekle.', [['e', 1, 'nahco3', 0.02]]], ['Tüpe sodyum hidroksit ekle.', [['e', 2, 'naoh', 0.003]]]],
      sonuc: 'Sirkede kırmızı-pembe, yemek sodasında mavi-yeşil, NaOH’ta sarı renk oluştu. Lahana suyundaki antosiyaninler pH’a göre renk değiştiren doğal bir göstergedir.' },
    { id: 'notr', ikon: '⚖️', renk: '#E8F4EE', ad: 'Nötralleşme ve sıcaklık', konu: 'Asitler, bazlar · 10. sınıf', ozet: 'HCl ile NaOH tepkimesinde pH, renk ve sıcaklık nasıl değişir?',
      adim: [['Behere 25 mL HCl ve 2 damla fenolftalein koy.', [['e', 0, 'hcl', 0.025], ['e', 0, 'fenol', 0.0001]]], ['20 mL NaOH ekle. Rengi ve sıcaklığı izle.', [['e', 0, 'naoh', 0.02]]],
        ['5 mL daha NaOH ekle (eşdeğerlik noktası).', [['e', 0, 'naoh', 0.005]]], ['1 mL daha NaOH ekle.', [['e', 0, 'naoh', 0.001]]]],
      sonuc: 'Asit nötrleşirken kap ısındı (nötralleşme ekzotermiktir). Eşdeğerlik noktasını geçince ortam bazikleşti ve fenolftalein pembeye döndü.' },
    { id: 'cokelek', ikon: '🧪', renk: '#EEF2F6', ad: 'Renkli çökelekler', konu: 'Çözünürlük dengesi · 11. sınıf', ozet: 'AgCl, PbI₂ ve Cu(OH)₂ çökelekleri; amonyakta çözünme.',
      adim: [['Behere AgNO₃, erlene Pb(NO₃)₂, tüpe CuSO₄ koy.', [['e', 0, 'agno3', 0.01], ['e', 1, 'pbno3', 0.01], ['e', 2, 'cuso4', 0.004]]],
        ['Behere NaCl ekle.', [['e', 0, 'nacl', 0.005]]], ['Erlene KI ekle.', [['e', 1, 'ki', 0.005]]], ['Tüpe NaOH ekle.', [['e', 2, 'naoh', 0.003]]],
        ['Behere derişik amonyak ekle.', [['e', 0, 'nh3_d', 0.01]]]],
      sonuc: 'Qç > Kçç olduğunda beyaz AgCl, sarı PbI₂ ve mavi Cu(OH)₂ çöktü. AgCl, amonyakla [Ag(NH₃)₂]⁺ kompleksi oluşturarak çözündü.' },
    { id: 'altin', ikon: '✨', renk: '#FFF6D6', ad: 'Altın yağmuru', konu: 'Çözünürlük ve sıcaklık · 11. sınıf', ozet: 'PbI₂ sıcakta çözünür, soğurken parıltılı kristaller hâlinde çöker.',
      adim: [['Behere 130 mL su ve 10 mL Pb(NO₃)₂ koy.', [['e', 0, 'su', 0.13], ['e', 0, 'pbno3', 0.01]]], ['4 mL KI ekle.', [['e', 0, 'ki', 0.004]]],
        ['Isıt; sarı katı çözünene kadar bekle (yaklaşık 1 dakika).', [['isit', 0, true]]], ['Isıtmayı kapat ve buz banyosuna al.', [['isit', 0, false], ['sogut', 0, true]]]],
      sonuc: 'PbI₂’nin çözünürlüğü sıcaklıkla artar. Sıcakta renksiz çözelti oluştu; soğuyunca parıltılı sarı kristaller “altın yağmuru” gibi döküldü.' },
    { id: 'fil', ikon: '🐘', renk: '#FDECEA', ad: 'Fil diş macunu', konu: 'Tepkime hızı (katalizör) · 11. sınıf', ozet: 'Katalizör H₂O₂ bozunmasını nasıl hızlandırır?',
      adim: [['Erlene %30 H₂O₂ ve deterjan koy.', [['e', 1, 'h2o2_30', 0.03], ['e', 1, 'deterjan', 0.005]]], ['KI çözeltisi ekle.', [['e', 1, 'ki', 0.01]]],
        ['Behere %3 H₂O₂ ve deterjan koy, sonra kuru maya ekle.', [['e', 0, 'h2o2_3', 0.05], ['e', 0, 'deterjan', 0.003], ['e', 0, 'maya', 1]]], ['Behere gaz testi yap.', [['gaz', 0]]]],
      sonuc: 'KI ve maya (katalaz enzimi) H₂O₂’nin su ve oksijene ayrışmasını çok hızlandırdı. Deterjan, çıkan oksijeni köpük olarak tuttu. Kor çubuk oksijende alevlendi.' },
    { id: 'co2', ikon: '🫧', renk: '#E6F1F8', ad: 'Sirke, karbonat ve kireç suyu', konu: 'Asitler, bazlar · 10. sınıf', ozet: 'CO₂ gazı nasıl oluşur ve nasıl tanınır?',
      adim: [['Behere 50 mL sirke koy.', [['e', 0, 'sirke', 0.05]]], ['2 g yemek sodası ekle.', [['e', 0, 'nahco3_k', 2]]], ['Gaz testi yap.', [['gaz', 0]]],
        ['Tüpe kireç suyu koy ve biraz gazlı su ekle.', [['e', 2, 'kirec', 0.01], ['e', 2, 'soda', 0.003]]], ['Tüpe gazlı su eklemeye devam et.', [['e', 2, 'soda', 0.012]]]],
      sonuc: 'Karbonat asitle CO₂ gazı çıkardı; gaz alevi söndürdü. CO₂ kireç suyunu CaCO₃ oluşturarak bulandırdı; fazla CO₂ ile CaCO₃, suda çözünen Ca(HCO₃)₂’ye dönüştü ve bulanıklık azaldı.' },
    { id: 'aktiflik', ikon: '🔩', renk: '#F3F4F6', ad: 'Metallerin aktifliği', konu: 'Redoks ve aktiflik · 12. sınıf', ozet: 'Mg, Zn ve Cu asitle aynı hızda mı tepkime verir?',
      adim: [['Üç kaba da HCl koy.', [['e', 0, 'hcl', 0.03], ['e', 1, 'hcl', 0.03], ['e', 2, 'hcl', 0.01]]], ['Behere magnezyum şerit at.', [['e', 0, 'mg', 0.1]]],
        ['Erlene çinko granül at.', [['e', 1, 'zn', 0.5]]], ['Tüpe bakır tel at.', [['e', 2, 'cu', 0.25]]], ['Beherdeki gazı test et.', [['gaz', 0]]]],
      sonuc: 'Magnezyum çok hızlı, çinko daha yavaş H₂ çıkardı; bakır hiç tepkime vermedi. Aktiflik sırası: Mg > Zn > H > Cu.' },
    { id: 'kaplama', ikon: '🪙', renk: '#FBEFE6', ad: 'Bakır kaplama ve gümüş ağacı', konu: 'Redoks ve aktiflik · 12. sınıf', ozet: 'Aktif metal, daha az aktif metalin iyonunu metale indirger.',
      adim: [['Behere CuSO₄ ve su koy.', [['e', 0, 'cuso4', 0.01], ['e', 0, 'su', 0.04]]], ['Behere demir çivi at.', [['e', 0, 'fe', 2]]],
        ['Tüpe AgNO₃ koy.', [['e', 2, 'agno3', 0.015]]], ['Tüpe bakır tel at.', [['e', 2, 'cu', 0.5]]]],
      sonuc: 'Demir çivi bakırla kaplandı, mavi renk açıldı. Bakır tel üzerinde gümüş kristalleri büyüdü, çözelti Cu²⁺ yüzünden maviye döndü.' },
    { id: 'kompleks', ikon: '💠', renk: '#E7EEFC', ad: 'Bakır ve amonyak: kompleks iyon', konu: 'Çözünürlük dengesi · 11. sınıf', ozet: 'Az amonyak çökelek, çok amonyak koyu mavi çözelti verir.',
      adim: [['Tüpe CuSO₄ koy.', [['e', 2, 'cuso4', 0.004]]], ['2 mL amonyak (1 M) ekle.', [['e', 2, 'nh3', 0.002]]], ['8 mL derişik amonyak ekle.', [['e', 2, 'nh3_d', 0.008]]]],
      sonuc: 'Önce açık mavi Cu(OH)₂ çöktü; fazla amonyakta koyu mavi [Cu(NH₃)₄]²⁺ kompleks iyonu oluştu ve çökelek çözündü.' },
    { id: 'fescn', ikon: '🩸', renk: '#FBE7E8', ad: 'Le Chatelier: Fe³⁺ + SCN⁻', konu: 'Kimyasal denge · 11. sınıf', ozet: 'Derişim değişince denge hangi yöne kayar?',
      adim: [['Behere 50 mL su, 1 mL FeCl₃ ve 1 mL KSCN koy.', [['e', 0, 'su', 0.05], ['e', 0, 'fecl3', 0.001], ['e', 0, 'kscn', 0.001]]],
        ['2 mL daha FeCl₃ ekle.', [['e', 0, 'fecl3', 0.002]]], ['3 mL NaOH ekle.', [['e', 0, 'naoh', 0.003]]]],
      sonuc: 'Fe³⁺ eklenince denge ürünler yönüne kaydı, kırmızı koyulaştı. NaOH, Fe³⁺ iyonlarını Fe(OH)₃ olarak çöktürdü; denge girenler yönüne kaydı ve renk açıldı.' },
    { id: 'kobalt', ikon: '🌡️', renk: '#EAF0FB', ad: 'Le Chatelier: sıcaklık ve kobalt', konu: 'Kimyasal denge · 11. sınıf', ozet: 'Endotermik bir denge ısıtılınca ve soğutulunca ne olur?',
      adim: [['Tüpe 5 mL CoCl₂ ve 2 mL derişik HCl koy.', [['e', 2, 'cocl2', 0.005], ['e', 2, 'hcl_d', 0.002]]], ['Tüpü ısıt.', [['isit', 2, true]]],
        ['Isıtmayı kapat, buz banyosuna al.', [['isit', 2, false], ['sogut', 2, true]]]],
      sonuc: 'İleri tepkime endotermik: ısıtınca mavi [CoCl₄]²⁻, soğutunca pembe [Co(H₂O)₆]²⁺ baskın oldu.' },
    { id: 'amfoter', ikon: '🔁', renk: '#EEF6EA', ad: 'Amfoter hidroksitler', konu: 'Asitler, bazlar · 10–11. sınıf', ozet: 'Zn(OH)₂ ve Al(OH)₃ hem asitte hem bazda çözünür.',
      adim: [['Tüpe ZnSO₄ ve 2 mL NaOH koy.', [['e', 2, 'znso4', 0.002], ['e', 2, 'naoh', 0.002]]], ['Tüpe 10 mL daha NaOH ekle.', [['e', 2, 'naoh', 0.01]]],
        ['Erlene Al₂(SO₄)₃ ve 3 mL NaOH koy.', [['e', 1, 'al2so4', 0.005], ['e', 1, 'naoh', 0.003]]], ['Erlene 5 mL HCl ekle.', [['e', 1, 'hcl', 0.005]]]],
      sonuc: 'Beyaz Zn(OH)₂ fazla bazda [Zn(OH)₄]²⁻ olarak çözündü. Al(OH)₃ ise asitte Al³⁺ olarak çözündü.' },
    { id: 'paket', ikon: '🧊', renk: '#E6F4FA', ad: 'Sıcak ve soğuk paket', konu: 'Tepkimelerde enerji · 11. sınıf', ozet: 'Bazı tuzlar çözünürken ısı alır, bazıları ısı verir.',
      adim: [['Behere ve erlene 50’şer mL su koy.', [['e', 0, 'su', 0.05], ['e', 1, 'su', 0.05]]], ['Behere 10 g amonyum nitrat ekle.', [['e', 0, 'nh4no3_k', 10]]], ['Erlene 10 g kalsiyum klorür ekle.', [['e', 1, 'cacl2_k', 10]]]],
      sonuc: 'NH₄NO₃ çözünürken su soğudu (endotermik), CaCl₂ çözünürken ısındı (ekzotermik).' },
    { id: 'sodyum', ikon: '🔥', renk: '#FFF1E9', ad: 'Alkali metaller ve su', konu: 'Metallerin aktifliği · 12. sınıf', ozet: 'Sodyum ve potasyum suyla nasıl tepkime verir?',
      adim: [['Behere ve erlene su, ikisine de fenolftalein koy.', [['e', 0, 'su', 0.1], ['e', 0, 'fenol', 0.0001], ['e', 1, 'su', 0.1], ['e', 1, 'fenol', 0.0001]]],
        ['Behere sodyum at.', [['e', 0, 'na', 0.05]]], ['Erlene potasyum at.', [['e', 1, 'k', 0.02]]]],
      sonuc: 'İki metal de suyla H₂ gazı ve baz oluşturdu; fenolftalein pembeleşti. Potasyum daha şiddetli tepkime verdi ve leylak renkli alevle yandı.' },
    { id: 'klor', ikon: '☠️', renk: '#FDECEA', ad: 'Çamaşır suyu ile tuz ruhu neden karıştırılmaz?', konu: 'Laboratuvar güvenliği · 9. sınıf', ozet: 'Evdeki iki temizlik ürünü zehirli gaz çıkarabilir.',
      adim: [['Tüpe 5 mL çamaşır suyu koy.', [['e', 2, 'naocl', 0.005]]], ['5 mL tuz ruhu (HCl) ekle.', [['e', 2, 'hcl', 0.005]]]],
      sonuc: 'Sarı-yeşil, zehirli klor gazı çıktı. Bu yüzden temizlik ürünleri asla birbirine karıştırılmaz.' },
    { id: 'nisasta', ikon: '🍋', renk: '#FFF8DB', ad: 'Nişasta, iyot ve C vitamini', konu: 'Redoks · 12. sınıf', ozet: 'İyot testi ve C vitamininin indirgen etkisi.',
      adim: [['Behere nişasta çözeltisi koy.', [['e', 0, 'nisasta', 0.02]]], ['İyot çözeltisi ekle.', [['e', 0, 'lugol', 0.002]]], ['C vitamini çözeltisi ekle.', [['e', 0, 'vitc', 0.005]]]],
      sonuc: 'İyot nişastayla lacivert renk verdi. C vitamini iyotu iyodüre indirgeyince renk kayboldu.' },
    { id: 'hiz', ikon: '⏱️', renk: '#F2F0FB', ad: 'Sıcaklık tepkime hızını nasıl etkiler?', konu: 'Tepkime hızı · 11. sınıf', ozet: 'Tiyosülfat + asit: bulanıklık ne kadar sürede oluşur?',
      adim: [['Behere ve erlene 50’şer mL sodyum tiyosülfat koy.', [['e', 0, 'tiyo', 0.05], ['e', 1, 'tiyo', 0.05]]], ['Erleni yaklaşık 45 °C’ye ısıt.', [['isitT', 1, 46]]],
        ['İki kaba da 10 mL HCl ekle; kronometreyi izle.', [['e', 0, 'hcl', 0.01], ['e', 1, 'hcl', 0.01]]]],
      sonuc: 'Sıcak çözeltide bulanıklık çok daha kısa sürede oluştu: sıcaklık arttıkça tanecikler daha hızlı hareket eder ve etkin çarpışma sayısı artar.' },
    { id: 'suph', ikon: '💧', renk: '#E6F1F8', ad: 'Saf su ısınınca pH değişir mi?', konu: 'Asit-baz dengesi · 11. sınıf', ozet: 'Ksu sıcaklıkla artar; nötr suyun pH’ı 7’den sapar.',
      adim: [['Behere 100 mL saf su koy.', [['e', 0, 'su', 0.1]]], ['Isıt ve pH’ı izle.', [['isit', 0, true]]]],
      sonuc: '100 °C’de saf suyun pH’ı yaklaşık 6,1 oldu ama [H⁺] = [OH⁻] olduğu için su nötr kaldı.' },
    { id: 'seker', ikon: '⬛', renk: '#ECEAE8', ad: 'Şekerin kömürleşmesi', konu: 'Derişik asitler · güvenlik', ozet: 'Derişik sülfürik asit şekerden su koparır.',
      adim: [['Behere 20 g şeker koy.', [['e', 0, 'seker', 20]]], ['20 mL derişik sülfürik asit ekle.', [['e', 0, 'h2so4_d', 0.02]]]],
      sonuc: 'Şeker kararıp siyah karbon sütununa dönüştü; buhar ve keskin koku çıktı. Derişik H₂SO₄ su çekicidir.' },
    { id: 'alev', ikon: '🎆', renk: '#FDEFE8', ad: 'Alev testi', konu: 'Atom modelleri · 9. sınıf', ozet: 'Metal iyonları alevi farklı renklere boyar.',
      adim: [['Behere LiCl koy, alev testi yap.', [['e', 0, 'licl', 0.01], ['alev', 0]]], ['Erlene CuSO₄ koy, alev testi yap.', [['e', 1, 'cuso4', 0.01], ['alev', 1]]], ['Tüpe NaCl koy, alev testi yap.', [['e', 2, 'nacl', 0.005], ['alev', 2]]]],
      sonuc: 'Lityum kırmızı, bakır mavi-yeşil, sodyum sarı-turuncu alev verdi. Her elementin kendine özgü ışık yayması atom modellerinin önemli kanıtlarındandır.' },
    { id: 'mno4', ikon: '🟣', renk: '#F5E8F6', ad: 'Permanganat ile redoks', konu: 'Redoks · 12. sınıf', ozet: 'Mor MnO₄⁻ iyonu indirgenince renk kaybolur.',
      adim: [['Behere 20 mL KMnO₄ ve 5 mL H₂SO₄ koy.', [['e', 0, 'kmno4', 0.02], ['e', 0, 'h2so4', 0.005]]], ['2 mL FeSO₄ ekle.', [['e', 0, 'feso4', 0.002]]], ['5 mL %3 H₂O₂ ekle.', [['e', 0, 'h2o2_3', 0.005]]]],
      sonuc: 'Fe²⁺ ve H₂O₂ permanganatı renksiz Mn²⁺ iyonuna indirgedi. H₂O₂ ile birlikte oksijen gazı da çıktı.' }
  ];
  var deneyAktif = null, deneyAdim = 0;
  function deneyListe() {
    $('#lb-deneyler').innerHTML = DENEY.map(function (d) {
      return '<button class="dn" data-dn="' + d.id + '"><span class="ikon" style="background:' + d.renk + '">' + d.ikon + '</span><h3>' + h(d.ad) + '</h3><p>' + h(d.ozet) + '</p><span class="etk">' + h(d.konu) + ' · ' + d.adim.length + ' adım</span></button>';
    }).join('');
  }
  $('#lb-deneyler').addEventListener('click', function (e) { var b = e.target.closest('[data-dn]'); if (b) deneyBaslat(b.getAttribute('data-dn')); });
  function deneyBaslat(id) {
    deneyAktif = DENEY.filter(function (d) { return d.id === id; })[0]; deneyAdim = 0;
    if (LAx.gorevBitir) LAx.gorevBitir(true);
    standartKaplar();
    gunlukIs('Hazır deney: ' + deneyAktif.ad);
    if (!$('#lb-rad').value) $('#lb-rad').value = deneyAktif.ad;
    modAc('serbest'); adimCiz(); kapSec(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function adimCiz() {
    var p = $('#lb-adim');
    if (!deneyAktif) { p.hidden = true; return; }
    var d = deneyAktif, n = d.adim.length, bitti = deneyAdim >= n;
    var s = '<div class="adimlar"><div class="ust"><h2>' + d.ikon + ' ' + h(d.ad) + '</h2><button class="ab" data-adim="kapat" style="height:34px;padding:0 10px">Kapat</button></div>';
    s += '<div class="ilerleme">' + d.adim.map(function (a, j) { return '<i class="' + (j < deneyAdim ? 'b' : (j === deneyAdim ? 's' : '')) + '"></i>'; }).join('') + '</div>';
    if (!bitti) s += '<div class="adim sira"><span class="no">' + (deneyAdim + 1) + '</span><span class="mt">' + h(d.adim[deneyAdim][0]) + '</span><button class="yap" data-adim="' + deneyAdim + '">Yap</button></div>';
    else s += '<div class="adim-sonuc"><b>Sonuç:</b> ' + h(d.sonuc) + '</div>';
    s += '<details class="tum"><summary>Tüm adımlar (' + Math.min(deneyAdim, n) + '/' + n + ')</summary>' + d.adim.map(function (a, j) {
      return '<div class="adim ' + (j < deneyAdim ? 'bitti' : (j === deneyAdim ? 'sira' : '')) + '"><span class="no">' + (j < deneyAdim ? '✓' : j + 1) + '</span><span class="mt">' + h(a[0]) + '</span></div>';
    }).join('') + '</details>';
    p.innerHTML = s + '</div>'; p.hidden = false; p.style.marginBottom = '12px';
  }
  $('#lb-adim').addEventListener('click', function (e) {
    var b = e.target.closest('[data-adim]');
    if (!b) return;
    var v = b.getAttribute('data-adim');
    if (v === 'kapat') { deneyAktif = null; adimCiz(); return; }
    var a = deneyAktif.adim[+v], gec = 0;
    a[1].forEach(function (x) {
      setTimeout(function () { islemYap(x); }, gec);
      gec += x[0] === 'e' ? 1050 : 300;
    });
    deneyAdim = +v + 1;
    setTimeout(adimCiz, 200);
  });
  function islemYap(x) {
    var i = x[1], k = KAPLAR[i];
    if (x[0] === 'e') ekleAnim(i, x[2], x[3]);
    else if (x[0] === 'isit') { k.isit = x[2]; if (x[2]) k.sogut = false; if (i !== aktif) kapSec(i); dugmeDurum(); gunlukIs(k.ad + (x[2] ? ' ısıtılmaya başlandı' : ' ısıtma kapatıldı')); }
    else if (x[0] === 'isitT') { k.isit = true; k.sogut = false; hedefT[i] = x[2]; if (i !== aktif) kapSec(i); dugmeDurum(); gunlukIs(k.ad + ' ' + x[2] + ' °C’ye ısıtılıyor'); }
    else if (x[0] === 'sogut') { k.sogut = x[2]; if (x[2]) k.isit = false; if (i !== aktif) kapSec(i); dugmeDurum(); gunlukIs(k.ad + ' buz banyosuna kondu'); }
    else if (x[0] === 'gaz') { if (i !== aktif) kapSec(i); testGoster(M.gazTesti(k), 'gaz'); }
    else if (x[0] === 'alev') { if (i !== aktif) kapSec(i); testGoster(M.alevTesti(k), 'alev', true); }
  }

  /* ================= TİTRASYON ================= */
  var TITRANT = [['naoh01', 'NaOH 0,1 M'], ['hcl01', 'HCl 0,1 M'], ['naoh', 'NaOH 1 M'], ['hcl', 'HCl 1 M'], ['h2so401', 'H₂SO₄ 0,1 M'], ['baoh2', 'Ba(OH)₂ 0,1 M'], ['kmno4', 'KMnO₄ 0,02 M']];
  var ANALIT = [
    ['hcl01', 'HCl 0,1 M', [['hcl01', 1]]], ['asetik01', 'CH₃COOH 0,1 M', [['asetik01', 1]]], ['nh301', 'NH₃ 0,1 M', [['nh301', 1]]], ['naoh01', 'NaOH 0,1 M', [['naoh01', 1]]],
    ['na2co3', 'Na₂CO₃ 0,1 M', [['na2co3', 0.2], ['su', 0.8]]], ['sirke', 'Sirke (5 kat seyreltilmiş)', [['sirke', 0.2], ['su', 0.8]]], ['baoh2', 'Ba(OH)₂ 0,1 M', [['baoh2', 1]]],
    ['h2so401', 'H₂SO₄ 0,1 M', [['h2so401', 1]]], ['feso4', 'FeSO₄ 0,05 M (asitli)', [['feso4', 0.5], ['h2so4', 0.2], ['su', 0.3]]]
  ];
  var ti = { k: new M.Kap('tit', 'Erlenmeyer', 'erlen', 0.25), v: 0, veri: [], akit: false, eksen: 'ph', donum: [], renkler: [] };
  function secDoldur() {
    $('#lb-tanalit').innerHTML = ANALIT.map(function (a, j) { return '<option value="' + j + '">' + h(a[1]) + '</option>'; }).join('');
    $('#lb-ttitrant').innerHTML = TITRANT.map(function (a) { return '<option value="' + a[0] + '">' + h(a[1]) + '</option>'; }).join('');
  }
  function tiKur() {
    var A = ANALIT[+$('#lb-tanalit').value], V = +$('#lb-thacim').value / 1000, g = $('#lb-tgos').value;
    ti.k.bosalt(); ti.v = 0; ti.veri = []; ti.donum = []; ti.renkler = []; ti.akit = false; akitDugme();
    A[2].forEach(function (x) { M.damla(ti.k, x[0], V * x[1]); });
    if (g) M.damla(ti.k, g === 'fenol' ? 'fenol' : g, 0.0001);
    ti.sinif = g ? M.GOS[g].sinif(ti.k.r.pH) : null;
    ti.veri.push([0, ti.k.r.pH, M.iletkenlik(ti.k)]);
    tiCiz(); grafikCiz(); tiSonuc();
  }
  function tiEkle(ml) {
    var id = $('#lb-ttitrant').value, kalan = 50 - ti.v;
    if (kalan <= 1e-9) { ti.akit = false; akitDugme(); tost('Büret boşaldı (50 mL).'); return; }
    ml = Math.min(ml, kalan);
    var adim = 0.05;
    while (ml > 1e-9) {
      var d = Math.min(adim, ml); ml -= d;
      M.damla(ti.k, id, d / 1000); ti.v += d;
      ti.veri.push([ti.v, ti.k.r.pH, M.iletkenlik(ti.k)]);
      var g = $('#lb-tgos').value;
      if (g) { var s = M.GOS[g].sinif(ti.k.r.pH); if (s !== ti.sinif) { ti.renkler.push([ti.v, ti.sinif, s]); tost(M.GOS[g].ad + ': ' + ti.sinif + ' → ' + s + ' (' + Y.tr(ti.v, 2) + ' mL)'); ti.sinif = s; } }
    }
    donumBul(); tiSonuc(); grafikCiz();
  }
  function donumBul() {
    var V = ti.veri, D = [], j;
    if (V.length < 5) return;
    for (j = 1; j < V.length; j++) { var dv = V[j][0] - V[j - 1][0]; if (dv > 0) D.push([(V[j][0] + V[j - 1][0]) / 2, (V[j][1] - V[j - 1][1]) / dv, (V[j][1] + V[j - 1][1]) / 2]); }
    var tepe = [];
    for (j = 2; j < D.length - 2; j++) {
      var d = D[j][1], ab = Math.abs(d);
      if (ab > 1.5 && ab >= Math.abs(D[j - 1][1]) && ab >= Math.abs(D[j + 1][1]) && ab > Math.abs(D[j - 2][1]) && ab > Math.abs(D[j + 2][1]) && D[D.length - 1][0] > D[j][0] + 0.3) {
        if (!tepe.length || D[j][0] - tepe[tepe.length - 1][0] > 2) tepe.push(D[j]);
        else if (ab > Math.abs(tepe[tepe.length - 1][1])) tepe[tepe.length - 1] = D[j];
      }
    }
    ti.donum = tepe;
  }
  function tiSonuc() {
    var A = ANALIT[+$('#lb-tanalit').value], T = $('#lb-ttitrant').value, Va = +$('#lb-thacim').value, s = '';
    var K = M.KIMI[T];
    var tur = aciklamaTur(A[0], T);
    s += '<div class="kutu"><b>' + h(tur.ad) + '</b><br>' + h(tur.metin) + '</div>';
    if (ti.donum.length) {
      ti.donum.forEach(function (d, j) {
        var ntit = d[0] / 1000 * (K.M || 0);
        if (d.ph === undefined) { var tk = new M.Kap('t', 't', 'erlen', 0.25); A[2].forEach(function (x) { M.damla(tk, x[0], Va / 1000 * x[1]); }); M.damla(tk, T, d[0] / 1000); d.ph = tk.r ? tk.r.pH : d[2]; }
        s += '<div class="kutu"><b>' + (ti.donum.length > 1 ? (j + 1) + '. ' : '') + 'Dönüm noktası ≈ ' + Y.tr(d[0], 2) + ' mL</b> (pH ≈ ' + Y.tr(d.ph, 2) + ')<br>' +
          'Harcanan ' + h(TITRANT.filter(function (x) { return x[0] === T; })[0][1]) + ': ' + Y.tr(d[0], 2) + ' mL → ' + Y.tr(ntit * 1000, 3) + ' mmol' + (tur.hesap ? '<br>' + tur.hesap(ntit, Va, j) : '') + '</div>';
      });
      if (tur.yari && ti.donum[0]) {
        var yv = ti.donum[0][0] / 2, en = null;
        ti.veri.forEach(function (p) { if (!en || Math.abs(p[0] - yv) < Math.abs(en[0] - yv)) en = p; });
        if (en) s += '<div class="kutu">Yarı dönüm noktasında (' + Y.tr(yv, 2) + ' mL) pH ≈ ' + Y.tr(en[1], 2) + ' = ' + tur.yari + '</div>';
      }
    } else if (ti.v > 0) s += '<div class="kutu">Titrant eklemeye devam et; pH’ın hızla değiştiği bölge dönüm noktasıdır.</div>';
    if (ti.renkler.length) s += '<div class="kutu">Gösterge rengi ' + ti.renkler.map(function (r) { return Y.tr(r[0], 2) + ' mL’de ' + r[1] + ' → ' + r[2]; }).join(', ') + ' değişti.</div>';
    $('#lb-tsonuc').innerHTML = s;
  }
  function aciklamaTur(a, t) {
    var bazT = /naoh|baoh2/.test(t), asitT = /hcl|h2so4/.test(t);
    if (t === 'kmno4') return { ad: 'Redoks titrasyonu (permanganometri)', metin: a === 'feso4' ? 'MnO₄⁻ + 5Fe²⁺ + 8H⁺ → Mn²⁺ + 5Fe³⁺ + 4H₂O. Fe²⁺ bitince ilk fazla damla çözeltiyi pembeye boyar; gösterge gerekmez.' : 'Permanganat yalnızca indirgen bir maddeyle (ör. Fe²⁺) titre edilir.', hesap: a === 'feso4' ? function (n, Va) { return 'n(Fe²⁺) = 5 × n(MnO₄⁻) = ' + Y.tr(5 * n * 1000, 3) + ' mmol → [Fe²⁺] = ' + Y.tr(5 * n / (Va / 1000), 4) + ' M'; } : null };
    if (a === 'baoh2' && t === 'h2so401') return { ad: 'Çökelme + nötralleşme (iletkenlik titrasyonu)', metin: 'Ba²⁺ + 2OH⁻ + 2H⁺ + SO₄²⁻ → BaSO₄(k) + 2H₂O. Dönüm noktasında ortamda neredeyse hiç iyon kalmaz: iletkenlik sıfıra yaklaşır, ampul söner. İletkenlik eksenine geç.', hesap: function (n, Va) { return '[Ba(OH)₂] = ' + Y.tr(n / (Va / 1000), 4) + ' M'; } };
    if (a === 'hcl01' && bazT) return { ad: 'Kuvvetli asit – kuvvetli baz', metin: 'Dönüm noktasında pH = 7. pH 4–10 arası ani değişim olduğu için fenolftalein de metil oranj da kullanılabilir.', hesap: function (n, Va) { return 'n(HCl) = n(OH⁻) → [HCl] = ' + Y.tr(n * (t === 'baoh2' ? 2 : 1) / (Va / 1000), 4) + ' M'; } };
    if ((a === 'asetik01' || a === 'sirke') && bazT) return { ad: 'Zayıf asit – kuvvetli baz', metin: 'Başlangıçta tampon bölgesi oluşur. Dönüm noktasında CH₃COO⁻ hidrolizi yüzünden pH > 7 olur; uygun gösterge fenolftaleindir.', yari: 'pKa (CH₃COOH ≈ 4,76)', hesap: function (n, Va) { var c = n * (t === 'baoh2' ? 2 : 1) / (Va / 1000); return '[CH₃COOH] = ' + Y.tr(c, 4) + ' M' + (a === 'sirke' ? ' → seyreltilmemiş sirkede ≈ ' + Y.tr(c * 5, 3) + ' M (≈ %' + Y.tr(c * 5 * 60.05 / 10, 1) + ')' : ''); } };
    if (a === 'nh301' && asitT) return { ad: 'Zayıf baz – kuvvetli asit', metin: 'Dönüm noktasında NH₄⁺ hidrolizi yüzünden pH < 7 olur; uygun gösterge metil oranj ya da metil kırmızısıdır.', yari: '14 − pKb ≈ 9,25 (NH₄⁺ için pKa)', hesap: function (n, Va) { return '[NH₃] = ' + Y.tr(n * (t === 'h2so401' ? 2 : 1) / (Va / 1000), 4) + ' M'; } };
    if (a === 'na2co3' && asitT) return { ad: 'Karbonat – kuvvetli asit (iki dönüm noktası)', metin: '1. adım: CO₃²⁻ + H⁺ → HCO₃⁻ (pH ≈ 8,3, fenolftalein). 2. adım: HCO₃⁻ + H⁺ → H₂O + CO₂ (pH ≈ 4, metil oranj).', hesap: function (n, Va, j) { return j === 0 ? '[Na₂CO₃] = ' + Y.tr(n * (t === 'h2so401' ? 2 : 1) / (Va / 1000), 4) + ' M' : 'İkinci dönüm noktasına kadar toplam 2 mol H⁺ / mol CO₃²⁻ harcanır.'; } };
    if ((a === 'naoh01' || a === 'baoh2') && asitT) return { ad: 'Kuvvetli baz – kuvvetli asit', metin: 'pH yüksekten başlar, dönüm noktasında 7’ye iner ve hızla düşer.', hesap: function (n, Va) { var f = t === 'h2so401' ? 2 : 1, g = a === 'baoh2' ? 2 : 1; return '[' + (a === 'baoh2' ? 'Ba(OH)₂' : 'NaOH') + '] = ' + Y.tr(n * f / g / (Va / 1000), 4) + ' M'; } };
    if (a === 'h2so401' && bazT) return { ad: 'Kuvvetli asit (H₂SO₄) – kuvvetli baz', metin: 'H₂SO₄ iki protonludur: 1 mol asit 2 mol OH⁻ ile nötrleşir.', hesap: function (n, Va) { return '[H₂SO₄] = n(OH⁻) / 2 / V = ' + Y.tr(n * (t === 'baoh2' ? 2 : 1) / 2 / (Va / 1000), 4) + ' M'; } };
    return { ad: 'Bu ikili bir nötralleşme titrasyonu değil', metin: 'Asidi bazla, bazı asitle titre et. Permanganatı FeSO₄ ile dene.' };
  }
  var tcv = $('#lb-tcan'), tcx = tcv.getContext('2d'), tol = 1, gcv = $('#lb-tgraf'), gcx = gcv.getContext('2d');
  function tiBoyut() {
    var w = tcv.parentNode.clientWidth || 360; tol = w / 360; tcv.width = Math.round(w * dpr); tcv.height = Math.round(300 * tol * dpr); tcv.style.height = 300 * tol + 'px';
    var w2 = gcv.parentNode.clientWidth - 16 || 340; gcv.width = Math.round(w2 * dpr); gcv.height = Math.round(w2 * 0.66 * dpr); gcv.style.height = w2 * 0.66 + 'px'; gcv._w = w2;
  }
  function tiCiz(t) {
    var c = tcx, k = ti.k; t = t || 0;
    c.setTransform(tol * dpr, 0, 0, tol * dpr, 0, 0);
    var g1 = c.createLinearGradient(0, 0, 0, 300); g1.addColorStop(0, '#FDFBF9'); g1.addColorStop(0.83, '#F3ECE5'); g1.addColorStop(0.831, '#E9DCCD'); g1.addColorStop(1, '#DCCBB8');
    c.fillStyle = g1; c.fillRect(0, 0, 360, 300);
    /* sehpa */
    c.fillStyle = '#6E737A'; c.fillRect(60, 18, 6, 230); c.fillRect(40, 244, 60, 8); c.fillRect(60, 40, 100, 5);
    /* büret */
    var bx = 172, by = 14, bh = 150, sv = 1 - ti.v / 50, Kt = M.KIMI[$('#lb-ttitrant').value], tr0 = Kt ? stokRenk(Kt) : [250, 250, 250];
    c.fillStyle = 'rgba(214,232,244,.35)'; c.fillRect(bx - 7, by, 14, bh);
    c.fillStyle = rgba(tr0, 0.9); c.fillRect(bx - 6, by + bh * (1 - sv), 12, bh * sv);
    c.strokeStyle = 'rgba(105,128,150,.8)'; c.lineWidth = 1.5; c.strokeRect(bx - 7, by, 14, bh);
    c.fillStyle = 'rgba(70,88,105,.8)'; c.font = '8px system-ui,sans-serif';
    for (var m = 0; m <= 50; m += 5) { var yy = by + bh * m / 50; c.fillRect(bx + 3, yy, m % 10 ? 4 : 7, 0.8); if (m % 10 === 0) c.fillText(String(m), bx + 12, yy + 3); }
    c.fillStyle = '#3A3D42'; c.fillRect(bx - 9, by + bh + 2, 18, 7); c.fillStyle = ti.akit ? '#38C172' : '#B42318'; c.fillRect(bx - 14, by + bh + 4, 6, 3);
    c.strokeStyle = 'rgba(105,128,150,.8)'; c.beginPath(); c.moveTo(bx, by + bh + 9); c.lineTo(bx, by + bh + 22); c.stroke();
    if (ti.akit) { var dy = by + bh + 24 + ((t * 2.4) % 1) * 40; c.fillStyle = rgba(tr0, 0.9); c.beginPath(); c.arc(bx, dy, 2.4, 0, 7); c.fill(); }
    /* erlen */
    var ex = 172, eb = 246, tw = 100, nw = 30, gh = 62, bhh = 22, R = M.renk(k);
    var pth = new Path2D(); pth.moveTo(ex - nw / 2, eb - gh - bhh); pth.lineTo(ex - nw / 2, eb - gh); pth.lineTo(ex - tw / 2, eb - 6); pth.quadraticCurveTo(ex - tw / 2, eb, ex - tw / 2 + 8, eb); pth.lineTo(ex + tw / 2 - 8, eb); pth.quadraticCurveTo(ex + tw / 2, eb, ex + tw / 2, eb - 6); pth.lineTo(ex + nw / 2, eb - gh); pth.lineTo(ex + nw / 2, eb - gh - bhh); pth.closePath();
    c.save(); c.clip(pth);
    var lvl = Math.min(gh + 10, 12 + k.V * 1000 * 0.62), sv2 = karis(R.sivi, R.bulRenk, R.bulanik * 0.9);
    var gr = c.createLinearGradient(0, eb - lvl, 0, eb); gr.addColorStop(0, rgba(karis(sv2, [255, 255, 255], 0.15), 0.9)); gr.addColorStop(1, rgba(sv2, 0.95));
    c.fillStyle = gr; c.beginPath(); c.moveTo(ex - 60, eb - lvl + Math.sin(t * 6) * 1.5); c.quadraticCurveTo(ex, eb - lvl + 4, ex + 60, eb - lvl - Math.sin(t * 6) * 1.5); c.lineTo(ex + 60, eb + 2); c.lineTo(ex - 60, eb + 2); c.fill();
    c.fillStyle = '#fff'; c.save(); c.translate(ex, eb - 4); c.beginPath(); c.ellipse(0, 0, 11 * Math.abs(Math.cos(t * 12)) + 3, 2.4, 0, 0, 7); c.fill(); c.restore();
    c.restore();
    c.strokeStyle = 'rgba(105,128,150,.7)'; c.lineWidth = 2; c.stroke(pth);
    c.fillStyle = '#4C5056'; yuvarlak(c, ex - 64, eb + 2, 128, 16, 5); c.fill(); c.fillStyle = '#38C172'; c.beginPath(); c.arc(ex + 50, eb + 10, 2.5, 0, 7); c.fill();
    $('#lb-tolcum').innerHTML = olcumHtml(k, true);
  }
  function grafikCiz() {
    var c = gcx, W = gcv._w || 340, H = W * 0.66, sol = 38, alt = 28, ust0 = 10, sag = 10;
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
    var k = ti.eksen === 'k', vmax = Math.max(10, Math.ceil((ti.donum.length ? Math.max(ti.v, ti.donum[ti.donum.length - 1][0] * 2) : Math.max(ti.v * 1.25, 25)) / 5) * 5);
    vmax = Math.min(50, vmax);
    var ymax = k ? Math.max(1, Math.ceil(Math.max.apply(null, ti.veri.map(function (p) { return p[2]; }).concat([1])) * 1.15)) : 14;
    function X(v) { return sol + (W - sol - sag) * v / vmax; }
    function Yy(y) { return ust0 + (H - ust0 - alt) * (1 - y / ymax); }
    c.strokeStyle = '#EFE9E3'; c.lineWidth = 1; c.fillStyle = '#7A726B'; c.font = '11px "IBM Plex Sans",system-ui,sans-serif';
    var adimY = k ? Math.max(0.5, Math.round(ymax / 5)) : 2;
    for (var y = 0; y <= ymax + 1e-9; y += adimY) { c.beginPath(); c.moveTo(sol, Yy(y)); c.lineTo(W - sag, Yy(y)); c.stroke(); c.textAlign = 'right'; c.fillText(Y.tr(y, k && adimY < 1 ? 1 : 0), sol - 6, Yy(y) + 4); }
    for (var v = 0; v <= vmax; v += vmax > 25 ? 10 : 5) { c.textAlign = 'center'; c.fillText(String(v), X(v), H - alt + 16); }
    c.textAlign = 'left'; c.fillText(k ? 'mS/cm' : 'pH', sol + 4, ust0 + 12); c.textAlign = 'right'; c.fillText('mL', W - sag, H - alt - 6);
    if (!k) { c.strokeStyle = 'rgba(27,107,74,.35)'; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(sol, Yy(7)); c.lineTo(W - sag, Yy(7)); c.stroke(); c.setLineDash([]); }
    ti.donum.forEach(function (d) { c.strokeStyle = 'rgba(248,83,0,.55)'; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(X(d[0]), ust0); c.lineTo(X(d[0]), H - alt); c.stroke(); c.setLineDash([]); });
    c.strokeStyle = '#F85300'; c.lineWidth = 2.2; c.beginPath();
    ti.veri.forEach(function (p, j) { var yy = k ? p[2] : Math.max(-0.5, Math.min(14.5, p[1])); if (j) c.lineTo(X(p[0]), Yy(yy)); else c.moveTo(X(p[0]), Yy(yy)); });
    c.stroke();
    var son = ti.veri[ti.veri.length - 1];
    if (son) { c.fillStyle = '#F85300'; c.beginPath(); c.arc(X(son[0]), Yy(k ? son[2] : Math.max(-0.5, Math.min(14.5, son[1]))), 4, 0, 7); c.fill(); }
  }
  function akitDugme() { var b = $('[data-ti="akit"]'); b.innerHTML = ikon(ti.akit ? 'dur' : 'oynat') + '<span>' + (ti.akit ? 'Durdur' : 'Sürekli akıt') + '</span>'; }
  $('#m-titrasyon').addEventListener('click', function (e) {
    var b = e.target.closest('[data-ti]'), s = e.target.closest('[data-e]');
    if (s) { ti.eksen = s.getAttribute('data-e'); $$('#lb-teksen button').forEach(function (x) { x.classList.toggle('on', x === s); }); grafikCiz(); return; }
    if (!b) return;
    var v = b.getAttribute('data-ti');
    if (v === 'akit') { ti.akit = !ti.akit; akitDugme(); }
    else if (v === 'bas') tiKur();
    else tiEkle(parseFloat(v));
  });
  ['#lb-tanalit', '#lb-thacim', '#lb-tgos', '#lb-ttitrant'].forEach(function (s) { $(s).addEventListener('change', tiKur); });
  $('#lb-thiz').addEventListener('input', function () { $('#lb-thizd').textContent = Y.tr(+this.value, 2).replace(/0$/, '') + ' mL/sn'; });

  /* ================= RAPOR ================= */
  function sureYaz(s) { var d = Math.floor(s / 60), sn = Math.floor(s % 60); return (d < 10 ? '0' : '') + d + ':' + (sn < 10 ? '0' : '') + sn; }
  function raporCiz() {
    var mlz = Object.keys(kullanilan).map(function (id) { var K = M.KIMI[id]; return '<span>' + (K.ghs[0] ? ghsImg(K.ghs[0], 16) : '') + h(K.ad) + (K.f ? ' (' + h(Y.alt(K.f)) + ')' : '') + '</span>'; }).join('');
    $('#lb-rmlz').innerHTML = mlz || '<span style="border:0;color:var(--tx3)">Henüz kimyasal kullanılmadı.</span>';
    var s = gunluk.map(function (g) {
      if (g.yap) return '<div class="rp"><span class="zm">' + sureYaz(g.t) + '</span> · ' + h(g.yap) + '</div>';
      if (g.o.tur === 'bilgi' && /kaba kondu|eklendi$/.test(g.o.baslik)) return '';
      return '<div class="rp"><span class="zm">' + sureYaz(g.t) + ' · ' + h(g.kap) + '</span><br><b>' + h(g.o.baslik) + '</b>' + (g.o.gozlem ? ' — ' + h(g.o.gozlem) : '') + (g.o.net ? '<br>' + h(g.o.net) : '') + '</div>';
    }).join('');
    $('#lb-rliste').innerHTML = s || '<div class="bos">Henüz deney yapılmadı.</div>';
  }
  function raporMetni() {
    var L = ['DENEY RAPORU', 'Deneyin adı: ' + ($('#lb-rad').value || '—'), 'Amaç: ' + ($('#lb-ramac').value || '—'), '',
      'Kullanılan malzemeler: ' + (Object.keys(kullanilan).map(function (id) { var K = M.KIMI[id]; return K.ad + (K.f ? ' (' + Y.alt(K.f) + ')' : ''); }).join(', ') || '—'), '', 'Yapılanlar ve gözlemler:'];
    gunluk.forEach(function (g) {
      if (g.yap) L.push(sureYaz(g.t) + '  ' + g.yap);
      else if (!(g.o.tur === 'bilgi' && /kaba kondu|eklendi$/.test(g.o.baslik))) { L.push(sureYaz(g.t) + '  [' + g.kap + '] ' + g.o.baslik + (g.o.gozlem ? ': ' + g.o.gozlem : '')); if (g.o.net) L.push('        ' + g.o.net); }
    });
    L.push('', 'Sonuç ve yorum: ' + ($('#lb-rsonuc').value || '—'));
    return L.join('\n');
  }
  function raporKopya() {
    var m = raporMetni();
    function yedek() { var ta = document.createElement('textarea'); ta.value = m; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); tost('Rapor kopyalandı.'); } catch (e) { tost('Kopyalanamadı.'); } document.body.removeChild(ta); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(m).then(function () { tost('Rapor kopyalandı. Bir yere yapıştırabilirsin.'); }, yedek);
    else yedek();
  }

  /* ================= DÖNGÜ ================= */
  var son = simdi(), birikim = 0, olcSay = 0;
  function dongu() {
    var su = simdi(), dt = Math.min(0.25, (su - son) / 1000); son = su;
    birikim += dt;
    var adet = 0;
    while (birikim >= 0.1 && adet < 3) {
      birikim -= 0.1; adet++;
      for (var i = 0; i < KAPLAR.length; i++) {
        var k = KAPLAR[i];
        if (tutT[i] !== null && !k.kirik) {
          var hT = tutT[i];
          if (k.T < hT - 0.6) { k.isit = true; k.sogut = false; }
          else if (k.T > hT + 0.6) { k.isit = false; k.sogut = k.T > hT + 2.5; }
          else { k.isit = false; k.sogut = false; }
          if (i === aktif && (k.isit !== $('[data-is="isit"]').classList.contains('on') || k.sogut !== $('[data-is="sogut"]').classList.contains('on'))) dugmeDurum();
        }
        if (!(k.V > 1e-6) && !k.metal.length && Math.abs(k.T - 25) < 0.2) continue;
        if (hedefT[i] !== null && k.T >= hedefT[i]) { k.isit = false; hedefT[i] = null; if (i === aktif) dugmeDurum(); tost(k.ad + ' ' + Y.tr(k.T, 0) + ' °C oldu; ısıtma durdu.'); }
        var L = M.adim(k, 0.1);
        if (L.length) olaylariIsle(i, L);
        if (!k.isit && i === aktif && $('[data-is="isit"]').classList.contains('on')) dugmeDurum();
      }
      if (ti.akit && mod === 'titrasyon') tiEkle(+$('#lb-thiz').value * 0.1);
    }
    if (birikim > 0.3) birikim = 0;
    var t = su / 1000;
    if (mod === 'serbest') { if (cz()) cz().ciz(t, dt); else tezgahCiz(t, dt); }
    else if (mod === 'titrasyon') tiCiz(t);
    if (++olcSay % 12 === 0) {
      if (mod === 'serbest') {
        olcumCiz();
        var k2 = KAPLAR[aktif];
        if (k2.tiyo >= 0 && !k2.tiyoBitti) { var sp = $('#lb-serit .sag'); if (sp) sp.textContent = '⏱ ' + Y.tr(k2.zaman - k2.tiyoT0, 0) + ' sn'; else seritYaz(null, 'Kronometre çalışıyor: bulanıklığı bekle.'); }
      }
      if (olcSay % 48 === 0 && mod === 'serbest') icerikCiz();
    }
    requestAnimationFrame(dongu);
  }

  /* ================= BAŞLAT ================= */
  boyut(); dolapCiz(); deneyListe(); secDoldur(); tiKur(); kapSec(0); gozlemCiz(); icerikCiz();
  var hs = (location.hash || '').replace('#', '');
  if (/^(titrasyon|hazir|rapor)$/.test(hs)) modAc(hs);
  requestAnimationFrame(dongu);
  LAx.KAPLAR = KAPLAR; LAx.ti = ti; LAx.deneyBaslat = deneyBaslat; LAx.ekle = ekleAnim; LAx.modAc = modAc; LAx.kapSec = kapSec;
  LAx.miktarAc = miktarAc; LAx.stokRenk = stokRenk; LAx.anim = anim; LAx.rozet = rozet;
  LAx.dokumBasla = dokumBasla; LAx.dokSessiz = dokSessiz; LAx.aktarSessiz = aktarSessiz; LAx.dokumBitti = dokumBitti;
  LAx.kirikTemizle = kirikTemizle; LAx.patlat = patlat; LAx.kapEkle = kapEkle; LAx.kapKaldir = kapKaldir; LAx.kapKur = kapKur; LAx.standartKaplar = standartKaplar;
  LAx.olaylar = function (i) { return olaylarK[i] || []; }; LAx.olaylariIsle = olaylariIsle; LAx.seritYaz = seritYaz; LAx.tost = tost;
  LAx.olcumCiz = olcumCiz; LAx.icerikCiz = icerikCiz; LAx.gozlemCiz = gozlemCiz; LAx.dugmeDurum = dugmeDurum; LAx.testGoster = testGoster; LAx.gunlukIs = gunlukIs;
  LAx.deneyKapat = function () { deneyAktif = null; adimCiz(); };
  LAx.penAc = penAc; LAx.penKapat = penKapat; LAx.dolapKapat = dolapKapat; LAx.h = h; LAx.ikon = ikon; LAx.$ = $;
  Object.defineProperty(LAx, 'aktif', { get: function () { return aktif; } });
  Object.defineProperty(LAx, 'mod', { get: function () { return mod; } });
  var ilkSise = true;
  LAx.siseDegisti = function (id) { if (!LAx.uc || LAx.gorevAktif) return; if (id && ilkSise) LAx.uc.ok({ sise: true }); else LAx.uc.ok(null); };
  var _db = LAx.dokumBasla; LAx.dokumBasla = function (i) { if (ilkSise && !LAx.gorevAktif && LAx.uc) { ilkSise = false; LAx.uc.ok(null); } _db(i); };
  LAx.uc3dHazir = function () {
    kok.classList.add('uc3d');
    dugmeDurum();
    seritYaz(null, '<b>Kimyasal ekle</b>’ye dokun, şişeyi bir kabın üstüne sürükle. Saf su için pişete, kabı dökmek için kabı başka bir kabın üstüne sürükle.');
  };
  window.LabArayuz = LAx;
})();
