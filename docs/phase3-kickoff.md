# Phase 3 Kickoff

Supabase project URL: `https://tligbauymfpdguvpehhl.supabase.co`

The REST URL you gave, `https://tligbauymfpdguvpehhl.supabase.co/rest/v1/`, is the PostgREST API base. Schema creation must be run through the Supabase SQL editor, Supabase CLI, or a Postgres connection string. The migration is ready here:

`supabase/migrations/20260510183000_phase3_schema.sql`

Auth/profile bootstrap migration:

`supabase/migrations/20260510190000_auth_profile_bootstrap.sql`

Optional smoke seed:

`supabase/seed/phase3_smoke_seed.sql`

Optional registration workflow seed:

`supabase/seed/phase3_registration_seed.sql`

Optional pool workflow seed:

`supabase/seed/phase3_pool_seed.sql`

Optional match workflow seed:

`supabase/seed/phase3_match_seed.sql`

## Dossier Report

- `public/`: static app assets. It currently contains the favicon and shared SVG icon sheet.
- `src/`: React/Vite source. This is the active application surface.
- `src/assets/`: images and starter assets, including the padel hero image.
- `src/components/`: shared UI and navigation components.
- `src/pages/`: 13 feature pages covering dashboard, tournaments, registration review, teams/seeds, draw room, public views, match schedule, match scoring, pool standings, qualified teams, audit and override pages.
- `src/mockData.ts`: all current domain data is still mocked here.
- `src/context.tsx`: app state and tournament mutation actions still hydrate from `MOCK_*`.
- `.env.example`: Phase 3 Supabase environment template with the project URL already set.

## Current Phase 2 State

- Frontend stack: Vite, React 19, TypeScript, Tailwind, Framer Motion, DnD Kit, Lucide.
- No Supabase client dependency is installed yet.
- The app has the right screens for Phase 3, but data is local-only.
- Main mock replacement targets are `DashboardPage`, `TournamentsPage`, `MainDrawPage`, `MatchSchedulePage`, `MatchScorePage`, `PublicViewsPage`, `QualifiedTeamsPage`, and `context.tsx`.

## Phase 3 Roadmap

1. Database schema
   - Done as a migration draft with the 18 requested tables:
     `profiles`, `players`, `clubs`, `tournaments`, `tournament_events`, `registrations`, `teams`, `pools`, `pool_slots`, `draw_sessions`, `draws`, `draw_slots`, `matches`, `match_sets`, `rankings`, `ranking_points`, `admin_overrides`, `audit_logs`.
   - Includes foreign keys, indexes, enums, timestamps, RLS enabled on all tables, and role-aware policies.

2. Supabase client
   - Install `@supabase/supabase-js`.
   - Done: `.env.local` is configured locally with your Supabase URL and anon public key.
   - Done: `src/supabaseClient.ts` exports the app client.
   - Done: Dashboard and Tournaments now load `tournaments` from Supabase with a mock fallback until live rows exist.
   - Done: Registrations now load from Supabase and validate/reject through live `registrations` updates with audit log insertions.
   - Done: Seed changes now update live `teams` rows and write `admin_overrides` plus `audit_logs`.
   - Done: Pool draw now loads live `pools`/`pool_slots`; slot assignment, slot locking, and pool publication persist to Supabase.
   - Done: Match schedule and score entry now load live `matches`/`match_sets`; score saves replace sets and complete the match, with Realtime refresh subscriptions active.

3. Authentication
   - Add admin email/password login through Supabase Auth.
   - Add player login/profile screen.
   - Store role in `profiles.role`: `admin`, `super_admin`, or `player`.

4. Data layer migration
   - Replace mocks module by module:
     tournaments -> registrations -> teams/seeds -> pools -> draws -> matches -> standings -> rankings.

5. Realtime
   - Subscribe to `matches` and `match_sets`.
   - Push live score/status changes to public views.

6. Edge Functions
   - Add standings recalculation after match completion.
   - Award ranking points after validated completion.

## SQL Execution Notes

Run the migration first in Supabase SQL editor. After it succeeds:

```sql
alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.match_sets;
```

If a table is already in the publication, Supabase may return a duplicate object notice/error. In that case it is safe to continue.

Then create the first admin manually by signing up a user and updating the corresponding profile:

```sql
update public.profiles
set role = 'super_admin'
where email = 'YOUR_ADMIN_EMAIL';
```

If that update reports success but you are unsure whether a row existed, run:

```sql
select id, email, role, full_name
from public.profiles
where email = 'YOUR_ADMIN_EMAIL';
```
