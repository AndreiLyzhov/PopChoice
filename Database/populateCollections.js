/**
 * Collection Population Script
 * Populates collection_id and collection_name for all films in the database
 * Uses TMDB API to fetch belongs_to_collection data
 *
 * Usage: node Database/populateCollections.js
 * Options:
 *   --limit N     Process only first N films (for testing)
 *   --offset N    Skip first N films (for resuming)
 *   --dry-run     Fetch data but don't update database
 *
 * Example - Test with 100 films:
 *   node Database/populateCollections.js --limit 100
 *
 * Example - Continue from film 1001:
 *   node Database/populateCollections.js --offset 1000 --limit 1000
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
                } else if (res.statusCode === 404) {
                    // Movie not found
                    resolve({ notFound: true });
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
 * Sleep helper for rate limiting
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Extract year from metadata or content
 */
function extractYear(film) {
    if (film.metadata) {
        if (film.metadata.year) {
            return parseInt(film.metadata.year);
        }
        if (film.metadata.release_date) {
            return parseInt(film.metadata.release_date.substring(0, 4));
        }
    }

    if (film.content) {
        const yearMatch = film.content.match(/\b(19|20)\d{2}\b/);
        if (yearMatch) {
            return parseInt(yearMatch[0]);
        }
    }

    return null;
}

/**
 * Search for a movie on TMDB and get its ID
 */
async function searchMovie(title, year) {
    const query = encodeURIComponent(title);
    const yearParam = year ? `&year=${year}` : '';
    const searchResult = await tmdbRequest(`/search/movie?query=${query}${yearParam}&language=en-US`);

    if (!searchResult) {
        // Rate limited, wait and retry
        await sleep(1000);
        return searchMovie(title, year);
    }

    if (searchResult.results && searchResult.results.length > 0) {
        return searchResult.results[0].id;
    }

    // Try without year if no results
    if (year) {
        const searchWithoutYear = await tmdbRequest(`/search/movie?query=${query}&language=en-US`);
        if (searchWithoutYear && searchWithoutYear.results && searchWithoutYear.results.length > 0) {
            return searchWithoutYear.results[0].id;
        }
    }

    return null;
}

/**
 * Get movie details including belongs_to_collection
 */
async function getMovieCollection(tmdbId) {
    const result = await tmdbRequest(`/movie/${tmdbId}`);

    if (!result) {
        // Rate limited, wait and retry
        await sleep(1000);
        return getMovieCollection(tmdbId);
    }

    if (result.notFound) {
        return null;
    }

    if (result.belongs_to_collection) {
        return {
            id: result.belongs_to_collection.id,
            name: result.belongs_to_collection.name
        };
    }

    return null;
}

/**
 * Main function to populate collections
 */
async function populateCollections() {
    const args = process.argv.slice(2);
    const limitIndex = args.indexOf('--limit');
    const offsetIndex = args.indexOf('--offset');
    const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1]) : null;
    const offset = offsetIndex !== -1 ? parseInt(args[offsetIndex + 1]) : 0;
    const dryRun = args.includes('--dry-run');

    console.log('=== Collection Population Script ===');
    console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
    if (offset > 0) console.log(`Offset: ${offset} films (skipping first ${offset})`);
    if (limit) console.log(`Limit: ${limit} films`);
    console.log('');

    // Fetch films from database
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
    let collectionsFound = 0;
    let noCollection = 0;

    for (const film of films) {
        processed++;

        const title = film.metadata?.title || 'Unknown';
        const year = extractYear(film);

        process.stdout.write(`\r[${processed}/${films.length}] Processing: ${title.substring(0, 40).padEnd(40)}...`);

        try {
            // Search for the movie on TMDB
            const tmdbId = await searchMovie(title, year);

            if (!tmdbId) {
                noCollection++;
                updates.push({
                    id: film.id,
                    collection_id: null,
                    collection_name: null
                });
                await sleep(250);
                continue;
            }

            // Get collection data
            const collection = await getMovieCollection(tmdbId);

            if (collection) {
                collectionsFound++;
                updates.push({
                    id: film.id,
                    collection_id: collection.id,
                    collection_name: collection.name
                });
            } else {
                noCollection++;
                updates.push({
                    id: film.id,
                    collection_id: null,
                    collection_name: null
                });
            }

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
    console.log(`Collections found: ${collectionsFound}`);
    console.log(`No collection: ${noCollection}`);
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
                        collection_id: update.collection_id,
                        collection_name: update.collection_name
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
        console.log('\nSample updates (films with collections):');
        const collectionsOnly = updates.filter(u => u.collection_id !== null);
        collectionsOnly.slice(0, 5).forEach(u => {
            console.log(JSON.stringify(u, null, 2));
        });
    }
}

// Run the script
populateCollections().catch(console.error);
