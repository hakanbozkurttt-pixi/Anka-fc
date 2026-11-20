import { Redirect } from 'expo-router';

import { useAuth } from '../lib/auth';

// Açılış adresi: oturum varsa hayvan listesine, yoksa giriş ekranına yönlendirir.
export default function Index() {
  const { session, recovering } = useAuth();
  return <Redirect href={session && !recovering ? '/pets' : '/sign-in'} />;
}
