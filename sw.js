/* ============================================================
   RONYA KİMYA — SERVICE WORKER v3 (AĞ ÖNCELİKLİ, ÖNBELLEKSİZ KONTROL)
   DEĞİŞİKLİK (v2 → v3): İnternetten alınan dosyalar artık tarayıcının
   kendi önbelleğinden değil, her seferinde sunucuya sorularak geliyor
   (cache: 'no-cache'). Dosya değişmediyse sunucu kısa bir "aynı" yanıtı
   verir, yani site yavaşlamaz; değiştiyse yeni hâli anında gelir.
   Çevrimdışı çalışma aynen korunuyor.
   ============================================================ */
var CACHE = 'ronya-v3';

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(
        ['./', 'index.html', 'ronya-eklenti.js', 'ronya-tema.js', 'manifest.json'].map(function (u) {
          return c.add(new Request(u, { cache: 'no-cache' })).catch(function () {});
        })
      );
    })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE; })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var sameOrigin = new URL(req.url).origin === self.location.origin;
  var net = sameOrigin
    ? fetch(req.mode === 'navigate' ? req.url : req, { cache: 'no-cache' })
    : fetch(req);

  e.respondWith(
    net.then(function (r) {
      if (r && r.ok) {
        var cp = r.clone();
        caches.open(CACHE).then(function (c) { c.put(req, cp); });
      }
      return r;
    }).catch(function () {
      return caches.match(req).then(function (m) {
        return m || (req.mode === 'navigate' ? caches.match('index.html') : undefined);
      });
    })
  );
});
