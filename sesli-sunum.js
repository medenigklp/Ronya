/* =====================================================================
   SESLİ DERS · SUNUM — videonun girişi, kapanışı ve marka katmanı (Ronya)
   5 saniyelik konu girişi (konuya göre animasyon ve ses), kapanış kartı,
   köşede kanal adı, alt bantta öğretmenin adı. Açık renkler: krem zemin, turuncu vurgu.
   ===================================================================== */
(function () {
  'use strict';
  if (window.SesliSunum) return;
  var S = window.SesliSunum = {};
  var UI = 'system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif';
  var R = { turuncu: '#F85300', turuncuK: '#C24100', murekkep: '#1E1A17', gri: '#7D7168', mavi: '#2F6FDB', yesil: '#2E9E5B', mor: '#7A4FD0', camgobegi: '#16898A', kirmizi: '#E0412F', sari: '#F2A900', gece: '#3B4652' };
  S.GIRIS_SURE = 5; S.KAPANIS_SURE = 3.2; S.GECIS = 0.5;

  function sinir(x, a, b) { return x < a ? a : x > b ? b : x; }
  function cik(t) { t = sinir(t, 0, 1); return 1 - Math.pow(1 - t, 3); }
  function yum(t) { t = sinir(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function zipla(t) { t = sinir(t, 0, 1); var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
  function rastgele(n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function yuvarlak(c, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function top(c, x, y, r, renk) { // parlak küre
    var g = c.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(0.28, renk); g.addColorStop(1, renk);
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(0,0,0,.12)'; c.beginPath(); c.arc(x, y, r, 0.15 * Math.PI, 0.85 * Math.PI); c.arc(x, y + r * 0.08, r * 0.92, 0.85 * Math.PI, 0.15 * Math.PI, true); c.fill();
  }
  function ok(c, x0, y0, x1, y1, w, renk, p) { // ucu sivri ok, p: çizilen kısım
    var x = x0 + (x1 - x0) * p, y = y0 + (y1 - y0) * p, a = Math.atan2(y1 - y0, x1 - x0);
    c.strokeStyle = c.fillStyle = renk; c.lineWidth = w; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(x, y); c.stroke();
    if (p > 0.15) { c.beginPath(); c.moveTo(x + Math.cos(a) * w * 1.6, y + Math.sin(a) * w * 1.6); c.lineTo(x + Math.cos(a + 2.5) * w * 2.6, y + Math.sin(a + 2.5) * w * 2.6); c.lineTo(x + Math.cos(a - 2.5) * w * 2.6, y + Math.sin(a - 2.5) * w * 2.6); c.closePath(); c.fill(); }
  }

  /* ---------------- zemin: krem, ışıklı, yavaşça kayan altıgenler ve kabarcıklar ---------------- */
  function zemin(c, G, Y, t) {
    var S0 = Math.min(G, Y), M = Math.max(G, Y), g = c.createLinearGradient(0, 0, 0, Y);
    g.addColorStop(0, '#FDF9F3'); g.addColorStop(1, '#F3E4D0'); c.fillStyle = g; c.fillRect(0, 0, G, Y);
    var r = c.createRadialGradient(G * 0.5, Y * 0.34, 0, G * 0.5, Y * 0.34, M * 0.72);
    r.addColorStop(0, 'rgba(255,255,255,.85)'); r.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = r; c.fillRect(0, 0, G, Y);
    var a = S0 * 0.07, h = a * Math.sqrt(3), ox = (t * a * 0.22) % (3 * a), oy = (t * a * 0.1) % h;
    c.save(); c.strokeStyle = 'rgba(248,83,0,.075)'; c.lineWidth = Math.max(1, S0 * 0.0022);
    for (var i = -2; i * 1.5 * a < G + 3 * a; i++) for (var j = -2; j * h < Y + 2 * h; j++) {
      var cx = i * 1.5 * a - ox, cy = j * h + (i % 2 ? h / 2 : 0) - oy;
      c.beginPath(); for (var k = 0; k < 6; k++) { var an = Math.PI / 3 * k; c[k ? 'lineTo' : 'moveTo'](cx + a * 0.92 * Math.cos(an), cy + a * 0.92 * Math.sin(an)); } c.closePath(); c.stroke();
    }
    c.restore();
    for (var b = 0; b < 9; b++) { // yükselen kabarcıklar
      var bx = G * (0.06 + 0.88 * rastgele(b + 1)), hiz = 0.025 + 0.03 * rastgele(b + 7), by = Y * (1.1 - ((rastgele(b + 3) + t * hiz) % 1.2)), br = S0 * (0.018 + 0.04 * rastgele(b + 11));
      c.fillStyle = b % 3 === 0 ? 'rgba(22,137,138,.08)' : 'rgba(248,83,0,.07)';
      c.beginPath(); c.arc(bx + Math.sin(t * 0.8 + b) * S0 * 0.01, by, br, 0, Math.PI * 2); c.fill();
    }
  }

  /* ---------------- konuya göre animasyon (beyaz rozetin içinde) ----------------
     m(c, r, p, t): rozetin merkezi (0,0), yarıçap r; p: beliriş (0–1), t: saniye */
  var MOTIF = {};
  MOTIF.atom = function (c, r, p, t) {
    var cizgi = r * 0.032;
    [0, 60, 120].forEach(function (d, k) {
      var q = cik(p * 1.6 - k * 0.18); if (q <= 0) return;
      c.save(); c.rotate(d * Math.PI / 180);
      c.strokeStyle = 'rgba(59,70,82,.75)'; c.lineWidth = cizgi; c.lineCap = 'round';
      c.beginPath(); c.ellipse(0, 0, r * 0.72, r * 0.26, 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * q); c.stroke();
      var a = t * (1.9 + k * 0.35) + k * 2.1;
      if (q >= 1) top(c, r * 0.72 * Math.cos(a), r * 0.26 * Math.sin(a), r * 0.07, [R.camgobegi, R.mavi, R.yesil][k]);
      c.restore();
    });
    var n = cik(p * 2.2); if (n <= 0) return;
    var nr = r * 0.17 * zipla(p * 2.2);
    top(c, -nr * 0.35, -nr * 0.2, nr * 0.62, R.turuncu); top(c, nr * 0.38, -nr * 0.12, nr * 0.58, '#9AA5B1'); top(c, 0, nr * 0.38, nr * 0.6, R.turuncu);
  };
  MOTIF.asit = function (c, r, p, t) { // pH çubuğu, gezinen gösterge ve düşen damla
    var w = r * 1.5, h = r * 0.2, x = -w / 2, y = -h / 2 + r * 0.12, q = cik(p * 1.4);
    var g = c.createLinearGradient(x, 0, x + w, 0);
    [[0, R.kirmizi], [0.25, R.sari], [0.5, R.yesil], [0.75, R.mavi], [1, R.mor]].forEach(function (s) { g.addColorStop(s[0], s[1]); });
    c.save(); yuvarlak(c, x, y, w, h, h / 2); c.clip(); c.fillStyle = 'rgba(0,0,0,.06)'; c.fillRect(x, y, w, h); c.fillStyle = g; c.fillRect(x, y, w * q, h); c.restore();
    c.fillStyle = R.gece; c.font = '700 ' + Math.round(r * 0.13) + 'px ' + UI; c.textAlign = 'center'; c.textBaseline = 'top';
    [0, 7, 14].forEach(function (v) { if (q >= v / 14 - 0.001) c.fillText(String(v), x + w * v / 14, y + h + r * 0.06); });
    if (q < 1) return;
    var px = x + w * (0.5 + 0.36 * Math.sin(t * 1.25)), py = y - r * 0.05;
    c.fillStyle = R.murekkep; c.beginPath(); c.moveTo(px, py); c.lineTo(px - r * 0.07, py - r * 0.12); c.lineTo(px + r * 0.07, py - r * 0.12); c.closePath(); c.fill();
    c.font = '800 ' + Math.round(r * 0.14) + 'px ' + UI; c.textBaseline = 'bottom'; c.fillText('pH', px, py - r * 0.14);
    var d = (t * 0.7) % 1, dy = -r * 0.75 + d * r * 0.55, dx = r * 0.45; // damla
    if (d < 0.85) { c.fillStyle = 'rgba(47,111,219,.85)'; c.beginPath(); c.arc(dx, dy, r * 0.055, 0, Math.PI); c.lineTo(dx, dy - r * 0.11); c.closePath(); c.fill(); }
  };
  MOTIF.beher = function (c, r, p, t) { // dolan beher, kabarcıklar
    var w = r * 0.9, h = r * 1.0, x = -w / 2, y = -h / 2 + r * 0.04, q = cik(p * 1.5);
    var seviye = y + h - h * 0.62 * cik(p * 1.2 - 0.2);
    c.save(); c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + h - r * 0.08); c.quadraticCurveTo(x, y + h, x + r * 0.08, y + h); c.lineTo(x + w - r * 0.08, y + h); c.quadraticCurveTo(x + w, y + h, x + w, y + h - r * 0.08); c.lineTo(x + w, y); c.closePath(); c.clip();
    c.fillStyle = 'rgba(22,137,138,.78)'; c.beginPath(); c.moveTo(x - 2, y + h + 2);
    for (var i = 0; i <= 24; i++) { var xx = x + w * i / 24; c.lineTo(xx, seviye + Math.sin(i * 0.7 + t * 3.2) * r * 0.025); }
    c.lineTo(x + w + 2, y + h + 2); c.closePath(); c.fill();
    for (var b = 0; b < 7; b++) { var bt = (t * (0.5 + 0.15 * rastgele(b)) + rastgele(b + 4)) % 1, by = y + h - bt * (y + h - seviye); c.fillStyle = 'rgba(255,255,255,.75)'; c.beginPath(); c.arc(x + w * (0.15 + 0.7 * rastgele(b + 9)), by, r * (0.02 + 0.025 * rastgele(b + 2)), 0, Math.PI * 2); c.fill(); }
    c.restore();
    c.strokeStyle = R.gece; c.lineWidth = r * 0.04; c.lineJoin = 'round'; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x - r * 0.08, y - r * 0.02); c.lineTo(x, y + r * 0.06); c.lineTo(x, y + h - r * 0.08); c.quadraticCurveTo(x, y + h, x + r * 0.08, y + h); c.lineTo(x + w - r * 0.08, y + h); c.quadraticCurveTo(x + w, y + h, x + w, y + h - r * 0.08); c.lineTo(x + w, y);
    c.globalAlpha = q; c.stroke(); c.globalAlpha = 1;
    c.strokeStyle = 'rgba(59,70,82,.45)'; c.lineWidth = r * 0.025; [0.3, 0.5, 0.7].forEach(function (k) { c.beginPath(); c.moveTo(x + w - r * 0.2, y + h * k); c.lineTo(x + w, y + h * k); c.stroke(); });
  };
  MOTIF.molekul = function (c, r, p, t) { // dönen top-çubuk molekül
    var a = t * 0.9, q = zipla(p * 1.6), U = [[0, 0, 0, 0.24, R.gece]], L = [[0.7, 0.55, 0.0], [-0.7, 0.55, 0.0], [0, -0.55, 0.62], [0, -0.55, -0.62]];
    L.forEach(function (v, k) { U.push([v[0], v[1], v[2], 0.15, ['#F3F5F7', R.turuncu, R.camgobegi, '#F3F5F7'][k]]); });
    var P = U.map(function (u) { var x = u[0] * Math.cos(a) + u[2] * Math.sin(a), z = -u[0] * Math.sin(a) + u[2] * Math.cos(a), s = 1 + z * 0.18; return { x: x * r * 0.62 * q, y: u[1] * r * 0.62 * q, z: z, r: u[3] * r * s * q, renk: u[4] }; });
    c.strokeStyle = '#8A949E'; c.lineCap = 'round';
    for (var k = 1; k < P.length; k++) { c.lineWidth = r * 0.07 * q; c.beginPath(); c.moveTo(P[0].x, P[0].y); c.lineTo(P[k].x, P[k].y); c.stroke(); }
    P.slice().sort(function (m, n) { return m.z - n.z; }).forEach(function (o) { if (o.r > 0) top(c, o.x, o.y, o.r, o.renk); if (o.renk === '#F3F5F7' && o.r > 0) { c.strokeStyle = 'rgba(59,70,82,.35)'; c.lineWidth = r * 0.012; c.beginPath(); c.arc(o.x, o.y, o.r, 0, Math.PI * 2); c.stroke(); } });
  };
  MOTIF.periyodik = function (c, r, p, t) { // beliren periyodik tablo kareleri
    var S2 = r * 0.27, ara = r * 0.05, sut = 5, sat = 4, w = sut * S2 + (sut - 1) * ara, h = sat * S2 + (sat - 1) * ara;
    var simge = { '0,0': ['H', R.camgobegi], '4,0': ['He', R.mor], '0,1': ['Li', R.kirmizi], '1,2': ['C', R.gece], '2,2': ['N', R.mavi], '3,2': ['O', R.turuncu], '0,3': ['Na', R.kirmizi], '4,3': ['Cl', R.yesil] };
    var tara = Math.floor(t * 2.2) % (sut * sat);
    for (var j = 0; j < sat; j++) for (var i = 0; i < sut; i++) {
      var n = j * sut + i, q = zipla(p * 1.8 - n * 0.035); if (q <= 0) continue;
      var x = -w / 2 + i * (S2 + ara), y = -h / 2 + j * (S2 + ara), s = simge[i + ',' + j], parla = n === tara;
      c.save(); c.translate(x + S2 / 2, y + S2 / 2); c.scale(q, q);
      yuvarlak(c, -S2 / 2, -S2 / 2, S2, S2, S2 * 0.18); c.fillStyle = s ? s[1] : (parla ? 'rgba(248,83,0,.35)' : 'rgba(59,70,82,.12)'); c.fill();
      if (s) { c.fillStyle = '#fff'; c.font = '800 ' + Math.round(S2 * 0.46) + 'px ' + UI; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(s[0], 0, S2 * 0.03); }
      c.restore();
    }
  };
  MOTIF.gaz = function (c, r, p, t) { // kapta çarpışan gaz tanecikleri
    var w = r * 1.2, h = r * 1.0, q = cik(p * 1.5);
    c.strokeStyle = R.gece; c.lineWidth = r * 0.04; c.globalAlpha = q; yuvarlak(c, -w / 2, -h / 2, w, h, r * 0.12); c.stroke(); c.globalAlpha = 1;
    if (q < 0.6) return;
    var ucgen = function (x) { x = x % 2; return x < 1 ? x : 2 - x; };
    for (var i = 0; i < 11; i++) {
      var vx = 0.35 + 0.5 * rastgele(i), vy = 0.3 + 0.55 * rastgele(i + 20), pr = r * 0.075;
      var px = -w / 2 + pr + (w - 2 * pr) * ucgen(rastgele(i + 5) * 2 + t * vx), py = -h / 2 + pr + (h - 2 * pr) * ucgen(rastgele(i + 9) * 2 + t * vy);
      top(c, px, py, pr, i % 3 === 0 ? R.turuncu : i % 3 === 1 ? R.camgobegi : R.mavi);
    }
  };
  MOTIF.tepkime = function (c, r, p, t) { // iki tanecik birleşir: A + B → AB
    var d = (t % 2.6) / 2.6, yak = yum(sinir((d - 0.15) / 0.45, 0, 1)), q = cik(p * 1.5);
    var ax = -r * 0.62 + yak * r * 0.5, bx = r * 0.62 - yak * r * 0.5, y = -r * 0.12;
    c.globalAlpha = q;
    if (yak < 1) { top(c, ax, y, r * 0.2, R.turuncu); top(c, bx, y, r * 0.16, R.camgobegi); if (yak < 0.3) { c.fillStyle = R.gece; c.font = '800 ' + Math.round(r * 0.26) + 'px ' + UI; c.textAlign = 'center'; c.textBaseline = 'middle'; c.globalAlpha = q * (1 - yak / 0.3); c.fillText('+', 0, y); c.globalAlpha = q; } }
    else { var s = 1 + 0.08 * Math.sin((d - 0.6) * 18) * Math.max(0, 1 - (d - 0.6) * 4); top(c, -r * 0.14 * s, y, r * 0.2 * s, R.turuncu); top(c, r * 0.17 * s, y, r * 0.16 * s, R.camgobegi); }
    ok(c, -r * 0.45, r * 0.42, r * 0.45, r * 0.42, r * 0.045, R.gece, cik(p * 1.4 - 0.3));
    c.globalAlpha = 1;
  };
  MOTIF.enerji = function (c, r, p, t) { // enerji grafiği, tepeyi aşan top
    var x0 = -r * 0.62, y0 = r * 0.55, w = r * 1.24, q = cik(p * 1.3);
    c.strokeStyle = R.gece; c.lineWidth = r * 0.035; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x0, -r * 0.6); c.lineTo(x0, y0); c.lineTo(x0 + w, y0); c.stroke();
    var f = function (u) { return y0 - r * (0.55 - 0.3 * u + 0.62 * Math.exp(-Math.pow((u - 0.45) / 0.14, 2))); };
    c.strokeStyle = R.turuncu; c.lineWidth = r * 0.055; c.beginPath();
    for (var i = 0; i <= 60 * q; i++) { var u = 0.05 + 0.9 * i / 60; c[i ? 'lineTo' : 'moveTo'](x0 + w * u, f(u)); } c.stroke();
    if (q < 1) return;
    var d = (t % 2.4) / 2.4, u2 = 0.05 + 0.9 * yum(d); top(c, x0 + w * u2, f(u2) - r * 0.07, r * 0.065, R.camgobegi);
  };
  MOTIF.denge = function (c, r, p, t) { // eşit kollu terazi ve çift yönlü ok
    var q = cik(p * 1.5), a = Math.sin(t * 1.6) * 0.1 * q;
    c.strokeStyle = R.gece; c.lineWidth = r * 0.045; c.lineCap = 'round'; c.globalAlpha = q;
    c.beginPath(); c.moveTo(0, -r * 0.3); c.lineTo(0, r * 0.42); c.moveTo(-r * 0.28, r * 0.42); c.lineTo(r * 0.28, r * 0.42); c.stroke();
    c.save(); c.translate(0, -r * 0.3); c.rotate(a); c.beginPath(); c.moveTo(-r * 0.6, 0); c.lineTo(r * 0.6, 0); c.stroke();
    [-1, 1].forEach(function (s) { c.save(); c.translate(s * r * 0.6, 0); c.rotate(-a); c.lineWidth = r * 0.025; c.beginPath(); c.moveTo(0, 0); c.lineTo(-r * 0.16, r * 0.28); c.moveTo(0, 0); c.lineTo(r * 0.16, r * 0.28); c.stroke(); c.fillStyle = s < 0 ? R.turuncu : R.camgobegi; c.beginPath(); c.ellipse(0, r * 0.3, r * 0.2, r * 0.06, 0, 0, Math.PI * 2); c.fill(); c.restore(); });
    c.restore();
    var oy = -r * 0.62, kay = Math.sin(t * 2.2) * r * 0.04;
    c.lineWidth = r * 0.035; c.beginPath(); c.moveTo(-r * 0.22 + kay, oy - r * 0.04); c.lineTo(r * 0.22 + kay, oy - r * 0.04); c.lineTo(r * 0.14 + kay, oy - r * 0.11); c.stroke();
    c.beginPath(); c.moveTo(r * 0.22 - kay, oy + r * 0.04); c.lineTo(-r * 0.22 - kay, oy + r * 0.04); c.lineTo(-r * 0.14 - kay, oy + r * 0.11); c.stroke();
    c.globalAlpha = 1;
  };
  MOTIF.elektro = function (c, r, p, t) { // pil, tel ve akan elektronlar
    var q = cik(p * 1.5), w = r * 1.1, h = r * 0.8, x = -w / 2, y = -h / 2 + r * 0.08;
    c.globalAlpha = q; c.strokeStyle = R.gece; c.lineWidth = r * 0.04; c.lineJoin = 'round'; yuvarlak(c, x, y, w, h, r * 0.1); c.stroke();
    c.fillStyle = '#fff'; c.fillRect(-r * 0.3, y + h - r * 0.12, r * 0.6, r * 0.24);
    yuvarlak(c, -r * 0.3, y + h - r * 0.13, r * 0.6, r * 0.26, r * 0.06); c.fillStyle = R.gece; c.fill();
    c.fillStyle = R.sari; c.fillRect(r * 0.04, y + h - r * 0.13, r * 0.26, r * 0.26);
    c.fillStyle = '#fff'; c.font = '800 ' + Math.round(r * 0.16) + 'px ' + UI; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('−', -r * 0.15, y + h); c.fillStyle = R.murekkep; c.fillText('+', r * 0.17, y + h);
    var cevre = 2 * (w + h);
    for (var i = 0; i < 8; i++) { var d = ((t * 0.18 + i / 8) % 1) * cevre, px, py; if (d < w) { px = x + d; py = y; } else if (d < w + h) { px = x + w; py = y + d - w; } else if (d < 2 * w + h) { px = x + w - (d - w - h); py = y + h; } else { px = x; py = y + h - (d - 2 * w - h); } if (py > y + h - 2 && Math.abs(px) < r * 0.32) continue; top(c, px, py, r * 0.045, R.mavi); }
    c.fillStyle = R.sari; c.strokeStyle = R.turuncuK; c.lineWidth = r * 0.02; var by = y - r * 0.02;
    c.beginPath(); c.moveTo(r * 0.04, by - r * 0.42); c.lineTo(-r * 0.12, by - r * 0.12); c.lineTo(0, by - r * 0.12); c.lineTo(-r * 0.06, by + r * 0.1); c.lineTo(r * 0.14, by - r * 0.2); c.lineTo(r * 0.02, by - r * 0.2); c.closePath(); c.fill(); c.stroke();
    c.globalAlpha = 1;
  };
  MOTIF.hiz = function (c, r, p, t) { // kronometre ve hız çizgileri
    var q = zipla(p * 1.6), rr = r * 0.48 * q;
    c.strokeStyle = R.gece; c.lineWidth = r * 0.05; c.lineCap = 'round';
    c.beginPath(); c.arc(r * 0.1, r * 0.08, rr, 0, Math.PI * 2); c.stroke();
    c.fillStyle = R.gece; c.fillRect(r * 0.1 - r * 0.07, r * 0.08 - rr - r * 0.12, r * 0.14, r * 0.08 * q);
    for (var k = 0; k < 12; k++) { var a = k * Math.PI / 6; c.lineWidth = r * (k % 3 ? 0.015 : 0.03); c.beginPath(); c.moveTo(r * 0.1 + Math.cos(a) * rr * 0.82, r * 0.08 + Math.sin(a) * rr * 0.82); c.lineTo(r * 0.1 + Math.cos(a) * rr * 0.93, r * 0.08 + Math.sin(a) * rr * 0.93); c.stroke(); }
    var el = t * 3.2 - Math.PI / 2; c.strokeStyle = R.turuncu; c.lineWidth = r * 0.04; c.beginPath(); c.moveTo(r * 0.1, r * 0.08); c.lineTo(r * 0.1 + Math.cos(el) * rr * 0.75, r * 0.08 + Math.sin(el) * rr * 0.75); c.stroke();
    c.strokeStyle = 'rgba(248,83,0,.55)'; c.lineWidth = r * 0.035;
    [-0.18, 0.04, 0.26].forEach(function (yy, k) { var u = (t * 1.4 + k * 0.3) % 1; c.globalAlpha = q * (1 - u); c.beginPath(); c.moveTo(-r * 0.78 + u * r * 0.1, r * yy); c.lineTo(-r * 0.5 + u * r * 0.1, r * yy); c.stroke(); });
    c.globalAlpha = 1;
  };
  MOTIF.cekirdek = function (c, r, p, t) { // proton ve nötronlardan çekirdek, çıkan tanecik
    var q = zipla(p * 1.6), Pk = [[0, 0], [0.3, 0.05], [-0.28, 0.1], [0.08, -0.29], [-0.15, -0.24], [0.2, 0.3], [-0.12, 0.32], [0.33, -0.22], [-0.36, -0.08]];
    Pk.forEach(function (v, k) { top(c, v[0] * r * 0.62 * q, v[1] * r * 0.62 * q, r * 0.15 * q, k % 2 ? R.turuncu : '#9AA5B1'); });
    var d = (t % 1.8) / 1.8; if (q < 1) return;
    var mx = d * r * 0.85, my = -d * r * 0.6; c.strokeStyle = 'rgba(22,137,138,.5)'; c.lineWidth = r * 0.04; c.lineCap = 'round';
    c.beginPath(); c.moveTo(mx * 0.3, my * 0.3); c.lineTo(mx, my); c.stroke(); top(c, mx, my, r * 0.07, R.camgobegi);
  };
  S.MOTIFLER = [['otomatik', 'Konuya göre'], ['atom', 'Atom'], ['asit', 'pH'], ['beher', 'Beher'], ['molekul', 'Molekül'], ['periyodik', 'Periyodik tablo'], ['gaz', 'Gaz'], ['tepkime', 'Tepkime'], ['enerji', 'Enerji'], ['denge', 'Denge'], ['elektro', 'Pil'], ['hiz', 'Hız'], ['cekirdek', 'Çekirdek']];
  S.motifBul = function (metin) { // başlık ve ilk cümlelerden konu; eşleşme yoksa null
    var m = String(metin || '').toLocaleLowerCase('tr');
    var B = '(^|[\\s(«"\'])', E = '(?=$|[\\s.,;:!?)»"\'])';
    var k = function (kok) { return new RegExp(kok); }, sz = function (govde, ekler) { return new RegExp(B + govde + '(' + (ekler || '') + ')' + E); };
    var kurallar = [[k('radyo|çekirdek|izotop|nükle|fisyon|füzyon'), 'cekirdek'],
      [k('asit|nötralleş|indikatör|turnusol'), 'asit'], [sz('baz', '|lar|ların|ik|lık'), 'asit'], [sz('ph', ''), 'asit'], [sz('tuz', '|lar|ların|un|u'), 'asit'],
      [k('tepkime hız|hızı|katalizör|aktifleşme|çarpışma'), 'hiz'], [sz('hız', '|ı|lar|ları|ın|ını'), 'hiz'], [k('denge|le chatelier|tersinir'), 'denge'],
      [k('entalpi|enerji|termokimya|ekzoterm|endoterm|kalorimetre'), 'enerji'], [sz('ısı', '|nın|sı|yı'), 'enerji'],
      [k('elektro|redoks|yükseltgen|indirgen|anot|katot|korozyon'), 'elektro'], [sz('pil', '|ler|lerin|i|in'), 'elektro'],
      [k('gaz|basınç|kinetik teori|difüzyon'), 'gaz'], [k('periyodik|element|soy gaz|ametal|metal'), 'periyodik'],
      [k('çözelti|çözün|karışım|derişim|molarite|çözücü|kaynama noktası|donma noktası'), 'beher'],
      [k('kimyasal bağ|molekül|organik|hidrokarbon|vsepr|polar|hibrit|lewis'), 'molekul'], [sz('bağ', '|lar|ları|ların'), 'molekul'],
      [k('tepkime|denklem|stokiyometri|kütle|verim'), 'tepkime'], [sz('mol', '|ler|kavramı|ü|ün'), 'tepkime'],
      [k('atom|orbital|elektron|proton|nötron|kuantum'), 'atom']];
    for (var i = 0; i < kurallar.length; i++) if (kurallar[i][0].test(m)) return kurallar[i][1];
    return null;
  };
  S.motifSec = function (metin) { return S.motifBul(metin) || 'atom'; };

  /* ---------------- yazı yerleşimi ---------------- */
  function satirlar(c, metin, enGen, enCok) {
    var kel = String(metin || '').split(/\s+/).filter(Boolean), sat = [[]], g = 0, bos = c.measureText(' ').width;
    kel.forEach(function (k) { var w = c.measureText(k).width; if (sat[sat.length - 1].length && g + bos + w > enGen) { sat.push([]); g = 0; } sat[sat.length - 1].push({ t: k, g: w }); g += (g ? bos : 0) + w; });
    return sat.length <= enCok ? sat : null;
  }
  // giriş ve kapanışta rozet, başlık, alt başlık ve kanal adı bir blok olarak dikeyde ortalanır (Reels'te üstteki ve alttaki yazılara denk gelmez)
  function bloklar(c, G, Y, baslik, alt, kapanis) {
    var S0 = Math.min(G, Y), dik = Y > G * 1.1, rb = S0 * (dik ? 0.25 : 0.19), enGen = G * (dik ? 0.86 : 0.72), fs = S0 * (dik ? 0.088 : 0.078), duzen = null, d;
    for (d = 0; d < 14; d++) { c.font = '800 ' + Math.round(fs) + 'px ' + UI; duzen = satirlar(c, baslik || 'Kimya', enGen, 3); if (duzen) break; fs *= 0.9; }
    if (!duzen) { var kisa = String(baslik || '').slice(0, 40); duzen = [[{ t: kisa, g: c.measureText(kisa).width }]]; }
    var L, toplam, olcek = 1;
    for (d = 0; d < 10; d++) {
      var r = rb * olcek, f = fs * olcek, halka = S0 * 0.02, bosluk1 = S0 * 0.075, baslikH = duzen.length * f * 1.14 + f * 0.38, altH = alt ? S0 * 0.075 : 0, bosluk2 = S0 * 0.065, etiketH = S0 * 0.072;
      toplam = 2 * (r + halka) + bosluk1 + baslikH + altH + bosluk2 + etiketH;
      if (toplam <= Y * 0.84 || d === 9) {
        var ust = (Y - toplam) * (dik ? 0.46 : 0.5);
        L = { S0: S0, dik: dik, rb: r, fs: f, cx: G / 2, cy: ust + halka + r, ty: ust + 2 * (r + halka) + bosluk1, duzen: duzen };
        L.altY = L.ty + baslikH + altH * 0.62; L.etiketY = L.ty + baslikH + altH + bosluk2 + etiketH / 2;
        break;
      }
      olcek *= 0.92;
    }
    if (olcek < 1) { // küçültünce satırlar yeniden ölçülür
      c.font = '800 ' + Math.round(L.fs) + 'px ' + UI;
      L.duzen = L.duzen.map(function (st) { return st.map(function (kk) { return { t: kk.t, g: c.measureText(kk.t).width }; }); });
    }
    return L;
  }

  /* ---------------- giriş: 5 sn ---------------- */
  // o: { G, Y, baslik, alt, kullanici, motif }
  S.giris = function (o) {
    var G = o.G, Y = o.Y, motif = MOTIF[o.motif] || MOTIF.atom, sure = S.GIRIS_SURE, L = null;
    var ciz = function (c, t) {
      if (!L) L = bloklar(c, G, Y, o.baslik, o.alt);
      var fs = L.fs;
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      zemin(c, G, Y, t);
      var cikis = yum((t - (sure - 0.7)) / 0.7), buyu = 1 + 0.04 * cikis;
      c.translate(G / 2, Y / 2); c.scale(buyu, buyu); c.translate(-G / 2, -Y / 2);
      var rs = zipla((t - 0.15) / 0.65); // rozet
      if (rs > 0) {
        c.save(); c.translate(L.cx, L.cy);
        c.shadowColor = 'rgba(120,60,20,.18)'; c.shadowBlur = L.S0 * 0.05; c.shadowOffsetY = L.S0 * 0.012;
        c.fillStyle = '#FFFFFF'; c.beginPath(); c.arc(0, 0, L.rb * rs, 0, Math.PI * 2); c.fill(); c.shadowColor = 'transparent';
        c.strokeStyle = 'rgba(248,83,0,.85)'; c.lineWidth = L.S0 * 0.008; c.beginPath(); c.arc(0, 0, L.rb * rs + L.S0 * 0.018, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * cik((t - 0.3) / 1.0)); c.stroke();
        c.beginPath(); c.arc(0, 0, L.rb * rs, 0, Math.PI * 2); c.clip();
        motif(c, L.rb * 0.92, sinir((t - 0.45) / 1.3, 0, 1), t);
        c.restore();
      }
      c.font = '800 ' + Math.round(fs) + 'px ' + UI; c.textBaseline = 'alphabetic'; c.textAlign = 'left'; // başlık: kelimeler sırayla yukarı kayarak gelir
      var satH = fs * 1.14, bos = c.measureText(' ').width, n = 0, y = L.ty + fs * 0.9, sonSat = null;
      L.duzen.forEach(function (st) {
        var gen = st.reduce(function (a, k) { return a + k.g; }, 0) + bos * (st.length - 1), x = L.cx - gen / 2;
        st.forEach(function (k) {
          var q = cik((t - 0.85 - n * 0.075) / 0.5); n++;
          if (q > 0) { c.globalAlpha = q; c.fillStyle = R.murekkep; c.fillText(k.t, x, y + (1 - q) * fs * 0.45); }
          x += k.g + bos;
        });
        sonSat = { g: gen, y: y }; y += satH;
      });
      c.globalAlpha = 1;
      var cz = cik((t - 1.55) / 0.6); // turuncu alt çizgi
      if (cz > 0 && sonSat) { var cw = Math.min(sonSat.g, L.S0 * 0.42) * cz; yuvarlak(c, L.cx - cw / 2, sonSat.y + fs * 0.2, cw, fs * 0.11, fs * 0.055); c.fillStyle = R.turuncu; c.fill(); }
      if (o.alt) { var qa = cik((t - 1.85) / 0.55); if (qa > 0) { c.globalAlpha = qa; c.fillStyle = R.gri; c.font = '600 ' + Math.round(L.S0 * 0.042) + 'px ' + UI; c.textAlign = 'center'; c.fillText(o.alt, L.cx, L.altY + (1 - qa) * L.S0 * 0.02); c.globalAlpha = 1; } }
      if (o.kullanici) { // kanal adı
        var qe = zipla((t - 2.3) / 0.5);
        if (qe > 0) {
          c.font = '800 ' + Math.round(L.S0 * 0.036) + 'px ' + UI; var ew = c.measureText(o.kullanici).width + L.S0 * 0.07, eh = L.S0 * 0.072;
          c.save(); c.translate(L.cx, L.etiketY); c.scale(qe, qe);
          yuvarlak(c, -ew / 2, -eh / 2, ew, eh, eh / 2); c.fillStyle = R.turuncu; c.fill();
          c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(o.kullanici, 0, eh * 0.04); c.restore();
        }
      }
      c.restore();
    };
    return { sure: sure, ciz: ciz };
  };

  /* ---------------- kapanış: takip kartı ---------------- */
  // o: { G, Y, kullanici, foto (resim | null), motif, cagri }
  S.kapanis = function (o) {
    var G = o.G, Y = o.Y, motif = MOTIF[o.motif] || MOTIF.atom, sure = S.KAPANIS_SURE, L = null;
    var ciz = function (c, t) {
      if (!L) L = bloklar(c, G, Y, o.kullanici || '@kimyamed', 'x');
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      zemin(c, G, Y, t + 7);
      var rs = zipla((t - 0.1) / 0.6);
      if (rs > 0) { // öğretmenin fotoğrafı (varsa) ya da konunun animasyonu
        c.save(); c.translate(L.cx, L.cy);
        c.shadowColor = 'rgba(120,60,20,.2)'; c.shadowBlur = L.S0 * 0.05; c.shadowOffsetY = L.S0 * 0.012;
        c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, L.rb * rs, 0, Math.PI * 2); c.fill(); c.shadowColor = 'transparent';
        c.strokeStyle = R.turuncu; c.lineWidth = L.S0 * 0.012; c.beginPath(); c.arc(0, 0, L.rb * rs, 0, Math.PI * 2); c.stroke();
        c.beginPath(); c.arc(0, 0, Math.max(0.5, L.rb * rs - L.S0 * 0.01), 0, Math.PI * 2); c.clip();
        var f = o.foto;
        if (f) { var fw = f.width || f.naturalWidth, fh = f.height || f.naturalHeight, kk = Math.min(fw, fh), d = L.rb * 2 * rs; try { c.drawImage(f, (fw - kk) / 2, (fh - kk) * 0.3, kk, kk, -d / 2, -d / 2, d, d); } catch (e) {} }
        else motif(c, L.rb * 0.92, 1, t + 3);
        c.restore();
      }
      c.textAlign = 'center'; c.textBaseline = 'alphabetic';
      var q1 = cik((t - 0.4) / 0.5), fsK = L.S0 * 0.042;
      if (q1 > 0) { c.globalAlpha = q1; c.fillStyle = R.gri; c.font = '600 ' + Math.round(fsK) + 'px ' + UI; c.fillText('Daha fazla kimya dersi için', L.cx, L.ty + fsK * 0.6); }
      var q2 = cik((t - 0.55) / 0.55);
      if (q2 > 0 && o.kullanici) { c.globalAlpha = q2; c.fillStyle = R.murekkep; var fs = L.fs * 1.05; c.font = '800 ' + Math.round(fs) + 'px ' + UI; while (c.measureText(o.kullanici).width > G * 0.88 && fs > 20) { fs *= 0.92; c.font = '800 ' + Math.round(fs) + 'px ' + UI; } c.fillText(o.kullanici, L.cx, L.ty + fsK * 0.6 + fs * 1.2 + (1 - q2) * L.S0 * 0.03); }
      var q3 = zipla((t - 0.95) / 0.5);
      if (q3 > 0) {
        var nabiz = 1 + 0.035 * Math.max(0, Math.sin((t - 1.5) * 5)) * (t > 1.5 ? 1 : 0), yaz = (o.cagri || 'Takip et');
        c.globalAlpha = 1; c.font = '800 ' + Math.round(L.S0 * 0.04) + 'px ' + UI; var ew = c.measureText(yaz).width + L.S0 * 0.09, eh = L.S0 * 0.08;
        c.save(); c.translate(L.cx, L.etiketY); c.scale(q3 * nabiz, q3 * nabiz);
        yuvarlak(c, -ew / 2, -eh / 2, ew, eh, eh / 2); c.fillStyle = R.turuncu; c.fill();
        c.fillStyle = '#fff'; c.textBaseline = 'middle'; c.fillText(yaz, 0, eh * 0.04); c.restore();
      }
      c.restore();
    };
    return { sure: sure, ciz: ciz };
  };

  /* ---------------- kapak görseli: Reels kapağı ya da YouTube küçük resmi ---------------- */
  // o: { G, Y, baslik, alt, kullanici, motif, foto (resim | tuval | null), filigran }
  S.kapak = function (o) {
    var G = o.G, Y = o.Y, tv = document.createElement('canvas'); tv.width = G; tv.height = Y;
    var c = tv.getContext('2d'), S0 = Math.min(G, Y), dik = Y > G * 1.1, motif = MOTIF[o.motif] || MOTIF.atom, f = o.foto;
    zemin(c, G, Y, 2.2);
    var daire = function (cx, cy, r) { // fotoğraf ya da konunun animasyonu, turuncu halkalı
      c.save(); c.shadowColor = 'rgba(120,60,20,.22)'; c.shadowBlur = S0 * 0.05; c.shadowOffsetY = S0 * 0.014;
      c.fillStyle = '#fff'; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill(); c.restore();
      c.save(); c.beginPath(); c.arc(cx, cy, r - S0 * 0.008, 0, Math.PI * 2); c.clip();
      if (f) { var fw = f.width || f.naturalWidth || f.videoWidth, fh = f.height || f.naturalHeight || f.videoHeight, k = Math.min(fw, fh), d = 2 * r; try { c.drawImage(f, (fw - k) / 2, (fh - k) * 0.3, k, k, cx - r, cy - r, d, d); } catch (e) {} }
      else { c.translate(cx, cy); motif(c, r * 0.92, 1, 2.2); }
      c.restore();
      c.strokeStyle = R.turuncu; c.lineWidth = S0 * 0.012; c.beginPath(); c.arc(cx, cy, r + S0 * 0.012, 0, Math.PI * 2); c.stroke();
      if (f) { var rb = r * 0.34, bx = cx + r * 0.72, by = cy + r * 0.72; c.save(); c.shadowColor = 'rgba(0,0,0,.18)'; c.shadowBlur = S0 * 0.02; c.fillStyle = '#fff'; c.beginPath(); c.arc(bx, by, rb, 0, Math.PI * 2); c.fill(); c.restore(); c.save(); c.beginPath(); c.arc(bx, by, rb, 0, Math.PI * 2); c.clip(); c.translate(bx, by); motif(c, rb * 0.92, 1, 2.2); c.restore(); c.strokeStyle = R.turuncu; c.lineWidth = S0 * 0.006; c.beginPath(); c.arc(bx, by, rb, 0, Math.PI * 2); c.stroke(); }
    };
    var etiket = function (x, y, yazi, fs, orta) {
      c.font = '800 ' + Math.round(fs) + 'px ' + UI; var w = c.measureText(yazi).width + fs * 1.8, h = fs * 1.9, x0 = orta ? x - w / 2 : x;
      yuvarlak(c, x0, y - h / 2, w, h, h / 2); c.fillStyle = R.turuncu; c.fill();
      c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(yazi, x0 + w / 2, y + fs * 0.06);
    };
    if (dik) { // Reels: içerik ortadaki 3:4 alanda kalır (profil ızgarası kırpar)
      var L = bloklar(c, G, Y, o.baslik, o.alt);
      daire(L.cx, L.cy, L.rb * 1.05);
      c.font = '800 ' + Math.round(L.fs * 1.08) + 'px ' + UI; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.fillStyle = R.murekkep;
      var y = L.ty + L.fs * 0.95, son = null;
      L.duzen.forEach(function (st) { var yazi = st.map(function (k) { return k.t; }).join(' '); c.fillText(yazi, L.cx, y); son = { g: c.measureText(yazi).width, y: y }; y += L.fs * 1.2; });
      if (son) { var cw = Math.min(son.g, S0 * 0.42); yuvarlak(c, L.cx - cw / 2, son.y + L.fs * 0.22, cw, L.fs * 0.12, L.fs * 0.06); c.fillStyle = R.turuncu; c.fill(); }
      if (o.alt) { c.fillStyle = R.gri; c.font = '600 ' + Math.round(S0 * 0.044) + 'px ' + UI; c.fillText(o.alt, L.cx, L.altY + S0 * 0.01); }
      if (o.kullanici) etiket(L.cx, L.etiketY, o.filigran || o.kullanici, S0 * 0.034, true);
    } else { // YouTube: solda büyük başlık, sağda yuvarlak fotoğraf
      var r = Y * 0.34, cx = G - r - G * 0.07, cy = Y * 0.5;
      daire(cx, cy, r);
      var enGen = cx - r - G * 0.1, fs = Y * 0.13, duzen = null;
      for (var d = 0; d < 14; d++) { c.font = '900 ' + Math.round(fs) + 'px ' + UI; duzen = satirlar(c, o.baslik || 'Kimya', enGen, 3); if (duzen) break; fs *= 0.9; }
      if (!duzen) duzen = [[{ t: String(o.baslik || '').slice(0, 30), g: 0 }]];
      var x = G * 0.06, satH = fs * 1.12, toplam = duzen.length * satH + (o.alt ? Y * 0.09 : 0) + Y * 0.12, yy = (Y - toplam) / 2 + fs * 0.9;
      c.textAlign = 'left'; c.textBaseline = 'alphabetic';
      duzen.forEach(function (st, i) { var yazi = st.map(function (k) { return k.t; }).join(' '); c.fillStyle = R.murekkep; c.fillText(yazi, x, yy); if (i === duzen.length - 1) { var w2 = Math.min(c.measureText(yazi).width, enGen * 0.6); yuvarlak(c, x, yy + fs * 0.2, w2, fs * 0.12, fs * 0.06); c.fillStyle = R.turuncu; c.fill(); } yy += satH; });
      if (o.alt) { c.fillStyle = R.gri; c.font = '700 ' + Math.round(Y * 0.055) + 'px ' + UI; c.fillText(o.alt, x, yy + Y * 0.02); yy += Y * 0.09; }
      if (o.kullanici) etiket(x, yy + Y * 0.04, o.filigran || o.kullanici, Y * 0.036, false);
    }
    return tv;
  };

  /* ---------------- içerik üstündeki katman: köşede kanal adı, alt bantta öğretmen ---------------- */
  // o: { G, Y, filigran: yazı | '', altBant: { ad, unvan } | null, yer: yerleşim adı }
  S.ustKatman = function (o) {
    var G = o.G, Y = o.Y, S0 = Math.min(G, Y), dik = Y > G * 1.1;
    return function (c, t) {
      if (o.filigran) {
        c.save(); c.font = '700 ' + Math.round(S0 * 0.026) + 'px ' + UI;
        var w = c.measureText(o.filigran).width + S0 * 0.044, h = S0 * 0.05, x = G - w - S0 * 0.03, y = S0 * 0.03;
        c.globalAlpha = 0.92; yuvarlak(c, x, y, w, h, h / 2); c.fillStyle = R.turuncu; c.fill();
        c.globalAlpha = 1; c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(o.filigran, x + w / 2, y + h * 0.53); c.restore();
      }
      var B = o.altBant;
      if (B && B.ad && t > 0.5 && t < 6.6) {
        var gir = cik((t - 0.5) / 0.55), cik2 = yum((t - 5.9) / 0.7), kay = (1 - gir) * -1 + cik2 * -1;
        var fs = S0 * (dik ? 0.042 : 0.036), fs2 = fs * 0.72;
        c.save(); c.font = '800 ' + Math.round(fs) + 'px ' + UI; var w1 = c.measureText(B.ad).width; c.font = '600 ' + Math.round(fs2) + 'px ' + UI; var w2 = B.unvan ? c.measureText(B.unvan).width : 0;
        var w = Math.max(w1, w2) + S0 * 0.075, h = B.unvan ? fs * 2.25 : fs * 1.55, x = S0 * 0.045, y = dik ? Y * 0.9 - h : Y * 0.7 - h;
        c.translate(kay * (w + x), 0); c.globalAlpha = Math.min(gir, 1 - cik2);
        c.shadowColor = 'rgba(0,0,0,.22)'; c.shadowBlur = S0 * 0.02; c.shadowOffsetY = S0 * 0.006;
        yuvarlak(c, x, y, w, h, S0 * 0.014); c.fillStyle = 'rgba(255,255,255,.96)'; c.fill(); c.shadowColor = 'transparent';
        yuvarlak(c, x, y, S0 * 0.012, h, S0 * 0.006); c.fillStyle = R.turuncu; c.fill();
        c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.fillStyle = R.murekkep; c.font = '800 ' + Math.round(fs) + 'px ' + UI; c.fillText(B.ad, x + S0 * 0.035, y + fs * (B.unvan ? 1.05 : 1.08));
        if (B.unvan) { c.fillStyle = R.gri; c.font = '600 ' + Math.round(fs2) + 'px ' + UI; c.fillText(B.unvan, x + S0 * 0.035, y + fs * 1.85); }
        c.restore();
      }
    };
  };

  /* ---------------- sunum: giriş + içerik + kapanış (geçişler yumuşak) ---------------- */
  // o: { G, Y, icerik: { tuval, kare(t) }, icerikSure, giris, kapanis, ust(c, t) }
  S.sunum = function (o) {
    var G = o.G, Y = o.Y, tuval = document.createElement('canvas'); tuval.width = G; tuval.height = Y;
    var c = tuval.getContext('2d'), GI = o.giris ? o.giris.sure : 0, GO = o.kapanis ? o.kapanis.sure : 0, IS = o.icerikSure, GC = S.GECIS, ara = null;
    var araTuval = function () { if (!ara) { ara = document.createElement('canvas'); ara.width = G; ara.height = Y; } return ara; };
    var guvenli = function (fn) { c.save(); try { fn(); } catch (e) { if (window.console) console.warn('Sunum:', e); } c.restore(); }; // süsleme hatası videoyu durdurmasın
    var icerik = function (ti) { o.icerik.kare(ti); c.drawImage(o.icerik.tuval, 0, 0, G, Y); if (o.ust) guvenli(function () { o.ust(c, ti); }); };
    var kare = function (t) {
      c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      var ti = t - GI;
      if (o.giris && ti < 0) {
        var a = araTuval(); guvenli(function () { o.giris.ciz(a.getContext('2d'), t); });
        if (ti >= -GC) { icerik(0); c.globalAlpha = sinir(-ti / GC, 0, 1); }
        c.drawImage(a, 0, 0); c.globalAlpha = 1; return;
      }
      if (!o.kapanis || ti < IS) { icerik(Math.min(Math.max(0, ti), IS)); return; }
      var to = ti - IS, b = araTuval();
      icerik(IS); guvenli(function () { o.kapanis.ciz(b.getContext('2d'), to); });
      c.globalAlpha = sinir(to / GC, 0, 1); c.drawImage(b, 0, 0); c.globalAlpha = 1;
    };
    return { tuval: tuval, kare: kare, toplam: GI + IS + GO, ofset: GI, icerikSaati: function (t) { return sinir(t - GI, 0, IS); } };
  };

  /* ---------------- ses: girişte hafif akor, “vuuş” ve çan; kapanışta yumuşak çan ---------------- */
  function gurultu(n, tohum) { var v = new Float32Array(n), x = tohum || 12345; for (var i = 0; i < n; i++) { x = (x * 1103515245 + 12345) & 0x7fffffff; v[i] = x / 0x3fffffff - 1; } return v; }
  function supur(v, oran, bas, sure, f0, f1, guc, tohum) { // bant geçiren süzgeçle frekansı kayan gürültü
    var n = Math.round(sure * oran), b0 = Math.round(bas * oran), g = gurultu(n, tohum), x1 = 0, x2 = 0, y1 = 0, y2 = 0, a0, a1, a2, c0, c2, Q = 1.6;
    for (var i = 0; i < n; i++) {
      if (i % 32 === 0) { var u = i / n, f = f0 * Math.pow(f1 / f0, u), w0 = 2 * Math.PI * f / oran, al = Math.sin(w0) / (2 * Q); a0 = 1 + al; a1 = -2 * Math.cos(w0); a2 = 1 - al; c0 = al; c2 = -al; }
      var x = g[i], y = (c0 * x + c2 * x2 - a1 * y1 - a2 * y2) / a0; x2 = x1; x1 = x; y2 = y1; y1 = y;
      var u2 = i / n, zarf = Math.sin(Math.PI * Math.pow(u2, 0.7)); zarf *= zarf;
      if (b0 + i < v.length) v[b0 + i] += y * guc * zarf;
    }
  }
  function can(v, oran, bas, f, guc, sonum) { // çan sesi: temel ve üst kısmiler, üstel sönüm
    var b0 = Math.round(bas * oran), n = Math.round(2.4 * oran);
    for (var i = 0; i < n && b0 + i < v.length; i++) {
      var t = i / oran, z = Math.exp(-t * (sonum || 3.2)) * Math.min(1, t / 0.004);
      v[b0 + i] += guc * z * (Math.sin(2 * Math.PI * f * t) + 0.42 * Math.sin(2 * Math.PI * f * 2.01 * t) * Math.exp(-t * 2) + 0.18 * Math.sin(2 * Math.PI * f * 3.03 * t) * Math.exp(-t * 4));
    }
  }
  function akor(v, oran, bas, sure, notalar, guc) {
    var b0 = Math.round(bas * oran), n = Math.round(sure * oran);
    for (var i = 0; i < n && b0 + i < v.length; i++) {
      var t = i / oran, z = Math.min(1, t / 1.1) * Math.min(1, (sure - t) / 1.0), s = 0;
      for (var k = 0; k < notalar.length; k++) s += Math.sin(2 * Math.PI * notalar[k] * t + k * 1.3) * (1 + 0.15 * Math.sin(t * 2.1 + k));
      v[b0 + i] += s * guc * z / notalar.length;
    }
  }
  function olcekle(v, tepe) { var m = 0; for (var i = 0; i < v.length; i++) m = Math.max(m, Math.abs(v[i])); if (m > 0) { var k = tepe / m; for (i = 0; i < v.length; i++) v[i] *= k; } return v; }
  S.girisSesi = function (oran) {
    var v = new Float32Array(Math.round(S.GIRIS_SURE * oran));
    akor(v, oran, 0, S.GIRIS_SURE, [130.81, 196.0, 261.63, 329.63], 0.16);
    supur(v, oran, 0.02, 0.8, 300, 4200, 0.9, 777);
    can(v, oran, 0.85, 659.25, 0.34); can(v, oran, 1.0, 783.99, 0.3); can(v, oran, 1.16, 1046.5, 0.32, 2.6);
    can(v, oran, 2.32, 1318.5, 0.12, 4);
    supur(v, oran, S.GIRIS_SURE - 0.75, 0.75, 3600, 380, 0.55, 991);
    return olcekle(v, 0.42);
  };
  S.kapanisSesi = function (oran) {
    var v = new Float32Array(Math.round(S.KAPANIS_SURE * oran));
    akor(v, oran, 0, S.KAPANIS_SURE, [174.61, 220.0, 261.63, 349.23], 0.14);
    can(v, oran, 0.5, 1046.5, 0.28, 2.4); can(v, oran, 0.66, 783.99, 0.24, 2.4); can(v, oran, 0.82, 659.25, 0.24, 2.2);
    return olcekle(v, 0.34);
  };

  /* ---------------- önizleme: giriş, sesiyle birlikte bir kutuda oynar ---------------- */
  S.onizle = function (kutu, o) {
    if (S.onizlemeDur) S.onizlemeDur();
    var tv = document.createElement('canvas'); tv.width = o.G; tv.height = o.Y;
    tv.style.cssText = 'display:block;width:100%;height:auto;max-height:58vh;object-fit:contain;background:#14110F';
    kutu.innerHTML = ''; kutu.appendChild(tv); kutu.hidden = false;
    var g = S.giris(o), c = tv.getContext('2d'), t0 = performance.now(), raf = 0, ac = null, dur = false;
    try { var AC = window.AudioContext || window.webkitAudioContext; ac = new AC(); var v = S.girisSesi(ac.sampleRate), b = ac.createBuffer(1, v.length, ac.sampleRate); b.getChannelData(0).set(v); var s = ac.createBufferSource(); s.buffer = b; s.connect(ac.destination); s.start(); } catch (e) { ac = null; }
    var adim = function () {
      if (dur) return;
      var t = (performance.now() - t0) / 1000;
      g.ciz(c, Math.min(t, g.sure - 0.01));
      if (t < g.sure + 0.4) raf = requestAnimationFrame(adim); else S.onizlemeDur();
    };
    S.onizlemeDur = function () { dur = true; cancelAnimationFrame(raf); if (ac && ac.close) { try { ac.close(); } catch (e) {} } S.onizlemeDur = null; };
    adim();
  };
})();
