import { redirect } from 'next/navigation';

import { getAdminDashboardAction, getAllUsersAction } from '@/actions/admin';
import { getCurrentUser } from '@/actions/auth';
import { AdminDashboardPanel } from '@/components/admin/AdminDashboardPanel';
import { TEAMS } from '@/constants/teams';
import {
  listAllMatchesForAdmin,
  listClassificationForAdmin,
  listGameRulesForAdmin,
} from '@/services/adminService';

const AdminPage = async () => {
  const userResult = await getCurrentUser();
  if (!userResult.success || !userResult.data) {
    redirect('/login');
  }
  if (userResult.data.role !== 'admin') {
    redirect('/dashboard');
  }

  const [usersRes, statsRes, matches, rules, classification] = await Promise.all([
    getAllUsersAction(),
    getAdminDashboardAction(),
    listAllMatchesForAdmin(),
    listGameRulesForAdmin(),
    listClassificationForAdmin(),
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
    };
  });

  const teams = TEAMS.map((t) => ({ id: t.id, name: t.name }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-emerald-950 sm:text-3xl">
          Panel admin
        </h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Pagos y ABM de reglamento, fixture y clasificación.
        </p>
      </div>

      <AdminDashboardPanel
        users={usersRes.data}
        matchOptions={matchOptions}
        teams={teams}
        stats={statsRes.data}
        rules={rules}
        matches={matches}
        classification={classification}
      />
    </div>
  );
};

export default AdminPage;
