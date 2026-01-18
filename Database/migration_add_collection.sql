-- Migration: Add collection columns to films table
-- Run this in your Supabase SQL editor to add collection support
-- This enables excluding films from the same series in recommendations

ALTER TABLE films ADD COLUMN IF NOT EXISTS collection_id INTEGER;
ALTER TABLE films ADD COLUMN IF NOT EXISTS collection_name TEXT;

-- Create index for efficient collection-based filtering
CREATE INDEX IF NOT EXISTS idx_films_collection ON films(collection_id);

-- Verify migration
SELECT
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'films'
    AND column_name IN ('collection_id', 'collection_name');
