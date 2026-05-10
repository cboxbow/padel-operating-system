import { useState } from 'react';
import {
  AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Shield
} from 'lucide-react';
import { useAppState, useTournamentData, useToast } from '../context';
import { TopBar } from '../components/Navigation';
import { BackButton, OverrideNoteDialog, GoldDivider } from '../components/UI';

import { cn } from '../lib';
import type { PoolStanding } from '../types';

export function PoolStandingsPage() {
  const { navigate, selectedTournament } = useAppState();
  const { standings, overrideStanding } = useTournamentData();
  const { addToast } = useToast();

  const [overrideTarget, setOverrideTarget] = useState<PoolStanding | null>(null);
  const [pendingPos, setPendingPos] = useState<number>(1);
  const [showOverride, setShowOverride] = useState(false);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  const pools = [...new Set(standings.map(s => s.poolId))];
  const poolNames: Record<string, string> = { pool_a: 'Pool A', pool_b: 'Pool B' };

  const handleOverride = (s: PoolStanding, newPos: number) => {
    setOverrideTarget(s);
    setPendingPos(newPos);
    setShowOverride(true);
  };

  const commitOverride = (reason: string) => {
    if (!overrideTarget) return;
    overrideStanding(overrideTarget.teamId, pendingPos, reason);
    addToast({ type: 'warning', title: 'Standing Overridden', message: `${overrideTarget.team.name} moved to position ${pendingPos}. Logged.` });
    setOverrideTarget(null);
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Pool Standings"
        subtitle="Auto-calculated · Admin override available"
        leftAction={<BackButton onClick={() => navigate('tournament_detail', selectedTournament?.id)} />}
      />
      <div className="flex-1 overflow-y-auto">
        <div className="pb-24">
          {/* Info */}
          <div className="mx-4 mt-4 p-3 bg-mpl-gold/10 border border-mpl-gold/20 rounded-xl">
            <p className="text-xs text-mpl-gold">Standings are auto-calculated from match results. Use the override button to manually adjust position — requires a reason, recorded in audit log.</p>
          </div>

          {pools.map(poolId => {
            const poolStandings = standings
              .filter(s => s.poolId === poolId)
              .sort((a, b) => a.position - b.position);
            return (
              <div key={poolId} className="mt-4">
                <div className="flex items-center justify-between px-4 mb-2">
                  <p className="section-title mb-0">{poolNames[poolId] ?? poolId}</p>
                  <span className="text-xs text-mpl-gray">{poolStandings.filter(s => s.qualified).length} qualified</span>
                </div>

                {/* Column headers */}
                <div className="flex items-center gap-1 px-4 py-1.5 text-[9px] text-mpl-gray font-bold uppercase tracking-widest border-b border-mpl-border">
                  <span className="w-6 text-center">#</span>
                  <span className="flex-1 pl-2">Team</span>
                  <span className="w-7 text-center">W</span>
                  <span className="w-7 text-center">L</span>
                  <span className="w-8 text-center">Sets</span>
                  <span className="w-8 text-center">Pts</span>
                  <span className="w-10"></span>
                </div>

                {poolStandings.map((s) => (
                  <div key={s.teamId}>
                    <button
                      className={cn(
                        'w-full flex items-center gap-1 px-4 py-3 border-b border-mpl-border/40 transition-colors hover:bg-mpl-card/30',
                        s.qualified ? 'border-l-2 border-l-green-500/60' : ''
                      )}
                      onClick={() => setExpandedTeam(expandedTeam === s.teamId ? null : s.teamId)}
                    >
                      <div className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0',
                        s.position === 1 ? 'bg-gold-gradient text-mpl-black' :
                        s.position === 2 ? 'bg-mpl-border text-mpl-off-white' : 'bg-transparent text-mpl-gray'
                      )}>
                        {s.adminOverride ? '★' : s.position}
                      </div>
                      <div className="flex-1 min-w-0 pl-2">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-white truncate">{s.team.name}</p>
                          {s.adminOverride && <AlertTriangle size={9} className="text-orange-400 flex-shrink-0" />}
                          {s.qualified && <CheckCircle size={9} className="text-green-400 flex-shrink-0" />}
                        </div>
                        <p className="text-[10px] text-mpl-gray">{s.team.clubName}</p>
                      </div>
                      <span className="w-7 text-center text-sm font-bold text-green-400">{s.wins}</span>
                      <span className="w-7 text-center text-sm font-bold text-red-400">{s.losses}</span>
                      <span className="w-8 text-center text-xs text-mpl-gray">{s.setsWon}/{s.setsLost}</span>
                      <span className="w-8 text-center text-sm font-black text-mpl-gold">{s.points}</span>
                      <div className="w-10 flex-shrink-0">
                        {expandedTeam === s.teamId ? <ChevronUp size={12} className="text-mpl-gray" /> : <ChevronDown size={12} className="text-mpl-gray" />}
                      </div>
                    </button>

                    {expandedTeam === s.teamId && (
                      <div className="px-4 py-3 bg-mpl-card/50 border-b border-mpl-border animate-fade-in space-y-3">
                        <div className="grid grid-cols-4 gap-2 text-center">
                          {[
                            { label: 'Played', value: s.matchesPlayed },
                            { label: 'Games+', value: s.gamesWon },
                            { label: 'Games-', value: s.gamesLost },
                            { label: 'Ratio', value: `${(s.setsWon / Math.max(1, s.setsWon + s.setsLost) * 100).toFixed(0)}%` },
                          ].map(stat => (
                            <div key={stat.label} className="bg-mpl-dark rounded-xl p-2">
                              <p className="text-sm font-black text-white">{stat.value}</p>
                              <p className="text-[9px] text-mpl-gray uppercase tracking-wide mt-0.5">{stat.label}</p>
                            </div>
                          ))}
                        </div>
                        {s.adminOverride && (
                          <div className="p-2 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                            <p className="text-[10px] text-orange-400 font-semibold">Override Reason:</p>
                            <p className="text-[10px] text-mpl-off-white mt-0.5">{s.overrideReason}</p>
                          </div>
                        )}
                        {/* Override controls */}
                        <div className="flex gap-2">
                          <p className="text-xs text-mpl-gray flex items-center gap-1.5 flex-1"><Shield size={10} /> Override Position:</p>
                          <div className="flex gap-1">
                            {[1, 2, 3].map(pos => pos !== s.position && (
                              <button key={pos} onClick={() => handleOverride(s, pos)}
                                className="w-7 h-7 rounded-lg border border-mpl-border text-xs text-mpl-gray hover:border-orange-400/50 hover:text-orange-400 transition-colors">
                                {pos}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                <GoldDivider />
              </div>
            );
          })}
        </div>
      </div>

      <OverrideNoteDialog
        isOpen={showOverride}
        onClose={() => { setShowOverride(false); setOverrideTarget(null); }}
        onConfirm={commitOverride}
        title={`Override: ${overrideTarget?.team.name}`}
        description={`Move to position ${pendingPos}. This action is logged in the audit trail.`}
      />
    </div>
  );
}
