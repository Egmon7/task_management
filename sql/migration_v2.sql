-- Migration v2 — Fonctionnalités app (épinglage, projet actif, échéances)
-- À exécuter si vous avez sauté cette étape (ex. schema + v3 seulement)
-- Safe : utilise IF NOT EXISTS, peut être exécuté plusieurs fois sans erreur

ALTER TABLE projects ADD COLUMN IF NOT EXISTS deadline DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;

ALTER TABLE resources ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT false;
ALTER TABLE technical_notes ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT false;

-- Au cas où updated_at sur projects manquerait encore
ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
UPDATE projects SET updated_at = created_at WHERE updated_at IS NULL;
