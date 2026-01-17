import https from 'https';
import { URL } from 'url';

export default async function handler(req, res) {

    if (req.method !== "POST") {
        return res.status(405).json({error: "Method not allowed"})
    }
    const { embedding, excludeIds } = req.body;

    if (!embedding) {
        return res.status(400).json({ error: "Input is required" });
    }
    
    // excludeIds should be an array of film IDs to exclude
    const excludeIdsArray = Array.isArray(excludeIds) ? excludeIds : [];

    // Use native https module instead of fetch to avoid Vercel serverless stream issues
    // Fetch API has known issues with response body streams in serverless environments
    return new Promise((resolve) => {
        try {
            console.log("Starting match_films RPC call with native https...");
            
            const supabaseUrl = process.env.SUPABASE_URL || "https://widegmaevygsmytsotgd.supabase.co";
            const supabaseKey = process.env.SUPABASE_API_KEY || process.env.VITE_SUPABASE_API_KEY;
            
            if (!supabaseKey) {
                return resolve(res.status(500).json({ 
                    error: "Supabase API key not found in environment variables" 
                }));
            }

            const url = new URL(`${supabaseUrl}/rest/v1/rpc/match_films`);
            const postData = JSON.stringify({
                query_embedding: embedding,
                match_threshold: 0.3,
                match_count: 4,
                exclude_ids: excludeIdsArray.length > 0 ? excludeIdsArray : null
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