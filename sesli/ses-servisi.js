/* ============================================================
   SESLİ DERS — ses servisi (Cloudflare Worker)
   Google Cloud Text-to-Speech'in doğal Türkçe seslerini Ronya ve kimyamed'e verir.
   Google API anahtarı burada gizli kalır; sitelerin kodunda görünmez.

   Kurulum (bir kez):
   1) Cloudflare → Storage & databases → Workers KV → Create → adı "sesler"
   2) Workers & Pages → Create → Start with Hello World → adı "sesli-ders" → Deploy
   3) Edit code → bu dosyanın tamamını yapıştır → Deploy
   4) Worker → Settings → Bindings → Add → KV namespace
        Variable name: SESLER_KV   KV namespace: sesler
   5) Worker → Settings → Variables and Secrets → Add
        Type: Secret   Name: GOOGLE_TTS_KEY   Value: Google Cloud API anahtarı
   6) Worker adresini (https://sesli-ders.<hesap>.workers.dev) tarayıcıda aç: "hazır" yazmalı.
      Sonra bu adresi sitenin sesli/bulut.json dosyasına yaz.

   İsteğe bağlı ayarlar (Variables and Secrets → Type: Text); kodu değiştirmeden ayarlanır:
     GUNLUK_DOGAL    doğal seslerde günlük karakter sınırı (varsayılan 30000)
     GUNLUK_SADE     sade seslerde günlük karakter sınırı (varsayılan 120000)
     IZINLI_SITELER  virgülle ayrılmış site adresleri (varsayılan https://medenigklp.github.io)

   Öğrenci sesleri (sürüm 3): öğrenciler yalnız öğretmenin seçtiği iki doğal sesi (bir kadın, bir erkek) kullanır.
     GET  /ayar  → {"ogrenci": {"k": "...", "e": "..."}}  (herkese açık)
     POST /ayar  → {"anahtar": "...", "ogrenci": {...}}  yalnız öğretmen anahtarıyla; seçim depoya (KV) yazılır.
   Anahtarın kendisi burada yok, yalnız SHA-256 özeti var (OGRETMEN_OZET). Anahtarı değiştirmek için
   Variables and Secrets'e OGRETMEN_OZET adında yeni özet yazılabilir (Type: Text).

   Kendi sesin (sürüm 4): öğretmenin sesinin kopyası (Google Gemini TTS, ses kopyalama).
     Kurulum: Variables and Secrets → Add → Type: Secret, Name: GEMINI_KEY, Value: Google AI Studio'daki API anahtarı.
     GET  /benim            → {"var": true/false, "cins": "e"/"k"}  kopya ses hazır mı (herkese açık)
     POST /benim/olustur    → öğretmen anahtarıyla (X-Ogretmen başlığı); gövde Google'ın ses oluşturma isteğidir
                              (30 sn konuşma + onay cümlesi kaydı). Google sesi doğrular, ses kimliği depoya yazılır.
     POST /benim/sil        → öğretmen anahtarıyla; kopya ses kimliği silinir (yeniden kayıt için).
     GET  /benim/ses?m=...  → cümle bu sesle daha önce üretildiyse depodan gelir (herkes). Üretilmediyse yalnız öğretmen
                              anahtarıyla üretilir; öğrenciye 404 döner, site o cümlede öğrenci sesine geçer.
                              Böylece kimse öğretmenin sesine istediği bir cümleyi söyletemez.
     Ses biçimi: 16 kHz, 8 bit μ-law (dakikası yaklaşık 1 MB). Site çalmadan önce açar.
     İsteğe bağlı: GUNLUK_BENIM (günlük karakter sınırı, varsayılan 150000), BENIM_MODEL, BENIM_STIL.

   Koruma: yalnız izinli sitelerden gelen istekler, yalnız listedeki Türkçe sesler,
   istek başına en çok 1400 karakter. Aynı cümle aynı sesle bir kez üretilir, sonra depodan gelir.
   Günlük sınır: Google'a gönderilen karakter günde sınırı geçmez. Varsayılan değerler Google'ın
   aylık ücretsiz kotası içinde kalır (doğal seslerde ayda 1 milyon, sade seslerde 4 milyon karakter);
   sınır dolunca siteler o gün cihaz sesine döner.
   ============================================================ */

const SURUM = '4';
const VARSAYILAN_SITELER = ['https://medenigklp.github.io'];
const VARSAYILAN_SINIR = { dogal: 30000, sade: 120000 };
const AZAMI_KARAKTER = 1400;
const DAKIKADA_ISTEK = 120; // aynı adresten dakikada en çok yeni ses (okul ağlarında birçok öğrenci tek adresten gelir)
const OGRETMEN_OZET = 'eeb6c158a4aba2056a2d4768c8d5e11a326cd6cc2631b0a14d5d90d08eb1435c';
const VARSAYILAN_OGRENCI = { k: 'tr-TR-Chirp3-HD-Kore', e: 'tr-TR-Chirp3-HD-Charon' };
const GEMINI = 'https://generativelanguage.googleapis.com/v1beta';
const BENIM = { model: 'gemini-3.8-flash-tts', sinir: 150000, oran: 16000, stil: 'sakin, net ve doğal bir öğretmen anlatımı', bicim: 'mulaw;rate=16000' };

const KADIN = 'Achernar Aoede Autonoe Callirrhoe Despina Erinome Gacrux Kore Laomedeia Leda Pulcherrima Sulafat Vindemiatrix Zephyr';
const ERKEK = 'Achird Algenib Algieba Alnilam Charon Enceladus Fenrir Iapetus Orus Puck Rasalgethi Sadachbia Sadaltager Schedar Umbriel Zubenelgenubi';
const SESLER = new Set(
  (KADIN + ' ' + ERKEK).split(' ').map((a) => 'tr-TR-Chirp3-HD-' + a)
    .concat(['A', 'B', 'C', 'D', 'E'].map((h) => 'tr-TR-Wavenet-' + h))
);

export default {
  async fetch(istek, env, ctx) {
    const A = ayarlar(env);
    const koken = istek.headers.get('Origin') || '';
    const cors = { 'Access-Control-Allow-Origin': A.siteler.includes(koken) ? koken : A.siteler[0], 'Vary': 'Origin' };
    try {
      return await isle(istek, env, ctx, A, koken, cors);
    } catch (e) {
      // KV ya da Google'a ulaşılamazsa siteler cihaz sesine döner
      return yazi('Ses servisi şu an yanıt veremiyor; biraz sonra yeniden dene.', 503, cors);
    }
  }
};

async function isle(istek, env, ctx, A, koken, cors) {
  const url = new URL(istek.url);
  if (istek.method === 'OPTIONS') {
    return new Response(null, { headers: { ...cors, 'Access-Control-Allow-Methods': 'GET, POST', 'Access-Control-Allow-Headers': 'Content-Type, X-Ogretmen, X-Cins', 'Access-Control-Max-Age': '86400' } });
  }
  if (url.pathname === '/ayar') return ayarIsle(istek, env, A, koken, cors);
  if (url.pathname === '/benim' || url.pathname.indexOf('/benim/') === 0) return benimIsle(istek, env, ctx, A, koken, cors, url);
  if (url.pathname === '/' || url.pathname === '') {
    const eksik = [!env.GOOGLE_TTS_KEY && 'GOOGLE_TTS_KEY', !env.SESLER_KV && 'SESLER_KV'].filter(Boolean);
    if (eksik.length) return yazi('Sesli ders ses servisi çalışıyor (sürüm ' + SURUM + '), ama ayar eksik: ' + eksik.join(', ') + '.', 200, cors);
    const gun = bugun(), d = await kullanim(env, gun, 'dogal'), s = await kullanim(env, gun, 'sade'), b = await kullanim(env, gun, 'benim');
    let kendi = ' Kendi ses: ' + (env.GEMINI_KEY ? 'GEMINI_KEY var' : 'GEMINI_KEY yok');
    try { const bs = JSON.parse((await env.SESLER_KV.get('benim:ses')) || 'null'); kendi += bs && bs.id ? ', kopya ses hazır, bugün ' + b + '/' + A.sinir.benim + ' karakter.' : ', kopya ses henüz kaydedilmedi.'; } catch (e) { kendi += '.'; }
    return yazi('Sesli ders ses servisi çalışıyor (hazır, sürüm ' + SURUM + '). Bugün doğal seslerde ' + d + '/' + A.sinir.dogal +
      ', sade seslerde ' + s + '/' + A.sinir.sade + ' karakter kullanıldı.' + kendi, 200, cors);
  }
  if (url.pathname !== '/ses' || istek.method !== 'GET') return yazi('Bulunamadı', 404, cors);

  // Origin tam eşleşmeli; Referer'da site adresinden hemen sonra "/" gelmeli (benzer adlı alan adları geçemez)
  const gonderen = istek.headers.get('Referer') || '';
  const izinli = koken ? A.siteler.includes(koken) : A.siteler.some((o) => gonderen.startsWith(o + '/'));
  if (!izinli) return yazi('Bu servis yalnızca izinli sitelerden kullanılabilir.', 403, cors);
  if (!env.GOOGLE_TTS_KEY || !env.SESLER_KV) return yazi('Servis ayarı eksik: ' + (!env.GOOGLE_TTS_KEY ? 'GOOGLE_TTS_KEY' : 'SESLER_KV') + '.', 500, cors);

  const metin = (url.searchParams.get('m') || '').replace(/\s+/g, ' ').trim();
  const ses = url.searchParams.get('ses') || '';
  if (!metin || metin.length > AZAMI_KARAKTER || !SESLER.has(ses)) return yazi('Geçersiz istek.', 400, cors);

  // Önce önbellek ve depo: aynı cümle aynı sesle bir kez üretilir
  const anahtar = new Request('https://onbellek.sesli-ders/' + ses + '/' + (await ozet(metin)));
  let yanit = null;
  try { yanit = await caches.default.match(anahtar); } catch (e) { /* workers.dev adresinde önbellek olmayabilir; depo yeter */ }
  if (!yanit) {
    const kayit = await env.SESLER_KV.get(anahtar.url, 'arrayBuffer');
    if (kayit) yanit = sesYaniti(kayit);
  }

  if (!yanit) {
    if (asiriMi(istek.headers.get('CF-Connecting-IP') || 'bilinmiyor')) return yazi('Çok fazla istek; biraz sonra yeniden dene.', 429, { ...cors, 'Retry-After': '30' });
    const tur = ses.indexOf('Chirp3') >= 0 ? 'dogal' : 'sade', gun = bugun();
    if ((await kullanim(env, gun, tur)) + metin.length > A.sinir[tur]) return yazi('Bugünkü ses kotası doldu; yarın yeniden açılır.', 429, { ...cors, 'X-Kota': 'doldu' });
    bekleyenEkle(gun, tur, metin.length); // Google'a gitmeden say: aynı anda gelen istekler de sınırı görsün
    const g = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize?key=' + encodeURIComponent(env.GOOGLE_TTS_KEY), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        input: { text: metin },
        voice: { languageCode: 'tr-TR', name: ses },
        audioConfig: { audioEncoding: 'MP3', speakingRate: 1.0 }
      })
    });
    let j = null;
    if (g.ok) { try { j = await g.json(); } catch (e) {} }
    if (!j || !j.audioContent) {
      bekleyenEkle(gun, tur, -metin.length); // ses üretilmediyse sayılmaz
      let neden = '';
      if (!g.ok) { try { neden = (await g.json()).error.message; } catch (e) {} } else neden = 'Boş yanıt.';
      return yazi('Google ses servisi hata verdi (' + g.status + '). ' + neden, 502, cors);
    }
    const ikili = atob(j.audioContent);
    const bayt = new Uint8Array(ikili.length);
    for (let i = 0; i < ikili.length; i++) bayt[i] = ikili.charCodeAt(i);
    yanit = sesYaniti(bayt.buffer);
    const kopya = yanit.clone();
    arkada(ctx, () => caches.default.put(anahtar, kopya));
    arkada(ctx, () => env.SESLER_KV.put(anahtar.url, bayt.buffer, { expirationTtl: 60 * 60 * 24 * 365 }));
    arkada(ctx, () => kullanimYaz(env, gun, tur));
  }

  const basliklar = new Headers(yanit.headers);
  Object.entries(cors).forEach(([k, v]) => basliklar.set(k, v));
  return new Response(yanit.body, { status: 200, headers: basliklar });
}

// Öğrenci sesleri: herkes okur, yalnız öğretmen anahtarıyla değişir
async function ayarIsle(istek, env, A, koken, cors) {
  const json = (veri, durum) => new Response(JSON.stringify(veri), { status: durum || 200, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' } });
  const oku = async () => {
    let o = null;
    try { o = env.SESLER_KV ? JSON.parse((await env.SESLER_KV.get('ayar:ogrenci')) || 'null') : null; } catch (e) { o = null; }
    const gecer = (id) => SESLER.has(id) || id === 'benim'; // "benim": öğretmenin kopya sesi
    return o && gecer(o.k) && gecer(o.e) ? o : VARSAYILAN_OGRENCI;
  };
  if (istek.method === 'GET') return json({ ogrenci: await oku(), surum: SURUM });
  if (istek.method !== 'POST') return yazi('Bulunamadı', 404, cors);
  if (!A.siteler.includes(koken)) return json({ tamam: false, hata: 'Bu servis yalnızca izinli sitelerden kullanılabilir.' }, 403);
  const ip = istek.headers.get('CF-Connecting-IP') || 'bilinmiyor';
  if (yanlisCok(ip)) return json({ tamam: false, hata: 'Çok fazla deneme; biraz sonra yeniden dene.' }, 429);
  let g = null;
  try { g = JSON.parse(await istek.text()); } catch (e) { g = null; }
  const beklenen = String(env.OGRETMEN_OZET || OGRETMEN_OZET).trim().toLowerCase();
  if (!g || typeof g.anahtar !== 'string' || (await ozet(g.anahtar.trim())) !== beklenen) { yanlisSay(ip); return json({ tamam: false, hata: 'Öğretmen anahtarı geçersiz.' }, 403); }
  const o = g.ogrenci || {};
  const kadin = KADIN.split(' ').map((a) => 'tr-TR-Chirp3-HD-' + a).concat(['A', 'C', 'D'].map((h) => 'tr-TR-Wavenet-' + h));
  const erkek = ERKEK.split(' ').map((a) => 'tr-TR-Chirp3-HD-' + a).concat(['B', 'E'].map((h) => 'tr-TR-Wavenet-' + h));
  if (!(kadin.includes(o.k) || o.k === 'benim') || !(erkek.includes(o.e) || o.e === 'benim')) return json({ tamam: false, hata: 'Geçersiz ses.' }, 400);
  if (!env.SESLER_KV) return json({ tamam: false, hata: 'Servis ayarı eksik: SESLER_KV.' }, 500);
  await env.SESLER_KV.put('ayar:ogrenci', JSON.stringify({ k: o.k, e: o.e }));
  return json({ tamam: true, ogrenci: { k: o.k, e: o.e } });
}
// Kendi sesin: öğretmenin sesinin kopyası (Google Gemini TTS). Yeni cümleyi yalnız öğretmen üretir; herkes hazırı dinler.
async function benimIsle(istek, env, ctx, A, koken, cors, url) {
  const json = (veri, durum) => new Response(JSON.stringify(veri), { status: durum || 200, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' } });
  const kv = env.SESLER_KV, yol = url.pathname.replace(/\/+$/, '');
  const bilgi = async () => { try { return kv ? JSON.parse((await kv.get('benim:ses')) || 'null') : null; } catch (e) { return null; } };
  if (yol === '/benim' && istek.method === 'GET') {
    const b = await bilgi();
    return json({ var: !!(b && b.id), cins: b && b.cins === 'k' ? 'k' : 'e', hazir: !!env.GEMINI_KEY, surum: SURUM });
  }
  const gonderen = istek.headers.get('Referer') || '';
  const izinli = koken ? A.siteler.includes(koken) : A.siteler.some((o) => gonderen.startsWith(o + '/'));
  if (!izinli) return yazi('Bu servis yalnızca izinli sitelerden kullanılabilir.', 403, cors);
  if (!kv) return yazi('Servis ayarı eksik: SESLER_KV.', 500, cors);
  const ip = istek.headers.get('CF-Connecting-IP') || 'bilinmiyor';
  const ogretmen = async () => { // X-Ogretmen başlığındaki anahtar; yanlış denemeler sınırlıdır
    const a = (istek.headers.get('X-Ogretmen') || '').trim();
    if (!a || yanlisCok(ip)) return false;
    const ok = (await ozet(a)) === String(env.OGRETMEN_OZET || OGRETMEN_OZET).trim().toLowerCase();
    if (!ok) yanlisSay(ip);
    return ok;
  };

  if (yol === '/benim/olustur' && istek.method === 'POST') {
    if (!(await ogretmen())) return json({ tamam: false, hata: 'Öğretmen anahtarı geçersiz.' }, 403);
    if (!env.GEMINI_KEY) return json({ tamam: false, hata: 'Ses servisinde GEMINI_KEY ayarı yok.' }, 500);
    if (parseInt(istek.headers.get('Content-Length') || '0', 10) > 12 * 1024 * 1024) return json({ tamam: false, hata: 'Kayıtlar çok büyük.' }, 413);
    // Gövde Google'ın ses oluşturma isteğidir (sitede hazırlanır); burada açılmadan iletilir, işlemci süresi harcanmaz.
    const g = await fetch(GEMINI + '/voices', { method: 'POST', headers: { 'x-goog-api-key': env.GEMINI_KEY, 'Content-Type': 'application/json' }, body: istek.body });
    let j = null;
    try { j = await g.json(); } catch (e) { j = null; }
    if (!g.ok) return json({ tamam: false, hata: googleHatasi(j, g.status) }, 502);
    const id = sesKimligi(j);
    if (!id) return json({ tamam: false, hata: 'Google ses kimliği döndürmedi.' }, 502);
    const cins = istek.headers.get('X-Cins') === 'k' ? 'k' : 'e';
    await kv.put('benim:ses', JSON.stringify({ id, cins, tarih: Date.now() }));
    return json({ tamam: true, cins });
  }
  if (yol === '/benim/sil' && istek.method === 'POST') {
    if (!(await ogretmen())) return json({ tamam: false, hata: 'Öğretmen anahtarı geçersiz.' }, 403);
    await kv.delete('benim:ses');
    return json({ tamam: true });
  }
  if (yol !== '/benim/ses' || istek.method !== 'GET') return yazi('Bulunamadı', 404, cors);

  const metin = (url.searchParams.get('m') || '').replace(/\s+/g, ' ').trim();
  if (!metin || metin.length > AZAMI_KARAKTER) return yazi('Geçersiz istek.', 400, cors);
  const b = await bilgi();
  if (!b || !b.id) return yazi('Kopya ses henüz kaydedilmedi.', 404, cors);
  // Anahtar ses kimliğini de içerir: ses yeniden kaydedilirse eski cümleler kullanılmaz
  const anahtar = new Request('https://onbellek.sesli-ders/benim/' + (await ozet(b.id + '|' + metin)));
  let veri = null, saklandi = '1', bicim = null;
  try { const y = await caches.default.match(anahtar); if (y) { veri = await y.arrayBuffer(); bicim = y.headers.get('X-Bicim'); } } catch (e) { /* workers.dev'de önbellek olmayabilir */ }
  if (!veri) { const d = await kv.getWithMetadata(anahtar.url, 'arrayBuffer'); if (d && d.value) { veri = d.value; bicim = d.metadata && d.metadata.bicim; } }
  if (!veri) {
    if (!(await ogretmen())) return yazi('Bu cümle henüz öğretmenin sesiyle hazırlanmadı.', 404, cors);
    if (!env.GEMINI_KEY) return yazi('Ses servisinde GEMINI_KEY ayarı yok.', 500, cors);
    if (asiriMi(ip)) return yazi('Çok fazla istek; biraz sonra yeniden dene.', 429, { ...cors, 'Retry-After': '30' });
    const gun = bugun();
    if ((await kullanim(env, gun, 'benim')) + metin.length > A.sinir.benim) return yazi('Kendi sesinde bugünkü sınır doldu; yarın yeniden açılır.', 429, { ...cors, 'X-Kota': 'doldu' });
    bekleyenEkle(gun, 'benim', metin.length);
    const stil = env.BENIM_STIL != null ? String(env.BENIM_STIL) : BENIM.stil;
    const parca = { type: 'text', text: metin };
    if (stil) parca.annotations = [{ type: 'speech_metadata', style: stil }];
    // Önce küçük biçim (μ-law); Google kabul etmezse (400) 16 bit PCM, o da olmazsa varsayılan WAV denenir
    const BICIMLER = [{ mime: 'audio/mulaw', ad: BENIM.bicim }, { mime: 'audio/l16', ad: 'l16;rate=' + BENIM.oran }, { mime: null, ad: 'wav' }];
    let g = null, j = null, b64 = null;
    for (const bc of BICIMLER) {
      const rf = bc.mime ? { type: 'audio', mime_type: bc.mime, sample_rate: BENIM.oran } : { type: 'audio' };
      g = await fetch(GEMINI + '/interactions', {
        method: 'POST',
        headers: { 'x-goog-api-key': env.GEMINI_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: env.BENIM_MODEL || BENIM.model,
          input: [{ type: 'user_input', content: [parca] }],
          response_format: rf,
          generation_config: { speech_config: [{ voice: b.id }] }
        })
      });
      j = null;
      try { j = await g.json(); } catch (e) { j = null; }
      b64 = g.ok ? sesVerisi(j) : null;
      if (b64) { bicim = bc.ad; break; }
      if (g.status !== 400) break;
    }
    if (!b64) {
      bekleyenEkle(gun, 'benim', -metin.length);
      return yazi('Google ses üretmedi (' + g.status + '). ' + googleHatasi(j, g.status), 502, cors);
    }
    const ikili = atob(b64), bayt = new Uint8Array(ikili.length);
    for (let i = 0; i < ikili.length; i++) bayt[i] = ikili.charCodeAt(i);
    veri = bayt.buffer;
    // Depoya yazılamazsa (ör. ücretsiz planda günlük 1000 yazma hakkı biterse) site bunu bilsin: X-Saklandi: 0
    try { await kv.put(anahtar.url, veri.slice(0), { metadata: { bicim } }); saklandi = '1'; } catch (e) { saklandi = '0'; }
    const kopya = benimYaniti(veri.slice(0), bicim);
    arkada(ctx, () => caches.default.put(anahtar, kopya));
    arkada(ctx, () => kullanimYaz(env, gun, 'benim'));
  }
  const y = benimYaniti(veri, bicim), h = new Headers(y.headers);
  Object.entries(cors).forEach(([k, v]) => h.set(k, v));
  h.set('X-Saklandi', saklandi);
  h.set('Access-Control-Expose-Headers', 'X-Bicim, X-Saklandi');
  return new Response(y.body, { status: 200, headers: h });
}
function benimYaniti(veri, bicim) {
  // RIFF ile başlıyorsa WAV'dır; değilse saklanan biçim (varsayılan μ-law)
  const u = new Uint8Array(veri, 0, Math.min(4, veri.byteLength));
  const wav = u.length === 4 && u[0] === 82 && u[1] === 73 && u[2] === 70 && u[3] === 70;
  const ad = wav ? 'wav' : (bicim && bicim !== 'wav' ? bicim : BENIM.bicim);
  return new Response(veri, { headers: { 'Content-Type': wav ? 'audio/wav' : (/^l16/.test(ad) ? 'audio/l16' : 'audio/basic'), 'X-Bicim': ad, 'Cache-Control': 'public, max-age=31536000, immutable' } });
}
// Google yanıtında ses kimliği (voice_…) ya da anahtarı (voicekey_…) nerede olursa olsun bulunur
function sesKimligi(j) {
  let bulunan = null;
  const gez = (o) => {
    if (bulunan || o == null) return;
    if (typeof o === 'string') { if (/^voice(key)?_[A-Za-z0-9_-]+$/.test(o)) bulunan = o; return; }
    if (typeof o === 'object') for (const k of Object.keys(o)) gez(o[k]);
  };
  gez(j && (j.replicated_voice || j.replicatedVoice || j));
  return bulunan;
}
// steps[] → model_output → content[] → {type: "audio", data}: son ses parçası
function sesVerisi(j) {
  let son = null;
  const gez = (o) => {
    if (o == null || typeof o !== 'object') return;
    if (Array.isArray(o)) { o.forEach(gez); return; }
    if (o.type === 'audio' && typeof o.data === 'string' && o.data.length) son = o.data;
    for (const k of Object.keys(o)) if (k !== 'data') gez(o[k]);
  };
  gez(j);
  return son;
}
function googleHatasi(j, durum) {
  const m = j && j.error && j.error.message;
  return m ? String(m).slice(0, 300) : 'Google hata verdi (' + durum + ').';
}
const yanlislar = new Map();
function yanlisCok(ip) { const k = yanlislar.get(ip); return !!k && Date.now() - k.t < 15 * 60000 && k.n >= 10; }
function yanlisSay(ip) {
  const simdi = Date.now(), k = yanlislar.get(ip);
  if (!k || simdi - k.t > 15 * 60000) yanlislar.set(ip, { t: simdi, n: 1 }); else k.n++;
  if (yanlislar.size > 5000) yanlislar.clear();
}

function ayarlar(env) {
  const sayi = (v, y) => { const n = parseInt(v, 10); return n >= 0 ? n : y; };
  const siteler = String(env.IZINLI_SITELER || '').split(',').map((s) => s.trim().replace(/\/+$/, '')).filter(Boolean);
  return {
    siteler: siteler.length ? siteler : VARSAYILAN_SITELER,
    sinir: { dogal: sayi(env.GUNLUK_DOGAL, VARSAYILAN_SINIR.dogal), sade: sayi(env.GUNLUK_SADE, VARSAYILAN_SINIR.sade), benim: sayi(env.GUNLUK_BENIM, BENIM.sinir) }
  };
}
// Yanıttan sonra yapılacak iş; hata verirse yanıt bozulmaz
function arkada(ctx, is) {
  try { ctx.waitUntil(Promise.resolve().then(is).catch(() => {})); } catch (e) {}
}
function sesYaniti(veri) {
  return new Response(veri, { headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=31536000, immutable' } });
}
function yazi(metin, durum, basliklar) {
  return new Response(metin, { status: durum, headers: { ...basliklar, 'Content-Type': 'text/plain; charset=utf-8' } });
}
async function ozet(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Günlük kullanım KV'de tutulur; yazma sayısını az tutmak için biriktirip yazılır.
// KV'ye yazılamazsa (ör. günlük yazma hakkı biterse) sayım bellekte sürer, sınır yine uygulanır.
const bekleyen = new Map();
function bugun() { return new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10); } // Türkiye saati
function bekleyenEkle(gun, tur, n) {
  const k = 'kullanim:' + gun + ':' + tur, b = bekleyen.get(k) || { n: 0, t: Date.now() };
  b.n += n; bekleyen.set(k, b);
}
async function kullanim(env, gun, tur) {
  const k = 'kullanim:' + gun + ':' + tur, b = bekleyen.get(k);
  const v = parseInt((await env.SESLER_KV.get(k)) || '0', 10) || 0;
  return v + (b ? b.n : 0);
}
async function kullanimYaz(env, gun, tur) {
  const k = 'kullanim:' + gun + ':' + tur, b = bekleyen.get(k);
  if (!b || b.n <= 0 || (b.n < 3000 && Date.now() - b.t < 60000)) return;
  const n = b.n; bekleyen.delete(k);
  try {
    const v = parseInt((await env.SESLER_KV.get(k)) || '0', 10) || 0;
    await env.SESLER_KV.put(k, String(v + n), { expirationTtl: 60 * 60 * 24 * 3 });
  } catch (e) {
    bekleyenEkle(gun, tur, n);
  }
}

const sayac = new Map();
function asiriMi(ip) {
  const simdi = Date.now(), k = sayac.get(ip);
  if (!k || simdi - k.t > 60000) { sayac.set(ip, { t: simdi, n: 1 }); if (sayac.size > 5000) sayac.clear(); return false; }
  k.n++;
  return k.n > DAKIKADA_ISTEK;
}
