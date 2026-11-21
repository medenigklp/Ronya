/* ============================================================
   SESLİ DERS · STÜDYO — paylaşılacak videolar için yapım araçları (Ronya)
   sesli-ders.js'ten önce yüklenir, window.SesliStudyo üzerinden kullanılır.

   İçindekiler
     mp4Oku          kameranın kaydettiği MP4'ü (parçalı ya da düz) örneklerine ayırır
     YuzCozucu       yüz videosunu WebCodecs ile sırayla, kare kare çözer (indirme)
     YuzOynatici     aynı videoyu <video> ile oynatır (gerçek zamanlı indirme yolu)
     videoKaydedici  kameradan gerçek video kaydı (30 kare)
     yuzSaglayici    videonun her anı için yüz karesi: video, eski kareler, fotoğraf
     BICIMLER        YouTube 16:9 1080p, Reels/Shorts 9:16, gönderi 4:5, hızlı 720p
     kompozitor      tahta, yüz ve altyazıyı seçilen yerleşimde tek karede birleştirir
   ============================================================ */
(function () {
  'use strict';
  var S = window.SesliStudyo = { surum: 1 };
  var UI = 'system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif';

  /* ================= MP4 ayrıştırıcı ================= */
  function mp4Oku(buf) {
    var v = new DataView(buf), N = buf.byteLength;
    var tip = function (o) { return String.fromCharCode(v.getUint8(o), v.getUint8(o + 1), v.getUint8(o + 2), v.getUint8(o + 3)); };
    var u64 = function (o) { return v.getUint32(o) * 4294967296 + v.getUint32(o + 4); };
    var kutu = function (o, son) {
      if (o + 8 > son) return null;
      var n = v.getUint32(o), t = tip(o + 4), h = 8;
      if (n === 1) { if (o + 16 > son) return null; n = u64(o + 8); h = 16; } else if (n === 0) n = son - o;
      if (n < h) return null;
      if (o + n > son) n = son - o; // yarım kalmış dosya
      return { t: t, o: o, ic: o + h, son: o + n, n: n };
    };
    var cocuk = function (o, son) { var l = [], k; while ((k = kutu(o, son))) { l.push(k); o = k.son; } return l; };
    var bul = function (l, t) { for (var i = 0; i < l.length; i++) if (l[i].t === t) return l[i]; return null; };
    var ust = cocuk(0, N), moov = bul(ust, 'moov');
    if (!moov) throw new Error('mp4: moov yok');
    var iz = null, trex = {};
    cocuk(moov.ic, moov.son).forEach(function (k) {
      if (k.t === 'mvex') { cocuk(k.ic, k.son).forEach(function (x) { if (x.t === 'trex') trex[v.getUint32(x.ic + 4)] = { sure: v.getUint32(x.ic + 12), boy: v.getUint32(x.ic + 16), bayrak: v.getUint32(x.ic + 20) }; }); return; }
      if (k.t !== 'trak' || iz) return;
      var tk = cocuk(k.ic, k.son), mdia = bul(tk, 'mdia'); if (!mdia) return;
      var md = cocuk(mdia.ic, mdia.son), hdlr = bul(md, 'hdlr');
      if (!hdlr || tip(hdlr.ic + 8) !== 'vide') return;
      var mdhd = bul(md, 'mdhd'), mv = v.getUint8(mdhd.ic), olcek = v.getUint32(mdhd.ic + (mv === 1 ? 20 : 12));
      var tkhd = bul(tk, 'tkhd'), tv = v.getUint8(tkhd.ic), id = v.getUint32(tkhd.ic + (tv === 1 ? 20 : 12));
      var mo = tkhd.ic + (tv === 1 ? 52 : 40), ma = v.getInt32(mo) / 65536, mb = v.getInt32(mo + 4) / 65536;
      var donus = (Math.round(Math.atan2(mb, ma) * 180 / Math.PI) + 360) % 360; // kayıttaki döndürme (iPhone dik tutulunca)
      var minf = bul(md, 'minf'), stbl = minf && bul(cocuk(minf.ic, minf.son), 'stbl'); if (!stbl) return;
      var st = cocuk(stbl.ic, stbl.son), stsd = bul(st, 'stsd'), giris = stsd && kutu(stsd.ic + 8, stsd.son); if (!giris) return;
      var alt = cocuk(giris.ic + 78, giris.son);
      iz = { id: id, olcek: olcek, g: v.getUint16(giris.ic + 24), y: v.getUint16(giris.ic + 26), tur: giris.t, st: st, avcC: bul(alt, 'avcC'), hvcC: bul(alt, 'hvcC'), donus: donus };
    });
    if (!iz) throw new Error('mp4: görüntü izi yok');
    var ornek = [], i, j;
    // 1) düz MP4: örnek tabloları
    var stsz = bul(iz.st, 'stsz'), say = stsz ? v.getUint32(stsz.ic + 8) : 0;
    if (say > 0) {
      var sabit = v.getUint32(stsz.ic + 4), boy = [];
      for (i = 0; i < say; i++) boy.push(sabit || v.getUint32(stsz.ic + 12 + i * 4));
      var stco = bul(iz.st, 'stco'), co64 = bul(iz.st, 'co64'), parca = [];
      if (stco) for (i = 0; i < v.getUint32(stco.ic + 4); i++) parca.push(v.getUint32(stco.ic + 8 + i * 4));
      else if (co64) for (i = 0; i < v.getUint32(co64.ic + 4); i++) parca.push(u64(co64.ic + 8 + i * 8));
      var stsc = bul(iz.st, 'stsc'), sc = [];
      for (i = 0; i < v.getUint32(stsc.ic + 4); i++) sc.push([v.getUint32(stsc.ic + 8 + i * 12), v.getUint32(stsc.ic + 12 + i * 12)]);
      var stts = bul(iz.st, 'stts'), sureler = [];
      for (i = 0; i < v.getUint32(stts.ic + 4); i++) for (j = 0; j < v.getUint32(stts.ic + 8 + i * 8); j++) sureler.push(v.getUint32(stts.ic + 12 + i * 8));
      var ctts = bul(iz.st, 'ctts'), kay = [];
      if (ctts) { var cv = v.getUint8(ctts.ic); for (i = 0; i < v.getUint32(ctts.ic + 4); i++) for (j = 0; j < v.getUint32(ctts.ic + 8 + i * 8); j++) kay.push(cv ? v.getInt32(ctts.ic + 12 + i * 8) : v.getUint32(ctts.ic + 12 + i * 8)); }
      var stss = bul(iz.st, 'stss'), anahtar = null;
      if (stss) { anahtar = {}; for (i = 0; i < v.getUint32(stss.ic + 4); i++) anahtar[v.getUint32(stss.ic + 8 + i * 4) - 1] = 1; }
      var n = 0, dts = 0;
      for (var p = 0; p < parca.length && n < say; p++) {
        var kac = sc[0][1]; for (j = 0; j < sc.length; j++) if (sc[j][0] <= p + 1) kac = sc[j][1];
        var ofs = parca[p];
        for (j = 0; j < kac && n < say; j++, n++) {
          ornek.push({ ofs: ofs, boy: boy[n], dts: dts, cts: dts + (kay[n] || 0), anahtar: anahtar ? !!anahtar[n] : true, sure: sureler[n] || sureler[sureler.length - 1] || 0 });
          ofs += boy[n]; dts += sureler[n] || 0;
        }
      }
    }
    // 2) parçalı MP4 (MediaRecorder): moof + mdat
    var t = 0;
    ust.forEach(function (moof) {
      if (moof.t !== 'moof') return;
      cocuk(moof.ic, moof.son).forEach(function (traf) {
        if (traf.t !== 'traf') return;
        var tl = cocuk(traf.ic, traf.son), tfhd = bul(tl, 'tfhd'); if (!tfhd) return;
        var fl = v.getUint32(tfhd.ic) & 0xffffff, kim = v.getUint32(tfhd.ic + 4), q = tfhd.ic + 8, d = trex[kim] || { sure: 0, boy: 0, bayrak: 0 };
        if (kim !== iz.id) return;
        var taban = moof.o; if (fl & 1) { taban = u64(q); q += 8; }
        if (fl & 2) q += 4;
        var vSure = d.sure, vBoy = d.boy, vBay = d.bayrak;
        if (fl & 8) { vSure = v.getUint32(q); q += 4; }
        if (fl & 0x10) { vBoy = v.getUint32(q); q += 4; }
        if (fl & 0x20) { vBay = v.getUint32(q); q += 4; }
        var tfdt = bul(tl, 'tfdt'); if (tfdt) t = v.getUint8(tfdt.ic) === 1 ? u64(tfdt.ic + 4) : v.getUint32(tfdt.ic + 4);
        var konum = taban;
        tl.forEach(function (tr) {
          if (tr.t !== 'trun') return;
          var rv = v.getUint8(tr.ic), rf = v.getUint32(tr.ic) & 0xffffff, adet = v.getUint32(tr.ic + 4), r = tr.ic + 8, ilkBay = null;
          if (rf & 1) { konum = taban + v.getInt32(r); r += 4; }
          if (rf & 4) { ilkBay = v.getUint32(r); r += 4; }
          for (var s = 0; s < adet; s++) {
            var su = vSure, bo = vBoy, ba = s === 0 && ilkBay != null ? ilkBay : vBay, ct = 0;
            if (rf & 0x100) { su = v.getUint32(r); r += 4; }
            if (rf & 0x200) { bo = v.getUint32(r); r += 4; }
            if (rf & 0x400) { ba = v.getUint32(r); r += 4; }
            if (rf & 0x800) { ct = rv ? v.getInt32(r) : v.getUint32(r); r += 4; }
            if (konum + bo <= N) ornek.push({ ofs: konum, boy: bo, dts: t, cts: t + ct, anahtar: !((ba >> 16) & 1), sure: su });
            konum += bo; t += su;
          }
        });
      });
    });
    if (!ornek.length) throw new Error('mp4: örnek yok');
    var kod = null, aciklama = null;
    if (iz.avcC) {
      aciklama = new Uint8Array(buf.slice(iz.avcC.ic, iz.avcC.son));
      var h2 = function (x) { return ('0' + x.toString(16)).slice(-2); };
      kod = 'avc1.' + h2(aciklama[1]) + h2(aciklama[2]) + h2(aciklama[3]);
    }
    var sonO = ornek[ornek.length - 1];
    return { kod: kod, aciklama: aciklama, tur: iz.tur, g: iz.g, y: iz.y, olcek: iz.olcek, donus: iz.donus, ornekler: ornek, sure: (sonO.cts + (sonO.sure || 0)) / iz.olcek };
  }
  S.mp4Oku = mp4Oku;

  /* ================= yüz videosu: WebCodecs ile sırayla çözme ================= */
  // kayit: { veri: ArrayBuffer, mime }. ilerle(t) t saniyesindeki kare hazır olana dek çözer; kare(t) o kareyi verir.
  function YuzCozucu(kayit) { this.k = kayit; this.kuyruk = []; this.i = 0; this.bitti = false; this.hata = null; this.bekleyen = null; }
  YuzCozucu.destek = function () { return !!(window.VideoDecoder && window.EncodedVideoChunk); };
  YuzCozucu.prototype.hazirla = function () {
    var self = this;
    if (this.soz) return this.soz;
    return (this.soz = Promise.resolve().then(function () {
      if (!YuzCozucu.destek()) throw new Error('VideoDecoder yok');
      var m = self.m = mp4Oku(self.k.veri);
      if (!m.kod) throw new Error('desteklenmeyen kodlama: ' + m.tur);
      var cfg = { codec: m.kod, description: m.aciklama, codedWidth: m.g, codedHeight: m.y };
      return VideoDecoder.isConfigSupported(cfg).then(function (s) {
        if (!s || !s.supported) throw new Error('çözülemiyor: ' + m.kod);
        var uyan = function () { if (self.bekleyen) { var b = self.bekleyen; self.bekleyen = null; b(); } };
        self.dec = new VideoDecoder({ output: function (f) { self.kuyruk.push(f); uyan(); }, error: function (e) { self.hata = e || new Error('çözme hatası'); uyan(); } });
        self.dec.configure(cfg);
      });
    }));
  };
  YuzCozucu.prototype.besle = function (i) {
    var o = this.m.ornekler[i], ol = this.m.olcek;
    this.dec.decode(new EncodedVideoChunk({ type: o.anahtar ? 'key' : 'delta', timestamp: Math.round(o.cts / ol * 1e6), duration: Math.round((o.sure || 0) / ol * 1e6), data: new Uint8Array(this.k.veri, o.ofs, o.boy) }));
  };
  YuzCozucu.prototype.ilerle = function (t) {
    var self = this, us = t * 1e6;
    var dongu = function () {
      if (self.hata) throw self.hata;
      while (self.kuyruk.length > 1 && self.kuyruk[1].timestamp <= us) self.kuyruk.shift().close();
      var son = self.kuyruk[self.kuyruk.length - 1];
      if ((son && son.timestamp > us) || self.bitti) return null;
      if (self.i < self.m.ornekler.length) {
        while (self.i < self.m.ornekler.length && self.dec.decodeQueueSize < 8) self.besle(self.i++);
        return new Promise(function (r) { self.bekleyen = r; setTimeout(r, 30); }).then(dongu);
      }
      if (!self.bosalt) self.bosalt = self.dec.flush().then(function () { self.bitti = true; }, function () { self.bitti = true; });
      return self.bosalt.then(dongu);
    };
    return this.hazirla().then(dongu);
  };
  YuzCozucu.prototype.hazirMi = function (t) { // t anının karesi çözülmüş mü (ya da dosya bitti mi)
    if (this.hata) return true; if (!this.m) return false;
    var son = this.kuyruk[this.kuyruk.length - 1]; return this.bitti || !!(son && son.timestamp > t * 1e6);
  };
  YuzCozucu.prototype.kare = function (t) {
    var us = t * 1e6, k = null;
    for (var i = 0; i < this.kuyruk.length; i++) { if (this.kuyruk[i].timestamp <= us) k = this.kuyruk[i]; else break; }
    return k || this.kuyruk[0] || null;
  };
  YuzCozucu.prototype.kapat = function () {
    this.kuyruk.forEach(function (f) { try { f.close(); } catch (e) {} }); this.kuyruk = [];
    try { if (this.dec && this.dec.state !== 'closed') this.dec.close(); } catch (e) {}
  };
  S.YuzCozucu = YuzCozucu;

  /* ================= gerçek zamanlı yol: <video> ile oynatma ================= */
  function YuzOynatici(kayit) {
    var v = this.v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.preload = 'auto';
    this.url = URL.createObjectURL(new Blob([kayit.veri], { type: kayit.mime || 'video/mp4' }));
    v.src = this.url; this.basladi = false;
  }
  YuzOynatici.prototype.ilerle = function () { return Promise.resolve(); };
  YuzOynatici.prototype.kare = function (t) {
    var v = this.v;
    if (!this.basladi) { this.basladi = true; try { v.currentTime = Math.max(0, t); } catch (e) {} var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    else if (Math.abs(v.currentTime - t) > 0.25) { try { v.currentTime = Math.max(0, t); } catch (e) {} }
    return v.readyState >= 2 && v.videoWidth ? v : null;
  };
  YuzOynatici.prototype.kapat = function () { try { this.v.pause(); this.v.removeAttribute('src'); this.v.load(); } catch (e) {} URL.revokeObjectURL(this.url); };

  /* ================= kameradan gerçek video kaydı ================= */
  S.videoKaydedici = {
    tip: function () {
      if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return null;
      var l = ['video/mp4;codecs=avc1.640028', 'video/mp4;codecs=avc1.4d0028', 'video/mp4;codecs=avc1', 'video/mp4'];
      for (var i = 0; i < l.length; i++) { try { if (MediaRecorder.isTypeSupported(l[i])) return l[i]; } catch (e) {} }
      return null;
    },
    var: function () { return !!this.tip() && YuzCozucu.destek(); },
    basla: function (akis) {
      var tip = this.tip(), iz = akis && akis.getVideoTracks()[0];
      if (!tip || !iz) return null;
      var ay = iz.getSettings ? iz.getSettings() : {}, buyuk = Math.max(ay.width || 0, ay.height || 0);
      var mr; try { mr = new MediaRecorder(new MediaStream([iz]), { mimeType: tip, videoBitsPerSecond: buyuk >= 1600 ? 6000000 : 3500000 }); } catch (e) { return null; }
      var parca = [], t0 = performance.now();
      mr.ondataavailable = function (e) { if (e.data && e.data.size) parca.push(e.data); };
      mr.onstart = function () { t0 = performance.now(); };
      mr.start(1000);
      return {
        t0: function () { return t0; },
        durdur: function () {
          return new Promise(function (res) {
            mr.onstop = function () { var b = new Blob(parca, { type: (mr.mimeType || tip).split(';')[0] }); res({ blob: b, mime: b.type, sure: (performance.now() - t0) / 1000, g: ay.width || 0, y: ay.height || 0 }); };
            try { mr.stop(); } catch (e) { res(null); }
          });
        }
      };
    }
  };

  /* ================= videonun her anı için yüz karesi ================= */
  // o: { Z: zaman çizelgesi adımları, sonuc: adım sesleri (kirpBas), var: [adımda yüz var mı], al(k): Promise<{tur:'video', veri, mime, fark} | {tur:'kare', cozum, fark:0} | null>, canli: bool, foto: resim|null }
  S.yuzSaglayici = function (o) {
    var Z = o.Z, oturum = {}, sozler = {};
    var tut = document.createElement('canvas'), tutC = tut.getContext('2d'), tutDolu = false;
    var adim = function (t) { var k = -1; for (var i = 0; i < Z.length; i++) { if ((Z[i].gor != null ? Z[i].gor : Z[i].bas) <= t) k = i; else break; } return Math.max(0, k); };
    var anda = function (kk, t) { // kalemle kaydedilmiş adımda sessiz çizilen anlar da (öncesi, sonrası) videodan gelir
      var z = Z[kk], x = o.sonuc[kk] && o.sonuc[kk].ana, kb = x && x.kirpBas || 0;
      if (z.kalemli) return Math.max(0, Math.min(t, z.bas + z.sure + (z.ek || 0)) - z.bas + kb);
      return Math.max(0, Math.min(t, z.bas + z.sure) - z.bas) + kb;
    };
    var ac = function (kk) { // adımın oturumu: söz döner, oturum[kk] hazır olunca dolar
      if (oturum[kk] !== undefined) return Promise.resolve(oturum[kk]);
      if (sozler[kk]) return sozler[kk];
      return (sozler[kk] = Promise.resolve(o.al(kk)).then(function (r) {
        var s = null;
        if (r && r.tur === 'video') s = o.canli ? new YuzOynatici(r) : new YuzCozucu(r);
        else if (r && r.tur === 'kare') s = { cozum: r.cozum, ilerle: function () { return Promise.resolve(); }, kare: function (t) { return o.kareBul(r.cozum, t); }, kapat: function () { o.kareBirak(r.cozum); } };
        if (s) s.fark = r.fark || 0;
        oturum[kk] = s; delete sozler[kk]; return s;
      }, function () { oturum[kk] = null; delete sozler[kk]; return null; }));
    };
    var birak = function (sinir) { Object.keys(oturum).forEach(function (k) { if (+k < sinir) { if (oturum[k]) oturum[k].kapat(); delete oturum[k]; } }); };
    var boyut = function (im) { return im.displayWidth ? [im.displayWidth, im.displayHeight] : im.videoWidth ? [im.videoWidth, im.videoHeight] : [im.naturalWidth || im.width, im.naturalHeight || im.height]; };
    var sakla = function (im, donus) { // son kare kalıcı bir tuvale kopyalanır: VideoFrame'ler hemen bırakılabilir, aralarda o görünür
      var b = boyut(im), k = Math.min(1, 1280 / Math.max(b[0], b[1])), yan = donus === 90 || donus === 270; // donus: kayıttaki döndürme bilgisi
      var w = Math.max(2, Math.round(b[0] * k)), h = Math.max(2, Math.round(b[1] * k)), W = yan ? h : w, H = yan ? w : h;
      if (tut.width !== W || tut.height !== H) { tut.width = W; tut.height = H; }
      try {
        tutC.setTransform(1, 0, 0, 1, 0, 0);
        if (donus) { tutC.translate(W / 2, H / 2); tutC.rotate(donus * Math.PI / 180); tutC.drawImage(im, -w / 2, -h / 2, w, h); tutC.setTransform(1, 0, 0, 1, 0, 0); }
        else tutC.drawImage(im, 0, 0, w, h);
        tutDolu = true;
      } catch (e) {}
    };
    return {
      var: o.var.some(Boolean),
      // çevrimdışı kodlama: o anki kare hazır olmadan çizilmesin
      hazirla: function (t) {
        var kk = adim(t); birak(kk - 1);
        if (!o.var[kk]) return null;
        var s = oturum[kk];
        if (s === undefined) return ac(kk).then(function (s2) { return s2 ? s2.ilerle(anda(kk, t) + s2.fark).catch(function () { o.var[kk] = false; }) : null; });
        if (!s) return null;
        var an = anda(kk, t) + s.fark;
        if (!s.hazirMi || s.hazirMi(an)) return null;
        return s.ilerle(an).catch(function () { o.var[kk] = false; });
      },
      kaynak: function (t, k) {
        var kk = Math.max(0, k), z = k >= 0 ? Z[k] : null, konus = !!(z && t >= z.bas && t < z.bas + z.sure);
        if (o.canli) birak(kk - 1);
        if (kk + 1 < Z.length && o.var[kk + 1] && t >= Z[kk + 1].bas0 - 1.5) ac(kk + 1);
        if (o.var[kk]) {
          var s = oturum[kk];
          if (s === undefined) ac(kk);
          else if (s) { var f = s.kare(anda(kk, t) + s.fark); if (f) { sakla(f, (s.m && s.m.donus) || 0); return { im: tut, g: tut.width, y: tut.height, konus: konus, canli: true }; } }
        }
        if (o.foto) { var b = boyut(o.foto); return { im: o.foto, g: b[0], y: b[1], konus: konus, foto: true }; }
        if (tutDolu) return { im: tut, g: tut.width, y: tut.height, konus: konus };
        return null;
      },
      kapat: function () { birak(Infinity); }
    };
  };

  /* ================= biçimler ve yerleşimler ================= */
  S.BICIMLER = {
    reels: { ad: 'Reels · Shorts', alt: '9:16 dikey', G: 1080, Y: 1920, fps: 30, bit: 8000000, yer: ['bolunmus', 'kart'] },
    yt: { ad: 'YouTube', alt: '16:9 · 1080p', G: 1920, Y: 1080, fps: 30, bit: 8000000, yer: ['kose', 'yan', 'pencere'] },
    gonderi: { ad: 'Gönderi', alt: '4:5', G: 1080, Y: 1350, fps: 30, bit: 7000000, yer: ['bolunmus'] },
    hizli: { ad: 'Hızlı', alt: '16:9 · 720p', G: 1280, Y: 720, fps: 25, bit: 1200000, yer: ['kose'] }
  };
  S.YERLESIM_ADI = { bolunmus: 'Üstte tahta, altta yüz', kart: 'Tahta kartı, büyük yüz', kose: 'Köşede yuvarlak', yan: 'Yan yana', pencere: 'Büyük pencere' };
  // kutu: { x, y, g, h }; tahta kutusunda takip: yazılan yeri izleyen yakın çekim
  S.yerlesim = function (ad, G, Y, yuzVar) {
    var L = { ad: ad, arka: '#14110F' };
    if (!yuzVar && ad !== 'kose' && ad !== 'uzun') ad = G > Y ? 'tam' : 'tahta';
    if (ad === 'kose' || ad === 'tam') { L.tahta = { x: 0, y: 0, g: G, h: Y, tam: true }; L.alt = { cx: G / 2, y: Y - Math.round(Y * 0.13), fs: Math.round(Y * (G > Y ? 0.046 : 0.034)), g: G * 0.8, serit: true }; }
    else if (ad === 'yan') {
      var tg = Math.round(G * 0.66);
      L.tahta = { x: 0, y: 0, g: tg, h: Y, takip: true, yak: 1.05 };
      L.yuz = { x: tg, y: 0, g: G - tg, h: Y, ay: 0.38 };
      L.alt = { cx: tg / 2, y: Y - Math.round(Y * 0.12), fs: Math.round(Y * 0.046), g: tg * 0.86, serit: true };
    } else if (ad === 'pencere') {
      L.tahta = { x: 0, y: 0, g: G, h: Y, tam: true };
      var pw = Math.round(G * 0.2), ph = Math.round(pw * 4 / 3);
      L.yuz = { x: G - pw - Math.round(G * 0.02), y: Y - ph - Math.round(Y * 0.04), g: pw, h: ph, r: Math.round(pw * 0.08), kenar: true, ay: 0.38 }; L.yuzSonra = true;
      L.alt = { cx: (G - pw) / 2, y: Y - Math.round(Y * 0.11), fs: Math.round(Y * 0.046), g: (G - pw) * 0.82, serit: true };
    } else if (ad === 'bolunmus') {
      var th = Math.round(Y * (G / Y < 0.7 ? 0.56 : 0.6));
      L.tahta = { x: 0, y: 0, g: G, h: th, takip: true, yak: 1 };
      L.yuz = { x: 0, y: th, g: G, h: Y - th, ay: 0.36 };
      L.alt = { cx: G / 2, y: th, fs: Math.round(G * 0.064), g: G * 0.9, serit: true };
    } else if (ad === 'kart') {
      var m = Math.round(G * 0.04), kh = Math.round((G - 2 * m) * 0.64), ky = Math.round(Y * 0.07);
      L.yuzArka = true;
      L.yuz = { x: 0, y: ky + kh - Math.round(Y * 0.02), g: G, h: Y - (ky + kh) + Math.round(Y * 0.02), ay: 0.34, solma: true };
      L.tahta = { x: m, y: ky, g: G - 2 * m, h: kh, takip: true, yak: 1.25, r: Math.round(G * 0.03), golge: true };
      L.alt = { cx: G / 2, y: Math.round(Y * 0.74), fs: Math.round(G * 0.064), g: G * 0.9 };
    } else if (ad === 'uzun') { // yüzsüz dikey ekran kaydı: sayfa ekranın büyük kısmını kaplar
      var uy = Math.round(Y * 0.085), ua = Math.round(Y * 0.055);
      L.tahta = { x: 0, y: uy, g: G, h: Y - uy - ua, takip: true, yak: 1 };
      L.alt = { cx: G / 2, y: Y - ua - Math.round(Y * 0.06), fs: Math.round(G * 0.06), g: G * 0.9, serit: true };
    } else { // tahta: yüz yokken dikey video
      var hy = Math.round(Y * 0.16), hh = Math.min(Y - hy - Math.round(Y * 0.22), Math.round(G * 1.05));
      L.tahta = { x: 0, y: hy, g: G, h: hh, takip: true, yak: 1 };
      L.alt = { cx: G / 2, y: hy + hh + Math.round(Y * 0.07), fs: Math.round(G * 0.064), g: G * 0.9 };
    }
    return L;
  };

  /* ================= çizim yardımcıları ================= */
  function yuvarlak(c, x, y, w, h, r) {
    r = Math.max(0, Math.min(r || 0, w / 2, h / 2));
    c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r); c.lineTo(x + w, y + h - r);
    c.quadraticCurveTo(x + w, y + h, x + w - r, y + h); c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r); c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath();
  }
  // kaynağı kutuyu dolduracak biçimde kırpıp çizer; ax, ay: kırpmanın kayacağı yön (0..1)
  function kapla(c, im, sg, sy, R, ax, ay, olcek) {
    var rs = R.g / R.h, w, h;
    if (sg / sy > rs) { h = sy; w = h * rs; } else { w = sg; h = w / rs; }
    if (olcek && olcek > 1) { w /= olcek; h /= olcek; }
    var x = (sg - w) * (ax == null ? 0.5 : ax), y = (sy - h) * (ay == null ? 0.5 : ay);
    try { c.drawImage(im, x, y, w, h, R.x, R.y, R.g, R.h); } catch (e) {}
  }
  S.kapla = kapla; S.yuvarlak = yuvarlak;

  /* ================= altyazı ================= */
  // Kelimeler konuşma süresine harf sayısıyla dağıtılır; ekranda aynı anda 2-4 kelimelik bir grup görünür.
  function altyaziGruplari(metin, enCok) {
    var kel = [], re = /\S+/g, m;
    while ((m = re.exec(metin))) kel.push({ t: m[0], bas: m.index, son: m.index + m[0].length });
    var gr = [], su = [], uz = 0;
    kel.forEach(function (k) {
      if (su.length && (su.length >= 4 || uz + k.t.length > enCok || /[.!?:;]$/.test(su[su.length - 1].t))) { gr.push(su); su = []; uz = 0; }
      su.push(k); uz += k.t.length + 1;
    });
    if (su.length) gr.push(su);
    return gr;
  }
  S.altyaziCizici = function (c, stil) {
    var onbellek = {};
    return function (A, a, t) { // a: { metin, p }
      if (!a || !a.metin || stil === 'yok') return;
      var gr = onbellek[a.metin] || (onbellek[a.metin] = altyaziGruplari(a.metin, 20)), uz = Math.max(1, a.metin.length);
      var ci = Math.max(0, Math.min(uz - 1, a.p * uz * 1.04)), g = null, gi = 0, i;
      for (i = 0; i < gr.length; i++) { var son = gr[i][gr[i].length - 1].son; if (ci <= son || i === gr.length - 1) { g = gr[i]; gi = i; break; } }
      if (!g) return;
      var fs = A.fs; c.save(); c.font = '800 ' + fs + 'px ' + UI; c.textBaseline = 'middle'; c.lineJoin = 'round';
      var bos = c.measureText(' ').width, gen = g.map(function (k) { return c.measureText(k.t).width; }), top = gen.reduce(function (x, y) { return x + y; }, 0) + bos * (g.length - 1);
      while (top > A.g && fs > 18) { fs = Math.round(fs * 0.92); c.font = '800 ' + fs + 'px ' + UI; bos = c.measureText(' ').width; gen = g.map(function (k) { return c.measureText(k.t).width; }); top = gen.reduce(function (x, y) { return x + y; }, 0) + bos * (g.length - 1); }
      var x = A.cx - top / 2, y = A.y;
      if (A.serit) { c.fillStyle = 'rgba(20,17,15,.78)'; yuvarlak(c, x - fs * 0.5, y - fs * 0.78, top + fs, fs * 1.56, fs * 0.36); c.fill(); }
      var ilk = gr.slice(0, gi).reduce(function (s, q) { return s + q.length; }, 0);
      g.forEach(function (k, j) {
        var su = ci >= k.bas && ci < k.son + 1, w = gen[j], cx = x + w / 2;
        c.save(); c.translate(cx, y);
        if (su) { var pop = 1.06; c.scale(pop, pop); }
        if (!A.serit) { c.lineWidth = Math.max(4, fs * 0.17); c.strokeStyle = 'rgba(10,8,6,.88)'; c.strokeText(k.t, -w / 2, 0); }
        c.fillStyle = su ? '#FFC93C' : '#FFFFFF'; c.fillText(k.t, -w / 2, 0);
        c.restore(); x += w + bos;
      });
      c.restore();
      return ilk;
    };
  };

  /* ================= stüdyo görünümü: ışık, renk, arka plan =================
     Arka planı ayırmak için kişi maskesi gerekir: MediaPipe'ın selfie modeli (ilk kullanımda indirilir).
     Maske alınamazsa yalnız ışık ve renk düzenlenir. */
  var MP_SURUMLER = ['0.10.14', '0.10.21', '0.10.18']; // biri açılmazsa ötekisi
  var MP_MODEL = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite';
  var ayiriciSoz = null;
  function dinamikYukle(u) { return (new Function('u', 'return import(u)'))(u); }
  S.ayiriciYukle = function () { // { maske(tuval) → { veri: Float32Array (0–1), g, y } | null }
    if (window.SesliStudyoTestAyirici) return Promise.resolve(window.SesliStudyoTestAyirici);
    if (ayiriciSoz) return ayiriciSoz;
    var kok = '';
    ayiriciSoz = MP_SURUMLER.reduce(function (zincir, sr) {
      return zincir.catch(function () { kok = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@' + sr; return dinamikYukle(kok + '/vision_bundle.mjs'); });
    }, Promise.reject(new Error('başla'))).then(function (m) {
      return m.FilesetResolver.forVisionTasks(kok + '/wasm').then(function (fs) {
        var ac = function (d) { return m.ImageSegmenter.createFromOptions(fs, { baseOptions: { modelAssetPath: MP_MODEL, delegate: d }, runningMode: 'VIDEO', outputCategoryMask: false, outputConfidenceMasks: true }); };
        return ac('GPU').catch(function () { return ac('CPU'); });
      });
    }).then(function (seg) {
      var ts = 0;
      return {
        maske: function (kaynak) {
          var out = null;
          ts = Math.max(ts + 1, Math.round(performance.now()));
          seg.segmentForVideo(kaynak, ts, function (r) {
            var L = r && r.confidenceMasks; if (!L || !L.length) return;
            var mk = L[L.length - 1]; // tek kanal: kişi; iki kanal: [arka plan, kişi]
            out = { veri: mk.getAsFloat32Array().slice(0), g: mk.width, y: mk.height };
          });
          return out;
        }
      };
    });
    ayiriciSoz.catch(function () { ayiriciSoz = null; });
    return ayiriciSoz;
  };
  // o: { isik: bool, arka: 'yok' | 'bulanik' | 'studyo', ayirici }
  // isle(...) → yüz alanının (G×Y) ışığı, rengi ve arka planı düzenlenmiş tuvali (her karede aynı tuval kullanılır)
  S.gorunum = function (o) {
    var T = {}, fonlar = {}, gecmis = null, sonMaske = null, sonMaskeT = -9, sonMaskeB = '';
    var tv = function (ad, g, y) { var c = T[ad] || (T[ad] = document.createElement('canvas')); if (c.width !== g) c.width = g; if (c.height !== y) c.height = y; return c; };
    var studyoFonu = function (G, Y) { // koyu stüdyo zemini: arkada sıcak bir spot, yanda soğuk ışık, yumuşak ışık lekeleri
      var k = G + 'x' + Y; if (fonlar[k]) return fonlar[k];
      var c = document.createElement('canvas'); c.width = G; c.height = Y;
      var x = c.getContext('2d'), M = Math.max(G, Y), g = x.createLinearGradient(0, 0, 0, Y);
      g.addColorStop(0, '#2A3442'); g.addColorStop(0.6, '#161C25'); g.addColorStop(1, '#0D1117'); x.fillStyle = g; x.fillRect(0, 0, G, Y);
      var s = x.createRadialGradient(G * 0.5, Y * 0.36, 0, G * 0.5, Y * 0.36, M * 0.56);
      s.addColorStop(0, 'rgba(255,170,110,.32)'); s.addColorStop(0.5, 'rgba(255,140,80,.10)'); s.addColorStop(1, 'rgba(255,140,80,0)'); x.fillStyle = s; x.fillRect(0, 0, G, Y);
      var m = x.createRadialGradient(G * 0.04, Y * 0.24, 0, G * 0.04, Y * 0.24, M * 0.5);
      m.addColorStop(0, 'rgba(90,150,255,.18)'); m.addColorStop(1, 'rgba(90,150,255,0)'); x.fillStyle = m; x.fillRect(0, 0, G, Y);
      [[0.16, 0.2, 0.07, 'rgba(255,200,150,.11)'], [0.84, 0.16, 0.05, 'rgba(160,200,255,.11)'], [0.9, 0.56, 0.08, 'rgba(255,180,120,.07)'], [0.1, 0.64, 0.06, 'rgba(140,190,255,.07)'], [0.7, 0.07, 0.035, 'rgba(255,230,200,.13)']].forEach(function (b) {
        var r = M * b[2], bx = G * b[0], by = Y * b[1], gg = x.createRadialGradient(bx, by, 0, bx, by, r);
        gg.addColorStop(0, b[3]); gg.addColorStop(0.72, b[3]); gg.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gg; x.beginPath(); x.arc(bx, by, r, 0, Math.PI * 2); x.fill();
      });
      return (fonlar[k] = c);
    };
    var maskeYap = function (kare, G, Y) { // kişi maskesi: yumuşak kenarlı, kareler arasında titremesin diye ortalanır
      var oc = 256 / Math.max(G, Y), gw = Math.max(16, Math.round(G * oc)), gh = Math.max(16, Math.round(Y * oc));
      var gc = tv('giris', gw, gh); gc.getContext('2d').drawImage(kare, 0, 0, gw, gh);
      var m = null; try { m = o.ayirici.maske(gc); } catch (e) { m = null; }
      if (!m || !m.veri || !m.g || !m.y || m.veri.length < m.g * m.y) return null;
      var v = m.veri, W = m.g, H = m.y, n = W * H, i, x, y, orta = 0, ks = 0, kose = 0, ss = 0;
      for (y = Math.floor(H * 0.3); y < H * 0.7; y += 2) for (x = Math.floor(W * 0.35); x < W * 0.65; x += 2) { orta += v[y * W + x]; ks++; }
      for (y = 0; y < H * 0.15; y += 2) for (x = 0; x < W * 0.15; x += 2) { kose += v[y * W + x] + v[y * W + (W - 1 - x)]; ss += 2; }
      var ters = ks && ss && kose / ss > orta / ks + 0.1; // modelin çıktısı arka plan olasılığıysa çevrilir
      var yeni = !gecmis || gecmis.length !== n;
      if (yeni) gecmis = new Float32Array(n);
      var mc = tv('maske', W, H), mx = mc.getContext('2d'), id = mx.createImageData(W, H), d = id.data;
      for (i = 0; i < n; i++) {
        var a = ters ? 1 - v[i] : v[i];
        a = gecmis[i] = yeni ? a : gecmis[i] * 0.25 + a * 0.75;
        var s = (a - 0.3) / 0.42; s = s <= 0 ? 0 : s >= 1 ? 1 : s * s * (3 - 2 * s);
        d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = 255; d[i * 4 + 3] = Math.round(s * 255);
      }
      mx.putImageData(id, 0, 0);
      return mc;
    };
    // ana ışık yüzde, sıcak ton ve kenarlarda vinyet. Katmanlar boyuta göre bir kez çizilir; her karede yalnız iki çizim
    // ('lighter' ve 'source-over'): soft-light/multiply gibi karışımlar telefonda pahalı olabilir.
    var isikKat = {};
    var isikVer = function (c, G, Y) {
      var k = G + 'x' + Y, L = isikKat[k];
      if (!L) {
        var M = Math.max(G, Y), cx = G * 0.5, cy = Y * 0.4;
        var a = document.createElement('canvas'); a.width = G; a.height = Y; var ax = a.getContext('2d');
        var g = ax.createRadialGradient(cx, cy, 0, cx, cy, M * 0.62);
        g.addColorStop(0, 'rgba(255,236,214,.045)'); g.addColorStop(0.55, 'rgba(255,236,214,.015)'); g.addColorStop(1, 'rgba(255,236,214,0)');
        ax.fillStyle = g; ax.fillRect(0, 0, G, Y);
        var b = document.createElement('canvas'); b.width = G; b.height = Y; var bx = b.getContext('2d');
        bx.fillStyle = 'rgba(255,170,110,.05)'; bx.fillRect(0, 0, G, Y);
        var v = bx.createRadialGradient(cx, Y * 0.45, Math.min(G, Y) * 0.34, cx, Y * 0.45, M * 0.8);
        v.addColorStop(0, 'rgba(12,12,20,0)'); v.addColorStop(1, 'rgba(12,12,20,.34)'); bx.fillStyle = v; bx.fillRect(0, 0, G, Y);
        L = isikKat[k] = [a, b];
      }
      var x = c.getContext('2d');
      x.save();
      x.globalCompositeOperation = 'lighter'; x.drawImage(L[0], 0, 0);
      x.globalCompositeOperation = 'source-over'; x.drawImage(L[1], 0, 0);
      x.restore();
    };
    return {
      isle: function (im, sg, sy, G, Y, ax, ay, t, olcek) {
        G = Math.max(2, Math.round(G)); Y = Math.max(2, Math.round(Y));
        var kare = tv('kare', G, Y), kx = kare.getContext('2d'), rs = G / Y, w, h;
        if (sg / sy > rs) { h = sy; w = h * rs; } else { w = sg; h = w / rs; }
        if (olcek && olcek > 1) { w /= olcek; h /= olcek; }
        kx.globalCompositeOperation = 'source-over'; kx.globalAlpha = 1;
        try { kx.drawImage(im, (sg - w) * (ax == null ? 0.5 : ax), (sy - h) * (ay == null ? 0.5 : ay), w, h, 0, 0, G, Y); } catch (e) {}
        var cik = kare;
        if (o.ayirici && o.arka && o.arka !== 'yok') {
          // kişi maskesi saniyede 10 kez yenilenir (her karede çıkarmak telefonda en pahalı iş); aradaki karelerde son maske kullanılır
          var mb = G + 'x' + Y, mk;
          if (t != null && sonMaske && sonMaskeB === mb && t >= sonMaskeT && t - sonMaskeT < 0.095) mk = sonMaske;
          else { mk = maskeYap(kare, G, Y); sonMaske = mk; sonMaskeT = t != null ? t : -9; sonMaskeB = mb; }
          if (mk) {
            var son = tv('son', G, Y), sx = son.getContext('2d');
            sx.globalCompositeOperation = 'source-over'; sx.globalAlpha = 1; sx.imageSmoothingEnabled = true; sx.imageSmoothingQuality = 'high';
            if (o.arka === 'studyo') sx.drawImage(studyoFonu(G, Y), 0, 0);
            else { // bulanık: küçültüp büyütmek pahalı objektiflerdeki alan derinliği gibi yumuşatır
              var b1 = tv('b1', Math.max(8, Math.round(G / 6)), Math.max(8, Math.round(Y / 6))), b2 = tv('b2', Math.max(4, Math.round(G / 18)), Math.max(4, Math.round(Y / 18)));
              var b1x = b1.getContext('2d'), b2x = b2.getContext('2d');
              b1x.imageSmoothingQuality = b2x.imageSmoothingQuality = 'high';
              b1x.drawImage(kare, 0, 0, b1.width, b1.height); b2x.drawImage(b1, 0, 0, b2.width, b2.height); b1x.drawImage(b2, 0, 0, b1.width, b1.height);
              sx.drawImage(b1, 0, 0, G, Y); sx.fillStyle = 'rgba(12,14,20,.24)'; sx.fillRect(0, 0, G, Y);
            }
            var pr = tv('parla', Math.max(8, Math.round(G / 8)), Math.max(8, Math.round(Y / 8))), px = pr.getContext('2d'); // arkadan ışık: kenarlarda sıcak parıltı
            px.globalCompositeOperation = 'source-over'; px.clearRect(0, 0, pr.width, pr.height); px.drawImage(mk, 0, 0, pr.width, pr.height);
            px.globalCompositeOperation = 'source-in'; px.fillStyle = o.arka === 'studyo' ? '#FFC48C' : '#FFDCB4'; px.fillRect(0, 0, pr.width, pr.height);
            sx.save(); sx.globalCompositeOperation = 'lighter'; sx.globalAlpha = o.arka === 'studyo' ? 0.45 : 0.22; sx.drawImage(pr, G * 0.012, -Y * 0.012, G, Y); sx.restore();
            var ki = tv('kisi', G, Y), kix = ki.getContext('2d');
            kix.globalCompositeOperation = 'source-over'; kix.clearRect(0, 0, G, Y); kix.drawImage(kare, 0, 0);
            kix.globalCompositeOperation = 'destination-in'; kix.imageSmoothingEnabled = true; kix.imageSmoothingQuality = 'high'; kix.drawImage(mk, 0, 0, G, Y);
            kix.globalCompositeOperation = 'source-over';
            sx.drawImage(ki, 0, 0);
            cik = son;
          }
        }
        if (o.isik) isikVer(cik, G, Y);
        return cik;
      }
    };
  };

  /* ================= kompozitör ================= */
  // o: { bicim, yer, tahta: { tuval, kare(t), kalem() → [x, y] tahta tuvali pikselinde, sil() → true ise sayfa siliniyor },
  //      yuz: function (t) → { im, g, y } | null, yuzVar, altyazi: function (t) → { metin, p } | null, stil: 'buyuk' | 'klasik' | 'yok', fps,
  //      gorunum: S.gorunum(...) (yüzün ışığı ve arka planı) }
  S.kompozitor = function (o) {
    var G = o.bicim.G, Y = o.bicim.Y, tuval = document.createElement('canvas'); tuval.width = G; tuval.height = Y;
    var c = tuval.getContext('2d'), L = S.yerlesim(o.yer, G, Y, o.yuzVar), alt = S.altyaziCizici(c, o.stil), kam = null, dt = 1 / (o.fps || 30);
    var BT = o.tahta.tuval, BW = BT.width, BH = BT.height, B = o.tahta.alan; // B: tahtanın yazı alanı (tahta tuvali pikselinde)
    var arka = (function () { // koyu, hafif ışıklı stüdyo zemini
      var a = document.createElement('canvas'); a.width = G; a.height = Y; var x = a.getContext('2d');
      var gr = x.createLinearGradient(0, 0, 0, Y); gr.addColorStop(0, '#1B1F27'); gr.addColorStop(1, '#0E1015'); x.fillStyle = gr; x.fillRect(0, 0, G, Y);
      var rg = x.createRadialGradient(G * 0.5, Y * 0.42, 0, G * 0.5, Y * 0.42, Math.max(G, Y) * 0.7); rg.addColorStop(0, 'rgba(255,170,90,.10)'); rg.addColorStop(1, 'rgba(255,170,90,0)'); x.fillStyle = rg; x.fillRect(0, 0, G, Y);
      return a;
    })();
    var kirpBoyu = function (R) { // tahta tuvalinden R ile aynı en-boy oranında kırpma
      var ra = R.g / R.h, ch = BH, cw = ch * ra;
      if (cw > BW) { cw = BW; ch = cw / ra; }
      var yak = R.yak || 1; return [cw / yak, ch / yak];
    };
    var tahtaCiz = function (R) {
      if (R.tam) { c.drawImage(BT, 0, 0, BW, BH, R.x, R.y, R.g, R.h); return; }
      if (o.tahta.kendi) { // tahta çerçevesini kendisi kurar (ekran kaydının sanal kamerası): olduğu gibi yerleşir
        c.save();
        if (R.golge) { c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = R.r * 1.4; c.shadowOffsetY = R.r * 0.4; yuvarlak(c, R.x, R.y, R.g, R.h, R.r); c.fillStyle = '#fff'; c.fill(); c.shadowColor = 'transparent'; }
        if (R.r) { yuvarlak(c, R.x, R.y, R.g, R.h, R.r); c.clip(); }
        c.drawImage(BT, 0, 0, BW, BH, R.x, R.y, R.g, R.h);
        c.restore(); return;
      }
      var k = kirpBoyu(R), cw = k[0], ch = k[1], hedef = o.tahta.kalem();
      if (!kam) kam = { x: (B ? B.x : 0) + cw / 2 - (B ? B.x * 0.4 : 0), y: ch / 2, hx: null, hy: null };
      if (o.tahta.sil && o.tahta.sil()) { kam.hx = (B ? B.x : 0) + cw / 2 - (B ? B.x * 0.4 : 0); kam.hy = ch / 2; }
      else if (hedef) {
        if (kam.hx == null) { kam.hx = kam.x; kam.hy = kam.y; }
        if (Math.abs(hedef[0] - kam.hx) > cw * 0.28) kam.hx = hedef[0] + (hedef[0] > kam.hx ? -cw * 0.12 : cw * 0.12);
        if (Math.abs(hedef[1] - kam.hy) > ch * 0.3) kam.hy = hedef[1];
      }
      if (kam.hx != null) { var e = 1 - Math.exp(-dt * 3.2); kam.x += (kam.hx - kam.x) * e; kam.y += (kam.hy - kam.y) * e; }
      kam.x = Math.max(cw / 2, Math.min(BW - cw / 2, kam.x)); kam.y = Math.max(ch / 2, Math.min(BH - ch / 2, kam.y));
      c.save();
      if (R.golge) { c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = R.r * 1.4; c.shadowOffsetY = R.r * 0.4; yuvarlak(c, R.x, R.y, R.g, R.h, R.r); c.fillStyle = '#fff'; c.fill(); c.shadowColor = 'transparent'; }
      if (R.r) { yuvarlak(c, R.x, R.y, R.g, R.h, R.r); c.clip(); }
      c.drawImage(BT, kam.x - cw / 2, kam.y - ch / 2, cw, ch, R.x, R.y, R.g, R.h);
      c.restore();
    };
    var yuzCiz = function (R, t) {
      var s = o.yuz(t);
      c.save();
      if (R.r) { yuvarlak(c, R.x, R.y, R.g, R.h, R.r); c.clip(); } else { c.beginPath(); c.rect(R.x, R.y, R.g, R.h); c.clip(); }
      if (s) {
        var kb = s.foto ? 1 + 0.06 * ((t * 0.02) % 1) : 1; // fotoğrafta yavaş yakınlaşma
        if (o.gorunum) { var gp = o.gorunum.isle(s.im, s.g, s.y, R.g, R.h, 0.5, R.ay, t, kb); try { c.drawImage(gp, R.x, R.y, R.g, R.h); } catch (e) {} }
        else kapla(c, s.im, s.g, s.y, R, 0.5, R.ay, kb);
      } else { c.fillStyle = '#20242C'; c.fillRect(R.x, R.y, R.g, R.h); }
      if (R.solma) { var gr = c.createLinearGradient(0, R.y, 0, R.y + R.h * 0.18); gr.addColorStop(0, 'rgba(14,16,21,1)'); gr.addColorStop(1, 'rgba(14,16,21,0)'); c.fillStyle = gr; c.fillRect(R.x, R.y, R.g, R.h * 0.18); }
      c.restore();
      if (R.kenar) { c.save(); c.strokeStyle = 'rgba(255,255,255,.92)'; c.lineWidth = Math.max(3, R.g * 0.012); yuvarlak(c, R.x, R.y, R.g, R.h, R.r); c.stroke(); c.restore(); }
    };
    var yuzArka = function (t) { // kart yerleşiminde tüm zemin: yüzün koyulaştırılmış, büyütülmüş hâli
      var s = o.yuz(t); if (!s) return;
      c.save(); c.globalAlpha = 0.35; kapla(c, s.im, s.g, s.y, { x: 0, y: 0, g: G, h: Y }, 0.5, 0.4, 1.15); c.restore();
      c.fillStyle = 'rgba(14,16,21,.55)'; c.fillRect(0, 0, G, Y);
    };
    var kare = function (t) {
      o.tahta.kare(t);
      c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1;
      c.drawImage(arka, 0, 0);
      if (L.yuzArka) yuzArka(t);
      var once = L.yuz && !L.yuzSonra; // yüz önce çizilir; büyük pencerede tahtanın üstünde kalır
      if (once) yuzCiz(L.yuz, t);
      if (L.tahta) tahtaCiz(L.tahta);
      if (L.yuz && !once) yuzCiz(L.yuz, t);
      if (L.alt && o.stil === 'buyuk' && !(L.tahta.tam && o.klasikTahtada)) alt(L.alt, o.altyazi(t), t);
      if (o.ust) o.ust(c, t, L);
    };
    return { tuval: tuval, kare: kare, yerlesim: L };
  };
})();
