import { BRANDS } from './model'
import { COLUMNS, EXAMPLE_MARKER } from './rows'
import { TemplateButtons } from './TemplateButtons'

// Panel içindeki kısa kullanım kılavuzu. Aynı içerik docs/urun-katalogu-kilavuzu.md dosyasında da var.
export function GuidePage() {
  return (
    <article className="guide">
      <h1>Ürün kataloğu kullanım kılavuzu</h1>
      <p>
        Katalogda yalnızca şu markalar yer alır: {BRANDS.join(', ')}. Her paket boyutu ayrı bir üründür: aynı mamanın
        1,5 kg ve 3 kg paketleri iki ayrı kayıt olur. Stok adedi ve hayvanın günde kaç gram yediği katalogda tutulmaz.
      </p>

      <h2>Ürünleri tek tek eklemek</h2>
      <ol>
        <li>“Ürün kataloğu” sekmesinde <strong>Yeni ürün ekle</strong> düğmesine basın.</li>
        <li>Yıldızlı (*) alanları doldurun: marka, hayvan türü, ürün adı, paket ağırlığı (gram) ve satış fiyatı.</li>
        <li>Varsa seri, içerik/tat, yaş grubu, barkod/ürün kodu ve açıklamayı yazın.</li>
        <li>İsterseniz ürün görselini seçin (JPEG, PNG veya WebP, en fazla 5 MB).</li>
        <li>“Aktif” kutusu işaretliyse müşteriler ürünü görür. <strong>Kaydet</strong>’e basın.</li>
        <li>Bir ürünü değiştirmek için listede <strong>Düzenle</strong>’ye basın. Satıştan kaldırmak için <strong>Pasif yap</strong>’ı kullanın; ürün silinmez.</li>
      </ol>

      <h2>Dosyayla toplu yüklemek</h2>
      <ol>
        <li><strong>Şablonu indirin</strong> (Excel önerilir). <TemplateButtons /></li>
        <li>
          Şablondaki kırmızı yazılı satır yalnızca örnektir (“{EXAMPLE_MARKER}”). <strong>Bu satırı silin</strong> ve
          her paket boyutu için bir satır doldurun. İlk satırdaki sütun başlıklarını değiştirmeyin.
        </li>
        <li>Dosyayı kaydedin (Excel .xlsx veya CSV).</li>
        <li>“Toplu yükleme” sekmesinde dosyayı seçin. Dosya hemen kaydedilmez; önce önizleme açılır.</li>
        <li>
          Önizlemede <strong>Hatalı</strong> satır varsa, her satırın yanında sorunun ne olduğu yazar. Excel’de o satır numarasını
          bulup düzeltin, dosyayı kaydedin ve yeniden seçin. Hatalı satır varken hiçbir ürün aktarılmaz.
        </li>
        <li>
          Barkodu katalogda zaten kayıtlı olan satırlar <strong>Güncellenecek</strong> olarak gösterilir ve eski → yeni
          değerler listelenir. Bunları onaylamak için alttaki onay kutusunu işaretleyin.
        </li>
        <li><strong>İçe aktar</strong>’a basın. Tüm satırlar birlikte kaydedilir; bir sorun olursa hiçbiri kaydedilmez.</li>
        <li>Görselleri yüklemeden sonra katalogda ürünü “Düzenle” ile açarak ekleyin.</li>
      </ol>

      <h2>Sütunlar</h2>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Sütun</th>
              <th>Zorunlu</th>
              <th>Ne yazılmalı?</th>
            </tr>
          </thead>
          <tbody>
            {COLUMNS.map((c) => (
              <tr key={c.key}>
                <td><strong>{c.header}</strong></td>
                <td>{c.required ? 'Evet' : 'Hayır'}</td>
                <td>{c.help}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Sık karşılaşılan hatalar</h2>
      <ul>
        <li><strong>Paket ağırlığı</strong> kilogram değil gram yazılır: 1,5 kg → 1500, 12 kg → 12000.</li>
        <li><strong>Fiyat</strong> kuruşlu yazılacaksa virgül kullanılır: 1249,90. “TL” yazmak gerekmez.</li>
        <li><strong>Marka</strong> yalnızca listedeki beş markadan biri olabilir.</li>
        <li><strong>Barkod / ürün kodu</strong> her ürün için farklı olmalı; dosyada iki satırda aynı kod olamaz.</li>
        <li>Eski Excel biçimi (.xls) kabul edilmez; “Farklı Kaydet → Excel Çalışma Kitabı (.xlsx)” kullanın.</li>
      </ul>
    </article>
  )
}
