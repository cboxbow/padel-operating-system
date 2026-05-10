import { ToastProvider, AppStateProvider, TournamentDataProvider, useAppState } from './context';
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

function AppContent() {
  const { currentView } = useAppState();

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
      default:                 return <DashboardPage />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-mpl-black max-w-lg mx-auto relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gold-gradient opacity-60 z-50" />
      <div className="flex-1 flex flex-col overflow-hidden">
        {renderView()}
      </div>
      <BottomNav />
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppStateProvider>
        <TournamentDataProvider>
          <AppContent />
        </TournamentDataProvider>
      </AppStateProvider>
    </ToastProvider>
  );
}
