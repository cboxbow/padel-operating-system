-- Phase 3 kickoff schema for MPL tournament operations.
-- Run this in the Supabase SQL editor or through `supabase db push`.

create extension if not exists "pgcrypto";

do $$ begin
  create type public.app_role as enum ('player', 'admin', 'super_admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.tournament_status as enum (
    'draft',
    'registration_open',
    'registration_closed',
    'draw_preparation',
    'pool_draw_ready',
    'pool_published',
    'matches_ongoing',
    'main_draw_ready',
    'main_draw_published',
    'locked',
    'completed'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.event_type as enum ('singles', 'doubles', 'mixed_doubles');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.tournament_category as enum ('open', 'pro', 'amateur', 'junior', 'senior');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.registration_status as enum ('pending', 'validated', 'rejected', 'waitlisted');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.draw_type as enum ('pool_draw', 'main_draw');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.draw_session_status as enum ('draft', 'published', 'locked');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.match_status as enum ('scheduled', 'ongoing', 'completed', 'walkover');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.override_type as enum (
    'seed_change',
    'slot_swap',
    'score_correction',
    'status_override',
    'manual_placement'
  );
exception when duplicate_object then null; end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'player',
  full_name text not null,
  email text not null unique,
  avatar_url text,
  player_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_code text not null unique,
  logo_url text,
  location text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles(id) on delete set null,
  full_name text not null,
  avatar_url text,
  club_id uuid not null references public.clubs(id) on delete restrict,
  national_ranking integer check (national_ranking is null or national_ranking > 0),
  nationality text not null default 'MU',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  drop constraint if exists profiles_player_id_fkey;

alter table public.profiles
  add constraint profiles_player_id_fkey
  foreign key (player_id) references public.players(id) on delete set null;

create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  event_type public.event_type not null,
  category public.tournament_category not null,
  status public.tournament_status not null default 'draft',
  start_date date not null,
  end_date date not null,
  venue text not null,
  max_teams integer not null check (max_teams > 0),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table if not exists public.tournament_events (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  name text not null,
  event_type public.event_type not null,
  category public.tournament_category not null,
  max_teams integer not null check (max_teams > 0),
  status public.tournament_status not null default 'draft',
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at >= starts_at)
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  tournament_event_id uuid not null references public.tournament_events(id) on delete cascade,
  name text not null,
  player1_id uuid not null references public.players(id) on delete restrict,
  player2_id uuid references public.players(id) on delete restrict,
  club_id uuid not null references public.clubs(id) on delete restrict,
  seed integer check (seed is null or seed > 0),
  is_seed_locked boolean not null default false,
  ranking integer check (ranking is null or ranking > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (player2_id is null or player2_id <> player1_id)
);

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  tournament_event_id uuid not null references public.tournament_events(id) on delete cascade,
  team_id uuid not null unique references public.teams(id) on delete cascade,
  submitted_by uuid references public.profiles(id) on delete set null,
  status public.registration_status not null default 'pending',
  rejection_reason text,
  validated_by uuid references public.profiles(id) on delete set null,
  validated_at timestamptz,
  notes text,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pools (
  id uuid primary key default gen_random_uuid(),
  tournament_event_id uuid not null references public.tournament_events(id) on delete cascade,
  name text not null,
  letter text not null,
  max_teams integer not null check (max_teams > 0),
  matches_generated boolean not null default false,
  status public.draw_session_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_event_id, letter)
);

create table if not exists public.pool_slots (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references public.pools(id) on delete cascade,
  position integer not null check (position > 0),
  team_id uuid references public.teams(id) on delete set null,
  is_locked boolean not null default false,
  is_seed_protected boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pool_id, position),
  unique (pool_id, team_id)
);

create table if not exists public.draw_sessions (
  id uuid primary key default gen_random_uuid(),
  tournament_event_id uuid not null references public.tournament_events(id) on delete cascade,
  draw_type public.draw_type not null,
  status public.draw_session_status not null default 'draft',
  created_by uuid references public.profiles(id) on delete set null,
  published_by uuid references public.profiles(id) on delete set null,
  published_at timestamptz,
  locked_by uuid references public.profiles(id) on delete set null,
  locked_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.draws (
  id uuid primary key default gen_random_uuid(),
  tournament_event_id uuid not null references public.tournament_events(id) on delete cascade,
  draw_session_id uuid not null references public.draw_sessions(id) on delete cascade,
  draw_type public.draw_type not null,
  status public.draw_session_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.draw_slots (
  id uuid primary key default gen_random_uuid(),
  draw_id uuid not null references public.draws(id) on delete cascade,
  round integer not null check (round > 0),
  position integer not null check (position > 0),
  team_id uuid references public.teams(id) on delete set null,
  is_bye boolean not null default false,
  is_locked boolean not null default false,
  winner_id uuid references public.teams(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (draw_id, round, position)
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  tournament_event_id uuid not null references public.tournament_events(id) on delete cascade,
  pool_id uuid references public.pools(id) on delete set null,
  draw_id uuid references public.draws(id) on delete set null,
  round integer not null default 1 check (round > 0),
  match_number integer not null check (match_number > 0),
  team1_id uuid references public.teams(id) on delete set null,
  team2_id uuid references public.teams(id) on delete set null,
  is_bye boolean not null default false,
  status public.match_status not null default 'scheduled',
  winner_id uuid references public.teams(id) on delete set null,
  scheduled_at timestamptz,
  completed_at timestamptz,
  court_number integer check (court_number is null or court_number > 0),
  admin_override boolean not null default false,
  override_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (team2_id is null or team1_id is null or team2_id <> team1_id),
  check (pool_id is not null or draw_id is not null)
);

create table if not exists public.match_sets (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  set_number integer not null check (set_number > 0),
  team1_score integer not null default 0 check (team1_score >= 0),
  team2_score integer not null default 0 check (team2_score >= 0),
  is_tiebreak boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, set_number)
);

create table if not exists public.rankings (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references public.players(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  category public.tournament_category not null,
  ranking_date date not null default current_date,
  rank integer not null check (rank > 0),
  points integer not null default 0 check (points >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((player_id is not null and team_id is null) or (player_id is null and team_id is not null)),
  unique (category, ranking_date, rank)
);

create table if not exists public.ranking_points (
  id uuid primary key default gen_random_uuid(),
  ranking_id uuid references public.rankings(id) on delete set null,
  player_id uuid references public.players(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  tournament_event_id uuid not null references public.tournament_events(id) on delete cascade,
  match_id uuid references public.matches(id) on delete set null,
  points integer not null,
  reason text not null,
  awarded_by uuid references public.profiles(id) on delete set null,
  awarded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check ((player_id is not null and team_id is null) or (player_id is null and team_id is not null))
);

create table if not exists public.admin_overrides (
  id uuid primary key default gen_random_uuid(),
  tournament_event_id uuid references public.tournament_events(id) on delete cascade,
  type public.override_type not null,
  entity_type text not null,
  entity_id uuid not null,
  previous_value jsonb,
  new_value jsonb,
  reason text not null,
  admin_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  tournament_event_id uuid references public.tournament_events(id) on delete cascade,
  action text not null,
  module text not null,
  entity_type text not null,
  entity_id uuid,
  description text not null,
  previous_state jsonb,
  new_state jsonb,
  admin_id uuid references public.profiles(id) on delete set null,
  ip_address inet,
  is_override boolean not null default false,
  override_reason text,
  created_at timestamptz not null default now()
);

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() in ('admin', 'super_admin'), false)
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() = 'super_admin', false)
$$;

create or replace function public.owns_player(target_player_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and player_id = target_player_id
  )
$$;

create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists profiles_player_id_idx on public.profiles(player_id);
create index if not exists players_club_id_idx on public.players(club_id);
create index if not exists players_national_ranking_idx on public.players(national_ranking);
create index if not exists tournaments_status_idx on public.tournaments(status);
create index if not exists tournaments_start_date_idx on public.tournaments(start_date);
create index if not exists tournament_events_tournament_id_idx on public.tournament_events(tournament_id);
create index if not exists tournament_events_status_idx on public.tournament_events(status);
create index if not exists registrations_event_status_idx on public.registrations(tournament_event_id, status);
create index if not exists registrations_submitted_by_idx on public.registrations(submitted_by);
create index if not exists teams_event_seed_idx on public.teams(tournament_event_id, seed);
create index if not exists teams_player1_id_idx on public.teams(player1_id);
create index if not exists teams_player2_id_idx on public.teams(player2_id);
create index if not exists pools_event_idx on public.pools(tournament_event_id);
create index if not exists pool_slots_pool_idx on public.pool_slots(pool_id, position);
create index if not exists pool_slots_team_idx on public.pool_slots(team_id);
create index if not exists draw_sessions_event_idx on public.draw_sessions(tournament_event_id, draw_type);
create index if not exists draws_session_idx on public.draws(draw_session_id);
create index if not exists draw_slots_draw_idx on public.draw_slots(draw_id, round, position);
create index if not exists matches_event_status_idx on public.matches(tournament_event_id, status);
create index if not exists matches_pool_idx on public.matches(pool_id);
create index if not exists matches_draw_idx on public.matches(draw_id);
create index if not exists matches_scheduled_at_idx on public.matches(scheduled_at);
create index if not exists match_sets_match_idx on public.match_sets(match_id, set_number);
create index if not exists rankings_player_idx on public.rankings(player_id, category, ranking_date desc);
create index if not exists rankings_team_idx on public.rankings(team_id, category, ranking_date desc);
create index if not exists ranking_points_event_idx on public.ranking_points(tournament_event_id);
create index if not exists admin_overrides_event_idx on public.admin_overrides(tournament_event_id, created_at desc);
create index if not exists audit_logs_event_idx on public.audit_logs(tournament_event_id, created_at desc);
create index if not exists audit_logs_entity_idx on public.audit_logs(entity_type, entity_id);

do $$ declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'players', 'clubs', 'tournaments', 'tournament_events',
    'registrations', 'teams', 'pools', 'pool_slots', 'draw_sessions',
    'draws', 'draw_slots', 'matches', 'match_sets', 'rankings',
    'ranking_points', 'admin_overrides', 'audit_logs'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;

do $$ declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'players', 'clubs', 'tournaments', 'tournament_events',
    'registrations', 'teams', 'pools', 'pool_slots', 'draw_sessions',
    'draws', 'draw_slots', 'matches', 'match_sets', 'rankings',
    'ranking_points', 'admin_overrides', 'audit_logs'
  ]
  loop
    execute format('drop policy if exists "%s admin all" on public.%I', table_name, table_name);
    execute format(
      'create policy "%s admin all" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
      table_name,
      table_name
    );
  end loop;
end $$;

drop policy if exists "profiles read own" on public.profiles;
drop policy if exists "profiles update own player profile" on public.profiles;
drop policy if exists "profiles insert self" on public.profiles;
drop policy if exists "public read clubs" on public.clubs;
drop policy if exists "public read players" on public.players;
drop policy if exists "players update own record" on public.players;
drop policy if exists "public read tournaments" on public.tournaments;
drop policy if exists "public read tournament events" on public.tournament_events;
drop policy if exists "public read teams" on public.teams;
drop policy if exists "players create own teams" on public.teams;
drop policy if exists "public read validated registrations" on public.registrations;
drop policy if exists "players create registrations" on public.registrations;
drop policy if exists "players update own pending registrations" on public.registrations;
drop policy if exists "public read pools" on public.pools;
drop policy if exists "public read pool slots" on public.pool_slots;
drop policy if exists "public read draw sessions" on public.draw_sessions;
drop policy if exists "public read draws" on public.draws;
drop policy if exists "public read draw slots" on public.draw_slots;
drop policy if exists "public read matches" on public.matches;
drop policy if exists "public read match sets" on public.match_sets;
drop policy if exists "public read rankings" on public.rankings;
drop policy if exists "public read ranking points" on public.ranking_points;
drop policy if exists "super admins read overrides" on public.admin_overrides;
drop policy if exists "super admins read audit logs" on public.audit_logs;

create policy "profiles read own" on public.profiles
  for select to authenticated
  using (id = auth.uid());

create policy "profiles update own player profile" on public.profiles
  for update to authenticated
  using (id = auth.uid() and role = 'player')
  with check (id = auth.uid() and role = 'player');

create policy "profiles insert self" on public.profiles
  for insert to authenticated
  with check (id = auth.uid() and role = 'player');

create policy "public read clubs" on public.clubs
  for select to anon, authenticated
  using (true);

create policy "public read players" on public.players
  for select to anon, authenticated
  using (true);

create policy "players update own record" on public.players
  for update to authenticated
  using (public.owns_player(id))
  with check (public.owns_player(id));

create policy "public read tournaments" on public.tournaments
  for select to anon, authenticated
  using (status <> 'draft' or public.is_admin());

create policy "public read tournament events" on public.tournament_events
  for select to anon, authenticated
  using (status <> 'draft' or public.is_admin());

create policy "public read teams" on public.teams
  for select to anon, authenticated
  using (true);

create policy "players create own teams" on public.teams
  for insert to authenticated
  with check (public.owns_player(player1_id) or public.owns_player(player2_id));

create policy "public read validated registrations" on public.registrations
  for select to anon, authenticated
  using (status in ('validated', 'waitlisted') or public.is_admin() or submitted_by = auth.uid());

create policy "players create registrations" on public.registrations
  for insert to authenticated
  with check (submitted_by = auth.uid());

create policy "players update own pending registrations" on public.registrations
  for update to authenticated
  using (submitted_by = auth.uid() and status = 'pending')
  with check (submitted_by = auth.uid() and status = 'pending');

create policy "public read pools" on public.pools
  for select to anon, authenticated
  using (status in ('published', 'locked') or public.is_admin());

create policy "public read pool slots" on public.pool_slots
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.pools p
      where p.id = pool_slots.pool_id
        and (p.status in ('published', 'locked') or public.is_admin())
    )
  );

create policy "public read draw sessions" on public.draw_sessions
  for select to anon, authenticated
  using (status in ('published', 'locked') or public.is_admin());

create policy "public read draws" on public.draws
  for select to anon, authenticated
  using (status in ('published', 'locked') or public.is_admin());

create policy "public read draw slots" on public.draw_slots
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.draws d
      where d.id = draw_slots.draw_id
        and (d.status in ('published', 'locked') or public.is_admin())
    )
  );

create policy "public read matches" on public.matches
  for select to anon, authenticated
  using (true);

create policy "public read match sets" on public.match_sets
  for select to anon, authenticated
  using (true);

create policy "public read rankings" on public.rankings
  for select to anon, authenticated
  using (true);

create policy "public read ranking points" on public.ranking_points
  for select to anon, authenticated
  using (true);

create policy "super admins read overrides" on public.admin_overrides
  for select to authenticated
  using (public.is_super_admin() or public.is_admin());

create policy "super admins read audit logs" on public.audit_logs
  for select to authenticated
  using (public.is_super_admin() or public.is_admin());

do $$ declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'players', 'clubs', 'tournaments', 'tournament_events',
    'registrations', 'teams', 'pools', 'pool_slots', 'draw_sessions',
    'draws', 'draw_slots', 'matches', 'match_sets', 'rankings'
  ]
  loop
    execute format('drop trigger if exists set_%s_updated_at on public.%I', table_name, table_name);
    execute format(
      'create trigger set_%s_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      table_name,
      table_name
    );
  end loop;
end $$;

comment on table public.profiles is 'Supabase Auth profile and app role source.';
comment on table public.matches is 'Realtime target for live match status and winner updates.';
comment on table public.match_sets is 'Realtime target for live set score updates.';
