/**
 * Coefficient Population Script
 * Populates era and mood scores for all films in the database
 * Uses TMDB API to fetch genres, then calculates coefficients
 *
 * Usage: node Database/populateCoefficients.js
 * Options:
 *   --limit N     Process only first N films (for testing)
 *   --offset N    Skip first N films (for resuming)
 *   --dry-run     Calculate but don't update database
 *
 * Example - Continue from film 1001:
 *   node Database/populateCoefficients.js --offset 1000 --limit 1000
 */

import { createClient } from '@supabase/supabase-js';
import https from 'https';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Configuration
const TMDB_API_KEY = 'd8ef4e0b1c2d225466f38259617f0736';
const TMDB_BASE_URL = 'api.themoviedb.org';

// Supabase setup - use environment variables or defaults
const supabaseUrl = process.env.SUPABASE_URL || 'https://widegmaevygsmytsotgd.supabase.co';
const supabaseKey = process.env.SUPABASE_API_KEY || process.env.VITE_SUPABASE_API_KEY;

if (!supabaseKey) {
    console.error('Error: SUPABASE_API_KEY or VITE_SUPABASE_API_KEY environment variable is required');
    console.error('Please create a .env file with: SUPABASE_API_KEY=your_key_here');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// TMDB Genre ID mappings
const GENRE_MOOD_MAP = {
    // Scary: Horror, Thriller, Mystery
    scary: {
        primary: [27, 53],      // Horror, Thriller - full weight
        secondary: [9648]       // Mystery - partial weight
    },
    // Fun: Comedy, Animation, Family, Adventure, Action
    fun: {
        primary: [35, 16, 10751],    // Comedy, Animation, Family
        secondary: [12, 28]          // Adventure, Action
    },
    // Serious: Drama, History, Documentary, War, Crime
    serious: {
        primary: [18, 36, 99],       // Drama, History, Documentary
        secondary: [10752, 80]       // War, Crime
    },
    // Inspiring: Documentary, Family, Drama, Adventure
    inspiring: {
        primary: [99, 10751],        // Documentary, Family
        secondary: [18, 12]          // Drama, Adventure
    }
};

// Weight for primary vs secondary genres
const PRIMARY_WEIGHT = 1.0;
const SECONDARY_WEIGHT = 0.5;

// Era score thresholds
const CLASSIC_FULL_YEAR = 2000;  // Films before this are 100% classic
const NEW_FULL_YEAR = 2010;      // Films after this are 100% new

/**
 * Makes an HTTPS request to TMDB API
 */
function tmdbRequest(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: TMDB_BASE_URL,
            path: `/3${path}${path.includes('?') ? '&' : '?'}api_key=${TMDB_API_KEY}`,
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(new Error(`Failed to parse TMDB response: ${e.message}`));
                    }
                } else if (res.statusCode === 429) {
                    // Rate limited - return null to trigger retry
                    resolve(null);
                } else {
                    reject(new Error(`TMDB API error: ${res.statusCode}`));
                }
            });
        });

        req.on('error', reject);
        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('TMDB request timeout'));
        });
        req.end();
    });
}

/**
 * Search for a movie on TMDB and get its genre IDs
 */
async function getMovieGenres(title, year) {
    try {
        // Search for the movie
        const query = encodeURIComponent(title);
        const yearParam = year ? `&year=${year}` : '';
        const searchResult = await tmdbRequest(`/search/movie?query=${query}${yearParam}&language=en-US`);

        if (!searchResult) {
            // Rate limited, wait and retry
            await sleep(1000);
            return getMovieGenres(title, year);
        }

        if (searchResult.results && searchResult.results.length > 0) {
            // Return genre IDs from the first (best) match
            return searchResult.results[0].genre_ids || [];
        }

        // Try without year if no results
        if (year) {
            const searchWithoutYear = await tmdbRequest(`/search/movie?query=${query}&language=en-US`);
            if (searchWithoutYear && searchWithoutYear.results && searchWithoutYear.results.length > 0) {
                return searchWithoutYear.results[0].genre_ids || [];
            }
        }

        return [];
    } catch (error) {
        console.error(`Error fetching genres for "${title}":`, error.message);
        return [];
    }
}

/**
 * Calculate mood scores based on genre IDs
 */
function calculateMoodScores(genreIds) {
    const scores = {
        fun: 0,
        serious: 0,
        inspiring: 0,
        scary: 0
    };

    if (!genreIds || genreIds.length === 0) {
        // Default scores when no genres available
        return { fun: 0.25, serious: 0.25, inspiring: 0.25, scary: 0.25 };
    }

    // Calculate raw scores based on genre matches
    for (const mood of Object.keys(GENRE_MOOD_MAP)) {
        const mapping = GENRE_MOOD_MAP[mood];

        for (const genreId of genreIds) {
            if (mapping.primary.includes(genreId)) {
                scores[mood] += PRIMARY_WEIGHT;
            } else if (mapping.secondary.includes(genreId)) {
                scores[mood] += SECONDARY_WEIGHT;
            }
        }
    }

    // Normalize scores to 0-1 range
    const totalScore = Object.values(scores).reduce((sum, s) => sum + s, 0);

    if (totalScore === 0) {
        // No matching genres - return default
        return { fun: 0.25, serious: 0.25, inspiring: 0.25, scary: 0.25 };
    }

    // Normalize so scores sum to 1
    const normalizedScores = {};
    for (const mood of Object.keys(scores)) {
        normalizedScores[mood] = scores[mood] / totalScore;
    }

    return normalizedScores;
}

/**
 * Calculate era scores based on release year
 */
function calculateEraScores(year) {
    if (!year || isNaN(year)) {
        // Default if no year available
        return { new: 0.5, classic: 0.5 };
    }

    let newScore, classicScore;

    if (year >= NEW_FULL_YEAR) {
        // 2010 and later: fully new
        newScore = 1.0;
        classicScore = 0.1;
    } else if (year < CLASSIC_FULL_YEAR) {
        // Before 2000: fully classic
        newScore = 0.1;
        classicScore = 1.0;
    } else {
        // 2000-2010: linear interpolation
        const range = NEW_FULL_YEAR - CLASSIC_FULL_YEAR;
        const position = (year - CLASSIC_FULL_YEAR) / range;

        // Fade from classic to new
        newScore = 0.1 + (0.9 * position);
        classicScore = 1.0 - (0.9 * position);
    }

    return { new: newScore, classic: classicScore };
}

/**
 * Extract year from metadata or content
 */
function extractYear(film) {
    // Try to get year from metadata
    if (film.metadata) {
        if (film.metadata.year) {
            return parseInt(film.metadata.year);
        }
        if (film.metadata.release_date) {
            return parseInt(film.metadata.release_date.substring(0, 4));
        }
    }

    // Try to extract year from content using regex
    if (film.content) {
        // Common patterns: "released in YYYY", "(YYYY)", "YYYY film"
        const yearMatch = film.content.match(/\b(19|20)\d{2}\b/);
        if (yearMatch) {
            return parseInt(yearMatch[0]);
        }
    }

    return null;
}

/**
 * Sleep helper for rate limiting
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main function to populate coefficients
 */
async function populateCoefficients() {
    const args = process.argv.slice(2);
    const limitIndex = args.indexOf('--limit');
    const offsetIndex = args.indexOf('--offset');
    const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1]) : null;
    const offset = offsetIndex !== -1 ? parseInt(args[offsetIndex + 1]) : 0;
    const dryRun = args.includes('--dry-run');

    console.log('=== Coefficient Population Script ===');
    console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
    if (offset > 0) console.log(`Offset: ${offset} films (skipping first ${offset})`);
    if (limit) console.log(`Limit: ${limit} films`);
    console.log('');

    // Fetch all films from database
    console.log('Fetching films from database...');
    let query = supabase.from('films').select('id, content, metadata');

    if (offset > 0) {
        query = query.range(offset, offset + (limit ? limit - 1 : 999999));
    } else if (limit) {
        query = query.limit(limit);
    }

    const { data: films, error } = await query;

    if (error) {
        console.error('Error fetching films:', error);
        process.exit(1);
    }

    console.log(`Found ${films.length} films to process (starting from index ${offset})`);
    console.log('');

    // Process each film
    const updates = [];
    let processed = 0;
    let errors = 0;

    for (const film of films) {
        processed++;

        // Extract title and year
        const title = film.metadata?.title || 'Unknown';
        const year = extractYear(film);

        process.stdout.write(`\r[${processed}/${films.length}] Processing: ${title.substring(0, 40).padEnd(40)}...`);

        try {
            // Fetch genres from TMDB
            const genreIds = await getMovieGenres(title, year);

            // Calculate scores
            const moodScores = calculateMoodScores(genreIds);
            const eraScores = calculateEraScores(year);

            const update = {
                id: film.id,
                era_new_score: eraScores.new,
                era_classic_score: eraScores.classic,
                mood_fun_score: moodScores.fun,
                mood_serious_score: moodScores.serious,
                mood_inspiring_score: moodScores.inspiring,
                mood_scary_score: moodScores.scary,
                genre_ids: genreIds
            };

            updates.push(update);

            // Rate limiting: wait between TMDB requests
            // 250ms = 4 requests per second (safe for TMDB)
            await sleep(250);

        } catch (error) {
            console.error(`\nError processing "${title}":`, error.message);
            errors++;
        }
    }

    console.log('\n\n=== Processing Complete ===');
    console.log(`Processed: ${processed}`);
    console.log(`Errors: ${errors}`);
    console.log(`Updates ready: ${updates.length}`);
    console.log('');

    // Update database
    if (!dryRun && updates.length > 0) {
        console.log('Updating database...');

        // Update in batches of 50 to avoid Supabase payload limits
        const batchSize = 50;
        let updated = 0;

        for (let i = 0; i < updates.length; i += batchSize) {
            const batch = updates.slice(i, i + batchSize);

            for (const update of batch) {
                const { error: updateError } = await supabase
                    .from('films')
                    .update({
                        era_new_score: update.era_new_score,
                        era_classic_score: update.era_classic_score,
                        mood_fun_score: update.mood_fun_score,
                        mood_serious_score: update.mood_serious_score,
                        mood_inspiring_score: update.mood_inspiring_score,
                        mood_scary_score: update.mood_scary_score,
                        genre_ids: update.genre_ids
                    })
                    .eq('id', update.id);

                if (updateError) {
                    console.error(`Error updating film ${update.id}:`, updateError);
                } else {
                    updated++;
                }
            }

            // Small delay between batch updates
            if (i + batchSize < updates.length) {
                await sleep(100);
            }
            process.stdout.write(`\rUpdated ${updated}/${updates.length} films...`);
        }

        console.log(`\n\nDatabase update complete! Updated ${updated} films.`);
    } else if (dryRun) {
        console.log('DRY RUN - No database changes made');
        console.log('\nSample updates:');
        updates.slice(0, 3).forEach(u => {
            console.log(JSON.stringify(u, null, 2));
        });
    }
}

// Run the script
populateCoefficients().catch(console.error);
