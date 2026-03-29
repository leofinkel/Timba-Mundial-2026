import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { GAME_RULES_BRIEF_LINES } from '@/constants/gameRulesBrief';
import { PUBLIC_NAV_LINKS } from '@/constants/navigation';

const HomePage = async () => {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="dark min-h-screen bg-zinc-950 text-zinc-50">
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_100%_60%_at_50%_-10%,rgba(16,185,129,0.28),transparent)]"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed -left-40 top-1/3 h-[28rem] w-[28rem] rounded-full bg-emerald-500/15 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed -right-32 bottom-1/4 h-72 w-72 rounded-full bg-teal-400/10 blur-3xl"
        aria-hidden
      />

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur-md">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-white sm:text-xl">
                Timba Mundial 2026
              </span>
            </div>
            <nav className="order-3 flex w-full items-center gap-2 sm:order-2 sm:w-auto sm:gap-3">
              {PUBLIC_NAV_LINKS.map((link) => (
                <Button
                  key={link.href}
                  variant="ghost"
                  className="h-8 px-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white sm:h-9 sm:px-3 sm:text-sm"
                  asChild
                >
                  <Link href={link.href}>{link.label}</Link>
                </Button>
              ))}
            </nav>
            <div className="flex shrink-0 gap-2 sm:gap-3">
              <Button
                variant="ghost"
                className="text-zinc-300 hover:bg-zinc-800 hover:text-white"
                asChild
              >
                <Link href="/login">Iniciar Sesión</Link>
              </Button>
              <Button
                className="bg-emerald-600 font-semibold text-white hover:bg-emerald-500"
                asChild
              >
                <Link href="/register">Registrarse</Link>
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-12 sm:px-6 sm:py-16">
          <section className="flex flex-1 flex-col items-center text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-emerald-400/90">
              FIFA World Cup 2026
            </p>
            <h1 className="max-w-2xl text-balance text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl md:text-5xl">
              Timba Mundial 2026
            </h1>
            <p className="mt-4 max-w-xl text-pretty text-base text-zinc-400 sm:text-lg">
              Predecí resultados, competí con tu grupo y seguí el ranking en vivo. Simple, mobile-first
              y pensado para el mundial de 48 equipos.
            </p>
            <div className="mt-8 flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
              <Button
                size="lg"
                className="h-12 w-full bg-emerald-600 text-base font-semibold text-white hover:bg-emerald-500 sm:w-auto sm:min-w-[180px]"
                asChild
              >
                <Link href="/register">Empezá ahora</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 w-full border-zinc-600 bg-zinc-900/50 text-base text-zinc-100 hover:bg-zinc-800 sm:w-auto sm:min-w-[180px]"
                asChild
              >
                <Link href="/login">Ya tengo cuenta</Link>
              </Button>
            </div>
          </section>

          <section
            className="mt-16 rounded-2xl border border-emerald-500/15 bg-zinc-900/50 p-6 backdrop-blur-sm sm:mt-20 sm:p-8"
            aria-labelledby="landing-rules"
          >
            <h2 id="landing-rules" className="text-lg font-semibold text-white">
              Cómo se suman los puntos
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              El reglamento completo está en el brief del juego; acá va lo esencial.
            </p>
            <ul className="mt-5 grid gap-3 text-left text-sm text-zinc-300 sm:grid-cols-2 sm:gap-4">
              {GAME_RULES_BRIEF_LINES.map((line) => (
                <li
                  key={line}
                  className="flex gap-2 rounded-lg border border-zinc-800/80 bg-zinc-950/40 p-3"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </section>
        </main>

        <footer className="border-t border-zinc-800/80 bg-zinc-950/80 py-8 text-center text-sm text-zinc-500">
          <p className="font-medium text-zinc-400">Mundial FIFA 2026 · Canadá, México y Estados Unidos</p>
          <p className="mt-2 max-w-lg mx-auto px-4">
            Timba privada entre amigos: registro con email, predicciones y ranking automático según
            resultados oficiales.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default HomePage;
