import { supabase } from '../supabaseClient';
import type { Registration, RegistrationStatus, Team, Player } from '../types';

interface RegistrationRow {
  id: string;
  status: RegistrationStatus;
  rejection_reason: string | null;
  validated_at: string | null;
  submitted_at: string;
  notes: string | null;
  tournament_events: {
    tournament_id: string;
  };
  teams: {
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
    player1: {
      id: string;
      full_name: string;
      avatar_url: string | null;
      club_id: string;
      national_ranking: number | null;
      nationality: string;
    };
    player2: {
      id: string;
      full_name: string;
      avatar_url: string | null;
      club_id: string;
      national_ranking: number | null;
      nationality: string;
    } | null;
  };
}

function toPlayer(row: RegistrationRow['teams']['player1']): Player {
  return {
    id: row.id,
    fullName: row.full_name,
    avatarUrl: row.avatar_url ?? undefined,
    clubId: row.club_id,
    nationalRanking: row.national_ranking ?? undefined,
    nationality: row.nationality,
  };
}

function toTeam(row: RegistrationRow['teams'], registration: RegistrationRow): Team {
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
    registrationStatus: registration.status,
    registrationId: registration.id,
  };
}

function toRegistration(row: RegistrationRow): Registration {
  return {
    id: row.id,
    tournamentId: row.tournament_events.tournament_id,
    team: toTeam(row.teams, row),
    submittedAt: row.submitted_at,
    status: row.status,
    rejectionReason: row.rejection_reason ?? undefined,
    validatedBy: row.validated_at ? 'Admin MPL' : undefined,
    validatedAt: row.validated_at ?? undefined,
    notes: row.notes ?? undefined,
  };
}

export async function fetchRegistrations(): Promise<Registration[]> {
  const { data, error } = await supabase
    .from('registrations')
    .select(`
      id,
      status,
      rejection_reason,
      validated_at,
      submitted_at,
      notes,
      tournament_events!inner(tournament_id),
      teams!inner(
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
    `)
    .order('submitted_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(row => toRegistration(row as unknown as RegistrationRow));
}

export interface CreateTeamRegistrationInput {
  tournamentId: string;
  teamName: string;
  clubName: string;
  clubShortCode: string;
  clubLocation: string;
  player1Name: string;
  player1Nationality: string;
  player1Ranking?: number;
  player2Name: string;
  player2Nationality: string;
  player2Ranking?: number;
  status: RegistrationStatus;
  notes?: string;
  seed?: number;
  teamRanking?: number;
  isSeedLocked?: boolean;
}

export async function createTeamRegistration(input: CreateTeamRegistrationInput): Promise<Registration> {
  const event = await getTournamentEvent(input.tournamentId);
  const club = await upsertClub(input);
  const player1 = await createPlayer(input.player1Name, club.id, input.player1Nationality, input.player1Ranking);
  const player2 = await createPlayer(input.player2Name, club.id, input.player2Nationality, input.player2Ranking);
  const team = await createTeam(input, event.id, club.id, player1.id, player2.id);
  const profileId = await getCurrentProfileId();

  const { data: registration, error } = await supabase
    .from('registrations')
    .insert({
      tournament_event_id: event.id,
      team_id: team.id,
      submitted_by: profileId,
      status: input.status,
      validated_by: input.status === 'validated' ? profileId : null,
      validated_at: input.status === 'validated' ? new Date().toISOString() : null,
      notes: input.notes ?? null,
    })
    .select(`
      id,
      status,
      rejection_reason,
      validated_at,
      submitted_at,
      notes,
      tournament_events!inner(tournament_id),
      teams!inner(
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
    `)
    .single();

  if (error) {
    throw error;
  }

  const created = toRegistration(registration as unknown as RegistrationRow);
  await insertCreatedRegistrationAuditLog(created, profileId);
  return created;
}

async function getTournamentEvent(tournamentId: string): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from('tournament_events')
    .select('id')
    .eq('tournament_id', tournamentId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('No tournament event found for this tournament.');
  }

  return data;
}

async function upsertClub(input: CreateTeamRegistrationInput): Promise<{ id: string }> {
  const shortCode = input.clubShortCode.trim().toUpperCase();

  const { data, error } = await supabase
    .from('clubs')
    .upsert({
      name: input.clubName.trim(),
      short_code: shortCode,
      location: input.clubLocation.trim() || 'Mauritius',
    }, { onConflict: 'short_code' })
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function createPlayer(
  fullName: string,
  clubId: string,
  nationality: string,
  ranking?: number,
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from('players')
    .insert({
      full_name: fullName.trim(),
      club_id: clubId,
      nationality: nationality.trim().toUpperCase() || 'MU',
      national_ranking: ranking ?? null,
    })
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function createTeam(
  input: CreateTeamRegistrationInput,
  tournamentEventId: string,
  clubId: string,
  player1Id: string,
  player2Id: string,
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from('teams')
    .insert({
      tournament_event_id: tournamentEventId,
      name: input.teamName.trim(),
      player1_id: player1Id,
      player2_id: player2Id,
      club_id: clubId,
      seed: input.seed ?? null,
      is_seed_locked: input.isSeedLocked ?? input.seed !== undefined,
      ranking: input.teamRanking ?? null,
    })
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function getCurrentProfileId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function updateRegistrationStatus(
  registration: Registration,
  status: Extract<RegistrationStatus, 'validated' | 'rejected'>,
  reason?: string,
): Promise<void> {
  if (!isUuid(registration.id)) {
    return;
  }

  const profileId = await getCurrentProfileId();
  const validatedAt = status === 'validated' ? new Date().toISOString() : null;

  const { error } = await supabase
    .from('registrations')
    .update({
      status,
      rejection_reason: status === 'rejected' ? reason ?? null : null,
      validated_by: status === 'validated' ? profileId : null,
      validated_at: validatedAt,
    })
    .eq('id', registration.id);

  if (error) {
    throw error;
  }

  await insertRegistrationAuditLog(registration, status, reason, profileId);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function insertRegistrationAuditLog(
  registration: Registration,
  status: 'validated' | 'rejected',
  reason: string | undefined,
  profileId: string | null,
) {
  const action = status === 'validated' ? 'REGISTRATION_VALIDATED' : 'REGISTRATION_REJECTED';
  const description = status === 'validated'
    ? `Registration validated for ${registration.team.name}.`
    : `Registration rejected for ${registration.team.name}. Reason: ${reason ?? 'No reason provided'}`;

  const { data: event } = await supabase
    .from('tournament_events')
    .select('id')
    .eq('tournament_id', registration.tournamentId)
    .limit(1)
    .maybeSingle();

  const { error } = await supabase
    .from('audit_logs')
    .insert({
      tournament_event_id: event?.id ?? null,
      action,
      module: 'Registrations',
      entity_type: 'registration',
      entity_id: registration.id,
      description,
      admin_id: profileId,
      is_override: false,
      override_reason: status === 'rejected' ? reason ?? null : null,
      previous_state: { status: registration.status },
      new_state: { status },
    });

  if (error) {
    throw error;
  }
}

async function insertCreatedRegistrationAuditLog(registration: Registration, profileId: string | null) {
  const { data: event } = await supabase
    .from('tournament_events')
    .select('id')
    .eq('tournament_id', registration.tournamentId)
    .limit(1)
    .maybeSingle();

  const { error } = await supabase
    .from('audit_logs')
    .insert({
      tournament_event_id: event?.id ?? null,
      action: 'REGISTRATION_CREATED',
      module: 'Registrations',
      entity_type: 'registration',
      entity_id: registration.id,
      description: `Registration created for ${registration.team.name}.`,
      admin_id: profileId,
      is_override: false,
      new_state: { status: registration.status, team: registration.team.name },
    });

  if (error) {
    throw error;
  }
}
