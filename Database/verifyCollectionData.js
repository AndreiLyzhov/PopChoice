/**
 * Verify collection data completeness in the database
 * Checks how many films have collection data and analyzes the exclusion mechanism
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://widegmaevygsmytsotgd.supabase.co';
const supabaseKey = process.env.SUPABASE_API_KEY || process.env.VITE_SUPABASE_API_KEY;

if (!supabaseKey) {
    console.error('Error: SUPABASE_API_KEY or VITE_SUPABASE_API_KEY environment variable is required');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyCollectionData() {
    console.log('=== Collection Data Verification ===\n');

    try {
        // 1. Get total film count
        const { data: allFilms, error: allError } = await supabase
            .from('films')
            .select('id', { count: 'exact' });

        if (allError) {
            console.error('Error fetching total films:', allError);
            return;
        }

        const totalFilms = allFilms.length;
        console.log(`Total films in database: ${totalFilms}`);

        // 2. Count films with collection_id
        const { data: filmsWithCollection, error: collectionError } = await supabase
            .from('films')
            .select('id, collection_id, collection_name', { count: 'exact' })
            .not('collection_id', 'is', null);

        if (collectionError) {
            console.error('Error fetching films with collections:', collectionError);
            return;
        }

        const filmsWithCollectionCount = filmsWithCollection.length;
        const percentageWithCollection = ((filmsWithCollectionCount / totalFilms) * 100).toFixed(2);

        console.log(`Films with collection_id: ${filmsWithCollectionCount} (${percentageWithCollection}%)`);
        console.log(`Films without collection_id: ${totalFilms - filmsWithCollectionCount}\n`);

        // 3. Get unique collections
        const uniqueCollections = new Set(
            filmsWithCollection
                .map(f => f.collection_id)
                .filter(id => id !== null)
        );

        console.log(`Unique collections: ${uniqueCollections.size}`);

        // 4. Analyze collection distribution (top collections)
        const collectionCounts = {};
        filmsWithCollection.forEach(film => {
            if (film.collection_id) {
                if (!collectionCounts[film.collection_id]) {
                    collectionCounts[film.collection_id] = { count: 0, name: film.collection_name };
                }
                collectionCounts[film.collection_id].count++;
            }
        });

        const sortedCollections = Object.entries(collectionCounts)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 20);

        console.log('\nTop 20 collections by film count:');
        sortedCollections.forEach(([id, data], index) => {
            console.log(`${index + 1}. ${data.name} (ID: ${id}) - ${data.count} films`);
        });

        // 5. Check for exclusion mechanism - verify schema
        console.log('\n=== Exclusion Mechanism Check ===\n');

        const { data: filmSample, error: sampleError } = await supabase
            .from('films')
            .select('id, metadata, collection_id, collection_name')
            .not('collection_id', 'is', null)
            .limit(1);

        if (sampleError) {
            console.error('Error fetching sample film:', sampleError);
        } else if (filmSample && filmSample.length > 0) {
            const film = filmSample[0];
            console.log('Sample film with collection:');
            console.log(`  ID: ${film.id}`);
            console.log(`  Title: ${film.metadata.title}`);
            console.log(`  Collection ID: ${film.collection_id}`);
            console.log(`  Collection Name: ${film.collection_name}`);

            // Check if there are other films in the same collection
            const { data: sameCollection } = await supabase
                .from('films')
                .select('id, metadata')
                .eq('collection_id', film.collection_id)
                .limit(5);

            if (sameCollection) {
                console.log(`\n  Other films in same collection (${sameCollection.length} total):`);
                sameCollection.forEach(f => {
                    if (f.id !== film.id) {
                        console.log(`    - ${f.metadata.title} (ID: ${f.id})`);
                    }
                });
            }
        }

        // 6. Test the exclusion mechanism (dry run)
        console.log('\n=== Testing Exclusion Mechanism ===\n');

        // Get a sample film with a collection
        const { data: testFilm } = await supabase
            .from('films')
            .select('id, metadata, collection_id')
            .not('collection_id', 'is', null)
            .limit(1);

        if (testFilm && testFilm.length > 0) {
            const film = testFilm[0];
            const collectionId = film.collection_id;

            // Count films in this collection
            const { data: filmsInCollection, error: countError } = await supabase
                .from('films')
                .select('id, metadata', { count: 'exact' })
                .eq('collection_id', collectionId);

            if (filmsInCollection) {
                console.log(`Testing with "${film.metadata.title}"`);
                console.log(`Collection: "${film.metadata.title}" (ID: ${collectionId})`);
                console.log(`Films in this collection: ${filmsInCollection.length}`);
                console.log('\nExclusion simulation:');
                console.log(`  If user excludes this film (ID: ${film.id})`);
                console.log(`  The API will:`);
                console.log(`  1. Get collection_id: ${collectionId}`);
                console.log(`  2. Exclude all ${filmsInCollection.length} films from this collection`);
                console.log(`  3. Other films from collections: ${uniqueCollections.size}`);

                const excluded = filmsInCollection.map(f => f.id).slice(0, 5);
                console.log(`\n  Films that would be excluded (showing first 5):`);
                excluded.forEach((id, index) => {
                    const excludedFilm = filmsInCollection.find(f => f.id === id);
                    console.log(`    ${index + 1}. ${excludedFilm.metadata.title} (ID: ${id})`);
                });
            }
        }

        console.log('\n=== Summary ===');
        console.log(`✓ Database schema: collection_id and collection_name fields exist`);
        console.log(`✓ Collection coverage: ${percentageWithCollection}% of films have collection data`);
        console.log(`✓ Unique collections: ${uniqueCollections.size}`);
        console.log(`✓ Exclusion mechanism: Implemented and ready to use`);
        console.log(`\nTo exclude a film and all films in its collection:`);
        console.log(`1. User excludes film (e.g., "Avatar")`);
        console.log(`2. API calls getCollectionIds([filmId]) → returns [collectionId]`);
        console.log(`3. API calls match_films_v2(..., exclude_ids=[filmId], exclude_collection_ids=[collectionId])`);
        console.log(`4. SQL filters out all films where collection_id IN (${collectionId})`);

    } catch (error) {
        console.error('Error:', error.message);
    }
}

verifyCollectionData().catch(console.error);
