/**
 * API utility functions for making requests to backend endpoints
 */

export async function createEmbedding(input) {
    try {
        const response = await fetch('/api/create-embedding', {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({input})
        })

        if (!response.ok){
            const errorData = await response.json()
            throw new Error(errorData.error || 'Server Error');
        }

        const data = await response.json()
        return data.embedding

    } catch(error) {
        console.error("Error while getting embedding:", error.message);
        throw error;
    }
}

export async function extractMovieNames(input) {
    try {
        console.log(input)
        const response = await fetch('/api/extract-movie-names', {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({input})
        })

        if (!response.ok){
            const errorData = await response.json()
            throw new Error(errorData.error || 'Server Error');
        }

        const data = await response.json()
        return data.movieTitles || []

    } catch(error) {
        console.error("Error while extracting movie names:", error.message);
        throw error;
    }
}

export async function findMoviesByTitle(movieTitles) {
    try {
        const response = await fetch('/api/find-movies-by-title', {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({movieTitles})
        })

        if (!response.ok){
            const errorData = await response.json()
            throw new Error(errorData.error || 'Server Error');
        }

        const data = await response.json()
        return data.movieIds || []

    } catch(error) {
        console.error("Error while finding movies by title:", error.message);
        throw error;
    }
}

export async function findNearestMatch(embedding, excludeIds = [], preferences = null) {
    try {
        const response = await fetch('/api/find-nearest-match', {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ embedding, excludeIds, preferences })
        })

        if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Server Error');
        }

        const data = await response.json()
        return data

    } catch (error) {
        console.error("Error while finding nearest:", error.message);
        throw error;
    }
}

export async function getMovieDescription(title) {
    try {
        const response = await fetch('/api/get-movie-description', {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title })
        })

        if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Server Error');
        }

        const data = await response.json()
        return data.description || null

    } catch (error) {
        console.error("Error while getting movie description:", error.message);
        return null;
    }
}

export async function getExplanation(context, input){
    try {
        const response = await fetch('/api/get-explanation', {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({context, input})
        })

        if (!response.ok){
            const errorData = await response.json()
            throw new Error(errorData.error || 'Server Error');
        }

        const { explanation } = await response.json()
        return explanation

    } catch(error) {
        console.error("Error while getting explanation:", error.message);
        throw error;
    }
}
