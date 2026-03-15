import https from 'https';
import { URL } from 'url';

/**
 * API endpoint to lookup a movie description from our database
 * Used to enrich favourite movie input with actual film descriptions before embedding
 *
 * POST /api/get-movie-description
 * Body: { title: "Movie Title" }
 * Returns: { description: "Full film description..." } or { description: null }
 */
export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { title } = req.body;

    if (!title || typeof title !== 'string') {
        return res.status(400).json({ error: "Title is required" });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_API_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({
            error: "Supabase configuration not found in environment variables"
        });
    }

    return new Promise((resolve) => {
        try {
            const searchTerm = title.toLowerCase().trim();

            const url = new URL(`${supabaseUrl}/rest/v1/films`);
            url.searchParams.set('select', 'id,content,metadata');
            url.searchParams.set('limit', '1');

            const options = {
                hostname: url.hostname,
                port: url.port || 443,
                path: url.pathname + url.search,
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Connection': 'close'
                },
                timeout: 10000
            };

            const httpsReq = https.request(options, (httpsRes) => {
                let responseData = '';

                httpsRes.on('data', (chunk) => {
                    responseData += chunk.toString();
                });

                httpsRes.on('end', async () => {
                    if (httpsRes.statusCode !== 200) {
                        return searchAllFilms(supabaseUrl, supabaseKey, searchTerm, res, resolve);
                    }

                    try {
                        const films = JSON.parse(responseData);

                        if (films && films.length > 0) {
                            const matchedFilm = findBestMatch(films, searchTerm);
                            if (matchedFilm) {
                                return resolve(res.status(200).json({
                                    description: matchedFilm.content,
                                    filmId: matchedFilm.id
                                }));
                            }
                        }

                        return searchAllFilms(supabaseUrl, supabaseKey, searchTerm, res, resolve);
                    } catch (parseError) {
                        return resolve(res.status(200).json({ description: null }));
                    }
                });

                httpsRes.on('error', () => {
                    return resolve(res.status(200).json({ description: null }));
                });
            });

            httpsReq.on('timeout', () => {
                httpsReq.destroy();
                return resolve(res.status(200).json({ description: null }));
            });

            httpsReq.on('error', () => {
                return resolve(res.status(200).json({ description: null }));
            });

            httpsReq.end();

        } catch (error) {
            return resolve(res.status(200).json({ description: null }));
        }
    });
}

/**
 * Search all films and find best title match
 */
function searchAllFilms(supabaseUrl, supabaseKey, searchTerm, res, resolve) {
    const url = new URL(`${supabaseUrl}/rest/v1/films`);
    url.searchParams.set('select', 'id,content,metadata');

    const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Connection': 'close'
        },
        timeout: 15000
    };

    const httpsReq = https.request(options, (httpsRes) => {
        let responseData = '';

        httpsRes.on('data', (chunk) => {
            responseData += chunk.toString();
        });

        httpsRes.on('end', () => {
            if (httpsRes.statusCode !== 200) {
                return resolve(res.status(200).json({ description: null }));
            }

            try {
                const films = JSON.parse(responseData);
                const matchedFilm = findBestMatch(films, searchTerm);

                if (matchedFilm) {
                    return resolve(res.status(200).json({
                        description: matchedFilm.content,
                        filmId: matchedFilm.id
                    }));
                }

                return resolve(res.status(200).json({ description: null }));
            } catch (parseError) {
                return resolve(res.status(200).json({ description: null }));
            }
        });

        httpsRes.on('error', () => {
            return resolve(res.status(200).json({ description: null }));
        });
    });

    httpsReq.on('timeout', () => {
        httpsReq.destroy();
        return resolve(res.status(200).json({ description: null }));
    });

    httpsReq.on('error', () => {
        return resolve(res.status(200).json({ description: null }));
    });

    httpsReq.end();
}

/**
 * Find best matching film from a list based on title
 */
function findBestMatch(films, searchTerm) {
    if (!films || films.length === 0) return null;

    const normalizedSearch = searchTerm.toLowerCase().trim();

    // First try exact match
    for (const film of films) {
        if (film.metadata && film.metadata.title) {
            const filmTitle = film.metadata.title.toLowerCase().trim();
            if (filmTitle === normalizedSearch) {
                return film;
            }
        }
    }

    // Then try partial match (search term is contained in title)
    for (const film of films) {
        if (film.metadata && film.metadata.title) {
            const filmTitle = film.metadata.title.toLowerCase().trim();
            if (filmTitle.includes(normalizedSearch) || normalizedSearch.includes(filmTitle)) {
                return film;
            }
        }
    }

    // Finally try fuzzy matching (words overlap)
    const searchWords = normalizedSearch.split(/\s+/).filter(w => w.length > 2);

    let bestMatch = null;
    let bestScore = 0;

    for (const film of films) {
        if (film.metadata && film.metadata.title) {
            const filmTitle = film.metadata.title.toLowerCase().trim();
            const titleWords = filmTitle.split(/\s+/).filter(w => w.length > 2);

            let matchCount = 0;
            for (const searchWord of searchWords) {
                for (const titleWord of titleWords) {
                    if (titleWord.includes(searchWord) || searchWord.includes(titleWord)) {
                        matchCount++;
                        break;
                    }
                }
            }

            const score = matchCount / Math.max(searchWords.length, 1);
            if (score > bestScore && score >= 0.5) {
                bestScore = score;
                bestMatch = film;
            }
        }
    }

    return bestMatch;
}
