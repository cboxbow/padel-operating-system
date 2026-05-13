import { Trophy, Radio, Users, Swords, TrendingUp } from 'lucide-react';
import { BackButton } from '../components/UI';
import { useAppState, useTournamentData } from '../context';
import { cn } from '../lib';
import type { MatchSet, Pool, ScheduledMatch, Team } from '../types';

export function OBSMainDrawPage() {
  const { navigate, selectedTournament } = useAppState();
  const { matches } = useTournamentData();
  const mainMatches = matches
    .filter(match => match.tournamentId === selectedTournament?.id && !match.poolId && match.drawId)
    .sort((a, b) => (a.round - b.round) || (a.matchNumber - b.matchNumber));
  const rounds = [...new Set(mainMatches.map(match => match.round))].sort((a, b) => a - b);

  return (
    <OBSFrame
      title={selectedTournament?.name ?? 'Main Draw'}
      subtitle="Official Main Draw"
      back={() => navigate('main_draw', selectedTournament?.id)}
    >
      {mainMatches.length === 0 ? (
        <OBSNotice title="Main Draw not live yet" message="Publish the main draw to generate the OBS bracket." />
      ) : (
        <div
          className="grid h-full gap-3 overflow-hidden"
          style={{ gridTemplateColumns: `repeat(${rounds.length}, minmax(0, 1fr))` }}
        >
          {rounds.map(round => {
            const roundMatches = mainMatches.filter(match => match.round === round);
            return (
              <section key={round} className="min-w-0 overflow-hidden">
                <div className="mb-2 flex items-end justify-between border-b border-mpl-gold/25 pb-1.5">
                  <div>
                    <p className="text-lg font-black leading-none text-mpl-gold">{roundLabel(roundMatches.length)}</p>
                    <p className="text-[9px] uppercase tracking-[0.22em] text-mpl-gray">{roundMatches.length} matches</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {roundMatches.map(match => (
                    <OBSMatchCard key={match.id} match={match} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </OBSFrame>
  );
}

export function OBSPoolsPage() {
  const { navigate, selectedTournament } = useAppState();
  const { pools, matches } = useTournamentData();
  const tournamentPools = pools
    .filter(pool => pool.tournamentId === selectedTournament?.id)
    .sort((a, b) => a.letter.localeCompare(b.letter));
  const poolMatches = matches.filter(match => match.tournamentId === selectedTournament?.id && match.poolId);

  return (
    <OBSFrame
      title={selectedTournament?.name ?? 'Pool Draw'}
      subtitle="Pool Draw & Standings"
      back={() => navigate('pool_draw', selectedTournament?.id)}
    >
      {tournamentPools.length === 0 ? (
        <OBSNotice title="Pools not generated yet" message="Generate or publish pools to show the OBS pool view." />
      ) : (
        <div className="grid h-full grid-cols-2 gap-3 overflow-hidden xl:grid-cols-4">
          {tournamentPools.map(pool => (
            <OBSPoolCard
              key={pool.id}
              pool={pool}
              matches={poolMatches.filter(match => match.poolId === pool.id)}
            />
          ))}
        </div>
      )}
    </OBSFrame>
  );
}

function OBSFrame({
  title,
  subtitle,
  back,
  children,
}: {
  title: string;
  subtitle: string;
  back: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col bg-[#050505] text-white">
      <header className="flex items-center gap-4 border-b border-mpl-gold/25 bg-black px-5 py-2.5">
        <BackButton onClick={back} />
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold-gradient text-mpl-black">
          <Trophy size={24} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-black leading-none tracking-wide">{title}</p>
          <p className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.28em] text-mpl-gold">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-green-500/35 bg-green-500/10 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.22em] text-green-300">
          <Radio size={13} /> OBS Live
        </div>
      </header>
      <main className="min-h-0 flex-1 p-3">{children}</main>
    </div>
  );
}

function OBSNotice({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="rounded-3xl border border-mpl-border bg-mpl-card px-10 py-8 text-center">
        <p className="text-3xl font-black text-white">{title}</p>
        <p className="mt-3 text-sm uppercase tracking-[0.22em] text-mpl-gray">{message}</p>
      </div>
    </div>
  );
}

function OBSMatchCard({ match }: { match: ScheduledMatch }) {
  return (
    <div className="rounded-lg border border-mpl-border bg-mpl-card/95 p-1.5 shadow-xl">
      <div className="mb-1 flex items-center justify-between">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-mpl-gray">M{match.matchNumber}</p>
        <span className={cn(
          'rounded-full border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest',
          match.status === 'completed'
            ? 'border-green-500/35 bg-green-500/10 text-green-300'
            : 'border-mpl-gold/30 bg-mpl-gold/10 text-mpl-gold'
        )}>
          {match.status === 'completed' ? 'Final' : 'Live'}
        </span>
      </div>
      <OBSTeamLine team={match.team1} winner={match.winnerId === match.team1?.id} seed={match.team1?.seed} score={formatSets(match.sets, 'team1')} />
      <OBSTeamLine team={match.team2} winner={match.winnerId === match.team2?.id} seed={match.team2?.seed} score={formatSets(match.sets, 'team2')} />
    </div>
  );
}

function OBSTeamLine({ team, winner, seed, score }: { team?: Team; winner: boolean; seed?: number; score?: string }) {
  return (
    <div className={cn(
      'mb-1 flex min-h-[22px] items-center gap-1.5 rounded-md border px-1.5 py-0.5',
      winner ? 'border-mpl-gold bg-mpl-gold/15' : 'border-mpl-border bg-black/35'
    )}>
      <div className={cn(
        'flex h-5 w-5 items-center justify-center rounded text-[9px] font-black',
        winner || seed ? 'bg-gold-gradient text-mpl-black' : 'bg-mpl-border text-mpl-gray'
      )}>
        {seed ? `#${seed}` : winner ? <Trophy size={10} /> : '-'}
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-[10px] font-black leading-tight', winner ? 'text-mpl-gold' : 'text-white')}>
          {team?.name ?? 'TBD'}
        </p>
      </div>
      {score && <span className="ml-1 text-[9px] font-black text-mpl-gray">{score}</span>}
    </div>
  );
}

function OBSPoolCard({ pool, matches }: { pool: Pool; matches: ScheduledMatch[] }) {
  const standings = calculateStandings(pool, matches);

  return (
    <section className="min-h-0 overflow-hidden rounded-2xl border border-mpl-border bg-mpl-card p-3 shadow-2xl">
      <div className="mb-2 flex items-center justify-between border-b border-mpl-gold/25 pb-2">
        <div>
          <p className="text-xl font-black leading-none text-mpl-gold">{pool.name}</p>
          <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.22em] text-mpl-gray">{pool.slots.filter(slot => slot.team).length} teams</p>
        </div>
        <Users className="text-mpl-gold" size={20} />
      </div>

      <div className="space-y-1.5">
        {pool.slots.map(slot => (
          <div key={slot.id} className="flex items-center gap-2 rounded-lg border border-mpl-border bg-black/35 px-2 py-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-mpl-border text-[10px] font-black text-mpl-gray">{slot.position}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-black leading-tight text-white">{slot.team?.name ?? 'Empty'}</p>
              <p className="truncate text-[8px] font-bold uppercase tracking-[0.16em] text-mpl-gray">{slot.team?.clubName ?? 'TBD'}</p>
            </div>
            {slot.isSeedProtected && <span className="rounded border border-mpl-gold/40 px-1 py-0.5 text-[7px] font-black text-mpl-gold">SEED</span>}
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-xl border border-mpl-border bg-black/30 p-2">
        <div className="mb-1.5 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.22em] text-mpl-gold">
          <TrendingUp size={11} /> Standings
        </div>
        <div className="space-y-1">
          {standings.map((row, index) => (
            <div key={row.team.id} className="grid grid-cols-[18px_1fr_34px] items-center gap-2 text-[10px]">
              <span className={cn('font-black', index < 2 ? 'text-mpl-gold' : 'text-mpl-gray')}>{index + 1}</span>
              <span className="truncate font-bold text-white">{row.team.name}</span>
              <span className="text-right font-black text-mpl-gray">{row.wins}-{row.losses}</span>
            </div>
          ))}
          {standings.length === 0 && <p className="text-[10px] font-semibold text-mpl-gray">No teams yet</p>}
        </div>
      </div>

      {matches.length > 0 && (
        <div className="mt-3 rounded-xl border border-mpl-border bg-black/30 p-2">
          <div className="mb-1.5 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.22em] text-mpl-gold">
            <Swords size={11} /> Matches
          </div>
          <div className="space-y-1">
            {matches.slice(0, 6).map(match => (
              <p key={match.id} className="truncate text-[9px] font-bold text-mpl-gray">
                M{match.matchNumber}: <span className="text-white">{match.team1?.name ?? 'TBD'}</span> vs <span className="text-white">{match.team2?.name ?? 'TBD'}</span>
              </p>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function roundLabel(matchCount: number): string {
  if (matchCount === 1) return 'Final';
  if (matchCount === 2) return '1/2';
  if (matchCount === 4) return '1/4';
  return `1/${Math.max(2, matchCount * 2)}`;
}

function formatSets(sets: MatchSet[], side: 'team1' | 'team2'): string | undefined {
  if (sets.length === 0) return undefined;
  return sets.map(set => side === 'team1' ? set.team1Score : set.team2Score).join(' ');
}

function calculateStandings(pool: Pool, matches: ScheduledMatch[]) {
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
    return a.initialPosition - b.initialPosition;
  });
}
