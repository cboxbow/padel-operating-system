import { supabase } from '../supabaseClient';
import type { CompetitionMode, Tournament } from '../types';

interface TournamentRow {
  id: string;
  name: string;
  event_type: Tournament['eventType'];
  category: Tournament['category'];
  status: Tournament['status'];
  competition_mode?: CompetitionMode | null;
  qualifiers_per_pool?: number | null;
  pool_count?: number | null;
  start_date: string;
  end_date: string;
  venue: string;
  max_teams: number;
  created_at: string;
  updated_at: string;
}

function toTournament(row: TournamentRow): Tournament {
  return {
    id: row.id,
    name: row.name,
    eventType: row.event_type,
    category: row.category,
    status: row.status,
    competitionMode: row.competition_mode ?? 'main_draw_direct',
    qualifiersPerPool: row.qualifiers_per_pool ?? 2,
    poolCount: row.pool_count ?? 4,
    startDate: row.start_date,
    endDate: row.end_date,
    venue: row.venue,
    maxTeams: row.max_teams,
    registeredTeams: 0,
    validatedTeams: 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchTournaments(): Promise<Tournament[]> {
  const { data, error } = await supabase
    .from('tournaments')
    .select('id,name,event_type,category,status,competition_mode,qualifiers_per_pool,pool_count,start_date,end_date,venue,max_teams,created_at,updated_at')
    .order('start_date', { ascending: false });

  if (error && isMissingColumnError(error)) {
    return fetchTournamentsFallback();
  }

  if (error) {
    throw error;
  }

  return (data ?? []).map(row => toTournament(row as TournamentRow));
}

async function fetchTournamentsFallback(): Promise<Tournament[]> {
  const { data, error } = await supabase
    .from('tournaments')
    .select('id,name,event_type,category,status,start_date,end_date,venue,max_teams,created_at,updated_at')
    .order('start_date', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(row => toTournament(row as TournamentRow));
}

export async function updateTournamentStatus(
  tournamentId: string,
  status: Tournament['status'],
): Promise<void> {
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

export async function updateTournamentMode(
  tournamentId: string,
  competitionMode: CompetitionMode,
): Promise<void> {
  const { error } = await supabase
    .from('tournaments')
    .update({ competition_mode: competitionMode })
    .eq('id', tournamentId);

  if (error) {
    if (isMissingColumnError(error)) {
      throw new Error('La colonne competition_mode manque dans Supabase. Lance la migration 20260511190000_competition_mode.sql.');
    }
    throw error;
  }

  const { error: eventError } = await supabase
    .from('tournament_events')
    .update({ competition_mode: competitionMode })
    .eq('tournament_id', tournamentId);

  if (eventError && !isMissingColumnError(eventError)) {
    throw eventError;
  }
}

export async function updateTournamentQualifiersPerPool(
  tournamentId: string,
  qualifiersPerPool: number,
): Promise<void> {
  const normalized = normalizeQualifiersPerPool(qualifiersPerPool);
  const { error } = await supabase
    .from('tournaments')
    .update({ qualifiers_per_pool: normalized })
    .eq('id', tournamentId);

  if (error) {
    if (isMissingColumnError(error)) {
      throw new Error('La colonne qualifiers_per_pool manque dans Supabase. Lance la migration 20260512120000_qualifiers_per_pool.sql.');
    }
    throw error;
  }

  const { error: eventError } = await supabase
    .from('tournament_events')
    .update({ qualifiers_per_pool: normalized })
    .eq('tournament_id', tournamentId);

  if (eventError && !isMissingColumnError(eventError)) {
    throw eventError;
  }
}

export async function updateTournamentPoolCount(
  tournamentId: string,
  poolCount: number,
): Promise<void> {
  const normalized = normalizePoolCount(poolCount);
  const { error } = await supabase
    .from('tournaments')
    .update({ pool_count: normalized })
    .eq('id', tournamentId);

  if (error) {
    if (isMissingColumnError(error)) {
      throw new Error('La colonne pool_count manque dans Supabase. Lance la migration 20260512123000_pool_count.sql.');
    }
    throw error;
  }

  const { error: eventError } = await supabase
    .from('tournament_events')
    .update({ pool_count: normalized })
    .eq('tournament_id', tournamentId);

  if (eventError && !isMissingColumnError(eventError)) {
    throw eventError;
  }
}

export type CreateTournamentInput = {
  name: string;
  eventType: Tournament['eventType'];
  category: Tournament['category'];
  status: Tournament['status'];
  competitionMode: CompetitionMode;
  qualifiersPerPool: number;
  poolCount: number;
  startDate: string;
  endDate: string;
  venue: string;
  maxTeams: number;
};

export async function createTournament(input: CreateTournamentInput): Promise<Tournament> {
  const adminProfileId = await assertCanCreateTournament();
  const payload = {
    name: input.name,
    event_type: input.eventType,
    category: input.category,
    status: input.status,
    competition_mode: input.competitionMode,
    qualifiers_per_pool: normalizeQualifiersPerPool(input.qualifiersPerPool),
    pool_count: normalizePoolCount(input.poolCount),
    start_date: input.startDate,
    end_date: input.endDate,
    venue: input.venue,
    max_teams: input.maxTeams,
    created_by: adminProfileId,
  };

  const { data: tournament, error } = await supabase
    .from('tournaments')
    .insert(payload)
    .select('id,name,event_type,category,status,competition_mode,qualifiers_per_pool,pool_count,start_date,end_date,venue,max_teams,created_at,updated_at')
    .single();

  if (error && isMissingColumnError(error)) {
    return createTournamentWithoutMode(input, adminProfileId);
  }

  if (error) {
    throw error;
  }

  const row = tournament as TournamentRow;

  await insertTournamentEvent(row);

  return toTournament(row);
}

async function createTournamentWithoutMode(input: CreateTournamentInput, adminProfileId: string): Promise<Tournament> {
  const { data: tournament, error } = await supabase
    .from('tournaments')
    .insert({
      name: input.name,
      event_type: input.eventType,
      category: input.category,
      status: input.status,
      start_date: input.startDate,
      end_date: input.endDate,
      venue: input.venue,
      max_teams: input.maxTeams,
      created_by: adminProfileId,
    })
    .select('id,name,event_type,category,status,start_date,end_date,venue,max_teams,created_at,updated_at')
    .single();

  if (error) {
    throw error;
  }

  const row = {
    ...(tournament as TournamentRow),
    competition_mode: input.competitionMode,
    qualifiers_per_pool: normalizeQualifiersPerPool(input.qualifiersPerPool),
    pool_count: normalizePoolCount(input.poolCount),
  };

  await insertTournamentEvent(row);

  return toTournament(row);
}

async function insertTournamentEvent(row: TournamentRow): Promise<void> {
  const eventPayload = {
    tournament_id: row.id,
    name: row.name,
    event_type: row.event_type,
    category: row.category,
    max_teams: row.max_teams,
    status: row.status,
    competition_mode: row.competition_mode ?? 'main_draw_direct',
    qualifiers_per_pool: row.qualifiers_per_pool ?? 2,
    pool_count: row.pool_count ?? 4,
    starts_at: `${row.start_date}T00:00:00+04:00`,
    ends_at: `${row.end_date}T23:59:00+04:00`,
  };

  const { error } = await supabase.from('tournament_events').insert(eventPayload);

  if (!error) return;

  if (!isMissingColumnError(error)) {
    throw error;
  }

  const { competition_mode: _competitionMode, qualifiers_per_pool: _qualifiersPerPool, pool_count: _poolCount, ...fallbackPayload } = eventPayload;
  const { error: fallbackError } = await supabase.from('tournament_events').insert(fallbackPayload);

  if (fallbackError) {
    throw fallbackError;
  }
}

function isMissingColumnError(error: { code?: string; message?: string }): boolean {
  return error.code === '42703' || error.code === 'PGRST204' || /competition_mode|qualifiers_per_pool|pool_count|column/i.test(error.message ?? '');
}

function normalizeQualifiersPerPool(value: number): number {
  return Math.max(1, Math.min(4, Math.floor(value) || 2));
}

function normalizePoolCount(value: number): number {
  return Math.max(1, Math.min(16, Math.floor(value) || 4));
}

async function assertCanCreateTournament(): Promise<string> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new Error('Connecte-toi avec un compte Supabase admin avant de creer un tournoi.');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id,role')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(`Impossible de verifier le role admin: ${profileError.message}`);
  }

  if (!profile) {
    throw new Error('Aucun profil trouve pour ce login. Ajoute une ligne dans public.profiles pour cet utilisateur avec role = super_admin.');
  }

  if (!['admin', 'super_admin'].includes(profile.role)) {
    throw new Error(`Ce compte a le role "${profile.role}". Il faut admin ou super_admin pour creer un tournoi.`);
  }

  return profile.id;
}
