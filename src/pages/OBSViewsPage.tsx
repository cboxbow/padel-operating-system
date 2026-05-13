import { Trophy, Radio, Users, Swords, TrendingUp } from 'lucide-react';
import { useAppState, useTournamentData } from '../context';
import { cn } from '../lib';
import type { MatchSet, Pool, ScheduledMatch, Team } from '../types';

export function OBSMainDrawPage() {
  const { selectedTournament } = useAppState();
  const { matches } = useTournamentData();
  const mainMatches = matches
    .filter(match => match.tournamentId === selectedTournament?.id && !match.poolId && match.drawId)
    .sort((a, b) => (a.round - b.round) || (a.matchNumber - b.matchNumber));
  const rounds = [...new Set(mainMatches.map(match => match.round))].sort((a, b) => a - b);

  return (
    <OBSFrame
      title={selectedTournament?.name ?? 'Main Draw'}
      subtitle="Official Main Draw"
    >
      {mainMatches.length === 0 ? (
        <OBSNotice title="Main Draw not live yet" message="Publish the main draw to generate the OBS bracket." />
      ) : (
        <OBSFIPBracket rounds={rounds} matches={mainMatches} />
      )}
    </OBSFrame>
  );
}

export function OBSPoolsPage() {
  const { selectedTournament } = useAppState();
  const { pools, matches } = useTournamentData();
  const tournamentPools = pools
    .filter(pool => pool.tournamentId === selectedTournament?.id)
    .sort((a, b) => a.letter.localeCompare(b.letter));
  const poolMatches = matches.filter(match => match.tournamentId === selectedTournament?.id && match.poolId);

  return (
    <OBSFrame
      title={selectedTournament?.name ?? 'Pool Draw'}
      subtitle="Pool Draw & Standings"
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

export function OBSScoresPage() {
  const { selectedTournament } = useAppState();
  const { matches } = useTournamentData();
  const tournamentMatches = matches
    .filter(match => match.tournamentId === selectedTournament?.id)
    .sort(sortMatchesForScoreboard);
  const featuredMatch = tournamentMatches.find(match => match.status === 'ongoing') ??
    tournamentMatches.find(match => match.status === 'scheduled' && match.team1 && match.team2) ??
    tournamentMatches.find(match => match.status === 'completed') ??
    tournamentMatches[0];
  const recentMatches = tournamentMatches.filter(match => match.status === 'completed');
  const upcomingMatches = tournamentMatches.filter(match => match.status !== 'completed');

  return (
    <OBSFrame
      title={selectedTournament?.name ?? 'Live Scores'}
      subtitle="Live Scoring"
    >
      {tournamentMatches.length === 0 ? (
        <OBSNotice title="No matches yet" message="Generate pool or main draw matches to show live scoring." />
      ) : (
        <div className="grid h-full grid-cols-[1.15fr_0.85fr] gap-3 overflow-hidden">
          <section className="min-w-0 rounded-2xl border border-mpl-border bg-mpl-card p-4">
            <div className="mb-3 flex items-center justify-between border-b border-mpl-gold/25 pb-2">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-mpl-gray">
                  {featuredMatch?.poolId ? 'Pool Match' : 'Main Draw'} - M{featuredMatch?.matchNumber ?? '-'}
                </p>
                <p className="text-2xl font-black text-mpl-gold">{featuredMatch?.status === 'completed' ? 'Final Score' : 'Live Match'}</p>
              </div>
              <span className={cn(
                'rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em]',
                featuredMatch?.status === 'completed'
                  ? 'border-green-500/35 bg-green-500/10 text-green-300'
                  : 'border-mpl-gold/30 bg-mpl-gold/10 text-mpl-gold'
              )}>
                {featuredMatch?.status ?? 'scheduled'}
              </span>
            </div>
            {featuredMatch && <OBSScoreboardMatch match={featuredMatch} large />}
          </section>

          <section className="grid min-w-0 grid-rows-2 gap-3 overflow-hidden">
            <OBSScoreList title="Recent Results" matches={recentMatches} empty="No completed matches yet" scroll />
            <OBSScoreList title="Upcoming / Live" matches={upcomingMatches} empty="No upcoming matches" scroll />
          </section>
        </div>
      )}
    </OBSFrame>
  );
}

function OBSFrame({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-[#030303] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(212,175,55,0.12),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.03),transparent_38%)]" />
      <header className="relative z-10 flex items-center gap-4 border-b border-mpl-gold/25 bg-black/90 px-8 py-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold-gradient text-mpl-black shadow-gold">
          <Trophy size={26} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-3xl font-black leading-none tracking-wide">{title}</p>
          <p className="mt-1 text-xs font-black uppercase tracking-[0.36em] text-mpl-gold">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-green-500/35 bg-green-500/10 px-5 py-2 text-xs font-black uppercase tracking-[0.26em] text-green-300">
          <Radio size={14} /> OBS Live
        </div>
      </header>
      <main className="relative z-10 min-h-0 flex-1 p-5">{children}</main>
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

function OBSFIPBracket({ rounds, matches }: { rounds: number[]; matches: ScheduledMatch[] }) {
  const roundCount = rounds.length;
  const firstRoundCount = Math.max(1, matches.filter(match => match.round === rounds[0]).length);
  const nodeHeight = firstRoundCount >= 32 ? 28 : firstRoundCount >= 16 ? 44 : 56;
  const columnWidth = 100 / roundCount;

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-mpl-gold/20 bg-black/45 px-5 pb-4 pt-12 shadow-2xl">
      <div
        className="absolute inset-x-5 top-3 grid h-8 gap-5"
        style={{ gridTemplateColumns: `repeat(${roundCount}, minmax(0, 1fr))` }}
      >
        {rounds.map(round => {
          const matchCount = matches.filter(match => match.round === round).length;
          return (
            <div key={round} className="min-w-0 border-b border-mpl-gold/35">
              <p className="truncate text-xl font-black leading-none text-mpl-gold">{roundLabel(matchCount)}</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-mpl-gray">{matchCount} matches</p>
            </div>
          );
        })}
      </div>

      <div className="absolute inset-x-5 bottom-4 top-14">
        <svg className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none">
          {rounds.slice(0, -1).flatMap((round, roundIndex) => {
            const roundMatches = matches.filter(match => match.round === round).sort((a, b) => a.matchNumber - b.matchNumber);
            const nextRound = rounds[roundIndex + 1];
            const nextRoundMatches = matches.filter(match => match.round === nextRound).sort((a, b) => a.matchNumber - b.matchNumber);
            return roundMatches.map((match, matchIndex) => {
              const nextIndex = Math.floor(matchIndex / 2);
              if (!nextRoundMatches[nextIndex]) return null;
              const fromX = ((roundIndex + 1) * columnWidth) - 1.25;
              const toX = ((roundIndex + 1) * columnWidth) + 1.25;
              const midX = (fromX + toX) / 2;
              const fromY = bracketCenterPercent(matchIndex, roundIndex, firstRoundCount);
              const toY = bracketCenterPercent(nextIndex, roundIndex + 1, firstRoundCount);
              return (
                <path
                  key={`${match.id}-${nextRoundMatches[nextIndex].id}`}
                  d={`M ${fromX} ${fromY} H ${midX} V ${toY} H ${toX}`}
                  vectorEffect="non-scaling-stroke"
                  fill="none"
                  stroke="rgba(222, 185, 56, 0.58)"
                  strokeWidth="1.5"
                />
              );
            });
          })}
        </svg>

        {rounds.map((round, roundIndex) => {
          const roundMatches = matches.filter(match => match.round === round).sort((a, b) => a.matchNumber - b.matchNumber);
          return (
            <div
              key={round}
              className="absolute top-0 h-full"
              style={{
                left: `${roundIndex * columnWidth}%`,
                width: `${columnWidth}%`,
                paddingRight: roundIndex === roundCount - 1 ? 0 : 22,
              }}
            >
              {roundMatches.map((match, matchIndex) => (
                <div
                  key={match.id}
                  className="absolute left-0 right-5"
                  style={{
                    top: `${bracketCenterPercent(matchIndex, roundIndex, firstRoundCount)}%`,
                    height: nodeHeight,
                    transform: 'translateY(-50%)',
                  }}
                >
                  <OBSFIPMatchCard match={match} />
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OBSFIPMatchCard({ match }: { match: ScheduledMatch }) {
  return (
    <div className="h-full rounded-lg border border-mpl-border bg-[#151515]/95 p-0.5 shadow-xl">
      <div className="flex h-full flex-col gap-0.5">
        <OBSFIPTeamLine winner={match.winnerId === match.team1?.id} score={formatSets(match.sets, 'team1')} label={getDrawTeamLabel(match, 'team1')} />
        <OBSFIPTeamLine winner={match.winnerId === match.team2?.id} score={formatSets(match.sets, 'team2')} label={getDrawTeamLabel(match, 'team2')} />
      </div>
    </div>
  );
}

function OBSFIPTeamLine({ winner, score, label }: { winner: boolean; score?: string; label: string }) {
  return (
    <div className={cn(
      'flex min-h-0 flex-1 items-center rounded-md border px-2.5',
      winner ? 'border-mpl-gold bg-mpl-gold/15' : 'border-mpl-border bg-black/35'
    )}>
      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-[12px] font-black leading-tight tracking-[0.01em]', winner ? 'text-mpl-gold' : 'text-white')}>
          {label}
        </p>
      </div>
      {score && <span className={cn('ml-2 flex-shrink-0 text-[10px] font-black', winner ? 'text-mpl-gold' : 'text-mpl-gray')}>{score}</span>}
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

function OBSScoreboardMatch({ match, large = false }: { match: ScheduledMatch; large?: boolean }) {
  return (
    <div className="space-y-2">
      <OBSScoreTeam team={match.team1} winner={match.winnerId === match.team1?.id} sets={match.sets} side="team1" large={large} />
      <OBSScoreTeam team={match.team2} winner={match.winnerId === match.team2?.id} sets={match.sets} side="team2" large={large} />
    </div>
  );
}

function OBSScoreTeam({
  team,
  winner,
  sets,
  side,
  large,
}: {
  team?: Team;
  winner: boolean;
  sets: MatchSet[];
  side: 'team1' | 'team2';
  large?: boolean;
}) {
  return (
    <div className={cn(
      'grid items-center gap-3 rounded-xl border bg-black/35',
      large ? 'grid-cols-[56px_1fr_repeat(3,64px)] px-4 py-4' : 'grid-cols-[34px_1fr_repeat(3,34px)] px-2 py-2',
      winner ? 'border-mpl-gold bg-mpl-gold/15' : 'border-mpl-border'
    )}>
      <div className={cn(
        'flex items-center justify-center rounded-lg font-black',
        large ? 'h-12 w-12 text-base' : 'h-8 w-8 text-xs',
        winner || team?.seed ? 'bg-gold-gradient text-mpl-black' : 'bg-mpl-border text-mpl-gray'
      )}>
        {team?.seed ? `#${team.seed}` : winner ? <Trophy size={large ? 23 : 15} /> : '-'}
      </div>
      <div className="min-w-0">
        <p className={cn('truncate font-black leading-tight', large ? 'text-3xl' : 'text-sm', winner ? 'text-mpl-gold' : 'text-white')}>
          {team?.name ?? 'TBD'}
        </p>
        <p className={cn('truncate font-bold uppercase tracking-[0.18em] text-mpl-gray', large ? 'text-xs' : 'text-[8px]')}>{team?.clubName ?? 'Awaiting team'}</p>
      </div>
      {[0, 1, 2].map(index => {
        const set = sets[index];
        const score = set ? (side === 'team1' ? set.team1Score : set.team2Score) : '';
        const won = set ? (side === 'team1' ? set.team1Score > set.team2Score : set.team2Score > set.team1Score) : false;
        return (
          <div
            key={index}
            className={cn(
              'flex items-center justify-center rounded-lg border font-black',
              large ? 'h-12 text-3xl' : 'h-8 text-sm',
              won ? 'border-mpl-gold bg-mpl-gold/15 text-mpl-gold' : 'border-mpl-border text-mpl-gray'
            )}
          >
            {score}
          </div>
        );
      })}
    </div>
  );
}

function OBSScoreList({ title, matches, empty, scroll = false }: { title: string; matches: ScheduledMatch[]; empty: string; scroll?: boolean }) {
  const shouldScroll = scroll && matches.length > 4;
  const duration = Math.max(18, matches.length * 3.2);
  const items = (
    <>
      {matches.length === 0 && <p className="text-sm font-semibold text-mpl-gray">{empty}</p>}
      {matches.map(match => (
        <OBSScoreListItem key={match.id} match={match} />
      ))}
    </>
  );

  return (
    <div className="min-h-0 overflow-hidden rounded-2xl border border-mpl-border bg-mpl-card p-3">
      <div className="mb-2 flex items-center justify-between border-b border-mpl-gold/25 pb-1.5">
        <p className="text-[11px] font-black uppercase tracking-[0.26em] text-mpl-gold">{title}</p>
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-mpl-gray">{matches.length}</span>
      </div>
      {shouldScroll ? (
        <div className="obs-scroll-panel">
          <div className="obs-scroll-track space-y-1.5" style={{ animationDuration: `${duration}s` }}>
            {items}
            <div className="h-2" />
            {items}
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">{items}</div>
      )}
    </div>
  );
}

function OBSScoreListItem({ match }: { match: ScheduledMatch }) {
  return (
    <div className="rounded-lg border border-mpl-border bg-black/35 px-2 py-1.5">
      <div className="mb-1 flex justify-between text-[8px] font-black uppercase tracking-[0.2em] text-mpl-gray">
        <span>{match.poolId ? 'Pool' : 'Draw'} M{match.matchNumber}</span>
        <span>{match.status}</span>
      </div>
      <OBSScoreMiniLine team={match.team1} winner={match.winnerId === match.team1?.id} score={formatSets(match.sets, 'team1')} />
      <OBSScoreMiniLine team={match.team2} winner={match.winnerId === match.team2?.id} score={formatSets(match.sets, 'team2')} />
    </div>
  );
}

function OBSScoreMiniLine({ team, winner, score }: { team?: Team; winner: boolean; score?: string }) {
  return (
    <div className="grid grid-cols-[1fr_48px] gap-2 text-[10px]">
      <span className={cn('truncate font-black', winner ? 'text-mpl-gold' : 'text-white')}>{team?.name ?? 'TBD'}</span>
      <span className="text-right font-black text-mpl-gray">{score ?? '-'}</span>
    </div>
  );
}

function roundLabel(matchCount: number): string {
  if (matchCount === 1) return 'Final';
  if (matchCount === 2) return '1/2';
  if (matchCount === 4) return '1/4';
  return `1/${Math.max(2, matchCount * 2)}`;
}

function getDrawTeamLabel(match: ScheduledMatch, side: 'team1' | 'team2'): string {
  const team = side === 'team1' ? match.team1 : match.team2;
  if (team) return team.name;
  return match.isBye ? 'BYE' : 'TBD';
}

function bracketCenterPercent(matchIndex: number, roundIndex: number, firstRoundCount: number): number {
  const span = Math.pow(2, roundIndex);
  return (((matchIndex * span) + (span / 2)) / firstRoundCount) * 100;
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

function sortMatchesForScoreboard(a: ScheduledMatch, b: ScheduledMatch): number {
  const statusWeight = (status: ScheduledMatch['status']) => {
    if (status === 'ongoing') return 0;
    if (status === 'scheduled') return 1;
    if (status === 'completed') return 2;
    return 3;
  };
  const statusDiff = statusWeight(a.status) - statusWeight(b.status);
  if (statusDiff !== 0) return statusDiff;
  const roundDiff = a.round - b.round;
  if (roundDiff !== 0) return roundDiff;
  return a.matchNumber - b.matchNumber;
}
