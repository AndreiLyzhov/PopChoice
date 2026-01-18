/**
 * Check database coefficient status
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://widegmaevygsmytsotgd.supabase.co';
const supabaseKey = process.env.SUPABASE_API_KEY || process.env.VITE_SUPABASE_API_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
    console.log('=== Database Coefficient Status ===\n');

    // Get total count of films
    const { count: totalCount } = await supabase
        .from('films')
        .select('*', { count: 'exact', head: true });

    console.log(`Total films in database: ${totalCount}\n`);

    // Get films with non-default coefficients
    const { data: withCoefficients, error } = await supabase
        .from('films')
        .select('id, metadata, era_new_score, era_classic_score, mood_fun_score, mood_serious_score, mood_inspiring_score, mood_scary_score, genre_ids')
        .or('era_new_score.neq.0.5,era_classic_score.neq.0.5,mood_fun_score.neq.0.25,mood_serious_score.neq.0.25')
        .order('id', { ascending: true });

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Films with updated coefficients: ${withCoefficients?.length || 0}\n`);

    if (withCoefficients && withCoefficients.length > 0) {
        console.log('Films with coefficients:');
        for (const film of withCoefficients) {
            const title = film.metadata?.title || 'Unknown';
            console.log(`\nID ${film.id}: "${title}"`);
            console.log(`  era_new_score: ${film.era_new_score}`);
            console.log(`  era_classic_score: ${film.era_classic_score}`);
            console.log(`  mood_fun_score: ${film.mood_fun_score}`);
            console.log(`  mood_serious_score: ${film.mood_serious_score}`);
            console.log(`  mood_inspiring_score: ${film.mood_inspiring_score}`);
            console.log(`  mood_scary_score: ${film.mood_scary_score}`);
            console.log(`  genre_ids: ${JSON.stringify(film.genre_ids)}`);
        }
    } else {
        console.log('No films with updated coefficients found!');
    }

    // Also check the first 10 films regardless
    console.log('\n\n=== First 10 Films (by ID) ===\n');
    const { data: first10 } = await supabase
        .from('films')
        .select('id, metadata, era_new_score, genre_ids')
        .order('id', { ascending: true })
        .limit(10);

    for (const film of first10 || []) {
        const title = film.metadata?.title || 'Unknown';
        console.log(`ID ${film.id}: "${title}" - era_new=${film.era_new_score}, genres=${JSON.stringify(film.genre_ids)}`);
    }
}

checkDatabase().catch(console.error);
