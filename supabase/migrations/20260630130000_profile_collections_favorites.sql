/*
  Profile collections, favorites (bookmarks), and tag support.
  Tags already live on profile_metadata.tags — this adds user collections + favorites.
*/

CREATE TABLE IF NOT EXISTS profile_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, name)
);

CREATE TABLE IF NOT EXISTS profile_collection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES profile_collections(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (collection_id, profile_id)
);

CREATE TABLE IF NOT EXISTS profile_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_collections_user ON profile_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_collection_items_collection ON profile_collection_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_profile_favorites_user ON profile_favorites(user_id);

ALTER TABLE profile_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own collections"
  ON profile_collections FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own collection items"
  ON profile_collection_items FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profile_collections c
      WHERE c.id = profile_collection_items.collection_id
      AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profile_collections c
      WHERE c.id = profile_collection_items.collection_id
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users manage own favorites"
  ON profile_favorites FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON profile_collections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON profile_collection_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON profile_favorites TO authenticated;
