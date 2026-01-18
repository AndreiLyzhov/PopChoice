/**
 * Test script for coefficient-based matching
 *
 * Usage: node TestScripts/testCoefficients.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://widegmaevygsmytsotgd.supabase.co';
const supabaseKey = process.env.SUPABASE_API_KEY || process.env.VITE_SUPABASE_API_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('=== Coefficient Verification Test ===\n');

    // Step 1: Check coefficients in database
    console.log('1. Checking coefficients for updated films...\n');

    const { data: films, error: fetchError } = await supabase
        .from('films')
        .select('id, metadata, era_new_score, era_classic_score, mood_fun_score, mood_serious_score, mood_inspiring_score, mood_scary_score, genre_ids')
        .not('genre_ids', 'eq', '{}')
        .limit(10);

    if (fetchError) {
        console.error('Error fetching films:', fetchError);
        return;
    }

    if (!films || films.length === 0) {
        console.log('No films with updated coefficients found!');
        console.log('Make sure you ran: node Database/populateCoefficients.js --limit 10');
        return;
    }

    console.log(`Found ${films.length} films with coefficients:\n`);

    for (const film of films) {
        const title = film.metadata?.title || 'Unknown';
        console.log(`"${title}":`);
        console.log(`  Era:  new=${film.era_new_score?.toFixed(2)}, classic=${film.era_classic_score?.toFixed(2)}`);
        console.log(`  Mood: fun=${film.mood_fun_score?.toFixed(2)}, serious=${film.mood_serious_score?.toFixed(2)}, inspiring=${film.mood_inspiring_score?.toFixed(2)}, scary=${film.mood_scary_score?.toFixed(2)}`);
        console.log(`  Genres: ${JSON.stringify(film.genre_ids)}`);
        console.log('');
    }

    // Step 2: Test match_films_v2 with different preferences
    console.log('\n2. Testing match_films_v2 with different preferences...\n');

    // Get a sample embedding from an existing film
    const { data: sampleFilm, error: sampleError } = await supabase
        .from('films')
        .select('embedding')
        .limit(1)
        .single();

    if (sampleError || !sampleFilm) {
        console.error('Error getting sample embedding:', sampleError);
        return;
    }

    // Test 1: Prefer scary + classic films
    console.log('Test A: User prefers SCARY + CLASSIC films');
    const { data: scaryClassic, error: err1 } = await supabase.rpc('match_films_v2', {
        query_embedding: sampleFilm.embedding,
        match_threshold: 0.0,
        match_count: 5,
        pref_era_new: 0.1,
        pref_era_classic: 0.9,
        pref_mood_fun: 0.1,
        pref_mood_serious: 0.1,
        pref_mood_inspiring: 0.1,
        pref_mood_scary: 0.7,
        coefficient_weight: 0.05
    });

    if (err1) {
        console.error('Error calling match_films_v2:', err1);
        console.log('\nMake sure you ran the SQL migration: Database/match_films_v2.sql');
        return;
    }

    console.log('Results:');
    scaryClassic?.slice(0, 3).forEach((m, i) => {
        const title = m.metadata?.title || 'Unknown';
        console.log(`  ${i + 1}. "${title}" - similarity: ${m.similarity?.toFixed(3)}, boost: ${m.coefficient_boost?.toFixed(4)}`);
    });

    // Test 2: Prefer fun + new films
    console.log('\nTest B: User prefers FUN + NEW films');
    const { data: funNew, error: err2 } = await supabase.rpc('match_films_v2', {
        query_embedding: sampleFilm.embedding,
        match_threshold: 0.0,
        match_count: 5,
        pref_era_new: 0.9,
        pref_era_classic: 0.1,
        pref_mood_fun: 0.7,
        pref_mood_serious: 0.1,
        pref_mood_inspiring: 0.1,
        pref_mood_scary: 0.1,
        coefficient_weight: 0.05
    });

    if (err2) {
        console.error('Error:', err2);
        return;
    }

    console.log('Results:');
    funNew?.slice(0, 3).forEach((m, i) => {
        const title = m.metadata?.title || 'Unknown';
        console.log(`  ${i + 1}. "${title}" - similarity: ${m.similarity?.toFixed(3)}, boost: ${m.coefficient_boost?.toFixed(4)}`);
    });

    console.log('\n=== Test Complete ===');
}

main().catch(console.error);
