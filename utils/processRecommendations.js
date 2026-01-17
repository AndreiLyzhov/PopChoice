import { inputFormat } from './formatInput.js';
import { 
    extractMovieNames, 
    findMoviesByTitle, 
    createEmbedding, 
    findNearestMatch, 
    getExplanation 
} from './api.js';
import { theMovieDb } from '../themoviedb.js';

/*
 * Processes form data and generates movie recommendations
 * @param {Array} formData - Array of form data entries from all users
 * @returns {Promise<Object>} - Object containing match, responses, and posterUrls
 */
export async function processRecommendations(formData) {
    try {

        const formattedInput = inputFormat(formData)
        console.log("Formatted input for embedding:", formattedInput)

        // Extract movie names from user input to exclude them from recommendations
        const movieTitles = await extractMovieNames(formattedInput)
        console.log("Extracted movie titles:", movieTitles)
        
        // Find movie IDs in database to exclude
        let excludeIds = []
        if (movieTitles && movieTitles.length > 0) {
            const foundIds = await findMoviesByTitle(movieTitles)
            excludeIds = foundIds || []
            console.log("Movie IDs to exclude:", excludeIds)
        }

        const embedding = await createEmbedding(formattedInput)
        console.log("Embedding: ", embedding)

        const match = await findNearestMatch(embedding, excludeIds) 
        console.log("Match: ", match)

        const responses = await Promise.all(
            match.map(
                async (item) =>
                    await getExplanation(item.content, formattedInput)
            )
        );

        console.log("Explanation: ", responses)

        const posterUrls = await Promise.all(
            match.map(async (item, index) => {
                const movieTitle = item.metadata.title;
                console.log("movieTitle", movieTitle)
                return await getPoster(movieTitle);
            })
        );

        return { match, responses, posterUrls };

    } catch(e) {
        console.log("Error in processRecommendations:", e)
        throw e;
    }
}

/**
 * Fetches movie poster URL from TMDB
 * @param {string} title - Movie title
 * @returns {Promise<string>} - Poster URL
 */
export async function getPoster(title) {
    try {
        function getFilmId(title) {
            return new Promise((resolve, reject) => {
                theMovieDb.search.getMovie(
                    { query: title },
                    (response) => resolve(response),
                    (error) =>
                        reject(
                            error || new Error("Unknown TMDB error when getting id")
                        )
                );
            });
        }

        function getPosterById(id) {
            return new Promise((resolve, reject) => {
                theMovieDb.movies.getImages(
                    {
                        id: id,
                        language: "en-US",
                        include_image_language: "en,null",
                    },
                    (response) => resolve(response),
                    (error) => reject(error || new Error("Unknown TMDB error when getting poster"))
                );
            });
        }

        let response = await getFilmId(title)
        let data = JSON.parse(response)
        const filmId = data.results[0].id

        response = await getPosterById(filmId)
        data = JSON.parse(response)
        
        console.log(data, " - after getting Poster")
        const posterUrl = data.posters[0].file_path
        
        return theMovieDb.common.images_uri + "original" + posterUrl 

    } catch(e) {
        console.log(e)
        throw e;
    }
}
