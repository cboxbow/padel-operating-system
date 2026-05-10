-- Optional registration smoke seed.
-- Run after the Phase 3 schema and after `phase3_smoke_seed.sql`.

with club_rows as (
  insert into public.clubs (name, short_code, location)
  values
    ('Padel Mauritius Club', 'PMC', 'Ebene'),
    ('Grand Baie Padel', 'GBP', 'Grand Baie')
  on conflict (short_code) do update
    set name = excluded.name,
        location = excluded.location
  returning id, short_code
),
all_clubs as (
  select id, short_code from club_rows
  union
  select id, short_code from public.clubs where short_code in ('PMC', 'GBP')
),
player_rows as (
  insert into public.players (full_name, club_id, national_ranking, nationality)
  select seed.player_name, c.id, seed.ranking, 'MU'
  from (
    values
      ('Ravi Boolell', 'PMC', 1),
      ('Aryan Gokhool', 'PMC', 2),
      ('Damien Lavoie', 'GBP', 3),
      ('Kevin Rousset', 'GBP', 4)
  ) as seed(player_name, club_code, ranking)
  join all_clubs c on c.short_code = seed.club_code
  where not exists (
    select 1
    from public.players p
    where p.full_name = seed.player_name
  )
  returning id, full_name
),
all_players as (
  select id, full_name from player_rows
  union
  select id, full_name
  from public.players
  where full_name in ('Ravi Boolell', 'Aryan Gokhool', 'Damien Lavoie', 'Kevin Rousset')
),
event_row as (
  select te.id as event_id
  from public.tournament_events te
  join public.tournaments t on t.id = te.tournament_id
  where t.name = 'MPL Supabase Smoke Test'
  order by te.created_at desc
  limit 1
),
team_rows as (
  insert into public.teams (tournament_event_id, name, player1_id, player2_id, club_id, seed, is_seed_locked, ranking)
  select
    e.event_id,
    team_name,
    p1.id,
    p2.id,
    c.id,
    seed_no,
    seed_no is not null,
    seed_no
  from (
    values
      ('Boolell / Gokhool', 'Ravi Boolell', 'Aryan Gokhool', 'PMC', 1),
      ('Lavoie / Rousset', 'Damien Lavoie', 'Kevin Rousset', 'GBP', 2)
  ) as seed(team_name, player1_name, player2_name, club_code, seed_no)
  cross join event_row e
  join all_players p1 on p1.full_name = seed.player1_name
  join all_players p2 on p2.full_name = seed.player2_name
  join all_clubs c on c.short_code = seed.club_code
  where not exists (
    select 1
    from public.teams t
    where t.tournament_event_id = e.event_id
      and t.name = seed.team_name
  )
  returning id, name, tournament_event_id
),
all_teams as (
  select id, name, tournament_event_id from team_rows
  union
  select t.id, t.name, t.tournament_event_id
  from public.teams t
  join event_row e on e.event_id = t.tournament_event_id
  where t.name in ('Boolell / Gokhool', 'Lavoie / Rousset')
)
insert into public.registrations (tournament_event_id, team_id, status, submitted_at, notes)
select
  tournament_event_id,
  id,
  case when name = 'Boolell / Gokhool' then 'pending'::public.registration_status else 'validated'::public.registration_status end,
  now(),
  'Phase 3 smoke registration'
from all_teams
on conflict (team_id) do update
  set status = excluded.status,
      notes = excluded.notes
returning id, team_id, status;
