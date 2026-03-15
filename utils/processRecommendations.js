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
    // Step 1: Extract favourite movie titles from form data
    const favouriteMovies = extractFavouriteMovies(formData);

    // Step 2: Fetch descriptions for favourite movies from our database
    const movieDescriptions = {};
    if (favouriteMovies.length > 0) {
        const descriptionPromises = favouriteMovies.map(async (title) => {
            const description = await getMovieDescription(title);
            if (description) {
                movieDescriptions[title] = description;
            }
        });
        await Promise.all(descriptionPromises);
    }

    // Step 3: Find movie IDs to exclude BEFORE formatting (uses favouriteMovies directly)
    let excludeIds = [];
    if (favouriteMovies.length > 0) {
        const foundIds = await findMoviesByTitle(favouriteMovies);
        excludeIds = foundIds || [];
    }

    // Step 4: Format input with descriptions, extract preferences
    const { text: formattedInput, preferences } = inputFormat(formData, movieDescriptions);

    // Step 5: Create embedding from enriched text
    const embedding = await createEmbedding(formattedInput);

    // Step 6: Find matches WITH preference coefficients
    const match = await findNearestMatch(embedding, excludeIds, preferences);

    // Step 7: Generate explanations & fetch posters
    const responses = await Promise.all(
        match.map(
            async (item) =>
                await getExplanation(item.content, formattedInput)
        )
    );

    const posterUrls = await Promise.all(
        match.map(async (item) => {
            return await getPoster(item.metadata.title, item.metadata.year);
        })
    );

    return { match, responses, posterUrls };
}
