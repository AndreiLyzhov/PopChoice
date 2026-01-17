/**
 * Formats form data into natural language preference description
 * @param {Array} formData - Array of form data entries
 * @returns {string} - Formatted natural language string
 */
export function inputFormat(formData) {
    let answers = {}
    let questions = formData.map(userInput => Array.from(userInput))[0].map(entry => entry[0])

    const usersObjects = formData.map(userInput => {
        return Object.fromEntries(Array.from(userInput).filter(entry => entry[1]))
    })

    questions.map(question => {
        answers[question] = usersObjects.map((user) => user[question] ? user[question] : "")
            .filter(answer => answer).join(". ")
    })

    // Convert Q&A format to natural language preference description
    // This format better matches the semantic structure of film descriptions
    // Remove structured Q&A format and create natural narrative text
    const naturalPreferences = Object.entries(answers)
        .filter(([_, answer]) => answer && answer.trim())
        .map(([question, answer]) => {
            // Convert question format to natural context
            const cleanQuestion = question
                .replace(/-/g, ' ')
                .replace(/\?/g, '')
                .toLowerCase();
            
            // Create natural preference statements based on question type
            if (cleanQuestion.includes('favourite movie')) {
                return `User's favourite movie is ${answer}`;
            } else if (cleanQuestion.includes('new or classic')) {
                return `User prefers ${answer.toLowerCase()} movies`;
            } else if (cleanQuestion.includes('mood for')) {
                return `User is in the mood for ${answer.toLowerCase()} movies`;
            } else if (cleanQuestion.includes('famous film person')) {
                return `User likes movies with ${answer}`;
            } else {
                // Generic fallback: create natural sentence
                return `User prefers ${answer}`;
            }
        })
        .filter(statement => statement.trim());

    // Join into a cohesive narrative description
    // This reads like natural text, similar to film descriptions
    return naturalPreferences.join('. ');
}
