import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/actions/auth';
import { MainUserProvider } from '@/components/layout/MainUserProvider';
import { Navbar } from '@/components/layout/Navbar';

const MainLayout = async ({ children }: { children: React.ReactNode }) => {
  const result = await getCurrentUser();
  if (!result.success || !result.data) {
    redirect('/login');
  }

  const user = result.data;

  return (
    <MainUserProvider user={user}>
      <div className="bg-gradient-to-b from-emerald-50/80 via-background to-background min-h-screen">
        <Navbar user={user} />
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </MainUserProvider>
  );
};

export default MainLayout;
