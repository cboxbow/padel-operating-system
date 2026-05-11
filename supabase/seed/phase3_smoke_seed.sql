-- Optional smoke seed: creates one visible tournament to confirm the frontend reads Supabase.

with tournament_row as (
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
  select
    'MPL Supabase Smoke Test',
    'doubles'::public.event_type,
    'open'::public.tournament_category,
    'registration_open'::public.tournament_status,
    '2026-05-24'::date,
    '2026-05-25'::date,
    'Padel Mauritius Club, Ebene',
    16
  where not exists (
    select 1
    from public.tournaments
    where name = 'MPL Supabase Smoke Test'
  )
  returning id, name, event_type, category, status, start_date, end_date, max_teams
),
all_tournaments as (
  select id, name, event_type, category, status, start_date, end_date, max_teams
  from tournament_row
  union all
  select id, name, event_type, category, status, start_date, end_date, max_teams
  from public.tournaments
  where name = 'MPL Supabase Smoke Test'
  order by id
  limit 1
)
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
from all_tournaments t
where not exists (
  select 1
  from public.tournament_events te
  where te.tournament_id = t.id
    and te.name = t.name
)
returning id, tournament_id, name, status;
