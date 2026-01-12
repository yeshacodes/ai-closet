
import { HybridRecommender, Preferences, Outfit, SeparatesOutfit } from "./src/lib/recommender"
import { Item } from "./src/types"

// Items
const items: Item[] = [
    { id: "1", name: "White T-Shirt", category: "Top", color: "White", styles: ["Casual"], tags: [], image_url: "url", created_at: "2024-01-01", description: "", style: "Casual" },
    { id: "2", name: "Blue Jeans", category: "Bottom", color: "Blue", styles: ["Casual"], tags: [], image_url: "url", created_at: "2024-01-01", description: "", style: "Casual" },
    { id: "3", name: "Sneakers", category: "Footwear", color: "White", styles: ["Casual"], tags: [], image_url: "url", created_at: "2024-01-01", description: "", style: "Casual" },

    // Extra items for variety
    { id: "4", name: "Black T-Shirt", category: "Top", color: "Black", styles: ["Casual"], tags: [], image_url: "url", created_at: "2024-01-01", description: "", style: "Casual" },
    { id: "5", name: "Grey Joggers", category: "Bottom", color: "Grey", styles: ["Casual"], tags: [], image_url: "url", created_at: "2024-01-01", description: "", style: "Casual" },

    // Outerwear
    { id: "6", name: "Winter Coat", category: "Outerwear", color: "Black", styles: ["Casual"], tags: [], image_url: "url", created_at: "2024-01-01", description: "", style: "Casual" },
    { id: "7", name: "Denim Jacket", category: "Outerwear", color: "Blue", styles: ["Casual"], tags: [], image_url: "url", created_at: "2024-01-01", description: "", style: "Casual" },
]

const recommender = new HybridRecommender()

function testSnowyWeather() {
    console.log("--- Testing Snowy Weather ---")
    const prefs: Preferences = { weather: "Snowy", occasion: "Casual" }
    const result = recommender.generateOutfit(items, prefs)

    if (!result.success || !result.outfit) {
        console.error("FAIL: No outfit generated for Snowy weather:", result.error)
        return
    }

    const hasOuterwear = result.outfit.outerwear !== undefined
    if (hasOuterwear) {
        console.log("PASS: Snowy recommendation has outerwear")
    } else {
        console.error("FAIL: Snowy recommendation missing outerwear")
    }
}

function testVariety() {
    console.log("--- Testing Variety (Casual/Sunny) ---")
    const prefs: Preferences = { weather: "Sunny", occasion: "Casual" }

    // Run multiple times and check for different results
    const results = new Set<string>()
    for (let i = 0; i < 10; i++) {
        const result = recommender.generateOutfit(items, prefs)
        if (result.success && result.outfit && result.outfit.type === 'separates') {
            const outfit = result.outfit as SeparatesOutfit
            const key = `${outfit.top.name} + ${outfit.bottom.name}`
            results.add(key)
        }
    }

    console.log(`Generated ${results.size} unique combinations in 10 runs:`)
    results.forEach(r => console.log(" - " + r))

    if (results.size > 1) {
        console.log("PASS: Variety detected")
    } else {
        console.error("FAIL: No variety detected (always same outfit)")
    }
}

function testOuterwearVariety() {
    console.log("--- Testing Outerwear Variety (Cold) ---")
    const prefs: Preferences = { weather: "Cold", occasion: "Casual" }

    const coats = new Set<string>()
    for (let i = 0; i < 20; i++) {
        const result = recommender.generateOutfit(items, prefs)
        if (result.success && result.outfit && result.outfit.outerwear) {


            // Check the coat of the recommendation
            coats.add(result.outfit.outerwear.name)
        }
    }

    console.log(`Generated ${coats.size} unique coats in 20 runs:`)
    coats.forEach(c => console.log(" - " + c))

    if (coats.size > 1) {
        console.log("PASS: Outerwear variety detected")
    } else {
        console.error("FAIL: No outerwear variety detected")
    }
}

testSnowyWeather()
testVariety()
testOuterwearVariety()
