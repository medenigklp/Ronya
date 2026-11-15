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
2. Cloudflare'de bir Worker oluştur, `ses-servisi.js`'in tamamını yapıştırıp yayımla.
3. Worker ayarlarına `GOOGLE_TTS_KEY` adında gizli bir değişken ekle, değeri API anahtarı olsun.
4. Worker adresini buraya yaz: `{"adres": "https://sesli-ders.<hesap>.workers.dev"}`. kimyamed için aynı adres `konu/sesli/bulut.json` dosyasına yazılır.

Ücret: Google her ay doğal seslerde 1 milyon, sade seslerde 4 milyon karakteri ücretsiz verir; sonrası milyon karakter başına 30 ve 4 dolardır. Google Cloud'da bütçe uyarısı kurmak iyi olur.
