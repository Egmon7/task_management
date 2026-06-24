

ALTER TABLE projects         ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE project_logs     ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE tasks            ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE templates        ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE resources        ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE technical_notes  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE app_ideas        ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Remplacer par votre email si vous avez plusieurs comptes
DO $$
DECLARE
  owner_id UUID;
BEGIN
  SELECT id INTO owner_id FROM auth.users ORDER BY created_at LIMIT 1;

  IF owner_id IS NULL THEN
    RAISE EXCEPTION 'Aucun utilisateur dans auth.users — créez votre compte d''abord.';
  END IF;

  UPDATE projects         SET user_id = owner_id WHERE user_id IS NULL;
  UPDATE project_logs     SET user_id = owner_id WHERE user_id IS NULL;
  UPDATE tasks            SET user_id = owner_id WHERE user_id IS NULL;
  UPDATE templates        SET user_id = owner_id WHERE user_id IS NULL;
  UPDATE resources        SET user_id = owner_id WHERE user_id IS NULL;
  UPDATE technical_notes  SET user_id = owner_id WHERE user_id IS NULL;
  UPDATE app_ideas        SET user_id = owner_id WHERE user_id IS NULL;
END $$;

ALTER TABLE projects         ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE project_logs     ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE tasks            ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE templates        ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE resources        ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE technical_notes  ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE app_ideas        ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE projects         ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE project_logs     ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE tasks            ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE templates        ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE resources        ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE technical_notes  ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE app_ideas        ALTER COLUMN user_id SET DEFAULT auth.uid();

-- ─── 2. updated_at (certaines colonnes existent déjà via v2) ─

ALTER TABLE projects         ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE project_logs     ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE tasks            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE templates        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE resources        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE technical_notes  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE app_ideas        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE projects         SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE project_logs     SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE tasks            SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE templates        SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE resources        SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE technical_notes  SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE app_ideas        SET updated_at = created_at WHERE updated_at IS NULL;

-- ─── 3. Champs projets supplémentaires ─────────────────────

ALTER TABLE projects ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS github_url TEXT DEFAULT '';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS live_url TEXT DEFAULT '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'projects_progress_check'
  ) THEN
    ALTER TABLE projects ADD CONSTRAINT projects_progress_check
      CHECK (progress BETWEEN 0 AND 100);
  END IF;
END $$;

-- ─── 4. Index user_id ──────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_projects_user_id         ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_project_logs_user_id     ON project_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id            ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_user_id        ON templates(user_id);
CREATE INDEX IF NOT EXISTS idx_resources_user_id        ON resources(user_id);
CREATE INDEX IF NOT EXISTS idx_technical_notes_user_id  ON technical_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_app_ideas_user_id        ON app_ideas(user_id);

-- ─── 5. RLS — chaque utilisateur voit uniquement ses données ─

ALTER TABLE projects         ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks            ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates        ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources        ENABLE ROW LEVEL SECURITY;
ALTER TABLE technical_notes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_ideas        ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on projects"         ON projects;
DROP POLICY IF EXISTS "Allow all on project_logs"     ON project_logs;
DROP POLICY IF EXISTS "Allow all on tasks"            ON tasks;
DROP POLICY IF EXISTS "Allow all on templates"       ON templates;
DROP POLICY IF EXISTS "Allow all on resources"        ON resources;
DROP POLICY IF EXISTS "Allow all on technical_notes"  ON technical_notes;
DROP POLICY IF EXISTS "Allow all on app_ideas"        ON app_ideas;

CREATE POLICY "owner_projects"         ON projects         FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_project_logs"     ON project_logs     FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_tasks"            ON tasks            FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_templates"        ON templates        FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_resources"        ON resources        FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_technical_notes"  ON technical_notes  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_app_ideas"        ON app_ideas        FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
