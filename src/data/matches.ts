import { supabase } from '../supabaseClient';
import type { MatchSet, Player, ScheduledMatch, Team } from '../types';

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

interface MatchSetRow {
  id: string;
  match_id: string;
  set_number: number;
  team1_score: number;
  team2_score: number;
  is_tiebreak: boolean;
}

interface MatchRow {
  id: string;
  tournament_event_id: string;
  pool_id: string | null;
  draw_id: string | null;
  round: number;
  match_number: number;
  team1_id: string | null;
  team2_id: string | null;
  is_bye: boolean;
  status: ScheduledMatch['status'];
  winner_id: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  court_number: number | null;
  admin_override: boolean;
  override_reason: string | null;
  tournament_events: {
    tournament_id: string;
  };
  team1: TeamRow | null;
  team2: TeamRow | null;
  match_sets: MatchSetRow[];
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

function toMatchSet(row: MatchSetRow): MatchSet {
  return {
    id: row.id,
    matchId: row.match_id,
    setNumber: row.set_number,
    team1Score: row.team1_score,
    team2Score: row.team2_score,
    isTiebreak: row.is_tiebreak,
  };
}

function toScheduledMatch(row: MatchRow): ScheduledMatch {
  const courtNumber = row.court_number ?? undefined;

  return {
    id: row.id,
    tournamentId: row.tournament_events.tournament_id,
    poolId: row.pool_id ?? undefined,
    drawId: row.draw_id ?? undefined,
    round: row.round,
    matchNumber: row.match_number,
    team1: row.team1 ? toTeam(row.team1) : undefined,
    team2: row.team2 ? toTeam(row.team2) : undefined,
    isBye: row.is_bye,
    status: row.status,
    sets: [...(row.match_sets ?? [])].sort((a, b) => a.set_number - b.set_number).map(toMatchSet),
    winnerId: row.winner_id ?? undefined,
    scheduledAt: row.scheduled_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    courtNumber,
    courtId: courtNumber ? `ct${courtNumber}` : undefined,
    courtName: courtNumber ? `Court ${courtNumber}` : undefined,
    scheduledTime: row.scheduled_at ?? undefined,
    estimatedDuration: 60,
    isConfirmed: row.scheduled_at !== null,
    adminOverride: row.admin_override,
    overrideReason: row.override_reason ?? undefined,
  };
}

export async function fetchMatches(): Promise<ScheduledMatch[]> {
  const { data, error } = await supabase
    .from('matches')
    .select(`
      id,
      tournament_event_id,
      pool_id,
      draw_id,
      round,
      match_number,
      team1_id,
      team2_id,
      is_bye,
      status,
      winner_id,
      scheduled_at,
      completed_at,
      court_number,
      admin_override,
      override_reason,
      tournament_events!inner(tournament_id),
      team1:teams!matches_team1_id_fkey(
        id,
        name,
        club_id,
        seed,
        is_seed_locked,
        ranking,
        clubs!inner(name, short_code),
        player1:players!teams_player1_id_fkey(id, full_name, avatar_url, club_id, national_ranking, nationality),
        player2:players!teams_player2_id_fkey(id, full_name, avatar_url, club_id, national_ranking, nationality)
      ),
      team2:teams!matches_team2_id_fkey(
        id,
        name,
        club_id,
        seed,
        is_seed_locked,
        ranking,
        clubs!inner(name, short_code),
        player1:players!teams_player1_id_fkey(id, full_name, avatar_url, club_id, national_ranking, nationality),
        player2:players!teams_player2_id_fkey(id, full_name, avatar_url, club_id, national_ranking, nationality)
      ),
      match_sets(id, match_id, set_number, team1_score, team2_score, is_tiebreak)
    `)
    .order('scheduled_at', { ascending: true, nullsFirst: false })
    .order('match_number', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map(row => toScheduledMatch(row as unknown as MatchRow));
}

export async function generatePoolMatchesForTournament(tournamentId: string): Promise<void> {
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

  const { count, error: countError } = await supabase
    .from('matches')
    .select('id', { count: 'exact', head: true })
    .eq('tournament_event_id', event.id);

  if (countError) {
    throw countError;
  }

  if ((count ?? 0) > 0) {
    throw new Error('Matches already exist for this tournament.');
  }

  const { data: pools, error: poolsError } = await supabase
    .from('pools')
    .select('id, pool_slots(position, team_id)')
    .eq('tournament_event_id', event.id)
    .in('status', ['published', 'locked'])
    .order('letter', { ascending: true });

  if (poolsError) {
    throw poolsError;
  }

  const matchRows = (pools ?? []).flatMap((pool: any, poolIndex: number) => {
    const teamIds = [...(pool.pool_slots ?? [])]
      .sort((a, b) => a.position - b.position)
      .map(slot => slot.team_id)
      .filter(Boolean);

    const rows = [];
    for (let i = 0; i < teamIds.length; i += 1) {
      for (let j = i + 1; j < teamIds.length; j += 1) {
        rows.push({
          tournament_event_id: event.id,
          pool_id: pool.id,
          round: 1,
          match_number: poolIndex * 100 + rows.length + 1,
          team1_id: teamIds[i],
          team2_id: teamIds[j],
          status: 'scheduled',
          is_bye: false,
        });
      }
    }
    return rows;
  });

  if (matchRows.length === 0) {
    throw new Error('No pool matches could be generated. Publish pools with assigned teams first.');
  }

  const numberedRows = matchRows.map((row, index) => ({ ...row, match_number: index + 1 }));
  const { error: insertError } = await supabase.from('matches').insert(numberedRows);

  if (insertError) {
    throw insertError;
  }

  const { error: poolsUpdateError } = await supabase
    .from('pools')
    .update({ matches_generated: true })
    .eq('tournament_event_id', event.id);

  if (poolsUpdateError) {
    throw poolsUpdateError;
  }

  const { error: tournamentError } = await supabase
    .from('tournaments')
    .update({ status: 'matches_ongoing' })
    .eq('id', tournamentId);

  if (tournamentError) {
    throw tournamentError;
  }

  const { error: eventStatusError } = await supabase
    .from('tournament_events')
    .update({ status: 'matches_ongoing' })
    .eq('id', event.id);

  if (eventStatusError) {
    throw eventStatusError;
  }
}

export async function saveMatchScore(
  match: ScheduledMatch,
  sets: MatchSet[],
  reason?: string,
): Promise<void> {
  if (!isUuid(match.id)) {
    return;
  }

  const winnerId = calculateWinnerId(match, sets);
  const isCorrection = match.status === 'completed';
  const profileId = await getCurrentProfileId();

  const { error: matchError } = await supabase
    .from('matches')
    .update({
      status: 'completed',
      winner_id: winnerId ?? null,
      completed_at: match.completedAt ?? new Date().toISOString(),
      admin_override: isCorrection,
      override_reason: isCorrection ? reason ?? null : null,
    })
    .eq('id', match.id);

  if (matchError) {
    throw matchError;
  }

  const { error: deleteError } = await supabase
    .from('match_sets')
    .delete()
    .eq('match_id', match.id);

  if (deleteError) {
    throw deleteError;
  }

  const { error: insertError } = await supabase
    .from('match_sets')
    .insert(sets.map(set => ({
      match_id: match.id,
      set_number: set.setNumber,
      team1_score: set.team1Score,
      team2_score: set.team2Score,
      is_tiebreak: set.isTiebreak,
    })));

  if (insertError) {
    throw insertError;
  }

  if (winnerId && match.drawId) {
    await propagateMainDrawWinner(match, winnerId);
  }

  await insertScoreAudit(match, sets, isCorrection, profileId, reason);
}

export async function updateMatchSchedule(
  match: ScheduledMatch,
  scheduledAt: string,
  courtNumber: number | undefined,
): Promise<void> {
  if (!isUuid(match.id)) {
    return;
  }

  const profileId = await getCurrentProfileId();
  const { error } = await supabase
    .from('matches')
    .update({
      scheduled_at: scheduledAt || null,
      court_number: courtNumber ?? null,
    })
    .eq('id', match.id);

  if (error) {
    throw error;
  }

  const { error: auditError } = await supabase
    .from('audit_logs')
    .insert({
      action: 'MATCH_SCHEDULED',
      module: 'Match Schedule',
      entity_type: 'match',
      entity_id: match.id,
      description: `Match ${match.matchNumber} scheduled on Court ${courtNumber ?? 'TBD'} at ${scheduledAt || 'TBD'}.`,
      admin_id: profileId,
      is_override: false,
      previous_state: {
        scheduled_at: match.scheduledTime ?? null,
        court_number: match.courtNumber ?? null,
      },
      new_state: {
        scheduled_at: scheduledAt || null,
        court_number: courtNumber ?? null,
      },
    });

  if (auditError) {
    throw auditError;
  }
}

function calculateWinnerId(match: ScheduledMatch, sets: MatchSet[]): string | undefined {
  const t1Sets = sets.filter(set => set.team1Score > set.team2Score).length;
  const t2Sets = sets.filter(set => set.team2Score > set.team1Score).length;

  if (t1Sets > t2Sets) return match.team1?.id;
  if (t2Sets > t1Sets) return match.team2?.id;
  return undefined;
}

interface DrawMatchRow {
  id: string;
  round: number;
  match_number: number;
  team1_id: string | null;
  team2_id: string | null;
}

async function propagateMainDrawWinner(match: ScheduledMatch, winnerId: string): Promise<void> {
  if (!match.drawId) return;

  const { data, error } = await supabase
    .from('matches')
    .select('id, round, match_number, team1_id, team2_id')
    .eq('draw_id', match.drawId)
    .order('round', { ascending: true })
    .order('match_number', { ascending: true });

  if (error) throw error;

  const drawMatches = (data ?? []) as DrawMatchRow[];
  const currentRoundMatches = drawMatches
    .filter(row => row.round === match.round)
    .sort((a, b) => a.match_number - b.match_number);
  const currentIndex = currentRoundMatches.findIndex(row => row.id === match.id);
  if (currentIndex < 0) return;

  const nextRoundMatches = drawMatches
    .filter(row => row.round === match.round + 1)
    .sort((a, b) => a.match_number - b.match_number);
  const nextMatch = nextRoundMatches[Math.floor(currentIndex / 2)];
  if (!nextMatch) return;

  const targetColumn = currentIndex % 2 === 0 ? 'team1_id' : 'team2_id';
  const { error: updateError } = await supabase
    .from('matches')
    .update({ [targetColumn]: winnerId })
    .eq('id', nextMatch.id);

  if (updateError) throw updateError;
}

async function insertScoreAudit(
  match: ScheduledMatch,
  sets: MatchSet[],
  isCorrection: boolean,
  profileId: string | null,
  reason?: string,
) {
  const action = isCorrection ? 'SCORE_OVERRIDE' : 'SCORE_ENTERED';
  const scoreText = sets.map(set => `${set.team1Score}-${set.team2Score}`).join(', ');

  const { error } = await supabase
    .from('audit_logs')
    .insert({
      action,
      module: 'Match Score',
      entity_type: 'match',
      entity_id: match.id,
      description: `Score ${isCorrection ? 'corrected' : 'entered'} for Match ${match.matchNumber}: ${scoreText}.`,
      admin_id: profileId,
      is_override: isCorrection,
      override_reason: isCorrection ? reason ?? null : null,
      previous_state: { sets: match.sets },
      new_state: { sets },
    });

  if (error) {
    throw error;
  }
}

async function getCurrentProfileId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
