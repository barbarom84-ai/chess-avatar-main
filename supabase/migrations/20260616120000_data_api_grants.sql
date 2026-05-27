/*
  # Data API explicit grants (Supabase May–Oct 2026 change)

  Applies GRANT/REVOKE only for relations that exist (skips tables from migrations
  not yet applied on this project). Safe to re-run.

  See supabase/MIGRATIONS.md for per-table intent.
*/

-- ---------------------------------------------------------------------------
-- Tables: (table_name, privileges, role)
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  rec record;
  sql text;
BEGIN
  FOR rec IN
    SELECT *
    FROM (
      VALUES
        -- Core
        ('profiles', 'SELECT, INSERT, UPDATE, DELETE', 'authenticated'),
        ('profiles', 'SELECT, INSERT, UPDATE, DELETE', 'service_role'),
        ('profile_metadata', 'SELECT, INSERT, UPDATE, DELETE', 'authenticated'),
        ('profile_metadata', 'SELECT, INSERT, UPDATE, DELETE', 'service_role'),
        ('favorite_openings', 'SELECT, INSERT, UPDATE, DELETE', 'authenticated'),
        ('favorite_openings', 'SELECT, INSERT, UPDATE, DELETE', 'service_role'),
        ('games', 'SELECT, INSERT, UPDATE, DELETE', 'authenticated'),
        ('games', 'SELECT, INSERT, UPDATE, DELETE', 'service_role'),
        ('game_reviews', 'SELECT, INSERT, UPDATE, DELETE', 'authenticated'),
        ('game_reviews', 'SELECT, INSERT, UPDATE, DELETE', 'service_role'),
        ('subscriptions', 'SELECT', 'authenticated'),
        ('subscriptions', 'SELECT, INSERT, UPDATE, DELETE', 'service_role'),
        -- Learn
        ('learn_entries', 'SELECT', 'anon'),
        ('learn_entries', 'SELECT, INSERT, UPDATE, DELETE', 'authenticated'),
        ('learn_entries', 'SELECT, INSERT, UPDATE, DELETE', 'service_role'),
        -- PvP
        ('pvp_games', 'SELECT, INSERT', 'authenticated'),
        ('pvp_games', 'SELECT, INSERT, UPDATE, DELETE', 'service_role'),
        ('pvp_moves', 'SELECT', 'authenticated'),
        ('pvp_moves', 'SELECT, INSERT, UPDATE, DELETE', 'service_role'),
        -- Site
        ('site_settings', 'SELECT', 'anon'),
        ('site_settings', 'SELECT', 'authenticated'),
        ('site_settings', 'SELECT, INSERT, UPDATE, DELETE', 'service_role'),
        -- Coach
        ('coach_explanations', 'SELECT', 'authenticated'),
        ('coach_explanations', 'SELECT, INSERT, UPDATE, DELETE', 'service_role'),
        ('coach_usage', 'SELECT', 'authenticated'),
        ('coach_usage', 'SELECT, INSERT, UPDATE, DELETE', 'service_role'),
        -- Activity
        ('activity_events', 'SELECT, INSERT', 'authenticated'),
        ('activity_events', 'SELECT, INSERT, UPDATE, DELETE', 'service_role'),
        -- Account social
        ('user_accounts', 'SELECT, INSERT, UPDATE, DELETE', 'authenticated'),
        ('user_accounts', 'SELECT, INSERT, UPDATE, DELETE', 'service_role'),
        ('user_friends', 'SELECT, INSERT, UPDATE, DELETE', 'authenticated'),
        ('user_friends', 'SELECT, INSERT, UPDATE, DELETE', 'service_role'),
        -- Ascension
        ('player_champion_cards', 'SELECT, INSERT, UPDATE', 'authenticated'),
        ('player_champion_cards', 'SELECT, INSERT, UPDATE, DELETE', 'service_role'),
        ('player_skill_allocations', 'SELECT, INSERT', 'authenticated'),
        ('player_skill_allocations', 'SELECT, INSERT, UPDATE, DELETE', 'service_role'),
        ('campaign_puzzles', 'SELECT', 'authenticated'),
        ('campaign_puzzles', 'SELECT, INSERT, UPDATE, DELETE', 'service_role'),
        ('player_puzzle_completions', 'SELECT, INSERT, UPDATE', 'authenticated'),
        ('player_puzzle_completions', 'SELECT, INSERT, UPDATE, DELETE', 'service_role'),
        -- Service-only (grants after revoke below)
        ('community_puzzles', 'SELECT, INSERT, UPDATE, DELETE', 'service_role')
    ) AS t(table_name, privileges, grantee)
  LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = rec.table_name
        AND c.relkind = 'r'
    ) THEN
      sql := format(
        'GRANT %s ON public.%I TO %I',
        rec.privileges,
        rec.table_name,
        rec.grantee
      );
      EXECUTE sql;
      RAISE NOTICE 'Granted % on public.% to %', rec.privileges, rec.table_name, rec.grantee;
    ELSE
      RAISE NOTICE 'Skipped public.% (table does not exist)', rec.table_name;
    END IF;
  END LOOP;
END $$;

-- community_puzzles: revoke client roles when table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'community_puzzles' AND c.relkind = 'r'
  ) THEN
    REVOKE ALL ON public.community_puzzles FROM anon, authenticated;
    RAISE NOTICE 'Revoked anon/authenticated on public.community_puzzles';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Sequences
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT *
    FROM (
      VALUES
        ('pvp_moves_id_seq', ARRAY['authenticated', 'service_role']::text[]),
        ('activity_events_id_seq', ARRAY['authenticated', 'service_role']::text[])
    ) AS t(seq_name, grantees)
  LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = rec.seq_name AND c.relkind = 'S'
    ) THEN
      EXECUTE format(
        'GRANT USAGE, SELECT ON SEQUENCE public.%I TO %s',
        rec.seq_name,
        (
          SELECT string_agg(quote_ident(g), ', ')
          FROM unnest(rec.grantees) AS g
        )
      );
      RAISE NOTICE 'Granted sequence public.%', rec.seq_name;
    ELSE
      RAISE NOTICE 'Skipped sequence public.% (does not exist)', rec.seq_name;
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'random_community_puzzle'
      AND pg_get_function_identity_arguments(p.oid) = ''
  ) THEN
    REVOKE ALL ON FUNCTION public.random_community_puzzle() FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.random_community_puzzle() TO postgres;
    GRANT EXECUTE ON FUNCTION public.random_community_puzzle() TO service_role;
    RAISE NOTICE 'Granted EXECUTE on random_community_puzzle()';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'is_learn_super_editor'
      AND pg_get_function_identity_arguments(p.oid) = 'check_uid uuid'
  ) THEN
    REVOKE ALL ON FUNCTION public.is_learn_super_editor(uuid) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.is_learn_super_editor(uuid) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.is_learn_super_editor(uuid) TO service_role;
    RAISE NOTICE 'Granted EXECUTE on is_learn_super_editor(uuid)';
  END IF;
END $$;
