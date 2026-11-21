# App Store Hazırlığı — Anka Friends Club

**Yayıncı:** Anka Hayvan Hastanesi · **Uygulama adı:** Anka Friends Club · **Sürüm:** 1.0.0

Bu belge App Store'a gönderim için gereken bilgileri ve taslak metinleri toplar.
Köşeli parantezli `[ ... ]` kısımlar hastane tarafından doldurulmalıdır.
**Hiçbir hesap açılmadı, derleme yapılmadı, mağazaya gönderim yapılmadı.**

---

## 1. Kontrol listesi

| # | İş | Kim | Durum |
|---|---|---|---|
| 1 | D-U-N-S numarası başvurusu (Anka Hayvan Hastanesi adına, ücretsiz; günler–haftalar sürebilir) | Hastane | Bekliyor |
| 2 | Apple Developer Program — kurumsal hesap, hastane adına ve kurumsal e-postayla (yıllık 99 USD) | Hastane | Bekliyor |
| 3 | Expo hesabı (ücretsiz), hastanenin kurumsal e-postasıyla | Hastane | Bekliyor |
| 4 | Paket kimliğinin onayı: `com.ankahayvanhastanesi.friendsclub` (ilk gönderimden sonra değiştirilemez) | Hastane | **Onay bekliyor** |
| 5 | KVKK aydınlatma metninin tamamlanması (uygulamadaki taslak metin değiştirilmeli) | Hukuk danışmanı | Bekliyor |
| 6 | Gizlilik politikası sayfası (internette açılan bir adres) | Hukuk danışmanı + hastane | Bekliyor |
| 7 | Destek adresi (web sayfası veya e-posta) | Hastane | Bekliyor |
| 8 | Uygulama simgesi 1024×1024 (şu an Expo'nun varsayılan simgesi) | Hastane / tasarımcı | Bekliyor |
| 9 | Bulut ortamı (Supabase), e-posta gönderim hizmeti, yönetim panelinin yayını | Karar: hastane · Kurulum: geliştirici | Bekliyor |
| 10 | Gerçek ürün kataloğunun yüklenmesi (boş katalog ret sebebi olabilir) | Hastane | Bekliyor |
| 11 | İnceleme ekibi için deneme müşteri hesabı (bulut ortamında) | Geliştirici | Bulut sonrası |
| 12 | Ekran görüntüleri (iPhone 6,9" ve 6,5") | Geliştirici | Bulut sonrası |
| 13 | Derleme ve gönderim (Expo üzerinden; Mac gerekmez) | Geliştirici, hastanenin onayıyla | Bulut sonrası |

Uygulama tarafında hazır olanlar: uygulama adı, paket kimliği önerisi, iPad desteği kapalı (yalnızca iPhone;
iPad ekran görüntüsü istenmez), şifreleme beyanı (yalnızca standart HTTPS), uygulama içinden hesap silme
(Apple zorunlu), derleme ayarları (`apps/mobile/eas.json`).

---

## 2. Mağaza sayfası taslağı

**Ad (en fazla 30 karakter):** Anka Friends Club

**Alt başlık (en fazla 30 karakter):** Mama takibi ve kolay sipariş

**Kategori:** Birincil: Yaşam Tarzı (Lifestyle) · İkincil: Alışveriş (Shopping)

**Anahtar kelimeler (en fazla 100 karakter, virgülle):**
`mama,kedi,köpek,veteriner,hatırlatma,sipariş,evcil hayvan,mama takibi,anka,hayvan hastanesi`

**Açıklama:**

> Anka Friends Club, Anka Hayvan Hastanesi'nin kedi ve köpek dostları için hazırladığı mama takip ve sipariş uygulamasıdır.
>
> • Kedinizin veya köpeğinizin profilini oluşturun.
> • Kullandığınız mamayı, paket sayısını ve günlük tüketimi girin; uygulama mamanın tahminen ne zaman biteceğini hesaplasın.
> • Mama bitmeden, seçtiğiniz gün sayısı kadar önce hatırlatma alın.
> • Mamanızı Anka Hayvan Hastanesi'nden kolayca sipariş edin: hastaneden teslim alın veya adresinize teslim edilsin.
> • İlk siparişinize özel indirim ve dönemsel kampanyalardan yararlanın.
> • Aradığınız mama katalogda yoksa hastaneye talep gönderin.
>
> Ödeme uygulama içinde alınmaz; teslim alırken veya teslimatta yapılır.

**Destek adresi:** `[https://… veya e-posta]` · **Gizlilik politikası adresi:** `[https://…]`

**Yaş sınıflandırması:** 4+ (şiddet, kumar, yetişkin içerik vb. yok; kullanıcıların birbirine mesaj gönderdiği
bir bölüm yok; katalog dışı talep yalnızca hastaneye iletilir).

---

## 3. Gizlilik bilgileri (App Store "Uygulama Gizliliği" formu)

**Takip (tracking):** Yok. Reklam, analiz aracı veya üçüncü taraf takip kullanılmıyor.

| Veri türü | Toplanıyor mu | Kullanıcıyla ilişkili mi | Amaç |
|---|---|---|---|
| Ad, soyad | Evet | Evet | Uygulama işlevi (hesap, sipariş) |
| E-posta adresi | Evet | Evet | Uygulama işlevi (giriş, doğrulama) |
| Telefon numarası | Evet | Evet | Uygulama işlevi (sipariş iletişimi) |
| Fiziksel adres | Evet | Evet | Uygulama işlevi (adrese teslimat) |
| Satın alma geçmişi (siparişler) | Evet | Evet | Uygulama işlevi |
| Kullanıcı kimliği (hesap numarası) | Evet | Evet | Uygulama işlevi |
| Diğer kullanıcı içeriği (hayvan bilgileri, mama kayıtları, talep mesajı) | Evet | Evet | Uygulama işlevi |
| Konum, kişiler, fotoğraf, sağlık, finans, tarama geçmişi | Hayır | — | — |

Bildirimler telefonun kendisi tarafından gösterilir; bildirim için cihaz kimliği sunucuya gönderilmez.
Kesin içerik, hukuk danışmanının hazırlayacağı gizlilik politikasıyla tutarlı olmalıdır.

---

## 4. İnceleme ekibine not (taslak, İngilizce yazılır)

> Anka Friends Club is the official app of Anka Animal Hospital (Anka Hayvan Hastanesi) for its customers.
> Customers track their pets' food consumption, receive local reminders before the food runs out, and order
> pet food from the hospital. **No payment is taken in the app**; physical goods are paid at pickup or on delivery.
>
> Demo account: `[e-posta]` / `[şifre]` (email already verified; catalog contains products).
> Account deletion: Hesabım (Account) → Hesabımı sil (Delete my account).
> Notifications are local reminders scheduled on the device; no push notifications are used.

---

## 5. Derleme hakkında (geliştirici notu)

- Derleme ayarları: `apps/mobile/eas.json` (`preview` = iç deneme, `production` = mağaza).
- Canlı ortamın adresi ve "publishable" anahtarı derleme sırasında `EXPO_PUBLIC_SUPABASE_URL` ve
  `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` olarak Expo hesabındaki ortam değişkenlerinden verilir; dosyaya yazılmaz.
- Her yeni mağaza gönderiminde `app.json` içindeki `ios.buildNumber` artırılır.
