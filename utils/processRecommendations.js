import { inputFormat, extractFavouriteMovies } from './formatInput.js';
import {
    extractMovieNames,
    findMoviesByTitle,
    createEmbedding,
    findNearestMatch,
    getExplanation,
    getMovieDescription
} from './api.js';
import { theMovieDb } from '../themoviedb.js';

/*
 * Processes form data and generates movie recommendations
 * Enhanced with coefficient-based matching:
 * 1. Extract favourite movie titles from form data
 * 2. Fetch descriptions for those movies from our database
 * 3. Format input with enriched descriptions, extract preferences
 * 4. Create embedding (enriched text, without mood/era text)
 * 5. Find matches with preference coefficients
 * 6. Generate explanations & fetch posters
 *
 * @param {Array} formData - Array of form data entries from all users
 * @returns {Promise<Object>} - Object containing match, responses, and posterUrls
 */
export async function processRecommendations(formData) {
    try {
        // Step 1: Extract favourite movie titles from form data
        const favouriteMovies = extractFavouriteMovies(formData);
        console.log("Favourite movies from form:", favouriteMovies);

        // Step 2: Fetch descriptions for favourite movies from our database
        const movieDescriptions = {};
        if (favouriteMovies.length > 0) {
            console.log("Fetching movie descriptions from database...");
            const descriptionPromises = favouriteMovies.map(async (title) => {
                const description = await getMovieDescription(title);
                if (description) {
                    movieDescriptions[title] = description;
                    console.log(`Found description for "${title}"`);
                } else {
                    console.log(`No description found for "${title}"`);
                }
            });
            await Promise.all(descriptionPromises);
        }

        // Step 3: Format input with descriptions, extract preferences
        const { text: formattedInput, preferences } = inputFormat(formData, movieDescriptions);
        console.log("Formatted input for embedding:", formattedInput);
        console.log("Extracted preferences:", preferences);

        // Step 4: Extract movie names to exclude from recommendations
        const movieTitles = await extractMovieNames(formattedInput);
        console.log("Extracted movie titles to exclude:", movieTitles);

        // Find movie IDs in database to exclude
        let excludeIds = [];
        if (movieTitles && movieTitles.length > 0) {
            const foundIds = await findMoviesByTitle(movieTitles);
            excludeIds = foundIds || [];
            console.log("Movie IDs to exclude:", excludeIds);
        }

        // Step 5: Create embedding from enriched text
        const embedding = await createEmbedding(formattedInput);
        console.log("Embedding created");

        // Step 6: Find matches WITH preference coefficients
        const match = await findNearestMatch(embedding, excludeIds, preferences);
        console.log("Match results:", match);

        // Step 7: Generate explanations & fetch posters
        const responses = await Promise.all(
            match.map(
                async (item) =>
                    await getExplanation(item.content, formattedInput)
            )
        );

        console.log("Explanations generated");

        const posterUrls = await Promise.all(
            match.map(async (item, index) => {
                const movieTitle = item.metadata.title;
                console.log("Fetching poster for:", movieTitle);
                return await getPoster(movieTitle);
            })
        );

        return { match, responses, posterUrls };

    } catch (e) {
        console.log("Error in processRecommendations:", e);
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
