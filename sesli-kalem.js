/* =====================================================================
   SESLİ DERS · KALEM — tahtaya kalemle yazma ve gösterme (Ronya)
   Apple Pencil, parmak ya da fareyle çizilen izler sesle aynı saatte kaydedilir;
   stüdyoda, önizlemede ve indirilen videoda aynı zamanlamayla yeniden çizilir.

   İz kaydı (adım başına, 'c:' + cümle özeti):
     { surum, g, y (tahta boyu), izler: [{ id, a: 'kalem'|'fosfor'|'lazer', r: renk, k: kalınlık,
       n: [x, y, t, p, ...] }], olay: [{ t, sil: [id] } | { t, temizle: true }] }
   x, y tahtanın sol üstünden piksel; t kaydın başından saniye; p kalem basıncı (0–1).
   ===================================================================== */
(function () {
  'use strict';
  if (window.SesliKalem) return;
  var K = window.SesliKalem = {};

  K.RENK_FOSFOR = '#FFD60A';
  K.RENK_LAZER = '#FF2E2E';
  K.KALINLIK = { kalem: 3.6, fosfor: 22, lazer: 6 };
  K.LAZER_SONME = 0.45;

  K.kimlik = function () { return Math.random().toString(36).slice(2, 7) + (Date.now() % 1679616).toString(36); };

  // t değerleri artan bir izde T anına kadar çizilmiş nokta sayısı
  function kacNokta(n, m, T) {
    if (!m || n[2] > T) return 0;
    if (n[4 * (m - 1) + 2] <= T) return m;
    var lo = 0, hi = m - 1;
    while (hi - lo > 1) { var md = (lo + hi) >> 1; if (n[4 * md + 2] <= T) lo = md; else hi = md; }
    return lo + 1;
  }
  K.kacNokta = kacNokta;

  /* ---------------- iz çizimi ---------------- */
  // basınçla incelip kalınlaşan kalem: orta noktalardan geçen kısa eğriler, yuvarlak uçlar
  function kalemYolu(c, n, m, k) {
    var gen = function (p) { return k * (0.42 + 0.78 * p); }, ps = n[3] || 0.5;
    if (m === 1) { c.beginPath(); c.arc(n[0], n[1], gen(ps) / 2, 0, Math.PI * 2); c.fill(); return; }
    var px = n[0], py = n[1], mx0 = px, my0 = py;
    for (var i = 1; i < m; i++) {
      var x = n[4 * i], y = n[4 * i + 1], p = n[4 * i + 3] || 0.5;
      ps = ps * 0.62 + p * 0.38;
      var mx = (px + x) / 2, my = (py + y) / 2;
      c.lineWidth = gen(ps);
      c.beginPath(); c.moveTo(mx0, my0); c.quadraticCurveTo(px, py, mx, my); c.stroke();
      mx0 = mx; my0 = my; px = x; py = y;
    }
    c.beginPath(); c.moveTo(mx0, my0); c.lineTo(px, py); c.stroke();
  }
  // fosforlu kalem: tek parça yol (yarı saydam olduğu için üst üste binmesin)
  function tekYol(c, n, m) {
    c.beginPath(); c.moveTo(n[0], n[1]);
    if (m === 1) { c.lineTo(n[0] + 0.01, n[1]); return; }
    for (var i = 1; i < m - 1; i++) { var x = n[4 * i], y = n[4 * i + 1]; c.quadraticCurveTo(x, y, (x + n[4 * i + 4]) / 2, (y + n[4 * i + 5]) / 2); }
    c.lineTo(n[4 * (m - 1)], n[4 * (m - 1) + 1]);
  }
  // kip: 'video' (tahtaya karışır), 'katman' (saydam üst katmanda düz)
  K.izCiz = function (c, iz, m, koyu, kip) {
    if (m == null) m = iz.m;
    if (!(m > 0)) return;
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    if (iz.a === 'fosfor') {
      if (kip === 'katman') c.globalAlpha *= 0.42;
      else { c.globalCompositeOperation = koyu ? 'screen' : 'multiply'; c.globalAlpha *= koyu ? 0.5 : 0.6; }
      c.strokeStyle = iz.r || K.RENK_FOSFOR; c.lineWidth = iz.k; tekYol(c, iz.n, m); c.stroke();
    } else {
      c.strokeStyle = c.fillStyle = iz.r || '#1F2733';
      kalemYolu(c, iz.n, m, iz.k);
    }
    c.restore();
  };
  // lazer: parlayan nokta ve sönen kuyruk; ucun yerini döndürür
  K.lazerCiz = function (c, iz, T) {
    var n = iz.n, m = iz.m, son = kacNokta(n, m, T);
    if (!son) return null;
    var T1 = n[4 * (m - 1) + 2], a = iz.basili ? 1 : (T > T1 ? Math.max(0, 1 - (T - T1) / K.LAZER_SONME) : 1);
    if (a <= 0) return null;
    var kuyruk = 0.4, renk = iz.r || K.RENK_LAZER, bas = son - 1;
    while (bas > 0 && n[4 * (bas - 1) + 2] >= T - kuyruk) bas--;
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = renk;
    for (var i = Math.max(1, bas); i < son; i++) {
      var yas = Math.max(0, (T - n[4 * i + 2]) / kuyruk), al = (1 - yas) * a;
      if (al <= 0) continue;
      c.globalAlpha = al * 0.8; c.lineWidth = iz.k * (0.35 + 0.65 * (1 - yas));
      c.beginPath(); c.moveTo(n[4 * i - 4], n[4 * i - 3]); c.lineTo(n[4 * i], n[4 * i + 1]); c.stroke();
    }
    var x = n[4 * (son - 1)], y = n[4 * (son - 1) + 1], R = iz.k * 1.9;
    c.globalAlpha = a;
    var g = c.createRadialGradient(x, y, 0, x, y, R * 2.3);
    g.addColorStop(0, 'rgba(255,70,70,.95)'); g.addColorStop(0.32, 'rgba(255,40,40,.5)'); g.addColorStop(1, 'rgba(255,40,40,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, R * 2.3, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#FFF5F5'; c.beginPath(); c.arc(x, y, R * 0.42, 0, Math.PI * 2); c.fill();
    c.restore();
    return [x, y];
  };

  /* ---------------- silgi: ize değiyor mu ---------------- */
  function parcaUzaklik2(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy, t = L ? ((px - ax) * dx + (py - ay) * dy) / L : 0;
    t = Math.max(0, Math.min(1, t));
    var qx = ax + t * dx - px, qy = ay + t * dy - py;
    return qx * qx + qy * qy;
  }
  K.isabet = function (iz, x, y, R) {
    var n = iz.n, m = iz.m, r = R + (iz.k || 3) / 2, r2 = r * r, i;
    if (!m) return false;
    if (m === 1) { var dx = n[0] - x, dy = n[1] - y; return dx * dx + dy * dy <= r2; }
    for (i = 1; i < m; i++) if (parcaUzaklik2(x, y, n[4 * i - 4], n[4 * i - 3], n[4 * i], n[4 * i + 1]) <= r2) return true;
    return false;
  };

  /* ---------------- zaman çizelgesinde yeniden çizim ---------------- */
  // o: { RS, g, h (tahta), koyu, adimlar: [{ sayfa, veri, esle: function (t) → video saati, olcek }] }
  function silmeleriUygula(S) {
    var kim = {};
    S.izler.forEach(function (s) { s.silT = Infinity; kim[s.id] = s; });
    S.olay.sort(function (a, b) { return a.T - b.T; });
    S.olay.forEach(function (e) {
      if (e.temizle) S.izler.forEach(function (s) { if (s.a !== 'lazer' && s.T0 <= e.T && s.silT === Infinity) s.silT = e.T; });
      else (e.sil || []).forEach(function (id) { var s = kim[id]; if (s && s.T0 <= e.T && s.silT === Infinity) s.silT = e.T; });
    });
    S.izler.sort(function (a, b) { return a.T0 - b.T0; });
  }
  K.cizici = function (o) {
    var RS = o.RS || 1, sayfalar = {}, enSon = -Infinity;
    (o.adimlar || []).forEach(function (a, ai) {
      if (!a || !a.veri) return;
      var v = a.veri, sc = a.olcek || 1, S = sayfalar[a.sayfa] || (sayfalar[a.sayfa] = { izler: [], olay: [] });
      (v.izler || []).forEach(function (iz) {
        var n = iz.n, m = Math.floor((n && n.length || 0) / 4);
        if (!m) return;
        var N = new Float32Array(m * 4);
        for (var j = 0; j < m; j++) { N[4 * j] = n[4 * j] * sc; N[4 * j + 1] = n[4 * j + 1] * sc; N[4 * j + 2] = a.esle(n[4 * j + 2]); N[4 * j + 3] = n[4 * j + 3]; }
        var s = { id: iz.id, a: iz.a, r: iz.r, k: (iz.k || K.KALINLIK[iz.a] || 3.6) * sc, n: N, m: m, T0: N[2], T1: N[4 * (m - 1) + 2], adim: ai };
        enSon = Math.max(enSon, s.T1 + (s.a === 'lazer' ? K.LAZER_SONME : 0));
        S.izler.push(s);
      });
      (v.olay || []).forEach(function (e) { var T = a.esle(e.t); enSon = Math.max(enSon, T); S.olay.push({ T: T, sil: e.sil || null, temizle: !!e.temizle }); });
    });
    Object.keys(sayfalar).forEach(function (p) { silmeleriUygula(sayfalar[p]); });
    var onb = null, onbX = null, onbSayfa = null, onbT = -Infinity, onbIc = {};
    var onbellek = function () {
      if (!onb) { onb = document.createElement('canvas'); onb.width = Math.max(1, Math.ceil(o.g * RS)); onb.height = Math.max(1, Math.ceil(o.h * RS)); onbX = onb.getContext('2d'); }
      return onbX;
    };
    // c: tahtanın sol üstüne taşınmış bağlam; dönüş: kalemin ucu [x, y] ya da null (yakın çekim izler)
    var ciz = function (c, T, p) {
      var S = sayfalar[p];
      if (!S) return null;
      var L = S.izler, uc = null, ucT = -Infinity, j, s, m;
      for (j = 0; j < L.length; j++) { // fosforlu altta kalır
        s = L[j]; if (s.a !== 'fosfor' || s.T0 > T || T >= s.silT) continue;
        m = kacNokta(s.n, s.m, T); K.izCiz(c, s, m, o.koyu, 'video');
        if (m < s.m && s.T0 > ucT) { ucT = s.T0; uc = [s.n[4 * (m - 1)], s.n[4 * (m - 1) + 1]]; }
      }
      var x = onbellek(), yeniden = onbSayfa !== p || T < onbT;
      if (!yeniden) for (j = 0; j < L.length; j++) { s = L[j]; if (onbIc[s.id] && !(s.T1 <= T && T < s.silT)) { yeniden = true; break; } }
      if (yeniden) { x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, onb.width, onb.height); onbIc = {}; onbSayfa = p; }
      x.setTransform(RS, 0, 0, RS, 0, 0);
      for (j = 0; j < L.length; j++) { s = L[j]; if (s.a !== 'kalem' || onbIc[s.id] || !(s.T1 <= T && T < s.silT)) continue; K.izCiz(x, s, s.m, o.koyu, 'video'); onbIc[s.id] = 1; }
      onbT = T;
      c.drawImage(onb, 0, 0, o.g, o.h);
      for (j = 0; j < L.length; j++) { // yazılmakta olan izler
        s = L[j]; if (s.a !== 'kalem' || s.T0 > T || s.T1 <= T || T >= s.silT) continue;
        m = kacNokta(s.n, s.m, T); K.izCiz(c, s, m, o.koyu, 'video');
        if (s.T0 > ucT) { ucT = s.T0; uc = [s.n[4 * (m - 1)], s.n[4 * (m - 1) + 1]]; }
      }
      for (j = 0; j < L.length; j++) {
        s = L[j]; if (s.a !== 'lazer' || s.T0 > T || T > s.T1 + K.LAZER_SONME) continue;
        var q = K.lazerCiz(c, s, T); if (q && s.T0 >= ucT) { ucT = s.T0; uc = q; }
      }
      if (!uc) { // az önce biten iz kısa bir süre izlenir
        var son = null;
        for (j = 0; j < L.length; j++) { s = L[j]; if (s.a === 'lazer' || s.T1 > T || T - s.T1 > 0.6 || T >= s.silT) continue; if (!son || s.T1 > son.T1) son = s; }
        if (son) uc = [son.n[4 * (son.m - 1)], son.n[4 * (son.m - 1) + 1]];
      }
      return uc;
    };
    // silgi için: T anında görünen izler (tahta pikselinde)
    var gorunenler = function (T, p) {
      var S = sayfalar[p]; if (!S) return [];
      return S.izler.filter(function (s) { return s.a !== 'lazer' && s.T1 <= T && T < s.silT; });
    };
    return { ciz: ciz, gorunenler: gorunenler, var: function (p) { return !!sayfalar[p]; }, son: function () { return enSon; } };
  };

  // bir adımın izlerinin kayıt saatindeki ilk ve son anı (videoda öncesine ve sonrasına süre eklenir)
  K.sinirlar = function (veri) {
    var a = Infinity, b = -Infinity;
    if (!veri) return null;
    (veri.izler || []).forEach(function (iz) {
      var n = iz.n, m = Math.floor((n && n.length || 0) / 4); if (!m) return;
      a = Math.min(a, n[2]); b = Math.max(b, n[4 * (m - 1) + 2] + (iz.a === 'lazer' ? K.LAZER_SONME : 0));
    });
    (veri.olay || []).forEach(function (e) { a = Math.min(a, e.t); b = Math.max(b, e.t); });
    return a <= b ? { ilk: a, son: b } : null;
  };

  /* ---------------- çizim yüzeyi: kalem girişi ---------------- */
  // tuval: tahta görüntüsünün üstündeki saydam tuval
  // o: { alan() → { lg: mantıksal genişlik, bx, by: tahtanın yeri, bg, bh: tahtanın boyu },
  //      saat() → kayıttaki saniye | null (kayıt yokken çizilmez), kapali(), koyu,
  //      eskiler() → silinebilecek eski izler [{ id, n, m, k }], silindi(ids | 'hepsi', t), degisti() }
  K.yuzey = function (tuval, o) {
    var c = tuval.getContext('2d'), self = {};
    var S = { izler: [], olay: [], aktif: {}, kalem: false, arac: 'kalem', renk: '#1F2733', raf: 0, silinen: {}, silgi: null, parmak: false };
    var onb = null, onbX = null, onbIc = {}, onbSay = 0;
    tuval.style.touchAction = 'none';
    var konum = function (e, A, R) {
      var s = R.width / A.lg;
      return [(e.clientX - R.left) / s - A.bx, (e.clientY - R.top) / s - A.by];
    };
    var basinc = function (e) { return e.pointerType === 'pen' ? (e.pressure > 0 ? e.pressure : 0.5) : 0.5; };
    var noktaEkle = function (iz, x, y, t, p, A) {
      x = Math.max(-4, Math.min(A.bg + 4, x)); y = Math.max(-4, Math.min(A.bh + 4, y));
      var n = iz.n, L = n.length;
      if (L) {
        var dx = x - n[L - 4], dy = y - n[L - 3];
        if (t < n[L - 2]) t = n[L - 2];
        if (dx * dx + dy * dy < 0.36 && t - n[L - 2] < 0.04) return;
      }
      n.push(Math.round(x * 10) / 10, Math.round(y * 10) / 10, Math.round(t * 1000) / 1000, Math.round(p * 100) / 100);
      iz.m = n.length / 4;
    };
    var silgiDene = function (x, y, t) {
      var R = 11, ids = [];
      S.izler.forEach(function (iz) { if (iz.a === 'lazer' || iz.silT != null || !iz.m) return; if (K.isabet(iz, x, y, R)) { iz.silT = t; ids.push(iz.id); } });
      (o.eskiler ? o.eskiler() : []).forEach(function (iz) { if (S.silinen[iz.id]) return; if (K.isabet(iz, x, y, R)) { S.silinen[iz.id] = 1; ids.push(iz.id); } });
      if (ids.length) { S.olay.push({ t: Math.round(t * 1000) / 1000, sil: ids }); if (o.silindi) o.silindi(ids, t); if (o.degisti) o.degisti(); }
    };
    var bitir = function (id) {
      var ak = S.aktif[id]; if (!ak) return;
      delete S.aktif[id];
      if (ak.iz) { ak.iz.basili = false; ak.iz.bitti = true; if (o.degisti) o.degisti(); }
      S.silgi = null; ciz();
    };
    var asagi = function (e) {
      S.sonHareket = performance.now();
      if (e.pointerType === 'pen') S.kalem = true;
      else if (e.pointerType === 'touch' && S.kalem && !S.parmak) return; // kalem varken avuç içi çizmez
      if (e.button > 0) return;
      var t = o.saat();
      if (t == null) { if (o.kapali) o.kapali(); return; }
      e.preventDefault();
      try { tuval.setPointerCapture(e.pointerId); } catch (x) {}
      var A = o.alan(), R = tuval.getBoundingClientRect(), b = konum(e, A, R);
      if (S.arac === 'silgi') { S.aktif[e.pointerId] = { silgi: true }; S.silgi = b; silgiDene(b[0], b[1], t); ciz(); return; }
      var iz = { id: K.kimlik(), a: S.arac, r: S.arac === 'kalem' ? S.renk : S.arac === 'fosfor' ? K.RENK_FOSFOR : K.RENK_LAZER, k: K.KALINLIK[S.arac], n: [], m: 0, basili: true };
      noktaEkle(iz, b[0], b[1], t, basinc(e), A);
      S.aktif[e.pointerId] = { iz: iz };
      S.izler.push(iz);
      ciz();
    };
    var hareket = function (e) {
      var ak = S.aktif[e.pointerId]; if (!ak) return;
      S.sonHareket = performance.now();
      var t = o.saat();
      if (t == null) { bitir(e.pointerId); return; }
      e.preventDefault();
      var A = o.alan(), R = tuval.getBoundingClientRect(), liste = null;
      try { liste = e.getCoalescedEvents ? e.getCoalescedEvents() : null; } catch (x) { liste = null; }
      if (!liste || !liste.length) liste = [e];
      for (var i = 0; i < liste.length; i++) {
        var q = liste[i], b = konum(q, A, R), geri = (e.timeStamp - q.timeStamp) / 1000;
        if (!(geri >= 0 && geri < 0.06)) geri = 0;
        if (ak.silgi) { S.silgi = b; silgiDene(b[0], b[1], t); }
        else noktaEkle(ak.iz, b[0], b[1], t - geri, basinc(q), A);
      }
      ciz();
    };
    var yukari = function (e) { bitir(e.pointerId); };
    tuval.addEventListener('pointerdown', asagi);
    tuval.addEventListener('pointermove', hareket);
    tuval.addEventListener('pointerup', yukari);
    tuval.addEventListener('pointercancel', yukari);
    tuval.addEventListener('lostpointercapture', yukari);
    var dokunma = function (e) { if (S.arac && o.saat() != null) e.preventDefault(); }; // iPad: kaydırma ve büyütme olmasın
    tuval.addEventListener('touchstart', dokunma, { passive: false });
    tuval.addEventListener('touchmove', dokunma, { passive: false });

    var ciz = function () { if (!S.raf) S.raf = requestAnimationFrame(cizGercek); };
    var cizGercek = function () {
      S.raf = 0;
      var A = o.alan(), W = tuval.width, H = tuval.height, s = W / A.lg, T = o.saat(), canli = false, j, iz;
      if (T == null) T = S.sonT || 0; else S.sonT = T;
      c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H);
      c.setTransform(s, 0, 0, s, A.bx * s, A.by * s);
      c.save(); c.beginPath(); c.rect(0, 0, A.bg, A.bh); c.clip();
      for (j = 0; j < S.izler.length; j++) { iz = S.izler[j]; if (iz.a === 'fosfor' && iz.silT == null) K.izCiz(c, iz, iz.m, o.koyu, 'katman'); }
      // biten kalem izleri önbellekte; silme olunca yeniden kurulur
      if (!onb || onb.width !== W || onb.height !== H) { onb = document.createElement('canvas'); onb.width = W; onb.height = H; onbX = onb.getContext('2d'); onbIc = {}; onbSay = 0; }
      var gecerli = 0;
      for (j = 0; j < S.izler.length; j++) { iz = S.izler[j]; if (onbIc[iz.id] && iz.silT == null) gecerli++; }
      if (gecerli !== onbSay) { onbX.setTransform(1, 0, 0, 1, 0, 0); onbX.clearRect(0, 0, W, H); onbIc = {}; onbSay = 0; }
      onbX.setTransform(s, 0, 0, s, A.bx * s, A.by * s);
      for (j = 0; j < S.izler.length; j++) { iz = S.izler[j]; if (iz.a !== 'kalem' || !iz.bitti || iz.silT != null || onbIc[iz.id]) continue; K.izCiz(onbX, iz, iz.m, o.koyu, 'katman'); onbIc[iz.id] = 1; onbSay++; }
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(onb, 0, 0); c.restore();
      for (j = 0; j < S.izler.length; j++) { iz = S.izler[j]; if (iz.a === 'kalem' && !iz.bitti && iz.silT == null) K.izCiz(c, iz, iz.m, o.koyu, 'katman'); }
      for (j = 0; j < S.izler.length; j++) {
        iz = S.izler[j]; if (iz.a !== 'lazer' || !iz.m) continue;
        var son = iz.n[4 * (iz.m - 1) + 2];
        if (!iz.basili && T > son + K.LAZER_SONME) continue;
        K.lazerCiz(c, iz, Math.max(T, iz.basili ? son : 0)); canli = true;
      }
      if (S.silgi) { c.strokeStyle = 'rgba(30,40,55,.55)'; c.lineWidth = 1.5; c.setLineDash([4, 3]); c.beginPath(); c.arc(S.silgi[0], S.silgi[1], 11, 0, Math.PI * 2); c.stroke(); c.setLineDash([]); }
      c.restore();
      if (canli) ciz();
    };

    self.arac = function (a) { S.arac = a; };
    self.renk = function (r) { S.renk = r; };
    self.parmak = function (v) { S.parmak = !!v; };
    self.kalemVar = function () { return S.kalem; };
    self.sonHareket = function () { return S.sonHareket || 0; }; // eller serbest kayıt: kalem yazarken kayıt durmasın
    self.yaziyor = function () { return Object.keys(S.aktif).length > 0; };
    self.basla = function () { S.izler = []; S.olay = []; S.aktif = {}; S.silinen = {}; S.silgi = null; onbIc = {}; onbSay = 0; if (onbX) { onbX.setTransform(1, 0, 0, 1, 0, 0); onbX.clearRect(0, 0, onb.width, onb.height); } ciz(); };
    self.olaylar = function () { return S.olay; };
    self.bitir = function () { // kayıt biter: izler saklanacak biçimde
      Object.keys(S.aktif).forEach(function (id) { var ak = S.aktif[id]; if (ak.iz) { ak.iz.basili = false; ak.iz.bitti = true; } });
      S.aktif = {}; S.silgi = null;
      var izler = S.izler.filter(function (iz) { return iz.m > 0; }).map(function (iz) { return { id: iz.id, a: iz.a, r: iz.r, k: iz.k, n: new Float32Array(iz.n) }; });
      return { izler: izler, olay: S.olay.slice() };
    };
    self.sayi = function () { return S.izler.filter(function (iz) { return iz.m > 0 && iz.a !== 'lazer'; }).length; };
    self.geriAl = function () {
      var t = o.saat(); if (t == null) return false;
      for (var i = S.izler.length - 1; i >= 0; i--) {
        var iz = S.izler[i];
        if (iz.a !== 'lazer' && iz.silT == null && iz.m) { iz.silT = t; S.olay.push({ t: Math.round(t * 1000) / 1000, sil: [iz.id] }); if (o.degisti) o.degisti(); ciz(); return true; }
      }
      return false;
    };
    self.temizle = function () {
      var t = o.saat(); if (t == null) return false;
      S.izler.forEach(function (iz) { if (iz.silT == null) iz.silT = t; });
      S.olay.push({ t: Math.round(t * 1000) / 1000, temizle: true });
      if (o.silindi) o.silindi('hepsi', t);
      if (o.degisti) o.degisti(); ciz(); return true;
    };
    self.boyut = function () { // tuvalin piksel boyu ekrandaki boya ve ekran yoğunluğuna uyar
      var R = tuval.getBoundingClientRect(), d = Math.min(3, window.devicePixelRatio || 1), W = Math.max(2, Math.round(R.width * d)), H = Math.max(2, Math.round(R.height * d));
      if (tuval.width !== W || tuval.height !== H) { tuval.width = W; tuval.height = H; }
      ciz();
    };
    self.ciz = ciz;
    self.kapat = function () {
      if (S.raf) cancelAnimationFrame(S.raf); S.raf = 0;
      tuval.removeEventListener('pointerdown', asagi); tuval.removeEventListener('pointermove', hareket);
      tuval.removeEventListener('pointerup', yukari); tuval.removeEventListener('pointercancel', yukari); tuval.removeEventListener('lostpointercapture', yukari);
      tuval.removeEventListener('touchstart', dokunma); tuval.removeEventListener('touchmove', dokunma);
    };
    return self;
  };

  /* ---------------- PDF ve görsel: tahtaya konacak sayfa resimleri ---------------- */
  var pdfSoz = null;
  K.pdfYukle = function () { // pdf.js yalnız PDF açılınca yüklenir; bir kaynak açılmazsa ötekisi denenir
    if (window.pdfjsLib && window.pdfjsLib.getDocument) return Promise.resolve(window.pdfjsLib);
    if (pdfSoz) return pdfSoz;
    pdfSoz = ['https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/', 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/'].reduce(function (zincir, kok) {
      return zincir.catch(function () {
        return new Promise(function (ok, red) {
          var sc = document.createElement('script'), zaman = setTimeout(function () { red(new Error('zaman aşımı')); }, 20000);
          sc.src = kok + 'pdf.min.js'; sc.async = true;
          sc.onload = function () {
            clearTimeout(zaman);
            var L = window.pdfjsLib || window['pdfjs-dist/build/pdf'];
            if (!L || !L.getDocument) { red(new Error('pdf.js yok')); return; }
            try { if (!L.GlobalWorkerOptions.workerSrc) L.GlobalWorkerOptions.workerSrc = kok + 'pdf.worker.min.js'; } catch (e) {}
            window.pdfjsLib = L; ok(L);
          };
          sc.onerror = function () { clearTimeout(zaman); red(new Error('pdf.js yüklenemedi')); };
          document.head.appendChild(sc);
        });
      });
    }, Promise.reject(new Error('başla')));
    pdfSoz.catch(function () { pdfSoz = null; });
    return pdfSoz;
  };
  function tuvaldenJpeg(tv, kalite) {
    return new Promise(function (ok, red) { tv.toBlob(function (b) { if (b) ok(b); else red(new Error('resim')); }, 'image/jpeg', kalite || 0.9); });
  }
  // en uzun kenarı EN piksel olacak biçimde küçültülmüş JPEG: { blob, g, y }
  var EN = 2000;
  function kucult(kaynak, g, y) {
    var o = Math.min(1, EN / Math.max(g, y)), tv = document.createElement('canvas');
    tv.width = Math.max(1, Math.round(g * o)); tv.height = Math.max(1, Math.round(y * o));
    var x = tv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, tv.width, tv.height); x.drawImage(kaynak, 0, 0, tv.width, tv.height);
    return tuvaldenJpeg(tv, 0.88).then(function (b) { return { blob: b, g: tv.width, y: tv.height }; });
  }
  K.resimDosyasi = function (dosya) {
    return new Promise(function (ok, red) {
      var u = URL.createObjectURL(dosya), im = new Image();
      im.onload = function () { kucult(im, im.naturalWidth, im.naturalHeight).then(function (r) { URL.revokeObjectURL(u); ok(r); }, function (e) { URL.revokeObjectURL(u); red(e); }); };
      im.onerror = function () { URL.revokeObjectURL(u); red(new Error('resim açılamadı')); };
      im.src = u;
    });
  };
  // PDF: { sayfa: adet, ciz(i) → Promise<{ blob, g, y }>, kapat() }
  K.pdfAc = function (dosya) {
    return Promise.all([K.pdfYukle(), dosya.arrayBuffer ? dosya.arrayBuffer() : new Response(dosya).arrayBuffer()]).then(function (s) {
      return s[0].getDocument({ data: new Uint8Array(s[1]) }).promise;
    }).then(function (pdf) {
      return {
        sayfa: pdf.numPages,
        ciz: function (i, en) {
          return pdf.getPage(i).then(function (sy) {
            var v1 = sy.getViewport({ scale: 1 }), olcek = (en || EN) / Math.max(v1.width, v1.height), v = sy.getViewport({ scale: olcek });
            var tv = document.createElement('canvas'); tv.width = Math.round(v.width); tv.height = Math.round(v.height);
            var x = tv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, tv.width, tv.height);
            return sy.render({ canvasContext: x, viewport: v }).promise.then(function () { return tuvaldenJpeg(tv, 0.88); }).then(function (b) { return { blob: b, g: tv.width, y: tv.height }; });
          });
        },
        kapat: function () { try { pdf.destroy(); } catch (e) {} }
      };
    });
  };
})();
