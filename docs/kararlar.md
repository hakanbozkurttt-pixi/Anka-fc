# Proje Kararları

Geliştirme sırasında verilen kararların kaydı. Gereksinim belgesinden farklı olan kararlar **(değişti)**
diye işaretlidir; bu durumda buradaki karar geçerlidir.

## Hesap ve giriş — 20.11.2026
- Kayıtta zorunlu: ad, soyad, telefon, adres, e-posta ve şifre (en az 8 karakter).
- E-posta doğrulaması **var** (6 haneli kod). Şifre yenileme **ilk sürümde var** (6 haneli kod).
- Kayıtta KVKK aydınlatma metni onayı zorunlu. Metnin yeni sürümünü onaylamamış müşteri girişten sonra onay ekranını görür.
- Yönetim paneli: tek yönetici hesabı, e-posta ve şifreyle giriş. **İki adımlı doğrulama yok.**

## Hayvan profili — 20.11.2026
- Zorunlu: tür (kedi/köpek) ve ad. İsteğe bağlı: doğum tarihi, ırk, cinsiyet, kilo, not.

## Ürün kataloğu — 20.11.2026
- Markalar: Proplan, Hill's, Royal Canin, Virbac, Carni. Her paket boyutu ayrı ürün.
- **Katalogda stok adedi tutulmaz.**
- Toplu yüklemede barkodu katalogda zaten kayıtlı satır: uyarı gösterilir, yönetici onaylarsa ürün güncellenir.
- Ürün silinmez; satıştan kaldırmak için pasif yapılır.

## Mama takibi — 20.11.2026
- Süre = (paket gramı × paket sayısı) ÷ günlük gram (tam gün). Örnek: 1.500 g ÷ 60 g = 25 gün; 2 paket = 50 gün.
- Hatırlatma, müşteri değiştirmezse bitişten **5 gün önce**; müşteri **1–20 gün** arasında seçebilir veya kapatabilir.
- Mama bitince sayaç **aynı paketle kendiliğinden yeniden** başlar. "Yeni paketi kullanmaya başladım" sayacı bugünden başlatır.
- Hatırlatma sipariş oluşturmaz.

## İndirim — 20.11.2026 (değişti)
- Gereksinim belgesindeki "tek sabit oran" yerine iki oran:
  - **Yeni müşterinin ilk siparişi: %20.**
  - **Sonraki tüm siparişler (tüm müşteriler): %10.**
- "İlk sipariş": müşterinin iptal edilmemiş başka siparişi yoksa. İlk sipariş iptal edilirse sonraki sipariş yine ilk sipariş sayılır.
- İndirim yalnızca ürünlere uygulanır; kargo ücretine uygulanmaz. İndirimli birim fiyat kuruşa yuvarlanır.
- İki oranı da yönetici panelin **Ayarlar** sekmesinden değiştirebilir; değişiklik yalnızca yeni siparişlere uygulanır.
- Ürün listesinde liste fiyatı; sepette ve sipariş özetinde indirimli fiyat ve indirim tutarı gösterilir.
- Aylık kampanyalar henüz yok. Geldiğinde: aynı üründe kampanya ve sabit indirim birlikte geçerliyse müşteri için daha
  avantajlı olan tek indirim uygulanır (gereksinim belgesi).

## Bildirimler — 20.11.2026 (değişti)
- Mama hatırlatmaları **telefonun kendisi tarafından** zamanında gösterilir (yerel bildirim). Sunucudan gönderim,
  Firebase veya Apple bildirim hesabı gerekmez. Hatırlatma saati 10:00.
- Sipariş durumu bildirimleri (Onaylandı, İptal edildi, Teslim edildi) **müşteri uygulamayı açınca** gösterilir;
  uygulama kapalıyken anında gönderilmez.
- Bildirim izni verilmezse yedek kanal yoktur (SMS/e-posta gönderilmez); uygulama müşteriyi uyarır.

## Sipariş ve teslimat — 20.11.2026 (değişti, geliştirildi)
- Adrese teslimatta **teslimat tarihini ve saatini müşteri girer.** Hastaneden teslim almada tarih/saat sorulmaz.
- Adrese teslimat kargo ücreti başlangıçta **200 TL**; **yönetici panelden değiştirebilir.**
- **Katalogdaki tüm ürünler stokta kabul edilir;** "tedarikçi teyidi" diye ayrı bir adım, durum veya not yoktur.
- Sipariş durumları: Onay bekliyor, Onaylandı, Teslim edildi, İptal edildi.
- Kargo ücreti değişirse yalnızca bundan sonra verilen siparişlere uygulanır; fiyatlar sipariş anında sabitlenir.
- Onaydan önce müşteri siparişi iptal edebilir, teslim şeklini/adresini/tarihini değiştirebilir (kargo ücreti buna göre
  eklenir veya kalkar). Onaydan sonra hastaneyle iletişime geçer.
- Yönetici: Onay bekliyor → Onaylandı veya İptal; Onaylandı → Teslim edildi veya İptal.
- Müşteri "Teslim aldım"ı yalnızca Onaylandı durumunda kullanabilir.
- Teslimattan sonra, mama kaydı olan ürün için "Yeni paketi kullanmaya başladınız mı?" sorulur. "Evet" derse sayaç
  bugünden ve siparişteki paket adediyle başlar. Cevap vermezse sayaç mevcut mama bitince kendiliğinden yeniden başlar.
- Müşteri kendi yaptığı iptal veya "Teslim aldım" için bildirim almaz; hastanenin yaptığı değişiklikleri uygulamayı açınca görür.
- Adrese teslimat tarihi en fazla 90 gün sonrası olabilir (teknik sınır, değiştirilebilir).
