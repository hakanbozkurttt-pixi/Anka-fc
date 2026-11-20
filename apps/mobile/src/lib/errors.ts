// Supabase'den gelen İngilizce hata mesajlarını kullanıcıya gösterilecek
// Türkçe mesajlara çevirir.

type ErrorLike = { message?: string; code?: string; status?: number } | null | undefined;

export function toTurkishError(error: ErrorLike): string {
  const message = error?.message ?? '';
  const code = error?.code ?? '';

  if (code === 'invalid_credentials' || /invalid login credentials/i.test(message))
    return 'E-posta veya şifre hatalı.';
  if (code === 'user_already_exists' || /already registered|already exists/i.test(message))
    return 'Bu e-posta adresiyle zaten bir hesap var. Giriş yapmayı deneyin.';
  if (code === 'weak_password' || /password should be/i.test(message))
    return 'Şifre yeterince güçlü değil. En az 8 karakter kullanın.';
  if (code === 'email_address_invalid' || /email address .* invalid/i.test(message))
    return 'E-posta adresi geçersiz.';
  if (code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit' || /rate limit/i.test(message))
    return 'Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar deneyin.';
  if (code === 'email_not_confirmed' || /email not confirmed/i.test(message))
    return 'E-posta adresiniz henüz doğrulanmadı.';
  if (code === 'otp_expired' || /token has expired or is invalid|otp.*(expired|invalid)/i.test(message))
    return 'Kod hatalı veya süresi dolmuş. Yeni kod isteyebilirsiniz.';
  if (code === 'same_password' || /should be different from the old password/i.test(message))
    return 'Yeni şifre eski şifrenizle aynı olamaz.';
  if (code === 'signup_disabled') return 'Yeni kayıt şu anda kapalı.';
  if (/database error saving new user/i.test(message))
    return 'Kayıt bilgileri kaydedilemedi. Lütfen tüm alanları kontrol edin.';
  if (/network request failed|fetch failed|failed to fetch/i.test(message))
    return 'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.';

  return 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.';
}
