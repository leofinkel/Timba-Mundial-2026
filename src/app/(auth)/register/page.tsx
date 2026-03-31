'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { registerAction } from '@/actions/auth';
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
import { registerSchema } from '@/lib/validation/schemas';

type RegisterFormValues = z.infer<typeof registerSchema>;

const RegisterPage = () => {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = (values: RegisterFormValues) => {
    setServerError(null);
    const fd = new FormData();
    fd.set('firstName', values.firstName);
    fd.set('lastName', values.lastName);
    fd.set('email', values.email);
    fd.set('password', values.password);
    fd.set('confirmPassword', values.confirmPassword);

    startTransition(async () => {
      const result = await registerAction(fd);
      if (!result.success) {
        setServerError(result.error);
        return;
      }
      toast.success('Registro exitoso', {
        description: 'Tu cuenta fue creada correctamente.',
      });
      router.push('/dashboard');
      router.refresh();
    });
  };

  return (
    <Card className="border-emerald-500/20 bg-zinc-900/80 shadow-xl shadow-emerald-950/20 backdrop-blur-md">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-xl text-white">Crear cuenta</CardTitle>
        <CardDescription className="text-zinc-400">
          Unite al prode del Mundial 2026 con tus amigos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-zinc-200">Nombre</FormLabel>
                  <FormControl>
                    <Input
                      autoComplete="given-name"
                      placeholder="Tu nombre"
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
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-zinc-200">Apellido</FormLabel>
                  <FormControl>
                    <Input
                      autoComplete="family-name"
                      placeholder="Tu apellido"
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
                      autoComplete="new-password"
                      placeholder="Mínimo 6 caracteres"
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
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-zinc-200">Confirmar contraseña</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      placeholder="Repetí la contraseña"
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
              {isPending ? 'Registrando…' : 'Registrarse'}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex flex-col gap-2 border-t border-zinc-800/80 pt-4">
        <p className="text-center text-sm text-zinc-400">
          ¿Ya tenés cuenta?{' '}
          <Link
            href="/login"
            className="font-medium text-emerald-400 underline-offset-4 hover:text-emerald-300 hover:underline"
          >
            Iniciar sesión
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
};

export default RegisterPage;
