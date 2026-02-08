-- Add avatar_url to profiles (nullable).
-- Fixes "Could not find the 'avatar_url' column of 'profiles' in the schema cache"
-- when Supabase or Auth expects this column.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

COMMENT ON COLUMN profiles.avatar_url IS 'Optional avatar URL; also stored in config.avatarUrl.';
