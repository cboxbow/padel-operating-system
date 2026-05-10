import { supabase } from '../supabaseClient';
import type { Team } from '../types';

export async function updateTeamSeed(team: Team, newSeed: number | undefined, reason: string): Promise<void> {
  if (!isUuid(team.id)) {
    return;
  }

  const profileId = await getCurrentProfileId();

  const { error } = await supabase
    .from('teams')
    .update({
      seed: newSeed ?? null,
      is_seed_locked: newSeed !== undefined,
    })
    .eq('id', team.id);

  if (error) {
    throw error;
  }

  await insertSeedOverride(team, newSeed, reason, profileId);
}

async function insertSeedOverride(
  team: Team,
  newSeed: number | undefined,
  reason: string,
  profileId: string | null,
) {
  const { data: teamRow } = await supabase
    .from('teams')
    .select('tournament_event_id')
    .eq('id', team.id)
    .maybeSingle();

  const tournamentEventId = teamRow?.tournament_event_id ?? null;
  const previousSeed = team.seed ?? null;
  const nextSeed = newSeed ?? null;

  const { error: overrideError } = await supabase
    .from('admin_overrides')
    .insert({
      tournament_event_id: tournamentEventId,
      type: 'seed_change',
      entity_type: 'team',
      entity_id: team.id,
      previous_value: { seed: previousSeed },
      new_value: { seed: nextSeed },
      reason,
      admin_id: profileId,
    });

  if (overrideError) {
    throw overrideError;
  }

  const { error: auditError } = await supabase
    .from('audit_logs')
    .insert({
      tournament_event_id: tournamentEventId,
      action: 'SEED_OVERRIDE',
      module: 'Seed Editor',
      entity_type: 'team',
      entity_id: team.id,
      description: `Seed updated to ${newSeed ?? 'none'} for ${team.name}. Reason: ${reason}`,
      admin_id: profileId,
      is_override: true,
      override_reason: reason,
      previous_state: { seed: previousSeed },
      new_state: { seed: nextSeed },
    });

  if (auditError) {
    throw auditError;
  }
}

async function getCurrentProfileId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
