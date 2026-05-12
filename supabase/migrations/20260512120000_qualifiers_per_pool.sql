alter table public.tournaments
  add column if not exists qualifiers_per_pool integer not null default 2
  check (qualifiers_per_pool between 1 and 4);

alter table public.tournament_events
  add column if not exists qualifiers_per_pool integer not null default 2
  check (qualifiers_per_pool between 1 and 4);

update public.tournaments
set qualifiers_per_pool = 2
where qualifiers_per_pool is null;

update public.tournament_events
set qualifiers_per_pool = 2
where qualifiers_per_pool is null;
