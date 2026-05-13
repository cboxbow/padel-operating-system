import { Crown, Medal, Trophy } from 'lucide-react';
import { useAppState, useTournamentData } from '../context';
import { TopBar } from '../components/Navigation';
import { BackButton, EmptyState, GoldDivider } from '../components/UI';
import { cn } from '../lib';
import type { ScheduledMatch, Team } from '../types';

type DrawRankRow = {
  team: Team;
  rank: number;
  status: string;
  detail: string;
  finalScore?: string;
  seed?: number;
  ranking?: number;
};

export function DrawRankingPage() {
  const { navigate, selectedTournament } = useAppState();
  const { matches } = useTournamentData();
  const mainMatches = matches
    .filter(match => match.tournamentId === selectedTournament?.id && !match.poolId && match.drawId)
    .sort((a, b) => (a.round - b.round) || (a.matchNumber - b.matchNumber));
  const rows = buildDrawRanking(mainMatches);
  const champion = rows[0];
  const completedMatches = mainMatches.filter(match => match.status === 'completed').length;

  return (
    <div className="flex h-full flex-col">
      <TopBar
        title="Draw Ranking"
        subtitle={selectedTournament?.name ?? 'Main draw classification'}
        leftAction={<BackButton onClick={() => navigate('tournament_detail', selectedTournament?.id)} />}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-4 px-4 pb-24 pt-4">
          {mainMatches.length === 0 && (
            <EmptyState icon={<Medal size={34} />} title="No main draw ranking yet" description="Publish the main draw and enter match scores to build the ranking." />
          )}

          {mainMatches.length > 0 && champion && (
            <section className="rounded-2xl border border-mpl-gold/45 bg-mpl-gold/10 p-4 shadow-gold">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gold-gradient text-mpl-black">
                  <Crown size={24} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-mpl-gold">Current Leader</p>
                  <p className="truncate text-xl font-black text-white">{champion.team.name}</p>
                  <p className="mt-0.5 text-xs font-semibold text-mpl-gray">{champion.status}</p>
                </div>
              </div>
            </section>
          )}

          {mainMatches.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              <div className="mpl-card p-3 text-center">
                <p className="text-xl font-black text-mpl-gold">{rows.length}</p>
                <p className="text-[9px] font-black uppercase tracking-widest text-mpl-gray">Teams</p>
              </div>
              <div className="mpl-card p-3 text-center">
                <p className="text-xl font-black text-mpl-gold">{completedMatches}</p>
                <p className="text-[9px] font-black uppercase tracking-widest text-mpl-gray">Played</p>
              </div>
              <div className="mpl-card p-3 text-center">
                <p className="text-xl font-black text-mpl-gold">{mainMatches.length}</p>
                <p className="text-[9px] font-black uppercase tracking-widest text-mpl-gray">Matches</p>
              </div>
            </div>
          )}

          {rows.length > 0 && (
            <section className="overflow-hidden rounded-2xl border border-mpl-border bg-mpl-card">
              <div className="grid grid-cols-[42px_1fr_70px] gap-2 border-b border-mpl-border px-3 py-2 text-[9px] font-black uppercase tracking-widest text-mpl-gray">
                <span className="text-center">#</span>
                <span>Team</span>
                <span className="text-right">Result</span>
              </div>

              {rows.map(row => (
                <div key={row.team.id}>
                  <div className={cn(
                    'grid grid-cols-[42px_1fr_70px] items-center gap-2 px-3 py-3',
                    row.rank === 1 ? 'bg-mpl-gold/10' : ''
                  )}>
                    <div className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-lg text-sm font-black',
                      row.rank === 1 ? 'bg-gold-gradient text-mpl-black' :
                      row.rank === 2 ? 'bg-mpl-border text-white' :
                      'bg-mpl-dark text-mpl-gray'
                    )}>
                      {row.rank === 1 ? <Trophy size={17} /> : row.rank}
                    </div>
                    <div className="min-w-0">
                      <p className={cn('truncate text-sm font-black', row.rank === 1 ? 'text-mpl-gold' : 'text-white')}>{row.team.name}</p>
                      <p className="truncate text-[10px] text-mpl-gray">
                        {row.team.clubName} {row.seed ? `· Seed #${row.seed}` : ''} {row.ranking ? `· Weight ${row.ranking}` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase text-mpl-gold">{row.status}</p>
                      <p className="text-[9px] text-mpl-gray">{row.finalScore ?? row.detail}</p>
                    </div>
                  </div>
                  <GoldDivider />
                </div>
              ))}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function buildDrawRanking(matches: ScheduledMatch[]): DrawRankRow[] {
  const teamMap = new Map<string, Team>();
  matches.forEach(match => {
    if (match.team1) teamMap.set(match.team1.id, match.team1);
    if (match.team2) teamMap.set(match.team2.id, match.team2);
  });

  const finalMatch = getFinalMatch(matches);
  const championId = finalMatch?.status === 'completed' ? finalMatch.winnerId : undefined;
  const rows = Array.from(teamMap.values()).map(team => {
    const loss = matches.find(match =>
      match.status === 'completed' &&
      match.winnerId &&
      (match.team1?.id === team.id || match.team2?.id === team.id) &&
      match.winnerId !== team.id
    );
    const latestMatch = matches
      .filter(match => match.team1?.id === team.id || match.team2?.id === team.id)
      .sort((a, b) => b.round - a.round || b.matchNumber - a.matchNumber)[0];
    const rankGroup = championId === team.id ? 1 : loss ? rankGroupForLoss(loss, matches) : latestMatch ? activeRankGroup(latestMatch, matches) : 999;
    return {
      team,
      rankGroup,
      loss,
      latestMatch,
    };
  });

  rows.sort((a, b) => {
    const groupDiff = a.rankGroup - b.rankGroup;
    if (groupDiff !== 0) return groupDiff;
    const seedDiff = (a.team.seed ?? Number.MAX_SAFE_INTEGER) - (b.team.seed ?? Number.MAX_SAFE_INTEGER);
    if (seedDiff !== 0) return seedDiff;
    const rankingDiff = (a.team.ranking ?? Number.MAX_SAFE_INTEGER) - (b.team.ranking ?? Number.MAX_SAFE_INTEGER);
    if (rankingDiff !== 0) return rankingDiff;
    return a.team.name.localeCompare(b.team.name);
  });

  return rows.map((row, index) => ({
    team: row.team,
    rank: index + 1,
    status: championId === row.team.id ? 'Champion' : row.loss ? resultLabel(row.loss, matches) : 'Still alive',
    detail: row.loss ? `Lost M${row.loss.matchNumber}` : row.latestMatch ? `Last M${row.latestMatch.matchNumber}` : '-',
    finalScore: row.latestMatch?.sets.length ? formatMatchScore(row.latestMatch, row.team.id) : undefined,
    seed: row.team.seed,
    ranking: row.team.ranking,
  }));
}

function getFinalMatch(matches: ScheduledMatch[]): ScheduledMatch | undefined {
  const mainRounds = [...new Set(matches.map(match => match.round))].sort((a, b) => b - a);
  const finalRound = mainRounds[0];
  return matches.find(match => match.round === finalRound);
}

function rankGroupForLoss(loss: ScheduledMatch, matches: ScheduledMatch[]): number {
  const roundMatches = matches.filter(match => match.round === loss.round).length;
  if (roundMatches <= 1) return 2;
  if (roundMatches === 2) return 3;
  return roundMatches + 1;
}

function activeRankGroup(match: ScheduledMatch, matches: ScheduledMatch[]): number {
  const roundMatches = matches.filter(candidate => candidate.round === match.round).length;
  return Math.max(1, roundMatches);
}

function resultLabel(loss: ScheduledMatch, matches: ScheduledMatch[]): string {
  const count = matches.filter(match => match.round === loss.round).length;
  if (count <= 1) return 'Finalist';
  if (count === 2) return 'Semi-finalist';
  if (count === 4) return 'Quarter-finalist';
  return `Round of ${count * 2}`;
}

function formatMatchScore(match: ScheduledMatch, teamId: string): string {
  const side = match.team1?.id === teamId ? 'team1' : 'team2';
  return match.sets.map(set => side === 'team1' ? set.team1Score : set.team2Score).join(' ');
}
