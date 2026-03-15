const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/original";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { title, year } = req.body;

    if (!title || typeof title !== 'string') {
        return res.status(400).json({ error: "Title is required" });
    }

    const tmdbApiKey = process.env.TMDB_API_KEY;
    if (!tmdbApiKey) {
        return res.status(500).json({ error: "TMDB API key not found in environment variables" });
    }

    try {
        // Search with year first for better results
        let searchUrl = `${TMDB_BASE_URL}/search/movie?api_key=${tmdbApiKey}&language=en-US&query=${encodeURIComponent(title)}`;
        if (year) {
            searchUrl += `&year=${year}`;
        }

        let response = await fetch(searchUrl);
        if (!response.ok) {
            return res.status(200).json({ posterUrl: null });
        }

        let data = await response.json();

        // If no results with year filter, retry without year
        if ((!data.results || data.results.length === 0) && year) {
            const fallbackUrl = `${TMDB_BASE_URL}/search/movie?api_key=${tmdbApiKey}&language=en-US&query=${encodeURIComponent(title)}`;
            response = await fetch(fallbackUrl);
            if (!response.ok) {
                return res.status(200).json({ posterUrl: null });
            }
            data = await response.json();
        }

        if (!data.results || data.results.length === 0) {
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
            return res.status(200).json({ posterUrl: null });
        }

        const posterUrl = `${TMDB_IMAGE_BASE_URL}${matchedFilm.poster_path}`;
        return res.status(200).json({ posterUrl });

    } catch (error) {
        return res.status(200).json({ posterUrl: null });
    }
}
