// Test file for the heuristics-based item prediction system
// This tests the predictItemDetails function using ACTUAL items from the database

import { predictItemDetails } from './src/utils/heuristics';
import { supabase } from './src/lib/supabase';
import { Item } from './src/types';

async function runHeuristicsTests() {
    console.log("Fetching actual items from database...\n");

    // Fetch real items from Supabase
    const { data: items, error } = await supabase
        .from('items')
        .select('*')
        .limit(10);

    if (error) {
        console.error("Error fetching items:", error);
        return;
    }

    if (!items || items.length === 0) {
        console.log("No items found in database. Please upload some items first.");
        return;
    }

    console.log(`Running Heuristics Tests on ${items.length} actual items...\n`);

    // Test each item
    items.forEach((item: Item, index: number) => {
        // Extract filename from image_url (or use a placeholder)
        const filename = item.image_url.split('/').pop() || 'unknown.jpg';

        // Run prediction
        const result = predictItemDetails(filename, item.name);

        console.log(`\n--- Test ${index + 1}: ${item.name} ---`);
        console.log(`Input: File="${filename}", Name="${item.name}"`);
        console.log(`Actual DB values:`, {
            category: item.category,
            color: item.color,
            styles: item.styles || [item.style]
        });
        console.log(`Prediction:`, result);

        // Validate prediction against actual database values
        let matches = 0;
        let total = 0;

        // Check category match
        if (item.category) {
            total++;
            if (result.category === item.category) {
                matches++;
                console.log(`✓ Category match: ${result.category}`);
            } else {
                console.log(`✗ Category mismatch: predicted "${result.category}", actual "${item.category}"`);
            }
        }

        // Check color match
        if (item.color) {
            total++;
            if (result.color === item.color) {
                matches++;
                console.log(`✓ Color match: ${result.color}`);
            } else {
                console.log(`✗ Color mismatch: predicted "${result.color}", actual "${item.color}"`);
            }
        }

        // Check styles match
        const actualStyles = item.styles || (item.style ? [item.style] : []);
        if (actualStyles.length > 0 && result.styles && result.styles.length > 0) {
            total++;
            const hasMatch = actualStyles.some(s => result.styles?.includes(s));
            if (hasMatch) {
                matches++;
                console.log(`✓ Style match: ${result.styles.join(', ')}`);
            } else {
                console.log(`✗ Style mismatch: predicted "${result.styles.join(', ')}", actual "${actualStyles.join(', ')}"`);
            }
        }

        const accuracy = total > 0 ? ((matches / total) * 100).toFixed(0) : 0;
        console.log(`Accuracy: ${matches}/${total} (${accuracy}%)`);
        console.log("---");
    });
}

// Run the tests
runHeuristicsTests().catch(console.error);
