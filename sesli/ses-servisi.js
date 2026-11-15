/* ============================================================
   SESLİ DERS — ses servisi (Cloudflare Worker)
   Google Cloud Text-to-Speech'in doğal Türkçe seslerini Ronya ve kimyamed'e verir.
   Google API anahtarı burada gizli kalır; sitelerin kodunda görünmez.

   Kurulum (bir kez):
   1) Cloudflare → Workers & Pages → Create → Worker → adı "sesli-ders" → Deploy
   2) Edit code → bu dosyanın tamamını yapıştır → Deploy
   3) Worker → Settings → Variables and Secrets → Add
        Type: Secret   Name: GOOGLE_TTS_KEY   Value: Google Cloud API anahtarı
   4) Worker adresini (https://sesli-ders.<hesap>.workers.dev) sitenin sesli/bulut.json dosyasına yaz.

   Koruma: yalnız aşağıdaki sitelerden gelen istekler, yalnız listedeki Türkçe sesler,
   istek başına en çok 1400 karakter. Aynı cümle aynı sesle bir kez üretilir, sonra önbellekten gelir.
   ============================================================ */

const IZINLI_SITELER = ['https://medenigklp.github.io'];
const AZAMI_KARAKTER = 1400;
const DAKIKADA_ISTEK = 120; // aynı adresten dakikada en çok istek (okul ağlarında birçok öğrenci tek adresten gelir)

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
      const hazir = env.GOOGLE_TTS_KEY ? 'hazır' : 'GOOGLE_TTS_KEY eksik';
      return yazi('Sesli ders ses servisi çalışıyor (' + hazir + ').', 200, cors);
    }
    if (url.pathname !== '/ses' || istek.method !== 'GET') return yazi('Bulunamadı', 404, cors);

    const gonderen = koken || istek.headers.get('Referer') || '';
    if (!IZINLI_SITELER.some((o) => gonderen.startsWith(o))) return yazi('Bu servis yalnızca izinli sitelerden kullanılabilir.', 403, cors);
    if (!env.GOOGLE_TTS_KEY) return yazi('Servis ayarı eksik: GOOGLE_TTS_KEY.', 500, cors);

    const metin = (url.searchParams.get('m') || '').replace(/\s+/g, ' ').trim();
    const ses = url.searchParams.get('ses') || '';
    if (!metin || metin.length > AZAMI_KARAKTER || !SESLER.has(ses)) return yazi('Geçersiz istek.', 400, cors);

    // Önce önbellek: aynı cümle aynı sesle bir kez üretilir
    const anahtar = new Request('https://onbellek.sesli-ders/' + ses + '/' + (await ozet(metin)));
    const onbellek = caches.default;
    let yanit = await onbellek.match(anahtar);
    if (!yanit && env.SESLER_KV) {
      const kv = await env.SESLER_KV.get(anahtar.url, 'arrayBuffer');
      if (kv) yanit = sesYaniti(kv);
    }

    if (!yanit) {
      const ip = istek.headers.get('CF-Connecting-IP') || 'bilinmiyor';
      if (asiriMi(ip)) return yazi('Çok fazla istek; biraz sonra yeniden dene.', 429, { ...cors, 'Retry-After': '30' });
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
      if (env.SESLER_KV) ctx.waitUntil(env.SESLER_KV.put(anahtar.url, bayt.buffer, { expirationTtl: 60 * 60 * 24 * 365 }));
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
function asiriMi(ip) {
  const simdi = Date.now(), k = sayac.get(ip);
  if (!k || simdi - k.t > 60000) { sayac.set(ip, { t: simdi, n: 1 }); if (sayac.size > 5000) sayac.clear(); return false; }
  k.n++;
  return k.n > DAKIKADA_ISTEK;
}
