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
import { createServerClient } from '@/lib/supabase/server';
import { getLatestRealResults } from '@/repositories/realResultsRepository';
import { getTournament } from '@/services/fixtureService';
import { listAllNewsForAdmin } from '@/services/newsService';

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
    initialOfficialResults,
  ] = await Promise.all([
    getAllUsersAction(),
    getAdminDashboardAction(),
    listAllMatchesForAdmin(),
    listGameRulesForAdmin(),
    listClassificationForAdmin(),
    listSubmittedPredictionsForAdmin(),
    getTournament(),
    listAllNewsForAdmin(),
    (async () => {
      const supabase = await createServerClient();
      return getLatestRealResults(supabase);
    })(),
  ]);

  if (!usersRes.success || !usersRes.data) {
    redirect('/dashboard');
  }
  if (!statsRes.success || !statsRes.data) {
    redirect('/dashboard');
  }

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
        teams={teams}
        stats={statsRes.data}
        rules={rules}
        matches={matches}
        classification={classification}
        submittedPredictionUsers={submittedPredictionUsers}
        tournament={tournament}
        news={news}
        initialOfficialResults={initialOfficialResults}
      />
    </div>
  );
};

export default AdminPage;
