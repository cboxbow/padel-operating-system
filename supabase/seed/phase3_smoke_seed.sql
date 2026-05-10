-- Optional smoke seed: creates one visible tournament to confirm the frontend reads Supabase.

insert into public.tournaments (
  name,
  event_type,
  category,
  status,
  start_date,
  end_date,
  venue,
  max_teams
)
values (
  'MPL Supabase Smoke Test',
  'doubles',
  'open',
  'registration_open',
  '2026-05-24',
  '2026-05-25',
  'Padel Mauritius Club, Ebene',
  16
)
returning id, name, status;

insert into public.tournament_events (
  tournament_id,
  name,
  event_type,
  category,
  max_teams,
  status,
  starts_at,
  ends_at
)
select
  id,
  name,
  event_type,
  category,
  max_teams,
  status,
  start_date::timestamptz,
  (end_date::timestamptz + interval '23 hours 59 minutes')
from public.tournaments
where name = 'MPL Supabase Smoke Test'
returning id, tournament_id, name, status;
