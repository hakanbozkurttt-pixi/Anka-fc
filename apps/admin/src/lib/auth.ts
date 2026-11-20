import type { Session } from '@supabase/supabase-js'

// Yönetici yetkisi, sunucu tarafında atanan app_metadata.role alanından okunur.
// Bu kontrol yalnızca doğru ekranı göstermek içindir; asıl koruma veritabanındaki
// erişim kurallarıdır (RLS): yönetici olmayan bir hesap başka müşterilerin
// kayıtlarını bu kontrol atlatılsa bile okuyamaz.
export function isAdminSession(session: Session | null): boolean {
  return session?.user.app_metadata?.role === 'admin'
}
