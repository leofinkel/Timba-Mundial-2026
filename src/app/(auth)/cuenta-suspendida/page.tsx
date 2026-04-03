import { redirect } from 'next/navigation';

import { createServerClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/services/authService';

const CuentaSuspendidaPage = async () => {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?cuenta=suspendida');
  }

  const profile = await getUserProfile(user.id);
  if (!profile || profile.accountStatus !== 'banned') {
    redirect('/dashboard');
  }

  await supabase.auth.signOut();
  redirect('/login?cuenta=suspendida');
};

export default CuentaSuspendidaPage;
