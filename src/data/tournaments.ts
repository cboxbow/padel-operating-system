import { supabase } from '../supabaseClient';
import type { Tournament } from '../types';

interface TournamentRow {
  id: string;
  name: string;
  event_type: Tournament['eventType'];
  category: Tournament['category'];
  status: Tournament['status'];
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
    .select('id,name,event_type,category,status,start_date,end_date,venue,max_teams,created_at,updated_at')
    .order('start_date', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(row => toTournament(row as TournamentRow));
}
