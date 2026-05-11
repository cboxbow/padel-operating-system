import React from 'react';
import {
  LayoutDashboard, Trophy, ClipboardList,
  Shield, ScrollText, ChevronRight,
  Lock
} from 'lucide-react';
import { useAppState } from '../context';
import { useAuth } from '../auth';
import { cn } from '../lib';
import type { AppView } from '../types';

interface NavItem {
  id: AppView;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { id: 'tournaments', label: 'Tournaments', icon: <Trophy size={20} /> },
  { id: 'registrations', label: 'Registrations', icon: <ClipboardList size={20} />, badge: 2 },
  { id: 'audit_logs', label: 'Audit Log', icon: <ScrollText size={20} /> },
  { id: 'overrides', label: 'Overrides', icon: <Shield size={20} /> },
];

const PHASE2_VIEWS: AppView[] = [
  'match_score', 'pool_standings', 'qualified_teams', 'match_schedule',
  'public_pools', 'public_bracket',
];

export function BottomNav() {
  const { currentView, navigate } = useAppState();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-mpl-dark border-t border-mpl-border safe-area-pb">
      <div className="flex items-center justify-around px-2 py-1 max-w-lg mx-auto">
        {NAV_ITEMS.map(item => {
          const isActive = currentView === item.id ||
            (item.id === 'tournaments' && ['tournament_detail', 'seed_editor', 'draw_room', 'pool_draw', 'main_draw', 'team_list', ...PHASE2_VIEWS].includes(currentView));
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={isActive ? 'nav-item-active' : 'nav-item-inactive'}
            >
              <div className="relative">
                {item.icon}
                {item.badge && (
                  <span className="absolute -top-1.5 -right-1.5 bg-mpl-gold text-mpl-black text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ─── Top App Bar ──────────────────────────────────────────────────────────────
interface TopBarProps {
  title: string;
  subtitle?: string;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
}

export function TopBar({ title, subtitle, leftAction, rightAction }: TopBarProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-mpl-dark border-b border-mpl-border">
      {leftAction && <div className="flex-shrink-0">{leftAction}</div>}
      <div className="flex-1 min-w-0">
        <h1 className="font-bold text-white text-base leading-tight truncate">{title}</h1>
        {subtitle && <p className="text-xs text-mpl-gray truncate">{subtitle}</p>}
      </div>
      {rightAction && <div className="flex-shrink-0">{rightAction}</div>}
    </div>
  );
}

// ─── MPL Logo Header ──────────────────────────────────────────────────────────
export function MPLHeader() {
  const { signOut } = useAuth();

  return (
    <div className="flex items-center gap-3 px-4 py-4 border-b border-mpl-border/50">
      <div className="w-10 h-10 rounded-xl bg-gold-gradient flex items-center justify-center flex-shrink-0 shadow-gold-sm">
        <span className="text-mpl-black font-black text-sm">MPL</span>
      </div>
      <div>
        <p className="font-black text-white text-sm tracking-wide">MAURITIUS PADEL LEAGUE</p>
        <p className="text-[10px] text-mpl-gold font-semibold tracking-widest uppercase">Admin Control Center</p>
      </div>
      <div className="ml-auto">
        <button
          onClick={() => void signOut()}
          className="w-8 h-8 rounded-full bg-mpl-card border border-mpl-border flex items-center justify-center hover:border-mpl-gold/40 transition-colors"
          title="Sign out"
        >
          <span className="text-xs font-bold text-mpl-gold">AM</span>
        </button>
      </div>
    </div>
  );
}

// ─── Tournament Card ──────────────────────────────────────────────────────────
import type { Tournament } from '../types';
import {
  getTournamentStatusLabel, tournamentStatusClass, formatDate
} from '../lib';

interface TournamentCardProps {
  tournament: Tournament;
  onClick: () => void;
}

export function TournamentCard({ tournament, onClick }: TournamentCardProps) {
  const statusClass = tournamentStatusClass(tournament.status);
  const isLocked = tournament.status === 'locked' || tournament.status === 'completed';

  return (
    <button
      onClick={onClick}
      className="w-full mpl-card p-4 text-left hover:border-mpl-gold/30 transition-all duration-200 active:scale-[0.99] group"
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-black',
          tournament.category === 'pro' ? 'bg-gold-gradient text-mpl-black' :
          tournament.category === 'open' ? 'bg-mpl-gold/15 text-mpl-gold border border-mpl-gold/30' :
          'bg-mpl-border text-mpl-gray'
        )}>
          {tournament.category === 'pro' ? '★' :
           tournament.category === 'open' ? 'O' :
           tournament.category === 'amateur' ? 'A' :
           tournament.category === 'junior' ? 'J' : 'S'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-white text-sm leading-tight line-clamp-2 group-hover:text-mpl-gold transition-colors">
              {tournament.name}
            </h3>
            {isLocked && <Lock size={12} className="text-red-400 flex-shrink-0 mt-0.5" />}
          </div>
          <p className="text-xs text-mpl-gray mt-1">{formatDate(tournament.startDate)} — {tournament.venue}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={statusClass}>{getTournamentStatusLabel(tournament.status)}</span>
            <span className="text-xs text-mpl-gray">{tournament.validatedTeams}/{tournament.maxTeams} teams</span>
          </div>
        </div>
        <ChevronRight size={16} className="text-mpl-gray group-hover:text-mpl-gold transition-colors flex-shrink-0 mt-1" />
      </div>
    </button>
  );
}

// ─── Team Row ─────────────────────────────────────────────────────────────────
import type { Team } from '../types';

export function TeamRow({ team, action }: { team: Team; action?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-3 px-4 border-b border-mpl-border/50 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-mpl-gold/10 border border-mpl-gold/20 flex items-center justify-center flex-shrink-0">
        {team.seed ? (
          <span className="text-xs font-black text-mpl-gold">#{team.seed}</span>
        ) : (
          <span className="text-xs text-mpl-gray font-bold">{team.clubName[0]}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold text-white truncate">{team.name}</p>
          {team.isSeedLocked && <Lock size={10} className="text-mpl-gold flex-shrink-0" />}
        </div>
        <p className="text-xs text-mpl-gray">{team.clubName} · {team.player1.nationality}</p>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

// ─── Workflow Stepper ─────────────────────────────────────────────────────────
interface Step {
  label: string;
  done: boolean;
  active: boolean;
}

export function WorkflowStepper({ steps }: { steps: Step[] }) {
  return (
    <div className="flex items-center gap-0 overflow-x-auto no-scrollbar py-2">
      {steps.map((step, i) => (
        <React.Fragment key={i}>
          <div className="flex flex-col items-center gap-1 flex-shrink-0 min-w-[64px]">
            <div className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all',
              step.done ? 'bg-mpl-gold border-mpl-gold text-mpl-black' :
              step.active ? 'bg-transparent border-mpl-gold text-mpl-gold animate-pulse-gold' :
              'bg-transparent border-mpl-border text-mpl-gray'
            )}>
              {step.done ? '✓' : i + 1}
            </div>
            <span className={cn('text-[9px] font-semibold text-center uppercase tracking-wide leading-tight max-w-[56px]',
              step.active ? 'text-mpl-gold' : step.done ? 'text-mpl-off-white' : 'text-mpl-gray'
            )}>
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={cn('h-px flex-1 min-w-[12px] mx-1 mb-4', step.done ? 'bg-mpl-gold/50' : 'bg-mpl-border')} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
