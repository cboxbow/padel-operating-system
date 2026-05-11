import {
  Users, ClipboardList, Star, GitBranch, Trophy,
  Lock, ChevronRight, Edit3, TrendingUp, CheckCircle, Clock, Globe, Play
} from 'lucide-react';
import { useAppState, useToast, useTournamentData } from '../context';
import {
  TopBar, WorkflowStepper
} from '../components/Navigation';
import { BackButton, GoldDivider, StatCard } from '../components/UI';
import { tournamentStatusClass, getTournamentStatusLabel, formatDate } from '../lib';
import type { CompetitionMode, TournamentStatus } from '../types';
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
  const { selectedTournament, navigate, setTournamentMode, setTournamentStatus } = useAppState();
  const { registrations, pools, matches, generatePools, generatePoolMatches } = useTournamentData();
  const { addToast } = useToast();

  if (!selectedTournament) return null;
  const t = selectedTournament;
  const tournamentRegistrations = registrations.filter(r => r.tournamentId === t.id);
  const validatedTeams = tournamentRegistrations
    .filter(r => r.status === 'validated')
    .map(r => r.team);
  const tournamentPools = pools.filter(p => p.tournamentId === t.id);
  const tournamentMatches = matches.filter(m => m.tournamentId === t.id);
  const liveRegisteredTeams = tournamentRegistrations.length || t.registeredTeams;
  const liveValidatedTeams = validatedTeams.length || t.validatedTeams;
  const qualifTeams = validatedTeams.filter(team => {
    const registration = tournamentRegistrations.find(r => r.team.id === team.id);
    return registration?.notes?.toUpperCase().includes('DRAW ENTRY: QUALIF');
  });
  const poolEligibleTeams = t.competitionMode === 'qualification_phase' && qualifTeams.length >= 2
    ? qualifTeams
    : validatedTeams;
  const drawStarted = !['draft', 'registration_open', 'registration_closed'].includes(t.status);
  const canOpenMainDraw = t.competitionMode === 'main_draw_direct'
    ? liveValidatedTeams >= 2 && drawStarted
    : ['pool_published', 'matches_ongoing', 'main_draw_ready', 'main_draw_published', 'locked', 'completed'].includes(t.status);
  const canOpenPoolModules = t.competitionMode === 'qualification_phase' && liveValidatedTeams >= 2 && drawStarted;

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
      enabled: liveRegisteredTeams > 0 || liveValidatedTeams > 0,
    },
    {
      label: 'Seed Editor',
      icon: <Star size={18} />,
      view: 'seed_editor',
      color: 'text-mpl-gold',
      description: 'Assign and lock team seeds',
      enabled: liveValidatedTeams > 0 || liveRegisteredTeams > 0,
    },
    {
      label: 'Draw Room',
      icon: <GitBranch size={18} />,
      view: 'draw_room',
      color: 'text-green-400',
      description: 'Pool draw, main draw, publish & lock',
      enabled: liveValidatedTeams >= 2 || drawStarted,
    },
    {
      label: 'Pool Draw',
      icon: <Edit3 size={18} />,
      view: 'pool_draw',
      color: 'text-purple-400',
      description: 'Manage pool slots and publish pools',
      enabled: canOpenPoolModules,
    },
    {
      label: 'Main Draw',
      icon: <Trophy size={18} />,
      view: 'main_draw',
      color: 'text-red-400',
      description: 'Bracket placement, BYEs, publish & lock',
      enabled: canOpenMainDraw,
    },
    {
      label: 'Match Scores',
      icon: <Edit3 size={18} />,
      view: 'match_score',
      color: 'text-yellow-400',
      description: 'Enter & correct set-by-set match scores',
      enabled: drawStarted,
    },
    {
      label: 'Pool Standings',
      icon: <TrendingUp size={18} />,
      view: 'pool_standings',
      color: 'text-cyan-400',
      description: 'Live standings with admin override option',
      enabled: canOpenPoolModules,
    },
    {
      label: 'Qualified Teams',
      icon: <CheckCircle size={18} />,
      view: 'qualified_teams',
      color: 'text-green-400',
      description: 'Confirm teams advancing to Main Draw',
      enabled: canOpenPoolModules,
    },
    {
      label: 'Match Schedule',
      icon: <Clock size={18} />,
      view: 'match_schedule',
      color: 'text-indigo-400',
      description: 'Assign courts & time slots to matches',
      enabled: drawStarted,
    },
    {
      label: 'Public View',
      icon: <Globe size={18} />,
      view: 'public_bracket',
      color: 'text-emerald-400',
      description: 'Player-facing pool draw & bracket view',
      enabled: canOpenMainDraw || canOpenPoolModules,
    },
  ];

  const isLocked = t.status === 'locked' || t.status === 'completed';

  const runWorkflowAction = async (nextStatus: TournamentStatus, message: string) => {
    try {
      await setTournamentStatus(t.id, nextStatus);
      addToast({ type: 'success', title: 'Workflow Updated', message });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Workflow Failed',
        message: error instanceof Error ? error.message : 'Unable to update tournament status.',
      });
    }
  };

  const handleGeneratePools = async () => {
    try {
      await generatePools(t.id, poolEligibleTeams);
      await setTournamentStatus(t.id, 'pool_draw_ready');
      addToast({ type: 'success', title: 'Qualif Pools Generated', message: `${poolEligibleTeams.length} teams placed into qualification pools.` });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Pool Generation Failed',
        message: error instanceof Error ? error.message : 'Unable to generate pools.',
      });
    }
  };

  const handlePrepareMainDraw = async () => {
    try {
      await setTournamentStatus(t.id, 'main_draw_ready');
      addToast({ type: 'success', title: 'Main Draw Ready', message: 'Direct bracket flow is ready.' });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Workflow Failed',
        message: error instanceof Error ? error.message : 'Unable to prepare main draw.',
      });
    }
  };

  const handleModeChange = async (competitionMode: CompetitionMode) => {
    try {
      await setTournamentMode(t.id, competitionMode);
      addToast({
        type: 'success',
        title: 'Competition Flow Updated',
        message: competitionMode === 'qualification_phase' ? 'Phase qualifs enabled.' : 'Main draw direct enabled.',
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Mode Update Failed',
        message: error instanceof Error ? error.message : 'Unable to update competition flow.',
      });
    }
  };

  const handleGenerateMatches = async () => {
    try {
      await generatePoolMatches(t.id);
      await setTournamentStatus(t.id, 'matches_ongoing');
      addToast({ type: 'success', title: 'Matches Generated', message: 'Pool round-robin schedule is ready.' });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Match Generation Failed',
        message: error instanceof Error ? error.message : 'Unable to generate matches.',
      });
    }
  };

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
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-mpl-gray">Flow</span>
                <select
                  className="input-field max-w-[58%] py-1.5 text-xs"
                  value={t.competitionMode}
                  onChange={event => void handleModeChange(event.target.value as CompetitionMode)}
                  disabled={!['draft', 'registration_open', 'registration_closed', 'draw_preparation'].includes(t.status)}
                >
                  <option value="main_draw_direct">Main Draw Direct</option>
                  <option value="qualification_phase">Phase Qualifs</option>
                </select>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-mpl-gray">Capacity</span>
                <span className="text-white font-medium">{t.maxTeams} teams max</span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              <StatCard label="Registered" value={liveRegisteredTeams} />
              <StatCard label="Validated" value={liveValidatedTeams} color="text-green-400" />
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

          <div className="px-4 mt-3">
            <p className="section-title">Next Step</p>
            <div className="mpl-card p-4 space-y-3">
              <WorkflowActionPanel
                status={t.status}
                competitionMode={t.competitionMode}
                validatedTeams={liveValidatedTeams}
                qualifTeams={qualifTeams.length}
                poolCount={tournamentPools.length}
                matchCount={tournamentMatches.length}
                onOpenRegistrations={() => void runWorkflowAction('registration_open', 'Registrations are now open.')}
                onCloseRegistrations={() => void runWorkflowAction('registration_closed', 'Registrations closed. Move to seed review.')}
                onPrepareSeeds={() => void runWorkflowAction('draw_preparation', 'Seed review is ready.')}
                onGeneratePools={() => void handleGeneratePools()}
                onPrepareMainDraw={() => void handlePrepareMainDraw()}
                onGenerateMatches={() => void handleGenerateMatches()}
              />
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

function WorkflowActionPanel({
  status,
  competitionMode,
  validatedTeams,
  qualifTeams,
  poolCount,
  matchCount,
  onOpenRegistrations,
  onCloseRegistrations,
  onPrepareSeeds,
  onGeneratePools,
  onPrepareMainDraw,
  onGenerateMatches,
}: {
  status: TournamentStatus;
  competitionMode: CompetitionMode;
  validatedTeams: number;
  qualifTeams: number;
  poolCount: number;
  matchCount: number;
  onOpenRegistrations: () => void;
  onCloseRegistrations: () => void;
  onPrepareSeeds: () => void;
  onGeneratePools: () => void;
  onPrepareMainDraw: () => void;
  onGenerateMatches: () => void;
}) {
  if (status === 'draft') {
    return <StepButton label="Open Registrations" description="Start accepting or importing teams." onClick={onOpenRegistrations} />;
  }

  if (status === 'registration_open') {
    return (
      <StepButton
        label="Close Registrations"
        description={`${validatedTeams} validated teams ready for seeding.`}
        onClick={onCloseRegistrations}
        disabled={validatedTeams < 2}
      />
    );
  }

  if (status === 'registration_closed') {
    return <StepButton label="Prepare Seeds" description="Review imported seeds and lock final team order." onClick={onPrepareSeeds} disabled={validatedTeams < 2} />;
  }

  if (status === 'draw_preparation') {
    if (competitionMode === 'main_draw_direct') {
      return <StepButton label="Prepare Main Draw" description="Skip qualification groups and go directly to the bracket." onClick={onPrepareMainDraw} disabled={validatedTeams < 2} />;
    }

    return (
      <StepButton
        label="Generate Qualif Pools"
        description={`${qualifTeams || validatedTeams} teams will be placed in qualification pools.`}
        onClick={onGeneratePools}
        disabled={(qualifTeams || validatedTeams) < 2}
      />
    );
  }

  if (status === 'pool_draw_ready') {
    return (
      <div>
        <p className="text-sm font-semibold text-white">{poolCount} pools ready</p>
        <p className="text-xs text-mpl-gray mt-1">Open Pool Draw below, review slots, then publish each official pool.</p>
      </div>
    );
  }

  if (status === 'pool_published') {
    return (
      <StepButton
        label="Generate Pool Matches"
        description={`${poolCount} pools published. ${matchCount} matches already exist.`}
        onClick={onGenerateMatches}
        disabled={poolCount === 0 || matchCount > 0}
      />
    );
  }

  return (
    <div>
      <p className="text-sm font-semibold text-white">Workflow active</p>
      <p className="text-xs text-mpl-gray mt-1">Continue through the enabled modules below.</p>
    </div>
  );
}

function StepButton({
  label,
  description,
  disabled,
  onClick,
}: {
  label: string;
  description: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="w-full btn-gold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
      onClick={onClick}
      disabled={disabled}
    >
      <Play size={14} />
      <span>{label}</span>
      <span className="hidden">{description}</span>
    </button>
  );
}
