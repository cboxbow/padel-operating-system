import { useState } from 'react';
import {
  CheckCircle, Edit3, AlertTriangle, Clock, Trophy
} from 'lucide-react';
import { useAppState, useTournamentData, useToast } from '../context';
import { TopBar } from '../components/Navigation';
import { BackButton, OverrideNoteDialog, GoldDivider, ConfirmDialog } from '../components/UI';

import { cn } from '../lib';
import type { ScheduledMatch, MatchSet } from '../types';

type ScoreEntry = { t1: string; t2: string };

export function MatchScorePage() {
  const { navigate, selectedTournament } = useAppState();
  const { matches, matchesError, completeMatchScore } = useTournamentData();
  const { addToast } = useToast();

  const [selectedMatch, setSelectedMatch] = useState<ScheduledMatch | null>(null);
  const [scores, setScores] = useState<ScoreEntry[]>([{ t1: '', t2: '' }]);
  const [filterPool, setFilterPool] = useState<string>('all');
  const [showOverride, setShowOverride] = useState(false);
  const [pendingCorrection, setPendingCorrection] = useState<{ matchId: string; sets: MatchSet[] } | null>(null);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);

  const tournamentMatches = matches.filter(m => m.tournamentId === selectedTournament?.id);
  const poolIds = [...new Set(tournamentMatches.map(m => m.poolId).filter(Boolean) as string[])];
  const pools = ['all', ...poolIds];
  const filtered = matches.filter(m =>
    m.tournamentId === selectedTournament?.id && (filterPool === 'all' ? true : m.poolId === filterPool)
  );

  const openMatch = (match: ScheduledMatch) => {
    setSelectedMatch(match);
    if (match.sets.length > 0) {
      setScores(match.sets.map(s => ({ t1: String(s.team1Score), t2: String(s.team2Score) })));
    } else {
      setScores([{ t1: '', t2: '' }]);
    }
  };

  const addSet = () => setScores(prev => [...prev, { t1: '', t2: '' }]);
  const removeSet = (i: number) => setScores(prev => prev.filter((_, idx) => idx !== i));
  const updateScore = (i: number, side: 't1' | 't2', val: string) => {
    const n = val === '' ? '' : Math.max(0, Math.min(99, parseInt(val) || 0)).toString();
    setScores(prev => prev.map((s, idx) => idx === i ? { ...s, [side]: n } : s));
  };

  const buildSets = (matchId: string): MatchSet[] =>
    scores.map((s, i) => ({
      id: `${matchId}-set${i + 1}`,
      matchId,
      setNumber: i + 1,
      team1Score: parseInt(s.t1) || 0,
      team2Score: parseInt(s.t2) || 0,
      isTiebreak: i === 2,
    }));

  const handleSaveScore = () => {
    if (!selectedMatch) return;
    if (!selectedMatch.team1 || !selectedMatch.team2) {
      addToast({ type: 'error', title: 'Score Blocked', message: 'Both teams must be assigned before entering a score.' });
      return;
    }
    const validationError = validateScoreEntries(scores);
    if (validationError) {
      addToast({ type: 'error', title: 'Invalid Score', message: validationError });
      return;
    }
    if (selectedMatch.status === 'completed') {
      setPendingCorrection({ matchId: selectedMatch.id, sets: buildSets(selectedMatch.id) });
      setShowOverride(true);
      return;
    }
    setShowCompleteConfirm(true);
  };

  const commitScore = async () => {
    if (!selectedMatch) return;
    const newSets = buildSets(selectedMatch.id);
    try {
      await completeMatchScore(selectedMatch, newSets);
      setSelectedMatch(null);
      addToast({ type: 'success', title: 'Score Saved', message: `Match ${selectedMatch.matchNumber} completed.` });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Score Save Failed',
        message: error instanceof Error ? error.message : 'Unable to save score.',
      });
    }
  };

  const commitOverride = async (reason: string) => {
    if (!pendingCorrection || !selectedMatch) return;
    try {
      await completeMatchScore(selectedMatch, pendingCorrection.sets, reason);
      setSelectedMatch(null);
      addToast({ type: 'warning', title: 'Score Corrected', message: 'Override recorded in audit log.' });
      setPendingCorrection(null);
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Correction Failed',
        message: error instanceof Error ? error.message : 'Unable to correct score.',
      });
    }
  };

  const statusColor = (m: ScheduledMatch) =>
    m.status === 'completed' ? 'text-green-400 border-green-500/30 bg-green-500/10' :
    m.status === 'ongoing' ? 'text-mpl-gold border-mpl-gold/30 bg-mpl-gold/10' :
    'text-mpl-gray border-mpl-border bg-transparent';

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Match Scores"
        subtitle={selectedTournament?.name}
        leftAction={<BackButton onClick={() => selectedMatch ? setSelectedMatch(null) : navigate('tournament_detail', selectedTournament?.id)} label={selectedMatch ? 'Matches' : 'Back'} />}
      />
      <div className="flex-1 overflow-y-auto">
        {!selectedMatch ? (
          <div className="pb-24">
            {matchesError && (
              <div className="mx-4 mt-4 rounded-lg border border-mpl-gold/30 bg-mpl-gold/10 px-3 py-2 text-xs text-mpl-gold">
                {matchesError}
              </div>
            )}

            {/* Pool filter */}
            <div className="flex gap-2 px-4 pt-4 pb-3 overflow-x-auto">
              {pools.map(p => (
                <button key={p} onClick={() => setFilterPool(p)}
                  className={cn('px-4 py-1.5 rounded-full text-xs font-bold border transition-all flex-shrink-0',
                    filterPool === p ? 'bg-mpl-gold text-mpl-black border-mpl-gold' : 'border-mpl-border text-mpl-gray hover:border-mpl-gold/40'
                  )}>
                  {p === 'all' ? 'All Matches' : `Pool ${p.slice(-1).toUpperCase()}`}
                </button>
              ))}
            </div>

            {/* Match list */}
            <div className="px-4 space-y-3">
              {filtered.map(m => (
                <button key={m.id} onClick={() => openMatch(m)}
                  className="w-full mpl-card p-4 text-left hover:border-mpl-gold/30 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-mpl-gray font-mono font-bold uppercase">
                        {m.poolId ? `Pool ${m.poolId.slice(-1).toUpperCase()}` : 'Main Draw'} · M{m.matchNumber}
                      </span>
                      {m.courtName && <span className="text-[10px] text-mpl-gold border border-mpl-gold/30 px-1.5 py-0.5 rounded">{m.courtName}</span>}
                    </div>
                    <span className={cn('text-[10px] font-bold uppercase px-2 py-1 rounded-full border', statusColor(m))}>
                      {m.status}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {[m.team1, m.team2].map((team, ti) => (
                      <div key={ti} className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          {m.winnerId === team?.id && <Trophy size={10} className="text-mpl-gold flex-shrink-0" />}
                          <span className={cn('text-sm font-semibold truncate', m.winnerId === team?.id ? 'text-mpl-gold' : 'text-white')}>
                            {team?.name ?? 'TBD'}
                          </span>
                        </div>
                        {m.sets.length > 0 && (
                          <div className="flex gap-1.5 flex-shrink-0">
                            {m.sets.map((s, si) => (
                              <span key={si} className={cn(
                                'text-sm font-black w-6 text-center',
                                (ti === 0 ? s.team1Score > s.team2Score : s.team2Score > s.team1Score)
                                  ? 'text-white' : 'text-mpl-gray'
                              )}>
                                {ti === 0 ? s.team1Score : s.team2Score}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {m.scheduledTime && (
                    <p className="text-[10px] text-mpl-gray mt-2 flex items-center gap-1">
                      <Clock size={9} />
                      {new Date(m.scheduledTime).toLocaleTimeString('en-MU', { hour: '2-digit', minute: '2-digit' })}
                      {m.estimatedDuration && ` · ~${m.estimatedDuration}min`}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Score Entry Panel */
          <div className="pb-24 px-4 pt-4 space-y-4">
            {selectedMatch.status === 'completed' && (
              <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-xl flex items-start gap-2">
                <AlertTriangle size={13} className="text-orange-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-orange-400">This match is completed. Editing will create an <strong>Override Record</strong> with a mandatory reason.</p>
              </div>
            )}

            {/* Teams header */}
            <div className="mpl-card p-4">
              <div className="flex items-center justify-between text-sm font-bold">
                <span className="text-white">{selectedMatch.team1?.name ?? 'TBD'}</span>
                <span className="text-mpl-gray text-xs">vs</span>
                <span className="text-white text-right">{selectedMatch.team2?.name ?? 'TBD'}</span>
              </div>
              <p className="text-xs text-mpl-gray text-center mt-1">
                {selectedMatch.courtName ?? 'No court assigned'} · Match {selectedMatch.matchNumber}
              </p>
            </div>

            {/* Set scores */}
            <div>
              <p className="section-title">Set Scores</p>
              <div className="space-y-2">
                {scores.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 mpl-card p-3">
                    <span className="text-xs text-mpl-gray w-12 flex-shrink-0">
                      {i === 2 ? 'Super TB' : `Set ${i + 1}`}
                    </span>
                    <input
                      type="number" min={0} max={99}
                      className="input-field text-center text-lg font-black w-16 flex-shrink-0"
                      value={s.t1} onChange={e => updateScore(i, 't1', e.target.value)}
                      placeholder="0"
                    />
                    <span className="text-mpl-gray font-bold">—</span>
                    <input
                      type="number" min={0} max={99}
                      className="input-field text-center text-lg font-black w-16 flex-shrink-0"
                      value={s.t2} onChange={e => updateScore(i, 't2', e.target.value)}
                      placeholder="0"
                    />
                    {scores.length > 1 && (
                      <button onClick={() => removeSet(i)} className="text-red-400 hover:text-red-300 ml-auto flex-shrink-0">
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {scores.length < 3 && (
                <button onClick={addSet} className="mt-2 w-full btn-ghost text-xs flex items-center justify-center gap-2">
                  <Edit3 size={12} /> Add Set {scores.length + 1}
                </button>
              )}
            </div>

            {/* Live preview */}
            {scores.some(s => s.t1 !== '' && s.t2 !== '') && (() => {
              const preview = buildSets(selectedMatch.id);
              const t1w = preview.filter(s => s.team1Score > s.team2Score).length;
              const t2w = preview.filter(s => s.team2Score > s.team1Score).length;
              const winner = t1w > t2w ? selectedMatch.team1 : t2w > t1w ? selectedMatch.team2 : null;
              return (
                <div className={cn('p-3 rounded-xl border text-center', winner ? 'border-mpl-gold/30 bg-mpl-gold/10' : 'border-mpl-border bg-mpl-dark')}>
                  {winner ? (
                    <p className="text-sm font-bold text-mpl-gold">🏆 {winner.name} wins ({t1w}-{t2w})</p>
                  ) : (
                    <p className="text-sm text-mpl-gray">Sets tied — add a Super Tiebreak</p>
                  )}
                </div>
              );
            })()}

            <GoldDivider />
            <div className="flex gap-3">
              <button className="btn-ghost flex-1" onClick={() => setSelectedMatch(null)}>Cancel</button>
              <button className="btn-gold flex-1 flex items-center justify-center gap-2" onClick={handleSaveScore}>
                {selectedMatch.status === 'completed' ? <><AlertTriangle size={13} /> Correct Score</> : <><CheckCircle size={13} /> Save Score</>}
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={showCompleteConfirm}
        onClose={() => setShowCompleteConfirm(false)}
        onConfirm={() => { void commitScore(); setShowCompleteConfirm(false); }}
        title="Complete Match?"
        message={`Mark match as completed with the entered scores? This will update pool standings automatically.`}
        confirmLabel="Complete Match"
        variant="gold"
      />
      <OverrideNoteDialog
        isOpen={showOverride}
        onClose={() => { setShowOverride(false); setPendingCorrection(null); }}
        onConfirm={commitOverride}
        title="Score Correction Override"
        description="Provide a mandatory reason for this score correction:"
      />
    </div>
  );
}

function validateScoreEntries(scores: ScoreEntry[]): string | null {
  if (scores.length === 0) return 'Add at least one set.';

  let team1Sets = 0;
  let team2Sets = 0;

  for (const [index, score] of scores.entries()) {
    if (score.t1 === '' || score.t2 === '') {
      return `Set ${index + 1} needs both scores.`;
    }

    const team1Score = parseInt(score.t1, 10);
    const team2Score = parseInt(score.t2, 10);
    if (Number.isNaN(team1Score) || Number.isNaN(team2Score)) {
      return `Set ${index + 1} contains an invalid number.`;
    }
    if (team1Score === team2Score) {
      return `Set ${index + 1} cannot finish tied.`;
    }

    if (team1Score > team2Score) team1Sets += 1;
    if (team2Score > team1Score) team2Sets += 1;
  }

  if (team1Sets === team2Sets) {
    return 'The match needs a clear winner. Add a deciding set or super tie-break.';
  }

  return null;
}
