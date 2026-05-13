import { useEffect, useState } from 'react';
import { Trophy, Radio } from 'lucide-react';
import { useAppState, useTournamentData } from '../context';
import { cn } from '../lib';
import type { MatchSet, Pool, ScheduledMatch } from '../types';
import { readLiveScoreDraft, type LiveScoreDraft } from '../liveScoreDraft';

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
        <div className="grid h-full grid-rows-[auto_1fr] gap-2 overflow-hidden sm:gap-3">
          <OBSPoolGroupsRail pools={tournamentPools} />
          <div className="flex min-h-0 flex-col gap-2 overflow-hidden sm:gap-3">
            {tournamentPools.map(pool => (
              <OBSPoolCard
                key={pool.id}
                pool={pool}
                matches={poolMatches.filter(match => match.poolId === pool.id)}
              />
            ))}
          </div>
        </div>
      )}
    </OBSFrame>
  );
}

export function OBSScoresPage() {
  const { selectedTournament } = useAppState();
  const { matches } = useTournamentData();
  const liveDraft = useLiveScoreDraft(selectedTournament?.id);
  const baseMatches = matches
    .filter(match => match.tournamentId === selectedTournament?.id)
    .sort(sortMatchesForScoreboard);
  const tournamentMatches = applyLiveScoreDraft(baseMatches, liveDraft);
  const liveDraftMatch = liveDraft ? tournamentMatches.find(match => match.id === liveDraft.matchId) : undefined;
  const featuredMatch = liveDraftMatch ??
    tournamentMatches.find(match => match.status === 'ongoing') ??
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
        <div className="grid h-full grid-rows-[auto_1fr] gap-3 overflow-hidden lg:grid-cols-[0.85fr_1.15fr] lg:grid-rows-none lg:gap-4">
          <section className="min-w-0 rounded-2xl border border-mpl-border bg-mpl-card p-3 sm:p-4">
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
            {featuredMatch && <OBSScoreboardMatch match={featuredMatch} allMatches={tournamentMatches} large />}
          </section>

          <section className="grid min-w-0 grid-rows-2 gap-3 overflow-hidden lg:gap-4">
            <OBSScoreList title="Recent Results" matches={recentMatches} allMatches={tournamentMatches} empty="No completed matches yet" scroll />
            <OBSScoreList title="Upcoming / Live" matches={upcomingMatches} allMatches={tournamentMatches} empty="No upcoming matches" scroll />
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
      <header className="relative z-10 flex items-center gap-2 border-b border-mpl-gold/25 bg-black/90 px-3 py-2 sm:gap-4 sm:px-8 sm:py-3">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gold-gradient text-mpl-black shadow-gold sm:h-12 sm:w-12">
          <Trophy size={24} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[clamp(1.35rem,8vw,1.875rem)] font-black leading-none tracking-wide sm:text-3xl">{title}</p>
          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.28em] text-mpl-gold sm:text-xs sm:tracking-[0.36em]">{subtitle}</p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-green-500/35 bg-green-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-green-300 sm:gap-2 sm:px-5 sm:text-xs sm:tracking-[0.26em]">
          <Radio size={14} /> OBS Live
        </div>
      </header>
      <main className="relative z-10 min-h-0 flex-1 p-2.5 sm:p-5">{children}</main>
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

function useLiveScoreDraft(tournamentId?: string): LiveScoreDraft | null {
  const [draft, setDraft] = useState<LiveScoreDraft | null>(() => {
    const current = readLiveScoreDraft();
    return current?.tournamentId === tournamentId ? current : null;
  });

  useEffect(() => {
    const syncDraft = () => {
      const current = readLiveScoreDraft();
      setDraft(current?.tournamentId === tournamentId ? current : null);
    };

    syncDraft();
    window.addEventListener('storage', syncDraft);
    window.addEventListener('mpl-live-score-draft', syncDraft);
    const interval = window.setInterval(syncDraft, 500);

    return () => {
      window.removeEventListener('storage', syncDraft);
      window.removeEventListener('mpl-live-score-draft', syncDraft);
      window.clearInterval(interval);
    };
  }, [tournamentId]);

  return draft;
}

function applyLiveScoreDraft(matches: ScheduledMatch[], draft: LiveScoreDraft | null): ScheduledMatch[] {
  if (!draft) return matches;
  return matches.map(match => {
    if (match.id !== draft.matchId) return match;
    return {
      ...match,
      status: match.status === 'completed' ? match.status : 'ongoing',
      sets: draft.sets,
    };
  });
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
                  <OBSFIPMatchCard match={match} allMatches={matches} />
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OBSFIPMatchCard({ match, allMatches }: { match: ScheduledMatch; allMatches: ScheduledMatch[] }) {
  return (
    <div className="h-full rounded-lg border border-mpl-border bg-[#151515]/95 p-0.5 shadow-xl">
      <div className="flex h-full flex-col gap-0.5">
        <OBSFIPTeamLine winner={match.winnerId === match.team1?.id} score={formatSets(match.sets, 'team1')} label={getDrawTeamLabel(match, 'team1', allMatches)} />
        <OBSFIPTeamLine winner={match.winnerId === match.team2?.id} score={formatSets(match.sets, 'team2')} label={getDrawTeamLabel(match, 'team2', allMatches)} />
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
  return (
    <section className="min-h-0 flex-1 overflow-hidden rounded-xl border border-mpl-border bg-[#f6f6f6] text-black shadow-2xl">
      <PoolMatrixTable pool={pool} matches={matches} variant="obs" />
    </section>
  );
}

function OBSPoolGroupsRail({ pools }: { pools: Pool[] }) {
  return (
    <section className="grid min-h-0 grid-cols-2 gap-2 overflow-hidden lg:grid-cols-4 lg:gap-3">
      {pools.map(pool => {
        const teams = pool.slots
          .filter(slot => slot.team)
          .sort((a, b) => a.position - b.position);
        return (
          <div key={pool.id} className="min-w-0 rounded-xl border border-mpl-gold/25 bg-black/75 p-2 shadow-xl sm:p-2.5">
            <div className="mb-1.5 flex items-center justify-between border-b border-mpl-gold/25 pb-1">
              <p className="text-[11px] font-black uppercase leading-none text-mpl-gold sm:text-[13px]">Group {pool.letter}</p>
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-mpl-gray">{teams.length} teams</p>
            </div>
            <div className="grid gap-y-0.5">
              {teams.map(slot => (
                <div key={slot.id} className="grid min-w-0 grid-cols-[18px_1fr] items-center gap-1">
                  <span className="flex h-4 w-4 items-center justify-center rounded bg-mpl-gold text-[8px] font-black text-black">
                    {slot.position}
                  </span>
                  <span className="min-w-0 truncate text-[8px] font-black uppercase leading-tight text-white sm:text-[9px]">
                    {slot.team?.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}

function PoolMatrixTable({ pool, matches, variant }: { pool: Pool; matches: ScheduledMatch[]; variant: 'obs' | 'admin' }) {
  const teams = pool.slots
    .filter(slot => slot.team)
    .sort((a, b) => a.position - b.position)
    .map(slot => slot.team!);
  const matchByPair = buildPoolMatchMap(pool, matches);
  const standings = calculateStandings(pool, matches);
  const rankByTeamId = new Map(standings.map((row, index) => [row.team.id, index + 1]));
  const columns = `minmax(120px, 0.95fr) repeat(${Math.max(1, teams.length)}, minmax(120px, 1fr)) minmax(54px, 0.35fr)`;

  if (teams.length === 0) {
    return (
      <div className={cn('flex h-full items-center justify-center p-4 text-center font-black uppercase tracking-[0.2em]', variant === 'obs' ? 'text-black' : 'text-mpl-gray')}>
        No teams in {pool.name}
      </div>
    );
  }

  return (
    <div className={cn('h-full min-w-0 overflow-hidden', variant === 'obs' ? 'bg-[#f6f6f6] p-0' : 'rounded-xl border border-mpl-border bg-mpl-dark')}>
      <div className={cn(
        'border border-black/80 text-center font-semibold uppercase',
        variant === 'obs' ? 'bg-[#bdbdbd] px-2 py-1 text-[13px] text-black' : 'bg-mpl-border px-2 py-2 text-xs text-white'
      )}>
        Group {pool.letter}
      </div>
      <div
        className={cn('grid border-l border-t border-black/80', variant === 'obs' ? 'text-[12px]' : 'min-w-[680px] text-[11px]')}
        style={{ gridTemplateColumns: columns }}
      >
        <PoolMatrixCell variant={variant} header>Teams</PoolMatrixCell>
        {teams.map(team => (
          <PoolMatrixCell key={team.id} variant={variant} header title={team.name}>
            {formatMatrixTeamName(team.name, variant)}
          </PoolMatrixCell>
        ))}
        <PoolMatrixCell variant={variant} header>Rank</PoolMatrixCell>

        {teams.map((rowTeam, rowIndex) => (
          <div key={rowTeam.id} className="contents">
            <PoolMatrixCell key={`${rowTeam.id}-name`} variant={variant} header title={rowTeam.name}>
              {formatMatrixTeamName(rowTeam.name, variant)}
            </PoolMatrixCell>
            {teams.map((columnTeam, columnIndex) => {
              const isDiagonal = rowIndex === columnIndex;
              const matchEntry = isDiagonal ? undefined : matchByPair.get(teamPairKey(rowTeam.id, columnTeam.id));
              return (
                <PoolMatrixCell key={`${rowTeam.id}-${columnTeam.id}`} variant={variant} diagonal={isDiagonal}>
                  {matchEntry ? <PoolMatchMatrixValue entry={matchEntry} /> : '-'}
                </PoolMatrixCell>
              );
            })}
            <PoolMatrixCell key={`${rowTeam.id}-rank`} variant={variant}>
              {rankByTeamId.get(rowTeam.id) ? `#${rankByTeamId.get(rowTeam.id)}` : '-'}
            </PoolMatrixCell>
          </div>
        ))}
      </div>
    </div>
  );
}

function PoolMatchMatrixValue({ entry }: { entry: PoolMatchEntry }) {
  const score = formatPoolMatrixScore(entry.match);
  const isLive = entry.match.status === 'ongoing';
  const isFinal = entry.match.status === 'completed';

  return (
    <div className="flex w-full min-w-0 items-center justify-center gap-1.5 leading-tight">
      <span className={cn('font-black', isLive ? 'text-red-600' : isFinal ? 'text-black' : 'text-black')}>
        {entry.code}
      </span>
      {score && (
        <span className={cn(
          'min-w-0 font-black',
          isLive ? 'text-red-600' : isFinal ? 'text-green-700' : 'text-black'
        )}>
          {score}
        </span>
      )}
      {isLive && <span className="rounded bg-red-600 px-1 text-[8px] font-black text-white">LIVE</span>}
    </div>
  );
}

function PoolMatrixCell({
  children,
  diagonal = false,
  header = false,
  title,
  variant,
}: {
  children: React.ReactNode;
  diagonal?: boolean;
  header?: boolean;
  title?: string;
  variant: 'obs' | 'admin';
}) {
  return (
    <div
      title={title}
      className={cn(
        'min-w-0 border-b border-r border-black/80 px-1.5 py-1 leading-tight',
        variant === 'obs' ? 'flex min-h-[22px] items-center justify-center whitespace-normal break-words text-[clamp(8px,0.56vw,11px)]' : 'h-[30px] truncate text-[11px]',
        diagonal ? 'bg-[#626262] text-[#626262]' : variant === 'obs' ? 'bg-white text-black' : 'bg-mpl-black text-white',
        header ? 'justify-start text-left font-semibold' : 'text-center font-medium'
      )}
    >
      {children}
    </div>
  );
}

type PoolMatchEntry = {
  code: string;
  match: ScheduledMatch;
};

function buildPoolMatchMap(pool: Pool, matches: ScheduledMatch[]): Map<string, PoolMatchEntry> {
  return new Map(
    matches
      .filter(match => match.poolId === pool.id && match.team1 && match.team2)
      .sort((a, b) => a.matchNumber - b.matchNumber)
      .map((match, index) => [teamPairKey(match.team1!.id, match.team2!.id), { code: `${pool.letter}${index + 1}`, match }])
  );
}

function formatPoolMatrixScore(match: ScheduledMatch): string {
  if (match.sets.length === 0) return '';
  const score = match.sets
    .filter(set => set.team1Score > 0 || set.team2Score > 0)
    .map(set => `${set.team1Score}-${set.team2Score}`)
    .join(' ');
  return score;
}

function teamPairKey(teamAId: string, teamBId: string): string {
  return [teamAId, teamBId].sort().join(':');
}

function formatMatrixTeamName(name: string, variant: 'obs' | 'admin'): string {
  if (variant === 'obs') return name;
  const limit = 28;
  return name.length > limit ? `${name.slice(0, limit - 3)}...` : name;
}

function OBSScoreboardMatch({ match, allMatches, large = false }: { match: ScheduledMatch; allMatches: ScheduledMatch[]; large?: boolean }) {
  return (
    <div className="space-y-2">
      <OBSScoreTeam match={match} allMatches={allMatches} side="team1" winner={match.winnerId === match.team1?.id} sets={match.sets} large={large} />
      <OBSScoreTeam match={match} allMatches={allMatches} side="team2" winner={match.winnerId === match.team2?.id} sets={match.sets} large={large} />
    </div>
  );
}

function OBSScoreTeam({
  match,
  allMatches,
  winner,
  sets,
  side,
  large,
}: {
  match: ScheduledMatch;
  allMatches: ScheduledMatch[];
  winner: boolean;
  sets: MatchSet[];
  side: 'team1' | 'team2';
  large?: boolean;
}) {
  const team = side === 'team1' ? match.team1 : match.team2;

  return (
    <div className={cn(
      'grid items-center gap-2 rounded-xl border bg-black/35 sm:gap-3',
      large ? 'grid-cols-[46px_1fr_repeat(3,42px)] px-3 py-3 sm:grid-cols-[56px_1fr_repeat(3,64px)] sm:px-4 sm:py-4' : 'grid-cols-[34px_1fr_repeat(3,34px)] px-2 py-2',
      winner ? 'border-mpl-gold bg-mpl-gold/15' : 'border-mpl-border'
    )}>
      <div className={cn(
        'flex items-center justify-center rounded-lg font-black',
        large ? 'h-11 w-11 text-sm sm:h-12 sm:w-12 sm:text-base' : 'h-8 w-8 text-xs',
        winner || team?.seed ? 'bg-gold-gradient text-mpl-black' : 'bg-mpl-border text-mpl-gray'
      )}>
        {team?.seed ? `#${team.seed}` : winner ? <Trophy size={large ? 23 : 15} /> : '-'}
      </div>
      <div className="min-w-0">
        <p className={cn('truncate font-black leading-tight', large ? 'text-[clamp(1rem,4.5vw,1.875rem)] sm:text-3xl' : 'text-sm', winner ? 'text-mpl-gold' : 'text-white')}>
          {getScoreTeamLabel(match, side, allMatches)}
        </p>
        <p className={cn('truncate font-bold uppercase tracking-[0.16em] text-mpl-gray', large ? 'text-[10px] sm:text-xs' : 'text-[8px]')}>{team?.clubName ?? 'Awaiting team'}</p>
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
              large ? 'h-11 text-xl sm:h-12 sm:text-3xl' : 'h-8 text-sm',
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

function OBSScoreList({ title, matches, allMatches, empty, scroll = false }: { title: string; matches: ScheduledMatch[]; allMatches: ScheduledMatch[]; empty: string; scroll?: boolean }) {
  const shouldScroll = scroll && matches.length > 4;
  const duration = Math.max(24, matches.length * 4.5);
  const items = (
    <>
      {matches.length === 0 && <p className="text-sm font-semibold text-mpl-gray">{empty}</p>}
      {matches.map(match => (
        <OBSScoreListItem key={match.id} match={match} allMatches={allMatches} />
      ))}
    </>
  );

  return (
    <div className="min-h-0 overflow-hidden rounded-2xl border border-mpl-border bg-mpl-card p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between border-b border-mpl-gold/25 pb-2">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-mpl-gold sm:text-[13px] sm:tracking-[0.26em]">{title}</p>
        <span className="rounded-full border border-mpl-border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-mpl-gray">{matches.length}</span>
      </div>
      {shouldScroll ? (
        <div className="obs-scroll-panel">
          <div className="obs-scroll-track space-y-2" style={{ animationDuration: `${duration}s` }}>
            {items}
            <div className="h-2" />
            {items}
          </div>
        </div>
      ) : (
        <div className="space-y-2">{items}</div>
      )}
    </div>
  );
}

function OBSScoreListItem({ match, allMatches }: { match: ScheduledMatch; allMatches: ScheduledMatch[] }) {
  return (
    <div className="rounded-xl border border-mpl-border bg-black/40 px-2.5 py-2 shadow-xl sm:px-3">
      <div className="mb-1.5 flex justify-between text-[9px] font-black uppercase tracking-[0.22em] text-mpl-gray">
        <span>{match.poolId ? 'Pool' : 'Draw'} M{match.matchNumber}</span>
        <span className={cn(match.status === 'completed' ? 'text-green-300' : 'text-mpl-gold')}>{match.status}</span>
      </div>
      <OBSScoreMiniLine label={getScoreTeamLabel(match, 'team1', allMatches)} winner={match.winnerId === match.team1?.id} score={formatSets(match.sets, 'team1')} />
      <OBSScoreMiniLine label={getScoreTeamLabel(match, 'team2', allMatches)} winner={match.winnerId === match.team2?.id} score={formatSets(match.sets, 'team2')} />
    </div>
  );
}

function OBSScoreMiniLine({ label, winner, score }: { label: string; winner: boolean; score?: string }) {
  return (
    <div className="grid grid-cols-[1fr_44px] items-center gap-2 text-[11px] leading-tight sm:grid-cols-[1fr_68px] sm:gap-3 sm:text-[13px]">
      <span className={cn('truncate font-black', winner ? 'text-mpl-gold' : 'text-white')}>{label}</span>
      <span className={cn('text-right text-[10px] font-black sm:text-[12px]', winner ? 'text-mpl-gold' : 'text-mpl-gray')}>{score ?? '-'}</span>
    </div>
  );
}

function roundLabel(matchCount: number): string {
  if (matchCount === 1) return 'Final';
  if (matchCount === 2) return '1/2';
  if (matchCount === 4) return '1/4';
  return `1/${Math.max(2, matchCount * 2)}`;
}

function getDrawTeamLabel(match: ScheduledMatch, side: 'team1' | 'team2', allMatches: ScheduledMatch[]): string {
  const team = side === 'team1' ? match.team1 : match.team2;
  if (team) return team.name;
  if (match.isBye) return 'BYE';
  const sourceMatch = findSourceMatch(match, side, allMatches);
  return sourceMatch ? `Winner M${sourceMatch.matchNumber}` : 'Awaiting opponent';
}

function getScoreTeamLabel(match: ScheduledMatch, side: 'team1' | 'team2', allMatches: ScheduledMatch[]): string {
  const team = side === 'team1' ? match.team1 : match.team2;
  if (team) return team.name;
  if (match.isBye) return 'BYE';
  const sourceMatch = findSourceMatch(match, side, allMatches);
  return sourceMatch ? `Winner M${sourceMatch.matchNumber}` : 'Awaiting opponent';
}

function findSourceMatch(match: ScheduledMatch, side: 'team1' | 'team2', allMatches: ScheduledMatch[]): ScheduledMatch | undefined {
  const previousRound = Math.max(
    0,
    ...allMatches
      .filter(candidate => candidate.drawId === match.drawId && candidate.round < match.round)
      .map(candidate => candidate.round)
  );
  if (!previousRound) return undefined;

  const currentRoundMatches = allMatches
    .filter(candidate => candidate.drawId === match.drawId && candidate.round === match.round)
    .sort((a, b) => a.matchNumber - b.matchNumber);
  const currentIndex = currentRoundMatches.findIndex(candidate => candidate.id === match.id);
  if (currentIndex < 0) return undefined;

  const previousRoundMatches = allMatches
    .filter(candidate => candidate.drawId === match.drawId && candidate.round === previousRound)
    .sort((a, b) => a.matchNumber - b.matchNumber);
  return previousRoundMatches[(currentIndex * 2) + (side === 'team1' ? 0 : 1)];
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
