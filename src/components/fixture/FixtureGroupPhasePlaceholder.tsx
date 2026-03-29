'use client';

import { ClipboardList } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';

export const FixtureGroupPhasePlaceholder = () => {
  return (
    <Card className="border-emerald-950/10 shadow-md">
      <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="bg-emerald-600/10 text-emerald-700 flex size-14 items-center justify-center rounded-2xl">
          <ClipboardList className="size-7" />
        </div>
        <div>
          <p className="font-semibold text-emerald-900">Fase de grupos</p>
          <p className="text-muted-foreground mt-1 max-w-sm text-sm">
            El editor de partidos de grupos se agregará aquí. Por ahora podés revisar el estado de
            tu predicción arriba.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
