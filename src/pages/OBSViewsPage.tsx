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
        <div className="flex h-full gap-5 overflow-x-auto pb-4">
          {rounds.map(round => {
            const roundMatches = mainMatches.filter(match => match.round === round);
            return (
              <section key={round} className="min-w-[330px] flex-1">
                <div className="mb-4 flex items-end justify-between border-b border-mpl-gold/25 pb-2">
                  <div>
                    <p className="text-2xl font-black text-mpl-gold">{roundLabel(roundMatches.length)}</p>
                    <p className="text-xs uppercase tracking-[0.28em] text-mpl-gray">{roundMatches.length} matches</p>
                  </div>
                </div>
                <div className="space-y-3">
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
        <div className="grid h-full grid-cols-2 gap-5 overflow-y-auto pr-2 xl:grid-cols-4">
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
      <header className="flex items-center gap-5 border-b border-mpl-gold/25 bg-black px-8 py-5">
        <BackButton onClick={back} />
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gold-gradient text-mpl-black">
          <Trophy size={32} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-4xl font-black leading-none tracking-wide">{title}</p>
          <p className="mt-1 text-sm font-bold uppercase tracking-[0.34em] text-mpl-gold">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-green-500/35 bg-green-500/10 px-5 py-2 text-sm font-black uppercase tracking-[0.24em] text-green-300">
          <Radio size={17} /> OBS Live
        </div>
      </header>
      <main className="min-h-0 flex-1 p-6">{children}</main>
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
    <div className="rounded-2xl border border-mpl-border bg-mpl-card/95 p-3 shadow-2xl">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-mpl-gray">M{match.matchNumber}</p>
        <span className={cn(
          'rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-widest',
          match.status === 'completed'
            ? 'border-green-500/35 bg-green-500/10 text-green-300'
            : 'border-mpl-gold/30 bg-mpl-gold/10 text-mpl-gold'
        )}>
          {match.status === 'completed' ? 'Final' : 'Live'}
        </span>
      </div>
      <OBSTeamLine team={match.team1} winner={match.winnerId === match.team1?.id} seed={match.team1?.seed} />
      <OBSTeamLine team={match.team2} winner={match.winnerId === match.team2?.id} seed={match.team2?.seed} />
      {match.sets.length > 0 && (
        <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl border border-mpl-border bg-black/40 px-3 py-2 text-xs text-mpl-gray">
          <span>{formatSets(match.sets, 'team1')}</span>
          <span className="text-right">{formatSets(match.sets, 'team2')}</span>
        </div>
      )}
    </div>
  );
}

function OBSTeamLine({ team, winner, seed }: { team?: Team; winner: boolean; seed?: number }) {
  return (
    <div className={cn(
      'mb-1.5 flex min-h-[48px] items-center gap-3 rounded-xl border px-3 py-2',
      winner ? 'border-mpl-gold bg-mpl-gold/15' : 'border-mpl-border bg-black/35'
    )}>
      <div className={cn(
        'flex h-9 w-9 items-center justify-center rounded-lg text-sm font-black',
        winner || seed ? 'bg-gold-gradient text-mpl-black' : 'bg-mpl-border text-mpl-gray'
      )}>
        {seed ? `#${seed}` : winner ? <Trophy size={17} /> : '-'}
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-lg font-black leading-tight', winner ? 'text-mpl-gold' : 'text-white')}>
          {team?.name ?? 'TBD'}
        </p>
        <p className="truncate text-[11px] font-bold uppercase tracking-[0.18em] text-mpl-gray">{team?.clubName ?? 'Awaiting team'}</p>
      </div>
    </div>
  );
}

function OBSPoolCard({ pool, matches }: { pool: Pool; matches: ScheduledMatch[] }) {
  const standings = calculateStandings(pool, matches);

  return (
    <section className="min-h-0 rounded-3xl border border-mpl-border bg-mpl-card p-4 shadow-2xl">
      <div className="mb-4 flex items-center justify-between border-b border-mpl-gold/25 pb-3">
        <div>
          <p className="text-3xl font-black text-mpl-gold">{pool.name}</p>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-mpl-gray">{pool.slots.filter(slot => slot.team).length} teams</p>
        </div>
        <Users className="text-mpl-gold" size={28} />
      </div>

      <div className="space-y-2">
        {pool.slots.map(slot => (
          <div key={slot.id} className="flex items-center gap-3 rounded-xl border border-mpl-border bg-black/35 px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-mpl-border text-sm font-black text-mpl-gray">{slot.position}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-black text-white">{slot.team?.name ?? 'Empty'}</p>
              <p className="truncate text-[10px] font-bold uppercase tracking-[0.18em] text-mpl-gray">{slot.team?.clubName ?? 'TBD'}</p>
            </div>
            {slot.isSeedProtected && <span className="rounded border border-mpl-gold/40 px-1.5 py-0.5 text-[9px] font-black text-mpl-gold">SEED</span>}
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-mpl-border bg-black/30 p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-mpl-gold">
          <TrendingUp size={14} /> Standings
        </div>
        <div className="space-y-1.5">
          {standings.map((row, index) => (
            <div key={row.team.id} className="grid grid-cols-[28px_1fr_44px] items-center gap-2 text-sm">
              <span className={cn('font-black', index < 2 ? 'text-mpl-gold' : 'text-mpl-gray')}>{index + 1}</span>
              <span className="truncate font-bold text-white">{row.team.name}</span>
              <span className="text-right font-black text-mpl-gray">{row.wins}-{row.losses}</span>
            </div>
          ))}
          {standings.length === 0 && <p className="text-sm font-semibold text-mpl-gray">No teams yet</p>}
        </div>
      </div>

      {matches.length > 0 && (
        <div className="mt-4 rounded-2xl border border-mpl-border bg-black/30 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-mpl-gold">
            <Swords size={14} /> Matches
          </div>
          <div className="space-y-1.5">
            {matches.slice(0, 4).map(match => (
              <p key={match.id} className="truncate text-xs font-bold text-mpl-gray">
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

function formatSets(sets: MatchSet[], side: 'team1' | 'team2'): string {
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
