import { useEffect, useMemo, useState } from 'react';
import {
  Shuffle, Lock, Unlock, Globe, Edit3
} from 'lucide-react';
import { useAppState, useTournamentData, useToast } from '../context';
import { TopBar } from '../components/Navigation';
import { BackButton, ConfirmDialog, GoldDivider } from '../components/UI';
import { cn } from '../lib';
import type { DrawSlot, Team } from '../types';

export function MainDrawPage() {
  const { navigate, selectedTournament, setTournamentStatus } = useAppState();
  const { addToast } = useToast();
  const { addAuditLog, registrations } = useTournamentData();

  const validatedTeams = useMemo(() => (
    registrations
      .filter(r => r.tournamentId === selectedTournament?.id && r.status === 'validated')
      .map(r => r.team)
      .sort((a, b) => {
        const seedDiff = (a.seed ?? Number.MAX_SAFE_INTEGER) - (b.seed ?? Number.MAX_SAFE_INTEGER);
        if (seedDiff !== 0) return seedDiff;
        return (a.ranking ?? Number.MAX_SAFE_INTEGER) - (b.ranking ?? Number.MAX_SAFE_INTEGER);
      })
  ), [registrations, selectedTournament?.id]);

  const [slots, setSlots] = useState<DrawSlot[]>([]);
  const [drawStatus, setDrawStatus] = useState<'draft' | 'published' | 'locked'>('draft');
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [showLockConfirm, setShowLockConfirm] = useState(false);
  const [swapTarget, setSwapTarget] = useState<DrawSlot | null>(null);
  const [showSwapPicker, setShowSwapPicker] = useState(false);

  const qualifiedTeams = validatedTeams;
  const teamSignature = validatedTeams.map(team => `${team.id}:${team.seed ?? ''}:${team.ranking ?? ''}`).join('|');

  useEffect(() => {
    setSlots(buildMainDrawSlots(validatedTeams));
    setDrawStatus('draft');
  }, [selectedTournament?.id, teamSignature, validatedTeams]);

  const totalSlots = slots.length;
  const filledSlots = slots.filter(s => s.team || s.isBye).length;
  const byeCount = slots.filter(s => s.isBye).length;
  const lockedSlots = slots.filter(s => s.isLocked).length;

  const handleRandomDraw = () => {
    // unlockedSlots reserved for future batched draw logic
    const lockedTeamIds = new Set(slots.filter(slot => slot.isLocked && slot.team).map(slot => slot.team!.id));
    const shuffled = [...qualifiedTeams]
      .filter(team => !lockedTeamIds.has(team.id))
      .sort(() => Math.random() - 0.5);
    let teamIdx = 0;
    const newSlots = slots.map(s => {
      if (s.isLocked) return s;
      if (teamIdx < shuffled.length) {
        return { ...s, team: shuffled[teamIdx++], isBye: false };
      }
      return { ...s, team: undefined, isBye: true };
    });
    setSlots(newSlots);
    addAuditLog({
      action: 'MAIN_DRAW_REDRAW', module: 'Main Draw',
      entityType: 'draw', entityId: 'draw1',
      description: 'Main draw redrawn randomly by Admin MPL.',
      adminId: 'adm1', adminName: 'Admin MPL', isOverride: false,
    });
    addToast({ type: 'info', title: 'Main Draw Redrawn', message: 'Locked slots preserved.' });
  };

  const handleToggleBye = (slotId: string) => {
    setSlots(prev => prev.map(s =>
      s.id === slotId ? { ...s, isBye: !s.isBye, team: s.isBye ? s.team : undefined } : s
    ));
  };

  const handleToggleLock = (slotId: string) => {
    setSlots(prev => prev.map(s =>
      s.id === slotId ? { ...s, isLocked: !s.isLocked } : s
    ));
    const slot = slots.find(s => s.id === slotId);
    addToast({ type: 'info', title: slot?.isLocked ? 'Slot Unlocked' : 'Slot Locked' });
  };

  const handleSlotSwap = (slot: DrawSlot) => {
    setSwapTarget(slot);
    setShowSwapPicker(true);
  };

  const handleSwapTeam = (team: Team | 'bye' | null) => {
    if (!swapTarget) return;
    setSlots(prev => prev.map(s =>
      s.id === swapTarget.id
        ? { ...s, team: team === 'bye' || team === null ? undefined : team, isBye: team === 'bye' }
        : s
    ));
    setSwapTarget(null);
    setShowSwapPicker(false);
    addAuditLog({
      action: 'MAIN_DRAW_SLOT_EDIT', module: 'Main Draw',
      entityType: 'draw_slot', entityId: swapTarget.id,
      description: `Main draw slot ${swapTarget.position} updated to ${team === 'bye' ? 'BYE' : (team as Team)?.name ?? 'Empty'}`,
      adminId: 'adm1', adminName: 'Admin MPL', isOverride: true,
      overrideReason: 'Manual admin placement.',
    });
    addToast({ type: 'info', title: 'Slot Updated' });
  };

  const handlePublish = () => {
    setDrawStatus('published');
    if (selectedTournament) {
      void setTournamentStatus(selectedTournament.id, 'main_draw_published');
    }
    addAuditLog({
      action: 'MAIN_DRAW_PUBLISHED', module: 'Main Draw',
      entityType: 'draw', entityId: 'draw1',
      description: 'Main draw published officially by Admin MPL.',
      adminId: 'adm1', adminName: 'Admin MPL', isOverride: false,
    });
    addToast({ type: 'success', title: 'Main Draw Published!', message: 'Bracket is now visible to all players.' });
  };

  const handleLock = () => {
    setDrawStatus('locked');
    if (selectedTournament) {
      void setTournamentStatus(selectedTournament.id, 'locked');
    }
    addAuditLog({
      action: 'MAIN_DRAW_LOCKED', module: 'Main Draw',
      entityType: 'draw', entityId: 'draw1',
      description: 'Main draw locked by Admin MPL.',
      adminId: 'adm1', adminName: 'Admin MPL', isOverride: false,
    });
    addToast({ type: 'warning', title: 'Main Draw Locked', message: 'No further edits possible.' });
  };

  // Build rounds from slots
  const rounds: DrawSlot[][] = [];
  const totalRounds = Math.ceil(Math.log2(slots.length));
  for (let r = 1; r <= totalRounds; r++) {
    rounds.push(slots.filter(s => s.round === r));
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Main Draw"
        subtitle={selectedTournament?.name}
        leftAction={<BackButton onClick={() => navigate('draw_room', selectedTournament?.id)} />}
        rightAction={
          <span className={cn(
            'status-badge',
            drawStatus === 'locked' ? 'status-locked' :
            drawStatus === 'published' ? 'status-published' : 'status-draft'
          )}>
            {drawStatus}
          </span>
        }
      />
      <div className="flex-1 overflow-y-auto">
        <div className="pb-24">

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 px-4 pt-4">
            {[
              { label: 'Slots', value: totalSlots },
              { label: 'Filled', value: filledSlots },
              { label: 'BYEs', value: byeCount },
              { label: 'Locked', value: lockedSlots },
            ].map(s => (
              <div key={s.label} className="mpl-card p-3 text-center">
                <p className="text-lg font-black text-mpl-gold">{s.value}</p>
                <p className="text-[9px] text-mpl-gray uppercase tracking-widest mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {validatedTeams.length === 0 && (
            <div className="mx-4 mt-4 rounded-xl border border-mpl-gold/30 bg-mpl-gold/10 px-3 py-3 text-xs text-mpl-gold">
              No validated teams found for this tournament. Validate or import teams first.
            </div>
          )}

          {/* Actions */}
          {drawStatus === 'draft' && (
            <div className="px-4 mt-4 space-y-2">
              <div className="flex gap-2">
                <button className="btn-ghost flex-1 flex items-center justify-center gap-2 text-xs" onClick={handleRandomDraw}>
                  <Shuffle size={13} /> Random Draw
                </button>
                <button className="btn-gold flex-1 flex items-center justify-center gap-2 text-xs" onClick={() => setShowPublishConfirm(true)}>
                  <Globe size={13} /> Publish Draw
                </button>
              </div>
            </div>
          )}
          {drawStatus === 'published' && (
            <div className="px-4 mt-4">
              <button className="w-full btn-danger flex items-center justify-center gap-2" onClick={() => setShowLockConfirm(true)}>
                <Lock size={14} /> Lock Main Draw
              </button>
            </div>
          )}
          {drawStatus === 'locked' && (
            <div className="mx-4 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
              <Lock size={14} className="text-red-400" />
              <p className="text-xs text-red-400 font-semibold">Main draw is locked. No further edits allowed.</p>
            </div>
          )}

          <GoldDivider />

          {/* Bracket Visualization */}
          <div className="px-4">
            <p className="section-title">Round 1 — Main Draw Bracket</p>
            <div className="space-y-2">
              {slots.map((slot, i) => {
                if (i % 2 !== 0) return null;
                const slotA = slot;
                const slotB = slots[i + 1];
                return (
                  <div key={slotA.id} className="mpl-card p-3">
                    <div className="text-[9px] text-mpl-gray font-bold uppercase tracking-widest mb-2 px-1">Match {Math.floor(i / 2) + 1}</div>
                    <div className="space-y-1.5">
                      {[slotA, slotB].filter(Boolean).map(s => (
                        <DrawSlotRow
                          key={s.id}
                          slot={s}
                          isLocked={drawStatus === 'locked'}
                          onSwap={() => handleSlotSwap(s)}
                          onToggleLock={() => handleToggleLock(s.id)}
                          _onToggleBye={() => handleToggleBye(s.id)}
                          isDraft={drawStatus === 'draft'}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Team Swap Picker */}
      {showSwapPicker && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center" onClick={() => setShowSwapPicker(false)}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-mpl-card border border-mpl-border rounded-t-3xl max-h-[70vh] flex flex-col animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-mpl-border">
              <p className="font-bold text-white">Assign to Slot {swapTarget?.position}</p>
              <button onClick={() => setShowSwapPicker(false)} className="text-mpl-gray text-lg">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <button
                className="w-full p-3 rounded-xl border border-dashed border-yellow-500/40 text-yellow-400 text-sm font-semibold hover:bg-yellow-500/10 transition-colors"
                onClick={() => handleSwapTeam('bye')}
              >
                BYE (automatic advancement)
              </button>
              <button
                className="w-full p-3 rounded-xl border border-dashed border-mpl-border text-mpl-gray text-sm hover:border-red-400/50 hover:text-red-400 transition-colors"
                onClick={() => handleSwapTeam(null)}
              >
                Clear Slot
              </button>
              {qualifiedTeams.map(team => (
                <button
                  key={team.id}
                  onClick={() => handleSwapTeam(team)}
                  className="w-full p-3 rounded-xl border border-mpl-border bg-mpl-dark text-left hover:border-mpl-gold/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0',
                      team.seed ? 'bg-gold-gradient text-mpl-black' : 'bg-mpl-border text-mpl-gray'
                    )}>
                      {team.seed ? `#${team.seed}` : 'Q'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{team.name}</p>
                      <p className="text-xs text-mpl-gray">{team.clubName}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={showPublishConfirm}
        onClose={() => setShowPublishConfirm(false)}
        onConfirm={handlePublish}
        title="Publish Main Draw?"
        message="This will make the main draw official and visible to all players. This action will be logged in the audit trail."
        confirmLabel="Publish Official Draw"
        variant="gold"
      />
      <ConfirmDialog
        isOpen={showLockConfirm}
        onClose={() => setShowLockConfirm(false)}
        onConfirm={handleLock}
        title="Lock Main Draw?"
        message="Locking the main draw will prevent any further edits. This is typically done after the tournament is complete. Only a super admin can unlock."
        confirmLabel="Lock Draw"
        variant="danger"
      />
    </div>
  );
}

function buildMainDrawSlots(teams: Team[]): DrawSlot[] {
  if (teams.length === 0) return [];

  const bracketSize = nextPowerOfTwo(Math.max(2, teams.length));
  return Array.from({ length: bracketSize }, (_, index) => {
    const team = teams[index];
    const isBye = !team;
    return {
      id: `main-slot-${index + 1}`,
      drawId: 'main-draw-local',
      round: 1,
      position: index + 1,
      team,
      isBye,
      isLocked: Boolean(team?.seed),
    };
  });
}

function nextPowerOfTwo(value: number): number {
  let size = 1;
  while (size < value) size *= 2;
  return size;
}

function DrawSlotRow({
  slot, isLocked: drawLocked, onSwap, onToggleLock, _onToggleBye: _ob, isDraft
}: {
  slot: DrawSlot;
  isLocked: boolean;
  onSwap: () => void;
  onToggleLock: () => void;
  _onToggleBye: () => void;
  isDraft: boolean;
}) {
  return (
    <div className={cn(
      'flex items-center gap-2 p-2 rounded-xl border transition-all',
      slot.isBye ? 'border-yellow-500/30 bg-yellow-500/5' :
      slot.isLocked ? 'border-mpl-gold/40 bg-mpl-gold/5' :
      !slot.team ? 'border-dashed border-mpl-border' :
      'border-mpl-border bg-mpl-dark'
    )}>
      <div className="w-6 h-6 rounded bg-mpl-border flex items-center justify-center text-[10px] font-bold text-mpl-gray flex-shrink-0">
        {slot.position}
      </div>
      {slot.isBye ? (
        <span className="flex-1 text-xs font-bold text-yellow-400 uppercase tracking-widest">BYE</span>
      ) : slot.team ? (
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white truncate">{slot.team.name}</p>
          <p className="text-[10px] text-mpl-gray">{slot.team.clubName}</p>
        </div>
      ) : (
        <span className="flex-1 text-xs text-mpl-gray italic">Empty</span>
      )}
      {isDraft && !drawLocked && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={onSwap} className="p-1 rounded text-mpl-gray transition-colors hover:text-mpl-gold">
            <Edit3 size={11} />
          </button>
          <button onClick={onToggleLock} className={cn('p-1 rounded transition-colors', slot.isLocked ? 'text-mpl-gold' : 'text-mpl-gray hover:text-mpl-gold')}>
            {slot.isLocked ? <Lock size={11} /> : <Unlock size={11} />}
          </button>
        </div>
      )}
      {slot.isLocked && <Lock size={10} className="text-mpl-gold flex-shrink-0" />}
    </div>
  );
}
