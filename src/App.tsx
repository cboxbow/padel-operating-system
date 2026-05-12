import { ToastProvider, AppStateProvider, TournamentDataProvider, useAppState } from './context';
import { AuthProvider, useAuth } from './auth';
import { BottomNav } from './components/Navigation';
import { ToastContainer } from './components/UI';
import { DashboardPage } from './pages/DashboardPage';
import { TournamentsPage } from './pages/TournamentsPage';
import { TournamentDetailPage } from './pages/TournamentDetailPage';
import { RegistrationsPage } from './pages/RegistrationsPage';
import { TeamListPage, SeedEditorPage } from './pages/TeamSeedPages';
import { DrawRoomPage, PoolDrawPage } from './pages/DrawRoomPage';
import { MainDrawPage } from './pages/MainDrawPage';
import { AuditLogsPage, OverridesPage } from './pages/AuditPages';
import { MatchScorePage } from './pages/MatchScorePage';
import { PoolStandingsPage } from './pages/PoolStandingsPage';
import { QualifiedTeamsPage } from './pages/QualifiedTeamsPage';
import { MatchSchedulePage } from './pages/MatchSchedulePage';
import { PublicPoolsPage, PublicBracketPage } from './pages/PublicViewsPage';
import { OBSMainDrawPage, OBSPoolsPage } from './pages/OBSViewsPage';
import { LoginPage } from './pages/LoginPage';

function AppContent() {
  const { currentView } = useAppState();
  const isOBSView = currentView === 'obs_main_draw' || currentView === 'obs_pools';

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':        return <DashboardPage />;
      case 'tournaments':      return <TournamentsPage />;
      case 'tournament_detail':return <TournamentDetailPage />;
      case 'registrations':    return <RegistrationsPage />;
      case 'team_list':        return <TeamListPage />;
      case 'seed_editor':      return <SeedEditorPage />;
      case 'draw_room':        return <DrawRoomPage />;
      case 'pool_draw':        return <PoolDrawPage />;
      case 'main_draw':        return <MainDrawPage />;
      case 'audit_logs':       return <AuditLogsPage />;
      case 'overrides':        return <OverridesPage />;
      // Phase 2
      case 'match_score':      return <MatchScorePage />;
      case 'pool_standings':   return <PoolStandingsPage />;
      case 'qualified_teams':  return <QualifiedTeamsPage />;
      case 'match_schedule':   return <MatchSchedulePage />;
      case 'public_pools':     return <PublicPoolsPage />;
      case 'public_bracket':   return <PublicBracketPage />;
      case 'obs_main_draw':    return <OBSMainDrawPage />;
      case 'obs_pools':        return <OBSPoolsPage />;
      default:                 return <DashboardPage />;
    }
  };

  return (
    <div className={`flex flex-col h-full bg-mpl-black mx-auto relative overflow-hidden ${isOBSView ? 'max-w-none' : 'max-w-lg'}`}>
      <div className="absolute top-0 left-0 right-0 h-px bg-gold-gradient opacity-60 z-50" />
      <div className="flex-1 flex flex-col overflow-hidden">
        {renderView()}
      </div>
      {!isOBSView && <BottomNav />}
      {!isOBSView && <ToastContainer />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppGate />
      </ToastProvider>
    </AuthProvider>
  );
}

function AppGate() {
  const { session, profile, profileError, isLoading, signOut } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-mpl-black flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-mpl-border border-t-mpl-gold animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <LoginPage />;
  }

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return (
      <div className="min-h-screen bg-mpl-black flex items-center justify-center px-5">
        <div className="w-full max-w-sm mpl-card p-5 space-y-4">
          <div>
            <p className="text-white font-black text-sm tracking-wide">Admin access blocked</p>
            <p className="text-xs text-mpl-gray mt-1">
              {profileError || `Role actuel: ${profile?.role ?? 'aucun profil'}. Il faut admin ou super_admin.`}
            </p>
          </div>
          <div className="rounded-lg border border-mpl-gold/30 bg-mpl-gold/10 px-3 py-2 text-xs text-mpl-gold">
            Cree ou mets a jour le profil Supabase de ce compte avec le role super_admin, puis reconnecte-toi.
          </div>
          <button className="btn-gold w-full" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <AppStateProvider>
      <TournamentDataProvider>
        <AppContent />
      </TournamentDataProvider>
    </AppStateProvider>
  );
}
