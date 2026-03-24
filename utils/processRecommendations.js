import { inputFormat, extractFavouriteMovies } from './formatInput.js';
import {
    findMoviesByTitle,
    createEmbedding,
    findNearestMatch,
    getExplanation,
    getMovieDescription,
    getPoster
} from './api.js';

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

        // Step 3: Find movie IDs to exclude BEFORE formatting (uses favouriteMovies directly)
        let excludeIds = [];
        if (favouriteMovies.length > 0) {
            console.log("Finding movie IDs to exclude for:", favouriteMovies);
            const foundIds = await findMoviesByTitle(favouriteMovies);
            excludeIds = foundIds || [];
            console.log("Movie IDs to exclude:", excludeIds);
        }

        // Step 4: Format input with descriptions, extract preferences
        const { text: formattedInput, preferences } = inputFormat(formData, movieDescriptions);
        console.log("Formatted input for embedding:", formattedInput);
        console.log("Extracted preferences:", preferences);

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
                const movieYear = item.metadata.year;
                console.log("Fetching poster for:", movieTitle, movieYear);
                return await getPoster(movieTitle, movieYear);
            })
        );

        return { match, responses, posterUrls };

    } catch (e) {
        console.log("Error in processRecommendations:", e);
        throw e;
    }
}
