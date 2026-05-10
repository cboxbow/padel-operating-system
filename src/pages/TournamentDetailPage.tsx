import {
  Users, ClipboardList, Star, GitBranch, Trophy,
  Lock, ChevronRight, Edit3, TrendingUp, CheckCircle, Clock, Globe
} from 'lucide-react';
import { useAppState } from '../context';
import {
  TopBar, WorkflowStepper
} from '../components/Navigation';
import { BackButton, GoldDivider, StatCard } from '../components/UI';
import { tournamentStatusClass, getTournamentStatusLabel, formatDate } from '../lib';
import type { TournamentStatus } from '../types';
import { cn } from '../lib';

const WORKFLOW_STEPS: { label: string; statuses: TournamentStatus[] }[] = [
  { label: 'Reg. Open', statuses: ['registration_open'] },
  { label: 'Reg. Closed', statuses: ['registration_closed'] },
  { label: 'Seeds', statuses: ['draw_preparation'] },
  { label: 'Pool Draw', statuses: ['pool_draw_ready'] },
  { label: 'Pools Live', statuses: ['pool_published'] },
  { label: 'Matches', statuses: ['matches_ongoing'] },
  { label: 'Main Draw', statuses: ['main_draw_ready', 'main_draw_published'] },
  { label: 'Locked', statuses: ['locked', 'completed'] },
];

const STATUS_ORDER: TournamentStatus[] = [
  'registration_open', 'registration_closed', 'draw_preparation',
  'pool_draw_ready', 'pool_published', 'matches_ongoing',
  'main_draw_ready', 'main_draw_published', 'locked', 'completed',
];

function getStepState(status: TournamentStatus, stepStatuses: TournamentStatus[]) {
  const currentIdx = STATUS_ORDER.indexOf(status);
  const stepIdx = STATUS_ORDER.findIndex(s => stepStatuses.includes(s));
  if (currentIdx > stepIdx) return { done: true, active: false };
  if (stepStatuses.includes(status)) return { done: false, active: true };
  return { done: false, active: false };
}

interface AdminAction {
  label: string;
  icon: React.ReactNode;
  view: string;
  color: string;
  description: string;
  enabled: boolean;
}

export function TournamentDetailPage() {
  const { selectedTournament, navigate } = useAppState();

  if (!selectedTournament) return null;
  const t = selectedTournament;

  const steps = WORKFLOW_STEPS.map(s => ({
    label: s.label,
    ...getStepState(t.status, s.statuses),
  }));

  const actions: AdminAction[] = [
    {
      label: 'Registrations',
      icon: <ClipboardList size={18} />,
      view: 'registrations',
      color: 'text-orange-400',
      description: 'Validate / reject team registrations',
      enabled: true,
    },
    {
      label: 'Team List',
      icon: <Users size={18} />,
      view: 'team_list',
      color: 'text-blue-400',
      description: 'View & manage final validated teams',
      enabled: t.validatedTeams > 0,
    },
    {
      label: 'Seed Editor',
      icon: <Star size={18} />,
      view: 'seed_editor',
      color: 'text-mpl-gold',
      description: 'Assign and lock team seeds',
      enabled: t.validatedTeams > 0,
    },
    {
      label: 'Draw Room',
      icon: <GitBranch size={18} />,
      view: 'draw_room',
      color: 'text-green-400',
      description: 'Pool draw, main draw, publish & lock',
      enabled: t.validatedTeams >= 2,
    },
    {
      label: 'Pool Draw',
      icon: <Edit3 size={18} />,
      view: 'pool_draw',
      color: 'text-purple-400',
      description: 'Manage pool slots and publish pools',
      enabled: t.status !== 'draft',
    },
    {
      label: 'Main Draw',
      icon: <Trophy size={18} />,
      view: 'main_draw',
      color: 'text-red-400',
      description: 'Bracket placement, BYEs, publish & lock',
      enabled: ['pool_published', 'matches_ongoing', 'main_draw_ready', 'main_draw_published', 'locked', 'completed'].includes(t.status),
    },
    {
      label: 'Match Scores',
      icon: <Edit3 size={18} />,
      view: 'match_score',
      color: 'text-yellow-400',
      description: 'Enter & correct set-by-set match scores',
      enabled: ['pool_published', 'matches_ongoing', 'main_draw_ready', 'main_draw_published'].includes(t.status),
    },
    {
      label: 'Pool Standings',
      icon: <TrendingUp size={18} />,
      view: 'pool_standings',
      color: 'text-cyan-400',
      description: 'Live standings with admin override option',
      enabled: t.validatedTeams > 0,
    },
    {
      label: 'Qualified Teams',
      icon: <CheckCircle size={18} />,
      view: 'qualified_teams',
      color: 'text-green-400',
      description: 'Confirm teams advancing to Main Draw',
      enabled: ['pool_published', 'matches_ongoing', 'main_draw_ready', 'main_draw_published'].includes(t.status),
    },
    {
      label: 'Match Schedule',
      icon: <Clock size={18} />,
      view: 'match_schedule',
      color: 'text-indigo-400',
      description: 'Assign courts & time slots to matches',
      enabled: t.status !== 'draft',
    },
    {
      label: 'Public View',
      icon: <Globe size={18} />,
      view: 'public_bracket',
      color: 'text-emerald-400',
      description: 'Player-facing pool draw & bracket view',
      enabled: ['pool_published', 'matches_ongoing', 'main_draw_ready', 'main_draw_published', 'locked', 'completed'].includes(t.status),
    },
  ];

  const isLocked = t.status === 'locked' || t.status === 'completed';

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title={t.name}
        subtitle={getTournamentStatusLabel(t.status)}
        leftAction={<BackButton onClick={() => navigate('tournaments')} />}
        rightAction={
          isLocked ? <Lock size={16} className="text-red-400" /> :
          <span className={tournamentStatusClass(t.status)}>{getTournamentStatusLabel(t.status)}</span>
        }
      />
      <div className="flex-1 overflow-y-auto">
        <div className="pb-24">
          {/* Tournament Meta */}
          <div className="px-4 pt-4 space-y-3">
            <div className="mpl-card p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-mpl-gray">Venue</span>
                <span className="text-white font-medium text-right max-w-[60%]">{t.venue}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-mpl-gray">Date</span>
                <span className="text-white font-medium">{formatDate(t.startDate)} → {formatDate(t.endDate)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-mpl-gray">Format</span>
                <span className="text-white font-medium capitalize">{t.eventType.replace('_', ' ')} · {t.category}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-mpl-gray">Capacity</span>
                <span className="text-white font-medium">{t.maxTeams} teams max</span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              <StatCard label="Registered" value={t.registeredTeams} />
              <StatCard label="Validated" value={t.validatedTeams} color="text-green-400" />
              <StatCard label="Max Teams" value={t.maxTeams} color="text-mpl-gray" />
            </div>
          </div>

          <GoldDivider />

          {/* Workflow progress */}
          <div className="px-4">
            <p className="section-title">Tournament Workflow</p>
            <div className="mpl-card p-4 overflow-x-auto">
              <WorkflowStepper steps={steps} />
            </div>
          </div>

          <GoldDivider />

          {/* Admin Module Actions */}
          <div className="px-4">
            <p className="section-title">Admin Modules</p>
            <div className="space-y-2">
              {actions.map(action => (
                <button
                  key={action.view}
                  onClick={() => action.enabled ? navigate(action.view as any, t.id) : undefined}
                  disabled={!action.enabled}
                  className={cn(
                    'w-full mpl-card p-4 flex items-center gap-4 text-left transition-all duration-200',
                    action.enabled
                      ? 'hover:border-mpl-gold/30 active:scale-[0.99] cursor-pointer'
                      : 'opacity-40 cursor-not-allowed'
                  )}
                >
                  <div className={cn('w-10 h-10 rounded-xl bg-mpl-border flex items-center justify-center flex-shrink-0', action.color)}>
                    {action.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-white text-sm">{action.label}</p>
                    <p className="text-xs text-mpl-gray mt-0.5">{action.description}</p>
                  </div>
                  {action.enabled && <ChevronRight size={16} className="text-mpl-gray flex-shrink-0" />}
                  {!action.enabled && <span className="text-[10px] text-mpl-gray border border-mpl-border rounded px-1.5 py-0.5">N/A</span>}
                </button>
              ))}
            </div>
          </div>

          {isLocked && (
            <div className="mx-4 mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-3">
              <Lock size={16} className="text-red-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-400">Draw Locked</p>
                <p className="text-xs text-mpl-gray mt-0.5">This tournament's draw is locked and cannot be modified. Contact a super admin to unlock.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
