import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { cancelAllReminders } from './reminders';
import { supabase } from './supabase';

type AuthState = {
  session: Session | null;
  // Uygulama açılışında kayıtlı oturum okunurken true.
  loading: boolean;
  // Şifre yenileme sırasında true. Yenileme kodu doğrulanınca geçici bir oturum
  // açılır; yeni şifre kaydedilene kadar kullanıcı uygulamaya alınmaz.
  recovering: boolean;
  setRecovering: (value: boolean) => void;
};

const AuthContext = createContext<AuthState>({
  session: null,
  loading: true,
  recovering: false,
  setRecovering: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      // Çıkış yapılınca bu telefondaki hatırlatmalar silinir (başka kişi aynı telefonu kullanabilir).
      if (event === 'SIGNED_OUT') cancelAllReminders();
      setSession(next);
      setLoading(false);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading, recovering, setRecovering }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
