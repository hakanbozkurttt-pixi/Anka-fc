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

## Bildirimler — 20.11.2026 (değişti)
- Mama hatırlatmaları **telefonun kendisi tarafından** zamanında gösterilir (yerel bildirim). Sunucudan gönderim,
  Firebase veya Apple bildirim hesabı gerekmez. Hatırlatma saati 10:00.
- Sipariş durumu bildirimleri (Onaylandı, İptal edildi, Teslim edildi) **müşteri uygulamayı açınca** gösterilir;
  uygulama kapalıyken anında gönderilmez.
- Bildirim izni verilmezse yedek kanal yoktur (SMS/e-posta gönderilmez); uygulama müşteriyi uyarır.

## Sipariş ve teslimat — 20.11.2026 (değişti, henüz geliştirilmedi)
- Adrese teslimatta **teslimat tarihini ve saatini müşteri girer.** Hastaneden teslim almada tarih/saat sorulmaz.
- Adrese teslimat kargo ücreti başlangıçta **200 TL**; **yönetici panelden değiştirebilir.**
- **Katalogdaki tüm ürünler stokta kabul edilir;** "tedarikçi teyidi" diye ayrı bir adım, durum veya not yoktur.
- Sipariş durumları: Onay bekliyor, Onaylandı, Teslim edildi, İptal edildi.
