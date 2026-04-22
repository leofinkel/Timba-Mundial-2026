'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminClassificationTab } from '@/components/admin/AdminClassificationTab';
import { AdminSubmittedPredictionsTab } from '@/components/admin/AdminSubmittedPredictionsTab';
import { AdminFixtureTab } from '@/components/admin/AdminFixtureTab';
import { AdminNewsTab } from '@/components/admin/AdminNewsTab';
import { AdminPaymentsTab } from '@/components/admin/AdminPaymentsTab';
import { AdminResultsTab } from '@/components/admin/AdminResultsTab';
import { AdminRulesTab } from '@/components/admin/AdminRulesTab';
import { AdminStatsTab } from '@/components/admin/AdminStatsTab';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { MatchRow } from '@/repositories/matchRepository';
import type { AdminClassificationEntry, AdminGameRule, AdminSubmittedPredictionUser } from '@/types/admin';
import type { UserProfile } from '@/types/auth';
import type { NewsPost } from '@/types/news';
import type { RealResultsRow } from '@/repositories/realResultsRepository';
import type { GroupName, Tournament } from '@/types/tournament';
import { ChevronDown } from 'lucide-react';

interface TeamOption {
  id: string;
  name: string;
}

interface DashboardStatsPayload {
  totalUsers: number;
  paidUsers: number;
  predictionsSubmitted: number;
  matchesWithResults: number;
}

interface AdminDashboardPanelProps {
  users: UserProfile[];
  /** Logged-in admin; used to disable self-service moderation actions. */
  currentAdminId: string;
  teams: TeamOption[];
  stats: DashboardStatsPayload;
  rules: AdminGameRule[];
  matches: MatchRow[];
  classification: AdminClassificationEntry[];
  submittedPredictionUsers: AdminSubmittedPredictionUser[];
  tournament: Tournament;
  news: NewsPost[];
  groupStandingOverrides: Partial<Record<GroupName, string[]>>;
  initialOfficialResults: RealResultsRow | null;
}

export const AdminDashboardPanel = ({
  users,
  currentAdminId,
  teams,
  stats,
  rules,
  matches,
  classification,
  submittedPredictionUsers,
  tournament,
  news,
  groupStandingOverrides,
  initialOfficialResults,
}: AdminDashboardPanelProps) => {
  const [activeTab, setActiveTab] = useState('payments');
  const isAbmSelected =
    activeTab === 'rules' ||
    activeTab === 'fixture' ||
    activeTab === 'classification' ||
    activeTab === 'planillas';

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid h-auto w-full grid-cols-1 gap-2 border border-zinc-800/80 bg-zinc-900/50 p-2 sm:grid-cols-5">
        <TabsTrigger
          value="payments"
          className="text-zinc-300 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-sm"
        >
          Pagos
        </TabsTrigger>
        <TabsTrigger
          value="results"
          className="text-zinc-300 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-sm"
        >
          Resultados
        </TabsTrigger>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'h-9 justify-between border-zinc-700 bg-zinc-900/70 px-3 font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white',
                isAbmSelected && 'bg-emerald-600 text-white hover:bg-emerald-600/90 hover:text-white',
              )}
            >
              ABM
              <ChevronDown className="ml-2 size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48 border-zinc-800 bg-zinc-950 text-zinc-100">
            <DropdownMenuItem
              className="focus:bg-zinc-800 focus:text-white"
              onSelect={() => setActiveTab('rules')}
            >
              Reglamento
            </DropdownMenuItem>
            <DropdownMenuItem
              className="focus:bg-zinc-800 focus:text-white"
              onSelect={() => setActiveTab('fixture')}
            >
              Fixture
            </DropdownMenuItem>
            <DropdownMenuItem
              className="focus:bg-zinc-800 focus:text-white"
              onSelect={() => setActiveTab('classification')}
            >
              Clasificación
            </DropdownMenuItem>
            <DropdownMenuItem
              className="focus:bg-zinc-800 focus:text-white"
              onSelect={() => setActiveTab('planillas')}
            >
              Planillas (pronósticos)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <TabsTrigger
          value="news"
          className="text-zinc-300 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-sm"
        >
          Noticias
        </TabsTrigger>
        <TabsTrigger
          value="stats"
          className="text-zinc-300 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-sm"
        >
          Estadísticas
        </TabsTrigger>
      </TabsList>
      <TabsContent value="payments" className="mt-6">
        <AdminPaymentsTab users={users} currentAdminId={currentAdminId} />
      </TabsContent>
      <TabsContent value="results" className="mt-6">
        <AdminResultsTab
          teams={teams}
          tournament={tournament}
          groupStandingOverrides={groupStandingOverrides}
          initialOfficialResults={initialOfficialResults}
        />
      </TabsContent>
      <TabsContent value="rules" className="mt-6">
        <AdminRulesTab rules={rules} />
      </TabsContent>
      <TabsContent value="fixture" className="mt-6">
        <AdminFixtureTab matches={matches} teams={teams} />
      </TabsContent>
      <TabsContent value="classification" className="mt-6">
        <AdminClassificationTab classification={classification} users={users} />
      </TabsContent>
      <TabsContent value="planillas" className="mt-6">
        <AdminSubmittedPredictionsTab users={submittedPredictionUsers} tournament={tournament} />
      </TabsContent>
      <TabsContent value="news" className="mt-6">
        <AdminNewsTab news={news} />
      </TabsContent>
      <TabsContent value="stats" className="mt-6">
        <AdminStatsTab
          totalUsers={stats.totalUsers}
          paidUsers={stats.paidUsers}
          predictionsSubmitted={stats.predictionsSubmitted}
          matchesWithResults={stats.matchesWithResults}
        />
      </TabsContent>
    </Tabs>
  );
};
