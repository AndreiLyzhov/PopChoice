/**
 * API utility functions for making requests to backend endpoints
 */

export async function createEmbedding(input) {
    const response = await fetch('/api/create-embedding', {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({input})
    })

    if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Server Error');
    }

    const data = await response.json()
    return data.embedding
}

export async function extractMovieNames(input) {
    const response = await fetch('/api/extract-movie-names', {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({input})
    })

    if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Server Error');
    }

    const data = await response.json()
    return data.movieTitles || []
}

export async function findMoviesByTitle(movieTitles) {
    const response = await fetch('/api/find-movies-by-title', {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({movieTitles})
    })

    if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Server Error');
    }

    const data = await response.json()
    return data.movieIds || []
}

export async function findNearestMatch(embedding, excludeIds = [], preferences = null) {
    const response = await fetch('/api/find-nearest-match', {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embedding, excludeIds, preferences })
    })

    if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Server Error');
    }

    const data = await response.json()
    return data
}

export async function getMovieDescription(title) {
    try {
        const response = await fetch('/api/get-movie-description', {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title })
        })

        if (!response.ok) {
            return null;
        }

        const data = await response.json()
        return data.description || null
    } catch (error) {
        return null;
    }
}

export async function getExplanation(context, input) {
    const response = await fetch('/api/get-explanation', {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({context, input})
    })

    if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Server Error');
    }

    const { explanation } = await response.json()
    return explanation
}

export async function getPoster(title, year) {
    try {
        const response = await fetch('/api/get-poster', {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, year })
        })

        if (!response.ok) {
            return null;
        }

        const data = await response.json()
        return data.posterUrl || null
    } catch (error) {
        return null;
    }
}
