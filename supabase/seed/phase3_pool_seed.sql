-- Optional pool smoke seed.
-- Run after `phase3_smoke_seed.sql` and `phase3_registration_seed.sql`.

with event_row as (
  select te.id as event_id
  from public.tournament_events te
  join public.tournaments t on t.id = te.tournament_id
  where t.name = 'MPL Supabase Smoke Test'
  order by te.created_at desc
  limit 1
),
pool_rows as (
  insert into public.pools (tournament_event_id, name, letter, max_teams, status)
  select event_id, pool_name, letter, 4, 'draft'::public.draw_session_status
  from event_row
  cross join (
    values
      ('Pool A', 'A'),
      ('Pool B', 'B')
  ) seed(pool_name, letter)
  on conflict (tournament_event_id, letter) do update
    set name = excluded.name,
        max_teams = excluded.max_teams
  returning id, tournament_event_id, letter
),
all_pools as (
  select id, tournament_event_id, letter from pool_rows
  union
  select p.id, p.tournament_event_id, p.letter
  from public.pools p
  join event_row e on e.event_id = p.tournament_event_id
  where p.letter in ('A', 'B')
),
all_teams as (
  select t.id, t.name, t.seed, t.tournament_event_id
  from public.teams t
  join event_row e on e.event_id = t.tournament_event_id
)
insert into public.pool_slots (pool_id, position, team_id, is_locked, is_seed_protected)
select
  p.id,
  slot.position,
  case
    when p.letter = 'A' and slot.position = 1 then (select id from all_teams where name = 'Boolell / Gokhool')
    when p.letter = 'B' and slot.position = 1 then (select id from all_teams where name = 'Lavoie / Rousset')
    else null
  end,
  slot.position = 1,
  slot.position = 1
from all_pools p
cross join generate_series(1, 4) as slot(position)
on conflict (pool_id, position) do update
  set team_id = excluded.team_id,
      is_locked = excluded.is_locked,
      is_seed_protected = excluded.is_seed_protected
returning id, pool_id, position, team_id;
