-- Migration v5 — profil personnel (page À propos)
-- À exécuter dans l'éditeur SQL Supabase

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid() NOT NULL UNIQUE,
  last_name TEXT DEFAULT '',
  post_name TEXT DEFAULT '',
  first_name TEXT DEFAULT '',
  gender TEXT DEFAULT '',
  birth_date DATE,
  address TEXT DEFAULT '',
  country TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  education_level TEXT DEFAULT '',
  objectives TEXT DEFAULT '',
  portfolio_url TEXT DEFAULT '',
  voter_card_image TEXT DEFAULT '',
  diploma_image TEXT DEFAULT '',
  transcript_image TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_user_profiles" ON user_profiles;
CREATE POLICY "owner_user_profiles" ON user_profiles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
