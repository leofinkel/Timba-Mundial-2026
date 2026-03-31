'use client';

import { ClipboardList } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';

export const FixtureGroupPhasePlaceholder = () => {
  return (
    <Card className="border-zinc-800/80 bg-zinc-900/50 shadow-md backdrop-blur-sm">
      <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
          <ClipboardList className="size-7" />
        </div>
        <div>
          <p className="font-semibold text-emerald-200">Fase de grupos</p>
          <p className="mt-1 max-w-sm text-sm text-zinc-400">
            El editor de partidos de grupos se agregará aquí. Por ahora podés revisar el estado de
            tu predicción arriba.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
