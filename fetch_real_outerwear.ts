import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Simple env parser
const envPath = path.resolve(__dirname, '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')
const env: Record<string, string> = {}
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=')
    if (key && value) {
        env[key.trim()] = value.trim().replace(/"/g, '')
    }
})

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing env vars")
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function fetchOuterwear() {
    console.log("Fetching all items from database...")
    const { data, error } = await supabase.from('items').select('*')

    if (error) {
        console.error("Fetch failed:", JSON.stringify(error, null, 2))
        return;
    }

    if (!data || data.length === 0) {
        console.log("No items found in database.");
        return;
    }

    const outerwear = data.filter(item => {
        const cat = item.category?.trim().toLowerCase();
        return cat === 'outerwear' || cat === 'jacket' || cat === 'coat' || cat === 'blazer';
    });

    console.log(`\n--- Found ${outerwear.length} Outerwear candidates ---`);
    outerwear.forEach(item => {
        console.log(`- [${item.id}] ${item.name}`);
        console.log(`  Category: ${item.category}`);
        console.log(`  Styles:   ${JSON.stringify(item.styles || [])}`);
        console.log(`  Weather:  ${JSON.stringify(item.weather || [])}`);
        console.log(`-----------------------------------`);
    });

    // Also check for 'Shorts/Skirts' since user mentioned it
    const shortsSkirts = data.filter(item => item.category?.trim().toLowerCase() === 'shorts/skirts');
    if (shortsSkirts.length > 0) {
        console.log(`\n--- Found ${shortsSkirts.length} Shorts/Skirts ---`);
        shortsSkirts.forEach(item => {
            console.log(`- [${item.id}] ${item.name} (${item.category})`);
        });
    }

    // Save summary to file for easier reading if output is long
    const summary = JSON.stringify({ outerwear, total: data.length }, null, 2);
    fs.writeFileSync('outerwear_summary.json', summary);
    console.log("\nSaved summary to outerwear_summary.json");
}

fetchOuterwear()
