# Anka-fc: Mama Takip Uygulaması

Bu depo, veteriner hastanesinin mama takip sistemini içerir. Sistem üç parçadan oluşur:

1. **Müşteri telefon uygulaması.** iPhone ve Android için tek ortak kodla yazılır (React Native + Expo).
2. **Hastane yönetim paneli.** Bilgisayarda tarayıcıdan açılan web sayfasıdır (React + Vite).
3. **Arka plan.** Veritabanı, giriş sistemi ve zamanlanmış görevler burada çalışır (Supabase).

Teknik kararlar onaylanan **"Mama Takip Uygulaması: Teknik Plan"** belgesine dayanır.

> **Şu anki durum:** İlk özellik tamamlandı: **müşteri hesabı ve hayvan profili.**
> - Telefon uygulaması: kayıt (ad, soyad, telefon, adres, e-posta, şifre), giriş, çıkış,
>   kedi/köpek profili ekleme, kayıtlı profilleri listeleme ve görüntüleme.
> - Yönetim paneli: yönetici girişi ve müşteri/hayvan kayıtlarının salt okunur listesi (arama ile).
>
> Henüz katalog, mama takibi, sipariş, kargo, indirim, kampanya veya bildirim özelliği yok.

---

## Klasör yapısı

```
Anka-fc/
├── apps/
│   ├── mobile/            Müşteri telefon uygulaması (Expo / React Native)
│   │   ├── src/app/       Ekranlar (her dosya bir ekran; Expo Router)
│   │   │   ├── (auth)/    Giriş ve kayıt ekranları (oturum yokken açılır)
│   │   │   └── (app)/     Hayvan listesi, ekleme ve detay (oturum varken açılır)
│   │   ├── src/components/ Ortak görsel parçalar (alan, düğme vb.)
│   │   ├── src/lib/       Supabase bağlantısı, oturum, doğrulama, veri işlemleri
│   │   ├── assets/        Simge ve açılış görselleri (şimdilik Expo'nun varsayılanları)
│   │   ├── app.json       Uygulama adı ve ayarları
│   │   └── .env.example   Telefon uygulamasının ortam değişkeni örneği
│   │
│   └── admin/             Hastane yönetim paneli (React + Vite)
│       ├── src/App.tsx    Oturum kontrolü (yalnızca yönetici hesabı girebilir)
│       ├── src/LoginPage.tsx      Yönetici giriş sayfası
│       ├── src/CustomersPage.tsx  Müşteri ve hayvan listesi (salt okunur)
│       ├── src/lib/       Supabase bağlantısı ve yardımcı kodlar
│       └── .env.example   Panelin ortam değişkeni örneği
│
├── supabase/              Arka plan (Supabase) ayarları
│   ├── config.toml        Yerel Supabase ayarları
│   ├── migrations/        Veritabanı tablolarını ve erişim kurallarını kuran SQL dosyaları
│   ├── functions/         Sunucu fonksiyonları, ör. günlük hatırlatma (şimdilik boş)
│   └── seed.sql           Yerel denemeler için uydurma test verisi (şimdilik boş)
│
├── scripts/               Bilgisayarında çalışan yardımcı betikler
│   ├── create-admin.mjs   Tek yönetici hesabını oluşturur
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
Uygulamada "Kayıt olun" ile yeni bir müşteri hesabı aç, ardından "Kedi veya köpek ekle" ile hayvan ekle.
Eklediğin kayıtlar yönetim panelinde de görünür.

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

## Sık kullanılan komutlar

Bu komutların hepsi proje kök klasöründe çalıştırılır.

| Komut | Ne yapar |
|---|---|
| `npm run admin` | Yönetim panelini geliştirme modunda açar |
| `npm run mobile` | Telefon uygulamasının geliştirme sunucusunu açar (QR kod) |
| `npm run db:start` | Yerel Supabase'i başlatır (Docker gerekir) |
| `npm run db:status` | Yerel Supabase adreslerini ve anahtarlarını gösterir |
| `npm run db:stop` | Yerel Supabase'i durdurur |
| `npm run db:reset` | Yerel veritabanını silip `migrations` ve `seed.sql` ile yeniden kurar |
| `npm run admin:create -- <e-posta>` | Tek yönetici hesabını oluşturur |
| `npm run db:test` | Kayıt, giriş ve erişim kurallarını yerel veritabanında test eder (uydurma demo kullanıcılarla; iş bitince siler) |
| `npm run typecheck` | İki uygulamada da kod hatası kontrolü yapar |
| `npm run admin:build` | Yönetim panelinin yayına hazır hâlini derler (yayınlamaz) |

Yerel Supabase çalışırken veritabanını görsel olarak incelemek için http://127.0.0.1:54323 (Supabase Studio) adresini aç.

---

## Veriler nerede ve nasıl korunuyor?

| Bilgi | Nerede saklanır |
|---|---|
| E-posta ve şifre | Supabase'in giriş sistemi (`auth.users`). Şifre düz metin olarak değil, şifrelenmiş (hash) olarak saklanır. |
| Ad, soyad, telefon, adres | `profiles` tablosu. Kayıt anında veritabanı tarafından oluşturulur. |
| Hayvan profilleri | `pets` tablosu. Zorunlu alanlar tür (kedi/köpek) ve ad; doğum tarihi, ırk, cinsiyet, kilo ve not isteğe bağlı. |

- **Zorunlu alanlar iki yerde denetlenir:** ekranda ve veritabanında. Eksik bilgiyle gelen kayıt isteği tamamen reddedilir, yarım hesap oluşmaz.
- **Satır bazlı erişim kuralları (RLS):** Müşteri yalnızca kendi profilini ve hayvanlarını görür ve yalnızca kendi adına hayvan ekleyebilir. Giriş yapmamış kişi hiçbir kaydı göremez.
- **Yönetici yetkisi** hesabın sunucu tarafındaki `app_metadata.role = admin` bilgisinden gelir. Bu bilgiyi yalnızca `npm run admin:create` betiği gizli anahtarla atayabilir; müşteri kendine yönetici yetkisi veremez. Yönetici kayıtları yalnızca okuyabilir.
- Şifreler en az 8 karakter olmalıdır.
- Bu kuralların hepsi `npm run db:test` ile gerçek (yerel) veritabanında test edilir.

## Güvenlik kuralları

- Gerçek anahtar, parola, müşteri ya da hayvan verisi **hiçbir zaman** git'e eklenmez. Bu değerler yalnızca `.env` dosyalarına yazılır.
- Uygulamalara yalnızca **publishable** (eski adıyla **anon**) anahtar girilir. **secret / service_role** anahtar telefon uygulamasına ya da panele konmaz; yalnızca sunucu tarafında kullanılır.
- Yerel Supabase'in gösterdiği anahtarlar yalnızca senin bilgisayarında geçerli olan deneme anahtarlarıdır.
- `seed.sql` dosyasına yalnızca uydurma olduğu açıkça belli test verileri yazılır.

---

## Şimdilik gerekmeyen hesaplar

Yerel geliştirme için **hiçbir hesap açman gerekmiyor.** Kökteki `.env.example` yalnızca ileride bulut Supabase projesi için gereken betik ayarlarını gösterir; yerelde gerekmez. Teknik planda listelenen hesaplar daha sonraki aşamalarda gerekecek:

- Supabase: bulutta gerçek proje açarken
- Firebase: bildirimlere geçerken (Aşama 4)
- Expo: mağaza derlemesi yaparken
- Apple Developer ve Google Play Console: yayın aşamasında

Bu hesapların hastanenin kurumsal e-postasıyla açılıp açılmayacağı planda hâlâ karar bekliyor.
