'use client';

import { AdminFixtureResultTabs } from '@/components/admin/AdminFixtureResultTabs';
import { AdminResetOfficialResultsButton } from '@/components/admin/AdminResetOfficialResultsButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { RealResultsRow } from '@/repositories/realResultsRepository';
import type { Tournament } from '@/types/tournament';

interface AdminResultsTabProps {
  tournament: Tournament;
  initialOfficialResults: RealResultsRow | null;
}

export const AdminResultsTab = ({
  tournament,
  initialOfficialResults,
}: AdminResultsTabProps) => {
  return (
    <div className="space-y-6">
      <Card className="border-zinc-800/80 bg-zinc-900/30 shadow-md backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg text-white">Carga de resultados oficiales</CardTitle>
          <CardDescription className="text-zinc-400">
            Misma grilla que el fixture de predicciones: fase de grupos, eliminatorias y
            especiales. Al guardar partidos, se recalculan los puntos contra las planillas
            guardadas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <AdminResetOfficialResultsButton />
          <AdminFixtureResultTabs
            tournament={tournament}
            initialOfficialResults={initialOfficialResults}
          />
        </CardContent>
      </Card>
    </div>
  );
};
