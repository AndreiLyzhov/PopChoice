const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/original";

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
        // Search with year first for better results
        let searchUrl = `${TMDB_BASE_URL}/search/movie?api_key=${tmdbApiKey}&language=en-US&query=${encodeURIComponent(title)}`;
        if (year) {
            searchUrl += `&year=${year}`;
        }

        console.log("get-poster: fetching TMDB search");
        let response = await fetch(searchUrl);
        if (!response.ok) {
            console.error("get-poster: TMDB search failed with status", response.status);
            return res.status(200).json({ posterUrl: null });
        }

        let data = await response.json();
        console.log("get-poster: TMDB returned", data.results?.length, "results");

        // If no results with year filter, retry without year
        if ((!data.results || data.results.length === 0) && year) {
            console.log("get-poster: retrying without year filter");
            const fallbackUrl = `${TMDB_BASE_URL}/search/movie?api_key=${tmdbApiKey}&language=en-US&query=${encodeURIComponent(title)}`;
            response = await fetch(fallbackUrl);
            if (!response.ok) {
                return res.status(200).json({ posterUrl: null });
            }
            data = await response.json();
            console.log("get-poster: fallback returned", data.results?.length, "results");
        }

        if (!data.results || data.results.length === 0) {
            console.log("get-poster: no results found for", title);
            return res.status(200).json({ posterUrl: null });
        }

        // Find the film that matches the year (allow +/-1 year tolerance for regional differences)
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
