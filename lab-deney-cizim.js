/* Sanal Laboratuvar · Deney masası çizim kitaplığı (lab-deney-cizim.js)
   Laboratuvar malzemelerini SVG olarak çizer. Her malzeme kendi yerel koordinatında,
   (0,0) noktası masaya değen alt orta noktada olacak biçimde çizilir; y yukarı doğru eksidir.
   Kod ES5 ile yazıldı (eski tarayıcılarda da çalışsın diye). */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var P = {};

  /* ================= TEMEL ================= */
  function el(tag, at, ana) {
    var e = document.createElementNS(NS, tag);
    if (at) for (var k in at) if (at.hasOwnProperty(k) && at[k] !== undefined && at[k] !== null) e.setAttribute(k, at[k]);
    if (ana) ana.appendChild(e);
    return e;
  }
  function g(ana, at) { return el('g', at, ana); }
  function yazi(ana, x, y, metin, at) {
    var t = el('text', { x: x, y: y }, ana);
    if (at) for (var k in at) if (at.hasOwnProperty(k) && at[k] !== null && at[k] !== undefined) t.setAttribute(k, at[k]);
    t.textContent = metin;
    return t;
  }
  function yol(ana, d, at) { var a = at || {}; a.d = d; return el('path', a, ana); }
  function yuvarla(x) { return Math.round(x * 10) / 10; }
  P.NS = NS; P.el = el; P.g = g; P.yazi = yazi; P.yol = yol;

  /* Tek seferlik ortak gradyanlar: görünür kalan (display:none olmayan) gizli bir SVG içinde */
  P.tanimlar = function () {
    if (document.getElementById('dm-tanim')) return;
    var s = el('svg', { id: 'dm-tanim', width: 0, height: 0, 'aria-hidden': 'true', focusable: 'false' });
    s.style.position = 'absolute'; s.style.width = '0'; s.style.height = '0'; s.style.overflow = 'hidden'; s.style.left = '-9999px';
    var d = el('defs', null, s);
    function lin(id, x2, y2, duraklar) {
      var l = el('linearGradient', { id: id, x1: 0, y1: 0, x2: x2, y2: y2 }, d);
      duraklar.forEach(function (st) { el('stop', { offset: st[0], 'stop-color': st[1], 'stop-opacity': st[2] === undefined ? 1 : st[2] }, l); });
      return l;
    }
    function rad(id, duraklar) {
      var r = el('radialGradient', { id: id, cx: '50%', cy: '50%', r: '50%' }, d);
      duraklar.forEach(function (st) { el('stop', { offset: st[0], 'stop-color': st[1], 'stop-opacity': st[2] === undefined ? 1 : st[2] }, r); });
    }
    lin('dm-g-cam', 1, 0, [[0, '#FFFFFF', 0.62], [0.42, '#E4F1F8', 0.22], [1, '#C9DFEC', 0.42]]);
    lin('dm-g-metal', 1, 0, [[0, '#8C959D'], [0.45, '#E8ECEF'], [1, '#9AA3AB']]);
    lin('dm-g-metaly', 0, 1, [[0, '#E8ECEF'], [0.55, '#AEB6BD'], [1, '#868F97']]);
    lin('dm-g-koyu', 1, 0, [[0, '#33383D'], [0.5, '#5A6168'], [1, '#2C3136']]);
    lin('dm-g-duvar', 0, 1, [[0, '#FBF7F2'], [1, '#F0E7DD']]);
    lin('dm-g-masa', 0, 1, [[0, '#EED8B4'], [1, '#DDBD8F']]);
    lin('dm-g-masaon', 0, 1, [[0, '#C99F6E'], [1, '#B48857']]);
    lin('dm-g-plastik', 1, 0, [[0, '#E3DDD6'], [0.5, '#FBF9F6'], [1, '#D8D1C9']]);
    lin('dm-g-parla', 1, 0, [[0, '#FFFFFF', 0.38], [0.3, '#FFFFFF', 0], [0.85, '#FFFFFF', 0.06], [1, '#FFFFFF', 0.2]]);
    lin('dm-g-alevd', 0, 1, [[0, '#BFD8FF', 0], [0.35, '#9CC2FF', 0.55], [1, '#5B8DFF', 0.9]]);
    lin('dm-g-alevi', 0, 1, [[0, '#7FB0FF', 0.2], [1, '#1F5BFF', 0.95]]);
    lin('dm-g-buz', 1, 1, [[0, '#FFFFFF', 0.95], [1, '#CDEBFA', 0.85]]);
    lin('dm-g-kopuk', 1, 0, [[0, '#ECE8E1'], [0.5, '#FFFFFF'], [1, '#E4DFD7']]);
    lin('dm-g-ahsap', 0, 1, [[0, '#D9B98C'], [1, '#B98E5E']]);
    rad('dm-g-isik', [[0, '#FF6B2C', 0.9], [0.6, '#FF8A3D', 0.35], [1, '#FF8A3D', 0]]);
    rad('dm-g-kor', [[0, '#FFD3A8', 0.9], [1, '#FFB37A', 0]]);
    (document.body || document.documentElement).appendChild(s);
  };

  /* ================= SAHNE ARKA PLANI ================= */
  P.arka = function (ana, W, H, masaY) {
    el('rect', { x: 0, y: 0, width: W, height: masaY, fill: 'url(#dm-g-duvar)' }, ana);
    /* duvarda hafif fayans çizgileri */
    var f = g(ana, { stroke: '#EDE2D6', 'stroke-width': 1 });
    for (var x = 0; x <= W; x += 125) el('line', { x1: x, y1: 0, x2: x, y2: masaY }, f);
    for (var y = 95; y < masaY; y += 95) el('line', { x1: 0, y1: y, x2: W, y2: y }, f);
    el('rect', { x: 0, y: masaY, width: W, height: H - masaY, fill: 'url(#dm-g-masa)' }, ana);
    el('rect', { x: 0, y: masaY, width: W, height: 3, fill: '#F7E9D2' }, ana);
    var a = g(ana, { stroke: '#D3B07F', 'stroke-width': 1, opacity: 0.55, fill: 'none' });
    for (var i = 0; i < 5; i++) {
      var yy = masaY + 16 + i * 17;
      yol(a, 'M0 ' + yy + ' C ' + (W * 0.3) + ' ' + (yy - 5) + ' ' + (W * 0.6) + ' ' + (yy + 6) + ' ' + W + ' ' + (yy - 2));
    }
  };
  P.golge = function (ana, w, h) { return el('ellipse', { cx: 0, cy: 1, rx: w / 2, ry: h || 5, fill: '#5A4630', opacity: 0.16 }, ana); };

  /* ================= KAPLAR (dönel profil) =================
     profil: [[y, r], ...] alttan (y=0) yukarı (y<0) iç yarıçap. Hacim tablosu profilden hesaplanır. */
  function rAt(pr, y) {
    /* y: negatif yükseklik */
    for (var i = 1; i < pr.length; i++) {
      var a = pr[i - 1], b = pr[i];
      if (y <= a[0] && y >= b[0]) { var k = (a[0] - y) / ((a[0] - b[0]) || 1); return a[1] + (b[1] - a[1]) * k; }
    }
    return pr[pr.length - 1][1];
  }
  P.kap = function (ana, o) {
    var pr = o.profil, H = -pr[pr.length - 1][0], t = o.kalinlik || 2.4, gr = g(ana);
    var N = 160, hs = [0], vs = [0], v = 0;
    for (var i = 1; i <= N; i++) { var y = -H * i / N, r = Math.max(0, rAt(pr, y) - t * 0.6); v += Math.PI * r * r * (H / N); hs.push(H * i / N); vs.push(v); }
    var olcekY = o.kapasiteY !== undefined ? o.kapasiteY : H * 0.9, vRef = 0;
    for (i = 1; i < hs.length; i++) if (hs[i] >= olcekY) { vRef = vs[i]; break; }
    var f = (o.kapasite || 100) / (vRef || 1);
    function hacimdenY(ml) {
      var vp = ml / f;
      if (vp <= 0) return 0;
      for (var j = 1; j < vs.length; j++) if (vs[j] >= vp) { var k = (vp - vs[j - 1]) / ((vs[j] - vs[j - 1]) || 1); return hs[j - 1] + (hs[j] - hs[j - 1]) * k; }
      return H;
    }
    function yHacim(hgt) { for (var j = 1; j < hs.length; j++) if (hs[j] >= hgt) return vs[j] * f; return vs[vs.length - 1] * f; }
    /* sıvı */
    var sivi = yol(gr, '', { fill: o.renk || '#9FD3F2', opacity: o.opak === undefined ? 0.78 : o.opak });
    var siviUst = el('line', { stroke: '#FFFFFF', 'stroke-width': 1.6, opacity: 0.75 }, gr);
    var parla = yol(gr, '', { fill: 'url(#dm-g-parla)' });
    var icG = g(gr); /* kabarcık, kristal vb. için */
    /* cam gövde: dolgu sıvının arkasında, çizgi önünde */
    var top = pr[pr.length - 1];
    var d = 'M' + yuvarla(-(top[1])) + ' ' + top[0];
    for (i = pr.length - 1; i >= 0; i--) d += ' L' + yuvarla(-pr[i][1]) + ' ' + pr[i][0];
    for (i = 0; i < pr.length; i++) d += ' L' + yuvarla(pr[i][1]) + ' ' + pr[i][0];
    var dolgu = yol(gr, d, { fill: o.camRenk || 'url(#dm-g-cam)' });
    gr.insertBefore(dolgu, sivi);
    yol(gr, d, { fill: 'none', stroke: o.cizgi || '#7F97A8', 'stroke-width': t, 'stroke-linejoin': 'round' });
    /* ağız kenarı */
    if (o.agiz !== false) {
      var rw = top[1] + t + 1.5;
      if (o.gaga) yol(gr, 'M' + (-rw) + ' ' + top[0] + ' q -6 -1 -8 -6 M' + rw + ' ' + top[0] + ' l 3 0', { stroke: o.cizgi || '#7F97A8', 'stroke-width': t, fill: 'none', 'stroke-linecap': 'round' });
      else el('line', { x1: -rw, y1: top[0], x2: rw, y2: top[0], stroke: o.cizgi || '#7F97A8', 'stroke-width': t + 0.6, 'stroke-linecap': 'round' }, gr);
    }
    /* parlama çizgisi */
    var pl = '';
    for (i = 1; i < pr.length - 1; i++) { var pp = pr[i]; if (-pp[0] > H * 0.12 && -pp[0] < H * 0.86) pl += (pl ? ' L' : 'M') + yuvarla(-pp[1] + t + 4) + ' ' + pp[0]; }
    if (pl) yol(gr, pl, { stroke: '#FFFFFF', 'stroke-width': 3, opacity: 0.7, fill: 'none', 'stroke-linecap': 'round' });
    /* ölçek çizgileri */
    if (o.cizgiler) {
      var cz = g(gr, { stroke: o.cizgiRenk || '#6E8597', 'stroke-width': 1.3 });
      o.cizgiler.forEach(function (c) {
        var yy = -hacimdenY(c.ml), rr = rAt(pr, yy);
        var x0 = o.cizgiSol ? -rr + 3 : rr * 0.18, uz = c.uzun ? rr * 0.42 : rr * 0.24;
        el('line', { x1: x0, y1: yy, x2: x0 + uz, y2: yy }, cz);
        if (c.etiket) yazi(gr, x0 + uz + 3, yy + 4, c.etiket, { 'font-size': o.etiketBoy || 10, fill: '#5E7385', 'font-weight': 600 });
      });
    }
    var ref = {
      g: gr, ic: icG, H: H, profil: pr, kalinlik: t, f: f, hacimdenY: hacimdenY, yHacim: yHacim, rAt: function (y) { return rAt(pr, y); },
      ml: 0, renk: o.renk || '#9FD3F2',
      ayar: function (ml, renk, opak) {
        if (renk) { ref.renk = renk; sivi.setAttribute('fill', renk); }
        if (opak !== undefined) sivi.setAttribute('opacity', opak);
        ref.ml = ml;
        var h = Math.min(hacimdenY(ml), H - 1);
        if (h <= 0.4) { sivi.setAttribute('d', ''); parla.setAttribute('d', ''); siviUst.setAttribute('x1', 0); siviUst.setAttribute('x2', 0); return; }
        var L = [], R = [], j;
        L.push([-(Math.max(0, rAt(pr, 0) - 0.4)), -0.5]);
        for (j = 1; j < pr.length; j++) { if (-pr[j][0] >= h) break; L.push([-(pr[j][1] - 0.4), pr[j][0]]); }
        var rt = rAt(pr, -h) - 0.4;
        L.push([-rt, -h]);
        for (j = L.length - 1; j >= 0; j--) R.push([-L[j][0], L[j][1]]);
        var dd = 'M' + L.map(function (p) { return yuvarla(p[0]) + ' ' + yuvarla(p[1]); }).join(' L') + ' L' + R.map(function (p) { return yuvarla(p[0]) + ' ' + yuvarla(p[1]); }).join(' L') + ' Z';
        sivi.setAttribute('d', dd); parla.setAttribute('d', dd);
        siviUst.setAttribute('x1', yuvarla(-rt + 1)); siviUst.setAttribute('x2', yuvarla(rt - 1)); siviUst.setAttribute('y1', yuvarla(-h + 0.8)); siviUst.setAttribute('y2', yuvarla(-h + 0.8));
        ref.yuzey = -h; ref.yuzeyR = rt;
      },
      siviEl: sivi
    };
    ref.ayar(o.hacim || 0);
    return ref;
  };

  /* Hazır profiller */
  P.profilBeher = function (w, h) { var r = w / 2; return [[0, r - 3], [-3, r], [-h, r]]; };
  P.profilErlen = function (w, h, boyunR, boyunH) { var r = w / 2; return [[0, r - 4], [-4, r], [-(h - boyunH) * 0.12, r], [-(h - boyunH), boyunR], [-h, boyunR]]; };
  P.profilTup = function (r, h) { var p = [[0, 0.1]]; for (var a = 1; a <= 6; a++) { var th = a / 6 * Math.PI / 2; p.push([-(r - r * Math.cos(th)), r * Math.sin(th)]); } p.push([-h, r]); return p; };
  P.profilSilindir = function (r, h) { return [[0, r], [-h, r]]; };
  P.profilBalonJoje = function (rb, rn, h) {
    var p = [[0, rb * 0.62], [-rb * 0.12, rb * 0.86]];
    for (var a = 1; a <= 7; a++) { var th = -Math.PI / 2 + a / 8 * Math.PI; p.push([-(rb + rb * Math.sin(th)) * 0.98, rb * Math.cos(th) * 1.0 + 0.01]); }
    p.push([-(rb * 2) - 4, rn]); p.push([-h, rn]);
    var q = [], son = 1;
    p.forEach(function (x) { if (x[0] < son || !q.length) { q.push(x); son = x[0]; } });
    return q.map(function (x) { return [x[0], Math.max(x[1], rn)]; });
  };

  /* ================= KABARCIK / BUHAR / ALEV ================= */
  P.kabarcik = function (kap) {
    var L = [], gg = g(kap.ic);
    return {
      guncelle: function (dt, oran, boy) {
        if (oran > 0 && kap.ml > 0) {
          var n = oran * dt * 60;
          while (n > 0) {
            if (Math.random() < n) {
              var y0 = -2 - Math.random() * 6, rr = kap.rAt(y0) - 6, x0 = (Math.random() * 2 - 1) * Math.max(4, rr * 0.8);
              var c = el('circle', { cx: x0, cy: y0, r: (boy || 2.2) * (0.6 + Math.random() * 0.8), fill: '#FFFFFF', opacity: 0.85, stroke: '#9AC6E0', 'stroke-width': 0.6 }, gg);
              L.push({ e: c, x: x0, y: y0, v: 28 + Math.random() * 40, s: Math.random() * 6 });
            }
            n -= 1;
          }
        }
        for (var i = L.length - 1; i >= 0; i--) {
          var b = L[i]; b.y -= b.v * dt; b.s += dt * 9;
          var yz = kap.yuzey === undefined ? -kap.H : kap.yuzey;
          if (b.y <= yz + 2) { gg.removeChild(b.e); L.splice(i, 1); continue; }
          b.e.setAttribute('cy', yuvarla(b.y)); b.e.setAttribute('cx', yuvarla(b.x + Math.sin(b.s) * 1.2));
        }
      },
      temizle: function () { L.forEach(function (b) { if (b.e.parentNode) gg.removeChild(b.e); }); L = []; }
    };
  };
  P.buhar = function (ana, x, y, gen) {
    var L = [], gg = g(ana, { fill: '#FFFFFF' });
    return {
      guncelle: function (dt, oran) {
        if (oran > 0 && Math.random() < oran * dt * 6) {
          var e = el('ellipse', { cx: x, cy: y, rx: 7, ry: 5, opacity: 0.0 }, gg);
          L.push({ e: e, x: x + (Math.random() * 2 - 1) * gen * 0.4, y: y, t: 0, s: 0.8 + Math.random() * 0.6 });
        }
        for (var i = L.length - 1; i >= 0; i--) {
          var b = L[i]; b.t += dt; b.y -= 26 * dt; b.x += Math.sin(b.t * 2 + b.s) * 6 * dt;
          var k = b.t / 2.6;
          if (k >= 1) { gg.removeChild(b.e); L.splice(i, 1); continue; }
          b.e.setAttribute('cx', yuvarla(b.x)); b.e.setAttribute('cy', yuvarla(b.y));
          b.e.setAttribute('rx', yuvarla(7 + k * 18 * b.s)); b.e.setAttribute('ry', yuvarla(5 + k * 10 * b.s));
          b.e.setAttribute('opacity', (Math.sin(Math.PI * Math.min(1, k * 1.3)) * 0.55).toFixed(2));
        }
      }
    };
  };
  P.alev = function (ana, x, y, boy) {
    var gg = g(ana, { transform: 'translate(' + x + ',' + y + ')' }), b = boy || 1;
    var dis = yol(gg, 'M0 0 C -11 -8 -10 -26 0 -52 C 10 -26 11 -8 0 0 Z', { fill: 'url(#dm-g-alevd)' });
    var ic = yol(gg, 'M0 0 C -6 -5 -5 -15 0 -26 C 5 -15 6 -5 0 0 Z', { fill: 'url(#dm-g-alevi)' });
    gg.style.display = 'none';
    var t = 0;
    return {
      g: gg,
      guncelle: function (dt, acik, olc) {
        gg.style.display = acik ? '' : 'none';
        if (!acik) return;
        t += dt;
        var s = (olc || 1) * b * (1 + Math.sin(t * 23) * 0.04 + Math.sin(t * 37) * 0.03);
        gg.setAttribute('transform', 'translate(' + x + ',' + y + ') scale(' + (b * (1 + Math.sin(t * 29) * 0.03)).toFixed(3) + ',' + s.toFixed(3) + ')');
      }
    };
  };

  /* ================= MALZEMELER ================= */
  /* Bunsen beki + gaz hortumu + musluk. Beki üst ucu y=-108 */
  P.bek = function (ana, o) {
    o = o || {};
    var gr = g(ana);
    P.golge(gr, 70, 5);
    yol(gr, 'M-34 0 L34 0 L28 -10 L-28 -10 Z', { fill: 'url(#dm-g-koyu)' });
    el('rect', { x: -9, y: -108, width: 18, height: 100, rx: 3, fill: 'url(#dm-g-metal)', stroke: '#6F7880', 'stroke-width': 1 }, gr);
    el('rect', { x: -11, y: -40, width: 22, height: 12, rx: 3, fill: 'url(#dm-g-metal)', stroke: '#6F7880', 'stroke-width': 1 }, gr);
    el('rect', { x: -4, y: -36, width: 8, height: 5, rx: 1, fill: '#3B4248' }, gr);
    var hx = o.hortumX === undefined ? -150 : o.hortumX;
    yol(gr, 'M-12 -18 C -50 -18 -60 -6 ' + (hx * 0.55) + ' -6 S ' + (hx + 20) + ' -14 ' + (hx + 10) + ' -40', { stroke: '#D9693B', 'stroke-width': 7, fill: 'none', 'stroke-linecap': 'round' });
    /* gaz musluğu (duvarda/masada) */
    var m = g(gr, { transform: 'translate(' + (hx + 10) + ',-40)' });
    el('rect', { x: -9, y: -34, width: 18, height: 34, rx: 3, fill: 'url(#dm-g-metal)', stroke: '#6F7880' }, m);
    var kol = el('rect', { x: -3, y: -50, width: 6, height: 22, rx: 3, fill: '#F2B705', stroke: '#B58600' }, m);
    yazi(m, 0, 16, 'GAZ', { 'font-size': 10, 'text-anchor': 'middle', fill: '#8A6A00' });
    var alev = P.alev(gr, 0, -108, 1.15);
    return {
      g: gr, alev: alev,
      musluk: function (acik) { kol.setAttribute('transform', acik ? 'rotate(90 0 -39)' : ''); }
    };
  };

  /* Sacayağı + tel kafes. Üst yüzey y=-h */
  P.sacayagi = function (ana, o) {
    o = o || {};
    var h = o.h || 150, w = o.w || 150, gr = g(ana);
    P.golge(gr, w + 20, 4);
    var ayak = { stroke: '#4A5056', 'stroke-width': 6, 'stroke-linecap': 'round', fill: 'none' };
    yol(gr, 'M' + (-w / 2 + 8) + ' ' + (-h + 6) + ' L' + (-w / 2 - 6) + ' 0', ayak);
    yol(gr, 'M' + (w / 2 - 8) + ' ' + (-h + 6) + ' L' + (w / 2 + 6) + ' 0', ayak);
    yol(gr, 'M0 ' + (-h + 6) + ' L0 -2', { stroke: '#5E656B', 'stroke-width': 5, 'stroke-linecap': 'round', opacity: 0.55 });
    el('rect', { x: -w / 2, y: -h + 2, width: w, height: 7, rx: 3, fill: '#4A5056' }, gr);
    /* tel kafes */
    var tk = g(gr);
    el('rect', { x: -w / 2 - 12, y: -h - 3, width: w + 24, height: 5, rx: 1.5, fill: '#9AA2A9', stroke: '#6F777E', 'stroke-width': 0.8 }, tk);
    el('rect', { x: -w / 4, y: -h - 3, width: w / 2, height: 5, fill: '#E9E2D6', stroke: '#C9C0B2', 'stroke-width': 0.8 }, tk);
    return { g: gr, ust: -h - 3, kor: el('ellipse', { cx: 0, cy: -h + 2, rx: w / 4, ry: 5, fill: 'url(#dm-g-kor)', opacity: 0 }, gr) };
  };

  /* Isıtıcı (ocak). Üst yüzey y=-h */
  P.isitici = function (ana, o) {
    o = o || {};
    var w = o.w || 170, h = o.h || 46, gr = g(ana);
    P.golge(gr, w + 10, 5);
    el('rect', { x: -w / 2, y: -h, width: w, height: h, rx: 10, fill: 'url(#dm-g-plastik)', stroke: '#B9B0A6', 'stroke-width': 1.2 }, gr);
    el('rect', { x: -w / 2 + 8, y: -h - 6, width: w - 16, height: 8, rx: 3, fill: '#5B6167' }, gr);
    var halka = el('ellipse', { cx: 0, cy: -h - 2, rx: w * 0.36, ry: 3, fill: '#5B6167' }, gr);
    var isik = el('ellipse', { cx: 0, cy: -h - 4, rx: w * 0.42, ry: 9, fill: 'url(#dm-g-isik)', opacity: 0 }, gr);
    var dug = el('circle', { cx: w / 2 - 22, cy: -h / 2, r: 9, fill: '#3E444A', stroke: '#22272B' }, gr);
    var ok = el('line', { x1: w / 2 - 22, y1: -h / 2, x2: w / 2 - 22, y2: -h / 2 - 7, stroke: '#fff', 'stroke-width': 2, 'stroke-linecap': 'round' }, gr);
    var led = el('circle', { cx: -w / 2 + 20, cy: -h / 2, r: 4.5, fill: '#5E2A1A' }, gr);
    yazi(gr, -w / 2 + 30, -h / 2 + 4, 'ISITICI', { 'font-size': 10, fill: '#7A726B' });
    return {
      g: gr, ust: -h - 6,
      ayar: function (guc) {
        guc = Math.max(0, Math.min(1, guc || 0));
        isik.setAttribute('opacity', (guc * 0.9).toFixed(2));
        halka.setAttribute('fill', guc > 0 ? '#C2471C' : '#5B6167');
        led.setAttribute('fill', guc > 0 ? '#FF4D1F' : '#5E2A1A');
        ok.setAttribute('transform', 'rotate(' + (guc * 240 - 120) + ' ' + (w / 2 - 22) + ' ' + (-h / 2) + ')');
      }
    };
  };

  /* Dijital ekran: (x,y) sol üst köşe */
  P.ekran = function (ana, x, y, w, h, o) {
    o = o || {};
    var gr = g(ana);
    el('rect', { x: x, y: y, width: w, height: h, rx: 6, fill: '#1F2428', stroke: '#0F1316', 'stroke-width': 1.2 }, gr);
    var t = yazi(gr, x + w - 8, y + h * 0.7, o.metin || '', { 'font-size': o.boy || Math.round(h * 0.56), 'text-anchor': 'end', fill: o.renk || '#9FF2C8' });
    var b = o.birim ? yazi(gr, x + 7, y + h * 0.42, o.birim, { 'font-size': Math.round(h * 0.26), fill: '#7FBFA2', 'font-weight': 600 }) : null;
    return { g: gr, yaz: function (m) { if (t.textContent !== m) t.textContent = m; }, metin: t };
  };

  /* Destek çubuğu (statif): taban + dik çubuk. Taban sağa doğru uzanır. */
  P.statif = function (ana, o) {
    o = o || {};
    var h = o.h || 300, gr = g(ana), tw = o.taban || 120;
    P.golge(gr, tw + 10, 5);
    el('rect', { x: -22, y: -12, width: tw, height: 12, rx: 4, fill: 'url(#dm-g-koyu)' }, gr);
    el('rect', { x: -4, y: -h, width: 8, height: h - 10, rx: 3, fill: 'url(#dm-g-metal)', stroke: '#79828A', 'stroke-width': 0.8 }, gr);
    return { g: gr };
  };
  /* Kıskaç: çubuktaki bağlantı (x0,y) noktasından x1'e uzanan kol */
  P.kiskac = function (ana, x0, y, x1, o) {
    o = o || {};
    var gr = g(ana), s = x1 < x0 ? -1 : 1;
    el('rect', { x: x0 - 9, y: y - 9, width: 18, height: 18, rx: 3, fill: '#3E444A' }, gr);
    el('circle', { cx: x0 + s * 12, cy: y, r: 4, fill: '#9AA2A9', stroke: '#5B6167' }, gr);
    el('rect', { x: Math.min(x0, x1), y: y - 3.5, width: Math.abs(x1 - x0), height: 7, rx: 3, fill: 'url(#dm-g-metaly)', stroke: '#79828A', 'stroke-width': 0.6 }, gr);
    if (o.cene !== false) {
      var cw = o.ceneW || 22;
      yol(gr, 'M' + (x1 - s * 2) + ' ' + (y - cw / 2) + ' q ' + (s * 10) + ' 0 ' + (s * 10) + ' ' + (cw / 2) + ' q 0 ' + (cw / 2) + ' ' + (-s * 10) + ' ' + (cw / 2), { fill: 'none', stroke: '#C2471C', 'stroke-width': 5, 'stroke-linecap': 'round' });
    }
    return gr;
  };

  /* Dijital termometre: statif + kıskaç + prob. Prob ucu (probX, probY) — yerel koordinatta */
  P.termometre = function (ana, o) {
    var gr = g(ana), probX = o.probX, probUst = o.kolY || -250, probY = o.probY;
    P.statif(gr, { h: -probUst + 40, taban: 130 });
    P.kiskac(gr, 0, probUst, probX + 6, { ceneW: 16 });
    el('rect', { x: probX - 3, y: probUst - 34, width: 6, height: probY - probUst + 34, rx: 3, fill: 'url(#dm-g-metal)', stroke: '#6F7880', 'stroke-width': 0.8 }, gr);
    el('rect', { x: probX - 5, y: probUst - 46, width: 10, height: 16, rx: 3, fill: '#2C3136' }, gr);
    yol(gr, 'M' + probX + ' ' + (probUst - 46) + ' C ' + probX + ' ' + (probUst - 78) + ' -14 ' + (probUst - 78) + ' -12 ' + (probUst - 30) + ' L -12 -112 Q -12 -98 30 -92', { stroke: '#2C3136', 'stroke-width': 3, fill: 'none', 'stroke-linejoin': 'round' });
    var kutu = g(gr, { transform: 'translate(30,-64)' });
    el('rect', { x: 0, y: -40, width: 96, height: 56, rx: 9, fill: '#F2EEE9', stroke: '#B9B0A6', 'stroke-width': 1.2 }, kutu);
    var ek = P.ekran(kutu, 7, -33, 82, 32, { birim: '°C', boy: 19 });
    yazi(kutu, 48, 10, 'TERMOMETRE', { 'font-size': 8.5, 'text-anchor': 'middle', fill: '#7A726B' });
    return { g: gr, yaz: ek.yaz };
  };

  /* Şırınga. yatay: uç solda (0,0 = taban orta), dikey: uç aşağıda. maxMl ölçek, uz px */
  P.siringa = function (ana, o) {
    o = o || {};
    var gr = g(ana), uz = o.uz || 260, r = o.r || 18, max = o.max || 60, dikey = !!o.dikey;
    var ic = g(gr, dikey ? { transform: 'rotate(-90)' } : null);
    /* gövde x: 0..uz (uç x<0) */
    var gaz = el('rect', { x: 0, y: -r + 2, width: 10, height: 2 * r - 4, fill: o.gazRenk || '#E8F4FB', opacity: 0.9 }, ic);
    el('rect', { x: 0, y: -r, width: uz, height: 2 * r, rx: 4, fill: 'url(#dm-g-cam)', stroke: '#7F97A8', 'stroke-width': 2.2 }, ic);
    yol(ic, 'M0 ' + (-r) + ' L-14 -5 L-26 -5 L-26 5 L-14 5 L0 ' + r, { fill: 'url(#dm-g-cam)', stroke: '#7F97A8', 'stroke-width': 2.2, 'stroke-linejoin': 'round' });
    el('rect', { x: uz - 2, y: -r - 10, width: 6, height: 2 * r + 20, rx: 2, fill: '#C9D6DE', stroke: '#7F97A8' }, ic);
    var olc = g(ic, { stroke: '#56708A', 'stroke-width': 1.1 });
    var adim = o.adim || 10, kucuk = o.kucuk || 2;
    for (var v = 0; v <= max + 1e-9; v += kucuk) {
      var x = 6 + v / max * (uz - 20), uzun = Math.abs(v / adim - Math.round(v / adim)) < 1e-6;
      el('line', { x1: x, y1: -r, x2: x, y2: -r + (uzun ? 11 : 6) }, olc);
      if (uzun) yazi(ic, x, dikey ? -r + 19 : -r + 22, String(v), { 'font-size': 10.5, 'text-anchor': dikey ? 'start' : 'middle', fill: '#45607A', 'font-weight': 700, transform: dikey ? 'rotate(90 ' + x + ' ' + (-r + 15) + ')' : null });
    }
    if (o.birim !== false) yazi(ic, uz - 12, r - 6, 'mL', { 'font-size': 10, 'text-anchor': 'end', fill: '#45607A', transform: dikey ? 'rotate(90 ' + (uz - 16) + ' ' + (r - 8) + ')' : null });
    var piston = g(ic);
    el('rect', { x: -4, y: -r + 2.5, width: 9, height: 2 * r - 5, rx: 2, fill: '#2E3338' }, piston);
    el('rect', { x: 5, y: -4, width: uz + 30, height: 8, rx: 2, fill: 'url(#dm-g-plastik)', stroke: '#A39A90', 'stroke-width': 1 }, piston);
    el('rect', { x: uz + 32, y: -r + 2, width: 9, height: 2 * r - 4, rx: 3, fill: 'url(#dm-g-plastik)', stroke: '#A39A90', 'stroke-width': 1 }, piston);
    var tut = el('rect', { x: uz + 24, y: -r - 4, width: 26, height: 2 * r + 8, fill: 'transparent' }, piston);
    var ref = {
      g: gr, ic: ic, piston: piston, tutamak: tut, uz: uz, r: r, max: max,
      xMl: function (ml) { return 6 + ml / max * (uz - 20); },
      ayar: function (ml) {
        var x = ref.xMl(Math.max(0, Math.min(max, ml)));
        piston.setAttribute('transform', 'translate(' + yuvarla(x - 6) + ',0)');
        gaz.setAttribute('width', Math.max(0, yuvarla(x - 4)));
        ref.ml = ml;
      }
    };
    ref.ayar(o.ml || 0);
    return ref;
  };

  /* Basınç ölçer (dijital, sensörlü). Giriş borusu solda (-58,-26) */
  P.basincOlcer = function (ana, o) {
    o = o || {};
    var gr = g(ana);
    P.golge(gr, 120, 5);
    el('rect', { x: -60, y: -96, width: 120, height: 96, rx: 12, fill: 'url(#dm-g-plastik)', stroke: '#A39A90', 'stroke-width': 1.3 }, gr);
    var ek = P.ekran(gr, -50, -86, 100, 40, { birim: o.birim || 'kPa', boy: 22 });
    yazi(gr, 0, -30, o.baslik || 'BASINÇ ÖLÇER', { 'font-size': 9.5, 'text-anchor': 'middle', fill: '#7A726B' });
    el('circle', { cx: -26, cy: -14, r: 6, fill: '#F85300' }, gr);
    el('circle', { cx: 26, cy: -14, r: 6, fill: '#5B6167' }, gr);
    if (o.sag) el('rect', { x: 58, y: -32, width: 16, height: 12, rx: 3, fill: '#5B6167' }, gr); else el('rect', { x: -74, y: -32, width: 16, height: 12, rx: 3, fill: '#5B6167' }, gr);
    return { g: gr, yaz: ek.yaz, giris: o.sag ? [74, -26] : [-74, -26] };
  };

  /* Hortum (iki nokta arası kavisli) */
  P.hortum = function (ana, x1, y1, x2, y2, o) {
    o = o || {};
    var dx = (x2 - x1) * 0.5, dy = o.sarkma === undefined ? 30 : o.sarkma;
    return yol(ana, 'M' + x1 + ' ' + y1 + ' C ' + (x1 + dx) + ' ' + (y1 + dy) + ' ' + (x2 - dx) + ' ' + (y2 + dy) + ' ' + x2 + ' ' + y2, { stroke: o.renk || '#C9B9A6', 'stroke-width': o.kalin || 6, fill: 'none', 'stroke-linecap': 'round', opacity: o.opak || 0.95 });
  };

  /* Üç yollu vana: merkez (0,0), açıkken kol yatay */
  P.vana = function (ana, x, y) {
    var gr = g(ana, { transform: 'translate(' + x + ',' + y + ')' });
    el('rect', { x: -12, y: -6, width: 24, height: 12, rx: 3, fill: '#E9E4DE', stroke: '#8F877E' }, gr);
    el('circle', { cx: 0, cy: 0, r: 8, fill: '#F2EEE9', stroke: '#8F877E' }, gr);
    var kol = el('rect', { x: -3, y: -22, width: 6, height: 22, rx: 3, fill: '#1B6B4A' }, gr);
    return { g: gr, ayar: function (acik) { kol.setAttribute('transform', acik ? 'rotate(-90)' : ''); kol.setAttribute('fill', acik ? '#B42318' : '#1B6B4A'); } };
  };

  /* Terazi (0,01 g). Kefe üstü y=-h */
  P.terazi = function (ana, o) {
    o = o || {};
    var gr = g(ana);
    P.golge(gr, 170, 5);
    yol(gr, 'M-82 0 L82 0 L74 -38 L-74 -38 Z', { fill: 'url(#dm-g-plastik)', stroke: '#A39A90', 'stroke-width': 1.3, 'stroke-linejoin': 'round' });
    var ek = P.ekran(gr, -64, -34, 86, 24, { birim: 'g', boy: 16 });
    el('rect', { x: 34, y: -30, width: 30, height: 14, rx: 7, fill: '#F85300' }, gr);
    yazi(gr, 49, -20, 'DARA', { 'font-size': 7.5, 'text-anchor': 'middle', fill: '#fff' });
    el('rect', { x: -4, y: -46, width: 8, height: 8, fill: '#8C959D' }, gr);
    el('rect', { x: -62, y: -52, width: 124, height: 7, rx: 3, fill: 'url(#dm-g-metaly)', stroke: '#79828A', 'stroke-width': 0.8 }, gr);
    return { g: gr, yaz: ek.yaz, ust: -52, dara: [49, -23] };
  };

  /* Piset (yıkama şişesi). Ağız ucu (o.uc) */
  P.piset = function (ana) {
    var gr = g(ana);
    P.golge(gr, 60, 4);
    yol(gr, 'M-24 0 L24 0 Q28 0 28 -6 L28 -78 Q28 -92 14 -96 L-14 -96 Q-28 -92 -28 -78 L-28 -6 Q-28 0 -24 0 Z', { fill: '#EAF4FA', stroke: '#8FA7B8', 'stroke-width': 2 });
    yol(gr, 'M-22 -6 L22 -6 L22 -60 L-22 -60 Z', { fill: '#BFE0F3', opacity: 0.8 });
    el('rect', { x: -12, y: -108, width: 24, height: 13, rx: 3, fill: '#F85300' }, gr);
    yol(gr, 'M6 -106 Q 14 -132 40 -138 L 58 -142', { stroke: '#CDD9E0', 'stroke-width': 5, fill: 'none', 'stroke-linecap': 'round' });
    yazi(gr, 0, -30, 'SAF SU', { 'font-size': 9, 'text-anchor': 'middle', fill: '#45607A' });
    return { g: gr, uc: [58, -142] };
  };

  /* Reaktif şişesi (etiketli) */
  P.sise = function (ana, o) {
    o = o || {};
    var gr = g(ana), w = o.w || 56, h = o.h || 88;
    P.golge(gr, w + 8, 4);
    yol(gr, 'M' + (-w / 2) + ' -4 Q' + (-w / 2) + ' 0 ' + (-w / 2 + 4) + ' 0 L' + (w / 2 - 4) + ' 0 Q' + (w / 2) + ' 0 ' + (w / 2) + ' -4 L' + (w / 2) + ' ' + (-h + 22) + ' Q' + (w / 2) + ' ' + (-h + 12) + ' ' + (w / 4) + ' ' + (-h + 8) + ' L' + (-w / 4) + ' ' + (-h + 8) + ' Q' + (-w / 2) + ' ' + (-h + 12) + ' ' + (-w / 2) + ' ' + (-h + 22) + ' Z', { fill: o.cam || '#B98A52', opacity: o.cam ? 1 : 0.9, stroke: '#7A5A33', 'stroke-width': 1.2 });
    el('rect', { x: -w / 4 - 2, y: -h, width: w / 2 + 4, height: 11, rx: 2, fill: o.kapak || '#2C3136' }, gr);
    el('rect', { x: -w / 2 + 5, y: -h * 0.66, width: w - 10, height: h * 0.4, rx: 3, fill: '#FFFDF8', stroke: '#D8CFC4' }, gr);
    var sat = (o.etiket || '').split('\n');
    sat.forEach(function (s, i) { yazi(gr, 0, -h * 0.66 + 13 + i * 12, s, { 'font-size': i ? 9 : 11, 'text-anchor': 'middle', fill: '#14110F', 'font-weight': i ? 600 : 700 }); });
    return { g: gr };
  };

  /* Huni: ağız üstte; alt ucu (0,0) */
  P.huni = function (ana) {
    var gr = g(ana);
    yol(gr, 'M-34 -62 L34 -62 L6 -22 L4 0 L-4 0 L-6 -22 Z', { fill: 'url(#dm-g-cam)', stroke: '#7F97A8', 'stroke-width': 2, 'stroke-linejoin': 'round' });
    yol(gr, 'M-26 -58 L-4 -26', { stroke: '#fff', 'stroke-width': 2.5, opacity: 0.7 });
    return { g: gr };
  };

  /* Kronometre */
  P.kronometre = function (ana) {
    var gr = g(ana);
    P.golge(gr, 70, 4);
    el('rect', { x: -36, y: -58, width: 72, height: 58, rx: 12, fill: '#2C3136' }, gr);
    el('rect', { x: -10, y: -66, width: 20, height: 9, rx: 3, fill: '#F85300' }, gr);
    var ek = P.ekran(gr, -30, -50, 60, 26, { boy: 17 });
    yazi(gr, 0, -10, 'SÜRE', { 'font-size': 8.5, 'text-anchor': 'middle', fill: '#C9C2BA' });
    return { g: gr, yaz: ek.yaz };
  };

  /* pH metre: kutu + kablo + prob (prob ucu probX, probY) */
  P.phMetre = function (ana, o) {
    var gr = g(ana), px = o.probX, py = o.probY, ky = o.kolY || -230;
    P.statif(gr, { h: -ky + 40, taban: 140 });
    P.kiskac(gr, 0, ky, px + 7, { ceneW: 18 });
    el('rect', { x: px - 5, y: ky - 40, width: 10, height: py - ky + 32, rx: 4, fill: '#ECE8E2', stroke: '#9A9187', 'stroke-width': 1 }, gr);
    el('rect', { x: px - 6, y: py - 14, width: 12, height: 14, rx: 6, fill: '#DDEBF3', stroke: '#7F97A8', 'stroke-width': 1 }, gr);
    yol(gr, 'M' + px + ' ' + (ky - 40) + ' C ' + px + ' ' + (ky - 72) + ' -14 ' + (ky - 72) + ' -12 ' + (ky - 24) + ' L -12 -118 Q -12 -104 32 -98', { stroke: '#2C3136', 'stroke-width': 3, fill: 'none', 'stroke-linejoin': 'round' });
    var kutu = g(gr, { transform: 'translate(32,-66)' });
    el('rect', { x: 0, y: -46, width: 100, height: 62, rx: 10, fill: '#F2EEE9', stroke: '#B9B0A6', 'stroke-width': 1.2 }, kutu);
    var ek = P.ekran(kutu, 8, -38, 84, 34, { birim: 'pH', boy: 21 });
    yazi(kutu, 50, 10, 'pH METRE', { 'font-size': 8.5, 'text-anchor': 'middle', fill: '#7A726B' });
    return { g: gr, yaz: ek.yaz };
  };

  /* Köpük bardak */
  P.profilBardak = function (h) { return [[0, 30], [-h, 42]]; };
  P.kopukBardak = function (ana, o) {
    o = o || {};
    var gr = g(ana);
    P.golge(gr, 80, 4);
    var k = P.kap(gr, { profil: P.profilBardak(o.h || 104), kalinlik: 5, kapasite: o.kapasite || 200, kapasiteY: (o.h || 104) * 0.92, renk: '#9FD3F2', cizgi: '#CFC8BE' });
    /* köpük duvar dokusu: camı örtecek opak duvarlar */
    var h = o.h || 104;
    yol(gr, 'M-35 0 L-47 ' + (-h) + ' L-41 ' + (-h) + ' L-29 0 Z', { fill: 'url(#dm-g-kopuk)' });
    yol(gr, 'M35 0 L47 ' + (-h) + ' L41 ' + (-h) + ' L29 0 Z', { fill: 'url(#dm-g-kopuk)' });
    el('rect', { x: -33, y: -4, width: 66, height: 5, fill: '#F4F1EC' }, gr);
    el('line', { x1: -48, y1: -h, x2: 48, y2: -h, stroke: '#E4DED5', 'stroke-width': 4, 'stroke-linecap': 'round' }, gr);
    return k;
  };

  /* Buz küpleri (kap yüzeyinde yüzer) */
  P.buzlar = function (kap) {
    var gr = g(kap.ic), L = [];
    for (var i = 0; i < 6; i++) {
      var e = el('rect', { width: 16, height: 14, rx: 3, fill: 'url(#dm-g-buz)', stroke: '#9CCBE5', 'stroke-width': 1, opacity: 0 }, gr);
      L.push({ e: e, dx: (i % 3 - 1) * 0.55 + (i > 2 ? 0.25 : 0), dy: i > 2 ? 9 : 0, a: (i * 37) % 30 - 15 });
    }
    return {
      ayar: function (n) {
        var yz = kap.yuzey === undefined ? -kap.H * 0.5 : kap.yuzey, r = kap.yuzeyR || 30;
        L.forEach(function (b, i) {
          var gor = i < Math.round(n);
          b.e.setAttribute('opacity', gor ? 0.95 : 0);
          if (gor) { var x = b.dx * r - 8, y = yz - 5 + b.dy; b.e.setAttribute('x', yuvarla(x)); b.e.setAttribute('y', yuvarla(y)); b.e.setAttribute('transform', 'rotate(' + b.a + ' ' + yuvarla(x + 8) + ' ' + yuvarla(y + 7) + ')'); }
        });
      }
    };
  };

  /* Karıştırma çubuğu (baget) görünür/gizli, sallanır */
  P.baget = function (kap) {
    var gr = g(kap.g), e = el('rect', { x: -3, y: -kap.H - 30, width: 6, height: kap.H + 24, rx: 3, fill: '#E9F3F8', stroke: '#8FA7B8', 'stroke-width': 1.2, opacity: 0.95 }, gr), t = 0;
    gr.style.display = 'none';
    return {
      guncelle: function (dt, acik) {
        gr.style.display = acik ? '' : 'none';
        if (!acik) return;
        t += dt;
        e.setAttribute('transform', 'rotate(' + (Math.sin(t * 7) * 9).toFixed(1) + ' 0 ' + (-kap.H - 20) + ') translate(' + (Math.sin(t * 7) * 6).toFixed(1) + ',0)');
      }
    };
  };

  /* Katı tanecikler (kap tabanında yığın); oran 0-1 */
  P.yigin = function (kap, o) {
    o = o || {};
    var gr = g(kap.ic), L = [], n = o.n || 34, renk = o.renk || '#FFFFFF', sekil = o.sekil || 'tane';
    for (var i = 0; i < n; i++) {
      var r0 = kap.rAt(-2) - 5, x = (Math.random() * 2 - 1) * r0 * (o.yay || 0.7), y = -3 - Math.random() * (o.yuk || 9);
      var e;
      if (sekil === 'igne') e = el('rect', { x: x - 1.2, y: y - 7, width: 2.4, height: 9 + Math.random() * 6, rx: 1, fill: renk, stroke: o.kenar || '#B9C7CF', 'stroke-width': 0.5, transform: 'rotate(' + Math.round(Math.random() * 120 - 60) + ' ' + x.toFixed(1) + ' ' + y.toFixed(1) + ')' }, gr);
      else if (sekil === 'parca') e = yol(gr, 'M' + (x - 5) + ' ' + y + ' l3 -6 l6 -1 l3 5 l-3 4 l-7 1 Z', { fill: renk, stroke: o.kenar || '#B8B0A4', 'stroke-width': 0.8 });
      else e = el('circle', { cx: x, cy: y, r: 1.3 + Math.random() * 1.6, fill: renk, stroke: o.kenar || '#C9D3D9', 'stroke-width': 0.5 }, gr);
      L.push(e);
    }
    return {
      ayar: function (oran) {
        var k = Math.round(Math.max(0, Math.min(1, oran)) * L.length);
        for (var j = 0; j < L.length; j++) L[j].style.display = j < k ? '' : 'none';
      }
    };
  };

  /* Uzun cam boru (yatay), sol uç (0,0)'da merkez çizgisi y */
  P.camBoru = function (ana, uz, r) {
    var gr = g(ana);
    el('rect', { x: 0, y: -r, width: uz, height: 2 * r, rx: r * 0.3, fill: 'url(#dm-g-cam)', stroke: '#7F97A8', 'stroke-width': 2.2 }, gr);
    el('line', { x1: 8, y1: -r + 4, x2: uz - 8, y2: -r + 4, stroke: '#fff', 'stroke-width': 2.5, opacity: 0.7 }, gr);
    return { g: gr };
  };
  /* Cetvel: x0..x0+uz arası, cm adımları */
  P.cetvel = function (ana, uz, cm, o) {
    o = o || {};
    var gr = g(ana);
    el('rect', { x: -6, y: 0, width: uz + 12, height: 26, rx: 3, fill: '#F6E7B8', stroke: '#C9B276' }, gr);
    var c = g(gr, { stroke: '#6B5A2A', 'stroke-width': 1 });
    for (var i = 0; i <= cm; i++) {
      var x = i / cm * uz, uzun = i % 10 === 0, orta = i % 5 === 0;
      el('line', { x1: x, y1: 0, x2: x, y2: uzun ? 11 : (orta ? 8 : 4.5) }, c);
      if (uzun) yazi(gr, x, 22, String(i), { 'font-size': 10, 'text-anchor': 'middle', fill: '#5A4A1E' });
    }
    if (o.birim !== false) yazi(gr, uz + 2, 22, 'cm', { 'font-size': 9, 'text-anchor': 'end', fill: '#5A4A1E' });
    return { g: gr };
  };
  /* Tıpa */
  P.tipa = function (ana, x, y, w, h, renk) {
    return yol(ana, 'M' + (x - w / 2) + ' ' + y + ' L' + (x + w / 2) + ' ' + y + ' L' + (x + w / 2 - 3) + ' ' + (y + h) + ' L' + (x - w / 2 + 3) + ' ' + (y + h) + ' Z', { fill: renk || '#8B5E3C', stroke: '#5E3E26', 'stroke-width': 1 });
  };

  /* Küçük resim: parçayı küçük bir SVG içinde gösterir */
  P.kucukResim = function (ciz, bb, boyut) {
    var pad = Math.max(bb[2], bb[3]) * 0.06;
    var s = el('svg', { viewBox: (bb[0] - pad) + ' ' + (bb[1] - pad) + ' ' + (bb[2] + 2 * pad) + ' ' + (bb[3] + 2 * pad), width: boyut || 42, height: boyut || 42, 'aria-hidden': 'true' });
    try { ciz(g(s), P, true); } catch (e) {}
    return s;
  };

  window.LabDeneyCizim = P;
})();
