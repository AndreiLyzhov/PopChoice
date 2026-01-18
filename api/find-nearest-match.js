import https from 'https';
import { URL } from 'url';

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
        console.log("getCollectionIds: No film IDs provided");
        return [];
    }

    console.log("getCollectionIds: Fetching for film IDs:", filmIds);

    const baseUrl = new URL(`${supabaseUrl}/rest/v1/films`);
    // Build path manually to avoid URL encoding issues with PostgREST syntax
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

    console.log("getCollectionIds: Request path:", path);

    try {
        const data = await httpsRequest(baseUrl, options);
        console.log("getCollectionIds: Raw response:", JSON.stringify(data));
        // Extract unique non-null collection IDs
        const collectionIds = data
            .map(row => row.collection_id)
            .filter(id => id !== null);
        console.log("getCollectionIds: Found collection IDs:", collectionIds);
        return [...new Set(collectionIds)];
    } catch (error) {
        console.error('Error fetching collection IDs:', error.message);
        return [];
    }
}

export default async function handler(req, res) {

    if (req.method !== "POST") {
        return res.status(405).json({error: "Method not allowed"})
    }
    const { embedding, excludeIds, preferences } = req.body;

    if (!embedding) {
        return res.status(400).json({ error: "Input is required" });
    }

    // excludeIds should be an array of film IDs to exclude
    const excludeIdsArray = Array.isArray(excludeIds) ? excludeIds : [];

    // Extract preference coefficients with defaults
    const prefs = preferences || {};
    const prefEraNew = typeof prefs.eraNew === 'number' ? prefs.eraNew : 0.5;
    const prefEraClassic = typeof prefs.eraClassic === 'number' ? prefs.eraClassic : 0.5;
    const prefMoodFun = typeof prefs.moodFun === 'number' ? prefs.moodFun : 0.25;
    const prefMoodSerious = typeof prefs.moodSerious === 'number' ? prefs.moodSerious : 0.25;
    const prefMoodInspiring = typeof prefs.moodInspiring === 'number' ? prefs.moodInspiring : 0.25;
    const prefMoodScary = typeof prefs.moodScary === 'number' ? prefs.moodScary : 0.25;
    const coefficientWeight = typeof prefs.coefficientWeight === 'number' ? prefs.coefficientWeight : 0.05;

    const supabaseUrl = process.env.SUPABASE_URL || "https://widegmaevygsmytsotgd.supabase.co";
    const supabaseKey = process.env.SUPABASE_API_KEY || process.env.VITE_SUPABASE_API_KEY;

    if (!supabaseKey) {
        return res.status(500).json({
            error: "Supabase API key not found in environment variables"
        });
    }

    // Fetch collection IDs for excluded films to also exclude other films in the same series
    let excludeCollectionIds = [];
    console.log("excludeIdsArray:", excludeIdsArray);
    if (excludeIdsArray.length > 0) {
        try {
            excludeCollectionIds = await getCollectionIds(excludeIdsArray, supabaseUrl, supabaseKey);
            console.log("Exclude collection IDs:", excludeCollectionIds);
        } catch (error) {
            console.error("Error fetching collection IDs:", error.message);
            // Continue without collection exclusion if this fails
        }
    } else {
        console.log("No excludeIds provided, skipping collection lookup");
    }

    // Use native https module instead of fetch to avoid Vercel serverless stream issues
    // Fetch API has known issues with response body streams in serverless environments
    return new Promise((resolve) => {
        try {
            console.log("Starting match_films_v2 RPC call with native https...");
            console.log("Preferences:", { prefEraNew, prefEraClassic, prefMoodFun, prefMoodSerious, prefMoodInspiring, prefMoodScary });
            console.log("RPC params - exclude_ids:", excludeIdsArray.length > 0 ? excludeIdsArray : null);
            console.log("RPC params - exclude_collection_ids:", excludeCollectionIds.length > 0 ? excludeCollectionIds : null);

            const url = new URL(`${supabaseUrl}/rest/v1/rpc/match_films_v2`);
            const postData = JSON.stringify({
                query_embedding: embedding,
                match_threshold: 0.3,
                match_count: 4,
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
                timeout: 20000 // 20 second timeout
            };

            const httpsReq = https.request(options, (httpsRes) => {
                console.log("HTTPS response status:", httpsRes.statusCode);

                let responseData = '';

                // Set timeout for reading response body
                const bodyTimeout = setTimeout(() => {
                    console.error("Response body read timeout");
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
                    console.log("Response body received, length:", responseData.length);

                    if (httpsRes.statusCode !== 200) {
                        console.error("Supabase RPC Error Response:", responseData);
                        return resolve(res.status(httpsRes.statusCode || 500).json({ 
                            error: "Database query failed", 
                            details: responseData 
                        }));
                    }

                    try {
                        const data = JSON.parse(responseData);
                        console.log("Successfully parsed JSON response, items:", Array.isArray(data) ? data.length : 'not array');
                        return resolve(res.status(200).json(data));
                    } catch (parseError) {
                        console.error("JSON parse error:", parseError);
                        console.error("Response preview:", responseData.substring(0, 500));
                        return resolve(res.status(500).json({ 
                            error: "Failed to parse response", 
                            message: parseError.message 
                        }));
                    }
                });

                httpsRes.on('error', (error) => {
                    clearTimeout(bodyTimeout);
                    console.error("Response stream error:", error);
                    return resolve(res.status(500).json({ 
                        error: "Response stream error", 
                        message: error.message 
                    }));
                });
            });

            httpsReq.on('timeout', () => {
                console.error("Request timeout");
                httpsReq.destroy();
                return resolve(res.status(504).json({ 
                    error: "Request timeout", 
                    message: "The database query took too long" 
                }));
            });

            httpsReq.on('error', (error) => {
                console.error("Request error:", error);
                return resolve(res.status(500).json({ 
                    error: "Request error", 
                    message: error.message 
                }));
            });

            httpsReq.write(postData);
            httpsReq.end();

        } catch (error) {
            console.error("Error in find-nearest-match:", error);
            return resolve(res.status(500).json({ 
                error: "Server Error while finding nearest", 
                message: error.message 
            }));
        }
    });
   




    /*
    // Supabase simple test
    try {
        console.log("Пробую простую выборку вместо RPC...");
        const { data, error } = await supabase.from('films').select('id').limit(1);
        
        if (error) {
            console.log("Ошибка таблицы:", error.message);
        } else {
            console.log("Связь с таблицей есть! ID первой записи:", data[0]?.id);
            res.status(200).json({data})
        }
    } catch (e) {
        console.log("Ошибка запроса:", e.message);
    }
    */


    /*
    // Попытка заменить на raw fetch
    console.log("Запускаю RAW Fetch...");

    const rawResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/match_films`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_API_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_API_KEY}`
      },
      body: JSON.stringify({
        query_embedding: embedding, // твой массив векторов
        match_threshold: 0.50,
        match_count: 4
      })
    });

    console.log("Статус ответа:", rawResponse.status);

    if (!rawResponse.ok) {
        const text = await rawResponse.text();
        console.log("Ошибка Fetch:", text);
        throw new Error(text);
    }

    const size = rawResponse.headers.get('content-length');
    console.log("Размер ответа (байт):", size);

    // Попробуем прочитать текст, а не JSON сразу, чтобы не зависнуть на парсинге
    const resultText = await rawResponse.text(); 
    console.log("Длина ответа (символов):", resultText.length);
    // console.log("Ответ:", resultText); // Раскомментируй, если длина небольшая

    const data = JSON.parse(resultText);
    console.log("Успешно распарсили JSON!");
    */


    /*
    //Ping DB test
    console.log("Тестируем соединение с БД...");

    try {
        const { data, error } = await supabase.rpc('ping_db'); // Вызываем нашу пустышку

        if (error) {
            console.error("Ошибка RPC:", error);
        } else {
            console.log("УСПЕХ! Ответ от базы:", data);
        }
        
        // Обязательно ответь браузеру, чтобы он не висел
        return res.status(200).json({ test_result: data });

    } catch (e) {
        console.error("Критическая ошибка:", e);
        return res.status(500).json({ error: e.message });
    }
    */






  }