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

   Koruma: yalnız izinli sitelerden gelen istekler, yalnız listedeki Türkçe sesler,
   istek başına en çok 1400 karakter. Aynı cümle aynı sesle bir kez üretilir, sonra depodan gelir.
   Günlük sınır: Google'a gönderilen karakter günde sınırı geçmez. Varsayılan değerler Google'ın
   aylık ücretsiz kotası içinde kalır (doğal seslerde ayda 1 milyon, sade seslerde 4 milyon karakter);
   sınır dolunca siteler o gün cihaz sesine döner.
   ============================================================ */

const SURUM = '2';
const VARSAYILAN_SITELER = ['https://medenigklp.github.io'];
const VARSAYILAN_SINIR = { dogal: 30000, sade: 120000 };
const AZAMI_KARAKTER = 1400;
const DAKIKADA_ISTEK = 120; // aynı adresten dakikada en çok yeni ses (okul ağlarında birçok öğrenci tek adresten gelir)

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
    return new Response(null, { headers: { ...cors, 'Access-Control-Allow-Methods': 'GET', 'Access-Control-Max-Age': '86400' } });
  }
  if (url.pathname === '/' || url.pathname === '') {
    const eksik = [!env.GOOGLE_TTS_KEY && 'GOOGLE_TTS_KEY', !env.SESLER_KV && 'SESLER_KV'].filter(Boolean);
    if (eksik.length) return yazi('Sesli ders ses servisi çalışıyor (sürüm ' + SURUM + '), ama ayar eksik: ' + eksik.join(', ') + '.', 200, cors);
    const gun = bugun(), d = await kullanim(env, gun, 'dogal'), s = await kullanim(env, gun, 'sade');
    return yazi('Sesli ders ses servisi çalışıyor (hazır, sürüm ' + SURUM + '). Bugün doğal seslerde ' + d + '/' + A.sinir.dogal +
      ', sade seslerde ' + s + '/' + A.sinir.sade + ' karakter kullanıldı.', 200, cors);
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

function ayarlar(env) {
  const sayi = (v, y) => { const n = parseInt(v, 10); return n >= 0 ? n : y; };
  const siteler = String(env.IZINLI_SITELER || '').split(',').map((s) => s.trim().replace(/\/+$/, '')).filter(Boolean);
  return {
    siteler: siteler.length ? siteler : VARSAYILAN_SITELER,
    sinir: { dogal: sayi(env.GUNLUK_DOGAL, VARSAYILAN_SINIR.dogal), sade: sayi(env.GUNLUK_SADE, VARSAYILAN_SINIR.sade) }
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
