# Ürün Kataloğu Kullanım Kılavuzu

Bu kılavuz, mama ürünlerinin hastane yönetim panelinden nasıl ekleneceğini anlatır.
Aynı bilgiler panelde **Kılavuz** sekmesinde de bulunur.

## Bilmeniz gerekenler

- Katalogda yalnızca şu markalar yer alır: **Proplan, Hill's, Royal Canin, Virbac, Carni**.
- **Her paket boyutu ayrı bir üründür.** Aynı mamanın 1,5 kg ve 3 kg paketleri iki ayrı kayıt olarak eklenir.
- Katalogda **stok adedi tutulmaz.** Stok durumunu siparişi görünce siz kontrol edersiniz.
- Hayvanın **günde kaç gram yediği katalogda yer almaz.** Bu bilgiyi müşteri kendi hayvanı için uygulamada girer.
  Katalogda yalnızca paketin ağırlığı bulunur (ör. 1.500 gram).
- Ürünler silinmez. Satıştan kaldırmak istediğiniz ürünü **Pasif** yaparsınız; müşteriler pasif ürünü görmez.

## Ürünleri tek tek eklemek

1. Panelde **Ürün kataloğu** sekmesini açın ve **Yeni ürün ekle** düğmesine basın.
2. Yıldızlı (*) alanları doldurun:
   - **Marka:** listeden seçin.
   - **Hayvan türü:** Kedi, Köpek veya Her ikisi.
   - **Ürün adı:** paketin üzerindeki tam ad.
   - **Paket ağırlığı (gram):** yalnızca gram ve tam sayı. 1,5 kg için `1500`, 12 kg için `12000`.
   - **Satış fiyatı (TL):** ör. `1249,90`.
3. Varsa şunları da yazın: seri, içerik/tat, yaş grubu, barkod/ürün kodu ve açıklama.
4. İsterseniz **ürün görseli** seçin (JPEG, PNG veya WebP; en fazla 5 MB).
5. **Aktif** kutusu işaretliyse müşteriler ürünü görür. **Kaydet**’e basın.
6. Bir ürünü değiştirmek için listede **Düzenle**’ye, satıştan kaldırmak için **Pasif yap**’a basın.

## Dosyayla toplu yüklemek

1. Panelde **Toplu yükleme** sekmesini açın.
2. **Excel şablonunu indir** düğmesine basın. (CSV şablonu da var; Excel daha kolaydır çünkü marka,
   hayvan türü ve aktif sütunlarında açılır liste bulunur.)
3. Şablonu Excel’de açın. **Kırmızı yazılı ikinci satır yalnızca örnektir**
   (“ÖRNEK — içe aktarmadan önce silin”). **Bu satırı silin.**
4. Her paket boyutu için bir satır doldurun. **İlk satırdaki sütun başlıklarını değiştirmeyin.**
   Her sütunun ne anlama geldiği şablondaki **Açıklamalar** sayfasında ve aşağıdaki tabloda yazar.
5. Dosyayı kaydedin (Excel için **.xlsx** biçiminde).
6. Panelde dosyayı seçin. Dosya hemen kaydedilmez; önce bir **önizleme** açılır.
7. Önizlemeyi kontrol edin:
   - **Yeni ürün:** katalogda olmayan, eklenecek ürün.
   - **Güncellenecek:** barkodu/ürün kodu katalogda zaten kayıtlı ürün. Eski ve yeni değerler yan yana gösterilir.
   - **Hatalı:** düzeltilmesi gereken satır. Sorunun ne olduğu satırın yanında yazar.
8. Hatalı satır varsa: Excel’de aynı **satır numarasını** bulun, düzeltin, kaydedin ve dosyayı panelde yeniden seçin.
   **Hatalı satır varken hiçbir ürün içe aktarılmaz.**
9. Güncellenecek ürün varsa, değişiklikleri kontrol edip alttaki **onay kutusunu** işaretleyin.
10. **İçe aktar**’a basın. Tüm satırlar birlikte kaydedilir; bir sorun çıkarsa hiçbiri kaydedilmez.
11. Görselleri, yüklemeden sonra katalogda ürünü **Düzenle** ile açarak ekleyin.

## Sütunlar

| Sütun | Zorunlu | Ne yazılmalı? |
|---|---|---|
| Marka | Evet | Proplan, Hill's, Royal Canin, Virbac veya Carni |
| Ürün adı | Evet | Ürünün paketteki tam adı |
| Hayvan türü | Evet | Kedi, Köpek veya Her ikisi |
| Seri | Hayır | Ürünün ait olduğu seri |
| İçerik / tat | Hayır | Ana içerik veya tat |
| Yaş grubu | Hayır | Ör. yavru, yetişkin |
| Paket ağırlığı (gram) | Evet | Yalnızca gram, tam sayı (1,5 kg → 1500) |
| Satış fiyatı (TL) | Evet | Ör. 1249,90 (“TL” yazmak gerekmez) |
| Barkod / ürün kodu | Hayır | Varsa. Her ürün için farklı olmalı |
| Açıklama | Hayır | Müşterinin göreceği kısa açıklama |
| Aktif | Hayır | Evet veya Hayır (boşsa Evet) |

## Sık karşılaşılan hatalar ve çözümleri

| Önizlemedeki mesaj | Ne yapmalı? |
|---|---|
| Bu, şablondaki örnek satırdır | Kırmızı örnek satırı silin. |
| Marka tanınmadı | Beş markadan birini yazın veya açılır listeden seçin. |
| Paket ağırlığı gram olarak tam sayı olmalı | Kilogram değil gram yazın: 1,5 → 1500. |
| Satış fiyatı okunamadı | Yalnızca rakam ve kuruş için virgül kullanın: 1249,90. |
| Hayvan türü tanınmadı | Kedi, Köpek veya Her ikisi yazın. |
| Mükerrer barkod/ürün kodu | Dosyada iki satırda aynı kod var; doğru olanı bırakın veya kodu düzeltin. |
| Zorunlu sütunlar bulunamadı | Panelden yeni şablon indirin; başlık satırını değiştirmeyin. |
| Eski Excel biçimi (.xls) desteklenmiyor | Excel’de “Farklı Kaydet → Excel Çalışma Kitabı (.xlsx)” seçin. |

**Uyarılar** (sarı) içe aktarmayı engellemez, yalnızca dikkat çeker. Örneğin barkodu olmayan bir ürünle aynı marka,
ad ve paket ağırlığında bir ürün zaten kayıtlıysa, mükerrer olmadığından emin olmanız istenir.
