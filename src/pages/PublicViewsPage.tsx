import { useState } from 'react';
import {
  Trophy, Users, ChevronRight, Globe, Lock
} from 'lucide-react';
import { useAppState } from '../context';
import { TopBar } from '../components/Navigation';
import { BackButton, GoldDivider } from '../components/UI';

import { MOCK_POOLS, MOCK_STANDINGS, MOCK_DRAW_SLOTS } from '../mockData';
import { cn } from '../lib';

export function PublicPoolsPage() {
  const { navigate, selectedTournament } = useAppState();
  const [activePool, setActivePool] = useState<string>('pool_a');

  const pools = MOCK_POOLS.filter(p => p.tournamentId === selectedTournament?.id);
  const pool = pools.find(p => p.id === activePool);
  const poolStandings = MOCK_STANDINGS.filter(s => s.poolId === activePool)
    .sort((a, b) => a.position - b.position);

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Pool Draw"
        subtitle="Published — Official View"
        leftAction={<BackButton onClick={() => navigate('public_bracket')} label="Back" />}
        rightAction={
          <div className="flex items-center gap-1.5">
            <Globe size={12} className="text-green-400" />
            <span className="text-xs text-green-400 font-semibold">Live</span>
          </div>
        }
      />
      <div className="flex-1 overflow-y-auto">
        <div className="pb-24">
          {/* MPL Header banner */}
          <div className="mx-4 mt-4 p-4 rounded-2xl bg-gradient-to-r from-mpl-card to-mpl-dark border border-mpl-gold/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gold-gradient flex items-center justify-center flex-shrink-0">
                <span className="text-mpl-black font-black text-xs">MPL</span>
              </div>
              <div>
                <p className="font-black text-white text-sm">{selectedTournament?.name ?? 'MPL Open 2026'}</p>
                <p className="text-xs text-mpl-gold">{selectedTournament?.venue ?? 'Official Pool Draw'}</p>
              </div>
            </div>
          </div>

          {/* Pool tabs */}
          <div className="flex gap-2 px-4 mt-4">
            {pools.map(p => (
              <button key={p.id} onClick={() => setActivePool(p.id)}
                className={cn('flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all',
                  activePool === p.id ? 'bg-mpl-gold text-mpl-black border-mpl-gold' : 'border-mpl-border text-mpl-gray hover:border-mpl-gold/30'
                )}>
                {p.name}
                {p.status === 'published' && <span className="ml-1 text-[10px] opacity-70">✓</span>}
              </button>
            ))}
          </div>

          {pool && (
            <div className="px-4 mt-4 space-y-4">
              {/* Pool teams grid */}
              <div>
                <p className="section-title">Teams in {pool.name}</p>
                <div className="space-y-2">
                  {pool.slots.map(slot => (
                    <div key={slot.id} className={cn(
                      'flex items-center gap-3 p-3 rounded-xl border',
                      slot.isEmpty ? 'border-dashed border-mpl-border' : 'border-mpl-border bg-mpl-dark'
                    )}>
                      <div className="w-7 h-7 rounded-lg bg-mpl-border flex items-center justify-center text-xs font-bold text-mpl-gray flex-shrink-0">
                        {slot.position}
                      </div>
                      {slot.isEmpty ? (
                        <span className="text-sm text-mpl-gray italic">TBD</span>
                      ) : (
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {slot.team?.seed && (
                              <span className="text-[9px] bg-gold-gradient text-mpl-black font-black px-1.5 py-0.5 rounded flex-shrink-0">
                                #{slot.team.seed}
                              </span>
                            )}
                            <p className="text-sm font-semibold text-white truncate">{slot.team?.name}</p>
                          </div>
                          <p className="text-xs text-mpl-gray">{slot.team?.clubName}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <GoldDivider />

              {/* Standings */}
              {poolStandings.length > 0 && (
                <div>
                  <p className="section-title">Standings</p>
                  <div className="mpl-card overflow-hidden">
                    <div className="flex items-center gap-1 px-4 py-2 text-[9px] text-mpl-gray font-bold uppercase tracking-widest bg-mpl-dark border-b border-mpl-border">
                      <span className="w-6">#</span>
                      <span className="flex-1">Team</span>
                      <span className="w-7 text-center">W</span>
                      <span className="w-7 text-center">L</span>
                      <span className="w-8 text-center">Pts</span>
                    </div>
                    {poolStandings.map(s => (
                      <div key={s.teamId} className={cn(
                        'flex items-center gap-1 px-4 py-2.5 border-b border-mpl-border/40 last:border-0',
                        s.qualified ? 'bg-green-500/5' : ''
                      )}>
                        <div className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0',
                          s.position === 1 ? 'bg-gold-gradient text-mpl-black' :
                          s.position === 2 ? 'bg-mpl-border text-mpl-off-white' : 'text-mpl-gray'
                        )}>{s.position}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{s.team.name}</p>
                          {s.qualified && <span className="text-[9px] text-green-400 font-bold">✓ Qualified</span>}
                        </div>
                        <span className="w-7 text-center text-sm font-bold text-green-400">{s.wins}</span>
                        <span className="w-7 text-center text-sm font-bold text-red-400">{s.losses}</span>
                        <span className="w-8 text-center text-sm font-black text-mpl-gold">{s.points}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Public Bracket Page ──────────────────────────────────────────────────────
export function PublicBracketPage() {
  const { navigate, selectedTournament } = useAppState();

  const slots = MOCK_DRAW_SLOTS;
  const matchPairs: { slotA: typeof slots[0]; slotB?: typeof slots[0] }[] = [];
  for (let i = 0; i < slots.length; i += 2) {
    matchPairs.push({ slotA: slots[i], slotB: slots[i + 1] });
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Main Draw"
        subtitle="Official Bracket"
        leftAction={<BackButton onClick={() => navigate('tournament_detail', selectedTournament?.id)} />}
        rightAction={
          <div className="flex items-center gap-1.5">
            <Lock size={11} className="text-red-400" />
            <span className="text-xs text-red-400 font-semibold">Official</span>
          </div>
        }
      />
      <div className="flex-1 overflow-y-auto">
        <div className="pb-24 px-4 pt-4">
          {/* Tournament banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-mpl-card to-mpl-dark border border-mpl-gold/30 mb-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gold-gradient flex items-center justify-center mx-auto mb-2">
              <Trophy size={20} className="text-mpl-black" />
            </div>
            <p className="font-black text-white">{selectedTournament?.name ?? 'MPL Open 2026'}</p>
            <p className="text-xs text-mpl-gold mt-0.5">Main Draw — Round of {slots.length}</p>
          </div>

          {/* Quick link to pools */}
          <button onClick={() => navigate('public_pools')}
            className="w-full mpl-card p-3 flex items-center gap-3 mb-4 hover:border-mpl-gold/30 transition-all">
            <Users size={16} className="text-mpl-gold" />
            <span className="text-sm text-mpl-off-white flex-1 text-left">View Pool Draw & Standings</span>
            <ChevronRight size={14} className="text-mpl-gray" />
          </button>

          {/* Bracket */}
          <p className="section-title">Round of {slots.length} — Bracket</p>
          <div className="space-y-3">
            {matchPairs.map(({ slotA, slotB }, i) => (
              <div key={i} className="mpl-card overflow-hidden">
                <div className="px-4 py-2 bg-mpl-dark border-b border-mpl-border">
                  <p className="text-[9px] text-mpl-gray font-bold uppercase tracking-widest">Match {i + 1}</p>
                </div>
                {[slotA, slotB].filter(Boolean).map((slot, si) => (
                  <div key={si} className={cn(
                    'flex items-center gap-3 px-4 py-3',
                    si === 0 ? 'border-b border-mpl-border/50' : '',
                    slot?.winnerId ? 'bg-mpl-gold/5' : ''
                  )}>
                    {slot?.isBye ? (
                      <span className="text-xs text-yellow-400 font-bold uppercase tracking-widest w-full">BYE</span>
                    ) : (
                      <>
                        {slot?.team?.seed && (
                          <span className="text-[9px] bg-gold-gradient text-mpl-black font-black px-1.5 py-0.5 rounded flex-shrink-0">
                            #{slot.team.seed}
                          </span>
                        )}
                        <p className={cn(
                          'text-sm font-semibold flex-1 truncate',
                          slot?.team ? 'text-white' : 'text-mpl-gray italic'
                        )}>
                          {slot?.team?.name ?? 'TBD'}
                        </p>
                        {slot?.isLocked && <Lock size={10} className="text-mpl-gold flex-shrink-0" />}
                      </>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
