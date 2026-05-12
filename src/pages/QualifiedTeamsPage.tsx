import { CheckCircle, ChevronRight } from 'lucide-react';
import { useAppState, useTournamentData, useToast } from '../context';
import { TopBar } from '../components/Navigation';
import { BackButton, GoldDivider } from '../components/UI';
import { cn } from '../lib';
import type { MatchSet, Pool, Team } from '../types';

export function QualifiedTeamsPage() {
  const { navigate, selectedTournament, setTournamentStatus } = useAppState();
  const { pools, matches, addAuditLog } = useTournamentData();
  const { addToast } = useToast();

  const tournamentPools = pools.filter(pool => pool.tournamentId === selectedTournament?.id);
  const tournamentMatches = matches.filter(match => match.tournamentId === selectedTournament?.id && match.poolId);
  const qualifiersPerPool = selectedTournament?.qualifiersPerPool ?? 2;
  const qualified = tournamentPools.flatMap(pool => (
    isPoolComplete(pool, tournamentMatches.filter(match => match.poolId === pool.id))
      ? calculatePoolStandings(pool, tournamentMatches.filter(match => match.poolId === pool.id))
      .slice(0, qualifiersPerPool)
      .map((standing, index) => ({
        pool,
        team: standing.team,
        poolPosition: index + 1,
      }))
      : []
  ));

  const proceedToMainDraw = async () => {
    if (!selectedTournament) return;
    await setTournamentStatus(selectedTournament.id, 'main_draw_ready');
    addAuditLog({
      action: 'QUALIFIED_TEAMS_CONFIRMED',
      module: 'Qualified Teams',
      entityType: 'tournament',
      entityId: selectedTournament.id,
      description: `${qualified.length} qualified teams confirmed for main draw.`,
      adminId: 'adm1',
      adminName: 'Admin MPL',
      isOverride: false,
    });
    addToast({ type: 'success', title: 'Main Draw Ready', message: `${qualified.length} teams confirmed.` });
    navigate('main_draw', selectedTournament.id);
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Qualified Teams"
        subtitle={`${qualified.length} teams for Main Draw`}
        leftAction={<BackButton onClick={() => navigate('tournament_detail', selectedTournament?.id)} />}
      />
      <div className="flex-1 overflow-y-auto">
        <div className="pb-24">
          {qualified.length === 0 && (
            <div className="mx-4 mt-4 rounded-xl border border-mpl-gold/30 bg-mpl-gold/10 px-3 py-3 text-xs text-mpl-gold">
              No qualified teams yet. Complete pool matches first.
            </div>
          )}

          {tournamentPools.map(pool => {
            const poolQualified = qualified.filter(item => item.pool.id === pool.id);
            const poolMatches = tournamentMatches.filter(match => match.poolId === pool.id);
            const poolComplete = isPoolComplete(pool, poolMatches);
            return (
              <div key={pool.id} className="mt-4">
                <div className="flex items-center justify-between px-4">
                  <p className="section-title mb-0">{pool.name} - Qualified</p>
                  <span className={cn(
                    'text-[10px] font-bold uppercase rounded-full border px-2 py-1',
                    poolComplete ? 'text-green-400 border-green-500/30 bg-green-500/10' : 'text-mpl-gold border-mpl-gold/30 bg-mpl-gold/10'
                  )}>
                    {poolComplete ? 'Complete' : `${completedMatchCount(poolMatches)}/${expectedMatchCount(pool)} matches`}
                  </span>
                </div>
                {!poolComplete && (
                  <div className="mx-4 mt-3 rounded-xl border border-mpl-border bg-mpl-dark px-3 py-3">
                    <p className="text-sm font-semibold text-white">Pending pool results</p>
                    <p className="text-xs text-mpl-gray mt-1">Complete every pool match score before confirming qualified teams.</p>
                  </div>
                )}
                {poolQualified.map(item => (
                  <div key={`${pool.id}-${item.team.id}`} className="flex items-center gap-3 px-4 py-3 border-b border-mpl-border/40">
                    <div className={cn(
                      'w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0',
                      item.poolPosition === 1 ? 'bg-gold-gradient text-mpl-black' : 'bg-mpl-border text-mpl-gray'
                    )}>
                      {item.poolPosition === 1 ? '1st' : '2nd'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{item.team.name}</p>
                      <p className="text-xs text-mpl-gray">{item.team.clubName}</p>
                    </div>
                    <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
                  </div>
                ))}
              </div>
            );
          })}

          <GoldDivider />

          <div className="px-4">
            <button
              className="w-full btn-gold flex items-center justify-center gap-2"
              onClick={() => void proceedToMainDraw()}
              disabled={qualified.length === 0}
            >
              <ChevronRight size={14} /> Proceed to Main Draw
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function calculatePoolStandings(pool: Pool, matches: { team1?: Team; team2?: Team; winnerId?: string; sets: MatchSet[]; status: string }[]) {
  const rows = pool.slots
    .filter(slot => slot.team)
    .map(slot => ({
      team: slot.team!,
      wins: 0,
      losses: 0,
      gamesWon: 0,
      gamesLost: 0,
    }));

  const byTeamId = new Map(rows.map(row => [row.team.id, row]));

  matches.filter(match => match.status === 'completed').forEach(match => {
    if (!match.team1 || !match.team2) return;
    const row1 = byTeamId.get(match.team1.id);
    const row2 = byTeamId.get(match.team2.id);
    if (!row1 || !row2) return;

    match.sets.forEach(set => {
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
    return (a.team.ranking ?? Number.MAX_SAFE_INTEGER) - (b.team.ranking ?? Number.MAX_SAFE_INTEGER);
  });
}

function expectedMatchCount(pool: Pool): number {
  const teamCount = pool.slots.filter(slot => slot.team).length;
  return (teamCount * (teamCount - 1)) / 2;
}

function completedMatchCount(matches: { status: string }[]): number {
  return matches.filter(match => match.status === 'completed').length;
}

function isPoolComplete(pool: Pool, matches: { status: string }[]): boolean {
  const expected = expectedMatchCount(pool);
  return expected > 0 && matches.length >= expected && completedMatchCount(matches) >= expected;
}
