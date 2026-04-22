'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminFixtureResultTabs } from '@/components/admin/AdminFixtureResultTabs';
import type { RealResultsRow } from '@/repositories/realResultsRepository';
import type { GroupName, Tournament } from '@/types/tournament';

interface TeamOption {
  id: string;
  name: string;
}

interface AdminResultsTabProps {
  teams: TeamOption[];
  tournament: Tournament;
  groupStandingOverrides: Partial<Record<GroupName, string[]>>;
  initialOfficialResults: RealResultsRow | null;
}

export const AdminResultsTab = ({
  teams,
  tournament,
  groupStandingOverrides,
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
        <CardContent>
          <AdminFixtureResultTabs
            tournament={tournament}
            groupStandingOverrides={groupStandingOverrides}
            teams={teams}
            initialOfficialResults={initialOfficialResults}
          />
        </CardContent>
      </Card>
    </div>
  );
};
