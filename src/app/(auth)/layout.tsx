import Link from 'next/link';

type AuthLayoutProps = {
  children: React.ReactNode;
};

const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <div className="dark relative min-h-screen overflow-hidden bg-zinc-950 text-zinc-50">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(16,185,129,0.35),transparent)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-teal-400/15 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.15)_1px,transparent_1px)] [background-size:48px_48px]"
        aria-hidden
      />

      <div className="relative z-10 flex min-h-screen flex-col px-4 py-10 sm:px-6 sm:py-14">
        <header className="mx-auto mb-8 w-full max-w-md text-center sm:mb-10">
          <Link
            href="/"
            className="inline-flex flex-col items-center gap-1 transition-opacity hover:opacity-90"
          >
            <span className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Timba Mundial 2026
            </span>
          </Link>
        </header>

        <main className="mx-auto flex w-full max-w-md flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
};

export default AuthLayout;
