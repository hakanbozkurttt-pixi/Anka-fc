# Kullanıcı Akışları Kontrol Raporu — 20.11.2026

Kontrol yalnızca yerel deneme ortamında, açıkça demo olarak işaretlenmiş verilerle
(`@example.com` e-postaları, "Demo"/"TEST" adları) yapıldı. Gerçek e-posta, SMS veya bildirim gönderilmedi.

## Durum özeti

| Akış | Durum |
|---|---|
| Müşteri kaydı (ad, soyad, telefon, adres, e-posta) | Çalışıyor, test edildi |
| Kedi/köpek profili ekleme ve görüntüleme | Çalışıyor, test edildi (doğum tarihi hatası düzeltildi) |
| Mama takibi, 25 gün hesabı, 5 gün önce hatırlatma | Geliştirildi ve test edildi (20.11.2026, aşağıya bakın) |
| Telefona bildirim gönderimi | **Henüz geliştirilmedi** (hatırlatma tarihi hesaplanıyor) |
| Bildirimin otomatik sipariş oluşturmaması | Hatırlatma hiçbir sipariş kaydı oluşturmuyor (sipariş özelliği henüz yok) |
| Sipariş, teslim şekli, kargo (200 TL, yönetici değiştirebilir) | Geliştirildi ve test edildi (20.11.2026) |
| Sipariş onayı | Geliştirildi. Karar gereği tüm ürünler stokta kabul edilir; tedarikçi teyidi ve 3 iş günü adımı yok |
| Panel ↔ müşteri sipariş durumu tutarlılığı | Test edildi: iki tarafta aynı durum |
| Sabit indirim ve aylık kampanya | **Henüz geliştirilmedi** |

## Sonraki aşamalar için kabul kriterleri (gereksinim belgesine göre)

Bu maddeler ilgili özellik geliştirilirken otomatik testlere dönüştürülmelidir.

**Mama takibi ve hatırlatma** — *geliştirildi; kurallar otomatik testlerle denetleniyor*
- 1.500 g paket, günde 60 g → tahmini bitiş 25. gün. ✔
- Hatırlatma varsayılan olarak bitişten 5 gün önce (20. gün). ✔ *(Karar: 20.11.2026)*
- Müşteri hatırlatmayı kayıt bazında açıp kapatabilir, gün sayısını 1–20 arasında seçebilir. ✔
- Birden fazla paket: toplam gram ÷ günlük gram (2 × 1.500 g → 50 gün). ✔
- Mama bitince sayaç aynı paketle kendiliğinden yeniden başlar. ✔
- Hatırlatma **sipariş oluşturmaz**; müşteri istediği zaman sipariş verir. ✔
- Kalan: hatırlatmanın telefona bildirim olarak gönderilmesi (Aşama 4); teslim edilen siparişten
  sonra "yeni paketi kullanmaya başladınız mı?" sorusu (sipariş özelliğiyle birlikte).

**Sipariş ve teslimat**
- Hastaneden teslim almada kargo ücreti **yok**; adrese teslimatta sabit **200 TL** (adresten bağımsız).
- Müşteri adrese teslimatta kayıtlı adresini veya o siparişe özel farklı bir adres girebilir.
- **Müşteri teslimat tarihi/saati girmez.** Adrese teslimatta tarih/saati yönetici, müşteriyle
  netleştirdikten sonra panelde girer; müşteri sipariş detayında görür. Hastaneden teslim almada tarih/saat yoktur.
  *(Kontrol listesindeki "müşteri tarih ve saati belirtebiliyor mu" maddesi bu kararla çelişiyor.)*
- Durumlar yalnızca: Onay bekliyor, Onaylandı, Teslim edildi, İptal edildi.
- **"Tedarikçi teyidi bekliyor" ayrı bir durum değildir.** Stokta yoksa yönetici tedarikçiyle
  teyitleşir, sonra onaylar; teyit siparişe not olarak eklenir. Sistem stok tutmaz.
- 3 iş günü tedarik bir hedeftir; panelde nasıl gösterileceği gereksinimlerde hâlâ açık konu.
- Sipariş durumu panelde ve müşteri uygulamasında aynı olmalı; durum değişikliğinde
  (Onaylandı, İptal edildi, Teslim edildi) müşteriye bildirim gider.

**İndirim ve kampanya** — *sabit indirim geliştirildi (ilk sipariş %20, sonra %10; bkz. docs/kararlar.md); kampanya henüz yok*
- Tek sabit indirim oranı; kampanya ile aynı üründe geçerliyse müşteri için daha avantajlı olan
  **tek** indirim uygulanır, indirimler birleşmez.
- Oran/kampanya değişikliği geçmiş siparişlerin fiyatını değiştirmez.
- Katalog dışı onaylanmış ürünlerde indirim uygulanmaz.
