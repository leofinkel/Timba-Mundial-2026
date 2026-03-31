import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/actions/auth';
import { ProfileForm } from '@/components/profile/ProfileForm';

export const metadata = {
  title: 'Mi perfil — Timba Mundial 2026',
};

const ProfilePage = async () => {
  const result = await getCurrentUser();
  const user = result.success ? result.data : null;

  if (!user) {
    redirect('/login');
  }

  return <ProfileForm user={user} />;
};

export default ProfilePage;
