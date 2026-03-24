import https from 'https';

const TMDB_BASE_URL = "api.themoviedb.org";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/original";

function tmdbSearch(query, year, apiKey) {
    return new Promise((resolve, reject) => {
        let path = `/3/search/movie?api_key=${apiKey}&language=en-US&query=${encodeURIComponent(query)}`;
        if (year) {
            path += `&year=${year}`;
        }

        const options = {
            hostname: TMDB_BASE_URL,
            port: 443,
            path: path,
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Connection': 'close'
            },
            timeout: 10000
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
                } else {
                    reject(new Error(`TMDB request failed with status ${res.statusCode}`));
                }
            });
        });

        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('TMDB request timeout'));
        });
        req.end();
    });
}

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { title, year } = req.body;
    console.log("get-poster: request for", title, year);

    if (!title || typeof title !== 'string') {
        return res.status(400).json({ error: "Title is required" });
    }

    const tmdbApiKey = process.env.TMDB_API_KEY;
    if (!tmdbApiKey) {
        console.error("get-poster: TMDB_API_KEY not found in env");
        return res.status(500).json({ error: "TMDB API key not found in environment variables" });
    }

    try {
        // Search with year first
        let data = await tmdbSearch(title, year, tmdbApiKey);
        console.log("get-poster: TMDB returned", data.results?.length, "results");

        // If no results with year filter, retry without year
        if ((!data.results || data.results.length === 0) && year) {
            console.log("get-poster: retrying without year filter");
            data = await tmdbSearch(title, null, tmdbApiKey);
            console.log("get-poster: fallback returned", data.results?.length, "results");
        }

        if (!data.results || data.results.length === 0) {
            console.log("get-poster: no results found for", title);
            return res.status(200).json({ posterUrl: null });
        }

        // Find the film that matches the year (allow +/-1 year tolerance)
        let matchedFilm = null;
        if (year) {
            for (const result of data.results) {
                const releaseYear = result.release_date ? parseInt(result.release_date.substring(0, 4)) : null;
                if (releaseYear && Math.abs(releaseYear - year) <= 1) {
                    matchedFilm = result;
                    break;
                }
            }
        }

        // Fallback to first result
        if (!matchedFilm) {
            matchedFilm = data.results[0];
        }

        if (!matchedFilm.poster_path) {
            console.log("get-poster: no poster_path for", title);
            return res.status(200).json({ posterUrl: null });
        }

        const posterUrl = `${TMDB_IMAGE_BASE_URL}${matchedFilm.poster_path}`;
        console.log("get-poster: success", posterUrl);
        return res.status(200).json({ posterUrl });

    } catch (error) {
        console.error("get-poster: error", error.message);
        return res.status(200).json({ posterUrl: null });
    }
}
