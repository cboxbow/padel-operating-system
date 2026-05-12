alter table public.tournaments
  add column if not exists pool_count integer not null default 4
  check (pool_count between 1 and 16);

alter table public.tournament_events
  add column if not exists pool_count integer not null default 4
  check (pool_count between 1 and 16);

update public.tournaments
set pool_count = 4
where pool_count is null;

update public.tournament_events
set pool_count = 4
where pool_count is null;
