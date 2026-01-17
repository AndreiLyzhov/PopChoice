
import fs from 'fs';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// 1. Setup Clients
const tmdbKey = process.env.TMDB_API_KEY;
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_API_KEY); // Use Service Role Key for heavy writes!
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


export async function fetchMoviesAndSave() {
    const allMovies = [];
    const maxPages = 1; // Start small! Change to 50 or 100 later.

    console.log("🎬 Starting TMDB Fetch...");

    // 2. Fetch from TMDB
    for (let page = 1; page <= maxPages; page++) {
        const url = `https://api.themoviedb.org/3/discover/movie?api_key=${tmdbKey}&sort_by=popularity.desc&vote_count.gte=100&include_adult=false&language=en-US&page=${page}`;
        
        try {
            const response = await axios.get(url);
            const rawMovies = response.data.results;

            const formattedMovies = rawMovies.map(movie => {
                // Formatting to match your specific object structure
                const releaseYear = movie.release_date ? movie.release_date.split('-')[0] : "Unknown";
                return {
                    title: movie.title,
                    releaseYear: releaseYear,
                    // We combine info into your 'content' string format
                    content: `${movie.title} (${releaseYear}): ${movie.overview}. Rated ${movie.vote_average} on TMDB.`
                };
            });

            allMovies.push(...formattedMovies);
            console.log(`✅ Page ${page} processed.`);
        } catch (error) {
            console.error(`Error on page ${page}:`, error.message);
        }
    }

    // 3. Save to local file (Intermediate Step)
    function appendToCache(fileName, newData) {
        let list = [];
    
        // 1. Проверяем, существует ли файл
        if (fs.existsSync(fileName)) {
            // 2. Читаем старые данные
            const fileContent = fs.readFileSync(fileName, 'utf-8');
            // Если файл не пустой, парсим его
            if (fileContent) {
                list = JSON.parse(fileContent);
            }
        }
    
        // 3. Добавляем (push) новые данные в массив
        // Если newData - это массив, используем спред (...), если один объект - просто newData
        if (Array.isArray(newData)) {
            list.push(...newData);
        } else {
            list.push(newData);
        }
    
        // 4. Записываем всё обратно
        fs.writeFileSync(fileName, JSON.stringify(list, null, 2));
    }

    // appendToCache('movies_cache.json', allMovies)
    // console.log(`💾 Saved ${allMovies.length} movies to movies_cache.json`);


    // 4. Generate Embeddings & Upload
    // We process in batches to avoid hitting API rate limits
    await processAndUpload(allMovies);
}

async function processAndUpload(movies) {
    console.log("🧠 Starting Embedding & Upload...");
    
    // Process in batches of 10 to be safe with OpenAI rate limits
    const batchSize = 10;
    
    for (let i = 0; i < movies.length; i += batchSize) {
        const batch = movies.slice(i, i + batchSize);

        const batchFormatted = batch.map(item => {
            return Object.entries(item).map(innerItem => innerItem.join(' ')).join(". ")
        })
        
        const moviesToUpload = await Promise.all(batch.map(async (movie) => {
            try {


                console.log(movie.content)
                // Create Embedding
                const embeddingResponse = await openai.embeddings.create({
                    model: "text-embedding-3-small", // Cheaper and faster
                    input: movie.content,
                });

                const embedding = embeddingResponse.data[0].embedding;

                

                return {
                    content: movie.content, // The text field
                    embedding: embedding,   // The vector field
                    metadata: { title: movie.title, year: movie.releaseYear } // Optional: storing JSON metadata is useful
                };
            } catch (e) {
                console.error(`Error embedding ${movie.title}:`, e.message);
                return null;
            }
        }));

        // Filter out any failed embeddings
        const validMovies = moviesToUpload.filter(m => m !== null);

        if (validMovies.length > 0) {
            const { error } = await supabase.from('films').insert(validMovies);
            if (error) console.error("Supabase Insert Error:", error);
            else console.log(`🚀 Uploaded batch ${i / batchSize + 1}`);
        }
    }
}

fetchMoviesAndSave();