'use client';

import { useEffect, useState } from 'react';
import { Loader2, Lock } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PREDICTION_DEADLINE } from '@/constants/tournament';
import type { PredictionStatus } from '@/types/prediction';

type FixtureHeaderProps = {
  status: PredictionStatus;
  deadlineIso?: string;
  isLocked: boolean;
  lockWarning?: string | null;
  onSave: () => void | Promise<void>;
  isSaving: boolean;
  saveDisabled?: boolean;
  errorMessage?: string | null;
};

const statusLabel: Record<PredictionStatus, string> = {
  draft: 'Borrador',
  submitted: 'Guardado',
  locked: 'Bloqueado',
};

const statusVariant: Record<
  PredictionStatus,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  draft: 'secondary',
  submitted: 'default',
  locked: 'outline',
};

const formatRemaining = (ms: number): string => {
  if (ms <= 0) return 'Plazo finalizado';
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

export const FixtureHeader = ({
  status,
  deadlineIso = PREDICTION_DEADLINE,
  isLocked,
  lockWarning,
  onSave,
  isSaving,
  saveDisabled = false,
  errorMessage,
}: FixtureHeaderProps) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const deadlineMs = new Date(deadlineIso).getTime();
  const remainingMs = deadlineMs - now;

  return (
    <header className="sticky top-0 z-10 border-b border-border/80 bg-background/95 px-4 py-4 shadow-sm backdrop-blur-md sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Fixture & pronósticos</h1>
            <Badge variant={statusVariant[status]}>{statusLabel[status]}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Cierre de pronósticos:{' '}
            <time dateTime={deadlineIso} className="font-medium text-foreground">
              {new Date(deadlineIso).toLocaleString('es-AR', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </time>
          </p>
          <p
            className="text-sm tabular-nums text-emerald-800 dark:text-emerald-300"
            aria-live="polite"
          >
            {formatRemaining(remainingMs)}
          </p>
          {isLocked && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
              <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                {lockWarning ??
                  'Tu planilla está bloqueada: no podés editar ni volver a guardar.'}
              </span>
            </div>
          )}
          {errorMessage ? (
            <p className="text-sm text-destructive" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            type="button"
            size="lg"
            className="w-full bg-emerald-600 hover:bg-emerald-700 sm:w-auto"
            disabled={isLocked || saveDisabled || isSaving}
            onClick={() => void onSave()}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                Guardando…
              </>
            ) : (
              'Guardar pronósticos'
            )}
          </Button>
        </div>
      </div>
    </header>
  );
};
