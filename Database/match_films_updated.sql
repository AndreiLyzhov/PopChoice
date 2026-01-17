-- Updated match_films function with exclude_ids parameter
-- Run this in your Supabase SQL editor to update the function

create or replace function match_films (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  exclude_ids bigint[] default null
)
returns table (
  id bigint,
  content text,
  similarity float,
  metadata jsonb
)
language sql stable
as $$
  select
    films.id,
    films.content,
    1 - (films.embedding <=> query_embedding) as similarity,
    films.metadata
  from films
  where 1 - (films.embedding <=> query_embedding) > match_threshold
    and (exclude_ids is null or films.id != all(exclude_ids))
  order by similarity desc
  limit match_count;
$$;
