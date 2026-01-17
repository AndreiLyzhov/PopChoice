import { openai } from '../utils/config.js';

export default async function handler(req, res) {

    if (req.method !== "POST") {
        return res.status(405).json({error: "Method not allowed"})
    }
    const { input } = req.body;

    if (!input) {
        return res.status(400).json({ error: "Input is required" });
    }
  
    try {
        const messages = [
            {
                role: "system",
                content: `You are a movie title extractor. Your job is to extract movie titles from user input text. 
                Extract ONLY the movie titles mentioned, nothing else. 
                Return a JSON array of movie titles, even if there's only one. 
                If no movie titles are found, return an empty array [].
                Examples:
                - "User's favourite movie is Harry Potter" -> ["Harry Potter"]
                - "User likes The Matrix and Inception" -> ["The Matrix", "Inception"]
                - "User prefers action movies" -> []
                Return ONLY valid JSON array, no other text.`
            },
            {
                role: "user",
                content: input,
            }
        ]
        
        const { choices } = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages,
            temperature: 0.3
        })
        
        const responseText = choices[0].message.content.trim();
        let movieTitles = [];
        
        try {
            // Try to parse as JSON array first
            if (responseText.startsWith('[') && responseText.endsWith(']')) {
                movieTitles = JSON.parse(responseText);
            } else {
                // Try to parse as JSON object
                const parsed = JSON.parse(responseText);
                if (parsed.movies) {
                    movieTitles = Array.isArray(parsed.movies) ? parsed.movies : [parsed.movies];
                } else if (parsed.titles) {
                    movieTitles = Array.isArray(parsed.titles) ? parsed.titles : [parsed.titles];
                } else if (Array.isArray(parsed)) {
                    movieTitles = parsed;
                }
            }
        } catch (e) {
            // If JSON parsing fails, try to extract array from text using regex
            const arrayMatch = responseText.match(/\[[\s\S]*\]/);
            if (arrayMatch) {
                try {
                    movieTitles = JSON.parse(arrayMatch[0]);
                } catch (e2) {
                    // Last resort: split by common delimiters
                    const lines = responseText.split('\n').filter(line => line.trim());
                    movieTitles = lines
                        .map(line => line.replace(/^[-•*]\s*/, '').replace(/"/g, '').trim())
                        .filter(t => t.length > 0);
                }
            }
        }
        
        // Ensure it's an array and filter out empty strings
        movieTitles = Array.isArray(movieTitles) ? movieTitles.filter(t => t && t.trim()) : [];
        
        res.status(200).json({ movieTitles });
  
    } catch (error) {
      res.status(500).json({ error: "Error while extracting movie names", message: error.message });
    }
  }
