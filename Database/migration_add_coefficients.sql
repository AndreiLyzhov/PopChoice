-- Migration: Add coefficient columns to films table
-- Run this in your Supabase SQL editor

-- Era scores: how "classic" or "new" a film is (0-1 scale)
ALTER TABLE films ADD COLUMN IF NOT EXISTS era_new_score REAL DEFAULT 0.5;
ALTER TABLE films ADD COLUMN IF NOT EXISTS era_classic_score REAL DEFAULT 0.5;

-- Mood scores: how well the film matches each mood (0-1 scale)
ALTER TABLE films ADD COLUMN IF NOT EXISTS mood_fun_score REAL DEFAULT 0.25;
ALTER TABLE films ADD COLUMN IF NOT EXISTS mood_serious_score REAL DEFAULT 0.25;
ALTER TABLE films ADD COLUMN IF NOT EXISTS mood_inspiring_score REAL DEFAULT 0.25;
ALTER TABLE films ADD COLUMN IF NOT EXISTS mood_scary_score REAL DEFAULT 0.25;

-- Genre IDs from TMDB for reference
ALTER TABLE films ADD COLUMN IF NOT EXISTS genre_ids INTEGER[] DEFAULT '{}';

-- Create index for faster coefficient-based queries (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_films_era_new ON films(era_new_score);
CREATE INDEX IF NOT EXISTS idx_films_era_classic ON films(era_classic_score);
CREATE INDEX IF NOT EXISTS idx_films_mood_fun ON films(mood_fun_score);
CREATE INDEX IF NOT EXISTS idx_films_mood_serious ON films(mood_serious_score);
CREATE INDEX IF NOT EXISTS idx_films_mood_inspiring ON films(mood_inspiring_score);
CREATE INDEX IF NOT EXISTS idx_films_mood_scary ON films(mood_scary_score);
