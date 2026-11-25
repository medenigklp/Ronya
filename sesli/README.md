# Öğretmen ses kayıtları

Sesli Ders tahtası bir cümlenin kaydını burada bulursa cihaz sesi yerine o kaydı çalar.

Kayıt eklemek için:

1. Sesli Ders → Ayarlar → **Kendi sesinle kaydet** ile cümleleri kendi sesinle oku.
2. **Kayıtları indir** ile `sesli-….json` dosyasını al.
3. Dosyayı bu klasöre koy ve adını `liste.json` içindeki listeye yaz:

```json
{"paketler": ["sesli-konu.json"]}
```

Bu klasördeki kayıtlar herkese açıktır: siteyi açan herkes bu sesleri dinleyebilir ve indirebilir.

# Doğal sesler (Google)

`bulut.json` içindeki `adres` doluysa Sesli Ders, cihaz sesi yerine Google'ın doğal Türkçe seslerini kullanır (14 kadın, 16 erkek doğal ses ve 5 sade ses). Adres boşsa cihazın kendi sesleri kullanılır.

Sesler, Cloudflare'de çalışan küçük bir ses servisi üzerinden gelir (`ses-servisi.js`). Google API anahtarı yalnızca bu serviste gizli durur; sitelerin kodunda görünmez. Servis yalnız medenigklp.github.io'dan gelen istekleri kabul eder, aynı cümleyi aynı sesle bir kez üretip önbellekten verir.

Kurulum özeti:

1. Google Cloud'da bir proje aç, faturalandırmayı bağla, **Cloud Text-to-Speech API**'yi etkinleştir, yalnız bu API'ye kısıtlı bir API anahtarı oluştur.
2. Cloudflare'de "sesler" adında bir KV deposu aç.
3. Cloudflare'de bir Worker oluştur, `ses-servisi.js`'in tamamını yapıştırıp yayımla.
4. Worker ayarlarında KV deposunu `SESLER_KV` adıyla bağla; `GOOGLE_TTS_KEY` adında gizli bir değişken ekle, değeri API anahtarı olsun.
5. Worker adresini buraya yaz: `{"adres": "https://sesli-ders.<hesap>.workers.dev"}`. kimyamed için aynı adres `konu/sesli/bulut.json` dosyasına yazılır.

Ücret: Google her ay doğal seslerde 1 milyon, sade seslerde 4 milyon karakteri ücretsiz verir; sonrası milyon karakter başına 30 ve 4 dolardır. Servis Google'a günde en çok 30.000 (doğal) ve 120.000 (sade) karakter gönderir; bu sınırlar ücretsiz kotanın içinde kalır. Sınır dolunca siteler o gün cihaz sesine döner.

Ayarlar kodu değiştirmeden Worker'ın **Settings → Variables and Secrets** bölümünden yapılır (Type: Text): `GUNLUK_DOGAL` ve `GUNLUK_SADE` günlük karakter sınırlarını, `IZINLI_SITELER` servisi kullanabilecek siteleri (virgülle ayrılmış adresler) değiştirir. Worker adresi tarayıcıda açılınca servisin hazır olup olmadığı, sürümü ve o günkü kullanım görünür.

Karşılıklı anlatımda Elif Hoca bir kadın sesiyle, Kerem Hoca bir erkek sesiyle konuşur; iki ses de Ayarlar'dan seçilir.

# Öğretmen ve öğrenci sesleri

Öğrenciler Sesli Ders'te yalnızca iki doğal ses seçebilir: öğretmenin belirlediği bir kadın ve bir erkek sesi. Öteki sesler (bütün doğal sesler, cihaz sesleri), kayıt stüdyosu ve video araçları öğrencilere kapalıdır.

**Öğretmen modu:** öğretmen bağlantısı (`…#ogretmen=<anahtar>`) bir kez açılınca o tarayıcıda öğretmen modu açılır; Ronya ile kimyamed aynı adreste (medenigklp.github.io) olduğu için ikisinde birden geçerlidir. Bağlantı yerine Ayarlar'ın altındaki **Öğretmen girişi**'ne anahtar da yazılabilir. Kodda anahtarın kendisi yoktur, yalnızca SHA-256 özeti vardır. Anahtar kimseyle paylaşılmamalı.

**Öğrenci seslerini değiştirmek:** öğretmen modunda Ayarlar → **Öğrenci sesleri** → kadın ve erkek sesini seç → **Kaydet**. Seçim ses servisinde saklanır ve bütün öğrencilere hemen geçer. Bunun için ses servisinin 3. sürümü gerekir (`/ayar` adresi): Cloudflare → Workers & Pages → sesli-ders → Edit code → `ses-servisi.js`'in yeni hâlini yapıştır → Deploy. Yeni gizli değişken gerekmez. Servis güncellenmeden önce öğrenciler `bulut.json`'daki `ogrenci` seslerini duyar.

# Kendi sesin (öğretmenin kopya sesi)

Öğretmen kendi sesinin kopyasını oluşturabilir; sonra konu anlatımları ve soru çözümleri, metinleri tek tek okumadan onun sesiyle anlatılır. Kopya ses Google'ın Gemini TTS ses kopyalama özelliğiyle yapılır (`gemini-3.8-flash-tts`).

**Kurulum (bir kez):**

1. Ses servisini 4. sürüme güncelle: Cloudflare → Workers & Pages → sesli-ders → Edit code → `ses-servisi.js`'in yeni hâlini yapıştır → Deploy.
2. Google AI Studio'da (aistudio.google.com) ücretli seviyeyi aç ve bir API anahtarı oluştur. Ücret önce Google AI Pro/Ultra aboneliğinin aylık Google Cloud kredisinden düşer (developers.google.com/program/my-benefits → kredi → ödeme hesabı → Apply).
3. Worker → Settings → Variables and Secrets → Add → Type: **Secret**, Name: `GEMINI_KEY`, Value: AI Studio'daki API anahtarı → Deploy. Anahtar yalnız burada durur, sitelerin kodunda görünmez.
4. Worker adresini tarayıcıda aç: "sürüm 4" ve "Kendi ses: GEMINI_KEY var" yazmalı.

**Sesi kaydetmek:** öğretmen modunda Ayarlar → **Kendi sesin** → **Sesimi kaydet**. 10–30 saniyelik doğal bir konuşma ve Google'ın Türkçe onay cümlesi kaydedilir ("Bu sesin sahibi benim ve Google'ın bu sesi kullanarak sentetik bir ses modeli oluşturmasına izin veriyorum."). Kayıtlar 24 kHz, tek kanal WAV'a çevrilip ses servisi üzerinden Google'a gönderilir; Google onayı okuyanla konuşanın aynı kişi olduğunu doğrular. Kayıtlar sitede ya da serviste saklanmaz; Google sesi bir yıl saklar, sonra yeniden kaydetmek gerekir.

**Kullanmak:** ses listesinde **Benim sesim** çıkar; öğretmen bunu kendisi için seçebilir ya da Öğrenci sesleri kartında kadın ya da erkek sesi yerine öğrencilere verebilir.

**Güvenlik:** bir cümle kopya sesle yalnız öğretmen anahtarıyla üretilir (Ayarlar'daki **Bu dersi sesimle hazırla** düğmesi ya da öğretmenin dersi dinlemesi). Üretilen cümle serviste saklanır ve herkes dinler. Öğrenci hazırlanmamış bir cümleye gelirse o cümle öğrenci sesiyle (doğal ses) okunur. Böylece kimse öğretmenin sesine istediği bir cümleyi söyletemez.

**Ücret ve sınırlar:** üretilen ses süresine göre ödenir (2026 sonuna kadar dakikası yaklaşık 1,4 sent, 1 Ocak 2027'den sonra iki katı); aynı cümle bir kez üretilir. Servis kopya seste günde en çok 150.000 karakter üretir (`GUNLUK_BENIM` ile değiştirilir). Sesler 16 kHz, 8 bit μ-law olarak saklanır (dakikası yaklaşık 1 MB). Cloudflare'in ücretsiz planında KV deposuna günde 1000 yazma yapılabilir; sınır dolunca "Bu dersi sesimle hazırla" durur ve ertesi gün devam edilir. İsteğe bağlı ayarlar (Type: Text): `BENIM_MODEL`, `BENIM_STIL` (konuşma tarzı; varsayılan "sakin, net ve doğal bir öğretmen anlatımı").

# Cümle başlarının kesilmemesi

Telefon, Bluetooth hoparlör ya da akıllı tahta hoparlörü her cümleden sonra sesi kapatıp yeniden açtığı için cümlelerin ilk kelimeleri duyulmuyordu. Artık doğal sesin her cümlesinin başına 0,4 saniyelik sessizlik eklenir ve ders oynarken cümle aralarında duyulmayacak kadar kısık bir ses döngüsü çalar; ses yolu kapanmaz. Aradaki bekleme süresi bu sessizlik kadar kısaltılır, anlatımın hızı değişmez.

# Ders PDF'si

Sesli anlatımın tahtaya yazılanları (başlıklar, metin, formüller, not kutuları, tablolar, grafikler) PDF ders notu olarak iner: anlatım penceresinde **Ders PDF'si** düğmesi (bölümlü derste bütün ders ya da şu anki bölüm) ve konu sayfalarında sesli anlatım düğmesinin yanındaki **Ders PDF'si** düğmesi. PDF tarayıcıda hazırlanır; grafikler vektör olarak çizilir. Kullanılan dosyalar yalnızca PDF istenince yüklenir:

- `pdf-lib.min.js` — pdf-lib 1.17.1 (MIT lisansı)
- `pdf-yazi.js` — DejaVu Sans yazı karakterinin Türkçe, Yunan harfleri, oklar ve matematik işaretleriyle sınırlı alt kümesi (DejaVu lisansı)
- `sesli-pdf.js` — ders notunun sayfa düzeni

# Grafiklerin çizilerek anlatımı

Konu anlatımındaki ve sorulardaki eksenli grafikler tahtaya hazır gelmez: önce eksenler, sonra her eğri, en son kesikli çizgiler ve notlar çizilir; kalem çizginin ucunu izler ve her aşama anlatılır (eksen adları, eğrinin rengi ve adı, artıyor/azalıyor/sabit kalıyor, t₁ anında aniden değişiyor, eksendeki değerler). Sonraki cümlelerde bir eğrinin adı, formülü ya da rengi geçerse kalem o eğrinin üzerinden geçer, eğri parlar; t₁ gibi bir an geçerse o yer işaretlenir.

# Akıllı tahta görünümü

Anlatım penceresinin üstündeki **Akıllı tahta** düğmesi (ya da Ayarlar → Görünüm) tahtayı ekranı kaplayacak biçimde 16:9 açar; yazı, altyazı ve düğmeler sınıfın arkasından da görülecek kadar büyür, ayarlar sağdan açılır. Seçim o cihazda saklanır. Ayarlar → **Yazı büyüklüğü** ile tahtadaki yazı küçültülüp büyütülebilir.

