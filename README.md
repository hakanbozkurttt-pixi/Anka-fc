# Anka-fc: Mama Takip Uygulaması

Bu depo, veteriner hastanesinin mama takip sistemini içerir. Sistem üç parçadan oluşur:

1. **Müşteri telefon uygulaması.** iPhone ve Android için tek ortak kodla yazılır (React Native + Expo).
2. **Hastane yönetim paneli.** Bilgisayarda tarayıcıdan açılan web sayfasıdır (React + Vite).
3. **Arka plan.** Veritabanı, giriş sistemi ve zamanlanmış görevler burada çalışır (Supabase).

Teknik kararlar onaylanan **"Mama Takip Uygulaması: Teknik Plan"** belgesine dayanır.

> **Şu anki durum:** İlk özellik tamamlandı: **müşteri hesabı ve hayvan profili.**
> - Telefon uygulaması: kayıt (ad, soyad, telefon, adres, e-posta, şifre ve KVKK aydınlatma metni onayı),
>   e-posta doğrulama (6 haneli kod), giriş, şifre yenileme (6 haneli kod), çıkış,
>   kedi/köpek profili ekleme, kayıtlı profilleri listeleme ve görüntüleme.
> - Aydınlatma metninin güncel sürümünü onaylamamış müşteri, girişten sonra onay ekranını geçmeden devam edemez.
> - Yönetim paneli: yönetici girişi ve müşteri/hayvan kayıtlarının salt okunur listesi (arama ve KVKK onay bilgisiyle).
> - **Ürün kataloğu (yönetim paneli):** ürünleri tek tek ekleme/düzenleme (görsel dahil), aktif/pasif yapma,
>   Excel/CSV şablonu indirme ve önizlemeli toplu yükleme. Kullanım kılavuzu: [docs/urun-katalogu-kilavuzu.md](docs/urun-katalogu-kilavuzu.md)
>
> - **Mama takibi (telefon uygulaması):** müşteri hayvanına katalogdan mama ekler (paket sayısı, günlük gram,
>   başlangıç tarihi); uygulama tahmini bitiş ve hatırlatma tarihini hesaplar. Hatırlatma varsayılan olarak
>   bitişten 5 gün önce, müşteri 1–20 gün arasında seçebilir veya kapatabilir. Mama bitince sayaç aynı paketle
>   kendiliğinden yeniden başlar; "Yeni paketi kullanmaya başladım" sayacı bugünden başlatır. Birden fazla pakette
>   toplam gram günlük grama bölünür. Hatırlatma sipariş oluşturmaz. Panelde müşterilerin mama kayıtları görünür.
>
> - **Hatırlatma bildirimleri:** telefonun kendisi, hatırlatma günü saat 10:00'da gösterir (ek hesap gerekmez).
> - **Sipariş:** müşteri katalogdan sepet oluşturur; hastaneden teslim almayı (kargo yok) veya adrese teslimatı
>   (kargo ücreti, adres, tarih ve saat müşteriden) seçer. Onaydan önce iptal edebilir veya teslim şeklini
>   değiştirebilir; onaydan sonra "Teslim aldım" diyebilir. Panelde siparişler durumlarına göre listelenir;
>   yönetici onaylar, iptal eder veya teslim edildi yapar. Kargo ücreti panelde **Ayarlar** sekmesinden değişir.
>   Durum değişikliğini müşteri uygulamayı açınca bildirim olarak görür.
>
> - **İndirim:** yeni müşterinin ilk siparişinde %20, sonraki tüm siparişlerde %10 (yalnızca ürünlere; kargoya değil).
>   Oranlar panelin **Ayarlar** sekmesinden değiştirilebilir.
>
> - **Kampanyalar:** panelin **Kampanyalar** sekmesinden yüzde veya sabit fiyatlı kampanya; aynı üründe sabit indirimle
>   birlikte geçerliyse müşteri için daha avantajlı olan tek indirim uygulanır.
>
> - **Katalog dışı ürün talebi:** müşteri 160 karakterlik mesajla talep gönderir; yönetici panelin **Talepler** sekmesinden
>   fiyat girerek onaylar veya reddeder. Onaylanan ürün yalnızca o müşteriye özeldir ve indirim uygulanmaz.
>
> Katalog **boştur**; ürün bilgilerini hastane girecek.

---

## Klasör yapısı

```
Anka-fc/
├── apps/
│   ├── mobile/            Müşteri telefon uygulaması (Expo / React Native)
│   │   ├── src/app/       Ekranlar (her dosya bir ekran; Expo Router)
│   │   │   ├── (auth)/    Giriş ve kayıt ekranları (oturum yokken açılır)
│   │   │   └── (app)/     Hayvan listesi, ekleme ve detay (oturum varken açılır)
│   │   ├── src/components/ Ortak görsel parçalar (alan, düğme, KVKK onay ekranı vb.)
│   │   ├── src/content/kvkk.ts  KVKK aydınlatma metni ve sürümü (TASLAK, hukukçu dolduracak)
│   │   ├── src/lib/       Supabase bağlantısı, oturum, doğrulama, veri işlemleri
│   │   ├── assets/        Simge ve açılış görselleri (şimdilik Expo'nun varsayılanları)
│   │   ├── app.json       Uygulama adı ve ayarları
│   │   └── .env.example   Telefon uygulamasının ortam değişkeni örneği
│   │
│   └── admin/             Hastane yönetim paneli (React + Vite)
│       ├── src/App.tsx    Oturum kontrolü (yalnızca yönetici hesabı girebilir)
│       ├── src/LoginPage.tsx      Yönetici giriş sayfası
│       ├── src/AdminShell.tsx     Sekmeler (Ürün kataloğu, Toplu yükleme, Kılavuz, Müşteriler)
│       ├── src/CustomersPage.tsx  Müşteri ve hayvan listesi (salt okunur)
│       ├── src/catalog/   Ürün kataloğu: liste, ürün formu, toplu yükleme, şablon, kılavuz
│       ├── src/lib/       Supabase bağlantısı ve yardımcı kodlar
│       └── .env.example   Panelin ortam değişkeni örneği
│
├── supabase/              Arka plan (Supabase) ayarları
│   ├── config.toml        Yerel Supabase ayarları
│   ├── migrations/        Veritabanı tablolarını ve erişim kurallarını kuran SQL dosyaları
│   ├── templates/         Türkçe e-posta şablonları (doğrulama ve şifre yenileme kodu)
│   ├── functions/         Sunucu fonksiyonları, ör. günlük hatırlatma (şimdilik boş)
│   └── seed.sql           Yerel denemeler için uydurma test verisi (şimdilik boş)
│
├── docs/                  Kullanım kılavuzları (ör. ürün kataloğu)
│
├── scripts/               Bilgisayarında çalışan yardımcı betikler
│   ├── create-admin.mjs   Tek yönetici hesabını oluşturur
│   ├── reset-admin-password.mjs  Yönetici şifresini yeniler
│   └── test-security.mjs  Kayıt ve erişim kurallarını yerel veritabanında test eder
│
├── package.json           Ortak komutlar; iki uygulamayı tek yerden yönetir (npm workspaces)
├── .nvmrc                 Önerilen Node.js sürümü (22)
└── .gitignore             Git'e girmeyecek dosyalar (.env, node_modules vb.)
```

Büyüdükçe iki uygulamanın ortak kullanacağı kodlar (ör. veri tipleri) `packages/` klasörüne eklenebilir.
Proje bu klasörü şimdiden tanıyor.

---

## Bilgisayarına kurman gereken araçlar

Hepsi ücretsizdir. Yalnızca listedeki araçları kur.

| Araç | Ne işe yarar | Gerekli mi? |
|---|---|---|
| **Git** | Kodu indirip güncellemek için | Evet |
| **Node.js 22 (LTS)** | Projeyi çalıştıran ana araç; `npm` de bununla gelir | Evet |
| **Docker Desktop** | Supabase'i kendi bilgisayarında çalıştırmak için | Yerel veritabanı için evet |
| **Expo Go** (telefona) | Uygulamayı kendi telefonunda denemek için | Telefonla denemek için evet |
| **Android Studio / Xcode** | Bilgisayarda telefon benzetici açmak için | Hayır, isteğe bağlı |

### Windows

1. Git'i https://git-scm.com/download/win adresinden indirip varsayılan ayarlarla kur.
2. Node.js'in **22 LTS** sürümünü https://nodejs.org adresinden indirip kur.
3. Docker Desktop'ı https://www.docker.com/products/docker-desktop/ adresinden kur. Kurulum WSL 2 isterse onayla, sonra bilgisayarı yeniden başlat.
4. Kontrol için **PowerShell**'i aç ve şunları yaz. Her biri bir sürüm numarası göstermeli:
   ```
   git --version
   node --version
   docker --version
   ```

### macOS

1. **Terminal**'i aç ve `git --version` yaz. Git yüklü değilse macOS kurmayı önerir; onayla.
2. Node.js'in **22 LTS** sürümünü https://nodejs.org adresinden indirip kur.
3. Docker Desktop'ı https://www.docker.com/products/docker-desktop/ adresinden kur. Mac'inin işlemcisine (Apple Silicon ya da Intel) uygun sürümü seç.
4. Kontrol için Terminal'de `node --version` ve `docker --version` yaz.

### Telefon

App Store ya da Google Play'den **Expo Go** uygulamasını indir.

> Supabase CLI'ı ayrıca kurmana gerek yok. Proje içine bağımlılık olarak eklendi ve `npm install` ile gelir.

---

## Projeyi ilk kez çalıştırma

Aşağıdaki komutları proje klasöründe, Windows'ta PowerShell'de, macOS'ta Terminal'de çalıştır.

**1. Kodu indir ve bağımlılıkları kur** (yalnızca ilk sefer):

```
git clone https://github.com/hakanbozkurttt-pixi/Anka-fc.git
cd Anka-fc
npm install
```

**2. Yerel veritabanını başlat.** Önce Docker Desktop'ı aç ve tamamen açılmasını bekle. Sonra:

```
npm run db:start
```

İlk çalıştırma birkaç dakika sürer, çünkü gerekli dosyalar indirilir. İş bitince ekranda
`API URL` ve `Publishable key` değerleri görünür. Bunları daha sonra yine görmek için
`npm run db:status` komutunu kullan.

**3. Ortam değişkeni dosyalarını oluştur.** İki örnek dosyayı `.env` adıyla kopyala:

- `apps/admin/.env.example` → `apps/admin/.env`
- `apps/mobile/.env.example` → `apps/mobile/.env`

Her iki `.env` dosyasında `buraya-publishable-anahtar` yazan yere, 2. adımda çıkan **Publishable key**
değerini yapıştır. `.env` dosyaları git'e eklenmez, yani bilgisayarında kalır.

**4. Yönetici hesabını oluştur** (yalnızca bir kez):

```
npm run admin:create -- yonetici@ornek.com
```

Komut güçlü bir şifre üretir ve **yalnızca bir kez** ekrana yazar. Şifreyi güvenli bir yere kaydet.
Gereksinimlere göre tek yönetici hesabı olduğu için ikinci bir yönetici oluşturulmaz.

**5. Yönetim panelini aç:**

```
npm run admin
```

Tarayıcıda http://127.0.0.1:5173 adresini aç ve yönetici e-postası ile şifresiyle giriş yap.
Müşteri hesabıyla panele girilemez.

**6. Telefon uygulamasını aç.** Yeni bir terminal penceresinde:

```
npm run mobile
```

Ekranda bir QR kodu çıkar. iPhone'da kamerayla, Android'de Expo Go'nun içinden bu kodu okut.
Uygulamada "Kayıt olun" ile yeni bir müşteri hesabı aç. Doğrulama kodu e-postayla gelir:
yerelde gerçek e-posta gönderilmez, tüm e-postalar **http://127.0.0.1:54324** adresindeki deneme
posta kutusuna (Mailpit) düşer. Kodu oradan alıp uygulamaya gir, ardından "Kedi veya köpek ekle" ile hayvan ekle.
Eklediğin kayıtlar yönetim panelinde de görünür. "Şifremi unuttum" kodu da aynı posta kutusuna gelir.

> **Telefonda "Arka plana ulaşılamadı" yazıyorsa:** Telefon `127.0.0.1` adresiyle bilgisayarına
> ulaşamaz. `apps/mobile/.env` dosyasında bu adresi bilgisayarının yerel IP adresiyle değiştir
> (örnek: `http://192.168.1.20:54321`). Telefon ve bilgisayar aynı Wi-Fi ağında olmalı.
> IP adresini Windows'ta `ipconfig`, macOS'ta `ipconfig getifaddr en0` komutuyla öğrenebilirsin.
> `.env` dosyasını değiştirdikten sonra `npm run mobile` komutunu kapatıp yeniden başlat.

**İşin bitince** veritabanını durdur: `npm run db:stop`

> **Daha önce `npm run db:start` çalıştırdıysan:** Yeni tablolar eklendiğinde bunların kurulması için
> bir kez `npm run db:reset` çalıştır. Bu komut **yerel** veritabanındaki tüm deneme kayıtlarını siler
> ve tabloları yeniden kurar; yönetici hesabını da 4. adımla yeniden oluşturman gerekir.

---

## Paneli tek tıkla açmak

İlk kurulumu (yukarıdaki 1–4. adımlar) bir kez yaptıktan sonra paneli şöyle açabilirsin:

1. **Docker Desktop**'ı aç.
2. Proje klasöründeki dosyaya çift tıkla:
   - Windows: **`Paneli-Ac.bat`**
   - macOS: **`Paneli-Ac.command`** (ilk seferde "açılamıyor" uyarısı çıkarsa dosyaya sağ tıklayıp **Aç**'ı seç)
3. Veritabanı başlar ve panel tarayıcıda kendiliğinden açılır (http://127.0.0.1:5173). Yönetici e-postası ve şifresiyle giriş yap.
4. İşin bitince açılan siyah pencereyi kapat.

Aynı işi terminalde `npm run panel` komutu da yapar.

> Panel yalnızca bu bilgisayarda çalışır; internete açık değildir. Hastanedeki başka bir bilgisayardan
> erişilebilmesi için panelin bir sunucuya yüklenmesi gerekir. Bu, ayrıca karar verilecek bir adımdır.

## Sık kullanılan komutlar

Bu komutların hepsi proje kök klasöründe çalıştırılır.

| Komut | Ne yapar |
|---|---|
| `npm run panel` | Veritabanını başlatır ve yönetim panelini tarayıcıda açar |
| `npm run admin` | Yönetim panelini geliştirme modunda açar |
| `npm run mobile` | Telefon uygulamasının geliştirme sunucusunu açar (QR kod) |
| `npm run db:start` | Yerel Supabase'i başlatır (Docker gerekir) |
| `npm run db:status` | Yerel Supabase adreslerini ve anahtarlarını gösterir |
| `npm run db:stop` | Yerel Supabase'i durdurur |
| `npm run db:reset` | Yerel veritabanını silip `migrations` ve `seed.sql` ile yeniden kurar |
| `npm run admin:create -- <e-posta>` | Tek yönetici hesabını oluşturur |
| `npm run admin:reset-password` | Yönetici şifresini unutulduğunda yeni şifre üretir |
| `npm run db:test` | Kayıt, giriş ve erişim kurallarını yerel veritabanında test eder (uydurma demo kullanıcılarla; iş bitince siler) |
| `npm test` | Kayıt formu, mama süresi/hatırlatma hesabı ve toplu yükleme kurallarını test eder (veritabanı gerekmez) |
| `npm run typecheck` | İki uygulamada da kod hatası kontrolü yapar |
| `npm run admin:build` | Yönetim panelinin yayına hazır hâlini derler (yayınlamaz) |

Yerel Supabase'in gönderdiği e-postalar (doğrulama ve şifre yenileme kodları) http://127.0.0.1:54324 adresinde görünür.
Yerel Supabase çalışırken veritabanını görsel olarak incelemek için http://127.0.0.1:54323 (Supabase Studio) adresini aç.

---

## Veriler nerede ve nasıl korunuyor?

| Bilgi | Nerede saklanır |
|---|---|
| E-posta ve şifre | Supabase'in giriş sistemi (`auth.users`). Şifre düz metin olarak değil, şifrelenmiş (hash) olarak saklanır. |
| Ad, soyad, telefon, adres | `profiles` tablosu. Kayıt anında veritabanı tarafından oluşturulur. |
| KVKK onayları | `kvkk_acceptances` tablosu: hangi müşteri, metnin hangi sürümünü, ne zaman onayladı. Onay zamanı sunucu saatiyle yazılır; müşteri onayı değiştiremez veya silemez. |
| Ürün kataloğu | `products` tablosu. Her paket boyutu ayrı satır. Stok ve günlük tüketim bilgisi tutulmaz. Yalnızca yönetici ekler/değiştirir; müşteriler yalnızca aktif ürünleri görebilir. |
| Ürün görselleri | `product-images` deposu. Herkes görüntüleyebilir (ürün fotoğrafı kişisel veri değildir); yalnızca yönetici yükler/siler. JPEG, PNG, WebP; en fazla 5 MB. |
| Mama takip kayıtları | `food_records` tablosu (paket sayısı, günlük gram, başlangıç, hatırlatma ayarı). Bitiş ve hatırlatma tarihi `food_records_with_schedule` görünümünde, Türkiye saatine göre hesaplanır. Müşteri yalnızca kendi kayıtlarını görür ve değiştirir; yönetici yalnızca okur. |
| Siparişler | `orders` ve `order_items` tabloları. Fiyatlar ve kargo ücreti sipariş anında siparişe yazılır; sonradan değişmez. Müşteri yalnızca kendi siparişlerini görür; sipariş verme, iptal, teslim şekli değiştirme ve durum değişikliği yalnızca kurallı veritabanı işlemleriyle yapılır (müşteri fiyat veya durumu doğrudan değiştiremez). |
| Katalog dışı talepler | `product_requests` tablosu (en fazla 160 karakterlik mesaj). Onaylanınca `products` tablosuna yalnızca o müşteriye özel ürün eklenir (`owner_customer_id`); diğer müşteriler göremez, katalog listesinde görünmez, indirim uygulanmaz. |
| Kampanyalar | `campaigns` ve `campaign_products` tabloları. Yalnızca yönetici yazar; müşteriler yalnızca o gün geçerli kampanyaları görür. Uygulanan indirim (kaynak, oran, kampanya adı) sipariş kalemine yazılır. |
| Ayarlar | `app_settings` tablosu: adrese teslimat kargo ücreti (başlangıçta 200 TL), ilk sipariş indirimi (%20) ve sonraki siparişlerin indirimi (%10). Herkes okur, yalnızca yönetici değiştirir. |
| Hayvan profilleri | `pets` tablosu. Zorunlu alanlar tür (kedi/köpek) ve ad; doğum tarihi, ırk, cinsiyet, kilo ve not isteğe bağlı. |

- **Zorunlu alanlar iki yerde denetlenir:** ekranda ve veritabanında. Eksik bilgiyle gelen kayıt isteği tamamen reddedilir, yarım hesap oluşmaz.
- **Satır bazlı erişim kuralları (RLS):** Müşteri yalnızca kendi profilini ve hayvanlarını görür ve yalnızca kendi adına hayvan ekleyebilir. Giriş yapmamış kişi hiçbir kaydı göremez.
- **Yönetici yetkisi** hesabın sunucu tarafındaki `app_metadata.role = admin` bilgisinden gelir. Bu bilgiyi yalnızca `npm run admin:create` betiği gizli anahtarla atayabilir; müşteri kendine yönetici yetkisi veremez. Yönetici kayıtları yalnızca okuyabilir.
- Şifreler en az 8 karakter olmalıdır.
- **E-posta doğrulaması zorunludur:** e-postasını 6 haneli kodla doğrulamayan müşteri giriş yapamaz.
- **Şifre yenileme** e-postaya gelen 6 haneli kodla yapılır. Bir e-postayla hesap olup olmadığı ekranda belli edilmez.
- **KVKK:** Kayıtta aydınlatma metni onayı zorunludur; onaysız kayıt veritabanında da reddedilir.
  Metin değiştiğinde `apps/mobile/src/content/kvkk.ts` içindeki `KVKK_VERSION` değiştirilir; müşteriler bir sonraki girişte yeni sürümü onaylar.
  **Metin şu an taslaktır**; gerçek kullanıma geçmeden hukuk danışmanı tarafından doldurulmalıdır.
- Yöneticiye iki adımlı doğrulama eklenmemiştir (karar).
- Bu kuralların hepsi `npm run db:test` ile gerçek (yerel) veritabanında test edilir.

## Güvenlik kuralları

- Gerçek anahtar, parola, müşteri ya da hayvan verisi **hiçbir zaman** git'e eklenmez. Bu değerler yalnızca `.env` dosyalarına yazılır.
- Uygulamalara yalnızca **publishable** (eski adıyla **anon**) anahtar girilir. **secret / service_role** anahtar telefon uygulamasına ya da panele konmaz; yalnızca sunucu tarafında kullanılır.
- Yerel Supabase'in gösterdiği anahtarlar yalnızca senin bilgisayarında geçerli olan deneme anahtarlarıdır.
- `seed.sql` dosyasına yalnızca uydurma olduğu açıkça belli test verileri yazılır.

---

## Şimdilik gerekmeyen hesaplar

Yerel geliştirme için **hiçbir hesap açman gerekmiyor.** Kökteki `.env.example` yalnızca ileride bulut Supabase projesi için gereken betik ayarlarını gösterir; yerelde gerekmez. Teknik planda listelenen hesaplar daha sonraki aşamalarda gerekecek:

- Supabase: bulutta gerçek proje açarken. Bu aşamada doğrulama ve şifre yenileme e-postaları için
  bir **e-posta gönderim hizmeti (SMTP)** de ayarlanmalı; Supabase'in yerleşik e-posta gönderimi yalnızca deneme amaçlıdır ve saatlik sınırı çok düşüktür.
- Firebase: bildirimlere geçerken (Aşama 4)
- Expo: mağaza derlemesi yaparken
- Apple Developer ve Google Play Console: yayın aşamasında

Bu hesapların hastanenin kurumsal e-postasıyla açılıp açılmayacağı planda hâlâ karar bekliyor.
