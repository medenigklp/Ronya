/* =====================================================================
   SESLİ DERS · PDF — sesli anlatımın tahtaya yazılanlarından ders notu
   Tarayıcıda üretilir: pdf-lib (sesli/pdf-lib.min.js) ve DejaVu Sans alt kümesi
   (sesli/pdf-yazi.js). Grafikler ve şekiller vektör olarak çizilir; formüllerde
   alt ve üst simgeler korunur, metin seçilip kopyalanabilir.

   SesliPdf.olustur(notu, secenek) → Promise<Uint8Array>
     notu:    { baslik, altBaslik, bloklar: [{ tur, html, pg, ilk, ic }] }
              tur: baslik | alt | etiket | not | denklem | cevap | madde | sekil | metin | resim
     secenek: { marka: 'kimyamed', ust: 'Ders notu' }
   ===================================================================== */
(function () {
  'use strict';
  if (window.SesliPdf) return;
  var S = window.SesliPdf = {};
  var L = null, YZ = null;

  var A4 = [595.28, 841.89], K = { sol: 56, sag: 56, ust: 70, alt: 64 }, GEN = A4[0] - K.sol - K.sag;
  var R = {
    murekkep: [0.11, 0.10, 0.09], gri: [0.42, 0.39, 0.36], acikGri: [0.62, 0.59, 0.56], turuncu: [0.97, 0.33, 0], turuncuK: [0.76, 0.25, 0],
    kirmizi: [0.80, 0.12, 0.16], yesil: [0.07, 0.45, 0.27], kutu: [0.972, 0.957, 0.937], kutuKenar: [0.97, 0.33, 0], cizgi: [0.84, 0.81, 0.77], tabloBas: [0.95, 0.93, 0.90]
  };
  var B = { metin: 10.6, satir: 1.5, baslik: 15.5, alt: 12.4, etiket: 10.8, denklem: 11.4, tablo: 9.4, kucuk: 8.4, kapak: 20 };
  var NS = 'http://www.w3.org/2000/svg';

  /* ---------------- yazı karakteri: glif eşleme, ölçme, gömme ---------------- */
  function b64(s) { var ik = atob(s), u = new Uint8Array(ik.length); for (var i = 0; i < ik.length; i++) u[i] = ik.charCodeAt(i); return u; }
  function Yazi(v, ad) {
    var self = this;
    this.v = v; this.ad = ad; this.em = v.em; this.g = {}; this.kul = {};
    v.harita.split(';').forEach(function (p) { var q = p.split(':'); self.g[parseInt(q[0], 16)] = [parseInt(q[1], 16), parseInt(q[2], 16)]; });
    this.asc = v.asc / v.em; this.desc = -v.desc / v.em;
  }
  Yazi.prototype.glif = function (cp) {
    if (cp === 0xA0 || cp === 0x2009 || cp === 0x202F || cp === 0x2007 || cp === 0x200A || cp === 9) cp = 32;
    var g = this.g[cp];
    if (!g && cp === 0x2212) g = this.g[45];
    if (!g && cp === 0x2011) g = this.g[45];
    return g || this.g[63] || [0, 600];
  };
  Yazi.prototype.gen = function (s, boy) { var t = 0; for (var i = 0; i < s.length; i++) t += this.glif(s.charCodeAt(i))[1]; return t * boy / this.em; };
  Yazi.prototype.hex = function (s) {
    var h = '';
    for (var i = 0; i < s.length; i++) { var cp = s.charCodeAt(i), g = this.glif(cp); if (!(g[0] in this.kul)) this.kul[g[0]] = cp === 0xA0 ? 32 : cp; h += ('000' + g[0].toString(16)).slice(-4); }
    return h;
  };
  Yazi.prototype.gom = function (doc, ref) {
    var c = doc.context, v = this.v, ham = b64(v.ttf), em = this.em, ol = function (x) { return Math.round(x * 1000 / em); };
    var ff = c.register(c.flateStream(ham, { Length1: ham.length }));
    var ad = 'KMED+' + String(v.ad || 'DejaVuSans').replace(/[^A-Za-z0-9-]/g, '');
    var fd = c.register(c.obj({ Type: 'FontDescriptor', FontName: ad, Flags: v.aci ? 96 : 32, FontBBox: v.bbox.map(ol), ItalicAngle: v.aci || 0,
      Ascent: ol(v.asc), Descent: ol(v.desc), CapHeight: ol(v.cap), StemV: 80, FontFile2: ff }));
    var adv = {}, self = this; Object.keys(this.g).forEach(function (cp) { adv[self.g[cp][0]] = self.g[cp][1]; });
    var W = []; Object.keys(this.kul).map(Number).sort(function (a, b) { return a - b; }).forEach(function (gid) { W.push(gid, [ol(adv[gid] || 0)]); });
    var cid = c.register(c.obj({ Type: 'Font', Subtype: 'CIDFontType2', BaseFont: ad, CIDSystemInfo: { Registry: L.PDFString.of('Adobe'), Ordering: L.PDFString.of('Identity'), Supplement: 0 },
      FontDescriptor: fd, W: W, DW: 600, CIDToGIDMap: 'Identity' }));
    // ToUnicode: metin kopyalanınca doğru harfler gelsin
    var gl = Object.keys(this.kul).map(Number).sort(function (a, b) { return a - b; }), parca = [];
    for (var i = 0; i < gl.length; i += 100) {
      var dilim = gl.slice(i, i + 100);
      parca.push(dilim.length + ' beginbfchar\n' + dilim.map(function (g) { return '<' + ('000' + g.toString(16)).slice(-4) + '> <' + ('000' + self.kul[g].toString(16)).slice(-4) + '>'; }).join('\n') + '\nendbfchar');
    }
    var cmap = '/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n/CMapName /Adobe-Identity-UCS def\n/CMapType 2 def\n' +
      '1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n' + parca.join('\n') + '\nendcmap\nCMapName currentdict /CMap defineresource pop\nend\nend';
    var tu = c.register(c.flateStream(cmap));
    c.assign(ref, c.obj({ Type: 'Font', Subtype: 'Type0', BaseFont: ad, Encoding: 'Identity-H', DescendantFonts: [cid], ToUnicode: tu }));
  };

  /* ---------------- satır içi metin: HTML → biçimli parçalar ---------------- */
  var BLOK = /^(p|div|ul|ol|li|table|svg|img|figure|figcaption|h[1-6]|blockquote|section|article|details|summary|hr|pre|dl|dt|dd|canvas)$/;
  function renkCoz(s) {
    var m = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?/.exec(s || '');
    if (m) { var a = m[4] == null ? 1 : +m[4]; if (a === 0) return null; return [mix(+m[1], a), mix(+m[2], a), mix(+m[3], a)]; }
    m = /^#([0-9a-f]{3,8})$/i.exec(String(s || '').trim());
    if (m) { var h = m[1]; if (h.length === 3) h = h.replace(/./g, '$&$&'); return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255]; }
    return null;
    function mix(v, a) { return (v * a + 255 * (1 - a)) / 255; }
  }
  function satirIci(n, st, out) {
    if (n.nodeType === 3) { var t = n.nodeValue.replace(/[\s​]+/g, ' '); if (t) out.push({ t: t, b: st.b, i: st.i, sup: st.sup, sub: st.sub, r: st.r }); return; }
    if (n.nodeType !== 1) return;
    var ad = n.tagName.toLowerCase();
    if (ad === 'br') { out.push({ br: 1 }); return; }
    if (/^(script|style|svg|table|img|canvas|button|input|select|textarea|template)$/.test(ad)) return;
    var y = { b: st.b || /^(b|strong|th|h[1-6])$/.test(ad), i: st.i || /^(i|em|cite|var)$/.test(ad), sup: st.sup || ad === 'sup', sub: st.sub || ad === 'sub', r: st.r };
    var cls = typeof n.className === 'string' ? n.className : '';
    if (/(^|\s)vurgu(\s|$)/.test(cls)) { y.b = true; y.r = R.turuncuK; }
    var sc = n.getAttribute('style') || '';
    var mc = /(?:^|;)\s*color\s*:\s*([^;]+)/i.exec(sc); if (mc) { var rr = renkCoz(mc[1]); if (rr) y.r = rr; }
    if (/font-weight\s*:\s*(bold|[6-9]00)/i.test(sc)) y.b = true;
    if (/font-style\s*:\s*italic/i.test(sc)) y.i = true;
    Array.prototype.forEach.call(n.childNodes, function (c) { satirIci(c, y, out); });
  }

  /* ---------------- yerleştirme: satırlar, kutular, sayfalar ---------------- */
  function Belge(doc, yazilar, secenek) {
    this.doc = doc; this.y = yazilar; this.sec = secenek || {}; this.sayfalar = []; this.sayfa = null; this.yy = 0; this.bos = true;
    this.yeniSayfa();
  }
  Belge.prototype.yeniSayfa = function () {
    var p = this.doc.addPage(A4), self = this;
    ['n', 'b', 'i'].forEach(function (k) { p.node.setFontDictionary(L.PDFName.of('F' + k), self.y[k].ref); });
    this.sayfa = p; this.sayfalar.push(p); this.yy = A4[1] - K.ust; this.bos = true;
  };
  Belge.prototype.bosluk = function (h) { if (!this.bos && !this.bekleyen) this.yy -= h; };
  Belge.prototype.bitir = function () { if (this.bekleyen) { var b = this.bekleyen; this.bekleyen = null; this.yerlestir(b.map(function (s) { var t = Object.assign({}, s); t.birlikte = false; return t; })); } };
  Belge.prototype.yazi = function (st) { return st.b ? this.y.b : st.i ? this.y.i : this.y.n; };
  // Satırları akışa koy; kutu: { zemin, kenar, ic } (sayfa geçişinde her parçaya ayrı zemin)
  Belge.prototype.yerlestir = function (satirlar, kutu) {
    if (!satirlar.length) return;
    if (satirlar.every(function (s) { return s.birlikte; }) && !kutu) { this.bekleyen = (this.bekleyen || []).concat(satirlar); return; }
    if (this.bekleyen) { // bekleyen başlık + içeriğin ilk satırı aynı sayfaya sığmalı
      var bk = this.bekleyen, gerek = bk.reduce(function (a, s) { return a + s.h + (s.bosluk || 0); }, 0) + satirlar[0].h + (kutu ? 2 * (kutu.ic || 7) + 8 : 0);
      this.bekleyen = null;
      if (this.yy - gerek < K.alt && !this.bos) this.yeniSayfa();
      this.yerlestir(bk.map(function (s) { var t = Object.assign({}, s); t.birlikte = false; return t; }));
      if (kutu) this.yy -= 7;
    }
    var pd = kutu ? (kutu.ic || 7) : 0, k = 0;
    while (k < satirlar.length) {
      var kalan = this.yy - K.alt - 2 * pd, top = 0, j = k;
      while (j < satirlar.length) {
        var s = satirlar[j], h = s.h + (j > k ? (s.bosluk || 0) : 0), ek = s.birlikte && satirlar[j + 1] ? satirlar[j + 1].h + (satirlar[j + 1].bosluk || 0) : 0;
        if (top + h + ek > kalan) break;
        top += h; j++;
      }
      if (j === k) {
        if (this.bos) { j = k + 1; top = satirlar[k].h; } // sayfaya hiç sığmayan tek satır: olduğu gibi konur
        else { this.yeniSayfa(); continue; }
      }
      var ust = this.yy, sp = this.sayfa;
      if (kutu) {
        var hh = top + 2 * pd;
        sp.pushOperators(L.pushGraphicsState(), L.setFillingRgbColor.apply(null, kutu.zemin), L.rectangle(K.sol, ust - hh, GEN, hh), L.fill());
        if (kutu.kenar) sp.pushOperators(L.setFillingRgbColor.apply(null, kutu.kenar), L.rectangle(K.sol, ust - hh, 2.6, hh), L.fill());
        sp.pushOperators(L.popGraphicsState());
      }
      var y = ust - pd;
      for (var q = k; q < j; q++) { var s2 = satirlar[q]; if (q > k) y -= s2.bosluk || 0; s2.ciz(sp, K.sol + pd + (kutu && kutu.kenar ? 6 : 0) + (s2.girinti || 0), y); y -= s2.h; }
      this.yy = y - pd; this.bos = false; k = j;
      if (k < satirlar.length) this.yeniSayfa();
    }
  };
  // Biçimli parçalardan sarılmış satırlar
  Belge.prototype.paragraf = function (parcalar, o) {
    o = o || {};
    var self = this, boy = o.boy || B.metin, gen = (o.gen || GEN) - (o.girinti || 0) - (o.sag || 0), ara = (o.satir || B.satir) * boy;
    var olc = function (t, p) { var b = p.sup || p.sub ? boy * 0.68 : boy; return self.yazi(p).gen(t, b); };
    var toks = [];
    parcalar.forEach(function (p) {
      if (p.br) { toks.push({ br: 1 }); return; }
      p.t.split(/( )/).forEach(function (t) { if (t) toks.push({ t: t, p: p, bos: t === ' ', w: olc(t, p) }); });
    });
    // boşluksuz ardışık parçalar (E + alt simge ai gibi) tek sözcük sayılır, satır sonunda bölünmez
    var sozler = [];
    toks.forEach(function (t) {
      if (t.br || t.bos) { sozler.push(t); return; }
      var u = sozler[sozler.length - 1];
      if (u && u.soz) { u.p.push(t); u.w += t.w; } else sozler.push({ soz: 1, p: [t], w: t.w });
    });
    var satirlar = [], cur = [], w = 0;
    var bitir = function () { while (cur.length && cur[cur.length - 1].bos) cur.pop(); satirlar.push(cur); cur = []; w = 0; };
    sozler.forEach(function (t) {
      if (t.br) { bitir(); return; }
      if (t.bos) { if (!cur.length || w + t.w > gen) return; cur.push(t); w += t.w; return; }
      if (w + t.w > gen && cur.length) bitir();
      if (t.w > gen) { // tek başına sığmayan uzun sözcük: harf harf böl
        t.p.forEach(function (pt) {
          var parca = '';
          for (var i = 0; i < pt.t.length; i++) { var dene = parca + pt.t[i]; if (olc(dene, pt.p) > gen - w && (parca || cur.length)) { if (parca) cur.push({ t: parca, p: pt.p, w: olc(parca, pt.p) }); bitir(); parca = pt.t[i]; } else parca = dene; }
          if (parca) { var q = { t: parca, p: pt.p, w: olc(parca, pt.p) }; cur.push(q); w += q.w; }
        });
        return;
      }
      t.p.forEach(function (pt) { cur.push(pt); }); w += t.w;
    });
    if (cur.length) bitir();
    return satirlar.filter(function (s, i) { return s.length || i < satirlar.length - 1; }).map(function (s, i) {
      return {
        h: ara, bosluk: i === 0 ? (o.bosluk || 0) : 0, girinti: o.girinti || 0, birlikte: !!o.birlikte,
        ciz: function (sp, x, yUst) {
          var taban = yUst - (ara - boy * (self.y.n.asc + self.y.n.desc)) / 2 - boy * self.y.n.asc, xx = x, sw = s.reduce(function (a, t) { return a + t.w; }, 0);
          if (o.orta) xx = x + (gen - sw) / 2;
          if (o.imge && i === 0) o.imge(sp, x - (o.imgeX || 0), taban);
          // aynı biçimdeki ardışık parçalar tek seferde yazılır
          var grup = [];
          s.forEach(function (t) { var u = grup[grup.length - 1]; if (u && u.p.b === t.p.b && u.p.i === t.p.i && u.p.sup === t.p.sup && u.p.sub === t.p.sub && u.p.r === t.p.r) { u.t += t.t; u.w += t.w; } else grup.push({ t: t.t, p: t.p, w: t.w }); });
          grup.forEach(function (g) {
            var yz = self.yazi(g.p), b = g.p.sup || g.p.sub ? boy * 0.68 : boy, rise = g.p.sup ? boy * 0.36 : g.p.sub ? -boy * 0.17 : 0, r = g.p.r || o.renk || R.murekkep;
            var yb = yz === self.y.n ? 'Fn' : yz === self.y.b ? 'Fb' : 'Fi';
            sp.pushOperators(L.beginText(), L.setFontAndSize(yb, b), L.setFillingRgbColor(r[0], r[1], r[2]), L.setTextMatrix(1, 0, 0, 1, xx, taban), L.setTextRise(rise), L.showText(L.PDFHexString.of(yz.hex(g.t))), L.endText());
            xx += g.w;
          });
        }
      };
    });
  };
  // Düz yazı (üst ve alt bilgi için)
  Belge.prototype.duz = function (sp, t, x, y, boy, yz, renk, hiza) {
    yz = yz || this.y.n; var w = yz.gen(t, boy), ad = yz === this.y.n ? 'Fn' : yz === this.y.b ? 'Fb' : 'Fi';
    if (hiza === 'sag') x -= w; else if (hiza === 'orta') x -= w / 2;
    sp.pushOperators(L.beginText(), L.setFontAndSize(ad, boy), L.setFillingRgbColor(renk[0], renk[1], renk[2]), L.setTextMatrix(1, 0, 0, 1, x, y), L.showText(L.PDFHexString.of(yz.hex(t))), L.endText());
    return w;
  };
  function cizgi(sp, x1, y1, x2, y2, k, r) { sp.pushOperators(L.pushGraphicsState(), L.setStrokingRgbColor(r[0], r[1], r[2]), L.setLineWidth(k), L.moveTo(x1, y1), L.lineTo(x2, y2), L.stroke(), L.popGraphicsState()); }

  /* ---------------- tablo ---------------- */
  Belge.prototype.tablo = function (t) {
    var self = this, satirlar = Array.prototype.slice.call(t.rows || []), boy = B.tablo, pd = 4;
    if (!satirlar.length) return [];
    var hucreler = satirlar.map(function (tr) { return Array.prototype.map.call(tr.cells, function (td) { var p = []; satirIci(td, { b: td.tagName.toLowerCase() === 'th' }, p); return { p: p, cs: Math.max(1, td.colSpan || 1), bas: td.tagName.toLowerCase() === 'th' }; }); });
    var sut = 0; hucreler.forEach(function (r) { var n = 0; r.forEach(function (h) { n += h.cs; }); sut = Math.max(sut, n); });
    if (!sut) return [];
    var enAz = [], enCok = [];
    for (var i = 0; i < sut; i++) { enAz[i] = 18; enCok[i] = 18; }
    hucreler.forEach(function (r) {
      var c = 0;
      r.forEach(function (h) {
        if (h.cs === 1) {
          var tam = 0, enUzun = 0;
          h.p.forEach(function (p) { if (p.br) return; var yz = self.yazi(p); tam += yz.gen(p.t, boy); p.t.split(' ').forEach(function (s) { enUzun = Math.max(enUzun, yz.gen(s, boy)); }); });
          enAz[c] = Math.max(enAz[c], enUzun + 2 * pd); enCok[c] = Math.max(enCok[c], tam + 2 * pd);
        }
        c += h.cs;
      });
    });
    var topCok = enCok.reduce(function (a, b) { return a + b; }, 0), topAz = enAz.reduce(function (a, b) { return a + b; }, 0), gen;
    if (topCok <= GEN) gen = enCok.slice();
    else if (topAz >= GEN) gen = enAz.map(function (w) { return w * GEN / topAz; });
    else { var f = (GEN - topAz) / (topCok - topAz); gen = enAz.map(function (w, i) { return w + (enCok[i] - w) * f; }); }
    var tGen = gen.reduce(function (a, b) { return a + b; }, 0), x0off = (GEN - tGen) / 2;
    return hucreler.map(function (r, ri) {
      var c = 0, icerik = r.map(function (h) {
        var w = 0; for (var k = 0; k < h.cs; k++) w += gen[c + k] || 0;
        var sat = self.paragraf(h.p.length ? h.p : [{ t: ' ' }], { boy: boy, gen: w - 2 * pd, satir: 1.32 });
        var o = { x: c, w: w, sat: sat, bas: h.bas || (ri === 0 && satirlar[0].querySelector('th')), h: sat.reduce(function (a, s) { return a + s.h; }, 0) };
        c += h.cs; return o;
      });
      var hh = Math.max.apply(null, icerik.map(function (o) { return o.h; })) + 2 * pd;
      return {
        h: hh, bosluk: ri === 0 ? 6 : 0,
        ciz: function (sp, x, yUst) {
          var xx = x + x0off;
          icerik.forEach(function (o) {
            var cx = xx; for (var k = 0; k < o.x; k++) cx += gen[k];
            if (o.bas) sp.pushOperators(L.pushGraphicsState(), L.setFillingRgbColor.apply(null, R.tabloBas), L.rectangle(cx, yUst - hh, o.w, hh), L.fill(), L.popGraphicsState());
            sp.pushOperators(L.pushGraphicsState(), L.setStrokingRgbColor.apply(null, R.cizgi), L.setLineWidth(0.6), L.rectangle(cx, yUst - hh, o.w, hh), L.stroke(), L.popGraphicsState());
            var y = yUst - pd; o.sat.forEach(function (s) { s.ciz(sp, cx + pd, y); y -= s.h; });
          });
        }
      };
    });
  };

  /* ---------------- SVG → PDF (vektör) ---------------- */
  function yolKomut(d) { // yol verisi → mutlak komutlar: [['M',x,y],['L',x,y],['C',x1,y1,x2,y2,x,y],['Z']]
    var re = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g, m, out = [], x = 0, y = 0, x0 = 0, y0 = 0, kx = 0, ky = 0, onc = '';
    var sayilar = function (s) { var r = s.match(/[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g); return r ? r.map(parseFloat) : []; };
    while ((m = re.exec(d))) {
      var c = m[1], n = sayilar(m[2]), r = c === c.toLowerCase(), C = c.toUpperCase(), j = 0;
      if (C === 'Z') { out.push(['Z']); x = x0; y = y0; onc = 'Z'; continue; }
      do {
        var bx = r ? x : 0, by = r ? y : 0;
        if (C === 'M') { x = bx + n[j]; y = by + n[j + 1]; j += 2; x0 = x; y0 = y; out.push(['M', x, y]); C = 'L'; }
        else if (C === 'L') { x = bx + n[j]; y = by + n[j + 1]; j += 2; out.push(['L', x, y]); }
        else if (C === 'H') { x = bx + n[j]; j++; out.push(['L', x, y]); }
        else if (C === 'V') { y = (r ? y : 0) + n[j]; j++; out.push(['L', x, y]); }
        else if (C === 'C') { out.push(['C', bx + n[j], by + n[j + 1], kx = bx + n[j + 2], ky = by + n[j + 3], x = bx + n[j + 4], y = by + n[j + 5]]); j += 6; }
        else if (C === 'S') { var sx = /[CS]/.test(onc) ? 2 * x - kx : x, sy = /[CS]/.test(onc) ? 2 * y - ky : y; out.push(['C', sx, sy, kx = bx + n[j], ky = by + n[j + 1], x = bx + n[j + 2], y = by + n[j + 3]]); j += 4; }
        else if (C === 'Q' || C === 'T') {
          var qx, qy, ex, ey;
          if (C === 'Q') { qx = bx + n[j]; qy = by + n[j + 1]; ex = bx + n[j + 2]; ey = by + n[j + 3]; j += 4; } else { qx = /[QT]/.test(onc) ? 2 * x - kx : x; qy = /[QT]/.test(onc) ? 2 * y - ky : y; ex = bx + n[j]; ey = by + n[j + 1]; j += 2; }
          out.push(['C', x + 2 / 3 * (qx - x), y + 2 / 3 * (qy - y), ex + 2 / 3 * (qx - ex), ey + 2 / 3 * (qy - ey), ex, ey]); kx = qx; ky = qy; x = ex; y = ey;
        } else if (C === 'A') { yayEkle(out, x, y, n[j], n[j + 1], n[j + 2], n[j + 3], n[j + 4], bx + n[j + 5], by + n[j + 6]); x = bx + n[j + 5]; y = by + n[j + 6]; j += 7; }
        else break;
        onc = C;
      } while (j < n.length);
    }
    return out;
  }
  function yayEkle(out, x1, y1, rx, ry, aci, buyuk, yon, x2, y2) { // SVG yayı → kübik eğriler
    if (!rx || !ry) { out.push(['L', x2, y2]); return; }
    rx = Math.abs(rx); ry = Math.abs(ry);
    var f = aci * Math.PI / 180, cf = Math.cos(f), sf = Math.sin(f), dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
    var x1p = cf * dx + sf * dy, y1p = -sf * dx + cf * dy, lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
    if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
    var pay = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p, payda = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
    var k = Math.sqrt(Math.max(0, pay / payda)) * (buyuk === yon ? -1 : 1), cxp = k * rx * y1p / ry, cyp = -k * ry * x1p / rx;
    var cx = cf * cxp - sf * cyp + (x1 + x2) / 2, cy = sf * cxp + cf * cyp + (y1 + y2) / 2;
    var acı = function (ux, uy, vx, vy) { var a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy); return a; };
    var t1 = acı(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry), dt = acı((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
    if (!yon && dt > 0) dt -= 2 * Math.PI; else if (yon && dt < 0) dt += 2 * Math.PI;
    var nseg = Math.ceil(Math.abs(dt) / (Math.PI / 2)), d = dt / nseg, kk = 4 / 3 * Math.tan(d / 4);
    var nok = function (t) { var ct = Math.cos(t), st = Math.sin(t); return [cx + rx * ct * cf - ry * st * sf, cy + rx * ct * sf + ry * st * cf, -rx * st * cf - ry * ct * sf, -rx * st * sf + ry * ct * cf]; };
    for (var i = 0; i < nseg; i++) {
      var a = nok(t1 + i * d), b = nok(t1 + (i + 1) * d);
      out.push(['C', a[0] + kk * a[2], a[1] + kk * a[3], b[0] - kk * b[2], b[1] - kk * b[3], b[0], b[1]]);
    }
  }
  function sekilYol(el) { // şekil → yol komutları
    var t = el.tagName.toLowerCase(), A = function (n) { return parseFloat(el.getAttribute(n)) || 0; };
    if (t === 'path') return yolKomut(el.getAttribute('d') || '');
    if (t === 'line') return [['M', A('x1'), A('y1')], ['L', A('x2'), A('y2')]];
    if (t === 'polyline' || t === 'polygon') {
      var s = (el.getAttribute('points') || '').match(/[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g) || [], out = [];
      for (var i = 0; i + 1 < s.length; i += 2) out.push([out.length ? 'L' : 'M', +s[i], +s[i + 1]]);
      if (t === 'polygon' && out.length) out.push(['Z']);
      return out;
    }
    if (t === 'rect') { var x = A('x'), y = A('y'), w = A('width'), h = A('height'); if (!w || !h) return []; return [['M', x, y], ['L', x + w, y], ['L', x + w, y + h], ['L', x, y + h], ['Z']]; }
    if (t === 'circle' || t === 'ellipse') {
      var cx = A('cx'), cy = A('cy'), rx = t === 'circle' ? A('r') : A('rx'), ry = t === 'circle' ? A('r') : A('ry'), k = 0.5523;
      if (!rx || !ry) return [];
      return [['M', cx + rx, cy], ['C', cx + rx, cy + k * ry, cx + k * rx, cy + ry, cx, cy + ry], ['C', cx - k * rx, cy + ry, cx - rx, cy + k * ry, cx - rx, cy],
        ['C', cx - rx, cy - k * ry, cx - k * rx, cy - ry, cx, cy - ry], ['C', cx + k * rx, cy - ry, cx + rx, cy - k * ry, cx + rx, cy], ['Z']];
    }
    return [];
  }
  function donusum(el) { // transform özniteliği → [a,b,c,d,e,f]
    var t = el.transform && el.transform.baseVal, m = t && t.numberOfItems ? t.consolidate() : null;
    return m ? [m.matrix.a, m.matrix.b, m.matrix.c, m.matrix.d, m.matrix.e, m.matrix.f] : null;
  }
  Belge.prototype.svgCiz = function (sp, svg, x0, yUst, olcek) {
    var self = this, vb = svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.width ? svg.viewBox.baseVal : { x: 0, y: 0 };
    var ops = [L.pushGraphicsState(), L.concatTransformationMatrix(olcek, 0, 0, -olcek, x0 - vb.x * olcek, yUst + vb.y * olcek)];
    var gez = function (kok) {
      Array.prototype.forEach.call(kok.children, function (el) {
        var t = el.tagName.toLowerCase();
        if (/^(defs|clippath|mask|marker|pattern|symbol|title|desc|style|metadata|lineargradient|radialgradient|foreignobject|script)$/.test(t)) return;
        var cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return;
        var m = donusum(el);
        if (m) ops.push(L.pushGraphicsState(), L.concatTransformationMatrix(m[0], m[1], m[2], m[3], m[4], m[5]));
        if (t === 'g' || t === 'a' || t === 'svg' || t === 'switch') gez(el);
        else if (t === 'text') self.svgYazi(ops, el, cs);
        else if (t === 'use') { /* kullanılmıyor */ }
        else self.svgSekil(ops, el, cs, t);
        if (m) ops.push(L.popGraphicsState());
      });
    };
    gez(svg);
    ops.push(L.popGraphicsState());
    sp.pushOperators.apply(sp, ops);
  };
  Belge.prototype.svgSekil = function (ops, el, cs, t) {
    var yol = sekilYol(el);
    if (!yol.length) return;
    var op = +cs.opacity || 1, dolgu = cs.fill && cs.fill !== 'none' && t !== 'line' && t !== 'polyline' ? renkSaydam(cs.fill, op * (+cs.fillOpacity || 1)) : null;
    if (t === 'polyline' && cs.fill && cs.fill !== 'none' && !/^rgba?\([^)]*,\s*0\)$/.test(cs.fill)) dolgu = renkSaydam(cs.fill, op * (+cs.fillOpacity || 1));
    var cizgiR = cs.stroke && cs.stroke !== 'none' ? renkSaydam(cs.stroke, op * (+cs.strokeOpacity || 1)) : null, sw = parseFloat(cs.strokeWidth);
    if (cizgiR && !(sw > 0)) cizgiR = null;
    if (!dolgu && !cizgiR) return;
    ops.push(L.pushGraphicsState());
    if (cizgiR) {
      ops.push(L.setStrokingRgbColor(cizgiR[0], cizgiR[1], cizgiR[2]), L.setLineWidth(sw));
      var lc = cs.strokeLinecap === 'round' ? 1 : cs.strokeLinecap === 'square' ? 2 : 0, lj = cs.strokeLinejoin === 'round' ? 1 : cs.strokeLinejoin === 'bevel' ? 2 : 0;
      ops.push(L.setLineCap(lc), L.setLineJoin(lj));
      if (cs.strokeDasharray && cs.strokeDasharray !== 'none') { var da = cs.strokeDasharray.split(/[\s,]+/).map(parseFloat).filter(function (x) { return x >= 0; }); if (da.length && da.some(function (x) { return x > 0; })) ops.push(L.setDashPattern(da, parseFloat(cs.strokeDashoffset) || 0)); }
    }
    if (dolgu) ops.push(L.setFillingRgbColor(dolgu[0], dolgu[1], dolgu[2]));
    yol.forEach(function (k) {
      if (k[0] === 'M') ops.push(L.moveTo(k[1], k[2])); else if (k[0] === 'L') ops.push(L.lineTo(k[1], k[2]));
      else if (k[0] === 'C') ops.push(L.appendBezierCurve(k[1], k[2], k[3], k[4], k[5], k[6])); else if (k[0] === 'Z') ops.push(L.closePath());
    });
    ops.push(dolgu && cizgiR ? L.fillAndStroke() : dolgu ? L.fill() : L.stroke());
    ops.push(L.popGraphicsState());
  };
  function renkSaydam(s, op) { var r = renkCoz(s); if (!r) { if (/^url\(/.test(s)) r = [0.75, 0.75, 0.75]; else return null; } if (op < 1) r = r.map(function (v) { return v * op + (1 - op); }); return r; }
  // SVG yazısı: her harf tarayıcının hesapladığı yere konur (tspan, alt simge, hizalama korunur)
  Belge.prototype.svgYazi = function (ops, el, cs) {
    var n = 0; try { n = el.getNumberOfChars(); } catch (e) { return; }
    if (!n) return;
    var harfler = [];
    (function gez(d) { Array.prototype.forEach.call(d.childNodes, function (c) { if (c.nodeType === 3) { for (var i = 0; i < c.nodeValue.length; i++) harfler.push({ c: c.nodeValue[i], el: d }); } else if (c.nodeType === 1 && c.tagName.toLowerCase() !== 'title') gez(c); }); })(el);
    // tarayıcı boşlukları sadeleştirir; konum sayısı ile harf sayısı eşleşmeli
    var metin = harfler.map(function (h) { return h.c; }).join('');
    if (metin.length !== n) { var sade = []; var onceBos = true; harfler.forEach(function (h) { var b = /\s/.test(h.c); if (b && onceBos) return; sade.push(b ? { c: ' ', el: h.el } : h); onceBos = b; }); while (sade.length && sade[sade.length - 1].c === ' ') sade.pop(); harfler = sade; }
    var self = this, stilBellek = new Map();
    for (var i = 0; i < Math.min(n, harfler.length); i++) {
      var h = harfler[i]; if (h.c === ' ' || h.c === ' ') continue;
      var st = stilBellek.get(h.el); if (!st) { var c2 = getComputedStyle(h.el); st = { boy: parseFloat(c2.fontSize) || 12, b: (parseInt(c2.fontWeight, 10) || 400) >= 600, i: c2.fontStyle === 'italic', r: renkSaydam(c2.fill, +c2.fillOpacity || 1) || R.murekkep, gizli: c2.fill === 'none' }; stilBellek.set(h.el, st); }
      if (st.gizli) continue;
      var p, e; try { p = el.getStartPositionOfChar(i); e = el.getEndPositionOfChar(i); } catch (x) { continue; }
      var yz = st.b ? this.y.b : st.i ? this.y.i : this.y.n, ad = st.b ? 'Fb' : st.i ? 'Fi' : 'Fn';
      var bizim = yz.gen(h.c, st.boy), onun = Math.hypot(e.x - p.x, e.y - p.y), hs = bizim > 0 && onun > 0 ? Math.max(0.7, Math.min(1.3, onun / bizim)) : 1;
      ops.push(L.beginText(), L.setFontAndSize(ad, st.boy), L.setFillingRgbColor(st.r[0], st.r[1], st.r[2]), L.setTextMatrix(hs, 0, 0, -1, p.x, p.y), L.showText(L.PDFHexString.of(yz.hex(h.c))), L.endText());
    }
  };
  // Şekil satırı: tahtadaki SVG, sayfa genişliğine sığacak boyda ve ortalı
  Belge.prototype.sekil = function (svg, o) {
    o = o || {};
    var vb = svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.width ? svg.viewBox.baseVal : null, self = this;
    var vw = vb ? vb.width : (parseFloat(svg.getAttribute('width')) || 300), vh = vb ? vb.height : (parseFloat(svg.getAttribute('height')) || 150);
    if (!vw || !vh) return [];
    var w = Math.min(GEN - (o.girinti || 0), vw * 0.8 > 120 ? Math.max(vw * 0.62, Math.min(vw * 0.8, 430)) : vw), h = w * vh / vw;
    if (h > 300) { h = 300; w = h * vw / vh; }
    if (vw < 60) { w = vw * 0.75; h = vh * 0.75; }
    return [{ h: h + 8, bosluk: 6, girinti: o.girinti || 0, ciz: function (sp, x, yUst) { self.svgCiz(sp, svg, x + (GEN - (o.girinti || 0) - (o.ic || 0) - w) / 2, yUst - 4, w / vw); } }];
  };
  Belge.prototype.resim = function (img) {
    var r = img.__pdf; if (!r) return [];
    var w = Math.min(GEN, r.width * 0.75), h = w * r.height / r.width;
    if (h > 320) { h = 320; w = h * r.width / r.height; }
    return [{ h: h + 8, bosluk: 6, ciz: function (sp, x, yUst) { sp.drawImage(r, { x: x + (GEN - w) / 2, y: yUst - 4 - h, width: w, height: h }); } }];
  };

  /* ---------------- blokları sayfaya dök ---------------- */
  // Bir bloğun HTML'i: satır içi kısımlar paragraf, tablo/şekil/resim/liste ayrı satır grupları
  Belge.prototype.icerik = function (kok, o) {
    var self = this, satirlar = [], biriken = [];
    var bosalt = function () {
      var p = []; biriken.forEach(function (n) { satirIci(n, { b: o.b, i: o.i }, p); }); biriken = [];
      var dolu = p.some(function (x) { return x.t && x.t.trim(); });
      if (dolu) { while (p.length && p[0].t && !p[0].t.trim()) p.shift(); if (p[0] && p[0].t) p[0] = Object.assign({}, p[0], { t: p[0].t.replace(/^\s+/, '') }); satirlar = satirlar.concat(self.paragraf(p, { boy: o.boy, orta: o.orta, renk: o.renk, girinti: o.girinti, imge: satirlar.length ? null : o.imge, imgeX: o.imgeX, bosluk: satirlar.length ? 3 : 0, gen: o.gen, birlikte: o.birlikte, sag: o.sag })); }
    };
    Array.prototype.forEach.call(kok.childNodes, function (n) {
      var ad = n.nodeType === 1 ? n.tagName.toLowerCase() : '';
      if (n.nodeType === 1 && BLOK.test(ad)) {
        bosalt();
        if (ad === 'table') satirlar = satirlar.concat(self.tablo(n));
        else if (ad === 'svg') satirlar = satirlar.concat(self.sekil(n, { girinti: o.girinti, ic: o.ic }));
        else if (ad === 'img') satirlar = satirlar.concat(self.resim(n));
        else if (ad === 'hr' || ad === 'canvas') { /* atla */ }
        else if (ad === 'ul' || ad === 'ol') {
          var no = 0;
          Array.prototype.forEach.call(n.children, function (li) { no++; satirlar = satirlar.concat(self.icerik(li, Object.assign({}, o, { girinti: (o.girinti || 0) + 14, imge: madde(ad === 'ol' ? no + '.' : '•'), imgeX: 12 }))); });
        } else {
          var alt = self.icerik(n, Object.assign({}, o, /(^|\s)altyazi-sekil(\s|$)/.test(n.className || '') ? { boy: B.kucuk + 0.6, renk: R.gri, orta: true, i: true } : {}));
          if (alt.length) alt[0].bosluk = Math.max(alt[0].bosluk || 0, 3);
          satirlar = satirlar.concat(alt);
        }
      } else biriken.push(n);
    });
    bosalt();
    return satirlar;
    function madde(isaret) { return function (sp, x, taban) { self.duz(sp, isaret, x, taban, (o.boy || B.metin) * 0.95, self.y.n, R.turuncuK); }; }
  };
  Belge.prototype.bloklar = function (notu) {
    var self = this, A = notu.bloklar || [], i = 0;
    while (i < A.length) {
      var b = A[i], d;
      if (b.tur === 'metin') { // aynı paragraftan bölünmüş cümleler birleşir
        var html = b.html; while (A[i + 1] && A[i + 1].tur === 'metin' && b.pg && A[i + 1].pg === b.pg) { i++; html += ' ' + A[i].html; }
        d = self.dom(html); this.bosluk(5); this.yerlestir(this.icerik(d, {}));
      } else if (b.tur === 'baslik') {
        if (this.icerikVar && !this.bos) this.yeniSayfa(); // her bölüm yeni sayfada başlar
        this.bosluk(16);
        var bs = this.paragraf(metinParca(b.html, true), { boy: B.baslik, renk: R.turuncuK, birlikte: true, satir: 1.3 });
        var son = bs[bs.length - 1], eski = son.ciz; son.h += 7; son.ciz = function (sp, x, y) { eski(sp, x, y); cizgi(sp, K.sol, y - son.h + 3, K.sol + GEN, y - son.h + 3, 0.8, R.turuncu); };
        bs.forEach(function (s) { s.birlikte = true; }); bs[bs.length - 1].birlikte = true;
        this.yerlestir(bs);
      } else if (b.tur === 'alt') {
        this.bosluk(11); this.yerlestir(this.paragraf(metinParca(b.html, true), { boy: B.alt, birlikte: true, satir: 1.32 }).map(function (s) { s.birlikte = true; return s; }));
      } else if (b.tur === 'etiket') {
        this.bosluk(9); this.yerlestir(this.paragraf(metinParca(b.html, true), { boy: B.etiket, renk: R.kirmizi, birlikte: true }).map(function (s) { s.birlikte = true; return s; }));
      } else if (b.tur === 'not') { // aynı kutuya ait satırlar
        var parca = [b]; while (A[i + 1] && A[i + 1].tur === 'not' && !A[i + 1].ilk) { i++; parca.push(A[i]); }
        var st = [];
        parca.forEach(function (x, k) { var s = self.icerik(self.dom(x.html), { gen: GEN - 20, ic: 20, girinti: x.ic ? 14 : 0 }); if (s.length && k) s[0].bosluk = Math.max(s[0].bosluk || 0, 3); st = st.concat(s); });
        this.bosluk(7); this.yerlestir(st, { zemin: R.kutu, kenar: R.kutuKenar, ic: 8 });
      } else if (b.tur === 'denklem') {
        this.bosluk(6); this.yerlestir(this.icerik(self.dom(b.html), { boy: B.denklem, orta: true }));
      } else if (b.tur === 'cevap') {
        this.bosluk(6); this.yerlestir(this.icerik(self.dom(b.html), { renk: R.yesil, b: true }));
      } else if (b.tur === 'madde') {
        this.bosluk(3); var gir = b.ic ? 30 : 16, isaret = b.ic ? '–' : '•';
        var htm = b.html.replace(/^\s*(?:[•·▪●◦►\-–—*]|\d{1,2}[.)])\s+/, function (m) { isaret = m.trim(); return ''; });
        this.yerlestir(this.icerik(self.dom(htm), { girinti: gir, imgeX: 12, imge: function (sp, x, taban) { self.duz(sp, isaret, x, taban, B.metin * 0.95, self.y.n, R.turuncuK); } }));
      } else if (b.tur === 'sekil') {
        this.bosluk(6); this.yerlestir(this.icerik(self.dom(b.html), { orta: true }));
      }
      if (b.tur !== 'baslik') this.icerikVar = true;
      i++;
    }
  };
  function metinParca(html, kalin) { var d = document.createElement('div'); d.innerHTML = html; var p = []; satirIci(d, { b: kalin }, p); return p.filter(function (x) { return x.br || x.t; }); }

  /* ---------------- dış: kütüphane ve yazı yüklü olmalı ---------------- */
  S.olustur = function (notu, sec) {
    sec = sec || {};
    L = window.PDFLib; YZ = window.SesliPdfYazi;
    if (!L || !YZ) return Promise.reject(new Error('PDF kitaplığı yüklenmedi'));
    var kap = document.createElement('div');
    kap.setAttribute('aria-hidden', 'true');
    kap.style.cssText = 'position:absolute;left:-12000px;top:0;width:1000px;opacity:0;pointer-events:none;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif'; // görünmez ama biçem hesaplanır (visibility kalıtsal olduğu için kullanılmaz)
    document.body.appendChild(kap);
    var temizle = function () { if (kap.parentNode) kap.parentNode.removeChild(kap); };
    return L.PDFDocument.create().then(function (doc) {
      var yz = { n: new Yazi(YZ.normal, 'n'), b: new Yazi(YZ.kalin, 'b'), i: new Yazi(YZ.egik || YZ.normal, 'i') };
      ['n', 'b', 'i'].forEach(function (k) { yz[k].ref = doc.context.nextRef(); });
      var bel = new Belge(doc, yz, sec);
      // HTML parçaları görünmez bir kapta açılır: SVG'lerin biçemi ve harf konumları tarayıcıdan alınır
      var hazir = new Map();
      bel.dom = function (html) { var h = hazir.get(html); if (h) { hazir.delete(html); return h; } var d = document.createElement('div'); d.innerHTML = html; kap.appendChild(d); return d; };
      // resimler önceden gömülür
      var resimler = [];
      (notu.bloklar || []).forEach(function (b) { if (/<img/i.test(b.html || '')) resimler.push(b); });
      var gom = Promise.all(resimler.map(function (b) {
        var d = bel.dom(b.html); b.html = ''; b.__dom = d;
        return Promise.all(Array.prototype.map.call(d.querySelectorAll('img'), function (img) {
          var src = img.getAttribute('src') || '';
          return fetch(src).then(function (r) { return r.arrayBuffer(); }).then(function (buf) {
            var u = new Uint8Array(buf), png = u[0] === 0x89 && u[1] === 0x50, jpg = u[0] === 0xFF && u[1] === 0xD8;
            if (!png && !jpg) return null;
            return (png ? doc.embedPng(u) : doc.embedJpg(u)).then(function (r) { img.__pdf = r; });
          }).catch(function () { return null; });
        }));
      }));
      return gom.then(function () {
        resimler.forEach(function (b) { b.html = b.__dom.innerHTML; hazir.set(b.html, b.__dom); });
        // kapak satırı
        var bas = bel.paragraf(metinParca(sec.baslik || notu.baslik || 'Ders notu', true), { boy: B.kapak, satir: 1.25 });
        var alt = notu.altBaslik ? bel.paragraf(metinParca(notu.altBaslik), { boy: 10.5, renk: R.gri, bosluk: 4 }) : [];
        var cubuk = { h: 14, ciz: function (sp, x, y) { cizgi(sp, K.sol, y - 7, K.sol + 64, y - 7, 2.4, R.turuncu); } };
        bel.yerlestir(bas.concat(alt).concat([cubuk]));
        bel.bloklar(notu); bel.bitir();
        // üst ve alt bilgi
        var n = bel.sayfalar.length, ust = (sec.marka ? sec.marka + ' · ' : '') + (sec.ust || 'Ders notu'), ad = String(notu.baslik || '');
        bel.sayfalar.forEach(function (sp, i) {
          var w1 = bel.duz(sp, ust, K.sol, A4[1] - 40, 8.4, yz.b, R.turuncuK);
          var kisa = ad; while (kisa.length > 8 && yz.n.gen(kisa, 8.4) > GEN - w1 - 24) kisa = kisa.slice(0, -2);
          if (kisa !== ad) kisa = kisa.replace(/\s+\S*$/, '') + '…';
          bel.duz(sp, kisa, A4[0] - K.sag, A4[1] - 40, 8.4, yz.n, R.gri, 'sag');
          cizgi(sp, K.sol, A4[1] - 47, A4[0] - K.sag, A4[1] - 47, 0.5, R.cizgi);
          bel.duz(sp, (i + 1) + ' / ' + n, A4[0] / 2, 34, 8.4, yz.n, R.acikGri, 'orta');
        });
        ['n', 'b', 'i'].forEach(function (k) { yz[k].gom(doc, yz[k].ref); });
        doc.setTitle(String(notu.baslik || 'Ders notu'));
        doc.setSubject('Ders notu'); doc.setLanguage('tr-TR');
        if (sec.marka) { doc.setAuthor(sec.marka); doc.setCreator(sec.marka); }
        doc.setProducer('Sesli Ders');
        return doc.save();
      });
    }).then(function (bayt) { temizle(); return bayt; }, function (e) { temizle(); throw e; });
  };
})();
