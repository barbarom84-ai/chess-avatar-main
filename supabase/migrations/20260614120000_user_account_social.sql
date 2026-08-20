/*
  # User account social profile (Chess Avatar account, not engine bots)

  - user_accounts: display name, bio, avatar URL per auth user
  - user_friends: directed friend list synced across devices
  - account-avatars storage bucket for profile photos
*/

CREATE TABLE IF NOT EXISTS user_accounts (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_accounts_updated_at ON user_accounts(updated_at DESC);

ALTER TABLE user_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own account profile"
  ON user_accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view public account profiles"
  ON user_accounts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own account profile"
  ON user_accounts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own account profile"
  ON user_accounts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_user_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_accounts_updated_at ON user_accounts;
CREATE TRIGGER user_accounts_updated_at
  BEFORE UPDATE ON user_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_user_accounts_updated_at();

CREATE TABLE IF NOT EXISTS user_friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Friend',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_friends_not_self CHECK (user_id <> friend_user_id),
  CONSTRAINT user_friends_unique_pair UNIQUE (user_id, friend_user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_friends_user_id ON user_friends(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_friends_friend_user_id ON user_friends(friend_user_id);

ALTER TABLE user_friends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own friends"
  ON user_friends FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own friends"
  ON user_friends FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own friends"
  ON user_friends FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own friends"
  ON user_friends FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'account-avatars',
  'account-avatars',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can read account avatars"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'account-avatars');

CREATE POLICY "Users can upload own account avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'account-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own account avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'account-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'account-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own account avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'account-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
