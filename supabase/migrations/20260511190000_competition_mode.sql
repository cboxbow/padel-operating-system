alter table public.tournaments
  add column if not exists competition_mode text not null default 'main_draw_direct'
  check (competition_mode in ('main_draw_direct', 'qualification_phase'));

alter table public.tournament_events
  add column if not exists competition_mode text not null default 'main_draw_direct'
  check (competition_mode in ('main_draw_direct', 'qualification_phase'));

update public.tournaments
set competition_mode = 'main_draw_direct'
where competition_mode is null;

update public.tournament_events
set competition_mode = 'main_draw_direct'
where competition_mode is null;
