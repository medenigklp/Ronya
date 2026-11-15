/* ============================================================
   SESLİ DERS — ses servisi (Cloudflare Worker)
   Google Cloud Text-to-Speech'in doğal Türkçe seslerini Ronya ve kimyamed'e verir.
   Google API anahtarı burada gizli kalır; sitelerin kodunda görünmez.

   Kurulum (bir kez):
   1) Cloudflare → Workers & Pages → Create → Worker → adı "sesli-ders" → Deploy
   2) Edit code → bu dosyanın tamamını yapıştır → Deploy
   3) Storage & Databases → KV → Create → adı "sesler"
   4) Worker → Settings → Bindings → Add → KV namespace
        Variable name: SESLER_KV   KV namespace: sesler
   5) Worker → Settings → Variables and Secrets → Add
        Type: Secret   Name: GOOGLE_TTS_KEY   Value: Google Cloud API anahtarı
   6) Worker adresini (https://sesli-ders.<hesap>.workers.dev) sitenin sesli/bulut.json dosyasına yaz.

   Koruma: yalnız aşağıdaki sitelerden gelen istekler, yalnız listedeki Türkçe sesler,
   istek başına en çok 1400 karakter. Aynı cümle aynı sesle bir kez üretilir, sonra önbellekten gelir.
   Günlük sınır: Google'a gönderilen karakter günde GUNLUK_SINIR'ı geçmez. Varsayılan değerler
   Google'ın aylık ücretsiz kotası içinde kalır; sınır dolunca siteler o gün cihaz sesine döner.
   ============================================================ */

const IZINLI_SITELER = ['https://medenigklp.github.io'];
const AZAMI_KARAKTER = 1400;
const DAKIKADA_ISTEK = 120; // aynı adresten dakikada en çok istek (okul ağlarında birçok öğrenci tek adresten gelir)
// Günde Google'a gönderilecek en çok karakter. Ücretsiz kota: doğal seslerde ayda 1 milyon, sade seslerde 4 milyon.
const GUNLUK_SINIR = { dogal: 30000, sade: 120000 };

const KADIN = 'Achernar Aoede Autonoe Callirrhoe Despina Erinome Gacrux Kore Laomedeia Leda Pulcherrima Sulafat Vindemiatrix Zephyr';
const ERKEK = 'Achird Algenib Algieba Alnilam Charon Enceladus Fenrir Iapetus Orus Puck Rasalgethi Sadachbia Sadaltager Schedar Umbriel Zubenelgenubi';
const SESLER = new Set(
  (KADIN + ' ' + ERKEK).split(' ').map((a) => 'tr-TR-Chirp3-HD-' + a)
    .concat(['A', 'B', 'C', 'D', 'E'].map((h) => 'tr-TR-Wavenet-' + h))
);

const sayac = new Map();

export default {
  async fetch(istek, env, ctx) {
    const url = new URL(istek.url);
    const koken = istek.headers.get('Origin') || '';
    const izinliKoken = IZINLI_SITELER.includes(koken) ? koken : IZINLI_SITELER[0];
    const cors = { 'Access-Control-Allow-Origin': izinliKoken, 'Vary': 'Origin' };

    if (istek.method === 'OPTIONS') {
      return new Response(null, { headers: { ...cors, 'Access-Control-Allow-Methods': 'GET', 'Access-Control-Max-Age': '86400' } });
    }
    if (url.pathname === '/' || url.pathname === '') {
      const eksik = [!env.GOOGLE_TTS_KEY && 'GOOGLE_TTS_KEY', !env.SESLER_KV && 'SESLER_KV'].filter(Boolean);
      if (eksik.length) return yazi('Sesli ders ses servisi çalışıyor, ama ayar eksik: ' + eksik.join(', ') + '.', 200, cors);
      const gun = bugun(), d = await kullanim(env, gun, 'dogal'), sd = await kullanim(env, gun, 'sade');
      return yazi('Sesli ders ses servisi çalışıyor (hazır). Bugün doğal seslerde ' + d + '/' + GUNLUK_SINIR.dogal + ', sade seslerde ' + sd + '/' + GUNLUK_SINIR.sade + ' karakter kullanıldı.', 200, cors);
    }
    if (url.pathname !== '/ses' || istek.method !== 'GET') return yazi('Bulunamadı', 404, cors);

    const gonderen = koken || istek.headers.get('Referer') || '';
    if (!IZINLI_SITELER.some((o) => gonderen.startsWith(o))) return yazi('Bu servis yalnızca izinli sitelerden kullanılabilir.', 403, cors);
    if (!env.GOOGLE_TTS_KEY || !env.SESLER_KV) return yazi('Servis ayarı eksik: ' + (!env.GOOGLE_TTS_KEY ? 'GOOGLE_TTS_KEY' : 'SESLER_KV') + '.', 500, cors);

    const metin = (url.searchParams.get('m') || '').replace(/\s+/g, ' ').trim();
    const ses = url.searchParams.get('ses') || '';
    if (!metin || metin.length > AZAMI_KARAKTER || !SESLER.has(ses)) return yazi('Geçersiz istek.', 400, cors);

    // Önce önbellek: aynı cümle aynı sesle bir kez üretilir
    const anahtar = new Request('https://onbellek.sesli-ders/' + ses + '/' + (await ozet(metin)));
    const onbellek = caches.default;
    let yanit = await onbellek.match(anahtar);
    if (!yanit) {
      const kv = await env.SESLER_KV.get(anahtar.url, 'arrayBuffer');
      if (kv) yanit = sesYaniti(kv);
    }

    if (!yanit) {
      const ip = istek.headers.get('CF-Connecting-IP') || 'bilinmiyor';
      if (asiriMi(ip)) return yazi('Çok fazla istek; biraz sonra yeniden dene.', 429, { ...cors, 'Retry-After': '30' });
      const tur = ses.indexOf('Chirp3') >= 0 ? 'dogal' : 'sade', gun = bugun();
      if ((await kullanim(env, gun, tur)) + metin.length > GUNLUK_SINIR[tur]) return yazi('Bugünkü ses kotası doldu; yarın yeniden açılır.', 429, { ...cors, 'X-Kota': 'doldu' });
      const g = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize?key=' + encodeURIComponent(env.GOOGLE_TTS_KEY), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          input: { text: metin },
          voice: { languageCode: 'tr-TR', name: ses },
          audioConfig: { audioEncoding: 'MP3', speakingRate: 1.0 }
        })
      });
      if (!g.ok) {
        let neden = '';
        try { neden = (await g.json()).error.message; } catch (e) {}
        return yazi('Google ses servisi hata verdi (' + g.status + '). ' + neden, 502, cors);
      }
      const j = await g.json();
      const ikili = atob(j.audioContent || '');
      const bayt = new Uint8Array(ikili.length);
      for (let i = 0; i < ikili.length; i++) bayt[i] = ikili.charCodeAt(i);
      yanit = sesYaniti(bayt.buffer);
      ctx.waitUntil(onbellek.put(anahtar, yanit.clone()));
      ctx.waitUntil(env.SESLER_KV.put(anahtar.url, bayt.buffer, { expirationTtl: 60 * 60 * 24 * 365 }));
      ctx.waitUntil(kullanimEkle(env, gun, tur, metin.length));
    }

    const basliklar = new Headers(yanit.headers);
    Object.entries(cors).forEach(([k, v]) => basliklar.set(k, v));
    return new Response(yanit.body, { status: 200, headers: basliklar });
  }
};

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
// Günlük kullanım KV'de tutulur; yazma sayısını az tutmak için birkaç istek birikince yazılır
const bekleyen = new Map();
function bugun() { return new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10); } // Türkiye saati
async function kullanim(env, gun, tur) {
  const k = 'kullanim:' + gun + ':' + tur, b = bekleyen.get(k);
  const v = parseInt((await env.SESLER_KV.get(k)) || '0', 10) || 0;
  return v + (b ? b.n : 0);
}
async function kullanimEkle(env, gun, tur, n) {
  const k = 'kullanim:' + gun + ':' + tur, simdi = Date.now();
  const b = bekleyen.get(k) || { n: 0, t: simdi };
  b.n += n; bekleyen.set(k, b);
  if (b.n < 1500 && simdi - b.t < 20000) return;
  const eklenecek = b.n; bekleyen.delete(k);
  const v = parseInt((await env.SESLER_KV.get(k)) || '0', 10) || 0;
  await env.SESLER_KV.put(k, String(v + eklenecek), { expirationTtl: 60 * 60 * 24 * 3 });
}
function asiriMi(ip) {
  const simdi = Date.now(), k = sayac.get(ip);
  if (!k || simdi - k.t > 60000) { sayac.set(ip, { t: simdi, n: 1 }); if (sayac.size > 5000) sayac.clear(); return false; }
  k.n++;
  return k.n > DAKIKADA_ISTEK;
}
