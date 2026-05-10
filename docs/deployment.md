# Deployment

Recommended GitHub repository name:

`padel-operating-system`

## Vercel Settings

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

## Environment Variables

Add these in Vercel Project Settings -> Environment Variables:

```txt
VITE_SUPABASE_URL=https://tligbauymfpdguvpehhl.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_public_key
```

The local `.env.local` file is intentionally ignored by Git.

## Supabase Before First Production Use

Run the migrations and smoke seeds in Supabase SQL Editor:

1. `supabase/migrations/20260510183000_phase3_schema.sql`
2. `supabase/migrations/20260510190000_auth_profile_bootstrap.sql`
3. `supabase/seed/phase3_smoke_seed.sql`
4. `supabase/seed/phase3_registration_seed.sql`
5. `supabase/seed/phase3_pool_seed.sql`
6. `supabase/seed/phase3_match_seed.sql`

Realtime:

```sql
alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.match_sets;
```

If Supabase says a table is already a member of the publication, continue.
