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

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_API_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({
            error: "Supabase configuration not found in environment variables"
        });
    }

    return new Promise((resolve) => {
        try {
            const url = new URL(`${supabaseUrl}/rest/v1/films`);
            url.searchParams.append('select', 'id,metadata');
            url.searchParams.append('limit', '5000');

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
                let responseData = '';

                const bodyTimeout = setTimeout(() => {
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
                        return resolve(res.status(httpsRes.statusCode || 500).json({
                            error: "Database query failed"
                        }));
                    }

                    try {
                        const data = JSON.parse(responseData);
                        const movieIds = data
                            .filter(film => {
                                const filmTitle = film.metadata?.title?.toLowerCase() || '';
                                return movieTitles.some(searchTitle =>
                                    filmTitle.includes(searchTitle.toLowerCase()) ||
                                    searchTitle.toLowerCase().includes(filmTitle)
                                );
                            })
                            .map(film => film.id);
                        return resolve(res.status(200).json({ movieIds }));
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
                    error: "Request timeout"
                }));
            });

            httpsReq.on('error', (error) => {
                return resolve(res.status(500).json({
                    error: "Request error",
                    message: error.message
                }));
            });

            httpsReq.end();

        } catch (error) {
            return resolve(res.status(500).json({
                error: "Server Error",
                message: error.message
            }));
        }
    });
}
