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

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
