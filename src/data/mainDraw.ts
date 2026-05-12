import { supabase } from '../supabaseClient';

export interface PersistedMainDrawSlot {
  id: string;
  round: number;
  position: number;
  teamId: string | null;
  isBye: boolean;
  isLocked: boolean;
  winnerId: string | null;
}

export interface PersistedMainDrawMatch {
  round: number;
  matchNumber: number;
  team1Id: string | null;
  team2Id: string | null;
  isBye: boolean;
  winnerId: string | null;
  status: 'scheduled' | 'completed';
}

export interface PersistedMainDraw {
  drawId: string;
  status: 'draft' | 'published' | 'locked';
  slots: PersistedMainDrawSlot[];
}

export interface PersistedMainDrawTeamSlot {
  id: string;
  round: number;
  position: number;
  isBye: boolean;
  isLocked: boolean;
  winnerId: string | null;
  team: {
    id: string;
    name: string;
    clubName: string;
    seed?: number;
    ranking?: number;
  } | null;
}

export interface PersistedMainDrawWithTeams {
  drawId: string;
  status: 'draft' | 'published' | 'locked';
  slots: PersistedMainDrawTeamSlot[];
}

export async function fetchPublishedMainDraw(tournamentId: string): Promise<PersistedMainDraw | null> {
  const event = await fetchTournamentEvent(tournamentId);
  if (!event) return null;

  const { data: draw, error } = await supabase
    .from('draws')
    .select(`
      id,
      status,
      draw_slots(id, round, position, team_id, is_bye, is_locked, winner_id)
    `)
    .eq('tournament_event_id', event.id)
    .eq('draw_type', 'main_draw')
    .in('status', ['published', 'locked'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!draw) return null;

  return {
    drawId: draw.id,
    status: draw.status,
    slots: [...(draw.draw_slots ?? [])]
      .sort((a, b) => (a.round - b.round) || (a.position - b.position))
      .map(slot => ({
        id: slot.id,
        round: slot.round,
        position: slot.position,
        teamId: slot.team_id ?? null,
        isBye: slot.is_bye,
        isLocked: slot.is_locked,
        winnerId: slot.winner_id ?? null,
      })),
  };
}

export async function fetchPublishedMainDrawWithTeams(tournamentId: string): Promise<PersistedMainDrawWithTeams | null> {
  const event = await fetchTournamentEvent(tournamentId);
  if (!event) return null;

  const { data: draw, error } = await supabase
    .from('draws')
    .select(`
      id,
      status,
      draw_slots(
        id,
        round,
        position,
        is_bye,
        is_locked,
        winner_id,
        teams(
          id,
          name,
          seed,
          ranking,
          clubs(name, short_code)
        )
      )
    `)
    .eq('tournament_event_id', event.id)
    .eq('draw_type', 'main_draw')
    .in('status', ['published', 'locked'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!draw) return null;

  return {
    drawId: draw.id,
    status: draw.status,
    slots: [...(draw.draw_slots ?? [])]
      .sort((a, b) => (a.round - b.round) || (a.position - b.position))
      .map(slot => {
        const team = Array.isArray(slot.teams) ? slot.teams[0] : slot.teams;
        const club = Array.isArray(team?.clubs) ? team?.clubs[0] : team?.clubs;

        return {
          id: slot.id,
          round: slot.round,
          position: slot.position,
          isBye: slot.is_bye,
          isLocked: slot.is_locked,
          winnerId: slot.winner_id ?? null,
          team: team ? {
            id: team.id,
            name: team.name,
            clubName: club?.short_code || club?.name || '',
            seed: team.seed ?? undefined,
            ranking: team.ranking ?? undefined,
          } : null,
        };
      }),
  };
}

export async function publishMainDraw(
  tournamentId: string,
  slots: PersistedMainDrawSlot[],
  matches: PersistedMainDrawMatch[],
): Promise<void> {
  const event = await fetchTournamentEvent(tournamentId);
  if (!event) throw new Error('No tournament event found for this tournament.');

  const existingDrawIds = await fetchExistingMainDrawIds(event.id);
  if (existingDrawIds.length > 0) {
    const { error: matchDeleteError } = await supabase
      .from('matches')
      .delete()
      .in('draw_id', existingDrawIds);
    if (matchDeleteError) throw matchDeleteError;
  }

  const { error: sessionDeleteError } = await supabase
    .from('draw_sessions')
    .delete()
    .eq('tournament_event_id', event.id)
    .eq('draw_type', 'main_draw');
  if (sessionDeleteError) throw sessionDeleteError;

  const profileId = await getCurrentProfileId();
  const { data: session, error: sessionError } = await supabase
    .from('draw_sessions')
    .insert({
      tournament_event_id: event.id,
      draw_type: 'main_draw',
      status: 'published',
      created_by: profileId,
      published_by: profileId,
      published_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (sessionError) throw sessionError;

  const { data: draw, error: drawError } = await supabase
    .from('draws')
    .insert({
      tournament_event_id: event.id,
      draw_session_id: session.id,
      draw_type: 'main_draw',
      status: 'published',
    })
    .select('id')
    .single();
  if (drawError) throw drawError;

  if (slots.length > 0) {
    const { error: slotError } = await supabase
      .from('draw_slots')
      .insert(slots.map(slot => ({
        draw_id: draw.id,
        round: slot.round,
        position: slot.position,
        team_id: slot.teamId,
        is_bye: slot.isBye,
        is_locked: slot.isLocked,
        winner_id: slot.winnerId,
      })));
    if (slotError) throw slotError;
  }

  if (matches.length > 0) {
    const { error: matchError } = await supabase
      .from('matches')
      .insert(matches.map(match => ({
        tournament_event_id: event.id,
        draw_id: draw.id,
        round: match.round,
        match_number: match.matchNumber,
        team1_id: match.team1Id,
        team2_id: match.team2Id,
        is_bye: match.isBye,
        status: match.status,
        winner_id: match.winnerId,
        completed_at: match.status === 'completed' ? new Date().toISOString() : null,
      })));
    if (matchError) throw matchError;
  }

  const { error: tournamentError } = await supabase
    .from('tournaments')
    .update({ status: 'main_draw_published' })
    .eq('id', tournamentId);
  if (tournamentError) throw tournamentError;

  const { error: eventError } = await supabase
    .from('tournament_events')
    .update({ status: 'main_draw_published' })
    .eq('id', event.id);
  if (eventError) throw eventError;
}

async function fetchTournamentEvent(tournamentId: string): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from('tournament_events')
    .select('id')
    .eq('tournament_id', tournamentId)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function fetchExistingMainDrawIds(eventId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('draws')
    .select('id')
    .eq('tournament_event_id', eventId)
    .eq('draw_type', 'main_draw');

  if (error) throw error;
  return (data ?? []).map(row => row.id);
}

async function getCurrentProfileId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}
