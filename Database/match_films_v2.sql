-- Enhanced match_films function with coefficient-based scoring
-- Run this in your Supabase SQL editor after running migration_add_coefficients.sql

-- Drop the old version of the function (without exclude_collection_ids parameter)
DROP FUNCTION IF EXISTS match_films_v2(
  vector(1536),
  float,
  int,
  bigint[],
  float,
  float,
  float,
  float,
  float,
  float,
  float
);

CREATE OR REPLACE FUNCTION match_films_v2 (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  exclude_ids bigint[] DEFAULT NULL,
  exclude_collection_ids integer[] DEFAULT NULL,
  -- User preference coefficients (0-1 scale)
  pref_era_new float DEFAULT 0.5,
  pref_era_classic float DEFAULT 0.5,
  pref_mood_fun float DEFAULT 0.25,
  pref_mood_serious float DEFAULT 0.25,
  pref_mood_inspiring float DEFAULT 0.25,
  pref_mood_scary float DEFAULT 0.25,
  -- How much coefficients affect final score (0.03-0.08 recommended)
  coefficient_weight float DEFAULT 0.05
)
RETURNS TABLE (
  id bigint,
  content text,
  similarity float,
  metadata jsonb,
  coefficient_boost float
)
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  era_weight float;
  mood_weight float;
BEGIN
  -- Era and mood each get half of the coefficient influence
  era_weight := 0.5;
  mood_weight := 0.5;

  RETURN QUERY
  SELECT
    f.id,
    f.content,
    -- Base semantic similarity
    (1 - (f.embedding <=> query_embedding))::float AS similarity,
    f.metadata,
    -- Coefficient boost calculation
    (
      coefficient_weight * (
        -- Era matching (weighted by user preference)
        era_weight * (
          pref_era_new * COALESCE(f.era_new_score, 0.5) +
          pref_era_classic * COALESCE(f.era_classic_score, 0.5)
        ) +
        -- Mood matching (weighted by user preference)
        mood_weight * (
          pref_mood_fun * COALESCE(f.mood_fun_score, 0.25) +
          pref_mood_serious * COALESCE(f.mood_serious_score, 0.25) +
          pref_mood_inspiring * COALESCE(f.mood_inspiring_score, 0.25) +
          pref_mood_scary * COALESCE(f.mood_scary_score, 0.25)
        )
      )
    )::float AS coefficient_boost
  FROM films f
  WHERE
    -- Minimum similarity threshold
    (1 - (f.embedding <=> query_embedding)) > match_threshold
    -- Exclude specified film IDs
    AND (exclude_ids IS NULL OR f.id != ALL(exclude_ids))
    -- Exclude films from specified collections (same series)
    AND (exclude_collection_ids IS NULL OR f.collection_id IS NULL OR f.collection_id != ALL(exclude_collection_ids))
  ORDER BY
    -- Final score = semantic similarity + coefficient boost
    (
      (1 - (f.embedding <=> query_embedding)) +
      coefficient_weight * (
        era_weight * (
          pref_era_new * COALESCE(f.era_new_score, 0.5) +
          pref_era_classic * COALESCE(f.era_classic_score, 0.5)
        ) +
        mood_weight * (
          pref_mood_fun * COALESCE(f.mood_fun_score, 0.25) +
          pref_mood_serious * COALESCE(f.mood_serious_score, 0.25) +
          pref_mood_inspiring * COALESCE(f.mood_inspiring_score, 0.25) +
          pref_mood_scary * COALESCE(f.mood_scary_score, 0.25)
        )
      )
    ) DESC
  LIMIT match_count;
END;
$$;

-- Add comment explaining the function
COMMENT ON FUNCTION match_films_v2 IS 'Enhanced film matching with semantic similarity, coefficient-based preference boosting, and collection-based series exclusion';
