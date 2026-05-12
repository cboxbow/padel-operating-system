import { useEffect, useMemo, useState, type DragEvent } from 'react';
import {
  Shuffle, Lock, Unlock, Globe, Edit3, Plus
} from 'lucide-react';
import { useAppState, useTournamentData, useToast } from '../context';
import { TopBar } from '../components/Navigation';
import { BackButton, ConfirmDialog, GoldDivider } from '../components/UI';
import { cn } from '../lib';
import type { DrawSlot, Pool, Registration, Team } from '../types';

type DrawRoundName = '1/32' | '1/16' | '1/8' | '1/4' | '1/2' | 'FINAL' | 'WINNER';
type MainDrawSlot = DrawSlot & {
  entryRound: DrawRoundName;
  placeholder?: string;
  source?: 'team' | 'qualifier' | 'empty' | 'advance';
};

interface DrawColumn {
  name: DrawRoundName;
  entries: MainDrawSlot[];
  advances: MainDrawSlot[];
}

const ROUND_ORDER: DrawRoundName[] = ['1/32', '1/16', '1/8', '1/4', '1/2', 'FINAL', 'WINNER'];

export function MainDrawPage() {
  const { navigate, selectedTournament, setTournamentStatus } = useAppState();
  const { addToast } = useToast();
  const { addAuditLog, registrations, pools } = useTournamentData();

  const tournamentRegistrations = useMemo(() => (
    registrations.filter(r => r.tournamentId === selectedTournament?.id && r.status === 'validated')
  ), [registrations, selectedTournament?.id]);

  const validatedTeams = useMemo(() => (
    tournamentRegistrations
      .map(r => r.team)
      .sort(sortTeamsForDraw)
  ), [tournamentRegistrations]);

  const tournamentPools = useMemo(() => (
    pools
      .filter(pool => pool.tournamentId === selectedTournament?.id)
      .sort((a, b) => a.letter.localeCompare(b.letter))
  ), [pools, selectedTournament?.id]);

  const [slots, setSlots] = useState<MainDrawSlot[]>([]);
  const [drawStatus, setDrawStatus] = useState<'draft' | 'published' | 'locked'>('draft');
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [showLockConfirm, setShowLockConfirm] = useState(false);
  const [swapTarget, setSwapTarget] = useState<MainDrawSlot | null>(null);
  const [showSwapPicker, setShowSwapPicker] = useState(false);
  const [draggedSlotId, setDraggedSlotId] = useState<string | null>(null);

  const teamSignature = tournamentRegistrations
    .map(reg => `${reg.id}:${reg.team.id}:${reg.team.seed ?? ''}:${reg.team.ranking ?? ''}:${getDrawEntry(reg.notes)}`)
    .join('|');
  const poolSignature = tournamentPools.map(pool => `${pool.id}:${pool.letter}`).join('|');

  useEffect(() => {
    setSlots(buildMainDrawSlots(
      tournamentRegistrations,
      tournamentPools,
      selectedTournament?.competitionMode,
      selectedTournament?.qualifiersPerPool ?? 2,
    ));
    setDrawStatus('draft');
  }, [selectedTournament?.id, selectedTournament?.competitionMode, selectedTournament?.qualifiersPerPool, teamSignature, poolSignature]);

  const columns = useMemo(() => buildDrawColumns(slots), [slots]);
  const editableSlots = slots.filter(slot => slot.source !== 'advance');
  const totalSlots = editableSlots.length;
  const filledSlots = editableSlots.filter(s => s.team || s.isBye || s.placeholder).length;
  const byeCount = editableSlots.filter(s => s.isBye).length;
  const lockedSlots = editableSlots.filter(s => s.isLocked).length;
  const directTeams = editableSlots.filter(s => s.source === 'team').length;
  const qualifierSlots = editableSlots.filter(s => s.source === 'qualifier').length;

  const handleRandomDraw = () => {
    const lockedTeamIds = new Set(slots.filter(slot => slot.isLocked && slot.team).map(slot => slot.team!.id));
    const shuffled = [...validatedTeams]
      .filter(team => !lockedTeamIds.has(team.id))
      .sort(() => Math.random() - 0.5);

    let teamIdx = 0;
    setSlots(prev => prev.map(slot => {
      if (slot.isLocked || slot.source === 'advance') return slot;
      const team = shuffled[teamIdx++];
      return {
        ...slot,
        team,
        placeholder: team ? undefined : slot.placeholder,
        isBye: !team && slot.source === 'empty',
      };
    }));
    addAuditLog({
      action: 'MAIN_DRAW_REDRAW',
      module: 'Main Draw',
      entityType: 'draw',
      entityId: 'main-draw-local',
      description: 'Main draw redrawn randomly by Admin MPL.',
      adminId: 'adm1',
      adminName: 'Admin MPL',
      isOverride: false,
    });
    addToast({ type: 'info', title: 'Main Draw Redrawn', message: 'Locked slots preserved.' });
  };

  const handleAddMainSlot = () => {
    const entryRound = slots[0]?.entryRound ?? '1/8';
    const position = Math.max(0, ...slots.filter(slot => slot.entryRound === entryRound).map(slot => slot.position)) + 1;
    const nextSlot: MainDrawSlot = {
      id: `main-slot-manual-${Date.now()}`,
      drawId: 'main-draw-local',
      round: ROUND_ORDER.indexOf(entryRound) + 1,
      position,
      entryRound,
      isBye: false,
      isLocked: false,
      source: 'empty',
    };

    setSlots(prev => [...prev, nextSlot].sort(sortSlotsByRound));
    addToast({ type: 'success', title: 'Slot Added', message: `${entryRound} now has one more editable slot.` });
  };

  const handleToggleLock = (slotId: string) => {
    setSlots(prev => prev.map(s =>
      s.id === slotId ? { ...s, isLocked: !s.isLocked } : s
    ));
    const slot = slots.find(s => s.id === slotId);
    addToast({ type: 'info', title: slot?.isLocked ? 'Slot Unlocked' : 'Slot Locked' });
  };

  const handleSlotSwap = (slot: MainDrawSlot) => {
    setSwapTarget(slot);
    setShowSwapPicker(true);
  };

  const handleDrawSlotDrop = (targetSlot: MainDrawSlot) => {
    if (!draggedSlotId || draggedSlotId === targetSlot.id || targetSlot.source === 'advance') {
      setDraggedSlotId(null);
      return;
    }

    setSlots(prev => {
      const sourceSlot = prev.find(slot => slot.id === draggedSlotId);
      if (!sourceSlot || sourceSlot.source === 'advance') return prev;

      return prev.map(slot => {
        if (slot.id === sourceSlot.id) return moveSlotContent(slot, targetSlot);
        if (slot.id === targetSlot.id) return moveSlotContent(slot, sourceSlot);
        return slot;
      });
    });

    addAuditLog({
      action: 'MAIN_DRAW_SLOT_DRAG_SWAP',
      module: 'Main Draw',
      entityType: 'draw',
      entityId: 'main-draw-local',
      description: `Main draw slot ${draggedSlotId} swapped with ${targetSlot.id}.`,
      adminId: 'adm1',
      adminName: 'Admin MPL',
      isOverride: true,
      overrideReason: 'Manual drag-and-drop slot movement.',
    });
    addToast({ type: 'info', title: 'Slots Moved', message: 'Main draw placement updated.' });
    setDraggedSlotId(null);
  };

  const handleDrawSlotClear = (slotToClear: MainDrawSlot) => {
    if (drawStatus !== 'draft' || slotToClear.source === 'advance') return;

    setSlots(prev => prev.map(slot => (
      slot.id === slotToClear.id
        ? {
            ...slot,
            team: undefined,
            placeholder: undefined,
            source: 'empty',
            isBye: false,
            isLocked: false,
          }
        : slot
    )));
    addAuditLog({
      action: 'MAIN_DRAW_SLOT_CLEARED',
      module: 'Main Draw',
      entityType: 'draw_slot',
      entityId: slotToClear.id,
      description: `Main draw ${slotToClear.entryRound} slot ${slotToClear.position} cleared by double click.`,
      adminId: 'adm1',
      adminName: 'Admin MPL',
      isOverride: true,
      overrideReason: 'Manual double-click slot clear.',
    });
    addToast({ type: 'info', title: 'Slot Cleared', message: `${slotToClear.entryRound} slot ${slotToClear.position} is now empty.` });
  };

  const handleSwapTeam = (team: Team | 'bye' | null) => {
    if (!swapTarget) return;
    setSlots(prev => prev.map(s => {
      if (s.id !== swapTarget.id) return s;
      return {
        ...s,
        team: team === 'bye' || team === null ? undefined : team,
        placeholder: undefined,
        source: team === null ? 'empty' : s.source,
        isBye: team === 'bye',
      };
    }));
    setSwapTarget(null);
    setShowSwapPicker(false);
    addAuditLog({
      action: 'MAIN_DRAW_SLOT_EDIT',
      module: 'Main Draw',
      entityType: 'draw_slot',
      entityId: swapTarget.id,
      description: `Main draw slot ${swapTarget.position} updated to ${team === 'bye' ? 'BYE' : (team as Team)?.name ?? 'Empty'}`,
      adminId: 'adm1',
      adminName: 'Admin MPL',
      isOverride: true,
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
      action: 'MAIN_DRAW_PUBLISHED',
      module: 'Main Draw',
      entityType: 'draw',
      entityId: 'main-draw-local',
      description: 'Main draw published officially by Admin MPL.',
      adminId: 'adm1',
      adminName: 'Admin MPL',
      isOverride: false,
    });
    addToast({ type: 'success', title: 'Main Draw Published!', message: 'Bracket is now visible to all players.' });
    setShowPublishConfirm(false);
  };

  const handleLock = () => {
    setDrawStatus('locked');
    if (selectedTournament) {
      void setTournamentStatus(selectedTournament.id, 'locked');
    }
    addAuditLog({
      action: 'MAIN_DRAW_LOCKED',
      module: 'Main Draw',
      entityType: 'draw',
      entityId: 'main-draw-local',
      description: 'Main draw locked by Admin MPL.',
      adminId: 'adm1',
      adminName: 'Admin MPL',
      isOverride: false,
    });
    addToast({ type: 'warning', title: 'Main Draw Locked', message: 'No further edits possible.' });
    setShowLockConfirm(false);
  };

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
          <div className="grid grid-cols-4 gap-2 px-4 pt-4">
            {[
              { label: 'Slots', value: totalSlots },
              { label: 'Direct', value: directTeams },
              { label: 'Qualif', value: qualifierSlots },
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

          {drawStatus === 'draft' && (
            <div className="px-4 mt-4 space-y-2">
              <div className="flex gap-2">
                <button className="btn-ghost flex-1 flex items-center justify-center gap-2 text-xs" onClick={handleRandomDraw}>
                  <Shuffle size={13} /> Random Draw
                </button>
                <button className="btn-ghost flex-1 flex items-center justify-center gap-2 text-xs" onClick={handleAddMainSlot}>
                  <Plus size={13} /> Add Slot
                </button>
              </div>
              <button className="w-full btn-gold flex items-center justify-center gap-2 text-xs" onClick={() => setShowPublishConfirm(true)}>
                <Globe size={13} /> Publish Draw
              </button>
              {filledSlots < totalSlots && (
                <p className="text-xs text-orange-400 text-center">Empty slots are allowed and will publish as TBD/BYE.</p>
              )}
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

          <div className="px-4">
            <div className="flex items-center justify-between gap-3">
              <p className="section-title">Excel Style Main Draw</p>
              <p className="text-[10px] text-mpl-gray">{byeCount} BYEs</p>
            </div>
            <div className="overflow-x-auto no-scrollbar pb-2">
              <div className="flex gap-3 min-w-max">
                {columns.map(column => (
                  <div key={column.name} className="w-48 flex-shrink-0">
                    <div className="sticky top-0 z-10 bg-mpl-black pb-2">
                      <p className="text-[10px] text-mpl-gold font-black uppercase tracking-widest">{column.name}</p>
                      <p className="text-[10px] text-mpl-gray">{column.entries.length + column.advances.length} bracket lines</p>
                    </div>
                    <div className="space-y-2">
                      {[...column.entries, ...column.advances].map(slot => (
                        <DrawSlotRow
                          key={slot.id}
                          slot={slot}
                          isLocked={drawStatus === 'locked'}
                          onSwap={() => handleSlotSwap(slot)}
                          onToggleLock={() => handleToggleLock(slot.id)}
                          onDragStart={() => setDraggedSlotId(slot.id)}
                          onDrop={() => handleDrawSlotDrop(slot)}
                          onClear={() => handleDrawSlotClear(slot)}
                          onDragEnd={() => setDraggedSlotId(null)}
                          isDragging={draggedSlotId === slot.id}
                          isDraft={drawStatus === 'draft'}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showSwapPicker && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center" onClick={() => setShowSwapPicker(false)}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-mpl-card border border-mpl-border rounded-t-3xl max-h-[70vh] flex flex-col animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-mpl-border">
              <p className="font-bold text-white">Assign to {swapTarget?.entryRound} Slot {swapTarget?.position}</p>
              <button onClick={() => setShowSwapPicker(false)} className="text-mpl-gray text-lg">x</button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <button
                className="w-full p-3 rounded-xl border border-dashed border-yellow-500/40 text-yellow-400 text-sm font-semibold hover:bg-yellow-500/10 transition-colors"
                onClick={() => handleSwapTeam('bye')}
              >
                BYE / TBD slot
              </button>
              <button
                className="w-full p-3 rounded-xl border border-dashed border-mpl-border text-mpl-gray text-sm hover:border-red-400/50 hover:text-red-400 transition-colors"
                onClick={() => handleSwapTeam(null)}
              >
                Clear Slot
              </button>
              {validatedTeams.map(team => (
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
                      {team.seed ? `#${team.seed}` : team.ranking ?? '-'}
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
        message="This will make the main draw official and visible to all players. Empty slots, qualifiers and BYEs are allowed and remain part of the published bracket."
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

function buildMainDrawSlots(
  registrations: Registration[],
  pools: Pool[],
  competitionMode?: 'main_draw_direct' | 'qualification_phase',
  qualifiersPerPool = 2,
): MainDrawSlot[] {
  const directRegistrations = registrations
    .filter(reg => getDrawEntry(reg.notes) !== 'QUALIF')
    .sort((a, b) => sortTeamsForDraw(a.team, b.team));
  const entryRounds = directRegistrations
    .map(reg => normalizeDrawEntry(getDrawEntry(reg.notes)))
    .filter((round): round is DrawRoundName => Boolean(round));
  const earliestRound = getEarliestRound(entryRounds, competitionMode === 'qualification_phase' ? pools : []);
  const slots: MainDrawSlot[] = [];
  const roundPositions = new Map<DrawRoundName, number>();

  directRegistrations.forEach(reg => {
    const entryRound = normalizeDrawEntry(getDrawEntry(reg.notes)) ?? earliestRound;
    slots.push(createEntrySlot(entryRound, nextPosition(roundPositions, entryRound), reg.team, 'team'));
  });

  if (competitionMode === 'qualification_phase' && pools.length > 0) {
    const qualifyingRanks = Array.from({ length: normalizeQualifiersPerPool(qualifiersPerPool) }, (_, index) => index + 1);
    pools.forEach(pool => {
      qualifyingRanks.forEach(rank => {
        slots.push(createEntrySlot(
          earliestRound,
          nextPosition(roundPositions, earliestRound),
          undefined,
          'qualifier',
          `Q${pool.letter}${rank}`,
        ));
      });
    });
  }

  if (slots.length === 0 && registrations.length > 0) {
    registrations
      .map(reg => reg.team)
      .sort(sortTeamsForDraw)
      .forEach(team => {
        slots.push(createEntrySlot(earliestRound, nextPosition(roundPositions, earliestRound), team, 'team'));
      });
  }

  return slots.sort(sortSlotsByRound);
}

function normalizeQualifiersPerPool(value: number): number {
  return Math.max(1, Math.min(4, Math.floor(value) || 2));
}

function buildDrawColumns(slots: MainDrawSlot[]): DrawColumn[] {
  if (slots.length === 0) return [];

  const earliestIndex = Math.min(...slots.map(slot => ROUND_ORDER.indexOf(slot.entryRound)));
  const names = ROUND_ORDER.slice(Math.max(0, earliestIndex));
  let previousLineCount = 0;

  return names.map((name, columnIndex) => {
    const entries = slots.filter(slot => slot.entryRound === name).sort((a, b) => a.position - b.position);
    const advanceCount = columnIndex === 0 ? 0 : Math.max(1, Math.ceil(previousLineCount / 2));
    const advances = Array.from({ length: advanceCount }, (_, index) => createAdvanceSlot(name, index + 1));
    previousLineCount = entries.length + advances.length;
    return { name, entries, advances };
  });
}

function createEntrySlot(
  entryRound: DrawRoundName,
  position: number,
  team: Team | undefined,
  source: MainDrawSlot['source'],
  placeholder?: string,
): MainDrawSlot {
  return {
    id: `main-${entryRound.replace('/', '')}-${source}-${position}`,
    drawId: 'main-draw-local',
    round: ROUND_ORDER.indexOf(entryRound) + 1,
    position,
    entryRound,
    team,
    placeholder,
    source,
    isBye: false,
    isLocked: Boolean(team?.seed),
  };
}

function createAdvanceSlot(entryRound: DrawRoundName, position: number): MainDrawSlot {
  return {
    id: `advance-${entryRound.replace('/', '')}-${position}`,
    drawId: 'main-draw-local',
    round: ROUND_ORDER.indexOf(entryRound) + 1,
    position,
    entryRound,
    placeholder: entryRound === 'WINNER' ? 'Winner' : `Winner Match ${position}`,
    source: 'advance',
    isBye: false,
    isLocked: true,
  };
}

function nextPosition(positions: Map<DrawRoundName, number>, round: DrawRoundName): number {
  const position = (positions.get(round) ?? 0) + 1;
  positions.set(round, position);
  return position;
}

function getEarliestRound(entryRounds: DrawRoundName[], pools: Pool[]): DrawRoundName {
  if (pools.length > 0) return '1/16';
  if (entryRounds.length === 0) return '1/8';
  return entryRounds.reduce((earliest, round) => (
    ROUND_ORDER.indexOf(round) < ROUND_ORDER.indexOf(earliest) ? round : earliest
  ));
}

function getDrawEntry(notes?: string): string {
  const match = notes?.match(/Draw entry:\s*([^|]+)/i);
  return match?.[1]?.trim().toUpperCase() ?? '';
}

function normalizeDrawEntry(entry: string): DrawRoundName | undefined {
  const normalized = entry.trim().toUpperCase();
  if (normalized === 'MAIN' || normalized === 'DIRECT') return '1/8';
  if (ROUND_ORDER.includes(normalized as DrawRoundName)) return normalized as DrawRoundName;
  return undefined;
}

function sortTeamsForDraw(a: Team, b: Team): number {
  const seedDiff = (a.seed ?? Number.MAX_SAFE_INTEGER) - (b.seed ?? Number.MAX_SAFE_INTEGER);
  if (seedDiff !== 0) return seedDiff;
  const rankDiff = (a.ranking ?? Number.MAX_SAFE_INTEGER) - (b.ranking ?? Number.MAX_SAFE_INTEGER);
  if (rankDiff !== 0) return rankDiff;
  return a.name.localeCompare(b.name);
}

function sortSlotsByRound(a: MainDrawSlot, b: MainDrawSlot): number {
  const roundDiff = ROUND_ORDER.indexOf(a.entryRound) - ROUND_ORDER.indexOf(b.entryRound);
  if (roundDiff !== 0) return roundDiff;
  return a.position - b.position;
}

function moveSlotContent(target: MainDrawSlot, source: MainDrawSlot): MainDrawSlot {
  return {
    ...target,
    team: source.team,
    placeholder: source.placeholder,
    source: source.source === 'advance' ? target.source : source.source,
    isBye: source.isBye,
    isLocked: source.isLocked,
  };
}

function DrawSlotRow({
  slot, isLocked: drawLocked, onSwap, onToggleLock, onDragStart, onDrop, onClear, onDragEnd, isDragging, isDraft
}: {
  slot: MainDrawSlot;
  isLocked: boolean;
  onSwap: () => void;
  onToggleLock: () => void;
  onDragStart: () => void;
  onDrop: () => void;
  onClear: () => void;
  onDragEnd: () => void;
  isDragging: boolean;
  isDraft: boolean;
}) {
  const isAdvance = slot.source === 'advance';
  const canDrag = isDraft && !drawLocked && !isAdvance;

  return (
    <div className={cn(
      'flex items-center gap-2 p-2 rounded-xl border transition-all min-h-[58px]',
      canDrag && 'cursor-grab active:cursor-grabbing',
      isDragging && 'opacity-60 border-mpl-gold',
      slot.isBye ? 'border-yellow-500/30 bg-yellow-500/5' :
      slot.source === 'qualifier' ? 'border-cyan-500/30 bg-cyan-500/5' :
      slot.isLocked && !isAdvance ? 'border-mpl-gold/40 bg-mpl-gold/5' :
      isAdvance ? 'border-mpl-border/60 bg-mpl-card/60' :
      !slot.team ? 'border-dashed border-mpl-border' :
      'border-mpl-border bg-mpl-dark'
    )}
      draggable={canDrag}
      onDragStart={(event: DragEvent<HTMLDivElement>) => {
        event.dataTransfer.effectAllowed = 'move';
        onDragStart();
      }}
      onDragOver={(event: DragEvent<HTMLDivElement>) => {
        if (canDrag) event.preventDefault();
      }}
      onDrop={(event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        onDrop();
      }}
      onDoubleClick={() => {
        if (canDrag) onClear();
      }}
      onDragEnd={onDragEnd}
    >
      <div className="w-6 h-6 rounded bg-mpl-border flex items-center justify-center text-[10px] font-bold text-mpl-gray flex-shrink-0">
        {slot.position}
      </div>
      {slot.isBye ? (
        <span className="flex-1 text-xs font-bold text-yellow-400 uppercase tracking-widest">BYE / TBD</span>
      ) : slot.team ? (
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white truncate">{slot.team.name}</p>
          <p className="text-[10px] text-mpl-gray">{slot.team.clubName}</p>
        </div>
      ) : (
        <div className="flex-1 min-w-0">
          <p className={cn(
            'text-xs font-semibold truncate',
            slot.source === 'qualifier' ? 'text-cyan-300' :
            isAdvance ? 'text-mpl-gray' : 'text-mpl-gray'
          )}>
            {slot.placeholder ?? 'Empty'}
          </p>
          <p className="text-[10px] text-mpl-gray">{slot.source === 'qualifier' ? 'Qualified team' : slot.entryRound}</p>
        </div>
      )}
      {isDraft && !drawLocked && !isAdvance && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={onSwap} className="p-1 rounded text-mpl-gray transition-colors hover:text-mpl-gold" title="Edit slot">
            <Edit3 size={11} />
          </button>
          <button onClick={onToggleLock} className={cn('p-1 rounded transition-colors', slot.isLocked ? 'text-mpl-gold' : 'text-mpl-gray hover:text-mpl-gold')} title={slot.isLocked ? 'Unlock slot' : 'Lock slot'}>
            {slot.isLocked ? <Lock size={11} /> : <Unlock size={11} />}
          </button>
        </div>
      )}
      {slot.isLocked && !isAdvance && <Lock size={10} className="text-mpl-gold flex-shrink-0" />}
    </div>
  );
}
