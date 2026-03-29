'use client';

import { Star, Trophy } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
          <div>
            <CardTitle className="text-lg">Pronósticos especiales</CardTitle>
            <CardDescription>Figuras del Mundial 2026</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 pt-6 sm:grid-cols-2">
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
