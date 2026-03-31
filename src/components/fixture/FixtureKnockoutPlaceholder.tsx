'use client';

import { Trophy } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';

export const FixtureKnockoutPlaceholder = () => {
  return (
    <Card className="border-zinc-800/80 bg-zinc-900/50 shadow-md backdrop-blur-sm">
      <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
          <Trophy className="size-7" />
        </div>
        <div>
          <p className="font-semibold text-emerald-200">Eliminatorias</p>
          <p className="mt-1 max-w-sm text-sm text-zinc-400">
            Próximamente: bracket y marcadores de fases finales. Los datos ya se cargan desde el
            servidor.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
