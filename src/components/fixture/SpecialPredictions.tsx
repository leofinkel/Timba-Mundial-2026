'use client';

import { Info, Star, Trophy } from 'lucide-react';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { TRANSFERMARKT_PLAYER_NAMES_REFERENCE_URL } from '@/constants/prediction';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type SpecialPredictionsProps = {
  topScorer: string;
  bestPlayer: string;
  onTopScorerChange: (value: string) => void;
  onBestPlayerChange: (value: string) => void;
  disabled?: boolean;
};

export const SpecialPredictions = ({
  topScorer,
  bestPlayer,
  onTopScorerChange,
  onBestPlayerChange,
  disabled = false,
}: SpecialPredictionsProps) => {
  return (
    <Card className="overflow-hidden border-emerald-500/20 bg-gradient-to-br from-amber-500/5 via-background to-emerald-500/10 shadow-md">
      <CardHeader className="border-b border-border/60 bg-muted/20 pb-4">
        <div className="flex items-center gap-2">
          <Trophy className="size-6 text-amber-500" aria-hidden />
          <CardTitle className="text-lg">Pronósticos especiales</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 pt-6 sm:grid-cols-2">
        <p className="col-span-full flex gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
          <Info
            className="mt-0.5 size-4 shrink-0 text-amber-600/90"
            aria-hidden
          />
          <span>
            El nombre del jugador debe estar escrito exactamente igual a como
            figura en la siguiente web:{' '}
            <a
              href={TRANSFERMARKT_PLAYER_NAMES_REFERENCE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline underline-offset-2 hover:text-primary/90"
            >
              https://www.transfermarkt.com
            </a>
            . Para el puntaje no se distingue entre mayúsculas y minúsculas.
          </span>
        </p>
        <div className="space-y-2">
          <Label
            htmlFor="top-scorer"
            className="flex items-center gap-2 text-sm font-medium"
          >
            <Trophy className="size-4 text-amber-600/80" aria-hidden />
            Goleador del Mundial
          </Label>
          <Input
            id="top-scorer"
            placeholder="Nombre del jugador"
            value={topScorer}
            disabled={disabled}
            onChange={(e) => onTopScorerChange(e.target.value)}
            className="border-border/80 bg-background/80"
          />
        </div>
        <div className="space-y-2">
          <Label
            htmlFor="best-player"
            className="flex items-center gap-2 text-sm font-medium"
          >
            <Star className="size-4 text-emerald-600/80" aria-hidden />
            Figura del Mundial
          </Label>
          <Input
            id="best-player"
            placeholder="Nombre del jugador"
            value={bestPlayer}
            disabled={disabled}
            onChange={(e) => onBestPlayerChange(e.target.value)}
            className="border-border/80 bg-background/80"
          />
        </div>
      </CardContent>
    </Card>
  );
};
