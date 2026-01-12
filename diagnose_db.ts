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

async function testInsert() {
    console.log("Testing insert with new columns...")
    const { data, error } = await supabase.from('items').insert({
        name: "Test Item",
        category: "Top",
        color: "Black",
        // color_label: "Midnight", // Removed
        styles: ["Casual"],
        image_url: "http://example.com/image.png",
        tags: ["test"]
    })

    if (error) {
        console.error("Insert failed:", JSON.stringify(error, null, 2))
    } else {
        console.log("Insert successful!", data)
    }
}

testInsert()
