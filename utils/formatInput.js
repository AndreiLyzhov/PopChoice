/**
 * Formats form data into natural language preference description
 * Enhanced version that:
 * - Excludes mood/era preferences (handled by coefficients)
 * - Enriches favourite movie with description if available
 *
 * @param {Array} formData - Array of form data entries
 * @param {Object} movieDescriptions - Map of movie titles to descriptions
 * @returns {Object} - { text: string, preferences: object }
 */
export function inputFormat(formData, movieDescriptions = {}) {
    let answers = {}
    let questions = formData.map(userInput => Array.from(userInput))[0].map(entry => entry[0])

    const usersObjects = formData.map(userInput => {
        return Object.fromEntries(Array.from(userInput).filter(entry => entry[1]))
    })

    questions.map(question => {
        answers[question] = usersObjects.map((user) => user[question] ? user[question] : "")
            .filter(answer => answer).join(". ")
    })

    // Extract preferences (mood/era) before filtering them out
    const preferences = extractPreferences(formData);

    // Convert Q&A format to natural language preference description
    // EXCLUDE mood and era questions - these are handled by coefficients now
    const naturalPreferences = Object.entries(answers)
        .filter(([_, answer]) => answer && answer.trim())
        .map(([question, answer]) => {
            // Convert question format to natural context
            const cleanQuestion = question
                .replace(/-/g, ' ')
                .replace(/\?/g, '')
                .toLowerCase();

            // SKIP mood and era questions - handled by coefficients
            if (cleanQuestion.includes('new or classic') || cleanQuestion.includes('mood for')) {
                return null;
            }

            // Create natural preference statements based on question type
            if (cleanQuestion.includes('favourite movie')) {
                // Check if we have a description for this movie
                const movieTitle = answer.trim();
                const description = movieDescriptions[movieTitle] || movieDescriptions[movieTitle.toLowerCase()];

                if (description) {
                    // Use the actual film description for semantic matching
                    return `User loves films like: ${description}`;
                } else {
                    // Fallback to just the title
                    return `User's favourite movie is ${answer}`;
                }
            } else if (cleanQuestion.includes('famous film person')) {
                return `User likes movies with ${answer}`;
            } else {
                // Generic fallback: create natural sentence
                return `User prefers ${answer}`;
            }
        })
        .filter(statement => statement !== null && statement.trim());

    // Join into a cohesive narrative description
    const text = naturalPreferences.join('. ');

    return { text, preferences };
}

/**
 * Extracts and normalizes user preference coefficients from form data
 * Aggregates votes from all users and returns normalized coefficients
 *
 * @param {Array} formData - Array of form data entries from all users
 * @returns {Object} - Normalized preference coefficients (0-1 scale)
 */
export function extractPreferences(formData) {
    // Default preferences
    const preferences = {
        eraNew: 0.5,
        eraClassic: 0.5,
        moodFun: 0.25,
        moodSerious: 0.25,
        moodInspiring: 0.25,
        moodScary: 0.25
    };

    if (!formData || formData.length === 0) {
        return preferences;
    }

    // Collect all answers from all users
    const eraVotes = { new: 0, classic: 0 };
    const moodVotes = { fun: 0, serious: 0, inspiring: 0, scary: 0 };

    for (const userInput of formData) {
        const userObject = Object.fromEntries(Array.from(userInput).filter(entry => entry[1]));

        // Process each field
        for (const [question, answer] of Object.entries(userObject)) {
            const cleanQuestion = question.replace(/-/g, ' ').toLowerCase();
            const cleanAnswer = (answer || '').toLowerCase().trim();

            // Era preference
            if (cleanQuestion.includes('new or classic')) {
                if (cleanAnswer.includes('new') || cleanAnswer.includes('recent')) {
                    eraVotes.new++;
                } else if (cleanAnswer.includes('classic') || cleanAnswer.includes('old')) {
                    eraVotes.classic++;
                }
            }

            // Mood preference
            if (cleanQuestion.includes('mood for') || cleanQuestion.includes('mood')) {
                if (cleanAnswer.includes('fun') || cleanAnswer.includes('comedy') || cleanAnswer.includes('laugh')) {
                    moodVotes.fun++;
                }
                if (cleanAnswer.includes('serious') || cleanAnswer.includes('drama') || cleanAnswer.includes('deep')) {
                    moodVotes.serious++;
                }
                if (cleanAnswer.includes('inspir') || cleanAnswer.includes('uplift') || cleanAnswer.includes('motivat')) {
                    moodVotes.inspiring++;
                }
                if (cleanAnswer.includes('scary') || cleanAnswer.includes('horror') || cleanAnswer.includes('thrill') || cleanAnswer.includes('frighten')) {
                    moodVotes.scary++;
                }
            }
        }
    }

    // Calculate era preferences
    const totalEraVotes = eraVotes.new + eraVotes.classic;
    if (totalEraVotes > 0) {
        // Normalize to 0-1 scale, with stronger preference getting higher score
        preferences.eraNew = eraVotes.new / totalEraVotes;
        preferences.eraClassic = eraVotes.classic / totalEraVotes;
    }

    // Calculate mood preferences
    const totalMoodVotes = moodVotes.fun + moodVotes.serious + moodVotes.inspiring + moodVotes.scary;
    if (totalMoodVotes > 0) {
        // Normalize to 0-1 scale
        preferences.moodFun = moodVotes.fun / totalMoodVotes;
        preferences.moodSerious = moodVotes.serious / totalMoodVotes;
        preferences.moodInspiring = moodVotes.inspiring / totalMoodVotes;
        preferences.moodScary = moodVotes.scary / totalMoodVotes;
    }

    return preferences;
}

/**
 * Extracts favourite movie titles from form data
 *
 * @param {Array} formData - Array of form data entries
 * @returns {Array<string>} - Array of movie titles
 */
export function extractFavouriteMovies(formData) {
    const movies = [];

    if (!formData || formData.length === 0) {
        return movies;
    }

    for (const userInput of formData) {
        const userObject = Object.fromEntries(Array.from(userInput).filter(entry => entry[1]));

        for (const [question, answer] of Object.entries(userObject)) {
            const cleanQuestion = question.replace(/-/g, ' ').toLowerCase();

            if (cleanQuestion.includes('favourite movie') && answer && answer.trim()) {
                movies.push(answer.trim());
            }
        }
    }

    return movies;
}
