import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FINAL_AWARDS_POINTS,
  GROUP_STAGE_RULES,
  KNOCKOUT_CLASSIFICATION_POINTS,
  PRIZE_DISTRIBUTION,
  SAVE_CONDITIONS,
} from '@/constants/gameRulesFull';

export const generateMetadata = async (): Promise<Metadata> => {
  return {
    title: 'Reglas del Juego',
    description: 'Reglamento completo de Timba Mundial 2026.',
  };
};

const RulesPage = () => {
  return (
    <div className="dark min-h-screen bg-zinc-950 text-zinc-50">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_95%_65%_at_50%_-10%,rgba(16,185,129,0.24),transparent)]" />
      <main className="relative z-10 mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-8 flex items-start justify-between gap-3">
          <div>
            <Badge className="border-transparent bg-emerald-600/90 text-white">Timba Mundial 2026</Badge>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Reglas del Juego
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-400 sm:text-base">Reglamento completo</p>
          </div>
          <Button variant="outline" className="border-zinc-700 bg-zinc-900/50 text-zinc-100" asChild>
            <Link href="/">Volver al inicio</Link>
          </Button>
        </div>

        <section className="grid gap-4 sm:grid-cols-2">
          <Card className="border-zinc-800 bg-zinc-900/70">
            <CardHeader>
              <CardTitle className="text-base text-white">Fase de Grupos</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-zinc-300">
                {GROUP_STAGE_RULES.map((rule) => (
                  <li key={rule} className="rounded-md border border-zinc-800 bg-zinc-950/40 px-3 py-2">
                    {rule}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/70">
            <CardHeader>
              <CardTitle className="text-base text-white">Condiciones de Guardado</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-zinc-300">
                {SAVE_CONDITIONS.map((rule) => (
                  <li key={rule} className="rounded-md border border-zinc-800 bg-zinc-950/40 px-3 py-2">
                    {rule}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>

        <section className="mt-4 grid gap-4 sm:grid-cols-2">
          <Card className="border-zinc-800 bg-zinc-900/70">
            <CardHeader>
              <CardTitle className="text-base text-white">
                Eliminatorias (acierto por equipo clasificado)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-zinc-300">
                {KNOCKOUT_CLASSIFICATION_POINTS.map((item) => (
                  <li
                    key={item.stage}
                    className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950/40 px-3 py-2"
                  >
                    <span>{item.stage}</span>
                    <Badge className="border-transparent bg-emerald-600 text-white">
                      {item.points} pts
                    </Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/70">
            <CardHeader>
              <CardTitle className="text-base text-white">Cuadro de Honor</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-zinc-300">
                {FINAL_AWARDS_POINTS.map((item) => (
                  <li
                    key={item.category}
                    className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950/40 px-3 py-2"
                  >
                    <span>{item.category}</span>
                    <Badge className="border-transparent bg-teal-600 text-white">{item.points} pts</Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>

        <section className="mt-4">
          <Card className="border-zinc-800 bg-zinc-900/70">
            <CardHeader>
              <CardTitle className="text-base text-white">Estructura de Premios</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-2 text-sm text-zinc-300 sm:grid-cols-3">
                {PRIZE_DISTRIBUTION.map((item) => (
                  <li
                    key={item.position}
                    className="rounded-md border border-zinc-800 bg-zinc-950/40 px-3 py-3"
                  >
                    <p className="text-xs uppercase tracking-wide text-zinc-500">{item.position}</p>
                    <p className="mt-1 text-lg font-semibold text-white">{item.percent}</p>
                    <p className="text-xs text-zinc-500">del pozo acumulado</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
};

export default RulesPage;
