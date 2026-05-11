import { useState } from 'react';
import { Lock, Unlock, Edit2 } from 'lucide-react';
import { useAppState, useTournamentData, useToast } from '../context';
import { TopBar } from '../components/Navigation';
import { BackButton, OverrideNoteDialog, StatCard, GoldDivider } from '../components/UI';
import { cn } from '../lib';
import type { Team } from '../types';

export function TeamListPage() {
  const { selectedTournament, navigate } = useAppState();
  const { registrations } = useTournamentData();

  const validatedTeams = registrations
    .filter(r => r.tournamentId === selectedTournament?.id && r.status === 'validated')
    .map(r => r.team)
    .sort((a, b) => (a.seed ?? 99) - (b.seed ?? 99));

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Final Team List"
        subtitle={`${validatedTeams.length} validated teams`}
        leftAction={selectedTournament ? <BackButton onClick={() => navigate('tournament_detail', selectedTournament.id)} /> : undefined}
        rightAction={
          <button onClick={() => navigate('seed_editor', selectedTournament?.id)} className="btn-gold text-xs px-3 py-1.5">
            Edit Seeds
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto">
        <div className="pb-24">
          <div className="grid grid-cols-2 gap-3 px-4 pt-4">
            <StatCard label="Validated" value={validatedTeams.length} color="text-green-400" />
            <StatCard label="Seeded" value={validatedTeams.filter(t => t.seed).length} />
          </div>
          <div className="mt-4">
            {validatedTeams.map((team, idx) => (
              <div key={team.id} className="flex items-center gap-3 px-4 py-3 border-b border-mpl-border/40 hover:bg-mpl-card/50 transition-colors">
                <span className="text-xs text-mpl-gray w-5 text-center font-bold">{idx + 1}</span>
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-black',
                  team.seed ? 'bg-gold-gradient text-mpl-black' : 'bg-mpl-border text-mpl-gray'
                )}>
                  {team.seed ? `#${team.seed}` : '—'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-white truncate">{team.name}</p>
                    {team.isSeedLocked && <Lock size={10} className="text-mpl-gold flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-mpl-gray">{team.player1.fullName} · {team.player2.fullName}</p>
                  <p className="text-xs text-mpl-gray/70">{team.clubName}</p>
                </div>
                {team.ranking && <span className="text-xs text-mpl-gray flex-shrink-0">Team Weight {team.ranking}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Seed Editor Page ─────────────────────────────────────────────────────────
export function SeedEditorPage() {
  const { selectedTournament, navigate } = useAppState();
  const { registrations, updateSeed } = useTournamentData();
  const { addToast } = useToast();
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [newSeed, setNewSeed] = useState('');
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [pendingChange, setPendingChange] = useState<{ teamId: string; seed: number | undefined } | null>(null);

  const validatedTeams = registrations
    .filter(r => r.tournamentId === selectedTournament?.id && r.status === 'validated')
    .map(r => r.team)
    .sort((a, b) => (a.seed ?? 99) - (b.seed ?? 99));

  const [localSeeds, setLocalSeeds] = useState<Record<string, number | undefined>>(
    Object.fromEntries(validatedTeams.map(t => [t.id, t.seed]))
  );
  const [lockedSeeds, setLockedSeeds] = useState<Record<string, boolean>>(
    Object.fromEntries(validatedTeams.map(t => [t.id, t.isSeedLocked ?? false]))
  );

  const handleSeedEdit = (team: Team) => {
    if (lockedSeeds[team.id]) return;
    setEditingTeam(team);
    setNewSeed(localSeeds[team.id]?.toString() ?? '');
  };

  const handleSeedSave = () => {
    if (!editingTeam) return;
    const seedVal = newSeed.trim() ? parseInt(newSeed) : undefined;
    setPendingChange({ teamId: editingTeam.id, seed: seedVal });
    setEditingTeam(null);
    setShowOverrideDialog(true);
  };

  const handleOverrideConfirm = async (reason: string) => {
    if (!pendingChange) return;
    try {
      await updateSeed(pendingChange.teamId, pendingChange.seed, reason);
      setLocalSeeds(prev => ({ ...prev, [pendingChange.teamId]: pendingChange.seed }));
      setLockedSeeds(prev => ({ ...prev, [pendingChange.teamId]: pendingChange.seed !== undefined }));
      addToast({ type: 'success', title: 'Seed Updated', message: `Seed change logged in audit trail.` });
      setPendingChange(null);
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Seed Update Failed',
        message: error instanceof Error ? error.message : 'Unable to update seed.',
      });
    }
  };

  const toggleLock = (teamId: string) => {
    setLockedSeeds(prev => ({ ...prev, [teamId]: !prev[teamId] }));
    addToast({
      type: 'info',
      title: lockedSeeds[teamId] ? 'Seed Unlocked' : 'Seed Locked',
      message: lockedSeeds[teamId] ? 'Seed can now be edited.' : 'Seed is protected from changes.',
    });
  };

  const seededTeams = validatedTeams.filter(t => localSeeds[t.id]);
  const unseededTeams = validatedTeams.filter(t => !localSeeds[t.id]);

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Seed Editor"
        subtitle="Assign & lock team seeds"
        leftAction={<BackButton onClick={() => navigate('tournament_detail', selectedTournament?.id)} />}
        rightAction={
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-mpl-gold font-semibold">{seededTeams.length} seeded</span>
          </div>
        }
      />
      <div className="flex-1 overflow-y-auto">
        <div className="pb-24">
          {/* Info banner */}
          <div className="mx-4 mt-4 p-3 bg-mpl-gold/10 border border-mpl-gold/20 rounded-xl">
            <p className="text-xs text-mpl-gold">
              ⚠️ All seed changes are recorded in the audit log with a mandatory override reason. Locked seeds cannot be edited without unlocking first.
            </p>
          </div>

          {/* Seeded teams */}
          {seededTeams.length > 0 && (
            <div className="mt-4">
              <p className="section-title px-4">Seeded Teams ({seededTeams.length})</p>
              {seededTeams
                .sort((a, b) => (localSeeds[a.id] ?? 99) - (localSeeds[b.id] ?? 99))
                .map(team => (
                  <SeedRow
                    key={team.id}
                    team={team}
                    seed={localSeeds[team.id]}
                    isLocked={lockedSeeds[team.id]}
                    onEdit={() => handleSeedEdit(team)}
                    onToggleLock={() => toggleLock(team.id)}
                  />
                ))}
            </div>
          )}

          <GoldDivider />

          {/* Unseeded teams */}
          {unseededTeams.length > 0 && (
            <div>
              <p className="section-title px-4">Unseeded Teams ({unseededTeams.length})</p>
              {unseededTeams.map(team => (
                <SeedRow
                  key={team.id}
                  team={team}
                  seed={localSeeds[team.id]}
                  isLocked={lockedSeeds[team.id]}
                  onEdit={() => handleSeedEdit(team)}
                  onToggleLock={() => toggleLock(team.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit seed modal */}
      {editingTeam && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center" onClick={() => setEditingTeam(null)}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-mpl-card border border-mpl-border rounded-t-3xl p-5 animate-slide-up" onClick={e => e.stopPropagation()}>
            <p className="font-bold text-white mb-1">Edit Seed — {editingTeam.name}</p>
            <p className="text-xs text-mpl-gray mb-4">Enter seed number (leave blank to remove seed)</p>
            <input
              type="number"
              className="input-field mb-4"
              placeholder="e.g. 1, 2, 3..."
              value={newSeed}
              onChange={e => setNewSeed(e.target.value)}
              min={1}
              max={32}
              autoFocus
            />
            <div className="flex gap-3">
              <button className="btn-ghost flex-1" onClick={() => setEditingTeam(null)}>Cancel</button>
              <button className="btn-gold flex-1" onClick={handleSeedSave}>Save & Log Override</button>
            </div>
          </div>
        </div>
      )}

      <OverrideNoteDialog
        isOpen={showOverrideDialog}
        onClose={() => { setShowOverrideDialog(false); setPendingChange(null); }}
        onConfirm={handleOverrideConfirm}
        title="Seed Override Reason"
        description="This seed change will be recorded in the audit log."
      />
    </div>
  );
}

function SeedRow({
  team, seed, isLocked, onEdit, onToggleLock
}: {
  team: Team;
  seed: number | undefined;
  isLocked: boolean;
  onEdit: () => void;
  onToggleLock: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-mpl-border/40 hover:bg-mpl-card/30 transition-colors">
      <div className={cn(
        'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-black',
        seed ? 'bg-gold-gradient text-mpl-black' : 'bg-mpl-border text-mpl-gray'
      )}>
        {seed ? `#${seed}` : '?'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold text-white truncate">{team.name}</p>
        </div>
        <p className="text-xs text-mpl-gray">{team.clubName}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {!isLocked && (
          <button
            onClick={onEdit}
            className="p-2 rounded-lg text-mpl-gray hover:text-mpl-gold hover:bg-mpl-gold/10 transition-colors"
          >
            <Edit2 size={14} />
          </button>
        )}
        <button
          onClick={onToggleLock}
          className={cn(
            'p-2 rounded-lg transition-colors',
            isLocked ? 'text-mpl-gold bg-mpl-gold/10' : 'text-mpl-gray hover:text-mpl-gold hover:bg-mpl-gold/10'
          )}
          title={isLocked ? 'Unlock seed' : 'Lock seed'}
        >
          {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
        </button>
      </div>
    </div>
  );
}
