'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { loginAction } from '@/actions/auth';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { GAME_RULES_BRIEF_LINES } from '@/constants/gameRulesBrief';
import { loginSchema, type LoginSchemaInferred } from '@/lib/validation/schemas';

const SuspendedAccountNotice = () => {
  const searchParams = useSearchParams();
  if (searchParams.get('cuenta') !== 'suspendida') return null;
  return (
    <p
      role="status"
      className="rounded-md border border-amber-500/40 bg-amber-950/40 px-3 py-2 text-sm text-amber-100"
    >
      Tu cuenta fue suspendida. Si creés que es un error, contactá al organizador.
    </p>
  );
};

const LoginPage = () => {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<LoginSchemaInferred>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = (values: LoginSchemaInferred) => {
    setServerError(null);
    const fd = new FormData();
    fd.set('email', values.email);
    fd.set('password', values.password);

    startTransition(async () => {
      const result = await loginAction(fd);
      if (!result.success) {
        setServerError(result.error);
        return;
      }
      router.push('/');
      router.refresh();
    });
  };

  return (
    <>
      <Card className="border-emerald-500/20 bg-zinc-900/80 shadow-xl shadow-emerald-950/20 backdrop-blur-md">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-xl text-white">Iniciar sesión</CardTitle>
          <CardDescription className="text-zinc-400">
            Ingresá con tu email para cargar tus pronósticos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <Suspense fallback={null}>
                <SuspendedAccountNotice />
              </Suspense>
              {serverError ? (
                <p
                  role="alert"
                  className="rounded-md border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-200"
                >
                  {serverError}
                </p>
              ) : null}

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-200">Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        autoComplete="email"
                        placeholder="vos@ejemplo.com"
                        className="border-zinc-700 bg-zinc-950/50 text-white placeholder:text-zinc-500"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-200">Contraseña</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="current-password"
                        placeholder="••••••••"
                        className="border-zinc-700 bg-zinc-950/50 text-white placeholder:text-zinc-500"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full bg-emerald-600 font-semibold text-white hover:bg-emerald-500"
                disabled={isPending}
              >
                {isPending ? 'Entrando…' : 'Entrar'}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 border-t border-zinc-800/80 pt-4">
          <p className="text-center text-sm text-zinc-400">
            ¿No tenés cuenta?{' '}
            <Link
              href="/register"
              className="font-medium text-emerald-400 underline-offset-4 hover:text-emerald-300 hover:underline"
            >
              Registrate
            </Link>
          </p>
        </CardFooter>
      </Card>

      <section
        className="mt-8 rounded-xl border border-emerald-500/15 bg-zinc-900/40 p-4 backdrop-blur-sm sm:p-5"
        aria-labelledby="rules-heading"
      >
        <h2
          id="rules-heading"
          className="text-sm font-semibold uppercase tracking-wide text-emerald-400/90"
        >
          Reglas del juego
        </h2>
        <p className="mt-2 text-xs text-zinc-500">
          Resumen del sistema de puntos (detalle completo en la app).
        </p>
        <ul className="mt-3 list-inside list-disc space-y-2 text-sm leading-relaxed text-zinc-300">
          {GAME_RULES_BRIEF_LINES.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>
    </>
  );
};

export default LoginPage;
