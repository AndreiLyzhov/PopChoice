# PopChoice Project - Claude Session Context

Last updated: 2026-01-21

## Recent Work: "Avengers Bug" Fix

### Problem Description
When user inputs "Avengers" as favourite movie:
1. **Name-matching issue**: Embedding included movie title, causing semantic search to match based on name rather than plot similarity (returning unrelated "Avengers 1998" instead of similar films)
2. **Wrong poster issue**: "Avengers 1998" displayed Marvel's Avengers poster because `getPoster` wasn't verifying film year

### Solution Implemented

#### 1. Embedding Fix (`utils/formatInput.js`)
- Stripped movie title from description before creating embedding
- Format change: Instead of "User's favourite movie is Avengers", now uses only the description
- Regex used: `/^[^:]+:\s*/` to strip "Title (YEAR):" prefix from descriptions
- If no description available, returns `null` to exclude from embedding entirely

#### 2. Exclusion Order Fix (`utils/processRecommendations.js`)
- Reordered operations: extract `favouriteMovies` → find exclude IDs → THEN format input
- This ensures movie IDs are found before names are stripped from the text
- Uses `favouriteMovies` array directly for `findMoviesByTitle()` instead of extracting from formatted text

#### 3. Poster Fix (`utils/processRecommendations.js`)
- `getPoster(title, year)` now accepts year parameter
- Includes year in TMDB search query for better results
- Allows ±1 year tolerance for regional release date differences
- Falls back to first result if no exact year match (better than no poster)
- Uses `poster_path` from search results directly (no second API call needed)

#### 4. UI Fix (`Components/Recommendation.jsx`)
- Conditional poster rendering: `{posterUrl && <img ... />}`
- Hides poster element when URL is null

### Key Files Modified
- `utils/formatInput.js` - embedding text formatting
- `utils/processRecommendations.js` - recommendation pipeline, getPoster function
- `Components/Recommendation.jsx` - conditional poster display

### Database Structure Notes
- Film descriptions format: `"Movie Title (YEAR): description... Rated X on TMDB"`
- Films table has `collection_id` and `collection_name` fields
- Avengers films: 6 total (4 in Marvel collection ID 86311, 2 with no collection)

### Technical Stack
- OpenAI embeddings: `text-embedding-3-small` (1536 dimensions)
- Vector search: Supabase with pgvector
- Movie data: TMDB API for posters/search
- Frontend: React with React Router

## Pending/Notes
- Test the fixes with various movie inputs to confirm they work
- The ±1 year tolerance in getPoster handles regional release date differences
