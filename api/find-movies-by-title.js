import https from 'https';
import { URL } from 'url';

export default async function handler(req, res) {

    if (req.method !== "POST") {
        return res.status(405).json({error: "Method not allowed"})
    }
    const { movieTitles } = req.body;

    if (!movieTitles || !Array.isArray(movieTitles) || movieTitles.length === 0) {
        return res.status(400).json({ error: "Movie titles array is required" });
    }

    // Use native https module for Supabase REST API calls
    return new Promise((resolve) => {
        try {
            console.log("Searching for movies by title:", movieTitles);
            
            const supabaseUrl = process.env.SUPABASE_URL || "https://widegmaevygsmytsotgd.supabase.co";
            const supabaseKey = process.env.SUPABASE_API_KEY || process.env.VITE_SUPABASE_API_KEY;
            
            if (!supabaseKey) {
                return resolve(res.status(500).json({ 
                    error: "Supabase API key not found in environment variables" 
                }));
            }

            // Query all films and filter in memory
            // This is acceptable if the dataset is ~4000 films
            const url = new URL(`${supabaseUrl}/rest/v1/films`);
            url.searchParams.append('select', 'id,metadata');
            url.searchParams.append('limit', '5000'); // Get all films

            const options = {
                hostname: url.hostname,
                port: url.port || 443,
                path: url.pathname + url.search,
                method: 'GET',
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Accept': 'application/json',
                    'Connection': 'close'
                },
                timeout: 10000
            };

            const httpsReq = https.request(options, (httpsRes) => {
                console.log("HTTPS response status:", httpsRes.statusCode);

                let responseData = '';

                const bodyTimeout = setTimeout(() => {
                    console.error("Response body read timeout");
                    httpsRes.destroy();
                    return resolve(res.status(504).json({ 
                        error: "Response timeout" 
                    }));
                }, 10000);

                httpsRes.on('data', (chunk) => {
                    responseData += chunk.toString();
                });

                httpsRes.on('end', () => {
                    clearTimeout(bodyTimeout);

                    if (httpsRes.statusCode !== 200) {
                        console.error("Supabase Error Response:", responseData);
                        return resolve(res.status(httpsRes.statusCode || 500).json({ 
                            error: "Database query failed", 
                            details: responseData 
                        }));
                    }

                    try {
                        const data = JSON.parse(responseData);
                        // Filter films by matching titles (case-insensitive, partial match)
                        const movieIds = data
                            .filter(film => {
                                const filmTitle = film.metadata?.title?.toLowerCase() || '';
                                return movieTitles.some(searchTitle => 
                                    filmTitle.includes(searchTitle.toLowerCase()) ||
                                    searchTitle.toLowerCase().includes(filmTitle)
                                );
                            })
                            .map(film => film.id);
                        console.log("Found movie IDs:", movieIds);
                        return resolve(res.status(200).json({ movieIds }));
                    } catch (parseError) {
                        console.error("JSON parse error:", parseError);
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
                    error: "Request timeout" 
                }));
            });

            httpsReq.on('error', (error) => {
                console.error("Request error:", error);
                return resolve(res.status(500).json({ 
                    error: "Request error", 
                    message: error.message 
                }));
            });

            httpsReq.end();

        } catch (error) {
            console.error("Error in find-movies-by-title:", error);
            return resolve(res.status(500).json({ 
                error: "Server Error", 
                message: error.message 
            }));
        }
    });
}
