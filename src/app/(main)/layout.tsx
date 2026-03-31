import { getCurrentUser } from '@/actions/auth';
import { MainUserProvider } from '@/components/layout/MainUserProvider';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { PUBLIC_NAV_LINKS } from '@/constants/navigation';
import Link from 'next/link';

const MainLayout = async ({ children }: { children: React.ReactNode }) => {
  const result = await getCurrentUser();
  const user = result.success ? result.data : null;

  return (
    <MainUserProvider user={user}>
      <div
        className={
          user
            ? 'min-h-screen bg-gradient-to-b from-emerald-50/80 via-background to-background'
            : 'dark min-h-screen bg-zinc-950 text-zinc-50'
        }
      >
        {user ? (
          <Navbar user={user} />
        ) : (
          <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur-md">
            <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4 sm:px-6">
              <Link href="/" className="font-bold tracking-tight text-white">
                Timba Mundial 2026
              </Link>
              <div className="ml-auto flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-zinc-300 hover:bg-zinc-800 hover:text-white"
                  asChild
                >
                  <Link href="/login">Iniciar sesión</Link>
                </Button>
                <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-500" asChild>
                  <Link href="/register">Registrarse</Link>
                </Button>
              </div>
              <nav className="ml-4 flex items-center gap-1">
                {PUBLIC_NAV_LINKS.map((link) => (
                  <Button
                    key={link.href}
                    variant="ghost"
                    size="sm"
                    className="text-zinc-300 hover:bg-zinc-800 hover:text-white"
                    asChild
                  >
                    <Link href={link.href}>{link.label}</Link>
                  </Button>
                ))}
              </nav>
            </div>
          </header>
        )}
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </MainUserProvider>
  );
};

export default MainLayout;
