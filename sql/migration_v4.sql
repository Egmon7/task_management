-- Migration v4 — statut « début », champ estimation
-- À exécuter dans l'éditeur SQL Supabase (base déjà en place)

ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;
ALTER TABLE projects ADD CONSTRAINT projects_status_check
  CHECK (status IN ('debut', 'en_cours', 'termine', 'en_pause', 'abandonne'));

ALTER TABLE projects ADD COLUMN IF NOT EXISTS estimation TEXT DEFAULT '';
