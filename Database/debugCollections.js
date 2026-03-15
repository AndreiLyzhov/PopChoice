/**
 * Debug collection issues - check specific films
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://widegmaevygsmytsotgd.supabase.co';
const supabaseKey = process.env.SUPABASE_API_KEY || process.env.VITE_SUPABASE_API_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugCollections() {
    // Search for Avengers films
    const { data: avengersFilms, error } = await supabase
        .from('films')
        .select('id, metadata, collection_id, collection_name')
        .ilike('metadata->>title', '%Avengers%');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('=== Films matching "Avengers" ===\n');
    avengersFilms.forEach(film => {
        console.log(`Title: ${film.metadata.title}`);
        console.log(`  ID: ${film.id}`);
        console.log(`  Year: ${film.metadata.year || 'N/A'}`);
        console.log(`  Collection ID: ${film.collection_id || 'NULL'}`);
        console.log(`  Collection Name: ${film.collection_name || 'NULL'}`);
        console.log('');
    });

    // Group by collection
    console.log('=== Collection Analysis ===\n');
    const byCollection = {};
    avengersFilms.forEach(film => {
        const key = film.collection_id || 'NO_COLLECTION';
        if (!byCollection[key]) {
            byCollection[key] = { name: film.collection_name, films: [] };
        }
        byCollection[key].films.push(film.metadata.title);
    });

    Object.entries(byCollection).forEach(([id, data]) => {
        console.log(`Collection: ${data.name || 'NO COLLECTION'} (ID: ${id})`);
        data.films.forEach(title => console.log(`  - ${title}`));
        console.log('');
    });
}

debugCollections().catch(console.error);
