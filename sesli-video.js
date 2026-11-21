/* ============================================================
   SESLİ DERS · VİDEO — ekran kaydını (GoodNotes) ve kamera videosunu içe alma (Ronya)
   sesli-ders.js'ten önce yüklenir, window.SesliVideo üzerinden kullanılır.

   İçindekiler
     dosyaAc        MP4/MOV dosyasını belleğe almadan ayrıştırır: görüntü (H.264, HEVC) ve ses (AAC) izleri
     Kaynak         görüntüyü WebCodecs ile sırayla çözer; dosyayı parça parça okur
     sesOrnekleri   ses izinin AAC örnekleri (sesli-ders.js M4A'ya sarıp çözer)
     kare           tek kare (önizleme ve kırpma için)
     incele         kaydı tarar: kalemin yazdığı yerler, sayfa değişimleri, sayfanın rengi
     kamera         sanal kamera: yazılan yere yumuşakça yaklaşır, sayfa değişince geri çekilir
     tahta          kompozitör için tahta: ekran kaydının o anki görüntüsü, sanal kamerayla
     yuz            kompozitör için yüz: aynı anda çekilmiş kamera videosu
     esitle         iki kaydın sesinden aradaki kaymayı bulur
     konusma        baştaki ve sondaki sessizlik (kesme önerisi)
   ============================================================ */
(function () {
  'use strict';
  var S = window.SesliVideo = { surum: 1 };

  function oku(dosya, bas, son) {
    var b = dosya.slice(bas, son);
    if (b.arrayBuffer) return b.arrayBuffer();
    return new Promise(function (ok, red) { var r = new FileReader(); r.onload = function () { ok(r.result); }; r.onerror = function () { red(r.error); }; r.readAsArrayBuffer(b); });
  }
  function hata(m) { var e = new Error(m); e.kullanici = true; return e; }

  /* ================= MP4 / MOV ayrıştırıcı ================= */
  function ustKutular(dosya) { // en üst düzey kutular: yalnız başlıkları okunur
    var N = dosya.size, l = [];
    var adim = function (o) {
      if (o + 8 > N || l.length > 200) return Promise.resolve(l);
      return oku(dosya, o, Math.min(N, o + 16)).then(function (b) {
        var v = new DataView(b), n = v.getUint32(0), t = String.fromCharCode(v.getUint8(4), v.getUint8(5), v.getUint8(6), v.getUint8(7)), h = 8;
        if (n === 1) { if (b.byteLength < 16) return l; n = v.getUint32(8) * 4294967296 + v.getUint32(12); h = 16; } else if (n === 0) n = N - o;
        if (n < h) return l;
        l.push({ t: t, o: o, n: Math.min(n, N - o), h: h });
        return adim(o + n);
      });
    };
    return adim(0);
  }
  function hevcKod(tur, h) { // hvcC'den WebCodecs kodlama adı (ör. hvc1.1.6.L93.B0)
    var ps = h[1] >> 6, tier = (h[1] >> 5) & 1, prof = h[1] & 31, uyum = ((h[2] << 24) | (h[3] << 16) | (h[4] << 8) | h[5]) >>> 0, ters = 0, i;
    for (i = 0; i < 32; i++) { ters = ((ters << 1) | (uyum & 1)) >>> 0; uyum >>>= 1; }
    var kis = [h[6], h[7], h[8], h[9], h[10], h[11]]; while (kis.length && !kis[kis.length - 1]) kis.pop();
    return tur + '.' + ['', 'A', 'B', 'C'][ps] + prof + '.' + ters.toString(16).toUpperCase() + '.' + (tier ? 'H' : 'L') + h[12] +
      kis.map(function (b) { return '.' + ('0' + b.toString(16)).slice(-2).toUpperCase(); }).join('');
  }
  function moovCoz(buf) {
    var v = new DataView(buf), N = buf.byteLength;
    var tip = function (o) { return String.fromCharCode(v.getUint8(o), v.getUint8(o + 1), v.getUint8(o + 2), v.getUint8(o + 3)); };
    var u64 = function (o) { return v.getUint32(o) * 4294967296 + v.getUint32(o + 4); };
    var kutu = function (o, son) {
      if (o + 8 > son) return null;
      var n = v.getUint32(o), t = tip(o + 4), h = 8;
      if (n === 1) { if (o + 16 > son) return null; n = u64(o + 8); h = 16; } else if (n === 0) n = son - o;
      if (n < h) return null;
      if (o + n > son) n = son - o;
      return { t: t, o: o, ic: o + h, son: o + n };
    };
    var cocuk = function (o, son) { var l = [], k; while ((k = kutu(o, son))) { l.push(k); o = k.son; } return l; };
    var bul = function (l, t) { for (var i = 0; i < l.length; i++) if (l[i].t === t) return l[i]; return null; };
    var moov = kutu(0, N); if (!moov || moov.t !== 'moov') throw new Error('moov yok');
    var mc = cocuk(moov.ic, moov.son), mvhd = bul(mc, 'mvhd'), filmOlcek = 600;
    if (mvhd) filmOlcek = v.getUint32(mvhd.ic + (v.getUint8(mvhd.ic) === 1 ? 20 : 12)) || 600;
    var sonuc = { video: null, ses: null, sesler: [], parcali: !!bul(mc, 'mvex') };
    var tablo = function (st) { // örnek tablosu: dosyadaki yeri, boyu, zamanı
      var ornek = [], i, j, stsz = bul(st, 'stsz'), say = stsz ? v.getUint32(stsz.ic + 8) : 0;
      if (!say) return ornek;
      var sabit = v.getUint32(stsz.ic + 4), boy = new Array(say);
      for (i = 0; i < say; i++) boy[i] = sabit || v.getUint32(stsz.ic + 12 + i * 4);
      var stco = bul(st, 'stco'), co64 = bul(st, 'co64'), parca = [];
      if (stco) for (i = 0; i < v.getUint32(stco.ic + 4); i++) parca.push(v.getUint32(stco.ic + 8 + i * 4));
      else if (co64) for (i = 0; i < v.getUint32(co64.ic + 4); i++) parca.push(u64(co64.ic + 8 + i * 8));
      var stsc = bul(st, 'stsc'), sc = [];
      if (stsc) for (i = 0; i < v.getUint32(stsc.ic + 4); i++) sc.push([v.getUint32(stsc.ic + 8 + i * 12), v.getUint32(stsc.ic + 12 + i * 12)]);
      if (!sc.length) sc.push([1, 1]);
      var stts = bul(st, 'stts'), sureler = [];
      if (stts) for (i = 0; i < v.getUint32(stts.ic + 4); i++) { var sn = v.getUint32(stts.ic + 8 + i * 8), sd = v.getUint32(stts.ic + 12 + i * 8); for (j = 0; j < sn && sureler.length < say; j++) sureler.push(sd); }
      var ctts = bul(st, 'ctts'), kay = null;
      if (ctts) { kay = []; var cv = v.getUint8(ctts.ic); for (i = 0; i < v.getUint32(ctts.ic + 4); i++) { var cn = v.getUint32(ctts.ic + 8 + i * 8), co = cv ? v.getInt32(ctts.ic + 12 + i * 8) : v.getUint32(ctts.ic + 12 + i * 8); for (j = 0; j < cn && kay.length < say; j++) kay.push(co); } }
      var stss = bul(st, 'stss'), anahtar = null;
      if (stss) { anahtar = {}; for (i = 0; i < v.getUint32(stss.ic + 4); i++) anahtar[v.getUint32(stss.ic + 8 + i * 4) - 1] = 1; }
      var n = 0, dts = 0, si = 0;
      for (var p = 0; p < parca.length && n < say; p++) {
        while (si + 1 < sc.length && sc[si + 1][0] <= p + 1) si++;
        var ofs = parca[p];
        for (j = 0; j < sc[si][1] && n < say; j++, n++) {
          var su = sureler[n] != null ? sureler[n] : (sureler[sureler.length - 1] || 0);
          ornek.push({ ofs: ofs, boy: boy[n], dts: dts, cts: dts + (kay ? kay[n] || 0 : 0), anahtar: anahtar ? !!anahtar[n] : true, sure: su });
          ofs += boy[n]; dts += su;
        }
      }
      return ornek;
    };
    var esdsAsc = function (k) { // esds içindeki AudioSpecificConfig
      var o = k.ic + 4, son = k.son;
      var boyOku = function () { var n = 0, b, i = 0; do { b = v.getUint8(o++); n = (n << 7) | (b & 0x7f); } while ((b & 0x80) && ++i < 4 && o < son); return n; };
      while (o < son) {
        var etiket = v.getUint8(o++), n = boyOku();
        if (etiket === 0x03) { o += 2; var fl = v.getUint8(o++); if (fl & 0x80) o += 2; if (fl & 0x40) o += v.getUint8(o) + 1; if (fl & 0x20) o += 2; continue; }
        if (etiket === 0x04) { o += 13; continue; }
        if (etiket === 0x05) return new Uint8Array(buf.slice(o, Math.min(son, o + n)));
        o += n;
      }
      return null;
    };
    mc.forEach(function (k) {
      if (k.t !== 'trak') return;
      var tk = cocuk(k.ic, k.son), mdia = bul(tk, 'mdia'), tkhd = bul(tk, 'tkhd'); if (!mdia || !tkhd) return;
      var tv = v.getUint8(tkhd.ic), etkin = (v.getUint32(tkhd.ic) & 1) === 1;
      var md = cocuk(mdia.ic, mdia.son), hdlr = bul(md, 'hdlr'), mdhd = bul(md, 'mdhd'); if (!hdlr || !mdhd) return;
      var tur = tip(hdlr.ic + 8), mv = v.getUint8(mdhd.ic), olcek = v.getUint32(mdhd.ic + (mv === 1 ? 20 : 12));
      if ((tur !== 'vide' && tur !== 'soun') || !olcek) return;
      if (tur === 'vide' && sonuc.video) return;
      var minf = bul(md, 'minf'), stbl = minf && bul(cocuk(minf.ic, minf.son), 'stbl'); if (!stbl) return;
      var st = cocuk(stbl.ic, stbl.son), stsd = bul(st, 'stsd'), giris = stsd && kutu(stsd.ic + 8, stsd.son); if (!giris) return;
      // düzenleme listesi: baştaki boşluk ve atlanan kısım (ör. AAC'nin ön dolgusu)
      var kayma = 0, edts = bul(tk, 'edts'), elst = edts && bul(cocuk(edts.ic, edts.son), 'elst');
      if (elst) {
        var ev = v.getUint8(elst.ic), en = v.getUint32(elst.ic + 4), eo = elst.ic + 8, bos = 0;
        for (var e = 0; e < en && e < 8; e++) {
          var es = ev === 1 ? u64(eo) : v.getUint32(eo), mt = ev === 1 ? v.getInt32(eo + 8) * 4294967296 + v.getUint32(eo + 12) : v.getInt32(eo + 4);
          eo += ev === 1 ? 20 : 12;
          if (mt === -1) { bos += es; continue; }
          kayma = bos / filmOlcek - mt / olcek; break;
        }
      }
      var ornek = tablo(st);
      if (tur === 'vide') {
        if (!etkin && sonuc.video) return;
        var alt = cocuk(giris.ic + 78, giris.son), avcC = bul(alt, 'avcC'), hvcC = bul(alt, 'hvcC'), kod = null, aciklama = null, h2 = function (x) { return ('0' + x.toString(16)).slice(-2); };
        if (avcC) { aciklama = new Uint8Array(buf.slice(avcC.ic, avcC.son)); kod = 'avc1.' + h2(aciklama[1]) + h2(aciklama[2]) + h2(aciklama[3]); }
        else if (hvcC) { aciklama = new Uint8Array(buf.slice(hvcC.ic, hvcC.son)); kod = hevcKod(giris.t === 'hev1' ? 'hev1' : 'hvc1', aciklama); }
        var mo = tkhd.ic + (tv === 1 ? 52 : 40), ma = v.getInt32(mo) / 65536, mb = v.getInt32(mo + 4) / 65536;
        var donus = (Math.round(Math.atan2(mb, ma) * 180 / Math.PI) + 360) % 360; donus = Math.round(donus / 90) * 90 % 360;
        if (!ornek.length) return;
        var sonO = ornek[ornek.length - 1], ilkCts = Infinity; ornek.forEach(function (x) { if (x.cts < ilkCts) ilkCts = x.cts; });
        sonuc.video = { tur: giris.t, kod: kod, aciklama: aciklama, g: v.getUint16(giris.ic + 24), y: v.getUint16(giris.ic + 26), olcek: olcek, donus: donus, kayma: kayma, ornekler: ornek,
          sure: (sonO.cts + (sonO.sure || 0)) / olcek + kayma, fps: ornek.length > 1 ? Math.round(ornek.length / Math.max(0.1, (sonO.dts - ornek[0].dts) / olcek)) : 30 };
      } else {
        if (giris.t !== 'mp4a') return;
        var sv = v.getUint16(giris.ic + 8), kanal = v.getUint16(giris.ic + 16), oran = v.getUint32(giris.ic + 24) >>> 16;
        var altS = cocuk(giris.ic + 28 + (sv === 1 ? 16 : sv === 2 ? 36 : 0), giris.son), esds = bul(altS, 'esds');
        if (!esds) { var wave = bul(altS, 'wave'); if (wave) esds = bul(cocuk(wave.ic, wave.son), 'esds'); }
        var asc = esds ? esdsAsc(esds) : null;
        if (asc && asc.length >= 2) { // örnekleme hızı ve kanal sayısı ASC'den
          var sfi = ((asc[0] & 7) << 1) | (asc[1] >> 7), HIZ = [96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000, 7350];
          if (HIZ[sfi]) oran = HIZ[sfi]; var ck = (asc[1] >> 3) & 15; if (ck >= 1 && ck <= 2) kanal = ck;
        }
        if (!ornek.length || !oran) return;
        sonuc.sesler.push({ asc: asc, kanal: kanal || 1, oran: oran || olcek, olcek: olcek, kayma: kayma, ornekler: ornek });
        if (!sonuc.ses) sonuc.ses = sonuc.sesler[0];
      }
    });
    return sonuc;
  }
  S.dosyaAc = function (dosya) { // { dosya, video, ses, sure } — görüntü izi yoksa hata
    return ustKutular(dosya).then(function (l) {
      var moov = null; l.forEach(function (k) { if (k.t === 'moov') moov = k; });
      if (!moov) throw hata('Bu dosya okunamadı. Ekran kaydını Fotoğraflar’dan olduğu gibi seç (MP4 ya da MOV).');
      if (moov.n > 96 * 1048576) throw hata('Bu video çok büyük görünüyor.');
      return oku(dosya, moov.o, moov.o + moov.n).then(function (buf) {
        var m = moovCoz(buf);
        if (m.parcali) throw hata('Bu video parça parça kaydedilmiş; telefonun ya da tabletin kendi kaydını seç.');
        if (!m.video) throw hata('Bu dosyada görüntü bulunamadı.');
        m.dosya = dosya; m.sure = m.video.sure;
        return m;
      });
    });
  };

  /* ================= görüntü çözücü: dosyadan parça parça okur ================= */
  function Kaynak(d) { this.d = d; this.m = d.video; this.kuyruk = []; this.i = 0; this.bitti = false; this.hata = null; this.bekleyen = null; this.tampon = null; this.cikan = 0; this.sifir = 0; }
  var PAY = 1000; // µs: karelerin zamanı mikrosaniyeye yuvarlanır; tam sınırdaki kare bir öncekine düşmesin
  function zamanla(soz, ms) { return Promise.race([soz, new Promise(function (r) { setTimeout(r, ms); })]); }
  Kaynak.destek = function () { return !!(window.VideoDecoder && window.EncodedVideoChunk && window.VideoFrame); };
  Kaynak.yapilandir = function (m) { return { codec: m.kod, description: m.aciklama, codedWidth: m.g, codedHeight: m.y }; };
  Kaynak.uygunMu = function (m) { // bu tarayıcı bu kaydı çözebilir mi
    if (!Kaynak.destek() || !m || !m.kod) return Promise.resolve(false);
    return VideoDecoder.isConfigSupported(Kaynak.yapilandir(m)).then(function (s) { return !!(s && s.supported); }, function () { return false; });
  };
  Kaynak.prototype.zaman = function (o) { return o.cts / this.m.olcek + this.m.kayma; };
  Kaynak.prototype.hazirla = function (t0) {
    var self = this;
    if (this.soz) return this.soz;
    return (this.soz = Promise.resolve().then(function () {
      var m = self.m, cfg = Kaynak.yapilandir(m);
      if (!Kaynak.destek() || !m.kod) throw hata('Bu tarayıcı videoyu çözemiyor.');
      return VideoDecoder.isConfigSupported(cfg).then(function (s) {
        if (!s || !s.supported) throw hata('Bu kaydın biçimi (' + (m.kod.split('.')[0] === 'avc1' ? 'H.264' : 'HEVC') + ') bu tarayıcıda çözülemiyor.');
        self.cozucuKur();
        self.i = self.anahtarOnce(t0);
      });
    }));
  };
  function kuyrugaKoy(q, f) { var i = q.length; while (i > 0 && q[i - 1].timestamp > f.timestamp) i--; q.splice(i, 0, f); } // çözücü kareleri karışık sırada verse de
  Kaynak.prototype.cozucuKur = function () { // (yeniden) çözücü kurar; hatadan sonra eskisi kapanmış olur, onun geç gelen kareleri atılır
    var self = this, dec = null, uyan = function () { if (self.bekleyen) { var b = self.bekleyen; self.bekleyen = null; b(); } };
    try { if (this.dec && this.dec.state !== 'closed') this.dec.close(); } catch (e) {}
    dec = new VideoDecoder({
      output: function (f) { if (dec !== self.dec) { try { f.close(); } catch (e) {} return; } self.cikan++; kuyrugaKoy(self.kuyruk, f); uyan(); },
      error: function (e) { if (dec !== self.dec) return; self.hata = e || new Error('çözme hatası'); uyan(); }
    });
    dec.configure(Kaynak.yapilandir(this.m));
    this.dec = dec;
  };
  Kaynak.prototype.anahtarOnce = function (t0) { // t0'dan önceki son anahtar karenin sırası
    var o = this.m.ornekler, i = 0;
    if (t0 > 0) for (var j = 0; j < o.length; j++) { if (o[j].anahtar && this.zaman(o[j]) <= t0 + 0.001) i = j; if (this.zaman(o[j]) > t0 + 2 && i) break; }
    return i;
  };
  Kaynak.prototype.anahtarSonra = function (t0) { // t0'dan sonraki ilk anahtar kare (yoksa son örnek: kayıt orada biter)
    var o = this.m.ornekler;
    for (var j = 0; j < o.length; j++) if (o[j].anahtar && this.zaman(o[j]) > t0 + 0.001) return j;
    return o.length;
  };
  Kaynak.prototype.bastan = function (i) { // kuyruğu bırakıp yeni çözücüyle i. örnekten başlar
    this.kuyruk.forEach(function (f) { try { f.close(); } catch (e) {} }); this.kuyruk = [];
    this.tampon = null; this.bosalt = null; this.bitti = false; this.hata = null;
    this.cozucuKur(); this.i = i;
  };
  // Çözücü yeni kare vermez olursa (iPhone'da donanım çözücüsü bazen takılır) sonsuza dek beklenmez:
  // yeni çözücüyle t'den önceki anahtar kareden yeniden başlanır; üçüncüde kayıt orada biter (son kare kalır).
  Kaynak.prototype.kurtar = function (t) {
    if (++this.sifir > 2) {
      this.kuyruk.forEach(function (f) { try { f.close(); } catch (e) {} }); this.kuyruk = []; this.bitti = true;
      this.sorun = this.sorun || { t: t, neden: 'çözücü yanıt vermedi' };
      if (window.console) console.warn('Video çözücü takıldı; kaydın son karesi kullanılıyor (' + t.toFixed(2) + ' sn).'); return;
    }
    try { this.bastan(this.anahtarOnce(t)); } catch (e) { this.bitti = true; return; }
    if (window.console) console.warn('Video çözücü takıldı; yeniden başlatıldı (' + t.toFixed(2) + ' sn).');
  };
  // Çözme hatasında da durulmaz: önce aynı yerden, sonra bir sonraki anahtar kareden yeni çözücüyle denenir; üçüncüde hata kalıcıdır.
  Kaynak.prototype.hataKurtar = function (t) {
    var e0 = this.hata; this.hataSay = (this.hataSay || 0) + 1;
    if (this.hataSay > 2) { this.kalici = true; this.sorun = this.sorun || { t: t, neden: hataYazi(e0) }; return false; }
    if (window.console) console.warn('Video çözme hatası (' + t.toFixed(2) + ' sn), yeni çözücüyle deneniyor:', e0);
    try { this.bastan(this.hataSay === 1 ? this.anahtarOnce(t) : this.anahtarSonra(t)); } catch (e) { this.hata = e0; this.kalici = true; this.sorun = { t: t, neden: hataYazi(e) }; return false; }
    return true;
  };
  Kaynak.prototype.parcaOku = function (i) { // i. örnekten başlayıp en çok ~4 MB: aradaki ses verisi de okunur
    var self = this, o = this.m.ornekler, bas = o[i].ofs, son = bas + o[i].boy, j = i + 1;
    while (j < o.length && o[j].ofs >= o[j - 1].ofs && o[j].ofs + o[j].boy - bas <= 4194304) { son = Math.max(son, o[j].ofs + o[j].boy); j++; }
    return oku(this.d.dosya, bas, son).then(function (b) { self.tampon = { bas: bas, veri: b, ilk: i, son: j }; });
  };
  Kaynak.prototype.besle = function (i) {
    var o = this.m.ornekler[i], T = this.tampon, ol = this.m.olcek;
    this.dec.decode(new EncodedVideoChunk({ type: o.anahtar ? 'key' : 'delta', timestamp: Math.round(this.zaman(o) * 1e6), duration: Math.round((o.sure || 0) / ol * 1e6), data: new Uint8Array(T.veri, o.ofs - T.bas, o.boy).slice() }));
  };
  Kaynak.prototype.ilerle = function (t) { // t saniyesindeki kare çözülene dek
    var self = this, us = t * 1e6 + PAY, imza = '', an = 0;
    var dongu = function () {
      if (self.hata) { if (!self.hataKurtar(t)) throw self.hata; imza = ''; }
      while (self.kuyruk.length > 1 && self.kuyruk[1].timestamp <= us) self.kuyruk.shift().close();
      var son = self.kuyruk[self.kuyruk.length - 1];
      if ((son && son.timestamp > us) || self.bitti) return null;
      var yeni = self.cikan + ':' + self.i + ':' + self.sifir; // 5 sn boyunca ne kare geldi ne besleme ilerledi: takıldı
      if (yeni !== imza) { imza = yeni; an = Date.now(); }
      else if (Date.now() - an > 5000) { self.kurtar(t); imza = ''; return dongu(); }
      var o = self.m.ornekler;
      if (self.i < o.length) {
        if (!self.tampon || self.i < self.tampon.ilk || self.i >= self.tampon.son) return self.parcaOku(self.i).then(dongu);
        try { while (self.i < self.tampon.son && self.dec.decodeQueueSize < 6) self.besle(self.i++); }
        catch (e) { self.hata = self.hata || e; return dongu(); } // kapanmış çözücü: hata yoluna
        return new Promise(function (r) { self.bekleyen = r; setTimeout(r, 25); }).then(dongu);
      }
      if (!self.bosalt) self.bosalt = zamanla(self.dec.flush(), 3000).then(function () { self.bitti = true; }, function () { self.bitti = true; }); // Safari'de flush bazen hiç bitmiyor
      return self.bosalt.then(dongu);
    };
    return this.hazirla(t).then(dongu);
  };
  Kaynak.prototype.hazirMi = function (t) {
    if (this.hata) return !!this.kalici; if (!this.dec) return false; // geçici hatada ilerle() kurtarsın diye 'hazır değil'
    var son = this.kuyruk[this.kuyruk.length - 1]; return this.bitti || !!(son && son.timestamp > t * 1e6 + PAY);
  };
  Kaynak.prototype.kare = function (t) {
    var us = t * 1e6 + PAY, k = null;
    for (var i = 0; i < this.kuyruk.length; i++) { if (this.kuyruk[i].timestamp <= us) k = this.kuyruk[i]; else break; }
    return k || this.kuyruk[0] || null;
  };
  Kaynak.prototype.kapat = function () {
    this.kuyruk.forEach(function (f) { try { f.close(); } catch (e) {} }); this.kuyruk = []; this.tampon = null;
    try { if (this.dec && this.dec.state !== 'closed') this.dec.close(); } catch (e) {}
  };
  S.Kaynak = Kaynak;

  /* ================= yedek yol: cihazın kendi oynatıcısı (<video>) ================= */
  // WebCodecs kaydı çözemezse ya da dosya ayrıştırılamazsa: her kare için videoda o ana gidilir.
  // Daha yavaş ama cihazın oynatabildiği her videoyla çalışır; görüntü zaten doğru yönde gelir.
  function Oge(d) { this.d = d; this.v = null; this.url = null; this.soz = null; this.son = -1; this.rvfcYok = 0; this.asim = 0; }
  Oge.prototype.hazirla = function () {
    var self = this;
    if (this.soz) return this.soz;
    return (this.soz = new Promise(function (ok, red) {
      var v = document.createElement('video'), bitti = false;
      self.v = v; self.url = URL.createObjectURL(self.d.dosya);
      v.muted = true; v.defaultMuted = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.setAttribute('muted', ''); v.preload = 'auto';
      v.style.cssText = 'position:fixed;left:-8px;top:-8px;width:4px;height:4px;opacity:0;pointer-events:none;z-index:-1';
      var son = function (e) { if (bitti) return; bitti = true; clearTimeout(zs); if (e) red(e); else { try { v.pause(); } catch (x) {} ok(); } };
      var zs = setTimeout(function () { son(hata('Video açılamadı (süre doldu).')); }, 25000);
      v.addEventListener('loadeddata', function () { son(); });
      v.addEventListener('error', function () { son(hata('Bu video bu cihazda açılamıyor' + (v.error && v.error.code ? ' (hata ' + v.error.code + ')' : '') + '.')); });
      try { (document.body || document.documentElement).appendChild(v); } catch (e) {}
      v.src = self.url;
      try { v.load(); } catch (e) {}
      try { var p = v.play(); if (p && p.then) p.then(function () { if (bitti) v.pause(); }, function () {}); } catch (e) {} // iPhone'da veri oynatılınca yüklenir
    }));
  };
  Oge.prototype.hedef = function (t) { var v = this.v, s = v && isFinite(v.duration) ? v.duration : t + 1; return Math.max(0, Math.min(t, s - 0.002)); };
  Oge.prototype.ilerle = function (t) {
    var self = this;
    if (this.bozuk) return Promise.resolve(null); // oynatıcı yanıt vermez oldu: son kare kalır
    return this.hazirla().then(function () {
      var v = self.v, h = self.hedef(t);
      if (Math.abs(self.son - h) < 0.004 && !v.seeking) return null;
      return new Promise(function (ok) {
        var bitti = false, zs = null;
        var tamam = function (asim) {
          if (bitti) return; bitti = true; clearTimeout(zs); v.removeEventListener('seeked', gitti); self.son = h;
          self.asim = asim ? (self.asim || 0) + 1 : 0; ok(null);
        };
        var gitti = function () { // kare ekrana gelince (destekleniyorsa) çizilir; iPhone'da görünmeyen videoda bu hiç gelmeyebilir
          if (v.requestVideoFrameCallback && self.rvfc !== false) {
            var zk = setTimeout(function () { if (!self.rvfcVar && ++self.rvfcYok >= 3) self.rvfc = false; tamam(); }, 120);
            v.requestVideoFrameCallback(function () { clearTimeout(zk); self.rvfcVar = true; tamam(); });
          } else tamam();
        };
        v.addEventListener('seeked', gitti); zs = setTimeout(function () { tamam(true); }, 3000);
        try { v.currentTime = h; } catch (e) { tamam(); }
      }).then(function () {
        if (self.asim < 2) return null;
        // art arda iki atlama yanıtsız kaldı: oynatıcı bir kez baştan açılır, yine olmazsa bırakılır
        self.asim = 0;
        if (self.yeniden) { self.bozuk = true; self.sorun = { t: t, neden: 'oynatıcı yanıt vermedi' }; if (window.console) console.warn('Video oynatıcısı yanıt vermiyor; son kare kullanılıyor.'); return null; }
        self.yeniden = true; self.kapat(); self.soz = null; self.son = -1;
        return self.ilerle(t);
      });
    });
  };
  Oge.prototype.hazirMi = function (t) { var v = this.v; return this.bozuk || (!!v && v.readyState >= 2 && !v.seeking && Math.abs(this.son - this.hedef(t)) < 0.004); };
  Oge.prototype.kare = function () { var v = this.v; return v && v.readyState >= 2 ? v : null; };
  Oge.prototype.kapat = function () {
    var v = this.v; this.v = null;
    if (v) { try { v.pause(); v.removeAttribute('src'); v.load(); } catch (e) {} if (v.parentNode) v.parentNode.removeChild(v); }
    if (this.url) { URL.revokeObjectURL(this.url); this.url = null; }
  };
  S.Oge = Oge;
  S.kaynak = function (d) { return d.oge ? new Oge(d) : new Kaynak(d); };
  function hataYazi(e) { if (!e) return 'bilinmeyen'; var m = e.message || String(e); return ((e.name && e.name !== 'Error' && m.indexOf(e.name) < 0 ? e.name + ': ' : '') + m).slice(0, 160); }
  S.hataYazi = hataYazi;
  function onizlemeAni(d) { return Math.max(0, Math.min(d.sure - 0.3, d.sure * 0.8)); }
  S.ogeAc = function (dosya, d0) { // yalnız cihazın oynatıcısıyla: boyut ve süre oynatıcıdan, ses izleri (varsa) ayrıştırıcıdan
    var d = { dosya: dosya, oge: true, yol: 'oge', ayristi: !!d0, video: { g: 0, y: 0, donus: 0, sure: 0, kod: null }, ses: d0 ? d0.ses : null, sesler: d0 ? d0.sesler || [] : [], sure: 0 }, K = new Oge(d);
    return K.hazirla().then(function () {
      var v = K.v; d.video.g = v.videoWidth; d.video.y = v.videoHeight;
      d.sure = d.video.sure = isFinite(v.duration) && v.duration > 0 ? v.duration : d0 ? d0.sure : 0;
      K.kapat();
      if (!d.video.g || !d.video.y) throw hata('Videoda görüntü bulunamadı.');
      if (!d.sure) throw hata('Videonun süresi okunamadı.');
      return S.kare(d, onizlemeAni(d), 960);
    }).then(function (tv) { d.onizleme = tv; return d; }, function (e) { K.kapat(); throw e; });
  };
  S.ac = function (dosya) { // önce WebCodecs (hızlı yol), olmazsa cihazın oynatıcısı; sonuçta önizleme karesi de vardır
    var neden = '';
    var ogeyle = function (d0) {
      return S.ogeAc(dosya, d0).then(function (d) { d.neden = neden; return d; }, function (e2) {
        var m = hataYazi(e2); if (neden && neden !== m) m = neden + ' / ' + m;
        throw hata(e2 && e2.kullanici && !neden ? e2.message : 'Kayıt okunamadı. Ayrıntı: ' + m);
      });
    };
    return S.dosyaAc(dosya).then(function (d) {
      return Kaynak.uygunMu(d.video).then(function (ok) {
        if (!ok) throw new Error('çözücü desteklemiyor: ' + (d.video.kod || d.video.tur));
        return S.kare(d, onizlemeAni(d), 960);
      }).then(function (tv) { d.onizleme = tv; d.yol = 'kod'; return d; }, function (e1) { neden = hataYazi(e1); return ogeyle(d); });
    }, function (e0) { neden = hataYazi(e0); return ogeyle(null); });
  };

  /* ================= hızlı okuma için çevirme: oynatıcıdan sırayla kare alıp H.264'e ================= */
  // WebCodecs'in çözemediği kayıt her karede atlanarak okunursa çok yavaş olur (iPhone'da kare başına yüzlerce ms).
  // Bunun yerine video sessizce, iki kat hızda oynatılır; her kare cihazın kodlayıcısıyla H.264'e çevrilir.
  // Sonra Kaynak bu çevrilmiş kaydı sırayla ve hızlıca çözer. Olmazsa (ör. oynatma izni yoksa) eski yola dönülür.
  function bayt(x) { return x instanceof ArrayBuffer ? new Uint8Array(x.slice(0)) : new Uint8Array(x.buffer.slice(x.byteOffset, x.byteOffset + x.byteLength)); }
  // çevirme için H.264 kodlayıcısı. Gerçek zamanlı kip kullanılmaz: iPhone'da yüz görüntüsünü kare kare bozuyordu.
  function kodlayiciBul(W, H, bpp) {
    var l = ['avc1.640033', 'avc1.64002a', 'avc1.640028', 'avc1.4d0033', 'avc1.4d0028', 'avc1.42e033', 'avc1.42e01f'], bit = Math.round(Math.min(12e6, Math.max(2e6, W * H * 30 * (bpp || 0.08)))), i = 0;
    var dene = function () {
      if (i >= l.length) return null;
      var c = { codec: l[i++], width: W, height: H, bitrate: bit, framerate: 30, avc: { format: 'avc' } };
      return VideoEncoder.isConfigSupported(c).then(function (s) { return s && s.supported ? c : dene(); }, dene);
    };
    return Promise.resolve().then(dene);
  }
  S.hevcMi = function (d) { return !!(d && d.video && /^(hvc1|hev1)/.test(d.video.kod || '')); };
  S.cevirebilir = function () { return !!(window.VideoEncoder && window.VideoFrame && window.VideoDecoder && window.HTMLVideoElement && HTMLVideoElement.prototype.requestVideoFrameCallback); };
  // kap: videonun oynarken görüneceği yer (iPhone görünmeyen videoyu oynatmayabilir). Dokunuşun içinde çağrılmalı: oynatma izni o anda alınır.
  S.cevirici = function (d, kap) {
    var v = document.createElement('video'), url = URL.createObjectURL(d.dosya), calis = false, kapali = false;
    v.muted = true; v.defaultMuted = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.setAttribute('muted', ''); v.preload = 'auto';
    v.style.cssText = 'display:block;width:100%;height:100%;object-fit:contain;background:#000;border-radius:10px';
    if (kap) kap.appendChild(v);
    v.src = url;
    try { var p = v.play(); if (p && p.then) p.then(function () { if (!calis) v.pause(); }, function () {}); } catch (e) {}
    var hazir = function () {
      if (v.readyState >= 2) return Promise.resolve();
      return new Promise(function (ok, red) {
        var zs = setTimeout(function () { red(new Error('video açılamadı (süre doldu)')); }, 20000);
        v.addEventListener('loadeddata', function () { clearTimeout(zs); ok(); }, { once: true });
        v.addEventListener('error', function () { clearTimeout(zs); red(new Error('video açılamadı' + (v.error && v.error.code ? ' (hata ' + v.error.code + ')' : ''))); }, { once: true });
      });
    };
    var git = function (t) { // tek seferlik atlama
      if (Math.abs(v.currentTime - t) < 0.01) return Promise.resolve();
      return new Promise(function (ok) { var zs = setTimeout(ok, 5000); v.addEventListener('seeked', function () { clearTimeout(zs); ok(); }, { once: true }); try { v.currentTime = t; } catch (e) { clearTimeout(zs); ok(); } });
    };
    var kapat = function () {
      if (kapali) return; kapali = true;
      try { v.pause(); v.removeAttribute('src'); v.load(); } catch (e) {}
      if (v.parentNode) v.parentNode.removeChild(v);
      URL.revokeObjectURL(url);
    };
    // o: { bas, son, enBuyuk (uzun kenar), ilerle(p) } → çevrilmiş kayıt (d gibi; Kaynak'la okunur)
    var cevir = function (o) {
      var bas = Math.max(0, o.bas || 0), son = Math.min(d.sure || 1e9, o.son || d.sure || 1e9);
      return hazir().then(function () {
        var g0 = v.videoWidth, y0 = v.videoHeight; if (!g0 || !y0) throw new Error('videonun boyutu okunamadı');
        var k = Math.min(1, (o.enBuyuk || 1920) / Math.max(g0, y0)), W = Math.max(2, Math.round(g0 * k / 2) * 2), H = Math.max(2, Math.round(y0 * k / 2) * 2);
        // doğrudan kip: kare tuvale çizilmeden oynatıcıdan alınır (telefonda tuvalden kare almak pahalı). Yalnız döndürülmemiş,
        // çift boyutlu kayıtta (ekran kaydı) ve oynatıcının karesi görüntüyle aynı boydaysa; olmazsa tuval kipi.
        var dog = false;
        if (o.dogrudan && g0 % 2 === 0 && y0 % 2 === 0) {
          try { var f0 = new VideoFrame(v, { timestamp: 0 }); dog = f0.displayWidth === g0 && f0.displayHeight === y0; f0.close(); } catch (e) { dog = false; }
        }
        var ilk = dog ? kodlayiciBul(g0, y0, o.bpp).then(function (c) { return c ? { cfg: c, W: g0, H: y0, dog: true } : null; }) : Promise.resolve(null);
        return ilk.then(function (x) {
          return x || kodlayiciBul(W, H, o.bpp).then(function (c) { return c ? { cfg: c, W: W, H: H, dog: false } : null; });
        }).then(function (x) {
          if (!x) throw new Error('H.264 kodlayıcısı yok');
          return yakala(x.cfg, x.W, x.H, bas, son, o.ilerle, x.dog, o.kapsam || 0.8);
        });
      }).then(function (d2) {
        return Kaynak.uygunMu(d2.video).then(function (ok) { if (!ok) throw new Error('çevrilen kayıt çözülemiyor'); return d2; });
      });
    };
    // dog: kare oynatıcıdan doğrudan alınır; kapsamAlt: gösterilen karelerin en az bu kadarı yakalanmalı (az ise hız düşer)
    var yakala = function (cfg, W, H, bas, son, ilerle, dog, kapsamAlt) {
      return new Promise(function (ok, red) {
        var tv = null, c = null, tuvalKur = function () { if (!tv) { tv = document.createElement('canvas'); tv.width = W; tv.height = H; c = tv.getContext('2d'); } };
        if (!dog) tuvalKur();
        var parcalar = [], ornekler = [], ofs = 0, aciklama = null, hata = null, sonM = -1, sonAnahtar = -9, bitti = false;
        var hiz = 2, pencere = [], kalite = null, dur = false, sonCb = performance.now(), takilma = 0, bekci = null, basAn = performance.now();
        var sonPF = -1, yakalanan = 0, kacan = 0, pfVar = false, topYak = 0, topKac = 0; // oynatıcının gösterdiği karelerden kaçı yakalandı
        var enc = new VideoEncoder({
          output: function (ch, meta) {
            if (meta && meta.decoderConfig && meta.decoderConfig.description && !aciklama) aciklama = bayt(meta.decoderConfig.description);
            var b = new Uint8Array(ch.byteLength); ch.copyTo(b); parcalar.push(b);
            ornekler.push({ ofs: ofs, boy: b.length, dts: ch.timestamp, cts: ch.timestamp, sure: 0, anahtar: ch.type === 'key' }); ofs += b.length;
          },
          error: function (e) { hata = e || new Error('kodlama hatası'); }
        });
        try { enc.configure(cfg); } catch (e) { red(e); return; }
        var bitir = function (e) {
          if (bitti) return; bitti = true; calis = false; clearInterval(bekci); try { v.pause(); } catch (x) {}
          if (e) { try { enc.close(); } catch (x) {} red(e); return; }
          zamanla(enc.flush(), 8000).then(function () {
            try { enc.close(); } catch (x) {}
            if (hata) throw hata;
            if (!ornekler.length || !aciklama || aciklama.length < 4) throw new Error('çevrilen kare yok');
            for (var i = 0; i + 1 < ornekler.length; i++) ornekler[i].sure = Math.max(0, ornekler[i + 1].cts - ornekler[i].cts);
            var h2 = function (x) { return ('0' + x.toString(16)).slice(-2); }, son0 = ornekler[ornekler.length - 1];
            son0.sure = Math.round(1e6 / 30);
            ok({ dosya: new Blob(parcalar, { type: 'video/mp4' }), cevrildi: true, yol: 'kod', neden: d.neden, ses: d.ses, sesler: d.sesler, sure: d.sure, aralik: [bas, son],
              cevirme: { hiz: hiz, kare: ornekler.length, kapsam: topYak + topKac ? topYak / (topYak + topKac) : 1, sn: (performance.now() - basAn) / 1000, g: W, y: H, dog: dog },
              video: { tur: 'avc1', kod: 'avc1.' + h2(aciklama[1]) + h2(aciklama[2]) + h2(aciklama[3]), aciklama: aciklama, g: W, y: H, olcek: 1e6, donus: 0, kayma: 0, ornekler: ornekler, sure: d.sure, fps: 30 } });
          }).catch(red);
        };
        var kare = function (simdi, md) {
          if (bitti) return;
          sonCb = performance.now();
          var mt = md && md.mediaTime != null ? md.mediaTime : v.currentTime;
          if (mt >= son + 0.04) { bitir(); return; }
          if (md && md.presentedFrames != null) { // arada gösterilip yakalanamayan kareler (ana iş parçacığı yetişemedi)
            pfVar = true; if (sonPF >= 0 && mt >= bas - 0.04 && !dur) kacan += Math.max(0, md.presentedFrames - sonPF - 1); sonPF = md.presentedFrames;
          }
          if (mt > sonM + 0.004 && mt >= bas - 0.04) {
            try {
              var f = null, ts = Math.round(mt * 1e6), an = mt - sonAnahtar >= 1;
              if (dog) { try { f = new VideoFrame(v, { timestamp: ts }); } catch (e1) { dog = false; f = null; } } // olmazsa tuvale geçilir (aynı boy)
              if (!f) { tuvalKur(); c.drawImage(v, 0, 0, W, H); f = new VideoFrame(tv, { timestamp: ts }); }
              if (an) sonAnahtar = mt;
              enc.encode(f, { keyFrame: an }); f.close();
            } catch (e) { bitir(e); return; }
            sonM = mt;
            if (ilerle) ilerle(Math.min(1, Math.max(0, (mt - bas) / Math.max(0.1, son - bas))), hiz);
            yakalanan++; topYak++;
            pencere.push(mt); if (pencere.length > 40) pencere.shift();
            if (pencere.length >= 24 && hiz > 1) {
              var yavas = false;
              if (pfVar) { // gösterilen karelerin beşte birinden fazlası kaçıyorsa yavaşlatılır (sayfa durgunken az kare gösterilir; o zaman kaçan da olmaz)
                yavas = kacan > (1 - kapsamAlt) * (yakalanan + kacan);
              } else { // eski tarayıcı: medya zamanında saniyede 22'den az kare yakalanıyor ve oynatıcı kare atlıyorsa
                var sk = (pencere.length - 1) / Math.max(0.001, pencere[pencere.length - 1] - pencere[0]), q = v.getVideoPlaybackQuality ? v.getVideoPlaybackQuality() : null;
                var atl = q ? q.droppedVideoFrames - (kalite ? kalite[0] : 0) : 0, top = q ? q.totalVideoFrames - (kalite ? kalite[1] : 0) : 0;
                if (q) kalite = [q.droppedVideoFrames, q.totalVideoFrames];
                yavas = sk < 22 && (!q || (top > 0 && atl / top > 0.15));
              }
              if (yavas) { hiz = Math.max(1, hiz - 0.5); try { v.playbackRate = hiz; } catch (e) {} }
              topKac += kacan; pencere = []; yakalanan = 0; kacan = 0;
            }
            if (enc.encodeQueueSize > 8 && !dur) { dur = true; try { v.pause(); } catch (e) {} } // kodlayıcı geride: oynatma bekler
          }
          v.requestVideoFrameCallback(kare);
        };
        v.addEventListener('ended', function () { setTimeout(function () { bitir(); }, 50); }, { once: true });
        v.addEventListener('playing', function () { try { if (v.playbackRate !== hiz) v.playbackRate = hiz; } catch (e) {} });
        bekci = setInterval(function () {
          if (bitti) return;
          if (hata) { bitir(hata); return; }
          if (dur) { if (enc.encodeQueueSize < 3) { dur = false; sonCb = performance.now(); var p0 = v.play(); if (p0 && p0.catch) p0.catch(function () {}); } return; }
          if (performance.now() - sonCb > 4000) { // kare gelmiyor: bir kez daha oynat, olmazsa vazgeç
            if (++takilma > 2) { bitir(new Error('oynatma ilerlemiyor')); return; }
            sonCb = performance.now(); var p1 = v.play(); if (p1 && p1.catch) p1.catch(function () {});
          }
        }, 60);
        calis = true;
        git(bas).then(function () {
          if (bitti) return;
          try { v.playbackRate = hiz; } catch (e) {}
          v.requestVideoFrameCallback(kare); sonCb = performance.now();
          var p = v.play();
          if (p && p.then) p.then(null, function (e) { bitir(e || new Error('oynatılamadı')); });
        });
      });
    };
    return { video: v, cevir: cevir, kapat: kapat };
  };

  /* ================= ses: AAC örnekleri ================= */
  S.sesOrnekleri = function (d, iz) { // [{ veri: Uint8Array, sure: örnek sayısı (ses hızında) }] — art arda gelenler tek okumada
    var s = iz || d.ses; if (!s) return Promise.resolve(null);
    var o = s.ornekler, gruplar = [], i = 0;
    while (i < o.length) { var j = i + 1, son = o[i].ofs + o[i].boy; while (j < o.length && o[j].ofs === son && son - o[i].ofs < 1048576) { son += o[j].boy; j++; } gruplar.push([i, j, o[i].ofs, son]); i = j; }
    var sonuc = new Array(o.length), k = 0, olc = s.oran / s.olcek;
    var adim = function () {
      if (k >= gruplar.length) return Promise.resolve(sonuc);
      var g = gruplar[k++];
      return oku(d.dosya, g[2], g[3]).then(function (b) {
        for (var q = g[0]; q < g[1]; q++) sonuc[q] = { veri: new Uint8Array(b, o[q].ofs - g[2], o[q].boy), sure: Math.max(1, Math.round((o[q].sure || 1024 / olc) * olc)) };
        return adim();
      });
    };
    return adim();
  };

  /* ================= çizim yardımcıları ================= */
  function boyut(im) { return im.displayWidth ? [im.displayWidth, im.displayHeight] : im.videoWidth ? [im.videoWidth, im.videoHeight] : [im.naturalWidth || im.width, im.naturalHeight || im.height]; }
  function yonluKaynak(don, FW, FH, X0, Y0, w, h) { // görüntü yönündeki dikdörtgenin karedeki karşılığı
    if (don === 90) return [Y0, FH - X0 - w, h, w];
    if (don === 180) return [FW - X0 - w, FH - Y0 - h, w, h];
    if (don === 270) return [FW - Y0 - h, X0, h, w];
    return [X0, Y0, w, h];
  }
  function yonluCiz(c, im, don, FW, FH, X0, Y0, w, h, dx, dy, dw, dh) { // döndürülmüş kayıttan görüntü yönünde bir bölge çizer
    var s = yonluKaynak(don, FW, FH, X0, Y0, w, h);
    try {
      if (!don) { c.drawImage(im, s[0], s[1], s[2], s[3], dx, dy, dw, dh); return; }
      c.save(); c.translate(dx + dw / 2, dy + dh / 2); c.rotate(don * Math.PI / 180);
      if (don === 180) c.drawImage(im, s[0], s[1], s[2], s[3], -dw / 2, -dh / 2, dw, dh);
      else c.drawImage(im, s[0], s[1], s[2], s[3], -dh / 2, -dw / 2, dh, dw);
      c.restore();
    } catch (e) { try { c.restore(); } catch (x) {} }
  }
  function gorunenBoyut(im, don) { var b = boyut(im); return don === 90 || don === 270 ? [b[1], b[0]] : b; }
  S.yonluCiz = yonluCiz;

  S.kare = function (d, t, enBuyuk) { // t saniyesindeki kare, görüntü yönünde, uzun kenarı en çok enBuyuk
    var K = S.kaynak(d), don = d.video.donus || 0;
    t = Math.max(0, Math.min(t, d.sure - 0.05));
    return K.ilerle(t).then(function () {
      var f = K.kare(t); if (!f) throw new Error('kare yok');
      var b = boyut(f), g = gorunenBoyut(f, don), k = Math.min(1, (enBuyuk || 960) / Math.max(g[0], g[1])), tv = document.createElement('canvas');
      tv.width = Math.max(2, Math.round(g[0] * k)); tv.height = Math.max(2, Math.round(g[1] * k));
      yonluCiz(tv.getContext('2d'), f, don, b[0], b[1], 0, 0, g[0], g[1], 0, 0, tv.width, tv.height);
      tv.genis = g[0]; tv.yuksek = g[1];
      return tv;
    }).then(function (tv) { K.kapat(); return tv; }, function (e) { K.kapat(); throw e; });
  };

  /* ================= kaydı tarama: kalemin yazdığı yerler ================= */
  // o: { bas, son, kirp: { x, y, g, h } (0–1, görüntü yönünde), adim (sn), ilerle(p) }
  // → { adim, kayit: [{ n, kesir, x0, y0, x1, y1 }] (kırpılmış alanda 0–1), zemin: sayfanın rengi }
  S.incele = function (d, o) {
    var K = S.kaynak(d), don = d.video.donus || 0, A = o.adim || 0.1, kayit = [], onceki = null, zemin = null, W = 0, H = 0, c = null, iptal = false;
    var t = o.bas, toplam = Math.max(0.1, o.son - o.bas);
    var adim = function () {
      if (iptal) throw new Error('iptal');
      if (t > o.son + 1e-6) return { adim: A, kayit: kayit, zemin: zemin || '#FFFFFF', g: W, y: H };
      return K.ilerle(t).then(function () {
        var f = K.kare(t);
        if (f) {
          var b = boyut(f), g = gorunenBoyut(f, don), kx = o.kirp.x * g[0], ky = o.kirp.y * g[1], kw = o.kirp.g * g[0], kh = o.kirp.h * g[1];
          if (!c) { W = 240; H = Math.round(W * kh / kw); if (H > 320) { H = 320; W = Math.max(16, Math.round(H * kw / kh)); } var tv = document.createElement('canvas'); tv.width = W; tv.height = Math.max(16, H); H = tv.height; c = tv.getContext('2d', { willReadFrequently: true }); }
          yonluCiz(c, f, don, b[0], b[1], kx, ky, kw, kh, 0, 0, W, H);
          var px = c.getImageData(0, 0, W, H).data, gri = new Uint8Array(W * H), i, x, y;
          for (i = 0; i < gri.length; i++) gri[i] = (px[i * 4] * 77 + px[i * 4 + 1] * 150 + px[i * 4 + 2] * 29) >> 8;
          if (!zemin) { // kenarların ortalama rengi: yakınlaşırken boş kalan yerler bu renkle dolar
            var rr = 0, gg = 0, bb = 0, nn = 0;
            for (x = 0; x < W; x++) [0, H - 1].forEach(function (yy) { var q = (yy * W + x) * 4; rr += px[q]; gg += px[q + 1]; bb += px[q + 2]; nn++; });
            zemin = 'rgb(' + Math.round(rr / nn) + ',' + Math.round(gg / nn) + ',' + Math.round(bb / nn) + ')';
          }
          var k = { n: 0, kesir: 0, x0: 0, y0: 0, x1: 0, y1: 0 };
          if (onceki) {
            var hx = new Uint32Array(W), hy = new Uint32Array(H), n = 0;
            for (y = 0; y < H; y++) for (x = 0; x < W; x++) { i = y * W + x; var df = gri[i] - onceki[i]; if (df > 26 || df < -26) { n++; hx[x]++; hy[y]++; } }
            k.n = n; k.kesir = n / (W * H);
            if (n) { // %2 ve %98'lik dilimler: tek tük gürültü kutuyu büyütmesin
              var sinir = function (h, L, p) { var hedef = n * p, top = 0; for (var q = 0; q < L; q++) { top += h[q]; if (top >= hedef) return q; } return L - 1; };
              k.x0 = sinir(hx, W, 0.02) / W; k.x1 = (sinir(hx, W, 0.98) + 1) / W; k.y0 = sinir(hy, H, 0.02) / H; k.y1 = (sinir(hy, H, 0.98) + 1) / H;
            }
          }
          kayit.push(k); onceki = gri;
        } else kayit.push({ n: 0, kesir: 0, x0: 0, y0: 0, x1: 0, y1: 0 });
        t += A;
        if (o.ilerle) o.ilerle(Math.min(1, (t - o.bas) / toplam));
        return adim();
      }, function (e) { // kayıt yarıda okunamaz olursa elde olanla yetinilir (kamera kalan yerde sabit durur)
        if (iptal || !kayit.length) throw e;
        if (window.console) console.warn('Kayıt ' + t.toFixed(1) + ' sn’den sonra incelenemedi:', e);
        return { adim: A, kayit: kayit, zemin: zemin || '#FFFFFF', g: W, y: H };
      });
    };
    var soz = K.hazirla(o.bas).then(adim).then(function (r) { K.kapat(); return r; }, function (e) { K.kapat(); throw e; });
    soz.iptal = function () { iptal = true; };
    return soz;
  };

  /* ================= sanal kamera ================= */
  // o: { kayit, adim, oran: çerçevenin en/boy oranı }. kamera(t, CW, CH, cikisG) → görüş { x, y, g, h } (kırpılmış alanın pikselinde)
  // Art arda, t artarak çağrılır. z = 1: alanın tamamı sığar; yazılan yere tabandan en çok iki kat yaklaşır.
  S.kamera = function (o) {
    var K = o.kayit || [], A = o.adim || 0.1, oran = o.oran, d = null;
    var aralik = function (t0, t1) { var l = [], i0 = Math.max(0, Math.floor(t0 / A)), i1 = Math.min(K.length - 1, Math.ceil(t1 / A)); for (var i = i0; i <= i1; i++) l.push(K[i]); return l; };
    var yay = function (p, v, h, w, dt) { var a = w * w * (h - p) - 2 * w * v; v += a * dt; return [p + v * dt, v]; };
    return function (t, CW, CH, cikisG) {
      var FW, FH; if (CW / CH > oran) { FW = CW; FH = CW / oran; } else { FH = CH; FW = CH * oran; }
      var zKap = CW / CH > oran ? CW / (CH * oran) : CH / (CW / oran), zb = zKap <= 1.3 ? 1 : Math.min(zKap, 1 / 0.55); // taban: oranlar yakınsa sayfanın tamamı, değilse kaplar (alanın yarıdan azı görünecekse biraz geri çekilir)
      var zMax = Math.max(zb, Math.min(zb * 2, 1.6 * FW / Math.max(1, cikisG || FW))); // en çok iki kat: yazının çevresi de görünsün
      var sinirla = function (h) { // görüş alanın içinde kalsın; alandan büyükse ortalanır
        var vw = FW / h.z, vh = FH / h.z;
        h.x = vw >= CW ? CW / 2 : Math.max(vw / 2, Math.min(CW - vw / 2, h.x));
        h.y = vh >= CH ? CH / 2 : Math.max(vh / 2, Math.min(CH - vh / 2, h.y));
        return h;
      };
      if (!d) { var h0 = sinirla({ x: CW / 2, y: 0, z: zb }); d = { x: h0.x, y: h0.y, lz: Math.log(zb), vx: 0, vy: 0, vz: 0, h: h0, son: -99, t: t, hizli: false }; }
      var h = d.h, sahne = aralik(t - 0.3, t + 0.4).some(function (k) { return k.kesir >= 0.2; });
      var akt = aralik(t - 0.6, t + 1.2).filter(function (k) { return k.n >= 3 && k.kesir < 0.2; });
      d.hizli = false;
      if (sahne) { h = sinirla({ x: CW / 2, y: 0, z: zb }); d.son = t; d.hizli = true; }
      else if (akt.length) {
        var x0 = 1, y0 = 1, x1 = 0, y1 = 0;
        akt.forEach(function (k) { x0 = Math.min(x0, k.x0); y0 = Math.min(y0, k.y0); x1 = Math.max(x1, k.x1); y1 = Math.max(y1, k.y1); });
        var bw = Math.max((x1 - x0) * CW, CW * 0.25), bh = Math.max((y1 - y0) * CH, CH * 0.1), cx = (x0 + x1) / 2 * CW, cy = (y0 + y1) / 2 * CH;
        var zA = Math.max(zb, Math.min(zMax, Math.min(FW / (bw * 1.7), FH / (bh * 1.7))));
        var vw = FW / h.z * 0.94, vh = FH / h.z * 0.94;
        var sigar = cx - bw / 2 >= h.x - vw / 2 && cx + bw / 2 <= h.x + vw / 2 && cy - bh / 2 >= h.y - vh / 2 && cy + bh / 2 <= h.y + vh / 2;
        if (!sigar || zA > h.z * 1.35 || zA < h.z / 1.35) h = sinirla({ x: cx, y: cy, z: zA });
        d.son = t;
      } else if (t - d.son > 6 && h.z > zb) h = sinirla({ x: h.x, y: h.y, z: zb }); // uzun suskunlukta geri çekil
      d.h = h;
      var dt = Math.max(0, Math.min(0.1, t - d.t)), wp = d.hizli ? 7 : 3, wz = d.hizli ? 6 : 2.4; d.t = t;
      var a = yay(d.x, d.vx, h.x, wp, dt); d.x = a[0]; d.vx = a[1];
      a = yay(d.y, d.vy, h.y, wp, dt); d.y = a[0]; d.vy = a[1];
      a = yay(d.lz, d.vz, Math.log(h.z), wz, dt); d.lz = a[0]; d.vz = a[1];
      var z = Math.exp(d.lz), g = sinirla({ x: d.x, y: d.y, z: z }), w = FW / z, hh = FH / z;
      return { x: g.x - w / 2, y: g.y - hh / 2, g: w, h: hh, z: z };
    };
  };

  /* ================= kompozitör için tahta ve yüz ================= */
  // o: { d, bas (kaydın içerik başlangıcı, sn), kirp, analiz, G, Y (tahta çerçevesinin pikseli) }
  S.tahta = function (o) {
    var d = o.d, don = d.video.donus || 0, K = S.kaynak(d), tv = document.createElement('canvas');
    tv.width = Math.max(2, Math.round(o.G)); tv.height = Math.max(2, Math.round(o.Y));
    var c = tv.getContext('2d'), an = o.analiz || { kayit: [], adim: 0.1, zemin: '#FFFFFF' }, kam = S.kamera({ kayit: an.kayit, adim: an.adim, oran: tv.width / tv.height });
    var cizildi = false, bozuk = false;
    c.fillStyle = an.zemin || '#FFFFFF'; c.fillRect(0, 0, tv.width, tv.height);
    return {
      tuval: tv, kendi: true,
      kalem: function () { return null; }, sil: function () { return false; },
      hazirla: function (t) { // bir kez çizildikten sonra okunamazsa video durmaz: son görüntü kalır
        var ts = o.bas + t; if (bozuk || K.hazirMi(ts)) return null;
        return K.ilerle(ts).catch(function (e) { if (!cizildi) throw e; bozuk = true; if (window.console) console.warn('Ekran kaydı ' + ts.toFixed(1) + ' sn’den sonra okunamadı:', e); });
      },
      kare: function (t) {
        var f = K.kare(o.bas + t); if (!f) return;
        cizildi = true;
        var b = boyut(f), g = gorunenBoyut(f, don), kx = o.kirp.x * g[0], ky = o.kirp.y * g[1], kw = o.kirp.g * g[0], kh = o.kirp.h * g[1];
        var v = kam(t, kw, kh, tv.width), olc = tv.width / v.g;
        var sx0 = Math.max(0, v.x), sy0 = Math.max(0, v.y), sx1 = Math.min(kw, v.x + v.g), sy1 = Math.min(kh, v.y + v.h);
        c.fillStyle = an.zemin || '#FFFFFF'; c.fillRect(0, 0, tv.width, tv.height); // görüş kaydın dışına taşarsa sayfanın rengi
        if (sx1 > sx0 && sy1 > sy0) yonluCiz(c, f, don, b[0], b[1], kx + sx0, ky + sy0, sx1 - sx0, sy1 - sy0, (sx0 - v.x) * olc, (sy0 - v.y) * olc, (sx1 - sx0) * olc, (sy1 - sy0) * olc);
      },
      durum: function () { return K.sorun ? { t: K.sorun.t - o.bas, neden: K.sorun.neden } : null; },
      kapat: function () { K.kapat(); }
    };
  };
  // o: { d, bas, ofs: yüz kaydının zamanı = tahta zamanı + ofs }
  S.yuz = function (o) {
    var d = o.d, don = d.video.donus || 0, K = S.kaynak(d), tut = document.createElement('canvas'), tc = tut.getContext('2d'), dolu = false, bozuk = false;
    var an = function (t) { return o.bas + t + o.ofs; };
    var sakla = function (f) {
      var b = boyut(f), g = gorunenBoyut(f, don), k = Math.min(1, 1920 / Math.max(g[0], g[1])), W = Math.max(2, Math.round(g[0] * k)), H = Math.max(2, Math.round(g[1] * k));
      if (tut.width !== W || tut.height !== H) { tut.width = W; tut.height = H; }
      yonluCiz(tc, f, don, b[0], b[1], 0, 0, g[0], g[1], 0, 0, W, H); dolu = true;
    };
    return {
      hazirla: function (t) { var a = an(t); if (bozuk || a < 0 || a > d.sure + 0.2 || K.hazirMi(a)) return null; return K.ilerle(a).catch(function () { bozuk = true; }); },
      kaynak: function (t) {
        var a = an(t);
        if (!bozuk && a >= 0 && a <= d.sure + 0.5) { var f = K.kare(a); if (f) sakla(f); }
        return dolu ? { im: tut, g: tut.width, y: tut.height, canli: true } : null;
      },
      durum: function () { return K.sorun ? { t: K.sorun.t - o.bas - o.ofs, neden: K.sorun.neden } : null; }, // okunamaz olduysa: içerikteki anı ve sebebi
      kapat: function () { K.kapat(); }
    };
  };

  /* ================= iki kaydı sesten eşitleme ================= */
  function fft(re, im) { // yerinde, 2'nin kuvveti uzunlukta
    var n = re.length, i, j, k, m;
    for (i = 1, j = 0; i < n; i++) { var bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { var tr = re[i]; re[i] = re[j]; re[j] = tr; var ti = im[i]; im[i] = im[j]; im[j] = ti; } }
    for (m = 2; m <= n; m <<= 1) {
      var a = -2 * Math.PI / m, wr = Math.cos(a), wi = Math.sin(a);
      for (k = 0; k < n; k += m) {
        var cr = 1, ci = 0;
        for (j = 0; j < m / 2; j++) {
          var p = k + j, q = p + m / 2, xr = re[q] * cr - im[q] * ci, xi = re[q] * ci + im[q] * cr;
          re[q] = re[p] - xr; im[q] = im[p] - xi; re[p] += xr; im[p] += xi;
          var nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
        }
      }
    }
  }
  function zarf(v, oran, hz) { // hz'de ses enerjisinin artışları (konuşmanın başlangıçları)
    var A = Math.max(1, Math.round(oran / hz)), F = Math.floor(v.length / A), e = new Float32Array(F), i, j;
    for (i = 0; i < F; i++) { var t = 0, b = i * A; for (j = 0; j < A; j++) { var x = v[b + j]; t += x * x; } e[i] = Math.log(Math.sqrt(t / A) + 1e-4); }
    var o = new Float32Array(F); for (i = 1; i < F; i++) o[i] = Math.max(0, e[i] - e[i - 1]);
    var ort = 0; for (i = 0; i < F; i++) ort += o[i]; ort /= F || 1; for (i = 0; i < F; i++) o[i] -= ort;
    return o;
  }
  // a: tahta kaydının sesi, b: yüz kaydının sesi (aynı hızda). → { ofs: b'deki an = a'daki an + ofs, guven: 0–1 }
  S.esitle = function (a, b, oran) {
    var HZ = 100, ea = zarf(a, oran, HZ), eb = zarf(b, oran, HZ), N = 1;
    while (N < ea.length + eb.length) N <<= 1;
    var ar = new Float64Array(N), ai = new Float64Array(N), br = new Float64Array(N), bi = new Float64Array(N), i;
    for (i = 0; i < ea.length; i++) ar[i] = ea[i];
    for (i = 0; i < eb.length; i++) br[i] = eb[i];
    fft(ar, ai); fft(br, bi);
    for (i = 0; i < N; i++) { var r = br[i] * ar[i] + bi[i] * ai[i], m = bi[i] * ar[i] - br[i] * ai[i]; ar[i] = r; ai[i] = -m; } // B · conj(A), sonra ters dönüşüm için eşlenik
    fft(ar, ai);
    var enIyi = -Infinity, k = 0, ikinci = -Infinity, enCok = Math.min(N / 2, 180 * HZ);
    var deger = function (L) { return ar[(L + N) % N] / N; };
    for (var L = -enCok; L <= enCok; L++) { var x = deger(L); if (x > enIyi) { enIyi = x; k = L; } }
    for (L = -enCok; L <= enCok; L++) { if (Math.abs(L - k) < HZ) continue; var y = deger(L); if (y > ikinci) ikinci = y; }
    var y0 = deger(k - 1), y1 = deger(k), y2 = deger(k + 1), pay = (y0 - 2 * y1 + y2) !== 0 ? 0.5 * (y0 - y2) / (y0 - 2 * y1 + y2) : 0; // parabolik inceltme
    var ea2 = 0, eb2 = 0; for (i = 0; i < ea.length; i++) ea2 += ea[i] * ea[i]; for (i = 0; i < eb.length; i++) eb2 += eb[i] * eb[i];
    var nk = enIyi / Math.sqrt(ea2 * eb2 || 1);
    return { ofs: (k + Math.max(-0.5, Math.min(0.5, pay))) / HZ, guven: Math.max(0, Math.min(1, nk * 2.2)), oran: ikinci > 0 ? enIyi / ikinci : 9 };
  };

  /* ================= konuşmanın başı ve sonu ================= */
  S.konusma = function (v, oran) { // { bas, son } sn: ilk ve son konuşma (yoksa null)
    var A = Math.round(oran * 0.02), F = Math.floor(v.length / A), e = new Float32Array(F), i, j;
    if (F < 5) return null;
    for (i = 0; i < F; i++) { var t = 0; for (j = 0; j < A; j++) { var x = v[i * A + j]; t += x * x; } e[i] = Math.sqrt(t / A); }
    var s = Array.prototype.slice.call(e).sort(function (a, b) { return a - b; }), taban = s[Math.floor(F * 0.1)], tepe = s[Math.floor(F * 0.98)];
    var esik = Math.max(taban * 3, tepe * 0.08, 0.004), bas = -1, son = -1;
    for (i = 0; i + 4 < F; i++) if (e[i] > esik && e[i + 2] > esik && e[i + 4] > esik) { bas = i; break; }
    for (i = F - 1; i >= 4; i--) if (e[i] > esik && e[i - 2] > esik && e[i - 4] > esik) { son = i; break; }
    return bas < 0 || son <= bas ? null : { bas: bas * 0.02, son: (son + 1) * 0.02 };
  };
})();
