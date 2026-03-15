import https from 'https';
import { URL } from 'url';

const MATCH_THRESHOLD = 0.3;
const MATCH_COUNT = 4;
const DEFAULT_COEFFICIENT_WEIGHT = 0.05;

/**
 * Helper function to make HTTPS requests
 */
function httpsRequest(url, options, postData) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(new Error(`Failed to parse response: ${e.message}`));
                    }
                } else {
                    reject(new Error(`Request failed with status ${res.statusCode}: ${data}`));
                }
            });
        });
        req.on('error', reject);
        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
        if (postData) {
            req.write(postData);
        }
        req.end();
    });
}

/**
 * Fetch collection IDs for given film IDs
 */
async function getCollectionIds(filmIds, supabaseUrl, supabaseKey) {
    if (!filmIds || filmIds.length === 0) {
        return [];
    }

    const baseUrl = new URL(`${supabaseUrl}/rest/v1/films`);
    const path = `/rest/v1/films?select=collection_id&id=in.(${filmIds.join(',')})`;

    const options = {
        hostname: baseUrl.hostname,
        port: 443,
        path: path,
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
        }
    };

    try {
        const data = await httpsRequest(baseUrl, options);
        const collectionIds = data
            .map(row => row.collection_id)
            .filter(id => id !== null);
        return [...new Set(collectionIds)];
    } catch (error) {
        return [];
    }
}

export default async function handler(req, res) {

    if (req.method !== "POST") {
        return res.status(405).json({error: "Method not allowed"})
    }
    const { embedding, excludeIds, preferences } = req.body;

    if (!embedding || !Array.isArray(embedding)) {
        return res.status(400).json({ error: "Embedding array is required" });
    }

    const excludeIdsArray = Array.isArray(excludeIds) ? excludeIds : [];

    const prefs = preferences || {};
    const prefEraNew = typeof prefs.eraNew === 'number' ? prefs.eraNew : 0.5;
    const prefEraClassic = typeof prefs.eraClassic === 'number' ? prefs.eraClassic : 0.5;
    const prefMoodFun = typeof prefs.moodFun === 'number' ? prefs.moodFun : 0.25;
    const prefMoodSerious = typeof prefs.moodSerious === 'number' ? prefs.moodSerious : 0.25;
    const prefMoodInspiring = typeof prefs.moodInspiring === 'number' ? prefs.moodInspiring : 0.25;
    const prefMoodScary = typeof prefs.moodScary === 'number' ? prefs.moodScary : 0.25;
    const coefficientWeight = typeof prefs.coefficientWeight === 'number' ? prefs.coefficientWeight : DEFAULT_COEFFICIENT_WEIGHT;

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_API_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({
            error: "Supabase configuration not found in environment variables"
        });
    }

    let excludeCollectionIds = [];
    if (excludeIdsArray.length > 0) {
        try {
            excludeCollectionIds = await getCollectionIds(excludeIdsArray, supabaseUrl, supabaseKey);
        } catch (error) {
            // Continue without collection exclusion if this fails
        }
    }

    return new Promise((resolve) => {
        try {
            const url = new URL(`${supabaseUrl}/rest/v1/rpc/match_films_v2`);
            const postData = JSON.stringify({
                query_embedding: embedding,
                match_threshold: MATCH_THRESHOLD,
                match_count: MATCH_COUNT,
                exclude_ids: excludeIdsArray.length > 0 ? excludeIdsArray : null,
                exclude_collection_ids: excludeCollectionIds.length > 0 ? excludeCollectionIds : null,
                pref_era_new: prefEraNew,
                pref_era_classic: prefEraClassic,
                pref_mood_fun: prefMoodFun,
                pref_mood_serious: prefMoodSerious,
                pref_mood_inspiring: prefMoodInspiring,
                pref_mood_scary: prefMoodScary,
                coefficient_weight: coefficientWeight
            });

            const options = {
                hostname: url.hostname,
                port: url.port || 443,
                path: url.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData),
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Prefer': 'return=representation',
                    'Connection': 'close'
                },
                timeout: 20000
            };

            const httpsReq = https.request(options, (httpsRes) => {
                let responseData = '';

                const bodyTimeout = setTimeout(() => {
                    httpsRes.destroy();
                    return resolve(res.status(504).json({
                        error: "Response timeout",
                        message: "Reading response body took too long"
                    }));
                }, 15000);

                httpsRes.on('data', (chunk) => {
                    responseData += chunk.toString();
                });

                httpsRes.on('end', () => {
                    clearTimeout(bodyTimeout);

                    if (httpsRes.statusCode !== 200) {
                        return resolve(res.status(httpsRes.statusCode || 500).json({
                            error: "Database query failed"
                        }));
                    }

                    try {
                        const data = JSON.parse(responseData);
                        return resolve(res.status(200).json(data));
                    } catch (parseError) {
                        return resolve(res.status(500).json({
                            error: "Failed to parse response",
                            message: parseError.message
                        }));
                    }
                });

                httpsRes.on('error', (error) => {
                    clearTimeout(bodyTimeout);
                    return resolve(res.status(500).json({
                        error: "Response stream error",
                        message: error.message
                    }));
                });
            });

            httpsReq.on('timeout', () => {
                httpsReq.destroy();
                return resolve(res.status(504).json({
                    error: "Request timeout",
                    message: "The database query took too long"
                }));
            });

            httpsReq.on('error', (error) => {
                return resolve(res.status(500).json({
                    error: "Request error",
                    message: error.message
                }));
            });

            httpsReq.write(postData);
            httpsReq.end();

        } catch (error) {
            return resolve(res.status(500).json({
                error: "Server Error while finding nearest",
                message: error.message
            }));
        }
    });
}
