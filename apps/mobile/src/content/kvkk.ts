// KVKK aydınlatma metni.
//
// !!! TASLAK: Aşağıdaki metin yalnızca bölüm başlıklarını içerir (KVKK m.10'da
// sayılan başlıklar). Köşeli parantezli kısımlar hastanenin hukuk danışmanı
// tarafından doldurulmalıdır. Gerçek kullanıcıya açılmadan önce bu metin
// tamamlanmalı ve KVKK_VERSION değiştirilmelidir.
//
// Metin değiştiğinde KVKK_VERSION'ı da değiştirin (ör. "2027-01-v1").
// Yeni sürümü onaylamamış müşterilere uygulama, girişten sonra onay ekranını
// tekrar gösterir. Her onay, sürümüyle birlikte veritabanına kaydedilir.

export const KVKK_VERSION = 'taslak-1';

export const KVKK_TITLE = 'Kişisel Verilerin Korunması Aydınlatma Metni';

export const KVKK_SECTIONS: { heading: string; body: string }[] = [
  {
    heading: 'Taslak uyarısı',
    body: 'Bu metin taslaktır ve hukuki danışman tarafından tamamlanacaktır. Yalnızca geliştirme ve deneme amaçlıdır.',
  },
  {
    heading: '1. Veri sorumlusu',
    body: '[Hastanenin unvanı, adresi ve iletişim bilgileri hukuk danışmanı tarafından eklenecektir.]',
  },
  {
    heading: '2. İşlenen kişisel veriler',
    body: 'Uygulamada şu bilgiler alınmaktadır: ad, soyad, telefon, adres, e-posta ve evcil hayvanınıza ait bilgiler. [Kapsam hukuk danışmanı tarafından doğrulanacaktır.]',
  },
  {
    heading: '3. Kişisel verilerin hangi amaçla işleneceği',
    body: '[Hukuk danışmanı tarafından eklenecektir.]',
  },
  {
    heading: '4. Kişisel verilerin kimlere ve hangi amaçla aktarılabileceği',
    body: '[Hukuk danışmanı tarafından eklenecektir. Yurt dışında bulunan hizmet sağlayıcılara aktarım konusu ayrıca değerlendirilmelidir.]',
  },
  {
    heading: '5. Kişisel veri toplamanın yöntemi ve hukuki sebebi',
    body: '[Hukuk danışmanı tarafından eklenecektir.]',
  },
  {
    heading: '6. İlgili kişinin hakları (KVKK m.11)',
    body: '[Haklar ve başvuru yöntemi hukuk danışmanı tarafından eklenecektir.]',
  },
];
