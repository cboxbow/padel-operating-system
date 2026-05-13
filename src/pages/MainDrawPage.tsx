import { useEffect, useMemo, useState, type DragEvent } from 'react';
import {
  Shuffle, Lock, Unlock, Globe, Edit3, Plus, RotateCcw, Radio
} from 'lucide-react';
import { useAppState, useTournamentData, useToast } from '../context';
import { TopBar } from '../components/Navigation';
import { BackButton, ConfirmDialog, GoldDivider } from '../components/UI';
import { cn } from '../lib';
import { fetchAdminMainDraw, publishMainDraw, unlockMainDraw, type PersistedMainDrawMatch, type PersistedMainDrawSlot } from '../data/mainDraw';
import { openOBSWindow } from '../obs';
import type { DrawSlot, MatchSet, Pool, Registration, ScheduledMatch, Team } from '../types';

type DrawRoundName = '1/32' | '1/16' | '1/8' | '1/4' | '1/2' | 'FINAL' | 'WINNER';
type MainDrawSlot = DrawSlot & {
  entryRound: DrawRoundName;
  placeholder?: string;
  candidateTeam?: Team;
  source?: 'team' | 'qualifier' | 'empty' | 'advance';
};
type DrawSetupMode = 'manual' | 'seed_labels';

interface BracketRound {
  name: DrawRoundName;
  matches: BracketMatch[];
}

interface BracketMatch {
  id: string;
  roundName: DrawRoundName;
  matchNumber: number;
  slots: MainDrawSlot[];
}

const ROUND_ORDER: DrawRoundName[] = ['1/32', '1/16', '1/8', '1/4', '1/2', 'FINAL', 'WINNER'];
const BRACKET_BAND_HEIGHT = 104;

export function MainDrawPage() {
  const { navigate, selectedTournament, setTournamentStatus } = useAppState();
  const { addToast } = useToast();
  const { addAuditLog, registrations, pools, matches, refreshMatches } = useTournamentData();

  const tournamentRegistrations = useMemo(() => (
    registrations.filter(r => r.tournamentId === selectedTournament?.id && r.status === 'validated')
  ), [registrations, selectedTournament?.id]);

  const validatedTeams = useMemo(() => (
    tournamentRegistrations
      .map(r => r.team)
      .sort(sortTeamsForDraw)
  ), [tournamentRegistrations]);
  const directTeams = useMemo(() => (
    tournamentRegistrations
      .filter(reg => getDrawEntry(reg.notes) !== 'QUALIF')
      .map(reg => reg.team)
      .sort(sortTeamsForDraw)
  ), [tournamentRegistrations]);
  const poolTeams = useMemo(() => (
    tournamentRegistrations
      .filter(reg => getDrawEntry(reg.notes) === 'QUALIF')
      .map(reg => reg.team)
      .sort(sortTeamsForDraw)
  ), [tournamentRegistrations]);

  const tournamentPools = useMemo(() => (
    pools
      .filter(pool => pool.tournamentId === selectedTournament?.id)
      .sort((a, b) => a.letter.localeCompare(b.letter))
  ), [pools, selectedTournament?.id]);
  const tournamentMatches = useMemo(() => (
    matches.filter(match => match.tournamentId === selectedTournament?.id && match.poolId)
  ), [matches, selectedTournament?.id]);

  const [slots, setSlots] = useState<MainDrawSlot[]>([]);
  const [persistedDrawId, setPersistedDrawId] = useState<string | null>(null);
  const [drawStatus, setDrawStatus] = useState<'draft' | 'published' | 'locked'>('draft');
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [showLockConfirm, setShowLockConfirm] = useState(false);
  const [showUnlockConfirm, setShowUnlockConfirm] = useState(false);
  const [swapTarget, setSwapTarget] = useState<MainDrawSlot | null>(null);
  const [showSwapPicker, setShowSwapPicker] = useState(false);
  const [draggedSlotId, setDraggedSlotId] = useState<string | null>(null);
  const [setupMode, setSetupMode] = useState<DrawSetupMode>('manual');

  const teamSignature = tournamentRegistrations
    .map(reg => `${reg.id}:${reg.team.id}:${reg.team.seed ?? ''}:${reg.team.ranking ?? ''}:${getDrawEntry(reg.notes)}`)
    .join('|');
  const poolSignature = tournamentPools
    .map(pool => `${pool.id}:${pool.letter}:${pool.slots.map(slot => `${slot.position}:${slot.team?.id ?? ''}`).join(',')}`)
    .join('|');
  const teamById = useMemo(() => (
    new Map(tournamentRegistrations.map(reg => [reg.team.id, reg.team]))
  ), [tournamentRegistrations]);

  useEffect(() => {
    let cancelled = false;

    async function loadMainDraw() {
      if (!selectedTournament) return;

      try {
        const savedDraw = await fetchAdminMainDraw(selectedTournament.id);
        if (cancelled) return;

        if (savedDraw && savedDraw.slots.length > 0) {
          setSlots(savedDraw.slots.map(slot => hydratePersistedSlot(slot, teamById)));
          setPersistedDrawId(savedDraw.drawId);
          setDrawStatus(savedDraw.status);
          return;
        }
      } catch (error) {
        addToast({
          type: 'warning',
          title: 'Main Draw Load Warning',
          message: error instanceof Error ? error.message : 'Unable to load saved main draw.',
        });
      }

      if (!cancelled) {
        setSlots(buildMainDrawSlots(
          tournamentRegistrations,
          tournamentPools,
          selectedTournament.competitionMode,
          selectedTournament.qualifiersPerPool ?? 2,
          setupMode,
        ));
        setPersistedDrawId(null);
        setDrawStatus('draft');
      }
    }

    void loadMainDraw();

    return () => {
      cancelled = true;
    };
  }, [selectedTournament?.id, selectedTournament?.competitionMode, selectedTournament?.qualifiersPerPool, setupMode, teamSignature, poolSignature, teamById, addToast]);

  const mainDrawMatches = useMemo(() => (
    matches
      .filter(match => (
        match.tournamentId === selectedTournament?.id &&
        !match.poolId &&
        (!persistedDrawId || match.drawId === persistedDrawId)
      ))
      .sort((a, b) => (a.round - b.round) || (a.matchNumber - b.matchNumber))
  ), [matches, persistedDrawId, selectedTournament?.id]);
  const bracketRounds = useMemo(() => buildBracketRounds(slots, mainDrawMatches, teamById), [slots, mainDrawMatches, teamById]);
  const editableSlots = slots.filter(slot => slot.source !== 'advance');
  const totalSlots = editableSlots.length;
  const filledSlots = editableSlots.filter(s => s.team || s.isBye || s.placeholder).length;
  const byeCount = slots.filter(s => s.isBye).length;
  const lockedSlots = editableSlots.filter(s => s.isLocked).length;
  const directSlotCount = editableSlots.filter(s => s.source === 'team').length;
  const qualifierSlots = editableSlots.filter(s => s.source === 'qualifier').length;
  const incompletePools = tournamentPools.filter(pool => !isPoolComplete(pool, tournamentMatches.filter(match => match.poolId === pool.id)));
  const qualifiedTeamOptions = useMemo(() => (
    Array.from(buildQualifierMap(tournamentPools, tournamentMatches, selectedTournament?.qualifiersPerPool ?? 2).values())
  ), [tournamentMatches, tournamentPools, selectedTournament?.qualifiersPerPool]);
  const qualifiedTeamIds = new Set(qualifiedTeamOptions.map(team => team.id));
  const placedTeamIds = new Set(
    editableSlots
      .filter(slot => slot.id !== swapTarget?.id)
      .map(slot => slot.team?.id)
      .filter((id): id is string => Boolean(id))
  );
  const availableDirectTeams = directTeams.filter(team => !placedTeamIds.has(team.id));
  const availableQualifiedTeams = qualifiedTeamOptions.filter(team => !placedTeamIds.has(team.id));
  const availablePoolTeams = poolTeams.filter(team => !placedTeamIds.has(team.id));
  const pickerTeamGroups = swapTarget?.source === 'qualifier'
    ? [
        { label: 'Qualified from pools', teams: availableQualifiedTeams },
        { label: 'All pool teams', teams: availablePoolTeams.filter(team => !qualifiedTeamIds.has(team.id)) },
      ]
    : [
        { label: 'Direct / seeded teams', teams: availableDirectTeams },
        { label: 'Qualified from pools', teams: availableQualifiedTeams.filter(team => !directTeams.some(direct => direct.id === team.id)) },
      ];

  const handleAutoFillDirect = () => {
    setSlots(prev => {
      const usedTeamIds = new Set(prev.map(slot => slot.team?.id).filter(Boolean));
      return prev.map(slot => {
        if (slot.source !== 'team' || slot.team || !slot.candidateTeam || usedTeamIds.has(slot.candidateTeam.id)) {
          return slot;
        }
        usedTeamIds.add(slot.candidateTeam.id);
        return {
          ...slot,
          team: slot.candidateTeam,
          isBye: false,
          isLocked: Boolean(slot.candidateTeam.seed),
        };
      });
    });
    addToast({ type: 'success', title: 'Direct Slots Filled', message: 'Seeded/direct teams placed into their main draw slots.' });
  };

  const handleAutoFillQualifiers = () => {
    const qualifiersByCode = buildQualifierMap(tournamentPools, tournamentMatches, selectedTournament?.qualifiersPerPool ?? 2);
    if (qualifiersByCode.size === 0 || incompletePools.length > 0) {
      addToast({
        type: 'warning',
        title: 'Pool Results Pending',
        message: 'Complete all pool match scores before filling qualified teams into the main draw.',
      });
      return;
    }
    setSlots(prev => prev.map(slot => {
      if (slot.source !== 'qualifier' || !slot.placeholder) return slot;
      const team = qualifiersByCode.get(slot.placeholder);
      if (!team) return slot;
      return {
        ...slot,
        team,
        isBye: false,
        isLocked: false,
      };
    }));
    addToast({ type: 'success', title: 'Qualifiers Filled', message: 'Pool qualifiers placed by pool/rank code.' });
  };

  const handleResetMainDraw = () => {
    setSlots(buildMainDrawSlots(
      tournamentRegistrations,
      tournamentPools,
      selectedTournament?.competitionMode,
      selectedTournament?.qualifiersPerPool ?? 2,
      setupMode,
    ));
    setDrawStatus('draft');
    addToast({ type: 'warning', title: 'Main Draw Reset', message: 'Bracket returned to generated slots.' });
  };

  const handleRandomDraw = () => {
    const lockedTeamIds = new Set(slots.filter(slot => slot.isLocked && slot.team).map(slot => slot.team!.id));
    const shuffled = [...directTeams]
      .filter(team => !lockedTeamIds.has(team.id))
      .sort(() => Math.random() - 0.5);

    let teamIdx = 0;
    setSlots(prev => prev.map(slot => {
      if (slot.isLocked || slot.source !== 'team') return slot;
      const team = shuffled[teamIdx++];
      return {
        ...slot,
        team,
        isBye: false,
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
    const slot = slots.find(s => s.id === slotId) ?? bracketRounds
      .flatMap(round => round.matches)
      .flatMap(match => match.slots)
      .find(s => s.id === slotId);

    if (!slot) return;

    setSlots(prev => upsertMainDrawSlot(prev, { ...slot, isLocked: !slot.isLocked }));
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

      const targetExists = prev.some(slot => slot.id === targetSlot.id);
      const swapped = prev.map(slot => {
        if (slot.id === sourceSlot.id) return moveSlotContent(slot, targetSlot);
        if (slot.id === targetSlot.id) return moveSlotContent(slot, sourceSlot);
        return slot;
      });

      return targetExists
        ? swapped.sort(sortSlotsByRound)
        : upsertMainDrawSlot(swapped, moveSlotContent(targetSlot, sourceSlot));
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

    setSlots(prev => upsertMainDrawSlot(prev, clearEditableSlot(slotToClear)));
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
    setSlots(prev => {
      const existingTarget = prev.find(slot => slot.id === swapTarget.id) ?? swapTarget;
      const updatedSlot = team === null
        ? clearEditableSlot(existingTarget)
        : {
            ...existingTarget,
            team: team === 'bye' ? undefined : team,
            placeholder: team === 'bye' ? 'BYE' : existingTarget.source === 'qualifier' ? existingTarget.placeholder : undefined,
            candidateTeam: team === 'bye' ? undefined : existingTarget.candidateTeam,
            isBye: team === 'bye',
          };

      return upsertMainDrawSlot(prev, updatedSlot);
    });
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

  const handlePublish = async () => {
    if (!selectedTournament) return;

    try {
      await publishMainDraw(
        selectedTournament.id,
        serializeMainDrawSlots(slots),
        serializeMainDrawMatches(bracketRounds),
      );
      await refreshMatches();
      await setTournamentStatus(selectedTournament.id, 'main_draw_published');
      setPersistedDrawId(null);
      setDrawStatus('published');
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
      addToast({ type: 'success', title: 'Main Draw Published!', message: 'Bracket, slots and matches saved to Supabase.' });
      setShowPublishConfirm(false);
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Publish Failed',
        message: error instanceof Error ? error.message : 'Unable to publish main draw.',
      });
    }
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

  const handleUnlock = async () => {
    if (!selectedTournament) return;

    try {
      await unlockMainDraw(selectedTournament.id);
      await setTournamentStatus(selectedTournament.id, 'main_draw_ready');
      setDrawStatus('draft');
      addAuditLog({
        action: 'MAIN_DRAW_UNLOCKED',
        module: 'Main Draw',
        entityType: 'draw',
        entityId: 'main-draw-local',
        description: 'Main draw unlocked by Admin MPL for editing.',
        adminId: 'adm1',
        adminName: 'Admin MPL',
        isOverride: true,
        overrideReason: 'Admin unlock requested.',
      });
      addToast({ type: 'success', title: 'Main Draw Unlocked', message: 'Editing is available again. Republish when ready.' });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Unlock Failed',
        message: error instanceof Error ? error.message : 'Unable to unlock main draw.',
      });
    } finally {
      setShowUnlockConfirm(false);
    }
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
              { label: 'Direct', value: directSlotCount },
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

          <div className="px-4 mt-4">
            <button
              className="w-full btn-ghost flex items-center justify-center gap-2 text-xs border-green-500/30 text-green-300"
              onClick={() => openOBSWindow('obs_main_draw', selectedTournament?.id)}
            >
              <Radio size={13} /> OBS Live
            </button>
          </div>

          {drawStatus === 'draft' && (
            <div className="px-4 mt-4 space-y-2">
              <div>
                <select
                  className="input-field py-2 text-xs"
                  value={setupMode}
                  onChange={event => setSetupMode(event.target.value as DrawSetupMode)}
                >
                  <option value="manual">Manual setup - all playable slots empty</option>
                  <option value="seed_labels">Seed labels setup - show seed/direct placeholders</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button className="btn-ghost flex-1 flex items-center justify-center gap-2 text-xs" onClick={handleAutoFillDirect}>
                  <Shuffle size={13} /> Auto Fill Direct
                </button>
                <button className="btn-ghost flex-1 flex items-center justify-center gap-2 text-xs" onClick={handleAutoFillQualifiers}>
                  <Shuffle size={13} /> Auto Fill Qualif
                </button>
              </div>
              <div className="flex gap-2">
                <button className="btn-ghost flex-1 flex items-center justify-center gap-2 text-xs" onClick={handleRandomDraw}>
                  <Shuffle size={13} /> Random Draw
                </button>
                <button className="btn-ghost flex-1 flex items-center justify-center gap-2 text-xs" onClick={handleAddMainSlot}>
                  <Plus size={13} /> Add Slot
                </button>
              </div>
              <button className="w-full btn-ghost flex items-center justify-center gap-2 text-xs text-red-300 border-red-500/30" onClick={handleResetMainDraw}>
                <RotateCcw size={13} /> Reset Main Draw
              </button>
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
              <Lock size={14} className="text-red-400 flex-shrink-0" />
              <p className="flex-1 text-xs text-red-400 font-semibold">Main draw is locked. Unlock it to edit and republish.</p>
              <button
                className="btn-ghost flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-mpl-gold border-mpl-gold/30"
                onClick={() => setShowUnlockConfirm(true)}
              >
                <Unlock size={12} /> Unlock
              </button>
            </div>
          )}

          <GoldDivider />

          <div className="px-4">
            <div className="flex items-center justify-between gap-3">
              <p className="section-title">Main Draw Bracket</p>
              <p className="text-[10px] text-mpl-gray">{byeCount} BYEs</p>
            </div>
            <div className="overflow-x-auto no-scrollbar pb-2">
              <div className="flex gap-3 min-w-max items-start">
                {bracketRounds.map((round, roundIndex) => (
                  <div key={round.name} className="w-48 flex-shrink-0">
                    <div className="sticky top-0 z-10 bg-mpl-black pb-2">
                      <p className="text-[10px] text-mpl-gold font-black uppercase tracking-widest">{round.name}</p>
                      <p className="text-[10px] text-mpl-gray">{round.matches.length} matches</p>
                    </div>
                    <div>
                      {round.matches.map(match => (
                        <BracketMatchCard
                          key={match.id}
                          match={match}
                          roundIndex={roundIndex}
                          isLastRound={roundIndex === bracketRounds.length - 1}
                          drawLocked={drawStatus === 'locked'}
                          isDraft={drawStatus === 'draft'}
                          draggedSlotId={draggedSlotId}
                          onSlotSwap={handleSlotSwap}
                          onToggleLock={handleToggleLock}
                          onDragStart={setDraggedSlotId}
                          onDrop={handleDrawSlotDrop}
                          onClear={handleDrawSlotClear}
                          onDragEnd={() => setDraggedSlotId(null)}
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
              {swapTarget?.source === 'qualifier' && swapTarget.placeholder && (
                <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2">
                  <p className="text-xs font-bold text-cyan-300">{swapTarget.placeholder}</p>
                  <p className="text-[11px] text-mpl-gray">
                    {incompletePools.length > 0 ? 'Pending pool results before official qualifiers are available.' : 'Use Auto Fill Qualif or choose the qualified team manually.'}
                  </p>
                </div>
              )}
              <button
                className="w-full p-3 rounded-xl border border-dashed border-yellow-500/40 text-yellow-400 text-sm font-semibold hover:bg-yellow-500/10 transition-colors"
                onClick={() => handleSwapTeam('bye')}
              >
                BYE slot
              </button>
              <button
                className="w-full p-3 rounded-xl border border-dashed border-mpl-border text-mpl-gray text-sm hover:border-red-400/50 hover:text-red-400 transition-colors"
                onClick={() => handleSwapTeam(null)}
              >
                Clear Slot
              </button>
              {pickerTeamGroups.map(group => (
                group.teams.length > 0 && (
                  <div key={group.label} className="space-y-2">
                    <p className="px-1 pt-2 text-[10px] font-black uppercase tracking-widest text-mpl-gray">{group.label}</p>
                    {dedupeTeams(group.teams).map(team => (
                      <button
                        key={team.id}
                        onClick={() => handleSwapTeam(team)}
                        className="w-full p-3 rounded-xl border border-mpl-border bg-mpl-dark text-left hover:border-mpl-gold/40 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0',
                            team.seed ? 'bg-gold-gradient text-mpl-black' : qualifiedTeamIds.has(team.id) ? 'bg-cyan-500/20 text-cyan-300' : 'bg-mpl-border text-mpl-gray'
                          )}>
                            {team.seed ? `#${team.seed}` : qualifiedTeamIds.has(team.id) ? 'Q' : team.ranking ?? '-'}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">{team.name}</p>
                            <p className="text-xs text-mpl-gray">{team.clubName}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )
              ))}
              {pickerTeamGroups.every(group => group.teams.length === 0) && (
                <div className="rounded-xl border border-mpl-border bg-mpl-dark px-3 py-4 text-center">
                  <p className="text-sm font-semibold text-white">No teams available</p>
                  <p className="text-xs text-mpl-gray mt-1">
                    Complete pool scores and use Auto Fill Qualif, or validate direct teams first.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={showPublishConfirm}
        onClose={() => setShowPublishConfirm(false)}
        onConfirm={() => void handlePublish()}
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
      <ConfirmDialog
        isOpen={showUnlockConfirm}
        onClose={() => setShowUnlockConfirm(false)}
        onConfirm={() => void handleUnlock()}
        title="Unlock Main Draw?"
        message="This will reopen the saved draw for editing and hide it from the public view until you publish it again."
        confirmLabel="Unlock Draw"
        variant="gold"
      />
    </div>
  );
}

function buildMainDrawSlots(
  registrations: Registration[],
  pools: Pool[],
  competitionMode?: 'main_draw_direct' | 'qualification_phase',
  qualifiersPerPool = 2,
  setupMode: DrawSetupMode = 'manual',
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
    const startRound = getStartRoundForEntry(entryRound);
    slots.push(createEntrySlot(
      startRound,
      nextPosition(roundPositions, startRound),
      undefined,
      'team',
      setupMode === 'manual' ? undefined : buildDirectSlotLabel(reg.team, entryRound),
      reg.team,
    ));

    if (startRound !== entryRound) {
      slots.push(createManualEmptySlot(startRound, nextPosition(roundPositions, startRound)));
    }
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
        const startRound = getStartRoundForEntry(earliestRound);
        slots.push(createEntrySlot(
          startRound,
          nextPosition(roundPositions, startRound),
          undefined,
          'team',
          setupMode === 'manual' ? undefined : buildDirectSlotLabel(team, earliestRound),
          team,
        ));
        if (startRound !== earliestRound) {
          slots.push(createManualEmptySlot(startRound, nextPosition(roundPositions, startRound)));
        }
      });
  }

  return slots.sort(sortSlotsByRound);
}

function hydratePersistedSlot(slot: PersistedMainDrawSlot, teamById: Map<string, Team>): MainDrawSlot {
  const team = slot.teamId ? teamById.get(slot.teamId) : undefined;
  const entryRound = ROUND_ORDER[slot.round - 1] ?? '1/16';

  return {
    id: slot.id,
    drawId: 'main-draw-supabase',
    round: slot.round,
    position: slot.position,
    entryRound,
    team,
    isBye: slot.isBye,
    isLocked: slot.isLocked,
    winnerId: slot.winnerId ?? undefined,
    placeholder: slot.isBye ? 'BYE' : undefined,
    source: team ? 'team' : 'empty',
  };
}

function serializeMainDrawSlots(slots: MainDrawSlot[]): PersistedMainDrawSlot[] {
  return slots
    .filter(slot => slot.source !== 'advance')
    .map(slot => ({
      id: slot.id,
      round: slot.round,
      position: slot.position,
      teamId: slot.team?.id ?? null,
      isBye: slot.isBye,
      isLocked: slot.isLocked,
      winnerId: slot.winnerId ?? null,
    }));
}

function serializeMainDrawMatches(rounds: BracketRound[]): PersistedMainDrawMatch[] {
  let matchNumber = 1;
  const persisted: PersistedMainDrawMatch[] = [];

  rounds.forEach(round => {
    if (round.name === 'WINNER') return;

    round.matches.forEach(match => {
      if (match.slots.length < 2) return;
      const [first, second] = match.slots;
      const autoWinner = getAutomaticByeWinner(match);

      persisted.push({
        round: ROUND_ORDER.indexOf(match.roundName) + 1,
        matchNumber: matchNumber++,
        team1Id: first.team?.id ?? null,
        team2Id: second.team?.id ?? null,
        isBye: first.isBye || second.isBye,
        winnerId: autoWinner?.team?.id ?? null,
        status: autoWinner?.team ? 'completed' : 'scheduled',
      });
    });
  });

  return persisted;
}

function normalizeQualifiersPerPool(value: number): number {
  return Math.max(1, Math.min(4, Math.floor(value) || 2));
}

function buildDirectSlotLabel(team: Team, entryRound: DrawRoundName): string {
  if (team.seed) return `Seed #${team.seed}`;
  if (team.ranking) return `Direct ${entryRound} · W${team.ranking}`;
  return `Direct ${entryRound}`;
}

function buildQualifierMap(pools: Pool[], matches: ScheduledMatch[], qualifiersPerPool: number): Map<string, Team> {
  const map = new Map<string, Team>();
  const limit = normalizeQualifiersPerPool(qualifiersPerPool);

  pools.forEach(pool => {
    const poolMatches = matches.filter(match => match.poolId === pool.id);
    if (!isPoolComplete(pool, poolMatches)) return;

    const rankedTeams = calculatePoolStandings(pool, matches.filter(match => match.poolId === pool.id))
      .slice(0, limit);

    rankedTeams.forEach((standing, index) => {
      map.set(`Q${pool.letter}${index + 1}`, standing.team);
    });
  });

  return map;
}

function expectedPoolMatchCount(pool: Pool): number {
  const teamCount = pool.slots.filter(slot => slot.team).length;
  return (teamCount * (teamCount - 1)) / 2;
}

function completedPoolMatchCount(matches: ScheduledMatch[]): number {
  return matches.filter(match => match.status === 'completed').length;
}

function isPoolComplete(pool: Pool, matches: ScheduledMatch[]): boolean {
  const expected = expectedPoolMatchCount(pool);
  return expected > 0 && matches.length >= expected && completedPoolMatchCount(matches) >= expected;
}

function calculatePoolStandings(pool: Pool, matches: ScheduledMatch[]) {
  const rows = pool.slots
    .filter(slot => slot.team)
    .map(slot => ({
      team: slot.team!,
      wins: 0,
      losses: 0,
      gamesWon: 0,
      gamesLost: 0,
      initialPosition: slot.position,
    }));

  const byTeamId = new Map(rows.map(row => [row.team.id, row]));

  matches.filter(match => match.status === 'completed').forEach(match => {
    if (!match.team1 || !match.team2) return;
    const row1 = byTeamId.get(match.team1.id);
    const row2 = byTeamId.get(match.team2.id);
    if (!row1 || !row2) return;

    match.sets.forEach((set: MatchSet) => {
      row1.gamesWon += set.team1Score;
      row1.gamesLost += set.team2Score;
      row2.gamesWon += set.team2Score;
      row2.gamesLost += set.team1Score;
    });

    if (match.winnerId === match.team1.id) {
      row1.wins += 1;
      row2.losses += 1;
    } else if (match.winnerId === match.team2.id) {
      row2.wins += 1;
      row1.losses += 1;
    }
  });

  return rows.sort((a, b) => {
    const winDiff = b.wins - a.wins;
    if (winDiff !== 0) return winDiff;
    const gameDiff = (b.gamesWon - b.gamesLost) - (a.gamesWon - a.gamesLost);
    if (gameDiff !== 0) return gameDiff;
    const seedDiff = (a.team.seed ?? Number.MAX_SAFE_INTEGER) - (b.team.seed ?? Number.MAX_SAFE_INTEGER);
    if (seedDiff !== 0) return seedDiff;
    const rankingDiff = (a.team.ranking ?? Number.MAX_SAFE_INTEGER) - (b.team.ranking ?? Number.MAX_SAFE_INTEGER);
    if (rankingDiff !== 0) return rankingDiff;
    return a.initialPosition - b.initialPosition;
  });
}

function getStartRoundForEntry(entryRound: DrawRoundName): DrawRoundName {
  const entryIndex = ROUND_ORDER.indexOf(entryRound);
  const roundOf16Index = ROUND_ORDER.indexOf('1/16');
  if (entryIndex > roundOf16Index && entryIndex < ROUND_ORDER.indexOf('WINNER')) {
    return ROUND_ORDER[entryIndex - 1];
  }
  return entryRound;
}

function buildBracketRounds(
  slots: MainDrawSlot[],
  persistedMatches: ScheduledMatch[] = [],
  teamById: Map<string, Team> = new Map(),
): BracketRound[] {
  if (slots.length === 0) return [];

  const earliestIndex = Math.min(...slots.map(slot => ROUND_ORDER.indexOf(slot.entryRound)));
  const names = ROUND_ORDER.slice(Math.max(0, earliestIndex));
  const rounds: BracketRound[] = [];
  let carriedWinners: MainDrawSlot[] = [];

  names.forEach((name, roundIndex) => {
    const entrySlots = slots
      .filter(slot => slot.entryRound === name)
      .sort((a, b) => a.position - b.position);

    if (name === 'WINNER') {
      const winnerSlot = createAdvanceSlot(name, 1, 'Tournament Winner');
      rounds.push({
        name,
        matches: [{
          id: `${name}-match-1`,
          roundName: name,
          matchNumber: 1,
          slots: [winnerSlot],
        }],
      });
      return;
    }

    const matches = roundIndex === 0
      ? buildOpeningMatches(name, entrySlots)
      : buildProgressionMatches(name, entrySlots, carriedWinners);

    rounds.push({
      name,
      matches,
    });

    carriedWinners = matches.map((match, index) => createWinnerSlot(
      match,
      nextRoundName(name),
      index + 1,
      getPersistedMatchWinner(name, index, persistedMatches, teamById),
    ));
  });

  return rounds;
}

function buildOpeningMatches(roundName: DrawRoundName, entrySlots: MainDrawSlot[]): BracketMatch[] {
  return chunkSlots(entrySlots, 2).map((matchSlots, index) => ({
    id: `${roundName}-match-${index + 1}`,
    roundName,
    matchNumber: index + 1,
    slots: ensureMatchPair(matchSlots, roundName, index + 1),
  }));
}

function buildProgressionMatches(
  roundName: DrawRoundName,
  entrySlots: MainDrawSlot[],
  previousWinners: MainDrawSlot[],
): BracketMatch[] {
  if (entrySlots.length === 0) {
    return chunkSlots(previousWinners, 2).map((matchSlots, index) => ({
      id: `${roundName}-match-${index + 1}`,
      roundName,
      matchNumber: index + 1,
      slots: ensureMatchPair(matchSlots, roundName, index + 1),
    }));
  }

  const matchCount = Math.max(entrySlots.length, previousWinners.length);
  return Array.from({ length: matchCount }, (_, index) => {
    const directEntry = entrySlots[index] ?? createManualEmptySlot(roundName, (index * 2) + 1);
    const opponent = previousWinners[index] ?? createManualEmptySlot(roundName, (index * 2) + 2);
    return {
      id: `${roundName}-match-${index + 1}`,
      roundName,
      matchNumber: index + 1,
      slots: [directEntry, opponent],
    };
  });
}

function chunkSlots(slots: MainDrawSlot[], size: number): MainDrawSlot[][] {
  const chunks: MainDrawSlot[][] = [];
  for (let index = 0; index < slots.length; index += size) {
    chunks.push(slots.slice(index, index + size));
  }
  return chunks;
}

function ensureMatchPair(slots: MainDrawSlot[], roundName: DrawRoundName, matchNumber: number): MainDrawSlot[] {
  if (slots.length >= 2) return slots;

  return [
    ...slots,
    createManualEmptySlot(roundName, matchNumber * 2),
  ];
}

function createManualEmptySlot(entryRound: DrawRoundName, position: number): MainDrawSlot {
  return {
    id: `manual-empty-${entryRound.replace('/', '')}-${position}`,
    drawId: 'main-draw-local',
    round: ROUND_ORDER.indexOf(entryRound) + 1,
    position,
    entryRound,
    source: 'empty',
    isBye: false,
    isLocked: false,
  };
}

function createEntrySlot(
  entryRound: DrawRoundName,
  position: number,
  team: Team | undefined,
  source: MainDrawSlot['source'],
  placeholder?: string,
  candidateTeam?: Team,
): MainDrawSlot {
  return {
    id: `main-${entryRound.replace('/', '')}-${source}-${position}`,
    drawId: 'main-draw-local',
    round: ROUND_ORDER.indexOf(entryRound) + 1,
    position,
    entryRound,
    team,
    placeholder,
    candidateTeam,
    source,
    isBye: false,
    isLocked: Boolean(team?.seed),
  };
}

function createAdvanceSlot(entryRound: DrawRoundName, position: number, placeholder?: string): MainDrawSlot {
  return {
    id: `advance-${entryRound.replace('/', '')}-${position}`,
    drawId: 'main-draw-local',
    round: ROUND_ORDER.indexOf(entryRound) + 1,
    position,
    entryRound,
    placeholder: placeholder ?? (entryRound === 'WINNER' ? 'Winner' : `Winner Match ${position}`),
    source: 'advance',
    isBye: false,
    isLocked: true,
  };
}

function createWinnerSlot(
  match: BracketMatch,
  entryRound: DrawRoundName,
  position: number,
  persistedWinner?: Team,
): MainDrawSlot {
  const autoWinner = getAutomaticByeWinner(match);
  const winner = persistedWinner
    ? {
        ...createAdvanceSlot(entryRound, position, `Winner ${match.roundName} M${match.matchNumber}`),
        team: persistedWinner,
        placeholder: undefined,
        source: 'advance' as const,
        isLocked: true,
      }
    : autoWinner;

  return {
    ...createAdvanceSlot(entryRound, position, `Winner ${match.roundName} M${match.matchNumber}`),
    team: winner?.team,
    placeholder: winner ? undefined : `Winner ${match.roundName} M${match.matchNumber}`,
    candidateTeam: winner?.candidateTeam,
    source: winner ? winner.source : 'advance',
    isLocked: Boolean(winner),
  };
}

function getAutomaticByeWinner(match: BracketMatch): MainDrawSlot | undefined {
  if (match.slots.length !== 2) return undefined;
  const [first, second] = match.slots;
  if (first.isBye && !second.isBye) return second;
  if (second.isBye && !first.isBye) return first;
  return undefined;
}

function getPersistedMatchWinner(
  roundName: DrawRoundName,
  roundMatchIndex: number,
  persistedMatches: ScheduledMatch[],
  teamById: Map<string, Team>,
): Team | undefined {
  const roundNumber = ROUND_ORDER.indexOf(roundName) + 1;
  const persistedMatch = persistedMatches
    .filter(match => match.round === roundNumber)
    .sort((a, b) => a.matchNumber - b.matchNumber)[roundMatchIndex];

  if (!persistedMatch?.winnerId) return undefined;
  if (persistedMatch.team1?.id === persistedMatch.winnerId) return persistedMatch.team1;
  if (persistedMatch.team2?.id === persistedMatch.winnerId) return persistedMatch.team2;
  return teamById.get(persistedMatch.winnerId);
}

function nextRoundName(roundName: DrawRoundName): DrawRoundName {
  const index = ROUND_ORDER.indexOf(roundName);
  return ROUND_ORDER[Math.min(ROUND_ORDER.length - 1, index + 1)];
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

function upsertMainDrawSlot(slots: MainDrawSlot[], nextSlot: MainDrawSlot): MainDrawSlot[] {
  const exists = slots.some(slot => slot.id === nextSlot.id);
  const updated = exists
    ? slots.map(slot => (slot.id === nextSlot.id ? nextSlot : slot))
    : [...slots, nextSlot];

  return updated.sort(sortSlotsByRound);
}

function dedupeTeams(teams: Team[]): Team[] {
  const seen = new Set<string>();
  return teams.filter(team => {
    if (seen.has(team.id)) return false;
    seen.add(team.id);
    return true;
  });
}

function moveSlotContent(target: MainDrawSlot, source: MainDrawSlot): MainDrawSlot {
  return {
    ...target,
    team: source.team,
    placeholder: source.placeholder,
    candidateTeam: source.candidateTeam,
    source: source.source === 'advance' ? target.source : source.source,
    isBye: source.isBye,
    isLocked: source.isLocked,
  };
}

function clearEditableSlot(slot: MainDrawSlot): MainDrawSlot {
  if (slot.source === 'qualifier' || slot.source === 'team') {
    return {
      ...slot,
      team: undefined,
      isBye: false,
      isLocked: false,
    };
  }

  return {
    ...slot,
    team: undefined,
    placeholder: undefined,
    candidateTeam: undefined,
    source: 'empty',
    isBye: false,
    isLocked: false,
  };
}

function BracketMatchCard({
  match,
  roundIndex,
  isLastRound,
  drawLocked,
  isDraft,
  draggedSlotId,
  onSlotSwap,
  onToggleLock,
  onDragStart,
  onDrop,
  onClear,
  onDragEnd,
}: {
  match: BracketMatch;
  roundIndex: number;
  isLastRound: boolean;
  drawLocked: boolean;
  isDraft: boolean;
  draggedSlotId: string | null;
  onSlotSwap: (slot: MainDrawSlot) => void;
  onToggleLock: (slotId: string) => void;
  onDragStart: (slotId: string) => void;
  onDrop: (slot: MainDrawSlot) => void;
  onClear: (slot: MainDrawSlot) => void;
  onDragEnd: () => void;
}) {
  const matchBandHeight = BRACKET_BAND_HEIGHT * Math.pow(2, roundIndex);

  return (
    <div
      className="relative flex items-center"
      style={{ height: matchBandHeight }}
    >
      {roundIndex > 0 && (
        <div className="absolute left-[-12px] top-1/2 h-px w-3 bg-mpl-gold/30" />
      )}
      {!isLastRound && (
        <div className="absolute right-[-12px] top-1/2 h-px w-3 bg-mpl-gold/30" />
      )}
      <div className="w-full mpl-card p-1.5 relative rounded-lg">
        <div className="flex items-center justify-between mb-1 px-1">
          <span className="text-[8px] text-mpl-gray font-bold uppercase tracking-widest">M{match.matchNumber}</span>
          <span className="text-[8px] text-mpl-gold font-bold">{match.roundName}</span>
        </div>
        <div className="space-y-1">
          {match.slots.map(slot => (
            <DrawSlotRow
              key={slot.id}
              slot={slot}
              isLocked={drawLocked}
              onSwap={() => onSlotSwap(slot)}
              onToggleLock={() => onToggleLock(slot.id)}
              onDragStart={() => onDragStart(slot.id)}
              onDrop={() => onDrop(slot)}
              onClear={() => onClear(slot)}
              onDragEnd={onDragEnd}
              isDragging={draggedSlotId === slot.id}
              isDraft={isDraft}
            />
          ))}
        </div>
      </div>
    </div>
  );
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
  const isDisplayEmpty = slot.id.startsWith('display-empty');
  const canDrag = isDraft && !drawLocked && !isAdvance && !isDisplayEmpty;

  return (
    <div className={cn(
      'flex items-center gap-1.5 px-1.5 py-1 rounded-lg border transition-all min-h-[38px]',
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
      <div className="w-5 h-5 rounded bg-mpl-border flex items-center justify-center text-[9px] font-bold text-mpl-gray flex-shrink-0">
        {slot.position}
      </div>
      {slot.isBye ? (
        <span className="flex-1 text-[11px] font-bold text-yellow-400 uppercase tracking-widest">BYE</span>
      ) : slot.team ? (
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-white truncate">{slot.team.name}</p>
          <p className="text-[9px] text-mpl-gray truncate">{slot.team.clubName}</p>
        </div>
      ) : (
        <div className="flex-1 min-w-0">
          <p className={cn(
            'text-[11px] font-semibold truncate',
            slot.source === 'qualifier' ? 'text-cyan-300' :
            isAdvance ? 'text-mpl-gray' : 'text-mpl-gray'
          )}>
            {slot.placeholder ?? 'Empty'}
          </p>
          <p className="text-[9px] text-mpl-gray">{slot.source === 'qualifier' ? 'Qualified team' : slot.entryRound}</p>
        </div>
      )}
      {isDraft && !drawLocked && !isAdvance && !isDisplayEmpty && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={onSwap} className="p-0.5 rounded text-mpl-gray transition-colors hover:text-mpl-gold" title="Edit slot">
            <Edit3 size={10} />
          </button>
          <button onClick={onToggleLock} className={cn('p-0.5 rounded transition-colors', slot.isLocked ? 'text-mpl-gold' : 'text-mpl-gray hover:text-mpl-gold')} title={slot.isLocked ? 'Unlock slot' : 'Lock slot'}>
            {slot.isLocked ? <Lock size={10} /> : <Unlock size={10} />}
          </button>
        </div>
      )}
      {slot.isLocked && !isAdvance && <Lock size={9} className="text-mpl-gold flex-shrink-0" />}
    </div>
  );
}
