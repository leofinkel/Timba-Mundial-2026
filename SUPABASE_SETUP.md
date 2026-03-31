# Supabase setup (MCP + app)

## 1) Environment variables

Create `.env.local` based on `.env.local.example`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

`SUPABASE_SERVICE_ROLE_KEY` is required because server-side services (`rankings`, public rules) use a server-only admin client.

## 2) Apply database schema

From Supabase SQL Editor (or Supabase MCP SQL tool), run:

1. `supabase/schema.sql`
2. `supabase/seed.sql`

The seed is idempotent and only inserts default rules when `game_rules` is empty.

### If you get "relation already exists" (example: `profiles`)

Your database already has part of the schema. In dev/staging, run:

1. `supabase/reset.sql`
2. `supabase/schema.sql`
3. `supabase/seed.sql`

Do not use `reset.sql` in production unless you explicitly want to drop all app data.

## 3) Validate app connection

Run the app:

```bash
npm run dev
```

Quick checks:

- `/rules` should render rules from `game_rules` if present.
- `/rankings` should load even without session (server-side admin read).
- Login/register should continue working with Supabase Auth.
