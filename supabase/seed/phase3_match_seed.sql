-- Optional match smoke seed.
-- Run after `phase3_smoke_seed.sql`, `phase3_registration_seed.sql`, and `phase3_pool_seed.sql`.

with event_row as (
  select te.id as event_id
  from public.tournament_events te
  join public.tournaments t on t.id = te.tournament_id
  where t.name = 'MPL Supabase Smoke Test'
  order by te.created_at desc
  limit 1
),
pool_a as (
  select p.id
  from public.pools p
  join event_row e on e.event_id = p.tournament_event_id
  where p.letter = 'A'
  limit 1
),
team_rows as (
  select t.id, t.name
  from public.teams t
  join event_row e on e.event_id = t.tournament_event_id
  where t.name in ('Boolell / Gokhool', 'Lavoie / Rousset')
),
match_rows as (
  insert into public.matches (
    tournament_event_id,
    pool_id,
    round,
    match_number,
    team1_id,
    team2_id,
    is_bye,
    status,
    scheduled_at,
    court_number
  )
  select
    e.event_id,
    p.id,
    1,
    1,
    (select id from team_rows where name = 'Boolell / Gokhool'),
    (select id from team_rows where name = 'Lavoie / Rousset'),
    false,
    'scheduled'::public.match_status,
    '2026-05-24 09:00:00+04'::timestamptz,
    1
  from event_row e
  cross join pool_a p
  where not exists (
    select 1
    from public.matches m
    where m.tournament_event_id = e.event_id
      and m.match_number = 1
      and m.pool_id = p.id
  )
  returning id
)
select id, 'created' as status
from match_rows
union all
select m.id, 'already_exists' as status
from public.matches m
join event_row e on e.event_id = m.tournament_event_id
join pool_a p on p.id = m.pool_id
where m.match_number = 1;
