import { redirect } from 'next/navigation';

import { getAdminDashboardAction, getAllUsersAction } from '@/actions/admin';
import { getCurrentUser } from '@/actions/auth';
import { AdminDashboardPanel } from '@/components/admin/AdminDashboardPanel';
import { TEAMS } from '@/constants/teams';
import {
  listAllMatchesForAdmin,
  listClassificationForAdmin,
  listGameRulesForAdmin,
  listSubmittedPredictionsForAdmin,
} from '@/services/adminService';
import { getTournament } from '@/services/fixtureService';
import { listPublicNews } from '@/services/newsService';
import { listRealGroupStandingsGrouped } from '@/services/realGroupStandingsService';

const AdminPage = async () => {
  const userResult = await getCurrentUser();
  if (!userResult.success || !userResult.data) {
    redirect('/login');
  }
  if (userResult.data.role !== 'admin') {
    redirect('/dashboard');
  }

  const [
    usersRes,
    statsRes,
    matches,
    rules,
    classification,
    submittedPredictionUsers,
    tournament,
    news,
    groupStandingOverrides,
  ] = await Promise.all([
    getAllUsersAction(),
    getAdminDashboardAction(),
    listAllMatchesForAdmin(),
    listGameRulesForAdmin(),
    listClassificationForAdmin(),
    listSubmittedPredictionsForAdmin(),
    getTournament(),
    listPublicNews(),
    listRealGroupStandingsGrouped(),
  ]);

  if (!usersRes.success || !usersRes.data) {
    redirect('/dashboard');
  }
  if (!statsRes.success || !statsRes.data) {
    redirect('/dashboard');
  }

  const teamMap = new Map(TEAMS.map((t) => [t.id, t.name]));
  const matchOptions = matches.map((m) => {
    const home = m.home_team_id ? (teamMap.get(m.home_team_id) ?? m.home_team_id) : 'TBD';
    const away = m.away_team_id ? (teamMap.get(m.away_team_id) ?? m.away_team_id) : 'TBD';
    const group = m.group_id ? ` · Grupo ${m.group_id}` : '';
    return {
      id: m.id,
      label: `${home} vs ${away} · ${m.stage}${group}`,
      homeGoals: m.home_goals,
      awayGoals: m.away_goals,
      stage: m.stage,
      homeTeamId: m.home_team_id,
      awayTeamId: m.away_team_id,
      winnerTeamId: m.winner_team_id,
    };
  });

  const teams = TEAMS.map((t) => ({ id: t.id, name: t.name }));

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Panel admin
        </h1>
        <p className="mt-1 text-sm text-zinc-400 sm:text-base">
          Pagos y ABM de reglamento, fixture y clasificación.
        </p>
      </div>

      <AdminDashboardPanel
        users={usersRes.data}
        currentAdminId={userResult.data.id}
        matchOptions={matchOptions}
        teams={teams}
        stats={statsRes.data}
        rules={rules}
        matches={matches}
        classification={classification}
        submittedPredictionUsers={submittedPredictionUsers}
        tournament={tournament}
        news={news}
        groupStandingOverrides={groupStandingOverrides}
      />
    </div>
  );
};

export default AdminPage;
