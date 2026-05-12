import { CheckCircle } from 'lucide-react';
import { useAppState, useTournamentData } from '../context';
import { TopBar } from '../components/Navigation';
import { BackButton, GoldDivider } from '../components/UI';
import { cn } from '../lib';
import type { MatchSet, Pool, Team } from '../types';

export function PoolStandingsPage() {
  const { navigate, selectedTournament } = useAppState();
  const { pools, matches } = useTournamentData();

  const tournamentPools = pools.filter(pool => pool.tournamentId === selectedTournament?.id);
  const tournamentMatches = matches.filter(match => match.tournamentId === selectedTournament?.id && match.poolId);
  const qualifiersPerPool = selectedTournament?.qualifiersPerPool ?? 2;

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Pool Standings"
        subtitle="Calculated from match results"
        leftAction={<BackButton onClick={() => navigate('tournament_detail', selectedTournament?.id)} />}
      />
      <div className="flex-1 overflow-y-auto">
        <div className="pb-24">
          {tournamentPools.length === 0 && (
            <div className="mx-4 mt-4 rounded-xl border border-mpl-gold/30 bg-mpl-gold/10 px-3 py-3 text-xs text-mpl-gold">
              No pools generated yet.
            </div>
          )}

          {tournamentPools.map(pool => {
            const standings = calculatePoolStandings(pool, tournamentMatches.filter(match => match.poolId === pool.id));
            return (
              <div key={pool.id} className="mt-4">
                <div className="flex items-center justify-between px-4 mb-2">
                  <p className="section-title mb-0">{pool.name}</p>
                  <span className="text-xs text-mpl-gray">{standings.slice(0, qualifiersPerPool).length} qualified</span>
                </div>

                <div className="flex items-center gap-1 px-4 py-1.5 text-[9px] text-mpl-gray font-bold uppercase tracking-widest border-b border-mpl-border">
                  <span className="w-6 text-center">#</span>
                  <span className="flex-1 pl-2">Team</span>
                  <span className="w-7 text-center">W</span>
                  <span className="w-7 text-center">L</span>
                  <span className="w-12 text-center">Games</span>
                </div>

                {standings.map((standing, index) => (
                  <div
                    key={standing.team.id}
                    className={cn(
                      'w-full flex items-center gap-1 px-4 py-3 border-b border-mpl-border/40',
                      index < qualifiersPerPool ? 'border-l-2 border-l-green-500/60 bg-green-500/5' : ''
                    )}
                  >
                    <div className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0',
                      index === 0 ? 'bg-gold-gradient text-mpl-black' :
                      index === 1 ? 'bg-mpl-border text-mpl-off-white' : 'bg-transparent text-mpl-gray'
                    )}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0 pl-2">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-white truncate">{standing.team.name}</p>
                        {index < qualifiersPerPool && <CheckCircle size={9} className="text-green-400 flex-shrink-0" />}
                      </div>
                      <p className="text-[10px] text-mpl-gray">{standing.team.clubName}</p>
                    </div>
                    <span className="w-7 text-center text-sm font-bold text-green-400">{standing.wins}</span>
                    <span className="w-7 text-center text-sm font-bold text-red-400">{standing.losses}</span>
                    <span className="w-12 text-center text-sm font-black text-mpl-gold">{standing.gamesWon}-{standing.gamesLost}</span>
                  </div>
                ))}

                <GoldDivider />
              </div>
            );
          })}
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
