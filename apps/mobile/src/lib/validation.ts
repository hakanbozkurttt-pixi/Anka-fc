// Form doğrulama kuralları. Aynı kurallar veritabanında da (migration dosyası)
// denetlenir; buradaki kontroller yalnızca kullanıcıya erken ve anlaşılır
// hata göstermek içindir.

export const MIN_PASSWORD_LENGTH = 8;

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

export type SignUpInput = {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  email: string;
  password: string;
  passwordRepeat: string;
  kvkkAccepted: boolean;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string) {
  return EMAIL_RE.test(value.trim());
}

export function isValidPhone(value: string) {
  const trimmed = value.trim();
  if (!/^[0-9+() -]+$/.test(trimmed)) return false;
  const digits = trimmed.replace(/[^0-9]/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

export function validateSignUp(input: SignUpInput): FieldErrors<keyof SignUpInput> {
  const errors: FieldErrors<keyof SignUpInput> = {};

  if (!input.firstName.trim()) errors.firstName = 'Ad zorunludur.';
  if (!input.lastName.trim()) errors.lastName = 'Soyad zorunludur.';

  if (!input.phone.trim()) errors.phone = 'Telefon zorunludur.';
  else if (!isValidPhone(input.phone)) errors.phone = 'Geçerli bir telefon numarası girin (en az 10 rakam).';

  if (!input.address.trim()) errors.address = 'Adres zorunludur.';
  else if (input.address.trim().length < 5) errors.address = 'Adres çok kısa.';

  if (!input.email.trim()) errors.email = 'E-posta zorunludur.';
  else if (!isValidEmail(input.email)) errors.email = 'Geçerli bir e-posta adresi girin.';

  Object.assign(errors, validateNewPassword(input.password, input.passwordRepeat));

  if (!input.kvkkAccepted) errors.kvkkAccepted = 'Devam etmek için aydınlatma metnini onaylamanız gerekir.';

  return errors;
}

export function validateNewPassword(password: string, passwordRepeat: string) {
  const errors: { password?: string; passwordRepeat?: string } = {};
  if (password.length < MIN_PASSWORD_LENGTH)
    errors.password = `Şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalıdır.`;
  if (passwordRepeat !== password) errors.passwordRepeat = 'Şifreler eşleşmiyor.';
  return errors;
}

/** E-postayla gelen doğrulama/yenileme kodu: 6 rakam. */
export function isValidOtp(value: string) {
  return /^\d{6}$/.test(value.trim());
}

/**
 * "GG.AA.YYYY" biçimindeki tarihi "YYYY-AA-GG" biçimine çevirir.
 * Geçersizse null döner.
 */
export function parseTurkishDate(value: string): string | null {
  const match = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const [, d, m, y] = match;
  const day = Number(d);
  const month = Number(m);
  const year = Number(y);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** "YYYY-AA-GG" → "GG.AA.YYYY" */
export function formatTurkishDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

/** "4,5" veya "4.5" → 4.5; geçersizse null */
export function parseDecimal(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  return Number(normalized);
}
