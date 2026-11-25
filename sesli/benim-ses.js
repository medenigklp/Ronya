/* ============================================================
   SESLİ DERS — kendi sesin: kayıt ekranı (yalnız öğretmen; Ayarlar → Kendi sesin → Sesimi kaydet)
   İki kayıt alınır: 10–30 sn doğal konuşma ve Google'ın Türkçe onay cümlesi. İkisi de 24 kHz, tek kanal,
   16 bit WAV'a çevrilir ve ses servisine (/benim/olustur) gönderilir; servis Google'a iletir.
   Google, onayı okuyanla konuşanın aynı kişi olduğunu doğrular ve bir ses kimliği verir.
   Kayıtlar sitede ya da ses serviste saklanmaz.
   ============================================================ */
(function () {
  'use strict';
  if (window.SesliBenim) return;
  var MODEL = 'gemini-3.8-flash-tts';
  var ORAN = 24000;
  var ONAY = 'Bu sesin sahibi benim ve Google’ın bu sesi kullanarak sentetik bir ses modeli oluşturmasına izin veriyorum.';
  var ONAY_GOOGLE = "Bu sesin sahibi benim ve Google'ın bu sesi kullanarak sentetik bir ses modeli oluşturmasına izin veriyorum.";
  var ORNEK = 'Merhaba arkadaşlar! Bugün kimyasal tepkimelerin hızını konuşacağız. Bir tepkimenin hızlı ya da yavaş olması; sıcaklığa, ' +
    'derişime ve katalizöre bağlıdır. Mesela ocağı açtığımızda yemek daha çabuk pişer, çünkü sıcaklık artınca tanecikler daha sık ' +
    've daha şiddetli çarpışır. Şimdi birlikte bir örnek çözelim ve adım adım ilerleyelim. Hazırsanız başlıyoruz!';
  var KONUSMA = { enAz: 10, enCok: 30 }, ONAYK = { enAz: 3, enCok: 15 };

  var CSS =
    '#sesli-benim{position:fixed;inset:0;z-index:2147483647;background:rgba(20,17,15,.48);display:flex;align-items:center;justify-content:center;' +
      'padding:16px;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#14110F;-webkit-text-size-adjust:100%}' +
    '#sesli-benim *{box-sizing:border-box}' +
    '#sesli-benim .sb-kart{background:#FBF8F5;border-radius:20px;width:100%;max-width:520px;max-height:calc(100vh - 32px);overflow:auto;' +
      'box-shadow:0 24px 60px rgba(20,17,15,.28);padding:20px 20px 18px}' +
    '#sesli-benim .sb-ust{display:flex;align-items:center;gap:10px;margin-bottom:6px}' +
    '#sesli-benim h2{font-size:20px;margin:0;flex:1}' +
    '#sesli-benim .sb-kapat{border:0;background:#EFE7DF;color:#14110F;width:36px;height:36px;border-radius:50%;font-size:20px;line-height:1;cursor:pointer}' +
    '#sesli-benim .sb-adim{font:700 12px/1 system-ui,sans-serif;letter-spacing:.12em;color:#F85300;margin:10px 0 6px}' +
    '#sesli-benim p{margin:8px 0;font-size:15px;line-height:1.5;color:#3A332E}' +
    '#sesli-benim ul{margin:6px 0 10px 18px;padding:0;font-size:15px;line-height:1.5;color:#3A332E}' +
    '#sesli-benim .sb-metin{background:#fff;border:2px solid #E7E0D9;border-radius:14px;padding:14px 16px;font-size:17px;line-height:1.6;color:#14110F;margin:10px 0}' +
    '#sesli-benim .sb-metin.onay{font-weight:700;border-color:#F85300}' +
    '#sesli-benim .sb-satir{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:12px}' +
    '#sesli-benim button.sb-d{border:0;border-radius:999px;padding:12px 20px;font:600 15px system-ui,sans-serif;cursor:pointer;background:#F85300;color:#fff}' +
    '#sesli-benim button.sb-d.ikincil{background:#EFE7DF;color:#14110F}' +
    '#sesli-benim button.sb-d:disabled{opacity:.45;cursor:default}' +
    '#sesli-benim .sb-kayit{display:flex;align-items:center;gap:12px;margin-top:12px}' +
    '#sesli-benim .sb-nokta{width:14px;height:14px;border-radius:50%;background:#C0392B;animation:sb-yan 1s ease-in-out infinite}' +
    '@keyframes sb-yan{50%{opacity:.25}}' +
    '#sesli-benim .sb-sure{font:700 18px ui-monospace,Menlo,monospace;min-width:52px}' +
    '#sesli-benim .sb-olcer{flex:1;height:10px;border-radius:999px;background:#EFE7DF;overflow:hidden}' +
    '#sesli-benim .sb-olcer i{display:block;height:100%;width:0;background:#1B6B4A;transition:width .08s}' +
    '#sesli-benim audio{width:100%;margin-top:10px}' +
    '#sesli-benim .sb-not{font-size:14px;color:#7A726B}' +
    '#sesli-benim .sb-hata{color:#B42318;font-weight:600}' +
    '#sesli-benim .sb-tamam{color:#1B6B4A;font-weight:700}' +
    '#sesli-benim label.sb-sec{display:inline-flex;align-items:center;gap:6px;margin-right:14px;font-size:15px}' +
    '#sesli-benim .sb-don{width:28px;height:28px;border-radius:50%;border:4px solid #E7E0D9;border-top-color:#F85300;animation:sb-dn .9s linear infinite}' +
    '@keyframes sb-dn{to{transform:rotate(360deg)}}';

  function el(etiket, sinif, html) { var e = document.createElement(etiket); if (sinif) e.className = sinif; if (html != null) e.innerHTML = html; return e; }
  function dugme(yazi, ikincil) { var b = el('button', 'sb-d' + (ikincil ? ' ikincil' : '')); b.type = 'button'; b.textContent = yazi; return b; }
  function sureYazi(sn) { sn = Math.max(0, Math.floor(sn)); return Math.floor(sn / 60) + ':' + ('0' + (sn % 60)).slice(-2); }
  function b64(u8) { var s = '', P = 0x8000; for (var i = 0; i < u8.length; i += P) s += String.fromCharCode.apply(null, u8.subarray(i, i + P)); return btoa(s); }

  // Kayıt: mikrofon + MediaRecorder; ses düzeyi göstergesi için AnalyserNode
  function kaydiBaslat(gosterge) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) return Promise.reject(new Error('destek'));
    return navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, channelCount: 1 } }).then(function (akis) {
      var tur = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'].filter(function (t) { try { return MediaRecorder.isTypeSupported(t); } catch (e) { return false; } })[0];
      var kr = tur ? new MediaRecorder(akis, { mimeType: tur }) : new MediaRecorder(akis), parca = [];
      kr.ondataavailable = function (e) { if (e.data && e.data.size) parca.push(e.data); };
      var AC = window.AudioContext || window.webkitAudioContext, ac = null, an = null, raf = 0;
      try {
        ac = new AC(); an = ac.createAnalyser(); an.fftSize = 512; ac.createMediaStreamSource(akis).connect(an);
        var buf = new Uint8Array(an.fftSize);
        var tik = function () { an.getByteTimeDomainData(buf); var m = 0; for (var i = 0; i < buf.length; i++) m = Math.max(m, Math.abs(buf[i] - 128)); gosterge(Math.min(1, m / 90)); raf = requestAnimationFrame(tik); };
        tik();
      } catch (e) { /* gösterge olmadan da kayıt olur */ }
      kr.start(250);
      return {
        bitir: function () {
          return new Promise(function (ok) {
            kr.onstop = function () {
              cancelAnimationFrame(raf); try { ac && ac.close(); } catch (e) {}
              akis.getTracks().forEach(function (t) { t.stop(); });
              ok(new Blob(parca, { type: kr.mimeType || tur || 'audio/mp4' }));
            };
            try { kr.stop(); } catch (e) { kr.onstop(); }
          });
        }
      };
    });
  }

  // Kaydı tek kanal, 24 kHz, 16 bit WAV'a çevir; baştaki ve sondaki sessizliği kırp, en çok enCok saniye
  function wavaCevir(blob, enCok) {
    var AC = window.AudioContext || window.webkitAudioContext, O = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    return blob.arrayBuffer().then(function (ab) {
      var ac = new AC();
      return new Promise(function (ok, red) { var p = ac.decodeAudioData(ab, ok, red); if (p && p.then) p.then(ok, red); })
        .then(function (b) { try { ac.close(); } catch (e) {} return b; });
    }).then(function (buf) {
      var n = buf.length, k = buf.numberOfChannels, v = new Float32Array(n), c, i;
      for (c = 0; c < k; c++) { var d = buf.getChannelData(c); for (i = 0; i < n; i++) v[i] += d[i] / k; }
      var esik = 0.015, bas = 0, son = n - 1, pay = Math.round(buf.sampleRate * 0.25);
      while (bas < n && Math.abs(v[bas]) < esik) bas++;
      while (son > bas && Math.abs(v[son]) < esik) son--;
      if (son <= bas) throw new Error('sessiz');
      v = v.subarray(Math.max(0, bas - pay), Math.min(n, son + pay + 1));
      var hedef = Math.min(Math.ceil(v.length * ORAN / buf.sampleRate), enCok * ORAN);
      var oc = new O(1, hedef, ORAN), kb = oc.createBuffer(1, v.length, buf.sampleRate);
      kb.getChannelData(0).set(v);
      var kaynak = oc.createBufferSource(); kaynak.buffer = kb; kaynak.connect(oc.destination); kaynak.start(0);
      return new Promise(function (ok, red) {
        oc.oncomplete = function (e) { ok(e.renderedBuffer); };
        var p = oc.startRendering(); if (p && p.then) p.then(ok, red);
      });
    }).then(function (r) {
      var f = r.getChannelData(0), tepe = 0, i;
      for (i = 0; i < f.length; i++) tepe = Math.max(tepe, Math.abs(f[i]));
      var kazanc = tepe > 0 && tepe < 0.5 ? Math.min(3, 0.8 / tepe) : 1; // çok kısık kayıt biraz yükseltilir
      var i16 = new Int16Array(f.length);
      for (i = 0; i < f.length; i++) { var x = Math.max(-1, Math.min(1, f[i] * kazanc)); i16[i] = x < 0 ? Math.round(x * 32768) : Math.round(x * 32767); }
      var b = new ArrayBuffer(44 + i16.length * 2), dv = new DataView(b), yaz = function (o, t) { for (var j = 0; j < t.length; j++) dv.setUint8(o + j, t.charCodeAt(j)); };
      yaz(0, 'RIFF'); dv.setUint32(4, 36 + i16.length * 2, true); yaz(8, 'WAVE'); yaz(12, 'fmt ');
      dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true); dv.setUint32(24, ORAN, true);
      dv.setUint32(28, ORAN * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); yaz(36, 'data'); dv.setUint32(40, i16.length * 2, true);
      new Int16Array(b, 44).set(i16);
      return { veri: b64(new Uint8Array(b)), sure: f.length / ORAN };
    });
  }

  function ac(o) {
    o = o || {};
    if (document.getElementById('sesli-benim')) return;
    try { if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen(); } catch (e) {}
    if (!document.getElementById('sesli-benim-css')) { var st = el('style'); st.id = 'sesli-benim-css'; st.textContent = CSS; document.head.appendChild(st); }
    var kok = el('div'); kok.id = 'sesli-benim'; kok.setAttribute('role', 'dialog'); kok.setAttribute('aria-modal', 'true'); kok.setAttribute('aria-label', 'Kendi sesin');
    var kart = el('div', 'sb-kart'); kok.appendChild(kart);
    var ust = el('div', 'sb-ust'), baslik = el('h2', '', 'Kendi sesin'), kapatB = el('button', 'sb-kapat', '×');
    kapatB.type = 'button'; kapatB.setAttribute('aria-label', 'Kapat'); ust.appendChild(baslik); ust.appendChild(kapatB);
    var govde = el('div'); kart.appendChild(ust); kart.appendChild(govde);
    document.body.appendChild(kok);

    var durum = { cins: o.cins === 'k' ? 'k' : 'e', konusma: null, onay: null, kayit: null, bitti: false };
    var kapat = function () { if (durum.kayit) durum.kayit.bitir(); kok.remove(); if (o.bitti) o.bitti(durum.bitti); };
    kapatB.onclick = kapat;
    var temizle = function () { govde.innerHTML = ''; };

    // ---- 1. giriş
    function giris() {
      temizle();
      govde.appendChild(el('p', '', 'Sesinin kopyasını oluşturmak için iki kısa kayıt yapacağız. Sonra yazdığın her ders ve soru çözümü senin sesinle okunabilir.'));
      govde.appendChild(el('ul', '', '<li>Sessiz bir odada ol; televizyon, fan ya da müzik kapalı olsun.</li>' +
        '<li>Telefonu ağzından bir karış uzakta tut; kulaklık takma.</li>' +
        '<li>İki kaydı aynı yerde, art arda yap.</li>' +
        '<li>Ders anlatır gibi, doğal ve canlı konuş: kopya ses, kayıttaki tarzını taklit eder.</li>'));
      var sec = el('p', '', 'Sesin: ');
      [['e', 'Erkek'], ['k', 'Kadın']].forEach(function (x) {
        var l = el('label', 'sb-sec'), r = el('input'); r.type = 'radio'; r.name = 'sb-cins'; r.value = x[0]; r.checked = durum.cins === x[0];
        r.onchange = function () { durum.cins = x[0]; }; l.appendChild(r); l.appendChild(document.createTextNode(x[1])); sec.appendChild(l);
      });
      govde.appendChild(sec);
      govde.appendChild(el('p', 'sb-not', 'Kayıtların yalnızca kopya sesi oluşturmak için Google’a gönderilir; sitede saklanmaz.'));
      var s = el('div', 'sb-satir'), b = dugme('Başla'); b.onclick = function () { kayitAdimi(1); }; s.appendChild(b); govde.appendChild(s);
    }

    // ---- 2-3. kayıtlar
    function kayitAdimi(no) {
      temizle();
      var sinir = no === 1 ? KONUSMA : ONAYK;
      govde.appendChild(el('div', 'sb-adim', no === 1 ? '1. KAYIT · DOĞAL KONUŞMA' : '2. KAYIT · ONAY CÜMLESİ'));
      govde.appendChild(el('p', '', no === 1 ? 'Aşağıdaki metni ders anlatır gibi oku (en az ' + sinir.enAz + ', en çok ' + sinir.enCok + ' saniye). İstersen kendi cümlelerinle de konuşabilirsin.'
        : 'Şimdi Google’ın istediği onay cümlesini, aynı yerde ve aynı sesle tam olarak oku:'));
      var metin = el('div', 'sb-metin' + (no === 2 ? ' onay' : '')); metin.textContent = no === 1 ? ORNEK : ONAY; govde.appendChild(metin);
      var alan = el('div'), not = el('p', 'sb-not'); govde.appendChild(alan); govde.appendChild(not);
      var onceki = no === 1 ? durum.konusma : durum.onay;

      var hazir = function (k) { // kayıt alındı: dinle, yeniden kaydet, devam
        alan.innerHTML = '';
        var a = el('audio'); a.controls = true; a.src = URL.createObjectURL(k.blob); alan.appendChild(a);
        alan.appendChild(el('p', 'sb-not', 'Kayıt süresi: ' + sureYazi(k.sure) + '. Dinle; net ve gürültüsüz değilse yeniden kaydet.'));
        var s = el('div', 'sb-satir'), yeniden = dugme('Yeniden kaydet', true), devam = dugme(no === 1 ? 'Devam' : 'Sesimi oluştur');
        yeniden.onclick = function () { baslat(); };
        devam.onclick = function () { if (no === 1) kayitAdimi(2); else gonder(); };
        s.appendChild(yeniden); s.appendChild(devam); alan.appendChild(s);
      };
      var baslat = function () {
        alan.innerHTML = ''; not.textContent = ''; not.className = 'sb-not';
        var satir = el('div', 'sb-kayit'), nokta = el('span', 'sb-nokta'), sure = el('span', 'sb-sure', '0:00'), olcer = el('span', 'sb-olcer'), ibre = el('i');
        olcer.appendChild(ibre); satir.appendChild(nokta); satir.appendChild(sure); satir.appendChild(olcer);
        var s = el('div', 'sb-satir'), bitir = dugme('Kaydı bitir'); bitir.disabled = true; s.appendChild(bitir);
        alan.appendChild(el('p', 'sb-not', 'Mikrofon izni istenirse "İzin ver"e dokun.'));
        kaydiBaslat(function (d) { ibre.style.width = Math.round(d * 100) + '%'; }).then(function (k) {
          alan.innerHTML = ''; alan.appendChild(satir); alan.appendChild(s);
          durum.kayit = k;
          var t0 = Date.now(), zaman = setInterval(function () {
            var sn = (Date.now() - t0) / 1000; sure.textContent = sureYazi(sn);
            bitir.disabled = sn < sinir.enAz;
            if (sn >= sinir.enCok) bitir.onclick();
          }, 200);
          bitir.onclick = function () {
            clearInterval(zaman); bitir.disabled = true; durum.kayit = null;
            k.bitir().then(function (blob) {
              not.textContent = 'Kayıt hazırlanıyor…';
              return wavaCevir(blob, sinir.enCok).then(function (w) {
                if (w.sure < sinir.enAz - 1) { not.className = 'sb-not sb-hata'; not.textContent = 'Kayıt çok kısa ya da çok sessiz geldi (' + sureYazi(w.sure) + '). Yeniden dene.'; alan.innerHTML = ''; var s2 = el('div', 'sb-satir'), y = dugme('Yeniden kaydet'); y.onclick = baslat; s2.appendChild(y); alan.appendChild(s2); return; }
                not.textContent = '';
                var kayit = { blob: blob, sure: w.sure, veri: w.veri };
                if (no === 1) durum.konusma = kayit; else durum.onay = kayit;
                hazir(kayit);
              });
            }).catch(function (e) {
              not.className = 'sb-not sb-hata'; not.textContent = e && e.message === 'sessiz' ? 'Kayıtta ses duyulmadı. Mikrofonun açık olduğundan emin olup yeniden dene.' : 'Kayıt işlenemedi; yeniden dene.';
              alan.innerHTML = ''; var s3 = el('div', 'sb-satir'), y3 = dugme('Yeniden kaydet'); y3.onclick = baslat; s3.appendChild(y3); alan.appendChild(s3);
            });
          };
        }, function (e) {
          alan.innerHTML = '';
          not.className = 'sb-not sb-hata';
          not.textContent = e && e.message === 'destek' ? 'Bu tarayıcı ses kaydını desteklemiyor. Safari ya da Chrome’un güncel sürümüyle dene.'
            : 'Mikrofona izin verilmedi. Tarayıcı ayarlarından bu siteye mikrofon izni verip yeniden dene.';
          var s4 = el('div', 'sb-satir'), y4 = dugme('Yeniden dene'); y4.onclick = baslat; s4.appendChild(y4); alan.appendChild(s4);
        });
      };
      if (onceki) hazir(onceki);
      else { var s0 = el('div', 'sb-satir'), b0 = dugme('Kayda başla'); b0.onclick = baslat; s0.appendChild(b0); alan.appendChild(s0); }
    }

    // ---- 4. gönder
    function gonder() {
      temizle();
      var sat = el('div', 'sb-kayit'); sat.appendChild(el('span', 'sb-don')); sat.appendChild(el('span', '', 'Sesin Google’a gönderiliyor ve doğrulanıyor…'));
      govde.appendChild(sat);
      var govdeJ = JSON.stringify({ store: true, voice: { model: MODEL, type: 'replicated', display_name: 'Öğretmen sesi',
        replicated: { source_audio: { mime_type: 'audio/wav', data: durum.konusma.veri }, consent_audio: { mime_type: 'audio/wav', data: durum.onay.veri } } } });
      fetch(String(o.adres || '').replace(/\/+$/, '') + '/benim/olustur', { method: 'POST', mode: 'cors', credentials: 'omit',
        headers: { 'Content-Type': 'application/json', 'X-Ogretmen': o.anahtar || '', 'X-Cins': durum.cins }, body: govdeJ })
        .then(function (r) { return r.json().catch(function () { return { tamam: false, hata: 'Ses servisi yanıt vermedi (' + r.status + ').' }; }); })
        .then(function (j) {
          temizle();
          if (j && j.tamam) {
            durum.bitti = true;
            govde.appendChild(el('p', 'sb-tamam', 'Kopya sesin hazır!'));
            govde.appendChild(el('p', '', 'Ayarlar’daki ses listesinden "Benim sesim"i seçebilir ya da öğrenci seslerinden birine verebilirsin. Sonra "Bu dersi sesimle hazırla" ile bir dersin bütün cümlelerini önceden hazırlayabilirsin.'));
            var s = el('div', 'sb-satir'), b = dugme('Tamam'); b.onclick = kapat; s.appendChild(b); govde.appendChild(s);
          } else hataGoster((j && j.hata) || 'Ses oluşturulamadı.');
        }, function () { temizle(); hataGoster('Ses servisine ulaşılamadı; bağlantını kontrol edip yeniden dene.'); });
    }
    function hataGoster(m) {
      govde.appendChild(el('p', 'sb-hata', 'Olmadı: ' + m));
      govde.appendChild(el('p', 'sb-not', 'Onay cümlesini metindeki gibi tam okuduğundan ve iki kaydı aynı yerde, aynı sesle yaptığından emin ol.'));
      var s = el('div', 'sb-satir'), y = dugme('Kayıtlara dön', true), t = dugme('Yeniden gönder');
      y.onclick = function () { kayitAdimi(1); }; t.onclick = gonder; s.appendChild(y); s.appendChild(t); govde.appendChild(s);
    }
    giris();
  }

  window.SesliBenim = { ac: ac, ONAY: ONAY_GOOGLE };
})();
