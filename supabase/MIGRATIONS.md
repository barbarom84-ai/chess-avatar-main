# Supabase migrations

> **Do not paste this file into the Supabase SQL Editor.** It is Markdown documentation, not SQL (`#` headings will cause `syntax error at or near "#"`).
>
> **To apply grants:** open and run only  
> [`migrations/20260616120000_data_api_grants.sql`](migrations/20260616120000_data_api_grants.sql)  
> in Dashboard → SQL → New query.

SQL migrations live in `supabase/migrations/`. Apply with the Supabase CLI (`supabase db push`) or by running each **`.sql`** file in order in the Dashboard SQL Editor.

## Data API grants (required)

Supabase no longer auto-exposes new `public` tables to PostgREST / `supabase-js`. **RLS alone is not enough** — you must `GRANT` table privileges to `anon`, `authenticated`, and/or `service_role` as intended.

After `CREATE TABLE` and RLS policies in every new migration, add grants that match your policies:

```sql
-- Example: authenticated client table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.my_table TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.my_table TO service_role;
-- GRANT SELECT ON public.my_table TO anon;  -- only if a policy targets anon

-- Example: API-only table (no browser access)
REVOKE ALL ON public.my_secret_table FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.my_secret_table TO service_role;
```

If the table uses a `SERIAL` / `BIGSERIAL` column, also grant the sequence:

```sql
GRANT USAGE, SELECT ON SEQUENCE public.my_table_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.my_table_id_seq TO service_role;
```

For `SECURITY DEFINER` functions used in policies:

```sql
REVOKE ALL ON FUNCTION public.my_helper(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_helper(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_helper(uuid) TO service_role;
```

Baseline grants for all current tables: [`migrations/20260616120000_data_api_grants.sql`](migrations/20260616120000_data_api_grants.sql).

References:

- [Breaking change changelog](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically)
- [Securing your API](https://supabase.com/docs/guides/api/securing-your-api)

## Checklist for new migrations

1. `CREATE TABLE` (+ indexes, triggers)
2. `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
3. RLS policies (`TO authenticated` / `anon` as needed)
4. **Data API `GRANT` / `REVOKE`** (see above)
5. Realtime publication if needed (`ALTER PUBLICATION supabase_realtime ADD TABLE ...`)

After deploy, use Dashboard → **Advisors** → Security Advisor to confirm exposure matches intent.

## Post-deploy smoke tests

The grants migration **skips tables that do not exist** (logs `Skipped public.<name>`). If you see many skipped tables, apply earlier migrations first (e.g. `20251217165831_create_profile_metadata.sql`).

After applying `20260616120000_data_api_grants.sql` (or `supabase db push`):

| Area | Check |
|------|--------|
| Profiles / games | Save avatar, list games in UI |
| PvP | Create game, play a move, Realtime updates the board |
| Puzzles | `/api/puzzles/cloud-random` still returns a puzzle (`community_puzzles` via service role only) |
| Learn | Super-user can edit `learn_entries` |
| Site config | Anonymous page load reads nav (`site_settings`) |
| Ascension | Complete a campaign puzzle |
| Admin ops | Super-user dashboard: live PvP list + activity feed |

Security Advisor: `community_puzzles` must **not** list `anon` / `authenticated` as having table privileges.
