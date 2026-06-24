-- Schéma Supabase pour Egmon — Gestionnaire de projets
-- ⚠️ À exécuter UNIQUEMENT sur une base VIDE (nouveau projet Supabase)
--
-- Si vos tables existent déjà :
--   1. migration_v3.sql  (user_id, RLS, progress, github_url, live_url…)
--   2. migration_v2.sql  (deadline, is_active, pinned — fonctionnalités app)
--   3. migration_v4.sql  (statut début, champ estimation)
--   4. migration_v5.sql  (profil personnel — page À propos)
-- Ne ré-exécutez PAS ce fichier sur une base déjà peuplée.

-- Projets
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid() NOT NULL,
  name TEXT NOT NULL,
  client_name TEXT DEFAULT '',
  category TEXT DEFAULT '',
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deadline DATE,
  is_active BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'debut' CHECK (status IN ('debut', 'en_cours', 'termine', 'en_pause', 'abandonne')),
  estimation TEXT DEFAULT '',
  amount NUMERIC(10, 2) DEFAULT 0,
  progress INTEGER DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  github_url TEXT DEFAULT '',
  live_url TEXT DEFAULT '',
  technologies TEXT[] DEFAULT '{}'
);

-- Journal des modifications par projet
CREATE TABLE IF NOT EXISTS project_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid() NOT NULL,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tâches
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid() NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'a_faire' CHECK (status IN ('a_faire', 'en_cours', 'termine')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bibliothèque de templates
CREATE TABLE IF NOT EXISTS templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid() NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT DEFAULT '',
  github_url TEXT DEFAULT '',
  images TEXT[] DEFAULT '{}',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ressources importantes
CREATE TABLE IF NOT EXISTS resources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid() NOT NULL,
  title TEXT NOT NULL,
  url TEXT DEFAULT '',
  type TEXT DEFAULT 'site' CHECK (type IN ('inspiration', 'site', 'article', 'youtube', 'github', 'figma')),
  description TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notes techniques
CREATE TABLE IF NOT EXISTS technical_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid() NOT NULL,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  type TEXT DEFAULT 'snippet' CHECK (type IN ('snippet', 'command', 'checklist', 'deployment', 'tip')),
  pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Idées d'applications
CREATE TABLE IF NOT EXISTS app_ideas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid() NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT DEFAULT 'idea' CHECK (status IN ('idea', 'in_progress', 'done', 'abandoned')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profil personnel (page À propos)
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
  cv_image TEXT DEFAULT '',
  voter_card_image TEXT DEFAULT '',
  diploma_image TEXT DEFAULT '',
  transcript_image TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_projects_user_id         ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_project_logs_project_id  ON project_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_project_logs_user_id     ON project_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id         ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id            ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status             ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_projects_status          ON projects(status);
CREATE INDEX IF NOT EXISTS idx_templates_user_id        ON templates(user_id);
CREATE INDEX IF NOT EXISTS idx_resources_user_id        ON resources(user_id);
CREATE INDEX IF NOT EXISTS idx_technical_notes_user_id  ON technical_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_app_ideas_user_id        ON app_ideas(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id    ON user_profiles(user_id);

-- RLS — chaque utilisateur accède uniquement à ses données
ALTER TABLE projects         ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks            ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates        ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources        ENABLE ROW LEVEL SECURITY;
ALTER TABLE technical_notes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_ideas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_projects"         ON projects         FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_project_logs"     ON project_logs     FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_tasks"            ON tasks            FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_templates"        ON templates        FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_resources"        ON resources        FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_technical_notes"  ON technical_notes  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_app_ideas"        ON app_ideas        FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_user_profiles"    ON user_profiles    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
