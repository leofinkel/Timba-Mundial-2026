'use client';

import { useEffect, useState } from 'react';

import { getAdminUserPredictionAction } from '@/actions/admin';
import { getOtherUserPredictionForViewerAction } from '@/actions/predictions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { OtherUserPredictionsView } from '@/components/rankings/OtherUserPredictionsView';
import type { UserPredictionView } from '@/types/prediction';
import type { Tournament } from '@/types/tournament';

type PredictionFetchSource = 'ranking' | 'admin';

interface OtherUserPredictionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUserId: string | null;
  targetDisplayName: string;
  tournament: Tournament;
  /** Admin ve pronósticos sin restricción de fecha ni de pago del visitante. */
  fetchSource?: PredictionFetchSource;
}

export const OtherUserPredictionsDialog = ({
  open,
  onOpenChange,
  targetUserId,
  targetDisplayName,
  tournament,
  fetchSource = 'ranking',
}: OtherUserPredictionsDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<UserPredictionView | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !targetUserId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setPrediction(undefined);

    const fetchAction =
      fetchSource === 'admin'
        ? getAdminUserPredictionAction
        : getOtherUserPredictionForViewerAction;

    void fetchAction(targetUserId).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (res.success) {
        setPrediction(res.data);
      } else {
        setError(res.error);
        setPrediction(null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [open, targetUserId, fetchSource]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="max-h-[85vh] overflow-y-auto border-zinc-800/80 bg-zinc-950 text-zinc-50 sm:max-w-3xl"
      >
        <DialogHeader>
          <DialogTitle className="text-white">Pronósticos de {targetDisplayName}</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Vista de solo lectura. Los marcadores reflejan lo que cargó este jugador.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-zinc-400">Cargando…</p>
        ) : error ? (
          <p className="text-sm text-amber-200/90">{error}</p>
        ) : (
          <OtherUserPredictionsView
            displayName={targetDisplayName}
            prediction={prediction ?? null}
            tournament={tournament}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
