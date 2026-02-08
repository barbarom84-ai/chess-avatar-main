/*
  # Create Profile Metadata Tables

  1. New Tables
    - `profile_metadata`
      - `id` (uuid, primary key) - Unique identifier
      - `profile_id` (uuid, foreign key) - References profiles
      - `user_id` (uuid, foreign key) - References auth.users
      - `biography` (text) - Player biography
      - `notes` (text) - Personal notes
      - `tags` (text[]) - Profile tags
      - `style_aggression` (integer) - Aggression level (0-100)
      - `style_tactical` (integer) - Tactical play (0-100)
      - `style_positional` (integer) - Positional play (0-100)
      - `style_endgame` (integer) - Endgame skill (0-100)
      - `style_opening_theory` (integer) - Opening knowledge (0-100)
      - `style_time_management` (integer) - Time management (0-100)
      - `strengths` (text[]) - Player strengths
      - `weaknesses` (text[]) - Player weaknesses
      - `games_played` (integer) - Total games
      - `last_played_at` (timestamptz) - Last game time
      - `ai_summary` (text) - AI-generated summary
      - `ai_style_description` (text) - AI style analysis
      - `ai_confidence` (integer) - AI confidence level (0-100)
      - `ai_updated_at` (timestamptz) - Last AI analysis
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
    
    - `favorite_openings`
      - `id` (uuid, primary key) - Unique identifier
      - `profile_id` (uuid, foreign key) - References profiles
      - `name` (text) - Opening name
      - `eco` (text) - ECO code
      - `description` (text) - Opening description
      - `win_rate` (numeric) - Win rate percentage
      - `games_played` (integer) - Games with this opening
      - `preference_order` (integer) - Order of preference
      - `created_at` (timestamptz) - Creation timestamp
  
  2. Indexes
    - Indexes on profile_id and user_id for fast lookups
    - Index on updated_at for sorting
    - Index on preference_order for ordering
  
  3. Security
    - Enable RLS on both tables
    - Users can only access their own metadata
    - Favorite openings accessible through profile ownership
  
  4. Triggers
    - Auto-update updated_at timestamp on metadata updates
*/

-- Create profile_metadata table
CREATE TABLE IF NOT EXISTS profile_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Text information
  biography TEXT,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  
  -- Playing style (0-100)
  style_aggression INTEGER DEFAULT 50 CHECK (style_aggression BETWEEN 0 AND 100),
  style_tactical INTEGER DEFAULT 50 CHECK (style_tactical BETWEEN 0 AND 100),
  style_positional INTEGER DEFAULT 50 CHECK (style_positional BETWEEN 0 AND 100),
  style_endgame INTEGER DEFAULT 50 CHECK (style_endgame BETWEEN 0 AND 100),
  style_opening_theory INTEGER DEFAULT 50 CHECK (style_opening_theory BETWEEN 0 AND 100),
  style_time_management INTEGER DEFAULT 50 CHECK (style_time_management BETWEEN 0 AND 100),
  
  -- Strengths and weaknesses
  strengths TEXT[] DEFAULT '{}',
  weaknesses TEXT[] DEFAULT '{}',
  
  -- Statistics
  games_played INTEGER DEFAULT 0,
  last_played_at TIMESTAMPTZ,
  
  -- AI analysis
  ai_summary TEXT,
  ai_style_description TEXT,
  ai_confidence INTEGER DEFAULT 0 CHECK (ai_confidence BETWEEN 0 AND 100),
  ai_updated_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(profile_id)
);

-- Create favorite_openings table
CREATE TABLE IF NOT EXISTS favorite_openings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  eco TEXT,
  description TEXT,
  
  -- Statistics
  win_rate NUMERIC(5,2),
  games_played INTEGER DEFAULT 0,
  
  -- Preference order
  preference_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profile_metadata_profile ON profile_metadata(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_metadata_user ON profile_metadata(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_metadata_updated ON profile_metadata(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_favorite_openings_profile ON favorite_openings(profile_id);
CREATE INDEX IF NOT EXISTS idx_favorite_openings_order ON favorite_openings(profile_id, preference_order);

-- Enable RLS
ALTER TABLE profile_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_openings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profile_metadata
CREATE POLICY "Users can view their own profile metadata"
  ON profile_metadata FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile metadata"
  ON profile_metadata FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile metadata"
  ON profile_metadata FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile metadata"
  ON profile_metadata FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for favorite_openings
CREATE POLICY "Users can view their own favorite openings"
  ON favorite_openings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = favorite_openings.profile_id 
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own favorite openings"
  ON favorite_openings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = favorite_openings.profile_id 
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own favorite openings"
  ON favorite_openings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = favorite_openings.profile_id 
      AND profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = favorite_openings.profile_id 
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own favorite openings"
  ON favorite_openings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = favorite_openings.profile_id 
      AND profiles.user_id = auth.uid()
    )
  );

-- Auto-update trigger
CREATE OR REPLACE FUNCTION update_profile_metadata_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profile_metadata_updated
  BEFORE UPDATE ON profile_metadata
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_metadata_timestamp();
