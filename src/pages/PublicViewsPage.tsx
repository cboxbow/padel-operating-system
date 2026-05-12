import {
  Trophy, Users, ChevronRight, Globe, Lock
} from 'lucide-react';
import { useAppState, useTournamentData } from '../context';
import { TopBar } from '../components/Navigation';
import { BackButton, GoldDivider } from '../components/UI';
import { cn } from '../lib';
import type { CompetitionMode, MatchSet, Pool, Registration, Team } from '../types';

type PublicMatchLike = { team1?: Team; team2?: Team; winnerId?: string; sets: MatchSet[]; status: string; poolId?: string };

export function PublicPoolsPage() {
  const { navigate, selectedTournament } = useAppState();
  const { pools, matches } = useTournamentData();

  const tournamentPools = pools
    .filter(pool => pool.tournamentId === selectedTournament?.id && ['published', 'locked'].includes(pool.status))
    .sort((a, b) => a.letter.localeCompare(b.letter));
  const poolMatches = matches.filter(match => match.tournamentId === selectedTournament?.id && match.poolId);
  const qualifiersPerPool = selectedTournament?.qualifiersPerPool ?? 2;

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Pool Draw"
        subtitle={selectedTournament?.name ?? 'Official View'}
        leftAction={<BackButton onClick={() => navigate('public_bracket', selectedTournament?.id)} label="Back" />}
        rightAction={
          <div className="flex items-center gap-1.5">
            <Globe size={12} className="text-green-400" />
            <span className="text-xs text-green-400 font-semibold">Live</span>
          </div>
        }
      />
      <div className="flex-1 overflow-y-auto">
        <div className="pb-24 px-4 pt-4 space-y-4">
          <PublicHeader title={selectedTournament?.name ?? 'MPL'} subtitle={selectedTournament?.venue ?? 'Official Pool Draw'} />

          {tournamentPools.length === 0 ? (
            <div className="mpl-card p-4 text-center">
              <p className="text-sm font-semibold text-white">No published pools yet</p>
              <p className="text-xs text-mpl-gray mt-1">Pool draw will appear here once it is officially published.</p>
            </div>
          ) : (
            tournamentPools.map(pool => (
              <div key={pool.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="section-title mb-0">{pool.name}</p>
                  <span className="status-badge status-published">{pool.status}</span>
                </div>
                <PoolTeams pool={pool} />
                <PoolStandings
                  pool={pool}
                  matches={poolMatches.filter(match => match.poolId === pool.id)}
                  qualifiersPerPool={qualifiersPerPool}
                />
                <GoldDivider />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export function PublicBracketPage() {
  const { navigate, selectedTournament } = useAppState();
  const { registrations, matches, pools } = useTournamentData();

  const tournamentRegistrations = registrations
    .filter(reg => reg.tournamentId === selectedTournament?.id && reg.status === 'validated');
  const tournamentPools = pools
    .filter(pool => pool.tournamentId === selectedTournament?.id && ['published', 'locked'].includes(pool.status))
    .sort((a, b) => a.letter.localeCompare(b.letter));
  const tournamentMatches = matches.filter(match => match.tournamentId === selectedTournament?.id);
  const hasPublishedPools = selectedTournament?.competitionMode === 'qualification_phase' && tournamentPools.length > 0;
  const bracketTeams = buildPublicBracketTeams(
    tournamentRegistrations,
    tournamentPools,
    tournamentMatches,
    selectedTournament?.competitionMode,
    selectedTournament?.qualifiersPerPool ?? 2,
  );
  const bracket = buildPublicBracket(bracketTeams);
  const firstRoundByes = bracket.rounds[0]?.matches
    .flatMap(match => match.slots)
    .filter(slot => slot.isBye).length ?? 0;

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Public View"
        subtitle={selectedTournament?.name ?? 'Official Bracket'}
        leftAction={<BackButton onClick={() => navigate('tournament_detail', selectedTournament?.id)} />}
        rightAction={
          <div className="flex items-center gap-1.5">
            <Globe size={11} className="text-green-400" />
            <span className="text-xs text-green-400 font-semibold">Live</span>
          </div>
        }
      />
      <div className="flex-1 overflow-y-auto">
        <div className="pb-24 px-4 pt-4">
          <PublicHeader
            title={selectedTournament?.name ?? 'MPL'}
            subtitle={`${selectedTournament?.venue ?? 'Official'} - ${selectedTournament?.competitionMode === 'qualification_phase' ? 'Qualifs + Main Draw' : 'Main Draw Direct'}`}
          />

          {hasPublishedPools && (
            <button
              onClick={() => navigate('public_pools', selectedTournament?.id)}
              className="w-full mpl-card p-3 flex items-center gap-3 mb-4 hover:border-mpl-gold/30 transition-all"
            >
              <Users size={16} className="text-mpl-gold" />
              <span className="text-sm text-mpl-off-white flex-1 text-left">View Pool Draw & Standings</span>
              <ChevronRight size={14} className="text-mpl-gray" />
            </button>
          )}

          {bracketTeams.length === 0 ? (
            <div className="mpl-card p-4 text-center">
              <p className="text-sm font-semibold text-white">No main draw entries yet</p>
              <p className="text-xs text-mpl-gray mt-1">
                {selectedTournament?.competitionMode === 'qualification_phase'
                  ? 'Complete pool matches to qualify teams, or add direct main draw entries.'
                  : 'The bracket will populate when teams are validated.'}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 mb-4">
                <MiniStat label="Entries" value={bracketTeams.length} />
                <MiniStat label="Slots" value={bracket.size} />
                <MiniStat label="BYEs" value={firstRoundByes} />
              </div>
              <div className="flex items-center justify-between gap-3 mb-2">
                <p className="section-title mb-0">Official Bracket</p>
                <p className="text-[10px] text-mpl-gray">{Math.max(0, bracket.size - 1)} matches</p>
              </div>
              <div className="overflow-x-auto no-scrollbar pb-3">
                <div className="flex gap-3 min-w-max items-start">
                  {bracket.rounds.map(round => (
                    <div key={round.name} className="w-56 flex-shrink-0">
                      <div className="sticky top-0 z-10 bg-mpl-black pb-2">
                        <p className="text-[10px] text-mpl-gold font-black uppercase tracking-widest">{round.name}</p>
                        <p className="text-[10px] text-mpl-gray">{round.matches.length} matches</p>
                      </div>
                      <div className="space-y-3">
                        {round.matches.map(match => (
                          <PublicMatchCard key={match.id} match={match} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {selectedTournament?.competitionMode === 'qualification_phase' && (
                <div className="mt-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2">
                  <p className="text-xs font-bold text-cyan-300">Qualified entries are calculated from pool standings.</p>
                  <p className="text-[11px] text-mpl-gray mt-1">Top {selectedTournament.qualifiersPerPool} per published pool feed this bracket.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PublicMatchCard({ match }: { match: PublicMatch }) {
  return (
    <div className="mpl-card overflow-hidden rounded-lg">
      <div className="px-3 py-2 bg-mpl-dark border-b border-mpl-border flex items-center justify-between">
        <p className="text-[9px] text-mpl-gray font-bold uppercase tracking-widest">M{match.matchNumber}</p>
        <p className="text-[9px] text-mpl-gold font-bold">{match.roundName}</p>
      </div>
      {match.slots.map((slot, index) => (
        <div
          key={slot.id}
          className={cn(
            'min-h-[46px] flex items-center gap-2 px-3 py-2 border-b border-mpl-border/40 last:border-0',
            slot.isBye ? 'bg-yellow-500/5' : slot.source === 'qualified' ? 'bg-cyan-500/5' : ''
          )}
        >
          <div className={cn(
            'w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0',
            slot.isBye ? 'bg-yellow-500/15 text-yellow-400' :
            slot.source === 'winner' ? 'bg-mpl-border text-mpl-gray' :
            slot.source === 'qualified' ? 'bg-cyan-500/15 text-cyan-300' :
            slot.team?.seed ? 'bg-gold-gradient text-mpl-black' : 'bg-mpl-border text-mpl-gray'
          )}>
            {slot.isBye ? 'BYE' : slot.team?.seed ? `#${slot.team.seed}` : slot.source === 'qualified' ? 'Q' : slot.position}
          </div>
          {slot.team ? (
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold text-white truncate">{slot.team.name}</p>
              <p className="text-[10px] text-mpl-gray truncate">{slot.team.clubName}</p>
            </div>
          ) : (
            <div className="flex-1 min-w-0">
              <p className={cn('text-[12px] font-bold truncate', slot.isBye ? 'text-yellow-400' : 'text-mpl-gray')}>
                {slot.label}
              </p>
              <p className="text-[10px] text-mpl-gray">{slot.source === 'winner' ? 'Advances here' : match.roundName}</p>
            </div>
          )}
          {index === 0 && match.slots.length > 1 && <span className="text-[10px] text-mpl-gray">vs</span>}
          {slot.isLocked && <Lock size={10} className="text-mpl-gold flex-shrink-0" />}
        </div>
      ))}
    </div>
  );
}

function PublicHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="p-4 rounded-2xl bg-gradient-to-br from-mpl-card to-mpl-dark border border-mpl-gold/30 mb-4">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-gold-gradient flex items-center justify-center flex-shrink-0">
          <Trophy size={18} className="text-mpl-black" />
        </div>
        <div className="min-w-0">
          <p className="font-black text-white truncate">{title}</p>
          <p className="text-xs text-mpl-gold mt-0.5 truncate">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

function PoolTeams({ pool }: { pool: Pool }) {
  return (
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
                {slot.team?.seed && <span className="text-[9px] bg-gold-gradient text-mpl-black font-black px-1.5 py-0.5 rounded flex-shrink-0">#{slot.team.seed}</span>}
                <p className="text-sm font-semibold text-white truncate">{slot.team?.name}</p>
              </div>
              <p className="text-xs text-mpl-gray">{slot.team?.clubName}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function PoolStandings({
  pool,
  matches,
  qualifiersPerPool,
}: {
  pool: Pool;
  matches: PublicMatchLike[];
  qualifiersPerPool: number;
}) {
  const standings = calculatePoolStandings(pool, matches);

  if (standings.length === 0) return null;

  return (
    <div>
      <p className="section-title">Standings</p>
      <div className="mpl-card overflow-hidden">
        <div className="flex items-center gap-1 px-4 py-2 text-[9px] text-mpl-gray font-bold uppercase tracking-widest bg-mpl-dark border-b border-mpl-border">
          <span className="w-6">#</span>
          <span className="flex-1">Team</span>
          <span className="w-7 text-center">W</span>
          <span className="w-7 text-center">L</span>
          <span className="w-9 text-center">Games</span>
        </div>
        {standings.map((standing, index) => (
          <div key={standing.team.id} className={cn(
            'flex items-center gap-1 px-4 py-2.5 border-b border-mpl-border/40 last:border-0',
            index < qualifiersPerPool ? 'bg-green-500/5' : ''
          )}>
            <div className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0',
              index === 0 ? 'bg-gold-gradient text-mpl-black' :
              index === 1 ? 'bg-mpl-border text-mpl-off-white' : 'text-mpl-gray'
            )}>{index + 1}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{standing.team.name}</p>
              {index < qualifiersPerPool && <span className="text-[9px] text-green-400 font-bold">Qualified</span>}
            </div>
            <span className="w-7 text-center text-sm font-bold text-green-400">{standing.wins}</span>
            <span className="w-7 text-center text-sm font-bold text-red-400">{standing.losses}</span>
            <span className="w-9 text-center text-xs text-mpl-gold font-black">{standing.gamesWon}-{standing.gamesLost}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="mpl-card p-3 text-center">
      <p className="text-lg font-black text-mpl-gold">{value}</p>
      <p className="text-[9px] text-mpl-gray uppercase tracking-widest">{label}</p>
    </div>
  );
}

type PublicSlotSource = 'direct' | 'qualified' | 'bye' | 'winner';

interface PublicSlot {
  id: string;
  position: number;
  label: string;
  team?: Team;
  source: PublicSlotSource;
  isBye: boolean;
  isLocked: boolean;
}

interface PublicMatch {
  id: string;
  roundName: string;
  matchNumber: number;
  slots: PublicSlot[];
}

interface PublicRound {
  name: string;
  matches: PublicMatch[];
}

function buildPublicBracketTeams(
  registrations: Registration[],
  pools: Pool[],
  matches: PublicMatchLike[],
  competitionMode?: CompetitionMode,
  qualifiersPerPool = 2,
): PublicSlot[] {
  const directTeams = registrations
    .filter(reg => competitionMode !== 'qualification_phase' || getDrawEntry(reg.notes) !== 'QUALIF')
    .map(reg => reg.team)
    .sort(compareTeamsForDraw)
    .map((team, index) => createPublicTeamSlot(team, index + 1, 'direct'));

  if (competitionMode !== 'qualification_phase') {
    return directTeams;
  }

  const qualified = pools.flatMap(pool => (
    isPoolComplete(pool, matches.filter(match => match.poolId === pool.id))
      ? calculatePoolStandings(pool, matches.filter(match => match.poolId === pool.id))
      .slice(0, normalizeQualifiersPerPool(qualifiersPerPool))
      .map((standing, index) => ({
        team: standing.team,
        label: `Q${pool.letter}${index + 1}`,
      }))
      : []
  ));
  const directIds = new Set(directTeams.map(slot => slot.team?.id));
  const qualifiedSlots = qualified
    .filter(item => !directIds.has(item.team.id))
    .map((item, index) => createPublicTeamSlot(item.team, directTeams.length + index + 1, 'qualified', item.label));

  return [...directTeams, ...qualifiedSlots];
}

function buildPublicBracket(entries: PublicSlot[]): { size: number; rounds: PublicRound[] } {
  if (entries.length === 0) return { size: 0, rounds: [] };

  const size = nextPowerOfTwo(Math.max(2, entries.length));
  const openingSlots = Array.from({ length: size }, (_, index) => (
    entries[index] ?? createPublicByeSlot(index + 1)
  ));
  const rounds: PublicRound[] = [];
  let carriedSlots: PublicSlot[] = [];
  let currentRoundSize = size;

  while (currentRoundSize >= 2) {
    const roundName = `1/${currentRoundSize}`;
    const sourceSlots = rounds.length === 0 ? openingSlots : carriedSlots;
    const matches = chunkSlots(sourceSlots, 2).map((slots, index) => ({
      id: `public-${roundName}-${index + 1}`,
      roundName,
      matchNumber: index + 1,
      slots,
    }));

    rounds.push({ name: roundName, matches });
    carriedSlots = matches.map((match, index) => {
      const autoWinner = getPublicByeWinner(match);
      return autoWinner ?? createPublicWinnerSlot(roundName, match.matchNumber, index + 1);
    });
    currentRoundSize /= 2;
  }

  return { size, rounds };
}

function createPublicTeamSlot(team: Team, position: number, source: PublicSlotSource, label?: string): PublicSlot {
  return {
    id: `public-${source}-${team.id}-${position}`,
    position,
    label: label ?? team.name,
    team,
    source,
    isBye: false,
    isLocked: Boolean(team.seed),
  };
}

function createPublicByeSlot(position: number): PublicSlot {
  return {
    id: `public-bye-${position}`,
    position,
    label: 'BYE / TBD',
    source: 'bye',
    isBye: true,
    isLocked: false,
  };
}

function createPublicWinnerSlot(roundName: string, matchNumber: number, position: number): PublicSlot {
  return {
    id: `public-winner-${roundName}-${matchNumber}-${position}`,
    position,
    label: `Winner ${roundName} M${matchNumber}`,
    source: 'winner',
    isBye: false,
    isLocked: true,
  };
}

function getPublicByeWinner(match: PublicMatch): PublicSlot | undefined {
  if (match.slots.length !== 2) return undefined;
  const [first, second] = match.slots;
  if (first.isBye && !second.isBye) return { ...second, position: match.matchNumber };
  if (second.isBye && !first.isBye) return { ...first, position: match.matchNumber };
  return undefined;
}

function expectedPoolMatchCount(pool: Pool): number {
  const teamCount = pool.slots.filter(slot => slot.team).length;
  return (teamCount * (teamCount - 1)) / 2;
}

function completedPoolMatchCount(matches: PublicMatchLike[]): number {
  return matches.filter(match => match.status === 'completed').length;
}

function isPoolComplete(pool: Pool, matches: PublicMatchLike[]): boolean {
  const expected = expectedPoolMatchCount(pool);
  return expected > 0 && matches.length >= expected && completedPoolMatchCount(matches) >= expected;
}

function calculatePoolStandings(pool: Pool, matches: PublicMatchLike[]) {
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
    const teamDiff = compareTeamsForDraw(a.team, b.team);
    if (teamDiff !== 0) return teamDiff;
    return a.initialPosition - b.initialPosition;
  });
}

function getDrawEntry(notes?: string): string {
  const match = notes?.match(/Draw entry:\s*([^|]+)/i);
  return match?.[1]?.trim().toUpperCase() ?? '';
}

function compareTeamsForDraw(a: Team, b: Team): number {
  const seedDiff = (a.seed ?? Number.MAX_SAFE_INTEGER) - (b.seed ?? Number.MAX_SAFE_INTEGER);
  if (seedDiff !== 0) return seedDiff;
  const rankingDiff = (a.ranking ?? Number.MAX_SAFE_INTEGER) - (b.ranking ?? Number.MAX_SAFE_INTEGER);
  if (rankingDiff !== 0) return rankingDiff;
  return a.name.localeCompare(b.name);
}

function normalizeQualifiersPerPool(value: number): number {
  return Math.max(1, Math.min(4, Math.floor(value) || 2));
}

function nextPowerOfTwo(value: number) {
  let size = 1;
  while (size < value) size *= 2;
  return size;
}

function chunkSlots<T>(slots: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < slots.length; index += size) {
    chunks.push(slots.slice(index, index + size));
  }
  return chunks;
}
