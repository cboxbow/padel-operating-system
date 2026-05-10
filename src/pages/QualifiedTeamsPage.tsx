import { useState } from 'react';
import {
  CheckCircle, AlertTriangle, ChevronRight, Shield
} from 'lucide-react';
import { useAppState, useTournamentData, useToast } from '../context';
import { TopBar } from '../components/Navigation';
import { BackButton, OverrideNoteDialog, ConfirmDialog, GoldDivider } from '../components/UI';

import { MOCK_QUALIFIED_TEAMS } from '../mockData';
import { cn } from '../lib';
import type { QualifiedTeam } from '../types';

export function QualifiedTeamsPage() {
  const { navigate, selectedTournament } = useAppState();
  const { addAuditLog, addOverride } = useTournamentData();
  const { addToast } = useToast();

  const [qualified, setQualified] = useState<QualifiedTeam[]>(MOCK_QUALIFIED_TEAMS);
  const [overrideTarget, setOverrideTarget] = useState<QualifiedTeam | null>(null);
  const [showOverride, setShowOverride] = useState(false);
  const [showConfirmAll, setShowConfirmAll] = useState(false);

  const confirmed = qualified.filter(q => q.isConfirmed).length;
  const total = qualified.length;
  const allConfirmed = confirmed === total;

  const toggleConfirm = (teamId: string) => {
    setQualified(prev => prev.map(q =>
      q.team.id === teamId ? { ...q, isConfirmed: !q.isConfirmed } : q
    ));
  };

  const startOverride = (q: QualifiedTeam) => {
    setOverrideTarget(q);
    setShowOverride(true);
  };

  const commitOverride = (reason: string) => {
    if (!overrideTarget) return;
    // Toggle qualification status with override
    const wasQualified = overrideTarget.isConfirmed;
    setQualified(prev => prev.map(q =>
      q.team.id === overrideTarget.team.id
        ? { ...q, isConfirmed: !q.isConfirmed, isOverride: true, overrideReason: reason }
        : q
    ));
    addOverride({
      tournamentId: selectedTournament?.id ?? 'trn1',
      type: 'status_override',
      entityType: 'qualified_team',
      entityId: overrideTarget.team.id,
      previousValue: wasQualified ? 'confirmed' : 'pending',
      newValue: wasQualified ? 'revoked' : 'force-confirmed',
      reason,
      adminId: 'adm1', adminName: 'Admin MPL',
    });
    addToast({ type: 'warning', title: 'Qualification Override', message: `${overrideTarget.team.name} status changed. Logged.` });
    setOverrideTarget(null);
  };

  const confirmAll = () => {
    setQualified(prev => prev.map(q => ({ ...q, isConfirmed: true })));
    addAuditLog({
      action: 'QUALIFIED_TEAMS_CONFIRMED', module: 'Qualified Teams',
      entityType: 'tournament', entityId: selectedTournament?.id ?? 'trn1',
      description: `All ${total} qualified teams confirmed for main draw.`,
      adminId: 'adm1', adminName: 'Admin MPL', isOverride: false,
    });
    addToast({ type: 'success', title: 'All Teams Confirmed', message: 'Ready to proceed to Main Draw.' });
  };

  const poolGroups = ['pool_a', 'pool_b'];
  const poolNames: Record<string, string> = { pool_a: 'Pool A', pool_b: 'Pool B' };

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Qualified Teams"
        subtitle={`${confirmed}/${total} confirmed for Main Draw`}
        leftAction={<BackButton onClick={() => navigate('tournament_detail', selectedTournament?.id)} />}
        rightAction={
          <span className={cn('status-badge text-xs', allConfirmed ? 'status-published' : 'status-pending')}>
            {allConfirmed ? 'Ready' : `${total - confirmed} pending`}
          </span>
        }
      />
      <div className="flex-1 overflow-y-auto">
        <div className="pb-24">
          {/* Progress bar */}
          <div className="px-4 pt-4">
            <div className="h-2 bg-mpl-border rounded-full overflow-hidden">
              <div
                className="h-full bg-gold-gradient rounded-full transition-all duration-500"
                style={{ width: `${(confirmed / total) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-mpl-gray mt-1">
              <span>{confirmed} confirmed</span>
              <span>{total - confirmed} pending</span>
            </div>
          </div>

          {/* Info banner */}
          <div className="mx-4 mt-3 p-3 bg-mpl-gold/10 border border-mpl-gold/20 rounded-xl">
            <p className="text-xs text-mpl-gold">
              Review qualified teams from pool standings. Confirm each team before proceeding to Main Draw. Use Override to change qualification status with a mandatory reason.
            </p>
          </div>

          {poolGroups.map(poolId => {
            const poolTeams = qualified.filter(q => q.poolId === poolId)
              .sort((a, b) => a.poolPosition - b.poolPosition);
            return (
              <div key={poolId} className="mt-4">
                <p className="section-title px-4">{poolNames[poolId]} — Qualified ({poolTeams.length})</p>
                {poolTeams.map(q => (
                  <div key={q.team.id}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 border-b border-mpl-border/40 transition-colors',
                      q.isOverride ? 'bg-orange-500/5' : ''
                    )}>
                    {/* Pool position badge */}
                    <div className={cn(
                      'w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0',
                      q.poolPosition === 1 ? 'bg-gold-gradient text-mpl-black' : 'bg-mpl-border text-mpl-gray'
                    )}>
                      {q.poolPosition === 1 ? '1st' : '2nd'}
                    </div>
                    {/* Team info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-white truncate">{q.team.name}</p>
                        {q.isOverride && <AlertTriangle size={9} className="text-orange-400 flex-shrink-0" />}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-mpl-gray">{q.team.clubName}</p>
                        {q.mainDrawSeed && (
                          <span className="text-[9px] text-mpl-gold border border-mpl-gold/30 px-1 rounded font-bold">
                            MD Seed #{q.mainDrawSeed}
                          </span>
                        )}
                      </div>
                      {q.isOverride && q.overrideReason && (
                        <p className="text-[10px] text-orange-400 mt-0.5 italic">Override: {q.overrideReason}</p>
                      )}
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => startOverride(q)}
                        className="p-1.5 rounded-lg text-mpl-gray hover:text-orange-400 hover:bg-orange-400/10 transition-colors"
                        title="Override qualification"
                      >
                        <Shield size={13} />
                      </button>
                      <button
                        onClick={() => toggleConfirm(q.team.id)}
                        className={cn(
                          'p-1.5 rounded-lg transition-all',
                          q.isConfirmed
                            ? 'text-green-400 bg-green-400/10'
                            : 'text-mpl-gray hover:text-green-400 hover:bg-green-400/10'
                        )}
                        title={q.isConfirmed ? 'Revoke confirmation' : 'Confirm team'}
                      >
                        <CheckCircle size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}

          <GoldDivider />

          {/* Actions */}
          <div className="px-4 space-y-2">
            <button
              className={cn('w-full btn-gold flex items-center justify-center gap-2', allConfirmed ? '' : 'opacity-60')}
              onClick={() => !allConfirmed && setShowConfirmAll(true) || (allConfirmed && navigate('main_draw', selectedTournament?.id))}
            >
              {allConfirmed ? <><ChevronRight size={14} /> Proceed to Main Draw</> : <><CheckCircle size={14} /> Confirm All Teams</>}
            </button>
            {!allConfirmed && (
              <p className="text-xs text-mpl-gray text-center">Confirm all {total} teams before proceeding to Main Draw</p>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirmAll}
        onClose={() => setShowConfirmAll(false)}
        onConfirm={confirmAll}
        title="Confirm All Qualified Teams?"
        message={`This will officially confirm all ${total} teams for the Main Draw. This action is logged.`}
        confirmLabel="Confirm All"
        variant="gold"
      />
      <OverrideNoteDialog
        isOpen={showOverride}
        onClose={() => { setShowOverride(false); setOverrideTarget(null); }}
        onConfirm={commitOverride}
        title={`Override: ${overrideTarget?.team.name}`}
        description="Override qualification status. Requires a mandatory reason for the audit log."
      />
    </div>
  );
}
