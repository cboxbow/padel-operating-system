import { useEffect, useState } from 'react';
import {
  Shuffle, Lock, Unlock, Globe, Edit3, ChevronRight, CheckCircle, Plus
} from 'lucide-react';
import { useAppState, useTournamentData, useToast } from '../context';
import { TopBar } from '../components/Navigation';
import { BackButton, ConfirmDialog, GoldDivider } from '../components/UI';
import { cn } from '../lib';
import type { PoolSlot, Team } from '../types';

// ─── Draw Room (entry) ────────────────────────────────────────────────────────
export function DrawRoomPage() {
  const { navigate, selectedTournament } = useAppState();
  const { pools, poolsError } = useTournamentData();

  const tournamentPools = pools.filter(p => p.tournamentId === selectedTournament?.id);
  const draftPools = tournamentPools.filter(p => p.status === 'draft');
  const publishedPools = tournamentPools.filter(p => p.status === 'published');

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Draw Room"
        subtitle={selectedTournament?.name}
        leftAction={<BackButton onClick={() => navigate('tournament_detail', selectedTournament?.id)} />}
      />
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-4 pb-24 space-y-4">
          {poolsError && (
            <div className="rounded-lg border border-mpl-gold/30 bg-mpl-gold/10 px-3 py-2 text-xs text-mpl-gold">
              {poolsError}
            </div>
          )}

          {/* Phase header */}
          <div className="mpl-card-gold p-4">
            <p className="text-xs font-bold text-mpl-gold uppercase tracking-widest mb-1">Draw Control Center</p>
            <p className="text-sm text-mpl-off-white">Manage pool draw, main draw, publication and locking. All changes are logged.</p>
          </div>

          {/* Pool Draw */}
          <div>
            <p className="section-title">Pool Draw</p>
            <button
              onClick={() => navigate('pool_draw', selectedTournament?.id)}
              className="w-full mpl-card p-4 flex items-center gap-4 text-left hover:border-mpl-gold/30 transition-all active:scale-[0.99]"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                <Edit3 size={18} className="text-purple-400" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white">Pool Draw Manager</p>
                <p className="text-xs text-mpl-gray mt-0.5">{draftPools.length} draft · {publishedPools.length} published pools</p>
              </div>
              <ChevronRight size={16} className="text-mpl-gray" />
            </button>
          </div>

          <GoldDivider />

          {/* Main Draw */}
          <div>
            <p className="section-title">Main Draw</p>
            <button
              onClick={() => navigate('main_draw', selectedTournament?.id)}
              className="w-full mpl-card p-4 flex items-center gap-4 text-left hover:border-mpl-gold/30 transition-all active:scale-[0.99]"
            >
              <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center flex-shrink-0">
                <ChevronRight size={18} className="text-red-400" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white">Main Draw Bracket</p>
                <p className="text-xs text-mpl-gray mt-0.5">Place qualified teams, BYEs, publish & lock</p>
              </div>
              <ChevronRight size={16} className="text-mpl-gray" />
            </button>
          </div>

          <GoldDivider />

          {/* Pool summaries */}
          {tournamentPools.length > 0 && (
            <div>
              <p className="section-title">Pool Status</p>
              <div className="space-y-2">
                {tournamentPools.map(pool => (
                  <div key={pool.id} className="mpl-card p-3 flex items-center gap-3">
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black flex-shrink-0',
                      pool.status === 'published' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                      pool.status === 'locked' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                      'bg-mpl-gold/15 text-mpl-gold border border-mpl-gold/30'
                    )}>
                      {pool.letter}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">{pool.name}</p>
                      <p className="text-xs text-mpl-gray">{pool.slots.filter(s => !s.isEmpty).length}/{pool.maxTeams} teams</p>
                    </div>
                    <span className={cn(
                      'status-badge',
                      pool.status === 'published' ? 'status-published' :
                      pool.status === 'locked' ? 'status-locked' : 'status-draft'
                    )}>
                      {pool.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Pool Draw Page ───────────────────────────────────────────────────────────
export function PoolDrawPage() {
  const { navigate, selectedTournament, setTournamentStatus } = useAppState();
  const { pools, poolsError, registrations, generatePools, redrawPool, publishPool, addSlotToPool, updatePoolSlot, toggleSlotLock, addAuditLog } = useTournamentData();
  const { addToast } = useToast();

  const [selectedPool, setSelectedPool] = useState<string>('');
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  // showOverrideDialog reserved for future override flow
  const [slotToSwap, setSlotToSwap] = useState<PoolSlot | null>(null);
  const [showSwapPicker, setShowSwapPicker] = useState(false);
  const [publishNote] = useState('');

  const tournamentPools = pools.filter(p => p.tournamentId === selectedTournament?.id);
  const pool = tournamentPools.find(p => p.id === selectedPool);

  useEffect(() => {
    if (tournamentPools.length > 0 && !tournamentPools.some(p => p.id === selectedPool)) {
      setSelectedPool(tournamentPools[0].id);
    }
  }, [selectedPool, tournamentPools]);

  const validatedTeams = registrations
    .filter(r => r.tournamentId === selectedTournament?.id && r.status === 'validated')
    .map(r => r.team);
  const qualifTeams = registrations
    .filter(r => r.tournamentId === selectedTournament?.id && r.status === 'validated' && r.notes?.toUpperCase().includes('DRAW ENTRY: QUALIF'))
    .map(r => r.team);
  const poolTeams = selectedTournament?.competitionMode === 'qualification_phase' && qualifTeams.length >= 2
    ? qualifTeams
    : validatedTeams;

  // assignedTeamIds reserved for future use

  const handleRedraw = () => {
    if (!pool) return;

    const nonLockedTeams = validatedTeams.filter(t => !pool.slots.find(s => s.isLocked && s.team?.id === t.id));
    redrawPool(pool.id, nonLockedTeams);
    addToast({ type: 'info', title: `${pool.name} Redrawn`, message: 'Pool redrawn. Locked slots preserved.' });
  };

  const handleGeneratePools = async () => {
    if (!selectedTournament) return;
    try {
      await generatePools(selectedTournament.id, poolTeams);
      await setTournamentStatus(selectedTournament.id, 'pool_draw_ready');
      addToast({ type: 'success', title: 'Pools Generated', message: `${poolTeams.length} teams placed into pools.` });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Pool Generation Failed',
        message: error instanceof Error ? error.message : 'Unable to generate pools.',
      });
    }
  };

  const handlePublish = async () => {
    if (!pool) return;
    try {
      await publishPool(pool.id, publishNote);
      const allPoolsPublished = tournamentPools.every(p => p.id === pool.id || p.status === 'published' || p.status === 'locked');
      if (selectedTournament && allPoolsPublished) {
        await setTournamentStatus(selectedTournament.id, 'pool_published');
      }
      addToast({ type: 'success', title: `${pool.name} Published!`, message: 'Pool draw is now official and visible to players.' });
      setShowPublishConfirm(false);
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Publish Failed',
        message: error instanceof Error ? error.message : 'Unable to publish pool.',
      });
    }
  };

  const handleSlotSwap = (slot: PoolSlot) => {
    setSlotToSwap(slot);
    setShowSwapPicker(true);
  };

  const handleAddSlot = async () => {
    if (!pool) return;

    try {
      await addSlotToPool(pool.id);
      addToast({ type: 'success', title: 'Slot Added', message: `${pool.name} now has one more editable slot.` });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Slot Add Failed',
        message: error instanceof Error ? error.message : 'Unable to add slot.',
      });
    }
  };

  const handleSwapWithTeam = (team: Team | null) => {
    if (!slotToSwap || !pool) return;
    const prev = slotToSwap.team?.name ?? 'Empty';
    updatePoolSlot(pool.id, slotToSwap.position, team ?? undefined);
    setSlotToSwap(null);
    setShowSwapPicker(false);
    addAuditLog({
      action: 'SLOT_SWAP', module: 'Pool Draw',
      entityType: 'pool_slot', entityId: slotToSwap.id,
      description: `Slot ${slotToSwap.position} in ${pool.name}: ${prev} → ${team?.name ?? 'Empty'}`,
      adminId: 'adm1', adminName: 'Admin MPL', isOverride: true,
      overrideReason: 'Manual slot reassignment by admin.',
    });
    addToast({ type: 'info', title: 'Slot Updated', message: `${pool.name} slot ${slotToSwap.position} changed.` });
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Pool Draw"
        subtitle="Edit pools before publishing"
        leftAction={<BackButton onClick={() => navigate('draw_room', selectedTournament?.id)} />}
      />
      <div className="flex-1 overflow-y-auto">
        <div className="pb-24">
          {poolsError && (
            <div className="mx-4 mt-4 rounded-lg border border-mpl-gold/30 bg-mpl-gold/10 px-3 py-2 text-xs text-mpl-gold">
              {poolsError}
            </div>
          )}

          {/* Pool Selector */}
          <div className="flex gap-2 px-4 pt-4 overflow-x-auto no-scrollbar">
            {tournamentPools.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedPool(p.id)}
                className={cn(
                  'flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold border transition-all',
                  selectedPool === p.id
                    ? 'bg-mpl-gold text-mpl-black border-mpl-gold'
                    : 'bg-mpl-card border-mpl-border text-mpl-gray hover:border-mpl-gold/40'
                )}
              >
                {p.name}
                {p.status === 'published' && <span className="ml-1 text-green-400">✓</span>}
              </button>
            ))}
          </div>

          {tournamentPools.length === 0 && (
            <div className="px-4 mt-4">
              <div className="mpl-card p-4 space-y-3">
                <div>
                  <p className="font-semibold text-white text-sm">No pools generated yet</p>
                  <p className="text-xs text-mpl-gray mt-1">
                    {poolTeams.length >= 2
                      ? `${poolTeams.length} validated teams are ready for a qualification pool draw.`
                      : 'Validate at least 2 teams before generating pools.'}
                  </p>
                </div>
                <button
                  className="w-full btn-gold flex items-center justify-center gap-2"
                  onClick={() => void handleGeneratePools()}
                  disabled={poolTeams.length < 2}
                >
                  <Shuffle size={14} /> Generate Qualification Pools
                </button>
              </div>
            </div>
          )}

          {pool && (
            <div className="px-4 mt-4 space-y-4">
              {/* Pool status */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-white">{pool.name}</p>
                  <p className="text-xs text-mpl-gray">{pool.slots.filter(s => !s.isEmpty).length}/{pool.maxTeams} teams assigned</p>
                </div>
                <span className={cn(
                  'status-badge',
                  pool.status === 'published' ? 'status-published' :
                  pool.status === 'locked' ? 'status-locked' : 'status-draft'
                )}>
                  {pool.status}
                </span>
              </div>

              {/* Slots */}
              <div>
                <p className="section-title">Pool Slots</p>
                <div className="space-y-2">
                  {pool.slots.map(slot => (
                    <div
                      key={slot.id}
                      className={cn(
                        'rounded-xl border transition-all duration-200',
                        slot.isEmpty ? 'border-dashed border-mpl-border bg-transparent' :
                        slot.isLocked ? 'border-mpl-gold/50 bg-mpl-gold/5' :
                        'border-mpl-border bg-mpl-dark'
                      )}
                    >
                      <div className="flex items-center gap-3 p-3">
                        <div className="w-7 h-7 rounded-lg bg-mpl-border flex items-center justify-center text-xs font-bold text-mpl-gray flex-shrink-0">
                          {slot.position}
                        </div>
                        {slot.isEmpty ? (
                          <span className="text-sm text-mpl-gray italic flex-1">Empty slot</span>
                        ) : (
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-semibold text-white truncate">{slot.team?.name}</p>
                              {slot.isSeedProtected && (
                                <span className="text-[9px] text-mpl-gold border border-mpl-gold/40 px-1 py-0.5 rounded font-bold">SEED</span>
                              )}
                            </div>
                            <p className="text-xs text-mpl-gray">{slot.team?.clubName}</p>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {pool.status === 'draft' && (
                            <>
                              <button
                                onClick={() => handleSlotSwap(slot)}
                                className="p-1.5 rounded-lg text-xs text-mpl-gray transition-colors hover:text-mpl-gold hover:bg-mpl-gold/10"
                                title="Change team in slot"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                onClick={() => toggleSlotLock(pool.id, slot.position)}
                                className={cn(
                                  'p-1.5 rounded-lg transition-colors',
                                  slot.isLocked ? 'text-mpl-gold bg-mpl-gold/10' : 'text-mpl-gray hover:text-mpl-gold hover:bg-mpl-gold/10'
                                )}
                                title={slot.isLocked ? 'Unlock slot' : 'Lock slot'}
                              >
                                {slot.isLocked ? <Lock size={13} /> : <Unlock size={13} />}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              {pool.status === 'draft' && (
                <div className="space-y-2">
                  <button
                    className="w-full btn-ghost flex items-center justify-center gap-2"
                    onClick={handleRedraw}
                  >
                    <Shuffle size={14} /> Random Redraw (Keep Locked)
                  </button>
                  <button
                    className="w-full btn-ghost flex items-center justify-center gap-2"
                    onClick={() => void handleAddSlot()}
                  >
                    <Plus size={14} /> Add Empty Slot
                  </button>
                  <button
                    className="w-full btn-gold flex items-center justify-center gap-2"
                    onClick={() => setShowPublishConfirm(true)}
                  >
                    <Globe size={14} /> Publish Official Pool Draw
                  </button>
                  {pool.slots.some(s => s.isEmpty) && (
                    <p className="text-xs text-orange-400 text-center">Empty slots will publish as TBD/BYE and can still be edited later.</p>
                  )}
                </div>
              )}

              {pool.status === 'published' && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3">
                  <CheckCircle size={14} className="text-green-400" />
                  <p className="text-xs text-green-400 font-semibold">This pool draw is officially published and visible to players.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Swap Team Picker */}
      {showSwapPicker && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center" onClick={() => setShowSwapPicker(false)}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-mpl-card border border-mpl-border rounded-t-3xl max-h-[70vh] flex flex-col animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-mpl-border">
              <p className="font-bold text-white">Select Team for Slot {slotToSwap?.position}</p>
              <button onClick={() => setShowSwapPicker(false)} className="text-mpl-gray hover:text-white p-1">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <button
                className="w-full p-3 rounded-xl border border-dashed border-mpl-border text-mpl-gray text-sm hover:border-red-400/50 hover:text-red-400 transition-colors"
                onClick={() => handleSwapWithTeam(null)}
              >
                Clear Slot (Empty)
              </button>
              {poolTeams.map(team => (
                <button
                  key={team.id}
                  onClick={() => handleSwapWithTeam(team)}
                  className="w-full p-3 rounded-xl border border-mpl-border bg-mpl-dark text-left hover:border-mpl-gold/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0',
                      team.seed ? 'bg-gold-gradient text-mpl-black' : 'bg-mpl-border text-mpl-gray'
                    )}>
                      {team.seed ? `#${team.seed}` : '—'}
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

      {/* Publish Confirm */}
      <ConfirmDialog
        isOpen={showPublishConfirm}
        onClose={() => setShowPublishConfirm(false)}
        onConfirm={() => void handlePublish()}
        title={`Publish ${pool?.name ?? 'Pool'} Draw?`}
        message="This will make the pool draw official and visible to all players. Empty slots are allowed and will remain editable as TBD/BYE. This action is logged in the audit trail."
        confirmLabel="Publish Official Draw"
        variant="gold"
      />
    </div>
  );
}
