import { supabase } from '../supabaseClient';
import type { Player, Pool, PoolSlot, Team } from '../types';

interface PlayerRow {
  id: string;
  full_name: string;
  avatar_url: string | null;
  club_id: string;
  national_ranking: number | null;
  nationality: string;
}

interface TeamRow {
  id: string;
  name: string;
  club_id: string;
  seed: number | null;
  is_seed_locked: boolean;
  ranking: number | null;
  clubs: {
    name: string;
    short_code: string;
  };
  player1: PlayerRow;
  player2: PlayerRow | null;
}

interface PoolSlotRow {
  id: string;
  pool_id: string;
  position: number;
  is_locked: boolean;
  is_seed_protected: boolean;
  teams: TeamRow | null;
}

interface PoolRow {
  id: string;
  name: string;
  letter: string;
  max_teams: number;
  matches_generated: boolean;
  status: Pool['status'];
  tournament_events: {
    tournament_id: string;
  };
  pool_slots: PoolSlotRow[];
}

function toPlayer(row: PlayerRow): Player {
  return {
    id: row.id,
    fullName: row.full_name,
    avatarUrl: row.avatar_url ?? undefined,
    clubId: row.club_id,
    nationalRanking: row.national_ranking ?? undefined,
    nationality: row.nationality,
  };
}

function toTeam(row: TeamRow): Team {
  const fallbackPlayer2 = row.player2 ?? row.player1;

  return {
    id: row.id,
    name: row.name,
    player1: toPlayer(row.player1),
    player2: toPlayer(fallbackPlayer2),
    clubId: row.club_id,
    clubName: row.clubs.short_code || row.clubs.name,
    seed: row.seed ?? undefined,
    isSeedLocked: row.is_seed_locked,
    ranking: row.ranking ?? undefined,
    registrationStatus: 'validated',
    registrationId: '',
  };
}

function toPoolSlot(row: PoolSlotRow): PoolSlot {
  const team = row.teams ? toTeam(row.teams) : undefined;

  return {
    id: row.id,
    poolId: row.pool_id,
    position: row.position,
    team,
    isLocked: row.is_locked,
    isSeedProtected: row.is_seed_protected,
    isEmpty: !team,
  };
}

function toPool(row: PoolRow): Pool {
  return {
    id: row.id,
    tournamentId: row.tournament_events.tournament_id,
    name: row.name,
    letter: row.letter,
    maxTeams: row.max_teams,
    matchesGenerated: row.matches_generated,
    status: row.status,
    slots: [...(row.pool_slots ?? [])].sort((a, b) => a.position - b.position).map(toPoolSlot),
  };
}

export async function fetchPools(): Promise<Pool[]> {
  const { data, error } = await supabase
    .from('pools')
    .select(`
      id,
      name,
      letter,
      max_teams,
      matches_generated,
      status,
      tournament_events!inner(tournament_id),
      pool_slots(
        id,
        pool_id,
        position,
        is_locked,
        is_seed_protected,
        teams(
          id,
          name,
          club_id,
          seed,
          is_seed_locked,
          ranking,
          clubs!inner(name, short_code),
          player1:players!teams_player1_id_fkey(id, full_name, avatar_url, club_id, national_ranking, nationality),
          player2:players!teams_player2_id_fkey(id, full_name, avatar_url, club_id, national_ranking, nationality)
        )
      )
    `)
    .order('letter', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map(row => toPool(row as unknown as PoolRow));
}

export async function updatePoolSlotAssignment(slotId: string, team: Team | undefined): Promise<void> {
  if (!isUuid(slotId)) {
    return;
  }

  const { error } = await supabase
    .from('pool_slots')
    .update({ team_id: team && isUuid(team.id) ? team.id : null })
    .eq('id', slotId);

  if (error) {
    throw error;
  }
}

export async function updatePoolSlotLock(slotId: string, isLocked: boolean): Promise<void> {
  if (!isUuid(slotId)) {
    return;
  }

  const { error } = await supabase
    .from('pool_slots')
    .update({ is_locked: isLocked })
    .eq('id', slotId);

  if (error) {
    throw error;
  }
}

export async function updatePoolStatus(poolId: string, status: Pool['status']): Promise<void> {
  if (!isUuid(poolId)) {
    return;
  }

  const { error } = await supabase
    .from('pools')
    .update({ status })
    .eq('id', poolId);

  if (error) {
    throw error;
  }
}

export async function addPoolSlot(poolId: string, position: number): Promise<void> {
  if (!isUuid(poolId)) {
    return;
  }

  const { error } = await supabase
    .from('pool_slots')
    .insert({
      pool_id: poolId,
      position,
      team_id: null,
      is_locked: false,
      is_seed_protected: false,
    });

  if (error) {
    throw error;
  }

  const { error: poolError } = await supabase
    .from('pools')
    .update({ max_teams: position })
    .eq('id', poolId);

  if (poolError) {
    throw poolError;
  }
}

export async function generatePoolDraw(tournamentId: string, teams: Team[], requestedPoolCount?: number): Promise<void> {
  if (teams.length < 2) {
    throw new Error('At least 2 validated teams are required to generate pools.');
  }

  const { data: event, error: eventError } = await supabase
    .from('tournament_events')
    .select('id')
    .eq('tournament_id', tournamentId)
    .limit(1)
    .maybeSingle();

  if (eventError) {
    throw eventError;
  }

  if (!event) {
    throw new Error('No tournament event found for this tournament.');
  }

  const { data: existingPools, error: existingError } = await supabase
    .from('pools')
    .select('id,status')
    .eq('tournament_event_id', event.id);

  if (existingError) {
    throw existingError;
  }

  if ((existingPools ?? []).some(pool => pool.status !== 'draft')) {
    throw new Error('Published or locked pools already exist. Unlock/reset them before regenerating.');
  }

  if ((existingPools ?? []).length > 0) {
    const { error: deleteError } = await supabase
      .from('pools')
      .delete()
      .eq('tournament_event_id', event.id);

    if (deleteError) {
      throw deleteError;
    }
  }

  const sortedTeams = [...teams].sort((a, b) => {
    const seedDiff = (a.seed ?? Number.MAX_SAFE_INTEGER) - (b.seed ?? Number.MAX_SAFE_INTEGER);
    if (seedDiff !== 0) return seedDiff;
    return (a.ranking ?? Number.MAX_SAFE_INTEGER) - (b.ranking ?? Number.MAX_SAFE_INTEGER);
  });

  const poolCount = Math.max(1, Math.min(requestedPoolCount ?? Math.ceil(sortedTeams.length / 4), sortedTeams.length));
  const poolSize = Math.ceil(sortedTeams.length / poolCount);
  const poolLetters = Array.from({ length: poolCount }, (_, index) => String.fromCharCode(65 + index));

  const { data: createdPools, error: poolError } = await supabase
    .from('pools')
    .insert(poolLetters.map(letter => ({
      tournament_event_id: event.id,
      name: `Pool ${letter}`,
      letter,
      max_teams: poolSize,
      status: 'draft',
      matches_generated: false,
    })))
    .select('id,letter');

  if (poolError) {
    throw poolError;
  }

  const slotRows = buildPoolSlots(createdPools ?? [], sortedTeams, poolSize);

  const { error: slotError } = await supabase
    .from('pool_slots')
    .insert(slotRows);

  if (slotError) {
    throw slotError;
  }

  await updateTournamentStatusByEvent(tournamentId, 'pool_draw_ready');
}

export async function resetPoolDraw(tournamentId: string): Promise<void> {
  const { data: event, error: eventError } = await supabase
    .from('tournament_events')
    .select('id')
    .eq('tournament_id', tournamentId)
    .limit(1)
    .maybeSingle();

  if (eventError) {
    throw eventError;
  }

  if (!event) {
    return;
  }

  const { error } = await supabase
    .from('pools')
    .delete()
    .eq('tournament_event_id', event.id);

  if (error) {
    throw error;
  }

  await updateTournamentStatusByEvent(tournamentId, 'draw_preparation');
}

function buildPoolSlots(
  pools: { id: string; letter: string }[],
  teams: Team[],
  poolSize: number,
) {
  const poolTeams = pools.map(() => [] as Team[]);

  teams.forEach((team, index) => {
    const wave = Math.floor(index / pools.length);
    const positionInWave = index % pools.length;
    const poolIndex = wave % 2 === 0 ? positionInWave : pools.length - 1 - positionInWave;
    poolTeams[poolIndex].push(team);
  });

  return pools.flatMap((pool, poolIndex) => (
    Array.from({ length: poolSize }, (_, slotIndex) => {
      const team = poolTeams[poolIndex][slotIndex];
      return {
        pool_id: pool.id,
        position: slotIndex + 1,
        team_id: team?.id ?? null,
        is_locked: Boolean(team?.seed),
        is_seed_protected: Boolean(team?.seed),
      };
    })
  ));
}

async function updateTournamentStatusByEvent(tournamentId: string, status: string): Promise<void> {
  const { error } = await supabase
    .from('tournaments')
    .update({ status })
    .eq('id', tournamentId);

  if (error) {
    throw error;
  }

  const { error: eventError } = await supabase
    .from('tournament_events')
    .update({ status })
    .eq('tournament_id', tournamentId);

  if (eventError) {
    throw eventError;
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
