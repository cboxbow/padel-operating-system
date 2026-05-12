import { useState } from 'react';
import { Edit3 } from 'lucide-react';
import { useAppState, useTournamentData, useToast } from '../context';
import { TopBar } from '../components/Navigation';
import { BackButton, Modal, GoldDivider } from '../components/UI';

import { MOCK_COURTS } from '../mockData';
import { cn } from '../lib';
import type { ScheduledMatch, Court } from '../types';

export function MatchSchedulePage() {
  const { navigate, selectedTournament } = useAppState();
  const { matches, matchesError, scheduleMatch } = useTournamentData();
  const { addToast } = useToast();

  const [courts] = useState<Court[]>(MOCK_COURTS);
  const [editTarget, setEditTarget] = useState<ScheduledMatch | null>(null);
  const [editTime, setEditTime] = useState('');
  const [editCourt, setEditCourt] = useState('');
  const [showEdit, setShowEdit] = useState(false);
  const tournamentMatches = matches.filter(m => m.tournamentId === selectedTournament?.id);

  const openEdit = (m: ScheduledMatch) => {
    setEditTarget(m);
    setEditTime(m.scheduledTime?.slice(0, 16) ?? '');
    setEditCourt(m.courtId ?? '');
    setShowEdit(true);
  };

  const saveEdit = async () => {
    if (!editTarget) return;
    const court = courts.find(c => c.id === editCourt);
    const parsedCourtNumber = parseInt(editCourt.replace('ct', ''), 10);
    const courtNumber = court?.number ?? (Number.isNaN(parsedCourtNumber) ? undefined : parsedCourtNumber);

    try {
      await scheduleMatch(editTarget, editTime, courtNumber);
      addToast({ type: 'success', title: 'Schedule Updated', message: `Match ${editTarget.matchNumber} scheduled.` });
      setShowEdit(false);
      setEditTarget(null);
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Schedule Failed',
        message: error instanceof Error ? error.message : 'Unable to schedule match.',
      });
    }
  };

  const courtStatusColor = (status: Court['status']) =>
    status === 'available' ? 'text-green-400 border-green-400/30 bg-green-400/10' :
    status === 'in_use' ? 'text-mpl-gold border-mpl-gold/30 bg-mpl-gold/10' :
    'text-red-400 border-red-400/30 bg-red-400/10';

  // Group matches by date
  const byDate: Record<string, ScheduledMatch[]> = {};
  tournamentMatches.forEach(m => {
    const day = m.scheduledTime ? m.scheduledTime.slice(0, 10) : 'Unscheduled';
    if (!byDate[day]) byDate[day] = [];
    byDate[day].push(m);
  });

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Match Schedule"
        subtitle={`${tournamentMatches.filter(m => m.isConfirmed).length}/${tournamentMatches.length} confirmed`}
        leftAction={<BackButton onClick={() => navigate('tournament_detail', selectedTournament?.id)} />}
      />
      <div className="flex-1 overflow-y-auto">
        <div className="pb-24">
          {matchesError && (
            <div className="mx-4 mt-4 rounded-lg border border-mpl-gold/30 bg-mpl-gold/10 px-3 py-2 text-xs text-mpl-gold">
              {matchesError}
            </div>
          )}

          {/* Court status row */}
          <div className="px-4 pt-4">
            <p className="section-title">Court Status</p>
            <div className="grid grid-cols-4 gap-2">
              {courts.map(c => (
                <div key={c.id} className={cn('rounded-xl border p-2 text-center', courtStatusColor(c.status))}>
                  <p className="text-xs font-black">{c.name}</p>
                  <p className="text-[9px] uppercase mt-0.5 opacity-80">{c.status.replace('_', ' ')}</p>
                </div>
              ))}
            </div>
          </div>

          <GoldDivider />

          {/* Match schedule by day */}
          {tournamentMatches.length === 0 && (
            <div className="mx-4 mt-4 rounded-xl border border-mpl-gold/30 bg-mpl-gold/10 px-3 py-3 text-xs text-mpl-gold">
              No matches generated yet for this tournament.
            </div>
          )}

          {Object.entries(byDate).sort().map(([day, dayMatches]) => (
            <div key={day} className="mb-4">
              <div className="flex items-center gap-2 px-4 mb-2">
                <div className="h-px flex-1 bg-mpl-border" />
                <p className="text-xs font-bold text-mpl-gold uppercase tracking-widest">
                  {day === 'Unscheduled' ? '📋 Unscheduled' : new Date(day).toLocaleDateString('en-MU', { weekday: 'short', day: '2-digit', month: 'short' })}
                </p>
                <div className="h-px flex-1 bg-mpl-border" />
              </div>

              <div className="px-4 space-y-2">
                {dayMatches
                  .sort((a, b) => (a.scheduledTime ?? '').localeCompare(b.scheduledTime ?? ''))
                  .map(m => (
                    <div key={m.id} className={cn(
                      'mpl-card px-3 py-2.5 flex items-start gap-2.5',
                      m.status === 'completed' ? 'border-green-500/20' :
                      m.isConfirmed ? 'border-mpl-gold/20' : 'border-mpl-border'
                    )}>
                      {/* Time column */}
                      <div className="flex-shrink-0 w-10 text-center">
                        {m.scheduledTime ? (
                          <>
                            <p className="text-[11px] font-black text-white">
                              {new Date(m.scheduledTime).toLocaleTimeString('en-MU', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            {m.estimatedDuration && <p className="text-[9px] text-mpl-gray">{m.estimatedDuration}min</p>}
                          </>
                        ) : (
                          <p className="text-[11px] text-mpl-gray">TBD</p>
                        )}
                      </div>

                      {/* Match info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[8px] text-mpl-gray font-mono font-bold uppercase">
                            {m.poolId ? `Pool ${m.poolId.slice(-1).toUpperCase()}` : 'Main Draw'} · M{m.matchNumber}
                          </span>
                          {m.courtName && (
                            <span className="text-[9px] text-mpl-gold border border-mpl-gold/30 px-1.5 py-0.5 rounded">
                              {m.courtName}
                            </span>
                          )}
                          <span className={cn(
                            'ml-auto text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border',
                            m.status === 'completed' ? 'text-green-400 border-green-400/30' :
                            m.isConfirmed ? 'text-mpl-gold border-mpl-gold/30' :
                            'text-mpl-gray border-mpl-border'
                          )}>
                            {m.status === 'completed' ? '✓ done' : m.isConfirmed ? 'confirmed' : 'draft'}
                          </span>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[11px] leading-tight font-semibold text-white truncate">{m.team1?.name ?? 'TBD'}</p>
                          <p className="text-[11px] leading-tight font-semibold text-white truncate">
                            <span className="text-[9px] text-mpl-gray font-normal mr-1">vs</span>{m.team2?.name ?? 'TBD'}
                          </p>
                        </div>
                      </div>

                      {/* Edit button */}
                      {m.status !== 'completed' && (
                        <button onClick={() => openEdit(m)}
                          className="p-2 rounded-lg text-mpl-gray hover:text-mpl-gold hover:bg-mpl-gold/10 transition-colors flex-shrink-0">
                          <Edit3 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Schedule Modal */}
      <Modal
        isOpen={showEdit}
        onClose={() => { setShowEdit(false); setEditTarget(null); }}
        title={`Schedule Match ${editTarget?.matchNumber}`}
        size="sm"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setShowEdit(false)}>Cancel</button>
            <button className="btn-gold" onClick={() => void saveEdit()}>Save Schedule</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <p className="text-xs text-mpl-gray mb-1">
              {editTarget?.team1?.name} vs {editTarget?.team2?.name}
            </p>
          </div>
          <div>
            <label className="section-title">Date & Time</label>
            <input
              type="datetime-local"
              className="input-field"
              value={editTime}
              onChange={e => setEditTime(e.target.value)}
            />
          </div>
          <div>
            <label className="section-title">Court</label>
            <div className="grid grid-cols-2 gap-2">
              {courts.filter(c => c.status !== 'maintenance').map(c => (
                <button key={c.id} onClick={() => setEditCourt(c.id)}
                  className={cn(
                    'p-2.5 rounded-xl border text-sm font-semibold transition-all',
                    editCourt === c.id ? 'bg-mpl-gold text-mpl-black border-mpl-gold' :
                    c.status === 'in_use' ? 'border-mpl-border text-mpl-gray/50 cursor-default' :
                    'border-mpl-border text-white hover:border-mpl-gold/40'
                  )}>
                  {c.name}
                  {c.status === 'in_use' && <span className="block text-[9px] text-orange-400">In Use</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
