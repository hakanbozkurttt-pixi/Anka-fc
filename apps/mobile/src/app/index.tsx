import { Redirect } from 'expo-router';

import { useAuth } from '../lib/auth';

// Açılış adresi: oturum varsa hayvan listesine, yoksa giriş ekranına yönlendirir.
export default function Index() {
  const { session } = useAuth();
  return <Redirect href={session ? '/pets' : '/sign-in'} />;
}
