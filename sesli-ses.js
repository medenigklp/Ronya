/* =====================================================================
   SESLİ DERS · SES — stüdyo sesi ve fon müziği (Ronya)
   Kendi kaydına: gürültü azaltma (spektral kapı), alçak sesleri kesen süzgeç,
   eşitleme (netlik ve hava), sıkıştırıcı. Bütün dosyaya: sosyal medya ses
   düzeyi (−15 LUFS), tepe sınırlayıcı. İsteğe bağlı fon müziği kodla üretilir,
   konuşurken kendiliğinden kısılır.
   ===================================================================== */
(function () {
  'use strict';
  if (window.SesliSes) return;
  var S = window.SesliSes = {};

  /* ---------------- FFT (yerinde, 2'nin kuvveti) ---------------- */
  var FFT_ON = {};
  function fftHazirla(n) {
    if (FFT_ON[n]) return FFT_ON[n];
    var rev = new Uint32Array(n), cs = new Float64Array(n / 2), sn = new Float64Array(n / 2), b = Math.round(Math.log(n) / Math.LN2), i, j;
    for (i = 0; i < n; i++) { var r = 0, x = i; for (j = 0; j < b; j++) { r = (r << 1) | (x & 1); x >>= 1; } rev[i] = r; }
    for (i = 0; i < n / 2; i++) { cs[i] = Math.cos(2 * Math.PI * i / n); sn[i] = Math.sin(2 * Math.PI * i / n); }
    return (FFT_ON[n] = { rev: rev, cs: cs, sn: sn });
  }
  function fft(re, im, ters) {
    var n = re.length, T = fftHazirla(n), i, j, k, t;
    for (i = 0; i < n; i++) { j = T.rev[i]; if (j > i) { t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
    for (var boy = 2; boy <= n; boy <<= 1) {
      var yari = boy >> 1, adim = n / boy;
      for (i = 0; i < n; i += boy) for (j = 0, k = 0; j < yari; j++, k += adim) {
        var wr = T.cs[k], wi = ters ? T.sn[k] : -T.sn[k], a = i + j, b2 = a + yari;
        var xr = re[b2] * wr - im[b2] * wi, xi = re[b2] * wi + im[b2] * wr;
        re[b2] = re[a] - xr; im[b2] = im[a] - xi; re[a] += xr; im[a] += xi;
      }
    }
    if (ters) for (i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
  }
  S.fft = fft;

  /* ---------------- gürültü azaltma: her frekansta gürültü tabanının altı kısılır ---------------- */
  // o: { esikDb: tabanın kaç dB üstü konuşma sayılır, azaltDb: gürültü ne kadar kısılır }
  S.gurultuAzalt = function (v, fs, o) {
    o = o || {};
    var N = fs > 32000 ? 2048 : 1024, H = N / 4, n = v.length, i, k, f;
    if (n < N * 6) return v;
    var w = new Float32Array(N); for (i = 0; i < N; i++) w[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N);
    var K = N / 2 + 1, F = Math.floor((n - N) / H) + 1, M = new Float32Array(F * K), re = new Float64Array(N), im = new Float64Array(N);
    for (f = 0; f < F; f++) { var o0 = f * H; for (i = 0; i < N; i++) { re[i] = v[o0 + i] * w[i]; im[i] = 0; } fft(re, im, false); for (k = 0; k < K; k++) M[f * K + k] = Math.sqrt(re[k] * re[k] + im[k] * im[k]); }
    // her frekansta gürültü tabanı: karelerin en sessiz %10'u (kelime aralarındaki sessizlik)
    var taban = new Float32Array(K), dz = new Float32Array(F), yer = Math.max(0, Math.floor(F * 0.1));
    for (k = 0; k < K; k++) { for (f = 0; f < F; f++) dz[f] = M[f * K + k]; dz.sort(); taban[k] = dz[yer] * 2.7; } // gürültünün ortalaması ≈ %10'luk değerin 2,7 katı (Rayleigh)
    var ust = Math.pow(10, (o.esikDb == null ? 6 : o.esikDb) / 20), alt = Math.pow(10, -(o.azaltDb == null ? 12 : o.azaltDb) / 20);
    var birak = Math.exp(-H / (fs * 0.07)), satir = new Float32Array(K), onceki = new Float32Array(K);
    for (f = 0; f < F; f++) { // kazanç: yumuşak geçiş, frekansta komşularla, zamanda yavaş bırakma (müzikal gürültü olmasın)
      for (k = 0; k < K; k++) { var x = M[f * K + k] / (taban[k] * ust + 1e-9); satir[k] = x <= 1 ? alt : x >= 2 ? 1 : alt + (1 - alt) * (x - 1); }
      for (k = 0; k < K; k++) {
        var g = (satir[k] + satir[Math.max(0, k - 1)] + satir[Math.min(K - 1, k + 1)]) / 3;
        if (f) g = Math.max(g, onceki[k] * birak + alt * (1 - birak));
        onceki[k] = g; M[f * K + k] = g;
      }
    }
    var cik = new Float32Array(n), nrm = new Float32Array(n);
    for (f = 0; f < F; f++) {
      var o1 = f * H; for (i = 0; i < N; i++) { re[i] = v[o1 + i] * w[i]; im[i] = 0; }
      fft(re, im, false);
      for (k = 0; k < K; k++) { var gk = M[f * K + k]; re[k] *= gk; im[k] *= gk; if (k > 0 && k < N / 2) { re[N - k] *= gk; im[N - k] *= gk; } }
      fft(re, im, true);
      for (i = 0; i < N; i++) { cik[o1 + i] += re[i] * w[i]; nrm[o1 + i] += w[i] * w[i]; }
    }
    for (i = 0; i < n; i++) cik[i] = nrm[i] > 0.05 ? cik[i] / nrm[i] : v[i] * alt;
    return cik;
  };

  /* ---------------- süzgeçler (RBJ biquad) ---------------- */
  function katsayi(tip, f0, Q, dB, fs) {
    var A = Math.pow(10, (dB || 0) / 40), w0 = 2 * Math.PI * Math.min(f0, fs * 0.45) / fs, cs = Math.cos(w0), sn = Math.sin(w0), al = sn / (2 * Q), b0, b1, b2, a0, a1, a2, sq;
    if (tip === 'hp') { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = (1 + cs) / 2; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
    else if (tip === 'lp') { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = (1 - cs) / 2; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
    else if (tip === 'tepe') { b0 = 1 + al * A; b1 = -2 * cs; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * cs; a2 = 1 - al / A; }
    else if (tip === 'ustRaf') { sq = 2 * Math.sqrt(A) * al; b0 = A * ((A + 1) + (A - 1) * cs + sq); b1 = -2 * A * ((A - 1) + (A + 1) * cs); b2 = A * ((A + 1) + (A - 1) * cs - sq); a0 = (A + 1) - (A - 1) * cs + sq; a1 = 2 * ((A - 1) - (A + 1) * cs); a2 = (A + 1) - (A - 1) * cs - sq; }
    else { sq = 2 * Math.sqrt(A) * al; b0 = A * ((A + 1) - (A - 1) * cs + sq); b1 = 2 * A * ((A - 1) - (A + 1) * cs); b2 = A * ((A + 1) - (A - 1) * cs - sq); a0 = (A + 1) + (A - 1) * cs + sq; a1 = -2 * ((A - 1) + (A + 1) * cs); a2 = (A + 1) + (A - 1) * cs - sq; }
    return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
  }
  function suz(v, k) { var x1 = 0, x2 = 0, y1 = 0, y2 = 0; for (var i = 0; i < v.length; i++) { var x = v[i], y = k[0] * x + k[1] * x1 + k[2] * x2 - k[3] * y1 - k[4] * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; v[i] = y; } return v; }
  S.suz = function (v, tip, f0, Q, dB, fs) { return suz(v, katsayi(tip, f0, Q, dB, fs)); };

  /* ---------------- sıkıştırıcı: sesin inip çıkması dengelenir ---------------- */
  S.sikistir = function (v, fs, o) {
    var esik = o.esik, oran = o.oran, diz = o.diz || 6, at = Math.exp(-1 / (fs * (o.atak || 0.008))), rl = Math.exp(-1 / (fs * (o.birak || 0.15))), ra = Math.exp(-1 / (fs * 0.012));
    var env = 0, p = 0, kaz = Math.pow(10, (o.kazanc || 0) / 20);
    for (var i = 0; i < v.length; i++) {
      var x = v[i]; p = ra * p + (1 - ra) * x * x;
      var asim = 10 * Math.log10(p + 1e-12) - esik, gr;
      if (2 * asim < -diz) gr = 0; else if (2 * Math.abs(asim) <= diz) gr = (1 / oran - 1) * (asim + diz / 2) * (asim + diz / 2) / (2 * diz); else gr = (1 / oran - 1) * asim;
      env = gr < env ? at * env + (1 - at) * gr : rl * env + (1 - rl) * gr;
      v[i] = x * Math.pow(10, env / 20) * kaz;
    }
    return v;
  };
  function konusmaRms(v) { var t = 0, n = 0; for (var i = 0; i < v.length; i++) { var x = v[i]; if (x > 0.012 || x < -0.012) { t += x * x; n++; } } return n > 100 ? Math.sqrt(t / n) : 0; }

  // kendi kaydın için: gürültü azaltma, 80 Hz altı kesilir, boğukluk azalır, netlik ve hava eklenir, ses dengelenir
  S.sesIsle = function (v, fs) {
    var x = S.gurultuAzalt(v, fs, { esikDb: 6, azaltDb: 12 });
    if (x === v) x = Float32Array.from(v);
    suz(x, katsayi('hp', 80, 0.707, 0, fs));
    suz(x, katsayi('tepe', 250, 1.0, -2.5, fs));
    suz(x, katsayi('tepe', 3400, 0.9, 3, fs));
    if (fs > 30000) suz(x, katsayi('ustRaf', 9000, 0.707, 2.5, fs)); else suz(x, katsayi('ustRaf', 7000, 0.707, 1.5, fs));
    var r = konusmaRms(x); if (r > 0) { var k = Math.max(0.25, Math.min(8, 0.1 / r)); for (var i = 0; i < x.length; i++) x[i] *= k; }
    return S.sikistir(x, fs, { esik: -24, oran: 3, diz: 6, atak: 0.006, birak: 0.14, kazanc: 3 });
  };

  /* ---------------- ses düzeyi (ITU-R BS.1770, LUFS) ve tepe sınırlayıcı ---------------- */
  S.lufs = function (v, fs) {
    var x = Float32Array.from(v);
    suz(x, katsayi('ustRaf', 1681.97, 0.7072, 3.999, fs)); suz(x, katsayi('hp', 38.135, 0.5003, 0, fs));
    var B = Math.round(0.4 * fs), A = Math.round(0.1 * fs), ps = new Float64Array(x.length + 1), i, bl = [];
    for (i = 0; i < x.length; i++) ps[i + 1] = ps[i] + x[i] * x[i];
    for (var s = 0; s + B <= x.length; s += A) bl.push((ps[s + B] - ps[s]) / B);
    var L = function (z) { return -0.691 + 10 * Math.log10(z + 1e-12); };
    var a = bl.filter(function (z) { return L(z) > -70; }); if (!a.length) return -70;
    var ort = a.reduce(function (t, z) { return t + z; }, 0) / a.length, gor = L(ort) - 10;
    var b = a.filter(function (z) { return L(z) > gor; }); if (!b.length) return L(ort);
    return L(b.reduce(function (t, z) { return t + z; }, 0) / b.length);
  };
  S.sinirla = function (v, fs, tavanDb) { // ileriye bakan tepe sınırlayıcı: tepe gelmeden kazanç yumuşakça iner
    var tavan = Math.pow(10, (tavanDb == null ? -1 : tavanDb) / 20), L = Math.max(2, Math.round(0.005 * fs)), rl = Math.exp(-1 / (fs * 0.08)), n = v.length, i;
    var hedef = new Float32Array(n); for (i = 0; i < n; i++) { var a = Math.abs(v[i]); hedef[i] = a > tavan ? tavan / a : 1; }
    var en = new Float32Array(n), dq = new Int32Array(n), h = 0, t = 0;
    for (i = n - 1; i >= 0; i--) { while (t > h && hedef[dq[t - 1]] >= hedef[i]) t--; dq[t++] = i; while (dq[h] > i + L) h++; en[i] = hedef[dq[h]]; }
    var top = 0, g = 1; // geçmiş L kazancın ortalaması: kazanç basamak yapmadan, tepeye varmadan iner
    for (i = 0; i < n; i++) {
      top += en[i]; if (i >= L) top -= en[i - L];
      var ort = (top + (L - Math.min(i + 1, L))) / L;
      g = ort < g ? ort : rl * g + (1 - rl) * ort;
      v[i] *= g;
    }
    for (i = 0; i < n; i++) { if (v[i] > tavan) v[i] = tavan; else if (v[i] < -tavan) v[i] = -tavan; }
    return v;
  };

  /* ---------------- fon müziği: kodla üretilir (telif yok) ---------------- */
  function nota(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function rastgele(t) { var x = t || 1; return function () { x = (x * 1103515245 + 12345) & 0x7fffffff; return x / 0x7fffffff; }; }
  function tel(v, fs, bas, f, guc, sure, parlak) { // Karplus-Strong: yumuşak telli çalgı
    var P = Math.max(2, Math.round(fs / f)), buf = new Float32Array(P), r = rastgele(Math.round(f * 1000) + bas), i;
    for (i = 0; i < P; i++) buf[i] = (r() * 2 - 1);
    var onceki = 0; for (i = 0; i < P; i++) { onceki = onceki * (1 - parlak) + buf[i] * parlak; buf[i] = onceki; }
    var n = Math.min(Math.round(sure * fs), v.length - bas), j = 0, dus = 0.996;
    for (i = 0; i < n; i++) { var a = buf[j], b = buf[(j + 1) % P]; var y = (a + b) * 0.5 * dus; buf[j] = y; j = (j + 1) % P; v[bas + i] += y * guc * Math.min(1, i / (fs * 0.003)); }
  }
  S.muzik = function (fs, sure, tur) {
    var n = Math.max(1, Math.round(sure * fs)), v = new Float32Array(n), enerjik = tur === 'enerjik', i, b;
    var bpm = enerjik ? 100 : 72, vurus = 60 / bpm, olcu = vurus * 4;
    var akorlar = enerjik ? [[55, 59, 62, 66], [52, 55, 59, 62], [48, 52, 55, 59], [50, 54, 57, 62]] : [[48, 52, 55, 59], [45, 48, 52, 55], [41, 45, 48, 52], [43, 47, 50, 55]];
    var olcuSay = Math.ceil(sure / olcu) + 1;
    for (b = 0; b < olcuSay; b++) { // yumuşak akor dokusu
      var ak = akorlar[b % 4], t0 = b * olcu, b0 = Math.round(t0 * fs), m = Math.round((olcu + 1.2) * fs);
      for (var q = 0; q < ak.length; q++) {
        var f = nota(ak[q]), f2 = f * 1.004, f3 = f * 0.996, g = enerjik ? 0.05 : 0.07;
        for (i = 0; i < m && b0 + i < n; i++) {
          var t = i / fs, z = Math.min(1, t / 0.7) * (t > olcu ? Math.max(0, 1 - (t - olcu) / 1.2) : 1);
          v[b0 + i] += g * z * (Math.sin(2 * Math.PI * f * t) + 0.6 * Math.sin(2 * Math.PI * f2 * t + 1) + 0.6 * Math.sin(2 * Math.PI * f3 * t + 2) + 0.15 * Math.sin(4 * Math.PI * f * t)) / 2.35;
        }
      }
      var adimS = enerjik ? 16 : 8, desen = enerjik ? [0, 2, 1, 3, 2, 1, 3, 2] : [0, 1, 2, 3, 2, 1, 2, 3]; // arpej
      for (var s = 0; s < adimS; s++) {
        var ts = t0 + s * olcu / adimS; if (ts >= sure) break;
        if (enerjik && s % 2 && s % 4 !== 3) continue;
        var mn = ak[desen[s % desen.length]] + 12 + (enerjik && s >= 8 ? 12 : 0);
        tel(v, fs, Math.round(ts * fs), nota(mn), enerjik ? 0.16 : 0.2, enerjik ? 0.8 : 1.4, enerjik ? 0.55 : 0.4);
      }
      if (enerjik) for (var k = 0; k < 4; k++) { // hafif davul ve bas
        var tk = t0 + k * vurus, kb = Math.round(tk * fs), kn = Math.round(0.2 * fs), faz = 0;
        if (k % 2 === 0) for (i = 0; i < kn && kb + i < n; i++) { var tt = i / fs, fk = 45 + 70 * Math.exp(-tt * 25); faz += 2 * Math.PI * fk / fs; v[kb + i] += 0.35 * Math.sin(faz) * Math.exp(-tt * 14); }
        var hb = Math.round((tk + vurus / 2) * fs), r2 = rastgele(b * 4 + k + 1), onc = 0;
        for (i = 0; i < Math.round(0.035 * fs) && hb + i < n; i++) { var g2 = r2() * 2 - 1, hp = g2 - onc; onc = g2; v[hb + i] += 0.05 * hp * Math.exp(-i / (fs * 0.012)); }
        var fb = nota(ak[0] - 12), bn = Math.round(vurus * 0.9 * fs);
        for (i = 0; i < bn && kb + i < n; i++) { var tb = i / fs; v[kb + i] += 0.09 * Math.sin(2 * Math.PI * fb * tb) * Math.min(1, tb / 0.01) * Math.exp(-tb * 2.5); }
      }
    }
    suz(v, katsayi('lp', 6500, 0.707, 0, fs)); suz(v, katsayi('hp', 50, 0.707, 0, fs));
    var tepe = 0; for (i = 0; i < n; i++) tepe = Math.max(tepe, Math.abs(v[i]));
    if (tepe > 0) { var o = 0.5 / tepe; for (i = 0; i < n; i++) v[i] *= o; }
    return v;
  };

  /* ---------------- son düzenleme: fon müziği (konuşurken kısılır), ses düzeyi, sınırlayıcı ---------------- */
  // ses: karışım; o: { muzik: 'sakin' | 'enerjik' | Float32Array (kendi müziğin) | null, bas, son (sn), hedef (LUFS) }
  S.son = function (ses, fs, o) {
    o = o || {};
    var n = ses.length, i, b0 = Math.max(0, Math.round((o.bas || 0) * fs)), b1 = Math.min(n, Math.round((o.son != null ? o.son : n / fs) * fs));
    var bolgeL = function () { return b1 - b0 > fs ? S.lufs(ses.subarray(b0, b1), fs) : S.lufs(ses, fs); }; // ölçü: dersin konuşma bölümü
    var ayarla = function () { // giriş ve kapanış sesleri konuşmadan yüksek olmasın
      var Lk = bolgeL(); if (Lk < -60) return;
      [[0, b0], [b1, n]].forEach(function (b) {
        if (b[1] - b[0] < fs * 0.5) return;
        var Lg = S.lufs(ses.subarray(b[0], b[1]), fs);
        if (Lg > Lk - 2) { var k = Math.pow(10, (Lk - 2 - Lg) / 20); for (var j = b[0]; j < b[1]; j++) ses[j] *= k; }
      });
    };
    ayarla();
    var m = b1 - b0;
    if (o.muzik && m > fs) {
      var mz;
      if (typeof o.muzik === 'string') mz = S.muzik(fs, m / fs, o.muzik);
      else { mz = new Float32Array(m); var L = o.muzik.length; if (L) for (i = 0; i < m; i++) mz[i] = o.muzik[i % L]; var tp = 0; for (i = 0; i < m; i++) tp = Math.max(tp, Math.abs(mz[i])); if (tp > 0) { var kk = 0.5 / tp; for (i = 0; i < m; i++) mz[i] *= kk; } }
      var gir = Math.round(1.5 * fs), cik = Math.round(2.2 * fs), at = Math.exp(-1 / (fs * 0.06)), rl = Math.exp(-1 / (fs * 1.1)), p = 0, g = 0.22, ps = Math.exp(-1 / (fs * 0.02));
      for (i = 0; i < m; i++) { // konuşma varken müzik kısılır, aralarda yavaşça açılır
        var x = ses[b0 + i]; p = ps * p + (1 - ps) * x * x;
        var hedef = p > 1e-4 ? 0.1 : 0.22;
        g = hedef < g ? at * g + (1 - at) * hedef : rl * g + (1 - rl) * hedef;
        mz[i] *= g * Math.min(1, i / gir) * Math.min(1, (m - i) / cik);
      }
      for (i = 0; i < m; i++) ses[b0 + i] += mz[i];
    }
    var hedefL = o.hedef == null ? -15 : o.hedef, L0 = bolgeL();
    if (L0 > -60) S.sikistir(ses, fs, { esik: L0 + 3, oran: 2.5, diz: 4, atak: 0.003, birak: 0.1 }); // tepeler yumuşakça bastırılır, sınırlayıcıya az iş kalır
    for (var tur = 0; tur < 6; tur++) { // sınırlayıcı tepeleri kısınca ses düzeyi biraz düşer: hedefe yaklaşana dek yinelenir
      var L2 = bolgeL(); if (L2 < -60 || (tur && Math.abs(hedefL - L2) < 0.4)) break;
      var k2 = Math.max(0.25, Math.min(10, Math.pow(10, (hedefL - L2) * (tur ? 1.4 : 1) / 20))); for (i = 0; i < n; i++) ses[i] *= k2;
      S.sinirla(ses, fs, -1.5); // kodlayıcı tepeyi biraz yükseltir: −1,5 dBFS payı
    }
    ayarla();
    return ses;
  };
  S.MUZIKLER = [['yok', 'Yok'], ['sakin', 'Sakin'], ['enerjik', 'Enerjik'], ['kendi', 'Kendi müziğim']];
})();
